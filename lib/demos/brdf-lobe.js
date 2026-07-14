// brdf-lobe: the S10 BRDF cockpit — now a 3D room whose objects wear the very
// BRDF the lobe plot describes, so changing the model live-changes the scene.
//
//  - MAIN view (PiP): a small room (floor + three walls) holding the classic
//    trio — a sphere, a parallelepiped, and a tetrahedron — all sharing ONE
//    material that IS the plotted BRDF: Phong mode → MeshPhongMaterial with
//    shininess = s (three's Phong specular), GGX mode → MeshStandardMaterial
//    with roughness = the demo's roughness (three's standard material is
//    GGX/Cook-Torrance). Two point lights: a "headlight" at the camera (moves
//    as you orbit) and a fixed ceiling light, plus a low ambient fill. Drop
//    roughness and the highlights tighten toward a mirror — exactly what the
//    lobe plot shows.
//  - INSET view (PiP, click to swap): the 2D reflectance-lobe polar plot (the
//    former whole-demo). Ground line + normal + incident ray + mirror
//    direction + the lobe traced around the mirror. Click it to enlarge.
//
// The 2D lobe math (Phong cos^s, GGX-NDF shape reused as a lobe radius) is
// unchanged from the pure-2D version; it now draws into the inset canvas and
// also drives the material. inAngle is a plot-only control (the incident angle
// in the 3D scene varies per surface point).
import * as THREE from '../vendor/three.module.js';
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

const BASE_COLOR = 0x9aa7c0; // the shared object color, so Phong↔GGX is comparable
const ROOM_COLOR = 0x3a4152; // matte neutral walls/floor

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A little room of classic primitives — a sphere, a parallelepiped, and a
  tetrahedron — all wearing the SAME material, lit by a headlight at the camera
  and a light on the ceiling. The inset (click to swap) is the 2D reflectance
  "lobe" of that material's BRDF.</p>
  <h4>The concept</h4>
  <p>A BRDF describes how a surface scatters light: a shiny surface has a tight
  lobe around the mirror direction, a rough one spreads it wide. The objects use
  three.js's Phong material (specular power) or its GGX/Cook-Torrance standard
  material — the very models the lobe plots — so the plotted lobe and the
  on-object highlight are the same thing seen two ways.</p>
  <h4>Try this</h4>
  <p>Lower <code>roughness</code> and watch every highlight tighten toward a
  mirror while the lobe needles; raise it and they spread. Switch Phong↔GGX to
  compare the tails. Drag to orbit the room; scroll to zoom; click the inset to
  enlarge the lobe.</p>
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

  // Replace scene-shell's default hemisphere+directional lights (a flat, even
  // fill that washes out speculars) with a low ambient + the two point lights
  // this demo is about.
  for (const child of [...scene.children]) {
    if (child.isLight) scene.remove(child);
  }
  scene.add(new THREE.AmbientLight(0xffffff, 0.18));
  const ceiling = new THREE.PointLight(0xfff4e0, 40, 40);
  ceiling.position.set(0, 5.4, 0);
  scene.add(ceiling);
  const headlight = new THREE.PointLight(0xffffff, 30, 60);
  scene.add(headlight); // repositioned to the camera every render (render3d)

  // Room: floor + back + two side walls (open front and top so the orbit
  // camera can see in). Double-sided so you can orbit behind a wall.
  const roomMat = new THREE.MeshStandardMaterial({ color: ROOM_COLOR, roughness: 1, metalness: 0, side: THREE.DoubleSide });
  const wall = (w, h, pos, rotY) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), roomMat);
    m.position.set(...pos); if (rotY) m.rotation.y = rotY; return m;
  };
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), roomMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  scene.add(wall(12, 6, [0, 3, -6], 0)); // back
  scene.add(wall(12, 6, [-6, 3, 0], Math.PI / 2)); // left
  scene.add(wall(12, 6, [6, 3, 0], -Math.PI / 2)); // right

  // The classic trio, sharing ONE swappable BRDF material.
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(1.05, 48, 32));
  sphere.position.set(-2.4, 1.05, -1.2);
  // parallelepiped: a cuboid sheared so its faces are parallelograms.
  const boxGeo = new THREE.BoxGeometry(1.5, 1.8, 1.4);
  boxGeo.applyMatrix4(new THREE.Matrix4().makeShear(0.35, 0, 0, 0, 0.2, 0));
  const box = new THREE.Mesh(boxGeo);
  box.position.set(0.4, 0.9, 0.6);
  box.rotation.y = -0.5;
  const tetra = new THREE.Mesh(new THREE.TetrahedronGeometry(1.25));
  tetra.position.set(2.6, 0.9, -1.0);
  tetra.rotation.y = 0.6;
  const objects = [sphere, box, tetra];
  for (const o of objects) scene.add(o);

  // applyMaterial(): recreate the shared material for the current model +
  // roughness (three can't change material TYPE in place) and assign it to
  // every object, disposing the previous one.
  let brdfMat = null;
  function applyMaterial() {
    const next = model.lobeModel === 'ggx'
      ? new THREE.MeshStandardMaterial({ color: BASE_COLOR, roughness: model.roughness, metalness: 0.2 })
      : new THREE.MeshPhongMaterial({ color: BASE_COLOR, specular: 0xffffff, shininess: phongShininess(model.roughness) });
    for (const o of objects) o.material = next;
    if (brdfMat) brdfMat.dispose();
    brdfMat = next;
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

  // Observer orbit camera framing: back and up, looking at the room's middle.
  const cam = makeOrbitCamera({
    camera,
    render: render3d,
    home: { eye: [5.5, 4.2, 8], target: [0, 1, -0.5] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  resizeMain();
  update();
  return { model, sliders, panel: table, cam, input: cam };
}
