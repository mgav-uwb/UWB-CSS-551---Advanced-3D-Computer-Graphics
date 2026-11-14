// view-lab-kit: what the view-lab views share. Number and matrix text, the camera rig (the lecture's az, el, dist around at = (0, 0.5, 0)),
// drawing a camera and its view volume in the lab's scene, the NDC cube beside the scene, and the insets: what the camera sees, painted on a
// 2D canvas by the program's own functions (the six-plane clipper clips every line, chain() puts every point on a pixel).
import * as VL from '../programs/view-lab/webgl/viewlab.js';
import { COL, V, add, mul } from '../core/lab-viz.js';

export const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export const AT = [0, 0.5, 0];
export const UP = [0, 1, 0];
export const T = (a) => V(a[0], a[1], a[2]);
export const arr = (v) => [v.x, v.y, v.z];

// ---------------------------------------------------------------- text

export function n(x, d = 2) {
  if (x === Infinity) return '∞';
  if (x === -Infinity) return '−∞';
  if (!Number.isFinite(x)) return 'none';
  const s = Number(x.toFixed(d));
  return String(s === 0 ? 0 : s).replace('-', '−');
}
/** a small number with its significant digits: 6.0e-7 */
export function sci(x) {
  if (!Number.isFinite(x) || x === 0) return n(x);
  if (Math.abs(x) >= 0.01 && Math.abs(x) < 1e4) return n(x, Math.abs(x) < 1 ? 3 : 2);
  return x.toExponential(1).replace('e-', 'e−').replace('e+', 'e');
}
export const vt = (p, d = 2) => `(${p.map((x) => n(x, d)).join(', ')})`;
export const rows4 = (m) => [0, 1, 2, 3].map((r) => [m[r], m[4 + r], m[8 + r], m[12 + r]]);

/** rows of numbers as a table; keys[j] colors column j with a formula term; sep marks the last (shift) column */
export function matHtml(rows, keys = [], sep = -1, d = 2) {
  let h = '<table class="mat-panel vl-mat"><tbody>';
  for (const row of rows) {
    h += '<tr>';
    row.forEach((x, j) => {
      const t = typeof x === 'number' ? n(x, d) : x;
      h += `<td${j === sep ? ' class="vl-sep"' : ''}>${keys[j] ? `{${keys[j]}|${t}}` : t}</td>`;
    });
    h += '</tr>';
  }
  return `${h}</tbody></table>`;
}

const CSS = `
.cockpit .demo-shell-card .vl-mat { width: auto; margin: 2px 0 2px 4px; display: inline-table; vertical-align: middle; }
.cockpit .demo-shell-card .vl-mat td { padding: 2px 6px; min-width: 2.2em; font-size: 11.5px; border-bottom: none; text-align: right; }
.cockpit .demo-shell-card .vl-mat td.vl-sep { border-left: 1px solid #3a4052; }
.vl-mats { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: flex-start; }
.vl-mats figure { margin: 0; }
.vl-mats figcaption { font: 600 11px/1.3 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; }
.vl-insets { position: absolute; left: 8px; top: 44px; display: flex; flex-direction: column; gap: 6px; z-index: 5; pointer-events: none; }
.vl-inset { pointer-events: auto; position: relative; border: 1px solid #3a4052; border-radius: 4px; overflow: hidden; background: #0d1017; line-height: 0; }
.vl-inset canvas { display: block; width: 100%; height: auto; cursor: crosshair; }
.vl-inset span { pointer-events: none; position: absolute; left: 5px; top: 3px; font: 600 11px/1.2 -apple-system, Segoe UI, Roboto, sans-serif; color: #aab2c5; text-shadow: 0 0 3px #0b0c10; }
.vl-svg { display: block; width: 100%; height: auto; }
`;
export function injectKitCss() {
  if (typeof document === 'undefined' || document.getElementById('vl-css')) return;
  const st = document.createElement('style');
  st.id = 'vl-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

// ---------------------------------------------------------------- the camera rig

export const RIG_INIT = { az: 35, el: 20, dist: 7, fov: 45, near: 1, far: 8, aspect: 1.78, at: [0, 0.5, 0] };
export const RIG_PARAMS = {
  az: { id: 'az', label: 'azimuth', min: -180, max: 180, step: 1, unit: '°' },
  el: { id: 'el', label: 'elevation', min: -60, max: 80, step: 1, unit: '°' },
  dist: { id: 'dist', label: 'distance', min: 2, max: 14, step: 0.1 },
  fov: { id: 'fov', label: 'field of view', min: 10, max: 120, step: 1, unit: '°' },
  near: { id: 'near', label: 'near', min: 0.1, max: 4, step: 0.05 },
  far: { id: 'far', label: 'far', min: 3, max: 30, step: 0.5 },
  aspect: { id: 'aspect', label: 'aspect', min: 0.5, max: 2.5, step: 0.01 },
};
export const rigParams = (...ids) => ids.map((id) => RIG_PARAMS[id]);

/** the camera the values describe: eye on a sphere around at, V, P and their products and inverse, all from the program */
export function rigOf(m) {
  const at = !m.at ? AT : Array.isArray(m.at) ? m.at : arr(m.at);
  const eye = VL.orbitEye(at, m.az, m.el, m.dist);
  const look = VL.lookAt(eye, at, UP);
  const proj = VL.perspective(m.fov, m.aspect, m.near, m.far);
  const PV = VL.mulMat(proj.P, look.V);
  const inverted = VL.invert4(PV);
  return { eye, at, look, proj, P: proj.P, V: look.V, PV, inv: inverted.inverse, singular: inverted.singular };
}
/** the same camera with a different P (orthographic, off-axis) */
export function withProjection(rig, P) {
  const PV = VL.mulMat(P, rig.V);
  const inverted = VL.invert4(PV);
  return { ...rig, P, PV, inv: inverted.inverse, singular: inverted.singular };
}

// ---------------------------------------------------------------- drawing in the lab's scene

/** the view volume: the NDC cube's corners through (P V)^-1, so a perspective frustum, a box and a skewed frustum are drawn alike */
export function drawVolume(v, rig, color, k, { opacity = 0.08, eyeLines = true } = {}) {
  if (rig.singular) return;
  const C = (i, j, l) => T(VL.unproject(rig.inv, [i, j, l]));
  const nr = [C(-1, -1, -1), C(1, -1, -1), C(1, 1, -1), C(-1, 1, -1)];
  const fr = [C(-1, -1, 1), C(1, -1, 1), C(1, 1, 1), C(-1, 1, 1)];
  v.poly(nr, color, { k, closed: true });
  v.poly(fr, color, { k, closed: true });
  v.patch(nr, color, opacity, { k });
  for (let i = 0; i < 4; i++) v.poly([nr[i], fr[i]], color, { k });
  if (eyeLines && Number.isFinite(rig.eye[0])) for (let i = 0; i < 4; i++) v.dashed(T(rig.eye), nr[i], color, { k, dash: 0.08, gap: 0.08 });
}
/** the eye and its three axes */
export function drawCamera(v, rig, { axes = true, label = true } = {}) {
  const eye = T(rig.eye);
  v.point(eye, COL.gold, { k: 'eye', r: 0.1, label: label ? 'eye' : undefined, anchor: 'ar' });
  if (!axes || !rig.look.valid) return;
  const s = 0.9;
  v.arrow(eye, add(eye, mul(T(rig.look.u), s)), COL.a, { k: 'u', r: 0.02, hr: 0.06, head: 0.18, label: 'u', anchor: 'ar' });
  v.arrow(eye, add(eye, mul(T(rig.look.v), s)), COL.c, { k: 'v', r: 0.02, hr: 0.06, head: 0.18, label: 'v', anchor: 'al' });
  v.arrow(eye, add(eye, mul(T(rig.look.w), s)), COL.b, { k: 'w', r: 0.02, hr: 0.06, head: 0.18, label: 'w', anchor: 'ar' });
}
/** the box [-0.5, 0.5]^3 through a model matrix: its 12 edges as point pairs */
export function cubeEdges(M, half = 0.5) {
  const corner = (a) => VL.mulVec4(M, [a & 1 ? half : -half, a & 2 ? half : -half, a & 4 ? half : -half, 1]).slice(0, 3);
  const out = [];
  for (let a = 0; a < 8; a++) for (let bit = 0; bit < 3; bit++) { const b = a | (1 << bit); if (b !== a) out.push([corner(a), corner(b)]); }
  return out;
}
export function drawCube(v, M, color, k, half = 0.5) {
  for (const [p, q] of cubeEdges(M, half)) v.poly([T(p), T(q)], color, { k });
}

/** the NDC cube, set beside the scene so the divide by w can be seen: a point's NDC lands inside it */
export const NDC = { center: [-5.4, 1.5, -2.5], half: 1.3 };
export const ndcAt = (p) => T([NDC.center[0] + p[0] * NDC.half, NDC.center[1] + p[1] * NDC.half, NDC.center[2] + p[2] * NDC.half]);
export function drawNdcCube(v, color = COL.gray, k = 'ndc') {
  const h = NDC.half, c = NDC.center;
  v.box(V(c[0] - h, c[1] - h, c[2] - h), V(2 * h, 0, 0), V(0, 2 * h, 0), V(0, 0, 2 * h), color, { k, opacity: 0.05 });
  v.label('NDC cube', V(c[0], c[1] + h, c[2]), color, 'a', k);
  v.label('x', ndcAt([1.12, 0, 0]), COL.a, '', k);
  v.label('y', ndcAt([0, 1.12, 0]), COL.c, '', k);
  v.label('z', ndcAt([0, 0, 1.12]), COL.b, '', k);
}

// ---------------------------------------------------------------- scene lines, for the insets

export function groundLines(half = 4, color = '#2a3144') {
  const out = [];
  for (let i = -half; i <= half; i++) {
    out.push({ pts: [[i, 0, -half], [i, 0, half]], color }, { pts: [[-half, 0, i], [half, 0, i]], color });
  }
  return out;
}
export function cubeLines(M, color, half = 0.5) {
  return cubeEdges(M, half).map((e) => ({ pts: e, color }));
}
export function sphereLines(c, r, color, steps = 32) {
  const out = [];
  for (let axis = 0; axis < 3; axis++) {
    const pts = [];
    for (let i = 0; i <= steps; i++) {
      const s = (i / steps) * 2 * Math.PI, a = r * Math.cos(s), b = r * Math.sin(s);
      if (axis === 0) pts.push([c[0], c[1] + a, c[2] + b]);
      else if (axis === 1) pts.push([c[0] + a, c[1], c[2] + b]);
      else pts.push([c[0] + a, c[1] + b, c[2]]);
    }
    out.push({ pts, color });
  }
  return out;
}

// ---------------------------------------------------------------- the insets

const mounted = new Map();   // sceneEl -> { el, boxes }

/** n inset canvases at the top left of the scene; onPixel(index, fx, fy) is called with the position in 0..1 when one is pressed or dragged */
export function mountInsets(ctx, count, onPixel = null) {
  unmountInsets(ctx);
  const el = document.createElement('div');
  el.className = 'vl-insets';
  if (ctx.stage !== 'full') { el.style.flexDirection = 'row'; el.style.top = '8px'; }
  const boxes = [];
  const width = ctx.stage === 'full' ? 300 : 210;
  for (let i = 0; i < count; i++) {
    const box = document.createElement('div');
    box.className = 'vl-inset';
    box.style.width = `${width}px`;
    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = Math.round(width * 2 / 1.78);
    const cap = document.createElement('span');
    box.append(canvas, cap);
    el.appendChild(box);
    for (const ev of ['mousedown', 'pointerdown', 'touchstart', 'wheel', 'click']) box.addEventListener(ev, (e) => e.stopPropagation());
    if (onPixel) {
      const at = (e) => { const b = canvas.getBoundingClientRect(); onPixel(i, (e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height); };
      let down = false;
      canvas.addEventListener('pointerdown', (e) => { down = true; at(e); });
      window.addEventListener('pointermove', (e) => { if (down) at(e); });
      window.addEventListener('pointerup', () => { down = false; });
    }
    boxes.push({ canvas, cap, box });
  }
  ctx.sceneEl.appendChild(el);
  mounted.set(ctx.sceneEl, { el, boxes });
  return boxes;
}
export function unmountInsets(ctx) {
  const m = mounted.get(ctx.sceneEl);
  if (m) { m.el.remove(); mounted.delete(ctx.sceneEl); }
}
export function insetBoxes(ctx) { return mounted.get(ctx.sceneEl)?.boxes ?? []; }

/** size an inset to an image aspect: the stage's width on a page, and on a slide small enough to leave the strip and the rail clear */
export function fitInset(entry, aspect, label, ctx) {
  const scene = ctx?.sceneEl;
  const count = Math.max(1, mounted.get(scene)?.boxes.length ?? 1);
  const full = ctx?.stage === 'full';
  const sceneW = scene?.clientWidth || 800, sceneH = scene?.clientHeight || 600;
  let w = full ? 300 : Math.min(240, (sceneW - 16 - 6 * (count - 1)) / count);
  if (!full) w = Math.min(w, Math.max(80, sceneH - 76) * aspect);
  w = Math.round(w);
  const wanted = [w * 2, Math.max(40, Math.round((w * 2) / aspect))];
  entry.box.style.width = `${w}px`;
  if (entry.canvas.width !== wanted[0]) entry.canvas.width = wanted[0];
  if (entry.canvas.height !== wanted[1]) entry.canvas.height = wanted[1];
  entry.cap.textContent = label ?? '';
}

/**
 * Paint what a camera sees. lines: [{ pts, color }] in the world, each clipped to the view volume by the program's own clipper.
 * marks: [{ p, color, label }] world points; polys: [{ clip, fill, stroke }] clip-space polygons whose vertices are in front of the eye;
 * cross: { px, py, W, H } an image pixel to mark.
 */
export function paintInset(canvas, { V: View, P, lines = [], marks = [], polys = [], cross = null }) {
  const cw = canvas.width, ch = canvas.height, g = canvas.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#0d1017';
  g.fillRect(0, 0, cw, ch);
  const PV = VL.mulMat(P, View);
  const pix = (c) => VL.chain(IDENT, IDENT, IDENT, [c[0] / c[3], c[1] / c[3], c[2] / c[3]], cw, ch).pixel;
  g.lineJoin = 'round';
  for (const line of lines) {
    const clips = line.pts.map((p) => VL.mulVec4(PV, [p[0], p[1], p[2], 1]));
    g.strokeStyle = line.color;
    g.lineWidth = line.width ?? 1.5;
    for (let i = 0; i + 1 < clips.length; i++) {
      const out = VL.clipPolygon([clips[i], clips[i + 1]]).clipped;
      if (out.length < 2) continue;
      g.beginPath();
      out.forEach((c, k) => { const q = pix(c); if (k === 0) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]); });
      g.stroke();
    }
  }
  for (const poly of polys) {
    if (poly.clip.length < 3 || poly.clip.some((c) => c[3] <= VL.EPS)) continue;
    g.beginPath();
    poly.clip.forEach((c, k) => { const q = pix(c); if (k === 0) g.moveTo(q[0], q[1]); else g.lineTo(q[0], q[1]); });
    g.closePath();
    g.fillStyle = poly.fill;
    g.fill();
    g.strokeStyle = poly.stroke;
    g.lineWidth = 2;
    g.stroke();
  }
  g.font = 'bold 22px -apple-system, Segoe UI, Roboto, sans-serif';
  for (const mk of marks) {
    const c = VL.mulVec4(PV, [mk.p[0], mk.p[1], mk.p[2], 1]);
    if (c[3] <= VL.EPS) continue;
    const q = pix(c);
    g.fillStyle = mk.color;
    g.beginPath();
    g.arc(q[0], q[1], 6, 0, 2 * Math.PI);
    g.fill();
    if (mk.label) { g.lineWidth = 4; g.strokeStyle = '#0d1017'; g.strokeText(mk.label, q[0] + 9, q[1] - 7); g.fillText(mk.label, q[0] + 9, q[1] - 7); }
  }
  if (cross) {
    const x = ((cross.px + 0.5) / cross.W) * cw, y = ((cross.py + 0.5) / cross.H) * ch;
    g.strokeStyle = '#ffd166';
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(x - 14, y); g.lineTo(x + 14, y); g.moveTo(x, y - 14); g.lineTo(x, y + 14);
    g.stroke();
    g.beginPath();
    g.arc(x, y, 9, 0, 2 * Math.PI);
    g.stroke();
  }
  g.strokeStyle = '#3a4052';
  g.lineWidth = 2;
  g.strokeRect(1, 1, cw - 2, ch - 2);
}

/**
 * A plan view (x across, -z up) on a 2D canvas. fit: [[x, z]] points the picture must contain; lines: [{ pts, color, dash }];
 * polys: [{ pts, fill, stroke }]; marks: [{ p, color, label }]. Everything outside the fitted box is clipped by the canvas.
 */
export function paintPlan(canvas, { fit, lines = [], polys = [], marks = [] }) {
  const cw = canvas.width, ch = canvas.height, g = canvas.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#0d1017';
  g.fillRect(0, 0, cw, ch);
  const xs = fit.map((p) => p[0]), zs = fit.map((p) => p[1]);
  let x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const pad = 0.12 * Math.max(x1 - x0, z1 - z0, 1);
  x0 -= pad; x1 += pad; z0 -= pad; z1 += pad;
  const k = Math.min(cw / (x1 - x0), ch / (z1 - z0));
  const ox = (cw - k * (x1 - x0)) / 2 - k * x0, oy = (ch - k * (z1 - z0)) / 2 - k * z0;
  const X = (p) => ox + k * p[0], Y = (p) => oy + k * p[1];
  g.strokeStyle = '#262d3c';
  g.lineWidth = 1;
  for (let v = Math.ceil(x0); v <= x1; v++) { g.beginPath(); g.moveTo(X([v, 0]), 0); g.lineTo(X([v, 0]), ch); g.stroke(); }
  for (let v = Math.ceil(z0); v <= z1; v++) { g.beginPath(); g.moveTo(0, Y([0, v])); g.lineTo(cw, Y([0, v])); g.stroke(); }
  for (const l of lines) {
    g.strokeStyle = l.color;
    g.lineWidth = l.width ?? 2;
    g.setLineDash(l.dash ? [8, 6] : []);
    g.beginPath();
    l.pts.forEach((p, i) => (i ? g.lineTo(X(p), Y(p)) : g.moveTo(X(p), Y(p))));
    g.stroke();
  }
  g.setLineDash([]);
  for (const pl of polys) {
    if (pl.pts.length < 2) continue;
    g.beginPath();
    pl.pts.forEach((p, i) => (i ? g.lineTo(X(p), Y(p)) : g.moveTo(X(p), Y(p))));
    g.closePath();
    if (pl.fill) { g.fillStyle = pl.fill; g.fill(); }
    g.strokeStyle = pl.stroke;
    g.lineWidth = 2.5;
    g.stroke();
  }
  g.font = 'bold 22px -apple-system, Segoe UI, Roboto, sans-serif';
  for (const mk of marks) {
    g.fillStyle = mk.color;
    g.beginPath();
    g.arc(X(mk.p), Y(mk.p), 6, 0, 2 * Math.PI);
    g.fill();
    if (mk.label) { g.lineWidth = 4; g.strokeStyle = '#0d1017'; g.strokeText(mk.label, X(mk.p) + 9, Y(mk.p) - 8); g.fillText(mk.label, X(mk.p) + 9, Y(mk.p) - 8); }
  }
  g.strokeStyle = '#3a4052';
  g.lineWidth = 2;
  g.strokeRect(1, 1, cw - 2, ch - 2);
}

// ---------------------------------------------------------------- small panels

/** matrices side by side, each with a caption */
export function matrixPanel(el, list) {
  el.innerHTML = `<div class="vl-mats">${list.map((x) => `<figure><figcaption>${x.name}</figcaption>${matHtml(rows4(x.m), [], 3, x.d ?? 2).replace(/\{[^|}]*\|([^}]*)\}/g, '$1')}</figure>`).join('')}</div>`;
}

/** an SVG line chart: series [{ fn, color, label }], with a marker at (at, atY) and optional vertical guides */
export function curveSvg(el, { x, y, series, at = null, atY = null, guides = [], xLabel = '', yLabel = '' }) {
  const W = 360, H = 190, L = 34, R = 10, Tp = 10, B = 26;
  const X = (v) => L + ((v - x[0]) / (x[1] - x[0])) * (W - L - R);
  const Y = (v) => H - B - ((v - y[0]) / (y[1] - y[0])) * (H - Tp - B);
  let s = `<svg class="vl-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${yLabel} against ${xLabel}">`;
  s += `<rect x="${L}" y="${Tp}" width="${W - L - R}" height="${H - Tp - B}" fill="#0b0c10" stroke="#2c3140"/>`;
  if (y[0] < 0 && y[1] > 0) s += `<line x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}" stroke="#2c3140" stroke-dasharray="3 3"/>`;
  for (const gd of guides) s += `<line x1="${X(gd.x)}" x2="${X(gd.x)}" y1="${Tp}" y2="${H - B}" stroke="${gd.color ?? '#3a4052'}" stroke-dasharray="3 3"/><text x="${X(gd.x) + 3}" y="${Tp + 11}" fill="${gd.color ?? '#79829a'}" font-size="10">${gd.label ?? ''}</text>`;
  for (const se of series) {
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const xv = x[0] + (i / 160) * (x[1] - x[0]);
      const yv = se.fn(xv);
      if (Number.isFinite(yv) && yv >= y[0] - 0.05 * (y[1] - y[0]) && yv <= y[1] + 0.05 * (y[1] - y[0])) pts.push(`${X(xv).toFixed(1)},${Y(yv).toFixed(1)}`);
    }
    s += `<polyline fill="none" stroke="${se.color}" stroke-width="${se.width ?? 1.8}" ${se.dash ? 'stroke-dasharray="4 3"' : ''} points="${pts.join(' ')}"/>`;
  }
  if (Number.isFinite(at) && Number.isFinite(atY)) {
    const cx = X(Math.min(x[1], Math.max(x[0], at))), cy = Y(Math.min(y[1], Math.max(y[0], atY)));
    s += `<line x1="${cx}" x2="${cx}" y1="${cy}" y2="${H - B}" stroke="#ffd166" stroke-dasharray="2 2"/><circle cx="${cx}" cy="${cy}" r="4" fill="#ffd166"/>`;
  }
  const label = (px, py, t, a = 'start', fill = '#79829a') => `<text x="${px}" y="${py}" fill="${fill}" font-size="10" text-anchor="${a}" font-family="-apple-system, Segoe UI, Roboto, sans-serif">${t}</text>`;
  s += label(L, H - 12, n(x[0], 1), 'middle') + label(W - R, H - 12, n(x[1], 1), 'middle') + label((L + W - R) / 2, H - 3, xLabel, 'middle');
  s += label(L - 4, Y(y[0]) + 3, n(y[0], 1), 'end') + label(L - 4, Y(y[1]) + 3, n(y[1], 1), 'end');
  let lx = L + 6;
  for (const se of series) if (se.label) { s += label(lx, H - B - 6, se.label, 'start', se.color); lx += 8 * se.label.length + 12; }
  el.innerHTML = `${s}</svg>`;
}
