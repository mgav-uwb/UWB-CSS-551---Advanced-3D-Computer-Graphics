// diffusion-path-coarse: view b of the diffusion-path lab. At every step the denoiser's guess of the clean digit beside the sample: a filmstrip
// of both across the walk, from the blurry average of all digits through a vague digit to one specific digit.
import { STEPS, startLabel } from './diffusion-path-core.js';
import { DIG_INIT, runDigits, shellFact, stage, digitName } from './diffusion-path-digits.js';
import {
  text, f, f2, areaOf, head, legend, drawChart, strip, stripHitFor, drawDigit, squareIn, stripHeight, isNarrow, HEAD1, INK, HEAD, noiseControls, startNoiseNote, paintLoading, loadingExplain,
  setupOverlay, leaveOverlay, paintWith, overlayFor,
} from './diffusion-path-draw.js';

const PRESETS = [
  { label: 'seed 1', set: { seed: 1 } },
  { label: 'seed 2', set: { seed: 2 } },
  { label: 'seed 3: a late commitment', set: { seed: 3 } },
  { label: 'seed 4', set: { seed: 4 } },
  { label: 'the blur: step 0', set: { k: 0 } },
  { label: 'the end: step 30', set: { k: STEPS } },
  { label: 'too large (×3), trained network', set: { start: 'big', den: 'net', k: 12 } },
  { label: 'too small (×0.7), trained network', set: { start: 'small', den: 'net', k: 12 } },
  { label: 'too large (×3), exact', set: { start: 'big', den: 'exact', k: 12 } },
];

/** the pictures' places: three big tiles, two filmstrips, a chart */
export function coarseGeo(w, h, ov) {
  const a = areaOf(ov, w, h);
  const side = stripHeight(a.w, STEPS + 1);
  if (isNarrow(w)) {
    const gap = 10, tw = (a.w - 2 * gap) / 3, s = Math.min(tw, 130), ty = a.y + 26;
    const tiles = [0, 1, 2].map((i) => { const box = { x: a.x + i * (tw + gap), y: ty, w: tw, h: s }; return { box, rect: squareIn(box, s) }; });
    const s1 = ty + s + 30, s2 = s1 + side + 28, cy = s2 + side + 26;
    return { a, narrow: true, tiles, strips: [{ x: a.x, y: s1, w: a.w, h: side }, { x: a.x, y: s2, w: a.w, h: side }], headUp: 22, side,
      chartHead: { x: a.x, y: cy - 22, w: a.w }, chart: { x: a.x, y: cy, w: a.w, h: Math.max(120, a.y + a.h - cy) } };
  }
  const topH = Math.max(130, Math.min(250, a.h * 0.34));
  const tileW = (a.w - 2 * 24) / 3;
  const s = Math.max(60, Math.min(topH - 34, tileW));
  const tiles = [0, 1, 2].map((i) => ({ box: { x: a.x + i * (tileW + 24), y: a.y + 34, w: tileW, h: s }, rect: squareIn({ x: a.x + i * (tileW + 24), y: a.y + 34, w: tileW, h: s }, s) }));
  const y1 = a.y + 34 + s + 18 + HEAD - 14;
  const strips = [{ x: a.x, y: y1, w: a.w, h: side }, { x: a.x, y: y1 + side + HEAD - 4, w: a.w, h: side }];
  const cy = strips[1].y + side + 22;
  return { a, tiles, strips, side, headUp: HEAD - 12, chart: { x: a.x, y: cy + 36, w: a.w, h: Math.max(60, a.y + a.h - cy - 36) }, chartHead: { x: a.x, y: cy - 12, w: a.w } };
}

export function paintCoarse(g, w, h, ov, m, r) {
  if (r.loading) { paintLoading(g, w, h, ov, r.loading); return null; }
  const L = coarseGeo(w, h, ov), { tr, k, mt } = r;
  const nar = L.narrow;
  const names = nar ? [['x_t', ''], ['x̂₀ (x-hat zero)', ''], ['the end (step 30)', '']] : [
    ['The sample x_t', 'What the sampler holds: noise at first, a digit at the end.'],
    ['The guess x̂₀ of the clean digit', 'The denoiser\'s answer to "which digit hides in this noise?"'],
    [`The end of the walk (step ${STEPS})`, `Where the walk lands; nearest training digit ${digitName(tr.final)}.`],
  ];
  const imgs = [tr.xs[k], tr.x0[k], tr.xs[STEPS]];
  L.tiles.forEach((t, i) => {
    head(g, names[i][0], names[i][1], { x: t.box.x, y: t.box.y - (nar ? 26 : 48), w: t.box.w }, nar ? 0 : 2);
    drawDigit(g, imgs[i], t.rect);
  });
  const s1 = strip(g, tr.xs, L.strips[0], k);
  const s2 = strip(g, tr.x0, L.strips[1], k);
  head(g, nar ? 'x_t at every step (click to pick)' : 'The sample x_t at every step', 'Click or drag along a strip to choose a step; the gold frame is the current one.', { x: L.strips[0].x, y: L.strips[0].y - L.headUp, w: L.strips[0].w }, nar ? 0 : 1);
  head(g, nar ? 'x̂₀ at every step: blur to one digit' : 'The guess x̂₀ at every step', 'It goes from the blurry average of all digits, to a vague digit, to one specific digit.', { x: L.strips[1].x, y: L.strips[1].y - L.headUp, w: L.strips[1].w }, nar ? 0 : 1);
  head(g, nar ? (r.exact ? 'Low-frequency share (blue), top weight (gold)' : 'Low-frequency share of x̂₀') : 'How the guess settles', `Blue: the share of the guess's energy in its coarsest 5 × 5 block of discrete cosine transform (DCT) coefficients, high for a blur.${r.exact ? ' Gold: the weight of the heaviest training digit.' : ''}`, L.chartHead, nar ? 0 : 2);
  const series = [{ pts: mt.share.map((v, i) => [i, v]), color: INK.path, width: 2 }];
  if (r.exact) series.push({ pts: mt.topW.map((v, i) => [i, v]), color: INK.cursor, width: 2 });
  const ch = drawChart(g, L.chart, {
    x: [0, STEPS], y: [0, 1], xTicks: [0, 5, 10, 15, 20, 25, 30], yTicks: [0, 0.5, 1], xLabel: 'step k', series,
    vlines: [{ x: k, color: INK.cursor, dash: [] }], dots: [{ x: k, y: mt.share[k], color: INK.path }, ...(r.exact ? [{ x: k, y: mt.topW[k], color: INK.cursor }] : [])],
  });
  if (!nar) legend(g, [[INK.path, 'low-frequency share of x̂₀'], ...(r.exact ? [[INK.cursor, 'top weight']] : [])], ch.px + ch.pw - 260, ch.py + ch.ph - 14);
  return { s1, s2 };
}

export function explainCoarse(m, r) {
  if (r.loading) return loadingExplain(r.loading);
  const { tr, k, mt } = r;
  const rows = [
    `step {k|${k}} of ${STEPS}: time {t|t = ${f(r.t, 3)}}, data kept {abar|ᾱ (alpha bar) = ${f(r.a, 3)}}, noise level {sigma|√(1 − ᾱ) = ${f(r.sigma, 3)}}`,
    `low-frequency share of x̂₀: {share|${f(mt.share[k], 3)}}, the part of its energy in the coarsest 5 × 5 block of discrete cosine transform (DCT) coefficients; a blur has nearly all of it`,
    r.exact
      ? `top weight: {topw|${f(mt.topW[k], 3)}} on training digit ${digitName(mt.top[k])}; about ${f(mt.sharing[k], 0)} digits share the average`
      : 'the trained network has no weights over digits: it produces the guess directly',
    `ends ${r.exact ? 'on' : `${f(tr.finalDist, 1)} from`} the nearest training digit {final|${digitName(tr.final)}}`,
  ];
  const st = stage(r, m);
  return {
    hud: `step {k|${k}} of ${STEPS}   share {share|${f(mt.share[k], 2)}}${r.exact ? `   top weight {topw|${f(mt.topW[k], 2)}}` : ''}`,
    rows, status: st, fact: shellFact(m, r),
    values: [['low-frequency share', f(mt.share[k], 3), 'share'], [r.exact ? 'top weight' : 'denoiser', r.exact ? f(mt.topW[k], 3) : 'network', 'topw'], ['noise level', f(r.sigma, 3), 'sigma'], ['start', startLabel(m.start), null]],
  };
}

export function coarseView() {
  let last = null;
  const hit = (ctx, x, y) => {
    const ov = overlayFor(ctx), m = ctx.state(), L = coarseGeo(ov.w, ov.h, ov);
    if (!last || last.loading) return;
    const tr = last.tr;
    const row = L.strips.find((s) => y >= s.y - 4 && y <= s.y + s.h + 4);
    if (!row) return;
    const st = stripHitFor(row, tr.xs.length, x);
    if (st !== m.k) { m.k = st; ctx.refresh(); }
  };
  return {
    id: 'coarse', topic: 'coarse', label: 'Coarse to fine', group: 'digits', init: DIG_INIT, presets: PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    params: [{ id: 'k', label: 'step k', min: 0, max: STEPS, step: 1, play: 'loop', rate: () => 3, format: (v) => `${v} of ${STEPS}` }], inputTitle: 'Step of the walk',
    regions: [], keys: {}, panelTitle: 'Starting noise and denoiser',
    setup(ctx) { setupOverlay(ctx, { down: (x, y) => hit(ctx, x, y), move: (x, y) => hit(ctx, x, y) }); },
    leave: leaveOverlay,
    run: runDigits,
    paint: paintCoarse,
    draw(v, m, r, ctx) { last = r; paintWith(ctx, (g, w, h, ov) => paintCoarse(g, w, h, ov, m, r)); },
    explain: explainCoarse,
    panel(host, m, r, ctx) {
      noiseControls(host, m, ctx, { id: 'coarse', note: startNoiseNote(m, r) });
    },
  };
}

export { legend, f2, text };
