using System;
using System.Collections.Generic;
using System.Globalization;
using UnityEngine;

// MeshLab.cs: a triangle mesh as data: reading and writing its files, its two arrays, edges and half-edges, winding, Euler's
// formula, normals, subdivision, sweeps, marching cubes, the vertex cache, smoothing and edge collapse. Plain C#, no
// MonoBehaviour: positions are Vector3[], triangles and faces are int[][] (one int[] per triangle or polygon). MeshLabScene.cs
// draws it. No method changes its arguments.
// Each method returns its named intermediate results as a tuple, with the field names and the order of the object meshlab.js
// returns. mono's compiler rejects tuples over 7 fields, so the two results with more (and the half-edge record) are small
// structs declared below. A result with a single field (vertexNormals, neighborsOf, ...) is that field itself, since C# has no
// one-element tuple.
// The same functions, line for line where the languages allow, are meshlab.js in ../webgl/
// (lib/tests/programs/mesh-lab.test.mjs runs both on the same inputs and compares the numbers).
public static class MeshLab
{
    // The half-edge record: five parallel arrays, one entry per half-edge. A name that is also a C# keyword takes an @.
    public struct HalfEdges { public int[] @from, to, face, next, twin; }
    public struct EulerResult { public int V, E, F, chi, components, loops; public float genus; public int unreferenced, boundary, nonManifold; }

    #region Settings and vector helpers
    // Below EPS a length or an area counts as zero. Unity's Vector3 has these operations built in.
    public const float Eps = 1e-6f;

    // What C# lacks: edge keys as a long, number text in the invariant culture, and the reading of words and numbers.
    static readonly CultureInfo Inv = CultureInfo.InvariantCulture;
    static long EdgeKey(int a, int b) { return a * 67108864L + b; }
    static long UndirectedKey(int a, int b) { return a < b ? EdgeKey(a, b) : EdgeKey(b, a); }
    static string NumberText(float x)
    {
        string text = x.ToString("F6", Inv);          // 6 decimals, then the trailing zeros go
        if (text.IndexOf('.') >= 0) text = text.TrimEnd('0').TrimEnd('.');
        return text == "-0" ? "0" : text;
    }
    static string PointText(Vector3 p) { return NumberText(p.x) + " " + NumberText(p.y) + " " + NumberText(p.z); }
    static string[] Words(string line) { return line.Split((char[])null, StringSplitOptions.RemoveEmptyEntries); }
    static float Number(string word) { return float.Parse(word, NumberStyles.Float, Inv); }
    // The indices of one face as text, for string.Join.
    static string[] Texts(int[] numbers)
    {
        string[] texts = new string[numbers.Length];
        for (int i = 0; i < numbers.Length; i++) texts[i] = numbers[i].ToString(Inv);
        return texts;
    }
    // The integer a word starts with: "3/1/2" gives 3.
    static int LeadingInt(string word)
    {
        int end = 0;
        if (end < word.Length && (word[end] == '-' || word[end] == '+')) end += 1;
        while (end < word.Length && char.IsDigit(word[end])) end += 1;
        return int.Parse(word.Substring(0, end), Inv);
    }
    #endregion

    #region Files: read an OBJ
    // One record per line: "v x y z" and "f a b c ...". Indices count from 1, and a negative index counts back from the latest
    // vertex. "f 3/1/2" also names a texture coordinate and a normal: only the position index is read here.
    public static (Vector3[] positions, int[][] faces) ParseObj(string text)
    {
        List<Vector3> positions = new List<Vector3>();
        List<int[]> faces = new List<int[]>();
        string[] lines = text.Split('\n');
        for (int i = 0; i < lines.Length; i++)
        {
            string[] parts = Words(lines[i]);
            if (parts.Length == 0) continue;
            if (parts[0] == "v")
            {
                positions.Add(new Vector3(Number(parts[1]), Number(parts[2]), Number(parts[3])));
            }
            else if (parts[0] == "f")
            {
                List<int> face = new List<int>();
                for (int k = 1; k < parts.Length; k++)
                {
                    int index = LeadingInt(parts[k]);
                    face.Add(index < 0 ? positions.Count + index : index - 1);
                }
                faces.Add(face.ToArray());
            }
        }
        return (positions.ToArray(), faces.ToArray());
    }
    #endregion

    #region Files: read an OFF
    // A header with the counts, then the vertices, then each face as its corner count and its indices, counting from 0.
    public static (Vector3[] positions, int[][] faces) ParseOff(string text)
    {
        List<string> tokens = new List<string>();
        string[] lines = text.Split('\n');
        for (int i = 0; i < lines.Length; i++)
        {
            string line = lines[i];
            int hash = line.IndexOf('#');
            if (hash >= 0) line = line.Substring(0, hash);        // a comment runs to the end of its line
            tokens.AddRange(Words(line));
        }
        int at = tokens[0].ToUpperInvariant() == "OFF" ? 1 : 0;
        int vertexCount = LeadingInt(tokens[at]);
        int faceCount = LeadingInt(tokens[at + 1]);
        at += 3;
        List<Vector3> positions = new List<Vector3>();
        for (int i = 0; i < vertexCount; i++)
        {
            positions.Add(new Vector3(Number(tokens[at]), Number(tokens[at + 1]), Number(tokens[at + 2])));
            at += 3;
        }
        List<int[]> faces = new List<int[]>();
        for (int i = 0; i < faceCount; i++)
        {
            int corners = LeadingInt(tokens[at]);
            int[] face = new int[corners];
            for (int k = 1; k <= corners; k++) face[k - 1] = LeadingInt(tokens[at + k]);
            faces.Add(face);
            at += corners + 1;
        }
        return (positions.ToArray(), faces.ToArray());
    }
    #endregion

    #region Files: read an ASCII PLY
    // The header declares the elements and their properties, so the positions are found by name. The vertex lines and the face
    // lines follow, in the declared order. A binary PLY has the same header over packed numbers; it is not read here.
    public static (Vector3[] positions, int[][] faces) ParsePly(string text)
    {
        string[] lines = text.Split('\n');
        int at = 0;
        int vertexCount = 0;
        int faceCount = 0;
        string element = "";
        List<string> properties = new List<string>();
        while (at < lines.Length)
        {
            string[] parts = Words(lines[at]);
            at += 1;
            if (parts.Length == 0) continue;
            if (parts[0] == "end_header") break;
            if (parts[0] == "element")
            {
                element = parts[1];
                if (element == "vertex") vertexCount = LeadingInt(parts[2]);
                if (element == "face") faceCount = LeadingInt(parts[2]);
            }
            if (parts[0] == "property" && element == "vertex") properties.Add(parts[parts.Length - 1]);
        }
        int ix = properties.IndexOf("x");
        int iy = properties.IndexOf("y");
        int iz = properties.IndexOf("z");
        List<Vector3> positions = new List<Vector3>();
        for (int i = 0; i < vertexCount; i++)
        {
            string[] parts = Words(lines[at + i]);
            positions.Add(new Vector3(Number(parts[ix]), Number(parts[iy]), Number(parts[iz])));
        }
        at += vertexCount;
        List<int[]> faces = new List<int[]>();
        for (int i = 0; i < faceCount; i++)
        {
            string[] parts = Words(lines[at + i]);
            int corners = LeadingInt(parts[0]);
            int[] face = new int[corners];
            for (int k = 1; k <= corners; k++) face[k - 1] = LeadingInt(parts[k]);
            faces.Add(face);
        }
        return (positions.ToArray(), faces.ToArray());
    }
    #endregion

    #region Files: read an STL
    // A triangle soup: every triangle lists its own three corners, so nothing is shared until the vertices are welded. The text form
    // repeats "vertex x y z". The binary form is an 80-byte header, a 32-bit count, and 50 bytes per triangle: a normal, three
    // corners, and two unused bytes.
    public static (Vector3[] positions, int[][] faces) ParseStlText(string text)
    {
        List<Vector3> positions = new List<Vector3>();
        List<int[]> faces = new List<int[]>();
        string[] lines = text.Split('\n');
        for (int i = 0; i < lines.Length; i++)
        {
            string[] parts = Words(lines[i]);
            if (parts.Length == 0) continue;
            if (parts[0] == "vertex") positions.Add(new Vector3(Number(parts[1]), Number(parts[2]), Number(parts[3])));
            if (parts[0] == "endloop")
            {
                int n = positions.Count;
                faces.Add(new int[] { n - 3, n - 2, n - 1 });
            }
        }
        return (positions.ToArray(), faces.ToArray());
    }

    public static (Vector3[] positions, int[][] faces) ParseStlBytes(byte[] bytes)
    {
        int count = (int)BitConverter.ToUInt32(bytes, 80);      // little-endian, as the file is
        List<Vector3> positions = new List<Vector3>();
        List<int[]> faces = new List<int[]>();
        for (int t = 0; t < count; t++)
        {
            int start = 84 + 50 * t + 12;
            for (int k = 0; k < 3; k++)
            {
                int at = start + 12 * k;
                positions.Add(new Vector3(BitConverter.ToSingle(bytes, at), BitConverter.ToSingle(bytes, at + 4), BitConverter.ToSingle(bytes, at + 8)));
            }
            faces.Add(new int[] { 3 * t, 3 * t + 1, 3 * t + 2 });
        }
        return (positions.ToArray(), faces.ToArray());
    }
    #endregion

    #region Files: weld a soup
    // Positions equal up to the tolerance become one vertex. This is how a soup becomes two arrays, and how the mesh gets its
    // shared edges back.
    public static (Vector3[] positions, int[][] faces, int removed) WeldVertices(Vector3[] positions, int[][] faces, float tolerance)
    {
        Dictionary<string, int> seen = new Dictionary<string, int>();
        List<int> remap = new List<int>();
        List<Vector3> welded = new List<Vector3>();
        for (int i = 0; i < positions.Length; i++)
        {
            Vector3 p = positions[i];
            // Floor(x + 0.5) rounds halves up, as JavaScript's Math.round does
            string key = (long)Mathf.Floor(p.x / tolerance + 0.5f) + "," + (long)Mathf.Floor(p.y / tolerance + 0.5f) + "," + (long)Mathf.Floor(p.z / tolerance + 0.5f);
            if (!seen.ContainsKey(key))
            {
                seen[key] = welded.Count;
                welded.Add(p);
            }
            remap.Add(seen[key]);
        }
        List<int[]> weldedFaces = new List<int[]>();
        for (int f = 0; f < faces.Length; f++)
        {
            int[] face = new int[faces[f].Length];
            for (int k = 0; k < faces[f].Length; k++) face[k] = remap[faces[f][k]];
            weldedFaces.Add(face);
        }
        return (welded.ToArray(), weldedFaces.ToArray(), positions.Length - welded.Count);
    }
    #endregion

    #region Two arrays: triangles from faces
    // A file may store polygons. The GPU draws triangles, so a face of n corners becomes a fan of n - 2 triangles from its first
    // corner, in the same winding. A concave polygon needs real triangulation; a fan assumes convex.
    public static (int[][] tris, int polygons) Triangulate(int[][] faces)
    {
        List<int[]> tris = new List<int[]>();
        for (int f = 0; f < faces.Length; f++)
        {
            int[] face = faces[f];
            for (int k = 1; k < face.Length - 1; k++) tris.Add(new int[] { face[0], face[k], face[k + 1] });
        }
        return (tris.ToArray(), faces.Length);
    }
    #endregion

    #region Two arrays: soup against indexed
    // A soup stores 3 corners of 12 bytes per triangle. Indexed triangles store each position once, plus three indices of 2 bytes, or
    // 4 past 65,536 vertices. With about 2 triangles per vertex that is 72 bytes per vertex against 24: a factor of about 3.
    public static (long soup, int indexSize, long indexed, float ratio) StorageBytes(int vertexCount, int triangleCount)
    {
        long soup = (long)triangleCount * 3 * 12;
        int indexSize = vertexCount <= 65536 ? 2 : 4;
        long indexed = (long)vertexCount * 12 + (long)triangleCount * 3 * indexSize;
        float ratio = (float)soup / indexed;
        return (soup, indexSize, indexed, ratio);
    }
    #endregion

    #region Files: write an OBJ
    // Text, one record per line, indices from 1. Readable everywhere, and slow to parse.
    public static string WriteObj(Vector3[] positions, int[][] faces)
    {
        List<string> lines = new List<string>();
        for (int i = 0; i < positions.Length; i++) lines.Add("v " + PointText(positions[i]));
        for (int f = 0; f < faces.Length; f++)
        {
            string line = "f";
            for (int k = 0; k < faces[f].Length; k++) line += " " + (faces[f][k] + 1);
            lines.Add(line);
        }
        return string.Join("\n", lines.ToArray());
    }
    #endregion

    #region Files: write an OFF
    // The counts first, so a reader can allocate before it reads. Indices from 0.
    public static string WriteOff(Vector3[] positions, int[][] faces)
    {
        List<string> lines = new List<string>();
        lines.Add("OFF");
        lines.Add(positions.Length + " " + faces.Length + " 0");
        for (int i = 0; i < positions.Length; i++) lines.Add(PointText(positions[i]));
        for (int f = 0; f < faces.Length; f++) lines.Add(faces[f].Length + " " + string.Join(" ", Texts(faces[f])));
        return string.Join("\n", lines.ToArray());
    }
    #endregion

    #region Files: write an ASCII PLY
    // A header that declares its own record layout, which is why scanners use the format: a vertex can carry color or confidence
    // without changing the format.
    public static string WritePly(Vector3[] positions, int[][] faces)
    {
        List<string> lines = new List<string>();
        lines.AddRange(new string[] { "ply", "format ascii 1.0", "element vertex " + positions.Length, "property float x", "property float y",
            "property float z", "element face " + faces.Length, "property list uchar int vertex_indices", "end_header" });
        for (int i = 0; i < positions.Length; i++) lines.Add(PointText(positions[i]));
        for (int f = 0; f < faces.Length; f++) lines.Add(faces[f].Length + " " + string.Join(" ", Texts(faces[f])));
        return string.Join("\n", lines.ToArray());
    }
    #endregion

    #region Files: write an STL
    // A soup with a normal per triangle: no sharing, no indices. Each triangle takes 7 lines of text, or 50 bytes in binary. 3D
    // printers read it.
    public static string WriteStl(Vector3[] positions, int[][] tris)
    {
        List<string> lines = new List<string>();
        lines.Add("solid mesh");
        for (int t = 0; t < tris.Length; t++)
        {
            Vector3 a = positions[tris[t][0]];
            Vector3 b = positions[tris[t][1]];
            Vector3 c = positions[tris[t][2]];
            Vector3 n = Vector3.Cross(b - a, c - a).normalized;
            lines.AddRange(new string[] { "facet normal " + PointText(n), "outer loop", "vertex " + PointText(a), "vertex " + PointText(b),
                "vertex " + PointText(c), "endloop", "endfacet" });
        }
        lines.Add("endsolid mesh");
        return string.Join("\n", lines.ToArray());
    }
    #endregion

    #region Files: glTF's description of the buffers
    // JSON that describes binary arrays the GPU can upload without parsing. 5126 is float32 and 5123 is uint16 (5125 uint32); 34962
    // marks vertex data and 34963 indices; mode 4 is a triangle list. min and max give a loader the bounding box.
    public static string WriteGltf(Vector3[] positions, int[][] tris)
    {
        Vector3 low = new Vector3(float.PositiveInfinity, float.PositiveInfinity, float.PositiveInfinity);
        Vector3 high = new Vector3(float.NegativeInfinity, float.NegativeInfinity, float.NegativeInfinity);
        for (int i = 0; i < positions.Length; i++)
        {
            for (int k = 0; k < 3; k++)
            {
                low[k] = Mathf.Min(low[k], positions[i][k]);
                high[k] = Mathf.Max(high[k], positions[i][k]);
            }
        }
        var sizes = StorageBytes(positions.Length, tris.Length);
        int indexType = sizes.indexSize == 2 ? 5123 : 5125;
        int positionBytes = positions.Length * 12;
        int indexBytes = tris.Length * 3 * sizes.indexSize;
        string[] lines = { "{", "  \"asset\": { \"version\": \"2.0\" },",
            "  \"meshes\": [{ \"primitives\": [{ \"attributes\": { \"POSITION\": 0 }, \"indices\": 1, \"mode\": 4 }] }],",
            "  \"accessors\": [",
            "    { \"bufferView\": 0, \"componentType\": 5126, \"count\": " + positions.Length + ", \"type\": \"VEC3\",",
            "      \"min\": [" + NumberText(low.x) + ", " + NumberText(low.y) + ", " + NumberText(low.z) + "],",
            "      \"max\": [" + NumberText(high.x) + ", " + NumberText(high.y) + ", " + NumberText(high.z) + "] },",
            "    { \"bufferView\": 1, \"componentType\": " + indexType + ", \"count\": " + (tris.Length * 3) + ", \"type\": \"SCALAR\" }",
            "  ],", "  \"bufferViews\": [",
            "    { \"buffer\": 0, \"byteOffset\": 0, \"byteLength\": " + positionBytes + ", \"target\": 34962 },",
            "    { \"buffer\": 0, \"byteOffset\": " + positionBytes + ", \"byteLength\": " + indexBytes + ", \"target\": 34963 }",
            "  ],", "  \"buffers\": [{ \"byteLength\": " + (positionBytes + indexBytes) + " }]", "}" };
        return string.Join("\n", lines);
    }
    #endregion

    #region Topology: the edge list
    // The index array names triangles and never edges, so edges are found by visiting each triangle's three. An edge that appears
    // once is on the boundary; twice, between two faces; more, the surface is non-manifold there. f1 = -1 means no second face.
    public static (int[][] edges, int boundary, int nonManifold) EdgeList(int[][] tris)
    {
        Dictionary<long, int> index = new Dictionary<long, int>();
        List<int[]> edges = new List<int[]>();
        int nonManifold = 0;
        for (int t = 0; t < tris.Length; t++)
        {
            for (int k = 0; k < 3; k++)
            {
                int a = tris[t][k];
                int b = tris[t][(k + 1) % 3];
                long key = UndirectedKey(a, b);
                if (!index.ContainsKey(key))
                {
                    index[key] = edges.Count;
                    edges.Add(new int[] { Mathf.Min(a, b), Mathf.Max(a, b), t, -1 });
                }
                else
                {
                    int[] e = edges[index[key]];
                    if (e[3] == -1) e[3] = t;
                    else nonManifold += 1;
                }
            }
        }
        int boundary = 0;
        for (int i = 0; i < edges.Count; i++)
        {
            if (edges[i][3] == -1) boundary += 1;
        }
        return (edges.ToArray(), boundary, nonManifold);
    }
    #endregion

    #region Half-edges: build them
    // Each triangle's three directed edges, numbered 3t, 3t + 1, 3t + 2. next stays in the face. twin is the same edge in the other
    // direction, in the neighbor; a boundary half-edge has twin = -1. A consistently wound mesh has every twin.
    public static HalfEdges BuildHalfEdges(int[][] tris)
    {
        List<int> @from = new List<int>();
        List<int> to = new List<int>();
        List<int> face = new List<int>();
        List<int> next = new List<int>();
        List<int> twin = new List<int>();
        Dictionary<long, int> byDirection = new Dictionary<long, int>();
        for (int t = 0; t < tris.Length; t++)
        {
            for (int k = 0; k < 3; k++)
            {
                int a = tris[t][k];
                int b = tris[t][(k + 1) % 3];
                @from.Add(a);
                to.Add(b);
                face.Add(t);
                next.Add(3 * t + (k + 1) % 3);
                twin.Add(-1);
                byDirection[EdgeKey(a, b)] = 3 * t + k;
            }
        }
        for (int h = 0; h < @from.Count; h++)
        {
            int other;
            if (byDirection.TryGetValue(EdgeKey(to[h], @from[h]), out other)) twin[h] = other;
        }
        HalfEdges he;
        he.@from = @from.ToArray();
        he.to = to.ToArray();
        he.face = face.ToArray();
        he.next = next.ToArray();
        he.twin = twin.ToArray();
        return he;
    }
    #endregion

    #region Half-edges: walk the ring of a vertex
    // From a half-edge leaving v, next.next arrives back at v, and its twin leaves v again: one step around. On a closed surface the
    // walk returns to its start, and the ring's length is the valence. On a boundary it stops at a missing twin, and the rest of the
    // ring lies the other way, by twin then next.
    public static (int[] ring, bool closed, int valence) VertexRing(HalfEdges he, int start)
    {
        List<int> ring = new List<int>();
        ring.Add(he.to[start]);
        int h = start;
        bool closed = false;
        for (int step = 0; step < he.@from.Length; step++)
        {
            int prev = he.next[he.next[h]];
            h = he.twin[prev];
            if (h == start)
            {
                closed = true;
                break;
            }
            if (h == -1)
            {
                ring.Add(he.@from[prev]);
                break;
            }
            ring.Add(he.to[h]);
        }
        if (!closed)
        {
            h = start;
            for (int step = 0; step < he.@from.Length; step++)
            {
                int back = he.twin[h];
                if (back == -1) break;
                h = he.next[back];
                ring.Insert(0, he.to[h]);
            }
        }
        return (ring.ToArray(), closed, ring.Count);
    }
    #endregion

    #region Topology: boundary loops
    // The half-edges with no twin join up into closed loops, one per hole.
    public static (int[][] loops, int count) BoundaryLoops(HalfEdges he)
    {
        Dictionary<int, int> outgoing = new Dictionary<int, int>();
        for (int h = 0; h < he.@from.Length; h++)
        {
            if (he.twin[h] == -1) outgoing[he.@from[h]] = h;
        }
        HashSet<int> used = new HashSet<int>();
        List<int[]> loops = new List<int[]>();
        for (int h = 0; h < he.@from.Length; h++)
        {
            if (he.twin[h] != -1 || used.Contains(h)) continue;
            List<int> loop = new List<int>();
            int at = h;
            while (at != -1 && !used.Contains(at))
            {
                used.Add(at);
                loop.Add(he.@from[at]);
                int following;
                at = outgoing.TryGetValue(he.to[at], out following) ? following : -1;      // -1: no half-edge continues the loop
            }
            loops.Add(loop.ToArray());
        }
        return (loops.ToArray(), loops.Count);
    }
    #endregion

    #region Topology: Euler's formula
    // V - E + F = 2C - 2g - b for C connected pieces, g handles and b boundary loops. Three counts and a subtraction test a mesh: a
    // surprise in g or b means a hole or a crack. A vertex no triangle uses is not on the surface, so it is not counted.
    public static EulerResult EulerCheck(int vertexCount, int[][] tris)
    {
        int[] parent = new int[vertexCount];
        bool[] usedVertex = new bool[vertexCount];
        for (int i = 0; i < vertexCount; i++)
        {
            parent[i] = i;
            usedVertex[i] = false;
        }
        for (int t = 0; t < tris.Length; t++)
        {
            for (int k = 0; k < 3; k++)
            {
                usedVertex[tris[t][k]] = true;
                parent[Find(parent, tris[t][k])] = Find(parent, tris[t][(k + 1) % 3]);
            }
        }
        int V = 0;
        int components = 0;
        for (int i = 0; i < vertexCount; i++)
        {
            if (usedVertex[i])
            {
                V += 1;
                if (Find(parent, i) == i) components += 1;
            }
        }
        var list = EdgeList(tris);
        int E = list.edges.Length;
        int F = tris.Length;
        int chi = V - E + F;
        int loops = BoundaryLoops(BuildHalfEdges(tris)).count;
        float genus = (2 * components - chi - loops) / 2f;
        EulerResult result;
        result.V = V;
        result.E = E;
        result.F = F;
        result.chi = chi;
        result.components = components;
        result.loops = loops;
        result.genus = genus;
        result.unreferenced = vertexCount - V;
        result.boundary = list.boundary;
        result.nonManifold = list.nonManifold;
        return result;
    }

    // The root of x's set, with each step on the way pointing at its grandparent.
    static int Find(int[] parent, int x)
    {
        int r = x;
        while (parent[r] != r)
        {
            parent[r] = parent[parent[r]];
            r = parent[r];
        }
        return r;
    }
    #endregion

    #region Topology: valence
    // The number of edges at a vertex. From Euler, E is about 3V on a large closed mesh, so the average is about 6, and vertices of
    // other valence are where subdivision and remeshing leave artifacts.
    public static (int[] valence, int[] histogram, float mean) ValenceOf(int vertexCount, int[][] tris)
    {
        int[][] edges = EdgeList(tris).edges;
        int[] valence = new int[vertexCount];
        for (int e = 0; e < edges.Length; e++)
        {
            valence[edges[e][0]] += 1;
            valence[edges[e][1]] += 1;
        }
        int most = 0;
        int total = 0;
        int used = 0;
        for (int i = 0; i < vertexCount; i++)
        {
            most = Mathf.Max(most, valence[i]);
            if (valence[i] > 0)
            {
                total += valence[i];
                used += 1;
            }
        }
        int[] histogram = new int[most + 1];
        for (int i = 0; i < vertexCount; i++) histogram[valence[i]] += 1;
        float mean = used > 0 ? (float)total / used : 0f;
        return (valence, histogram, mean);
    }
    #endregion

    #region Winding: reverse a triangle
    // Swap two indices. The positions do not move: only the order changes, so the cross product of the edges, and the side the
    // triangle calls its front, reverse.
    public static (int[] before, int[] after, int[][] tris) ReverseTriangle(int[][] tris, int t)
    {
        int[] before = tris[t];
        int[] after = new int[] { before[0], before[2], before[1] };
        int[][] reversed = new int[tris.Length][];
        for (int i = 0; i < tris.Length; i++) reversed[i] = i == t ? after : tris[i];
        return (before, after, reversed);
    }
    #endregion

    #region Winding: which side faces the eye
    // A renderer culls on the sign of the projected triangle's area (OpenGL's default keeps counter-clockwise on screen). The same
    // test in 3D: the normal from the winding, dotted with the arrow to the eye. Unity keeps clockwise on its left-handed axes, the
    // mirror image of this rule, so the same numbers face the same way.
    public static (Vector3 e1, Vector3 e2, Vector3 n, Vector3 toEye, float s, bool front) FacesEye(Vector3 a, Vector3 b, Vector3 c, Vector3 eye)
    {
        Vector3 e1 = b - a;
        Vector3 e2 = c - a;
        Vector3 n = Vector3.Cross(e1, e2);
        Vector3 toEye = eye - a;
        float s = Vector3.Dot(n, toEye);
        bool front = s > 0f;
        return (e1, e2, n, toEye, s, front);
    }

    public static (float area2, bool ccw) ScreenArea(Vector2 p0, Vector2 p1, Vector2 p2)
    {
        float area2 = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
        bool ccw = area2 > 0f;
        return (area2, ccw);
    }
    #endregion

    #region Winding: is the mesh consistent
    // In a consistently wound mesh, two triangles sharing an edge walk it in opposite directions. A directed edge that appears twice
    // marks a neighbor wound the wrong way.
    public static (int[][] bad, int count, bool consistent) WindingCheck(int[][] tris)
    {
        Dictionary<long, int> counts = new Dictionary<long, int>();
        List<int[]> bad = new List<int[]>();
        for (int t = 0; t < tris.Length; t++)
        {
            for (int k = 0; k < 3; k++)
            {
                int a = tris[t][k];
                int b = tris[t][(k + 1) % 3];
                long key = EdgeKey(a, b);
                int seen;
                counts.TryGetValue(key, out seen);        // 0 when the directed edge has not appeared
                if (seen == 1) bad.Add(new int[] { a, b });
                counts[key] = seen + 1;
            }
        }
        bool consistent = bad.Count == 0;
        return (bad.ToArray(), bad.Count, consistent);
    }
    #endregion

    #region Winding: repair it
    // A flood across shared edges: each neighbor must walk the shared edge the other way, or it is flipped. Each connected piece
    // keeps its first triangle's choice, so a whole piece can still be inside out. A Moebius strip has no consistent winding.
    public static (int[][] tris, int flipped) Reorient(int[][] tris)
    {
        int faceCount = tris.Length;
        int[][] fixedUp = new int[faceCount][];
        bool[] visited = new bool[faceCount];
        for (int t = 0; t < faceCount; t++)
        {
            fixedUp[t] = new int[] { tris[t][0], tris[t][1], tris[t][2] };
            visited[t] = false;
        }
        Dictionary<long, List<int>> facesOnEdge = new Dictionary<long, List<int>>();
        for (int t = 0; t < faceCount; t++)
        {
            for (int k = 0; k < 3; k++)
            {
                long key = UndirectedKey(tris[t][k], tris[t][(k + 1) % 3]);
                if (!facesOnEdge.ContainsKey(key)) facesOnEdge[key] = new List<int>();
                facesOnEdge[key].Add(t);
            }
        }
        int flipped = 0;
        for (int seed = 0; seed < faceCount; seed++)
        {
            if (visited[seed]) continue;
            visited[seed] = true;
            List<int> queue = new List<int>();
            queue.Add(seed);
            for (int q = 0; q < queue.Count; q++)
            {
                int t = queue[q];
                for (int k = 0; k < 3; k++)
                {
                    int a = fixedUp[t][k];
                    int b = fixedUp[t][(k + 1) % 3];
                    List<int> others = facesOnEdge[UndirectedKey(a, b)];
                    for (int o = 0; o < others.Count; o++)
                    {
                        int u = others[o];
                        if (visited[u]) continue;
                        visited[u] = true;
                        queue.Add(u);
                        int[] f = fixedUp[u];
                        if ((f[0] == a && f[1] == b) || (f[1] == a && f[2] == b) || (f[2] == a && f[0] == b))
                        {
                            fixedUp[u] = new int[] { f[0], f[2], f[1] };
                            flipped += 1;
                        }
                    }
                }
            }
        }
        return (fixedUp, flipped);
    }
    #endregion

    #region Normals: a face
    // The cross product of two edges from one corner. Its direction comes from the winding, and its length is twice the area.
    public static (Vector3 e1, Vector3 e2, Vector3 n, float area, Vector3 nHat) FaceNormal(Vector3 a, Vector3 b, Vector3 c)
    {
        Vector3 e1 = b - a;
        Vector3 e2 = c - a;
        Vector3 n = Vector3.Cross(e1, e2);
        float area = n.magnitude / 2f;
        Vector3 nHat = n.normalized;
        return (e1, e2, n, area, nHat);
    }
    #endregion

    #region Normals: Newell's polygon normal
    // A polygon with more than three corners need not lie exactly in one plane, so no single cross product speaks for it. Summing the
    // cross products of consecutive corners uses all of them. The length of the sum is twice the area projected along the normal.
    public static (Vector3 n, float area, Vector3 nHat) NewellNormal(Vector3[] points)
    {
        Vector3 n = Vector3.zero;
        for (int i = 0; i < points.Length; i++)
        {
            n += Vector3.Cross(points[i], points[(i + 1) % points.Length]);
        }
        float area = n.magnitude / 2f;
        Vector3 nHat = n.normalized;
        return (n, area, nHat);
    }
    #endregion

    #region Normals: a vertex
    // Sum the normals of the faces at a vertex, then normalize. How much each face counts is a choice: equally (uniform), by area (the
    // un-normalized cross product), or by the angle the face makes at this corner, which does not change when a face is split.
    public static Vector3[] VertexNormals(Vector3[] positions, int[][] tris, string weighting)
    {
        Vector3[] sums = new Vector3[positions.Length];
        for (int t = 0; t < tris.Length; t++)
        {
            int[] tri = tris[t];
            Vector3 n = Vector3.Cross(positions[tri[1]] - positions[tri[0]], positions[tri[2]] - positions[tri[0]]);
            Vector3 nHat = n.normalized;
            for (int k = 0; k < 3; k++)
            {
                int v = tri[k];
                Vector3 weighted = n;
                if (weighting == "uniform") weighted = nHat;
                if (weighting == "angle")
                {
                    Vector3 u = positions[tri[(k + 1) % 3]] - positions[v];
                    Vector3 w = positions[tri[(k + 2) % 3]] - positions[v];
                    weighted = nHat * Mathf.Atan2(Vector3.Cross(u, w).magnitude, Vector3.Dot(u, w));
                }
                sums[v] += weighted;
            }
        }
        Vector3[] normals = new Vector3[positions.Length];
        for (int i = 0; i < positions.Length; i++) normals[i] = sums[i].normalized;
        return normals;
    }
    #endregion

    #region Normals: split at hard edges
    // A vertex holds one normal, so a hard edge forces a split: one position, one vertex per smooth group. Two corners at a vertex join
    // a group when their faces share an edge at this vertex and meet at less than the crease angle. A cube at 30 degrees has 24 vertices,
    // not 8. Each group's normal is the area-weighted sum over its corners.
    public static (int[] groupOfCorner, int groups, Vector3[] normals, int[][] hard) SplitByCrease(Vector3[] positions, int[][] tris, float creaseDeg)
    {
        int[] parent = new int[tris.Length * 3];
        for (int c = 0; c < tris.Length * 3; c++) parent[c] = c;
        Vector3[] faceN = new Vector3[tris.Length];
        for (int t = 0; t < tris.Length; t++)
        {
            faceN[t] = Vector3.Cross(positions[tris[t][1]] - positions[tris[t][0]], positions[tris[t][2]] - positions[tris[t][0]]);
        }
        float limit = Mathf.Cos(creaseDeg * Mathf.PI / 180f);
        int[][] edges = EdgeList(tris).edges;
        List<int[]> hard = new List<int[]>();
        for (int e = 0; e < edges.Length; e++)
        {
            int a = edges[e][0];
            int b = edges[e][1];
            int f0 = edges[e][2];
            int f1 = edges[e][3];
            if (f1 == -1) continue;
            float cosAngle = Vector3.Dot(faceN[f0].normalized, faceN[f1].normalized);
            if (cosAngle >= limit)
            {
                parent[Find(parent, CornerOf(tris, f0, a))] = Find(parent, CornerOf(tris, f1, a));
                parent[Find(parent, CornerOf(tris, f0, b))] = Find(parent, CornerOf(tris, f1, b));
            }
            else
            {
                hard.Add(new int[] { a, b });
            }
        }
        Dictionary<int, int> numberOf = new Dictionary<int, int>();
        int[] groupOfCorner = new int[tris.Length * 3];
        List<Vector3> sums = new List<Vector3>();
        for (int c = 0; c < tris.Length * 3; c++)
        {
            int root = Find(parent, c);
            if (!numberOf.ContainsKey(root))
            {
                numberOf[root] = sums.Count;
                sums.Add(Vector3.zero);
            }
            int g = numberOf[root];
            groupOfCorner[c] = g;
            sums[g] += faceN[c / 3];
        }
        Vector3[] normals = new Vector3[sums.Count];
        for (int g = 0; g < sums.Count; g++) normals[g] = sums[g].normalized;
        return (groupOfCorner, sums.Count, normals, hard.ToArray());
    }

    // The corner of triangle t that sits at vertex v: corners are numbered 3t, 3t + 1, 3t + 2.
    static int CornerOf(int[][] tris, int t, int v)
    {
        return 3 * t + Array.IndexOf(tris[t], v);
    }
    #endregion

    #region Build: an icosahedron
    // Twelve vertices at the corners of three golden rectangles, twenty equilateral triangles, valence 5 everywhere.
    public static (Vector3[] positions, int[][] tris) Icosahedron()
    {
        float t = (1f + Mathf.Sqrt(5f)) / 2f;
        Vector3[] positions = { new Vector3(-1f, t, 0f), new Vector3(1f, t, 0f), new Vector3(-1f, -t, 0f), new Vector3(1f, -t, 0f),
            new Vector3(0f, -1f, t), new Vector3(0f, 1f, t), new Vector3(0f, -1f, -t), new Vector3(0f, 1f, -t),
            new Vector3(t, 0f, -1f), new Vector3(t, 0f, 1f), new Vector3(-t, 0f, -1f), new Vector3(-t, 0f, 1f) };
        int[][] tris = { new int[] { 0, 11, 5 }, new int[] { 0, 5, 1 }, new int[] { 0, 1, 7 }, new int[] { 0, 7, 10 }, new int[] { 0, 10, 11 },
            new int[] { 1, 5, 9 }, new int[] { 5, 11, 4 }, new int[] { 11, 10, 2 }, new int[] { 10, 7, 6 }, new int[] { 7, 1, 8 },
            new int[] { 3, 9, 4 }, new int[] { 3, 4, 2 }, new int[] { 3, 2, 6 }, new int[] { 3, 6, 8 }, new int[] { 3, 8, 9 },
            new int[] { 4, 9, 5 }, new int[] { 2, 4, 11 }, new int[] { 6, 2, 10 }, new int[] { 8, 6, 7 }, new int[] { 9, 8, 1 } };
        return (positions, tris);
    }
    #endregion

    #region Build: subdivide
    // Each triangle becomes four, through a new vertex at each edge's midpoint, shared by the two triangles on that edge. F grows by 4,
    // E by about 4, V by about 4; the old vertices keep their valence and every new one has valence 6. With a radius, every vertex is
    // pushed onto the sphere: an icosahedron becomes an icosphere of 42, then 162 vertices.
    public static (Vector3[] positions, int[][] tris) Subdivide(Vector3[] positions, int[][] tris, float radius)
    {
        List<Vector3> points = new List<Vector3>(positions);
        Dictionary<long, int> midpointOf = new Dictionary<long, int>();
        List<int[]> finer = new List<int[]>();
        for (int t = 0; t < tris.Length; t++)
        {
            int a = tris[t][0];
            int b = tris[t][1];
            int c = tris[t][2];
            int ab = Midpoint(positions, points, midpointOf, a, b);
            int bc = Midpoint(positions, points, midpointOf, b, c);
            int ca = Midpoint(positions, points, midpointOf, c, a);
            finer.Add(new int[] { a, ab, ca });
            finer.Add(new int[] { b, bc, ab });
            finer.Add(new int[] { c, ca, bc });
            finer.Add(new int[] { ab, bc, ca });
        }
        if (radius > 0f)
        {
            for (int i = 0; i < points.Count; i++) points[i] = points[i].normalized * radius;
        }
        return (points.ToArray(), finer.ToArray());
    }

    // The vertex at the midpoint of edge a-b: made the first time either triangle on the edge asks, reused after.
    static int Midpoint(Vector3[] positions, List<Vector3> points, Dictionary<long, int> midpointOf, int a, int b)
    {
        long key = UndirectedKey(a, b);
        if (!midpointOf.ContainsKey(key))
        {
            midpointOf[key] = points.Count;
            points.Add((positions[a] + positions[b]) * 0.5f);
        }
        return midpointOf[key];
    }
    #endregion

    #region Build: a surface of revolution
    // A profile of (r, y) points, rotated about y in S steps. Row i and column j give a vertex; each quad gives two triangles, wound
    // outward. A profile point on the axis (r = 0) makes a whole ring of copies of one position: S triangles there have zero area and
    // no normal. Collapsing the ring to one vertex removes them.
    public static (Vector3[] positions, int[][] tris, int degenerate) SurfaceOfRevolution(Vector2[] profile, int segments, bool collapse)
    {
        List<Vector3> positions = new List<Vector3>();
        List<int[]> rows = new List<int[]>();
        for (int i = 0; i < profile.Length; i++)
        {
            float r = profile[i].x;
            float y = profile[i].y;
            int[] row = new int[segments];
            if (collapse && Mathf.Abs(r) < Eps)
            {
                positions.Add(new Vector3(0f, y, 0f));
                for (int j = 0; j < segments; j++) row[j] = positions.Count - 1;
            }
            else
            {
                for (int j = 0; j < segments; j++)
                {
                    float angle = 2f * Mathf.PI * j / segments;
                    row[j] = positions.Count;
                    positions.Add(new Vector3(r * Mathf.Sin(angle), y, r * Mathf.Cos(angle)));
                }
            }
            rows.Add(row);
        }
        List<int[]> tris = new List<int[]>();
        int degenerate = 0;
        for (int i = 0; i + 1 < rows.Count; i++)
        {
            for (int j = 0; j < segments; j++)
            {
                int k = (j + 1) % segments;
                int[][] candidates = { new int[] { rows[i][j], rows[i][k], rows[i + 1][k] }, new int[] { rows[i][j], rows[i + 1][k], rows[i + 1][j] } };
                for (int c = 0; c < 2; c++)
                {
                    int[] tri = candidates[c];
                    if (tri[0] == tri[1] || tri[1] == tri[2] || tri[2] == tri[0]) continue;
                    if (FaceNormal(positions[tri[0]], positions[tri[1]], positions[tri[2]]).area < Eps) degenerate += 1;
                    tris.Add(tri);
                }
            }
        }
        return (positions.ToArray(), tris.ToArray(), degenerate);
    }
    #endregion

    #region Build: one marching cube
    // Eight values on a cube's corners, inside where the value passes iso: 256 cases. Each edge with one end inside is crossed, at the
    // fraction t that interpolates to iso. A lookup table lists the crossed edges' polygon for each case; here each case's polygon is
    // traced instead: on each cube face, a segment cuts off each run of inside corners, and the segments join into closed loops.
    static readonly Vector3[] CubeCornerList = { new Vector3(0f, 0f, 0f), new Vector3(1f, 0f, 0f), new Vector3(1f, 1f, 0f), new Vector3(0f, 1f, 0f),
        new Vector3(0f, 0f, 1f), new Vector3(1f, 0f, 1f), new Vector3(1f, 1f, 1f), new Vector3(0f, 1f, 1f) };
    static readonly int[][] CubeEdges = { new int[] { 0, 1 }, new int[] { 1, 2 }, new int[] { 2, 3 }, new int[] { 3, 0 }, new int[] { 4, 5 }, new int[] { 5, 6 },
        new int[] { 6, 7 }, new int[] { 7, 4 }, new int[] { 0, 4 }, new int[] { 1, 5 }, new int[] { 2, 6 }, new int[] { 3, 7 } };
    static readonly int[][] CubeFaces = { new int[] { 0, 3, 2, 1 }, new int[] { 4, 5, 6, 7 }, new int[] { 0, 1, 5, 4 }, new int[] { 2, 3, 7, 6 },
        new int[] { 3, 0, 4, 7 }, new int[] { 1, 2, 6, 5 } };

    static int EdgeBetween(int a, int b)
    {
        for (int e = 0; e < 12; e++)
        {
            if ((CubeEdges[e][0] == a && CubeEdges[e][1] == b) || (CubeEdges[e][0] == b && CubeEdges[e][1] == a)) return e;
        }
        return -1;
    }

    public static Vector3[] CubeCorners()
    {
        return CubeCornerList;
    }

    public static (int caseIndex, int[] crossed, Vector3[] points, int[][] loops, int[][] triangles) MarchingCell(float[] values, float iso)
    {
        int caseIndex = 0;
        for (int c = 0; c < 8; c++)
        {
            if (values[c] > iso) caseIndex += 1 << c;
        }
        List<int> crossed = new List<int>();
        List<Vector3> points = new List<Vector3>();
        for (int e = 0; e < 12; e++)
        {
            int a = CubeEdges[e][0];
            int b = CubeEdges[e][1];
            if ((values[a] > iso) != (values[b] > iso))
            {
                float t = (iso - values[a]) / (values[b] - values[a]);
                crossed.Add(e);
                points.Add(CubeCornerList[a] + (CubeCornerList[b] - CubeCornerList[a]) * t);
            }
        }
        int[] nextEdge = new int[12];
        for (int e = 0; e < 12; e++) nextEdge[e] = -1;
        for (int f = 0; f < 6; f++)
        {
            int[] corners = CubeFaces[f];
            int enter = -1;
            for (int start = 0; start < 8; start++)
            {
                int c0 = corners[start % 4];
                int c1 = corners[(start + 1) % 4];
                int edge = EdgeBetween(c0, c1);
                if (!(values[c0] > iso) && values[c1] > iso) enter = edge;
                if (values[c0] > iso && !(values[c1] > iso) && enter != -1)
                {
                    nextEdge[enter] = edge;
                    enter = -1;
                }
            }
        }
        List<int[]> loops = new List<int[]>();
        bool[] visited = new bool[12];
        for (int e = 0; e < 12; e++)
        {
            if (nextEdge[e] == -1 || visited[e]) continue;
            List<int> loop = new List<int>();
            int at = e;
            while (!visited[at])
            {
                visited[at] = true;
                loop.Add(at);
                at = nextEdge[at];
            }
            loops.Add(loop.ToArray());
        }
        List<int[]> triangles = new List<int[]>();
        for (int l = 0; l < loops.Count; l++)
        {
            for (int k = 1; k + 1 < loops[l].Length; k++) triangles.Add(new int[] { loops[l][0], loops[l][k], loops[l][k + 1] });
        }
        return (caseIndex, crossed.ToArray(), points.ToArray(), loops.ToArray(), triangles.ToArray());
    }
    #endregion

    #region Build: march a grid
    // Every cube of a grid, with the vertices on shared grid edges merged, so the result is one connected mesh. n cubes on a side,
    // (n + 1) values on a side, stored x fastest. A field that closes inside the grid gives a closed surface.
    public static float FieldValue(string kind, Vector3 p)
    {
        if (kind == "torus")
        {
            float ring = Mathf.Sqrt(p.x * p.x + p.z * p.z) - 1.2f;
            return 0.55f - Mathf.Sqrt(ring * ring + p.y * p.y);
        }
        if (kind == "blobs")
        {
            Vector3 a = p - new Vector3(-0.8f, 0f, 0f);
            Vector3 b = p - new Vector3(0.8f, 0.2f, 0f);
            return 0.9f / (Vector3.Dot(a, a) + 0.1f) + 0.9f / (Vector3.Dot(b, b) + 0.1f) - 1f;
        }
        return 1.5f - p.magnitude;
    }

    public static (Vector3[] positions, int[][] tris, int cellsCrossed) MarchGrid(string kind, int n, float iso, float half)
    {
        float step = 2f * half / n;
        int side = n + 1;
        List<float> values = new List<float>();
        for (int k = 0; k < side; k++)
        {
            for (int j = 0; j < side; j++)
            {
                for (int i = 0; i < side; i++) values.Add(FieldValue(kind, new Vector3(-half + i * step, -half + j * step, -half + k * step)));
            }
        }
        List<Vector3> positions = new List<Vector3>();
        List<int[]> tris = new List<int[]>();
        Dictionary<long, int> vertexOnEdge = new Dictionary<long, int>();
        int cellsCrossed = 0;
        for (int k = 0; k < n; k++)
        {
            for (int j = 0; j < n; j++)
            {
                for (int i = 0; i < n; i++)
                {
                    int[] ids = new int[8];
                    float[] cell = new float[8];
                    for (int c = 0; c < 8; c++)
                    {
                        int id = (i + (int)CubeCornerList[c].x) + side * (j + (int)CubeCornerList[c].y) + side * side * (k + (int)CubeCornerList[c].z);
                        ids[c] = id;
                        cell[c] = values[id];
                    }
                    var result = MarchingCell(cell, iso);
                    if (result.triangles.Length > 0) cellsCrossed += 1;
                    for (int t = 0; t < result.triangles.Length; t++)
                    {
                        int[] tri = new int[3];
                        for (int m = 0; m < 3; m++)
                        {
                            int e = result.triangles[t][m];
                            long key = UndirectedKey(ids[CubeEdges[e][0]], ids[CubeEdges[e][1]]);
                            if (!vertexOnEdge.ContainsKey(key))
                            {
                                vertexOnEdge[key] = positions.Count;
                                Vector3 local = result.points[Array.IndexOf(result.crossed, e)];
                                positions.Add(new Vector3(-half + (i + local.x) * step, -half + (j + local.y) * step, -half + (k + local.z) * step));
                            }
                            tri[m] = vertexOnEdge[key];
                        }
                        tris.Add(tri);
                    }
                }
            }
        }
        return (positions.ToArray(), tris.ToArray(), cellsCrossed);
    }
    #endregion

    #region Cache: count the misses
    // A GPU keeps the last few transformed vertices in a first-in, first-out cache. A vertex found there costs no shader run. The measure
    // is ACMR: misses per triangle. 3 is the worst; the number of vertices over the number of triangles is the best possible.
    public static (int misses, float acmr, int[] perTriangle, int[] cache) CacheMisses(int[][] tris, int size)
    {
        List<int> cache = new List<int>();
        List<int> perTriangle = new List<int>();
        int misses = 0;
        for (int t = 0; t < tris.Length; t++)
        {
            int missesHere = 0;
            for (int k = 0; k < 3; k++)
            {
                if (cache.IndexOf(tris[t][k]) == -1)
                {
                    missesHere += 1;
                    cache.Add(tris[t][k]);
                    if (cache.Count > size) cache.RemoveAt(0);
                }
            }
            perTriangle.Add(missesHere);
            misses += missesHere;
        }
        float acmr = tris.Length > 0 ? (float)misses / tris.Length : 0f;
        return (misses, acmr, perTriangle.ToArray(), cache.ToArray());
    }
    #endregion

    #region Cache: shuffle the triangles
    // The worst realistic order, with a seeded generator (Park-Miller) so both tracks agree. The triangles and the picture are unchanged.
    public static int[][] ShuffleTriangles(int[][] tris, int seed)
    {
        int[][] order = (int[][])tris.Clone();
        long state = seed;                            // a long: state * 48271 passes 32 bits
        for (int i = order.Length - 1; i > 0; i--)
        {
            state = state * 48271 % 2147483647;
            int j = (int)(state % (i + 1));
            int[] swap = order[i];
            order[i] = order[j];
            order[j] = swap;
        }
        return order;
    }
    #endregion

    #region Cache: reorder the triangles
    // Tipsify (Sander, Nehab and Barczak, 2007): emit every triangle around a fan vertex, then move to a neighboring vertex that is still
    // in the cache and has few triangles left. Linear time, and the result is close to the bound for any cache of about k entries.
    public static int[][] Tipsify(int[][] tris, int vertexCount, int k)
    {
        List<int>[] adjacent = new List<int>[vertexCount];
        int[] live = new int[vertexCount];
        int[] stamp = new int[vertexCount];
        for (int v = 0; v < vertexCount; v++) adjacent[v] = new List<int>();
        for (int t = 0; t < tris.Length; t++)
        {
            for (int c = 0; c < 3; c++)
            {
                adjacent[tris[t][c]].Add(t);
                live[tris[t][c]] += 1;
            }
        }
        bool[] emitted = new bool[tris.Length];
        List<int[]> order = new List<int[]>();
        List<int> stack = new List<int>();
        int fan = 0;
        while (fan < vertexCount && live[fan] == 0) fan += 1;
        int time = k + 1;
        int cursor = fan + 1;
        while (fan >= 0 && fan < vertexCount)
        {
            List<int> candidates = new List<int>();
            for (int i = 0; i < adjacent[fan].Count; i++)
            {
                int t = adjacent[fan][i];
                if (emitted[t]) continue;
                emitted[t] = true;
                order.Add(tris[t]);
                for (int c = 0; c < 3; c++)
                {
                    int v = tris[t][c];
                    live[v] -= 1;
                    stack.Add(v);
                    if (candidates.IndexOf(v) == -1) candidates.Add(v);
                    if (time - stamp[v] > k)
                    {
                        stamp[v] = time;
                        time += 1;
                    }
                }
            }
            int best = -1;
            int bestPriority = -1;
            for (int i = 0; i < candidates.Count; i++)
            {
                int v = candidates[i];
                if (live[v] <= 0) continue;
                int priority = time - stamp[v] + 2 * live[v] <= k ? time - stamp[v] : 0;
                if (priority > bestPriority)
                {
                    bestPriority = priority;
                    best = v;
                }
            }
            while (best == -1 && stack.Count > 0)
            {
                int v = stack[stack.Count - 1];
                stack.RemoveAt(stack.Count - 1);
                if (live[v] > 0) best = v;
            }
            while (best == -1 && cursor < vertexCount)
            {
                if (live[cursor] > 0) best = cursor;
                cursor += 1;
            }
            fan = best;
        }
        return order.ToArray();
    }
    #endregion

    #region Smoothing: one Laplacian step
    // Move each vertex a fraction lambda toward the average of its neighbors. Noise goes, and so does size: on a convex shape every vertex
    // moves inward. Taubin's fix (1995) follows each step with a negative one, mu slightly larger in size than lambda, and the shape holds.
    public static int[][] NeighborsOf(int vertexCount, int[][] tris)
    {
        List<int>[] neighbors = new List<int>[vertexCount];
        for (int v = 0; v < vertexCount; v++) neighbors[v] = new List<int>();
        for (int t = 0; t < tris.Length; t++)
        {
            for (int k = 0; k < 3; k++)
            {
                int a = tris[t][k];
                int b = tris[t][(k + 1) % 3];
                if (neighbors[a].IndexOf(b) == -1) neighbors[a].Add(b);
                if (neighbors[b].IndexOf(a) == -1) neighbors[b].Add(a);
            }
        }
        int[][] result = new int[vertexCount][];
        for (int v = 0; v < vertexCount; v++) result[v] = neighbors[v].ToArray();
        return result;
    }

    public static Vector3[] LaplacianStep(Vector3[] positions, int[][] neighbors, float lambda)
    {
        Vector3[] moved = new Vector3[positions.Length];
        for (int v = 0; v < positions.Length; v++)
        {
            Vector3 mean = Vector3.zero;
            for (int i = 0; i < neighbors[v].Length; i++) mean += positions[neighbors[v][i]];
            int count = neighbors[v].Length;
            if (count > 0) mean = mean * (1f / count);
            moved[v] = count > 0 ? positions[v] + (mean - positions[v]) * lambda : positions[v];
        }
        return moved;
    }

    public static float MeanRadius(Vector3[] positions)
    {
        float total = 0f;
        for (int v = 0; v < positions.Length; v++) total += positions[v].magnitude;
        return positions.Length > 0 ? total / positions.Length : 0f;
    }
    #endregion

    #region Simplify: the quadric of an edge
    // A plane's error at p is the squared distance, (n . p + d)^2, a quadratic in p, stored as the 10 numbers of a symmetric 4 x 4 matrix.
    // The planes of the faces touching either end of an edge add up to one quadric. Its minimum, where a 3 x 3 system solves, is the
    // best place for the merged vertex.
    public static float[] PlaneQuadric(Vector3 a, Vector3 b, Vector3 c)
    {
        Vector3 n = Vector3.Cross(b - a, c - a).normalized;
        float d = -Vector3.Dot(n, a);
        return new float[] { n.x * n.x, n.x * n.y, n.x * n.z, n.x * d, n.y * n.y, n.y * n.z, n.y * d, n.z * n.z, n.z * d, d * d };
    }

    public static float QuadricError(float[] q, Vector3 p)
    {
        return q[0] * p.x * p.x + 2f * q[1] * p.x * p.y + 2f * q[2] * p.x * p.z + 2f * q[3] * p.x
            + q[4] * p.y * p.y + 2f * q[5] * p.y * p.z + 2f * q[6] * p.y
            + q[7] * p.z * p.z + 2f * q[8] * p.z + q[9];
    }

    public static (float[] q, int faces, float atA, float atB, float atMid, Vector3 best, float cost) EdgeCost(Vector3[] positions, int[][] tris, int a, int b)
    {
        float[] q = new float[10];
        int faces = 0;
        for (int t = 0; t < tris.Length; t++)
        {
            int[] tri = tris[t];
            if (Array.IndexOf(tri, a) == -1 && Array.IndexOf(tri, b) == -1) continue;
            float[] plane = PlaneQuadric(positions[tri[0]], positions[tri[1]], positions[tri[2]]);
            for (int i = 0; i < 10; i++) q[i] += plane[i];
            faces += 1;
        }
        Vector3 mid = (positions[a] + positions[b]) * 0.5f;
        float atA = QuadricError(q, positions[a]);
        float atB = QuadricError(q, positions[b]);
        float atMid = QuadricError(q, mid);
        // Cramer's rule on the 3 x 3 system: the gradient of the quadric is zero at its minimum
        float det = q[0] * (q[4] * q[7] - q[5] * q[5]) - q[1] * (q[1] * q[7] - q[5] * q[2]) + q[2] * (q[1] * q[5] - q[4] * q[2]);
        Vector3 best = atMid < atA && atMid < atB ? mid : (atA < atB ? positions[a] : positions[b]);
        if (Mathf.Abs(det) > 1e-6f)
        {
            float r0 = -q[3];
            float r1 = -q[6];
            float r2 = -q[8];
            best = new Vector3(
                (r0 * (q[4] * q[7] - q[5] * q[5]) - q[1] * (r1 * q[7] - q[5] * r2) + q[2] * (r1 * q[5] - q[4] * r2)) / det,
                (q[0] * (r1 * q[7] - q[5] * r2) - r0 * (q[1] * q[7] - q[5] * q[2]) + q[2] * (q[1] * r2 - r1 * q[2])) / det,
                (q[0] * (q[4] * r2 - r1 * q[5]) - q[1] * (q[1] * r2 - r1 * q[2]) + r0 * (q[1] * q[5] - q[4] * q[2])) / det);
        }
        float cost = QuadricError(q, best);
        return (q, faces, atA, atB, atMid, best, cost);
    }
    #endregion

    #region Simplify: collapse an edge
    // b merges into a, at position p. The two triangles on the edge lose their area and go, and b's other triangles now use a. V falls by
    // 1, E by 3, F by 2, so V - E + F does not change.
    public static (Vector3[] positions, int[][] tris, int removed) CollapseEdge(Vector3[] positions, int[][] tris, int a, int b, Vector3 p)
    {
        Vector3[] moved = (Vector3[])positions.Clone();
        moved[a] = p;
        List<int[]> kept = new List<int[]>();
        for (int t = 0; t < tris.Length; t++)
        {
            int[] tri = { tris[t][0] == b ? a : tris[t][0], tris[t][1] == b ? a : tris[t][1], tris[t][2] == b ? a : tris[t][2] };
            if (tri[0] != tri[1] && tri[1] != tri[2] && tri[2] != tri[0]) kept.Add(tri);
        }
        return (moved, kept.ToArray(), tris.Length - kept.Count);
    }

    // A collapse keeps the surface a surface only if the two ends share exactly the neighbors on the edge's own faces.
    public static bool LinkCondition(int[][] neighbors, int a, int b, int facesOnEdge)
    {
        int shared = 0;
        for (int i = 0; i < neighbors[a].Length; i++)
        {
            if (Array.IndexOf(neighbors[b], neighbors[a][i]) != -1) shared += 1;
        }
        return shared == facesOnEdge;
    }

    public static (Vector3[] positions, int[][] tris) CompactVertices(Vector3[] positions, int[][] tris)
    {
        int[] remap = new int[positions.Length];
        for (int v = 0; v < positions.Length; v++) remap[v] = -1;
        List<Vector3> kept = new List<Vector3>();
        List<int[]> remapped = new List<int[]>();
        for (int t = 0; t < tris.Length; t++)
        {
            int[] tri = new int[3];
            for (int k = 0; k < 3; k++)
            {
                int v = tris[t][k];
                if (remap[v] == -1)
                {
                    remap[v] = kept.Count;
                    kept.Add(positions[v]);
                }
                tri[k] = remap[v];
            }
            remapped.Add(tri);
        }
        return (kept.ToArray(), remapped.ToArray());
    }
    #endregion

    #region Simplify: the cheapest collapse
    // The greedy step of quadric simplification: the edge whose merged vertex adds the least squared distance, among those that pass the
    // link condition. A real simplifier keeps the costs in a priority queue; here they are all recomputed, which is fine at this size.
    public static (int a, int b, float cost, Vector3 point) CheapestCollapse(Vector3[] positions, int[][] tris)
    {
        // a tetrahedron is the smallest closed surface: collapsing one of its edges would leave two triangles back to back
        if (tris.Length <= 4) return (-1, -1, 0f, Vector3.zero);
        int[][] list = EdgeList(tris).edges;
        int[][] neighbors = NeighborsOf(positions.Length, tris);
        int bestEdge = -1;
        float bestCost = float.PositiveInfinity;
        Vector3 bestPoint = Vector3.zero;
        for (int e = 0; e < list.Length; e++)
        {
            int a = list[e][0];
            int b = list[e][1];
            int f1 = list[e][3];
            if (!LinkCondition(neighbors, a, b, f1 == -1 ? 1 : 2)) continue;
            var c = EdgeCost(positions, tris, a, b);
            if (c.cost < bestCost)
            {
                bestCost = c.cost;
                bestEdge = e;
                bestPoint = c.best;
            }
        }
        int ea = bestEdge == -1 ? -1 : list[bestEdge][0];
        int eb = bestEdge == -1 ? -1 : list[bestEdge][1];
        return (ea, eb, bestCost, bestPoint);
    }
    #endregion
}
