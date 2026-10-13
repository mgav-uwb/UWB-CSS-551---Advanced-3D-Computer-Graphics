// spin-step: S04 angular-velocity cockpit. A turntable spins at rate omega
// (a vector along +y). Two points start together at p = (1, 0, 0) and are
// advanced n = round(time * fps) steps by two rules:
//   linear:      p <- p + dt (omega x p)          (explicit Euler; leaves the circle)
//   quaternion:  q <- q_step q, p = q p0 q^-1     (stays on the circle)
// The picture is a pure function of the sliders: every change re-runs both
// trajectories from scratch (n is at most 2400 steps, cheap), so scrubbing
// time backward is exact. Play advances time with its own rAF loop.
// All rotation math: quatFromAxisAngle (xform.js), quatMul / quatRotate /
// quatNormalize / quatToMatrix (rot-reps.js), cross (xform.js).
import * as THREE from '../vendor/three.module.js';
import { cross, quatFromAxisAngle } from '../core/xform.js';
import { quatMul, quatRotate, quatNormalize, quatToMatrix } from '../core/rot-reps.js';
import { SliderRow, ValueTable, makeButton, makeRow } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const AXIS_COLOR = 0xffd166; // gold: the spin axis / omega
const LIN_COLOR = 0xff9a3c; // orange: linear step
const QUAT_COLOR = 0x35e0f0; // cyan: quaternion step
const V_COLOR = 0xf2f4f8; // near-white: v = omega x p
const OFF_SCALE = 8; // linear trail stops being drawn past this radius
const MAX_TIME = 20;
const V_SCALE = 0.5; // v arrows are drawn at half their true length to keep them in frame
const D2R = Math.PI / 180;

const PARAMS = {
  time: { label: 'time', min: 0, max: MAX_TIME, step: 0.05, value: 10, format: (v) => `${v.toFixed(2)} s` },
  rate: { label: 'rate', min: 10, max: 360, step: 5, value: 90, format: (v) => `${v.toFixed(0)}°/s` },
  fps: { label: 'fps', min: 4, max: 120, step: 1, value: 60, format: (v) => `${v.toFixed(0)}/s` },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmtLen = (v) => (v >= 1e4 ? v.toExponential(3) : v.toFixed(6));

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A turntable (the grey disk, radius 1) spinning about the vertical axis. The gold arrow is the
  angular velocity <b>ω</b>. Two points start together at p = (1, 0, 0) and are advanced one
  frame at a time by two different rules. Orange: the linear step. Cyan: the quaternion step.
  Each leaves a trail. The white arrow at each point is the velocity v = ω × p (drawn at half length). The red arrow is
  the one-step displacement v Δt, drawn at true length once it is long enough to see.</p>
  <h4>The idea</h4>
  <p><b>Angular velocity</b> ω is a vector: its direction is the spin axis, its length is the
  <b>rate</b> (radians per second; the slider shows degrees per second). A point p on the body moves
  with velocity v = ω × p, which is tangent to the point's circle.</p>
  <p><b>Δt</b> is the time between frames, 1 / fps. The <b>linear step</b> (explicit Euler) is
  p ← p + (ω × p) Δt. The step goes along the tangent, which is perpendicular to p, so by
  Pythagoras the new length is |p| √(1 + (ωΔt)²). That factor is greater than 1, so the point
  leaves the circle outward on every frame, and the error compounds: after n steps
  |p| = (1 + (ωΔt)²)^(n/2).</p>
  <p>The <b>quaternion step</b> rotates by the angle ωΔt about the axis: q_step = (sin(ωΔt/2) n,
  cos(ωΔt/2)), then q ← q_step q (renormalized), and p = q p₀ q⁻¹. A rotation never changes length,
  so the point stays on the circle for any step size.</p>
  <p>The slider <b>time</b> re-runs both rules from the start for n = round(time × fps) steps, so
  dragging it back and forth is exact. <b>Play</b> advances time in real time.</p>
  <h4>Try this</h4>
  <p>1. Defaults (rate 90, fps 60, time 10): n = 600, linear |p| = 1.2282: the orange trail has
  spiraled outward by about 23%, and the cyan point has not moved off the circle.</p>
  <p>2. Set time to 1: n = 60, linear |p| = 1.0208, quaternion |p| = 1.000000. The trails look
  identical at this scale; the readout still shows the 2% error.</p>
  <p>3. Set fps to 4 and time to 5: Δt = 0.25 s, n = 20, and the orange spiral is obvious.
  Compare the two |p| readouts with the predicted value.</p>
  <p>4. Set rate to 360 and watch the error grow much faster. If the orange point goes off scale,
  the readout still tracks it.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

// small canvas-texture label; align 'left' | 'right' | 'center' picks which side of
// the anchor point the text extends to
function makeLabel(text, color, align = 'left') {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 64;
  const g = cv.getContext('2d');
  g.font = 'bold 30px system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.textAlign = align;
  g.lineWidth = 5;
  g.strokeStyle = 'rgba(11,12,16,0.9)';
  g.fillStyle = color;
  const x = align === 'left' ? 8 : align === 'right' ? 248 : 128;
  g.strokeText(text, x, 32);
  g.fillText(text, x, 32);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(1.0, 0.25, 1);
  sp.center.set(align === 'left' ? 0 : align === 'right' ? 1 : 0.5, 0.5);
  sp.renderOrder = 10;
  return sp;
}

/** Both trajectories from scratch. Returns point lists and final states. */
export function simulate(rateDeg, fps, time) {
  const w = rateDeg * D2R;
  const dt = 1 / fps;
  const n = Math.round(time * fps);
  const omega = [0, w, 0];
  const p0 = [1, 0, 0];
  const qStep = quatFromAxisAngle(0, 1, 0, rateDeg * dt);

  let p = p0.slice();
  const lin = [p.slice()];
  let q = [0, 0, 0, 1];
  const quat = [p0.slice()];
  let pq = p0.slice();
  for (let i = 0; i < n; i++) {
    const v = cross(omega, p);
    p = [p[0] + dt * v[0], p[1] + dt * v[1], p[2] + dt * v[2]];
    lin.push(p);
    q = quatNormalize(quatMul(qStep, q));
    pq = quatRotate(q, p0);
    quat.push(pq);
  }
  return {
    n, dt, w, omega, lin, quat, pLin: p, pQuat: pq, q,
    predicted: Math.pow(1 + (w * dt) * (w * dt), n / 2),
  };
}

export function make(container, { stage = 'embed', controls } = {}) {
  const model = { time: PARAMS.time.value, rate: PARAMS.rate.value, fps: PARAMS.fps.value };

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

  // ---- static scene: turntable disk + reference circle -------------------
  const disk = new THREE.Mesh(
    new THREE.CircleGeometry(1, 96),
    new THREE.MeshBasicMaterial({ color: 0x2a3550, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }),
  );
  disk.rotation.x = -Math.PI / 2;
  disk.position.y = -0.004;
  scene.add(disk);
  const ringPts = [];
  for (let i = 0; i < 128; i++) ringPts.push(new THREE.Vector3(Math.cos((i / 128) * 2 * Math.PI), 0, Math.sin((i / 128) * 2 * Math.PI)));
  const ring = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineBasicMaterial({ color: 0x8fa0c8 }));
  scene.add(ring);

  // ---- dynamic scene objects ---------------------------------------------
  const omegaArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 1, AXIS_COLOR);
  scene.add(omegaArrow);
  const vLin = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 1, V_COLOR, 0.12, 0.07);
  const vQuat = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 1, V_COLOR, 0.12, 0.07);
  const stepArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 1, 0xff4d6d, 0.05, 0.03);
  scene.add(vLin, vQuat, stepArrow);

  const mkTrail = (color) => {
    const l = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color }));
    l.frustumCulled = false;
    scene.add(l);
    return l;
  };
  const trailLin = mkTrail(LIN_COLOR);
  const trailQuat = mkTrail(QUAT_COLOR);
  const radLin = mkTrail(LIN_COLOR);
  const radQuat = mkTrail(QUAT_COLOR);
  radLin.material.transparent = radQuat.material.transparent = true;
  radLin.material.opacity = radQuat.material.opacity = 0.45;

  const dotGeo = new THREE.SphereGeometry(0.05, 16, 12);
  const dotLin = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: LIN_COLOR }));
  const dotQuat = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: QUAT_COLOR }));
  scene.add(dotLin, dotQuat);

  // the spinning object on the turntable, riding the quaternion point
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.12, 0.2),
    [0xff5555, 0xff9955, 0x55ff88, 0x55ffee, 0x5588ff, 0xcc55ff].map((color) => new THREE.MeshStandardMaterial({ color })),
  );
  box.matrixAutoUpdate = false;
  scene.add(box);

  const lblOmega = makeLabel('ω', '#ffd166', 'right');
  const lblV = makeLabel('v = ω × p', '#f2f4f8', 'left');
  const lblLin = makeLabel('linear step', '#ff9a3c', 'left');
  const lblQuat = makeLabel('quaternion step', '#35e0f0', 'right');
  scene.add(lblOmega, lblV, lblLin, lblQuat);

  function setPolyline(line, pts) {
    const arr = new Float32Array(pts.length * 3);
    pts.forEach((p, i) => { arr[3 * i] = p[0]; arr[3 * i + 1] = 0.006; arr[3 * i + 2] = p[2]; });
    line.geometry.dispose();
    line.geometry = new THREE.BufferGeometry();
    line.geometry.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  }

  function setArrow(arrow, origin, vec) {
    const len = Math.hypot(vec[0], vec[1], vec[2]);
    if (len < 1e-6 || !Number.isFinite(len)) { arrow.visible = false; return; }
    arrow.visible = true;
    arrow.position.set(origin[0], 0.006, origin[2]);
    arrow.setDirection(new THREE.Vector3(vec[0] / len, vec[1] / len, vec[2] / len));
    arrow.setLength(len, Math.min(0.12, len * 0.5), Math.min(0.07, len * 0.3));
  }

  // ---- rail -----------------------------------------------------------------
  const spinCard = shell.addCard('Spin');
  const readoutCard = shell.addCard('Readout');

  const wanted = controls ?? ['time', 'rate', 'fps', 'play'];
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, wanted.filter((c) => c !== 'play'), 'spin-step');
  const showPlay = stage === 'full' || wanted.includes('play');
  const sliders = {};
  for (const id of ids) sliders[id] = new SliderRow(spinCard, { id: `spin-step-${id}`, ...PARAMS[id] });

  let playing = false;
  let raf = 0;
  let lastTs = 0;
  let playBtn;
  if (showPlay) {
    const row = makeRow(spinCard);
    playBtn = makeButton(row, 'Play', () => { playing ? stopPlay() : startPlay(); playBtn.blur(); });
    makeButton(row, 'Reset', () => { stopPlay(); setTime(0); });
  }

  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'n', label: 'steps n', format: (v) => v.toFixed(0) },
      { id: 'dt', label: 'Δt (s)', format: (v) => v.toFixed(4) },
      { id: 'lin', label: 'linear |p|', className: 'row-u', format: fmtLen },
      { id: 'quat', label: 'quat |p|', className: 'row-w', format: fmtLen },
      { id: 'pred', label: 'predicted', className: 'row-h', format: fmtLen },
      { id: 'omega', label: 'ω rad/s', format: () => vecText.omega },
      { id: 'v0', label: 'v at start', format: () => vecText.v0 },
    ],
  });
  readoutCard.querySelectorAll('td').forEach((td) => { td.style.whiteSpace = 'nowrap'; });
  const vecText = { omega: '', v0: '' };
  const hint = document.createElement('p');
  hint.className = 'demo-hint';
  hint.style.cssText = 'color:#ff9a3c;font-size:12px;margin:6px 0 0';
  readoutCard.appendChild(hint);

  // ---- update ---------------------------------------------------------------
  function update() {
    const s = simulate(model.rate, model.fps, model.time);

    // linear trail: clip once it leaves the drawing scale
    let cut = s.lin.length;
    for (let i = 0; i < s.lin.length; i++) {
      if (Math.hypot(s.lin[i][0], s.lin[i][2]) > OFF_SCALE) { cut = i; break; }
    }
    const offScale = cut < s.lin.length;
    setPolyline(trailLin, s.lin.slice(0, cut));
    setPolyline(trailQuat, s.quat);
    const pl = offScale ? s.lin[cut - 1] : s.pLin;
    const pq = s.pQuat;
    setPolyline(radLin, [[0, 0, 0], pl]);
    setPolyline(radQuat, [[0, 0, 0], pq]);
    dotLin.position.set(pl[0], 0.006, pl[2]);
    dotQuat.position.set(pq[0], 0.006, pq[2]);

    // box rides the quaternion point, oriented by the accumulated rotation
    const M = quatToMatrix(s.q);
    M[12] = pq[0]; M[13] = 0.06; M[14] = pq[2];
    box.matrix.fromArray(M);

    const wLen = Math.max(0.15, s.w / 2); // arrow length proportional to the rate (1 rad/s = 0.5 unit)
    omegaArrow.setLength(wLen, Math.min(0.22, wLen * 0.45), Math.min(0.12, wLen * 0.25));
    lblOmega.position.set(-0.06, wLen + 0.05, 0);

    const vL = cross(s.omega, offScale ? pl : s.pLin);
    const vQ = cross(s.omega, pq);
    setArrow(vLin, pl, vL.map((x) => x * V_SCALE));
    setArrow(vQuat, pq, vQ.map((x) => x * V_SCALE));
    setArrow(stepArrow, pl, [vL[0] * s.dt, 0, vL[2] * s.dt]);
    stepArrow.visible = stepArrow.visible && !offScale && Math.hypot(vL[0], vL[2]) * s.dt > 0.02;

    lblV.position.set(pq[0] + vQ[0] * V_SCALE * 0.5 + 0.05, 0.25, pq[2] + vQ[2] * V_SCALE * 0.5);
    lblLin.position.set(pl[0] + 0.1, 0.2, pl[2] + 0.1);
    lblQuat.position.set(pq[0] - 0.1, -0.02, pq[2] - 0.1);

    table.update('n', s.n);
    table.update('dt', s.dt);
    table.update('lin', Math.hypot(s.pLin[0], s.pLin[1], s.pLin[2]));
    table.update('quat', Math.hypot(pq[0], pq[1], pq[2]));
    table.update('pred', s.predicted);
    const f3 = (a) => `(${a.map((x) => +x.toFixed(3)).join(', ')})`;
    vecText.omega = f3(s.omega);
    vecText.v0 = f3(cross(s.omega, [1, 0, 0]));
    table.update('omega', 0);
    table.update('v0', 0);
    hint.textContent = offScale ? `Linear point is off scale (r > ${OFF_SCALE}); the readout still tracks it.` : '';

    render();
  }

  function setTime(t) {
    model.time = clamp(t, 0, MAX_TIME);
    if (sliders.time) {
      sliders.time.input.value = String(model.time);
      sliders.time.readout.textContent = PARAMS.time.format(model.time);
    }
    update();
  }

  // ---- Play: own rAF loop, stops at MAX_TIME or on Pause ---------------------
  function frame(ts) {
    if (!playing) return;
    const dtReal = Math.min(0.1, (ts - lastTs) / 1000);
    lastTs = ts;
    setTime(model.time + dtReal);
    if (model.time >= MAX_TIME) { stopPlay(); return; }
    raf = requestAnimationFrame(frame);
  }
  function startPlay() {
    if (model.time >= MAX_TIME) setTime(0);
    playing = true;
    if (playBtn) playBtn.textContent = 'Pause';
    lastTs = performance.now();
    raf = requestAnimationFrame(frame);
  }
  function stopPlay() {
    playing = false;
    cancelAnimationFrame(raf);
    if (playBtn) playBtn.textContent = 'Play';
  }

  for (const id of ids) {
    sliders[id].onInput((v) => { model[id] = v; update(); });
  }

  const cam = makeOrbitCamera({
    camera: sc.camera,
    render,
    home: { eye: [1.5, 2.4, 2.1], target: [0, 0.15, 0] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  update();
  return { model, sliders, cam, input: cam, play: startPlay, pause: stopPlay };
}
