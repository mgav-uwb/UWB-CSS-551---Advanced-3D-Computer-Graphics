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
import * as THREE from '../vendor/three.module.js';
import { makeTRS, matMul } from '../core/xform.js';
import { SliderRow, Mat4Panel } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
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

function makeBox(w, h, d, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color }));
  mesh.matrixAutoUpdate = false;
  return mesh;
}

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

  const controlsEl = document.createElement('div');
  controlsEl.className = 'demo-controls';
  const viewportEl = document.createElement('div');
  viewportEl.className = 'demo-viewport';
  viewportEl.style.width = '400px';
  viewportEl.style.height = '300px';
  const panelEl = document.createElement('div');
  panelEl.className = 'demo-panel';

  container.appendChild(controlsEl);
  container.appendChild(viewportEl);
  container.appendChild(panelEl);

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'scene-graph');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsEl, { id: `scene-graph-${id}`, ...PARAMS[id] });
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
    controlsEl.appendChild(row);
  }

  const matPanel = new Mat4Panel(panelEl);
  const breadcrumbEl = document.createElement('p');
  breadcrumbEl.className = 'demo-hint';
  breadcrumbEl.style.cssText = 'margin:10px 0 0;font-size:13px;';
  panelEl.appendChild(breadcrumbEl);
  const captionEl = document.createElement('p');
  captionEl.className = 'demo-hint';
  captionEl.style.cssText = 'margin:4px 0 0;color:#8b93a7;font-size:12px;';
  captionEl.textContent =
    stage === 'full'
      ? ''
      : "panel shows the hand's world matrix — the full chain's leaf (W_hand = matMul(W_arm, L_hand))";
  panelEl.appendChild(captionEl);

  const { scene, render } = makeScene(viewportEl, { width: 400, height: 300 });

  const baseMesh = makeBox(1.2, 0.4, 1.2, 0x5588ff);
  const armMesh = makeBox(0.25, 1.4, 0.25, 0xff9955);
  const handMesh = makeBox(0.5, 0.25, 0.25, 0x55ff88);
  // FLAT scene — all three meshes added directly, no THREE.Group/parenting.
  // World placement comes entirely from the matMul chain in update() below.
  scene.add(baseMesh, armMesh, handMesh);

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

  update();
  return { model, sliders, panel: matPanel };
}
