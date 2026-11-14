// volume-lab-draw: the 2D side of the volume-lab demo. A canvas laid over the lab's scene (the pictures here are plots and an image,
// not 3D), a small plot kit, the rail panel helpers, and the chunked renderer for an image computed pixel by pixel. The lab runtime
// (lib/core/lab.js) has no notion of an image, so this file stays inside volume-lab; nothing here computes a volume-rendering result:
// every number comes from lib/programs/volume-lab/webgl/volumelab.js.
import { COL, css } from '../core/lab-viz.js';

// ---------------------------------------------------------------- colors and numbers

export const C = {
  ink: '#c7cdda', dim: '#8b93a7', faint: '#4a5266', grid: '#232733', axis: '#3a4152', bg: '#0b0c10',
  sigma: css(COL.gold), alpha: css(COL.amber), T: css(COL.b), w: css(COL.a), color: css(COL.c), exact: css(COL.white),
  coarse: css(COL.cyan), fine: css(COL.pink), good: css(COL.green), bad: css(COL.red), purple: css(COL.purple),
};
/** a color [r, g, b] in 0..1 as a CSS string */
export const rgbCss = (c, a = 1) => `rgba(${Math.round(255 * Math.min(1, Math.max(0, c[0])))},${Math.round(255 * Math.min(1, Math.max(0, c[1])))},${Math.round(255 * Math.min(1, Math.max(0, c[2])))},${a})`;

const clean = (x, d) => {
  const p = Math.pow(10, d);
  const s = (Math.sign(x) * Math.round(Math.abs(x) * p + 1e-7) / p).toFixed(d);
  return Number(s) === 0 ? (0).toFixed(d) : s;
};
/** a number as text with a true minus sign, and no minus on a zero */
export const f = (x, d = 3) => (Number.isFinite(x) ? clean(x, d).replace('-', '−') : 'none');
export const f3 = (c, d = 3) => `(${c.map((x) => f(x, d)).join(', ')})`;
/** a tick label: no trailing zeros */
export const tick = (v) => String(Number(v.toFixed(4))).replace('-', '−');
const sub = (i) => String(i).split('').map((ch) => '₀₁₂₃₄₅₆₇₈₉'[Number(ch)]).join('');
/** the subscript digits of a (one-based) sample number */
export const subscript = sub;

// ---------------------------------------------------------------- the overlay canvas

const overlays = new WeakMap();

/** the canvas over the scene: pictures paint into it through ov.painter(g, w, h); handlers get the mouse in canvas pixels */
export function overlayFor(ctx) {
  let ov = overlays.get(ctx.sceneEl);
  if (!ov) {
    ov = new Overlay(ctx);
    overlays.set(ctx.sceneEl, ov);
  }
  return ov;
}

class Overlay {
  constructor(ctx) {
    this.ctx = ctx;
    const cv = document.createElement('canvas');
    cv.className = 'vl-overlay';
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;z-index:1;display:none;touch-action:none;background:#0b0c10';
    cv.setAttribute('role', 'img');
    ctx.sceneEl.appendChild(cv);
    this.cv = cv;
    this.g = cv.getContext('2d');
    this.w = 0;
    this.h = 0;
    this.painter = null;
    this.handlers = null;
    this.hoverKey = null;
    this.visible = false;
    this.top = ctx.stage === 'embed' ? 14 : 44;      // the full page has a legend bar along the top of the scene
    this.bottom = ctx.stage === 'embed' ? 84 : 66;   // the lab's caption sits over the lower left
    this.dragging = false;
    const pos = (e) => {
      const b = cv.getBoundingClientRect();
      return { x: e.clientX - b.left, y: e.clientY - b.top };
    };
    cv.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      this.dragging = true;
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events have no capture */ }
      const p = pos(e);
      this.handlers?.down?.(p.x, p.y, e);
    });
    cv.addEventListener('pointermove', (e) => {
      const p = pos(e);
      if (this.dragging) this.handlers?.move?.(p.x, p.y, e);
      else this.handlers?.hover?.(p.x, p.y, e);
    });
    const end = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      const p = pos(e);
      this.handlers?.up?.(p.x, p.y, e);
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', () => { if (!this.dragging) this.handlers?.leave?.(); });
    for (const ev of ['mousedown', 'wheel']) cv.addEventListener(ev, (e) => e.stopPropagation());
    this.resize = new ResizeObserver(() => { this.fit(); this.repaint(); });
    this.resize.observe(ctx.sceneEl);
    // a formula term or a value hovered in the rail names a part of the picture
    ctx.shell.rootEl.addEventListener('mouseover', (e) => {
      const hit = e.target.closest ? e.target.closest('[data-k]') : null;
      const key = hit && !cv.contains(hit) ? hit.dataset.k : null;
      if (key !== this.hoverKey) { this.hoverKey = key; this.repaint(); }
    });
    ctx.shell.rootEl.addEventListener('mouseleave', () => { if (this.hoverKey) { this.hoverKey = null; this.repaint(); } });
  }

  show(on) {
    this.visible = on;
    this.cv.style.display = on ? 'block' : 'none';
    if (on) this.fit();
  }

  fit() {
    const b = this.cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, Math.round(b.width));
    this.h = Math.max(1, Math.round(b.height));
    this.cv.width = Math.round(this.w * dpr);
    this.cv.height = Math.round(this.h * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** the free area of the canvas as a rectangle */
  area() {
    return { x: 8, y: this.top, w: this.w - 16, h: this.h - this.top - this.bottom };
  }

  repaint() {
    if (!this.visible || !this.painter) return;
    if (this.cv.width < 2) this.fit();
    this.g.clearRect(0, 0, this.w, this.h);
    this.g.fillStyle = C.bg;
    this.g.fillRect(0, 0, this.w, this.h);
    this.painter(this.g, this.w, this.h);
  }

  /** 1 when nothing is hovered or key is, else a dimmed 0.3 */
  dim(...keys) {
    return !this.hoverKey || keys.includes(this.hoverKey) ? 1 : 0.3;
  }
}

export function setupOverlay(ctx, handlers) {
  if (!ctx.sceneEl) return null;
  const ov = overlayFor(ctx);
  ov.handlers = handlers ?? null;
  ov.show(true);
  const row = ctx.sceneEl.querySelector('.lab-views');
  if (row) row.style.display = 'none';
  return ov;
}

export function leaveOverlay(ctx) {
  if (!ctx.sceneEl) return;
  const ov = overlayFor(ctx);
  ov.show(false);
  ov.handlers = null;
  ov.painter = null;
  const row = ctx.sceneEl.querySelector('.lab-views');
  if (row) row.style.display = '';
}

// ---------------------------------------------------------------- text and shapes

export function text(g, str, x, y, { size = 12, color = C.ink, align = 'left', weight = 500, base = 'alphabetic', halo = true } = {}) {
  g.font = `${weight} ${size}px -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
  g.textAlign = align;
  g.textBaseline = base;
  if (halo) {
    g.lineJoin = 'round';
    g.lineWidth = 3.5;
    g.strokeStyle = 'rgba(11,12,16,0.9)';
    g.strokeText(str, x, y);
  }
  g.fillStyle = color;
  g.fillText(str, x, y);
}

/** a rounded label on a dark pill, for values that sit on a busy picture */
export function pill(g, str, x, y, color, { size = 12, align = 'left' } = {}) {
  g.font = `700 ${size}px -apple-system, Segoe UI, Roboto, sans-serif`;
  const w = g.measureText(str).width + 12;
  const x0 = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  g.fillStyle = 'rgba(11,12,16,0.85)';
  g.fillRect(x0, y - size - 2, w, size + 7);
  text(g, str, x0 + 6, y, { size, color, weight: 700, halo: false });
}

/** a row of colored labels, right-aligned at x, each followed by a gap: items are [text, color] */
export function legendRow(g, x, y, items, { size = 12 } = {}) {
  let at = x;
  for (let i = items.length - 1; i >= 0; i--) {
    const [label, color] = items[i];
    g.font = `600 ${size}px -apple-system, Segoe UI, Roboto, sans-serif`;
    text(g, label, at, y, { size, color, align: 'right', weight: 600, halo: false });
    at -= g.measureText(label).width + 18;
  }
}

/** a stack of colored labels at x, the last item on the baseline y, for the empty corner of a plot */
export function legendColumn(g, x, y, items, { size = 11.5 } = {}) {
  items.slice().reverse().forEach(([label, color], i) => text(g, label, x, y - i * (size + 5), { size, color, weight: 600 }));
}

/** the largest rectangle of the given aspect that fits in the box, centered */
export function fitRect(boxX, boxY, boxW, boxH, aspect) {
  let w = boxW, h = boxW / aspect;
  if (h > boxH) { h = boxH; w = boxH * aspect; }
  return { x: boxX + (boxW - w) / 2, y: boxY + (boxH - h) / 2, w, h };
}

// ---------------------------------------------------------------- a plot

/**
 * A plot in the box { x, y, w, h } of the canvas g with data ranges xr and yr. frame() draws the title, grid and ticks; the other
 * methods draw in data coordinates, clipped to the axes.
 */
export class Plot {
  constructor(g, box, { xr, yr, title = '', xlabel = '', ylabel = '', xticks = null, yticks = null, left = 44, right = 12, top = 20, bottom = 22, grid = true, log = false } = {}) {
    this.g = g;
    this.box = box;
    this.xr = xr;
    this.yr = yr;
    this.title = title;
    this.xlabel = xlabel;
    this.ylabel = ylabel;
    this.xticks = xticks;
    this.yticks = yticks;
    this.grid = grid;
    this.x0 = box.x + left;
    this.x1 = box.x + box.w - right;
    this.y0 = box.y + top;
    this.y1 = box.y + box.h - bottom - (xlabel ? 11 : 0);       // the axis name takes a line under the tick labels
  }

  sx(x) { return this.x0 + ((x - this.xr[0]) / (this.xr[1] - this.xr[0])) * (this.x1 - this.x0); }

  sy(y) { return this.y1 - ((y - this.yr[0]) / (this.yr[1] - this.yr[0])) * (this.y1 - this.y0); }

  dataX(px) { return this.xr[0] + ((px - this.x0) / (this.x1 - this.x0)) * (this.xr[1] - this.xr[0]); }

  dataY(py) { return this.yr[0] + ((this.y1 - py) / (this.y1 - this.y0)) * (this.yr[1] - this.yr[0]); }

  inside(px, py) { return px >= this.x0 && px <= this.x1 && py >= this.y0 && py <= this.y1; }

  frame() {
    const g = this.g;
    g.save();
    g.lineWidth = 1;
    for (const v of this.xticks ?? []) {
      const x = Math.round(this.sx(v)) + 0.5;
      if (this.grid) { g.strokeStyle = C.grid; g.beginPath(); g.moveTo(x, this.y0); g.lineTo(x, this.y1); g.stroke(); }
      text(g, tick(v), x, this.y1 + 13, { size: 10.5, color: C.dim, align: 'center', halo: false });
    }
    for (const v of this.yticks ?? []) {
      const y = Math.round(this.sy(v)) + 0.5;
      if (this.grid) { g.strokeStyle = C.grid; g.beginPath(); g.moveTo(this.x0, y); g.lineTo(this.x1, y); g.stroke(); }
      text(g, tick(v), this.x0 - 6, y + 3.5, { size: 10.5, color: C.dim, align: 'right', halo: false });
    }
    g.strokeStyle = C.axis;
    g.strokeRect(this.x0 + 0.5, this.y0 + 0.5, this.x1 - this.x0, this.y1 - this.y0);
    if (this.title) text(g, this.title, this.x0, this.y0 - 6, { size: 12.5, color: C.ink, weight: 600, halo: false });
    if (this.xlabel) text(g, this.xlabel, (this.x0 + this.x1) / 2, this.y1 + 27, { size: 10.5, color: C.dim, align: 'center', halo: false });
    if (this.ylabel) text(g, this.ylabel, this.x1, this.y0 - 6, { size: 10.5, color: C.dim, align: 'right', halo: false });
    g.restore();
  }

  clip() {
    this.g.save();
    this.g.beginPath();
    this.g.rect(this.x0, this.y0, this.x1 - this.x0, this.y1 - this.y0);
    this.g.clip();
  }

  unclip() { this.g.restore(); }

  /** fn(x) over the x range in n steps; a non-finite value breaks the line */
  curve(fn, color, { width = 2, n = 240, from = this.xr[0], to = this.xr[1], dash = null, alpha = 1 } = {}) {
    const g = this.g;
    this.clip();
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.setLineDash(dash ?? []);
    g.beginPath();
    let pen = false;
    for (let i = 0; i <= n; i++) {
      const x = from + (i / n) * (to - from);
      const y = fn(x);
      if (!Number.isFinite(y)) { pen = false; continue; }
      const px = this.sx(x), py = this.sy(y);
      if (pen) g.lineTo(px, py); else g.moveTo(px, py);
      pen = true;
    }
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;
    this.unclip();
  }

  /** a polyline through data points [[x, y], ...] */
  line(points, color, { width = 2, dash = null, alpha = 1 } = {}) {
    const g = this.g;
    this.clip();
    g.globalAlpha = alpha;
    g.strokeStyle = color;
    g.lineWidth = width;
    g.lineJoin = 'round';
    g.setLineDash(dash ?? []);
    g.beginPath();
    points.forEach(([x, y], i) => { if (i) g.lineTo(this.sx(x), this.sy(y)); else g.moveTo(this.sx(x), this.sy(y)); });
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 1;
    this.unclip();
  }

  /** the area between fn and the line y = base, filled with a color or a gradient made by paint(x0, x1) */
  fill(fn, color, { n = 240, base = 0, alpha = 0.18, from = this.xr[0], to = this.xr[1] } = {}) {
    const g = this.g;
    this.clip();
    g.fillStyle = color;
    g.globalAlpha = alpha;
    g.beginPath();
    g.moveTo(this.sx(from), this.sy(base));
    for (let i = 0; i <= n; i++) {
      const x = from + (i / n) * (to - from);
      g.lineTo(this.sx(x), this.sy(fn(x)));
    }
    g.lineTo(this.sx(to), this.sy(base));
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
    this.unclip();
  }

  hline(y, color, { dash = [5, 4], width = 1, label = '', labelAt = 'right', labelColor } = {}) {
    const g = this.g;
    this.clip();
    g.strokeStyle = color;
    g.lineWidth = width;
    g.setLineDash(dash);
    g.beginPath();
    g.moveTo(this.x0, Math.round(this.sy(y)) + 0.5);
    g.lineTo(this.x1, Math.round(this.sy(y)) + 0.5);
    g.stroke();
    g.setLineDash([]);
    this.unclip();
    if (label) text(g, label, labelAt === 'right' ? this.x1 - 4 : this.x0 + 4, this.sy(y) - 5, { size: 11, color: labelColor ?? color, align: labelAt === 'right' ? 'right' : 'left' });
  }

  vline(x, color, { dash = [5, 4], width = 1, label = '', labelColor, labelSide = 'right' } = {}) {
    const g = this.g;
    this.clip();
    g.strokeStyle = color;
    g.lineWidth = width;
    g.setLineDash(dash);
    g.beginPath();
    g.moveTo(Math.round(this.sx(x)) + 0.5, this.y0);
    g.lineTo(Math.round(this.sx(x)) + 0.5, this.y1);
    g.stroke();
    g.setLineDash([]);
    this.unclip();
    if (label) {
      g.font = '500 11px -apple-system, Segoe UI, Roboto, sans-serif';
      const wide = g.measureText(label).width + 10;
      const side = labelSide === 'right' && this.sx(x) + wide > this.x1 ? 'left' : labelSide === 'left' && this.sx(x) - wide < this.x0 ? 'right' : labelSide;
      text(g, label, this.sx(x) + (side === 'right' ? 5 : -5), this.y0 + 13, { size: 11, color: labelColor ?? color, align: side === 'right' ? 'left' : 'right' });
    }
  }

  dot(x, y, r, color, { stroke = null, alpha = 1 } = {}) {
    const g = this.g;
    g.globalAlpha = alpha;
    g.beginPath();
    g.arc(this.sx(x), this.sy(y), r, 0, Math.PI * 2);
    g.fillStyle = color;
    g.fill();
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.5; g.stroke(); }
    g.globalAlpha = 1;
  }

  /** a bar from y = base to y between data x values a and b */
  bar(a, b, y, color, { base = 0, alpha = 1 } = {}) {
    const g = this.g;
    this.clip();
    g.globalAlpha = alpha;
    g.fillStyle = color;
    const x0 = this.sx(a), x1 = this.sx(b), y0 = this.sy(base), y1 = this.sy(y);
    g.fillRect(x0, Math.min(y0, y1), Math.max(1, x1 - x0), Math.abs(y0 - y1));
    g.globalAlpha = 1;
    this.unclip();
  }

  label(str, x, y, opts) { text(this.g, str, this.sx(x), this.sy(y), opts); }
}

// ---------------------------------------------------------------- rail panel helpers

export function el(tag, cls, parent, content) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (content !== undefined) e.textContent = content;
  if (parent) parent.appendChild(e);
  return e;
}

export function btn(parent, label, onClick, title) {
  const b = el('button', 'lab-btn', parent, label);
  b.type = 'button';
  if (title) b.title = title;
  b.addEventListener('click', (e) => { e.stopPropagation(); b.blur(); onClick(); });
  return b;
}

/** a row of mutually exclusive buttons; registers its show() with the host so every update refreshes the highlight */
export function segmented(host, label, options, get, set) {
  const row = el('div', 'lab-btns vl-seg', host);
  el('span', 'vl-seglabel', row, label);
  const bs = options.map(([value, text_]) => {
    const b = btn(row, text_, () => set(value));
    b.dataset.value = String(value);
    return b;
  });
  function show() { bs.forEach((b) => b.classList.toggle('on', b.dataset.value === String(get()))); }
  host._sync.push(show);
  show();
  return row;
}

/** panels build once per view, and refresh what changes on every update */
export function once(host, id, build) {
  if (host.dataset.built !== id) {
    host.innerHTML = '';
    host.dataset.built = id;
    host._sync = [];
    build(host);
  }
  host._sync.forEach((fn) => fn());
}

// ---------------------------------------------------------------- an image computed in chunks

/**
 * An image of w x h pixels computed a few rows at a time: pixelFn(i, j) returns [r, g, b] in 0..1. Each turn works for about 10 ms
 * and then yields, so the page keeps answering; start() with a new key stops the job before it, and cancel() stops it. The pixels
 * go to the job's canvas; onProgress(fraction) runs after each chunk.
 */
export class ImageJob {
  constructor() {
    this.canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    this.key = null;
    this.id = 0;
    this.row = 0;
    this.done = false;
    this.w = 0;
    this.h = 0;
    this.longest = 0;
    this.ms = 0;
  }

  start(key, w, h, pixelFn, onProgress) {
    if (this.key === key) return;
    this.key = key;
    const id = ++this.id;
    this.canvas.width = w;
    this.canvas.height = h;
    this.w = w;
    this.h = h;
    this.row = 0;
    this.done = false;
    this.longest = 0;
    const bg = this.canvas.getContext('2d', { willReadFrequently: true });
    const img = bg.createImageData(w, h);
    const started = performance.now();
    const chunk = () => {
      if (this.id !== id) return;
      const t0 = performance.now();
      while (this.row < h && performance.now() - t0 < 10) {
        for (let i = 0; i < w; i++) {
          const c = pixelFn(i, this.row);
          const at = 4 * (this.row * w + i);
          img.data[at] = Math.round(255 * Math.min(1, Math.max(0, c[0])));
          img.data[at + 1] = Math.round(255 * Math.min(1, Math.max(0, c[1])));
          img.data[at + 2] = Math.round(255 * Math.min(1, Math.max(0, c[2])));
          img.data[at + 3] = 255;
        }
        this.row += 1;
      }
      bg.putImageData(img, 0, 0);
      if (this.row >= h) { this.done = true; this.ms = performance.now() - started; }
      this.longest = Math.max(this.longest, performance.now() - t0);
      onProgress?.(this.row / h, this.done);
      if (!this.done) setTimeout(chunk, 0);
    };
    chunk();
  }

  cancel() {
    this.id += 1;
    this.key = null;
  }
}
