// dims-lab: what changes when a point has many coordinates, one lab view (lib/core/lab.js) with a slider on the dimension d, from 2 to 196,608
// (a 256 x 256 color image). Three facts, drawn as histograms of seeded draws: the length of Gaussian noise piles up at √d with a spread near
// 0.71 for every d; the distance between two random points of the cube [0, 1]^d piles up at √(d/6) with a spread near 0.24; the inner cube
// [−0.9, 0.9]^d holds 0.9^d of the cube [−1, 1]^d. No program and no code card: the arithmetic is in this file, and the slide numbers come from
// it (lib/tests/dims-lab-views.test.mjs).
import { makeLab } from '../core/lab.js';
import { COL } from '../core/lab-viz.js';
import { f, area, splitRow, splitCol, caption, drawChart, text, setupOverlay, leaveOverlay, paintWith } from './image-lab-draw.js';

export const TITLE = 'High dimensions';
export const HUB = 'The length of noise, the distance between random points and the volume near a cube\'s surface, as the number of coordinates grows from 2 to 196,608.';

export const D_MIN = 2;
export const D_MAX = 196608;
export const N_NORMS = 4000;
export const N_PAIRS = 500;
export const EXACT_PAIRS_UP_TO = 4096;

// ---------------------------------------------------------------- arithmetic

/** a seedable generator of uniform numbers in [0, 1) (mulberry32) */
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randn(rng) {
  let u = 0;
  while (u === 0) u = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}
/** a draw from the gamma distribution of shape a ≥ 1 and scale 1 (Marsaglia and Tsang 2000) */
function gamma(a, rng) {
  const dd = a - 1 / 3, c = 1 / Math.sqrt(9 * dd);
  for (;;) {
    let x, v;
    do { x = randn(rng); v = 1 + c * x; } while (v <= 0);
    v = v * v * v;
    const u = rng();
    if (u < 1 - 0.0331 * x * x * x * x) return dd * v;
    if (Math.log(u) < 0.5 * x * x + dd * (1 - v + Math.log(v))) return dd * v;
  }
}

/** log of the gamma function (Lanczos, g = 7), for the small-d branch of normMean */
function logGamma(x) {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  x -= 1;
  let s = c[0];
  for (let i = 1; i < 9; i++) s += c[i] / (x + i);
  const t = x + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(s);
}

/** the mean length of a d-dimensional draw of independent standard normal coordinates: √2 Γ((d + 1)/2) / Γ(d/2), just under √d */
export function normMean(d) {
  const k = d / 2;
  if (k < 40) return Math.SQRT2 * Math.exp(logGamma(k + 0.5) - logGamma(k));
  const ratio = Math.sqrt(k) * (1 - 1 / (8 * k) + 1 / (128 * k * k) + 5 / (1024 * k ** 3) - 21 / (32768 * k ** 4));
  return Math.SQRT2 * ratio;
}
/** the spread (standard deviation) of that length: √(d − mean²), near 1/√2 = 0.71 once d passes about 10 */
export const normSpread = (d) => Math.sqrt(Math.max(0, d - normMean(d) ** 2));

/** lengths of n seeded draws: the squared length of d standard normal coordinates is twice a gamma draw of shape d/2 */
export function sampleNorms(d, n = N_NORMS, seed = 1) {
  const rng = makeRng(seed * 7919 + d);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sqrt(2 * gamma(d / 2, rng));
  return out;
}

/** the mean and spread of the distance between two uniform points of [0, 1]^d: each coordinate adds (u − v)², mean 1/6, variance 7/180 */
export const pairMean = (d) => Math.sqrt(d / 6);
export const pairSpread = (d) => Math.sqrt((7 * d) / 180) / (2 * Math.sqrt(d / 6));

/** distances of n seeded pairs: every coordinate drawn up to EXACT_PAIRS_UP_TO dimensions; past that, the squared distance as a bell curve
 *  with the same mean and spread (a sum of that many independent terms is one, the central limit theorem) */
export function samplePairs(d, n = N_PAIRS, seed = 1) {
  const rng = makeRng(seed * 104729 + d);
  const out = new Float64Array(n);
  const exact = d <= EXACT_PAIRS_UP_TO;
  for (let i = 0; i < n; i++) {
    let s = 0;
    if (exact) for (let j = 0; j < d; j++) { const e = rng() - rng(); s += e * e; }
    else s = Math.max(0, d / 6 + Math.sqrt((7 * d) / 180) * randn(rng));
    out[i] = Math.sqrt(s);
  }
  return { values: out, exact };
}

/** log10 of the share of [−1, 1]^d inside [−0.9, 0.9]^d, which is 0.9^d */
export const innerLog10 = (d) => d * Math.log10(0.9);

const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
/** 10^p as "1.7 × 10⁻⁴⁶", or a plain decimal for p ≥ −3 */
export function sci(p, digits = 2) {
  if (p >= -3) return f(10 ** p, p >= -1 ? 3 : 4);
  let e = Math.floor(p), m = 10 ** (p - e);
  if (Number(m.toFixed(digits - 1)) >= 10) { m /= 10; e += 1; }
  return `${m.toFixed(digits - 1)} × 10${String(e).replace(/[-0-9]/g, (ch) => SUP[ch])}`;
}
export const int = (n) => Math.round(n).toLocaleString('en-US');
export const dOf = (m) => Math.max(D_MIN, Math.min(D_MAX, Math.round(10 ** m.ld)));

function stats(a) {
  let s = 0, mn = Infinity, mx = -Infinity;
  for (const v of a) { s += v; if (v < mn) mn = v; if (v > mx) mx = v; }
  const mean = s / a.length;
  let q = 0;
  for (const v of a) q += (v - mean) ** 2;
  return { mean, sd: Math.sqrt(q / (a.length - 1)), min: mn, max: mx };
}
function histogram(a, lo, hi, bins) {
  const h = new Array(bins).fill(0);
  for (const v of a) { const k = Math.floor(((v - lo) / (hi - lo)) * bins); if (k >= 0 && k < bins) h[k]++; }
  return h;
}

// ---------------------------------------------------------------- the view

const NAMES = {
  2: 'a point in the plane', 3: 'a point in space', 400: 'a 20 × 20 gray digit', 784: 'a 28 × 28 gray digit',
  12288: 'a 64 × 64 color image', 196608: 'a 256 × 256 color image',
};
const PRESET_DS = [2, 3, 10, 400, 784, 1000, 12288, 196608];
const KEYS = { d: COL.gold, norm: COL.cyan, pair: COL.amber, cube: COL.pink };
const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;

export function run(m) {
  const d = dOf(m);
  const norms = sampleNorms(d);
  const pairs = samplePairs(d);
  return {
    d, norms, pairs: pairs.values, exactPairs: pairs.exact,
    normMean: normMean(d), normSpread: normSpread(d), normStats: stats(norms),
    pairMean: pairMean(d), pairSpread: pairSpread(d), pairStats: stats(pairs.values),
    inner: innerLog10(d),
  };
}

function bars(h, lo, hi, color) {
  const w = (hi - lo) / h.length;
  return h.map((c, k) => ({ x0: lo + k * w, x1: lo + (k + 1) * w, y: c, color }));
}
const niceTicks = (lo, hi, n = 5) => {
  const raw = (hi - lo) / n, p = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map((s) => s * p).find((s) => s >= raw);
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push({ v, t: step >= 1 ? int(v) : f(v, step >= 0.1 ? 1 : 2) });
  return out;
};

function paint(g, w, h, ov, m, r) {
  const a = area(ov, w, h, { bottom: ov.top > 10 ? 58 : 66 });
  const [top, bottom] = splitCol(a, 2, 38);
  const [tl, tr] = splitRow(top, 2, 22);
  const [bl, br] = splitRow(bottom, 2, 22);
  const dimFor = (k) => (ov.dim ? ov.dim(k) : 1);
  const cyan = css(KEYS.norm), amber = css(KEYS.pair), pink = css(KEYS.cube), gold = css(KEYS.d);
  const sd = Math.sqrt(r.d);

  // lengths of noise, on the whole scale from the center
  g.globalAlpha = dimFor('norm');
  const hiN = Math.max(1.5 * sd, sd + 4.5);
  const hn = histogram(r.norms, 0, hiN, 60);
  const narrow = w < 640;   // a slide's scene pane: short captions, no 2D sketch
  caption(g, narrow ? 'noise length ‖x‖' : `length of ${int(N_NORMS)} noise draws, from the center (0) out`, tl, { color: cyan });
  drawChart(g, tl, {
    x: [0, hiN], y: [0, Math.max(...hn) * 1.12], xTicks: niceTicks(0, hiN), yTicks: [], xLabel: '‖x‖', bars: bars(hn, 0, hiN, cyan),
    vlines: [{ x: sd, color: gold }], labels: [{ x: sd, y: Math.max(...hn) * 1.04, t: ` √d = ${f(sd, 2)}`, color: gold }],
  });

  // the same lengths, zoomed to ±4 around √d
  const hz = histogram(Array.from(r.norms, (v) => v - sd), -4, 4, 64);
  const peak = Math.max(...hz) * 1.12;
  caption(g, narrow ? '‖x‖ − √d, zoomed' : 'the same lengths minus √d, zoomed to ±4', tr, { color: cyan });
  const binW = 8 / 64, s = r.normSpread, mu = r.normMean - sd;
  drawChart(g, tr, {
    x: [-4, 4], y: [0, peak], xTicks: [-4, -2, 0, 2, 4].map((v) => ({ v, t: f(v, 0) })), yTicks: [], xLabel: '‖x‖ − √d', bars: bars(hz, -4, 4, cyan),
    series: [{ color: '#e7eaf0', width: 1.5, fn: (x) => (N_NORMS * binW * Math.exp(-0.5 * ((x - mu) / s) ** 2)) / (s * Math.sqrt(2 * Math.PI)) }],
    labels: [{ x: -3.9, y: peak * 0.9, t: narrow ? `spread ${f(s, 2)}` : `spread ${f(s, 2)}; curve: a bell with that spread`, color: '#e7eaf0' }],
  });
  g.globalAlpha = 1;

  // distances between random pairs, divided by their typical value
  g.globalAlpha = dimFor('pair');
  const rel = Array.from(r.pairs, (v) => v / r.pairMean);
  const hp = histogram(rel, 0, 2.5, 75);
  caption(g, narrow ? 'pair distance / √(d/6)' : `distance of ${int(N_PAIRS)} random pairs in [0, 1]^d, divided by √(d/6)`, bl, { color: amber });
  drawChart(g, bl, {
    x: [0, 2.5], y: [0, Math.max(...hp) * 1.12], xTicks: [0, 0.5, 1, 1.5, 2, 2.5].map((v) => ({ v, t: f(v, 1) })), yTicks: [], xLabel: 'distance / √(d/6)',
    bars: bars(hp, 0, 2.5, amber), vlines: [{ x: 1, color: gold }],
    labels: [{ x: 1.04, y: Math.max(...hp) * 1.04, t: `√(d/6) = ${f(r.pairMean, 2)}`, color: gold }],
  });
  if (!r.exactPairs && !narrow) text(g, 'past d = 4,096: each squared distance drawn as one bell-curve number', bl.x + 48, bl.y + bl.h - 36, { size: 10.5, color: '#8b93a7' });
  g.globalAlpha = 1;

  // the inner cube
  g.globalAlpha = dimFor('cube');
  caption(g, narrow ? 'inside [−0.9, 0.9]^d: 0.9^d' : 'share of [−1, 1]^d inside [−0.9, 0.9]^d: 0.9^d', br, { color: pink });
  const sq = narrow ? 0 : Math.min(br.h - 30, br.w * 0.3);
  const sx = br.x + 4, sy = br.y + 6;
  if (!narrow) {
    g.fillStyle = '#e7eaf0'; g.fillRect(sx, sy, sq, sq);
    g.fillStyle = pink; g.fillRect(sx + sq * 0.05, sy + sq * 0.05, sq * 0.9, sq * 0.9);
    text(g, 'd = 2: 81 % inside,', sx + sq / 2, sy + sq + 15, { size: 11, align: 'center', color: '#c7cdda', halo: false });
    text(g, '19 % in the white band', sx + sq / 2, sy + sq + 29, { size: 11, align: 'center', color: '#c7cdda', halo: false });
  }
  const chart = narrow ? br : { x: br.x + sq + 16, y: br.y, w: br.w - sq - 16, h: br.h };
  // the share falls past any linear axis (10^−8996 at the top of the slider): plot how many powers of ten it has fallen, on a log axis
  const lx = Math.log10(r.d), depth = (d) => Math.log10(-innerLog10(d));
  const yTicks = [[-1, '0.8'], [0, '0.1'], [1, '10⁻¹⁰'], [2, '10⁻¹⁰⁰'], [3, '10⁻¹⁰⁰⁰'], [4, '10⁻¹⁰⁰⁰⁰']].map(([v, t]) => ({ v, t }));
  const ch = drawChart(g, chart, {
    x: [Math.log10(D_MIN), Math.log10(D_MAX)], y: [4.25, -1.25],
    xTicks: (narrow ? [[Math.log10(2), '2'], [2, '100'], [4, '10k']] : [[Math.log10(2), '2'], [1, '10'], [2, '100'], [3, '1k'], [4, '10k'], [5, '100k']]).map(([v, t]) => ({ v, t })),
    yTicks, xLabel: 'd',
    series: [{ color: pink, width: 2, fn: (x) => depth(10 ** x) }],
    dots: [{ x: lx, y: depth(r.d), color: gold, r: 5 }],
  });
  const lbl = `0.9^d = ${sci(r.inner)}`;
  text(g, lbl, Math.min(ch.X(lx) + 8, ch.px + ch.pw - 6), ch.Y(depth(r.d)) - 9, { size: 12, color: gold, align: ch.X(lx) + 8 > ch.px + ch.pw - 120 ? 'right' : 'left' });
  g.globalAlpha = 1;
}

function statusFor(r) {
  const { d } = r;
  if (d <= 3) return { text: `With ${d} coordinates the draws spread from the center outward and random pairs land at every distance: nothing piles up yet.`, tone: 'info' };
  if (d < 100) return { text: 'The lengths gather around √d and keep a spread near 0.71 while √d grows; the pair distances narrow toward √(d/6).', tone: 'info' };
  return { text: `Every one of the ${int(N_NORMS)} draws lies within a few units of √d = ${f(Math.sqrt(d), 1)}: noise in ${int(d)} dimensions is a thin shell, and the center, where the density is highest, holds none of it. Random pairs are all about equally far apart, and almost all of the cube lies within 0.1 of its surface.`, tone: 'ok' };
}

export function explain(m, r) {
  const n = r.normStats, p = r.pairStats;
  const name = NAMES[r.d] ? ` (${NAMES[r.d]})` : '';
  return {
    hud: `{d|d = ${int(r.d)}}   {norm|‖x‖ = ${f(r.normMean, 2)} ± ${f(r.normSpread, 2)}}   {pair|pairs ${f(r.pairMean, 2)} ± ${f(r.pairSpread, 2)}}   {cube|0.9^d = ${sci(r.inner)}}`,
    rows: [
      `{d|d = ${int(r.d)}}${name}`,
      `{norm|noise}: each coordinate an independent bell-curve draw with mean 0 and spread 1; its length ‖x‖ = √(x₁² + … + x_d²)`,
      `{norm|length}: mean ${f(r.normMean, 2)} (√d = ${f(Math.sqrt(r.d), 2)}), spread ${f(r.normSpread, 2)}, or ${f((100 * r.normSpread) / r.normMean, r.d > 1000 ? 2 : 1)} % of the mean`,
      `{norm|${int(N_NORMS)} draws}: shortest ${f(n.min, 2)}, longest ${f(n.max, 2)}${n.min > 0.5 * Math.sqrt(r.d) ? `; none nearer the center than ${f((100 * n.min) / Math.sqrt(r.d), 0)} % of √d` : ''}`,
      `{pair|pairs in [0, 1]^d}: each coordinate adds (u − v)², 1/6 on average, so the distance is near √(d/6) = ${f(r.pairMean, 2)}, spread about ${f(r.pairSpread, 2)}`,
      `{pair|${int(N_PAIRS)} pairs}: nearest ${f(p.min, 2)}, farthest ${f(p.max, 2)}; nearest / farthest = ${f(p.min / p.max, 2)}`,
      `{cube|inner cube}: each coordinate keeps 0.9 of its range, so the share is 0.9 × 0.9 × … = 0.9^d = ${sci(r.inner)}`,
    ],
    status: statusFor(r),
    values: [['d', int(r.d), 'd'], ['mean length', f(r.normMean, 2), 'norm'], ['length spread', f(r.normSpread, 3), 'norm'], ['pair distance', f(r.pairMean, 2), 'pair'],
      ['pair spread', f(r.pairSpread, 3), 'pair'], ['0.9^d', sci(r.inner), 'cube']],
    fact: r.exactPairs ? undefined : 'Past d = 4,096 each squared pair distance is drawn as one bell-curve number with the same mean and spread, instead of from every coordinate (a sum of that many independent terms is a bell curve).',
  };
}

export function makeViews() {
  return [{
    id: 'highdims', topic: 'dims', label: 'High dimensions', init: { ld: Math.log10(400) }, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    params: [{ id: 'ld', label: 'dimension', min: Math.log10(D_MIN), max: Math.log10(D_MAX), step: 1e-6, play: true, rate: () => 0.8, format: (v) => `d = ${int(Math.max(D_MIN, Math.min(D_MAX, Math.round(10 ** v))))}` }],
    inputTitle: 'Dimension', regions: [], keys: KEYS,
    presets: PRESET_DS.map((d) => ({ label: NAMES[d] ? `${int(d)}: ${NAMES[d]}` : int(d), set: { ld: Math.log10(d) } })),
    setup(ctx) { setupOverlay(ctx, {}); },
    leave: leaveOverlay,
    run,
    draw(v, m, r, ctx) { paintWith(ctx, (g, w, h, ov) => paint(g, w, h, ov, m, r)); },
    explain,
  }];
}
export const TOPICS = [{ id: 'dims', label: 'Dimensions' }];

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A point with d coordinates, for d from 2 to 196,608 (a 256 × 256 color image has 256 × 256 × 3 = 196,608 numbers). The slider runs on a log scale; the presets name the sizes of familiar images.</p>
  <h4>Noise</h4>
  <p>Each coordinate is an independent draw from the bell curve (the normal, or Gaussian, distribution) with mean 0 and spread 1. Top left: the lengths of 4,000 such draws, measured from the center. Top right: the same lengths minus √d, zoomed. The average squared length is d, so the lengths gather at √d, and their spread stays near 0.71 for every d: in many dimensions noise is a thin shell around the center, and no draw lands near the center even though the density is highest there.</p>
  <h4>Distances</h4>
  <p>Bottom left: the distance between two points drawn uniformly in the cube [0, 1]^d, divided by √(d/6). Each coordinate adds (u − v)², 1/6 on average, so every distance is near √(d/6) and the nearest and farthest pairs differ by a few percent: "nearest" carries little information.</p>
  <h4>Volume</h4>
  <p>Bottom right: the share of the cube [−1, 1]^d inside the smaller cube [−0.9, 0.9]^d is 0.9^d, plotted on a log scale; 0.9^1000 = 1.7 × 10⁻⁴⁶. Almost all of a high-dimensional cube lies within 0.1 of its surface.</p>
  <p>Draws are seeded: the same d always shows the same histograms. Hover a colored term in the rail to pick out its panel.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const CSS = `
.reveal section.demo-full [data-demo] canvas.tl-overlay { height: 100% !important; width: 100% !important; }
`;
function injectCss() {
  if (document.getElementById('dims-lab-css')) return;
  const st = document.createElement('style');
  st.id = 'dims-lab-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  return makeLab(container, {
    stage, controls, name: 'dims-lab', topics: TOPICS, views: makeViews(), keys: KEYS, help: HELP_HTML,
    legend: 'drag the dimension slider, or ▶ to sweep it · presets name familiar image sizes',
  });
}
