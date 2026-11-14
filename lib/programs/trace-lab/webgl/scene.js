// scene.js: the Cornell box of tracelab.js rendered twice in the browser, by Whitted's tracer and by the path tracer, side by side.
// tracelab.js computes; this file renders Whitted's image a few rows per animation frame and the path tracer's one pass at a time
// (each pass gives every pixel one more sample), in slices of a few milliseconds so the page stays responsive, and draws both to
// 2D canvases at the same exposure. A click on a pixel prints its Whitted tree in brief and its first paths with their types.
// Keys: S cycles Whitted's shadow rays (1, 4, 16, 64), L cycles the light's side (0, a point light; 0.3; 0.6; 1.0),
// N turns next-event estimation on and off, Space starts again. The path image stops at 1024 samples per pixel.
// The same scene, step for step, is TraceLabScene.cs in ../unity/.
import * as TL from './tracelab.js';

// #region Settings
// The images are WIDTH x HEIGHT pixels, 4:3. The camera is the path lab's: eye (0, 0, 5.2), looking down -z, a 42 degree field of view.
const WIDTH = 64;
const HEIGHT = 48;
const SAMPLES = 1024;
const SLICE_MS = 10;
const EXPOSURE = 1.5;
const SHADOW_RAYS = [1, 4, 16, 64];
const LIGHT_SIDES = [0, 0.3, 0.6, 1.0];
const settings = { shadowRays: 16, light: 2, nee: true };
const camera = { eye: [0, 0, 5.2], look: [0, 0, 0], fovDeg: 42, width: WIDTH, height: HEIGHT };
// #endregion

// #region The images
// Whitted's image is finished row by row; the path image keeps the running sum of each pixel's samples and shows sum / passes.
const whittedCanvas = document.getElementById('whitted');
const pathCanvas = document.getElementById('path');
const whittedPicture = whittedCanvas.getContext('2d').createImageData(WIDTH, HEIGHT);
const pathPicture = pathCanvas.getContext('2d').createImageData(WIDTH, HEIGHT);
const sums = new Float64Array(WIDTH * HEIGHT * 3);
let scene;
let row;
let pass;
let nextPixel;

function whittedOptions() {
  return { maxDepth: 5, shadowRays: settings.shadowRays };
}

function pathOptions() {
  return { maxDepth: 6, roulette: 'fixed', nee: settings.nee };
}

function restart() {
  scene = TL.makeScene(0.3, -0.5, LIGHT_SIDES[settings.light]);
  sums.fill(0);
  row = 0;
  pass = 0;
  nextPixel = 0;
}

function toByte(value) {
  return Math.round(255 * Math.pow(Math.min(1, Math.max(0, value * EXPOSURE)), 1 / 2.2));
}

function putPixel(picture, i, color) {
  for (let k = 0; k < 3; k++) picture.data[i * 4 + k] = toByte(color[k]);
  picture.data[i * 4 + 3] = 255;
}
// #endregion

// #region The loop
// A slice of work per animation frame: Whitted's rows first, then path samples; a path pass is drawn when it is complete.
const status = document.getElementById('status');

function frame() {
  const start = performance.now();
  while (row < HEIGHT && performance.now() - start < SLICE_MS) {
    const out = TL.renderRows(scene, camera, row, row + 1, whittedOptions());
    for (let x = 0; x < WIDTH; x++) putPixel(whittedPicture, row * WIDTH + x, [out.pixels[3 * x], out.pixels[3 * x + 1], out.pixels[3 * x + 2]]);
    row += 1;
  }
  whittedCanvas.getContext('2d').putImageData(whittedPicture, 0, 0);
  while (pass < SAMPLES && performance.now() - start < SLICE_MS) {
    const last = Math.min(WIDTH * HEIGHT, nextPixel + 32);
    const out = TL.renderPass(scene, camera, pass, nextPixel, last, pathOptions());
    for (let i = nextPixel; i < last; i++) {
      for (let k = 0; k < 3; k++) sums[i * 3 + k] += out.pixels[(i - nextPixel) * 3 + k];
    }
    nextPixel = last;
    if (nextPixel === WIDTH * HEIGHT) {
      pass += 1;
      nextPixel = 0;
      for (let i = 0; i < WIDTH * HEIGHT; i++) putPixel(pathPicture, i, [sums[i * 3] / pass, sums[i * 3 + 1] / pass, sums[i * 3 + 2] / pass]);
      pathCanvas.getContext('2d').putImageData(pathPicture, 0, 0);
    }
  }
  status.textContent = 'light side ' + LIGHT_SIDES[settings.light] + ', Whitted ' + settings.shadowRays + ' shadow rays per hit, next-event estimation '
    + (settings.nee ? 'on' : 'off') + ': Whitted row ' + row + ' of ' + HEIGHT + ', path tracer ' + pass + ' samples per pixel';
  if (row < HEIGHT || pass < SAMPLES) requestAnimationFrame(frame);
}

function begin() {
  restart();
  requestAnimationFrame(frame);
}
// #endregion

// #region Picking a pixel
// The clicked pixel: its Whitted color and tree size, and its first eight paths, each with its vertices in Heckbert's notation.
const pixelText = document.getElementById('pixel');

function onClick(event) {
  const box = event.target.getBoundingClientRect();
  const px = Math.min(WIDTH - 1, Math.floor((event.clientX - box.left) / box.width * WIDTH));
  const py = Math.min(HEIGHT - 1, Math.floor((event.clientY - box.top) / box.height * HEIGHT));
  const node = TL.tracePixel(scene, camera, px, py, whittedOptions());
  const tree = TL.rayTree(node);
  let text = 'pixel (' + px + ', ' + py + '): Whitted ' + node.color.map(function onePlace(c) { return c.toFixed(3); }).join(', ')
    + ' from ' + tree.rays + ' rays (' + tree.shadowRays + ' shadow rays)\n';
  for (let k = 0; k < 8; k++) {
    const sample = TL.pixelSample(scene, camera, px, py, k, pathOptions());
    const parts = TL.lightPaths(sample.path);
    text += 'path ' + k + ': ' + parts.word + ', L = ' + TL.luminance(sample.path.radiance).toFixed(3) + '\n';
  }
  pixelText.textContent = text;
}
whittedCanvas.addEventListener('click', onClick);
pathCanvas.addEventListener('click', onClick);
// #endregion

// #region Input
function onKeyDown(event) {
  const key = event.key.toLowerCase();
  if (key === 's') settings.shadowRays = SHADOW_RAYS[(SHADOW_RAYS.indexOf(settings.shadowRays) + 1) % SHADOW_RAYS.length];
  else if (key === 'l') settings.light = (settings.light + 1) % LIGHT_SIDES.length;
  else if (key === 'n') settings.nee = !settings.nee;
  else if (key !== ' ') return;
  begin();
}
window.addEventListener('keydown', onKeyDown);
begin();
// #endregion
