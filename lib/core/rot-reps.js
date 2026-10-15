// rot-reps: the rotation representations of the Rotation chapter, hand-built, no three.js import.
// Every conversion the chapter teaches, in the conventions of lib/core/xform.js:
//   matrices are 16-element COLUMN-MAJOR arrays (m[4*col + row]), angles in DEGREES at the API,
//   quaternions are [x, y, z, w] (three.js and Unity storage order), q = (sin(θ/2) n, cos(θ/2)).
// The rotation demos (axis-angle, rot-columns, euler-gimbal, rot-compose, quat-slerp, spin-step)
// import these, and lib/tests/rot-reps.test.mjs checks them against the chapter's numbers.
import { axisAngleMatrix, quatFromAxisAngle, matMul, cross, dot, normalize } from './xform.js';

const D = Math.PI / 180;

export { axisAngleMatrix, quatFromAxisAngle };

/** entry (row, col) of a column-major 4x4. */
export const at = (m, r, c) => m[4 * c + r];

/** column j (0, 1, 2) of a column-major 4x4: where axis j lands. */
export const column = (m, j) => [m[4 * j], m[4 * j + 1], m[4 * j + 2]];

/** the 3x3 part as rows, for readouts: [[r00, r01, r02], ...]. */
export const rows3 = (m) => [0, 1, 2].map((r) => [at(m, r, 0), at(m, r, 1), at(m, r, 2)]);

/** apply the 3x3 part to a vector. */
export const rotate = (m, v) => [
  m[0] * v[0] + m[4] * v[1] + m[8] * v[2],
  m[1] * v[0] + m[5] * v[1] + m[9] * v[2],
  m[2] * v[0] + m[6] * v[1] + m[10] * v[2],
];

/** determinant of the 3x3 part = the triple product col0 · (col1 × col2). */
export const det3 = (m) => dot(column(m, 0), cross(column(m, 1), column(m, 2)));

/** trace of the 3x3 part (sum of the diagonal) = 1 + 2 cos θ for a rotation. */
export const trace3 = (m) => m[0] + m[5] + m[10];

/** a 4x4 from three columns (the images of x, y, z). */
export const fromColumns = (c0, c1, c2) => [...c0, 0, ...c1, 0, ...c2, 0, 0, 0, 0, 1];

/** diag(a, b, c) as a 4x4: a mirror when one entry is −1. */
export const diag = (a, b, c) => [a, 0, 0, 0, 0, b, 0, 0, 0, 0, c, 0, 0, 0, 0, 1];

// ---------------------------------------------------------------- quaternions

/** Hamilton product a b (apply b first, then a): vector part wa vb + wb va + va × vb, scalar wa wb − va · vb. */
export function quatMul(a, b) {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + bw * ax + (ay * bz - az * by),
    aw * by + bw * ay + (az * bx - ax * bz),
    aw * bz + bw * az + (ax * by - ay * bx),
    aw * bw - (ax * bx + ay * by + az * bz),
  ];
}

export const quatConj = (q) => [-q[0], -q[1], -q[2], q[3]];
export const quatDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
export const quatLen = (q) => Math.hypot(q[0], q[1], q[2], q[3]);
export const quatNeg = (q) => [-q[0], -q[1], -q[2], -q[3]];
export function quatNormalize(q) {
  const l = quatLen(q);
  return [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}

/** the sandwich q p q⁻¹, expanded: p + 2w (qv × p) + 2 qv × (qv × p). */
export function quatRotate(q, p) {
  const qv = [q[0], q[1], q[2]];
  const t = cross(qv, p);
  const u = cross(qv, t);
  return [
    p[0] + 2 * q[3] * t[0] + 2 * u[0],
    p[1] + 2 * q[3] * t[1] + 2 * u[1],
    p[2] + 2 * q[3] * t[2] + 2 * u[2],
  ];
}

/** quaternion to matrix, no trigonometry (the chapter's Section 4.1 table). */
export function quatToMatrix(q) {
  const [x, y, z, w] = q;
  return [
    1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0,
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0,
    0, 0, 0, 1,
  ];
}

/** matrix to quaternion by Shepperd's method: solve from the largest of w, x, y, z. Returns { q, branch }. */
export function matrixToQuat(m) {
  const m00 = at(m, 0, 0), m11 = at(m, 1, 1), m22 = at(m, 2, 2);
  const tr = m00 + m11 + m22;
  const big = Math.max(tr, m00, m11, m22);
  let q, branch;
  if (big === tr) {
    const s = 2 * Math.sqrt(1 + tr);
    q = [(at(m, 2, 1) - at(m, 1, 2)) / s, (at(m, 0, 2) - at(m, 2, 0)) / s, (at(m, 1, 0) - at(m, 0, 1)) / s, s / 4];
    branch = 'trace';
  } else if (big === m00) {
    const s = 2 * Math.sqrt(1 + m00 - m11 - m22);
    q = [s / 4, (at(m, 0, 1) + at(m, 1, 0)) / s, (at(m, 0, 2) + at(m, 2, 0)) / s, (at(m, 2, 1) - at(m, 1, 2)) / s];
    branch = 'm00';
  } else if (big === m11) {
    const s = 2 * Math.sqrt(1 + m11 - m00 - m22);
    q = [(at(m, 0, 1) + at(m, 1, 0)) / s, s / 4, (at(m, 1, 2) + at(m, 2, 1)) / s, (at(m, 0, 2) - at(m, 2, 0)) / s];
    branch = 'm11';
  } else {
    const s = 2 * Math.sqrt(1 + m22 - m00 - m11);
    q = [(at(m, 0, 2) + at(m, 2, 0)) / s, (at(m, 1, 2) + at(m, 2, 1)) / s, s / 4, (at(m, 1, 0) - at(m, 0, 1)) / s];
    branch = 'm22';
  }
  return { q, branch };
}

/** axis and angle (degrees, in [0, 360)) of a unit quaternion; the axis is (0, 1, 0) by convention at angle 0. */
export function quatToAxisAngle(q) {
  const [x, y, z, w] = q;
  const s = Math.hypot(x, y, z);
  const deg = (2 * Math.atan2(s, w)) / D;
  if (s < 1e-12) return { axis: [0, 1, 0], deg: 0 };
  return { axis: [x / s, y / s, z / s], deg };
}

/** the log map of the chapter's Section 3.2: angle from the trace, axis from R − Rᵀ (fails near 180°). */
export function matrixToAxisAngle(m) {
  const c = Math.max(-1, Math.min(1, (trace3(m) - 1) / 2));
  const theta = Math.acos(c);
  const anti = [at(m, 2, 1) - at(m, 1, 2), at(m, 0, 2) - at(m, 2, 0), at(m, 1, 0) - at(m, 0, 1)];
  const len = Math.hypot(...anti);
  return { deg: theta / D, anti, antiLen: len, axis: len > 1e-12 ? anti.map((v) => v / len) : null };
}

/** angle in degrees between two orientations (the rotation that takes one to the other). */
export function angleBetween(q1, q2) {
  const d = Math.min(1, Math.abs(quatDot(q1, q2)));
  return (2 * Math.acos(d)) / D;
}

// ---------------------------------------------------------------- interpolation

/** slerp(q1, q2, t); with shortest (default) it negates q2 when q1 · q2 < 0. Returns { q, omegaDeg, flipped }. */
export function slerp(q1, q2, t, { shortest = true } = {}) {
  let b = q2;
  let c = quatDot(q1, q2);
  let flipped = false;
  if (shortest && c < 0) { b = quatNeg(q2); c = -c; flipped = true; }
  c = Math.max(-1, Math.min(1, c));
  const om = Math.acos(c);
  if (om < 1e-9) return { q: quatNormalize(q1.map((v, i) => v + t * (b[i] - v))), omegaDeg: 0, flipped };
  const so = Math.sin(om);
  const k1 = Math.sin((1 - t) * om) / so;
  const k2 = Math.sin(t * om) / so;
  return { q: q1.map((v, i) => k1 * v + k2 * b[i]), omegaDeg: om / D, flipped };
}

/** the straight blend, not normalized: leaves the unit sphere. */
export const lerpRaw = (q1, q2, t) => q1.map((v, i) => (1 - t) * v + t * q2[i]);

/** nlerp: the straight blend, renormalized (same path as slerp, uneven speed). */
export function nlerp(q1, q2, t, { shortest = true } = {}) {
  const b = shortest && quatDot(q1, q2) < 0 ? quatNeg(q2) : q2;
  return quatNormalize(lerpRaw(q1, b, t));
}

// ---------------------------------------------------------------- shortest arc

/** the smallest rotation taking direction a onto direction b: q = normalize(a × b, 1 + a · b), with the
 *  opposite-vectors case handled by picking a perpendicular axis. Returns { q, degenerate }. */
export function fromTo(a, b) {
  const ua = normalize(a);
  const ub = normalize(b);
  const c = dot(ua, ub);
  if (1 + c < 1e-8) {
    let axis = cross(ua, [0, 1, 0]);
    if (Math.hypot(...axis) < 1e-6) axis = cross(ua, [1, 0, 0]);
    axis = normalize(axis);
    return { q: [axis[0], axis[1], axis[2], 0], degenerate: true };
  }
  const v = cross(ua, ub);
  return { q: quatNormalize([v[0], v[1], v[2], 1 + c]), degenerate: false };
}

// ---------------------------------------------------------------- Euler angles

const RX = (deg) => axisAngleMatrix(1, 0, 0, deg);
const RY = (deg) => axisAngleMatrix(0, 1, 0, deg);
const RZ = (deg) => axisAngleMatrix(0, 0, 1, deg);

/**
 * The three conventions the chapter compares, keyed by name. `product` is the matrix on a column
 * vector (leftmost acts last); `nest` lists the gimbals from OUTER to INNER, which is the reading
 * order of the product: the outer ring turns everything inside it.
 */
export const EULER_ORDERS = {
  unity: { label: 'Unity (Z, then X, then Y)', product: 'R_y R_x R_z', nest: ['y', 'x', 'z'] },
  three: { label: 'three.js XYZ (Z, then Y, then X)', product: 'R_x R_y R_z', nest: ['x', 'y', 'z'] },
  aero: { label: 'aerospace (roll x, pitch y, yaw z)', product: 'R_z R_y R_x', nest: ['z', 'y', 'x'] },
};

const R_OF = { x: RX, y: RY, z: RZ };

/** the matrix of the Euler triple (x, y, z) in degrees under a named order. */
export function eulerMatrix(order, x, y, z) {
  const ang = { x, y, z };
  const [o, m, i] = EULER_ORDERS[order].nest;
  return matMul(matMul(R_OF[o](ang[o]), R_OF[m](ang[m])), R_OF[i](ang[i]));
}

/** Unity-order extraction (the chapter's Appendix A.4): x = asin(−R12), y = atan2(R02, R22), z = atan2(R10, R11).
 *  At the lock (cos x ≈ 0) it sets z = 0 and reads y from the first row, as Unity does. */
export function eulerFromMatrixUnity(m) {
  const s = Math.max(-1, Math.min(1, -at(m, 1, 2)));
  const x = Math.asin(s) / D;
  const cx = Math.sqrt(at(m, 0, 2) ** 2 + at(m, 2, 2) ** 2);
  if (cx < 1e-6) {
    // locked: only y − z (x = +90) or y + z (x = −90) is observable; report z = 0
    const y = Math.atan2(s > 0 ? at(m, 0, 1) : -at(m, 0, 1), at(m, 0, 0)) / D;
    return { x, y, z: 0, locked: true };
  }
  return { x, y: Math.atan2(at(m, 0, 2), at(m, 2, 2)) / D, z: Math.atan2(at(m, 1, 0), at(m, 1, 1)) / D, locked: false };
}

/** The same extraction for any order in EULER_ORDERS. With the product R_o(a) R_m(b) R_i(c) (outer o,
 *  middle m, inner i as row/column indices 0, 1, 2) and s = +1 when (o, m, i) is a cyclic order of
 *  (x, y, z), −1 otherwise: R[o][i] = s sin b, a = atan2(−s R[m][i], R[i][i]), c = atan2(−s R[o][m], R[o][o]).
 *  For Unity (y, x, z; s = −1) these are the formulas above. At the lock (cos b ≈ 0) it sets c = 0 and
 *  reads a from column m, which the middle turn leaves alone: R[m][m] = cos a, R[i][m] = s sin a. */
export function eulerFromMatrix(order, m) {
  const idx = { x: 0, y: 1, z: 2 };
  const [on, mn, inn] = EULER_ORDERS[order].nest;
  const o = idx[on], mi = idx[mn], i = idx[inn];
  const s = (mi - o + 3) % 3 === 1 ? 1 : -1;
  const sb = Math.max(-1, Math.min(1, s * at(m, o, i)));
  const b = Math.asin(sb) / D;
  const cb = Math.hypot(at(m, mi, i), at(m, i, i));
  let a, c, locked;
  if (cb < 1e-6) {
    a = Math.atan2(s * at(m, i, mi), at(m, mi, mi)) / D;
    c = 0;
    locked = true;
  } else {
    a = Math.atan2(-s * at(m, mi, i), at(m, i, i)) / D;
    c = Math.atan2(-s * at(m, o, mi), at(m, o, o)) / D;
    locked = false;
  }
  const ang = {};
  ang[on] = a;
  ang[mn] = b;
  ang[inn] = c;
  return { x: ang.x, y: ang.y, z: ang.z, locked };
}

/** world directions of the three gimbal axes for an order: the outer axis is fixed, the middle one is
 *  carried by the outer turn, the inner one by the outer and middle turns. Returns { outer, middle, inner }
 *  as unit vectors plus the angle in degrees between the inner and outer axes. */
export function gimbalAxes(order, x, y, z) {
  const ang = { x, y, z };
  const unit = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
  const [o, m, i] = EULER_ORDERS[order].nest;
  const Ro = R_OF[o](ang[o]);
  const Rom = matMul(Ro, R_OF[m](ang[m]));
  const outer = unit[o];
  const middle = rotate(Ro, unit[m]);
  const inner = rotate(Rom, unit[i]);
  const c = Math.abs(dot(outer, inner));
  return { outer, middle, inner, names: { outer: o, middle: m, inner: i }, innerOuterDeg: Math.acos(Math.min(1, c)) / D };
}

/** a column-major 4x4 for an angle about a named world axis. */
export const axisRot = (name, deg) => R_OF[name](deg);
