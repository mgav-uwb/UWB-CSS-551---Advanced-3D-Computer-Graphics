// scene.js: the chapter's Whitted scene rendered by raylab.js onto a 2D canvas, 96 x 60 pixels, a few rows per frame. Click a
// pixel to print its tree of rays: each ray's kind, what it hit, its weight and its share of the pixel's color. Keys: up and down
// change the depth limit (0 to 4), left and right the offset epsilon (a power of ten), S stores hit points as 32-bit floats or
// leaves them 64-bit, M switches the cure for acne between an offset origin and a minimum t, C changes the scene (chapter, acne),
// B builds a bounding-volume hierarchy over 200 seeded triangles and prints its test counts against brute force.
// There is no three.js here: the picture is rays, not triangles. Changing anything stops the render in progress and starts again.
// The same scene, step for step, is RayLabScene.cs in ../unity/.
import * as R from './raylab.js';

// #region Settings
// The scene, the image size (the scene's camera), and the options every ray carries: the depth limit, the epsilon, how it is
// applied ('offset' moves the origin along the normal, 'tmin' ignores hits with t below it), and whether hit points are rounded
// to 32 bits. ROWS is how many rows one frame renders.
const SCENE_NAMES = ['chapter', 'acne'];
const ROWS = 4;
let sceneIndex = 0;
let scene = R.chapterScene();
let maxDepth = 4;
let epsExponent = -4;                                     // eps = 10^epsExponent, or 0 at -10
let mode = 'offset';
let single = false;
let selected = null;                                      // the clicked pixel, [px, py]
let report = '';
let nextRow = 0;
let rays = 0;
let renderToken = 0;

function options() {
  return { maxDepth, eps: epsExponent <= -10 ? 0 : Math.pow(10, epsExponent), mode, single };
}
// #endregion

// #region The image
// Render a few rows each frame into the canvas. A change restarts at row 0; the old image stays until it is overwritten, so a
// change shows at once from the top down.
const canvas = document.getElementById('image');
const context = canvas.getContext('2d');
const picture = context.createImageData(canvas.width, canvas.height);

function byte(value) {
  return Math.round(255 * Math.pow(Math.min(Math.max(value, 0), 1), 1 / 2.2));
}

function renderBlock() {
  const camera = scene.camera;
  const y1 = Math.min(nextRow + ROWS, camera.height);
  const block = R.renderRows(scene, nextRow, y1, options());
  let at = 0;
  for (let y = nextRow; y < y1; y++) {
    for (let x = 0; x < camera.width; x++) {
      const target = (y * camera.width + x) * 4;
      picture.data[target] = byte(block.pixels[at]);
      picture.data[target + 1] = byte(block.pixels[at + 1]);
      picture.data[target + 2] = byte(block.pixels[at + 2]);
      picture.data[target + 3] = 255;
      at += 3;
    }
  }
  rays += block.rays;
  nextRow = y1;
  context.putImageData(picture, 0, 0);
}

function restart() {
  nextRow = 0;
  rays = 0;
  renderToken += 1;
  if (selected) describe();
}
// #endregion

// #region The tree of one pixel
// The same shade() that rendered the pixel, called again for it, then rayTree() lists the rays and each one's share of the color.
function text(v) {
  return '(' + v[0].toFixed(3) + ', ' + v[1].toFixed(3) + ', ' + v[2].toFixed(3) + ')';
}

function describe() {
  const node = R.tracePixel(scene, selected[0], selected[1], options());
  const tree = R.rayTree(node);
  const lines = ['pixel (' + selected[0] + ', ' + selected[1] + '): ' + tree.rays + ' rays, ' + tree.shadowRays + ' of them shadow rays'];
  for (const row of tree.rows) {
    const indent = '  '.repeat(row.level);
    if (row.isShadow) {
      const shadow = row.node.shadow;
      lines.push(indent + 'shadow ray: ' + (shadow.blocked ? 'blocked' : 'reaches the light'));
    } else {
      lines.push(indent + row.kind + ' ray hits ' + row.node.material + ', weight ' + row.weight.toFixed(3) + ', accumulated ' + row.accum.toFixed(3)
        + ', adds ' + text(row.contribution));
    }
  }
  lines.push('pixel color ' + text(tree.sum));
  document.getElementById('tree').textContent = lines.join('\n');
}

function onClick(event) {
  const box = canvas.getBoundingClientRect();
  const px = Math.floor(((event.clientX - box.left) / box.width) * canvas.width);
  const py = Math.floor(((event.clientY - box.top) / box.height) * canvas.height);
  selected = [px, py];
  describe();
}
canvas.addEventListener('click', onClick);
// #endregion

// #region The BVH report
// 200 triangles from a seeded Park-Miller generator, a ray along x, the median-split tree: the numbers the lab's BVH views show.
function bvhReport() {
  let seed = 20261105;
  function next() {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  }
  const tris = [];
  for (let i = 0; i < 200; i++) {
    const c = [next() * 6 - 3, next() * 6 - 3, next() * 6 - 3];
    const tri = [];
    for (let k = 0; k < 3; k++) tri.push([c[0] + (next() - 0.5) * 0.45, c[1] + (next() - 0.5) * 0.45, c[2] + (next() - 0.5) * 0.45]);
    tris.push(tri);
  }
  const o = [-5, 0, 0];
  const d = R.normalize([1, 0.05, 0.02]);
  const bvh = R.buildBvh(tris, 4, 12, 'median');
  const trace = R.traverseBvh(bvh, tris, o, d, true);
  const brute = R.bruteForce(tris, o, d);
  return 'BVH over 200 triangles: ' + bvh.nodeCount + ' nodes; this ray: ' + trace.boxTests + ' box tests and ' + trace.triTests
    + ' triangle tests, against ' + brute.tests + ' triangle tests by brute force; '
    + (trace.t < Infinity ? 'nearest hit t = ' + trace.t.toFixed(3) : 'the ray hits nothing');
}
// #endregion

// #region Input: depth, epsilon, precision, mode, scene
function onKeyDown(event) {
  const key = event.key.toLowerCase();
  if (event.key === 'ArrowUp') maxDepth = Math.min(maxDepth + 1, 4);
  else if (event.key === 'ArrowDown') maxDepth = Math.max(maxDepth - 1, 0);
  else if (event.key === 'ArrowRight') epsExponent = Math.min(epsExponent + 1, 0);
  else if (event.key === 'ArrowLeft') epsExponent = Math.max(epsExponent - 1, -10);
  else if (key === 's') single = !single;
  else if (key === 'm') mode = mode === 'offset' ? 'tmin' : 'offset';
  else if (key === 'c') {
    sceneIndex = (sceneIndex + 1) % SCENE_NAMES.length;
    scene = SCENE_NAMES[sceneIndex] === 'chapter' ? R.chapterScene() : R.acneScene();
  } else if (key === 'b') report = bvhReport();
  else return;
  restart();
  event.preventDefault();
}
window.addEventListener('keydown', onKeyDown);
// #endregion

// #region The frame and the status line
const status = document.getElementById('status');

function frame() {
  if (nextRow < scene.camera.height) renderBlock();
  const done = nextRow >= scene.camera.height;
  status.textContent = SCENE_NAMES[sceneIndex] + ' scene   depth ' + maxDepth + '   epsilon ' + (epsExponent <= -10 ? '0' : '1e' + epsExponent) + ' (' + mode
    + ')   hit points ' + (single ? '32-bit' : '64-bit') + '   ' + (done ? 'done, ' : 'row ' + nextRow + ', ') + rays + ' rays   up/down left/right S M C B' + (report ? '   ' + report : '');
  requestAnimationFrame(frame);
}
// #endregion

requestAnimationFrame(frame);
