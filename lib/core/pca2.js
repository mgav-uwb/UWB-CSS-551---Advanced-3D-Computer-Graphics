// pca2: project a handful of high-dimensional vectors to 2D along their two
// principal axes (power iteration on the covariance with deflation). Used to
// draw the trained digit network's class embeddings as a map.
export function pca2(vectors) {
  const n = vectors.length, d = vectors[0].length;
  const mean = new Float64Array(d);
  for (const v of vectors) for (let j = 0; j < d; j++) mean[j] += v[j] / n;
  const X = vectors.map((v) => Float64Array.from(v, (x, j) => x - mean[j]));
  const cov = new Float64Array(d * d);
  for (const x of X) for (let i = 0; i < d; i++) { const xi = x[i]; if (xi === 0) continue; for (let j = 0; j < d; j++) cov[i * d + j] += (xi * x[j]) / n; }
  const axes = [];
  const C = Float64Array.from(cov);
  for (let k = 0; k < 2; k++) {
    let v = new Float64Array(d).fill(1 / Math.sqrt(d)); let lambda = 0;
    for (let it = 0; it < 200; it++) {
      const w = new Float64Array(d);
      for (let i = 0; i < d; i++) { let s = 0; for (let j = 0; j < d; j++) s += C[i * d + j] * v[j]; w[i] = s; }
      lambda = Math.sqrt(w.reduce((s, x) => s + x * x, 0)) || 1;
      v = w.map((x) => x / lambda);
    }
    axes.push({ v, lambda });
    for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) C[i * d + j] -= lambda * v[i] * v[j]; // deflate
  }
  const points = X.map((x) => [dot(x, axes[0].v), dot(x, axes[1].v)]);
  const total = cov.reduce((s, c, idx) => (idx % (d + 1) === 0 ? s + c : s), 0);
  return { points, explained: [axes[0].lambda / total, axes[1].lambda / total], axes: axes.map((a) => a.v) };
}
function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }

export function cosine(a, b) {
  let s = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { s += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return s / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}
