// lod: level of detail — the SAME object at five mesh resolutions. An
// icosphere at subdivision level 0..4 (20 → 5,120 triangles); `level` swaps
// the geometry, `dist` slides the object away from home. The lesson is
// multi-resolution modeling: far away, the 20-triangle version is
// indistinguishable from the 5,120-triangle one — so engines swap meshes by
// distance (LOD) and pay only for detail the eye can see. Flat shading on
// purpose: facets ARE the story. Counts are the exact icosphere numbers
// (verts 10·4^L+2, tris 20·4^L) and the readout doubles as the harness's
// .mat-panel cell (level drives counts AND pixels).
//
// Three's IcosahedronGeometry(radius, detail) parameter is edge-tessellation,
// not recursive subdivision: `detail` gives (detail+1) divisions per original
// edge, i.e. n = detail+1 subdivisions/edge and 20·n² triangles. To reproduce
// the classic recursive-subdivision ladder (20·4^L triangles, 10·4^L+2
// verts) at level L, we need n = 2^L edge subdivisions, i.e.
// detail = 2^L − 1 → DETAILS = [0, 1, 3, 7, 15] for L = 0..4.
import * as THREE from '../vendor/three.module.js';
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

// level FIRST: tools/test-demos.mjs drives the first range input — level
// changes both the readout counts and the rendered silhouette.
const PARAMS = {
  level: { label: 'level', min: 0, max: 4, step: 1, value: 2, format: (v) => `L${v.toFixed(0)}` },
  dist: { label: 'dist', min: 0, max: 12, step: 0.5, value: 0, format: (v) => v.toFixed(1) },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>One sphere stored at five <em>levels of detail</em> — the same shape as
  20, 80, 320, 1,280, or 5,120 triangles. The readout shows the exact
  vertex/triangle counts for the level on screen.</p>
  <h4>The concept</h4>
  <p>Detail costs triangles, and triangles cost time. Far from the camera,
  a coarse mesh looks identical to a fine one — so real engines keep several
  resolutions of every model and swap by distance. That swap is LOD, and
  making the coarser versions is mesh simplification.</p>
  <h4>Try this</h4>
  <p>At <code>dist</code> 0, step <code>level</code> down to L0 — blocky.
  Now push <code>dist</code> up and step the level down again: can you still
  tell? Drag to orbit; scroll to zoom.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

/**
 * make(container, opts)
 * opts.stage === 'full' builds both SliderRows; otherwise opts.controls
 * (deck embeds expose level,dist) selects them.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { level: PARAMS.level.value, dist: PARAMS.dist.value };

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

  // Five geometries, built once — swapping a prebuilt geometry is instant.
  // detail = 2^L - 1 → n = 2^L edge subdivisions per icosahedron face,
  // reproducing the classic recursive-subdivision counts (see header note).
  const DETAILS = [0, 1, 3, 7, 15];
  const geoms = DETAILS.map((d) => new THREE.IcosahedronGeometry(1, d));
  const material = new THREE.MeshPhongMaterial({ color: 0x6094d2, flatShading: true, shininess: 22 });
  const mesh = new THREE.Mesh(geoms[model.level], material);
  mesh.position.y = 1;
  scene.add(mesh);

  const controlsCard = shell.addCard('controller — level of detail');
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'lod');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `lod-${id}`, ...PARAMS[id] });
  }

  const readoutCard = shell.addCard('readout — the mesh');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'level', label: 'level', format: (v) => `L${v.toFixed(0)}` },
      { id: 'verts', label: 'vertices', format: (v) => v.toLocaleString('en-US') },
      { id: 'tris', label: 'triangles', format: (v) => v.toLocaleString('en-US') },
    ],
  });

  function update() {
    const L = model.level;
    mesh.geometry = geoms[L];
    mesh.position.z = -model.dist;
    table.update('level', L);
    table.update('verts', 10 * 4 ** L + 2);     // icosphere vertex count
    table.update('tris', geoms[L].attributes.position.count / 3); // computed, non-indexed
    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
  }

  const cam = makeOrbitCamera({
    camera: sc.camera,
    render,
    home: { eye: [3, 3, 6], target: [0, 1, 0] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  update();
  return { model, sliders, cam, input: cam };
}
