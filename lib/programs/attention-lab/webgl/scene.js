// scene.js: the lecture's three tokens through one attention layer, in three.js. attentionlab.js computes the queries, keys,
// values, scores, weights and outputs; this file draws them and a status line. The left plane holds the keys (colored points,
// each with an arrow from the origin) and the chosen query (a gold arrow); the right plane holds the values, each as a sphere whose
// size is its weight, and the output y as a gold sphere at the weighted sum. Keys: 1, 2, 3 choose the query token; up and down
// arrows change the temperature; D divides the scores by sqrt(d) or not. Drag to orbit, scroll to zoom.
// The same scene, step for step, is AttentionLabScene.cs in ../unity/.
import * as THREE from '../../../vendor/three.module.js';
import * as AL from './attentionlab.js';

// #region Renderer, scene, camera
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10);
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const light = new THREE.DirectionalLight(0xffffff, 1.6);
light.position.set(2, 6, 4);
scene.add(light);
scene.add(new THREE.GridHelper(14, 14, 0x3a4152, 0x262a35));

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 200);
const target = new THREE.Vector3(0, 0, 0);
// #endregion

// #region The tokens
// The lecture's example: x = (1, 0), (0, 1), (1, 1); W_q = W_k = I; W_v = [0.5 1; 1 0.5]. Keys are drawn in the plane at x = -3.5
// and values at x = +3.5, each plane lying flat, so a vector (a, b) is the point (offset + a, 0, -b).
const X = [[1, 0], [0, 1], [1, 1]];
const Wq = [[1, 0], [0, 1]];
const Wk = [[1, 0], [0, 1]];
const Wv = [[0.5, 1], [1, 0.5]];
const COLORS = [0xff7b72, 0x79c0ff, 0x7ee787];
const KEY_OFFSET = -3.5;
const VALUE_OFFSET = 3.5;
const SCALE = 1.4;
let query = 2;
let temperature = 1;
let scaled = true;
let summary = '';

function place(offset, v) {
  return new THREE.Vector3(offset + SCALE * v[0], 0, -SCALE * v[1]);
}

const keyArrows = [];
const valueSpheres = [];
for (let j = 0; j < X.length; j++) {
  const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(KEY_OFFSET, 0, 0), 1, COLORS[j], 0.2, 0.12);
  scene.add(arrow);
  keyArrows.push(arrow);
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({ color: COLORS[j] }));
  scene.add(sphere);
  valueSpheres.push(sphere);
}
const queryArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(KEY_OFFSET, 0.05, 0), 1, 0xffd166, 0.25, 0.15);
scene.add(queryArrow);
const outputSphere = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0x665000 }));
scene.add(outputSphere);

function setArrow(arrow, offset, v) {
  const tip = place(offset, v).sub(new THREE.Vector3(offset, 0, 0));
  const length = tip.length();
  if (length < 1e-6) { arrow.visible = false; return; }
  arrow.visible = true;
  arrow.setDirection(tip.clone().normalize());
  arrow.setLength(length, Math.min(0.25, length * 0.4), 0.12);
}
// #endregion

// #region Attention
function update() {
  const result = AL.attend(X, X, Wq, Wk, Wv, temperature, scaled);
  const row = AL.attendRow(result.Q[query], result.K, result.V, temperature, scaled);
  for (let j = 0; j < X.length; j++) {
    setArrow(keyArrows[j], KEY_OFFSET, result.K[j]);
    valueSpheres[j].position.copy(place(VALUE_OFFSET, result.V[j]));
    const radius = 0.06 + 0.3 * row.weights[j];
    valueSpheres[j].scale.set(radius, radius, radius);
  }
  setArrow(queryArrow, KEY_OFFSET, result.Q[query]);
  outputSphere.position.copy(place(VALUE_OFFSET, row.y));
  summary = 'token ' + (query + 1) + ', temperature ' + temperature.toFixed(2) + (scaled ? ', scores / sqrt(d)' : ', scores raw')
    + ', scores (' + row.scores.map(function (s) { return s.toFixed(3); }).join(', ') + ')'
    + ', weights (' + row.weights.map(function (w) { return w.toFixed(3); }).join(', ') + ')'
    + ', y (' + row.y[0].toFixed(3) + ', ' + row.y[1].toFixed(3) + ')';
}
// #endregion

// #region Input: the query token, the temperature, the scaling
function onKeyDown(event) {
  const key = event.key.toLowerCase();
  const digit = parseInt(key, 10);
  if (digit >= 1 && digit <= 3) query = digit - 1;
  else if (event.key === 'ArrowUp') temperature = Math.min(4, temperature + 0.05);
  else if (event.key === 'ArrowDown') temperature = Math.max(0.05, temperature - 0.05);
  else if (key === 'd') scaled = !scaled;
  else return;
  update();
  event.preventDefault();
}
window.addEventListener('keydown', onKeyDown);
// #endregion

// #region Orbit: drag to turn, scroll to zoom
let azimuth = 0.3, elevation = 0.9, distance = 13, dragging = false, px = 0, py = 0;

function placeCamera() {
  camera.position.set(
    target.x + distance * Math.cos(elevation) * Math.sin(azimuth),
    target.y + distance * Math.sin(elevation),
    target.z + distance * Math.cos(elevation) * Math.cos(azimuth));
  camera.lookAt(target);
}
function onPointerDown(event) { dragging = true; px = event.clientX; py = event.clientY; }
function onPointerUp() { dragging = false; }
function onPointerMove(event) {
  if (!dragging) return;
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
  statusLine.textContent = summary + '   keys 1-3 up/down D';
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

update();
requestAnimationFrame(frame);
