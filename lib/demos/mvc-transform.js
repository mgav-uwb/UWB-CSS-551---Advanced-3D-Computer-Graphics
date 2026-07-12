// mvc-transform: the MVC teaching demo, and the demo-platform smoke test.
// ONE model {tx, ry, s} (translate-x, rotate-y degrees, uniform scale), a
// controller of SliderRows, and TWO views built from the same matrix:
// a 3D cube (matrixAutoUpdate=false — the model drives the matrix, not the
// other way around) and a Mat4Panel readout of that same matrix.
import * as THREE from '../vendor/three.module.js';
import { makeTRS } from '../core/xform.js';
import { SliderRow, Mat4Panel } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { resolveControlIds } from './registry.js';

// Order here is also the "full stage" slider order, and mvc-transform's
// first slider (tx) is what tools/test-demos.mjs drives as the platform
// smoke test.
const PARAMS = {
  tx: { label: 'tx', min: -4, max: 4, step: 0.1, value: 0, format: (v) => v.toFixed(2) },
  ry: { label: 'ry', min: 0, max: 360, step: 1, value: 0, format: (v) => `${v.toFixed(0)}°` },
  s: { label: 's', min: 0.25, max: 2.5, step: 0.05, value: 1, format: (v) => v.toFixed(2) },
};

/**
 * make(container, opts)
 * opts.stage === 'full' builds all three SliderRows (the full sandbox).
 * Otherwise opts.controls (array of param ids, e.g. ['ry']) selects which
 * SliderRows to build — the two views (cube + Mat4Panel) are always built.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = {
    tx: PARAMS.tx.value,
    ry: PARAMS.ry.value,
    s: PARAMS.s.value,
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

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'mvc-transform');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsEl, { id: `mvc-${id}`, ...PARAMS[id] });
  }

  const panel = new Mat4Panel(panelEl);
  const { scene, render } = makeScene(viewportEl, { width: 400, height: 300 });

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x5cd47a }),
  );
  cube.matrixAutoUpdate = false;
  scene.add(cube);

  function update() {
    const M = makeTRS(model.tx, 0, 0, 0, model.ry, 0, model.s, model.s, model.s);
    cube.matrix.fromArray(M);
    panel.update(M);
    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
  }

  update();
  return { model, sliders, panel };
}
