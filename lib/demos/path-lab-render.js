// path-lab-render: the progressive renderer behind the path-lab demo. It calls the program's own cameraRay and tracePath
// (lib/programs/path-lab/webgl/pathlab.js) for every sample, so the picture, the noise and the cost it reports are that code's output.
// A pass gives every pixel one more sample. Work is done in slices of a few milliseconds (step), and a pass is committed to the running
// sums only when it is complete, so the image and its measured noise always describe a whole number of samples per pixel.
// The light is seen directly from the camera, and a pixel that shows it (or only part of it) is bright by antialiasing, not by noise: the
// pixels under the light's outline stay in the picture and are left out of the measurements (noise, mean, largest sample, light added by each bounce).
// No DOM except the canvas that paint() writes to, so the node tests drive it with runPasses().
import * as PL from '../programs/path-lab/webgl/pathlab.js';

export const EXPOSURE = 2.2;
export const FIREFLY_FACTOR = 20;      // a sample this many times the image's mean value counts as a firefly

export const DEFAULTS = { maxDepth: 6, roulette: 'fixed', nee: true, clamp: 0, light: 0.5, seed: 1, cap: 1024 };

export class Progressive {
  constructor(size) {
    this.size = size;
    this.pixels = size * size;
    this.canvas = null;
    this.configure(DEFAULTS);
  }

  /** a new configuration starts the image again; cfg.size, if given, is a new width and height in pixels (and is then part of the key) */
  configure(cfg) {
    this.cfg = { ...DEFAULTS, ...cfg };
    this.key = JSON.stringify(this.cfg);
    if (this.cfg.size && this.cfg.size !== this.size) {
      this.size = this.cfg.size;
      this.pixels = this.size * this.size;
    }
    const c = this.cfg;
    this.scene = PL.makeCornell(c.light);
    this.rng = PL.makeRng(c.seed);
    this.options = { maxDepth: c.maxDepth, roulette: c.roulette, nee: c.nee, clamp: c.clamp, forced: null };
    const P = this.pixels;
    this.sum = new Float64Array(3 * P);
    this.lum = new Float64Array(P);
    this.lumSq = new Float64Array(P);
    this.passSum = new Float64Array(3 * P);
    this.passLum = new Float64Array(P);
    this.passLumSq = new Float64Array(P);
    this.bins = new Float64Array(c.maxDepth + 1);
    this.passBins = new Float64Array(c.maxDepth + 1);
    this.passes = 0;
    this.next = 0;
    this.rays = 0;
    this.bounces = 0;
    this.maxSample = 0;
    this.fireflies = 0;
    this.passRays = 0;
    this.passBounces = 0;
    this.passMax = 0;
    this.passFireflies = 0;
    this.meanBefore = 0;
    this.keep = this.measuredPixels();
    this.kept = this.keep.reduce((a, b) => a + b, 0);
    this.done = false;
    this.version = (this.version ?? 0) + 1;
    this.dirty = true;
  }

  /** 1 for each pixel whose measurements count: 0 where the light's outline, projected through the eye, overlaps the pixel */
  measuredPixels() {
    const S = this.size;
    const h = this.scene.lightSide / 2;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [cx, cz] of [[-h, -h], [h, -h], [h, h], [-h, h]]) {
      const d = PL.sub([cx, this.scene.lightY, cz], PL.EYE);
      const px = ((d[0] / -d[2] / PL.TAN_HALF_FOV + 1) / 2) * S;
      const py = ((1 - d[1] / -d[2] / PL.TAN_HALF_FOV) / 2) * S;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    const keep = new Uint8Array(this.pixels).fill(1);
    for (let i = 0; i < this.pixels; i++) {
      const x = i % S, y = Math.floor(i / S);
      if (x + 1 > x0 && x < x1 && y + 1 > y0 && y < y1) keep[i] = 0;
    }
    return keep;
  }

  /** one sample for the next pixel of the pass; true when that completed the pass */
  traceNext() {
    const S = this.size;
    const i = this.next;
    const ray = PL.cameraRay(i % S, Math.floor(i / S), S, PL.nextRandom(this.rng), PL.nextRandom(this.rng));
    const path = PL.tracePath(this.scene, ray.origin, ray.direction, this.rng, this.options);
    const l = PL.luminance(path.radiance);
    for (let k = 0; k < 3; k++) this.passSum[3 * i + k] += path.radiance[k];
    this.passLum[i] += l;
    this.passLumSq[i] += l * l;
    this.passRays += path.rays;
    this.passBounces += path.bounces;
    if (this.keep[i]) {
      for (let b = 0; b < path.byBounce.length; b++) this.passBins[b] += path.byBounce[b];
      if (l > this.passMax) this.passMax = l;
      // the threshold is the image mean as of the last whole pass; the first pass has no mean yet and counts nothing
      if (this.meanBefore > 0 && l > FIREFLY_FACTOR * this.meanBefore) this.passFireflies += 1;
    }
    this.next = i + 1;
    return this.next === this.pixels;
  }

  commit() {
    for (let i = 0; i < this.sum.length; i++) { this.sum[i] += this.passSum[i]; this.passSum[i] = 0; }
    for (let i = 0; i < this.pixels; i++) {
      this.lum[i] += this.passLum[i];
      this.lumSq[i] += this.passLumSq[i];
      this.passLum[i] = 0;
      this.passLumSq[i] = 0;
    }
    for (let b = 0; b < this.bins.length; b++) { this.bins[b] += this.passBins[b]; this.passBins[b] = 0; }
    this.rays += this.passRays;
    this.bounces += this.passBounces;
    this.maxSample = Math.max(this.maxSample, this.passMax);
    this.fireflies += this.passFireflies;
    this.passRays = 0;
    this.passBounces = 0;
    this.passMax = 0;
    this.passFireflies = 0;
    this.passes += 1;
    this.next = 0;
    let total = 0;
    for (let i = 0; i < this.pixels; i++) if (this.keep[i]) total += this.lum[i];
    this.meanBefore = total / (this.kept * this.passes);
    if (this.passes >= this.cfg.cap) this.done = true;
    this.dirty = true;
  }

  /** work for about ms milliseconds; true if a pass was committed */
  step(ms) {
    const start = performance.now();
    let committed = false;
    while (!this.done && performance.now() - start < ms) {
      if (this.traceNext()) { this.commit(); committed = true; }
    }
    return committed;
  }

  /** whole passes, with no clock (the tests) */
  runPasses(count) {
    for (let p = 0; p < count && !this.done; p++) {
      while (!this.traceNext()) { /* the rest of the pass */ }
      this.commit();
    }
  }

  /** the mean of each pixel as bytes to the canvas, if there is one and something new to show */
  paint() {
    if (!this.canvas || !this.passes || !this.dirty) return;
    const S = this.size;
    const g = this.canvas.getContext('2d', { willReadFrequently: true });
    const img = g.createImageData(S, S);
    const n = this.passes;
    for (let i = 0; i < this.pixels; i++) {
      for (let k = 0; k < 3; k++) {
        const v = Math.min(1, Math.max(0, (this.sum[3 * i + k] / n) * EXPOSURE));
        img.data[4 * i + k] = Math.round(255 * Math.pow(v, 1 / 2.2));
      }
      img.data[4 * i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    this.dirty = false;
  }

  /** mean RGB of the whole image, and what the whole passes so far measured */
  stats() {
    const n = this.passes;
    const paths = this.pixels * n;
    const measured = this.kept * n;
    const depth = this.cfg.maxDepth;
    if (!n) {
      return { spp: 0, mean: 0, standardError: 0, noise: 0, raysPerSample: 0, bouncesPerPath: 0, byBounce: new Array(depth + 1).fill(0), maxSample: 0, fireflies: 0, meanRGB: [0, 0, 0], cost: 0 };
    }
    const sums = new Float64Array(this.kept), squares = new Float64Array(this.kept);
    const meanRGB = [0, 0, 0];
    let at = 0;
    for (let i = 0; i < this.pixels; i++) {
      if (!this.keep[i]) continue;
      sums[at] = this.lum[i];
      squares[at] = this.lumSq[i];
      at += 1;
      for (let k = 0; k < 3; k++) meanRGB[k] += this.sum[3 * i + k] / measured;
    }
    const noise = PL.imageNoise(sums, squares, n);
    const raysPerSample = this.rays / paths;
    return {
      spp: n, mean: noise.mean, standardError: noise.standardError, noise: noise.noise, raysPerSample, bouncesPerPath: this.bounces / paths,
      byBounce: Array.from(this.bins, (x) => x / measured), maxSample: this.maxSample, fireflies: this.fireflies, meanRGB,
      // the cost of a given noise: the variance of one sample times the rays it takes, so a cheaper path is not a better one unless its noise is no worse
      cost: noise.noise * noise.noise * n * raysPerSample,
    };
  }
}
