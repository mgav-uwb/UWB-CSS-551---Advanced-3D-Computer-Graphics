// attention-lab-query: the first topic of the attention-lab demo. "one query": the lecture's three tokens in the plane, the scores,
// the softmax weights and the output y as a weighted sum of the values, with the tokens draggable. "why sqrt(d)": the same scores
// at larger d. run() calls the program's own functions (lib/programs/attention-lab/webgl/attentionlab.js), so the numbers beside
// the code are that code's output.
import * as A from '../programs/attention-lab/webgl/attentionlab.js';
import { V } from '../core/lab-viz.js';
import { I2, WV, SLIDE_TOKENS, TOKEN_HEX, tokenArrays, rangeFor, snap01, clamp } from './attention-lab-common.js';
import { overlayFor, showOverlay, hideOverlay, drawPlane, planeMaps, clipTo, text, arrow2d, dot, line, rgba, TOKEN_COLORS, GOLD, f, vt, segmented, btn, once, el } from './attention-lab-draw.js';

const N = 3;
const PLANE_L = { x: 6, y: 30, w: 200, h: 200 };
const PLANE_R = { x: 214, y: 30, w: 200, h: 200 };
const LIMIT = 2.9;

function setTokens(m, list) {
  list.forEach((p, i) => m[`x${i + 1}`].set(p[0], p[1], 0));
}

// ================================================================ one query

function pickToken(m, p, x, y) {
  let best = -1, bestD = 16;
  for (let j = 0; j < N; j++) {
    const v = m[`x${j + 1}`];
    const d = Math.hypot(p.X(v.x) - x, p.Y(v.y) - y);
    if (d < bestD) { bestD = d; best = j; }
  }
  return best;
}

function paintQuery(ov, g, m, r) {
  const tau = m.temp;
  const pl = drawPlane(g, PLANE_L, 3, 'query q and keys k');
  clipTo(g, PLANE_L);
  const i = r.i;
  for (let j = 0; j < N; j++) {
    const k = r.K[j];
    arrow2d(g, pl.X(0), pl.Y(0), pl.X(k[0]), pl.Y(k[1]), TOKEN_COLORS[j], 1.8, 8, 0.85 * ov.dim('k'));
  }
  const q = r.Q[i];
  arrow2d(g, pl.X(0), pl.Y(0), pl.X(q[0]), pl.Y(q[1]), GOLD, 4, 11, 0.55 * ov.dim('q'));
  for (let j = 0; j < N; j++) {
    const k = r.K[j];
    dot(g, pl.X(k[0]), pl.Y(k[1]), j === i ? 8 : 6.5, TOKEN_COLORS[j], { alpha: ov.dim('k', `x${j + 1}`) });
    if (j === i) dot(g, pl.X(k[0]), pl.Y(k[1]), 11, GOLD, { ring: true, alpha: ov.dim('q') });
  }
  g.restore();
  for (let j = 0; j < N; j++) {
    const k = r.K[j];
    text(g, `x${j + 1}`, pl.X(k[0]) + 11, pl.Y(k[1]) - 9, { size: 13.5, color: TOKEN_COLORS[j], weight: 700, alpha: ov.dim('k', `x${j + 1}`) });
  }
  const qx = pl.X(q[0]) * 0.5 + pl.X(0) * 0.5, qy = pl.Y(q[1]) * 0.5 + pl.Y(0) * 0.5;
  text(g, 'q', qx - 12, qy + 15, { size: 14, color: GOLD, weight: 700, alpha: ov.dim('q') });

  // the values, each as big as its weight, and the weighted sum built tip to tail
  const range = rangeFor([r.V, [r.y]], 2);
  const pr = drawPlane(g, PLANE_R, range, 'values v and output y');
  clipTo(g, PLANE_R);
  for (let j = 0; j < N; j++) {
    const v = r.V[j];
    const rad = 4.5 + 11 * r.weights[j];
    dot(g, pr.X(v[0]), pr.Y(v[1]), rad, rgba(TOKEN_COLORS[j], 0.28), { stroke: TOKEN_COLORS[j], width: 2, alpha: ov.dim('v', 'a', `x${j + 1}`) });
  }
  let cx = 0, cy = 0;
  for (let j = 0; j < N; j++) {
    const nx = cx + r.weights[j] * r.V[j][0], ny = cy + r.weights[j] * r.V[j][1];
    arrow2d(g, pr.X(cx), pr.Y(cy), pr.X(nx), pr.Y(ny), TOKEN_COLORS[j], 3.5, 9, 0.95 * ov.dim('a', 'y', `x${j + 1}`));
    cx = nx; cy = ny;
  }
  dot(g, pr.X(r.y[0]), pr.Y(r.y[1]), 7, GOLD, { alpha: ov.dim('y') });
  g.restore();
  for (let j = 0; j < N; j++) {
    const v = r.V[j];
    text(g, `v${j + 1}`, pr.X(v[0]) + 7 + 11 * r.weights[j], pr.Y(v[1]) - 6, { size: 13, color: TOKEN_COLORS[j], weight: 700, alpha: ov.dim('v', `x${j + 1}`) });
  }
  text(g, 'y', pr.X(r.y[0]) + 11, pr.Y(r.y[1]) + 17, { size: 15, color: GOLD, weight: 700, alpha: ov.dim('y') });

  // the scores and the weights, one row per key
  const top = 262;
  text(g, 'key', 8, top, { size: 12.5, color: '#79829a', halo: false });
  text(g, m.scaled ? 'q·k / √d' : 'q·k', 62, top, { size: 12.5, color: '#79829a', halo: false });
  text(g, `weight α (τ = ${f(tau)})`, 134, top, { size: 12.5, color: '#79829a', halo: false });
  const barMax = 190;
  for (let j = 0; j < N; j++) {
    const y = top + 30 + j * 36;
    const a = ov.dim('s', 'a', `x${j + 1}`);
    dot(g, 14, y - 5, 7, TOKEN_COLORS[j], { alpha: a });
    text(g, `x${j + 1}`, 28, y, { size: 14.5, color: TOKEN_COLORS[j], weight: 700, alpha: a });
    text(g, f(r.scores[j], 3), 62, y, { size: 15, color: '#ffa657', weight: 600, alpha: ov.dim('s') });
    g.fillStyle = rgba(TOKEN_COLORS[j], 0.9 * ov.dim('a', `x${j + 1}`));
    g.fillRect(134, y - 16, Math.max(2, r.weights[j] * barMax), 21);
    text(g, f(r.weights[j], 3), 134 + Math.max(2, r.weights[j] * barMax) + 6, y, { size: 15, color: '#7ee787', weight: 600, alpha: ov.dim('a') });
  }
  text(g, `y = Σ α v = ${vt(r.y, 3)}`, 8, top + 30 + 3 * 36 + 8, { size: 16.5, color: GOLD, weight: 700, alpha: ov.dim('y') });
  text(g, 'α = softmax(score / τ);  y is the weighted sum of the values', 8, top + 30 + 3 * 36 + 32, { size: 12, color: '#79829a', halo: false });
}

export function oneQueryView() {
  let drag = null;
  return {
    id: 'query.one', topic: 'query', label: 'one query', inputTitle: 'Tokens x (drag a point, or type)',
    init: { x1: [1, 0, 0], x2: [0, 1, 0], x3: [1, 1, 0], query: 2, temp: 1, scaled: 1 },
    handles: SLIDE_TOKENS.map((_, j) => ({ id: `x${j + 1}`, label: `x${j + 1}`, color: TOKEN_HEX[j], fixed: 'z' })),
    params: [{ id: 'temp', label: 'temperature τ', min: 0.05, max: 4, step: 0.01 }],
    presets: [
      { label: "slide: token 3", run: (m) => { setTokens(m, SLIDE_TOKENS); Object.assign(m, { query: 2, temp: 1, scaled: 1 }); } },
      { label: "slide: token 1", run: (m) => { setTokens(m, SLIDE_TOKENS); Object.assign(m, { query: 0, temp: 1, scaled: 1 }); } },
      { label: 'tokens doubled', run: (m) => { setTokens(m, SLIDE_TOKENS.map((p) => [2 * p[0], 2 * p[1]])); Object.assign(m, { query: 0, temp: 1, scaled: 1 }); } },
      { label: 'a far token', run: (m) => { setTokens(m, [[1, 0], [0, 1], [2.4, 2]]); Object.assign(m, { query: 0, temp: 1, scaled: 1 }); } },
      { label: 'two identical keys', run: (m) => { setTokens(m, [[1, 0], [0, 1], [1, 0]]); Object.assign(m, { query: 1, temp: 1, scaled: 1 }); } },
      { label: 'τ small: one-hot', run: (m) => { setTokens(m, SLIDE_TOKENS); Object.assign(m, { query: 2, temp: 0.1, scaled: 1 }); } },
      { label: 'τ large: flat', run: (m) => { setTokens(m, SLIDE_TOKENS); Object.assign(m, { query: 2, temp: 4, scaled: 1 }); } },
    ],
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['Scores', 'Softmax', 'The output'],
    setup(ctx) {
      const at = (x, y, m) => pickToken(m, planeMaps(PLANE_L, 3), x, y);
      showOverlay(ctx, {
        down(x, y) {
          const m = ctx.state();
          const j = at(x, y, m);
          drag = j >= 0 ? { j, moved: false } : null;
        },
        move(x, y) {
          if (!drag) return;
          const m = ctx.state();
          const p = planeMaps(PLANE_L, 3);
          drag.moved = true;
          m[`x${drag.j + 1}`].set(snap01(clamp(p.unX(x), -LIMIT, LIMIT)), snap01(clamp(p.unY(y), -LIMIT, LIMIT)), 0);
          ctx.update();
        },
        up() {
          if (drag && !drag.moved) { ctx.state().query = drag.j; ctx.update(); }
          drag = null;
        },
        hover(x, y) {
          overlayFor(ctx).cv.style.cursor = at(x, y, ctx.state()) >= 0 ? 'grab' : '';
        },
      });
    },
    leave(ctx) { hideOverlay(ctx); },
    run(m) {
      const X = tokenArrays(m, N, 'x', 1);
      const out = A.attend(X, X, I2, I2, WV, m.temp, !!m.scaled);
      const i = m.query;
      const row = A.attendRow(out.Q[i], out.K, out.V, m.temp, !!m.scaled);
      return { X, ...out, i, ...row, spread: A.effectiveCount(row.weights), temperature: m.temp };
    },
    draw(v, m, r, ctx) {
      const ov = overlayFor(ctx);
      ov.painter = (g) => paintQuery(ov, g, m, r);
      ov.repaint();
    },
    panel(host, m, r, ctx) {
      once(host, 'query.one', (h) => {
        h.refreshers.push(segmented(h, 'query token', [[0, 'x1'], [1, 'x2'], [2, 'x3']], () => ctx.state().query, (v) => { ctx.state().query = v; ctx.update(); }));
        h.refreshers.push(segmented(h, 'scores', [[1, 'q·k / √d'], [0, 'q·k']], () => ctx.state().scaled, (v) => { ctx.state().scaled = v; ctx.update(); }));
      });
      host.refreshers.forEach((s) => s());
    },
    panelTitle: 'Query and scores',
    explain(m, r) {
      const j = r.weights.indexOf(Math.max(...r.weights));
      let status;
      if (r.weights[j] >= 0.95) status = { text: `Nearly one-hot: x${j + 1} has ${f(100 * r.weights[j], 0)} percent of the weight, so y is almost its value v${j + 1}.`, tone: 'warn' };
      else if (r.spread >= 0.98 * N) status = { text: 'Nearly equal weights: y is the plain average of the three values.', tone: 'info' };
      else status = { text: `The weight is spread over ${f(r.spread, 1)} of ${N} tokens (exp of the entropy).`, tone: 'ok' };
      const name = `x${r.i + 1}`;
      return {
        rows: [
          `{q|q} = W_q ${name} = ${vt(r.Q[r.i], 2)}, the keys {k|k_j} = W_k x_j = ${r.K.map((k) => vt(k, 1)).join(' ')}`,
          `{s|scores} ${m.scaled ? 'q·k_j / √d' : 'q·k_j'} = ${vt(r.scores, 3)}${m.scaled ? `, {sqrtd|√d} = ${f(Math.sqrt(r.d), 3)}` : ''}`,
          `{a|α} = softmax(scores / {tau|τ}), τ = ${f(m.temp)}: ${vt(r.weights, 3)}`,
          `{v|values} v_j = W_v x_j = ${r.V.map((v) => vt(v, 1)).join(' ')}`,
          `{y|y} = Σ α_j v_j = ${vt(r.y, 3)}`,
        ],
        status,
        values: [['largest score, subtracted', f(r.max, 3), 's'], ['sum of exp(score − max)', f(r.sum, 3), 'a'], ['tokens attended', f(r.spread, 2), 'a'], ['d', String(r.d), 'sqrtd']],
        fact: 'Drag a point in the left plane to move a token; click a point to make it the query. Scores grow with the length of the vectors, so a long key wins weight.',
      };
    },
  };
}

// ================================================================ why divide by the square root of d

export const SPREAD_LOGS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const SPREAD_TRIALS = 48, SPREAD_KEYS = 8, SPREAD_SEED = 12345;
let spreadCache = null;
export function spreadTable() {
  if (!spreadCache) spreadCache = SPREAD_LOGS.map((k) => A.dotSpread(2 ** k, SPREAD_TRIALS, SPREAD_KEYS, SPREAD_SEED));
  return spreadCache;
}

function barPanel(g, rect, title, weights, scores, color, ov, key) {
  g.fillStyle = '#10131a';
  g.fillRect(rect.x, rect.y, rect.w, rect.h);
  g.strokeStyle = '#262a35';
  g.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  text(g, title, rect.x, rect.y - 8, { size: 13, color: '#aab2c5', weight: 600, halo: false });
  const n = weights.length, pitch = rect.w / n, bw = pitch * 0.62;
  for (let j = 0; j < n; j++) {
    const h = weights[j] * (rect.h - 22);
    g.fillStyle = rgba(color, 0.9 * ov.dim(key));
    g.fillRect(rect.x + j * pitch + (pitch - bw) / 2, rect.y + rect.h - h, bw, h);
    if (weights[j] >= 0.06) text(g, f(weights[j], 2), rect.x + j * pitch + pitch / 2, rect.y + rect.h - h - 4, { size: 12, color: '#d6dbe5', align: 'center' });
    const s = scores[j];
    text(g, f(s, Math.abs(s) >= 10 ? 0 : 1), rect.x + j * pitch + pitch / 2, rect.y + rect.h + 15, { size: 12, color: '#79829a', align: 'center', halo: false });
  }
}

function chartPanel(g, rect, title, series, current, yMax, ov, fmt) {
  g.fillStyle = '#10131a';
  g.fillRect(rect.x, rect.y, rect.w, rect.h);
  g.strokeStyle = '#262a35';
  g.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  text(g, title, rect.x, rect.y - 8, { size: 13, color: '#aab2c5', weight: 600, halo: false });
  const X = (k) => rect.x + 14 + (k / 8) * (rect.w - 28);
  const Y = (v) => rect.y + rect.h - 6 - (Math.min(v, yMax) / yMax) * (rect.h - 14);
  for (const t of [0, yMax / 2, yMax]) {
    line(g, rect.x, Y(t), rect.x + rect.w, Y(t), '#1c212c', 1);
    text(g, fmt(t), rect.x + 4, Y(t) - 3, { size: 12, color: '#5c667c', halo: false });
  }
  for (let k = 0; k <= 8; k += 2) text(g, String(2 ** k), X(k), rect.y + rect.h + 15, { size: 12, color: '#79829a', align: 'center', halo: false });
  line(g, X(current), rect.y, X(current), rect.y + rect.h, GOLD, 1.2, 0.9, [4, 3]);
  for (const s of series) {
    g.save();
    g.globalAlpha = ov.dim(s.key);
    g.strokeStyle = s.color;
    g.lineWidth = 2.4;
    g.beginPath();
    s.ys.forEach((v, k) => { if (k === 0) g.moveTo(X(k), Y(v)); else g.lineTo(X(k), Y(v)); });
    g.stroke();
    s.ys.forEach((v, k) => { g.fillStyle = s.color; g.beginPath(); g.arc(X(k), Y(v), 3, 0, 7); g.fill(); });
    g.restore();
    text(g, s.label, X(5.1), Y(s.ys[5]) + (s.below ? 22 : -10), { size: 12.5, color: s.color, weight: 600, alpha: ov.dim(s.key) });
  }
}

function paintScale(ov, g, m, r) {
  const d = r.d;
  text(g, `One query against 8 random keys, d = ${d}`, 6, 18, { size: 13, color: '#c7cdda', weight: 600, halo: false });
  barPanel(g, { x: 6, y: 46, w: 200, h: 110 }, 'weights from q·k', r.weightsRaw, r.raw, '#ffa657', ov, 's');
  barPanel(g, { x: 214, y: 46, w: 200, h: 110 }, 'weights from q·k / √d', r.weightsScaled, r.scaled, '#7ee787', ov, 'a');
  const sp = r.table;
  chartPanel(g, { x: 6, y: 226, w: 200, h: 150 }, 'spread of q·k (std. dev.)', [
    { key: 's', color: '#ffa657', label: 'q·k', ys: sp.map((e) => e.std) },
    { key: 'sqrtd', color: '#7ee787', label: 'q·k / √d', ys: sp.map((e) => e.stdScaled) },
  ], m.logd, 16, ov, (v) => String(Number(v.toFixed(0))));
  chartPanel(g, { x: 214, y: 226, w: 200, h: 150 }, 'largest of the 8 weights', [
    { key: 's', color: '#ffa657', label: 'raw', ys: sp.map((e) => e.best) },
    { key: 'a', color: '#7ee787', label: '÷ √d', ys: sp.map((e) => e.bestScaled), below: true },
  ], m.logd, 1, ov, (v) => String(Number(v.toFixed(1))));
  text(g, 'x axis: dimension d, log scale; gold line: the d chosen', 6, 412, { size: 12, color: '#79829a', halo: false });
  text(g, 'second chart: mean of 48 random draws at each d', 6, 430, { size: 12, color: '#79829a', halo: false });
}

export function scaleView() {
  return {
    id: 'query.scale', topic: 'query', label: 'why √d',
    init: { logd: 6, seed: 3 },
    presets: [
      { label: 'd = 2', set: { logd: 1, seed: 2 } },
      { label: 'd = 64', set: { logd: 6, seed: 3 } },
      { label: 'd = 256', set: { logd: 8, seed: 1 } },
      { label: 'new draw', run: (m) => { m.seed = m.seed + 1; } },
    ],
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['Scores', 'Why divide by the square root of d'],
    setup(ctx) { showOverlay(ctx, {}); },
    leave(ctx) { hideOverlay(ctx); },
    run(m) {
      const d = 2 ** m.logd;
      const draw = A.randomScores(d, SPREAD_KEYS, m.seed);
      const table = spreadTable();
      const here = table[m.logd];
      return { d, ...draw, table, std: here.std, stdScaled: here.stdScaled, best: here.best, bestScaled: here.bestScaled };
    },
    draw(v, m, r, ctx) {
      const ov = overlayFor(ctx);
      ov.painter = (g) => paintScale(ov, g, m, r);
      ov.repaint();
    },
    panel(host, m, r, ctx) {
      once(host, 'query.scale', (h) => {
        h.refreshers.push(segmented(h, 'dimension d', [[0, '1'], [2, '4'], [4, '16'], [6, '64'], [8, '256']], () => ctx.state().logd, (v) => { ctx.state().logd = v; ctx.update(); }));
        btn(el('div', 'lab-btns', h), 'new draw', () => { ctx.state().seed += 1; ctx.update(); });
      });
      host.refreshers.forEach((s) => s());
    },
    panelTitle: 'Dimension',
    explain(m, r) {
      const big = r.best > 0.8;
      return {
        rows: [
          `d = ${r.d}: the spread of {s|q·k} is √d = ${f(Math.sqrt(r.d), 2)} in theory, ${f(r.std, 2)} measured`,
          `{sqrtd|q·k / √d}: spread ${f(r.stdScaled, 2)}`,
          `largest of 8 weights: {s|raw ${f(r.best, 2)}}, {a|divided ${f(r.bestScaled, 2)}} (mean of 48 draws)`,
          `this draw, raw: ${vt(r.weightsRaw, 2)}`,
          `this draw, divided: ${vt(r.weightsScaled, 2)}`,
        ],
        status: big ? { text: `Without the division the softmax is nearly one-hot at d = ${r.d}: one key takes ${f(100 * r.best, 0)} percent of the weight on average, and the others are ignored.`, tone: 'warn' }
          : { text: `At d = ${r.d} the raw scores still leave some choice; the division keeps that true as d grows.`, tone: 'info' },
        fact: 'Each entry of q and k has mean 0 and variance 1, so q·k is a sum of d products and its spread grows as √d. Dividing by √d holds the spread near 1.',
      };
    },
  };
}
