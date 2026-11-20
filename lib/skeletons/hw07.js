// CSS 551 · HW7 · A gradient step, a fit, and a digit's DCT. YOUR FILE (JavaScript track):
// fill in every TODO (gradients is given) and submit this one file. Run: homework/run.html?hw=hw07 from a local
// server. (The Python track does the same in homework/hw07/hw07.ipynb.)
//
// A model is { w1, b1, w2, b2 }: H hidden tanh units on a scalar input,
//   a[h] = tanh(w1[h] x + b1[h]),   f(x) = b2 + sum_h w2[h] a[h].
// Plain arrays and loops; no libraries.

/** forward(m, x) -> { a (array of H), f }. */
export function forward(m, x) {
  // TODO
  return { a: m.w1.map(() => 0), f: 0 };
}

// ---- GIVEN: do not edit gradients(). ------------------------------------------------------
/**
 * gradients(m, xs, ys) -> { w1, b1, w2 (arrays), b2, loss }: the mean squared error
 *   loss = (1 / n) sum_i (f(xs[i]) - ys[i])^2
 * and its gradient with respect to each parameter, by backpropagation. It runs its own forward
 * pass, so it works before your forward() does.
 */
export function gradients(m, xs, ys) {
  const H = m.w1.length, n = xs.length;
  const g = { w1: new Array(H).fill(0), b1: new Array(H).fill(0), w2: new Array(H).fill(0), b2: 0, loss: 0 };
  for (let i = 0; i < n; i++) {
    const a = new Array(H);
    let f = m.b2;
    for (let h = 0; h < H; h++) {
      a[h] = Math.tanh(m.w1[h] * xs[i] + m.b1[h]);
      f += m.w2[h] * a[h];
    }
    const err = f - ys[i];
    g.loss += (err * err) / n;
    const dF = (2 * err) / n;
    g.b2 += dF;
    for (let h = 0; h < H; h++) {
      g.w2[h] += dF * a[h];
      const dz = dF * m.w2[h] * (1 - a[h] * a[h]);
      g.w1[h] += dz * xs[i];
      g.b1[h] += dz;
    }
  }
  return g;
}
// ---- end of the given code -----------------------------------------------------------------

/** sgdStep(m, g, lr) -> a NEW model, each parameter moved by -lr times its gradient. */
export function sgdStep(m, g, lr) {
  // TODO
  return { w1: [...m.w1], b1: [...m.b1], w2: [...m.w2], b2: m.b2 };
}

/**
 * train(m, xs, ys, lr, steps) -> an array of steps + 1 losses: entry 0 is the loss of m before
 * any step, entry k the loss after k full-batch steps. Each step is
 *   g = gradients(m, xs, ys);  m = sgdStep(m, g, lr).
 * Do not change the model you were given: keep your own current model in a variable.
 */
export function train(m, xs, ys, lr, steps) {
  // TODO
  return [];
}

/**
 * Your learning-rate report, 3 to 5 sentences, graded by hand (10 points). Run train on the 12-unit
 * network and the 12 wave samples at three rates (the homework page lists them) and say which rate
 * was too slow, which diverged, and why, in terms of the size of the step.
 */
export const LR_REPORT = '';

/**
 * The orthonormal 2D DCT-II of an n x n image (row-major, img[y * n + x]). Returns C with
 * C[u * n + v] the coefficient of vertical frequency u and horizontal frequency v:
 *   C[u][v] = c(u) c(v) sum_y sum_x img[y][x] cos(pi (x + 0.5) v / n) cos(pi (y + 0.5) u / n),
 *   c(0) = sqrt(1 / n), c(k > 0) = sqrt(2 / n).
 */
export function dct2(img, n) {
  // TODO
  return new Array(n * n).fill(0);
}

/** The image rebuilt from the low-frequency k x k block of C only (u < k and v < k). */
export function idct2Truncated(C, n, k) {
  // TODO
  return new Array(n * n).fill(0);
}

/** PSNR in dB of b against a, for pixel values in [0, 1]: 10 log10(1 / MSE). */
export function psnr(a, b) {
  // TODO
  return 0;
}
