// football-mesh: a stand-in ball the football demo draws for the moment before the real model
// (lib/assets/models/football/football.glb) has loaded. Same frame and size: origin at the ball's center,
// long axis +z, laces on +y, 0.28 m tip to tip, 0.162 m across.
// Parts: the leather shell, a lathe profile (u around the long axis, v from the -z tip to the +z tip), and
// the laces, nine short boxes along the +y seam and eight stitches across it.
import * as THREE from '../vendor/three.module.js';

export const BALL_DIMS = { length: 0.28, radius: 0.081 };

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
