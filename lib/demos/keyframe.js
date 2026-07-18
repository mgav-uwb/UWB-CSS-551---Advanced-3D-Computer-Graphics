// keyframe: keyframe animation at an intuitive level. THREE keyframe
// positions (amber markers); the animator sets only those. The computer
// makes every in-between frame: `t` scrubs 0..1 along the path, `ease`
// switches HOW the in-betweens are computed — 0 = linear (straight hops,
// visible corner at the middle key) vs 1 = smooth (a Catmull-Rom spline
// through the same three keys, no corner). Both paths are drawn (active
// bright, other dim) so the switch is a picture, not a claim. The moving
// object is a small octahedron ("the gull"). Readout: the interpolated
// position — t drives BOTH the readout cells and the pixels, satisfying the
// test-demos first-slider contract.
import * as THREE from '../vendor/three.module.js';
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const KEYS = [
  new THREE.Vector3(-2.2, 0.5, 0),
  new THREE.Vector3(0, 1.9, -0.6),
  new THREE.Vector3(2.2, 0.7, 0),
];

const PARAMS = {
  t: { label: 't', min: 0, max: 1, step: 0.01, value: 0.35, format: (v) => v.toFixed(2) },
  ease: { label: 'ease', min: 0, max: 1, step: 1, value: 0, format: (v) => (v === 0 ? 'linear' : 'smooth') },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const ACTIVE = 0x00e58a;
const INACTIVE = 0x3a4152;
const KEY_COLOR = 0xffb400;

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Three <em>keyframes</em> (amber) — the only positions an animator set —
  and the computer filling in every frame between them as <code>t</code>
  scrubs from 0 to 1. That fill-in is <em>interpolation</em>
  (in-betweening).</p>
  <h4>The concept</h4>
  <p>Animation is cheap to author because you pose only the key moments.
  But HOW the in-betweens are computed matters: straight lines between keys
  put a corner at every key (the motion visibly jerks); a smooth curve
  (a spline) through the same keys glides. Same three keyframes, two very
  different motions.</p>
  <h4>Try this</h4>
  <p>Scrub <code>t</code> across the middle key with <code>ease</code> on
  linear and watch the direction snap; flip <code>ease</code> to smooth and
  scrub again. Drag to orbit; scroll to zoom.</p>
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
 * opts.stage === 'full' builds both SliderRows; otherwise opts.controls
 * (deck embeds expose t,ease) selects them.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { t: PARAMS.t.value, ease: PARAMS.ease.value };

  const nav = { orbitSpeed: 0.4, zoomSpeed: 0.12, moveSpeed: 3, rollRate: 60 };
  const disp = { grid: true, axes: true };
  let grid, axes, render;

  const settingsFields = [
    { label: 'orbit', decimals: 2, title: 'Orbit sensitivity, deg per pixel of drag — default 0.4',
      getCurrent: () => nav.orbitSpeed, apply: (v) => { nav.orbitSpeed = clamp(v, 0.02, 2); } },
    { label: 'zoom', decimals: 2, title: 'Zoom step, fraction of distance per wheel notch — default 0.12',
      getCurrent: () => nav.zoomSpeed, apply: (v) => { nav.zoomSpeed = clamp(v, 0.02, 0.5); } },
    { label: 'move', decimals: 1, title: 'WASD move speed, units/sec — default 3',
      getCurrent: () => nav.moveSpeed, apply: (v) => { nav.moveSpeed = clamp(v, 0.1, 20); } },
    { label: 'roll', decimals: 0, title: 'Q/E roll rate, deg/sec while held — default 60',
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
    legend: 'drag orbit · scroll zoom · WASD move · Q/E roll · Space/Ctrl up·down',
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

  const controlsCard = shell.addCard('controller — the animation');
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'keyframe');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `keyframe-${id}`, ...PARAMS[id] });
  }

  const readoutCard = shell.addCard('readout — this frame');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'mode', label: 'mode', format: (v) => (v === 0 ? 'linear' : 'smooth') },
      { id: 'x', label: 'x', format: (v) => v.toFixed(2) },
      { id: 'y', label: 'y', format: (v) => v.toFixed(2) },
      { id: 'z', label: 'z', format: (v) => v.toFixed(2) },
    ],
  });

  const pos = new THREE.Vector3();

  function update() {
    if (model.ease === 0) {
      linearPoint(model.t, pos);
    } else {
      spline.getPoint(model.t, pos);
    }
    mover.position.copy(pos);
    linearLine.material.color.setHex(model.ease === 0 ? ACTIVE : INACTIVE);
    smoothLine.material.color.setHex(model.ease === 1 ? ACTIVE : INACTIVE);
    table.update('mode', model.ease);
    table.update('x', pos.x);
    table.update('y', pos.y);
    table.update('z', pos.z);
    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
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
