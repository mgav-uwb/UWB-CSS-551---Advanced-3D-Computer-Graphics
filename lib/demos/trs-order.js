// trs-order: the S04 matrix-composition cockpit. ONE model {tx, ry}, plus a
// rotate/scale mode toggle, and two identical marked cubes built from the
// SAME factors matMul'd in opposite orders — "same factors, different
// order" is the whole point. Rotate mode: T = makeTRS(tx,0,0, 0,0,0,1,1,1),
// R = makeTRS(0,0,0, 0,ry,0, 1,1,1); left = matMul(T,R), right = matMul(R,T).
// Scale mode: second factor is S = makeTRS(0,0,0,0,0,0,s,s,s) with
// s = 1 + tx/3 (the tx slider doubles as S's scalar; ry is unused in this
// mode — see the cockpit caption). Uses matMul + makeTRS from xform.js; no
// new matrix math lives here. The left/right world-space offset (+-2 in x)
// is an OUTER positioning convenience via THREE.Group.position — NOT part
// of the taught T/R/S composition, so it never touches matMul/makeTRS.
// Ground radius markers were left out: scene-shell's GridHelper already
// reads as ground reference and a radius ring added little for the line
// budget here.
import * as THREE from '../vendor/three.module.js';
import { makeTRS, matMul } from '../core/xform.js';
import { SliderRow, Mat4Panel } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { resolveControlIds } from './registry.js';

const OUTER_OFFSET = 2; // outer positioning offset (see file header) — not a taught matrix.

// BoxGeometry material array order is [+x, -x, +y, -y, +z, -z] — distinct
// colors so each cube's orientation stays legible under both R and S.
const FACE_COLORS = [0xff5555, 0xff9955, 0x55ff88, 0x55ffee, 0x5588ff, 0xcc55ff];

// Order here is also the "full stage" slider order; tx (first) is what
// tools/test-demos.mjs drives as the platform smoke test.
const PARAMS = {
  tx: { label: 'tx', min: 0, max: 3, step: 0.1, value: 1.5, format: (v) => v.toFixed(2) },
  ry: { label: 'ry', min: 0, max: 180, step: 1, value: 60, format: (v) => `${v.toFixed(0)}°` },
};

function makeCube() {
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    FACE_COLORS.map((color) => new THREE.MeshStandardMaterial({ color })),
  );
  cube.matrixAutoUpdate = false;
  return cube;
}

function labeledPanel(container, text) {
  const label = document.createElement('p');
  label.className = 'demo-hint';
  label.style.cssText = 'margin:10px 0 2px;color:#8b93a7;font-size:12px;';
  label.textContent = text;
  container.appendChild(label);
  return new Mat4Panel(container);
}

/**
 * make(container, opts)
 * opts.stage === 'full' builds both SliderRows plus a rotate/scale mode
 * toggle (radio: T·R/R·T vs T·S/S·T). Otherwise opts.controls (array of
 * param ids) selects which SliderRows to build — embed stage stays in
 * rotate mode.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { tx: PARAMS.tx.value, ry: PARAMS.ry.value };
  let scaleMode = false;

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

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'trs-order');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsEl, { id: `trs-order-${id}`, ...PARAMS[id] });
  }

  if (stage === 'full') {
    const row = document.createElement('div');
    row.className = 'slider-row';
    for (const [val, text] of [['rotate', 'T·R / R·T'], ['scale', 'T·S / S·T']]) {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'trs-order-mode';
      radio.value = val;
      radio.checked = val === 'rotate';
      radio.addEventListener('change', () => {
        scaleMode = val === 'scale';
        update();
      });
      const span = document.createElement('span');
      span.className = 'slider-label';
      span.textContent = text;
      label.append(radio, span);
      row.appendChild(label);
    }
    controlsEl.appendChild(row);
  }

  const leftPanel = labeledPanel(panelEl, 'left = T·B');
  const rightPanel = labeledPanel(panelEl, 'right = B·T');
  const factorTPanel = labeledPanel(panelEl, 'factor T');
  const factorBPanel = labeledPanel(panelEl, 'factor B (R in rotate mode, S in scale mode)');
  const caption = document.createElement('p');
  caption.className = 'demo-hint';
  caption.style.cssText = 'margin:10px 0 0;color:#8b93a7;font-size:12px;';
  caption.textContent =
    "same factors, different order — scale mode reuses tx as S's scalar s = 1 + tx/3; ry is ignored in scale mode";
  panelEl.appendChild(caption);

  const { scene, render } = makeScene(viewportEl, { width: 400, height: 300 });

  const leftGroup = new THREE.Group();
  leftGroup.position.set(-OUTER_OFFSET, 0, 0); // outer offset, see file header
  const rightGroup = new THREE.Group();
  rightGroup.position.set(OUTER_OFFSET, 0, 0); // outer offset, see file header
  const leftCube = makeCube();
  const rightCube = makeCube();
  leftGroup.add(leftCube);
  rightGroup.add(rightCube);
  scene.add(leftGroup, rightGroup);

  function update() {
    const T = makeTRS(model.tx, 0, 0, 0, 0, 0, 1, 1, 1);
    const s = 1 + model.tx / 3;
    const B = scaleMode ? makeTRS(0, 0, 0, 0, 0, 0, s, s, s) : makeTRS(0, 0, 0, 0, model.ry, 0, 1, 1, 1);

    const TB = matMul(T, B);
    const BT = matMul(B, T);

    leftCube.matrix.fromArray(TB);
    rightCube.matrix.fromArray(BT);

    leftPanel.update(TB);
    rightPanel.update(BT);
    factorTPanel.update(T);
    factorBPanel.update(B);

    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
  }

  update();
  return { model, sliders, panel: leftPanel };
}
