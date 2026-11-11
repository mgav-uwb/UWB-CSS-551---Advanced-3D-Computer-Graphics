// illumination: the S09 Phong-lighting cockpit. ONE sphere (three's
// SphereGeometry is fine: the mesh isn't the lesson) lit by ONE orbiting
// point light, plus a fixed MARKED POINT on the sphere's surface where we
// compute, in OUR OWN vector math (xform's dot/normalize/sub, never read
// off the GPU), the classic-Phong quantities: N·L, R·V, and the diffuse/
// specular scalar terms those feed. Params: lightAz/lightEl (spherical
// orbit angles, same cos/sin formula view-matrix.js uses for its eye),
// shine (drives BOTH material.shininess and the readout's specular
// exponent: one number, two consumers); the coefficients ka, kd, ks and the
// surface hue. Full stage adds ambient/diffuse/specular toggles that zero
// material channels (never a material swap).
//
// The three terms, each in isolation or together (2026-11-10, for L12):
//   ambient  = ka · kd · color, rendered as the material's EMISSIVE color: flat,
//              and the light's position does not change it;
//   diffuse  = kd · color · max(0, N·L), the material's color under the point light;
//   specular = ks · white · (highlight), the material's specular color.
// A term that is off sets its channel to black. An embed picks the terms it starts
// with and whether it shows the three on/off switches through data-controls tokens:
//   terms:a | terms:d | terms:s | terms:ads   which terms are on (default: all three)
//   toggles                                   show the ambient/diffuse/specular switches
// e.g. data-controls="terms:d,lightAz,lightEl,kd,hue" is diffuse alone.
//
// Honesty note: THREE.MeshPhongMaterial's shading model is actually
// Blinn-Phong internally (half-vector H·N, not R·V), see three's
// lights_phong_fragment shader. Our JS readout below computes CLASSIC
// Phong (mirror reflection vector R, dotted with the view vector V). The
// two aren't numerically identical, but for a single light + moderate
// shininess they agree qualitatively (both peak when the eye sits near the
// mirror direction, both go to ~0 when the surface faces away from the
// light): that qualitative agreement, not a pixel-exact match, is the
// point of this cockpit.
//
// Shell binding: mounted into the shared demo-shell (scene-dominant layout
// + "?"/"⚙"/legend) and driven by the free-look orbit camera, following
// mvc-transform.js's template. V (the view vector feeding R·V) is derived
// from the OBSERVER camera's live position each update, so orbiting the
// scene legitimately changes R·V (that's the point of "orbit until the
// highlight peaks"). Orbiting never touches the light; the light is driven
// only by lightAz/lightEl.
import * as THREE from '../vendor/three.module.js';
import { dot, normalize, sub } from '../core/xform.js';
import { loadModel, FLAT_MODELS } from '../core/models.js';
import { makeModelPicker } from '../core/model-picker.js';
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const D = Math.PI / 180;

const SPHERE_RADIUS = 1.2;
const LIGHT_ORBIT_R = 3; // fixed orbit radius about the sphere's (world-origin) center: the spherical formula below is view-matrix.js's eye formula with AT=[0,0,0]
// The surface color is a hue at fixed saturation and lightness (sRGB): hue 218 is the demo's old
// base color, 0x4477cc. kd scales it; ambient uses the same color, scaled by ka.
const SURFACE_SATURATION = 0.57;
const SURFACE_LIGHTNESS = 0.53;
const LIGHT_COLOR = 0xfff2c2;
const MARK_COLOR = 0xffe066;

// Model selector (default: sphere, unchanged). teapot/bunny are loaded via
// core/models.js's loadModel(): CACHED, SHARED geometry instances, never
// mutated (only assigned to the mesh + scaled via the mesh's own transform).
// The marked point (N = normalize(1,1,1) on the SPHERE's own surface) is a
// property of the sphere only: swapping to a real mesh hides the dot/ray
// and blanks the N·L/R·V/diffuse/specular readout rows (see update() below);
// the light itself, and the always-live `light az` row, keep working on
// every model so a slider still visibly does something.
// loadModel() normalizes teapot/bunny to unit height, centered at the
// origin: scale them up to roughly the sphere's footprint (diameter
// 2*SPHERE_RADIUS) so swapping models doesn't shrink the subject to a speck.
const MODEL_SCALE = SPHERE_RADIUS * 2;

// The MARKED POINT is fixed: normal n = normalize(1,1,1), point = n *
// SPHERE_RADIUS (sphere is centered at the origin, so the outward surface
// normal at any point equals the normalized point itself: N doesn't
// depend on the radius we picked).
const N = normalize([1, 1, 1]);
const MARK_POINT = N.map((c) => c * SPHERE_RADIUS);

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Phong lighting evaluated at a marked point on a surface, with live N·L
  and R·V readouts and the value of each term there.</p>
  <h4>The concept</h4>
  <p>Phong shading = ambient + diffuse + specular:
  ka·kd·color + kd·color·max(0, N·L) + ks·max(0, R·V)^shininess.
  Ambient is a constant: it does not depend on the light's position.
  Diffuse peaks when the surface faces the light (N·L); the specular
  highlight peaks when the mirror-reflection of the light lines up with the
  view direction (R·V). Each term can be switched on or off.</p>
  <h4>Try this</h4>
  <p>Ambient alone: move the light and nothing changes; change ka and kd and
  the flat color changes. Diffuse alone: the side away from the light is
  black. Specular alone: the body is black and only the highlight remains;
  orbit the view and it slides. Then turn all three on. Orbiting the observer
  camera does NOT move the light: the light has its own controls. Switch to
  <code>teapot</code> or <code>bunny</code>: the marked point only lives on
  the sphere, so those rows blank to "n/a", but the light still visibly
  shades whichever model is on screen.</p>
  <p>The pixels are three.js's Blinn-Phong (the half vector); the readout is
  classic Phong (R·V), so the highlight agrees in place, not in value.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

/** the surface color for a hue in degrees, as a THREE.Color (sRGB hue, saturation and lightness). */
function surfaceColor(hue) {
  return new THREE.Color().setHSL(hue / 360, SURFACE_SATURATION, SURFACE_LIGHTNESS, THREE.SRGBColorSpace);
}

/**
 * readEmbedOptions(controls): split an embed's data-controls tokens into the terms it starts
 * with ("terms:a", "terms:ds", ...), whether it shows the three term switches ("toggles"),
 * and the slider ids (everything else).
 */
function readEmbedOptions(controls) {
  const options = { terms: 'ads', toggles: false, ids: [] };
  for (const token of controls) {
    if (token.startsWith('terms:')) {
      options.terms = token.slice('terms:'.length);
    } else if (token === 'toggles') {
      options.toggles = true;
    } else {
      options.ids.push(token);
    }
  }
  return options;
}

/**
 * which readout rows a view shows: the rows of the terms it starts with, or all of them when the
 * switches show. compact (an embed with the switches) leaves out the two unscaled factors, which
 * the term rows already carry, so the rail fits a slide.
 */
function readoutRowsFor(terms, showAll, compact) {
  const a = showAll || terms.includes('a');
  const d = showAll || terms.includes('d');
  const s = showAll || terms.includes('s');
  const rows = [];
  if (a || d) rows.push('nl');
  if (s) rows.push('rv');
  if (d && !compact) rows.push('diff');
  if (s && !compact) rows.push('spec');
  if (a) rows.push('termA');
  if (d) rows.push('termD');
  if (s) rows.push('termS');
  if ((a ? 1 : 0) + (d ? 1 : 0) + (s ? 1 : 0) > 1) rows.push('sum');
  if (!compact) rows.push('az');
  return rows;
}

// Order here is also the "full stage" slider order; lightAz (first) is
// what tools/test-demos.mjs drives as the platform smoke test: swinging
// the light changes both the readout cells (N·L etc. depend on light
// position) and the rendered pixels (the sphere's shading moves with it).
const PARAMS = {
  lightAz: { label: 'lightAz', min: 0, max: 360, step: 1, value: 45, format: (v) => `${v.toFixed(0)}°` },
  lightEl: { label: 'lightEl', min: -60, max: 80, step: 1, value: 30, format: (v) => `${v.toFixed(0)}°` },
  ka: { label: 'ka (ambient)', min: 0, max: 1, step: 0.01, value: 0.12, format: (v) => v.toFixed(2) },
  kd: { label: 'kd (diffuse)', min: 0, max: 1, step: 0.01, value: 1, format: (v) => v.toFixed(2) },
  hue: { label: 'color (hue)', min: 0, max: 360, step: 1, value: 218, format: (v) => `${v.toFixed(0)}°` },
  ks: { label: 'ks (specular)', min: 0, max: 1, step: 0.01, value: 1, format: (v) => v.toFixed(2) },
  shine: { label: 'shine', min: 1, max: 128, step: 1, value: 30, format: (v) => v.toFixed(0) },
};

/**
 * make(container, opts)
 * opts.stage === 'full' builds every SliderRow plus the ambient/diffuse/specular
 * switches (all on). Otherwise opts.controls (the embed's data-controls tokens)
 * selects the SliderRows, the terms that start on ("terms:a", "terms:d", "terms:s",
 * "terms:ads"; default all three) and whether the switches show ("toggles").
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const embed = readEmbedOptions(controls ?? []);
  const terms = stage === 'full' ? 'ads' : embed.terms;
  const showToggles = stage === 'full' || embed.toggles;
  // an embed with the switches is the tallest rail: it drops the model card, the caption and
  // the two unscaled factors so the readout stays on the slide (the sphere is the only model)
  const compact = stage !== 'full' && embed.toggles;
  const model = {
    name: 'sphere',
    lightAz: PARAMS.lightAz.value,
    lightEl: PARAMS.lightEl.value,
    ka: PARAMS.ka.value,
    kd: PARAMS.kd.value,
    hue: PARAMS.hue.value,
    ks: PARAMS.ks.value,
    shine: PARAMS.shine.value,
    ambientOn: terms.includes('a'),
    diffuseOn: terms.includes('d'),
    specularOn: terms.includes('s'),
  };

  // Nav speeds (shared live object: the orbit camera and the "⚙" fields read/
  // write the SAME object) + display-toggle state. `grid`/`axes`/`render` are
  // assigned once the scene is built below; the toggle apply() closures run
  // only on user interaction (after that), so referencing them is safe.
  const nav = { orbitSpeed: 0.4, zoomSpeed: 0.12, moveSpeed: 3, rollRate: 60 };
  const disp = { grid: true, axes: true };
  let grid, axes, render;

  const settingsFields = [
    { label: 'orbit', decimals: 2, title: 'Orbit sensitivity, deg per pixel of drag, default 0.4',
      getCurrent: () => nav.orbitSpeed, apply: (v) => { nav.orbitSpeed = clamp(v, 0.02, 2); } },
    { label: 'zoom', decimals: 2, title: 'Zoom step, fraction of distance per wheel notch, default 0.12',
      getCurrent: () => nav.zoomSpeed, apply: (v) => { nav.zoomSpeed = clamp(v, 0.02, 0.5); } },
    { label: 'move', decimals: 1, title: 'WASD move speed, units/sec, default 3',
      getCurrent: () => nav.moveSpeed, apply: (v) => { nav.moveSpeed = clamp(v, 0.1, 20); } },
    { label: 'roll', decimals: 0, title: 'Q/E roll rate, deg/sec while held, default 60',
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
    legend: 'drag to turn · scroll zoom · WASD move · ↑/↓ up·down · Q/E roll · H home',
    nav: 'orbit',
  });

  // The three.js scene fills the shell's scene pane (fill:true) instead of a
  // fixed 400×300 box: that's what makes it scene-dominant.
  const sc = makeScene(shell.sceneEl, { fill: true });
  const { scene, camera } = sc;
  ({ grid, axes, render } = sc);

  // scene-shell's default HemisphereLight + DirectionalLight are removed
  // here: this cockpit's whole point is ONE point light driving N·L/R·V,
  // and the default DirectionalLight sits near the observer camera (a
  // permanent "headlamp") that would keep the sphere's camera-facing side
  // lit even when our point light swings around back: directly
  // contradicting the S09 sanity check (light behind -> visibly dark). There
  // is no AmbientLight either: the ambient term is the material's emissive
  // color (ka · kd · color), so it is exactly flat, ignores the light, and
  // switches off on its own (see update()).
  for (const child of [...scene.children]) {
    if (child.isLight) scene.remove(child);
  }

  // decay=0 (no distance falloff): the orbit radius is fixed, so distance
  // barely varies with az/el anyway, and a flat intensity keeps the slider
  // math about DIRECTION, not photometric falloff tuning. Intensity π: three's
  // Lambert term is (color / π) times the irradiance, so a white light of
  // intensity π renders kd · color · N·L, the readout's diffuse term.
  const pointLight = new THREE.PointLight(LIGHT_COLOR, Math.PI, 0, 0);
  scene.add(pointLight);

  const lightMarker = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 8),
    new THREE.MeshBasicMaterial({ color: LIGHT_COLOR })
  );
  scene.add(lightMarker);

  // ks and the specular switch act through a 1×1 specular map, not the specular color: three's
  // Blinn-Phong multiplies its highlight by a Schlick Fresnel whose grazing value is 1 whatever the
  // specular color, so a black specular color still leaves a white rim when the light is behind the
  // sphere. The map's value is three's specularStrength, which scales the whole highlight.
  const specularStrength = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
  specularStrength.needsUpdate = true;
  const material = new THREE.MeshPhongMaterial({
    color: surfaceColor(model.hue), specular: 0xffffff, specularMap: specularStrength, shininess: model.shine,
  });
  // sphereGeometry is demo-owned (built once, never mutated); teapot/bunny
  // arrive as CACHED, SHARED instances from loadModel() and are only ever
  // assigned to `mesh.geometry`, never touched otherwise.
  const sphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 24);
  const mesh = new THREE.Mesh(sphereGeometry, material);
  const baseSide = mesh.material.side; // the default mesh's own sidedness, restored off flat shapes
  scene.add(mesh);

  // The marked-point dot: MeshBasicMaterial (unlit) so it stays clearly
  // visible as a location marker even when the sphere itself goes dark:
  // it marks WHERE, the sphere's own shading shows WHETHER-LIT.
  const markDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 10, 8),
    new THREE.MeshBasicMaterial({ color: MARK_COLOR })
  );
  markDot.position.set(...MARK_POINT);
  scene.add(markDot);

  // Dashed line from the light to the marked point: cheap, rebuilt (never
  // mutated in place) each update since both its endpoints move.
  const rayMaterial = new THREE.LineDashedMaterial({ color: 0x8b93a7, dashSize: 0.15, gapSize: 0.1 });
  const rayMesh = new THREE.Line(new THREE.BufferGeometry(), rayMaterial);
  scene.add(rayMesh);

  // Rail cards: the model selector, the controller (Light/Material sliders +
  // toggles), and the readout (the N·L/R·V readout).
  if (!compact) {
    const modelCard = shell.addCard('model');
    // the shared picker (lib/core/model-picker.js): sphere (the default, the demo's own geometry), then every simple shape and classic
    makeModelPicker(modelCard, { id: 'illumination-model', value: model.name, onChange: (name) => { model.name = name; swapModel(name); } });
  }

  const controlsCard = shell.addCard('Light / Material');
  const readoutCard = shell.addCard('Readout');

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, embed.ids, 'illumination');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `illumination-${id}`, ...PARAMS[id] });
  }

  // the three term switches, side by side on one row
  function makeTermSwitches() {
    const row = document.createElement('div');
    row.className = 'slider-row';
    row.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;';
    const SWITCHES = [['ambient', 'ambientOn'], ['diffuse', 'diffuseOn'], ['specular', 'specularOn']];
    for (const [name, key] of SWITCHES) {
      const label = document.createElement('label');
      label.style.cssText = 'display:flex;gap:5px;align-items:center;cursor:pointer;';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.id = `illumination-${name}`;
      box.checked = model[key];
      const text = document.createElement('span');
      text.className = 'slider-label';
      text.textContent = name;
      label.append(box, text);
      row.appendChild(label);
      box.addEventListener('change', () => { model[key] = box.checked; update(); });
    }
    controlsCard.appendChild(row);
  }

  if (showToggles) makeTermSwitches();

  // nl/rv/diff/spec are defined only at the sphere's marked point: blank to
  // "n/a" on a non-sphere model (see update()'s isSphere branch) rather than
  // reporting a stale/meaningless number. `az` has no such dependency: it
  // always shows the live light-azimuth angle, so a readout cell keeps
  // changing on every lightAz drag regardless of which model is on screen:
  // an intentional, documented addition to the default readout (one extra
  // row; the sphere-path N·L/R·V/diffuse/specular numbers are untouched).
  // A term that is switched off reads "off" (a string passes through unformatted).
  const NUMERIC_ROW = (v) => (v === null ? 'n/a' : typeof v === 'string' ? v : v.toFixed(3));
  const ROWS = {
    nl: { id: 'nl', label: 'N·L', className: 'row-u', format: NUMERIC_ROW },
    rv: { id: 'rv', label: 'R·V', className: 'row-w', format: NUMERIC_ROW },
    diff: { id: 'diff', label: 'max(0,N·L)', className: 'row-v', format: NUMERIC_ROW },
    spec: { id: 'spec', label: 'max(0,R·V)^s', className: 'row-h', format: NUMERIC_ROW },
    termA: { id: 'termA', label: 'ambient', format: NUMERIC_ROW },
    termD: { id: 'termD', label: 'diffuse', format: NUMERIC_ROW },
    termS: { id: 'termS', label: 'specular', format: NUMERIC_ROW },
    sum: { id: 'sum', label: 'sum (terms on)', format: NUMERIC_ROW },
    az: { id: 'az', label: 'light az', format: (v) => `${v.toFixed(0)}°` },
  };
  const rowIds = readoutRowsFor(terms, showToggles, compact);
  const table = new ValueTable(readoutCard, { rows: rowIds.map((id) => ROWS[id]) });
  function showRow(id, value) {
    if (rowIds.includes(id)) table.update(id, value);
  }
  // Credit caption: a small dim line under the readout, populated from the
  // loaded model's `credit` (bunny: Stanford; teapot: Newell/public domain;
  // sphere: null → the line stays empty), same mechanism as mesh-view.js's
  // creditEl.
  const creditEl = document.createElement('p');
  creditEl.className = 'demo-hint';
  creditEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  readoutCard.appendChild(creditEl);
  const captionEl = document.createElement('p');
  captionEl.className = 'demo-hint';
  captionEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  captionEl.textContent = 'at the marked point: ambient = ka·kd, diffuse = kd·max(0,N·L), specular = ks·max(0,R·V)^s (classic Phong; the pixels are Blinn-Phong)';
  if (!compact) readoutCard.appendChild(captionEl);
  const verdictEl = document.createElement('p');
  verdictEl.style.cssText = 'margin:6px 0 0;font-size:13px;font-weight:600;';
  readoutCard.appendChild(verdictEl);

  // setMaterialTerms(): each term owns one material channel, and a term that is off sets
  // its channel to zero. diffuse: color = kd · surface color; ambient: emissive = ka ·
  // that same color (flat, unlit by the point light); specular: white, with strength ks
  // (the specular map's value).
  function setMaterialTerms() {
    const { ka, kd, ks, hue, ambientOn, diffuseOn, specularOn } = model;
    const body = surfaceColor(hue).multiplyScalar(kd);
    if (diffuseOn) material.color.copy(body);
    else material.color.setRGB(0, 0, 0);
    if (ambientOn) material.emissive.copy(body).multiplyScalar(ka);
    else material.emissive.setRGB(0, 0, 0);
    const strength = specularOn ? Math.round(255 * ks) : 0;
    if (specularStrength.image.data[0] !== strength) {
      specularStrength.image.data.set([strength, strength, strength, 255]);
      specularStrength.needsUpdate = true;
    }
  }

  function update() {
    const { lightAz, lightEl, shine } = model;
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
    // Zero the relevant channel to black rather than swapping materials.
    setMaterialTerms();

    // The marked point (N = normalize(1,1,1)) is a property of the SPHERE's
    // own surface only: on a real mesh (teapot/bunny) there is no such
    // point, so the dot + dashed ray hide and the N·L/R·V/diffuse/specular
    // rows blank to "n/a" rather than reporting a number that describes a
    // point not actually on the model shown. `az` (below) has no such
    // dependency and stays live on every model.
    const isSphere = model.name === 'sphere';
    markDot.visible = isSphere;
    rayMesh.visible = isSphere;

    if (isSphere) {
      // V = normalize(cameraPos - point) is read from the LIVE observer
      // camera each update (not captured once): the orbit camera moves
      // sc.camera, and R·V (the specular readout) is defined in terms of
      // that view vector: orbiting the scene legitimately changes R·V,
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

      showRow('nl', NL);
      showRow('rv', RV);
      showRow('diff', diffuseTerm);
      showRow('spec', specularTerm);
      const ambientValue = model.ka * model.kd;
      const diffuseValue = model.kd * diffuseTerm;
      const specularValue = model.ks * specularTerm;
      showRow('termA', model.ambientOn ? ambientValue : 'off');
      showRow('termD', model.diffuseOn ? diffuseValue : 'off');
      showRow('termS', model.specularOn ? specularValue : 'off');
      let sum = 0;
      if (model.ambientOn) sum += ambientValue;
      if (model.diffuseOn) sum += diffuseValue;
      if (model.specularOn) sum += specularValue;
      showRow('sum', sum);

      const lit = diffuseTerm > 1e-3;
      verdictEl.textContent = lit ? 'marked point: facing the light' : 'marked point: facing away, N·L clamped to 0';
      verdictEl.style.color = lit ? '#7ee787' : '#ff7b72';

      rayMesh.geometry.dispose();
      rayMesh.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(...lightPos),
        new THREE.Vector3(...MARK_POINT),
      ]);
      rayMesh.computeLineDistances();
    } else {
      for (const id of ['nl', 'rv', 'diff', 'spec', 'termA', 'termD', 'termS', 'sum']) showRow(id, null);
      verdictEl.textContent = '';
    }

    showRow('az', model.lightAz);

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
  // first lands, same idiom as lod.js/mesh-view.js.
  let requestSeq = 0;
  function swapModel(name) {
    const seq = ++requestSeq;
    resolveMesh(name)
      .then((data) => {
        if (seq !== requestSeq) return; // superseded by a later click
        mesh.material.side = FLAT_MODELS.has(name) ? THREE.DoubleSide : baseSide; // flat shapes have no back
        mesh.material.needsUpdate = true;
        mesh.geometry = data.geometry; // shared/cached (teapot/bunny) or ours (sphere), never mutated
        mesh.scale.setScalar(name === 'sphere' ? 1 : MODEL_SCALE);
        creditEl.textContent = data.credit ?? '';
        update();
      })
      .catch((err) => {
        if (seq !== requestSeq) return;
        console.error(`illumination: failed to load model "${name}"`, err);
      });
  }


  // Free-look orbit camera: framed like the old fixed camera (eye (3,3,6),
  // looking at the origin: makeScene's default, which this demo never
  // repositioned). `render` is update() itself (not the raw sc.render) so
  // every camera move (drag/zoom/WASD/Home) recomputes V/N·L/R·V from the
  // camera's new position, then repaints: the orbit camera only moves
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
