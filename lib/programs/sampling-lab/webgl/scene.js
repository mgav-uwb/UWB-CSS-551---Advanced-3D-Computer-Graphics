// scene.js: a zone plate, one pixel at a time. samplinglab.js computes each pixel (zonePixel: the mean of n x n samples inside
// it); this file puts the pixels on a canvas, a few rows per frame, and writes a status line. Keys: up and down arrows change n
// (1 to 16, so 1 to 256 samples per pixel), J switches between a regular grid of samples and jittered ones.
// With one sample per pixel the rings beyond the radius where the pattern passes the Nyquist frequency are aliases; with more
// samples that region turns to gray. No three.js: the picture is a 2D canvas.
// The same scene, step for step, is SamplingLabScene.cs in ../unity/.
import * as SL from './samplinglab.js';

// #region The canvas and the settings
const SIZE = SL.ZONE_SIZE;
const SCALE = 3;                                          // each pixel of the plate is shown 3 x 3 screen pixels
const canvas = document.getElementById('plate');
canvas.width = SIZE;
canvas.height = SIZE;
canvas.style.width = SIZE * SCALE + 'px';
canvas.style.height = SIZE * SCALE + 'px';
const context = canvas.getContext('2d');
const image = context.createImageData(SIZE, SIZE);
const status = document.getElementById('status');

let n = 1;
let jitter = false;
let row = 0;                                              // the next row to compute
// #endregion

// #region Rendering in chunks
// A few rows per frame keep the page responsive when n is large: 16 x 16 samples is 256 per pixel, 10 million in all.
function restart() {
  row = 0;
}

function renderRows(budgetMs) {
  const start = performance.now();
  while (row < SIZE && performance.now() - start < budgetMs) {
    for (let x = 0; x < SIZE; x++) {
      const pixel = SL.zonePixel(x, row, n, jitter, SIZE, SL.ZONE_K);
      const gray = Math.round(255 * pixel.value);
      const at = (row * SIZE + x) * 4;
      image.data[at] = gray;
      image.data[at + 1] = gray;
      image.data[at + 2] = gray;
      image.data[at + 3] = 255;
    }
    row += 1;
  }
  context.putImageData(image, 0, 0);
}
// #endregion

// #region Input and the status line
function onKeyDown(event) {
  const key = event.key.toLowerCase();
  if (event.key === 'ArrowUp') n = Math.min(16, n + 1);
  else if (event.key === 'ArrowDown') n = Math.max(1, n - 1);
  else if (key === 'j') jitter = !jitter;
  else return;
  restart();
  event.preventDefault();
}

function statusText() {
  const radius = SL.zoneRadius(0.5, SIZE, SL.ZONE_K);
  const done = row >= SIZE ? '' : '   rendering ' + Math.round((100 * row) / SIZE) + ' %';
  return n + ' x ' + n + ' = ' + n * n + ' samples per pixel, ' + (jitter ? 'jittered' : 'regular grid')
    + '   Nyquist along an axis at r = ' + radius.toFixed(1) + ' px   up/down J' + done;
}

function frame() {
  renderRows(8);
  status.textContent = statusText();
  requestAnimationFrame(frame);
}
window.addEventListener('keydown', onKeyDown);
// #endregion

restart();
requestAnimationFrame(frame);
