// sampling-lab-samples: the Samples topic of the sampling lab: the coverage of an edge across one pixel estimated by sample patterns,
// random samples against stratified ones over many trials, what supersampling and multisampling cost, and the space coverage is
// blended in. run() calls the program's own functions (lib/programs/sampling-lab/webgl/samplinglab.js); the pictures are
// canvases over the scene (sampling-lab-draw.js).
import * as SL from '../programs/sampling-lab/webgl/samplinglab.js';
import { COL } from '../core/lab-viz.js';
import { C, Plot, overlayFor, setupOverlay, leaveOverlay, text, pill, f, el, btn, segmented, once } from './sampling-lab-draw.js';

const HOME = { eye: [0, 0, 8], target: [0, 0, 0] };
const NO_GRID = { grid: 'none', axes: false, home: HOME };
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const commas = (x) => Math.round(x).toLocaleString('en-US');

// ---------------------------------------------------------------- one pixel, an edge and its samples

/** the window on the unit pixel: the pixel with a margin, so the edge shows where it enters and leaves */
function pixelFrame(sq) {
  const lo = -0.2, span = 1.4;
  return {
    wx: (x) => sq.x + ((x - lo) / span) * sq.w,
    wy: (y) => sq.y + sq.h - ((y - lo) / span) * sq.h,
    ux: (px) => lo + ((px - sq.x) / sq.w) * span,
    uy: (py) => lo + ((sq.y + sq.h - py) / sq.h) * span,
  };
}

/**
 * The pixel square [0,1]^2 with the edge y = slope x + offset above which is inside, the samples (flags: 1 inside), and optional
 * grid cells. Returns the frame, for hit tests.
 */
function paintPixelSquare(ov, g, sq, { slope, offset, points, flags, cells = 0, title, handles = false, shade = true }) {
  const F = pixelFrame(sq);
  g.save();
  g.beginPath();
  g.rect(sq.x, sq.y, sq.w, sq.h);
  g.clip();
  g.fillStyle = '#10131b';
  g.fillRect(sq.x, sq.y, sq.w, sq.h);
  // the inside of the edge: everything above the line, over the whole window, then brighter inside the pixel
  const inside = () => {
    g.beginPath();
    g.moveTo(F.wx(-0.2), F.wy(slope * -0.2 + offset));
    g.lineTo(F.wx(1.2), F.wy(slope * 1.2 + offset));
    g.lineTo(F.wx(1.2), F.wy(10));
    g.lineTo(F.wx(-0.2), F.wy(10));
    g.closePath();
  };
  g.fillStyle = 'rgba(121,192,255,0.12)';
  inside();
  g.fill();
  g.save();
  g.beginPath();
  g.rect(F.wx(0), F.wy(1), F.wx(1) - F.wx(0), F.wy(0) - F.wy(1));
  g.clip();
  g.fillStyle = shade ? 'rgba(121,192,255,0.34)' : 'rgba(121,192,255,0.14)';
  inside();
  g.fill();
  g.restore();
  if (cells > 0) {
    g.strokeStyle = 'rgba(160,170,190,0.28)';
    g.lineWidth = 1;
    for (let i = 1; i < cells; i++) {
      g.beginPath(); g.moveTo(F.wx(i / cells), F.wy(0)); g.lineTo(F.wx(i / cells), F.wy(1)); g.stroke();
      g.beginPath(); g.moveTo(F.wx(0), F.wy(i / cells)); g.lineTo(F.wx(1), F.wy(i / cells)); g.stroke();
    }
  }
  g.restore();
  g.strokeStyle = C.white;
  g.lineWidth = 2;
  g.strokeRect(F.wx(0), F.wy(1), F.wx(1) - F.wx(0), F.wy(0) - F.wy(1));
  g.save();
  g.beginPath();
  g.rect(sq.x, sq.y, sq.w, sq.h);
  g.clip();
  g.strokeStyle = '#8ec2ff';
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(F.wx(-0.2), F.wy(slope * -0.2 + offset));
  g.lineTo(F.wx(1.2), F.wy(slope * 1.2 + offset));
  g.stroke();
  g.restore();
  const r = Math.max(4, Math.min(8, sq.w / 55));
  points.forEach((p, i) => {
    const x = F.wx(p[0]), y = F.wy(p[1]);
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    if (flags[i]) { g.fillStyle = C.green; g.fill(); g.strokeStyle = C.bg; g.lineWidth = 1.5; g.stroke(); } else { g.fillStyle = 'rgba(11,12,16,0.7)'; g.fill(); g.strokeStyle = C.red; g.lineWidth = 2; g.stroke(); }
  });
  if (handles) {
    for (const [px, py] of [[0, offset], [1, offset + slope]]) {
      g.beginPath();
      g.arc(F.wx(px), F.wy(py), 8, 0, Math.PI * 2);
      g.fillStyle = C.nyquist;
      g.fill();
      g.strokeStyle = C.bg;
      g.lineWidth = 2;
      g.stroke();
    }
  }
  g.strokeStyle = C.axis;
  g.lineWidth = 1;
  g.strokeRect(sq.x - 0.5, sq.y - 0.5, sq.w + 1, sq.h + 1);
  if (title) text(g, title, sq.x, sq.y - 7, { size: 12.5, color: C.ink, weight: 600 });
  return F;
}

// ---------------------------------------------------------------- coverage

const PATTERNS = [
  ['single', '1, centre'], ['grid4', '2 × 2 grid'], ['rotated4', '4, rotated grid'], ['grid16', '4 × 4 grid'], ['random16', '16 random'], ['stratified16', '16 jittered'],
];
const PATTERN_NAME = Object.fromEntries(PATTERNS);
const PATTERN_CELLS = { single: 0, grid4: 2, rotated4: 0, grid16: 4, random16: 0, stratified16: 4 };
const offsetOf = (i, j) => 0.3 * i + 0.2 - j;
const COVER_INIT = { slope: 0.3, offset: 0.2, pattern: 'rotated4', seed: 1 };
const DECK_PIXELS = [[0, 0], [1, 0], [2, 0], [3, 1], [4, 1], [5, 1]];
const COVER_PRESETS = [
  ...DECK_PIXELS.map(([i, j]) => ({ label: `pixel (${i}, ${j})`, set: { slope: 0.3, offset: offsetOf(i, j) } })),
  { label: 'a horizontal edge', set: { slope: 0, offset: 0.3 } },
  { label: 'a near-horizontal edge', set: { slope: 0.03, offset: 0.4 } },
  { label: 'a steep edge', set: { slope: 2.2, offset: -0.6 } },
];

function runCoverage(m) {
  const points = SL.samplePattern(m.pattern, m.seed);
  const est = SL.estimateCoverage(points, m.slope, m.offset);
  const levels = SL.patternLevels(points);
  const all = PATTERNS.map(([kind]) => {
    const p = SL.samplePattern(kind, m.seed);
    return { kind, ...SL.estimateCoverage(p, m.slope, m.offset), points: p };
  });
  const atTop = Math.abs(m.slope) > SL.EPS ? (1 - m.offset) / m.slope : NaN;
  const atBottom = Math.abs(m.slope) > SL.EPS ? -m.offset / m.slope : NaN;
  return { points, ...est, ...levels, all, atTop, atBottom, area: est.exact };
}

export function coverLayout(ov) {
  const A = ov.area();
  const size = Math.max(160, Math.min(A.h - 26, Math.round(A.w * 0.5)));
  const sq = { x: A.x + 12, y: A.y + 22, w: size, h: size };
  const rx = sq.x + size + 22;
  const rw = A.x + A.w - rx;
  const cell = Math.max(24, Math.min(Math.floor(rw / 6), 66));
  const strip = { x: rx, y: A.y + 22, cell, w: 6 * cell, h: 2 * cell };
  const bars = { x: rx, y: strip.y + strip.h + 54, w: rw, rowH: 34 };
  return { sq, strip, bars, A };
}

function paintCoverage(ov, g, m, r) {
  const L = coverLayout(ov);
  const flags = r.flags;
  const F = paintPixelSquare(ov, g, L.sq, {
    slope: m.slope, offset: m.offset, points: r.points, flags, cells: PATTERN_CELLS[m.pattern], handles: true,
    title: `the pixel, the edge y = ${f(m.slope, 2)} x + ${f(m.offset, 2)}, and ${PATTERN_NAME[m.pattern]}`.replace('+ −', '− '),
  });
  ov.coverFrame = F;
  text(g, `exact ${f(r.exact, 3)}`, L.sq.x + 8, L.sq.y + L.sq.h - 28, { size: 14, color: C.nyquist, weight: 700 });
  text(g, `${r.inside} of ${r.count} samples inside = ${f(r.estimate, 3)}`, L.sq.x + 8, L.sq.y + L.sq.h - 10, { size: 14, color: C.green, weight: 700 });
  text(g, 'drag the yellow ends of the edge', L.sq.x + L.sq.w - 6, L.sq.y + L.sq.h - 10, { size: 11, color: C.dim, align: 'right' });
  // the deck's six pixels along one edge
  const S = L.strip;
  text(g, 'the edge y = 0.3x + 0.2 across six pixels: click one', S.x, S.y - 7, { size: 12.5, color: C.ink, weight: 600 });
  for (const [i, j] of DECK_PIXELS.concat([[0, 1], [1, 1], [2, 1], [3, 0], [4, 0], [5, 0]])) {
    const x = S.x + i * S.cell, y = S.y + (1 - j) * S.cell;
    const ex = SL.exactCoverage(0.3, offsetOf(i, j));
    g.fillStyle = `rgba(121,192,255,${0.5 * ex})`;
    g.fillRect(x, y, S.cell, S.cell);
    g.strokeStyle = C.axis;
    g.strokeRect(x + 0.5, y + 0.5, S.cell - 1, S.cell - 1);
    if (Math.abs(m.slope - 0.3) < 1e-6 && Math.abs(m.offset - offsetOf(i, j)) < 1e-6) {
      g.strokeStyle = C.nyquist; g.lineWidth = 2.5; g.strokeRect(x + 1.5, y + 1.5, S.cell - 3, S.cell - 3); g.lineWidth = 1;
    }
  }
  g.strokeStyle = '#8ec2ff';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(S.x, S.y + 2 * S.cell - 0.2 * S.cell); g.lineTo(S.x + 6 * S.cell, S.y + 2 * S.cell - (0.2 + 1.8) * S.cell); g.stroke();
  g.lineWidth = 1;
  // the estimates of every pattern, against the exact value
  const B = L.bars;
  text(g, 'every pattern on this edge: the estimate against the exact coverage', B.x, B.y - 12, { size: 12.5, color: C.ink, weight: 600 });
  const bx = B.x + 126, bw = Math.max(60, B.w - 126 - 108);
  r.all.forEach((row, k) => {
    const y = B.y + k * B.rowH;
    const chosen = row.kind === m.pattern;
    if (chosen) { g.fillStyle = 'rgba(126,231,135,0.08)'; g.fillRect(B.x - 4, y - 4, B.w + 8, B.rowH - 4); }
    text(g, PATTERN_NAME[row.kind], B.x, y + 15, { size: 12, color: chosen ? C.white : C.dim, weight: chosen ? 700 : 500 });
    g.fillStyle = '#171a23';
    g.fillRect(bx, y + 3, bw, 16);
    g.fillStyle = chosen ? C.green : '#2d6b46';
    g.fillRect(bx, y + 3, bw * row.estimate, 16);
    g.strokeStyle = C.nyquist;
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(bx + bw * row.exact, y); g.lineTo(bx + bw * row.exact, y + 22); g.stroke();
    g.lineWidth = 1;
    text(g, `${f(row.estimate, 3)}  (${row.error >= 0 ? '+' : ''}${f(row.error, 3)})`, bx + bw + 8, y + 16, { size: 11.5, color: Math.abs(row.error) > 0.1 ? C.red : C.ink });
  });
  text(g, 'yellow: the exact coverage', bx, B.y + 6 * B.rowH + 6, { size: 11, color: C.nyquist });
  ov.coverLayout = L;
}

function coverDown(ctx, x, y) {
  const ov = overlayFor(ctx);
  const L = ov.coverLayout;
  if (!L) return;
  const m = ctx.state();
  const F = ov.coverFrame;
  ov.coverDrag = null;
  // the edge's two ends
  const ends = [['left', 0, m.offset], ['right', 1, m.offset + m.slope]];
  for (const [id, px, py] of ends) {
    if (Math.hypot(F.wx(px) - x, F.wy(py) - y) < 16) { ov.coverDrag = id; coverMove(ctx, x, y); return; }
  }
  const S = L.strip;
  if (x >= S.x && x < S.x + S.w && y >= S.y && y < S.y + 2 * S.cell) {
    const i = Math.floor((x - S.x) / S.cell), j = 1 - Math.floor((y - S.y) / S.cell);
    m.slope = 0.3;
    m.offset = Math.round(offsetOf(i, j) * 100) / 100;
    ctx.refresh();
    return;
  }
  const B = L.bars;
  if (x >= B.x && x <= B.x + B.w) {
    const k = Math.floor((y - B.y) / B.rowH);
    if (k >= 0 && k < PATTERNS.length) { m.pattern = PATTERNS[k][0]; ctx.refresh(); }
  }
}

function coverMove(ctx, x, y) {
  const ov = overlayFor(ctx);
  const m = ctx.state();
  const F = ov.coverFrame;
  if (!ov.coverDrag || !F) return;
  const v = Math.round(F.uy(y) * 100) / 100;
  if (ov.coverDrag === 'left') {
    const right = m.offset + m.slope;
    m.offset = clamp(v, -0.6, 1.6);
    m.slope = Math.round(clamp(right - m.offset, -3, 3) * 100) / 100;
  } else m.slope = Math.round(clamp(v - m.offset, -3, 3) * 100) / 100;
  ctx.refresh();
}

function explainCoverage(m, r) {
  const name = PATTERN_NAME[m.pattern];
  let status;
  if (r.exact < 1e-9 || r.exact > 1 - 1e-9) status = { text: `the edge misses the pixel: its coverage is ${r.exact < 0.5 ? 0 : 1}, and every pattern agrees`, tone: 'info' };
  else if (r.inside === 0) status = { text: `a sliver: the exact coverage is ${f(r.exact * 100, 1)} % and no sample is inside, so the estimate is 0 and the edge pixel is lost`, tone: 'bad' };
  else if (r.inside === r.count) status = { text: `the exact coverage is ${f(r.exact * 100, 1)} % and every sample is inside, so the estimate is 1 and the notch in the edge is lost`, tone: 'bad' };
  else if (Math.abs(r.error) <= 0.01) status = { text: `${name}: ${r.inside} of ${r.count} samples inside, the estimate ${f(r.estimate, 3)} is within 0.01 of the exact ${f(r.exact, 3)}`, tone: 'ok' };
  else status = { text: `${name}: ${r.inside} of ${r.count} inside gives ${f(r.estimate, 3)}, ${f(Math.abs(r.error), 3)} ${r.error > 0 ? 'above' : 'below'} the exact ${f(r.exact, 3)}; with ${r.count} samples the estimate takes one of ${r.count + 1} values`, tone: Math.abs(r.error) > 0.1 ? 'warn' : 'info' };
  const sign = m.offset < 0 ? '−' : '+';
  return {
    hud: `exact {exact|${f(r.exact, 3)}}; ${name}: {inside|${r.inside}} of {count|${r.count}} inside = {estimate|${f(r.estimate, 3)}}, error {error|${f(r.error, 3)}}`,
    rows: [
      `edge: y = ${f(m.slope, 2)} x ${sign} ${f(Math.abs(m.offset), 2)}; inside is above it, in the unit pixel`,
      `exact = the area above the edge in the pixel = {exact|${f(r.exact, 3)}}${Number.isFinite(r.atTop) && r.atTop > 0 && r.atTop < 1 ? `, bending at x = ${f(r.atTop, 3)}` : ''}`,
      `${name}: {inside|${r.inside}} of {count|${r.count}} samples above the edge, estimate = {estimate|${f(r.estimate, 3)}}`,
      `error = estimate − exact = {error|${f(r.error, 3)}}`,
      `distinct rows {rows|${r.rows}}, columns {columns|${r.columns}}: a horizontal edge sees {horizontalLevels|${r.horizontalLevels}} coverage levels, a vertical one {verticalLevels|${r.verticalLevels}}`,
    ],
    status,
    values: [
      ...r.all.map((row) => [PATTERN_NAME[row.kind], f(row.estimate, 3), row.kind === m.pattern ? 'estimate' : null]),
      ['exact', f(r.exact, 3), 'exact'],
    ],
  };
}

function coveragePanel(host, m, r, ctx) {
  once(host, 'coverage', (h) => {
    h.refreshers.push(segmented(h, 'pattern', PATTERNS, () => m.pattern, (v) => { m.pattern = v; ctx.update(); }));
    const row = el('div', 'lab-btns', h);
    btn(row, 're-roll the random samples', () => { m.seed += 1; ctx.update(); }, 'New random positions for the random and jittered patterns');
    h.note = el('p', 'lab-note', h, '');
  });
  host.refreshers.forEach((s) => s());
  host.note.textContent = 'Green: the sample is above the edge, inside. A sample exactly on the edge counts as outside. The 4 samples of the rotated grid are (0.375, 0.125), (0.875, 0.375), (0.125, 0.625), (0.625, 0.875).';
}

function coverageView() {
  return {
    id: 'coverage', topic: 'samples', label: 'coverage of an edge', init: COVER_INIT, presets: COVER_PRESETS, ...NO_GRID,
    params: [{ id: 'slope', label: 'slope', min: -3, max: 3, step: 0.01 }, { id: 'offset', label: 'offset', min: -0.6, max: 1.6, step: 0.01 }],
    inputTitle: 'Edge', regions: ['Edge coverage', 'Sample patterns', 'Estimate coverage'],
    keys: { exact: COL.gold, estimate: COL.green, inside: COL.green, count: COL.green, error: COL.red, rows: COL.purple, columns: COL.purple, horizontalLevels: COL.cyan, verticalLevels: COL.cyan },
    setup: (ctx) => setupOverlay(ctx, { down: (x, y) => coverDown(ctx, x, y), move: (x, y) => coverMove(ctx, x, y), up: () => { overlayFor(ctx).coverDrag = null; } }),
    leave: (ctx) => leaveOverlay(ctx),
    run: runCoverage,
    draw(v, m, r, ctx) {
      const ov = ctx.sceneEl ? overlayFor(ctx) : null;
      if (!ov) return;
      ov.painter = (g) => paintCoverage(ov, g, m, r);
      ov.repaint();
    },
    explain: explainCoverage,
    panelTitle: 'Samples',
    panel: coveragePanel,
  };
}

// ---------------------------------------------------------------- random against stratified

const STRAT_INIT = { trials: 2000, trial: 1 };
const STRAT_PRESETS = [
  { label: 'the chapter: 2,000 trials', set: { trials: 2000, trial: 1 } },
  { label: '200 trials', set: { trials: 200 } },
  { label: '5,000 trials', set: { trials: 5000 } },
];

function runStrat(m) {
  const e = SL.samplingError(m.trials, 5);
  const rp = SL.samplePattern('random16', m.trial), sp = SL.samplePattern('stratified16', m.trial);
  const random = SL.estimateCoverage(rp, 0.3, 0.35), stratified = SL.estimateCoverage(sp, 0.3, 0.35);
  return { ...e, rp, sp, one: { random, stratified }, samples: 16 };
}

function paintStrat(ov, g, m, r) {
  const A = ov.area();
  const size = Math.max(120, Math.min(Math.floor((A.h - 56) / 2), Math.round(A.w * 0.4)));
  const a = { x: A.x + 12, y: A.y + 22, w: size, h: size };
  const b = { x: a.x, y: a.y + size + 34, w: size, h: size };
  paintPixelSquare(ov, g, a, { slope: 0.3, offset: 0.35, points: r.rp, flags: r.one.random.flags, title: '16 random samples', shade: true });
  text(g, `${r.one.random.inside} inside = ${f(r.one.random.estimate, 3)}  (error ${f(r.one.random.error, 3)})`, a.x + 8, a.y + a.h - 8, { size: 13, color: C.red, weight: 700 });
  paintPixelSquare(ov, g, b, { slope: 0.3, offset: 0.35, points: r.sp, flags: r.one.stratified.flags, cells: 4, title: '16 stratified samples: one in each cell', shade: true });
  text(g, `${r.one.stratified.inside} inside = ${f(r.one.stratified.estimate, 3)}  (error ${f(r.one.stratified.error, 3)})`, b.x + 8, b.y + b.h - 8, { size: 13, color: C.green, weight: 700 });
  const hx = a.x + size + 28;
  const top = Math.max(0.2, (Math.max(...r.randomHits, ...r.stratifiedHits) / m.trials) * 1.1);
  const p = new Plot(g, { x: hx, y: A.y, w: A.x + A.w - hx, h: Math.min(A.h, 540) }, {
    xr: [-0.5, 16.5], yr: [0, top], xticks: [0, 2, 4, 6, 8, 10, 12, 14, 16], yticks: [0, top / 2, top].map((v) => Number(v.toFixed(2))), title: `the estimate over ${commas(m.trials)} trials, half a pixel covered`, xlabel: 'samples inside (of 16)', ylabel: 'share of trials', bottom: 26,
  });
  p.frame();
  for (let k = 0; k <= 16; k++) {
    const rw = (p.sx(1) - p.sx(0)) * 0.42;
    g.fillStyle = C.red; g.globalAlpha = 0.85 * ov.dim('random');
    g.fillRect(p.sx(k) - rw, p.sy(r.randomHits[k] / m.trials), rw, p.y1 - p.sy(r.randomHits[k] / m.trials));
    g.fillStyle = C.green; g.globalAlpha = 0.85 * ov.dim('stratified');
    g.fillRect(p.sx(k), p.sy(r.stratifiedHits[k] / m.trials), rw, p.y1 - p.sy(r.stratifiedHits[k] / m.trials));
    g.globalAlpha = 1;
  }
  p.vline(8, C.nyquist, { dash: [5, 4], label: 'exact 8/16', labelColor: C.nyquist });
  text(g, `random: RMS error ${f(r.random, 3)}`, p.x1 - 8, p.y0 + 18, { size: 13, color: C.red, align: 'right', weight: 700 });
  text(g, `stratified: ${f(r.stratified, 3)}`, p.x1 - 8, p.y0 + 36, { size: 13, color: C.green, align: 'right', weight: 700 });
  text(g, `${f(r.ratio, 2)} times smaller`, p.x1 - 8, p.y0 + 54, { size: 12, color: C.ink, align: 'right' });
}

function explainStrat(m, r) {
  return {
    hud: `${commas(m.trials)} trials of 16 samples: random {random|${f(r.random, 3)}}, stratified {stratified|${f(r.stratified, 3)}}, {ratio|${f(r.ratio, 2)}} times smaller`,
    rows: [
      `pixel half covered by the edge y = 0.3 x + 0.35; exact coverage {exact|${f(r.exact, 3)}}`,
      `random: RMS error {random|${f(r.random, 3)}}; the binomial prediction √(p (1 − p) / 16) = {binomial|${f(r.binomial, 3)}}`,
      `stratified (one random sample in each cell of a 4 × 4 grid): RMS error {stratified|${f(r.stratified, 3)}}`,
      `ratio = {ratio|${f(r.ratio, 2)}}`,
      `this draw, number ${m.trial}: random ${r.one.random.inside} inside, stratified ${r.one.stratified.inside} inside`,
    ],
    status: { text: `random samples clump or leave gaps, so the count inside is binomial and its error is ${f(r.random, 3)}; one sample per cell leaves only the cells the edge crosses uncertain, and the error is ${f(r.stratified, 3)}`, tone: 'ok' },
    values: [['random RMS', f(r.random, 3), 'random'], ['stratified RMS', f(r.stratified, 3), 'stratified'], ['binomial', f(r.binomial, 3), 'binomial'], ['ratio', f(r.ratio, 2), 'ratio'], ['trials', commas(m.trials), null], ['exact', f(r.exact, 3), 'exact']],
  };
}

function stratPanel(host, m, r, ctx) {
  once(host, 'strat', (h) => {
    const row = el('div', 'lab-btns', h);
    btn(row, 'draw new samples', () => { m.trial += 1; ctx.update(); }, 'The two squares show one more draw of 16 samples');
    h.note = el('p', 'lab-note', h, 'The two squares are one draw each; the bars count the trials. Red: random positions. Green: stratified.');
  });
}

function stratView() {
  return {
    id: 'stratified', topic: 'samples', label: 'random or stratified', init: STRAT_INIT, presets: STRAT_PRESETS, ...NO_GRID,
    params: [{ id: 'trials', label: 'trials', min: 100, max: 5000, step: 100 }, { id: 'trial', label: 'draw', min: 1, max: 99, step: 1 }],
    inputTitle: 'Trials', regions: ['Random against stratified'],
    keys: { random: COL.red, stratified: COL.green, binomial: COL.cyan, ratio: COL.gold, exact: COL.gold },
    setup: (ctx) => setupOverlay(ctx, null),
    leave: (ctx) => leaveOverlay(ctx),
    run: runStrat,
    draw(v, m, r, ctx) {
      const ov = ctx.sceneEl ? overlayFor(ctx) : null;
      if (!ov) return;
      ov.painter = (g) => paintStrat(ov, g, m, r);
      ov.repaint();
    },
    explain: explainStrat,
    panelTitle: 'Draws',
    panel: stratPanel,
  };
}

// ---------------------------------------------------------------- cost: SSAA against MSAA

const RES = { 720: [1280, 720], 1080: [1920, 1080], 1440: [2560, 1440], 2160: [3840, 2160] };
const COST_INIT = { n: 4, overdraw: 1, instr: 300, res: 1080 };
const COST_PRESETS = [
  { label: 'the deck: 1080p, 4 samples, one layer', set: { res: 1080, n: 4, overdraw: 1, instr: 300 } },
  { label: 'the cost table: 4 million fragments', set: { res: 1080, n: 4, overdraw: 4000000 / (1920 * 1080), instr: 300 } },
  { label: '16 samples', set: { n: 16 } },
  { label: '4K, 4 samples', set: { res: 2160, n: 4 } },
  { label: 'no antialiasing', set: { n: 1 } },
];

function runCost(m) {
  const [w, h] = RES[m.res];
  const fragments = Math.round(w * h * m.overdraw);
  const c = SL.antialiasingCost(w, h, fragments, m.n, m.instr);
  return { ...c, width: w, height: h, fragments, samples: m.n, instructions: m.instr };
}

/** where the n samples of a pixel are drawn: the program's own pattern for 1, 4 and 16, a regular grid otherwise */
function samplePositions(n) {
  if (n === 1) return SL.samplePattern('single', 1);
  if (n === 4) return SL.samplePattern('rotated4', 1);
  if (n === 16) return SL.samplePattern('grid16', 1);
  const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols), out = [];
  for (let i = 0; i < n; i++) out.push([((i % cols) + 0.5) / cols, (Math.floor(i / cols) + 0.5) / rows]);
  return out;
}

function paintBlock(g, box, n, mode) {
  const pts = samplePositions(n);
  const px = Math.min(box.w / 2, box.h / 2);
  for (let a = 0; a < 2; a++) {
    for (let b = 0; b < 2; b++) {
      const x = box.x + a * px, y = box.y + b * px;
      g.fillStyle = '#10131b';
      g.fillRect(x, y, px, px);
      g.strokeStyle = C.axis;
      g.strokeRect(x + 0.5, y + 0.5, px - 1, px - 1);
      for (const p of pts) {
        const sx = x + p[0] * px, sy = y + (1 - p[1]) * px;
        if (mode === 'ssaa') {
          g.fillStyle = C.amber;
          g.fillRect(sx - 5, sy - 5, 10, 10);
        } else {
          g.fillStyle = C.rate;
          g.beginPath(); g.arc(sx, sy, 3.2, 0, Math.PI * 2); g.fill();
        }
      }
      if (mode === 'msaa') {
        g.fillStyle = C.amber;
        g.fillRect(x + px / 2 - 8, y + px / 2 - 8, 16, 16);
        g.strokeStyle = C.bg;
        g.strokeRect(x + px / 2 - 8, y + px / 2 - 8, 16, 16);
      }
    }
  }
  return px;
}

function bar(g, x, y, w, label, value, max, color, valueText, sub) {
  text(g, label, x, y + 13, { size: 12.5, color: C.ink, weight: 600 });
  g.fillStyle = '#171a23';
  g.fillRect(x, y + 20, w, 20);
  g.fillStyle = color;
  g.fillRect(x, y + 20, Math.max(1, w * Math.min(1, value / max)), 20);
  text(g, valueText, x + 6, y + 35, { size: 13, color: C.white, weight: 700 });
  if (sub) text(g, sub, x + w, y + 13, { size: 11.5, color: C.dim, align: 'right' });
}

function paintCost(ov, g, m, r) {
  const A = ov.area();
  const lw = Math.min(Math.round(A.w * 0.44), 420);
  const bh = Math.min(Math.floor((A.h - 80) / 2), lw);
  const a = { x: A.x + 12, y: A.y + 24, w: lw, h: bh };
  const b = { x: a.x, y: a.y + bh + 44, w: lw, h: bh };
  text(g, `SSAA: the shader at every sample (${m.n} per pixel)`, a.x, a.y - 8, { size: 12.5, color: C.ink, weight: 600 });
  paintBlock(g, a, m.n, 'ssaa');
  text(g, 'MSAA: the shader once per pixel', b.x, b.y - 8, { size: 12.5, color: C.ink, weight: 600 });
  paintBlock(g, b, m.n, 'msaa');
  text(g, 'amber: a fragment-shader run     blue: a coverage and depth test', a.x, b.y + bh + 16, { size: 11, color: C.dim });
  const x = a.x + lw + 36, w = A.x + A.w - x - 8;
  if (w < 160) return;
  let y = A.y + 22;
  text(g, `${r.width} × ${r.height}, ${commas(r.fragments)} fragments, ${m.instr} instructions each`, x, y - 8, { size: 12.5, color: C.ink, weight: 600 });
  const runs = [['no antialiasing', r.fragments, C.faint, 'none'], ['SSAA', r.ssaaRuns, C.amber, 'ssaaRuns'], ['MSAA', r.msaaRuns, C.rate, 'msaaRuns']];
  text(g, 'fragment-shader runs', x, y + 16, { size: 11.5, color: C.dim });
  y += 24;
  for (const [label, v, color, key] of runs) {
    g.globalAlpha = ov.dim(key, 'ssaaRuns', 'msaaRuns');
    bar(g, x, y, w, label, v, r.ssaaRuns, color, commas(v), '');
    g.globalAlpha = 1;
    y += 50;
  }
  y += 6;
  text(g, 'instructions', x, y + 4, { size: 11.5, color: C.dim });
  y += 10;
  for (const [label, v, color] of [['no antialiasing', r.noneInstructions, C.faint], ['SSAA', r.ssaaInstructions, C.amber], ['MSAA', r.msaaInstructions, C.rate]]) {
    bar(g, x, y, w, label, v, r.ssaaInstructions, color, `${f(v / 1e9, 2)} billion`, '');
    y += 50;
  }
  y += 6;
  text(g, 'color memory', x, y + 4, { size: 11.5, color: C.dim });
  y += 10;
  for (const [label, v, color] of [['no antialiasing', r.noneMiB, C.faint], ['SSAA and MSAA', r.multiMiB, C.purple]]) {
    bar(g, x, y, w, label, v, r.multiMiB, color, `${f(v, 1)} MiB`, '');
    y += 50;
  }
}

function explainCost(m, r) {
  const ratio = r.ssaaRuns / r.msaaRuns;
  let status;
  if (m.n === 1) status = { text: 'one sample per pixel: the three costs are the same, and nothing is antialiased', tone: 'info' };
  else status = { text: `${m.n} samples: SSAA runs the shader ${f(ratio, 0)} times as often as MSAA, and both keep ${f(r.multiMiB / r.noneMiB, 0)} times the color memory; MSAA pays in memory and bandwidth, SSAA in both`, tone: 'warn' };
  return {
    hud: `${m.n} samples at ${r.width} × ${r.height}: SSAA {ssaaRuns|${commas(r.ssaaRuns)}} shader runs, MSAA {msaaRuns|${commas(r.msaaRuns)}}`,
    rows: [
      `SSAA runs = fragments × samples = ${commas(r.fragments)} × ${m.n} = {ssaaRuns|${commas(r.ssaaRuns)}}`,
      `MSAA runs = fragments = {msaaRuns|${commas(r.msaaRuns)}}`,
      `instructions: none {noneInstructions|${f(r.noneInstructions / 1e9, 2)} billion}, SSAA {ssaaInstructions|${f(r.ssaaInstructions / 1e9, 2)} billion}, MSAA {msaaInstructions|${f(r.msaaInstructions / 1e9, 2)} billion}`,
      `color memory = pixels × samples × 4 bytes = ${commas(r.pixels)} × ${m.n} × 4 = {multiMiB|${f(r.multiMiB, 1)}} MiB (none: {noneMiB|${f(r.noneMiB, 1)}} MiB)`,
    ],
    status,
    values: [
      ['pixels', `${f(r.pixels / 1e6, 2)} M`, 'pixels'], ['fragments', `${f(r.fragments / 1e6, 2)} M`, null], ['SSAA runs', `${f(r.ssaaRuns / 1e6, 2)} M`, 'ssaaRuns'], ['MSAA runs', `${f(r.msaaRuns / 1e6, 2)} M`, 'msaaRuns'],
      ['SSAA at 60 Hz', `${f(r.ssaaInstructions * 60 / 1e9, 0)} G/s`, null], ['color memory', `${f(r.multiMiB, 1)} MiB`, 'multiMiB'],
    ],
  };
}

function costPanel(host, m, r, ctx) {
  once(host, 'cost', (h) => {
    h.refreshers.push(segmented(h, 'resolution', [[720, '720p'], [1080, '1080p'], [1440, '1440p'], [2160, '4K']], () => m.res, (v) => { m.res = v; ctx.update(); }));
    h.note = el('p', 'lab-note', h, 'Fragments = pixels × layers: one layer is one fragment per pixel, and the chapter’s table uses 4 million. The color memory counts 4 bytes per sample; depth would add as much again.');
  });
  host.refreshers.forEach((s) => s());
}

function costView() {
  return {
    id: 'cost', topic: 'samples', label: 'SSAA against MSAA', init: COST_INIT, presets: COST_PRESETS, ...NO_GRID,
    params: [
      { id: 'n', label: 'samples', min: 1, max: 16, step: 1 }, { id: 'overdraw', label: 'layers', min: 1, max: 4, step: 0.05 },
      { id: 'instr', label: 'instructions', min: 50, max: 600, step: 10 },
    ],
    inputTitle: 'Frame', regions: ['Shading cost'],
    keys: { pixels: COL.gray, ssaaRuns: COL.amber, msaaRuns: COL.b, noneInstructions: COL.gray, ssaaInstructions: COL.amber, msaaInstructions: COL.b, noneMiB: COL.gray, multiMiB: COL.purple },
    setup: (ctx) => setupOverlay(ctx, null),
    leave: (ctx) => leaveOverlay(ctx),
    run: runCost,
    draw(v, m, r, ctx) {
      const ov = ctx.sceneEl ? overlayFor(ctx) : null;
      if (!ov) return;
      ov.painter = (g) => paintCost(ov, g, m, r);
      ov.repaint();
    },
    explain: explainCost,
    panelTitle: 'Frame',
    panel: costPanel,
  };
}

// ---------------------------------------------------------------- blend space

const BLEND_INIT = { coverage: 0.5 };
const BLEND_PRESETS = [
  { label: 'half coverage', set: { coverage: 0.5 } }, { label: 'a quarter', set: { coverage: 0.25 } }, { label: 'nine tenths', set: { coverage: 0.9 } },
  { label: 'almost empty, 0.05', set: { coverage: 0.05 } },
];

function runBlend(m) {
  const code = SL.blendCoverage(m.coverage, false);
  const linear = SL.blendCoverage(m.coverage, true);
  return { ...code, linear, line: 2 * code.light, lineLinear: 2 * linear.light };
}

const gray = (code) => `rgb(${code},${code},${code})`;

function paintBlend(ov, g, m, r) {
  const A = ov.area();
  const pw = Math.round(A.w * 0.5);
  const p = new Plot(g, { x: A.x, y: A.y, w: pw, h: Math.min(A.h, pw + 40) }, { xr: [0, 1], yr: [0, 1], xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.25, 0.5, 0.75, 1], title: 'light emitted, against the coverage wanted', xlabel: 'coverage', ylabel: 'light', bottom: 26 });
  p.frame();
  p.curve((x) => x, C.faint, { width: 1.2, dash: [4, 4], n: 2 });
  p.curve((x) => SL.blendCoverage(x, true).light, C.green, { width: 2.4, n: 300, alpha: ov.dim('linear') });
  p.curve((x) => SL.blendCoverage(x, false).light, C.red, { width: 2.6, n: 300, alpha: ov.dim('light', 'error', 'code') });
  p.vline(m.coverage, C.nyquist, { dash: [4, 4] });
  p.dot(m.coverage, r.light, 5.5, C.red, { stroke: C.bg });
  p.dot(m.coverage, r.linear.light, 5.5, C.green, { stroke: C.bg });
  text(g, 'blended as light, then encoded', p.x0 + 10, p.y0 + 18, { size: 12, color: C.green, weight: 600 });
  text(g, 'blended as codes', p.x0 + 10, p.y0 + 36, { size: 12, color: C.red, weight: 600 });
  const sx = A.x + pw + 28;
  const sw = Math.min(140, Math.floor((A.x + A.w - sx - 10) / 2));
  if (sw < 60) return;
  const swatch = (x, y, code, title, sub) => {
    g.fillStyle = gray(code);
    g.fillRect(x, y, sw, sw);
    g.strokeStyle = C.axis;
    g.strokeRect(x + 0.5, y + 0.5, sw - 1, sw - 1);
    text(g, title, x, y - 24, { size: 12.5, color: C.ink, weight: 600 });
    text(g, sub, x, y - 8, { size: 11.5, color: C.dim });
  };
  const y0 = A.y + 56;
  swatch(sx, y0, r.linear.code, 'as light', `code ${r.linear.code}, emits ${f(r.linear.light, 3)}`);
  swatch(sx + sw + 14, y0, r.code, 'as codes', `code ${r.code}, emits ${f(r.light, 3)}`);
  // a one-pixel white line straddling two pixels, each half covered: the same two methods side by side
  const ly = y0 + sw + 86;
  text(g, `a white line over two pixels, ${f(m.coverage * 100, 0)} % in each`, sx, ly - 28, { size: 12.5, color: C.ink, weight: 600 });
  const cell = Math.min(sw / 2, 64);
  [['as light', r.linear.code, r.lineLinear], ['as codes', r.code, r.line]].forEach(([label, code, total], k) => {
    const x = sx + k * (sw + 14);
    g.fillStyle = gray(code);
    g.fillRect(x, ly, cell, cell * 2);
    g.fillRect(x + cell, ly, cell, cell * 2);
    g.strokeStyle = C.axis;
    g.strokeRect(x + 0.5, ly + 0.5, 2 * cell - 1, cell * 2 - 1);
    text(g, label, x, ly + cell * 2 + 16, { size: 11.5, color: k === 0 ? C.green : C.red, weight: 600 });
    text(g, `${f(total * 100, 1)} % of the light`, x, ly + cell * 2 + 31, { size: 11.5, color: k === 0 ? C.green : C.red });
  });
}

function explainBlend(m, r) {
  const wrong = Math.abs(r.error) > 0.02;
  return {
    hud: `coverage {wanted|${f(m.coverage, 2)}}: blended as codes it is code {code|${r.code}}, which emits {light|${f(r.light, 3)}}`,
    rows: [
      `code = floor(255 × coverage + ½) = floor(255 × ${f(m.coverage, 2)} + ½) = {code|${r.code}}`,
      `light = ((code / 255 + 0.055) / 1.055)^2.4 = {light|${f(r.light, 3)}}`,
      `error = light − coverage = {error|${f(r.error, 3)}}`,
      `blended as light, then encoded: code ${r.linear.code}, emits ${f(r.linear.light, 3)}, error ${f(r.linear.error, 3)}`,
      `two pixels at ${f(m.coverage, 2)}: ${f(r.line, 3)} of a full line's light as codes, ${f(r.lineLinear, 3)} as light`,
    ],
    status: wrong
      ? { text: `blending the codes emits ${f(r.light, 3)} of the light where ${f(m.coverage, 2)} was wanted (${f(r.error, 3)}): the edge is too dark, and a thin bright line looks thinner than it is`, tone: 'bad' }
      : { text: `at this coverage the two spaces nearly agree (error ${f(r.error, 3)})`, tone: 'ok' },
    values: [
      ['wanted', f(m.coverage, 2), 'wanted'], ['code as codes', String(r.code), 'code'], ['light as codes', f(r.light, 3), 'light'], ['error', f(r.error, 3), 'error'],
      ['code as light', String(r.linear.code), null], ['light as light', f(r.linear.light, 3), 'linear'],
    ],
  };
}

function blendView() {
  return {
    id: 'blend', topic: 'samples', label: 'blend space', init: BLEND_INIT, presets: BLEND_PRESETS, ...NO_GRID,
    params: [{ id: 'coverage', label: 'coverage', min: 0, max: 1, step: 0.01 }],
    inputTitle: 'Coverage', regions: ['Blend space'],
    keys: { wanted: COL.gold, code: COL.red, light: COL.red, error: COL.pink, linear: COL.green },
    setup: (ctx) => setupOverlay(ctx, null),
    leave: (ctx) => leaveOverlay(ctx),
    run: runBlend,
    draw(v, m, r, ctx) {
      const ov = ctx.sceneEl ? overlayFor(ctx) : null;
      if (!ov) return;
      ov.painter = (g) => paintBlend(ov, g, m, r);
      ov.repaint();
    },
    explain: explainBlend,
  };
}

export function sampleViews() {
  return [coverageView(), stratView(), costView(), blendView()];
}
