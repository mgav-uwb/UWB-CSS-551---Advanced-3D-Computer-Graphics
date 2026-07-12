// axis-angle: the S03 rotation cockpit. ONE model {axX, axY, axZ, angle}, a
// controller of SliderRows, and a view built from OUR axisAngleMatrix: a
// marked cube (distinct face colors, matrixAutoUpdate=false — the model
// drives the matrix, never the other way around) spun about a persistent
// two-sided arrow through the origin, plus a cockpit showing the equivalent
// quaternion (quatFromAxisAngle) and the 4x4 R (Mat4Panel). Full stage adds a
// "trace path" toggle: dots marking one cube corner's path as angle changes.
// Uses axisAngleMatrix/quatFromAxisAngle from xform.js — no new rotation math
// here.
import * as THREE from '../vendor/three.module.js';
import { axisAngleMatrix, quatFromAxisAngle } from '../core/xform.js';
import { SliderRow, Mat4Panel, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { resolveControlIds } from './registry.js';

const ORIGIN = new THREE.Vector3(0, 0, 0);
const AXIS_COLOR = 0xffd166; // gold — distinct from every cube face color
const TRACE_COLOR = 0xe7eaf0; // near-white — distinct from axis + faces
const ARROW_LEN = 1.8;
const TRACE_CAP = 150;

// BoxGeometry material array order is [+x, -x, +y, -y, +z, -z] — six
// distinct, legible colors so the cube's orientation is always readable.
const FACE_COLORS = [0xff5555, 0xff9955, 0x55ff88, 0x55ffee, 0x5588ff, 0xcc55ff];

// Order here is also the "full stage" slider order, and axis-angle's first
// slider (axX) is what tools/test-demos.mjs drives as the platform smoke
// test — dragging it from its default (0) changes the rotation axis (and
// therefore R, the quaternion, and the rendered pixels) since the default
// angle (30) is non-zero.
const PARAMS = {
  axX: { label: 'axX', min: -1, max: 1, step: 0.05, value: 0, format: (v) => v.toFixed(2) },
  axY: { label: 'axY', min: -1, max: 1, step: 0.05, value: 1, format: (v) => v.toFixed(2) },
  axZ: { label: 'axZ', min: -1, max: 1, step: 0.05, value: 0, format: (v) => v.toFixed(2) },
  angle: { label: 'angle', min: 0, max: 360, step: 1, value: 30, format: (v) => `${v.toFixed(0)}°` },
};

/**
 * make(container, opts)
 * opts.stage === 'full' builds all four SliderRows plus a "trace path"
 * checkbox. Otherwise opts.controls (array of param ids) selects which
 * SliderRows to build — embed stage never gets the trace toggle.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = {
    axX: PARAMS.axX.value,
    axY: PARAMS.axY.value,
    axZ: PARAMS.axZ.value,
    angle: PARAMS.angle.value,
  };
  // Zero/near-zero axis sliders must not throw to console: we clamp by
  // holding the last valid (non-degenerate) axis and surfacing an "axis ~ 0"
  // hint in the readout instead of calling axisAngleMatrix with a zero axis.
  let lastValidAxis = [model.axX, model.axY, model.axZ];
  let traceOn = false;

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

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'axis-angle');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsEl, { id: `axis-angle-${id}`, ...PARAMS[id] });
  }

  let traceCheckbox;
  if (stage === 'full') {
    const row = document.createElement('label');
    row.className = 'slider-row';
    traceCheckbox = document.createElement('input');
    traceCheckbox.type = 'checkbox';
    traceCheckbox.id = 'axis-angle-trace';
    const text = document.createElement('span');
    text.className = 'slider-label';
    text.textContent = 'trace path';
    row.append(traceCheckbox, text);
    controlsEl.appendChild(row);
    traceCheckbox.addEventListener('change', () => {
      traceOn = traceCheckbox.checked;
      if (!traceOn) clearTrace();
      update();
    });
  }

  const quatTable = new ValueTable(panelEl, {
    rows: [{ id: 'q', label: 'q [x,y,z,w]', cols: 4, className: 'row-h', format: (v) => v.toFixed(3) }],
  });
  const matPanel = new Mat4Panel(panelEl);
  const hintEl = document.createElement('p');
  hintEl.className = 'demo-hint';
  hintEl.style.color = '#ff7b72';
  hintEl.style.fontSize = '12px';
  hintEl.style.margin = '6px 0 0';
  panelEl.appendChild(hintEl);

  const { scene, render } = makeScene(viewportEl, { width: 400, height: 300 });

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    FACE_COLORS.map((color) => new THREE.MeshStandardMaterial({ color })),
  );
  cube.matrixAutoUpdate = false;
  scene.add(cube);

  let axisGroup = null;
  let traceGroup = null;
  let traceCount = 0;

  function clearAxisArrow() {
    if (axisGroup) {
      scene.remove(axisGroup);
      axisGroup.children.forEach((a) => a.dispose());
      axisGroup = null;
    }
  }

  function clearTrace() {
    if (traceGroup) {
      scene.remove(traceGroup);
      traceGroup.children.forEach((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
      traceGroup = null;
    }
    traceCount = 0;
  }

  // Guard: returns a non-degenerate [x, y, z] axis to feed axisAngleMatrix /
  // quatFromAxisAngle, holding the last valid axis (and flagging the hint)
  // when the sliders currently sit at (or within 1e-8 of) zero.
  function effectiveAxis() {
    const raw = [model.axX, model.axY, model.axZ];
    if (Math.hypot(...raw) < 1e-8) {
      hintEl.textContent = 'axis ~ 0 — holding last valid axis';
      return lastValidAxis;
    }
    hintEl.textContent = '';
    lastValidAxis = raw;
    return raw;
  }

  function update() {
    const [ex, ey, ez] = effectiveAxis();
    const R = axisAngleMatrix(ex, ey, ez, model.angle);
    const q = quatFromAxisAngle(ex, ey, ez, model.angle);

    cube.matrix.fromArray(R);
    quatTable.update('q', q);
    matPanel.update(R);

    clearAxisArrow();
    const dir = new THREE.Vector3(ex, ey, ez).normalize();
    axisGroup = new THREE.Group();
    axisGroup.add(new THREE.ArrowHelper(dir, ORIGIN, ARROW_LEN, AXIS_COLOR));
    axisGroup.add(new THREE.ArrowHelper(dir.clone().negate(), ORIGIN, ARROW_LEN, AXIS_COLOR));
    scene.add(axisGroup);

    if (traceOn) {
      if (!traceGroup) {
        traceGroup = new THREE.Group();
        scene.add(traceGroup);
      }
      if (traceCount < TRACE_CAP) {
        const corner = new THREE.Vector3(0.5, 0.5, 0.5).applyMatrix4(new THREE.Matrix4().fromArray(R));
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 6, 6),
          new THREE.MeshBasicMaterial({ color: TRACE_COLOR }),
        );
        dot.position.copy(corner);
        traceGroup.add(dot);
        traceCount++;
      }
    }

    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      // Rotation-axis changes invalidate any in-progress trace (per spec:
      // cleared on any axis change or toggle-off); an angle-only change is
      // exactly what the trace is meant to accumulate.
      if (id !== 'angle') clearTrace();
      update();
    });
  }

  update();
  return { model, sliders, panel: matPanel };
}
