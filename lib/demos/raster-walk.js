// raster-walk: Pineda's algorithm, one line of code at a time.
//
// The raster demo's triangle (raster.js: the same corners, rotation and colors) over a res × res
// framebuffer, walked by the loop the rasterization deck prints on its "Pineda's algorithm" slide.
// Two panels: the code, with the line that just ran highlighted and every variable's value, and the
// image, which fills in pixel by pixel as the loop emits. The corners are rounded to 3 decimals, as
// the slides print them, so every number here can be redone by hand (at res 12, angle 15: slopes
// E12 (−4.548, −6.192), E at pixel (5, 6) = (18.193, 15.442, 25.987)).
//
// Record, then replay: recordWalk() runs an instrumented copy of the slide's loop once per
// (res, angle) and stores one step per executed line; the controls only move an index into it.
import { SliderRow, ValueTable, ButtonRow, makeRow, makeButton } from '../core/cockpit.js';
import { makeShell } from '../core/demo-shell.js';
import { resolveControlIds } from './registry.js';
import { TRI_COLORS, triAt, edge } from './raster.js';

// The slide's code, verbatim (topics/rasterization.md, "Pineda's algorithm: setup, then three additions
// per pixel"). tools/test-demos.mjs fails if the slide and these lines differ.
export const CODE_LINES = [
  '// once per triangle, in pixel units: each edge\'s slopes and its value at the box\'s first center',
  'const sx12 = v1.y - v2.y, sy12 = v2.x - v1.x;   // E12: −4.548, −6.192',
  'const sx20 = v2.y - v0.y, sy20 = v0.x - v2.x;   // E20:  8.580, −1.428',
  'const sx01 = v0.y - v1.y, sy01 = v1.x - v0.x;   // E01: −4.032,  7.620',
  'let row12 = edge(v1, v2, firstCenter);          // firstCenter = (xmin + ½, ymin + ½)',
  'let row20 = edge(v2, v0, firstCenter);',
  'let row01 = edge(v0, v1, firstCenter);',
  '// per pixel: a sign test and three additions',
  'for (let y = ymin; y <= ymax; y++) {',
  '  let e12 = row12, e20 = row20, e01 = row01;',
  '  for (let x = xmin; x <= xmax; x++) {',
  '    if (e12 >= 0 && e20 >= 0 && e01 >= 0) emit(x, y, e12, e20, e01);   // ÷ twiceArea = the weights',
  '    e12 += sx12; e20 += sx20; e01 += sx01;',
  '  }',
  '  row12 += sy12; row20 += sy20; row01 += sy01;',
  '}',
];
// the lines the walk executes, by index into CODE_LINES
const L = { SX12: 1, SX20: 2, SX01: 3, ROW12: 4, ROW20: 5, ROW01: 6, FOR_Y: 8, LET_E: 9, FOR_X: 10, TEST: 11, STEP_X: 12, STEP_Y: 14, END: 15 };

// step FIRST: tools/test-demos.mjs and verify-deck.mjs drive the first range input as their probe.
const PARAMS = {
  res: { label: 'res', min: 6, max: 16, step: 1, value: 12, format: (v) => `${v.toFixed(0)}px` },
  angle: { label: 'angle', min: 0, max: 360, step: 1, value: 15, format: (v) => `${v.toFixed(0)}°` },
};
const SPEEDS = { slow: 3, medium: 10, fast: 40 };   // lines per second

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>The loop of the slide before, run one line at a time on the raster demo's triangle. In the code
  panel the line that just ran is highlighted, and the table beside it holds every variable after
  that line. The image shows the bounding box (dashed), the true triangle, each pixel's center, and every
  pixel emitted so far in its barycentric color.</p>
  <h4>Reading the image</h4>
  <p>The pixel being tested has a white frame: <strong>solid with a dot</strong> when its center is
  inside (all three edge functions ≥ 0) and emitted, <strong>dashed with a cross</strong> when it is
  outside. The faint band is the row the outer loop is on.</p>
  <h4>Try this</h4>
  <p>Step the six setup lines with <code>line ▶</code>, then use <code>pixel ▶</code> along the first
  row and watch e12, e20, e01 change by the same three slopes each time. Stop at pixel (5, 6) and
  compare the three values with the slide. Then <code>play</code> to the end, or drag
  <code>step</code>.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const CSS = `
.cockpit .demo-shell-root.rw-root { flex-wrap: wrap; align-items: flex-start; }
.rw-code { flex: 0 0 100%; display: flex; gap: 10px; box-sizing: border-box; background: #0f1117;
  border: 1px solid #262a35; border-radius: 6px; padding: 8px 10px; text-align: left; }
.rw-src { flex: 1; min-width: 0; font: 12px/1.42 'SF Mono', Menlo, Consolas, monospace; color: #c7cdda;
  white-space: pre; overflow: hidden; }
.rw-line { padding: 0 6px; border-left: 3px solid transparent; border-radius: 2px; }
.rw-line.on { background: #233452; border-left-color: #ffb400; color: #ffffff; }
.rw-kw { color: #c792ea; } .rw-cm { color: #6f7a90; } .rw-num { color: #f2a65a; }
.rw-line.on .rw-cm { color: #a9b3c7; }
.cockpit .rw-vars.demo-shell-card { flex: 0 0 150px; padding: 6px 8px; }
.cockpit .rw-vars .mat-panel td { padding: 1.5px 4px; font-size: 11.5px; }
.rw-status { margin: 0 0 5px; min-height: 2.7em; font-size: 11.5px; line-height: 1.35; color: #c7cdda; text-align: left; }
.rw-legend { margin: 4px 0 0; font-size: 10.5px; line-height: 1.3; color: #8b93a7; text-align: left; }
.cockpit .rw-root .demo-shell-btn { font-size: 11.5px; padding: 4px 8px; }
.cockpit .rw-root .demo-shell-row { gap: 5px; margin: 0 0 5px; flex-wrap: wrap; }
/* on a slide: code across the top, then the image beside the controls (section and the double
   class outrank lib.css's .reveal section.demo-full [data-demo] rules) */
.reveal section [data-demo] .demo-shell-root.rw-root.demo-shell-root--embed { max-width: 940px; max-height: none; margin: 0 auto; }
.reveal section [data-demo] .demo-shell-root.rw-root .demo-shell-scene--embed { flex: 0 0 300px; height: 300px; min-height: 0; }
.reveal section [data-demo] .demo-shell-root.rw-root canvas.rw-canvas { width: 300px !important; height: 300px !important; }
.reveal section [data-demo] .demo-shell-root.rw-root .demo-shell-rail--embed { flex: 1 1 0; min-width: 0; max-height: 300px; overflow: visible;
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; align-content: start; }
.cockpit .rw-root .mat-panel td.value-label { white-space: nowrap; }
.reveal section [data-demo] .demo-shell-root.rw-root .demo-shell-card { padding: 7px 9px; }
.reveal section [data-demo] .demo-shell-root.rw-root .demo-shell-card h3 { margin: 0 0 5px; }
/* the full page: the same layout, larger */
.cockpit .demo-shell-root.rw-root:not(.demo-shell-root--embed) { height: auto; }
.cockpit .demo-shell-root.rw-root:not(.demo-shell-root--embed) .rw-src { font-size: 14px; }
.cockpit .demo-shell-root.rw-root:not(.demo-shell-root--embed) .demo-shell-scene { flex: 0 0 480px; height: 480px; min-height: 0; }
.cockpit .demo-shell-root.rw-root:not(.demo-shell-root--embed) canvas.rw-canvas { width: 480px; height: 480px; }
.cockpit .demo-shell-root.rw-root:not(.demo-shell-root--embed) .demo-shell-rail { flex: 1 1 0; height: auto; overflow: visible;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 9px; align-content: start; }
`;

function injectCss() {
  if (document.getElementById('raster-walk-css')) return;
  const style = document.createElement('style');
  style.id = 'raster-walk-css';
  style.textContent = CSS;
  document.head.appendChild(style);
}

/** The triangle's corners in pixel units: raster.js's triangle, rounded to 3 decimals as the slides print it. */
export function cornersAt(res, angle) {
  return triAt(angle).map(([x, y]) => [Math.round(x * 1000) / 1000 * res, Math.round(y * 1000) / 1000 * res]);
}

/**
 * recordWalk(res, angle): run the slide's loop once and record one step per executed line.
 * Each step: { line, x, y, row12, row20, row01, e12, e20, e01, test, visited, emitted }, the state after
 * that line ran (test: true, false, or null when no test has run for the current pixel).
 * Also returns the setup (corners, box, slopes, twice-area) and every emitted pixel with its color.
 */
export function recordWalk(res, angle) {
  const [v0, v1, v2] = cornersAt(res, angle);
  const clamp = (v) => Math.min(res - 1, Math.max(0, v));
  const xs = [v0[0], v1[0], v2[0]], ys = [v0[1], v1[1], v2[1]];
  const xmin = clamp(Math.floor(Math.min(...xs))), xmax = clamp(Math.ceil(Math.max(...xs)) - 1);
  const ymin = clamp(Math.floor(Math.min(...ys))), ymax = clamp(Math.ceil(Math.max(...ys)) - 1);
  const firstCenter = [xmin + 0.5, ymin + 0.5];
  const twiceArea = edge(v0, v1, v2);

  const steps = [];
  const emits = [];
  const s = { x: NaN, y: NaN, row12: NaN, row20: NaN, row01: NaN, e12: NaN, e20: NaN, e01: NaN, test: null, visited: 0 };
  function record(line) {
    steps.push({ line, ...s, emitted: emits.length });
  }
  record(-1);   // before anything ran

  const sx12 = v1[1] - v2[1], sy12 = v2[0] - v1[0];
  record(L.SX12);
  const sx20 = v2[1] - v0[1], sy20 = v0[0] - v2[0];
  record(L.SX20);
  const sx01 = v0[1] - v1[1], sy01 = v1[0] - v0[0];
  record(L.SX01);
  let row12 = edge(v1, v2, firstCenter);
  s.row12 = row12; record(L.ROW12);
  let row20 = edge(v2, v0, firstCenter);
  s.row20 = row20; record(L.ROW20);
  let row01 = edge(v0, v1, firstCenter);
  s.row01 = row01; record(L.ROW01);

  for (let y = ymin; y <= ymax; y++) {
    s.y = y; s.x = NaN; s.test = null;
    record(L.FOR_Y);
    let e12 = row12, e20 = row20, e01 = row01;
    s.e12 = e12; s.e20 = e20; s.e01 = e01;
    record(L.LET_E);
    for (let x = xmin; x <= xmax; x++) {
      s.x = x; s.test = null;
      record(L.FOR_X);
      const inside = e12 >= 0 && e20 >= 0 && e01 >= 0;
      s.test = inside; s.visited += 1;
      if (inside) emits.push({ x, y, color: blend(e12 / twiceArea, e20 / twiceArea, e01 / twiceArea), e: [e12, e20, e01] });
      record(L.TEST);
      e12 += sx12; e20 += sx20; e01 += sx01;
      s.e12 = e12; s.e20 = e20; s.e01 = e01;
      record(L.STEP_X);
    }
    row12 += sy12; row20 += sy20; row01 += sy01;
    s.row12 = row12; s.row20 = row20; s.row01 = row01; s.x = NaN; s.test = null;
    record(L.STEP_Y);
  }
  s.x = NaN; s.y = NaN; s.test = null;
  record(L.END);

  return {
    res, corners: [v0, v1, v2], box: { xmin, xmax, ymin, ymax, count: (xmax - xmin + 1) * (ymax - ymin + 1) },
    slopes: [[sx12, sy12], [sx20, sy20], [sx01, sy01]], twiceArea, steps, emits,
  };
}

// barycentric color: w0 weighs v0's color (E12 is the edge opposite v0), and so on
function blend(w0, w1, w2) {
  const c = [0, 1, 2].map((k) => Math.round(w0 * TRI_COLORS[0][k] + w1 * TRI_COLORS[1][k] + w2 * TRI_COLORS[2][k]));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

const fmt3 = (v) => (Number.isFinite(v) ? v.toFixed(3) : '·');
const fmtInt = (v) => (Number.isFinite(v) ? v.toFixed(0) : '·');
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** One code line as HTML: comments, the four keywords and numbers colored. */
function highlight(line) {
  const cut = line.indexOf('//');
  const code = cut < 0 ? line : line.slice(0, cut);
  const comment = cut < 0 ? '' : line.slice(cut);
  const body = esc(code)
    .replace(/\b(const|let|for|if)\b/g, '<span class="rw-kw">$1</span>')
    .replace(/\b(\d+)\b/g, '<span class="rw-num">$1</span>');
  return body + (comment ? `<span class="rw-cm">${esc(comment)}</span>` : '');
}

export function make(container, { stage = 'embed', controls } = {}) {
  injectCss();
  const model = { res: PARAMS.res.value, angle: PARAMS.angle.value };
  let walk = recordWalk(model.res, model.angle);
  let k = 0;            // the step shown
  let timer = null;     // the play interval, or null when paused
  let speed = 'medium';

  const shell = makeShell(container, {
    stage,
    help: { html: HELP_HTML },
    settings: [],
    legend: 'line ▶: one line; pixel ▶: the next test',
    nav: null,
  });
  shell.rootEl.classList.add('rw-root');

  // ---- the code panel, across the top ----
  const codeEl = document.createElement('div');
  codeEl.className = 'rw-code';
  const srcEl = document.createElement('div');
  srcEl.className = 'rw-src';
  const lineEls = CODE_LINES.map((text) => {
    const div = document.createElement('div');
    div.className = 'rw-line';
    div.innerHTML = highlight(text) || ' ';
    srcEl.appendChild(div);
    return div;
  });
  codeEl.appendChild(srcEl);
  const varsCard = document.createElement('div');
  varsCard.className = 'demo-shell-card rw-vars';
  const varsTitle = document.createElement('h3');
  varsTitle.textContent = 'variables';
  varsCard.appendChild(varsTitle);
  const vars = new ValueTable(varsCard, {
    rows: [
      { id: 'y', label: 'y', format: fmtInt },
      { id: 'x', label: 'x', format: fmtInt },
      { id: 'row12', label: 'row12', format: fmt3 },
      { id: 'row20', label: 'row20', format: fmt3 },
      { id: 'row01', label: 'row01', format: fmt3 },
      { id: 'e12', label: 'e12', format: fmt3 },
      { id: 'e20', label: 'e20', format: fmt3 },
      { id: 'e01', label: 'e01', format: fmt3 },
      { id: 'test', label: 'test', format: (v) => (v === 1 ? 'inside' : v === 0 ? 'outside' : '·') },
    ],
  });
  codeEl.appendChild(varsCard);
  shell.rootEl.insertBefore(codeEl, shell.sceneEl);

  // ---- the image panel ----
  const canvas = document.createElement('canvas');
  canvas.className = 'rw-canvas';
  canvas.width = 600;
  canvas.height = 600;
  canvas.style.display = 'block';
  shell.sceneEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // ---- the rail: the walk controls, the readout, the framebuffer ----
  const walkCard = shell.addCard('walk the loop');
  walkCard.classList.add('rw-walk');
  const stepSlider = new SliderRow(walkCard, {
    id: 'raster-walk-step', label: 'step', min: 0, max: walk.steps.length - 1, step: 1, value: 0,
    format: (v) => `${v.toFixed(0)} / ${walk.steps.length - 1}`,
  });
  stepSlider.onInput((v) => { pause(); show(Math.round(v)); });

  const row1 = makeRow(walkCard);
  button(row1, '◀ line', () => { pause(); show(k - 1); });
  button(row1, 'line ▶', () => { pause(); show(k + 1); });
  button(row1, 'pixel ▶', () => { pause(); show(nextIndex(L.TEST)); });
  const row2 = makeRow(walkCard);
  button(row2, 'row ▶', () => { pause(); show(nextIndex(L.LET_E)); });
  const playBtn = button(row2, '▶ play', () => (timer ? pause() : play()));
  button(row2, 'reset', () => { pause(); show(0); });
  const speedRow = new ButtonRow(walkCard, {
    id: 'raster-walk-speed', label: 'speed',
    options: [{ value: 'slow', label: 'slow' }, { value: 'medium', label: 'medium' }, { value: 'fast', label: 'fast' }],
    value: speed,
  });
  speedRow.onChange((v) => { speed = v; if (timer) { pause(); play(); } });

  // the framebuffer and the triangle's angle, in the same card
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'raster-walk');
  for (const id of ids) {
    const slider = new SliderRow(walkCard, { id: `raster-walk-${id}`, ...PARAMS[id] });
    slider.onInput((v) => {
      model[id] = v;
      pause();
      walk = recordWalk(model.res, model.angle);
      stepSlider.input.max = String(walk.steps.length - 1);
      stepSlider._max = walk.steps.length - 1;   // SliderRow clamps set() to its max
      show(0);
    });
  }

  const readoutCard = shell.addCard('readout');
  const status = document.createElement('p');
  status.className = 'rw-status';
  readoutCard.appendChild(status);
  const readout = new ValueTable(readoutCard, {
    rows: [
      { id: 'box', label: 'box', format: String },
      { id: 'visited', label: 'tested', format: String },
      { id: 'emitted', label: 'emitted', format: String },
      { id: 'slope12', label: 'E12 slopes', format: String },
      { id: 'slope20', label: 'E20 slopes', format: String },
      { id: 'slope01', label: 'E01 slopes', format: String },
    ],
  });
  const legend = document.createElement('p');
  legend.className = 'rw-legend';
  legend.textContent = 'solid frame and dot: inside, emitted; dashed frame and cross: outside';
  readoutCard.appendChild(legend);

  function button(row, label, onClick) {
    const b = makeButton(row, label, () => { onClick(); b.blur(); });   // a focused button would take reveal's keys
    return b;
  }

  // the index of the next step on the given line after the current one (or the last step)
  function nextIndex(line) {
    for (let i = k + 1; i < walk.steps.length; i++) if (walk.steps[i].line === line) return i;
    return walk.steps.length - 1;
  }

  function play() {
    if (k >= walk.steps.length - 1) show(0);
    playBtn.textContent = '❚❚ pause';
    timer = setInterval(() => {
      if (k >= walk.steps.length - 1) { pause(); return; }
      show(k + 1);
    }, 1000 / SPEEDS[speed]);
  }
  function pause() {
    if (timer) clearInterval(timer);
    timer = null;
    playBtn.textContent = '▶ play';
  }
  // stop playing when the slide or page is out of view
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => { if (!entries[0].isIntersecting) pause(); }).observe(shell.rootEl);
  }

  function show(i) {
    k = Math.max(0, Math.min(walk.steps.length - 1, i));
    stepSlider.set(k);
    const st = walk.steps[k];
    lineEls.forEach((el, j) => el.classList.toggle('on', j === st.line));
    for (const id of ['y', 'x', 'row12', 'row20', 'row01', 'e12', 'e20', 'e01']) vars.update(id, st[id]);
    vars.update('test', st.test === null ? NaN : st.test ? 1 : 0);
    const b = walk.box, n = walk.res;
    readout.update('box', `x ${b.xmin} to ${b.xmax}, y ${b.ymin} to ${b.ymax}: ${b.count}`);
    readout.update('visited', `${st.visited} of ${b.count}`);
    readout.update('emitted', String(st.emitted));
    ['slope12', 'slope20', 'slope01'].forEach((id, j) => {
      const [sx, sy] = walk.slopes[j];
      readout.update(id, `(${sx.toFixed(3)}, ${sy.toFixed(3)})`);
    });
    status.textContent = describe(st, b, n);
    draw(st);
  }

  function describe(st, b, n) {
    if (st.line === -1) return 'Ready: line ▶ runs the first line.';
    if (st.line <= L.ROW01) return 'Setup, once per triangle: three slopes, then each edge at the first center.';
    if (st.line === L.FOR_Y) return `Row y = ${st.y}.`;
    if (st.line === L.LET_E) return `Row y = ${st.y}: start from the row's first values.`;
    if (st.line === L.FOR_X) return `Pixel (${st.x}, ${st.y}).`;
    if (st.line === L.TEST) return `Pixel (${st.x}, ${st.y}): ${st.test ? 'inside, emitted' : 'outside, skipped'}.`;
    if (st.line === L.STEP_X) return `Pixel (${st.x}, ${st.y}) done: one step right is three additions.`;
    if (st.line === L.STEP_Y) return `Row ${st.y} done: one step up is three additions.`;
    return `Done: ${st.emitted} of ${b.count} in the box, of ${n * n}.`;
  }

  function draw(st) {
    const W = canvas.width, H = canvas.height;
    const n = walk.res;
    const pad = Math.round(W * 0.03);
    const side = Math.min(W, H) - 2 * pad;
    const cell = side / n;
    const ox = (W - side) / 2, oy = (H - side) / 2;
    const px = (x) => ox + x * cell;               // pixel units, y up -> canvas
    const py = (y) => oy + (n - y) * cell;
    const lw = Math.max(1, W / 300);

    ctx.fillStyle = '#171b26';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#232939';
    ctx.fillRect(ox, oy, side, side);

    const b = walk.box;
    // the current row, faintly
    if (Number.isFinite(st.y)) {
      ctx.fillStyle = 'rgba(255, 180, 0, 0.10)';
      ctx.fillRect(px(b.xmin), py(st.y + 1), (b.xmax - b.xmin + 1) * cell, cell);
    }
    // emitted pixels so far, in their barycentric colors
    for (let i = 0; i < st.emitted; i++) {
      const e = walk.emits[i];
      ctx.fillStyle = e.color;
      ctx.fillRect(px(e.x), py(e.y + 1), cell + 0.5, cell + 0.5);
    }
    // grid
    ctx.strokeStyle = 'rgba(10, 13, 20, 0.9)';
    ctx.lineWidth = lw;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      ctx.moveTo(px(i), py(0)); ctx.lineTo(px(i), py(n));
      ctx.moveTo(px(0), py(i)); ctx.lineTo(px(n), py(i));
    }
    ctx.stroke();
    // the bounding box
    ctx.save();
    ctx.setLineDash([6 * lw, 4 * lw]);
    ctx.strokeStyle = '#8f7dff';
    ctx.lineWidth = 1.5 * lw;
    ctx.strokeRect(px(b.xmin), py(b.ymax + 1), (b.xmax - b.xmin + 1) * cell, (b.ymax - b.ymin + 1) * cell);
    ctx.restore();
    // pixel centers
    ctx.fillStyle = 'rgba(170, 178, 200, 0.7)';
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        ctx.beginPath();
        ctx.arc(px(x + 0.5), py(y + 0.5), Math.max(1.5, cell * 0.05), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // the true triangle and its corners
    const [v0, v1, v2] = walk.corners;
    ctx.strokeStyle = '#ffb400';
    ctx.lineWidth = 1.5 * lw;
    ctx.beginPath();
    ctx.moveTo(px(v0[0]), py(v0[1])); ctx.lineTo(px(v1[0]), py(v1[1])); ctx.lineTo(px(v2[0]), py(v2[1]));
    ctx.closePath();
    ctx.stroke();
    ctx.font = `${Math.round(13 * lw)}px system-ui, sans-serif`;
    walk.corners.forEach((v, i) => {
      ctx.fillStyle = `rgb(${TRI_COLORS[i].join(',')})`;
      ctx.beginPath();
      ctx.arc(px(v[0]), py(v[1]), 4 * lw, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e7eaf0';
      ctx.fillText(`v${i}`, px(v[0]) + 6 * lw, py(v[1]) - 6 * lw);
    });
    // the pixel being tested
    if (Number.isFinite(st.x)) drawCurrent(st, px(st.x), py(st.y + 1), cell, lw);
  }

  function drawCurrent(st, x0, y0, cell, lw) {
    const cx = x0 + cell / 2, cy = y0 + cell / 2;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    if (st.test === null) {
      ctx.lineWidth = 1.5 * lw;
      ctx.strokeRect(x0 + lw, y0 + lw, cell - 2 * lw, cell - 2 * lw);
    } else if (st.test) {
      ctx.lineWidth = 3 * lw;
      ctx.strokeRect(x0 + 1.5 * lw, y0 + 1.5 * lw, cell - 3 * lw, cell - 3 * lw);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(3, cell * 0.12), 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = 2.5 * lw;
      ctx.setLineDash([4 * lw, 3 * lw]);
      ctx.strokeRect(x0 + 1.5 * lw, y0 + 1.5 * lw, cell - 3 * lw, cell - 3 * lw);
      ctx.setLineDash([]);
      const r = cell * 0.18;
      ctx.beginPath();
      ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
      ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
      ctx.stroke();
    }
    ctx.restore();
  }

  // The canvas buffer follows its on-screen size once it is visible (sharp at any slide scale);
  // both dimensions scale alike, so it settles in one step (as in raster.js).
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const rect = canvas.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;
        const w = Math.round(rect.width * dpr), h = Math.round(rect.height * dpr);
        if (w === canvas.width && h === canvas.height) continue;
        canvas.width = w;
        canvas.height = h;
        draw(walk.steps[k]);
      }
    }).observe(canvas);
  }

  show(0);
  // A deck opened directly at this slide is centered while the slide still holds only the short
  // fallback text (initDeckDemos hides it after make() returns): re-center once the demo is in.
  requestAnimationFrame(() => {
    if (window.Reveal && window.Reveal.isReady && window.Reveal.isReady()) window.Reveal.layout();
  });
}
