// bump-map: bump mapping at an intuitive level. A FLAT brick wall — the
// geometry is one quad, two triangles — lit by one orbiting point light.
// The brick pattern is two in-code DataTextures built from the SAME
// procedural function: a color map (brick faces + mortar) and a grayscale
// height map used as material.bumpMap. `bump` scales the lie (bumpScale;
// 0 = off, the wall goes flat) and `lightAz` swings the light so the faked
// grooves shade/unshade — the tell that bump is a LIGHTING trick: the
// silhouette never changes, because the geometry never changed.
// Default hemi+dir lights are removed (illumination.js's reasoning: a fixed
// "headlamp" would wash out the swing of our one point light).
// `bump` is FIRST: it drives the readout cell and the rendered pixels, the
// test-demos first-slider contract.
import * as THREE from '../vendor/three.module.js';
import { loadModel } from '../core/models.js';
import { SliderRow, ButtonRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const D = Math.PI / 180;
const TEX_N = 128;            // texels per side
const BRICK_W = 32;           // texels per brick
const BRICK_H = 16;
const MORTAR = 3;             // mortar thickness in texels
const LIGHT_EL = 35;          // fixed light elevation, degrees
const LIGHT_R = 3.2;          // light orbit radius

// Model selector (default: wall, unchanged — the existing flat quad). The
// brick color/bump textures apply through whichever mesh is on screen via
// ITS OWN UVs (the material never changes), so swapping to `teapot` is a
// geometry-only swap — loaded via core/models.js's loadModel(), a CACHED,
// SHARED instance, never mutated. The teapot's UVs are a real parametric
// unwrap (see lib/vendor/TeapotGeometry.js), so the brick pattern maps onto
// it cleanly, same lesson: the "grooves" are still lighting, not geometry.
const MODEL_OPTIONS = [
  { value: 'wall', label: 'wall' },
  { value: 'teapot', label: 'teapot' },
];
// loadModel() normalizes the teapot to unit height, centered at the origin —
// scale it up to roughly the wall's on-screen footprint (the wall quad is
// 3x3 units).
const MODEL_SCALE = 3;

const PARAMS = {
  bump: { label: 'bump', min: 0, max: 3, step: 0.05, value: 1.2, format: (v) => (v === 0 ? 'off' : v.toFixed(2)) },
  lightAz: { label: 'lightAz', min: 0, max: 360, step: 1, value: 55, format: (v) => `${v.toFixed(0)}°` },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A brick wall that is geometrically FLAT — one quad, two triangles. The
  grooves you see are a <em>bump map</em>: a grayscale height image that
  perturbs the lighting, not the surface.</p>
  <h4>The concept</h4>
  <p>Real grooves would cost thousands of triangles. A bump (or normal) map
  fakes their <em>shading</em> for free: where the height map dips, the
  renderer tilts the lighting math as if the surface dipped. It is a lie
  about geometry told through lighting — and it works until you look at the
  silhouette, which stays ruler-straight.</p>
  <h4>Try this</h4>
  <p>Swing <code>lightAz</code> and watch the grooves shade like real
  grooves. Now drag <code>bump</code> to 0 — the wall goes flat and the
  bricks become wallpaper. Orbit to a grazing angle and check the edge of
  the quad: no bumps there, ever.</p>
  <p>Switch to <code>teapot</code>: the same brick color/bump textures wrap
  around its real UVs — same lie, curved geometry.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

// Procedural brick: returns {color, height} for texel (x, y).
// Odd brick rows are offset half a brick, classic running bond.
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

/**
 * make(container, opts)
 * opts.stage === 'full' builds both SliderRows; otherwise opts.controls
 * (deck embeds expose bump,lightAz) selects them.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { name: 'wall', bump: PARAMS.bump.value, lightAz: PARAMS.lightAz.value, tris: 2 };

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

  // One point light must own the shading (see header comment).
  for (const child of [...scene.children]) {
    if (child.isLight) scene.remove(child);
  }
  scene.add(new THREE.AmbientLight(0xffffff, 0.22));
  const pointLight = new THREE.PointLight(0xfff2d8, 2.4, 0, 0);
  scene.add(pointLight);
  const lightMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.1, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2d8 })
  );
  scene.add(lightMarker);

  const { colorTex, heightTex } = buildTextures();
  const material = new THREE.MeshPhongMaterial({
    map: colorTex,
    bumpMap: heightTex,
    bumpScale: model.bump,
    shininess: 14,
  });
  // wallGeometry is demo-owned (built once, never mutated) — 3x3 units, 2
  // triangles, exactly the original PlaneGeometry. teapot arrives as a
  // CACHED, SHARED instance from loadModel(), only ever assigned to
  // `mesh.geometry`, never touched otherwise.
  const wallGeometry = new THREE.PlaneGeometry(3, 3);
  const mesh = new THREE.Mesh(wallGeometry, material);
  mesh.position.y = 1.5;
  mesh.rotation.x = -0.12;    // slight tilt so the quad reads in perspective
  scene.add(mesh);

  const modelCard = shell.addCard('model');
  const selector = new ButtonRow(modelCard, {
    id: 'bump-map-model',
    label: 'model',
    options: MODEL_OPTIONS,
    value: model.name,
  });

  const controlsCard = shell.addCard('controller — the lie');
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'bump-map');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `bump-map-${id}`, ...PARAMS[id] });
  }

  const readoutCard = shell.addCard('readout — the material');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'bump', label: 'bumpScale', format: (v) => (v === 0 ? 'off (flat)' : v.toFixed(2)) },
      { id: 'az', label: 'light az', format: (v) => `${v.toFixed(0)}°` },
      { id: 'tris', label: 'triangles', format: (v) => v.toFixed(0) },
    ],
  });
  // Credit caption: a small dim line under the readout, populated from the
  // loaded model's `credit` (teapot: Newell/public domain; wall: null → the
  // line stays empty) — same mechanism as mesh-view.js's creditEl.
  const creditEl = document.createElement('p');
  creditEl.className = 'demo-hint';
  creditEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  readoutCard.appendChild(creditEl);

  function update() {
    material.bumpScale = model.bump;
    const az = model.lightAz * D;
    const el = LIGHT_EL * D;
    pointLight.position.set(
      LIGHT_R * Math.cos(el) * Math.sin(az),
      1.5 + LIGHT_R * Math.sin(el),
      LIGHT_R * Math.cos(el) * Math.cos(az)
    );
    lightMarker.position.copy(pointLight.position);
    table.update('bump', model.bump);
    table.update('az', model.lightAz);
    table.update('tris', model.tris); // wall stays 2; the active geometry's real count otherwise
    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
  }

  // resolveMesh(name): the wall's geometry is demo-owned and built once
  // above (never rebuilt, always 2 triangles); teapot resolves via
  // loadModel()'s cached, shared-instance loader, whose `tris` is the real
  // count read off the built buffer (see core/models.js).
  function resolveMesh(name) {
    if (name === 'wall') return Promise.resolve({ geometry: wallGeometry, tris: 2, credit: null });
    return loadModel(name);
  }

  // swapModel(name): keeps the CURRENT mesh on screen until the requested
  // model resolves (no flash-to-empty on a slow fetch); requestSeq discards
  // a stale resolution if the user clicks a second model before the first
  // lands — same idiom as lod.js/mesh-view.js. Only geometry/rotation/scale/
  // triangle-count change; the brick material (and its bumpScale/lightAz
  // wiring) is untouched, applying through whichever mesh's own UVs.
  let requestSeq = 0;
  function swapModel(name) {
    const seq = ++requestSeq;
    resolveMesh(name)
      .then((data) => {
        if (seq !== requestSeq) return; // superseded by a later click
        mesh.geometry = data.geometry; // shared/cached (teapot) or ours (wall) — never mutated
        mesh.rotation.x = name === 'wall' ? -0.12 : 0;
        mesh.scale.setScalar(name === 'wall' ? 1 : MODEL_SCALE);
        model.tris = data.tris;
        creditEl.textContent = data.credit ?? '';
        update();
      })
      .catch((err) => {
        if (seq !== requestSeq) return;
        console.error(`bump-map: failed to load model "${name}"`, err);
      });
  }

  selector.onChange((name) => {
    model.name = name;
    swapModel(name);
  });

  const cam = makeOrbitCamera({
    camera: sc.camera,
    render,
    home: { eye: [1.2, 1.8, 4.2], target: [0, 1.5, 0] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  update();
  return { model, sliders, cam, input: cam };
}
