// volume-lab-views-ray: the views of the first three topics of the volume-lab demo (runtime: lib/core/lab.js): one ray through a volume
// (the march, and the opacity of a step), how the samples are chosen (the count against a reference, a thin surface, coarse to fine),
// and a density that sharpens into a surface (a bump, and a signed distance). Each view calls the program's own functions
// (lib/programs/volume-lab/webgl/volumelab.js), so the numbers beside the code are that code's output.
import * as VL from '../programs/volume-lab/webgl/volumelab.js';
import { COL } from '../core/lab-viz.js';
import { C, text, rgbCss, el, btn, once, segmented, setupOverlay, leaveOverlay, overlayFor, legendRow } from './volume-lab-draw.js';
import { rayPlots, pixelColumn, errorPlot, cdfPlot, offsetPlot, niceMax } from './volume-lab-plots.js';
import {
  f, f3, sub, NEAR, FAR, BLACK, WHITE, GRAY, RED, BLUE, defaultBumps, countBumps, lectureBumps, LECTURE_US, bumpsOf, fieldOf, background, yMaxOf, marchOf,
  referenceOf, convergenceOf, cached, colorDistance, sampleRows, sumRows, backgroundStatus, weightChart, samplerControls, tableHtml, bindTable,
  bumpHandlers, handleList, TRIALS, COUNTS, addBump, removeBump,
} from './volume-lab-kit.js';

const HOME = { eye: [0, 2, 6], target: [0, 0, 0] };

/** hand the painter to the overlay; in a node test there is no scene to paint on */
function paintOverlay(ctx, painter) {
  if (!ctx.sceneEl) return;
  const ov = overlayFor(ctx);
  ov.painter = (g) => painter(g, ov.area(), ov);
  ov.repaint();
}
const pct = (x, d = 1) => `${f(100 * x, d)} %`;

/** the column of two swatches that compares an estimate with the reference */
function compareColumn(g, rect, est, ref) {
  const sw = Math.min(rect.w - 10, 120);
  const x = rect.x + 6;
  let y = rect.y + 18;
  for (const [label, c] of [['this estimate', est], ['finely sampled reference', ref]]) {
    text(g, label, x, y - 6, { size: 11.5, color: C.ink, weight: 600, halo: false });
    g.fillStyle = rgbCss(c);
    g.fillRect(x, y, sw, sw * 0.5);
    g.strokeStyle = C.axis;
    g.strokeRect(x + 0.5, y + 0.5, sw, sw * 0.5);
    y += sw * 0.5 + 14;
    text(g, f3(c, 3), x, y, { size: 11, color: C.dim, halo: false });
    y += 26;
  }
  text(g, `‖C − C_ref‖ = ${f(colorDistance(est, ref), 4)}`, x, y, { size: 11.5, color: C.w, weight: 600, halo: false });
}

export function makeRayViews() {
  // ============================================================ One ray: the march
  const lectureState = (sigma4 = 8) => (m) => Object.assign(m, { bumps: lectureBumps(sigma4), n: 5, u: 1, mode: 'regular', bg: 'black', sel: -1, yMax: null, grad: false });
  const march = {
    id: 'ray.march', group: 'field', topic: 'ray', label: 'The march', inputTitle: 'Samples', home: HOME, grid: 'none', axes: false,
    init: { bumps: null, n: 5, u: 0.5, mode: 'regular', bg: 'black', seed: 1, sel: -1, yMax: null, active: null, grad: false, channel: 0 },
    params: [{ id: 'n', label: 'N samples', min: 1, max: 64, step: 1 }, { id: 'u', label: 'offset u', min: 0, max: 1, step: 0.05 }],
    panelTitle: 'The samples',
    presets: [
      { label: 'the lecture\'s ray', run: lectureState(8) },
      { label: 'sample 4 at σ = 80', run: lectureState(80) },
      { label: 'over white', run: (m) => { lectureState(8)(m); m.bg = 'white'; } },
      { label: 'smooth bumps, N = 8', run: (m) => Object.assign(m, { bumps: defaultBumps(), n: 8, u: 0.5, mode: 'regular', bg: 'black', sel: -1, yMax: null, grad: false }) },
      { label: 'the same, N = 64', run: (m) => Object.assign(m, { bumps: defaultBumps(), n: 64, u: 0.5, mode: 'regular', bg: 'black', sel: -1, yMax: null, grad: false }) },
    ],
    get regions() { return ['Samples along the ray', 'Compositing one ray', ...(this.showGrad ? ['The gradient through the march'] : [])]; },
    showGrad: false,
    enter(m) { bumpsOf(m); },
    setup(ctx) { this.ctx = ctx; setupOverlay(ctx, bumpHandlers(this, ctx)); },
    leave(ctx) { leaveOverlay(ctx); this.drag = null; this.hoverKey = null; },
    edited(m) { m.n = Math.max(1, Math.round(m.n)); },
    run(m) {
      const field = fieldOf(m);
      const n = Math.max(1, Math.round(m.n));
      this.showGrad = !!m.grad;
      const r = marchOf(field, m, n, { yMax: yMaxOf(m) });
      const grad = m.grad ? VL.colorGradient(r.sigmas, r.colors, r.deltas, m.channel) : null;
      return { ...r, ...(grad ? { dSigma: grad.dSigma, dColor: grad.dColor } : {}), grad };
    },
    draw(v, m, r, ctx) { paintOverlay(ctx, (g, area, ov) => this.paint(g, area, m, r, ov)); },
    paint(g, area, m, r, ov) {
      this.layout = rayPlots(g, area, { ray: r, dense: r.dense, near: NEAR, far: FAR, yMax: r.yMax, selected: r.selected, side: 176, handles: handleList(this, m), dim: (...k) => (ov ? ov.dim(...k) : 1), depthMark: { depth: r.depth, spread: r.spread } });
      pixelColumn(g, { x: area.x + area.w - 176, y: area.y, w: 176, h: area.h }, r, r.bgc);
    },
    explain(m, r) {
      const channel = ['red', 'green', 'blue'][m.channel ?? 0];
      const gradRows = r.grad && r.selected >= 0 ? [
        `{grad|∂C_${channel}/∂c${sub(r.selected + 1)}} = w${sub(r.selected + 1)} = ${f(r.grad.dColor[r.selected], 3)}; {grad|∂C_${channel}/∂σ${sub(r.selected + 1)}} = ${r.grad.dSigma[r.selected] >= 0 ? '+' : ''}${f(r.grad.dSigma[r.selected], 3)}: ${r.grad.dSigma[r.selected] >= 0 ? `thicker here, more ${channel} in the pixel` : `thicker here hides what is behind: less ${channel}`}`,
      ] : [];
      const err = colorDistance(r.color, r.reference.color);
      return {
        hud: `{C|C = Σ wᵢcᵢ = ${f3(r.color, 3)}}, {w|Σ w = ${f(r.weightSum, 3)}} = 1 − {T|T_end ${f(r.tEnd, 3)}}`,
        rows: [
          ...sampleRows(r, r.selected),
          ...sumRows(r, r.bgc),
          `finely sampled reference (${VL.REFERENCE_N} samples): {ref|C_ref = ${f3(r.reference.color, 3)}}, T_end ${f(r.reference.tEnd, 3)}; this estimate is {error|${f(err, 4)}} away`,
          ...gradRows,
        ],
        status: backgroundStatus(r),
        chart: weightChart(r),
        values: [['N', String(r.n)], ['step δ', f(r.binWidth, 3), 'alpha'], ['Σ w', f(r.weightSum, 3), 'w'], ['T_end', f(r.tEnd, 3), 'T'], ['depth', r.weightSum > 1e-6 ? f(r.depth, 3) : 'none', 'depth'], ['error', f(err, 4), 'error']],
        fact: 'Drag a bump by its circle (center and height) or its square (width). Click a bar or a row to follow one sample through the formulas. The dashed boxes show what the quadrature assumes: each sample\'s density fills its whole step.',
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'march', (h) => {
        samplerControls(h, ctx, { bumps: true, gradient: true });
        el('div', 'vl-tablebox', h);
      });
      const box = host.querySelector('.vl-tablebox');
      bindTable(box, ctx);
      box.innerHTML = tableHtml(r, { grad: r.grad, channelName: ['red', 'green', 'blue'][m.channel ?? 0] });
    },
  };

  // ============================================================ One ray: opacity and the step
  const slab = {
    id: 'ray.slab', topic: 'ray', label: 'Opacity and step', inputTitle: 'A constant density', home: HOME, grid: 'none', axes: false,
    init: { sigma: 4, n: 5, pieces: 2, sel: -1 },
    params: [{ id: 'sigma', label: 'density σ', min: 0.5, max: 12, step: 0.5 }, { id: 'n', label: 'N slabs', min: 1, max: 40, step: 1 }, { id: 'pieces', label: 'split into', min: 2, max: 8, step: 1 }],
    panelTitle: 'One slab, split in pieces',
    presets: [
      { label: 'σ = 4, δ = 0.2', set: { sigma: 4, n: 5, pieces: 2 } },
      { label: 'half the step: δ = 0.1', set: { sigma: 4, n: 10, pieces: 2 } },
      { label: 'one slab, δ = 1', set: { sigma: 4, n: 1, pieces: 2 } },
      { label: '40 slabs', set: { sigma: 4, n: 40, pieces: 2 } },
    ],
    regions: ['Opacity and step', 'Compositing one ray'],
    setup(ctx) { setupOverlay(ctx, { hover() {} }); },
    leave(ctx) { leaveOverlay(ctx); },
    edited(m) { m.n = Math.max(1, Math.round(m.n)); m.pieces = Math.max(2, Math.round(m.pieces)); },
    run(m) {
      const n = Math.max(1, Math.round(m.n));
      const field = [VL.BOX, 0.5, 0.5, m.sigma, ...RED];
      const r = marchOf(field, { mode: 'regular', u: 0.5, bg: 'black' }, n, { yMax: Math.max(2, niceMax(m.sigma * 1.2, 2)) });
      const split = VL.splitSlab(m.sigma, r.binWidth, Math.round(m.pieces));
      let worst = 0;
      r.transmittances.forEach((T, i) => { worst = Math.max(worst, Math.abs(T - Math.exp(-m.sigma * r.edges[i]))); });
      return { ...r, ...split, worst, selected: -1, pieces: Math.round(m.pieces) };
    },
    draw(v, m, r, ctx) { paintOverlay(ctx, (g, area, ov) => this.paint(g, area, m, r, ov)); },
    paint(g, area, m, r, ov) {
      rayPlots(g, area, { ray: r, dense: r.dense, near: NEAR, far: FAR, yMax: r.yMax, selected: -1, side: 176, dim: (...k) => (ov ? ov.dim(...k) : 1), showReference: false, TCompare: (s) => Math.exp(-m.sigma * s), TLegend: [['exp(−σ s)', C.alpha], ['T of the samples', C.T]], wTitle: 'weight w = T · α of each slab', sigmaTitle: 'density σ (constant) and the N slabs' });
      pixelColumn(g, { x: area.x + area.w - 176, y: area.y, w: 176, h: area.h }, r, r.bgc);
    },
    explain(m, r) {
      return {
        hud: `{alpha|α = 1 − e^(−${f(m.sigma, 1)} × ${f(r.binWidth, 3)}) = ${f(r.alpha, 3)}} per slab, {T|T_end = e^(−${f(m.sigma, 1)}) = ${f(r.tEnd, 3)}}`,
        rows: [
          `{alpha|α} = 1 − e^(−σδ) = 1 − e^(−${f(m.sigma, 2)} × ${f(r.binWidth, 3)}) = {alpha|${f(r.alpha, 4)}}`,
          `split into ${r.pieces} pieces of ${f(r.binWidth / r.pieces, 4)}: α = 1 − e^(−${f(m.sigma, 2)} × ${f(r.binWidth / r.pieces, 4)}) = {alpha|${f(r.pieceAlpha, 4)}} each`,
          `${r.pieces} pieces together block 1 − (1 − ${f(r.pieceAlpha, 4)})^${r.pieces} = {alpha|${f(r.combined, 4)}}: the same as one slab, ${f(r.alpha, 4)}`,
          `{T|T} after one slab: e^(−σδ) = ${f(r.transmittance, 4)}; after all ${r.n}: e^(−σ · 1) = {T|${f(r.tEnd, 4)}}, for any N`,
          `largest gap between a sample's Tᵢ and e^(−σ s) over the ${r.n} slabs: {error|${r.worst.toExponential(1)}}`,
          ...sumRows(r, r.bgc).slice(1, 3),
        ],
        status: { text: r.n === 1 ? 'one slab: its opacity is the whole ray\'s' : `${r.n} slabs of ${f(r.binWidth, 3)}: each blocks ${pct(r.alpha, 1)}, together ${pct(1 - r.tEnd, 1)}; the opacity of a slab depends on its thickness, the ray's does not`, tone: 'ok' },
        chart: weightChart(r),
        values: [['δ', f(r.binWidth, 3)], ['α', f(r.alpha, 4), 'alpha'], ['α of half', f(r.pieceAlpha, 4), 'alpha'], ['two halves', f(r.combined, 4), 'alpha'], ['T_end', f(r.tEnd, 4), 'T'], ['Σ w', f(r.weightSum, 4), 'w']],
        fact: 'The stairs of T land on the curve exp(−σ s) at every sample, whatever N is: the discrete formula is exact when the density is constant inside each step. A formula with α = σ would block more as N grows.',
      };
    },
  };

  // ============================================================ Samples: the count against the reference
  const count = {
    id: 'samples.count', group: 'field', topic: 'samples', label: 'N and the reference', inputTitle: 'Samples', home: HOME, grid: 'none', axes: false,
    init: { bumps: null, n: 8, u: 0.5, mode: 'regular', bg: 'black', seed: 1, sel: -1, yMax: null, active: null },
    params: [{ id: 'n', label: 'N samples', min: 1, max: 256, step: 1 }, { id: 'u', label: 'offset u', min: 0, max: 1, step: 0.05 }],
    panelTitle: 'The sampler',
    presets: [
      { label: 'N = 8, middle of each step', run: (m) => Object.assign(m, { bumps: countBumps(), n: 8, u: 0.5, mode: 'regular', yMax: null, sel: -1 }) },
      { label: 'N = 8, start of each step', run: (m) => Object.assign(m, { bumps: countBumps(), n: 8, u: 0, mode: 'regular', yMax: null, sel: -1 }) },
      { label: 'N = 8, stratified', run: (m) => Object.assign(m, { bumps: countBumps(), n: 8, mode: 'stratified', yMax: null, sel: -1 }) },
      { label: 'N = 64', run: (m) => Object.assign(m, { bumps: countBumps(), n: 64, u: 0.5, mode: 'regular', yMax: null, sel: -1 }) },
    ],
    regions: ['Samples along the ray', 'The estimate against the reference'],
    enter(m) { bumpsOf(m); },
    setup(ctx) { setupOverlay(ctx, bumpHandlers(this, ctx)); },
    leave(ctx) { leaveOverlay(ctx); this.drag = null; this.hoverKey = null; },
    edited(m) { m.n = Math.max(1, Math.round(m.n)); },
    run(m) {
      const field = fieldOf(m);
      const n = Math.max(1, Math.round(m.n));
      const r = marchOf(field, { ...m, bg: 'black' }, n, { yMax: yMaxOf(m) });
      const trials = m.mode === 'stratified' ? TRIALS : 1;
      const e = VL.rayError(field, NEAR, FAR, n, m.mode, m.u, trials, 3 + m.seed);
      const mid = convergenceOf(field, 'regular', 0.5), left = convergenceOf(field, 'regular', 0), strat = convergenceOf(field, 'stratified', 0);
      const custom = m.mode === 'regular' && m.u !== 0.5 && m.u !== 0 ? convergenceOf(field, 'regular', m.u) : null;
      const mine = m.mode === 'stratified' ? strat : custom ?? (m.u === 0 ? left : mid);
      const mark = { n, error: e.error, color: m.mode === 'stratified' ? C.color : m.u === 0 ? C.alpha : custom ? C.purple : C.T };
      return { ...r, error: e.error, tEndError: e.tEndError, referenceTEnd: e.referenceTEnd, mid, left, strat, custom, mine, trials, mark };
    },
    draw(v, m, r, ctx) { paintOverlay(ctx, (g, area, ov) => this.paint(g, area, m, r, ov)); },
    paint(g, area, m, r, ov) {
      const compact = area.h < 260;
      const series = this.series(m, r);
      if (compact) { this.layout = {}; errorPlot(g, area, { series, current: r.n, marks: [r.mark] }); return; }
      const top = { x: area.x, y: area.y, w: area.w, h: area.h * 0.36 };
      this.layout = rayPlots(g, top, { ray: r, dense: r.dense, near: NEAR, far: FAR, yMax: r.yMax, selected: -1, side: 176, panels: ['sigma'], handles: handleList(this, m), dim: (...k) => (ov ? ov.dim(...k) : 1), steps: r.n <= 64, sigmaTitle: 'density σ(s) and the N samples' });
      compareColumn(g, { x: area.x + area.w - 176, y: area.y, w: 176, h: top.h }, r.color, r.reference.color);
      errorPlot(g, { x: area.x, y: area.y + area.h * 0.38, w: area.w, h: area.h * 0.62 }, { series, current: r.n, marks: [r.mark] });
    },
    series(m, r) {
      const series = [
        { name: 'middle of each step', color: C.T, counts: COUNTS, errors: r.mid.errors, slope: r.mid.slope },
        { name: 'start of each step', color: C.alpha, counts: COUNTS, errors: r.left.errors, slope: r.left.slope },
        { name: 'stratified', color: C.color, counts: COUNTS, errors: r.strat.errors, slope: r.strat.slope },
      ];
      if (r.custom) series.push({ name: `offset ${f(m.u, 2)}`, color: C.purple, counts: COUNTS, errors: r.custom.errors, slope: r.custom.slope, dash: [4, 3] });
      return series;
    },
    explain(m, r) {
      const rate = r.mine.slope;
      const sampler = m.mode === 'stratified' ? `stratified (root mean square over ${r.trials} draws)` : `regular, offset ${f(m.u, 2)}`;
      return {
        hud: `N = ${r.n}, ${m.mode === 'stratified' ? 'stratified' : `offset ${f(m.u, 2)}`}: {error|‖C − C_ref‖ = ${f(r.error, 4)}}`,
        rows: [
          `{error|‖C − C_ref‖} = ‖${f3(r.color, 3)} − ${f3(r.reference.color, 3)}‖ = {error|${f(colorDistance(r.color, r.reference.color), 4)}} for this draw`,
          `${sampler}, N = ${r.n}: error {error|${f(r.error, 4)}}${m.mode === 'stratified' ? ' (the number plotted)' : ''}; T_end error ${f(r.tEndError, 4)}`,
          `slope of ln(error) against ln N from N = 16 to 256: middle of the step {T|${f(r.mid.slope, 2)}}, start of the step {alpha|${f(r.left.slope, 2)}}, stratified {C|${f(r.strat.slope, 2)}}`,
          `doubling N multiplies the error of this sampler by 2^${f(rate, 2)} = ${f(Math.pow(2, rate), 2)}`,
          `the reference is the same ray with ${VL.REFERENCE_N} regular samples, T_end ${f(r.referenceTEnd, 4)}`,
        ],
        status: m.mode === 'stratified' ? { text: `stratified: error falls as N^${f(rate, 2)}, between the two regular samplers`, tone: 'ok' }
          : m.u === 0.5 ? { text: `middle of each step (midpoint rule): error falls as N^${f(rate, 2)}`, tone: 'ok' }
            : { text: `offset ${f(m.u, 2)} puts every sample off the middle: error falls only as N^${f(rate, 2)}`, tone: 'warn' },
        values: [['N', String(r.n)], ['error', f(r.error, 4), 'error'], ['middle slope', f(r.mid.slope, 2), 'T'], ['start slope', f(r.left.slope, 2), 'alpha'], ['stratified slope', f(r.strat.slope, 2), 'C'], ['δ', f(r.binWidth, 4)]],
        fact: 'A regular sampler puts every sample at the same place in its step, so its error has a sign. At the middle the error is (δ²/24)(σ′(far) − σ′(near)) for a smooth density, so N⁻², or faster when the density is flat at both ends of the ray. A stratified sampler jitters each sample inside its step: no depth is skipped for good, at the price of noise. Drag a bump and the curves are measured again.',
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'count', (h) => { samplerControls(h, ctx, { bumps: true, background: false }); });
    },
  };

  // ============================================================ Samples: a thin surface
  const THIN_SIGMA = 50;
  const thinField = (m) => [VL.BOX, 0.61 + m.thick100 / 200, m.thick100 / 200, THIN_SIGMA, ...RED];
  const thin = {
    id: 'samples.thin', topic: 'samples', label: 'A thin surface', inputTitle: 'Samples', home: HOME, grid: 'none', axes: false,
    init: { n: 5, u: 0, thick100: 2, mode: 'regular', seed: 1, bg: 'black', sel: -1 },
    params: [{ id: 'n', label: 'N samples', min: 1, max: 200, step: 1 }, { id: 'u', label: 'offset u', min: 0, max: 1, step: 0.01 }, { id: 'thick100', label: 'thickness (×0.01)', min: 0.5, max: 10, step: 0.5 }],
    panelTitle: 'The sampler',
    presets: [
      { label: 'samples at 0.0, 0.2, ...', set: { n: 5, u: 0, thick100: 2, mode: 'regular' } },
      { label: 'shifted by 0.02', set: { n: 5, u: 0.1, thick100: 2, mode: 'regular' } },
      { label: 'δ = 0.02', set: { n: 50, u: 0.5, thick100: 2, mode: 'regular' } },
      { label: 'stratified, N = 5', set: { n: 5, u: 0.5, thick100: 2, mode: 'stratified' } },
    ],
    regions: ['Samples along the ray', 'Compositing one ray'],
    setup(ctx) { setupOverlay(ctx, { hover() {} }); },
    leave(ctx) { leaveOverlay(ctx); },
    edited(m) { m.n = Math.max(1, Math.round(m.n)); },
    run(m) {
      const field = thinField(m);
      const n = Math.max(1, Math.round(m.n));
      const thickness = m.thick100 / 100;
      const r = marchOf(field, m, n, { yMax: 60 });
      const truth = 1 - Math.exp(-THIN_SIGMA * thickness);
      const lo = 0.61, hi = 0.61 + thickness;
      const inside = r.depths.filter((s) => s > lo + VL.EDGE && s <= hi + VL.EDGE).length;
      const scan = cached(`thin|${n}|${m.thick100}`, () => {
        const pts = [];
        for (let k = 0; k <= 200; k++) pts.push([k / 200, 1 - VL.renderRay(field, NEAR, FAR, n, 'regular', k / 200, VL.makeRng(1), BLACK).tEnd]);
        return pts;
      });
      const hitShare = scan.filter(([, o]) => o > 1e-9).length / scan.length;
      const opacity = 1 - r.tEnd;
      return { ...r, thickness, truth, inside, scan, hitShare, opacity, lo, hi };
    },
    draw(v, m, r, ctx) { paintOverlay(ctx, (g, area, ov) => this.paint(g, area, m, r, ov)); },
    paint(g, area, m, r, ov) {
      const compact = area.h < 260;
      const top = { x: area.x, y: area.y, w: area.w, h: area.h * (compact ? 0.45 : 0.58) };
      const leafT = (s) => Math.exp(-THIN_SIGMA * Math.min(r.thickness, Math.max(0, s - r.lo)));
      rayPlots(g, top, { ray: r, dense: r.dense, near: NEAR, far: FAR, yMax: 60, selected: -1, side: 176, panels: ['sigma', 'T'], dim: (...k) => (ov ? ov.dim(...k) : 1), TCompare: leafT, TLegend: [['true T', C.alpha], ['T of the samples', C.T]], sigmaTitle: 'a leaf of density 50 and the samples that look for it' });
      pixelColumn(g, { x: area.x + area.w - 176, y: area.y, w: 176, h: top.h }, r, r.bgc);
      offsetPlot(g, { x: area.x, y: area.y + area.h * (compact ? 0.47 : 0.6), w: area.w - 176, h: area.h * (compact ? 0.53 : 0.4) }, { points: r.scan, truth: r.truth, u: m.u, current: r.opacity });
    },
    explain(m, r) {
      const missed = r.inside === 0;
      const rendered = r.opacity;
      const kind = missed ? 'invisible' : rendered > r.truth * 1.05 ? 'overstated' : rendered < r.truth * 0.95 ? 'understated' : 'about right';
      return {
        hud: `{alpha|opacity ${f(rendered, 3)}} against {phi|true ${f(r.truth, 3)}}: ${kind}`,
        rows: [
          `true opacity 1 − e^(−σ t) = 1 − e^(−${f(THIN_SIGMA, 0)} × ${f(r.thickness, 3)}) = {phi|${f(r.truth, 3)}}, a leaf on [${f(r.lo, 3)}, ${f(r.hi, 3)})`,
          `${r.n} samples of step δ = ${f(r.binWidth, 4)} at s = ${r.depths.slice(0, 5).map((s) => f(s, 3)).join(', ')}${r.n > 5 ? ', …' : ''}`,
          missed ? '{alpha|0 samples} fall inside the leaf: every σᵢ is 0, so the opacity is {alpha|0}'
            : `{alpha|${r.inside} sample${r.inside > 1 ? 's' : ''}} inside the leaf, each assumed to fill its whole step: 1 − e^(−${f(THIN_SIGMA, 0)} × ${f(r.inside * r.binWidth, 3)}) = {alpha|${f(rendered, 3)}}`,
          `over the offsets u from 0 to 1 at this N, the leaf is hit by {T|${pct(r.hitShare, 0)}} of them: the other ${pct(1 - r.hitShare, 0)} render it invisible`,
          `the opacity is correct only when δ is about as small as the thickness: δ = ${f(r.binWidth, 3)}, t = ${f(r.thickness, 3)}`,
        ],
        status: missed ? { text: 'the leaf falls between two samples: it is not rendered at all', tone: 'bad' }
          : kind === 'overstated' ? { text: `a sample lands in the leaf and its step is taken as leaf: opacity ${f(rendered, 3)}, not ${f(r.truth, 3)}`, tone: 'warn' }
            : kind === 'understated' ? { text: `the leaf is hit but less than it should be: ${f(rendered, 3)} against ${f(r.truth, 3)}`, tone: 'warn' }
              : { text: `the step is as fine as the leaf: opacity ${f(rendered, 3)}, true ${f(r.truth, 3)}`, tone: 'ok' },
        values: [['N', String(r.n)], ['δ', f(r.binWidth, 4)], ['inside', String(r.inside), 'alpha'], ['rendered', f(rendered, 3), 'alpha'], ['true', f(r.truth, 3), 'phi'], ['hit by', pct(r.hitShare, 0), 'T']],
        fact: 'Coarse sampling does not blur a thin surface: it misses it or overstates it, depending on where the samples fall. With a random offset for each ray the same leaf flickers from ray to ray.',
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'thin', (h) => { samplerControls(h, ctx, { background: false }); });
    },
  };

  // ============================================================ Samples: coarse to fine
  const hier = {
    id: 'samples.hier', group: 'field', topic: 'samples', label: 'Coarse to fine', inputTitle: 'Coarse and fine samples', home: HOME, grid: 'none', axes: false,
    init: { bumps: null, n: 8, u: 0.5, mode: 'regular', bg: 'black', seed: 1, sel: -1, yMax: null, active: null, nc: 8, nf: 16, fm: 'stratified' },
    params: [{ id: 'nc', label: 'coarse N', min: 2, max: 32, step: 1 }, { id: 'nf', label: 'fine N', min: 1, max: 64, step: 1 }, { id: 'u', label: 'offset u', min: 0, max: 1, step: 0.05 }],
    panelTitle: 'The fine samples',
    presets: [
      { label: 'the lecture: 5 coarse, 5 fine', run: (m) => Object.assign(m, { bumps: lectureBumps(8), nc: 5, nf: 5, u: 1, fm: 'lecture', yMax: null, sel: -1 }) },
      { label: 'smooth bumps, 8 + 16', run: (m) => Object.assign(m, { bumps: defaultBumps(), nc: 8, nf: 16, u: 0.5, fm: 'stratified', yMax: null, sel: -1 }) },
      { label: 'a narrow bump, 16 + 48', run: (m) => Object.assign(m, { bumps: [[VL.GAUSSIAN, 0.62, 0.015, 40, ...RED], [VL.GAUSSIAN, 0.25, 0.1, 0.8, ...GRAY]], nc: 16, nf: 48, u: 0.5, fm: 'stratified', yMax: null, sel: -1 }) },
    ],
    regions: ['Coarse to fine: the inverse transform', 'Coarse and fine samples together'],
    enter(m) { bumpsOf(m); },
    setup(ctx) { setupOverlay(ctx, bumpHandlers(this, ctx)); },
    leave(ctx) { leaveOverlay(ctx); this.drag = null; this.hoverKey = null; },
    edited(m) { m.nc = Math.max(2, Math.round(m.nc)); m.nf = Math.max(1, Math.round(m.nf)); },
    run(m) {
      const field = fieldOf(m);
      const nc = Math.max(2, Math.round(m.nc)), nf = Math.max(1, Math.round(m.nf));
      const rng = VL.makeRng((m.seed ?? 1) * 104729);
      const us = m.fm === 'lecture' && nf === LECTURE_US.length ? LECTURE_US : VL.fineUniforms(nf, m.fm === 'lecture' ? 'regular' : m.fm, rng);
      const h = VL.hierarchicalRay(field, NEAR, FAR, nc, us, m.u, BLACK);
      const uniform = VL.renderRay(field, NEAR, FAR, nc + nf, 'regular', m.u, VL.makeRng(1), BLACK);
      const reference = referenceOf(field);
      const dense = cached(`dense|${field.join(',')}`, () => VL.renderRay(field, NEAR, FAR, 320, 'regular', 0.5, VL.makeRng(1), BLACK));
      const err = (x) => colorDistance(x.color, reference.color);
      const derr = (x) => Math.abs(x.depth - reference.depth);
      const merged = h.merged;
      return {
        ...h.coarse, n: nc, nf, binWidth: h.coarse.deltas[0], dense, reference, selected: -1, yMax: yMaxOf(m), bgc: BLACK,
        pdf: h.pdf, cdf: h.cdf, bins: h.bins, depths: h.fineDepths, fineDepths: h.fineDepths, us, mergedDepths: merged.depths, mergedDeltas: merged.deltas, deltas: merged.deltas,
        h, uniform, err: { coarse: err(h.coarse), merged: err(merged), uniform: err(uniform) }, derr: { coarse: derr(h.coarse), merged: derr(merged), uniform: derr(uniform) },
        coarseRay: h.coarse,
      };
    },
    draw(v, m, r, ctx) { paintOverlay(ctx, (g, area, ov) => this.paint(g, area, m, r, ov)); },
    paint(g, area, m, r, ov) {
      const compact = area.h < 260;
      const top = { x: area.x, y: area.y, w: area.w, h: area.h * (compact ? 0.5 : 0.64) };
      const view = this;
      const ray = { ...r.coarseRay };
      this.layout = rayPlots(g, top, {
        ray, dense: r.dense, near: NEAR, far: FAR, yMax: r.yMax, selected: -1, side: 176, panels: compact ? ['sigma'] : ['sigma', 'w'], handles: handleList(this, m), dim: (...k) => (ov ? ov.dim(...k) : 1),
        sigmaTitle: 'density σ(s): coarse samples (blue), fine samples (pink) from the weights', wTitle: 'weights of the coarse pass: their normalized sum is a distribution',
        sigmaExtras: [(p, gg) => {
          r.fineDepths.forEach((s) => { gg.beginPath(); gg.moveTo(p.sx(s), p.y1); gg.lineTo(p.sx(s) - 4, p.y1 - 9); gg.lineTo(p.sx(s) + 4, p.y1 - 9); gg.closePath(); gg.fillStyle = C.fine; gg.globalAlpha = 0.9 * (ov ? ov.dim('fine') : 1); gg.fill(); gg.globalAlpha = 1; });
          ray.depths.forEach((s) => { gg.beginPath(); gg.arc(p.sx(s), p.y1 - 4, 3, 0, Math.PI * 2); gg.fillStyle = C.coarse; gg.globalAlpha = ov ? ov.dim('coarse') : 1; gg.fill(); gg.globalAlpha = 1; });
        }],
      });
      cdfPlot(g, { x: area.x, y: area.y + area.h * (compact ? 0.52 : 0.66), w: area.w - 176, h: area.h * (compact ? 0.48 : 0.34) }, { near: NEAR, far: FAR, edges: ray.edges, cdf: r.cdf, us: r.us, fineDepths: r.fineDepths });
      const col = { x: area.x + area.w - 176, y: area.y + area.h * (compact ? 0.52 : 0.66), w: 176 };
      const rows = [['coarse only', r.err.coarse, C.coarse], [`${r.n + r.nf} regular`, r.err.uniform, C.dim], ['coarse + fine', r.err.merged, C.fine]];
      text(g, 'color error', col.x + 6, col.y + 14, { size: 11.5, color: C.ink, weight: 600, halo: false });
      rows.forEach(([label, e, color], i) => text(g, `${label}: ${f(e, 4)}`, col.x + 6, col.y + 34 + i * 17, { size: 11.5, color, weight: 600, halo: false }));
      void view;
    },
    explain(m, r) {
      const best = r.err.merged <= r.err.uniform ? 'merged' : 'uniform';
      const rowsU = r.us.slice(0, 5).map((u, j) => `u = ${f(u, 2)} → slab ${r.bins[j] + 1}, s = ${f(r.fineDepths[j], 3)}`);
      const inHeavy = r.bins.filter((b) => r.pdf[b] >= Math.max(...r.pdf) * 0.5).length;
      const inEmpty = r.bins.filter((b) => r.pdf[b] < 1e-9).length;
      return {
        hud: `{coarse|${r.n} coarse} + {fine|${r.nf} fine}: color error {error|${f(r.err.merged, 4)}} against ${f(r.err.uniform, 4)} for ${r.n + r.nf} regular samples`,
        rows: [
          `normalized weights {coarse|${r.pdf.slice(0, 6).map((p) => f(p, 3)).join(', ')}${r.pdf.length > 6 ? ', …' : ''}}`,
          `cumulative {coarse|${r.cdf.slice(0, 6).map((p) => f(p, 3)).join(', ')}${r.cdf.length > 6 ? ', …' : ''}}`,
          `a uniform u lands in the slab where the cumulative curve first reaches it, then s = edge + (u − cumulative before) / weight × δ: ${rowsU.slice(0, 3).join('; ')}`,
          `{fine|${inHeavy} of the ${r.nf}} fine samples fall in slabs holding at least half the largest weight; ${inEmpty} fall in a slab whose weight is 0`,
          `error against the finely sampled reference: coarse alone {coarse|${f(r.err.coarse, 4)}}, ${r.n + r.nf} regular {ref|${f(r.err.uniform, 4)}}, coarse + fine {fine|${f(r.err.merged, 4)}}; depth error ${f(r.derr.coarse, 4)}, ${f(r.derr.uniform, 4)}, ${f(r.derr.merged, 4)}`,
          `each merged sample stands for the stretch halfway to its neighbors: ${r.n + r.nf} spans that sum to ${f(r.mergedDeltas.reduce((a, b) => a + b, 0), 3)}`,
        ],
        status: r.weightSum < 1e-6 ? { text: 'the coarse pass found no density: the weights are all 0, so the fine samples are spread uniformly', tone: 'warn' }
          : m.fm === 'lecture' ? { text: `${inHeavy} of the ${r.nf} fine samples land in the slabs with at least half the largest weight; ${inEmpty} in a slab with no weight`, tone: 'ok' }
          : best === 'merged' ? { text: `coarse + fine is closer to the reference than ${r.n + r.nf} regular samples (${f(r.err.merged, 4)} against ${f(r.err.uniform, 4)})`, tone: 'ok' }
            : { text: `${r.n + r.nf} regular samples are closer here (${f(r.err.uniform, 4)} against ${f(r.err.merged, 4)}): the fine samples help where the coarse pass has already found the stuff`, tone: 'info' },
        values: [['coarse N', String(r.n), 'coarse'], ['fine N', String(r.nf), 'fine'], ['coarse error', f(r.err.coarse, 4), 'coarse'], ['regular error', f(r.err.uniform, 4), 'ref'], ['merged error', f(r.err.merged, 4), 'fine'], ['Σ spans', f(r.mergedDeltas.reduce((a, b) => a + b, 0), 3)]],
        fact: 'Where the weights are large the cumulative curve is steep, and a uniform interval of u becomes a short interval of s: more samples per unit length where the stuff is. Both passes use the same field; a neural radiance field (NeRF) uses 64 coarse and 128 fine samples.',
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'hier', (h) => {
        segmented(h, 'fine u', [['stratified', 'stratified'], ['regular', 'regular'], ['random', 'random'], ['lecture', 'lecture\'s']], () => ctx.state().fm, (v) => { ctx.state().fm = v; ctx.update(); }, h);
        const row = el('div', 'lab-btns', h);
        btn(row, 'draw again', () => { const s = ctx.state(); s.seed = (s.seed % 97) + 1; if (s.fm === 'regular' || s.fm === 'lecture') s.fm = 'stratified'; ctx.update(); });
        btn(row, '+ bump', () => { addBump(ctx.state(), VL.GAUSSIAN); ctx.update(); });
        btn(row, 'remove', () => { removeBump(ctx.state()); ctx.update(); });
        el('div', 'vl-tablebox', h);
      });
      let t = '<table class="mat-panel lab-values vl-table"><tbody><tr><td class="value-label">u</td><td class="value-label">slab</td><td class="value-label">fine s</td></tr>';
      for (let j = 0; j < Math.min(8, r.us.length); j++) t += `<tr><td>${f(r.us[j], 3)}</td><td>${r.bins[j] + 1}</td><td>${f(r.fineDepths[j], 3)}</td></tr>`;
      if (r.us.length > 8) t += `<tr><td colspan="3" class="value-label">${r.us.length - 8} more</td></tr>`;
      host.querySelector('.vl-tablebox').innerHTML = `${t}</tbody></table>`;
    },
  };

  // ============================================================ Surface: a bump that sharpens
  const sharp = {
    id: 'surface.bump', topic: 'surface', label: 'A bump sharpens', inputTitle: 'A bump of fixed optical depth', home: HOME, grid: 'none', axes: false,
    init: { w100: 10, tau: 4, n: 128, sel: -1, mode: 'regular', u: 0.5, seed: 1, bg: 'black' },
    params: [{ id: 'w100', label: 'width w (×0.01)', min: 0.5, max: 15, step: 0.5 }, { id: 'tau', label: 'optical depth τ', min: 1, max: 8, step: 0.5 }, { id: 'n', label: 'N samples', min: 8, max: 256, step: 8 }],
    panelTitle: 'The samples',
    presets: [
      { label: 'w = 0.10', set: { w100: 10, tau: 4, n: 128 } },
      { label: 'w = 0.02', set: { w100: 2, tau: 4, n: 128 } },
      { label: 'w = 0.005', set: { w100: 0.5, tau: 4, n: 256 } },
      { label: 'w = 0.005, N = 32', set: { w100: 0.5, tau: 4, n: 32 } },
    ],
    regions: ['Sharpening a bump', 'Expected depth'],
    setup(ctx) { setupOverlay(ctx, { hover() {} }); },
    leave(ctx) { leaveOverlay(ctx); },
    edited(m) { m.n = Math.max(8, Math.round(m.n)); },
    run(m) {
      const w = m.w100 / 100;
      const bump = VL.sharpBump(0.5, w, m.tau, ...RED);
      const n = Math.max(8, Math.round(m.n));
      const r = marchOf(bump, m, n, { yMax: niceMax(bump[3] * 1.15, 2) });
      const seen = VL.expectedDepth(r.weights, r.depths);
      return { ...r, ...seen, height: bump[3], w, tau: m.tau, shift: 0.5 - r.depth };
    },
    draw(v, m, r, ctx) { paintOverlay(ctx, (g, area, ov) => this.paint(g, area, m, r, ov)); },
    paint(g, area, m, r, ov) {
      rayPlots(g, area, { ray: r, dense: r.dense, near: NEAR, far: FAR, yMax: r.yMax, selected: -1, side: 176, dim: (...k) => (ov ? ov.dim(...k) : 1), depthMark: { depth: r.depth, spread: r.spread }, sigmaTitle: `density σ(s): width w = ${f(r.w, 3)}, height ${f(r.height, 1)}, optical depth τ = ${f(r.tau, 1)}`, steps: r.n <= 64 });
      pixelColumn(g, { x: area.x + area.w - 176, y: area.y, w: 176, h: area.h }, r, r.bgc);
    },
    explain(m, r) {
      const expected = 1 - Math.exp(-r.tau);
      const missed = r.weightSum < 0.5 * expected;
      return {
        hud: `{sigma|w = ${f(r.w, 3)}}: weights spread {depth|${f(r.spread, 4)}} around depth {depth|${f(r.depth, 3)}}`,
        rows: [
          `{sigma|height} = τ / (w √(2π)) = ${f(r.tau, 1)} / (${f(r.w, 3)} × 2.507) = {sigma|${f(r.height, 2)}}: the same stuff in less length`,
          `{T|T_end} = e^(−τ) = e^(−${f(r.tau, 1)}) = ${f(Math.exp(-r.tau), 4)}; measured {T|${f(r.tEnd, 4)}}, whatever w is`,
          `expected depth {depth|Σ wᵢsᵢ / Σ wᵢ} = ${f(r.depth, 4)}, ${f(r.shift, 4)} in front of the center 0.5 (the front of a bump hides its back)`,
          `spread of the weights {depth|${f(r.spread, 4)}} = ${f(r.spread / r.w, 2)} w: narrower than the bump, and it falls with w`,
          `step δ = ${f(r.binWidth, 4)}: ${r.w < r.binWidth ? 'the bump is narrower than a step' : `${f(r.w / r.binWidth, 1)} steps across one w`}`,
        ],
        status: missed ? { text: `the bump fell between the samples: Σw = ${f(r.weightSum, 3)} of the ${f(expected, 3)} it should take`, tone: 'bad' }
          : r.w < r.binWidth ? { text: `the bump is narrower than a step: the weights show where the samples fell (spread ${f(r.spread, 4)}), not the bump`, tone: 'warn' }
          : r.spread < 0.02 ? { text: `the weights are a spike ${f(r.spread, 4)} wide: the field behaves as a surface at depth ${f(r.depth, 3)}`, tone: 'ok' }
            : { text: `the weights are spread over ${f(r.spread, 3)} of the ray: fog, not yet a surface`, tone: 'info' },
        chart: weightChart(r),
        values: [['w', f(r.w, 3), 'sigma'], ['height', f(r.height, 1), 'sigma'], ['T_end', f(r.tEnd, 4), 'T'], ['depth', f(r.depth, 4), 'depth'], ['spread', f(r.spread, 4), 'depth'], ['Σ w', f(r.weightSum, 4), 'w']],
        fact: 'Optical depth stays the same, so the pixel stays the same; the weights, and with them the depth map, sharpen. This is why a learned density can stand in for a surface.',
      };
    },
  };

  // ============================================================ Surface: a signed distance
  const sdf = {
    id: 'surface.sdf', topic: 'surface', label: 'Signed distance', inputTitle: 'A signed distance', home: HOME, grid: 'none', axes: false,
    init: { kappa: 40, surface100: 55, n: 128, sel: -1, mode: 'regular', u: 0.5, seed: 1, bg: 'black' },
    params: [{ id: 'kappa', label: 'sharpness κ', min: 5, max: 300, step: 1 }, { id: 'surface100', label: 'surface at (×0.01)', min: 20, max: 80, step: 1 }, { id: 'n', label: 'N samples', min: 8, max: 256, step: 8 }],
    panelTitle: 'The samples',
    presets: [
      { label: 'κ = 64 (the lecture)', set: { kappa: 64, surface100: 55, n: 128 } },
      { label: 'κ = 20', set: { kappa: 20, surface100: 55, n: 128 } },
      { label: 'κ = 300', set: { kappa: 300, surface100: 55, n: 256 } },
    ],
    regions: ['Distance to opacity', 'Compositing one ray'],
    setup(ctx) { setupOverlay(ctx, { hover() {} }); },
    leave(ctx) { leaveOverlay(ctx); },
    edited(m) { m.n = Math.max(8, Math.round(m.n)); },
    run(m) {
      const surface = m.surface100 / 100;
      const n = Math.max(8, Math.round(m.n));
      const s = VL.surfaceFromDistance(surface, m.kappa, [NEAR]);
      const r = marchOf(s.bump, m, n, { yMax: niceMax(m.kappa * 1.1, 2) });
      const seen = VL.surfaceFromDistance(surface, m.kappa, r.depths);
      const phi = (x) => VL.opacityFromDistance(surface - x, m.kappa).phi;
      let worst = 0;
      r.transmittances.forEach((T, i) => { worst = Math.max(worst, Math.abs(T - phi(r.edges[i]) / phi(NEAR))); });
      const table = [-0.05, 0, 0.05].map((fv) => [fv, VL.opacityFromDistance(fv, m.kappa).phi]);
      return { ...r, ...seen, distances: seen.distances, phiAt: phi, worst, table, kappa: m.kappa, surface, f0: surface - NEAR, w: 1 / m.kappa };
    },
    draw(v, m, r, ctx) { paintOverlay(ctx, (g, area, ov) => this.paint(g, area, m, r, ov)); },
    paint(g, area, m, r, ov) {
      rayPlots(g, area, { ray: r, dense: r.dense, near: NEAR, far: FAR, yMax: r.yMax, selected: -1, side: 176, dim: (...k) => (ov ? ov.dim(...k) : 1), depthMark: { depth: r.depth, spread: r.spread }, TCompare: (s) => r.phiAt(s) / r.phiAt(NEAR), TLegend: [['Φ(f(s)) / Φ(f(0))', C.alpha], ['T', C.T]], sigmaTitle: `density κ(1 − Φ) from the distance f = ${f(r.surface, 2)} − s`, steps: r.n <= 64 });
      pixelColumn(g, { x: area.x + area.w - 176, y: area.y, w: 176, h: area.h }, r, r.bgc);
    },
    explain(m, r) {
      return {
        hud: `{kappa|κ = ${f(r.kappa, 0)}}: opacity switches on over about {depth|${f(1 / r.kappa, 3)}}; weights spread {depth|${f(r.spread, 4)}}`,
        rows: [
          `{phi|Φₖ(f)} = 1 / (1 + e^(−κ f)), κ = ${f(r.kappa, 0)}: ${r.table.map(([fv, p]) => `f = ${f(fv, 2)}: {phi|${f(p, 3)}}`).join(', ')}`,
          `the surface is f = 0, at depth {sigma|${f(r.surface, 2)}}; f = ${f(r.surface, 2)} − s along the ray, positive in front of it`,
          `the density that makes T follow Φ is {sigma|κ (1 − Φₖ(f))}: 0 in front, κ/2 = ${f(r.kappa / 2, 1)} at the surface, κ behind`,
          `T(s) = Φ(f(s)) / Φ(f(0)): the composited T and this curve differ by at most {error|${r.worst.toExponential(1)}} over the ${r.n} samples`,
          `expected depth {depth|${f(r.depth, 4)}} (surface ${f(r.surface, 3)}), spread {depth|${f(r.spread, 4)}}; for a logistic density the spread is π / (√3 κ) = ${f(Math.PI / (Math.sqrt(3) * r.kappa), 4)}`,
        ],
        status: r.spread < 0.02 ? { text: `a crisp surface: the weights are a spike ${f(r.spread, 4)} wide at depth ${f(r.depth, 3)}`, tone: 'ok' } : { text: `a soft surface: the weights spread ${f(r.spread, 3)}; raise κ to sharpen it`, tone: 'info' },
        chart: weightChart(r),
        values: [['κ', f(r.kappa, 0), 'kappa'], ['band 1/κ', f(1 / r.kappa, 3), 'kappa'], ['T at surface', f(r.phiAt(r.surface) / r.phiAt(NEAR), 3), 'T'], ['depth', f(r.depth, 4), 'depth'], ['spread', f(r.spread, 4), 'depth'], ['T_end', f(r.tEnd, 4), 'T']],
        fact: 'NeuS (Wang and others, 2021) stores a signed distance and derives the opacity from it; the surface is the zero set of f, and κ is learned and grows during training, so the transition sharpens from fog to a surface.',
      };
    },
  };

  return [march, slab, count, thin, hier, sharp, sdf];
}
