// image-lab-fourier: the Fourier topic of the image-lab demo: the spectrum of an image with frequency masks, one frequency as a pair of dots (and
// aliasing), the convolution theorem, and the response of a 3-tap kernel. Every number comes from lib/programs/image-lab/webgl/imagelab.js.
import * as I from '../programs/image-lab/webgl/imagelab.js';
import { COL } from '../core/lab-viz.js';
import {
  f, list, grayRgb, signedRgb, drawCells, drawBitmap, bitmapOf, caption, outline, cellAt, cellRect, area, splitRow, splitCol, text, imageRect, drawChart,
  overlayFor, setupOverlay, leaveOverlay, paintWith, el, btn, segmented, once, sceneAt, makeResolution, resolutionRow,
} from './image-lab-draw.js';

export const FOURIER_KEYS = {
  energy: COL.gold, kept: COL.c, mask: COL.pink, probe: COL.cyan, mean: COL.gold, dot: COL.cyan, mirror: COL.pink, u: COL.cyan, v: COL.amber, phase: COL.pink,
  omega: COL.gold, binomial: COL.c, box: COL.b, gain: COL.gold, diff: COL.red,
};

// the test images at n by n (a power of two); at 32 the box covers columns and rows 10 to 21
const edgeAt = (n) => Array.from({ length: n * n }, (_, k) => ((k % n) < n / 2 ? 0.1 : 0.9));
const boxAt = (n) => Array.from({ length: n * n }, (_, k) => { const x = k % n, y = Math.floor(k / n), a = (10 * n) / 32, b = (22 * n) / 32; return x >= a && x < b && y >= a && y < b ? 0.9 : 0.1; });
const stripesAt = (n) => I.frequencyImage(n, n, 5, 3, 0);
const SPEC_IMAGES = { scene: ['scene', sceneAt], edge: ['vertical edge', edgeAt], box: ['box', boxAt], stripes: ['stripes (5, 3)', stripesAt] };
const memo = new Map();
const specImage = (id, n) => { const key = `${id}|${n}`; if (!memo.has(key)) memo.set(key, SPEC_IMAGES[id][1](n)); return memo.get(key); };
const shiftIndex = (x, y, w, h) => ((y + h / 2) % h) * w + ((x + w / 2) % w);   // display cell -> frequency index
/** the largest mask radius worth a slider: past the corner of the spectrum, sqrt(2) n / 2 */
const maxRadius = (n) => 0.75 * n;
/** a probed frequency picked at another size: the same (u, v) in periods per image, clamped to what n pixels hold */
function fitProbe(m, n) {
  const from = m.pn ?? n;
  if (from !== n) {
    const fit = (k) => { const signed = k >= from / 2 ? k - from : k; return (Math.min(n / 2, Math.max(-n / 2, signed)) + n) % n; };
    m.pu = fit(m.pu); m.pv = fit(m.pv);
  }
  m.pn = n;
}

// ---------------------------------------------------------------- the spectrum, masks and the inverse

const SPEC_INIT = { imageId: 'scene', kind: 'low', radius: 6, pu: 0, pv: 0 };
const SPEC_PRESETS = [
  { label: 'low pass, radius 6', set: { imageId: 'scene', kind: 'low', radius: 6 } },
  { label: 'low pass, radius 2: only the blobs', set: { imageId: 'scene', kind: 'low', radius: 2 } },
  { label: 'radius 0: the mean', set: { imageId: 'scene', kind: 'low', radius: 0 } },
  { label: 'high pass, radius 4: edges', set: { imageId: 'scene', kind: 'high', radius: 4 } },
  { label: 'ideal low pass on an edge: ringing', set: { imageId: 'edge', kind: 'low', radius: 4 } },
  { label: 'Gaussian low pass: no ringing', set: { imageId: 'edge', kind: 'gaussian-low', radius: 4 } },
  { label: 'stripes: two dots', set: { imageId: 'stripes', kind: 'low', radius: 8 } },
];

function runSpectrum(m, n = 32) {
  fitProbe(m, n);
  m.radius = Math.min(m.radius, maxRadius(n));
  const data = specImage(m.imageId, n);
  const mask = I.radialMask(n, n, m.radius, m.kind);
  const out = I.filterByMask(data, n, n, mask);
  const shown = I.logSpectrum(out.spectrumRe, out.spectrumIm, n, n);
  const keptShown = I.logSpectrum(out.keptRe, out.keptIm, n, n);
  const pk = shiftIndex(((m.pu + n / 2) % n), ((m.pv + n / 2) % n), n, n);
  return { n, data, mask, ...out, ...shown, shownKept: keptShown.shown, imageEnergy: I.imageEnergy(data), probeRe: out.spectrumRe[m.pv * n + m.pu], probeIm: out.spectrumIm[m.pv * n + m.pu], pk };
}

function specGeo(w, h, ov, n) {
  const a = area(ov, w, h);
  const cols = splitRow({ x: a.x, y: a.y, w: a.w, h: a.h * 0.52 }, 3, 18);
  const top = cols.map((c) => imageRect({ x: c.x, y: c.y + 14, w: c.w, h: c.h - 14 }, n, n, 12));
  const bot = splitRow({ x: a.x, y: a.y + a.h * 0.56, w: a.w, h: a.h * 0.44 }, 3, 18).map((c) => imageRect({ x: c.x, y: c.y + 14, w: c.w, h: c.h - 14 }, n, n, 12));
  return { image: top[0], spectrum: top[1], result: top[2], masked: bot[1], mask: bot[0], diff: bot[2] };
}

function paintSpectrum(g, w, h, ov, m, r) {
  const n = r.n, L = specGeo(w, h, ov, n), cell = L.spectrum.w / n;
  caption(g, `image ${n} × ${n}`, L.image); caption(g, 'log(1 + |X|), zero frequency at the center', L.spectrum); caption(g, 'after the mask: inverse transform', L.result);
  caption(g, 'mask (white keeps)', L.mask); caption(g, 'spectrum after the mask', L.masked); caption(g, 'result − image (×4, mid-gray 0)', L.diff);
  drawBitmap(g, bitmapOf(r.data, n, n), L.image);
  drawBitmap(g, bitmapOf(r.shown, n, n), L.spectrum);
  const lo = Math.min(...r.filtered), hi = Math.max(...r.filtered);
  const dlo = Math.min(...r.data), dhi = Math.max(...r.data);
  drawBitmap(g, bitmapOf(r.filtered, n, n, (v) => (v < dlo - 0.02 ? [255, 90, 80] : v > dhi + 0.02 ? [255, 200, 90] : grayRgb(v))), L.result);
  const maskShown = Array.from({ length: n * n }, (_, k) => r.mask[shiftIndex(k % n, Math.floor(k / n), n, n)]);
  drawBitmap(g, bitmapOf(maskShown, n, n), L.mask);
  drawBitmap(g, bitmapOf(r.shownKept, n, n), L.masked);
  drawBitmap(g, bitmapOf(r.filtered.map((v, k) => 0.5 + 2 * (v - r.data[k])), n, n), L.diff);
  // the mask radius on the spectrum, and the probed coefficient
  const cx = L.spectrum.x + (n / 2 + 0.5) * cell, cy = L.spectrum.y + (n / 2 + 0.5) * cell;
  g.strokeStyle = '#ff79c6'; g.lineWidth = 2; g.setLineDash(m.kind.endsWith('high') ? [6, 4] : []);
  g.beginPath(); g.arc(cx, cy, Math.max(1, m.radius * cell), 0, 2 * Math.PI); g.stroke(); g.setLineDash([]);
  const px = ((m.pu + n / 2) % n), py = ((m.pv + n / 2) % n);
  outline(g, L.spectrum.x + px * cell, L.spectrum.y + py * cell, cell, cell, '#56d4dd', 2);
  if (lo < dlo - 0.02 || hi > dhi + 0.02) text(g, `beyond the image's range: ${f(lo, 2)} to ${f(hi, 2)}`, L.result.x, L.result.y + L.result.h + 16, { size: 11.5, color: '#ffb36b' });
}

export function spectrumView(res = makeResolution()) {
  const hit = (ctx, x, y, drag) => {
    const n = res.fourier;
    const ov = overlayFor(ctx), L = specGeo(ov.w, ov.h, ov, n), m = ctx.state(), c = cellAt(L.spectrum, n, n, x, y);
    if (!c) return;
    const du = c.i - n / 2, dv = c.j - n / 2;
    m.radius = Math.min(maxRadius(n), Math.round(Math.sqrt(du * du + dv * dv) * 2) / 2);
    m.pu = (c.i + n / 2) % n; m.pv = (c.j + n / 2) % n; m.pn = n;
    ctx.refresh();
  };
  return {
    id: 'spectrum', topic: 'fourier', label: 'Spectrum', init: SPEC_INIT, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    presets: [{ label: 'full pass: the same image', run: (m) => Object.assign(m, { imageId: 'scene', kind: 'low', radius: maxRadius(res.fourier) }) }, ...SPEC_PRESETS],
    params: [{ id: 'radius', label: 'radius', min: 0, max: maxRadius(res.fourier), step: 0.5 }], inputTitle: 'Mask radius (periods per image)',
    regions: ['Fast Fourier transform', 'Spectrum and frequency masks'], keys: {}, panelTitle: 'Image and mask',
    setup(ctx) { setupOverlay(ctx, { down: (x, y) => hit(ctx, x, y), move: (x, y) => hit(ctx, x, y, true) }); },
    // the slider's range follows the resolution: the lab builds the slider from params when the view is entered
    enter(m) { this.params[0].max = maxRadius(res.fourier); m.radius = Math.min(m.radius, this.params[0].max); },
    leave: leaveOverlay,
    run(m) { return runSpectrum(m, res.fourier); },
    draw(v, m, r, ctx) { paintWith(ctx, (g, w, h, ov) => paintSpectrum(g, w, h, ov, m, r)); },
    explain(m, r) {
      const keptPct = 100 * r.energyKept / r.energyBefore;
      const lo = Math.min(...r.filtered), hi = Math.max(...r.filtered);
      const rows = [
        `{energy|Σ x²} = ${f(r.imageEnergy, 3)} and {energy|Σ |X|² / (w h)} = ${f(r.energyBefore, 3)}: the picture's energy is the spectrum's (Parseval)`,
        `mask {mask|${m.kind}}, radius {mask|${f(m.radius, 1)}}: keeps {kept|${f(r.energyKept, 3)}} of the energy = {kept|${f(keptPct, 2)} %}`,
        `X(${m.pu}, ${m.pv}) = ${f(r.probeRe, 3)} ${r.probeIm < 0 ? '−' : '+'} ${f(Math.abs(r.probeIm), 3)}i,  |X| = {probe|${f(Math.hypot(r.probeRe, r.probeIm), 3)}}  (click the spectrum)`,
        `inverse transform: range ${f(lo, 3)} to ${f(hi, 3)}, largest imaginary part ${r.imaginary.toExponential(1)}`,
        `the mean pixel is X(0, 0) / (w h) = ${f(r.spectrumRe[0] / (r.n * r.n), 4)}`,
      ];
      let status;
      if (m.kind === 'low' && m.radius <= 0) status = { text: 'radius 0 keeps only X(0, 0): every pixel becomes the mean', tone: 'info' };
      else if (r.energyKept >= r.energyBefore - 1e-9) status = { text: 'the mask passes everything: the result equals the image', tone: 'ok' };
      else if ((lo < Math.min(...r.data) - 0.02 || hi > Math.max(...r.data) + 0.02) && m.kind.indexOf('gaussian') < 0) status = { text: `ringing: the ideal mask's sharp cut puts ripples beside edges, and values leave the image's range [${f(Math.min(...r.data), 2)}, ${f(Math.max(...r.data), 2)}] (${f(lo, 2)} to ${f(hi, 2)})`, tone: 'warn' };
      else if (m.kind.endsWith('high')) status = { text: 'high pass: the mean and the smooth parts are gone; what is left is where the image changes', tone: 'info' };
      else status = { text: `low pass: edges blur because a sharp edge has energy at every frequency; ${f(keptPct, 1)} % of the energy is kept`, tone: 'info' };
      return { hud: `kept {kept|${f(keptPct, 1)} %} of the energy at radius {mask|${f(m.radius, 1)}}`, rows, status, values: [['Σ x²', f(r.imageEnergy, 3), 'energy'], ['Σ|X|²/(w h)', f(r.energyBefore, 3), 'energy'], ['kept', `${f(keptPct, 2)} %`, 'kept'], ['|X(u, v)|', f(Math.hypot(r.probeRe, r.probeIm), 2), 'probe']] };
    },
    panel(host, m, r, ctx) {
      once(host, 'spectrum', (h) => {
        h.refreshers.push(segmented(h, 'image', Object.entries(SPEC_IMAGES).map(([id, v]) => [id, v[0]]), () => m.imageId, (id) => { m.imageId = id; ctx.update(); }));
        h.refreshers.push(segmented(h, 'mask', [['low', 'low pass'], ['high', 'high pass'], ['gaussian-low', 'Gaussian low'], ['gaussian-high', 'Gaussian high']], () => m.kind, (id) => { m.kind = id; ctx.update(); }));
        h.refreshers.push(resolutionRow(h, 'fourier', res, (n) => {
          if (n === res.fourier) return;
          res.fourier = n;
          // entering the view again rebuilds the radius slider for the new size; the rail stays where it was
          const rail = ctx.shell?.railEl, top = rail ? rail.scrollTop : 0;
          ctx.setView('spectrum');
          if (rail) rail.scrollTop = top;
        }));
        h.note = el('p', 'lab-note', h, '');
      });
      host.refreshers.forEach((s) => s());
      host.note.textContent = `Click or drag on the spectrum to set the radius and read a coefficient. Frequencies above ${r.n / 2} periods fold back (a frequency u counts as ${r.n} − u).`;
    },
  };
}

// ---------------------------------------------------------------- one frequency

const FREQ_INIT = { n: 8, u: 2, v: 0, phase: 0 };
const FREQ_PRESETS = [
  { label: 'k = 2 of 8 pixels (the lecture)', set: { n: 8, u: 2, v: 0, phase: Math.PI * 2 / 8 } },
  { label: 'k = 4: uniform gray', set: { n: 8, u: 4, v: 0, phase: Math.PI * 4 / 8 } },
  { label: 'k = 8: uniform black', set: { n: 8, u: 8, v: 0, phase: Math.PI } },
  { label: '4 × 4 stripes: three dots', set: { n: 4, u: 1, v: 0, phase: 0 } },
  { label: 'u = 6 of 8: aliases to 2', set: { n: 8, u: 6, v: 0, phase: 0 } },
  { label: 'diagonal (3, 2) of 16', set: { n: 16, u: 3, v: 2, phase: 0 } },
  { label: 'the highest frequency, 4 of 4', set: { n: 4, u: 2, v: 2, phase: 0 } },
];

function runFreq(m) {
  const n = m.n;
  const base = I.oneFrequency(n, n, m.u, m.v);
  const image = I.frequencyImage(n, n, m.u, m.v, m.phase);
  const zeros = new Array(n * n).fill(0);
  const spec = I.fft2d(image, zeros, n, n, false);
  const dots = [];
  for (let k = 0; k < n * n; k++) { const mg = Math.hypot(spec.re[k], spec.im[k]); if (mg > 1e-6) dots.push({ u: k % n, v: Math.floor(k / n), mag: mg }); }
  return { ...base, image, spec, dots };
}

function freqGeo(w, h, ov) {
  const a = area(ov, w, h);
  const top = splitRow({ x: a.x, y: a.y, w: a.w, h: a.h * 0.58 }, 2, 24).map((c) => ({ x: c.x, y: c.y + 14, w: c.w, h: c.h - 14 }));
  return { image: top[0], spectrum: top[1], chart: { x: a.x, y: a.y + a.h * 0.62, w: a.w, h: a.h * 0.38 } };
}

export function frequencyView() {
  return {
    id: 'frequency', topic: 'fourier', label: 'One frequency', init: FREQ_INIT, presets: FREQ_PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    params: [{ id: 'u', label: 'u', min: 0, max: 15, step: 1 }, { id: 'v', label: 'v', min: 0, max: 15, step: 1 }, { id: 'phase', label: 'phase', min: 0, max: 6.28, step: 0.05 }],
    inputTitle: 'Frequency (periods across, periods down)',
    regions: ['Fast Fourier transform', 'One frequency'], keys: {}, panelTitle: 'Grid size',
    setup(ctx) { setupOverlay(ctx, null); },
    leave: leaveOverlay,
    run: runFreq,
    draw(v, m, r, ctx) {
      paintWith(ctx, (g, w, h, ov) => {
        const L = freqGeo(w, h, ov), n = m.n;
        const sq = (box) => imageRect(box, n, n, 70);
        const ir = sq(L.image), sr = sq(L.spectrum);
        caption(g, `image: 1/2 + 1/2 cos(2π(${m.u} x / ${n} + ${m.v} y / ${n}) + φ)`, ir);
        caption(g, 'magnitude |X(u, v)|, zero frequency at the center', sr);
        drawCells(g, r.image, n, n, ir, { minCell: 30 });
        const mx = Math.max(...r.dots.map((d) => d.mag), 1e-9);
        const shown = new Array(n * n).fill(0);
        for (const d of r.dots) shown[shiftIndex(0, 0, n, n) * 0 + ((d.v + n / 2) % n) * n + ((d.u + n / 2) % n)] = d.mag / mx;
        drawCells(g, shown, n, n, sr, { color: (v2) => [20 + 235 * v2, 24 + 190 * v2, 40 + 60 * v2], minCell: 99, fmt: () => '' });
        const cs = sr.w / n;
        for (const d of r.dots) {
          const cx = sr.x + (((d.u + n / 2) % n) + 0.5) * cs, cy = sr.y + (((d.v + n / 2) % n) + 0.5) * cs;
          g.fillStyle = d.u === 0 && d.v === 0 ? '#ffd166' : '#56d4dd'; g.strokeStyle = '#0b0c10'; g.lineWidth = 2;
          g.beginPath(); g.arc(cx, cy, Math.max(4, Math.min(11, cs * 0.3)), 0, 2 * Math.PI); g.fill(); g.stroke();
          if (cs >= 24) text(g, f(d.mag, 1), cx, cy - cs * 0.42, { size: Math.min(12, cs * 0.34), align: 'center', color: '#e7eaf0' });
        }
        // row 0 as a continuous curve, with the samples, and the curve the grid cannot tell it from
        const folded = (n - (m.u % n)) % n;
        drawChart(g, L.chart, {
          x: [0, n], y: [-0.1, 1.1], xTicks: Array.from({ length: n + 1 }, (_, k) => k), yTicks: [0, 0.5, 1], xLabel: 'x (pixels)', yLabel: 'row 0',
          series: [
            { fn: (x) => 0.5 + 0.5 * Math.cos(2 * Math.PI * m.u * x / n + m.phase), color: '#56d4dd', width: 2 },
            { fn: (x) => 0.5 + 0.5 * Math.cos(2 * Math.PI * folded * x / n - m.phase), color: '#ff79c6', width: 1.5, dash: [5, 4] },
          ],
          dots: r.image.slice(0, n).map((v2, x) => ({ x, y: v2, color: '#ffd166', r: 5 })),
          labels: [{ x: 0.1, y: 1.05, t: `frequency ${m.u} (solid)`, color: '#56d4dd' }, { x: n * 0.45, y: 1.05, t: `frequency ${folded} (dashed): the same samples`, color: '#ff79c6' }],
        });
      });
    },
    explain(m, r) {
      const n = m.n;
      const dots = r.dots.map((d) => `X(${d.u}, ${d.v}) = ${f(d.mag, 2)}`).join(',  ');
      const rows = [
        `x(i, j) = 1/2 + 1/2 cos(2π({u|${m.u}} i / ${n} + {v|${m.v}} j / ${n}) + {phase|${f(m.phase, 2)}})`,
        `{mean|mean} X(0, 0) = (1/2)(${n})² = ${f(0.5 * n * n, 1)};  the cosine contributes ¼(${n})² = ${f(0.25 * n * n, 1)} at each of its dots`,
        `{dot|dot at (${m.u % n}, ${m.v % n})} and {mirror|its mirror at (${r.mirrorU}, ${r.mirrorV})} = (${n} − u, ${n} − v)`,
        `nonzero coefficients: ${dots}`,
        `samples of row 0: ${list(r.image.slice(0, n), 3)}`,
      ];
      const aboveU = (m.u % n) > n / 2 || (m.v % n) > n / 2 || m.u >= n || m.v >= n;
      const others = r.dots.filter((d) => !(d.u === 0 && d.v === 0));
      let status;
      if (m.u % n === 0 && m.v % n === 0) status = { text: `${m.u === 0 && m.v === 0 ? 'frequency 0' : `${m.u} periods on ${n} pixels folds onto frequency 0`}: no stripes, a constant image and one dot (the mean)`, tone: 'info' };
      else if (others.length === 0) status = { text: 'the stripes have vanished into the mean: every sample falls on a zero crossing of the cosine', tone: 'warn' };
      else if (others.length === 1) status = { text: 'the highest frequency the grid holds is its own mirror: one dot besides the mean, not a pair', tone: 'info' };
      else if (aboveU) status = { text: `above the limit of ${n / 2} periods: the samples are those of frequency ${r.folded} (${n} − ${m.u % n}); the stripes masquerade`, tone: 'bad' };
      else status = { text: `three dots: the mean and the pair (${m.u}, ${m.v}) and (${r.mirrorU}, ${r.mirrorV}), one on each side of the center`, tone: 'ok' };
      return { hud: `{dot|(${m.u}, ${m.v})} and {mirror|(${r.mirrorU}, ${r.mirrorV})}: ${r.dots.length} dots`, rows, status, values: [['grid', `${n} × ${n}`, null], ['limit', `${n / 2} periods`, null], ['folded', String(r.folded), 'dot'], ['dots', String(r.dots.length), 'dot']] };
    },
    panel(host, m, r, ctx) {
      once(host, 'frequency', (h) => {
        h.refreshers.push(segmented(h, 'grid', [[4, '4 × 4'], [8, '8 × 8'], [16, '16 × 16']], () => m.n, (v) => { m.n = v; ctx.update(); }));
        el('p', 'lab-note', h, 'Phase is where the first sample falls on the cosine: π k / 8 puts the samples at pixel centers, as the lecture does.');
      });
      host.refreshers.forEach((s) => s());
    },
  };
}

// ---------------------------------------------------------------- the convolution theorem

const THM_KERNELS = [['gauss3', 'Gaussian 3×3'], ['box3', 'box 3×3'], ['gauss5', 'Gaussian 5×5'], ['sobelX', 'Sobel x'], ['laplacian', 'Laplacian'], ['sharpen', 'sharpen']];
const THM_INIT = { kernelId: 'box3' };
const THM_PRESETS = [
  { label: 'box: the spectrum goes negative', set: { kernelId: 'box3' } },
  { label: 'Gaussian: smooth, positive', set: { kernelId: 'gauss3' } },
  { label: 'Sobel x: not symmetric', set: { kernelId: 'sobelX' } },
  { label: 'Laplacian', set: { kernelId: 'laplacian' } },
];
function runTheorem(m, n = 32) {
  const img = sceneAt(n), k = I.makeKernel(m.kernelId);
  const byFreq = I.convolveByFrequency(img, n, n, k.values, k.size);
  const direct = I.convolve(img, n, n, k.values, k.size, 'wrap');
  let diff = 0;
  for (let q = 0; q < img.length; q++) diff = Math.max(diff, Math.abs(byFreq.image[q] - direct.image[q]));
  return { n, img, k, ...byFreq, direct, diff, productImage: byFreq.image };
}
export function theoremView(res = makeResolution()) {
  const geo = (w, h, ov, n) => {
    const a = area(ov, w, h);
    const cols = splitRow({ x: a.x, y: a.y, w: a.w, h: a.h * 0.5 }, 3, 18).map((c) => imageRect({ x: c.x, y: c.y + 14, w: c.w, h: c.h - 14 }, n, n, 12));
    const bot = splitRow({ x: a.x, y: a.y + a.h * 0.54, w: a.w, h: a.h * 0.46 }, 3, 18).map((c) => imageRect({ x: c.x, y: c.y + 14, w: c.w, h: c.h - 14 }, n, n, 12));
    return { image: cols[0], kernel: cols[1], product: cols[2], direct: bot[0], byFreq: bot[1], diff: bot[2] };
  };
  return {
    id: 'theorem', topic: 'fourier', label: 'Convolution theorem', init: THM_INIT, presets: THM_PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['Fast Fourier transform', 'Convolution theorem', 'Convolution of an image'], keys: {}, panelTitle: 'Kernel',
    setup(ctx) { setupOverlay(ctx, null); },
    leave: leaveOverlay,
    run(m) { return runTheorem(m, res.fourier); },
    draw(v, m, r, ctx) {
      paintWith(ctx, (g, w, h, ov) => {
        const n = r.n, L = geo(w, h, ov, n);
        const sh = (arr) => Array.from({ length: n * n }, (_, k) => arr[shiftIndex(k % n, Math.floor(k / n), n, n)]);
        const km = Math.max(...r.kernelRe.map(Math.abs), 1e-9), pm = Math.max(...r.productRe.map((a, q) => Math.hypot(a, r.productIm[q])), 1e-9);
        caption(g, 'image x', L.image); caption(g, 'F(K), real part (blue +, red −)', L.kernel); caption(g, 'log |F(K) F(x)|', L.product);
        caption(g, 'K * x, wrapped borders, in space', L.direct); caption(g, 'inverse transform of F(K) F(x)', L.byFreq); caption(g, 'difference (×10¹², mid-gray 0)', L.diff);
        drawBitmap(g, bitmapOf(r.img, n, n), L.image);
        drawBitmap(g, bitmapOf(sh(r.kernelRe), n, n, signedRgb(km)), L.kernel);
        drawBitmap(g, bitmapOf(sh(r.productRe.map((a, q) => Math.log(1 + Math.hypot(a, r.productIm[q])) / Math.log(1 + pm))), n, n), L.product);
        const sc = Math.max(Math.abs(r.direct.low), Math.abs(r.direct.high), 1e-9);
        const flat = r.k.values.some((q) => q < 0);
        const col = flat ? (q) => grayRgb(0.5 + 0.5 * q / sc) : grayRgb;
        drawBitmap(g, bitmapOf(r.direct.image, n, n, col), L.direct);
        drawBitmap(g, bitmapOf(r.productImage, n, n, col), L.byFreq);
        drawBitmap(g, bitmapOf(r.productImage.map((q, i) => 0.5 + 5e11 * (q - r.direct.image[i])), n, n), L.diff);
        text(g, '×', L.kernel.x + L.kernel.w + 9, L.kernel.y + L.kernel.h / 2, { size: 18, align: 'center' });
        text(g, `max difference ${r.diff.toExponential(1)}`, L.diff.x, L.diff.y + L.diff.h + 16, { size: 12, color: '#7ee787' });
      });
    },
    explain(m, r) {
      const neg = r.kernelRe.some((q) => q < -0.02);
      const rows = [
        `F(K * x) = F(K) · F(x): each frequency is scaled by the kernel's response there`,
        `kernel ${m.kernelId}, ${r.k.size} × ${r.k.size}, placed flipped at the corner of a ${r.n} × ${r.n} array and transformed`,
        `F(K)(0, 0) = {gain|${f(r.kernelRe[0], 4)}} = the sum of the kernel; smallest real part ${f(Math.min(...r.kernelRe), 3)}, largest ${f(Math.max(...r.kernelRe), 3)}`,
        `by the formula (nested sums): K * x; by frequency: 3 transforms of ${r.n * r.n} pixels; largest difference {diff|${r.diff.toExponential(2)}}`,
      ];
      const status = r.diff < 1e-9 ? { text: neg ? 'the results agree; the kernel\'s spectrum goes negative, so those frequencies come back inverted' : 'the two results agree to rounding', tone: 'ok' } : { text: 'the results differ', tone: 'bad' };
      return { hud: `F(K * x) = F(K) · F(x)   max difference {diff|${r.diff.toExponential(1)}}`, rows, status, values: [['DC gain', f(r.kernelRe[0], 4), 'gain'], ['min of F{K}', f(Math.min(...r.kernelRe), 3), null], ['difference', r.diff.toExponential(1), 'diff'], ['cost', 'n log n', null]] };
    },
    panel(host, m, r, ctx) {
      once(host, 'theorem', (h) => {
        h.refreshers.push(segmented(h, 'kernel', THM_KERNELS, () => m.kernelId, (id) => { m.kernelId = id; ctx.update(); }));
        h.refreshers.push(resolutionRow(h, 'fourier', res, (n) => { res.fourier = n; ctx.update(); }));
      });
      host.refreshers.forEach((s) => s());
    },
  };
}

// ---------------------------------------------------------------- the response of a 3-tap kernel

const TAPS = { binomial: [0.25, 0.5, 0.25], box: [1 / 3, 1 / 3, 1 / 3], five: [1 / 16, 4 / 16, 6 / 16, 4 / 16, 1 / 16] };
const TAP_NAME = { binomial: 'binomial [1 2 1]/4', box: 'box [1 1 1]/3', five: 'binomial [1 4 6 4 1]/16' };
const RESP_INIT = { tapId: 'box', step: 12 };
const RESP_PRESETS = [
  { label: 'flat, ω = 0', set: { tapId: 'box', step: 0 } },
  { label: 'period 4 px, ω = π/2', set: { tapId: 'box', step: 6 } },
  { label: 'period 3 px, ω = 2π/3', set: { tapId: 'box', step: 8 } },
  { label: 'period 2 px: the box inverts it', set: { tapId: 'box', step: 12 } },
  { label: 'period 2 px: the binomial kills it', set: { tapId: 'binomial', step: 12 } },
];
function runResponse(m) {
  const taps = TAPS[m.tapId], omega = m.step * Math.PI / 12;
  const signal = Array.from({ length: 24 }, (_, t) => Math.cos(omega * t));
  const output = I.convolve1d(signal, taps, 'wrap');
  const resp = I.frequencyResponse(taps, omega);
  const table = [0, Math.PI / 2, (2 * Math.PI) / 3, Math.PI].map((o) => ({ omega: o, bin: I.frequencyResponse(TAPS.binomial, o).re, box: I.frequencyResponse(TAPS.box, o).re }));
  return { taps, omega, signal, output, ...resp, table };
}
export function responseView() {
  const geo = (w, h, ov) => { const a = area(ov, w, h); return { top: { x: a.x, y: a.y + 14, w: a.w, h: a.h * 0.46 }, bottom: { x: a.x, y: a.y + a.h * 0.54 + 14, w: a.w, h: a.h * 0.46 - 14 } }; };
  return {
    id: 'response', topic: 'fourier', label: '3-tap responses', init: RESP_INIT, presets: RESP_PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    params: [{ id: 'step', label: 'ω / (π/12)', min: 0, max: 12, step: 1 }], inputTitle: 'Frequency ω (radians per pixel)',
    regions: ['Frequency response of a kernel'], keys: {}, panelTitle: 'Kernel',
    setup(ctx) { setupOverlay(ctx, null); },
    leave: leaveOverlay,
    run: runResponse,
    draw(v, m, r, ctx) {
      paintWith(ctx, (g, w, h, ov) => {
        const L = geo(w, h, ov);
        caption(g, 'cos(ω t), 24 samples, wrapped borders: input (blue), output of the kernel (gold)', L.top);
        const stem = (data, color, dx) => ({ pts: data.map((y, t) => [t + dx, y]), color, width: 0 });
        const c1 = drawChart(g, L.top, { x: [-0.5, 24], y: [-1.15, 1.15], xTicks: [0, 4, 8, 12, 16, 20], yTicks: [-1, 0, 1], xLabel: 't', hlines: [{ y: 0 }], series: [], dots: [...r.signal.map((y, t) => ({ x: t, y, color: '#79c0ff', r: 4 })), ...r.output.map((y, t) => ({ x: t + 0.0, y, color: '#ffd166', r: 3 }))] });
        for (let t = 0; t < 24; t++) { g.strokeStyle = 'rgba(121,192,255,0.35)'; g.beginPath(); g.moveTo(c1.X(t), c1.Y(0)); g.lineTo(c1.X(t), c1.Y(r.signal[t])); g.stroke(); }
        caption(g, 'response H(ω) of the two 3-tap kernels', L.bottom);
        drawChart(g, L.bottom, {
          x: [0, Math.PI], y: [-0.5, 1.1], xTicks: [{ v: 0, t: '0' }, { v: Math.PI / 2, t: 'π/2' }, { v: 2 * Math.PI / 3, t: '2π/3' }, { v: Math.PI, t: 'π' }], yTicks: [-0.333, 0, 0.5, 1], xLabel: 'ω', hlines: [{ y: 0 }],
          vlines: [{ x: r.omega }],
          series: [{ fn: (o) => I.frequencyResponse(TAPS.binomial, o).re, color: '#7ee787' }, { fn: (o) => I.frequencyResponse(TAPS.box, o).re, color: '#79c0ff' }],
          dots: [{ x: r.omega, y: r.re, color: '#ffd166', r: 6 }],
          labels: [{ x: 0.1, y: 0.2, t: 'binomial ½ + ½ cos ω', color: '#7ee787' }, { x: 0.1, y: -0.3, t: 'box (1 + 2 cos ω) / 3', color: '#79c0ff' }],
        });
      });
    },
    explain(m, r) {
      const k = m.step, cat = k === 0 ? 'flat' : `period ${f(24 / k, 2)} px`;
      const ratioAt = r.signal.findIndex((x) => Math.abs(x) > 0.5);
      const measured = ratioAt >= 0 ? r.output[ratioAt] / r.signal[ratioAt] : NaN;
      const rows = [
        `{omega|ω} = ${k}π/12 = ${f(r.omega, 3)} rad per pixel (${cat})`,
        `{binomial|binomial [1 2 1]/4}: H = ½ + ½ cos ω = {binomial|${f(r.table[0] && I.frequencyResponse(TAPS.binomial, r.omega).re, 3)}}`,
        `{box|box [1 1 1]/3}: H = (1 + 2 cos ω) / 3 = {box|${f(I.frequencyResponse(TAPS.box, r.omega).re, 3)}}`,
        `selected: ${TAP_NAME[m.tapId]}, {gain|H = ${f(r.re, 3)}}; output / input at t = ${ratioAt} is ${f(measured, 3)}`,
        `table: ω = 0, π/2, 2π/3, π  →  binomial ${list(r.table.map((e) => e.bin), 3)},  box ${list(r.table.map((e) => e.box), 3)}`,
      ];
      const status = Math.abs(r.re) < 1e-9 ? { text: 'H = 0: this frequency is removed completely', tone: 'ok' } : r.re < -1e-9 ? { text: `H is negative (${f(r.re, 3)}): the stripes come out inverted at ${f(Math.abs(r.re) * 100, 1)} % of their contrast`, tone: 'warn' }
        : Math.abs(r.re - 1) < 1e-9 ? { text: 'H = 1: a flat image passes unchanged', tone: 'ok' } : { text: `H = ${f(r.re, 3)}: the stripes keep ${f(r.re * 100, 1)} % of their contrast`, tone: 'info' };
      return { hud: `H(ω) = {gain|${f(r.re, 3)}} for ${TAP_NAME[m.tapId]}`, rows, status, values: [['ω', f(r.omega, 3), 'omega'], ['H', f(r.re, 3), 'gain'], ['measured', f(measured, 3), null], ['imaginary part', f(r.im, 3), null]] };
    },
    panel(host, m, r, ctx) {
      once(host, 'response', (h) => { h.refreshers.push(segmented(h, 'kernel', Object.entries(TAP_NAME), () => m.tapId, (id) => { m.tapId = id; ctx.update(); })); });
      host.refreshers.forEach((s) => s());
    },
  };
}
