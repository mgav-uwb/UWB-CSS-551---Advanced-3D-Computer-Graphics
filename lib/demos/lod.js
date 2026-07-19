// lod: level of detail — ONE model at several mesh resolutions, picked with
// a ButtonRow (ico · teapot · bunny · dragon). `level` swaps the geometry,
// `dist` slides the object away from home. The lesson is multi-resolution
// modeling: far away, the coarsest version is indistinguishable from the
// finest one — so engines swap meshes by distance (LOD) and pay only for
// detail the eye can see. Flat shading on purpose: facets ARE the story.
//
// Three ladders, three different honesty levels:
//   - ico: the classic recursive-icosphere ladder, 5 levels (L0..L4), exact
//     closed-form counts (verts 10*4^L+2, tris 20*4^L) — unchanged from the
//     original single-model version of this demo, byte-compatible default.
//   - teapot: TeapotGeometry (vendored, ../vendor/TeapotGeometry.js) at
//     segment counts [2,4,8,16,32], 5 levels, counts read from the built
//     buffers (parametric, not closed-form-obvious like the ico formula).
//   - bunny/dragon: the 4 pre-baked Stanford LOD files (l0..l3) via
//     core/models.js's loadModel() — only 4 levels exist on disk, so the
//     level slider's max drops to 3 while a file model is selected (a
//     5-level ladder over 4 files would be dishonest). Async + cached; the
//     previous geometry stays on screen while a level loads.
//
// ico/teapot geometries are built here and belong to this demo outright
// (safe to normalize/keep forever); loadModel()'s file geometries are
// CACHED, SHARED instances (core/models.js) — never mutated, only assigned.
// All placement (the "sits on the grid" lift, the dist push-back) happens
// on the mesh's transform, never the geometry.
import * as THREE from '../vendor/three.module.js';
import { TeapotGeometry } from '../vendor/TeapotGeometry.js';
import { loadModel, normalizeGeometry, MODEL_INFO } from '../core/models.js';
import { SliderRow, ButtonRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const MODEL_OPTIONS = [
  { value: 'ico', label: 'ico' },
  { value: 'teapot', label: 'teapot' },
  { value: 'bunny', label: 'bunny' },
  { value: 'dragon', label: 'dragon' },
];

// bunny/dragon only have 4 baked LOD files on disk (l0..l3) — everything
// else (ico, teapot) is a genuine 5-level ladder.
const FILE_MODELS = new Set(['bunny', 'dragon']);
const maxLevelFor = (name) => (FILE_MODELS.has(name) ? 3 : 4);

// level FIRST: tools/test-demos.mjs drives the first range input — level
// changes both the readout counts and the rendered silhouette. max here is
// the ico/teapot default (5 levels); the file-model max (3) is applied by
// rebuilding the slider row in place (see buildLevelSlider below).
const PARAMS = {
  level: { label: 'level', min: 0, max: 4, step: 1, value: 2, format: (v) => `L${v.toFixed(0)}` },
  dist: { label: 'dist', min: 0, max: 12, step: 0.5, value: 0, format: (v) => v.toFixed(1) },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>One model stored at several <em>levels of detail</em> — pick ico,
  teapot, or a real Stanford scan (bunny/dragon) with the buttons above, then
  step <code>level</code> to swap resolutions. The readout shows the model,
  the level, and the exact vertex/triangle counts read straight from the
  active mesh's own buffers.</p>
  <h4>The concept</h4>
  <p>Detail costs triangles, and triangles cost time. Far from the camera, a
  coarse mesh looks identical to a fine one — so real engines keep several
  resolutions of every model and swap by distance. That swap is LOD, and
  making the coarser versions is mesh simplification. Ico and teapot are
  generated procedurally, so they get a full 5-level ladder (L0..L4); the
  scanned bunny and dragon only have four pre-simplified levels baked to
  disk (L0..L3) — an honest ladder stops where the real data does. The baked
  levels come from greedy edge collapse under a quadric error metric
  (meshoptimizer); Hoppe's Progressive Meshes (1996) extends the same
  collapse idea to a continuous LOD stream — original code at
  github.com/hhoppe/Mesh-processing-library.</p>
  <h4>Try this</h4>
  <p>Pick <code>bunny</code>, then step <code>level</code> from L0 to L3:
  868 triangles versus 69,451, same rabbit. At <code>dist</code> 0, step
  <code>level</code> down — blocky. Now push <code>dist</code> up and step
  down again: can you still tell? Drag to orbit; scroll to zoom.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

/**
 * make(container, opts)
 * opts.stage === 'full' builds both SliderRows; otherwise opts.controls
 * (deck embeds expose level,dist) selects them.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { name: 'ico', level: PARAMS.level.value, dist: PARAMS.dist.value };

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

  // --- ico ladder (unchanged): detail = 2^L - 1 -> n = 2^L edge subdivisions
  // per icosahedron face, reproducing the classic recursive-subdivision
  // counts 20*4^L tris / 10*4^L+2 verts. Radius 1, NOT run through
  // normalizeGeometry — its bbox min.y is -1, so the mesh is lifted by 1.
  const ICO_DETAILS = [0, 1, 3, 7, 15];
  const icoGeoms = ICO_DETAILS.map((d) => new THREE.IcosahedronGeometry(1, d));

  // --- teapot ladder: TeapotGeometry is ours to build/normalize (not a
  // shared core/models.js instance) — built lazily per level and cached
  // here so switching TO teapot doesn't front-load 5 geometries (up to
  // ~65k triangles at segments=32) on every page load whose default is ico.
  const TEAPOT_SEGMENTS = [2, 4, 8, 16, 32];
  const teapotCache = new Map(); // level -> { geometry, verts, tris }
  function teapotLevel(level) {
    if (!teapotCache.has(level)) {
      const geometry = normalizeGeometry(new TeapotGeometry(0.35, TEAPOT_SEGMENTS[level]));
      const verts = geometry.attributes.position.count;
      const tris = geometry.index.count / 3;
      teapotCache.set(level, { geometry, verts, tris });
    }
    return teapotCache.get(level);
  }

  // --- file ladder (bunny/dragon): l0..l3 via loadModel(), which caches by
  // (name, lod) itself — no extra caching needed here.
  const FILE_LODS = ['l0', 'l1', 'l2', 'l3'];

  // resolveLevel(name, level): the ONE place that turns (model, level) into
  // {geometry, verts, tris, credit}, ico/teapot resolving synchronously
  // (wrapped in a resolved Promise) and bunny/dragon resolving via the
  // async, cached loadModel() fetch.
  function resolveLevel(name, level) {
    if (name === 'ico') {
      const geometry = icoGeoms[level];
      return Promise.resolve({
        geometry,
        verts: 10 * 4 ** level + 2, // exact icosphere vertex count
        tris: geometry.attributes.position.count / 3, // computed, non-indexed
        credit: null,
      });
    }
    if (name === 'teapot') {
      const { geometry, verts, tris } = teapotLevel(level);
      return Promise.resolve({ geometry, verts, tris, credit: MODEL_INFO.teapot.credit });
    }
    return loadModel(name, { lod: FILE_LODS[level] });
  }

  const material = new THREE.MeshPhongMaterial({ color: 0x6094d2, flatShading: true, shininess: 22 });
  const mesh = new THREE.Mesh(icoGeoms[model.level], material);
  mesh.position.y = 1;
  scene.add(mesh);

  const modelCard = shell.addCard('model');
  const selector = new ButtonRow(modelCard, {
    id: 'lod-model',
    label: 'model',
    options: MODEL_OPTIONS,
    value: model.name,
  });

  const controlsCard = shell.addCard('controller — level of detail');
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'lod');
  const sliders = {};

  // 'level' must remain the FIRST control in the card, but its range depends
  // on the selected model (ico/teapot: max 4; bunny/dragon: max 3) and
  // SliderRow has no way to change `max` after construction — a dedicated
  // placeholder div holds exactly that row so rebuilding it in place (on
  // every model swap) never reorders it relative to `dist`.
  const levelSlot = document.createElement('div');
  controlsCard.appendChild(levelSlot);

  function buildLevelSlider(max) {
    levelSlot.replaceChildren();
    const slider = new SliderRow(levelSlot, { id: 'lod-level', ...PARAMS.level, max, value: model.level });
    slider.onInput((v) => {
      model.level = v;
      refresh();
    });
    sliders.level = slider;
  }

  if (ids.includes('level')) buildLevelSlider(maxLevelFor(model.name));

  for (const id of ids) {
    if (id === 'level') continue;
    sliders[id] = new SliderRow(controlsCard, { id: `lod-${id}`, ...PARAMS[id] });
    sliders[id].onInput((v) => {
      model[id] = v;
      if (id === 'dist') applyDist();
    });
  }

  const readoutCard = shell.addCard('readout — the mesh');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'model', label: 'model', format: (v) => v },
      { id: 'level', label: 'level', format: (v) => `L${v.toFixed(0)}` },
      { id: 'verts', label: 'vertices', format: (v) => v.toLocaleString('en-US') },
      { id: 'tris', label: 'triangles', format: (v) => v.toLocaleString('en-US') },
    ],
  });

  // Credit caption: a small dim line under the readout, populated from the
  // resolved level's `credit` (bunny/dragon: Stanford; teapot: Newell/public
  // domain; ico: null -> the line stays empty) — same mechanism as
  // mesh-view.js's creditEl.
  const creditEl = document.createElement('p');
  creditEl.className = 'demo-hint';
  creditEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  readoutCard.appendChild(creditEl);

  // applyDist(): `dist` never touches geometry, so it's a cheap, synchronous,
  // always-safe-to-call transform update (including mid-async level swap).
  function applyDist() {
    mesh.position.z = -model.dist;
    render();
  }

  // refresh(): resolves the (model, level) pair and, once it lands, swaps
  // the mesh's geometry + refreshes the readout/credit — the CURRENT mesh
  // stays exactly as-is on screen until then (no flash-to-empty on a slow
  // bunny/dragon fetch). requestSeq discards a stale resolution if the user
  // changes level/model again before an in-flight one resolves.
  let requestSeq = 0;
  function refresh() {
    const seq = ++requestSeq;
    const name = model.name;
    const level = model.level;
    resolveLevel(name, level)
      .then((data) => {
        if (seq !== requestSeq) return; // superseded by a later change
        mesh.geometry = data.geometry; // shared/cached (file models) or ours (ico/teapot) — never mutated
        // Every model normalizes to unit height centered at the origin
        // (bbox.min.y === -0.5) EXCEPT ico, whose radius-1 sphere isn't run
        // through normalizeGeometry (bbox.min.y === -1) — lift accordingly
        // so every model's base sits on the y=0 grid.
        mesh.position.y = name === 'ico' ? 1 : 0.5;
        mesh.position.z = -model.dist;
        table.update('model', name);
        table.update('level', level);
        table.update('verts', data.verts);
        table.update('tris', data.tris);
        creditEl.textContent = data.credit ?? '';
        render();
      })
      .catch((err) => {
        if (seq !== requestSeq) return;
        console.error(`lod: failed to load model "${name}" level ${level}`, err);
      });
  }

  selector.onChange((name) => {
    model.name = name;
    const max = maxLevelFor(name);
    model.level = clamp(model.level, 0, max);
    if (sliders.level) buildLevelSlider(max);
    refresh();
  });

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

  refresh();
  return { model, sliders, cam, input: cam };
}
