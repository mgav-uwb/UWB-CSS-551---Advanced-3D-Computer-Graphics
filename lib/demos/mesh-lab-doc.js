// mesh-lab-doc: the mesh the mesh-lab demo is working on. It holds the original file's text, the two arrays the text parses to, and every
// result derived from them, computed once per edit by the program the demo runs (lib/programs/mesh-lab/webgl/meshlab.js). No drawing and no
// DOM, so the views can be tested without a browser.
import * as ML from '../programs/mesh-lab/webgl/meshlab.js';

// ---------------------------------------------------------------- the built-in meshes, as the files they would be

const header = (name, positions, faces) => `# ${name}: ${positions.length} vertices, ${faces.length} faces\n`;

/** a convex shape's faces, each turned to look away from the middle */
function outward(positions, tris) {
  const mid = ML.scale(positions.reduce((s, p) => ML.add(s, p), [0, 0, 0]), 1 / positions.length);
  return tris.map(([a, b, c]) => {
    const n = ML.faceNormal(positions[a], positions[b], positions[c]).n;
    return ML.dot(n, ML.sub(positions[a], mid)) >= 0 ? [a, b, c] : [a, c, b];
  });
}

function asObj(name, positions, faces) {
  return header(name, positions, faces) + ML.writeObj(positions, faces);
}

function gridText(n, span) {
  const positions = [], faces = [], id = (r, c) => r * (n + 1) + c;
  for (let r = 0; r <= n; r++) for (let c = 0; c <= n; c++) positions.push([-span + (2 * span * c) / n, 0, -span + (2 * span * r) / n]);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) faces.push([id(r, c), id(r + 1, c), id(r, c + 1)], [id(r, c + 1), id(r + 1, c), id(r + 1, c + 1)]);
  return asObj(`grid ${n} x ${n}, row-major`, positions, faces);
}

function torusText(R, S) {
  const positions = [], faces = [], id = (i, j) => ((i + R) % R) * S + ((j + S) % S);
  for (let i = 0; i < R; i++) for (let j = 0; j < S; j++) {
    const u = (2 * Math.PI * i) / R, v = (2 * Math.PI * j) / S, rho = 1.5 + 0.6 * Math.cos(v);
    positions.push([rho * Math.sin(u), 0.6 * Math.sin(v), rho * Math.cos(u)]);
  }
  for (let i = 0; i < R; i++) for (let j = 0; j < S; j++) faces.push([id(i, j), id(i + 1, j), id(i + 1, j + 1)], [id(i, j), id(i + 1, j + 1), id(i, j + 1)]);
  return asObj('torus, one hole through it', positions, faces);
}

function icosphereText(level) {
  let { positions, tris } = ML.icosahedron();
  const R = ML.length(positions[0]);
  for (let i = 0; i < level; i++) ({ positions, tris } = ML.subdivide(positions, tris, R));
  return asObj(`icosphere, ${level} subdivisions of the icosahedron`, positions, tris);
}

const CUBE = { positions: [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]],
  faces: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [3, 0, 4, 7]] };
const ICO = ML.icosahedron();
const TET = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
const OCT = [[1.6, 0, 0], [-1.6, 0, 0], [0, 1.6, 0], [0, -1.6, 0], [0, 0, 1.6], [0, 0, -1.6]];
const OCT_F = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]];

/** the deck's lifted 2 x 2 grid, as its OBJ slide prints it */
const GRID_2 = `# the lifted 2 x 2 grid of the lecture
v -1.5 0 -1.5
v 0 0 -1.5
v 1.5 0 -1.5
v -1.5 0 0
v 0 0.4 0
v 1.5 0 0
v -1.5 0 1.5
v 0 0 1.5
v 1.5 0 1.5
f 1 4 2
f 2 4 5
f 2 5 3
f 3 5 6
f 4 7 5
f 5 7 8
f 5 8 6
f 6 8 9`;

export const BUILTINS = [
  { id: 'icosahedron', label: 'icosahedron', format: 'obj', text: () => asObj('icosahedron', ICO.positions, ICO.tris) },
  { id: 'tetrahedron', label: 'tetrahedron', format: 'obj', text: () => asObj('tetrahedron', TET, outward(TET, [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]])) },
  { id: 'octahedron', label: 'octahedron', format: 'obj', text: () => asObj('octahedron', OCT, OCT_F) },
  { id: 'cube', label: 'cube (quads)', format: 'obj', text: () => asObj('cube with quad faces', CUBE.positions, CUBE.faces) },
  { id: 'stl-cube', label: 'cube (STL, a soup)', format: 'stl', text: () => ML.writeStl(CUBE.positions, ML.triangulate(CUBE.faces).tris) },
  { id: 'open-box', label: 'open box', format: 'obj', text: () => asObj('box with no lid: one boundary loop', CUBE.positions, CUBE.faces.filter((_, i) => i !== 3)) },
  { id: 'triangle', label: 'one triangle', format: 'obj', text: () => asObj('one triangle', [[-1.5, -1, 0], [1.5, -1, 0], [0, 1.6, 0]], [[0, 1, 2]]) },
  { id: 'grid', label: '2 x 2 grid (lecture)', format: 'obj', text: () => GRID_2 },
  { id: 'grid10', label: '10 x 10 grid', format: 'obj', text: () => gridText(10, 2.2) },
  { id: 'icosphere1', label: 'icosphere, 80 faces', format: 'obj', text: () => icosphereText(1) },
  { id: 'icosphere2', label: 'icosphere, 320 faces', format: 'obj', text: () => icosphereText(2) },
  { id: 'torus', label: 'torus', format: 'obj', text: () => torusText(24, 12) },
  { id: 'teapot', label: 'teapot', model: 'teapot', format: 'obj' },
  { id: 'bunny0', label: 'bunny, 868 triangles', model: 'bunny', lod: 'l0', format: 'obj' },
  { id: 'bunny3', label: 'bunny, 69,451 triangles', model: 'bunny', lod: 'l3', format: 'obj' },
];

/** which format a file is, from its name and, for STL, its bytes */
export function detectFormat(name, bytes) {
  const ext = (name.split('.').pop() || '').toLowerCase();
  if (ext === 'stl') {
    if (bytes && bytes.byteLength >= 84) {
      const count = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(80, true);
      if (84 + 50 * count === bytes.byteLength) return 'stl-binary';
    }
    return 'stl';
  }
  if (ext === 'off' || ext === 'ply' || ext === 'obj') return ext;
  return 'obj';
}

const READERS = { obj: ML.parseObj, off: ML.parseOff, ply: ML.parsePly, stl: ML.parseStlText };

/** parse a file's text, reporting what is wrong with it in words instead of throwing */
export function readMesh(format, text) {
  if (format === 'ply' && !/format\s+ascii/.test(text)) return { error: 'This PLY file is binary. Save it as ASCII PLY, or as OBJ.' };
  let parsed;
  try {
    parsed = READERS[format](text);
  } catch (e) {
    return { error: `Could not read it as ${format.toUpperCase()}: ${e.message}` };
  }
  return checkMesh(parsed);
}

export function checkMesh(parsed) {
  const { positions, faces } = parsed;
  if (positions.some((p) => p.some((x) => !Number.isFinite(x)))) return { error: 'A vertex has a coordinate that is not a number.' };
  for (let f = 0; f < faces.length; f++) {
    if (faces[f].length < 3) return { error: `Face ${f} has fewer than 3 corners.` };
    for (const v of faces[f]) {
      if (!Number.isInteger(v) || v < 0 || v >= positions.length) return { error: `Face ${f} names vertex ${v}, and the file has ${positions.length} vertices (0 to ${positions.length - 1}).` };
    }
  }
  if (positions.length === 0 || faces.length === 0) return { error: 'No vertices or no faces found.' };
  return parsed;
}

// ---------------------------------------------------------------- the document

export class MeshDoc {
  constructor() {
    this.version = 0;
    this.loadText('icosahedron', 'obj', BUILTINS[0].text(), 'icosahedron');
  }

  /** load a file's text; returns an error message, or null */
  loadText(name, format, text, builtinId = null) {
    const read = readMesh(format, text);
    if (read.error) return read.error;
    this.install(name, format, text, read, builtinId);
    return null;
  }

  install(name, format, text, parsed, builtinId = null) {
    this.name = name;
    this.format = format;
    this.source = text;
    this.builtinId = builtinId;
    let { positions, faces } = parsed;
    this.fileVertices = positions.length;
    this.welded = 0;
    if (format === 'stl' || format === 'stl-binary') {
      const w = ML.weldVertices(positions, faces, 1e-5);
      positions = w.positions;
      faces = w.faces;
      this.welded = w.removed;
    }
    this.original = { positions, faces };
    this.reset();
  }

  /** back to what the file said, undoing every flip, deletion and collapse */
  reset() {
    const { positions, faces } = this.original;
    const fit = fitToView(positions);
    this.drawScale = fit.scale;
    this.drawCenter = fit.center;
    this.positions = fit.positions;
    this.faces = faces;
    const t = ML.triangulate(faces);
    this.tris = t.tris;
    this.triFace = [];
    faces.forEach((f, i) => { for (let k = 1; k < f.length - 1; k++) this.triFace.push(i); });
    this.edited = false;
    this.touch();
  }

  /** the mesh changed: everything derived is stale */
  touch() {
    this.version += 1;
    this.memo = new Map();
  }

  /** an edit in place: the triangles, and optionally the positions, after an operation */
  edit(tris, positions = this.positions) {
    this.tris = tris;
    this.positions = positions;
    this.faces = tris;                 // after an edit the mesh is triangles
    this.triFace = tris.map((_, i) => i);
    this.edited = true;
    this.touch();
  }

  /** a value computed at most once per edit */
  get(key, make) {
    if (!this.memo.has(key)) this.memo.set(key, make());
    return this.memo.get(key);
  }

  get edges() { return this.get('edges', () => ML.edgeList(this.tris)); }
  get he() { return this.get('he', () => ML.buildHalfEdges(this.tris)); }
  get euler() { return this.get('euler', () => ML.eulerCheck(this.positions.length, this.tris)); }
  get loops() { return this.get('loops', () => ML.boundaryLoops(this.he)); }
  get valence() { return this.get('valence', () => ML.valenceOf(this.positions.length, this.tris)); }
  get winding() { return this.get('winding', () => ML.windingCheck(this.tris)); }
  get bytes() { return this.get('bytes', () => ML.storageBytes(this.positions.length, this.tris.length)); }
  /** which faces touch each vertex */
  get cornersOf() {
    return this.get('cornersOf', () => {
      const out = this.positions.map(() => []);
      this.tris.forEach((t, i) => t.forEach((v) => out[v].push(i)));
      return out;
    });
  }
  /** a drawn point in the file's own coordinates */
  filePoint(p) { return ML.add(ML.scale(p, 1 / this.drawScale), this.drawCenter); }

  /** the mesh in a named text format, in the file's own coordinates, not the ones it was fit to the view with */
  text(format) {
    return this.get(`text:${format}`, () => {
      const positions = this.positions.map((p) => this.filePoint(p));
      if (format === 'obj') return ML.writeObj(positions, this.faces);
      if (format === 'off') return ML.writeOff(positions, this.faces);
      if (format === 'ply') return ML.writePly(positions, this.faces);
      if (format === 'stl') return ML.writeStl(positions, this.tris);
      return ML.writeGltf(positions, this.tris);
    });
  }
}

/** every mesh is drawn at about the same size: a file in millimeters and one in meters both fill the view */
export function fitToView(positions) {
  let radius = 0;
  for (const p of positions) radius = Math.max(radius, ML.length(p));
  if (radius >= 1 && radius <= 3.2) return { positions, scale: 1, center: [0, 0, 0] };
  const low = [Infinity, Infinity, Infinity], high = [-Infinity, -Infinity, -Infinity];
  for (const p of positions) for (let k = 0; k < 3; k++) { low[k] = Math.min(low[k], p[k]); high[k] = Math.max(high[k], p[k]); }
  const mid = ML.scale(ML.add(low, high), 0.5);
  let far = 0;
  for (const p of positions) far = Math.max(far, ML.length(ML.sub(p, mid)));
  const scale = far > 0 ? 2 / far : 1;
  return { positions: positions.map((p) => ML.scale(ML.sub(p, mid), scale)), scale, center: mid };
}

/** the nearest triangle under a ray, front or back, so a culled triangle can still be picked */
export function pickTriangle(positions, tris, origin, dir) {
  let best = -1, bestT = Infinity, bu = 0, bv = 0;
  for (let i = 0; i < tris.length; i++) {
    const a = positions[tris[i][0]], b = positions[tris[i][1]], c = positions[tris[i][2]];
    const e1 = ML.sub(b, a), e2 = ML.sub(c, a);
    const p = ML.cross(dir, e2);
    const det = ML.dot(e1, p);
    if (Math.abs(det) < 1e-12) continue;
    const s = ML.sub(origin, a);
    const u = ML.dot(s, p) / det;
    if (u < 0 || u > 1) continue;
    const q = ML.cross(s, e1);
    const v = ML.dot(dir, q) / det;
    if (v < 0 || u + v > 1) continue;
    const t = ML.dot(e2, q) / det;
    if (t > 0 && t < bestT) { bestT = t; best = i; bu = u; bv = v; }
  }
  if (best < 0) return null;
  const w = [1 - bu - bv, bu, bv];
  const corner = w.indexOf(Math.max(...w));          // the nearest corner has the largest weight
  const opposite = w.indexOf(Math.min(...w));        // the nearest edge is opposite the smallest weight
  return { tri: best, corner, vertex: tris[best][corner], edgeFromCorner: (opposite + 1) % 3 };
}
