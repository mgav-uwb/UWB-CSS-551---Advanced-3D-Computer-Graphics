// meshlab.js: a triangle mesh as data: reading and writing its files, its two arrays, edges and half-edges, winding, Euler's
// formula, normals, subdivision, sweeps, marching cubes, the vertex cache, smoothing and edge collapse. No three.js here:
// positions are arrays [x, y, z], triangles are arrays [a, b, c] of indices. scene.js draws it, and the course demo
// (lib/demos/mesh-lab.js) runs these same functions, so a value the demo prints beside a line of code is the value that line
// computed. No function changes its arguments.
// The same functions, line for line where the languages allow, are MeshLab.cs in ../unity/
// (lib/tests/programs/mesh-lab.test.mjs runs both on the same inputs and compares the numbers).

// #region Settings and vector helpers
// Below EPS a length or an area counts as zero. Unity's Vector3 has these operations built in.
export const EPS = 1e-6;

export function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
export function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
export function scale(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
export function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
export function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
export function length(a) { return Math.sqrt(dot(a, a)); }
export function normalize(a) {
  const l = length(a);
  return l > EPS ? scale(a, 1 / l) : [0, 0, 0];
}
function edgeKey(a, b) { return a * 67108864 + b; }
function undirectedKey(a, b) { return a < b ? edgeKey(a, b) : edgeKey(b, a); }
function numberText(x) { return String(Number(x.toFixed(6))); }
function pointText(p) { return numberText(p[0]) + ' ' + numberText(p[1]) + ' ' + numberText(p[2]); }
// #endregion

// #region Files: read an OBJ
// One record per line: "v x y z" and "f a b c ...". Indices count from 1, and a negative index counts back from the latest
// vertex. "f 3/1/2" also names a texture coordinate and a normal: only the position index is read here.
export function parseObj(text) {
  const positions = [];
  const faces = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts[0] === 'v') {
      positions.push([Number(parts[1]), Number(parts[2]), Number(parts[3])]);
    } else if (parts[0] === 'f') {
      const face = [];
      for (let k = 1; k < parts.length; k++) {
        const index = parseInt(parts[k], 10);
        face.push(index < 0 ? positions.length + index : index - 1);
      }
      faces.push(face);
    }
  }
  return { positions, faces };
}
// #endregion

// #region Files: read an OFF
// A header with the counts, then the vertices, then each face as its corner count and its indices, counting from 0.
export function parseOff(text) {
  const tokens = text.replace(/#[^\n]*/g, ' ').trim().split(/\s+/);
  let at = tokens[0].toUpperCase() === 'OFF' ? 1 : 0;
  const vertexCount = parseInt(tokens[at], 10);
  const faceCount = parseInt(tokens[at + 1], 10);
  at += 3;
  const positions = [];
  for (let i = 0; i < vertexCount; i++) {
    positions.push([Number(tokens[at]), Number(tokens[at + 1]), Number(tokens[at + 2])]);
    at += 3;
  }
  const faces = [];
  for (let i = 0; i < faceCount; i++) {
    const corners = parseInt(tokens[at], 10);
    const face = [];
    for (let k = 1; k <= corners; k++) face.push(parseInt(tokens[at + k], 10));
    faces.push(face);
    at += corners + 1;
  }
  return { positions, faces };
}
// #endregion

// #region Files: read an ASCII PLY
// The header declares the elements and their properties, so the positions are found by name. The vertex lines and the face
// lines follow, in the declared order. A binary PLY has the same header over packed numbers; it is not read here.
export function parsePly(text) {
  const lines = text.split('\n');
  let at = 0;
  let vertexCount = 0;
  let faceCount = 0;
  let element = '';
  const properties = [];
  while (at < lines.length) {
    const parts = lines[at].trim().split(/\s+/);
    at += 1;
    if (parts[0] === 'end_header') break;
    if (parts[0] === 'element') {
      element = parts[1];
      if (element === 'vertex') vertexCount = parseInt(parts[2], 10);
      if (element === 'face') faceCount = parseInt(parts[2], 10);
    }
    if (parts[0] === 'property' && element === 'vertex') properties.push(parts[parts.length - 1]);
  }
  const ix = properties.indexOf('x');
  const iy = properties.indexOf('y');
  const iz = properties.indexOf('z');
  const positions = [];
  for (let i = 0; i < vertexCount; i++) {
    const parts = lines[at + i].trim().split(/\s+/);
    positions.push([Number(parts[ix]), Number(parts[iy]), Number(parts[iz])]);
  }
  at += vertexCount;
  const faces = [];
  for (let i = 0; i < faceCount; i++) {
    const parts = lines[at + i].trim().split(/\s+/);
    const corners = parseInt(parts[0], 10);
    const face = [];
    for (let k = 1; k <= corners; k++) face.push(parseInt(parts[k], 10));
    faces.push(face);
  }
  return { positions, faces };
}
// #endregion

// #region Files: read an STL
// A triangle soup: every triangle lists its own three corners, so nothing is shared until the vertices are welded. The text form
// repeats "vertex x y z". The binary form is an 80-byte header, a 32-bit count, and 50 bytes per triangle: a normal, three
// corners, and two unused bytes.
export function parseStlText(text) {
  const positions = [];
  const faces = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].trim().split(/\s+/);
    if (parts[0] === 'vertex') positions.push([Number(parts[1]), Number(parts[2]), Number(parts[3])]);
    if (parts[0] === 'endloop') {
      const n = positions.length;
      faces.push([n - 3, n - 2, n - 1]);
    }
  }
  return { positions, faces };
}

export function parseStlBytes(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint32(80, true);
  const positions = [];
  const faces = [];
  for (let t = 0; t < count; t++) {
    const start = 84 + 50 * t + 12;
    for (let k = 0; k < 3; k++) {
      const at = start + 12 * k;
      positions.push([view.getFloat32(at, true), view.getFloat32(at + 4, true), view.getFloat32(at + 8, true)]);
    }
    faces.push([3 * t, 3 * t + 1, 3 * t + 2]);
  }
  return { positions, faces };
}
// #endregion

// #region Files: weld a soup
// Positions equal up to the tolerance become one vertex. This is how a soup becomes two arrays, and how the mesh gets its
// shared edges back.
export function weldVertices(positions, faces, tolerance) {
  const seen = new Map();
  const remap = [];
  const welded = [];
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    const key = Math.round(p[0] / tolerance) + ',' + Math.round(p[1] / tolerance) + ',' + Math.round(p[2] / tolerance);
    if (!seen.has(key)) {
      seen.set(key, welded.length);
      welded.push(p);
    }
    remap.push(seen.get(key));
  }
  const weldedFaces = [];
  for (let f = 0; f < faces.length; f++) {
    const face = [];
    for (let k = 0; k < faces[f].length; k++) face.push(remap[faces[f][k]]);
    weldedFaces.push(face);
  }
  return { positions: welded, faces: weldedFaces, removed: positions.length - welded.length };
}
// #endregion

// #region Two arrays: triangles from faces
// A file may store polygons. The GPU draws triangles, so a face of n corners becomes a fan of n - 2 triangles from its first
// corner, in the same winding. A concave polygon needs real triangulation; a fan assumes convex.
export function triangulate(faces) {
  const tris = [];
  for (let f = 0; f < faces.length; f++) {
    const face = faces[f];
    for (let k = 1; k < face.length - 1; k++) tris.push([face[0], face[k], face[k + 1]]);
  }
  return { tris, polygons: faces.length };
}
// #endregion

// #region Two arrays: soup against indexed
// A soup stores 3 corners of 12 bytes per triangle. Indexed triangles store each position once, plus three indices of 2 bytes, or
// 4 past 65,536 vertices. With about 2 triangles per vertex that is 72 bytes per vertex against 24: a factor of about 3.
export function storageBytes(vertexCount, triangleCount) {
  const soup = triangleCount * 3 * 12;
  const indexSize = vertexCount <= 65536 ? 2 : 4;
  const indexed = vertexCount * 12 + triangleCount * 3 * indexSize;
  const ratio = soup / indexed;
  return { soup, indexSize, indexed, ratio };
}
// #endregion

// #region Files: write an OBJ
// Text, one record per line, indices from 1. Readable everywhere, and slow to parse.
export function writeObj(positions, faces) {
  const lines = [];
  for (let i = 0; i < positions.length; i++) lines.push('v ' + pointText(positions[i]));
  for (let f = 0; f < faces.length; f++) {
    let line = 'f';
    for (let k = 0; k < faces[f].length; k++) line += ' ' + (faces[f][k] + 1);
    lines.push(line);
  }
  return lines.join('\n');
}
// #endregion

// #region Files: write an OFF
// The counts first, so a reader can allocate before it reads. Indices from 0.
export function writeOff(positions, faces) {
  const lines = ['OFF', positions.length + ' ' + faces.length + ' 0'];
  for (let i = 0; i < positions.length; i++) lines.push(pointText(positions[i]));
  for (let f = 0; f < faces.length; f++) lines.push(faces[f].length + ' ' + faces[f].join(' '));
  return lines.join('\n');
}
// #endregion

// #region Files: write an ASCII PLY
// A header that declares its own record layout, which is why scanners use the format: a vertex can carry color or confidence
// without changing the format.
export function writePly(positions, faces) {
  const lines = ['ply', 'format ascii 1.0', 'element vertex ' + positions.length, 'property float x', 'property float y',
    'property float z', 'element face ' + faces.length, 'property list uchar int vertex_indices', 'end_header'];
  for (let i = 0; i < positions.length; i++) lines.push(pointText(positions[i]));
  for (let f = 0; f < faces.length; f++) lines.push(faces[f].length + ' ' + faces[f].join(' '));
  return lines.join('\n');
}
// #endregion

// #region Files: write an STL
// A soup with a normal per triangle: no sharing, no indices. Each triangle takes 7 lines of text, or 50 bytes in binary. 3D
// printers read it.
export function writeStl(positions, tris) {
  const lines = ['solid mesh'];
  for (let t = 0; t < tris.length; t++) {
    const a = positions[tris[t][0]];
    const b = positions[tris[t][1]];
    const c = positions[tris[t][2]];
    const n = normalize(cross(sub(b, a), sub(c, a)));
    lines.push('facet normal ' + pointText(n), 'outer loop', 'vertex ' + pointText(a), 'vertex ' + pointText(b),
      'vertex ' + pointText(c), 'endloop', 'endfacet');
  }
  lines.push('endsolid mesh');
  return lines.join('\n');
}
// #endregion

// #region Files: glTF's description of the buffers
// JSON that describes binary arrays the GPU can upload without parsing. 5126 is float32 and 5123 is uint16 (5125 uint32); 34962
// marks vertex data and 34963 indices; mode 4 is a triangle list. min and max give a loader the bounding box.
export function writeGltf(positions, tris) {
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) {
    for (let k = 0; k < 3; k++) {
      low[k] = Math.min(low[k], positions[i][k]);
      high[k] = Math.max(high[k], positions[i][k]);
    }
  }
  const sizes = storageBytes(positions.length, tris.length);
  const indexType = sizes.indexSize === 2 ? 5123 : 5125;
  const positionBytes = positions.length * 12;
  const indexBytes = tris.length * 3 * sizes.indexSize;
  const lines = ['{', '  "asset": { "version": "2.0" },',
    '  "meshes": [{ "primitives": [{ "attributes": { "POSITION": 0 }, "indices": 1, "mode": 4 }] }],',
    '  "accessors": [',
    '    { "bufferView": 0, "componentType": 5126, "count": ' + positions.length + ', "type": "VEC3",',
    '      "min": [' + numberText(low[0]) + ', ' + numberText(low[1]) + ', ' + numberText(low[2]) + '],',
    '      "max": [' + numberText(high[0]) + ', ' + numberText(high[1]) + ', ' + numberText(high[2]) + '] },',
    '    { "bufferView": 1, "componentType": ' + indexType + ', "count": ' + (tris.length * 3) + ', "type": "SCALAR" }',
    '  ],', '  "bufferViews": [',
    '    { "buffer": 0, "byteOffset": 0, "byteLength": ' + positionBytes + ', "target": 34962 },',
    '    { "buffer": 0, "byteOffset": ' + positionBytes + ', "byteLength": ' + indexBytes + ', "target": 34963 }',
    '  ],', '  "buffers": [{ "byteLength": ' + (positionBytes + indexBytes) + ' }]', '}'];
  return lines.join('\n');
}
// #endregion

// #region Topology: the edge list
// The index array names triangles and never edges, so edges are found by visiting each triangle's three. An edge that appears
// once is on the boundary; twice, between two faces; more, the surface is non-manifold there. f1 = -1 means no second face.
export function edgeList(tris) {
  const index = new Map();
  const edges = [];
  let nonManifold = 0;
  for (let t = 0; t < tris.length; t++) {
    for (let k = 0; k < 3; k++) {
      const a = tris[t][k];
      const b = tris[t][(k + 1) % 3];
      const key = undirectedKey(a, b);
      if (!index.has(key)) {
        index.set(key, edges.length);
        edges.push([Math.min(a, b), Math.max(a, b), t, -1]);
      } else {
        const e = edges[index.get(key)];
        if (e[3] === -1) e[3] = t;
        else nonManifold += 1;
      }
    }
  }
  let boundary = 0;
  for (let i = 0; i < edges.length; i++) {
    if (edges[i][3] === -1) boundary += 1;
  }
  return { edges, boundary, nonManifold };
}
// #endregion

// #region Half-edges: build them
// Each triangle's three directed edges, numbered 3t, 3t + 1, 3t + 2. next stays in the face. twin is the same edge in the other
// direction, in the neighbor; a boundary half-edge has twin = -1. A consistently wound mesh has every twin.
export function buildHalfEdges(tris) {
  const from = [];
  const to = [];
  const face = [];
  const next = [];
  const twin = [];
  const byDirection = new Map();
  for (let t = 0; t < tris.length; t++) {
    for (let k = 0; k < 3; k++) {
      const a = tris[t][k];
      const b = tris[t][(k + 1) % 3];
      from.push(a);
      to.push(b);
      face.push(t);
      next.push(3 * t + (k + 1) % 3);
      twin.push(-1);
      byDirection.set(edgeKey(a, b), 3 * t + k);
    }
  }
  for (let h = 0; h < from.length; h++) {
    const other = byDirection.get(edgeKey(to[h], from[h]));
    if (other !== undefined) twin[h] = other;
  }
  return { from, to, face, next, twin };
}
// #endregion

// #region Half-edges: walk the ring of a vertex
// From a half-edge leaving v, next.next arrives back at v, and its twin leaves v again: one step around. On a closed surface the
// walk returns to its start, and the ring's length is the valence. On a boundary it stops at a missing twin, and the rest of the
// ring lies the other way, by twin then next.
export function vertexRing(he, start) {
  const ring = [he.to[start]];
  let h = start;
  let closed = false;
  for (let step = 0; step < he.from.length; step++) {
    const prev = he.next[he.next[h]];
    h = he.twin[prev];
    if (h === start) {
      closed = true;
      break;
    }
    if (h === -1) {
      ring.push(he.from[prev]);
      break;
    }
    ring.push(he.to[h]);
  }
  if (!closed) {
    h = start;
    for (let step = 0; step < he.from.length; step++) {
      const back = he.twin[h];
      if (back === -1) break;
      h = he.next[back];
      ring.unshift(he.to[h]);
    }
  }
  return { ring, closed, valence: ring.length };
}
// #endregion

// #region Topology: boundary loops
// The half-edges with no twin join up into closed loops, one per hole.
export function boundaryLoops(he) {
  const outgoing = new Map();
  for (let h = 0; h < he.from.length; h++) {
    if (he.twin[h] === -1) outgoing.set(he.from[h], h);
  }
  const used = new Set();
  const loops = [];
  for (let h = 0; h < he.from.length; h++) {
    if (he.twin[h] !== -1 || used.has(h)) continue;
    const loop = [];
    let at = h;
    while (at !== undefined && !used.has(at)) {
      used.add(at);
      loop.push(he.from[at]);
      at = outgoing.get(he.to[at]);
    }
    loops.push(loop);
  }
  return { loops, count: loops.length };
}
// #endregion

// #region Topology: Euler's formula
// V - E + F = 2C - 2g - b for C connected pieces, g handles and b boundary loops. Three counts and a subtraction test a mesh: a
// surprise in g or b means a hole or a crack. A vertex no triangle uses is not on the surface, so it is not counted.
export function eulerCheck(vertexCount, tris) {
  const parent = [];
  const usedVertex = [];
  for (let i = 0; i < vertexCount; i++) {
    parent.push(i);
    usedVertex.push(false);
  }
  function find(x) {
    let r = x;
    while (parent[r] !== r) {
      parent[r] = parent[parent[r]];
      r = parent[r];
    }
    return r;
  }
  for (let t = 0; t < tris.length; t++) {
    for (let k = 0; k < 3; k++) {
      usedVertex[tris[t][k]] = true;
      parent[find(tris[t][k])] = find(tris[t][(k + 1) % 3]);
    }
  }
  let V = 0;
  let components = 0;
  for (let i = 0; i < vertexCount; i++) {
    if (usedVertex[i]) {
      V += 1;
      if (find(i) === i) components += 1;
    }
  }
  const list = edgeList(tris);
  const E = list.edges.length;
  const F = tris.length;
  const chi = V - E + F;
  const loops = boundaryLoops(buildHalfEdges(tris)).count;
  const genus = (2 * components - chi - loops) / 2;
  return { V, E, F, chi, components, loops, genus, unreferenced: vertexCount - V, boundary: list.boundary, nonManifold: list.nonManifold };
}
// #endregion

// #region Topology: valence
// The number of edges at a vertex. From Euler, E is about 3V on a large closed mesh, so the average is about 6, and vertices of
// other valence are where subdivision and remeshing leave artifacts.
export function valenceOf(vertexCount, tris) {
  const edges = edgeList(tris).edges;
  const valence = [];
  for (let i = 0; i < vertexCount; i++) valence.push(0);
  for (let e = 0; e < edges.length; e++) {
    valence[edges[e][0]] += 1;
    valence[edges[e][1]] += 1;
  }
  let most = 0;
  let total = 0;
  let used = 0;
  for (let i = 0; i < vertexCount; i++) {
    most = Math.max(most, valence[i]);
    if (valence[i] > 0) {
      total += valence[i];
      used += 1;
    }
  }
  const histogram = [];
  for (let k = 0; k <= most; k++) histogram.push(0);
  for (let i = 0; i < vertexCount; i++) histogram[valence[i]] += 1;
  const mean = used > 0 ? total / used : 0;
  return { valence, histogram, mean };
}
// #endregion

// #region Winding: reverse a triangle
// Swap two indices. The positions do not move: only the order changes, so the cross product of the edges, and the side the
// triangle calls its front, reverse.
export function reverseTriangle(tris, t) {
  const before = tris[t];
  const after = [before[0], before[2], before[1]];
  const reversed = [];
  for (let i = 0; i < tris.length; i++) reversed.push(i === t ? after : tris[i]);
  return { before, after, tris: reversed };
}
// #endregion

// #region Winding: which side faces the eye
// A renderer culls on the sign of the projected triangle's area (OpenGL's default keeps counter-clockwise on screen). The same
// test in 3D: the normal from the winding, dotted with the arrow to the eye. Unity keeps clockwise on its left-handed axes, the
// mirror image of this rule, so the same numbers face the same way.
export function facesEye(a, b, c, eye) {
  const e1 = sub(b, a);
  const e2 = sub(c, a);
  const n = cross(e1, e2);
  const toEye = sub(eye, a);
  const s = dot(n, toEye);
  const front = s > 0;
  return { e1, e2, n, toEye, s, front };
}

export function screenArea(p0, p1, p2) {
  const area2 = (p1[0] - p0[0]) * (p2[1] - p0[1]) - (p1[1] - p0[1]) * (p2[0] - p0[0]);
  const ccw = area2 > 0;
  return { area2, ccw };
}
// #endregion

// #region Winding: is the mesh consistent
// In a consistently wound mesh, two triangles sharing an edge walk it in opposite directions. A directed edge that appears twice
// marks a neighbor wound the wrong way.
export function windingCheck(tris) {
  const counts = new Map();
  const bad = [];
  for (let t = 0; t < tris.length; t++) {
    for (let k = 0; k < 3; k++) {
      const a = tris[t][k];
      const b = tris[t][(k + 1) % 3];
      const key = edgeKey(a, b);
      const seen = counts.has(key) ? counts.get(key) : 0;
      if (seen === 1) bad.push([a, b]);
      counts.set(key, seen + 1);
    }
  }
  const consistent = bad.length === 0;
  return { bad, count: bad.length, consistent };
}
// #endregion

// #region Winding: repair it
// A flood across shared edges: each neighbor must walk the shared edge the other way, or it is flipped. Each connected piece
// keeps its first triangle's choice, so a whole piece can still be inside out. A Moebius strip has no consistent winding.
export function reorient(tris) {
  const faceCount = tris.length;
  const fixed = [];
  const visited = [];
  for (let t = 0; t < faceCount; t++) {
    fixed.push([tris[t][0], tris[t][1], tris[t][2]]);
    visited.push(false);
  }
  const facesOnEdge = new Map();
  for (let t = 0; t < faceCount; t++) {
    for (let k = 0; k < 3; k++) {
      const key = undirectedKey(tris[t][k], tris[t][(k + 1) % 3]);
      if (!facesOnEdge.has(key)) facesOnEdge.set(key, []);
      facesOnEdge.get(key).push(t);
    }
  }
  let flipped = 0;
  for (let seed = 0; seed < faceCount; seed++) {
    if (visited[seed]) continue;
    visited[seed] = true;
    const queue = [seed];
    for (let q = 0; q < queue.length; q++) {
      const t = queue[q];
      for (let k = 0; k < 3; k++) {
        const a = fixed[t][k];
        const b = fixed[t][(k + 1) % 3];
        const others = facesOnEdge.get(undirectedKey(a, b));
        for (let o = 0; o < others.length; o++) {
          const u = others[o];
          if (visited[u]) continue;
          visited[u] = true;
          queue.push(u);
          const f = fixed[u];
          if ((f[0] === a && f[1] === b) || (f[1] === a && f[2] === b) || (f[2] === a && f[0] === b)) {
            fixed[u] = [f[0], f[2], f[1]];
            flipped += 1;
          }
        }
      }
    }
  }
  return { tris: fixed, flipped };
}
// #endregion

// #region Normals: a face
// The cross product of two edges from one corner. Its direction comes from the winding, and its length is twice the area.
export function faceNormal(a, b, c) {
  const e1 = sub(b, a);
  const e2 = sub(c, a);
  const n = cross(e1, e2);
  const area = length(n) / 2;
  const nHat = normalize(n);
  return { e1, e2, n, area, nHat };
}
// #endregion

// #region Normals: Newell's polygon normal
// A polygon with more than three corners need not lie exactly in one plane, so no single cross product speaks for it. Summing the
// cross products of consecutive corners uses all of them. The length of the sum is twice the area projected along the normal.
export function newellNormal(points) {
  let n = [0, 0, 0];
  for (let i = 0; i < points.length; i++) {
    n = add(n, cross(points[i], points[(i + 1) % points.length]));
  }
  const area = length(n) / 2;
  const nHat = normalize(n);
  return { n, area, nHat };
}
// #endregion

// #region Normals: a vertex
// Sum the normals of the faces at a vertex, then normalize. How much each face counts is a choice: equally (uniform), by area (the
// un-normalized cross product), or by the angle the face makes at this corner, which does not change when a face is split.
export function vertexNormals(positions, tris, weighting) {
  const sums = [];
  for (let i = 0; i < positions.length; i++) sums.push([0, 0, 0]);
  for (let t = 0; t < tris.length; t++) {
    const tri = tris[t];
    const n = cross(sub(positions[tri[1]], positions[tri[0]]), sub(positions[tri[2]], positions[tri[0]]));
    const nHat = normalize(n);
    for (let k = 0; k < 3; k++) {
      const v = tri[k];
      let weighted = n;
      if (weighting === 'uniform') weighted = nHat;
      if (weighting === 'angle') {
        const u = sub(positions[tri[(k + 1) % 3]], positions[v]);
        const w = sub(positions[tri[(k + 2) % 3]], positions[v]);
        weighted = scale(nHat, Math.atan2(length(cross(u, w)), dot(u, w)));
      }
      sums[v] = add(sums[v], weighted);
    }
  }
  const normals = [];
  for (let i = 0; i < positions.length; i++) normals.push(normalize(sums[i]));
  return { normals };
}
// #endregion

// #region Normals: split at hard edges
// A vertex holds one normal, so a hard edge forces a split: one position, one vertex per smooth group. Two corners at a vertex join
// a group when their faces share an edge at this vertex and meet at less than the crease angle. A cube at 30 degrees has 24 vertices,
// not 8. Each group's normal is the area-weighted sum over its corners.
export function splitByCrease(positions, tris, creaseDeg) {
  const parent = [];
  for (let c = 0; c < tris.length * 3; c++) parent.push(c);
  function find(x) {
    let r = x;
    while (parent[r] !== r) {
      parent[r] = parent[parent[r]];
      r = parent[r];
    }
    return r;
  }
  const faceN = [];
  for (let t = 0; t < tris.length; t++) {
    faceN.push(cross(sub(positions[tris[t][1]], positions[tris[t][0]]), sub(positions[tris[t][2]], positions[tris[t][0]])));
  }
  function cornerOf(t, v) {
    return 3 * t + tris[t].indexOf(v);
  }
  const limit = Math.cos(creaseDeg * Math.PI / 180);
  const edges = edgeList(tris).edges;
  const hard = [];
  for (let e = 0; e < edges.length; e++) {
    const [a, b, f0, f1] = edges[e];
    if (f1 === -1) continue;
    const cosAngle = dot(normalize(faceN[f0]), normalize(faceN[f1]));
    if (cosAngle >= limit) {
      parent[find(cornerOf(f0, a))] = find(cornerOf(f1, a));
      parent[find(cornerOf(f0, b))] = find(cornerOf(f1, b));
    } else {
      hard.push([a, b]);
    }
  }
  const numberOf = new Map();
  const groupOfCorner = [];
  const sums = [];
  for (let c = 0; c < tris.length * 3; c++) {
    const root = find(c);
    if (!numberOf.has(root)) {
      numberOf.set(root, sums.length);
      sums.push([0, 0, 0]);
    }
    const g = numberOf.get(root);
    groupOfCorner.push(g);
    sums[g] = add(sums[g], faceN[Math.floor(c / 3)]);
  }
  const normals = [];
  for (let g = 0; g < sums.length; g++) normals.push(normalize(sums[g]));
  return { groupOfCorner, groups: sums.length, normals, hard };
}
// #endregion

// #region Build: an icosahedron
// Twelve vertices at the corners of three golden rectangles, twenty equilateral triangles, valence 5 everywhere.
export function icosahedron() {
  const t = (1 + Math.sqrt(5)) / 2;
  const positions = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]];
  const tris = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  return { positions, tris };
}
// #endregion

// #region Build: subdivide
// Each triangle becomes four, through a new vertex at each edge's midpoint, shared by the two triangles on that edge. F grows by 4,
// E by about 4, V by about 4; the old vertices keep their valence and every new one has valence 6. With a radius, every vertex is
// pushed onto the sphere: an icosahedron becomes an icosphere of 42, then 162 vertices.
export function subdivide(positions, tris, radius) {
  const points = positions.slice();
  const midpointOf = new Map();
  function midpoint(a, b) {
    const key = undirectedKey(a, b);
    if (!midpointOf.has(key)) {
      midpointOf.set(key, points.length);
      points.push(scale(add(positions[a], positions[b]), 0.5));
    }
    return midpointOf.get(key);
  }
  const finer = [];
  for (let t = 0; t < tris.length; t++) {
    const [a, b, c] = tris[t];
    const ab = midpoint(a, b);
    const bc = midpoint(b, c);
    const ca = midpoint(c, a);
    finer.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
  }
  if (radius > 0) {
    for (let i = 0; i < points.length; i++) points[i] = scale(normalize(points[i]), radius);
  }
  return { positions: points, tris: finer };
}
// #endregion

// #region Build: a surface of revolution
// A profile of (r, y) points, rotated about y in S steps. Row i and column j give a vertex; each quad gives two triangles, wound
// outward. A profile point on the axis (r = 0) makes a whole ring of copies of one position: S triangles there have zero area and
// no normal. Collapsing the ring to one vertex removes them.
export function surfaceOfRevolution(profile, segments, collapse) {
  const positions = [];
  const rows = [];
  for (let i = 0; i < profile.length; i++) {
    const r = profile[i][0];
    const y = profile[i][1];
    const row = [];
    if (collapse && Math.abs(r) < EPS) {
      positions.push([0, y, 0]);
      for (let j = 0; j < segments; j++) row.push(positions.length - 1);
    } else {
      for (let j = 0; j < segments; j++) {
        const angle = 2 * Math.PI * j / segments;
        row.push(positions.length);
        positions.push([r * Math.sin(angle), y, r * Math.cos(angle)]);
      }
    }
    rows.push(row);
  }
  const tris = [];
  let degenerate = 0;
  for (let i = 0; i + 1 < rows.length; i++) {
    for (let j = 0; j < segments; j++) {
      const k = (j + 1) % segments;
      const candidates = [[rows[i][j], rows[i][k], rows[i + 1][k]], [rows[i][j], rows[i + 1][k], rows[i + 1][j]]];
      for (let c = 0; c < 2; c++) {
        const tri = candidates[c];
        if (tri[0] === tri[1] || tri[1] === tri[2] || tri[2] === tri[0]) continue;
        if (faceNormal(positions[tri[0]], positions[tri[1]], positions[tri[2]]).area < EPS) degenerate += 1;
        tris.push(tri);
      }
    }
  }
  return { positions, tris, degenerate };
}
// #endregion

// #region Build: one marching cube
// Eight values on a cube's corners, inside where the value passes iso: 256 cases. Each edge with one end inside is crossed, at the
// fraction t that interpolates to iso. A lookup table lists the crossed edges' polygon for each case; here each case's polygon is
// traced instead: on each cube face, a segment cuts off each run of inside corners, and the segments join into closed loops.
const CUBE_CORNERS = [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]];
const CUBE_EDGES = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
const CUBE_FACES = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [3, 0, 4, 7], [1, 2, 6, 5]];

function edgeBetween(a, b) {
  for (let e = 0; e < 12; e++) {
    if ((CUBE_EDGES[e][0] === a && CUBE_EDGES[e][1] === b) || (CUBE_EDGES[e][0] === b && CUBE_EDGES[e][1] === a)) return e;
  }
  return -1;
}

export function cubeCorners() {
  return CUBE_CORNERS;
}

export function marchingCell(values, iso) {
  let caseIndex = 0;
  for (let c = 0; c < 8; c++) {
    if (values[c] > iso) caseIndex += 1 << c;
  }
  const crossed = [];
  const points = [];
  for (let e = 0; e < 12; e++) {
    const a = CUBE_EDGES[e][0];
    const b = CUBE_EDGES[e][1];
    if ((values[a] > iso) !== (values[b] > iso)) {
      const t = (iso - values[a]) / (values[b] - values[a]);
      crossed.push(e);
      points.push(add(CUBE_CORNERS[a], scale(sub(CUBE_CORNERS[b], CUBE_CORNERS[a]), t)));
    }
  }
  const nextEdge = [];
  for (let e = 0; e < 12; e++) nextEdge.push(-1);
  for (let f = 0; f < 6; f++) {
    const corners = CUBE_FACES[f];
    let enter = -1;
    for (let start = 0; start < 8; start++) {
      const c0 = corners[start % 4];
      const c1 = corners[(start + 1) % 4];
      const edge = edgeBetween(c0, c1);
      if (!(values[c0] > iso) && values[c1] > iso) enter = edge;
      if (values[c0] > iso && !(values[c1] > iso) && enter !== -1) {
        nextEdge[enter] = edge;
        enter = -1;
      }
    }
  }
  const loops = [];
  const visited = [];
  for (let e = 0; e < 12; e++) visited.push(false);
  for (let e = 0; e < 12; e++) {
    if (nextEdge[e] === -1 || visited[e]) continue;
    const loop = [];
    let at = e;
    while (!visited[at]) {
      visited[at] = true;
      loop.push(at);
      at = nextEdge[at];
    }
    loops.push(loop);
  }
  const triangles = [];
  for (let l = 0; l < loops.length; l++) {
    for (let k = 1; k + 1 < loops[l].length; k++) triangles.push([loops[l][0], loops[l][k], loops[l][k + 1]]);
  }
  return { caseIndex, crossed, points, loops, triangles };
}
// #endregion

// #region Build: march a grid
// Every cube of a grid, with the vertices on shared grid edges merged, so the result is one connected mesh. n cubes on a side,
// (n + 1) values on a side, stored x fastest. A field that closes inside the grid gives a closed surface.
export function fieldValue(kind, p) {
  if (kind === 'torus') {
    const ring = Math.sqrt(p[0] * p[0] + p[2] * p[2]) - 1.2;
    return 0.55 - Math.sqrt(ring * ring + p[1] * p[1]);
  }
  if (kind === 'blobs') {
    const a = sub(p, [-0.8, 0, 0]);
    const b = sub(p, [0.8, 0.2, 0]);
    return 0.9 / (dot(a, a) + 0.1) + 0.9 / (dot(b, b) + 0.1) - 1;
  }
  return 1.5 - length(p);
}

export function marchGrid(kind, n, iso, half) {
  const step = 2 * half / n;
  const side = n + 1;
  const values = [];
  for (let k = 0; k < side; k++) {
    for (let j = 0; j < side; j++) {
      for (let i = 0; i < side; i++) values.push(fieldValue(kind, [-half + i * step, -half + j * step, -half + k * step]));
    }
  }
  const positions = [];
  const tris = [];
  const vertexOnEdge = new Map();
  let cellsCrossed = 0;
  for (let k = 0; k < n; k++) {
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const ids = [];
        const cell = [];
        for (let c = 0; c < 8; c++) {
          const id = (i + CUBE_CORNERS[c][0]) + side * (j + CUBE_CORNERS[c][1]) + side * side * (k + CUBE_CORNERS[c][2]);
          ids.push(id);
          cell.push(values[id]);
        }
        const result = marchingCell(cell, iso);
        if (result.triangles.length > 0) cellsCrossed += 1;
        for (let t = 0; t < result.triangles.length; t++) {
          const tri = [];
          for (let m = 0; m < 3; m++) {
            const e = result.triangles[t][m];
            const key = undirectedKey(ids[CUBE_EDGES[e][0]], ids[CUBE_EDGES[e][1]]);
            if (!vertexOnEdge.has(key)) {
              vertexOnEdge.set(key, positions.length);
              const local = result.points[result.crossed.indexOf(e)];
              positions.push([-half + (i + local[0]) * step, -half + (j + local[1]) * step, -half + (k + local[2]) * step]);
            }
            tri.push(vertexOnEdge.get(key));
          }
          tris.push(tri);
        }
      }
    }
  }
  return { positions, tris, cellsCrossed };
}
// #endregion

// #region Cache: count the misses
// A GPU keeps the last few transformed vertices in a first-in, first-out cache. A vertex found there costs no shader run. The measure
// is ACMR: misses per triangle. 3 is the worst; the number of vertices over the number of triangles is the best possible.
export function cacheMisses(tris, size) {
  const cache = [];
  const perTriangle = [];
  let misses = 0;
  for (let t = 0; t < tris.length; t++) {
    let missesHere = 0;
    for (let k = 0; k < 3; k++) {
      if (cache.indexOf(tris[t][k]) === -1) {
        missesHere += 1;
        cache.push(tris[t][k]);
        if (cache.length > size) cache.shift();
      }
    }
    perTriangle.push(missesHere);
    misses += missesHere;
  }
  const acmr = tris.length > 0 ? misses / tris.length : 0;
  return { misses, acmr, perTriangle, cache };
}
// #endregion

// #region Cache: shuffle the triangles
// The worst realistic order, with a seeded generator (Park-Miller) so both tracks agree. The triangles and the picture are unchanged.
export function shuffleTriangles(tris, seed) {
  const order = tris.slice();
  let state = seed;
  for (let i = order.length - 1; i > 0; i--) {
    state = state * 48271 % 2147483647;
    const j = state % (i + 1);
    const swap = order[i];
    order[i] = order[j];
    order[j] = swap;
  }
  return order;
}
// #endregion

// #region Cache: reorder the triangles
// Tipsify (Sander, Nehab and Barczak, 2007): emit every triangle around a fan vertex, then move to a neighboring vertex that is still
// in the cache and has few triangles left. Linear time, and the result is close to the bound for any cache of about k entries.
export function tipsify(tris, vertexCount, k) {
  const adjacent = [];
  const live = [];
  const stamp = [];
  for (let v = 0; v < vertexCount; v++) {
    adjacent.push([]);
    live.push(0);
    stamp.push(0);
  }
  for (let t = 0; t < tris.length; t++) {
    for (let c = 0; c < 3; c++) {
      adjacent[tris[t][c]].push(t);
      live[tris[t][c]] += 1;
    }
  }
  const emitted = [];
  for (let t = 0; t < tris.length; t++) emitted.push(false);
  const order = [];
  const stack = [];
  let fan = 0;
  while (fan < vertexCount && live[fan] === 0) fan += 1;
  let time = k + 1;
  let cursor = fan + 1;
  while (fan >= 0 && fan < vertexCount) {
    const candidates = [];
    for (let i = 0; i < adjacent[fan].length; i++) {
      const t = adjacent[fan][i];
      if (emitted[t]) continue;
      emitted[t] = true;
      order.push(tris[t]);
      for (let c = 0; c < 3; c++) {
        const v = tris[t][c];
        live[v] -= 1;
        stack.push(v);
        if (candidates.indexOf(v) === -1) candidates.push(v);
        if (time - stamp[v] > k) {
          stamp[v] = time;
          time += 1;
        }
      }
    }
    let best = -1;
    let bestPriority = -1;
    for (let i = 0; i < candidates.length; i++) {
      const v = candidates[i];
      if (live[v] <= 0) continue;
      const priority = time - stamp[v] + 2 * live[v] <= k ? time - stamp[v] : 0;
      if (priority > bestPriority) {
        bestPriority = priority;
        best = v;
      }
    }
    while (best === -1 && stack.length > 0) {
      const v = stack.pop();
      if (live[v] > 0) best = v;
    }
    while (best === -1 && cursor < vertexCount) {
      if (live[cursor] > 0) best = cursor;
      cursor += 1;
    }
    fan = best;
  }
  return order;
}
// #endregion

// #region Smoothing: one Laplacian step
// Move each vertex a fraction lambda toward the average of its neighbors. Noise goes, and so does size: on a convex shape every vertex
// moves inward. Taubin's fix (1995) follows each step with a negative one, mu slightly larger in size than lambda, and the shape holds.
export function neighborsOf(vertexCount, tris) {
  const neighbors = [];
  for (let v = 0; v < vertexCount; v++) neighbors.push([]);
  for (let t = 0; t < tris.length; t++) {
    for (let k = 0; k < 3; k++) {
      const a = tris[t][k];
      const b = tris[t][(k + 1) % 3];
      if (neighbors[a].indexOf(b) === -1) neighbors[a].push(b);
      if (neighbors[b].indexOf(a) === -1) neighbors[b].push(a);
    }
  }
  return neighbors;
}

export function laplacianStep(positions, neighbors, lambda) {
  const moved = [];
  for (let v = 0; v < positions.length; v++) {
    let mean = [0, 0, 0];
    for (let i = 0; i < neighbors[v].length; i++) mean = add(mean, positions[neighbors[v][i]]);
    const count = neighbors[v].length;
    if (count > 0) mean = scale(mean, 1 / count);
    moved.push(count > 0 ? add(positions[v], scale(sub(mean, positions[v]), lambda)) : positions[v]);
  }
  return moved;
}

export function meanRadius(positions) {
  let total = 0;
  for (let v = 0; v < positions.length; v++) total += length(positions[v]);
  return positions.length > 0 ? total / positions.length : 0;
}
// #endregion

// #region Simplify: the quadric of an edge
// A plane's error at p is the squared distance, (n . p + d)^2, a quadratic in p, stored as the 10 numbers of a symmetric 4 x 4 matrix.
// The planes of the faces touching either end of an edge add up to one quadric. Its minimum, where a 3 x 3 system solves, is the
// best place for the merged vertex.
export function planeQuadric(a, b, c) {
  const n = normalize(cross(sub(b, a), sub(c, a)));
  const d = -dot(n, a);
  return [n[0] * n[0], n[0] * n[1], n[0] * n[2], n[0] * d, n[1] * n[1], n[1] * n[2], n[1] * d, n[2] * n[2], n[2] * d, d * d];
}

export function quadricError(q, p) {
  return q[0] * p[0] * p[0] + 2 * q[1] * p[0] * p[1] + 2 * q[2] * p[0] * p[2] + 2 * q[3] * p[0]
    + q[4] * p[1] * p[1] + 2 * q[5] * p[1] * p[2] + 2 * q[6] * p[1]
    + q[7] * p[2] * p[2] + 2 * q[8] * p[2] + q[9];
}

export function edgeCost(positions, tris, a, b) {
  const q = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let faces = 0;
  for (let t = 0; t < tris.length; t++) {
    const tri = tris[t];
    if (tri.indexOf(a) === -1 && tri.indexOf(b) === -1) continue;
    const plane = planeQuadric(positions[tri[0]], positions[tri[1]], positions[tri[2]]);
    for (let i = 0; i < 10; i++) q[i] += plane[i];
    faces += 1;
  }
  const mid = scale(add(positions[a], positions[b]), 0.5);
  const atA = quadricError(q, positions[a]);
  const atB = quadricError(q, positions[b]);
  const atMid = quadricError(q, mid);
  // Cramer's rule on the 3 x 3 system: the gradient of the quadric is zero at its minimum
  const det = q[0] * (q[4] * q[7] - q[5] * q[5]) - q[1] * (q[1] * q[7] - q[5] * q[2]) + q[2] * (q[1] * q[5] - q[4] * q[2]);
  let best = atMid < atA && atMid < atB ? mid : (atA < atB ? positions[a] : positions[b]);
  if (Math.abs(det) > 1e-6) {
    const r = [-q[3], -q[6], -q[8]];
    best = [
      (r[0] * (q[4] * q[7] - q[5] * q[5]) - q[1] * (r[1] * q[7] - q[5] * r[2]) + q[2] * (r[1] * q[5] - q[4] * r[2])) / det,
      (q[0] * (r[1] * q[7] - q[5] * r[2]) - r[0] * (q[1] * q[7] - q[5] * q[2]) + q[2] * (q[1] * r[2] - r[1] * q[2])) / det,
      (q[0] * (q[4] * r[2] - r[1] * q[5]) - q[1] * (q[1] * r[2] - r[1] * q[2]) + r[0] * (q[1] * q[5] - q[4] * q[2])) / det,
    ];
  }
  const cost = quadricError(q, best);
  return { q, faces, atA, atB, atMid, best, cost };
}
// #endregion

// #region Simplify: collapse an edge
// b merges into a, at position p. The two triangles on the edge lose their area and go, and b's other triangles now use a. V falls by
// 1, E by 3, F by 2, so V - E + F does not change.
export function collapseEdge(positions, tris, a, b, p) {
  const moved = positions.slice();
  moved[a] = p;
  const kept = [];
  for (let t = 0; t < tris.length; t++) {
    const tri = [tris[t][0] === b ? a : tris[t][0], tris[t][1] === b ? a : tris[t][1], tris[t][2] === b ? a : tris[t][2]];
    if (tri[0] !== tri[1] && tri[1] !== tri[2] && tri[2] !== tri[0]) kept.push(tri);
  }
  return { positions: moved, tris: kept, removed: tris.length - kept.length };
}

// A collapse keeps the surface a surface only if the two ends share exactly the neighbors on the edge's own faces.
export function linkCondition(neighbors, a, b, facesOnEdge) {
  let shared = 0;
  for (let i = 0; i < neighbors[a].length; i++) {
    if (neighbors[b].indexOf(neighbors[a][i]) !== -1) shared += 1;
  }
  return shared === facesOnEdge;
}

export function compactVertices(positions, tris) {
  const remap = [];
  for (let v = 0; v < positions.length; v++) remap.push(-1);
  const kept = [];
  const remapped = [];
  for (let t = 0; t < tris.length; t++) {
    const tri = [];
    for (let k = 0; k < 3; k++) {
      const v = tris[t][k];
      if (remap[v] === -1) {
        remap[v] = kept.length;
        kept.push(positions[v]);
      }
      tri.push(remap[v]);
    }
    remapped.push(tri);
  }
  return { positions: kept, tris: remapped };
}
// #endregion

// #region Simplify: the cheapest collapse
// The greedy step of quadric simplification: the edge whose merged vertex adds the least squared distance, among those that pass the
// link condition. A real simplifier keeps the costs in a priority queue; here they are all recomputed, which is fine at this size.
export function cheapestCollapse(positions, tris) {
  // a tetrahedron is the smallest closed surface: collapsing one of its edges would leave two triangles back to back
  if (tris.length <= 4) return { a: -1, b: -1, cost: 0, point: [0, 0, 0] };
  const list = edgeList(tris).edges;
  const neighbors = neighborsOf(positions.length, tris);
  let bestEdge = -1;
  let bestCost = Infinity;
  let bestPoint = [0, 0, 0];
  for (let e = 0; e < list.length; e++) {
    const [a, b, , f1] = list[e];
    if (!linkCondition(neighbors, a, b, f1 === -1 ? 1 : 2)) continue;
    const c = edgeCost(positions, tris, a, b);
    if (c.cost < bestCost) {
      bestCost = c.cost;
      bestEdge = e;
      bestPoint = c.best;
    }
  }
  const a = bestEdge === -1 ? -1 : list[bestEdge][0];
  const b = bestEdge === -1 ? -1 : list[bestEdge][1];
  return { a, b, cost: bestCost, point: bestPoint };
}
// #endregion
