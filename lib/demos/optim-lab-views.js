// optim-lab-views: the catalog behind the optim-lab demo (runtime: lib/core/lab.js). Training a network is walking downhill on a loss
// surface: gradient descent and the learning rate, the shapes of loss surfaces, momentum and Adam, minibatches and schedules.
// run() calls the program's own functions (lib/programs/optim-lab/webgl/optimlab.js), so the numbers beside the code
// are that code's output.
//   makeViews(S): S.show({ key, spec }) draws the loss surface in the scene (optim-lab.js); a stub in the node tests.
import * as O from '../programs/optim-lab/webgl/optimlab.js';
import { COL, V } from '../core/lab-viz.js';
import { makeMap, linePlot } from './optim-lab-draw.js';

export const TOPICS = [
  { id: 'descent', label: 'Descent' }, { id: 'optim', label: 'Optimizers' }, { id: 'batch', label: 'Minibatch' },
];

export const KEYS = {
  theta: COL.white, grad: COL.a, step: COL.gold, eta: COL.amber, loss: COL.c, gd: COL.white, mom: COL.cyan, adam: COL.pink,
  full: COL.gold, batch: COL.a, noise: COL.amber, sched: COL.cyan, decay: COL.purple,
};

const f = (x, d = 2) => (Number.isFinite(x) ? (Number(x.toFixed(d)) === 0 ? (0).toFixed(d) : x.toFixed(d)).replace('-', '−') : 'none');
const g3 = (x) => (Number.isFinite(x) ? (x === 0 ? '0' : Math.abs(x) >= 1e4 || Math.abs(x) < 1e-3 ? x.toExponential(2) : String(Number(x.toPrecision(4)))).replace('-', '−') : 'none');
const vt = (a, d = 3) => `(${a.map((x) => g3(Number(x.toFixed(d)))).join(', ')})`;
const lg = (L, floor) => Math.log10(Math.max(L - floor, 1e-12));
const interp = (arr) => (x) => { const i = Math.min(arr.length - 1, Math.max(0, x)); const a = Math.floor(i), b = Math.min(arr.length - 1, a + 1); return arr[a] + (arr[b] - arr[a]) * (i - a); };

// ---------------------------------------------------------------- the surfaces

const SURF = {
  bowl: { label: 'bowl', region: 'A quadratic bowl', domain: [-3, 3, -3, 3], floor: 0, gscale: 0.25, h: [1, 4, 0], minima: [[0, 0]], title: 'bowl, curvatures 1 and 4' },
  'ill-conditioned': { label: 'ill-conditioned bowl', region: 'A quadratic bowl', domain: [-3, 3, -3, 3], floor: 0, gscale: 0.1, h: [0.5, 10, 0.5], minima: [[0, 0]], title: 'ill-conditioned bowl, curvatures 0.5 and 10, turned 0.5 rad' },
  saddle: { label: 'saddle', region: 'A saddle with two minima', domain: [-2.2, 2.2, -1.8, 1.8], floor: -0.25, gscale: 0.8, minima: [[0, 1], [0, -1]], saddle: [0, 0], title: 'saddle at the origin, minima at (0, 1) and (0, −1)' },
  valley: { label: 'curved valley', region: 'A curved valley', domain: [-2, 2, -0.5, 3.5], floor: 0, gscale: 1, minima: [[1, 1]], title: 'Rosenbrock-like valley, minimum (1, 1)' },
  minima: { label: 'several minima', region: 'Several minima', domain: [-5, 5, -5, 5], floor: 0, gscale: 1, minima: [[0, 0]], title: 'ripple: a minimum near every multiple of π' },
  perceptron: { label: "the lecture's perceptron", region: "The perceptron's loss", domain: [-4, 4, -2.5, 2.5], floor: 0, gscale: 0.8, minima: [], title: "the lecture's perceptron: loss against w1 and w2 of unit 1" },
};
const specs = {};
function specOf(name) {
  if (specs[name]) return specs[name];
  const s = SURF[name];
  const lossFn = (x, y) => O.lossAt(name, x, y).loss;
  return (specs[name] = shape({ key: name, domain: s.domain, lossFn, floor: s.floor, extra: s }));
}
/** the height scale of the 3D surface and the contour step, from the largest loss on the domain */
function shape({ key, domain, lossFn, floor, extra = {} }) {
  let top = 0;
  for (let i = 0; i <= 24; i++) for (let j = 0; j <= 24; j++) top = Math.max(top, lossFn(domain[0] + (i / 24) * (domain[1] - domain[0]), domain[2] + (j / 24) * (domain[3] - domain[2])) - floor);
  const href = Math.max(top / 20, 1e-6);
  return { ...extra, key, domain, lossFn, floor, href, hs: 3.4 / Math.log(1 + top / href) };
}
export const heightOf = (spec, L) => spec.hs * Math.log(1 + Math.max(0, L - spec.floor) / spec.href);
const P = (spec, x, y, L, lift = 0) => V(x, heightOf(spec, L) + lift, -y);
const inside = (spec, x, y) => x > spec.domain[0] - 0.3 * (spec.domain[1] - spec.domain[0]) && x < spec.domain[1] + 0.3 * (spec.domain[1] - spec.domain[0])
  && y > spec.domain[2] - 0.3 * (spec.domain[3] - spec.domain[2]) && y < spec.domain[3] + 0.3 * (spec.domain[3] - spec.domain[2]);
const clampTo = (spec, x, y) => [Math.min(spec.domain[1], Math.max(spec.domain[0], x)), Math.min(spec.domain[3], Math.max(spec.domain[2], y))];

// ---------------------------------------------------------------- the regression data (minibatch and schedule views)

const N = 100, DATA_SEED = 7, BATCH_SEED = 99;
export const DATA = O.makeRegression(N, DATA_SEED);
const ALL = O.allIndices(N);
/** the least-squares line, from the normal equations; it marks the optimum and gives the surface its floor */
export function leastSquares(d = DATA) {
  let sx = 0, sxx = 0, sy = 0, sxy = 0;
  for (let i = 0; i < d.xs.length; i++) { sx += d.xs[i]; sxx += d.xs[i] ** 2; sy += d.ys[i]; sxy += d.xs[i] * d.ys[i]; }
  const n = d.xs.length, w = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return { w, b: (sy - w * sx) / n };
}
const LS = leastSquares();
const regressionLoss = (w, b) => O.regressionGradient(w, b, DATA.xs, DATA.ys, ALL).loss;
const REG = shape({ key: 'regression', domain: [-1, 3, -1, 3], lossFn: regressionLoss, floor: regressionLoss(LS.w, LS.b), extra: { gscale: 0.3 } });

// ---------------------------------------------------------------- shared panel parts (browser only)

function el(tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
function btn(parent, label, onClick, title) {
  const b = el('button', 'lab-btn', parent, label);
  b.type = 'button';
  if (title) b.title = title;
  b.addEventListener('click', (e) => { e.stopPropagation(); b.blur(); onClick(); });
  return b;
}
function once(host, id, build) {
  if (host.dataset.built === id) return host._ol;
  host.innerHTML = '';
  host.dataset.built = id;
  host._ol = {};
  build(host, host._ol);
  return host._ol;
}
function segmented(parent, label, options, get, set) {
  const row = el('div', 'lab-btns', parent);
  el('span', 'ol-seglabel', row, label);
  const bs = options.map(([value, text]) => {
    const b = btn(row, text, () => { set(value); show(); });
    b.dataset.value = value;
    return b;
  });
  function show() { bs.forEach((b) => b.classList.toggle('on', b.dataset.value === String(get()))); }
  show();
  return show;
}

// ---------------------------------------------------------------- 3D pieces

const HOME = { eye: [4.0, 8.0, 6.2], target: [0, 0.4, 0] };

function drawWalk(v, spec, path, t, color, k, r = 0.045) {
  const pts = [];
  for (let i = 0; i <= Math.min(t, path.count - 1); i++) {
    if (!inside(spec, path.xs[i], path.ys[i])) break;
    pts.push(P(spec, path.xs[i], path.ys[i], path.losses[i], 0.06));
  }
  if (pts.length > 1) v.poly(pts, color, { k });
  pts.forEach((p) => v.point(p, color, { k, r }));
}
/** a vector of the parameter plane, drawn flat at the height of the point it starts from */
function flat(v, spec, x, y, L, dx, dy, color, k, label) {
  const a = P(spec, x, y, L, 0.1);
  v.arrow(a, V(a.x + dx, a.y, a.z - dy), color, { k, r: 0.03, hr: 0.09, head: 0.22, label });
}

// ---------------------------------------------------------------- outcomes of a run

function outcome(surface, path) {
  const last = path.count - 1;
  if (path.diverged) return { kind: 'diverged', tone: 'bad', text: `Diverging: the loss passed 10^6 after ${last} steps. Each step lands higher on the far wall than the one before.` };
  const g = Math.hypot(path.gxs[last], path.gys[last]);
  let flips = 0;
  for (let t = 1; t <= last; t++) if (path.gxs[t] * path.gxs[t - 1] + path.gys[t] * path.gys[t - 1] < 0) flips++;
  const osc = last >= 4 && flips >= 0.5 * last;
  if (g < 1e-3) {
    const c = O.curvatureAt(surface, path.xs[last], path.ys[last]);
    const at = `(${f(path.xs[last], 2)}, ${f(path.ys[last], 2)})`;
    if (c.lambdaMin < -1e-3) return { kind: 'saddle', tone: 'warn', text: `Stopped at ${at}: the gradient is zero but the curvatures are ${f(c.lambdaMin, 2)} and ${f(c.lambdaMax, 2)}, a saddle, not a minimum.` };
    return { kind: 'minimum', tone: 'ok', text: `Converged to the minimum at ${at}, loss ${g3(path.losses[last])}, after ${last} steps${osc ? `; the gradient reversed on ${flips} of them (overshooting)` : ''}.` };
  }
  if (osc) return { kind: 'oscillating', tone: 'warn', text: `Oscillating: the gradient reversed direction on ${flips} of ${last} steps, so each step overshoots the valley floor.` };
  return { kind: 'slow', tone: 'info', text: `Still descending after ${last} steps (loss ${g3(path.losses[last])}, gradient ${g3(g)}): the step is small for this surface.` };
}

// ---------------------------------------------------------------- the views

export function makeViews(S) {
  const views = [];

  // ---- Descent and landscapes
  function descentView({ id, label, surfaces, presets, inputTitle }) {
    let cur = null;
    const clampStart = (m) => { const spec = specOf(m.surface); [m.sx, m.sy] = clampTo(spec, m.sx, m.sy); };
    const view = {
      id, topic: 'descent', label, home: HOME, inputTitle, panelTitle: 'Contour map: click to start there', keys: KEYS, grid: 'xz',
      init: { sx: -2.5, sy: 1.8, eta: 0.4, steps: 30, surface: surfaces[0] },
      params: [
        { id: 'sx', label: 'start θ₁', min: -5, max: 5, step: 0.1 }, { id: 'sy', label: 'start θ₂', min: -5, max: 5, step: 0.1 },
        { id: 'eta', label: 'learning rate η', min: 0, max: 0.7, step: 0.01 }, { id: 'steps', label: 'steps shown', min: 0, max: 100, step: 1, play: true },
      ],
      get regions() { return [SURF[cur?.surface ?? surfaces[0]].region, 'Gradient descent step']; },
      presets,
      edited(m) { clampStart(m); },
      run(m) {
        cur = m;
        if (!surfaces.includes(m.surface)) m.surface = surfaces[0];
        clampStart(m);
        const path = O.runOptimizer(m.surface, 'gd', [m.sx, m.sy], m.eta, 0, 100);
        const t = Math.min(Math.round(m.steps), path.count - 1);
        const here = O.lossAt(m.surface, path.xs[t], path.ys[t]);
        const moved = O.descentStep([path.xs[t], path.ys[t]], [here.gx, here.gy], m.eta);
        const s = SURF[m.surface];
        const rate = s.h ? O.quadraticRate(s.h[0], s.h[1], m.eta) : null;
        return { ...here, ...moved, ...(rate ?? {}), path, t, spec: specOf(m.surface), end: outcome(m.surface, path) };
      },
      draw(v, m, r) {
        const { spec, path, t } = r;
        S.show({ key: spec.key, spec });
        const s = SURF[m.surface];
        for (const q of s.minima) v.point(P(spec, q[0], q[1], O.lossAt(m.surface, q[0], q[1]).loss, 0.04), COL.green, { r: 0.07, k: 'minimum' });
        drawWalk(v, spec, path, t, COL.white, 'theta');
        const x = path.xs[t], y = path.ys[t];
        v.point(P(spec, x, y, path.losses[t], 0.06), COL.gold, { r: 0.1, k: 'theta' });
        if (!r.end.kind.startsWith('div') || t < path.count - 1) {
          flat(v, spec, x, y, path.losses[t], r.gx * s.gscale, r.gy * s.gscale, COL.a, 'grad', '∇L');
          flat(v, spec, x, y, path.losses[t], r.step[0], r.step[1], COL.gold, 'step', 'step');
        }
      },
      explain(m, r) {
        const { path, t } = r, s = SURF[m.surface];
        const rows = [
          `{theta|θ} = ${vt([path.xs[t], path.ys[t]])}, {loss|L(θ)} = ${g3(path.losses[t])}   (step ${t} of ${path.count - 1})`,
          `{grad|∇L} = ${vt([r.gx, r.gy])},  ‖∇L‖ = ${g3(Math.hypot(r.gx, r.gy))}   (arrow drawn at ${g3(s.gscale)} of its length)`,
          `{step|step} = −{eta|η} ∇L = −${f(m.eta)} × ${vt([r.gx, r.gy])} = ${vt(r.step)}`,
          `θ ← θ + step = ${vt(r.next)}`,
        ];
        if (s.h) {
          rows.push(`each axis is multiplied by 1 − {eta|η}h per step: 1 − ${f(m.eta)}·${g3(s.h[0])} = ${f(r.factor1, 3)}, 1 − ${f(m.eta)}·${g3(s.h[1])} = ${f(r.factor2, 3)}`);
          rows.push(`converges while max |1 − ηh| = ${f(r.rate, 3)} < 1, that is η < 2/${g3(s.h[1])} = ${f(r.etaLimit, 3)}; fastest at η = 2/(${g3(s.h[0])} + ${g3(s.h[1])}) = ${f(r.etaBest, 3)}`);
        }
        const L0 = path.losses[0], lo = Math.min(...path.losses.map((l) => lg(l, s.floor))), hi = Math.max(...path.losses.map((l) => lg(l, s.floor)));
        return {
          hud: `step ${t}: {theta|θ} = ${vt([path.xs[t], path.ys[t]], 2)}, {loss|L} = ${g3(path.losses[t])}`,
          rows, status: { text: r.end.text, tone: r.end.tone },
          chart: { curve: `log10 (loss − ${g3(s.floor)})`, x: [0, Math.max(1, path.count - 1)], y: [Math.floor(lo) - 0.5, Math.ceil(hi) + 0.5], xLabel: 'step', at: t, atY: lg(path.losses[t], s.floor), series: [{ fn: interp(path.losses.map((l) => lg(l, s.floor))), color: COL.c }] },
          values: [['surface', s.title], ['start loss', g3(L0)], ['loss now', g3(path.losses[t])], ['ratio now/start', g3(path.losses[t] / L0)]],
          fact: 'A straight line on the curve is a constant factor per step. Click the map or the surface to move the start.',
        };
      },
      panel(host, m, r, ctx) {
        const ui = once(host, id, (h, u) => {
          const row = el('div', 'ol-row', h);
          u.show = segmented(row, 'surface', surfaces.map((s) => [s, SURF[s].label]), () => ctx.state().surface, (v) => { ctx.state().surface = v; ctx.state().steps = Math.min(ctx.state().steps, 100); ctx.update(); });
          u.map = makeMap(h, (x, y) => { const mm = ctx.state(); mm.sx = Math.round(x * 20) / 20; mm.sy = Math.round(y * 20) / 20; ctx.update(); });
        });
        ui.show();
        const spec = r.spec, { path, t } = r, s = SURF[m.surface];
        const over = [];
        for (const q of s.minima) over.push({ type: 'cross', at: q, color: '#7ee787' });
        if (s.saddle) over.push({ type: 'cross', at: s.saddle, color: '#ffa657' });
        over.push({ type: 'path', xs: path.xs, ys: path.ys, to: t, color: '#e7eaf0' });
        over.push({ type: 'arrow', from: [path.xs[t], path.ys[t]], to: [path.xs[t] + r.gx * s.gscale, path.ys[t] + r.gy * s.gscale], color: '#ff7b72' });
        over.push({ type: 'arrow', from: [path.xs[t], path.ys[t]], to: [path.xs[t] + r.step[0], path.ys[t] + r.step[1]], color: '#ffd166', width: 2.5 });
        over.push({ type: 'dot', at: [path.xs[0], path.ys[0]], color: '#79c0ff', r: 4 });
        over.push({ type: 'dot', at: [path.xs[t], path.ys[t]], color: '#ffd166' });
        ui.map.draw(spec, over);
      },
      onPick(ray, e, ctx) { pickOnSurface(ray, ctx, view); },
    };
    return view;
  }

  /** a click on the 3D surface: march the ray until it passes under the surface, and start there */
  function pickOnSurface(ray, ctx, view) {
    const m = ctx.state(), spec = specOf(m.surface);
    let prev = null;
    for (let s = 0; s < 900; s++) {
      const t = s * 0.05;
      const x = ray.origin[0] + ray.dir[0] * t, y = -(ray.origin[2] + ray.dir[2] * t), h = ray.origin[1] + ray.dir[1] * t;
      if (x < spec.domain[0] || x > spec.domain[1] || y < spec.domain[2] || y > spec.domain[3]) { prev = null; continue; }
      const below = h <= heightOf(spec, spec.lossFn(x, y));
      if (below && prev !== false) { m.sx = Math.round(x * 10) / 10; m.sy = Math.round(y * 10) / 10; ctx.update(); return; }
      prev = !below;
    }
  }

  views.push(descentView({
    id: 'descent', label: 'learning rate', surfaces: ['bowl', 'ill-conditioned'], inputTitle: 'Start and step',
    presets: [
      { label: 'too small, η = 0.02', set: { surface: 'bowl', sx: -2.5, sy: 1.8, eta: 0.02, steps: 100 } },
      { label: 'right, η = 0.40', set: { surface: 'bowl', sx: -2.5, sy: 1.8, eta: 0.4, steps: 30 } },
      { label: 'too large, η = 0.45', set: { surface: 'bowl', sx: -2.5, sy: 1.8, eta: 0.45, steps: 30 } },
      { label: 'diverging, η = 0.60', set: { surface: 'bowl', sx: -2.5, sy: 1.8, eta: 0.6, steps: 100 } },
      { label: 'ill-conditioned, η = 0.19', set: { surface: 'ill-conditioned', sx: -2.5, sy: 1.5, eta: 0.19, steps: 60 } },
      { label: 'ill-conditioned, η = 0.21', set: { surface: 'ill-conditioned', sx: -2.5, sy: 1.5, eta: 0.21, steps: 100 } },
    ],
  }));
  views.push(descentView({
    id: 'landscapes', label: 'surfaces', surfaces: ['saddle', 'valley', 'minima', 'perceptron'], inputTitle: 'Start and step',
    presets: [
      { label: 'saddle, on the axis', set: { surface: 'saddle', sx: 1.5, sy: 0, eta: 0.1, steps: 100 } },
      { label: 'saddle, off the axis', set: { surface: 'saddle', sx: 1.5, sy: 0.05, eta: 0.1, steps: 100 } },
      { label: 'valley, η = 0.05', set: { surface: 'valley', sx: -1.5, sy: 2, eta: 0.05, steps: 100 } },
      { label: 'valley, η = 0.40', set: { surface: 'valley', sx: -1.5, sy: 2, eta: 0.4, steps: 100 } },
      { label: 'ripple, local minimum', set: { surface: 'minima', sx: 2.5, sy: 2.2, eta: 0.2, steps: 100 } },
      { label: 'ripple, lowest minimum', set: { surface: 'minima', sx: 1, sy: 1, eta: 0.2, steps: 100 } },
      { label: "lecture's perceptron, η = 0.1", set: { surface: 'perceptron', sx: 1, sy: 0.8, eta: 0.1, steps: 100 } },
    ],
  }));

  // ---- Optimizers
  const OPT = [['gd', 'gradient descent', 'Gradient descent step', COL.white, '#e7eaf0'], ['momentum', 'momentum', 'Momentum step', COL.cyan, '#56d4dd'], ['adam', 'Adam', 'Adam step', COL.pink, '#ff79c6']];
  const OSTEPS = 150;
  {
    let cur = null;
    const view = {
      id: 'optimizers', topic: 'optim', label: 'momentum and Adam', home: HOME, keys: KEYS, grid: 'xz', inputTitle: 'Same start, three optimizers', panelTitle: 'Contour map: click to start there',
      init: { surface: 'valley', sx: -1.5, sy: 2, etaG: 0.08, beta: 0.9, etaA: 0.1, t: 60, code: 'adam' },
      params: [
        { id: 'sx', label: 'start θ₁', min: -5, max: 5, step: 0.1 }, { id: 'sy', label: 'start θ₂', min: -5, max: 5, step: 0.1 },
        { id: 'etaG', label: 'η (descent, momentum)', min: 0, max: 0.7, step: 0.01 }, { id: 'beta', label: 'momentum β', min: 0, max: 0.99, step: 0.01 },
        { id: 'etaA', label: 'η (Adam)', min: 0, max: 0.7, step: 0.01 }, { id: 't', label: 'step t', min: 0, max: OSTEPS, step: 1, play: true },
      ],
      get regions() { return [OPT.find((o) => o[0] === (cur?.code ?? 'adam'))[2]]; },
      presets: [
        { label: 'zig-zag bowl', set: { surface: 'ill-conditioned', sx: -2.5, sy: 1.5, etaG: 0.05, beta: 0.9, etaA: 0.2, t: 40 } },
        { label: 'first Adam step', set: { surface: 'ill-conditioned', sx: -2.5, sy: 1.5, etaG: 0.05, beta: 0.9, etaA: 0.2, t: 0, code: 'adam' } },
        { label: 'curved valley', set: { surface: 'valley', sx: -1.5, sy: 2, etaG: 0.08, beta: 0.9, etaA: 0.1, t: 60 } },
        { label: 'saddle', set: { surface: 'saddle', sx: 1.5, sy: 0.05, etaG: 0.1, beta: 0.9, etaA: 0.1, t: 40 } },
        { label: 'ripple', set: { surface: 'minima', sx: 4, sy: -3, etaG: 0.05, beta: 0.9, etaA: 0.1, t: 80 } },
      ],
      edited(m) { [m.sx, m.sy] = clampTo(specOf(m.surface), m.sx, m.sy); },
      run(m) {
        cur = m;
        [m.sx, m.sy] = clampTo(specOf(m.surface), m.sx, m.sy);
        const start = [m.sx, m.sy], etas = { gd: m.etaG, momentum: m.etaG, adam: m.etaA };
        const paths = {}, terms = {};
        for (const [kind] of OPT) {
          paths[kind] = O.runOptimizer(m.surface, kind, start, etas[kind], m.beta, OSTEPS);
          const t = Math.min(Math.round(m.t), paths[kind].count - 1);
          const state = O.runOptimizer(m.surface, kind, start, etas[kind], m.beta, t);
          const x = state.xs[state.count - 1], y = state.ys[state.count - 1];
          const here = O.lossAt(m.surface, x, y), th = [x, y], grad = [here.gx, here.gy];
          const upd = kind === 'gd' ? O.descentStep(th, grad, etas[kind]) : kind === 'momentum' ? O.momentumStep(th, state.vel, grad, etas[kind], m.beta)
            : O.adamStep(th, state.m, state.v, grad, t + 1, etas[kind], O.BETA1, O.BETA2, O.EPSILON);
          terms[kind] = { t, here, upd, th, state };
        }
        const shown = terms[m.code] ?? terms.adam;
        return { ...shown.here, ...shown.upd, paths, terms, spec: specOf(m.surface) };
      },
      draw(v, m, r) {
        S.show({ key: r.spec.key, spec: r.spec });
        for (const q of SURF[m.surface].minima) v.point(P(r.spec, q[0], q[1], O.lossAt(m.surface, q[0], q[1]).loss, 0.04), COL.green, { r: 0.07, k: 'minimum' });
        for (const [kind, , , col] of OPT) {
          const path = r.paths[kind], t = r.terms[kind].t;
          drawWalk(v, r.spec, path, t, col, kind, 0.04);
          if (inside(r.spec, path.xs[t], path.ys[t])) v.point(P(r.spec, path.xs[t], path.ys[t], path.losses[t], 0.07), col, { r: 0.1, k: kind });
        }
        const sel = r.terms[m.code];
        if (sel) { const p = r.paths[m.code]; flat(v, r.spec, sel.th[0], sel.th[1], sel.here.loss, sel.upd.step[0], sel.upd.step[1], COL.gold, 'step', 'step'); void p; }
      },
      explain(m, r) {
        const s = SURF[m.surface], T = r.terms;
        const gd = T.gd, mo = T.momentum, ad = T.adam;
        const rows = [
          `{gd|gradient descent}, step ${gd.t}: g = ${vt([gd.here.gx, gd.here.gy])}, step = −η g = ${vt(gd.upd.step)}`,
          `{mom|momentum}, step ${mo.t}: g = ${vt([mo.here.gx, mo.here.gy])}, v ← βv + g = ${f(m.beta)}·${vt(mo.state.vel)} + g = ${vt(mo.upd.v)}, step = −η v = ${vt(mo.upd.step)}`,
          `{adam|Adam}, step ${ad.t}: g = ${vt([ad.here.gx, ad.here.gy])}, m = ${vt(ad.upd.m)}, v = ${vt(ad.upd.v)}`,
          `{adam|Adam}: m̂ = m/${g3(ad.upd.c1)} = ${vt(ad.upd.mHat)}, v̂ = v/${g3(ad.upd.c2)} = ${vt(ad.upd.vHat)}, step = −η m̂/(√v̂ + ε) = ${vt(ad.upd.step)}`,
        ];
        if (ad.t === 0) rows.push(`At t = 1 Adam's step is η times the sign of each gradient component: ${vt(ad.upd.step)} for η = ${f(m.etaA)}.`);
        const reach = (path) => { const goal = 0.01 * path.losses[0] + s.floor * 0.99; const i = path.losses.findIndex((l) => l < goal); return path.diverged ? 'diverged' : i < 0 ? `not within ${OSTEPS}` : `step ${i}`; };
        const vals = OPT.map(([kind, name]) => [name, `L = ${g3(r.paths[kind].losses[Math.min(T[kind].t, r.paths[kind].count - 1)])}; 1% of start at ${reach(r.paths[kind])}`, kind]);
        const finals = OPT.map(([kind]) => ({ kind, L: r.paths[kind].losses[Math.min(T[kind].t, r.paths[kind].count - 1)], div: r.paths[kind].diverged }));
        const ok = finals.filter((q) => !q.div);
        const best = ok.length ? ok.reduce((a, b) => (b.L < a.L ? b : a)) : null;
        const all = OPT.flatMap(([kind]) => r.paths[kind].losses.map((l) => lg(l, s.floor)));
        const mk = (kind) => interp(r.paths[kind].losses.map((l) => lg(l, s.floor)));
        return {
          hud: `step ${gd.t}: {gd|descent} ${g3(r.paths.gd.losses[Math.min(gd.t, r.paths.gd.count - 1)])}, {mom|momentum} ${g3(r.paths.momentum.losses[Math.min(mo.t, r.paths.momentum.count - 1)])}, {adam|Adam} ${g3(r.paths.adam.losses[Math.min(ad.t, r.paths.adam.count - 1)])}`,
          rows,
          status: best ? { text: `At step ${gd.t} the lowest loss is ${OPT.find((o) => o[0] === best.kind)[1]}'s, ${g3(best.L)}.${finals.some((q) => q.div) ? ' One optimizer has diverged.' : ''}`, tone: finals.some((q) => q.div) ? 'warn' : 'info' } : { text: 'All three diverged: lower the learning rates.', tone: 'bad' },
          chart: { curve: 'log10 (loss − min)', x: [0, OSTEPS], y: [Math.floor(Math.min(...all)) - 0.5, Math.ceil(Math.max(...all)) + 0.5], xLabel: 'step', at: gd.t, atY: lg(r.paths.gd.losses[Math.min(gd.t, r.paths.gd.count - 1)], s.floor), series: OPT.map(([kind, , , col]) => ({ fn: mk(kind), color: col })) },
          values: vals,
          fact: "Adam: Kingma and Ba, 2015. Momentum and Adam keep one extra number per weight (v, or m and v), so they cost memory, not gradients.",
        };
      },
      panel(host, m, r, ctx) {
        const ui = once(host, 'optimizers', (h, u) => {
          const row = el('div', 'ol-row', h);
          u.surf = segmented(row, 'surface', ['ill-conditioned', 'valley', 'saddle', 'minima'].map((s) => [s, SURF[s].label]), () => ctx.state().surface, (v) => { ctx.state().surface = v; ctx.update(); });
          const row2 = el('div', 'ol-row', h);
          u.code = segmented(row2, 'code card', OPT.map(([k, n]) => [k, n]), () => ctx.state().code, (v) => { ctx.state().code = v; ctx.update(); });
          u.map = makeMap(h, (x, y) => { const mm = ctx.state(); mm.sx = Math.round(x * 20) / 20; mm.sy = Math.round(y * 20) / 20; ctx.update(); });
        });
        ui.surf(); ui.code();
        const over = [];
        for (const q of SURF[m.surface].minima) over.push({ type: 'cross', at: q, color: '#7ee787' });
        for (const [kind, , , , css] of OPT) over.push({ type: 'path', xs: r.paths[kind].xs, ys: r.paths[kind].ys, to: r.terms[kind].t, color: css });
        over.push({ type: 'dot', at: [r.paths.gd.xs[0], r.paths.gd.ys[0]], color: '#79c0ff', r: 4 });
        ui.map.draw(r.spec, over);
      },
      onPick(ray, e, ctx) { pickOnSurface(ray, ctx, view); },
    };
    views.push(view);
  }

  // ---- Minibatch: the gradient estimate, and its noise
  const BATCHES = [1, 4, 16, 64, 256];
  views.push({
    id: 'minibatch', topic: 'batch', label: 'gradient noise', home: HOME, keys: KEYS, grid: 'xz', inputTitle: 'Point and batch', panelTitle: 'Contour map of the loss over (w, b)',
    init: { w: 0, b: 0, size: 16, draw: 0 },
    params: [
      { id: 'w', label: 'slope w', min: -1, max: 3, step: 0.05 }, { id: 'b', label: 'intercept b', min: -1, max: 3, step: 0.05 },
      { id: 'size', label: 'batch size B', min: 1, max: 256, step: 1 }, { id: 'draw', label: 'which draw', min: 0, max: 99, step: 1, play: true },
    ],
    regions: ['A minibatch gradient', 'Noise against batch size'],
    presets: [
      { label: 'B = 1', set: { size: 1 } }, { label: 'B = 16', set: { size: 16 } }, { label: 'B = 256 (more than N)', set: { size: 256 } },
      { label: 'near the optimum', set: { w: 1.2, b: 0.5 } },
    ],
    run(m) {
      const B = Math.max(1, Math.round(m.size));
      const full = O.regressionGradient(m.w, m.b, DATA.xs, DATA.ys, ALL);
      let state = BATCH_SEED;
      for (let i = 0; i < Math.round(m.draw); i++) state = O.minibatchIndices(state, N, B).state;
      const pick = O.minibatchIndices(state, N, B);
      const est = O.regressionGradient(m.w, m.b, DATA.xs, DATA.ys, pick.indices);
      const cloud = [];
      let s2 = BATCH_SEED + 1;
      for (let i = 0; i < 30; i++) { const bt = O.minibatchIndices(s2, N, B); s2 = bt.state; const gg = O.regressionGradient(m.w, m.b, DATA.xs, DATA.ys, bt.indices); cloud.push([gg.gw, gg.gb]); }
      const noise = O.gradientNoise(m.w, m.b, DATA.xs, DATA.ys, B, 400, BATCH_SEED);
      const table = BATCHES.map((q) => O.gradientNoise(m.w, m.b, DATA.xs, DATA.ys, q, 400, BATCH_SEED).rms);
      return { ...est, ...noise, indices: pick.indices, full, cloud, table, B, spec: REG };
    },
    draw(v, m, r) {
      S.show({ key: 'regression', spec: REG });
      const L = regressionLoss(m.w, m.b);
      v.point(P(REG, LS.w, LS.b, REG.floor, 0.04), COL.green, { r: 0.07, k: 'minimum' });
      const o = P(REG, m.w, m.b, L, 0.1), k = REG.gscale;
      for (const c of r.cloud) v.point(V(o.x + c[0] * k, o.y, o.z - c[1] * k), COL.a, { r: 0.035, k: 'batch' });
      v.point(o, COL.white, { r: 0.1, k: 'theta' });
      v.arrow(o, V(o.x + r.full.gw * k, o.y, o.z - r.full.gb * k), COL.gold, { k: 'full', r: 0.03, hr: 0.09, head: 0.22, label: 'all N', anchor: 'al' });
      v.arrow(o, V(o.x + r.gw * k, o.y, o.z - r.gb * k), COL.a, { k: 'batch', r: 0.03, hr: 0.09, head: 0.22, label: `B = ${r.B}`, anchor: 'br' });
    },
    explain(m, r) {
      const err = Math.hypot(r.gw - r.full.gw, r.gb - r.full.gb), rel = r.table.map((q) => q / r.table[0]);
      return {
        hud: `{full|∇L over all ${N}} = ${vt([r.full.gw, r.full.gb], 2)}, {batch|batch of ${r.B}} = ${vt([r.gw, r.gb], 2)}`,
        rows: [
          `{full|∇L} = (1/N) Σ ∇ℓᵢ over N = ${N} examples = ${vt([r.full.gw, r.full.gb])}`,
          `{batch|g_B} = (1/B) Σ ∇ℓᵢ over B = ${r.B} drawn with replacement (draw ${Math.round(m.draw)}) = ${vt([r.gw, r.gb])}`,
          `error ‖g_B − ∇L‖ = ${g3(err)}; over 400 draws its root mean square is {noise|${g3(r.rms)}}`,
          `the noise falls as 1/√B: measured ${rel.map((q) => g3(Number(q.toFixed(3)))).join(', ')} for B = 1, 4, 16, 64, 256; predicted 1, 0.5, 0.25, 0.125, 0.0625`,
          `one epoch is ceil(N/B) = ${O.epochsOf(N, r.B, 1).perEpoch} steps; the lecture's MNIST example: 60000/128 → ${O.epochsOf(60000, 128, 1).perEpoch} iterations`,
        ],
        status: r.B >= N ? { text: `B = ${r.B} ≥ N = ${N}: examples are drawn with replacement, so the estimate is still noisy (rms ${g3(r.rms)}). Only the full set is exact.`, tone: 'warn' }
          : { text: `Unbiased but noisy: the batch gradient points ${g3(err)} away from the true one; the mean of many batches is the true gradient.`, tone: 'info' },
        chart: { curve: 'noise relative to B = 1', x: [0, 5], y: [0, 1.05], xLabel: 'B = 1, 4, 16, 64, 256', bars: rel.map((q, i) => ({ x: i + 0.5, y: q, color: COL.amber })), series: [{ fn: (x) => 2 ** -x, color: COL.cyan }], at: BATCHES.indexOf(r.B) >= 0 ? BATCHES.indexOf(r.B) + 0.5 : undefined, atY: BATCHES.indexOf(r.B) >= 0 ? rel[BATCHES.indexOf(r.B)] : undefined },
        values: BATCHES.map((q, i) => [`B = ${q}`, `rms ${g3(r.table[i])}`, 'noise']),
        fact: 'Red dots: 30 other batches of the same size. Gold: the gradient over all examples.',
      };
    },
    panel(host, m, r, ctx) {
      const ui = once(host, 'minibatch', (h, u) => { u.map = makeMap(h, (x, y) => { const mm = ctx.state(); mm.w = Math.round(x * 20) / 20; mm.b = Math.round(y * 20) / 20; ctx.update(); }); });
      const k = REG.gscale * 1.2;
      const over = [{ type: 'cross', at: [LS.w, LS.b], color: '#7ee787' }];
      for (const c of r.cloud) over.push({ type: 'dot', at: [m.w + c[0] * k, m.b + c[1] * k], color: '#ff7b72', r: 2 });
      over.push({ type: 'arrow', from: [m.w, m.b], to: [m.w + r.full.gw * k, m.b + r.full.gb * k], color: '#ffd166', width: 2.5 });
      over.push({ type: 'arrow', from: [m.w, m.b], to: [m.w + r.gw * k, m.b + r.gb * k], color: '#ff7b72' });
      over.push({ type: 'dot', at: [m.w, m.b], color: '#e7eaf0' });
      ui.map.draw(REG, over);
    },
    onPick(ray, e, ctx) { const m = ctx.state(); let prev = null; for (let s = 0; s < 900; s++) { const t = s * 0.05, x = ray.origin[0] + ray.dir[0] * t, y = -(ray.origin[2] + ray.dir[2] * t), h = ray.origin[1] + ray.dir[1] * t; if (x < -1 || x > 3 || y < -1 || y > 3) { prev = null; continue; } const below = h <= heightOf(REG, regressionLoss(x, y)); if (below && prev !== false) { m.w = Math.round(x * 20) / 20; m.b = Math.round(y * 20) / 20; ctx.update(); return; } prev = !below; } },
  });

  // ---- Minibatch: stochastic descent and the schedule
  {
    const T = 200;
    views.push({
      id: 'sgd', topic: 'batch', label: 'SGD and schedule', home: HOME, keys: KEYS, grid: 'xz', inputTitle: 'Stochastic descent', panelTitle: 'Paths and the learning-rate schedule',
      init: { sx: -0.5, sy: 2.5, size: 4, eta: 0.2, warmup: 0, lambda: 2, t: 200 },
      params: [
        { id: 'size', label: 'batch size B', min: 1, max: 64, step: 1 }, { id: 'eta', label: 'learning rate η₀', min: 0.01, max: 0.45, step: 0.01 },
        { id: 'warmup', label: 'warmup steps', min: 0, max: 60, step: 1 }, { id: 'lambda', label: 'weight decay λ (×10⁻³)', min: 0, max: 10, step: 0.5 },
        { id: 't', label: 'step t', min: 0, max: T, step: 1, play: true },
      ],
      regions: ['A learning-rate schedule', 'Stochastic descent'],
      presets: [
        { label: 'constant η rattles', set: { size: 2, eta: 0.25, warmup: 0, t: 200 } }, { label: 'noisier, B = 1', set: { size: 1, eta: 0.2, warmup: 0, t: 200 } },
        { label: 'warmup 30', set: { size: 4, eta: 0.2, warmup: 30, t: 200 } }, { label: "the lecture's decay: 0.1, 0.002", set: { eta: 0.1, lambda: 2, t: 200 } },
      ],
      edited(m) { [m.sx, m.sy] = clampTo(REG, m.sx, m.sy); m.warmup = Math.min(m.warmup, T - 10); },
      run(m) {
        [m.sx, m.sy] = clampTo(REG, m.sx, m.sy);
        const B = Math.round(m.size), start = [m.sx, m.sy], w = Math.min(Math.round(m.warmup), T - 10);
        const full = O.runSgd(DATA.xs, DATA.ys, start, 0, Math.min(m.eta, 0.45), T, 0, false, 5);
        const flat_ = O.runSgd(DATA.xs, DATA.ys, start, B, m.eta, T, 0, false, 5);
        const cos = O.runSgd(DATA.xs, DATA.ys, start, B, m.eta, T, w, true, 5);
        const t = Math.min(Math.round(m.t), T);
        const sched = O.scheduleRate(Math.min(t, T - 1), T, m.eta, w);
        const asPath = (q) => ({ xs: q.ws, ys: q.bs, losses: q.losses, count: q.ws.length });
        const dist = (q) => q.ws.map((x, i) => Math.hypot(x - LS.w, q.bs[i] - LS.b));
        const decay = O.weightDecayRun(1, m.eta, m.lambda * 1e-3, 5000);
        return { ...sched, ws: cos.ws, bs: cos.bs, losses: cos.losses, etas: cos.etas, full, flat_, cos, t, T, B, w, paths: { full: asPath(full), flat_: asPath(flat_), cos: asPath(cos) }, dist: { full: dist(full), flat_: dist(flat_), cos: dist(cos) }, decay };
      },
      draw(v, m, r) {
        S.show({ key: 'regression', spec: REG });
        v.point(P(REG, LS.w, LS.b, REG.floor, 0.04), COL.green, { r: 0.07, k: 'minimum' });
        drawWalk(v, REG, r.paths.full, r.t, COL.white, 'gd', 0.03);
        drawWalk(v, REG, r.paths.flat_, r.t, COL.a, 'batch', 0.03);
        drawWalk(v, REG, r.paths.cos, r.t, COL.cyan, 'sched', 0.03);
      },
      explain(m, r) {
        const at = (q) => q[Math.min(r.t, q.length - 1)];
        const half = O.scheduleRate(50, 100, 1, 0).eta, tq = O.scheduleRate(75, 100, 1, 0).eta;
        const wd = O.weightDecayRun(1, 0.1, 0.002, 5000).factor;
        const end = (q) => q[q.length - 1];
        const settles = end(r.dist.cos) < end(r.dist.flat_);
        const all = [...r.dist.full, ...r.dist.flat_, ...r.dist.cos].map((x) => Math.log10(Math.max(x, 1e-9)));
        return {
          hud: `step ${r.t}: distance to the optimum {gd|full batch} ${g3(at(r.dist.full))}, {batch|constant η} ${g3(at(r.dist.flat_))}, {sched|cosine} ${g3(at(r.dist.cos))}`,
          rows: [
            `{sched|η_t} = η₀ · ramp · ½(1 + cos(π·progress)) = ${f(m.eta)} · ${f(r.ramp, 3)} · ½(1 + cos(π·${f(r.progress, 3)})) = {eta|${g3(r.eta)}}   (t = ${Math.min(r.t, r.T - 1)} of ${r.T}, warmup ${r.w})`,
            `with no warmup: η at T/2 = ${f(half, 3)} η₀, at 3T/4 = ${f(tq, 3)} η₀, at T = 0`,
            `{decay|weight decay}: θ ← θ − η(g + λθ). A weight with no gradient is multiplied by 1 − ηλ each step: η = 0.1, λ = 0.002, 5000 steps give ${f(wd, 3)}`,
            `with η₀ = ${f(m.eta)}, λ = ${f(m.lambda * 1e-3, 4)}: (1 − ηλ)^5000 = ${f(r.decay.factor, 3)}`,
            `batches of B = ${r.B}, ${O.epochsOf(N, r.B, r.T).epochs.toFixed(1)} epochs in ${r.T} steps; the same batches feed both stochastic runs`,
          ],
          status: settles ? { text: `Decay settles: the cosine run ends ${g3(end(r.dist.cos))} from the optimum, the constant-η run ${g3(end(r.dist.flat_))}.`, tone: 'ok' }
            : { text: `The constant-η run ends ${g3(end(r.dist.flat_))} from the optimum and the cosine run ${g3(end(r.dist.cos))}: at this η and B the noise is small, so decay gains little.`, tone: 'info' },
          chart: { curve: 'log10 distance to optimum', x: [0, r.T], y: [Math.floor(Math.min(...all)) - 0.5, Math.ceil(Math.max(...all)) + 0.5], xLabel: 'step', at: r.t, atY: Math.log10(Math.max(at(r.dist.cos), 1e-9)), series: [['full', COL.white], ['flat_', COL.a], ['cos', COL.cyan]].map(([k, col]) => ({ fn: interp(r.dist[k].map((x) => Math.log10(Math.max(x, 1e-9)))), color: col })) },
          values: [['full batch', g3(end(r.paths.full.losses)), 'gd'], ['constant η', g3(end(r.paths.flat_.losses)), 'batch'], ['cosine', g3(end(r.paths.cos.losses)), 'sched'], ['least squares', g3(REG.floor)]],
          fact: 'White: gradient over all examples. Red: minibatch, constant η. Cyan: minibatch, warmup and cosine decay. Values are final losses.',
        };
      },
      panel(host, m, r, ctx) {
        const ui = once(host, 'sgd', (h, u) => {
          u.map = makeMap(h, (x, y) => { const mm = ctx.state(); mm.sx = Math.round(x * 20) / 20; mm.sy = Math.round(y * 20) / 20; ctx.update(); });
          u.plot = linePlot(h, { label: 'learning rate η_t against step' });
        });
        ui.map.draw(REG, [{ type: 'cross', at: [LS.w, LS.b], color: '#7ee787' },
          { type: 'path', xs: r.paths.full.xs, ys: r.paths.full.ys, to: r.t, color: '#e7eaf0', width: 1.4 }, { type: 'path', xs: r.paths.flat_.xs, ys: r.paths.flat_.ys, to: r.t, color: '#ff7b72', width: 1 },
          { type: 'path', xs: r.paths.cos.xs, ys: r.paths.cos.ys, to: r.t, color: '#56d4dd', width: 1 }, { type: 'dot', at: [m.sx, m.sy], color: '#79c0ff', r: 4 }]);
        const curve = [];
        for (let t = 0; t < r.T; t++) curve.push(O.scheduleRate(t, r.T, m.eta, r.w).eta);
        ui.plot.draw([{ ys: curve, color: '#56d4dd' }, { ys: curve.map(() => m.eta), color: '#ff7b72' }], { at: Math.min(r.t, r.T - 1), yMin: 0, yMax: Math.max(m.eta, 0.05) });
      },
    });
  }
  return views;
}
