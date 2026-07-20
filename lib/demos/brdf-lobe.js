// brdf-lobe: the S10 BRDF cockpit — a 3D scene whose objects wear the very
// BRDF the lobe plot describes, so changing the model live-changes the scene.
//
//  - MAIN view (PiP): the COURSE'S running Cornell scene (our-scene.js's
//    exact layout — red left / green right / white 3x3x3 room, tall box
//    rear-left with the Stanford bunny on top, short box front-right with
//    the Newell teapot on top). The four objects carry four distributed
//    material identities — gold METAL teapot, aluminum METAL short box,
//    pastel PLASTIC bunny, saturated glossy tall box — all wearing ONE
//    plotted BRDF: Phong mode → MeshPhongMaterial with shininess = s,
//    GGX mode → MeshStandardMaterial with roughness = the demo's roughness
//    (three's standard material is GGX/Cook-Torrance). Two point lights: a
//    "headlight" at the camera (moves as you orbit) and a fixed ceiling
//    light, plus red/green wall-bounce fills and a low ambient. Drop
//    roughness and the highlights tighten toward a mirror — exactly what
//    the lobe plot shows.
//  - INSET view (PiP, click to swap): the 2D reflectance-lobe polar plot (the
//    former whole-demo). Ground line + normal + incident ray + mirror
//    direction + the lobe traced around the mirror. Click it to enlarge.
//
// The 2D lobe math (Phong cos^s, GGX-NDF shape reused as a lobe radius) is
// unchanged from the pure-2D version; it now draws into the inset canvas and
// also drives the material. inAngle is a plot-only control (the incident angle
// in the 3D scene varies per surface point).
//
// Bunny + teapot come from core/models.js's loadModel() — CACHED, SHARED
// geometry instances, never mutated; both start as empty placeholders and
// pop in async (our-scene.js's idiom). Room geometry constants are copied
// from our-scene.js so the two demos show the SAME scene.
import * as THREE from '../vendor/three.module.js';
import { loadModel } from '../core/models.js';
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const D = Math.PI / 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// roughness FIRST: tools/test-demos.mjs drives the first range input as its
// smoke probe, and roughness drives BOTH the material (main canvas pixels) and
// the readout's s/α cell — so the "slider changes a mat-panel cell AND canvas
// pixels" check holds by construction.
const PARAMS = {
  roughness: { label: 'roughness', min: 0.05, max: 1, step: 0.01, value: 0.4, format: (v) => v.toFixed(2) },
  inAngle: { label: 'inAngle', min: 10, max: 80, step: 1, value: 45, format: (v) => `${v.toFixed(0)}°` },
};


const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>The course's Cornell scene — red left wall, green right wall, white
  floor/ceiling/back, an area light on the ceiling — with four material
  identities distributed over its objects: a gold METAL teapot on the short
  box, the short box itself in aluminum METAL, a pastel PLASTIC bunny on
  the tall box, and the tall box as a saturated glossy dielectric. It's lit
  like a radiosity render (the coloured walls bleed onto the objects, and
  the metals reflect the captured room) plus a headlight at the camera. All
  four share the roughness slider and Phong/GGX model, so the inset (click
  to swap) — the 2D reflectance "lobe" — describes the specular sharpness
  they all have in common.</p>
  <h4>The concept</h4>
  <p>A BRDF describes how a surface scatters light: a shiny surface has a tight
  lobe around the mirror direction, a rough one spreads it wide. The objects use
  three.js's Phong material (specular power) or its GGX/Cook-Torrance standard
  material — the very models the lobe plots — so the plotted lobe and the
  on-object highlight are the same thing seen two ways.</p>
  <h4>Try this</h4>
  <p>Lower <code>roughness</code> and watch every highlight tighten toward a
  mirror (the metals sharpen into reflections of the red/green walls) while
  the lobe needles; raise it and they spread. Switch Phong↔GGX to compare
  the tails, and compare the metals against the plastic bunny at the same
  roughness. Drag to orbit; scroll to zoom; click the inset to enlarge the
  lobe.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

// ---- 2D lobe math (unchanged) ----
function phongValue(phiRad, s) { return Math.pow(Math.max(0, Math.cos(phiRad)), s); }
function ggxRaw(phiRad, a2) {
  const cos2 = Math.cos(phiRad) ** 2;
  return a2 / (Math.PI * (cos2 * (a2 - 1) + 1) ** 2);
}
function ggxValue(phiRad, a2) { return ggxRaw(phiRad, a2) / ggxRaw(0, a2); }

/** lobeModel(kind, roughness) -> { fn(phiRad)->[0,1], param, formulaText }. */
function lobeModel(kind, roughness) {
  if (kind === 'ggx') {
    const alpha = roughness * roughness;
    const a2 = alpha * alpha;
    return {
      fn: (phiRad) => ggxValue(phiRad, a2),
      param: alpha,
      formulaText: `r(φ) ∝ α²/(π·(cos²φ·(α²−1)+1)²), α=${alpha.toFixed(3)} [shape only]`,
    };
  }
  const s = 2 / (roughness * roughness) - 2;
  return {
    fn: (phiRad) => phongValue(phiRad, s),
    param: s,
    formulaText: `r(φ) ∝ max(0,cos φ)^s, s=${s.toFixed(3)}`,
  };
}

/** halfWidthHalfMax(fn): first φ in 0..180° (1° steps) where fn(φ) <= 0.5. */
function halfWidthHalfMax(fn) {
  for (let d = 0; d <= 180; d++) if (fn(d * D) <= 0.5) return d;
  return 180;
}

// The Phong specular exponent for a roughness (the classic Blinn mapping),
// also what the lobe plot uses. Clamped so MeshPhongMaterial.shininess stays
// finite/sane at the roughness extremes.
function phongShininess(roughness) { return clamp(2 / (roughness * roughness) - 2, 1, 2000); }

/**
 * make(container, opts)
 * opts.stage === 'full' builds both sliders (roughness, inAngle) + the
 * Phong/GGX radio. Otherwise opts.controls picks sliders (embed exposes
 * roughness; the model stays Phong).
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = {
    roughness: PARAMS.roughness.value,
    inAngle: PARAMS.inAngle.value,
    lobeModel: 'phong', // 'phong' | 'ggx'
  };

  // Nav config (shared live object edited by the ⚙ fields) + display toggles,
  // same idiom as the other 3D demos.
  const nav = { orbitSpeed: 0.4, zoomSpeed: 0.12, moveSpeed: 3, rollRate: 60 };
  const disp = { grid: false, axes: false }; // a room reads better without the helper grid
  let grid, axes, render3d;

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
      getCurrent: () => disp.grid, apply: (v) => { disp.grid = v; if (grid) grid.visible = v; render3d?.(); } },
    { label: 'axes', toggle: true, title: 'Show the world axes',
      getCurrent: () => disp.axes, apply: (v) => { disp.axes = v; if (axes) axes.visible = v; render3d?.(); } },
  ];

  // PiP (the 2D lobe inset + swap) is a sandbox luxury; a compact deck embed
  // just shows the 3D room in the scene pane (no absolute PiP slots to fight
  // the slide's tight layout). So pip is on only in stage:'full'; in the embed
  // mainSlot falls back to sceneEl and there is no lobe inset.
  const usePip = stage === 'full';
  const shell = makeShell(container, {
    stage,
    help: { html: HELP_HTML },
    settings: settingsFields,
    legend: usePip
      ? 'drag orbit · scroll zoom · WASD move · click inset to swap'
      : 'drag orbit · scroll zoom · WASD move · Q/E roll',
    nav: 'orbit',
    pip: usePip,
    onSwap: () => { resizeMain(); render3d?.(); redrawLobe(); },
  });
  const mainSlot = shell.mainEl ?? shell.sceneEl;

  // ---- MAIN slot: the 3D room ----
  const sc = makeScene(mainSlot, { fill: true });
  const { scene, camera } = sc;
  grid = sc.grid;
  axes = sc.axes;
  grid.visible = disp.grid;
  axes.visible = disp.axes;

  // Drop scene-shell's flat hemisphere/directional fill; this scene lights
  // itself (Cornell-box style) below.
  for (const child of [...scene.children]) {
    if (child.isLight) scene.remove(child);
  }

  // --- Cornell-box room: our-scene.js's EXACT geometry (interior 3x3x3, y in
  // [0,3], red LEFT wall, green RIGHT wall, white floor/ceiling/back; every
  // wall a single FrontSide plane rotated to face INTO the room) so this demo
  // and our-scene show the SAME running scene. Real-time three.js has no
  // global illumination, so dim red/green "bounce" point lights near the
  // coloured walls fake the colour bleed onto the objects.
  const ROOM = 3, HALF = ROOM / 2;
  const TALL_BOX = { w: 0.9, h: 1.8, d: 0.9, x: -0.55, z: -0.6, rotY: 18 * D };
  const SHORT_BOX = { w: 0.9, h: 0.9, d: 0.9, x: 0.55, z: 0.5, rotY: -15 * D };
  const BUNNY_SCALE = 0.85, TEAPOT_SCALE = 0.8;
  const BUNNY_TOP_Y = TALL_BOX.h + BUNNY_SCALE * 0.5;
  const TEAPOT_TOP_Y = SHORT_BOX.h + TEAPOT_SCALE * 0.5;

  const matte = (color) => new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 });
  const whiteMat = matte(0xd8d8d8);
  const plane = (mat, pos, rot) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(ROOM, ROOM), mat);
    m.position.set(...pos);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    return m;
  };
  scene.add(plane(whiteMat, [0, 0, 0], [-Math.PI / 2, 0, 0])); // floor, normal up
  scene.add(plane(whiteMat, [0, ROOM, 0], [Math.PI / 2, 0, 0])); // ceiling, normal down
  scene.add(plane(whiteMat, [0, HALF, -HALF], null)); // back, default normal +Z
  scene.add(plane(matte(0xb23a3a), [-HALF, HALF, 0], [0, Math.PI / 2, 0])); // left: red
  scene.add(plane(matte(0x3a9c4a), [HALF, HALF, 0], [0, -Math.PI / 2, 0])); // right: green

  // Ceiling light: a glowing white panel (the visible area light) + a point
  // light just below it doing the actual lighting (an emissive panel alone
  // illuminates nothing without GI).
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  panel.position.set(0, ROOM - 0.02, 0);
  panel.rotation.x = Math.PI / 2;
  scene.add(panel);

  scene.add(new THREE.AmbientLight(0xffffff, 0.12));
  const ceiling = new THREE.PointLight(0xfff6e6, 6, 12);
  ceiling.position.set(0, ROOM - 0.1, 0);
  scene.add(ceiling);
  const redBounce = new THREE.PointLight(0xb23a3a, 1.5, 5);
  redBounce.position.set(-HALF + 0.2, HALF, 0.3);
  scene.add(redBounce);
  const greenBounce = new THREE.PointLight(0x3a9c4a, 1.5, 5);
  greenBounce.position.set(HALF - 0.2, HALF, 0.3);
  scene.add(greenBounce);
  const headlight = new THREE.PointLight(0xffffff, 3, 15);
  scene.add(headlight); // parked at the camera every render (render3d)

  // The four scene objects, each with its OWN material identity (colour +
  // metalness) distributed metal + dielectric across the scene:
  //   • teapot    — gold METAL (metalness 1): reflects the room in its own colour
  //   • short box — aluminum METAL (metalness 1), under the teapot
  //   • bunny     — pastel PLASTIC (dielectric): soft body + a white highlight
  //   • tall box  — a saturated glossy dielectric ("something else")
  // The roughness slider and Phong/GGX toggle drive ALL of them together (so
  // the lobe plot still describes their shared specular sharpness); only the
  // per-object colour/metalness differ. Bunny + teapot start as empty
  // placeholders (a valid zero-vertex position attribute) and pop in async
  // via loadSceneModel() below — our-scene.js's idiom.
  function emptyPlaceholderGeometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
    return g;
  }
  const tallBox = new THREE.Mesh(new THREE.BoxGeometry(TALL_BOX.w, TALL_BOX.h, TALL_BOX.d));
  tallBox.position.set(TALL_BOX.x, TALL_BOX.h / 2, TALL_BOX.z);
  tallBox.rotation.y = TALL_BOX.rotY;
  const shortBox = new THREE.Mesh(new THREE.BoxGeometry(SHORT_BOX.w, SHORT_BOX.h, SHORT_BOX.d));
  shortBox.position.set(SHORT_BOX.x, SHORT_BOX.h / 2, SHORT_BOX.z);
  shortBox.rotation.y = SHORT_BOX.rotY;
  const bunny = new THREE.Mesh(emptyPlaceholderGeometry()); // on the TALL box
  bunny.scale.setScalar(BUNNY_SCALE);
  bunny.position.set(TALL_BOX.x, BUNNY_TOP_Y, TALL_BOX.z);
  bunny.rotation.y = TALL_BOX.rotY;
  const teapot = new THREE.Mesh(emptyPlaceholderGeometry()); // on the SHORT box
  teapot.scale.setScalar(TEAPOT_SCALE);
  teapot.position.set(SHORT_BOX.x, TEAPOT_TOP_Y, SHORT_BOX.z);
  teapot.rotation.y = SHORT_BOX.rotY;
  const objects = [
    { mesh: teapot, color: 0xc9a24b, metalness: 1.0 }, // gold metal
    { mesh: shortBox, color: 0xc8ccd2, metalness: 1.0 }, // aluminum metal
    { mesh: bunny, color: 0xf0b6c8, metalness: 0.0 }, // pastel-pink plastic
    { mesh: tallBox, color: 0x7a4dc7, metalness: 0.0 }, // saturated purple glossy
  ];
  for (const o of objects) scene.add(o.mesh);

  // Environment map: capture the room from its centre (objects hidden) into a
  // cube map and set it as scene.environment, so the metal sphere actually
  // reflects the red/blue/white Cornell walls (a pure metal has no diffuse —
  // without this it's black except where a light hits it) and the dielectrics
  // pick up subtle image-based reflections. The room is static, so one capture
  // suffices; it's rebuilt only if a wall/light changes (they don't here).
  const cubeRT = new THREE.WebGLCubeRenderTarget(256, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });
  const cubeCam = new THREE.CubeCamera(0.05, 100, cubeRT);
  cubeCam.position.set(0, HALF, 0);
  scene.add(cubeCam);
  function captureEnv() {
    // Capture the ROOM only: hide the objects (no self-reflection) and the
    // camera-following headlight (it isn't part of the static room) so the
    // env map is the walls + ceiling light + colour bounce. The room's open
    // front would capture as the near-black page background — a flat metal
    // face looking that way (the aluminum short box) would then mirror pure
    // void — so the capture temporarily swaps in a dim studio-grey backdrop
    // and restores the real background after.
    for (const o of objects) o.mesh.visible = false;
    const hlOn = headlight.visible;
    headlight.visible = false;
    const bg = scene.background;
    scene.background = new THREE.Color(0x3a3f4a);
    cubeCam.update(sc.renderer, scene);
    scene.background = bg;
    headlight.visible = hlOn;
    for (const o of objects) o.mesh.visible = true;
    scene.environment = cubeRT.texture;
  }

  // applyMaterial(): rebuild EACH object's material for the current model +
  // roughness (three can't change material TYPE in place), preserving that
  // object's own colour/metalness. GGX → MeshStandardMaterial (real metalness);
  // Phong → MeshPhongMaterial (no metalness — a metal's tinted reflection is
  // approximated by tinting the specular by its colour). Disposes the previous
  // materials.
  let objMats = [];
  function applyMaterial() {
    for (const m of objMats) m.dispose();
    objMats = objects.map((o) => {
      const next = model.lobeModel === 'ggx'
        ? new THREE.MeshStandardMaterial({ color: o.color, roughness: model.roughness, metalness: o.metalness })
        : new THREE.MeshPhongMaterial({
            color: o.color,
            shininess: phongShininess(model.roughness),
            specular: o.metalness > 0.5 ? o.color : 0x888888, // metal reflects its colour; dielectrics a neutral highlight
          });
      o.mesh.material = next;
      return next;
    });
  }

  // render3d(): the ONE 3D render — parks the headlight at the camera, then
  // renders. Passed to the orbit camera as its render callback (so orbiting
  // repaints with the headlight tracking the eye) and called on every control
  // change / swap.
  render3d = function () {
    headlight.position.copy(camera.position);
    sc.render();
  };

  // resizeMain(): the 3D renderer follows shell.mainEl (swap, window, or a deck
  // slide becoming visible). Guarded against 0/1px sizes so a hidden slide at
  // mount keeps makeScene's usable fallback instead of collapsing to 1×1 (which
  // renders black until something resizes it).
  function resizeMain() {
    const w = mainSlot.clientWidth;
    const h = mainSlot.clientHeight;
    if (w < 2 || h < 2) return;
    sc.renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  // Re-fit + repaint when the (fixed-size) sandbox slots change — window resize
  // and PiP swap. SANDBOX ONLY: in a deck embed the scene canvas is CSS-sized
  // by the deck's `[data-demo] canvas { width:auto }` rule, and observing it
  // would feed back into a shrink loop; the embed uses makeScene's fallback
  // size like every other cockpit demo.
  if (usePip && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => { resizeMain(); render3d?.(); redrawLobe(); }).observe(mainSlot);
  }

  // ---- INSET slot: the 2D lobe plot (sandbox/PiP only) ----
  const lobeCanvas = shell.insetEl ? document.createElement('canvas') : null;
  let lctx = null;
  if (lobeCanvas) {
    lobeCanvas.width = 400;
    lobeCanvas.height = 300;
    shell.insetEl.appendChild(lobeCanvas);
    lctx = lobeCanvas.getContext('2d');
  }

  const COLOR_GROUND = '#8b93a7';
  const COLOR_NORMAL = '#5a6172';
  const COLOR_INCIDENT = '#ff7b72';
  const COLOR_MIRROR = '#79c0ff';
  const COLOR_LOBE = '#7ee787';

  function polarPoint(ox, oy, worldAngleDeg, r) {
    const a = worldAngleDeg * D;
    return [ox + r * Math.sin(a), oy - r * Math.cos(a)];
  }
  function arrowhead(ctx, fx, fy, tx, ty, color) {
    const hl = 9, ang = Math.atan2(ty - fy, tx - fx);
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - hl * Math.cos(ang - Math.PI / 6), ty - hl * Math.sin(ang - Math.PI / 6));
    ctx.lineTo(tx - hl * Math.cos(ang + Math.PI / 6), ty - hl * Math.sin(ang + Math.PI / 6));
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }

  // redrawLobe(): the polar plot, sized to the lobe canvas's CURRENT pixel
  // buffer so it stays crisp whether it is the inset or (after swap) the big
  // view. Resizes the buffer to its slot first.
  function redrawLobe() {
    if (!lobeCanvas) return; // no lobe inset in the embed (PiP is sandbox-only)
    const slot = shell.insetEl;
    const cw = Math.max(2, slot.clientWidth);
    const ch = Math.max(2, slot.clientHeight);
    if (lobeCanvas.width !== cw || lobeCanvas.height !== ch) { lobeCanvas.width = cw; lobeCanvas.height = ch; }
    const W = lobeCanvas.width, H = lobeCanvas.height;
    const ox = W / 2, oy = H * 0.72;
    const rayLen = Math.min(W, H) * 0.36;
    const lobeScale = Math.min(W, H) * 0.33;
    const { fn } = lobeModel(model.lobeModel, model.roughness);
    const { inAngle } = model;

    lctx.clearRect(0, 0, W, H);
    lctx.setLineDash([]);
    // ground
    lctx.strokeStyle = COLOR_GROUND; lctx.lineWidth = 1.5;
    lctx.beginPath(); lctx.moveTo(0, oy); lctx.lineTo(W, oy); lctx.stroke();
    // normal
    lctx.strokeStyle = COLOR_NORMAL;
    lctx.beginPath(); lctx.moveTo(ox, oy); lctx.lineTo(ox, oy - rayLen); lctx.stroke();
    lctx.fillStyle = COLOR_NORMAL; lctx.font = '12px sans-serif'; lctx.fillText('N', ox + 4, oy - rayLen + 10);
    // incident
    const [sx, sy] = polarPoint(ox, oy, -inAngle, rayLen);
    lctx.strokeStyle = COLOR_INCIDENT; lctx.lineWidth = 2;
    lctx.beginPath(); lctx.moveTo(sx, sy); lctx.lineTo(ox, oy); lctx.stroke();
    arrowhead(lctx, sx, sy, ox, oy, COLOR_INCIDENT);
    // mirror
    const [mx, my] = polarPoint(ox, oy, inAngle, rayLen);
    lctx.strokeStyle = COLOR_MIRROR; lctx.setLineDash([6, 5]);
    lctx.beginPath(); lctx.moveTo(ox, oy); lctx.lineTo(mx, my); lctx.stroke(); lctx.setLineDash([]);
    lctx.fillStyle = COLOR_MIRROR; lctx.fillText('mirror', mx - 6, my - 6);
    // lobe around the mirror direction
    const dMin = Math.max(-179, -90 - inAngle + 1);
    const dMax = Math.min(179, 90 - inAngle - 1);
    lctx.beginPath(); lctx.moveTo(ox, oy);
    for (let d = dMin; d <= dMax; d++) {
      const [px, py] = polarPoint(ox, oy, inAngle + d, lobeScale * fn(d * D));
      lctx.lineTo(px, py);
    }
    lctx.lineTo(ox, oy); lctx.closePath();
    lctx.fillStyle = 'rgba(126, 231, 135, 0.15)'; lctx.fill();
    lctx.strokeStyle = COLOR_LOBE; lctx.lineWidth = 2; lctx.stroke();
  }

  // ---- Rail: Controls + Readout ----
  const controlsCard = shell.addCard('Controls');
  const readoutCard = shell.addCard('Readout');

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'brdf-lobe');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `brdf-lobe-${id}`, ...PARAMS[id] });
  }

  if (stage === 'full') {
    const row = document.createElement('div');
    row.className = 'slider-row';
    for (const [val, text] of [['phong', 'Phong'], ['ggx', 'GGX']]) {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio'; radio.name = 'brdf-lobe-model'; radio.value = val; radio.checked = val === 'phong';
      radio.addEventListener('change', () => { model.lobeModel = val; update(); });
      const span = document.createElement('span');
      span.className = 'slider-label'; span.textContent = text;
      label.append(radio, span); row.appendChild(label);
    }
    controlsCard.appendChild(row);
  }

  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'model', label: 'model', className: 'row-v', format: (v) => v },
      { id: 'param', label: 's / α', className: 'row-w', format: (v) => v.toFixed(3) },
      { id: 'hwhm', label: 'HWHM (°)', className: 'row-u', format: (v) => v.toFixed(0) },
      { id: 'formula', label: 'formula', className: 'row-h', format: (v) => v },
    ],
  });
  const captionEl = document.createElement('p');
  captionEl.className = 'demo-hint';
  captionEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  readoutCard.appendChild(captionEl);
  // Credit caption: both loaded models' credits (Newell teapot + Stanford
  // bunny), populated as each loads — our-scene.js's creditEl idiom.
  const creditEl = document.createElement('p');
  creditEl.className = 'demo-hint';
  creditEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  readoutCard.appendChild(creditEl);
  const credits = { teapot: '', bunny: '' };

  // loadSceneModel(): fetch/build a model's real geometry once; swap the
  // placeholder for it (geometry only ever assigned — the loadModel()
  // instance is cached/shared, never mutated) and repaint. The material was
  // already applied to the mesh by applyMaterial(), so arrival needs no
  // material work; the env capture hides these objects anyway, so no
  // recapture either.
  function loadSceneModel(name, opts, mesh) {
    loadModel(name, opts)
      .then(({ geometry, credit }) => {
        const old = mesh.geometry;
        mesh.geometry = geometry;
        old.dispose();
        credits[name] = credit ?? '';
        creditEl.textContent = [credits.teapot, credits.bunny].filter(Boolean).join(' · ');
        render3d();
      })
      .catch((err) => {
        console.error(`brdf-lobe: failed to load the ${name}`, err);
      });
  }

  // update(): re-derive material + lobe + readout from the model, then repaint
  // both views. Called on every control change.
  function update() {
    applyMaterial();
    render3d();
    redrawLobe();

    const { param, formulaText, fn } = lobeModel(model.lobeModel, model.roughness);
    table.update('model', model.lobeModel === 'ggx' ? 'GGX-flavored' : 'Phong');
    table.update('param', param);
    table.update('hwhm', halfWidthHalfMax(fn));
    table.update('formula', formulaText);
    captionEl.textContent = model.lobeModel === 'ggx'
      ? 'objects use three.js MeshStandardMaterial (GGX/Cook-Torrance), roughness = the slider'
      : 'objects use three.js MeshPhongMaterial, shininess s = 2/roughness² − 2 (Blinn mapping)';
  }

  for (const id of ids) {
    sliders[id].onInput((v) => { model[id] = v; update(); });
  }

  // Observer framing: in front of the open box, looking in — same home view
  // as our-scene.js, so the red-left/green-right walls and the lit objects
  // read like the running example.
  const cam = makeOrbitCamera({
    camera,
    render: render3d,
    home: { eye: [0, 1.6, 5.2], target: [0, 1.3, 0] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  resizeMain();
  captureEnv(); // one-time room capture -> scene.environment (metal reflections)
  update();
  loadSceneModel('bunny', { lod: 'l2' }, bunny); // async; room renders immediately
  loadSceneModel('teapot', {}, teapot);
  return { model, sliders, panel: table, cam, input: cam };
}
