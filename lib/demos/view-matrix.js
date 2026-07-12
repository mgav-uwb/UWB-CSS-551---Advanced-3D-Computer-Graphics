// view-matrix: the thesis demo — glass cockpit for the hand-built view matrix.
// ONE model {az, el, dist} (azimuth, elevation degrees, eye-to-target
// distance), a controller of SliderRows, and views built from the same V:
// three.js's camera consumes OUR matrix (matrixAutoUpdate=false, never
// camera.lookAt), a Mat4Panel readout with u/v/w rows colored, and (full
// stage only) three ArrowHelpers at the eye showing the basis lookAtBasis
// built.
import * as THREE from '../vendor/three.module.js';
import { lookAtBasis } from '../core/xform.js';
import { SliderRow, Mat4Panel } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';

const D = Math.PI / 180;
const AT = [0, 0.5, 0];
const UP = [0, 1, 0];

// Elevation stays inside ±80° so up (world +Y) never lines up with the
// eye-at direction — lookAtBasis throws on that degenerate case by design;
// this demo must never hit it.
const PARAMS = {
  az: { label: 'az', min: 0, max: 360, step: 1, value: 35, format: (v) => `${v.toFixed(0)}°` },
  el: { label: 'el', min: -80, max: 80, step: 1, value: 20, format: (v) => `${v.toFixed(0)}°` },
  dist: { label: 'dist', min: 3, max: 14, step: 0.1, value: 7, format: (v) => v.toFixed(1) },
};

// The brainstorm mock's scene: 3 boxes of varying height on the scene-shell's grid.
const BOXES = [
  { x: -1.6, z: -0.8, color: 0xcc5544, h: 1.4 },
  { x: 1.4, z: 0.6, color: 0x4477cc, h: 2.2 },
  { x: 0.2, z: -2.0, color: 0x44aa66, h: 0.9 },
];

/**
 * make(container, opts)
 * opts.stage === 'full' builds all three SliderRows plus a "show basis
 * arrows" checkbox. Otherwise opts.controls (array of param ids) selects
 * which SliderRows to build — embed stage never gets the arrows toggle.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { az: PARAMS.az.value, el: PARAMS.el.value, dist: PARAMS.dist.value };
  let showArrows = false;

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

  const ids = stage === 'full' ? Object.keys(PARAMS) : (controls ?? []);
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsEl, { id: `view-matrix-${id}`, ...PARAMS[id] });
  }

  let arrowsCheckbox;
  if (stage === 'full') {
    const row = document.createElement('label');
    row.className = 'slider-row';
    arrowsCheckbox = document.createElement('input');
    arrowsCheckbox.type = 'checkbox';
    arrowsCheckbox.id = 'view-matrix-arrows';
    const text = document.createElement('span');
    text.className = 'slider-label';
    text.textContent = 'show basis arrows';
    row.append(arrowsCheckbox, text);
    controlsEl.appendChild(row);
    arrowsCheckbox.addEventListener('change', () => {
      showArrows = arrowsCheckbox.checked;
      update();
    });
  }

  const panel = new Mat4Panel(panelEl, { rowClasses: ['row-u', 'row-v', 'row-w', 'row-h'] });
  const { scene, camera, render } = makeScene(viewportEl, { width: 400, height: 300 });
  camera.matrixAutoUpdate = false;

  for (const { x, z, color, h } of BOXES) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, h, 1), new THREE.MeshStandardMaterial({ color }));
    box.position.set(x, h / 2, z);
    scene.add(box);
  }

  let arrowsGroup = null;

  function update() {
    const azRad = model.az * D;
    const elRad = model.el * D;
    const eye = [
      AT[0] + model.dist * Math.cos(elRad) * Math.sin(azRad),
      AT[1] + model.dist * Math.sin(elRad),
      AT[2] + model.dist * Math.cos(elRad) * Math.cos(azRad),
    ];
    const { u, v, w, V } = lookAtBasis(eye, AT, UP);
    const uVec = new THREE.Vector3(...u);
    const vVec = new THREE.Vector3(...v);
    const wVec = new THREE.Vector3(...w);
    const eyeVec = new THREE.Vector3(...eye);

    // Our hand-built V drives the camera directly — never camera.lookAt().
    camera.matrixWorld.makeBasis(uVec, vVec, wVec).setPosition(eyeVec);
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert();
    panel.update(V);

    if (arrowsGroup) {
      scene.remove(arrowsGroup);
      arrowsGroup.children.forEach(a => a.dispose());
      arrowsGroup = null;
    }
    if (showArrows) {
      // Arrows sit AT the camera (eye), so they're invisible from the
      // camera's own view — a future second-viewport stage in the full
      // sandbox would be where you'd actually see them from outside. Not
      // built here (YAGNI): this task only wires the toggle + places the
      // arrows correctly.
      arrowsGroup = new THREE.Group();
      arrowsGroup.add(new THREE.ArrowHelper(uVec, eyeVec, 1.5, 0xff7b72));
      arrowsGroup.add(new THREE.ArrowHelper(vVec, eyeVec, 1.5, 0x7ee787));
      arrowsGroup.add(new THREE.ArrowHelper(wVec, eyeVec, 1.5, 0x79c0ff));
      scene.add(arrowsGroup);
    }

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
