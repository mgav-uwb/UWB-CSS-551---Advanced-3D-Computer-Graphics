// simplify-compare: three copies of the Stanford bunny, simplified by three
// different algorithms, side by side at (roughly) the SAME triangle budget —
// left = QEM (meshoptimizer's greedy quadric-error edge collapse, baked to 4
// levels: 868/3,472/13,889/69,451), center = PM (Hoppe 1996 Progressive
// Meshes, a single continuous vertex-split stream — the only one of the
// three that can hit an EXACT count anywhere in its range), right = MG2001
// (Gavriliu, Carranza, Breen & Barr, IEEE Visualization 2001, mesh-graph
// variant — adaptive extraction with a bounded-triangle-aspect-ratio
// guarantee, baked to 5 levels: 145/300/704/1,735/3,879).
//
// ONE slider, `tris`, drives all three at once but each algorithm honors it
// differently: PM sets its triangle count EXACTLY (clamped to its
// [500, 69,451] range — its own base mesh floors there); QEM and MG only
// exist at their handful of baked levels, so they SNAP to whichever level's
// triangle count is nearest the slider value. The readout never pretends the
// three match — it shows each algorithm's ACTUAL triangle count, which is
// the whole point: "same budget" is a slider position, not a promise that
// the meshes agree.
//
// Per-algorithm stats (max distance error + min triangle aspect ratio,
// against the original 69,451-triangle scan) come from the offline-computed
// lib/assets/models/simplify-stats.json (tools/build-simplify-stats.mjs).
// QEM's and MG's rows are exact measurements at their baked levels. PM's
// rows are measurements taken at CHECKPOINTS — the QEM+MG triangle counts —
// so PM's readout looks up the checkpoint nearest its ACTUAL count and shows
// it prefixed "≈" (an honest label: it's the nearest measured stand-in, not
// a live computation at the exact slider position).
//
// wire is the mesh-view cross-fade (0 = solid, 1 = wireframe), applied
// identically to all three via one shared solid material + one shared line
// material (their appearance is always identical, so there's nothing to
// gain from separate instances).
//
// Placement: three THREE.Group slots at x = −1.6 / 0 / +1.6, each scaled 0.8
// and lifted 0.5·0.8 = 0.4 in Y so every bunny's unit-height, origin-centered
// bounding box sits on the y=0 grid — the same "lift the GROUP, never the
// geometry" rule mesh-view/lod follow. QEM's geometries are the SAME
// cached/shared instances core/models.js hands every other demo (read-only,
// never scaled/mutated here); MG's geometries are fetched and cached PER
// LEVEL by this demo alone (parseMeshBin + our own fetch, mirroring
// core/models.js's file-model branch since MG's assets aren't in the
// loadModel() registry); PM's geometry is the ONE preallocated buffer
// core/pm.js hands back — its index/drawRange mutate in place every tick,
// so (unlike QEM/MG, which only rebuild their wireframe overlay on a level
// SWAP) the PM wireframe overlay is rebuilt every `tris` tick to track the
// live resolution.
//
// Async: QEM level swaps and MG level fetches each carry their own
// monotonic request-sequence guard (a second slider drag before the first
// swap lands discards the stale one) — same idiom as lod.js/mesh-view.js.
// PM has no such race: setTriangleCount() is synchronous once the one-time
// initial stream fetch resolves.
import * as THREE from '../vendor/three.module.js';
import { loadModel, parseMeshBin } from '../core/models.js';
import { loadPM } from '../core/pm.js';
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const SOLID_COLOR = 0x6094d2; // the shared cockpit-demo mesh blue (mesh-view.js, lod.js)
const WIRE_COLOR = 0xffffff;

const SCALE = 0.8;
const LIFT = 0.5 * SCALE; // half of the scaled unit-height bbox, so the base sits on the grid
const X_QEM = -1.6, X_PM = 0, X_MG = 1.6;

const MG_CREDIT = 'after Gavriliu, Carranza, Breen & Barr, IEEE Visualization 2001 (mesh-graph variant)';

// QEM's 4 baked LOD levels (core/models.js loadModel('bunny', {lod})) and
// MG's 5 baked levels (bunny.mg.l0..l4.mesh.bin) — counts match
// simplify-stats.json exactly, so a level's index doubles as its stats-array
// index (no separate lookup table needed).
const QEM_LEVELS = [
  { lod: 'l0', tris: 868 },
  { lod: 'l1', tris: 3472 },
  { lod: 'l2', tris: 13889 },
  { lod: 'l3', tris: 69451 },
];
const MG_LEVELS = [
  { level: 0, tris: 145 },
  { level: 1, tris: 300 },
  { level: 2, tris: 704 },
  { level: 3, tris: 1735 },
  { level: 4, tris: 3879 },
];

// tris FIRST: tools/test-demos.mjs drives the first range input — a large
// jump always changes QEM's snapped level (and always changes PM's exact
// count, every tick) so both readout cells and rendered pixels change.
const PARAMS = {
  tris: { label: 'tris', min: 145, max: 69451, step: 1, value: 4000, format: (v) => Math.round(v).toLocaleString('en-US') },
  wire: { label: 'wire', min: 0, max: 1, step: 0.01, value: 0.35, format: (v) => `${(v * 100).toFixed(0)}%` },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// nearestLevelIdx(levels, v): the index of whichever level's `tris` is
// closest to v — QEM/MG's snap rule (both directions; no "round down only").
function nearestLevelIdx(levels, v) {
  let bestIdx = 0;
  let bestDiff = Math.abs(levels[0].tris - v);
  for (let i = 1; i < levels.length; i++) {
    const diff = Math.abs(levels[i].tris - v);
    if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
  }
  return bestIdx;
}

// nearestStatsRow(rows, tris): the stats row whose `tris` is closest to a
// given ACTUAL count — used for PM, whose exact count rarely lands on one of
// the handful of rows simplify-stats.json measured.
function nearestStatsRow(rows, tris) {
  let best = rows[0];
  let bestDiff = Math.abs(rows[0].tris - tris);
  for (const row of rows.slice(1)) {
    const diff = Math.abs(row.tris - tris);
    if (diff < bestDiff) { bestDiff = diff; best = row; }
  }
  return best;
}

// --- MG asset loading --------------------------------------------------
// MG's baked levels aren't in core/models.js's loadModel() registry (they're
// this demo's own assets), so fetch + parseMeshBin directly, mirroring
// loadModel()'s file-model branch. Cached per level — never re-fetched once
// loaded, and never mutated once built.
const mgCache = new Map(); // level -> Promise<{geometry, tris}>
async function fetchMgLevel(level) {
  const url = new URL(`../assets/models/bunny.mg.l${level}.mesh.bin`, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`simplify-compare: failed to fetch MG level ${level} (${res.status} ${res.statusText})`);
  const parsed = parseMeshBin(await res.arrayBuffer());
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(parsed.positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(parsed.normals, 3));
  if (parsed.uvs) geometry.setAttribute('uv', new THREE.BufferAttribute(parsed.uvs, 2));
  geometry.setIndex(new THREE.BufferAttribute(parsed.indices, 1));
  return { geometry, tris: parsed.indices.length / 3 };
}
function loadMgLevel(level) {
  if (!mgCache.has(level)) mgCache.set(level, fetchMgLevel(level));
  return mgCache.get(level);
}

// --- simplify-stats.json ------------------------------------------------
// Fetched once (memoized) and shared by every readout refresh below; .then()
// on an already-resolved promise still yields a fresh microtask, which is
// fine at slider-drag frequency.
let statsPromise = null;
function loadStats() {
  if (!statsPromise) {
    const url = new URL('../assets/models/simplify-stats.json', import.meta.url);
    statsPromise = fetch(url).then((res) => {
      if (!res.ok) throw new Error(`simplify-compare: failed to fetch simplify-stats.json (${res.status})`);
      return res.json();
    });
  }
  return statsPromise;
}

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>The same 69,451-triangle Stanford bunny scan, simplified three
  different ways at (roughly) the same triangle budget: left is <strong>QEM</strong>
  (quadric-error greedy edge collapse, 4 baked levels), center is
  <strong>PM</strong> (Progressive Meshes — one continuous vertex-split
  stream), right is <strong>MG2001</strong> (adaptive extraction run
  directly on the mesh graph, 5 baked levels, guaranteeing a bounded
  triangle aspect ratio).</p>
  <h4>The concept</h4>
  <p>The same triangle budget does not buy the same mesh. QEM's cost
  function chases minimum surface deviation; MG2001's chases well-shaped
  triangles even at the cost of exact fidelity. PM is not a fourth
  algorithm but a STREAM: it is the only one of the three that can land on
  an exact triangle count anywhere in its range, so <code>tris</code> sets
  PM exactly while QEM and MG each snap to whichever of their handful of
  baked levels is nearest — the readout shows every algorithm's ACTUAL
  count, never a shared fiction.</p>
  <p>Readout columns: <code>tris</code> is the triangles actually on
  screen; <code>maxErr</code> is the worst one-directional distance from
  the original scan's vertices to the simplified surface; <code>minAspect</code>
  is the worst (most sliver-like) triangle's shortest÷longest edge ratio (1
  = equilateral, near 0 = a sliver). PM's <code>maxErr</code>/<code>minAspect</code>
  are prefixed "≈" — they're the nearest CHECKPOINT simplify-stats.json
  separately measured, not a live computation at PM's exact count.</p>
  <h4>Try this</h4>
  <p>Drag <code>tris</code> down to its floor: QEM snaps to 868, MG snaps to
  145, and PM's own base mesh floors at 500 — three different honest
  answers to "give me the fewest triangles you can." Compare
  <code>minAspect</code> at any triangle count: MG's worst triangle stays
  far rounder than QEM's even when MG has far fewer triangles to work with
  — that bounded-aspect-ratio guarantee is the paper's whole claim. Drag
  <code>wire</code> to 1 to see all three triangulations at once. Drag to
  orbit; scroll to zoom.</p>
  <p>Model: Stanford Computer Graphics Laboratory. MG2001: ${MG_CREDIT}.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

/**
 * make(container, opts)
 * opts.stage === 'full' builds both SliderRows; otherwise opts.controls
 * (deck embeds expose tris,wire) selects them. No ButtonRow — there's no
 * selector, all three algorithms are always on screen.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { tris: PARAMS.tris.value, wire: PARAMS.wire.value };

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

  // ONE solid material + ONE line material, shared by all three bunnies —
  // their appearance (color, wire blend) is always identical, so there is
  // nothing a per-slot instance would buy.
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

  // makeSlot(x): a Group at world x (lifted onto the grid, scaled 0.8)
  // carrying an (initially empty) solid mesh + wireframe overlay pair, the
  // same "group carries mesh + overlay together" idiom as mesh-view.js.
  function makeSlot(x) {
    const group = new THREE.Group();
    group.position.set(x, LIFT, 0);
    group.scale.setScalar(SCALE);
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), solidMaterial);
    const wireMesh = new THREE.LineSegments(new THREE.BufferGeometry(), lineMaterial);
    group.add(mesh);
    group.add(wireMesh);
    scene.add(group);
    return { mesh, wireMesh };
  }

  const qemSlot = makeSlot(X_QEM);
  const pmSlot = makeSlot(X_PM);
  const mgSlot = makeSlot(X_MG);

  // setSlotGeometry(slot, geometry): swap a slot's solid geometry + rebuild
  // its wireframe overlay (a fresh derived copy, ours to dispose — never the
  // source geometry, which may be a shared/cached instance).
  function setSlotGeometry(slot, geometry) {
    const oldWire = slot.wireMesh.geometry;
    slot.mesh.geometry = geometry;
    slot.wireMesh.geometry = new THREE.WireframeGeometry(geometry);
    oldWire.dispose();
  }

  const controlsCard = shell.addCard('controller — triangle budget');
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'simplify-compare');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `simplify-compare-${id}`, ...PARAMS[id] });
  }

  const readoutCard = shell.addCard('readout — three simplifications');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'qemTris', label: 'qem tris', format: (v) => v.toLocaleString('en-US') },
      { id: 'pmTris', label: 'pm tris', format: (v) => v.toLocaleString('en-US') },
      { id: 'mgTris', label: 'mg tris', format: (v) => v.toLocaleString('en-US') },
      { id: 'qemErr', label: 'qem maxErr', format: (v) => v.toFixed(4) },
      { id: 'pmErr', label: 'pm maxErr', format: (v) => `≈${v.toFixed(4)}` },
      { id: 'mgErr', label: 'mg maxErr', format: (v) => v.toFixed(4) },
      { id: 'qemAspect', label: 'qem minAspect', format: (v) => v.toFixed(4) },
      { id: 'pmAspect', label: 'pm minAspect', format: (v) => `≈${v.toFixed(4)}` },
      { id: 'mgAspect', label: 'mg minAspect', format: (v) => v.toFixed(4) },
    ],
  });

  // Credit captions: Stanford's line (from loadModel's own `credit` field,
  // never hand-duplicated) + the MG2001 attribution — both constant, since
  // all three algorithms simplify the same source scan.
  const creditEl = document.createElement('p');
  creditEl.className = 'demo-hint';
  creditEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  readoutCard.appendChild(creditEl);

  const mgCreditEl = document.createElement('p');
  mgCreditEl.className = 'demo-hint';
  mgCreditEl.style.cssText = 'margin:2px 0 0;color:#8b93a7;font-size:12px;';
  mgCreditEl.textContent = MG_CREDIT;
  readoutCard.appendChild(mgCreditEl);

  // updateWireBlend(): the ONE place `wire` -> both shared materials'
  // opacity. Geometry never changes here, so it's safe mid-async-swap.
  function updateWireBlend() {
    solidMaterial.opacity = 1 - 0.7 * model.wire;
    lineMaterial.opacity = model.wire;
  }

  // --- QEM channel: swap on level change only, guarded by its own request
  // sequence (a second slider drag before a level fetch lands discards the
  // stale resolution — same idiom as lod.js/mesh-view.js).
  let currentQemLevel = -1;
  let qemSeq = 0;
  function refreshQemStats(levelIdx) {
    loadStats().then((stats) => {
      const row = stats.algorithms.qem[levelIdx];
      table.update('qemErr', row.maxErr);
      table.update('qemAspect', row.minAspect);
      render();
    });
  }
  function loadQemLevel(levelIdx) {
    currentQemLevel = levelIdx;
    const seq = ++qemSeq;
    const { lod } = QEM_LEVELS[levelIdx];
    loadModel('bunny', { lod })
      .then(({ geometry, tris, credit }) => {
        if (seq !== qemSeq) return; // superseded by a later change
        setSlotGeometry(qemSlot, geometry);
        table.update('qemTris', tris);
        if (credit) creditEl.textContent = credit;
        refreshQemStats(levelIdx);
        render();
      })
      .catch((err) => {
        if (seq !== qemSeq) return;
        console.error(`simplify-compare: failed to load QEM level "${lod}"`, err);
      });
  }

  // --- MG channel: same shape as QEM, over our own per-level cache.
  let currentMgLevel = -1;
  let mgSeq = 0;
  function refreshMgStats(levelIdx) {
    loadStats().then((stats) => {
      const row = stats.algorithms.mg2001[levelIdx];
      table.update('mgErr', row.maxErr);
      table.update('mgAspect', row.minAspect);
      render();
    });
  }
  function loadMgLevelInto(levelIdx) {
    currentMgLevel = levelIdx;
    const seq = ++mgSeq;
    const { level } = MG_LEVELS[levelIdx];
    loadMgLevel(level)
      .then(({ geometry, tris }) => {
        if (seq !== mgSeq) return; // superseded by a later change
        setSlotGeometry(mgSlot, geometry);
        table.update('mgTris', tris);
        refreshMgStats(levelIdx);
        render();
      })
      .catch((err) => {
        if (seq !== mgSeq) return;
        console.error(`simplify-compare: failed to load MG level ${level}`, err);
      });
  }

  // --- PM channel: one-time stream fetch, then synchronous setTriangleCount
  // every tick. Unlike QEM/MG, the mesh's geometry object never changes
  // (only its index/drawRange mutate), so the wireframe overlay — a
  // snapshot, not a live view — is rebuilt every tick, not just on a "swap".
  let pmRuntime = null;
  function refreshPmStats(actualTris) {
    loadStats().then((stats) => {
      const row = nearestStatsRow(stats.algorithms.pm, actualTris);
      table.update('pmErr', row.maxErr);
      table.update('pmAspect', row.minAspect);
      render();
    });
  }
  function syncPmSlot() {
    const oldWire = pmSlot.wireMesh.geometry;
    pmSlot.mesh.geometry = pmRuntime.geometry;
    pmSlot.wireMesh.geometry = new THREE.WireframeGeometry(pmRuntime.geometry);
    oldWire.dispose();
  }
  function initPm() {
    loadPM(new URL('../assets/models/bunny.pm.bin', import.meta.url))
      .then((pm) => {
        pmRuntime = pm;
        const actual = pm.setTriangleCount(Math.round(model.tris));
        syncPmSlot();
        table.update('pmTris', actual);
        refreshPmStats(actual);
        render();
      })
      .catch((err) => console.error('simplify-compare: failed to load PM stream', err));
  }

  // updateTris(): the ONE place `tris` drives all three channels — QEM/MG
  // only kick off a fetch when their SNAPPED level actually changes; PM
  // updates synchronously every tick.
  function updateTris() {
    const v = model.tris;
    const qIdx = nearestLevelIdx(QEM_LEVELS, v);
    if (qIdx !== currentQemLevel) loadQemLevel(qIdx);
    const mIdx = nearestLevelIdx(MG_LEVELS, v);
    if (mIdx !== currentMgLevel) loadMgLevelInto(mIdx);
    if (pmRuntime) {
      const actual = pmRuntime.setTriangleCount(Math.round(v));
      syncPmSlot();
      table.update('pmTris', actual);
      refreshPmStats(actual);
    }
    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      if (id === 'tris') updateTris();
      if (id === 'wire') updateWireBlend();
      render();
    });
  }

  const cam = makeOrbitCamera({
    camera: sc.camera,
    render,
    home: { eye: [0, 2.2, 8.5], target: [0, 0.4, 0] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  updateWireBlend();
  loadQemLevel(nearestLevelIdx(QEM_LEVELS, model.tris));
  loadMgLevelInto(nearestLevelIdx(MG_LEVELS, model.tris));
  initPm();
  render();

  return { model, sliders, cam, input: cam };
}
