// viewlab.js: viewing, the lecture's way. A camera is a frame (eye, at, up give u, v, w); the view matrix V is the inverse of its
// pose; the projection matrix P puts the depth into w; the divide by w gives normalized device coordinates (NDC); the viewport
// puts those on pixels. Here: that chain for one point, perspective and orthographic and off-axis projections, the dolly zoom, the
// depth curve, clipping in clip space (Sutherland-Hodgman), culling against the six frustum planes, a pixel turned back into a
// ray, and the arcball. No three.js: points are arrays [x, y, z], clip-space points [x, y, z, w]. A 4x4 matrix is sixteen numbers
// stored column by column (element (row, col) at 4 col + row, the shift at 12, 13, 14), the layout of three.js and of Unity's
// Matrix4x4. scene.js draws it, and the course demo (lib/demos/view-lab.js) runs these same functions, so a value the demo
// prints beside a line of code is the value that line computed. No function changes its arguments.
// The same functions, line for line where the languages allow, are ViewLab.cs in ../unity/
// (lib/tests/programs/view-lab.test.mjs runs both on the same inputs and compares the numbers).

// #region Settings and helpers
// Below EPS a length counts as zero. The six frustum planes are always taken in this order. Vectors are plain arrays; Unity's
// Vector3 has the 3D operations built in.
export const EPS = 1e-6;
export const PLANE_NAMES = ['near', 'far', 'left', 'right', 'bottom', 'top'];

export function toRadians(degrees) { return degrees * Math.PI / 180; }
export function toDegrees(radians) { return radians * 180 / Math.PI; }
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
export function lerp4(a, b, t) {
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2]), a[3] + t * (b[3] - a[3])];
}
export function mulMat(a, b) {
  const m = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[4 * k + row] * b[4 * col + k];
      m[4 * col + row] = sum;
    }
  }
  return m;
}
export function mulVec4(m, v) {
  const r = [0, 0, 0, 0];
  for (let row = 0; row < 4; row++) {
    r[row] = m[row] * v[0] + m[4 + row] * v[1] + m[8 + row] * v[2] + m[12 + row] * v[3];
  }
  return r;
}
export function matrixRow(m, row) { return [m[row], m[4 + row], m[8 + row], m[12 + row]]; }
export function invert4(m) {
  const a = [];
  for (let r = 0; r < 4; r++) {
    const row = [];
    for (let c = 0; c < 4; c++) row.push(m[4 * c + r]);
    for (let c = 0; c < 4; c++) row.push(r === c ? 1 : 0);
    a.push(row);
  }
  let singular = false;
  for (let c = 0; c < 4; c++) {
    let pivot = c;
    for (let r = c + 1; r < 4; r++) if (Math.abs(a[r][c]) > Math.abs(a[pivot][c])) pivot = r;
    if (Math.abs(a[pivot][c]) < 1e-12) { singular = true; break; }
    const swap = a[c];
    a[c] = a[pivot];
    a[pivot] = swap;
    const d = a[c][c];
    for (let j = 0; j < 8; j++) a[c][j] = a[c][j] / d;
    for (let r = 0; r < 4; r++) {
      if (r === c) continue;
      const f = a[r][c];
      for (let j = 0; j < 8; j++) a[r][j] = a[r][j] - f * a[c][j];
    }
  }
  const inverse = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (!singular) {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) inverse[4 * c + r] = a[r][4 + c];
  }
  return { inverse, singular };
}
// The point a matrix sends an NDC corner back to: multiply, then divide by the fourth coordinate.
export function unproject(inverse, ndc) {
  const h = mulVec4(inverse, [ndc[0], ndc[1], ndc[2], 1]);
  const w = Math.abs(h[3]) > EPS ? h[3] : 1;
  return [h[0] / w, h[1] / w, h[2] / w];
}
// T(t) Ry(degrees): turn about the y axis, then shift.
export function modelMatrix(tx, ty, tz, degrees) {
  const c = Math.cos(toRadians(degrees));
  const s = Math.sin(toRadians(degrees));
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, tx, ty, tz, 1];
}
// The turn by an angle about a unit axis (Rodrigues), as a 4x4.
export function rotationAbout(axis, degrees) {
  const c = Math.cos(toRadians(degrees));
  const s = Math.sin(toRadians(degrees));
  const t = 1 - c;
  const x = axis[0];
  const y = axis[1];
  const z = axis[2];
  return [t * x * x + c, t * x * y + s * z, t * x * z - s * y, 0,
    t * x * y - s * z, t * y * y + c, t * y * z + s * x, 0,
    t * x * z + s * y, t * y * z - s * x, t * z * z + c, 0,
    0, 0, 0, 1];
}
// #endregion

// #region Frame: the eye on a sphere
// The demo camera sits on a sphere of radius distance around at: azimuth turns it about the vertical axis from +z toward +x,
// elevation lifts it. At azimuth 35, elevation 20, distance 7 around (0, 0.5, 0) the eye is (3.773, 2.894, 5.388).
export function orbitEye(at, azimuth, elevation, distance) {
  const az = toRadians(azimuth);
  const el = toRadians(elevation);
  const level = distance * Math.cos(el);
  return [at[0] + level * Math.sin(az), at[1] + distance * Math.sin(el), at[2] + level * Math.cos(az)];
}
// #endregion

// #region Frame: eye, at, up
// A camera is a frame. w points from the target back to the eye, so the camera looks down -w. u = up x w points right and
// v = w x u points up; each cross is perpendicular to its inputs, so u, v, w are orthonormal. V subtracts the eye, then dots with
// each axis: its rows are u, v, w and its last column is -u.eye, -v.eye, -w.eye. If up is parallel to w the cross product is
// zero and there is no right axis: valid is false and u and v come back as zero.
export function lookAt(eye, at, up) {
  const toEye = sub(eye, at);
  const distance = length(toEye);
  const w = normalize(toEye);
  const upCrossW = cross(up, w);
  const crossLength = length(upCrossW);
  const valid = crossLength > EPS;
  const u = valid ? scale(upCrossW, 1 / crossLength) : [0, 0, 0];
  const v = cross(w, u);
  const tu = -dot(u, eye);
  const tv = -dot(v, eye);
  const tw = -dot(w, eye);
  const V = [u[0], v[0], w[0], 0,
    u[1], v[1], w[1], 0,
    u[2], v[2], w[2], 0,
    tu, tv, tw, 1];
  return { toEye, distance, w, upCrossW, crossLength, valid, u, v, tu, tv, tw, V };
}
// #endregion

// #region View matrix: three checks
// Three checks catch every wrong view matrix: unit rows, orthogonal rows, and the eye landing on the origin. V is the inverse of
// the camera's pose C (axes in columns, eye in the last column), so V C is the identity. The wrong matrix keeps the shift and
// throws the basis away: the camera always faces world -z, whatever at is.
export function viewChecks(eye, at, up) {
  const look = lookAt(eye, at, up);
  const dots = [dot(look.u, look.v), dot(look.v, look.w), dot(look.w, look.u)];
  const lengths = [length(look.u), length(look.v), length(look.w)];
  const handed = dot(cross(look.u, look.v), look.w);
  const eyeView = mulVec4(look.V, [eye[0], eye[1], eye[2], 1]);
  const atView = mulVec4(look.V, [at[0], at[1], at[2], 1]);
  const pose = [look.u[0], look.u[1], look.u[2], 0,
    look.v[0], look.v[1], look.v[2], 0,
    look.w[0], look.w[1], look.w[2], 0,
    eye[0], eye[1], eye[2], 1];
  const product = mulMat(look.V, pose);
  const wrong = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -eye[0], -eye[1], -eye[2], 1];
  return { dots, lengths, handed, eyeView, atView, pose, product, wrong };
}
// #endregion

// #region View matrix: the pole
// With up = (0, 1, 0), |up x w| = cos(elevation): u is recovered from a shrinking vector, then from nothing. At 90 degrees the
// eye is straight above at and lookAt has no right axis.
export function poleCheck(at, up, azimuth, elevation, distance) {
  const eye = orbitEye(at, azimuth, elevation, distance);
  const look = lookAt(eye, at, up);
  const cosine = Math.cos(toRadians(elevation));
  return { eye, crossLength: look.crossLength, cosine, valid: look.valid, u: look.u };
}
// #endregion

// #region Projection: perspective
// f = 1 / tan(fov / 2) is the focal length in NDC units. Row 3 is (0, 0, -1, 0), so w' = -z: the divide that follows is the
// divide by depth. The first two rows scale x and y so the edges of the field of view land on +-1. The depth row (A, B) is the
// part that is fitted: -near must map to -1 and -far to +1. top and right are the half height and half width of the near plane.
export function perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(toRadians(fovY) / 2);
  const sx = f / aspect;
  const sy = f;
  const A = (far + near) / (near - far);
  const B = 2 * far * near / (near - far);
  const top = near / f;
  const right = top * aspect;
  const P = [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, A, -1, 0, 0, B, 0];
  return { f, sx, sy, A, B, top, right, P };
}
// #endregion

// #region Projection: field of view and focal length
// The vertical field of view fovY on a sensor of height sensorHeight (24 mm on the 36 x 24 mm frame) is a focal length
// focal = sensorHeight / (2 tan(fovY / 2)). The horizontal field follows from the aspect ratio: tan(fovX / 2) = aspect tan(fovY / 2).
export function lens(fovY, aspect, sensorHeight) {
  const tanHalf = Math.tan(toRadians(fovY) / 2);
  const focal = sensorHeight / (2 * tanHalf);
  const fovX = toDegrees(2 * Math.atan(aspect * tanHalf));
  return { tanHalf, focal, fovX };
}
// #endregion

// #region Projection: orthographic
// The view volume is a box [left, right] x [bottom, top] x [-near, -far]. A scale and a shift put it in the NDC cube; the last
// row is (0, 0, 0, 1), so w' = 1 and there is no divide. Depth is a straight line in z.
export function orthographic(left, right, bottom, top, near, far) {
  const sx = 2 / (right - left);
  const sy = 2 / (top - bottom);
  const A = -2 / (far - near);
  const B = -(far + near) / (far - near);
  const tx = -(right + left) / (right - left);
  const ty = -(top + bottom) / (top - bottom);
  const P = [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, A, 0, tx, ty, B, 1];
  return { sx, sy, A, B, tx, ty, P };
}
// #endregion

// #region Projection: off-axis
// A rectangle [left, right] x [bottom, top] on the near plane that need not be centered on the sightline. A centered rectangle
// (left = -right) gives the ordinary perspective matrix; an off-center one fills the third column's top entries with a skew.
export function frustum(left, right, bottom, top, near, far) {
  const sx = 2 * near / (right - left);
  const sy = 2 * near / (top - bottom);
  const skewX = (right + left) / (right - left);
  const skewY = (top + bottom) / (top - bottom);
  const A = (far + near) / (near - far);
  const B = 2 * far * near / (near - far);
  const P = [sx, 0, 0, 0, 0, sy, 0, 0, skewX, skewY, A, -1, 0, 0, B, 0];
  return { sx, sy, skewX, skewY, A, B, P };
}
// #endregion

// #region Projection: the dolly zoom
// Keep the subject's half height h fixed while the eye moves to distance d: the field of view must satisfy
// d tan(fov / 2) = h. Everything at another distance changes scale, because only the plane at d is held.
export function dollyZoom(halfHeight, distance, gap) {
  const tanHalf = halfHeight / distance;
  const fov = toDegrees(2 * Math.atan(tanHalf));
  const backgroundDistance = distance + gap;
  const backgroundHalfHeight = backgroundDistance * tanHalf;
  return { tanHalf, fov, backgroundDistance, backgroundHalfHeight };
}
// #endregion

// #region Depth: the curve
// After the divide, z_ndc = -A + B / d for a point d in front of the eye (d = -z): a function of 1 / d. The first few units
// after near use most of the range: z_ndc crosses 0 at d = 2 far near / (far + near). windowDepth is the stored value in [0, 1];
// reversed flips it so far is 0. linear is how far d is through [near, far] and orthoNdc is what an orthographic matrix stores.
export function depthCurve(near, far, depth) {
  const A = (far + near) / (near - far);
  const B = 2 * far * near / (near - far);
  const ndc = -A + B / depth;
  const windowDepth = (ndc + 1) / 2;
  const reversed = 1 - windowDepth;
  const linear = (depth - near) / (far - near);
  const orthoNdc = 2 * linear - 1;
  const halfDepth = 2 * far * near / (far + near);
  return { A, B, ndc, windowDepth, reversed, linear, orthoNdc, halfDepth };
}
// #endregion

// #region Depth: what the buffer resolves
// The smallest change in distance that changes the stored value, at distance d. The stored value is
// far (d - near) / (d (far - near)), whose slope is near far / (d^2 (far - near)). A 24-bit fixed buffer moves in steps of 2^-24;
// a float32 moves in steps the size of its spacing at the stored value, which is fine near 0. Reversed depth stores 1 minus the
// value, so far is 0 and float spacing is finest where the curve is flattest.
function floatSpacing(x) {
  let e = 0;
  let y = Math.abs(x);
  if (y === 0) return 0;
  while (y >= 2) { y = y / 2; e = e + 1; }
  while (y < 1) { y = y * 2; e = e - 1; }
  return Math.pow(2, e - 23);
}
export function depthResolution(depth, near, far) {
  const stored = far * (depth - near) / (depth * (far - near));
  const slope = near * far / (depth * depth * (far - near));
  const fixed24 = Math.pow(2, -24) / slope;
  const float32 = floatSpacing(stored) / slope;
  const reversedFloat32 = floatSpacing(1 - stored) / slope;
  return { stored, slope, fixed24, float32, reversedFloat32 };
}
// #endregion

// #region Chain: object to pixel
// One vertex through every stage. M places the object in the world, V moves the world into the camera's frame, P gives clip
// coordinates (x, y, z, w) with w = -z_view. The divide by w gives NDC in [-1, 1], and the viewport maps NDC to pixels with the
// origin at the top left (so y flips) and depth to [0, 1]. A point behind the eye has w < 0: dividing anyway flips it through
// the center of the screen, which is why clipping happens before the divide. naive is that flipped result.
export function chain(M, V, P, object, width, height) {
  const world = mulVec4(M, [object[0], object[1], object[2], 1]);
  const view = mulVec4(V, world);
  const clip = mulVec4(P, view);
  const w = clip[3];
  const behind = w < EPS;
  const ndc = behind ? [0, 0, 0] : [clip[0] / w, clip[1] / w, clip[2] / w];
  const naive = Math.abs(w) > EPS ? [clip[0] / w, clip[1] / w, clip[2] / w] : [0, 0, 0];
  const inside = !behind && Math.abs(ndc[0]) <= 1 && Math.abs(ndc[1]) <= 1 && Math.abs(ndc[2]) <= 1;
  const pixel = [(ndc[0] + 1) / 2 * width, (1 - ndc[1]) / 2 * height];
  const depth = (ndc[2] + 1) / 2;
  return { world, view, clip, w, behind, ndc, naive, inside, pixel, depth };
}
// #endregion

// #region Clip: Sutherland-Hodgman
// Inside the frustum means, before any divide, -w <= x <= w, -w <= y <= w, -w <= z <= w: six linear tests, d >= 0 for each plane.
// Sutherland and Hodgman (1974) clip a polygon against one plane at a time: walk the edges, keep a vertex that is inside, and
// where an edge changes sides emit the crossing at t = d_a / (d_a - d_b), interpolating all four coordinates with that t. The
// output of one plane is the input of the next. Near comes first: it also removes everything behind the eye, where w <= 0.
export function planeDistance(plane, p) {
  if (plane === 0) return p[2] + p[3];
  if (plane === 1) return p[3] - p[2];
  if (plane === 2) return p[0] + p[3];
  if (plane === 3) return p[3] - p[0];
  if (plane === 4) return p[1] + p[3];
  return p[3] - p[1];
}
export function clipAgainstPlane(polygon, plane) {
  const n = polygon.length;
  const distances = [];
  for (let i = 0; i < n; i++) distances.push(planeDistance(plane, polygon[i]));
  const output = [];
  const edgeFrom = [];
  const edgeTo = [];
  const ts = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (distances[i] >= 0) output.push(polygon[i]);
    if ((distances[i] >= 0) !== (distances[j] >= 0)) {
      const t = distances[i] / (distances[i] - distances[j]);
      output.push(lerp4(polygon[i], polygon[j], t));
      edgeFrom.push(i);
      edgeTo.push(j);
      ts.push(t);
    }
  }
  return { distances, output, count: output.length, edgeFrom, edgeTo, ts };
}
export function clipPolygon(polygon) {
  const stages = [];
  const counts = [polygon.length];
  let current = polygon;
  for (let plane = 0; plane < 6; plane++) {
    const stage = clipAgainstPlane(current, plane);
    stages.push(stage);
    counts.push(stage.count);
    current = stage.output;
  }
  return { stages, counts, clipped: current, count: current.length };
}
// #endregion

// #region Cull: the six planes
// The clip inequalities rewritten in world coordinates: with M = P V and r0 .. r3 its rows, clip x, y, z, w are r0 .. r3 dotted
// with the world point (Gribb and Hartmann, 2001). Each plane is a sum or difference of two rows. Dividing by the length of
// (a, b, c) makes a x + b y + c z + d a signed distance, positive inside.
export function frustumPlanes(PV) {
  const rows = [matrixRow(PV, 0), matrixRow(PV, 1), matrixRow(PV, 2), matrixRow(PV, 3)];
  const raw = [];
  const sums = [[3, 2, 1], [3, 2, -1], [3, 0, 1], [3, 0, -1], [3, 1, 1], [3, 1, -1]];
  for (let i = 0; i < 6; i++) {
    const a = rows[sums[i][0]];
    const b = rows[sums[i][1]];
    const k = sums[i][2];
    raw.push([a[0] + k * b[0], a[1] + k * b[1], a[2] + k * b[2], a[3] + k * b[3]]);
  }
  const lengths = [];
  const planes = [];
  for (let i = 0; i < 6; i++) {
    const l = length(raw[i]);
    lengths.push(l);
    planes.push([raw[i][0] / l, raw[i][1] / l, raw[i][2] / l, raw[i][3] / l]);
  }
  return { rows, raw, lengths, planes };
}
// #endregion

// #region Cull: a bounding sphere
// A sphere of radius r at c is outside a plane when its signed distance is below -r, and crosses it when the distance is
// within r. One plane that rejects it rejects the sphere; it is wholly inside only when every distance is at least r.
export function cullSphere(planes, center, radius) {
  const distances = [];
  const crossed = [];
  let rejectedBy = -1;
  let anyCrossed = false;
  for (let i = 0; i < 6; i++) {
    const d = dot(planes[i], center) + planes[i][3];
    distances.push(d);
    crossed.push(d >= -radius && d < radius);
    if (d < -radius && rejectedBy < 0) rejectedBy = i;
    if (d >= -radius && d < radius) anyCrossed = true;
  }
  const verdict = rejectedBy >= 0 ? 'outside' : (anyCrossed ? 'intersecting' : 'inside');
  return { distances, crossed, rejectedBy, verdict };
}
// #endregion

// #region Cull: a bounding box
// For each plane take the box corner farthest along the plane's normal (the p-vertex, chosen by the normal's signs). If even
// that corner is outside, all eight are: reject. The opposite corner (the n-vertex) decides the inside case: if it is inside
// every plane the box is wholly inside.
export function cullBox(planes, low, high) {
  const pVertices = [];
  const pDistances = [];
  const nDistances = [];
  let rejectedBy = -1;
  let anyCrossed = false;
  for (let i = 0; i < 6; i++) {
    const p = planes[i];
    const positive = [p[0] >= 0 ? high[0] : low[0], p[1] >= 0 ? high[1] : low[1], p[2] >= 0 ? high[2] : low[2]];
    const negative = [p[0] >= 0 ? low[0] : high[0], p[1] >= 0 ? low[1] : high[1], p[2] >= 0 ? low[2] : high[2]];
    const pd = dot(p, positive) + p[3];
    const nd = dot(p, negative) + p[3];
    pVertices.push(positive);
    pDistances.push(pd);
    nDistances.push(nd);
    if (pd < 0 && rejectedBy < 0) rejectedBy = i;
    if (nd < 0) anyCrossed = true;
  }
  const verdict = rejectedBy >= 0 ? 'outside' : (anyCrossed ? 'intersecting' : 'inside');
  return { pVertices, pDistances, nDistances, rejectedBy, verdict };
}
// #endregion

// #region Pick: pixel to NDC
// The viewport transform run backward, from the pixel's center: s_x = 2 (p_x + 1/2) / W - 1 and s_y = 1 - 2 (p_y + 1/2) / H.
// The half pixel moves from a pixel's corner to its center, and y flips because pixel rows count down.
export function pixelToNdc(px, py, width, height) {
  const sx = 2 * (px + 0.5) / width - 1;
  const sy = 1 - 2 * (py + 0.5) / height;
  return { sx, sy };
}
// #endregion

// #region Pick: a pixel back to a ray
// Two NDC points with the same (s_x, s_y), one on the near plane (z = -1) and one on the far plane (z = +1), go through the
// inverse of P V and the divide by w: they span the ray. The same direction without any inverse: d_view = (s_x / P[0][0],
// s_y / P[1][1], -1), turned into the world by the camera's axes, which are the rows of V. The eye is -R^T t.
export function pickRay(px, py, width, height, V, P) {
  const s = pixelToNdc(px, py, width, height);
  const inverse = invert4(mulMat(P, V)).inverse;
  const nearPoint = unproject(inverse, [s.sx, s.sy, -1]);
  const farPoint = unproject(inverse, [s.sx, s.sy, 1]);
  const direction = normalize(sub(farPoint, nearPoint));
  const dView = [s.sx / P[0], s.sy / P[5], -1];
  const u = [V[0], V[4], V[8]];
  const v = [V[1], V[5], V[9]];
  const w = [V[2], V[6], V[10]];
  const byBasis = normalize(add(add(scale(u, dView[0]), scale(v, dView[1])), scale(w, dView[2])));
  const shift = [V[12], V[13], V[14]];
  const eye = scale(add(add(scale(u, shift[0]), scale(v, shift[1])), scale(w, shift[2])), -1);
  const nearDistance = length(sub(nearPoint, eye));
  const farDistance = length(sub(farPoint, eye));
  return { sx: s.sx, sy: s.sy, nearPoint, farPoint, direction, dView, byBasis, eye, nearDistance, farDistance };
}
// #endregion

// #region Pick: the ray meets a sphere
// |o + t d - c|^2 = r^2 with |d| = 1 is t^2 + 2 b t + c' = 0, where b = d.(o - c) and c' = |o - c|^2 - r^2. A negative
// discriminant b^2 - c' is a miss; the nearer root is -b - sqrt(discriminant), and it must be in front of the origin.
export function raySphere(origin, direction, center, radius) {
  const oc = sub(origin, center);
  const b = dot(direction, oc);
  const c = dot(oc, oc) - radius * radius;
  const discriminant = b * b - c;
  const root = discriminant >= 0 ? -b - Math.sqrt(discriminant) : 0;
  const hit = discriminant >= 0 && root > 0;
  const t = hit ? root : 0;
  const point = hit ? add(origin, scale(direction, t)) : [0, 0, 0];
  return { b, c, discriminant, hit, t, point };
}
// #endregion

// #region Pick: the ray meets the ground
// A mouse position has two numbers and a world position three: a constraint supplies the third. On the plane y = height the ray
// o + t d arrives at t = (height - o_y) / d_y. A ray with d_y of the wrong sign (aimed above the horizon) never arrives.
export function rayPlane(origin, direction, height) {
  const dy = direction[1];
  const parallel = Math.abs(dy) < EPS;
  const t = parallel ? 0 : (height - origin[1]) / dy;
  const hit = !parallel && t > 0;
  const point = hit ? add(origin, scale(direction, t)) : [0, 0, 0];
  return { dy, parallel, t, hit, point };
}
// #endregion

// #region Arcball: Shoemake
// The picture area is the front of a sphere. A mouse position (x, y) in [-1, 1] lifts to (x, y, sqrt(1 - x^2 - y^2)), or to the rim
// when it falls outside the disk, so the map is continuous across the edge. A drag from p1 to p2 turns about p1 x p2 by
// the angle arccos(p1 . p2): that carries p1 to p2. Shoemake's quaternion (p1 x p2, p1 . p2) has half that angle in it,
// so it turns by twice the angle; doubledAngle and doubledQuaternion are that rotation. Quaternions are (x, y, z, w).
export function arcballPoint(x, y) {
  const r2 = x * x + y * y;
  const outside = r2 > 1;
  const r = Math.sqrt(r2);
  const point = outside ? [x / r, y / r, 0] : [x, y, Math.sqrt(1 - r2)];
  return { point, outside };
}
export function arcballDrag(x1, y1, x2, y2) {
  const p1 = arcballPoint(x1, y1).point;
  const p2 = arcballPoint(x2, y2).point;
  const c = cross(p1, p2);
  const sine = length(c);
  const cosine = dot(p1, p2);
  const axis = sine > EPS ? scale(c, 1 / sine) : [0, 0, 1];
  const angle = toDegrees(Math.atan2(sine, cosine));
  const half = toRadians(angle) / 2;
  const quaternion = [axis[0] * Math.sin(half), axis[1] * Math.sin(half), axis[2] * Math.sin(half), Math.cos(half)];
  const doubledAngle = 2 * angle;
  const doubledQuaternion = [c[0], c[1], c[2], cosine];
  return { p1, p2, axis, angle, quaternion, doubledAngle, doubledQuaternion };
}
// #endregion
