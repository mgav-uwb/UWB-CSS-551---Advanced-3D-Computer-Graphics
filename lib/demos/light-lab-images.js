// light-lab-images: what light-lab (lib/demos/light-lab.js) draws besides the 3D scene: small DOM helpers, an SVG chart, and the pane of
// images the program renders per pixel. A Stage covers the lab's scene with square canvases; paint(cell, ...) fills one in slices of
// about 10 ms, so the page stays responsive, and a newer paint of the same cell cancels the older one. The pixel values come from the
// WebGL program's functions (lib/programs/light-lab/webgl/lightlab.js), called by the views; this file only moves bytes.
import * as LL from '../programs/light-lab/webgl/lightlab.js';

// ---------------------------------------------------------------- DOM helpers (browser only)

export function el(tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
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

/** a row of mutually exclusive buttons; returns its show() */
export function segmented(parent, label, options, get, set) {
  const row = el('div', 'lab-btns ll-seg', parent);
  if (label) el('span', 'll-seglabel', row, label);
  const bs = options.map(([value, text]) => {
    const b = btn(row, text, () => { set(value); show(); });
    b.dataset.value = String(value);
    return b;
  });
  function show() { bs.forEach((b) => b.classList.toggle('on', b.dataset.value === String(get()))); }
  show();
  return show;
}

/** the resolution of the lab's per-pixel images: one value, res.step, shared by every view that has one; sizes are a view's
 *  own square sizes in pixels, the default at RES_DEFAULT. resolutionRow is its segmented row; returns its show() */
export const RES_DEFAULT = 1;
const stepOf = (sizes, res) => Math.max(0, Math.min(sizes.length - 1, res.step));
export const sizeOf = (sizes, res) => sizes[stepOf(sizes, res)];
export function resolutionRow(parent, sizes, res, changed) {
  return segmented(parent, 'resolution', sizes.map((n, i) => [i, `${n} × ${n}`]), () => stepOf(sizes, res), (v) => { res.step = v; changed(); });
}

/** panels build once per view, and update what changes */
export function once(host, id, build) {
  if (host.dataset.built === id) return false;
  host.innerHTML = '';
  host.dataset.built = id;
  build(host);
  return true;
}

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ---------------------------------------------------------------- an SVG chart

const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
const num = (x) => (Math.abs(x) >= 100 || Number.isInteger(x) ? String(Math.round(x)) : String(Number(x.toPrecision(2))));

/** { w, h, x: [lo, hi], y: [lo, hi], logX?, logY?, xTicks?, yTicks?, series: [{ fn | pts, color, dash?, label?, width? }],
 *    marks: [{ x, y?, color, label?, line? }], xLabel?, yLabel?, title? }  ->  an SVG string. A series is clipped to the y range. */
export function chart(c) {
  const W = c.w ?? 400, H = c.h ?? 170, L = 38, R = 8, T = 18, B = 26;
  const tx = (x) => (c.logX ? Math.log(x) : x);
  const ty = (y) => (c.logY ? Math.log(y) : y);
  const X = (x) => L + ((tx(x) - tx(c.x[0])) / (tx(c.x[1]) - tx(c.x[0]))) * (W - L - R);
  const Y = (y) => H - B - ((ty(Math.min(c.y[1], Math.max(c.y[0], y))) - ty(c.y[0])) / (ty(c.y[1]) - ty(c.y[0]))) * (H - T - B);
  const font = 'font-family="-apple-system, Segoe UI, Roboto, sans-serif"';
  let s = `<svg class="ll-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(c.title ?? 'chart')}">`;
  for (const t of c.yTicks ?? []) s += `<line x1="${L}" x2="${W - R}" y1="${Y(t).toFixed(1)}" y2="${Y(t).toFixed(1)}" stroke="#20242f"/><text x="${L - 4}" y="${(Y(t) + 3).toFixed(1)}" fill="#79829a" font-size="9.5" text-anchor="end" ${font}>${esc(num(t))}</text>`;
  for (const t of c.xTicks ?? []) s += `<line x1="${X(t).toFixed(1)}" x2="${X(t).toFixed(1)}" y1="${T}" y2="${H - B}" stroke="#20242f"/><text x="${X(t).toFixed(1)}" y="${H - B + 11}" fill="#79829a" font-size="9.5" text-anchor="middle" ${font}>${esc(num(t))}</text>`;
  s += `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#3a4152"/><line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" stroke="#3a4152"/>`;
  for (const m of c.marks ?? []) {
    if (m.line !== false && Number.isFinite(m.x) && m.x >= c.x[0] && m.x <= c.x[1]) s += `<line x1="${X(m.x).toFixed(1)}" x2="${X(m.x).toFixed(1)}" y1="${T}" y2="${H - B}" stroke="${hex(m.color)}" stroke-width="1" stroke-dasharray="3 3" opacity="0.8"/>`;
  }
  for (const se of c.series ?? []) {
    const pts = [];
    if (se.pts) { for (const [x, y] of se.pts) if (Number.isFinite(y) && x >= c.x[0] && x <= c.x[1]) pts.push(`${X(x).toFixed(1)},${Y(y).toFixed(1)}`); }
    else {
      for (let i = 0; i <= 120; i++) {
        const x = c.logX ? Math.exp(tx(c.x[0]) + (i / 120) * (tx(c.x[1]) - tx(c.x[0]))) : c.x[0] + (i / 120) * (c.x[1] - c.x[0]);
        const y = se.fn(x);
        if (Number.isFinite(y)) pts.push(`${X(x).toFixed(1)},${Y(y).toFixed(1)}`);
      }
    }
    s += `<polyline fill="none" stroke="${hex(se.color)}" stroke-width="${se.width ?? 1.6}"${se.dash ? ' stroke-dasharray="4 3"' : ''} points="${pts.join(' ')}"/>`;
  }
  for (const m of c.marks ?? []) {
    if (Number.isFinite(m.x) && Number.isFinite(m.y) && m.x >= c.x[0] && m.x <= c.x[1]) {
      s += `<circle cx="${X(m.x).toFixed(1)}" cy="${Y(m.y).toFixed(1)}" r="3.4" fill="${hex(m.color)}" stroke="#0b0c10"/>`;
      if (m.label) s += `<text x="${Math.min(W - R - 2, X(m.x) + 6).toFixed(1)}" y="${(Y(m.y) - 5).toFixed(1)}" fill="${hex(m.color)}" font-size="10" ${font}>${esc(m.label)}</text>`;
    }
  }
  let ly = T + 2;
  for (const se of c.series ?? []) {
    if (!se.label) continue;
    s += `<line x1="${W - R - 118}" x2="${W - R - 104}" y1="${ly}" y2="${ly}" stroke="${hex(se.color)}" stroke-width="2"${se.dash ? ' stroke-dasharray="4 3"' : ''}/><text x="${W - R - 100}" y="${ly + 3}" fill="#aab2c5" font-size="9.5" ${font}>${esc(se.label)}</text>`;
    ly += 11;
  }
  if (c.title) s += `<text x="${L}" y="11" fill="#aab2c5" font-size="10.5" font-weight="600" ${font}>${esc(c.title)}</text>`;
  if (c.xLabel) s += `<text x="${(L + W - R) / 2}" y="${H - 2}" fill="#79829a" font-size="9.5" text-anchor="middle" ${font}>${esc(c.xLabel)}</text>`;
  return `${s}</svg>`;
}

// ---------------------------------------------------------------- the stage: canvases over the scene

const CSS = `
.ll-seg { align-items: center; }
.ll-seglabel { font: 500 11px/1 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; margin-right: 3px; min-width: 46px; }
.ll-chart { display: block; width: 100%; height: auto; margin-top: 4px; }
.ll-sw { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.ll-swatch { flex: 1 1 56px; min-width: 56px; text-align: center; font: 10.5px/1.3 -apple-system, Segoe UI, Roboto, sans-serif; color: #aab2c5; }
.ll-swatch i { display: block; height: 30px; border-radius: 4px; border: 1px solid #2c3140; margin-bottom: 2px; }
.ll-swatch b { display: block; font: 600 10px/1.3 'SF Mono', Menlo, monospace; color: #d6dbe5; }
.ll-swatch.big i { height: 38px; border-color: #7a8399; }
.ll-note { margin: 4px 0 0; font: 11px/1.4 -apple-system, Segoe UI, Roboto, sans-serif; color: #79829a; }
.ll-stage { position: absolute; inset: 8px 8px 74px 8px; z-index: 2; background: #0b0c10; display: flex; gap: 10px; align-items: center; justify-content: center; }
.ll-stage.col { flex-direction: column; gap: 6px; }
.demo-shell-root--embed .ll-stage { inset: 6px 6px 64px 6px; }
.ll-cell { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 0; min-height: 0; }
.ll-stage.col .ll-cell { flex-direction: row; gap: 10px; width: 100%; }
.ll-cap { font: 600 12.5px/1.3 -apple-system, Segoe UI, Roboto, sans-serif; color: #c7cdda; margin-bottom: 5px; text-align: center; max-width: 100%; }
.ll-stage.col .ll-cap { flex: 0 0 22%; text-align: right; margin: 0; font-size: 12px; }
.ll-wrap { position: relative; line-height: 0; }
.ll-wrap canvas { display: block; border-radius: 4px; background: #14161d; cursor: crosshair; }
.ll-mark { position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px; border: 2px solid #ffd166; border-radius: 50%; box-shadow: 0 0 0 1px #0b0c10; pointer-events: none; }
`;
export function injectCss() {
  if (typeof document === 'undefined' || document.getElementById('ll-css')) return;
  const st = document.createElement('style');
  st.id = 'll-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

/** specs: [{ aspect (width / height), caption, w, h (canvas pixels), smooth, follow (canvas pixels follow the css size) }] */
export class Stage {
  constructor(sceneEl, specs, { column = false } = {}) {
    injectCss();
    this.sceneEl = sceneEl;
    this.column = column;
    this.el = el('div', `ll-stage${column ? ' col' : ''}`, sceneEl);
    this.cells = specs.map((spec) => {
      const cell = el('div', 'll-cell', this.el);
      const cap = el('div', 'll-cap', cell, spec.caption ?? '');
      const wrap = el('div', 'll-wrap', cell);
      const canvas = el('canvas', '', wrap);
      canvas.width = spec.w ?? 200;
      canvas.height = spec.h ?? 200;
      if (spec.smooth === false) canvas.style.imageRendering = 'pixelated';
      const marker = el('div', 'll-mark', wrap);
      marker.style.display = 'none';
      const c = { spec, el: cell, cap, wrap, canvas, g: canvas.getContext('2d', { willReadFrequently: true }), marker, job: null, key: null, onClick: null, css: { w: 200, h: 200 } };
      canvas.addEventListener('click', (e) => {
        const b = canvas.getBoundingClientRect();
        c.onClick?.((e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height, e);
      });
      return c;
    });
    this.ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.layout()) : null;
    this.ro?.observe(this.el);
    this.layout();
  }

  layout() {
    const box = this.el.getBoundingClientRect();
    const n = this.cells.length;
    const gap = 10;
    for (const c of this.cells) {
      const aspect = c.spec.aspect ?? 1;
      const capH = this.column ? 0 : 26;
      const availW = this.column ? (box.width * 0.78 - gap) : (box.width - gap * (n - 1)) / n;
      const availH = this.column ? (box.height - 6 * (n - 1)) / n : box.height - capH;
      let w = Math.max(40, Math.min(availW, availH * aspect));
      let h = w / aspect;
      if (h > availH) { h = availH; w = h * aspect; }
      c.css = { w: Math.floor(w), h: Math.floor(h) };
      // important: a deck's demo-full rule sizes every canvas in the cockpit (lib.css), and these cells must keep their own size
      c.canvas.style.setProperty('width', `${c.css.w}px`, 'important');
      c.canvas.style.setProperty('height', `${c.css.h}px`, 'important');
      if (c.spec.follow && (c.canvas.width !== c.css.w || c.canvas.height !== c.css.h) && c.css.w > 40) {
        c.canvas.width = c.css.w;
        c.canvas.height = c.css.h;
        c.key = null;
        c.onResize?.(c);
      }
    }
  }

  get busy() { return this.cells.some((c) => c.job && !c.job.done); }

  /** the cell's canvas at w by h pixels (its size on screen stays); a new size clears it and forgets its key, so it repaints */
  size(cell, w, h) {
    if (cell.canvas.width === w && cell.canvas.height === h) return;
    cell.canvas.width = w;
    cell.canvas.height = h;
    cell.key = null;
  }

  /** where the marker sits, as fractions of the canvas, or null to hide it */
  mark(cell, u, v) {
    cell.marker.style.display = u == null ? 'none' : '';
    if (u != null) { cell.marker.style.left = `${u * 100}%`; cell.marker.style.top = `${v * 100}%`; }
  }

  destroy() {
    for (const c of this.cells) if (c.job) c.job.cancelled = true;
    this.ro?.disconnect();
    this.el.remove();
  }
}

/** work(i) for i = 0 .. count - 1 in slices of about 10 ms; done() at the end. A newer job on the cell cancels this one. */
export function slices(cell, count, work, done) {
  if (cell.job) cell.job.cancelled = true;
  const job = { cancelled: false, done: false };
  cell.job = job;
  let i = 0;
  function tick() {
    if (job.cancelled) return;
    const stop = performance.now() + 10;
    while (i < count && performance.now() < stop) work(i++);
    if (i < count) setTimeout(tick, 0);
    else { job.done = true; done?.(); }
  }
  setTimeout(tick, 0);
  return job;
}

/** fill a cell pixel by pixel: pixel(x, y, data, i) writes data[i], data[i + 1], data[i + 2] as bytes; a row at a time */
export function paint(cell, pixel, done) {
  const { width: w, height: h } = cell.canvas;
  const img = cell.g.createImageData(w, h);
  const data = img.data;
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  let from = 0;
  return slices(cell, h, (y) => {
    for (let x = 0; x < w; x++) pixel(x, y, data, (y * w + x) * 4);
    if (y % 8 === 7 || y === h - 1) { cell.g.putImageData(img, 0, 0, 0, from, w, y - from + 1); from = y + 1; }
  }, done);
}

/** the sRGB byte of a linear value, by the program's own encode */
export const byte = (linear) => LL.srgbEncode(linear).byte;
export function putRgb(data, i, rgb) { data[i] = byte(rgb[0]); data[i + 1] = byte(rgb[1]); data[i + 2] = byte(rgb[2]); }
export const BG = [11, 12, 16];
export function putBg(data, i) { data[i] = BG[0]; data[i + 1] = BG[1]; data[i + 2] = BG[2]; }
