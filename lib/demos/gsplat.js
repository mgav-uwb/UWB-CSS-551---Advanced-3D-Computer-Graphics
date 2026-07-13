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
// The only OUR-OWN math is the camera orbit below (Rodrigues rotation
// around the scene's own up axis, via xform.js's axisAngleMatrix/applyMat4
// — the same hand-built core every other demo uses), because the scene's
// camera-up vector isn't world-Y and a naive Y-axis orbit would tumble it.
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
// selfDrivenMode:false and a single manual update()+render() per slider
// input, the splat mesh visibly VANISHES after every camera move (the sort
// result and fade-in never get the extra frames they need to land). Our
// own camera math still drives the camera every slider input; we just no
// longer own the render() call.
import * as THREE from '../vendor/three.module.js';
import * as GaussianSplats3D from '../vendor/gaussian-splats-3d.module.js';
import { axisAngleMatrix, applyMat4, normalize, sub } from '../core/xform.js';
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { resolveControlIds } from './registry.js';

// Resolved against THIS MODULE's own URL (not the consuming page's URL) so
// the asset loads correctly whether this demo is mounted from lib/demo.html,
// a session slide deck, or the embed-fixture — every consumer imports this
// same file from lib/demos/gsplat.js, so import.meta.url is invariant.
const SPLAT_PATH = new URL('../../media/gsplat/bonsai-7k-mini.splat', import.meta.url).href;

// Camera params for this exact asset. dylanebert's .splat export (unlike
// mkkellogg's own .ksplat reconstruction of the same underlying Mip-NeRF
// 360 "bonsai" scene) normalizes positions into roughly a [-3,3]^3 cube
// with centroid ~(-0.33, 0.44, 0.22) — measured directly from the 32-byte
// splat records (position, scale, rgba, quantized quaternion) rather than
// assumed. CAMERA_UP is plain world-Y here (this export is already
// Y-up-canonicalized), but the orbit below still rotates around a general
// CAMERA_UP axis via xform.js's axisAngleMatrix (not a hardcoded
// THREE.Vector3(0,1,0) shortcut), since other splat sources may not be.
const CAMERA_UP = [0, 1, 0];
const LOOK_AT = [0, 0, 0];
const INITIAL_POS = [0, 0.8, 2.6];
const OFFSET_DIR = normalize(sub(INITIAL_POS, LOOK_AT));
const BASE_DIST = Math.hypot(...sub(INITIAL_POS, LOOK_AT));

// orbitAz listed first: tools/test-demos.mjs drives the FIRST range input as
// its generic smoke-test probe. orbitAz rotates the camera (canvas pixels
// change via the AxesHelper alone, even before/if the splat scene has
// finished its async load) and its readout ('camAz') mirrors the slider
// value directly, so the mat-panel-cell check never depends on network/
// parse timing.
const PARAMS = {
  orbitAz: { label: 'orbitAz', min: 0, max: 360, step: 1, value: 200, format: (v) => `${v.toFixed(0)}°` },
  dist: { label: 'dist', min: 1.5, max: 6, step: 0.1, value: Math.round(BASE_DIST * 10) / 10, format: (v) => v.toFixed(1) },
};

function fallback(container, message) {
  container.innerHTML = '';
  const p = document.createElement('p');
  p.className = 'viz-fallback';
  p.textContent = message;
  container.appendChild(p);
}

/**
 * make(container, opts)
 * opts.stage === 'full' builds both SliderRows (orbitAz, dist). Otherwise
 * opts.controls (array of param ids) selects which SliderRows to build —
 * embed stage has no default controls of its own (caller's data-controls
 * picks, same idiom as every other demo).
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { orbitAz: PARAMS.orbitAz.value, dist: PARAMS.dist.value };

  const controlsEl = document.createElement('div');
  controlsEl.className = 'demo-controls';
  const viewportEl = document.createElement('div');
  viewportEl.className = 'demo-viewport';
  viewportEl.style.width = '400px';
  viewportEl.style.height = '300px';
  const panelEl = document.createElement('div');
  panelEl.className = 'demo-panel';

  // viewportEl must already be attached to the live DOM (container.append
  // happens BELOW, before any Viewer/renderer construction) — the Viewer
  // reads rootElement.offsetWidth/offsetHeight synchronously to size its
  // renderer, and a detached node always reports 0.
  container.appendChild(controlsEl);
  container.appendChild(viewportEl);
  container.appendChild(panelEl);

  let viewer;
  try {
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
    renderer.setSize(400, 300);
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
    return { model: null, sliders: {}, panel: null };
  }

  // A small AxesHelper at the look-at point: visible immediately (the
  // splat scene loads asynchronously and can take longer than a slider's
  // first paint), and it's the one thing on screen we position with OUR
  // OWN math (the orbit below), not the library's.
  const axes = new THREE.AxesHelper(1);
  axes.position.set(...LOOK_AT);
  viewer.threeScene.add(axes);

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'gsplat');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsEl, { id: `gsplat-${id}`, ...PARAMS[id] });
  }

  const table = new ValueTable(panelEl, {
    rows: [
      { id: 'camAz', label: 'orbit az', className: 'row-w', format: (v) => `${v.toFixed(0)}°` },
      { id: 'dist', label: 'dist', className: 'row-u', format: (v) => v.toFixed(1) },
      { id: 'splats', label: 'splats', className: 'row-v', format: (v) => v.toLocaleString() },
    ],
  });
  const captionEl = document.createElement('p');
  captionEl.className = 'demo-hint';
  captionEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  captionEl.textContent = 'loading splat scene…';
  panelEl.appendChild(captionEl);

  // Camera orbit: rotate the initial (position - lookAt) offset around
  // THIS scene's own up axis (Rodrigues rotation, xform.js's
  // axisAngleMatrix/applyMat4 — the hand-built math core, not three's
  // built-in OrbitControls) rather than a hardcoded world-Y axis, because
  // CAMERA_UP above is not (0,1,0).
  function positionCamera() {
    const R = axisAngleMatrix(...CAMERA_UP, model.orbitAz);
    const scaledDir = OFFSET_DIR.map((c) => c * model.dist);
    const [ox, oy, oz] = applyMat4(R, scaledDir);
    viewer.camera.position.set(LOOK_AT[0] + ox, LOOK_AT[1] + oy, LOOK_AT[2] + oz);
    viewer.camera.up.set(...CAMERA_UP);
    viewer.camera.lookAt(...LOOK_AT);
  }

  // NOTE: no viewer.update()/render() call here — with selfDrivenMode:true
  // (see file header) the Viewer's own rAF loop renders every frame and
  // will pick up whatever we just set on viewer.camera on its next tick.
  // This function only updates OUR cockpit state (camera target + table).
  function update() {
    positionCamera();
    table.update('camAz', model.orbitAz);
    table.update('dist', model.dist);
    table.update('splats', viewer.splatMesh ? viewer.splatMesh.getSplatCount() : 0);
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
  }

  update();

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

  viewer
    .addSplatScene(SPLAT_PATH, { splatAlphaRemovalThreshold: 5, showLoadingUI: false, progressiveLoad: false })
    .then(() => {
      captionEl.textContent = 'Mip-NeRF 360 "bonsai" scene, reconstructed as 3D Gaussians — see media/gsplat/ATTRIBUTION.md';
      update();
    })
    .catch((err) => {
      console.warn('gsplat: scene load failed', err);
      captionEl.textContent = 'splat scene failed to load (network/asset issue) — camera cockpit above still works';
    });

  return { model, sliders, panel: table };
}
