// vectorbasics.js: points, vectors and the questions a dot and a cross answer, on three.js Vector3 objects. No
// drawing here: scene.js draws it, and the course demo (lib/demos/vector-basics.js) runs these same functions, so a
// value the demo prints beside a line of code is the value that line computed.
//   Points and vectors, frames, normalizing, the operations, the dot product and what it answers, the cross product
//   and what it answers, lines and planes defined several ways, relative position tests, interpolation.
// Every function returns its named intermediate results, and none changes its arguments: three.js methods such as
// add, sub, normalize and cross change the vector they are called on, hence the clone() calls. Unity's Vector3 is a
// value type and its operators make new vectors, so VectorBasics.cs needs none.
// The same functions, line for line where the languages allow, are VectorBasics.cs in ../unity/
// (lib/tests/programs/vector-basics.test.mjs runs both on the same inputs and compares the numbers).
import { Vector3, Vector4, Matrix4 } from '../../../vendor/three.module.js';

// #region Settings
// Below EPS a length, a dot product or a signed distance counts as zero. Unity's floats have about 7 digits, so the
// two tracks share a value that rounding does not reach for vectors of ordinary size.
export const EPS = 1e-4;
// #endregion

// #region Points and vectors: subtract, add, move the origin
// point - point = vector; point + vector = point. Moving the origin changes the coordinates of P and Q, and not v.
export function pointsAndVectors(p, q, o) {
  const v = q.clone().sub(p);
  const r = p.clone().add(v);
  const pFromO = p.clone().sub(o);
  const qFromO = q.clone().sub(o);
  const vFromO = qFromO.clone().sub(pFromO);
  return { v, r, pFromO, qFromO, vFromO };
}
// #endregion

// #region Points and vectors: what adds and what does not
// Adding two points adds their coordinates, and those depend on the origin. Weights that sum to 1 cancel the origin:
// (1 - t)(P - O) + t(Q - O) + O = (1 - t)P + tQ, for every O.
export function affineCombination(p, q, o, t) {
  const pFromO = p.clone().sub(o);
  const qFromO = q.clone().sub(o);
  const sum = o.clone().add(pFromO).add(qFromO);
  const mix = p.clone().multiplyScalar(1 - t).addScaledVector(q, t);
  return { pFromO, qFromO, sum, mix };
}
// #endregion

// #region Points and vectors: w = 1 and w = 0
// A 4 x 4 matrix multiplies (x, y, z, w). The translation column is scaled by w, so it moves a point (w = 1) and not
// a vector (w = 0). This is the whole difference in a transform.
export function homogeneous(p, v, move) {
  const m = new Matrix4().makeTranslation(move.x, move.y, move.z);
  const pw = new Vector4(p.x, p.y, p.z, 1);
  const vw = new Vector4(v.x, v.y, v.z, 0);
  const pMoved = pw.clone().applyMatrix4(m);
  const vMoved = vw.clone().applyMatrix4(m);
  return { pMoved, vMoved };
}
// #endregion

// #region Frames: build one from two vectors
// Gram-Schmidt: u is a's direction, v is what is left of b after removing its part along u, and the cross product
// gives the third axis. b parallel to a leaves nothing across: no frame.
export function buildFrame(a, b) {
  const u = a.clone().normalize();
  const along = u.clone().multiplyScalar(b.dot(u));
  const across = b.clone().sub(along);
  const acrossLen = across.length();
  const v = across.clone().normalize();
  const w = new Vector3().crossVectors(u, v);
  return { u, along, across, acrossLen, v, w };
}
// #endregion

// #region Frames: a point's coordinates in a frame
// With orthonormal axes each coordinate is a dot product with the arrow from the frame's origin to the point.
// three.js: object.worldToLocal(p), or new Matrix4().makeBasis(u, v, w).setPosition(o) and its inverse.
export function pointInFrame(p, o, u, v, w) {
  const r = p.clone().sub(o);
  const x = r.dot(u);
  const y = r.dot(v);
  const z = r.dot(w);
  const back = o.clone().addScaledVector(u, x).addScaledVector(v, y).addScaledVector(w, z);
  return { r, x, y, z, back };
}
// #endregion

// #region Normalizing: length and direction
// Length is Pythagoras twice. Dividing by it leaves the direction; scaling by s > 0 leaves that direction alone and
// s < 0 reverses it. three.js and GLSL: normalize(). The zero vector has no direction: three.js returns zero, Unity
// returns zero below length 1e-5, and GLSL's normalize(vec3(0.0)) is undefined.
export function normalizeVector(v, s) {
  const floor = Math.sqrt(v.x * v.x + v.z * v.z);
  const len = Math.sqrt(floor * floor + v.y * v.y);
  const unit = v.clone().normalize();
  const unitLen = unit.length();
  const scaled = v.clone().multiplyScalar(s);
  const scaledUnit = scaled.clone().normalize();
  return { floor, len, unit, unitLen, scaled, scaledUnit };
}
// #endregion

// #region Operations: add
// Component by component; the arrows go tip to tail, in either order.
export function addVectors(a, b) {
  const sum = a.clone().add(b);
  const sumOther = b.clone().add(a);
  return { sum, sumOther };
}
// #endregion

// #region Operations: subtract
// a - b runs from b's tip to a's tip, and equals a + (-b).
export function subtractVectors(a, b) {
  const diff = a.clone().sub(b);
  const negB = b.clone().negate();
  const viaNeg = a.clone().add(negB);
  return { diff, negB, viaNeg };
}
// #endregion

// #region Operations: scale
// Multiplies each component, so the length by |s|. A negative s reverses the arrow.
export function scaleVector(a, s) {
  const scaled = a.clone().multiplyScalar(s);
  const lenA = a.length();
  const lenScaled = scaled.length();
  return { scaled, lenA, lenScaled };
}
// #endregion

// #region Operations: linear combination
// s a + t b reaches every point of the plane through the origin that holds a and b, and leaves that plane never:
// c . (a x b) is 0 for every s and t.
export function linearCombination(a, b, s, t) {
  const sa = a.clone().multiplyScalar(s);
  const tb = b.clone().multiplyScalar(t);
  const c = sa.clone().add(tb);
  const normal = new Vector3().crossVectors(a, b);
  const offPlane = c.dot(normal);
  return { sa, tb, c, normal, offPlane };
}
// #endregion

// #region Dot: the angle between two vectors
// a . b = |a||b|cos(theta). The clamp keeps rounding from pushing acos out of range; a zero vector gives NaN (no
// direction, no angle). three.js: a.angleTo(b), in radians. GLSL: dot(a, b).
export function angleBetween(a, b) {
  const d = a.x * b.x + a.y * b.y + a.z * b.z;
  const lenA = a.length();
  const lenB = b.length();
  const cosT = d / (lenA * lenB);
  const theta = Math.acos(Math.min(1, Math.max(-1, cosT)));
  const rebuilt = lenA * lenB * Math.cos(theta);
  return { d, lenA, lenB, cosT, theta, rebuilt };
}
// #endregion

// #region Dot: projection
// A dot with a unit vector is a signed length along it, |a|cos(theta). The shadow is that length times the direction;
// what is left is square to b. three.js: a.clone().projectOnVector(b), a.clone().projectOnPlane(n).
export function projectOnto(a, b) {
  const bHat = b.clone().normalize();
  const scalar = a.dot(bHat);
  const proj = bHat.clone().multiplyScalar(scalar);
  const rej = a.clone().sub(proj);
  const check = rej.dot(b);
  return { bHat, scalar, proj, rej, check };
}
// #endregion

// #region Dot: in front, behind, inside a cone
// The sign of a dot says which half space a direction is in. Comparing it with cos(half the field of view) tests a
// cone without an acos. A back face is the same test: the normal against the direction to the eye.
export function facing(f, t, fovDeg) {
  const fHat = f.clone().normalize();
  const tHat = t.clone().normalize();
  const cosT = fHat.dot(tHat);
  const ahead = cosT > 0;
  const cosHalf = Math.cos(fovDeg * 0.5 * Math.PI / 180);
  const inCone = cosT > cosHalf;
  return { fHat, tHat, cosT, ahead, cosHalf, inCone };
}
// #endregion

// #region Dot: Lambert shading
// Light on a surface falls off with the cosine of the angle to the normal, and is zero past 90 degrees. Both vectors
// must be unit length. In a shader: max(dot(n, l), 0.0).
export function lambert(n, l) {
  const nHat = n.clone().normalize();
  const lHat = l.clone().normalize();
  const cosT = nHat.dot(lHat);
  const diffuse = Math.max(0, cosT);
  return { nHat, lHat, cosT, diffuse };
}
// #endregion

// #region Dot: reflection
// Reverse the part along the normal, keep the part across it: r = d - 2(d . n)n, for a unit n. three.js:
// d.clone().reflect(n). GLSL: reflect(d, n).
export function reflectVector(d, n) {
  const nHat = n.clone().normalize();
  const dn = d.dot(nHat);
  const along = nHat.clone().multiplyScalar(dn);
  const across = d.clone().sub(along);
  const r = across.clone().sub(along);
  return { nHat, dn, along, across, r };
}
// #endregion

// #region Cross: the product and its checks
// Each component takes the other two in cyclic order. The result is square to both inputs, and b x a is its opposite.
// atan2 of the two products gives the angle accurately near 0 and 180 degrees, where acos loses digits. GLSL:
// cross(a, b).
export function crossProduct(a, b) {
  const cx = a.y * b.z - a.z * b.y;
  const cy = a.z * b.x - a.x * b.z;
  const cz = a.x * b.y - a.y * b.x;
  const c = new Vector3().crossVectors(a, b);
  const flipped = new Vector3().crossVectors(b, a);
  const dotA = c.dot(a);
  const dotB = c.dot(b);
  const theta = Math.atan2(c.length(), a.dot(b));
  return { cx, cy, cz, c, flipped, dotA, dotB, theta };
}
// #endregion

// #region Cross: area
// |a x b| = |a||b|sin(theta): the base |b| times the height |a|sin(theta). A triangle on the same two edges is half.
export function areaFromCross(a, b) {
  const c = new Vector3().crossVectors(a, b);
  const area = c.length();
  const triArea = area / 2;
  const baseLen = b.length();
  const height = baseLen > EPS ? area / baseLen : 0;
  const sinT = area / (a.length() * baseLen);
  return { c, area, triArea, baseLen, height, sinT };
}
// #endregion

// #region Cross: a triangle's normal
// Two edges from one corner, crossed. Swapping two corners reverses the winding and the normal, which is how a
// renderer tells a front face from a back face. Collinear corners give the zero vector.
export function triangleNormal(p0, p1, p2) {
  const e1 = p1.clone().sub(p0);
  const e2 = p2.clone().sub(p0);
  const n = new Vector3().crossVectors(e1, e2);
  const area = n.length() / 2;
  const nHat = n.clone().normalize();
  const d = nHat.dot(p0);
  return { e1, e2, n, area, nHat, d };
}
// #endregion

// #region Cross: which side of an edge
// Seen from the side up points to, s > 0 means p is to the left of the edge from a to b in right-handed axes. In
// Unity's left-handed axes the same numbers mean the right. Same sign at every edge of a convex polygon: inside.
export function sideOfEdge(a, b, p, up) {
  const e = b.clone().sub(a);
  const r = p.clone().sub(a);
  const c = new Vector3().crossVectors(e, r);
  const s = c.dot(up);
  return { e, r, c, s };
}
// #endregion

// #region Cross: triple product
// a . (b x c) is the signed volume of the box on three edges; zero means the three vectors lie in one plane. Its
// sign says whether (a, b, c) has the handedness of the axes.
export function tripleProduct(a, b, c) {
  const bc = new Vector3().crossVectors(b, c);
  const volume = a.dot(bc);
  const size = Math.abs(volume);
  const coplanar = size < EPS;
  return { bc, volume, size, coplanar };
}
// #endregion

// #region Lines: a point and a direction
// X(t) = P + t d. Every real t is on the line, t >= 0 is a ray, and with d = B - A the range 0 <= t <= 1 is a segment.
export function lineFromPointDirection(p, d, t) {
  const x = p.clone().addScaledVector(d, t);
  const along = t * d.length();
  return { x, along };
}
// #endregion

// #region Lines: two points
// The direction is the difference. t = 0 is at A and t = 1 is at B.
export function lineFromTwoPoints(a, b, t) {
  const d = b.clone().sub(a);
  const len = d.length();
  const x = a.clone().addScaledVector(d, t);
  return { d, len, x };
}
// #endregion

// #region Lines: where two planes meet
// With planes n1 . X = c1 and n2 . X = c2, the line runs along n1 x n2, square to both normals. This p satisfies both
// equations and is the point of the line nearest the origin. Parallel planes give d = 0: no line.
export function lineFromTwoPlanes(n1, c1, n2, c2) {
  const d = new Vector3().crossVectors(n1, n2);
  const dd = d.dot(d);
  const t1 = new Vector3().crossVectors(n2, d).multiplyScalar(c1);
  const t2 = new Vector3().crossVectors(d, n1).multiplyScalar(c2);
  const p = t1.clone().add(t2).divideScalar(dd);
  return { d, dd, t1, t2, p };
}
// #endregion

// #region Lines: direction and moment
// Pluecker coordinates (d : m) with m = P x d. m is the same for every point P of the line, so the pair names the line
// and not a point on it. d . m = 0 always, and |m| / |d| is the line's distance from the origin.
export function lineMoment(p, d) {
  const m = new Vector3().crossVectors(p, d);
  const dd = d.dot(d);
  const near = new Vector3().crossVectors(d, m).divideScalar(dd);
  const dist = m.length() / Math.sqrt(dd);
  const check = d.dot(m);
  return { m, dd, near, dist, check };
}
// #endregion

// #region Lines: in the plane, ax + by = c
// (a, b) is the line's normal, and (b, -a) its direction. y = mx + k is the same line unless b = 0, where the slope
// does not exist, which is why graphics code prefers this form.
export function line2D(a, b, c) {
  const n = new Vector3(a, b, 0);
  const nn = n.dot(n);
  const near = n.clone().multiplyScalar(c / nn);
  const dir = new Vector3(b, -a, 0);
  const vertical = Math.abs(b) < EPS;
  const slope = -a / b;
  const intercept = c / b;
  return { n, nn, near, dir, vertical, slope, intercept };
}
// #endregion

// #region Planes: a point and a normal
// n . (X - Q) = 0: the arrow from Q to any point of the plane is square to n. Expanded, n . X = d with d = n . Q.
// three.js: new Plane().setFromNormalAndCoplanarPoint(n, q), which stores n . X + constant = 0, so constant = -d.
export function planeFromPointNormal(q, n, x) {
  const nHat = n.clone().normalize();
  const d = n.dot(q);
  const toX = x.clone().sub(q);
  const s = toX.dot(nHat);
  return { nHat, d, toX, s };
}
// #endregion

// #region Planes: three points
// Two edges crossed give the normal; collinear points give zero and no plane. three.js: new
// Plane().setFromCoplanarPoints(a, b, c).
export function planeFromThreePoints(a, b, c) {
  const u = b.clone().sub(a);
  const v = c.clone().sub(a);
  const n = new Vector3().crossVectors(u, v);
  const d = n.dot(a);
  const collinear = n.length() < EPS;
  return { u, v, n, d, collinear };
}
// #endregion

// #region Planes: a point and two directions
// X(s, t) = Q + s u + t v covers the plane, and n = u x v turns it into the implicit form. The check is 0 for all s, t.
export function planeFromPointDirections(q, u, v, s, t) {
  const n = new Vector3().crossVectors(u, v);
  const x = q.clone().addScaledVector(u, s).addScaledVector(v, t);
  const d = n.dot(q);
  const check = n.dot(x) - d;
  return { n, x, d, check };
}
// #endregion

// #region Planes: ax + by + cz = d
// (a, b, c) is the normal. Dividing through by its length gives the normal form nHat . X = dist, where dist is the
// signed distance from the origin and q the plane's point nearest the origin.
export function planeFromImplicit(a, b, c, d) {
  const n = new Vector3(a, b, c);
  const len = n.length();
  const nHat = n.clone().normalize();
  const dist = d / len;
  const q = nHat.clone().multiplyScalar(dist);
  return { n, len, nHat, dist, q };
}
// #endregion

// #region Tests: point and plane
// The signed distance: positive on the side n points to, zero on the plane. Removing it leaves the foot.
// three.js: plane.distanceToPoint(p). Unity: plane.GetDistanceToPoint(p).
export function pointPlane(p, q, n) {
  const nHat = n.clone().normalize();
  const s = p.clone().sub(q).dot(nHat);
  const foot = p.clone().addScaledVector(nHat, -s);
  let side = 'on';
  if (s > EPS) side = 'front';
  else if (s < -EPS) side = 'behind';
  return { nHat, s, foot, side };
}
// #endregion

// #region Tests: point and line
// The dot finds the foot; the cross gives the same distance without it, as the parallelogram's area over its base.
export function pointLine(p, a, d) {
  const r = p.clone().sub(a);
  const t = r.dot(d) / d.dot(d);
  const foot = a.clone().addScaledVector(d, t);
  const dist = p.distanceTo(foot);
  const crossDist = new Vector3().crossVectors(d, r).length() / d.length();
  return { r, t, foot, dist, crossDist };
}
// #endregion

// #region Tests: point and segment
// The line's parameter, clamped to the segment: past an end, the nearest point is that end.
// three.js: new Line3(a, b).closestPointToPoint(p, true, target).
export function pointSegment(p, a, b) {
  const d = b.clone().sub(a);
  const dd = d.dot(d);
  const raw = dd > EPS ? p.clone().sub(a).dot(d) / dd : 0;
  const t = Math.min(1, Math.max(0, raw));
  const near = a.clone().addScaledVector(d, t);
  const dist = p.distanceTo(near);
  return { d, dd, raw, t, near, dist };
}
// #endregion

// #region Tests: point and triangle
// Each barycentric weight is the signed area of the sub-triangle opposite that corner, over the whole area. All three
// non-negative: the point's foot on the plane is inside. three.js: new Triangle(a, b, c).getBarycoord(p, target).
export function pointTriangle(p, a, b, c) {
  const n = new Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a));
  const nn = n.dot(n);
  const ra = a.clone().sub(p);
  const rb = b.clone().sub(p);
  const rc = c.clone().sub(p);
  const wa = new Vector3().crossVectors(rb, rc).dot(n) / nn;
  const wb = new Vector3().crossVectors(rc, ra).dot(n) / nn;
  const wc = new Vector3().crossVectors(ra, rb).dot(n) / nn;
  const height = p.clone().sub(a).dot(n) / Math.sqrt(nn);
  const inside = wa >= 0 && wb >= 0 && wc >= 0;
  return { n, nn, wa, wb, wc, height, inside };
}
// #endregion

// #region Tests: point and polygon
// A ray from p along +x crosses the polygon's edges: an odd count is inside (even-odd). Counting each crossing +1 or
// -1 by the edge's direction gives the winding number; the two rules differ only where a polygon crosses itself.
// The polygon lies in the plane y = 0, and p is read by its x and z.
export function pointPolygon(p, verts) {
  let crossings = 0;
  let winding = 0;
  for (let i = 0; i < verts.length; i++) {
    const v0 = verts[i];
    const v1 = verts[(i + 1) % verts.length];
    if ((v0.z > p.z) !== (v1.z > p.z)) {
      const t = (p.z - v0.z) / (v1.z - v0.z);
      if (v0.x + t * (v1.x - v0.x) > p.x) {
        crossings += 1;
        winding += v1.z > v0.z ? 1 : -1;
      }
    }
  }
  const evenOdd = crossings % 2 === 1;
  const nonZero = winding !== 0;
  return { crossings, winding, evenOdd, nonZero };
}
// #endregion

// #region Tests: is a polygon convex
// Walk the corners and cross each edge with the next. One sign all the way round: convex. Only then does the shorter
// test apply, the same side of every edge.
export function polygonConvex(verts) {
  let positive = 0;
  let negative = 0;
  for (let i = 0; i < verts.length; i++) {
    const v0 = verts[i];
    const v1 = verts[(i + 1) % verts.length];
    const v2 = verts[(i + 2) % verts.length];
    const e0 = v1.clone().sub(v0);
    const e1 = v2.clone().sub(v1);
    const turn = new Vector3().crossVectors(e0, e1).y;
    if (turn > EPS) positive += 1;
    if (turn < -EPS) negative += 1;
  }
  const convex = positive === 0 || negative === 0;
  return { positive, negative, convex };
}
// #endregion

// #region Tests: line and line
// d1 x d2 = 0: parallel. Otherwise n = d1 x d2 is square to both lines, and the part of the gap along n is the distance
// between them: zero means they meet, anything else means skew. In 3D, most pairs of lines are skew.
export function lineLine(p1, d1, p2, d2) {
  const n = new Vector3().crossVectors(d1, d2);
  const nn = n.dot(n);
  const r = p2.clone().sub(p1);
  const parallel = nn < EPS;
  const offset = new Vector3().crossVectors(r, d1).length() / d1.length();
  const gap = parallel ? offset : r.dot(n) / Math.sqrt(nn);
  const t1 = parallel ? 0 : new Vector3().crossVectors(r, d2).dot(n) / nn;
  const t2 = parallel ? 0 : new Vector3().crossVectors(r, d1).dot(n) / nn;
  const c1 = p1.clone().addScaledVector(d1, t1);
  const c2 = p2.clone().addScaledVector(d2, t2);
  let kind = 'skew';
  if (parallel) kind = offset < EPS ? 'same line' : 'parallel';
  else if (Math.abs(gap) < EPS) kind = 'intersecting';
  return { n, nn, parallel, gap, t1, t2, c1, c2, kind };
}
// #endregion

// #region Tests: segment and segment
// Minimize the distance over s and t in [0, 1]: solve for the two lines, clamp s, compute t, and if t leaves its range
// clamp it and recompute s. Zero-length and parallel segments fall through the guards. (Ericson, Real-Time Collision
// Detection, section 5.1.9.)
export function segmentSegment(a, b, c, d) {
  const d1 = b.clone().sub(a);
  const d2 = d.clone().sub(c);
  const r = a.clone().sub(c);
  const aa = d1.dot(d1);
  const ee = d2.dot(d2);
  const ff = d2.dot(r);
  const cc = d1.dot(r);
  const bb = d1.dot(d2);
  const denom = aa * ee - bb * bb;
  let s = denom > EPS ? Math.min(1, Math.max(0, (bb * ff - cc * ee) / denom)) : 0;
  let t = ee > EPS ? (bb * s + ff) / ee : 0;
  if (t < 0) {
    t = 0;
    s = aa > EPS ? Math.min(1, Math.max(0, -cc / aa)) : 0;
  } else if (t > 1) {
    t = 1;
    s = aa > EPS ? Math.min(1, Math.max(0, (bb - cc) / aa)) : 0;
  }
  const c1 = a.clone().addScaledVector(d1, s);
  const c2 = c.clone().addScaledVector(d2, t);
  const dist = c1.distanceTo(c2);
  return { s, t, c1, c2, dist };
}
// #endregion

// #region Tests: line and plane
// t = n . (Q - O) / (n . d). A zero denominator means the line runs parallel to the plane, and then the numerator says
// whether it lies in it. t < 0: the line meets the plane, a ray from O does not. three.js: ray.intersectPlane.
// Unity: plane.Raycast(ray, out enter).
export function linePlane(o, d, q, n) {
  const denom = n.dot(d);
  const num = n.dot(q.clone().sub(o));
  const parallel = Math.abs(denom) < EPS;
  const t = parallel ? 0 : num / denom;
  const hit = o.clone().addScaledVector(d, t);
  let kind = 'hit ahead';
  if (parallel) kind = Math.abs(num) < EPS ? 'in the plane' : 'parallel';
  else if (t < 0) kind = 'hit behind';
  return { denom, num, parallel, t, hit, kind };
}
// #endregion

// #region Tests: segment and plane
// Opposite signed distances at the two ends: the segment crosses, at the fraction sa / (sa - sb) of its length. No
// square root is needed, so n need not be unit length.
export function segmentPlane(a, b, q, n) {
  const sa = a.clone().sub(q).dot(n);
  const sb = b.clone().sub(q).dot(n);
  const crosses = sa * sb < 0;
  const t = crosses ? sa / (sa - sb) : 0;
  const hit = a.clone().lerp(b, t);
  let kind = 'same side';
  if (crosses) kind = 'crosses';
  else if (Math.abs(sa) < EPS && Math.abs(sb) < EPS) kind = 'in the plane';
  else if (Math.abs(sa) < EPS || Math.abs(sb) < EPS) kind = 'touches';
  return { sa, sb, crosses, t, hit, kind };
}
// #endregion

// #region Tests: segment and triangle
// Two tests composed: the segment crosses the triangle's plane, and the crossing point's barycentric weights are all
// non-negative. This is a ray tracer's or a mouse pick's inner loop. three.js: ray.intersectTriangle.
export function segmentTriangle(a, b, p0, p1, p2) {
  const n = new Vector3().crossVectors(p1.clone().sub(p0), p2.clone().sub(p0));
  const plane = segmentPlane(a, b, p0, n);
  const tri = pointTriangle(plane.hit, p0, p1, p2);
  let kind = plane.kind;
  if (plane.crosses) kind = tri.inside ? 'hit' : 'outside the triangle';
  return { n, sa: plane.sa, sb: plane.sb, t: plane.t, hit: plane.hit, wa: tri.wa, wb: tri.wb, wc: tri.wc, kind };
}
// #endregion

// #region Tests: segment and polygon
// The same composition with the polygon's own inside test: the plane first, then the crossing number at the hit point.
// The polygon lies in y = 0, so n is the y axis.
export function segmentPolygon(a, b, verts) {
  const n = new Vector3(0, 1, 0);
  const plane = segmentPlane(a, b, verts[0], n);
  const test = pointPolygon(plane.hit, verts);
  let kind = plane.kind;
  if (plane.crosses) kind = test.evenOdd ? 'hit' : 'outside the polygon';
  return { sa: plane.sa, sb: plane.sb, t: plane.t, hit: plane.hit, crossings: test.crossings, kind };
}
// #endregion

// #region Tests: triangle and plane
// The three corners' signed distances decide it. A corner on the plane is a cut point, and so is each edge whose ends
// have opposite signs: a triangle crossing a plane is cut along a segment.
export function trianglePlane(p0, p1, p2, q, n) {
  const verts = [p0, p1, p2];
  const s0 = p0.clone().sub(q).dot(n);
  const s1 = p1.clone().sub(q).dot(n);
  const s2 = p2.clone().sub(q).dot(n);
  const s = [s0, s1, s2];
  const cut0 = new Vector3();
  const cut1 = new Vector3();
  let cuts = 0;
  for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3;
    const point = new Vector3();
    let found = false;
    if (Math.abs(s[i]) < EPS) {
      point.copy(verts[i]);
      found = true;
    } else if (Math.abs(s[j]) >= EPS && s[i] * s[j] < 0) {
      point.lerpVectors(verts[i], verts[j], s[i] / (s[i] - s[j]));
      found = true;
    }
    if (found && cuts === 0) cut0.copy(point);
    if (found && cuts === 1) cut1.copy(point);
    if (found) cuts += 1;
  }
  const lo = Math.min(s0, s1, s2);
  const hi = Math.max(s0, s1, s2);
  let kind = 'crosses';
  if (lo > EPS) kind = 'all in front';
  else if (hi < -EPS) kind = 'all behind';
  else if (lo > -EPS && hi < EPS) kind = 'in the plane';
  else if (lo > -EPS || hi < EPS) kind = 'touches';
  return { s0, s1, s2, cuts, cut0, cut1, kind };
}
// #endregion

// #region Tests: plane and plane
// Normals not parallel: the planes meet in a line, at the angle between the normals. Parallel: the gap along the normal
// tells the same plane from two separate ones.
export function planePlane(q1, n1, q2, n2) {
  const c1 = n1.dot(q1);
  const c2 = n2.dot(q2);
  const line = lineFromTwoPlanes(n1, c1, n2, c2);
  const parallel = line.dd < EPS;
  const gap = q2.clone().sub(q1).dot(n1.clone().normalize());
  const angle = Math.atan2(Math.sqrt(line.dd), n1.dot(n2));
  let kind = 'meet in a line';
  if (parallel) kind = Math.abs(gap) < EPS ? 'same plane' : 'parallel';
  return { c1, c2, d: line.d, dd: line.dd, parallel, p: line.p, gap, angle, kind };
}
// #endregion

// #region Tests: triangle and triangle
// First the early out: every corner of one triangle on one side of the other's plane. Then each triangle's edges
// against the other triangle: two triangles intersect exactly when an edge of one pierces the other. Triangles in one
// plane need a different test: an edge pair that touches, or one corner inside the other triangle.
function edgesHitting(p0, p1, p2, q0, q1, q2) {
  let hits = 0;
  if (segmentTriangle(q0, q1, p0, p1, p2).kind === 'hit') hits += 1;
  if (segmentTriangle(q1, q2, p0, p1, p2).kind === 'hit') hits += 1;
  if (segmentTriangle(q2, q0, p0, p1, p2).kind === 'hit') hits += 1;
  return hits;
}

function coplanarOverlap(a, b) {
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const pair = segmentSegment(a[i], a[(i + 1) % 3], b[j], b[(j + 1) % 3]);
      if (pair.dist < EPS) return true;
    }
  }
  return pointTriangle(b[0], a[0], a[1], a[2]).inside || pointTriangle(a[0], b[0], b[1], b[2]).inside;
}

export function triangleTriangle(a0, a1, a2, b0, b1, b2) {
  const n = new Vector3().crossVectors(a1.clone().sub(a0), a2.clone().sub(a0));
  const s0 = b0.clone().sub(a0).dot(n);
  const s1 = b1.clone().sub(a0).dot(n);
  const s2 = b2.clone().sub(a0).dot(n);
  const lo = Math.min(s0, s1, s2);
  const hi = Math.max(s0, s1, s2);
  let hits = 0;
  let kind = 'no contact';
  if (lo > EPS || hi < -EPS) {
    kind = 'one side of the plane';
  } else if (lo > -EPS && hi < EPS) {
    kind = coplanarOverlap([a0, a1, a2], [b0, b1, b2]) ? 'coplanar, overlapping' : 'coplanar, apart';
  } else {
    hits = edgesHitting(a0, a1, a2, b0, b1, b2) + edgesHitting(b0, b1, b2, a0, a1, a2);
    if (hits > 0) kind = 'intersecting';
  }
  return { n, s0, s1, s2, hits, kind };
}
// #endregion

// #region Interpolation: lerp
// Weights 1 - t and t that sum to 1. The result moves at constant speed along the chord, so its length dips between two
// directions. three.js: a.clone().lerp(b, t). Unity: Vector3.LerpUnclamped(a, b, t), since Vector3.Lerp clamps t to
// [0, 1]. GLSL: mix(a, b, t). HLSL: lerp(a, b, t).
export function lerpVector(a, b, t) {
  const w0 = 1 - t;
  const w1 = t;
  const x = a.clone().multiplyScalar(w0).addScaledVector(b, w1);
  const len = x.length();
  return { w0, w1, x, len };
}
// #endregion

// #region Interpolation: lerp, nlerp and slerp
// Lerp cuts the chord. Normalizing it (nlerp) puts it back on the sphere but at uneven speed. Slerp weights by sines to
// turn at constant speed; at 0 and 180 degrees sin(theta) is 0, so it falls back to lerp's weights. At 180 degrees no
// single plane holds the turn. Unity has Vector3.Slerp; three.js has no slerp for Vector3 (only for Quaternion).
export function slerpVector(a, b, t) {
  const aHat = a.clone().normalize();
  const bHat = b.clone().normalize();
  const cosT = Math.min(1, Math.max(-1, aHat.dot(bHat)));
  const theta = Math.acos(cosT);
  const sinT = Math.sin(theta);
  const w0 = sinT > EPS ? Math.sin((1 - t) * theta) / sinT : 1 - t;
  const w1 = sinT > EPS ? Math.sin(t * theta) / sinT : t;
  const slerp = aHat.clone().multiplyScalar(w0).addScaledVector(bHat, w1);
  const chord = aHat.clone().lerp(bHat, t);
  const nlerp = chord.clone().normalize();
  return { aHat, bHat, cosT, theta, sinT, w0, w1, slerp, chord, nlerp };
}
// #endregion

// #region Interpolation: across a triangle
// Barycentric weights interpolate anything stored at the corners. A rasterizer does this for normals, colors and
// texture coordinates. Interpolated unit normals are shorter than 1, so a fragment shader normalizes them again.
export function barycentricInterpolate(p, p0, p1, p2, v0, v1, v2) {
  const tri = pointTriangle(p, p0, p1, p2);
  const w0 = tri.wa;
  const w1 = tri.wb;
  const w2 = tri.wc;
  const x = v0.clone().multiplyScalar(w0).addScaledVector(v1, w1).addScaledVector(v2, w2);
  const xHat = x.clone().normalize();
  return { w0, w1, w2, x, xHat };
}
// #endregion

// #region Interpolation: across a quad
// Bilinear: lerp along two opposite edges by s, then between those results by t. This is how a texture sample blends
// four texels. The result is a curved patch when the four points do not lie in one plane.
export function bilinearPatch(p00, p10, p01, p11, s, t) {
  const bottom = p00.clone().lerp(p10, s);
  const top = p01.clone().lerp(p11, s);
  const x = bottom.clone().lerp(top, t);
  return { bottom, top, x };
}
// #endregion
