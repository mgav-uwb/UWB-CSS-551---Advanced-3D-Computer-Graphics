// uv-placement: the S08 texture cockpit. ONE model {offU, offV, rot, tile},
// a controller of SliderRows, and a view built from OUR uvMat3: a quad
// textured with an in-code 8x8 checkerboard THREE.DataTexture whose
// texture.matrix is set (matrixAutoUpdate=false) straight from uvMat3's
// column-major 9-array every update — the lesson is the UV matrix, not the
// quad, so PlaneGeometry is fine here (contrast mesh-grid.js, where hand-
// building the mesh WAS the lesson). Cockpit: a live Mat3Panel readout of
// that same matrix. Uses uvMat3 from xform.js — no new UV math here.
import * as THREE from '../vendor/three.module.js';
import { uvMat3 } from '../core/xform.js';
import { SliderRow, Mat3Panel } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { resolveControlIds } from './registry.js';

const CHECKER_SIZE = 8; // 8x8 checker texels
const LIGHT_SQUARE = [0xe7, 0xea, 0xf0, 0xff]; // near-white, RGBA
const DARK_SQUARE = [0x26, 0x2a, 0x35, 0xff]; // near-black (lib.css panel bg family)

// Quad tilt toward the observer camera (scene-shell's default eye sits at
// (3,3,6)): purely cosmetic staging so the checker reads as a plane in
// perspective rather than a flat-on rectangle — it is NOT part of the taught
// UV-matrix math and never touches uvMat3 or texture.matrix.
const COSMETIC_TILT_X = -0.3; // radians, ~-17°

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
  const model = {};
  for (const id of Object.keys(PARAMS)) model[id] = PARAMS[id].value;

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

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'uv-placement');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsEl, { id: `uv-placement-${id}`, ...PARAMS[id] });
  }

  const matPanel = new Mat3Panel(panelEl);
  const captionEl = document.createElement('p');
  captionEl.className = 'demo-hint';
  captionEl.style.fontSize = '12px';
  captionEl.style.margin = '6px 0 0';
  captionEl.textContent = 'texture.matrix ← uvMat3(offU, offV, rot, tile, tile)';
  panelEl.appendChild(captionEl);

  const { scene, render } = makeScene(viewportEl, { width: 400, height: 300 });

  const texture = buildCheckerTexture(CHECKER_SIZE);
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.rotation.x = COSMETIC_TILT_X;
  scene.add(quad);

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

  update();
  return { model, sliders, panel: matPanel };
}
