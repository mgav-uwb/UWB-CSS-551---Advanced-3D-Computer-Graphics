// trace-lab-render: the two images of trace-lab and the paths through the picked pixel, computed progressively by the program's own
// functions (lib/programs/trace-lab/webgl/tracelab.js) a few milliseconds per animation frame, so a drag stays responsive.
//   Whitted's image is ray-lab's ProgressiveImage (two rows per block, about 9 ms per frame, its own animation frames).
//   The path tracer's image is PathImage below: like path-lab's Progressive it commits whole passes, so the picture always shows a
//   whole number of samples per pixel; pass k traces path k of every pixel, the same paths the views trace for one pixel.
//   PixelJob adds paths through the picked pixel, thousands of them, for the converged value and the shares the views report.
// Each image and each pixel's totals are kept per settings, so switching views, or going back to earlier settings, does not start
// them again. The engine pauses while its scene is not laid out (a deck slide that is not showing).
import * as T from '../programs/trace-lab/webgl/tracelab.js';
import { ProgressiveImage } from './ray-lab-whitted.js';

export const EXPOSURE = 1.5;                       // both images, so they compare value for value
export const SIZES = [48, 64, 96, 128];             // image widths; the height is 3/4 of the width
export const DEFAULT_WIDTH = 64;
export const PATH_CAP = 4096;                       // passes of the path image
export const PIXEL_CAP = 16384;                     // paths through the picked pixel
const KEEP = 8;                                     // settings kept per cache

const vec = (v) => [v.x, v.y, v.z];
const round = (x, d = 4) => Number(x.toFixed(d));

/** everything the tracers need, from the lab's values (handles are three.js vectors), and the keys the caches use */
export function settingsOf(m) {
  const width = m.res, height = (m.res * 3) / 4;
  const side = Math.round(m.size * 100) / 100;
  const scene = T.makeScene(m.light.x, m.light.z, side);
  const camera = { eye: vec(m.eye), look: vec(m.look), fovDeg: m.fov, width, height };
  const wOpt = { maxDepth: Math.round(m.depth), shadowRays: m.shadowRays };
  const pOpt = { maxDepth: Math.round(m.maxDepth), roulette: m.roulette, nee: m.nee };
  const base = [width, round(m.light.x), round(m.light.z), side, ...camera.eye.map((x) => round(x)), ...camera.look.map((x) => round(x)), m.fov].join(',');
  return { scene, camera, wOpt, pOpt, width, height, wKey: `${base}|${wOpt.maxDepth},${wOpt.shadowRays}`, pKey: `${base}|${pOpt.maxDepth},${pOpt.roulette},${pOpt.nee}` };
}

/** the pixel the lab's values pick: fractions of the image, so a preset lands on the same spot at any resolution */
export function pixelOf(m, width = m.res, height = (m.res * 3) / 4) {
  return [Math.max(0, Math.min(width - 1, Math.floor(m.fx * width))), Math.max(0, Math.min(height - 1, Math.floor(m.fy * height)))];
}

function remember(cache, key, value) {
  cache.delete(key);
  cache.set(key, value);
  while (cache.size > KEEP) cache.delete(cache.keys().next().value);
}

function canvasOf(width, height) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  return c;
}

// ---------------------------------------------------------------- the path tracer's image

export class PathImage {
  constructor(st, from) {
    this.key = st.pKey;
    this.scene = st.scene;
    this.camera = st.camera;
    this.options = st.pOpt;
    this.width = st.width;
    this.height = st.height;
    const P = this.width * this.height;
    this.pixels = P;
    this.sum = new Float64Array(3 * P);
    this.lum = new Float64Array(P);
    this.lumSq = new Float64Array(P);
    this.passSum = new Float64Array(3 * P);
    this.passes = 0;
    this.next = 0;
    this.rays = 0;
    this.passRays = 0;
    this.done = false;
    this.ms = 0;                     // JavaScript time spent tracing, for the cost per pass
    this.canvas = canvasOf(this.width, this.height);
    // until its first pass is complete the image shows the picture it replaces
    if (from && from.width === this.width) this.canvas.getContext('2d').drawImage(from, 0, 0);
  }

  /** trace pixels for about ms milliseconds; true if a pass was committed */
  step(ms) {
    const start = performance.now();
    let committed = false;
    while (!this.done && performance.now() - start < ms) {
      const last = Math.min(this.pixels, this.next + 24);
      const out = T.renderPass(this.scene, this.camera, this.passes, this.next, last, this.options);
      for (let i = this.next; i < last; i++) {
        const at = 3 * (i - this.next);
        for (let k = 0; k < 3; k++) this.passSum[3 * i + k] = out.pixels[at + k];
      }
      this.passRays += out.rays;
      this.next = last;
      if (this.next === this.pixels) { this.commit(); committed = true; }
    }
    this.ms += performance.now() - start;
    return committed;
  }

  commit() {
    for (let i = 0; i < this.pixels; i++) {
      const r = this.passSum[3 * i], g = this.passSum[3 * i + 1], b = this.passSum[3 * i + 2];
      this.sum[3 * i] += r;
      this.sum[3 * i + 1] += g;
      this.sum[3 * i + 2] += b;
      const l = T.luminance([r, g, b]);
      this.lum[i] += l;
      this.lumSq[i] += l * l;
    }
    this.rays += this.passRays;
    this.passRays = 0;
    this.passes += 1;
    this.next = 0;
    if (this.passes >= PATH_CAP) this.done = true;
    this.paint();
  }

  paint() {
    const g = this.canvas.getContext('2d', { willReadFrequently: true });
    const img = g.createImageData(this.width, this.height);
    const n = this.passes;
    for (let i = 0; i < this.pixels; i++) {
      for (let k = 0; k < 3; k++) {
        const v = Math.min(1, Math.max(0, (this.sum[3 * i + k] / n) * EXPOSURE));
        img.data[4 * i + k] = Math.round(255 * Math.pow(v, 1 / 2.2));
      }
      img.data[4 * i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
  }

  /** the mean of one pixel's samples so far */
  value(px, py) {
    const i = py * this.width + px, n = Math.max(1, this.passes);
    return [this.sum[3 * i] / n, this.sum[3 * i + 1] / n, this.sum[3 * i + 2] / n];
  }

  stats() {
    if (!this.passes) return { spp: 0, noise: 0, mean: 0, raysPerSample: 0, msPerPass: 0 };
    const noise = T.imageNoise(this.lum, this.lumSq, this.passes);
    return { spp: this.passes, noise: noise.noise, mean: noise.mean, raysPerSample: this.rays / (this.pixels * this.passes), msPerPass: this.ms / this.passes };
  }
}

// ---------------------------------------------------------------- the paths through the picked pixel

class PixelJob {
  constructor(st, px, py, key) {
    this.key = key;
    this.st = st;
    this.px = px;
    this.py = py;
    this.totals = T.emptyTotals();
    this.done = false;
  }

  step(ms) {
    const start = performance.now();
    while (!this.done && performance.now() - start < ms) {
      const count = this.totals.count < 64 ? 16 : 64;
      this.totals = T.pixelPaths(this.st.scene, this.st.camera, this.px, this.py, this.totals.count, count, this.st.pOpt, this.totals);
      if (this.totals.count >= PIXEL_CAP) this.done = true;
    }
  }
}

// ---------------------------------------------------------------- the engine

export class Engine {
  constructor() {
    this.whitted = new Map();       // width -> ProgressiveImage (each keeps its own canvas)
    this.whittedDone = new Map();   // settings -> the finished picture's bytes and ray count
    this.paths = new Map();         // settings -> PathImage
    this.jobs = new Map();          // settings and pixel -> PixelJob
    this.st = null;
    this.path = null;
    this.job = null;
    this.wantJob = false;
    this.raf = 0;
    this.listeners = new Set();
    this.host = null;               // an element whose layout says whether the demo is showing
    this.frameMs = [];              // JavaScript time of the engine's last frames
  }

  /** f(kind) is called after progress: 'whitted' or 'path' when a picture changed, 'job' when the pixel's totals grew */
  listen(f) { this.listeners.add(f); return () => this.listeners.delete(f); }
  emit(kind) { for (const f of this.listeners) f(kind); }

  whittedImage(width) {
    if (!this.whitted.has(width)) {
      const c = canvasOf(width, (width * 3) / 4);
      this.whitted.set(width, new ProgressiveImage(c, width, (width * 3) / 4, () => this.emit('whitted')));
    }
    return this.whitted.get(width);
  }

  /** point the engine at the current settings; starts, resumes or restores what they need */
  configure(st, pixel = null, wantJob = false) {
    this.st = st;
    // Whitted: a finished picture of earlier settings is restored, not traced again
    const img = this.whittedImage(st.width);
    if (img.key !== st.wKey) {
      if (img.done && img.key) remember(this.whittedDone, img.key, { data: img.data.data.slice(), rays: img.rays });
      const kept = this.whittedDone.get(st.wKey);
      if (kept) {
        img.cancel();
        img.data.data.set(kept.data);
        img.ctx.putImageData(img.data, 0, 0);
        img.key = st.wKey;
        img.row = img.height;
        img.rays = kept.rays;
        img.done = true;
        img.canvas.dataset.done = '1';
        this.emit('whitted');
      } else {
        const { scene, camera, wOpt } = st;
        img.start(st.wKey, (y0, y1) => {
          const out = T.renderRows(scene, camera, y0, y1, wOpt);
          return { pixels: out.pixels.map((x) => x * EXPOSURE), rays: out.rays };
        });
      }
    }
    // the path tracer
    if (!this.path || this.path.key !== st.pKey) {
      const before = this.path;
      let next = this.paths.get(st.pKey);
      if (!next) {
        next = new PathImage(st, before && before.width === st.width ? before.canvas : this.whittedImage(st.width).canvas);
        remember(this.paths, st.pKey, next);
      }
      this.path = next;
      this.emit('path');
    }
    // the picked pixel
    this.wantJob = wantJob;
    if (pixel) {
      const key = `${st.pKey}|${pixel[0]},${pixel[1]}`;
      if (!this.job || this.job.key !== key) {
        let job = this.jobs.get(key);
        if (!job) { job = new PixelJob(st, pixel[0], pixel[1], key); remember(this.jobs, key, job); }
        this.job = job;
      }
    }
    this.kick();
  }

  get whittedNow() { return this.st ? this.whittedImage(this.st.width) : null; }

  showing() {
    if (typeof document !== 'undefined' && document.hidden) return false;
    return !this.host || this.host.offsetParent !== null;
  }

  busy() { return (this.path && !this.path.done) || (this.wantJob && this.job && !this.job.done); }

  kick() {
    if (!this.raf && typeof requestAnimationFrame === 'function' && this.busy()) this.raf = requestAnimationFrame(() => this.tick());
  }

  tick() {
    this.raf = 0;
    if (!this.showing()) { setTimeout(() => this.kick(), 500); return; }
    const t0 = performance.now();
    // Whitted's picture first: ProgressiveImage works about 9 ms of each frame, and a block of two rows can take up to about 29 ms
    // (128 x 96, 64 shadow rays), so while it runs the path tracer takes 2 ms and the pixel's paths wait
    const w = this.whittedNow;
    const whittedBusy = w && !w.done;
    const jobBusy = this.wantJob && this.job && !this.job.done;
    let committed = false;
    if (this.path && !this.path.done) committed = this.path.step(whittedBusy ? 2 : jobBusy ? 6 : 9);
    if (jobBusy && !whittedBusy) { this.job.step(3); this.emit('job'); }
    if (committed) this.emit('path');
    this.frameMs.push(performance.now() - t0);
    if (this.frameMs.length > 120) this.frameMs.shift();
    this.kick();
  }
}
