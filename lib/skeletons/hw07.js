// CSS 551 · HW7 · A gradient step, a fit, and a digit's DCT. YOUR FILE (JavaScript track):
// fill in every TODO and submit this one file. Run: homework/run.html?hw=hw07 from a local
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

/**
 * gradients(m, xs, ys) -> { w1, b1, w2 (arrays), b2, loss } for the MEAN squared error
 * loss = (1 / n) sum_i (f(xs[i]) - ys[i])^2, by backpropagation.
 */
export function gradients(m, xs, ys) {
  // TODO: per sample, dL/df = 2 (f - y) / n; push it back through w2 and tanh' = 1 - a^2.
  const H = m.w1.length;
  return { w1: new Array(H).fill(0), b1: new Array(H).fill(0), w2: new Array(H).fill(0), b2: 0, loss: 0 };
}

/** sgdStep(m, g, lr) -> a NEW model, each parameter moved by -lr times its gradient. */
export function sgdStep(m, g, lr) {
  // TODO
  return { w1: [...m.w1], b1: [...m.b1], w2: [...m.w2], b2: m.b2 };
}

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
