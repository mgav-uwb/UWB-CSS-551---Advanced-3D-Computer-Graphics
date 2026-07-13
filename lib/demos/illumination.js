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
import * as THREE from '../vendor/three.module.js';
import { dot, normalize, sub } from '../core/xform.js';
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { resolveControlIds } from './registry.js';

const D = Math.PI / 180;

const SPHERE_RADIUS = 1.2;
const LIGHT_ORBIT_R = 3; // fixed orbit radius about the sphere's (world-origin) center — the spherical formula below is view-matrix.js's eye formula with AT=[0,0,0]
const BASE_COLOR = 0x4477cc;
const SPEC_COLOR = 0xffffff;
const LIGHT_COLOR = 0xfff2c2;
const MARK_COLOR = 0xffe066;

// The MARKED POINT is fixed: normal n = normalize(1,1,1), point = n *
// SPHERE_RADIUS (sphere is centered at the origin, so the outward surface
// normal at any point equals the normalized point itself — N doesn't
// depend on the radius we picked).
const N = normalize([1, 1, 1]);
const MARK_POINT = N.map((c) => c * SPHERE_RADIUS);

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
    lightAz: PARAMS.lightAz.value,
    lightEl: PARAMS.lightEl.value,
    shine: PARAMS.shine.value,
    diffuseOn: true,
    specularOn: true,
  };

  const controlsEl = document.createElement('div');
  controlsEl.className = 'demo-controls';
  const viewportEl = document.createElement('div');
  viewportEl.className = 'demo-viewport';
  viewportEl.style.width = '400px';
  viewportEl.style.height = '300px';
  const panelEl = document.createElement('div');
  panelEl.className = 'demo-panel';

  container.appendChild(controlsEl);
  container.appendChild(viewportEl);
  container.appendChild(panelEl);

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'illumination');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsEl, { id: `illumination-${id}`, ...PARAMS[id] });
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
    controlsEl.appendChild(row);
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

  const table = new ValueTable(panelEl, {
    rows: [
      { id: 'nl', label: 'N·L', className: 'row-u', format: (v) => v.toFixed(3) },
      { id: 'rv', label: 'R·V', className: 'row-w', format: (v) => v.toFixed(3) },
      { id: 'diff', label: 'diffuse max(0,N·L)', className: 'row-v', format: (v) => v.toFixed(3) },
      { id: 'spec', label: 'specular max(0,R·V)^shine', className: 'row-h', format: (v) => v.toFixed(3) },
    ],
  });
  const captionEl = document.createElement('p');
  captionEl.className = 'demo-hint';
  captionEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  captionEl.textContent = 'classic Phong at the marked point (n = normalize(1,1,1)); three renders Blinn-Phong internally — see file header';
  panelEl.appendChild(captionEl);
  const verdictEl = document.createElement('p');
  verdictEl.style.cssText = 'margin:6px 0 0;font-size:13px;font-weight:600;';
  panelEl.appendChild(verdictEl);

  const { scene, camera, render } = makeScene(viewportEl, { width: 400, height: 300 });

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
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(SPHERE_RADIUS, 32, 24), material);
  scene.add(sphere);

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

  // V = normalize(cameraPos - point) is CONSTANT across every update: the
  // observer camera (makeScene's default, at (3,3,6)) and the marked point
  // never move — only the light does. Computed once, not per-frame.
  const CAM = [camera.position.x, camera.position.y, camera.position.z];
  const V = normalize(sub(CAM, MARK_POINT));

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

    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
  }

  update();
  return { model, sliders, panel: table };
}
