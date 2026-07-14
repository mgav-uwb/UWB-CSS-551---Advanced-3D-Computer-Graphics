// scene-graph: the S05 hand-built scene-graph cockpit. THREE rigid nodes —
// base -> arm -> hand — added FLAT to the scene (NO three.js parenting;
// matrixAutoUpdate=false on every mesh). World matrices are composed by hand
// through OUR matMul chain, never by scene-graph parenting:
//   W_base = L_base
//   W_arm  = matMul(W_base, L_arm)
//   W_hand = matMul(W_arm,  L_hand)
//
// Local matrices (all built from makeTRS + matMul — see xform.js):
//   L_base = makeTRS(0, 0.2, 0,   0, baseRy, 0,   1,1,1)
//     — lifts the box (half-height BASE_HALF=0.2) onto the ground plane and
//     yaws it about its own vertical center. A single TRS call suffices
//     because the base rotates about its own center.
//   L_arm  = T_joint * T_lift * R_bend * T_pivot, i.e.
//       T_joint = makeTRS(0, BASE_HALF, 0, 0,0,0, 1,1,1)   // base's top surface, in base-local space
//       T_lift  = makeTRS(0, armT,      0, 0,0,0, 1,1,1)   // extra joint gap (armT param) — pure translation composing through the chain
//       R_bend  = makeTRS(0, 0, 0,       0,0,armBend, 1,1,1) // hinge rotation about z, applied AT the joint (still the origin)
//       T_pivot = makeTRS(0, ARM_HALF,  0, 0,0,0, 1,1,1)   // shift the centered arm box so its LOWER end sits at the joint
//     chained left-to-right with matMul (never a single makeTRS call — a
//     plain T*R*S can't put a rotation BETWEEN two translations, and "pivot
//     about an endpoint, not the center" is exactly that shape).
//   L_hand = makeTRS(0, ARM_HALF, 0,   0, handRy, 0,   1,1,1)
//     — ARM_HALF (0.7) is the arm's OWN half-length: in the arm's local
//     (box) space that is exactly its tip, so the hand rides the arm's tip
//     through whatever L_arm does, and twists in place about its own
//     center (handRy, about y). A single TRS call suffices for the same
//     reason as the base.
//
// Params: baseRy (0-360, yaw about y), armBend (0-120, hinge about z),
// handRy (0-180, wrist twist about y), armT (0-0.6, extra joint gap —
// the pure-translation param). Full stage: a node radio (base/arm/hand)
// selects which node's Mat4Panel + highlighted breadcrumb prefix is shown.
// Embed stage: no selector — always shows the hand (the full chain's
// leaf), captioned as such.
//
// Mounted into the shared demo-shell (scene-dominant layout + "?"/"⚙"/legend
// + reveal.js-safe embed gate) and driven by the free-look orbit camera
// (drag orbit, scroll zoom, WASD fly) — see mvc-transform.js for the
// reference shape this binding mirrors. The joint sliders + node selector
// live in rail cards; "⚙" holds ONLY view/nav knobs (speeds + grid/axes
// toggles).
import * as THREE from '../vendor/three.module.js';
import { makeTRS, matMul } from '../core/xform.js';
import { SliderRow, Mat4Panel } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const BASE_HALF = 0.2; // base box half-height (1.2 x 0.4 x 1.2), also its lift-onto-ground and joint offset
const ARM_HALF = 0.7; // arm box half-length (0.25 x 1.4 x 0.25), also its pivot offset and tip offset

const NODE_ORDER = ['base', 'arm', 'hand'];

// Order here is also the "full stage" slider order; baseRy (first) is what
// tools/test-demos.mjs drives as the platform smoke test — dragging it away
// from its default (30) changes W_base (the default-selected node's panel)
// and, since the base box isn't 90-degree-symmetric relative to the
// oblique camera + directional light, the rendered pixels too.
const PARAMS = {
  baseRy: { label: 'baseRy', min: 0, max: 360, step: 1, value: 30, format: (v) => `${v.toFixed(0)}°` },
  armBend: { label: 'armBend', min: 0, max: 120, step: 1, value: 40, format: (v) => `${v.toFixed(0)}°` },
  handRy: { label: 'handRy', min: 0, max: 180, step: 1, value: 0, format: (v) => `${v.toFixed(0)}°` },
  armT: { label: 'armT', min: 0, max: 0.6, step: 0.02, value: 0, format: (v) => v.toFixed(2) },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function makeBox(w, h, d, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color }));
  mesh.matrixAutoUpdate = false;
  return mesh;
}

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A hand-built base → arm → hand kinematic chain, where each joint's world
  matrix is its parent's world matrix times its own local TRS.</p>
  <h4>The concept</h4>
  <p>A scene graph composes transforms down a hierarchy:
  <code>worldChild = worldParent · localChild</code>. Moving a parent moves
  everything below it; moving a child is local.</p>
  <h4>Try this</h4>
  <p>Rotate the base and the whole arm swings; rotate the hand and only the
  hand moves. Drag to orbit; scroll to zoom.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

/**
 * make(container, opts)
 * opts.stage === 'full' builds all four SliderRows plus a base/arm/hand
 * node-selector radio row (the Mat4Panel + breadcrumb track the selection).
 * Otherwise opts.controls (array of param ids) selects which SliderRows to
 * build — embed stage never gets the selector and always shows the hand.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = {
    baseRy: PARAMS.baseRy.value,
    armBend: PARAMS.armBend.value,
    handRy: PARAMS.handRy.value,
    armT: PARAMS.armT.value,
  };
  let selected = 'base'; // full-stage node selector only; embed is pinned to 'hand' regardless

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

  const baseMesh = makeBox(1.2, 0.4, 1.2, 0x5588ff);
  const armMesh = makeBox(0.25, 1.4, 0.25, 0xff9955);
  const handMesh = makeBox(0.5, 0.25, 0.25, 0x55ff88);
  // FLAT scene — all three meshes added directly, no THREE.Group/parenting.
  // World placement comes entirely from the matMul chain in update() below.
  scene.add(baseMesh, armMesh, handMesh);

  // Rail cards: the controller (joint sliders + node selector) and the
  // Matrix readout (Mat4Panel + breadcrumb).
  const controlsCard = shell.addCard('Controls');
  const matrixCard = shell.addCard('Matrix');

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'scene-graph');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `scene-graph-${id}`, ...PARAMS[id] });
  }

  if (stage === 'full') {
    const row = document.createElement('div');
    row.className = 'slider-row';
    for (const val of NODE_ORDER) {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'scene-graph-node';
      radio.value = val;
      radio.checked = val === selected;
      radio.addEventListener('change', () => {
        selected = val;
        update();
      });
      const span = document.createElement('span');
      span.className = 'slider-label';
      span.textContent = val;
      label.append(radio, span);
      row.appendChild(label);
    }
    controlsCard.appendChild(row);
  }

  const matPanel = new Mat4Panel(matrixCard);
  const breadcrumbEl = document.createElement('p');
  breadcrumbEl.className = 'demo-hint';
  breadcrumbEl.style.cssText = 'margin:10px 0 0;font-size:13px;';
  matrixCard.appendChild(breadcrumbEl);
  const captionEl = document.createElement('p');
  captionEl.className = 'demo-hint';
  captionEl.style.cssText = 'margin:4px 0 0;color:#8b93a7;font-size:12px;';
  captionEl.textContent =
    stage === 'full'
      ? ''
      : "panel shows the hand's world matrix — the full chain's leaf (W_hand = matMul(W_arm, L_hand))";
  matrixCard.appendChild(captionEl);

  const FACTOR_LABELS = { base: 'L_base', arm: 'L_arm', hand: 'L_hand' };

  function renderBreadcrumb() {
    const cut = stage === 'full' ? NODE_ORDER.indexOf(selected) : 2; // embed: always the full chain (hand)
    breadcrumbEl.innerHTML = '';
    breadcrumbEl.append('W = ');
    NODE_ORDER.forEach((id, i) => {
      const span = document.createElement('span');
      span.textContent = FACTOR_LABELS[id];
      span.style.cssText = i <= cut ? 'color:#ffd166;font-weight:700;' : 'color:#4a5062;';
      breadcrumbEl.appendChild(span);
      if (i < NODE_ORDER.length - 1) breadcrumbEl.append(' · ');
    });
  }

  function update() {
    const L_base = makeTRS(0, BASE_HALF, 0, 0, model.baseRy, 0, 1, 1, 1);

    const T_joint = makeTRS(0, BASE_HALF, 0, 0, 0, 0, 1, 1, 1);
    const T_lift = makeTRS(0, model.armT, 0, 0, 0, 0, 1, 1, 1);
    const R_bend = makeTRS(0, 0, 0, 0, 0, model.armBend, 1, 1, 1);
    const T_pivot = makeTRS(0, ARM_HALF, 0, 0, 0, 0, 1, 1, 1);
    const L_arm = matMul(matMul(matMul(T_joint, T_lift), R_bend), T_pivot);

    const L_hand = makeTRS(0, ARM_HALF, 0, 0, model.handRy, 0, 1, 1, 1);

    const W_base = L_base;
    const W_arm = matMul(W_base, L_arm);
    const W_hand = matMul(W_arm, L_hand);

    baseMesh.matrix.fromArray(W_base);
    armMesh.matrix.fromArray(W_arm);
    handMesh.matrix.fromArray(W_hand);

    const shown = stage === 'full' ? selected : 'hand';
    const W = { base: W_base, arm: W_arm, hand: W_hand }[shown];
    matPanel.update(W);
    renderBreadcrumb();

    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
  }

  // Free-look orbit camera: framed like the old fixed camera (scene-shell's
  // default eye (3,3,6), looking at the origin) — the old code never
  // repositioned the camera, so Home restores that same default view.
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
  return { model, sliders, panel: matPanel, cam, input: cam };
}
