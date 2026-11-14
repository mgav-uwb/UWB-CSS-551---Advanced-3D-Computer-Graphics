// sampling-lab-filters: the Filters topic of the sampling lab: the five reconstruction filters as curves (the kernel and what it
// passes by frequency) and applied to a picture, with the blur and the ringing they leave. The filter chosen, B, C and sigma are
// shared with the "from samples" view (group "filter"). run() calls the program's own functions
// (lib/programs/sampling-lab/webgl/samplinglab.js); the pictures are canvases over the scene (sampling-lab-draw.js).
import * as SL from '../programs/sampling-lab/webgl/samplinglab.js';
import { COL } from '../core/lab-viz.js';
import {
  C, KIND_COLOR, Plot, overlayFor, setupOverlay, leaveOverlay, text, pill, f, el, segmented, once, renderImage, paintBuffer,
} from './sampling-lab-draw.js';

const HOME = { eye: [0, 0, 8], target: [0, 0, 0] };
const NO_GRID = { grid: 'none', axes: false, home: HOME };
const third = 1 / 3;

export const KINDS = ['box', 'tent', 'gaussian', 'lanczos3', 'mitchell'];
export const FILTER_NAMES = { box: 'box', tent: 'tent', gaussian: 'Gaussian', lanczos3: 'Lanczos-3', mitchell: 'Mitchell' };
export const FILTER_INIT = { kind: 'mitchell', B: third, C: third, sigma: 0.5 };
const FILTER_PARAMS = [
  { id: 'B', label: 'B (blur)', min: 0, max: 1, step: 0.01 }, { id: 'C', label: 'C (ringing)', min: 0, max: 1, step: 0.01 },
  { id: 'sigma', label: 'σ (Gaussian)', min: 0.35, max: 1, step: 0.05 },
];

/** the name of a Mitchell-Netravali (B, C), where the chapter gives one */
export function cubicName(B, C) {
  const near = (a, b) => Math.abs(a - b) < 0.006;
  if (near(B, 1) && near(C, 0)) return 'the cubic B-spline';
  if (near(B, third) && near(C, third)) return 'their recommendation';
  if (near(B, 0) && near(C, 0.5)) return 'Catmull\u2013Rom';
  if (near(B, 0) && near(C, 1)) return 'a sharp cubic';
  return '';
}

/** the filter's name for a title: Mitchell carries its B and C */
export function filterTitle(kind, B, C, sigma) {
  if (kind === 'mitchell') return `Mitchell\u2013Netravali (B = ${f(B, 2)}, C = ${f(C, 2)}${cubicName(B, C) ? `: ${cubicName(B, C)}` : ''})`;
  if (kind === 'gaussian') return `Gaussian, σ = ${f(sigma, 2)}`;
  return FILTER_NAMES[kind];
}

/** the filter buttons, shared by the three views that use the filter state */
export function filterPanel(host, m, ctx, id) {
  once(host, `filter-${id}`, (h) => {
    h.refreshers.push(segmented(h, 'filter', KINDS.map((k) => [k, FILTER_NAMES[k]]), () => m.kind, (k) => { m.kind = k; ctx.update(); }));
    h.note = el('p', 'lab-note', h, '');
  });
  host.refreshers.forEach((s) => s());
  host.note.textContent = 'B and C shape the Mitchell–Netravali cubic (1988): more B blurs, more C sharpens and rings. σ shapes the Gaussian. The other filters have no knobs.';
}

const FILTER_PRESETS = [
  { label: 'box', set: { kind: 'box' } }, { label: 'tent', set: { kind: 'tent' } }, { label: 'Gaussian, σ ½', set: { kind: 'gaussian', sigma: 0.5 } },
  { label: 'Lanczos-3', set: { kind: 'lanczos3' } },
  { label: 'B-spline (1, 0)', set: { kind: 'mitchell', B: 1, C: 0 } }, { label: 'Mitchell (⅓, ⅓)', set: { kind: 'mitchell', B: third, C: third } },
  { label: 'Catmull–Rom (0, ½)', set: { kind: 'mitchell', B: 0, C: 0.5 } }, { label: 'sharp (0, 1)', set: { kind: 'mitchell', B: 0, C: 1 } },
];

const FILTER_KEYS = {
  box: COL.a, tent: COL.amber, gaussian: COL.cyan, lanczos3: COL.b, mitchell: COL.c, nyquist: COL.gold, rise: COL.purple, overshoot: COL.pink, undershoot: COL.pink,
  w0: COL.gold, w05: COL.gold, w1: COL.gold, w15: COL.gold, h05: COL.gold, h1: COL.gold, h15: COL.red, first: COL.gold, last: COL.gold, support: COL.gold, weights: COL.gold, sum: COL.gold,
  profileMin: COL.b, profileMax: COL.red,
};

const FREQS = [];
for (let i = 0; i <= 200; i++) FREQS.push(i / 100);

// ---------------------------------------------------------------- curves: the kernel and the frequency response

function runCurves(m) {
  const sel = m.kind;
  const response = {};
  for (const kind of KINDS) {
    const row = [];
    for (let i = 0; i < FREQS.length; i++) row.push(SL.filterResponse(kind, FREQS[i], m.B, m.C, m.sigma));
    response[kind] = row;
  }
  const step = SL.stepResponse(sel, m.B, m.C, m.sigma);
  const at = (u) => SL.filterWeight(sel, u, m.B, m.C, m.sigma);
  const r = {
    ...step, response, support: SL.filterSupport(sel, m.sigma),
    w0: at(0), w05: at(0.5), w1: at(1), w15: at(1.5),
    h05: response[sel][50], h1: response[sel][100], h15: response[sel][150],
  };
  return r;
}

function paintCurves(ov, g, m, r) {
  const A = ov.area();
  const kh = Math.round(A.h * 0.5);
  const sel = m.kind;
  const k = new Plot(g, { x: A.x, y: A.y, w: A.w, h: kh }, {
    xr: [-3, 3], yr: [-0.25, 1.15], xticks: [-3, -2, -1, 0, 1, 2, 3], yticks: [-0.2, 0, 0.5, 1], title: `kernel h(u), the weight of a sample u spacings away: ${filterTitle(sel, m.B, m.C, m.sigma)}`,
    xlabel: 'u (sample spacings)', bottom: 24,
  });
  k.frame();
  for (let i = -3; i <= 3; i++) k.vline(i, C.grid, { dash: [] });
  for (const kind of KINDS) {
    if (kind === sel) continue;
    k.curve((u) => SL.filterWeight(kind, u, m.B, m.C, m.sigma), KIND_COLOR[kind], { width: 1.2, n: 480, alpha: 0.35 * ov.dim(kind) });
  }
  const own = (u) => SL.filterWeight(sel, u, m.B, m.C, m.sigma);
  const wide = sel === 'box' ? 600 : 480;
  k.fill(own, KIND_COLOR[sel], { n: wide, alpha: 0.12 });
  k.curve(own, KIND_COLOR[sel], { width: 3, n: wide, alpha: ov.dim(sel) });
  for (const [u, key, label] of [[0, 'w0', 'h(0)'], [0.5, 'w05', 'h(½)'], [1, 'w1', 'h(1)'], [1.5, 'w15', 'h(1½)']]) {
    const v = r[key];
    k.dot(u, v, 4.5, C.nyquist, { stroke: C.bg, alpha: ov.dim(key) });
    text(g, `${label} = ${f(v, 3)}`, k.sx(u) + 7, k.sy(Math.max(v, -0.1)) - 8, { size: 11.5, color: C.nyquist, weight: 600 });
  }
  let ly = k.y0 + 16;
  for (const kind of KINDS) {
    text(g, FILTER_NAMES[kind], k.x1 - 6, ly, { size: 11.5, color: KIND_COLOR[kind], align: 'right', weight: kind === sel ? 800 : 500 });
    ly += 15;
  }
  // the frequency response
  const R = new Plot(g, { x: A.x, y: A.y + kh + 4, w: A.w, h: A.h - kh - 4 }, {
    xr: [0, 2], yr: [0, 1.08], xticks: [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2], yticks: [0, 0.5, 1], title: 'what it passes: H(f), the size of a sine of frequency f after the filter',
    xlabel: 'f (cycles per pixel)', bottom: 24,
  });
  R.frame();
  const H = (kind) => (x) => {
    const at = Math.max(0, Math.min(199.999, x * 100)), i = Math.floor(at), t = at - i;
    return r.response[kind][i] * (1 - t) + r.response[kind][i + 1] * t;
  };
  // what an ideal filter passes, and what the chosen one lets through above Nyquist (aliases) and withholds below it (blur)
  R.curve((x) => (x <= 0.5 ? 1 : 0), 'rgba(139,147,167,0.8)', { width: 1.3, dash: [5, 4], n: 400 });
  R.fill((x) => (x >= 0.5 ? H(sel)(x) : 0), C.red, { n: 400, alpha: 0.28, from: 0.5, to: 2 });
  R.fill((x) => (x <= 0.5 ? H(sel)(x) : 1), C.rate, { n: 200, alpha: 0.2, base: 1, from: 0, to: 0.5 });
  for (const kind of KINDS) {
    if (kind !== sel) R.curve(H(kind), KIND_COLOR[kind], { width: 1.2, n: 400, alpha: 0.35 * ov.dim(kind) });
  }
  R.curve(H(sel), KIND_COLOR[sel], { width: 3, n: 400, alpha: ov.dim(sel) });
  R.vline(0.5, C.nyquist, { dash: [6, 4], width: 1.4, label: 'Nyquist ½', labelColor: C.nyquist });
  R.vline(1, C.faint, { dash: [2, 4] });
  R.vline(1.5, C.faint, { dash: [2, 4] });
  for (const [x, key, label, color] of [[0.5, 'h05', 'at Nyquist', C.nyquist], [1, 'h1', 'at 1', C.ink], [1.5, 'h15', 'at 1½ (an ideal filter: 0)', C.red]]) {
    const v = r[key];
    R.dot(x, v, 4.8, color, { stroke: C.bg, alpha: ov.dim(key, 'nyquist') });
    text(g, `${f(v, 3)}`, R.sx(x) + 8, R.sy(v) - 22, { size: 12, color, weight: 700 });
    text(g, label, R.sx(x) + 8, R.sy(v) - 8, { size: 10.5, color: C.dim });
  }
  text(g, 'red: let through above Nyquist (aliases)', R.x1 - 6, R.y0 + 16, { size: 11.5, color: C.red, align: 'right', weight: 600 });
  text(g, 'blue: withheld below Nyquist (blur)', R.x1 - 6, R.y0 + 32, { size: 11.5, color: C.rate, align: 'right', weight: 600 });
}

function explainCurves(m, r) {
  const sel = m.kind;
  const os = r.overshoot * 100, us = r.undershoot * 100;
  const rings = us > 0.5;
  const leaks = r.h15 > 0.1;
  let text_;
  const tail = `passes ${f(r.h05, 3)} at Nyquist, ${f(r.h15, 3)} at 1½ cycles per pixel; an edge takes ${f(r.rise, 2)} pixel to rise from 10 % to 90 %`;
  if (rings) text_ = `${filterTitle(sel, m.B, m.C, m.sigma)} rings: an edge overshoots by ${f(os, 1)} % and undershoots by ${f(us, 1)} %, a halo beside a bright edge; it ${tail}`;
  else if (leaks) text_ = `${filterTitle(sel, m.B, m.C, m.sigma)} does not ring but leaks: it ${tail}`;
  else text_ = `${filterTitle(sel, m.B, m.C, m.sigma)} does not ring and leaks little, at the cost of blur: it ${tail}`;
  return {
    hud: `${FILTER_NAMES[sel]}: H(½) = {h05|${f(r.h05, 3)}}, H(1½) = {h15|${f(r.h15, 3)}}, rise {rise|${f(r.rise, 2)}} px, overshoot {overshoot|${f(os, 1)}} %`,
    rows: [
      `h(u) at u = 0, ½, 1, 1½: {w0|${f(r.w0, 3)}}, {w05|${f(r.w05, 3)}}, {w1|${f(r.w1, 3)}}, {w15|${f(r.w15, 3)}}`,
      `H(f) at ½ (Nyquist), 1, 1½ cycles per pixel: {h05|${f(r.h05, 3)}}, {h1|${f(r.h1, 3)}}, {h15|${f(r.h15, 3)}}`,
      `blur: an edge rises 10 % to 90 % in {rise|${f(r.rise, 2)}} pixel`,
      `ringing: overshoot {overshoot|${f(os, 1)}} %, undershoot {undershoot|${f(us, 1)}} %`,
    ],
    status: { text: text_, tone: rings || leaks ? 'warn' : 'info' },
    values: [
      ['H at ½', f(r.h05, 3), 'h05'], ['H at 1', f(r.h1, 3), 'h1'], ['H at 1½', f(r.h15, 3), 'h15'], ['rise 10–90 %', `${f(r.rise, 2)} px`, 'rise'],
      ['overshoot', `${f(os, 1)} %`, 'overshoot'], ['undershoot', `${f(us, 1)} %`, 'undershoot'],
    ],
  };
}

function curvesView() {
  return {
    id: 'curves', topic: 'filter', label: 'the filters', group: 'filter', init: FILTER_INIT, presets: FILTER_PRESETS, params: FILTER_PARAMS, ...NO_GRID,
    inputTitle: 'Filter', regions: ['Filter kernels', 'Frequency response', 'Step response'], keys: FILTER_KEYS,
    setup: (ctx) => setupOverlay(ctx, null),
    leave: (ctx) => leaveOverlay(ctx),
    run: runCurves,
    draw(v, m, r, ctx) {
      const ov = ctx.sceneEl ? overlayFor(ctx) : null;
      if (!ov) return;
      ov.painter = (g) => paintCurves(ov, g, m, r);
      ov.repaint();
    },
    explain: explainCurves,
    panelTitle: 'Filter',
    panel: (host, m, r, ctx) => filterPanel(host, m, ctx, 'curves'),
  };
}

// ---------------------------------------------------------------- image: the filter applied to a picture

const N = 32;
const IMAGE_INIT = { ...FILTER_INIT, row: 8, mark: 1, grid: 0 };

/** a 32 x 32 test picture of samples (0 or 1): a block, a disk, a thin staircase line and a patch of one-sample checks */
export function testImage() {
  const img = new Float32Array(N * N);
  const set = (x, y) => { if (x >= 0 && y >= 0 && x < N && y < N) img[y * N + x] = 1; };
  for (let y = 4; y <= 13; y++) for (let x = 4; x <= 13; x++) set(x, y);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if ((x - 23) ** 2 + (y - 9) ** 2 <= 5.2 * 5.2) set(x, y);
  for (let i = 0; i < 11; i++) set(3 + i, 18 + i);
  for (let y = 19; y <= 30; y++) for (let x = 18; x <= 29; x++) if ((x + y) % 2 === 0) set(x, y);
  return img;
}
const SOURCE = testImage();
const rowOf = (row) => Array.from(SOURCE.subarray(row * N, row * N + N));

function runImage(m) {
  const samples = rowOf(m.row);
  const probe = SL.filterTaps(m.kind, 7.3, m.B, m.C, m.sigma);
  const support = SL.filterSupport(m.kind, m.sigma);
  const step = SL.stepResponse(m.kind, m.B, m.C, m.sigma);
  const profile = [];
  let profileMin = Infinity, profileMax = -Infinity;
  for (let i = 0; i <= 640; i++) {
    const x = -0.5 + i * 0.05;
    const v = SL.reconstruct(samples, x, m.kind, m.B, m.C, m.sigma);
    profile.push(v);
    profileMin = Math.min(profileMin, v);
    profileMax = Math.max(profileMax, v);
  }
  const last = probe.first + probe.weights.length - 1;
  return { samples, first: probe.first, last, weights: probe.weights, sum: probe.sum, normalized: probe.normalized, support, ...step, profile, profileMin, profileMax };
}

export function imageLayout(ov) {
  const A = ov.area();
  const scale = Math.max(4, Math.floor(Math.min(A.h - 22, A.w - 290) / N));
  const size = scale * N;
  const img = { x: A.x + 4, y: A.y + 4, w: size, h: size };
  return { img, scale, right: { x: img.x + size + 16, y: A.y, w: A.x + A.w - (img.x + size + 16), h: A.h } };
}

/** the job: smooth the picture along x for every source row, then along y one output row at a time */
function imageJob(ov, m, scale) {
  const S = scale, W = N * S;
  const key = `${m.kind}|${m.B}|${m.C}|${m.sigma}|${m.mark}|${scale}`;
  if (ov.job && ov.job.key === key) return ov.job;
  const cols = [];
  for (let ox = 0; ox < W; ox++) cols.push(SL.filterTaps(m.kind, (ox + 0.5) / S - 0.5, m.B, m.C, m.sigma));
  const across = [];
  for (let sy = 0; sy < N; sy++) {
    const line = new Float32Array(W);
    for (let ox = 0; ox < W; ox++) {
      const t = cols[ox];
      let sum = 0;
      for (let j = 0; j < t.weights.length; j++) {
        const i = t.first + j;
        if (i >= 0 && i < N) sum += SOURCE[sy * N + i] * t.weights[j];
      }
      line[ox] = sum;
    }
    across.push(line);
  }
  const rowFn = (oy, data, w) => {
    const t = cols[oy];     // the rows use the same taps as the columns: the picture is square
    for (let ox = 0; ox < w; ox++) {
      let v = 0;
      for (let j = 0; j < t.weights.length; j++) {
        const i = t.first + j;
        if (i >= 0 && i < N) v += across[i][ox] * t.weights[j];
      }
      let red = 255 * v, green = 255 * v, blue = 255 * v;
      if (m.mark && v > 1.004) { const e = Math.min(1, (v - 1) * 12); red = 255; green = 255 * (1 - 0.75 * e); blue = 255 * (1 - 0.8 * e); }
      else if (m.mark && v < -0.004) { const e = Math.min(1, -v * 12); red = 0; green = 40 * e; blue = 70 + 185 * e; }
      data[4 * ox] = Math.max(0, Math.min(255, red)); data[4 * ox + 1] = Math.max(0, Math.min(255, green)); data[4 * ox + 2] = Math.max(0, Math.min(255, blue)); data[4 * ox + 3] = 255;
    }
  };
  return renderImage(ov, key, W, W, rowFn, () => ov.repaint());
}

function paintImage(ov, g, m, r, job) {
  const L = imageLayout(ov);
  const im = L.img, S = L.scale;
  paintBuffer(ov, g, im);
  if (m.grid) {
    g.strokeStyle = 'rgba(120,130,150,0.35)';
    g.lineWidth = 1;
    for (let i = 1; i < N; i++) {
      g.beginPath(); g.moveTo(im.x + i * S + 0.5, im.y); g.lineTo(im.x + i * S + 0.5, im.y + im.h); g.stroke();
      g.beginPath(); g.moveTo(im.x, im.y + i * S + 0.5); g.lineTo(im.x + im.w, im.y + i * S + 0.5); g.stroke();
    }
  }
  const y = im.y + (m.row + 0.5) * S;
  g.strokeStyle = C.nyquist; g.lineWidth = 2; g.setLineDash([6, 4]);
  g.beginPath(); g.moveTo(im.x, y); g.lineTo(im.x + im.w, y); g.stroke(); g.setLineDash([]);
  text(g, `row ${m.row}`, im.x + 6, y - 5, { size: 11.5, color: C.nyquist, weight: 700 });
  if (!job.done) pill(g, `rendering ${Math.round((job.row / job.h) * 100)} %`, im.x + 8, im.y + 24, C.nyquist);
  text(g, `${N} \u00d7 ${N} samples, each ${S} \u00d7 ${S} px of picture: ${FILTER_NAMES[m.kind]}`, im.x, im.y + im.h + 16, { size: 11, color: C.dim });
  if (m.mark) {
    pill(g, 'above 1', im.x + im.w - 4, im.y + im.h - 8, '#ff9d96', { align: 'right', size: 11 });
    pill(g, 'below 0', im.x + im.w - 70, im.y + im.h - 8, '#8ec2ff', { align: 'right', size: 11 });
  }
  const R = L.right;
  if (R.w < 200) return;
  // the row: the samples and the reconstruction between them
  const ph = Math.round(Math.min(R.h * 0.52, 330));
  const p = new Plot(g, { x: R.x, y: R.y, w: R.w, h: ph }, { xr: [-0.5, 31.5], yr: [-0.35, 1.35], xticks: [0, 8, 16, 24, 31], yticks: [0, 0.5, 1], title: `row ${m.row}: samples and reconstruction`, xlabel: 'sample', bottom: 24 });
  p.frame();
  p.hline(0, C.axis, { dash: [] });
  p.hline(1, C.axis, { dash: [] });
  g.fillStyle = 'rgba(255,90,82,0.14)';
  g.fillRect(p.x0, p.y0, p.x1 - p.x0, p.sy(1) - p.y0);
  g.fillStyle = 'rgba(121,192,255,0.14)';
  g.fillRect(p.x0, p.sy(0), p.x1 - p.x0, p.y1 - p.sy(0));
  p.curve((x) => r.profile[Math.round((x + 0.5) / 0.05)], KIND_COLOR[m.kind], { width: 2.2, n: 640 });
  for (let i = 0; i < N; i++) p.dot(i, r.samples[i], 3, C.white, { alpha: 0.9 });
  text(g, `lowest ${f(r.profileMin, 3)}   highest ${f(r.profileMax, 3)}`, p.x1 - 6, p.y0 + 15, { size: 11.5, color: C.ink, align: 'right', weight: 600 });
  // an ideal edge through the same filter
  const edge = [0, 0, 0, 0, 1, 1, 1, 1];
  const q = new Plot(g, { x: R.x, y: R.y + ph + 6, w: R.w, h: Math.min(R.h - ph - 6, 250) }, { xr: [-3.5, 3.5], yr: [-0.35, 1.35], xticks: [-3, -2, -1, 0, 1, 2, 3], yticks: [0, 1], title: 'one edge through the filter', xlabel: 'pixels from the edge', bottom: 24 });
  q.frame();
  q.hline(0, C.axis, { dash: [] });
  q.hline(1, C.axis, { dash: [] });
  q.curve((x) => SL.reconstruct(edge, x + 4, m.kind, m.B, m.C, m.sigma), KIND_COLOR[m.kind], { width: 2.4, n: 420 });
  for (let i = -4; i < 4; i++) q.dot(i + 0.5, edge[i + 4], 3.5, C.white, { alpha: 0.9 });
  [`rise ${f(r.rise, 2)} px`, `overshoot ${f(r.overshoot * 100, 1)} %`, `undershoot ${f(r.undershoot * 100, 1)} %`].forEach((line, i) => {
    text(g, line, q.x1 - 8, q.y1 - 46 + i * 15, { size: 11.5, color: C.ink, align: 'right', weight: 600 });
  });
}

function imagePick(ctx, x, y) {
  const ov = overlayFor(ctx);
  const L = imageLayout(ov);
  const im = L.img;
  if (y < im.y || y >= im.y + im.h || x < im.x - 20 || x > im.x + im.w + 20) return;
  const m = ctx.state();
  const row = Math.max(0, Math.min(N - 1, Math.floor((y - im.y) / L.scale)));
  if (row === m.row) return;
  m.row = row;
  ctx.refresh();
}

function explainImage(m, r) {
  const os = r.overshoot * 100, us = r.undershoot * 100;
  const rings = us > 0.5;
  const over = r.profileMax > 1.004, under = r.profileMin < -0.004;
  let status;
  if (m.kind === 'box') status = { text: 'box: every sample becomes a block of its own value; the values stay within 0 and 1, and nothing is smoothed between samples', tone: 'info' };
  else if (over || under) status = { text: `${filterTitle(m.kind, m.B, m.C, m.sigma)} rings: on this row the reconstruction reaches ${f(r.profileMax, 3)} and ${f(r.profileMin, 3)}, outside the samples' 0 and 1 (red above 1, blue below 0)`, tone: 'warn' };
  else status = { text: `${filterTitle(m.kind, m.B, m.C, m.sigma)}: on this row the values stay within 0 and 1; an edge takes ${f(r.rise, 2)} pixel to rise from 10 % to 90 %${rings ? ', but it rings at sharper edges' : ''}`, tone: 'ok' };
  return {
    hud: `${FILTER_NAMES[m.kind]}: row ${m.row} runs from {profileMin|${f(r.profileMin, 3)}} to {profileMax|${f(r.profileMax, 3)}}; an edge rises in {rise|${f(r.rise, 2)}} px, overshoot {overshoot|${f(os, 1)}} %`,
    rows: [
      `f̃(x) = Σ f(i) h(x − i), along x and then along y`,
      `taps at x = 7.3: i = {first|${r.first}} to {last|${r.last}} (support {support|${f(r.support, 2)}}), weights {weights|${r.weights.map((w) => f(w, 3)).join(' ')}}, sum {sum|${f(r.sum, 3)}}${r.normalized ? ' (divided by it)' : ''}`,
      `blur: an edge rises 10 % to 90 % in {rise|${f(r.rise, 2)}} pixel; ringing: overshoot {overshoot|${f(os, 1)}} %, undershoot {undershoot|${f(us, 1)}} %`,
    ],
    status,
    values: [
      ['row', String(m.row), null], ['lowest on the row', f(r.profileMin, 3), 'profileMin'], ['highest on the row', f(r.profileMax, 3), 'profileMax'],
      ['rise 10–90 %', `${f(r.rise, 2)} px`, 'rise'], ['overshoot', `${f(os, 1)} %`, 'overshoot'], ['undershoot', `${f(us, 1)} %`, 'undershoot'],
    ],
  };
}

function imagePanel(host, m, r, ctx) {
  filterPanel(host, m, ctx, 'image');
  once(host, 'image-extras', (h) => {
    h.refreshers.push(segmented(h, 'marks', [[1, 'out of range'], [0, 'off']], () => m.mark, (v) => { m.mark = v; ctx.update(); }));
    h.refreshers.push(segmented(h, 'sample grid', [[0, 'off'], [1, 'on']], () => m.grid, (v) => { m.grid = v; ctx.update(); }));
    h.note = el('p', 'lab-note', h, 'Click the picture to pick a row. Red: the reconstruction goes above 1. Blue: below 0.');
  });
  host.refreshers.forEach((s) => s());
}

function imageView() {
  return {
    id: 'image', topic: 'filter', label: 'on a picture', group: 'filter', init: IMAGE_INIT, presets: FILTER_PRESETS, params: FILTER_PARAMS, ...NO_GRID,
    inputTitle: 'Filter', regions: ['Filter taps', 'Step response'], keys: FILTER_KEYS,
    setup: (ctx) => setupOverlay(ctx, { down: (x, y) => imagePick(ctx, x, y), move: (x, y) => imagePick(ctx, x, y) }),
    leave: (ctx) => leaveOverlay(ctx),
    run: runImage,
    draw(v, m, r, ctx) {
      const ov = ctx.sceneEl ? overlayFor(ctx) : null;
      if (!ov) return;
      const L = imageLayout(ov);
      const job = imageJob(ov, m, L.scale);
      ov.painter = (g) => paintImage(ov, g, m, r, job);
      ov.repaint();
    },
    explain: explainImage,
    panelTitle: 'Picture',
    panel: imagePanel,
  };
}

export function filterViews() {
  return [curvesView(), imageView()];
}
