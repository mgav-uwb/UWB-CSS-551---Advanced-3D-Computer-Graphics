// diffusion-nd: the same mechanism as lib/core/diffusion.js, on vectors of
// any dimension — used for images (a 20x20 digit is a 400-vector). The
// dataset is { x: Float32Array(n*d) in [-1, 1], y: Uint8Array(n) | null,
// n, d }. The denoiser is again the EXACT posterior mean of the clean point
// given the noisy one, with two knobs a real model has too:
//   cls  — condition on a class: only data of that class pulls
//   w    — classifier-free guidance: x0 = uncond + w * (cond - uncond)
// and one honest knob a real model has implicitly:
//   bw   — kernel bandwidth. bw = 0 is the exact posterior mean for the
//          finite dataset (which can only ever land ON a training point:
//          memorization). bw > 0 adds bw^2 to the kernel variance, so the
//          denoiser keeps blending neighbors even at the end of the walk,
//          a crude stand-in for the smooth function a network learns, and
//          samples land BETWEEN training points (novel outputs, and some
//          garbage). That knob is the lookup-to-generalization leap.
import { alphaBar, makeRng, randn, timeline } from './diffusion.js';
export { alphaBar, makeRng, randn, timeline };

export function makeDataset(bytes, labels, d) {
  const n = bytes.length / d;
  const x = new Float32Array(n * d);
  for (let i = 0; i < n * d; i++) x[i] = (bytes[i] / 255) * 2 - 1;
  return { x, y: labels ?? null, n, d };
}

// Posterior mean E[x0 | xt] over the (optionally class-restricted) dataset.
export function denoiseVec(xt, t, data, { cls = -1, bw = 0 } = {}) {
  const { x, y, n, d } = data;
  const a = alphaBar(t);
  const sa = Math.sqrt(a);
  const v = Math.max(1 - a, 1e-6) + bw * bw;
  const logits = new Float64Array(n);
  let maxL = -Infinity;
  for (let i = 0; i < n; i++) {
    if (cls >= 0 && y && y[i] !== cls) { logits[i] = -Infinity; continue; }
    let dist2 = 0;
    const base = i * d;
    for (let j = 0; j < d; j++) { const e = xt[j] - sa * x[base + j]; dist2 += e * e; }
    const l = -dist2 / (2 * v);
    logits[i] = l;
    if (l > maxL) maxL = l;
  }
  const out = new Float32Array(d);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    if (logits[i] === -Infinity) continue;
    const wgt = Math.exp(logits[i] - maxL);
    if (wgt === 0) continue;
    sum += wgt;
    const base = i * d;
    for (let j = 0; j < d; j++) out[j] += wgt * x[base + j];
  }
  for (let j = 0; j < d; j++) out[j] /= sum;
  return out;
}

// Classifier-free guidance on the toy: exaggerate what the class adds.
export function guidedDenoise(xt, t, data, { cls = -1, w = 1, bw = 0 } = {}) {
  if (cls < 0) return denoiseVec(xt, t, data, { bw });
  const c = denoiseVec(xt, t, data, { cls, bw });
  if (w === 1) return c;
  const u = denoiseVec(xt, t, data, { bw });
  const out = new Float32Array(data.d);
  for (let j = 0; j < data.d; j++) out[j] = u[j] + w * (c[j] - u[j]);
  return out;
}

// One DDIM-family step (eta = 0 deterministic, 1 DDPM-like), given x0hat.
export function stepVec(xt, x0, tFrom, tTo, rng, eta) {
  const a1 = alphaBar(tFrom), a2 = alphaBar(tTo);
  const sb1 = Math.sqrt(Math.max(1 - a1, 1e-12));
  const ratio = a2 > 0 ? (1 - a1 / a2) : 0;
  const sigma = eta * Math.sqrt(Math.max(0, ((1 - a2) / Math.max(1 - a1, 1e-12)) * ratio));
  const c = Math.sqrt(Math.max(0, 1 - a2 - sigma * sigma));
  const sa1 = Math.sqrt(a1), sa2 = Math.sqrt(a2);
  const out = new Float32Array(xt.length);
  for (let j = 0; j < xt.length; j++) {
    const eps = (xt[j] - sa1 * x0[j]) / sb1;
    out[j] = sa2 * x0[j] + c * eps + (sigma > 0 ? sigma * randn(rng) : 0);
  }
  return out;
}

// Reverse process for m samples; onStep(k, t, samples: Float32Array[]) after
// every step including k = 0 (the pure-noise start).
export function sampleVec({ data, steps = 30, m = 12, seed = 1, cls = -1, w = 1, bw = 0, stochastic = false, tMax = 0.999, onStep } = {}) {
  const rng = makeRng(seed);
  const eta = stochastic ? 1 : 0;
  let cur = [];
  for (let s = 0; s < m; s++) { const v = new Float32Array(data.d); for (let j = 0; j < data.d; j++) v[j] = randn(rng); cur.push(v); }
  const ts = timeline(steps, tMax);
  if (onStep) onStep(0, ts[0], cur);
  for (let k = 0; k < steps; k++) {
    cur = cur.map((xt) => stepVec(xt, guidedDenoise(xt, ts[k], data, { cls, w, bw }), ts[k], ts[k + 1], rng, eta));
    if (onStep) onStep(k + 1, ts[k + 1], cur);
  }
  return cur;
}

// Nearest training example (L2 in [-1,1] units, normalized per pixel).
export function nearestIndex(vec, data) {
  const { x, n, d } = data;
  let best = Infinity, idx = -1;
  for (let i = 0; i < n; i++) {
    let s = 0; const base = i * d;
    for (let j = 0; j < d; j++) { const e = vec[j] - x[base + j]; s += e * e; }
    if (s < best) { best = s; idx = i; }
  }
  return { index: idx, dist: Math.sqrt(best / d) };
}

export function forwardVec(x0, t, rng) {
  const a = alphaBar(t); const sa = Math.sqrt(a), sb = Math.sqrt(1 - a);
  const out = new Float32Array(x0.length);
  for (let j = 0; j < x0.length; j++) out[j] = sa * x0[j] + sb * randn(rng);
  return out;
}
