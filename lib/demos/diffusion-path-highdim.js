// diffusion-path-highdim: view d of the diffusion-path lab. A digit is 400 numbers; four pictures of what that does to distances over the walk:
// the sample stays at the noise radius from its nearest digit, its length cannot tell it from a digit, the coarse part of the guess settles
// before the fine part, and the starting noise has no nearest digit.
import { alphaBar } from '../core/diffusion.js';
import { STEPS, D, digits, digitLengths, startNoise, startDistances, summary, startLabel } from './diffusion-path-core.js';
import { DIG_INIT, runDigits, shellFact, digitName } from './diffusion-path-digits.js';
import {
  text, f, areaOf, head, legend, drawChart, splitRow, splitCol, INK, noiseControls, isNarrow, startNoiseNote, paintLoading, loadingExplain,
  setupOverlay, leaveOverlay, paintWith, overlayFor,
} from './diffusion-path-draw.js';

const PRESETS = [
  { label: 'seed 1', set: { seed: 1 } },
  { label: 'seed 2', set: { seed: 2 } },
  { label: 'seed 3', set: { seed: 3 } },
  { label: 'seed 4', set: { seed: 4 } },
  { label: 'too large (×3)', set: { start: 'big', k: 0 } },
  { label: 'too small (×0.7)', set: { start: 'small', k: 0 } },
  { label: 'too large (×3), trained network', set: { start: 'big', den: 'net', k: 12 } },
  { label: 'the end: step 30', set: { k: STEPS } },
];
const H3 = 64;            // room above a chart for a title and three lines of note
const BIN = 0.5, HIST = [15, 70];

const startCache = new Map();
/** the distances from the starting noise to the digits, cached per (seed, start) */
export function startSpread(seed, start) {
  const key = `${seed}|${start}`;
  if (!startCache.has(key)) {
    const d = startDistances(startNoise(seed, start), digits());
    startCache.set(key, { d, ...summary(d) });
    if (startCache.size > 30) startCache.delete(startCache.keys().next().value);
  }
  return startCache.get(key);
}
let lengths = null;
const digitRange = () => (lengths ??= digitLengths(digits()));

export function highGeo(w, h, ov) {
  const a = areaOf(ov, w, h);
  const rows = splitCol({ x: a.x, y: a.y, w: a.w, h: a.h }, 2, isNarrow(w) ? 12 : 16);
  const nar = isNarrow(w);
  const cells = rows.map((rw) => splitRow(rw, 2, nar ? 14 : 22)).flat();
  if (nar) return { a, narrow: true, cells: cells.map((c) => ({ head: { x: c.x, y: c.y - 14, w: c.w }, chart: { x: c.x, y: c.y + 10, w: c.w, h: Math.max(60, c.h - 10) } })) };
  return { a, cells: cells.map((c) => ({ head: { x: c.x, y: c.y - 14, w: c.w }, chart: { x: c.x, y: c.y + H3 - 14, w: c.w, h: Math.max(60, c.h - H3 + 6) } })) };
}

export function runHigh(m, ctx) {
  const r = runDigits(m, ctx);
  if (r.loading) return r;
  r.spread = startSpread(m.seed, m.start);
  r.range = digitRange();
  return r;
}

export function paintHigh(g, w, h, ov, m, r) {
  if (r.loading) { paintLoading(g, w, h, ov, r.loading); return; }
  const L = highGeo(w, h, ov), { tr, k, mt } = r;
  const ticks = [0, 5, 10, 15, 20, 25, 30];
  const cur = { x: k, color: INK.cursor, dash: [] };
  // 1. the nearest digit and the radius of the cloud
  head(g, L.narrow ? 'Nearest digit' : 'Inside the cloud of noised digits', L.narrow ? '' : "Cyan: distance to the nearest digit, shrunk to this step's scale. Gold: the cloud's radius √((1 − ᾱ (alpha bar)) · 400). They match. Gray: unshrunk distance.", L.cells[0].head, L.narrow ? 0 : 3);
  const top1 = Math.max(30, Math.ceil(Math.max(...mt.raw, ...mt.scaled) / 5) * 5);
  drawChart(g, L.cells[0].chart, {
    x: [0, STEPS], y: [0, top1], xTicks: ticks, yTicks: [0, top1 / 2, top1], xLabel: 'step k', vlines: [cur],
    series: [{ pts: mt.raw.map((v, i) => [i, v]), color: '#6b7488', width: 1.8 }, { pts: mt.radius.map((v, i) => [i, v]), color: INK.cursor, width: 2, dash: [6, 4] }, { pts: mt.scaled.map((v, i) => [i, v]), color: INK.cyan, width: 2.4 }],
    dots: [{ x: k, y: mt.scaled[k], color: INK.cyan, r: 4.5 }],
  });
  // 2. the length of the sample, the noise shell and the digits' lengths
  head(g, L.narrow ? 'Length vs noise' : 'Length does not tell noise from a digit', L.narrow ? '' : 'Blue line: length of the sample. Gold: pure noise, √400 = 20. Band: the lengths of the 2,000 digits. A digit is about as long as the noise.', L.cells[1].head, L.narrow ? 0 : 3);
  const lo = Math.min(14, Math.floor(Math.min(...mt.length) - 1)), hi = Math.max(24, Math.ceil(Math.max(...mt.length) + 1));
  const c2 = drawChart(g, L.cells[1].chart, {
    x: [0, STEPS], y: [lo, hi], xTicks: ticks, yTicks: [lo, Math.round((lo + hi) / 2), hi], xLabel: 'step k', vlines: [cur], hlines: [{ y: Math.sqrt(D), color: INK.cursor, dash: [6, 4] }],
    series: [{ pts: mt.length.map((v, i) => [i, v]), color: INK.cyan, width: 2.4 }], dots: [{ x: k, y: mt.length[k], color: INK.cyan, r: 4.5 }],
  });
  g.fillStyle = 'rgba(121,192,255,0.16)';
  g.fillRect(c2.px, c2.Y(r.range.max), c2.pw, c2.Y(r.range.min) - c2.Y(r.range.max));
  text(g, `digits: ${f(r.range.min, 1)} to ${f(r.range.max, 1)}`, c2.px + c2.pw - 6, c2.Y(r.range.min) + 14, { size: 11, color: INK.path, align: 'right' });
  text(g, 'noise: 20', c2.px + 6, c2.Y(Math.sqrt(D)) - 5, { size: 11, color: INK.cursor });
  // 3. coarse before fine
  head(g, L.narrow ? 'Coarse before fine' : 'Coarse settles before fine', L.narrow ? '' : "How far the guess's coarse part (lowest 4 × 4 discrete cosine transform (DCT) block) and fine part (the rest) are from their final values, as a share of their length.", L.cells[2].head, L.narrow ? 0 : 3);
  const top3 = Math.max(1.1, Math.ceil(Math.max(...mt.settleLow, ...mt.settleHigh) * 10) / 10);
  const c3 = drawChart(g, L.cells[2].chart, {
    x: [0, STEPS], y: [0, top3], xTicks: ticks, yTicks: [0, 0.5, 1], xLabel: 'step k', vlines: [cur],
    series: [{ pts: mt.settleHigh.map((v, i) => [i, v]), color: INK.jump, width: 2.4 }, { pts: mt.settleLow.map((v, i) => [i, v]), color: INK.path, width: 2.4 }],
    dots: [{ x: k, y: mt.settleLow[k], color: INK.path, r: 4.5 }, { x: k, y: mt.settleHigh[k], color: INK.jump, r: 4.5 }],
  });
  if (!L.narrow) legend(g, [[INK.path, 'coarse part'], [INK.jump, 'fine part']], c3.px + c3.pw - 190, c3.py + 18);
  // 4. the distances from the starting noise to every digit
  const sp = r.spread;
  head(g, L.narrow ? 'Start to digits' : 'The starting noise has no nearest digit', L.narrow ? '' : `Distance from the starting noise to each of the 2,000 digits: nearest ${f(sp.min, 1)}, farthest ${f(sp.max, 1)}, only ${f(sp.max - sp.min, 1)} apart. Change the starting noise and it moves.`, L.cells[3].head, L.narrow ? 0 : 3);
  const nb = Math.round((HIST[1] - HIST[0]) / BIN), counts = new Array(nb).fill(0);
  for (const v of sp.d) { const b = Math.floor((v - HIST[0]) / BIN); if (b >= 0 && b < nb) counts[b]++; }
  const top4 = Math.max(10, Math.ceil(Math.max(...counts) * 1.15 / 10) * 10);
  const c4 = drawChart(g, L.cells[3].chart, {
    x: HIST, y: [0, top4], xTicks: [20, 30, 40, 50, 60, 70], yTicks: [0, top4], xLabel: 'distance to a training digit',
    bars: counts.map((c, b) => ({ x0: HIST[0] + b * BIN, x1: HIST[0] + (b + 1) * BIN, y: c, color: INK.pink })),
    vlines: [{ x: sp.min, color: INK.guess, dash: [3, 3] }, { x: sp.max, color: INK.jump, dash: [3, 3] }],
  });
  if (!L.narrow) legend(g, [[INK.guess, `nearest digit ${f(sp.min, 1)}`, true], [INK.jump, `farthest digit ${f(sp.max, 1)}`, true]], c4.px + c4.pw - 250, c4.py + 16);
}

export function explainHigh(m, r) {
  if (r.loading) return loadingExplain(r.loading);
  const { tr, k, mt, spread: sp, range } = r;
  const ratio = mt.radius[k] > 0.05 ? mt.scaled[k] / mt.radius[k] : null;
  const rows = [
    `step {k|${k}} of ${STEPS}, d = ${D} numbers per digit; noise level {abar|√(1 − ᾱ (alpha bar)) = ${f(r.sigma, 3)}}`,
    `nearest shrunken digit {near|${f(mt.scaled[k], 1)}} away; the cloud's radius √((1 − ᾱ) · ${D}) = {radius|${f(mt.radius[k], 1)}}; nearest unshrunk digit ${f(mt.raw[k], 1)}`,
    `length of the sample {len|${f(mt.length[k], 1)}}; pure noise {shell|20.0}; the digits run ${f(range.min, 1)} to ${f(range.max, 1)} (median ${f(range.median, 1)})`,
    `distance of x̂₀ from its final value: coarse part {low|${f(mt.settleLow[k], 2)}}, fine part {high|${f(mt.settleHigh[k], 2)}} of each final part's length`,
    `starting noise to the digits: nearest ${f(sp.min, 1)}, farthest ${f(sp.max, 1)}, mean {spread|${f(sp.mean, 1)}} ± ${f(sp.sd, 1)}`,
  ];
  let status;
  if (k === STEPS) status = { text: `the walk ends on ${r.exact ? `training digit ${digitName(tr.final)}` : `a digit ${f(tr.finalDist, 1)} from ${digitName(tr.final)}`}, at distance ${f(mt.raw[k], 1)} from the nearest`, tone: 'ok' };
  else if (ratio > 1.5) status = { text: `the sample is ${f(ratio, 1)} times the cloud's radius from the nearest shrunken digit: outside the cloud the denoiser was built for`, tone: 'warn' };
  else if (ratio < 0.85) status = { text: `the sample is only ${f(ratio, 2)} of the cloud's radius from the nearest shrunken digit: nearer the middle than real noise reaches`, tone: 'warn' };
  else status = { text: `the sample is ${f(ratio, 2)} times the cloud's radius from the nearest shrunken digit: inside the cloud it was trained on, though no digit looks near`, tone: 'ok' };
  return {
    hud: `step {k|${k}}   to nearest digit {near|${f(mt.scaled[k], 1)}}   radius {radius|${f(mt.radius[k], 1)}}   length {len|${f(mt.length[k], 1)}}`,
    rows, status, fact: shellFact(m, r),
    values: [['to nearest digit', f(mt.scaled[k], 1), 'near'], ['cloud radius', f(mt.radius[k], 1), 'radius'], ['length', f(mt.length[k], 1), 'len'], ['start', startLabel(m.start), null]],
  };
}

export function highView() {
  return {
    id: 'highdim', topic: 'highdim', label: 'High dimensions', group: 'digits', init: DIG_INIT, presets: PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    params: [{ id: 'k', label: 'step k', min: 0, max: STEPS, step: 1, play: 'loop', rate: () => 3, format: (v) => `${v} of ${STEPS}` }], inputTitle: 'Step of the walk',
    regions: [], keys: {}, panelTitle: 'Starting noise and denoiser',
    setup(ctx) { setupOverlay(ctx, {}); },
    leave: leaveOverlay,
    run: runHigh,
    paint: paintHigh,
    draw(v, m, r, ctx) { paintWith(ctx, (g, w, h, ov) => paintHigh(g, w, h, ov, m, r)); },
    explain: explainHigh,
    panel(host, m, r, ctx) { noiseControls(host, m, ctx, { id: 'highdim', note: startNoiseNote(m, r) }); },
  };
}
export { alphaBar, overlayFor };
