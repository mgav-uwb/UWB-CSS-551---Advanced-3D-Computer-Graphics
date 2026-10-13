// vec-geometry: the vector-geometry cockpit (L04 first half). Five modes, one scene, one model:
//   frame        two vectors a, b -> the orthonormal frame (w, u, t) and b's three dots
//   segment      point to segment: projected length d, foot, clamp, nearest point
//   plane        signed distance, which side, foot, and (toggle) the along/across split + reflection
//   ray          ray against the ground plane: n.d, n.o, t, hit / no hit / behind
//   barycentric  the three sub-triangle areas as weights; inside / on an edge / outside
// Every query is a dot, a cross or a sign (dot/cross/normalize/sub from xform.js); the demo draws
// the PARTS those formulas compute (the shadow, the across part, the normal part, the sub-areas).
// Pure info functions (frameInfo ... baryInfo) hold all the arithmetic, so the readouts, the
// picture and the unit test share one source of truth.
//
// Embed tokens (data-controls): mode:<name> picks the mode; "modes" shows the mode buttons;
// "reflect" shows the reflect checkbox (and starts it on); a slider id restricts the sliders.
import * as THREE from '../vendor/three.module.js';
import { dot, cross, normalize, sub } from '../core/xform.js';
import { SliderRow, ButtonRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const DEG = Math.PI / 180;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const len = (a) => Math.hypot(a[0], a[1], a[2]);

// ---------------------------------------------------------------- pure geometry

const FRAME_A = [2, 1, 0];
const FRAME_B_LEN = Math.sqrt(6);
const PARALLEL_REL = 1e-3;

/** b from its direction angles (azimuth about +y from +x toward +z, elevation above the xz plane). */
export function frameB(bAz, bEl) {
  const az = bAz * DEG, el = bEl * DEG;
  return [FRAME_B_LEN * Math.cos(el) * Math.cos(az), FRAME_B_LEN * Math.sin(el), FRAME_B_LEN * Math.cos(el) * Math.sin(az)];
}

export function frameInfo(bAz, bEl) {
  const a = FRAME_A, b = frameB(bAz, bEl);
  const c = cross(a, b);
  const crossLen = len(c);
  const rel = crossLen / (len(a) * len(b)); // sin of the angle between a and b
  const w = normalize(a);
  if (rel < PARALLEL_REL) return { a, b, w, u: null, t: null, crossLen, rel, parallel: true, coords: [dot(b, w), NaN, NaN] };
  const u = normalize(c);
  const t = normalize(cross(a, c));
  return { a, b, w, u, t, crossLen, rel, parallel: false, coords: [dot(b, w), dot(b, u), dot(b, t)] };
}

const SEG_P0 = [0, 0, 0];
const SEG_P1 = [4, 2, 0];

export function segmentInfo(qx, qy) {
  const v = sub(SEG_P1, SEG_P0);
  const L = len(v);
  const vh = normalize(v);
  const pt = [qx, qy, 0];
  const d = dot(sub(pt, SEG_P0), vh);
  const foot = add(SEG_P0, scale(vh, d));
  const inside = d >= 0 && d <= L;
  const dc = clamp(d, 0, L);
  const nearest = add(SEG_P0, scale(vh, dc));
  return { p0: SEG_P0, p1: SEG_P1, L, vh, pt, d, foot, inside, nearest,
    distLine: len(sub(pt, foot)), distSeg: len(sub(pt, nearest)) };
}

const PLANE_M = [1, 2, 2];
const PLANE_Q = [1, 0, 0];
const PLANE_N = normalize(PLANE_M);
const PLANE_D = dot(PLANE_N, PLANE_Q);
// unit tangent in the plane the incoming direction leans toward: (4,-1,-1)/sqrt(18)
const PLANE_T = normalize([4, -1, -1]);
const SIDE_EPS = 0.005;

/** Incoming unit direction at incidence angle `inc` degrees from the inward normal -n, leaning along PLANE_T. */
export function planeDir(inc) {
  const c = Math.cos(inc * DEG), s = Math.sin(inc * DEG);
  return add(scale(PLANE_N, -c), scale(PLANE_T, s));
}

export function planeInfo(P, inc) {
  const n = PLANE_N;
  const s = dot(n, P) - PLANE_D;
  const side = s > SIDE_EPS ? 'front' : s < -SIDE_EPS ? 'behind' : 'on';
  const foot = sub(P, scale(n, s));
  const d = planeDir(inc);
  const dn = dot(d, n);
  const along = scale(n, dn);
  const proj = sub(d, along);
  const refl = sub(d, scale(along, 2));
  return { n, D: PLANE_D, Q: PLANE_Q, s, side, foot, d, dn, along, proj, refl };
}

export function rayInfo(dirAngle, oy) {
  const n = [0, 1, 0], D = 0;
  const a = dirAngle * DEG;
  const d = [Math.cos(a), -Math.sin(a), 0];
  const o = [0, oy, 0];
  const nd = dot(n, d), no = dot(n, o);
  const hits = Math.abs(nd) > 1e-9; // only a ray parallel to the plane never meets it; the sign of t says ahead or behind
  const t = hits ? (D - no) / nd : NaN;
  const status = !hits ? 'nohit' : t < 0 ? 'behind' : 'hit';
  return { n, D, d, o, nd, no, t, status, hit: hits ? add(o, scale(d, t)) : null };
}

const BARY_P = [[0, 0, 0], [2, 0, 0], [0, 0, -2]];
const BARY_TOL = 1e-3;

export function baryInfo(xx, xz) {
  const [p0, p1, p2] = BARY_P;
  const x = [xx, 0, xz];
  const A = cross(sub(p1, p0), sub(p2, p0));
  const aa = dot(A, A);
  // signed area of the sub-triangle opposite each corner / the whole area
  const w0 = dot(cross(sub(p1, x), sub(p2, x)), A) / aa;
  const w1 = dot(cross(sub(p2, x), sub(p0, x)), A) / aa;
  const w2 = dot(cross(sub(p0, x), sub(p1, x)), A) / aa;
  const w = [w0, w1, w2];
  const zeros = w.filter((v) => Math.abs(v) <= BARY_TOL).length;
  const verdict = w.some((v) => v < -BARY_TOL) ? 'outside' : zeros >= 2 ? 'corner' : zeros === 1 ? 'edge' : 'inside';
  return { p: BARY_P, x, w, sum: w0 + w1 + w2, verdict };
}

// ---------------------------------------------------------------- params + help

const f1 = (v) => v.toFixed(1);
const f2 = (v) => v.toFixed(2);
const deg0 = (v) => `${v.toFixed(0)}°`;
const deg1 = (v) => `${v.toFixed(1)}°`;
const DEFAULT_EL = Math.asin(2 / Math.sqrt(6)) / DEG; // 54.7356: b = (1, 2, 1)
const DEFAULT_INC = Math.acos(7 / 9) / DEG; // 38.94: d = (1, -2, -2)/3
const DEFAULT_RAY = Math.asin(0.8) / DEG; // 53.13: d = (0.6, -0.8, 0)

const PARAMS = {
  bAz: { label: 'bAz', min: 0, max: 360, step: 1, value: 45, format: deg0 },
  bEl: { label: 'bEl', min: -90, max: 90, step: 0.1, value: DEFAULT_EL, format: deg1 },
  qx: { label: 'Pt x', min: -3, max: 9, step: 0.1, value: 1, format: f1 },
  qy: { label: 'Pt y', min: -3, max: 7, step: 0.1, value: 3, format: f1 },
  px: { label: 'px', min: -4, max: 7, step: 0.1, value: 4, format: f1 },
  py: { label: 'py', min: -3, max: 5, step: 0.1, value: 1, format: f1 },
  pz: { label: 'pz', min: -4, max: 4, step: 0.1, value: 0, format: f1 },
  inc: { label: 'incidence', min: 0, max: 85, step: 0.5, value: DEFAULT_INC, format: deg1 },
  dirAngle: { label: 'dirAngle', min: -30, max: 85, step: 0.5, value: DEFAULT_RAY, format: deg1 },
  oy: { label: 'oy', min: -3, max: 8, step: 0.1, value: 5, format: f1 },
  xx: { label: 'Xx', min: -1, max: 3, step: 0.01, value: 0.5, format: f2 },
  xz: { label: 'Xz', min: -3, max: 1, step: 0.01, value: -0.5, format: f2 },
};
const MODES = ['frame', 'segment', 'plane', 'ray', 'barycentric'];
const MODE_PARAMS = {
  frame: ['bAz', 'bEl'],
  segment: ['qx', 'qy'],
  plane: ['px', 'py', 'pz', 'inc'],
  ray: ['dirAngle', 'oy'],
  barycentric: ['xx', 'xz'],
};
const HOMES = {
  frame: { eye: [3.6, 2.8, 4.6], target: [0.7, 0.5, 0] },
  segment: { eye: [3.2, 5.2, 8.6], target: [2.8, 1.5, 0] },
  plane: { eye: [6.4, 4.2, 6.5], target: [2.7, 0.3, -0.5] },
  ray: { eye: [3.4, 5.2, 11.2], target: [3.3, 1.9, 0] },
  barycentric: { eye: [0.9, 3.9, 2.7], target: [0.9, 0, -0.9] },
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Five common geometry questions, each answered by a dot product, a cross product or a sign.
  The picture draws the pieces the formulas compute; the readout gives their numbers. Pick the
  question with the mode buttons (or the slide's embed shows one fixed mode).</p>
  <h4>Terms</h4>
  <p><b>bAz, bEl</b>: b's azimuth (about +y, from +x) and elevation (above the x-z plane), length fixed at √6. <b>incidence</b>: the angle between the reflected direction d and −n.
  <b>Frame</b>: three directions used as axes. <b>Orthonormal</b>: each has length 1 and each
  pair is at 90 degrees (dot product 0). <b>Projection (shadow)</b>: the part of a vector that lies
  along a direction, (v·n̂)n̂ for a unit n̂; what is left over is the across part, square to n̂.
  <b>Signed distance</b>: n·P − D for a plane with unit normal n and offset D = n·Q; positive in
  front (the side n points to), zero on the plane, negative behind. <b>Reflection</b>: flip the part
  of a direction along the normal, r = d − 2(d·n)n; the in-plane part is unchanged.
  <b>Ray parameter t</b>: the ray is o + t·d for t ≥ 0; it meets a plane at t = (D − n·o)/(n·d).
  <b>Barycentric weights</b>: w0, w1, w2 for a point X in a triangle, each the signed area of the
  sub-triangle OPPOSITE that corner divided by the whole area; X = w0·P0 + w1·P1 + w2·P2 and the
  weights sum to 1.</p>
  <h4>Try this</h4>
  <p><b>frame</b>: defaults give b = (1, 2, 1). Read w = (0.894, 0.447, 0), u = (0.267, −0.535,
  0.802), t = (0.359, −0.717, −0.598) and b in the frame (1.789, 0, −1.673): the dashed path walks
  b's three dots along w, u, t. Drag bAz to 0 and bEl to 26.6: b becomes parallel to a, a × b is
  zero, and the demo shows "parallel: no plane, no frame" (normalize(0) is NaN).</p>
  <p><b>segment</b>: Pt (1, 3) gives t = 2.236, foot (2, 1), inside. Pt (6, 4) gives t = 7.155 > 4.472:
  the foot (6.4, 3.2) is off the segment, the nearest point clamps to the end (4, 2). Pt (−1, 1)
  gives t = −0.447: clamp to the start (0, 0). The "to line" row is the distance to the infinite
  line (0.894 and 1.342 in the last two cases); the "to segment" row is the real nearest distance.</p>
  <p><b>plane</b>: Q = (1, 0, 0), normal m = (1, 2, 2) so n = (1/3, 2/3, 2/3) and D = 1/3. P = (4, 1, 0)
  gives n·P − D = 1.667 (in front), foot (3.444, −0.111, −1.111). Drag px to −1: P is on the plane
  (value 0, point turns white); at px = −2 the value is −0.333 and the point is behind. Tick "reflect a direction": d = (1/3, −2/3, −2/3) has
  d·n = −0.778; the normal part is drawn gold, the in-plane part cyan, the reflection pink.</p>
  <p><b>ray</b>: o = (0, 5, 0), d = (0.6, −0.8, 0) against the ground y = 0: n·d = −0.8, n·o = 5,
  t = 6.25, hit (3.75, 0, 0). Set dirAngle below 0: the ray climbs, t &lt; 0, the ground is behind the start.
  Set oy below 0 with the ray still heading down: t is negative, the hit is behind the start. Set dirAngle to 0: the ray runs level, n·d = 0, no hit.</p>
  <p><b>barycentric</b>: X = (0.5, 0, −0.5) gives (0.5, 0.25, 0.25), inside. Slide X to
  (0.67, −0.67): all three near 1/3 (the centroid). X = (1, −1): w0 = 0, on the edge P1P2. X = (2, −2):
  weights (−1, 1, 1), outside; the hatched piece is the negative one. Opacity tracks |weight|.</p>
  <p class="demo-shell-help-panel-hint">Drag to orbit; scroll to zoom. Esc, ×, or click outside to close.</p>
`;

// ---------------------------------------------------------------- drawing helpers

const V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

const COL = {
  a: 0xff7b72, b: 0x79c0ff, w: 0xffa657, u: 0x7ee787, t: 0xd2a8ff,
  white: 0xe7eaf0, gray: 0x8b93a7, gold: 0xffd166, pink: 0xff79c6, cyan: 0x56d4dd,
  front: 0xffa657, behind: 0xd2a8ff, normal: 0x7ee787, bad: 0xff7b72, warn: 0xff3b3b, ok: 0x7ee787,
  c0: 0xff7b72, c1: 0x7ee787, c2: 0x79c0ff,
};

function makeLabelSprite(text, color) {
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  const font = 'bold 30px -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 18;
  const h = 44;
  cv.width = w;
  cv.height = h;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(11,12,16,0.95)';
  ctx.strokeText(text, w / 2, h / 2 + 1);
  ctx.fillStyle = css(color);
  ctx.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.renderOrder = 20;
  sp.userData.aspect = w / h;
  return sp;
}

let hatchTex = null;
function hatchTexture() {
  if (hatchTex) return hatchTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, 32, 32);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 9;
  for (const o of [-32, 0, 32]) {
    ctx.beginPath();
    ctx.moveTo(o, 32);
    ctx.lineTo(o + 32, 0);
    ctx.stroke();
  }
  hatchTex = new THREE.CanvasTexture(cv);
  hatchTex.wrapS = hatchTex.wrapT = THREE.RepeatWrapping;
  hatchTex.colorSpace = THREE.SRGBColorSpace;
  return hatchTex;
}

/** Scene builder: collects meshes + label sprites into one group that is thrown away on every update. */
class Viz {
  constructor() {
    this.group = new THREE.Group();
    this.labels = [];
  }

  bar(from, to, color, r = 0.025, opacity = 1) {
    const d = V3(to).sub(V3(from));
    const L = d.length();
    if (L < 1e-6) return;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 8), this.mat(color, opacity));
    m.quaternion.setFromUnitVectors(Y_AXIS, d.clone().normalize());
    m.position.copy(V3(from).add(V3(to)).multiplyScalar(0.5));
    this.group.add(m);
  }

  arrow(from, to, color, { r = 0.025, head = 0.24, hr = 0.08 } = {}) {
    const d = V3(to).sub(V3(from));
    const L = d.length();
    if (L < 1e-6) return;
    const dir = d.clone().normalize();
    const hl = Math.min(head, L * 0.5);
    const mat = this.mat(color);
    const shaftL = L - hl;
    if (shaftL > 1e-6) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r, shaftL, 8), mat);
      s.quaternion.setFromUnitVectors(Y_AXIS, dir);
      s.position.copy(V3(from).addScaledVector(dir, shaftL / 2));
      this.group.add(s);
    }
    const c = new THREE.Mesh(new THREE.ConeGeometry(hr, hl, 14), mat);
    c.quaternion.setFromUnitVectors(Y_AXIS, dir);
    c.position.copy(V3(from).addScaledVector(dir, L - hl / 2));
    this.group.add(c);
  }

  dashed(from, to, color, dash = 0.12, gap = 0.09) {
    if (len(sub(to, from)) < 1e-6) return;
    const geom = new THREE.BufferGeometry().setFromPoints([V3(from), V3(to)]);
    const line = new THREE.Line(geom, new THREE.LineDashedMaterial({ color, dashSize: dash, gapSize: gap }));
    line.computeLineDistances();
    this.group.add(line);
  }

  poly(points, color, closed = false) {
    const pts = points.map(V3);
    if (closed) pts.push(pts[0].clone());
    this.group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color })));
  }

  point(pos, color, r = 0.08) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), this.mat(color));
    m.position.copy(V3(pos));
    this.group.add(m);
  }

  /** Translucent triangle/quad (list of 3 or 4 points); hatch draws diagonal stripes instead of a flat fill. */
  patch(points, color, opacity, { hatch = false, order = 0 } = {}) {
    const g = new THREE.BufferGeometry();
    const verts = [];
    const tris = points.length === 4 ? [[0, 1, 2], [0, 2, 3]] : [[0, 1, 2]];
    for (const t of tris) for (const i of t) verts.push(...points[i]);
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
    if (hatch) {
      const uv = [];
      for (let k = 0; k < verts.length; k += 3) uv.push(verts[k] * 2, verts[k + 2] * 2);
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      mat.map = hatchTexture();
      mat.alphaTest = 0.5;
    }
    const mesh = new THREE.Mesh(g, mat);
    mesh.renderOrder = order;
    this.group.add(mesh);
  }

  /** Right-angle square at p between unit directions e1, e2. */
  rightAngle(p, e1, e2, s = 0.2, color = COL.white) {
    this.poly([add(p, scale(e1, s)), add(p, scale(add(e1, e2), s)), add(p, scale(e2, s))], color);
  }

  /** anchor: where the text sits relative to pos, in screen terms: a(bove) b(elow) l(eft) r(ight), e.g. 'ar'; '' centers. */
  label(text, pos, color = COL.white, anchor = 'a') {
    const sp = makeLabelSprite(text, color);
    sp.position.copy(V3(pos));
    const cx = anchor.includes('l') ? 1.08 : anchor.includes('r') ? -0.08 : 0.5;
    const cy = anchor.includes('a') ? -0.2 : anchor.includes('b') ? 1.2 : 0.5;
    sp.center.set(cx, cy);
    this.labels.push(sp);
    this.group.add(sp);
  }

  mat(color, opacity = 1) {
    return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity });
  }

  dispose() {
    this.group.traverse((o) => {
      o.geometry?.dispose();
      const m = o.material;
      if (m) {
        if (m.map && m.map !== hatchTex) m.map.dispose();
        m.dispose();
      }
    });
  }
}

const n3 = (v) => (typeof v === 'string' ? v : (Math.abs(v) < 5e-4 ? 0 : v).toFixed(3));
const n2 = (v) => (typeof v === 'string' ? v : (Math.abs(v) < 5e-3 ? 0 : v).toFixed(2));
const tuple2 = (p) => `(${n2(p[0])}, ${n2(p[1])})`;
const tuple3 = (p) => `(${n2(p[0])}, ${n2(p[1])}, ${n2(p[2])})`;
const txt = (v) => String(v);
const short = (v) => String(Math.abs(v) < 0.005 ? 0 : +v.toFixed(2));
const tupleShort = (p) => `(${p.map(short).join(', ')})`;

// the rail is narrow: keep each readout cell on one line instead of letting digits wrap
const TABLE_CSS = '.cockpit .demo-shell-card .vg-table{width:100%;font-size:11px}'
  + '.cockpit .demo-shell-card .vg-table td{padding:3px 2px;white-space:nowrap}'
  + '.cockpit .demo-shell-card .vg-table td.value-label{padding-right:5px}';
let cssDone = false;
function injectCSS() {
  if (cssDone) return;
  const st = document.createElement('style');
  st.textContent = TABLE_CSS;
  document.head.appendChild(st);
  cssDone = true;
}

// ---------------------------------------------------------------- the demo

/**
 * make(container, opts)
 * stage 'full': mode buttons + every mode's sliders. 'embed': controls tokens (see header).
 */
export function make(container, { stage = 'embed', controls = [] } = {}) {
  const tokens = controls ?? [];
  const modeTok = tokens.find((t) => t.startsWith('mode:'));
  const wantModes = stage === 'full' || tokens.includes('modes');
  const wantReflect = stage === 'full' || tokens.includes('reflect');
  const sliderTokens = resolveControlIds(
    PARAMS, tokens.filter((t) => t !== 'modes' && t !== 'reflect' && !t.startsWith('mode:')), 'vec-geometry');
  let startMode = modeTok ? modeTok.slice(5) : 'frame';
  if (!MODES.includes(startMode)) {
    console.warn(`vec-geometry: unknown mode "${startMode}"; using frame`);
    startMode = 'frame';
  }

  const model = { mode: startMode, reflect: stage !== 'full' && tokens.includes('reflect') };
  for (const id of Object.keys(PARAMS)) model[id] = PARAMS[id].value; // exact defaults, not slider-snapped

  const nav = { orbitSpeed: 0.4, zoomSpeed: 0.12, moveSpeed: 3, rollRate: 60 };
  const disp = { grid: true, axes: true };
  let sc, scene, cam, viz = null;
  const homeStates = {};
  const applyGrid = () => {
    if (!sc) return;
    sc.grid.visible = disp.grid && model.mode !== 'segment';
    xyGrid.visible = disp.grid && model.mode === 'segment';
    sc.axes.visible = disp.axes;
  };
  const labelsOf = () => (viz ? viz.labels : []);
  // render: size every label sprite to a constant on-screen height, then draw
  const render = () => {
    for (const sp of labelsOf()) {
      const d = sc.camera.position.distanceTo(sp.position);
      sp.scale.set(d * 0.04 * sp.userData.aspect, d * 0.04, 1);
    }
    sc.render();
  };

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
      getCurrent: () => disp.grid, apply: (v) => { disp.grid = v; applyGrid(); render(); } },
    { label: 'axes', toggle: true, title: 'Show the world axes',
      getCurrent: () => disp.axes, apply: (v) => { disp.axes = v; applyGrid(); render(); } },
  ];

  const shell = makeShell(container, {
    stage,
    help: { html: HELP_HTML },
    settings: settingsFields,
    legend: 'drag to turn · scroll zoom · WASD move · ↑/↓ up·down · Q/E roll · H home',
    nav: 'orbit',
  });
  sc = makeScene(shell.sceneEl, { fill: true });
  scene = sc.scene;
  // the segment mode lives in the x-y plane, so it gets its own grid standing up in that plane
  const xyGrid = new THREE.GridHelper(12, 12, 0x3a4152, 0x262a35);
  xyGrid.rotation.x = Math.PI / 2;
  xyGrid.position.set(2.5, 2, -0.002);
  xyGrid.visible = false;
  scene.add(xyGrid);

  // ---- rail
  const ctrlCard = shell.addCard('Controls');
  let modeRow = null;
  if (wantModes) {
    modeRow = new ButtonRow(ctrlCard, {
      id: 'vec-geometry-mode', label: 'show',
      options: MODES.map((m) => ({ value: m, label: m === 'barycentric' ? 'bary' : m })),
      value: model.mode,
    });
    // the 'bary' short label keeps five buttons on one rail row; the title spells it out
    modeRow._buttons.forEach((btn, m) => { btn.title = m; });
  }

  const sliders = {};
  const groups = {}; // mode -> slider container
  const tables = {}; // mode -> {table, rows}
  const statusEls = {};
  const modesToBuild = wantModes ? MODES : [model.mode];

  let reflectRow = null;
  let reflectBox = null;

  function buildSliders(mode) {
    const g = document.createElement('div');
    g.dataset.mode = mode;
    ctrlCard.appendChild(g);
    groups[mode] = g;
    let ids = MODE_PARAMS[mode];
    if (stage !== 'full' && sliderTokens.length) {
      const only = ids.filter((id) => sliderTokens.includes(id));
      if (only.length) ids = only;
    }
    for (const id of ids) {
      if (id === 'inc' && !wantReflect) continue; // incidence only matters to the reflection
      sliders[id] = new SliderRow(g, { id: `vec-geometry-${id}`, ...PARAMS[id] });
      sliders[id].onInput((v) => { model[id] = v; update(); });
    }
    if (mode === 'plane' && wantReflect) {
      reflectRow = document.createElement('label');
      reflectRow.className = 'slider-row';
      reflectBox = document.createElement('input');
      reflectBox.type = 'checkbox';
      reflectBox.id = 'vec-geometry-reflect';
      reflectBox.checked = model.reflect;
      const span = document.createElement('span');
      span.className = 'slider-label';
      span.textContent = 'reflect a direction';
      span.style.width = 'auto';
      reflectRow.append(reflectBox, span);
      g.appendChild(reflectRow);
      reflectBox.addEventListener('change', () => { model.reflect = reflectBox.checked; update(); });
    }
  }

  const readoutCard = shell.addCard('Readout');
  const ROWS = {
    frame: [
      { id: 'w', label: 'w', cols: 3, color: COL.w, format: n3 },
      { id: 'u', label: 'u', cols: 3, color: COL.u, format: n3 },
      { id: 't', label: 't', cols: 3, color: COL.t, format: n3 },
      { id: 'cl', label: '|a×b|', color: COL.white, format: n3 },
      { id: 'bf', label: 'b coords', cols: 3, color: COL.white, format: txt },
    ],
    segment: [
      { id: 'd', label: 't', color: COL.w, format: n3 },
      { id: 'foot', label: 'foot', cols: 2, color: COL.gray, format: n2 },
      { id: 'inside', label: 'inside?', color: COL.white, format: txt },
      { id: 'nearest', label: 'nearest', cols: 2, color: COL.ok, format: n2 },
      { id: 'dl', label: 'to line', color: COL.gray, format: n3 },
      { id: 'ds', label: 'to segment', color: COL.bad, format: n3 },
    ],
    plane: [
      { id: 'nv', label: 'n', cols: 3, color: COL.normal, format: n3 },
      { id: 'D', label: 'D', color: COL.normal, format: n3 },
      { id: 's', label: 'n·P−D', color: COL.white, format: n3 },
      { id: 'side', label: 'side', color: COL.white, format: txt },
      { id: 'foot', label: 'foot', cols: 3, color: COL.white, format: n3 },
      { id: 'dn', label: 'd·n', color: COL.gold, format: n3, refl: true },
      { id: 'proj', label: 'proj', cols: 3, color: COL.cyan, format: n3, refl: true },
      { id: 'refl', label: 'refl', cols: 3, color: COL.pink, format: n3, refl: true },
    ],
    ray: [
      { id: 'nd', label: 'n·d', color: COL.white, format: n3 },
      { id: 'no', label: 'n·o', color: COL.white, format: n3 },
      { id: 't', label: 't', color: COL.w, format: txt },
      { id: 'hit', label: 'hit', cols: 3, color: COL.bad, format: txt },
    ],
    barycentric: [
      { id: 'w0', label: 'w0 (P0)', color: COL.c0, format: n3 },
      { id: 'w1', label: 'w1 (P1)', color: COL.c1, format: n3 },
      { id: 'w2', label: 'w2 (P2)', color: COL.c2, format: n3 },
      { id: 'sum', label: 'sum', color: COL.white, format: n3 },
      { id: 'X', label: 'X', cols: 3, color: COL.white, format: n2 },
    ],
  };
  function buildReadout(mode) {
    const wrap = document.createElement('div');
    readoutCard.appendChild(wrap);
    injectCSS();
    const table = new ValueTable(wrap, { rows: ROWS[mode] });
    table.table.classList.add('vg-table');
    ROWS[mode].forEach((r, i) => {
      table.table.rows[i].querySelectorAll('td').forEach((td) => { td.style.color = css(r.color); });
    });
    const reflTrs = [];
    ROWS[mode].forEach((r, i) => { if (r.refl) reflTrs.push(table.table.rows[i]); });
    const status = document.createElement('p');
    status.className = 'demo-hint';
    status.style.cssText = 'font-size:12px;font-weight:600;margin:6px 0 0;line-height:1.35';
    wrap.appendChild(status);
    tables[mode] = { wrap, table, reflTrs };
    statusEls[mode] = status;
  }

  for (const m of modesToBuild) {
    buildSliders(m);
    buildReadout(m);
  }

  // ---- per-mode scenes
  function setStatus(mode, text, color) {
    statusEls[mode].textContent = text;
    statusEls[mode].style.color = css(color);
  }

  function drawFrame(v) {
    const info = frameInfo(model.bAz, model.bEl);
    const T = tables.frame.table;
    const { a, b, w, u, t, parallel } = info;
    v.arrow([0, 0, 0], a, COL.a, { r: 0.02 });
    v.arrow([0, 0, 0], b, COL.b, { r: 0.02 });
    v.label('a', a, COL.a, 'ar');
    v.label('b', b, COL.b, 'a');
    v.arrow([0, 0, 0], w, COL.w, { r: 0.04, head: 0.22, hr: 0.09 });
    v.label('w', w, COL.w, 'b');
    T.update('w', w);
    T.update('cl', info.crossLen);
    if (!parallel) {
      v.arrow([0, 0, 0], u, COL.u, { r: 0.04, head: 0.22, hr: 0.09 });
      v.arrow([0, 0, 0], t, COL.t, { r: 0.04, head: 0.22, hr: 0.09 });
      v.label('u', u, COL.u, 'bl');
      v.label('t', t, COL.t, 'br');
      v.rightAngle([0, 0, 0], w, u);
      v.rightAngle([0, 0, 0], w, t);
      v.rightAngle([0, 0, 0], u, t);
      // b in the frame: walk b.w along w, then b.u along u, then b.t along t (the three shadows)
      const [cw, cu, ct] = info.coords;
      const p1 = scale(w, cw), p2 = add(p1, scale(u, cu)), p3 = add(p2, scale(t, ct));
      v.dashed([0, 0, 0], p1, COL.w);
      v.dashed(p1, p2, COL.u);
      v.dashed(p2, p3, COL.t);
      v.dashed(p3, b, COL.gray, 0.05, 0.05);
      v.point(p1, COL.w, 0.05);
      if (cw > 0.4) v.label(`b·w = ${n2(cw)}`, p1, COL.w, 'br');
      if (Math.abs(cu) > 0.15) v.label(`b·u = ${n2(cu)}`, scale(add(p1, p2), 0.5), COL.u, 'l');
      if (len(sub(p3, p2)) > 0.15) v.label(`b·t = ${n2(ct)}`, scale(add(p2, p3), 0.5), COL.t, 'r');
      T.update('u', u);
      T.update('t', t);
      T.update('bf', info.coords.map(n3));
      setStatus('frame', 'frame built: w, u, t are unit length and square to each other', COL.ok);
    } else {
      v.label('parallel: no plane, no frame', add(b, [0, 0.5, 0]), COL.bad, 'a');
      T.update('u', ['NaN', 'NaN', 'NaN']);
      T.update('t', ['NaN', 'NaN', 'NaN']);
      T.update('bf', [n3(info.coords[0]), 'n/a', 'n/a']);
      setStatus('frame', 'parallel: no plane, no frame (normalize(0) = NaN)', COL.bad);
    }
  }

  function drawSegment(v) {
    const s = segmentInfo(model.qx, model.qy);
    const T = tables.segment.table;
    const vh = s.vh;
    const perp = [-vh[1], vh[0], 0]; // 90 degrees left of the direction
    // the infinite line, faint and dashed; the segment itself, thick
    v.dashed(add(s.p0, scale(vh, -7)), add(s.p1, scale(vh, 8)), COL.gray, 0.14, 0.1);
    v.bar(s.p0, s.p1, COL.b, 0.035);
    v.point(s.p0, COL.white, 0.08);
    v.point(s.p1, COL.white, 0.08);
    const atP0 = s.d < 0, atP1 = s.d > s.L; // clamped: the nearest point IS an endpoint
    if (atP0) v.label('P0 = nearest (0, 0)', s.p0, COL.ok, 'bl');
    else v.label('P0 (0, 0)', s.p0, COL.white, 'bl');
    v.label('P1 (4, 2)', s.p1, COL.white, atP1 ? 'al' : 'ar');
    // unit direction, offset to the left of the line
    const off = scale(perp, 0.22);
    v.arrow(add(s.p0, off), add(add(s.p0, off), vh), COL.gold, { r: 0.03, head: 0.22, hr: 0.08 });
    v.label('d̂', add(add(s.p0, off), vh), COL.gold, 'al');
    // projected length d: bracket on the right of the line, from P0 to the foot
    const bo = scale(perp, -0.25);
    if (Math.abs(s.d) > 1e-3) {
      const a0 = add(s.p0, bo), a1 = add(s.foot, bo);
      v.bar(a0, a1, COL.w, 0.03);
      v.bar(add(s.p0, scale(perp, -0.12)), add(s.p0, scale(perp, -0.38)), COL.w, 0.02);
      v.bar(add(s.foot, scale(perp, -0.12)), add(s.foot, scale(perp, -0.38)), COL.w, 0.02);
      v.label(`t = ${n3(s.d)}`, add(scale(add(a0, a1), 0.5), scale(perp, -0.1)), COL.w, 'b');
    }
    // foot (unclamped) and nearest (clamped)
    if (!s.inside) {
      v.dashed(s.pt, s.foot, COL.gray, 0.1, 0.08);
      v.point(s.foot, COL.gray, 0.07);
      v.label(`foot ${tupleShort(s.foot.slice(0, 2))}`, add(s.foot, s.d < 0 ? [0, -0.55, 0] : scale(perp, -0.15)), COL.gray, s.d < 0 ? 'bl' : 'a');
    }
    v.bar(s.pt, s.nearest, COL.bad, 0.03);
    v.point(s.nearest, COL.ok, 0.1);
    if (s.inside) v.label(`nearest ${tupleShort(s.nearest.slice(0, 2))}`, add(s.nearest, scale(perp, -0.45)), COL.ok, 'r');
    else if (!atP0) v.label(`nearest ${tupleShort(s.nearest.slice(0, 2))}`, s.nearest, COL.ok, 'br');
    v.point(s.pt, COL.pink, 0.11);
    v.label(`Pt ${tupleShort(s.pt.slice(0, 2))}`, s.pt, COL.pink, 'a');
    v.label(`dist ${n2(s.distSeg)}`, scale(add(s.pt, s.nearest), 0.5), COL.bad, 'l');

    T.update('d', s.d);
    T.update('foot', [s.foot[0], s.foot[1]]);
    T.update('inside', s.inside ? 'yes' : (s.d < 0 ? 'no (t < 0)' : 'no (t > 4.472)'));
    T.update('nearest', [s.nearest[0], s.nearest[1]]);
    T.update('dl', s.distLine);
    T.update('ds', s.distSeg);
    setStatus('segment', s.inside ? '0 ≤ t ≤ 4.472: the foot is on the segment' : 't outside [0, 4.472]: clamp to the end', s.inside ? COL.ok : COL.bad);
  }

  function drawPlane(v) {
    const P = [model.px, model.py, model.pz];
    const pi = planeInfo(P, model.inc);
    const T = tables.plane.table;
    const n = pi.n;
    const e2 = cross(n, PLANE_T);
    const H = 3.2;
    const corner = (i, j) => add(add(PLANE_Q, scale(PLANE_T, i * H)), scale(e2, j * H));
    const quad = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
    v.patch(quad, COL.b, 0.16);
    v.poly(quad, COL.b, true);
    for (const k of [-0.5, 0, 0.5]) {
      v.poly([corner(k * 2, -1), corner(k * 2, 1)], 0x3b5f86);
      v.poly([corner(-1, k * 2), corner(1, k * 2)], 0x3b5f86);
    }
    v.point(PLANE_Q, COL.gold, 0.07);
    v.label('Q (1, 0, 0)', PLANE_Q, COL.gold, 'bl');
    v.arrow(PLANE_Q, add(PLANE_Q, scale(n, 1.5)), COL.normal, { r: 0.03 });
    v.label('n', add(PLANE_Q, scale(n, 1.5)), COL.normal, 'al');
    v.rightAngle(PLANE_Q, n, PLANE_T, 0.25, COL.normal);

    const col = pi.side === 'front' ? COL.front : pi.side === 'behind' ? COL.behind : COL.white;
    v.dashed(P, pi.foot, col, 0.12, 0.08);
    v.point(pi.foot, COL.white, 0.06);
    v.point(P, col, 0.12);
    v.label(`P ${tupleShort(P)}`, P, col, 'a');
    if (len(sub(P, pi.foot)) > 0.2) v.label(`n·P−D = ${n3(pi.s)}`, scale(add(P, pi.foot), 0.5), col, P[0] > 1 ? 'l' : 'r');

    if (model.reflect) {
      const S = 2.2; // drawing scale for the unit direction
      const F = pi.foot;
      const tip = (vec) => add(F, scale(vec, S));
      v.arrow(F, tip(pi.d), COL.white, { r: 0.03 });
      v.arrow(F, tip(pi.along), COL.gold, { r: 0.022, head: 0.18, hr: 0.06 });
      v.arrow(F, tip(pi.proj), COL.cyan, { r: 0.022, head: 0.18, hr: 0.06 });
      v.arrow(F, tip(pi.refl), COL.pink, { r: 0.03 });
      v.dashed(tip(pi.d), tip(pi.along), COL.gray, 0.06, 0.05);
      v.dashed(tip(pi.d), tip(pi.proj), COL.gray, 0.06, 0.05);
      v.dashed(tip(pi.refl), tip(pi.proj), COL.gray, 0.06, 0.05);
      v.label('d', tip(pi.d), COL.white, 'b');
      v.label('(d·n)n', tip(pi.along), COL.gold, 'bl');
      v.label('d−(d·n)n', tip(pi.proj), COL.cyan, 'r');
      v.label('r', tip(pi.refl), COL.pink, 'ar');
    }

    T.update('nv', n);
    T.update('D', pi.D);
    T.update('s', pi.s);
    T.update('side', pi.side === 'front' ? 'front (> 0)' : pi.side === 'behind' ? 'behind (< 0)' : 'on (0)');
    T.update('foot', pi.foot);
    tables.plane.reflTrs.forEach((tr) => { tr.style.display = model.reflect ? '' : 'none'; });
    if (model.reflect) {
      T.update('dn', pi.dn);
      T.update('proj', pi.proj);
      T.update('refl', pi.refl);
    }
    setStatus('plane', pi.side === 'front' ? 'positive: P is on the side n points to' : pi.side === 'behind' ? 'negative: P is behind the plane' : 'zero: P lies on the plane',
      pi.side === 'front' ? COL.front : pi.side === 'behind' ? COL.behind : COL.white);
  }

  function drawRay(v) {
    const r = rayInfo(model.dirAngle, model.oy);
    const T = tables.ray.table;
    const o = r.o, d = r.d;
    const patch = [[-5, 0, -4], [11, 0, -4], [11, 0, 4], [-5, 0, 4]];
    v.patch(patch, COL.b, 0.14);
    v.poly(patch, COL.b, true);
    v.arrow([0, 0, 0], [0, 1.2, 0], COL.normal, { r: 0.025 });
    v.label('n', [0, 1.2, 0], COL.normal, 'ar');
    v.label('ground y = 0', [10.8, 0, 3.8], COL.b, 'al');
    // height n.o
    v.dashed(o, [o[0], 0, o[2]], COL.gray, 0.1, 0.08);
    v.label(`n·o = ${n2(r.no)}`, [o[0], o[1] / 2, 0], COL.gray, 'l');
    const far = 22;
    if (r.status === 'hit') {
      const drawT = Math.min(r.t, far);
      v.bar(o, add(o, scale(d, drawT)), COL.w, 0.03);
      v.dashed(add(o, scale(d, drawT)), add(o, scale(d, drawT + 3)), COL.w, 0.1, 0.1);
      if (r.t <= far) {
        v.point(r.hit, COL.bad, 0.12);
        v.label(`hit (${short(r.hit[0])}, 0, ${short(r.hit[2])})`, r.hit, COL.bad, 'ar');
      }
      v.label(`t = ${n2(r.t)}`, add(o, scale(d, drawT / 2)), COL.w, 'ar');
    } else if (r.status === 'behind') {
      v.bar(o, add(o, scale(d, far)), COL.w, 0.03);
      const back = add(o, scale(d, Math.max(r.t, -far)));
      v.dashed(o, back, COL.gray, 0.1, 0.1);
      if (r.t >= -far) {
        v.point(r.hit, COL.gray, 0.1);
        v.label(`behind the start o, t = ${n2(r.t)}`, r.hit, COL.bad, 'a');
      }
    } else {
      v.bar(o, add(o, scale(d, far)), COL.w, 0.03);
      v.label('no hit', add(o, scale(d, 5)), COL.bad, 'a');
    }
    v.arrow(o, add(o, scale(d, 1.5)), COL.gold, { r: 0.045, head: 0.3, hr: 0.11 });
    v.label('d', add(o, scale(d, 1.5)), COL.gold, 'ar');
    v.point(o, COL.pink, 0.11);
    v.label(`o (0, ${short(o[1])}, 0)`, o, COL.pink, 'l');

    T.update('nd', r.nd);
    T.update('no', r.no);
    T.update('t', r.status === 'nohit' ? 'none' : n3(r.t));
    T.update('hit', r.status === 'nohit' ? ['--', '--', '--'] : r.hit.map((x) => n3(x)));
    setStatus('ray',
      r.status === 'hit' ? 't ≥ 0: the ray meets the plane ahead of its start o'
        : r.status === 'behind' ? 'behind the start o: t < 0, the line meets the plane, the ray does not'
          : 'no hit: the ray runs parallel to the plane (n·d = 0)',
      r.status === 'hit' ? COL.ok : COL.bad);
  }

  function drawBary(v) {
    const b = baryInfo(model.xx, model.xz);
    const T = tables.barycentric.table;
    const P = b.p;
    const cols = [COL.c0, COL.c1, COL.c2];
    for (let i = 0; i < 3; i++) {
      const wi = b.w[i];
      if (Math.abs(wi) < 1e-3) continue;
      const j = (i + 1) % 3, k = (i + 2) % 3;
      const tri = [b.x, P[j], P[k]].map((q) => [q[0], 0.003 * (i + 1), q[2]]);
      const op = clamp(0.85 * Math.abs(wi), 0.06, 0.85);
      v.patch(tri, wi < 0 ? COL.warn : cols[i], wi < 0 ? 1 : op, { hatch: wi < 0, order: wi < 0 ? 5 : 0 });
      if (Math.abs(wi) > 0.04) {
        const cen = [(b.x[0] + P[j][0] + P[k][0]) / 3, 0.02, (b.x[2] + P[j][2] + P[k][2]) / 3];
        v.label(n2(wi), cen, wi < 0 ? COL.bad : COL.white, '');
      }
    }
    v.poly(P.map((p) => [p[0], 0.012, p[2]]), COL.white, true);
    for (let i = 0; i < 3; i++) {
      v.dashed(b.x, P[i], cols[i], 0.08, 0.06);
      v.point(P[i], cols[i], 0.09);
    }
    v.point(b.x, COL.white, 0.1);
    v.label('X', b.x, COL.white, 'bl');
    const anchors = ['bl', 'br', 'a'];
    for (let i = 0; i < 3; i++) {
      v.label(`P${i}  w${i} = ${n2(b.w[i])}`, P[i], b.w[i] < -BARY_TOL ? COL.bad : cols[i], anchors[i]);
    }
    T.update('w0', b.w[0]);
    T.update('w1', b.w[1]);
    T.update('w2', b.w[2]);
    T.update('sum', b.sum);
    T.update('X', [b.x[0], b.x[1], b.x[2]]);
    const msg = { inside: 'inside: all three weights positive', edge: 'on an edge: one weight is 0', corner: 'at a corner: two weights are 0',
      outside: 'outside: a negative weight (hatched piece)' }[b.verdict];
    setStatus('barycentric', msg, b.verdict === 'outside' ? COL.bad : COL.ok);
  }

  const DRAW = { frame: drawFrame, segment: drawSegment, plane: drawPlane, ray: drawRay, barycentric: drawBary };

  function update() {
    if (viz) {
      scene.remove(viz.group);
      viz.dispose();
    }
    viz = new Viz();
    DRAW[model.mode](viz);
    scene.add(viz.group);
    render();
  }

  function showMode() {
    for (const m of Object.keys(groups)) {
      const on = m === model.mode;
      groups[m].style.display = on ? '' : 'none';
      tables[m].wrap.style.display = on ? '' : 'none';
    }
    modeRow?.set(model.mode);
    applyGrid();
  }

  // ---- camera: one real controller; per-mode home poses come from throwaway controllers
  const noopCam = { position: { set() {} }, up: { set() {} }, lookAt() {} };
  for (const m of MODES) {
    homeStates[m] = makeOrbitCamera({ camera: noopCam, render() {}, home: HOMES[m], stage, settings: {} }).getState();
  }
  cam = makeOrbitCamera({ camera: sc.camera, render, home: HOMES[model.mode], sceneEl: shell.sceneEl, container, stage, settings: nav });
  cam.home = () => cam.setState(homeStates[model.mode]);
  shell.setNavController(cam);

  if (modeRow) {
    modeRow.onChange((m) => {
      model.mode = m;
      showMode();
      cam.setState(homeStates[m]); // also re-renders
      update();
    });
  }

  showMode();
  update();
  return { model, sliders, cam, input: cam, tables };
}
