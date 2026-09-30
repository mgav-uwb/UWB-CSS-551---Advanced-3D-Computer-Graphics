// cloth: a 24 x 24 particle cloth, live, two ways (lib/core/sim-cloth.js). 'constraints' holds the
// particles together with XPBD distance constraints; 'springs' with Hooke springs under semi-implicit
// Euler. The same stiffness k means the same material in both; the difference is what happens when the
// step is too long for k: springs explode, constraints only soften. The cloth hangs from two corners
// (or drapes, unpinned) over a sphere, in a gusting wind, colored by how far each link is stretched.
// The simulation runs a fixed frame step of 1/60 s split into `substeps`, whatever the display rate.
import * as THREE from '../vendor/three.module.js';
import { SliderRow, ButtonRow, ValueTable, makeButton, makeRow } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { makeCloth } from '../core/sim-cloth.js';
import { resolveControlIds } from './registry.js';

// Order matters for tools/test-demos.mjs (it drives the FIRST range input): stiffness changes the
// readout (k, h times sqrt(k/m)) at once and the cloth within a frame.
const PARAMS = {
  stiffness: { label: 'stiffness k', min: 1.5, max: 4.5, step: 0.05, value: 3.3, format: (v) => `${Math.round(10 ** v)} N/m` },
  substeps: { label: 'substeps', min: 1, max: 64, step: 1, value: 16, format: (v) => v.toFixed(0) },
  wind: { label: 'wind', min: 0, max: 4, step: 0.1, value: 1.2, format: (v) => `${v.toFixed(1)} m/s²` },
};
const N = 24, SIZE = 1.2, MASS = 0.3, FRAME = 1 / 60;
const SPHERE = { c: [0, 0.2, 0], r: 0.3 };
const FLOOR = -0.5;

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A cloth of 576 particles (24 by 24, 0.3 kg in all), linked to its neighbors, falling under gravity
  onto a sphere in a gusting wind. Color shows stretch: blue at rest length, red at 10 % or more.</p>
  <h4>The concept</h4>
  <p>Each frame is 1/60 s, split into <code>substeps</code> steps of length h. With
  <em>springs</em>, every link pulls with force k times its stretch, and the step is stable only while
  h times the square root of k/m stays small (the readout shows it); past that the cloth explodes.
  With <em>constraints</em> (XPBD), each step moves the particles back toward the link lengths directly,
  so it cannot explode; too few substeps only make it rubbery.</p>
  <h4>Try this</h4>
  <p>On springs, raise <code>stiffness</code> until it explodes, then press reset and raise
  <code>substeps</code>. Switch to constraints and drop substeps to 1: the cloth stretches like rubber
  but stays in one piece. Drag to orbit; scroll to zoom.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const lerp = (a, b, t) => a + (b - a) * t;

export function make(container, { stage = 'embed', controls } = {}) {
  const model = { stiffness: PARAMS.stiffness.value, substeps: PARAMS.substeps.value, wind: PARAMS.wind.value, method: 'constraints', pin: 'corners' };

  const shell = makeShell(container, {
    stage,
    help: { html: HELP_HTML },
    legend: 'drag orbit · scroll zoom',
    nav: 'orbit',
  });
  const sc = makeScene(shell.sceneEl, { fill: true });
  const { scene, render } = sc;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x303848, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(2, 4, 3);
  scene.add(key);

  const ball = new THREE.Mesh(new THREE.SphereGeometry(SPHERE.r, 48, 32), new THREE.MeshStandardMaterial({ color: 0x6094d2, roughness: 0.5 }));
  ball.position.set(...SPHERE.c);
  scene.add(ball);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({ color: 0x222838, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR - 0.001;
  scene.add(floor);
  if (sc.grid) sc.grid.position.y = FLOOR;

  let cloth, geom, mesh, colors, frames = 0, stepMs = 0;
  function build() {
    cloth = makeCloth({ n: N, size: SIZE, y0: 0.9, mass: MASS, pin: model.pin });
    if (mesh) { scene.remove(mesh); geom.dispose(); }
    geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * N * N), 3));
    colors = new Float32Array(3 * N * N);
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geom.setIndex(cloth.tris);
    mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.8 }));
    scene.add(mesh);
    frames = 0;
    syncMesh();
  }

  // per-vertex stretch: the largest relative stretch of the structural links at that vertex
  const vStretch = new Float32Array(N * N);
  function syncMesh() {
    const { sys } = cloth, pos = geom.attributes.position.array;
    for (let i = 0; i < 3 * N * N; i++) pos[i] = sys.x[i];
    vStretch.fill(0);
    for (const L of sys.links) {
      if (L.kind !== 'structural') continue;
      const { i, j } = L;
      const len = Math.hypot(sys.x[3 * j] - sys.x[3 * i], sys.x[3 * j + 1] - sys.x[3 * i + 1], sys.x[3 * j + 2] - sys.x[3 * i + 2]);
      const s = len / L.rest - 1;
      vStretch[i] = Math.max(vStretch[i], s); vStretch[j] = Math.max(vStretch[j], s);
    }
    for (let i = 0; i < N * N; i++) {
      const t = Math.min(1, Math.max(0, vStretch[i] / 0.1));
      colors[3 * i] = lerp(0.18, 0.95, t); colors[3 * i + 1] = lerp(0.5, 0.25, t); colors[3 * i + 2] = lerp(0.85, 0.2, t);
    }
    geom.attributes.position.needsUpdate = true;
    geom.attributes.color.needsUpdate = true;
    geom.computeVertexNormals();
    geom.computeBoundingSphere();
  }

  // a gusting wind along +x with a slow swirl, the same for every particle at a given time
  const wind = (t) => {
    const g = model.wind * (0.6 + 0.4 * Math.sin(1.7 * t) * Math.sin(0.63 * t + 1));
    return [g, 0, 0.35 * model.wind * Math.sin(0.9 * t)];
  };

  function stepOnce() {
    if (cloth.sys.exploded) return;
    const t0 = performance.now();
    cloth.sys.step(FRAME, {
      method: model.method, k: 10 ** model.stiffness, substeps: model.substeps,
      wind, sphere: SPHERE, floorY: FLOOR, damping: 0.4,
    });
    stepMs = lerp(stepMs, performance.now() - t0, 0.2);
    frames++;
    syncMesh();
  }

  // ---- rail ----
  const controlsCard = shell.addCard('controller: the material and the step');
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'cloth');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `cloth-${id}`, ...PARAMS[id] });
    sliders[id].onInput((v) => { model[id] = v; updateReadout(); if (!running) { stepOnce(); render(); } });
  }
  const methodRow = new ButtonRow(controlsCard, {
    id: 'cloth-method', label: 'links',
    options: [{ value: 'constraints', label: 'constraints' }, { value: 'springs', label: 'springs' }],
    value: model.method,
  });
  methodRow.onChange((v) => { model.method = v; build(); updateReadout(); render(); });
  if (stage === 'full') {
    const pinRow = new ButtonRow(controlsCard, {
      id: 'cloth-pin', label: 'pins',
      options: [{ value: 'corners', label: 'two corners' }, { value: 'none', label: 'none (drape)' }],
      value: model.pin,
    });
    pinRow.onChange((v) => { model.pin = v; build(); updateReadout(); render(); });
  }
  const row = makeRow(controlsCard);
  makeButton(row, 'reset', () => { build(); updateReadout(); render(); });

  const readoutCard = shell.addCard('readout: this frame');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'method', label: 'links', format: (v) => v },
      { id: 'h', label: 'step h', format: (v) => `${(1000 * v).toFixed(2)} ms` },
      { id: 'hw', label: 'h·√(k/m)', format: (v) => v.toFixed(2) },
      { id: 'stretch', label: 'max stretch', format: (v) => (Number.isFinite(v) ? `${(100 * v).toFixed(1)} %` : '–') },
      { id: 'ke', label: 'kinetic energy', format: (v) => (Number.isFinite(v) ? `${(1000 * v).toFixed(1)} mJ` : '–') },
      { id: 'cost', label: 'step time', format: (v) => `${v.toFixed(2)} ms` },
      { id: 'state', label: 'state', format: (v) => v },
    ],
  });
  const note = document.createElement('p');
  note.className = 'demo-hint';
  note.textContent = 'm = 0.3 kg / 576 particles; springs stay stable only while h·√(k/m) is small';
  readoutCard.appendChild(note);

  function updateReadout() {
    const { sys } = cloth;
    const m = MASS / (N * N), h = FRAME / model.substeps;
    table.update('method', model.method);
    table.update('h', h);
    table.update('hw', h * Math.sqrt(10 ** model.stiffness / m));
    table.update('stretch', sys.exploded ? NaN : sys.maxStretch());
    table.update('ke', sys.exploded ? NaN : sys.kineticEnergy());
    table.update('cost', stepMs);
    table.update('state', sys.exploded ? 'exploded: press reset' : `running, ${(frames * FRAME).toFixed(1)} s`);
  }

  // ---- the loop: runs only while visible ----
  let running = false, raf = 0, visible = stage === 'full';
  function tick() {
    if (!running) return;
    stepOnce();
    updateReadout();
    render();
    raf = requestAnimationFrame(tick);
  }
  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) raf = requestAnimationFrame(tick); else cancelAnimationFrame(raf);
  }
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => {
      for (const e of entries) { visible = e.isIntersecting; setRunning(visible && document.visibilityState !== 'hidden'); }
    }).observe(shell.sceneEl);
  }
  document.addEventListener('visibilitychange', () => setRunning(visible && document.visibilityState !== 'hidden'));

  const cam = makeOrbitCamera({
    camera: sc.camera, render, home: { eye: [1.6, 1.3, 2.4], target: [0, 0.15, 0] },
    sceneEl: shell.sceneEl, container, stage, settings: { orbitSpeed: 0.4, zoomSpeed: 0.12, moveSpeed: 3, rollRate: 60 },
  });
  shell.setNavController(cam);

  build();
  for (let f = 0; f < 20; f++) stepOnce();   // the first frame shown is already falling
  updateReadout();
  render();
  setRunning(visible);
  return { model, sliders, cam, input: cam };
}
