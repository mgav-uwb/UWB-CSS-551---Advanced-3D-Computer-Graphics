// tex-lab-views: the catalog behind the tex-lab demo (runtime: lib/core/lab.js). Each view is one relationship in texture sampling.
// run() calls the program's own functions (lib/programs/tex-lab/webgl/texlab.js), so the numbers in the picture, the formulas and
// beside the code are that code's output. The pictures are canvases over the scene (tex-lab-draw.js) except the cube map and the
// shadow map, which are 3D with a draggable handle.
import * as T from '../programs/tex-lab/webgl/texlab.js';
import { COL, V, css } from '../core/lab-viz.js';
import {
  getTexture, textureChoices, overlayFor, text, arrow2d, fitRect, el, btn, segmented, once, panelCanvas, gray,
  FLOOR_W, FLOOR_H, FLOOR_SIZES, renderFloor, paintFloor, pixelAt, paintLevelLegend,
} from './tex-lab-draw.js';

// ---------------------------------------------------------------- text

const clean = (x, d) => { const s = x.toFixed(d); return Number(s) === 0 ? (0).toFixed(d) : s; };
export const f = (x, d = 2) => (Number.isFinite(x) ? clean(x, d).replace('-', '−') : 'none');
const f3 = (x) => f(x, 3);
const vt = (a) => `(${a.map((x) => String(Number(clean(x, 3))).replace('-', '−')).join(', ')})`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const ordinal = (k) => (k === 0 ? 'texel' : `level-${k} texel`);

export const TOPICS = [
  { id: 'lookup', label: 'Lookup' }, { id: 'regimes', label: 'Regimes' }, { id: 'mip', label: 'Mipmap' },
  { id: 'aniso', label: 'Aniso' }, { id: 'cube', label: 'Cube map' }, { id: 'shadow', label: 'Shadow' },
];

const C_T00 = COL.a, C_T10 = COL.b, C_T01 = COL.c, C_T11 = COL.amber;
export const KEYS = {
  u: COL.gold, v: COL.gold, wu: COL.gold, wv: COL.gold, x: COL.cyan, y: COL.cyan, fx: COL.cyan, fy: COL.cyan,
  t00: C_T00, t10: C_T10, t01: C_T01, t11: C_T11, w00: C_T00, w10: C_T10, w01: C_T01, w11: C_T11, rowLow: COL.purple, rowHigh: COL.purple,
  value: COL.green, nearest: COL.a, bilinear: COL.green, i: COL.a, j: COL.a, mode: COL.pink,
  dudx: COL.a, dvdx: COL.a, dudy: COL.b, dvdy: COL.b, footprintX: COL.a, footprintY: COL.b, rho: COL.gold, lambda: COL.gold,
  lower: COL.b, upper: COL.purple, blend: COL.amber, valueLower: COL.b, valueUpper: COL.purple, ratio: COL.amber, taps: COL.cyan,
  shorter: COL.cyan, longer: COL.gold, isoLambda: COL.gold, trilinear: COL.b, aniso: COL.green, reference: COL.white,
  ma: COL.gold, sc: COL.a, tc: COL.b, s: COL.a, t: COL.b, face: COL.gold, texelX: COL.cyan, texelY: COL.cyan,
  own: COL.a, stored: COL.b, difference: COL.gold, bias: COL.amber, texel: COL.cyan, perTexel: COL.cyan,
  a: COL.a, b: COL.b, c: COL.c, d: COL.amber, size: COL.cyan, ratioMem: COL.gold,
};

// ---------------------------------------------------------------- panel pieces shared by the views

/** the texture buttons: one row, setting m.texId */
function textureRow(host, ids, m, ctx, onChange) {
  const show = segmented(host, 'texture', textureChoices(ids), () => m.texId, (id) => { m.texId = id; onChange?.(m); ctx.update(); });
  host.refreshers.push(show);
}

const SHOW = [['color', 'color'], ['level', 'mip level']];

// ---------------------------------------------------------------- lookup: the unit square, wrap modes, nearest and bilinear

const LOOKUP_INIT = { u: 0.3, v: 0.6, mode: 'repeat', texId: 'worked' };
const LOOKUP_PARAMS = [{ id: 'u', label: 'u', min: -0.5, max: 1.5, step: 0.01 }, { id: 'v', label: 'v', min: -0.5, max: 1.5, step: 0.01 }];
const LOOKUP_PRESETS = [
  { label: 'the lecture sample', set: { u: 0.3, v: 0.6, mode: 'repeat', texId: 'worked' } },
  { label: 'the image center', set: { u: 0.5, v: 0.5, mode: 'repeat', texId: 'worked' } },
  { label: 'a texel center', set: { u: 0.375, v: 0.625, mode: 'repeat', texId: 'worked' } },
  { label: 'u = 1.3, repeat', set: { u: 1.3, v: 0.6, mode: 'repeat' } },
  { label: 'u = 1.3, clamp', set: { u: 1.3, v: 0.6, mode: 'clamp' } },
  { label: 'u = 1.3, mirror', set: { u: 1.3, v: 0.6, mode: 'mirror' } },
  { label: 'u = −0.2, mirror', set: { u: -0.2, v: 0.6, mode: 'mirror' } },
  { label: 'on the edge, u = 0', set: { u: 0, v: 0.6, mode: 'repeat' } },
  { label: '8×8 checker', set: { u: 0.43, v: 0.31, mode: 'repeat', texId: 'checker8' } },
];

function runLookup(m, kind) {
  const tex = getTexture(m.texId);
  const wrapU = T.wrapCoordinate(m.u, m.mode);
  const near = T.sampleNearest(tex.pyramid, tex.n, 0, m.u, m.v, m.mode);
  const bil = T.sampleBilinear(tex.pyramid, tex.n, 0, m.u, m.v, m.mode);
  return { ...wrapU, ...(kind === 'nearest' ? near : bil), tex, near, bil, wrapV: T.wrapCoordinate(m.v, m.mode) };
}

/** the central unit square and its wrapped neighbors, texels visible, the sample and what the filter reads */
function paintLookup(ov, g, w, h, m, r, kind) {
  const tex = r.tex, n = tex.n;
  const { x0, y0, size } = lookupGeometry(w, h, ov.top);
  const cell = size / (2 * n);
  const X = (u) => x0 + ((u + 0.5) / 2) * size;
  const Y = (v) => y0 + size - ((v + 0.5) / 2) * size;
  g.save();
  g.beginPath();
  g.rect(x0, y0, size, size);
  g.clip();
  for (let cj = -Math.floor(n / 2); cj < Math.ceil(1.5 * n); cj++) {
    for (let ci = -Math.floor(n / 2); ci < Math.ceil(1.5 * n); ci++) {
      const value = tex.base[T.wrapIndex(cj, n, m.mode) * n + T.wrapIndex(ci, n, m.mode)];
      g.fillStyle = gray(value);
      g.fillRect(X(ci / n), Y((cj + 1) / n), cell + 0.6, cell + 0.6);
    }
  }
  g.fillStyle = 'rgba(11,12,16,0.5)';
  g.fillRect(x0, y0, size, size);
  g.restore();
  // the unit square
  const ux = X(0), uy = Y(1), us = size / 2;
  for (let cj = 0; cj < n; cj++) {
    for (let ci = 0; ci < n; ci++) {
      g.fillStyle = gray(tex.base[cj * n + ci]);
      g.fillRect(ux + ci * cell, uy + (n - 1 - cj) * cell, cell + 0.6, cell + 0.6);
    }
  }
  g.strokeStyle = 'rgba(11,12,16,0.55)';
  g.lineWidth = 1;
  for (let k = 0; k <= 2 * n; k++) {
    g.beginPath(); g.moveTo(x0 + k * cell, y0); g.lineTo(x0 + k * cell, y0 + size); g.stroke();
    g.beginPath(); g.moveTo(x0, y0 + k * cell); g.lineTo(x0 + size, y0 + k * cell); g.stroke();
  }
  g.strokeStyle = '#e7eaf0';
  g.lineWidth = 1.5;
  g.strokeRect(ux, uy, us, us);
  g.strokeStyle = '#2c3140';
  g.lineWidth = 1;
  g.strokeRect(x0 - 0.5, y0 - 0.5, size + 1, size + 1);
  for (const k of [-0.5, 0, 0.5, 1, 1.5]) {
    text(g, f(k, k % 1 === 0 ? 0 : 1), X(k), y0 + size + 14, { size: 11, align: 'center', color: '#8b93a7' });
    text(g, f(k, k % 1 === 0 ? 0 : 1), x0 - 6, Y(k) + 4, { size: 11, align: 'right', color: '#8b93a7' });
  }
  text(g, 'u', x0 + size + 4, y0 + size + 14, { size: 12, color: '#ffd166', weight: 700 });
  text(g, 'v', x0 - 18, y0 + 10, { size: 12, color: '#ffd166', weight: 700 });
  const label = cell >= 26;
  const texelBox = (ci, cj) => ({ x: ux + ci * cell, y: uy + (n - 1 - cj) * cell });
  const outline = (ci, cj, color, width, fill) => {
    const b = texelBox(ci, cj);
    if (fill) { g.fillStyle = fill; g.fillRect(b.x, b.y, cell, cell); }
    g.strokeStyle = color; g.lineWidth = width; g.strokeRect(b.x + width / 2, b.y + width / 2, cell - width, cell - width);
  };
  const near = r.near, bil = r.bil;
  const showNear = kind === 'nearest';
  g.globalAlpha = ov.dim('nearest', 'i', 'j', 'value');
  if (showNear) outline(near.i, near.j, css(COL.a), 3, 'rgba(255,123,114,0.16)');
  g.globalAlpha = 1;
  if (!showNear) {
    const cells = [[bil.i0, bil.j0, 't00', C_T00, 'w00'], [bil.i1, bil.j0, 't10', C_T10, 'w10'], [bil.i0, bil.j1, 't01', C_T01, 'w01'], [bil.i1, bil.j1, 't11', C_T11, 'w11']];
    for (const [ci, cj, key, color, wkey] of cells) {
      g.globalAlpha = ov.dim(key, wkey);
      outline(ci, cj, css(color), 3, null);
      g.globalAlpha = 1;
    }
    for (const [ci, cj, key, color, wkey] of cells) {
      if (cell < 22) continue;
      const b = texelBox(ci, cj);
      g.globalAlpha = ov.dim(key, wkey);
      text(g, f(bil[wkey]), b.x + cell / 2, b.y + cell - 4, { size: Math.min(13, cell / 3.2), align: 'center', color: css(color), weight: 700 });
      g.globalAlpha = 1;
    }
  }
  if (label) {
    for (let cj = 0; cj < n; cj++) {
      for (let ci = 0; ci < n; ci++) {
        const v = tex.base[cj * n + ci];
        const b = texelBox(ci, cj);
        text(g, f(v), b.x + cell / 2, b.y + cell * 0.42, { size: Math.min(13, cell / 3.2), align: 'center', color: v > 0.5 ? '#14161d' : '#e7eaf0', halo: false, base: 'middle' });
      }
    }
  }
  // the sample, and where wrapping puts it
  const px = X(m.u), py = Y(m.v), qx = X(r.wu), qy = Y(r.wv);
  const outside = m.u < 0 || m.u > 1 || m.v < 0 || m.v > 1;
  if (outside) {
    g.strokeStyle = 'rgba(255,209,102,0.8)'; g.lineWidth = 1.5; g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(px, py); g.lineTo(qx, qy); g.stroke(); g.setLineDash([]);
    g.strokeStyle = '#ffd166'; g.lineWidth = 2;
    g.beginPath(); g.arc(qx, qy, 6, 0, 2 * Math.PI); g.stroke();
    text(g, 'wrapped', qx + 9, qy - 7, { size: 11.5, color: '#ffd166' });
  }
  g.globalAlpha = ov.dim('u', 'v', 'wu', 'wv', 'x', 'y');
  g.fillStyle = '#ffd166';
  g.strokeStyle = '#0b0c10';
  g.lineWidth = 2;
  g.beginPath(); g.arc(px, py, 6.5, 0, 2 * Math.PI); g.fill(); g.stroke();
  g.globalAlpha = 1;
  if (!showNear) {
    // the two blends along x and the blend along y, drawn between the centers of the four texels
    const cx = (k) => ux + (k + 0.5) * cell;
    const cy = (k) => uy + (n - 1 - k + 0.5) * cell;
    const sx = ux + bil.wu * us, sy = uy + (1 - bil.wv) * us;
    const adjacent = bil.i1 === bil.i0 + 1 && bil.j1 === bil.j0 + 1;
    if (adjacent) {
      g.globalAlpha = ov.dim('rowLow', 'rowHigh', 'fx', 'fy');
      g.strokeStyle = css(COL.purple); g.fillStyle = css(COL.purple); g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(cx(bil.i0), cy(bil.j0)); g.lineTo(cx(bil.i1), cy(bil.j0)); g.moveTo(cx(bil.i0), cy(bil.j1)); g.lineTo(cx(bil.i1), cy(bil.j1)); g.stroke();
      g.beginPath(); g.moveTo(sx, cy(bil.j0)); g.lineTo(sx, cy(bil.j1)); g.stroke();
      for (const yy of [cy(bil.j0), cy(bil.j1)]) { g.beginPath(); g.arc(sx, yy, 3.5, 0, 2 * Math.PI); g.fill(); }
      g.globalAlpha = 1;
    }
    for (const [ci, cj, , color] of cells4(bil, [C_T00, C_T10, C_T01, C_T11])) {
      g.fillStyle = css(color);
      g.beginPath(); g.arc(cx(ci), cy(cj), 3, 0, 2 * Math.PI); g.fill();
    }
  }
  text(g, `${r.tex.n} × ${r.tex.n} texels, ${m.mode} wrap`, x0 + size, y0 + size + 32, { size: 12, color: '#aab2c5', align: 'right' });
}
const cells4 = (b, colors) => [[b.i0, b.j0, 0, colors[0]], [b.i1, b.j0, 1, colors[1]], [b.i0, b.j1, 2, colors[2]], [b.i1, b.j1, 3, colors[3]]];

/** the central square magnified: nearest on the left, bilinear on the right, each pixel read by the program */
function paintMagnified(pc, m, r) {
  const { g, w, h } = pc;
  const tex = r.tex, side = 112;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#0b0c10';
  g.fillRect(0, 0, w, h);
  const draw = (x0, sampler, caption) => {
    const img = g.createImageData(side, side);
    for (let py = 0; py < side; py++) {
      for (let px = 0; px < side; px++) {
        const value = sampler(tex.pyramid, tex.n, 0, (px + 0.5) / side, 1 - (py + 0.5) / side, m.mode).value;
        const k = (py * side + px) * 4, c = Math.round(255 * value);
        img.data[k] = c; img.data[k + 1] = c; img.data[k + 2] = c; img.data[k + 3] = 255;
      }
    }
    const off = document.createElement('canvas');
    off.width = side; off.height = side;
    off.getContext('2d').putImageData(img, 0, 0);
    g.imageSmoothingEnabled = false;
    g.drawImage(off, x0, 22, side, side);
    text(g, caption, x0, 14, { size: 11.5, color: '#aab2c5', halo: false });
    const sx = x0 + r.wu * side, sy = 22 + (1 - r.wv) * side;
    g.strokeStyle = '#ffd166'; g.lineWidth = 1.5;
    g.strokeRect(sx - 4, sy - 4, 8, 8);
  };
  draw(8, T.sampleNearest, 'nearest');
  draw(w - side - 8, T.sampleBilinear, 'bilinear');
}

function explainLookup(m, r, kind) {
  const n = r.tex.n, b = r.bil, nr = r.near;
  const nearV = nr.value, bilV = b.value;
  const outside = m.u < 0 || m.u > 1 || m.v < 0 || m.v > 1;
  const atCenter = Math.abs(b.fx) < 1e-6 && Math.abs(b.fy) < 1e-6;
  const rows = [
    outside ? `{mode|${m.mode}}: {u|u} = ${f(m.u)} → {wu|${f(b.wu)}}, {v|v} = ${f(m.v)} → {wv|${f(b.wv)}}` : `({u|u}, {v|v}) = (${f(m.u)}, ${f(m.v)}), inside the unit square`,
    `{x|x} = {wu|u}·W − 0.5 = ${f(b.wu)} × ${n} − 0.5 = {x|${f(b.x)}}`,
    `{y|y} = {wv|v}·H − 0.5 = ${f(b.wv)} × ${n} − 0.5 = {y|${f(b.y)}}`,
  ];
  if (kind === 'nearest') {
    rows.push(
      `{i|i} = ⌊{wu|u}·W⌋ = ⌊${f(b.wu * n, 2)}⌋ = {i|${nr.i}}, {j|j} = ⌊{wv|v}·H⌋ = ⌊${f(b.wv * n, 2)}⌋ = {j|${nr.j}}`,
      `{nearest|nearest} = T<sub>${nr.i},${nr.j}</sub> = {nearest|${f3(nearV)}}`,
      `bilinear would return {bilinear|${f3(bilV)}}, the blend of the four texels around ({x|${f(b.x)}}, {y|${f(b.y)}})`,
    );
  } else {
    rows.push(
      `{i|i} = ⌊{x|x}⌋ = ${b.i}, {j|j} = ⌊{y|y}⌋ = ${b.j};  {fx|fx} = ${f(b.fx)}, {fy|fy} = ${f(b.fy)}`,
      `{t00|T<sub>${b.i0},${b.j0}</sub>} = ${f(b.t00)},  {t10|T<sub>${b.i1},${b.j0}</sub>} = ${f(b.t10)}   (row ${b.j0})`,
      `{t01|T<sub>${b.i0},${b.j1}</sub>} = ${f(b.t01)},  {t11|T<sub>${b.i1},${b.j1}</sub>} = ${f(b.t11)}   (row ${b.j1})`,
      `row ${b.j0}: {rowLow|${f(b.t00)} + ${f(b.fx)} (${f(b.t10)} − ${f(b.t00)}) = ${f3(b.rowLow)}}`,
      `row ${b.j1}: {rowHigh|${f(b.t01)} + ${f(b.fx)} (${f(b.t11)} − ${f(b.t01)}) = ${f3(b.rowHigh)}}`,
      `{value|${f3(b.rowLow)} + ${f(b.fy)} (${f3(b.rowHigh)} − ${f3(b.rowLow)}) = ${f3(bilV)}}`,
      `weights {w00|${f(b.w00)}}, {w10|${f(b.w10)}}, {w01|${f(b.w01)}}, {w11|${f(b.w11)}}: sum ${f(b.w00 + b.w10 + b.w01 + b.w11)}`,
      `nearest would return T<sub>${nr.i},${nr.j}</sub> = {nearest|${f3(nearV)}}`,
    );
  }
  const status = atCenter ? { text: `at the center of texel (${b.i0}, ${b.j0}): bilinear returns the texel, ${f3(bilV)}, and so does nearest`, tone: 'ok' }
    : outside ? { text: `outside [0, 1]: ${m.mode} gives (${f(b.wu)}, ${f(b.wv)}); ${m.mode === 'clamp' ? 'the sample reads the edge texels' : 'the sample reads the wrapped texels'}`, tone: 'info' }
      : Math.abs(bilV - nearV) < 0.005 ? { text: `nearest ${f3(nearV)} and bilinear ${f3(bilV)} agree`, tone: 'ok' }
        : { text: `nearest ${f3(nearV)}, bilinear ${f3(bilV)}: they differ by ${f3(Math.abs(bilV - nearV))}`, tone: 'warn' };
  return {
    hud: kind === 'nearest' ? `{nearest|nearest} = T<sub>${nr.i},${nr.j}</sub> = {nearest|${f3(nearV)}}   bilinear {bilinear|${f3(bilV)}}`
      : `{bilinear|bilinear} = ${f(b.w00)}·${f(b.t00)} + ${f(b.w10)}·${f(b.t10)} + ${f(b.w01)}·${f(b.t01)} + ${f(b.w11)}·${f(b.t11)} = {bilinear|${f3(bilV)}}`,
    rows, status,
    fact: 'Texel i covers u from i/W to (i + 1)/W, and its center is at (i + 0.5)/W. After wrapping, the neighbors a bilinear sample reads past the edge follow the same mode.',
    values: [['x', f(b.x), 'x'], ['y', f(b.y), 'y'], ['fx', f(b.fx), 'fx'], ['fy', f(b.fy), 'fy'], ['nearest', f3(nearV), 'nearest'], ['bilinear', f3(bilV), 'bilinear']],
  };
}

function lookupPanel(host, m, r, ctx) {
  once(host, 'lookup', (h) => {
    const seg = segmented(h, 'wrap', [['repeat', 'repeat'], ['clamp', 'clamp'], ['mirror', 'mirror']], () => m.mode, (mode) => { m.mode = mode; ctx.update(); });
    h.refreshers.push(seg);
    textureRow(h, ['worked', 'checker8'], m, ctx);
    h.canvas = panelCanvas(h, 260, 148);
    el('p', 'lab-note', h, 'The unit square magnified at the pixel scale of the right canvas: nearest, then bilinear. The yellow square marks the sample.');
  });
  host.refreshers.forEach((s) => s());
  paintMagnified(host.canvas, m, r);
}

function lookupView(id, label, kind, regions) {
  return {
    id, topic: 'lookup', label, group: 'lookup', init: LOOKUP_INIT, params: LOOKUP_PARAMS, presets: LOOKUP_PRESETS, home: { eye: [0, 0, 8], target: [0, 0, 0] },
    grid: 'none', axes: false, regions, inputTitle: 'Coordinate',
    keys: {},
    setup(ctx) { setupOverlay(ctx, { down: (x, y) => lookupDrag(ctx, x, y), move: (x, y) => lookupDrag(ctx, x, y) }); },
    leave(ctx) { leaveOverlay(ctx); },
    run: (m) => runLookup(m, kind),
    draw(v, m, r, ctx) {
      const ov = ctx.sceneEl ? overlayFor(ctx) : null;
      if (!ov) return;
      ov.painter = (g, w, h) => paintLookup(ov, g, w, h, m, r, kind);
      ov.repaint();
    },
    explain: (m, r) => explainLookup(m, r, kind),
    panelTitle: 'Magnified',
    panel: lookupPanel,
  };
}

/** the window on [-0.5, 1.5] x [-0.5, 1.5] in canvas pixels */
function lookupGeometry(w, h, top) {
  const size = Math.max(100, Math.min(w - 50, h - top - 70));
  return { x0: (w - size) / 2 + 8, y0: top, size };
}
function lookupDrag(ctx, x, y) {
  const ov = overlayFor(ctx);
  const m = ctx.state();
  const g = lookupGeometry(ov.w, ov.h, ov.top);
  const u = ((x - g.x0) / g.size) * 2 - 0.5;
  const v = ((g.y0 + g.size - y) / g.size) * 2 - 0.5;
  m.u = Math.max(-0.5, Math.min(1.5, Math.round(u * 100) / 100));
  m.v = Math.max(-0.5, Math.min(1.5, Math.round(v * 100) / 100));
  ctx.refresh();
}

function setupOverlay(ctx, handlers) {
  if (!ctx.sceneEl) return;
  const ov = overlayFor(ctx);
  ov.handlers = handlers;
  ov.show(true);
  const row = ctx.sceneEl.querySelector('.lab-views');
  if (row) row.style.display = 'none';
}
function leaveOverlay(ctx) {
  if (!ctx.sceneEl) return;
  const ov = overlayFor(ctx);
  ov.cancelJob();
  ov.show(false);
  ov.handlers = null;
  ov.painter = null;
  const row = ctx.sceneEl.querySelector('.lab-views');
  if (row) row.style.display = '';
}

// ---------------------------------------------------------------- the floor: magnification, minification, shimmer

// resolution is the floor image's width (one of FLOOR_SIZES); px and py name a pixel of an image pickW pixels wide, so a pixel
// picked or named at one size is read at the same spot of the picture at another
const FLOOR_INIT = {
  tilt: 66, tiles: 3, texId: 'check4', filter: 'nearest', show: 'color', mode: 'repeat', taps: 16, px: 100, py: 110, pickW: FLOOR_W,
  resolution: FLOOR_W, manual: false, dudx: 0, dvdx: 0, dudy: 0, dvdy: 0,
};
/** a pixel named on the default 200 x 150 image, for a preset */
const at = (px, py) => ({ px, py, pickW: FLOOR_W });
const RESOLUTIONS = FLOOR_SIZES.map(([w, h]) => [w, `${w} × ${h}`]);

/** the floor image's width and height in pixels */
function floorSize(m) {
  return FLOOR_SIZES.find(([w]) => w === m.resolution) ?? [FLOOR_W, FLOOR_H];
}
/** the picked pixel as an index into a W x H image: the same fraction of the picture as px, py of the image it was picked on */
function pixelOf(m, W, H) {
  const k = W / (m.pickW || W);
  return {
    px: Math.min(W - 1, Math.max(0, Math.floor(m.px * k + 1e-9))),
    py: Math.min(H - 1, Math.max(0, Math.floor(m.py * k + 1e-9))),
  };
}
/** the resolution buttons of the floor views, which share the value */
function resolutionRow(host, m, ctx) {
  host.refreshers.push(segmented(host, 'resolution', RESOLUTIONS, () => floorSize(m)[0], (w) => { m.resolution = w; ctx.update(); }));
}
const FILTERS = [['nearest', 'nearest'], ['bilinear', 'bilinear'], ['level', 'one mip level'], ['trilinear', 'trilinear'], ['anisotropic', 'anisotropic'], ['reference', '16-sample average']];
const FILTER_NAME = { nearest: 'nearest', bilinear: 'bilinear', level: 'one mip level', trilinear: 'trilinear', anisotropic: 'anisotropic', reference: 'the 16-sample average' };
const TILT = { id: 'tilt', label: 'tilt', min: 0, max: 80, step: 1, unit: '°' };
const TILES = { id: 'tiles', label: 'tiles', min: 1, max: 24, step: 1 };
const FLOOR_FILTERS = ['nearest', 'bilinear', 'level', 'trilinear', 'anisotropic', 'reference'];

/** the footprint of the selected pixel: from the floor, or the numbers set by hand */
function footprintOf(m, px, py, W, H) {
  if (m.manual) return { hit: true, u: 0.53, v: 0.47, dudx: m.dudx, dvdx: m.dvdx, dudy: m.dudy, dvdy: m.dvdy };
  return T.floorFootprint(px, py, W, H, m.tilt, m.tiles);
}

function runFloor(m) {
  const tex = getTexture(m.texId);
  const [W, H] = floorSize(m);
  const { px, py } = pixelOf(m, W, H);
  const fp0 = T.floorFootprint(px, py, W, H, m.tilt, m.tiles);
  const shade = T.shadeFloor(tex.pyramid, tex.n, px, py, W, H, m.tilt, m.tiles, m.filter, m.taps, m.mode);
  const ray = T.floorPixel(px + 0.5, py + 0.5, W, H, m.tilt, m.tiles);
  const fp = T.footprintLevel(fp0.dudx, fp0.dvdx, fp0.dudy, fp0.dvdy, tex.n, tex.levels);
  const byFilter = {};
  for (const [id] of FILTERS) byFilter[id] = T.shadeFloor(tex.pyramid, tex.n, px, py, W, H, m.tilt, m.tiles, id, m.taps, m.mode);
  return { ...fp0, ...shade, depth: ray.depth, sx: ray.sx, sy: ray.sy, tex, fp, byFilter, px, py, imageW: W, imageH: H };
}

/** lambda down the middle column of the W x H image, for the chart */
function lambdaAt(m, tex, row, W, H) {
  const f0 = T.floorFootprint(W / 2, Math.min(H - 2, Math.max(0, Math.round(row))), W, H, m.tilt, m.tiles);
  if (!f0.hit) return NaN;
  return T.footprintLevel(f0.dudx, f0.dvdx, f0.dudy, f0.dvdy, tex.n, tex.levels).lambda;
}

function regime(fp) {
  if (fp.rho < 1) return `ρ = ${f(fp.rho)} texel per pixel: one texel spans ${f(1 / fp.rho, 1)} pixels (magnification)`;
  return `ρ = ${f(fp.rho)} texels per pixel: one pixel covers a patch of about ${f(fp.footprintX, 1)} × ${f(fp.footprintY, 1)} texels (minification)`;
}

function explainFloor(m, r) {
  const where = m.manual ? 'the derivatives set by hand' : `pixel (${r.px}, ${r.py}) of ${r.imageW} × ${r.imageH}`;
  if (!r.hit) {
    return {
      hud: `pixel (${r.px}, ${r.py}) is above the horizon`,
      rows: [`pixel (${r.px}, ${r.py}): the ray never meets the floor`, `the floor's far edge is the horizon, at the tilt ${m.tilt}°`],
      status: { text: 'sky: no texture is read here', tone: 'info' },
      chart: floorChart(m, r, NaN),
    };
  }
  const fp = r.fp;
  const rows = [
    `${where}:  ray ({sx|${f(r.sx)}}, ${f(r.sy)}, −1) meets the floor at depth ${f(r.depth)} → ({u|u}, {v|v}) = (${f(r.u, 3)}, ${f(r.v, 3)})`,
    `{dudx|∂u/∂x} = ${f(r.dudx, 4)}, {dvdx|∂v/∂x} = ${f(r.dvdx, 4)}   (one pixel to the right)`,
    `{dudy|∂u/∂y} = ${f(r.dudy, 4)}, {dvdy|∂v/∂y} = ${f(r.dvdy, 4)}   (one pixel down)`,
    `{footprintX|footprint x} = ${r.tex.n}·√(∂u/∂x² + ∂v/∂x²) = {footprintX|${f(fp.footprintX, 3)}} texels, {footprintY|y} = {footprintY|${f(fp.footprintY, 3)}}`,
    `{rho|ρ} = max = {rho|${f(fp.rho, 3)}},  {lambda|λ} = log₂ ρ = {lambda|${f(fp.lambda, 3)}}`,
    regime(fp),
  ];
  const filterValue = r.byFilter[m.filter].value;
  const spread = Math.max(...FLOOR_FILTERS.map((k) => r.byFilter[k].value)) - Math.min(...FLOOR_FILTERS.map((k) => r.byFilter[k].value));
  let status;
  if (fp.rho < 1) status = { text: `magnification: the texture is larger on screen than in texels; ${m.filter === 'nearest' ? 'nearest shows blocks' : FILTER_NAME[m.filter] + ' reads between texel centers'}`, tone: 'info' };
  else if (m.filter === 'nearest') status = { text: `minification read by nearest: one texel of about ${f(fp.rho * fp.rho, 0)} under the pixel; the value changes when the floor moves`, tone: 'bad' };
  else if (m.filter === 'bilinear') status = { text: `minification read by bilinear: four texels of the ${f(fp.rho * fp.rho, 0)} under the pixel; the rest are skipped`, tone: 'warn' };
  else status = { text: `${FILTER_NAME[m.filter]}: ${f3(filterValue)}; the filters differ by up to ${f3(spread)} at this pixel`, tone: 'ok' };
  return {
    hud: `ρ = {rho|${f(fp.rho, 2)}} texels per pixel   λ = log₂ ρ = {lambda|${f(fp.lambda, 2)}}   ${fp.rho < 1 ? 'magnified' : 'minified'}`,
    rows, status,
    chart: floorChart(m, r, fp.lambda),
    values: FILTERS.map(([id, label]) => [label, f3(r.byFilter[id].value), id === 'nearest' ? 'nearest' : id === 'bilinear' ? 'bilinear' : id === 'trilinear' ? 'trilinear' : id === 'anisotropic' ? 'aniso' : id === 'reference' ? 'reference' : null]),
  };
}

function floorChart(m, r, lambda) {
  const tex = r.tex ?? getTexture(m.texId);
  const [W, H] = floorSize(m);
  return {
    x: [0, H], y: [-4, 8], xLabel: 'image row', curve: 'λ down the middle column',
    series: [{ fn: (row) => lambdaAt(m, tex, row, W, H), color: COL.gold }], at: r.py, atY: Number.isFinite(lambda) ? lambda : -4,
  };
}

function floorPanel(host, m, r, ctx) {
  once(host, 'floor', (h) => {
    h.refreshers.push(segmented(h, 'filter', FILTERS, () => m.filter, (id) => { m.filter = id; ctx.update(); }));
    h.refreshers.push(segmented(h, 'show', SHOW, () => m.show, (id) => { m.show = id; ctx.update(); }));
    textureRow(h, ['check4', 'check1', 'noise', 'checker8'], m, ctx);
    h.refreshers.push(segmented(h, 'wrap', [['repeat', 'repeat'], ['clamp', 'clamp'], ['mirror', 'mirror']], () => m.mode, (id) => { m.mode = id; ctx.update(); }));
    resolutionRow(h, m, ctx);
    h.note = el('p', 'lab-note', h, '');
  });
  host.refreshers.forEach((s) => s());
  host.note.textContent = `${r.tex.n} × ${r.tex.n} texels, ${plural(r.tex.levels, 'mip level')}. Click a pixel to read its footprint.`;
}

function floorSetup(ctx) {
  setupOverlay(ctx, {
    down: (x, y) => pickPixel(ctx, x, y),
    move: (x, y) => pickPixel(ctx, x, y),
  });
}
function pickPixel(ctx, x, y) {
  const ov = overlayFor(ctx);
  const m = ctx.state();
  const [W, H] = floorSize(m);
  const p = pixelAt(ov, x, y, W, H);
  if (!p) return;
  if (m.px === p.ix && m.py === p.iy && m.pickW === W && !m.manual) return;
  m.px = p.ix; m.py = p.iy; m.pickW = W; m.manual = false;
  ctx.refresh();
}

/** start (or keep) the render for the current settings and paint the picture */
function drawFloor(ctx, m, { split = null, extra } = {}) {
  const ov = ctx.sceneEl ? overlayFor(ctx) : null;
  if (!ov) return;
  const [W, H] = floorSize(m);
  const { px, py } = pixelOf(m, W, H);
  const job = renderFloor(ov, m, { split, onProgress: () => ov.repaint(), width: W, height: H });
  ov.painter = (g, w, h) => {
    paintFloor(ov, g, w, h, { ...m, px: m.manual ? -1 : px, py }, { split, bottom: m.show === 'level' ? 70 : 52, width: W, height: H });
    const r = ov.rect;
    if (!job.done) text(g, `rendering ${Math.round((job.row / H) * 100)} %`, r.x + 8, r.y + 18, { size: 12, color: '#ffd166' });
    if (m.show === 'level') paintLevelLegend(g, r.x + r.w, r.y + r.h + 8, getTexture(m.texId).levels);
    else text(g, `${W} × ${H} pixels, each read by the program's sampler`, r.x, r.y + r.h + 18, { size: 11.5, color: '#8b93a7' });
    extra?.(g, r);
  };
  ov.repaint();
}

const FLOOR_PRESETS = [
  { label: 'magnified, nearest', set: { tilt: 0, tiles: 1, texId: 'check4', filter: 'nearest', show: 'color', manual: false, ...at(100, 75) } },
  { label: 'magnified, bilinear', set: { tilt: 0, tiles: 1, texId: 'check4', filter: 'bilinear', show: 'color', manual: false, ...at(100, 75) } },
  { label: 'minified, nearest: moiré', set: { tilt: 68, tiles: 3, texId: 'check1', filter: 'nearest', show: 'color', manual: false, ...at(100, 60) } },
  { label: 'minified, trilinear', set: { tilt: 68, tiles: 3, texId: 'check1', filter: 'trilinear', show: 'color', manual: false, ...at(100, 60) } },
  { label: 'floor, nearest', set: { tilt: 66, tiles: 3, texId: 'check4', filter: 'nearest', show: 'color', manual: false } },
  { label: 'floor, one mip level', set: { tilt: 66, tiles: 3, texId: 'check4', filter: 'level', show: 'level', manual: false } },
  { label: 'floor, anisotropic', set: { tilt: 66, tiles: 3, texId: 'check4', filter: 'anisotropic', show: 'color', manual: false } },
];

// ---------------------------------------------------------------- the pyramid

const PYR_INIT = { texId: 'checker8', level: 1, ti: 0, tj: 0 };
const PYR_PRESETS = [
  { label: 'the 8×8 checker', set: { texId: 'checker8', level: 1, ti: 0, tj: 0 } },
  { label: 'the lecture 4×4', set: { texId: 'worked', level: 1, ti: 0, tj: 1 } },
  { label: '64×64, checks of 4', set: { texId: 'check4', level: 2, ti: 1, tj: 1 } },
  { label: '64×64, checks of 1', set: { texId: 'check1', level: 1, ti: 3, tj: 2 } },
  { label: '64×64 noise', set: { texId: 'noise', level: 3, ti: 2, tj: 3 } },
];

function runPyramid(m) {
  const tex = getTexture(m.texId);
  const level = Math.max(1, Math.min(tex.levels - 1, Math.round(m.level)));
  const size = T.levelSize(tex.n, level);
  const ti = Math.max(0, Math.min(size - 1, Math.round(m.ti)));
  const tj = Math.max(0, Math.min(size - 1, Math.round(m.tj)));
  const below = T.levelSize(tex.n, level - 1);
  const from = T.levelOffset(tex.n, level - 1);
  const to = T.levelOffset(tex.n, level);
  const p = tex.pyramid;
  const a = p[from + 2 * tj * below + 2 * ti], b = p[from + 2 * tj * below + 2 * ti + 1];
  const c = p[from + (2 * tj + 1) * below + 2 * ti], d = p[from + (2 * tj + 1) * below + 2 * ti + 1];
  const mean = p[to + tj * size + ti];
  const patch = 2 ** level;
  let sum = 0;
  for (let j = 0; j < patch; j++) for (let i = 0; i < patch; i++) sum += tex.base[(tj * patch + j) * tex.n + ti * patch + i];
  return { tex, level, ti, tj, size, below, from, to, a, b, c, d, mean, patch, patchMean: sum / (patch * patch), levels: tex.levels, texels: tex.texels, ratio: tex.ratio };
}

function pyramidLayout(w, h, tex, top) {
  const sizes = [];
  for (let k = 0; k < tex.levels; k++) sizes.push(T.levelSize(tex.n, k));
  const gap = 18;
  const total = sizes.reduce((s, x) => s + x, 0);
  const avail = w - 24 - gap * (sizes.length - 1);
  const cell = Math.max(1.5, Math.min(52, avail / total, (h - top - 146) / tex.n));
  const boxes = [];
  let x = 12;
  for (let k = 0; k < sizes.length; k++) {
    boxes.push({ x, y: top + 34, size: sizes[k], cell });
    x += sizes[k] * cell + gap;
  }
  return { boxes, cell };
}

function paintPyramid(ov, g, w, h, m, r) {
  const tex = r.tex;
  const { boxes, cell } = pyramidLayout(w, h, tex, ov.top);
  ov.pyramidBoxes = boxes;
  boxes.forEach((b, k) => {
    const off = T.levelOffset(tex.n, k);
    for (let j = 0; j < b.size; j++) {
      for (let i = 0; i < b.size; i++) {
        const value = tex.pyramid[off + j * b.size + i];
        const px = b.x + i * cell, py = b.y + (b.size - 1 - j) * cell;
        g.fillStyle = gray(value);
        g.fillRect(px, py, cell + (cell > 3 ? 0 : 0.6), cell + (cell > 3 ? 0 : 0.6));
        if (cell >= 30) text(g, f(value), px + cell / 2, py + cell / 2, { size: Math.min(12, cell / 3.4), align: 'center', base: 'middle', color: value > 0.5 ? '#14161d' : '#e7eaf0', halo: false });
      }
    }
    if (cell >= 8) {
      g.strokeStyle = 'rgba(11,12,16,0.5)';
      g.lineWidth = 1;
      for (let q = 0; q <= b.size; q++) {
        g.beginPath(); g.moveTo(b.x + q * cell, b.y); g.lineTo(b.x + q * cell, b.y + b.size * cell); g.stroke();
        g.beginPath(); g.moveTo(b.x, b.y + q * cell); g.lineTo(b.x + b.size * cell, b.y + q * cell); g.stroke();
      }
    }
    g.strokeStyle = '#3a4152';
    g.lineWidth = 1;
    g.strokeRect(b.x - 0.5, b.y - 0.5, b.size * cell + 1, b.size * cell + 1);
    text(g, `level ${k}`, b.x, ov.top + 22, { size: 12, weight: 700, color: k === r.level ? '#ffd166' : '#c7cdda' });
    text(g, `${b.size} × ${b.size}`, b.x, b.y + b.size * cell + 16, { size: 11, color: '#8b93a7' });
    text(g, `${b.size * b.size}`, b.x, b.y + b.size * cell + 30, { size: 11, color: '#8b93a7' });
  });
  // the selected texel, its 2 x 2 block, and the 2^k patch of the base under it
  const cellBox = (k, i, j, span) => ({ x: boxes[k].x + i * cell, y: boxes[k].y + (boxes[k].size - j - span) * cell, w: span * cell, h: span * cell });
  const sel = cellBox(r.level, r.ti, r.tj, 1);
  g.globalAlpha = ov.dim('a', 'b', 'c', 'd', 'mean');
  for (let k = r.level - 1; k >= 0; k--) {
    const span = 2 ** (r.level - k);
    const bx = cellBox(k, r.ti * span, r.tj * span, span);
    g.strokeStyle = k === r.level - 1 ? '#ffd166' : 'rgba(255,209,102,0.5)';
    g.lineWidth = k === r.level - 1 ? 2.2 : 1.4;
    g.strokeRect(bx.x, bx.y, bx.w, bx.h);
    g.fillStyle = 'rgba(255,209,102,0.1)';
    g.fillRect(bx.x, bx.y, bx.w, bx.h);
    if (k === r.level - 1) {
      const quad = [[0, 0, C_T00], [1, 0, C_T10], [0, 1, C_T01], [1, 1, C_T11]];
      for (const [di, dj, color] of quad) {
        const q = cellBox(k, r.ti * 2 + di, r.tj * 2 + dj, 1);
        g.strokeStyle = css(color); g.lineWidth = 2;
        g.strokeRect(q.x + 1, q.y + 1, q.w - 2, q.h - 2);
      }
    }
  }
  g.strokeStyle = '#ffd166'; g.lineWidth = 2.6;
  g.strokeRect(sel.x - 1, sel.y - 1, sel.w + 2, sel.h + 2);
  g.globalAlpha = 1;
  const base = cellBox(r.level - 1, r.ti * 2, r.tj * 2, 2);
  g.strokeStyle = 'rgba(255,209,102,0.55)'; g.lineWidth = 1.2; g.setLineDash([4, 4]);
  g.beginPath(); g.moveTo(sel.x, sel.y + sel.h / 2); g.lineTo(base.x + base.w, base.y + base.h / 2); g.stroke();
  g.setLineDash([]);
  text(g, 'click a texel of a level to see the four it averages', 12, boxes[0].y + tex.n * cell + 58, { size: 12, color: '#aab2c5' });
}

function explainPyramid(m, r) {
  const tex = r.tex, n = tex.n;
  const counts = Array.from({ length: tex.levels }, (_, k) => T.levelSize(n, k) ** 2);
  const patchText = `${2 ** r.level} × ${2 ** r.level} = ${(2 ** r.level) ** 2}`;
  const series = [];
  let running = 0;
  for (let k = 0; k < tex.levels; k++) { running += counts[k]; series.push({ x: k + 1, y: running / (n * n), color: k + 1 === tex.levels ? COL.gold : COL.cyan }); }
  return {
    hud: `level ${r.level} texel (${r.ti}, ${r.tj}) = ({a|${f(r.a)}} + {b|${f(r.b)}} + {c|${f(r.c)}} + {d|${f(r.d)}}) / 4 = {value|${f3(r.mean)}}`,
    rows: [
      `level ${r.level} is ${r.size} × ${r.size}; level ${r.level - 1} is ${r.below} × ${r.below}`,
      `texel (${r.ti}, ${r.tj}) of level ${r.level} = ({a|T<sub>${2 * r.ti},${2 * r.tj}</sub>} + {b|T<sub>${2 * r.ti + 1},${2 * r.tj}</sub>} + {c|T<sub>${2 * r.ti},${2 * r.tj + 1}</sub>} + {d|T<sub>${2 * r.ti + 1},${2 * r.tj + 1}</sub>}) / 4`,
      `= (${f(r.a)} + ${f(r.b)} + ${f(r.c)} + ${f(r.d)}) / 4 = {value|${f3(r.mean)}}`,
      `the mean of the ${patchText} texels of the original under it: ${f3(r.patchMean)}`,
      `texels: ${counts.join(' + ')} = {size|${r.texels}}`,
      `${r.texels} / ${n * n} = {ratioMem|${f3(r.ratio)}} of the base, ${f(100 * (r.ratio - 1), 1)} % more memory`,
      `1 + 1/4 + 1/16 + … → 4/3 = ${f3(4 / 3)}`,
    ],
    status: Math.abs(r.mean - r.patchMean) < 1e-9 ? { text: `each level-${r.level} texel is the average of ${plural((2 ** r.level) ** 2, 'texel')} of the original: ${f3(r.mean)}`, tone: 'ok' }
      : { text: 'the averages disagree', tone: 'bad' },
    chart: { x: [0.4, tex.levels + 0.6], y: [1, 1.4], xLabel: 'levels in the pyramid', curve: 'memory, in bases', bars: series, series: [{ fn: () => 4 / 3, color: COL.amber }], at: tex.levels, atY: tex.ratio },
    fact: 'Lance Williams introduced the mipmap in 1983 (mip, from multum in parvo, much in little).',
    values: [['level', String(r.level)], ['texels', String(r.texels)], ['ratio', f3(r.ratio), 'ratioMem'], ['limit 4/3', f3(4 / 3)]],
  };
}

// ---------------------------------------------------------------- the footprint of one pixel in texture space

function paintFootprint(pc, m, r, { taps = null } = {}) {
  const { g, w, h } = pc;
  const tex = r.tex, n = tex.n;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#0b0c10';
  g.fillRect(0, 0, w, h);
  if (!r.hit) { text(g, 'above the horizon', w / 2, h / 2, { align: 'center', color: '#8b93a7' }); return; }
  const cx = r.u * n, cy = r.v * n;
  const a = [r.dudx * n, r.dvdx * n], b = [r.dudy * n, r.dvdy * n];
  const corners = [[-0.5, -0.5], [0.5, -0.5], [0.5, 0.5], [-0.5, 0.5]].map(([s, t]) => [s * a[0] + t * b[0], s * a[1] + t * b[1]]);
  const extent = Math.max(...corners.map((c) => Math.max(Math.abs(c[0]), Math.abs(c[1]))), ...a.map(Math.abs), ...b.map(Math.abs));
  const half = Math.max(1.3, extent * 1.5);
  const scale = Math.min(w, h) / (2 * half);
  const X = (tx) => w / 2 + (tx - cx) * scale, Y = (ty) => h / 2 - (ty - cy) * scale;
  const cols = Math.ceil(w / 2), rows = Math.ceil(h / 2);
  const img = g.createImageData(cols, rows);
  for (let py = 0; py < rows; py++) {
    for (let px = 0; px < cols; px++) {
      const tx = cx + (px * 2 + 1 - w / 2) / scale, ty = cy - (py * 2 + 1 - h / 2) / scale;
      const value = T.sampleNearest(tex.pyramid, n, 0, tx / n, ty / n, m.mode).value;
      const k = (py * cols + px) * 4, c = Math.round(255 * value * 0.8);
      img.data[k] = c; img.data[k + 1] = c; img.data[k + 2] = c; img.data[k + 3] = 255;
    }
  }
  const off = document.createElement('canvas');
  off.width = cols; off.height = rows;
  off.getContext('2d').putImageData(img, 0, 0);
  g.imageSmoothingEnabled = false;
  g.drawImage(off, 0, 0, cols * 2, rows * 2);
  // texel grids: level 0 thin; the lower and upper levels the sampler blends, thick
  const grid = (spacing, color, width) => {
    if (spacing * scale < 7) return;
    g.strokeStyle = color; g.lineWidth = width;
    const first = Math.floor((cx - half) / spacing) * spacing;
    for (let t = first; t <= cx + half * 1.5; t += spacing) {
      g.beginPath(); g.moveTo(X(t), 0); g.lineTo(X(t), h); g.stroke();
    }
    const firstY = Math.floor((cy - half * 1.5) / spacing) * spacing;
    for (let t = firstY; t <= cy + half * 1.5; t += spacing) {
      g.beginPath(); g.moveTo(0, Y(t)); g.lineTo(w, Y(t)); g.stroke();
    }
  };
  grid(1, 'rgba(11,12,16,0.45)', 1);
  const fp = r.fp;
  if (fp.lower > 0) grid(2 ** fp.lower, css(COL.b), 1.6);
  if (fp.upper > fp.lower && fp.blend > 0) grid(2 ** fp.upper, css(COL.purple), 1.2);
  // the parallelogram: the pixel's area in texel space
  const pts = corners.map(([dx, dy]) => [X(cx + dx), Y(cy + dy)]);
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fillStyle = 'rgba(255,209,102,0.22)'; g.fill();
  g.strokeStyle = '#ffd166'; g.lineWidth = 2; g.stroke();
  arrow2d(g, w / 2, h / 2, X(cx + a[0]), Y(cy + a[1]), css(COL.a), 2);
  arrow2d(g, w / 2, h / 2, X(cx + b[0]), Y(cy + b[1]), css(COL.b), 2);
  text(g, '∂/∂x', X(cx + a[0]) + 5, Y(cy + a[1]) - 5, { size: 11, color: css(COL.a), weight: 700 });
  text(g, '∂/∂y', X(cx + b[0]) + 5, Y(cy + b[1]) + 12, { size: 11, color: css(COL.b), weight: 700 });
  if (taps) {
    g.fillStyle = css(COL.cyan);
    for (let k = 0; k < taps.count; k++) {
      const along = (k + 0.5) / taps.count - 0.5;
      g.beginPath(); g.arc(X(cx + along * taps.majorU * n), Y(cy + along * taps.majorV * n), 3.6, 0, 2 * Math.PI); g.fill();
    }
  }
  // texel sizes of the levels around lambda, as squares
  let lx = 8;
  const legend = [[0, '#e7eaf0']];
  if (fp.lower > 0) legend.push([fp.lower, css(COL.b)]);
  if (fp.upper > fp.lower && fp.blend > 0) legend.push([fp.upper, css(COL.purple)]);
  for (const [k, color] of legend) {
    const side = Math.min(40, 2 ** k * scale);
    g.strokeStyle = color; g.lineWidth = 1.6; g.fillStyle = 'rgba(11,12,16,0.7)';
    g.fillRect(lx, h - 12 - side, side, side); g.strokeRect(lx, h - 12 - side, side, side);
    text(g, ordinal(k), lx, h - 14 - side, { size: 10.5, color });
    lx += Math.max(side, 58) + 10;
  }
  text(g, `${f(2 * half, 1)} texels across`, w - 6, 14, { size: 10.5, align: 'right', color: '#8b93a7' });
}

// ---------------------------------------------------------------- the level from the derivatives

const LEVEL_PRESETS = [
  { label: 'the lecture example', set: { manual: true, texId: 'check256', dudx: 0.0125, dvdx: 0.002, dudy: 0.001, dvdy: 0.009, show: 'level' } },
  { label: 'a near pixel', set: { manual: false, tilt: 66, tiles: 3, texId: 'check4', show: 'level', ...at(100, 140) } },
  { label: 'a middle pixel', set: { manual: false, tilt: 66, tiles: 3, texId: 'check4', show: 'level', ...at(100, 90) } },
  { label: 'a far pixel', set: { manual: false, tilt: 66, tiles: 3, texId: 'check4', show: 'level', ...at(100, 50) } },
  { label: 'facing the camera', set: { manual: false, tilt: 0, tiles: 2, texId: 'check4', show: 'level', ...at(100, 75) } },
];

function runLevel(m) {
  const tex = getTexture(m.texId);
  const [W, H] = floorSize(m);
  const { px, py } = pixelOf(m, W, H);
  const f0 = footprintOf(m, px, py, W, H);
  const fp = T.footprintLevel(f0.dudx, f0.dvdx, f0.dudy, f0.dvdy, tex.n, tex.levels);
  const tri = f0.hit ? T.sampleTrilinear(tex.pyramid, tex.n, tex.levels, f0.u, f0.v, fp.lambda, m.mode) : null;
  return { ...f0, ...fp, ...(tri ?? {}), tex, fp, tri, px, py, imageW: W, imageH: H };
}

function explainLevel(m, r) {
  if (!r.hit) return { hud: 'above the horizon', rows: ['the pixel is above the horizon: no footprint'], status: { text: 'sky', tone: 'info' } };
  const n = r.tex.n;
  const lam = r.lambda;
  const where = m.manual ? `the derivatives set by hand, ${n}-texel texture` : `pixel (${r.px}, ${r.py}) of ${r.imageW} × ${r.imageH}, ${n}-texel texture`;
  const rows = [
    `${where}`,
    `{dudx|∂u/∂x} = ${f(r.dudx, 4)}, {dvdx|∂v/∂x} = ${f(r.dvdx, 4)}, {dudy|∂u/∂y} = ${f(r.dudy, 4)}, {dvdy|∂v/∂y} = ${f(r.dvdy, 4)}`,
    `footprint along x = ${n} √(${f(r.dudx, 4)}² + ${f(r.dvdx, 4)}²) = {footprintX|${f3(r.footprintX)}} texels`,
    `footprint along y = ${n} √(${f(r.dudy, 4)}² + ${f(r.dvdy, 4)}²) = {footprintY|${f3(r.footprintY)}} texels`,
    `{rho|ρ} = max = {rho|${f3(r.rho)}},  {lambda|λ} = log₂ ρ = {lambda|${f3(lam)}}`,
  ];
  if (lam <= 0) rows.push(`λ ≤ 0: a pixel is smaller than a texel (magnification), so level 0`);
  else if (r.clamped < lam - 1e-9) rows.push(`λ is past the last level: level {upper|${r.top}} is the coarsest`);
  else {
    rows.push(
      `between level {lower|${r.lower}} (${f(r.texelsLower)} texels per pixel) and level {upper|${r.upper}} (${f(r.texelsUpper)} per pixel)`,
      `{blend|blend} = λ − ${r.lower} = {blend|${f3(r.blend)}}: ${f3(1 - r.blend)} of level ${r.lower}, ${f3(r.blend)} of level ${r.upper}`,
    );
  }
  if (r.tri) rows.push(`{value|value} = ${f3(1 - r.blend)}·{valueLower|${f3(r.valueLower)}} + ${f3(r.blend)}·{valueUpper|${f3(r.valueUpper)}} = {value|${f3(r.value)}}`);
  rows.push(`anisotropy = ${f(r.rho, 3)} / ${f(r.shorter, 3)} = ${f(r.anisotropy, 2)}; the shorter axis alone gives λ = ${f3(r.anisoLambda)}`);
  const status = lam <= 0 ? { text: `magnification: λ = ${f3(lam)}, level 0`, tone: 'info' }
    : r.anisotropy > 3 ? { text: `trilinear blends levels ${r.lower} and ${r.upper}; the footprint is ${f(r.anisotropy, 1)} times longer than wide, so both axes blur to the long one`, tone: 'warn' }
      : { text: `trilinear blends levels ${r.lower} and ${r.upper} at ${f3(r.blend)}`, tone: 'ok' };
  return {
    hud: `λ = log₂ ρ = log₂ {rho|${f3(r.rho)}} = {lambda|${f3(lam)}}   levels {lower|${r.lower}} and {upper|${r.upper}}, blend {blend|${f3(r.blend)}}`,
    rows, status,
    values: [['ρ', f3(r.rho), 'rho'], ['λ', f3(lam), 'lambda'], ['lower level', String(r.lower), 'lower'], ['upper level', String(r.upper), 'upper'], ['blend', f3(r.blend), 'blend'], ['value', r.tri ? f3(r.value) : 'none', 'value']],
  };
}

function levelPanel(host, m, r, ctx) {
  once(host, 'level', (h) => {
    h.refreshers.push(segmented(h, 'show', SHOW, () => m.show, (id) => { m.show = id; ctx.update(); }));
    textureRow(h, ['check4', 'check1', 'noise', 'checker8', 'check256'], m, ctx);
    resolutionRow(h, m, ctx);
    h.canvas = panelCanvas(h, 320, 280);
    el('p', 'lab-note', h, 'The pixel\'s footprint in the texture, as a parallelogram of the two derivative vectors. Thick lines mark the texels of the two levels blended.');
  });
  host.refreshers.forEach((s) => s());
  paintFootprint(host.canvas, m, r);
}

// ---------------------------------------------------------------- anisotropy

const ANISO_PRESETS = [
  { label: 'grazing floor, 16 taps', set: { manual: false, tilt: 74, tiles: 3, texId: 'check4', taps: 16, ...at(150, 100) } },
  { label: 'one tap (trilinear)', set: { manual: false, tilt: 74, tiles: 3, texId: 'check4', taps: 1, ...at(150, 100) } },
  { label: '4 taps', set: { manual: false, tilt: 74, tiles: 3, texId: 'check4', taps: 4, ...at(150, 100) } },
  { label: 'the chapter\'s far row', set: { manual: true, texId: 'check256', taps: 16, dudx: 0.94 / 256, dvdx: 0, dudy: 0, dvdy: -8.77 / 256 } },
  { label: 'facing the camera', set: { manual: false, tilt: 0, tiles: 2, texId: 'check4', taps: 16, ...at(100, 75) } },
];

function runAniso(m) {
  const tex = getTexture(m.texId);
  const [W, H] = floorSize(m);
  const { px, py } = pixelOf(m, W, H);
  const f0 = footprintOf(m, px, py, W, H);
  const fp = T.footprintLevel(f0.dudx, f0.dvdx, f0.dudy, f0.dvdy, tex.n, tex.levels);
  if (!f0.hit) return { ...f0, ...fp, tex, fp, px, py, imageW: W, imageH: H };
  const args = [tex.pyramid, tex.n, tex.levels, f0.u, f0.v, f0.dudx, f0.dvdx, f0.dudy, f0.dvdy];
  const an = T.sampleAnisotropic(...args, m.taps, m.mode);
  const tri = T.sampleTrilinear(tex.pyramid, tex.n, tex.levels, f0.u, f0.v, fp.lambda, m.mode);
  const ref = referenceFor(m, tex, f0, px, py, W, H);
  const byTaps = [];
  for (let k = 1; k <= 16; k++) byTaps.push(T.sampleAnisotropic(...args, k, m.mode).value);
  return { ...f0, ...fp, ...an, isoLambda: fp.lambda, triValue: tri.value, refValue: ref, byTaps, tex, fp, an, px, py, imageW: W, imageH: H };
}
/** the 16-sample average at pixel (px, py) of the W x H floor, or around the hand-set footprint */
function referenceFor(m, tex, f0, px, py, W, H) {
  if (!m.manual) return T.referenceAverage(tex.pyramid, tex.n, px, py, W, H, m.tilt, m.tiles, 4, m.mode).value;
  let sum = 0;
  for (let b = 0; b < 4; b++) {
    for (let a = 0; a < 4; a++) {
      const s = (a + 0.5) / 4 - 0.5, t = (b + 0.5) / 4 - 0.5;
      sum += T.sampleNearest(tex.pyramid, tex.n, 0, f0.u + s * f0.dudx + t * f0.dudy, f0.v + s * f0.dvdx + t * f0.dvdy, m.mode).value;
    }
  }
  return sum / 16;
}

function explainAniso(m, r) {
  if (!r.hit) return { hud: 'above the horizon', rows: ['the pixel is above the horizon'], status: { text: 'sky', tone: 'info' } };
  const n = r.tex.n;
  const errTri = Math.abs(r.triValue - r.refValue), errAn = Math.abs(r.value - r.refValue);
  const capped = Math.ceil(r.ratio - 0.01) > m.taps;
  const rows = [
    `footprint {footprintX|${f3(r.lengthX)}} × {footprintY|${f3(r.lengthY)}} texels: {longer|longer} ${f3(r.longer)}, {shorter|shorter} ${f3(r.shorter)}`,
    `{ratio|ratio} = longer / shorter = {ratio|${f(r.ratio, 2)}}`,
    `{taps|taps} = ⌈ratio⌉ = ${Math.max(1, Math.ceil(r.ratio - 0.01))}${capped ? `, held at the limit ${m.taps}` : ''} → {taps|${r.taps}}`,
    `{isoLambda|isotropic λ} = log₂ longer = ${f3(r.isoLambda)}`,
    `{lambda|anisotropic λ} = log₂ max(shorter, longer / taps) = {lambda|${f3(r.lambda)}}`,
    `${plural(r.taps, 'trilinear sample')} at λ = ${f3(Math.max(r.lambda, 0))}, spaced along (${f(r.majorU * n, 2)}, ${f(r.majorV * n, 2)}) texels`,
    `{trilinear|trilinear} = ${f3(r.triValue)}, {aniso|anisotropic} = {value|${f3(r.value)}}, {reference|16-sample average} = ${f3(r.refValue)}`,
    `error against the average: trilinear ${f3(errTri)}, anisotropic ${f3(errAn)}`,
  ];
  const status = r.ratio < 1.05 ? { text: 'a round footprint: one tap, and anisotropic filtering is plain trilinear', tone: 'ok' }
    : capped ? { text: `the ratio ${f(r.ratio, 1)} needs ${Math.ceil(r.ratio)} taps; the limit ${m.taps} blurs along the long axis again`, tone: 'warn' }
      : { text: `${plural(r.taps, 'tap')} along the long axis at λ = ${f3(r.lambda)}; trilinear's λ = ${f3(r.isoLambda)} blurs across the footprint`, tone: 'ok' };
  const bars = r.byTaps.map((v, k) => ({ x: k + 1, y: Math.abs(v - r.refValue), color: k + 1 === m.taps ? COL.gold : COL.cyan }));
  const top = Math.max(0.05, ...bars.map((b) => b.y)) * 1.1;
  return {
    hud: `{ratio|ratio} ${f(r.ratio, 2)} → {taps|${r.taps}} taps at λ = {lambda|${f3(r.lambda)}}   trilinear used {isoLambda|${f3(r.isoLambda)}}`,
    rows, status,
    chart: { x: [0.4, 16.6], y: [0, top], xLabel: 'tap limit', curve: 'error against the average', bars, at: m.taps, atY: Math.abs(r.byTaps[m.taps - 1] - r.refValue) },
    values: [['ratio', f(r.ratio, 2), 'ratio'], ['taps', String(r.taps), 'taps'], ['trilinear', f3(r.triValue), 'trilinear'], ['anisotropic', f3(r.value), 'aniso'], ['average', f3(r.refValue), 'reference'], ['λ iso', f3(r.isoLambda), 'isoLambda']],
  };
}

function anisoPanel(host, m, r, ctx) {
  once(host, 'aniso', (h) => {
    textureRow(h, ['check4', 'check1', 'noise', 'check256'], m, ctx);
    resolutionRow(h, m, ctx);
    h.canvas = panelCanvas(h, 320, 260);
    el('p', 'lab-note', h, 'Blue dots mark the samples along the long axis. Click a pixel in the left half or the right half of the image.');
  });
  host.refreshers.forEach((s) => s());
  paintFootprint(host.canvas, m, r, r.hit ? { taps: { count: r.taps, majorU: r.majorU, majorV: r.majorV } } : {});
}

// ---------------------------------------------------------------- cube map

const CUBE_INIT = { d: [0.303, -0.808, 0.505], size: 256 };
const CUBE_PRESETS = [
  { label: 'the lecture direction', set: { d: [0.303, -0.808, 0.505], size: 256 } },
  { label: 'along +x', set: { d: [1.5, 0, 0], size: 256 } },
  { label: 'toward an edge', set: { d: [1, 1, 0.3], size: 256 } },
  { label: 'toward a corner', set: { d: [1, 1, 1], size: 256 } },
  { label: 'down, a little off', set: { d: [0.3, -1.2, -0.4], size: 256 } },
  { label: '512 × 512 faces', set: { d: [0.303, -0.808, 0.505], size: 512 } },
];
const FACE_COLORS = [COL.a, COL.cyan, COL.c, COL.purple, COL.b, COL.amber];
const FACE_HOME = { eye: [3.6, 2.8, 4.8], target: [0, 0, 0] };
const SIZES = [['16', '16'], ['64', '64'], ['256', '256'], ['512', '512'], ['1024', '1024']];
const bytesText = (b) => (b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${(b / 1024).toFixed(1)} kB`);

function runCube(m) {
  const d = [m.d.x, m.d.y, m.d.z];
  const look = T.cubeLookup(d[0], d[1], d[2], m.size);
  const mem = T.cubeMemory(m.size, 3);
  return { ...look, ...mem, d };
}

function explainCube(m, r) {
  const sign = r.face % 2 === 0 ? 'positive' : 'negative';
  const second = [r.ax, r.ay, r.az].sort((p, q) => q - p)[1];
  const axis = 'XYZ'[Math.floor(r.face / 2)].toLowerCase();
  return {
    hud: `d = ${vt(r.d)} → face {face|${r.faceName}}, (s, t) = ({s|${f3(r.s)}}, {t|${f3(r.t)}}), texel ({texelX|${r.texelX}}, {texelY|${r.texelY}})`,
    rows: [
      `d = ${vt(r.d)}`,
      `|x|, |y|, |z| = ${f3(r.ax)}, ${f3(r.ay)}, ${f3(r.az)}: the largest is |${axis}| = {ma|${f3(r.ma)}}, and ${axis} is ${sign}`,
      `face {face|${r.faceName}}`,
      `{sc|sc} = ${f3(r.sc)}, {tc|tc} = ${f3(r.tc)}   (the other two components, signed as OpenGL does for ${r.faceName})`,
      `{s|s} = (sc / ma + 1) / 2 = (${f3(r.sc)} / ${f3(r.ma)} + 1) / 2 = {s|${f3(r.s)}}`,
      `{t|t} = (tc / ma + 1) / 2 = (${f3(r.tc)} / ${f3(r.ma)} + 1) / 2 = {t|${f3(r.t)}}`,
      `texel = (⌊s·${m.size}⌋, ⌊t·${m.size}⌋) = ({texelX|${r.texelX}}, {texelY|${r.texelY}}) of ${m.size} × ${m.size}`,
      `memory: ${m.size}² × 6 faces × 3 bytes = ${bytesText(r.bytes)}; with mips ${bytesText(r.withMips)}`,
    ],
    status: second > r.ma - 0.03 ? { text: `two components are within ${f3(r.ma - second)} of each other: near an edge of the cube, where a small move changes the face`, tone: 'warn' }
      : { text: `face ${r.faceName}: the ${axis} component is the largest and ${sign}`, tone: 'ok' },
    fact: 'The lookup divides by the largest component, which projects the direction onto the cube, then reads the face as an ordinary 2D texture with filtering and mipmaps. The sign conventions of sc and tc are the graphics application programming interface\'s (API).',
    values: [['face', r.faceName, 'face'], ['ma', f3(r.ma), 'ma'], ['s', f3(r.s), 's'], ['t', f3(r.t), 't'], ['texel x', String(r.texelX), 'texelX'], ['texel y', String(r.texelY), 'texelY']],
  };
}

function drawCube(v, m, r) {
  for (let face = 0; face < 6; face++) {
    const pts = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([s, t]) => { const p = T.cubeFacePoint(face, s, t); return V(p[0], p[1], p[2]); });
    const hit = face === r.face;
    v.patch(pts, FACE_COLORS[face], hit ? 0.38 : 0.1, { k: 'face' });
    v.poly(pts, FACE_COLORS[face], { closed: true, k: 'face' });
    const c = T.cubeFacePoint(face, 0.5, 0.5);
    v.label(['+X', '−X', '+Y', '−Y', '+Z', '−Z'][face], V(c[0] * 1.02, c[1] * 1.02, c[2] * 1.02), hit ? COL.white : FACE_COLORS[face], '', 'face');
  }
  const d = V(m.d.x, m.d.y, m.d.z);
  const hitPoint = T.cubeFacePoint(r.face, r.s, r.t);
  const hp = V(hitPoint[0], hitPoint[1], hitPoint[2]);
  v.arrow(V(), d, COL.gold, { k: 'face', r: 0.025, hr: 0.07, head: 0.18 });
  v.dashed(d, hp, COL.gold, { k: 'face' });
  v.point(hp, COL.white, { k: 's', r: 0.05 });
  // the s and t axes of the face read, from its (0, 0) corner
  const o = T.cubeFacePoint(r.face, 0, 0), s1 = T.cubeFacePoint(r.face, 0.25, 0), t1 = T.cubeFacePoint(r.face, 0, 0.25);
  const out = (p) => V(p[0] * 1.015, p[1] * 1.015, p[2] * 1.015);
  v.arrow(out(o), out(s1), COL.a, { k: 's', r: 0.014, hr: 0.05, head: 0.1, label: 's', anchor: 'a' });
  v.arrow(out(o), out(t1), COL.b, { k: 't', r: 0.014, hr: 0.05, head: 0.1, label: 't', anchor: 'a' });
  v.point(V(), COL.gray, { r: 0.04 });
}

function cubeCross(pc, m, r) {
  const { g, w, h } = pc;
  g.clearRect(0, 0, w, h);
  g.fillStyle = '#0b0c10';
  g.fillRect(0, 0, w, h);
  const F = Math.min((w - 16) / 4, (h - 16) / 3);
  const x0 = (w - 4 * F) / 2, y0 = (h - 3 * F) / 2;
  const at = { 2: [1, 0], 1: [0, 1], 4: [1, 1], 0: [2, 1], 5: [3, 1], 3: [1, 2] };
  for (const [face, [col, row]] of Object.entries(at)) {
    const k = Number(face), x = x0 + col * F, y = y0 + row * F;
    g.fillStyle = k === r.face ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)';
    g.fillRect(x, y, F, F);
    g.strokeStyle = css(FACE_COLORS[k]);
    g.lineWidth = k === r.face ? 2.4 : 1;
    g.strokeRect(x + 0.5, y + 0.5, F - 1, F - 1);
    text(g, ['+X', '−X', '+Y', '−Y', '+Z', '−Z'][k], x + 5, y + 14, { size: 11.5, color: css(FACE_COLORS[k]), weight: 700 });
    if (k === r.face) {
      const px = x + r.s * F, py = y + r.t * F;
      g.fillStyle = '#ffd166';
      g.beginPath(); g.arc(px, py, 4, 0, 2 * Math.PI); g.fill();
      text(g, `(${r.texelX}, ${r.texelY})`, px + (r.s > 0.6 ? -6 : 6), py + (r.t > 0.75 ? -7 : 14), { size: 10.5, color: '#ffd166', align: r.s > 0.6 ? 'right' : 'left' });
    }
  }
}

function cubePanel(host, m, r, ctx) {
  once(host, 'cube', (h) => {
    h.refreshers.push(segmented(h, 'face size', SIZES, () => String(m.size), (id) => { m.size = Number(id); ctx.update(); }));
    h.canvas = panelCanvas(h, 300, 190);
    el('p', 'lab-note', h, 'The six faces in the cross layout. s runs right and t runs down within a face; the dot is the lookup.');
  });
  host.refreshers.forEach((s) => s());
  cubeCross(host.canvas, m, r);
}

// ---------------------------------------------------------------- shadow map

const SHADOW_INIT = { p: [-1, 0, -0.5], res: 512, texels: 1.5 };
const SHADOW_PRESETS = [
  { label: 'in the box\'s shadow', set: { p: [-1, 0, -0.5], res: 512, texels: 1.5 } },
  { label: 'a lit floor point', set: { p: [2.5, 0, 0], res: 512, texels: 1.5 } },
  { label: 'no bias: shadow acne', set: { p: [2.5, 0, 0], res: 512, texels: 0 } },
  { label: 'a texel and a half', set: { p: [2.5, 0, 0], res: 512, texels: 1.5 } },
  { label: '64 × 64 map', set: { p: [-1, 0, -0.5], res: 64, texels: 1.5 } },
  { label: 'too much bias', set: { p: [-0.55, 0, 0.2], res: 512, texels: 96 } },
];
const SHADOW_HOME = { eye: [6, 4.6, 7.2], target: [0.4, 0.5, 0.2] };
const RES = [['64', '64'], ['128', '128'], ['256', '256'], ['512', '512']];

function runShadow(m) {
  const p = [m.p.x, m.p.y, m.p.z];
  const biasInfo = T.shadowBias(m.res, m.texels);
  const test = T.shadowTest(p, m.res, biasInfo.bias);
  const cell = test.inside ? T.storedDepth(test.i, test.j, m.res) : null;
  return { ...test, ...biasInfo, p, cell, res: m.res };
}

function explainShadow(m, r) {
  const L = T.LIGHT_DIR;
  const source = r.cell ? (r.cell.hitsBox ? 'the box' : 'the floor') : 'nothing';
  let status;
  if (!r.inside) status = { text: 'outside the light camera\'s view: no stored depth, treated as lit', tone: 'info' };
  else if (r.inShadow && r.cell && !r.cell.hitsBox) status = { text: `lit floor reported in shadow: the point is ${f(r.difference, 4)} deeper than the texel center and the bias ${f(r.bias, 4)} does not cover it (shadow acne)`, tone: 'bad' };
  else if (r.inShadow) status = { text: `in shadow: ${source} is ${f3(r.difference)} nearer the light than the point`, tone: 'warn' };
  else if (r.cell && r.cell.hitsBox && r.difference > 0.0005) status = { text: `lit although the box is ${f3(r.difference)} nearer the light: the bias ${f(r.bias, 3)} is larger, so the shadow has detached from the box (peter-panning)`, tone: 'warn' };
  else status = { text: `lit: stored ${f3(r.stored)}, own ${f3(r.own)}; they match to within the bias ${f(r.bias, 4)}`, tone: 'ok' };
  return {
    hud: `own {own|${f3(r.own)}} − stored {stored|${f3(r.stored)}} = {difference|${f3(r.difference)}} ${r.inShadow ? '>' : '≤'} bias {bias|${f(r.bias, 4)}}: ${r.inShadow ? 'in shadow' : 'lit'}`,
    rows: [
      `light direction L = ${vt(L)}; the light camera is orthographic, 6 × 6 at ${m.res}² texels`,
      `point P = ${vt(r.p)}, own depth = L·(P − origin) = {own|${f3(r.own)}}`,
      `light-view coordinates ({a|${f(r.a, 3)}}, {b|${f(r.b, 3)}}) → texel (i, j) = ⌊(a/6 + 0.5)·${m.res}⌋ = (${r.i}, ${r.j})`,
      r.inside ? `the map stores {stored|${f3(r.stored)}} at that texel (${source})` : 'that texel is outside the map',
      `{difference|difference} = ${f3(r.own)} − ${f3(r.stored)} = {difference|${f3(r.difference)}}`,
      `bias = ${f(m.texels, 2)} texels × {perTexel|${f(r.perTexel, 4)}} per texel = {bias|${f(r.bias, 4)}}`,
      `in shadow when difference > bias: ${r.inShadow ? 'yes' : 'no'}`,
    ],
    status,
    fact: 'Williams, "Casting Curved Shadows on Curved Surfaces" (SIGGRAPH 1978). The test is the depth buffer\'s comparison made from the light. Too small a bias gives shadow acne; too large detaches the shadow from its object (peter-panning).',
    values: [['own depth', f3(r.own), 'own'], ['stored', f3(r.stored), 'stored'], ['difference', f3(r.difference), 'difference'], ['bias', f(r.bias, 4), 'bias'], ['texel', f(r.texel, 4), 'texel'], ['per texel', f(r.perTexel, 4), 'perTexel']],
  };
}

function drawShadow(v, m, r) {
  const axes = T.lightAxes();
  const P = (a) => V(a[0], a[1], a[2]);
  // the floor and the box
  v.groundPolygon([V(-3, 0, -3), V(3, 0, -3), V(3, 0, 3), V(-3, 0, 3)], COL.gray, 0.1, { k: 'floor' });
  for (let k = -3; k <= 3; k++) {
    v.poly([V(k, 0.001, -3), V(k, 0.001, 3)], COL.dim, { k: 'floor' });
    v.poly([V(-3, 0.001, k), V(3, 0.001, k)], COL.dim, { k: 'floor' });
  }
  v.box(V(-0.5, 0, -0.5), V(1, 0, 0), V(0, 1, 0), V(0, 0, 1), COL.amber, { k: 'box', opacity: 0.2 });
  // where the box's shadow falls: its corners carried along the light to the floor, as a convex outline
  const along = T.LIGHT_DIR;
  const projected = [];
  for (const x of [T.BOX_MIN[0], T.BOX_MAX[0]]) for (const y of [T.BOX_MIN[1], T.BOX_MAX[1]]) for (const z of [T.BOX_MIN[2], T.BOX_MAX[2]]) projected.push([x - along[0] * (y / along[1]), z - along[2] * (y / along[1])]);
  v.groundPolygon(convexHull(projected).map(([x, z]) => V(x, 0, z)), COL.b, 0.3, { k: 'shadowarea', y: 0.003 });
  // the light, a short way up its own direction
  const o = T.LIGHT_ORIGIN, d = T.LIGHT_DIR;
  const start = T.scale(d, -4.2), tip = T.scale(d, -2.6);
  v.arrow(P(start), P(tip), COL.gold, { k: 'light', r: 0.03, hr: 0.1, head: 0.28, label: 'light', anchor: 'a' });
  // the point, the texel's ray, and what the map stores
  const pt = P(r.p);
  const texelOrigin = r.cell ? T.add(o, T.add(T.scale(axes.right, r.cell.a), T.scale(axes.up, r.cell.b))) : null;
  if (texelOrigin) {
    const stored = P(T.add(texelOrigin, T.scale(d, r.stored)));
    v.dashed(P(T.add(texelOrigin, T.scale(d, r.stored - 2.5))), stored, COL.b, { k: 'stored' });
    v.point(stored, COL.b, { k: 'stored', r: 0.07, label: 'stored', anchor: 'l' });
    if (r.difference > 0.0005) v.bar(stored, pt, r.inShadow ? COL.red : COL.amber, { k: 'difference', r: 0.014 });
  }
  v.point(pt, r.inShadow ? COL.red : COL.green, { k: 'own', r: 0.09 });
  v.label(r.inShadow ? 'in shadow' : 'lit', pt, r.inShadow ? COL.red : COL.green, 'br', 'own');
}

/** the convex hull of 2D points (Andrew's monotone chain), counter-clockwise */
function convexHull(points) {
  const pts = points.slice().sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const build = (list) => {
    const out = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], p) <= 1e-12) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...build(pts), ...build(pts.slice().reverse())];
}

let shadowMapCache = { key: '', cells: null };
function shadowMapCells(res, bias) {
  const key = `${res}|${bias.toFixed(5)}`;
  if (shadowMapCache.key === key) return shadowMapCache.cells;
  const N = 120, cells = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) cells[j * N + i] = T.shadowTest([-3 + (i + 0.5) * 6 / N, 0, -3 + (j + 0.5) * 6 / N], res, bias).inShadow ? 1 : 0;
  }
  shadowMapCache = { key, cells };
  return cells;
}

function shadowTopDown(pc, m, r) {
  const { g, w, h } = pc;
  g.clearRect(0, 0, w, h);
  const N = 120, cells = shadowMapCells(m.res, r.bias);
  const img = g.createImageData(N, N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const k = (j * N + i) * 4, shadow = cells[j * N + i];
      img.data[k] = shadow ? 36 : 214; img.data[k + 1] = shadow ? 52 : 214; img.data[k + 2] = shadow ? 96 : 214; img.data[k + 3] = 255;
    }
  }
  const off = document.createElement('canvas');
  off.width = N; off.height = N;
  off.getContext('2d').putImageData(img, 0, 0);
  const side = Math.min(w, h) - 8, x0 = (w - side) / 2, y0 = (h - side) / 2;
  g.imageSmoothingEnabled = false;
  g.drawImage(off, x0, y0, side, side);
  const X = (x) => x0 + ((x + 3) / 6) * side, Z = (z) => y0 + ((z + 3) / 6) * side;
  g.strokeStyle = '#ffa657'; g.lineWidth = 1.5;
  g.strokeRect(X(-0.5), Z(-0.5), side / 6, side / 6);
  const light = Math.hypot(T.LIGHT_DIR[0], T.LIGHT_DIR[2]);
  arrow2d(g, X(2.4), Z(-2.4), X(2.4) + (T.LIGHT_DIR[0] / light) * 28, Z(-2.4) + (T.LIGHT_DIR[2] / light) * 28, '#ffd166', 1.8, 7);
  text(g, 'light', X(2.4) - 4, Z(-2.4) - 6, { size: 10.5, color: '#ffd166', align: 'center' });
  g.fillStyle = r.inShadow ? '#ff5a52' : '#3fd97f';
  g.strokeStyle = '#0b0c10'; g.lineWidth = 1.5;
  g.beginPath(); g.arc(X(r.p[0]), Z(r.p[2]), 5, 0, 2 * Math.PI); g.fill(); g.stroke();
  const shadowFraction = cells.reduce((s, c) => s + c, 0) / cells.length;
  text(g, `${f(100 * shadowFraction, 1)} % of the floor tests as shadow`, x0 + 6, y0 + side - 7, { size: 11, color: '#14161d', halo: false, weight: 600 });
}

function shadowPanel(host, m, r, ctx) {
  once(host, 'shadow', (h) => {
    h.refreshers.push(segmented(h, 'map size', RES, () => String(m.res), (id) => { m.res = Number(id); ctx.update(); }));
    h.canvas = panelCanvas(h, 300, 290);
    el('p', 'lab-note', h, 'The floor seen from above, each point tested the way the dot is. Dark blue is shadow; the orange square is the box. With no bias, lit floor fails its own test in stripes.');
  });
  host.refreshers.forEach((s) => s());
  shadowTopDown(host.canvas, m, r);
}

// ---------------------------------------------------------------- the catalog

export function makeViews() {
  return [
    lookupView('lookup.nearest', 'nearest', 'nearest', ['Wrap modes', 'Nearest']),
    lookupView('lookup.bilinear', 'bilinear', 'bilinear', ['Wrap modes', 'Bilinear']),
    {
      id: 'floor', topic: 'regimes', label: 'the floor', group: 'floor', init: FLOOR_INIT, params: [TILT, TILES], presets: FLOOR_PRESETS,
      home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false, regions: ['Floor pixel', 'Shade a pixel'], inputTitle: 'Floor',
      setup: (ctx) => floorSetup(ctx),
      leave: (ctx) => leaveOverlay(ctx),
      run: runFloor,
      draw(v, m, r, ctx) { drawFloor(ctx, m); },
      enter(m) { m.manual = false; },
      explain: explainFloor, panelTitle: 'Sampler', panel: floorPanel,
    },
    {
      id: 'pyramid', topic: 'mip', label: 'the pyramid', init: PYR_INIT, params: [{ id: 'level', label: 'level', min: 1, max: 6, step: 1 }], presets: PYR_PRESETS,
      home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false, regions: ['Pyramid layout', 'Box filter'], inputTitle: 'Texel',
      setup(ctx) {
        setupOverlay(ctx, { down: (x, y) => pyramidPick(ctx, x, y), move: (x, y) => pyramidPick(ctx, x, y) });
      },
      leave: (ctx) => leaveOverlay(ctx),
      run: runPyramid,
      draw(v, m, r, ctx) {
        const ov = ctx.sceneEl ? overlayFor(ctx) : null;
        if (!ov) return;
        ov.painter = (g, w, h) => paintPyramid(ov, g, w, h, m, r);
        ov.repaint();
      },
      explain: explainPyramid,
    },
    {
      id: 'level', topic: 'mip', label: 'level from derivatives', group: 'floor', init: FLOOR_INIT, params: [TILT, TILES], presets: LEVEL_PRESETS,
      home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false, regions: ['Footprint and level', 'Trilinear'], inputTitle: 'Floor',
      setup: (ctx) => floorSetup(ctx),
      leave: (ctx) => leaveOverlay(ctx),
      enter(m) { if (m.show !== 'level') m.show = 'level'; },
      run: runLevel,
      draw(v, m, r, ctx) { drawFloor(ctx, { ...m, filter: 'trilinear', show: m.show }); },
      explain: explainLevel, panelTitle: 'Footprint', panel: levelPanel,
    },
    {
      id: 'aniso', topic: 'aniso', label: 'taps along the long axis', group: 'floor', init: FLOOR_INIT,
      params: [{ id: 'taps', label: 'tap limit', min: 1, max: 16, step: 1 }, TILT, TILES], presets: ANISO_PRESETS,
      home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false, regions: ['Anisotropic'], inputTitle: 'Taps',
      setup: (ctx) => floorSetup(ctx),
      leave: (ctx) => leaveOverlay(ctx),
      enter(m) {
        if (m.show !== 'color') m.show = 'color';
        if (m.tilt < 45 && !m.manual) { m.tilt = 74; m.tiles = 3; Object.assign(m, at(150, 100)); }
      },
      run: runAniso,
      draw(v, m, r, ctx) {
        drawFloor(ctx, m, {
          split: 'aniso',
          extra: (g, rect) => {
            pill(g, 'trilinear: one sample', rect.x + 8, rect.y + rect.h - 10, '#79c0ff', 'left');
            pill(g, `anisotropic: up to ${m.taps} taps`, rect.x + rect.w - 8, rect.y + rect.h - 10, '#7ee787', 'right');
          },
        });
      },
      explain: explainAniso, panelTitle: 'Taps', panel: anisoPanel,
    },
    {
      id: 'cube', topic: 'cube', label: 'direction to texel', init: CUBE_INIT, handles: [{ id: 'd', label: 'd', color: COL.gold }], presets: CUBE_PRESETS,
      home: FACE_HOME, regions: ['Cube map lookup', 'Cube map memory'], inputTitle: 'Direction',
      run: runCube, draw: drawCube, explain: explainCube, panelTitle: 'Cross layout', panel: cubePanel,
    },
    {
      id: 'shadow', topic: 'shadow', label: 'depth from the light', init: SHADOW_INIT, handles: [{ id: 'p', label: 'P', color: COL.green, fixed: 'y' }],
      params: [{ id: 'texels', label: 'bias, texels', min: 0, max: 100, step: 0.25 }], presets: SHADOW_PRESETS,
      home: SHADOW_HOME, regions: ['Shadow map texel', 'Shadow test', 'Shadow bias'], inputTitle: 'Point and bias',
      run: runShadow, draw: drawShadow, explain: explainShadow, panelTitle: 'Floor from above', panel: shadowPanel,
    },
  ];
}

/** a label on a dark pill, for text over an image */
function pill(g, str, x, y, color, align) {
  g.font = '700 12px -apple-system, Segoe UI, Roboto, sans-serif';
  const w = g.measureText(str).width + 14;
  g.fillStyle = 'rgba(11,12,16,0.85)';
  g.fillRect(align === 'right' ? x - w : x, y - 15, w, 21);
  text(g, str, align === 'right' ? x - 7 : x + 7, y, { size: 12, color, weight: 700, align, halo: false });
}

function pyramidPick(ctx, x, y) {
  const ov = overlayFor(ctx);
  const boxes = ov.pyramidBoxes;
  if (!boxes) return;
  const m = ctx.state();
  for (let k = 0; k < boxes.length; k++) {
    const b = boxes[k];
    if (x >= b.x && y >= b.y && x < b.x + b.size * b.cell && y < b.y + b.size * b.cell) {
      const i = Math.floor((x - b.x) / b.cell), j = b.size - 1 - Math.floor((y - b.y) / b.cell);
      if (k === 0) { m.level = 1; m.ti = i >> 1; m.tj = j >> 1; } else { m.level = k; m.ti = i; m.tj = j; }
      ctx.refresh();
      return;
    }
  }
}
