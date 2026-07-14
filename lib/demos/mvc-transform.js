// mvc-transform: the MVC teaching demo, and the demo-platform smoke test.
// ONE model {tx, ry, s} (translate-x, rotate-y degrees, uniform scale), a
// controller of SliderRows, and TWO views built from the same matrix:
// a 3D cube (matrixAutoUpdate=false — the model drives the matrix, not the
// other way around) and a Mat4Panel readout of that same matrix.
//
// This is also the reference TEMPLATE for every cockpit demo's shell binding:
// mount into a shared demo-shell (scene-dominant layout + "?"/"⚙"/legend +
// reveal.js-safe embed gate) and drive a free-look orbit camera (drag orbit,
// scroll zoom, WASD fly). The demo's own model/controls live in rail cards;
// "⚙" holds ONLY view/nav knobs (speeds + grid/axes toggles).
import * as THREE from '../vendor/three.module.js';
import { makeTRS } from '../core/xform.js';
import { SliderRow, Mat4Panel } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

// Order here is also the "full stage" slider order, and mvc-transform's
// first slider (tx) is what tools/test-demos.mjs drives as the platform
// smoke test.
const PARAMS = {
  tx: { label: 'tx', min: -4, max: 4, step: 0.1, value: 0, format: (v) => v.toFixed(2) },
  ry: { label: 'ry', min: 0, max: 360, step: 1, value: 0, format: (v) => `${v.toFixed(0)}°` },
  s: { label: 's', min: 0.25, max: 2.5, step: 0.05, value: 1, format: (v) => v.toFixed(2) },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>One model — three numbers <code>{tx, ry, s}</code> — driving TWO views at
  once: a 3D cube and the exact 4×4 matrix built from those numbers. Move a
  slider and both update in lockstep, because they read the SAME matrix.</p>
  <h4>The concept</h4>
  <p>Model–View–Controller. The sliders are the controller; the model is the
  three numbers; each view is a pure function of that model. No view owns any
  state of its own — the cube's <code>matrixAutoUpdate</code> is off, so the
  model drives the matrix, never the reverse.</p>
  <h4>The math</h4>
  <p>The matrix is <code>M = T(tx,0,0) · R<sub>y</sub>(ry) · S(s,s,s)</code>
  (column-major). The panel shows M's 16 entries live; the cube is drawn with
  exactly that matrix.</p>
  <h4>Try this</h4>
  <p>Set <code>s = 0.25</code>, then raise <code>ry</code>: the shrunken cube
  still rotates — the matrix panel shows why (the rotation columns stay
  non-zero even as scale shrinks the geometry). Drag in the scene to orbit;
  scroll to zoom.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

/**
 * make(container, opts)
 * opts.stage === 'full' builds all three SliderRows (the full sandbox).
 * Otherwise opts.controls (array of param ids, e.g. ['ry']) selects which
 * SliderRows to build — the two views (cube + Mat4Panel) are always built.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { tx: PARAMS.tx.value, ry: PARAMS.ry.value, s: PARAMS.s.value };

  // Nav speeds (shared live object: the orbit camera and the "⚙" fields read/
  // write the SAME object) + display-toggle state. `grid`/`axes`/`render` are
  // assigned once the scene is built below; the toggle apply() closures run
  // only on user interaction (after that), so referencing them is safe.
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

  // The three.js scene fills the shell's scene pane (fill:true) instead of a
  // fixed 400×300 box — that's what makes it scene-dominant.
  const sc = makeScene(shell.sceneEl, { fill: true });
  const { scene } = sc;
  ({ grid, axes, render } = sc);

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x5cd47a }),
  );
  cube.matrixAutoUpdate = false;
  scene.add(cube);

  // Rail cards: the controller (Model sliders) and the second view (Matrix).
  const modelCard = shell.addCard('Model');
  const matrixCard = shell.addCard('Matrix');

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'mvc-transform');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(modelCard, { id: `mvc-${id}`, ...PARAMS[id] });
  }
  const panel = new Mat4Panel(matrixCard);

  function update() {
    const M = makeTRS(model.tx, 0, 0, 0, model.ry, 0, model.s, model.s, model.s);
    cube.matrix.fromArray(M);
    panel.update(M);
    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => { model[id] = v; update(); });
  }

  // Free-look orbit camera: framed like the old fixed camera (eye (3,3,6),
  // looking at the origin). Home restores that view.
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

  update();
  return { model, sliders, panel, cam, input: cam };
}
