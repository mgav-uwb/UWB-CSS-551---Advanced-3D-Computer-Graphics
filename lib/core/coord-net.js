// coord-net: coordinate networks small enough to train in the browser. An image is a function
// from pixel coordinates (x, y) to a colour (r, g, b); a multilayer perceptron (MLP) fitted to one
// image is pure function approximation, a network that memorizes one signal. Three variants:
//
//   relu     raw (x, y) in [-1, 1]² → ReLU → ReLU → linear RGB       (spectral bias: it blurs)
//   fourier  γ(v) = [cos 2πBv, sin 2πBv], v in [0, 1]², B ~ N(0, σ²)  (Tancik et al. 2020)
//            → ReLU → ReLU → linear RGB
//   siren    (x, y) → sin(ω₀(Wx + b)) → sin(ω₀(Wx + b)) → linear RGB  (Sitzmann et al. 2020)
//
// Plain loops over Float64Arrays, a hand-written backward pass and Adam, seeded initialization and
// seeded mini-batches: deterministic for a given (image, kind, options, seed, steps), so the numbers
// a node script prints are the numbers the demo shows.
import { makeRng, randn } from './diffusion.js';

export const IMAGE_N = 64;

// ---------- target images (procedural, 4×4 supersampled, RGB in [0, 1]) ----------
function cardColor(u, v) {
  // u, v in [0, 1], v down. Four regions with rising frequency content.
  let r = 0.25 + 0.5 * u, g = 0.3 + 0.4 * v, b = 0.75 - 0.4 * u;              // smooth backdrop
  const dx = u - 0.3, dy = v - 0.3;
  if (dx * dx + dy * dy < 0.18 * 0.18) { r = 0.95; g = 0.35; b = 0.2; }       // a disc: one sharp edge
  if (u < 0.5 && v > 0.55) {                                                  // checkerboard, 4-pixel squares
    const c = (Math.floor(u * 16) + Math.floor(v * 16)) & 1;
    r = g = b = c ? 0.95 : 0.1;
  }
  if (u > 0.58 && u < 0.95 && v > 0.08 && v < 0.92) {                         // a chirp: stripes, period 16 → 3 px
    const t = (v - 0.08) / 0.84;                                             // 0 at top, 1 at bottom
    const cycles = 64 * (t / 16 + (t * t) * (1 / 3 - 1 / 16) / 2) * 0.84;     // integrated frequency
    const s = Math.sin(2 * Math.PI * cycles) > 0 ? 1 : 0;
    r = 0.15 + 0.8 * s; g = 0.8 * s + 0.1; b = 0.2;
  }
  return [r, g, b];
}
function blobsColor(u, v) {
  // only low frequencies: three soft Gaussian blobs over a gradient
  const gs = (cx, cy, s) => Math.exp(-((u - cx) ** 2 + (v - cy) ** 2) / (2 * s * s));
  const a = gs(0.3, 0.35, 0.16), c = gs(0.7, 0.6, 0.2), d = gs(0.45, 0.8, 0.12);
  return [0.15 + 0.8 * a + 0.1 * u, 0.2 + 0.7 * c, 0.25 + 0.6 * d + 0.2 * (1 - v)];
}
export const IMAGES = { card: cardColor, blobs: blobsColor };

export function makeImage(name = 'card', N = IMAGE_N) {
  const f = IMAGES[name], img = new Float64Array(N * N * 3), S = 4;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let r = 0, g = 0, b = 0;
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const c = f((i + (sx + 0.5) / S) / N, (j + (sy + 0.5) / S) / N);
      r += c[0]; g += c[1]; b += c[2];
    }
    const k = 3 * (j * N + i);
    img[k] = r / (S * S); img[k + 1] = g / (S * S); img[k + 2] = b / (S * S);
  }
  return img;
}

// pixel index → coordinates (x, y) in [-1, 1]², pixel centres
export function pixelCoord(idx, N = IMAGE_N) {
  const i = idx % N, j = (idx / N) | 0;
  return [((i + 0.5) / N) * 2 - 1, ((j + 0.5) / N) * 2 - 1];
}

// ---------- networks ----------
// A net: { kind, enc (input encoding), layers: [{ nIn, nOut, W (nOut×nIn row-major), b, act }] }
// act: 'relu' | 'sin' (sin(ω₀ z)) | 'linear'.
function layer(nIn, nOut, act) {
  return { nIn, nOut, act, W: new Float64Array(nIn * nOut), b: new Float64Array(nOut) };
}

export const DEFAULTS = { hidden: 48, depth: 2, nFreq: 16, sigma: 6, omega0: 30 };

export function makeNet(kind, opts = {}, seed = 1) {
  const o = { ...DEFAULTS, ...opts };
  const rng = makeRng(seed * 7919 + (kind === 'relu' ? 1 : kind === 'fourier' ? 2 : 3));
  const net = { kind, opts: o, layers: [], B: null };
  let nIn = 2;
  if (kind === 'fourier') {
    net.B = new Float64Array(o.nFreq * 2);
    for (let k = 0; k < net.B.length; k++) net.B[k] = o.sigma * randn(rng);
    nIn = 2 * o.nFreq;
  }
  const hidAct = kind === 'siren' ? 'sin' : 'relu';
  for (let d = 0; d < o.depth; d++) { net.layers.push(layer(nIn, o.hidden, hidAct)); nIn = o.hidden; }
  net.layers.push(layer(nIn, 3, 'linear'));
  net.layers.forEach((L, li) => {
    const n = L.nIn;
    for (let k = 0; k < L.W.length; k++) {
      if (kind === 'siren' && L.act === 'sin') {
        // Sitzmann et al.: first layer U(−1/n, 1/n); later layers U(−√(6/n)/ω₀, √(6/n)/ω₀)
        const a = li === 0 ? 1 / n : Math.sqrt(6 / n) / o.omega0;
        L.W[k] = (2 * rng() - 1) * a;
      } else if (kind === 'siren') {
        L.W[k] = (2 * rng() - 1) * Math.sqrt(6 / n) / o.omega0;   // linear output, same bound
      } else {
        L.W[k] = randn(rng) * Math.sqrt((L.act === 'linear' ? 1 : 2) / n);   // He / Glorot-style
      }
    }
    if (kind === 'siren') for (let k = 0; k < L.b.length; k++) L.b[k] = (2 * rng() - 1) / Math.sqrt(n);
  });
  net.adam = net.layers.map((L) => ({ mW: new Float64Array(L.W.length), vW: new Float64Array(L.W.length), mb: new Float64Array(L.b.length), vb: new Float64Array(L.b.length) }));
  net.t = 0;
  return net;
}

export function paramCount(net) {
  return net.layers.reduce((s, L) => s + L.W.length + L.b.length, 0);
}

// input encoding of one coordinate pair
export function encode(net, x, y, out) {
  if (net.kind !== 'fourier') { out[0] = x; out[1] = y; return out; }
  const u = (x + 1) / 2, v = (y + 1) / 2, m = net.opts.nFreq, B = net.B;
  for (let k = 0; k < m; k++) {
    const a = 2 * Math.PI * (B[2 * k] * u + B[2 * k + 1] * v);
    out[k] = Math.cos(a); out[m + k] = Math.sin(a);
  }
  return out;
}

// forward pass; keeps pre-activations zs[l] and activations as[l] (as[0] = encoded input)
function forward(net, x, y, cache) {
  encode(net, x, y, cache.as[0]);
  const w0 = net.opts.omega0;
  net.layers.forEach((L, l) => {
    const a = cache.as[l], z = cache.zs[l], out = cache.as[l + 1];
    for (let o = 0; o < L.nOut; o++) {
      let s = L.b[o]; const row = o * L.nIn;
      for (let i = 0; i < L.nIn; i++) s += L.W[row + i] * a[i];
      z[o] = s;
      out[o] = L.act === 'relu' ? (s > 0 ? s : 0) : L.act === 'sin' ? Math.sin(w0 * s) : s;
    }
  });
  return cache.as[net.layers.length];
}

function makeCache(net) {
  const as = [new Float64Array(net.layers[0].nIn)], zs = [], ds = [];
  for (const L of net.layers) { as.push(new Float64Array(L.nOut)); zs.push(new Float64Array(L.nOut)); ds.push(new Float64Array(L.nOut)); }
  return { as, zs, ds };
}
function makeGrads(net) {
  return net.layers.map((L) => ({ W: new Float64Array(L.W.length), b: new Float64Array(L.b.length) }));
}

export function predict(net, x, y) {
  if (!net._cache) net._cache = makeCache(net);
  return Array.from(forward(net, x, y, net._cache));
}

// Loss = mean over the given pixels and 3 channels of squared error. Accumulates gradients into g.
export function lossAndGrad(net, img, idxs, g, N = IMAGE_N) {
  const cache = net._cache ?? (net._cache = makeCache(net));
  const nL = net.layers.length, w0 = net.opts.omega0, scale = 2 / (idxs.length * 3);
  let loss = 0;
  for (const idx of idxs) {
    const [x, y] = pixelCoord(idx, N);
    const out = forward(net, x, y, cache);
    const dOut = cache.ds[nL - 1];
    for (let c = 0; c < 3; c++) { const e = out[c] - img[3 * idx + c]; loss += e * e; dOut[c] = scale * e; }
    for (let l = nL - 1; l >= 0; l--) {
      const L = net.layers[l], d = cache.ds[l], a = cache.as[l], z = cache.zs[l], gl = g[l];
      // d currently holds dL/d(out of layer l); turn it into dL/dz
      if (L.act === 'relu') for (let o = 0; o < L.nOut; o++) { if (z[o] <= 0) d[o] = 0; }
      else if (L.act === 'sin') for (let o = 0; o < L.nOut; o++) d[o] *= w0 * Math.cos(w0 * z[o]);
      for (let o = 0; o < L.nOut; o++) {
        const dz = d[o]; if (dz === 0) continue;
        gl.b[o] += dz; const row = o * L.nIn;
        for (let i = 0; i < L.nIn; i++) gl.W[row + i] += dz * a[i];
      }
      if (l > 0) {
        const dPrev = cache.ds[l - 1];
        dPrev.fill(0);
        for (let o = 0; o < L.nOut; o++) {
          const dz = d[o]; if (dz === 0) continue; const row = o * L.nIn;
          for (let i = 0; i < L.nIn; i++) dPrev[i] += dz * L.W[row + i];
        }
      }
    }
  }
  return loss / (idxs.length * 3);
}

export const LR = { relu: 0.005, fourier: 0.005, siren: 0.0005 };

export function adamStep(net, g, lr = LR[net.kind], b1 = 0.9, b2 = 0.999, eps = 1e-8) {
  net.t++;
  const c1 = 1 - b1 ** net.t, c2 = 1 - b2 ** net.t;
  net.layers.forEach((L, l) => {
    const s = net.adam[l];
    for (const [p, gr, m, v] of [[L.W, g[l].W, s.mW, s.vW], [L.b, g[l].b, s.mb, s.vb]]) {
      for (let k = 0; k < p.length; k++) {
        m[k] = b1 * m[k] + (1 - b1) * gr[k];
        v[k] = b2 * v[k] + (1 - b2) * gr[k] * gr[k];
        p[k] -= (lr * (m[k] / c1)) / (Math.sqrt(v[k] / c2) + eps);
      }
    }
  });
}

// A trainer: one net, one image, seeded mini-batches.
export function makeTrainer(kind, img, opts = {}, { seed = 1, batch = 256, lr, N = IMAGE_N } = {}) {
  const net = makeNet(kind, opts, seed);
  const g = makeGrads(net), rng = makeRng(seed * 104729 + 17);
  const idxs = new Int32Array(batch);
  const tr = {
    net, img, steps: 0, lastLoss: NaN,
    step() {
      for (let k = 0; k < batch; k++) idxs[k] = Math.floor(rng() * N * N);
      for (const gl of g) { gl.W.fill(0); gl.b.fill(0); }
      tr.lastLoss = lossAndGrad(net, img, idxs, g, N);
      adamStep(net, g, lr ?? LR[kind]);
      tr.steps++;
      return tr.lastLoss;
    },
  };
  return tr;
}

// Render the whole image (RGB, unclamped) and its error against the target.
export function render(net, N = IMAGE_N, out = new Float64Array(N * N * 3)) {
  for (let idx = 0; idx < N * N; idx++) {
    const [x, y] = pixelCoord(idx, N);
    const c = predict(net, x, y);
    out[3 * idx] = c[0]; out[3 * idx + 1] = c[1]; out[3 * idx + 2] = c[2];
  }
  return out;
}

export function mse(a, b) {
  let s = 0;
  for (let k = 0; k < a.length; k++) { const e = Math.min(1, Math.max(0, a[k])) - b[k]; s += e * e; }
  return s / a.length;
}
export const psnr = (m) => 10 * Math.log10(1 / m);

// exposed for the gradient check in the tests
export { makeGrads, makeCache };
