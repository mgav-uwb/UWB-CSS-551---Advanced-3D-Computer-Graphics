// image-lab-filters: the Filter topic of the image-lab demo (runtime: lib/core/lab.js): convolution at a pixel and over the image, the
// median, the unsharp mask. Every number comes from lib/programs/image-lab/webgl/imagelab.js; the pictures paint into the canvas over the scene.
import * as I from '../programs/image-lab/webgl/imagelab.js';
import { COL } from '../core/lab-viz.js';
import {
  f, list, grayRgb, midGrayRgb, drawCells, drawBitmap, bitmapOf, caption, outline, cellAt, cellRect, area, splitRow, text,
  overlayFor, setupOverlay, leaveOverlay, paintWith, filterImage, el, btn, segmented, once, drawChart,
} from './image-lab-draw.js';

export const FILTER_KEYS = {
  x: COL.cyan, k: COL.pink, y: COL.gold, sum: COL.gold, border: COL.amber, blur: COL.b, detail: COL.c, amount: COL.pink, median: COL.green, box: COL.b, spike: COL.red,
  cost: COL.amber, kernel: COL.pink,
};

const KERNELS = [['box3', 'box 3×3'], ['gauss3', 'Gaussian 3×3'], ['gauss5', 'Gaussian 5×5'], ['sharpen', 'sharpen'], ['sobelX', 'Sobel x'], ['sobelY', 'Sobel y'], ['laplacian', 'Laplacian'], ['identity', 'identity']];
const KERNEL_NAME = Object.fromEntries(KERNELS);
const BORDERS = [['clamp', 'clamp'], ['wrap', 'wrap'], ['mirror', 'mirror'], ['zero', 'zero']];
const IMAGES = [['glyph', 'glyph'], ['scene', 'scene'], ['ones', 'all ones']];

/** the kernel array lives on the state (an array cannot sit in a view's init); it follows kernelId until the user edits a cell */
function ensureKernel(m) {
  if (!m.kernel || m.kernelFor !== m.kernelId) {
    const k = I.makeKernel(m.kernelId === 'custom' ? 'identity' : m.kernelId);
    m.kernel = k.values.slice();
    m.kernelFor = m.kernelId;
  }
  return Math.round(Math.sqrt(m.kernel.length));
}
export function setKernel(m, id) { m.kernelId = id; m.kernelFor = null; ensureKernel(m); }
const kernelLabel = (m) => (m.kernelId === 'custom' ? 'your kernel' : KERNEL_NAME[m.kernelId] ?? m.kernelId);

// ---------------------------------------------------------------- convolution

const CONV_INIT = { imageId: 'glyph', kernelId: 'gauss3', border: 'clamp', i: 5, j: 6 };
const set = (m, id, extra) => { setKernel(m, id); Object.assign(m, extra); };
const CONV_PRESETS = [
  { label: 'the lecture pixel: Gaussian', run: (m) => set(m, 'gauss3', { imageId: 'glyph', border: 'clamp', i: 5, j: 6 }) },
  { label: 'the same pixel: Sobel x', run: (m) => set(m, 'sobelX', { imageId: 'glyph', border: 'clamp', i: 5, j: 6 }) },
  { label: 'the same pixel: Sobel y', run: (m) => set(m, 'sobelY', { imageId: 'glyph', border: 'clamp', i: 5, j: 6 }) },
  { label: 'dark frame: box, zero border', run: (m) => set(m, 'box3', { imageId: 'ones', border: 'zero', i: 0, j: 0 }) },
  { label: 'no frame: box, clamp', run: (m) => set(m, 'box3', { imageId: 'ones', border: 'clamp', i: 0, j: 0 }) },
  { label: 'sharpen the glyph', run: (m) => set(m, 'sharpen', { imageId: 'glyph', border: 'clamp', i: 4, j: 6 }) },
  { label: 'Laplacian: edges only', run: (m) => set(m, 'laplacian', { imageId: 'glyph', border: 'clamp', i: 4, j: 6 }) },
  { label: 'Gaussian 5×5 on the scene', run: (m) => set(m, 'gauss5', { imageId: 'scene', border: 'wrap', i: 8, j: 8 }) },
];

function runConv(m) {
  const size = ensureKernel(m);
  const img = filterImage(m.imageId);
  m.i = Math.min(img.h - 1, Math.max(0, m.i)); m.j = Math.min(img.w - 1, Math.max(0, m.j));
  const px = I.convolvePixel(img.data, img.w, img.h, m.kernel, size, m.i, m.j, m.border);
  const whole = I.convolve(img.data, img.w, img.h, m.kernel, size, m.border);
  const sep = I.separate(m.kernel, size);
  return { img, size, ...px, whole, ...sep, weights: I.kernelSum(m.kernel) };
}

function convGeometry(w, h, ov, img, half) {
  const a = area(ov, w, h);
  const [l, r] = splitRow(a, 2, 30);
  const zoom = Math.min(l.w / (img.w + 2 * half), (l.h - 24) / (img.h + 2 * half), 60);
  const make = (box) => ({ x: box.x + (box.w - zoom * img.w) / 2, y: box.y + 14 + half * zoom, w: zoom * img.w, h: zoom * img.h });
  return { src: make(l), res: make(r), zoom };
}

function paintConv(g, w, h, ov, m, r) {
  const { img, size, whole } = r, half = (size - 1) / 2;
  const geo = convGeometry(w, h, ov, img, half);
  const flat = Math.abs(r.weights) < 1e-9 || m.kernel.some((v) => v < 0) && Math.abs(r.weights - 1) > 1e-9;
  const scale = Math.max(Math.abs(whole.low), Math.abs(whole.high), 1e-9);
  caption(g, `source (${img.w} × ${img.h}), the window is ${size} × ${size}`, geo.src);
  caption(g, flat ? 'result (mid-gray is 0)' : 'result', geo.res);
  drawCells(g, img.data, img.w, img.h, geo.src, { minCell: 24 });
  drawCells(g, whole.image, img.w, img.h, geo.res, { color: flat ? midGrayRgb(scale) : (v) => grayRgb(v), minCell: 24, fmt: (v) => f(v, 2) });
  // the window, with the border mapping for the cells that fall outside
  const cell = geo.zoom;
  for (let a = -half; a <= half; a++) {
    for (let b = -half; b <= half; b++) {
      const ci = m.i + a, cj = m.j + b;
      const inside = ci >= 0 && ci < img.h && cj >= 0 && cj < img.w;
      const x = geo.src.x + cj * cell, y = geo.src.y + ci * cell;
      const k = r.neighbors[(a + half) * size + b + half];
      if (!inside) {
        g.fillStyle = 'rgba(40,44,58,0.95)'; g.fillRect(x, y, cell, cell);
        g.strokeStyle = '#ff9f43'; g.setLineDash([3, 3]); g.strokeRect(x + 1, y + 1, cell - 2, cell - 2); g.setLineDash([]);
        if (cell >= 24) text(g, f(k, 2), x + cell / 2, y + cell * 0.36, { size: Math.min(12, cell * 0.34), align: 'center', base: 'middle', color: '#ffb36b', halo: false });
      }
      if (cell >= 24) text(g, f(m.kernel[(a + half) * size + b + half], size > 3 ? 2 : 3), x + cell / 2, y + cell * 0.8, { size: Math.min(11, cell * 0.3), align: 'center', base: 'middle', color: '#ff79c6', halo: true, weight: 700 });
    }
  }
  outline(g, geo.src.x + (m.j - half) * cell, geo.src.y + (m.i - half) * cell, size * cell, size * cell, '#ffd166', 3);
  const rc = cellRect(geo.res, img.w, img.h, m.j, m.i);
  outline(g, rc.x, rc.y, rc.w, rc.h, '#ffd166', 3);
  text(g, f(r.value, 3), rc.x + rc.w / 2, rc.y - 8, { size: 13, align: 'center', color: '#ffd166', weight: 700 });
  text(g, `border: ${m.border}`, geo.src.x + geo.src.w, geo.src.y + geo.src.h + half * cell + 22, { size: 12, color: '#ffb36b', align: 'right' });
}

function explainConv(m, r) {
  const { size } = r, half = (size - 1) / 2;
  const rows = [`pixel ({y|i}, {y|j}) = (${m.i}, ${m.j}), kernel ${kernelLabel(m)}, {border|${m.border}} border`];
  for (let a = 0; a < size; a++) {
    const terms = [], sub = [];
    for (let b = 0; b < size; b++) {
      const k = a * size + b;
      terms.push(`{k|${f(m.kernel[k], size > 3 ? 3 : 3)}}·{x|${f(r.neighbors[k], 2)}}`);
      sub.push(r.products[k]);
    }
    rows.push(`row ${a - half}: ${terms.join(' + ')} = ${f(sub.reduce((s, v) => s + v, 0), 4)}`);
  }
  rows.push(`{y|y(${m.i}, ${m.j})} = Σ K(a, b) x(i + a, j + b) = {y|${f(r.value, 4)}}`);
  const outside = r.neighbors.some((_, k) => { const a = Math.floor(k / size) - half, b = (k % size) - half; const ci = m.i + a, cj = m.j + b; return ci < 0 || cj < 0 || ci >= r.img.h || cj >= r.img.w; });
  const sum = r.weights;
  const reach = outside ? `; the window reaches past the image and ${m.border} supplies the missing pixels (orange cells)` : '';
  let status;
  if (outside && m.border === 'zero' && Math.abs(sum - 1) < 1e-9) status = { text: `zero border: the window reaches past the image and counts black, so this pixel averages in zeros (${f(r.value, 3)}): a dark frame`, tone: 'warn' };
  else if (Math.abs(sum - 1) < 1e-9) status = { text: `the kernel sums to 1: a constant image stays constant${reach}`, tone: 'ok' };
  else if (Math.abs(sum) < 1e-9) status = { text: `the kernel sums to 0: a constant image goes to 0; the response is large only where the image changes${reach}`, tone: 'info' };
  else status = { text: `the kernel sums to ${f(sum, 3)}: a constant image is multiplied by ${f(sum, 3)}${reach}`, tone: 'warn' };
  return {
    hud: `y(${m.i}, ${m.j}) = Σ K·x = {y|${f(r.value, 3)}}`,
    rows, status,
    values: [['Σ K', f(sum, 4), 'sum'], ['result range', `${f(r.whole.low, 2)} to ${f(r.whole.high, 2)}`, null], ['separable', r.separable ? 'yes' : 'no', 'cost'], ['multiply-adds', r.separable ? `${r.costFull} → ${r.costSeparable}` : `${r.costFull}`, 'cost']],
    fact: 'Written as in the lecture the sum is a correlation: a symmetric kernel gives the same numbers, and a Sobel kernel flips sign if the kernel is flipped.',
  };
}

function convPanel(host, m, r, ctx) {
  once(host, 'conv', (h) => {
    h.refreshers.push(segmented(h, 'image', IMAGES, () => m.imageId, (id) => { m.imageId = id; ctx.update(); }));
    h.refreshers.push(segmented(h, 'border', BORDERS, () => m.border, (id) => { m.border = id; ctx.update(); }));
    el('div', 'lab-sec', h, 'kernel');
    const row = el('div', 'lab-btns', h);
    for (const [id, label] of KERNELS) btn(row, label, () => { setKernel(m, id); ctx.update(); });
    h.grid = el('div', '', h);
    h.grid.style.cssText = 'display:grid;gap:3px;margin-top:4px';
    h.size = 0;
  });
  host.refreshers.forEach((s) => s());
  if (host.size !== r.size) {
    host.size = r.size;
    host.grid.innerHTML = '';
    host.grid.style.gridTemplateColumns = `repeat(${r.size}, 1fr)`;
    host.cells = [];
    for (let k = 0; k < r.size * r.size; k++) {
      const input = el('input', 'lab-num', host.grid);
      input.type = 'text'; input.style.cssText = 'width:100%;flex:none;text-align:center'; input.setAttribute('aria-label', `kernel cell ${k}`);
      input.addEventListener('change', () => {
        const v = parseFloat(input.value.replace('−', '-'));
        if (Number.isFinite(v)) { ensureKernel(m); m.kernel[k] = v; m.kernelId = 'custom'; m.kernelFor = 'custom'; }
        ctx.update();
      });
      host.cells.push(input);
    }
  }
  host.cells.forEach((input, k) => { if (document.activeElement !== input) input.value = f(m.kernel[k], 3); });
}

/** a handler pair that turns a drag over two image panels into the selected pixel */
function pixelHandlers(ctx, geoOf) {
  const pick = (x, y) => {
    const m = ctx.state();
    const ov = overlayFor(ctx);
    const { img, geo } = geoOf(m, ov.w, ov.h);
    const c = cellAt(geo.src, img.w, img.h, x, y) ?? cellAt(geo.res, img.w, img.h, x, y) ?? (geo.third ? cellAt(geo.third, img.w, img.h, x, y) : null);
    if (!c || (m.i === c.j && m.j === c.i)) return;
    m.i = c.j; m.j = c.i;
    ctx.refresh();
  };
  return { down: pick, move: pick };
}

export function convView() {
  const geoOf = (m, w, h) => { const img = filterImage(m.imageId); const half = (Math.round(Math.sqrt((m.kernel ?? [0]).length)) - 1) / 2; return { img, geo: convGeometry(w, h, { top: 44 }, img, half) }; };
  return {
    id: 'conv', topic: 'filter', label: 'Convolution', init: CONV_INIT, presets: CONV_PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['Borders', 'Convolution at a pixel', 'Convolution of an image', 'Kernels'], keys: {}, panelTitle: 'Image, border, kernel',
    setup(ctx) { setupOverlay(ctx, pixelHandlers(ctx, (m, w, h) => { const ov = ctx.sceneEl ? { top: ctx.stage === 'embed' ? 6 : 44 } : null; const img = filterImage(m.imageId); const half = (ensureKernel(m) - 1) / 2; return { img, geo: convGeometry(w, h, ov, img, half) }; })); },
    leave: leaveOverlay,
    run: runConv,
    draw(v, m, r, ctx) { paintWith(ctx, (g, w, h, ov) => paintConv(g, w, h, ov, m, r)); },
    explain: explainConv, panel: convPanel,
  };
}

// ---------------------------------------------------------------- the median

const MEDIAN_IMAGES = [['saltGlyph', 'glyph with noise'], ['salt', 'spike 5 × 1'], ['step', 'step 6 × 1']];
const MEDIAN_INIT = { imageId: 'salt', size: 3, border: 'clamp', i: 0, j: 2 };
const MEDIAN_PRESETS = [
  { label: 'the lecture spike: (0.2, 0.2, 1, 0.2, 0.2)', set: { imageId: 'salt', size: 3, border: 'clamp', i: 0, j: 2 } },
  { label: 'a step edge: (0, 0, 0, 1, 1, 1)', set: { imageId: 'step', size: 3, border: 'clamp', i: 0, j: 3 } },
  { label: 'salt on the glyph', set: { imageId: 'saltGlyph', size: 3, border: 'clamp', i: 1, j: 9 } },
  { label: 'a 5 × 5 window', set: { imageId: 'saltGlyph', size: 5, border: 'clamp', i: 1, j: 9 } },
  { label: 'on the glyph\'s edge', set: { imageId: 'saltGlyph', size: 3, border: 'clamp', i: 6, j: 6 } },
];

function runMedian(m) {
  const img = filterImage(m.imageId);
  m.i = Math.min(img.h - 1, Math.max(0, m.i)); m.j = Math.min(img.w - 1, Math.max(0, m.j));
  const med = I.medianPixel(img.data, img.w, img.h, m.size, m.i, m.j, m.border);
  const boxKernel = new Array(m.size * m.size).fill(1 / (m.size * m.size));
  const box = I.convolvePixel(img.data, img.w, img.h, boxKernel, m.size, m.i, m.j, m.border);
  const medAll = I.medianFilter(img.data, img.w, img.h, m.size, m.border).image;
  const boxAll = I.convolve(img.data, img.w, img.h, boxKernel, m.size, m.border).image;
  return { img, ...med, boxValue: box.value, medAll, boxAll };
}

function medianGeometry(w, h, ov, img) {
  const a = area(ov, w, h);
  const cols = splitRow(a, 3, 22);
  const pick = (box) => { const zoom = Math.min(box.w / img.w, (box.h - 24) / img.h, 64); return { x: box.x + (box.w - zoom * img.w) / 2, y: box.y + 14, w: zoom * img.w, h: zoom * img.h }; };
  const rects = cols.map(pick);
  return { src: rects[0], res: rects[1], third: rects[2] };
}

export function medianView() {
  return {
    id: 'median', topic: 'filter', label: 'Median', init: MEDIAN_INIT, presets: MEDIAN_PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['Median filter', 'Convolution at a pixel'], keys: {}, panelTitle: 'Image, window, border',
    setup(ctx) { setupOverlay(ctx, pixelHandlers(ctx, (m, w, h) => { const img = filterImage(m.imageId); return { img, geo: medianGeometry(w, h, { top: ctx.stage === 'embed' ? 6 : 44 }, img) }; })); },
    leave: leaveOverlay,
    run: runMedian,
    draw(v, m, r, ctx) {
      paintWith(ctx, (g, w, h, ov) => {
        const geo = medianGeometry(w, h, ov, r.img);
        const half = (m.size - 1) / 2;
        caption(g, 'input', geo.src); caption(g, `box ${m.size} × ${m.size} (mean)`, geo.res); caption(g, `median ${m.size} × ${m.size}`, geo.third);
        drawCells(g, r.img.data, r.img.w, r.img.h, geo.src, { minCell: 24 });
        drawCells(g, r.boxAll, r.img.w, r.img.h, geo.res, { minCell: 24 });
        drawCells(g, r.medAll, r.img.w, r.img.h, geo.third, { minCell: 24 });
        const cw = geo.src.w / r.img.w;
        const ch = geo.src.h / r.img.h, top = Math.max(m.i - half, 0), bottom = Math.min(m.i + half, r.img.h - 1);
        outline(g, geo.src.x + (m.j - half) * cw, geo.src.y + top * ch, m.size * cw, (bottom - top + 1) * ch, '#ffd166', 3);
        for (const rect of [geo.res, geo.third]) { const c = cellRect(rect, r.img.w, r.img.h, m.j, m.i); outline(g, c.x, c.y, c.w, c.h, '#ffd166', 3); }
      });
    },
    explain(m, r) {
      const n = r.neighbors.length;
      const spikeV = r.img.data[m.i * r.img.w + m.j];
      const rows = [
        `window of {x|${n}} values around pixel (${m.i}, ${m.j}): ${list(r.neighbors, 2)}`,
        `sorted: ${list(r.sorted, 2)}`,
        `{median|median} = the middle one, number ${(n + 1) / 2} of ${n} = {median|${f(r.value, 3)}}`,
        `{box|box} = (Σ values) / ${n} = {box|${f(r.boxValue, 3)}}`,
        `the pixel itself is ${f(spikeV, 3)}; median − pixel = ${f(r.value - spikeV, 3)}, box − pixel = ${f(r.boxValue - spikeV, 3)}`,
      ];
      let status;
      if (Math.abs(spikeV - r.value) > 0.3 && Math.abs(spikeV - r.boxValue) > 0.05) status = { text: `an outlier: the median replaces ${f(spikeV, 2)} by ${f(r.value, 2)}; the box moves it only to ${f(r.boxValue, 2)} and spreads its excess over the neighbors`, tone: 'ok' };
      else if (r.sorted[0] !== r.sorted[n - 1] && r.sorted.includes(r.value) && Math.abs(r.boxValue - r.value) > 0.05) status = { text: `the window straddles an edge: the median is one of the two sides (${f(r.value, 2)}), the box lands between them (${f(r.boxValue, 2)})`, tone: 'info' };
      else status = { text: 'a flat neighborhood: median and box agree', tone: 'info' };
      return {
        hud: `{median|median ${f(r.value, 3)}}   {box|box ${f(r.boxValue, 3)}}`, rows, status,
        values: [['median', f(r.value, 3), 'median'], ['box', f(r.boxValue, 3), 'box'], ['window', `${m.size} × ${m.size}`, null], ['linear', 'median: no', null]],
        fact: 'The median is not linear, so it has no kernel and no frequency response: median(x + y) differs from median(x) + median(y).',
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'median', (h) => {
        h.refreshers.push(segmented(h, 'image', MEDIAN_IMAGES, () => m.imageId, (id) => { m.imageId = id; m.i = 0; m.j = Math.min(m.j, filterImage(id).w - 1); ctx.update(); }));
        h.refreshers.push(segmented(h, 'window', [[3, '3 × 3'], [5, '5 × 5']], () => m.size, (v) => { m.size = v; ctx.update(); }));
        h.refreshers.push(segmented(h, 'border', BORDERS, () => m.border, (id) => { m.border = id; ctx.update(); }));
      });
      host.refreshers.forEach((s) => s());
    },
  };
}

// ---------------------------------------------------------------- the unsharp mask

const UNSHARP_INIT = { imageId: 'edge', blurId: 'gauss3', amount: 1, border: 'clamp', i: 0, j: 2 };
const UNSHARP_PRESETS = [
  { label: 'the lecture edge, k = 1', set: { imageId: 'edge', blurId: 'gauss3', amount: 1, i: 0, j: 1 } },
  { label: 'the same edge, k = 2', set: { imageId: 'edge', blurId: 'gauss3', amount: 2, i: 0, j: 1 } },
  { label: 'k = 0: the identity', set: { imageId: 'edge', blurId: 'gauss3', amount: 0, i: 0, j: 2 } },
  { label: 'glyph, k = 1', set: { imageId: 'glyph', blurId: 'gauss3', amount: 1, i: 5, j: 6 } },
  { label: 'glyph, box blur, k = 2', set: { imageId: 'glyph', blurId: 'box3', amount: 2, i: 5, j: 6 } },
];

function runUnsharp(m) {
  const img = filterImage(m.imageId);
  m.i = Math.min(img.h - 1, Math.max(0, m.i)); m.j = Math.min(img.w - 1, Math.max(0, m.j));
  const blurKernel = I.makeKernel(m.blurId).values;
  const kernel = I.unsharpKernel(blurKernel, 3, m.amount);
  const blurred = I.convolve(img.data, img.w, img.h, blurKernel, 3, m.border).image;
  const sharp = I.convolve(img.data, img.w, img.h, kernel.values, 3, m.border);
  return { img, ...kernel, blurred, sharp, sharpImage: sharp.image };
}

export function unsharpView() {
  const geo = (w, h, ov, img) => {
    const a = area(ov, w, h), top = { x: a.x, y: a.y, w: a.w, h: a.h * 0.5 }, cols = splitRow(top, 3, 22);
    const pick = (box) => { const zoom = Math.min(box.w / img.w, (box.h - 14) / img.h, 64); return { x: box.x + (box.w - zoom * img.w) / 2, y: box.y + 14, w: zoom * img.w, h: zoom * img.h }; };
    return { src: pick(cols[0]), res: pick(cols[1]), third: pick(cols[2]), chart: { x: a.x, y: a.y + a.h * 0.55, w: a.w, h: a.h * 0.45 } };
  };
  return {
    id: 'unsharp', topic: 'filter', label: 'Unsharp mask', init: UNSHARP_INIT, presets: UNSHARP_PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    params: [{ id: 'amount', label: 'amount k', min: 0, max: 3, step: 0.05 }], inputTitle: 'Amount',
    regions: ['Unsharp mask', 'Convolution of an image'], keys: {}, panelTitle: 'Image and blur',
    setup(ctx) { setupOverlay(ctx, pixelHandlers(ctx, (m, w, h) => { const img = filterImage(m.imageId); return { img, geo: geo(w, h, { top: ctx.stage === 'embed' ? 6 : 44 }, img) }; })); },
    leave: leaveOverlay,
    run: runUnsharp,
    draw(v, m, r, ctx) {
      paintWith(ctx, (g, w, h, ov) => {
        const L = geo(w, h, ov, r.img), img = r.img;
        caption(g, 'x', L.src); caption(g, 'blur(x)', L.res); caption(g, 'x + k (x − blur(x)), shown clamped to [0, 1]', L.third);
        drawCells(g, img.data, img.w, img.h, L.src, { minCell: 24 });
        drawCells(g, r.blurred, img.w, img.h, L.res, { minCell: 24 });
        drawCells(g, r.sharpImage, img.w, img.h, L.third, { minCell: 30, color: (v2) => grayRgb(v2), fmt: (v2) => f(v2, 2) });
        for (const rect of [L.src, L.res, L.third]) { const c = cellRect(rect, img.w, img.h, m.j, m.i); outline(g, c.x, c.y, c.w, c.h, '#ffd166', 3); }
        // the profile along the selected row: the halo is where the sharpened line leaves [0, 1]
        const row = (a) => Array.from({ length: img.w }, (_, j) => [j, a[m.i * img.w + j]]);
        const lo = Math.min(-0.1, ...r.sharpImage), hi = Math.max(1.1, ...r.sharpImage);
        drawChart(g, L.chart, {
          x: [0, Math.max(1, img.w - 1)], y: [lo - 0.05, hi + 0.05], xTicks: Array.from({ length: Math.min(img.w, 12) }, (_, k) => Math.round(k * (img.w - 1) / Math.max(1, Math.min(img.w, 12) - 1))), yTicks: [0, 0.5, 1], xLabel: `column j, row ${m.i}`, yLabel: 'value',
          hlines: [{ y: 0 }, { y: 1 }],
          series: [{ pts: row(img.data), color: '#8b93a7', width: 2 }, { pts: row(r.blurred), color: '#79c0ff', width: 2 }, { pts: row(r.sharpImage), color: '#ffd166', width: 2.5 }],
          dots: row(r.sharpImage).map(([x, y]) => ({ x, y, color: '#ffd166', r: 4 })),
          labels: [{ x: img.w - 1, y: hi, t: 'x', color: '#8b93a7', align: 'right' }, { x: img.w - 1, y: hi - 0.12, t: 'blur', color: '#79c0ff', align: 'right' }, { x: img.w - 1, y: hi - 0.24, t: 'sharpened', color: '#ffd166', align: 'right' }],
        });
      });
    },
    explain(m, r) {
      const x = r.img.data[m.i * r.img.w + m.j], b = r.blurred[m.i * r.img.w + m.j], y = r.sharpImage[m.i * r.img.w + m.j];
      const rows = [
        `{x|x} = ${f(x, 3)},  {blur|blur(x)} = ${f(b, 3)} (${m.blurId === 'gauss3' ? '[1 2 1]/4 each way' : '3 × 3 box'})`,
        `{detail|detail} = x − blur(x) = ${f(x - b, 3)}`,
        `{y|y} = x + {amount|k}·detail = ${f(x, 3)} + ${f(m.amount, 2)}·${f(x - b, 3)} = {y|${f(y, 3)}}`,
        `as one kernel: (1 + k)·identity − k·blur, sum ${f(I.kernelSum(r.values), 3)}; centre ${f(r.values[4], 3)}`,
        `row ${m.i} of the sharpened image: ${list(Array.from({ length: r.img.w }, (_, j) => r.sharpImage[m.i * r.img.w + j]), 2)}`,
      ];
      const over = y > 1 + 1e-9, under = y < -1e-9;
      const status = over ? { text: `overshoot: ${f(y, 3)} is above 1 by ${f(y - 1, 3)}; the display clamps it, the halo remains as a bright line along the edge`, tone: 'warn' }
        : under ? { text: `undershoot: ${f(y, 3)} is below 0; the display clamps it, the halo remains as a dark line along the edge`, tone: 'warn' }
          : m.amount === 0 ? { text: 'k = 0 returns the image', tone: 'info' } : Math.abs(x - b) < 1e-9 ? { text: 'x equals its blur here: no detail to add', tone: 'info' } : { text: `the edge is steeper: ${f(x - b, 3)} of detail added back`, tone: 'ok' };
      return { hud: `y = x + k (x − blur) = {y|${f(y, 3)}}`, rows, status, values: [['k', f(m.amount, 2), 'amount'], ['min', f(r.sharp.low, 3), null], ['max', f(r.sharp.high, 3), null], ['sum of kernel', f(I.kernelSum(r.values), 3), null]] };
    },
    panel(host, m, r, ctx) {
      once(host, 'unsharp', (h) => {
        h.refreshers.push(segmented(h, 'image', [['edge', 'edge 4 × 1'], ['glyph', 'glyph']], () => m.imageId, (id) => { m.imageId = id; m.i = id === 'edge' ? 0 : 5; m.j = id === 'edge' ? 1 : 6; ctx.update(); }));
        h.refreshers.push(segmented(h, 'blur', [['gauss3', 'Gaussian'], ['box3', 'box']], () => m.blurId, (id) => { m.blurId = id; ctx.update(); }));
      });
      host.refreshers.forEach((s) => s());
    },
  };
}
