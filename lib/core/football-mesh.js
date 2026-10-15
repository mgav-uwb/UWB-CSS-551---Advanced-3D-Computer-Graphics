// football-mesh: the ball's geometry in its own frame, shared by the demo (lib/demos/football.js) and the
// asset exporter (tools/gen-football-model.mjs, which writes lib/assets/models/football/: OBJ + MTL for
// Unity, GLB for three.js, one PNG texture for both).
//
// Frame: origin at the ball's center, long axis +z (forward in both engines and in glTF), laces on +y,
// meters. An NFL ball: 0.28 m tip to tip, 0.17 m across the middle.
// Parts: the leather shell, a lathe profile with UVs (u around the long axis, v from the -z tip to the +z
// tip), and the laces, nine short boxes along the +y seam and eight stitches across it.
// The texture is a pure function of (u, v), leatherTexel, so the PNG is generated, never hand-edited.
import * as THREE from '../vendor/three.module.js';

export const BALL_DIMS = { length: 0.28, radius: 0.085 };

/** radius of the shell at height z along the long axis (0 at the tips). */
export function surfaceRadius(z) {
  const half = BALL_DIMS.length / 2;
  return BALL_DIMS.radius * Math.pow(Math.max(0, 1 - (z / half) ** 2), 0.75);
}

/** the leather shell: indexed, with position, normal and uv. With the default 72 segments the seams of
 *  the four panels fall on u = 0, 0.25, 0.5, 0.75 (the -y, +x, +y, -x meridians); the laces sit on u = 0.5. */
export function buildLeather(segments = 72, rings = 48) {
  const half = BALL_DIMS.length / 2;
  const pts = [];
  for (let i = 0; i <= rings; i++) {
    const y = -half + (BALL_DIMS.length * i) / rings;
    pts.push(new THREE.Vector2(Math.max(surfaceRadius(y), 1e-4), y));
  }
  const geo = new THREE.LatheGeometry(pts, segments);
  geo.rotateX(Math.PI / 2); // the lathe's axis +y becomes the long axis +z (and its -y tip the -z tip)
  return geo;
}

/** the laces: one indexed geometry of boxes sitting on the +y seam, with position and normal. */
export function buildLaces() {
  const parts = [];
  const add = (w, h, d, z, lift) => {
    const b = new THREE.BoxGeometry(w, h, d);
    b.translate(0, surfaceRadius(z) + lift, z);
    parts.push(b);
  };
  for (let k = 0; k < 9; k++) add(0.005, 0.004, 0.012, -0.044 + 0.011 * k, 0.0012);
  for (let k = 0; k < 8; k++) add(0.026, 0.004, 0.0035, -0.0385 + 0.011 * k, 0.002);
  return mergeIndexed(parts);
}

/** concatenate indexed geometries that share position and normal attributes (no uv). */
function mergeIndexed(parts) {
  const pos = [], nrm = [], idx = [];
  let base = 0;
  for (const g of parts) {
    const p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nrm.push(n.getX(i), n.getY(i), n.getZ(i));
    }
    for (const i of g.index.array) idx.push(base + i);
    base += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  out.setIndex(idx);
  return out;
}

// --------------------------------------------------------------- the texture, as a function of (u, v)

const LEATHER = [138, 69, 32];
const SEAM = [46, 21, 8];
const TIP = [110, 52, 24];

function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

/** the color of the leather texture at (u, v) in [0, 1]², as [r, g, b] bytes: pebbled leather, four
 *  dark seams at u = 0, 0.25, 0.5, 0.75, darker tips. w × h is the image size the pebbles are sized for. */
export function leatherTexel(u, v, w = 1024, h = 512) {
  // pebbles: a 4-pixel cell grid, each cell darkened by a fixed random amount
  const cx = Math.floor(u * w / 4), cy = Math.floor(v * h / 4);
  const pebble = 0.88 + 0.12 * hash2(cx, cy);
  let c = LEATHER.map((x) => x * pebble);
  const tip = Math.min(v, 1 - v);
  if (tip < 0.06) { const k = 1 - tip / 0.06; c = c.map((x, i) => x + (TIP[i] - x) * k * 0.8); }
  const toSeam = Math.min(...[0, 0.25, 0.5, 0.75, 1].map((s) => Math.abs(u - s)));
  const seamW = 0.0032;
  if (toSeam < seamW * 1.6) {
    const k = toSeam < seamW ? 1 : 1 - (toSeam - seamW) / (seamW * 0.6);
    c = c.map((x, i) => x + (SEAM[i] - x) * k);
  }
  return c.map((x) => Math.max(0, Math.min(255, Math.round(x))));
}

/** the whole texture as RGBA bytes, row 0 = v = 1 (the image's top), as image files store it. */
export function leatherImage(w = 1024, h = 512) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const v = 1 - (y + 0.5) / h;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = leatherTexel((x + 0.5) / w, v, w, h);
      data.set([r, g, b, 255], (y * w + x) * 4);
    }
  }
  return { width: w, height: h, data };
}
