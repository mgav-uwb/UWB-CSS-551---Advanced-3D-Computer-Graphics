// quat-slerp: blending two orientations. The start is the identity q1 = (0,0,0,1); the end q2 is a
// rotation about y by `endAngle`. The scene shows the six-color cube at the blended orientation
// (solid), wireframe ghosts of the start and end poses, a dotted trail of one corner at
// t = 0, 0.1, ..., 1 under the CURRENT method (even dots = constant speed), and a gold rotation
// axis. A corner overlay draws the 4D picture: the unit circle in the plane through q1 and q2,
// with the short arc, the chord, and the current slerp / nlerp / raw-lerp points.
// All rotation math comes from lib/core/rot-reps.js (slerp, nlerp, lerpRaw, quatToMatrix, ...).
// The overlay is inline SVG, not a canvas: lib.css forces every <canvas> in a demo-full slide to
// 600 px tall, and the smoke test needs the three.js canvas to be the first canvas.
import * as THREE from '../vendor/three.module.js';
import {
  slerp, nlerp, lerpRaw, quatToMatrix, quatToAxisAngle, quatFromAxisAngle,
  quatDot, quatLen, quatNeg, quatNormalize, quatMul, quatConj, rotate,
} from '../core/rot-reps.js';
import { SliderRow, ButtonRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';
import { makeModelPicker, makeShapeSwapper } from '../core/model-picker.js';
import { withAircraftCredit } from '../core/aircraft.js';

const AXIS_COLOR = 0xffd166;
const FACE_COLORS = [0xff5555, 0xff9955, 0x55ff88, 0x55ffee, 0x5588ff, 0xcc55ff];
const METHOD_COLOR = { slerp: '#4da3ff', nlerp: '#5fd38d', lerp: '#ffb454' };
const LONG_COLOR = '#ff6b6b';
const CORNER = [0.5, 0.5, 0.5];
const LABEL_CORNER = [-0.85, -0.7, 0.85]; // labels sit outside a corner away from the trail
const TRAIL_STEPS = 10;
const PLAY_MS = 2000;
const Q1 = [0, 0, 0, 1];

const PARAMS = {
  t: { label: 't', min: 0, max: 1, step: 0.01, value: 0.5, format: (v) => v.toFixed(2) },
  endAngle: { label: 'end', min: 0, max: 360, step: 1, value: 120, format: (v) => `${v.toFixed(0)}°` },
};
const TOKENS = ['method', 'flip', 'play', 'arc', 'model'];

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A cube turning from a start orientation q1 (identity, gray wireframe) to an end orientation q2
  (a turn about the y axis by the "end" angle, white wireframe). The solid cube is the blend at
  parameter <b>t</b> (0 = start, 1 = end). The white dots are where one corner sits for
  t = 0, 0.1, ..., 1 under the chosen method; the gold line is the axis of the blended rotation.
  The small diagram in the corner is the 4D picture (below).</p>
  <h4>The idea</h4>
  <p>A unit quaternion has four numbers and length 1, so it is a point on a sphere in four
  dimensions. The two quaternions q1 and q2 span a flat plane through the sphere's center; the
  sphere cuts that plane in a circle, and the diagram draws that circle.</p>
  <p><b>Omega</b> is the angle on that circle between q1 and q2, with cos Omega = q1 · q2 (the dot
  product: multiply matching components and add). A quaternion angle Omega is a turn of
  2 Omega, which is why the cube turns twice as far as the circle point moves.</p>
  <p><b>Slerp</b> (spherical linear interpolation) walks the <b>great arc</b> (the shortest path
  on the sphere, a piece of the circle) at constant speed:
  q(t) = [sin((1-t) Omega) q1 + sin(t Omega) q2] / sin Omega. Equal steps in t give equal steps of
  turning, so the corner dots are evenly spaced.</p>
  <p><b>Nlerp</b> (normalized lerp) takes the straight-line blend (1-t) q1 + t q2, the chord, and
  scales it back to length 1 (pushes it out to the circle along its ray from the center). It
  follows the same arc as slerp but speeds up in the middle: the dots bunch near the ends.</p>
  <p><b>Lerp</b> without normalizing leaves the sphere: its length is below 1 in the middle (0.866
  at t = 0.5 for the default). A vector of length other than 1 is not a rotation; the matrix built
  from it scales the cube (watch it shrink).</p>
  <p><b>The double cover:</b> q and -q give the same rotation matrix, so each orientation has two
  quaternions, opposite points on the sphere. From q1, one of q2 and -q2 is the near point and the
  other the far one. If q1 · q2 &lt; 0, blending toward q2 itself travels the long way (more than
  90° on the circle, more than 180° of turning). The sign check flips q2 to -q2 when q1 · q2 &lt; 0,
  which picks the near copy.</p>
  <h4>Try this</h4>
  <p>1. Defaults (end 120°, slerp, t = 0.5): q(t) = (0, 0.500, 0, 0.866), |q| = 1, turned so far 60°.
  Press Play and watch the corner dots: they are evenly spaced.</p>
  <p>2. Click <b>nlerp</b>, set t = 0.25: turned 27.8° (slerp gives 30.0°). The dots now bunch at
  the ends. The end pose is the same; only the speed differs.</p>
  <p>3. Click <b>lerp</b>, t = 0.5: q = (0, 0.433, 0, 0.750), |q| = 0.866, "not a rotation": the
  cube is visibly smaller.</p>
  <p>4. Tick "use -q2 as the end" and untick "sign check": q1 · q2 = -0.5 and the cube swings 240°
  the other way to reach the same final pose. Re-tick the sign check: back to the 120° short way.</p>
  <p>5. Set end to 300° (q1 · q2 = -0.866 with no flip at all): with the sign check off the cube
  swings the long way (300°); with it on, it turns 60° the other direction. Same final pose.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const f2 = (v) => v.toFixed(2);
const f3 = (v) => v.toFixed(3);

function makeLabel(THREE_, text, color) {
  const c = document.createElement('canvas');
  c.width = 160; c.height = 48;
  const g = c.getContext('2d');
  g.font = 'bold 28px -apple-system, Segoe UI, Roboto, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = '#0b0c10'; g.strokeText(text, 80, 25);
  g.fillStyle = color; g.fillText(text, 80, 25);
  const tex = new THREE_.CanvasTexture(c);
  const sp = new THREE_.Sprite(new THREE_.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(0.6, 0.18, 1);
  sp.renderOrder = 10;
  return sp;
}

/** which blend path to use for a method: returns the (possibly unnormalized) quaternion at t. */
function blend(method, q2, t, signCheck) {
  if (method === 'slerp') return slerp(Q1, q2, t, { shortest: signCheck }).q;
  if (method === 'nlerp') {
    const raw = lerpRaw(Q1, signCheck && quatDot(Q1, q2) < 0 ? quatNeg(q2) : q2, t);
    return quatLen(raw) < 1e-9 ? Q1.slice() : quatNormalize(raw); // q1 = -q2 at the midpoint: undefined
  }
  return lerpRaw(Q1, signCheck && quatDot(Q1, q2) < 0 ? quatNeg(q2) : q2, t);
}

export function make(container, { stage = 'embed', controls } = {}) {
  const model = { t: PARAMS.t.value, endAngle: PARAMS.endAngle.value, method: 'slerp', useNeg: false, signCheck: true };
  const want = stage === 'full' ? new Set([...Object.keys(PARAMS), ...TOKENS]) : new Set(controls ?? []);

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

  const sc = makeScene(shell.sceneEl, { fill: true });
  const { scene } = sc;
  ({ grid, axes, render } = sc);

  // ---- scene objects
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    FACE_COLORS.map((color) => new THREE.MeshStandardMaterial({ color })),
  );
  cube.matrixAutoUpdate = false;
  scene.add(cube);

  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.0, 1.0, 1.0));
  const ghost = (color) => {
    const l = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    l.matrixAutoUpdate = false;
    scene.add(l);
    return l;
  };
  const ghost1 = ghost(0x8fa0bd);
  const ghost2 = ghost(0xffffff);
  const label1 = makeLabel(THREE, 'start q1', '#aab8d0');
  const label2 = makeLabel(THREE, 'end q2', '#ffffff');
  scene.add(label1, label2);

  const axisGeom = new THREE.BufferGeometry();
  axisGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
  const axisLine = new THREE.Line(axisGeom, new THREE.LineBasicMaterial({ color: AXIS_COLOR }));
  axisLine.frustumCulled = false;
  scene.add(axisLine);

  const trail = [];
  const dotGeom = new THREE.SphereGeometry(0.045, 8, 8);
  for (let i = 0; i <= TRAIL_STEPS; i++) {
    const d = new THREE.Mesh(dotGeom, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    scene.add(d);
    trail.push(d);
  }
  // the current-t marker: a ring-ish bigger dot on the cube's corner
  const nowDot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  scene.add(nowDot);

  // ---- rail: the object (full page, or an embed that lists 'model'), controls, then readout
  if (stage === 'full' || want.has('model')) {
    const objectCard = shell.addCard('object');
    makeModelPicker(objectCard, {
      id: 'quat-slerp-model', value: 'cube', include: ['cube'], aircraft: true,
      onChange: makeShapeSwapper([cube], { render: () => render(), ghosts: [ghost1, ghost2] }),
    });
  }
  const blendCard = shell.addCard('Blend');
  const readoutCard = shell.addCard('Readout');

  const sliders = {};
  const sliderIds = stage === 'full'
    ? Object.keys(PARAMS)
    : resolveControlIds(PARAMS, [...want].filter((c) => !TOKENS.includes(c)), 'quat-slerp');
  for (const id of sliderIds) sliders[id] = new SliderRow(blendCard, { id: `quat-slerp-${id}`, ...PARAMS[id] });

  let methodRow = null;
  if (want.has('method')) {
    methodRow = new ButtonRow(blendCard, {
      id: 'quat-slerp-method', label: 'blend',
      options: [{ value: 'slerp', label: 'slerp' }, { value: 'nlerp', label: 'nlerp' }, { value: 'lerp', label: 'lerp' }],
      value: model.method,
    });
    methodRow.onChange((v) => { model.method = v; update(); });
  }

  const checkboxes = {};
  function addCheck(id, text, checked, onChange) {
    const row = document.createElement('label');
    row.className = 'slider-row';
    row.style.cssText = 'padding:5px 10px;margin-bottom:6px;gap:8px;cursor:pointer';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.id = `quat-slerp-${id}`;
    box.checked = checked;
    box.style.accentColor = '#5cd47a';
    const span = document.createElement('span');
    span.className = 'slider-label';
    span.style.cssText = 'font-size:12px;line-height:1.25';
    span.textContent = text;
    row.append(box, span);
    blendCard.appendChild(row);
    box.addEventListener('change', () => { onChange(box.checked); box.blur(); update(); });
    checkboxes[id] = box;
  }
  if (want.has('flip')) {
    addCheck('neg', 'use -q2 as the end (same orientation)', model.useNeg, (v) => { model.useNeg = v; });
    addCheck('check', 'sign check: negate q2 when q1·q2 < 0', model.signCheck, (v) => { model.signCheck = v; });
  }

  let playBtn = null;
  let raf = 0;
  function stopPlay() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (playBtn) playBtn.textContent = 'Play t: 0 to 1';
  }
  function setT(v) {
    model.t = v;
    if (sliders.t) { sliders.t.input.value = String(v); sliders.t.readout.textContent = PARAMS.t.format(v); }
    update();
  }
  if (want.has('play')) {
    const row = document.createElement('div');
    row.style.cssText = 'margin-bottom:6px';
    playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'btn-row-btn';
    playBtn.id = 'quat-slerp-play';
    playBtn.style.cssText = 'width:100%;padding:6px';
    playBtn.textContent = 'Play t: 0 to 1';
    row.appendChild(playBtn);
    blendCard.appendChild(row);
    playBtn.addEventListener('click', () => {
      playBtn.blur();
      if (raf) { stopPlay(); return; }
      const t0 = performance.now();
      playBtn.textContent = 'Stop';
      const tick = (now) => {
        const u = Math.min(1, (now - t0) / PLAY_MS);
        setT(u);
        if (u < 1) raf = requestAnimationFrame(tick); else stopPlay();
      };
      raf = requestAnimationFrame(tick);
    });
  }

  // q gets its own table: four 3-decimal numbers plus a label do not fit beside the wider labels below
  const qCaption = document.createElement('p');
  qCaption.className = 'demo-hint';
  qCaption.style.cssText = 'font-size:12px;color:#8b93a7;margin:0 0 3px';
  qCaption.textContent = 'q = [x, y, z, w]';
  readoutCard.appendChild(qCaption);
  const qTable = new ValueTable(readoutCard, {
    rows: [{ id: 'q', label: 'q', cols: 4, className: 'row-h', format: f3 }],
  });
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'len', label: 'length |q|', format: f3, className: 'row-u' },
      { id: 'turned', label: 'turned so far', format: (v) => `${v.toFixed(1)}°`, className: 'row-v' },
      { id: 'dot', label: 'q1 · q2', format: f3, className: 'row-w' },
      { id: 'omega', label: 'Omega', format: (v) => `${v.toFixed(1)}°`, className: 'row-u' },
      { id: 'cmp', label: 'slerp, nlerp', cols: 2, format: (v) => `${v.toFixed(1)}°`, className: 'row-v' },
    ],
  });
  // compact cells: the rail is 236-270 px wide, and the 4-number quaternion row must not wrap
  for (const t of [qTable, table]) {
    for (const td of t.table.querySelectorAll('td')) {
      td.style.whiteSpace = 'nowrap';
      td.style.padding = '3px 4px';
      td.style.fontSize = '12px';
    }
    t.table.style.width = '100%';
  }
  table.table.style.marginTop = '4px';
  const status = document.createElement('p');
  status.className = 'demo-hint';
  status.style.cssText = 'font-size:12px;margin:6px 0 0;min-height:2.6em;line-height:1.3';
  readoutCard.appendChild(status);

  // ---- the 4D picture, an SVG overlay in the scene's bottom-left corner
  let arcSvg = null;
  if (want.has('arc')) {
    arcSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    arcSvg.setAttribute('viewBox', '0 0 240 224');
    arcSvg.setAttribute('width', '240');
    arcSvg.setAttribute('height', '224');
    arcSvg.id = 'quat-slerp-arc';
    arcSvg.style.cssText = 'position:absolute;left:10px;bottom:10px;pointer-events:none;'
      + 'background:rgba(14,16,22,0.88);border:1px solid #262a35;border-radius:6px;'
      + 'font:12px -apple-system,Segoe UI,Roboto,sans-serif;z-index:5';
    shell.sceneEl.appendChild(arcSvg); // after the three.js canvas
  }

  const CX = 120, CY = 114, R = 74;

  function drawArc(q2, curQ, qs, qn, ql) {
    if (!arcSvg) return;
    const d = quatDot(Q1, q2);
    const r = q2.map((v, i) => v - d * Q1[i]);
    const rl = quatLen(r);
    const e2 = rl > 1e-9 ? r.map((v) => v / rl) : [0, 1, 0, 0];
    const P = (q) => [CX + R * quatDot(q, Q1), CY - R * quatDot(q, e2)];
    const pt = (q) => P(q).map((v) => v.toFixed(1)).join(',');
    const path = (neg, shortest, n = 48) => {
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push(pt(slerp(Q1, q2, i / n, { shortest }).q));
      return pts.join(' ');
    };
    const long = !model.signCheck && d < 0;
    const [sx, sy] = P(qs), [nx, ny] = P(qn), [lx, ly] = P(ql);
    const [ax, ay] = P(q2), [bx, by] = P(quatNeg(q2)), [ox, oy] = P(Q1);
    const bEnd = P(model.signCheck && d < 0 ? quatNeg(q2) : q2);
    const dot = (x, y, c, rad = 5, extra = '') => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad}" fill="${c}" ${extra}/>`;
    const txt = (x, y, s, c = '#e7eaf0', anchor = 'middle') =>
      `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${c}" text-anchor="${anchor}" font-weight="600">${s}</text>`;
    // push a label away from the center
    const out = (q, s, c) => {
      const [x, y] = P(q);
      const dx = x - CX, dy = y - CY, n = Math.hypot(dx, dy) || 1;
      const lx2 = x + (dx / n) * 16, ly2 = y + (dy / n) * 16 + 4;
      return txt(lx2, ly2, s, c);
    };
    const cur = model.method;
    const curP = { slerp: [sx, sy], nlerp: [nx, ny], lerp: [lx, ly] }[cur];
    arcSvg.innerHTML = `
      ${txt(120, 15, 'the 4D arc, seen in its plane', '#8b93a7')}
      <circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="#3a4050" stroke-width="1.5"/>
      <line x1="${CX - R - 6}" y1="${CY}" x2="${CX + R + 6}" y2="${CY}" stroke="#262a35"/>
      <line x1="${CX}" y1="${CY - R - 6}" x2="${CX}" y2="${CY + R + 6}" stroke="#262a35"/>
      ${long ? `<polyline points="${path(false, true)}" fill="none" stroke="#7a8296" stroke-width="1.5" stroke-dasharray="4 3"/>` : ''}
      <polyline points="${path(false, model.signCheck)}" fill="none" stroke="${long ? LONG_COLOR : METHOD_COLOR.slerp}" stroke-width="${long ? 4 : 3}" stroke-linecap="round"/>
      <line x1="${ox.toFixed(1)}" y1="${oy.toFixed(1)}" x2="${bEnd[0].toFixed(1)}" y2="${bEnd[1].toFixed(1)}" stroke="${METHOD_COLOR.lerp}" stroke-width="2"/>
      <line x1="${CX}" y1="${CY}" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="${METHOD_COLOR.nlerp}" stroke-width="1" stroke-dasharray="2 3"/>
      ${dot(CX, CY, '#5a6172', 2)}
      ${dot(ox, oy, '#fff', 4)}${dot(ax, ay, '#fff', 4)}${dot(bx, by, '#fff', 4, 'fill-opacity="0.45"')}
      ${out(Q1, 'q1', '#e7eaf0')}${out(q2, 'q2', '#e7eaf0')}${out(quatNeg(q2), '-q2', '#8b93a7')}
      ${dot(lx, ly, METHOD_COLOR.lerp, cur === 'lerp' ? 6 : 4)}
      ${dot(nx, ny, METHOD_COLOR.nlerp, cur === 'nlerp' ? 6 : 4)}
      ${dot(sx, sy, METHOD_COLOR.slerp, cur === 'slerp' ? 6 : 4)}
      <circle cx="${curP[0].toFixed(1)}" cy="${curP[1].toFixed(1)}" r="9" fill="none" stroke="#fff" stroke-width="1.5"/>
      <g>
        ${dot(36, 208, METHOD_COLOR.slerp, 4)}${txt(44, 212, 'slerp', '#c9d1e0', 'start')}
        ${dot(96, 208, METHOD_COLOR.nlerp, 4)}${txt(104, 212, 'nlerp', '#c9d1e0', 'start')}
        ${dot(156, 208, METHOD_COLOR.lerp, 4)}${txt(164, 212, 'lerp', '#c9d1e0', 'start')}
      </g>`;
  }

  // ---- model -> everything
  const matOf = (q) => new THREE.Matrix4().fromArray(quatToMatrix(q));

  function update() {
    const angle = Math.min(model.endAngle, 359.9); // exactly 360 makes q2 = -q1 and slerp divides by sin(pi)
    let q2 = quatFromAxisAngle(0, 1, 0, angle);
    if (model.useNeg) q2 = quatNeg(q2);
    const d = quatDot(Q1, q2);
    const qs = blend('slerp', q2, model.t, model.signCheck);
    const qn = blend('nlerp', q2, model.t, model.signCheck);
    const ql = blend('lerp', q2, model.t, model.signCheck);
    const cur = { slerp: qs, nlerp: qn, lerp: ql }[model.method];
    const len = quatLen(cur);
    const unit = len > 1e-9 ? quatNormalize(cur) : Q1;

    // cube at the CURRENT blend; for raw lerp the matrix is built from the unnormalized quaternion
    cube.matrix.fromArray(quatToMatrix(cur));
    ghost1.matrix.fromArray(quatToMatrix(Q1));
    ghost2.matrix.fromArray(quatToMatrix(q2));
    const lp1 = rotate(quatToMatrix(Q1), LABEL_CORNER);
    const lp2 = rotate(quatToMatrix(q2), LABEL_CORNER);
    label1.position.set(lp1[0], lp1[1], lp1[2]);
    label2.position.set(lp2[0], lp2[1], lp2[2]);

    // trail: one corner at t = 0, 0.1, ..., 1 under the current method
    for (let i = 0; i <= TRAIL_STEPS; i++) {
      const p = rotate(quatToMatrix(blend(model.method, q2, i / TRAIL_STEPS, model.signCheck)), CORNER);
      trail[i].position.set(p[0], p[1], p[2]);
      trail[i].material.color.set(METHOD_COLOR[model.method]);
    }
    const np = rotate(quatToMatrix(cur), CORNER);
    nowDot.position.set(np[0], np[1], np[2]);

    // gold axis of the blended rotation (hidden when there is no turn)
    const rel = quatToAxisAngle(quatMul(quatConj(Q1), unit));
    const pos = axisGeom.attributes.position;
    const a = rel.axis;
    pos.array.set([-a[0] * 1.7, -a[1] * 1.7, -a[2] * 1.7, a[0] * 1.7, a[1] * 1.7, a[2] * 1.7]);
    pos.needsUpdate = true;
    axisLine.visible = rel.deg > 0.05;

    // readouts
    const turnOf = (q) => (quatLen(q) > 1e-9 ? quatToAxisAngle(quatNormalize(q)).deg : 0);
    const db = model.signCheck && d < 0 ? -d : d;
    const omega = (Math.acos(clamp(db, -1, 1)) * 180) / Math.PI;
    qTable.update('q', cur);
    table.update('len', len);
    table.update('turned', rel.deg);
    table.update('dot', d);
    table.update('omega', omega);
    table.update('cmp', [turnOf(qs), turnOf(qn)]);

    let msg;
    if (model.method === 'lerp' && Math.abs(len - 1) > 5e-4) {
      msg = `|q| = ${len.toFixed(3)}: not a rotation (the matrix scales the cube)`;
    } else if (!model.signCheck && d < 0) {
      msg = `q1·q2 < 0 and no sign check: the long way, ${(360 - 2 * (Math.acos(clamp(-d, -1, 1)) * 180) / Math.PI).toFixed(0)}° total`;
    } else if (model.signCheck && d < 0) {
      msg = 'q1·q2 < 0: q2 negated, so the short way';
    } else {
      msg = 'q1·q2 ≥ 0: the short way';
    }
    status.textContent = msg;
    status.style.color = (!model.signCheck && d < 0) || msg.startsWith('|q|') ? '#ff7b72' : '#8b93a7';

    drawArc(q2, cur, qs, qn, ql);
    render();
  }

  for (const id of sliderIds) {
    sliders[id].onInput((v) => {
      if (id === 't') stopPlay();
      model[id] = v;
      update();
    });
  }

  const cam = makeOrbitCamera({
    camera: sc.camera,
    render,
    home: { eye: [2.4, 3.0, 4.6], target: [0, 0, 0] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  update();
  return { model, sliders, cam, input: cam, checkboxes, methodRow };
}
