// dot-cross: the S02 vectors cockpit. ONE model {ax,ay,az,bx,by,bz}, a
// controller of SliderRows, and a view built from the same a/b: three
// ArrowHelpers (a red, b blue, a×b green) plus a dashed projection of a
// onto b (amber, along b) with a thin dashed drop connector back to a's
// tip, and a ValueTable readout (a·b, |a|, |b|, θ°, a×b). Uses dot/cross/
// normalize/sub from xform.js — no new vector math here.
import * as THREE from '../vendor/three.module.js';
import { dot, cross, normalize, sub } from '../core/xform.js';
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { resolveControlIds } from './registry.js';

const EPS = 1e-6;
const ORIGIN = new THREE.Vector3(0, 0, 0);

const COLOR_A = 0xff7b72; // red family
const COLOR_B = 0x79c0ff; // blue family
const COLOR_CROSS = 0x7ee787; // green
const COLOR_PROJ = 0xffa657; // amber — distinct from a/b/cross
const COLOR_DROP = 0x8b93a7; // muted gray connector

const PARAMS = {
  ax: { label: 'ax', min: -3, max: 3, step: 0.1, value: 2, format: (v) => v.toFixed(1) },
  ay: { label: 'ay', min: -3, max: 3, step: 0.1, value: 1, format: (v) => v.toFixed(1) },
  az: { label: 'az', min: -3, max: 3, step: 0.1, value: 0, format: (v) => v.toFixed(1) },
  bx: { label: 'bx', min: -3, max: 3, step: 0.1, value: 1, format: (v) => v.toFixed(1) },
  by: { label: 'by', min: -3, max: 3, step: 0.1, value: 2, format: (v) => v.toFixed(1) },
  bz: { label: 'bz', min: -3, max: 3, step: 0.1, value: 1, format: (v) => v.toFixed(1) },
};

/**
 * make(container, opts)
 * opts.stage === 'full' builds all six SliderRows plus a "show projection"
 * checkbox (default on). Otherwise opts.controls (array of param ids)
 * selects which SliderRows to build — embed stage never gets the toggle,
 * but the projection still renders (it defaults to shown).
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = {};
  for (const id of Object.keys(PARAMS)) model[id] = PARAMS[id].value;
  let showProjection = true;

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

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'dot-cross');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsEl, { id: `dot-cross-${id}`, ...PARAMS[id] });
  }

  let projCheckbox;
  if (stage === 'full') {
    const row = document.createElement('label');
    row.className = 'slider-row';
    projCheckbox = document.createElement('input');
    projCheckbox.type = 'checkbox';
    projCheckbox.id = 'dot-cross-projection';
    projCheckbox.checked = showProjection;
    const text = document.createElement('span');
    text.className = 'slider-label';
    text.textContent = 'show projection';
    row.append(projCheckbox, text);
    controlsEl.appendChild(row);
    projCheckbox.addEventListener('change', () => {
      showProjection = projCheckbox.checked;
      update();
    });
  }

  const panel = new ValueTable(panelEl, {
    rows: [
      { id: 'dot', label: 'a·b', className: 'row-h' },
      { id: 'lenA', label: '|a|', className: 'row-u' },
      { id: 'lenB', label: '|b|', className: 'row-w' },
      {
        id: 'theta',
        label: 'θ',
        className: 'row-h',
        format: (v) => (Number.isFinite(v) ? `${v.toFixed(2)}°` : '—'),
      },
      { id: 'cross', label: 'a×b', cols: 3, className: 'row-v' },
    ],
  });

  const { scene, render } = makeScene(viewportEl, { width: 400, height: 300 });

  let vizGroup = null;

  function clearViz() {
    if (vizGroup) {
      scene.remove(vizGroup);
      vizGroup.children.forEach((obj) => {
        if (typeof obj.dispose === 'function') obj.dispose();
        obj.geometry?.dispose();
        obj.material?.dispose();
      });
      vizGroup = null;
    }
  }

  function update() {
    const a = [model.ax, model.ay, model.az];
    const b = [model.bx, model.by, model.bz];

    const d = dot(a, b);
    const lenA = Math.hypot(...a);
    const lenB = Math.hypot(...b);
    const denom = lenA * lenB;
    const cosTheta = denom > EPS ? Math.min(1, Math.max(-1, d / denom)) : NaN;
    const thetaDeg = Number.isFinite(cosTheta) ? Math.acos(cosTheta) * (180 / Math.PI) : NaN;
    const c = cross(a, b);

    panel.update('dot', d);
    panel.update('lenA', lenA);
    panel.update('lenB', lenB);
    panel.update('theta', thetaDeg);
    panel.update('cross', c);

    clearViz();
    vizGroup = new THREE.Group();

    if (lenA > EPS) {
      vizGroup.add(new THREE.ArrowHelper(new THREE.Vector3(...normalize(a)), ORIGIN, lenA, COLOR_A));
    }
    if (lenB > EPS) {
      vizGroup.add(new THREE.ArrowHelper(new THREE.Vector3(...normalize(b)), ORIGIN, lenB, COLOR_B));
    }
    const lenC = Math.hypot(...c);
    if (lenC > EPS) {
      vizGroup.add(new THREE.ArrowHelper(new THREE.Vector3(...normalize(c)), ORIGIN, lenC, COLOR_CROSS));
    }

    if (showProjection && lenB > EPS) {
      // proj_b(a) = (a·b / b·b) b — the scalar projection scaled onto b.
      const t = d / (lenB * lenB);
      const proj = b.map((v) => v * t);

      const projGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(...proj),
      ]);
      const projMat = new THREE.LineDashedMaterial({ color: COLOR_PROJ, dashSize: 0.15, gapSize: 0.1 });
      const projLine = new THREE.Line(projGeom, projMat);
      projLine.computeLineDistances();
      vizGroup.add(projLine);

      // Thin dashed drop connector from the projection point back to a's
      // tip — the classic "foot of the perpendicular" diagram. Skipped when
      // a already lies on b (drop length ~0) to avoid a degenerate line.
      const dropVec = sub(a, proj);
      const dropLen = Math.hypot(...dropVec);
      if (dropLen > EPS) {
        const dropGeom = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...proj),
          new THREE.Vector3(...a),
        ]);
        const dropMat = new THREE.LineDashedMaterial({ color: COLOR_DROP, dashSize: 0.08, gapSize: 0.06 });
        const dropLine = new THREE.Line(dropGeom, dropMat);
        dropLine.computeLineDistances();
        vizGroup.add(dropLine);
      }
    }

    scene.add(vizGroup);
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
