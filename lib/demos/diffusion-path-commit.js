// diffusion-path-commit: view c of the diffusion-path lab. The exact denoiser's guess is a weighted average of the 2,000 digits; this view shows
// the weights of the five heaviest concentrating as the walk goes on, and two samples from nearby noise sharing a guess until a step at which
// they commit to different digits.
import { alphaBar } from '../core/diffusion.js';
import { STEPS, needs, pairTrajectories, pairStart, measures, topFive, digits, dist, norm, startLabel } from './diffusion-path-core.js';
import { digitName } from './diffusion-path-digits.js';
import {
  text, f, areaOf, head, legend, drawChart, strip, stripHitFor, drawDigit, digitVec, stripHeight, INK, FIVE, HEAD, noiseControls, isNarrow, paintLoading, loadingExplain,
  setupOverlay, leaveOverlay, paintWith, overlayFor, startNoiseNote,
} from './diffusion-path-draw.js';

// The default pair (seed 1, theta 0.2 rad): the two starts are 4.0 apart, the guesses are one blur until step 3, and the walks commit to two
// different digits, with the gap between the guesses reaching half the distance of the final digits at step 7.
export const COMMIT_INIT = { seed: 1, start: 'shell', theta: 0.2, k: 7 };
const PRESETS = [
  { label: 'the default pair: split at step 7', set: { seed: 1, theta: 0.2, k: 7 } },
  { label: 'closer start: the same digit', set: { seed: 1, theta: 0.1, k: 7 } },
  { label: 'farther start: an earlier split', set: { seed: 1, theta: 0.9, k: 4 } },
  { label: 'seed 2', set: { seed: 2, theta: 0.4, k: 5 } },
  { label: 'seed 3: a late split', set: { seed: 3, theta: 0.9, k: 5 } },
  { label: 'seed 4', set: { seed: 4, theta: 0.4, k: 6 } },
  { label: 'seed 5: two similar digits', set: { seed: 5, theta: 0.6, k: 7 } },
  { label: 'the end: step 30', set: { k: STEPS } },
];
const THETA = { id: 'theta', label: 'θ (theta)', min: 0.05, max: 1.2, step: 0.05, format: (v) => `${v.toFixed(2)} rad` };

export function commitGeo(w, h, ov) {
  const a = areaOf(ov, w, h);
  if (isNarrow(w)) {
    const labelW = 14, side = stripHeight(a.w - labelW, STEPS + 1), wy = a.y + 22, wh = 112, ty = wy + wh + 4;
    const sy = ty + 34 + 24, cy = sy + 2 * side + 6 + 26;
    return { a, narrow: true, weights: { x: a.x, y: wy, w: a.w, h: wh }, thumbs: { x: a.x, y: ty, w: a.w, h: 30 }, labelW, side, headUp: 22,
      strips: [{ x: a.x + labelW, y: sy, w: a.w - labelW, h: side }, { x: a.x + labelW, y: sy + side + 6, w: a.w - labelW, h: side }],
      gapHead: { x: a.x, y: cy - 22, w: a.w }, gap: { x: a.x, y: cy, w: a.w, h: Math.max(90, a.y + a.h - cy) } };
  }
  const c1 = Math.max(150, Math.min(250, a.h * 0.34));
  const labelW = 16;
  const side = stripHeight(a.w - labelW, STEPS + 1);
  const wch = { x: a.x, y: a.y + HEAD - 14, w: a.w - 200, h: c1 - HEAD + 10 };
  const thumbs = { x: a.x + a.w - 190, y: a.y + HEAD - 14, w: 190, h: c1 - HEAD + 10 };
  const sy = a.y + c1 + 18 + HEAD - 12;
  const strips = [{ x: a.x + labelW, y: sy, w: a.w - labelW, h: side }, { x: a.x + labelW, y: sy + side + 6, w: a.w - labelW, h: side }];
  const cy = sy + 2 * side + 6 + 20;
  return { a, c1, headUp: HEAD - 12, weights: wch, thumbs, strips, side, labelW, gapHead: { x: a.x, y: cy - 12, w: a.w }, gap: { x: a.x, y: cy + HEAD - 14, w: a.w, h: Math.max(60, a.y + a.h - cy - HEAD + 14) } };
}

export function runCommit(m, ctx) {
  const what = needs('exact', () => ctx?.refresh?.());
  if (what) return { loading: what };
  const pair = pairTrajectories(m.seed, m.start, m.theta);
  const k = Math.max(0, Math.min(STEPS, Math.round(m.k)));
  const { A, B } = pair;
  const mA = measures(A), mB = measures(B);
  const five = topFive(A.W);
  const startGap = dist(A.xs[0], B.xs[0]);
  return { pair, A, B, mA, mB, five, k, t: A.ts[k], a: alphaBar(A.ts[k]), startGap, startLen: norm(A.xs[0]), split: pair.split, gap: pair.gap, finalGap: pair.finalGap };
}
const logw = (w) => Math.log10(Math.max(w, 1e-4));

export function paintCommit(g, w, h, ov, m, r) {
  if (r.loading) { paintLoading(g, w, h, ov, r.loading); return; }
  const L = commitGeo(w, h, ov), { A, B, k, five } = r;
  const nar = L.narrow;
  if (nar) head(g, 'Weights of the five heaviest digits (sample A)', '', { x: L.a.x, y: L.a.y - 4, w: L.a.w }, 0);
  else head(g, 'Who the guess is made of', "A's guess is the softmax-weighted average of the 2,000 training digits. One line per digit, log scale: equal at first, one digit at the end.", { x: L.a.x, y: L.a.y - 14, w: L.weights.w }, 2);
  const share = Math.log10(1 / 2000);
  const ch = drawChart(g, L.weights, {
    x: [0, STEPS], y: [-4, 0], xTicks: [0, 5, 10, 15, 20, 25, 30], yTicks: [{ v: -4, t: '0.0001' }, { v: -3, t: '0.001' }, { v: -2, t: '0.01' }, { v: -1, t: '0.1' }, { v: 0, t: '1' }],
    xLabel: 'step k', hlines: [{ y: share, color: '#4a5266' }], vlines: [{ x: k, color: INK.cursor, dash: [] }],
    series: five.map((i, c) => ({ pts: A.W.map((wv, s) => [s, logw(wv[i])]), color: FIVE[c], width: 2.2 })),
    dots: five.map((i, c) => ({ x: k, y: logw(A.W[k][i]), color: FIVE[c], r: 4 })),
  });
  if (!nar) text(g, 'equal share, 1 of 2,000', ch.X(STEPS) - 4, ch.Y(share) - 5, { size: 10.5, color: '#79829a', align: 'right', halo: false });
  // the five digits as the legend
  const tw = L.thumbs;
  if (nar) {
    const cw = tw.w / 5, ts = 26;
    five.forEach((i, c) => {
      const x = tw.x + c * cw;
      drawDigit(g, digitVec(i), { x, y: tw.y + 2, w: ts, h: ts }, { frame: FIVE[c], width: 2 });
      text(g, f(A.W[k][i], 3), x + ts + 5, tw.y + 2 + ts / 2 + 4, { size: 11, color: FIVE[c], weight: 700, halo: false });
    });
  } else {
  const pitch = (tw.h - 14) / 5, two = pitch >= 30, s = Math.max(14, Math.min(34, pitch - 4));
  text(g, 'the five heaviest digits', tw.x, tw.y + 4, { size: 11, color: INK.axis, weight: 600, halo: false });
  five.forEach((i, c) => {
    const y = tw.y + 14 + c * pitch;
    drawDigit(g, digitVec(i), { x: tw.x, y, w: s, h: s }, { frame: FIVE[c], width: 2 });
    text(g, two ? digitName(i) : `${digitName(i)}  ${f(A.W[k][i], 3)}`, tw.x + s + 8, y + s / 2 + (two ? -1 : 4), { size: 11.5, color: FIVE[c], weight: 700, halo: false });
    if (two) text(g, `weight now ${f(A.W[k][i], 3)}`, tw.x + s + 8, y + s / 2 + 12, { size: 10.5, color: INK.note, halo: false });
  });
  }
  // the two filmstrips
  if (nar) head(g, 'A (top) and B (bottom): their guesses x̂₀', '', { x: L.a.x, y: L.strips[0].y - L.headUp, w: L.a.w }, 0);
  else head(g, 'Two samples from nearby noise', `Top row: sample A. Bottom row: sample B = cos θ (theta) · A + sin θ · Z, with Z a second, independent noise, so B is as long as A and starts ${f(r.startGap, 1)} away (θ = ${f(m.theta, 2)} rad). Each picture is that sample's guess x̂₀.`, { x: L.a.x, y: L.strips[0].y - HEAD + 12, w: L.a.w }, 2);
  text(g, 'A', L.a.x + 2, L.strips[0].y + L.side / 2 + 4, { size: 12, weight: 700, color: INK.axis, halo: false });
  text(g, 'B', L.a.x + 2, L.strips[1].y + L.side / 2 + 4, { size: 12, weight: 700, color: INK.axis, halo: false });
  strip(g, A.x0, L.strips[0], k, { mark: r.split });
  strip(g, B.x0, L.strips[1], k, { mark: r.split });
  if (nar) head(g, r.split >= 0 ? `Gap between the guesses; split at step ${r.split}` : 'Gap between the guesses: no split', '', L.gapHead, 0);
  else head(g, 'How far apart the two guesses are', r.split >= 0 ? `The gap stays small while both guesses are the same blur, then jumps at the split (step ${r.split}, where it reaches half of the ${f(r.finalGap, 1)} between the two final digits).` : 'Both walks end on the same training digit, so the gap falls back to zero.', L.gapHead, 2);
  const c3 = drawChart(g, L.gap, {
    x: [0, STEPS], y: [0, Math.max(5, Math.ceil(Math.max(...r.gap) / 5) * 5)], xTicks: [0, 5, 10, 15, 20, 25, 30], xLabel: 'step k',
    series: [{ pts: r.gap.map((v, i) => [i, v]), color: INK.pink, width: 2.4 }], dots: [{ x: k, y: r.gap[k], color: INK.pink, r: 4.5 }],
    vlines: [{ x: k, color: INK.cursor, dash: [] }, ...(r.split >= 0 ? [{ x: r.split, color: INK.jump, dash: [4, 3] }] : [])],
  });
  if (!nar && r.split >= 0) text(g, `split at step ${r.split}`, c3.X(r.split) + 6, c3.py + 34, { size: 11.5, color: INK.jump, weight: 700 });
  if (!nar) legend(g, [[INK.pink, 'gap between the two guesses'], ...(r.split >= 0 ? [[INK.jump, 'the split step', true]] : [])], c3.px + c3.pw - 300, c3.py + c3.ph - 14);
}

export function explainCommit(m, r) {
  if (r.loading) return loadingExplain(r.loading);
  const { A, B, mA, mB, k, split } = r;
  const rows = [
    `step {k|${k}} of ${STEPS}; B = cos θ (theta) · A + sin θ · Z with {theta|θ = ${f(m.theta, 2)} rad}: B is as long as A (${f(r.startLen, 1)}) and starts {gap|${f(r.startGap, 1)}} away`,
    `A: top weight {topw|${f(mA.topW[k], 3)}} on ${digitName(mA.top[k])}; B: top weight {topw|${f(mB.topW[k], 3)}} on ${digitName(mB.top[k])}`,
    `the two guesses are {gap|${f(r.gap[k], 1)}} apart now; the two final digits (${digitName(A.final)} and ${digitName(B.final)}) are ${f(r.finalGap, 1)} apart`,
    split >= 0 ? `{split|split at step ${split}}: the first step at which the guesses are half as far apart as the final digits` : `{split|no split}: both walks end on ${digitName(A.final)}`,
    'each guess is the softmax-weighted average of the 2,000 training digits: near digits get large weights, the rest almost none',
  ];
  let status;
  if (split < 0) status = { text: 'the two starts are close enough that both walks reach the same digit', tone: 'info' };
  else if (k < split) status = { text: `before the split: the two guesses are still nearly one image (${f(r.gap[k], 1)} apart) although the walks will end on different digits`, tone: 'info' };
  else status = { text: `after the split: the guesses are ${f(r.gap[k], 1)} apart, different digits; a small difference in the noise decided which one`, tone: 'warn' };
  return {
    hud: `step {k|${k}}   gap {gap|${f(r.gap[k], 1)}}   ${split >= 0 ? `split {split|step ${split}}` : '{split|no split}'}`,
    rows, status,
    values: [['starts apart', f(r.startGap, 1), 'gap'], ['split step', split >= 0 ? String(split) : 'none', 'split'], ['A weight', f(mA.topW[k], 3), 'topw'], ['B weight', f(mB.topW[k], 3), 'topw']],
    fact: `Start: ${startLabel(m.start)}. Both samples use the exact denoiser, because the weights in view are its weights.`,
  };
}

export function commitView() {
  let last = null;
  const hit = (ctx, x, y) => {
    const ov = overlayFor(ctx), m = ctx.state(), L = commitGeo(ov.w, ov.h, ov), r = last;
    if (!r || r.loading) return;
    const row = L.strips.find((s) => y >= s.y - 4 && y <= s.y + s.h + 4);
    const inChart = x >= L.gap.x + 44 && y >= L.gap.y && y <= L.gap.y + L.gap.h - 28;
    let st = null;
    if (row) st = stripHitFor(row, STEPS + 1, x);
    else if (inChart) st = Math.max(0, Math.min(STEPS, Math.round(((x - (L.gap.x + 44)) / (L.gap.w - 56)) * STEPS)));
    if (st != null && st !== m.k) { m.k = st; ctx.refresh(); }
  };
  return {
    id: 'commit', topic: 'commit', label: 'Commitment', init: COMMIT_INIT, presets: PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    params: [THETA, { id: 'k', label: 'step k', min: 0, max: STEPS, step: 1, play: 'loop', rate: () => 3, format: (v) => `${v} of ${STEPS}` }], inputTitle: 'The pair and the step',
    regions: [], keys: {}, panelTitle: 'Starting noise',
    setup(ctx) { setupOverlay(ctx, { down: (x, y) => hit(ctx, x, y), move: (x, y) => hit(ctx, x, y) }); },
    leave: leaveOverlay,
    run: runCommit,
    paint: paintCommit,
    draw(v, m, r, ctx) { last = r; paintWith(ctx, (g, w, h, ov) => paintCommit(g, w, h, ov, m, r)); },
    explain: explainCommit,
    panel(host, m, r, ctx) { noiseControls(host, m, ctx, { id: 'commit', den: false, note: startNoiseNote(m, r) }); },
  };
}
export { digits, pairStart };
