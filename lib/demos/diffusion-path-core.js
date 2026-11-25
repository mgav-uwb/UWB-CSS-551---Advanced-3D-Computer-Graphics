// diffusion-path-core: the numbers behind the diffusion-path lab (no DOM, so node can test them). Two worlds: the 2D spiral (a sample, its
// path, the cloud it sits inside) and the 2,000 digits (400 numbers each). Both walk with the deterministic denoising diffusion implicit
// models (DDIM) step of lib/core/diffusion-nd.js; the denoiser is the exact one (a weighted average of the training points) or, for digits,
// the trained multilayer perceptron (MLP). Trajectories are cached per (start, steps, denoiser), so dragging the step slider only redraws.
import { alphaBar, makeRng, randn, makeShape, denoisePoint, scoreField, timeline } from '../core/diffusion.js';
import { makeDataset, stepVec, nearestIndex } from '../core/diffusion-nd.js';
import { loadMlpDenoiser } from '../core/mlp-denoiser.js';
import { dct2d } from '../programs/image-lab/webgl/imagelab.js';

export const SIDE = 20;
export const D = SIDE * SIDE;
export const STEPS = 30;
export const TMAX = 0.999;
export const LOW = 4;          // the lowest 4 x 4 block of cosine coefficients is "low frequency" in the band split
export const SHARE = 5;        // and the lowest 5 x 5 block is what the share of energy counts

export const START = [
  ['shell', 'on the shell (×1)', 1],
  ['big', 'too large (×3)', 3],
  ['small', 'too small (×0.7)', 0.7],
];
export const DENOISERS = [['exact', 'exact (a lookup over the 2,000 digits)'], ['net', 'trained network']];
export const startLabel = (id) => (START.find((s) => s[0] === id) ?? START[0])[1];

// ---------------------------------------------------------------- the data, injected (node) or fetched (browser)

const lib = { data: null, net: null, dataP: null, netP: null, netFailed: false };
const caches = { traj: new Map(), met: new WeakMap() };

/** the 2,000 digits from their two files' bytes (20 x 20 row-major, labels one byte each) */
export function setDigits(bytes, labels) {
  lib.data = makeDataset(bytes, labels, D);
  caches.traj.clear();
}
/** a network from makeMlpDenoiser, or null */
export function setNetwork(net) { lib.net = net; lib.netFailed = false; caches.traj.clear(); }
export const digits = () => lib.data;
export const network = () => lib.net;
export const networkFailed = () => lib.netFailed;

export function ensureDigits() {
  if (lib.data) return Promise.resolve(lib.data);
  lib.dataP ??= (async () => {
    const base = new URL('../assets/mnist/', import.meta.url);
    const [a, b] = await Promise.all([fetch(new URL('mnist-2000-20x20.bin', base)), fetch(new URL('mnist-2000-labels.bin', base))]);
    setDigits(new Uint8Array(await a.arrayBuffer()), new Uint8Array(await b.arrayBuffer()));
    return lib.data;
  })();
  return lib.dataP;
}
export function ensureNetwork() {
  if (lib.net) return Promise.resolve(lib.net);
  lib.netP ??= loadMlpDenoiser(new URL('../assets/mnist/', import.meta.url)).then((n) => { setNetwork(n); return n; }).catch(() => { lib.netFailed = true; return null; });
  return lib.netP;
}
/** what a view needs before it can compute: 'digits', 'net' or null when everything is there. Starts the fetch and calls again() when it lands. */
export function needs(den, again) {
  let what = null;
  if (!lib.data) { what = 'digits'; ensureDigits().then(() => again?.()); }
  else if (den === 'net' && !lib.net && !lib.netFailed) { what = 'net'; ensureNetwork().then(() => again?.()); }
  return what;
}

// ---------------------------------------------------------------- starting noise

/** the starting noise of a seed, d numbers: on the shell, three times as long, or the midpoint of two noises (about 0.71 as long) */
export function startNoise(seed, start, d = D) {
  const rng = makeRng(seed);
  const e1 = new Float32Array(d);
  for (let j = 0; j < d; j++) e1[j] = randn(rng);
  if (start === 'big') return e1.map((v) => 3 * v);
  if (start === 'small') {
    const out = new Float32Array(d);
    for (let j = 0; j < d; j++) out[j] = (e1[j] + randn(rng)) / 2;
    return out;
  }
  return e1;
}

export const norm = (v) => { let s = 0; for (let j = 0; j < v.length; j++) s += v[j] * v[j]; return Math.sqrt(s); };
export const dist = (a, b) => { let s = 0; for (let j = 0; j < a.length; j++) { const e = a[j] - b[j]; s += e * e; } return Math.sqrt(s); };

// ---------------------------------------------------------------- the exact denoiser with its weights

/**
 * The exact guess of the clean digit: every training digit gets a weight that falls off with its squared distance from the sample (to the
 * scaled digit), the weights sum to 1, and the guess is the weighted average of the digits. Same numbers as denoiseVec in
 * lib/core/diffusion-nd.js (the test holds them equal); this one also returns the weights.
 */
export function exactGuess(xt, t, data) {
  const { x, n, d } = data;
  const a = alphaBar(t), sa = Math.sqrt(a), v = Math.max(1 - a, 1e-6);
  const logits = new Float64Array(n);
  let maxL = -Infinity;
  for (let i = 0; i < n; i++) {
    let s = 0;
    const base = i * d;
    for (let j = 0; j < d; j++) { const e = xt[j] - sa * x[base + j]; s += e * e; }
    const l = -s / (2 * v);
    logits[i] = l;
    if (l > maxL) maxL = l;
  }
  const w = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) { const e = Math.exp(logits[i] - maxL); logits[i] = e; sum += e; }
  const x0 = new Float32Array(d);
  for (let i = 0; i < n; i++) {
    const wi = logits[i] / sum;
    w[i] = wi;
    if (wi < 1e-9) continue;
    const base = i * d;
    for (let j = 0; j < d; j++) x0[j] += wi * x[base + j];
  }
  return { x0, w };
}

export function topOf(w) {
  let best = 0;
  for (let i = 1; i < w.length; i++) if (w[i] > w[best]) best = i;
  return best;
}
/** how many digits effectively share the guess: 1 over the sum of squared weights */
export function sharing(w) { let s = 0; for (let i = 0; i < w.length; i++) s += w[i] * w[i]; return 1 / s; }

// ---------------------------------------------------------------- digit trajectories

/** one deterministic walk from a starting vector: samples xs[0..steps], guesses x0[0..steps], and for the exact denoiser the weights W[k] */
export function walk(start, den, steps = STEPS) {
  const data = lib.data;
  if (den === 'net' && !lib.net && lib.netFailed) den = 'exact';     // the network did not load: the exact denoiser stands in
  if (!data || (den === 'net' && !lib.net)) return null;
  const ts = timeline(steps, TMAX);
  const xs = [], x0 = [], W = [];
  let x = Float32Array.from(start);
  for (let k = 0; k < steps; k++) {
    let g;
    if (den === 'net') g = { x0: lib.net.denoise(x, ts[k], { cls: -1 }), w: null };
    else g = exactGuess(x, ts[k], data);
    xs.push(x); x0.push(g.x0); W.push(g.w);
    x = stepVec(x, g.x0, ts[k], ts[k + 1], null, 0);
  }
  xs.push(x); x0.push(x); W.push(den === 'net' ? null : exactGuess(x, 0, data).w);
  const final = nearestIndex(x, data);
  return { ts, xs, x0, W, den, steps, final: final.index, finalDist: final.dist * Math.sqrt(D) };
}

/** the walk of a seed with a starting-noise option, cached */
export function trajectory(seed, start, den, steps = STEPS) {
  const key = `${seed}|${start}|${den}|${steps}`;
  if (!caches.traj.has(key)) {
    const tr = walk(startNoise(seed, start), den, steps);
    if (!tr) return null;
    tr.seed = seed; tr.start = start;
    caches.traj.set(key, tr);
    if (caches.traj.size > 40) caches.traj.delete(caches.traj.keys().next().value);
  }
  return caches.traj.get(key);
}

/** the second sample of the pair: B = cos(theta) A + sin(theta) Z with Z a second, independent starting noise of the same kind */
export function pairStart(seed, start, theta) {
  const a = startNoise(seed, start), z = startNoise(seed + 1000, start);
  const b = new Float32Array(D);
  const c = Math.cos(theta), s = Math.sin(theta);
  for (let j = 0; j < D; j++) b[j] = c * a[j] + s * z[j];
  return b;
}
export function pairTrajectories(seed, start, theta, steps = STEPS) {
  const key = `pair|${seed}|${start}|${theta.toFixed(4)}|${steps}`;
  if (!caches.traj.has(key)) {
    if (!lib.data) return null;
    const A = trajectory(seed, start, 'exact', steps);
    const B = walk(pairStart(seed, start, theta), 'exact', steps);
    const gap = A.x0.map((g, k) => dist(g, B.x0[k]));
    const final = gap[steps];
    caches.traj.set(key, { A, B, gap, split: splitStep(gap), finalGap: final, theta, seed });
    if (caches.traj.size > 40) caches.traj.delete(caches.traj.keys().next().value);
  }
  return caches.traj.get(key);
}
/** the first step at which the two guesses are at least half as far apart as the two final digits, or -1 when the walks end on the same digit */
export function splitStep(gap) {
  const final = gap[gap.length - 1];
  if (final < 1) return -1;
  for (let k = 0; k < gap.length; k++) if (gap[k] >= 0.5 * final) return k;
  return gap.length - 1;
}

/** the five digits that carry the most weight over the whole walk, largest first */
export function topFive(W) {
  const total = new Float64Array(W[0].length);
  for (const w of W) for (let i = 0; i < w.length; i++) total[i] += w[i];
  return Array.from(total.keys()).sort((a, b) => total[b] - total[a]).slice(0, 5);
}

// ---------------------------------------------------------------- measures of a digit walk

const cosine = (x) => dct2d(Array.from(x), SIDE).coefficients;
const inBlock = (idx, n) => (idx % SIDE) < n && Math.floor(idx / SIDE) < n;   // Y[v * SIDE + u]: u is the column, v the row

/** share of the guess's energy in the lowest 5 x 5 block of cosine coefficients */
export function lowShare(x0) {
  const Y = cosine(x0);
  let low = 0, all = 0;
  for (let k = 0; k < Y.length; k++) { all += Y[k] * Y[k]; if (inBlock(k, SHARE)) low += Y[k] * Y[k]; }
  return all > 0 ? low / all : 0;
}

/**
 * Per step: how far the guess's low band (the lowest 4 x 4 block) and its high band (all the rest) are from their final values, each
 * divided by the length of that final band. Orthonormal coefficients, so distances in them are distances between the band images.
 */
export function bandSettling(x0s) {
  const Ys = x0s.map(cosine), F = Ys[Ys.length - 1];
  const bandNorm = (Y, low) => { let s = 0; for (let k = 0; k < Y.length; k++) if (inBlock(k, LOW) === low) s += Y[k] * Y[k]; return Math.sqrt(s); };
  const bandDist = (Y, low) => { let s = 0; for (let k = 0; k < Y.length; k++) if (inBlock(k, LOW) === low) { const e = Y[k] - F[k]; s += e * e; } return Math.sqrt(s); };
  const nl = bandNorm(F, true), nh = bandNorm(F, false);
  return { low: Ys.map((Y) => bandDist(Y, true) / nl), high: Ys.map((Y) => bandDist(Y, false) / nh) };
}

/** distance from the sample to the nearest scaled digit, and to the nearest unscaled digit, with the digit's index */
export function nearestDistances(xt, t, data) {
  const { x, n, d } = data;
  const sa = Math.sqrt(alphaBar(t));
  let bs = Infinity, br = Infinity, is = -1, ir = -1;
  for (let i = 0; i < n; i++) {
    let s = 0, r = 0;
    const base = i * d;
    for (let j = 0; j < d; j++) { const v = x[base + j], e = xt[j] - sa * v, f = xt[j] - v; s += e * e; r += f * f; }
    if (s < bs) { bs = s; is = i; }
    if (r < br) { br = r; ir = i; }
  }
  return { scaled: Math.sqrt(bs), scaledIndex: is, raw: Math.sqrt(br), rawIndex: ir };
}

/** the length of every training digit in [-1, 1] units, as a sorted array's summary */
export function digitLengths(data) {
  const out = [];
  for (let i = 0; i < data.n; i++) out.push(norm(data.x.subarray(i * data.d, (i + 1) * data.d)));
  out.sort((a, b) => a - b);
  return { min: out[0], max: out[out.length - 1], median: out[out.length >> 1] };
}

/** all measures of a digit walk that views b, c and d draw; each is computed the first time it is read, once per trajectory */
export function measures(tr) {
  if (!caches.met.has(tr)) {
    const memo = {}, m = {};
    const lazy = (name, make) => Object.defineProperty(m, name, { enumerable: true, get: () => (name in memo ? memo[name] : (memo[name] = make())) });
    const near = () => (memo.near ??= tr.xs.map((x, k) => nearestDistances(x, tr.ts[k], lib.data)));
    const bands = () => (memo.bands ??= bandSettling(tr.x0));
    lazy('radius', () => tr.ts.map((t) => Math.sqrt((1 - alphaBar(t)) * D)));
    lazy('scaled', () => near().map((q) => q.scaled));
    lazy('raw', () => near().map((q) => q.raw));
    lazy('length', () => tr.xs.map(norm));
    lazy('share', () => tr.x0.map(lowShare));
    lazy('settleLow', () => bands().low);
    lazy('settleHigh', () => bands().high);
    lazy('topW', () => (tr.W[0] ? tr.W.map((w) => w[topOf(w)]) : null));
    lazy('top', () => (tr.W[0] ? tr.W.map(topOf) : null));
    lazy('sharing', () => (tr.W[0] ? tr.W.map(sharing) : null));
    caches.met.set(tr, m);
  }
  return caches.met.get(tr);
}

/** distances from the starting noise to every training digit */
export function startDistances(start, data) {
  const out = new Float32Array(data.n);
  for (let i = 0; i < data.n; i++) out[i] = dist(start, data.x.subarray(i * data.d, (i + 1) * data.d));
  return out;
}
export function summary(a) {
  let lo = Infinity, hi = -Infinity, s = 0;
  for (const v of a) { lo = Math.min(lo, v); hi = Math.max(hi, v); s += v; }
  const mean = s / a.length;
  let q = 0;
  for (const v of a) q += (v - mean) ** 2;
  return { min: lo, max: hi, mean, sd: Math.sqrt(q / a.length) };
}

// ---------------------------------------------------------------- the 2D spiral

export const E2 = 2.5;           // the plane drawn is [-E2, E2] on both axes
export const GRID = 64;          // the cloud's heat map is GRID x GRID
let spiralData = null;
export const spiral = () => (spiralData ??= makeShape('spiral'));
export function dataMean(data) {
  let sx = 0, sy = 0;
  const n = data.length / 2;
  for (let i = 0; i < n; i++) { sx += data[2 * i]; sy += data[2 * i + 1]; }
  return [sx / n, sy / n];
}
export function nearestData(x, y, data, scale = 1) {
  let best = Infinity, at = 0;
  for (let i = 0; i < data.length / 2; i++) {
    const d2 = (x - scale * data[2 * i]) ** 2 + (y - scale * data[2 * i + 1]) ** 2;
    if (d2 < best) { best = d2; at = i; }
  }
  return { dist: Math.sqrt(best), index: at };
}

const trajs2 = new Map();
/** the 2D walk of a seed: samples (x, y) at every step with their guesses, the nearest-data distances and the one big step */
export function trajectory2d(seed, start, steps = STEPS) {
  const key = `${seed}|${start}|${steps}`;
  if (trajs2.has(key)) return trajs2.get(key);
  const data = spiral(), ts = timeline(steps, TMAX);
  const s0 = startNoise(seed, start, 2);
  const pts = [], guess = [];
  let x = s0;
  for (let k = 0; k < steps; k++) {
    const g = denoisePoint(x[0], x[1], ts[k], data);
    pts.push([x[0], x[1]]); guess.push(g);
    x = stepVec(x, g, ts[k], ts[k + 1], null, 0);
  }
  pts.push([x[0], x[1]]); guess.push([x[0], x[1]]);
  const mean = denoisePoint(s0[0], s0[1], ts[0], data);
  const near = pts.map((p, k) => nearestData(p[0], p[1], data, Math.sqrt(alphaBar(ts[k]))).dist);
  const landing = nearestData(pts[steps][0], pts[steps][1], data).dist;
  const jump = nearestData(mean[0], mean[1], data).dist;
  const tr = { ts, pts, guess, start: [s0[0], s0[1]], jump: mean, jumpOff: jump, landingOff: landing, near, steps, seed, startId: start };
  trajs2.set(key, tr);
  return tr;
}

const levels = new Map();
/** the noised cloud at step k as a GRID x GRID array of intensities in [0, 1] (density of the scaled data blurred by the noise, normalized to its peak) */
export function cloudAt(k, steps = STEPS) {
  const key = `${k}|${steps}`;
  if (levels.has(key)) return levels.get(key);
  const data = spiral(), t = timeline(steps, TMAX)[k], a = alphaBar(t), sa = Math.sqrt(a);
  const cell = (2 * E2) / GRID;
  const v = Math.max(1 - a, (0.5 * cell) ** 2);          // the last levels are narrower than a cell: show them one cell wide
  const n = data.length / 2;
  const px = new Float64Array(n), py = new Float64Array(n);
  for (let i = 0; i < n; i++) { px[i] = sa * data[2 * i]; py[i] = sa * data[2 * i + 1]; }
  // the Gaussian is separable: one exponential per point per column and per row, then sums of products
  const ex = new Float64Array(n * GRID), ey = new Float64Array(n * GRID);
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < GRID; c++) {
      ex[i * GRID + c] = Math.exp(-((-E2 + (c + 0.5) * cell - px[i]) ** 2) / (2 * v));
      ey[i * GRID + c] = Math.exp(-((E2 - (c + 0.5) * cell - py[i]) ** 2) / (2 * v));
    }
  }
  const g = new Float32Array(GRID * GRID);
  let max = 0;
  for (let r = 0; r < GRID; r++) {
    for (let c = 0; c < GRID; c++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += ey[i * GRID + r] * ex[i * GRID + c];
      g[r * GRID + c] = s;
      if (s > max) max = s;
    }
  }
  for (let q = 0; q < g.length; q++) g[q] = Math.pow(g[q] / max, 0.6);
  levels.set(key, g);
  return g;
}

const fields = new Map();
/** the denoiser's arrows on a sparse grid at step k: each from a grid point to where the denoiser's guess puts the clean point */
export function arrowsAt(k, steps = STEPS, gridN = 11) {
  const key = `${k}|${steps}|${gridN}`;
  if (!fields.has(key)) fields.set(key, scoreField(gridN, timeline(steps, TMAX)[k], spiral(), E2));
  return fields.get(key);
}
