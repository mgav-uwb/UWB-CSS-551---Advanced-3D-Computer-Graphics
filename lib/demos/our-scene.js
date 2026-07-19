// our-scene: the S01 deck's running example — a modified Cornell box (red
// left / green right / white back-floor-ceiling, interior 3x3x3, y in [0,3])
// holding a tall box (rear-left) and a short box (front-right) topped by a
// real Stanford bunny, plus a sphere (front-left). ONE ceiling light (a
// PointLight + a matching emissive quad) slides in x. `stage` walks the SAME
// scene through five rendering qualities — wireframe, flat, smooth,
// textured, "anti-aliased" — flipping material flags/maps/renderer settings
// in place; it NEVER rebuilds the scene graph. `lightX` slides the light
// (and its emissive quad) so shading visibly shifts.
//
// stage is FIRST: tools/test-demos.mjs drives the first range input — stage
// changes both the readout's stage-name cell and the rendered pixels (every
// stage flips at least one material/renderer setting), the platform's
// first-slider contract, without touching lightX.
//
// Every object here is OURS (BoxGeometry/PlaneGeometry/SphereGeometry built
// in this file) except the bunny, loaded via core/models.js's loadModel() —
// a CACHED, SHARED geometry instance, never mutated. All bunny placement
// (sitting on the short box, the 0.85 scale) happens on its own mesh's
// transform, never the geometry. The bunny fetches over the network, so it
// pops in after the rest of the scene (box+sphere+walls) is already on
// screen — no flash-to-empty, no blocking the first paint.
import * as THREE from '../vendor/three.module.js';
import { loadModel } from '../core/models.js';
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const STAGE_NAMES = ['wireframe', 'flat', 'smooth', 'textured', 'anti-aliased'];

// stage FIRST: tools/test-demos.mjs drives the first range input.
const PARAMS = {
  stage: { label: 'stage', min: 0, max: 4, step: 1, value: 2, format: (v) => STAGE_NAMES[v] },
  lightX: { label: 'lightX', min: -0.8, max: 0.8, step: 0.05, value: 0, format: (v) => v.toFixed(2) },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// --- room geometry: interior 3x3x3, centered on the x/z origin, y in [0,3].
// Every wall is a single PlaneGeometry (2 triangles), FrontSide only (no
// DoubleSide) and rotated so its face normal points INTO the room — no
// wall is visible from outside, exactly like a real closed box.
const ROOM = 3;
const HALF = ROOM / 2;

// --- box + bunny + sphere placement (all fixed, hand-picked so nothing
// overlaps): tall box rear-left, short box front-right (bunny rides its
// top), sphere front-left. "front" is +Z (toward the open mouth/camera),
// "rear" is -Z, "left" is -X, "right" is +X.
const TALL_BOX = { w: 0.9, h: 1.8, d: 0.9, x: -0.55, z: -0.6, rotY: 18 * (Math.PI / 180) };
const SHORT_BOX = { w: 0.9, h: 0.9, d: 0.9, x: 0.55, z: 0.5, rotY: -15 * (Math.PI / 180) };
const SPHERE_R = 0.42;
const SPHERE_POS = { x: -0.55, z: 0.55 };
const BUNNY_SCALE = 0.85;

// --- ceiling light: an emissive quad + a PointLight just below it, both
// sliding in x together. lightX's range is [-0.8, 0.8]; the *1.5 spread
// keeps it well clear of the side walls (x = +/-1.5) at both extremes.
const LIGHT_QUAD_SIZE = 0.9;
const LIGHT_QUAD_Y = ROOM - 0.02; // 2.98
const LIGHT_Y = ROOM - 0.1; // just below the quad
const LIGHT_X_SPAN = 1.5;

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
// reimplementation. Only colorTex is used here (this demo doesn't bump-map
// the box); heightTex is built and discarded to keep the copy verbatim.
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

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A modified Cornell box: red left wall, green right wall, white
  back/floor/ceiling, a tall box rear-left and a short box front-right
  topped by a real Stanford-scanned bunny, and a sphere front-left. One
  ceiling light slides in x.</p>
  <h4>The concept</h4>
  <p><code>stage</code> walks the SAME scene through five rendering
  qualities without ever rebuilding it: pure wireframe, flat-shaded facets,
  smooth-shaded surfaces, added textures (a floor checker + brick tall box),
  and a final pass with 2x device-pixel-ratio rendering and filtered/
  mipmapped textures. Every stage is the identical geometry — only how it's
  drawn changes.</p>
  <h4>Try this</h4>
  <p>Step <code>stage</code> from 0 to 4 and watch the SAME box go from a
  line drawing to a lit, textured render. Drag <code>lightX</code> and watch
  the shading (and the little glowing ceiling panel) slide with it. Orbit to
  see the bunny sitting on the short box; scroll to zoom into the room.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

/**
 * make(container, opts)
 * opts.stage === 'full' builds both SliderRows; otherwise opts.controls
 * (deck embeds expose stage,lightX) selects them.
 */
export function make(container, { stage: pageStage = 'embed', controls } = {}) {
  const model = { stage: PARAMS.stage.value, lightX: PARAMS.lightX.value };

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

  // One ceiling PointLight must own the shading (see header comment) — the
  // scene-shell's default hemi+dir lights would wash out lightX's swing.
  for (const child of [...scene.children]) {
    if (child.isLight) scene.remove(child);
  }
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const pointLight = new THREE.PointLight(0xffffff, 2.2, 0, 0);
  scene.add(pointLight);

  // wireMaterial is shared by every stage-0 overlay (LineSegments); the
  // WireframeGeometry each carries is a fresh derived copy per mesh, ours to
  // dispose/rebuild (never the source geometry).
  const wireMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });

  // OBJECTS: every {mesh, wireMesh} pair the stage machinery walks — stage 0
  // hides every `mesh` and shows every `wireMesh`; every other stage is the
  // reverse. addObject() builds/attaches the wireframe overlay for a mesh
  // whose geometry is already final; the bunny (async) rebuilds its own
  // overlay once its real geometry lands (see loadBunny below).
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

  // --- tall + short boxes (white, MeshPhongMaterial, own geometry).
  const boxMat = () => new THREE.MeshPhongMaterial({ color: 0xe8e4da, shininess: 14 });
  const tallBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(TALL_BOX.w, TALL_BOX.h, TALL_BOX.d), boxMat());
  tallBoxMesh.position.set(TALL_BOX.x, TALL_BOX.h / 2, TALL_BOX.z);
  tallBoxMesh.rotation.y = TALL_BOX.rotY;
  addObject(tallBoxMesh);

  const shortBoxMesh = new THREE.Mesh(new THREE.BoxGeometry(SHORT_BOX.w, SHORT_BOX.h, SHORT_BOX.d), boxMat());
  shortBoxMesh.position.set(SHORT_BOX.x, SHORT_BOX.h / 2, SHORT_BOX.z);
  shortBoxMesh.rotation.y = SHORT_BOX.rotY;
  addObject(shortBoxMesh);

  // --- sphere, floor, front-left.
  const sphereMesh = new THREE.Mesh(
    new THREE.SphereGeometry(SPHERE_R, 32, 24),
    new THREE.MeshPhongMaterial({ color: 0x9fb8d9, shininess: 40 })
  );
  sphereMesh.position.set(SPHERE_POS.x, SPHERE_R, SPHERE_POS.z);
  addObject(sphereMesh);

  // --- bunny, placed on the short box's top, scaled to BUNNY_SCALE. Starts
  // as an empty placeholder (0 triangles, invisible via empty geometry) so
  // the rest of the scene renders immediately; loadBunny() below swaps in
  // the real (cached, shared, never-mutated) geometry once it resolves.
  const BUNNY_TOP_Y = SHORT_BOX.h + (BUNNY_SCALE * 0.5);
  const bunnyMaterial = new THREE.MeshPhongMaterial({ color: 0xd8c9a8, shininess: 10 });
  // Empty placeholder (a valid, zero-vertex position attribute — a bare
  // `new THREE.BufferGeometry()` has no `position` attribute at all, which
  // crashes `new THREE.WireframeGeometry()` in addObject() below) until
  // loadBunny() resolves the real geometry.
  const emptyGeometry = new THREE.BufferGeometry();
  emptyGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
  const bunnyMesh = new THREE.Mesh(emptyGeometry, bunnyMaterial);
  bunnyMesh.scale.setScalar(BUNNY_SCALE);
  bunnyMesh.position.set(SHORT_BOX.x, BUNNY_TOP_Y, SHORT_BOX.z);
  const bunnyEntry = addObject(bunnyMesh);

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
  sceneNote.textContent = 'Modified Cornell box: tall box rear-left, short box + bunny front-right, sphere front-left.';
  modelCard.appendChild(sceneNote);

  const controlsCard = shell.addCard('controller — render quality & light');
  const ids = pageStage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'our-scene');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `our-scene-${id}`, ...PARAMS[id] });
  }

  const readoutCard = shell.addCard('readout — the scene');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'stage', label: 'stage', format: (v) => STAGE_NAMES[v] },
      { id: 'tris', label: 'triangles (scene)', format: (v) => v.toLocaleString('en-US') },
      { id: 'lightX', label: 'light x', format: (v) => v.toFixed(2) },
    ],
  });
  // Credit caption: the bunny's Stanford credit, populated once it loads —
  // same mechanism as lod.js/mesh-view.js's creditEl.
  const creditEl = document.createElement('p');
  creditEl.className = 'demo-hint';
  creditEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  readoutCard.appendChild(creditEl);

  // --- textures (built once, up front; only USED from stage 3 on).
  const floorChecker = buildFloorChecker();
  const { colorTex: brickTex } = buildTextures(); // heightTex discarded — see provenance comment above

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

    renderer.setPixelRatio(aa ? 2 : 1);
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
    sliders[id].onInput((v) => {
      model[id] = v;
      if (id === 'stage') applyStage();
      if (id === 'lightX') updateLight();
    });
  }

  // loadBunny(): fetch the real Stanford bunny (l2) once; swap the
  // placeholder geometry for the real one and rebuild its wireframe overlay
  // (the old empty ones are disposed). No model selector/async race here —
  // this demo loads exactly one file, exactly once.
  function loadBunny() {
    loadModel('bunny', { lod: 'l2' })
      .then(({ geometry, credit }) => {
        const oldGeom = bunnyMesh.geometry;
        const oldWireGeom = bunnyEntry.wireMesh.geometry;
        bunnyMesh.geometry = geometry; // shared/cached — never mutated
        bunnyEntry.wireMesh.geometry = new THREE.WireframeGeometry(geometry);
        oldGeom.dispose();
        oldWireGeom.dispose();
        creditEl.textContent = credit ?? '';
        table.update('tris', sceneTriangleTotal());
        applyStage(); // re-apply current stage's visible/hidden split to the new geometry
      })
      .catch((err) => {
        console.error('our-scene: failed to load the bunny', err);
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
  loadBunny(); // kicks off the async bunny fetch; scene above is already rendered

  return { model, sliders, cam, input: cam };
}
