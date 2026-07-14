// view-matrix: the thesis demo — glass cockpit for the hand-built view matrix.
// ONE model {az, el, dist} (azimuth, elevation degrees, eye-to-target
// distance) for the SUBJECT camera, whose hand-built view matrix V feeds a
// Mat4Panel readout (u/v/w rows colored) and, on the full stage, three
// ArrowHelpers at the eye showing the basis lookAtBasis built.
//
// TWO cameras, kept deliberately independent: the SUBJECT camera above (its
// V is DISPLAY ONLY — it never touches three.js's render camera) and the
// OBSERVER — a free-look orbit-camera that owns the actual render camera, so
// the viewer can fly around and inspect the scene from outside while the
// subject's az/el/dist sliders keep driving the matrix readout on their own.
//
// Mounted into the shared demo-shell (scene-dominant layout + "?"/"⚙"/legend)
// — see mvc-transform.js for the template this follows.
import * as THREE from '../vendor/three.module.js';
import { lookAtBasis } from '../core/xform.js';
import { SliderRow, Mat4Panel } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const D = Math.PI / 180;
const AT = [0, 0.5, 0];
const UP = [0, 1, 0];

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Elevation stays inside ±80° so up (world +Y) never lines up with the
// eye-at direction — lookAtBasis throws on that degenerate case by design;
// this demo must never hit it.
const PARAMS = {
  az: { label: 'az', min: 0, max: 360, step: 1, value: 35, format: (v) => `${v.toFixed(0)}°` },
  el: { label: 'el', min: -80, max: 80, step: 1, value: 20, format: (v) => `${v.toFixed(0)}°` },
  dist: { label: 'dist', min: 3, max: 14, step: 0.1, value: 7, format: (v) => v.toFixed(1) },
};

// The brainstorm mock's scene: 3 boxes of varying height on the scene-shell's grid.
const BOXES = [
  { x: -1.6, z: -0.8, color: 0xcc5544, h: 1.4 },
  { x: 1.4, z: 0.6, color: 0x4477cc, h: 2.2 },
  { x: 0.2, z: -2.0, color: 0x44aa66, h: 0.9 },
];

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A 3D scene plus the live 4×4 view matrix, with its <code>u</code>/<code>v</code>/<code>w</code>
  basis rows colored.</p>
  <h4>The concept</h4>
  <p>The view matrix is the INVERSE of the camera's placement in the world: it
  moves the whole world into the camera's own frame, so the camera sits at the
  origin looking down its axis.</p>
  <h4>The math</h4>
  <p>Rows <code>u</code>, <code>v</code>, <code>w</code> are the camera's
  right/up/back basis vectors; the translation column is
  <code>−(eye·u, eye·v, eye·w)</code>.</p>
  <h4>Try this</h4>
  <p>Move the <code>az</code>/<code>el</code>/<code>dist</code> sliders to fly the
  subject camera (the marker + colored basis arrows in the scene) and watch the
  view-matrix rows track its <code>u</code>/<code>v</code>/<code>w</code> basis.
  Then drag to orbit the observer and inspect the gizmo from any angle; scroll to
  zoom.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

/**
 * make(container, opts)
 * opts.stage === 'full' builds all three SliderRows plus a "show basis
 * arrows" checkbox. Otherwise opts.controls (array of param ids) selects
 * which SliderRows to build — embed stage never gets the arrows toggle.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { az: PARAMS.az.value, el: PARAMS.el.value, dist: PARAMS.dist.value };
  // The subject camera is drawn in the scene as a gizmo (an eye marker + the
  // u/v/w basis arrows) so it is VISIBLE by default: moving az/el/dist visibly
  // flies the subject camera through the observer's third-person view, while
  // the Matrix panel shows the same basis as rows. (Before, arrows defaulted
  // off, so the sliders changed only the numbers — nothing in the render.)
  let showArrows = true;

  // Nav speeds (shared live object: the orbit camera and the "⚙" fields read/
  // write the SAME object) + display-toggle state, same idiom as
  // mvc-transform.js. `grid`/`axes`/`render` are assigned once the scene is
  // built below; the toggle apply() closures run only on user interaction, so
  // referencing them here is safe.
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
  const { scene } = sc;
  ({ grid, axes, render } = sc);

  for (const { x, z, color, h } of BOXES) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(1, h, 1), new THREE.MeshStandardMaterial({ color }));
    box.position.set(x, h / 2, z);
    scene.add(box);
  }

  // Rail cards: the controller (subject Camera sliders + arrows toggle) and
  // the second view (the Matrix readout).
  const cameraCard = shell.addCard('Camera');
  const matrixCard = shell.addCard('Matrix');

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'view-matrix');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(cameraCard, { id: `view-matrix-${id}`, ...PARAMS[id] });
  }

  let arrowsCheckbox;
  if (stage === 'full') {
    const row = document.createElement('label');
    row.className = 'slider-row';
    arrowsCheckbox = document.createElement('input');
    arrowsCheckbox.type = 'checkbox';
    arrowsCheckbox.id = 'view-matrix-arrows';
    arrowsCheckbox.checked = showArrows; // on by default (the gizmo is the point)
    const text = document.createElement('span');
    text.className = 'slider-label';
    text.textContent = 'show basis arrows';
    row.append(arrowsCheckbox, text);
    cameraCard.appendChild(row);
    arrowsCheckbox.addEventListener('change', () => {
      showArrows = arrowsCheckbox.checked;
      update();
    });
  }

  const panel = new Mat4Panel(matrixCard, { rowClasses: ['row-u', 'row-v', 'row-w', 'row-h'] });

  let arrowsGroup = null;

  function update() {
    const azRad = model.az * D;
    const elRad = model.el * D;
    const eye = [
      AT[0] + model.dist * Math.cos(elRad) * Math.sin(azRad),
      AT[1] + model.dist * Math.sin(elRad),
      AT[2] + model.dist * Math.cos(elRad) * Math.cos(azRad),
    ];
    const { u, v, w, V } = lookAtBasis(eye, AT, UP);

    // The subject's hand-built V is DISPLAY ONLY — it drives the Mat4Panel
    // (and the optional basis arrows below), never the render camera. The
    // render camera belongs to the observer orbit-camera, wired up after
    // this function.
    panel.update(V);

    if (arrowsGroup) {
      scene.remove(arrowsGroup);
      arrowsGroup.children.forEach((a) => {
        if (typeof a.dispose === 'function') a.dispose(); // ArrowHelper
        a.geometry?.dispose();
        a.material?.dispose();
      });
      arrowsGroup = null;
    }
    if (showArrows) {
      // The subject-camera gizmo sits AT the subject's eye: a solid marker
      // sphere plus the u/v/w basis arrows. Moving az/el/dist flies it through
      // the observer's third-person view, so the sliders visibly drive the
      // render (not just the Matrix panel), and the observer can orbit around
      // to inspect the basis from any angle.
      const eyeVec = new THREE.Vector3(...eye);
      arrowsGroup = new THREE.Group();
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 16, 12),
        new THREE.MeshStandardMaterial({ color: 0xf0f3f8, emissive: 0x223044 }),
      );
      marker.position.copy(eyeVec);
      arrowsGroup.add(marker);
      arrowsGroup.add(new THREE.ArrowHelper(new THREE.Vector3(...u), eyeVec, 1.5, 0xff7b72));
      arrowsGroup.add(new THREE.ArrowHelper(new THREE.Vector3(...v), eyeVec, 1.5, 0x7ee787));
      arrowsGroup.add(new THREE.ArrowHelper(new THREE.Vector3(...w), eyeVec, 1.5, 0x79c0ff));
      scene.add(arrowsGroup);
    }

    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
  }

  // Observer orbit camera: a WIDE third-person vantage, deliberately set back
  // from the subject camera's own orbit (which sweeps a sphere of radius
  // dist=3..14 around AT as the sliders move). If the observer sat at the
  // subject's default eye, the subject gizmo would sit exactly at the
  // observer's own position (invisible), and moving the sliders would just
  // sweep it out of frame. From here the whole subject sphere stays in view,
  // so flying the subject camera visibly moves its gizmo. Home restores this
  // framing; from there the viewer is free to fly/orbit anywhere.
  const home = {
    eye: [9, 7, 14], // ~18 units from AT, up and to the side
    target: [...AT],
  };
  const cam = makeOrbitCamera({
    camera: sc.camera,
    render,
    home,
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  update();
  return { model, sliders, panel, cam, input: cam };
}
