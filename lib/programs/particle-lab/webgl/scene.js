// scene.js: one spring, stepped four ways, in three.js. particle.js computes every step; this file draws five masses on five
// springs (the exact motion on top, then explicit Euler, semi-implicit Euler, Verlet and implicit Euler) and a status line.
// Keys: space or right arrow takes one step, P plays and pauses, R starts again, up and down arrows change the step h by 0.01.
// A mass is drawn at most 3 m from its rest position, so an integrator that blows up leaves the picture and the status line
// keeps the number. The same scene, step for step, is ParticleLabScene.cs in ../unity/.
import * as THREE from '../../../vendor/three.module.js';
import * as PL from './particle.js';

// #region Renderer, scene, camera
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10);
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(-4.2 * aspect / 1.6, 4.2 * aspect / 1.6, 2.6, -2.6, 0.1, 20);
camera.position.set(0, 0, 8);
// #endregion

// #region The model: one spring, five tracks
// k = 100 N/m and m = 1 kg as on the lecture's slide, released from x = 1 m. Track 0 is the exact motion; tracks 1 to 4 are the
// integrators, each a run of springStep or verletStep from the same start.
const KINDS = ['exact', 'explicit', 'semi', 'verlet', 'implicit'];
const COLORS = [0xaab2c5, 0xff7b72, 0x7ee787, 0x56d4dd, 0xd2a8ff];
const K = 100;
const M = 1;
const C = 0;
let h = 0.1;
let taken = 0;
let playing = false;
// #endregion

// #region Five masses on five springs
const WALL = -3;
const masses = [];
const coils = [];
for (let i = 0; i < KINDS.length; i++) {
  const y = 1.9 - i * 0.95;
  const mass = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), new THREE.MeshBasicMaterial({ color: COLORS[i] }));
  mass.position.y = y;
  scene.add(mass);
  masses.push(mass);
  const coil = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: COLORS[i] }));
  scene.add(coil);
  coils.push(coil);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), new THREE.MeshBasicMaterial({ color: 0x5c667c }));
  wall.position.set(WALL, y, 0);
  scene.add(wall);
}

// a zigzag from the wall to the mass, twelve turns wide
function coilPoints(y, x) {
  const points = [new THREE.Vector3(WALL, y, 0)];
  const left = WALL + 0.3;
  const right = x - 0.3;
  for (let i = 0; i < 12; i++) {
    points.push(new THREE.Vector3(left + (right - left) * (i + 0.5) / 12, y + (i % 2 === 0 ? 0.14 : -0.14), 0));
  }
  points.push(new THREE.Vector3(x - 0.2, y, 0));
  return points;
}
// #endregion

// #region Stepping
// Each refresh reruns every integrator from the start for `taken` steps, so the picture is always the program's own run.
function refresh() {
  let line = 'h = ' + h.toFixed(2) + ' s, step ' + taken + ', t = ' + (taken * h).toFixed(2) + ' s';
  for (let i = 0; i < KINDS.length; i++) {
    let x = 0;
    let energy = 50;
    if (i === 0) {
      x = PL.exactSpring(K, M, C, 1, 0, taken * h).x;
    } else {
      const run = PL.runSpring(KINDS[i], K, M, C, h, 1, 0, taken);
      x = run.xs[taken];
      energy = run.energies[taken];
      line += '   ' + KINDS[i] + ' x ' + x.toPrecision(3) + ' E ' + energy.toPrecision(3);
    }
    const shown = Math.max(-3, Math.min(3, x));
    masses[i].position.x = shown * 0.9 + 0.3;
    coils[i].geometry.setFromPoints(coilPoints(masses[i].position.y, masses[i].position.x));
  }
  document.getElementById('status').textContent = line;
  renderer.render(scene, camera);
}
// #endregion

// #region Input and the loop
function onKey(e) {
  if (e.key === ' ' || e.key === 'ArrowRight') taken++;
  else if (e.key === 'p' || e.key === 'P') playing = !playing;
  else if (e.key === 'r' || e.key === 'R') taken = 0;
  else if (e.key === 'ArrowUp') h = Math.min(0.3, Math.round((h + 0.01) * 100) / 100);
  else if (e.key === 'ArrowDown') h = Math.max(0.01, Math.round((h - 0.01) * 100) / 100);
  else return;
  e.preventDefault();
  refresh();
}
window.addEventListener('keydown', onKey);

function onTimer() {
  if (!playing) return;
  taken++;
  refresh();
}
setInterval(onTimer, 250);
refresh();
// #endregion
