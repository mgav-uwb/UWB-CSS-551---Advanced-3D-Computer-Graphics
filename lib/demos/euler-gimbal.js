// euler-gimbal: three Euler angles drawn as three nested gimbals. Each ring is hinged on two pins
// that lie on its own axis, and turns everything inside it; the airplane in the middle shows the
// result. The hierarchy's world matrix is the Euler product (outer * middle * inner), built only
// from rot-reps.js (axisRot, EULER_ORDERS, eulerMatrix, gimbalAxes): no new rotation math here.
// When the middle ring turns 90 degrees the inner ring's axis lies on the outer ring's axis: the
// "wiggle" buttons then move the airplane the same way, which is gimbal lock.
//
// Render-on-demand: update() renders after every change; the wiggle animation has its own rAF loop
// that stops when done.
import * as THREE from '../vendor/three.module.js';
import { SliderRow, ButtonRow, ValueTable, makeButton, makeRow } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';
import { EULER_ORDERS, eulerMatrix, gimbalAxes, axisRot, column } from '../core/rot-reps.js';

const AXIS_COLOR = { x: 0xff5555, y: 0x55dd77, z: 0x5588ff };
const AXIS_CSS = { x: '#ff6b6b', y: '#5be07f', z: '#6c9cff' };
// vehicle names of the three axes: y-up engines (Unity, three.js) against aerospace (x forward, z down)
const NAMES_BY_ORDER = {
  unity: { x: 'pitch', y: 'yaw', z: 'roll' },
  three: { x: 'pitch', y: 'yaw', z: 'roll' },
  aero: { x: 'roll', y: 'pitch', z: 'yaw' },
};
const RING_R = [1.9, 1.6, 1.3]; // outer, middle, inner
const LINE_HALF = 2.5; // half length of each axis line
const LOCK_DEG = 2; // inner/outer axis angle under which we call it locked
const WIGGLE_DEG = 25;
const WIGGLE_MS = 1500;

const PARAMS = {
  x: { label: 'x (pitch)', min: -180, max: 180, step: 1, value: 20, format: (v) => `${v.toFixed(0)}°` },
  y: { label: 'y (yaw)', min: -180, max: 180, step: 1, value: 45, format: (v) => `${v.toFixed(0)}°` },
  z: { label: 'z (roll)', min: -180, max: 180, step: 1, value: 10, format: (v) => `${v.toFixed(0)}°` },
};
const TOKENS = ['order', 'wiggle'];

const ORDER_BUTTONS = [
  { value: 'unity', label: 'Unity' },
  { value: 'three', label: 'three.js' },
  { value: 'aero', label: 'aero' },
];

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Three nested rings with an airplane in the middle. Each ring is a <b>gimbal</b>: a ring on two
  pivot pins that lets it turn about one axis (the long colored line through its pins). Red is x,
  green is y, blue is z. The outer ring is hinged to the ground, the middle ring is hinged inside
  the outer one, the inner ring inside the middle one, and the airplane is fixed to the inner ring.
  Nose = +z (forward), wings along x, fin = +y (up).</p>
  <h4>The idea</h4>
  <p><b>Euler angles</b> are three angles, one per ring. A ring turns everything inside it, so the
  outer ring carries the other two axes with it. Reading from outside in, each turn is about an axis
  that earlier turns already moved: this is <b>intrinsic</b> composition (each turn about the body's
  own, already-turned axis). The same product read in reverse order is <b>extrinsic</b> (each turn
  about a fixed world axis, innermost applied first): same rotation, two ways to narrate it.</p>
  <p>Which axis goes on which ring is a convention. <b>Unity</b>: outer y, middle x, inner z
  (matrix R<sub>y</sub> R<sub>x</sub> R<sub>z</sub>). <b>three.js</b>: outer x, middle y, inner z
  (R<sub>x</sub> R<sub>y</sub> R<sub>z</sub>). <b>aero</b>: outer z, middle y, inner x
  (R<sub>z</sub> R<sub>y</sub> R<sub>x</sub>). The same three numbers give different poses under
  different orders.</p>
  <p><b>Gimbal lock</b>: when the middle ring turns 90°, the inner ring's axis lies on the outer
  ring's axis. Two of the three angles now spin the airplane about the same axis, so one degree of
  freedom is gone. The readout "angle inner to outer" is 0° there.</p>
  <h4>Try this</h4>
  <p>1. Start at (x, y, z) = (20, 45, 10), Unity order. Press <i>wiggle outer</i>, then
  <i>wiggle inner</i>: the airplane swings about two different axes.</p>
  <p>2. Drag x to 30 and repeat: still different. Now drag x to 90: the red "LOCKED" badge appears,
  the outer (green) and inner (blue) axis lines lie on top of each other, "angle inner to outer"
  reads 0, and both wiggles turn the airplane the same way. You cannot tell them apart.</p>
  <p>3. Switch to <i>three.js</i> and drag x back to 20: no lock. The middle ring is now y, so the
  lock is at y = 90. Try it.</p>
  <p>4. At (20, 45, 10) compare "x lands at" across the three orders: Unity (0.738, 0.163, -0.654),
  three.js (0.696, 0.401, -0.595), aero (0.696, 0.123, -0.707). Same numbers, three poses.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmtVec = (v) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);

// small canvas-texture label sprite
function makeLabel(text, cssColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 80;
  const g = canvas.getContext('2d');
  g.font = 'bold 40px system-ui, -apple-system, Segoe UI, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(10,12,18,0.95)';
  g.strokeText(text, 256, 42);
  g.fillStyle = cssColor;
  g.fillText(text, 256, 42);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(2.2, 0.344, 1);
  sprite.renderOrder = 10;
  return sprite;
}

// rotation that sends local +z (a torus's normal) onto the world axis `name`
const NORMAL_TO = { x: axisRot('y', 90), y: axisRot('x', 90), z: axisRot('z', 0) };

function buildPlane() {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 });
  const add = (w, h, d, c, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
    m.position.set(x, y, z);
    g.add(m);
  };
  add(0.22, 0.22, 1.2, 0xdde2ea, 0, 0, 0); // fuselage along z
  add(0.24, 0.24, 0.2, 0xffffff, 0, 0, 0.66); // nose block (+z, forward)
  add(1.5, 0.05, 0.34, 0xffb347, 0, 0, 0.08); // wings along x
  add(0.05, 0.36, 0.26, 0xe879f9, 0, 0.26, -0.5); // vertical fin up +y
  add(0.5, 0.04, 0.18, 0xffb347, 0, 0.04, -0.54); // tailplane
  return g;
}

export function make(container, { stage = 'embed', controls } = {}) {
  const model = { x: PARAMS.x.value, y: PARAMS.y.value, z: PARAMS.z.value, order: 'unity' };
  const nav = { orbitSpeed: 0.4, zoomSpeed: 0.12, moveSpeed: 3, rollRate: 60 };
  const disp = { grid: true, axes: true };
  let grid, axes, render;

  const settingsFields = [
    { label: 'orbit', decimals: 2, title: 'Orbit sensitivity, deg per pixel of drag, default 0.4',
      getCurrent: () => nav.orbitSpeed, apply: (v) => { nav.orbitSpeed = clamp(v, 0.02, 2); } },
    { label: 'zoom', decimals: 2, title: 'Zoom step, fraction of distance per wheel notch, default 0.12',
      getCurrent: () => nav.zoomSpeed, apply: (v) => { nav.zoomSpeed = clamp(v, 0.02, 0.5); } },
    { label: 'move', decimals: 1, title: 'WASD move speed, units/sec, default 3',
      getCurrent: () => nav.moveSpeed, apply: (v) => { nav.moveSpeed = clamp(v, 0.1, 20); } },
    { label: 'roll', decimals: 0, title: 'Q/E roll rate, deg/sec while held, default 60',
      getCurrent: () => nav.rollRate, apply: (v) => { nav.rollRate = clamp(v, 10, 180); } },
    { label: 'grid', toggle: true, title: 'Show the ground grid',
      getCurrent: () => disp.grid, apply: (v) => { disp.grid = v; if (grid) grid.visible = v; render?.(); } },
    { label: 'axes', toggle: true, title: 'Show the world axes',
      getCurrent: () => disp.axes, apply: (v) => { disp.axes = v; if (axes) axes.visible = v; render?.(); } },
  ];

  const shell = makeShell(container, {
    stage,
    help: { html: HELP_HTML },
    settings: settingsFields,
    legend: 'drag to turn · scroll zoom · WASD move · ↑/↓ up·down · Q/E roll · H home',
    nav: 'orbit',
  });
  const sc = makeScene(shell.sceneEl, { fill: true });
  const { scene } = sc;
  ({ grid, axes, render } = sc);

  // ---- controls -------------------------------------------------------------------------------
  const list = stage === 'full' ? [...Object.keys(PARAMS), ...TOKENS] : (controls?.length ? controls : [...Object.keys(PARAMS), ...TOKENS]);
  const ids = resolveControlIds(PARAMS, list.filter((c) => !TOKENS.includes(c)), 'euler-gimbal');
  const wantOrder = list.includes('order');
  const wantWiggle = list.includes('wiggle');

  const ctrlCard = shell.addCard('Euler angles');
  let orderRow = null;
  if (wantOrder) {
    orderRow = new ButtonRow(ctrlCard, { id: 'euler-gimbal-order', label: 'order', options: ORDER_BUTTONS, value: model.order });
  }
  const sliders = {};
  for (const id of ids) sliders[id] = new SliderRow(ctrlCard, { id: `euler-gimbal-${id}`, ...PARAMS[id] });
  let wiggleBtns = null;
  if (wantWiggle) {
    const row = makeRow(ctrlCard);
    wiggleBtns = {
      outer: makeButton(row, 'wiggle outer', () => wiggle('outer')),
      inner: makeButton(row, 'wiggle inner', () => wiggle('inner')),
    };
  }

  const readCard = shell.addCard('Gimbal axes');
  const table = new ValueTable(readCard, {
    rows: [
      { id: 'inner', label: 'inner axis', cols: 3, className: 'row-w', format: fmtVec },
      { id: 'outer', label: 'outer axis', cols: 3, className: 'row-u', format: fmtVec },
      { id: 'ang', label: 'inner to outer', cols: 1, className: 'row-h', format: (v) => `${v.toFixed(1)}°` },
      { id: 'land', label: 'x lands at', cols: 3, className: 'row-v', format: fmtVec },
    ],
  });
  // the rail is narrow: tighten the table so a 3-number row never wraps
  table.table.style.fontSize = '11px';
  table.table.querySelectorAll('td').forEach((td) => { td.style.padding = '2px 3px'; td.style.whiteSpace = 'nowrap'; });
  const statusEl = document.createElement('p');
  statusEl.className = 'demo-hint';
  statusEl.style.fontSize = '12px';
  statusEl.style.margin = '6px 0 0';
  readCard.appendChild(statusEl);

  // LOCKED badge over the scene
  const badge = document.createElement('div');
  badge.textContent = 'LOCKED: inner axis lies on outer axis';
  Object.assign(badge.style, {
    position: 'absolute', left: '14px', top: '46px', padding: '5px 12px',
    background: '#c0262d', color: '#fff', font: 'bold 14px system-ui, sans-serif', borderRadius: '4px',
    border: '1px solid #ff9a9a', pointerEvents: 'none', display: 'none', zIndex: '5', whiteSpace: 'nowrap',
  });
  if (getComputedStyle(shell.sceneEl).position === 'static') shell.sceneEl.style.position = 'relative';
  shell.sceneEl.appendChild(badge);

  // ---- scene: rebuilt when the order changes ----------------------------------------------------
  let root = null;
  let rings = []; // { group, name, axisLine, label }
  let plane = null;
  const baseR = 0.012;

  function disposeRoot() {
    if (!root) return;
    scene.remove(root);
    root.traverse((o) => {
      o.geometry?.dispose();
      if (o.material) { o.material.map?.dispose(); o.material.dispose(); }
    });
    root = null;
  }

  function cylBetween(name, from, to, radius, color) {
    const len = Math.abs(to - from);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 12), new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.3 }));
    // cylinder runs along local y; rotate onto axis `name`
    const u = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[name];
    const mid = (from + to) / 2;
    m.position.set(u[0] * mid, u[1] * mid, u[2] * mid);
    if (name === 'x') m.rotation.z = Math.PI / 2;
    if (name === 'z') m.rotation.x = Math.PI / 2;
    return m;
  }

  function build() {
    disposeRoot();
    root = new THREE.Group();
    scene.add(root);
    rings = [];
    const nest = EULER_ORDERS[model.order].nest;
    const roleName = ['outer', 'middle', 'inner'];
    let parent = root;
    nest.forEach((name, k) => {
      const group = new THREE.Group();
      group.matrixAutoUpdate = false;
      parent.add(group);
      parent = group;
      const color = AXIS_COLOR[name];
      // ring plane contains this ring's axis and the next ring's axis; innermost: its axis and the middle one (the airplane is mounted on the middle axis)
      const other = k < 2 ? nest[k + 1] : nest[1];
      const normalAxis = ['x', 'y', 'z'].find((a) => a !== name && a !== other);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(RING_R[k], 0.045, 14, 64),
        new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.25 }),
      );
      ring.matrixAutoUpdate = false;
      ring.matrix.fromArray(NORMAL_TO[normalAxis]);
      group.add(ring);
      // pins on this ring's axis, reaching out to the parent ring (or a support stub for the outer one)
      const reach = k === 0 ? RING_R[0] + 0.3 : RING_R[k - 1];
      for (const sgn of [1, -1]) {
        const pin = cylBetween(name, sgn * (RING_R[k] - 0.03), sgn * (reach + 0.03), 0.075, 0xcfd3dc);
        group.add(pin);
      }
      // axis line through the pins
      const line = cylBetween(name, -LINE_HALF, LINE_HALF, baseR, color);
      line.material = new THREE.MeshBasicMaterial({ color });
      group.add(line);
      // label at the + end of the line
      const label = makeLabel(`${roleName[k]} ${name.toUpperCase()} (${NAMES_BY_ORDER[model.order][name]})`, AXIS_CSS[name]);
      const u = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] }[name];
      label.position.set(u[0] * (LINE_HALF + 0.1), u[1] * (LINE_HALF + 0.1), u[2] * (LINE_HALF + 0.1));
      label.center.set(name === 'x' ? 0 : 0.5, k === 2 ? 1.15 : k === 0 ? -0.15 : 0.5);
      group.add(label);
      rings.push({ group, name, line, color });
    });
    plane = buildPlane();
    // mount the airplane to the inner ring: short pins along the middle ring's axis direction
    const innerGroup = rings[2].group;
    innerGroup.add(plane);
    const mountAxis = nest[1];
    for (const sgn of [1, -1]) innerGroup.add(cylBetween(mountAxis, sgn * 0.3, sgn * (RING_R[2] - 0.03), 0.03, 0x9aa1b0));
  }

  // ---- view update ------------------------------------------------------------------------------
  // `eff` holds the angles actually drawn (sliders, plus a wiggle offset on one ring).
  let eff = { x: model.x, y: model.y, z: model.z };
  let locked = false;

  function update() {
    const { x, y, z } = eff;
    const nest = EULER_ORDERS[model.order].nest;
    rings.forEach((r, k) => {
      r.group.matrix.fromArray(axisRot(nest[k], eff[nest[k]]));
    });
    root.updateMatrixWorld(true);

    const ga = gimbalAxes(model.order, x, y, z);
    const M = eulerMatrix(model.order, x, y, z);
    table.update('inner', ga.inner);
    table.update('outer', ga.outer);
    table.update('ang', ga.innerOuterDeg);
    table.update('land', column(M, 0));
    // each axis row in its ring's color (the rings swap colors with the order)
    const rowColor = (id, name) => {
      const tr = table.cells[id][0].parentElement;
      tr.style.color = `#${AXIS_COLOR[name].toString(16).padStart(6, '0')}`;
    };
    rowColor('inner', nest[2]);
    rowColor('outer', nest[0]);
    rowColor('land', 'x');

    locked = ga.innerOuterDeg < LOCK_DEG;
    const midName = nest[1].toUpperCase();
    statusEl.textContent = locked
      ? `Locked: the inner and outer rings now turn about the same axis, so two of the three angles do the same job. The middle ring (${midName}) is at 90°.`
      : `Free: the inner and outer axes differ by ${ga.innerOuterDeg.toFixed(0)}°. The lock is at ${midName} = ±90°.`;
    statusEl.style.color = locked ? '#ff7b72' : '';
    badge.style.display = locked ? 'block' : 'none';

    rings.forEach((r, k) => {
      const hot = locked && (k === 0 || k === 2);
      const s = hot ? 3.2 : 1;
      r.line.scale.set(s, 1, s);
      r.line.material.color.set(r.color);
      if (hot) r.line.material.color.lerp(new THREE.Color(0xffffff), 0.55);
    });
    render();
  }

  // ---- wiggle -----------------------------------------------------------------------------------
  let raf = 0;
  function setBusy(busy) {
    if (!wiggleBtns) return;
    Object.values(wiggleBtns).forEach((b) => { b.disabled = busy; });
  }
  function wiggle(which) {
    if (raf) return;
    const nest = EULER_ORDERS[model.order].nest;
    const axisName = which === 'outer' ? nest[0] : nest[2];
    const base = model[axisName];
    const t0 = performance.now();
    setBusy(true);
    const step = (now) => {
      const t = (now - t0) / WIGGLE_MS;
      if (t >= 1) {
        raf = 0;
        eff = { x: model.x, y: model.y, z: model.z };
        setBusy(false);
        update();
        return;
      }
      eff = { x: model.x, y: model.y, z: model.z };
      eff[axisName] = base + WIGGLE_DEG * Math.sin(2 * Math.PI * t);
      update();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  // ---- wiring -----------------------------------------------------------------------------------
  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      if (!raf) eff = { x: model.x, y: model.y, z: model.z };
      update();
    });
  }
  // slider labels follow the convention's names (x is pitch in Unity, roll in aerospace)
  function relabelSliders() {
    for (const id of Object.keys(sliders)) {
      const el = container.querySelector(`label[for="euler-gimbal-${id}"]`);
      if (el) el.textContent = `${id} (${NAMES_BY_ORDER[model.order][id]})`;
    }
  }
  orderRow?.onChange((v) => {
    if (raf) { cancelAnimationFrame(raf); raf = 0; setBusy(false); }
    model.order = v;
    eff = { x: model.x, y: model.y, z: model.z };
    relabelSliders();
    build();
    update();
  });

  const cam = makeOrbitCamera({
    camera: sc.camera,
    render,
    home: { eye: [4.6, 3.4, 6.2], target: [0, 0, 0] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  build();
  update();

  // development check: max |world matrix of the airplane - eulerMatrix| over the 3x3 part
  function check() {
    root.updateMatrixWorld(true);
    const W = plane.matrixWorld.elements;
    const M = eulerMatrix(model.order, eff.x, eff.y, eff.z);
    let d = 0;
    for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) d = Math.max(d, Math.abs(W[4 * c + r] - M[4 * c + r]));
    return d;
  }

  return { model, sliders, cam, input: cam, check, wiggle };
}
