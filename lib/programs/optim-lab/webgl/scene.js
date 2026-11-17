// scene.js: a loss surface as a height field, and the walk of one optimizer down it, in three.js. optimlab.js computes the loss,
// the gradient and every step; this file draws the surface, the path and a status line. Keys: 1 to 6 pick the surface (bowl,
// ill-conditioned bowl, saddle, valley, minima, perceptron), G, M and A pick gradient descent, momentum or Adam, up and down
// arrows change the learning rate, space takes the next step, Enter runs to the end, R starts again. Click the surface to start
// there. Drag to orbit, scroll to zoom.
// The same scene, step for step, is OptimLabScene.cs in ../unity/.
import * as THREE from '../../../vendor/three.module.js';
import * as OL from './optimlab.js';

// #region Renderer, scene, camera
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(2, 6, 3);
scene.add(light);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 200);
const target = new THREE.Vector3(0, 0.6, 0);
// #endregion

// #region The surfaces
// Each surface has a name for lossAt, a square-ish domain, and a start. Height is a logarithm of the loss above its lowest
// value, so a steep wall and a flat floor both show: height = HEIGHT log(1 + (L - floor) / scale).
const NAMES = ['bowl', 'ill-conditioned', 'saddle', 'valley', 'minima', 'perceptron'];
const DOMAINS = [[-3, 3, -3, 3], [-3, 3, -3, 3], [-2.2, 2.2, -1.8, 1.8], [-2, 2, -0.5, 3.5], [-5, 5, -5, 5], [-4, 4, -2.5, 2.5]];
const FLOORS = [0, 0, -0.25, 0, 0, 0];
const STARTS = [[-2.5, 1.8], [-2.5, 1.5], [1.5, 0.05], [-1.5, 2], [2.5, 2.2], [1, 0.8]];
const RATES = [0.4, 0.19, 0.1, 0.08, 0.2, 0.1];
const HEIGHT = 1.1;
const SCALE = 1.5;

function heightOf(surface, loss) {
  return HEIGHT * Math.log(1 + Math.max(0, loss - FLOORS[surface]) / SCALE);
}

function buildSurface(surface) {
  const n = 80;
  const d = DOMAINS[surface];
  const positions = new Float32Array((n + 1) * (n + 1) * 3);
  const colors = new Float32Array((n + 1) * (n + 1) * 3);
  const index = [];
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const x = d[0] + (i / n) * (d[1] - d[0]);
      const y = d[2] + (j / n) * (d[3] - d[2]);
      const loss = OL.lossAt(NAMES[surface], x, y).loss;
      const h = heightOf(surface, loss);
      const at = (j * (n + 1) + i) * 3;
      positions.set([x, h, -y], at);
      const band = 0.5 + 0.5 * Math.sin(h * 9);
      colors.set([0.1 + 0.05 * band + 0.1 * h, 0.35 + 0.15 * band, 0.55 - 0.05 * h], at);
      if (i < n && j < n) {
        const a = j * (n + 1) + i;
        index.push(a, a + 1, a + n + 1, a + 1, a + n + 2, a + n + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}
// #endregion

// #region The walk
// The path is recomputed by runOptimizer from the start, with as many steps as have been taken; the ball sits at its end.
let surface = 0;
let kind = 'gd';
let eta = RATES[0];
let start = STARTS[0];
let taken = 0;
const MAX_STEPS = 150;

const surfaceMesh = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 }));
scene.add(surfaceMesh);
const pathLine = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffffff }));
scene.add(pathLine);
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd166 }));
scene.add(ball);
let summary = '';

function rebuildSurface() {
  surfaceMesh.geometry.dispose();
  surfaceMesh.geometry = buildSurface(surface);
}

function restart() {
  start = STARTS[surface];
  eta = RATES[surface];
  taken = 0;
}

function update() {
  const run = OL.runOptimizer(NAMES[surface], kind, start, eta, 0.9, taken);
  const points = [];
  for (let i = 0; i < run.count; i++) points.push(new THREE.Vector3(run.xs[i], heightOf(surface, run.losses[i]) + 0.06, -run.ys[i]));
  pathLine.geometry.dispose();
  pathLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
  ball.position.copy(points[points.length - 1]);
  const last = run.count - 1;
  summary = NAMES[surface] + ', ' + kind + ', eta ' + eta.toFixed(2) + ', step ' + last
    + ', theta (' + run.xs[last].toFixed(3) + ', ' + run.ys[last].toFixed(3) + '), loss ' + run.losses[last].toPrecision(4)
    + (run.diverged ? ', DIVERGED' : '');
}
// #endregion

// #region Input: surface, optimizer, rate, steps, click to start
const raycaster = new THREE.Raycaster();
function onKeyDown(event) {
  const key = event.key.toLowerCase();
  const digit = parseInt(key, 10);
  if (digit >= 1 && digit <= 6) { surface = digit - 1; rebuildSurface(); restart(); }
  else if (key === 'g') { kind = 'gd'; taken = 0; }
  else if (key === 'm') { kind = 'momentum'; taken = 0; }
  else if (key === 'a') { kind = 'adam'; taken = 0; }
  else if (event.key === 'ArrowUp') { eta = Math.min(1, eta + 0.01); taken = 0; }
  else if (event.key === 'ArrowDown') { eta = Math.max(0.01, eta - 0.01); taken = 0; }
  else if (key === ' ') taken = Math.min(MAX_STEPS, taken + 1);
  else if (event.key === 'Enter') taken = MAX_STEPS;
  else if (key === 'r') restart();
  else return;
  update();
  event.preventDefault();
}

// A click that did not drag: march the ray until it passes under the surface, and start there.
function onClick(event) {
  if (moved > 5) return;
  const rect = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1), camera);
  const d = DOMAINS[surface];
  for (let s = 0; s < 900; s++) {
    const p = raycaster.ray.at(s * 0.05, new THREE.Vector3());
    const x = p.x;
    const y = -p.z;
    if (x < d[0] || x > d[1] || y < d[2] || y > d[3]) { continue; }
    const below = p.y <= heightOf(surface, OL.lossAt(NAMES[surface], x, y).loss);
    if (below) {
      start = [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
      taken = 0;
      update();
      return;
    }
  }
}
window.addEventListener('keydown', onKeyDown);
renderer.domElement.addEventListener('click', onClick);
// #endregion

// #region Orbit: drag to turn, scroll to zoom
let azimuth = 0.6, elevation = 0.75, distance = 14, dragging = false, px = 0, py = 0, moved = 0;

function placeCamera() {
  camera.position.set(
    target.x + distance * Math.cos(elevation) * Math.sin(azimuth),
    target.y + distance * Math.sin(elevation),
    target.z + distance * Math.cos(elevation) * Math.cos(azimuth));
  camera.lookAt(target);
}
function onPointerDown(event) { dragging = true; moved = 0; px = event.clientX; py = event.clientY; }
function onPointerUp() { dragging = false; }
function onPointerMove(event) {
  if (!dragging) return;
  moved += Math.abs(event.clientX - px) + Math.abs(event.clientY - py);
  azimuth -= (event.clientX - px) * 0.006;
  elevation = Math.min(1.5, Math.max(0.05, elevation + (event.clientY - py) * 0.006));
  px = event.clientX;
  py = event.clientY;
}
function onWheel(event) {
  event.preventDefault();
  distance = Math.min(40, Math.max(3, distance * Math.exp(event.deltaY * 0.001)));
}
renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointermove', onPointerMove);
renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
// #endregion

// #region The frame and the status line
const statusLine = document.getElementById('status');

function frame() {
  statusLine.textContent = summary + '   keys 1-6 G M A up/down space Enter R';
  placeCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);
// #endregion

rebuildSurface();
restart();
update();
requestAnimationFrame(frame);
