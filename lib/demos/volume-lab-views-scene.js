// volume-lab-views-scene: the last two topics of the volume-lab demo (runtime: lib/core/lab.js): positional encoding (what a fixed set of
// sines and cosines gives a network, and the footprint that switches the fine ones off) and a small 3D volume rendered one ray per pixel by
// the same function. Each view calls the program's own functions (lib/programs/volume-lab/webgl/volumelab.js).
import * as VL from '../programs/volume-lab/webgl/volumelab.js';
import { C, text, el, btn, once, segmented, setupOverlay, leaveOverlay, overlayFor, ImageJob } from './volume-lab-draw.js';
import { rayPlots, fitPlot, errorByL, dampingPlot, averagePlot, encodingBars, volumeImage, topDown, niceMax } from './volume-lab-plots.js';
import { f, f3, BLACK, WHITE, cached, sampleRows, sumRows, backgroundStatus, tableHtml, bindTable } from './volume-lab-kit.js';

const HOME = { eye: [0, 2, 6], target: [0, 0, 0] };
function paintOverlay(ctx, painter) {
  if (!ctx.sceneEl) return;
  const ov = overlayFor(ctx);
  ov.painter = (g) => painter(g, ov.area(), ov);
  ov.repaint();
}

// ---------------------------------------------------------------- the scene of blobs
/** the image is SIZE x SIZE pixels unless the rail's resolution row says otherwise; every size is a multiple of 16, so the lecture's
 *  pixel (600, 250) of 800 x 800 is a whole pixel at each */
export const SIZE = 128;
export const SIZES = [64, 128, 192, 256];
/** the resolution of a view's image */
export const sizeOf = (m) => (SIZES.includes(m.res) ? m.res : SIZE);
/** the pixel index at size S of a position given as a fraction of the image */
const indexAt = (fr, S) => Math.min(S - 1, Math.max(0, Math.floor(fr * S + 1e-9)));
export const FOV = 0.6911;
export const DISTANCE = 4;
export const NEAR3 = 2.2;
export const FAR3 = 5.8;
/** the volume: three blobs of density, a red one, a green one and a blue one; scale multiplies every height */
export function blobsOf(scale) {
  return [
    0, 0, 0, 0.5, 1.5 * scale, 0.9, 0.2, 0.2,
    0.5, 0.3, -0.2, 0.35, 3 * scale, 0.2, 0.9, 0.3,
    -0.45, -0.25, 0.3, 0.3, 5 * scale, 0.3, 0.4, 0.95,
  ];
}

export function makeSceneViews() {
  // ============================================================ Encoding: fitting a signal
  const fit = {
    id: 'encode.fit', topic: 'encode', label: 'Fit a signal', inputTitle: 'The encoding', home: HOME, grid: 'none', axes: false,
    init: { L: 4, count: 96, noise: 0, seed: 1, probe: 0.3 },
    params: [{ id: 'L', label: 'frequencies L', min: 0, max: 10, step: 1 }, { id: 'count', label: 'training points', min: 12, max: 192, step: 4 }, { id: 'noise', label: 'noise', min: 0, max: 0.3, step: 0.01 }],
    panelTitle: 'The training points',
    presets: [
      { label: 'the raw coordinate, L = 0', set: { L: 0, count: 96, noise: 0, probe: 0.3 } },
      { label: 'the lecture: p = 0.3, L = 4', set: { L: 4, count: 96, noise: 0, probe: 0.3 } },
      { label: 'L = 10, 96 points', set: { L: 10, count: 96, noise: 0, probe: 0.3 } },
      { label: 'L = 10, 48 noisy points', set: { L: 10, count: 48, noise: 0.1, probe: 0.3 } },
      { label: 'L = 3, 48 noisy points', set: { L: 3, count: 48, noise: 0.1, probe: 0.3 } },
    ],
    regions: ['Positional encoding', 'Fitting a signal'],
    setup(ctx) {
      this.ctx = ctx;
      const probeAt = (x) => {
        const p = this.layout?.fit;
        if (!p || x < p.x0 || x > p.x1) return;
        ctx.state().probe = Math.round(Math.min(0.999, Math.max(0.001, p.dataX(x))) * 100) / 100;
        ctx.update();
      };
      setupOverlay(ctx, { down: probeAt, move: probeAt });
    },
    leave(ctx) { leaveOverlay(ctx); },
    edited(m) { m.L = Math.max(0, Math.min(10, Math.round(m.L))); m.count = Math.max(12, Math.round(m.count)); },
    run(m) {
      const L = Math.round(m.L), count = Math.round(m.count);
      const fitted = VL.fitSignal(L, count, m.noise, m.seed, 240);
      const byL = cached(`byL|${count}|${m.noise}|${m.seed}`, () => {
        const out = { train: [], test: [] };
        for (let k = 0; k <= 10; k++) { const q = VL.fitSignal(k, count, m.noise, m.seed, 240); out.train.push(q.trainError); out.test.push(q.testError); }
        return out;
      });
      const code = VL.positionalEncoding(m.probe, L);
      const best = byL.test.indexOf(Math.min(...byL.test));
      return { ...fitted, ...code, L, count, byL, best, probe: m.probe };
    },
    draw(v, m, r, ctx) { paintOverlay(ctx, (g, area) => this.paint(g, area, m, r)); },
    paint(g, area, m, r) {
      const compact = area.h < 260;
      const top = { x: area.x, y: area.y, w: area.w, h: compact ? area.h : area.h * 0.44 };
      this.layout = {};
      this.layout.fit = fitPlot(g, top, { fit: r, yLo: -0.35, yHi: 1.6, yticks: [0, 0.5, 1, 1.5], probe: r.probe, title: `a density along a line, fitted from ${r.count} points with L = ${r.L}` });
      if (compact) return;
      const yHi = niceMax(Math.max(0.3, ...r.byL.test.map((e) => Math.min(e, 1.2)), ...r.byL.train), 0.3);
      errorByL(g, { x: area.x, y: area.y + area.h * 0.46, w: area.w * 0.5 - 4, h: area.h * 0.54 }, { train: r.byL.train, test: r.byL.test, L: r.L, yHi });
      encodingBars(g, { x: area.x + area.w * 0.5 + 4, y: area.y + area.h * 0.46, w: area.w * 0.5 - 4, h: area.h * 0.54 }, { code: r, x: r.probe });
    },
    explain(m, r) {
      const pairs = [];
      for (let k = 0; k < Math.min(r.L, 4); k++) pairs.push(`k=${k}: ${f(r.features[2 * k], 3)}, ${f(r.features[2 * k + 1], 3)}`);
      const e = r.testError, bestE = r.byL.test[r.best];
      const status = r.L === 0 ? { text: `the raw coordinate: held-out error ${f(e, 3)}; the fit is smooth and the edges are blurred`, tone: 'warn' }
        : r.L === r.best ? { text: `L = ${r.L} has the lowest held-out error of L = 0 to 10 here: ${f(e, 3)}`, tone: 'ok' }
          : r.L < r.best ? { text: `too few frequencies: held-out error ${f(e, 3)}, against ${f(bestE, 3)} at L = ${r.best}`, tone: 'warn' }
            : e > 1.5 * bestE ? { text: `too many for ${r.count} points: the fit passes through the points (training error ${f(r.trainError, 3)}) and is rough between them (held-out ${f(e, 3)})`, tone: 'bad' }
              : { text: `held-out error ${f(e, 3)}, close to the best, ${f(bestE, 3)} at L = ${r.best}`, tone: 'info' };
      return {
        hud: `{L|L = ${r.L}}: training error {train|${f(r.trainError, 3)}}, held-out error {fit|${f(r.testError, 3)}}`,
        rows: [
          r.L === 0 ? 'L = 0: the network sees only the coordinate x' : `{gamma|γ(p)} = (sin πp, cos πp, sin 2πp, cos 2πp, …, sin 2^${r.L - 1}πp, cos 2^${r.L - 1}πp): ${2 * r.L} numbers for one`,
          r.L === 0 ? `p = ${f(r.probe, 2)} stays one number` : `p = ${f(r.probe, 2)}, L = ${r.L}: ${pairs.join('   ')}${r.L > 4 ? '   …' : ''}`,
          r.L === 0 ? 'no frequencies, so the highest period is the whole interval' : `frequencies π, 2π, …, ${f(r.frequencies[r.L - 1] / Math.PI, 0)}π; the finest sine has period 2 / 2^${r.L - 1} = {L|${f(r.smallestPeriod, 4)}}`,
          'a neural radiance field (NeRF) uses L = 10 for a position (3 × 20 = 60 numbers, 63 with the raw coordinates) and L = 4 for a direction',
          `the network: ${1 + 2 * r.L} inputs, 64 tanh units with fixed random weights, ${r.columns} output weights found by least squares (closed form)`,
          `error: {train|training ${f(r.trainError, 3)}} on ${r.count} points${m.noise > 0 ? ` with noise ±${f(m.noise, 2)}` : ''}; {fit|held-out ${f(r.testError, 3)}} on 240 points against the noise-free signal`,
        ],
        status,
        values: [['L', String(r.L), 'L'], ['inputs', String(1 + 2 * r.L)], ['training error', f(r.trainError, 3), 'train'], ['held-out error', f(r.testError, 3), 'fit'], ['best L here', String(r.best), 'L'], ['finest period', r.L ? f(r.smallestPeriod, 4) : 'none', 'L']],
        fact: 'Click the signal to move p. Fed raw coordinates, a network with default weights makes smooth, blurry fields; sines and cosines of doubling frequency give it the fine scales. Too many frequencies for the data let it fit the noise between the points.',
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'fit', (h) => {
        const row = el('div', 'lab-btns', h);
        btn(row, 'new noise', () => { const s = ctx.state(); s.seed = (s.seed % 97) + 1; ctx.update(); }, 'The next seeded draw of the noise');
        el('div', 'vl-tablebox', h);
      });
      let t = '<table class="mat-panel lab-values vl-table"><tbody><tr><td class="value-label">k</td><td class="value-label">ω = 2ᵏπ</td><td class="value-label">sin ωp</td><td class="value-label">cos ωp</td></tr>';
      for (let k = 0; k < r.L; k++) t += `<tr><td>${k}</td><td>${f(r.frequencies[k] / Math.PI, 0)}π</td><td>${f(r.features[2 * k], 3)}</td><td>${f(r.features[2 * k + 1], 3)}</td></tr>`;
      if (!r.L) t += '<tr><td colspan="4" class="value-label">L = 0: no encoding</td></tr>';
      host.querySelector('.vl-tablebox').innerHTML = `${t}</tbody></table>`;
    },
  };

  // ============================================================ Encoding: the footprint
  const foot = {
    id: 'encode.footprint', topic: 'encode', label: 'Footprint', inputTitle: 'A pixel\'s footprint', home: HOME, grid: 'none', axes: false,
    init: { sigma1000: 2, L: 10, k: 6, mu: 0.3 },
    params: [{ id: 'sigma1000', label: 'footprint σ (×0.001)', min: 0, max: 10, step: 0.1 }, { id: 'L', label: 'frequencies L', min: 2, max: 10, step: 1 }, { id: 'k', label: 'show frequency k', min: 0, max: 9, step: 1 }],
    panelTitle: 'Frequencies the footprint keeps',
    presets: [
      { label: 'the lecture: σ = 0.002', set: { sigma1000: 2, L: 10, k: 8 } },
      { label: 'a close view: σ = 0.0005', set: { sigma1000: 0.5, L: 10, k: 8 } },
      { label: 'a far view: σ = 0.008', set: { sigma1000: 8, L: 10, k: 6 } },
      { label: 'no footprint', set: { sigma1000: 0, L: 10, k: 9 } },
    ],
    regions: ['Positional encoding'],
    setup(ctx) { setupOverlay(ctx, { hover() {} }); },
    leave(ctx) { leaveOverlay(ctx); },
    edited(m) { m.L = Math.max(2, Math.round(m.L)); m.k = Math.min(Math.round(m.k), m.L - 1); },
    run(m) {
      const L = Math.round(m.L), sigma = m.sigma1000 / 1000;
      const damping = VL.frequencyDamping(L, sigma);
      const k = Math.min(Math.round(m.k), L - 1);
      const code = VL.positionalEncoding(m.mu, L);
      return { ...damping, ...code, L, sigma, k, damping, omega: damping.omegas[k], factor: damping.factors[k], mu: m.mu };
    },
    draw(v, m, r, ctx) { paintOverlay(ctx, (g, area) => this.paint(g, area, m, r)); },
    paint(g, area, m, r) {
      const compact = area.h < 260;
      dampingPlot(g, { x: area.x, y: area.y, w: area.w, h: compact ? area.h : area.h * 0.5 }, { damping: r.damping, sigma: r.sigma, selected: r.k });
      if (compact) return;
      averagePlot(g, { x: area.x, y: area.y + area.h * 0.52, w: area.w, h: area.h * 0.48 }, { sigma: Math.max(r.sigma, 1e-4), mu: r.mu, omega: r.omega, factor: r.factor });
    },
    explain(m, r) {
      const kept = r.factors.filter((x) => x > 0.5).length;
      const at = (om) => { const i = r.omegas.findIndex((o) => Math.abs(o - om) < 1e-6); return i >= 0 ? `${f(om / Math.PI, 0)}π: ${f(r.factors[i], 3)}` : null; };
      const list = [Math.PI, 8 * Math.PI, 64 * Math.PI, 256 * Math.PI, 512 * Math.PI].map(at).filter(Boolean).join(', ');
      return {
        hud: `{damp|σ = ${f(r.sigma, 4)}}: ${kept} of ${r.L} frequencies keep at least half their amplitude`,
        rows: [
          `E[sin(ωx)] for x ~ N(μ, σ²) = sin(ωμ) · {damp|exp(−½ ω² σ²)}`,
          `k = ${r.k}: ω = 2^${r.k}π = ${f(r.omega / Math.PI, 0)}π, factor exp(−½ × ${f(r.omega, 1)}² × ${f(r.sigma, 4)}²) = {damp|${f(r.factor, 3)}}`,
          `at μ = ${f(r.mu, 2)}: sin(ωμ) = ${f(Math.sin(r.omega * r.mu), 3)}, so the encoding entry is ${f(Math.sin(r.omega * r.mu) * r.factor, 3)} instead`,
          `factors at ${list}`,
          `a frequency finer than the footprint is switched off: ω σ = ${f(r.omega * r.sigma, 2)}${r.omega * r.sigma > 1 ? ', above 1' : ', below 1'}`,
        ],
        status: r.sigma === 0 ? { text: 'no footprint: every frequency passes at full amplitude (a thin ray)', tone: 'info' }
          : r.factor < 0.05 ? { text: `frequency ${r.k} is switched off: the footprint averages the sine to ${f(r.factor, 3)} of its amplitude`, tone: 'warn' }
            : r.factor > 0.95 ? { text: `frequency ${r.k} passes almost unchanged: ${f(r.factor, 3)}`, tone: 'ok' }
              : { text: `frequency ${r.k} is damped to ${f(r.factor, 3)}`, tone: 'info' },
        values: [['σ', f(r.sigma, 4), 'damp'], ['L', String(r.L), 'L'], ['k', String(r.k)], ['ω', `${f(r.omega / Math.PI, 0)}π`], ['factor', f(r.factor, 3), 'damp'], ['kept', `${kept} of ${r.L}`]],
        fact: 'Mip-NeRF (Barron and others, 2021) encodes a Gaussian region instead of a point, so a scene trained close up does not alias when seen from far away: the same prefiltering as in the antialiasing lecture, applied to a network\'s input.',
      };
    },
  };

  // ============================================================ Volume: one ray per pixel
  const volume = {
    id: 'volume.render', topic: 'volume', label: 'A small volume', inputTitle: 'The camera and the samples', home: HOME, grid: 'none', axes: false,
    // the picked pixel is kept as a fraction of the image (fx, fy), so it stays on the same spot at every resolution; run() writes its
    // index at the current size to pi, pj
    init: { az: 0.5, el: 0.3, n: 32, scale: 1, mode: 'regular', bg: 'black', seed: 1, fx: 0.5, fy: 0.46875, sel: -1 },
    params: [{ id: 'az', label: 'azimuth', min: -3.1, max: 3.1, step: 0.05 }, { id: 'el', label: 'elevation', min: -1.2, max: 1.2, step: 0.05 }, { id: 'n', label: 'N per ray', min: 4, max: 128, step: 4 }, { id: 'scale', label: 'density ×', min: 0.2, max: 4, step: 0.1 }],
    panelTitle: 'The picked ray',
    presets: [
      { label: 'the lecture\'s pixel (600, 250)', set: { fx: 600 / 800, fy: 250 / 800, az: 0.5, el: 0.3, n: 32, scale: 1 } },
      { label: 'through the red blob', set: { fx: 0.5, fy: 0.5, az: 0.5, el: 0.3 } },
      { label: 'N = 8: banding', set: { n: 8 } },
      { label: 'N = 8, stratified: grain', set: { n: 8, mode: 'stratified' } },
      { label: 'dense: nearly solid', set: { scale: 4, n: 64 } },
    ],
    regions: ['The camera ray for a pixel', 'A volume of blobs'],
    job: null,
    setup(ctx) {
      this.ctx = ctx;
      const pickAt = (x, y) => {
        const r = this.layout?.image;
        if (!r || x < r.x || y < r.y || x >= r.x + r.w || y >= r.y + r.h) return;
        const m = ctx.state(), S = sizeOf(m);
        // the center of the clicked pixel, so a change of resolution keeps the spot
        m.fx = (indexAt((x - r.x) / r.w, S) + 0.5) / S;
        m.fy = (indexAt((y - r.y) / r.h, S) + 0.5) / S;
        m.sel = -1;
        ctx.update();
      };
      const ov = setupOverlay(ctx, { down: pickAt, move: pickAt });
      if (ov) ov.cv.style.cursor = 'crosshair';
    },
    leave(ctx) { this.job?.cancel(); leaveOverlay(ctx); const ov = overlayFor(ctx); ov.cv.style.cursor = ''; },
    enter(m) { m.res = sizeOf(m); },
    edited(m) { m.n = Math.max(4, Math.round(m.n)); m.fx = Math.min(1, Math.max(0, m.fx)); m.fy = Math.min(1, Math.max(0, m.fy)); },
    run(m) {
      const S = sizeOf(m);
      m.pi = indexAt(m.fx, S);
      m.pj = indexAt(m.fy, S);
      const blobs = blobsOf(m.scale);
      const n = Math.max(4, Math.round(m.n));
      const bg = m.bg === 'white' ? WHITE : BLACK;
      // the lecture's convention: pixel (i, j) looks along ((i - size/2) / f, -(j - size/2) / f, -1), through the pixel's corner
      const cam = VL.cameraRay(m.pi, m.pj, S, FOV, m.az, m.el, DISTANCE);
      const rng = VL.makeRng((m.seed ?? 1) * 7919);
      const ray = VL.renderVolumeRay(blobs, cam.origin, cam.direction, NEAR3, FAR3, n, m.mode, 0.5, rng, bg);
      const dense = VL.renderVolumeRay(blobs, cam.origin, cam.direction, NEAR3, FAR3, 320, 'regular', 0.5, VL.makeRng(1), BLACK);
      let best = -1;
      ray.weights.forEach((w, i) => { if (w > 1e-9 && (best < 0 || w > ray.weights[best] + 1e-12)) best = i; });
      const selected = m.sel >= 0 && m.sel < n ? m.sel : best;
      const lecture = VL.cameraRay((m.pi / S) * 800, (m.pj / S) * 800, 800, FOV, m.az, m.el, DISTANCE);
      return { ...ray, ...cam, cam, blobs, dense, n, selected, binWidth: ray.deltas[0], bgc: bg, lecture, yMax: niceMax(Math.max(...dense.sigmas) * 1.1, 1), px800: (m.pi / S) * 800, py800: (m.pj / S) * 800, size: S, pi: m.pi, pj: m.pj };
    },
    draw(v, m, r, ctx) {
      if (ctx.sceneEl) {
        const ov = overlayFor(ctx);
        this.job ??= new ImageJob();
        const S = r.size;
        const key = `${S}|${m.az}|${m.el}|${m.n}|${m.scale}|${m.mode}|${m.bg}|${m.seed}`;
        const bg = r.bgc, blobs = r.blobs, n = Math.round(m.n), mode = m.mode;
        const rng = VL.makeRng((m.seed ?? 1) * 7919);
        this.job.start(key, S, S, (i, j) => {
          const c = VL.cameraRay(i, j, S, FOV, m.az, m.el, DISTANCE);
          return VL.renderVolumeRay(blobs, c.origin, c.direction, NEAR3, FAR3, n, mode, 0.5, rng, bg).pixel;
        }, () => ov.repaint());
      }
      paintOverlay(ctx, (g, area) => this.paint(g, area, m, r));
    },
    paint(g, area, m, r) {
      const imgBox = { x: area.x, y: area.y, w: area.w - 206, h: area.h };
      this.layout = {};
      const job = this.job;
      this.layout.image = volumeImage(g, imgBox, { canvas: job?.canvas, done: job ? job.done : true, progress: job && job.h ? job.row / job.h : 1, pick: { i: r.pi, j: r.pj }, size: r.size });
      const inset = { x: area.x + area.w - 196, y: area.y, w: 196, h: 196 };
      topDown(g, inset, { blobs: r.blobs, camera: r.cam, ray: r, rayDir: r.direction, near: NEAR3, far: FAR3 });
      const lines = [`${r.size} × ${r.size} pixels, ${r.n} samples per ray`, `pixel (${r.pi}, ${r.pj}), click to pick`, `color ${f3(r.pixel, 2)}`, `T_end ${f(r.tEnd, 3)}, depth ${r.weightSum > 1e-6 ? f(r.depth, 2) : 'none'}`];
      lines.forEach((t, i) => text(g, t, inset.x, inset.y + inset.h + 18 + i * 16, { size: 11.5, color: i === 2 ? C.sigma : C.dim, halo: false }));
    },
    explain(m, r) {
      const half = r.size / 2;
      const status = r.weightSum < 1e-3 ? { text: 'this ray misses the volume: the pixel is the background', tone: 'info' } : backgroundStatus(r);
      return {
        hud: `pixel (${r.pi}, ${r.pj}): {C|C = ${f3(r.color, 2)}}, {w|Σ w = ${f(r.weightSum, 3)}}, {T|T_end = ${f(r.tEnd, 3)}}`,
        rows: [
          `{ray|f} = (${r.size} / 2) / tan(${f(FOV, 4)} / 2) = ${f(r.focal, 1)} px; at 800 × 800 (the lecture's images) f = ${f(r.lecture.focal, 1)} px`,
          `direction in camera space ((i − ${half}) / f, −(j − ${half}) / f, −1) = ({ray|${f(r.cameraDir[0], 3)}, ${f(r.cameraDir[1], 3)}, −1})`,
          `the same pixel at 800 × 800 is (${f(r.px800, 0)}, ${f(r.py800, 0)}); its direction is (${f(r.lecture.cameraDir[0], 3)}, ${f(r.lecture.cameraDir[1], 3)}, −1)`,
          `world ray: o = ${f3(r.origin, 2)}, d = ${f3(r.direction, 3)}; samples at s from ${NEAR3} to ${FAR3}, step δ = ${f(r.binWidth, 3)}`,
          ...sampleRows(r, r.selected),
          ...sumRows(r, r.bgc).slice(0, 3),
        ],
        status,
        values: [['pixel', `(${r.pi}, ${r.pj})`], ['f', `${f(r.focal, 1)} px`, 'ray'], ['N', String(r.n)], ['Σ w', f(r.weightSum, 3), 'w'], ['T_end', f(r.tEnd, 3), 'T'], ['depth', r.weightSum > 1e-6 ? f(r.depth, 3) : 'none', 'depth']],
        fact: 'Every pixel runs the same function as the single ray: a camera ray, N samples, a density and a color from the field at each, the sum of w · c. Click the image to pick a ray; the plots in the rail are that ray.',
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'volume', (h) => {
        segmented(h, 'samples', [['regular', 'regular'], ['stratified', 'stratified']], () => ctx.state().mode, (v) => { ctx.state().mode = v; ctx.update(); }, h);
        segmented(h, 'background', [['black', 'black'], ['white', 'white']], () => ctx.state().bg, (v) => { ctx.state().bg = v; ctx.update(); }, h);
        segmented(h, 'resolution', SIZES.map((s) => [s, `${s} × ${s}`]), () => sizeOf(ctx.state()), (v) => { ctx.state().res = v; ctx.update(); });
        el('canvas', 'vl-mini', h);
        el('div', 'vl-tablebox', h);
      });
      const cv = host.querySelector('.vl-mini');
      const wide = Math.max(300, Math.round(cv.clientWidth || 300));
      if (cv.width !== wide) { cv.width = wide; cv.height = Math.round(wide * 0.68); }
      const g = cv.getContext('2d');
      g.clearRect(0, 0, cv.width, cv.height);
      g.fillStyle = C.bg;
      g.fillRect(0, 0, cv.width, cv.height);
      rayPlots(g, { x: 0, y: 0, w: cv.width, h: cv.height }, { ray: r, dense: r.dense, near: NEAR3, far: FAR3, yMax: r.yMax, selected: r.selected, steps: r.n <= 32, sigmaTitle: 'density σ(s) and color along the picked ray', TTitle: 'transmittance T', wTitle: 'weights w', depthMark: { depth: r.depth, spread: r.spread } });
      const box = host.querySelector('.vl-tablebox');
      bindTable(box, ctx);
      box.innerHTML = tableHtml(r, { max: 10 });
    },
  };

  return [fit, foot, volume];
}

