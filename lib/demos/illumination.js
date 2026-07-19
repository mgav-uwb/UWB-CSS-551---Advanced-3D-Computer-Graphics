// illumination: the S09 Phong-lighting cockpit. ONE sphere (three's
// SphereGeometry is fine — the mesh isn't the lesson) lit by ONE orbiting
// point light, plus a fixed MARKED POINT on the sphere's surface where we
// compute, in OUR OWN vector math (xform's dot/normalize/sub — never read
// off the GPU), the classic-Phong quantities: N·L, R·V, and the diffuse/
// specular scalar terms those feed. Params: lightAz/lightEl (spherical
// orbit angles, same cos/sin formula view-matrix.js uses for its eye),
// shine (drives BOTH material.shininess and the readout's specular
// exponent — one number, two consumers). Full stage adds diffuse/specular
// toggles that zero material channels (never a material swap).
//
// Honesty note: THREE.MeshPhongMaterial's shading model is actually
// Blinn-Phong internally (half-vector H·N, not R·V) — see three's
// lights_phong_fragment shader. Our JS readout below computes CLASSIC
// Phong (mirror reflection vector R, dotted with the view vector V). The
// two aren't numerically identical, but for a single light + moderate
// shininess they agree qualitatively (both peak when the eye sits near the
// mirror direction, both go to ~0 when the surface faces away from the
// light) — that qualitative agreement, not a pixel-exact match, is the
// point of this cockpit.
//
// Shell binding: mounted into the shared demo-shell (scene-dominant layout
// + "?"/"⚙"/legend) and driven by the free-look orbit camera, following
// mvc-transform.js's template. V (the view vector feeding R·V) is derived
// from the OBSERVER camera's live position each update — so orbiting the
// scene legitimately changes R·V (that's the point of "orbit until the
// highlight peaks"). Orbiting never touches the light; the light is driven
// only by lightAz/lightEl.
import * as THREE from '../vendor/three.module.js';
import { dot, normalize, sub } from '../core/xform.js';
import { loadModel } from '../core/models.js';
import { SliderRow, ButtonRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const D = Math.PI / 180;

const SPHERE_RADIUS = 1.2;
const LIGHT_ORBIT_R = 3; // fixed orbit radius about the sphere's (world-origin) center — the spherical formula below is view-matrix.js's eye formula with AT=[0,0,0]
const BASE_COLOR = 0x4477cc;
const SPEC_COLOR = 0xffffff;
const LIGHT_COLOR = 0xfff2c2;
const MARK_COLOR = 0xffe066;

// Model selector (default: sphere, unchanged). teapot/bunny are loaded via
// core/models.js's loadModel() — CACHED, SHARED geometry instances, never
// mutated (only assigned to the mesh + scaled via the mesh's own transform).
// The marked point (N = normalize(1,1,1) on the SPHERE's own surface) is a
// property of the sphere only — swapping to a real mesh hides the dot/ray
// and blanks the N·L/R·V/diffuse/specular readout rows (see update() below);
// the light itself, and the always-live `light az` row, keep working on
// every model so a slider still visibly does something.
const MODEL_OPTIONS = [
  { value: 'sphere', label: 'sphere' },
  { value: 'teapot', label: 'teapot' },
  { value: 'bunny', label: 'bunny' },
];
// loadModel() normalizes teapot/bunny to unit height, centered at the
// origin — scale them up to roughly the sphere's footprint (diameter
// 2*SPHERE_RADIUS) so swapping models doesn't shrink the subject to a speck.
const MODEL_SCALE = SPHERE_RADIUS * 2;

// The MARKED POINT is fixed: normal n = normalize(1,1,1), point = n *
// SPHERE_RADIUS (sphere is centered at the origin, so the outward surface
// normal at any point equals the normalized point itself — N doesn't
// depend on the radius we picked).
const N = normalize([1, 1, 1]);
const MARK_POINT = N.map((c) => c * SPHERE_RADIUS);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Phong lighting evaluated at a marked point on a surface, with live N·L
  (diffuse term) and R·V (specular term) readouts.</p>
  <h4>The concept</h4>
  <p>Phong shading = ambient + diffuse·(N·L) + specular·(R·V)^shininess.
  Diffuse peaks when the surface faces the light (N·L); the specular
  highlight peaks when the mirror-reflection of the light lines up with the
  view direction (R·V).</p>
  <h4>Try this</h4>
  <p>Orbit the view until R·V peaks (the bright highlight appears), then
  move the light and watch both terms change. Note: orbiting the observer
  camera does NOT move the light — the light has its own controls. Switch to
  <code>teapot</code> or <code>bunny</code>: the marked point only lives on
  the sphere, so those rows blank to "—" — but the light still visibly
  shades whichever model is on screen.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

// Order here is also the "full stage" slider order; lightAz (first) is
// what tools/test-demos.mjs drives as the platform smoke test — swinging
// the light changes both the readout cells (N·L etc. depend on light
// position) and the rendered pixels (the sphere's shading moves with it).
const PARAMS = {
  lightAz: { label: 'lightAz', min: 0, max: 360, step: 1, value: 45, format: (v) => `${v.toFixed(0)}°` },
  lightEl: { label: 'lightEl', min: -60, max: 80, step: 1, value: 30, format: (v) => `${v.toFixed(0)}°` },
  shine: { label: 'shine', min: 1, max: 128, step: 1, value: 30, format: (v) => v.toFixed(0) },
};

/**
 * make(container, opts)
 * opts.stage === 'full' builds all three SliderRows plus diffuse/specular
 * checkboxes (both default on). Otherwise opts.controls (array of param
 * ids — embed stage exposes lightAz,shine) selects which SliderRows to
 * build; embed stage never gets the toggles (both stay on).
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = {
    name: 'sphere',
    lightAz: PARAMS.lightAz.value,
    lightEl: PARAMS.lightEl.value,
    shine: PARAMS.shine.value,
    diffuseOn: true,
    specularOn: true,
  };

  // Nav speeds (shared live object: the orbit camera and the "⚙" fields read/
  // write the SAME object) + display-toggle state. `grid`/`axes`/`render` are
  // assigned once the scene is built below; the toggle apply() closures run
  // only on user interaction (after that), so referencing them is safe.
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

  // The three.js scene fills the shell's scene pane (fill:true) instead of a
  // fixed 400×300 box — that's what makes it scene-dominant.
  const sc = makeScene(shell.sceneEl, { fill: true });
  const { scene, camera } = sc;
  ({ grid, axes, render } = sc);

  // scene-shell's default HemisphereLight + DirectionalLight are removed
  // here: this cockpit's whole point is ONE point light driving N·L/R·V,
  // and the default DirectionalLight sits near the observer camera (a
  // permanent "headlamp") that would keep the sphere's camera-facing side
  // lit even when our point light swings around back — directly
  // contradicting the S09 sanity check (light behind -> visibly dark). A
  // small AmbientLight replaces them purely so the sphere is never pure
  // black even with both toggles off (MeshPhongMaterial folds "ambient"
  // into whatever AmbientLight/HemisphereLight color sits in the scene,
  // times material.color — there's no separate ambient material channel).
  for (const child of [...scene.children]) {
    if (child.isLight) scene.remove(child);
  }
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));

  // decay=0 (no distance falloff): the orbit radius is fixed, so distance
  // barely varies with az/el anyway, and a flat intensity keeps the slider
  // math about DIRECTION, not photometric falloff tuning.
  const pointLight = new THREE.PointLight(LIGHT_COLOR, 2.2, 0, 0);
  scene.add(pointLight);

  const lightMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 8),
    new THREE.MeshBasicMaterial({ color: LIGHT_COLOR })
  );
  scene.add(lightMarker);

  const material = new THREE.MeshPhongMaterial({ color: BASE_COLOR, specular: SPEC_COLOR, shininess: model.shine });
  // sphereGeometry is demo-owned (built once, never mutated); teapot/bunny
  // arrive as CACHED, SHARED instances from loadModel() and are only ever
  // assigned to `mesh.geometry`, never touched otherwise.
  const sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 24);
  const mesh = new THREE.Mesh(sphereGeometry, material);
  scene.add(mesh);

  // The marked-point dot: MeshBasicMaterial (unlit) so it stays clearly
  // visible as a location marker even when the sphere itself goes dark —
  // it marks WHERE, the sphere's own shading shows WHETHER-LIT.
  const markDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 10, 8),
    new THREE.MeshBasicMaterial({ color: MARK_COLOR })
  );
  markDot.position.set(...MARK_POINT);
  scene.add(markDot);

  // Dashed line from the light to the marked point — cheap, rebuilt (never
  // mutated in place) each update since both its endpoints move.
  const rayMaterial = new THREE.LineDashedMaterial({ color: 0x8b93a7, dashSize: 0.15, gapSize: 0.1 });
  const rayMesh = new THREE.Line(new THREE.BufferGeometry(), rayMaterial);
  scene.add(rayMesh);

  // Rail cards: the model selector, the controller (Light/Material sliders +
  // toggles), and the readout (the N·L/R·V readout).
  const modelCard = shell.addCard('model');
  const selector = new ButtonRow(modelCard, {
    id: 'illumination-model',
    label: 'model',
    options: MODEL_OPTIONS,
    value: model.name,
  });

  const controlsCard = shell.addCard('Light / Material');
  const readoutCard = shell.addCard('Readout');

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'illumination');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `illumination-${id}`, ...PARAMS[id] });
  }

  function makeToggle(id, label, checked, onChange) {
    const row = document.createElement('label');
    row.className = 'slider-row';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = id;
    box.checked = checked;
    const text = document.createElement('span');
    text.className = 'slider-label';
    text.textContent = label;
    row.append(box, text);
    controlsCard.appendChild(row);
    box.addEventListener('change', () => onChange(box.checked));
    return box;
  }

  if (stage === 'full') {
    makeToggle('illumination-diffuse', 'diffuse', model.diffuseOn, (v) => {
      model.diffuseOn = v;
      update();
    });
    makeToggle('illumination-specular', 'specular', model.specularOn, (v) => {
      model.specularOn = v;
      update();
    });
  }

  // nl/rv/diff/spec are defined only at the sphere's marked point — blank to
  // "—" on a non-sphere model (see update()'s isSphere branch) rather than
  // reporting a stale/meaningless number. `az` has no such dependency: it
  // always shows the live light-azimuth angle, so a readout cell keeps
  // changing on every lightAz drag regardless of which model is on screen —
  // an intentional, documented addition to the default readout (one extra
  // row; the sphere-path N·L/R·V/diffuse/specular numbers are untouched).
  const NUMERIC_ROW = (v) => (v === null ? '—' : v.toFixed(3));
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'nl', label: 'N·L', className: 'row-u', format: NUMERIC_ROW },
      { id: 'rv', label: 'R·V', className: 'row-w', format: NUMERIC_ROW },
      { id: 'diff', label: 'diffuse max(0,N·L)', className: 'row-v', format: NUMERIC_ROW },
      { id: 'spec', label: 'specular max(0,R·V)^shine', className: 'row-h', format: NUMERIC_ROW },
      { id: 'az', label: 'light az', format: (v) => `${v.toFixed(0)}°` },
    ],
  });
  // Credit caption: a small dim line under the readout, populated from the
  // loaded model's `credit` (bunny: Stanford; teapot: Newell/public domain;
  // sphere: null → the line stays empty) — same mechanism as mesh-view.js's
  // creditEl.
  const creditEl = document.createElement('p');
  creditEl.className = 'demo-hint';
  creditEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  readoutCard.appendChild(creditEl);
  const captionEl = document.createElement('p');
  captionEl.className = 'demo-hint';
  captionEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  captionEl.textContent = 'classic Phong at the marked point (n = normalize(1,1,1)); three renders Blinn-Phong internally — see file header';
  readoutCard.appendChild(captionEl);
  const verdictEl = document.createElement('p');
  verdictEl.style.cssText = 'margin:6px 0 0;font-size:13px;font-weight:600;';
  readoutCard.appendChild(verdictEl);

  function update() {
    const { lightAz, lightEl, shine, diffuseOn, specularOn } = model;
    const azRad = lightAz * D;
    const elRad = lightEl * D;
    const lightPos = [
      LIGHT_ORBIT_R * Math.cos(elRad) * Math.sin(azRad),
      LIGHT_ORBIT_R * Math.sin(elRad),
      LIGHT_ORBIT_R * Math.cos(elRad) * Math.cos(azRad),
    ];

    pointLight.position.set(...lightPos);
    lightMarker.position.set(...lightPos);

    material.shininess = shine;
    // Zero the relevant channel to black rather than swapping materials —
    // diffuse-off also silences the ambient response (MeshPhongMaterial's
    // ambient term is materialColor * ambientLightColor), which is why the
    // small AmbientLight above exists: so "both off" dims to near-black
    // instead of a hard, confusing pop to literal (0,0,0).
    material.color.set(diffuseOn ? BASE_COLOR : 0x000000);
    material.specular.set(specularOn ? SPEC_COLOR : 0x000000);

    // The marked point (N = normalize(1,1,1)) is a property of the SPHERE's
    // own surface only — on a real mesh (teapot/bunny) there is no such
    // point, so the dot + dashed ray hide and the N·L/R·V/diffuse/specular
    // rows blank to "—" rather than reporting a number that describes a
    // point not actually on the model shown. `az` (below) has no such
    // dependency and stays live on every model.
    const isSphere = model.name === 'sphere';
    markDot.visible = isSphere;
    rayMesh.visible = isSphere;

    if (isSphere) {
      // V = normalize(cameraPos - point) is read from the LIVE observer
      // camera each update (not captured once): the orbit camera moves
      // sc.camera, and R·V (the specular readout) is defined in terms of
      // that view vector — orbiting the scene legitimately changes R·V,
      // which is the entire point of "orbit until the highlight peaks" in
      // the help panel. This update() is what the orbit camera calls after
      // every drag/zoom/WASD move (wired below as its `render` callback),
      // so the readouts stay live.
      const CAM = [camera.position.x, camera.position.y, camera.position.z];
      const V = normalize(sub(CAM, MARK_POINT));

      const L = normalize(sub(lightPos, MARK_POINT));
      const NL = dot(N, L);
      const R = N.map((n, i) => 2 * NL * n - L[i]);
      const RV = dot(R, V);
      const diffuseTerm = Math.max(0, NL);
      const specularTerm = Math.pow(Math.max(0, RV), shine);

      table.update('nl', NL);
      table.update('rv', RV);
      table.update('diff', diffuseTerm);
      table.update('spec', specularTerm);

      const lit = diffuseTerm > 1e-3;
      verdictEl.textContent = lit ? 'marked point: LIT (facing the light)' : 'marked point: IN SHADOW (facing away)';
      verdictEl.style.color = lit ? '#7ee787' : '#ff7b72';

      rayMesh.geometry.dispose();
      rayMesh.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...lightPos),
        new THREE.Vector3(...MARK_POINT),
      ]);
      rayMesh.computeLineDistances();
    } else {
      table.update('nl', null);
      table.update('rv', null);
      table.update('diff', null);
      table.update('spec', null);
      verdictEl.textContent = '';
    }

    table.update('az', model.lightAz);

    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
  }

  // resolveMesh(name): the sphere's geometry is demo-owned and built once
  // above (never rebuilt); teapot/bunny resolve via loadModel()'s cached,
  // shared-instance loader. Both paths return the same {geometry, credit}
  // shape so swapModel below doesn't care which one it got.
  function resolveMesh(name) {
    if (name === 'sphere') return Promise.resolve({ geometry: sphereGeometry, credit: null });
    return loadModel(name);
  }

  // swapModel(name): keeps the CURRENT mesh on screen until the requested
  // model resolves (no flash-to-empty on a slow bunny fetch); requestSeq
  // discards a stale resolution if the user clicks a second model before the
  // first lands — same idiom as lod.js/mesh-view.js.
  let requestSeq = 0;
  function swapModel(name) {
    const seq = ++requestSeq;
    resolveMesh(name)
      .then((data) => {
        if (seq !== requestSeq) return; // superseded by a later click
        mesh.geometry = data.geometry; // shared/cached (teapot/bunny) or ours (sphere) — never mutated
        mesh.scale.setScalar(name === 'sphere' ? 1 : MODEL_SCALE);
        creditEl.textContent = data.credit ?? '';
        update();
      })
      .catch((err) => {
        if (seq !== requestSeq) return;
        console.error(`illumination: failed to load model "${name}"`, err);
      });
  }

  selector.onChange((name) => {
    model.name = name;
    swapModel(name);
  });

  // Free-look orbit camera: framed like the old fixed camera (eye (3,3,6),
  // looking at the origin — makeScene's default, which this demo never
  // repositioned). `render` is update() itself (not the raw sc.render) so
  // every camera move (drag/zoom/WASD/Home) recomputes V/N·L/R·V from the
  // camera's new position, then repaints — the orbit camera only moves
  // sc.camera; it never touches pointLight.
  const cam = makeOrbitCamera({
    camera: sc.camera,
    render: update,
    home: { eye: [3, 3, 6], target: [0, 0, 0] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  update();
  return { model, sliders, panel: table, cam, input: cam };
}
