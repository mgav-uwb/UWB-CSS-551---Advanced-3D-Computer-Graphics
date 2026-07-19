// uv-placement: the S08 texture cockpit. ONE model {offU, offV, rot, tile},
// a controller of SliderRows, and a view built from OUR uvMat3: a quad
// textured with an in-code 8x8 checkerboard THREE.DataTexture whose
// texture.matrix is set (matrixAutoUpdate=false) straight from uvMat3's
// column-major 9-array every update — the lesson is the UV matrix, not the
// quad, so PlaneGeometry is fine here (contrast mesh-grid.js, where hand-
// building the mesh WAS the lesson). Cockpit: a live Mat3Panel readout of
// that same matrix. Uses uvMat3 from xform.js — no new UV math here.
//
// Mounted into the shared demo-shell (scene-dominant layout + "?"/"⚙"/legend
// + reveal.js-safe embed gate) and driven by the free-look orbit camera
// (drag orbit, scroll zoom, WASD fly) — see mvc-transform.js for the
// template this binding follows. The demo's own model/controls (sliders +
// Mat3Panel) live in rail cards; "⚙" holds ONLY view/nav knobs (speeds +
// grid/axes toggles).
import * as THREE from '../vendor/three.module.js';
import { uvMat3 } from '../core/xform.js';
import { loadModel } from '../core/models.js';
import { SliderRow, ButtonRow, Mat3Panel } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const CHECKER_SIZE = 8; // 8x8 checker texels
const LIGHT_SQUARE = [0xe7, 0xea, 0xf0, 0xff]; // near-white, RGBA
const DARK_SQUARE = [0x26, 0x2a, 0x35, 0xff]; // near-black (lib.css panel bg family)

// Quad tilt toward the observer camera (scene-shell's default eye sits at
// (3,3,6)): purely cosmetic staging so the checker reads as a plane in
// perspective rather than a flat-on rectangle — it is NOT part of the taught
// UV-matrix math and never touches uvMat3 or texture.matrix. Real models
// (cube/teapot/bunny) already read fine in perspective, so the tilt is
// reset to 0 for them (see swapModel below).
const COSMETIC_TILT_X = -0.3; // radians, ~-17°

// Model selector (default: quad, unchanged). The uvMat3 -> texture.matrix
// pipeline is entirely geometry-agnostic (it only ever touches the shared
// `texture`), so swapping models only ever swaps `mesh.geometry` — cube/
// teapot/bunny are loaded via core/models.js's loadModel(), CACHED/SHARED
// instances, never mutated.
const MODEL_OPTIONS = [
  { value: 'quad', label: 'quad' },
  { value: 'cube', label: 'cube' },
  { value: 'teapot', label: 'teapot' },
  { value: 'bunny', label: 'bunny' },
];
// loadModel() normalizes cube/teapot/bunny to unit height, centered at the
// origin — scale them up to roughly the quad's 2x2 footprint.
const MODEL_SCALE = 2;

// Order here is also the "full stage" slider order; offU (first) is what
// tools/test-demos.mjs drives as the platform smoke test — it pans the
// texture, changing both the Mat3Panel's translation cells and the rendered
// pixels.
const PARAMS = {
  offU: { label: 'offU', min: -1, max: 1, step: 0.05, value: 0, format: (v) => v.toFixed(2) },
  offV: { label: 'offV', min: -1, max: 1, step: 0.05, value: 0, format: (v) => v.toFixed(2) },
  rot: { label: 'rot', min: 0, max: 360, step: 1, value: 0, format: (v) => `${v.toFixed(0)}°` },
  tile: { label: 'tile', min: 0.5, max: 6, step: 0.1, value: 2, format: (v) => v.toFixed(2) },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A textured surface plus the live 3×3 matrix that places the texture in
  UV space (scale, rotate, translate the texture coordinates).</p>
  <h4>The concept</h4>
  <p>Texture coordinates get their own transform, separate from the geometry.
  The 3×3 UV matrix slides, spins, and scales the texture across a surface
  that itself never moves.</p>
  <h4>Try this</h4>
  <p>Rotate the UV matrix and watch the texture spin while the geometry stays
  put; scale it and the texture tiles differently. Drag to orbit; scroll to
  zoom.</p>
  <p>Switch to <code>bunny</code>: its UVs are a crude spherical projection
  (there's no "natural" unwrap for a scan), so the checker visibly seams and
  stretches — the same texture.matrix, on a mesh whose UVs were never made
  for texturing.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

// buildCheckerTexture(n): an n x n RGBA checkerboard, built as a plain
// Uint8Array (no image asset) — texel (x,y) is light when (x+y) is even.
function buildCheckerTexture(n) {
  const data = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const i = (y * n + x) * 4;
      const [r, g, b, a] = (x + y) % 2 === 0 ? LIGHT_SQUARE : DARK_SQUARE;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = a;
    }
  }
  const texture = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
  // RepeatWrapping both axes: tile > 1 reads UVs outside [0,1], and
  // NearestFilter keeps the checker crisp (no bilinear blur across texels).
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  // three.js only applies a texture's OWN matrix (rather than recomputing it
  // every frame from offset/repeat/rotation/center) when matrixAutoUpdate is
  // false — required so OUR uvMat3 output, written directly into
  // texture.matrix below, actually reaches the shader unmodified.
  texture.matrixAutoUpdate = false;
  texture.needsUpdate = true;
  return texture;
}

/**
 * make(container, opts)
 * opts.stage === 'full' builds all four SliderRows. Otherwise opts.controls
 * (array of param ids — embed exposes offU,tile) selects which SliderRows to
 * build.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { name: 'quad' };
  for (const id of Object.keys(PARAMS)) model[id] = PARAMS[id].value;

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

  const texture = buildCheckerTexture(CHECKER_SIZE);
  const material = new THREE.MeshBasicMaterial({ map: texture });
  // quadGeometry is demo-owned (built once, never mutated); cube/teapot/
  // bunny arrive as CACHED, SHARED instances from loadModel() and are only
  // ever assigned to `mesh.geometry`, never touched otherwise.
  const quadGeometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(quadGeometry, material);
  mesh.rotation.x = COSMETIC_TILT_X;
  scene.add(mesh);

  // Rail cards: the model selector, the controller (Controls sliders), and
  // the view (Matrix).
  const modelCard = shell.addCard('model');
  const selector = new ButtonRow(modelCard, {
    id: 'uv-placement-model',
    label: 'model',
    options: MODEL_OPTIONS,
    value: model.name,
  });

  const controlsCard = shell.addCard('Controls');
  const matrixCard = shell.addCard('Matrix');

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'uv-placement');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `uv-placement-${id}`, ...PARAMS[id] });
  }

  const matPanel = new Mat3Panel(matrixCard);
  const captionEl = document.createElement('p');
  captionEl.className = 'demo-hint';
  captionEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  captionEl.textContent = 'texture.matrix ← uvMat3(offU, offV, rot, tile, tile)';
  matrixCard.appendChild(captionEl);
  // Credit caption: a small dim line under the matrix card, populated from
  // the loaded model's `credit` (bunny: Stanford; teapot: Newell/public
  // domain; quad/cube: null → the line stays empty) — same mechanism as
  // mesh-view.js's creditEl.
  const creditEl = document.createElement('p');
  creditEl.className = 'demo-hint';
  creditEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  matrixCard.appendChild(creditEl);

  function update() {
    const M = uvMat3(model.offU, model.offV, model.rot, model.tile, model.tile);
    texture.matrix.fromArray(M);
    matPanel.update(M);
    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
  }

  // resolveMesh(name): the quad's geometry is demo-owned and built once
  // above (never rebuilt); cube/teapot/bunny resolve via loadModel()'s
  // cached, shared-instance loader.
  function resolveMesh(name) {
    if (name === 'quad') return Promise.resolve({ geometry: quadGeometry, credit: null });
    return loadModel(name);
  }

  // swapModel(name): keeps the CURRENT mesh on screen until the requested
  // model resolves (no flash-to-empty on a slow bunny fetch); requestSeq
  // discards a stale resolution if the user clicks a second model before the
  // first lands — same idiom as lod.js/mesh-view.js. The checker texture
  // and its uvMat3-driven texture.matrix never change here: only the mesh's
  // geometry, rotation (tilt is quad-only), and scale do.
  let requestSeq = 0;
  function swapModel(name) {
    const seq = ++requestSeq;
    resolveMesh(name)
      .then((data) => {
        if (seq !== requestSeq) return; // superseded by a later click
        mesh.geometry = data.geometry; // shared/cached (cube/teapot/bunny) or ours (quad) — never mutated
        mesh.rotation.x = name === 'quad' ? COSMETIC_TILT_X : 0;
        mesh.scale.setScalar(name === 'quad' ? 1 : MODEL_SCALE);
        creditEl.textContent = data.credit ?? '';
        render();
      })
      .catch((err) => {
        if (seq !== requestSeq) return;
        console.error(`uv-placement: failed to load model "${name}"`, err);
      });
  }

  selector.onChange((name) => {
    model.name = name;
    swapModel(name);
  });

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
