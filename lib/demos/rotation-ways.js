// rotation-ways: ONE rotation, five ways to name it. A "define by" selector picks which parameter set
// drives the pose: matrix columns (where x and y land, z forced), axis-angle, unit quaternion, Euler
// angles (Unity order), or from-to (turn direction a onto b). The readout card is identical in every
// mode, and switching modes CONVERTS the current rotation into the new mode's sliders, so the pose
// does not jump (except into from-to, which keeps only where one direction goes). All rotation math
// comes from rot-reps.js / xform.js; this file only wires sliders to it and draws.
// Single source of truth: the slider values. update() reads them, builds R, draws, fills the readout.
import * as THREE from '../vendor/three.module.js';
import { axisAngleMatrix } from '../core/xform.js';
import {
  column, det3, rotate, fromColumns, quatToMatrix, matrixToQuat, quatToAxisAngle, quatNormalize,
  quatLen, slerp, fromTo, eulerMatrix, eulerFromMatrixUnity, quatRotate,
} from '../core/rot-reps.js';
import { SliderRow, ButtonRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';

const D = Math.PI / 180;
const AXIS_COLOR = 0xffd166;
const COL_COLORS = [0xff5555, 0x55ff88, 0x5588ff];
const FACE_COLORS = [0xff5555, 0xff9955, 0x55ff88, 0x55ffee, 0x5588ff, 0xcc55ff];
const A_COLOR = 0xffffff;
const B_COLOR = 0xff9f43;
const LAND_LEN = 1.6;
const ORIGIN = new THREE.Vector3(0, 0, 0);

const deg1 = (v) => `${v.toFixed(0)}°`;
const f2 = (v) => v.toFixed(2);
const f3 = (v) => v.toFixed(3);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const neg = (v) => v.map((c) => -c);

const MODES = [
  { value: 'columns', label: 'columns' },
  { value: 'axisangle', label: 'axis-angle' },
  { value: 'quat', label: 'quaternion' },
  { value: 'euler', label: 'Euler' },
  { value: 'fromto', label: 'from-to' },
];

// Slider groups per mode. The first range input on the page is xAz (columns is the default mode).
const PARAMS = {
  xAz: { mode: 'columns', label: 'x az', min: -180, max: 180, step: 1, value: 30, format: deg1 },
  xEl: { mode: 'columns', label: 'x el', min: -90, max: 90, step: 1, value: 0, format: deg1 },
  twist: { mode: 'columns', label: 'twist', min: -180, max: 180, step: 1, value: 0, format: deg1 },
  axAz: { mode: 'axisangle', label: 'axis az', min: -180, max: 180, step: 1, value: 0, format: deg1 },
  axEl: { mode: 'axisangle', label: 'axis el', min: -90, max: 90, step: 1, value: 90, format: deg1 },
  angle: { mode: 'axisangle', label: 'angle', min: 0, max: 360, step: 1, value: 30, format: deg1 },
  qx: { mode: 'quat', label: 'qx', min: -1, max: 1, step: 0.001, value: 0, format: f3 },
  qy: { mode: 'quat', label: 'qy', min: -1, max: 1, step: 0.001, value: 0.259, format: f3 },
  qz: { mode: 'quat', label: 'qz', min: -1, max: 1, step: 0.001, value: 0, format: f3 },
  qw: { mode: 'quat', label: 'qw', min: -1, max: 1, step: 0.001, value: 0.966, format: f3 },
  ex: { mode: 'euler', label: 'x pitch', min: -180, max: 180, step: 1, value: 0, format: deg1 },
  ey: { mode: 'euler', label: 'y yaw', min: -180, max: 180, step: 1, value: 30, format: deg1 },
  ez: { mode: 'euler', label: 'z roll', min: -180, max: 180, step: 1, value: 0, format: deg1 },
  aAz: { mode: 'fromto', label: 'a az', min: -180, max: 180, step: 1, value: 0, format: deg1 },
  aEl: { mode: 'fromto', label: 'a el', min: -90, max: 90, step: 1, value: 0, format: deg1 },
  bAz: { mode: 'fromto', label: 'b az', min: -180, max: 180, step: 1, value: 30, format: deg1 },
  bEl: { mode: 'fromto', label: 'b el', min: -90, max: 90, step: 1, value: 0, format: deg1 },
};

const MODE_NOTE = {
  columns: "z' = x' × y' (no choice left: 3 numbers fix a rotation)",
  axisangle: 'axis = unit vector from azimuth and elevation; turn by angle about it (right-hand rule)',
  quat: 'angle = 2 acos(w), axis = (x,y,z) / |(x,y,z)|',
  euler: 'R = R_y R_x R_z: Z first, then X, then Y',
  fromto: 'names only the SMALLEST rotation taking a onto b (extra twist about b also works)',
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>One colored cube, turned by ONE rotation. The bold arrows from the origin are where the cube's own
  axes landed: x' (red), y' (green), z' (blue). The faint wire cube is the unrotated reference. The gold
  line is the rotation axis. The "define by" buttons choose which five-way description you edit; the
  table is the same in every mode.</p>
  <h4>The idea</h4>
  <p>A rotation is a single object. These are five names for it, and each converts to the others:</p>
  <p><b>Columns.</b> The rotation matrix R has three <i>columns</i>: where x, y and z land (x', y', z').
  They are perpendicular unit vectors. Pick x' and y' and z' = x' × y' is forced, so three numbers fix a
  rotation. <b>det</b> (determinant) is +1 for a rotation; if z' is flipped to -(x' × y') the matrix is a
  mirror, det = -1, and it has no axis, angle, quaternion or Euler angles.</p>
  <p><b>Axis-angle.</b> Turn by an angle about a unit axis (right-hand rule).</p>
  <p><b>Unit quaternion.</b> Four numbers q = [x, y, z, w] of length 1: w = cos(angle/2) and (x,y,z) =
  sin(angle/2) times the axis. The sliders are normalized for you; q and -q are the same rotation.</p>
  <p><b>Euler angles (Unity order).</b> Three turns: Z (roll) first, then X (pitch), then Y (yaw); the
  matrix is R_y R_x R_z.</p>
  <p><b>From-to.</b> "Turn direction a onto direction b." The result is the smallest such rotation, about
  the axis a × b. It cannot say how much to twist about b afterward, so converting INTO from-to keeps only
  where x lands and the pose can change.</p>
  <h4>Try this</h4>
  <p>1. Leave everything at the start: x lands at (0.866, 0, -0.5), det 1, q = (0, 0.259, 0, 0.966), axis
  (0, 1, 0), angle 30, Euler (0, 30, 0). Click each mode: the cube does not move.</p>
  <p>2. Euler mode: set x pitch to 90 (y yaw 0, z roll 0). Read where z lands in the table: (0, -1, 0).
  Switch to quaternion: q = (0.707, 0, 0, 0.707).</p>
  <p>3. Columns mode: tick "mirror". det turns -1, the cube becomes its mirror image, and q, axis, angle and
  Euler are not defined.</p>
  <p>4. Quaternion mode: set qw to -0.966 and qy to -0.259 (that is -q): the pose is unchanged.</p>
  <p>5. From-to mode: raise b el to 60. The cube turns about the gold axis a × b, the shortest way.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

// ---- small 3D helpers (arrows with thickness, text sprites) ----
function makeThickArrow(len, color, radius) {
  const g = new THREE.Group();
  const head = Math.min(0.28, len * 0.3);
  const mat = new THREE.MeshBasicMaterial({ color });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len - head, 10), mat);
  shaft.position.y = (len - head) / 2;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.6, head, 14), mat);
  cone.position.y = len - head / 2;
  g.add(shaft, cone);
  return g;
}
const UP = new THREE.Vector3(0, 1, 0);
function aim(group, dir) {
  const v = new THREE.Vector3(...dir);
  if (v.lengthSq() < 1e-12) { group.visible = false; return; }
  group.visible = true;
  group.quaternion.setFromUnitVectors(UP, v.normalize());
}
function makeLabel(text, color) {
  const c = document.createElement('canvas');
  c.width = 96; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#10131a';
  ctx.strokeText(text, 48, 34);
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.fillText(text, 48, 34);
  const tex = new THREE.CanvasTexture(c);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(0.6, 0.4, 1);
  sp.renderOrder = 10;
  return sp;
}

// spherical helpers shared by slider conversion: dir = (cos el cos az, sin el, -cos el sin az)
const dirOf = (az, el) => [Math.cos(el * D) * Math.cos(az * D), Math.sin(el * D), -Math.cos(el * D) * Math.sin(az * D)];
const spherical = (v) => ({
  az: Math.atan2(-v[2], v[0]) / D,
  el: Math.asin(clamp(v[1], -1, 1)) / D,
});
// y' before twist: world up made perpendicular to x' (falls back to +z when x' is the pole)
function baseY(xp) {
  const up = [0, 1, 0];
  const k = up[1] * xp[1];
  let y0 = [up[0] - k * xp[0], up[1] - k * xp[1], up[2] - k * xp[2]];
  let len = Math.hypot(...y0);
  if (len < 1e-6) {
    const z = [0, 0, 1];
    const kz = z[2] * xp[2];
    y0 = [z[0] - kz * xp[0], z[1] - kz * xp[1], z[2] - kz * xp[2]];
    len = Math.hypot(...y0);
  }
  return y0.map((c) => c / len);
}
const canonQuat = (R) => {
  const q = matrixToQuat(R).q;
  return q[3] < 0 ? q.map((c) => -c) : q;
};

export function make(container, { stage = 'embed', controls } = {}) {
  const list = controls ?? [];
  const full = stage === 'full';
  const modeToken = list.find((c) => c.startsWith('mode:'));
  const tokenMode = { columns: 'columns', axisangle: 'axisangle', quat: 'quat', euler: 'euler', fromto: 'fromto' }[modeToken?.slice(5)];
  let mode = tokenMode ?? 'columns';
  const showModes = full || list.includes('modes');
  const showMirror = full || list.includes('mirror');

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

  // ---- scene objects ----
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    FACE_COLORS.map((color) => new THREE.MeshStandardMaterial({ color })),
  );
  cube.matrixAutoUpdate = false;
  scene.add(cube);
  const ref = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.28 }),
  );
  scene.add(ref);

  const landed = COL_COLORS.map((c) => makeThickArrow(LAND_LEN, c, 0.028));
  const landedLabels = ["x'", "y'", "z'"].map((t, i) => makeLabel(t, COL_COLORS[i]));
  landed.forEach((g) => scene.add(g));
  landedLabels.forEach((s) => scene.add(s));

  const axisFwd = makeThickArrow(1.9, AXIS_COLOR, 0.012);
  const axisBack = makeThickArrow(1.9, AXIS_COLOR, 0.012);
  scene.add(axisFwd, axisBack);

  const aArrow = makeThickArrow(1.3, A_COLOR, 0.02);
  const bArrow = makeThickArrow(1.3, B_COLOR, 0.02);
  const aLabel = makeLabel('a', A_COLOR);
  const bLabel = makeLabel('b', B_COLOR);
  const ARC_N = 32;
  const arcGeom = new THREE.BufferGeometry();
  arcGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array((ARC_N + 1) * 3), 3));
  const arc = new THREE.Line(arcGeom, new THREE.LineBasicMaterial({ color: AXIS_COLOR }));
  arc.frustumCulled = false;
  const ftGroup = new THREE.Group();
  ftGroup.add(aArrow, bArrow, aLabel, bLabel, arc);
  scene.add(ftGroup);

  // ---- rail ----
  const modeCard = shell.addCard('Define by');
  let modeRow = null;
  const slidersEl = {}; // per-mode container
  const sliders = {};
  const model = { mode, mirror: false };

  if (showModes) {
    modeRow = new ButtonRow(modeCard, { id: 'rotation-ways-mode', label: 'by', options: MODES, value: mode });
  }
  for (const m of MODES) {
    slidersEl[m.value] = document.createElement('div');
    modeCard.appendChild(slidersEl[m.value]);
  }
  for (const [id, p] of Object.entries(PARAMS)) {
    const { mode: m, ...cfg } = p;
    sliders[id] = new SliderRow(slidersEl[m], { id: `rotation-ways-${id}`, ...cfg });
    model[id] = p.value;
  }

  let mirrorBox = null;
  if (showMirror) {
    const row = document.createElement('label');
    row.className = 'slider-row';
    mirrorBox = document.createElement('input');
    mirrorBox.type = 'checkbox';
    mirrorBox.id = 'rotation-ways-mirror';
    const text = document.createElement('span');
    text.className = 'slider-label';
    text.textContent = "mirror: z' = -(x' × y')";
    row.append(mirrorBox, text);
    slidersEl.columns.appendChild(row);
  }

  const noteEl = document.createElement('p');
  noteEl.className = 'demo-hint';
  noteEl.style.cssText = 'font-size:11px;margin:4px 0 0;line-height:1.25';
  const warnEl = document.createElement('p');
  warnEl.className = 'demo-hint';
  warnEl.style.cssText = 'font-size:11px;margin:3px 0 0;color:#ff7b72;line-height:1.3';
  modeCard.append(noteEl, warnEl);

  const readCard = shell.addCard('R: columns = where the axes land');
  const table = new ValueTable(readCard, {
    rows: [
      { id: 'x', label: 'x lands at', cols: 3, className: 'row-u', format: f3 },
      { id: 'y', label: 'y lands at', cols: 3, className: 'row-v', format: f3 },
      { id: 'z', label: 'z lands at', cols: 3, className: 'row-w', format: f3 },
      { id: 'det', label: 'det', cols: 1, className: 'row-h', format: f3 },
      { id: 'q', label: 'q [x,y,z,w]', cols: 4, className: 'row-h', format: f3 },
      { id: 'axis', label: 'axis', cols: 3, className: 'row-h', format: f3 },
      { id: 'angle', label: 'angle', cols: 1, className: 'row-h', format: (v) => `${v.toFixed(1)}°` },
      { id: 'euler', label: 'Euler (Unity) x,y,z', cols: 3, className: 'row-h', format: (v) => v.toFixed(1) },
    ],
  });
  // compact table: the five-row-group readout must fit a 270 px rail without wrapping numbers
  const tstyle = document.createElement('style');
  tstyle.textContent = `.cockpit .rw-card.demo-shell-card { padding: 6px 8px; }
    .cockpit .rw-card.demo-shell-card h3 { margin-bottom: 4px; }
    .cockpit .rw-card table.mat-panel { width: 100%; border-spacing: 0; }
    .cockpit .rw-card table.mat-panel td { padding: 1px 2px; font-size: 10.5px; white-space: nowrap; }
    .cockpit .rw-card table.mat-panel td.value-label { white-space: normal; min-width: 60px; }
    .cockpit .rw-modes.demo-shell-card { padding: 6px 8px; }
    .cockpit .rw-modes.demo-shell-card h3 { margin-bottom: 4px; }
    .cockpit .rw-modes .slider-row { padding: 3px 8px; margin-bottom: 4px; gap: 6px; }
    .cockpit .rw-modes .slider-label { font-size: 12px; min-width: 2em; }
    .cockpit .rw-modes .btn-row > .slider-label { display: none; }
    .cockpit .rw-modes .btn-row-group { width: 100%; }
    .cockpit .rw-modes .btn-row-btn { padding: 2px 5px; font-size: 11px; }`;
  readCard.appendChild(tstyle);
  readCard.classList.add('rw-card');
  modeCard.classList.add('rw-modes');
  const setNA = (id) => table.cells[id].forEach((td, i) => { td.textContent = i === 0 ? 'n/a' : ''; });

  let switchNote = '';
  let qLast = [0, 0.259, 0, 0.966];
  let lastR = fromColumns([1, 0, 0], [0, 1, 0], [0, 0, 1]);

  function setSlider(id, v) {
    const s = sliders[id];
    s.input.value = String(v);
    s.readout.textContent = s._format(s.value);
    model[id] = s.value;
  }

  // build R from the active mode's sliders; extras = notes for the UI
  function buildR() {
    const m = model;
    const extra = { warn: '', info: '' };
    let R;
    if (mode === 'columns') {
      const xp = dirOf(m.xAz, m.xEl);
      const y0 = baseY(xp);
      const yp = rotate(axisAngleMatrix(xp[0], xp[1], xp[2], m.twist), y0);
      const zp = [xp[1] * yp[2] - xp[2] * yp[1], xp[2] * yp[0] - xp[0] * yp[2], xp[0] * yp[1] - xp[1] * yp[0]];
      R = fromColumns(xp, yp, m.mirror ? neg(zp) : zp);
    } else if (mode === 'axisangle') {
      const ax = dirOf(m.axAz, m.axEl);
      R = axisAngleMatrix(ax[0], ax[1], ax[2], m.angle);
    } else if (mode === 'quat') {
      const raw = [m.qx, m.qy, m.qz, m.qw];
      const len = quatLen(raw);
      if (len < 1e-3) {
        extra.warn = 'all four near 0: holding the last valid q';
      } else {
        qLast = quatNormalize(raw);
      }
      extra.info = `raw |q| = ${len.toFixed(3)}; normalized to length 1`;
      R = quatToMatrix(qLast);
      extra.q = qLast;
    } else if (mode === 'euler') {
      R = eulerMatrix('unity', m.ex, m.ey, m.ez);
    } else {
      const a = dirOf(m.aAz, m.aEl);
      const b = dirOf(m.bAz, m.bEl);
      const ft = fromTo(a, b);
      if (ft.degenerate) extra.warn = 'a and b are opposite: any axis perpendicular to a works; one is chosen';
      R = quatToMatrix(ft.q);
      extra.a = a;
      extra.b = b;
      extra.q = ft.q;
    }
    return { R, extra };
  }

  function updateFromTo(extra, R) {
    ftGroup.visible = mode === 'fromto';
    if (mode !== 'fromto') return;
    aim(aArrow, extra.a);
    aim(bArrow, extra.b);
    aLabel.position.set(...extra.a.map((c) => c * 1.5));
    bLabel.position.set(...extra.b.map((c) => c * 1.5));
    const id = [0, 0, 0, 1];
    const pos = arcGeom.getAttribute('position');
    for (let i = 0; i <= ARC_N; i++) {
      const qt = slerp(id, extra.q, i / ARC_N).q;
      const p = quatRotate(qt, extra.a);
      pos.setXYZ(i, p[0] * 1.15, p[1] * 1.15, p[2] * 1.15);
    }
    pos.needsUpdate = true;
  }

  function update() {
    for (const id of Object.keys(PARAMS)) model[id] = sliders[id].value;
    model.mirror = !!mirrorBox?.checked && mode === 'columns';
    model.mode = mode;
    const { R, extra } = buildR();
    lastR = R;
    cube.matrix.fromArray(R);

    const clean = (v) => (Math.abs(v) < 5e-4 ? 0 : v);
    const cols = [column(R, 0), column(R, 1), column(R, 2)].map((c) => c.map(clean));
    cols.forEach((c, i) => {
      aim(landed[i], c);
      landedLabels[i].position.set(...c.map((v) => v * (LAND_LEN + 0.22)));
    });

    const det = det3(R);
    const isRot = det > 0;
    table.update('x', cols[0]);
    table.update('y', cols[1]);
    table.update('z', cols[2]);
    table.update('det', det);

    let warn = extra.warn;
    if (isRot) {
      const q = extra.q ?? canonQuat(R);
      const aa = quatToAxisAngle(q);
      const eu = eulerFromMatrixUnity(R);
      table.update('q', q.map(clean));
      table.update('axis', aa.axis.map(clean));
      table.update('angle', aa.deg);
      table.update('euler', [clean(eu.x), clean(eu.y), clean(eu.z)]);
      aim(axisFwd, aa.axis);
      aim(axisBack, neg(aa.axis));
      if (eu.locked) warn = warn || 'gimbal lock (x = ±90): only y ∓ z is determined; z reported as 0';
    } else {
      ['q', 'axis', 'angle', 'euler'].forEach(setNA);
      axisFwd.visible = false;
      axisBack.visible = false;
      warn = 'not a rotation (det -1): a mirror has no q, axis, angle or Euler angles';
    }
    updateFromTo(extra, R);

    let note = MODE_NOTE[mode];
    if (model.mirror) note = "z' = -(x' × y'): the third column is flipped";
    if (extra.info) note = `${note}. ${extra.info}`;
    noteEl.textContent = switchNote ? `${note}. ${switchNote}` : note;
    warnEl.textContent = warn;
    render();
  }

  // convert the current rotation into the new mode's sliders
  function convertTo(newMode) {
    let R = lastR;
    let note = '';
    if (det3(R) < 0) {
      R = fromColumns(column(R, 0), column(R, 1), neg(column(R, 2)));
      note = 'mirror removed (z flipped back)';
      if (mirrorBox) mirrorBox.checked = false;
    }
    if (newMode === 'columns') {
      const xp = column(R, 0);
      const yp = column(R, 1);
      const y0 = baseY(xp);
      const sph = spherical(xp);
      const cr = [y0[1] * yp[2] - y0[2] * yp[1], y0[2] * yp[0] - y0[0] * yp[2], y0[0] * yp[1] - y0[1] * yp[0]];
      const tw = Math.atan2(xp[0] * cr[0] + xp[1] * cr[1] + xp[2] * cr[2], y0[0] * yp[0] + y0[1] * yp[1] + y0[2] * yp[2]) / D;
      setSlider('xAz', sph.az);
      setSlider('xEl', sph.el);
      setSlider('twist', tw);
    } else if (newMode === 'axisangle') {
      const aa = quatToAxisAngle(canonQuat(R));
      const sph = spherical(aa.axis);
      setSlider('axAz', sph.az);
      setSlider('axEl', sph.el);
      setSlider('angle', aa.deg);
    } else if (newMode === 'quat') {
      const q = canonQuat(R);
      ['qx', 'qy', 'qz', 'qw'].forEach((id, i) => setSlider(id, q[i]));
      qLast = q;
    } else if (newMode === 'euler') {
      const eu = eulerFromMatrixUnity(R);
      setSlider('ex', eu.x);
      setSlider('ey', eu.y);
      setSlider('ez', eu.z);
    } else {
      const sa = spherical([1, 0, 0]);
      const sb = spherical(column(R, 0));
      setSlider('aAz', sa.az);
      setSlider('aEl', sa.el);
      setSlider('bAz', sb.az);
      setSlider('bEl', sb.el);
      note = `${note ? `${note}; ` : ''}from-to keeps only where x goes (a = world x, b = where x landed), so the pose may change: it is the shortest rotation, without twist`;
    }
    switchNote = note;
  }

  function showMode() {
    for (const m of MODES) slidersEl[m.value].style.display = m.value === mode ? '' : 'none';
    modeRow?.set(mode);
  }

  for (const id of Object.keys(PARAMS)) {
    sliders[id].onInput(() => { switchNote = ''; update(); });
  }
  mirrorBox?.addEventListener('change', () => { switchNote = ''; update(); });
  function setMode(m) {
    if (m === mode) return;
    convertTo(m);
    mode = m;
    showMode();
    update();
  }
  modeRow?.onChange(setMode);

  const cam = makeOrbitCamera({
    camera: sc.camera,
    render,
    home: { eye: [3, 3, 6], target: [0, 0, 0] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  showMode();
  update();
  return { model, sliders, panel: table, cam, input: cam, setMode };
}
