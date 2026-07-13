// gsplat: the S10 "what's past rasterized meshes" teaser — a real 3D
// Gaussian Splatting scene (not a mesh, not a point cloud with fixed-size
// dots: each splat is a translucent, oriented, anisotropic 3D Gaussian
// blended back-to-front) rendered by a vendored, unmodified-except-import-
// path copy of @mkkellogg/gaussian-splats-3d (MIT; see
// lib/vendor/VERSIONS.md for the vendoring gate's evidence trail). Scene:
// media/gsplat/bonsai-7k-mini.splat (Mip-NeRF 360 "bonsai", attribution in
// media/gsplat/ATTRIBUTION.md).
//
// This demo is intentionally NOT a from-scratch math cockpit like the rest
// of the library — the point here is "here is the frontier technique
// running live in your browser," not "here is the formula, hand-derived."
// The only OUR-OWN math is the free-fly camera below (camBasis/moveEye/
// clampPitch, a hand-built Rodrigues-rotation orbit-free camera — the same
// hand-built math core every other demo uses), because the scene's
// camera-up vector isn't necessarily world-Y and a naive built-in
// OrbitControls would fight it.
//
// Layout: scene-dominant (a large `.gsplat-scene` viewport + a compact
// `.gsplat-rail` of button/box-driven camera controls), NOT the stacked
// controls/viewport/panel every other demo uses — this is a "cockpit for a
// live free-fly camera," not a slider-driven parameter sandbox, so buttons
// and validated number boxes (not range inputs) drive most of it. FOV is
// the ONE retained range input (SliderRow), for the same reason every other
// demo uses one: a continuous-drag parameter genuinely wants a slider.
//
// Fallback: if the WebGLRenderer/Viewer construction throws (no WebGL2, no
// OffscreenCanvas support the library needs, etc.) this renders a plain
// text fallback instead of a half-built cockpit or an uncaught exception —
// the "degrades to fallback text" requirement from the vendoring gate.
//
// ONE deliberate deviation from this project's "render-on-demand, no rAF"
// rule (see scene-shell.js/every other demo): this Viewer runs with
// selfDrivenMode:true, i.e. it drives its OWN requestAnimationFrame loop.
// Reason, found empirically: the library's splat sort runs in a Web Worker
// (an async round-trip) and newly-visible splats fade in over several
// frames (its own progressive "visibleRegionRadius" ramp) — with
// selfDrivenMode:false and a single manual update()+render() per input,
// the splat mesh visibly VANISHES after every camera move (the sort result
// and fade-in never get the extra frames they need to land). Our own
// camera math (applyCam(), below) still drives the camera every control
// input; we just no longer own the render() call.
import * as THREE from '../vendor/three.module.js';
import * as GaussianSplats3D from '../vendor/gaussian-splats-3d.module.js';
import { axisAngleMatrix, applyMat4, matMul, normalize, sub } from '../core/xform.js';
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { resolveControlIds } from './registry.js';

// Resolved against THIS MODULE's own URL (not the consuming page's URL) so
// the asset loads correctly whether this demo is mounted from lib/demo.html,
// a session slide deck, or the embed-fixture — every consumer imports this
// same file from lib/demos/gsplat.js, so import.meta.url is invariant.
const SPLAT_PATH = new URL('../../media/gsplat/bonsai-7k-mini.splat', import.meta.url).href;

// Pure camera math helpers for free-fly camera control (Task 1). Locked
// convention: yaw>0 rotates counterclockwise about +Y (turns the view
// LEFT); at rest (yaw=pitch=roll=0) the camera looks down -Z, +Y up.
export function clampPitch(p) { return Math.max(-89.9, Math.min(89.9, p)); }

export function camBasis(yaw, pitch, roll) {
  const R = matMul(
    matMul(axisAngleMatrix(0, 1, 0, yaw), axisAngleMatrix(1, 0, 0, pitch)),
    axisAngleMatrix(0, 0, 1, roll),
  );
  const apply = (v) => { const [x, y, z] = applyMat4(R, v); return [x, y, z]; };
  return { forward: apply([0, 0, -1]), right: apply([1, 0, 0]), up: apply([0, 1, 0]) };
}

export function moveEye(eye, { forward, right, up }, dRight, dUp, dForward) {
  return [
    eye[0] + dRight * right[0] + dUp * up[0] + dForward * forward[0],
    eye[1] + dRight * right[1] + dUp * up[1] + dForward * forward[1],
    eye[2] + dRight * right[2] + dUp * up[2] + dForward * forward[2],
  ];
}

// Camera params for this exact asset. dylanebert's .splat export (unlike
// mkkellogg's own .ksplat reconstruction of the same underlying Mip-NeRF
// 360 "bonsai" scene) normalizes positions into roughly a [-3,3]^3 cube
// with centroid ~(-0.33, 0.44, 0.22) — measured directly from the 32-byte
// splat records (position, scale, rgba, quantized quaternion) rather than
// assumed. CAMERA_UP is plain world-Y here (this export is already
// Y-up-canonicalized).
const CAMERA_UP = [0, 1, 0];
const LOOK_AT = [0, 0, 0];
const INITIAL_POS = [0, 0.8, 2.6];
const BASE_DIST = Math.hypot(...sub(INITIAL_POS, LOOK_AT));

// poseLookingAt(eye, target): closed-form yaw/pitch (roll=0) such that
// camBasis(yaw, pitch, 0).forward === normalize(target - eye). Derivation:
// camBasis's roll rotates the base vector [0,0,-1] about the roll axis
// itself (a no-op on that vector), so forward simplifies to
//   forward = Ryaw( Rpitch([0,0,-1]) )
//           = [ -sin(yaw)*cos(pitch), sin(pitch), -cos(yaw)*cos(pitch) ]
// (both intermediate rotation matrices expanded and composed by hand,
// matching axisAngleMatrix's Rodrigues form). Solving for a target forward
// F=(Fx,Fy,Fz): pitch = asin(Fy) directly; substituting back into the x/z
// rows, cos(pitch) cancels out of the ratio, leaving
// yaw = atan2(-Fx, -Fz). Reused below both to derive HOME (so it
// reproduces the pre-rewrite hardcoded initial framing) and to compute the
// front/top/side viewpoint presets.
function poseLookingAt(eye, target) {
  const [fx, fy, fz] = normalize(sub(target, eye));
  const yaw = Math.atan2(-fx, -fz) * (180 / Math.PI);
  const pitch = Math.asin(Math.max(-1, Math.min(1, fy))) * (180 / Math.PI);
  return { yaw, pitch };
}

// HOME: the fly-state that reproduces the pre-rewrite hardcoded initial
// framing — the old code did
//   viewer = new GaussianSplats3D.Viewer({ initialCameraPosition: INITIAL_POS, initialCameraLookAt: LOOK_AT, ... })
// i.e. eye=INITIAL_POS looking at LOOK_AT. Verified numerically:
// normalize(LOOK_AT - INITIAL_POS) = normalize([0, -0.8, -2.6])
//   ≈ (0, -0.29409, -0.95580)
// poseLookingAt gives yaw = atan2(-0, +0.95580) = 0°,
//                     pitch = asin(-0.29409) ≈ -17.10°
// i.e. HOME looks slightly down, straight along -Z — exactly the old framing.
const HOME_ANGLES = poseLookingAt(INITIAL_POS, LOOK_AT);
const HOME = {
  eye: [...INITIAL_POS],
  yaw: HOME_ANGLES.yaw,
  pitch: HOME_ANGLES.pitch,
  roll: 0,
  fov: 60,
  moveSpeed: 3,
};

// orbit-free camera: only one range input remains (fov) — see file header.
// tools/test-demos.mjs drives the FIRST (here, only) range input as its
// generic smoke-test probe: an fov drag changes viewer.camera's projection
// (canvas pixels change via the AxesHelper alone, even before/if the splat
// scene has finished its async load) and its readout ('fov', in the
// dashboard ValueTable) mirrors the slider value directly.
const PARAMS = {
  fov: { label: 'fov', min: 10, max: 120, step: 1, value: HOME.fov, format: (v) => `${v.toFixed(0)}°` },
};

// Named eye positions for the Viewpoints card's preset buttons — all at
// BASE_DIST from LOOK_AT (the same distance as the pre-rewrite initial
// framing) along a different axis each, so "Front"/"Top"/"Side" read as
// genuinely different vantage points rather than a relabeled Home.
const VIEWPOINT_PRESETS = [
  { label: 'Front', eye: [0, 0.8, BASE_DIST] },
  { label: 'Top', eye: [0, BASE_DIST, 0] },
  { label: 'Side', eye: [BASE_DIST, 0.8, 0] },
];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function fallback(container, message) {
  container.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'viz-fallback';
  p.textContent = message;
  container.appendChild(p);
}

function makeCard(parent, title) {
  const card = document.createElement('div');
  card.className = 'gsplat-card';
  const h = document.createElement('h3');
  h.textContent = title;
  card.appendChild(h);
  parent.appendChild(card);
  return card;
}

function makeButton(parent, label, onClick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'gsplat-btn';
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  parent.appendChild(btn);
  return btn;
}

function makeRow(parent) {
  const row = document.createElement('div');
  row.className = 'gsplat-row';
  parent.appendChild(row);
  return row;
}

/**
 * bindNumberField(container, {label, decimals, getCurrent, apply}): a
 * labeled, validated <input type=text> (a "type-exact" number box, as
 * opposed to the one retained range input). On change (blur, or Enter via
 * an explicit blur()), parses the text as a float: if it's not a finite
 * number, the field silently reverts to getCurrent() (no partial/garbage
 * state ever reaches `fly`); otherwise apply(parsedValue) is called (it
 * owns any clamping — e.g. clampPitch — and re-derives the camera/
 * dashboard), and the field then redisplays getCurrent() (post-clamp).
 * Returns a `show()` refresher so callers (Home, viewpoint restore) can
 * force a resync after changing `fly` out from under this field.
 */
function bindNumberField(container, { label, decimals = 0, getCurrent, apply }) {
  const row = document.createElement('label');
  row.className = 'gsplat-field';
  const span = document.createElement('span');
  span.className = 'gsplat-field-label';
  span.textContent = label;
  const input = document.createElement('input');
  input.type = 'text';
  input.inputMode = 'decimal';
  input.className = 'gsplat-field-input';
  row.appendChild(span);
  row.appendChild(input);
  container.appendChild(row);

  const show = () => { input.value = getCurrent().toFixed(decimals); };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); });
  input.addEventListener('change', () => {
    const raw = parseFloat(input.value);
    if (Number.isFinite(raw)) apply(raw);
    show(); // whether accepted (now-clamped value) or rejected (revert)
  });
  show();
  return show;
}

/**
 * make(container, opts)
 * opts.stage === 'full' builds the fov SliderRow. Otherwise opts.controls
 * (array of param ids — only 'fov' is a valid id here) selects whether it's
 * built — embed stage has no default controls of its own (caller's
 * data-controls picks, same idiom as every other demo). The rest of the
 * rail (View/Viewpoints/Live-dashboard cards, and the Camera card's number
 * boxes) is NOT part of that opt-in mechanism — it isn't a set of sliders,
 * it's the free-fly cockpit itself — so it's always built.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  // Defined before any activate() call so an embed instance (which never
  // calls input.activate() until Task 4's deck gate says so) still exposes
  // a defined nav state instead of leaving the dataset attribute unset.
  container.dataset.gsplatNav = 'idle';
  const isEmbed = stage !== 'full';
  const rootEl = document.createElement('div');
  // gsplat-root--embed (Task 5, overflow fix): a compact, slide-fitting
  // variant — see the lib.css block next to .gsplat-root for the sizing
  // rationale. The sandbox (stage:'full') keeps the plain .gsplat-root
  // exactly as before.
  rootEl.className = isEmbed ? 'gsplat-root gsplat-root--embed' : 'gsplat-root';
  const viewportEl = document.createElement('div');
  viewportEl.className = isEmbed ? 'gsplat-scene gsplat-scene--embed' : 'gsplat-scene';
  // Programmatically focusable (tabIndex=-1: script-focusable, not in the
  // Tab order) so it can actually receive/lose focus — a bare <div> can't
  // fire 'blur' otherwise, and Task 3's InputController auto-deactivates on
  // sceneEl blur. Focused explicitly on mousedown (see InputController).
  viewportEl.tabIndex = -1;
  viewportEl.style.outline = 'none';
  const railEl = document.createElement('div');
  railEl.className = isEmbed ? 'gsplat-rail gsplat-rail--embed' : 'gsplat-rail';
  rootEl.appendChild(viewportEl);
  rootEl.appendChild(railEl);

  // viewportEl must already be attached to the live DOM (container.append
  // happens BELOW, before any Viewer/renderer construction) — the Viewer
  // reads rootElement.offsetWidth/offsetHeight synchronously to size its
  // renderer, and a detached node always reports 0.
  container.appendChild(rootEl);

  let viewer;
  try {
    // clientWidth/Height (not a fixed 400x300): .gsplat-scene is flex:1
    // against a fixed-width rail, so it now legitimately varies with the
    // host page — size the renderer to whatever it actually got. The ||
    // fallbacks guard the (should-be-rare) case of a zero-size host at
    // mount time.
    const width = viewportEl.clientWidth || 700;
    const height = viewportEl.clientHeight || 420;

    // A caller-supplied renderer (rather than letting the Viewer build its
    // own internally) is required for TWO reasons: (1) preserveDrawingBuffer
    // — the library's own internal renderer omits it, so a drawImage-based
    // pixel probe (what tools/test-demos.mjs uses, and what every other
    // demo here relies on via scene-shell.js) reads back an already-cleared,
    // all-zero buffer; (2) an opaque clear color — the library's internal
    // renderer clears to alpha:0 (transparent), which is indistinguishable
    // from "nothing rendered yet" in a byte-level pixel diff.
    const renderer = new THREE.WebGLRenderer({ antialias: false, precision: 'highp', preserveDrawingBuffer: true });
    renderer.setClearColor(0x0b0c10, 1); // opaque, matches scene-shell.js's BG
    renderer.setSize(width, height);
    viewportEl.appendChild(renderer.domElement);

    viewer = new GaussianSplats3D.Viewer({
      rootElement: viewportEl,
      renderer,
      selfDrivenMode: true, // see the file-header comment: required so the sort-worker + fade-in pipeline actually shows splats after a camera move
      useBuiltInControls: false,
      sharedMemoryForWorkers: false,
      cameraUp: CAMERA_UP,
      initialCameraPosition: INITIAL_POS,
      initialCameraLookAt: LOOK_AT,
    });
  } catch (err) {
    console.warn('gsplat: Viewer construction failed (likely no WebGL2) — falling back to text', err);
    fallback(container, '[3D Gaussian Splat viewer unavailable in this browser — needs WebGL2. See media/gsplat/ for a static preview of the scene.]');
    return { model: null, sliders: {}, panel: null, input: null };
  }

  // A small AxesHelper at the look-at point: visible immediately (the
  // splat scene loads asynchronously and can take longer than a control's
  // first paint), and it's the one thing on screen we position with OUR
  // OWN math (the free-fly camera below), not the library's.
  const axes = new THREE.AxesHelper(1);
  axes.position.set(...LOOK_AT);
  viewer.threeScene.add(axes);

  // fly: the free-fly camera state. Seeded from HOME (see its derivation
  // comment above) so the initial framing matches the pre-rewrite scene
  // exactly. Task 3's InputController (keyboard + mouse-look) reads/writes
  // this same object and calls applyCam()/refreshDashboard() after moving it.
  const fly = { eye: [...HOME.eye], yaw: HOME.yaw, pitch: HOME.pitch, roll: HOME.roll, fov: HOME.fov, moveSpeed: HOME.moveSpeed };

  // applyCam(): the ONE place fly -> viewer.camera. Every control below
  // (buttons, boxes, the fov slider, viewpoint presets, Home) mutates `fly`
  // then calls this — never viewer.camera directly.
  function applyCam() {
    const { forward, up } = camBasis(fly.yaw, fly.pitch, fly.roll);
    viewer.camera.position.set(...fly.eye);
    viewer.camera.up.set(...up);
    viewer.camera.lookAt(fly.eye[0] + forward[0], fly.eye[1] + forward[1], fly.eye[2] + forward[2]);
    viewer.camera.fov = fly.fov;
    viewer.camera.updateProjectionMatrix();
  }

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'gsplat');
  const sliders = {};
  const fieldShow = {};

  // --- Rail: View card (Home, zoom, yaw/pitch/roll nudge buttons) ---
  // stage:'full' ONLY (Task 5, overflow fix) — this card, the Camera card's
  // validated number boxes below, and the Viewpoints card are the sandbox-
  // only "cockpit" controls that blew a deck-embedded slide past reveal's
  // 700px budget (a full free-fly cockpit rail is what stage:'full' is FOR;
  // an embed only needs the retained FOV slider + a live readout). Buttons
  // below (nudgeYaw/Pitch/Roll, requestCapture) stay defined unconditionally
  // since they're plain functions with no cost when unreferenced — only
  // their DOM-building call sites are gated.
  let homeBtn = null;
  if (stage === 'full') {
    const viewCard = makeCard(railEl, 'View');
    const homeRow = makeRow(viewCard);
    homeBtn = document.createElement('button');
    homeBtn.type = 'button';
    homeBtn.className = 'gsplat-btn gsplat-btn-home';
    homeBtn.textContent = 'Home';
    homeRow.appendChild(homeBtn);

    const zoomRow = makeRow(viewCard);
    makeButton(zoomRow, 'Zoom +', () => setFov(fly.fov - 5)); // narrower fov = zoomed in
    makeButton(zoomRow, 'Zoom −', () => setFov(fly.fov + 5)); // wider fov = zoomed out

    const yawRow = makeRow(viewCard);
    // yaw>0 turns the view LEFT (locked convention, see camBasis) — ◀ (left) nudges yaw up.
    makeButton(yawRow, '◀', () => nudgeYaw(10));
    makeButton(yawRow, '▶', () => nudgeYaw(-10));

    const pitchRow = makeRow(viewCard);
    makeButton(pitchRow, '▲', () => nudgePitch(10));
    makeButton(pitchRow, '▼', () => nudgePitch(-10));

    const rollRow = makeRow(viewCard);
    makeButton(rollRow, '↺', () => nudgeRoll(10));
    makeButton(rollRow, '↻', () => nudgeRoll(-10));

    const captureRow = makeRow(viewCard);
    // Handler wired below (InputController section) — needs sceneEl/pointer-
    // lock plumbing that isn't defined yet at this point in make().
    makeButton(captureRow, 'Capture mouse', () => requestCapture());
  }

  // --- Rail: Camera card (fov SliderRow always; validated number boxes are
  // stage:'full' only, same overflow reasoning as the View card above) ---
  const cameraCard = makeCard(railEl, 'Camera');
  for (const id of ids) {
    sliders[id] = new SliderRow(cameraCard, { id: `gsplat-${id}`, ...PARAMS[id], value: fly[id] });
  }
  if (sliders.fov) {
    sliders.fov.onInput((v) => setFov(v));
  }

  if (stage === 'full') {
    fieldShow.yaw = bindNumberField(cameraCard, {
      label: 'yaw', decimals: 0, getCurrent: () => fly.yaw,
      apply: (v) => { fly.yaw = v; applyCam(); refreshDashboard(); },
    });
    fieldShow.pitch = bindNumberField(cameraCard, {
      label: 'pitch', decimals: 0, getCurrent: () => fly.pitch,
      apply: (v) => { fly.pitch = clampPitch(v); applyCam(); refreshDashboard(); },
    });
    fieldShow.roll = bindNumberField(cameraCard, {
      label: 'roll', decimals: 0, getCurrent: () => fly.roll,
      apply: (v) => { fly.roll = v; applyCam(); refreshDashboard(); },
    });
    fieldShow.fov = bindNumberField(cameraCard, {
      label: 'fov', decimals: 0, getCurrent: () => fly.fov,
      apply: (v) => setFov(v),
    });
    fieldShow.moveSpeed = bindNumberField(cameraCard, {
      label: 'speed', decimals: 1, getCurrent: () => fly.moveSpeed,
      apply: (v) => { fly.moveSpeed = clamp(v, 0.1, 20); refreshDashboard(); },
    });
  }

  // --- Rail: Viewpoints card (front/top/side presets, save/restore) ---
  // stage:'full' only — see the View-card comment above.
  if (stage === 'full') {
    const viewpointsCard = makeCard(railEl, 'Viewpoints');
    const presetsRow = makeRow(viewpointsCard);
    for (const preset of VIEWPOINT_PRESETS) {
      makeButton(presetsRow, preset.label, () => goToPose(preset.eye, LOOK_AT));
    }

    const saveRow = makeRow(viewpointsCard);
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'gsplat-viewpoint-name';
    nameInput.placeholder = 'name…';
    saveRow.appendChild(nameInput);
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'gsplat-btn';
    saveBtn.textContent = 'Save';
    saveRow.appendChild(saveBtn);

    const savedListEl = makeRow(viewpointsCard);
    savedListEl.classList.add('gsplat-saved-list');

    const viewpoints = new Map(); // in-memory name -> {...fly} snapshot
    const restoreButtons = new Map(); // name -> its restore button (re-saving under the same name updates the snapshot, not a duplicate button)

    saveBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) return;
      viewpoints.set(name, { eye: [...fly.eye], yaw: fly.yaw, pitch: fly.pitch, roll: fly.roll, fov: fly.fov, moveSpeed: fly.moveSpeed });
      if (!restoreButtons.has(name)) {
        const btn = makeButton(savedListEl, name, () => {
          const saved = viewpoints.get(name);
          if (saved) applyFlySnapshot(saved);
        });
        restoreButtons.set(name, btn);
      }
      nameInput.value = '';
    });
  }

  // --- Rail: Live dashboard ---
  const dashCard = makeCard(railEl, 'Live dashboard');
  const dash = new ValueTable(dashCard, {
    rows: [
      { id: 'eyeX', label: 'eye x', className: 'row-u', format: (v) => v.toFixed(2) },
      { id: 'eyeY', label: 'eye y', className: 'row-u', format: (v) => v.toFixed(2) },
      { id: 'eyeZ', label: 'eye z', className: 'row-u', format: (v) => v.toFixed(2) },
      { id: 'yaw', label: 'yaw', className: 'row-v', format: (v) => `${v.toFixed(0)}°` },
      { id: 'pitch', label: 'pitch', className: 'row-v', format: (v) => `${v.toFixed(0)}°` },
      { id: 'roll', label: 'roll', className: 'row-v', format: (v) => `${v.toFixed(0)}°` },
      { id: 'fov', label: 'fov', className: 'row-w', format: (v) => `${v.toFixed(0)}°` },
      { id: 'speed', label: 'speed', className: 'row-w', format: (v) => v.toFixed(1) },
      { id: 'splats', label: 'splats', className: 'row-h', format: (v) => v.toLocaleString() },
    ],
  });
  dash.table.classList.add('gsplat-dash');

  // refreshDashboard(): the ONE place fly (+ live splat count) -> the
  // ValueTable. Every control below calls this right after applyCam().
  function refreshDashboard() {
    dash.update('eyeX', fly.eye[0]);
    dash.update('eyeY', fly.eye[1]);
    dash.update('eyeZ', fly.eye[2]);
    dash.update('yaw', fly.yaw);
    dash.update('pitch', fly.pitch);
    dash.update('roll', fly.roll);
    dash.update('fov', fly.fov);
    dash.update('speed', fly.moveSpeed);
    dash.update('splats', viewer.splatMesh ? viewer.splatMesh.getSplatCount() : 0);
  }

  // --- Wiring: fov (slider + box share one setter so they can't drift) ---
  function setFov(v) {
    fly.fov = clamp(v, 10, 120);
    applyCam();
    refreshDashboard();
    if (sliders.fov) {
      sliders.fov.input.value = String(fly.fov);
      sliders.fov.readout.textContent = sliders.fov._format(fly.fov);
    }
    fieldShow.fov?.(); // number box is stage:'full' only (see fieldShow build-out above)
  }

  // --- Wiring: yaw/pitch/roll nudge buttons (±10°, pitch clamped) ---
  // fieldShow.{yaw,pitch,roll} exist only in stage:'full' (the View card that
  // calls these is itself stage:'full'-gated, but guard with ?. anyway since
  // tick()/applyLookDelta() below call the same showers unconditionally from
  // shared free-fly input that DOES run in the embed).
  function nudgeYaw(delta) { fly.yaw += delta; applyCam(); refreshDashboard(); fieldShow.yaw?.(); }
  function nudgePitch(delta) { fly.pitch = clampPitch(fly.pitch + delta); applyCam(); refreshDashboard(); fieldShow.pitch?.(); }
  function nudgeRoll(delta) { fly.roll += delta; applyCam(); refreshDashboard(); fieldShow.roll?.(); }

  // applyFlySnapshot(snapshot): replace ALL of fly (eye/yaw/pitch/roll/fov/
  // moveSpeed) from a full {...fly}-shaped object — used by Home (snapshot
  // = HOME) and by a saved viewpoint's restore button. Copies snapshot.eye
  // (never aliases it) since fly.eye is reassigned wholesale by moveEye-
  // style callers elsewhere (Task 3), not mutated in place.
  function applyFlySnapshot(snapshot) {
    fly.eye = [...snapshot.eye];
    fly.yaw = snapshot.yaw;
    fly.pitch = snapshot.pitch;
    fly.roll = snapshot.roll;
    fly.fov = snapshot.fov;
    fly.moveSpeed = snapshot.moveSpeed;
    applyCam();
    refreshDashboard();
    if (sliders.fov) {
      sliders.fov.input.value = String(fly.fov);
      sliders.fov.readout.textContent = sliders.fov._format(fly.fov);
    }
    Object.values(fieldShow).forEach((show) => show());
  }

  // goToPose(eye, target): a front/top/side viewpoint preset — only eye/
  // yaw/pitch/roll change; fov/moveSpeed are left as the user has them
  // (unlike Home/restore, a preset is a vantage point, not a full session
  // snapshot).
  function goToPose(eye, target) {
    const { yaw, pitch } = poseLookingAt(eye, target);
    applyFlySnapshot({ eye, yaw, pitch, roll: 0, fov: fly.fov, moveSpeed: fly.moveSpeed });
  }

  homeBtn?.addEventListener('click', () => applyFlySnapshot(HOME));

  // --- InputController (Task 3): free-fly keyboard movement + mouse-look,
  // activated immediately in stage:'full' (the sandbox) but NOT bound here
  // in 'embed' — Task 4's deck gate decides when an embedded instance may
  // grab document-level keydown/keyup.
  //
  // Sign convention (locked in Task 1, camBasis above): yaw>0 rotates
  // counterclockwise about +Y, i.e. turns the view LEFT. So to feel
  // natural, a RIGHTWARD mouse move (dx>0, whether click-drag clientX delta
  // or pointer-lock movementX) must DECREASE yaw (turn the view right):
  // `fly.yaw -= dx*SENS`. An UPWARD mouse move (dy<0) must look up, i.e.
  // INCREASE pitch: `fly.pitch = clampPitch(fly.pitch - dy*SENS)` (standard
  // non-inverted mouse-look).
  const sceneEl = viewportEl;
  const MOUSE_SENS = 0.25; // deg per px, click-drag and pointer-lock alike
  const ROLL_RATE = 60; // deg per second, Q/E held
  const DASH_INTERVAL_MS = 100; // ~10 Hz dashboard refresh while flying
  const HANDLED_KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', ' ', 'control']);
  const pressed = new Set();

  const keyOf = (e) => (e.key === ' ' ? ' ' : e.key.toLowerCase());

  // onKeyDown/onKeyUp are bound on `document` (see activate() below) so
  // free-fly WASD/Q/E/space/Control work no matter where focus happens to
  // be — but that means they'd otherwise also fire while the user is
  // typing into a preserved Task 2 control (e.g. the Viewpoints "name…"
  // text field). Bail out untouched (no preventDefault/stopPropagation,
  // no `pressed` mutation) whenever the event's target is an editable
  // element, so typed keystrokes reach the field instead of being eaten.
  const isEditable = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);

  // A movement/roll key held together with Ctrl/Cmd/Alt is almost always
  // a browser/OS shortcut in disguise (Ctrl+W closes the tab, Cmd+S saves,
  // etc.) — such combos must pass through untouched. This does NOT apply
  // to 'control' itself (the down key): Control alone, with no other
  // modifier flag of its own, must still register as a fly-down press.
  const isModifiedMovementKey = (e, key) => key !== 'control' && (e.ctrlKey || e.metaKey || e.altKey);

  function onKeyDown(e) {
    if (isEditable(e.target)) return;
    const key = keyOf(e);
    // Escape hands control back (deactivate) rather than being added to
    // HANDLED_KEYS/preventDefault'd — reveal.js (and the browser, if
    // pointer-lock is active) both have their OWN Esc behavior (slide
    // overview toggle; exiting pointer lock) that must still fire.
    if (key === 'escape') { input.deactivate(); return; }
    if (!HANDLED_KEYS.has(key)) return;
    if (isModifiedMovementKey(e, key)) return;
    pressed.add(key);
    e.preventDefault();
    e.stopPropagation();
  }
  function onKeyUp(e) {
    if (isEditable(e.target)) return;
    const key = keyOf(e);
    if (!HANDLED_KEYS.has(key)) return;
    if (isModifiedMovementKey(e, key)) return;
    pressed.delete(key);
    e.preventDefault();
    e.stopPropagation();
  }

  let rafId = null;
  let lastT = 0;
  let lastDashT = 0;
  function tick(t) {
    rafId = requestAnimationFrame(tick);
    const dt = lastT ? (t - lastT) / 1000 : 0;
    lastT = t;
    if (pressed.size === 0) return;
    const basis = camBasis(fly.yaw, fly.pitch, fly.roll);
    const d = fly.moveSpeed * dt;
    if (pressed.has('w')) fly.eye = moveEye(fly.eye, basis, 0, 0, d);
    if (pressed.has('s')) fly.eye = moveEye(fly.eye, basis, 0, 0, -d);
    if (pressed.has('d')) fly.eye = moveEye(fly.eye, basis, d, 0, 0);
    if (pressed.has('a')) fly.eye = moveEye(fly.eye, basis, -d, 0, 0);
    if (pressed.has(' ')) fly.eye = moveEye(fly.eye, basis, 0, d, 0);
    if (pressed.has('control')) fly.eye = moveEye(fly.eye, basis, 0, -d, 0);
    if (pressed.has('q')) fly.roll += ROLL_RATE * dt;
    if (pressed.has('e')) fly.roll -= ROLL_RATE * dt;
    applyCam();
    if (t - lastDashT >= DASH_INTERVAL_MS) {
      lastDashT = t;
      refreshDashboard();
      fieldShow.yaw?.(); fieldShow.pitch?.(); fieldShow.roll?.();
    }
  }

  function applyLookDelta(dx, dy) {
    fly.yaw -= dx * MOUSE_SENS; // right-drag/right-move turns view right
    fly.pitch = clampPitch(fly.pitch - dy * MOUSE_SENS); // up-drag/up-move looks up
    applyCam();
    refreshDashboard();
    fieldShow.yaw?.();
    fieldShow.pitch?.();
  }

  // Click-drag mouse-look (cursor stays visible; no pointer lock).
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  function onSceneMouseDown(e) {
    if (document.pointerLockElement === sceneEl) return; // pointer-lock mode owns look instead
    sceneEl.focus(); // so a later Tab-away/click-elsewhere can 'blur' it (see tabIndex note above)
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  }
  function onSceneMouseMove(e) {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    applyLookDelta(dx, dy);
  }
  function onSceneMouseUp() { dragging = false; }
  function onSceneMouseLeave() { dragging = false; }

  // Pointer-lock mouse-look: while locked, movementX/Y drives the same
  // applyLookDelta (identical signs — the "feel" must match drag mode).
  function onPointerLockMouseMove(e) { applyLookDelta(e.movementX, e.movementY); }
  function onPointerLockChange() {
    if (document.pointerLockElement === sceneEl) {
      dragging = false;
      document.addEventListener('mousemove', onPointerLockMouseMove);
    } else {
      document.removeEventListener('mousemove', onPointerLockMouseMove);
    }
  }
  function requestCapture() {
    // Requesting pointer lock before the InputController is active would
    // grab the mouse for a scene that isn't listening to fly controls yet
    // (embed stage before Task 4's deck gate flips it on) — no-op instead.
    if (!input.active) return;
    try {
      const p = sceneEl.requestPointerLock();
      // requestPointerLock is a Promise in current Chrome/Firefox but void
      // in older/other engines — guard both call shapes per the brief.
      if (p && typeof p.catch === 'function') {
        p.catch((err) => console.warn('gsplat: pointer lock rejected — staying in drag mode', err));
      }
    } catch (err) {
      console.warn('gsplat: pointer lock unavailable — staying in drag mode', err);
    }
  }

  function onSceneBlur() { input.deactivate(); }
  function onVisibilityChange() { if (document.visibilityState === 'hidden') input.deactivate(); }

  const input = {
    active: false,
    // onDeactivate: an optional callback, set below by the embed gate (Task
    // 4) when stage !== 'full'. Called at the END of deactivate() (state
    // already flipped to idle) so a deck embed can restore its "Click to
    // explore" overlay + hide the exit chip whenever nav turns off for ANY
    // reason — an explicit user Esc, or the auto-deactivate paths Task 3
    // already wires (scene blur, document hidden). Left null in stage:'full'
    // (the sandbox has no overlay to restore).
    onDeactivate: null,
    activate() {
      if (this.active) return;
      this.active = true;
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      sceneEl.addEventListener('mousedown', onSceneMouseDown);
      sceneEl.addEventListener('mousemove', onSceneMouseMove);
      sceneEl.addEventListener('mouseup', onSceneMouseUp);
      sceneEl.addEventListener('mouseleave', onSceneMouseLeave);
      document.addEventListener('pointerlockchange', onPointerLockChange);
      sceneEl.addEventListener('blur', onSceneBlur);
      document.addEventListener('visibilitychange', onVisibilityChange);
      // Focus the scene here (not only on mousedown, see onSceneMouseDown)
      // so WASD-only users — who may never click-drag — still reach a
      // focused, blur-reachable state: without this, blur can never fire
      // and the auto-deactivate-on-blur behavior above is unreachable.
      sceneEl.focus();
      lastT = 0;
      rafId = requestAnimationFrame(tick);
      container.dataset.gsplatNav = 'active';
    },
    deactivate() {
      if (!this.active) return;
      this.active = false;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      sceneEl.removeEventListener('mousedown', onSceneMouseDown);
      sceneEl.removeEventListener('mousemove', onSceneMouseMove);
      sceneEl.removeEventListener('mouseup', onSceneMouseUp);
      sceneEl.removeEventListener('mouseleave', onSceneMouseLeave);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
      document.removeEventListener('mousemove', onPointerLockMouseMove);
      sceneEl.removeEventListener('blur', onSceneBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (rafId != null) { cancelAnimationFrame(rafId); rafId = null; }
      if (document.pointerLockElement === sceneEl) document.exitPointerLock();
      dragging = false;
      pressed.clear();
      container.dataset.gsplatNav = 'idle';
      if (this.onDeactivate) this.onDeactivate();
    },
  };

  // --- Deck activation gate (Task 4): stage:'full' (the sandbox) activates
  // immediately — a full-page cockpit has no reveal.js keys to protect.
  // stage!=='full' (a deck slide embed, or this file's own embed-test
  // fixture) instead stays inert behind a "Click to explore" overlay so
  // WASD/Q/E/Space/Control keydowns are NOT preventDefault'd until the
  // presenter deliberately opts in — otherwise every gsplat slide would
  // silently eat reveal.js's own arrow-key/space slide-navigation the
  // moment the deck loads (initDeckDemos() mounts every [data-demo] host up
  // front; see deck.js and lib/_gsplat-embed-test/index.html).
  if (stage === 'full') {
    input.activate();
  } else {
    const exploreBtn = document.createElement('button');
    exploreBtn.type = 'button';
    exploreBtn.className = 'gsplat-explore';
    exploreBtn.textContent = '▶ Click to explore';
    viewportEl.appendChild(exploreBtn);

    const exitChip = document.createElement('div');
    exitChip.className = 'gsplat-exit';
    exitChip.textContent = 'Exit — Esc';
    exitChip.style.display = 'none';
    viewportEl.appendChild(exitChip);

    exploreBtn.addEventListener('click', () => {
      input.activate();
      exploreBtn.style.display = 'none';
      exitChip.style.display = '';
    });

    // Fires on ANY deactivate — explicit Esc, or Task 3's auto-deactivate on
    // scene blur / document hidden — restoring the gate to its inert resting
    // state so a subsequent click re-explores cleanly.
    input.onDeactivate = () => {
      exploreBtn.style.display = '';
      exitChip.style.display = 'none';
    };
  }

  const captionEl = document.createElement('p');
  captionEl.className = 'demo-hint gsplat-caption';
  captionEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  captionEl.textContent = 'loading splat scene…';
  container.appendChild(captionEl);

  // Initial paint: fly already equals HOME (seeded above), and every
  // control above was constructed reading fly directly, so no field/slider
  // resync is needed here — just push the state to the camera + dashboard.
  applyCam();
  refreshDashboard();

  // Containment for the ONE deviation admitted in the file header:
  // selfDrivenMode:true means this Viewer drives its own rAF loop for as
  // long as it exists — and in a reveal.js deck, initDeckDemos() mounts
  // every demo up front and slides are NEVER unmounted (see deck.js), so
  // without this block a single S10 embed would render ~240K splats via
  // its own rAF for the entire ~110-minute class, regardless of which
  // slide is showing, competing with the presenter's video-conferencing
  // CPU/GPU load. viewer.stop()/viewer.start() are a genuine pause/resume
  // pair here (confirmed against lib/vendor/gaussian-splats-3d.module.js:
  // stop() only cancelAnimationFrame()s the pending frame and clears
  // selfDrivenModeRunning; start() re-requests one — neither touches the
  // splat mesh/sort worker/GL resources, unlike the terminal async
  // dispose()), so re-running start() after stop() resumes cleanly.
  //
  // Two independent signals gate "should this rAF loop be running":
  //   - intersecting: is the host element (this demo's `container`, the
  //     same element deck.js's initDeckDemos() attaches to) in the
  //     viewport? Tracked via IntersectionObserver, corrected on first
  //     callback from a synchronous getBoundingClientRect estimate below
  //     so the viewer's INITIAL state already matches its initial
  //     visibility (a full-sandbox open where the host is visible starts
  //     running; a deck loaded on slide 1 with this demo on slide 30
  //     stays paused until the slide is actually reached, rather than
  //     running for a frame or two before the observer's first tick).
  //   - pageVisible: document.visibilityState — a backgrounded/minimized
  //     browser tab pauses regardless of intersection, and on returning
  //     the deviation only resumes if the host is ALSO still intersecting
  //     (tracked via the `intersecting` flag, not re-derived from the DOM).
  // container.dataset.gsplatRunning ("true"/"false") is the observable
  // contract other code (and tests) can read without reaching into the
  // Viewer's own selfDrivenModeRunning internals.
  let intersecting = (() => {
    const r = container.getBoundingClientRect();
    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    return r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw;
  })();
  let pageVisible = document.visibilityState !== 'hidden';
  let running = null; // force the first syncRunning() call to actually apply

  function syncRunning() {
    const next = intersecting && pageVisible;
    if (next === running) return;
    running = next;
    if (running) viewer.start(); else viewer.stop();
    container.dataset.gsplatRunning = String(running);
  }

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) intersecting = entry.isIntersecting;
      syncRunning();
    },
    { threshold: 0.1 },
  );
  io.observe(container);

  document.addEventListener('visibilitychange', () => {
    pageVisible = document.visibilityState !== 'hidden';
    syncRunning();
  });

  syncRunning();

  // GitHub Pages (Fastly) transparently gzips the .splat (served as
  // application/octet-stream) and sends Content-Length = the COMPRESSED
  // size, while the browser hands the loader a decompressed stream of a
  // different length. The vendored loader trusts Content-Length as the
  // uncompressed size, so that mismatch corrupts its assembled buffer and
  // addSplatScene rejects — the scene never appears. (It works under a
  // plain local server only because those don't gzip.) Fix: fetch the asset
  // ourselves — the browser decompresses gzip correctly — and hand the
  // library a Blob URL, which the browser serves with a consistent
  // Content-Length and no Content-Encoding. Pass the format explicitly,
  // since a blob: URL carries no .splat extension for the library's own
  // sceneFormatFromPath to read.
  fetch(SPLAT_PATH)
    .then((r) => {
      if (!r.ok) throw new Error(`asset fetch failed: ${r.status}`);
      return r.blob();
    })
    .then((blob) => {
      const objectUrl = URL.createObjectURL(blob);
      const revoke = () => URL.revokeObjectURL(objectUrl);
      // addSplatScene returns an AbortablePromise (no .finally); revoke on
      // both settle paths explicitly.
      return viewer
        .addSplatScene(objectUrl, {
          format: GaussianSplats3D.SceneFormat.Splat,
          splatAlphaRemovalThreshold: 5,
          showLoadingUI: false,
          progressiveLoad: false,
        })
        .then((v) => { revoke(); return v; }, (e) => { revoke(); throw e; });
    })
    .then(() => {
      captionEl.textContent = 'Mip-NeRF 360 "bonsai" scene, reconstructed as 3D Gaussians — see media/gsplat/ATTRIBUTION.md';
      refreshDashboard();
    })
    .catch((err) => {
      console.warn('gsplat: scene load failed', err);
      captionEl.textContent = 'splat scene failed to load (network/asset issue) — camera cockpit above still works';
    });

  return { model: fly, sliders, panel: dash, applyCam, refreshDashboard, HOME, input };
}
