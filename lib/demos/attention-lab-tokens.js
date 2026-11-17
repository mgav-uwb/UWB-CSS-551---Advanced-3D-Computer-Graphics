// attention-lab-tokens: the second topic of the attention-lab demo. "n x n": every token attends to every token, the weights as a
// grid, with W_k turned and stretched, tokens added and removed. "order": the same tokens in two orders, with and without a positional
// encoding. The two views share their values (a lab view group). run() calls the program's own functions
// (lib/programs/attention-lab/webgl/attentionlab.js).
import * as P from '../programs/attention-lab/webgl/attentionlab.js';
import { I2, WV, SLIDE_TOKENS, TOKEN_HEX, tokenArrays, rangeFor, snap01, clamp } from './attention-lab-common.js';
import { overlayFor, showOverlay, hideOverlay, drawPlane, planeMaps, clipTo, text, arrow2d, dot, line, rgba, heat, heatText, TOKEN_COLORS, GOLD, f, vt, segmented, btn, once, el } from './attention-lab-draw.js';

const MAX_TOKENS = 8;
const LIMIT = 2.9;
const PLANE = { x: 6, y: 30, w: 200, h: 200 };
const OUT_PLANE = { x: 6, y: 290, w: 190, h: 190 };

/** the values both views hold: up to 8 tokens (the first n are in use), W_k as an angle and a scale, the softmax temperature, the
 *  positional-encoding amplitude and the second order */
export const ALL_INIT = {
  t0: [1, 0, 0], t1: [0, 1, 0], t2: [1, 1, 0], t3: [-1, 0.5, 0], t4: [-1.5, -1, 0], t5: [0.5, -1.5, 0], t6: [2, -0.5, 0], t7: [-0.5, 2, 0],
  n: 3, angle: 0, gain: 1, temp: 1, sel: 2, pos: 0, order: 'reverse',
};

function setAll(m, positions, extra) {
  Object.assign(m, { n: positions.length, angle: 0, gain: 1, temp: 1, pos: 0 }, extra);
  positions.forEach((p, i) => m[`t${i}`].set(p[0], p[1], 0));
  m.sel = Math.min(m.sel, positions.length - 1);
}

const TWO_CLUSTERS = [[1.6, 1.2], [1.9, 0.8], [1.3, 1.7], [-1.6, -1.2], [-1.9, -0.8], [-1.3, -1.7]];
const SIX = [0, 1, 2, 3, 4, 5].map((i) => [Number((2 * Math.cos((i * Math.PI) / 3 + 0.3)).toFixed(1)), Number((2 * Math.sin((i * Math.PI) / 3 + 0.3)).toFixed(1))]);
const FOUR = [...SLIDE_TOKENS, [-1, 0.5]];

export function orderOf(kind, n) {
  const order = [];
  for (let i = 0; i < n; i++) order.push(i);
  if (kind === 'reverse') return order.reverse();
  if (kind === 'swap' && n > 1) { order[0] = 1; order[1] = 0; return order; }
  if (kind === 'rotate') return order.map((_, i) => (i + 1) % n);
  return order;
}

function wkOf(m) {
  return P.turned((m.angle * Math.PI) / 180, m.gain);
}

// ================================================================ the n x n weights

function layoutGrid(n) {
  const cs = n <= 4 ? 46 : n <= 6 ? 31 : 23;
  return { cs, x0: 414 - n * cs, y0: 48 };
}

function paintGrid(ov, g, m, r) {
  const n = r.n;
  const range = 3;
  const pl = drawPlane(g, PLANE, range, 'tokens x, keys k');
  clipTo(g, PLANE);
  const sel = r.sel;
  const q = r.Q[sel];
  arrow2d(g, pl.X(0), pl.Y(0), pl.X(q[0]), pl.Y(q[1]), GOLD, 3, 9, 0.6 * ov.dim('q'));
  for (let j = 0; j < n; j++) {
    const x = r.X[j], k = r.K[j];
    if (Math.hypot(x[0] - k[0], x[1] - k[1]) > 0.05) {
      line(g, pl.X(x[0]), pl.Y(x[1]), pl.X(k[0]), pl.Y(k[1]), TOKEN_COLORS[j], 1.2, 0.5 * ov.dim('wk'), [3, 3]);
      dot(g, pl.X(k[0]), pl.Y(k[1]), 5.5, TOKEN_COLORS[j], { ring: true, alpha: ov.dim('wk') });
    }
  }
  for (let j = 0; j < n; j++) dot(g, pl.X(r.X[j][0]), pl.Y(r.X[j][1]), j === sel ? 8 : 6.5, TOKEN_COLORS[j]);
  dot(g, pl.X(r.X[sel][0]), pl.Y(r.X[sel][1]), 11, GOLD, { ring: true });
  g.restore();
  for (let j = 0; j < n; j++) text(g, String(j + 1), pl.X(r.X[j][0]) + 10, pl.Y(r.X[j][1]) - 8, { size: 13.5, color: TOKEN_COLORS[j], weight: 700 });
  if (r.hasKeys) text(g, 'ring: the key k = W_k x', PLANE.x + 2, PLANE.y + PLANE.h + 17, { size: 12, color: '#79829a', halo: false });

  // the n x n weights
  const { cs, x0, y0 } = layoutGrid(n);
  text(g, 'weights α, row i = query i', 214, 20, { size: 12.5, color: '#aab2c5', weight: 600, halo: false });
  const showNumbers = cs >= 31;
  for (let i = 0; i < n; i++) {
    dot(g, x0 - 11, y0 + i * cs + cs / 2, 7, TOKEN_COLORS[i]);
    text(g, String(i + 1), x0 - 11, y0 + i * cs + cs / 2 + 4.5, { size: 11, color: '#0b0c10', align: 'center', weight: 700, halo: false });
    text(g, String(i + 1), x0 + i * cs + cs / 2, y0 - 8, { size: 13, color: TOKEN_COLORS[i], align: 'center', weight: 700, halo: false });
    for (let j = 0; j < n; j++) {
      const a = r.A[i][j];
      g.fillStyle = heat(a);
      g.globalAlpha = ov.dim('a');
      g.fillRect(x0 + j * cs + 1, y0 + i * cs + 1, cs - 2, cs - 2);
      g.globalAlpha = 1;
      if (showNumbers) text(g, f(a, 2), x0 + j * cs + cs / 2, y0 + i * cs + cs / 2 + 4.5, { size: 12, color: heatText(a), align: 'center', halo: false, weight: 600 });
    }
  }
  g.strokeStyle = GOLD;
  g.lineWidth = 2;
  g.strokeRect(x0 + 0.5, y0 + sel * cs + 0.5, n * cs - 1, cs - 1);
  text(g, 'column j: the token looked at', 214, y0 + n * cs + 17, { size: 12, color: '#79829a', halo: false });

  // the outputs
  const outRange = rangeFor([r.V, r.Y], 2);
  const po = drawPlane(g, OUT_PLANE, outRange, 'values v (rings), outputs y');
  clipTo(g, OUT_PLANE);
  for (let j = 0; j < n; j++) dot(g, po.X(r.V[j][0]), po.Y(r.V[j][1]), 5, TOKEN_COLORS[j], { ring: true, alpha: 0.55 * ov.dim('v') });
  for (let j = 0; j < n; j++) {
    line(g, po.X(r.V[j][0]), po.Y(r.V[j][1]), po.X(r.Y[j][0]), po.Y(r.Y[j][1]), TOKEN_COLORS[j], 1, 0.4 * ov.dim('y'), [2, 3]);
    dot(g, po.X(r.Y[j][0]), po.Y(r.Y[j][1]), j === sel ? 8 : 6, TOKEN_COLORS[j], { alpha: ov.dim('y') });
  }
  dot(g, po.X(r.Y[sel][0]), po.Y(r.Y[sel][1]), 10.5, GOLD, { ring: true });
  g.restore();

  // each token's output and how many tokens it looks at
  text(g, 'y_i, and tokens looked at', 206, 300, { size: 12.5, color: '#aab2c5', weight: 600, halo: false });
  for (let i = 0; i < n; i++) {
    const y = 324 + i * 18;
    dot(g, 212, y - 4.5, 5.5, TOKEN_COLORS[i]);
    text(g, `y${i + 1} = ${vt(r.Y[i], 2)}`, 222, y, { size: 12.5, color: i === sel ? GOLD : '#d6dbe5', weight: i === sel ? 700 : 500, alpha: ov.dim('y') });
    text(g, `${f(r.spreads[i], 1)} of ${n}`, 358, y, { size: 12.5, color: i === sel ? GOLD : '#8b93a7', alpha: ov.dim('a') });
  }
}

function pickGrid(m, n, x, y) {
  const p = planeMaps(PLANE, 3);
  let best = -1, bestD = 16;
  for (let j = 0; j < n; j++) {
    const d = Math.hypot(p.X(m[`t${j}`].x) - x, p.Y(m[`t${j}`].y) - y);
    if (d < bestD) { bestD = d; best = j; }
  }
  return best;
}

export function gridView() {
  let drag = null;
  return {
    id: 'all.grid', topic: 'all', label: 'n × n weights', group: 'all', inputTitle: 'Keys and softmax',
    init: ALL_INIT,
    params: [
      { id: 'angle', label: 'W_k turn', min: -180, max: 180, step: 1, unit: '°', play: true },
      { id: 'gain', label: 'W_k scale', min: 0, max: 3, step: 0.05 },
      { id: 'temp', label: 'temperature τ', min: 0.05, max: 4, step: 0.01 },
    ],
    presets: [
      { label: 'the slide\'s three', run: (m) => setAll(m, SLIDE_TOKENS, {}) },
      { label: 'six tokens', run: (m) => setAll(m, SIX, {}) },
      { label: 'two clusters', run: (m) => setAll(m, TWO_CLUSTERS, {}) },
      { label: 'W_k turned 90°', run: (m) => setAll(m, SLIDE_TOKENS, { angle: 90 }) },
      { label: 'W_k scale 0', run: (m) => setAll(m, SLIDE_TOKENS, { gain: 0 }) },
      { label: 'W_k scale 2', run: (m) => setAll(m, SLIDE_TOKENS, { gain: 2 }) },
    ],
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['Vectors and matrices', 'One layer of attention'],
    setup(ctx) {
      showOverlay(ctx, {
        down(x, y) {
          const m = ctx.state();
          const j = pickGrid(m, m.n, x, y);
          if (j >= 0) { drag = { j, moved: false }; return; }
          drag = null;
          const { cs, x0, y0 } = layoutGrid(m.n);
          const row = Math.floor((y - y0) / cs);
          if (x >= x0 - 22 && x <= x0 + m.n * cs && row >= 0 && row < m.n) { m.sel = row; ctx.update(); }
        },
        move(x, y) {
          if (!drag) return;
          const m = ctx.state(), p = planeMaps(PLANE, 3);
          drag.moved = true;
          m[`t${drag.j}`].set(snap01(clamp(p.unX(x), -LIMIT, LIMIT)), snap01(clamp(p.unY(y), -LIMIT, LIMIT)), 0);
          ctx.update();
        },
        up() {
          if (drag && !drag.moved) { ctx.state().sel = drag.j; ctx.update(); }
          drag = null;
        },
        hover(x, y) {
          const m = ctx.state();
          overlayFor(ctx).cv.style.cursor = pickGrid(m, m.n, x, y) >= 0 ? 'grab' : '';
        },
      });
    },
    leave(ctx) { hideOverlay(ctx); },
    run(m) {
      const n = m.n;
      const X = tokenArrays(m, n);
      const Wk = wkOf(m);
      const out = P.attend(X, X, I2, Wk, WV, m.temp, true);
      const sel = Math.min(m.sel, n - 1);
      const row = P.attendRow(out.Q[sel], out.K, out.V, m.temp, true);
      const spreads = out.A.map((a) => P.effectiveCount(a));
      let hasKeys = false;
      for (let j = 0; j < n; j++) if (Math.hypot(X[j][0] - out.K[j][0], X[j][1] - out.K[j][1]) > 0.05) hasKeys = true;
      return { X, n, ...out, sel, ...row, spreads, hasKeys, c: Wk[0][0], s: Wk[1][0], Wk };
    },
    draw(v, m, r, ctx) {
      const ov = overlayFor(ctx);
      ov.painter = (g) => paintGrid(ov, g, m, r);
      ov.repaint();
    },
    panel(host, m, r, ctx) {
      once(host, 'all.grid', (h) => {
        const row = el('div', 'lab-btns', h);
        btn(row, 'add a token', () => { const s = ctx.state(); s.n = Math.min(MAX_TOKENS, s.n + 1); ctx.update(); });
        btn(row, 'remove the last', () => { const s = ctx.state(); s.n = Math.max(2, s.n - 1); ctx.update(); });
        h.count = el('div', 'lab-note', h);
      });
      host.count.textContent = `${m.n} tokens, ${m.n * m.n} scores`;
    },
    panelTitle: 'Tokens',
    explain(m, r) {
      const n = r.n;
      const flat = r.spreads.every((s) => s > 0.98 * n);
      return {
        rows: [
          `n = ${n} tokens: {n|${n * n} scores}, one weight for every pair, each row summing to 1`,
          `{wk|W_k} = ${f(m.gain, 2)} × a turn of ${f(m.angle, 0)}° = [${f(r.Wk[0][0], 2)} ${f(r.Wk[0][1], 2)}; ${f(r.Wk[1][0], 2)} ${f(r.Wk[1][1], 2)}], W_q = I, W_v = [0.5 1; 1 0.5]`,
          `row ${r.sel + 1}: {s|scores} ${vt(r.scores, 2)}`,
          `row ${r.sel + 1}: {a|α} = softmax(scores / {tau|τ}) = ${vt(r.weights, 3)}`,
          `row ${r.sel + 1}: {y|y${r.sel + 1}} = ${vt(r.y, 3)}`,
        ],
        status: flat ? { text: 'Every weight is equal: the outputs are all the average of the values. The weights come from W_k and the data; with no match to prefer, attention averages.', tone: 'info' }
          : { text: `Row ${r.sel + 1} looks at ${f(r.spreads[r.sel], 1)} of ${n} tokens. Turn or stretch W_k, or drag a token, and the weights move.`, tone: 'ok' },
        fact: 'Click a token or a row to choose the query. W_k turned by 90° sends the key of token 1 from (1, 0) to (0, 1), so the query of token 2 now matches it.',
      };
    },
  };
}

// ================================================================ order and position

function slotLayout(n) {
  const sw = Math.min(80, 408 / n);
  return { sw, x0: (420 - n * sw) / 2, sz: Math.min(60, sw - 12) };
}

function paintRow(ov, g, y0, title, ids, Y, range, lay, pos) {
  const n = ids.length;
  text(g, title, 6, y0 - 10, { size: 12.5, color: '#aab2c5', weight: 600, halo: false });
  ids.forEach((id, i) => {
    const cx = lay.x0 + i * lay.sw + lay.sw / 2;
    g.fillStyle = '#10131a';
    g.fillRect(lay.x0 + i * lay.sw + 2, y0, lay.sw - 4, 26 + lay.sz + 36);
    dot(g, cx, y0 + 13, 8, TOKEN_COLORS[id]);
    text(g, String(id + 1), cx, y0 + 17.5, { size: 11.5, color: '#0b0c10', align: 'center', weight: 700, halo: false });
    const rect = { x: cx - lay.sz / 2, y: y0 + 26, w: lay.sz, h: lay.sz };
    g.strokeStyle = '#262a35';
    g.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
    const pm = planeMaps(rect, range);
    line(g, rect.x, pm.Y(0), rect.x + rect.w, pm.Y(0), '#262a35', 1);
    line(g, pm.X(0), rect.y, pm.X(0), rect.y + rect.h, '#262a35', 1);
    clipTo(g, rect);
    arrow2d(g, pm.X(0), pm.Y(0), pm.X(Y[i][0]), pm.Y(Y[i][1]), TOKEN_COLORS[id], 2.6, 8, ov.dim('y', 'order'));
    g.restore();
    text(g, f(Y[i][0], 2), cx, y0 + 26 + lay.sz + 14, { size: 12.5, color: '#d6dbe5', align: 'center', halo: false, alpha: ov.dim('y', 'order') });
    text(g, f(Y[i][1], 2), cx, y0 + 26 + lay.sz + 29, { size: 12.5, color: '#d6dbe5', align: 'center', halo: false, alpha: ov.dim('y', 'order') });
  });
}

function paintOrder(ov, g, m, r) {
  const n = r.n, lay = slotLayout(n);
  const range = rangeFor([r.base.Y, r.perm.Y], 2);
  const rowH = 26 + lay.sz + 36, yA = 40, yB = yA + rowH + 62;
  paintRow(ov, g, yA, `order A: tokens ${r.idsA.map((i) => i + 1).join(', ')} (output y below)`, r.idsA, r.base.Y, range, lay, m.pos);
  paintRow(ov, g, yB, '', r.idsB, r.perm.Y, range, lay, m.pos);
  text(g, `order B: tokens ${r.idsB.map((i) => i + 1).join(', ')}`, 6, yB + rowH + 15, { size: 12.5, color: '#aab2c5', weight: 600, halo: false });
  // each token's output travels from its slot in A to its slot in B
  r.idsA.forEach((id, i) => {
    const j = r.idsB.indexOf(id);
    const xa = lay.x0 + i * lay.sw + lay.sw / 2, xb = lay.x0 + j * lay.sw + lay.sw / 2;
    g.save();
    g.globalAlpha = 0.85 * ov.dim('order', 'change');
    g.strokeStyle = TOKEN_COLORS[id];
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(xa, yA + rowH + 2);
    g.bezierCurveTo(xa, yA + rowH + 30, xb, yB - 30, xb, yB - 2);
    g.stroke();
    g.restore();
  });
  const same = r.change < 1e-6;
  const tone = same ? '#7ee787' : '#ff8d85';
  text(g, "largest change in any token's output", 6, yB + rowH + 44, { size: 14, color: tone, weight: 700, alpha: ov.dim('change') });
  text(g, `between the two orders: ${f(r.change, same ? 4 : 3)}`, 6, yB + rowH + 64, { size: 14, color: tone, weight: 700, alpha: ov.dim('change') });
  text(g, m.pos > 0 ? `slot i gets x + a (sin i, cos i), a = ${f(m.pos)}:` : 'no positional encoding:', 6, yB + rowH + 88, { size: 12.5, color: '#aab2c5', alpha: ov.dim('pos') });
  text(g, m.pos > 0 ? 'a token in another slot is a different input' : 'a token\'s output does not depend on its slot', 6, yB + rowH + 106, { size: 12.5, color: '#aab2c5', alpha: ov.dim('pos') });
}

export function orderView() {
  return {
    id: 'all.order', topic: 'all', label: 'order', group: 'all', inputTitle: 'Positions and softmax',
    init: ALL_INIT,
    params: [
      { id: 'pos', label: 'position code a', min: 0, max: 2, step: 0.05, play: true },
      { id: 'temp', label: 'temperature τ', min: 0.05, max: 4, step: 0.01 },
    ],
    presets: [
      { label: 'no positions', run: (m) => { m.pos = 0; } },
      { label: 'add positions', run: (m) => { m.pos = 1; } },
      { label: 'four tokens', run: (m) => setAll(m, FOUR, {}) },
      { label: 'six tokens', run: (m) => setAll(m, SIX, {}) },
    ],
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['Order and position'],
    setup(ctx) { showOverlay(ctx, {}); },
    leave(ctx) { hideOverlay(ctx); },
    enter(m) { if (m.n < 4) m.n = 4; },
    run(m) {
      const n = m.n;
      const X = tokenArrays(m, n);
      const idsA = X.map((_, i) => i);
      const order = orderOf(m.order, n);
      const withPositions = P.addPositions(X, m.pos);
      const base = P.attend(withPositions, withPositions, I2, I2, WV, m.temp, true);
      const permuted = P.permute(X, order);
      const permutedWithPositions = P.addPositions(permuted, m.pos);
      const perm = P.attend(permutedWithPositions, permutedWithPositions, I2, I2, WV, m.temp, true);
      const change = P.orderChange(base.Y, perm.Y, order);
      return { X, n, order, idsA, idsB: order, shifted: withPositions, arranged: permuted, base, permutedWithPositions, perm, change, amplitude: m.pos };
    },
    draw(v, m, r, ctx) {
      const ov = overlayFor(ctx);
      ov.painter = (g) => paintOrder(ov, g, m, r);
      ov.repaint();
    },
    panel(host, m, r, ctx) {
      once(host, 'all.order', (h) => {
        h.refreshers.push(segmented(h, 'order B', [['reverse', 'reversed'], ['swap', 'first two swapped'], ['rotate', 'rotated by one']], () => ctx.state().order, (v) => { ctx.state().order = v; ctx.update(); }));
        const row = el('div', 'lab-btns', h);
        btn(row, 'add a token', () => { const s = ctx.state(); s.n = Math.min(MAX_TOKENS, s.n + 1); ctx.update(); });
        btn(row, 'remove the last', () => { const s = ctx.state(); s.n = Math.max(4, s.n - 1); ctx.update(); });
      });
      host.refreshers.forEach((s) => s());
    },
    panelTitle: 'Order',
    explain(m, r) {
      const same = r.change < 1e-6;
      return {
        rows: [
          `{order|order B} (token in each slot): ${r.idsB.map((i) => i + 1).join(', ')}`,
          `{pos|position code}: slot i gets x + a (sin i, cos i), a = ${f(m.pos)}`,
          `{change|largest change} of any token's output between A and B: ${f(r.change, 4)}`,
        ],
        status: same ? { text: 'Every token has the same output in both orders, only in a different slot. Attention alone does not see order.', tone: 'ok' }
          : { text: 'The outputs changed: with the position code added, the same token in a different slot is a different input.', tone: 'warn' },
        values: [['tokens', String(r.n), 'order'], ['a', f(m.pos), 'pos']],
        fact: 'Sines and cosines of the position are added to each token before the attention layer, so that order survives; the code the denoiser uses for the time t is the same idea.',
      };
    },
  };
}
