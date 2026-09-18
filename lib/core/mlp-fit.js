// mlp-fit: a two-layer perceptron small enough to TRAIN in the browser in a
// blink, used to show what "a neural network is a function approximator"
// means: given a handful of (x, y) points, gradient descent nudges the
// weights until the function passes through them, and between the points
// the function is SMOOTH. That smoothness is what a learned denoiser has and
// a lookup table lacks (the leap in the S10 exhibit ladder).
//
//   f(x) = sum_h w2[h] * tanh(w1[h] * x + b1[h]) + b2
//
// Plain scalar loops, seeded init, full-batch gradient descent with a fixed
// learning rate; deterministic for a given (seed, hidden, epochs).
import { makeRng, randn } from './diffusion.js';

export const TARGETS = {
  wave: (x) => Math.sin(2.2 * x) * 0.8,
  step: (x) => (x < 0 ? -0.6 : 0.6),
  bump: (x) => Math.exp(-4 * x * x) * 1.4 - 0.5,
};

// n sample points of a target on [-1.5, 1.5], with a little noise
export function makeSamples(target, n = 12, seed = 3, noise = 0.03) {
  const rng = makeRng(seed);
  const xs = new Float64Array(n), ys = new Float64Array(n);
  for (let i = 0; i < n; i++) { xs[i] = -1.5 + (3 * (i + 0.5)) / n; ys[i] = TARGETS[target](xs[i]) + noise * randn(rng); }
  return { xs, ys };
}

export function makeMlp(hidden = 16, seed = 1) {
  const rng = makeRng(seed);
  const w1 = new Float64Array(hidden), b1 = new Float64Array(hidden), w2 = new Float64Array(hidden);
  for (let h = 0; h < hidden; h++) { w1[h] = 2 * randn(rng); b1[h] = 1.5 * randn(rng); w2[h] = 0.3 * randn(rng); }
  return { hidden, w1, b1, w2, b2: 0 };
}

export function predict(m, x) {
  let y = m.b2;
  for (let h = 0; h < m.hidden; h++) y += m.w2[h] * Math.tanh(m.w1[h] * x + m.b1[h]);
  return y;
}

export function mse(m, { xs, ys }) {
  let s = 0;
  for (let i = 0; i < xs.length; i++) { const e = predict(m, xs[i]) - ys[i]; s += e * e; }
  return s / xs.length;
}

// One full-batch gradient step on the mean squared error.
export function trainStep(m, { xs, ys }, lr = 0.05) {
  const H = m.hidden, n = xs.length;
  const gw1 = new Float64Array(H), gb1 = new Float64Array(H), gw2 = new Float64Array(H); let gb2 = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i];
    let y = m.b2; const a = new Float64Array(H);
    for (let h = 0; h < H; h++) { a[h] = Math.tanh(m.w1[h] * x + m.b1[h]); y += m.w2[h] * a[h]; }
    const d = (2 * (y - ys[i])) / n;
    gb2 += d;
    for (let h = 0; h < H; h++) { gw2[h] += d * a[h]; const da = d * m.w2[h] * (1 - a[h] * a[h]); gw1[h] += da * x; gb1[h] += da; }
  }
  for (let h = 0; h < H; h++) { m.w1[h] -= lr * gw1[h]; m.b1[h] -= lr * gb1[h]; m.w2[h] -= lr * gw2[h]; }
  m.b2 -= lr * gb2;
  return m;
}

export function train(m, samples, epochs, lr = 0.05) {
  for (let e = 0; e < epochs; e++) trainStep(m, samples, lr);
  return m;
}

// Fit from scratch: deterministic for (target, hidden, epochs, seed).
export function fit({ target = 'wave', hidden = 16, epochs = 500, seed = 1, lr = 0.05 } = {}) {
  const samples = makeSamples(target);
  const m = train(makeMlp(hidden, seed), samples, epochs, lr);
  return { model: m, samples, loss: mse(m, samples) };
}
