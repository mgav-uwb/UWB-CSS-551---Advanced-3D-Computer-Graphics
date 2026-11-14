// path-lab-views: the catalog behind the path-lab demo (runtime: lib/core/lab.js). Each view calls the program's own functions
// (lib/programs/path-lab/webgl/pathlab.js), so the numbers beside the code are that code's output. Topics: the Monte Carlo estimator on
// an integral with a known answer (the cosine over the hemisphere, which is pi), solid angle and the terms of the rendering equation at a
// point, a progressive path-traced Cornell box (lib/demos/path-lab-render.js), and one traced path. Random draws use the program's
// seeded generator, so a view shows the same numbers every time it is opened.
//   makeViews(): the views and the progressive renderers they share; no DOM until a panel is built, so the node tests run every view.
import * as PL from '../programs/path-lab/webgl/pathlab.js';
import { COL, V, tangents } from '../core/lab-viz.js';
import { Progressive, DEFAULTS } from './path-lab-render.js';

export const TOPICS = [
  { id: 'mc', label: 'Estimator' }, { id: 'solid', label: 'Solid angle' }, { id: 'cornell', label: 'Cornell box' }, { id: 'path', label: 'One path' },
];

export const KEYS = {
  est: COL.gold, exact: COL.white, err: COL.red, p: COL.cyan, terms: COL.a, disk: COL.c, strata: COL.b, runs: COL.amber,
  uniform: COL.amber, stratified: COL.b, cosine: COL.c, predicted: COL.gray,
  dOmega: COL.amber, theta: COL.cyan, r: COL.gray, E: COL.gold, flux: COL.c, area: COL.gold,
  sum: COL.gold, rho: COL.pink, Lo: COL.gold, strips: COL.b, f: COL.pink, l1: COL.gold, l2: COL.pink, l3: COL.cyan,
  noise: COL.red, spp: COL.gold, cost: COL.amber, depth: COL.b, bounce: COL.c, firefly: COL.red, mean: COL.gold,
  pixel: COL.gold, throughput: COL.c, direct: COL.amber, contribution: COL.gold, shadow: COL.green, blocked: COL.red,
  light: COL.gold, nee: COL.green, brdf: COL.cyan, G: COL.c, pA: COL.amber, pW: COL.pink,
  v1: COL.gold, v2: COL.cyan, v3: COL.pink, v4: COL.green, v5: COL.purple, v6: COL.amber, v7: COL.b, v8: COL.a, v9: COL.c,
};
const PATH_COLORS = [COL.gold, COL.cyan, COL.pink, COL.green, COL.purple, COL.amber, COL.b, COL.a, COL.c];

// ---------------------------------------------------------------- small helpers

const f = (x, d = 3) => (Number.isFinite(x) ? (Number(x.toFixed(d)) === 0 ? (0).toFixed(d) : x.toFixed(d)).replace('-', '−') : 'none');
const pct = (x, d = 1) => `${f(100 * x, d)} %`;
const rgb = (c, d = 2) => `(${f(c[0], d)}, ${f(c[1], d)}, ${f(c[2], d)})`;
const short = (c) => `(${c.map((x) => String(Number(x.toFixed(2))).replace('-', '\u2212')).join(', ')})`;
const P3 = (a) => V(a[0], a[1], a[2]);
const toArr = (v) => [v.x, v.y, v.z];
/** a direction in the program's frame (z up) in the lab's world (y up): a rotation, so handedness is kept */
const up = (d) => V(d[0], d[2], -d[1]);
const deg = (r) => (r * 180) / Math.PI;
const SURFACE = ['left wall (red)', 'right wall (green)', 'floor', 'ceiling', 'back wall', 'left sphere', 'right sphere', 'the light'];
const METHOD_NAME = { uniform: 'uniform directions', stratified: 'stratified', cosine: 'cosine-weighted' };
const METHOD_COLOR = { uniform: COL.amber, stratified: COL.b, cosine: COL.c };
const BOX_HOME = { eye: [5.8, 3.1, 9.2], target: [0, 0, 1.3] };
const HOME = { eye: [1.6, 1.4, 3.0], target: [-0.45, 0.5, 0] };
const PHOME = { eye: [0.3, 2.6, 3.6], target: [0, 0.7, 0] };
const WIRE = 0x6b7690;
const WIDE = { eye: [2.0, 1.8, 5.8], target: [0.5, 0.9, 0] };
const SIZE = 128;          // the render
const SMALL = 96;          // the two renders of a comparison, and the preview of one path

// small DOM helpers for the panels (browser only)
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
/** a row of mutually exclusive buttons; its show() puts the highlight on the current value */
function segmented(parent, label, options, get, set, host) {
  const row = el('div', 'lab-btns pl-seg', parent);
  el('span', 'pl-seglabel', row, label);
  const bs = options.map(([value, text]) => {
    const b = btn(row, text, () => set(value));
    b.dataset.value = String(value);
    return b;
  });
  function show() { bs.forEach((b) => b.classList.toggle('on', b.dataset.value === String(get()))); }
  host._sync.push(show);
  return row;
}
/** a panel builds once per view; its show() functions run on every update */
function once(host, id, build) {
  if (host.dataset.built !== id) {
    host.innerHTML = '';
    host.dataset.built = id;
    host._sync = [];
    build(host);
  }
  host._sync.forEach((fn) => fn());
}
const svgText = (x, y, t, { anchor = 'start', color = '#79829a', size = 9.5 } = {}) =>
  `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}" font-family="-apple-system, Segoe UI, Roboto, sans-serif">${t}</text>`;
const hexCss = (c) => `#${c.toString(16).padStart(6, '0')}`;

// ---------------------------------------------------------------- the hemisphere and the box

/** the hemisphere above the origin as a wire: the base circle, rings at the given heights, and meridians */
function drawHemisphere(v, { color = WIRE, levels = [0.5], k } = {}) {
  v.circle(V(), V(0, 1, 0), 1, color, { k });
  for (const h of levels) v.circle(V(0, h, 0), V(0, 1, 0), Math.sqrt(1 - h * h), color, { k });
  for (let i = 0; i < 4; i++) {
    const phi = (i / 4) * 2 * Math.PI;
    const pts = [];
    for (let s = 0; s <= 24; s++) {
      const th = (s / 24) * (Math.PI / 2);
      pts.push(V(Math.sin(th) * Math.cos(phi), Math.cos(th), Math.sin(th) * Math.sin(phi)));
    }
    v.poly(pts, color, { k });
  }
}

/** the Cornell box of the program's scene, as a faint model: walls, spheres, the light, the eye and the opening it looks through */
function drawBox(v, scene, { eye = true } = {}) {
  const H = PL.HALF;
  const quads = [
    [[-H, -H, -H], [-H, H, -H], [-H, H, H], [-H, -H, H], COL.red, 0.16],
    [[H, -H, -H], [H, H, -H], [H, H, H], [H, -H, H], COL.green, 0.16],
    [[-H, -H, -H], [H, -H, -H], [H, -H, H], [-H, -H, H], COL.gray, 0.1],
    [[-H, H, -H], [H, H, -H], [H, H, H], [-H, H, H], COL.gray, 0.05],
    [[-H, -H, -H], [H, -H, -H], [H, H, -H], [-H, H, -H], COL.gray, 0.1],
  ];
  for (const [a, b, c, d, color, opacity] of quads) {
    v.patch([P3(a), P3(b), P3(c), P3(d)], color, opacity, { k: 'box' });
    v.poly([P3(a), P3(b), P3(c), P3(d)], color, { closed: true, k: 'box' });
  }
  for (const s of scene.spheres) v.sphere(P3(s.center), s.radius, COL.white, { k: 'box' });
  const h = scene.lightSide / 2, y = scene.lightY - 0.003;
  v.patch([V(-h, y, -h), V(h, y, -h), V(h, y, h), V(-h, y, h)], COL.gold, 0.9, { k: 'light' });
  if (eye) {
    v.point(P3(PL.EYE), COL.white, { r: 0.07, label: 'eye', anchor: 'a', k: 'eye' });
    const w = PL.TAN_HALF_FOV * (PL.EYE[2] - H);
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) v.dashed(P3(PL.EYE), V(sx * w, sy * w, H), COL.dim, { k: 'eye' });
  }
}

/** a pane over the scene for the renders: as large as the pane allows, leaving room below for the strip; canvases are crisp (pixelated) */
function makeStage(ctx, engines, captions) {
  const stage = el('div', 'pl-stage', ctx.sceneEl);
  const cells = engines.map((engine, i) => {
    const cell = el('div', 'pl-scell', stage);
    const cap = captions ? el('div', 'pl-scap', cell) : null;
    const wrap = el('div', 'pl-swrap', cell);
    const c = el('canvas', 'pl-scanvas', wrap);
    c.width = engine.size; c.height = engine.size;
    c.setAttribute('aria-label', 'the path-traced Cornell box');
    engine.canvas = c;
    engine.dirty = true;
    return { cap, canvas: c };
  });
  return { stage, cells };
}

// ---------------------------------------------------------------- the progressive renderers

/** one animation-frame loop for a set of renderers: a slice of work each (8 ms in all), paint, and ask the lab to redraw its numbers now and then */
function makeLoop(engines) {
  let raf = 0, ctx = null, active = false, lastRefresh = 0, lastPasses = 0;
  const busy = () => engines.some((e) => !e.done && !e.paused);
  function tick() {
    raf = 0;
    if (!active) return;
    let committed = false;
    // renderers that are compared advance together: one that is ahead waits, so the two always have the same samples per pixel
    const minPasses = Math.min(...engines.filter((e) => !e.done && !e.paused).map((e) => e.passes));
    const live = engines.filter((e) => !e.done && !e.paused && e.passes <= minPasses);
    for (const e of live) if (e.step(8 / live.length)) { e.paint(); committed = true; }
    // the numbers beside the picture redraw when the samples per pixel have grown by half, and not twice within 0.6 s: each redraw also
    // renders the 3D scene, and the numbers change as 1/sqrt(N), so a few redraws on a log scale say everything
    const now = performance.now();
    const passes = Math.max(...engines.map((e) => e.passes));
    if (committed && ctx && ctx.refresh && ((passes >= lastPasses * 1.5 && now - lastRefresh > 600) || !busy())) { lastRefresh = now; lastPasses = passes; ctx.refresh(); }
    // a redraw above may have started the next frame already (the view's run() asks for one)
    if (busy() && !raf) raf = requestAnimationFrame(tick);
  }
  return {
    start(c) { active = true; ctx = c; lastPasses = 0; this.kick(); },
    stop() { active = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
    kick() { if (active && !raf && typeof requestAnimationFrame === 'function' && busy()) raf = requestAnimationFrame(tick); },
    get running() { return active && busy(); },
  };
}

/** start a renderer over if its configuration changed */
function configure(engine, cfg) {
  if (JSON.stringify({ ...DEFAULTS, ...cfg }) !== engine.key) engine.configure(cfg);
}

// ---------------------------------------------------------------- the catalog

export function makeViews() {
  const render = new Progressive(SIZE);
  const cmpA = new Progressive(SMALL), cmpB = new Progressive(SMALL), preview = new Progressive(SMALL);
  const loops = { render: makeLoop([render]), compare: makeLoop([cmpA, cmpB]), path: makeLoop([preview]) };

  // ---- caches for the many-run measurements, which cost a fraction of a second each
  const cache = new Map();
  function cached(key, make) {
    if (!cache.has(key)) { if (cache.size > 60) cache.delete(cache.keys().next().value); cache.set(key, make()); }
    return cache.get(key);
  }
  const runs = (method, n, trials, seed) => cached(`run|${method}|${n}|${trials}|${seed}`, () => PL.measureEstimator(method, n, trials, seed));

  // ============================================================ Estimator: one run of N samples
  const LECTURE_U1 = [0.720, 0.456, 0.763, 0.487];
  const LECTURE_U2 = [0.10, 0.35, 0.60, 0.85];
  const estimateView = {
    id: 'mc.estimate', inputTitle: 'Draw', topic: 'mc', label: 'N samples', init: { n: 4, seed: 1, method: 'uniform', use: 'random' }, home: HOME,
    params: [{ id: 'n', label: 'N samples', min: 1, max: 64, step: 1 }, { id: 'seed', label: 'draw', min: 1, max: 99, step: 1 }],
    panelTitle: 'Samples',
    presets: [
      { label: 'the lecture\'s four draws', run: (m) => Object.assign(m, { method: 'uniform', n: 4, use: 'lecture' }) },
      { label: 'same four, cosine-weighted', run: (m) => Object.assign(m, { method: 'cosine', n: 4, use: 'lecture' }) },
      { label: 'N = 4, stratified', run: (m) => Object.assign(m, { method: 'stratified', n: 4, use: 'random', seed: 3 }) },
      { label: 'N = 64', run: (m) => Object.assign(m, { method: 'uniform', n: 64, use: 'random' }) },
    ],
    get regions() { return [this.current === 'cosine' ? 'Directions: cosine-weighted (Malley)' : 'Directions: uniform', 'The estimator: one run']; },
    current: 'uniform',
    edited(m) { if (m.use === 'lecture' && m.n !== 4) m.use = 'random'; },
    run(m) {
      this.current = m.method;
      const lecture = m.use === 'lecture';
      const s = lecture ? { u1: LECTURE_U1, u2: LECTURE_U2 } : PL.drawSamples(m.method, Math.round(m.n), PL.makeRng(m.seed * 7919));
      const est = PL.estimateCosineIntegral(m.method, s.u1, s.u2);
      const n = s.u1.length;
      const first = m.method === 'cosine' ? PL.cosineDirection(s.u1[0], s.u2[0]) : PL.uniformDirection(s.u1[0], s.u2[0]);
      return { ...first, ...est, n, u1: s.u1, u2: s.u2, many: runs(m.method, n, 1000, 17), lecture };
    },
    draw(v, m, r) {
      drawHemisphere(v, { levels: m.method === 'stratified' ? Array.from({ length: Math.min(r.n, 16) - 1 }, (_, i) => (i + 1) / Math.min(r.n, 16)) : [0.5], color: m.method === 'stratified' ? COL.strata : WIRE, k: 'strata' });
      v.arrow(V(), V(0, 1.3, 0), COL.gray, { k: 'n', r: 0.012, hr: 0.04, head: 0.14, label: 'n', anchor: 'a' });
      for (let i = 0; i < r.n; i++) {
        const tip = up(r.dirs[i]);
        const color = m.method === 'cosine' ? COL.c : r.terms[i] > Math.PI ? COL.amber : COL.b;
        if (m.method === 'cosine') {
          const disk = V(r.dirs[i][0], 0, -r.dirs[i][1]);
          v.point(disk, COL.c, { r: 0.028, k: 'disk' });
          v.dashed(disk, tip, COL.c, { k: 'disk' });
        }
        v.arrow(V(), tip, color, { k: 'terms', r: 0.01, hr: 0.035, head: 0.11 });
        v.point(tip, color, { r: 0.04, k: 'terms', label: r.n <= 8 ? String(i + 1) : undefined, anchor: 'a' });
      }
      // two gauges beside the hemisphere: the exact value and the estimate
      const gauge = Math.min(2.4, Math.max(0.02, r.estimate / Math.PI));
      v.bar(V(-1.7, 0, 0), V(-1.7, 1, 0), COL.white, { k: 'exact', r: 0.045 });
      v.label('\u03c0', V(-1.7, 1.08, 0), COL.white, 'a', 'exact');
      v.bar(V(-2.0, 0, 0), V(-2.0, gauge, 0), COL.gold, { k: 'est', r: 0.045 });
      v.label('\u00ce', V(-2.0, gauge + 0.08, 0), COL.gold, 'a', 'est');
    },
    explain(m, r) {
      const cosine = m.method === 'cosine';
      const termList = r.terms.slice(0, 6).map((t) => f(t, 2)).join(', ') + (r.n > 6 ? ', ...' : '');
      const above = r.relError >= 0;
      const many = r.many;
      return {
        hud: `{est|Î = ${f(r.estimate)}} against {exact|π = ${f(Math.PI, 4)}}: {err|${above ? '+' : ''}${pct(r.relError)}}`,
        rows: [
          `{est|Î} = (1/N) Σ f(ωᵢ) / p(ωᵢ), with f = cos θ and N = ${r.n}`,
          cosine ? '{p|p = cos θ / π}: a uniform point on the disk, lifted onto the hemisphere' : `{p|p = 1/(2π) = ${f(r.pdf, 4)}}${m.method === 'stratified' ? `: u₁ drawn once in each of ${r.n} strata` : ''}`,
          `terms f/p: {terms|${termList}}`,
          `{est|Î} = ${f(r.sum, 3)} / ${r.n} = {est|${f(r.estimate, 4)}}; exact {exact|${f(Math.PI, 4)}}`,
          `error {err|${f(r.error, 4)}} (${pct(r.relError)})`,
          `the same estimator over ${many.trials} runs of N = ${r.n}: mean {runs|${f(many.mean, 3)}} ± ${f(many.meanStdErr, 3)}, so unbiased`,
          `root-mean-square error over those runs: {runs|${pct(many.rmsRelError, 2)}}; predicted ${pct(many.predicted, 2)}`,
        ],
        status: cosine
          ? { text: 'cosine weighting folds the cosine into the density: every term is exactly π, whatever N is', tone: 'ok' }
          : { text: `Î = ${f(r.estimate, 3)} is ${pct(Math.abs(r.relError))} ${above ? 'above' : 'below'} π${r.lecture ? ' (the lecture\'s four cosines: 0.720, 0.456, 0.763, 0.487)' : ''}`, tone: Math.abs(r.relError) < 0.05 ? 'ok' : Math.abs(r.relError) < 0.2 ? 'info' : 'warn' },
        chart: {
          x: [0, r.n + 1], y: [0, Math.max(...r.terms, Math.PI * 1.3)], xLabel: 'sample', curve: 'f/p per sample',
          bars: r.terms.map((t, i) => ({ x: i + 1, y: t, color: cosine ? COL.c : t > Math.PI ? COL.amber : COL.b })),
          series: [{ fn: () => Math.PI, color: COL.white }, { fn: () => r.estimate, color: COL.gold }],
        },
        values: [['N', String(r.n)], ['Î', f(r.estimate, 4), 'est'], ['error', `${f(r.error, 4)} (${pct(r.relError)})`, 'err'], ['mean of runs', f(many.mean, 4), 'runs'], ['runs', String(many.trials)], ['RMS error', pct(many.rmsRelError, 2), 'runs']],
        fact: 'cos θ is large near the normal, so uniform directions waste samples near the horizon (blue terms) and overweight those near the normal (amber). The estimator is still unbiased: only the spread of the estimate depends on p.',
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'estimate', (h) => {
        segmented(h, 'sample', [['uniform', 'uniform'], ['stratified', 'stratified'], ['cosine', 'cosine-weighted']], () => ctx.state().method, (x) => { ctx.state().method = x; ctx.update(); }, h);
        const row = el('div', 'lab-btns', h);
        btn(row, 'draw again', () => { const s = ctx.state(); s.seed = (s.seed % 99) + 1; s.use = 'random'; ctx.update(); }, 'The next seeded draw of N samples');
        el('div', 'pl-table', h);
      });
      const rows = ['<table class="mat-panel lab-values"><tbody><tr><td class="value-label">i</td><td class="value-label">u₁</td><td class="value-label">u₂</td><td class="value-label">cos θ</td><td class="value-label">f/p</td></tr>'];
      for (let i = 0; i < Math.min(8, r.n); i++) rows.push(`<tr><td>${i + 1}</td><td>${f(r.u1[i], 3)}</td><td>${f(r.u2[i], 3)}</td><td>${f(r.cosines[i], 3)}</td><td>${f(r.terms[i], 3)}</td></tr>`);
      if (r.n > 8) rows.push(`<tr><td colspan="5" class="value-label">${r.n - 8} more</td></tr>`);
      host.querySelector('.pl-table').innerHTML = `${rows.join('')}</tbody></table>`;
    },
  };

  // ============================================================ Estimator: the error against N, three ways
  const errorCurves = (trials) => cached(`curves|${trials}`, () => {
    const out = { uniform: [], stratified: [] };
    for (let k = 0; k <= 12; k++) {
      out.uniform.push(PL.measureEstimator('uniform', 2 ** k, trials, 1000 + k));
      out.stratified.push(PL.measureEstimator('stratified', 2 ** k, trials, 2000 + k));
    }
    return out;
  });
  function logPlot(curves, at) {
    const W = 400, H = 232, L = 42, R = 20, T = 10, B = 28;
    const X = (k) => L + (k / 12) * (W - L - R);
    const lo = -6.5, hi = 0.3;
    const Y = (e) => T + ((hi - Math.log10(Math.max(e, 1e-7))) / (hi - lo)) * (H - T - B);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="pl-plot" role="img" aria-label="relative RMS error against the number of samples N, both axes logarithmic">`;
    for (let d = 0; d >= -6; d -= 2) s += `<line x1="${L}" x2="${W - R}" y1="${Y(10 ** d)}" y2="${Y(10 ** d)}" stroke="#262a35"/>${svgText(L - 4, Y(10 ** d) + 3, d === 0 ? '1' : `1e${d}`, { anchor: 'end' })}`;
    for (let k = 0; k <= 12; k += 2) s += `<line x1="${X(k)}" x2="${X(k)}" y1="${T}" y2="${H - B}" stroke="#1d212b"/>${svgText(X(k), H - B + 12, String(2 ** k), { anchor: 'middle' })}`;
    s += svgText((L + W - R) / 2, H - 3, 'N samples', { anchor: 'middle' }) + svgText(8, T + 8, 'RMS error / π');
    s += `<line x1="${X(at)}" x2="${X(at)}" y1="${T}" y2="${H - B}" stroke="#ffd166" stroke-dasharray="3 3"/>`;
    for (const method of ['uniform', 'stratified']) {
      const col = hexCss(METHOD_COLOR[method]);
      const pred = [0, 12].map((k) => `${X(k)},${Y(PL.predictedError(method, 2 ** k))}`).join(' ');
      s += `<polyline points="${pred}" fill="none" stroke="#c7cdda" stroke-width="1" stroke-dasharray="5 4" opacity="0.7"/>`;
      s += `<polyline points="${curves[method].map((m, k) => `${X(k)},${Y(m.rmsRelError)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="1.6"/>`;
      curves[method].forEach((m, k) => { s += `<circle cx="${X(k)}" cy="${Y(m.rmsRelError)}" r="${k === at ? 4 : 2.4}" fill="${col}"/>`; });
    }
    s += svgText(X(7.0), Y(PL.predictedError('uniform', 2 ** 7.0)) - 8, 'uniform: 0.577/√N', { color: hexCss(COL.amber) });
    s += svgText(X(9.0), Y(PL.predictedError('stratified', 2 ** 9.0)) - 8, 'stratified: 0.577/N^1.5', { color: hexCss(COL.b) });
    s += svgText(L + 8, H - B - 36, 'cosine-weighted: 0 at every N', { color: hexCss(COL.c) });
    s += svgText(L + 8, H - B - 24, 'dashed: the prediction', {});
    s += svgText(L + 8, H - B - 12, 'dots: measured over the runs', {});
    return `${s}</svg>`;
  }
  const errorView = {
    id: 'mc.error', inputTitle: 'Runs', topic: 'mc', label: 'error against N', init: { logN: 2, trials: 300, method: 'uniform' }, home: HOME,
    params: [{ id: 'logN', label: 'log₂ N', min: 0, max: 12, step: 1 }, { id: 'trials', label: 'runs', min: 100, max: 1000, step: 100 }],
    panelTitle: 'The error, over many runs',
    presets: [
      { label: 'N = 4: the lecture\'s row', set: { logN: 2, trials: 300 } }, { label: 'N = 1', set: { logN: 0 } },
      { label: 'N = 64', set: { logN: 6 } }, { label: 'N = 4096', set: { logN: 12 } },
    ],
    regions: ['The estimator: many runs'],
    run(m) {
      const k = Math.round(m.logN), n = 2 ** k, trials = Math.round(m.trials);
      const curves = errorCurves(trials);
      const here = m.method === 'cosine' ? runs('cosine', n, trials, 3000 + k) : curves[m.method][k];
      return { ...here, k, curves, cosine: runs('cosine', n, trials, 3000 + k), at: here };
    },
    draw(v, m, r) {
      const shown = Math.min(r.n, 64);
      const bands = Math.min(r.n, 16);
      drawHemisphere(v, { levels: m.method === 'stratified' ? Array.from({ length: bands - 1 }, (_, i) => (i + 1) / bands) : [0.5], color: m.method === 'stratified' ? COL.strata : WIRE, k: 'strata' });
      v.arrow(V(), V(0, 1.3, 0), COL.gray, { k: 'n', r: 0.012, hr: 0.04, head: 0.14, label: 'n', anchor: 'a' });
      const s = PL.drawSamples(m.method, shown, PL.makeRng(11));
      const e = PL.estimateCosineIntegral(m.method, s.u1, s.u2);
      for (let i = 0; i < shown; i++) v.point(up(e.dirs[i]), METHOD_COLOR[m.method], { r: 0.035, k: 'terms' });
    },
    explain(m, r) {
      const u = r.curves.uniform[r.k], s = r.curves.stratified[r.k], c = r.cosine;
      const four = r.k <= 10 ? r.curves.uniform[r.k + 2] : null;
      return {
        hud: `N = ${r.n}: {uniform|uniform ${pct(u.rmsRelError, 2)}}, {stratified|stratified ${pct(s.rmsRelError, 2)}}, {cosine|cosine-weighted ${pct(c.rmsRelError, 2)}}`,
        rows: [
          `relative RMS error = σ / (π √N), σ = 2π/√12 = 1.814 for one uniform sample`,
          `{uniform|uniform}: measured ${f(u.rmsRelError, 4)}, {predicted|predicted 0.577/√N = ${f(u.predicted, 4)}}`,
          `{stratified|stratified}: measured ${f(s.rmsRelError, 4)}, {predicted|predicted 0.577/N^1.5 = ${f(s.predicted, 4)}}`,
          `{cosine|cosine-weighted}: measured ${f(c.rmsRelError, 4)}: every term is π`,
          ...(four ? [`quadrupling N to ${4 * r.n}: {uniform|uniform ${f(four.rmsRelError, 4)}}, ${f(four.rmsRelError / u.rmsRelError, 2)} times the error here`] : []),
          `variance of the estimate, uniform over stratified: {strata|${f(u.variance / Math.max(s.variance, 1e-300), 1)} times}`,
        ],
        status: four && u.rmsRelError > 0
          ? { text: `four times the samples (${r.n} to ${4 * r.n}) takes the uniform error from ${f(u.rmsRelError, 4)} to ${f(four.rmsRelError, 4)}, a factor of ${f(four.rmsRelError / u.rmsRelError, 2)}`, tone: Math.abs(four.rmsRelError / u.rmsRelError - 0.5) < 0.15 ? 'ok' : 'info' }
          : { text: `N = ${r.n}: the uniform error is ${f(u.rmsRelError, 4)} of π, the stratified ${f(s.rmsRelError, 5)}`, tone: 'info' },
        values: [
          ['N', String(r.n)], ['runs', String(r.trials)], ['uniform RMS', pct(u.rmsRelError, 3), 'uniform'], ['predicted', pct(u.predicted, 3), 'predicted'],
          ['stratified RMS', pct(s.rmsRelError, 3), 'stratified'], ['predicted', pct(s.predicted, 4), 'predicted'], ['cosine RMS', pct(c.rmsRelError, 3), 'cosine'],
          ['mean (uniform)', `${f(u.mean, 4)} ± ${f(u.meanStdErr, 4)}`], ['mean (stratified)', `${f(s.mean, 4)} ± ${f(s.meanStdErr, 4)}`],
          ['variance ratio', `${f(u.variance / Math.max(s.variance, 1e-300), 1)}`],
        ],
        fact: 'The dashed lines are the predictions, the points are measured over the runs shown. Click the plot to pick N. Each estimator\'s mean over the runs sits on π within its standard error: none of the three is biased.',
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'error', (h) => {
        segmented(h, 'sample', [['uniform', 'uniform'], ['stratified', 'stratified'], ['cosine', 'cosine-weighted']], () => ctx.state().method, (x) => { ctx.state().method = x; ctx.update(); }, h);
        const plot = el('div', 'pl-plotbox', h);
        plot.addEventListener('click', (e) => {
          const b = plot.getBoundingClientRect();
          const x = ((e.clientX - b.left) / b.width) * 400;
          ctx.state().logN = Math.max(0, Math.min(12, Math.round(((x - 42) / (400 - 42 - 8)) * 12)));
          ctx.update();
        });
      });
      host.querySelector('.pl-plotbox').innerHTML = logPlot(r.curves, r.k);
    },
  };

  // ============================================================ Estimator: the spread of the estimate
  const spreadView = {
    id: 'mc.spread', inputTitle: 'Runs', topic: 'mc', label: 'spread', init: { n: 4, trials: 1000 }, home: HOME,
    params: [{ id: 'n', label: 'N samples', min: 1, max: 64, step: 1 }, { id: 'trials', label: 'runs', min: 200, max: 2000, step: 200 }],
    panelTitle: 'Estimates over many runs',
    presets: [{ label: 'N = 4', set: { n: 4 } }, { label: 'N = 16', set: { n: 16 } }, { label: 'N = 64', set: { n: 64 } }, { label: 'N = 1', set: { n: 1 } }],
    regions: ['The estimator: many runs'],
    run(m) {
      const n = Math.round(m.n), trials = Math.round(m.trials);
      const by = {};
      for (const [i, method] of ['uniform', 'stratified', 'cosine'].entries()) by[method] = runs(method, n, trials, 4000 + i);
      return { ...by.uniform, by, n };
    },
    draw(v, m, r) {
      const bands = Math.min(r.n, 16);
      drawHemisphere(v, { levels: Array.from({ length: bands - 1 }, (_, i) => (i + 1) / bands), color: COL.strata, k: 'strata' });
      v.label(`${r.n} equal bands: one sample each when stratified`, V(0, 1.15, 0), COL.b, 'a', 'strata');
    },
    explain(m, r) {
      const { uniform: u, stratified: s, cosine: c } = r.by;
      const ratio = u.variance / Math.max(s.variance, 1e-300);
      return {
        hud: `N = ${r.n}: standard deviation {uniform|${f(u.stdDev, 3)}}, {stratified|${f(s.stdDev, 3)}}, {cosine|${f(c.stdDev, 3)}}`,
        rows: [
          `each histogram is ${r.trials} estimates Î of the same integral, π = ${f(Math.PI, 4)}`,
          `{uniform|uniform}: mean ${f(u.mean, 3)}, standard deviation ${f(u.stdDev, 3)}, variance ${f(u.variance, 4)}`,
          `{stratified|stratified}: mean ${f(s.mean, 3)}, standard deviation ${f(s.stdDev, 4)}, variance ${f(s.variance, 5)}`,
          `{cosine|cosine-weighted}: mean ${f(c.mean, 3)}, standard deviation ${f(c.stdDev, 4)}`,
          `variance, uniform over stratified: ${f(ratio, 1)}; over cosine-weighted: ${c.variance < 1e-18 ? 'unbounded (zero)' : f(u.variance / c.variance, 1)}`,
        ],
        status: Math.abs(u.mean - Math.PI) <= 4 * u.meanStdErr && Math.abs(s.mean - Math.PI) <= 4 * s.meanStdErr
          ? { text: 'all three means sit on π within 4 standard errors: only the spread differs', tone: 'ok' }
          : { text: 'a mean is more than 4 standard errors from π: too few runs, or a bias', tone: 'warn' },
        values: [
          ['N', String(r.n)], ['runs', String(r.trials)], ['mean, uniform', `${f(u.mean, 3)} ± ${f(u.meanStdErr, 3)}`, 'uniform'], ['mean, stratified', `${f(s.mean, 3)} ± ${f(s.meanStdErr, 3)}`, 'stratified'],
          ['variance, uniform', f(u.variance, 4), 'uniform'], ['variance, stratified', f(s.variance, 5), 'stratified'], ['uniform / stratified', f(ratio, 1)], ['variance, cosine', f(c.variance, 5), 'cosine'],
        ],
        fact: 'Unbiased means the average over runs is the exact value; variance is how far one run is likely to be from it. Stratifying and importance sampling change the second and leave the first.',
      };
    },
    panel(host, m, r) {
      once(host, 'spread', (h) => { el('div', 'pl-plotbox', h); });
      const W = 400, H = 170, L = 8, R = 8, T = 8, B = 24, bins = 36, hiX = 2 * Math.PI;
      const X = (x) => L + (x / hiX) * (W - L - R);
      const hist = (est) => { const a = new Array(bins).fill(0); for (const e of est) a[Math.min(bins - 1, Math.max(0, Math.floor((e / hiX) * bins)))] += 1; return a.map((c) => c / est.length); };
      const hs = { uniform: hist(r.by.uniform.estimates), stratified: hist(r.by.stratified.estimates), cosine: hist(r.by.cosine.estimates) };
      const top = Math.max(...hs.uniform, ...hs.stratified) * 1.08;
      let s = `<svg viewBox="0 0 ${W} ${H}" class="pl-plot" role="img" aria-label="histograms of the estimate over many runs for three sampling methods">`;
      s += `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#2c3140"/>`;
      for (const method of ['uniform', 'stratified', 'cosine']) {
        const col = hexCss(METHOD_COLOR[method]);
        hs[method].forEach((p, i) => {
          if (p === 0) return;
          const h = Math.min(1, p / top) * (H - B - T);
          s += `<rect x="${X((i / bins) * hiX)}" y="${H - B - h}" width="${(W - L - R) / bins - 0.6}" height="${h}" fill="${col}" opacity="${method === 'cosine' ? 0.9 : 0.5}"/>`;
        });
      }
      s += `<line x1="${X(Math.PI)}" x2="${X(Math.PI)}" y1="${T}" y2="${H - B}" stroke="#e7eaf0" stroke-dasharray="3 3"/>${svgText(X(Math.PI), T + 8, 'π = 3.1416', { anchor: 'middle', color: '#e7eaf0' })}`;
      for (const x of [0, 2, 4, 6]) s += svgText(X(x), H - B + 12, String(x), { anchor: 'middle' });
      s += svgText((L + W - R) / 2, H - 2, 'estimate Î', { anchor: 'middle' });
      s += svgText(W - R, T + 8, 'uniform', { anchor: 'end', color: hexCss(COL.amber) }) + svgText(W - R, T + 19, 'stratified', { anchor: 'end', color: hexCss(COL.b) }) + svgText(W - R, T + 30, 'cosine-weighted (all at π)', { anchor: 'end', color: hexCss(COL.c) });
      host.querySelector('.pl-plotbox').innerHTML = `${s}</svg>`;
    },
  };

  // ============================================================ Solid angle: a patch seen from a point
  const patchGeometry = (m) => {
    const Pt = m.P, C = m.C;
    const facing = Pt.clone().sub(C);
    if (facing.length() < 1e-6) facing.set(0, 0, 1);
    facing.normalize();
    const axis = Math.abs(facing.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
    const t = (m.tilt * Math.PI) / 180;
    // Rodrigues: the facing direction turned by the tilt about the axis
    const n = facing.clone().multiplyScalar(Math.cos(t)).add(axis.clone().cross(facing).multiplyScalar(Math.sin(t))).add(axis.clone().multiplyScalar(axis.dot(facing) * (1 - Math.cos(t)))).normalize();
    const [e1, e2] = tangents(n);
    const half = m.side / 2;
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => C.clone().add(e1.clone().multiplyScalar(a * half)).add(e2.clone().multiplyScalar(b * half)));
    return { n, corners };
  };
  const patchView = {
    id: 'solid.patch', inputTitle: 'Point and patch', topic: 'solid', label: 'a patch', home: PHOME,
    init: { P: [-1, 0.8, 0], C: [1, 0.8, 0], tilt: 60, side: 0.4, I: 10 },
    handles: [{ id: 'P', label: 'point', color: COL.pink, anchor: 'a' }, { id: 'C', label: 'patch', color: COL.amber, anchor: 'a' }],
    params: [{ id: 'tilt', label: 'tilt', min: 0, max: 180, step: 1, unit: '°' }, { id: 'side', label: 'patch side', min: 0.05, max: 1, step: 0.05 }, { id: 'I', label: 'intensity I', min: 1, max: 20, step: 1 }],
    presets: [
      { label: 'the lecture: I = 10, r = 2, 60°', set: { P: [-1, 0.8, 0], C: [1, 0.8, 0], tilt: 60, side: 0.4, I: 10 } },
      { label: 'facing the point', set: { tilt: 0 } }, { label: 'twice as far', set: { P: [-2, 0.8, 0], C: [2, 0.8, 0], tilt: 60 } },
      { label: 'edge-on', set: { tilt: 90 } }, { label: 'facing away', set: { tilt: 150 } },
    ],
    regions: ['Solid angle of a patch'],
    run(m) {
      const g = patchGeometry(m);
      const a = PL.patchSolidAngle(toArr(m.P), toArr(m.C), toArr(g.n), m.side * m.side, m.I);
      return { ...a, area: m.side * m.side, normal: g.n, corners: g.corners, hemisphere: a.solidAngle / (2 * Math.PI) };
    },
    draw(v, m, r) {
      const Pt = m.P;
      v.sphere(Pt, 1, WIRE, { k: 'dOmega' });
      v.patch(r.corners, COL.amber, 0.55, { k: 'area' });
      v.poly(r.corners, COL.amber, { closed: true, k: 'area' });
      v.arrow(m.C, m.C.clone().add(r.normal.clone().multiplyScalar(0.7)), COL.gray, { k: 'theta', r: 0.012, hr: 0.04, head: 0.13, label: 'n', anchor: 'a' });
      const toPoint = Pt.clone().sub(m.C);
      v.dashed(Pt, m.C, COL.gray, { k: 'r' });
      v.label(`r = ${f(r.r, 2)}`, Pt.clone().add(m.C).multiplyScalar(0.5).add(V(0, -0.32, 0)), COL.gray, '', 'r');
      if (toPoint.length() > 0.3) v.arc(m.C, r.normal, toPoint, Math.min(0.4, toPoint.length() * 0.25), COL.cyan, { k: 'theta', label: 'θ' });
      // the patch seen from the point lands on the unit sphere around it
      const onSphere = r.corners.map((c) => Pt.clone().add(c.clone().sub(Pt).normalize()));
      for (const [i, c] of r.corners.entries()) v.dashed(Pt, onSphere[i], COL.amber, { k: 'dOmega' });
      v.patch(onSphere, COL.pink, 0.75, { k: 'dOmega' });
      v.poly(onSphere, COL.pink, { closed: true, k: 'dOmega' });
      v.label('dω', onSphere[0].clone().add(onSphere[2]).multiplyScalar(0.5), COL.pink, 'a', 'dOmega');
    },
    explain(m, r) {
      const area = r.area;
      const back = r.cosTheta < 1e-6;
      return {
        hud: `{dOmega|dω = ${f(r.solidAngle, 4)} sr}, {E|E = ${f(r.irradiance, 3)} W/m²}`,
        rows: [
          `r = ${f(r.r, 3)} m, {theta|θ = ${f(r.thetaDeg, 1)}°}, cos θ = ${f(r.cosTheta, 3)}, {area|dA = ${f(area, 4)} m²}`,
          `{dOmega|dω} = dA cos θ / r² = ${f(area, 4)} × ${f(r.cosTheta, 3)} / ${f(r.r * r.r, 3)} = {dOmega|${f(r.solidAngle, 5)} sr}`,
          `flux = I dω = ${f(m.I, 0)} × ${f(r.solidAngle, 5)} = {flux|${f(r.flux, 5)} W}`,
          `{E|E} = flux / dA = I cos θ / r² = ${f(m.I, 0)} × ${f(r.cosTheta, 3)} / ${f(r.r * r.r, 3)} = {E|${f(r.irradiance, 3)} W/m²}`,
          `dω is ${pct(r.hemisphere, 3)} of the hemisphere's 2π = ${f(2 * Math.PI, 3)} sr`,
        ],
        status: back
          ? { text: m.tilt > 90 ? 'the patch faces away from the point: it covers no solid angle and receives nothing' : 'the patch is edge-on: cos θ = 0, so it covers no solid angle', tone: 'warn' }
          : { text: `${f(r.solidAngle, 5)} sr: the patch looks ${f(r.cosTheta, 2)} times its size because it is tilted, and ${f(1 / (r.r * r.r), 3)} times because of the distance squared`, tone: 'info' },
        chart: { x: [0, 90], y: [0, m.I / (r.r * r.r) * 1.05], xLabel: 'θ (degrees)', curve: 'E = I cos θ / r²', series: [{ fn: (x) => (m.I * Math.cos((x * Math.PI) / 180)) / (r.r * r.r), color: COL.gold }], at: Math.min(90, r.thetaDeg), atY: r.irradiance },
        values: [['r', `${f(r.r, 3)} m`, 'r'], ['θ', `${f(r.thetaDeg, 1)}°`, 'theta'], ['cos θ', f(r.cosTheta, 4), 'theta'], ['dA', `${f(area, 4)} m²`, 'area'], ['dω', `${f(r.solidAngle, 5)} sr`, 'dOmega'], ['E', `${f(r.irradiance, 4)} W/m²`, 'E']],
        fact: `A solid angle is the area covered on the unit sphere around the point: the whole sphere is 4π = ${f(4 * Math.PI, 3)} sr, a hemisphere 2π = ${f(2 * Math.PI, 3)}, a cone of half angle 90° the same hemisphere; the sun covers ${f(PL.coneSolidAngle(0.2666).solidAngle, 6)} sr. Cos θ is Lambert's cosine, 1/r² the inverse square.`,
      };
    },
  };

  // ============================================================ Solid angle: the cosine over the hemisphere
  const cosineView = {
    id: 'solid.cosine', inputTitle: 'Strips and albedo', topic: 'solid', label: 'cosine over the hemisphere', home: HOME, init: { strips: 6, rho: 0.6 },
    params: [{ id: 'strips', label: 'strips', min: 1, max: 60, step: 1 }, { id: 'rho', label: 'albedo ρ', min: 0.1, max: 1, step: 0.05 }],
    presets: [{ label: '1 strip', set: { strips: 1 } }, { label: '6 strips', set: { strips: 6 } }, { label: '60 strips', set: { strips: 60 } }, { label: 'ρ = 0.6: f = 0.191', set: { rho: 0.6 } }],
    regions: ['The cosine over the hemisphere'],
    run(m) {
      const h = PL.hemisphereCosine(Math.round(m.strips));
      const l = PL.lambertBrdf(m.rho, h.sum);
      const fine = cached('cos100k', () => PL.hemisphereCosine(100000).sum);
      return { ...h, ...l, fine };
    },
    draw(v, m, r) {
      const n = r.thetas.length;
      drawHemisphere(v, { color: 0x3a4152, levels: [] });
      for (let i = 0; i <= n; i++) {
        const th = Math.min(Math.PI / 2, i * r.dTheta);
        const color = i % 2 === 0 ? COL.b : COL.c;
        v.circle(V(0, Math.cos(th), 0), V(0, 1, 0), Math.sin(th), color, { k: 'strips' });
        // the same ring projected straight down onto the base: the area that cos θ dω covers
        if (i > 0 && i < n) v.circle(V(0, 0, 0), V(0, 1, 0), Math.sin(th), COL.gold, { k: 'sum' });
        if (i > 0 && n <= 30) for (const phi of [0, Math.PI / 2, Math.PI, 1.5 * Math.PI]) v.dashed(V(Math.sin(th) * Math.cos(phi), Math.cos(th), Math.sin(th) * Math.sin(phi)), V(Math.sin(th) * Math.cos(phi), 0, Math.sin(th) * Math.sin(phi)), COL.gold, { k: 'sum', dash: 0.06, gap: 0.06 });
      }
      v.circle(V(), V(0, 1, 0), 1, COL.gold, { k: 'sum' });
      v.patch(Array.from({ length: 48 }, (_, i) => V(Math.cos((i / 48) * 2 * Math.PI), 0, Math.sin((i / 48) * 2 * Math.PI))), COL.gold, 0.12, { k: 'sum' });
      v.arrow(V(), V(0, 1.3, 0), COL.gray, { k: 'n', r: 0.012, hr: 0.04, head: 0.14, label: 'n', anchor: 'a' });
      v.label('base disk: area π', V(1.05, 0, 0.9), COL.gold, 'a', 'sum');
    },
    explain(m, r) {
      const n = r.thetas.length;
      return {
        hud: `∑ cos θ dω = {sum|${f(r.sum, 4)}} against {strips|π = ${f(Math.PI, 4)}}`,
        rows: [
          `a ring at θ has solid angle dω = 2π sin θ dθ, with dθ = ${f(deg(r.dTheta), 2)}° (${n} strips)`,
          `{sum|∫ cos θ dω} ≈ ∑ cos θᵢ · 2π sin θᵢ dθ = {sum|${f(r.sum, 5)}}`,
          `exact: 2π [sin²θ / 2] from 0 to π/2 = π = ${f(Math.PI, 5)}; error ${f(r.error, 5)}`,
          `the rings add to {strips|${f(r.hemisphere, 4)}} = 2π, the hemisphere`,
          `cos θ dω is a ring's area projected onto the base disk: together they cover the disk of area π`,
          `a matte surface of albedo {rho|ρ = ${f(m.rho, 2)}}: f · π = ρ, so {f|f = ρ/π = ${f(r.f, 4)}}; f · ∫ cos = ${f(r.reflected, 4)}`,
        ],
        status: { text: `${n} strips give ${f(r.sum, 4)}, ${f(Math.abs(r.error), 4)} ${r.error >= 0 ? 'above' : 'below'} π; 100,000 strips give ${f(r.fine, 7)}`, tone: Math.abs(r.error) < 0.01 ? 'ok' : 'info' },
        chart: { x: [0, n + 1], y: [0, Math.max(...r.parts) * 1.1], xLabel: 'strip, from the pole to the horizon', curve: 'cos θ dω of each strip', bars: r.parts.map((p, i) => ({ x: i + 1, y: p, color: i % 2 === 0 ? COL.b : COL.c })) },
        values: [['strips', String(n)], ['dθ', `${f(deg(r.dTheta), 2)}°`], ['sum', f(r.sum, 6), 'sum'], ['π', f(Math.PI, 6)], ['error', f(r.error, 6)], ['100,000 strips', f(r.fine, 7)], ['f = ρ/π', f(r.f, 4), 'f'], ['f · sum', f(r.reflected, 4)]],
        fact: 'The sin θ in dω is the shrinking of the latitude rings toward the pole; without it the integral would weight the pole as much as the horizon. A Lambertian BRDF without the 1/π would reflect π times more light than arrives.',
      };
    },
  };

  // ============================================================ Solid angle: the rendering equation's terms at one point
  const dirOf = (deg1) => [Math.sin((deg1 * Math.PI) / 180) * 2.4, Math.cos((deg1 * Math.PI) / 180) * 2.4, 0];
  const termsView = {
    id: 'solid.terms', inputTitle: 'Lights and material', topic: 'solid', label: 'the terms at a point', home: WIDE,
    init: { L1: dirOf(20), L2: dirOf(60), L3: dirOf(75), rho: 0.6, l1: 2.0, l2: 0.8, l3: 0.5, Le: 0 },
    handles: [{ id: 'L1', label: 'L1', color: COL.gold, anchor: 'a' }, { id: 'L2', label: 'L2', color: COL.pink, anchor: 'a' }, { id: 'L3', label: 'L3', color: COL.cyan, anchor: 'a' }],
    params: [{ id: 'rho', label: 'albedo ρ', min: 0.05, max: 1, step: 0.05 }, { id: 'l1', label: 'LiΔω, light 1', min: 0, max: 3, step: 0.1 }, { id: 'l2', label: 'LiΔω, light 2', min: 0, max: 3, step: 0.1 }, { id: 'l3', label: 'LiΔω, light 3', min: 0, max: 3, step: 0.1 }, { id: 'Le', label: 'emitted Le', min: 0, max: 1, step: 0.05 }],
    presets: [
      { label: 'the lecture\'s sum: Lo = 0.460', set: { L1: dirOf(20), L2: dirOf(60), L3: dirOf(75), rho: 0.6, l1: 2.0, l2: 0.8, l3: 0.5, Le: 0 } },
      { label: 'half the albedo', set: { rho: 0.3 } }, { label: 'light 1 at 70°', set: { L1: dirOf(70) } },
      { label: 'light 1 below the horizon', set: { L1: [2.2, -0.8, 0] } }, { label: 'a light source', set: { Le: 0.5 } },
    ],
    regions: ['The rendering equation at a point'],
    run(m) {
      const dirs = [m.L1, m.L2, m.L3].map(toArr);
      return PL.renderingTerms(m.rho, [0, 1, 0], dirs, [m.l1, m.l2, m.l3], m.Le);
    },
    draw(v, m, r) {
      drawHemisphere(v, { color: WIRE });
      v.patch([V(-1.3, 0, -1.3), V(1.3, 0, -1.3), V(1.3, 0, 1.3), V(-1.3, 0, 1.3)], COL.gray, 0.1, { k: 'rho' });
      v.arrow(V(), V(0, 1.45, 0), COL.gray, { k: 'n', r: 0.012, hr: 0.04, head: 0.14, label: 'n', anchor: 'a' });
      [[m.L1, 'l1', COL.gold], [m.L2, 'l2', COL.pink], [m.L3, 'l3', COL.cyan]].forEach(([L, key, color], i) => {
        const d = L.clone().normalize();
        const li = [m.l1, m.l2, m.l3][i];
        v.arrow(d.clone().multiplyScalar(2.2), d.clone().multiplyScalar(0.12), color, { k: key, r: 0.012 + 0.006 * li, hr: 0.07, head: 0.18 });
        v.label(`LiΔω = ${f(li, 1)}`, d.clone().multiplyScalar(1.35), color, 'l', key);
        if (d.y > 0.02) {
          v.arc(V(), V(0, 1, 0), d, 0.55 + 0.08 * i, color, { k: key, label: `${f(r.angles[i], 0)}°` });
          v.dashed(d, V(0, d.y, 0), color, { k: key });
        }
      });
      // what leaves toward the eye is the sum; the BRDF is constant, so it leaves the same way in every direction
      v.arrow(V(0, 0.02, 0), V(0.9, 0.02, 1.2).normalize().multiplyScalar(0.4 + 2 * r.Lo), COL.green, { k: 'Lo', r: 0.03, hr: 0.1, label: 'Lo', anchor: 'a' });
    },
    explain(m, r) {
      const names = ['l1', 'l2', 'l3'];
      const li = [m.l1, m.l2, m.l3];
      const best = r.terms.indexOf(Math.max(...r.terms));
      const worst = r.cosines.indexOf(Math.min(...r.cosines));
      const below = r.angles.map((a) => a > 90);
      return {
        hud: `{Lo|Lo = ${f(r.Lo, 3)}} = Le ${f(m.Le, 2)} + {sum|${f(r.sum, 3)}}`,
        rows: [
          `{rho|ρ = ${f(m.rho, 2)}}, so {f|f = ρ/π = ${f(r.f, 3)}} in every direction`,
          ...names.map((k, i) => `{${k}|light ${i + 1}}: f · LiΔω · cos θ = ${f(r.f, 3)} × ${f(li[i], 1)} × ${f(r.cosines[i], 3)} = {${k}|${f(r.terms[i], 3)}} (θ = ${f(r.angles[i], 1)}°${below[i] ? ', below the horizon' : ''})`),
          `{Lo|Lo} = Le + ∑ = ${f(m.Le, 2)} + ${f(r.sum, 3)} = {Lo|${f(r.Lo, 3)}}`,
        ],
        status: below.some(Boolean)
          ? { text: `light ${below.indexOf(true) + 1} is below the horizon: its cosine is negative, so it contributes 0`, tone: 'warn' }
          : { text: `light ${best + 1} gives ${pct(r.terms[best] / Math.max(r.sum, 1e-12), 0)} of the sum; light ${worst + 1}, at ${f(r.angles[worst], 0)}\u00b0 (cos ${f(r.cosines[worst], 2)}), gives ${pct(r.terms[worst] / Math.max(r.sum, 1e-12), 0)}: the cosine, not the BRDF, sets what a grazing light adds`, tone: 'info' },
        chart: { x: [0, 4], y: [0, Math.max(...r.terms, 0.05) * 1.15], xLabel: 'light', curve: 'f · LiΔω · cos θ of each light', bars: r.terms.map((t, i) => ({ x: i + 1, y: t, color: [COL.gold, COL.pink, COL.cyan][i] })) },
        values: [['f', f(r.f, 4), 'f'], ['θ₁, θ₂, θ₃', r.angles.map((a) => `${f(a, 0)}°`).join(', ')], ['cos θ', r.cosines.map((c) => f(c, 3)).join(', ')], ['terms', r.terms.map((t) => f(t, 3)).join(', ')], ['∑', f(r.sum, 4), 'sum'], ['Lo', f(r.Lo, 4), 'Lo']],
        fact: 'Each small light enters as the product LiΔω, the irradiance it would deliver face-on. A constant BRDF is the definition of matte: Lo does not depend on the direction to the eye. Drag a light to change its angle.',
      };
    },
  };

  // ============================================================ Cornell box: the progressive render
  /** the first shadow ray of a path, replayed, for the values beside the next-event code */
  function shadowValues(scene, path) {
    const vx = path.vertices.find((v) => v.lightPoint[1] > 0);
    if (!vx) return {};
    const half = scene.lightSide / 2;
    const ne = PL.nextEventEstimate(scene, vx.p, vx.n, vx.albedo, (vx.lightPoint[0] + half) / scene.lightSide, (vx.lightPoint[2] + half) / scene.lightSide);
    return { ...ne, half, toLight: PL.sub(vx.lightPoint, vx.p), clear: ne.visible };
  }
  /** the roulette roll at the third vertex (the first that can stop), and the chance of still walking 4 bounces on, for the code beside the views */
  function rouletteValues(roulette, path, depth, nee) {
    const v = path.vertices[Math.min(2, path.vertices.length - 1)];
    const roll = PL.rouletteQ(roulette, 2, v ? v.throughput : [0.5, 0.5, 0.5]);
    return { q: roll.q, boost: roll.boost, lum: roll.luminance, last: nee ? depth : depth + 1, ...PL.rouletteReach(roulette === 'off' ? 0.7 : roll.q < 1 ? roll.q : 0.7, 4) };
  }
  const RENDER_INIT = { maxDepth: 6, light: 0.5, roulette: 'fixed', nee: true, clamp: 0, paused: false };
  /** one path through the middle of the lower half of the image, and the values of its shadow ray and roulette roll, for the code beside the views */
  const exampleOf = (scene, size, depth, nee, roulette) => {
    const ray = PL.cameraRay(size / 2, Math.floor(0.7 * size), size, 0.5, 0.5);
    const path = PL.tracePath(scene, ray.origin, ray.direction, PL.makeRng(5), { maxDepth: depth, roulette, nee, clamp: 0, forced: null });
    return { ...path, ...shadowValues(scene, path), ...rouletteValues(roulette, path, depth, nee), peak: Math.max(...path.rawRadiance) };
  };
  const renderView = {
    id: 'cornell.render', inputTitle: 'Render', topic: 'cornell', label: 'progressive render', init: RENDER_INIT, home: BOX_HOME, grid: 'none', axes: false,
    params: [{ id: 'maxDepth', label: 'max depth', min: 0, max: 8, step: 1 }, { id: 'light', label: 'light side', min: 0.2, max: 1.2, step: 0.1 }],
    panelTitle: 'Render settings',
    presets: [
      { label: 'the lecture: depth 6, q = 0.7', run: (m) => Object.assign(m, { maxDepth: 6, roulette: 'fixed', nee: true, clamp: 0, light: 0.5 }) },
      { label: 'direct light only', run: (m) => Object.assign(m, { maxDepth: 0, roulette: 'off', nee: true }) },
      { label: 'depth 1', run: (m) => Object.assign(m, { maxDepth: 1, roulette: 'off', nee: true }) },
      { label: 'no next-event, small light', run: (m) => Object.assign(m, { maxDepth: 4, roulette: 'off', nee: false, light: 0.2 }) },
    ],
    get regions() { return ['One path', ...(this.shown.roulette !== 'off' ? ['Russian roulette'] : []), ...(this.shown.nee ? ['Next-event estimation'] : []), 'Noise, measured']; },
    shown: { roulette: 'fixed', nee: true },
    setup(ctx) {
      this.pane ??= makeStage(ctx, [render], false);
      this.pane.stage.style.display = '';
      render.dirty = true;
      loops.render.start(ctx);
    },
    leave() { loops.render.stop(); if (this.pane) this.pane.stage.style.display = 'none'; },
    run(m, ctx) {
      this.shown = { roulette: m.roulette, nee: m.nee };
      configure(render, { maxDepth: Math.round(m.maxDepth), roulette: m.roulette, nee: m.nee, clamp: m.clamp, light: Math.round(m.light * 10) / 10, cap: 1024 });
      render.paused = m.paused;
      loops.render.kick();
      const st = render.stats();
      const scene = render.scene;
      const example = exampleOf(scene, SIZE, render.cfg.maxDepth, m.nee, m.roulette);
      const noise = { mean: st.mean, standardError: st.standardError, noise: st.noise, pixels: render.kept };
      const series = PL.bounceSeries(0.75, render.cfg.maxDepth);
      return { ...example, ...noise, st, series, running: loops.render.running };
    },
    draw() {},
    explain(m, r) {
      const st = r.st;
      const none = st.spp === 0;
      const depth = render.cfg.maxDepth;
      const nm = depth + 1;
      return {
        hud: none ? 'starting the first pass' : `{spp|${st.spp} samples per pixel}, noise {noise|${pct(st.noise, 1)}}, depth {depth|${depth}}`,
        rows: none ? ['the first pass has not finished'] : [
          `{spp|${st.spp} samples per pixel}: noise {noise|${pct(st.noise, 2)}} of the image's mean ${f(st.mean, 3)}; four times the samples halves it`,
          `cost: {cost|${f(st.raysPerSample, 2)} rays per sample}, ${f(st.bouncesPerPath, 2)} bounces per path; variance × rays = {cost|${f(st.cost, 2)}}`,
          `light added by each bounce (mean sample luminance): ${st.byBounce.map((x, i) => `${i}: ${f(x, 3)}`).join(', ')}`,
          `{depth|depth ${depth}}: a closed white room (albedo 0.75) would keep ${pct(r.series.fraction, 0)} of its light at this depth, ${f(r.series.sum, 2)} of ${f(r.series.limit, 0)}`,
          `{firefly|largest sample ${f(st.maxSample, 1)}}, ${f(st.maxSample / Math.max(st.mean, 1e-9), 0)} times the image mean; ${st.fireflies} samples above 20 times the mean`,
          `${m.nee ? 'next-event estimation on: each hit also samples the light' : 'next-event estimation off: only a bounce that lands on the light counts'}; roulette ${m.roulette === 'off' ? 'off' : m.roulette === 'fixed' ? 'q = 0.7 after two bounces' : 'q = throughput after two bounces'}`,
        ],
        status: none ? { text: 'rendering', tone: 'info' }
          : st.spp >= render.cfg.cap ? { text: `done at ${st.spp} samples per pixel: noise ${pct(st.noise, 2)}`, tone: 'ok' }
            : m.paused ? { text: `paused at ${st.spp} samples per pixel`, tone: 'info' }
              : { text: `${st.spp} samples per pixel, noise ${pct(st.noise, 1)}: ${st.noise > 0.1 ? 'grainy' : st.noise > 0.03 ? 'settling' : 'smooth'}`, tone: st.noise > 0.1 ? 'warn' : 'ok' },
        chart: { x: [0, nm + 0.5], y: [0, Math.max(0.05, ...st.byBounce) * 1.15], xLabel: 'bounce', curve: 'light added by each bounce', bars: st.byBounce.map((x, i) => ({ x: i + 1, y: x, color: PATH_COLORS[i % 9] })) },
        values: none ? [['samples', '0']] : [['samples per pixel', String(st.spp), 'spp'], ['noise', pct(st.noise, 2), 'noise'], ['rays per sample', f(st.raysPerSample, 2), 'cost'], ['bounces per path', f(st.bouncesPerPath, 2)], ['image mean', f(st.mean, 4), 'mean'], ['largest sample', f(st.maxSample, 1), 'firefly']],
        fact: 'Each pass gives every pixel one more sample, and the picture is the mean. Walls\' colors bleed onto the floor and spheres as the depth grows; the ceiling, black with direct light alone, is lit by what the floor sends up.',
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'render', (h) => {
        segmented(h, 'roulette', [['off', 'off'], ['fixed', 'q = 0.7'], ['throughput', 'q = throughput']], () => ctx.state().roulette, (x) => { ctx.state().roulette = x; ctx.update(); }, h);
        segmented(h, 'next-event', [[true, 'on'], [false, 'off']], () => ctx.state().nee, (x) => { ctx.state().nee = x; ctx.update(); }, h);
        segmented(h, 'clamp', [[0, 'off'], [10, 'at 10']], () => ctx.state().clamp, (x) => { ctx.state().clamp = x; ctx.update(); }, h);
        const row = el('div', 'lab-btns', h);
        const pause = btn(row, 'pause', () => { const s = ctx.state(); s.paused = !s.paused; ctx.update(); });
        h._sync.push(() => { pause.textContent = ctx.state().paused ? 'resume' : 'pause'; pause.classList.toggle('on', ctx.state().paused); });
        btn(row, 'start again', () => { render.configure({ ...render.cfg, seed: render.cfg.seed + 1 }); loops.render.kick(); ctx.update(); }, 'Render again with a new seed');
      });
      render.paint();
    },
  };

  // ============================================================ Cornell box: two renders side by side
  const COMPARE = {
    depth: (m) => [{ name: 'depth 0: direct light only', cfg: { maxDepth: 0, roulette: 'off', nee: true } }, { name: `depth ${Math.round(m.maxDepth)}`, cfg: { maxDepth: Math.round(m.maxDepth), roulette: 'off', nee: true } }],
    roulette: (m) => [{ name: 'roulette off', cfg: { maxDepth: Math.round(m.maxDepth), roulette: 'off', nee: true } }, { name: 'roulette q = 0.7', cfg: { maxDepth: Math.round(m.maxDepth), roulette: 'fixed', nee: true } }],
    nee: (m) => [{ name: 'next-event off', cfg: { maxDepth: Math.round(m.maxDepth), roulette: 'off', nee: false } }, { name: 'next-event on', cfg: { maxDepth: Math.round(m.maxDepth), roulette: 'off', nee: true } }],
    clamp: (m) => [{ name: 'no clamp, no next-event', cfg: { maxDepth: Math.round(m.maxDepth), roulette: 'off', nee: false, clamp: 0 } }, { name: 'sample clamped at 10', cfg: { maxDepth: Math.round(m.maxDepth), roulette: 'off', nee: false, clamp: 10 } }],
  };
  const COMPARE_REGIONS = { depth: ['One path', 'Bounces add up'], roulette: ['Russian roulette', 'One path'], nee: ['Next-event estimation', 'One path'], clamp: ['Fireflies', 'One path'] };
  const compareView = {
    id: 'cornell.compare', inputTitle: 'Render', topic: 'cornell', label: 'two renders', home: BOX_HOME, grid: 'none', axes: false,
    init: { what: 'roulette', maxDepth: 4, light: 0.5 },
    params: [{ id: 'maxDepth', label: 'max depth', min: 1, max: 8, step: 1 }, { id: 'light', label: 'light side', min: 0.2, max: 1.2, step: 0.1 }],
    panelTitle: 'Same scene, same samples, one change',
    presets: [
      { label: 'roulette on and off', run: (m) => Object.assign(m, { what: 'roulette', maxDepth: 6 }) },
      { label: 'next-event on and off', run: (m) => Object.assign(m, { what: 'nee', maxDepth: 4, light: 0.5 }) },
      { label: 'each bounce adds light', run: (m) => Object.assign(m, { what: 'depth', maxDepth: 6 }) },
      { label: 'fireflies and clamping', run: (m) => Object.assign(m, { what: 'clamp', maxDepth: 4, light: 0.2 }) },
    ],
    get regions() { return COMPARE_REGIONS[this.what]; },
    what: 'roulette',
    setup(ctx) {
      this.pane ??= makeStage(ctx, [cmpA, cmpB], true);
      this.pane.stage.style.display = '';
      cmpA.dirty = cmpB.dirty = true;
      loops.compare.start(ctx);
    },
    leave() { loops.compare.stop(); if (this.pane) this.pane.stage.style.display = 'none'; },
    run(m) {
      this.what = m.what;
      const [a, b] = COMPARE[m.what](m);
      const light = Math.round(m.light * 10) / 10;
      configure(cmpA, { ...a.cfg, light, cap: 512 });
      configure(cmpB, { ...b.cfg, light, cap: 512 });
      loops.compare.kick();
      const sa = cmpA.stats(), sb = cmpB.stats();
      const spp = Math.min(sa.spp, sb.spp);
      const px = cmpA.kept;
      const zSe = spp > 0 ? Math.hypot(sa.standardError, sb.standardError) / Math.sqrt(px) : 0;
      const z = zSe > 0 ? Math.abs(sb.mean - sa.mean) / zSe : 0;
      const example = exampleOf(cmpB.scene, SMALL, cmpB.cfg.maxDepth, cmpB.cfg.nee, cmpB.cfg.roulette);
      const noise = { mean: sb.mean, standardError: sb.standardError, noise: sb.noise, pixels: cmpB.kept };
      const fireflyRatio = PL.fireflyValue(1000, 0.001);
      return { ...example, ...noise, ...PL.bounceSeries(0.75, cmpB.cfg.maxDepth), ...fireflyRatio, a, b, sa, sb, spp, z, relDiff: sa.mean > 0 ? (sb.mean - sa.mean) / sa.mean : 0, fireflyRatio };
    },
    draw() {},
    explain(m, r) {
      const { sa, sb, a, b } = r;
      const none = r.spp === 0;
      const one = (x) => x.noise * Math.sqrt(Math.max(1, x.spp));      // the noise of one sample: the same at any samples per pixel
      const verdict = {
        depth: { text: `${b.name} is ${pct(r.relDiff, 0)} brighter than direct light alone: the extra bounces carry the light that the first hit's shadow ray cannot see`, tone: 'info' },
        roulette: r.z < 3
          ? { text: `the two means differ by ${f(r.z, 1)} standard errors: no bias, ${pct(1 - sb.raysPerSample / sa.raysPerSample, 0)} fewer rays per sample, noise ${f(one(sb) / Math.max(one(sa), 1e-12), 2)} times as large at the same samples`, tone: 'ok' }
          : { text: `the means differ by ${f(r.z, 1)} standard errors: more than noise explains`, tone: 'warn' },
        nee: r.z < 3
          ? { text: `the two means differ by ${f(r.z, 1)} standard errors: both estimate the same light; next-event estimation has ${f(one(sa) / Math.max(one(sb), 1e-12), 1)} times less noise at the same samples`, tone: 'ok' }
          : { text: `the means differ by ${f(r.z, 1)} standard errors: the render without next-event estimation has not converged yet`, tone: 'info' },
        clamp: { text: `clamping each sample at 10 makes the image ${pct(-r.relDiff, 1)} darker (${f(r.z, 1)} standard errors): the energy thrown away is bias`, tone: r.relDiff < 0 ? 'warn' : 'info' },
      }[m.what];
      const values = [];
      for (const [label, fn] of [['samples per pixel', (x) => String(x.spp)], ['noise', (x) => pct(x.noise, 2)], ['rays per sample', (x) => f(x.raysPerSample, 2)], ['variance \u00d7 rays', (x) => f(x.cost, 2)], ['mean', (x) => f(x.mean, 4)], ['largest sample', (x) => f(x.maxSample, 1)]]) {
        values.push([`A: ${label}`, none ? '0' : fn(sa)], [`B: ${label}`, none ? '0' : fn(sb)]);
      }
      return {
        hud: none ? 'starting' : `{spp|${r.spp} samples per pixel}: noise A {noise|${pct(sa.noise, 1)}}, B {noise|${pct(sb.noise, 1)}}`,
        rows: [
          `A: {depth|${a.name}}; B: {depth|${b.name}}`,
          `noise (relative standard error of the pixels): {noise|A ${pct(sa.noise, 2)}, B ${pct(sb.noise, 2)}}`,
          `cost: {cost|A ${f(sa.raysPerSample, 2)}, B ${f(sb.raysPerSample, 2)} rays per sample}; variance × rays: A ${f(sa.cost, 2)}, B ${f(sb.cost, 2)} (lower is better)`,
          `image mean: {mean|A ${f(sa.mean, 4)}, B ${f(sb.mean, 4)}}`,
          `{firefly|largest sample: A ${f(sa.maxSample, 1)}, B ${f(sb.maxSample, 1)}}; fireflies (above 20 times the mean): A ${sa.fireflies}, B ${sb.fireflies}`,
          `a light of 0.001 sr and radiance 1000 is hit by a uniform bounce with probability ${f(r.fireflyRatio.probability, 5)}, and one such sample is worth ${f(r.fireflyRatio.sample, 0)}`,
        ],
        status: none ? { text: 'rendering', tone: 'info' } : verdict,
        values,
        fact: 'The two renders use the same seed, so they differ only by the one change. Roulette and next-event estimation change the noise and the cost, not the expected image; a fixed depth and a clamp change the image.',
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'compare', (h) => {
        segmented(h, 'change', [['depth', 'depth'], ['roulette', 'roulette'], ['nee', 'next-event'], ['clamp', 'clamp']], () => ctx.state().what, (x) => { ctx.state().what = x; ctx.update(); }, h);
      });
      if (this.pane) {
        this.pane.cells[0].cap.textContent = `A: ${r.a.name}`;
        this.pane.cells[1].cap.textContent = `B: ${r.b.name}`;
      }
      cmpA.paint();
      cmpB.paint();
    },
  };

  // ============================================================ One path
  const AIM = [-1.5, -0.9];
  const PATH_INIT = { px: 48, py: 90, seed: 1, maxDepth: 4, roulette: 'fixed', nee: true, aim: false, light: 0.5 };
  let pathScene = PL.makeCornell(0.5);
  const traceOne = (m) => {
    const scene = PL.makeCornell(Math.round(m.light * 10) / 10);
    pathScene = scene;
    const ray = PL.cameraRay(m.px, m.py, SMALL, 0.5, 0.5);
    let forced = null;
    if (m.aim) {
      const first = PL.intersect(scene, ray.origin, ray.direction);
      if (first.hit && first.id === 2) forced = [PL.normalize(PL.sub([AIM[0], AIM[1], first.p[2] + 0.2], first.p))];
    }
    const options = { maxDepth: Math.round(m.maxDepth), roulette: m.roulette, nee: m.nee, clamp: 0, forced };
    const path = PL.tracePath(scene, ray.origin, ray.direction, PL.makeRng(m.seed * 7919 + 13), options);
    return { path, scene, forced, options };
  };
  /** a path seed with the property wanted, found by looking through the seeds in order */
  function findSeed(m, wanted) {
    for (let s = 1; s <= 400; s++) {
      const t = traceOne({ ...m, seed: s });
      if (wanted(t.path)) return s;
    }
    return m.seed;
  }
  const pathView = {
    id: 'path.one', inputTitle: 'Path', topic: 'path', label: 'one path', init: PATH_INIT, home: BOX_HOME, grid: 'none', axes: false,
    params: [{ id: 'maxDepth', label: 'max depth', min: 0, max: 8, step: 1 }, { id: 'seed', label: 'path number', min: 1, max: 400, step: 1 }],
    panelTitle: 'Click a pixel',
    presets: [
      { label: 'the lecture: floor, then the red wall', run: (m) => Object.assign(m, { px: 48, py: 90, aim: true, maxDepth: 1, roulette: 'fixed', nee: true, seed: 1 }) },
      { label: 'stopped by roulette', run: (m) => { Object.assign(m, { aim: false, maxDepth: 8, roulette: 'fixed', nee: true }); m.seed = findSeed(m, (p) => p.vertices.some((v) => v.stop === 'roulette') && p.vertices.length >= 4); } },
      { label: 'escapes through the front', run: (m) => { Object.assign(m, { aim: false, maxDepth: 6, roulette: 'off', nee: true }); m.seed = findSeed(m, (p) => p.escaped && p.vertices.length >= 3); } },
      { label: 'ends on the light (no next-event)', run: (m) => { Object.assign(m, { aim: false, maxDepth: 6, roulette: 'off', nee: false, px: 48, py: 48 }); m.seed = findSeed(m, (p) => p.hitLight); } },
      { label: 'direct light only', run: (m) => Object.assign(m, { aim: false, maxDepth: 0, roulette: 'off', nee: true }) },
    ],
    get regions() { return ['One path', ...(this.shown.roulette !== 'off' ? ['Russian roulette'] : []), ...(this.shown.nee ? ['Next-event estimation'] : [])]; },
    shown: { roulette: 'fixed', nee: true },
    setup(ctx) { loops.path.start(ctx); },
    leave() { loops.path.stop(); },
    run(m) {
      this.shown = { roulette: m.roulette, nee: m.nee };
      configure(preview, { maxDepth: 3, roulette: 'fixed', nee: true, light: Math.round(m.light * 10) / 10, cap: 24 });
      loops.path.kick();
      const { path, scene, forced } = traceOne(m);
      const lastVertex = path.vertices[path.vertices.length - 1];
      return {
        ...path, ...shadowValues(scene, path), ...rouletteValues(m.roulette, path, Math.round(m.maxDepth), m.nee), peak: Math.max(...path.rawRadiance),
        scene, lastVertex, forced, sampleLuminance: PL.luminance(path.radiance),
      };
    },
    draw(v, m, r) {
      drawBox(v, r.scene);
      let from = P3(PL.EYE);
      r.vertices.forEach((vx, k) => {
        const to = P3(vx.p);
        const key = `v${k + 1}`;
        const color = PATH_COLORS[k % 9];
        v.arrow(from, to, color, { k: key, r: 0.018, hr: 0.06, head: 0.18 });
        // the vertex is a sphere whose size is the throughput's luminance and whose tint is the throughput's color: it shrinks as light is lost
        // and turns pink after the red wall
        const T = vx.throughput, peak = Math.max(T[0], T[1], T[2], 1e-6);
        const tint = (Math.round(255 * T[0] / peak) << 16) | (Math.round(255 * T[1] / peak) << 8) | Math.round(255 * T[2] / peak);
        v.point(to, vx.emission > 0 ? COL.gold : tint, { r: 0.04 + 0.1 * Math.min(1, PL.luminance(T)), k: key });
        v.label(r.vertices.length <= 4 ? `${k + 1}: T ${short(T)}` : `${k + 1}`, to, color, k % 2 ? 'br' : 'ar', key);
        if (vx.lightPoint[1] > 0) {
          const lp = P3(vx.lightPoint);
          v.dashed(to, lp, vx.visible ? COL.green : COL.red, { k: key });
          v.point(lp, vx.visible ? COL.green : COL.red, { r: 0.04, k: key });
        }
        if (vx.stop === 'roulette') v.label('stopped (roulette)', to, COL.red, 'bl', key);
        from = to;
      });
      if (r.escaped && r.lastVertex) {
        const d = r.lastVertex.direction;
        const k = `v${r.vertices.length}`;
        v.arrow(P3(r.lastVertex.p), P3(r.lastVertex.p).add(P3(d).multiplyScalar(1.6)), COL.gray, { k, r: 0.012, hr: 0.05, head: 0.15, label: 'escapes', anchor: 'a' });
      }
    },
    explain(m, r) {
      const vs = r.vertices;
      const last = r.lastVertex;
      const shown = vs.slice(0, 6);
      const ended = r.escaped ? `escaped through the open front after ${vs.length} hit${vs.length === 1 ? '' : 's'}`
        : last && last.stop === 'roulette' ? `stopped by roulette at v${vs.length} (q = ${f(last.q, 2)}): the survivors of that roll are boosted by 1/q`
          : last && last.stop === 'light' ? (m.nee && vs.length > 1 ? 'ended on the light' : `ended on the light after ${vs.length - 1} bounce${vs.length === 2 ? '' : 's'}: the emission counts`)
            : `reached the depth limit after ${r.bounces} bounce${r.bounces === 1 ? '' : 's'}`;
      const zero = r.sampleLuminance === 0;
      const rows = [];
      shown.forEach((vx, k) => {
        const name = vx.emission > 0 ? 'the light' : SURFACE[vx.id];
        rows.push(`{v${k + 1}|v${k + 1}, ${name}}: {throughput|T = ${rgb(vx.throughput)}}${vx.emission > 0 ? `, emission ${f(vx.emission, 1)}` : ` × albedo ${rgb(vx.albedo)} = ${rgb(vx.throughputOut)}${vx.q < 1 ? `, ÷ q ${f(vx.q, 2)} = ${rgb(PL.scale(vx.throughputOut, 1 / vx.q))}` : ''}`}`);
        if (vx.emission === 0 && m.nee) rows.push(`  shadow ray {${vx.visible ? 'shadow' : 'blocked'}|${vx.visible ? 'clear' : 'blocked'}}: {direct|f Le G / pA = ${rgb(vx.direct, 3)}}, {contribution|T × that = ${rgb(vx.contribution, 3)}}`);
        if (vx.emission > 0 && vx.contribution[0] > 0) rows.push(`  {contribution|contribution = T × Le = ${rgb(vx.contribution, 2)}}`);
      });
      if (vs.length > shown.length) rows.push(`... ${vs.length - shown.length} more vertices`);
      rows.push(`{contribution|L = ∑ contributions = ${rgb(r.radiance, 3)}}, luminance ${f(r.sampleLuminance, 3)}`);
      return {
        hud: `{pixel|pixel (${m.px}, ${m.py})}: {contribution|L = ${rgb(r.radiance, 2)}} from ${vs.length} vertices`,
        rows,
        status: zero ? { text: `${ended}; this sample is 0: ${m.nee ? 'every shadow ray was blocked or faced away' : 'the path never reached the light'}`, tone: 'warn' }
          : { text: ended, tone: last && last.stop === 'roulette' ? 'warn' : 'ok' },
        chart: { x: [0, vs.length + 1], y: [0, Math.max(0.05, ...vs.map((x) => PL.luminance(x.contribution))) * 1.15], xLabel: 'vertex', curve: 'luminance each vertex contributes', bars: vs.map((x, k) => ({ x: k + 1, y: PL.luminance(x.contribution), color: PATH_COLORS[k % 9] })) },
        values: [['pixel', `(${m.px}, ${m.py})`, 'pixel'], ['vertices', String(vs.length)], ['rays', String(r.rays)], ['bounces', String(r.bounces)], ['sample', f(r.sampleLuminance, 3), 'contribution'], ['aimed', m.aim ? 'first bounce at the red wall' : 'no, all random']],
        fact: 'With cosine-weighted bounces and a diffuse BRDF each bounce multiplies the throughput by the albedo, so the red wall keeps five times the green and blue of its light: the pink of color bleeding. Hover a row to find its vertex; click the picture or a pixel of the preview to trace another.',
      };
    },
    onPick(ray, e, ctx) {
      const m = ctx.state();
      const hit = PL.intersect(pathScene, ray.origin, ray.dir);
      if (!hit.hit || hit.id === 7) return;
      const d = PL.sub(hit.p, PL.EYE);
      if (d[2] >= 0) return;
      const sx = d[0] / -d[2] / PL.TAN_HALF_FOV, sy = d[1] / -d[2] / PL.TAN_HALF_FOV;
      const px = Math.floor(((sx + 1) / 2) * SMALL), py = Math.floor(((1 - sy) / 2) * SMALL);
      if (px < 0 || py < 0 || px >= SMALL || py >= SMALL) return;
      Object.assign(m, { px, py, aim: false });
      ctx.update();
    },
    panel(host, m, r, ctx) {
      once(host, 'path', (h) => {
        segmented(h, 'roulette', [['off', 'off'], ['fixed', 'q = 0.7'], ['throughput', 'q = throughput']], () => ctx.state().roulette, (x) => { ctx.state().roulette = x; ctx.update(); }, h);
        segmented(h, 'next-event', [[true, 'on'], [false, 'off']], () => ctx.state().nee, (x) => { ctx.state().nee = x; ctx.update(); }, h);
        const row = el('div', 'lab-btns', h);
        btn(row, 'next path', () => { const s = ctx.state(); s.seed = (s.seed % 400) + 1; ctx.update(); }, 'The next seeded random path through the same pixel');
        const aim = btn(row, 'aim at the red wall', () => { const s = ctx.state(); s.aim = !s.aim; ctx.update(); }, 'Send the first bounce from the floor toward the red wall, as in the lecture\'s example');
        h._sync.push(() => aim.classList.toggle('on', !!ctx.state().aim));
        const wrap = el('div', 'pl-pick', h);
        const canvas = el('canvas', 'pl-canvas', wrap);
        canvas.width = SMALL; canvas.height = SMALL;
        canvas.setAttribute('aria-label', 'a preview of the render: click a pixel to trace a path through it');
        el('div', 'pl-cross', wrap);
        preview.canvas = canvas;
        preview.dirty = true;
        canvas.addEventListener('click', (e) => {
          const b = canvas.getBoundingClientRect();
          const s = ctx.state();
          s.px = Math.max(0, Math.min(SMALL - 1, Math.floor(((e.clientX - b.left) / b.width) * SMALL)));
          s.py = Math.max(0, Math.min(SMALL - 1, Math.floor(((e.clientY - b.top) / b.height) * SMALL)));
          s.aim = false;
          ctx.update();
        });
      });
      const canvas = host.querySelector('canvas');
      preview.canvas = canvas;
      preview.paint();
      const cross = host.querySelector('.pl-cross');
      cross.style.left = `${((m.px + 0.5) / SMALL) * 100}%`;
      cross.style.top = `${((m.py + 0.5) / SMALL) * 100}%`;
    },
  };

  // ============================================================ One path: sampling the light
  const lightView = {
    id: 'path.light', inputTitle: 'Point and light', topic: 'path', label: 'sampling the light', home: BOX_HOME, grid: 'none', axes: false,
    init: { P: [-0.9, -1.5, 0.2], light: 0.5, count: 4, seed: 1 },
    handles: [{ id: 'P', label: 'point', color: COL.pink, fixed: 'y', anchor: 'a' }],
    params: [{ id: 'light', label: 'light side', min: 0.2, max: 1.2, step: 0.1 }, { id: 'count', label: 'samples per estimate', min: 1, max: 16, step: 1 }, { id: 'seed', label: 'draw', min: 1, max: 99, step: 1 }],
    presets: [
      { label: 'an open point', set: { P: [-0.9, -1.5, 0.2], light: 0.5 } }, { label: 'a small light', set: { light: 0.2 } }, { label: 'a large light', set: { light: 1.2 } },
      { label: 'under the sphere', set: { P: [0.6, -1.5, 0.4] } }, { label: 'next to the red wall', set: { P: [-1.4, -1.5, 0.6] } },
    ],
    regions: ['Sampling the light by area', 'Next-event estimation', 'Direct light, two ways'],
    run(m) {
      const light = Math.round(m.light * 10) / 10;
      const scene = PL.makeCornell(light);
      const p = toArr(m.P), n = [0, 1, 0], count = Math.round(m.count);
      const rng = PL.makeRng(m.seed * 7919);
      const viaLight = PL.estimateDirect(scene, p, n, 0.75, 'light', count, rng);
      const viaBrdf = PL.estimateDirect(scene, p, n, 0.75, 'brdf', count, rng);
      const key = `${light}|${p.map((x) => x.toFixed(1))}|${count}`;
      const mLight = cached(`dl|${key}`, () => PL.measureDirect(scene, p, n, 0.75, 'light', count, 3000, 5));
      const mBrdf = cached(`db|${key}`, () => PL.measureDirect(scene, p, n, 0.75, 'brdf', count, 3000, 6));
      const one = PL.nextEventEstimate(scene, p, n, [0.75, 0.75, 0.75], 0.5, 0.5);
      const demo = PL.areaLightSample(0.25, 1.5, 0.8, 0.9, 10);
      const hitRate = cached(`hit|${key}`, () => PL.estimateDirect(scene, p, n, 0.75, 'brdf', 3000, PL.makeRng(8)).samples.filter((x) => x > 0).length / 3000);
      const half = scene.lightSide / 2;
      return { ...one, half, toLight: PL.sub(one.lightPoint, p), clear: one.visible, scene, viaLight, viaBrdf, mLight, mBrdf, demo, hitRate, count, exact: mLight.exact };
    },
    draw(v, m, r) {
      drawBox(v, r.scene, { eye: false });
      const p = m.P;
      v.arrow(p, p.clone().add(V(0, 0.5, 0)), COL.gray, { k: 'n', r: 0.012, hr: 0.04, head: 0.13, label: 'n', anchor: 'a' });
      r.viaLight.hits.forEach((hp) => v.dashed(p, P3(hp), COL.green, { k: 'nee' }));
      r.viaLight.hits.forEach((hp) => v.point(P3(hp), COL.green, { r: 0.035, k: 'nee' }));
      // the cosine-weighted bounces drawn again with the same generator, so the ones that reach the light can be seen
      const rng = PL.makeRng(m.seed * 7919 + 99);
      for (let i = 0; i < Math.min(12, r.count * 3); i++) {
        const b = PL.cosineDirection(PL.nextRandom(rng), PL.nextRandom(rng));
        const d = PL.toWorld([0, 1, 0], b.dir).dir;
        const h = PL.intersect(r.scene, PL.add(toArr(p), PL.scale([0, 1, 0], PL.OFFSET)), d);
        const end = h.hit ? P3(h.p) : P3(PL.add(toArr(p), PL.scale(d, 2)));
        v.dashed(p, end, h.hit && h.emission > 0 ? COL.gold : COL.cyan, { k: 'brdf' });
        if (h.hit && h.emission > 0) v.point(end, COL.gold, { r: 0.06, k: 'brdf' });
      }
      const lp = P3(r.lightPoint);
      v.arc(p, V(0, 1, 0), lp.clone().sub(p), 0.5, COL.gray, { k: 'G' });
    },
    explain(m, r) {
      const d = r.demo, ml = r.mLight, mb = r.mBrdf;
      return {
        hud: `exact direct light {light|${f(r.exact, 4)}}: next-event {nee|${pct(ml.rmsRelError, 0)}} error, bounce {brdf|${pct(mb.rmsRelError, 0)}}`,
        rows: [
          `light of area ${f(r.scene.lightArea, 3)}: {pA|pA = 1/A = ${f(r.pdfArea, 2)}}; the point sees it at r = ${f(r.r, 3)}`,
          `cos θ (surface) = ${f(r.cosSurface, 3)}, cos θ (light) = ${f(r.cosLight, 3)}`,
          `{pW|p(ω) = pA r² / cos θl = ${f(r.pdfSolidAngle, 2)}}; {G|G = cos θs cos θl / r² = ${f(r.G, 4)}}`,
          `one next-event sample at the middle of the light: f Le G / pA = {nee|${f(r.contribution[0], 4)}} (${r.visible ? 'shadow ray clear' : 'shadow ray blocked or facing away'})`,
          `${ml.exact > 0 ? `over 3000 estimates of ${r.count} samples: next-event mean {nee|${f(ml.mean, 4)}} ± ${f(ml.meanStdErr, 4)}; bounce mean {brdf|${f(mb.mean, 4)}} ± ${f(mb.meanStdErr, 4)}` : 'this point receives no direct light'}`,
          `relative RMS error: {nee|next-event ${pct(ml.rmsRelError, 1)}}, {brdf|bounce ${pct(mb.rmsRelError, 1)}}${ml.rmsRelError > 0 ? `: ${f(mb.rmsRelError / ml.rmsRelError, 1)} times as much` : ''}`,
          `the lecture's numbers: A = 0.25, r = 1.5, cos 0.8 and 0.9: p(ω) = ${f(d.pdfSolidAngle, 1)}, G = ${f(d.G, 2)}, (0.75/π) Le G / pA with Le = 10 = ${f((0.75 / Math.PI) * d.weight, 3)}`,
        ],
        status: ml.exact === 0 ? { text: 'this point is in shadow: no light reaches it, so both estimators return 0', tone: 'warn' }
          : { text: `both estimators average to the exact value; a cosine-weighted bounce lands on the light ${pct(r.hitRate, 1)} of the time, and next-event estimation aims every sample at it`, tone: 'ok' },
        chart: { x: [0, 3], y: [0, Math.max(0.05, ml.rmsRelError, mb.rmsRelError) * 1.15], xLabel: '', curve: 'relative RMS error: next-event, bounce', bars: [{ x: 1, y: ml.rmsRelError, color: COL.green }, { x: 2, y: mb.rmsRelError, color: COL.cyan }] },
        values: [['exact', f(r.exact, 4), 'light'], ['samples', String(r.count)], ['next-event RMS', pct(ml.rmsRelError, 1), 'nee'], ['bounce RMS', pct(mb.rmsRelError, 1), 'brdf'], ['next-event mean', f(ml.mean, 4), 'nee'], ['bounce mean', f(mb.mean, 4), 'brdf']],
        fact: 'The exact value is a 48 × 48 grid over the light. Green lines are next-event samples, cyan lines cosine-weighted bounces, gold the ones that land on the light. A small light is where a bounce rarely finds it: the fireflies of the render.',
      };
    },
  };

  const views = [estimateView, errorView, spreadView, patchView, cosineView, termsView, renderView, compareView, pathView, lightView];
  for (const v of views) v.axes = false;
  Object.defineProperty(views, 'engines', { value: { render, cmpA, cmpB, preview }, enumerable: false });
  Object.defineProperty(views, 'loops', { value: loops, enumerable: false });
  return views;
}
