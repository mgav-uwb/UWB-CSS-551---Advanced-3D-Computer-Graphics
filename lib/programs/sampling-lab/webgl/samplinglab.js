// samplinglab.js: sampling and antialiasing as numbers. A sine sampled below its frequency and the alias it returns as, the
// reconstruction filters (box, tent, Gaussian, Lanczos-3, Mitchell-Netravali) and what they pass, a zone plate rendered one
// pixel at a time, the coverage of an edge across a pixel estimated by sample patterns, the cost of supersampling and
// multisampling, a spinning wheel filmed at a frame rate, and the history a temporal filter keeps. No three.js and no
// drawing here: scene.js draws a zone plate, and the course demo (lib/demos/sampling-lab.js) runs these same functions, so a
// value the demo prints beside a line of code is the value that line computed. No function changes its arguments.
// The same functions, line for line where the languages allow, are SamplingLab.cs in ../unity/
// (lib/tests/programs/sampling-lab.test.mjs runs both on the same inputs and compares the numbers).

// #region Settings and helpers
// Below EPS two numbers count as equal. Rng is Mulberry32 (Tommy Ettinger, 2017): a counter and a mixing step on 32-bit whole
// numbers, so the same seed gives the same numbers in both tracks.
export const EPS = 1e-6;

export function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

export function sinc(x) {
  if (Math.abs(x) < EPS) return 1;
  return Math.sin(Math.PI * x) / (Math.PI * x);
}

export function sortAscending(list) {
  const sorted = [];
  for (let i = 0; i < list.length; i++) {
    let at = sorted.length;
    while (at > 0 && sorted[at - 1] > list[i]) at--;
    sorted.splice(at, 0, list[i]);
  }
  return sorted;
}

export class Rng {
  constructor(seed) { this.state = seed >>> 0; }
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
// #endregion

// #region Alias frequency
// A sine of frequency f, sampled fs times per unit, has the same samples as the sine of frequency f - k fs for every whole
// number k. Nothing in the samples says which one was sampled, and reconstruction draws the lowest: k is the multiple of fs
// that brings f into [-fs/2, fs/2]. Its size is the alias, its sign says whether the pattern runs backward. A frequency
// above the Nyquist frequency fs/2 comes back as a different one.
export function aliasFrequency(f, fs) {
  const nyquist = fs / 2;
  const k = Math.floor(f / fs + 0.5);
  const signed = f - k * fs;
  const alias = Math.abs(signed);
  const aliased = f > nyquist + EPS;
  return { f, fs, nyquist, k, signed, alias, aliased };
}
// #endregion

// #region Sample a sine
// The samples are taken at t = i / fs. The sine of the signed alias frequency, with the same phase, passes through every one
// of them: mismatch is the largest gap between the two at the sample times, zero up to rounding.
export function sineValue(f, phase, t) { return Math.sin(2 * Math.PI * f * t + phase); }

export function sampleSine(f, fs, phase, count) {
  const a = aliasFrequency(f, fs);
  const times = [];
  const values = [];
  const aliasValues = [];
  let mismatch = 0;
  for (let i = 0; i < count; i++) {
    const t = i / fs;
    times.push(t);
    values.push(sineValue(f, phase, t));
    aliasValues.push(sineValue(a.signed, phase, t));
    mismatch = Math.max(mismatch, Math.abs(values[i] - aliasValues[i]));
  }
  const signed = a.signed;
  const alias = a.alias;
  const nyquist = a.nyquist;
  const aliased = a.aliased;
  return { times, values, aliasValues, signed, alias, nyquist, aliased, mismatch };
}
// #endregion

// #region Filter kernels
// A reconstruction filter h(u) gives the weight of a sample u sample-spacings away. Box: 1 inside half a spacing. Tent: 1 - |u|.
// Gaussian: a bell of standard deviation sigma with area 1. Lanczos-3: a sinc windowed by a wider sinc, with negative lobes.
// Mitchell and Netravali (1988): a cubic on [-2, 2] with a blur knob B and a ringing knob C; (1/3, 1/3) is their recommendation.
export function filterSupport(kind, sigma) {
  if (kind === 'box') return 0.5;
  if (kind === 'tent') return 1;
  if (kind === 'gaussian') return 4 * sigma;
  if (kind === 'lanczos3') return 3;
  return 2;
}

function mitchellWeight(x, B, C) {
  if (x < 1) return ((12 - 9 * B - 6 * C) * x * x * x + (-18 + 12 * B + 6 * C) * x * x + (6 - 2 * B)) / 6;
  if (x < 2) return ((-B - 6 * C) * x * x * x + (6 * B + 30 * C) * x * x + (-12 * B - 48 * C) * x + (8 * B + 24 * C)) / 6;
  return 0;
}

export function filterWeight(kind, u, B, C, sigma) {
  const x = Math.abs(u);
  if (kind === 'box') return u >= -0.5 && u < 0.5 ? 1 : 0;
  if (kind === 'tent') return Math.max(0, 1 - x);
  if (kind === 'gaussian') {
    if (x > 4 * sigma) return 0;
    return Math.exp(-x * x / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
  }
  if (kind === 'lanczos3') return x < 3 ? sinc(x) * sinc(x / 3) : 0;
  return mitchellWeight(x, B, C);
}
// #endregion

// #region Filter taps
// The samples a filter reads at position x (sample i sits at i): every i within the support, each with the weight h(x - i).
// The Gaussian's copies at whole spacings add to a little over 1, so its weights are divided by their sum; the others are as
// defined. sum is the total before that division.
export function filterTaps(kind, x, B, C, sigma) {
  const support = filterSupport(kind, sigma);
  const first = Math.ceil(x - support);
  const last = Math.floor(x + support);
  const weights = [];
  let sum = 0;
  for (let i = first; i <= last; i++) {
    const w = filterWeight(kind, x - i, B, C, sigma);
    weights.push(w);
    sum += w;
  }
  const normalized = kind === 'gaussian' && sum > EPS;
  if (normalized) {
    for (let j = 0; j < weights.length; j++) weights[j] = weights[j] / sum;
  }
  return { first, weights, sum, normalized };
}
// #endregion

// #region Reconstruct from samples
// The reconstructed value at x is the sum of the samples, each times its filter weight: f~(x) = sum of f(i / fs) h(x fs - i).
// The test signal has frequencies 1.5 and 4, so its highest is 4 and the theorem asks for fs above 8.
// The error is measured against the signal itself at 600 points across x in [0.5, 3.5], away from the ends of the samples, at
// the middle of each step so that no point falls exactly between two samples (where a box would have to pick one).
export function twoTone(x) { return Math.sin(2 * Math.PI * 1.5 * x) + 0.5 * Math.sin(2 * Math.PI * 4 * x); }

export function reconstruct(samples, x, kind, B, C, sigma) {
  const taps = filterTaps(kind, x, B, C, sigma);
  let sum = 0;
  for (let j = 0; j < taps.weights.length; j++) {
    const i = taps.first + j;
    if (i >= 0 && i < samples.length) sum += samples[i] * taps.weights[j];
  }
  return sum;
}

export function reconstructionError(kind, fs, B, C, sigma) {
  const count = Math.floor(4 * fs + EPS) + 1;
  const samples = [];
  for (let i = 0; i < count; i++) samples.push(twoTone(i / fs));
  const steps = 600;
  let errorSquares = 0;
  for (let j = 0; j < steps; j++) {
    const x = 0.5 + 0.005 * (j + 0.5);
    const error = reconstruct(samples, x * fs, kind, B, C, sigma) - twoTone(x);
    errorSquares += error * error;
  }
  const rms = Math.sqrt(errorSquares / steps);
  const signalRms = Math.sqrt((1 + 0.25) / 2);
  return { count, rms, signalRms };
}
// #endregion

// #region Frequency response
// What a filter does to a sine of frequency f (cycles per sample spacing) is multiply its size by H(f), the cosine transform of
// the kernel. Box: |sinc f|. Tent: sinc^2 f. Gaussian: exp(-2 pi^2 sigma^2 f^2). Lanczos and Mitchell have no short form, so
// the kernel is integrated against a cosine with Simpson's rule. An ideal filter passes 1 below 1/2 and 0 above.
export function filterResponse(kind, f, B, C, sigma) {
  if (kind === 'box') return Math.abs(sinc(f));
  if (kind === 'tent') return sinc(f) * sinc(f);
  if (kind === 'gaussian') return Math.exp(-2 * Math.PI * Math.PI * sigma * sigma * f * f);
  const support = filterSupport(kind, sigma);
  const steps = 200;
  const h = 2 * support / steps;
  let total = 0;
  for (let i = 0; i <= steps; i++) {
    const x = -support + i * h;
    let simpson = 2;
    if (i === 0 || i === steps) simpson = 1;
    else if (i % 2 === 1) simpson = 4;
    total += simpson * filterWeight(kind, x, B, C, sigma) * Math.cos(2 * Math.PI * f * x);
  }
  return Math.abs(total * h / 3);
}
// #endregion

// #region Step response
// Reconstruct an edge: samples that are 0 up to i = -1 and 1 from i = 0. Blur is the distance the value takes to rise from
// 10 % to 90 % of its final level (read between the 0.01 steps by linear interpolation); ringing is how far it goes past 1 (overshoot) and below 0 (undershoot). A kernel with no
// negative lobe cannot ring.
export function stepResponse(kind, B, C, sigma) {
  let high = -1000;
  let low = 1000;
  let x10 = 0;
  let x90 = 0;
  let found10 = false;
  let found90 = false;
  let last = 0;
  let previous = 0;
  for (let j = 0; j <= 800; j++) {
    const x = -4 + 0.01 * j;
    const taps = filterTaps(kind, x, B, C, sigma);
    let value = 0;
    for (let t = 0; t < taps.weights.length; t++) {
      if (taps.first + t >= 0) value += taps.weights[t];
    }
    high = Math.max(high, value);
    low = Math.min(low, value);
    if (!found10 && value >= 0.1) { found10 = true; x10 = x - 0.01 * (value - 0.1) / (value - previous); }
    if (!found90 && value >= 0.9) { found90 = true; x90 = x - 0.01 * (value - 0.9) / (value - previous); }
    previous = value;
    last = value;
  }
  const overshoot = Math.max(0, high - last);
  const undershoot = Math.max(0, -low);
  const rise = x90 - x10;
  return { overshoot, undershoot, rise, plateau: last };
}
// #endregion

// #region Zone plate
// A zone plate is 1/2 + 1/2 cos(K r^2 / size), r the distance from the centre in pixels. The phase grows as r squared, so the
// local frequency K r / (pi size) grows in proportion to r, and reaches the Nyquist frequency, 1/2 cycle per pixel, along an
// axis at r = pi size / (2 K). A pixel's value is the mean of n x n samples on a regular grid inside it, or one random sample in
// each of its n x n cells (jitter). Pixel (ix, iy) covers [ix, ix + 1] x [iy, iy + 1].
export const ZONE_SIZE = 200;
export const ZONE_K = 5.2;

export function zoneFrequency(r, size, K) { return K * r / (Math.PI * size); }

export function zoneRadius(frequency, size, K) { return frequency * Math.PI * size / K; }

export function zoneValue(x, y, size, K) {
  const dx = x - size / 2;
  const dy = y - size / 2;
  return 0.5 + 0.5 * Math.cos(K * (dx * dx + dy * dy) / size);
}

export function zonePixel(ix, iy, n, jitter, size, K) {
  const rng = new Rng(ix + 4096 * iy + 1);
  let total = 0;
  for (let b = 0; b < n; b++) {
    for (let a = 0; a < n; a++) {
      let ox = (a + 0.5) / n;
      let oy = (b + 0.5) / n;
      if (jitter) {
        ox = (a + rng.next()) / n;
        oy = (b + rng.next()) / n;
      }
      total += zoneValue(ix + ox, iy + oy, size, K);
    }
  }
  const samples = n * n;
  const value = total / samples;
  return { value, samples };
}
// #endregion

// #region Edge coverage
// A pixel is the unit square. The edge is the line y = slope x + offset, and the polygon is the part above it. Its exact
// coverage is the area above the line: the height of the inside at x, clamped to [0, 1], integrated across the pixel. That
// height is piecewise linear, bending where the line meets the top and the bottom of the pixel, so the trapezoid rule between
// the bends is exact.
function insideHeight(slope, offset, x) { return clamp(1 - (slope * x + offset), 0, 1); }

export function exactCoverage(slope, offset) {
  const xs = [0, 1];
  if (Math.abs(slope) > EPS) {
    const atTop = (1 - offset) / slope;
    const atBottom = (0 - offset) / slope;
    if (atTop > 0 && atTop < 1) xs.push(atTop);
    if (atBottom > 0 && atBottom < 1) xs.push(atBottom);
  }
  const sorted = sortAscending(xs);
  let area = 0;
  for (let i = 0; i + 1 < sorted.length; i++) {
    const h0 = insideHeight(slope, offset, sorted[i]);
    const h1 = insideHeight(slope, offset, sorted[i + 1]);
    area += 0.5 * (h0 + h1) * (sorted[i + 1] - sorted[i]);
  }
  return area;
}
// #endregion

// #region Sample patterns
// Where the samples sit inside the pixel. single: the centre. grid4 and grid16: regular grids of 2 x 2 and 4 x 4. rotated4:
// four samples, no two in a row or a column (the 4x multisampling pattern). random16: sixteen anywhere. stratified16: one
// random sample in each cell of a 4 x 4 grid. n samples give at most n + 1 coverage levels, and a pattern with fewer distinct
// rows gives a horizontal edge fewer: rows + 1.
export function samplePattern(kind, seed) {
  const points = [];
  const rng = new Rng(seed);
  if (kind === 'single') {
    points.push([0.5, 0.5]);
  } else if (kind === 'grid4') {
    for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) points.push([(a + 0.5) / 2, (b + 0.5) / 2]);
  } else if (kind === 'rotated4') {
    points.push([0.375, 0.125], [0.875, 0.375], [0.125, 0.625], [0.625, 0.875]);
  } else if (kind === 'grid16') {
    for (let b = 0; b < 4; b++) for (let a = 0; a < 4; a++) points.push([(a + 0.5) / 4, (b + 0.5) / 4]);
  } else if (kind === 'random16') {
    for (let i = 0; i < 16; i++) {
      const x = rng.next();
      const y = rng.next();
      points.push([x, y]);
    }
  } else {
    for (let b = 0; b < 4; b++) {
      for (let a = 0; a < 4; a++) {
        const x = (a + rng.next()) / 4;
        const y = (b + rng.next()) / 4;
        points.push([x, y]);
      }
    }
  }
  return points;
}

export function patternLevels(points) {
  const rowValues = [];
  const columnValues = [];
  for (let i = 0; i < points.length; i++) {
    let newColumn = true;
    let newRow = true;
    for (let j = 0; j < i; j++) {
      if (Math.abs(points[j][0] - points[i][0]) < 1e-4) newColumn = false;
      if (Math.abs(points[j][1] - points[i][1]) < 1e-4) newRow = false;
    }
    if (newColumn) columnValues.push(points[i][0]);
    if (newRow) rowValues.push(points[i][1]);
  }
  const count = points.length;
  const rows = rowValues.length;
  const columns = columnValues.length;
  return { count, rows, columns, horizontalLevels: rows + 1, verticalLevels: columns + 1 };
}
// #endregion

// #region Estimate coverage
// A sample is inside when it lies above the edge (strictly: a sample exactly on it counts as outside). The estimate is the
// fraction of samples inside; the error is the estimate minus the exact coverage.
export function estimateCoverage(points, slope, offset) {
  const flags = [];
  let inside = 0;
  for (let i = 0; i < points.length; i++) {
    const hit = points[i][1] > slope * points[i][0] + offset ? 1 : 0;
    flags.push(hit);
    inside += hit;
  }
  const count = points.length;
  const estimate = inside / count;
  const exact = exactCoverage(slope, offset);
  const error = estimate - exact;
  return { count, inside, estimate, exact, error, flags };
}
// #endregion

// #region Random against stratified
// A pixel half covered by the edge y = 0.3 x + 0.35, estimated with 16 samples, over many trials. Random samples have the
// binomial error sqrt(p (1 - p) / 16) = 0.125. Stratified samples (one per cell of a 4 x 4 grid) only miscount in the cells
// the edge crosses. Both draw from one stream, random trials first. randomHits[k] counts the trials with k of the 16 samples
// inside, so the spread of the estimates can be drawn.
export function samplingError(trials, seed) {
  const rng = new Rng(seed);
  const exact = exactCoverage(0.3, 0.35);
  const randomHits = [];
  const stratifiedHits = [];
  for (let k = 0; k <= 16; k++) {
    randomHits.push(0);
    stratifiedHits.push(0);
  }
  let randomSquares = 0;
  let stratifiedSquares = 0;
  for (let t = 0; t < trials; t++) {
    let hits = 0;
    for (let i = 0; i < 16; i++) {
      const x = rng.next();
      const y = rng.next();
      if (y > 0.3 * x + 0.35) hits++;
    }
    const error = hits / 16 - exact;
    randomSquares += error * error;
    randomHits[hits] += 1;
  }
  for (let t = 0; t < trials; t++) {
    let hits = 0;
    for (let b = 0; b < 4; b++) {
      for (let a = 0; a < 4; a++) {
        const x = (a + rng.next()) / 4;
        const y = (b + rng.next()) / 4;
        if (y > 0.3 * x + 0.35) hits++;
      }
    }
    const error = hits / 16 - exact;
    stratifiedSquares += error * error;
    stratifiedHits[hits] += 1;
  }
  const random = Math.sqrt(randomSquares / trials);
  const stratified = Math.sqrt(stratifiedSquares / trials);
  const binomial = Math.sqrt(exact * (1 - exact) / 16);
  return { exact, random, stratified, ratio: random / stratified, binomial, randomHits, stratifiedHits };
}
// #endregion

// #region Shading cost
// Supersampling (SSAA) runs the fragment shader once per sample: fragments x samples runs. Multisampling (MSAA) tests
// coverage and depth at every sample but runs the shader once per fragment, and writes its color to each covered sample. Both
// keep a color for every sample of every pixel, 4 bytes each; the figures count color only, in mebibytes (1024 x 1024 bytes).
export function antialiasingCost(width, height, fragments, samples, instructions) {
  const pixels = width * height;
  const ssaaRuns = fragments * samples;
  const msaaRuns = fragments;
  const noneInstructions = fragments * instructions;
  const ssaaInstructions = ssaaRuns * instructions;
  const msaaInstructions = msaaRuns * instructions;
  const noneMiB = pixels * 4 / 1048576;
  const multiMiB = pixels * samples * 4 / 1048576;
  return { pixels, ssaaRuns, msaaRuns, noneInstructions, ssaaInstructions, msaaInstructions, noneMiB, multiMiB };
}
// #endregion

// #region Blend space
// Coverage is a fraction of light, and an 8-bit code is not: the sRGB code c stands for light ((c + 0.055) / 1.055)^2.4. A
// white edge on black covering half a pixel should emit half the light. Blending the codes (255 x 1/2, code 128) emits
// 0.216; blending the light, then encoding (code 188) emits 0.503.
export function srgbDecode(code) {
  if (code <= 0.04045) return code / 12.92;
  return Math.pow((code + 0.055) / 1.055, 2.4);
}

export function srgbEncode(linear) {
  if (linear <= 0.0031308) return linear * 12.92;
  return 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
}

export function blendCoverage(coverage, inLinearLight) {
  let code = Math.floor(255 * coverage + 0.5);
  if (inLinearLight) code = Math.floor(255 * srgbEncode(coverage) + 0.5);
  const light = srgbDecode(code / 255);
  const error = light - coverage;
  return { code, light, wanted: coverage, error };
}
// #endregion

// #region Wheel
// A wheel with N spokes turning at rps revolutions per second shows a spoke pattern of frequency N rps (spokes per second).
// Filmed at fps frames per second, that is a signal sampled at fps: the apparent rate is the alias of N rps. The wheel turns
// 360 rps / fps degrees per frame, and the picture repeats every 360 / N degrees. A shutter open for the fraction s of a frame
// averages the motion over a box of that width: the swept angle is turn x s, and the spoke pattern keeps |sinc(N rps s / fps)|
// of its contrast.
export function wheelMotion(spokes, rps, fps, shutter) {
  const spacing = 360 / spokes;
  const turn = 360 * rps / fps;
  const spokeRate = spokes * rps;
  const a = aliasFrequency(spokeRate, fps);
  const apparentRps = a.signed / spokes;
  const apparentStep = a.signed / fps * spacing;
  const sweep = turn * shutter;
  const contrast = Math.abs(sinc(spokeRate * shutter / fps));
  const aliased = a.aliased;
  return { spacing, turn, spokeRate, nyquist: a.nyquist, aliasRate: a.signed, apparentRps, apparentStep, sweep, contrast, aliased };
}
// #endregion

// #region History blend
// Temporal antialiasing keeps a history and blends each frame into it: history = (1 - alpha) history + alpha current. After a
// jump from 0 to 1 the history has reached 1 - (1 - alpha)^n after n frames, so it reaches a fraction p after
// ln(1 - p) / ln(1 - alpha) frames, rounded up.
export function blendHistory(history, current, alpha) {
  const next = [];
  for (let i = 0; i < history.length; i++) next.push((1 - alpha) * history[i] + alpha * current[i]);
  return next;
}

export function framesToReach(alpha, fraction, fps) {
  const exact = Math.log(1 - fraction) / Math.log(1 - alpha);
  const frames = Math.ceil(exact - EPS);
  const seconds = frames / fps;
  const reached = 1 - Math.pow(1 - alpha, frames);
  return { exact, frames, seconds, reached };
}

// #endregion

// #region Ghost trail
// A bar barWidth pixels wide moves speed pixels per frame across a row, and the history blends each frame in with weight alpha.
// A pixel the bar has left keeps a fraction of its value, (1 - alpha) per frame, so the bar drags a trail behind it: trail
// counts the pixels behind the bar that still hold at least 0.1.
export function ghostRow(width, barWidth, speed, alpha, frames) {
  let history = [];
  for (let x = 0; x < width; x++) history.push(0);
  let barStart = 0;
  for (let n = 0; n <= frames; n++) {
    barStart = 4 + speed * n;
    const current = [];
    for (let x = 0; x < width; x++) current.push(x >= barStart && x < barStart + barWidth ? 1 : 0);
    history = blendHistory(history, current, alpha);
  }
  let trail = 0;
  for (let x = 0; x < width; x++) {
    if (x < barStart && history[x] >= 0.1) trail++;
  }
  return { row: history, barStart, trail };
}
// #endregion
