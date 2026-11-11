// scene.js: the illumination chapter's marked point on a sphere, in three.js. lightlab.js computes; this file colors each vertex of
// a sphere with the program's shadeSurface and draws the vectors N, L, V and R at the marked point. Keys: left and right arrows swing
// the light around the sphere, up and down change the shininess, M switches Phong and Blinn, N switches the normalized lobe.
// The same scene, step for step, is LightLabScene.cs in ../unity/.
import * as THREE from '../../../vendor/three.module.js';
import * as LL from './lightlab.js';

// #region Renderer, scene, camera
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10);
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 100);
camera.position.set(3.2, 3, 5.2);
camera.lookAt(0, 0, 0);
// #endregion

// #region The model: one light, one eye, one material
const RADIUS = 1.2;
const EYE = [3, 3, 6];
const KD = [0.86, 0.36, 0.3];
const KS = [0.5, 0.5, 0.5];
let azimuth = 45;                    // degrees, the light's orbit of radius 3
let shininess = 30;
let model = 'phong';
let normalized = false;
const MARKED = LL.normalize([1, 1, 1]);

function lightPosition() {
  const a = (azimuth * Math.PI) / 180;
  const e = Math.PI / 6;
  return LL.scale([Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)], 3);
}
// #endregion

// #region The sphere: one color per vertex
const geometry = new THREE.SphereGeometry(RADIUS, 96, 64);
geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geometry.attributes.position.count * 3), 3));
const sphere = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ vertexColors: true }));
scene.add(sphere);

function colorSphere() {
  const pos = geometry.attributes.position;
  const col = geometry.attributes.color;
  const light = lightPosition();
  for (let i = 0; i < pos.count; i++) {
    const p = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const lit = LL.shadeSurface(p, LL.normalize(p), EYE, [light], [[1, 1, 1]], [1, 1, 1], 0.12, KD, KS, shininess, model, normalized);
    col.setXYZ(i, Math.min(1, lit.color[0]), Math.min(1, lit.color[1]), Math.min(1, lit.color[2]));
  }
  col.needsUpdate = true;
}
// #endregion

// #region The vectors at the marked point
const arrows = {};
function makeArrow(color) {
  const a = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, color, 0.2, 0.1);
  scene.add(a);
  return a;
}
for (const [name, color] of [['N', 0x7ee787], ['L', 0xffa657], ['V', 0x56d4dd], ['R', 0xff79c6], ['H', 0xd2a8ff]]) arrows[name] = makeArrow(color);
let summary = '';

function placeVectors() {
  const p = LL.scale(MARKED, RADIUS);
  const light = lightPosition();
  const lit = LL.shadeSurface(p, MARKED, EYE, [light], [[1, 1, 1]], [1, 1, 1], 0.12, KD, KS, shininess, model, normalized);
  const L = LL.lightVector('point', p, light, [0, 0, 0]).L;
  const R = LL.mirrorDirection(MARKED, L).R;
  const H = LL.blinn(MARKED, L, lit.V, shininess, KS, [1, 1, 1], normalized).H;
  const vectors = { N: MARKED, L, V: lit.V, R, H };
  for (const name of Object.keys(arrows)) {
    arrows[name].position.set(p[0], p[1], p[2]);
    arrows[name].setDirection(new THREE.Vector3(...vectors[name]));
    arrows[name].visible = name !== (model === 'blinn' ? 'R' : 'H');
  }
  summary = 'N.L ' + lit.nDotLs[0].toFixed(3) + '   ' + (model === 'blinn' ? 'H.N ' : 'R.V ') + lit.cosines[0].toFixed(3)
    + '   color (' + lit.color.map(function (x) { return x.toFixed(3); }).join(', ') + ')   s ' + shininess + '   ' + model
    + (normalized ? ' normalized' : '');
}
// #endregion

// #region Input
function refresh() {
  colorSphere();
  placeVectors();
}
function onKeyDown(event) {
  const key = event.key.toLowerCase();
  if (event.key === 'ArrowLeft') azimuth -= 5;
  else if (event.key === 'ArrowRight') azimuth += 5;
  else if (event.key === 'ArrowUp') shininess = Math.min(128, shininess + 2);
  else if (event.key === 'ArrowDown') shininess = Math.max(1, shininess - 2);
  else if (key === 'm') model = model === 'phong' ? 'blinn' : 'phong';
  else if (key === 'n') normalized = !normalized;
  else return;
  refresh();
  event.preventDefault();
}
window.addEventListener('keydown', onKeyDown);
// #endregion

// #region The frame and the status line
const status = document.getElementById('status');
function frame() {
  status.textContent = summary + '   left/right up/down M N';
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

refresh();
requestAnimationFrame(frame);
