// diffusion-path-cloud: view a of the diffusion-path lab. The 2D spiral: the noised cloud at the current step as a heat map, the denoiser's
// arrows, one sample with its path and its guess, and the one big step beside the many small ones.
import { alphaBar } from '../core/diffusion.js';
import { arrow2d } from './image-lab-draw.js';
import { STEPS, START, E2, GRID, spiral, trajectory2d, cloudAt, arrowsAt, nearestData, dataMean, startLabel } from './diffusion-path-core.js';
import { text, f, f2, areaOf, isNarrow, head, legend, INK, noiseControls, setupOverlay, leaveOverlay, paintWith, overlayFor } from './diffusion-path-draw.js';

const CLOUD_INIT = { seed: 1, start: 'shell', k: 8, big: 'off' };
const PRESETS = [
  { label: 'seed 1', set: { seed: 1 } },
  { label: 'seed 2', set: { seed: 2 } },
  { label: 'seed 3', set: { seed: 3 } },
  { label: 'seed 4', set: { seed: 4 } },
  { label: 'pure noise: step 0', set: { k: 0 } },
  { label: 'the end: step 30', set: { k: STEPS } },
  { label: 'one big step', set: { big: 'on', k: 0, start: 'shell' } },
  { label: 'start too large (×3)', set: { start: 'big', k: 0, big: 'off' } },
  { label: 'start too small (×0.7)', set: { start: 'small', k: 0, big: 'off' } },
];

/** the square plot of the plane and the column of key to its right */
export function cloudGeo(w, h, ov) {
  const a = areaOf(ov, w, h);
  if (isNarrow(w)) { const s = Math.max(120, Math.min(a.h - 40, a.w - 26)); return { plot: { x: a.x + 22, y: a.y + 22, w: s, h: s }, key: null, a }; }
  const s = Math.max(120, Math.min(a.h - 62, a.w - 200));
  const plot = { x: a.x + 22, y: a.y + 38, w: s, h: s };
  return { plot, key: { x: plot.x + s + 22, y: plot.y, w: Math.max(60, a.x + a.w - (plot.x + s + 22)), h: s }, a };
}
const heatBitmaps = new WeakMap();
function heatRgb(u) { return [Math.round(11 + 50 * u ** 1.6), Math.round(12 + 150 * u), Math.round(16 + 150 * u + 30 * u * u)]; }
function drawHeat(g, grid, r) {
  if (typeof document !== 'undefined') {
    let cv = heatBitmaps.get(grid);
    if (!cv) {
      cv = document.createElement('canvas'); cv.width = GRID; cv.height = GRID;
      const gx = cv.getContext('2d'), img = gx.createImageData(GRID, GRID);
      for (let q = 0; q < grid.length; q++) { const c = heatRgb(grid[q]); img.data[4 * q] = c[0]; img.data[4 * q + 1] = c[1]; img.data[4 * q + 2] = c[2]; img.data[4 * q + 3] = 255; }
      gx.putImageData(img, 0, 0);
      heatBitmaps.set(grid, cv);
    }
    g.imageSmoothingEnabled = true;
    g.drawImage(cv, r.x, r.y, r.w, r.h);
  } else {
    const c = r.w / GRID;
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) { const [R, G, B] = heatRgb(grid[j * GRID + i]); g.fillStyle = `rgb(${R},${G},${B})`; g.fillRect(r.x + i * c, r.y + j * c, c + 0.5, c + 0.5); }
  }
}

export function runCloud(m) {
  const tr = trajectory2d(m.seed, m.start);
  const k = Math.max(0, Math.min(STEPS, Math.round(m.k)));
  const t = tr.ts[k], a = alphaBar(t), sigma = Math.sqrt(1 - a);
  const p = tr.pts[k];
  const near = nearestData(p[0], p[1], spiral(), Math.sqrt(a));
  const ratio = sigma > 1e-3 ? near.dist / sigma : null;
  const mean = dataMean(spiral());
  return { tr, k, t, a, sigma, p, guess: tr.guess[k], near, ratio, mean, off: Math.hypot(p[0], p[1]) > E2 };
}

export function paintCloud(g, w, h, ov, m, r) {
  const { plot, key, a } = cloudGeo(w, h, ov);
  const X = (x) => plot.x + ((x + E2) / (2 * E2)) * plot.w, Y = (y) => plot.y + ((E2 - y) / (2 * E2)) * plot.h;
  const clampPt = (x, y) => [Math.max(-E2 + 0.05, Math.min(E2 - 0.05, x)), Math.max(-E2 + 0.05, Math.min(E2 - 0.05, y))];
  if (key) head(g, `The cloud at step ${r.k} of ${STEPS}`, 'Brightness is how likely a noised data point is to land there at this noise level: a wide blob early, the spiral late.', { x: a.x + 6, y: a.y - 14, w: a.w - 12, h: 0 });
  else head(g, `The cloud at step ${r.k} of ${STEPS}`, '', { x: a.x + 6, y: a.y - 14, w: a.w - 12 }, 0);
  g.fillStyle = '#0b0c10'; g.fillRect(plot.x, plot.y, plot.w, plot.h);
  drawHeat(g, cloudAt(r.k), plot);
  g.save();
  g.beginPath(); g.rect(plot.x, plot.y, plot.w, plot.h); g.clip();
  g.strokeStyle = 'rgba(139,147,167,0.25)'; g.lineWidth = 1;
  g.beginPath(); g.moveTo(X(0), plot.y); g.lineTo(X(0), plot.y + plot.h); g.moveTo(plot.x, Y(0)); g.lineTo(plot.x + plot.w, Y(0)); g.stroke();
  // the data: where the spiral really is
  const data = spiral();
  g.fillStyle = 'rgba(231,234,240,0.55)';
  for (let i = 0; i < data.length / 2; i++) { g.beginPath(); g.arc(X(data[2 * i]), Y(data[2 * i + 1]), 1.5, 0, 2 * Math.PI); g.fill(); }
  // the denoiser's arrows, drawn as a field: each points from its spot toward that spot's guess, capped at 0.8 of the spacing between
  // spots (full length, every early arrow would run to the middle and the field would be a starburst of crossing lines)
  const cell = plot.w / 11;   // arrowsAt draws an 11 x 11 field
  for (const q of arrowsAt(r.k)) {
    const full = Math.hypot(q.dx, q.dy) * plot.w / (2 * E2);
    if (full < 3) continue;
    const len = Math.min(full, 0.8 * cell), ux = (q.dx / Math.hypot(q.dx, q.dy)) * len, uy = (q.dy / Math.hypot(q.dx, q.dy)) * len;
    arrow2d(g, X(q.x), Y(q.y), X(q.x) + ux, Y(q.y) - uy, 'rgba(255,209,102,0.75)', 1.4, 6);
  }
  const tr = r.tr;
  // the whole 30-step path faintly when the one big step is shown, so both landings can be compared
  if (m.big === 'on') {
    g.strokeStyle = 'rgba(121,192,255,0.35)'; g.lineWidth = 1.5; g.setLineDash([3, 3]); g.beginPath();
    tr.pts.forEach((p, i) => { const [x, y] = [X(p[0]), Y(p[1])]; if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); });
    g.stroke(); g.setLineDash([]);
  }
  g.strokeStyle = INK.path; g.lineWidth = 2.2; g.beginPath();
  for (let i = 0; i <= r.k; i++) { const x = X(tr.pts[i][0]), y = Y(tr.pts[i][1]); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y); }
  g.stroke();
  g.fillStyle = INK.path;
  for (let i = 0; i < r.k; i++) { g.beginPath(); g.arc(X(tr.pts[i][0]), Y(tr.pts[i][1]), 2.4, 0, 2 * Math.PI); g.fill(); }
  // the sample and its guess
  const [px, py] = clampPt(r.p[0], r.p[1]);
  if (r.k < STEPS) {
    arrow2d(g, X(px), Y(py), X(r.guess[0]), Y(r.guess[1]), INK.guess, 2.2, 9);
    g.fillStyle = INK.guess; g.strokeStyle = '#0b0c10'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(X(r.guess[0]), Y(r.guess[1]), 5, 0, 2 * Math.PI); g.fill(); g.stroke();
  }
  g.fillStyle = INK.cursor; g.strokeStyle = '#0b0c10'; g.lineWidth = 2;
  g.beginPath(); g.arc(X(px), Y(py), 7, 0, 2 * Math.PI); g.fill(); g.stroke();
  // the one big step
  if (m.big === 'on') {
    const j = tr.jump;
    g.strokeStyle = INK.jump; g.lineWidth = 2.2; g.setLineDash([7, 5]); g.beginPath();
    const [sx, sy] = clampPt(tr.start[0], tr.start[1]);
    g.moveTo(X(sx), Y(sy)); g.lineTo(X(j[0]), Y(j[1])); g.stroke(); g.setLineDash([]);
    g.fillStyle = INK.jump; g.strokeStyle = '#0b0c10'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(X(j[0]), Y(j[1]) - 9); g.lineTo(X(j[0]) + 9, Y(j[1])); g.lineTo(X(j[0]), Y(j[1]) + 9); g.lineTo(X(j[0]) - 9, Y(j[1])); g.closePath(); g.fill(); g.stroke();
    g.strokeStyle = INK.jump; g.lineWidth = 2; g.beginPath(); g.arc(X(tr.pts[STEPS][0]), Y(tr.pts[STEPS][1]), 9, 0, 2 * Math.PI); g.stroke();
  }
  g.restore();
  g.strokeStyle = INK.frame; g.lineWidth = 1; g.strokeRect(plot.x + 0.5, plot.y + 0.5, plot.w, plot.h);
  for (const v of [-2, -1, 0, 1, 2]) {
    text(g, String(v).replace('-', '−'), X(v), plot.y + plot.h + 13, { size: 10.5, align: 'center', color: INK.note, halo: false });
    text(g, String(v).replace('-', '−'), plot.x - 5, Y(v) + 3.5, { size: 10.5, align: 'right', color: INK.note, halo: false });
  }
  if (r.off) text(g, `the sample is off the plot (${f(Math.hypot(r.p[0], r.p[1]), 1)} from the center)`, plot.x + 8, plot.y + 16, { size: 11.5, color: INK.cursor });
  if (m.big === 'on') {
    const j = tr.jump;
    text(g, 'one big step lands here: the average of the data', X(j[0]) + 14, Y(j[1]) + 22, { size: 11.5, color: INK.jump });
    const e = tr.pts[STEPS];
    text(g, '30 small steps land on the spiral', X(e[0]) + 14, Y(e[1]) - 14, { size: 11.5, color: INK.path });
  }
  if (!key) return;
  // the key
  let y = key.y + 8;
  const items = [
    ['the heat map', 'The data shrunk to √ᾱ (alpha bar) of its size and blurred by the noise: the cloud the sample is inside.', '#2c8aa0'],
    ['white dots', 'The 400 data points: the spiral the walk must reach.', '#e7eaf0'],
    ['yellow arrows', "The denoiser's arrows: from each spot, the direction of its guess of the clean point (drawn short). Early they all point at the middle.", INK.cursor],
    ['gold dot', 'The sample now, and the blue path it took.', INK.cursor],
    ['green arrow', "The sample's guess: where the weighted average of the data puts the clean point.", INK.guess],
    ['orange', 'The one big step (when shown): straight from the noise to the guess at the first step.', INK.jump],
  ];
  for (const [name, body, color] of items) {
    text(g, name, key.x, y, { size: 11.5, color, weight: 700, halo: false });
    const lines = wrapKey(g, body, key.w);
    lines.forEach((s, i) => text(g, s, key.x, y + 14 + i * 13, { size: 11, color: INK.note, halo: false }));
    y += 22 + lines.length * 13 + 10;
  }
}
function wrapKey(g, str, w) {
  g.font = '500 11px -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  const width = (s) => g.measureText?.(s)?.width ?? s.length * 5.6;
  const out = [];
  let line = '';
  for (const word of str.split(' ')) {
    const tryLine = line ? `${line} ${word}` : word;
    if (width(tryLine) <= w || !line) line = tryLine; else { out.push(line); line = word; }
  }
  if (line) out.push(line);
  return out;
}

export function explainCloud(m, r) {
  const { tr, k } = r;
  const rows = [
    `step {k|${k}} of ${STEPS}: time {t|t = ${f(r.t, 3)}} (1 is pure noise, 0 is clean), data kept {abar|ᾱ (alpha bar) = ${f(r.a, 3)}}`,
    `noise level {sigma|√(1 − ᾱ) = ${f(r.sigma, 3)}}: the spread of the noise; the data is shrunk to √ᾱ = ${f(Math.sqrt(r.a), 3)} of its size`,
    `sample at (${f(r.p[0], 2)}, ${f(r.p[1], 2)}); its guess of the clean point {guess|x̂₀ = (${f(r.guess[0], 2)}, ${f(r.guess[1], 2)})}`,
    r.ratio == null
      ? `distance to the nearest shrunken data point {dist|${f(r.near.dist, 3)}}: no noise is left`
      : `distance to the nearest shrunken data point {dist|${f(r.near.dist, 2)}} = {dist|${f(r.ratio, 1)}} noise levels`,
    `{jump|one big step} from the start lands at (${f(tr.jump[0], 3)}, ${f(tr.jump[1], 3)}), the average of the data, ${f(tr.jumpOff, 3)} from the nearest data point; {path|30 steps} land ${f(tr.landingOff, 3)} from it`,
  ];
  let status;
  if (m.big === 'on') status = { text: `one big step ends at the data average, ${f(tr.jumpOff, 2)} from the nearest data point and off the spiral; the 30 steps end ${f(tr.landingOff, 2)} from it`, tone: 'warn' };
  else if (k === STEPS) status = { text: `the walk ends ${f(tr.landingOff, 3)} from the nearest data point: on the spiral`, tone: 'ok' };
  else if (k === 0 && r.ratio > 2.5) status = { text: `the start is ${f(r.ratio, 1)} noise levels from the data: outside the cloud (in two dimensions ×3 simply starts outside it); the arrows still point inward`, tone: 'warn' };
  else if (r.ratio != null && r.ratio > 2.5) status = { text: `the sample is ${f(r.ratio, 1)} noise levels from the shrunken data: outside the cloud, so the denoiser's guess here is far from anything it has seen`, tone: 'warn' };
  else if (k === 0) status = { text: 'pure noise: the cloud is a blob much wider than the spiral, and every arrow points at the same place, the average of the data', tone: 'info' };
  else status = { text: `the sample sits inside the cloud, within ${f(r.ratio, 1)} noise levels of a shrunken data point; as the cloud tightens the arrows lead it onto the spiral`, tone: 'ok' };
  return {
    hud: `step {k|${k}} of ${STEPS}   t {t|${f(r.t, 2)}}   ᾱ (alpha bar) {abar|${f(r.a, 2)}}   noise {sigma|${f(r.sigma, 2)}}`,
    rows, status,
    values: [['noise level', f(r.sigma, 3), 'sigma'], ['to nearest data', r.ratio == null ? 'none left' : `${f(r.ratio, 1)} noise levels`, 'dist']],
    fact: `Start: ${startLabel(m.start)}. The denoiser is the exact one: a weighted average of the 400 data points, nearer points weighted more.`,
  };
}

export function cloudView() {
  return {
    id: 'cloud', topic: 'cloud', label: 'The cloud', init: CLOUD_INIT, presets: PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    params: [{ id: 'k', label: 'step k', min: 0, max: STEPS, step: 1, play: 'loop', rate: () => 3, format: (v) => `${v} of ${STEPS}` }], inputTitle: 'Step of the walk',
    regions: [], keys: {}, panelTitle: 'Starting noise and the one big step',
    setup(ctx) { setupOverlay(ctx, {}); },
    leave: leaveOverlay,
    run: runCloud,
    paint: paintCloud,
    draw(v, m, r, ctx) { paintWith(ctx, (g, w, h, ov) => paintCloud(g, w, h, ov, m, r)); },
    explain: explainCloud,
    panel(host, m, r, ctx) {
      noiseControls(host, m, ctx, {
        id: 'cloud', den: false,
        one: { label: 'big step', key: 'big', options: [['off', 'hide'], ['on', 'show']] },
        note: 'The start is a random point of the noise. "Too large" and "too small" start it off the usual distance from the middle. The big step jumps from the first noise level straight to the guess.',
      });
    },
  };
}
export { START, overlayFor, legend, f2 };
