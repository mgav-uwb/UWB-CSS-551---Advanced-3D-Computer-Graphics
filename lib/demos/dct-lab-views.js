// dct-lab-views: the view catalog behind the dct-lab demo (runtime: lib/core/lab.js). The discrete cosine transform (DCT) as a change of basis:
// bases (the pixel basis and the cosine basis of a toy image), build and coef (held, in dct-lab-held.js), rebuild
// (add the basis images one at a time, suppress coefficients) and lowpass (keep the lowest k x k block); the last two are in
// dct-lab-views-rebuild.js. There is no code in this lab: every view has no regions, and the lab has no program.
//
// makeViews(heldViews, heldInputs) builds the list; a topic with no view is dropped, so the public build (whose dct-lab-held.js is a stub) has
// the topics Bases, Rebuild and Keep k x k.
import { heldViews as stubbedViews, HELD_INPUTS } from './dct-lab-held.js';
import { COL } from '../core/lab-viz.js';
import {
  capHeight, mode, f, grayRgb, signedRgb, midGrayRgb, drawCells, outline, text, el, segmented, once, cMatrix, basisSet, TOYS, inputOf, analyze, areaOf, tiles, cap,
  cells, withHeaders, drawHeaders, clamp, overlayView,
} from './dct-lab-draw.js';
import { rebuildView, lowpassView } from './dct-lab-views-rebuild.js';

export const KEYS = {
  x: COL.white, wt: COL.cyan, pos: COL.gold, sum: COL.c, psnr: COL.c, mse: COL.amber, cnt: COL.gold, drop: COL.red, keep: COL.green, uc: COL.gold, vc: COL.c,
  mean: COL.pink, err: COL.red, row: COL.purple, dot: COL.b,
};

const TOPIC_LABELS = { bases: 'Bases', build: 'Build C', coef: 'Coefficients', rebuild: 'Rebuild', lowpass: 'Keep k × k' };
const TOPIC_ORDER = ['bases', 'build', 'coef', 'rebuild', 'lowpass'];
/** the topics that have a view, in order */
export const topicsOf = (views) => TOPIC_ORDER.filter((id) => views.some((v) => v.topic === id)).map((id) => ({ id, label: TOPIC_LABELS[id] }));

/** the values every view shares (one group): the input, the toy and its size, the suppressed coefficients, the block of the picture */
export const BASE_INIT = { input: 'toy', n: 4, toy: 'edge', drop: '', bx: 2, by: 3 };

export const toyPresets = () => TOYS.map((t) => ({ label: t.label, set: { input: 'toy', toy: t.id } }));
const sizeRow = (h, m, ctx) => segmented(h, 'size', [[4, '4 × 4'], [5, '5 × 5']], () => m.n, (v) => { m.n = v; ctx.update(); });

// ---------------------------------------------------------------- bases

const pixelImage = (n, idx) => { const a = new Array(n * n).fill(0); a[idx] = 1; return a; };

/** a grid of n x n small images in the square r, each with a line of text under it; tile (u, v) is column u, row v */
function imageGrid(g, r, n, imageOf, labelOf, { color, sel = null, selColor = '#ffd166' } = {}) {
  const p = r.w / n, label = p >= 36;
  const side = Math.max(6, p - (label ? 19 : 4));
  for (let v = 0; v < n; v++) {
    for (let u = 0; u < n; u++) {
      const x = r.x + u * p, y = r.y + v * p, img = { x: x + (p - side) / 2, y: y + 2, w: side, h: side };
      drawCells(g, imageOf(u, v), n, n, img, { color, minCell: 1e9, gridLine: side / n >= 9 });
      if (label) text(g, labelOf(u, v), x + p / 2, y + 2 + side + 13, { size: Math.min(11.5, p * 0.24), align: 'center', color: '#c7cdda', halo: false, weight: 600 });
    }
  }
  if (sel) outline(g, r.x + sel.u * p + 0.5, r.y + sel.v * p + 0.5, p - 1, p - 1, selColor, 2.5);
  return { r, p };
}

function runBases(m) {
  const n = m.n === 5 ? 5 : 4, input = inputOf({ ...m, input: 'toy', n }), an = analyze(input), X = input.X, Y = an.blocks[0].Y, C = cMatrix(n);
  m.su = clamp(m.su, 0, n - 1); m.sv = clamp(m.sv, 0, n - 1); m.px = clamp(m.px, 0, n - 1); m.py = clamp(m.py, 0, n - 1);
  const B = basisSet(n);
  // the image as a sum of its weighted basis images, in each basis
  const pixelSum = new Array(n * n).fill(0), cosSum = new Array(n * n).fill(0);
  for (let idx = 0; idx < n * n; idx++) { pixelSum[idx] += X[idx]; for (let k = 0; k < n * n; k++) cosSum[k] += Y[idx] * B[idx][k]; }
  const diff = (a) => Math.max(...a.map((v, k) => Math.abs(v - X[k])));
  let big = { v: 0, u: 1, w: 0 };
  for (let v = 0; v < n; v++) for (let u = 0; u < n; u++) if ((u || v) && Math.abs(Y[v * n + u]) > Math.abs(big.w)) big = { v, u, w: Y[v * n + u] };
  return { n, X, Y, C, B, pixelSum, cosSum, pixelErr: diff(pixelSum), cosErr: diff(cosSum), big, sumPixels: X.reduce((s, v) => s + v, 0) };
}

function paintBases(g, w, h, ov, m, r) {
  const n = r.n, a = areaOf(w, h, ov), lay = {};
  if (m.basis === 'pixel') {
    // the pixel images large on the left; the image and the weighted sum stacked on the right
    const ch = capHeight() + 2, side = Math.max(40, Math.min(a.h - ch, a.w * (mode.narrow ? 0.6 : 0.6))), sq = Math.max(40, Math.min(a.x + a.w - (a.x + side + 20), (a.h - 2 * ch - 10) / 2));
    const rg = { x: a.x, y: a.y + ch, w: side, h: side }, rx = { x: a.x + side + 20, y: a.y + ch, w: sq, h: sq }, rs = { x: a.x + side + 20, y: a.y + ch + sq + ch + 10, w: sq, h: sq };
    cap(g, rx, 'the image X', `${n} × ${n} pixel values`);
    cells(g, r.X, n, n, rx, { color: grayRgb });
    cap(g, rg, `the ${n * n} pixel images`, 'each is 1 at one pixel, 0 elsewhere; weight below', { short: `${n * n} pixel images` });
    lay.grid = imageGrid(g, rg, n, (u, v) => pixelImage(n, v * n + u), (u, v) => `× ${f(r.X[v * n + u], 2)}`, { color: grayRgb, sel: { u: m.px, v: m.py } });
    cap(g, rs, 'the weighted sum', 'weighted images added: the same X');
    cells(g, r.pixelSum, n, n, rs, { color: grayRgb });
    outline(g, rx.x + (m.px * rx.w) / n, rx.y + (m.py * rx.h) / n, rx.w / n, rx.h / n, '#ffd166', 2.5);
    lay.mode = 'pixel';
    return lay;
  }
  const [rx, rc, rg, ro] = tiles(a, [{}, {}, {}, {}], { gap: mode.narrow ? 12 : 20 });
  cap(g, rx, 'the image X', `${n} × ${n} pixel values`);
  cells(g, r.X, n, n, rx, { color: grayRgb });
  // the matrix C, rows k and columns i
  cap(g, rc, 'the matrix C', 'row k is a cosine with k half-periods across the image');
  const cr = withHeaders(rc);
  drawHeaders(g, cr, n, { names: ['i', 'k'] });
  cells(g, r.C, n, n, cr, { color: signedRgb(0.7), dec: 3 });
  const rowBox = (k, col) => outline(g, cr.x, cr.y + (k * cr.h) / n, cr.w, cr.h / n, col, 2.5);
  rowBox(m.sv, '#7ee787'); rowBox(m.su, '#ffd166');
  // the n x n basis images with their weights
  cap(g, rg, `the ${n * n} cosine images, each with its weight`, 'across: u (horizontal), down: v (vertical)', { short: `${n * n} cosine images` });
  lay.grid = imageGrid(g, rg, n, (u, v) => r.B[v * n + u], (u, v) => f(r.Y[v * n + u], 2), { color: midGrayRgb(2 / n), sel: { u: m.su, v: m.sv } });
  // one basis image as the outer product of two rows of C
  cap(g, ro, `the image for (u ${m.su}, v ${m.sv}) as a product`, 'column c_v times row c_uᵀ, entry by entry', { short: `product (u ${m.su}, v ${m.sv})` });
  const p = Math.min(ro.w, ro.h - 16) / (n + 1), ox = ro.x + (ro.w - p * (n + 1)) / 2, oy = ro.y + 16;
  const cu = Array.from({ length: n }, (_, i) => r.C[m.su * n + i]), cv = Array.from({ length: n }, (_, i) => r.C[m.sv * n + i]);
  text(g, 'c_uᵀ', ox + p * 1.05, oy - 4, { size: 11.5, color: '#ffd166', halo: false, weight: 600 });
  text(g, 'c_v', ox + p / 2, oy + p / 2 + 4, { size: 11.5, align: 'center', color: '#7ee787', halo: false, weight: 600 });
  cells(g, cu, n, 1, { x: ox + p, y: oy, w: p * n, h: p }, { color: signedRgb(0.7), dec: 3, minCell: 38 });
  cells(g, cv, 1, n, { x: ox, y: oy + p, w: p, h: p * n }, { color: signedRgb(0.7), dec: 3, minCell: 38 });
  cells(g, r.B[m.sv * n + m.su], n, n, { x: ox + p, y: oy + p, w: p * n, h: p * n }, { color: signedRgb(2 / n), dec: 3 });
  lay.mode = 'cos';
  return lay;
}

export function basesView() {
  return overlayView({
    id: 'bases', topic: 'bases', label: 'Two bases', group: 'dct',
    init: { ...BASE_INIT, basis: 'cos', su: 1, sv: 0, px: 1, py: 1 },
    presets: [...toyPresets(), { label: 'the pixel basis', set: { basis: 'pixel' } }, { label: 'the cosine basis', set: { basis: 'cos' } }, { label: '5 × 5 ramp, cosine', set: { n: 5, toy: 'ramp', input: 'toy', basis: 'cos' } }],
    panelTitle: 'Image and basis',
    paint: paintBases,
    hit(x, y, m, lay) {
      const gr = lay.grid;
      if (!gr || x < gr.r.x || y < gr.r.y || x >= gr.r.x + gr.r.w || y >= gr.r.y + gr.r.h) return false;
      const n = m.n === 5 ? 5 : 4, u = Math.min(n - 1, Math.floor((x - gr.r.x) / gr.p)), v = Math.min(n - 1, Math.floor((y - gr.r.y) / gr.p));
      if (lay.mode === 'pixel') { m.px = u; m.py = v; } else { m.su = u; m.sv = v; }
      return true;
    },
    run: runBases,
    explain(m, r) {
      const n = r.n;
      if (m.basis === 'pixel') {
        const w = r.X[m.py * n + m.px];
        return {
          hud: `pixel basis: ${n * n} images, each weighted by its own pixel`,
          rows: [
            `{x|the image X} is ${n} × ${n} = ${n * n} numbers. In the pixel basis the weight of each basis image is the pixel value itself.`,
            `pixel (x ${m.px}, y ${m.py}): weight {wt|${f(w, 2)}} times the image that is 1 there and 0 everywhere else`,
            `the ${n * n} weighted pixel images added up: {sum|largest difference from X is ${f(r.pixelErr, 2)}}`,
          ],
          status: { text: 'The weights are the pixel values: they say where the image is bright and nothing about how fast it changes across the image.', tone: 'info' },
          values: [['weights', `${n * n} pixel values`, 'wt'], ['selected', `(${m.px}, ${m.py}) = ${f(w, 2)}`, 'wt']],
        };
      }
      const y = r.Y[m.sv * n + m.su], c = r.C;
      const cnt = r.Y.filter((v) => Math.abs(v) > 0.1).length;
      return {
        hud: `weight of the image (u ${m.su}, v ${m.sv}): {wt|${f(y, 3)}}`,
        rows: [
          `{row|matrix C}, ${n} × ${n}: row k is a cosine that makes k half-periods across the ${n} pixels (row 0 is constant)`,
          `basis image for (u ${m.su}, v ${m.sv}): B = c_v c_uᵀ, the product of row ${m.sv} (c_v) and row ${m.su} (c_u) of C; for example B[0][0] = ${f(c[m.sv * n], 3)} × ${f(c[m.su * n], 3)} = ${f(c[m.sv * n] * c[m.su * n], 3)}`,
          `its weight in this image: {wt|Y[${m.sv}][${m.su}] = ${f(y, 3)}} (row v is vertical frequency, column u horizontal)`,
          `{mean|Y[0][0] = ${f(r.Y[0], 3)}}: the weight of the flat image (u 0, v 0), which carries the image's average brightness`,
          `the ${n * n} weighted cosine images added up: {sum|largest difference from X is ${r.cosErr < 1e-12 ? 'below 1e-12' : f(r.cosErr, 3)}}`,
        ],
        status: { text: `${cnt} of ${n * n} weights are larger than 0.1 in size; the largest besides the mean is at (u ${r.big.u}, v ${r.big.v}), ${f(r.big.w, 3)}. Small u and v are slow changes, large ones fast alternation.`, tone: 'info' },
        values: [['weights', `${n * n} numbers`, 'wt'], ['selected', `Y[${m.sv}][${m.su}] = ${f(y, 3)}`, 'wt'], ['mean weight', f(r.Y[0], 3), 'mean']],
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'bases', (h) => {
        h.refreshers.push(segmented(h, 'basis', [['pixel', 'pixel basis'], ['cos', 'cosine basis']], () => m.basis, (v) => { m.basis = v; ctx.update(); }));
        h.refreshers.push(sizeRow(h, m, ctx));
        el('p', 'lab-note', h, 'Click a small image in the grid to select it. The toy image is the same in both bases: only the weights change.');
      });
      host.refreshers.forEach((s) => s());
    },
  });
}

// ---------------------------------------------------------------- the catalog

/** all views; the held ones come from heldViews(shared), which is [] in the public build */
export function makeViews(heldViews = stubbedViews, heldInputs = HELD_INPUTS) {
  const shared = { group: 'dct', baseInit: BASE_INIT, keys: KEYS, toyPresets, sizeRow };
  const held = heldViews(shared);
  const byId = (id) => held.find((v) => v.id === id);
  return [basesView(), byId('build'), byId('coef'), rebuildView(heldInputs, shared), lowpassView(heldInputs, shared)].filter(Boolean);
}
export const TOPICS = topicsOf(makeViews());
