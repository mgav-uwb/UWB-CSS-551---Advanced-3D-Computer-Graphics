// tracelab.js: one Cornell box traced two ways. The box of the path lab (red and green walls, a square light under the ceiling)
// holds a mirror sphere, a glass sphere and a tall white box. Whitted's tracer follows mirror and refraction rays and sends shadow
// rays to the light (one to its center, or N spread over it: Cook's distributed rays). The path tracer follows one random path
// per sample, with next-event estimation, Russian roulette, and mirror and glass bounces, and finds what Whitted cannot: color
// bleeding, caustics, light around corners. Both use the same direct-light formula, so their images differ only where the
// lecture says they differ. No three.js and no DOM here: vectors are arrays [x, y, z], colors are arrays [r, g, b]. scene.js
// draws the two images, and the course demo (lib/demos/trace-lab.js) runs these same functions, so a value the demo prints
// beside a line of code is the value that line computed. No function changes its arguments, except that a random number
// generator advances when it is asked for a number.
// The same functions, line for line where the languages allow, are TraceLab.cs in ../unity/
// (lib/tests/programs/trace-lab.test.mjs runs both on the same inputs and compares the numbers).

// #region Settings and vector helpers
// Below EPS a length counts as zero. A ray that leaves a surface starts OFFSET off it, along the normal, so it cannot hit the
// surface it leaves. Unity's Vector3 has these operations built in.
export const EPS = 1e-6;
export const OFFSET = 1e-3;

export function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
export function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
export function scale(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
export function mul(a, b) { return [a[0] * b[0], a[1] * b[1], a[2] * b[2]]; }
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
export function luminance(c) { return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
// #endregion

// #region Random numbers
// A seeded generator (Park and Miller, 1988): the same seed gives the same numbers in both tracks. Each call returns a number
// strictly between 0 and 1 and advances the state. Path k of pixel (px, py) has its own seed, so any path can be traced again
// alone: the three numbers become one integer, and an integer hash (Wellons' lowbias32) scrambles its bits, so that neighboring
// pixels and neighboring paths do not start their generators on neighboring states.
export function makeRng(seed) {
  return { state: (Math.floor(Math.abs(seed)) % 2147483646) + 1 };
}

export function nextRandom(rng) {
  rng.state = (rng.state * 16807) % 2147483647;
  return rng.state / 2147483647;
}

export function pathSeed(px, py, k) {
  let h = (k * 65536 + py * 256 + px) >>> 0;    // one integer per pixel and path: px, py < 256, k < 65536
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}
// #endregion

// #region The ray through a pixel
// The camera has eye e and basis u (right), v (up), w (backward). Pixel (px, py) of a width by height image is the square
// [px, px + 1] x [py, py + 1]; the point (jx, jy) inside it (0.5, 0.5 is its center) has screen coordinates (sx, sy) in [-1, 1].
// The ray runs from the eye through that point of the image plane, one unit in front of the eye. Whitted's tracer sends one ray
// through each pixel's center; the path tracer starts each path at a random point of the pixel's square, which antialiases.
export function lookAtBasis(eye, target, up) {
  const w = normalize(sub(eye, target));
  const u = normalize(cross(up, w));
  const v = cross(w, u);
  return { u, v, w };
}

export function pixelRay(eye, basis, fovDeg, width, height, px, py, jx, jy) {
  const tanHalf = Math.tan((fovDeg * Math.PI) / 360);
  const sx = (2 * (px + jx)) / width - 1;
  const sy = 1 - (2 * (py + jy)) / height;
  const across = scale(basis.u, sx * tanHalf * (width / height));
  const upward = scale(basis.v, sy * tanHalf);
  const toward = sub(add(across, upward), basis.w);    // the point on the image plane, from the eye
  const dir = normalize(toward);
  return { sx, sy, tanHalf, toward, dir };
}
// #endregion

// #region The Cornell box and its three objects
// The path lab's box: 3 wide, 3 tall and 3 deep, open at the front, a red left wall, a green right wall, white floor, ceiling and
// back wall, with the textbook's albedos (the fraction of light a surface reflects). In it: a mirror sphere that reflects 90 %,
// a glass sphere of index 1.5, and a tall white box turned about y so that one face looks at the red wall. The light is a square
// just under the ceiling, facing down, centered at (lightX, lightZ). Its power Le A is fixed, so a smaller light is brighter; side 0
// is a point light. Surfaces are numbered: walls 0 to 4, mirror 5, glass 6, box 7, light 8.
export const HALF = 1.5;
export const LIGHT_POWER = 10;
export const LIGHT_Y = 1.49;
export const RED_WALL = 0;
export const GREEN_WALL = 1;
export const FLOOR = 2;
export const CEILING = 3;
export const BACK_WALL = 4;
export const MIRROR = 5;
export const GLASS = 6;
export const BOX = 7;
export const LIGHT = 8;

export function makeScene(lightX, lightZ, lightSide) {
  const lightArea = lightSide * lightSide;
  const emission = lightArea > 0 ? LIGHT_POWER / lightArea : 0;
  const white = [0.75, 0.75, 0.75];
  const walls = [
    { axis: 0, at: -HALF, facing: 1, albedo: [0.75, 0.15, 0.15] },
    { axis: 0, at: HALF, facing: -1, albedo: [0.15, 0.6, 0.15] },
    { axis: 1, at: -HALF, facing: 1, albedo: white },
    { axis: 1, at: HALF, facing: -1, albedo: white },
    { axis: 2, at: -HALF, facing: 1, albedo: white },
  ];
  const mirror = { center: [0.1, -1.05, -0.85], radius: 0.45, reflectance: 0.9 };
  const glass = { center: [0.65, -1, 0.65], radius: 0.5, ior: 1.5 };
  const turn = (40 * Math.PI) / 180;
  const half = [0.33, 0.8, 0.33];
  const box = { center: [-0.8, -0.7, -0.55], half, lo: scale(half, -1), radius: length(half), cos: Math.cos(turn), sin: Math.sin(turn), albedo: white };
  return { lightX, lightZ, lightSide, lightArea, lightY: LIGHT_Y, emission, power: LIGHT_POWER, walls, mirror, glass, box };
}
// #endregion

// #region Ray against a box turned about y
// An axis-aligned box is three slabs (Kay and Kajiya, 1986): along each axis the ray is between the two planes for t from
// (lo - o) / d to (hi - o) / d, and it is inside the box where the three intervals overlap. A box turned by an angle about y is
// the same test in the box's own frame: move the ray's origin by -center and turn origin and direction by -angle; t does not
// change, and the normal found there is turned back by +angle.
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
  const n = [0, 0, 0];
  const heading = d[axis] > 0 ? 1 : -1;
  if (t < Infinity) n[axis] = kind === 'inside' ? heading : -heading;
  return { tEnter, tExit, axis, kind, t, n };
}

export function rayTurnedBox(o, d, box) {
  const rel = sub(o, box.center);
  const oLocal = [box.cos * rel[0] - box.sin * rel[2], rel[1], box.sin * rel[0] + box.cos * rel[2]];
  const dLocal = [box.cos * d[0] - box.sin * d[2], d[1], box.sin * d[0] + box.cos * d[2]];
  const local = rayBox(oLocal, dLocal, box.lo, box.half);
  const m = local.n;
  const n = [box.cos * m[0] + box.sin * m[2], m[1], box.cos * m[2] - box.sin * m[0]];
  return { oLocal, dLocal, kind: local.kind, t: local.t, axis: local.axis, n };
}
// #endregion

// #region The nearest hit
// The nearest surface along a ray of unit direction: each wall is a plane cut off at the box's edges, each sphere solves a
// quadratic, the turned box is three slabs, and the light is a square seen only from below (a point light, side 0, is never
// hit). The result names the surface (its number), the material (diffuse, mirror, glass, light), the hit point, the normal
// (outward for the spheres and the box, inward for the walls), the albedo and the emission. A ray that leaves through the open
// front hits nothing. A wall is cut off 1e-4 past the box's edge, so a ray through a corner cannot slip between two walls.
export function intersect(scene, o, d) {
  let t = Infinity;
  let id = -1;
  let n = [0, 0, 0];
  for (let i = 0; i < scene.walls.length; i++) {
    const w = scene.walls[i];
    if (Math.abs(d[w.axis]) < EPS) continue;
    const tw = (w.at - o[w.axis]) / d[w.axis];
    if (tw <= 1e-4 || tw >= t) continue;
    let inside = true;
    for (let k = 0; k < 3; k++) {
      if (k !== w.axis && Math.abs(o[k] + tw * d[k]) > HALF + 1e-4) inside = false;
    }
    if (!inside) continue;
    t = tw;
    id = i;
    n = [w.axis === 0 ? w.facing : 0, w.axis === 1 ? w.facing : 0, w.axis === 2 ? w.facing : 0];
  }
  const spheres = [scene.mirror, scene.glass];
  for (let i = 0; i < 2; i++) {
    const s = spheres[i];
    const oc = sub(o, s.center);
    const b = dot(oc, d);
    const disc = b * b - (dot(oc, oc) - s.radius * s.radius);
    if (disc < 0) continue;
    const root = Math.sqrt(disc);
    let ts = -b - root;
    if (ts <= 1e-4) ts = -b + root;     // the origin is inside: the far side
    if (ts <= 1e-4 || ts >= t) continue;
    t = ts;
    id = MIRROR + i;
    n = scale(sub(add(o, scale(d, ts)), s.center), 1 / s.radius);
  }
  const box = scene.box;
  const oc = sub(o, box.center);
  const b = dot(oc, d);
  const reaches = b * b - (dot(oc, oc) - box.radius * box.radius) >= 0;   // the box's bounding sphere first
  const slabs = reaches ? rayTurnedBox(o, d, box) : null;
  if (reaches && (slabs.kind === 'hit' || slabs.kind === 'inside') && slabs.t > 1e-4 && slabs.t < t) {
    t = slabs.t;
    id = BOX;
    n = slabs.n;
  }
  if (d[1] > EPS && scene.lightArea > 0) {
    const tl = (scene.lightY - o[1]) / d[1];
    const q = add(o, scale(d, tl));
    const half = scene.lightSide / 2;
    if (tl > 1e-4 && tl < t && Math.abs(q[0] - scene.lightX) <= half && Math.abs(q[2] - scene.lightZ) <= half) {
      t = tl;
      id = LIGHT;
      n = [0, -1, 0];
    }
  }
  const hit = id >= 0;
  const p = hit ? add(o, scale(d, t)) : [0, 0, 0];
  let material = 'none';
  let albedo = [0, 0, 0];
  if (id >= 0 && id <= 4) { material = 'diffuse'; albedo = scene.walls[id].albedo; }
  if (id === BOX) { material = 'diffuse'; albedo = scene.box.albedo; }
  if (id === MIRROR) material = 'mirror';
  if (id === GLASS) material = 'glass';
  if (id === LIGHT) material = 'light';
  const emission = id === LIGHT ? scene.emission : 0;
  return { hit, t, id, material, p, n, albedo, emission };
}
// #endregion

// #region Reflection and refraction
// Reflection flips the part of d along the normal: r = d - 2 (d.n) n. Refraction obeys Snell's law n1 sin(theta1) = n2 sin(theta2).
// With eta = n1 / n2 and cos(theta1) = -d.n, the refracted direction is t = eta d + (eta cos(theta1) - sqrt(k)) n, where
// k = 1 - eta^2 (1 - cos^2(theta1)). A negative k is total internal reflection: no refracted ray. The share that reflects is
// Fresnel's F, here Schlick's approximation (1994) F0 + (1 - F0) (1 - cos(theta1))^5 with F0 = ((n1 - n2) / (n1 + n2))^2,
// and 1 on total internal reflection.
export function snellFresnel(d, n, n1, n2) {
  const cosI = -dot(d, n);
  const eta = n1 / n2;
  const k = 1 - eta * eta * (1 - cosI * cosI);
  const tir = k < 0;
  const cosT = Math.sqrt(Math.max(k, 0));
  const reflected = reflect(d, n);
  const refracted = tir ? [0, 0, 0] : add(scale(d, eta), scale(n, eta * cosI - cosT));
  const ratio = (n1 - n2) / (n1 + n2);
  const f0 = ratio * ratio;
  const m = 1 - cosI;
  const fSchlick = f0 + (1 - f0) * m * m * m * m * m;
  const kReflect = tir ? 1 : fSchlick;
  const kRefract = tir ? 0 : 1 - fSchlick;
  return { cosI, eta, k, tir, reflected, refracted, f0, fSchlick, kReflect, kRefract };
}
// #endregion

// #region Sampling the light by area
// A point on the light chosen uniformly by area has density pA = 1/A. The rendering equation integrates over solid angle, so
// the density changes: p(omega) = pA r^2 / cos(theta_light). The estimate of the light arriving is f Le G / pA, with the geometry
// term G = cos(theta_surface) cos(theta_light) / r^2. Since Le / pA = Le A, the light's fixed power, the estimate keeps its value
// as the light shrinks: a light of side 0 is a point light, whose estimate is f (Le A) G for the one point there is.
export function areaLightSample(lightArea, power, r, cosSurface, cosLight) {
  const pdfArea = lightArea > 0 ? 1 / lightArea : Infinity;
  const Le = lightArea > 0 ? power / lightArea : Infinity;
  const pdfSolidAngle = cosLight > EPS ? (pdfArea * r * r) / cosLight : Infinity;
  const G = (cosSurface * cosLight) / (r * r);
  const weight = lightArea > 0 ? (Le * G) / pdfArea : power * G;
  return { pdfArea, Le, pdfSolidAngle, G, weight };
}
// #endregion

// #region Next-event estimation
// At a diffuse point, the light that arrives straight from the light: a point on it (u1, u2 in [0, 1) across its square), a
// shadow ray to that point, and the weight of areaLightSample, times the diffuse BRDF albedo / pi. A blocked shadow ray, or a
// point facing away, gives 0. Glass and the mirror block a shadow ray like anything else: the ray would have to bend to reach
// the light, and a straight line cannot.
export function nextEventEstimate(scene, p, n, albedo, u1, u2) {
  const half = scene.lightSide / 2;
  const lightPoint = [scene.lightX - half + u1 * scene.lightSide, scene.lightY, scene.lightZ - half + u2 * scene.lightSide];
  const toLight = sub(lightPoint, p);
  const r = length(toLight);
  const wi = scale(toLight, 1 / r);
  const cosSurface = Math.max(0, dot(n, wi));
  const cosLight = Math.max(0, wi[1]);
  const shadow = intersect(scene, add(p, scale(n, OFFSET)), wi);
  const clear = !shadow.hit || shadow.t > r - 0.01;
  const visible = clear && cosSurface > 0 && cosLight > 0;
  const blocker = clear ? -1 : shadow.id;
  const blockerT = clear ? r : shadow.t;
  const light = areaLightSample(scene.lightArea, scene.power, r, cosSurface, cosLight);
  const contribution = visible ? scale(albedo, light.weight / Math.PI) : [0, 0, 0];
  return { lightPoint, wi, r, cosSurface, cosLight, visible, blocker, blockerT, G: light.G, contribution };
}
// #endregion

// #region Whitted: the shadow rays
// Whitted (1980) sends one shadow ray to a point light. Here count = 1 sends it to the light's center: the shadow is hard. Cook,
// Porter and Carpenter (1984) send several: the light is cut into side x side squares and one shadow ray goes to a random point
// of each (stratified), and the estimates are averaged, so a point that sees part of the light gets part of its light: the
// penumbra. exactDirect replaces the random points by the centers of a fine grid, for the value the estimates scatter around.
export function directLight(scene, p, n, albedo, count, rng) {
  const side = Math.max(1, Math.round(Math.sqrt(count)));
  const total = side * side;
  const samples = [];
  let sum = [0, 0, 0];
  let lit = 0;
  for (let a = 0; a < side; a++) {
    for (let b = 0; b < side; b++) {
      const u1 = total === 1 ? 0.5 : (a + nextRandom(rng)) / side;
      const u2 = total === 1 ? 0.5 : (b + nextRandom(rng)) / side;
      const ne = nextEventEstimate(scene, p, n, albedo, u1, u2);
      samples.push(ne);
      sum = add(sum, ne.contribution);
      if (ne.visible) lit += 1;
    }
  }
  const contribution = scale(sum, 1 / total);
  const fraction = lit / total;
  return { count: total, samples, lit, fraction, contribution };
}

export function exactDirect(scene, p, n, albedo, grid) {
  let sum = [0, 0, 0];
  let lit = 0;
  for (let a = 0; a < grid; a++) {
    for (let b = 0; b < grid; b++) {
      const ne = nextEventEstimate(scene, p, n, albedo, (a + 0.5) / grid, (b + 0.5) / grid);
      sum = add(sum, ne.contribution);
      if (ne.visible) lit += 1;
    }
  }
  const contribution = scale(sum, 1 / (grid * grid));
  const fraction = lit / (grid * grid);
  return { contribution, fraction };
}
// #endregion

// #region Whitted: shade a ray
// Find the nearest hit. A diffuse surface returns its direct light (the shadow rays above) and nothing else: no ambient term,
// no bounce. A mirror sends a reflected ray weighted by its reflectance; glass sends a reflected and a refracted ray weighted by
// Fresnel's F and 1 - F; each is traced by this same function one level deeper, until opt.maxDepth. A ray that reaches the light
// returns its emission Le. The result is a tree: every node holds its own local term, its children, and the color it passes to
// its parent, local + wReflect * reflection + wRefract * refraction.
export function shade(scene, o, d, level, kind, opt, rng) {
  const hit = intersect(scene, o, d);
  const none = [0, 0, 0];
  if (!hit.hit) {
    return { kind, level, o, d, t: Infinity, id: -1, material: 'none', p: o, n: none, entering: true, direct: null, local: none, bend: null, wReflect: 0, wRefract: 0, truncated: false, reflection: null, refraction: null, color: none, rays: 1 };
  }
  const entering = dot(d, hit.n) < 0;
  const n = entering ? hit.n : scale(hit.n, -1);
  let local = [0, 0, 0];
  let direct = null;
  if (hit.material === 'light') local = [hit.emission, hit.emission, hit.emission];
  if (hit.material === 'diffuse') {
    direct = directLight(scene, hit.p, n, hit.albedo, opt.shadowRays, rng);
    local = direct.contribution;
  }
  const ior = scene.glass.ior;
  const bend = hit.material === 'glass' ? snellFresnel(d, n, entering ? 1 : ior, entering ? ior : 1) : null;
  const wReflect = hit.material === 'mirror' ? scene.mirror.reflectance : bend ? bend.kReflect : 0;
  const wRefract = bend ? bend.kRefract : 0;
  const spawn = level < opt.maxDepth;
  const truncated = !spawn && (wReflect > 0 || wRefract > 0);
  const outDir = normalize(reflect(d, n));
  const reflection = spawn && wReflect > 0
    ? shade(scene, add(hit.p, scale(n, OFFSET)), outDir, level + 1, 'reflection', opt, rng) : null;
  const inDir = bend ? normalize(bend.refracted) : outDir;
  const refraction = spawn && wRefract > 0
    ? shade(scene, add(hit.p, scale(n, -OFFSET)), inDir, level + 1, 'refraction', opt, rng) : null;
  const fromReflection = scale(reflection ? reflection.color : [0, 0, 0], wReflect);
  const fromRefraction = scale(refraction ? refraction.color : [0, 0, 0], wRefract);
  const color = add(add(local, fromReflection), fromRefraction);
  const below = (reflection ? reflection.rays : 0) + (refraction ? refraction.rays : 0);
  const rays = 1 + (direct ? direct.count : 0) + below;
  return { kind, level, o, d, t: hit.t, id: hit.id, material: hit.material, p: hit.p, n, entering, direct, local, bend, wReflect, wRefract, truncated, reflection, refraction, color, rays };
}
// #endregion

// #region Whitted: the tree of one pixel
// The pixel's color is a sum over the tree. A node's accumulated weight is the product of the weights on the path from the root
// (1 for the primary ray, then the mirror's reflectance, or F, or 1 - F, at each step), and it contributes accum x local. The shadow
// rays add no color of their own: they decide the local term of the node that sent them. Rows come in the order primary, its
// shadow rays, its reflection's subtree, its refraction's subtree.
function addRows(rows, node, parent, weight, accum) {
  const id = rows.length;
  const contribution = scale(node.local, accum);
  rows.push({ id, parent, kind: node.kind, level: node.level, weight,
    accum, local: node.local, contribution, node, isShadow: false });
  if (node.direct) {
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
    if (rows[i].isShadow) shadowRays += rows[i].node.direct.count;
    if (!rows[i].isShadow && rows[i].node.truncated) truncatedRays += 1;
  }
  return { rows, sum, shadowRays, truncatedRays, rays: root.rays };
}
// #endregion

// #region Whitted: render the image
// One pixel is one primary ray, through the pixel's center, into shade(). A pixel's generator, for the random points of its
// shadow rays, is seeded by pathSeed(px, py, 0), so a pixel traced alone matches the image. A block of rows is rendered at a time,
// so a caller can stop between blocks when the scene changes. camera = { eye, look, fovDeg, width, height };
// opt = { maxDepth, shadowRays }.
export function tracePixel(scene, camera, px, py, opt) {
  const basis = lookAtBasis(camera.eye, camera.look, [0, 1, 0]);
  const ray = pixelRay(camera.eye, basis, camera.fovDeg, camera.width, camera.height, px, py, 0.5, 0.5);
  const rng = makeRng(pathSeed(px, py, 0));
  return shade(scene, camera.eye, ray.dir, 0, 'primary', opt, rng);
}

export function renderRows(scene, camera, y0, y1, opt) {
  const pixels = [];
  let rays = 0;
  for (let py = y0; py < y1; py++) {
    for (let px = 0; px < camera.width; px++) {
      const node = tracePixel(scene, camera, px, py, opt);
      pixels.push(node.color[0], node.color[1], node.color[2]);
      rays += node.rays;
    }
  }
  return { y0, y1, pixels, rays };
}
// #endregion

// #region Russian roulette
// Stop a path at random and boost the survivors: continue with probability q and divide what the rest of the path carries by q,
// so the expected value is q (X / q) + (1 - q) 0 = X, unchanged; only the variance grows. Roulette starts after two bounces.
// Mode "fixed" uses q = 0.7; mode "throughput" uses q = the luminance of the throughput so far (between 0.05 and 0.95), so dark
// paths die young; "off" never stops.
export function rouletteQ(mode, depth, throughput) {
  const lum = luminance(throughput);
  let q = 1;
  if (mode === 'fixed' && depth >= 2) q = 0.7;
  if (mode === 'throughput' && depth >= 2) q = Math.min(0.95, Math.max(0.05, lum));
  const boost = 1 / q;
  return { q, boost, luminance: lum };
}
// #endregion

// #region Path tracing: one path
// Kajiya's estimator, one sample, walked from the eye. At a diffuse vertex: add the light a shadow ray finds (next-event
// estimation), then take one cosine-weighted bounce, which multiplies the throughput by the albedo (f cos / p = albedo). At the
// mirror: reflect, times its reflectance. At glass: reflect with probability F, refract with probability 1 - F; the weight F / F
// is 1, so the throughput is unchanged. Landing on the light adds throughput x Le only when nothing has counted that light yet:
// straight from the eye, after a mirror or glass bounce (next-event estimation is not done there: a shadow ray cannot bend), or
// with next-event estimation off. Roulette may end the walk and boosts the survivors by 1/q. maxDepth counts the bounces: 0 is
// direct light only; a path after its last bounce only looks for the light.
export function cosineDirection(u1, u2) {
  const r = Math.sqrt(u1);
  const phi = 2 * Math.PI * u2;
  const cosTheta = Math.sqrt(Math.max(0, 1 - u1));
  const dir = [r * Math.cos(phi), r * Math.sin(phi), cosTheta];
  const pdf = cosTheta / Math.PI;
  return { dir, pdf };
}

export function toWorld(normal, local) {
  const helper = Math.abs(normal[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0];
  const tangent = normalize(cross(helper, normal));
  const bitangent = cross(normal, tangent);
  const dir = add(add(scale(tangent, local[0]), scale(bitangent, local[1])), scale(normal, local[2]));
  return { tangent, bitangent, dir };
}

export function newVertex(hit, n, throughput) {
  return {
    id: hit.id, material: hit.material, p: hit.p, n,
    albedo: hit.albedo, emission: hit.emission,
    throughput, throughputOut: [0, 0, 0],
    lightPoint: [0, 0, 0], visible: false, blocker: -1,
    direct: [0, 0, 0], contribution: [0, 0, 0],
    q: 1, F: 0, event: 'none', direction: [0, 0, 0], stop: 'none',
  };
}

export function tracePath(scene, origin, direction, rng, options) {
  const vertices = [];
  let o = origin;
  let d = direction;
  let throughput = [1, 1, 1];
  let radiance = [0, 0, 0];
  let rays = 1;
  let escaped = false;
  let hitLight = false;
  let specular = false;      // was the bounce into this vertex a mirror or glass one?
  for (let depth = 0; depth <= options.maxDepth + 1; depth++) {
    const hit = intersect(scene, o, d);
    if (!hit.hit) { escaped = true; break; }
    const entering = dot(d, hit.n) < 0;
    const n = entering ? hit.n : scale(hit.n, -1);
    const v = newVertex(hit, n, throughput);
    vertices.push(v);
    if (hit.material === 'light') {
      hitLight = true;
      v.stop = 'light';
      if (depth === 0 || specular || !options.nee) {
        v.contribution = scale(throughput, hit.emission);
        radiance = add(radiance, v.contribution);
      }
      break;
    }
    if (depth > options.maxDepth) { v.stop = 'depth'; break; }
    if (hit.material === 'diffuse') {
      if (options.nee) {
        const ne = nextEventEstimate(scene, hit.p, n, hit.albedo, nextRandom(rng), nextRandom(rng));
        rays += 1;
        v.lightPoint = ne.lightPoint;
        v.visible = ne.visible;
        v.blocker = ne.blocker;
        v.direct = ne.contribution;
        v.contribution = mul(throughput, ne.contribution);
        radiance = add(radiance, v.contribution);
      }
      v.throughputOut = mul(throughput, hit.albedo);
      if (options.nee && depth === options.maxDepth) { v.stop = 'depth'; break; }
    } else if (hit.material === 'mirror') {
      v.throughputOut = scale(throughput, scene.mirror.reflectance);
    } else {
      v.throughputOut = throughput;
    }
    const roulette = rouletteQ(options.roulette, depth, throughput);
    v.q = roulette.q;
    if (roulette.q < 1 && nextRandom(rng) > roulette.q) { v.stop = 'roulette'; break; }
    let side = 1;
    if (hit.material === 'diffuse') {
      const bounce = cosineDirection(nextRandom(rng), nextRandom(rng));
      v.direction = toWorld(n, bounce.dir).dir;
      v.event = 'bounce';
    } else if (hit.material === 'mirror') {
      v.direction = normalize(reflect(d, n));
      v.event = 'mirror';
    } else {
      const ior = scene.glass.ior;
      const bend = snellFresnel(d, n, entering ? 1 : ior, entering ? ior : 1);
      v.F = bend.kReflect;
      if (nextRandom(rng) < bend.kReflect) {
        v.direction = normalize(bend.reflected);
        v.event = 'reflect';
      } else {
        v.direction = normalize(bend.refracted);
        v.event = 'refract';
        side = -1;                 // the refracted ray goes through the surface
      }
    }
    throughput = scale(v.throughputOut, roulette.boost);
    specular = hit.material !== 'diffuse';
    o = add(hit.p, scale(n, side * OFFSET));
    d = v.direction;
    rays += 1;
  }
  const bounces = Math.max(0, vertices.length - 1);
  return { vertices, radiance, rays, bounces, escaped, hitLight };
}
// #endregion

// #region Light paths: what one path carries
// A walk with next-event estimation carries several light paths at once: one per shadow ray that reached the light (eye, the
// vertices up to that one, the light) and one if it lands on the light. Heckbert (1990) names a path by its vertices: E the eye,
// D a diffuse bounce, S a mirror or glass one, L the light, here read from the eye. E D L is direct light; E D D L reaches the
// light after two diffuse bounces; E D S S L is a caustic: light focused by glass onto a diffuse surface. A light path goes by way
// of the red wall if a vertex after the first is the red wall: that is the light the wall passes on, color bleeding.
export function lightPaths(path) {
  const names = [];
  const contributions = [];
  const viaRed = [];
  const caustic = [];
  let word = 'E';
  let red = false;
  for (let k = 0; k < path.vertices.length; k++) {
    const v = path.vertices[k];
    const letter = v.material === 'light' ? 'L' : v.material === 'diffuse' ? 'D' : 'S';
    word += ' ' + letter;
    if (k > 0 && v.id === RED_WALL) red = true;
    const c = v.contribution;
    if (c[0] > 0 || c[1] > 0 || c[2] > 0) {
      const name = letter === 'L' ? word : word + ' L';
      names.push(name);
      contributions.push(c);
      viaRed.push(red);
      caustic.push(name.indexOf('D S') >= 0 && name.lastIndexOf('S L') === name.length - 3);
    }
  }
  return { word, names, contributions, viaRed, caustic };
}
// #endregion

// #region Path tracing: the paths through one pixel
// Path k of pixel (px, py) seeds its generator with pathSeed(px, py, k), starts at a random point (jx, jy) of the pixel's square,
// and is traced by tracePath. pixelPaths adds paths first .. first + count - 1 to running totals and returns the new totals (the
// ones given are not changed): the sum of the samples, of their luminance and its square, the running mean after each path, and
// the light that came by way of the red wall and by caustic paths. pixelEstimate turns the totals into the mean, its standard
// error sqrt(variance / N), which falls as 1/sqrt(N), and the shares.
export function pixelSample(scene, camera, px, py, k, options) {
  const rng = makeRng(pathSeed(px, py, k));
  const jx = nextRandom(rng);
  const jy = nextRandom(rng);
  const basis = lookAtBasis(camera.eye, camera.look, [0, 1, 0]);
  const ray = pixelRay(camera.eye, basis, camera.fovDeg, camera.width, camera.height, px, py, jx, jy);
  const path = tracePath(scene, camera.eye, ray.dir, rng, options);
  return { k, jx, jy, sx: ray.sx, sy: ray.sy, dir: ray.dir, path };
}

export function emptyTotals() {
  return { count: 0, sum: [0, 0, 0], sumLum: 0, sumSquares: 0, red: [0, 0, 0], caustic: [0, 0, 0], causticPaths: 0, zeroPaths: 0, running: [] };
}

export function pixelPaths(scene, camera, px, py, first, count, options, totals) {
  let sum = totals.sum;
  let sumLum = totals.sumLum;
  let sumSquares = totals.sumSquares;
  let red = totals.red;
  let caustic = totals.caustic;
  let causticPaths = totals.causticPaths;
  let zeroPaths = totals.zeroPaths;
  const running = totals.running.slice();
  for (let k = first; k < first + count; k++) {
    const sample = pixelSample(scene, camera, px, py, k, options);
    const L = sample.path.radiance;
    const lum = luminance(L);
    sum = add(sum, L);
    sumLum += lum;
    sumSquares += lum * lum;
    if (lum === 0) zeroPaths += 1;
    const parts = lightPaths(sample.path);
    let found = false;
    for (let i = 0; i < parts.names.length; i++) {
      if (parts.viaRed[i]) red = add(red, parts.contributions[i]);
      if (parts.caustic[i]) { caustic = add(caustic, parts.contributions[i]); found = true; }
    }
    if (found) causticPaths += 1;
    running.push(sumLum / (totals.count + k - first + 1));
  }
  return { count: totals.count + count, sum, sumLum, sumSquares, red, caustic, causticPaths, zeroPaths, running };
}

export function pixelEstimate(totals) {
  const n = totals.count;
  const mean = scale(totals.sum, n > 0 ? 1 / n : 0);
  const meanLum = n > 0 ? totals.sumLum / n : 0;
  const variance = n > 1 ? Math.max(0, totals.sumSquares / n - meanLum * meanLum) * n / (n - 1) : 0;
  const standardError = n > 0 ? Math.sqrt(variance / n) : 0;
  const redShare = totals.sumLum > 0 ? luminance(totals.red) / totals.sumLum : 0;
  const causticShare = totals.sumLum > 0 ? luminance(totals.caustic) / totals.sumLum : 0;
  const redOverGreen = mean[1] > 0 ? mean[0] / mean[1] : 0;
  return { n, mean, meanLum, variance, standardError, redShare, causticShare, redOverGreen };
}
// #endregion

// #region Path tracing: render the image
// One pass gives every pixel one more sample: pass k traces path k of each pixel, so the image after N passes is the mean of
// paths 0 .. N - 1 of every pixel, the same paths pixelPaths traces for one pixel. A range of pixels (index py * width + px) is
// done at a time, so a caller can stop between ranges when the scene changes. options = { maxDepth, roulette, nee }.
export function renderPass(scene, camera, k, first, last, options) {
  const pixels = [];
  let rays = 0;
  for (let i = first; i < last; i++) {
    const px = i % camera.width;
    const py = Math.floor(i / camera.width);
    const sample = pixelSample(scene, camera, px, py, k, options);
    const L = sample.path.radiance;
    pixels.push(L[0], L[1], L[2]);
    rays += sample.path.rays;
  }
  return { k, first, last, pixels, rays };
}
// #endregion

// #region Noise, measured
// A pixel's value is the mean of its samples, and the spread of the samples gives the error of that mean: the standard error
// sqrt(variance/N), which falls as 1/sqrt(N). The image's noise is the root-mean-square standard error over the pixels, relative to
// the image's mean value. sums holds each pixel's total of the sample values, squares its total of their squares.
export function imageNoise(sums, squares, n) {
  const pixels = sums.length;
  let meanTotal = 0;
  let seSquares = 0;
  for (let i = 0; i < pixels; i++) {
    const m = sums[i] / n;
    const variance = n > 1 ? Math.max(0, squares[i] / n - m * m) * n / (n - 1) : 0;
    meanTotal += m;
    seSquares += variance / n;
  }
  const mean = meanTotal / pixels;
  const standardError = Math.sqrt(seSquares / pixels);
  const noise = mean > 0 && n > 1 ? standardError / mean : 0;
  return { mean, standardError, noise };
}
// #endregion
