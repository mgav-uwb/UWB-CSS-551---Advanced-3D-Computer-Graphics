// Progressive Mesh runtime (Hoppe, "Progressive Meshes", SIGGRAPH 1996).
// Plays back a PMB1 stream — a coarse base mesh plus an ordered list of
// vertex-split records — as a continuous resolution control over one
// preallocated BufferGeometry (drawRange managed, splits applied/undone
// incrementally). The stream is produced offline by tools/build-pm.mjs.
//
// PMB1 binary format (little-endian), mirroring the format-v1 conventions of
// tools/prep-models.mjs / parseMeshBin:
//   'PMB1' (4 ascii bytes) | baseVertexCount u32 | baseIndexCount u32 |
//   splitCount u32 | base positions f32[bvc*3] | base indices u32[bic] |
//   splitCount records of { parentVertex u32, leftWing u32, rightWing u32,
//   childPos f32*3 } in application order.
// Base vertices are 0..bvc-1; the k-th split creates vertex bvc+k. A wing of
// 0xFFFFFFFF (NO_WING) marks a boundary split with a single new triangle.
import * as THREE from '../vendor/three.module.js';

export const NO_WING = 0xffffffff;

const PM_MAGIC = 'PMB1';
const RECORD_BYTES = 6 * 4; // 3×u32 + 3×f32

// --- parsing ---------------------------------------------------------------

// Parse and validate a PMB1 ArrayBuffer. Throws with a specific message on a
// bad magic, inconsistent byteLength, out-of-range base indices, or a split
// record that references a vertex that does not exist yet at its application
// time (parent/wings must be < bvc + k for the k-th record).
export function parsePM(arrayBuffer) {
  if (arrayBuffer.byteLength < 16) {
    throw new Error(`parsePM: buffer too small (${arrayBuffer.byteLength} bytes) to contain a header`);
  }
  const dv = new DataView(arrayBuffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== PM_MAGIC) {
    throw new Error(`parsePM: bad magic "${magic}", expected "${PM_MAGIC}"`);
  }
  const baseVertexCount = dv.getUint32(4, true);
  const baseIndexCount = dv.getUint32(8, true);
  const splitCount = dv.getUint32(12, true);
  if (!(baseVertexCount > 0)) throw new Error(`parsePM: baseVertexCount must be > 0, got ${baseVertexCount}`);
  if (!(baseIndexCount > 0) || baseIndexCount % 3 !== 0) {
    throw new Error(`parsePM: baseIndexCount must be a positive multiple of 3, got ${baseIndexCount}`);
  }

  const posBytes = baseVertexCount * 3 * 4;
  const idxBytes = baseIndexCount * 4;
  const expected = 16 + posBytes + idxBytes + splitCount * RECORD_BYTES;
  if (arrayBuffer.byteLength !== expected) {
    throw new Error(`parsePM: byteLength mismatch, expected ${expected} for bvc=${baseVertexCount}/bic=${baseIndexCount}/splits=${splitCount}, got ${arrayBuffer.byteLength}`);
  }

  let o = 16;
  const basePositions = new Float32Array(arrayBuffer.slice(o, o + posBytes)); o += posBytes;
  const baseIndices = new Uint32Array(arrayBuffer.slice(o, o + idxBytes)); o += idxBytes;
  for (let i = 0; i < baseIndices.length; i++) {
    if (baseIndices[i] >= baseVertexCount) {
      throw new Error(`parsePM: base index ${baseIndices[i]} at position ${i} out of range for baseVertexCount=${baseVertexCount}`);
    }
  }

  const splitParent = new Uint32Array(splitCount);
  const splitLeft = new Uint32Array(splitCount);
  const splitRight = new Uint32Array(splitCount);
  const splitChildPos = new Float32Array(splitCount * 3);
  for (let k = 0; k < splitCount; k++) {
    const parent = dv.getUint32(o, true);
    const left = dv.getUint32(o + 4, true);
    const right = dv.getUint32(o + 8, true);
    const limit = baseVertexCount + k; // vertices existing when record k applies
    if (parent >= limit) throw new Error(`parsePM: record ${k} parent ${parent} out of range (limit ${limit})`);
    if (left !== NO_WING && left >= limit) throw new Error(`parsePM: record ${k} leftWing ${left} out of range (limit ${limit})`);
    if (right !== NO_WING && right >= limit) throw new Error(`parsePM: record ${k} rightWing ${right} out of range (limit ${limit})`);
    if (left === NO_WING && right === NO_WING) throw new Error(`parsePM: record ${k} has no wings`);
    splitParent[k] = parent;
    splitLeft[k] = left;
    splitRight[k] = right;
    splitChildPos[3 * k] = dv.getFloat32(o + 12, true);
    splitChildPos[3 * k + 1] = dv.getFloat32(o + 16, true);
    splitChildPos[3 * k + 2] = dv.getFloat32(o + 20, true);
    o += RECORD_BYTES;
  }

  return { baseVertexCount, baseIndexCount, splitCount, basePositions, baseIndices, splitParent, splitLeft, splitRight, splitChildPos };
}

// --- wedge walk -------------------------------------------------------------

// Select the fan faces around a split's parent vertex that belong to the new
// child. `fan` is the parent's current face fan as [{entry, exit}] where, for
// a face (p, a, b) with p the parent in CCW order, entry = a and exit = b —
// the face spans CCW around p from entry to exit. The child's wedge is the
// consecutive CCW run from leftWing to rightWing:
//   - l present: start at the face with entry === l (none ⇒ empty wedge);
//   - l missing (boundary): start at the open fan's CCW-first face;
//   - r present: stop after the face with exit === r;
//   - r missing (boundary): stop at the open fan's CCW-last face.
// Returns an array of fan indices in walk order, or null if the fan is
// inconsistent (used by the builder as a replayability guard, and by the
// runtime — where null means corrupt data — to fail loudly).
export function walkWedge(fan, l, r) {
  let start = -1;
  if (l !== NO_WING) {
    for (let i = 0; i < fan.length; i++) if (fan[i].entry === l) { start = i; break; }
    if (start === -1) return []; // empty wedge (boundary case B)
  } else {
    // CCW-first face of the open fan: its entry is no face's exit.
    const exits = new Set();
    for (const f of fan) exits.add(f.exit);
    for (let i = 0; i < fan.length; i++) {
      if (!exits.has(fan[i].entry)) {
        if (start !== -1) return null; // two fan starts: non-manifold
        start = i;
      }
    }
    if (start === -1) return null; // closed fan but no left wing
    if (fan[start].entry === r) return []; // empty wedge (boundary case A)
  }
  const wedge = [];
  let cur = start;
  for (let steps = 0; steps <= fan.length; steps++) {
    wedge.push(cur);
    const exit = fan[cur].exit;
    if (r !== NO_WING && exit === r) return wedge; // inclusive stop
    let next = -1;
    for (let i = 0; i < fan.length; i++) if (fan[i].entry === exit) { next = i; break; }
    if (next === -1) {
      return r === NO_WING ? wedge : null; // open-fan end; must be a boundary stop
    }
    cur = next;
  }
  return null; // cycled without reaching the stop condition
}

// --- runtime ----------------------------------------------------------------

// Build the runtime object from parsed PMB1 data. Exported separately from
// loadPM so node tests can drive in-memory streams without touching disk.
export function createPM(parsed) {
  const { baseVertexCount: bvc, splitCount, basePositions, baseIndices, splitParent, splitLeft, splitRight, splitChildPos } = parsed;
  const totalVerts = bvc + splitCount;
  const baseFaces = baseIndices.length / 3;

  // faces added by each split (2 interior, 1 boundary) → cumulative counts
  // and the fixed slot where each split's new faces live.
  const facesAdded = new Uint8Array(splitCount);
  const cumFaces = new Uint32Array(splitCount + 1);
  cumFaces[0] = baseFaces;
  for (let k = 0; k < splitCount; k++) {
    facesAdded[k] = (splitLeft[k] !== NO_WING ? 1 : 0) + (splitRight[k] !== NO_WING ? 1 : 0);
    cumFaces[k + 1] = cumFaces[k] + facesAdded[k];
  }
  const maxFaces = cumFaces[splitCount];

  // Preallocated buffers: positions are static (base + every child position,
  // written once); only the index array and drawRange change with resolution.
  const positions = new Float32Array(totalVerts * 3);
  positions.set(basePositions, 0);
  positions.set(splitChildPos, bvc * 3);
  const index = new Uint32Array(maxFaces * 3);
  index.set(baseIndices, 0);

  // Per-vertex incidence lists of face slots, maintained incrementally.
  const incident = new Array(totalVerts);
  for (let v = 0; v < totalVerts; v++) incident[v] = [];
  for (let f = 0; f < baseFaces; f++) {
    incident[index[3 * f]].push(f);
    incident[index[3 * f + 1]].push(f);
    incident[index[3 * f + 2]].push(f);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(index, 1));
  geometry.setDrawRange(0, baseFaces * 3);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  let applied = 0; // number of splits currently applied

  function writeFace(slot, a, b, c) {
    index[3 * slot] = a; index[3 * slot + 1] = b; index[3 * slot + 2] = c;
    incident[a].push(slot); incident[b].push(slot); incident[c].push(slot);
  }

  function dropIncidence(v, slot) {
    const list = incident[v];
    const i = list.indexOf(slot);
    if (i !== -1) { list[i] = list[list.length - 1]; list.pop(); }
  }

  function applySplit(k) {
    const parent = splitParent[k], l = splitLeft[k], r = splitRight[k];
    const child = bvc + k;
    // parent's fan as {entry, exit, slot}
    const fan = incident[parent].map((slot) => {
      const a = index[3 * slot], b = index[3 * slot + 1], c = index[3 * slot + 2];
      if (a === parent) return { entry: b, exit: c, slot };
      if (b === parent) return { entry: c, exit: a, slot };
      return { entry: a, exit: b, slot };
    });
    const wedge = walkWedge(fan, l, r);
    if (wedge === null) throw new Error(`pm: inconsistent fan applying split ${k} (parent ${parent})`);
    // reassign the wedge faces parent → child
    for (const wi of wedge) {
      const slot = fan[wi].slot;
      for (let e = 0; e < 3; e++) if (index[3 * slot + e] === parent) index[3 * slot + e] = child;
      dropIncidence(parent, slot);
      incident[child].push(slot);
    }
    // append the split's new triangle(s) at its fixed slot
    let slot = cumFaces[k];
    if (l !== NO_WING) writeFace(slot++, child, parent, l);
    if (r !== NO_WING) writeFace(slot++, parent, child, r);
    applied++;
  }

  function undoSplit(k) {
    const parent = splitParent[k];
    const child = bvc + k;
    for (const slot of [...incident[child]]) {
      const a = index[3 * slot], b = index[3 * slot + 1], c = index[3 * slot + 2];
      if (a === parent || b === parent || c === parent) {
        // one of the split's own triangles: remove it entirely
        dropIncidence(a, slot); dropIncidence(b, slot); dropIncidence(c, slot);
        index[3 * slot] = 0; index[3 * slot + 1] = 0; index[3 * slot + 2] = 0;
      } else {
        // wedge face: give it back to the parent
        for (let e = 0; e < 3; e++) if (index[3 * slot + e] === child) index[3 * slot + e] = parent;
        dropIncidence(child, slot);
        incident[parent].push(slot);
      }
    }
    applied--;
  }

  // Move to the nearest achievable triangle count ≤ t (clamped to the base
  // count from below), applying/undoing vertex splits incrementally. Returns
  // the actual triangle count reached. Normals are recomputed at most once
  // per invocation, and only when the resolution actually changed.
  function setTriangleCount(t) {
    // largest k with cumFaces[k] <= t (binary search; cumFaces is increasing)
    let lo = 0, hi = splitCount;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (cumFaces[mid] <= t) lo = mid; else hi = mid - 1;
    }
    const target = lo;
    if (target !== applied) {
      while (applied < target) applySplit(applied);
      while (applied > target) undoSplit(applied - 1);
      geometry.setDrawRange(0, cumFaces[applied] * 3);
      geometry.index.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.attributes.normal.needsUpdate = true;
    }
    return cumFaces[applied];
  }

  return { minTris: baseFaces, maxTris: maxFaces, geometry, setTriangleCount };
}

// Fetch raw bytes for a PM stream URL. Browsers use native fetch; under Node
// (no `window`, no file:// fetch) we read via node:fs so the same loadPM()
// path is exercisable from the node test suite (mirrors models.js).
async function fetchArrayBuffer(url) {
  if (typeof window === 'undefined' && url.protocol === 'file:') {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const buf = await readFile(fileURLToPath(url));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`loadPM: fetch failed (${res.status} ${res.statusText}) for ${url}`);
  return res.arrayBuffer();
}

// Load a PMB1 stream and return the runtime object:
//   { minTris, maxTris, geometry, setTriangleCount(t) }
export async function loadPM(url) {
  const u = url instanceof URL ? url : new URL(url, typeof window === 'undefined' ? 'file://' : window.location.href);
  return createPM(parsePM(await fetchArrayBuffer(u)));
}
