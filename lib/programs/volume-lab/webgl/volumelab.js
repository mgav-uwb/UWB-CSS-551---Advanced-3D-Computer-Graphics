// volumelab.js: volume rendering along one ray, the way a neural radiance field makes a pixel (Mildenhall and others, 2020): a
// density and a color along the ray, the samples and their spacing, the opacity, transmittance and weight of each sample, the pixel
// as the sum of weight times color, the error against a finely sampled reference, a thin surface between samples, hierarchical
// sampling by inverting the weights' cumulative sum, a density that sharpens into a surface (a bump, or a signed distance as in
// NeuS), positional encoding with a closed-form fit, and a small 3D volume of Gaussian blobs rendered one ray at a time.
// No three.js here: vectors and colors are arrays [x, y, z]. scene.js draws an image of the blobs, and the course demo
// (lib/demos/volume-lab.js) runs these same functions, so a value the demo prints beside a line of code is the value that line
// computed. No function changes its arguments, except that a random number generator advances when it is asked for a number.
// The same functions, line for line where the languages allow, are VolumeLab.cs in ../unity/
// (lib/tests/programs/volume-lab.test.mjs runs both on the same inputs and compares the numbers).

// #region Settings
// A density along a ray is a list of bumps, STRIDE numbers each: shape, center, width, height, red, green, blue.
// GAUSSIAN: height * exp(-(s - center)^2 / (2 width^2)).  BOX: height on [center - width, center + width), else 0.
// STEP: height / (1 + exp(-(s - center) / width)), a smooth wall that rises from 0 to height around center.
// A sample exactly on a box's edge counts in the box to its left, EDGE allowing for rounding in the depth.
export const STRIDE = 7;
export const GAUSSIAN = 0;
export const BOX = 1;
export const STEP = 2;
export const EDGE = 1e-5;
export const EPS = 1e-6;
export const REFERENCE_N = 4096;     // the finely sampled reference uses this many samples
export const BLOB_STRIDE = 8;        // a blob in 3D: center x, y, z, radius, height, red, green, blue
// #endregion

// #region Random numbers
// A seeded generator (Park and Miller, 1988): the same seed gives the same numbers in both tracks, so a run can be repeated.
// Each call returns a number strictly between 0 and 1 and advances the generator's state.
export function makeRng(seed) {
  return { state: (Math.floor(Math.abs(seed)) % 2147483646) + 1 };
}

export function nextRandom(rng) {
  rng.state = (rng.state * 16807) % 2147483647;
  return rng.state / 2147483647;
}
// #endregion

// #region Density and color along a ray
// Every bump adds its density at depth s. The color there is the bumps' colors weighted by their densities, so a spot where two
// bumps overlap is a blend, and a spot with no density has no color.
export function bumpDensity(shape, center, width, height, s) {
  const w = Math.max(width, EPS);
  if (shape === GAUSSIAN) return height * Math.exp(-((s - center) * (s - center)) / (2 * w * w));
  if (shape === BOX) return s > center - w + EDGE && s <= center + w + EDGE ? height : 0;
  return height / (1 + Math.exp(-(s - center) / w));
}

export function evaluateField(field, depths) {
  const sigmas = [];
  const colors = [];
  const count = Math.floor(field.length / STRIDE);
  for (let i = 0; i < depths.length; i++) {
    let sigma = 0;
    let r = 0;
    let g = 0;
    let b = 0;
    for (let k = 0; k < count; k++) {
      const o = k * STRIDE;
      const d = bumpDensity(Math.round(field[o]), field[o + 1], field[o + 2], field[o + 3], depths[i]);
      sigma += d;
      r += d * field[o + 4];
      g += d * field[o + 5];
      b += d * field[o + 6];
    }
    sigmas.push(sigma);
    colors.push(sigma > EPS ? [r / sigma, g / sigma, b / sigma] : [0, 0, 0]);
  }
  return { sigmas, colors };
}
// #endregion

// #region Samples along the ray
// The ray from near to far is cut into n equal bins of width delta, and each bin gets one sample. A regular sampler puts it the same
// fraction offset into every bin (0.5 is the middle); a stratified sampler draws that fraction at random for each bin.
export function rayDepths(near, far, n, mode, offset, rng) {
  const binWidth = (far - near) / n;
  const edges = [];
  const depths = [];
  const deltas = [];
  for (let i = 0; i < n; i++) {
    const u = mode === 'stratified' ? nextRandom(rng) : offset;
    edges.push(near + i * binWidth);
    depths.push(near + (i + u) * binWidth);
    deltas.push(binWidth);
  }
  edges.push(far);
  return { binWidth, edges, depths, deltas };
}
// #endregion

// #region Opacity and step
// A slab of density sigma and thickness delta blocks 1 - exp(-sigma delta) of the light. Two half slabs block the same, so the
// opacity depends on the step, which is why a network stores the density and not the opacity.
export function splitSlab(sigma, delta, pieces) {
  const alpha = 1 - Math.exp(-sigma * delta);
  const pieceAlpha = 1 - Math.exp(-sigma * (delta / pieces));
  const combined = 1 - Math.pow(1 - pieceAlpha, pieces);
  const transmittance = Math.exp(-sigma * delta);
  return { alpha, pieceAlpha, combined, transmittance };
}
// #endregion

// #region Compositing one ray
// Front to back. Sample i is a slab with opacity alpha_i; transmittance T_i is the fraction of the ray still unblocked when it
// reaches the slab; its weight is w_i = T_i alpha_i, and the pixel is the sum of w_i c_i. What is left, T_end, shows the background.
export function compositeRay(sigmas, colors, deltas, background) {
  const alphas = [];
  const transmittances = [];
  const weights = [];
  let T = 1;
  let weightSum = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < sigmas.length; i++) {
    const alpha = 1 - Math.exp(-sigmas[i] * deltas[i]);
    const w = T * alpha;
    alphas.push(alpha);
    transmittances.push(T);
    weights.push(w);
    weightSum += w;
    r += w * colors[i][0];
    g += w * colors[i][1];
    b += w * colors[i][2];
    T *= 1 - alpha;
  }
  const tEnd = T;
  const color = [r, g, b];
  const pixel = [r + tEnd * background[0], g + tEnd * background[1], b + tEnd * background[2]];
  return { alphas, transmittances, weights, color, weightSum, tEnd, pixel };
}
// #endregion

// #region Expected depth
// The weights are a distribution along the ray once divided by their sum, so they have a mean, the depth a NeRF renders for free,
// and a spread. A density that has collapsed into a surface has a spread of nearly zero.
export function expectedDepth(weights, depths) {
  let weightSum = 0;
  let moment = 0;
  for (let i = 0; i < weights.length; i++) {
    weightSum += weights[i];
    moment += weights[i] * depths[i];
  }
  const depth = weightSum > EPS ? moment / weightSum : 0;
  let spread2 = 0;
  for (let i = 0; i < weights.length; i++) spread2 += weights[i] * (depths[i] - depth) * (depths[i] - depth);
  const variance = weightSum > EPS ? spread2 / weightSum : 0;
  const spread = Math.sqrt(variance);
  return { weightSum, depth, variance, spread };
}
// #endregion

// #region The gradient through the march
// Training moves the density and color of each sample to make the pixel match a photograph, so it needs how the pixel changes with them.
// The color of sample i enters with its weight: dC/dc_i = w_i. Its density enters in two places: more of the sample's own slab (its
// weight grows) and less of the ray left for everything behind it, so dC/dsigma_i = delta_i (T_i (1 - alpha_i) c_i - sum of w_j c_j for j > i).
export function colorGradient(sigmas, colors, deltas, channel) {
  const n = sigmas.length;
  const march = compositeRay(sigmas, colors, deltas, [0, 0, 0]);
  const dColor = [];
  const dSigma = [];
  let behind = 0;
  for (let i = n - 1; i >= 0; i--) {
    const own = march.transmittances[i] * (1 - march.alphas[i]) * colors[i][channel];
    dSigma.push(deltas[i] * (own - behind));
    dColor.push(march.weights[i]);
    behind += march.weights[i] * colors[i][channel];
  }
  dSigma.reverse();
  dColor.reverse();
  return { dSigma, dColor, pixel: march.color[channel] };
}
// #endregion

// #region Rendering one ray
// A ray is rendered by choosing its samples, asking the field for a density and a color at each, compositing them, and reading
// the expected depth off the weights.
export function marchRay(field, edges, depths, deltas, background) {
  const values = evaluateField(field, depths);
  const march = compositeRay(values.sigmas, values.colors, deltas, background);
  const seen = expectedDepth(march.weights, depths);
  return {
    edges, depths, deltas, sigmas: values.sigmas, colors: values.colors, alphas: march.alphas,
    transmittances: march.transmittances, weights: march.weights, color: march.color, weightSum: march.weightSum,
    tEnd: march.tEnd, pixel: march.pixel, depth: seen.depth, spread: seen.spread,
  };
}

export function renderRay(field, near, far, n, mode, offset, rng, background) {
  const samples = rayDepths(near, far, n, mode, offset, rng);
  return marchRay(field, samples.edges, samples.depths, samples.deltas, background);
}
// #endregion

// #region The estimate against the reference
// The reference is the same ray with REFERENCE_N regular samples. The error of an estimate is the distance between its color and the
// reference color; a random sampler is run several times and the error is the root mean square over the runs.
export function rayError(field, near, far, n, mode, offset, trials, seed) {
  const black = [0, 0, 0];
  const reference = renderRay(field, near, far, REFERENCE_N, 'regular', 0.5, makeRng(1), black);
  const rng = makeRng(seed);
  let sum = 0;
  let tSum = 0;
  for (let t = 0; t < trials; t++) {
    const run = renderRay(field, near, far, n, mode, offset, rng, black);
    const dr = run.color[0] - reference.color[0];
    const dg = run.color[1] - reference.color[1];
    const db = run.color[2] - reference.color[2];
    sum += dr * dr + dg * dg + db * db;
    tSum += (run.tEnd - reference.tEnd) * (run.tEnd - reference.tEnd);
  }
  const error = Math.sqrt(sum / trials);
  const tEndError = Math.sqrt(tSum / trials);
  return { reference: reference.color, referenceTEnd: reference.tEnd, error, tEndError };
}

// The slope of ln(error) against ln(N): -1 means the error halves when N doubles, -2 that it quarters.
export function logSlope(counts, errors) {
  const m = counts.length;
  let mx = 0;
  let my = 0;
  for (let i = 0; i < m; i++) {
    mx += Math.log(counts[i]) / m;
    my += Math.log(errors[i]) / m;
  }
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < m; i++) {
    sxy += (Math.log(counts[i]) - mx) * (Math.log(errors[i]) - my);
    sxx += (Math.log(counts[i]) - mx) * (Math.log(counts[i]) - mx);
  }
  return sxy / sxx;
}

export function convergence(field, near, far, counts, mode, offset, trials, seed) {
  const errors = [];
  const tEndErrors = [];
  for (let i = 0; i < counts.length; i++) {
    const e = rayError(field, near, far, counts[i], mode, offset, trials, seed + i);
    errors.push(e.error);
    tEndErrors.push(e.tEndError);
  }
  const slope = logSlope(counts, errors);
  return { counts, errors, tEndErrors, slope };
}
// #endregion

// #region Coarse to fine: the inverse transform
// The weights of a coarse pass, divided by their sum, are a probability for each bin. Their running sum, the cumulative curve, is
// steep where the weights are large. A uniform number u is mapped to the depth where the curve reaches u, interpolating inside the
// bin, so a uniform spread of u becomes a spread of depths that is dense where the weights are large.
export function fineUniforms(n, mode, rng) {
  const us = [];
  for (let i = 0; i < n; i++) {
    if (mode === 'regular') us.push((i + 0.5) / n);
    else if (mode === 'stratified') us.push((i + nextRandom(rng)) / n);
    else us.push(nextRandom(rng));
  }
  return us;
}

export function inverseTransform(edges, weights, us) {
  const n = weights.length;
  let total = 0;
  for (let i = 0; i < n; i++) total += weights[i];
  const pdf = [];
  const cdf = [];
  let running = 0;
  for (let i = 0; i < n; i++) {
    pdf.push(total > EPS ? weights[i] / total : 1 / n);
    running += pdf[i];
    cdf.push(running);
  }
  const bins = [];
  const depths = [];
  for (let j = 0; j < us.length; j++) {
    let bin = 0;
    while (bin < n - 1 && cdf[bin] < us[j]) bin++;
    const before = bin > 0 ? cdf[bin - 1] : 0;
    const inside = pdf[bin] > EPS ? (us[j] - before) / pdf[bin] : 0.5;
    bins.push(bin);
    depths.push(edges[bin] + inside * (edges[bin + 1] - edges[bin]));
  }
  return { pdf, cdf, bins, depths };
}
// #endregion

// #region Coarse and fine samples together
// The coarse and fine depths are merged and sorted. Each sample then stands for the stretch of ray around it, from halfway to its
// neighbor in front to halfway to its neighbor behind (the ends reach near and far), and the merged samples are composited.
export function sampleSpans(depths, near, far) {
  const deltas = [];
  const m = depths.length;
  for (let i = 0; i < m; i++) {
    const start = i > 0 ? (depths[i - 1] + depths[i]) / 2 : near;
    const stop = i < m - 1 ? (depths[i] + depths[i + 1]) / 2 : far;
    deltas.push(stop - start);
  }
  return deltas;
}

function byDepth(a, b) { return a - b; }

export function hierarchicalRay(field, near, far, nCoarse, us, offset, background) {
  const coarse = renderRay(field, near, far, nCoarse, 'regular', offset, makeRng(1), background);
  const fine = inverseTransform(coarse.edges, coarse.weights, us);
  const mergedDepths = coarse.depths.concat(fine.depths).sort(byDepth);
  const mergedDeltas = sampleSpans(mergedDepths, near, far);
  const merged = marchRay(field, [], mergedDepths, mergedDeltas, background);
  return { coarse, us, pdf: fine.pdf, cdf: fine.cdf, bins: fine.bins, fineDepths: fine.depths, merged };
}
// #endregion

// #region Sharpening a bump
// A Gaussian bump of fixed optical depth tau (the integral of the density) and width w has height tau / (w sqrt(2 pi)). As w
// falls the same amount of stuff is packed into less length: the weights collapse toward the bump's center.
export function sharpBump(center, width, tau, r, g, b) {
  const w = Math.max(width, EPS);
  const height = tau / (w * Math.sqrt(2 * Math.PI));
  return [GAUSSIAN, center, w, height, r, g, b];
}
// #endregion

// #region Distance to opacity
// NeuS (Wang and others, 2021) stores a signed distance f, positive in front of the surface and negative behind it, and passes it
// through a logistic curve of sharpness kappa: opacity switches on over a band of width about 1 / kappa. Along a ray that moves
// toward the surface at unit speed, the density that makes the transmittance equal this curve is kappa * (1 - phi).
export function opacityFromDistance(f, kappa) {
  const phi = 1 / (1 + Math.exp(-kappa * f));
  const density = kappa * (1 - phi);
  return { phi, density };
}

export function surfaceFromDistance(surface, kappa, depths) {
  const distances = [];
  const phis = [];
  const densities = [];
  for (let i = 0; i < depths.length; i++) {
    const f = surface - depths[i];
    const o = opacityFromDistance(f, kappa);
    distances.push(f);
    phis.push(o.phi);
    densities.push(o.density);
  }
  const bump = [STEP, surface, 1 / kappa, kappa, 0.9, 0.35, 0.3];
  return { distances, phis, densities, bump };
}
// #endregion

// #region Positional encoding
// gamma(p) maps one number to sines and cosines of doubling frequency, 2^k pi for k = 0 to L - 1, so a network that combines them
// can place an edge. The entries come in (sin, cos) pairs, lowest frequency first.
export function positionalEncoding(p, L) {
  const frequencies = [];
  const features = [];
  for (let k = 0; k < L; k++) {
    const omega = Math.pow(2, k) * Math.PI;
    frequencies.push(omega);
    features.push(Math.sin(omega * p));
    features.push(Math.cos(omega * p));
  }
  const smallestPeriod = L > 0 ? 2 / Math.pow(2, L - 1) : 0;     // the highest sine's period, 2 pi / omega
  return { frequencies, features, smallestPeriod };
}

// Mip-NeRF (Barron and others, 2021) averages each sine over a Gaussian footprint of standard deviation sigma, which multiplies
// the frequency omega by exp(-omega^2 sigma^2 / 2): frequencies finer than the footprint switch themselves off.
export function frequencyDamping(L, sigma) {
  const omegas = [];
  const factors = [];
  for (let k = 0; k < L; k++) {
    const omega = Math.pow(2, k) * Math.PI;
    omegas.push(omega);
    factors.push(Math.exp(-0.5 * omega * omega * sigma * sigma));
  }
  return { omegas, factors };
}
// #endregion

// #region Least squares
// Solves the normal equations (A^T A + ridge I) x = A^T y by Gaussian elimination with partial pivoting. The rows of A are the
// training points' features. Double precision, in both tracks, because the normal equations square the condition number.
export function solveLeastSquares(rows, ys, ridge) {
  const m = rows.length;
  const f = rows[0].length;
  const a = [];
  const b = [];
  for (let i = 0; i < f; i++) {
    for (let j = 0; j < f; j++) {
      let sum = i === j ? ridge : 0;
      for (let t = 0; t < m; t++) sum += rows[t][i] * rows[t][j];
      a.push(sum);
    }
    let rhs = 0;
    for (let t = 0; t < m; t++) rhs += rows[t][i] * ys[t];
    b.push(rhs);
  }
  for (let col = 0; col < f; col++) {
    let pivot = col;
    for (let i = col + 1; i < f; i++) if (Math.abs(a[i * f + col]) > Math.abs(a[pivot * f + col])) pivot = i;
    if (pivot !== col) {
      for (let j = 0; j < f; j++) {
        const t = a[col * f + j];
        a[col * f + j] = a[pivot * f + j];
        a[pivot * f + j] = t;
      }
      const tb = b[col];
      b[col] = b[pivot];
      b[pivot] = tb;
    }
    for (let i = col + 1; i < f; i++) {
      const factor = a[i * f + col] / a[col * f + col];
      for (let j = col; j < f; j++) a[i * f + j] -= factor * a[col * f + j];
      b[i] -= factor * b[col];
    }
  }
  const coefficients = [];
  for (let i = 0; i < f; i++) coefficients.push(0);
  for (let i = f - 1; i >= 0; i--) {
    let sum = b[i];
    for (let j = i + 1; j < f; j++) sum -= a[i * f + j] * coefficients[j];
    coefficients[i] = sum / a[i * f + i];
  }
  return { coefficients };
}
// #endregion

// #region A random network
// A network with one hidden layer of tanh units. Its hidden weights are drawn once from a seeded generator and then fixed (a random-feature
// network, Rahimi and Recht, 2007); only the output weights are fitted, and they are fitted in closed form. The weights are drawn input by
// input, so a network given more inputs keeps the weights it had on the old ones.
export function normalSample(rng) {
  const u1 = nextRandom(rng);
  const u2 = nextRandom(rng);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function makeNetwork(inputs, hidden, scale, seed) {
  const rng = makeRng(seed);
  const biases = [];
  const weights = [];
  for (let h = 0; h < hidden; h++) biases.push(2 * nextRandom(rng) - 1);
  for (let h = 0; h < hidden * inputs; h++) weights.push(0);
  for (let i = 0; i < inputs; i++) {
    for (let h = 0; h < hidden; h++) weights[h * inputs + i] = scale * normalSample(rng);
  }
  return { inputs, hidden, weights, biases };
}
// #endregion

// #region Fitting a signal
// The signal is a density along a line: a slab with two edges and a narrow bump. The network's inputs are the coordinate x and, when L > 0,
// gamma(x); its features are a 1 and the hidden units' outputs, and the best output weights for the training points are closed-form least
// squares. Training points sit at (j + 0.5) / count with uniform noise of amplitude noise added; the held-out error is measured on
// gridCount points against the noise-free signal.
export const HIDDEN = 64;
export const WEIGHT_SCALE = 3;
export const NETWORK_SEED = 777;
export const RIDGE = 1e-3;

export function targetSignal(x) {
  const slab = x >= 0.35 && x < 0.6 ? 1 : 0;
  const bump = 0.6 * Math.exp(-((x - 0.8) * (x - 0.8)) / (2 * 0.02 * 0.02));
  return slab + bump;
}

export function networkRow(x, L, net) {
  const code = positionalEncoding(x, L);
  const inputs = [x];
  for (let i = 0; i < code.features.length; i++) inputs.push(code.features[i]);
  const row = [1];
  for (let h = 0; h < net.hidden; h++) {
    let sum = net.biases[h];
    for (let i = 0; i < net.inputs; i++) sum += net.weights[h * net.inputs + i] * inputs[i];
    row.push(Math.tanh(sum));
  }
  return row;
}

export function fitSignal(L, count, noise, seed, gridCount) {
  const rng = makeRng(seed);
  const net = makeNetwork(1 + 2 * L, HIDDEN, WEIGHT_SCALE, NETWORK_SEED);
  const xs = [];
  const ys = [];
  const rows = [];
  for (let j = 0; j < count; j++) {
    const x = (j + 0.5) / count;
    xs.push(x);
    ys.push(targetSignal(x) + noise * (2 * nextRandom(rng) - 1));
    rows.push(networkRow(x, L, net));
  }
  const solved = solveLeastSquares(rows, ys, RIDGE);
  const grid = [];
  const truth = [];
  const fitted = [];
  let testSum = 0;
  for (let g = 0; g < gridCount; g++) {
    const x = (g + 0.5) / gridCount;
    const row = networkRow(x, L, net);
    let value = 0;
    for (let i = 0; i < row.length; i++) value += solved.coefficients[i] * row[i];
    grid.push(x);
    truth.push(targetSignal(x));
    fitted.push(value);
    testSum += (value - truth[g]) * (value - truth[g]);
  }
  let trainSum = 0;
  for (let j = 0; j < count; j++) {
    let value = 0;
    for (let i = 0; i < rows[j].length; i++) value += solved.coefficients[i] * rows[j][i];
    trainSum += (value - ys[j]) * (value - ys[j]);
  }
  const columns = rows[0].length;
  const trainError = Math.sqrt(trainSum / count);
  const testError = Math.sqrt(testSum / gridCount);
  return { columns, xs, ys, grid, truth, fitted, coefficients: solved.coefficients, trainError, testError };
}
// #endregion

// #region The camera ray for a pixel
// An image of size x size pixels with horizontal field of view fov has focal length f = (size / 2) / tan(fov / 2) in pixels. Pixel
// (i, j) looks along ((i - size/2) / f, -(j - size/2) / f, -1) in camera space: image rows count down and the camera's y counts up.
// The camera sits on a sphere of the given distance around the origin, at azimuth and elevation (radians), and looks at the origin.
export function cameraRay(i, j, size, fov, azimuth, elevation, distance) {
  const focal = (size / 2) / Math.tan(fov / 2);
  const cameraDir = [(i - size / 2) / focal, -(j - size / 2) / focal, -1];
  const origin = [
    distance * Math.cos(elevation) * Math.sin(azimuth),
    distance * Math.sin(elevation),
    distance * Math.cos(elevation) * Math.cos(azimuth),
  ];
  const forward = [-origin[0] / distance, -origin[1] / distance, -origin[2] / distance];
  const rl = Math.max(Math.sqrt(forward[0] * forward[0] + forward[2] * forward[2]), EPS);
  const right = [-forward[2] / rl, 0, forward[0] / rl];     // forward x (0, 1, 0), unit length
  const up = [
    right[1] * forward[2] - right[2] * forward[1],
    right[2] * forward[0] - right[0] * forward[2],
    right[0] * forward[1] - right[1] * forward[0],
  ];
  const dx = right[0] * cameraDir[0] + up[0] * cameraDir[1] - forward[0] * cameraDir[2];
  const dy = right[1] * cameraDir[0] + up[1] * cameraDir[1] - forward[1] * cameraDir[2];
  const dz = right[2] * cameraDir[0] + up[2] * cameraDir[1] - forward[2] * cameraDir[2];
  const dl = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const direction = [dx / dl, dy / dl, dz / dl];
  return { focal, cameraDir, origin, direction };
}
// #endregion

// #region A volume of blobs
// The scene is a few Gaussian blobs: density height * exp(-|p - center|^2 / (2 radius^2)) with a color each. A ray through the
// volume is sampled, the blobs are asked for a density and a color at every sample point, and the samples are composited with the
// same function as before.
export function evaluateBlobs(blobs, origin, direction, depths) {
  const sigmas = [];
  const colors = [];
  const count = Math.floor(blobs.length / BLOB_STRIDE);
  for (let i = 0; i < depths.length; i++) {
    const px = origin[0] + depths[i] * direction[0];
    const py = origin[1] + depths[i] * direction[1];
    const pz = origin[2] + depths[i] * direction[2];
    let sigma = 0;
    let r = 0;
    let g = 0;
    let b = 0;
    for (let k = 0; k < count; k++) {
      const o = k * BLOB_STRIDE;
      const dx = px - blobs[o];
      const dy = py - blobs[o + 1];
      const dz = pz - blobs[o + 2];
      const radius = Math.max(blobs[o + 3], EPS);
      const d = blobs[o + 4] * Math.exp(-(dx * dx + dy * dy + dz * dz) / (2 * radius * radius));
      sigma += d;
      r += d * blobs[o + 5];
      g += d * blobs[o + 6];
      b += d * blobs[o + 7];
    }
    sigmas.push(sigma);
    colors.push(sigma > EPS ? [r / sigma, g / sigma, b / sigma] : [0, 0, 0]);
  }
  return { sigmas, colors };
}

export function renderVolumeRay(blobs, origin, direction, near, far, n, mode, offset, rng, background) {
  const samples = rayDepths(near, far, n, mode, offset, rng);
  const values = evaluateBlobs(blobs, origin, direction, samples.depths);
  const march = compositeRay(values.sigmas, values.colors, samples.deltas, background);
  const seen = expectedDepth(march.weights, samples.depths);
  return {
    edges: samples.edges, depths: samples.depths, deltas: samples.deltas, sigmas: values.sigmas, colors: values.colors,
    alphas: march.alphas, transmittances: march.transmittances, weights: march.weights, color: march.color,
    weightSum: march.weightSum, tEnd: march.tEnd, pixel: march.pixel, depth: seen.depth, spread: seen.spread,
  };
}
// #endregion
