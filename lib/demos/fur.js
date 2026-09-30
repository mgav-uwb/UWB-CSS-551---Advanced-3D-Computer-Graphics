// fur: the Stanford bunny grown with strand fur, live (lib/core/fur.js). Each hair is a polyline of
// five segments grown from an area-weighted root, bent by gravity and optionally curled about the
// root normal. The hairs are one THREE.LineSegments drawn with a small shader that evaluates the
// Kajiya-Kay hair model per fragment from each vertex's tangent, so the light and shading sliders
// only change uniforms (instant) while the hair sliders regrow the geometry (debounced).
import * as THREE from '../vendor/three.module.js';
import { SliderRow, ButtonRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { loadModel, FLAT_MODELS } from '../core/models.js';
import { makeModelPicker, pickerWanted } from '../core/model-picker.js';
import { sampleHairRoots, growHairs } from '../core/fur.js';
import { resolveControlIds } from './registry.js';

// Order matters for tools/test-demos.mjs (it drives the FIRST range input): lightAz changes a uniform,
// the readout's light direction, and the pixels at once, with no regrow.
const PARAMS = {
  lightAz: { label: 'light azimuth', min: -180, max: 180, step: 1, value: 35, format: (v) => `${v.toFixed(0)}°` },
  lightEl: { label: 'light elevation', min: -10, max: 85, step: 1, value: 45, format: (v) => `${v.toFixed(0)}°` },
  shine: { label: 'specular exponent p', min: 2, max: 200, step: 1, value: 40, format: (v) => v.toFixed(0) },
  rootShade: { label: 'root darkening', min: 0, max: 0.9, step: 0.01, value: 0.65, format: (v) => v.toFixed(2) },
  hairs: { label: 'hairs', min: 10000, max: 300000, step: 10000, value: 100000, format: (v) => `${(v / 1000).toFixed(0)}k` },
  length: { label: 'length', min: 0.01, max: 0.12, step: 0.005, value: 0.05, format: (v) => v.toFixed(3) },
  gravity: { label: 'gravity', min: 0, max: 0.6, step: 0.01, value: 0.22, format: (v) => v.toFixed(2) },
  curl: { label: 'curl', min: 0, max: 0.8, step: 0.02, value: 0, format: (v) => v.toFixed(2) },
};
const GEOMETRY = new Set(['hairs', 'length', 'gravity', 'curl']);
const SEGMENTS = 5;
const PRESETS = {
  cream: { root: 0x6f5440, base: 0xd9b894, tip: 0xfff1e2 },
  pastel: { root: 0x6d4a66, base: 0xe3a9cc, tip: 0xfbe6f3 },
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>The Stanford bunny grown with fur: up to 300,000 hairs, each a curve of five straight segments,
  drawn as lines and lit with the hair lighting model of Kajiya and Kay (1989).</p>
  <p>Only the lighting comes from that paper. Kajiya and Kay rendered fur as a <em>volume</em>: small 3D
  textures (texels) of fur density and direction over the surface, ray traced. Games usually slice that
  volume into textured layers, <em>shells</em>, with <em>fins</em> at the silhouette (Lengyel, Praun,
  Finkelstein and Hoppe, 2001). This demo does neither: every hair is an explicit strand, so its cost grows
  with the number of hairs, and the silhouette is exact.</p>
  <h4>The concept</h4>
  <p>A hair is too thin to have a surface normal, so it is lit by its <em>tangent</em> T. The diffuse
  term is the sine of the angle between T and the light, √(1 − (T·L)²): a hair lying across the light
  is bright, one pointing at the light is dark. The highlight is
  ((T·L)(T·V) + sin(T,L) sin(T,V))<sup>p</sup>, bright where the viewer sits on the cone of mirror
  directions around the hair. The root is darkened to stand in for the shadow the other hairs cast.</p>
  <h4>Try this</h4>
  <p>Sweep <code>light azimuth</code>: the sheen slides across the fur. Raise <code>specular exponent</code>
  for a glossier coat. Set <code>root darkening</code> to 0 and the fur looks flat. Turn up
  <code>gravity</code> or <code>curl</code>, or cut <code>hairs</code> to 10k to see single strands.
  Drag to orbit; scroll to zoom.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const VERT = `
  attribute vec3 tangent;
  attribute float along;
  varying vec3 vT;
  varying vec3 vWorld;
  varying float vAlong;
  void main() {
    vT = normalize(mat3(modelMatrix) * tangent);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vAlong = along;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const FRAG = `
  uniform vec3 uL;
  uniform vec3 uRoot;
  uniform vec3 uBase;
  uniform vec3 uTip;
  uniform float uShine;
  uniform float uSpec;
  uniform float uRootShade;
  varying vec3 vT;
  varying vec3 vWorld;
  varying float vAlong;
  void main() {
    vec3 T = normalize(vT);
    vec3 V = normalize(cameraPosition - vWorld);
    float tl = dot(T, uL), tv = dot(T, V);
    float sinL = sqrt(max(0.0, 1.0 - tl * tl)), sinV = sqrt(max(0.0, 1.0 - tv * tv));
    float diffuse = sinL;
    float spec = pow(max(0.0, tl * tv + sinL * sinV), uShine);
    vec3 col = mix(uBase, uTip, vAlong);
    float occl = mix(1.0 - uRootShade, 1.0, vAlong);
    vec3 c = col * (0.22 + 0.85 * diffuse) * occl + uSpec * spec * vAlong * vec3(1.0);
    gl_FragColor = vec4(c, 1.0);
  }
`;

export function make(container, { stage = 'embed', controls } = {}) {
  const model = Object.fromEntries(Object.entries(PARAMS).map(([k, p]) => [k, p.value]));
  model.preset = 'cream';

  const shell = makeShell(container, {
    stage,
    help: { html: HELP_HTML },
    legend: 'drag orbit · scroll zoom',
    nav: 'orbit',
  });
  const sc = makeScene(shell.sceneEl, { fill: true });
  const { scene, renderer } = sc;
  if (sc.grid) sc.grid.position.y = -0.5;

  const uniforms = {
    uL: { value: new THREE.Vector3() },
    uRoot: { value: new THREE.Color() },
    uBase: { value: new THREE.Color() },
    uTip: { value: new THREE.Color() },
    uShine: { value: model.shine },
    uSpec: { value: 0.45 },
    uRootShade: { value: model.rootShade },
  };
  const hairMat = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG });
  const coreMat = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 1 });
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  scene.add(key);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  scene.add(lamp);

  let drawMs = 0, regrowMs = 0, stats = { hairs: 0, segments: SEGMENTS, vertices: 0 };
  function render() {
    const t0 = performance.now();
    sc.render();
    renderer.getContext().finish();
    drawMs = drawMs ? 0.8 * drawMs + 0.2 * (performance.now() - t0) : performance.now() - t0;
    updateReadout();
  }

  function applyLight() {
    const az = (model.lightAz * Math.PI) / 180, el = (model.lightEl * Math.PI) / 180;
    const L = uniforms.uL.value.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    key.position.copy(L).multiplyScalar(3);
    lamp.position.copy(L).multiplyScalar(0.9);
    uniforms.uShine.value = model.shine;
    uniforms.uRootShade.value = model.rootShade;
    const pr = PRESETS[model.preset];
    uniforms.uRoot.value.set(pr.root); uniforms.uBase.value.set(pr.base); uniforms.uTip.value.set(pr.tip);
    coreMat.color.set(pr.root);
  }

  // the bunny (unit height, centered, from the course's own model files) and its fur
  let meshData = null, hairs = null, core = null;
  function regrow() {
    if (!meshData) return;
    const t0 = performance.now();
    const roots = sampleHairRoots(meshData, model.hairs, 11);
    const g = growHairs(roots, { segments: SEGMENTS, length: model.length, lengthJitter: 0.4, gravity: model.gravity, curl: model.curl, jitter: 0.9 }, 12);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(g.position, 3));
    geo.setAttribute('tangent', new THREE.BufferAttribute(g.tangent, 3));
    geo.setAttribute('along', new THREE.BufferAttribute(g.along, 1));
    geo.setIndex(new THREE.BufferAttribute(g.index, 1));
    if (hairs) { scene.remove(hairs); hairs.geometry.dispose(); }
    hairs = new THREE.LineSegments(geo, hairMat);
    hairs.frustumCulled = false;
    scene.add(hairs);
    regrowMs = performance.now() - t0;
    stats = { hairs: g.hairs, segments: g.segments, vertices: g.vertices };
  }
  let regrowTimer = 0;
  const regrowSoon = () => { clearTimeout(regrowTimer); regrowTimer = setTimeout(() => { regrow(); render(); }, 120); };

  // grow fur on any model of the shared picker; the default is the bunny. A swap regrows the hair on
  // the new surface; the light, shading and hair settings carry over.
  let meshSeq = 0;
  function loadSurface(name) {
    const seq = ++meshSeq;
    loadModel(name, { lod: 'l2' }).then((m) => {
      if (seq !== meshSeq) return;                     // a later pick superseded this one
      const src = m.geometry.clone();   // the cached model geometry is shared; never mutate it
      if (!src.attributes.normal) src.computeVertexNormals();
      meshData = {
        positions: src.attributes.position.array,
        normals: src.attributes.normal.array,
        indices: src.index ? src.index.array : null,
      };
      if (core) { scene.remove(core); core.geometry.dispose(); }
      coreMat.side = FLAT_MODELS.has(name) ? THREE.DoubleSide : THREE.FrontSide;
      core = new THREE.Mesh(src, coreMat);
      scene.add(core);
      regrow();
      render();
    }).catch((err) => console.warn(`fur: could not load the ${name}`, err));
  }
  loadSurface('bunny');

  // ---- rail ----
  const picker = pickerWanted(stage, controls);
  if (picker.show) {
    const modelCard = shell.addCard('model');
    makeModelPicker(modelCard, { id: 'fur-model', value: 'bunny', onChange: (name) => loadSurface(name) });
  }
  const controlsCard = shell.addCard('controller: light, shading, hair');
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, picker.controls, 'fur');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `fur-${id}`, ...PARAMS[id] });
    sliders[id].onInput((v) => {
      model[id] = v;
      if (GEOMETRY.has(id)) regrowSoon(); else { applyLight(); render(); }
      updateReadout();
    });
  }
  const presetRow = new ButtonRow(controlsCard, {
    id: 'fur-preset', label: 'coat',
    options: [{ value: 'cream', label: 'cream' }, { value: 'pastel', label: 'pastel' }],
    value: model.preset,
  });
  presetRow.onChange((v) => { model.preset = v; applyLight(); render(); });

  const readoutCard = shell.addCard('readout: the fur and the light');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'L', label: 'light L', format: (v) => v },
      { id: 'hairs', label: 'hairs', format: (v) => `${(v / 1000).toFixed(0)}k` },
      { id: 'segments', label: 'segments', format: (v) => String(v) },
      { id: 'vertices', label: 'vertices', format: (v) => `${(v / 1e6).toFixed(2)} M` },
      { id: 'regrow', label: 'regrow time', format: (v) => `${v.toFixed(0)} ms` },
      { id: 'draw', label: 'draw time', format: (v) => `${v.toFixed(1)} ms` },
    ],
  });
  const note = document.createElement('p');
  note.className = 'demo-hint';
  note.textContent = 'diffuse = √(1 − (T·L)²); specular = ((T·L)(T·V) + sin(T,L) sin(T,V))^p';
  readoutCard.appendChild(note);

  function updateReadout() {
    const L = uniforms.uL.value;
    table.update('L', `(${L.x.toFixed(2)}, ${L.y.toFixed(2)}, ${L.z.toFixed(2)})`);
    table.update('hairs', stats.hairs);
    table.update('segments', stats.segments);
    table.update('vertices', stats.vertices);
    table.update('regrow', regrowMs);
    table.update('draw', drawMs);
  }

  const cam = makeOrbitCamera({
    camera: sc.camera, render, home: { eye: [0.9, 0.55, 1.9], target: [0, -0.05, 0] },
    sceneEl: shell.sceneEl, container, stage, settings: { orbitSpeed: 0.4, zoomSpeed: 0.12, moveSpeed: 1.5, rollRate: 60 },
  });
  shell.setNavController(cam);

  applyLight();
  updateReadout();
  render();
  return { model, sliders, cam, input: cam };
}
