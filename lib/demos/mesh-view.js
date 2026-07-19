// mesh-view: real models, wireframe -> solid. ONE model {name, wire, spin};
// a ButtonRow picks WHICH model (cube · teapot · bunny · dragon, loaded via
// core/models.js's loadModel), `wire` blends a solid MeshPhongMaterial
// against a LineSegments(WireframeGeometry) overlay (0 = solid, 1 = pure
// wireframe), `spin` yaws the model about Y. The lesson is "a real mesh is
// still just vertices + triangles" — the readout's exact vertex/triangle
// counts (from loadModel, never hand-computed here) prove that even a
// 69,451-triangle Stanford bunny is the same vertex/index-buffer story as
// the hand-built quad grid, just bigger.
//
// wire is deliberately continuous (0..1, not a checkbox) and drives BOTH
// materials' opacity every frame — solid opacity = 1 - 0.7*wire, wireframe
// line opacity = wire — so both are always present in the scene graph and
// the blend is a genuine cross-fade, not a visibility toggle: the harness's
// min<->max drag on this (the FIRST param) changes rendered pixels smoothly
// at every step, and the readout's own `wire` row (percentage) changes in
// lockstep, so the platform's "first slider moves both a readout cell and
// canvas pixels" contract holds without ever touching the model selector
// (a ButtonRow, never a range input, so it's outside that contract).
//
// loadModel()'s geometries are CACHED, SHARED instances (core/models.js) —
// never scaled/translated/mutated here. All placement (the "sits on the
// grid" lift, spin) happens on a wrapping THREE.Group, never the geometry.
// The wireframe overlay's THREE.WireframeGeometry(geometry) IS a fresh
// derived copy per swap, so (unlike the loaded geometry) it's ours to
// dispose when replaced.
//
// Async model swap: switching models (bunny/dragon fetch a .mesh.bin over
// the network) keeps the CURRENT mesh on screen until the new one resolves
// — no flash-to-empty. A monotonic request sequence number discards a
// stale resolution if the user clicks a second model before the first
// arrives.
import * as THREE from '../vendor/three.module.js';
import { loadModel } from '../core/models.js';
import { SliderRow, ButtonRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const SOLID_COLOR = 0x6094d2; // the shared cockpit-demo mesh blue (lod.js, keyframe.js)
const WIRE_COLOR = 0xffffff;

// bunny/dragon are the two file-backed Stanford models; both load their
// highest prepped resolution (l3) here — mesh-view's story is "here is the
// REAL model," not a LOD ladder (that's lod.js's job).
const FILE_MODEL_LOD = 'l3';

const MODEL_OPTIONS = [
  { value: 'cube', label: 'cube' },
  { value: 'teapot', label: 'teapot' },
  { value: 'bunny', label: 'bunny' },
  { value: 'dragon', label: 'dragon' },
];

// wire FIRST: tools/test-demos.mjs drives the first range input — wire
// changes both the readout's wire% row and the rendered pixels (the solid/
// wireframe opacity cross-fade), with zero model interaction required.
const PARAMS = {
  wire: { label: 'wire', min: 0, max: 1, step: 0.01, value: 0.35, format: (v) => `${(v * 100).toFixed(0)}%` },
  spin: { label: 'spin', min: 0, max: 360, step: 1, value: 20, format: (v) => `${v.toFixed(0)}°` },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A real model — cube, teapot, or a Stanford-scanned bunny/dragon —
  rendered as a solid surface and its wireframe at once, cross-faded by one
  slider. The readout shows the model's exact vertex and triangle counts.</p>
  <h4>The concept</h4>
  <p>However a model was made (hand-modeled, scanned, procedurally
  generated), it ends up as the same thing underneath: a list of vertices
  and a list of triangles indexing them. The wireframe overlay makes that
  triangle list visible; the solid render is what the GPU rasterizes from
  it. A 69,451-triangle scanned bunny is not a different KIND of data from
  an 8-triangle cube — just more of the same data.</p>
  <h4>Try this</h4>
  <p>Pick the bunny or dragon, then drag <code>wire</code> to 1 — the solid
  surface fades out, leaving only the triangle mesh a real scan produces.
  Drag <code>spin</code> to see the model from every side. Drag to orbit;
  scroll to zoom.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

/**
 * make(container, opts)
 * opts.stage === 'full' builds both SliderRows; otherwise opts.controls
 * (deck embeds expose wire,spin) selects them. The model ButtonRow is
 * always built — model choice is outside the slider opt-in mechanism,
 * exactly like every other demo's selector (see uv-placement.js/lod.js).
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { name: 'cube', wire: PARAMS.wire.value, spin: PARAMS.spin.value };

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

  const sc = makeScene(shell.sceneEl, { fill: true });
  const { scene } = sc;
  ({ grid, axes, render } = sc);

  // A group carries the mesh + wireframe overlay TOGETHER so the "sits on
  // the grid" lift and the spin yaw apply identically to both — neither
  // ever touches the (shared, cached) geometry itself.
  const group = new THREE.Group();
  scene.add(group);

  const solidMaterial = new THREE.MeshPhongMaterial({
    color: SOLID_COLOR,
    shininess: 22,
    transparent: true,
    opacity: 1 - 0.7 * model.wire,
  });
  const lineMaterial = new THREE.LineBasicMaterial({
    color: WIRE_COLOR,
    transparent: true,
    opacity: model.wire,
  });

  // Empty placeholders until the first loadModel() resolves (see swapModel
  // below) — both materials are attached from the very first frame, exactly
  // like every subsequent swap, so there's never a "half-built" mesh.
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), solidMaterial);
  const wireMesh = new THREE.LineSegments(new THREE.BufferGeometry(), lineMaterial);
  group.add(mesh);
  group.add(wireMesh);

  const modelCard = shell.addCard('model');
  const selector = new ButtonRow(modelCard, {
    id: 'mesh-view-model',
    label: 'model',
    options: MODEL_OPTIONS,
    value: model.name,
  });

  const controlsCard = shell.addCard('controller — wireframe ↔ solid');
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'mesh-view');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `mesh-view-${id}`, ...PARAMS[id] });
  }

  const readoutCard = shell.addCard('readout — the mesh');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'model', label: 'model', format: (v) => v },
      { id: 'verts', label: 'vertices', format: (v) => v.toLocaleString('en-US') },
      { id: 'tris', label: 'triangles', format: (v) => v.toLocaleString('en-US') },
      { id: 'wire', label: 'wire', format: (v) => `${(v * 100).toFixed(0)}%` },
    ],
  });

  // Credit caption: a small dim line under the readout, populated from the
  // loaded model's `credit` (bunny/dragon: Stanford; teapot: Newell/public
  // domain; cube: null → the line stays empty) — see core/models.js's
  // MODEL_INFO for the exact credit strings.
  const creditEl = document.createElement('p');
  creditEl.className = 'demo-hint';
  creditEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  readoutCard.appendChild(creditEl);

  // updateBlend(): the ONE place `wire` -> both materials' opacity + the
  // readout's wire% row. Called on every wire slider input (never touches
  // the mesh/geometry, so it's cheap and safe to call mid-async-swap too).
  function updateBlend() {
    solidMaterial.opacity = 1 - 0.7 * model.wire;
    lineMaterial.opacity = model.wire;
    table.update('wire', model.wire);
  }

  // updateSpin(): the ONE place `spin` (degrees) -> the group's yaw.
  function updateSpin() {
    group.rotation.y = (model.spin * Math.PI) / 180;
  }

  // swapModel(name): fetch/build the named model and, once it resolves,
  // swap the group's geometry + rebuild the wireframe overlay + refresh the
  // readout — the CURRENT mesh stays exactly as-is on screen until then (no
  // flash-to-empty on a slow bunny/dragon fetch). requestSeq discards a
  // stale resolution if a second model is picked before the first lands.
  let requestSeq = 0;
  function swapModel(name) {
    const seq = ++requestSeq;
    loadModel(name, { lod: FILE_MODEL_LOD })
      .then(({ geometry, tris, verts, credit }) => {
        if (seq !== requestSeq) return; // superseded by a later click
        const oldWireGeom = wireMesh.geometry;
        mesh.geometry = geometry; // shared/cached across demos — never mutated
        wireMesh.geometry = new THREE.WireframeGeometry(geometry); // our own derived copy
        oldWireGeom.dispose();
        // Every model normalizes to unit height, centered at the origin, so
        // bbox.min.y === -0.5 — lift the GROUP (never the geometry) by 0.5
        // so the model's base sits on the y=0 grid.
        group.position.y = 0.5;
        table.update('model', name);
        table.update('verts', verts);
        table.update('tris', tris);
        creditEl.textContent = credit ?? '';
        render();
      })
      .catch((err) => {
        if (seq !== requestSeq) return;
        console.error(`mesh-view: failed to load model "${name}"`, err);
      });
  }

  selector.onChange((name) => {
    model.name = name;
    swapModel(name);
  });

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      if (id === 'wire') updateBlend();
      if (id === 'spin') updateSpin();
      render();
    });
  }

  const cam = makeOrbitCamera({
    camera: sc.camera,
    render,
    home: { eye: [3, 3, 6], target: [0, 0.5, 0] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  updateBlend();
  updateSpin();
  swapModel(model.name); // kicks off the initial (cube) load
  render();

  return { model, sliders, cam, input: cam };
}
