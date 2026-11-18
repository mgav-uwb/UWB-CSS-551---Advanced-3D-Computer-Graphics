// particle-lab-draw: the 2D side of the particle-lab demo. Plots, the spring strip, number formats and the integrators' colors, drawn
// on the canvas that shading-lab-draw.js lays over the lab's scene. Nothing here computes a step: every number comes from
// lib/programs/particle-lab/webgl/particle.js.
import { text, arrow2d } from './shading-lab-draw.js';

export { overlayFor, showOverlay, hideOverlay, text, arrow2d, segmented, once, el, btn, injectCss } from './shading-lab-draw.js';

// ---------------------------------------------------------------- a view's caption

/** wraps a painter: a plain-language caption (what the picture shows) across the top, word-wrapped to the width, and the painter
 *  below it; ov.baseTop keeps the overlay's own top, so a painter can still tell a slide from the full page */
export function captioned(ov, caption, paint) {
  return (g, w, h) => {
    // on a slide the scene's corner buttons sit in the top right of the picture, so the caption stops short of them
    const top = ov.top, size = w < 520 ? 11.5 : 12.5, lh = size + 4.5, maxW = w - 28 - (top < 20 ? 110 : 0);
    g.font = `500 ${size}px -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
    const lines = [];
    let line = '';
    for (const word of caption.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && g.measureText(next).width > maxW) { lines.push(line); line = word; } else line = next;
    }
    if (line) lines.push(line);
    ov.baseTop = top;
    ov.top = top + lines.length * lh + 8;
    try { paint(g, w, h); } finally { ov.top = top; }
    // the caption goes on last, on its own band, so nothing the painter draws full height (a wall) runs through it
    g.fillStyle = '#0b0c10';
    g.fillRect(0, top, w, lines.length * lh + 6);
    lines.forEach((t, i) => text(g, t, 14, top + 13 + i * lh, { size, color: '#aab2c5', halo: false }));
  };
}

// ---------------------------------------------------------------- the integrators

export const KINDS = [
  { id: 'explicit', short: 'explicit', label: 'explicit Euler', color: '#ff7b72', hex: 0xff7b72 },
  { id: 'semi', short: 'semi-implicit', label: 'semi-implicit Euler', color: '#7ee787', hex: 0x7ee787 },
  { id: 'verlet', short: 'Verlet', label: 'Verlet', color: '#56d4dd', hex: 0x56d4dd },
  { id: 'implicit', short: 'implicit', label: 'implicit Euler (supplement)', color: '#d2a8ff', hex: 0xd2a8ff },
];
export const kindOf = (id) => KINDS.find((k) => k.id === id) ?? KINDS[0];
export const EXACT = '#aab2c5';
export const AMBER = '#ffc46b';
export const GRID = '#232734';
export const AXIS = '#4a5266';

// ---------------------------------------------------------------- number formats

const MINUS = '−';
export function num(x, digits = 4) {
  if (!Number.isFinite(x)) return x > 0 ? 'infinite' : x < 0 ? `${MINUS}infinite` : 'undefined';
  if (x === 0) return '0';
  const a = Math.abs(x);
  let s;
  if (a >= 1e5 || a < 1e-3) s = x.toExponential(2).replace('e+', ' × 10^').replace('e-', ` × 10^${MINUS}`).replace('.00', '');
  else s = String(Number(x.toPrecision(digits)));
  return s.replace(/^-/, MINUS);
}
/** a number in a formula row: the digits a student would write by hand */
export const fx2 = (x) => num(x, 3);
export const fixed = (x, d) => (Number.isFinite(x) ? x.toFixed(d).replace(/^-(0\.?0*)$/, '$1').replace(/^-/, MINUS) : 'none');
export const sci = (x) => (Number.isFinite(x) ? num(x, 3) : 'overflow');

// ---------------------------------------------------------------- ticks and plots

export function niceTicks(lo, hi, target = 5) {
  const span = hi - lo;
  if (!(span > 0) || !Number.isFinite(span)) return [lo];
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const out = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toPrecision(10)));
  return out;
}

/** a plot's frame with ticks and labels; returns the mappings. r is the plot area in canvas pixels; o: { xTitle, yTitle, xTicks, yTicks, zero } */
export function makePlot(g, r, xr, yr, o = {}) {
  const X = (v) => r.x + ((v - xr[0]) / (xr[1] - xr[0])) * r.w;
  const Y = (v) => r.y + r.h - ((v - yr[0]) / (yr[1] - yr[0])) * r.h;
  g.save();
  g.fillStyle = '#0f1117';
  g.fillRect(r.x, r.y, r.w, r.h);
  const xt = o.xTicks ?? niceTicks(xr[0], xr[1], Math.max(3, Math.round(r.w / 90)));
  const yt = o.yTicks ?? niceTicks(yr[0], yr[1], Math.max(3, Math.round(r.h / 50)));
  g.lineWidth = 1;
  for (const t of xt) {
    g.strokeStyle = GRID;
    g.beginPath(); g.moveTo(Math.round(X(t)) + 0.5, r.y); g.lineTo(Math.round(X(t)) + 0.5, r.y + r.h); g.stroke();
    text(g, o.xFormat ? o.xFormat(t) : num(t, 3), X(t), r.y + r.h + 15, { size: 12, align: 'center', color: '#8b93a7', halo: false });
  }
  for (const t of yt) {
    g.strokeStyle = t === 0 && o.zero !== false ? AXIS : GRID;
    g.beginPath(); g.moveTo(r.x, Math.round(Y(t)) + 0.5); g.lineTo(r.x + r.w, Math.round(Y(t)) + 0.5); g.stroke();
    text(g, o.yFormat ? o.yFormat(t) : num(t, 3), r.x - 5, Y(t) + 4, { size: 12, align: 'right', color: '#8b93a7', halo: false });
  }
  if (xr[0] < 0 && xr[1] > 0 && o.zero !== false) {
    g.strokeStyle = AXIS;
    g.beginPath(); g.moveTo(Math.round(X(0)) + 0.5, r.y); g.lineTo(Math.round(X(0)) + 0.5, r.y + r.h); g.stroke();
  }
  g.strokeStyle = AXIS;
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w, r.h);
  g.restore();
  if (o.xTitle) text(g, o.xTitle, r.x + r.w, r.y + r.h + 30, { size: 12, align: 'right', color: '#aab2c5', halo: false });
  if (o.title) text(g, o.title, r.x + 4, r.y - 6, { size: 13, color: '#c7cdda', weight: 600, halo: false });
  return { X, Y, r };
}

/** a polyline clipped to the plot; points with a non-finite coordinate break it */
export function line(g, plot, xs, ys, color, { width = 2, dash = null, alpha = 1 } = {}) {
  g.save();
  g.beginPath();
  g.rect(plot.r.x, plot.r.y, plot.r.w, plot.r.h);
  g.clip();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineJoin = 'round';
  if (dash) g.setLineDash(dash);
  g.beginPath();
  let pen = false;
  for (let i = 0; i < xs.length; i++) {
    if (!Number.isFinite(xs[i]) || !Number.isFinite(ys[i])) { pen = false; continue; }
    const px = plot.X(xs[i]), py = Math.max(plot.r.y - 400, Math.min(plot.r.y + plot.r.h + 400, plot.Y(ys[i])));
    if (pen) g.lineTo(px, py); else g.moveTo(px, py);
    pen = true;
  }
  g.stroke();
  g.restore();
}

/** dots clipped to the plot; hollow draws a ring */
export function dots(g, plot, xs, ys, color, { r = 3.5, hollow = false, alpha = 1, from = 0, to = xs.length - 1 } = {}) {
  g.save();
  g.beginPath();
  g.rect(plot.r.x - 3, plot.r.y - 3, plot.r.w + 6, plot.r.h + 6);
  g.clip();
  g.globalAlpha = alpha;
  g.fillStyle = color;
  g.strokeStyle = color;
  g.lineWidth = 1.6;
  for (let i = from; i <= to && i < xs.length; i++) {
    if (!Number.isFinite(xs[i]) || !Number.isFinite(ys[i])) continue;
    g.beginPath();
    g.arc(plot.X(xs[i]), plot.Y(ys[i]), r, 0, 2 * Math.PI);
    if (hollow) g.stroke(); else g.fill();
  }
  g.restore();
}

/** a legend line: a colored swatch and a label; returns the width used */
export function swatch(g, x, y, color, label, { size = 12, dashed = false, dot = false, ring = false } = {}) {
  g.save();
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = 2.2;
  if (dashed) g.setLineDash([4, 3]);
  if (dot) {
    g.beginPath(); g.arc(x + 6, y - 4, 4, 0, 2 * Math.PI);
    if (ring) g.stroke(); else g.fill();
  } else {
    g.beginPath(); g.moveTo(x, y - 4); g.lineTo(x + 13, y - 4); g.stroke();
  }
  g.restore();
  text(g, label, x + 19, y, { size, color: '#c7cdda', halo: false });
  g.font = `500 ${size}px -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
  return 19 + g.measureText(label).width + 12;
}

/** a zigzag spring from (x0, y) to (x1, y) */
export function coil(g, x0, x1, y, color, turns = 10, amp = 11, width = 2) {
  g.save();
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(x0, y);
  const lead = Math.min(10, Math.abs(x1 - x0) * 0.15) * Math.sign(x1 - x0 || 1);
  g.lineTo(x0 + lead, y);
  const a = x0 + lead, b = x1 - lead;
  for (let i = 0; i < turns * 2; i++) g.lineTo(a + ((b - a) * (i + 0.5)) / (turns * 2), y + (i % 2 === 0 ? -amp : amp));
  g.lineTo(b, y);
  g.lineTo(x1, y);
  g.stroke();
  g.restore();
}

/** a wall: a thick bar with hatching on its far side */
export function wallBar(g, x, y0, y1, side = -1) {
  g.save();
  g.strokeStyle = '#5c667c';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke();
  g.lineWidth = 1;
  for (let y = y0; y < y1; y += 8) { g.beginPath(); g.moveTo(x, y + 8); g.lineTo(x + side * 8, y); g.stroke(); }
  g.restore();
}

