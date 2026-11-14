// volume-lab-kit: what the volume-lab views share: the formula colors, the bumps a user drags, the rail's table of samples and its
// sampler controls, the text for one sample's formulas, and a cache for the measurements that take a moment. No volume-rendering
// result is computed here; every number comes from lib/programs/volume-lab/webgl/volumelab.js.
import * as VL from '../programs/volume-lab/webgl/volumelab.js';
import { COL } from '../core/lab-viz.js';
import { C, f, f3, rgbCss, subscript as sub, el, btn, segmented, once, overlayFor, setupOverlay, leaveOverlay } from './volume-lab-draw.js';
import { niceMax } from './volume-lab-plots.js';

export { f, f3, sub };

export const NEAR = 0;
export const FAR = 1;
export const BLACK = [0, 0, 0];
export const WHITE = [1, 1, 1];

export const KEYS = {
  sigma: COL.gold, alpha: COL.amber, T: COL.b, w: COL.a, C: COL.c, bg: COL.gray, depth: COL.cyan, ref: COL.white, error: COL.red,
  coarse: COL.cyan, fine: COL.pink, kappa: COL.amber, phi: COL.b, grad: COL.purple, L: COL.amber, gamma: COL.cyan, damp: COL.green,
  fit: COL.cyan, train: COL.amber, f: COL.pink, ray: COL.gold,
};

// ---------------------------------------------------------------- the bumps of a density

export const GRAY = [0.5, 0.5, 0.5], RED = [0.9, 0.2, 0.2], BLUE = [0.2, 0.3, 0.9], GREEN = [0.25, 0.75, 0.3], AMBER = [0.95, 0.65, 0.2];
const PALETTE = [GRAY, RED, BLUE, GREEN, AMBER];

/** the density a user starts from: a gray haze, a red blob and a blue blob */
export function defaultBumps() {
  return [[VL.GAUSSIAN, 0.28, 0.1, 0.8, ...GRAY], [VL.GAUSSIAN, 0.55, 0.05, 7, ...RED], [VL.GAUSSIAN, 0.8, 0.04, 3.5, ...BLUE]];
}
/** the lecture's ray: five slabs of 0.2, densities 0, 0.5, 4, 8, 1 (the fourth is changed by "sigma_4 = 80") */
export function lectureBumps(sigma4 = 8) {
  const cols = [BLACK, GRAY, RED, RED, BLUE], sig = [0, 0.5, 4, sigma4, 1];
  return sig.map((s, i) => [VL.BOX, 0.2 * i + 0.1, 0.1, s, ...cols[i]]);
}
export const LECTURE_US = [0.10, 0.25, 0.50, 0.75, 0.90];

export function bumpsOf(m) {
  m.bumps ??= defaultBumps();
  return m.bumps;
}
export const fieldOf = (m) => bumpsOf(m).flat();
export const background = (m) => (m.bg === 'white' ? WHITE : BLACK);

/** the axis limit that holds every bump's height */
export function yMaxOf(m) {
  m.yMax ??= niceMax(1.15 * Math.max(0, ...bumpsOf(m).map((b) => b[3])), 2);
  return m.yMax;
}

export function addBump(m, shape) {
  const bumps = bumpsOf(m);
  if (bumps.length >= 6) return;
  const color = PALETTE[bumps.length % PALETTE.length];
  bumps.push([shape, 0.5, shape === VL.BOX ? 0.08 : 0.05, shape === VL.BOX ? 3 : 4, ...color]);
  m.active = bumps.length - 1;
  m.yMax = null;
}
export function removeBump(m) {
  const bumps = bumpsOf(m);
  if (!bumps.length) return;
  bumps.splice(Math.min(m.active ?? bumps.length - 1, bumps.length - 1), 1);
  m.active = null;
  m.yMax = null;
}

/** where a bump's two handles sit in the density plot: the peak (center and height) and the width */
export function handlePoint(b, kind) {
  const [shape, mu, w, h] = b;
  if (kind === 'peak') return [mu, shape === VL.STEP ? h / 2 : h];
  return [mu + w, shape === VL.GAUSSIAN ? h * Math.exp(-0.5) : shape === VL.STEP ? h / (1 + Math.exp(-1)) : h];
}
const snapH = (h) => (h < 10 ? Math.round(h * 10) / 10 : Math.round(h));
/** move a handle to the plot position (x, y) */
export function dragHandle(b, kind, x, y, yMax) {
  if (kind === 'peak') {
    b[1] = Math.min(FAR, Math.max(NEAR, Math.round(x * 100) / 100));
    const h = Math.min(yMax, Math.max(0, y));
    b[3] = snapH(b[0] === VL.STEP ? 2 * h : h);
  } else {
    b[2] = Math.max(0.005, Math.round(Math.abs(x - b[1]) * 200) / 200);
  }
}

// ---------------------------------------------------------------- measurements that take a moment

const cache = new Map();
export function cached(key, make) {
  if (!cache.has(key)) {
    if (cache.size > 80) cache.delete(cache.keys().next().value);
    cache.set(key, make());
  }
  return cache.get(key);
}

export const COUNTS = [2, 4, 8, 16, 32, 64, 128, 256];
export const TRIALS = 60;

/** the finely sampled reference of a field */
export function referenceOf(field) {
  return cached(`ref|${field.join(',')}`, () => VL.renderRay(field, NEAR, FAR, VL.REFERENCE_N, 'regular', 0.5, VL.makeRng(1), BLACK));
}

/** the error against N of one sampler, measured over COUNTS */
export function convergenceOf(field, mode, u, trials = TRIALS) {
  return cached(`conv|${field.join(',')}|${mode}|${u}|${trials}`, () => {
    const c = VL.convergence(field, NEAR, FAR, COUNTS, mode, u, mode === 'stratified' ? trials : 1, 11);
    // the rate is read from N = 16 up, where the asymptotic law has taken over
    return { ...c, slope: VL.logSlope(COUNTS.slice(3), c.errors.slice(3)) };
  });
}

/** a density that is not flat at the ends of the ray, so the midpoint rule shows its N^-2 law */
export function countBumps() {
  return [[VL.GAUSSIAN, 0.3, 0.2, 3, ...RED], [VL.GAUSSIAN, 0.65, 0.12, 6, ...BLUE]];
}

// ---------------------------------------------------------------- the ray of a view

/** a ray with the extras the views draw: dense curves, the reference, and the selected sample */
export function marchOf(field, m, n, extra = {}) {
  const rng = VL.makeRng((m.seed ?? 1) * 7919);
  const bg = background(m);
  const ray = VL.renderRay(field, NEAR, FAR, n, m.mode ?? 'regular', m.u ?? 0.5, rng, bg);
  const dense = cached(`dense|${field.join(',')}`, () => VL.renderRay(field, NEAR, FAR, 320, 'regular', 0.5, VL.makeRng(1), BLACK));
  const reference = referenceOf(field);
  let best = -1;
  ray.weights.forEach((w, i) => { if (w > 1e-9 && (best < 0 || w > ray.weights[best] + 1e-12)) best = i; });
  const selected = m.sel >= 0 && m.sel < n ? m.sel : best;
  return { ...ray, binWidth: ray.deltas[0], dense, reference, bgc: bg, n, selected, ...extra };
}

export function colorDistance(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

// ---------------------------------------------------------------- the words for one sample

export function sampleRows(r, i) {
  if (i < 0) return ['no sample has any weight: the ray is empty'];
  const s = sub(i + 1);
  const prev = r.alphas.slice(0, i);
  const product = i === 0 ? 'T₁ = 1: nothing in front of the first sample'
    : i <= 4 ? `{T|T${s}} = ${prev.map((a) => `(1 − ${f(a, 3)})`).join('')} = {T|${f(r.transmittances[i], 3)}}`
      : `{T|T${s}} = (1 − α₁) … (1 − α${sub(i)}) = {T|${f(r.transmittances[i], 3)}}`;
  return [
    `{alpha|α${s}} = 1 − e^(−σ${s}δ${s}) = 1 − e^(−${f(r.sigmas[i], 2)} × ${f(r.deltas[i], 3)}) = {alpha|${f(r.alphas[i], 3)}}`,
    product,
    `{w|w${s}} = T${s} α${s} = ${f(r.transmittances[i], 3)} × ${f(r.alphas[i], 3)} = {w|${f(r.weights[i], 3)}}`,
  ];
}

/** the sum rows: the pixel, what is left, and the depth */
export function sumRows(r, bg) {
  const order = r.weights.map((w, i) => [w, i]).sort((a, b) => b[0] - a[0]).filter(([w]) => w > 5e-4).slice(0, 3);
  const terms = order.map(([w, i]) => `${f(w, 3)}·c${sub(i + 1)}`).join(' + ');
  const more = r.weights.filter((w) => w > 5e-4).length > 3 ? ' + …' : '';
  return [
    `{C|C} = Σ wᵢcᵢ = ${terms || '0'}${more} = {C|${f3(r.color)}}`,
    `Σ wᵢ = {w|${f(r.weightSum, 3)}} = 1 − {T|T_end} = 1 − {T|${f(r.tEnd, 3)}}: the rest, {T|${f(r.tEnd, 3)}}, shows the background`,
    `pixel = C + T_end · {bg|background} = ${f3(r.color, 2)} + ${f(r.tEnd, 3)} · ${f3(bg, 0)} = {C|${f3(r.pixel)}}`,
    r.weightSum > 1e-6 ? `expected depth Σ wᵢsᵢ / Σ wᵢ = {depth|${f(r.depth, 3)}}, spread ${f(r.spread, 3)}` : 'expected depth: none, since no sample has weight',
  ];
}

export function backgroundStatus(r) {
  if (r.weightSum < 1e-6) return { text: 'the ray is empty: the pixel is the background', tone: 'info' };
  if (r.tEnd < 0.005) return { text: `the ray is blocked: ${f(100 * r.tEnd, 1)} % reaches the background`, tone: 'info' };
  return { text: `${f(100 * r.tEnd, 1)} % of the ray reaches the background; the other ${f(100 * (1 - r.tEnd), 1)} % is the pixel's own color`, tone: 'ok' };
}

export function weightChart(r) {
  const top = Math.max(0.05, ...r.weights) * 1.15;
  return { x: [0, r.n + 1], y: [0, top], xLabel: 'sample', curve: 'weight wᵢ = Tᵢαᵢ of each sample', bars: r.weights.map((w, i) => ({ x: i + 1, y: w, color: rgbHex(r.colors[i]) })) };
}
const rgbHex = (c) => (Math.round(255 * Math.min(1, 0.25 + 0.75 * c[0])) << 16) | (Math.round(255 * Math.min(1, 0.25 + 0.75 * c[1])) << 8) | Math.round(255 * Math.min(1, 0.25 + 0.75 * c[2]));

// ---------------------------------------------------------------- the rail: sampler controls and the table of samples

export function samplerControls(host, ctx, { bumps = false, mode = true, background: bgControl = true, gradient = false } = {}) {
  if (mode) {
    segmented(host, 'samples', [['regular', 'regular'], ['stratified', 'stratified']], () => ctx.state().mode, (v) => { ctx.state().mode = v; ctx.update(); });
  }
  if (bgControl) {
    segmented(host, 'background', [['black', 'black'], ['white', 'white']], () => ctx.state().bg, (v) => { ctx.state().bg = v; ctx.update(); });
  }
  const row = el('div', 'lab-btns', host);
  if (mode) btn(row, 'draw again', () => { const s = ctx.state(); s.seed = (s.seed % 97) + 1; s.mode = 'stratified'; ctx.update(); }, 'The next seeded draw of the stratified offsets');
  if (bumps) {
    btn(row, '+ bump', () => { addBump(ctx.state(), VL.GAUSSIAN); ctx.update(); }, 'Add a Gaussian bump of density');
    btn(row, '+ box', () => { addBump(ctx.state(), VL.BOX); ctx.update(); }, 'Add a box: constant density over a stretch');
    btn(row, 'remove', () => { removeBump(ctx.state()); ctx.update(); }, 'Remove the bump you last touched');
  }
  if (gradient) {
    segmented(host, 'gradient', [[false, 'off'], [0, 'red'], [1, 'green'], [2, 'blue']], () => (ctx.state().grad ? ctx.state().channel : false), (v) => {
      const s = ctx.state();
      s.grad = v !== false;
      if (v !== false) s.channel = v;
      ctx.update();
    });
  }
}

/** the table of samples as HTML; a row click selects that sample */
export function tableHtml(r, { grad = null, max = 64, channelName = '' } = {}) {
  const n = r.depths.length;
  let h = `<table class="mat-panel lab-values vl-table"><tbody><tr><td class="value-label">i</td><td class="value-label">s</td><td class="value-label">δ</td><td class="value-label">σ</td><td class="value-label">α</td><td class="value-label">T</td><td class="value-label">w</td><td class="value-label">c</td>${grad ? `<td class="value-label">∂C/∂σ ${channelName}</td>` : ''}</tr>`;
  for (let i = 0; i < Math.min(n, max); i++) {
    h += `<tr data-i="${i}" class="${i === r.selected ? 'on' : ''}"><td>${i + 1}</td><td>${f(r.depths[i], 3)}</td><td>${f(r.deltas[i], 3)}</td><td>${f(r.sigmas[i], 2)}</td><td>${f(r.alphas[i], 3)}</td><td>${f(r.transmittances[i], 3)}</td><td>${f(r.weights[i], 3)}</td><td><span class="vl-sw" style="background:${rgbCss(r.colors[i])}"></span></td>${grad ? `<td>${f(grad.dSigma[i], 3)}</td>` : ''}</tr>`;
  }
  if (n > max) h += `<tr><td colspan="${grad ? 9 : 8}" class="value-label">${n - max} more samples</td></tr>`;
  h += `<tr class="vl-sum"><td colspan="6">Σ</td><td>${f(r.weightSum, 3)}</td><td><span class="vl-sw" style="background:${rgbCss(r.color)}"></span></td>${grad ? '<td></td>' : ''}</tr></tbody></table>`;
  return h;
}

export function bindTable(box, ctx) {
  if (box._bound) return;
  box._bound = true;
  box.addEventListener('click', (e) => {
    const row = e.target.closest ? e.target.closest('tr[data-i]') : null;
    if (!row) return;
    const s = ctx.state();
    s.sel = Number(row.dataset.i) === s.sel ? -1 : Number(row.dataset.i);
    ctx.update();
  });
}

// ---------------------------------------------------------------- dragging the bumps in the density plot

/** the pointer handlers of a density plot: grab a bump's handle and move it, or click a sample to select it */
export function bumpHandlers(view, ctx) {
  const hit = (m, x, y) => {
    const plot = view.layout?.sigma;
    if (!plot) return null;
    let best = null, bestD = 14;
    bumpsOf(m).forEach((b, k) => {
      for (const kind of ['peak', 'width']) {
        const [hx, hy] = handlePoint(b, kind);
        const d = Math.hypot(plot.sx(hx) - x, plot.sy(Math.min(hy, m.yMax)) - y);
        if (d < bestD) { bestD = d; best = { k, kind }; }
      }
    });
    return best;
  };
  const sampleAt = (m, x, y) => {
    const plots = view.layout;
    if (!plots) return -1;
    for (const p of [plots.sigma, plots.T, plots.w]) {
      if (p && p.inside(x, y)) {
        const s = p.dataX(x);
        const n = Math.round(m.n);
        return Math.min(n - 1, Math.max(0, Math.floor(((s - NEAR) / (FAR - NEAR)) * n)));
      }
    }
    return -1;
  };
  return {
    down(x, y) {
      const m = ctx.state();
      yMaxOf(m);
      const h = hit(m, x, y);
      if (h) { view.drag = h; m.active = h.k; ctx.update(); return; }
      const i = sampleAt(m, x, y);
      if (i >= 0) { m.sel = i === m.sel ? -1 : i; ctx.update(); }
    },
    move(x, y) {
      const m = ctx.state();
      if (!view.drag) return;
      const plot = view.layout.sigma;
      dragHandle(bumpsOf(m)[view.drag.k], view.drag.kind, plot.dataX(x), plot.dataY(y), m.yMax);
      ctx.update();
    },
    up() {
      const m = ctx.state();
      if (view.drag) { view.drag = null; m.yMax = null; ctx.update(); }
    },
    hover(x, y) {
      const m = ctx.state();
      const h = hit(m, x, y);
      const next = h ? `${h.k}${h.kind}` : null;
      const ov = overlayFor(ctx);
      ov.cv.style.cursor = h ? 'grab' : sampleAt(m, x, y) >= 0 ? 'pointer' : '';
      if (next !== view.hoverKey) { view.hoverKey = next; ctx.update(); }
    },
    leave() { if (view.hoverKey) { view.hoverKey = null; ctx.update(); } },
  };
}

/** the draggable handles of the field, for the plot */
export function handleList(view, m) {
  const out = [];
  bumpsOf(m).forEach((b, k) => {
    for (const kind of ['peak', 'width']) {
      const [x, y] = handlePoint(b, kind);
      out.push({ kind, x, y, color: b.slice(4, 7).map((c) => (b[3] > 0 ? c : 0.5)), active: (view.drag && view.drag.k === k && view.drag.kind === kind) || view.hoverKey === `${k}${kind}` });
    }
  });
  return out;
}

export { once, setupOverlay, leaveOverlay, overlayFor, C };
