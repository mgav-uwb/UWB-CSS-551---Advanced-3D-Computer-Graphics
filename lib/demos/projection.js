// projection: the S06 hand-built perspective-projection cockpit. Third-person
// view of a camera FRUSTUM: the demo's OWN viewing camera is makeScene's
// default (untouched — it's the observer, not the subject, watching the
// action from outside). The SUBJECT camera is a second, fixed camera
// (eye=(4,3,6), at=(0,0.5,0)) whose frustum we draw as line geometry and
// whose perspective() matrix drives the cockpit — the subject camera never
// renders anything itself.
//
// Frustum corners: computed in CAMERA space closed-form from fov/aspect/
// near/far (x = +-tan(fov/2)*aspect*d, y = +-tan(fov/2)*d, z = -d, for
// d in {near, far}) and transformed to world with the subject's OWN pose
// matrix (columns u,v,w from lookAtBasis + eye — the same basis
// view-matrix.js feeds straight into THREE's camera.matrixWorld). This is
// deliberately NOT "invert P*V and unproject the NDC cube": invertTRS
// (xform.js) is a closed-form TRS inverse and can't invert a projection
// matrix, and a general 4x4 inverse isn't in this library's contract — the
// closed-form camera-space corners sidestep needing one at all.
//
// Containment test: JS-side, via NDC transform (not frustum-plane tests).
// Each box center is passed through P·V (ONE matMul per param change) via
// applyMat4, then perspectiveDivide; a box is INSIDE iff w' > 0 (in front of
// the eye) AND every |ndc component| <= 1. Outside boxes get their SHARED
// per-box material's opacity dropped to 0.25 (transparent:true from
// creation) — never a material swap.
import * as THREE from '../vendor/three.module.js';
import { lookAtBasis, perspective, matMul, applyMat4, perspectiveDivide } from '../core/xform.js';
import { SliderRow, Mat4Panel, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { resolveControlIds } from './registry.js';

const D = Math.PI / 180;

// The SUBJECT camera is fixed (not a slider param) — only its projection
// (fov/aspect/near/far) is interactive.
const SUBJECT_EYE = [4, 3, 6];
const SUBJECT_AT = [0, 0.5, 0];
const UP = [0, 1, 0];
const { u: SUBJECT_U, v: SUBJECT_V, w: SUBJECT_W, V: SUBJECT_VIEW } = lookAtBasis(SUBJECT_EYE, SUBJECT_AT, UP);

// The subject camera's world/pose matrix: columns u,v,w + eye translation —
// exactly the affine inverse of SUBJECT_VIEW (see view-matrix.js's identical
// construction, tested against THREE's matrixWorldInverse in xform.test.mjs).
// Used ONLY to carry camera-space frustum corners into world space via
// applyMat4; since it's affine, applyMat4's w' is always 1 (no divide needed).
const SUBJECT_POSE = [
  SUBJECT_U[0], SUBJECT_U[1], SUBJECT_U[2], 0,
  SUBJECT_V[0], SUBJECT_V[1], SUBJECT_V[2], 0,
  SUBJECT_W[0], SUBJECT_W[1], SUBJECT_W[2], 0,
  SUBJECT_EYE[0], SUBJECT_EYE[1], SUBJECT_EYE[2], 1,
];

// The MARKED box sits directly on the subject's central sightline, 1.8
// world units in front of the eye (world = eye - 1.8*w, since w points from
// at TOWARD eye) — between the default near (1) and the near slider's
// higher values, so dragging near past ~1.8 clips it from inside to outside
// live in the cockpit readout (the near-plane-clipping beat for S06).
const MARK_DEPTH = 1.8;
const MARKED_POS = SUBJECT_EYE.map((e, i) => e - MARK_DEPTH * SUBJECT_W[i]);

// 5 scene boxes: 4 fixed ground boxes + the marked floating one. At the
// PARAMS defaults (fov 45, aspect 1.78, near 1, far 8): B1, B3 and MARK are
// inside; B2 and B4 are outside (hand-verified — exact NDC digits in the
// S06 task report). MARK sits just inside the near plane at defaults (NDC z
// ~0.02) and is the box that flips to OUTSIDE when near is dragged to 2.5.
// MARK is deliberately tiny (0.2 side): it sits only ~1.5 world units from
// the OBSERVER camera (makeScene's default, at (3,3,6) — coincidentally
// close to the subject eye (4,3,6)), so a box sized like the other four
// would loom huge in the viewport and hide the frustum wireframe behind it.
const BOXES = [
  { id: 'B1', x: 0, y: 0.4, z: 0, w: 0.8, h: 0.8, d: 0.8, color: 0xcc5544 },
  { id: 'B2', x: 1.5, y: 0.4, z: -1.5, w: 0.8, h: 0.8, d: 0.8, color: 0x4477cc },
  { id: 'B3', x: -1.2, y: 0.4, z: 1.0, w: 0.8, h: 0.8, d: 0.8, color: 0x44aa66 },
  { id: 'B4', x: 0, y: 0.4, z: -6, w: 0.8, h: 0.8, d: 0.8, color: 0xffbb33 },
  { id: 'MARK', x: MARKED_POS[0], y: MARKED_POS[1], z: MARKED_POS[2], w: 0.2, h: 0.2, d: 0.2, color: 0xe7eaf0, marked: true },
];

// Order here is also the "full stage" slider order; fov (first) is what
// tools/test-demos.mjs drives as the platform smoke test.
const PARAMS = {
  fov: { label: 'fov', min: 20, max: 120, step: 1, value: 45, format: (v) => `${v.toFixed(0)}°` },
  aspect: { label: 'aspect', min: 0.5, max: 2.5, step: 0.01, value: 1.78, format: (v) => v.toFixed(2) },
  near: { label: 'near', min: 0.1, max: 3, step: 0.05, value: 1, format: (v) => v.toFixed(2) },
  far: { label: 'far', min: 4, max: 20, step: 0.5, value: 8, format: (v) => v.toFixed(1) },
};

// Camera-space quad at depth d, winding bottom-left -> bottom-right ->
// top-right -> top-left (so consecutive indices are always an edge).
function camSpaceQuad(tanX, tanY, d) {
  return [
    [-tanX * d, -tanY * d, -d],
    [tanX * d, -tanY * d, -d],
    [tanX * d, tanY * d, -d],
    [-tanX * d, tanY * d, -d],
  ];
}

// 12 frustum edges as index pairs into the 8-corner array: corners 0-3 are
// the near quad, 4-7 the far quad (same BL/BR/TR/TL winding as camSpaceQuad).
const EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0], // near face
  [4, 5], [5, 6], [6, 7], [7, 4], // far face
  [0, 4], [1, 5], [2, 6], [3, 7], // connecting legs
];

function frustumCornersWorld(fov, aspect, near, far) {
  const tanY = Math.tan((fov * D) / 2);
  const tanX = tanY * aspect;
  const camCorners = [...camSpaceQuad(tanX, tanY, near), ...camSpaceQuad(tanX, tanY, far)];
  return camCorners.map((p) => applyMat4(SUBJECT_POSE, p).slice(0, 3));
}

function makeBoxMesh({ x, y, z, w, h, d, color }) {
  const material = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 1 });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  return { mesh, material };
}

/**
 * make(container, opts)
 * opts.stage === 'full' builds all four SliderRows. Otherwise opts.controls
 * (array of param ids) selects which SliderRows to build — embed stage
 * (data-controls="fov,near") only exposes fov + near.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = {
    fov: PARAMS.fov.value,
    aspect: PARAMS.aspect.value,
    near: PARAMS.near.value,
    far: PARAMS.far.value,
  };

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

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'projection');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsEl, { id: `projection-${id}`, ...PARAMS[id] });
  }

  const matPanel = new Mat4Panel(panelEl);
  const captionEl = document.createElement('p');
  captionEl.className = 'demo-hint';
  captionEl.style.cssText = 'margin:10px 0 0;color:#8b93a7;font-size:12px;';
  captionEl.textContent = 'P = perspective(fov, aspect, near, far) — the SUBJECT camera, not this viewport';
  panelEl.appendChild(captionEl);

  const ndcTable = new ValueTable(panelEl, {
    rows: [{ id: 'ndc', label: 'marked box NDC [x,y,z]', cols: 3, className: 'row-h', format: (v) => v.toFixed(2) }],
  });
  const verdictEl = document.createElement('p');
  verdictEl.style.cssText = 'margin:6px 0 0;font-size:13px;font-weight:600;';
  panelEl.appendChild(verdictEl);

  const { scene, render } = makeScene(viewportEl, { width: 400, height: 300 });

  const boxHandles = BOXES.map((b) => {
    const { mesh, material } = makeBoxMesh(b);
    scene.add(mesh);
    return { ...b, material };
  });

  // ONE LineSegments object for the frustum wireframe; its geometry is
  // disposed and replaced on every param change (never the object itself).
  const frustumMaterial = new THREE.LineBasicMaterial({ color: 0xffd166 });
  const frustumMesh = new THREE.LineSegments(new THREE.BufferGeometry(), frustumMaterial);
  scene.add(frustumMesh);

  function update() {
    const { fov, aspect, near, far } = model;
    const P = perspective(fov, aspect, near, far);
    const PV = matMul(P, SUBJECT_VIEW); // ONE matMul per param change

    const corners = frustumCornersWorld(fov, aspect, near, far);
    const points = EDGES.flatMap(([a, b]) => [new THREE.Vector3(...corners[a]), new THREE.Vector3(...corners[b])]);
    const newGeom = new THREE.BufferGeometry().setFromPoints(points);
    frustumMesh.geometry.dispose();
    frustumMesh.geometry = newGeom;

    let markedNdc = [0, 0, 0];
    let markedInside = false;
    for (const b of boxHandles) {
      const h4 = applyMat4(PV, [b.x, b.y, b.z]);
      const ndc = perspectiveDivide(h4);
      const inside = h4[3] > 0 && ndc.every((v) => Math.abs(v) <= 1);
      b.material.opacity = inside ? 1 : 0.25;
      if (b.marked) {
        markedNdc = ndc;
        markedInside = inside;
      }
    }

    matPanel.update(P);
    ndcTable.update('ndc', markedNdc);
    verdictEl.textContent = markedInside ? 'marked box: INSIDE frustum' : 'marked box: OUTSIDE frustum';
    verdictEl.style.color = markedInside ? '#7ee787' : '#ff7b72';

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
