// scene.js: a Cornell box path-traced in the browser, progressively. pathlab.js computes; this file traces one sample at a
// time for each pixel of a 128 x 128 image in slices of a few milliseconds, so the page stays responsive, draws the running
// mean of each pixel to a 2D canvas, and writes a status line. The picture is the result, so no three.js is needed.
// Keys: D cycles the maximum depth (0 to 8), R cycles Russian roulette (off, q = 0.7, q = throughput), N turns next-event
// estimation on and off, L cycles the light's size, Space starts again. The render stops at 256 samples per pixel.
// The same scene, step for step, is PathLabScene.cs in ../unity/.
import * as PL from './pathlab.js';

// #region Settings
// The render is SIZE x SIZE pixels. Each pixel gets one more sample per pass, up to SAMPLES.
const SIZE = 128;
const SAMPLES = 256;
const SLICE_MS = 12;
const EXPOSURE = 2.2;
const ROULETTE_MODES = ['off', 'fixed', 'throughput'];
const LIGHT_SIDES = [0.25, 0.5, 1.0];
const settings = { maxDepth: 6, roulette: 'fixed', nee: true, light: 1 };
// #endregion

// #region The image
// Per pixel: the running sum of the sample colors (r, g, b) and how many samples it has. The canvas shows sum / count.
const canvas = document.getElementById('image');
const context = canvas.getContext('2d');
const picture = context.createImageData(SIZE, SIZE);
const sums = new Float64Array(SIZE * SIZE * 3);
const counts = new Uint16Array(SIZE * SIZE);
let scene;
let rng;
let nextPixel;
let rays;
let samples;

function restart() {
  scene = PL.makeCornell(LIGHT_SIDES[settings.light]);
  rng = PL.makeRng(1);
  sums.fill(0);
  counts.fill(0);
  nextPixel = 0;
  rays = 0;
  samples = 0;
}

function pathOptions() {
  return { maxDepth: settings.maxDepth, roulette: settings.roulette, nee: settings.nee, clamp: 0, forced: null };
}

// One sample for the next pixel in the list; a pass is complete when every pixel has one more.
function traceNext() {
  const x = nextPixel % SIZE;
  const y = Math.floor(nextPixel / SIZE);
  const ray = PL.cameraRay(x, y, SIZE, PL.nextRandom(rng), PL.nextRandom(rng));
  const path = PL.tracePath(scene, ray.origin, ray.direction, rng, pathOptions());
  for (let k = 0; k < 3; k++) sums[nextPixel * 3 + k] += path.radiance[k];
  counts[nextPixel] += 1;
  rays += path.rays;
  samples += 1;
  nextPixel = (nextPixel + 1) % (SIZE * SIZE);
}

function toByte(value) {
  return Math.round(255 * Math.pow(Math.min(1, Math.max(0, value * EXPOSURE)), 1 / 2.2));
}

function paint() {
  for (let i = 0; i < SIZE * SIZE; i++) {
    const n = Math.max(1, counts[i]);
    for (let k = 0; k < 3; k++) picture.data[i * 4 + k] = toByte(sums[i * 3 + k] / n);
    picture.data[i * 4 + 3] = 255;
  }
  context.putImageData(picture, 0, 0);
}
// #endregion

// #region The loop
// A slice of work per animation frame, then draw. When every pixel has SAMPLES samples the loop stops asking for frames.
const status = document.getElementById('status');

function frame() {
  const start = performance.now();
  while (performance.now() - start < SLICE_MS && counts[nextPixel] < SAMPLES) traceNext();
  paint();
  const perPixel = samples / (SIZE * SIZE);
  status.textContent = 'depth ' + settings.maxDepth + ', roulette ' + settings.roulette + ', next-event ' + (settings.nee ? 'on' : 'off')
    + ', light ' + LIGHT_SIDES[settings.light] + ' wide: ' + perPixel.toFixed(1) + ' samples per pixel, '
    + (rays / Math.max(1, samples)).toFixed(2) + ' rays per sample';
  if (counts[nextPixel] < SAMPLES) requestAnimationFrame(frame);
}

function begin() {
  restart();
  requestAnimationFrame(frame);
}
// #endregion

// #region Input
function onKeyDown(event) {
  const key = event.key.toLowerCase();
  if (key === 'd') settings.maxDepth = (settings.maxDepth + 1) % 9;
  else if (key === 'r') settings.roulette = ROULETTE_MODES[(ROULETTE_MODES.indexOf(settings.roulette) + 1) % 3];
  else if (key === 'n') settings.nee = !settings.nee;
  else if (key === 'l') settings.light = (settings.light + 1) % LIGHT_SIDES.length;
  else if (key !== ' ') return;
  begin();
}
window.addEventListener('keydown', onKeyDown);
begin();
// #endregion
