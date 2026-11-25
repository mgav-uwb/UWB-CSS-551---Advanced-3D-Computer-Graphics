// dct-lab-views-rebuild: the two views that rebuild an image from its coefficients. rebuild adds the basis images one at a time in zigzag order,
// with coefficients that can be suppressed; lowpass keeps the lowest k x k block and charts peak signal-to-noise ratio (PSNR) against k. Both
// work on the toy image, the rendered picture in 8 x 8 blocks, or an input the held file supplies (held[id] = { n, data, label, presets }).
import { COL } from '../core/lab-viz.js';
import { drawChart } from './image-lab-draw.js';
import {
  mode, f, grayRgb, signedRgb, midGrayRgb, outline, text, el, segmented, once, inputOf, inputChoices, analyze, blockOf, areaOf, tiles, cap, cells, coefColor,
  dim, crossOut, withHeaders, drawHeaders, headerHit, overlayView, reslide, clamp, zigzagOf, progressive, lowpassOf, lowpassCurve, psnr, dbText,
  dropMask, dropTokens, toggleDrop, dropWords, basisSet, sumSq,
} from './dct-lab-draw.js';

/** a curve of PSNR values (null = exact) drawn up to 60 dB, with the exact points at the top: { clip, top, low } */
function dbRange(db) {
  const fin = db.filter((v) => v !== null).map((v) => Math.min(60, v)), top = Math.min(60, Math.ceil((fin.length ? Math.max(...fin) : 10) / 5) * 5 + 5);
  return { top, low: Math.max(0, Math.floor(Math.min(...fin, top - 5) / 5) * 5), clip: (v) => (v === null ? top : Math.min(top, v)) };
}
const mseText = (mse) => (mse < 1e-12 ? '0' : mse < 0.001 ? mse.toExponential(2) : f(mse, 4));
/** the color scale of a coefficient image: the largest coefficient other than the mean of a block, so the mean saturates and the rest shows */
const acScale = (an) => { let s = 0; for (const b of an.blocks) for (let i = 1; i < b.Y.length; i++) s = Math.max(s, Math.abs(b.Y[i])); return s || 1; };

/** a coefficient grid with headers; use dims the ones not in the sum, dropped are crossed out, keep outlines the k x k block, last outlines one */
function coefGrid(g, rect, bn, Y, o) {
  const cr = withHeaders(rect), toks = new Set(dropTokens(o.drop ?? ''));
  drawHeaders(g, cr, bn, { dropU: (u) => toks.has(`c${u}`), dropV: (v) => toks.has(`r${v}`) });
  cells(g, Y, bn, bn, cr, { color: coefColor(o.scale), dec: o.dec ?? 2, minCell: o.minCell });
  const cw = cr.w / bn;
  for (let idx = 0; idx < bn * bn; idx++) {
    const v = Math.floor(idx / bn), u = idx % bn, box = { x: cr.x + u * cw, y: cr.y + v * cw, w: cw, h: cw };
    if (o.use && !o.use[idx]) dim(g, box, 0.6);
    if (o.keep && (u >= o.keep || v >= o.keep)) dim(g, box, 0.6);
    if (o.dropped && o.dropped[idx]) { dim(g, box, 0.45); crossOut(g, box); }
  }
  if (o.keep) outline(g, cr.x, cr.y, o.keep * cw, o.keep * cw, '#7ee787', 2.5);
  if (o.last !== null && o.last !== undefined) outline(g, cr.x + (o.last % bn) * cw, cr.y + Math.floor(o.last / bn) * cw, cw, cw, '#ffd166', 2.5);
  return cr;
}

/** a picture-sized panel (the whole input) with the blocks' grid and the chosen block outlined */
function picturePanel(g, rect, an, vals, color, { dec = 2, blockGrid = true, selected = null, extra = null } = {}) {
  cells(g, vals, an.S, an.S, rect, { color, dec });
  if (an.nb > 1) {
    const bw = rect.w / an.nb;
    if (blockGrid) {
      g.strokeStyle = 'rgba(255,255,255,0.16)'; g.lineWidth = 1; g.beginPath();
      for (let k = 1; k < an.nb; k++) { g.moveTo(rect.x + k * bw, rect.y); g.lineTo(rect.x + k * bw, rect.y + rect.h); g.moveTo(rect.x, rect.y + k * bw); g.lineTo(rect.x + rect.w, rect.y + k * bw); }
      g.stroke();
    }
    if (extra) extra(bw);
    if (selected) outline(g, rect.x + selected.bx * bw, rect.y + selected.by * bw, bw, bw, '#ffd166', 2.5);
  }
}

/** the lab's common rail controls for these two views: the input, its size, and a note */
function inputControls(host, m, held, id, sync, ctx, notes) {
  once(host, id, (h) => {
    h.refreshers.push(segmented(h, 'image', inputChoices(held), () => m.input, (v) => { m.input = v; m.drop = ''; sync(m, ctx, true); }));
    h.refreshers.push(segmented(h, 'size', [[4, '4 × 4'], [5, '5 × 5']], () => m.n, (v) => { m.n = v; m.input = 'toy'; m.drop = ''; sync(m, ctx, true); }));
    h.sizeRow = h.lastElementChild;
    if (id === 'rebuild') {
      const b = el('div', 'lab-btns', h);
      const restore = el('button', 'lab-btn', b, 'restore all');
      restore.type = 'button';
      restore.addEventListener('click', (e) => { e.stopPropagation(); restore.blur(); m.drop = ''; ctx.update(); });
      h.restore = restore;
    }
    h.note = el('p', 'lab-note', h, '');
  });
  host.refreshers.forEach((s) => s());
  host.sizeRow.style.display = m.input === 'toy' ? '' : 'none';
  host.note.textContent = notes(m);
}

// ---------------------------------------------------------------- rebuild: one basis image at a time

export function rebuildView(held, shared) {
  const lim = { max: 16 };
  const rangeOf = (m) => { const i = inputOf(m, held); return i.bn * i.bn; };
  /** the slider's range follows the input: a changed range reopens the view, since the lab reads a view's sliders when it opens it */
  const sync = (m, ctx, force = false) => {
    const prev = lim.max;
    lim.max = rangeOf(m); m.cnt = clamp(m.cnt, 0, lim.max);
    if ((lim.max !== prev) && ctx?.setView) reslide(ctx, 'rebuild'); else if (force && ctx?.update) ctx.update();
  };
  const P = (label, set) => ({ label, run: (m, ctx) => { Object.assign(m, { drop: '' }, set); sync(m, ctx); } });
  const heldPresets = Object.values(held).flatMap((h) => (h.data ? (h.presets?.rebuild ?? []) : [])).map((p) => P(p.label, p.set));
  const view = overlayView({
    id: 'rebuild', topic: 'rebuild', label: 'Add one at a time', group: shared.group, init: { ...shared.baseInit, cnt: 3 },
    presets: [
      ...shared.toyPresets().map((p) => P(p.label, p.set)),
      P('the edge: drop row v = 1 (no change)', { input: 'toy', toy: 'edge', drop: 'r1', cnt: 9999 }),
      P('the edge: drop column u = 1', { input: 'toy', toy: 'edge', drop: 'c1', cnt: 9999 }),
      P('the blob without its mean', { input: 'toy', toy: 'blob', drop: 'e0.0', cnt: 9999 }),
      P('the picture, 6 coefficients per block', { input: 'picture', cnt: 6 }),
      P('the picture, only the mean', { input: 'picture', cnt: 1 }),
      ...heldPresets,
    ],
    inputTitle: 'Coefficients added', panelTitle: 'Image and suppression',
    enter(m) { lim.max = rangeOf(m); m.cnt = clamp(m.cnt, 0, lim.max); },
    run(m) {
      const input = inputOf(m, held), an = analyze(input), bn = an.bn, max = bn * bn;
      lim.max = max; m.cnt = clamp(Math.round(m.cnt), 0, max);
      const dropped = dropMask(bn, m.drop), order = zigzagOf(bn), use = new Uint8Array(max);
      for (let s = 0; s < m.cnt; s++) if (!dropped[order[s]]) use[order[s]] = 1;
      const prog = progressive(an, dropped, m.cnt), partial = prog.partial, p = psnr(an.X, partial);
      const err = Array.from(an.X, (v, k) => v - partial[k]);
      let omitSq = 0;
      for (const blk of an.blocks) for (let i = 0; i < max; i++) if (!use[i]) omitSq += blk.Y[i] * blk.Y[i];
      const blk = blockOf(an, m), last = m.cnt > 0 ? order[m.cnt - 1] : null;
      const masked = new Float64Array(an.S * an.S);
      if (an.nb > 1) for (const b of an.blocks) for (let i = 0; i < max; i++) if (use[i]) masked[(b.by * bn + Math.floor(i / bn)) * an.S + b.bx * bn + (i % bn)] = b.Y[i];
      return { input, an, bn, max, dropped, order, use, prog, partial, err, mse: p.mse, db: p.db, blk, last, omitSq, errSq: sumSq(err), totalSq: sumSq(an.X), masked,
        nUsed: use.reduce((s, v) => s + v, 0), scale: acScale(an) };
    },
    paint(g, w, h, ov, m, r) {
      const { an, bn } = r, pic = an.nb > 1, a = areaOf(w, h, ov, { hudLines: 2 }), lay = { bn, pic, an };
      const rects = tiles(a, pic ? [{}, {}, {}, {}, {}, {}] : [{}, {}, {}, {}, {}], { gap: mode.narrow ? 12 : 18 });
      const [ra, rb, rc, rd, re, rf] = pic ? [rects[0], rects[1], rects[2], rects[3], rects[5], rects[4]] : rects;
      const sel = pic ? { bx: Math.min(an.nb - 1, m.bx), by: Math.min(an.nb - 1, m.by) } : null;
      cap(g, ra, pic ? 'rendered picture (original)' : 'original image X', pic ? 'gray, 64 × 64, in 8 × 8 blocks' : `${bn} × ${bn} pixel values`, { short: pic ? 'rendered picture' : 'original X' });
      picturePanel(g, ra, an, an.X, grayRgb, { selected: sel, dec: 2 });
      lay.pics = [ra];
      if (pic) {
        cap(g, rb, 'coefficients used so far', 'each block holds its own 8 × 8 coefficients', { short: 'coefficients used' });
        picturePanel(g, rb, an, r.masked, coefColor(r.scale), { selected: sel });
      } else {
        cap(g, rb, 'coefficients Y', 'rows v, columns u; dimmed: not added yet');
        lay.coef = coefGrid(g, rb, bn, an.blocks[0].Y, { scale: r.scale, use: r.use, dropped: r.dropped, drop: m.drop, last: r.last, dec: 2 });
      }
      cap(g, rc, 'partial sum', `the first ${m.cnt} basis images, each weighted`);
      picturePanel(g, rc, an, r.partial, grayRgb, { selected: sel });
      cap(g, rd, 'error: original minus sum', `peak signal-to-noise ratio (PSNR) ${dbText(r.db, 1)}`, { short: 'error image' });
      picturePanel(g, rd, an, r.err, signedRgb(0.4), { selected: sel });
      if (pic) lay.pics.push(rb, rc, rd);
      if (pic) {
        cap(g, rf, `coefficients of block (${sel.bx}, ${sel.by})`, 'click a number or a cell to drop it', { short: `block (${sel.bx}, ${sel.by})` });
        lay.coef = coefGrid(g, rf, bn, r.blk.Y, { scale: r.scale, use: r.use, dropped: r.dropped, drop: m.drop, last: r.last, dec: 1, minCell: 24 });
      }
      // the basis image being added
      const wgt = r.last === null ? null : r.blk.Y[r.last], B = basisSet(bn);
      if (r.last === null) {
        cap(g, re, 'basis image being added', 'none yet: slide m up or press play', { short: 'basis image added' });
        g.fillStyle = '#12151c'; g.fillRect(re.x, re.y, re.w, re.h);
      } else {
        const u = r.last % bn, v = Math.floor(r.last / bn), gone = r.dropped[r.last];
        cap(g, re, `basis image (u ${u}, v ${v})`, gone ? 'dropped: left out of the sum' : `added with its weight ${f(wgt, 3)}`);
        cells(g, B[r.last], bn, bn, re, { color: midGrayRgb(2 / bn), dec: 2 });
        if (gone) { dim(g, re, 0.55); crossOut(g, re); }
      }
      return lay;
    },
    hit(x, y, m, lay, ctx, phase) {
      const { bn, an } = lay;
      const ch = lay.coef ? headerHit(lay.coef, bn, x, y) : null;
      if (ch) {
        if (phase !== 'down') return false;
        m.drop = toggleDrop(m.drop, ch.cell ? `e${ch.cell.v}.${ch.cell.u}` : ch.col !== undefined ? `c${ch.col}` : `r${ch.row}`);
        return true;
      }
      for (const p of lay.pics ?? []) {
        if (an.nb > 1 && x >= p.x && y >= p.y && x < p.x + p.w && y < p.y + p.h) { m.bx = Math.min(an.nb - 1, Math.floor(((x - p.x) / p.w) * an.nb)); m.by = Math.min(an.nb - 1, Math.floor(((y - p.y) / p.h) * an.nb)); return true; }
      }
      return false;
    },
    explain(m, r) {
      const { max, db, mse } = r, cnt = m.cnt, pct = (100 * (1 - r.omitSq / r.totalSq));
      const lastText = r.last === null ? 'nothing yet: the partial sum is all 0 and the error image is the original'
        : `coefficient (u ${r.last % r.bn}, v ${Math.floor(r.last / r.bn)}), weight ${f(r.blk.Y[r.last], 3)}${r.dropped[r.last] ? ': dropped, so nothing is added' : ' times its basis image'}`;
      const drops = dropWords(m.drop, r.bn);
      const rows = [
        `{cnt|${cnt} of ${max}} coefficients added in zigzag order (low frequencies first, along the anti-diagonals); {drop|${r.nUsed}} are in the sum`,
        `mean squared error (MSE) {mse|${mseText(mse)}}; peak signal-to-noise ratio (PSNR) = 10 log10(1 / MSE) = {psnr|${dbText(db, 2)}} for pixel values in [0, 1]`,
        `added last: ${lastText}`,
        `suppressed: {drop|${drops}}`,
        `squared error ${f(r.errSq, 4)} = squared size of the coefficients left out ${f(r.omitSq, 4)} (an orthonormal basis keeps sums of squares)`,
      ];
      const anyDrop = drops !== 'nothing';
      let status;
      if (cnt === max && !anyDrop) status = { text: `all ${max} coefficients added and none dropped: the image comes back exactly, a change of basis loses nothing`, tone: 'ok' };
      else if (anyDrop && cnt === max) status = { text: `all added, but ${drops} left out: the image cannot come back exactly (${dbText(db, 1)})`, tone: 'warn' };
      else if (cnt === 0) status = { text: 'nothing added: the partial sum is 0 everywhere, so the error image is the original', tone: 'info' };
      else status = { text: `the ${r.nUsed} coefficients in the sum hold ${f(pct, 1)} % of the total squared size of the coefficients`, tone: pct >= 95 ? 'ok' : pct < 50 ? 'warn' : 'info' };
      const { top, low, clip } = dbRange(r.prog.db);
      return {
        hud: `{cnt|${cnt} of ${max}} added: peak signal-to-noise ratio (PSNR) {psnr|${dbText(db, 2)}}`,
        rows, status,
        chart: { x: [0, max], y: [low, top], curve: 'PSNR (dB) against coefficients added', xLabel: 'coefficients added', series: [{ color: COL.c, fn: (x) => clip(r.prog.db[Math.round(x)] ?? null) }], at: cnt, atY: clip(db) },
        values: [['added', `${cnt} of ${max}`, 'cnt'], ['PSNR', dbText(db, 2), 'psnr'], ['MSE', mseText(mse), 'mse'], ['suppressed', drops, 'drop']],
      };
    },
    panel(host, m, r, ctx) {
      inputControls(host, m, held, 'rebuild', sync, ctx, (mm) => (mm.input === 'picture'
        ? 'Click a row number (v), a column number (u) or a cell in the grid to drop it, and again to bring it back. Click the picture to choose the block shown in the grid; a dropped coefficient is left out of every block.'
        : 'Click a row number (v) to drop that vertical frequency, a column number (u) to drop that horizontal frequency, or a cell to drop one coefficient. Click again to bring it back.'));
    },
  });
  Object.defineProperty(view, 'params', {
    get: () => [{ id: 'cnt', label: 'added (m)', min: 0, max: lim.max, step: 1, play: 'loop', rate: () => Math.max(2, lim.max / 10), format: (v) => `${v} of ${lim.max}` }],
  });
  return view;
}

// ---------------------------------------------------------------- lowpass: keep the lowest k x k block

export function lowpassView(held, shared) {
  const lim = { max: 4 };
  const rangeOf = (m) => inputOf(m, held).bn;
  const sync = (m, ctx, force = false) => {
    const prev = lim.max;
    lim.max = rangeOf(m); m.k = clamp(m.k, 1, lim.max);
    if (lim.max !== prev && ctx?.setView) reslide(ctx, 'lowpass'); else if (force && ctx?.update) ctx.update();
  };
  const P = (label, set) => ({ label, run: (m, ctx) => { Object.assign(m, set); sync(m, ctx); } });
  const heldPresets = Object.values(held).flatMap((h) => (h.data ? (h.presets?.lowpass ?? []) : [])).map((p) => P(p.label, p.set));
  const view = overlayView({
    id: 'lowpass', topic: 'lowpass', label: 'Keep the lowest k × k', group: shared.group, init: { ...shared.baseInit, k: 2 },
    presets: [
      ...shared.toyPresets().map((p) => P(p.label, p.set)),
      P('k = 1: only the mean', { k: 1 }),
      P('the picture, k = 2', { input: 'picture', k: 2 }),
      P('the picture, k = 4', { input: 'picture', k: 4 }),
      P('the picture, k = 8: exact', { input: 'picture', k: 8 }),
      ...heldPresets,
    ],
    inputTitle: 'Block kept', panelTitle: 'Image',
    enter(m) { lim.max = rangeOf(m); m.k = clamp(m.k, 1, lim.max); },
    run(m) {
      const input = inputOf(m, held), an = analyze(input), bn = an.bn;
      lim.max = bn; m.k = clamp(Math.round(m.k), 1, bn);
      const lp = lowpassOf(an, m.k), p = psnr(an.X, lp.rebuilt), curve = lowpassCurve(an);
      const err = Array.from(an.X, (v, k) => v - lp.rebuilt[k]);
      let omitSq = 0;
      for (const blk of an.blocks) for (let v = 0; v < bn; v++) for (let u = 0; u < bn; u++) if (u >= m.k || v >= m.k) omitSq += blk.Y[v * bn + u] ** 2;
      let best = { k: 2, gain: -1 };
      for (let k = 2; k <= bn; k++) { const a = curve[k - 2], b = curve[k - 1]; if (a !== null && b !== null && b - a > best.gain) best = { k, gain: b - a }; }
      const exactAt = curve.findIndex((v) => v === null) + 1;
      return { input, an, bn, lp, exactAt, mse: p.mse, db: p.db, curve, err, omitSq, errSq: sumSq(err), best, blk: blockOf(an, m), scale: acScale(an) };
    },
    paint(g, w, h, ov, m, r) {
      const { an, bn, curve } = r, pic = an.nb > 1, a = areaOf(w, h, ov, { hudLines: 2 }), lay = { bn, an, pic };
      const [ra, rb, rc, rd, rch] = tiles(a, [{}, {}, {}, {}, { aspect: 1.25 }], { gap: 18 });
      const sel = pic ? { bx: Math.min(an.nb - 1, m.bx), by: Math.min(an.nb - 1, m.by) } : null;
      cap(g, ra, pic ? 'rendered picture (original)' : 'original image X', pic ? 'gray, 64 × 64, in 8 × 8 blocks' : `${bn} × ${bn} pixel values`, { short: pic ? 'rendered picture' : 'original X' });
      picturePanel(g, ra, an, an.X, grayRgb, { selected: sel });
      cap(g, rb, 'coefficients', pic ? `green: the ${m.k} × ${m.k} kept in each block` : 'rows v, columns u; green: kept', { short: 'coefficients' });
      if (pic) {
        picturePanel(g, rb, an, an.Y, coefColor(r.scale), {
          selected: sel,
          extra: (bw) => {
            const bnw = bw / bn;
            g.strokeStyle = '#7ee787'; g.lineWidth = 1;
            for (const b of an.blocks) g.strokeRect(rb.x + b.bx * bw + 0.5, rb.y + b.by * bw + 0.5, m.k * bnw, m.k * bnw);
          },
        });
      } else lay.coef = coefGrid(g, rb, bn, an.blocks[0].Y, { scale: r.scale, keep: m.k, dec: 2 });
      cap(g, rc, `rebuilt from ${m.k} × ${m.k} = ${m.k * m.k} of ${bn * bn}`, pic ? 'the same count in every block' : 'the image from the kept coefficients only', { short: `rebuilt, ${m.k} × ${m.k}` });
      picturePanel(g, rc, an, r.lp.rebuilt, grayRgb, { selected: sel });
      cap(g, rd, 'error: original minus rebuilt', `peak signal-to-noise ratio (PSNR) ${dbText(r.db, 1)}`, { short: 'error image' });
      picturePanel(g, rd, an, r.err, signedRgb(0.4), { selected: sel });
      lay.pics = [ra, rd, rc];
      if (pic) lay.pics.push(rb);
      cap(g, rch, 'PSNR against k', 'decibels (dB); higher is closer', { short: 'decibels against k' });
      const { top, low, clip: yOf } = dbRange(curve);
      const step = bn > 10 ? 5 : 1, xTicks = [];
      for (let k = step === 1 ? 1 : 0; k <= bn; k += step) if (k >= 1) xTicks.push(k);
      const yTicks = []; for (let t = low; t <= top; t += (top - low) > 30 ? 10 : 5) yTicks.push(t);
      lay.chart = drawChart(g, rch, {
        x: [1, bn], y: [low, top], xTicks, yTicks, xLabel: 'k',
        series: [{ pts: curve.map((v, i) => [i + 1, yOf(v)]), color: '#7ee787' }],
        dots: [{ x: m.k, y: yOf(r.db), color: '#ffd166', r: 6 }], hlines: curve[bn - 1] === null ? [{ y: top, color: '#2d6b46' }] : [],
      });
      lay.chartRect = rch;
      return lay;
    },
    hit(x, y, m, lay) {
      const { bn, an } = lay;
      const ch = lay.coef ? headerHit(lay.coef, bn, x, y) : null;
      if (ch && ch.cell) { m.k = Math.max(ch.cell.u, ch.cell.v) + 1; return true; }
      const c = lay.chartRect;
      if (c && x >= c.x && y >= c.y && x < c.x + c.w && y < c.y + c.h && lay.chart) { m.k = clamp(Math.round(lay.chart.invX(x)), 1, bn); return true; }
      for (const p of lay.pics ?? []) {
        if (an.nb > 1 && x >= p.x && y >= p.y && x < p.x + p.w && y < p.y + p.h) { m.bx = Math.min(an.nb - 1, Math.floor(((x - p.x) / p.w) * an.nb)); m.by = Math.min(an.nb - 1, Math.floor(((y - p.y) / p.h) * an.nb)); return true; }
      }
      return false;
    },
    explain(m, r) {
      const { bn, db, mse, curve } = r, k = m.k, kept = k * k;
      const prev = k > 1 ? curve[k - 2] : null, gainText = k === 1 ? 'k = 1 keeps one number per block: its mean (the value of Y[0][0])'
        : db === null ? `k = ${k} is exact; k = ${k - 1} gave ${dbText(prev, 2)}` : `going from k = ${k - 1} to k = ${k} adds ${f(db - prev, 2)} dB (${dbText(prev, 2)} to ${dbText(db, 2)})`;
      const rows = [
        `{keep|k = ${k}}: keep the lowest ${k} × ${k} block of coefficients, ${kept} of ${bn * bn} numbers per block (${f((100 * kept) / (bn * bn), 1)} %)`,
        `mean squared error (MSE) {mse|${mseText(mse)}}; peak signal-to-noise ratio (PSNR) = 10 log10(1 / MSE) = {psnr|${dbText(db, 4)}} for pixel values in [0, 1]`,
        gainText,
        `squared error ${f(r.errSq, 4)} = squared size of the coefficients left out ${f(r.omitSq, 4)}`,
        `PSNR for k = 1 to ${bn}: ${curve.map((v) => (v === null ? 'exact' : f(v, 1))).join(', ')}`,
      ];
      let status;
      if (db === null) status = { text: `k = ${k} rebuilds the image exactly${k < bn ? `: the coefficients beyond ${k} × ${k} are all 0` : ' because it keeps every coefficient'}`, tone: 'ok' };
      else if (r.best.gain > 0) status = { text: `the curve rises most from k = ${r.best.k - 1} to k = ${r.best.k} (${f(r.best.gain, 1)} dB)${r.exactAt ? `; it becomes exact at k = ${r.exactAt}` : ''}`, tone: 'info' };
      else status = { text: `the curve becomes exact at k = ${r.exactAt || bn}`, tone: 'info' };
      return {
        hud: `keep {keep|${k} × ${k}}: peak signal-to-noise ratio (PSNR) {psnr|${dbText(db, 2)}}`,
        rows, status,
        values: [['kept', `${kept} of ${bn * bn}`, 'keep'], ['PSNR', dbText(db, 2), 'psnr'], ['MSE', mseText(mse), 'mse']],
      };
    },
    panel(host, m, r, ctx) {
      inputControls(host, m, held, 'lowpass', sync, ctx, (mm) => (mm.input === 'picture'
        ? 'Click a coefficient cell, the chart or the picture. The same k × k corner is kept in every 8 × 8 block; the picture marks the block chosen.'
        : 'Click a coefficient cell to keep everything up to it, or click the chart to set k.'));
    },
  });
  Object.defineProperty(view, 'params', {
    get: () => [{ id: 'k', label: 'keep k × k', min: 1, max: lim.max, step: 1, play: true, format: (v) => `${v} × ${v}` }],
  });
  return view;
}
