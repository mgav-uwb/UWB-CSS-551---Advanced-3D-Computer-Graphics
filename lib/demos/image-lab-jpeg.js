// image-lab-jpeg: the JPEG topic of the image-lab demo: one 8 x 8 block through the cosine transform, the quantization table, the zigzag and run lengths
// and back; the 64 basis images; a whole small color image at a quality, with its measured size and chroma subsampling.
// Every number comes from lib/programs/image-lab/webgl/imagelab.js.
import * as I from '../programs/image-lab/webgl/imagelab.js';
import { COL } from '../core/lab-viz.js';
import {
  f, f1, f0, list, grayRgb, signedRgb, midGrayRgb, drawCells, drawBitmap, bitmapOf, bitmapRgb, caption, outline, cellAt, cellRect, area, splitRow, splitCol,
  text, imageRect, drawChart, overlayFor, setupOverlay, leaveOverlay, paintWith, LECTURE_BLOCK, sceneBlock, el, btn, segmented, once, panelCanvas,
  colorAt255, makeResolution, resolutionRow,
} from './image-lab-draw.js';

export const JPEG_KEYS = {
  coef: COL.cyan, entry: COL.amber, level: COL.gold, back: COL.c, err: COL.red, quality: COL.pink, scale: COL.pink, zig: COL.b, nz: COL.gold, bits: COL.gold, bpp: COL.gold,
  psnr: COL.c, ratio: COL.amber, chroma: COL.pink, keep: COL.pink, dc: COL.gold,
};

// ---------------------------------------------------------------- one block

const BLOCKS = {
  lecture: ['lecture block', () => LECTURE_BLOCK],
  sky: ['flat color', () => sceneBlock(2, 2)],
  disc: ['edge of the disc', () => sceneBlock(2, 3)],
  box: ['corner of the box', () => sceneBlock(4, 2)],
  grass: ['fine stripes', () => sceneBlock(1, 6)],
};
const BLOCK_INIT = { blockId: 'lecture', quality: 50, cu: 0, cv: 5, keep: 3 };
const BLOCK_PRESETS = [
  { label: 'the lecture block, quality 50', set: { blockId: 'lecture', quality: 50, cu: 0, cv: 5 } },
  { label: 'quality 10: the stripe is gone', set: { blockId: 'lecture', quality: 10, cu: 0, cv: 5 } },
  { label: 'quality 90', set: { blockId: 'lecture', quality: 90, cu: 0, cv: 5 } },
  { label: 'quality 100: table of ones', set: { blockId: 'lecture', quality: 100, cu: 0, cv: 5 } },
  { label: 'a flat block: one coefficient', set: { blockId: 'sky', quality: 50, cu: 0, cv: 0 } },
  { label: 'edge of the disc', set: { blockId: 'disc', quality: 50, cu: 1, cv: 0 } },
  { label: 'fine stripes at quality 30', set: { blockId: 'grass', quality: 30, cu: 3, cv: 0 } },
];
const blockOf = (m) => (BLOCKS[m.blockId] ?? BLOCKS.lecture)[1]();

function runBlock(m) {
  const pixels = blockOf(m);
  const jb = I.jpegBlock(pixels, m.quality, I.LUMA_TABLE);
  const errors = jb.coefficients.map((c, k) => c - jb.dequantized[k]);
  const runs = I.runLengths(jb.levels);
  const k = m.cv * 8 + m.cu;
  return { pixels, ...jb, errors, ...runs, order: I.zigzagOrder(), k, ...I.lowestFrequencies(jb.coefficients, 8, m.keep) };
}

function blockGeo(w, h, ov) {
  const a = area(ov, w, h);
  const cols = splitRow(a, 3, 20);
  const rows = cols.map((c) => splitCol(c, 2, 26));
  const sq = (box) => imageRect({ x: box.x, y: box.y + 14, w: box.w, h: box.h - 14 }, 8, 8, 60);
  return { pixels: sq(rows[0][0]), coef: sq(rows[1][0]), table: sq(rows[2][0]), levels: sq(rows[0][1]), back: sq(rows[1][1]), err: sq(rows[2][1]) };
}

function paintBlock(g, w, h, ov, m, r) {
  const L = blockGeo(w, h, ov), sel = (rect) => { const c = cellRect(rect, 8, 8, m.cu, m.cv); outline(g, c.x, c.y, c.w, c.h, '#ffd166', 2.5); };
  caption(g, 'pixels (0 to 255)', L.pixels); caption(g, 'cosine coefficients (after −128)', L.coef); caption(g, `quantization table, quality ${m.quality}`, L.table);
  caption(g, 'integers stored, with the zigzag', L.levels); caption(g, 'decoded block', L.back); caption(g, 'pixel − decoded', L.err);
  const num = (v) => f(v, 0);
  drawCells(g, r.pixels, 8, 8, L.pixels, { color: (v) => grayRgb(v / 255), fmt: num });
  drawCells(g, r.coefficients, 8, 8, L.coef, { color: signedRgb(200), fmt: num, fontScale: 0.3 });
  drawCells(g, r.table, 8, 8, L.table, { color: (v) => grayRgb(0.1 + v / 400), fmt: num });
  drawCells(g, r.levels, 8, 8, L.levels, { color: signedRgb(8), fmt: (v) => (v === 0 ? '' : f(v, 0)) });
  drawCells(g, r.reconstructed, 8, 8, L.back, { color: (v) => grayRgb(v / 255), fmt: num });
  drawCells(g, r.difference, 8, 8, L.err, { color: signedRgb(12), fmt: num });
  const cs = L.levels.w / 8;
  g.strokeStyle = 'rgba(255,209,102,0.7)'; g.lineWidth = 1.5; g.beginPath();
  r.order.forEach((k, i) => { const x = L.levels.x + ((k % 8) + 0.5) * cs, y = L.levels.y + (Math.floor(k / 8) + 0.5) * cs; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); });
  g.stroke();
  text(g, 'DC', L.levels.x + cs * 0.5, L.levels.y + cs * 0.2, { size: 10, align: 'center', color: '#ffd166' });
  sel(L.coef); sel(L.levels); sel(L.table);
}

export function blockView() {
  const hit = (ctx, x, y) => {
    const ov = overlayFor(ctx), L = blockGeo(ov.w, ov.h, ov), m = ctx.state();
    const c = cellAt(L.coef, 8, 8, x, y) ?? cellAt(L.levels, 8, 8, x, y) ?? cellAt(L.table, 8, 8, x, y);
    if (c) { m.cu = c.i; m.cv = c.j; ctx.refresh(); }
  };
  return {
    id: 'block', topic: 'jpeg', label: 'One block', group: 'jpegblock', init: BLOCK_INIT, presets: BLOCK_PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    params: [{ id: 'quality', label: 'quality', min: 1, max: 100, step: 1 }], inputTitle: 'JPEG quality',
    regions: ['Quantization', 'Zigzag and run lengths', 'One JPEG block'], keys: {}, panelTitle: 'Block and coefficient',
    setup(ctx) { setupOverlay(ctx, { down: (x, y) => hit(ctx, x, y), move: (x, y) => hit(ctx, x, y) }); },
    leave: leaveOverlay,
    run: runBlock,
    draw(v, m, r, ctx) { paintBlock_(ctx, m, r); },
    explain(m, r) {
      const k = r.k, c = r.coefficients[k], t = r.table[k], lv = r.levels[k] + 0, d = r.dequantized[k];
      const big = r.coefficients.map((q, i) => [Math.abs(q), i]).filter((e) => e[1] !== 0).sort((a, b) => b[0] - a[0]).slice(0, 3).map((e) => f(r.coefficients[e[1]], 1));
      const pairs = r.runs.map((run, i) => `(${run}, ${f(r.values[i], 0)})`).join(' ');
      const rows = [
        `{dc|DC} = ${f(r.coefficients[0], 1)};  the largest others: ${big.join(', ')}`,
        `table at quality {quality|${m.quality}}: scale {scale|${f(r.scale, 0)} %}, entry ${f(I.LUMA_TABLE[k], 0)} → {entry|${f(t, 0)}} for coefficient (u ${m.cu}, v ${m.cv})`,
        `{coef|c = ${f(c, 1)}}: round({coef|${f(c, 1)}} / {entry|${f(t, 0)}}) = round(${f(c / t, 2)}) = {level|${f(lv, 0)}}; ×${f(t, 0)} = ${f(d, 0)}, error {err|${f(c - d, 1)}} (at most ${f(t / 2, 1)})`,
        `{zig|zigzag}: ${list(r.sequence.slice(0, 12), 0)} …, then ${r.endOfBlock ? 'zeros to the end' : 'no trailing zeros'}`,
        `DC difference stored as the first symbol; AC pairs (run, value): ${pairs || 'none'}${r.endOfBlock ? ' EOB' : ''}`,
        `{nz|${r.nonzero} nonzero} of 64;  decoded within RMS {back|${f(r.rms, 2)}} gray levels, maximum {err|${f(r.maxError, 0)}}`,
      ];
      let status;
      if (m.quality >= 100) status = { text: 'every table entry is 1: the error is only the rounding to whole gray levels', tone: 'ok' };
      else if (lv === 0 && Math.abs(c) > 1) status = { text: `coefficient ${f(c, 1)} rounds to 0 at this quality: that stripe is gone from the block (a loss of ${f(Math.abs(c), 1)})`, tone: 'warn' };
      else if (r.nonzero === 1) status = { text: 'a smooth block: one coefficient (the mean) describes it', tone: 'ok' };
      else status = { text: `${r.nonzero} integers kept; each coefficient errs by at most half its table entry`, tone: 'info' };
      return { hud: `{nz|${r.nonzero}} of 64 kept   RMS {back|${f(r.rms, 2)}}   max {err|${f(r.maxError, 0)}}`, rows, status, values: [['nonzero', String(r.nonzero), 'nz'], ['RMS error', f(r.rms, 2), 'back'], ['max error', f(r.maxError, 0), 'err'], ['table scale', `${f(r.scale, 0)} %`, 'scale']] };
    },
    panel(host, m, r, ctx) { blockPanel(host, m, r, ctx); },
  };
}
function paintBlock_(ctx, m, r) { paintWith(ctx, (g, w, h, ov) => paintBlock(g, w, h, ov, m, r)); }

function blockPanel(host, m, r, ctx) {
  once(host, 'block', (h) => {
    h.refreshers.push(segmented(h, 'block', Object.entries(BLOCKS).map(([id, v]) => [id, v[0]]), () => m.blockId, (id) => { m.blockId = id; ctx.update(); }));
    h.pc = panelCanvas(h, 480, 200);
    h.note = el('p', 'lab-note', h, '');
  });
  host.refreshers.forEach((s) => s());
  const { g } = host.pc;
  g.clearRect(0, 0, 480, 200); g.fillStyle = '#0b0c10'; g.fillRect(0, 0, 480, 200);
  const basis = I.dctBasis(m.cu, m.cv, 8), box = { x: 12, y: 28, w: 160, h: 160 };
  text(g, `basis image (u ${m.cu}, v ${m.cv})`, 12, 18, { size: 15, color: '#aab2c5', halo: false });
  drawBitmap(g, bitmapOf(basis, 8, 8, midGrayRgb(0.25)), box);
  text(g, 'the block is the sum of', 200, 70, { size: 15, color: '#8b93a7', halo: false });
  text(g, 'coefficient × basis image', 200, 94, { size: 15, color: '#8b93a7', halo: false });
  text(g, `${f(r.coefficients[r.k], 1)} × this image`, 200, 130, { size: 20, color: '#56d4dd', halo: false });
  host.note.textContent = 'Click a coefficient, an integer or a table entry. The block is the sum of the 64 basis images weighted by the 64 coefficients.';
}

// ---------------------------------------------------------------- the 64 basis images

let basisCache = null;
const basisImages = () => { if (!basisCache) { basisCache = []; for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) basisCache.push(bitmapOf(I.dctBasis(u, v, 8), 8, 8, midGrayRgb(0.25))); } return basisCache; };

const BASIS_PRESETS = [
  { label: '1 × 1: the mean only', set: { keep: 1 } },
  { label: '2 × 2', set: { keep: 2 } },
  { label: '3 × 3', set: { keep: 3 } },
  { label: '5 × 5', set: { keep: 5 } },
  { label: 'all 64: exact', set: { keep: 8 } },
  { label: 'the disc edge block, 4 × 4', set: { blockId: 'disc', keep: 4 } },
];

function basisGeo(w, h, ov) {
  const a = area(ov, w, h);
  const [l, r] = splitRow(a, 2, 24, [1.15, 1]);
  const grid = imageRect({ x: l.x, y: l.y + 14, w: l.w, h: l.h - 14 }, 8, 8, 100);
  const rs = splitCol(r, 3, 22);
  return { grid, orig: imageRect({ x: rs[0].x, y: rs[0].y + 14, w: rs[0].w, h: rs[0].h - 14 }, 8, 8, 40), rebuilt: imageRect({ x: rs[1].x, y: rs[1].y + 14, w: rs[1].w, h: rs[1].h - 14 }, 8, 8, 40), err: imageRect({ x: rs[2].x, y: rs[2].y + 14, w: rs[2].w, h: rs[2].h - 14 }, 8, 8, 40) };
}

export function basisView() {
  const hit = (ctx, x, y) => {
    const ov = overlayFor(ctx), L = basisGeo(ov.w, ov.h, ov), m = ctx.state(), c = cellAt(L.grid, 8, 8, x, y);
    if (c) { m.cu = c.i; m.cv = c.j; ctx.refresh(); }
  };
  return {
    id: 'basis', topic: 'jpeg', label: '64 basis images', group: 'jpegblock', init: BLOCK_INIT, presets: BASIS_PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    params: [{ id: 'keep', label: 'keep K × K', min: 1, max: 8, step: 1 }], inputTitle: 'Lowest frequencies kept',
    regions: ['Cosine transform'], keys: {}, panelTitle: 'Block',
    setup(ctx) { setupOverlay(ctx, { down: (x, y) => hit(ctx, x, y), move: (x, y) => hit(ctx, x, y) }); },
    leave: leaveOverlay,
    run: runBlock,
    draw(v, m, r, ctx) {
      paintWith(ctx, (g, w, h, ov) => {
        const L = basisGeo(w, h, ov), cs = L.grid.w / 8, tiles = basisImages();
        caption(g, 'the 64 basis images; frequency rises across (u) and down (v)', L.grid);
        for (let q = 0; q < 64; q++) {
          const x = L.grid.x + (q % 8) * cs, y = L.grid.y + Math.floor(q / 8) * cs;
          g.imageSmoothingEnabled = false; g.drawImage(tiles[q], x + 1, y + 1, cs - 2, cs - 2);
          if ((q % 8) >= m.keep || Math.floor(q / 8) >= m.keep) { g.fillStyle = 'rgba(11,12,16,0.62)'; g.fillRect(x, y, cs, cs); }
        }
        outline(g, L.grid.x, L.grid.y, m.keep * cs, m.keep * cs, '#7ee787', 2);
        outline(g, L.grid.x + m.cu * cs, L.grid.y + m.cv * cs, cs, cs, '#ffd166', 3);
        caption(g, 'block', L.orig); caption(g, `rebuilt from ${m.keep} × ${m.keep} = ${m.keep * m.keep} coefficients`, L.rebuilt); caption(g, 'block − rebuilt', L.err);
        drawCells(g, r.pixels, 8, 8, L.orig, { color: (v2) => grayRgb(v2 / 255), fmt: (v2) => f(v2, 0), minCell: 22 });
        drawCells(g, r.rebuilt.map((v2) => v2 + 128), 8, 8, L.rebuilt, { color: (v2) => grayRgb(v2 / 255), fmt: (v2) => f(v2, 0), minCell: 22 });
        drawCells(g, r.pixels.map((v2, k) => v2 - 128 - r.rebuilt[k]), 8, 8, L.err, { color: signedRgb(40), fmt: (v2) => f(v2, 0), minCell: 22 });
      });
    },
    explain(m, r) {
      const diffs = r.pixels.map((v, k) => v - 128 - r.rebuilt[k]);
      const rms = Math.sqrt(diffs.reduce((s, v) => s + v * v, 0) / 64);
      const energy = r.coefficients.reduce((s, v) => s + v * v, 0), kept = r.kept.reduce((s, v) => s + v * v, 0);
      const rows = [
        `{keep|K = ${m.keep}}: keep the ${m.keep} × ${m.keep} lowest frequencies, ${m.keep * m.keep} of 64 numbers`,
        `energy kept: ${f(kept, 0)} of ${f(energy, 0)} = ${f(100 * kept / energy, 2)} %`,
        `RMS error of the rebuilt block: {err|${f(rms, 2)}} gray levels`,
        `basis image (u ${m.cu}, v ${m.cv}): ${m.cu} half-periods across, ${m.cv} down; coefficient ${f(r.coefficients[r.k], 1)}`,
        `the basis images are orthonormal: each has sum of squares 1 and any two are perpendicular`,
      ];
      const status = m.keep === 8 ? { text: 'all 64 coefficients: a change of basis loses nothing, the block returns exactly', tone: 'ok' } : m.keep === 1 ? { text: 'the mean alone: a flat block', tone: 'info' } : { text: `${m.keep * m.keep} numbers rebuild the block to within RMS ${f(rms, 1)}`, tone: 'info' };
      return { hud: `K = {keep|${m.keep}}: RMS error {err|${f(rms, 2)}}`, rows, status, values: [['kept', `${m.keep * m.keep} of 64`, 'keep'], ['energy kept', `${f(100 * kept / energy, 1)} %`, null], ['RMS error', f(rms, 2), 'err'], ['basis (u, v)', `(${m.cu}, ${m.cv})`, null]] };
    },
    panel(host, m, r, ctx) { blockPanel(host, m, r, ctx); },
  };
}

// ---------------------------------------------------------------- a whole image

// the crop's center (cx, cy) is a pixel corner of the picture at cn by cn; a preset names it as a fraction of the picture
const IMG_INIT = { quality: 50, sub: 1, cx: 22, cy: 24, cn: 64, grid: 0 };
const cropAt = (fx, fy, n) => ({ cx: Math.round(fx * n), cy: Math.round(fy * n), cn: n });
const IMG_PRESETS = [
  { label: 'quality 90', set: { quality: 90, sub: 1 } },
  { label: 'quality 50', set: { quality: 50, sub: 1 } },
  { label: 'quality 10: blocking', set: { quality: 10, sub: 1, grid: 1 } },
  { label: 'quality 5', set: { quality: 5, sub: 1, grid: 1 } },
  { label: '4:2:0 fringe at quality 60', set: { quality: 60, sub: 1 }, crop: [36 / 64, 30 / 64] },
  { label: 'no subsampling at quality 60', set: { quality: 60, sub: 0 }, crop: [36 / 64, 30 / 64] },
  { label: 'quality 100', set: { quality: 100, sub: 0 } },
];
/** the 16 by 16 crop at the same spot of the picture at n by n, kept inside it */
function fitCrop(m, n) {
  if (m.cn && m.cn !== n) { m.cx = Math.round((m.cx * n) / m.cn); m.cy = Math.round((m.cy * n) / m.cn); }
  m.cn = n;
  m.cx = Math.min(n - 8, Math.max(8, m.cx)); m.cy = Math.min(n - 8, Math.max(8, m.cy));
}
const SWEEP = [5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100];
const sweeps = new Map();   // one measured curve per size and chroma choice
function sweepOf(n, sub) {
  const key = `${n}|${sub}`;
  if (!sweeps.has(key)) sweeps.set(key, []);
  return sweeps.get(key);
}
function stopSweeps() { for (const store of sweeps.values()) { clearTimeout(store.timer); store.running = false; } }
function ensureSweep(n, sub, onPoint) {
  const store = sweepOf(n, sub);
  if (store.length >= SWEEP.length || store.running) return;
  store.running = true;
  const c = colorAt255(n);
  (function next() {
    if (store.length >= SWEEP.length) { store.running = false; return; }
    const q = SWEEP[store.length], j = I.jpegColor(c.r, c.g, c.b, n, n, q, sub === 1);
    store.push({ q, bpp: j.bitsPerPixel, psnr: j.psnr });
    onPoint();
    store.timer = setTimeout(next, 0);
  })();
}

// the coded picture depends on the size, the quality and the chroma choice only, so moving the crop costs nothing
const coded = new Map();
function runImage(m, n = 64) {
  fitCrop(m, n);
  const key = `${n}|${m.quality}|${m.sub}`;
  if (!coded.has(key)) {
    if (coded.size > 40) coded.delete(coded.keys().next().value);
    const c = colorAt255(n);
    const j = I.jpegColor(c.r, c.g, c.b, n, n, m.quality, m.sub === 1);
    const luma = I.codePlane(I.lumaOf(c.r, c.g, c.b), n, n, m.quality, I.LUMA_TABLE);
    const chroma = I.chromaSubsample(c.r, c.g, c.b, n, n);
    coded.set(key, { n, c, ...j, nonzeroPerBlock: luma.nonzeroPerBlock, blocks: luma.blocks, numbersBefore: chroma.numbersBefore, numbersAfter: chroma.numbersAfter });
  }
  return coded.get(key);
}

function imgGeo(w, h, ov, n = 64) {
  const a = area(ov, w, h);
  const top = splitRow({ x: a.x, y: a.y, w: a.w, h: a.h * 0.5 }, 4, 16).map((c) => imageRect({ x: c.x, y: c.y + 14, w: c.w, h: c.h - 14 }, n, n, 8));
  const cols = splitRow({ x: a.x, y: a.y + a.h * 0.55, w: a.w, h: a.h * 0.45 }, 2, 26).map((c) => ({ x: c.x, y: c.y + 14, w: c.w, h: c.h - 14 }));
  return { orig: top[0], dec: top[1], cropO: top[2], cropD: top[3], size: cols[0], psnr: cols[1] };
}

export function imageView(res = makeResolution()) {
  const hit = (ctx, x, y) => {
    const n = res.scene;
    const ov = overlayFor(ctx), L = imgGeo(ov.w, ov.h, ov, n), m = ctx.state(), c = cellAt(L.orig, n, n, x, y) ?? cellAt(L.dec, n, n, x, y);
    if (c) { m.cx = Math.min(n - 8, Math.max(8, c.i)); m.cy = Math.min(n - 8, Math.max(8, c.j)); m.cn = n; ctx.refresh(); }
  };
  const presets = IMG_PRESETS.map((p) => (p.crop ? { label: p.label, run: (m) => Object.assign(m, p.set, cropAt(p.crop[0], p.crop[1], res.scene)) } : p));
  return {
    id: 'image', topic: 'jpeg', label: 'Whole image', init: IMG_INIT, presets, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    params: [{ id: 'quality', label: 'quality', min: 1, max: 100, step: 1 }], inputTitle: 'JPEG quality',
    regions: ['Chroma subsampling', 'Size of a JPEG image'], keys: {}, panelTitle: 'Chroma and grid',
    setup(ctx) { setupOverlay(ctx, { down: (x, y) => hit(ctx, x, y), move: (x, y) => hit(ctx, x, y) }); },
    leave(ctx) { stopSweeps(); leaveOverlay(ctx); },
    run(m) { return runImage(m, res.scene); },
    draw(v, m, r, ctx) {
      const n = r.n;
      const ov = paintWith(ctx, (g, w, h, o) => {
        const L = imgGeo(w, h, o, n), x0 = m.cx - 8, y0 = m.cy - 8;
        caption(g, `original ${n} × ${n}`, L.orig); caption(g, `decoded, quality ${m.quality}, ${m.sub ? '4:2:0' : '4:4:4'}`, L.dec); caption(g, 'crop of the original, 16 × 16', L.cropO); caption(g, 'crop of the decoded', L.cropD);
        const crop = (a, rect) => { const cv = bitmapRgb(a.r, a.g, a.b, n, n); g.imageSmoothingEnabled = false; g.drawImage(cv, x0, y0, 16, 16, rect.x, rect.y, rect.w, rect.h); g.strokeStyle = '#2c3140'; g.strokeRect(rect.x - 0.5, rect.y - 0.5, rect.w + 1, rect.h + 1); };
        drawBitmap(g, bitmapRgb(r.c.r, r.c.g, r.c.b, n, n), L.orig);
        drawBitmap(g, bitmapRgb(r.r, r.g, r.b, n, n), L.dec);
        crop(r.c, L.cropO); crop({ r: r.r, g: r.g, b: r.b }, L.cropD);
        const cs = L.dec.w / n;
        if (m.grid) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1; g.beginPath(); for (let k = 0; k <= n / 8; k++) { g.moveTo(L.dec.x + k * 8 * cs, L.dec.y); g.lineTo(L.dec.x + k * 8 * cs, L.dec.y + L.dec.h); g.moveTo(L.dec.x, L.dec.y + k * 8 * cs); g.lineTo(L.dec.x + L.dec.w, L.dec.y + k * 8 * cs); } g.stroke(); }
        for (const rect of [L.orig, L.dec]) outline(g, rect.x + x0 * (rect.w / n), rect.y + y0 * (rect.w / n), 16 * rect.w / n, 16 * rect.w / n, '#ffd166', 2);
        const sw = sweepOf(n, m.sub);
        const pts = (key) => sw.map((p) => [p.q, p[key]]);
        caption(g, 'size: estimated bits per pixel against quality (24 = uncompressed)', L.size);
        drawChart(g, L.size, { x: [0, 100], y: [0, Math.max(6, ...sw.map((p) => p.bpp)) * 1.05], xTicks: [0, 20, 40, 60, 80, 100], yTicks: [0, 2, 4, 6], xLabel: 'quality', series: [{ pts: pts('bpp'), color: '#ffd166' }], dots: [{ x: m.quality, y: r.bitsPerPixel, color: '#ffd166', r: 6 }] });
        caption(g, 'PSNR (dB) against quality', L.psnr);
        drawChart(g, L.psnr, { x: [0, 100], y: [15, 55], xTicks: [0, 20, 40, 60, 80, 100], yTicks: [20, 30, 40, 50], xLabel: 'quality', series: [{ pts: pts('psnr'), color: '#7ee787' }], dots: [{ x: m.quality, y: Math.min(55, r.psnr), color: '#7ee787', r: 6 }] });
        if (sw.length < SWEEP.length) text(g, `measuring ${sw.length} of ${SWEEP.length}`, L.size.x + L.size.w - 8, L.size.y + 16, { size: 11, align: 'right', color: '#ffd166' });
      });
      if (ov) ensureSweep(n, m.sub, () => ov.repaint());
    },
    explain(m, r) {
      const rows = [
        `quality {quality|${m.quality}}: table scale ${f(I.qualityScale(m.quality), 0)} %, ${r.blocks} blocks of 8 × 8, {nz|${f(r.nonzeroPerBlock, 1)}} nonzero luma coefficients per block`,
        `size {bits|${f(r.bits, 0)} bits} (an entropy estimate) = {bpp|${f(r.bitsPerPixel, 2)} bits per pixel}; the original is 24: ratio {ratio|${f(r.ratio, 1)} : 1}`,
        `{psnr|PSNR = ${f(r.psnr, 1)} dB} against the original (peak 255)`,
        `{chroma|chroma ${m.sub ? '4:2:0' : '4:4:4'}}: per 2 × 2 pixels ${m.sub ? '4 Y + 1 Cb + 1 Cr = 6 numbers' : '4 Y + 4 Cb + 4 Cr = 12 numbers'} before the cosine transform`,
        `on the lecture's render (a different picture): 16.2, 7.7 and 3.3 nonzero coefficients per block at quality 90, 50 and 10`,
      ];
      let status;
      if (m.quality <= 20) status = { text: `blocking: each 8 × 8 block is quantized alone, so neighbors disagree at the block edges (show the grid)`, tone: 'bad' };
      else if (m.quality >= 90) status = { text: `${f(r.psnr, 1)} dB: hard to tell apart from the original, at ${f(r.bitsPerPixel, 2)} bits per pixel`, tone: 'ok' };
      else status = { text: `${f(r.ratio, 1)} : 1 at ${f(r.psnr, 1)} dB; ringing and softness appear beside edges and in fine texture`, tone: 'info' };
      return { hud: `{bpp|${f(r.bitsPerPixel, 2)} bits/pixel}  {ratio|${f(r.ratio, 1)}:1}  {psnr|${f(r.psnr, 1)} dB}`, rows, status, values: [['bits per pixel', f(r.bitsPerPixel, 2), 'bpp'], ['PSNR', `${f(r.psnr, 1)} dB`, 'psnr'], ['ratio', `${f(r.ratio, 1)} : 1`, 'ratio'], ['numbers', `${r.numbersBefore} → ${r.numbersAfter}`, 'chroma']] };
    },
    panel(host, m, r, ctx) {
      once(host, 'image', (h) => {
        h.refreshers.push(segmented(h, 'chroma', [[1, '4:2:0'], [0, '4:4:4']], () => m.sub, (v) => { m.sub = v; ctx.update(); }));
        h.refreshers.push(segmented(h, 'block grid', [[0, 'off'], [1, 'on']], () => m.grid, (v) => { m.grid = v; ctx.update(); }));
        h.refreshers.push(resolutionRow(h, 'scene', res, (n) => { res.scene = n; ctx.update(); }));
        el('p', 'lab-note', h, 'Click either picture to move the 16 × 16 crop. The color edges of the red disc and the blue box show 4:2:0 as a fringe.');
      });
      host.refreshers.forEach((s) => s());
    },
  };
}
