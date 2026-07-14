// dot-cross: the S02 vectors cockpit. ONE model {ax,ay,az,bx,by,bz}, a
// controller of SliderRows, and a view built from the same a/b: three
// ArrowHelpers (a red, b blue, a×b green) plus a dashed projection of a
// onto b (amber, along b) with a thin dashed drop connector back to a's
// tip, and a ValueTable readout (a·b, |a|, |b|, θ°, a×b). Uses dot/cross/
// normalize/sub from xform.js — no new vector math here.
//
// Mounted into the shared demo-shell (scene-dominant layout + "?"/"⚙"/legend
// + reveal.js-safe embed gate) and driven by the free-look orbit camera
// (drag orbit, scroll zoom, WASD fly) — see mvc-transform.js for the
// reference shape this binding mirrors.
import * as THREE from '../vendor/three.module.js';
import { dot, cross, normalize, sub } from '../core/xform.js';
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const EPS = 1e-6;
const ORIGIN = new THREE.Vector3(0, 0, 0);

const COLOR_A = 0xff7b72; // red family
const COLOR_B = 0x79c0ff; // blue family
const COLOR_CROSS = 0x7ee787; // green
const COLOR_PROJ = 0xffa657; // amber — distinct from a/b/cross
const COLOR_DROP = 0x8b93a7; // muted gray connector

const PARAMS = {
  ax: { label: 'ax', min: -3, max: 3, step: 0.1, value: 2, format: (v) => v.toFixed(1) },
  ay: { label: 'ay', min: -3, max: 3, step: 0.1, value: 1, format: (v) => v.toFixed(1) },
  az: { label: 'az', min: -3, max: 3, step: 0.1, value: 0, format: (v) => v.toFixed(1) },
  bx: { label: 'bx', min: -3, max: 3, step: 0.1, value: 1, format: (v) => v.toFixed(1) },
  by: { label: 'by', min: -3, max: 3, step: 0.1, value: 2, format: (v) => v.toFixed(1) },
  bz: { label: 'bz', min: -3, max: 3, step: 0.1, value: 1, format: (v) => v.toFixed(1) },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Two 3D vectors <code>a</code> and <code>b</code>, their dot product, and
  their cross product vector.</p>
  <h4>The concept</h4>
  <p>The dot product <code>a·b = |a||b|cosθ</code> measures how much the
  vectors align (projection / angle). The cross product <code>a×b</code> is
  perpendicular to both, with length <code>|a||b|sinθ</code> (the area of
  their parallelogram; its direction is the surface normal).</p>
  <h4>Try this</h4>
  <p>Make the two vectors parallel: the dot product maxes out and the cross
  product shrinks to zero. Make them perpendicular: the dot product goes to
  zero and the cross product is largest. Drag to orbit; scroll to zoom.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

/**
 * make(container, opts)
 * opts.stage === 'full' builds all six SliderRows plus a "show projection"
 * checkbox (default on). Otherwise opts.controls (array of param ids)
 * selects which SliderRows to build — embed stage never gets the toggle,
 * but the projection still renders (it defaults to shown).
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = {};
  for (const id of Object.keys(PARAMS)) model[id] = PARAMS[id].value;
  let showProjection = true;

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

  // Rail cards: the controller (Vectors sliders + projection toggle) and the
  // second view (the scalar/vector readout table).
  const vectorsCard = shell.addCard('Vectors');
  const readoutCard = shell.addCard('Readout');

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'dot-cross');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(vectorsCard, { id: `dot-cross-${id}`, ...PARAMS[id] });
  }

  let projCheckbox;
  if (stage === 'full') {
    const row = document.createElement('label');
    row.className = 'slider-row';
    projCheckbox = document.createElement('input');
    projCheckbox.type = 'checkbox';
    projCheckbox.id = 'dot-cross-projection';
    projCheckbox.checked = showProjection;
    const text = document.createElement('span');
    text.className = 'slider-label';
    text.textContent = 'show projection';
    row.append(projCheckbox, text);
    vectorsCard.appendChild(row);
    projCheckbox.addEventListener('change', () => {
      showProjection = projCheckbox.checked;
      update();
    });
  }

  const panel = new ValueTable(readoutCard, {
    rows: [
      { id: 'dot', label: 'a·b', className: 'row-h' },
      { id: 'lenA', label: '|a|', className: 'row-u' },
      { id: 'lenB', label: '|b|', className: 'row-w' },
      {
        id: 'theta',
        label: 'θ',
        className: 'row-h',
        format: (v) => (Number.isFinite(v) ? `${v.toFixed(2)}°` : '—'),
      },
      { id: 'cross', label: 'a×b', cols: 3, className: 'row-v' },
    ],
  });

  let vizGroup = null;

  function clearViz() {
    if (vizGroup) {
      scene.remove(vizGroup);
      vizGroup.children.forEach((obj) => {
        if (typeof obj.dispose === 'function') obj.dispose();
        obj.geometry?.dispose();
        obj.material?.dispose();
      });
      vizGroup = null;
    }
  }

  function update() {
    const a = [model.ax, model.ay, model.az];
    const b = [model.bx, model.by, model.bz];

    const d = dot(a, b);
    const lenA = Math.hypot(...a);
    const lenB = Math.hypot(...b);
    const denom = lenA * lenB;
    const cosTheta = denom > EPS ? Math.min(1, Math.max(-1, d / denom)) : NaN;
    const thetaDeg = Number.isFinite(cosTheta) ? Math.acos(cosTheta) * (180 / Math.PI) : NaN;
    const c = cross(a, b);

    panel.update('dot', d);
    panel.update('lenA', lenA);
    panel.update('lenB', lenB);
    panel.update('theta', thetaDeg);
    panel.update('cross', c);

    clearViz();
    vizGroup = new THREE.Group();

    if (lenA > EPS) {
      vizGroup.add(new THREE.ArrowHelper(new THREE.Vector3(...normalize(a)), ORIGIN, lenA, COLOR_A));
    }
    if (lenB > EPS) {
      vizGroup.add(new THREE.ArrowHelper(new THREE.Vector3(...normalize(b)), ORIGIN, lenB, COLOR_B));
    }
    const lenC = Math.hypot(...c);
    if (lenC > EPS) {
      vizGroup.add(new THREE.ArrowHelper(new THREE.Vector3(...normalize(c)), ORIGIN, lenC, COLOR_CROSS));
    }

    if (showProjection && lenB > EPS) {
      // proj_b(a) = (a·b / b·b) b — the scalar projection scaled onto b.
      const t = d / (lenB * lenB);
      const proj = b.map((v) => v * t);

      const projGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(...proj),
      ]);
      const projMat = new THREE.LineDashedMaterial({ color: COLOR_PROJ, dashSize: 0.15, gapSize: 0.1 });
      const projLine = new THREE.Line(projGeom, projMat);
      projLine.computeLineDistances();
      vizGroup.add(projLine);

      // Thin dashed drop connector from the projection point back to a's
      // tip — the classic "foot of the perpendicular" diagram. Skipped when
      // a already lies on b (drop length ~0) to avoid a degenerate line.
      const dropVec = sub(a, proj);
      const dropLen = Math.hypot(...dropVec);
      if (dropLen > EPS) {
        const dropGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...proj),
          new THREE.Vector3(...a),
        ]);
        const dropMat = new THREE.LineDashedMaterial({ color: COLOR_DROP, dashSize: 0.08, gapSize: 0.06 });
        const dropLine = new THREE.Line(dropGeom, dropMat);
        dropLine.computeLineDistances();
        vizGroup.add(dropLine);
      }
    }

    scene.add(vizGroup);
    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
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
