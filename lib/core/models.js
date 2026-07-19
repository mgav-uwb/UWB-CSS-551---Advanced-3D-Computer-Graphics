// Runtime model registry + loader for the S01 demo library (mesh-view,
// our-scene, lod, illumination, uv-placement, bump-map). Primitives and the
// procedural teapot build synchronously; the Stanford bunny/dragon are
// fetched as pre-baked lib/assets/models/*.mesh.bin files (format v1, see
// tools/prep-models.mjs writeMeshBin, which parseMeshBin below mirrors).
//
// Every geometry this module hands back is normalized the same way: unit
// height (bbox Y-extent === 1), centered at the origin, +Y up, with UVs.
// File models are pre-baked normalized by prep-models.mjs; primitives and
// the teapot are normalized here via normalizeGeometry().
import * as THREE from '../vendor/three.module.js';
import { TeapotGeometry } from '../vendor/TeapotGeometry.js';

export const MODEL_INFO = {
  quad:   { label: 'quad',   kind: 'primitive' },
  cube:   { label: 'cube',   kind: 'primitive' },
  sphere: { label: 'sphere', kind: 'primitive' },
  ico:    { label: 'ico',    kind: 'primitive' },          // detail-2 icosphere
  teapot: { label: 'teapot', kind: 'generated', credit: 'Teapot: Martin Newell (1975), public-domain dataset' },
  bunny:  { label: 'bunny',  kind: 'file', credit: 'Model: Stanford Computer Graphics Laboratory' },
  dragon: { label: 'dragon', kind: 'file', credit: 'Model: Stanford Computer Graphics Laboratory' },
};

// --- geometry helpers -------------------------------------------------

// Center a geometry's bounding box at the origin and scale it so its
// Y-extent is exactly 1. Mirrors the normalize() step in
// tools/prep-models.mjs, but operates on a THREE.BufferGeometry (translate +
// scale) instead of a raw position array.
export function normalizeGeometry(geometry) {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox;
  const cx = (bb.min.x + bb.max.x) / 2;
  const cy = (bb.min.y + bb.max.y) / 2;
  const cz = (bb.min.z + bb.max.z) / 2;
  const yExtent = bb.max.y - bb.min.y;
  const scale = yExtent > 0 ? 1 / yExtent : 1;
  geometry.translate(-cx, -cy, -cz);
  geometry.scale(scale, scale, scale);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

// Per-vertex spherical UV: longitude (atan2-based, seam at +X) + latitude
// from Y, normalized by each vertex's own radius so it works for any sphere
// size (not just prep-models.mjs's fixed radius-0.5 convention). Exported
// standalone so it's independently testable and reusable for `ico`, whose
// built-in three.js UVs aren't the spherical-projection kind we want here.
export function sphericalUV(positions) {
  const count = positions.length / 3;
  const uv = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const x = positions[3 * i], y = positions[3 * i + 1], z = positions[3 * i + 2];
    const r = Math.hypot(x, y, z) || 1;
    // NOTE: atan2(z, -x) puts the UV seam at +X; tools/prep-models.mjs bakes
    // file models with atan2(z, x) (seam at -X) — a deliberate-to-leave 180°
    // convention drift between ico's runtime UVs and the baked assets.
    uv[2 * i] = Math.atan2(z, -x) / (2 * Math.PI) + 0.5;
    uv[2 * i + 1] = y / (2 * r) + 0.5;
  }
  return uv;
}

// --- binary mesh format v1 ------------------------------------------------

const MESH_BIN_MAGIC = 'MSH1';

// Parse the B1 binary mesh format written by tools/prep-models.mjs
// (writeMeshBin):
//   'MSH1' (4 ascii bytes) | vertexCount u32 LE | indexCount u32 LE |
//   hasUV u32 LE | positions f32[vertexCount*3] | normals f32[vertexCount*3] |
//   uvs f32[vertexCount*2] (present only if hasUV) | indices u32[indexCount]
// Throws with a specific message on a bad magic, non-positive counts, an
// index out of [0, vertexCount), or a byteLength that doesn't match the
// header-declared counts.
export function parseMeshBin(arrayBuffer) {
  if (arrayBuffer.byteLength < 16) {
    throw new Error(`parseMeshBin: buffer too small (${arrayBuffer.byteLength} bytes) to contain a header`);
  }
  const dv = new DataView(arrayBuffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== MESH_BIN_MAGIC) {
    throw new Error(`parseMeshBin: bad magic "${magic}", expected "${MESH_BIN_MAGIC}"`);
  }
  const vertexCount = dv.getUint32(4, true);
  const indexCount = dv.getUint32(8, true);
  const hasUV = dv.getUint32(12, true) !== 0;
  if (!(vertexCount > 0)) throw new Error(`parseMeshBin: vertexCount must be > 0, got ${vertexCount}`);
  if (!(indexCount > 0)) throw new Error(`parseMeshBin: indexCount must be > 0, got ${indexCount}`);

  const posBytes = vertexCount * 3 * 4;
  const normBytes = vertexCount * 3 * 4;
  const uvBytes = hasUV ? vertexCount * 2 * 4 : 0;
  const idxBytes = indexCount * 4;
  const expected = 16 + posBytes + normBytes + uvBytes + idxBytes;
  if (arrayBuffer.byteLength !== expected) {
    throw new Error(`parseMeshBin: byteLength mismatch, expected ${expected} for vertexCount=${vertexCount}/indexCount=${indexCount}/hasUV=${hasUV}, got ${arrayBuffer.byteLength}`);
  }

  let o = 16;
  const positions = new Float32Array(arrayBuffer.slice(o, o + posBytes)); o += posBytes;
  const normals = new Float32Array(arrayBuffer.slice(o, o + normBytes)); o += normBytes;
  let uvs = null;
  if (hasUV) { uvs = new Float32Array(arrayBuffer.slice(o, o + uvBytes)); o += uvBytes; }
  const indices = new Uint32Array(arrayBuffer.slice(o, o + idxBytes));

  for (let i = 0; i < indices.length; i++) {
    if (indices[i] >= vertexCount) {
      throw new Error(`parseMeshBin: index ${indices[i]} at position ${i} out of range for vertexCount=${vertexCount}`);
    }
  }

  return { positions, normals, uvs, indices };
}

// Fetch raw bytes for a model asset URL. Real browsers use native fetch;
// under Node (node:test has no `window` and no file:// fetch support) we
// shell out to node:fs so the exact same loadModel() code path is
// exercisable from the node test suite against the real committed assets,
// not just from the browser. The dynamic imports below are never reached
// in a browser (window is defined there), so they never affect bundling.
async function fetchArrayBuffer(url) {
  if (typeof window === 'undefined' && url.protocol === 'file:') {
    const { readFile } = await import('node:fs/promises');
    const { fileURLToPath } = await import('node:url');
    const buf = await readFile(fileURLToPath(url));
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`loadModel: fetch failed (${res.status} ${res.statusText}) for ${url}`);
  return res.arrayBuffer();
}

// --- loader ----------------------------------------------------------------

const modelCache = new Map(); // `${name}:${lod}` -> Promise<result>

async function buildModel(name, info, lod) {
  let geometry;

  switch (name) {
    case 'quad':
      geometry = new THREE.PlaneGeometry(1.4, 1.4, 1, 1);
      break;
    case 'cube':
      geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      break;
    case 'sphere':
      geometry = new THREE.SphereGeometry(0.55, 48, 32);
      break;
    case 'ico':
      geometry = new THREE.IcosahedronGeometry(0.55, 2);
      break;
    case 'teapot':
      geometry = new TeapotGeometry(0.35);
      break;
    case 'bunny':
    case 'dragon': {
      const url = new URL(`../assets/models/${name}.${lod}.mesh.bin`, import.meta.url);
      const buf = await fetchArrayBuffer(url);
      const parsed = parseMeshBin(buf);
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(parsed.positions, 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(parsed.normals, 3));
      if (parsed.uvs) geometry.setAttribute('uv', new THREE.BufferAttribute(parsed.uvs, 2));
      geometry.setIndex(new THREE.BufferAttribute(parsed.indices, 1));
      break;
    }
    default:
      throw new Error(`loadModel: unknown model "${name}"`);
  }

  // File models arrive pre-normalized (centered, unit height) from
  // prep-models.mjs; primitives and the generated teapot are normalized here.
  if (info.kind !== 'file') normalizeGeometry(geometry);

  // ico's default three.js UVs aren't the spherical projection we want;
  // compute it from the final (normalized) positions.
  if (name === 'ico') {
    const uv = sphericalUV(geometry.attributes.position.array);
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  }

  const verts = geometry.attributes.position.count;
  const tris = geometry.index ? geometry.index.count / 3 : verts / 3;

  return { geometry, tris, verts, credit: info.credit ?? null };
}

// Load a model by name. `lod` (one of 'l0'..'l3') only applies to file
// models (bunny/dragon); it's ignored for primitives/generated models.
// Results are cached per (name, lod) — repeated calls return the same
// promise/result rather than rebuilding or re-fetching.
export async function loadModel(name, { lod = 'l3' } = {}) {
  const info = MODEL_INFO[name];
  if (!info) throw new Error(`loadModel: unknown model "${name}" (expected one of ${Object.keys(MODEL_INFO).join(', ')})`);
  const key = `${name}:${info.kind === 'file' ? lod : '-'}`;
  if (!modelCache.has(key)) modelCache.set(key, buildModel(name, info, lod));
  return modelCache.get(key);
}
