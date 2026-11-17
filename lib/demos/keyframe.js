// keyframe: keyframe animation at an intuitive level. THREE keyframe
// positions (amber markers); the animator sets only those. The computer
// makes every in-between frame: `t` scrubs 0..1 along the path, `ease`
// (labelled "path"; the id predates the timing control and the decks use it)
// switches HOW the in-betweens are computed: 0 = linear (straight hops,
// visible corner at the middle key) vs 1 = spline (a Catmull-Rom spline
// through the same three keys, no corner). `timing` retimes the same path:
// the position is path(s(t)) with s an easing function (none, smoothstep,
// smootherstep, cubic in-out), the deck's "Easing: the same path, retimed".
// Twenty-one dots mark equal steps of time along the active path, so a
// retiming is a picture: they bunch where the motion is slow. Both paths are
// drawn (active bright, other dim). The moving object is a small octahedron
// ("the gull"). Readout: the progress s and the interpolated position: t
// drives BOTH the readout cells and the pixels, satisfying the test-demos
// first-slider contract.
import * as THREE from '../vendor/three.module.js';
import { SliderRow, ButtonRow, ValueTable, makeButton } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const KEYS = [
  new THREE.Vector3(-2.2, 0.5, 0),
  new THREE.Vector3(0, 1.9, -0.6),
  new THREE.Vector3(2.2, 0.7, 0),
];

// t is a slider; ease (the path) and timing are rows of buttons.
const TIMINGS = ['none', 'smoothstep', 'smootherstep', 'cubic in-out'];
const PARAMS = {
  t: { label: 't', min: 0, max: 1, step: 0.01, value: 0.35, format: (v) => v.toFixed(2) },
  ease: { label: 'path', options: [{ label: 'linear', value: 0 }, { label: 'spline', value: 1 }], value: 0 },
  timing: { label: 'timing', options: TIMINGS.map((name, i) => ({ label: name, value: i })), value: 0 },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// The easing functions of the deck's slide: normalized time t in, normalized progress s out.
function easeProgress(timing, t) {
  if (timing === 1) return t * t * (3 - 2 * t);                          // smoothstep: 3t^2 - 2t^3
  if (timing === 2) return t * t * t * (t * (6 * t - 15) + 10);          // smootherstep: 6t^5 - 15t^4 + 10t^3
  if (timing === 3) return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(2 - 2 * t, 3) / 2; // cubic in-out
  return t;                                                              // none: s = t
}
const TICKS = 21;            // dots at t = 0, 0.05, ..., 1
const PLAY_SECONDS = 2.5;    // play runs t from 0 to 1 in this time

const ACTIVE = 0x00e58a;
const INACTIVE = 0x3a4152;
const KEY_COLOR = 0xffb400;

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Three <em>keyframes</em> (amber), the only positions an animator set,
  and the computer filling in every frame between them as <code>t</code>
  scrubs from 0 to 1. That fill-in is <em>interpolation</em>
  (in-betweening).</p>
  <h4>The concept</h4>
  <p>Animation is cheap to author because you pose only the key moments.
  But HOW the in-betweens are computed matters: straight lines between keys
  put a corner at every key (the motion visibly jerks); a smooth curve
  (a spline) through the same keys glides. Same three keyframes, two very
  different motions.</p>
  <p><code>timing</code> keeps the path and changes when each point of it is
  reached: the position is path(s(t)), with s an easing function. The small
  dots mark equal steps of time; where they bunch, the object moves slowly.
  With smoothstep it starts from rest and stops at rest (slow in, slow out).</p>
  <h4>Try this</h4>
  <p>Scrub <code>t</code> across the middle key with <code>path</code> on
  linear and watch the direction snap; flip <code>path</code> to spline and
  scrub again. Then press <code>play</code> with <code>timing</code> on none,
  and again on smoothstep. Drag to orbit; scroll to zoom.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

// Piecewise-linear position through the 3 keys (2 equal-time segments).
function linearPoint(t, out) {
  const u = Math.min(Math.max(t, 0), 1) * 2;
  const i = Math.min(1, Math.floor(u));
  const f = u - i;
  return out.copy(KEYS[i]).lerp(KEYS[i + 1], f);
}

/**
 * make(container, opts)
 * opts.stage === 'full' builds every control; otherwise opts.controls
 * (deck embeds expose t,ease, and t,ease,timing on the easing slide) selects them.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { t: PARAMS.t.value, ease: PARAMS.ease.value, timing: PARAMS.timing.value };

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

  // Keyframe markers.
  for (const k of KEYS) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 8),
      new THREE.MeshBasicMaterial({ color: KEY_COLOR })
    );
    m.position.copy(k);
    scene.add(m);
  }

  // The two paths: linear polyline, and a Catmull-Rom spline sampled fine.
  const spline = new THREE.CatmullRomCurve3(KEYS, false, 'catmullrom', 0.5);
  const linearLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(KEYS),
    new THREE.LineBasicMaterial({ color: ACTIVE })
  );
  const smoothLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(spline.getPoints(64)),
    new THREE.LineBasicMaterial({ color: INACTIVE })
  );
  scene.add(linearLine, smoothLine);

  // The moving object.
  const mover = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.18),
    new THREE.MeshPhongMaterial({ color: 0x6094d2, flatShading: true })
  );
  scene.add(mover);

  // Equal steps of time along the active path: they bunch where the timing is slow.
  const tickGeometry = new THREE.SphereGeometry(0.045, 8, 6);
  const tickMaterial = new THREE.MeshBasicMaterial({ color: 0xc7cdda });
  const ticks = [];
  for (let k = 0; k < TICKS; k++) {
    const m = new THREE.Mesh(tickGeometry, tickMaterial);
    scene.add(m);
    ticks.push(m);
  }

  const controlsCard = shell.addCard('controller: the animation');
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'keyframe');
  const sliders = {};
  for (const id of ids) {
    if (PARAMS[id].options) {
      sliders[id] = new ButtonRow(controlsCard, { id: `keyframe-${id}`, ...PARAMS[id] });
    } else {
      sliders[id] = new SliderRow(controlsCard, { id: `keyframe-${id}`, ...PARAMS[id] });
    }
  }
  const playButton = ids.includes('t') ? makeButton(controlsCard, 'play', togglePlay) : null;

  const readoutCard = shell.addCard('readout: this frame');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'mode', label: 'path', format: (v) => (v === 0 ? 'linear' : 'spline') },
      { id: 'timing', label: 'timing', format: (v) => TIMINGS[v] },
      { id: 's', label: 'progress s', format: (v) => v.toFixed(3) },
      { id: 'x', label: 'x', format: (v) => v.toFixed(2) },
      { id: 'y', label: 'y', format: (v) => v.toFixed(2) },
      { id: 'z', label: 'z', format: (v) => v.toFixed(2) },
    ],
  });

  const pos = new THREE.Vector3();

  function pathPoint(s, out) {
    const u = Math.min(1, Math.max(0, s));   // CatmullRomCurve3.getPoint throws below 0
    if (model.ease === 0) return linearPoint(u, out);
    return spline.getPoint(u, out);
  }

  function update() {
    const s = easeProgress(model.timing, model.t);
    pathPoint(s, pos);
    mover.position.copy(pos);
    for (let k = 0; k < TICKS; k++) pathPoint(easeProgress(model.timing, k / (TICKS - 1)), ticks[k].position);
    linearLine.material.color.setHex(model.ease === 0 ? ACTIVE : INACTIVE);
    smoothLine.material.color.setHex(model.ease === 1 ? ACTIVE : INACTIVE);
    table.update('mode', model.ease);
    table.update('timing', model.timing);
    table.update('s', s);
    table.update('x', pos.x);
    table.update('y', pos.y);
    table.update('z', pos.z);
    render();
  }

  // play: t runs from 0 (or from where it is) to 1 in PLAY_SECONDS, then stops.
  let playing = false;
  let lastTime = 0;
  function togglePlay() {
    playing = !playing;
    if (playButton) playButton.textContent = playing ? 'pause' : 'play';
    if (!playing) return;
    if (model.t >= 1) model.t = 0;
    lastTime = performance.now();
    requestAnimationFrame(playFrame);
  }
  function playFrame(now) {
    if (!playing) return;
    if (!container.isConnected) { playing = false; return; }
    // a frame's timestamp can be earlier than the click that started play (Chrome handles input inside a frame,
    // after the frame began), so the first step is never allowed to run backward
    model.t = Math.min(1, model.t + Math.max(0, now - lastTime) / 1000 / PLAY_SECONDS);
    lastTime = now;
    sliders.t?.set(model.t);
    update();
    if (model.t >= 1) {
      playing = false;
      if (playButton) playButton.textContent = 'play';
      return;
    }
    requestAnimationFrame(playFrame);
  }

  for (const id of ids) {
    if (PARAMS[id].options) {
      sliders[id].onChange((v) => {
        model[id] = v;
        update();
      });
    } else {
      sliders[id].onInput((v) => {
        model[id] = v;
        if (id === 't' && playing) togglePlay();
        update();
      });
    }
  }

  const cam = makeOrbitCamera({
    camera: sc.camera,
    render,
    home: { eye: [0.5, 2.2, 6], target: [0, 1, 0] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  update();
  return { model, sliders, cam, input: cam };
}
