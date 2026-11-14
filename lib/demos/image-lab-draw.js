// image-lab-draw: the 2D side of the image-lab demo. The pictures are images, not 3D, so they paint into the canvas the texture lab lays over
// the lab's scene (overlayFor, text, fitRect and the rail helpers come from tex-lab-draw.js). This file adds what an image lab needs: images
// drawn as crisp bitmaps or as numbered cells, the color maps, a small chart, the test images and their derived data, and the layout of
// panels in the scene pane. Nothing here computes a value of image processing: every number comes from lib/programs/image-lab/webgl/imagelab.js.
import * as I from '../programs/image-lab/webgl/imagelab.js';
import { overlayFor, text, arrow2d, fitRect, el, btn, segmented, once, panelCanvas } from './tex-lab-draw.js';

export { overlayFor, text, arrow2d, fitRect, el, btn, segmented, once, panelCanvas };

// ---------------------------------------------------------------- numbers as text

const clean = (x, d) => { const s = x.toFixed(d); return Number(s) === 0 ? (0).toFixed(d) : s; };
export const f = (x, d = 3) => (Number.isFinite(x) ? clean(x, d).replace('-', '−') : 'none');
export const f2 = (x) => f(x, 2);
export const f1 = (x) => f(x, 1);
export const f0 = (x) => f(x, 0);
/** a list of numbers as "(a, b, c)" */
export const list = (a, d = 2) => `(${Array.from(a).map((x) => f(x, d)).join(', ')})`;

// ---------------------------------------------------------------- colors

const g255 = (v) => Math.round(255 * Math.min(1, Math.max(0, v)));
export const grayRgb = (v) => { const g = g255(v); return [g, g, g]; };
export const grayCss = (v) => { const g = g255(v); return `rgb(${g},${g},${g})`; };
/** zero is dark; positive is blue, negative is red, full color at |v| = scale */
export function signedRgb(scale) {
  return (v) => {
    const k = Math.min(1, Math.abs(v) / (scale || 1));
    return v >= 0 ? [20 + 60 * k, 24 + 130 * k, 40 + 215 * k] : [40 + 215 * k, 24 + 80 * k, 24 + 70 * k];
  };
}
/** zero is mid-gray, for a response that goes both ways (a Sobel edge map, a Laplacian band) */
export function midGrayRgb(scale) {
  return (v) => grayRgb(0.5 + 0.5 * v / (scale || 1));
}
export const inkFor = (rgb) => (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2] > 135 ? '#14161d' : '#e7eaf0');

// ---------------------------------------------------------------- bitmaps and cells

/** the image as a w by h canvas, one canvas pixel per image pixel */
export function bitmapOf(values, w, h, color = grayRgb) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const gx = cv.getContext('2d');
  const img = gx.createImageData(w, h);
  for (let k = 0; k < w * h; k++) {
    const c = color(values[k], k);
    img.data[4 * k] = c[0]; img.data[4 * k + 1] = c[1]; img.data[4 * k + 2] = c[2]; img.data[4 * k + 3] = 255;
  }
  gx.putImageData(img, 0, 0);
  return cv;
}

/** a color image from three planes in [0, 255] */
export function bitmapRgb(r, gr, b, w, h) {
  return bitmapOf(r, w, h, (v, k) => [Math.min(255, Math.max(0, Math.round(v))), Math.min(255, Math.max(0, Math.round(gr[k]))), Math.min(255, Math.max(0, Math.round(b[k])))]);
}

export function drawBitmap(g, cv, r, { smooth = false, frame = true } = {}) {
  g.imageSmoothingEnabled = smooth;
  g.drawImage(cv, r.x, r.y, r.w, r.h);
  if (frame) { g.strokeStyle = '#2c3140'; g.lineWidth = 1; g.strokeRect(r.x - 0.5, r.y - 0.5, r.w + 1, r.h + 1); }
}

/**
 * The image as w by h cells with their numbers written in when the cells are large enough. cell is the side of one cell in canvas pixels;
 * fmt turns a value into text; label(k) may return a second line for a cell.
 */
export function drawCells(g, values, w, h, r, { color = grayRgb, fmt = f2, minCell = 24, gridLine = true, fontScale = 0.36, dimNumbers = false } = {}) {
  const cw = r.w / w, ch = r.h / h;
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const c = color(values[j * w + i], j * w + i);
      g.fillStyle = `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
      g.fillRect(r.x + i * cw, r.y + j * ch, cw + 0.6, ch + 0.6);
    }
  }
  if (gridLine && cw >= 8) {
    g.strokeStyle = 'rgba(11,12,16,0.5)'; g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i <= w; i++) { g.moveTo(r.x + i * cw, r.y); g.lineTo(r.x + i * cw, r.y + r.h); }
    for (let j = 0; j <= h; j++) { g.moveTo(r.x, r.y + j * ch); g.lineTo(r.x + r.w, r.y + j * ch); }
    g.stroke();
  }
  if (cw >= minCell && !dimNumbers) {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const c = color(values[j * w + i], j * w + i);
        text(g, fmt(values[j * w + i]), r.x + (i + 0.5) * cw, r.y + (j + 0.5) * ch, { size: Math.min(13, cw * fontScale), align: 'center', base: 'middle', color: inkFor(c), halo: false, weight: 600 });
      }
    }
  }
  g.strokeStyle = '#2c3140'; g.lineWidth = 1;
  g.strokeRect(r.x - 0.5, r.y - 0.5, r.w + 1, r.h + 1);
}

/** a one-line caption above a rectangle */
export function caption(g, str, r, { color = '#aab2c5', size = 12, align = 'left' } = {}) {
  text(g, str, align === 'left' ? r.x : align === 'center' ? r.x + r.w / 2 : r.x + r.w, r.y - 6, { size, color, align, halo: false, weight: 600 });
}

export function outline(g, x, y, w, h, color = '#ffd166', width = 2.5, shadow = true) {
  if (shadow) { g.strokeStyle = '#0b0c10'; g.lineWidth = width + 2; g.strokeRect(x, y, w, h); }
  g.strokeStyle = color; g.lineWidth = width; g.strokeRect(x, y, w, h);
}

/** the rectangle for cell (i, j) of an image drawn in r */
export const cellRect = (r, w, h, i, j) => ({ x: r.x + (i * r.w) / w, y: r.y + (j * r.h) / h, w: r.w / w, h: r.h / h });

/** the image cell under a canvas position in r, or null */
export function cellAt(r, w, h, x, y) {
  if (!r || x < r.x || y < r.y || x >= r.x + r.w || y >= r.y + r.h) return null;
  return { i: Math.min(w - 1, Math.floor(((x - r.x) / r.w) * w)), j: Math.min(h - 1, Math.floor(((y - r.y) / r.h) * h)) };
}

/** the largest rectangle for a w by h image inside a box, never magnified past maxZoom canvas pixels per image pixel; centered */
export function imageRect(box, w, h, maxZoom = 64) {
  const zoom = Math.min(box.w / w, box.h / h, maxZoom);
  return { x: box.x + (box.w - zoom * w) / 2, y: box.y + (box.h - zoom * h) / 2, w: zoom * w, h: zoom * h };
}

/** n boxes in a row (or a column) inside r with gaps; extra space above each box is left for a caption */
export function splitRow(r, n, gap = 14, weights = null) {
  const total = weights ? weights.reduce((a, b) => a + b, 0) : n;
  const free = r.w - gap * (n - 1);
  const out = [];
  let x = r.x;
  for (let k = 0; k < n; k++) {
    const w = (free * (weights ? weights[k] : 1)) / total;
    out.push({ x, y: r.y, w, h: r.h });
    x += w + gap;
  }
  return out;
}
export function splitCol(r, n, gap = 14, weights = null) {
  const total = weights ? weights.reduce((a, b) => a + b, 0) : n;
  const free = r.h - gap * (n - 1);
  const out = [];
  let y = r.y;
  for (let k = 0; k < n; k++) {
    const h = (free * (weights ? weights[k] : 1)) / total;
    out.push({ x: r.x, y, w: r.w, h });
    y += h + gap;
  }
  return out;
}

/** the drawing area of the scene: below the legend bar, inside a margin, with room above each panel for its caption */
export function area(ov, w, h, { left = 12, right = 12, bottom = 50 } = {}) {
  return { x: left, y: ov.top + 18, w: w - left - right, h: h - ov.top - 18 - bottom };
}

// ---------------------------------------------------------------- a chart

/**
 * An axis chart in r: spec = { x: [a, b], y: [a, b], xTicks, yTicks, xLabel, yLabel, series: [{ pts | fn, color, width, dash }], dots: [{ x, y, color, r }],
 * bars: [{ x0, x1, y, color }], vlines: [{ x, color, dash }], hlines: [{ y, color, dash }], labels: [{ x, y, t, color, align }] }
 */
export function drawChart(g, r, spec) {
  const L = 44, B = 28, T = 10, R = 12;
  const px = r.x + L, py = r.y + T, pw = r.w - L - R, ph = r.h - T - B;
  const X = (x) => px + ((x - spec.x[0]) / (spec.x[1] - spec.x[0])) * pw;
  const Y = (y) => py + ph - ((y - spec.y[0]) / (spec.y[1] - spec.y[0])) * ph;
  g.fillStyle = '#0f1117'; g.fillRect(px, py, pw, ph);
  g.strokeStyle = '#1f2330'; g.lineWidth = 1;
  for (const t of spec.xTicks ?? []) { g.beginPath(); g.moveTo(X(t.v ?? t), py); g.lineTo(X(t.v ?? t), py + ph); g.stroke(); }
  for (const t of spec.yTicks ?? []) { g.beginPath(); g.moveTo(px, Y(t.v ?? t)); g.lineTo(px + pw, Y(t.v ?? t)); g.stroke(); }
  g.save();
  g.beginPath(); g.rect(px, py, pw, ph); g.clip();
  for (const b of spec.bars ?? []) {
    g.fillStyle = b.color;
    const y0 = Y(Math.max(spec.y[0], 0)), y1 = Y(b.y);
    g.fillRect(X(b.x0), Math.min(y0, y1), Math.max(1, X(b.x1) - X(b.x0)), Math.abs(y0 - y1));
  }
  for (const hl of spec.hlines ?? []) { g.strokeStyle = hl.color ?? '#3a4152'; g.setLineDash(hl.dash ?? [4, 4]); g.lineWidth = 1; g.beginPath(); g.moveTo(px, Y(hl.y)); g.lineTo(px + pw, Y(hl.y)); g.stroke(); }
  for (const vl of spec.vlines ?? []) { g.strokeStyle = vl.color ?? '#ffd166'; g.setLineDash(vl.dash ?? [4, 4]); g.lineWidth = 1.2; g.beginPath(); g.moveTo(X(vl.x), py); g.lineTo(X(vl.x), py + ph); g.stroke(); }
  g.setLineDash([]);
  for (const s of spec.series ?? []) {
    g.strokeStyle = s.color; g.lineWidth = s.width ?? 2; g.setLineDash(s.dash ?? []);
    g.beginPath();
    const pts = s.pts ?? Array.from({ length: 161 }, (_, k) => { const x = spec.x[0] + (k / 160) * (spec.x[1] - spec.x[0]); return [x, s.fn(x)]; });
    pts.forEach(([x, y], k) => { if (k === 0) g.moveTo(X(x), Y(y)); else g.lineTo(X(x), Y(y)); });
    g.stroke(); g.setLineDash([]);
  }
  for (const d of spec.dots ?? []) { g.fillStyle = d.color ?? '#ffd166'; g.strokeStyle = '#0b0c10'; g.lineWidth = 1.5; g.beginPath(); g.arc(X(d.x), Y(d.y), d.r ?? 4, 0, 2 * Math.PI); g.fill(); g.stroke(); }
  g.restore();
  g.strokeStyle = '#2c3140'; g.strokeRect(px + 0.5, py + 0.5, pw, ph);
  for (const t of spec.xTicks ?? []) text(g, t.t ?? String(t.v ?? t), X(t.v ?? t), py + ph + 14, { size: 10.5, align: 'center', color: '#8b93a7', halo: false });
  for (const t of spec.yTicks ?? []) text(g, t.t ?? String(Number((t.v ?? t).toFixed(3))), px - 5, Y(t.v ?? t) + 3.5, { size: 10.5, align: 'right', color: '#8b93a7', halo: false });
  if (spec.xLabel) text(g, spec.xLabel, px + pw, py + ph + 26, { size: 11, align: 'right', color: '#aab2c5', halo: false });
  if (spec.yLabel) text(g, spec.yLabel, r.x, r.y + 8, { size: 11, color: '#aab2c5', halo: false });
  for (const lb of spec.labels ?? []) text(g, lb.t, X(lb.x), Y(lb.y), { size: lb.size ?? 11, color: lb.color ?? '#c7cdda', align: lb.align ?? 'left' });
  return { X, Y, px, py, pw, ph, invX: (cx) => spec.x[0] + ((cx - px) / pw) * (spec.x[1] - spec.x[0]) };
}

// ---------------------------------------------------------------- the overlay for a view

/** show the canvas with these pointer handlers, and hide the 3D view buttons it does not use */
export function setupOverlay(ctx, handlers) {
  if (!ctx.sceneEl) return;
  const ov = overlayFor(ctx);
  ov.handlers = handlers;
  ov.show(true);
  const row = ctx.sceneEl.querySelector('.lab-views');
  if (row) row.style.display = 'none';
}
export function leaveOverlay(ctx) {
  if (!ctx.sceneEl) return;
  const ov = overlayFor(ctx);
  ov.cancelJob();
  ov.show(false);
  ov.handlers = null;
  ov.painter = null;
  const row = ctx.sceneEl.querySelector('.lab-views');
  if (row) row.style.display = '';
}
/** set what the overlay paints and paint it; a no-op without a page (the node tests) */
export function paintWith(ctx, painter) {
  const ov = ctx.sceneEl ? overlayFor(ctx) : null;
  if (!ov) return null;
  ov.painter = (g, w, h) => painter(g, w, h, ov);
  ov.repaint();
  return ov;
}

// ---------------------------------------------------------------- the test images

const cache = new Map();
const once1 = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };

/** the gray images the filter views use: { id, label, w, h, data } */
export const FILTER_IMAGES = {
  glyph: { label: 'glyph 12 × 12', w: 12, h: 12, make: () => I.makeGlyph() },
  scene: { label: 'scene 16 × 16', w: 16, h: 16, make: () => I.makeScene(16) },
  ones: { label: 'all ones 6 × 6', w: 6, h: 6, make: () => new Array(36).fill(1) },
  edge: { label: 'edge 4 × 1', w: 4, h: 1, make: () => [0, 0, 1, 1] },
  salt: { label: 'spike 5 × 1', w: 5, h: 1, make: () => [0.2, 0.2, 1.0, 0.2, 0.2] },
  step: { label: 'step 6 × 1', w: 6, h: 1, make: () => [0, 0, 0, 1, 1, 1] },
  saltGlyph: {
    label: 'glyph with noise', w: 12, h: 12,
    make: () => {
      // seeded isolated wrong pixels: ink on paper and paper on ink, never next to one another
      const g = I.makeGlyph(), r = I.makeNoise(24, 20261105);
      const spots = [[1, 9], [2, 2], [3, 10], [5, 1], [6, 9], [8, 4], [8, 11], [10, 6], [0, 5], [11, 10]];
      spots.forEach(([i, j], k) => { g[i * 12 + j] = r[k] > 0.5 ? 0.99 : 0; });
      return g;
    },
  },
};
export function filterImage(id) {
  const spec = FILTER_IMAGES[id] ?? FILTER_IMAGES.glyph;
  return { id, label: spec.label, w: spec.w, h: spec.h, data: once1(`filter:${id}`, spec.make) };
}

/** the gray scene (the color scene's luma) at n by n pixels, and the color scene with planes 0 to 255 */
export const sceneAt = (n) => once1(`scene${n}`, () => I.makeScene(n));
export const colorAt255 = (n) => once1(`color${n}x255`, () => { const c = once1(`color${n}`, () => I.makeColorScene(n)); return { r: c.r.map((v) => v * 255), g: c.g.map((v) => v * 255), b: c.b.map((v) => v * 255) }; });
export const SCENE32 = () => sceneAt(32);
export const SCENE64 = () => sceneAt(64);
export const COLOR64 = () => once1('color64', () => I.makeColorScene(64));
export const COLOR64_255 = () => colorAt255(64);

// ---------------------------------------------------------------- resolution

/**
 * The sizes a picture of the scene can be computed at, as [default, choices]. The Fourier views need a power of two (the fast
 * transform); the other scene views need a multiple of 16 (8 by 8 JPEG blocks on chroma halved by 4:2:0, a pyramid of 4 levels).
 * The largest of each keeps an update of the slowest view in it under about 30 ms of JavaScript (measured in Chrome: a drag on the
 * spectrum at 64 about 12 ms, a quality step of the whole JPEG image or a pyramid step at 96 about 25 to 28 ms; at 128 the program's
 * computation alone takes 28 ms for the spectrum and 36 ms for the JPEG image, before any drawing).
 */
export const RESOLUTIONS = { fourier: [32, [16, 32, 64]], scene: [64, [32, 64, 96]] };
/** the lab's resolutions, one per picture, shared by the views that show that picture */
export function makeResolution() {
  return { fourier: RESOLUTIONS.fourier[0], scene: RESOLUTIONS.scene[0] };
}
/** the rail's row of sizes for one picture; returns its show() */
export function resolutionRow(parent, kind, res, set) {
  return segmented(parent, 'resolution', RESOLUTIONS[kind][1].map((n) => [n, `${n} × ${n}`]), () => res[kind], set);
}

/** the 8 by 8 block of the render the lecture works (x 40, y 72; values 86 to 116) */
export const LECTURE_BLOCK = [
  101, 101, 108, 97, 95, 104, 95, 89, 116, 115, 115, 114, 116, 116, 115, 114,
  102, 99, 90, 98, 108, 101, 105, 110, 99, 96, 87, 93, 104, 96, 100, 104,
  115, 112, 107, 110, 116, 110, 113, 115, 105, 106, 113, 105, 103, 111, 106, 103,
  96, 96, 103, 93, 91, 101, 93, 86, 108, 107, 112, 103, 100, 107, 100, 93,
];

/** an 8 by 8 block of the 64 by 64 scene (0 to 255), block coordinates bx, by in 0..7 */
export function sceneBlock(bx, by) {
  const s = SCENE64();
  const out = [];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) out.push(Math.round(255 * s[(by * 8 + y) * 64 + bx * 8 + x]));
  return out;
}
