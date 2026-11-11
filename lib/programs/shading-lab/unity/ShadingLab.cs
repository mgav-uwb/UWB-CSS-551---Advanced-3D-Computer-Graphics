using System;
using System.Collections.Generic;
using UnityEngine;

// ShadingLab.cs: why a lit sphere reads as a ball and an unlit one as a flat disk. A disk and a sphere, seen straight on, cover
// the same circle of pixels; the disk has one normal, the sphere a different normal at every pixel. Lambert's term turns the
// normal into a brightness, so the sphere's brightness varies and the disk's does not. Also: the texture's squeeze near the
// sphere's rim, an icosphere shaded with one normal per face or one per vertex, and the bump that a light from below turns into
// a dent. Plain C#, no MonoBehaviour: vectors and colors are Vector3 ([r, g, b] for a color, in linear light unless a name says
// "code"), texture coordinates Vector2. ShadingLabScene.cs draws it. No method changes its arguments.
// Each method returns its named intermediate results as a tuple or a struct, with the field names and the order of the object
// shading.js returns.
// The same functions, line for line where the languages allow, are shading.js in ../webgl/
// (lib/tests/programs/shading-lab.test.mjs runs both on the same inputs and compares the numbers).
public static class ShadingLab
{
    #region Settings and vector helpers
    // Below Eps a length counts as zero. Angles are in degrees. Unity's Vector3 has these operations built in.
    public const float Eps = 1e-6f;
    public const float Deg = 180f / Mathf.PI;

    static Vector3 Normalize(Vector3 a)
    {
        float l = a.magnitude;
        return l > Eps ? a / l : Vector3.zero;
    }
    #endregion

    #region The light's direction
    // A directional light, given by two angles. L points toward the light. The eye looks down -z, so az 0 and el 0 put the light
    // behind the eye; az turns it toward +x (the right of the picture), el raises it toward +y. az 180 puts it behind the shape.
    public static Vector3 LightFromAngles(float azDeg, float elDeg)
    {
        float az = azDeg / Deg;
        float el = elDeg / Deg;
        Vector3 L = new Vector3(Mathf.Cos(el) * Mathf.Sin(az), Mathf.Sin(el), Mathf.Cos(el) * Mathf.Cos(az));
        return L;
    }
    #endregion

    #region Normals: a disk and a sphere
    // Both shapes are seen straight on and cover the unit circle of the picture, so their outlines are the same circle. A pixel's
    // (x, y) runs over [-1, 1]. The disk is flat: the same normal at every pixel. On the unit sphere the point under the pixel is
    // (x, y, z) with z = sqrt(1 - x^2 - y^2), and a unit sphere's normal at a point is the point itself.
    public static bool InsideCircle(float x, float y) { return x * x + y * y <= 1f; }
    public static Vector3 DiskNormal(float x, float y) { return new Vector3(0f, 0f, 1f); }
    public static Vector3 SphereNormal(float x, float y)
    {
        float z = Mathf.Sqrt(Mathf.Max(0f, 1f - x * x - y * y));
        return new Vector3(x, y, z);
    }
    #endregion

    #region Texture coordinates
    // The sphere wraps the image around itself: u is the longitude, v the latitude, after the sphere turns by spin about y. The
    // disk carries the image flat, scaled to match the sphere at its center: one unit of x covers what one radian of longitude
    // covers there. Toward the sphere's rim the image is squeezed; the disk's is not. That squeeze is the one difference a texture
    // makes between the two pictures.
    public static Vector2 DiskUV(float x, float y, float spinDeg)
    {
        float u = x / (2f * Mathf.PI) + 0.5f + spinDeg / 360f;
        float v = y / Mathf.PI + 0.5f;
        return new Vector2(u, v);
    }
    public static Vector2 SphereUV(Vector3 N, float spinDeg)
    {
        float lon = Mathf.Atan2(N.x, N.z) + spinDeg / Deg;
        float lat = Mathf.Asin(Mathf.Clamp(N.y, -1f, 1f));
        float u = lon / (2f * Mathf.PI) + 0.5f;
        float v = lat / Mathf.PI + 0.5f;
        return new Vector2(u, v);
    }
    #endregion

    #region The texture
    // The base color (albedo) at (u, v), in linear light. 'plain' is one color everywhere: nothing printed, so the outline and
    // the shading are the only cues. 'checker' has 8 squares around and 4 from pole to pole, square at the sphere's center.
    // 'planet' is land, sea and ice from three sine waves, periodic in u so the sphere has no seam.
    public static Vector3 Albedo(string kind, float u, float v)
    {
        if (kind == "checker")
        {
            int cu = Mathf.FloorToInt(u * 8f);
            int cv = Mathf.FloorToInt(v * 4f);
            bool even = (((cu + cv) % 2) + 2) % 2 == 0;
            return even ? new Vector3(0.8f, 0.74f, 0.6f) : new Vector3(0.1f, 0.2f, 0.5f);
        }
        if (kind == "planet")
        {
            float t = 2f * Mathf.PI;
            float h = Mathf.Sin(t * 3f * u + 2f * Mathf.Sin(t * 2f * v)) + 0.6f * Mathf.Sin(t * (5f * u + 3f * v)) + 0.4f * Mathf.Cos(t * (2f * u - 5f * v));
            if (Mathf.Abs(v - 0.5f) > 0.4f) return new Vector3(0.85f, 0.88f, 0.9f);
            return h > 0.45f ? new Vector3(0.3f, 0.42f, 0.12f) : new Vector3(0.04f, 0.12f, 0.4f);
        }
        return new Vector3(0.75f, 0.33f, 0.12f);
    }
    #endregion

    #region Shading at a point
    // Lambert's term with an ambient floor: lit = ka + (1 - ka) max(0, N . L), 1 where the surface faces the light and ka where it
    // turns away. amount blends it in: amount 0 freezes the shading at 1 everywhere, which shows the base color alone, a texture
    // with no light; amount 1 is the lit surface.
    public static (float nDotL, float lambert, float lit, float b) Brightness(Vector3 N, Vector3 L, float ka, float amount)
    {
        float nDotL = Vector3.Dot(N, L);
        float lambert = Mathf.Max(0f, nDotL);
        float lit = ka + (1f - ka) * lambert;
        float b = (1f - amount) + amount * lit;
        return (nDotL, lambert, lit, b);
    }
    #endregion

    #region Shade a pixel
    // One pixel of either picture, inside the circle: its normal, its texture coordinates, its base color, its brightness, and the
    // color: base color times brightness, in linear light, then encoded as sRGB codes 0 to 255 for the screen. The light is L,
    // the ambient floor ka, the shading amount amount, the sphere's turn spin, and the texture's name texture.
    public static int SrgbCode(float c)
    {
        float x = Mathf.Clamp(c, 0f, 1f);
        float s = x <= 0.0031308f ? 12.92f * x : 1.055f * Mathf.Pow(x, 1f / 2.4f) - 0.055f;
        return (int)Math.Round(255.0 * s, MidpointRounding.AwayFromZero);
    }
    public static (Vector3 N, Vector2 uv, Vector3 baseColor, float b, Vector3 color, int[] code) ShadePixel(string shape, float x, float y, Vector3 L, float ka, float amount, float spin, string texture)
    {
        Vector3 N = shape == "disk" ? DiskNormal(x, y) : SphereNormal(x, y);
        Vector2 uv = shape == "disk" ? DiskUV(x, y, spin) : SphereUV(N, spin);
        Vector3 baseColor = Albedo(texture, uv.x, uv.y);
        float b = Brightness(N, L, ka, amount).b;
        Vector3 color = baseColor * b;
        int[] code = { SrgbCode(color.x), SrgbCode(color.y), SrgbCode(color.z) };
        return (N, uv, baseColor, b, color, code);
    }
    #endregion

    #region Two pictures, pixel by pixel
    // renderPicture shades an n by n picture of [-1, 1] x [-1, 1], top row first, three codes per pixel; outside the circle it
    // is the background, code 0. countDifferent counts the pixels whose codes differ in any channel.
    public static int[] RenderPicture(string shape, Vector3 L, float ka, float amount, float spin, string texture, int n)
    {
        int[] codes = new int[n * n * 3];
        for (int row = 0; row < n; row++)
        {
            for (int col = 0; col < n; col++)
            {
                float x = -1f + (2f * col + 1f) / n;
                float y = 1f - (2f * row + 1f) / n;
                if (!InsideCircle(x, y)) continue;
                int[] code = ShadePixel(shape, x, y, L, ka, amount, spin, texture).code;
                int at = (row * n + col) * 3;
                codes[at] = code[0];
                codes[at + 1] = code[1];
                codes[at + 2] = code[2];
            }
        }
        return codes;
    }
    public static (int count, int total) CountDifferent(int[] a, int[] b)
    {
        int count = 0;
        int total = a.Length / 3;
        for (int i = 0; i < total; i++)
        {
            if (a[3 * i] != b[3 * i] || a[3 * i + 1] != b[3 * i + 1] || a[3 * i + 2] != b[3 * i + 2]) count++;
        }
        return (count, total);
    }
    #endregion

    #region The middle row
    // The brightness along the picture's middle row, y = 0, at n points from x = -1 to 1. The disk's normal never changes, so
    // neither does its brightness: one value. The sphere's normal turns from (-1, 0, 0) through (0, 0, 1) to (1, 0, 0) along
    // the row, and its brightness follows N . L.
    public static (float[] disk, float[] sphere, float diskSpread, float sphereLow, float sphereHigh) MiddleRow(Vector3 L, float ka, float amount, int n)
    {
        float[] disk = new float[n];
        float[] sphere = new float[n];
        for (int i = 0; i < n; i++)
        {
            float x = -1f + (2f * i) / (n - 1);
            disk[i] = Brightness(DiskNormal(x, 0f), L, ka, amount).b;
            sphere[i] = Brightness(SphereNormal(x, 0f), L, ka, amount).b;
        }
        float diskSpread = Mathf.Max(disk) - Mathf.Min(disk);
        float sphereLow = Mathf.Min(sphere);
        float sphereHigh = Mathf.Max(sphere);
        return (disk, sphere, diskSpread, sphereLow, sphereHigh);
    }
    #endregion

    #region An icosphere
    // The icosahedron's 12 vertices are the corners of three golden rectangles, pushed onto the unit sphere; its 20 triangles
    // wind counterclockwise seen from outside. subdivide splits each triangle into 4 at its edge midpoints and pushes the new
    // vertices onto the sphere; an edge's midpoint is made once and shared by the two triangles on that edge. A mesh is its
    // vertex list and its triangle list, three vertex indices each.
    public struct IcoMesh
    {
        public Vector3[] vertices;
        public int[][] triangles;
    }
    public static IcoMesh Icosahedron()
    {
        float p = (1f + Mathf.Sqrt(5f)) / 2f;
        Vector3[] raw = { new Vector3(-1, p, 0), new Vector3(1, p, 0), new Vector3(-1, -p, 0), new Vector3(1, -p, 0), new Vector3(0, -1, p), new Vector3(0, 1, p),
            new Vector3(0, -1, -p), new Vector3(0, 1, -p), new Vector3(p, 0, -1), new Vector3(p, 0, 1), new Vector3(-p, 0, -1), new Vector3(-p, 0, 1) };
        Vector3[] vertices = new Vector3[raw.Length];
        for (int i = 0; i < raw.Length; i++) vertices[i] = Normalize(raw[i]);
        int[][] triangles = { new[] { 0, 11, 5 }, new[] { 0, 5, 1 }, new[] { 0, 1, 7 }, new[] { 0, 7, 10 }, new[] { 0, 10, 11 }, new[] { 1, 5, 9 }, new[] { 5, 11, 4 },
            new[] { 11, 10, 2 }, new[] { 10, 7, 6 }, new[] { 7, 1, 8 }, new[] { 3, 9, 4 }, new[] { 3, 4, 2 }, new[] { 3, 2, 6 }, new[] { 3, 6, 8 }, new[] { 3, 8, 9 },
            new[] { 4, 9, 5 }, new[] { 2, 4, 11 }, new[] { 6, 2, 10 }, new[] { 8, 6, 7 }, new[] { 9, 8, 1 } };
        return new IcoMesh { vertices = vertices, triangles = triangles };
    }
    static int Midpoint(List<Vector3> vertices, Dictionary<long, int> made, int i, int j)
    {
        long key = i < j ? (long)i * 1000000L + j : (long)j * 1000000L + i;
        if (!made.ContainsKey(key))
        {
            made[key] = vertices.Count;
            vertices.Add(Normalize((vertices[i] + vertices[j]) * 0.5f));
        }
        return made[key];
    }
    public static IcoMesh Subdivide(Vector3[] oldVertices, int[][] oldTriangles)
    {
        List<Vector3> vertices = new List<Vector3>(oldVertices);
        List<int[]> triangles = new List<int[]>();
        Dictionary<long, int> made = new Dictionary<long, int>();
        foreach (int[] t in oldTriangles)
        {
            int ab = Midpoint(vertices, made, t[0], t[1]);
            int bc = Midpoint(vertices, made, t[1], t[2]);
            int ca = Midpoint(vertices, made, t[2], t[0]);
            triangles.Add(new[] { t[0], ab, ca });
            triangles.Add(new[] { t[1], bc, ab });
            triangles.Add(new[] { t[2], ca, bc });
            triangles.Add(new[] { ab, bc, ca });
        }
        return new IcoMesh { vertices = vertices.ToArray(), triangles = triangles.ToArray() };
    }
    #endregion

    #region Face normals and vertex normals
    // faceNormal is the cross product of two edges, normalized: one normal for the whole triangle, so the whole triangle gets one
    // brightness and the eye sees a flat facet. vertexNormals gives each vertex the sum of the (unnormalized, so area-weighted)
    // normals of the triangles around it, normalized. Shaded at the vertices and blended across each triangle, the brightness
    // changes inside a triangle, and the facets fade while the outline stays a polygon.
    public static Vector3 FaceNormal(Vector3 a, Vector3 b, Vector3 c)
    {
        Vector3 n = Vector3.Cross(b - a, c - a);
        return Normalize(n);
    }
    public static Vector3[] VertexNormals(Vector3[] vertices, int[][] triangles)
    {
        Vector3[] sums = new Vector3[vertices.Length];
        foreach (int[] t in triangles)
        {
            Vector3 a = vertices[t[0]];
            Vector3 areaNormal = Vector3.Cross(vertices[t[1]] - a, vertices[t[2]] - a);
            foreach (int i in t) sums[i] += areaNormal;
        }
        Vector3[] normals = new Vector3[sums.Length];
        for (int i = 0; i < sums.Length; i++) normals[i] = Normalize(sums[i]);
        return normals;
    }
    #endregion

    #region Bump or dent
    // A round bump standing out of a wall and a round dent pressed into it, seen straight on. Under the pixel (x, y) the bump's
    // normal is (x, y, z) and the dent's is (-x, -y, z), z = sqrt(1 - x^2 - y^2); off the circle it is the wall's, (0, 0, 1).
    // The light comes from angle degrees around the picture (90 is from above) and tilt degrees off the line of sight. Turning it
    // half a turn about the line of sight, (Lx, Ly, Lz) to (-Lx, -Ly, Lz), turns every N . L of the bump into the dent's: a bump
    // lit from below and a dent lit from above make the same picture.
    public static Vector3 LightInPicture(float angleDeg, float tiltDeg)
    {
        float a = angleDeg / Deg;
        float t = tiltDeg / Deg;
        return new Vector3(Mathf.Sin(t) * Mathf.Cos(a), Mathf.Sin(t) * Mathf.Sin(a), Mathf.Cos(t));
    }
    public static Vector3 TurnHalf(Vector3 L) { return new Vector3(-L.x, -L.y, L.z); }
    public static Vector3 WallNormal(float x, float y, bool dent)
    {
        if (!InsideCircle(x, y)) return new Vector3(0f, 0f, 1f);
        float z = Mathf.Sqrt(Mathf.Max(0f, 1f - x * x - y * y));
        float s = dent ? -1f : 1f;
        return new Vector3(s * x, s * y, z);
    }
    #endregion

    #region The wall, pixel by pixel
    // An n by n picture of one bump or dent with a margin of wall around it: the picture spans [-margin, margin] in x and y. The
    // wall is a gray of albedo 0.7, so a code is the same in all three channels.
    public static int[] RenderWall(bool dent, Vector3 L, float ka, int n, float margin)
    {
        int[] codes = new int[n * n * 3];
        for (int row = 0; row < n; row++)
        {
            for (int col = 0; col < n; col++)
            {
                float x = margin * (-1f + (2f * col + 1f) / n);
                float y = margin * (1f - (2f * row + 1f) / n);
                Vector3 N = WallNormal(x, y, dent);
                float b = Brightness(N, L, ka, 1f).b;
                int code = SrgbCode(0.7f * b);
                int at = (row * n + col) * 3;
                codes[at] = code;
                codes[at + 1] = code;
                codes[at + 2] = code;
            }
        }
        return codes;
    }
    #endregion
}
