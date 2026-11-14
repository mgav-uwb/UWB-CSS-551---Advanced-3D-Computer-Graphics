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
//
// The gradient is MEASURED, not derived: each weight's slope is a central
// difference of the loss, the numerical gradient check. Nudge one weight up
// and down, evaluate the loss at both; a nudge to unit h changes only unit
// h's term of each output, so only that term is recomputed. Backpropagation
// finds the same slopes in one backward pass.
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

const EPS = 1e-5;   // the nudge, relative: small against the weight, large against rounding

// How far to nudge a weight w: EPS, or EPS times |w| once |w| passes 1.
function nudge(w) {
  return EPS * Math.max(1, Math.abs(w));
}

// The loss with unit h's three weights set to (w1, b1, w2), every other
// weight unchanged: rest[i] is sample i's output without unit h's term.
function unitLoss(rest, { xs, ys }, w1, b1, w2) {
  let s = 0;
  for (let i = 0; i < xs.length; i++) { const e = rest[i] + w2 * Math.tanh(w1 * xs[i] + b1) - ys[i]; s += e * e; }
  return s / xs.length;
}

// The loss with every output moved by `shift`, as the output bias b2 moves it.
function shiftedLoss(f, { ys }, shift) {
  let s = 0;
  for (let i = 0; i < ys.length; i++) { const e = f[i] + shift - ys[i]; s += e * e; }
  return s / ys.length;
}

// One full-batch gradient step on the mean squared error. Each slope is a
// central difference, (loss a little above - loss a little below) / (the gap
// between them), measured at the current weights before any weight moves.
export function trainStep(m, samples, lr = 0.05) {
  const { xs } = samples, H = m.hidden, n = xs.length;
  const f = new Float64Array(n), rest = new Float64Array(n);
  for (let i = 0; i < n; i++) f[i] = predict(m, xs[i]);
  const gw1 = new Float64Array(H), gb1 = new Float64Array(H), gw2 = new Float64Array(H);
  for (let h = 0; h < H; h++) {
    const w1 = m.w1[h], b1 = m.b1[h], w2 = m.w2[h];
    for (let i = 0; i < n; i++) rest[i] = f[i] - w2 * Math.tanh(w1 * xs[i] + b1);
    let hi = w1 + nudge(w1), lo = w1 - nudge(w1);
    gw1[h] = (unitLoss(rest, samples, hi, b1, w2) - unitLoss(rest, samples, lo, b1, w2)) / (hi - lo);
    hi = b1 + nudge(b1); lo = b1 - nudge(b1);
    gb1[h] = (unitLoss(rest, samples, w1, hi, w2) - unitLoss(rest, samples, w1, lo, w2)) / (hi - lo);
    hi = w2 + nudge(w2); lo = w2 - nudge(w2);
    gw2[h] = (unitLoss(rest, samples, w1, b1, hi) - unitLoss(rest, samples, w1, b1, lo)) / (hi - lo);
  }
  const d = nudge(m.b2);
  const gb2 = (shiftedLoss(f, samples, d) - shiftedLoss(f, samples, -d)) / (2 * d);
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
