// volume-lab-plots: the pictures of the volume-lab demo, each a function that paints into a canvas box. Nothing here computes a
// volume-rendering result; the data come from lib/programs/volume-lab/webgl/volumelab.js through the views (volume-lab-views.js).
import * as VL from '../programs/volume-lab/webgl/volumelab.js';
import { C, Plot, text, legendRow, legendColumn, f, f3, rgbCss, tick, fitRect } from './volume-lab-draw.js';

/** the finely sampled ray for the curves: N regular samples, so the curves are smooth */
export function denseRay(field, near, far, n = 320) {
  return VL.renderRay(field, near, far, n, 'regular', 0.5, VL.makeRng(1), [0, 0, 0]);
}

/** a nice upper limit for an axis: 1, 2, 5 times a power of ten */
export function niceMax(v, floor = 1) {
  const x = Math.max(v, floor);
  const p = Math.pow(10, Math.floor(Math.log10(x)));
  for (const m of [1, 2, 5, 10]) if (x <= m * p + 1e-9) return m * p;
  return 10 * p;
}
export const ticksFor = (max) => {
  const step = niceMax(max / 4, 1e-9);
  const out = [];
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(6)));
  return out;
};

// ---------------------------------------------------------------- the three plots of one ray

/**
 * density with its color, transmittance, weights. d: { ray, dense, near, far, yMax, selected, ov, dim, panels, handles, bars, noteSampled }
 * ray is the program's result for the samples shown; dense the same field sampled finely. Returns the Plot objects, for hit tests.
 */
export function rayPlots(g, box, d) {
  let panels = d.panels ?? ['sigma', 'T', 'w'];
  // on a slide the picture is short: keep the plots that carry the point
  if (box.h < 250 && panels.length > 2) panels = panels.filter((p) => p !== 'T');
  if (box.h < 150 && panels.length > 1) panels = [panels[0]];
  const heights = { sigma: 1.15, T: 0.8, w: 1.0 };
  const total = panels.reduce((s, p) => s + heights[p], 0);
  const side = d.side ?? 0;
  let y = box.y;
  const out = {};
  const x0 = d.near, x1 = d.far;
  const xticks = [];
  for (let v = Math.ceil(x0 * 10) / 10; v <= x1 + 1e-9; v += (x1 - x0) > 3 ? 0.5 : 0.1) xticks.push(Number(v.toFixed(3)));
  const ray = d.ray, dense = d.dense;
  const n = ray.depths.length;
  const dim = d.dim ?? (() => 1);
  panels.forEach((name, idx) => {
    const h = ((box.h - 4 * (panels.length - 1)) * heights[name]) / total;
    const last = idx === panels.length - 1;
    const b = { x: box.x, y, w: box.w - side, h };
    y += h + 4;
    if (name === 'sigma') {
      const p = new Plot(g, b, { xr: [x0, x1], yr: [0, d.yMax], title: d.sigmaTitle ?? 'density σ(s) and color c(s) along the ray', ylabel: 'σ', xticks: last ? xticks : [], yticks: ticksFor(d.yMax), xlabel: last ? 'depth s' : '', left: 40, bottom: 4 });
      p.frame();
      out.sigma = p;
      // the color under the density curve, one strip per fine sample
      p.clip();
      g.globalAlpha = 0.5 * dim('sigma', 'color');
      for (let i = 0; i < dense.depths.length; i++) {
        const xa = p.sx(dense.depths[i] - dense.deltas[i] / 2), xb = p.sx(dense.depths[i] + dense.deltas[i] / 2);
        const yt = p.sy(Math.min(dense.sigmas[i], d.yMax * 1.2));
        g.fillStyle = rgbCss(dense.colors[i]);
        g.fillRect(xa, yt, xb - xa + 0.6, p.sy(0) - yt);
      }
      g.globalAlpha = 1;
      p.unclip();
      p.curve((s) => dense.sigmas[Math.min(dense.sigmas.length - 1, Math.max(0, Math.round(((s - x0) / (x1 - x0)) * dense.sigmas.length - 0.5)))], C.sigma, { width: 2, alpha: dim('sigma') });
      // what the quadrature sees: sigma_i held across its whole step
      if (d.steps !== false && n <= 64) {
        g.save();
        g.globalAlpha = 0.9 * dim('sigma', 'alpha');
        for (let i = 0; i < n; i++) {
          const xa = p.sx(ray.edges[i]), xb = p.sx(ray.edges[i + 1]), yt = p.sy(Math.min(ray.sigmas[i], d.yMax * 1.2));
          g.strokeStyle = i === d.selected ? '#ffffff' : rgbCss(ray.colors[i].map((c) => 0.35 + 0.65 * c));
          g.lineWidth = i === d.selected ? 2 : 1.2;
          g.setLineDash([3, 2]);
          g.strokeRect(xa + 0.5, yt, xb - xa - 1, p.sy(0) - yt);
        }
        g.restore();
      }
      for (let i = 0; i < n; i++) {
        const sel = i === d.selected;
        p.dot(ray.depths[i], Math.min(ray.sigmas[i], d.yMax * 1.2), sel ? 5 : n > 64 ? 1.8 : 3, sel ? '#ffffff' : C.sigma, { stroke: sel ? C.sigma : null, alpha: dim('sigma', 'alpha') });
        g.strokeStyle = sel ? '#ffffff' : C.faint;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(p.sx(ray.depths[i]) + 0.5, p.y1);
        g.lineTo(p.sx(ray.depths[i]) + 0.5, p.y1 + 5);
        g.stroke();
      }
      for (const extra of d.sigmaExtras ?? []) extra(p, g);
      for (const hnd of d.handles ?? []) {
        g.beginPath();
        if (hnd.kind === 'peak') g.arc(p.sx(hnd.x), p.sy(Math.min(hnd.y, d.yMax)), hnd.active ? 8 : 6, 0, Math.PI * 2);
        else g.rect(p.sx(hnd.x) - (hnd.active ? 6 : 5), p.sy(Math.min(hnd.y, d.yMax)) - (hnd.active ? 6 : 5), hnd.active ? 12 : 10, hnd.active ? 12 : 10);
        g.fillStyle = hnd.active ? '#ffffff' : rgbCss(hnd.color);
        g.fill();
        g.strokeStyle = '#0b0c10';
        g.lineWidth = 2;
        g.stroke();
        g.strokeStyle = hnd.active ? '#ffffff' : '#c7cdda';
        g.lineWidth = 1.2;
        g.stroke();
      }
    } else if (name === 'T') {
      const p = new Plot(g, b, { xr: [x0, x1], yr: [0, 1.04], title: d.TTitle ?? 'transmittance T: the fraction of the ray still unblocked', ylabel: 'T', xticks: last ? xticks : [], yticks: [0, 0.5, 1], xlabel: last ? 'depth s' : '', left: 40, bottom: 4 });
      p.frame();
      out.T = p;
      const tAt = (s) => dense.transmittances[Math.min(dense.transmittances.length - 1, Math.max(0, Math.round(((s - x0) / (x1 - x0)) * dense.transmittances.length - 0.5)))];
      p.curve(tAt, C.exact, { width: 1.4, alpha: 0.75 * dim('T') });
      p.curve((s) => (d.TCompare ? d.TCompare(s) : NaN), C.alpha, { width: 1.4, dash: [4, 3], alpha: 0.9 });
      for (let i = 0; i < n; i++) {
        const sel = i === d.selected;
        p.bar(ray.edges[i], ray.edges[i + 1], ray.transmittances[i], C.T, { alpha: (sel ? 0.5 : 0.22) * dim('T') });
        p.line([[ray.edges[i], ray.transmittances[i]], [ray.edges[i + 1], ray.transmittances[i]]], C.T, { width: sel ? 3 : 2, alpha: dim('T') });
        p.dot(ray.depths[i], ray.transmittances[i], sel ? 4.5 : n > 64 ? 1.6 : 3, C.T, { alpha: dim('T') });
      }
      p.hline(ray.tEnd, C.T, { label: `T_end = ${f(ray.tEnd, 3)}`, labelColor: C.T, dash: [2, 3] });
      if (d.TLegend) legendColumn(g, p.x0 + 10, p.y1 - 10, d.TLegend);
    } else {
      const wmax = Math.max(0.05, ...ray.weights);
      const refAt = (s) => {
        const k = Math.min(dense.weights.length - 1, Math.max(0, Math.round(((s - x0) / (x1 - x0)) * dense.weights.length - 0.5)));
        return (dense.weights[k] / dense.deltas[k]);
      };
      const meanDelta = ray.deltas.reduce((a, c) => a + c, 0) / Math.max(1, n);
      const refMax = d.showReference === false ? 0 : Math.max(...dense.weights.map((w, i) => (w / dense.deltas[i]) * meanDelta));
      const top = Math.max(wmax, refMax) * 1.12;
      const p = new Plot(g, b, { xr: [x0, x1], yr: [0, top], title: d.wTitle ?? 'weight w = T · α of each sample', ylabel: 'w', xticks: last ? xticks : [], yticks: ticksFor(top), xlabel: last ? 'depth s' : '', left: 40, bottom: 4 });
      p.frame();
      out.w = p;
      for (let i = 0; i < n; i++) {
        const sel = i === d.selected;
        const gap = Math.min(3, (p.sx(ray.edges[i + 1]) - p.sx(ray.edges[i])) * 0.12) / (p.x1 - p.x0) * (x1 - x0);
        p.bar(ray.edges[i] + gap / 2, ray.edges[i + 1] - gap / 2, ray.weights[i], rgbCss(ray.colors[i].map((c) => 0.25 + 0.75 * c)), { alpha: (sel ? 1 : 0.85) * dim('w') });
        if (sel) {
          g.strokeStyle = '#ffffff';
          g.lineWidth = 2;
          g.strokeRect(p.sx(ray.edges[i] + gap / 2) + 0.5, p.sy(ray.weights[i]), p.sx(ray.edges[i + 1] - gap / 2) - p.sx(ray.edges[i] + gap / 2), p.sy(0) - p.sy(ray.weights[i]));
        }
        if (n <= 12 && ray.weights[i] > 0.0005) text(g, f(ray.weights[i], 3), (p.sx(ray.edges[i]) + p.sx(ray.edges[i + 1])) / 2, p.sy(ray.weights[i]) - 4, { size: 11, color: C.w, align: 'center', weight: 600 });
      }
      if (d.showReference !== false) p.curve((s) => refAt(s) * meanDelta, C.exact, { width: 1.3, dash: [4, 3], alpha: 0.8 * dim('w') });
      if (d.depthMark && ray.weightSum > 1e-6) {
        p.vline(d.depthMark.depth, C.color, { label: `depth ${f(d.depthMark.depth, 3)}`, labelColor: C.color });
        p.line([[d.depthMark.depth - d.depthMark.spread, top * 0.06], [d.depthMark.depth + d.depthMark.spread, top * 0.06]], C.color, { width: 3 });
      }
      for (const extra of d.wExtras ?? []) extra(p, g);
    }
  });
  return out;
}

/** the pixel as a swatch, with the numbers that made it, in the column to the right of the plots */
export function pixelColumn(g, rect, ray, background, dimmed = 1) {
  const sw = Math.min(rect.w - 10, 120);
  const x = rect.x + 6;
  let y = rect.y + 18;
  g.globalAlpha = dimmed;
  text(g, 'pixel', x, y - 6, { size: 12, color: C.ink, weight: 600, halo: false });
  g.fillStyle = rgbCss(ray.pixel);
  g.fillRect(x, y, sw, sw * 0.62);
  g.strokeStyle = C.axis;
  g.strokeRect(x + 0.5, y + 0.5, sw, sw * 0.62);
  y += sw * 0.62 + 16;
  text(g, 'Σ wᵢcᵢ', x, y, { size: 11, color: C.dim, halo: false });
  y += 15;
  g.fillStyle = rgbCss(ray.color);
  g.fillRect(x, y - 10, 24, 12);
  text(g, f3(ray.color, 2), x + 30, y, { size: 11.5, color: C.ink, halo: false });
  y += 20;
  text(g, `+ T_end · background`, x, y, { size: 11, color: C.dim, halo: false });
  y += 15;
  g.fillStyle = rgbCss(background.map((c) => c * ray.tEnd));
  g.fillRect(x, y - 10, 24, 12);
  g.strokeStyle = C.axis;
  g.strokeRect(x + 0.5, y - 9.5, 24, 12);
  text(g, `${f(ray.tEnd, 3)} × ${f3(background, 0)}`, x + 30, y, { size: 11.5, color: C.ink, halo: false });
  y += 22;
  text(g, `Σ w = ${f(ray.weightSum, 3)}`, x, y, { size: 11.5, color: C.w, weight: 600, halo: false });
  y += 15;
  text(g, `1 − T_end = ${f(1 - ray.tEnd, 3)}`, x, y, { size: 11.5, color: C.T, weight: 600, halo: false });
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------- error against N, log-log

/** the three samplers' errors against N and the current point; series: [{ name, color, counts, errors, slope, dash }] */
export function errorPlot(g, box, d) {
  const all = d.series.flatMap((s) => s.errors).filter((e) => e > 0);
  const lo = Math.pow(10, Math.floor(Math.log10(Math.min(...all, 1e-4)) - 0.2));
  const hi = Math.pow(10, Math.ceil(Math.log10(Math.max(...all, 1e-2)) + 0.1));
  const nMax = Math.max(...d.series.flatMap((s) => s.counts));
  const lx = (n) => Math.log2(n);
  const p = new Plot(g, box, { xr: [0, lx(nMax)], yr: [Math.log10(lo), Math.log10(hi)], title: d.title ?? 'error against the finely sampled reference', xlabel: 'N samples', ylabel: '‖C − C_ref‖', left: 54, bottom: 4 });
  p.frame();
  for (let k = 0; k <= Math.log2(nMax); k++) {
    g.strokeStyle = C.grid;
    g.beginPath();
    g.moveTo(Math.round(p.sx(k)) + 0.5, p.y0);
    g.lineTo(Math.round(p.sx(k)) + 0.5, p.y1);
    g.stroke();
    text(g, String(2 ** k), p.sx(k), p.y1 + 13, { size: 10.5, color: C.dim, align: 'center', halo: false });
  }
  for (let e = Math.log10(lo); e <= Math.log10(hi) + 1e-9; e += 1) {
    g.strokeStyle = C.grid;
    g.beginPath();
    g.moveTo(p.x0, Math.round(p.sy(e)) + 0.5);
    g.lineTo(p.x1, Math.round(p.sy(e)) + 0.5);
    g.stroke();
    text(g, `1e${Math.round(e)}`, p.x0 - 6, p.sy(e) + 3.5, { size: 10.5, color: C.dim, align: 'right', halo: false });
  }
  if (d.current) p.vline(lx(d.current), C.alpha, { dash: [3, 3], label: `N = ${d.current}`, labelColor: C.alpha });
  for (const s of d.series) {
    const pts = s.counts.map((n, i) => [lx(n), Math.log10(Math.max(s.errors[i], lo))]);
    p.line(pts, s.color, { width: 2, dash: s.dash });
    pts.forEach(([x, y]) => p.dot(x, y, 3, s.color));
  }
  legendColumn(g, p.x0 + 12, p.y1 - 12, d.series.map((s) => [`${s.name}: slope ${f(s.slope, 2)}`, s.color]), { size: 12 });
  if (d.marks) for (const m of d.marks) p.dot(lx(m.n), Math.log10(Math.max(m.error, lo)), 6, m.color, { stroke: '#ffffff' });
  return p;
}

// ---------------------------------------------------------------- hierarchical sampling: the cumulative curve

/** the cumulative curve of the coarse weights with the uniform numbers mapped through it to fine depths */
export function cdfPlot(g, box, d) {
  const p = new Plot(g, box, { xr: [d.near, d.far], yr: [0, 1.04], title: 'cumulative sum of the coarse weights', ylabel: 'u', xticks: [], yticks: [0, 0.5, 1], left: 40, bottom: 4 });
  p.frame();
  const pts = [[d.edges[0], 0]];
  d.cdf.forEach((c, i) => pts.push([d.edges[i + 1], c]));
  p.line(pts, C.coarse, { width: 2 });
  pts.forEach(([x, y], i) => { if (i) p.dot(x, y, 2.5, C.coarse); });
  d.us.forEach((u, j) => {
    const s = d.fineDepths[j];
    p.line([[d.near, u], [s, u], [s, 0]], C.fine, { width: 1, alpha: 0.75, dash: [2, 2] });
    p.dot(s, 0, 3.5, C.fine);
    if (d.us.length <= 12) text(g, f(u, 2), p.x0 + 4, p.sy(u) - 3, { size: 10, color: C.fine, halo: false });
  });
  return p;
}

// ---------------------------------------------------------------- opacity against the sampling offset (the thin surface)

export function offsetPlot(g, box, d) {
  const p = new Plot(g, box, { xr: [0, 1], yr: [0, 1.08], title: 'rendered opacity against where the samples start', xlabel: 'offset u: samples at near + (i + u) · step', ylabel: '1 − T_end', xticks: [0, 0.25, 0.5, 0.75, 1], yticks: [0, 0.5, 1], left: 44, bottom: 4 });
  p.frame();
  p.hline(d.truth, C.good, { label: `true opacity ${f(d.truth, 3)}`, labelColor: C.good, labelAt: 'right' });
  p.line(d.points.map(([u, o]) => [u, o]), C.alpha, { width: 2 });
  p.vline(d.u, C.exact, { dash: [3, 3] });
  p.dot(d.u, d.current, 6, C.exact, { stroke: C.alpha });
  return p;
}

// ---------------------------------------------------------------- fitting a signal

export function fitPlot(g, box, d) {
  const p = new Plot(g, box, { xr: [0, 1], yr: [d.yLo, d.yHi], title: d.title, xlabel: 'x', xticks: [0, 0.25, 0.5, 0.75, 1], yticks: d.yticks, left: 40, bottom: 4 });
  p.frame();
  p.curve((x) => d.fit.truth[Math.min(d.fit.truth.length - 1, Math.floor(x * d.fit.truth.length))], C.exact, { width: 1.8, alpha: 0.9 });
  p.curve((x) => d.fit.fitted[Math.min(d.fit.fitted.length - 1, Math.floor(x * d.fit.fitted.length))], C.coarse, { width: 2.2 });
  d.fit.xs.forEach((x, i) => p.dot(x, d.fit.ys[i], d.fit.xs.length > 60 ? 2.2 : 3.2, C.alpha));
  legendRow(g, p.x1 - 4, p.y0 + 14, [['signal', C.exact], ['fit', C.coarse], ['training points', C.alpha]], { size: 11.5 });
  if (Number.isFinite(d.probe)) p.vline(d.probe, C.fine, { dash: [3, 3], label: `x = ${f(d.probe, 2)}`, labelColor: C.fine });
  return p;
}

export function errorByL(g, box, d) {
  const p = new Plot(g, box, { xr: [-0.4, 10.4], yr: [0, d.yHi], title: 'error against the number of frequencies L', xlabel: 'L', xticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], yticks: ticksFor(d.yHi), left: 40, bottom: 4 });
  p.frame();
  p.line(d.train.map((e, L) => [L, Math.min(e, d.yHi)]), C.alpha, { width: 2 });
  p.line(d.test.map((e, L) => [L, Math.min(e, d.yHi)]), C.coarse, { width: 2 });
  d.train.forEach((e, L) => p.dot(L, Math.min(e, d.yHi), L === d.L ? 5 : 2.5, C.alpha));
  d.test.forEach((e, L) => p.dot(L, Math.min(e, d.yHi), L === d.L ? 5 : 2.5, C.coarse));
  p.vline(d.L, C.exact, { dash: [3, 3] });
  legendRow(g, p.x1 - 4, p.y0 + 14, [['training error', C.alpha], ['held-out error', C.coarse]], { size: 11.5 });
  return p;
}

// ---------------------------------------------------------------- the damping of each frequency

export function dampingPlot(g, box, d) {
  const L = d.damping.factors.length;
  const p = new Plot(g, box, { xr: [-0.6, L - 0.4], yr: [0, 1.08], title: `factor exp(−ω²σ² / 2) on each frequency ω = 2^k π, footprint σ = ${f(d.sigma, 4)}`, xlabel: 'k', xticks: Array.from({ length: L }, (_, k) => k), yticks: [0, 0.5, 1], left: 40, bottom: 4 });
  p.frame();
  d.damping.factors.forEach((fa, k) => {
    p.bar(k - 0.34, k + 0.34, fa, k === d.selected ? C.exact : C.coarse, { alpha: 0.85 });
    text(g, f(fa, 3), p.sx(k), Math.min(p.y1 - 4, p.sy(fa) - 5), { size: 10.5, color: C.ink, align: 'center', halo: true });
  });
  return p;
}

/** sin(omega x) near mu, and its average over the footprint */
export function averagePlot(g, box, d) {
  const w = d.sigma * 6;
  const p = new Plot(g, box, { xr: [d.mu - w, d.mu + w], yr: [-1.1, 1.1], title: `one sine, ω = ${tick(d.omega / Math.PI)}π, and its mean over the footprint`, xlabel: 'x', xticks: [d.mu - w, d.mu, d.mu + w].map((v) => Number(v.toFixed(4))), yticks: [-1, 0, 1], left: 40, bottom: 4 });
  p.frame();
  p.curve((x) => Math.sin(d.omega * x), C.dim, { width: 1.4 });
  p.curve((x) => Math.exp(-((x - d.mu) ** 2) / (2 * d.sigma * d.sigma)) * 0.9, C.alpha, { width: 1.2, dash: [3, 3], alpha: 0.7 });
  p.line([[d.mu - w, Math.sin(d.omega * d.mu) * d.factor], [d.mu + w, Math.sin(d.omega * d.mu) * d.factor]], C.coarse, { width: 2 });
  p.dot(d.mu, Math.sin(d.omega * d.mu), 4, C.dim);
  p.dot(d.mu, Math.sin(d.omega * d.mu) * d.factor, 5, C.coarse);
  legendColumn(g, p.x0 + 10, p.y1 - 10, [['sin(\u03c9x)', C.dim], ['the footprint N(\u03bc, \u03c3\u00b2), scaled', C.alpha], ['mean of the sine over the footprint', C.coarse]], { size: 11.5 });
  return p;
}

// ---------------------------------------------------------------- the bars of the encoding at one x

export function encodingBars(g, box, d) {
  const L = d.code.frequencies.length;
  const p = new Plot(g, box, { xr: [-0.5, Math.max(1, 2 * L) - 0.5], yr: [-1.1, 1.1], title: `γ(${f(d.x, 2)}) with L = ${L}: sin and cos of 2^k π x`, xticks: [], yticks: [-1, 0, 1], left: 40, bottom: 4 });
  p.frame();
  d.code.features.forEach((v, i) => p.bar(i - 0.36, i + 0.36, v, i % 2 ? C.alpha : C.coarse, { alpha: 0.9 }));
  for (let k = 0; k < L; k++) text(g, `k=${k}`, p.sx(2 * k + 0.5), p.y1 + 12, { size: 10, color: C.dim, align: 'center', halo: false });
  if (!L) text(g, 'L = 0: the network sees only x, no sines or cosines', (p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, { size: 12.5, color: C.dim, align: 'center' });
  return p;
}

// ---------------------------------------------------------------- the volume

/** the rendered image, as large as the box allows, with the picked pixel marked */
export function volumeImage(g, box, d) {
  const r = fitRect(box.x, box.y, box.w, box.h, 1);
  g.imageSmoothingEnabled = false;
  if (d.canvas && d.canvas.width > 1) g.drawImage(d.canvas, r.x, r.y, r.w, r.h);
  g.strokeStyle = C.axis;
  g.lineWidth = 1;
  g.strokeRect(r.x - 0.5, r.y - 0.5, r.w + 1, r.h + 1);
  if (!d.done) {
    g.fillStyle = 'rgba(11,12,16,0.55)';
    g.fillRect(r.x, r.y + r.h * d.progress, r.w, r.h * (1 - d.progress));
    text(g, `rendering ${Math.round(100 * d.progress)} %`, r.x + r.w / 2, r.y + r.h / 2, { size: 14, color: C.ink, align: 'center', weight: 600 });
  }
  if (d.pick) {
    const px = r.x + ((d.pick.i + 0.5) / d.size) * r.w, py = r.y + ((d.pick.j + 0.5) / d.size) * r.h;
    g.strokeStyle = '#ffd166';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(px, py, 9, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = 'rgba(11,12,16,0.8)';
    g.lineWidth = 1;
    g.beginPath();
    g.arc(px, py, 11, 0, Math.PI * 2);
    g.stroke();
  }
  return r;
}

/** the scene from above: blobs, the eye, the picked ray with its samples colored by their weights */
export function topDown(g, rect, d) {
  g.fillStyle = 'rgba(11,12,16,0.88)';
  g.fillRect(rect.x, rect.y, rect.w, rect.h);
  g.strokeStyle = C.axis;
  g.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w, rect.h);
  const R = 3.2;
  const sx = (x) => rect.x + rect.w / 2 + (x / R) * (rect.w / 2 - 6);
  const sz = (z) => rect.y + rect.h / 2 + (z / R) * (rect.h / 2 - 6);   // z down the page: the view from above, x to the right
  g.strokeStyle = C.grid;
  g.beginPath();
  g.moveTo(sx(-R), sz(0)); g.lineTo(sx(R), sz(0)); g.moveTo(sx(0), sz(-R)); g.lineTo(sx(0), sz(R));
  g.stroke();
  const blobs = d.blobs;
  for (let k = 0; k < blobs.length / VL.BLOB_STRIDE; k++) {
    const o = k * VL.BLOB_STRIDE;
    g.beginPath();
    g.arc(sx(blobs[o]), sz(blobs[o + 2]), (blobs[o + 3] / R) * (rect.w / 2 - 6), 0, Math.PI * 2);
    g.fillStyle = rgbCss([blobs[o + 5], blobs[o + 6], blobs[o + 7]], 0.35);
    g.fill();
    g.strokeStyle = rgbCss([blobs[o + 5], blobs[o + 6], blobs[o + 7]], 0.9);
    g.stroke();
  }
  const cam = d.camera;
  g.fillStyle = C.ink;
  g.beginPath();
  g.arc(sx(cam.origin[0]), sz(cam.origin[2]), 4, 0, Math.PI * 2);
  g.fill();
  if (d.ray) {
    const o = cam.origin, dir = d.rayDir;
    g.strokeStyle = 'rgba(255,209,102,0.8)';
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(sx(o[0] + d.near * dir[0]), sz(o[2] + d.near * dir[2]));
    g.lineTo(sx(o[0] + d.far * dir[0]), sz(o[2] + d.far * dir[2]));
    g.stroke();
    const wmax = Math.max(1e-6, ...d.ray.weights);
    d.ray.depths.forEach((s, i) => {
      g.beginPath();
      g.arc(sx(o[0] + s * dir[0]), sz(o[2] + s * dir[2]), 1.5 + 3.5 * Math.sqrt(d.ray.weights[i] / wmax), 0, Math.PI * 2);
      g.fillStyle = `rgba(255,209,102,${0.25 + 0.7 * (d.ray.weights[i] / wmax)})`;
      g.fill();
    });
  }
  text(g, 'from above', rect.x + 6, rect.y + 13, { size: 10.5, color: C.dim, halo: false });
}
