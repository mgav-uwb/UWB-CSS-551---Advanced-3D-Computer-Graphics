// particle-lab-frames: the catalog behind the particle-lab demo, part two: the frame loop. Two views: the accumulator (frames of uneven
// length, the fixed steps laid along them, the time carried over and the render alpha) and one spring stepped by the frame, by
// substeps and by the accumulator. run() calls the program's own functions (lib/programs/particle-lab/webgl/particle.js).
import * as P from '../programs/particle-lab/webgl/particle.js';
import {
  KINDS, kindOf, EXACT, AMBER, num, fixed, sci, makePlot, line, dots, swatch, text, overlayFor, showOverlay, hideOverlay, segmented, once, el, btn,
} from './particle-lab-draw.js';
import { bottomOf, hasOverlay } from './particle-lab-views.js';

const SEED = 20261116;       // the frames' jitter: the same every time, in both tracks
const CLAMP_MS = 250;
const FRAME_MS = 1000 / 60;
const STEP_KINDS = KINDS.filter((k) => k.id !== 'verlet').map((k) => [k.id, k.short]);

// ================================================================ the accumulator

const ACCUM_BASE = { step: 10, base: FRAME_MS, jitter: 0, n: 6, hitch: 0, clamp: 'on', list: '' };
const sigOf = (m) => `${m.base}|${m.jitter}|${m.n}|${m.hitch}`;
const hitchAt = (n) => Math.min(4, n - 1);
const WORKED = '16 20 33 8 17';

function accumFrames(m) {
  if (m.list) return m.list.trim().split(/\s+/).map(Number).filter((x) => Number.isFinite(x) && x > 0);
  return P.makeFrames(m.n, m.base, m.jitter, SEED, m.hitch > 0 ? hitchAt(m.n) : -1, m.hitch);
}

function paintAccum(ov, g, w, h, m, r) {
  const pad = 14, top = ov.top + 6, bottom = bottomOf(ov);
  const gutter = 58, x0 = pad + gutter, x1 = w - pad;
  const n = r.used.length;
  const total = r.used.reduce((a, b) => a + b, 0) || 1;
  const px = (x1 - x0) / total;
  const rowH = 28, gap = 22;
  const yFrames = top + 18, ySteps = yFrames + rowH + gap, yCarry = ySteps + rowH + gap;
  text(g, 'frames', pad, yFrames + 18, { size: 13, color: '#79b8ff', halo: false });
  text(g, 'steps', pad, ySteps + 18, { size: 13, color: '#7ee787', halo: false });
  text(g, 'carried', pad, yCarry + 18, { size: 13, color: AMBER, halo: false });
  let t = 0;
  for (let i = 0; i < n; i++) {
    const a = x0 + t * px, wd = r.used[i] * px;
    g.save();
    g.globalAlpha = ov.dim('frame', 'step', 'carry', 'alpha');
    g.fillStyle = i % 2 === 0 ? '#1f2a40' : '#27344f';
    g.fillRect(a, yFrames, wd, rowH);
    if (r.dropped > 0 && m.list === '' && r.used[i] < accumRaw(m)[i]) { g.fillStyle = '#ff7b72'; g.fillRect(a + wd - 3, yFrames, 3, rowH); }
    g.restore();
    const raw = accumRaw(m)[i];
    const label = r.used[i] < raw ? `${num(Number(raw.toFixed(2)), 4)} cut to ${num(Number(r.used[i].toFixed(2)), 4)}` : num(Number(r.used[i].toFixed(2)), 4);
    if (wd > 12 + 7 * label.length) text(g, label, a + wd / 2, yFrames + 18, { size: 12, align: 'center', color: '#c7cdda', halo: false });
    t += r.used[i];
    g.strokeStyle = '#3a4152'; g.setLineDash([2, 3]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(x0 + t * px, yFrames); g.lineTo(x0 + t * px, yCarry + rowH + 6); g.stroke();
    g.setLineDash([]);
  }
  // the steps, along the same clock: step j covers [j step, (j + 1) step] of simulated time
  g.save();
  g.globalAlpha = ov.dim('step', 'frame');
  for (let j = 0; j < r.totalSteps; j++) {
    const a = x0 + j * m.step * px, wd = m.step * px;
    g.fillStyle = '#1d4a2d';
    g.fillRect(a, ySteps, wd, rowH);
    g.strokeStyle = '#7ee787'; g.lineWidth = wd > 5 ? 1.2 : 0.5;
    g.strokeRect(a + 0.5, ySteps + 0.5, wd - 1, rowH - 1);
  }
  g.restore();
  // the carry after each frame: the simulated clock stops short of the frame's end by this much
  t = 0;
  let done = 0;
  for (let i = 0; i < n; i++) {
    t += r.used[i];
    done += r.steps[i];
    const end = x0 + t * px, wd = r.carried[i] * px;
    g.save();
    g.globalAlpha = ov.dim('carry', 'alpha', 'frame');
    g.fillStyle = AMBER;
    g.fillRect(end - wd, yCarry, wd, rowH);
    g.restore();
    const slot = r.used[i] * px;
    if (slot > 34) text(g, `${num(Number(r.carried[i].toFixed(2)), 3)}`, end - wd / 2, yCarry + 18, { size: 12, align: 'center', color: '#0b0c10', halo: false, weight: 700 });
    if (slot > 34) text(g, `α ${fixed(r.alpha[i], 2)}`, end - slot / 2, yCarry + rowH + 16, { size: 12, align: 'center', color: '#d2a8ff', halo: false });
  }
  // stacked bars: what each frame accumulated, split into whole steps and the carry
  const bTop = yCarry + rowH + 52, bBottom = h - bottom - 22;
  if (bBottom - bTop < 60) return;
  const slot = (x1 - x0) / n, bw = Math.min(46, slot * 0.64);
  const ymax = Math.max(2 * m.step, ...r.accumulated) * 1.08;
  const Y = (v) => bBottom - (v / ymax) * (bBottom - bTop);
  text(g, 'accumulated, ms: whole steps (green) and the carry (amber)', x0, bTop - 8, { size: 12, color: '#aab2c5', halo: false });
  g.strokeStyle = '#232734'; g.lineWidth = 1; g.fillStyle = '#0f1117';
  g.fillRect(x0, bTop, x1 - x0, bBottom - bTop);
  for (let k = 1; k * m.step <= ymax; k++) {
    if (ymax / m.step > 14 && k % Math.ceil(ymax / m.step / 7) !== 0) continue;
    g.beginPath(); g.moveTo(x0, Math.round(Y(k * m.step)) + 0.5); g.lineTo(x1, Math.round(Y(k * m.step)) + 0.5); g.stroke();
    text(g, `${k * m.step}`, x0 - 5, Y(k * m.step) + 4, { size: 12, align: 'right', color: '#79829a', halo: false });
  }
  for (let i = 0; i < n; i++) {
    const cx = x0 + slot * (i + 0.5), left = cx - bw / 2;
    g.save();
    g.globalAlpha = ov.dim('step', 'carry', 'frame');
    for (let s = 0; s < r.steps[i]; s++) {
      g.fillStyle = '#2a6b41'; g.fillRect(left, Y((s + 1) * m.step), bw, Y(s * m.step) - Y((s + 1) * m.step) - 1);
    }
    g.fillStyle = AMBER;
    g.fillRect(left, Y(r.accumulated[i]), bw, Y(r.steps[i] * m.step) - Y(r.accumulated[i]));
    g.restore();
    if (slot > 24) text(g, `${r.steps[i]}`, cx, bBottom + 15, { size: 12, align: 'center', color: '#7ee787', halo: false });
  }
  text(g, 'steps run', x0 - 8, bBottom + 15, { size: 12, align: 'right', color: '#7ee787', halo: false });
}
const accumRaw = (m) => accumFrames(m);

function accumView() {
  const set = (m, o) => { Object.assign(m, ACCUM_BASE, o); m.sig = sigOf(m); };
  return {
    id: 'accum', topic: 'frames', label: 'The accumulator', inputTitle: 'Frames and step',
    init: { ...ACCUM_BASE, step: 10, n: 5, list: WORKED, sig: '' },
    params: [
      { id: 'step', label: 'fixed step', min: 1, max: 50, step: 1, unit: ' ms' },
      { id: 'base', label: 'frame, ms', min: 4, max: 100, step: 0.01 },
      { id: 'jitter', label: 'jitter', min: 0, max: 0.9, step: 0.05 },
      { id: 'n', label: 'frames', min: 2, max: 30, step: 1 },
      { id: 'hitch', label: 'hitch frame', min: 0, max: 1000, step: 10, unit: ' ms' },
    ],
    presets: [
      { label: 'worked: 16 20 33 8 17', run: (m) => set(m, { list: WORKED, step: 10, n: 5 }) },
      { label: 'two clocks: 20 ms, 60 Hz', run: (m) => set(m, { step: 20, n: 6 }) },
      { label: 'jittery frames', run: (m) => set(m, { step: 10, n: 12, jitter: 0.5 }) },
      { label: 'a stalled frame, clamped', run: (m) => set(m, { step: 10, n: 10, base: 16, hitch: 600 }) },
      { label: 'stall, no clamp', run: (m) => set(m, { step: 10, n: 10, base: 16, hitch: 600, clamp: 'off' }) },
    ],
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['The accumulator'],
    edited(m) { if (m.list && m.sig !== sigOf(m)) m.list = ''; if (!m.list && m.sig === '') m.sig = sigOf(m); },
    enter(m) { if (m.sig === '') m.sig = sigOf(m); },
    setup(ctx) { showOverlay(ctx, {}); },
    leave(ctx) { hideOverlay(ctx); },
    run(m) {
      const frames = accumFrames(m);
      const clampMs = m.clamp === 'on' ? CLAMP_MS : 1e9;
      const acc = P.accumulate(frames, m.step, clampMs);
      return { frames, clampMs, ...acc };
    },
    draw(v, m, r, ctx) {
      const ov = hasOverlay(ctx);
      if (!ov) return;
      ov.painter = (g, w, h) => paintAccum(ov, g, w, h, m, r);
      ov.repaint();
    },
    explain(m, r) {
      const n = r.used.length;
      const f = (x) => num(Number(x.toFixed(2)), 4);
      const rows = [
        `{frame|each frame}: add its length to the {carry|carry}, run every {step|whole step} (${m.step} ms) that fits, carry the rest`,
        `{alpha|render alpha} = carry / step: the picture is drawn that far between the last two states`,
        `${n} frames, {step|${r.totalSteps} fixed steps} of exactly ${m.step} ms in ${f(r.wall)} ms of wall time`,
        `simulated ${f(r.totalSteps * m.step)} ms, {carry|carried at the end ${f(r.carried[n - 1] ?? 0)} ms}${r.dropped > 0 ? `, dropped by the clamp ${f(r.dropped)} ms` : ''}`,
      ];
      let status;
      const longest = Math.max(...r.frames, 0);
      const at = r.frames.indexOf(longest);
      if (r.dropped > 0) status = { text: `The ${f(longest)} ms frame is cut to ${CLAMP_MS} ms: it runs ${r.steps[at]} steps, and ${f(r.dropped)} ms of simulated time are given up. Without the cut, the steps would take longer than the frame did, and the next frame would be long too (the spiral of death).`, tone: 'warn' };
      else if (m.clamp === 'off' && longest > CLAMP_MS) status = { text: `No clamp: the ${f(longest)} ms frame demands ${r.steps[at]} steps at once; if running them takes longer than the frame did, the next frame is longer still.`, tone: 'bad' };
      else if (r.steps.some((s) => s === 0)) status = { text: 'A frame shorter than the carry and a step can run no step at all: that frame draws between the same two states again.', tone: 'info' };
      else status = { text: 'Every step is the same size whatever the frames did. Frames and steps meet only at the carry.', tone: 'ok' };
      return {
        hud: `{step|${r.totalSteps} steps} of ${m.step} ms in ${f(r.wall)} ms · {carry|carry ${f(r.carried[n - 1] ?? 0)} ms}, {alpha|α ${fixed(r.alpha[n - 1] ?? 0, 2)}}`,
        rows, status,
        values: [['frames', `${n}`, 'frame'], ['fixed steps', `${r.totalSteps}`, 'step'], ['wall time', `${f(r.wall)} ms`, 'frame'], ['simulated', `${f(r.totalSteps * m.step)} ms`, 'step'],
          ['carried at the end', `${f(r.carried[n - 1] ?? 0)} ms`, 'carry'], ['alpha at the end', fixed(r.alpha[n - 1] ?? 0, 2), 'alpha']],
        fact: 'Unity runs the same rule in the engine and calls FixedUpdate once per step (20 ms by default); a WebGL page writes it itself.',
      };
    },
    panelTitle: 'Frames',
    panel(host, m, r, ctx) {
      once(host, 'accum', (h) => {
        h.refreshers = [];
        const row = el('div', 'lab-btns', h);
        btn(row, 'hitch', () => { const s = ctx.state(); s.list = ''; s.hitch = 400; s.n = Math.max(s.n, 8); s.sig = sigOf(s); ctx.update(); }, 'Make the fifth frame a long one');
        btn(row, 'no hitch', () => { const s = ctx.state(); s.hitch = 0; s.sig = sigOf(s); ctx.update(); });
        h.refreshers.push(segmented(h, 'clamp', [['on', `cut at ${CLAMP_MS} ms`], ['off', 'off']], () => ctx.state().clamp, (v) => { ctx.state().clamp = v; ctx.update(); }));
        h.table = el('table', 'pl-table', h);
      });
      for (const fn of host.refreshers) fn();
      const f = (x) => num(Number(x.toFixed(2)), 4);
      const rows = r.used.slice(0, 30).map((u, i) => `<tr><td>${f(u)}</td><td>${f(r.accumulated[i])}</td><td>${r.steps[i]}</td><td>${f(r.carried[i])}</td><td>${fixed(r.alpha[i], 2)}</td></tr>`);
      host.table.innerHTML = `<thead><tr><th>frame (ms)</th><th>accumulated</th><th>steps</th><th>carried</th><th>render α</th></tr></thead><tbody>${rows.join('')}</tbody>`;
    },
  };
}

// ================================================================ one spring on the frame loop

const STEPPING_BASE = { kind: 'semi', mode: 'frame', step: 10, jitter: 0.3, hitch: 0, substeps: 16 };
const N_FRAMES = 72, HITCH_FRAME = 30;
const K = 100, MASS = 1;

function steppingRun(m) {
  const frames = P.makeFrames(N_FRAMES, FRAME_MS, m.jitter, SEED, m.hitch > 0 ? HITCH_FRAME : -1, m.hitch);
  const steady = P.makeFrames(N_FRAMES, FRAME_MS, 0, SEED, -1, 0);
  const naive = P.simulateFrames(m.kind, m.mode, K, MASS, 0, frames, m.step, m.substeps, CLAMP_MS, 1, 0);
  const fixedRun = P.simulateFrames(m.kind, 'fixed', K, MASS, 0, frames, m.step, m.substeps, CLAMP_MS, 1, 0);
  const reference = P.simulateFrames(m.kind, 'fixed', K, MASS, 0, steady, m.step, m.substeps, CLAMP_MS, 1, 0);
  const common = Math.min(fixedRun.xs.length, reference.xs.length);
  let same = 0;
  for (let i = 0; i < common; i++) same = Math.max(same, Math.abs(fixedRun.xs[i] - reference.xs[i]));
  const exactErr = (run) => {
    let worst = 0;
    for (let i = 0; i < run.times.length; i++) if (Number.isFinite(run.xs[i])) worst = Math.max(worst, Math.abs(run.xs[i] - P.exactSpring(K, MASS, 0, 1, 0, run.times[i]).x));
    return worst;
  };
  const omega = Math.sqrt(K / MASS);
  const longest = Math.max(...frames);
  const naiveStep = m.mode === 'substeps' ? longest / 1000 / m.substeps : longest / 1000;
  const wall = frames.reduce((a, b) => a + b, 0) / 1000;
  return {
    frames, steady, naive, fixedRun, reference, same, common, omega, longest, naiveStep, wall,
    times: fixedRun.times, xs: fixedRun.xs, vs: fixedRun.vs, energies: fixedRun.energies, stepsTaken: fixedRun.stepsTaken, carry: fixedRun.carry,
    naiveErr: exactErr(naive), fixedErr: exactErr(fixedRun), repNaive: P.stabilityReport(m.kind, K, MASS, 0, naiveStep), repFixed: P.stabilityReport(m.kind, K, MASS, 0, m.step / 1000),
  };
}

function paintStepping(ov, g, w, h, m, r) {
  const pad = 14, top = ov.top + 4, bottom = bottomOf(ov);
  const x0 = pad + 40, x1 = w - pad;
  const tEnd = r.wall;
  const X = (t) => x0 + (t / tEnd) * (x1 - x0);
  // the frames: one bar per frame, as wide as it is long and as tall
  const barH = 46, barY = top + 14;
  text(g, 'frames', pad, barY + 12, { size: 12, color: '#79b8ff', halo: false });
  const tall = 2 * FRAME_MS;      // a 33 ms bar is full height; a stalled frame is cut off at the top of its box
  let t = 0;
  for (let i = 0; i < r.frames.length; i++) {
    const a = X(t), b = X(t + r.frames[i] / 1000), hh = Math.min(1, r.frames[i] / tall) * barH;
    g.save();
    g.globalAlpha = ov.dim('frame');
    g.fillStyle = r.frames[i] > 40 ? '#ff9f43' : i % 2 === 0 ? '#2b3d63' : '#3a507f';
    g.fillRect(a, barY + barH - hh, Math.max(1, b - a - 0.5), hh);
    g.restore();
    t += r.frames[i] / 1000;
  }
  if (r.longest > 40) text(g, `${num(Number(r.longest.toFixed(0)), 4)} ms`, X(HITCH_FRAME * FRAME_MS / 1000) + 14, barY + 12, { size: 12, color: '#ff9f43', halo: false });
  // x against t
  const pTop = barY + barH + 34, ph = Math.max(100, h - bottom - pTop - 22);
  const yr = 1.35;
  const plot = makePlot(g, { x: x0, y: pTop, w: x1 - x0, h: ph }, [0, tEnd], [-yr, yr], { xTitle: 't (s)', title: 'x (m), k = 100 N/m, m = 1 kg, released at x = 1' });
  const ex = [], et = [];
  for (let i = 0; i <= 240; i++) { const tt = (tEnd * i) / 240; et.push(tt); ex.push(P.exactSpring(K, MASS, 0, 1, 0, tt).x); }
  line(g, plot, et, ex, EXACT, { width: 1.5, dash: [5, 4] });
  const naiveColor = '#ff7b72', fixedColor = '#7ee787';
  g.save();
  g.globalAlpha = ov.dim('naive');
  line(g, plot, r.naive.times, r.naive.xs, naiveColor, { width: 1.8 });
  if (r.naive.times.length < 200) dots(g, plot, r.naive.times, r.naive.xs, naiveColor, { r: 3 });
  g.restore();
  g.save();
  g.globalAlpha = ov.dim('fixed');
  line(g, plot, r.fixedRun.times, r.fixedRun.xs, fixedColor, { width: 1.8 });
  if (r.fixedRun.times.length < 200) dots(g, plot, r.fixedRun.times, r.fixedRun.xs, fixedColor, { r: 2.5, hollow: true });
  g.restore();
  if (m.hitch > 0) {
    g.save();
    g.strokeStyle = '#ff9f43'; g.setLineDash([2, 3]); g.lineWidth = 1;
    const th = (HITCH_FRAME * FRAME_MS) / 1000;
    g.beginPath(); g.moveTo(X(th), plot.r.y); g.lineTo(X(th), plot.r.y + plot.r.h); g.stroke();
    g.restore();
  }
  let lx = plot.r.x + 8;
  lx += swatch(g, lx, plot.r.y + plot.r.h - 8, EXACT, 'exact', { dashed: true });
  lx += swatch(g, lx, plot.r.y + plot.r.h - 8, naiveColor, m.mode === 'substeps' ? `${m.substeps} substeps per frame` : 'one step per frame', { dot: true });
  swatch(g, lx, plot.r.y + plot.r.h - 8, fixedColor, `fixed ${m.step} ms step`, { dot: true, ring: true });
}

function steppingView() {
  return {
    id: 'stepping', topic: 'frames', label: 'One spring, two clocks', inputTitle: 'Frames and steps',
    init: { ...STEPPING_BASE, hitch: 250 },
    params: [
      { id: 'step', label: 'fixed step', min: 1, max: 50, step: 1, unit: ' ms' },
      { id: 'substeps', label: 'substeps', min: 1, max: 32, step: 1 },
      { id: 'jitter', label: 'jitter', min: 0, max: 0.9, step: 0.05 },
      { id: 'hitch', label: 'hitch frame', min: 0, max: 400, step: 10, unit: ' ms' },
    ],
    presets: [
      { label: 'steady 60 Hz', run: (m) => Object.assign(m, STEPPING_BASE, { jitter: 0, hitch: 0 }) },
      { label: 'jittery frames', run: (m) => Object.assign(m, STEPPING_BASE, { jitter: 0.6, hitch: 0 }) },
      { label: '100 ms hitch', run: (m) => Object.assign(m, STEPPING_BASE, { jitter: 0, hitch: 100 }) },
      { label: '250 ms stall', run: (m) => Object.assign(m, STEPPING_BASE, { jitter: 0, hitch: 250 }) },
      { label: 'stall, 16 substeps', run: (m) => Object.assign(m, STEPPING_BASE, { jitter: 0, hitch: 250, mode: 'substeps' }) },
      { label: 'explicit Euler', run: (m) => Object.assign(m, STEPPING_BASE, { kind: 'explicit', jitter: 0, hitch: 0 }) },
    ],
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['Two ways to step'],
    setup(ctx) { showOverlay(ctx, {}); },
    leave(ctx) { hideOverlay(ctx); },
    run(m) { return steppingRun(m); },
    draw(v, m, r, ctx) {
      const ov = hasOverlay(ctx);
      if (!ov) return;
      ov.painter = (g, w, h) => paintStepping(ov, g, w, h, m, r);
      ov.repaint();
    },
    explain(m, r) {
      const last = (run) => run.energies[run.energies.length - 1];
      const hOm = r.naiveStep * r.omega;
      const naiveName = m.mode === 'substeps' ? `${m.substeps} substeps per frame` : 'a step per frame';
      const rows = [
        `{frame|frames}: ${num(Number(Math.min(...r.frames).toFixed(1)), 4)} to ${num(Number(r.longest.toFixed(1)), 4)} ms, ${r.frames.length} of them, ${fixed(r.wall, 2)} s`,
        `{naive|${naiveName}}: steps up to ${num(Number((r.naiveStep * 1000).toFixed(2)), 4)} ms, h ω up to ${num(hOm, 3)}; ${r.naive.stepsTaken} steps; E at the end ${sci(last(r.naive))} J`,
        `{fixed|fixed ${m.step} ms step}: h ω = ${num(r.repFixed.hOmega, 3)}; ${r.fixedRun.stepsTaken} steps; E at the end ${sci(last(r.fixedRun))} J`,
        `{fixed|same states}: the fixed run against a steady 60 Hz run, ${r.common} states, largest difference in x ${r.same === 0 ? '0 (identical)' : sci(r.same)}`,
        `largest distance from the exact x: {naive|${num(r.naiveErr, 3)}}, {fixed|${num(r.fixedErr, 3)}} (the fixed step's own phase error)`,
      ];
      const past = hOm >= 2 && m.kind !== 'implicit';
      let status;
      if (m.hitch > 0 && past && m.mode === 'frame') status = { text: `The ${m.hitch} ms frame is one step with h ω = ${num(hOm, 3)}, past the limit 2: that step multiplies the amplitude by ${num(r.repNaive.growth, 3)} and the run is off course. The fixed step did not notice.`, tone: 'bad' };
      else if (m.hitch > 0 && m.mode === 'frame') status = { text: `The ${m.hitch} ms frame is one long step (h ω = ${num(hOm, 3)}, still under 2): it is stable, but a coarse step, and the run leaves the exact motion. The fixed step did not notice.`, tone: 'warn' };
      else if (m.mode === 'substeps') status = { text: `${m.substeps} substeps cut every frame into shorter steps, a stalled one into ${num(r.naiveStep * 1000, 3)} ms steps; the cost is ${m.substeps} steps a frame, ${r.naive.stepsTaken} in all.`, tone: 'info' };
      else if (m.jitter > 0) status = { text: 'Each frame is a different step, so the run drifts from the exact motion by a different amount every frame. The fixed step does not.', tone: 'warn' };
      else status = { text: 'Steady frames: a step per frame is one fixed step of 16.7 ms. The two runs differ only because the fixed step is 10 ms.', tone: 'info' };
      return {
        hud: `{naive|${naiveName}: off by ${num(r.naiveErr, 2)}} · {fixed|fixed step: off by ${num(r.fixedErr, 2)}}`,
        rows, status,
        values: [['longest frame', `${num(Number(r.longest.toFixed(1)), 4)} ms`, 'frame'], ['naive h ω, largest', num(hOm, 3), 'naive'], ['naive steps', `${r.naive.stepsTaken}`, 'naive'],
          ['fixed steps', `${r.fixedRun.stepsTaken}`, 'fixed'], ['same as steady run', r.same === 0 ? 'identical' : sci(r.same), 'fixed'], ['carry at the end', `${num(Number(r.carry.toFixed(2)), 3)} ms`, 'fixed']],
        fact: 'The hitch is frame 31 (the dotted line). A step per frame takes the frame as its h; the accumulator takes steps of the same length whatever the frames were.',
      };
    },
    panelTitle: 'Integrator and clocks',
    panel(host, m, r, ctx) {
      once(host, 'stepping', (h) => {
        h.refreshers = [];
        h.refreshers.push(segmented(h, 'integrator', STEP_KINDS, () => ctx.state().kind, (v) => { ctx.state().kind = v; ctx.update(); }));
        h.refreshers.push(segmented(h, 'compare', [['frame', 'step per frame'], ['substeps', 'substeps']], () => ctx.state().mode, (v) => { ctx.state().mode = v; ctx.update(); }));
        el('p', 'lab-note', h, 'The red run takes whatever step the frame gives it, or the frame cut into substeps. The green run is the accumulator: the same step every time.');
      });
      for (const fn of host.refreshers) fn();
    },
  };
}

export function frameViews() { return [accumView(), steppingView()]; }
