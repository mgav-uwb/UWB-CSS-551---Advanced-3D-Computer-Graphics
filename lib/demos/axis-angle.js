// axis-angle: the S03 rotation cockpit. ONE model {axX, axY, axZ, angle}, a
// controller of SliderRows, and a view built from OUR axisAngleMatrix: a
// marked cube (distinct face colors, matrixAutoUpdate=false: the model
// drives the matrix, never the other way around) spun about a persistent
// two-sided arrow through the origin, plus a cockpit showing the equivalent
// quaternion (quatFromAxisAngle) and the 4x4 R (Mat4Panel). Full stage adds a
// "trace path" toggle: dots marking one cube corner's path as angle changes.
// Uses axisAngleMatrix/quatFromAxisAngle from xform.js, no new rotation math
// here.
//
// Two teaching layers (checkboxes in the full stage; data-controls tokens
// `rodrigues` and `halfangle` in an embed):
//   Rodrigues: the worked probe vector v = (1, 0.6, 0.3) split into v-par (the
//     part along n, frozen) and v-perp (the part that turns), the helper
//     w = n x v, the circle v's tip sweeps, and v' = cos t v + (1 - cos t)(v.n)n
//     + sin t (n x v), cross-checked against R v.
//   Half angle: two dials (an SVG inset in the rail), the turn t and
//     q = (cos t/2, sin t/2); at t = 360 the cube is home but q = -identity.
//
// Mounted into the shared demo-shell (scene-dominant layout + "?"/"⚙"/legend)
// and driven by the free-look orbit camera (drag orbit, scroll zoom, WASD
// fly), per the mvc-transform template. The demo's own controls (sliders +
// trace toggle) live in rail cards; "⚙" holds ONLY view/nav knobs (speeds +
// grid/axes toggles).
import * as THREE from '../vendor/three.module.js';
import { axisAngleMatrix, quatFromAxisAngle, cross, dot, normalize } from '../core/xform.js';
import { rotate } from '../core/rot-reps.js';
import { SliderRow, Mat4Panel, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';
import { makeModelPicker, pickerWanted, makeShapeSwapper } from '../core/model-picker.js';
import { withAircraftCredit } from '../core/aircraft.js';

const ORIGIN = new THREE.Vector3(0, 0, 0);
const AXIS_COLOR = 0xffd166; // gold: distinct from every cube face color
const TRACE_COLOR = 0xe7eaf0; // near-white: distinct from axis + faces
const ARROW_LEN = 1.8;
const TRACE_CAP = 150;

// BoxGeometry material array order is [+x, -x, +y, -y, +z, -z]: six
// distinct, legible colors so the cube's orientation is always readable.
const FACE_COLORS = [0xff5555, 0xff9955, 0x55ff88, 0x55ffee, 0x5588ff, 0xcc55ff];

// Order here is also the "full stage" slider order, and axis-angle's first
// slider (axX) is what tools/test-demos.mjs drives as the platform smoke
// test: dragging it from its default (0) changes the rotation axis (and
// therefore R, the quaternion, and the rendered pixels) since the default
// angle (30) is non-zero.
const PARAMS = {
  axX: { label: 'axX', min: -1, max: 1, step: 0.05, value: 0, format: (v) => v.toFixed(2) },
  axY: { label: 'axY', min: -1, max: 1, step: 0.05, value: 1, format: (v) => v.toFixed(2) },
  axZ: { label: 'axZ', min: -1, max: 1, step: 0.05, value: 0, format: (v) => v.toFixed(2) },
  angle: { label: 'angle', min: 0, max: 360, step: 1, value: 30, format: (v) => `${v.toFixed(0)}°` },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const V = [1, 0.6, 0.3]; // the lecture's worked probe vector
const COLORS = { v: 0xffffff, par: 0xffd166, perp: 0xff9f43, w: 0xb084ff, vp: 0x4dd9ff };

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A cube turned by an <b>angle</b> about a gold <b>axis</b> (a unit
  vector n through the origin). The readout shows the same rotation two ways:
  the quaternion <code>q [x,y,z,w]</code> = (sin(θ/2)·n, cos(θ/2)) and the
  4x4 matrix R, whose columns are where the x, y, z axes land.</p>
  <p>With <b>Rodrigues construction</b> on, a probe vector v = (1, 0.6, 0.3)
  is split and turned by hand: <b>v-par</b> (gold) is the part of v along n,
  (v·n)n, which does not move; <b>v-perp</b> (orange) = v − v-par is the part
  perpendicular to n, which turns; <b>w = n×v</b> (purple) is the cross
  product, perpendicular to both n and v, with the same length as v-perp. The
  turned vector <b>v′</b> (cyan) = cos θ·v + (1 − cos θ)(v·n)n + sin θ·(n×v).
  The circle is the path v's tip sweeps; the bright arc runs from v to v′.</p>
  <h4>The idea</h4>
  <p>v-par stays put. v-perp and w span the plane the tip circles in: v-perp is the
  "cos" direction and w is the "sin" direction, so v′ = v-par + cos θ·v-perp +
  sin θ·w. This is Rodrigues' formula, and it equals R v (checked in code).</p>
  <p>The <b>half angle</b>: the quaternion stores θ/2, not θ. Its dial
  shows the point (w, |x,y,z|) = (cos θ/2, sin θ/2) on a unit circle: the cube
  turns θ while q turns θ/2. At θ = 360 the cube is home, but q has gone
  half way around to (−1, 0), i.e. q = −identity. q and −q give the same
  rotation: the <b>double cover</b> (two quaternions per rotation).</p>
  <h4>Try this</h4>
  <p>1. Default (axis 0,1,0, angle 30): R columns (0.866, 0, −0.5),
  (0, 1, 0), (0.5, 0, 0.866); q = (0, 0.259, 0, 0.966); v·n = 0.6,
  v-par = (0, 0.6, 0), v-perp = (1, 0, 0.3), w = (0.3, 0, −1),
  v′ = (1.016, 0.6, −0.240).</p>
  <p>2. Angle 90: column 0 = (0, 0, −1), q = (0, 0.707, 0, 0.707); v′ =
  (0.3, 0.6, −1) = v-par + w. Angle 180: q's scalar part = 0 and v′ =
  (−1, 0.6, −0.3).</p>
  <p>3. Angle 360: the cube is home and R is the identity, but q = (0, 0, 0, −1).
  Tilt the axis (try 1, 1, 0) and note v-par changes but the dials do not.
  Drag to orbit; scroll to zoom.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;


// A small text sprite (label in the 3D scene): canvas texture, drawn over
// everything (depthTest off), sized so the glyphs read at about 18 px.
function makeLabel(text, colorHex) {
  const cv = document.createElement('canvas');
  const g = cv.getContext('2d');
  const font = 'bold 36px system-ui, sans-serif';
  g.font = font;
  const wpx = Math.ceil(g.measureText(text).width) + 16;
  cv.width = wpx;
  cv.height = 64;
  g.font = font;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 6;
  g.strokeStyle = 'rgba(12,16,24,0.9)';
  g.strokeText(text, wpx / 2, 34);
  g.fillStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
  g.fillText(text, wpx / 2, 34);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set((wpx / 64) * 0.27, 0.27, 1);
  sp.renderOrder = 20;
  sp.visible = false;
  return sp;
}

// The half-angle inset: two dials in one SVG. Left: the turn theta (needle at
// theta). Right: q = (w, |x,y,z|) = (cos theta/2, sin theta/2) on a unit
// circle (needle at theta/2), identity (1,0) and minus identity (-1,0) marked.
function makeDials(card) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 220 176');
  svg.setAttribute('width', '100%');
  svg.style.display = 'block';
  svg.style.maxWidth = '260px';
  const el = (tag, attrs, parent = svg) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    parent.appendChild(e);
    return e;
  };
  const txt = (x, y, str, { fill = '#cfd6e4', size = 10, anchor = 'middle', weight = 'normal' } = {}) => {
    const t = el('text', { x, y, fill, 'font-size': size, 'text-anchor': anchor, 'font-weight': weight, 'font-family': 'system-ui, sans-serif' });
    t.textContent = str;
    return t;
  };
  const R = 36;
  const L = { x: 56, y: 88 };
  const Q = { x: 164, y: 88 };
  const CYAN = '#4dd9ff';
  const GOLD = '#ffd166';
  const GRID = '#4a5366';

  txt(L.x, 12, 'the turn θ', { weight: 'bold' });
  txt(Q.x, 12, 'q: (w, |x,y,z|)', { weight: 'bold' });
  txt(Q.x, 25, '= (cos θ/2, sin θ/2)', { size: 10.5 });

  // left dial
  el('circle', { cx: L.x, cy: L.y, r: R, fill: 'none', stroke: GRID, 'stroke-width': 1.5 });
  el('line', { x1: L.x - R, y1: L.y, x2: L.x + R, y2: L.y, stroke: GRID, 'stroke-width': 1 });
  el('line', { x1: L.x, y1: L.y - R, x2: L.x, y2: L.y + R, stroke: GRID, 'stroke-width': 1 });
  txt(L.x + R + 3, L.y + 3, 'home', { size: 9, anchor: 'start', fill: '#8a93a6' });
  const lArc = el('path', { d: '', fill: 'none', stroke: CYAN, 'stroke-width': 3, 'stroke-linecap': 'round' });
  const lNeedle = el('line', { x1: L.x, y1: L.y, x2: L.x + R, y2: L.y, stroke: CYAN, 'stroke-width': 2.5 });
  const lDot = el('circle', { cx: L.x + R, cy: L.y, r: 4, fill: CYAN });
  const lVal = txt(L.x, L.y + R + 16, '', { fill: CYAN, weight: 'bold' });

  // right dial
  el('circle', { cx: Q.x, cy: Q.y, r: R, fill: 'none', stroke: GRID, 'stroke-width': 1.5 });
  el('line', { x1: Q.x - R - 6, y1: Q.y, x2: Q.x + R + 6, y2: Q.y, stroke: GRID, 'stroke-width': 1 });
  el('line', { x1: Q.x, y1: Q.y + R, x2: Q.x, y2: Q.y - R - 6, stroke: GRID, 'stroke-width': 1 });
  txt(Q.x + R + 8, Q.y - 3, 'w', { size: 10, anchor: 'start', fill: '#cfd6e4', weight: 'bold' });
  txt(Q.x + 4, Q.y - R - 3, '|x,y,z|', { size: 10, anchor: 'start', fill: '#cfd6e4', weight: 'bold' });
  // identity and minus identity
  el('circle', { cx: Q.x + R, cy: Q.y, r: 5, fill: 'none', stroke: '#8a93a6', 'stroke-width': 1.2 });
  el('circle', { cx: Q.x - R, cy: Q.y, r: 5, fill: 'none', stroke: '#8a93a6', 'stroke-width': 1.2 });
  txt(Q.x + R - 2, Q.y + 16, '1', { size: 10, fill: '#8a93a6' });
  txt(Q.x - R + 2, Q.y + 16, '−1', { size: 10, fill: '#8a93a6' });
  const qArc = el('path', { d: '', fill: 'none', stroke: GOLD, 'stroke-width': 3, 'stroke-linecap': 'round' });
  const qProjW = el('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: GOLD, 'stroke-width': 1, 'stroke-dasharray': '3 2', opacity: 0.7 });
  const qProjV = el('line', { x1: 0, y1: 0, x2: 0, y2: 0, stroke: GOLD, 'stroke-width': 1, 'stroke-dasharray': '3 2', opacity: 0.7 });
  const qNeedle = el('line', { x1: Q.x, y1: Q.y, x2: Q.x + R, y2: Q.y, stroke: GOLD, 'stroke-width': 2.5 });
  const qDot = el('circle', { cx: Q.x + R, cy: Q.y, r: 4.5, fill: GOLD });
  const qVal = txt(Q.x, Q.y + R + 16, '', { fill: GOLD, weight: 'bold' });

  const note1 = txt(110, 158, '', { size: 11, fill: '#e7eaf0', weight: 'bold' });
  const note2 = txt(110, 172, '', { size: 11, fill: '#e7eaf0' });

  const arcPath = (c, deg) => {
    if (deg < 0.01) return '';
    if (deg >= 359.99) {
      return `M ${c.x + R} ${c.y} A ${R} ${R} 0 1 0 ${c.x - R} ${c.y} A ${R} ${R} 0 1 0 ${c.x + R} ${c.y}`;
    }
    const a = (deg * Math.PI) / 180;
    return `M ${c.x + R} ${c.y} A ${R} ${R} 0 ${deg > 180 ? 1 : 0} 0 ${c.x + R * Math.cos(a)} ${c.y - R * Math.sin(a)}`;
  };

  card.appendChild(svg);

  return {
    svg,
    update(deg) {
      const a = (deg * Math.PI) / 180;
      const lx = L.x + R * Math.cos(a);
      const ly = L.y - R * Math.sin(a);
      lNeedle.setAttribute('x2', lx);
      lNeedle.setAttribute('y2', ly);
      lDot.setAttribute('cx', lx);
      lDot.setAttribute('cy', ly);
      lArc.setAttribute('d', arcPath(L, deg));
      lVal.textContent = `θ = ${deg.toFixed(0)}°`;

      const h = a / 2;
      const w = Math.cos(h);
      const sv = Math.sin(h);
      const qx = Q.x + R * w;
      const qy = Q.y - R * sv;
      qNeedle.setAttribute('x2', qx);
      qNeedle.setAttribute('y2', qy);
      qDot.setAttribute('cx', qx);
      qDot.setAttribute('cy', qy);
      qArc.setAttribute('d', arcPath(Q, deg / 2));
      qProjW.setAttribute('x1', qx); qProjW.setAttribute('y1', qy);
      qProjW.setAttribute('x2', qx); qProjW.setAttribute('y2', Q.y);
      qProjV.setAttribute('x1', qx); qProjV.setAttribute('y1', qy);
      qProjV.setAttribute('x2', Q.x); qProjV.setAttribute('y2', qy);
      qVal.textContent = `(${w.toFixed(3)}, ${sv.toFixed(3)})`;

      if (deg >= 359.5) {
        note1.textContent = 'q = −identity: the same rotation';
        note2.textContent = '(the double cover)';
      } else if (Math.abs(deg - 180) < 0.5) {
        note1.textContent = 'θ = 180°: w = 0';
        note2.textContent = 'the cube is half way round, q a quarter';
      } else {
        note1.textContent = `θ/2 = ${(deg / 2).toFixed(1)}°`;
        note2.textContent = `w = ${w.toFixed(3)}, |x,y,z| = ${sv.toFixed(3)}`;
      }
    },
  };
}

/**
 * make(container, opts)
 * opts.stage === 'full' builds all four SliderRows plus a "trace path"
 * checkbox. Otherwise opts.controls (array of param ids) selects which
 * SliderRows to build: embed stage never gets the trace toggle.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = {
    axX: PARAMS.axX.value,
    axY: PARAMS.axY.value,
    axZ: PARAMS.axZ.value,
    angle: PARAMS.angle.value,
  };
  // Zero/near-zero axis sliders must not throw to console: we clamp by
  // holding the last valid (non-degenerate) axis and surfacing an "axis ~ 0"
  // hint in the readout instead of calling axisAngleMatrix with a zero axis.
  let lastValidAxis = [model.axX, model.axY, model.axZ];
  let traceOn = false;

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
    help: { html: withAircraftCredit(HELP_HTML) },
    settings: settingsFields,
    legend: 'drag to turn · scroll zoom · WASD move · ↑/↓ up·down · Q/E roll · H home',
    nav: 'orbit',
  });

  // The three.js scene fills the shell's scene pane (fill:true) instead of a
  // fixed 400×300 box: that's what makes it scene-dominant.
  const sc = makeScene(shell.sceneEl, { fill: true });
  const { scene } = sc;
  ({ grid, axes, render } = sc);

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    FACE_COLORS.map((color) => new THREE.MeshStandardMaterial({ color })),
  );
  cube.matrixAutoUpdate = false;
  scene.add(cube);

  // the shared model picker (full page, or an embed that lists 'model'): the stand-in cube can be
  // any simple shape or classic; the transform and every readout are the same for all of them
  const picker = pickerWanted(stage, controls);
  if (picker.show) {
    const shapeCard = shell.addCard('object');
    makeModelPicker(shapeCard, { id: 'axis-angle-model', value: 'cube', aircraft: true, onChange: makeShapeSwapper([cube], { color: 0x6094d2, render: () => render() }) });
  }

  // Rail cards: the controller (axis/angle sliders + trace toggle) and the
  // readout (quaternion table + Mat4Panel + degenerate-axis hint).
  const rotationCard = shell.addCard('Rotation');
  const readoutCard = shell.addCard('Readout');

  // layer tokens are not slider ids: peel them off before resolving sliders
  const LAYER_TOKENS = ['rodrigues', 'halfangle'];
  const tokens = picker.controls || [];
  const wantRod = stage === 'full' || tokens.includes('rodrigues');
  const wantHalf = stage === 'full' || tokens.includes('halfangle');
  const layered = stage !== 'full' && (wantRod || wantHalf);
  const ids = stage === 'full'
    ? Object.keys(PARAMS)
    : resolveControlIds(PARAMS, tokens.filter((t) => !LAYER_TOKENS.includes(t)), 'axis-angle');
  const layerOn = { rod: wantRod, half: wantHalf };
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(rotationCard, { id: `axis-angle-${id}`, ...PARAMS[id] });
  }

  function addCheckbox(id, text, checked, onChange) {
    const row = document.createElement('label');
    row.className = 'slider-row';
    row.style.padding = '4px 12px';
    row.style.marginBottom = '4px';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = id;
    box.checked = checked;
    const span = document.createElement('span');
    span.className = 'slider-label';
    span.textContent = text;
    row.append(box, span);
    rotationCard.appendChild(row);
    box.addEventListener('change', () => onChange(box.checked));
    return box;
  }
  if (stage === 'full') {
    addCheckbox('axis-angle-trace', 'trace path', false, (on) => {
      traceOn = on;
      if (!traceOn) clearTrace();
      update();
    });
    addCheckbox('axis-angle-rodrigues', 'Rodrigues construction', true, (on) => {
      layerOn.rod = on;
      update();
    });
    addCheckbox('axis-angle-halfangle', 'half angle (q)', true, (on) => {
      layerOn.half = on;
      update();
    });
  }

  const quatTable = new ValueTable(readoutCard, {
    rows: [{ id: 'q', label: 'q [x,y,z,w]', cols: 4, className: 'row-h', format: (v) => v.toFixed(3) }],
  });
  const matPanel = new Mat4Panel(readoutCard);
  const compact = (table) => {
    table.style.fontSize = '11px';
    for (const td of table.querySelectorAll('td')) {
      td.style.whiteSpace = td.classList.contains('value-label') ? 'normal' : 'nowrap';
      td.style.padding = '4px 3px';
      td.style.overflowWrap = 'normal';
    }
  };
  compact(quatTable.table);
  // A layered embed trades the 4x4 panel for the layer's own readout so the
  // 270 px rail stays inside 600 px (the matrix is still in the sandbox).
  if (layered) matPanel.table.style.display = 'none';
  // the Rodrigues layer comes before quaternions in the deck: no q row there
  if (layered && !wantHalf) quatTable.table.style.display = 'none';
  const hintEl = document.createElement('p');
  hintEl.className = 'demo-hint';
  hintEl.style.color = '#ff7b72';
  hintEl.style.fontSize = '12px';
  hintEl.style.margin = '6px 0 0';
  readoutCard.appendChild(hintEl);

  // Rodrigues card: the probe-vector decomposition, five rows.
  let rodCard = null;
  let rodTable = null;
  if (wantRod) {
    rodCard = shell.addCard('Rodrigues, v = (1, 0.6, 0.3)');
    const f3 = (x) => x.toFixed(3);
    rodTable = new ValueTable(rodCard, {
      rows: [
        { id: 'vn', label: 'v·n', format: f3 },
        { id: 'par', label: 'v-par', cols: 3, className: 'row-h', format: f3 },
        { id: 'perp', label: 'v-perp', cols: 3, className: 'row-u', format: f3 },
        { id: 'w', label: 'w = n×v', cols: 3, className: 'row-v', format: f3 },
        { id: 'vp', label: 'v′', cols: 3, className: 'row-w', format: f3 },
      ],
    });
    compact(rodTable.table);
  }

  // Half-angle card: SVG inset (after the three.js canvas in the DOM; SVG so
  // the deck's `[data-demo] canvas` sizing rule cannot stretch it).
  let halfCard = null;
  let dials = null;
  if (wantHalf) {
    halfCard = shell.addCard('the cube turns θ, q turns θ/2');
    dials = makeDials(halfCard);
  }

  const labels = {};
  if (wantRod) {
    labels.v = makeLabel('v', COLORS.v);
    labels.par = makeLabel('v-par', COLORS.par);
    labels.perp = makeLabel('v-perp', COLORS.perp);
    labels.w = makeLabel('w = n×v', COLORS.w);
    labels.vp = makeLabel('v′', COLORS.vp);
    for (const sp of Object.values(labels)) scene.add(sp);
  }

  let axisGroup = null;
  let rodGroup = null;
  let traceGroup = null;
  let traceCount = 0;

  function clearAxisArrow() {
    if (axisGroup) {
      scene.remove(axisGroup);
      axisGroup.children.forEach((a) => a.dispose());
      axisGroup = null;
    }
  }

  function clearTrace() {
    if (traceGroup) {
      scene.remove(traceGroup);
      traceGroup.children.forEach((o) => {
        o.geometry?.dispose();
        o.material?.dispose();
      });
      traceGroup = null;
    }
    traceCount = 0;
  }

  // Guard: returns a non-degenerate [x, y, z] axis to feed axisAngleMatrix /
  // quatFromAxisAngle, holding the last valid axis (and flagging the hint)
  // when the sliders currently sit at (or within 1e-8 of) zero.
  function effectiveAxis() {
    const raw = [model.axX, model.axY, model.axZ];
    if (Math.hypot(...raw) < 1e-8) {
      hintEl.textContent = 'axis ~ 0: holding last valid axis';
      return lastValidAxis;
    }
    hintEl.textContent = '';
    lastValidAxis = raw;
    return raw;
  }

  function update() {
    const [ex, ey, ez] = effectiveAxis();
    const R = axisAngleMatrix(ex, ey, ez, model.angle);
    const q = quatFromAxisAngle(ex, ey, ez, model.angle);

    cube.matrix.fromArray(R);
    quatTable.update('q', q);
    matPanel.update(R);

    clearAxisArrow();
    const dir = new THREE.Vector3(ex, ey, ez).normalize();
    axisGroup = new THREE.Group();
    axisGroup.add(new THREE.ArrowHelper(dir, ORIGIN, ARROW_LEN, AXIS_COLOR));
    axisGroup.add(new THREE.ArrowHelper(dir.clone().negate(), ORIGIN, ARROW_LEN, AXIS_COLOR));
    scene.add(axisGroup);

    if (traceOn) {
      if (!traceGroup) {
        traceGroup = new THREE.Group();
        scene.add(traceGroup);
      }
      if (traceCount < TRACE_CAP) {
        const corner = new THREE.Vector3(0.5, 0.5, 0.5).applyMatrix4(new THREE.Matrix4().fromArray(R));
        const dot = new THREE.Mesh(
          new THREE.SphereGeometry(0.03, 6, 6),
          new THREE.MeshBasicMaterial({ color: TRACE_COLOR }),
        );
        dot.position.copy(corner);
        traceGroup.add(dot);
        traceCount++;
      }
    }

    updateRodrigues(ex, ey, ez, R);
    if (dials) {
      halfCard.style.display = layerOn.half ? '' : 'none';
      dials.update(model.angle);
    }
    render();
  }

  // Rodrigues layer on: the cube turns into a ghost so the construction shows through.
  function setCubeGhost(ghost) {
    const mats = Array.isArray(cube.material) ? cube.material : [cube.material];
    for (const m of mats) {
      m.transparent = ghost;
      m.opacity = ghost ? 0.25 : 1;
      m.depthWrite = !ghost;
      m.needsUpdate = true;
    }
  }

  function clearRod() {
    if (!rodGroup) return;
    scene.remove(rodGroup);
    rodGroup.traverse((o) => {
      o.geometry?.dispose();
      o.material?.dispose();
    });
    rodGroup = null;
  }

  function updateRodrigues(ex, ey, ez, R) {
    if (!wantRod) return;
    clearRod();
    const on = layerOn.rod;
    setCubeGhost(on);
    rodCard.style.display = on ? '' : 'none';
    for (const sp of Object.values(labels)) sp.visible = false;
    if (!on) return;

    const n = normalize([ex, ey, ez]);
    const th = (model.angle * Math.PI) / 180;
    const c = Math.cos(th);
    const s = Math.sin(th);
    const vn = dot(V, n);
    const par = n.map((x) => vn * x);
    const perp = V.map((x, i) => x - par[i]);
    const w = cross(n, V);
    const vp = V.map((x, i) => c * x + (1 - c) * par[i] + s * w[i]);
    // dev assertion: Rodrigues by hand must equal the matrix applied to v
    const rv = rotate(R, V);
    console.assert(rv.every((x, i) => Math.abs(x - vp[i]) < 1e-9), 'axis-angle: Rodrigues != R v', vp, rv);

    rodTable.update('vn', vn);
    rodTable.update('par', par);
    rodTable.update('perp', perp);
    rodTable.update('w', w);
    rodTable.update('vp', vp);

    rodGroup = new THREE.Group();
    const O = [0, 0, 0];
    const arrow = (key, from, vec, color, at = 'tip', center = [0, 0.5]) => {
      const len = Math.hypot(...vec);
      if (len < 1e-3) return;
      const dir = new THREE.Vector3(...vec).normalize();
      const head = Math.min(0.14, len * 0.4);
      const a = new THREE.ArrowHelper(dir, new THREE.Vector3(...from), len, color, head, head * 0.45);
      for (const m of [a.line.material, a.cone.material]) {
        m.depthTest = false; // x-ray: stays visible inside/behind the cube
        m.transparent = true;
      }
      a.line.renderOrder = a.cone.renderOrder = 10;
      rodGroup.add(a);
      const f = at === 'mid' ? 0.5 : 1;
      const pos = from.map((x, i) => x + f * vec[i]);
      labels[key].position.set(...pos);
      labels[key].center.set(...center);
      labels[key].visible = true;
    };
    arrow('par', O, par, COLORS.par, 'mid', [1.15, 0.5]);
    arrow('perp', par, perp, COLORS.perp, 'mid', [0.5, 1.4]);
    arrow('w', par, w, COLORS.w, 'tip', [0.5, -0.4]);
    arrow('v', O, V, COLORS.v, 'tip', [0.5, -0.4]);
    arrow('vp', O, vp, COLORS.vp, 'tip', [-0.1, 0.5]);

    // the circle v's tip sweeps: centre v-par, radius |v-perp|, plane normal n
    const r = Math.hypot(...perp);
    if (r > 1e-3) {
      const pt = (phi) => new THREE.Vector3(
        par[0] + Math.cos(phi) * perp[0] + Math.sin(phi) * w[0],
        par[1] + Math.cos(phi) * perp[1] + Math.sin(phi) * w[1],
        par[2] + Math.cos(phi) * perp[2] + Math.sin(phi) * w[2],
      );
      const full = [];
      for (let i = 0; i <= 96; i++) full.push(pt((i / 96) * 2 * Math.PI));
      const ring = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(full),
        new THREE.LineBasicMaterial({ color: 0x8a93a6, depthTest: false, transparent: true, opacity: 0.8 }),
      );
      ring.renderOrder = 9;
      rodGroup.add(ring);
      if (th > 1e-3) {
        const k = Math.max(2, Math.ceil((th / (2 * Math.PI)) * 96));
        const pts = [];
        for (let i = 0; i <= k; i++) pts.push(pt((i / k) * th));
        const arc = new THREE.Mesh(
          new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), k * 2, 0.018, 6, false),
          new THREE.MeshBasicMaterial({ color: COLORS.vp, depthTest: false }),
        );
        arc.renderOrder = 11;
        rodGroup.add(arc);
      }
    }
    scene.add(rodGroup);
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      // Rotation-axis changes invalidate any in-progress trace (per spec:
      // cleared on any axis change or toggle-off); an angle-only change is
      // exactly what the trace is meant to accumulate.
      if (id !== 'angle') clearTrace();
      update();
    });
  }

  // Free-look orbit camera: framed like the old fixed camera (eye (3,3,6),
  // looking at the origin): the demo never set a custom camera, so this
  // matches scene-shell's previous default. Home restores that view.
  const cam = makeOrbitCamera({
    camera: sc.camera,
    render,
    home: wantRod
      ? { eye: [1.9, 1.6, 3.0], target: [0.35, -0.3, 0] } // tight on the construction, which sits a little above centre
      : { eye: [2.6, 2.3, 4.4], target: [0, 0.3, 0] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  // Sandbox: the rail is long (sliders, readouts, Rodrigues, dials), so split it
  // into two columns instead of scrolling. Embeds keep the single column.
  if (stage === 'full' && (wantRod || wantHalf)) {
    const rail = rotationCard.parentElement;
    rail.style.flex = '0 0 480px';
    rail.style.flexDirection = 'row';
    rail.style.alignItems = 'flex-start';
    const col = () => {
      const d = document.createElement('div');
      d.style.cssText = 'flex:1;min-width:0;display:flex;flex-direction:column;gap:9px';
      rail.appendChild(d);
      return d;
    };
    const left = col();
    const right = col();
    const first = rail.querySelector('.demo-shell-card');
    if (first !== rotationCard) left.appendChild(first); // the model picker
    left.appendChild(rotationCard);
    left.appendChild(halfCard);
    right.appendChild(readoutCard);
    right.appendChild(rodCard);
  }

  update();
  return { model, sliders, panel: matPanel, cam, input: cam, layers: layerOn };
}
