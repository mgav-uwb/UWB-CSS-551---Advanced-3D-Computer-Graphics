// particle-lab-views: the catalog behind the particle-lab demo (runtime: lib/core/lab.js), part one: the spring and its energy. Three
// views: a mass on a spring stepped four ways with the step table beside it, the phase plane and the energy against the step, and
// the growth per step against h omega. run() calls the program's own functions (lib/programs/particle-lab/webgl/particle.js), so the
// numbers beside the code are that code's output. Parts two and three: particle-lab-frames.js, particle-lab-contacts.js.
import * as P from '../programs/particle-lab/webgl/particle.js';
import {
  KINDS, kindOf, EXACT, AMBER, num, fx2, fixed, sci, niceTicks, makePlot, line, dots, swatch, coil, wallBar, text, arrow2d,
  overlayFor, showOverlay, hideOverlay, segmented, once, el, btn, captioned } from './particle-lab-draw.js';

export const TOPICS = [
  { id: 'spring', label: 'One spring' }, { id: 'energy', label: 'Energy' }, { id: 'frames', label: 'Frame loop' }, { id: 'contacts', label: 'Contacts' },
];

export const KEYS = {
  exact: 0xaab2c5, explicit: 0xff7b72, semi: 0x7ee787, verlet: 0x56d4dd, implicit: 0xd2a8ff,
  a: 0xffa657, x: 0x79c0ff, v: 0xffd166, energy: 0xffc46b, limit: 0xff7b72, omega: 0x79c0ff, damper: 0xff79c6,
  naive: 0xff7b72, fixed: 0x7ee787, frame: 0x79c0ff, carry: 0xffc46b, alpha: 0xd2a8ff, step: 0x7ee787, wall: 0x8b93a7, push: 0x7ee787,
  vn: 0xff7b72, vt: 0x79c0ff, kept: 0xffc46b, depth: 0xff79c6,
};

const KIND_OPTIONS = KINDS.map((k) => [k.id, k.short]);
const tidy = (m, base, extra) => Object.assign(m, base, extra);
/** the bottom margin of a picture: the HUD sits there, and on a slide it sits higher */
export const bottomOf = (ov) => ((ov.baseTop ?? ov.top) < 20 ? 76 : 54);
export const hasOverlay = (ctx) => (ctx.sceneEl ? overlayFor(ctx) : null);
const sign = (x) => (x < 0 ? '−' : '');
const mm = (x, d = 3) => num(Number(x.toFixed(d)), 4);

// ================================================================ one spring

const SPRING_BASE = { k: 100, mass: 1, c: 0, h: 0.1, x0: 1, others: 'none' };

/** the runs a view needs: the selected integrator (and the others, if shown) for nPlot steps, and the exact motion */
function springRun(m) {
  const omega = Math.sqrt(m.k / m.mass);
  const period = (2 * Math.PI) / omega;
  const nPlot = Math.min(120, Math.max(m.n + 1, 8, Math.ceil((1.25 * period) / m.h)));
  const runs = {};
  for (const k of KINDS) runs[k.id] = P.runSpring(k.id, m.k, m.mass, m.c, m.h, m.x0, 0, nPlot);
  const run = runs[m.kind];
  const xr = m.x0 === 0 ? 1 : Math.abs(m.x0);
  let ymax = 1.25 * xr;
  const shown = m.others === 'all' ? KINDS.map((k) => k.id) : [m.kind];
  for (const id of shown) for (let i = 0; i <= m.n; i++) if (Number.isFinite(runs[id].xs[i])) ymax = Math.max(ymax, 1.12 * Math.abs(runs[id].xs[i]));
  ymax = Math.min(ymax, 1e9);
  const tEnd = nPlot * m.h;
  const exact = [];
  for (let i = 0; i <= 200; i++) { const t = (tEnd * i) / 200; exact.push({ t, x: P.exactSpring(m.k, m.mass, m.c, m.x0, 0, t).x }); }
  const exactNow = P.exactSpring(m.k, m.mass, m.c, m.x0, 0, m.n * m.h);
  const from = Math.max(m.n - 1, 0);
  const x = run.xs[from], v = run.vs[from];
  const xPrev = from > 0 ? run.xs[from - 1] : x - m.h * v;
  const next = m.kind === 'verlet' ? P.verletStep(m.k, m.mass, m.c, m.h, x, xPrev) : P.springStep(m.kind, m.k, m.mass, m.c, m.h, x, v);
  const info = P.describeSpring(m.k, m.mass, m.c, x, v);
  const rep = P.stabilityReport(m.kind, m.k, m.mass, m.c, m.h);
  return { runs, run, nPlot, omega, period, ymax, tEnd, exact, exactNow, from, x, v, xPrev, next, info, rep, E0: run.energies[0], En: run.energies[m.n] };
}

function paintSpring(ov, g, w, h, m, r) {
  const pad = 14, top = ov.top, bottom = bottomOf(ov);
  const kd = kindOf(m.kind);
  const stripH = Math.max(66, Math.min(112, (h - top - bottom) * 0.25));
  const yc = top + stripH / 2 + 6;
  const wallX = pad + 8, right = w - pad;
  const xm = Math.max(1.5, Math.abs(m.x0) * 1.3);
  const cx = (wallX + right) / 2 + 16, sc = (right - wallX - 96) / (2 * xm);
  ov.strip = { cx, sc, y1: top + stripH + 12 };
  const xNow = r.run.xs[m.n];
  const drawX = Math.max(-xm, Math.min(xm, Number.isFinite(xNow) ? xNow : 0));
  const px = cx + drawX * sc, half = 15;
  g.save();
  g.globalAlpha = ov.dim('run', 'x', 'v', 'a', m.kind);
  g.strokeStyle = '#3a4152'; g.setLineDash([3, 4]); g.lineWidth = 1;
  g.beginPath(); g.moveTo(cx, yc - 40); g.lineTo(cx, yc + 40); g.stroke();
  g.setLineDash([]);
  text(g, 'x = 0', cx, yc + 54, { size: 12, align: 'center', color: '#79829a', halo: false });
  wallBar(g, wallX, yc - 32, yc + 32);
  const ex = Math.max(-xm, Math.min(xm, r.exactNow.x));
  g.strokeStyle = EXACT; g.setLineDash([4, 3]); g.lineWidth = 1.6;
  g.strokeRect(cx + ex * sc - half, yc - half - 3, 2 * half, 2 * half + 6);
  g.setLineDash([]);
  coil(g, wallX, px - half, yc, kd.color, 11, 11, 2.2);
  g.fillStyle = kd.color;
  g.fillRect(px - half, yc - half, 2 * half, 2 * half);
  g.restore();
  if (Math.abs(xNow) > xm) text(g, `x = ${num(xNow, 3)}, off the scale`, wallX + 6, top + 30, { size: 12, color: kd.color });
  text(g, 'dashed box: the exact motion', wallX + 6, top + 12, { size: 12, color: '#79829a', halo: false });
  // x against t
  const plotTop = top + stripH + 40;
  const plot = makePlot(g, { x: pad + 40, y: plotTop, w: w - 2 * pad - 40, h: Math.max(80, h - bottom - plotTop - 24) }, [0, r.tEnd], [-r.ymax, r.ymax], { xTitle: 't (s)', title: 'x (m)' });
  g.save();
  g.globalAlpha = ov.dim('exact');
  line(g, plot, r.exact.map((p) => p.t), r.exact.map((p) => p.x), EXACT, { width: 1.6, dash: [5, 4] });
  g.restore();
  const ids = m.others === 'all' ? KINDS.map((k) => k.id) : [m.kind];
  for (const id of ids) {
    const run = r.runs[id], c = kindOf(id).color;
    const mine = id === m.kind;
    g.save();
    g.globalAlpha = (mine ? 1 : 0.7) * ov.dim('run', id);
    line(g, plot, run.times.slice(0, m.n + 1), run.xs.slice(0, m.n + 1), c, { width: mine ? 2 : 1.4 });
    dots(g, plot, run.times, run.xs, c, { r: mine ? 4 : 3, hollow: id === 'verlet', to: m.n });
    if (mine) dots(g, plot, run.times, run.xs, c, { r: 3, hollow: true, alpha: 0.45, from: m.n + 1, to: r.nPlot });
    g.restore();
  }
  // the present step
  const tn = r.run.times[m.n];
  g.save();
  g.strokeStyle = '#ffd166'; g.setLineDash([2, 3]); g.lineWidth = 1;
  g.beginPath(); g.moveTo(plot.X(tn), plot.r.y); g.lineTo(plot.X(tn), plot.r.y + plot.r.h); g.stroke();
  g.restore();
  let lx = plot.r.x + 8;
  lx += swatch(g, lx, plot.r.y + 16, EXACT, 'exact', { dashed: true });
  for (const id of ids) lx += swatch(g, lx, plot.r.y + 16, kindOf(id).color, kindOf(id).short, { dot: true, ring: id === 'verlet' });
}

function stepTable(host, m, r) {
  once(host, 'spring', (h) => {
    h.refreshers = [];
    h.kindRow = segmented(h, 'integrator', KIND_OPTIONS, () => host.ctx.state().kind, (v) => { host.ctx.state().kind = v; host.ctx.update(); });
    h.refreshers.push(h.kindRow);
    const row = el('div', 'lab-btns', h);
    btn(row, 'step +1', () => { const s = host.ctx.state(); s.n = Math.min(60, s.n + 1); host.ctx.update(); }, 'Take one more step');
    btn(row, 'back', () => { const s = host.ctx.state(); s.n = Math.max(0, s.n - 1); host.ctx.update(); });
    btn(row, 'restart', () => { host.ctx.state().n = 0; host.ctx.update(); });
    h.refreshers.push(segmented(h, 'also show', [['none', 'selected only'], ['all', 'all four']], () => host.ctx.state().others, (v) => { host.ctx.state().others = v; host.ctx.update(); }));
    el('p', 'lab-note', h, 'Drag the mass in the picture to change the start x. The step table lists the selected integrator.');
    h.table = el('table', 'pl-table', h);
  });
  for (const fn of host.refreshers) fn();
  const rows = [];
  const lo = Math.max(0, m.n - 8);
  for (let i = lo; i <= m.n; i++) {
    rows.push(`<tr class="${i === m.n ? 'on' : ''}"><td>${i}</td><td>${fixed(r.run.times[i], 2)}</td><td>${num(P.exactSpring(m.k, m.mass, m.c, m.x0, 0, r.run.times[i]).x, 3)}</td><td>${num(r.run.xs[i], 4)}</td><td>${num(r.run.vs[i], 4)}</td><td>${num(r.run.energies[i], 4)}</td></tr>`);
  }
  host.table.innerHTML = `<thead><tr><th>n</th><th>t (s)</th><th>exact x</th><th>x</th><th>v</th><th>E (J)</th></tr></thead><tbody>${lo > 0 ? '<tr><td colspan="6">…</td></tr>' : ''}${rows.join('')}</tbody>`;
}

/** the update lines of the step from state `from` to `from + 1`, with the numbers substituted */
function stepRows(m, r) {
  const { x, v, next, info, xPrev } = r;
  const k = m.k, ms = m.mass, c = m.c, h = m.h;
  const f = fx2;
  const q = (t) => (t < 0 ? `(${f(t)})` : f(t));
  const accel = c === 0 ? `{a|a} = −k x / m = −${f(k)} · ${q(x)} / ${f(ms)} = ${f(info.a)} m/s²` : `{a|a} = (−k x − c v) / m = ${f(info.a)} m/s²`;
  const head = `step ${r.from + 1}, from t = ${fixed(r.from * h, 2)} s: x = ${f(x)}, v = ${f(v)}`;
  if (m.kind === 'explicit') {
    return [head, accel, `{explicit|x ← x + Δt v} = ${f(x)} + ${f(h)} · ${q(v)} = ${f(next.x)}`, `{explicit|v ← v + Δt a} = ${f(v)} + ${f(h)} · ${q(info.a)} = ${f(next.v)}`, 'both updates use the old state'];
  }
  if (m.kind === 'semi') {
    return [head, accel, `{semi|v ← v + Δt a} = ${f(v)} + ${f(h)} · ${q(info.a)} = ${f(next.v)}`, `{semi|x ← x + Δt v} = ${f(x)} + ${f(h)} · ${q(next.v)} = ${f(next.x)}`, 'velocity first, then position with the new velocity'];
  }
  if (m.kind === 'verlet') {
    return [head, accel, `{verlet|x₊ = 2x − x₋ + a Δt²} = 2 · ${f(x)} − ${q(xPrev)} + ${q(info.a)} · ${f(h)}² = ${f(next.x)}`, `velocity implied: (x₊ − x) / Δt = ${f(next.v)}`];
  }
  const den = ms + h * c + h * h * k;
  return [head, `{implicit|v₊ = (m v − Δt k x) / (m + Δt c + Δt² k)} = (${f(ms * v)} − ${q(h * k * x)}) / ${f(den)} = ${f(next.v)}`, `{implicit|x₊ = x + Δt v₊} = ${f(x)} + ${f(h)} · ${q(next.v)} = ${f(next.x)}`, 'the force at the end of the step'];
}

function springView() {
  return {
    id: 'spring', topic: 'spring', label: 'Mass on a spring', inputTitle: 'Spring and step',
    init: { kind: 'explicit', ...SPRING_BASE, n: 4 },
    params: [
      { id: 'n', label: 'steps taken', min: 0, max: 60, step: 1, play: true },
      { id: 'h', label: 'step Δt', min: 0.01, max: 0.3, step: 0.01, unit: ' s' },
      { id: 'k', label: 'k, N/m', min: 1, max: 400, step: 1 },
      { id: 'mass', label: 'm, kg', min: 0.1, max: 5, step: 0.1 },
      { id: 'c', label: 'c, N·s/m', min: 0, max: 40, step: 0.5 },
    ],
    presets: [
      { label: 'by hand: explicit', run: (m) => tidy(m, SPRING_BASE, { kind: 'explicit', n: 1 }) },
      { label: 'by hand: semi-implicit', run: (m) => tidy(m, SPRING_BASE, { kind: 'semi', n: 1 }) },
      { label: 'five steps: explicit', run: (m) => tidy(m, SPRING_BASE, { kind: 'explicit', n: 4 }) },
      { label: 'five steps: semi-implicit', run: (m) => tidy(m, SPRING_BASE, { kind: 'semi', n: 4 }) },
      { label: 'Verlet', run: (m) => tidy(m, SPRING_BASE, { kind: 'verlet', n: 5 }) },
      { label: 'implicit', run: (m) => tidy(m, SPRING_BASE, { kind: 'implicit', n: 4 }) },
      { label: 'all four', run: (m) => tidy(m, SPRING_BASE, { kind: 'semi', n: 6, others: 'all' }) },
    ],
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['One step of a spring', 'The spring and its energy'],
    setup(ctx) {
      showOverlay(ctx, {
        down: (x, y) => dragMass(ctx, x, y), move: (x, y) => dragMass(ctx, x, y),
      });
    },
    leave(ctx) { hideOverlay(ctx); },
    run(m) {
      const r = springRun(m);
      const st = r.next;
      return { x: r.x, v: r.v, a: r.info.a, xNew: st.x, vNew: st.v, force: r.info.force, omega: r.info.omega, energy: r.info.energy, critical: r.info.critical, zeta: r.info.zeta, ...r };
    },
    draw(v, m, r, ctx) {
      const ov = hasOverlay(ctx);
      if (!ov) return;
      ov.painter = (g, w, h) => paintSpring(ov, g, w, h, m, r);
      ov.repaint();
    },
    explain(m, r) {
      const kd = kindOf(m.kind), E0 = r.E0, En = r.En;
      const rows = stepRows(m, r);
      rows.push(`{energy|E} = ½ m v² + ½ k x²: ${num(E0, 4)} J at the start, ${num(En, 4)} J after ${m.n} steps`);
      rows.push(`{omega|ω} = √(k/m) = ${num(r.omega, 4)} rad/s, period ${num(r.period, 3)} s, Δt ω = ${num(m.h * r.omega, 3)}`);
      let status;
      const ratio = En / E0;
      if (m.c > 0) status = { text: `With a damper the exact energy falls. ${kd.short}: ${num(ratio, 3)} of the start after ${m.n} steps.`, tone: 'info' };
      else if (m.kind === 'explicit') status = { text: `Explicit Euler multiplies the energy by 1 + (Δtω)² = ${num(1 + (m.h * r.omega) ** 2, 4)} every step: ${num(ratio, 4)} times the start after ${m.n}.`, tone: 'bad' };
      else if (m.kind === 'implicit') status = { text: `Implicit Euler is stable at any step and drains energy: ${num(ratio, 4)} of the start after ${m.n} steps (a factor ${num(r.rep.energyFactor, 3)} per step).`, tone: 'info' };
      else if (r.rep.bounded) status = { text: `${kd.short === 'Verlet' ? 'Verlet' : 'Semi-implicit Euler'} is wrong in phase but bounded: its energy swings (${num(ratio, 3)} of the start now) and does not grow while Δtω < 2.`, tone: 'ok' };
      else status = { text: `Δt ω = ${num(m.h * r.omega, 3)} is past 2: the motion grows without bound.`, tone: 'bad' };
      const exactX = r.exactNow.x;
      return {
        hud: `step ${m.n}, t = ${fixed(m.n * m.h, 2)} s: {${m.kind}|x = ${num(r.run.xs[m.n], 4)}}, {exact|exact ${num(exactX, 4)}}, {energy|E = ${num(En, 4)} J}`,
        rows, status,
        values: [['x after n steps', num(r.run.xs[m.n], 4), m.kind], ['exact x(t)', num(exactX, 4), 'exact'], ['v', num(r.run.vs[m.n], 4), 'v'], ['E', `${num(En, 4)} J`, 'energy'],
          ['ω', `${num(r.omega, 3)} rad/s`, 'omega'], ['critical c', `${num(r.critical, 3)} N·s/m`, 'damper']],
        fact: 'Pull the spring to x = 1 m and let go: the exact motion is x cos ωt. Each integrator takes steps of Δt seconds and gets there differently.',
      };
    },
    panelTitle: 'Integrator and steps',
    panel(host, m, r, ctx) {
      host.ctx = ctx;
      stepTable(host, m, r);
    },
  };
}

function dragMass(ctx, x, y) {
  const ov = overlayFor(ctx), s = ov.strip;
  if (!s || y > s.y1) return;
  const m = ctx.state();
  m.x0 = Math.max(-2, Math.min(2, Math.round((x - s.cx) / s.sc / 0.05) * 0.05));
  m.x0 = Number(m.x0.toFixed(2));
  ctx.update();
}

// ================================================================ energy and the phase plane

const PHASE_BASE = { k: 100, c: 0, h: 0.1, show: 'all' };

function phaseRun(m) {
  const omega = Math.sqrt(m.k);
  const runs = {}, reps = {};
  for (const k of KINDS) {
    runs[k.id] = P.runSpring(k.id, m.k, 1, m.c, m.h, 1, 0, m.n);
    reps[k.id] = P.stabilityReport(k.id, m.k, 1, m.c, m.h);
  }
  const period = (2 * Math.PI) / omega;
  const tEnd = Math.max(m.n * m.h, period);
  const exactPath = [];
  for (let i = 0; i <= 240; i++) { const t = (tEnd * i) / 240, e = P.exactSpring(m.k, 1, m.c, 1, 0, t); exactPath.push({ x: e.x, y: e.v / omega, t }); }
  return { omega, runs, reps, period, exactPath, E0: runs.explicit.energies[0], peak: (id) => Math.max(...runs[id].energies) };
}
const shownKinds = (m) => (m.show === 'all' ? KINDS : KINDS.filter((k) => k.id === m.show));
const decades = (e, e0) => (e > 0 && Number.isFinite(e) ? Math.max(-300, Math.min(300, Math.log10(e / e0))) : e === 0 ? -300 : 300);

const CAPTION_PHASE = 'Each dot is one step. Top: the state, position across and velocity down; the exact motion goes round the dashed circle forever. Spiraling out means the energy grows, spiraling in means it drains, a closed loop means it stays bounded. Bottom: the energy at each step.';
function paintPhase(ov, g, w, hh, m, r) {
  const pad = 14, top = ov.top + 10, bottom = bottomOf(ov);
  const availH = hh - top - bottom;
  const S = Math.max(150, Math.min((w - 2 * pad - 60) * 0.56, availH * 0.52));
  const pr = { x: pad + 36, y: top + 8, w: S, h: S };
  let R = 1.25;
  const kinds = shownKinds(m);
  // with all four shown the scale follows the bounded ones: explicit Euler leaves any scale, and says so in the legend
  const scaleOn = m.show === 'all' ? kinds.filter((k) => k.id !== 'explicit') : kinds;
  for (const k of scaleOn) { const run = r.runs[k.id]; for (let i = 0; i <= m.n; i++) { if (Number.isFinite(run.xs[i])) R = Math.max(R, 1.1 * Math.abs(run.xs[i]), 1.1 * Math.abs(run.vs[i] / r.omega)); } }
  R = Math.min(R, 1e12);
  const offStep = (id) => {
    const run = r.runs[id];
    for (let i = 0; i <= m.n; i++) if (!(Math.abs(run.xs[i]) <= R && Math.abs(run.vs[i] / r.omega) <= R)) return i;
    return -1;
  };
  const ticks = niceTicks(-R, R, 4);
  const phase = makePlot(g, pr, [-R, R], [-R, R], { xTicks: ticks, yTicks: ticks, title: 'phase plane', xTitle: 'x' });
  text(g, 'v / ω', pr.x + 4, pr.y + 14, { size: 12, color: '#aab2c5', halo: false });
  line(g, phase, r.exactPath.map((p) => p.x), r.exactPath.map((p) => p.y), EXACT, { width: 1.4, dash: [5, 4] });
  for (const k of [...kinds].sort((a) => (a.id === 'verlet' ? 1 : 0))) {
    const run = r.runs[k.id];
    const xs = run.xs, ys = run.vs.map((v) => v / r.omega);
    g.save();
    g.globalAlpha = ov.dim('run', k.id);
    line(g, phase, xs, ys, k.color, { width: 1, alpha: 0.55 });
    dots(g, phase, xs, ys, k.color, { r: m.n > 60 ? 2 : 3.2, hollow: k.id === 'verlet', alpha: 1 });
    dots(g, phase, xs, ys, k.color, { r: 6, hollow: true, from: m.n, to: m.n });
    g.restore();
  }
  // the legend and the per-integrator numbers, beside the plane
  const lx = pr.x + S + 16;
  let ly = pr.y + 18;
  text(g, `after ${m.n} steps`, lx, ly, { size: 12, color: '#79829a', halo: false });
  ly += 20;
  for (const k of KINDS) {
    const on = m.show === 'all' || m.show === k.id;
    const e = r.runs[k.id].energies[m.n];
    g.save();
    g.globalAlpha = on ? 1 : 0.3;
    swatch(g, lx, ly, k.color, k.short, { dot: true, ring: k.id === 'verlet', size: 13 });
    const off = on ? offStep(k.id) : -1;
    text(g, `E = ${sci(e)} J`, lx + 19, ly + 15, { size: 12, color: k.color, halo: false });
    if (off >= 0) text(g, `off the plot at step ${off}`, lx + 19, ly + 29, { size: 12, color: k.color, halo: false });
    g.restore();
    ly += 42;
  }
  swatch(g, lx, ly, EXACT, 'exact', { dashed: true, size: 13 });
  // the energy against the step
  const eTop = pr.y + S + 50, eH = hh - bottom - eTop - 22;
  if (eH < 60) return;
  const N = Math.max(m.n, 10);
  let lo = -0.4, hi = 0.4;
  const curves = [];
  for (const k of kinds) { const ys = r.runs[k.id].energies.map((e) => decades(e, r.E0)); curves.push({ k, ys }); for (const y of ys) { lo = Math.min(lo, y); hi = Math.max(hi, y); } }
  const exactE = r.runs.semi.times.map((t) => { const e = P.exactSpring(m.k, 1, m.c, 1, 0, t); return decades(P.energyOf(m.k, 1, e.x, e.v), r.E0); });
  lo = Math.min(lo, ...exactE); hi = Math.max(hi, ...exactE);
  const pad2 = 0.08 * (hi - lo);
  const fmtE = (t) => (Math.abs(t) <= 3 ? num(10 ** t, 3) : `10^${Math.round(t)}`);
  const ep = makePlot(g, { x: pr.x, y: eTop, w: w - pr.x - pad, h: eH }, [0, N], [lo - pad2, hi + pad2], { yFormat: fmtE, xTitle: 'step', title: 'energy / starting energy', yTicks: niceTicks(lo - pad2, hi + pad2, 4).filter((t) => Number.isInteger(t) || hi - lo < 4) });
  line(g, ep, r.runs.semi.times.map((t, i) => i), exactE, EXACT, { width: 1.4, dash: [5, 4] });
  for (const c of curves) {
    g.save();
    g.globalAlpha = ov.dim('energy', 'run', c.k.id);
    line(g, ep, c.ys.map((y, i) => i), c.ys, c.k.color, { width: c.k.id === 'verlet' ? 3.5 : 2, dash: c.k.id === 'verlet' ? [2, 5] : null });
    if (m.n <= 40) dots(g, ep, c.ys.map((y, i) => i), c.ys, c.k.color, { r: 2.6, hollow: c.k.id === 'verlet' });
    g.restore();
  }
}

function phaseView() {
  return {
    id: 'phase', topic: 'energy', label: 'Phase plane', inputTitle: 'Step and spring',
    init: { ...PHASE_BASE, n: 6 },
    params: [
      { id: 'n', label: 'steps taken', min: 0, max: 200, step: 1, play: true },
      { id: 'h', label: 'step Δt', min: 0.01, max: 0.3, step: 0.01, unit: ' s' },
      { id: 'k', label: 'k, N/m', min: 1, max: 400, step: 1 },
      { id: 'c', label: 'c, N·s/m', min: 0, max: 40, step: 0.5 },
    ],
    presets: [
      { label: 'Δt = 0.1: doubles', run: (m) => tidy(m, PHASE_BASE, { n: 6, h: 0.1 }) },
      { label: 'Δt = 0.01: 1.01 a step', run: (m) => tidy(m, PHASE_BASE, { n: 100, h: 0.01, show: 'explicit' }) },
      { label: 'semi, Δt = 0.19', run: (m) => tidy(m, PHASE_BASE, { n: 200, h: 0.19, show: 'semi' }) },
      { label: 'semi, Δt = 0.21', run: (m) => tidy(m, PHASE_BASE, { n: 200, h: 0.21, show: 'semi' }) },
      { label: 'critical damper', run: (m) => tidy(m, PHASE_BASE, { n: 20, h: 0.05, c: 20 }) },
      { label: 'damper past its limit', run: (m) => tidy(m, PHASE_BASE, { n: 40, h: 0.11, c: 20 }) },
    ],
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['Stability: growth per step', 'One step of a spring'],
    setup(ctx) { showOverlay(ctx, {}); },
    leave(ctx) { hideOverlay(ctx); },
    run(m) {
      const r = phaseRun(m);
      const rep = r.reps.explicit;
      return { ...rep, ...r, growth: rep.growth };
    },
    draw(v, m, r, ctx) {
      const ov = hasOverlay(ctx);
      if (!ov) return;
      ov.painter = captioned(ov, CAPTION_PHASE, (g, w, h) => paintPhase(ov, g, w, h, m, r));
      ov.repaint();
    },
    explain(m, r) {
      const E = (id) => r.runs[id].energies[m.n];
      const ratio = (id) => E(id) / r.E0;
      const rep = (id) => r.reps[id];
      const hw = m.h * r.omega;
      const lim = rep('semi').limit;
      const rows = [
        `{omega|ω} = √(k/m) = ${num(r.omega, 4)} rad/s, step Δt = ${fixed(m.h, 3)} s, {limit|Δt ω = ${num(hw, 3)}}`,
        `{explicit|explicit}: E after ${m.n} steps = ${sci(E('explicit'))} J, ${sci(ratio('explicit'))} × the start; ${m.c === 0 ? `1 + (hω)² = ${num(rep('explicit').energyFactor, 4)} per step` : `${num(rep('explicit').energyFactor, 4)} per step`}`,
        `{semi|semi-implicit}: E between ${sci(Math.min(...r.runs.semi.energies))} and ${sci(r.peak('semi'))} J; ${rep('semi').bounded ? 'bounded' : 'growing'}, limit Δt = ${Number.isFinite(lim) ? `${fixed(lim, 3)} s (hω = ${num(lim * r.omega, 3)})` : 'none'}`,
        `{verlet|Verlet}: the same points as semi-implicit (largest difference in E ${sci(Math.max(...r.runs.verlet.energies.map((e, i) => Math.abs(e - r.runs.semi.energies[i]))))} J)`,
        `{implicit|implicit}: E after ${m.n} steps = ${sci(E('implicit'))} J, ${num(rep('implicit').energyFactor, 3)} per step`,
      ];
      if (m.c > 0) rows.push(`{damper|damper}: c = ${num(m.c, 3)}, critical ${num(2 * Math.sqrt(m.k), 4)}; stepped explicitly it multiplies v by 1 − Δt c / m = ${num(rep('semi').damperFactor, 3)}, stable while Δt c / m < 2`);
      let status;
      if (m.c > 0 && !rep('semi').bounded && hw < 2) status = { text: `Δt ω = ${num(hw, 3)} is under 2, yet semi-implicit grows: the damper's own step limit (Δt c / m < 2) is passed (Δt c / m = ${num((m.h * m.c), 3)}). Implicit Euler is still bounded.`, tone: 'bad' };
      else if (m.c === 0 && rep('semi').bounded && hw < 2) status = { text: `Under the limit: explicit Euler gains energy every step (${num(rep('explicit').energyFactor, 4)} ×), semi-implicit and Verlet stay on a closed curve, implicit Euler spirals in.`, tone: 'ok' };
      else if (!rep('semi').bounded) status = { text: `Δt ω = ${num(hw, 3)} is past 2: semi-implicit Euler and Verlet now grow too.`, tone: 'bad' };
      else status = { text: 'Damping removes energy from the exact motion; each integrator removes a different amount.', tone: 'info' };
      return {
        hud: `{limit|Δt ω = ${num(hw, 3)}} · {explicit|explicit ×${num(rep('explicit').energyFactor, 3)}/step} · {semi|semi: ${rep('semi').bounded ? 'bounded' : 'grows'}}`,
        rows, status,
        values: [['Δt ω', num(hw, 4), 'limit'], ['semi limit Δt', Number.isFinite(lim) ? `${fixed(lim, 3)} s` : 'none', 'semi'],
          [`explicit E, n = ${m.n}`, `${sci(E('explicit'))} J`, 'explicit'], [`semi E, n = ${m.n}`, `${sci(E('semi'))} J`, 'semi'],
          ['semi E, peak', `${sci(r.peak('semi'))} J`, 'semi'], [`implicit E, n = ${m.n}`, `${sci(E('implicit'))} J`, 'implicit']],
        fact: 'The phase plane plots x against v / ω, so the exact motion is a circle. Energy is plotted as a multiple of the start, one decade per gridline.',
      };
    },
    panelTitle: 'Show',
    panel(host, m, r, ctx) {
      once(host, 'phase', (h) => {
        h.refreshers = [];
        h.refreshers.push(segmented(h, 'show', [['all', 'all'], ...KIND_OPTIONS], () => ctx.state().show, (v) => { ctx.state().show = v; ctx.update(); }));
        el('p', 'lab-note', h, 'Verlet is drawn as rings over semi-implicit Euler: the two are the same points.');
      });
      for (const fn of host.refreshers) fn();
    },
  };
}

// ================================================================ the step limit

const LIMIT_BASE = { k: 100, c: 0, h: 0.1 };
const U_MAX = 3;

function limitRun(m) {
  const omega = Math.sqrt(m.k);
  const us = [], curves = {};
  for (const k of KINDS) curves[k.id] = [];
  const N = 120;
  for (let i = 0; i <= N; i++) {
    const u = (U_MAX * i) / N;
    us.push(u);
    for (const k of KINDS) curves[k.id].push(P.growthPerStep(k.id, m.k, 1, m.c, u / omega));
  }
  const reps = {};
  for (const k of KINDS) reps[k.id] = P.stabilityReport(k.id, m.k, 1, m.c, m.h);
  return { omega, us, curves, reps, dtOmega: m.h * omega };
}

const CAPTION_LIMIT = 'How much each method multiplies the swing in one step (up), for every step size (across, the step measured against the spring as Δt·ω). Above 1 the motion grows without end. Semi-implicit and Verlet hold at exactly 1 until Δt·ω = 2: that is the step limit.';
function paintLimit(ov, g, w, hh, m, r) {
  const pad = 14, top = ov.top + 24, bottom = bottomOf(ov);
  const pr = { x: pad + 40, y: top, w: w - 2 * pad - 44, h: Math.max(140, hh - top - bottom - 34) };
  const YMAX = 3.2;
  const plot = makePlot(g, pr, [0, U_MAX], [0, YMAX], { xTitle: 'Δt ω', title: 'amplitude growth per step', xTicks: [0, 0.5, 1, 1.5, 2, 2.5, 3], yTicks: [0, 0.5, 1, 1.5, 2, 2.5, 3] });
  // bounded below this line
  g.save();
  g.strokeStyle = AMBER; g.setLineDash([6, 4]); g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(pr.x, plot.Y(1)); g.lineTo(pr.x + pr.w, plot.Y(1)); g.stroke();
  g.restore();
  text(g, 'bounded at or below 1', pr.x + pr.w - 6, plot.Y(1) + 17, { size: 12, align: 'right', color: AMBER, halo: false });
  const semiLimit = r.reps.semi.limit * r.omega;
  if (Number.isFinite(semiLimit) && semiLimit < U_MAX) {
    g.save();
    g.strokeStyle = '#7ee787'; g.setLineDash([2, 4]); g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(plot.X(semiLimit), pr.y); g.lineTo(plot.X(semiLimit), pr.y + pr.h); g.stroke();
    g.restore();
    text(g, `semi-implicit limit ${num(semiLimit, 3)}`, plot.X(semiLimit) - 6, pr.y + pr.h - 8, { size: 12, align: 'right', color: '#7ee787', halo: false });
  }
  for (const k of [KINDS[0], KINDS[3], KINDS[1], KINDS[2]]) {
    g.save();
    g.globalAlpha = ov.dim('limit', k.id);
    line(g, plot, r.us, r.curves[k.id], k.color, { width: k.id === 'verlet' ? 3.5 : 2.2, dash: k.id === 'verlet' ? [2, 5] : null });
    g.restore();
  }
  const cx = Math.min(U_MAX, r.dtOmega);
  g.save();
  g.strokeStyle = '#ffd166'; g.lineWidth = 1.2; g.setLineDash([3, 3]);
  g.beginPath(); g.moveTo(plot.X(cx), pr.y); g.lineTo(plot.X(cx), pr.y + pr.h); g.stroke();
  g.restore();
  for (const k of KINDS) dots(g, plot, [cx], [r.reps[k.id].growth], k.color, { r: 5.5, hollow: k.id === 'verlet' });
  text(g, `Δt ω = ${num(r.dtOmega, 3)}`, plot.X(cx) + (cx > U_MAX * 0.8 ? -6 : 6), pr.y + 34, { size: 13, align: cx > U_MAX * 0.8 ? 'right' : 'left', color: '#ffd166' });
  KINDS.forEach((k, i) => swatch(g, pr.x + 10, pr.y + 20 + 19 * i, k.color, k.short, { dot: true, ring: k.id === 'verlet' }));
}

function limitView() {
  return {
    id: 'limit', topic: 'energy', label: 'The step limit', inputTitle: 'Step and spring',
    init: { ...LIMIT_BASE },
    params: [
      { id: 'h', label: 'step Δt', min: 0.01, max: 0.3, step: 0.01, unit: ' s', play: true },
      { id: 'k', label: 'k, N/m', min: 1, max: 400, step: 1 },
      { id: 'c', label: 'c, N·s/m', min: 0, max: 40, step: 0.5 },
    ],
    presets: [
      { label: 'Δt = 0.1 (Δtω = 1)', run: (m) => tidy(m, LIMIT_BASE, { h: 0.1 }) },
      { label: 'Δt = 0.19', run: (m) => tidy(m, LIMIT_BASE, { h: 0.19 }) },
      { label: 'Δt = 0.21', run: (m) => tidy(m, LIMIT_BASE, { h: 0.21 }) },
      { label: 'stiffer, k = 400', run: (m) => tidy(m, LIMIT_BASE, { h: 0.1, k: 400 }) },
      { label: 'damper c = 20', run: (m) => tidy(m, LIMIT_BASE, { h: 0.11, c: 20 }) },
    ],
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['Stability: growth per step'],
    setup(ctx) { showOverlay(ctx, {}); },
    leave(ctx) { hideOverlay(ctx); },
    run(m) {
      const r = limitRun(m);
      return { ...r.reps.explicit, ...r };
    },
    draw(v, m, r, ctx) {
      const ov = hasOverlay(ctx);
      if (!ov) return;
      ov.painter = captioned(ov, CAPTION_LIMIT, (g, w, h) => paintLimit(ov, g, w, h, m, r));
      ov.repaint();
    },
    explain(m, r) {
      const rep = (id) => r.reps[id];
      const lim = rep('semi').limit;
      const rows = [
        `{omega|ω} = √(k/m) = ${num(r.omega, 4)} rad/s, {limit|Δt ω = ${num(r.dtOmega, 4)}}`,
        `{explicit|explicit}: growth ${num(rep('explicit').growth, 4)} per step, energy × ${num(rep('explicit').energyFactor, 4)}${m.c === 0 ? ` = 1 + (hω)²` : ''}`,
        `{semi|semi-implicit}: growth ${num(rep('semi').growth, 4)}, ${rep('semi').bounded ? 'bounded' : `energy × ${num(rep('semi').energyFactor, 4)} per step`}; largest bounded Δt = ${Number.isFinite(lim) ? `${fixed(lim, 3)} s (hω = ${num(lim * r.omega, 3)})` : 'none'}`,
        `{verlet|Verlet}: growth ${num(rep('verlet').growth, 4)}, the same as semi-implicit`,
        `{implicit|implicit}: growth ${num(rep('implicit').growth, 4)}, energy × ${num(rep('implicit').energyFactor, 4)} per step; never grows`,
      ];
      if (m.c > 0) rows.push(`{damper|damper}: v is multiplied by 1 − Δt c / m = ${num(rep('semi').damperFactor, 3)} each step; explicit Euler is bounded only below Δt = ${fixed(rep('explicit').limit, 3)} s`);
      const status = rep('semi').bounded
        ? { text: `Inside the limit: semi-implicit Euler and Verlet stay bounded. Explicit Euler grows at every Δt${m.c > 0 ? ' unless the damper holds it' : ''}.`, tone: 'ok' }
        : { text: `Past the limit: every step multiplies the amplitude by ${num(rep('semi').growth, 4)}, and the energy by ${num(rep('semi').energyFactor, 4)}.`, tone: 'bad' };
      return {
        hud: `{limit|Δt ω = ${num(r.dtOmega, 3)}} · {explicit|explicit ×${num(rep('explicit').energyFactor, 3)} E} · {semi|semi ×${num(rep('semi').energyFactor, 3)} E}`,
        rows, status,
        values: [['Δt ω', num(r.dtOmega, 4), 'limit'], ['explicit E per step', `× ${num(rep('explicit').energyFactor, 4)}`, 'explicit'],
          ['semi E per step', `× ${num(rep('semi').energyFactor, 4)}`, 'semi'], ['implicit E per step', `× ${num(rep('implicit').energyFactor, 4)}`, 'implicit'],
          ['semi limit Δt', Number.isFinite(lim) ? `${fixed(lim, 3)} s` : 'none', 'limit'], ['damper factor', num(rep('semi').damperFactor, 3), 'damper']],
        fact: 'Growth per step is the largest eigenvalue magnitude of the step as a 2 by 2 matrix on (x, v). Move Δt with the slider or press play.',
      };
    },
  };
}

export function springViews() { return [springView(), phaseView(), limitView()]; }
export { sign, mm };
