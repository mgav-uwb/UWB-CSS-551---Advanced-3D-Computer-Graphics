// dct-lab-draw: what the DCT lab's views share. The numbers: the orthonormal cosine matrix C and the basis images (from the image lab's program,
// lib/programs/image-lab/webgl/imagelab.js), a general zigzag order, the toy images, an input (a toy, the rendered picture in 8 x 8 blocks, or
// an image the held file supplies) with its blockwise coefficients, a partial sum from chosen coefficients, and peak signal-to-noise ratio
// (PSNR) from mean squared error (MSE). The drawing: panel layout, headers that can be clicked, crossed-out cells, fitted captions, and the
// wrapper that turns a painter and a hit test into a lab view.
//
// Conventions, everywhere in this lab: an n x n image X, coefficients Y[v][u] (row v = vertical frequency, column u = horizontal), the
// orthonormal DCT-II matrix C[k][i] = alpha(k) cos(pi (2i + 1) k / 2n), Y = C X C^T, basis image B_uv[y][x] = C[v][y] C[u][x].
import * as I from '../programs/image-lab/webgl/imagelab.js';
import {
  f, grayRgb, signedRgb, midGrayRgb, drawCells, outline, cellAt, text, setupOverlay, leaveOverlay, paintWith, overlayFor, sceneAt, el, segmented, once,
} from './image-lab-draw.js';

export { f, grayRgb, signedRgb, midGrayRgb, drawCells, outline, cellAt, text, overlayFor, el, segmented, once, paintWith };

// ---------------------------------------------------------------- the transform

const cache = new Map();
const memo = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };

/** C as a flat array: C[k][i] = out[k * n + i] */
export const cMatrix = (n) => memo(`C${n}`, () => I.dctMatrix(n));
export const alpha = (k, n) => (k === 0 ? Math.sqrt(1 / n) : Math.sqrt(2 / n));
/** one entry from its formula, alpha(k) cos(pi (2i + 1) k / 2n) */
export const cEntry = (k, i, n) => alpha(k, n) * Math.cos((Math.PI * (2 * i + 1) * k) / (2 * n));
/** the basis images of an n x n block, index v * n + u */
export const basisSet = (n) => memo(`B${n}`, () => { const out = []; for (let v = 0; v < n; v++) for (let u = 0; u < n; u++) out.push(I.dctBasis(u, v, n)); return out; });

/** the zigzag order of an n x n grid as flat indices v * n + u: along the anti-diagonals, low frequencies first (n = 8 is the JPEG order) */
export function zigzag(n) {
  const order = [];
  for (let s = 0; s < 2 * n - 1; s++) {
    const first = Math.max(0, s - (n - 1)), last = Math.min(s, n - 1);
    if (s % 2 === 1) for (let v = first; v <= last; v++) order.push(v * n + (s - v));
    else for (let v = last; v >= first; v--) order.push(v * n + (s - v));
  }
  return order;
}
export const zigzagOf = (n) => memo(`Z${n}`, () => zigzag(n));

const sumSq = (a) => { let s = 0; for (const v of a) s += v * v; return s; };
export { sumSq };

/** peak signal-to-noise ratio for values in [0, 1]: db is null (shown as "exact") when the mean squared error is below 1e-12 */
export function psnr(a, b) {
  const mse = I.meanSquaredError(a, b);
  return { mse, db: mse < 1e-12 ? null : I.psnrOf(a, b, 1) };
}
export const dbText = (db, d = 2) => (db === null ? 'exact' : `${f(db, d)} dB`);

// ---------------------------------------------------------------- toy images

const r2 = (v) => Math.round(v * 100) / 100;
export const TOYS = [
  { id: 'edge', label: 'an edge', at: (x, y, n) => (x < n / 2 ? 0.1 : 0.9) },
  { id: 'ramp', label: 'a ramp', at: (x, y, n) => r2(x / (n - 1)) },
  { id: 'checker', label: 'a checker', at: (x, y) => ((x + y) % 2 ? 0.9 : 0.1) },
  { id: 'dot', label: 'a dot', at: (x, y, n) => (x === Math.floor(n / 2) && y === Math.floor(n / 2) ? 1 : 0) },
  { id: 'blob', label: 'a soft blob', at: (x, y, n) => r2(Math.exp(-(((x - (n - 1) / 2) ** 2 + (y - (n - 1) / 2) ** 2) / (2 * (n / 4) ** 2)))) },
];
export function toyImage(id, n) {
  const toy = TOYS.find((t) => t.id === id) ?? TOYS[0];
  const out = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) out.push(toy.at(x, y, n));
  return out;
}

// ---------------------------------------------------------------- inputs and their coefficients

/**
 * The image a view works on, from the lab's values: the toy (n x n, one block), the rendered picture (64 x 64 in 8 x 8 blocks), or an
 * input the held file supplies ({ n, data, label }; one block). { key, id, S: side, bn: block side, X, label }
 */
export function inputOf(m, held = {}) {
  if (m.input === 'picture') return { key: 'picture', id: 'picture', S: 64, bn: 8, X: sceneAt(64), label: 'rendered picture, 64 × 64 in 8 × 8 blocks' };
  const h = held[m.input];
  if (h && h.data) return { key: `held:${m.input}`, id: m.input, S: h.n, bn: h.n, X: h.data, label: h.label };
  const n = m.n === 5 ? 5 : 4;
  return { key: `toy:${m.toy}:${n}`, id: 'toy', S: n, bn: n, X: toyImage(m.toy, n), label: `toy image ${n} × ${n}` };
}
export const inputChoices = (held = {}) => [['toy', 'toy image'], ['picture', 'picture in blocks'], ...Object.entries(held).filter(([, h]) => h.data).map(([id, h]) => [id, h.short ?? h.label])];

/** the coefficients of every block: Y is laid out like the image (block (bx, by) holds its Y at the same place) */
export function analyze(input) {
  return memo(`an:${input.key}`, () => {
    const { S, bn, X } = input, nb = S / bn, Y = new Float64Array(S * S), blocks = [];
    for (let by = 0; by < nb; by++) {
      for (let bx = 0; bx < nb; bx++) {
        const xb = [];
        for (let y = 0; y < bn; y++) for (let x = 0; x < bn; x++) xb.push(X[(by * bn + y) * S + bx * bn + x]);
        const yb = I.dct2d(xb, bn).coefficients;
        for (let v = 0; v < bn; v++) for (let u = 0; u < bn; u++) Y[(by * bn + v) * S + bx * bn + u] = yb[v * bn + u];
        blocks.push({ bx, by, Y: yb });
      }
    }
    return { ...input, nb, Y, blocks };
  });
}
export const blockOf = (an, m) => an.blocks[Math.min(an.nb - 1, m.by ?? 0) * an.nb + Math.min(an.nb - 1, m.bx ?? 0)];

/** the sum of the chosen basis images, each weighted by its coefficient, in every block; use[v * bn + u] = 1 includes a coefficient */
export function partialSum(an, use) {
  const { S, bn, blocks } = an, B = basisSet(bn), out = new Float64Array(S * S);
  for (const blk of blocks) {
    for (let idx = 0; idx < bn * bn; idx++) {
      const w = blk.Y[idx];
      if (!use[idx] || w === 0) continue;
      const img = B[idx];
      for (let y = 0; y < bn; y++) for (let x = 0; x < bn; x++) out[(blk.by * bn + y) * S + blk.bx * bn + x] += w * img[y * bn + x];
    }
  }
  return out;
}

/** add the coefficients one at a time in zigzag order, skipping dropped ones: { db[m] for m = 0 .. bn^2, partial at count } */
export function progressive(an, dropped, count) {
  const { S, bn, blocks, X } = an, B = basisSet(bn), order = zigzagOf(bn), sum = new Float64Array(S * S), db = [];
  let snap = null;
  const err = () => { let s = 0; for (let k = 0; k < S * S; k++) s += (X[k] - sum[k]) ** 2; const mse = s / (S * S); return mse < 1e-12 ? null : 10 * Math.log10(1 / mse); };
  db.push(err());
  if (count === 0) snap = Float64Array.from(sum);
  order.forEach((idx, step) => {
    if (!dropped[idx]) {
      for (const blk of blocks) {
        const w = blk.Y[idx];
        if (w === 0) continue;
        const img = B[idx];
        for (let y = 0; y < bn; y++) for (let x = 0; x < bn; x++) sum[(blk.by * bn + y) * S + blk.bx * bn + x] += w * img[y * bn + x];
      }
    }
    db.push(err());
    if (step + 1 === count) snap = Float64Array.from(sum);
  });
  return { db, partial: snap };
}

/** keep the lowest k x k block of every block's coefficients (the image lab's lowestFrequencies) */
export function lowpassOf(an, k) {
  const { S, bn, blocks } = an, rebuilt = new Float64Array(S * S), kept = new Float64Array(S * S);
  for (const blk of blocks) {
    const r = I.lowestFrequencies(blk.Y, bn, k);
    for (let y = 0; y < bn; y++) for (let x = 0; x < bn; x++) {
      const at = (blk.by * bn + y) * S + blk.bx * bn + x;
      rebuilt[at] = r.rebuilt[y * bn + x]; kept[at] = r.kept[y * bn + x];
    }
  }
  return { rebuilt, kept };
}
/** PSNR for k = 1 .. bn */
export const lowpassCurve = (an) => memo(`lc:${an.key}`, () => Array.from({ length: an.bn }, (_, i) => psnr(an.X, lowpassOf(an, i + 1).rebuilt).db));

// ---------------------------------------------------------------- suppressed coefficients
// a string of tokens: r<v> drops a whole row (vertical frequency v), c<u> a column, e<v>.<u> one coefficient

export const dropTokens = (str) => (str ?? '').split(' ').filter(Boolean);
export function dropMask(bn, str) {
  const d = new Uint8Array(bn * bn);
  for (const t of dropTokens(str)) {
    if (t[0] === 'r') { const v = Number(t.slice(1)); if (v < bn) for (let u = 0; u < bn; u++) d[v * bn + u] = 1; }
    else if (t[0] === 'c') { const u = Number(t.slice(1)); if (u < bn) for (let v = 0; v < bn; v++) d[v * bn + u] = 1; }
    else if (t[0] === 'e') { const [v, u] = t.slice(1).split('.').map(Number); if (v < bn && u < bn) d[v * bn + u] = 1; }
  }
  return d;
}
export function toggleDrop(str, token) {
  const t = dropTokens(str), at = t.indexOf(token);
  if (at >= 0) t.splice(at, 1); else t.push(token);
  return t.join(' ');
}
export function dropWords(str, bn) {
  const t = dropTokens(str);
  const rows = t.filter((x) => x[0] === 'r').map((x) => x.slice(1)), cols = t.filter((x) => x[0] === 'c').map((x) => x.slice(1));
  const cells = t.filter((x) => x[0] === 'e').map((x) => `(u ${x.slice(1).split('.')[1]}, v ${x.slice(1).split('.')[0]})`);
  const parts = [];
  if (rows.length) parts.push(`rows v = ${rows.join(', ')}`);
  if (cols.length) parts.push(`columns u = ${cols.join(', ')}`);
  if (cells.length) parts.push(`single ${cells.join(', ')}`);
  return parts.length ? parts.join('; ') : 'nothing';
}

// ---------------------------------------------------------------- layout

const fitBox = (w, h, aspect) => { const ww = Math.max(1, Math.min(w, h * aspect)); return { w: ww, h: ww / aspect }; };

/** panels of the given aspect in the area, as many columns as give the largest panels; room above each for a two-line caption */
export function tiles(a, items, { gap = mode.narrow ? 12 : 18, cap = capHeight() } = {}) {
  const N = items.length;
  let best = null;
  for (let c = 1; c <= N; c++) {
    const rows = Math.ceil(N / c), cw = (a.w - gap * (c - 1)) / c, ch = (a.h - gap * (rows - 1)) / rows - cap;
    if (cw < 24 || ch < 24) continue;
    const score = Math.min(...items.map((it) => { const q = fitBox(cw, ch, it.aspect ?? 1); return q.w * q.h; }));
    if (!best || score > best.score) best = { c, rows, cw, ch, score };
  }
  if (!best) best = { c: 1, rows: N, cw: Math.max(24, a.w), ch: Math.max(24, (a.h - gap * (N - 1)) / N - cap) };
  const used = best.rows * (best.ch + cap) + gap * (best.rows - 1);
  const y0 = a.y + Math.max(0, (a.h - used) / 2) * 0.5;
  return items.map((it, i) => {
    const col = i % best.c, row = Math.floor(i / best.c), q = fitBox(best.cw, best.ch, it.aspect ?? 1);
    const x = a.x + col * (best.cw + gap) + (best.cw - q.w) / 2;
    // maxW: how far a caption may run to the right, up to the next panel's column
    return { x, y: y0 + row * (best.ch + cap + gap) + cap, w: q.w, h: q.h, maxW: a.x + col * (best.cw + gap) + best.cw + gap - 8 - x };
  });
}

/** the drawing area: below the legend bar, above the readout that the lab places over the scene */
export const mode = { narrow: false };
/** a slide's scene pane is under 640 px wide: one-line captions, tighter panels */
export const capHeight = () => (mode.narrow ? 24 : 36);
export function areaOf(w, h, ov, { hudLines = 1 } = {}) {
  mode.narrow = w < 640;
  // the embed stage keeps its gear and help buttons in the top right corner, and its readout above the bottom edge
  const embed = ov.top < 20, top = ov.top + (embed ? 32 : 6);
  return { x: mode.narrow ? 8 : 12, y: top, w: w - (mode.narrow ? 16 : 24), h: h - top - (embed ? (mode.narrow ? 62 + 32 * (hudLines - 1) : 78) : 54) };
}

/** a caption line that shrinks to fit; returns nothing */
export function fitText(g, str, x, y, maxW, o = {}) {
  let size = o.size ?? 12;
  const min = o.min ?? 8.5, weight = o.weight ?? 500;
  let shown = str;
  const wide = () => { g.font = `${weight} ${size}px -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`; const mt = g.measureText ? g.measureText(shown) : null; return mt && mt.width > maxW; };
  while (size > min && wide()) size -= 0.5;
  while (shown.length > 8 && wide()) shown = `${shown.slice(0, -2).trimEnd()}…`;
  text(g, shown, x, y, { ...o, size, halo: false });
}
/** a title and a plain-language note above a panel */
export function cap(g, r, title, note, { color = '#c7cdda', width = r.maxW ?? Math.max(r.w + 16, 130), short = null } = {}) {
  if (mode.narrow) { fitText(g, short ?? title, r.x, r.y - 7, width, { size: 11.5, weight: 600, color }); return; }
  fitText(g, title, r.x, r.y - 20, width, { size: 12.5, weight: 600, color });
  if (note) fitText(g, note, r.x, r.y - 6, width, { size: 11, color: '#8b93a7' });
}

// ---------------------------------------------------------------- cells, headers, marks

/** numbers in cells when the cells are big enough for them: decimals 1, 2 or 3 */
export function cells(g, vals, w, h, r, { color = grayRgb, dec = 2, minCell, gridLine = true } = {}) {
  // three decimals need a 38 px cell; a cell of 28 to 38 px shows two
  if (dec >= 3 && minCell === undefined && r.w / w < 38 && r.w / w >= 28 && r.h / h >= 28) dec = 2;
  const need = minCell ?? (dec >= 3 ? 38 : dec === 2 ? 28 : 24);
  drawCells(g, vals, w, h, r, { color, fmt: (v) => f(v, dec), minCell: need, fontScale: dec >= 3 ? 0.27 : 0.34, gridLine });
}
/** the color of a coefficient: blue positive, red negative, square-root scale so the small ones show next to the mean */
export const coefColor = (scale) => { const c = signedRgb(1); return (v) => c(Math.sign(v) * Math.sqrt(Math.min(1, Math.abs(v) / (scale || 1)))); };
export const dim = (g, r, a = 0.62) => { g.fillStyle = `rgba(11,12,16,${a})`; g.fillRect(r.x, r.y, r.w, r.h); };
export function crossOut(g, r, color = '#ff8d85') {
  g.strokeStyle = color; g.lineWidth = Math.max(1, Math.min(2, r.w / 14)); g.beginPath();
  g.moveTo(r.x + r.w * 0.18, r.y + r.h * 0.18); g.lineTo(r.x + r.w * 0.82, r.y + r.h * 0.82);
  g.moveTo(r.x + r.w * 0.82, r.y + r.h * 0.18); g.lineTo(r.x + r.w * 0.18, r.y + r.h * 0.82);
  g.stroke();
}
export const cellBox = (r, n, i, j, rows = n) => ({ x: r.x + (i * r.w) / n, y: r.y + (j * r.h) / rows, w: r.w / n, h: r.h / rows });

const HL = 22, HT = 17;
/** a square of n x n cells with a strip of u labels above it and v labels left of it, inside the panel rectangle r */
export function withHeaders(r) {
  const side = Math.max(8, Math.min(r.w - HL, r.h - HT));
  return { x: r.x + HL + (r.w - HL - side) / 2, y: r.y + HT, w: side, h: side };
}
/** the u labels along the top and the v labels down the left of the cells rectangle cr; dropped lines are crossed out */
export function drawHeaders(g, cr, n, { dropU = () => false, dropV = () => false, names = ['u', 'v'] } = {}) {
  const cw = cr.w / n, every = Math.max(1, Math.ceil(15 / cw));
  for (let k = 0; k < n; k++) {
    if (k % every !== 0) continue;
    const dr = dropU(k), dv = dropV(k);
    text(g, String(k), cr.x + (k + 0.5) * cw, cr.y - 5, { size: 11, align: 'center', color: dr ? '#ff8d85' : '#ffd166', halo: false, weight: 600 });
    text(g, String(k), cr.x - 6, cr.y + (k + 0.5) * cw + 4, { size: 11, align: 'right', color: dv ? '#ff8d85' : '#7ee787', halo: false, weight: 600 });
    if (dr) crossOut(g, { x: cr.x + (k + 0.5) * cw - 6, y: cr.y - 15, w: 12, h: 12 });
    if (dv) crossOut(g, { x: cr.x - 21, y: cr.y + (k + 0.5) * cw - 6, w: 12, h: 12 });
  }
  if (names) {
    text(g, names[0], cr.x + cr.w + 4, cr.y - 5, { size: 11, color: '#ffd166', halo: false });
    text(g, names[1], cr.x - 17, cr.y + cr.h + 12, { size: 11, color: '#7ee787', halo: false });
  }
}
/** what a click at (x, y) means for a panel with headers: { cell: {u, v} } | { col: u } | { row: v } | null */
export function headerHit(cr, n, x, y) {
  const cw = cr.w / n;
  if (x >= cr.x && x < cr.x + cr.w && y >= cr.y && y < cr.y + cr.h) return { cell: { u: Math.min(n - 1, Math.floor((x - cr.x) / cw)), v: Math.min(n - 1, Math.floor((y - cr.y) / cw)) } };
  if (x >= cr.x && x < cr.x + cr.w && y >= cr.y - HT && y < cr.y) return { col: Math.min(n - 1, Math.floor((x - cr.x) / cw)) };
  if (y >= cr.y && y < cr.y + cr.h && x >= cr.x - HL && x < cr.x) return { row: Math.min(n - 1, Math.floor((y - cr.y) / cw)) };
  return null;
}

/** a matrix with its numbers, or none when the cells are too small: row k of C and so on */
export const matrix = (g, vals, rows, cols, r, o = {}) => cells(g, vals, cols, rows, r, o);

// ---------------------------------------------------------------- a view that paints into the overlay

/**
 * A lab view made of a painter and a hit test. spec: { paint(g, w, h, ov, m, r) returns the layout, hit(x, y, m, lay, ctx, phase) returns true when
 * it changed a value, ...the usual view fields }. The painted layout is kept for the hit test; spec.paint is also view.paint, so a test can
 * paint into a stub.
 */
export function overlayView(spec) {
  const { paint, hit, ...rest } = spec;
  const view = {
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false, regions: [], keys: {}, lay: null,
    ...rest,
    paint(g, w, h, ov, m, r) { view.lay = paint(g, w, h, ov, m, r); return view.lay; },
    setup(ctx) {
      const go = (phase) => (x, y) => { if (view.lay && hit(x, y, ctx.state(), view.lay, ctx, phase)) ctx.refresh(); };
      setupOverlay(ctx, { down: go('down'), move: go('move') });
    },
    leave: leaveOverlay,
    draw(viz, m, r, ctx) { paintWith(ctx, (g, w, h, ov) => view.paint(g, w, h, ov, m, r)); },
  };
  return view;
}

/** a rebuild of a view's slider after its range changed: the lab reads a view's params when it opens the view */
export function reslide(ctx, id) {
  const rail = ctx.shell?.railEl, top = rail ? rail.scrollTop : 0;
  ctx.setView(id);
  if (rail) rail.scrollTop = top;
}

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
