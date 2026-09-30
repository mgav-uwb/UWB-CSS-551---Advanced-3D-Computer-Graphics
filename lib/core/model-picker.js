// model-picker.js: the shared mesh picker every mesh demo mounts in its rail. One compact row (a
// labelled dropdown, the height of a ButtonRow row, so a deck embed stays inside its slide),
// offering the simple shapes and the classics of core/models.js's MODEL_CHOICES:
//   triangle, quad, cube, sphere, ico, torus, cylinder, cone, teapot, bunny, dragon
//
//   const picker = makeModelPicker(card, { id: 'mesh-view-model', value: 'cube', onChange: swapModel });
//   options: include (a list of model names, default MODEL_CHOICES), extra (demo-specific entries
//   placed first, e.g. [{ value: 'wall', label: 'wall' }] for bump-map's own brick wall), label.
//
// The select blurs after every change, like ButtonRow's buttons: a focused control would swallow
// the arrow keys of a reveal.js deck embed.
import { MODEL_CHOICES, MODEL_INFO } from './models.js';

const CSS = `
.cockpit .model-picker{display:flex;align-items:center;gap:10px;background:#14161d;border:1px solid #262a35;border-radius:6px;padding:8px 12px;margin-bottom:8px}
.cockpit .model-picker select{flex:1;min-width:0;background:#1c1f28;color:#e7eaf0;border:1px solid #262a35;border-radius:4px;padding:5px 6px;font:12px/1.2 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;cursor:pointer}
.cockpit .model-picker select:hover{background:#262a35}
.cockpit .model-picker select:focus{outline:1px solid #2d6b46}
.cockpit .model-picker optgroup{color:#8b93a7}
`;
let cssDone = false;
function injectCSS() {
  if (cssDone || typeof document === 'undefined') return;
  const st = document.createElement('style');
  st.textContent = CSS;
  document.head.appendChild(st);
  cssDone = true;
}

const SIMPLE = new Set(['triangle', 'quad', 'cube', 'sphere', 'ico', 'torus', 'cylinder', 'cone']);

export function makeModelPicker(container, { id, label = 'model', value, include = MODEL_CHOICES, extra = [], onChange } = {}) {
  injectCSS();
  const row = document.createElement('div');
  row.className = 'model-picker';
  const lab = document.createElement('label');
  lab.className = 'slider-label';
  lab.textContent = label;
  lab.htmlFor = id;
  const sel = document.createElement('select');
  sel.id = id;
  const addGroup = (name, entries) => {
    if (!entries.length) return;
    const g = document.createElement('optgroup');
    g.label = name;
    for (const e of entries) {
      const o = document.createElement('option');
      o.value = e.value; o.textContent = e.label;
      g.appendChild(o);
    }
    sel.appendChild(g);
  };
  const names = include.filter((n) => MODEL_INFO[n]);
  addGroup('this demo', extra);
  addGroup('simple shapes', names.filter((n) => SIMPLE.has(n)).map((n) => ({ value: n, label: MODEL_INFO[n].label })));
  addGroup('classics', names.filter((n) => !SIMPLE.has(n)).map((n) => ({ value: n, label: MODEL_INFO[n].label })));
  sel.value = value;
  sel.addEventListener('change', () => { onChange?.(sel.value); sel.blur(); });
  row.append(lab, sel);
  container.appendChild(row);
  return {
    el: row,
    get: () => sel.value,
    set: (v) => { sel.value = v; },
  };
}

// For demos whose picker is new: show it on the full demo page, and in a slide embed only when
// the embed lists 'model' in data-controls. Returns the controls without 'model', so
// resolveControlIds does not warn about it.
export function pickerWanted(stage, controls) {
  const list = controls ?? [];
  return { show: stage === 'full' || list.includes('model'), controls: list.filter((c) => c !== 'model') };
}

// For demos whose object is a stand-in cube (the transform demos): swap the meshes' geometry to
// any picked model. The cube keeps its original geometry and per-face materials (their colors mark
// the axes); every other model gets one flat-colored material, double-sided for flat shapes.
// Returns onChange(name) for makeModelPicker.
export function makeShapeSwapper(meshes, { color = 0x6094d2, render, lod = 'l1' } = {}) {
  const originals = meshes.map((m) => ({ geometry: m.geometry, material: m.material }));
  let seq = 0;
  return async (name) => {
    const mine = ++seq;
    if (name === 'cube') {
      meshes.forEach((m, i) => { m.geometry = originals[i].geometry; m.material = originals[i].material; });
      render?.();
      return;
    }
    const { loadModel, FLAT_MODELS } = await import('./models.js');
    const THREE = await import('../vendor/three.module.js');
    const { geometry } = await loadModel(name, { lod });
    if (mine !== seq) return;
    meshes.forEach((m) => {
      m.geometry = geometry;
      m.material = new THREE.MeshStandardMaterial({ color, roughness: 0.55, side: FLAT_MODELS.has(name) ? THREE.DoubleSide : THREE.FrontSide });
    });
    render?.();
  };
}
