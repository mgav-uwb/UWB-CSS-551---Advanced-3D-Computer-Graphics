// trs-order: the S04 matrix-composition cockpit. ONE model {tx, ry}, plus a
// rotate/scale mode toggle, and two identical marked cubes built from the
// SAME factors matMul'd in opposite orders — "same factors, different
// order" is the whole point. Rotate mode: T = makeTRS(tx,0,0, 0,0,0,1,1,1),
// R = makeTRS(0,0,0, 0,ry,0, 1,1,1); left = matMul(T,R), right = matMul(R,T).
// Scale mode: second factor is S = makeTRS(0,0,0,0,0,0,s,s,s) with
// s = 1 + tx/3 (the tx slider doubles as S's scalar; ry is unused in this
// mode — see the cockpit caption). Uses matMul + makeTRS from xform.js; no
// new matrix math lives here. The left/right world-space offset (+-2 in x)
// is an OUTER positioning convenience via THREE.Group.position — NOT part
// of the taught T/R/S composition, so it never touches matMul/makeTRS.
// Ground radius markers were left out: scene-shell's GridHelper already
// reads as ground reference and a radius ring added little for the line
// budget here.
//
// Mounts into the shared demo-shell (scene-dominant layout + "?"/"⚙"/legend)
// and drives a free-look orbit camera (drag orbit, scroll zoom, WASD fly) —
// see mvc-transform.js for the template this binding mirrors. The demo's own
// model controls (sliders + the T·R/R·T mode toggle) live in rail cards;
// "⚙" holds ONLY view/nav knobs (speeds + grid/axes toggles).
import * as THREE from '../vendor/three.module.js';
import { makeTRS, matMul } from '../core/xform.js';
import { SliderRow, Mat4Panel } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const OUTER_OFFSET = 2; // outer positioning offset (see file header) — not a taught matrix.

// BoxGeometry material array order is [+x, -x, +y, -y, +z, -z] — distinct
// colors so each cube's orientation stays legible under both R and S.
const FACE_COLORS = [0xff5555, 0xff9955, 0x55ff88, 0x55ffee, 0x5588ff, 0xcc55ff];

// Order here is also the "full stage" slider order; tx (first) is what
// tools/test-demos.mjs drives as the platform smoke test.
const PARAMS = {
  tx: { label: 'tx', min: 0, max: 3, step: 0.1, value: 1.5, format: (v) => v.toFixed(2) },
  ry: { label: 'ry', min: 0, max: 180, step: 1, value: 60, format: (v) => `${v.toFixed(0)}°` },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>The same transform components composed in two different orders — e.g.
  <code>T·R</code> (rotate first, then translate) versus <code>R·T</code>
  (translate first, then rotate) — landing the object in two different
  places.</p>
  <h4>The concept</h4>
  <p>Matrix multiplication is NOT commutative: order changes the result.
  Reading right-to-left, the rightmost matrix is applied to the geometry
  first.</p>
  <h4>Try this</h4>
  <p>Pick a translation and a rotation, then flip the order toggle with the
  SAME numbers and watch the object move to a different spot. Drag to orbit;
  scroll to zoom.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

function makeCube() {
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    FACE_COLORS.map((color) => new THREE.MeshStandardMaterial({ color })),
  );
  cube.matrixAutoUpdate = false;
  return cube;
}

function labeledPanel(container, text) {
  const label = document.createElement('p');
  label.className = 'demo-hint';
  label.style.cssText = 'margin:10px 0 2px;color:#8b93a7;font-size:12px;';
  label.textContent = text;
  container.appendChild(label);
  return new Mat4Panel(container);
}

/**
 * make(container, opts)
 * opts.stage === 'full' builds both SliderRows plus a rotate/scale mode
 * toggle (radio: T·R/R·T vs T·S/S·T). Otherwise opts.controls (array of
 * param ids) selects which SliderRows to build — embed stage stays in
 * rotate mode.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { tx: PARAMS.tx.value, ry: PARAMS.ry.value };
  let scaleMode = false;

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

  const leftGroup = new THREE.Group();
  leftGroup.position.set(-OUTER_OFFSET, 0, 0); // outer offset, see file header
  const rightGroup = new THREE.Group();
  rightGroup.position.set(OUTER_OFFSET, 0, 0); // outer offset, see file header
  const leftCube = makeCube();
  const rightCube = makeCube();
  leftGroup.add(leftCube);
  rightGroup.add(rightCube);
  scene.add(leftGroup, rightGroup);

  // Rail cards: the controller (sliders + order toggle) and the readouts
  // (the two composed matrices plus their two factors).
  const controlsCard = shell.addCard('Controls');
  const matrixCard = shell.addCard('Matrices');

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'trs-order');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `trs-order-${id}`, ...PARAMS[id] });
  }

  if (stage === 'full') {
    const row = document.createElement('div');
    row.className = 'slider-row';
    for (const [val, text] of [['rotate', 'T·R / R·T'], ['scale', 'T·S / S·T']]) {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'trs-order-mode';
      radio.value = val;
      radio.checked = val === 'rotate';
      radio.addEventListener('change', () => {
        scaleMode = val === 'scale';
        update();
      });
      const span = document.createElement('span');
      span.className = 'slider-label';
      span.textContent = text;
      label.append(radio, span);
      row.appendChild(label);
    }
    controlsCard.appendChild(row);
  }

  const leftPanel = labeledPanel(matrixCard, 'left = T·B');
  const rightPanel = labeledPanel(matrixCard, 'right = B·T');
  const factorTPanel = labeledPanel(matrixCard, 'factor T');
  const factorBPanel = labeledPanel(matrixCard, 'factor B (R in rotate mode, S in scale mode)');
  const caption = document.createElement('p');
  caption.className = 'demo-hint';
  caption.style.cssText = 'margin:10px 0 0;color:#8b93a7;font-size:12px;';
  caption.textContent =
    "same factors, different order — scale mode reuses tx as S's scalar s = 1 + tx/3; ry is ignored in scale mode";
  matrixCard.appendChild(caption);

  function update() {
    const T = makeTRS(model.tx, 0, 0, 0, 0, 0, 1, 1, 1);
    const s = 1 + model.tx / 3;
    const B = scaleMode ? makeTRS(0, 0, 0, 0, 0, 0, s, s, s) : makeTRS(0, 0, 0, 0, model.ry, 0, 1, 1, 1);

    const TB = matMul(T, B);
    const BT = matMul(B, T);

    leftCube.matrix.fromArray(TB);
    rightCube.matrix.fromArray(BT);

    leftPanel.update(TB);
    rightPanel.update(BT);
    factorTPanel.update(T);
    factorBPanel.update(B);

    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
  }

  // Free-look orbit camera: framed like the old fixed camera (eye (3,3,6),
  // looking at the origin) — the same default scene-shell used before this
  // rebind. Home restores that view.
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
  return { model, sliders, panel: leftPanel, cam, input: cam };
}
