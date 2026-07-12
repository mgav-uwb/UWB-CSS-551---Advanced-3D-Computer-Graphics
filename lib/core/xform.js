// Hand-built math core: view/model/projection matrices, no three.js import.
// All matrices are 16-element plain arrays in COLUMN-MAJOR order
// (matches THREE.Matrix4.elements layout).

export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const normalize = (a) => {
  const l = Math.hypot(...a);
  return [a[0] / l, a[1] / l, a[2] / l];
};

export function lookAtBasis(eye, at, up) {
  const w = normalize(sub(eye, at));
  const c = cross(up, w);
  if (Math.hypot(...c) < 1e-8) {
    throw new RangeError('lookAtBasis: up is parallel to the view direction (eye - at); choose a different up vector');
  }
  const u = normalize(c);
  const v = cross(w, u);
  const V = [
    u[0],
    v[0],
    w[0],
    0,
    u[1],
    v[1],
    w[1],
    0,
    u[2],
    v[2],
    w[2],
    0,
    -dot(u, eye),
    -dot(v, eye),
    -dot(w, eye),
    1,
  ];
  return { u, v, w, V };
}

const D = Math.PI / 180;

// three.js 'XYZ' Euler order means the rotation is applied as
// R = Rx * Ry * Rz to a column vector (i.e. Rz happens first, then Ry,
// then Rx last) — see THREE.Matrix4.makeRotationFromEuler, case 'XYZ'.
export function makeTRS(tx, ty, tz, rx, ry, rz, sx, sy, sz) {
  const [cx, sxn] = [Math.cos(rx * D), Math.sin(rx * D)],
    [cy, syn] = [Math.cos(ry * D), Math.sin(ry * D)],
    [cz, szn] = [Math.cos(rz * D), Math.sin(rz * D)];

  const r00 = cy * cz,
    r01 = -cy * szn,
    r02 = syn;
  const r10 = cx * szn + sxn * syn * cz,
    r11 = cx * cz - sxn * syn * szn,
    r12 = -sxn * cy;
  const r20 = sxn * szn - cx * syn * cz,
    r21 = sxn * cz + cx * syn * szn,
    r22 = cx * cy;

  return [
    r00 * sx,
    r10 * sx,
    r20 * sx,
    0,
    r01 * sy,
    r11 * sy,
    r21 * sy,
    0,
    r02 * sz,
    r12 * sz,
    r22 * sz,
    0,
    tx,
    ty,
    tz,
    1,
  ];
}

export function perspective(fovYDeg, aspect, near, far) {
  const f = 1 / Math.tan((fovYDeg * D) / 2),
    nf = 1 / (near - far);
  return [
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) * nf,
    -1,
    0,
    0,
    2 * far * near * nf,
    0,
  ];
}
