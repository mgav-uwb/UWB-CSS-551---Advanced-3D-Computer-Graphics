// our-scene: the S01 deck's running example — a modified Cornell box (red
// left / green right / white back-floor-ceiling, interior 3x3x3, y in [0,3])
// holding the ORIGINAL Cornell contents: a tall box (rear-left) topped by a
// real Stanford bunny and a short box (front-right) topped by the Newell
// teapot. No sphere. TWO lights: the ceiling light (a PointLight + a
// matching emissive quad) slides in x via `lightX`, and a camera "headlamp"
// PointLight rides at the eye point (synced inside the wrapped render()),
// so every view direction gets a specular response — metals never go black.
// `stage` walks the SAME scene through five rendering qualities — wireframe,
// flat, smooth, textured, "anti-aliased" — flipping material flags/maps/
// renderer settings in place; it NEVER rebuilds the scene graph.
//
// The teapot and bunny are METALS with per-model controls: metal preset
// (gold / bronze / aluminum), BRDF (Phong vs GGX — a MeshPhongMaterial /
// MeshStandardMaterial pair swapped in place, brdf-lobe.js's idiom, one
// roughness slider driving both via the same Blinn shininess mapping), and
// a height-map selection (none / brick / hammered / brushed) applied as a
// bumpMap or as a displacementMap. Bump fakes the grooves in lighting only;
// displacement actually moves vertices — the silhouette deforms. The room
// walls and both boxes keep their original materials (including the stage-3+
// floor checker and tall-box brick color texture).
//
// stage is FIRST: tools/test-demos.mjs drives the first range input — stage
// changes both the readout's stage-name cell and the rendered pixels (every
// stage flips at least one material/renderer setting), the platform's
// first-slider contract, without touching lightX.
//
// Every object here is OURS (BoxGeometry/PlaneGeometry built in this file)
// except the bunny and teapot, loaded via core/models.js's loadModel() —
// CACHED, SHARED geometry instances, never mutated. All placement (sitting
// on the box tops, the 0.85/0.8 scales) happens on each mesh's transform,
// never the geometry. Both fetch/build async, so they pop in after the rest
// of the scene (boxes+walls) is already on screen — no flash-to-empty, no
// blocking the first paint.
import * as THREE from '../vendor/three.module.js';
import { loadModel } from '../core/models.js';
import { SliderRow, ButtonRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const STAGE_NAMES = ['wireframe', 'flat', 'smooth', 'textured', 'anti-aliased'];

// stage FIRST: tools/test-demos.mjs drives the first range input. The two
// roughness params come AFTER lightX so deck embeds exposing `stage,lightX`
// resolve exactly as before.
const PARAMS = {
  stage: { label: 'stage', min: 0, max: 4, step: 1, value: 2, format: (v) => STAGE_NAMES[v] },
  lightX: { label: 'lightX', min: -0.8, max: 0.8, step: 0.05, value: 0, format: (v) => v.toFixed(2) },
  teapotRough: { label: 'roughness', min: 0.05, max: 1, step: 0.01, value: 0.35, format: (v) => v.toFixed(2) },
  bunnyRough: { label: 'roughness', min: 0.05, max: 1, step: 0.01, value: 0.35, format: (v) => v.toFixed(2) },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// --- room geometry: interior 3x3x3, centered on the x/z origin, y in [0,3].
// Every wall is a single PlaneGeometry (2 triangles), FrontSide only (no
// DoubleSide) and rotated so its face normal points INTO the room — no
// wall is visible from outside, exactly like a real closed box.
const ROOM = 3;
const HALF = ROOM / 2;

// --- box + model placement (all fixed, hand-picked so nothing overlaps):
// tall box rear-left (bunny rides its top), short box front-right (teapot
// rides its top). "front" is +Z (toward the open mouth/camera), "rear" is
// -Z, "left" is -X, "right" is +X. Both models are unit-height normalized
// and centered by loadModel(), so top-of-box y = box height + scale/2.
const TALL_BOX = { w: 0.9, h: 1.8, d: 0.9, x: -0.55, z: -0.6, rotY: 18 * (Math.PI / 180) };
const SHORT_BOX = { w: 0.9, h: 0.9, d: 0.9, x: 0.55, z: 0.5, rotY: -15 * (Math.PI / 180) };
const BUNNY_SCALE = 0.85;
const TEAPOT_SCALE = 0.8;
const BUNNY_TOP_Y = TALL_BOX.h + BUNNY_SCALE * 0.5;
const TEAPOT_TOP_Y = SHORT_BOX.h + TEAPOT_SCALE * 0.5;

// --- ceiling light: an emissive quad + a PointLight just below it, both
// sliding in x together. lightX's range is [-0.8, 0.8]; the *1.5 spread
// keeps it well clear of the side walls (x = +/-1.5) at both extremes.
const LIGHT_QUAD_SIZE = 0.9;
const LIGHT_QUAD_Y = ROOM - 0.02; // 2.98
const LIGHT_Y = ROOM - 0.1; // just below the quad
const LIGHT_X_SPAN = 1.5;

// --- metal presets + BRDF machinery for the teapot/bunny. Each model owns
// a Phong/Standard material PAIR built once and swapped in place (three
// can't change material TYPE in place — brdf-lobe.js's idiom). One
// roughness value drives both: GGX takes it directly, Phong maps it
// through the classic Blinn shininess mapping below.
const METALS = {
  gold: { color: 0xc9a24b, specular: 0xffe9b0 },
  bronze: { color: 0x9a6b3f, specular: 0xd9a06a },
  alum: { color: 0xc8ccd2, specular: 0xffffff },
};
const METAL_OPTIONS = [
  { value: 'gold', label: 'gold' },
  { value: 'bronze', label: 'bronze' },
  { value: 'alum', label: 'alum' },
];
const BRDF_OPTIONS = [
  { value: 'phong', label: 'Phong' },
  { value: 'ggx', label: 'GGX' },
];
const MAP_OPTIONS = [
  { value: 'none', label: 'none' },
  { value: 'brick', label: 'brick' },
  { value: 'hammer', label: 'hammer' },
  { value: 'brush', label: 'brush' },
];
const MODE_OPTIONS = [
  { value: 'bump', label: 'bump' },
  { value: 'displace', label: 'displace' },
];

// The Phong specular exponent for a roughness — copied VERBATIM from
// lib/demos/brdf-lobe.js (the classic Blinn mapping, clamped so
// MeshPhongMaterial.shininess stays finite/sane at the extremes).
function phongShininess(roughness) { return clamp(2 / (roughness * roughness) - 2, 1, 2000); }

function makeMetalPair(metalKey, roughness) {
  const m = METALS[metalKey];
  return {
    phong: new THREE.MeshPhongMaterial({ color: m.color, specular: m.specular, shininess: phongShininess(roughness) }),
    ggx: new THREE.MeshStandardMaterial({ color: m.color, metalness: 1, roughness }),
  };
}

// Fixed bump/displacement strengths (the map SELECTION is the control; the
// scales are tuned once for the unit-height models).
const BUMP_SCALE = 1.4;
const DISP_SCALE = 0.05;

// --- floor checker + tall-box brick textures (stage 3+). The checker is
// this demo's own (a plain n x n DataTexture, same idiom as
// uv-placement.js's buildCheckerTexture). TEX_N must be a power of two for
// mipmap generation at stage 4.
const CHECKER_N = 16;
const LIGHT_SQUARE = [214, 214, 214, 255];
const DARK_SQUARE = [92, 96, 108, 255];

function buildFloorChecker() {
  const data = new Uint8Array(CHECKER_N * CHECKER_N * 4);
  for (let y = 0; y < CHECKER_N; y++) {
    for (let x = 0; x < CHECKER_N; x++) {
      const i = (y * CHECKER_N + x) * 4;
      const [r, g, b, a] = (x + y) % 2 === 0 ? LIGHT_SQUARE : DARK_SQUARE;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
    }
  }
  const t = new THREE.DataTexture(data, CHECKER_N, CHECKER_N, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 4);
  t.needsUpdate = true;
  return t;
}

// --- brick generator: copied VERBATIM from lib/demos/bump-map.js
// (brickAt/buildTextures, same TEX_N/BRICK_W/BRICK_H/MORTAR constants) so
// the tall box's stage-3 texture is the exact same procedural brick, not a
// reimplementation. colorTex textures the tall box (stage 3+); heightTex is
// KEPT as the teapot/bunny's `brick` bump/displacement option (it keeps its
// as-built Nearest filters + repeat(2,2) — the same look bump-map.js ships).
const TEX_N = 128;
const BRICK_W = 32;
const BRICK_H = 16;
const MORTAR = 3;

function brickAt(x, y) {
  const row = Math.floor(y / BRICK_H);
  const xo = (x + (row % 2 === 1 ? BRICK_W / 2 : 0)) % TEX_N;
  const inMortarY = y % BRICK_H < MORTAR;
  const inMortarX = xo % BRICK_W < MORTAR;
  if (inMortarX || inMortarY) {
    return { color: [186, 182, 172], height: 40 };
  }
  const col = Math.floor(xo / BRICK_W);
  const tint = (row * 7 + col * 13) % 3;                 // deterministic variation
  const body = [[178, 86, 60], [166, 78, 56], [188, 96, 66]][tint];
  return { color: body, height: 220 };
}

function buildTextures() {
  const color = new Uint8Array(TEX_N * TEX_N * 4);
  const height = new Uint8Array(TEX_N * TEX_N * 4);
  for (let y = 0; y < TEX_N; y++) {
    for (let x = 0; x < TEX_N; x++) {
      const i = (y * TEX_N + x) * 4;
      const { color: c, height: h } = brickAt(x, y);
      color[i] = c[0]; color[i + 1] = c[1]; color[i + 2] = c[2]; color[i + 3] = 255;
      height[i] = h; height[i + 1] = h; height[i + 2] = h; height[i + 3] = 255;
    }
  }
  const mk = (data) => {
    const t = new THREE.DataTexture(data, TEX_N, TEX_N, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 2);
    t.needsUpdate = true;
    return t;
  };
  return { colorTex: mk(color), heightTex: mk(height) };
}

// --- metal-appropriate height maps (new, demo-owned, deterministic — no
// Math.random, so every load renders identically). Both are 128x128
// grayscale DataTextures with Linear filtering + mipmaps from creation;
// they stay OUT of the stage-4 filter flip (which touches only the floor
// checker + brick colorTex, exactly as before).
const HM_N = 128;

// deterministic pseudo-random in [0,1) — the classic sin-hash.
function hash2(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function makeHeightTexture(data, repeat) {
  const t = new THREE.DataTexture(data, HM_N, HM_N, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

// hammered: ~40 dimple craters at hash-placed centers with a smooth radial
// falloff, distances wrapped toroidally so RepeatWrapping tiles seamlessly.
function buildHammeredHeight() {
  const data = new Uint8Array(HM_N * HM_N * 4);
  const craters = [];
  for (let i = 0; i < 40; i++) {
    craters.push({ cx: hash2(i, 1) * HM_N, cy: hash2(i, 7) * HM_N, r: 8 + hash2(i, 13) * 10 });
  }
  for (let y = 0; y < HM_N; y++) {
    for (let x = 0; x < HM_N; x++) {
      let h = 235;
      for (const { cx, cy, r } of craters) {
        let dx = Math.abs(x - cx); dx = Math.min(dx, HM_N - dx);
        let dy = Math.abs(y - cy); dy = Math.min(dy, HM_N - dy);
        const d = Math.hypot(dx, dy);
        if (d < r) { const t = d / r; h -= (1 - t * t) * 140 * (1 - t); }
      }
      h = Math.max(0, Math.min(255, h));
      const i = (y * HM_N + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = h; data[i + 3] = 255;
    }
  }
  return makeHeightTexture(data, 3);
}

// brushed: fine near-horizontal grooves — a high-frequency sine in v with
// deterministic per-row phase jitter and a slight u-drift so the bands read
// as brushed metal, not a ruler-perfect grating.
function buildBrushedHeight() {
  const data = new Uint8Array(HM_N * HM_N * 4);
  for (let y = 0; y < HM_N; y++) {
    const jitter = hash2(y, 3) * 2 * Math.PI;
    const drift = 0.05 * hash2(y, 9);
    for (let x = 0; x < HM_N; x++) {
      const h = 128 + 90 * Math.sin(y * (Math.PI * 2 / 4) + jitter + x * drift);
      const v = Math.max(0, Math.min(255, h));
      const i = (y * HM_N + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v; data[i + 3] = 255;
    }
  }
  return makeHeightTexture(data, 4);
}

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A modified Cornell box with its original contents: red left wall, green
  right wall, white back/floor/ceiling, a tall box rear-left topped by a
  real Stanford-scanned bunny and a short box front-right topped by the
  Newell teapot. Two lights: a ceiling light that slides in x, and a
  "headlamp" point light riding at the camera.</p>
  <h4>The concept</h4>
  <p><code>stage</code> walks the SAME scene through five rendering
  qualities without ever rebuilding it: pure wireframe, flat-shaded facets,
  smooth-shaded surfaces, added textures (a floor checker + brick tall box),
  and a final pass with 2x device-pixel-ratio rendering and filtered/
  mipmapped textures. The teapot and bunny are METALS with their own
  controls: pick a metal, pick the BRDF (classic Phong vs GGX
  microfacet — one roughness slider drives both), and pick a height map
  (brick, hammered, brushed) applied as a <em>bump map</em> (a lighting
  lie — the silhouette stays smooth) or as a <em>displacement map</em>
  (vertices actually move — the silhouette deforms).</p>
  <h4>Try this</h4>
  <p>Put the hammered map on the teapot as <code>bump</code>, orbit to a
  grazing angle, and check the rim: perfectly smooth. Switch to
  <code>displace</code> — now the rim dents. Flip the bunny between
  <code>Phong</code> and <code>GGX</code> at low roughness and compare the
  highlight shape. Drag <code>lightX</code> and watch both metals track the
  ceiling light.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

/**
 * make(container, opts)
 * opts.stage === 'full' builds all controls (sliders + the per-model
 * material cards); otherwise opts.controls (deck embeds expose stage,lightX)
 * selects sliders only.
 */
export function make(container, { stage: pageStage = 'embed', controls } = {}) {
  const model = {
    stage: PARAMS.stage.value,
    lightX: PARAMS.lightX.value,
    teapotRough: PARAMS.teapotRough.value,
    bunnyRough: PARAMS.bunnyRough.value,
  };

  const nav = { orbitSpeed: 0.4, zoomSpeed: 0.12, moveSpeed: 3, rollRate: 60 };
  const disp = { grid: false, axes: false }; // the box's own floor/walls are the ground plane — the world grid would z-fight the floor
  let grid, axes, render, renderer;

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
    stage: pageStage,
    help: { html: HELP_HTML },
    settings: settingsFields,
    legend: 'drag orbit · scroll zoom · WASD move · Q/E roll · Space/Ctrl up·down',
    nav: 'orbit',
  });

  const sc = makeScene(shell.sceneEl, { fill: true });
  const { scene } = sc;
  ({ grid, axes, render, renderer } = sc);
  grid.visible = disp.grid;
  axes.visible = disp.axes;

  // TWO point lights own the shading (the scene-shell's default hemi+dir
  // lights would wash out lightX's swing): the sliding ceiling light and a
  // camera headlamp. Ambient drops to 0.25 accordingly.
  for (const child of [...scene.children]) {
    if (child.isLight) scene.remove(child);
  }
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const pointLight = new THREE.PointLight(0xffffff, 2.2, 0, 0);
  scene.add(pointLight);
  const headlamp = new THREE.PointLight(0xffffff, 1.0, 0, 0);
  scene.add(headlamp);

  // Wrap render so the headlamp tracks the camera: makeOrbitCamera calls
  // (this) render after EVERY camera move, and nothing else moves the
  // camera, so syncing here is complete. applyStage/updateLight also call
  // it — a no-op sync then, since the camera didn't move.
  const baseRender = render;
  render = () => {
    headlamp.position.copy(sc.camera.position);
    baseRender();
  };

  // wireMaterial is shared by every stage-0 overlay (LineSegments); the
  // WireframeGeometry each carries is a fresh derived copy per mesh, ours to
  // dispose/rebuild (never the source geometry).
  const wireMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

  // OBJECTS: every {mesh, wireMesh} pair the stage machinery walks — stage 0
  // hides every `mesh` and shows every `wireMesh`; every other stage is the
  // reverse. addObject() builds/attaches the wireframe overlay for a mesh
  // whose geometry is already final; the bunny/teapot (async) rebuild their
  // own overlays once the real geometry lands (see loadSceneModel below).
  const OBJECTS = [];
  function addObject(mesh) {
    scene.add(mesh);
    const wireMesh = new THREE.LineSegments(new THREE.WireframeGeometry(mesh.geometry), wireMaterial);
    wireMesh.position.copy(mesh.position);
    wireMesh.rotation.copy(mesh.rotation);
    wireMesh.scale.copy(mesh.scale);
    scene.add(wireMesh);
    const entry = { mesh, wireMesh };
    OBJECTS.push(entry);
    return entry;
  }

  // --- room shell: 5 planes (floor, ceiling, back, left, right), each 2
  // triangles, rotated so the face normal points INTO the room.
  const roomMat = (color) => new THREE.MeshPhongMaterial({ color, shininess: 8 });
  const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), roomMat(0xd8d8d8));
  floorMesh.rotation.x = -Math.PI / 2; // normal -> +Y (up, into the room)
  floorMesh.position.set(0, 0, 0);
  addObject(floorMesh);

  const ceilingMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), roomMat(0xd8d8d8));
  ceilingMesh.rotation.x = Math.PI / 2; // normal -> -Y (down, into the room)
  ceilingMesh.position.set(0, ROOM, 0);
  addObject(ceilingMesh);

  const backMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), roomMat(0xd8d8d8));
  backMesh.position.set(0, HALF, -HALF); // default normal +Z -> into the room
  addObject(backMesh);

  const leftMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), roomMat(0xb23a3a)); // red
  leftMesh.rotation.y = Math.PI / 2; // normal -> +X (into the room)
  leftMesh.position.set(-HALF, HALF, 0);
  addObject(leftMesh);

  const rightMesh = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), roomMat(0x3a9c4a)); // green
  rightMesh.rotation.y = -Math.PI / 2; // normal -> -X (into the room)
  rightMesh.position.set(HALF, HALF, 0);
  addObject(rightMesh);

  // --- tall + short boxes (white, MeshPhongMaterial, own geometry) — the
  // original Cornell materials, untouched by the metal controls.
  const boxMat = () => new THREE.MeshPhongMaterial({ color: 0xe8e4da, shininess: 14 });
  const tallBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(TALL_BOX.w, TALL_BOX.h, TALL_BOX.d), boxMat());
  tallBoxMesh.position.set(TALL_BOX.x, TALL_BOX.h / 2, TALL_BOX.z);
  tallBoxMesh.rotation.y = TALL_BOX.rotY;
  addObject(tallBoxMesh);

  const shortBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(SHORT_BOX.w, SHORT_BOX.h, SHORT_BOX.d), boxMat());
  shortBoxMesh.position.set(SHORT_BOX.x, SHORT_BOX.h / 2, SHORT_BOX.z);
  shortBoxMesh.rotation.y = SHORT_BOX.rotY;
  addObject(shortBoxMesh);

  // --- teapot + bunny: each a SLOT holding its mesh, its Phong/GGX
  // material pair, and its current control state. Both start as empty
  // placeholders (0 triangles — a valid, zero-vertex position attribute; a
  // bare `new THREE.BufferGeometry()` has no `position` attribute at all,
  // which crashes `new THREE.WireframeGeometry()` in addObject()) so the
  // rest of the scene renders immediately; loadSceneModel() swaps in the
  // real (cached, shared, never-mutated) geometry once it resolves.
  function emptyPlaceholderGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    return g;
  }

  const SLOTS = {
    teapot: { metal: 'gold', brdf: 'phong', roughness: PARAMS.teapotRough.value, map: 'none', mode: 'bump' },
    bunny: { metal: 'alum', brdf: 'phong', roughness: PARAMS.bunnyRough.value, map: 'none', mode: 'bump' },
  };
  SLOTS.teapot.pair = makeMetalPair(SLOTS.teapot.metal, SLOTS.teapot.roughness);
  SLOTS.bunny.pair = makeMetalPair(SLOTS.bunny.metal, SLOTS.bunny.roughness);

  const teapotMesh = new THREE.Mesh(emptyPlaceholderGeometry(), SLOTS.teapot.pair.phong);
  teapotMesh.scale.setScalar(TEAPOT_SCALE);
  teapotMesh.position.set(SHORT_BOX.x, TEAPOT_TOP_Y, SHORT_BOX.z);
  teapotMesh.rotation.y = SHORT_BOX.rotY;
  SLOTS.teapot.mesh = teapotMesh;
  SLOTS.teapot.entry = addObject(teapotMesh);

  const bunnyMesh = new THREE.Mesh(emptyPlaceholderGeometry(), SLOTS.bunny.pair.phong);
  bunnyMesh.scale.setScalar(BUNNY_SCALE);
  bunnyMesh.position.set(TALL_BOX.x, BUNNY_TOP_Y, TALL_BOX.z);
  bunnyMesh.rotation.y = TALL_BOX.rotY;
  SLOTS.bunny.mesh = bunnyMesh;
  SLOTS.bunny.entry = addObject(bunnyMesh);

  // --- ceiling light quad (emissive white, MeshBasicMaterial — unlit by
  // design) + its wireframe overlay, both moved by lightX alongside the
  // PointLight.
  const lightQuadMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(LIGHT_QUAD_SIZE, LIGHT_QUAD_SIZE),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  lightQuadMesh.rotation.x = Math.PI / 2; // faces down, like the ceiling
  lightQuadMesh.position.set(0, LIGHT_QUAD_Y, 0);
  addObject(lightQuadMesh);

  const modelCard = shell.addCard('scene');
  const sceneNote = document.createElement('p');
  sceneNote.className = 'demo-hint';
  sceneNote.style.cssText = 'margin:0;color:#8b93a7;font-size:12px;';
  sceneNote.textContent = 'Cornell box, original contents: tall box rear-left + bunny, short box front-right + teapot — both metals with per-model BRDF and bump/displacement controls.';
  modelCard.appendChild(sceneNote);

  // --- textures (built once, up front; checker/brick color only USED from
  // stage 3 on; the three height maps are the metal models' map options).
  const floorChecker = buildFloorChecker();
  const { colorTex: brickTex, heightTex: brickHeightTex } = buildTextures();
  const HEIGHT_MAPS = { brick: brickHeightTex, hammer: buildHammeredHeight(), brush: buildBrushedHeight() };

  // applyModelMaterial(slot): the ONE place a slot's control state
  // (metal/brdf/roughness/map/mode) -> its material pair. Maps and
  // parameters are pushed to BOTH pair members so toggling BRDF preserves
  // the bump/displacement choice; the active member is then swapped onto
  // the mesh (carrying the current stage's flatShading flag across).
  function applyModelMaterial(slot) {
    const preset = METALS[slot.metal];
    const tex = slot.map === 'none' ? null : HEIGHT_MAPS[slot.map];
    const bumpTex = slot.mode === 'bump' ? tex : null;
    const dispTex = slot.mode === 'displace' ? tex : null;
    for (const mat of [slot.pair.phong, slot.pair.ggx]) {
      mat.color.setHex(preset.color);
      mat.bumpMap = bumpTex;
      mat.bumpScale = BUMP_SCALE;
      mat.displacementMap = dispTex;
      mat.displacementScale = DISP_SCALE;
      mat.displacementBias = -DISP_SCALE * 0.55; // center the mid-gray level
      mat.needsUpdate = true;
    }
    slot.pair.phong.specular.setHex(preset.specular);
    slot.pair.phong.shininess = phongShininess(slot.roughness);
    slot.pair.ggx.roughness = slot.roughness;
    const active = slot.brdf === 'phong' ? slot.pair.phong : slot.pair.ggx;
    if (slot.mesh.material !== active) {
      active.flatShading = slot.mesh.material.flatShading; // stage 1 survives the swap
      active.needsUpdate = true;
      slot.mesh.material = active;
    }
    render();
  }

  const controlsCard = shell.addCard('controller — render quality & light');
  const ids = pageStage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'our-scene');
  const sliders = {};
  for (const id of ids) {
    // In full mode the two roughness sliders live INSIDE their model's
    // material card (built right below); embeds keep every selected slider
    // here. Either way stage stays the FIRST range input in the DOM.
    if (pageStage === 'full' && (id === 'teapotRough' || id === 'bunnyRough')) continue;
    sliders[id] = new SliderRow(controlsCard, { id: `our-scene-${id}`, ...PARAMS[id] });
  }

  // --- per-model material cards (full page only): metal / brdf / map /
  // mode ButtonRows + the model's roughness slider.
  function buildMaterialCard(slotKey, roughId) {
    const slot = SLOTS[slotKey];
    const card = shell.addCard(`${slotKey} — material`);
    const rows = [
      ['metal', METAL_OPTIONS],
      ['brdf', BRDF_OPTIONS],
      ['map', MAP_OPTIONS],
      ['mode', MODE_OPTIONS],
    ];
    for (const [key, options] of rows) {
      const row = new ButtonRow(card, { id: `our-scene-${slotKey}-${key}`, label: key, options, value: slot[key] });
      row.onChange((v) => {
        slot[key] = v;
        applyModelMaterial(slot);
      });
    }
    sliders[roughId] = new SliderRow(card, { id: `our-scene-${roughId}`, ...PARAMS[roughId] });
  }
  if (pageStage === 'full') {
    buildMaterialCard('teapot', 'teapotRough');
    buildMaterialCard('bunny', 'bunnyRough');
  }

  const readoutCard = shell.addCard('readout — the scene');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'stage', label: 'stage', format: (v) => STAGE_NAMES[v] },
      { id: 'tris', label: 'triangles (scene)', format: (v) => v.toLocaleString('en-US') },
      { id: 'lightX', label: 'light x', format: (v) => v.toFixed(2) },
    ],
  });
  // Credit caption: both loaded models' credits (Stanford bunny + Newell
  // teapot), populated as each loads — same mechanism as lod.js/
  // mesh-view.js's creditEl.
  const creditEl = document.createElement('p');
  creditEl.className = 'demo-hint';
  creditEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  readoutCard.appendChild(creditEl);
  const credits = { teapot: '', bunny: '' };
  function updateCredits() {
    creditEl.textContent = [credits.teapot, credits.bunny].filter(Boolean).join(' · ');
  }

  function trisOf(geometry) {
    return geometry.index ? geometry.index.count / 3 : geometry.attributes.position.count / 3;
  }

  function sceneTriangleTotal() {
    let total = 0;
    for (const { mesh } of OBJECTS) total += trisOf(mesh.geometry);
    return total;
  }

  // applyStage(): the ONE place `stage` -> materials/maps/renderer flags.
  // Never touches the scene graph — every mesh/geometry built above stays
  // exactly as-is; only shading mode, texture presence/filtering, and the
  // renderer's pixel ratio change.
  function applyStage() {
    const s = model.stage;
    const wireOn = s === 0;
    const flat = s === 1;
    const textured = s >= 3;
    const aa = s === 4;

    for (const { mesh, wireMesh } of OBJECTS) {
      mesh.visible = !wireOn;
      wireMesh.visible = wireOn;
      if ('flatShading' in mesh.material && mesh.material.flatShading !== flat) {
        mesh.material.flatShading = flat;
        mesh.material.needsUpdate = true;
      }
    }

    floorMesh.material.map = textured ? floorChecker : null;
    floorMesh.material.needsUpdate = true;
    tallBoxMesh.material.map = textured ? brickTex : null;
    tallBoxMesh.material.needsUpdate = true;

    for (const tex of [floorChecker, brickTex]) {
      tex.magFilter = aa ? THREE.LinearFilter : THREE.NearestFilter;
      tex.minFilter = aa ? THREE.LinearMipmapLinearFilter : THREE.NearestFilter;
      tex.generateMipmaps = aa;
      tex.needsUpdate = true;
    }

    // base matches scene-shell.js's own devicePixelRatio cap (root cause 2 of
    // the C5 embed-resolution fix) so stage 4's "anti-aliased" bump is
    // relative to the SAME baseline every other stage now renders at, not a
    // hardcoded 1x; capped at 3 total so a 2x-dpr Retina display doesn't jump
    // to a 4x buffer for this one stage.
    const base = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(aa ? Math.min(base * 2, 3) : base);
    sc.resize(); // re-applies the (now-changed) pixel ratio to the actual drawing buffer, then renders

    table.update('stage', s);
    table.update('tris', sceneTriangleTotal());
    render();
  }

  // The light quad's wireframe overlay must slide with it too (addObject
  // copied its transform once at build time) — find its entry and keep it
  // in lockstep explicitly, since lightX changes the quad's position AFTER
  // the initial copy.
  const lightQuadEntry = OBJECTS[OBJECTS.length - 1];
  function updateLight() {
    const x = model.lightX * LIGHT_X_SPAN;
    pointLight.position.set(x, LIGHT_Y, 0);
    lightQuadMesh.position.x = x;
    lightQuadEntry.wireMesh.position.x = x;
    table.update('lightX', model.lightX);
    render();
  }

  for (const id of ids) {
    const s = sliders[id];
    if (!s) continue;
    s.onInput((v) => {
      model[id] = v;
      if (id === 'stage') applyStage();
      else if (id === 'lightX') updateLight();
      else if (id === 'teapotRough') { SLOTS.teapot.roughness = v; applyModelMaterial(SLOTS.teapot); }
      else if (id === 'bunnyRough') { SLOTS.bunny.roughness = v; applyModelMaterial(SLOTS.bunny); }
    });
  }

  // loadSceneModel(): fetch/build a slot's real geometry once; swap the
  // placeholder for it and rebuild the wireframe overlay (the old empty
  // ones are disposed). No selector/async race here — each slot loads
  // exactly one file, exactly once.
  function loadSceneModel(name, opts, slot) {
    loadModel(name, opts)
      .then(({ geometry, credit }) => {
        const oldGeom = slot.mesh.geometry;
        const oldWireGeom = slot.entry.wireMesh.geometry;
        slot.mesh.geometry = geometry; // shared/cached — never mutated
        slot.entry.wireMesh.geometry = new THREE.WireframeGeometry(geometry);
        oldGeom.dispose();
        oldWireGeom.dispose();
        credits[name] = credit ?? '';
        updateCredits();
        table.update('tris', sceneTriangleTotal());
        applyStage(); // re-apply current stage's visible/hidden split to the new geometry
      })
      .catch((err) => {
        console.error(`our-scene: failed to load the ${name}`, err);
      });
  }

  const cam = makeOrbitCamera({
    camera: sc.camera,
    render,
    home: { eye: [0, 1.6, 5.2], target: [0, 1.3, 0] },
    sceneEl: shell.sceneEl,
    container,
    stage: pageStage,
    settings: nav,
  });
  shell.setNavController(cam);

  applyStage();
  updateLight();
  applyModelMaterial(SLOTS.teapot);
  applyModelMaterial(SLOTS.bunny);
  loadSceneModel('bunny', { lod: 'l2' }, SLOTS.bunny); // async; scene above is already rendered
  loadSceneModel('teapot', {}, SLOTS.teapot);

  return { model, sliders, cam, input: cam };
}
