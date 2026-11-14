// pathlab.js: Monte Carlo integration and path tracing: the estimator and its error, sampling a direction, the solid angle and
// the cosine, the rendering equation's terms at a point, a Cornell box, next-event estimation, Russian roulette, one traced path,
// and the noise of an image. No three.js here: vectors are arrays [x, y, z], colors are arrays [r, g, b]. scene.js draws a
// progressive render, and the course demo (lib/demos/path-lab.js) runs these same functions, so a value the demo prints beside a
// line of code is the value that line computed. No function changes its arguments, except that a random number generator
// advances when it is asked for a number.
// The same functions, line for line where the languages allow, are PathLab.cs in ../unity/
// (lib/tests/programs/path-lab.test.mjs runs both on the same inputs and compares the numbers).

// #region Settings and vector helpers
// Below EPS a length counts as zero. Unity's Vector3 has these operations built in.
export const EPS = 1e-6;
export const OFFSET = 1e-3;    // a bounce ray starts this far off the surface, along the normal, so it cannot hit its own surface

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
export function luminance(c) { return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
// #endregion

// #region Random numbers
// A seeded generator (Park and Miller, 1988): the same seed gives the same numbers in both tracks, so a run can be repeated.
// Each call returns a number strictly between 0 and 1 and advances the generator's state.
export function makeRng(seed) {
  return { state: (Math.floor(Math.abs(seed)) % 2147483646) + 1 };
}

export function nextRandom(rng) {
  rng.state = (rng.state * 16807) % 2147483647;
  return rng.state / 2147483647;
}
// #endregion

// #region Directions: uniform
// Two random numbers u1, u2 in [0, 1) become a direction on the hemisphere around z. Uniform in solid angle means cos(theta) is
// the uniform variable, not theta: cos(theta) = u1, phi = 2 pi u2, and the density is 1/(2 pi) for every direction.
export function uniformDirection(u1, u2) {
  const cosTheta = u1;
  const sinTheta = Math.sqrt(Math.max(0, 1 - cosTheta * cosTheta));
  const phi = 2 * Math.PI * u2;
  const dir = [sinTheta * Math.cos(phi), sinTheta * Math.sin(phi), cosTheta];
  const pdf = 1 / (2 * Math.PI);
  return { cosTheta, sinTheta, phi, dir, pdf };
}
// #endregion

// #region Directions: cosine-weighted (Malley)
// Malley's method: take a uniform point on the unit disk (radius sqrt(u1), angle 2 pi u2) and lift it straight up onto the
// hemisphere. The disk's area is cos(theta) times the solid angle, so the density comes out cos(theta)/pi.
export function cosineDirection(u1, u2) {
  const r = Math.sqrt(u1);
  const phi = 2 * Math.PI * u2;
  const diskX = r * Math.cos(phi);
  const diskY = r * Math.sin(phi);
  const cosTheta = Math.sqrt(Math.max(0, 1 - u1));
  const dir = [diskX, diskY, cosTheta];
  const pdf = cosTheta / Math.PI;
  return { r, phi, diskX, diskY, cosTheta, dir, pdf };
}
// #endregion

// #region A direction around the normal
// A direction chosen around z is turned to sit around any normal n: build two unit vectors square to n and to each other, and
// take the same combination of them.
export function toWorld(normal, local) {
  const helper = Math.abs(normal[0]) > 0.9 ? [0, 1, 0] : [1, 0, 0];
  const tangent = normalize(cross(helper, normal));
  const bitangent = cross(normal, tangent);
  const dir = add(add(scale(tangent, local[0]), scale(bitangent, local[1])), scale(normal, local[2]));
  return { tangent, bitangent, dir };
}
// #endregion

// #region The estimator: one run
// I = integral of f over the hemisphere is estimated by drawing N directions from a density p and averaging f/p. Here f is cos(theta),
// so I = pi exactly. Stratified sampling splits [0, 1) into N equal strata for u1 and puts one sample in each.
export function drawSamples(method, n, rng) {
  const u1 = [];
  const u2 = [];
  for (let i = 0; i < n; i++) {
    let a = nextRandom(rng);
    const b = nextRandom(rng);
    if (method === 'stratified') a = (i + a) / n;
    u1.push(a);
    u2.push(b);
  }
  return { u1, u2 };
}

export function estimateCosineIntegral(method, u1, u2) {
  const n = u1.length;
  const dirs = [];
  const cosines = [];
  const pdfs = [];
  const terms = [];
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const s = method === 'cosine' ? cosineDirection(u1[i], u2[i]) : uniformDirection(u1[i], u2[i]);
    dirs.push(s.dir);
    cosines.push(s.cosTheta);
    pdfs.push(s.pdf);
    terms.push(s.cosTheta / s.pdf);
    sum += s.cosTheta / s.pdf;
  }
  const estimate = sum / n;
  const exact = Math.PI;
  const error = estimate - exact;
  const relError = error / exact;
  return { dirs, cosines, pdfs, terms, sum, estimate, exact, error, relError };
}
// #endregion

// #region The estimator: many runs
// The error is random, so it is measured over many runs: the mean of the estimates (it sits on pi, which is what unbiased means),
// their spread, and the root-mean-square error relative to pi. For uniform directions Y = 2 pi u has standard deviation 2 pi/sqrt(12),
// 0.577 of pi, so the relative error is 0.577/sqrt(N); one sample per stratum gives 0.577/N^1.5; cosine weighting makes every term pi.
export function predictedError(method, n) {
  const one = 2 * Math.PI / Math.sqrt(12) / Math.PI;
  if (method === 'uniform') return one / Math.sqrt(n);
  if (method === 'stratified') return one / Math.pow(n, 1.5);
  return 0;
}

export function measureEstimator(method, n, trials, seed) {
  const rng = makeRng(seed);
  const estimates = [];
  let total = 0;
  for (let t = 0; t < trials; t++) {
    const s = drawSamples(method, n, rng);
    const e = estimateCosineIntegral(method, s.u1, s.u2).estimate;
    estimates.push(e);
    total += e;
  }
  const mean = total / trials;
  let spread = 0;
  let miss = 0;
  for (let t = 0; t < trials; t++) {
    spread += (estimates[t] - mean) * (estimates[t] - mean);
    miss += (estimates[t] - Math.PI) * (estimates[t] - Math.PI);
  }
  const variance = spread / trials;
  const stdDev = Math.sqrt(variance);
  const rmsRelError = Math.sqrt(miss / trials) / Math.PI;
  const meanStdErr = stdDev / Math.sqrt(trials);
  const predicted = predictedError(method, n);
  return { n, trials, estimates, mean, variance, stdDev, rmsRelError, meanStdErr, predicted };
}
// #endregion

// #region A cone of directions
// A cone of half angle a around a direction covers the solid angle 2 pi (1 - cos a): a half angle of 90 degrees is the hemisphere,
// 2 pi, and 180 degrees is the whole sphere, 4 pi. The sun, seen from Earth, has a half angle of 0.2666 degrees.
export function coneSolidAngle(halfAngleDeg) {
  const half = halfAngleDeg * Math.PI / 180;
  const cap = 2 * Math.PI * (1 - Math.cos(half));
  const fractionOfSphere = cap / (4 * Math.PI);
  return { solidAngle: cap, fractionOfSphere };
}
// #endregion

// #region Solid angle of a patch
// A solid angle is the area a shape covers on the unit sphere around the viewer, in steradians. A cone of half angle a covers
// 2 pi (1 - cos a). A small patch of area dA, tilted theta away from facing the point and r away, covers dA cos(theta)/r^2.
// A point source of intensity I sends I watts into every steradian, so the patch receives I times that, and E = I cos(theta)/r^2.
export function patchSolidAngle(point, center, normal, area, intensity) {
  const toPatch = sub(center, point);
  const r = Math.max(length(toPatch), EPS);
  const direction = scale(toPatch, 1 / r);
  const cosTheta = Math.max(0, -dot(normal, direction));
  const thetaDeg = Math.acos(Math.min(1, cosTheta)) * 180 / Math.PI;
  const solidAngle = area * cosTheta / (r * r);
  const flux = intensity * solidAngle;
  const irradiance = flux / area;
  return { toPatch, r, direction, cosTheta, thetaDeg, solidAngle, flux, irradiance };
}
// #endregion

// #region The cosine over the hemisphere
// In angles, a ring of the hemisphere between theta and theta + dTheta has solid angle 2 pi sin(theta) dTheta. Weighting each ring
// by cos(theta) and adding them is the midpoint rule for the integral of cos(theta) over the hemisphere, which is pi. A matte
// surface that reflects a fraction rho equally in every direction therefore has f = rho/pi, since f times the integral must be rho.
export function lambertBrdf(rho, cosineIntegral) {
  const f = rho / Math.PI;
  const reflected = f * cosineIntegral;
  return { f, reflected };
}

export function hemisphereCosine(strips) {
  const dTheta = (Math.PI / 2) / strips;
  const thetas = [];
  const rings = [];
  const cosines = [];
  const parts = [];
  let sum = 0;
  let hemisphere = 0;
  for (let i = 0; i < strips; i++) {
    const theta = (i + 0.5) * dTheta;
    const ring = 2 * Math.PI * Math.sin(theta) * dTheta;
    thetas.push(theta);
    rings.push(ring);
    cosines.push(Math.cos(theta));
    parts.push(Math.cos(theta) * ring);
    sum += Math.cos(theta) * ring;
    hemisphere += ring;
  }
  const exact = Math.PI;
  const error = sum - exact;
  return { dTheta, thetas, rings, cosines, parts, sum, hemisphere, exact, error };
}
// #endregion

// #region The rendering equation at a point
// Lo = Le + the sum over incoming directions of f * Li * cos(theta) * dOmega. With a few small lights each one enters as the product
// Li*dOmega, and a matte surface has the constant f = rho/pi. A light below the horizon has a negative cosine and contributes nothing.
export function renderingTerms(rho, normal, dirs, lightIn, emitted) {
  const f = rho / Math.PI;
  const cosines = [];
  const angles = [];
  const terms = [];
  let sum = 0;
  for (let i = 0; i < dirs.length; i++) {
    const c = dot(normal, normalize(dirs[i]));
    const cosTheta = Math.max(0, c);
    cosines.push(cosTheta);
    angles.push(Math.acos(Math.max(-1, Math.min(1, c))) * 180 / Math.PI);
    terms.push(f * lightIn[i] * cosTheta);
    sum += f * lightIn[i] * cosTheta;
  }
  const Lo = emitted + sum;
  return { f, cosines, angles, terms, sum, Lo };
}
// #endregion

// #region Bounces add up
// In a closed room where every surface reflects a fraction rho and the light spreads evenly, the direct light arrives once, a
// fraction rho of it arrives again after one bounce, rho squared after two. The total is the geometric series 1/(1 - rho).
// A renderer that stops after `depth` bounces keeps the first depth + 1 terms and loses the rest.
export function bounceSeries(rho, depth) {
  const terms = [];
  let sum = 0;
  let power = 1;
  for (let k = 0; k <= depth; k++) {
    terms.push(power);
    sum += power;
    power *= rho;
  }
  const limit = 1 / (1 - rho);
  const fraction = sum / limit;
  return { terms, sum, limit, fraction };
}
// #endregion

// #region Sampling the light by area
// Pick a point on the light uniformly by area, density pA = 1/A. The rendering equation integrates over solid angle, so the density
// changes: p(omega) = pA r^2 / cos(theta_light), since a patch of the light subtends less solid angle as r^2 grows or as it
// turns edge-on. The estimate is f * Le * G / pA, with the geometry term G = cos(theta_surface) cos(theta_light) / r^2.
export function areaLightSample(lightArea, r, cosSurface, cosLight, Le) {
  const pdfArea = 1 / lightArea;
  const pdfSolidAngle = cosLight > EPS ? pdfArea * r * r / cosLight : Infinity;
  const G = cosSurface * cosLight / (r * r);
  const weight = Le * G / pdfArea;
  return { pdfArea, pdfSolidAngle, G, weight };
}
// #endregion

// #region The Cornell box
// A box 3 wide, 3 tall and 3 deep with its front open: a red left wall, a green right wall, a white floor, ceiling and back wall,
// two white spheres, and a square light just under the ceiling facing down. A wall is an axis, a position along it, and which way
// it faces. Albedo is the fraction of light a surface reflects. The light's power is fixed, so a smaller light is brighter.
export const HALF = 1.5;
export const LIGHT_POWER = 10;
export const EYE = [0, 0, 5.2];
export const TAN_HALF_FOV = Math.tan(21 * Math.PI / 180);

export function makeCornell(lightSide) {
  const lightArea = lightSide * lightSide;
  const emission = LIGHT_POWER / lightArea;
  const white = [0.75, 0.75, 0.75];
  const walls = [
    { axis: 0, at: -HALF, facing: 1, albedo: [0.75, 0.15, 0.15] },
    { axis: 0, at: HALF, facing: -1, albedo: [0.15, 0.6, 0.15] },
    { axis: 1, at: -HALF, facing: 1, albedo: white },
    { axis: 1, at: HALF, facing: -1, albedo: white },
    { axis: 2, at: -HALF, facing: 1, albedo: white },
  ];
  const spheres = [
    { center: [-0.6, -1.0, -0.4], radius: 0.5, albedo: [0.8, 0.8, 0.8] },
    { center: [0.6, -1.1, 0.4], radius: 0.4, albedo: [0.8, 0.8, 0.8] },
  ];
  return { lightSide, lightArea, lightY: 1.49, emission, walls, spheres };
}

export function cameraRay(px, py, size, jx, jy) {
  const sx = ((px + jx) / size * 2 - 1) * TAN_HALF_FOV;
  const sy = (1 - (py + jy) / size * 2) * TAN_HALF_FOV;
  const direction = normalize([sx, sy, -1]);
  return { origin: EYE, direction };
}
// #endregion

// #region Intersecting the box
// The nearest surface along a ray: each wall is a plane cut off at the box's edges, each sphere solves a quadratic, and the light
// is a square seen only from below. The result names the surface (id 0-4 walls, 5-6 spheres, 7 the light), the hit point, the
// normal, the albedo and the emission. A ray that leaves through the open front hits nothing. A wall is cut off 1e-4 past the
// box's edge, so a ray through a corner cannot slip through the crack between two walls.
export function intersect(scene, o, d) {
  let t = Infinity;
  let id = -1;
  let n = [0, 0, 0];
  let albedo = [0, 0, 0];
  let emission = 0;
  for (let i = 0; i < scene.walls.length; i++) {
    const w = scene.walls[i];
    if (Math.abs(d[w.axis]) < EPS) continue;
    const tw = (w.at - o[w.axis]) / d[w.axis];
    if (tw <= 1e-4 || tw >= t) continue;
    const p = add(o, scale(d, tw));
    let inside = true;
    for (let k = 0; k < 3; k++) {
      if (k !== w.axis && Math.abs(p[k]) > HALF + 1e-4) inside = false;
    }
    if (!inside) continue;
    t = tw;
    id = i;
    n = [w.axis === 0 ? w.facing : 0, w.axis === 1 ? w.facing : 0, w.axis === 2 ? w.facing : 0];
    albedo = w.albedo;
    emission = 0;
  }
  for (let i = 0; i < scene.spheres.length; i++) {
    const s = scene.spheres[i];
    const oc = sub(o, s.center);
    const b = dot(oc, d);
    const disc = b * b - (dot(oc, oc) - s.radius * s.radius);
    if (disc < 0) continue;
    const root = Math.sqrt(disc);
    let ts = -b - root;
    if (ts <= 1e-4) ts = -b + root;
    if (ts <= 1e-4 || ts >= t) continue;
    t = ts;
    id = 5 + i;
    n = scale(sub(add(o, scale(d, ts)), s.center), 1 / s.radius);
    albedo = s.albedo;
    emission = 0;
  }
  if (d[1] > EPS) {
    const tl = (scene.lightY - o[1]) / d[1];
    const q = add(o, scale(d, tl));
    const half = scene.lightSide / 2;
    if (tl > 1e-4 && tl < t && Math.abs(q[0]) <= half && Math.abs(q[2]) <= half) {
      t = tl;
      id = 7;
      n = [0, -1, 0];
      albedo = [0, 0, 0];
      emission = scene.emission;
    }
  }
  const hit = id >= 0;
  const p = hit ? add(o, scale(d, t)) : [0, 0, 0];
  return { hit, t, id, p, n, albedo, emission };
}
// #endregion

// #region Russian roulette
// Stop a path at random and boost the survivors: continue with probability q and divide what the rest of the path contributes by q,
// so the expected value is q * (X/q) + (1 - q) * 0 = X, unchanged; only the variance grows. Roulette starts after two bounces.
// mode "fixed" uses q = 0.7; mode "throughput" uses q = the luminance of the throughput so far, so dark paths die young (with a
// floor of 0.05 so that no boost exceeds 20); "off" never stops. The chance of still walking after `bounces` more is q^bounces.
export function rouletteReach(q, bounces) {
  const reach = Math.pow(q, bounces);
  const extra = q / (1 - q);
  return { reach, extra };
}

export function rouletteQ(mode, depth, throughput) {
  const lum = luminance(throughput);
  let q = 1;
  if (mode === 'fixed' && depth >= 2) q = 0.7;
  if (mode === 'throughput' && depth >= 2) q = Math.min(0.95, Math.max(0.05, lum));
  const boost = 1 / q;
  return { q, boost, luminance: lum };
}
// #endregion

// #region Next-event estimation
// At a surface point, one more estimate of the light that arrives straight from the light: a random point on it, a shadow ray to
// that point, and the area-to-solid-angle weight from areaLightSample. A blocked shadow ray, or a point facing away, contributes 0.
export function nextEventEstimate(scene, p, n, albedo, u1, u2) {
  const half = scene.lightSide / 2;
  const lightPoint = [-half + u1 * scene.lightSide, scene.lightY, -half + u2 * scene.lightSide];
  const toLight = sub(lightPoint, p);
  const r = length(toLight);
  const wi = scale(toLight, 1 / r);
  const cosSurface = Math.max(0, dot(n, wi));
  const cosLight = Math.max(0, wi[1]);
  const shadow = intersect(scene, add(p, scale(n, OFFSET)), wi);
  const clear = !shadow.hit || shadow.t > r - 0.01;
  const visible = clear && cosSurface > 0 && cosLight > 0;
  const light = areaLightSample(scene.lightArea, r, cosSurface, cosLight, scene.emission);
  const contribution = visible ? scale(albedo, light.weight / Math.PI) : [0, 0, 0];
  return { lightPoint, wi, r, cosSurface, cosLight, visible, pdfArea: light.pdfArea, pdfSolidAngle: light.pdfSolidAngle, G: light.G, contribution };
}
// #endregion

// #region One path
// Kajiya's estimator, one sample. At each hit: add the light a shadow ray finds (next-event estimation), or, without it, the
// emission when the path lands on the light; then take one cosine-weighted bounce, which for a diffuse surface multiplies the
// throughput by the albedo (f cos/p = albedo). Roulette may end the walk and boosts the survivors by 1/q. maxDepth counts the
// bounces: 0 is direct light only. options.forced may name a bounce direction for a depth (a zero vector leaves it random).
export function newVertex(hit, throughput) {
  return {
    id: hit.id, p: hit.p, n: hit.n,
    albedo: hit.albedo, emission: hit.emission,
    throughput, throughputOut: [0, 0, 0],
    lightPoint: [0, 0, 0], visible: false,
    direct: [0, 0, 0], contribution: [0, 0, 0],
    q: 1, direction: [0, 0, 0], stop: 'none',
  };
}

export function tracePath(scene, origin, direction, rng, options) {
  const vertices = [];
  const byBounce = [];
  for (let b = 0; b <= options.maxDepth; b++) byBounce.push(0);
  const last = options.nee ? options.maxDepth : options.maxDepth + 1;
  let o = origin;
  let d = direction;
  let throughput = [1, 1, 1];
  let radiance = [0, 0, 0];
  let rays = 1;
  let escaped = false;
  let hitLight = false;
  for (let depth = 0; depth <= last; depth++) {
    const hit = intersect(scene, o, d);
    if (!hit.hit) { escaped = true; break; }
    const v = newVertex(hit, throughput);
    vertices.push(v);
    if (hit.emission > 0) {
      hitLight = true;
      v.stop = 'light';
      if (depth === 0 || !options.nee) {
        v.contribution = scale(throughput, hit.emission);
        radiance = add(radiance, v.contribution);
        byBounce[options.nee ? 0 : Math.max(0, depth - 1)] += luminance(v.contribution);
      }
      break;
    }
    if (options.nee) {
      const ne = nextEventEstimate(scene, hit.p, hit.n, hit.albedo, nextRandom(rng), nextRandom(rng));
      rays += 1;
      v.lightPoint = ne.lightPoint;
      v.visible = ne.visible;
      v.direct = ne.contribution;
      v.contribution = mul(throughput, ne.contribution);
      radiance = add(radiance, v.contribution);
      byBounce[depth] += luminance(v.contribution);
    }
    v.throughputOut = mul(throughput, hit.albedo);
    if (depth >= last) { v.stop = 'depth'; break; }
    const roulette = rouletteQ(options.roulette, depth, throughput);
    v.q = roulette.q;
    if (roulette.q < 1 && nextRandom(rng) > roulette.q) { v.stop = 'roulette'; break; }
    const aimed = options.forced && depth < options.forced.length && length(options.forced[depth]) > 0.5;
    const bounce = cosineDirection(nextRandom(rng), nextRandom(rng));
    v.direction = aimed ? options.forced[depth] : toWorld(hit.n, bounce.dir).dir;
    throughput = scale(v.throughputOut, roulette.boost);
    o = add(hit.p, scale(hit.n, OFFSET));
    d = v.direction;
    rays += 1;
  }
  const peak = Math.max(radiance[0], Math.max(radiance[1], radiance[2]));
  const clamped = options.clamp > 0 && peak > options.clamp;
  const rawRadiance = radiance;
  if (clamped) radiance = scale(radiance, options.clamp / peak);
  const bounces = Math.max(0, vertices.length - 1);
  return { vertices, radiance, rawRadiance, byBounce, rays, bounces, escaped, hitLight, clamped };
}
// #endregion

// #region Direct light, two ways
// The light that arrives straight from the light, at a point p with normal n and albedo rho, estimated by sampling the light's area
// (next-event estimation) or by a cosine-weighted bounce that counts only if it lands on the light (f cos/p = rho, times Le).
// exactDirect adds up a fine grid of points on the light for the reference; measureDirect repeats an estimate to measure its error.
export function estimateDirect(scene, p, n, rho, strategy, count, rng) {
  const white = [rho, rho, rho];
  const samples = [];
  const hits = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    let value = 0;
    let hitPoint = [0, 0, 0];
    if (strategy === 'light') {
      const ne = nextEventEstimate(scene, p, n, white, nextRandom(rng), nextRandom(rng));
      value = ne.contribution[0];
      hitPoint = ne.lightPoint;
    } else {
      const bounce = cosineDirection(nextRandom(rng), nextRandom(rng));
      const dir = toWorld(n, bounce.dir).dir;
      const h = intersect(scene, add(p, scale(n, OFFSET)), dir);
      if (h.hit && h.emission > 0) { value = rho * h.emission; hitPoint = h.p; }
    }
    samples.push(value);
    hits.push(hitPoint);
    total += value;
  }
  const average = total / count;
  return { samples, hits, mean: average };
}

export function exactDirect(scene, p, n, rho, grid) {
  const white = [rho, rho, rho];
  let total = 0;
  for (let i = 0; i < grid; i++) {
    for (let j = 0; j < grid; j++) {
      const ne = nextEventEstimate(scene, p, n, white, (i + 0.5) / grid, (j + 0.5) / grid);
      total += ne.contribution[0];
    }
  }
  return total / (grid * grid);
}

export function measureDirect(scene, p, n, rho, strategy, count, trials, seed) {
  const rng = makeRng(seed);
  const exact = exactDirect(scene, p, n, rho, 48);
  const estimates = [];
  let total = 0;
  for (let t = 0; t < trials; t++) {
    const e = estimateDirect(scene, p, n, rho, strategy, count, rng).mean;
    estimates.push(e);
    total += e;
  }
  const mean = total / trials;
  let spread = 0;
  let miss = 0;
  for (let t = 0; t < trials; t++) {
    spread += (estimates[t] - mean) * (estimates[t] - mean);
    miss += (estimates[t] - exact) * (estimates[t] - exact);
  }
  const stdDev = Math.sqrt(spread / trials);
  const rmsRelError = exact > 0 ? Math.sqrt(miss / trials) / exact : 0;
  const meanStdErr = stdDev / Math.sqrt(trials);
  return { exact, estimates, mean, stdDev, rmsRelError, meanStdErr };
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

// #region Fireflies
// A path that reaches a small, bright light by a bounce chosen at random scores enormously. A light of solid angle w and radiance
// Le is hit by a uniform direction with probability w/(2 pi), and that one sample is worth Le/p = Le * 2 pi, while the true value
// of the pixel is about 1. Averaging removes the spike only slowly; clamping removes it and adds bias.
export function fireflyValue(radiance, solidAngle) {
  const pdf = 1 / (2 * Math.PI);
  const probability = solidAngle / (2 * Math.PI);
  const sample = radiance / pdf;
  const oneIn = 1 / probability;
  return { pdf, probability, sample, oneIn };
}
// #endregion
