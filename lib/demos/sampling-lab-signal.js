// sampling-lab-signal: the views of the Signal and Zone plate topics of the sampling lab: a sine sampled and the alias it returns as,
// the two-tone signal reconstructed from its samples, and a zone plate rendered one pixel at a time. run() calls the program's own
// functions (lib/programs/sampling-lab/webgl/samplinglab.js), so every number in the pictures, the formulas and beside the code is
// that code's output; the pictures are canvases over the scene (sampling-lab-draw.js).
import * as SL from '../programs/sampling-lab/webgl/samplinglab.js';
import { COL } from '../core/lab-viz.js';
import {
  C, KIND_COLOR, Plot, overlayFor, setupOverlay, leaveOverlay, text, pill, f, tick, el, btn, segmented, once, fitRect, renderImage, paintBuffer, legendRow,
} from './sampling-lab-draw.js';
import { FILTER_INIT, FILTER_NAMES, filterPanel } from './sampling-lab-filters.js';

const DEG = Math.PI / 180;
const HOME = { eye: [0, 0, 8], target: [0, 0, 0] };
const NO_GRID = { grid: 'none', axes: false, home: HOME };
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** ticks at a round step across [lo, hi], about n of them */
export function niceTicks(lo, hi, n = 6) {
  const raw = (hi - lo) / n;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * pow).find((s) => s >= raw) ?? pow * 10;
  const out = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
}

// ---------------------------------------------------------------- a sine and its samples, drawn in the time domain

/**
 * The true sine, its samples and the alias through them, in the box. s is the program's sampleSine result for count samples;
 * pattern: the label of the vertical axis. Returns the Plot.
 */
export function paintSampledSine(ov, g, box, s, { f: freq, fs, phase, count, title, unit = '', trueName = 'true', ylabel = '', mark = -1 }) {
  const T = count / fs;
  // a narrow box puts the legend on a line of its own under the title
  const narrow = box.w < 640;
  const p = new Plot(g, box, { xr: [0, T], yr: [-1.3, 1.3], xticks: niceTicks(0, T, 8), yticks: [-1, 0, 1], title: narrow ? '' : title, xlabel: unit, ylabel, bottom: 22, top: narrow ? 42 : 22 });
  p.frame();
  if (narrow) text(g, title, p.x0, p.y0 - 25, { size: 12.5, color: C.ink, weight: 600, halo: false });
  p.vline(0, C.axis, { dash: [] });
  // the true sine, drawn with at least a dozen points per cycle, since a coarse curve would alias in its own picture
  const points = Math.min(6000, Math.max(300, Math.ceil(freq * T * 14)));
  p.curve((t) => SL.sineValue(freq, phase, t), C.true, { width: 1.6, n: points, to: T, alpha: 0.9 * ov.dim('f') });
  if (s.aliased) p.curve((t) => SL.sineValue(s.signed, phase, t), C.alias, { width: 3, n: 600, to: T, alpha: ov.dim('alias', 'signed') });
  else p.curve((t) => SL.sineValue(freq, phase, t), C.alias, { width: 3, n: points, to: T, alpha: 0.35 * ov.dim('alias', 'signed') });
  const room = (p.x1 - p.x0) / count;
  for (let i = 0; i < count; i++) {
    g.globalAlpha = ov.dim('fs');
    p.stem(s.times[i], s.values[i], 0, room > 22 ? 4.5 : 3.2, C.white);
    g.globalAlpha = 1;
    if (i === mark) { g.strokeStyle = C.nyquist; g.lineWidth = 2.5; g.beginPath(); g.arc(p.sx(s.times[i]), p.sy(s.values[i]), 10, 0, Math.PI * 2); g.stroke(); }
    if (room > 46) text(g, f(s.values[i], 2), p.sx(s.times[i]), p.sy(s.values[i]) + (s.values[i] >= 0 ? -9 : 17), { size: 10.5, color: C.dim, align: 'center' });
  }
  legendRow(g, p.x1, p.y0 - 7, [
    [`${trueName} ${f(freq, 2)}`, C.true],
    [s.aliased ? `alias ${s.signed < 0 ? '\u2212' : ''}${f(s.alias, 2)}` : 'no alias: below Nyquist', C.alias],
    ['samples', C.white],
  ]);
  return p;
}

// ---------------------------------------------------------------- alias: a sine sampled at a chosen rate

const COUNT = 12;
const ALIAS_INIT = { f: 4.5, fs: 6, phase: 0 };
const ALIAS_PRESETS = [
  { label: 'the chapter: 4.5 at 6', set: { f: 4.5, fs: 6, phase: 0 } },
  { label: 'below Nyquist: 2 at 6', set: { f: 2, fs: 6, phase: 0 } },
  { label: 'just past: 3.5 at 6', set: { f: 3.5, fs: 6, phase: 0 } },
  { label: 'at Nyquist, phase 0', set: { f: 3, fs: 6, phase: 0 } },
  { label: 'at Nyquist, phase 90°', set: { f: 3, fs: 6, phase: 90 } },
  { label: 'f = fs, phase 90°', set: { f: 6, fs: 6, phase: 90 } },
  { label: '0.8 cycle per pixel', set: { f: 0.8, fs: 1, phase: 0 } },
  { label: '1.5-pixel period', set: { f: 2 / 3, fs: 1, phase: 0 } },
];

function runAlias(m) {
  const a = SL.aliasFrequency(m.f, m.fs);
  const s = SL.sampleSine(m.f, m.fs, m.phase * DEG, COUNT);
  return { ...s, k: a.k, f: m.f, fs: m.fs };
}

function aliasLayout(ov) {
  const A = ov.area();
  const topH = Math.round(A.h * 0.56);
  return { time: { x: A.x, y: A.y, w: A.w, h: topH }, freq: { x: A.x, y: A.y + topH + 6, w: A.w, h: A.h - topH - 6 } };
}

function paintAlias(ov, g, m, r) {
  const L = aliasLayout(ov);
  paintSampledSine(ov, g, L.time, r, { f: m.f, fs: m.fs, phase: m.phase * DEG, count: COUNT, title: `sin(2π f t + φ), sampled at t = i / fs, fs = ${f(m.fs, 2)}`, unit: 't (units)' });
  const fmax = 12;
  const p = new Plot(g, L.freq, { xr: [0, fmax], yr: [0, Math.max(0.6, m.fs / 2 * 1.2)], xticks: niceTicks(0, fmax, 12), yticks: niceTicks(0, m.fs / 2 * 1.1, 4), title: 'the frequency the samples show, against the true frequency', xlabel: 'true frequency f', ylabel: 'alias', bottom: 24 });
  p.frame();
  p.curve((x) => x, C.faint, { width: 1.2, dash: [4, 4], n: 2 });
  p.curve((x) => SL.aliasFrequency(x, m.fs).alias, C.alias, { width: 2.6, n: 960, alpha: ov.dim('alias') });
  const nyq = m.fs / 2;
  p.hline(nyq, C.nyquist, { dash: [2, 4] });
  p.vline(nyq, C.nyquist, { dash: [6, 4], width: 1.5, label: `Nyquist fs/2 = ${f(nyq, 2)}: the alias starts`, labelColor: C.nyquist });
  for (let k = 1; k * m.fs <= fmax + 1e-9; k++) p.vline(k * m.fs, C.rate, { dash: [2, 4], label: k === 1 ? `fs = ${f(m.fs, 2)}` : `${k} fs`, labelColor: C.rate });
  p.vline(m.f, C.true, { dash: [6, 3], width: 1.6 });
  p.hline(r.alias, C.alias, { dash: [3, 3] });
  p.dot(m.f, r.alias, 6, C.alias, { stroke: C.bg });
  text(g, `f = ${f(m.f, 2)}`, p.sx(m.f) + (m.f > fmax * 0.8 ? -7 : 7), p.y1 - 6, { size: 12, color: C.true, weight: 600, align: m.f > fmax * 0.8 ? 'right' : 'left' });
  text(g, `alias ${f(r.alias, 2)}`, p.x0 + 6, p.sy(r.alias) - 5, { size: 12, color: C.alias, weight: 600 });
  ov.freqPlot = p;
}

function aliasDrag(ctx, x, y) {
  const ov = overlayFor(ctx);
  const p = ov.freqPlot;
  if (!p) return;
  const m = ctx.state();
  const fv = Math.round(p.dataX(x) * 20) / 20;
  m.f = Math.max(0, Math.min(12, fv));
  ctx.refresh();
}

function explainAlias(m, r) {
  const nyq = r.nyquist;
  const reversed = r.signed < 0;
  let status;
  if (m.f < 1e-9) status = { text: 'f = 0: a constant. Every sample is the same.', tone: 'info' };
  else if (r.aliased && r.alias < 1e-6) status = { text: `f is a whole multiple of fs: every sample lands at the same phase, so the samples are constant (an alias of frequency 0)`, tone: 'warn' };
  else if (r.aliased) status = { text: `${f(m.f, 2)} is above Nyquist ${f(nyq, 2)}: the samples are exactly those of a sine of frequency ${f(r.alias, 2)}${reversed ? ' running backward' : ''}, and that is the sine the reconstruction draws`, tone: 'bad' };
  else if (Math.abs(m.f - nyq) < 1e-6) {
    const amp = Math.max(...r.values.map((v) => Math.abs(v)));
    status = { text: `f is at Nyquist: two samples per cycle hold the sine only up to its phase; the samples reach ${f(amp, 2)} of its amplitude`, tone: amp < 0.05 ? 'bad' : 'warn' };
  } else status = { text: `f is below Nyquist: the samples are those of this sine alone, and the reconstruction can draw it`, tone: 'ok' };
  return {
    hud: `f = {f|${f(m.f, 2)}}, fs = {fs|${f(m.fs, 2)}}: alias |f − k fs| = {alias|${f(r.alias, 2)}}${r.aliased ? '' : ' (none: f is below Nyquist)'}`,
    rows: [
      `Nyquist frequency = {fs|fs} / 2 = {fs|${f(m.fs, 2)}} / 2 = {nyquist|${f(nyq, 2)}}`,
      `k = round(f / fs) = round(${f(m.f, 2)} / ${f(m.fs, 2)}) = {k|${r.k}}`,
      `signed = f − k fs = ${f(m.f, 2)} − ${r.k} × ${f(m.fs, 2)} = {signed|${f(r.signed, 2)}}`,
      `alias = |signed| = {alias|${f(r.alias, 2)}}${r.alias > 1e-6 ? `, a period of ${f(1 / r.alias, 2)}` : ''}`,
      `the sine of frequency {signed|${f(r.signed, 2)}} passes through all ${COUNT} samples: largest gap {mismatch|${r.mismatch.toExponential(0)}}`,
    ],
    status,
    values: [
      ['true frequency f', f(m.f, 2), 'f'], ['sampling rate fs', f(m.fs, 2), 'fs'],
      ['Nyquist fs / 2', f(nyq, 2), 'nyquist'], ['alias', f(r.alias, 2), 'alias'],
      ['samples per cycle of f', m.f > 1e-9 ? f(m.fs / m.f, 2) : 'none', 'f'], ['aliased', r.aliased ? 'yes' : 'no', null],
    ],
  };
}

function aliasView() {
  return {
    id: 'alias', topic: 'signal', label: 'aliasing in 1D', init: ALIAS_INIT, presets: ALIAS_PRESETS, ...NO_GRID,
    params: [
      { id: 'f', label: 'f', min: 0, max: 12, step: 0.05 }, { id: 'fs', label: 'fs', min: 1, max: 12, step: 0.1 },
      { id: 'phase', label: 'φ', min: 0, max: 360, step: 5, unit: '°' },
    ],
    inputTitle: 'Sine', regions: ['Alias frequency', 'Sample a sine'],
    keys: { f: COL.a, fs: COL.b, nyquist: COL.gold, alias: COL.c, signed: COL.c, k: COL.purple, mismatch: COL.gray },
    setup: (ctx) => setupOverlay(ctx, { down: (x, y) => aliasDrag(ctx, x, y), move: (x, y) => aliasDrag(ctx, x, y) }),
    leave: (ctx) => leaveOverlay(ctx),
    run: runAlias,
    draw(v, m, r, ctx) {
      const ov = ctx.sceneEl ? overlayFor(ctx) : null;
      if (!ov) return;
      ov.painter = (g) => paintAlias(ov, g, m, r);
      ov.repaint();
    },
    explain: explainAlias,
  };
}

// ---------------------------------------------------------------- reconstruct: the two-tone signal from its samples

const RECON_KINDS = ['box', 'tent', 'lanczos3'];
const RECON_INIT = { ...FILTER_INIT, fs: 10, probe: 2 };
const RECON_PRESETS = [
  { label: 'the chapter: 10 per unit', set: { fs: 10, kind: 'lanczos3', probe: 2 } },
  { label: 'just above 2B: 8.5', set: { fs: 8.5 } },
  { label: 'below 2B: 6', set: { fs: 6 } },
  { label: 'the tone at fs = 5', set: { fs: 5 } },
  { label: 'plenty: 20', set: { fs: 20 } },
  { label: 'Mitchell (⅓, ⅓)', set: { kind: 'mitchell', B: 1 / 3, C: 1 / 3 } },
  { label: 'Gaussian, σ ½', set: { kind: 'gaussian', sigma: 0.5 } },
];

function runRecon(m) {
  const kinds = RECON_KINDS.includes(m.kind) ? RECON_KINDS : [...RECON_KINDS, m.kind];
  const errors = {};
  for (const k of kinds) errors[k] = SL.reconstructionError(k, m.fs, m.B, m.C, m.sigma);
  const sel = errors[m.kind];
  const samples = [];
  for (let i = 0; i < sel.count; i++) samples.push(SL.twoTone(i / m.fs));
  const support = SL.filterSupport(m.kind, m.sigma);
  const taps = SL.filterTaps(m.kind, m.probe * m.fs, m.B, m.C, m.sigma);
  const last = taps.first + taps.weights.length - 1;
  return {
    count: sel.count, rms: sel.rms, signalRms: sel.signalRms, errors, kinds, samples, support, first: taps.first, last, weights: taps.weights,
    sum: taps.sum, normalized: taps.normalized, nyquist: m.fs / 2, toneAlias: SL.aliasFrequency(4, m.fs),
  };
}

function reconLayout(ov, r) {
  const A = ov.area();
  const n = r.kinds.length;
  const h = A.h / n;
  return r.kinds.map((kind, i) => ({ kind, box: { x: A.x, y: A.y + i * h, w: A.w, h } }));
}

function paintRecon(ov, g, m, r) {
  const panels = reconLayout(ov, r);
  panels.forEach(({ kind, box }, i) => {
    const err = r.errors[kind];
    const last = i === panels.length - 1;
    const chosen = kind === m.kind;
    const p = new Plot(g, box, {
      xr: [0, 4], yr: [-1.7, 1.7], xticks: last ? [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4] : [], yticks: [-1, 0, 1],
      title: `${FILTER_NAMES[kind]}: RMS error ${f(err.rms, 3)}`, xlabel: last ? 'x' : '', top: 22, bottom: last ? 22 : 6, grid: true,
    });
    p.frame();
    if (chosen) {
      g.strokeStyle = KIND_COLOR[kind];
      g.globalAlpha = 0.7;
      g.lineWidth = 2;
      g.strokeRect(p.x0 - 1, p.y0 - 1, p.x1 - p.x0 + 2, p.y1 - p.y0 + 2);
      g.globalAlpha = 1;
    }
    const dim = ov.dim(kind, 'rms');
    const recon = (x) => SL.reconstruct(r.samples, x * m.fs, kind, m.B, m.C, m.sigma);
    p.fill((x) => recon(x), KIND_COLOR[kind], { n: 480, alpha: 0.0 });
    // the window the error is measured over
    g.fillStyle = 'rgba(255,255,255,0.025)';
    g.fillRect(p.sx(0.5), p.y0, p.sx(3.5) - p.sx(0.5), p.y1 - p.y0);
    p.curve((x) => SL.twoTone(x), 'rgba(180,190,210,0.55)', { width: 4, n: 480 });
    p.curve(recon, KIND_COLOR[kind], { width: 2.2, n: 720, alpha: dim });
    for (let k = 0; k < r.count; k++) p.dot(k / m.fs, r.samples[k], r.count > 60 ? 2.6 : 3.6, C.white, { alpha: 0.9 });
    if (i === 0) legendRow(g, p.x1, p.y0 - 7, [['the signal', 'rgba(180,190,210,0.9)'], ['reconstructed', C.ink], ['samples', C.white]], { size: 11.5 });
    if (i === 1) text(g, 'the error is measured between 0.5 and 3.5', p.x1, p.y0 - 7, { size: 11, color: C.dim, align: 'right', halo: false });
    if (chosen) paintProbe(ov, g, p, m, r, kind);
  });
  ov.reconPlots = panels;
}

/** the filter's reach at the probe: its kernel centered there, and the weight each sample under it gets */
function paintProbe(ov, g, p, m, r, kind) {
  const x = m.probe;
  p.vline(x, C.nyquist, { dash: [4, 4], width: 1.2 });
  const kernel = (t) => SL.filterWeight(kind, (t - x) * m.fs, m.B, m.C, m.sigma);
  p.curve(kernel, C.nyquist, { width: 1.8, n: 400, dash: [5, 3], alpha: ov.dim('weights', 'sum', 'first') });
  for (let j = 0; j < r.weights.length; j++) {
    const i = r.first + j;
    if (i < 0 || i >= r.count) continue;
    const w = r.weights[j];
    p.dot(i / m.fs, Math.max(-1.6, Math.min(1.6, w)), 4, C.nyquist, { stroke: C.bg });
    text(g, f(w, 3), p.sx(i / m.fs), p.sy(Math.max(-1.6, Math.min(1.6, w))) + (w >= 0 ? -9 : 17), { size: 10.5, color: C.nyquist, align: 'center', weight: 600 });
  }
}

function reconDrag(ctx, x) {
  const ov = overlayFor(ctx);
  const first = ov.reconPlots?.[0];
  if (!first) return;
  const p = new Plot(ov.g, first.box, { xr: [0, 4], yr: [-1, 1] });
  const m = ctx.state();
  m.probe = Math.round(Math.max(0.5, Math.min(3.5, p.dataX(x))) * 100) / 100;
  ctx.refresh();
}

function explainRecon(m, r) {
  const e = r.errors;
  const ok = m.fs > 8;
  const lanczos = e.lanczos3.rms;
  const parts = [`box {box|${f(e.box.rms, 3)}}`, `tent {tent|${f(e.tent.rms, 3)}}`, `Lanczos-3 {lanczos3|${f(lanczos, 3)}}`];
  if (e[m.kind] && !RECON_KINDS.includes(m.kind)) parts.push(`${FILTER_NAMES[m.kind]} {rms|${f(r.rms, 3)}}`);
  return {
    hud: `fs = {fs|${f(m.fs, 1)}}, Nyquist {nyquist|${f(r.nyquist, 2)}}: ${FILTER_NAMES[m.kind]} RMS error {rms|${f(r.rms, 3)}} (the signal's own: ${f(r.signalRms, 3)})`,
    rows: [
      `f̃(x) = Σ f(i / fs) h(x fs − i), over the taps of h`,
      `RMS error against the signal: ${parts.join(', ')}`,
      `the tones are 1.5 and 4, so B = 4 and the theorem asks fs above 2B = 8; here fs = {fs|${f(m.fs, 1)}}`,
      `at x = ${f(m.probe, 2)}: x fs = ${f(m.probe * m.fs, 2)}, taps i = {first|${r.first}} to {last|${r.last}} (support {support|${f(r.support, 2)}}), weights {weights|${r.weights.map((w) => f(w, 3)).join(' ')}}, sum {sum|${f(r.sum, 3)}}${r.normalized ? ' (divided by it)' : ''}`,
    ],
    status: ok
      ? { text: `fs = ${f(m.fs, 1)} is above 2B = 8: the samples hold the signal, and the filter decides how much of it comes back (a box ${f(e.box.rms / r.signalRms * 100, 0)} % of the signal's RMS in error, Lanczos-3 ${f(lanczos / r.signalRms * 100, 0)} %)`, tone: 'ok' }
      : { text: `fs = ${f(m.fs, 1)} is below 2B = 8: the 4 tone returns as |4 − ${r.toneAlias.k} × ${f(m.fs, 1)}| = ${f(r.toneAlias.alias, 2)}, and no filter can bring it back (best RMS error ${f(Math.min(...Object.values(e).map((v) => v.rms)), 3)})`, tone: 'bad' },
    values: [
      ['box', f(e.box.rms, 3), 'box'], ['tent', f(e.tent.rms, 3), 'tent'], ['Lanczos-3', f(lanczos, 3), 'lanczos3'],
      ['signal RMS', f(r.signalRms, 3), null], ['samples', String(r.count), null], ['4 returns as', f(r.toneAlias.alias, 2), null],
    ],
  };
}

function reconView() {
  return {
    id: 'reconstruct', topic: 'signal', label: 'from samples', group: 'filter', init: RECON_INIT, presets: RECON_PRESETS, ...NO_GRID,
    params: [
      { id: 'fs', label: 'fs', min: 4, max: 20, step: 0.5 },
      { id: 'B', label: 'B', min: 0, max: 1, step: 0.01 }, { id: 'C', label: 'C', min: 0, max: 1, step: 0.01 }, { id: 'sigma', label: 'σ', min: 0.35, max: 1, step: 0.05 },
    ],
    inputTitle: 'Samples and filter', regions: ['Filter kernels', 'Filter taps', 'Reconstruct from samples'],
    keys: { fs: COL.b, nyquist: COL.gold, box: COL.a, tent: COL.amber, lanczos3: COL.b, rms: COL.c, first: COL.gold, last: COL.gold, support: COL.gold, weights: COL.gold, sum: COL.gold },
    setup: (ctx) => setupOverlay(ctx, { down: (x) => reconDrag(ctx, x), move: (x) => reconDrag(ctx, x) }),
    leave: (ctx) => leaveOverlay(ctx),
    run: runRecon,
    draw(v, m, r, ctx) {
      const ov = ctx.sceneEl ? overlayFor(ctx) : null;
      if (!ov) return;
      ov.painter = (g) => paintRecon(ov, g, m, r);
      ov.repaint();
    },
    explain: explainRecon,
    panelTitle: 'Filter',
    panel: (host, m, r, ctx) => filterPanel(host, m, ctx, 'recon'),
  };
}

// ---------------------------------------------------------------- the zone plate

// the resolution is a choice; the program's ZONE_SIZE, 200, is the default and the size of the lecture's plate. On the full page at
// 1440 x 860 all three fill the same 600-pixel square at a whole number of screen pixels per pixel (6, 3, 2); 400 would get 1 and a
// smaller square, and a larger plate would not fit a slide without resampling, which adds a moire of its own
export const ZONE_SIZES = [100, 200, 300];
const ZONE_INIT = { n: 1, jitter: 0, px: 140, py: 100, show: 1, size: SL.ZONE_SIZE };
const zoneSize = (m) => m.size ?? SL.ZONE_SIZE;

/**
 * A new resolution: the picked pixel stays on the same spot of the plate. The spot is the centre of the pixel last picked, kept as a
 * fraction of the image (pu, pv), so going down a size and back up returns to the same pixel; if px or py was set some other way since,
 * the fraction is taken from them.
 */
export function setZoneSize(m, size) {
  const old = zoneSize(m);
  if (!(m.pu >= 0 && m.pv >= 0) || Math.floor(m.pu * old) !== m.px || Math.floor(m.pv * old) !== m.py) {
    m.pu = (m.px + 0.5) / old;
    m.pv = (m.py + 0.5) / old;
  }
  m.size = size;
  m.px = Math.min(size - 1, Math.floor(m.pu * size));
  m.py = Math.min(size - 1, Math.floor(m.pv * size));
}
const ZONE_PRESETS = [
  { label: '1 sample per pixel', set: { n: 1, jitter: 0 } },
  { label: '16 samples (4 × 4)', set: { n: 4, jitter: 0 } },
  { label: '256 samples (16 × 16)', set: { n: 16, jitter: 0 } },
  { label: '4 samples (2 × 2)', set: { n: 2, jitter: 0 } },
  { label: '4 samples, jittered', set: { n: 2, jitter: 1 } },
  { label: '16 samples, jittered', set: { n: 4, jitter: 1 } },
];

function runZone(m) {
  const size = zoneSize(m);
  const rN = SL.zoneRadius(0.5, size, SL.ZONE_K);
  const dx = m.px + 0.5 - size / 2, dy = m.py + 0.5 - size / 2;
  const fx = SL.zoneFrequency(Math.abs(dx), size, SL.ZONE_K), fy = SL.zoneFrequency(Math.abs(dy), size, SL.ZONE_K);
  const pixel = SL.zonePixel(m.px, m.py, m.n, !!m.jitter, size, SL.ZONE_K);
  const ax = SL.aliasFrequency(fx, 1);
  const ay = SL.aliasFrequency(fy, 1);
  const worst = fx >= fy ? ax : ay;
  return {
    ...pixel, size, radius: rN, dx, dy, fx, fy, ax, ay, k: worst.k, signed: worst.signed, alias: worst.alias, nyquist: worst.nyquist, aliased: worst.aliased, f: Math.max(fx, fy), fs: 1,
    diagonal: rN * Math.SQRT2, leak: SL.filterResponse('box', 1.5, 0, 0, 0.5),
  };
}

/** where the plate of size x size pixels goes: each pixel a whole number of screen pixels, or less than one when even one does not fit */
export function zoneLayout(ov, plate = SL.ZONE_SIZE) {
  const A = ov.area();
  const room = Math.min(A.h - 6, A.w - 250) / plate;
  const scale = room >= 1 ? Math.min(8, Math.floor(room)) : Math.max(0.25, room);
  const size = plate * scale;
  const img = { x: A.x + 4, y: A.y + Math.max(0, Math.round((A.h - size) / 2)), w: size, h: size };
  const right = { x: img.x + size + 18, y: A.y, w: A.x + A.w - (img.x + size + 18), h: A.h };
  return { img, scale, right };
}

function zoneRow(m) {
  const size = zoneSize(m);
  return (iy, data, w) => {
    for (let ix = 0; ix < w; ix++) {
      const v = SL.zonePixel(ix, iy, m.n, !!m.jitter, size, SL.ZONE_K).value;
      const g = Math.round(255 * Math.min(1, Math.max(0, v)));
      data[4 * ix] = g; data[4 * ix + 1] = g; data[4 * ix + 2] = g; data[4 * ix + 3] = 255;
    }
  };
}

function paintZone(ov, g, m, r, job) {
  const size = zoneSize(m);
  const L = zoneLayout(ov, size);
  const im = L.img;
  paintBuffer(ov, g, im);
  const cx = im.x + im.w / 2, cy = im.y + im.h / 2, s = L.scale;
  if (m.show) {
    g.save();
    g.beginPath();
    g.rect(im.x, im.y, im.w, im.h);
    g.clip();
    const ring = (radius, color, dash, width = 1.5) => {
      g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash);
      g.beginPath(); g.arc(cx, cy, radius * s, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    };
    g.globalAlpha = 0.95 * ov.dim('nyquist', 'radius');
    ring(r.radius, C.nyquist, [7, 5], 2);
    g.globalAlpha = 0.7 * ov.dim('nyquist', 'radius');
    ring(SL.zoneRadius(1, size, SL.ZONE_K), C.alias, [3, 5], 1.5);
    if (m.n >= 2 && !m.jitter) ring(SL.zoneRadius(m.n / 2, size, SL.ZONE_K), C.rate, [2, 4], 1.5);
    g.globalAlpha = 0.5;
    g.strokeStyle = C.nyquist;
    g.setLineDash([2, 4]);
    g.lineWidth = 1;
    g.strokeRect(cx - r.radius * s, cy - r.radius * s, 2 * r.radius * s, 2 * r.radius * s);
    g.setLineDash([]);
    g.globalAlpha = 1;
    g.restore();
    text(g, `Nyquist along an axis: r = ${f(r.radius, 1)} px`, cx + 8, cy - r.radius * s - 7, { size: 11.5, color: C.nyquist, weight: 600 });
  }
  // the selected pixel
  const x = im.x + m.px * s, y = im.y + m.py * s, box = Math.max(s, 6);
  g.strokeStyle = C.bg; g.lineWidth = 4; g.strokeRect(x - (box - s) / 2, y - (box - s) / 2, box, box);
  g.strokeStyle = C.alias; g.lineWidth = 2; g.strokeRect(x - (box - s) / 2, y - (box - s) / 2, box, box);
  if (!job.done) pill(g, `rendering ${Math.round((job.row / job.h) * 100)} %`, im.x + 8, im.y + 24, C.nyquist);
  text(g, `${size} × ${size} pixels, each the mean of ${m.n * m.n} ${m.jitter ? 'jittered' : 'grid'} ${m.n * m.n === 1 ? 'sample' : 'samples'}, computed by the program`, im.x, im.y + im.h + 15, { size: 11, color: C.dim });
  // the plot: local frequency, what a pixel grid shows of it, and what the averaging leaves
  const R = L.right;
  if (R.w < 200) return;
  const p = new Plot(g, { x: R.x, y: R.y, w: R.w, h: Math.min(R.h, 360) }, { xr: [0, size / 2], yr: [0, 1.05], xticks: niceTicks(0, size / 2, 5), yticks: [0, 0.25, 0.5, 0.75, 1], title: 'cycles per pixel along an axis', xlabel: 'distance r from the centre (px)', bottom: 26 });
  p.frame();
  p.hline(0.5, C.nyquist, { dash: [6, 4], width: 1.3, label: 'Nyquist ½', labelAt: 'left' });
  p.vline(r.radius, C.nyquist, { dash: [2, 4] });
  p.curve((rr) => SL.zoneFrequency(rr, size, SL.ZONE_K), C.true, { width: 2, n: 200, alpha: ov.dim('f') });
  p.curve((rr) => SL.aliasFrequency(SL.zoneFrequency(rr, size, SL.ZONE_K), 1).alias, C.alias, { width: 2.4, n: 400, alpha: ov.dim('alias') });
  p.curve((rr) => SL.filterResponse('box', SL.zoneFrequency(rr, size, SL.ZONE_K), 0, 0, 0.5), C.rate, { width: 1.8, n: 200, dash: [5, 3] });
  let ly = p.y0 + 18;
  for (const [label, color] of [['local frequency f', C.true], ['shown by a pixel grid: |f \u2212 k|', C.alias], ['kept by the pixel mean: |sinc f|', C.rate]]) {
    text(g, label, p.x1 - 6, ly, { size: 11.5, color, align: 'right', weight: 600 });
    ly += 16;
  }
  for (const [d, label] of [[Math.abs(r.dx), 'x'], [Math.abs(r.dy), 'y']]) {
    if (d > size / 2) continue;
    const fv = SL.zoneFrequency(d, size, SL.ZONE_K);
    p.dot(d, SL.aliasFrequency(fv, 1).alias, 4.5, C.white, { stroke: C.bg });
    text(g, label, p.sx(d), p.sy(SL.aliasFrequency(fv, 1).alias) - 9, { size: 11, color: C.white, align: 'center', weight: 700 });
  }
}

function zonePick(ctx, x, y) {
  const ov = overlayFor(ctx);
  const m = ctx.state();
  const size = zoneSize(m);
  const L = zoneLayout(ov, size);
  const im = L.img;
  if (x < im.x || y < im.y || x >= im.x + im.w || y >= im.y + im.h) return;
  m.px = Math.min(size - 1, Math.floor((x - im.x) / L.scale));
  m.py = Math.min(size - 1, Math.floor((y - im.y) / L.scale));
  m.pu = (m.px + 0.5) / size;
  m.pv = (m.py + 0.5) / size;
  ctx.refresh();
}

function explainZone(m, r) {
  const samples = m.n * m.n;
  let status;
  if (m.n === 1) status = { text: `1 sample per pixel: beyond r = ${f(r.radius, 1)} px along an axis the rings are aliases, centered on the wrong points and curving the wrong way`, tone: 'bad' };
  else if (m.jitter) status = { text: `${samples} jittered samples per pixel: the false rings turn to noise, which the eye forgives, and the region finer than a pixel averages toward gray`, tone: 'warn' };
  else status = { text: `${samples} samples per pixel: the region finer than a pixel averages toward gray, the right picture of it; faint rings remain where the pixel box leaks (|sinc| is ${f(r.leak, 3)} at 1.5 cycles per pixel)`, tone: samples >= 16 ? 'ok' : 'warn' };
  return {
    hud: `${m.n} × ${m.n} = {samples|${samples}} samples per pixel: the pattern passes Nyquist at r = {radius|${f(r.radius, 1)}} px along an axis`,
    rows: [
      `½ + ½ cos(K r² / size), K = ${f(SL.ZONE_K, 1)}, size = ${r.size} px: local frequency K r / (π size)`,
      `Nyquist (½ cycle per pixel) at r = π size / (2 K) = {radius|${f(r.radius, 1)}} px along an axis, ${f(r.diagonal, 1)} px on a diagonal`,
      `pixel (${m.px}, ${m.py}): offset (${f(r.dx, 1)}, ${f(r.dy, 1)}) from the centre, frequency ({f|${f(r.fx, 3)}}, ${f(r.fy, 3)}) cycles per pixel`,
      `one sample per pixel shows it as |f − k fs| = |${f(r.f, 3)} − {k|${r.k}} × 1| = {alias|${f(r.alias, 3)}}${r.aliased ? '' : ' (below Nyquist: itself)'}`,
      `its value: the mean of ${samples} samples = {value|${f(r.value, 3)}}`,
    ],
    status,
    values: [
      ['samples per pixel', String(samples), 'samples'], ['pixel value', f(r.value, 3), 'value'],
      ['local frequency', f(r.f, 3), 'f'], ['shown as', f(r.alias, 3), 'alias'],
      ['Nyquist radius', f(r.radius, 1), 'radius'], ['on a diagonal', f(r.diagonal, 1), null],
    ],
  };
}

function zonePanel(host, m, r, ctx) {
  once(host, 'zone', (h) => {
    h.refreshers.push(segmented(h, 'resolution', ZONE_SIZES.map((s) => [s, `${s} × ${s}`]), () => zoneSize(m), (v) => { setZoneSize(m, v); ctx.update(); }));
    h.refreshers.push(segmented(h, 'samples', [[0, 'regular grid'], [1, 'jittered']], () => m.jitter, (v) => { m.jitter = v; ctx.update(); }));
    h.refreshers.push(segmented(h, 'guides', [[1, 'on'], [0, 'off']], () => m.show, (v) => { m.show = v; ctx.update(); }));
    h.note = el('p', 'lab-note', h, '');
  });
  host.refreshers.forEach((s) => s());
  host.note.textContent = 'Click a pixel to read its frequency. Gold: where the pattern reaches Nyquist. Green: where it reaches one cycle per pixel (shown as frequency 0). Blue: Nyquist of the n × n sample grid.';
}

function zoneView() {
  return {
    id: 'zoneplate', topic: 'zone', label: 'the zone plate', init: ZONE_INIT, presets: ZONE_PRESETS, ...NO_GRID,
    params: [{ id: 'n', label: 'n × n samples', min: 1, max: 16, step: 1 }],
    inputTitle: 'Samples per pixel', regions: ['Zone plate', 'Alias frequency'],
    keys: { f: COL.a, alias: COL.c, k: COL.purple, radius: COL.gold, nyquist: COL.gold, samples: COL.b, value: COL.white },
    setup: (ctx) => setupOverlay(ctx, { down: (x, y) => zonePick(ctx, x, y), move: (x, y) => zonePick(ctx, x, y) }),
    leave: (ctx) => leaveOverlay(ctx),
    edited(m) {
      const size = zoneSize(m);
      m.px = Math.max(0, Math.min(size - 1, Math.round(m.px)));
      m.py = Math.max(0, Math.min(size - 1, Math.round(m.py)));
    },
    run: runZone,
    draw(v, m, r, ctx) {
      const ov = ctx.sceneEl ? overlayFor(ctx) : null;
      if (!ov) return;
      const size = zoneSize(m);
      const job = renderImage(ov, `${m.n}|${m.jitter}|${size}`, size, size, zoneRow(m), () => ov.repaint());
      ov.painter = (g) => paintZone(ov, g, m, r, job);
      ov.repaint();
    },
    explain: explainZone,
    panelTitle: 'Plate',
    panel: zonePanel,
  };
}

export function signalViews() {
  return [aliasView(), reconView(), zoneView()];
}
