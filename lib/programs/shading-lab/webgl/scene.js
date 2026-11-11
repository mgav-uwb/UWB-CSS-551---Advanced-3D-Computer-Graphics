// scene.js: a disk and a sphere under one light, in three.js. shading.js computes every pixel of both pictures; this file puts
// each picture on a square in front of an orthographic camera. Keys: left and right arrows swing the light, up and down raise
// and lower it, S toggles the shading between frozen and lit, T steps through the textures.
// The same scene, step for step, is ShadingLabScene.cs in ../unity/.
import * as THREE from '../../../vendor/three.module.js';
import * as SL from './shading.js';

// #region Renderer, scene, camera
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10);
const camera = new THREE.OrthographicCamera(-2.4, 2.4, 1.3, -1.3, 0.1, 10);
camera.position.set(0, 0, 5);
// #endregion

// #region The model: one light, two shapes, one texture
const SIZE = 256;
const TEXTURES = ['plain', 'checker', 'planet'];
let az = 40;
let el = 35;
let amount = 0;
let texture = 2;
const KA = 0.1;
// #endregion

// #region Two squares, each showing one picture
function makeSquare(x) {
  const data = new Uint8Array(SIZE * SIZE * 4);
  const map = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  map.colorSpace = THREE.SRGBColorSpace;
  map.flipY = true;
  const square = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: map }));
  square.position.set(x, 0, 0);
  scene.add(square);
  return { data: data, map: map };
}
const disk = makeSquare(-1.15);
const sphere = makeSquare(1.15);

function fill(square, codes) {
  for (let i = 0; i < SIZE * SIZE; i++) {
    square.data[4 * i] = codes[3 * i];
    square.data[4 * i + 1] = codes[3 * i + 1];
    square.data[4 * i + 2] = codes[3 * i + 2];
    square.data[4 * i + 3] = 255;
  }
  square.map.needsUpdate = true;
}
// #endregion

// #region Input
function refresh() {
  const L = SL.lightFromAngles(az, el);
  const a = SL.renderPicture('disk', L, KA, amount, 0, TEXTURES[texture], SIZE);
  const b = SL.renderPicture('sphere', L, KA, amount, 0, TEXTURES[texture], SIZE);
  fill(disk, a);
  fill(sphere, b);
  const row = SL.middleRow(L, KA, amount, 81);
  document.getElementById('status').textContent = 'light az ' + az + ' el ' + el + '   shading ' + amount + '   ' + TEXTURES[texture]
    + '   middle row: disk ' + row.disk[0].toFixed(2) + ', sphere ' + row.sphereLow.toFixed(2) + ' to ' + row.sphereHigh.toFixed(2)
    + '   pixels that differ ' + SL.countDifferent(a, b).count;
}

function onKey(e) {
  if (e.key === 'ArrowLeft') az -= 10;
  else if (e.key === 'ArrowRight') az += 10;
  else if (e.key === 'ArrowUp') el = Math.min(90, el + 10);
  else if (e.key === 'ArrowDown') el = Math.max(-90, el - 10);
  else if (e.key === 's' || e.key === 'S') amount = amount === 0 ? 1 : 0;
  else if (e.key === 't' || e.key === 'T') texture = (texture + 1) % TEXTURES.length;
  else return;
  refresh();
}
window.addEventListener('keydown', onKey);

function onResize() {
  const aspect = window.innerWidth / window.innerHeight;
  const half = Math.max(1.3, 2.4 / aspect);
  camera.left = -half * aspect;
  camera.right = half * aspect;
  camera.top = half;
  camera.bottom = -half;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onResize);
// #endregion

// #region Draw
function frame() {
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
onResize();
refresh();
frame();
// #endregion
