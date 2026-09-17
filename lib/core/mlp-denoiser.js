// mlp-denoiser: plain-JS inference for the tiny class-conditional noise
// predictor trained by the spike script (tools/train-mlp.py): a 3-hidden-
// layer MLP on 20x20 digits with a sinusoidal time embedding and a learned
// class embedding (index 10 = "no class", for classifier-free guidance).
// Weights: lib/assets/mnist/mlp-denoiser.bin (flat float32, layout in
// mlp-denoiser.json). The schedule is the same cosine alpha-bar as
// lib/core/diffusion.js, so the sampler in diffusion-nd.js drives it
// unchanged. The manifest's `predicts` says what the network outputs:
// 'x0' (the clean image; smoother samples from a small net) or 'epsilon'
// (the noise; x0hat = (xt - sqrt(1-a) eps) / sqrt(a)).
import { alphaBar, makeRng, randn, timeline, stepVec } from './diffusion-nd.js';

const silu = (v) => v / (1 + Math.exp(-v));

// Build a denoiser from a manifest + flat weight buffer.
export function makeMlpDenoiser(manifest, weights) {
  const { d, temb, cemb, hidden: H, classes, null_class: NULL, tscale } = manifest;
  const predictsX0 = manifest.predicts === 'x0';
  let off = 0;
  const take = (n) => { const v = weights.subarray(off, off + n); off += n; return v; };
  const dims = {};
  for (const l of manifest.layout) dims[l.name] = l.shape;
  const cembW = take(classes * cemb);
  const W1 = take(H * (d + temb + cemb)), b1 = take(H);
  const W2 = take(H * H), b2 = take(H);
  const W3 = take(H * H), b3 = take(H);
  const Wo = take(d * H), bo = take(d);
  if (off !== weights.length) throw new Error(`mlp-denoiser: weight size mismatch (${off} vs ${weights.length})`);
  const half = temb / 2;
  const freqs = new Float32Array(half);
  for (let i = 0; i < half; i++) freqs[i] = Math.exp((-Math.log(10000) * i) / half);
  const inp = new Float32Array(d + temb + cemb);
  const h1 = new Float32Array(H), h2 = new Float32Array(H), h3 = new Float32Array(H);

  function linear(W, b, x, nIn, nOut, out, act) {
    for (let o = 0; o < nOut; o++) {
      let s = b[o]; const base = o * nIn;
      for (let i = 0; i < nIn; i++) s += W[base + i] * x[i];
      out[o] = act ? silu(s) : s;
    }
  }
  // raw network output for (xt, t, cls); cls = -1 means unconditional
  function forward(xt, t, cls = -1) {
    inp.set(xt, 0);
    for (let i = 0; i < half; i++) { const ang = t * tscale * freqs[i]; inp[d + i] = Math.sin(ang); inp[d + half + i] = Math.cos(ang); }
    const c = cls < 0 ? NULL : cls;
    for (let i = 0; i < cemb; i++) inp[d + temb + i] = cembW[c * cemb + i];
    linear(W1, b1, inp, d + temb + cemb, H, h1, true);
    linear(W2, b2, h1, H, H, h2, true);
    linear(W3, b3, h2, H, H, h3, true);
    const out = new Float32Array(d);
    linear(Wo, bo, h3, H, d, out, false);
    return out;
  }
  // x0hat (clamped to [-1, 1]) from the network, with classifier-free
  // guidance applied to whatever the network predicts.
  function toX0(xt, t, out) {
    if (predictsX0) return out;
    const a = alphaBar(t); const sa = Math.sqrt(a), sb = Math.sqrt(1 - a);
    const x0 = new Float32Array(d);
    for (let j = 0; j < d; j++) x0[j] = (xt[j] - sb * out[j]) / sa;
    return x0;
  }
  function denoise(xt, t, { cls = -1, w = 1 } = {}) {
    let x0 = toX0(xt, t, forward(xt, t, cls));
    if (cls >= 0 && w !== 1) {
      const u = toX0(xt, t, forward(xt, t, -1));
      const g = new Float32Array(d);
      for (let j = 0; j < d; j++) g[j] = u[j] + w * (x0[j] - u[j]);
      x0 = g;
    }
    for (let j = 0; j < d; j++) x0[j] = Math.max(-1, Math.min(1, x0[j]));
    return x0;
  }
  // kept for tests / inspection: the network's prediction as noise
  function predictNoise(xt, t, cls = -1) {
    const out = forward(xt, t, cls);
    if (!predictsX0) return out;
    const a = alphaBar(t); const sa = Math.sqrt(a), sb = Math.sqrt(Math.max(1 - a, 1e-12));
    const eps = new Float32Array(d);
    for (let j = 0; j < d; j++) eps[j] = (xt[j] - sa * out[j]) / sb;
    return eps;
  }
  function sample({ steps = 30, m = 12, seed = 1, cls = -1, w = 1, stochastic = false, tMax = 0.999, onStep } = {}) {
    const rng = makeRng(seed); const eta = stochastic ? 1 : 0;
    let cur = [];
    for (let s = 0; s < m; s++) { const v = new Float32Array(d); for (let j = 0; j < d; j++) v[j] = randn(rng); cur.push(v); }
    const ts = timeline(steps, tMax);
    if (onStep) onStep(0, ts[0], cur);
    for (let k = 0; k < steps; k++) {
      cur = cur.map((xt) => stepVec(xt, denoise(xt, ts[k], { cls, w }), ts[k], ts[k + 1], rng, eta));
      if (onStep) onStep(k + 1, ts[k + 1], cur);
    }
    return cur;
  }
  return { d, predictNoise, denoise, sample, params: weights.length, predicts: predictsX0 ? 'x0' : 'epsilon' };
}

export async function loadMlpDenoiser(baseUrl) {
  const manifest = await (await fetch(new URL('mlp-denoiser.json', baseUrl))).json();
  const buf = await (await fetch(new URL('mlp-denoiser.bin', baseUrl))).arrayBuffer();
  return makeMlpDenoiser(manifest, new Float32Array(buf));
}
