// diffusion: the mechanism of a diffusion model on a dataset small enough
// to SEE. Pure math, no DOM, no network: the "denoiser" here is the EXACT
// posterior mean E[x0 | xt] for a finite point cloud (a softmax-weighted
// average of the data points), which is precisely what a trained network
// approximates. Forward process, cosine schedule, DDIM / DDPM steps and a
// sampler; lib/demos/diffusion-2d.js draws it.
//
// Conventions: points are interleaved Float64Array [x0, y0, x1, y1, ...].
// t in [0, 1]: t = 0 is clean data, t = 1 is pure noise.
// x_t = sqrt(abar(t)) * x_0 + sqrt(1 - abar(t)) * eps,  eps ~ N(0, I).

const S = 0.008; // Nichol & Dhariwal 2021 cosine-schedule offset
const fCos = (u) => Math.cos(((u + S) / (1 + S)) * (Math.PI / 2)) ** 2;

export function alphaBar(t) {
  const u = Math.min(1, Math.max(0, t));
  const a = fCos(u) / fCos(0);
  return Math.min(1, Math.max(0, a));
}

export function snrDb(t) {
  const a = alphaBar(t);
  const eps = 1e-9;
  return 10 * Math.log10(Math.max(a, eps) / Math.max(1 - a, eps));
}

// mulberry32: tiny seedable PRNG so a slide always shows the same picture.
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller standard normal.
export function randn(rng) {
  let u = 0;
  while (u === 0) u = rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const SHAPES = ['spiral', 'ring', 'moons'];

export function makeShape(name, n = 400, rng = makeRng(7)) {
  const pts = new Float64Array(2 * n);
  const half = Math.floor(n / 2);
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n;
    let x, y;
    if (name === 'ring') {
      const th = 2 * Math.PI * u;
      x = 0.7 * Math.cos(th);
      y = 0.7 * Math.sin(th);
    } else if (name === 'moons') {
      const j = i < half ? i : i - half;
      const th = (Math.PI * (j + 0.5)) / half;
      if (i < half) { x = 0.55 * Math.cos(th) - 0.3; y = 0.55 * Math.sin(th) - 0.15; }
      else { x = 0.55 * Math.cos(th) + 0.3; y = -0.55 * Math.sin(th) + 0.15; }
    } else {
      const th = 3 * Math.PI * u;
      const r = 0.15 + 0.6 * u;
      x = r * Math.cos(th);
      y = r * Math.sin(th);
    }
    // a little jitter so the data is a cloud, not a perfect curve
    x += 0.012 * randn(rng);
    y += 0.012 * randn(rng);
    pts[2 * i] = x;
    pts[2 * i + 1] = y;
  }
  return pts;
}

export function noisePoints(x0, t, rng) {
  const a = alphaBar(t);
  const sa = Math.sqrt(a);
  const sb = Math.sqrt(1 - a);
  const out = new Float64Array(x0.length);
  for (let i = 0; i < x0.length; i++) out[i] = sa * x0[i] + sb * randn(rng);
  return out;
}

// The exact optimal denoiser for a finite dataset: the posterior mean of x0
// given xt, i.e. a softmax over the data points with logits
// -|xt - sqrt(abar) xi|^2 / (2 (1 - abar)). Computed with log-sum-exp.
export function denoisePoint(x, y, t, data) {
  const a = alphaBar(t);
  const sa = Math.sqrt(a);
  const v = Math.max(1 - a, 1e-6);
  const n = data.length / 2;
  const logits = new Float64Array(n);
  let maxL = -Infinity;
  for (let i = 0; i < n; i++) {
    const dx = x - sa * data[2 * i];
    const dy = y - sa * data[2 * i + 1];
    const l = -(dx * dx + dy * dy) / (2 * v);
    logits[i] = l;
    if (l > maxL) maxL = l;
  }
  let sum = 0, mx = 0, my = 0;
  for (let i = 0; i < n; i++) {
    const w = Math.exp(logits[i] - maxL);
    sum += w;
    mx += w * data[2 * i];
    my += w * data[2 * i + 1];
  }
  return [mx / sum, my / sum];
}

export function denoisePoints(xt, t, data) {
  const out = new Float64Array(xt.length);
  for (let i = 0; i < xt.length / 2; i++) {
    const [px, py] = denoisePoint(xt[2 * i], xt[2 * i + 1], t, data);
    out[2 * i] = px;
    out[2 * i + 1] = py;
  }
  return out;
}

// One reverse step tFrom -> tTo (Song et al. 2021's DDIM family). eta = 0 is
// deterministic DDIM; eta = 1 is the DDPM-like stochastic step.
function stepPoint(x, y, tFrom, tTo, data, rng, eta) {
  const a1 = alphaBar(tFrom);
  const a2 = alphaBar(tTo);
  const [x0, y0] = denoisePoint(x, y, tFrom, data);
  const sb1 = Math.sqrt(Math.max(1 - a1, 1e-12));
  const ex = (x - Math.sqrt(a1) * x0) / sb1; // predicted noise
  const ey = (y - Math.sqrt(a1) * y0) / sb1;
  const ratio = a2 > 0 ? (1 - a1 / a2) : 0;
  const sigma = eta * Math.sqrt(Math.max(0, ((1 - a2) / Math.max(1 - a1, 1e-12)) * ratio));
  const c = Math.sqrt(Math.max(0, 1 - a2 - sigma * sigma));
  let nx = Math.sqrt(a2) * x0 + c * ex;
  let ny = Math.sqrt(a2) * y0 + c * ey;
  if (sigma > 0) {
    nx += sigma * randn(rng);
    ny += sigma * randn(rng);
  }
  return [nx, ny];
}

export function timeline(steps, tMax = 0.999) {
  const ts = [];
  for (let k = 0; k <= steps; k++) ts.push(k === steps ? 0 : tMax * (1 - k / steps));
  return ts;
}

export function sample({ data, steps = 50, stochastic = false, n = 300, seed = 1, tMax = 0.999, onStep } = {}) {
  const rng = makeRng(seed);
  const eta = stochastic ? 1 : 0;
  let pts = new Float64Array(2 * n);
  for (let i = 0; i < 2 * n; i++) pts[i] = randn(rng);
  const ts = timeline(steps, tMax);
  if (onStep) onStep(0, ts[0], pts);
  for (let k = 0; k < steps; k++) {
    const next = new Float64Array(2 * n);
    for (let i = 0; i < n; i++) {
      const [x, y] = stepPoint(pts[2 * i], pts[2 * i + 1], ts[k], ts[k + 1], data, rng, eta);
      next[2 * i] = x;
      next[2 * i + 1] = y;
    }
    pts = next;
    if (onStep) onStep(k + 1, ts[k + 1], pts);
  }
  return pts;
}

export function meanNearestDistance(points, data) {
  const m = points.length / 2;
  const n = data.length / 2;
  let total = 0;
  for (let i = 0; i < m; i++) {
    let best = Infinity;
    for (let j = 0; j < n; j++) {
      const d = Math.hypot(points[2 * i] - data[2 * j], points[2 * i + 1] - data[2 * j + 1]);
      if (d < best) best = d;
    }
    total += best;
  }
  return total / m;
}

// Arrows from each grid point toward its denoised estimate: "which way is
// the data from here" at time t.
export function scoreField(gridN, t, data, extent = 1.3) {
  const arrows = [];
  for (let r = 0; r < gridN; r++) {
    for (let c = 0; c < gridN; c++) {
      const x = -extent + (2 * extent * (c + 0.5)) / gridN;
      const y = -extent + (2 * extent * (r + 0.5)) / gridN;
      const [x0, y0] = denoisePoint(x, y, t, data);
      arrows.push({ x, y, dx: x0 - x, dy: y0 - y });
    }
  }
  return arrows;
}
