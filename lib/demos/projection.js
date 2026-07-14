// projection: the S06 hand-built perspective-projection cockpit. Third-person
// view of a camera FRUSTUM: the demo's OWN viewing camera (sc.camera, the
// OBSERVER) is the orbit-camera-driven render camera below — it watches the
// action from outside. The SUBJECT camera is a second, fixed camera
// (eye=(4,3,6), at=(0,0.5,0)) whose frustum we draw as line geometry and
// whose perspective() matrix drives the cockpit — the subject camera never
// renders anything itself, and the orbit controller never touches it: only
// sc.camera (the observer) is wired into makeOrbitCamera. The subject's fov/
// near/far stay driven exclusively by this demo's own SliderRows.
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
//
// Mounted into the shared demo-shell (scene-dominant layout + "?"/"⚙"/legend)
// per mvc-transform.js's template: the demo's own model/controls live in
// rail cards; "⚙" holds ONLY view/nav knobs (speeds + grid/axes toggles).
import * as THREE from '../vendor/three.module.js';
import { lookAtBasis, perspective, matMul, applyMat4, perspectiveDivide } from '../core/xform.js';
import { SliderRow, Mat4Panel, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const D = Math.PI / 180;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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
// the OBSERVER camera (the orbit camera's home, at (3,3,6) — coincidentally
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

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A perspective camera's view frustum drawn third-person: its near and far
  clip planes and its field of view. You ORBIT an OBSERVER camera to inspect a
  SECOND, pictured SUBJECT camera — two different cameras. The subject camera's
  live rendered picture is painted onto its near (image) plane, so you see the
  projected 2D image floating inside the frustum as you fly around.</p>
  <h4>The concept</h4>
  <p>Perspective projection maps everything inside the frustum onto the image
  plane; objects nearer the pictured camera project larger. Near/far bound
  what's visible; FOV sets how wide. The inset (click to swap) is that image
  full-frame — exactly what the subject camera sees.</p>
  <h4>Try this</h4>
  <p>Narrow the FOV and watch the frustum pinch and the image plane's picture
  zoom in; change near/far and watch the clip planes slide. Drag to orbit the
  observer; scroll to zoom; click the inset to enlarge the camera view.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

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

  // The image plane (subject view on the near plane) is part of the 3D scene,
  // so it shows in BOTH stages. The PiP inset + swap (a second full camera-view
  // render) is a sandbox luxury; a compact deck embed skips it to keep the
  // slide layout clean. So pip is on only in stage:'full'.
  const usePip = stage === 'full';
  const shell = makeShell(container, {
    stage,
    help: { html: HELP_HTML },
    settings: settingsFields,
    legend: usePip
      ? 'drag orbit · scroll zoom · WASD move · click inset to swap'
      : 'drag orbit · scroll zoom · WASD move · Q/E roll',
    nav: 'orbit',
    pip: usePip,
    onSwap: () => { resizeViews(); render3d(); },
  });
  const mainSlot = shell.mainEl ?? shell.sceneEl;

  // PiP main slot = the OBSERVER's third-person view (sc.camera, orbit-driven).
  // The SUBJECT camera is now a REAL three.js camera too (subjectCam) so we can
  // render its view — into a texture on the frustum's image plane (seen in the
  // flyby) and into the inset slot (the full camera view, click to swap). The
  // subject's fov/near/far still come only from this demo's sliders; the orbit
  // controller only ever touches sc.camera.
  const sc = makeScene(mainSlot, { fill: true });
  const { scene } = sc;
  ({ grid, axes, render } = sc);

  // The subject camera as a real PerspectiveCamera at the fixed subject pose.
  // Its projection (fov/aspect/near/far) is set in update(); its pose never
  // changes. cameraUp = world +Y (SUBJECT_AT/EYE were built with UP=+Y).
  const subjectCam = new THREE.PerspectiveCamera(model.fov, model.aspect, model.near, model.far);
  subjectCam.position.set(...SUBJECT_EYE);
  subjectCam.up.set(...UP);
  subjectCam.lookAt(...SUBJECT_AT);

  // Render target for the subject's view (mapped onto the image plane below).
  const rtt = new THREE.WebGLRenderTarget(640, 480);

  // The IMAGE PLANE: a quad sitting on the subject's near/projection plane,
  // textured with the subject's rendered view — so in the flyby you see the
  // projected 2D image floating inside the frustum. Unlit (MeshBasicMaterial),
  // double-sided, positioned/scaled/oriented to the near quad in update().
  const imagePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: rtt.texture, side: THREE.DoubleSide, toneMapped: false }),
  );
  imagePlane.matrixAutoUpdate = false;
  scene.add(imagePlane);

  // A second renderer for the inset slot = the subject camera's full view.
  // Only in the sandbox (PiP on); the embed has no inset.
  let insetRenderer = null;
  if (shell.insetEl) {
    insetRenderer = new THREE.WebGLRenderer({ antialias: true });
    insetRenderer.setClearColor(0x0b0c10, 1);
    shell.insetEl.appendChild(insetRenderer.domElement);
  }

  // Rail cards: the controller (fov/aspect/near/far sliders) and the readout
  // (P matrix + marked-box NDC + inside/outside verdict).
  const controlsCard = shell.addCard('Controls');
  const readoutCard = shell.addCard('Readout');

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'projection');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `projection-${id}`, ...PARAMS[id] });
  }

  const matPanel = new Mat4Panel(readoutCard);
  const captionEl = document.createElement('p');
  captionEl.className = 'demo-hint';
  captionEl.style.cssText = 'margin:10px 0 0;color:#8b93a7;font-size:12px;';
  captionEl.textContent = 'P = perspective(fov, aspect, near, far) — the SUBJECT camera, not this viewport';
  readoutCard.appendChild(captionEl);

  const ndcTable = new ValueTable(readoutCard, {
    rows: [{ id: 'ndc', label: 'marked box NDC [x,y,z]', cols: 3, className: 'row-h', format: (v) => v.toFixed(2) }],
  });
  const verdictEl = document.createElement('p');
  verdictEl.style.cssText = 'margin:6px 0 0;font-size:13px;font-weight:600;';
  readoutCard.appendChild(verdictEl);

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

    // Keep the real subject camera's projection in sync with the sliders, and
    // park the image plane on the near/projection plane (centre = eye − near·w;
    // its local x→u, y→v, normal→w face the eye; size = the near quad's
    // width/height = 2·tan(fov/2)·near ×aspect).
    subjectCam.fov = fov;
    subjectCam.aspect = aspect;
    subjectCam.near = near;
    subjectCam.far = far;
    subjectCam.updateProjectionMatrix();

    const tanY = Math.tan((fov * D) / 2);
    const planeW = 2 * tanY * aspect * near;
    const planeH = 2 * tanY * near;
    const center = SUBJECT_EYE.map((e, i) => e - near * SUBJECT_W[i]);
    const m = new THREE.Matrix4();
    m.makeBasis(new THREE.Vector3(...SUBJECT_U), new THREE.Vector3(...SUBJECT_V), new THREE.Vector3(...SUBJECT_W));
    m.scale(new THREE.Vector3(planeW, planeH, 1));
    m.setPosition(new THREE.Vector3(...center));
    imagePlane.matrix.copy(m);
    imagePlane.matrixWorldNeedsUpdate = true;

    render3d();
  }

  // render3d(): one repaint. Renders the subject's view first (with the frustum
  // wireframe + image plane hidden, so neither appears in the camera's own
  // picture) — once into the RTT that textures the image plane, once into the
  // inset renderer — then reveals them and renders the observer's third-person
  // view into the main canvas.
  function render3d() {
    frustumMesh.visible = false;
    imagePlane.visible = false;

    sc.renderer.setRenderTarget(rtt);
    sc.renderer.render(scene, subjectCam);
    sc.renderer.setRenderTarget(null);
    if (insetRenderer) insetRenderer.render(scene, subjectCam);

    frustumMesh.visible = true;
    imagePlane.visible = true;
    sc.render();
  }

  // resizeViews(): keep both renderers matched to their (swap-dependent) slots.
  // Guarded against 0/1px so a hidden deck slide at mount keeps makeScene's
  // usable fallback instead of collapsing to 1×1 (which renders black).
  function resizeViews() {
    const mw = mainSlot.clientWidth;
    const mh = mainSlot.clientHeight;
    if (mw >= 2 && mh >= 2) {
      sc.renderer.setSize(mw, mh);
      sc.camera.aspect = mw / mh;
      sc.camera.updateProjectionMatrix();
    }
    if (insetRenderer && shell.insetEl) {
      const iw = shell.insetEl.clientWidth;
      const ih = shell.insetEl.clientHeight;
      if (iw >= 2 && ih >= 2) insetRenderer.setSize(iw, ih);
    }
  }
  // Re-fit + repaint when the (fixed-size) sandbox slots change — window resize
  // and PiP swap. SANDBOX ONLY (see brdf-lobe): observing a deck embed's
  // CSS-sized canvas feeds a shrink loop; the embed uses makeScene's fallback.
  if (usePip && typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => { resizeViews(); render3d(); });
    ro.observe(mainSlot);
    if (shell.insetEl) ro.observe(shell.insetEl);
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
  }

  // Free-look orbit camera drives ONLY the observer (sc.camera), framed like
  // the demo's previous fixed render camera — makeScene's untouched default
  // (eye (3,3,6), looking at the origin). Home restores that view. This is
  // entirely separate from the SUBJECT camera above: the orbit controller
  // never reads or writes SUBJECT_EYE/SUBJECT_VIEW/SUBJECT_POSE, and the fov/
  // near/far sliders never touch sc.camera.
  const cam = makeOrbitCamera({
    camera: sc.camera,
    // A wider third-person vantage than the old (3,3,6): pulled back and to the
    // side so the whole frustum — subject eye, image plane, near/far quads —
    // is in view, not crammed against the observer.
    render: render3d,
    home: { eye: [9, 5, 9], target: [1, 1, 1.5] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  resizeViews();
  update();
  return { model, sliders, panel: matPanel, cam, input: cam };
}
