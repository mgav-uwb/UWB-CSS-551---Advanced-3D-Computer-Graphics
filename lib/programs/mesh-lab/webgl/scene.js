// scene.js: an icosahedron as two arrays, in three.js. meshlab.js computes; this file draws one mesh and one highlighted
// triangle, and writes a status line. Keys: left and right arrows pick the selected triangle, F reverses its winding,
// C cycles the culling (off, back, front), S subdivides onto the sphere (up to level 3), R starts again. Drag to orbit,
// scroll to zoom.
// The mesh is drawn with one BufferGeometry: three corners per triangle (a corner is not shared, so each triangle takes
// its own flat normal), and material.side picks which faces are drawn: DoubleSide is culling off, FrontSide culls the
// back faces (three.js and OpenGL keep counter-clockwise triangles as front), BackSide culls the front faces.
// The same scene, step for step, is MeshLabScene.cs in ../unity/.
import * as THREE from '../../../vendor/three.module.js';
import * as ML from './meshlab.js';

// #region Renderer, scene, camera
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10);
scene.add(new THREE.AmbientLight(0xffffff, 0.45));
const light = new THREE.DirectionalLight(0xffffff, 2.2);
light.position.set(2, 4, 3);
scene.add(light);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 100);
const target = new THREE.Vector3(0, 0, 0);               // what the camera orbits
// #endregion

// #region The mesh: two arrays, and one selected triangle
// positions and tris come from meshlab.js and are replaced, never edited: reverseTriangle and subdivide return new arrays.
let positions;
let tris;
let level;
let selected;
let culling;                                              // 0 off, 1 back, 2 front
const CULL_NAMES = ['off', 'back', 'front'];
const CULL_SIDES = [THREE.DoubleSide, THREE.FrontSide, THREE.BackSide];

function restart() {
  const ico = ML.icosahedron();
  positions = ico.positions;
  tris = ico.tris;
  level = 0;
  selected = 0;
  culling = 1;
}

// Three corners per triangle, each with the triangle's own unit normal.
function buildGeometry(list) {
  const flat = new Float32Array(9 * list.length);
  const normals = new Float32Array(9 * list.length);
  for (let t = 0; t < list.length; t++) {
    const a = positions[list[t][0]];
    const b = positions[list[t][1]];
    const c = positions[list[t][2]];
    const n = ML.faceNormal(a, b, c).nHat;
    const corners = [a, b, c];
    for (let k = 0; k < 3; k++) {
      flat.set(corners[k], 9 * t + 3 * k);
      normals.set(n, 9 * t + 3 * k);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(flat, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return geometry;
}
// #endregion

// #region The objects
// The solid mesh and the selected triangle. The selected triangle uses the same culling, so a triangle that is culled
// disappears from both. Its polygon offset pulls it in front of the surface it lies on.
const solidMaterial = new THREE.MeshStandardMaterial({ color: 0x4a90d9, roughness: 0.6, metalness: 0, side: THREE.FrontSide });
const solid = new THREE.Mesh(new THREE.BufferGeometry(), solidMaterial);
scene.add(solid);

const pickMaterial = new THREE.MeshStandardMaterial({ color: 0xffa657, roughness: 0.5, metalness: 0, side: THREE.FrontSide,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
const pick = new THREE.Mesh(new THREE.BufferGeometry(), pickMaterial);
scene.add(pick);

let summary = '';

function rebuild() {
  solid.geometry.dispose();
  pick.geometry.dispose();
  solid.geometry = buildGeometry(tris);
  pick.geometry = buildGeometry([tris[selected]]);
  solidMaterial.side = CULL_SIDES[culling];
  pickMaterial.side = CULL_SIDES[culling];

  const euler = ML.eulerCheck(positions.length, tris);
  const tri = tris[selected];
  const normal = ML.faceNormal(positions[tri[0]], positions[tri[1]], positions[tri[2]]).nHat;
  const winding = ML.windingCheck(tris);
  summary = 'V ' + euler.V + '  E ' + euler.E + '  F ' + euler.F + '  chi ' + euler.chi
    + '   triangle ' + selected + ' = (' + tri.join(', ') + '), normal ' + text(normal)
    + '   winding ' + (winding.consistent ? 'consistent' : 'inconsistent, ' + winding.count + ' bad edges')
    + '   culling ' + CULL_NAMES[culling] + '   level ' + level;
}

function text(v) {
  return '(' + v[0].toFixed(3) + ', ' + v[1].toFixed(3) + ', ' + v[2].toFixed(3) + ')';
}
// #endregion

// #region Input: select, reverse, cull, subdivide
function onKeyDown(event) {
  const key = event.key.toLowerCase();
  if (event.key === 'ArrowRight') selected = (selected + 1) % tris.length;
  else if (event.key === 'ArrowLeft') selected = (selected + tris.length - 1) % tris.length;
  else if (key === 'f') tris = ML.reverseTriangle(tris, selected).tris;
  else if (key === 'c') culling = (culling + 1) % 3;
  else if (key === 's') {
    if (level >= 3) return;
    const finer = ML.subdivide(positions, tris, ML.length(positions[0]));      // onto the sphere the corners lie on
    positions = finer.positions;
    tris = finer.tris;
    level += 1;
    selected = 4 * selected;                              // the first of the four triangles made from the old one
  } else if (key === 'r') restart();
  else return;
  rebuild();
  event.preventDefault();
}
// #endregion

// #region Orbit: drag to turn, scroll to zoom
// The camera sits on a sphere around the target: azimuth about y, elevation above the equator, distance.
let azimuth = 0.6, elevation = 0.4, distance = 7, dragging = false, px = 0, py = 0;

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

function frame() {
  status.textContent = summary + '   left/right F C S R';
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

restart();
rebuild();
requestAnimationFrame(frame);
