// scene.js: a tube on two bones, skinned in three.js. riglab.js computes; this file draws the posed tube and writes a status line.
// Keys: left and right arrows turn the second bone about the tube's axis by 15 degrees (the twist), D switches between linear blend
// skinning and dual quaternion skinning, R starts again. Drag to orbit, scroll to zoom.
// The tube is one indexed BufferGeometry. Each frame the skinned positions are written into it and the normals are recomputed; the
// status line gives the twist, the method, the radius of the ring at the joint and the tube's volume against its volume at rest.
// The same scene, step for step, is RigLabScene.cs in ../unity/.
import * as THREE from '../../../vendor/three.module.js';
import * as RL from './riglab.js';

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
const target = new THREE.Vector3(1, 0, 0);               // what the camera orbits
// #endregion

// #region The tube, its weights and the state
// Two bones along x: bone A over x from 0 to 1, bone B from 1 to 2. The weights ramp from A to B over 0.6 around the joint.
const tube = RL.makeTube(2, 0.4, 33, 16);
const weights = RL.paintWeights(tube.positions, [1], 0.6).weights;
let twist = 0;                                            // degrees, bone B about its own axis
let dual = false;                                         // false: linear blend skinning, true: dual quaternions
const RING = 16 * 16;                                     // the first vertex of the ring at x = 1, the joint
// #endregion

// #region Skin the tube
// Linear blending sums the bones' skinning matrices applied to the vertex; dual quaternion skinning blends their dual quaternions.
function skin() {
  const bones = RL.twistBones(twist);
  const sm = RL.skinningMatrices(bones.binds, bones.poses);
  if (!dual) return RL.skinMesh(tube.positions, weights, sm.inverseBinds, bones.poses).posed;
  const posed = [];
  for (let i = 0; i < tube.positions.length; i++) {
    posed.push(RL.skinVertexDQ(tube.positions[i], weights[i], sm.skins).blended);
  }
  return posed;
}
// #endregion

// #region The objects
const geometry = new THREE.BufferGeometry();
const flat = new Float32Array(3 * tube.positions.length);
geometry.setAttribute('position', new THREE.BufferAttribute(flat, 3));
const index = [];
for (let t = 0; t < tube.tris.length; t++) index.push(tube.tris[t][0], tube.tris[t][1], tube.tris[t][2]);
geometry.setIndex(index);
const material = new THREE.MeshStandardMaterial({ color: 0x4a90d9, roughness: 0.6, metalness: 0, side: THREE.DoubleSide });
scene.add(new THREE.Mesh(geometry, material));

let summary = '';

function rebuild() {
  const posed = skin();
  for (let i = 0; i < posed.length; i++) {
    flat[3 * i] = posed[i][0];
    flat[3 * i + 1] = posed[i][1];
    flat[3 * i + 2] = posed[i][2];
  }
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const measure = RL.measureCollapse(tube.positions, posed, tube.tris);
  const radius = Math.sqrt(posed[RING][1] * posed[RING][1] + posed[RING][2] * posed[RING][2]);
  summary = 'twist ' + twist + ' deg   ' + (dual ? 'dual quaternion' : 'linear blend')
    + '   ring at the joint: radius ' + radius.toFixed(3) + ' (rest 0.400)'
    + '   volume ' + (100 * measure.ratio).toFixed(1) + ' % of rest';
}
// #endregion

// #region Input: twist, switch method, restart
function onKeyDown(event) {
  const key = event.key.toLowerCase();
  if (event.key === 'ArrowRight') twist = (twist + 15) % 360;
  else if (event.key === 'ArrowLeft') twist = (twist + 345) % 360;
  else if (key === 'd') dual = !dual;
  else if (key === 'r') { twist = 0; dual = false; }
  else return;
  rebuild();
  event.preventDefault();
}
// #endregion

// #region Orbit: drag to turn, scroll to zoom
// The camera sits on a sphere around the target: azimuth about y, elevation above the equator, distance.
let azimuth = 0.5, elevation = 0.35, distance = 5, dragging = false, px = 0, py = 0;

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
  status.textContent = summary + '   left/right D R';
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

rebuild();
requestAnimationFrame(frame);
