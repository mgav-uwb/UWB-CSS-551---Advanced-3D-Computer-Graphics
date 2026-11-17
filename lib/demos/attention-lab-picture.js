// attention-lab-picture: the last two topics of the attention-lab demo. "cross-attention": twelve patches of a tiny picture are the
// queries, four words are the keys and values, and the words can be dragged. "the cost": an image side and a patch size give n tokens,
// n² scores and the bytes of one score matrix, with one patch's row of weights as a heat map over the picture. run() calls the
// program's own functions (lib/programs/attention-lab/webgl/attentionlab.js).
import * as P from '../programs/attention-lab/webgl/attentionlab.js';
import { I2, snap01, clamp } from './attention-lab-common.js';
import { overlayFor, showOverlay, hideOverlay, drawPlane, planeMaps, clipTo, text, arrow2d, dot, line, rgba, rgb01, TOKEN_COLORS, GOLD, f, vt, n0, bytesText, segmented, once } from './attention-lab-draw.js';

// ================================================================ cross-attention

const COLS = 4, ROWS = 3;
const WORDS = ['sky', 'sun', 'grass', 'dirt'];
const WORD_HEX = [0x79c0ff, 0xffd166, 0x7ee787, 0xc08a5a];
const WORD_CSS = ['#79c0ff', '#ffd166', '#7ee787', '#c08a5a'];
const PIC = { x: 276, y: 44, cw: 35, ch: 35 };
const CPLANE = { x: 6, y: 30, w: 262, h: 262 };
const RANGE = 1.5;
const WLIMIT = 1.4;

let crossCache = null;
function crossData() {
  if (!crossCache) crossCache = { features: P.patchFeatures(COLS, ROWS), colors: P.patchColors(COLS, ROWS) };
  return crossCache;
}

function paintCross(ov, g, m, r) {
  const n = COLS * ROWS;
  // the picture: each patch in its average color, with its weights over the four words as a bar along its foot
  text(g, 'picture, 4 × 3 patches', PIC.x, PIC.y - 9, { size: 12.5, color: '#aab2c5', weight: 600, halo: false });
  for (let p = 0; p < n; p++) {
    const cx = PIC.x + (p % COLS) * PIC.cw, cy = PIC.y + Math.floor(p / COLS) * PIC.ch;
    g.fillStyle = rgb01(r.colors[p]);
    g.fillRect(cx, cy, PIC.cw - 1, PIC.ch - 1);
    let x = cx;
    for (let w = 0; w < WORDS.length; w++) {
      const wd = r.A[p][w] * (PIC.cw - 1);
      g.fillStyle = rgba(WORD_CSS[w], 0.95 * ov.dim('a', `word${w}`));
      g.fillRect(x, cy + PIC.ch - 9, wd, 8);
      x += wd;
    }
    if (p === r.sel) { g.strokeStyle = GOLD; g.lineWidth = 3; g.strokeRect(cx + 1.5, cy + 1.5, PIC.cw - 4, PIC.ch - 4); }
  }
  // the chosen patch's weights
  const sr = Math.floor(r.sel / COLS) + 1, sc = (r.sel % COLS) + 1;
  const ty = PIC.y + ROWS * PIC.ch + 26;
  text(g, `patch ${r.sel + 1}: weights α`, PIC.x, ty, { size: 12.5, color: '#aab2c5', weight: 600, halo: false });
  for (let w = 0; w < WORDS.length; w++) {
    const y = ty + 24 + w * 25;
    const a = ov.dim('a', `word${w}`);
    text(g, WORDS[w], PIC.x, y, { size: 13.5, color: WORD_CSS[w], weight: 700, alpha: a });
    g.fillStyle = rgba(WORD_CSS[w], 0.9 * a);
    g.fillRect(PIC.x + 44, y - 14, Math.max(2, r.weights[w] * 50), 18);
    text(g, f(r.weights[w], 3), PIC.x + 44 + Math.max(2, r.weights[w] * 50) + 5, y, { size: 13, color: '#d6dbe5', weight: 600, alpha: a });
  }
  text(g, `y = Σ α v = ${vt(r.y, 2)}`, CPLANE.x, CPLANE.y + CPLANE.h + 22, { size: 15.5, color: GOLD, weight: 700, alpha: ov.dim('y') });

  // the plane: patch features (their colors), words (diamonds), outputs (rings)
  const pl = drawPlane(g, CPLANE, RANGE, 'patch features, words and outputs');
  clipTo(g, CPLANE);
  const fs = r.f[r.sel];
  for (let w = 0; w < WORDS.length; w++) {
    line(g, pl.X(fs[0]), pl.Y(fs[1]), pl.X(r.words[w][0]), pl.Y(r.words[w][1]), WORD_CSS[w], 1 + 9 * r.weights[w], 0.85 * ov.dim('a', `word${w}`));
  }
  for (let p = 0; p < n; p++) {
    line(g, pl.X(r.f[p][0]), pl.Y(r.f[p][1]), pl.X(r.Y[p][0]), pl.Y(r.Y[p][1]), rgb01(r.colors[p]), 1, 0.4 * ov.dim('y'), [2, 3]);
    dot(g, pl.X(r.Y[p][0]), pl.Y(r.Y[p][1]), 4.5, rgb01(r.colors[p]), { ring: true, alpha: ov.dim('y') });
  }
  for (let p = 0; p < n; p++) dot(g, pl.X(r.f[p][0]), pl.Y(r.f[p][1]), p === r.sel ? 7.5 : 5.5, rgb01(r.colors[p]), { alpha: ov.dim('patch') });
  dot(g, pl.X(fs[0]), pl.Y(fs[1]), 11, GOLD, { ring: true });
  dot(g, pl.X(r.Y[r.sel][0]), pl.Y(r.Y[r.sel][1]), 6, GOLD, { alpha: ov.dim('y') });
  for (let w = 0; w < WORDS.length; w++) {
    const x = pl.X(r.words[w][0]), y = pl.Y(r.words[w][1]);
    g.save();
    g.globalAlpha = ov.dim('word', `word${w}`);
    g.fillStyle = WORD_CSS[w];
    g.strokeStyle = '#0b0c10';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(x, y - 10); g.lineTo(x + 10, y); g.lineTo(x, y + 10); g.lineTo(x - 10, y);
    g.closePath();
    g.fill(); g.stroke();
    g.restore();
  }
  g.restore();
  for (let w = 0; w < WORDS.length; w++) {
    text(g, WORDS[w], pl.X(r.words[w][0]) + 13, pl.Y(r.words[w][1]) + 5, { size: 14, color: WORD_CSS[w], weight: 700, alpha: ov.dim('word', `word${w}`) });
  }
  const ly = CPLANE.y + CPLANE.h + 50;
  text(g, 'dots: patch features, in the patch colors', CPLANE.x, ly, { size: 12, color: '#79829a', halo: false });
  text(g, 'diamonds: words (drag one); rings: outputs', CPLANE.x, ly + 17, { size: 12, color: '#79829a', halo: false });
  text(g, 'lines from the chosen patch: thickness = weight', CPLANE.x, ly + 34, { size: 12, color: '#79829a', halo: false });
}

export function crossView() {
  let drag = null;
  const pickWord = (m, x, y) => {
    const p = planeMaps(CPLANE, RANGE);
    let best = -1, bestD = 18;
    for (let w = 0; w < WORDS.length; w++) {
      const d = Math.hypot(p.X(m[`w${w}`].x) - x, p.Y(m[`w${w}`].y) - y);
      if (d < bestD) { bestD = d; best = w; }
    }
    return best;
  };
  const pickPatch = (x, y) => {
    const c = Math.floor((x - PIC.x) / PIC.cw), rr = Math.floor((y - PIC.y) / PIC.ch);
    return c >= 0 && c < COLS && rr >= 0 && rr < ROWS ? rr * COLS + c : -1;
  };
  const words = P.MATERIAL_FEATURE;
  const setWords = (m, list) => list.forEach((p, w) => m[`w${w}`].set(p[0], p[1], 0));
  return {
    id: 'cross.words', topic: 'cross', label: 'patches ask words', inputTitle: 'Words (drag a diamond, or type)',
    init: { w0: [...words[0], 0], w1: [...words[1], 0], w2: [...words[2], 0], w3: [...words[3], 0], temp: 0.2, sel: 0 },
    handles: WORDS.map((name, w) => ({ id: `w${w}`, label: name, color: WORD_HEX[w], fixed: 'z' })),
    params: [{ id: 'temp', label: 'temperature τ', min: 0.05, max: 2, step: 0.01 }],
    presets: [
      { label: 'captions match', run: (m) => { setWords(m, words); m.temp = 0.2; } },
      { label: 'sky word onto the grass', run: (m) => { setWords(m, [[0.2, -1], words[1], words[2], words[3]]); m.temp = 0.2; } },
      { label: 'sky and sun swapped', run: (m) => { setWords(m, [words[1], words[0], words[2], words[3]]); m.temp = 0.2; } },
      { label: 'all words alike', run: (m) => { setWords(m, [[0.5, 0.5], [0.5, 0.5], [0.5, 0.5], [0.5, 0.5]]); m.temp = 0.2; } },
      { label: 'τ small', run: (m) => { setWords(m, words); m.temp = 0.05; } },
      { label: 'τ large', run: (m) => { setWords(m, words); m.temp = 2; } },
    ],
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['One layer of attention', 'A tiny picture and its patches'],
    setup(ctx) {
      showOverlay(ctx, {
        down(x, y) {
          const m = ctx.state();
          const w = pickWord(m, x, y);
          if (w >= 0) { drag = { w }; return; }
          drag = null;
          const p = pickPatch(x, y);
          if (p >= 0) { m.sel = p; ctx.update(); }
        },
        move(x, y) {
          const m = ctx.state();
          if (drag) {
            const p = planeMaps(CPLANE, RANGE);
            m[`w${drag.w}`].set(snap01(clamp(p.unX(x), -WLIMIT, WLIMIT)), snap01(clamp(p.unY(y), -WLIMIT, WLIMIT)), 0);
            ctx.update();
          } else {
            const p = pickPatch(x, y);
            if (p >= 0 && p !== m.sel) { m.sel = p; ctx.update(); }
          }
        },
        up() { drag = null; },
        hover(x, y) {
          const m = ctx.state();
          overlayFor(ctx).cv.style.cursor = pickWord(m, x, y) >= 0 ? 'grab' : pickPatch(x, y) >= 0 ? 'pointer' : '';
        },
      });
    },
    leave(ctx) { hideOverlay(ctx); },
    run(m) {
      const { features, colors } = crossData();
      const wordArrays = [0, 1, 2, 3].map((w) => [m[`w${w}`].x, m[`w${w}`].y]);
      const out = P.attend(features, wordArrays, I2, I2, I2, m.temp, true);
      const sel = Math.min(m.sel, COLS * ROWS - 1);
      const row = P.attendRow(out.Q[sel], out.K, out.V, m.temp, true);
      return { f: features, colors, words: wordArrays, ...out, sel, ...row, spread: P.effectiveCount(row.weights) };
    },
    draw(v, m, r, ctx) {
      const ov = overlayFor(ctx);
      ov.painter = (g) => paintCross(ov, g, m, r);
      ov.repaint();
    },
    explain(m, r) {
      const best = r.weights.indexOf(Math.max(...r.weights));
      const sr = Math.floor(r.sel / COLS) + 1, sc = (r.sel % COLS) + 1;
      return {
        rows: [
          `{patch|patch ${r.sel + 1}} (row ${sr}, column ${sc}): feature ${vt(r.f[r.sel], 2)}, the query q = W_q f`,
          `{s|scores} against the words (sky, sun, grass, dirt) = ${vt(r.scores, 2)}`,
          `{a|α} = softmax(scores / {tau|τ}), τ = ${f(m.temp)}: ${vt(r.weights, 3)}`,
          `{y|y} = Σ α v = ${vt(r.y, 3)}, with W_v = I, so v is the word's own vector`,
        ],
        status: { text: `Patch ${r.sel + 1} attends mostly to "${WORDS[best]}" (${f(100 * r.weights[best], 0)} percent), so its output sits near that word.`, tone: 'ok' },
        values: [['patches (queries)', String(COLS * ROWS), 'patch'], ['words (keys, values)', String(WORDS.length), 'word'], ['scores', `${COLS * ROWS} × ${WORDS.length} = ${COLS * ROWS * WORDS.length}`, 's'], ['tokens attended', f(r.spread, 2), 'a']],
        fact: 'Queries come from the image, keys and values from the caption. Drag a word and every patch that attends to it moves its output with it.',
      };
    },
  };
}

// ================================================================ the cost

const SIDES = [128, 256, 512, 1024];
const PATCHES = [8, 16, 32, 64];
const PICBOX = { x: 6, y: 34, s: 250 };
const GAIN = 3;
let sceneCanvas = null;
const featureCache = new Map();

function sceneImage() {
  if (sceneCanvas) return sceneCanvas;
  const n = 160;
  const cv = document.createElement('canvas');
  cv.width = n; cv.height = n;
  const g = cv.getContext('2d');
  const img = g.createImageData(n, n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const c = P.sceneColor((i + 0.5) / n, (j + 0.5) / n);
      const o = (j * n + i) * 4;
      img.data[o] = c[0] * 255; img.data[o + 1] = c[1] * 255; img.data[o + 2] = c[2] * 255; img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  sceneCanvas = cv;
  return cv;
}

function featuresFor(grid) {
  if (!featureCache.has(grid)) {
    if (featureCache.size > 2) featureCache.clear();
    featureCache.set(grid, P.patchFeatures(grid, grid));
  }
  return featureCache.get(grid);
}

/** the weights as an image, one pixel per patch, gold where the patch is looked at */
function heatImage(weights, grid) {
  const cv = document.createElement('canvas');
  cv.width = grid; cv.height = grid;
  const g = cv.getContext('2d');
  const img = g.createImageData(grid, grid);
  let top = 0;
  for (const w of weights) top = Math.max(top, w);
  for (let i = 0; i < grid * grid; i++) {
    const t = Math.pow(weights[i] / top, 0.7);
    img.data[4 * i] = 255; img.data[4 * i + 1] = 209; img.data[4 * i + 2] = 102; img.data[4 * i + 3] = Math.round(170 * t);
  }
  g.putImageData(img, 0, 0);
  return cv;
}

function paintCost(ov, g, m, r) {
  const { x, y, s } = PICBOX;
  const grid = r.grid;
  text(g, `${m.side}² px in ${m.patch}² px patches: a ${grid} × ${grid} grid`, x, y - 9, { size: 12.5, color: '#aab2c5', weight: 600, halo: false });
  g.imageSmoothingEnabled = true;
  g.drawImage(sceneImage(), x, y, s, s);
  g.globalAlpha = ov.dim('a');
  g.imageSmoothingEnabled = false;
  g.drawImage(r.heat, x, y, s, s);
  g.globalAlpha = 1;
  g.imageSmoothingEnabled = true;
  if (grid <= 32) {
    g.strokeStyle = 'rgba(11, 12, 16, 0.45)';
    g.lineWidth = 1;
    for (let i = 1; i < grid; i++) {
      g.beginPath(); g.moveTo(x + (i * s) / grid, y); g.lineTo(x + (i * s) / grid, y + s); g.stroke();
      g.beginPath(); g.moveTo(x, y + (i * s) / grid); g.lineTo(x + s, y + (i * s) / grid); g.stroke();
    }
  }
  const sc = r.sel % grid, sr = Math.floor(r.sel / grid), cell = s / grid;
  g.strokeStyle = '#ffffff';
  g.lineWidth = 2.5;
  g.strokeRect(x + sc * cell - Math.max(0, 5 - cell) / 2, y + sr * cell - Math.max(0, 5 - cell) / 2, Math.max(cell, 5), Math.max(cell, 5));
  text(g, 'white square: the chosen patch; gold: its weights', x, y + s + 17, { size: 12, color: '#79829a', halo: false });

  // the counts
  const cx = 266;
  const big = (label, value, sub, key, top) => {
    text(g, label, cx, top, { size: 12, color: '#79829a', halo: false });
    text(g, value, cx, top + 27, { size: 23, color: '#ffd166', weight: 700, alpha: ov.dim(key) });
    if (sub) text(g, sub, cx, top + 45, { size: 12, color: '#8b93a7', halo: false });
  };
  big('tokens n', n0(r.n), `(side / patch)² = ${grid} × ${grid}`, 'n', 40);
  big('scores n²', n0(r.scores), 'per head per layer', 'n2', 102);
  big('one score matrix', bytesText(r.bytes), '4 bytes a score', 'mem', 164);
  text(g, 'the chosen patch looks', cx, 232, { size: 12, color: '#79829a', halo: false });
  text(g, `at ${n0(r.spread)} of ${n0(r.n)} patches`, cx, 249, { size: 13, color: '#d6dbe5', weight: 600, alpha: ov.dim('a') });
  text(g, `double the side: 4 × the tokens, ${r.ratio} × the scores`, 6, y + s + 42, { size: 13, color: '#ff7b72', weight: 700, alpha: ov.dim('n2') });

  // n² against the side, for this patch size
  const by = 380, bh = 58;
  text(g, `scores n² against image side, ${m.patch} px patches (log scale)`, 6, by - 18, { size: 12.5, color: '#aab2c5', weight: 600, halo: false });
  r.sides.forEach((c, i) => {
    const bx = 16 + i * 100, h = Math.max(2, (Math.log10(c.scores) / 9) * bh);
    const on = SIDES[i] === m.side;
    g.fillStyle = on ? GOLD : '#34405a';
    g.globalAlpha = ov.dim('n2');
    g.fillRect(bx, by + bh - h, 68, h);
    g.globalAlpha = 1;
    text(g, n0(c.scores), bx + 34, by + bh - h - 4, { size: 12, color: on ? GOLD : '#aab2c5', align: 'center', weight: on ? 700 : 500 });
    text(g, `${SIDES[i]} px`, bx + 34, by + bh + 15, { size: 12, color: on ? '#e7eaf0' : '#79829a', align: 'center', halo: false });
    text(g, `n = ${n0(c.n)}`, bx + 34, by + bh + 31, { size: 12, color: on ? '#e7eaf0' : '#79829a', align: 'center', halo: false });
    if (i < r.sides.length - 1) text(g, `× ${c.ratio}`, bx + 84, by + bh - 6, { size: 12.5, color: '#ff7b72', align: 'center', weight: 700 });
  });
}

export function costView() {
  const pick = (m, x, y) => {
    const { x: px, y: py, s } = PICBOX;
    if (x < px || x >= px + s || y < py || y >= py + s) return false;
    m.u = (x - px) / s;
    m.v = (y - py) / s;
    return true;
  };
  return {
    id: 'cost.size', topic: 'cost', label: 'n and n²',
    init: { side: 512, patch: 16, u: 0.2, v: 0.2, temp: 1 },
    params: [{ id: 'temp', label: 'temperature τ', min: 0.05, max: 4, step: 0.01 }],
    presets: [
      { label: 'n = 256', set: { side: 256, patch: 16 } },
      { label: 'n = 1,024', set: { side: 512, patch: 16 } },
      { label: 'n = 4,096', set: { side: 1024, patch: 16 } },
      { label: '512², patch 8', set: { side: 512, patch: 8 } },
      { label: '512², patch 64', set: { side: 512, patch: 64 } },
    ],
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['The cost', 'A tiny picture and its patches'],
    setup(ctx) {
      showOverlay(ctx, {
        down(x, y) { if (pick(ctx.state(), x, y)) ctx.update(); },
        move(x, y) { if (pick(ctx.state(), x, y)) ctx.update(); },
        hover(x, y) {
          const { x: px, y: py, s } = PICBOX;
          overlayFor(ctx).cv.style.cursor = x >= px && x < px + s && y >= py && y < py + s ? 'crosshair' : '';
        },
      });
    },
    leave(ctx) { hideOverlay(ctx); },
    run(m) {
      const cost = P.attentionCost(m.side, m.patch);
      const grid = cost.grid;
      const features = featuresFor(grid);
      const col = Math.min(grid - 1, Math.floor(m.u * grid)), row = Math.min(grid - 1, Math.floor(m.v * grid));
      const selected = row * grid + col;
      const patch = P.patchRow(features, selected, GAIN, m.temp);
      const sides = SIDES.map((side) => P.attentionCost(side, m.patch));
      return { ...cost, sel: selected, selected, gain: GAIN, ...patch, sides, side: m.side, patch: m.patch };
    },
    draw(v, m, r, ctx) {
      const ov = overlayFor(ctx);
      const heat = heatImage(r.weights, r.grid);
      ov.painter = (g) => paintCost(ov, g, m, { ...r, heat });
      ov.repaint();
    },
    panel(host, m, r, ctx) {
      once(host, 'cost.size', (h) => {
        h.refreshers.push(segmented(h, 'image side, px', SIDES.map((s) => [s, String(s)]), () => ctx.state().side, (v) => { ctx.state().side = v; ctx.update(); }));
        h.refreshers.push(segmented(h, 'patch side, px', PATCHES.map((s) => [s, String(s)]), () => ctx.state().patch, (v) => { ctx.state().patch = v; ctx.update(); }));
      });
      host.refreshers.forEach((s) => s());
    },
    panelTitle: 'Image and patches',
    explain(m, r) {
      const quarter = P.attentionCost(m.side / 2, m.patch);
      return {
        rows: [
          `{grid|grid} = side / patch = ${m.side} / ${m.patch} = ${r.grid}, so {n|n} = ${r.grid}² = ${n0(r.n)} tokens`,
          `{n2|scores} = n² = ${n0(r.scores)} per head per layer`,
          `{mem|one score matrix} = ${n0(r.scores)} × 4 bytes = ${bytesText(r.bytes)}`,
          `the chosen patch's row: {a|${n0(r.n)} weights}, the largest ${f(r.best, 4)}, spread over ${n0(r.spread)} patches`,
        ],
        status: { text: `Doubling the side to ${2 * m.side} px makes ${n0(4 * r.n)} tokens and ${n0(16 * r.scores)} scores: × ${r.ratio}.`, tone: 'info' },
        values: [['tokens n', n0(r.n), 'n'], ['scores n²', n0(r.scores), 'n2'], ['score matrix', bytesText(r.bytes), 'mem'], ['at half the side', `${n0(quarter.scores)} scores`, 'n2']],
        fact: 'A convolution costs in proportion to the pixels; attention costs in proportion to the pixels squared. That is why image transformers work on patches or on a compressed latent.',
      };
    },
  };
}
