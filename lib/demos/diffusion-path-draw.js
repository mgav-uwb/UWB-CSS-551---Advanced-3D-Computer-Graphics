// diffusion-path-draw: what the four diffusion-path views share: digit pictures (a cached bitmap in the browser, cell rectangles under node), the
// header of a panel (a title and a plain-language note), filmstrips, a legend, and the rail's two controls (starting noise, denoiser). The
// overlay, charts and rail helpers come from image-lab-draw.js; nothing here computes a value.
import { text, segmented, once, el, drawChart, setupOverlay, leaveOverlay, paintWith, overlayFor, area, splitRow, splitCol, f, f1, f2, f0 } from './image-lab-draw.js';
import { COL } from '../core/lab-viz.js';
import { SIDE, START, DENOISERS, digits, network, networkFailed } from './diffusion-path-core.js';

export { text, segmented, once, el, drawChart, setupOverlay, leaveOverlay, paintWith, overlayFor, area, splitRow, splitCol, f, f1, f2, f0 };

export const INK = {
  title: '#e7eaf0', note: '#8b93a7', axis: '#aab2c5', frame: '#2c3140', cursor: '#ffd166', path: '#79c0ff', guess: '#7ee787', jump: '#ffa657',
  data: '#8b93a7', cyan: '#56d4dd', pink: '#ff79c6', purple: '#d2a8ff', red: '#ff5a52',
};
export const FIVE = ['#ffd166', '#56d4dd', '#ff79c6', '#7ee787', '#d2a8ff'];
/** the drawing area: in a slide the gear and help buttons sit in the top-right corner and the readout strip sits above the bottom edge */
export function areaOf(ov, w, h) {
  const embed = ov.ctx?.stage === 'embed' || ov.top < 20;
  return area(ov, w, h, { left: 12, right: embed ? 64 : 12, bottom: embed ? 78 : 50 });
}
export const HEAD = 58;
/** a narrow overlay (a slide: the rail takes 440 of the width) gets short captions and no side columns */
export const isNarrow = (w) => w < 640;
export const HEAD1 = 22;      // room above a panel for a title alone      // room above a panel for its title and two lines of note

export const KEYS = {
  k: COL.gold, t: COL.cyan, abar: COL.purple, sigma: COL.amber, dist: COL.pink, guess: COL.c, jump: COL.amber, path: COL.b, share: COL.b, topw: COL.gold,
  final: COL.c, low: COL.b, high: COL.amber, near: COL.cyan, radius: COL.gold, len: COL.cyan, gap: COL.pink, split: COL.gold, theta: COL.purple, shell: COL.gold,
  spread: COL.amber,
};

/** a title and a note of at most `lines` lines, wrapped to the width of r, above r.y; returns the lines drawn so a test can read them */
export function head(g, title, note, r, lines = 2) {
  text(g, title, r.x, r.y + 12, { size: 12.5, color: INK.title, weight: 700, halo: false });
  if (lines === 0) return [];
  const out = wrap(g, note, r.w, lines);
  out.forEach((s, i) => text(g, s, r.x, r.y + 28 + i * 13, { size: 11, color: INK.note, halo: false }));
  return out;
}

/** words broken into lines no wider than w (at the note's font); a text that needs more lines than allowed ends in an ellipsis */
export function wrap(g, str, w, lines = 2) {
  g.font = '500 11px -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  const width = (s) => g.measureText?.(s)?.width ?? s.length * 5.6;
  const out = [];
  let line = '';
  for (const word of String(str).split(' ')) {
    const tryLine = line ? `${line} ${word}` : word;
    if (width(tryLine) <= w || !line) line = tryLine; else { out.push(line); line = word; }
  }
  if (line) out.push(line);
  if (out.length > lines) { const kept = out.slice(0, lines); kept[lines - 1] += '…'; return kept; }
  return out;
}

/** a row of colored swatches with labels, from (x, y) rightwards; items are [color, label, dash?] */
export function legend(g, items, x, y) {
  let at = x;
  for (const [color, label, dash] of items) {
    g.strokeStyle = color; g.lineWidth = 2.2; g.setLineDash(dash ? [4, 3] : []);
    g.beginPath(); g.moveTo(at, y - 4); g.lineTo(at + 16, y - 4); g.stroke(); g.setLineDash([]);
    text(g, label, at + 21, y, { size: 11, color: INK.axis, halo: false });
    g.font = '500 11px -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
    at += 21 + (g.measureText?.(label)?.width ?? label.length * 5.6) + 14;
  }
}

// ---------------------------------------------------------------- digits

const bitmaps = new WeakMap();
const gray255 = (v) => Math.round(255 * Math.min(1, Math.max(0, (v + 1) / 2)));
/** a 20 x 20 digit vector in [-1, 1] as a canvas, cached on the vector */
function bitmap(vec) {
  let cv = bitmaps.get(vec);
  if (!cv) {
    cv = document.createElement('canvas');
    cv.width = SIDE; cv.height = SIDE;
    const gx = cv.getContext('2d'), img = gx.createImageData(SIDE, SIDE);
    for (let k = 0; k < SIDE * SIDE; k++) { const c = gray255(vec[k]); img.data[4 * k] = c; img.data[4 * k + 1] = c; img.data[4 * k + 2] = c; img.data[4 * k + 3] = 255; }
    gx.putImageData(img, 0, 0);
    bitmaps.set(vec, cv);
  }
  return cv;
}
export function drawDigit(g, vec, r, { frame = INK.frame, width = 1 } = {}) {
  if (typeof document !== 'undefined') {
    g.imageSmoothingEnabled = false;
    g.drawImage(bitmap(vec), r.x, r.y, r.w, r.h);
  } else {
    const c = r.w / SIDE;
    for (let j = 0; j < SIDE; j++) for (let i = 0; i < SIDE; i++) { const v = gray255(vec[j * SIDE + i]); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(r.x + i * c, r.y + j * c, c + 0.5, c + 0.5); }
  }
  if (frame) { g.strokeStyle = frame; g.lineWidth = width; g.strokeRect(r.x - 0.5, r.y - 0.5, r.w + 1, r.h + 1); }
}
export function outline(g, r, color = INK.cursor, width = 2.5) {
  g.strokeStyle = '#0b0c10'; g.lineWidth = width + 2; g.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
  g.strokeStyle = color; g.lineWidth = width; g.strokeRect(r.x - 1, r.y - 1, r.w + 2, r.h + 2);
}
const squares = new Map();
/** training digit i as a stable vector (so its bitmap is cached) */
export function digitVec(i) {
  if (!squares.has(i)) squares.set(i, digits().x.subarray(i * SIDE * SIDE, (i + 1) * SIDE * SIDE));
  return squares.get(i);
}
/** the square of side s centered in a box, with the top-left corner kept for a caption above it */
export function squareIn(box, s = Math.min(box.w, box.h)) { return { x: box.x + (box.w - s) / 2, y: box.y, w: s, h: s }; }

/** which steps a strip of n cells in width w draws (every second one when the cells would be narrower than 13 px, always the last) */
export function stripSteps(w, n) {
  const st = w / n >= 13 ? 1 : 2, shown = [];
  for (let k = 0; k < n; k += st) shown.push(k);
  if (shown[shown.length - 1] !== n - 1) shown.push(n - 1);
  return { st, shown, cell: w / shown.length };
}
/** the side of one picture in such a strip */
export const stripHeight = (w, n) => Math.max(4, stripSteps(w, n).cell - 2);
/** the step under x in a strip drawn at row.x with width row.w */
export function stripHitFor(row, n, x) {
  const { shown, cell } = stripSteps(row.w, n);
  return shown[Math.max(0, Math.min(shown.length - 1, Math.floor((x - row.x) / cell)))];
}

/**
 * A row of the digits vecs[0..n-1] in r, one cell each (see stripSteps), the current step framed in gold and an optional step marked with
 * orange dashes. Returns { at(k) → rect } for anything drawn on top.
 */
export function strip(g, vecs, r, current, { color = INK.cursor, mark = -1 } = {}) {
  const n = vecs.length, { st, shown, cell } = stripSteps(r.w, n), side = Math.max(4, cell - 2);
  const at = (k) => { const s = Math.min(shown.length - 1, Math.round(k / st)); return { x: r.x + s * cell + (cell - side) / 2, y: r.y, w: side, h: side }; };
  shown.forEach((k) => drawDigit(g, vecs[k], at(k), { frame: null }));
  if (mark >= 0) { const m = at(mark); g.strokeStyle = INK.jump; g.lineWidth = 2; g.setLineDash([3, 2]); g.strokeRect(m.x - 1.5, m.y - 1.5, m.w + 3, m.h + 3); g.setLineDash([]); }
  if (current >= 0) outline(g, at(current), color, 2.5);
  return { at, height: side };
}

// ---------------------------------------------------------------- what the rail shows for the digit views

export const STATE_NOTE = {
  digits: 'Loading the 2,000 digits.',
  net: 'Loading the trained network.',
};

/** the rail's controls: starting noise (always), denoiser (when `den`), and anything the view adds through extra(host) */
export function noiseControls(host, m, ctx, { id, den = true, one = null, note = '' }) {
  once(host, id, (h) => {
    if (one) h.refreshers.push(segmented(h, one.label, one.options, () => m[one.key], (v) => { m[one.key] = v; ctx.update(); }));
    h.refreshers.push(segmented(h, 'start', START.map(([k, l]) => [k, l]), () => m.start, (v) => { m.start = v; ctx.update(); }));
    if (den) h.refreshers.push(segmented(h, 'denoiser', DENOISERS, () => m.den, (v) => { m.den = v; ctx.update(); }));
    h.note = el('p', 'lab-note', h, note);
  });
  host.refreshers.forEach((s) => s());
  host.note.textContent = note;
}

/** the paint of a view that is waiting for the digits or the network */
export function paintLoading(g, w, h, ov, what) {
  text(g, what === 'net' ? STATE_NOTE.net : STATE_NOTE.digits, w / 2, h / 2, { size: 16, color: INK.note, align: 'center', halo: false });
}

/** why the network cannot be shown: still loading, or it did not load and the exact denoiser stands in */
export function netState(m) {
  if (m.den !== 'net') return null;
  if (network()) return null;
  return networkFailed() ? 'failed' : 'loading';
}

/** the explanation shown while data is still on its way */
export function loadingExplain(what) {
  const t = what === 'net' ? STATE_NOTE.net : STATE_NOTE.digits;
  return { hud: t, rows: [t], status: { text: 'The picture appears when the files arrive.', tone: 'info' } };
}

/** the note under the rail's controls */
export function startNoiseNote(m, r) {
  if (r?.loading) return r.loading === 'net' ? STATE_NOTE.net : STATE_NOTE.digits;
  return 'The start is random noise: 400 numbers, length about 20. "Too large" and "too small" start it farther from, or nearer to, the middle than the noise the denoiser was built for.';
}
