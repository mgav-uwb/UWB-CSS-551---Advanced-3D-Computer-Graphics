// raylab.js: a ray tracer's parts. The ray through a pixel; a ray against a sphere, a triangle and a box; reflection, Snell's law
// and Fresnel; Whitted's recursion over a small scene (shadow rays, mirror and glass, a depth limit) and the tree of rays one
// pixel makes; shadow acne and the offset that cures it; and a bounding-volume hierarchy (BVH) over triangles, built by the
// median or by the surface area heuristic, with a stepped traversal and its test counts. No three.js and no DOM here: vectors
// are arrays [x, y, z], colors are arrays [r, g, b]. scene.js draws the image, and the course demo (lib/demos/ray-lab.js) runs
// these same functions, so a value the demo prints beside a line of code is the value that line computed. No function changes
// its arguments (the BVH builder changes the lists it makes for itself and says so).
// The same functions, line for line where the languages allow, are RayLab.cs in ../unity/
// (lib/tests/programs/ray-lab.test.mjs runs both on the same inputs and compares the numbers).

// #region Settings and vector helpers
// Below EPS a length or a determinant counts as zero. The local shading model is the illumination topic's: ambient, a diffuse
// term and a Phong highlight. NONE and FLOOR are the two values of a hit's index that are not a sphere.
export const EPS = 1e-6;
export const NONE = -2;
export const FLOOR = -1;
export const KD = 0.85;
export const KS = 0.4;
export const SHININESS = 40;

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
export function reflect(d, n) { return sub(d, scale(n, 2 * dot(d, n))); }
export function minPoint(a, b) { return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.min(a[2], b[2])]; }
export function maxPoint(a, b) { return [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.max(a[2], b[2])]; }
// A graphics processing unit (GPU) or Unity stores a position as a 32-bit float: 24 bits of mantissa, so a point near 1 moves in steps of 1.2e-7.
// JavaScript computes in 64 bits; Math.fround rounds to the 32-bit grid (C# floats are already there).
function single3(v, on) { return on ? [Math.fround(v[0]), Math.fround(v[1]), Math.fround(v[2])] : v; }
// #endregion

// #region The ray through a pixel
// A ray is r(t) = o + t d. The camera has eye e and basis u (right), v (up), w (backward). The pixel (px, py) of a width by
// height image has center (sx, sy) in [-1, 1]; the ray runs from the eye through that point of the image plane, one unit in
// front of the eye. This is the projection run backward: no matrix and no divide, the perspective is in the fan of directions.
export function lookAtBasis(eye, target, up) {
  const w = normalize(sub(eye, target));
  const u = normalize(cross(up, w));
  const v = cross(w, u);
  return { u, v, w };
}

export function pixelRay(eye, basis, fovDeg, width, height, px, py) {
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  const sx = (2 * (px + 0.5)) / width - 1;
  const sy = 1 - (2 * (py + 0.5)) / height;
  const across = scale(basis.u, sx * tanHalf * (width / height));
  const upward = scale(basis.v, sy * tanHalf);
  const toward = sub(add(across, upward), basis.w);
  const dir = normalize(toward);
  return { sx, sy, tanHalf, toward, dir };
}
// #endregion

// #region Ray against a sphere
// Put r(t) into |p - c|^2 = r^2. With m = o - c this is a t^2 + 2 b t + c' = 0 with a = d.d, b = m.d, c' = m.m - r^2, so
// t = (-b -/+ sqrt(b^2 - a c')) / a. A negative discriminant is a miss. Otherwise the smaller root is the entry; if only the
// larger root is past tMin the origin is inside and the hit is the exit. No hit is t = Infinity.
export function raySphere(o, d, c, r, tMin) {
  const m = sub(o, c);
  const a = dot(d, d);
  const b = dot(m, d);
  const cPrime = dot(m, m) - r * r;
  const disc = b * b - a * cPrime;
  const root = Math.sqrt(Math.max(disc, 0));
  const t0 = disc >= 0 ? (-b - root) / a : Infinity;
  const t1 = disc >= 0 ? (-b + root) / a : Infinity;
  let kind = 'miss';
  if (disc >= 0 && t0 > tMin) kind = 'hit';
  else if (disc >= 0 && t1 > tMin) kind = 'inside';
  else if (disc >= 0) kind = 'behind';
  const t = kind === 'hit' ? t0 : kind === 'inside' ? t1 : Infinity;
  const hit = kind === 'hit' || kind === 'inside' ? add(o, scale(d, t)) : [0, 0, 0];
  const n = kind === 'hit' || kind === 'inside' ? scale(sub(hit, c), 1 / r) : [0, 0, 0];
  const facing = dot(d, n) > 0 ? scale(n, -1) : n;
  return { m, a, b, cPrime, disc, t0, t1, kind, t, hit, n, facing };
}
// #endregion

// #region Ray against a triangle
// Solve o + t d = A + u e1 + v e2 for t, u and v at once, by Cramer's rule (Moller and Trumbore, 1997). The ray is parallel to
// the triangle's plane when the determinant is zero. Otherwise it hits when u >= 0, v >= 0, u + v <= 1 and t > 0; the weights
// (1 - u - v, u, v) are the barycentric weights of the hit, as in the rasterizer.
export function rayTriangle(o, d, A, B, C) {
  const e1 = sub(B, A);
  const e2 = sub(C, A);
  const s = sub(o, A);
  const p = cross(d, e2);
  const q = cross(s, e1);
  const det = dot(e1, p);
  const parallel = Math.abs(det) < EPS;
  const u = parallel ? 0 : dot(s, p) / det;
  const v = parallel ? 0 : dot(d, q) / det;
  const t = parallel ? 0 : dot(e2, q) / det;
  const inside = !parallel && u >= 0 && v >= 0 && u + v <= 1;
  let kind = 'hit';
  if (parallel) kind = 'parallel';
  else if (!inside) kind = 'outside';
  else if (t <= EPS) kind = 'behind';
  let edge = '';
  if (kind === 'outside') edge = u < 0 ? 'AC' : v < 0 ? 'AB' : 'BC';
  const hit = parallel ? [0, 0, 0] : add(o, scale(d, t));
  const bary = [1 - u - v, u, v];
  const n = normalize(cross(e1, e2));
  return { e1, e2, s, p, q, det, u, v, t, kind, edge, hit, bary, n };
}
// #endregion

// #region Ray against a box
// An axis-aligned box is three slabs (Kay and Kajiya, 1986). Along each axis the ray is between the two planes for t from (lo - o) / d to (hi - o) / d,
// sorted. It is inside the box where the three intervals overlap: it enters at the largest lower bound and leaves at the
// smallest upper bound. A zero component of d gives every t if o is between the planes and none if it is not.
function slab(o, d, lo, hi) {
  if (Math.abs(d) < 1e-12) return o >= lo && o <= hi ? [-Infinity, Infinity] : [Infinity, -Infinity];
  const ta = (lo - o) / d;
  const tb = (hi - o) / d;
  return ta < tb ? [ta, tb] : [tb, ta];
}

export function rayBox(o, d, lo, hi) {
  const x = slab(o[0], d[0], lo[0], hi[0]);
  const y = slab(o[1], d[1], lo[1], hi[1]);
  const z = slab(o[2], d[2], lo[2], hi[2]);
  const tEnter = Math.max(x[0], y[0], z[0]);
  const tExit = Math.min(x[1], y[1], z[1]);
  const axisEnter = x[0] >= y[0] && x[0] >= z[0] ? 0
    : y[0] >= z[0] ? 1 : 2;
  const axisExit = x[1] <= y[1] && x[1] <= z[1] ? 0
    : y[1] <= z[1] ? 1 : 2;
  let kind = 'hit';
  if (tEnter > tExit) kind = 'miss';
  else if (tExit <= 0) kind = 'behind';
  else if (tEnter <= 0) kind = 'inside';
  const t = kind === 'hit' ? tEnter : kind === 'inside' ? tExit : Infinity;
  const axis = kind === 'inside' ? axisExit : axisEnter;
  const hit = t < Infinity ? add(o, scale(d, t)) : [0, 0, 0];
  const n = [0, 0, 0];
  const heading = d[axis] > 0 ? 1 : -1;
  if (t < Infinity) n[axis] = kind === 'inside' ? heading : -heading;
  return { x, y, z, tEnter, tExit, axis, kind, t, hit, n };
}
// #endregion

// #region Reflection and refraction
// Reflection flips the part of d along the normal: r = d - 2 (d.n) n. Refraction obeys Snell's law n1 sin(theta1) = n2 sin(theta2).
// With eta = n1 / n2 and cos(theta1) = -d.n, the refracted direction is t = eta d + (eta cos(theta1) - sqrt(k)) n, where
// k = 1 - eta^2 (1 - cos^2(theta1)). A negative k is total internal reflection: no refracted ray. The share that reflects is
// Fresnel's F, here Schlick's approximation (1994) F0 + (1 - F0) (1 - cos(theta1))^5 with F0 = ((n1 - n2) / (n1 + n2))^2,
// and 1 on total internal reflection. fExact is the Fresnel equations for unpolarized light, which Schlick approximates.
export function snellFresnel(d, n, n1, n2) {
  const cosI = -dot(d, n);
  const eta = n1 / n2;
  const k = 1 - eta * eta * (1 - cosI * cosI);
  const tir = k < 0;
  const cosT = Math.sqrt(Math.max(k, 0));
  const thetaI = (Math.acos(Math.min(cosI, 1)) * 180) / Math.PI;
  const sinT = eta * Math.sqrt(1 - cosI * cosI);
  const thetaT = tir ? 90 : (Math.asin(Math.min(sinT, 1)) * 180) / Math.PI;
  const reflected = reflect(d, n);
  const refracted = tir ? [0, 0, 0] : add(scale(d, eta), scale(n, eta * cosI - cosT));
  const ratio = (n1 - n2) / (n1 + n2);
  const f0 = ratio * ratio;
  const m = 1 - cosI;
  const fSchlick = f0 + (1 - f0) * m * m * m * m * m;
  const rs = (n1 * cosI - n2 * cosT) / (n1 * cosI + n2 * cosT);
  const rp = (n1 * cosT - n2 * cosI) / (n1 * cosT + n2 * cosI);
  const fExact = tir ? 1 : (rs * rs + rp * rp) / 2;
  const critical = n1 > n2 ? (Math.asin(n2 / n1) * 180) / Math.PI : 90;
  const kReflect = tir ? 1 : fSchlick;
  const kRefract = tir ? 0 : 1 - fSchlick;
  return { cosI, eta, k, tir, thetaI, thetaT, reflected, refracted, f0, fSchlick, fExact, critical, kReflect, kRefract };
}
// #endregion

// #region The scenes
// A scene is spheres (center c, radius r, kind 'diffuse', 'mirror' or 'glass', a color, a mirror's share kr, a glass's index
// of refraction ior), the floor plane y = floorY, one point light, and a camera. chapterScene is the course text's picture
// (rt-whitted.png): a mirror, a glass and a diffuse sphere over a checkered floor. figureScene is its flat figure
// (rt-whitted-2d.svg), drawn in the plane z = 0. acneScene has a plain floor, for shadow acne.
export function chapterScene() {
  return {
    spheres: [
      { c: [-1.1, 0, -0.3], r: 1, kind: 'mirror', color: [0.9, 0.9, 0.9], kr: 0.9, ior: 1 },
      { c: [1.2, -0.2, 0.6], r: 0.8, kind: 'glass', color: [1, 1, 1], kr: 0, ior: 1.5 },
      { c: [0.2, -0.55, -2], r: 0.45, kind: 'diffuse', color: [0.85, 0.3, 0.25], kr: 0, ior: 1 },
    ],
    floorY: -1, floorTwoSided: true, checker: true, light: [2, 5, 4], ambient: 0.15,
    camera: { eye: [0, 0.8, 5.5], look: [0, -0.2, 0], fovDeg: 40, width: 96, height: 60 },
  };
}

export function figureScene() {
  return {
    spheres: [
      { c: [-1.3, 0.1, 0], r: 0.8, kind: 'mirror', color: [0.9, 0.9, 0.9], kr: 0.9, ior: 1 },
      { c: [1.2, 0, 0], r: 0.75, kind: 'glass', color: [1, 1, 1], kr: 0, ior: 1.5 },
    ],
    floorY: -1.6, floorTwoSided: false, checker: false, light: [0.3, 2.6, 0], ambient: 0.15,
    camera: { eye: [-0.2, -3.4, 0], look: [0, 0, 0], fovDeg: 40, width: 96, height: 60 },
  };
}

export function acneScene() {
  return {
    spheres: [
      { c: [-0.6, -0.4, 0], r: 0.6, kind: 'diffuse', color: [0.8, 0.8, 0.85], kr: 0, ior: 1 },
      { c: [0.9, -0.62, 0.5], r: 0.38, kind: 'diffuse', color: [0.85, 0.45, 0.35], kr: 0, ior: 1 },
    ],
    floorY: -1, floorTwoSided: true, checker: false, light: [3, 3.5, 3], ambient: 0.15,
    camera: { eye: [0, 1.4, 5], look: [0, -0.4, 0], fovDeg: 38, width: 96, height: 60 },
  };
}
// #endregion

// #region Whitted: the nearest hit
// The nearest of the spheres and the floor with a parameter t between tMin and tMax. The floor of a one-sided scene is seen
// only from above. A shadow ray asks a different question, "is anything between here and the light?", and uses the same test
// with tMax = 1. The result is t and the index of what was hit: a sphere's index, FLOOR or NONE.
export function intersectScene(scene, o, d, tMin, tMax) {
  let t = tMax;
  let index = NONE;
  for (let i = 0; i < scene.spheres.length; i++) {
    const sphere = scene.spheres[i];
    const hit = raySphere(o, d, sphere.c, sphere.r, tMin);
    if (hit.t < t) {
      t = hit.t;
      index = i;
    }
  }
  const seen = scene.floorTwoSided || d[1] < 0;
  const tFloor = Math.abs(d[1]) > EPS ? (scene.floorY - o[1]) / d[1] : Infinity;
  if (seen && tFloor > tMin && tFloor < t) {
    t = tFloor;
    index = FLOOR;
  }
  return { t, index };
}
// #endregion

// #region Shadow acne: offsetting the origin
// A ray that starts exactly on the surface it just hit can hit that surface again at a t near zero: the hit point was rounded
// when it was stored, so it sits a hair inside or outside the surface. Two cures. 'offset' moves the origin a distance eps
// along the normal, to the side the ray goes. 'tmin' keeps the origin and ignores hits with t < eps. Too small an eps leaves
// speckle; too large moves the origin past thin objects and detaches shadows from the things that cast them.
export function offsetOrigin(p, n, side, eps, mode) {
  const moved = mode === 'offset' ? eps : 0;
  const origin = add(p, scale(n, side * moved));
  const tMin = mode === 'offset' ? 0 : eps;
  return { origin, tMin, moved };
}
// #endregion

// #region Whitted: the shadow ray
// From the hit point toward the light, starting on the light's side of the surface. The direction is not normalized, so the
// light is at t = 1 and the test is "is anything in (tMin, 1)?": a sphere behind the light must not count. The first blocker
// found is enough; its shading is never needed.
export function shadowRay(scene, p, n, opt) {
  const side = dot(n, sub(scene.light, p)) >= 0 ? 1 : -1;
  const start = offsetOrigin(p, n, side, opt.eps, opt.mode);
  const origin = start.origin;
  const aim = sub(scene.light, origin);
  const hit = intersectScene(scene, origin, aim, start.tMin, 1);
  const blocked = hit.index !== NONE;
  return { origin, aim, tMin: start.tMin, blockerT: hit.t, blocker: hit.index, blocked, side };
}
// #endregion

// #region Whitted: shade a ray
// Whitted (1980). Find the nearest hit. Send a shadow ray to the light and add the diffuse and specular terms only if nothing
// blocks it. A mirror sends a reflected ray, glass sends a reflected and a refracted ray weighted by Fresnel's F and 1 - F, and
// each is traced by this same function one level deeper, until opt.maxDepth. The result is a tree: every node holds its own
// local term, its children, and the color it passes to its parent, local + wReflect * reflection + wRefract * refraction.
function floorColor(scene, p) {
  const cell = (Math.floor(p[0]) + Math.floor(p[2])) % 2;
  return scene.checker && cell !== 0 ? [0.25, 0.3, 0.4] : [0.85, 0.85, 0.85];
}

function sky(d) {
  const k = Math.min(Math.max(0.5 * (d[1] + 1), 0), 1);
  return [0.75 + 0.2 * k, 0.85 + 0.1 * k, 1];
}

// A ray that leaves the scene returns the background and nothing else: no shadow ray, no secondary rays.
function skyNode(kind, level, o, d, background) {
  const none = [0, 0, 0];
  return { kind, level, o, d, t: Infinity, index: NONE, p: o, n: none, entering: true, material: 'sky', albedo: background, shadow: null, toLight: none, lit: 0, nDotL: 0, spec: 0, local: background, wReflect: 0, wRefract: 0, truncated: false, reflection: null, refraction: null, color: background, rays: 1, outward: none, mirrorDir: none, glint: 0, lambert: none, surface: none, bend: null, spawn: false, outDir: none, inDir: none, fromReflection: none, fromRefraction: none };
}

export function shade(scene, o, d, tMin, level, kind, opt) {
  const hit = intersectScene(scene, o, d, tMin, Infinity);
  if (hit.index === NONE) return skyNode(kind, level, o, d, sky(d));
  const sphere = hit.index >= 0 ? scene.spheres[hit.index] : null;
  const p = single3(add(o, scale(d, hit.t)), opt.single);
  const outward = sphere ? scale(sub(p, sphere.c), 1 / sphere.r) : [0, 1, 0];
  const entering = dot(d, outward) < 0;
  const n = entering ? outward : scale(outward, -1);
  const material = sphere ? sphere.kind : 'diffuse';
  const albedo = sphere ? sphere.color : floorColor(scene, p);
  const shadow = shadowRay(scene, p, n, opt);
  const toLight = normalize(sub(scene.light, p));
  const lit = shadow.blocked ? 0 : 1;
  const nDotL = Math.max(dot(n, toLight), 0);
  const mirrorDir = sub(scale(n, 2 * nDotL), toLight);
  const spec = Math.pow(Math.max(dot(mirrorDir, scale(d, -1)), 0), SHININESS);
  const glint = lit * KS * spec;
  const lambert = scale(albedo, scene.ambient + lit * KD * nDotL);
  const surface = add(lambert, [glint, glint, glint]);
  const local = material === 'diffuse' ? surface
    : material === 'mirror' ? scale(surface, 1 - sphere.kr) : [glint, glint, glint];
  const bend = material === 'glass'
    ? snellFresnel(d, n, entering ? 1 : sphere.ior, entering ? sphere.ior : 1) : null;
  const wReflect = material === 'mirror' ? sphere.kr : bend ? bend.kReflect : 0;
  const wRefract = bend ? bend.kRefract : 0;
  const spawn = level < opt.maxDepth;
  const truncated = !spawn && (wReflect > 0 || wRefract > 0);
  const outDir = bend ? bend.reflected : normalize(reflect(d, n));
  const outStart = offsetOrigin(p, n, 1, opt.eps, opt.mode);
  const inStart = offsetOrigin(p, n, -1, opt.eps, opt.mode);
  const reflection = spawn && wReflect > 0
    ? shade(scene, outStart.origin, outDir, outStart.tMin,
      level + 1, 'reflection', opt) : null;
  const inDir = bend ? normalize(bend.refracted) : outDir;
  const refraction = spawn && wRefract > 0
    ? shade(scene, inStart.origin, inDir, inStart.tMin,
      level + 1, 'refraction', opt) : null;
  const fromReflection = scale(reflection ? reflection.color : [0, 0, 0], wReflect);
  const fromRefraction = scale(refraction ? refraction.color : [0, 0, 0], wRefract);
  const color = add(add(local, fromReflection), fromRefraction);
  const below = (reflection ? reflection.rays : 0)
    + (refraction ? refraction.rays : 0);
  const rays = 2 + below;
  return { kind, level, o, d, t: hit.t, index: hit.index, p, n, entering, material, albedo, shadow, toLight, lit, nDotL, spec, local, wReflect, wRefract, truncated, reflection, refraction, color, rays, outward, mirrorDir, glint, lambert, surface, bend, spawn, outDir, inDir, fromReflection, fromRefraction };
}
// #endregion

// #region Whitted: the tree of one pixel
// The pixel's color is a sum over the tree. A node's accumulated weight is the product of the weights on the path from the
// root (1 for the primary ray, then kr or F or 1 - F at each step), and it contributes accum x local. The shadow rays add no
// color of their own: they gate the local term of the node that sent them. Rows come in the order primary, its shadow ray,
// its reflection's subtree, its refraction's subtree.
function addRows(rows, node, parent, weight, accum) {
  const id = rows.length;
  const contribution = scale(node.local, accum);
  rows.push({ id, parent, kind: node.kind, level: node.level, weight,
    accum, local: node.local, contribution, node, isShadow: false });
  if (node.shadow) {
    const gone = [0, 0, 0];
    rows.push({ id: id + 1, parent: id, kind: 'shadow', level: node.level,
      weight: 1, accum, local: gone, contribution: gone, node, isShadow: true });
  }
  if (node.reflection) {
    addRows(rows, node.reflection, id, node.wReflect, accum * node.wReflect);
  }
  if (node.refraction) {
    addRows(rows, node.refraction, id, node.wRefract, accum * node.wRefract);
  }
}

export function rayTree(root) {
  const rows = [];
  addRows(rows, root, -1, 1, 1);
  let sum = [0, 0, 0];
  let shadowRays = 0;
  let truncatedRays = 0;
  for (let i = 0; i < rows.length; i++) {
    sum = add(sum, rows[i].contribution);
    if (rows[i].isShadow) shadowRays += 1;
    if (!rows[i].isShadow && rows[i].node.truncated) truncatedRays += 1;
  }
  return { rows, sum, shadowRays, truncatedRays, rays: root.rays };
}
// #endregion

// #region Whitted: render the image
// One pixel is one primary ray into shade(). A block of rows is rendered at a time, so a caller can stop between blocks when
// the scene changes. opt = { maxDepth, eps, mode, single }.
export function tracePixel(scene, px, py, opt) {
  const cam = scene.camera;
  const basis = lookAtBasis(cam.eye, cam.look, [0, 1, 0]);
  const ray = pixelRay(cam.eye, basis, cam.fovDeg, cam.width, cam.height, px, py);
  return shade(scene, cam.eye, ray.dir, 0, 0, 'primary', opt);
}

export function renderRows(scene, y0, y1, opt) {
  const cam = scene.camera;
  const basis = lookAtBasis(cam.eye, cam.look, [0, 1, 0]);
  const pixels = [];
  let rays = 0;
  for (let py = y0; py < y1; py++) {
    for (let px = 0; px < cam.width; px++) {
      const ray = pixelRay(cam.eye, basis, cam.fovDeg, cam.width, cam.height, px, py);
      const node = shade(scene, cam.eye, ray.dir, 0, 0, 'primary', opt);
      pixels.push(node.color[0], node.color[1], node.color[2]);
      rays += node.rays;
    }
  }
  return { y0, y1, pixels, rays };
}
// #endregion

// #region BVH: boxes and areas
// A node of a bounding-volume hierarchy holds the axis-aligned box of everything below it. The surface area of a box,
// 2 (dx dy + dy dz + dz dx), decides how likely a random ray that hits the parent is to hit the child.
export function triBounds(tri) {
  const lo = minPoint(minPoint(tri[0], tri[1]), tri[2]);
  const hi = maxPoint(maxPoint(tri[0], tri[1]), tri[2]);
  return { lo, hi };
}

export function boxArea(lo, hi) {
  const dx = hi[0] - lo[0];
  const dy = hi[1] - lo[1];
  const dz = hi[2] - lo[2];
  const area = 2 * (dx * dy + dy * dz + dz * dx);
  return area;
}
// #endregion

// #region BVH: the surface area heuristic
// Where to split a node? A random ray that hits the parent hits a child with probability about (child area) / (parent area)
// (MacDonald and Booth, 1990). The expected cost of a split is the cost of visiting the node plus each child's chance times
// its triangle count times the cost of one triangle test: cost = cTrav + pL nL cTri + pR nR cTri. Not splitting costs
// n cTri. sweepSplits tries every split between neighbors along the sorted centroids of one axis.
export function sahCost(areaParent, areaLeft, areaRight, countLeft, countRight, cTrav, cTri) {
  const pLeft = areaParent > 0 ? areaLeft / areaParent : 0.5;
  const pRight = areaParent > 0 ? areaRight / areaParent : 0.5;
  const costLeft = pLeft * countLeft * cTri;
  const costRight = pRight * countRight * cTri;
  const cost = cTrav + costLeft + costRight;
  const leafCost = (countLeft + countRight) * cTri;
  const worthIt = cost < leafCost;
  return { pLeft, pRight, costLeft, costRight, cost, leafCost, worthIt };
}

// Ids sorted by one coordinate of their centroid, ties in their given order. A copy: the argument stays as it was.
function sortIds(ids, centroid, axis) {
  const sorted = ids.slice();
  for (let i = 1; i < sorted.length; i++) {
    const id = sorted[i];
    let j = i - 1;
    while (j >= 0 && centroid[sorted[j]][axis] > centroid[id][axis]) {
      sorted[j + 1] = sorted[j];
      j -= 1;
    }
    sorted[j + 1] = id;
  }
  return sorted;
}

export function sweepSplits(lo, hi, centroid, ids, axis, cTrav, cTri) {
  const n = ids.length;
  const sorted = sortIds(ids, centroid, axis);
  const prefix = [];
  let boxLo = [Infinity, Infinity, Infinity];
  let boxHi = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < n; i++) {
    boxLo = minPoint(boxLo, lo[sorted[i]]);
    boxHi = maxPoint(boxHi, hi[sorted[i]]);
    prefix.push(boxArea(boxLo, boxHi));
  }
  const suffix = [];
  boxLo = [Infinity, Infinity, Infinity];
  boxHi = [-Infinity, -Infinity, -Infinity];
  for (let i = n - 1; i >= 0; i--) {
    boxLo = minPoint(boxLo, lo[sorted[i]]);
    boxHi = maxPoint(boxHi, hi[sorted[i]]);
    suffix[i] = boxArea(boxLo, boxHi);
  }
  const areaParent = prefix[n - 1];
  const areaLeft = [];
  const areaRight = [];
  const costs = [];
  let best = 1;
  for (let k = 1; k < n; k++) {
    areaLeft.push(prefix[k - 1]);
    areaRight.push(suffix[k]);
    const split = sahCost(areaParent, areaLeft[k - 1], areaRight[k - 1],
      k, n - k, cTrav, cTri);
    costs.push(split.cost);
    if (costs[k - 1] < costs[best - 1]) best = k;
  }
  const medianK = Math.floor(n / 2);
  const bestCost = costs[best - 1];
  const medianCost = costs[medianK - 1];
  const leafCost = n * cTri;
  return { sorted, areaParent, areaLeft, areaRight, costs, best, bestCost, medianK, medianCost, leafCost };
}
// #endregion

// #region BVH: build
// Split a node's triangles in two and recurse. The median method sorts them by centroid along the box's longest axis and cuts at
// the middle. The surface area method takes the cheapest sahCost over all three axes, and makes a leaf when no split beats it.
// A node is also a leaf at leafSize triangles or at maxDepth. The nodes are parallel lists; a node's triangles are
// order[first .. first + count). The builder fills lists it made for itself, not the caller's.
function chooseSplit(state, first, count, lo, hi) {
  const ids = state.order.slice(first, first + count);
  const size = sub(hi, lo);
  const longest = size[0] >= size[1] && size[0] >= size[2] ? 0
    : size[1] >= size[2] ? 1 : 2;
  if (state.method === 'median') {
    return { axis: longest, k: Math.floor(count / 2), leaf: false };
  }
  let axis = 0;
  let found = sweepSplits(state.lo, state.hi, state.centroid, ids, 0,
    state.cTrav, state.cTri);
  for (let a = 1; a < 3; a++) {
    const sweep = sweepSplits(state.lo, state.hi, state.centroid, ids, a,
      state.cTrav, state.cTri);
    if (sweep.bestCost < found.bestCost) {
      found = sweep;
      axis = a;
    }
  }
  return { axis, k: found.best, leaf: found.bestCost >= found.leafCost };
}

function buildNode(state, first, count, depth) {
  const nodes = state.nodes;
  const id = nodes.lo.length;
  let lo = [Infinity, Infinity, Infinity];
  let hi = [-Infinity, -Infinity, -Infinity];
  for (let i = first; i < first + count; i++) {
    lo = minPoint(lo, state.lo[state.order[i]]);
    hi = maxPoint(hi, state.hi[state.order[i]]);
  }
  nodes.lo.push(lo);
  nodes.hi.push(hi);
  nodes.left.push(-1);
  nodes.right.push(-1);
  nodes.first.push(first);
  nodes.count.push(count);
  nodes.depth.push(depth);
  if (count <= state.leafSize || depth >= state.maxDepth) return id;
  const split = chooseSplit(state, first, count, lo, hi);
  if (split.leaf) return id;
  const sorted = sortIds(state.order.slice(first, first + count), state.centroid, split.axis);
  for (let i = 0; i < count; i++) state.order[first + i] = sorted[i];
  nodes.left[id] = buildNode(state, first, split.k, depth + 1);
  nodes.right[id] = buildNode(state, first + split.k, count - split.k, depth + 1);
  return id;
}

export function buildBvh(tris, leafSize, maxDepth, method) {
  const lo = [];
  const hi = [];
  const centroid = [];
  const order = [];
  for (let i = 0; i < tris.length; i++) {
    const box = triBounds(tris[i]);
    lo.push(box.lo);
    hi.push(box.hi);
    centroid.push(scale(add(add(tris[i][0], tris[i][1]), tris[i][2]), 1 / 3));
    order.push(i);
  }
  const nodes = { lo: [], hi: [], left: [], right: [], first: [], count: [], depth: [] };
  const state = { lo, hi, centroid, order, nodes, leafSize, maxDepth, method, cTrav: 1, cTri: 1 };
  buildNode(state, 0, tris.length, 0);
  return { lo: nodes.lo, hi: nodes.hi, left: nodes.left, right: nodes.right, first: nodes.first, count: nodes.count,
    depth: nodes.depth, order, nodeCount: nodes.lo.length };
}
// #endregion

// #region BVH: traverse a ray
// Test the root's box. A ray that misses a box skips everything below it. A ray that hits an inner node descends into both
// children, the left first. At a leaf it tests the leaf's triangles. With prune on, a box whose entry is farther than the
// nearest hit so far is skipped too. Every box test and every triangle test is recorded as a step, in order.
export function bruteForce(tris, o, d) {
  let t = Infinity;
  let tri = -1;
  for (let i = 0; i < tris.length; i++) {
    const hit = rayTriangle(o, d, tris[i][0], tris[i][1], tris[i][2]);
    if (hit.kind === 'hit' && hit.t < t) {
      t = hit.t;
      tri = i;
    }
  }
  return { tests: tris.length, t, tri };
}

export function traverseBvh(bvh, tris, o, d, prune) {
  const stack = [0];
  const node = [];
  const kind = [];
  const tri = [];
  const at = [];
  const best = [];
  let nearest = Infinity;
  let nearestTri = -1;
  let boxTests = 0;
  let triTests = 0;
  while (stack.length > 0) {
    const id = stack.pop();
    const box = rayBox(o, d, bvh.lo[id], bvh.hi[id]);
    const entry = Math.max(box.tEnter, 0);
    const reached = box.kind === 'hit' || box.kind === 'inside';
    const leaf = bvh.left[id] < 0;
    boxTests += 1;
    let what = 'miss';
    if (reached && prune && entry > nearest) what = 'skipped';
    else if (reached) what = leaf ? 'leaf' : 'descend';
    node.push(id); kind.push(what); tri.push(-1); at.push(entry); best.push(nearest);
    if (what === 'descend') {
      stack.push(bvh.right[id]);
      stack.push(bvh.left[id]);
    }
    if (what !== 'leaf') continue;
    for (let i = bvh.first[id]; i < bvh.first[id] + bvh.count[id]; i++) {
      const index = bvh.order[i];
      const hit = rayTriangle(o, d, tris[index][0], tris[index][1], tris[index][2]);
      triTests += 1;
      let result = 'tri-miss';
      if (hit.kind === 'hit' && hit.t < nearest) {
        result = 'tri-nearest';
        nearest = hit.t;
        nearestTri = index;
      } else if (hit.kind === 'hit') result = 'tri-farther';
      node.push(id); kind.push(result); tri.push(index); at.push(hit.kind === 'hit' ? hit.t : Infinity); best.push(nearest);
    }
  }
  return { node, kind, tri, at, best, steps: node.length, boxTests, triTests, t: nearest, hitTri: nearestTri };
}
// #endregion

// #region BVH: what the tree buys
// A frame casts raysPerPixel rays through each pixel. Brute force tests every triangle for every ray. A balanced tree of
// triangles has about log2(T) levels, rounded up, and a ray tests about two boxes per level it passes through.
export function frameCost(triangles, pixels, raysPerPixel) {
  const rays = pixels * raysPerPixel;
  const brute = rays * triangles;
  const levels = Math.ceil(Math.log2(triangles));
  const withTree = rays * 2 * levels;
  const speedup = brute / withTree;
  return { rays, brute, levels, withTree, speedup };
}
// #endregion
