// scene.js: one picture per topic, in three.js. vectorbasics.js computes; this file draws arrows and writes a status
// line. Keys: 1 to 9 pick the topic (points, frames, normalize, operations, dot, cross, line, tests, interpolation);
// V switches which vector the other keys move (a or b); the arrows move it in x and y, Z and X in z; R starts again.
// Drag to orbit, scroll to zoom.
// The same scene, step for step, is VectorBasicsScene.cs in ../unity/.
import * as THREE from '../../../vendor/three.module.js';
import * as VB from './vectorbasics.js';

// #region Renderer, scene, camera
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10);
scene.add(new THREE.GridHelper(10, 10, 0x3a4152, 0x20242f));
scene.add(new THREE.AxesHelper(2));                      // x red, y green, z blue (three.js colors)

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 100);
const target = new THREE.Vector3(0.5, 0.5, 0);           // what the camera orbits
// #endregion

// #region The arrows
// A pool of arrows, reused every frame: show() places the next one, and whatever the frame did not use is hidden. A
// vector of length 0 has no direction, so it gets no arrow.
const RED = 0xff7b72, BLUE = 0x79c0ff, GREEN = 0x7ee787, AMBER = 0xffa657, PURPLE = 0xd2a8ff, GRAY = 0x8b93a7;
const pool = [];
let used = 0;

function show(from, to, color) {
  const d = to.clone().sub(from);
  const len = d.length();
  if (len < VB.EPS) return;
  if (used === pool.length) {
    const arrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, color);
    scene.add(arrow);
    pool.push(arrow);
  }
  const arrow = pool[used];
  used += 1;
  arrow.visible = true;
  arrow.position.copy(from);
  arrow.setDirection(d.divideScalar(len));
  arrow.setLength(len, Math.min(0.28, 0.4 * len), Math.min(0.11, 0.2 * len));
  arrow.setColor(color);
}

function hideUnused() {
  for (let i = used; i < pool.length; i++) pool[i].visible = false;
}
// #endregion

// #region The nine topics
// Each draws one picture from the two vectors and returns the numbers for the status line.
const ZERO = new THREE.Vector3();
let a = new THREE.Vector3(2, 1, 0);
let b = new THREE.Vector3(1, 2, 1);
let topic = 5;

function text(v) {
  return '(' + v.x.toFixed(2) + ', ' + v.y.toFixed(2) + ', ' + v.z.toFixed(2) + ')';
}

function drawTopic(time) {
  show(ZERO, a, RED);
  show(ZERO, b, BLUE);
  if (topic === 1) {
    const r = VB.pointsAndVectors(a, b, ZERO);
    show(a, b, GREEN);
    return 'points P = a, Q = b: Q - P = ' + text(r.v) + ' (drawn from P to Q)';
  }
  if (topic === 2) {
    const r = VB.buildFrame(a, b);
    show(ZERO, r.u, AMBER);
    show(ZERO, r.v, GREEN);
    show(ZERO, r.w, PURPLE);
    return 'frame from a, b: u = ' + text(r.u) + ', v = ' + text(r.v) + ', w = ' + text(r.w);
  }
  if (topic === 3) {
    const r = VB.normalizeVector(a, 1);
    show(ZERO, r.unit, AMBER);
    return '|a| = ' + r.len.toFixed(3) + ', a / |a| = ' + text(r.unit) + ', its length ' + r.unitLen.toFixed(3);
  }
  if (topic === 4) {
    const r = VB.addVectors(a, b);
    show(a, r.sum, BLUE);
    show(ZERO, r.sum, GREEN);
    return 'a + b = ' + text(r.sum);
  }
  if (topic === 5) {
    const r = VB.angleBetween(a, b);
    const p = VB.projectOnto(a, b);
    show(ZERO, p.proj, AMBER);
    show(p.proj, a, GRAY);
    return 'a . b = ' + r.d.toFixed(3) + ' = |a||b|cos(theta) = ' + r.lenA.toFixed(3) + ' x ' + r.lenB.toFixed(3)
      + ' x ' + r.cosT.toFixed(3) + ', theta = ' + (r.theta * 180 / Math.PI).toFixed(1) + ' deg';
  }
  if (topic === 6) {
    const r = VB.crossProduct(a, b);
    show(ZERO, r.c, GREEN);
    return 'a x b = ' + text(r.c) + ', square to both: ' + r.dotA.toFixed(3) + ', ' + r.dotB.toFixed(3);
  }
  if (topic === 7) {
    const t = Math.sin(time) * 2;
    const r = VB.lineFromPointDirection(a, b, t);
    show(a.clone().addScaledVector(b, -2), a.clone().addScaledVector(b, 2), GRAY);
    show(ZERO, r.x, AMBER);
    return 'X(t) = a + t b: t = ' + t.toFixed(2) + ', X = ' + text(r.x);
  }
  if (topic === 8) {
    const n = new THREE.Vector3(0, 1, 0);
    const r = VB.segmentPlane(a, b.clone().negate(), ZERO, n);
    show(a, b.clone().negate(), GRAY);
    show(ZERO, n, GREEN);
    return 'segment a to -b against the ground: ' + r.kind + ', sa = ' + r.sa.toFixed(2) + ', sb = ' + r.sb.toFixed(2)
      + ', hit ' + text(r.hit);
  }
  const t = 0.5 + 0.5 * Math.sin(time);
  const lerp = VB.lerpVector(a, b, t);
  const s = VB.slerpVector(a, b, t);
  show(ZERO, lerp.x, AMBER);
  show(ZERO, s.slerp, GREEN);
  return 't = ' + t.toFixed(2) + ': lerp ' + text(lerp.x) + ' (length ' + lerp.len.toFixed(2) + '), slerp ' + text(s.slerp);
}
// #endregion

// #region Input: which vector, and where it goes
// One vector at a time is moved, 0.1 per key press.
let movingA = true;

function onKeyDown(event) {
  const key = event.key.toLowerCase();
  const v = movingA ? a : b;
  if (key >= '1' && key <= '9') topic = Number(key);
  else if (key === 'v') movingA = !movingA;
  else if (event.key === 'ArrowRight') v.x += 0.1;
  else if (event.key === 'ArrowLeft') v.x -= 0.1;
  else if (event.key === 'ArrowUp') v.y += 0.1;
  else if (event.key === 'ArrowDown') v.y -= 0.1;
  else if (key === 'z') v.z += 0.1;
  else if (key === 'x') v.z -= 0.1;
  else if (key === 'r') { a = new THREE.Vector3(2, 1, 0); b = new THREE.Vector3(1, 2, 1); }
  else return;
  event.preventDefault();
}
// #endregion

// #region Orbit: drag to turn, scroll to zoom
// The camera sits on a sphere around the target: azimuth about y, elevation above the grid, distance.
let azimuth = 0.6, elevation = 0.4, distance = 9, dragging = false, px = 0, py = 0;

function placeCamera() {
  camera.position.set(
    target.x + distance * Math.cos(elevation) * Math.sin(azimuth),
    target.y + distance * Math.sin(elevation),
    target.z + distance * Math.cos(elevation) * Math.cos(azimuth));
  camera.lookAt(target);
}
function onPointerDown(event) {
  dragging = true;
  px = event.clientX;
  py = event.clientY;
}
function onPointerUp() {
  dragging = false;
}
function onPointerMove(event) {
  if (!dragging) return;
  azimuth -= (event.clientX - px) * 0.006;
  elevation = Math.min(1.5, Math.max(-1.5, elevation + (event.clientY - py) * 0.006));
  px = event.clientX;
  py = event.clientY;
}
function onWheel(event) {
  event.preventDefault();
  distance = Math.min(30, Math.max(2, distance * Math.exp(event.deltaY * 0.001)));
}
renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointerup', onPointerUp);
window.addEventListener('pointermove', onPointerMove);
renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
// #endregion

// #region The frame and the status line
const status = document.getElementById('status');

function frame(ms) {
  used = 0;
  const numbers = drawTopic(ms / 1000);
  hideUnused();
  status.textContent = 'topic ' + topic + ' (1-9)   moving ' + (movingA ? 'a' : 'b') + ' (V)   a = ' + text(a) + '   b = ' + text(b)
    + '   ' + numbers + '   R restarts';
  placeCamera();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('keydown', onKeyDown);
window.addEventListener('resize', onResize);
// #endregion

requestAnimationFrame(frame);
