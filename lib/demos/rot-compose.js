// rot-compose: composing two rotations. Two copies of an asymmetric toy plane
// (nose +z, wings along x, tail fin +y) side by side. The left copy gets turn
// A first and then turn B (quaternion q_B q_A, matrix R_B R_A); the right copy
// gets B first and then A (q_A q_B). The two landing poses differ, which is
// non-commutativity made visible. Each copy also shows the SINGLE rotation
// equivalent to its two turns (axis and angle from quatToAxisAngle of the
// composite) as a gold axis, and a "one turn" animation spins the plane
// straight from the start pose to the landing pose about that axis.
//
// The plane is one of the course's aircraft (core/aircraft.js; the Cessna by default, with a see-through copy
// as the ghost) or the toy plane, which shows until the model has loaded.
//
// Model: {axisA, axisB, angleA, angleB}. All rotation math comes from
// rot-reps.js / xform.js; this file only builds the view and runs its own
// rAF loop (the scene shell has none) that stops when an animation ends.
import * as THREE from '../vendor/three.module.js';
import { quatFromAxisAngle } from '../core/xform.js';
import { quatMul, quatToMatrix, quatToAxisAngle, slerp, angleBetween, column } from '../core/rot-reps.js';
import { SliderRow, ButtonRow, ValueTable, makeButton, makeRow } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';
import { AIRCRAFT, AIRCRAFT_NAMES, makeAircraft, ghostMaterial, withAircraftCredit } from '../core/aircraft.js';

const AXIS_COLOR = 0xffd166; // gold, as in axis-angle.js
const AXIS_VEC = { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
const AXIS_RGB = { x: 0xff5555, y: 0x55dd77, z: 0x5588ff };
const IDENTITY = [0, 0, 0, 1];
const SLOT_X = 2.5;
const TURN_MS = 800;
const HOLD_MS = 150;
const ONE_TURN_MS = 1300;
const TOKENS = ['axes', 'play', 'aircraft'];
const CRAFT_OPTIONS = [...AIRCRAFT_NAMES.map((n) => ({ value: n, label: AIRCRAFT[n].label })), { value: 'blocks', label: 'toy' }];
const PLANE_SIZE = 1.5;   // the longest side of an aircraft, as the toy plane's wingspan
const GHOST_COLOR = 0x8892a6;

const PARAMS = {
  angleA: { label: 'angle A', min: -180, max: 180, step: 1, value: 30, format: (v) => `${v.toFixed(0)}°` },
  angleB: { label: 'angle B', min: -180, max: 180, step: 1, value: 30, format: (v) => `${v.toFixed(0)}°` },
};

const AXIS_OPTIONS = [
  { value: 'x', label: 'x' },
  { value: 'y', label: 'y' },
  { value: 'z', label: 'z' },
];

const f3 = (v) => (v.toFixed(3) === '-0.000' ? '0.000' : v.toFixed(3));
const f1 = (v) => `${v.toFixed(1)}°`;
const smooth = (u) => u * u * (3 - 2 * u);
// the same rotation with w >= 0 (q and -q are one rotation): angle <= 180, matches slerp's shortest path
const canon = (q) => (q[3] < 0 ? q.map((v) => -v) : q);

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Two copies of the same toy plane (nose +z, wings along x, fin +y). Both
  receive the same two turns, A and B, but in opposite orders. Left: A first,
  then B. Right: B first, then A. The faint wireframe is the start pose; the
  red/green/blue arrows are where the plane's own x/y/z axes landed. The gold
  line is explained below.</p>
  <h4>The idea</h4>
  <p><b>Composition</b> means doing one rotation after another. "A then B" is
  the matrix product <code>R_B R_A</code>: with column vectors the right-hand
  factor acts first, so A is written on the right. Quaternions work the same
  way: the Hamilton product <code>q_B q_A</code> is the quaternion of "A then
  B" (<code>q_B q_A</code> is a product of two unit quaternions, itself a unit
  quaternion).</p>
  <p><b>Rotations do not commute</b>: <code>R_B R_A</code> and
  <code>R_A R_B</code> are usually different rotations, so the two planes land
  in different poses. "The two poses differ by" is the angle of the single
  rotation that takes one landing pose to the other.</p>
  <p><b>Two turns are one turn.</b> The product of two rotations is always
  another rotation, so it has its own axis and angle, an axis neither turn
  used. That is the gold line: press "One turn" and the plane reaches the
  same pose by a single spin about it. The readout gives the product
  quaternion <code>q [x,y,z,w]</code> (with w &gt;= 0), the unit axis
  <code>axis</code>, and the <code>angle</code> of that single turn.</p>
  <h4>Try this</h4>
  <p>1. Defaults (A = y 30°, then B = x 30°): the left plane has q =
  (0.250, 0.250, 0.067, 0.933), axis (0.695, 0.695, 0.186), angle 42.2°. The
  right plane has q = (0.250, 0.250, -0.067, 0.933). Press Play to watch the
  two orders diverge, then One turn to see the left pose reached in one spin.</p>
  <p>2. Set both angles to 90° (A = y, B = x): the planes land in clearly
  different poses and the difference readout is large.</p>
  <p>3. Set both axes to the same axis (say x and x): both orders agree and the
  difference is 0°. Rotations about one axis commute: their angles just add.</p>
  <p class="demo-shell-help-panel-hint">Drag to orbit, scroll to zoom. Esc, ×, or click outside to close.</p>
`;

/** label sprite: a canvas texture redrawn by setLines(); always faces the camera, drawn on top. */
function makeLabel(scaleW) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sprite.scale.set(scaleW, scaleW / 4, 1);
  sprite.renderOrder = 10;
  sprite.setLines = (lines) => {
    const g = canvas.getContext('2d');
    g.clearRect(0, 0, 512, 128);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const n = lines.length;
    lines.forEach(({ text, color = '#e7eaf0', px = 34 }, i) => {
      g.font = `bold ${px}px system-ui, sans-serif`;
      g.fillStyle = color;
      g.fillText(text, 256, (128 / (n + 1)) * (i + 1));
    });
    tex.needsUpdate = true;
  };
  return sprite;
}

/** a holder for the plane, holding the toy plane to start with (see setCraft). */
function makePlane(wire) {
  const holder = new THREE.Group();
  holder.matrixAutoUpdate = false;
  holder.userData.toy = makeToyPlane(wire);
  holder.add(holder.userData.toy);
  return holder;
}

/** the asymmetric toy plane: nose +z (red tip), wings along x, fin +y. wire=true gives the ghost version. */
function makeToyPlane(wire) {
  const g = new THREE.Group();
  const parts = [
    { size: [0.3, 0.3, 1.3], pos: [0, 0, 0], color: 0x8aa0c0 }, // fuselage
    { size: [1.5, 0.07, 0.42], pos: [0, 0, 0.1], color: 0xff9955 }, // wings
    { size: [0.07, 0.42, 0.3], pos: [0, 0.2, -0.55], color: 0x55ff88 }, // fin
    { size: [0.34, 0.34, 0.25], pos: [0, 0, 0.62], color: 0xff5555 }, // nose
  ];
  for (const p of parts) {
    const geo = new THREE.BoxGeometry(...p.size);
    const mat = wire
      ? new THREE.MeshBasicMaterial({ color: 0x8892a6, wireframe: true, transparent: true, opacity: 0.5 })
      : new THREE.MeshStandardMaterial({ color: p.color });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...p.pos);
    g.add(m);
  }
  return g;
}

/** one side: a group at (x, 0, 0) with ghost, plane, landed axes, gold axis, two labels. */
function makeSlot(x) {
  const root = new THREE.Group();
  root.position.set(x, 0, 0);
  const ghost = makePlane(true);
  const plane = makePlane(false);
  root.add(ghost, plane);
  const landed = ['x', 'y', 'z'].map((k) => {
    const a = new THREE.ArrowHelper(new THREE.Vector3(...AXIS_VEC[k]), new THREE.Vector3(), 1.0, AXIS_RGB[k], 0.18, 0.1);
    root.add(a);
    return a;
  });
  const gold = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: AXIS_COLOR });
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.4, 10), mat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 12), mat);
  head.position.y = 1.3;
  gold.add(rod, head);
  root.add(gold);
  const title = makeLabel(2.5);
  title.position.set(0, 1.45, 0);
  const caption = makeLabel(2.5);
  caption.position.set(0, -1.4, 0);
  root.add(title, caption);
  return { root, ghost, plane, landed, gold, title, caption };
}

export function make(container, { stage = 'embed', controls } = {}) {
  const model = { axisA: 'y', axisB: 'x', angleA: PARAMS.angleA.value, angleB: PARAMS.angleB.value, craft: 'cessna' };
  const list = controls ?? [];
  const wantCraft = stage === 'full' || list.includes('aircraft');
  const wantAxes = stage === 'full' || list.includes('axes');
  const wantPlay = stage === 'full' || list.includes('play');

  const nav = { orbitSpeed: 0.4, zoomSpeed: 0.12, moveSpeed: 3, rollRate: 60 };
  let render;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const settingsFields = [
    { label: 'orbit', decimals: 2, title: 'Orbit sensitivity, deg per pixel of drag, default 0.4',
      getCurrent: () => nav.orbitSpeed, apply: (v) => { nav.orbitSpeed = clamp(v, 0.02, 2); } },
    { label: 'zoom', decimals: 2, title: 'Zoom step, fraction of distance per wheel notch, default 0.12',
      getCurrent: () => nav.zoomSpeed, apply: (v) => { nav.zoomSpeed = clamp(v, 0.02, 0.5); } },
    { label: 'move', decimals: 1, title: 'WASD move speed, units/sec, default 3',
      getCurrent: () => nav.moveSpeed, apply: (v) => { nav.moveSpeed = clamp(v, 0.1, 20); } },
    { label: 'roll', decimals: 0, title: 'Q/E roll rate, deg/sec while held, default 60',
      getCurrent: () => nav.rollRate, apply: (v) => { nav.rollRate = clamp(v, 10, 180); } },
  ];

  const shell = makeShell(container, {
    stage,
    help: { html: withAircraftCredit(HELP_HTML) },
    settings: settingsFields,
    legend: 'drag to turn · scroll zoom · WASD move · ↑/↓ up·down · Q/E roll · H home',
    nav: 'orbit',
  });
  const sc = makeScene(shell.sceneEl, { fill: true });
  const { scene } = sc;
  render = sc.render;
  sc.axes.visible = false; // each plane shows its own landed axes instead

  const left = makeSlot(-SLOT_X);
  const right = makeSlot(SLOT_X);
  scene.add(left.root, right.root);

  // the plane in both slots, solid and ghost: the toy at once, an aircraft once loaded (a later choice wins)
  const ghostMat = ghostMaterial(GHOST_COLOR, 0.25);
  let craftSeq = 0;
  async function setCraft(name) {
    const mine = ++craftSeq;
    const holders = [left.plane, left.ghost, right.plane, right.ghost];
    const next = name === 'blocks'
      ? holders.map((h) => h.userData.toy)
      : await Promise.all(holders.map((h) => makeAircraft(name, { size: PLANE_SIZE, ghost: h === left.ghost || h === right.ghost ? ghostMat : null })));
    if (mine !== craftSeq) return;
    holders.forEach((h, i) => { h.clear(); h.add(next[i]); });
    render();
  }

  // ---- rail
  const sliders = {};
  const axisRows = {};
  const sliderIds = stage === 'full'
    ? Object.keys(PARAMS)
    : resolveControlIds(PARAMS, list.filter((c) => !TOKENS.includes(c)), 'rot-compose');

  const cardA = shell.addCard('Turns A and B');
  if (wantCraft) {
    const craftRow = new ButtonRow(cardA, { id: 'rot-compose-aircraft', label: 'airplane', options: CRAFT_OPTIONS, value: model.craft });
    craftRow.onChange((v) => { model.craft = v; setCraft(v); });
  }
  if (wantAxes) {
    axisRows.A = new ButtonRow(cardA, { id: 'rot-compose-axisA', label: 'axis A', options: AXIS_OPTIONS, value: model.axisA });
  }
  if (sliderIds.includes('angleA')) sliders.angleA = new SliderRow(cardA, { id: 'rot-compose-angleA', ...PARAMS.angleA });
  const cardB = cardA;
  if (wantAxes) {
    axisRows.B = new ButtonRow(cardB, { id: 'rot-compose-axisB', label: 'axis B', options: AXIS_OPTIONS, value: model.axisB });
  }
  if (sliderIds.includes('angleB')) sliders.angleB = new SliderRow(cardB, { id: 'rot-compose-angleB', ...PARAMS.angleB });
  if (!cardA.querySelector('.slider-row, .btn-row')) cardA.remove();

  let statusEl = null;
  let playBtn = null;
  let oneBtn = null;
  if (wantPlay) {
    const playCard = shell.addCard('Animate');
    const row = makeRow(playCard);
    playBtn = makeButton(row, 'Play A, B', () => { playBtn.blur(); startAnim('play'); });
    oneBtn = makeButton(row, 'One turn', () => { oneBtn.blur(); startAnim('one'); });
    statusEl = document.createElement('p');
    statusEl.className = 'demo-hint';
    statusEl.style.cssText = 'font-size:12px;margin:6px 0 0;color:#aab2c3;';
    playCard.appendChild(statusEl);
  }

  const readoutCard = shell.addCard('Result (w >= 0)');
  const mkTable = (caption, rows) => {
    const cap = document.createElement('p');
    cap.className = 'demo-hint';
    cap.style.cssText = 'font-size:11px;margin:6px 0 2px;color:#aab2c3';
    cap.textContent = caption;
    if (caption) readoutCard.appendChild(cap);
    const t = new ValueTable(readoutCard, { rows });
    t.table.style.fontSize = '11px';
    t.table.querySelectorAll('td').forEach((td) => { td.style.padding = '2px 3px'; td.style.whiteSpace = 'nowrap'; });
    return t;
  };
  const rowsFor = (sfx) => [
    { id: 'q' + sfx, label: 'q', cols: 4, className: 'row-h', format: f3 },
    { id: 'ax' + sfx, label: 'axis', cols: 3, className: 'row-v', format: f3 },
    { id: 'ang' + sfx, label: 'angle', format: f1 },
  ];
  const tableL = mkTable('A then B = q_B q_A (left)', rowsFor('L'));
  const tableR = mkTable('B then A = q_A q_B (right)', rowsFor('R'));
  const tableD = mkTable('', [{ id: 'diff', label: 'poses differ by', className: 'row-w', format: f1 }]);
  const table = { update: (id, v) => (id.endsWith('L') ? tableL : id === 'diff' ? tableD : tableR).update(id, v) };

  // ---- math
  const turnQ = (axisKey, deg) => quatFromAxisAngle(...AXIS_VEC[axisKey], deg);
  function quats() {
    const qA = turnQ(model.axisA, model.angleA);
    const qB = turnQ(model.axisB, model.angleB);
    return { qA, qB, qAB: canon(quatMul(qB, qA)), qBA: canon(quatMul(qA, qB)) };
  }

  function setPose(slot, q) {
    slot.plane.matrix.fromArray(quatToMatrix(q));
    const R = quatToMatrix(q);
    slot.landed.forEach((a, j) => a.setDirection(new THREE.Vector3(...column(R, j))));
  }

  function setGold(slot, aa) {
    const visible = aa.deg > 0.5;
    slot.gold.visible = visible;
    if (visible) slot.gold.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...aa.axis));
  }

  const ang = (deg) => `${deg.toFixed(0)}°`;
  function setLabels(Q) {
    const a = `${model.axisA} ${ang(model.angleA)}`;
    const b = `${model.axisB} ${ang(model.angleB)}`;
    left.title.setLines([
      { text: 'A then B  (q_B q_A)', color: '#e7eaf0', px: 36 },
      { text: `${a}, then ${b}`, color: '#aab2c3', px: 30 },
    ]);
    right.title.setLines([
      { text: 'B then A  (q_A q_B)', color: '#e7eaf0', px: 36 },
      { text: `${b}, then ${a}`, color: '#aab2c3', px: 30 },
    ]);
    for (const [slot, aa] of [[left, Q.aaL], [right, Q.aaR]]) {
      slot.caption.setLines(aa.deg > 0.5
        ? [{ text: `one turn of ${aa.deg.toFixed(1)}°`, color: '#ffd166', px: 36 }, { text: 'about the gold axis', color: '#ffd166', px: 28 }]
        : [{ text: 'net rotation: none', color: '#ffd166', px: 34 }]);
    }
  }

  let current = null; // last computed { qAB, qBA, aaL, aaR }
  function update() {
    const { qAB, qBA } = quats();
    const aaL = quatToAxisAngle(qAB);
    const aaR = quatToAxisAngle(qBA);
    current = { qAB, qBA, aaL, aaR };
    showFinal();
    setGold(left, aaL);
    setGold(right, aaR);
    table.update('qL', qAB);
    table.update('axL', aaL.axis);
    table.update('angL', aaL.deg);
    table.update('qR', qBA);
    table.update('axR', aaR.axis);
    table.update('angR', aaR.deg);
    table.update('diff', angleBetween(qAB, qBA));
    setLabels(current);
    render();
  }

  function showFinal() {
    setPose(left, current.qAB);
    setPose(right, current.qBA);
  }

  // ---- animation (own rAF loop; stops when done)
  let raf = 0;
  let anim = null;
  function stopAnim() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    anim = null;
    if (statusEl) statusEl.textContent = '';
  }
  function startAnim(kind) {
    stopAnim();
    anim = { kind, t0: performance.now() };
    raf = requestAnimationFrame(frame);
  }
  // pose after first turn (u in 0..1) and then second turn (u in 1..2)
  function twoStep(first, second, u) {
    if (u <= 1) return slerp(IDENTITY, first, smooth(u)).q;
    return quatMul(slerp(IDENTITY, second, smooth(u - 1)).q, first);
  }
  function frame(now) {
    if (!anim) return;
    const { qA, qB } = quats();
    const el = now - anim.t0;
    let done = false;
    if (anim.kind === 'play') {
      const total = 2 * TURN_MS + HOLD_MS;
      let u;
      if (el < TURN_MS) u = el / TURN_MS;
      else if (el < TURN_MS + HOLD_MS) u = 1;
      else u = 1 + (el - TURN_MS - HOLD_MS) / TURN_MS;
      u = Math.min(u, 2);
      done = el >= total;
      setPose(left, twoStep(qA, qB, u));
      setPose(right, twoStep(qB, qA, u));
      if (statusEl) {
        statusEl.textContent = done ? '' : u < 1 || el < TURN_MS + HOLD_MS ? 'left: turn A. right: turn B.' : 'left: turn B. right: turn A.';
      }
    } else {
      const u = Math.min(el / ONE_TURN_MS, 1);
      done = u >= 1;
      setPose(left, slerp(IDENTITY, current.qAB, smooth(u)).q);
      setPose(right, slerp(IDENTITY, current.qBA, smooth(u)).q);
      if (statusEl) statusEl.textContent = done ? '' : 'one spin about the gold axis.';
    }
    render();
    if (done) {
      stopAnim();
      showFinal();
      render();
    } else {
      raf = requestAnimationFrame(frame);
    }
  }

  // ---- wiring
  for (const id of Object.keys(sliders)) {
    sliders[id].onInput((v) => { model[id] = v; stopAnim(); update(); });
  }
  if (axisRows.A) axisRows.A.onChange((v) => { model.axisA = v; stopAnim(); update(); });
  if (axisRows.B) axisRows.B.onChange((v) => { model.axisB = v; stopAnim(); update(); });

  const cam = makeOrbitCamera({
    camera: sc.camera,
    render,
    home: { eye: [0, 2.2, 6.6], target: [0, 0, 0] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  update();
  setCraft(model.craft);
  return { model, sliders, cam, input: cam, panel: tableL, startAnim, stopAnim };
}
