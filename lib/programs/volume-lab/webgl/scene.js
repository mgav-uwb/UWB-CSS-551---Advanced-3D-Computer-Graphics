// scene.js: a small volume of Gaussian blobs rendered one ray per pixel, in the browser. volumelab.js computes; this file makes the
// camera ray for each pixel of a 128 x 128 image, renders it with the volume-rendering sum, a few rows per animation frame so the
// page stays responsive, and draws the result to a 2D canvas. The picture is the result, so no three.js is needed.
// Keys: N cycles the samples per ray (8, 16, 32, 64), S switches regular and stratified samples, B switches a black and a white
// background, A and D turn the camera, Space starts again. Click a pixel to see the weights of its ray in the status line.
// The same scene, step for step, is VolumeLabScene.cs in ../unity/.
import * as VL from './volumelab.js';

// #region Settings
// The render is SIZE x SIZE pixels, seen from DISTANCE with field of view FOV; each ray runs from NEAR to FAR.
const SIZE = 128;
const FOV = 0.6911;
const DISTANCE = 4;
const NEAR = 2.2;
const FAR = 5.8;
const ROWS_PER_SLICE = 6;
const COUNTS = [8, 16, 32, 64];
const BLOBS = [
  0.0, 0.0, 0.0, 0.5, 1.5, 0.9, 0.2, 0.2,
  0.5, 0.3, -0.2, 0.35, 3.0, 0.2, 0.9, 0.3,
  -0.45, -0.25, 0.3, 0.3, 5.0, 0.3, 0.4, 0.95,
];
const settings = { count: 2, stratified: false, white: false, azimuth: 0.5 };
// #endregion

// #region The image
// Per pixel: the color of its ray. The canvas shows it as is, with 1.0 as full brightness.
const canvas = document.getElementById('image');
const status = document.getElementById('status');
const context = canvas.getContext('2d');
const picture = context.createImageData(SIZE, SIZE);
let rng;
let nextRow;
let picked = null;

function restart() {
  rng = VL.makeRng(1);
  nextRow = 0;
}

// Pixel (i, j) looks through the pixel's corner, as in the lecture's formula.
function renderPixel(i, j) {
  const camera = VL.cameraRay(i, j, SIZE, FOV, settings.azimuth, 0.3, DISTANCE);
  const mode = settings.stratified ? 'stratified' : 'regular';
  const background = settings.white ? [1, 1, 1] : [0, 0, 0];
  return VL.renderVolumeRay(BLOBS, camera.origin, camera.direction, NEAR, FAR, COUNTS[settings.count], mode, 0.5, rng, background);
}

function toByte(value) {
  return Math.round(255 * Math.min(1, Math.max(0, value)));
}

function renderRow(j) {
  for (let i = 0; i < SIZE; i++) {
    const ray = renderPixel(i, j);
    const at = 4 * (j * SIZE + i);
    picture.data[at] = toByte(ray.pixel[0]);
    picture.data[at + 1] = toByte(ray.pixel[1]);
    picture.data[at + 2] = toByte(ray.pixel[2]);
    picture.data[at + 3] = 255;
  }
}
// #endregion

// #region The loop
// A slice of rows per frame, then draw. When every row is done the work stops until a key or a click changes something.
function describe() {
  const mode = settings.stratified ? 'stratified' : 'regular';
  const text = COUNTS[settings.count] + ' samples per ray, ' + mode + ', ' + (settings.white ? 'white' : 'black') + ' background';
  if (picked === null) return text + '. Click a pixel to see its ray.';
  const ray = renderPixel(picked.i, picked.j);
  const weights = ray.weights.map(function (w) { return w.toFixed(3); }).join(' ');
  return text + '. Pixel (' + picked.i + ', ' + picked.j + '): weights ' + weights + ', T_end ' + ray.tEnd.toFixed(3) + ', depth ' + ray.depth.toFixed(2);
}

function frame() {
  const stop = Math.min(SIZE, nextRow + ROWS_PER_SLICE);
  for (let j = nextRow; j < stop; j++) renderRow(j);
  nextRow = stop;
  context.putImageData(picture, 0, 0);
  status.textContent = (nextRow < SIZE ? 'rendering ' + Math.round((100 * nextRow) / SIZE) + ' %: ' : '') + describe();
  if (nextRow < SIZE) requestAnimationFrame(frame);
}

function again() {
  restart();
  requestAnimationFrame(frame);
}
// #endregion

// #region Input
function onKeyDown(event) {
  if (event.key === 'n' || event.key === 'N') settings.count = (settings.count + 1) % COUNTS.length;
  else if (event.key === 's' || event.key === 'S') settings.stratified = !settings.stratified;
  else if (event.key === 'b' || event.key === 'B') settings.white = !settings.white;
  else if (event.key === 'a' || event.key === 'A') settings.azimuth -= 0.2;
  else if (event.key === 'd' || event.key === 'D') settings.azimuth += 0.2;
  else if (event.key !== ' ') return;
  event.preventDefault();
  again();
}

function onClick(event) {
  const box = canvas.getBoundingClientRect();
  picked = { i: Math.floor(((event.clientX - box.left) / box.width) * SIZE), j: Math.floor(((event.clientY - box.top) / box.height) * SIZE) };
  status.textContent = describe();
}

window.addEventListener('keydown', onKeyDown);
canvas.addEventListener('click', onClick);
again();
// #endregion
