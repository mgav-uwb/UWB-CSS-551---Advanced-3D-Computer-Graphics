// image-lab-tone: the Pyramid, Tone and Compare topics of the image-lab demo: Gaussian and Laplacian pyramids with the exact rebuild, histograms and
// tone curves, linear light, and PSNR and SSIM. Every number comes from lib/programs/image-lab/webgl/imagelab.js.
import * as I from '../programs/image-lab/webgl/imagelab.js';
import { COL } from '../core/lab-viz.js';
import {
  f, list, grayRgb, signedRgb, midGrayRgb, drawCells, drawBitmap, bitmapOf, caption, outline, cellAt, area, splitRow, splitCol, text, imageRect, drawChart,
  overlayFor, setupOverlay, leaveOverlay, paintWith, SCENE64, el, btn, segmented, once, filterImage, sceneAt, makeResolution, resolutionRow,
} from './image-lab-draw.js';

export const TONE_KEYS = {
  level: COL.b, band: COL.c, pixels: COL.gold, err: COL.red, drop: COL.red, avg: COL.green, blurred: COL.b, cdf: COL.gold, mean: COL.amber, stretch: COL.pink, gamma: COL.pink,
  code: COL.a, light: COL.c, mse: COL.amber, psnr: COL.gold, ssim: COL.green, lum: COL.b, cs: COL.pink, p: COL.b, q: COL.pink,
};

// ---------------------------------------------------------------- pyramids

const stripesImage = (shift) => Array.from({ length: 256 }, (_, k) => (((k % 16) + shift) % 2 === 0 ? 1 : 0));
const worked = () => [2, 4, 8, 6, 2, 4, 8, 6, 2, 4, 8, 6, 2, 4, 8, 6];
// the scene is computed at the lab's resolution (n below is its default); the other images are the lecture's arrays
const PYR_IMAGES = {
  scene: { n: 64, levels: 4, label: 'scene 64 × 64', data: () => SCENE64(), at: (n) => sceneAt(n) },
  worked: { n: 4, levels: 2, label: 'the lecture\'s 4 numbers', data: worked },
  stripes: { n: 16, levels: 3, label: 'stripes, 1 px', data: () => stripesImage(0) },
  stripes2: { n: 16, levels: 3, label: 'stripes shifted', data: () => stripesImage(1) },
};
const PYR_INIT = { imageId: 'scene', reduce: 'blur', expand: 'bilinear', step: 3 };
const PYR_PRESETS = [
  { label: 'the lecture\'s 4 numbers: average, repeat', set: { imageId: 'worked', reduce: 'average', expand: 'repeat', step: 1 } },
  { label: 'blur, bilinear: the chapter\'s pyramid', set: { imageId: 'scene', reduce: 'blur', expand: 'bilinear', step: 3 } },
  { label: 'drop pixels: aliasing in G1', set: { imageId: 'scene', reduce: 'drop', expand: 'bilinear', step: 3 } },
  { label: 'stripes dropped: all white', set: { imageId: 'stripes', reduce: 'drop', expand: 'repeat', step: 2 } },
  { label: 'the same stripes, shifted: all black', set: { imageId: 'stripes2', reduce: 'drop', expand: 'repeat', step: 2 } },
  { label: 'stripes averaged: gray', set: { imageId: 'stripes', reduce: 'average', expand: 'repeat', step: 2 } },
];
function runPyramid(m, sceneN = 64) {
  const spec = PYR_IMAGES[m.imageId], n = spec.at ? sceneN : spec.n, data = spec.at ? spec.at(n) : spec.data();
  const lap = I.laplacianPyramid(data, n, spec.levels, m.reduce, m.expand);
  const back = I.collapsePyramid(lap.bands, lap.top, n, m.expand);
  const pyr = I.gaussianPyramid(data, n, spec.levels, m.reduce);
  let maxErr = 0;
  for (let k = 0; k < data.length; k++) maxErr = Math.max(maxErr, Math.abs(back.image[k] - data[k]));
  const exact = I.reduceImage(data, n, n, 'average').image;
  const psnrs = {};
  for (const mt of ['drop', 'blur']) psnrs[mt] = I.psnrOf(exact, I.reduceImage(data, n, n, mt).image, 1);
  return { data, n, levels: spec.levels, ...lap, ...back, pixels: pyr.pixels, maxErr, psnrs, exact };
}
function pyrGeo(w, h, ov, n, levels) {
  const a = area(ov, w, h);
  const sum = 2 - Math.pow(2, 1 - levels);
  const z = Math.max(1, Math.min((a.w - 70 - 20 * levels) / (n * (sum + 1)), (a.h / 2 - 34) / n, 12));
  const rows = [a.y + 14, a.y + a.h / 2 + 14];
  const place = (row, size, x) => ({ x, y: rows[row], w: size * z, h: size * z });
  const g = [], l = [];
  let x = a.x;
  for (let k = 0; k < levels; k++) { g.push(place(0, n / Math.pow(2, k), x)); x += (n / Math.pow(2, k)) * z + 20; }
  x = a.x;
  for (let k = 0; k < levels; k++) { l.push(place(1, n / Math.pow(2, k), x)); x += (n / Math.pow(2, k)) * z + 20; }
  const out = { x: Math.max(x, a.x + a.w - n * z), y: rows[0], w: n * z, h: n * z };
  return { g, l, out, z };
}
export function pyramidView(res = makeResolution()) {
  return {
    id: 'pyramid', topic: 'pyramid', label: 'Pyramids', init: PYR_INIT, presets: PYR_PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    params: [{ id: 'step', label: 'rebuild step', min: 0, max: 3, step: 1 }], inputTitle: 'Rebuild from the top',
    regions: ['Image pyramids'], keys: {}, panelTitle: 'Image, reduce, expand',
    setup(ctx) { setupOverlay(ctx, null); },
    leave: leaveOverlay,
    run(m) { return runPyramid(m, res.scene); },
    draw(v, m, r, ctx) {
      paintWith(ctx, (g, w, h, ov) => {
        const L = pyrGeo(w, h, ov, r.n, r.levels), size = (k) => r.n / Math.pow(2, k);
        const show = (data, n, rect, label, color) => {
          caption(g, label, rect, { size: 11 });
          if (n <= 8) drawCells(g, data, n, n, rect, { color, minCell: 24, fmt: (q) => f(q, Math.abs(q) < 20 && !Number.isInteger(q) ? 2 : 0) });
          else drawBitmap(g, bitmapOf(data, n, n, color), rect);
        };
        for (let k = 0; k < r.levels; k++) show(r.gaussian[k], size(k), L.g[k], `G${k} ${size(k)}²`, grayRgb);
        const bm = Math.max(0.05, ...r.bands.map((b) => Math.max(...b.map(Math.abs))));
        const sc = r.n === 4 ? 2 : Math.min(bm, 0.5);
        for (let k = 0; k < r.levels - 1; k++) show(r.bands[k], size(k), L.l[k], `L${k}`, midGrayRgb(sc));
        show(r.top, size(r.levels - 1), L.l[r.levels - 1], `G${r.levels - 1}`, grayRgb);
        const s = Math.min(m.step, r.steps.length - 1), sz = r.n / Math.pow(2, r.levels - 1 - s - 1) ;
        const stepN = Math.round(Math.sqrt(r.steps[s].length));
        const rect = imageRect(L.out, stepN, stepN, 100);
        caption(g, `rebuild step ${s + 1}: L + up(coarser), ${stepN}²`, L.out, { size: 11 });
        if (stepN <= 8) drawCells(g, r.steps[s], stepN, stepN, rect, { minCell: 24, fmt: (q) => f(q, 0) }); else drawBitmap(g, bitmapOf(r.steps[s], stepN, stepN), rect);
        text(g, `largest error of the full rebuild: ${r.maxErr.toExponential(1)}`, L.out.x, L.out.y + L.out.h + 18, { size: 12, color: '#7ee787' });
        text(g, `${r.pixels} pixels in ${r.levels} levels = ${f(r.pixels / (r.n * r.n), 3)} × the image`, L.g[0].x, L.g[0].y + L.g[0].h + 16, { size: 12, color: '#ffd166' });
      });
    },
    explain(m, r) {
      const rows = [
        `{level|G(k+1)} = reduce(G(k)) by {drop|${m.reduce}};  {band|L(k)} = G(k) − up(G(k+1)), up = ${m.expand}`,
        `{pixels|${r.n}² + ${(r.n / 2) ** 2} + …} = {pixels|${r.pixels}} pixels over ${r.levels} levels = ${f(r.pixels / (r.n * r.n), 3)} × the image (the mipmap's 4/3 as levels grow)`,
        `rebuild: L(k) + up(G(k+1)) at each step; largest error against the original {err|${r.maxErr.toExponential(1)}}`,
        `halving by dropping scores ${f(r.psnrs.drop, 1)} dB against the exact 2 × 2 average; blur then drop ${f(r.psnrs.blur, 1)} dB`,
      ];
      if (r.n === 4) rows.push(`G0 row = ${list(r.data.slice(0, 4), 0)}, G1 row = ${list(r.gaussian[1].slice(0, 2), 0)}, up(G1) = (3, 3, 7, 7), L0 row = ${list(r.bands[0].slice(0, 4), 0)}`);
      const flatStripes = m.imageId.startsWith('stripes');
      let status;
      if (flatStripes && m.reduce === 'drop') status = { text: `dropping every other column keeps ${r.gaussian[1][0] === 1 ? 'the white' : 'the black'} stripes only: sampling without a prefilter, and which one depends on a half-pixel shift`, tone: 'bad' };
      else if (flatStripes && m.reduce === 'average') status = { text: 'averaging pairs gives uniform gray, the honest value for stripes finer than the new pixels', tone: 'ok' };
      else if (m.reduce === 'drop') status = { text: `dropped pixels score ${f(r.psnrs.drop, 1)} dB against the area average: aliasing; the rebuild is still exact (${r.maxErr.toExponential(1)})`, tone: 'warn' };
      else status = { text: `the Laplacian pyramid rebuilds the image exactly (error ${r.maxErr.toExponential(1)}): nothing discarded, only rearranged by scale`, tone: 'ok' };
      return { hud: `${r.pixels} pixels = {pixels|${f(r.pixels / (r.n * r.n), 2)}×}   rebuild error {err|${r.maxErr.toExponential(1)}}`, rows, status, values: [['levels', String(r.levels), 'level'], ['pixels', String(r.pixels), 'pixels'], ['drop vs average', `${f(r.psnrs.drop, 1)} dB`, 'drop'], ['blur vs average', `${f(r.psnrs.blur, 1)} dB`, 'blurred']] };
    },
    panel(host, m, r, ctx) {
      once(host, 'pyramid', (h) => {
        h.refreshers.push(segmented(h, 'image', Object.entries(PYR_IMAGES).map(([id, v]) => [id, v.label]), () => m.imageId, (id) => { m.imageId = id; m.step = PYR_IMAGES[id].levels - 1; ctx.update(); }));
        h.refreshers.push(segmented(h, 'reduce', [['drop', 'drop'], ['average', '2×2 average'], ['blur', 'blur, drop']], () => m.reduce, (id) => { m.reduce = id; ctx.update(); }));
        h.refreshers.push(segmented(h, 'expand', [['repeat', 'repeat'], ['bilinear', 'bilinear']], () => m.expand, (id) => { m.expand = id; ctx.update(); }));
        h.resBox = el('div', '', h);
        h.refreshers.push(resolutionRow(h.resBox, 'scene', res, (n) => { res.scene = n; ctx.update(); }));
      });
      host.refreshers.forEach((s) => s());
      // the resolution is the scene's; the other images are fixed arrays
      host.resBox.style.display = PYR_IMAGES[m.imageId].at ? '' : 'none';
      const sceneBtn = host.querySelector('.lab-btn[data-value="scene"]');
      if (sceneBtn) sceneBtn.textContent = `scene ${res.scene} × ${res.scene}`;
    },
  };
}

// ---------------------------------------------------------------- histograms and tone curves

const darkMemo = new Map();
const darkScene = (n = 64) => { if (!darkMemo.has(n)) darkMemo.set(n, sceneAt(n).map((v) => I.gammaValue(v, 2.2))); return darkMemo.get(n); };
const twoValued = () => Array.from({ length: 64 }, (_, k) => (k < 32 ? 0.2 : 0.8));
// [label, image at n, its default size, true when it is the scene at the lab's resolution]
const TONE_IMAGES = { scene: ['scene', (n = 64) => sceneAt(n), 64, true], dark: ['dark scene', darkScene, 64, true], two: ['half 0.2, half 0.8', twoValued, 8, false] };
const TONE_INIT = { imageId: 'dark', mode: 'equalize', low: 0.1, high: 0.8, gamma: 0.5 };
const TONE_PRESETS = [
  { label: 'equalize the dark scene', set: { imageId: 'dark', mode: 'equalize' } },
  { label: 'half 0.2, half 0.8 → 0.5, 1.0', set: { imageId: 'two', mode: 'equalize' } },
  { label: 'stretch [0.1, 0.8]', set: { imageId: 'scene', mode: 'stretch', low: 0.1, high: 0.8 } },
  { label: 'gamma 0.5 lifts shadows', set: { imageId: 'dark', mode: 'gamma', gamma: 0.5 } },
  { label: 'gamma 2.2 deepens them', set: { imageId: 'scene', mode: 'gamma', gamma: 2.2 } },
];
function runTone(m, sceneN = 64) {
  const spec = TONE_IMAGES[m.imageId], n = spec[3] ? sceneN : spec[2], data = spec[1](n), bins = 32;
  const before = I.histogram(data, bins);
  let result, curve;
  const eq = I.equalize(data, bins);
  if (m.mode === 'equalize') { result = eq.mapped; curve = (v) => eq.cumulative[Math.min(bins - 1, Math.floor(v * bins))]; }
  else if (m.mode === 'stretch') { result = data.map((v) => I.stretchValue(v, m.low, Math.max(m.high, m.low + 0.01))); curve = (v) => I.stretchValue(v, m.low, Math.max(m.high, m.low + 0.01)); }
  else { result = data.map((v) => I.gammaValue(v, m.gamma)); curve = (v) => I.gammaValue(v, m.gamma); }
  const after = I.histogram(result, bins);
  const clipped = result.filter((v) => v <= 0 || v >= 1).length;
  return { data, n, bins, ...before, histBefore: before, histAfter: after, ...eq, result, curve, clipped, meanResult: after.mean, marks: [0.1, 0.3, 0.5, 0.8].map((v) => [v, curve(v)]) };
}
export function toneView(res = makeResolution()) {
  const geo = (w, h, ov) => {
    const a = area(ov, w, h);
    const top = splitRow({ x: a.x, y: a.y, w: a.w, h: a.h * 0.5 }, 3, 18).map((c) => ({ x: c.x, y: c.y + 14, w: c.w, h: c.h - 14 }));
    return { img: top[0], out: top[1], curve: top[2], hist: { x: a.x, y: a.y + a.h * 0.55 + 14, w: a.w, h: a.h * 0.45 - 14 } };
  };
  return {
    id: 'tone', topic: 'tone', label: 'Histogram', init: TONE_INIT, presets: TONE_PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    params: [{ id: 'low', label: 'stretch low', min: 0, max: 0.9, step: 0.01 }, { id: 'high', label: 'stretch high', min: 0.1, max: 1, step: 0.01 }, { id: 'gamma', label: 'gamma', min: 0.2, max: 3, step: 0.05 }],
    inputTitle: 'Tone curve parameters',
    regions: ['Histogram', 'Equalization', 'Stretch and gamma'], keys: {}, panelTitle: 'Image and curve',
    setup(ctx) { setupOverlay(ctx, null); },
    leave: leaveOverlay,
    run(m) { return runTone(m, res.scene); },
    draw(v, m, r, ctx) {
      paintWith(ctx, (g, w, h, ov) => {
        const L = geo(w, h, ov), n = r.n;
        caption(g, 'image', L.img); caption(g, `after ${m.mode}`, L.out); caption(g, 'tone curve v → y', L.curve);
        const place = (rect) => imageRect(rect, n, n, 40);
        const ri = place(L.img), ro = place(L.out);
        if (n <= 8) { drawCells(g, r.data, n, n, ri, { minCell: 28 }); drawCells(g, r.result, n, n, ro, { minCell: 28 }); } else { drawBitmap(g, bitmapOf(r.data, n, n), ri); drawBitmap(g, bitmapOf(r.result, n, n), ro); }
        const cr = imageRect(L.curve, 1, 1, 10000);
        drawChart(g, { x: cr.x, y: cr.y, w: cr.w, h: cr.h }, {
          x: [0, 1], y: [0, 1], xTicks: [0, 0.5, 1], yTicks: [0, 0.5, 1], xLabel: 'v', hlines: [{ y: 0, dash: [] }], series: [{ pts: Array.from({ length: 129 }, (_, k) => [k / 128, r.curve(k / 128)]), color: '#ffd166' }, { pts: [[0, 0], [1, 1]], color: '#4a5266', dash: [4, 4], width: 1 }],
          dots: r.marks.map(([x, y]) => ({ x, y, color: '#ff79c6', r: 4 })),
        });
        caption(g, 'histogram before (blue) and after (orange), 32 bins; fraction of pixels', L.hist);
        const mx = Math.max(0.05, ...r.histBefore.fractions, ...r.histAfter.fractions);
        drawChart(g, L.hist, {
          x: [0, 1], y: [0, mx * 1.1], xTicks: [0, 0.25, 0.5, 0.75, 1], yTicks: [0, Number((mx / 2).toFixed(2)), Number(mx.toFixed(2))], xLabel: 'value',
          bars: [...r.histBefore.fractions.map((q, b) => ({ x0: b / 32 + 0.002, x1: b / 32 + 0.016, y: q, color: 'rgba(121,192,255,0.85)' })), ...r.histAfter.fractions.map((q, b) => ({ x0: b / 32 + 0.016, x1: b / 32 + 0.030, y: q, color: 'rgba(255,166,87,0.85)' }))],
        });
      });
    },
    explain(m, r) {
      const rows = [
        `${r.data.length} pixels in 32 bins;  mean before {mean|${f(r.histBefore.mean, 3)}}, after {mean|${f(r.meanResult, 3)}}`,
        `{cdf|C(v)} = the fraction of pixels at or below v:  ${r.marks.map(([v, y]) => `${f(v, 1)} ↦ ${f(y, 2)}`).join(',  ')}`,
        m.mode === 'equalize' ? `equalize: every v goes to C(v); equal values stay equal, so ${new Set(r.result.map((q) => q.toFixed(9))).size} distinct values remain from ${new Set(r.data.map((q) => q.toFixed(9))).size}`
          : m.mode === 'stretch' ? `{stretch|stretch}: y = (v − ${f(m.low, 2)}) / ${f(Math.max(m.high, m.low + 0.01) - m.low, 2)}, clipped to [0, 1]: ${r.clipped} pixels pinned to 0 or 1`
            : `{gamma|gamma}: y = v^${f(m.gamma, 2)}; 0.25 ↦ ${f(I.gammaValue(0.25, m.gamma), 3)}`,
        `all three curves are monotone: brighter stays brighter, only the spacing changes`,
      ];
      const dist = new Set(r.data.map((q) => q.toFixed(9))).size;
      let status;
      if (m.mode === 'equalize' && dist === 2) status = { text: 'two values stay two values (0.2 → 0.5, 0.8 → 1.0): equalization maps values, not pixels', tone: 'warn' };
      else if (m.mode === 'equalize') status = { text: `the mean moves from ${f(r.histBefore.mean, 3)} to ${f(r.meanResult, 3)}; a spike of equal pixels cannot be spread`, tone: 'info' };
      else if (m.mode === 'stretch') status = r.clipped > 0 ? { text: `${r.clipped} pixels outside [${f(m.low, 2)}, ${f(m.high, 2)}] are clipped to pure black or white`, tone: 'warn' } : { text: 'nothing is clipped', tone: 'ok' };
      else status = { text: m.gamma < 1 ? 'gamma below 1 lifts the shadows' : m.gamma > 1 ? 'gamma above 1 deepens the shadows' : 'gamma 1 is the identity', tone: 'info' };
      return { hud: `mean {mean|${f(r.histBefore.mean, 3)}} → {mean|${f(r.meanResult, 3)}}   ${m.mode}`, rows, status, values: r.marks.map(([v, y]) => [`${f(v, 1)} ↦`, f(y, 3), 'cdf']) };
    },
    panel(host, m, r, ctx) {
      once(host, 'tone', (h) => {
        h.refreshers.push(segmented(h, 'image', Object.entries(TONE_IMAGES).map(([id, v]) => [id, v[0]]), () => m.imageId, (id) => { m.imageId = id; ctx.update(); }));
        h.refreshers.push(segmented(h, 'curve', [['equalize', 'equalize'], ['stretch', 'stretch'], ['gamma', 'gamma']], () => m.mode, (id) => { m.mode = id; ctx.update(); }));
        h.resBox = el('div', '', h);
        h.refreshers.push(resolutionRow(h.resBox, 'scene', res, (n) => { res.scene = n; ctx.update(); }));
      });
      host.refreshers.forEach((s) => s());
      host.resBox.style.display = TONE_IMAGES[m.imageId][3] ? '' : 'none';
    },
  };
}

// ---------------------------------------------------------------- linear light

const LIGHT_INIT = { a: 0, b: 1, t: 0.5 };
const LIGHT_PRESETS = [
  { label: 'black and white, half and half', set: { a: 0, b: 1, t: 0.5 } },
  { label: 'code 0.5 alone', set: { a: 0.5, b: 0.5, t: 0.5 } },
  { label: 'dark gray and white', set: { a: 0.2, b: 1, t: 0.5 } },
  { label: 'a quarter white', set: { a: 0, b: 1, t: 0.25 } },
];
function runLight(m, n = 64) {
  const mix = I.blendCodes(m.a, m.b, m.t);
  const img = sceneAt(n), k = I.makeKernel('box3').values;
  const inCodes = I.convolve(img, n, n, k, 3, 'clamp').image;
  const inLight = I.convolveInLight(img, n, n, k, 3, 'clamp');
  return { ...mix, ...inLight, n, img, inCodes, inLightImage: inLight.image };
}
export function lightView(res = makeResolution()) {
  return {
    id: 'light', topic: 'tone', label: 'Linear light', init: LIGHT_INIT, presets: LIGHT_PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    params: [{ id: 'a', label: 'code a', min: 0, max: 1, step: 0.01 }, { id: 'b', label: 'code b', min: 0, max: 1, step: 0.01 }, { id: 't', label: 'mix t', min: 0, max: 1, step: 0.01 }], inputTitle: 'Two pixel codes and a mix',
    regions: ['Linear light'], keys: {}, panelTitle: 'Linear light',
    setup(ctx) { setupOverlay(ctx, null); },
    leave: leaveOverlay,
    run(m) { return runLight(m, res.scene); },
    draw(v, m, r, ctx) {
      paintWith(ctx, (g, w, h, ov) => {
        const a = area(ov, w, h);
        const top = splitRow({ x: a.x, y: a.y, w: a.w, h: a.h * 0.38 }, 4, 18).map((c) => ({ x: c.x, y: c.y + 14, w: c.w, h: c.h - 14 }));
        const sw = (rect, v2, label, sub) => { caption(g, label, rect); g.fillStyle = grayRgb(v2).length ? `rgb(${Math.round(255 * v2)},${Math.round(255 * v2)},${Math.round(255 * v2)})` : '#000'; g.fillRect(rect.x, rect.y, rect.w, rect.h); g.strokeStyle = '#2c3140'; g.strokeRect(rect.x - 0.5, rect.y - 0.5, rect.w + 1, rect.h + 1); text(g, sub, rect.x + rect.w / 2, rect.y + rect.h / 2, { size: 13, align: 'center', base: 'middle', color: v2 > 0.5 ? '#14161d' : '#e7eaf0', halo: false, weight: 700 }); };
        sw(top[0], m.a, 'code a', `${f(m.a, 2)}`); sw(top[1], m.b, 'code b', `${f(m.b, 2)}`);
        sw(top[2], r.codeMix, 'average of the codes', `code ${f(r.codeMix, 3)}\nlight ${f(r.lightOfCodeMix, 3)}`.split('\n')[0] + `, light ${f(r.lightOfCodeMix, 3)}`);
        sw(top[3], r.codeOfLightMix, 'average of the light', `code ${f(r.codeOfLightMix, 3)}, light ${f(r.lightMix, 3)}`);
        const n = r.n;
        const row = splitRow({ x: a.x, y: a.y + a.h * 0.45, w: a.w, h: a.h * 0.55 }, 4, 18).map((c) => imageRect({ x: c.x, y: c.y + 14, w: c.w, h: c.h - 14 }, n, n, 8));
        caption(g, 'scene', row[0]); caption(g, '3 × 3 box blur of the codes', row[1]); caption(g, 'box blur in linear light', row[2]); caption(g, 'light − codes (×6, mid-gray 0)', row[3]);
        drawBitmap(g, bitmapOf(r.img, n, n), row[0]); drawBitmap(g, bitmapOf(r.inCodes, n, n), row[1]); drawBitmap(g, bitmapOf(r.inLightImage, n, n), row[2]);
        drawBitmap(g, bitmapOf(r.inLightImage.map((q, k) => 0.5 + 6 * (q - r.inCodes[k])), n, n), row[3]);
      });
    },
    explain(m, r) {
      const rows = [
        `decode(c) = c / 12.92 for small c, else ((c + 0.055) / 1.055)^2.4;  decode(${f(m.codeMix ?? r.codeMix, 3)}) = {light|${f(r.lightOfCodeMix, 3)}}`,
        `averaging the codes: {code|code ${f(r.codeMix, 3)}} emits only {light|${f(r.lightOfCodeMix, 3)}} of white's light`,
        `averaging the light: {light|${f(r.lightMix, 3)}} of white's light is {code|code ${f(r.codeOfLightMix, 3)}} (encode)`,
        `the rule: decode to linear, operate, encode for display`,
      ];
      const status = Math.abs(r.codeMix - r.codeOfLightMix) < 1e-3 ? { text: 'the two averages agree here', tone: 'ok' } : { text: `the code average is too dark by ${f(r.lightMix - r.lightOfCodeMix, 3)} of white's light`, tone: 'warn' };
      return { hud: `codes → light ${f(r.lightOfCodeMix, 3)}; light → code ${f(r.codeOfLightMix, 3)}`, rows, status, values: [['decode(0.5)', f(I.srgbDecode(0.5), 3), 'light'], ['decode(128/255)', f(I.srgbDecode(128 / 255), 3), 'light'], ['encode(0.5)', f(I.srgbEncode(0.5), 3), 'code'], ['mix t', f(m.t, 2), null]] };
    },
    panel(host, m, r, ctx) {
      once(host, 'light', (h) => {
        h.refreshers.push(resolutionRow(h, 'scene', res, (n) => { res.scene = n; ctx.update(); }));
        el('p', 'lab-note', h, 'Blurring a bright line on a dark ground in codes darkens it; in linear light it keeps its energy.');
      });
      host.refreshers.forEach((s) => s());
    },
  };
}

// ---------------------------------------------------------------- PSNR and SSIM

const AMOUNTS = { noise: [0.05, 0.1, 0.2, 0.3], blur: [1, 2, 3, 5], shift: [1, 2, 3, 4], offset: [0.02, 0.05, 0.1, 0.2], sparse: [0.5], jpeg: [90, 50, 20, 5] };
const KIND_LABEL = { noise: 'noise σ', blur: 'blur passes', shift: 'shift (px)', offset: 'offset', sparse: '1 in 100 by 0.5', jpeg: 'JPEG quality' };
const MET_INIT = { kind: 'noise', level: 1 };
// the 1-in-100 preset's 26.0 dB needs a pixel count that 100 divides closely: 64 × 64 has 41 changed pixels in 4096 (32 × 32 gives 25.7 dB)
const MET_PRESETS = [
  { label: 'noise σ = 0.1: 20 dB', set: { kind: 'noise', level: 1 } },
  { label: 'blur once', set: { kind: 'blur', level: 0 } },
  { label: 'shift one pixel', set: { kind: 'shift', level: 0 } },
  { label: 'offset 0.05: 26.0 dB', set: { kind: 'offset', level: 1 } },
  { label: '1 pixel in 100 by 0.5: 26.0 dB', set: { kind: 'sparse', level: 0 }, size: 64 },
  { label: 'JPEG quality 20', set: { kind: 'jpeg', level: 2 } },
];
function distorted(kind, amount, n = 64) {
  const img = sceneAt(n);
  if (kind === 'jpeg') return I.codePlane(img.map((v) => v * 255), n, n, amount, I.LUMA_TABLE).decoded.map((v) => v / 255);
  return I.distort(img, n, n, kind, amount);
}
// the bars compare every distortion at its default amount: one set per size
const allMemo = new Map();
function runMetrics(m, n = 64) {
  const img = sceneAt(n), amount = AMOUNTS[m.kind][Math.min(m.level, AMOUNTS[m.kind].length - 1)], out = distorted(m.kind, amount, n);
  const mse = I.meanSquaredError(img, out), psnr = I.psnrOf(img, out, 1), whole = I.ssimImage(img, out, n, n, 8);
  const map = [], nb = n / 8;
  for (let by = 0; by < nb; by++) for (let bx = 0; bx < nb; bx++) {
    const p = [], q = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { p.push(img[(by * 8 + y) * n + bx * 8 + x]); q.push(out[(by * 8 + y) * n + bx * 8 + x]); }
    map.push(I.ssimPatches(p, q, 0.0001, 0.0009).ssim);
  }
  if (!allMemo.has(n)) allMemo.set(n, Object.entries(AMOUNTS).map(([kind, list2]) => { const a = distorted(kind, list2[Math.min(1, list2.length - 1)], n); return [kind, I.psnrOf(img, a, 1), I.ssimImage(img, a, n, n, 8).ssim]; }));
  return { n, img, amount, out, mse, psnr, ssim: whole.ssim, windows: whole.windows, map, all: allMemo.get(n) };
}
export function metricsView(res = makeResolution()) {
  const presets = MET_PRESETS.map((p) => (p.size ? { label: p.label, run: (m) => { Object.assign(m, p.set); res.scene = p.size; } } : p));
  return {
    id: 'metrics', topic: 'compare', label: 'PSNR and SSIM', init: MET_INIT, presets, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['Comparing two images', 'Distortions and SSIM of an image'], keys: {}, panelTitle: 'Distortion',
    setup(ctx) { setupOverlay(ctx, null); },
    leave: leaveOverlay,
    run(m) { return runMetrics(m, res.scene); },
    draw(v, m, r, ctx) {
      paintWith(ctx, (g, w, h, ov) => {
        const a = area(ov, w, h), n = r.n;
        const row = splitRow({ x: a.x, y: a.y, w: a.w, h: a.h * 0.55 }, 4, 16).map((c) => imageRect({ x: c.x, y: c.y + 14, w: c.w, h: c.h - 14 }, n, n, 8));
        caption(g, 'original', row[0]); caption(g, `${KIND_LABEL[m.kind]} ${r.amount}`, row[1]); caption(g, '|difference| × 4', row[2]); caption(g, 'SSIM per 8 × 8 window (white = 1)', row[3]);
        drawBitmap(g, bitmapOf(r.img, n, n), row[0]); drawBitmap(g, bitmapOf(r.out, n, n, (q) => grayRgb(Math.min(1, Math.max(0, q)))), row[1]);
        drawBitmap(g, bitmapOf(r.img.map((q, k) => Math.min(1, 4 * Math.abs(r.out[k] - q))), n, n), row[2]);
        drawCells(g, r.map, n / 8, n / 8, row[3], { minCell: 34, fmt: (q) => f(q, 2), color: (q) => grayRgb(Math.max(0, q)) });
        const bars = { x: a.x, y: a.y + a.h * 0.6 + 14, w: a.w, h: a.h * 0.4 - 14 };
        caption(g, 'the same scene, one distortion each: PSNR (dB, gold) and SSIM (green)', bars);
        const cw = bars.w / r.all.length;
        r.all.forEach(([kind, psnr, ssim], k) => {
          const x = bars.x + k * cw + 8, bw = cw / 2 - 12, hh = bars.h - 30;
          g.fillStyle = kind === m.kind ? '#ffd166' : 'rgba(255,209,102,0.5)'; g.fillRect(x, bars.y + hh - (hh * Math.min(psnr, 50)) / 50, bw, (hh * Math.min(psnr, 50)) / 50);
          g.fillStyle = kind === m.kind ? '#3fd97f' : 'rgba(63,217,127,0.5)'; g.fillRect(x + bw + 4, bars.y + hh - hh * Math.max(0, ssim), bw, hh * Math.max(0, ssim));
          text(g, f(psnr, 1), x + bw / 2, bars.y + hh - (hh * Math.min(psnr, 50)) / 50 - 4, { size: 10.5, align: 'center' });
          text(g, f(ssim, 3), x + bw * 1.5 + 4, bars.y + hh - hh * Math.max(0, ssim) - 4, { size: 10.5, align: 'center' });
          text(g, KIND_LABEL[kind], x + bw, bars.y + hh + 16, { size: 10.5, align: 'center', color: '#aab2c5' });
        });
      });
    },
    explain(m, r) {
      const rms = Math.sqrt(r.mse);
      const rows = [
        `{mse|MSE} = ‖x − y‖² / N = {mse|${r.mse.toExponential(3)}}  (RMS error ${f(rms, 4)})`,
        `{psnr|PSNR} = 10 log₁₀(1 / MSE) = {psnr|${f(r.psnr, 2)} dB};  20 dB is RMS 0.1, 40 dB is 0.01; halving the RMS adds 6.02 dB`,
        `{ssim|SSIM} = mean of the ${r.windows} window values = {ssim|${f(r.ssim, 4)}}  (1 is identical)`,
        `at the default amount of each distortion:  ${r.all.map(([k, p, s]) => `${KIND_LABEL[k]} ${f(p, 1)} dB / ${f(s, 3)}`).join(';  ')}`,
      ];
      let status;
      if (m.kind === 'sparse' || m.kind === 'offset') status = { text: `${f(r.psnr, 2)} dB: a slight tint and a scatter of badly wrong pixels can have the same MSE; SSIM ${f(r.ssim, 3)} is what tells them apart`, tone: 'warn' };
      else if (m.kind === 'shift') status = { text: `a shift nobody notices costs ${f(r.psnr, 1)} dB: both metrics compare pixel to pixel at the same position`, tone: 'warn' };
      else if (m.kind === 'blur') status = { text: `blurring removes energy and noise adds it: PSNR ${f(r.psnr, 1)} dB rewards the blur`, tone: 'info' };
      else status = { text: `${f(r.psnr, 1)} dB and SSIM ${f(r.ssim, 3)} against the original`, tone: 'info' };
      return { hud: `PSNR {psnr|${f(r.psnr, 1)} dB}   SSIM {ssim|${f(r.ssim, 3)}}   MSE {mse|${r.mse.toExponential(2)}}`, rows, status, values: [['MSE', r.mse.toExponential(2), 'mse'], ['PSNR', `${f(r.psnr, 2)} dB`, 'psnr'], ['SSIM', f(r.ssim, 4), 'ssim'], ['RMS error', f(rms, 4), null]] };
    },
    panel(host, m, r, ctx) {
      once(host, 'metrics', (h) => {
        h.refreshers.push(segmented(h, 'kind', Object.entries(KIND_LABEL), () => m.kind, (id) => { m.kind = id; m.level = Math.min(m.level, AMOUNTS[id].length - 1); ctx.update(); }));
        h.levelRow = el('div', '', h);
        h.resBox = el('div', '', h);
        h.refreshers.push(resolutionRow(h.resBox, 'scene', res, (n) => { res.scene = n; ctx.update(); }));
      });
      host.refreshers.forEach((s) => s());
      host.levelRow.innerHTML = '';
      const row = segmented(host.levelRow, 'amount', AMOUNTS[m.kind].map((a, i) => [i, String(a)]), () => m.level, (i) => { m.level = i; ctx.update(); });
      row();
    },
  };
}

// ---------------------------------------------------------------- SSIM on two patches

const SSIM_INIT = { p0: 0.2, p1: 0.4, p2: 0.6, p3: 0.8, q0: 0.3, q1: 0.4, q2: 0.6, q3: 0.7 };
const SSIM_PRESETS = [
  { label: 'the lecture patches: 0.934', set: SSIM_INIT },
  { label: 'identical: 1', set: { q0: 0.2, q1: 0.4, q2: 0.6, q3: 0.8 } },
  { label: 'brighter by 0.2', set: { q0: 0.4, q1: 0.6, q2: 0.8, q3: 1.0 } },
  { label: 'contrast halved', set: { q0: 0.35, q1: 0.45, q2: 0.55, q3: 0.65 } },
  { label: 'structure reversed', set: { q0: 0.8, q1: 0.6, q2: 0.4, q3: 0.2 } },
];
export function ssimView() {
  const vals = (m, c) => [m[`${c}0`], m[`${c}1`], m[`${c}2`], m[`${c}3`]];
  return {
    id: 'ssim', topic: 'compare', label: 'SSIM, worked', init: SSIM_INIT, presets: SSIM_PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    params: ['p0', 'p1', 'p2', 'p3', 'q0', 'q1', 'q2', 'q3'].map((id) => ({ id, label: id, min: 0, max: 1, step: 0.01 })), inputTitle: 'Patch p and patch q',
    regions: ['Comparing two images'], keys: {}, panelTitle: 'SSIM',
    setup(ctx) { setupOverlay(ctx, null); },
    leave: leaveOverlay,
    run(m) { const p = vals(m, 'p'), q = vals(m, 'q'); return { p, q, ...I.ssimPatches(p, q, 0.0001, 0.0009), mseValue: I.meanSquaredError(p, q), psnrValue: I.psnrOf(p, q, 1) }; },
    draw(v, m, r, ctx) {
      paintWith(ctx, (g, w, h, ov) => {
        const a = area(ov, w, h), box = { x: a.x + 20, y: a.y + 20, w: Math.min(a.w - 40, 700), h: Math.min(a.h - 60, 380) };
        drawChart(g, box, {
          x: [-0.3, 3.3], y: [0, 1.05], xTicks: [0, 1, 2, 3], yTicks: [0, 0.5, 1], xLabel: 'sample', hlines: [{ y: r.meanP, color: '#79c0ff' }, { y: r.meanQ, color: '#ff79c6' }],
          series: [{ pts: r.p.map((y, x) => [x, y]), color: '#79c0ff' }, { pts: r.q.map((y, x) => [x, y]), color: '#ff79c6' }],
          dots: [...r.p.map((y, x) => ({ x, y, color: '#79c0ff', r: 6 })), ...r.q.map((y, x) => ({ x, y, color: '#ff79c6', r: 6 }))],
          labels: [{ x: -0.2, y: 1.0, t: 'p (blue)', color: '#79c0ff' }, { x: 0.3, y: 1.0, t: 'q (pink)', color: '#ff79c6' }],
        });
        text(g, `SSIM = ${f(r.luminance, 3)} × ${f(r.contrastStructure, 3)} = ${f(r.ssim, 3)}`, box.x + 10, box.y + box.h + 30, { size: 18, color: '#7ee787', weight: 700 });
      });
    },
    explain(m, r) {
      const rows = [
        `means {p|μp = ${f(r.meanP, 3)}}, {q|μq = ${f(r.meanQ, 3)}};  variances {p|σp² = ${f(r.varianceP, 4)}}, {q|σq² = ${f(r.varianceQ, 4)}};  covariance σpq = ${f(r.covariance, 4)}`,
        `{lum|brightness term} (2μpμq + C₁) / (μp² + μq² + C₁) = {lum|${f(r.luminance, 4)}},  C₁ = 0.01², C₂ = 0.03²`,
        `{cs|contrast and structure} (2σpq + C₂) / (σp² + σq² + C₂) = {cs|${f(r.contrastStructure, 4)}}`,
        `{ssim|SSIM} = ${f(r.luminance, 4)} × ${f(r.contrastStructure, 4)} = {ssim|${f(r.ssim, 4)}}`,
        `MSE = ${f(r.mseValue, 4)}, PSNR = ${f(r.psnrValue, 2)} dB`,
      ];
      const status = Math.abs(r.ssim - 1) < 1e-9 ? { text: 'identical patches: SSIM 1', tone: 'ok' } : r.covariance < 0 ? { text: 'negative covariance: q runs against p, SSIM is below 0.5 even with equal means', tone: 'bad' }
        : r.luminance < 0.95 ? { text: `the means differ: the brightness term is ${f(r.luminance, 3)}`, tone: 'warn' } : { text: `the means agree; the contrast-structure term is ${f(r.contrastStructure, 3)} (SSIM names what changed, PSNR only counts)`, tone: 'info' };
      return { hud: `SSIM {ssim|${f(r.ssim, 3)}}   MSE ${f(r.mseValue, 4)}   PSNR ${f(r.psnrValue, 1)} dB`, rows, status, values: [['brightness', f(r.luminance, 4), 'lum'], ['contrast-structure', f(r.contrastStructure, 4), 'cs'], ['SSIM', f(r.ssim, 4), 'ssim'], ['PSNR', `${f(r.psnrValue, 2)} dB`, null]] };
    },
    panel(host) { once(host, 'ssim', (h) => { el('p', 'lab-note', h, 'The lecture\'s patches are p = (0.2, 0.4, 0.6, 0.8) and q = (0.3, 0.4, 0.6, 0.7), with population variances.'); }); },
  };
}
