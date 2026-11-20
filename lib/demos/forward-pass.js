// forward-pass: a small feed-forward network evaluated one step at a time and laid out as matrices (L15, "A forward pass,
// by hand"). One or two inputs, one or two hidden layers of two tanh units, one output; forward only, no gradients.
//
// Every vector is a column. A hidden layer is z = W a + b, then a = tanh(z), with a = x for the first layer; the output is
// f = wᵀ a + b. A step computes one entry of z (row j of W times the column beside it, plus b_j), applies tanh to a layer,
// or computes the output. The network (a canvas) and the matrices (boxes, the weights and inputs editable) light up the
// numbers that step uses, and the line below writes out its arithmetic. Focusing a weight's box lights its edge.
//
//   make(host, { stage, controls })   controls: inputs:1|2, layers:1|2, step:<k>
//
// The default instance is the lecture's: x = 0.4, W1 = (1.0, −1.0)ᵀ, b1 = (0.5, 0.5)ᵀ, w = (0.8, −0.6)ᵀ, b = 0.1, so
// z = (0.9, 0.1)ᵀ, a = (0.7163, 0.0997)ᵀ, f = 0.6132; with two hidden layers it is the course text's 1-2-2-1 network
// (f = 0.3345). Self-contained: no demo shell, no code window (the forward pass is part of homework 7).
export const TITLE = 'Forward Pass: a Small Network, One Step at a Time';

const H = 2; // units per hidden layer

// The full parameter set (two inputs, two hidden layers); a configuration uses its first rows and columns.
export function defaults() {
  return {
    x: [0.4, 0.2],
    W: [[[1.0, 0.5], [-1.0, 0.25]],     // layer 1: row j = unit j's weights; the second column is used with two inputs
        [[0.6, -0.4], [0.3, 0.9]]],     // layer 2
    b: [[0.5, 0.5], [0, -0.2]],
    wOut: [0.8, -0.6],
    bOut: 0.1,
  };
}

// The pass as a list of steps, each carrying the numbers it used. The demo's only computation; the test checks it.
export function forwardSteps(p, nIn, layers) {
  const steps = [];
  let input = p.x.slice(0, nIn);
  for (let l = 0; l < layers; l++) {
    const z = [];
    for (let j = 0; j < H; j++) {
      const row = p.W[l][j].slice(0, l === 0 ? nIn : H);
      const value = row.reduce((s, w, k) => s + w * input[k], 0) + p.b[l][j];
      z.push(value);
      steps.push({ kind: 'z', layer: l, unit: j, row, input: input.slice(), bias: p.b[l][j], value });
    }
    const a = z.map(Math.tanh);
    steps.push({ kind: 'act', layer: l, z, value: a });
    input = a;
  }
  const f = p.wOut.reduce((s, w, k) => s + w * input[k], 0) + p.bOut;
  steps.push({ kind: 'out', row: p.wOut.slice(), input: input.slice(), bias: p.bOut, value: f });
  return steps;
}

// numbers as the slides write them: at most four decimals, at least one (1.0, not 1), a true minus sign
const num = (v) => { let t = String(Number(v.toFixed(4))); if (!t.includes('.') && !t.includes('e')) t += '.0'; return t.startsWith('-') ? '−' + t.slice(1) : t; };
const given = (v) => num(v).replace('−', '-');   // a box's text: typeable
const paren = (v) => (v < 0 ? `(${num(v)})` : num(v));
const sup = (l) => `<sup>(${l + 1})</sup>`;

const CSS = `
.fp-root { font: 16px/1.35 system-ui, -apple-system, Segoe UI, sans-serif; color: #1a1c22; background: #ffffff;
  border: 1px solid #d7dbe3; border-radius: 10px; padding: 10px 12px; text-align: left; max-width: 950px; margin: 0 auto; box-sizing: border-box; }
.fp-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin-bottom: 8px; }
.fp-seg { display: inline-flex; align-items: center; gap: 2px; font-size: 13px; color: #5c6270; }
.fp-seg > span { margin-right: 4px; }
.fp-btn { font: 600 13px/1 system-ui, sans-serif; padding: 6px 10px; border: 1px solid #c9ced8; border-radius: 6px;
  background: #eef0f4; color: #33384a; cursor: pointer; }
.fp-btn:hover { background: #e2e6ee; }
.fp-btn.on { background: #1f5fb0; border-color: #1f5fb0; color: #fff; }
.fp-btn.go { background: #0a7d5a; border-color: #0a7d5a; color: #fff; }
.fp-btn:disabled { opacity: 0.4; cursor: default; }
.fp-step { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; color: #5c6270; margin-left: auto; }
.fp-step input[type=range] { width: 120px; }
.fp-body { display: flex; gap: 10px; align-items: center; }
.fp-net { flex: 0 0 auto; }
.reveal section [data-demo] .fp-root canvas.fp-canvas,
.fp-root canvas.fp-canvas { width: 260px !important; height: 330px !important; display: block; }
.fp-mats { flex: 1 1 auto; display: flex; flex-direction: column; gap: 6px; }
.fp-eq { display: flex; align-items: center; gap: 4px; }
.fp-tag { flex: 0 0 50px; font-size: 13px; font-weight: 600; color: #5c6270; text-align: right; padding-right: 4px; }
.fp-op { font-size: 17px; color: #5c6270; padding: 0 1px; white-space: nowrap; }
.fp-op.small { font-size: 13px; }
.fp-block { display: flex; flex-direction: column; align-items: center; }
.fp-block > i { font-style: italic; font-size: 13px; color: #5c6270; margin-top: 2px; white-space: nowrap; }
.fp-grid { display: grid; gap: 2px; padding: 2px 4px; border-left: 2px solid #33384a; border-right: 2px solid #33384a; border-radius: 6px; }
.fp-cell { width: 60px; height: 32px; box-sizing: border-box; border: 1px solid #d7dbe3; border-radius: 4px; background: #fff;
  font: 16px/30px ui-monospace, SFMono-Regular, Menlo, monospace; text-align: right; padding: 0 4px; color: #1a1c22; }
input.fp-cell { outline: none; }
input.fp-cell:focus { border-color: #6b40d8; box-shadow: 0 0 0 2px #6b40d833; }
input.fp-cell.bad { border-color: #c0392b; background: #fdecea; }
.fp-cell.out { background: #f4f6f9; color: #1a1c22; }
.fp-cell.empty { color: #b4b9c4; }
.fp-cell.hot { background: #ffe2bf; border-color: #d98c1f; }
.fp-cell.warm { background: #fff3e3; border-color: #e8c08a; }
.fp-cell.act { background: #dff3e4; border-color: #0a7d5a; }
.fp-say { margin-top: 8px; min-height: 2.6em; font-size: 17px; background: #f6f8fb; border-radius: 6px; padding: 6px 10px; }
.fp-say b { color: #b86a00; }
@media (max-width: 760px) { .fp-body { flex-direction: column; } }
`;

function injectCss() {
  if (document.getElementById('fp-css')) return;
  const s = document.createElement('style');
  s.id = 'fp-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

export function make(host, { stage = 'full', controls = [] } = {}) {
  injectCss();
  const opt = Object.fromEntries(controls.map((c) => c.split(':')).filter((q) => q.length === 2));
  let nIn = opt.inputs === '2' ? 2 : 1;
  let layers = opt.layers === '2' ? 2 : 1;
  let p = defaults();
  let steps = forwardSteps(p, nIn, layers);
  let k = Math.max(0, Math.min(steps.length, parseInt(opt.step ?? '0', 10) || 0));
  let focus = null; // { layer, j, c } of a focused weight box, layer 'out' for the output row

  const root = el('div', 'fp-root');
  root.dataset.stage = stage;
  host.appendChild(root);

  // -- the bar: configuration, stepping
  const bar = el('div', 'fp-bar');
  const seg = (label, values, get, set) => {
    const g = el('span', 'fp-seg', `<span>${label}</span>`);
    const btns = values.map((v) => {
      const b = el('button', 'fp-btn', String(v));
      b.type = 'button';
      b.addEventListener('click', (e) => { e.stopPropagation(); set(v); k = 0; rebuild(); });
      g.appendChild(b);
      return [v, b];
    });
    return { g, sync: () => btns.forEach(([v, b]) => b.classList.toggle('on', v === get())) };
  };
  const segIn = seg('inputs', [1, 2], () => nIn, (v) => { nIn = v; });
  const segL = seg('hidden layers', [1, 2], () => layers, (v) => { layers = v; });
  bar.append(segIn.g, segL.g);
  const button = (label, cls, fn, title) => {
    const b = el('button', 'fp-btn' + (cls ? ' ' + cls : ''), label);
    b.type = 'button';
    if (title) b.title = title;
    b.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
    bar.appendChild(b);
    return b;
  };
  const bReset = button('reset', '', () => { k = 0; update(); }, 'back to the inputs alone');
  const bBack = button('◀ back', '', () => { k = Math.max(0, k - 1); update(); });
  const bStep = button('step ▶', 'go', () => { k = Math.min(steps.length, k + 1); update(); }, 'compute the next number');
  const bAll = button('all ▶▶', '', () => { k = steps.length; update(); });
  button('default values', '', () => { p = defaults(); k = 0; rebuild(); }, 'restore the lecture\'s weights and inputs');
  const stepBox = el('label', 'fp-step');
  const slider = el('input');
  slider.type = 'range'; slider.min = '0'; slider.step = '1';
  const stepText = el('span');
  slider.addEventListener('input', () => { k = parseInt(slider.value, 10); update(); });
  stepBox.append(stepText, slider);
  bar.appendChild(stepBox);
  root.appendChild(bar);

  // -- the body: the network on a canvas, the matrices beside it
  const body = el('div', 'fp-body');
  const netBox = el('div', 'fp-net');
  const canvas = el('canvas', 'fp-canvas');
  netBox.appendChild(canvas);
  const mats = el('div', 'fp-mats');
  body.append(netBox, mats);
  root.appendChild(body);
  const say = el('div', 'fp-say');
  root.appendChild(say);

  // -- the matrices: one row per layer, z = W a + b -> tanh -> a, then f = wᵀ a + b
  let cells = {};
  const box = (editable, value, onInput, key, focusKey) => {
    const c = el(editable ? 'input' : 'div', 'fp-cell' + (editable ? '' : ' out'));
    if (editable) {
      c.type = 'text'; c.inputMode = 'decimal'; c.spellcheck = false; c.value = given(value);
      c.addEventListener('input', () => {
        const v = parseFloat(c.value.replace('−', '-'));
        const ok = c.value.trim() !== '' && Number.isFinite(v);
        c.classList.toggle('bad', !ok);
        if (ok) { onInput(v); steps = forwardSteps(p, nIn, layers); update(); }
      });
      c.addEventListener('keydown', (e) => e.stopPropagation()); // typing must not drive the slides
      if (focusKey) {
        c.addEventListener('focus', () => { focus = focusKey; draw(); });
        c.addEventListener('blur', () => { focus = null; draw(); });
      }
    }
    if (key) cells[key] = c;
    return c;
  };
  const column = (n, make1) => { const g = el('div', 'fp-grid'); g.style.gridTemplateColumns = '1fr'; for (let i = 0; i < n; i++) g.appendChild(make1(i)); return g; };
  const block = (grid, label) => { const b = el('div', 'fp-block'); b.append(grid, el('i', '', label)); return b; };

  function rebuild() {
    steps = forwardSteps(p, nIn, layers);
    k = Math.min(k, steps.length);
    cells = {};
    mats.replaceChildren();
    for (let l = 0; l < layers; l++) {
      const cols = l === 0 ? nIn : H;
      const row = el('div', 'fp-eq');
      row.appendChild(el('div', 'fp-tag', `layer ${l + 1}`));
      row.appendChild(block(column(H, (j) => box(false, '', null, `z${l}.${j}`)), `z${sup(l)}`));
      row.appendChild(el('span', 'fp-op', '='));
      const W = el('div', 'fp-grid');
      W.style.gridTemplateColumns = `repeat(${cols}, auto)`;
      for (let j = 0; j < H; j++) for (let c = 0; c < cols; c++) W.appendChild(box(true, p.W[l][j][c], (v) => { p.W[l][j][c] = v; }, `W${l}.${j}.${c}`, { layer: l, j, c }));
      row.appendChild(block(W, `W${sup(l)}, ${H} × ${cols}`));
      if (l === 0) row.appendChild(block(column(nIn, (c) => box(true, p.x[c], (v) => { p.x[c] = v; }, `in${l}.${c}`)), 'x'));
      else row.appendChild(block(column(H, (c) => box(false, '', null, `in${l}.${c}`)), `a${sup(l - 1)}`));
      row.appendChild(el('span', 'fp-op', '+'));
      row.appendChild(block(column(H, (j) => box(true, p.b[l][j], (v) => { p.b[l][j] = v; }, `b${l}.${j}`)), `b${sup(l)}`));
      row.appendChild(el('span', 'fp-op small', '→ tanh →'));
      row.appendChild(block(column(H, (j) => box(false, '', null, `a${l}.${j}`)), `a${sup(l)}`));
      mats.appendChild(row);
    }
    const row = el('div', 'fp-eq');
    row.appendChild(el('div', 'fp-tag', 'output'));
    row.appendChild(block(column(1, () => box(false, '', null, 'f')), 'f'));
    row.appendChild(el('span', 'fp-op', '='));
    const w = el('div', 'fp-grid');
    w.style.gridTemplateColumns = `repeat(${H}, auto)`;
    for (let c = 0; c < H; c++) w.appendChild(box(true, p.wOut[c], (v) => { p.wOut[c] = v; }, `wo.${c}`, { layer: 'out', j: 0, c }));
    row.appendChild(block(w, `w<sup>T</sup>, 1 × ${H}`));
    row.appendChild(block(column(H, (c) => box(false, '', null, `ino.${c}`)), `a${sup(layers - 1)}`));
    row.appendChild(el('span', 'fp-op', '+'));
    row.appendChild(block(column(1, () => box(true, p.bOut, (v) => { p.bOut = v; }, 'bo')), 'b'));
    mats.appendChild(row);
    segIn.sync(); segL.sync();
    update();
  }

  // -- what the first k steps have computed
  function known() {
    const z = [[null, null], [null, null]], a = [null, null];
    let f = null;
    for (const s of steps.slice(0, k)) {
      if (s.kind === 'z') z[s.layer][s.unit] = s.value;
      else if (s.kind === 'act') a[s.layer] = s.value;
      else f = s.value;
    }
    return { z, a, f };
  }

  function update() {
    const kn = known();
    const cur = k > 0 ? steps[k - 1] : null;
    const setOut = (key, v) => { const c = cells[key]; if (!c) return; c.textContent = v === null ? '·' : num(v); c.classList.toggle('empty', v === null); };
    Object.values(cells).forEach((c) => c.classList.remove('hot', 'warm', 'act'));
    for (let l = 0; l < layers; l++) {
      for (let j = 0; j < H; j++) { setOut(`z${l}.${j}`, kn.z[l][j]); setOut(`a${l}.${j}`, kn.a[l] ? kn.a[l][j] : null); }
      if (l > 0) for (let c = 0; c < H; c++) setOut(`in${l}.${c}`, kn.a[l - 1] ? kn.a[l - 1][c] : null);
    }
    for (let c = 0; c < H; c++) setOut(`ino.${c}`, kn.a[layers - 1] ? kn.a[layers - 1][c] : null);
    setOut('f', kn.f);
    const hot = (key, cls = 'hot') => cells[key] && cells[key].classList.add(cls);
    let text = 'Press <b>step</b> to compute the first number. Each step is one row of a matrix times the column beside it, plus one bias; then tanh, a layer at a time.';
    if (cur && cur.kind === 'z') {
      const l = cur.layer, j = cur.unit, cols = cur.row.length;
      for (let c = 0; c < cols; c++) { hot(`W${l}.${j}.${c}`); hot(`in${l}.${c}`, 'warm'); }
      hot(`b${l}.${j}`); hot(`z${l}.${j}`);
      const terms = cur.row.map((w, c) => `${paren(w)} · ${paren(cur.input[c])}`).join(' + ');
      text = `z${sup(l)}<sub>${j + 1}</sub> = row ${j + 1} of W${sup(l)} times ${l === 0 ? 'x' : `a${sup(l - 1)}`}, plus b${sup(l)}<sub>${j + 1}</sub>: ` +
        `${terms} + ${paren(cur.bias)} = <b>${num(cur.value)}</b>`;
    } else if (cur && cur.kind === 'act') {
      const l = cur.layer;
      for (let j = 0; j < H; j++) { hot(`z${l}.${j}`, 'act'); hot(`a${l}.${j}`, 'act'); }
      text = `a${sup(l)} = tanh(z${sup(l)}), entry by entry: ` + cur.z.map((v, j) => `tanh ${num(v)} = <b>${num(cur.value[j])}</b>`).join(', ') +
        (l + 1 < layers ? `; a${sup(l)} is the column layer ${l + 2} multiplies` : '; the output row multiplies it next');
    } else if (cur && cur.kind === 'out') {
      for (let c = 0; c < H; c++) { hot(`wo.${c}`); hot(`ino.${c}`, 'warm'); }
      hot('bo'); hot('f');
      const terms = cur.row.map((w, c) => `${paren(w)} · ${paren(cur.input[c])}`).join(' + ');
      text = `f = w<sup>T</sup>a${sup(layers - 1)} + b, the row times the column: ${terms} + ${paren(cur.bias)} = <b>${num(cur.value)}</b>`;
    }
    say.innerHTML = text;
    slider.max = String(steps.length);
    slider.value = String(k);
    stepText.textContent = `step ${k} of ${steps.length}`;
    bReset.disabled = bBack.disabled = k === 0;
    bStep.disabled = bAll.disabled = k === steps.length;
    draw(kn, cur);
  }

  // -- the network: columns of nodes, every edge one matrix entry
  const COLORS = { in: '#7fb2f0', hid: ['#7fd3d6', '#93dc97'], out: '#f2897c', edge: '#b9bfcc', hot: '#d98c1f', act: '#0a7d5a', focus: '#6b40d8', ink: '#1a1c22' };
  let lastKn = null, lastCur = null;
  function draw(kn = lastKn, cur = lastCur) {
    lastKn = kn; lastCur = cur;
    if (!kn) return;
    const dpr = window.devicePixelRatio || 1, Wc = 260, Hc = 330;
    canvas.width = Wc * dpr; canvas.height = Hc * dpr;
    const g = canvas.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, Wc, Hc);
    const sizes = [nIn, ...Array(layers).fill(H), 1];
    const xs = sizes.map((_, i) => 30 + (i * (Wc - 60)) / (sizes.length - 1));
    const ys = sizes.map((n) => Array.from({ length: n }, (_, i) => 175 + (i - (n - 1) / 2) * 100));
    const R = 26;
    // edges: layer i -> i + 1; edge (j, c) is entry (j, c) of that layer's matrix
    for (let i = 0; i + 1 < sizes.length; i++) {
      for (let j = 0; j < sizes[i + 1]; j++) for (let c = 0; c < sizes[i]; c++) {
        const layerKey = i < layers ? i : 'out';
        let color = COLORS.edge, w = 1.6;
        if (cur && ((cur.kind === 'z' && cur.layer === i && cur.unit === j) || (cur.kind === 'out' && layerKey === 'out'))) { color = COLORS.hot; w = 4; }
        if (focus && focus.layer === layerKey && focus.j === j && focus.c === c) { color = COLORS.focus; w = 5; }
        g.strokeStyle = color; g.lineWidth = w;
        g.beginPath(); g.moveTo(xs[i] + R, ys[i][c]); g.lineTo(xs[i + 1] - R, ys[i + 1][j]); g.stroke();
      }
    }
    // nodes with their values
    g.textAlign = 'center'; g.textBaseline = 'middle';
    sizes.forEach((n, i) => {
      for (let j = 0; j < n; j++) {
        const x = xs[i], y = ys[i][j];
        let fill, v = null, ring = null, sub = null;
        if (i === 0) { fill = COLORS.in; v = p.x[j]; }
        else if (i === sizes.length - 1) { fill = COLORS.out; v = kn.f; if (cur && cur.kind === 'out') ring = COLORS.hot; }
        else {
          const l = i - 1; fill = COLORS.hid[l];
          if (kn.a[l]) v = kn.a[l][j];
          else if (kn.z[l][j] !== null) sub = `z ${num(kn.z[l][j])}`;
          if (cur && cur.kind === 'z' && cur.layer === l && cur.unit === j) ring = COLORS.hot;
          if (cur && cur.kind === 'act' && cur.layer === l) ring = COLORS.act;
        }
        g.beginPath(); g.arc(x, y, R, 0, 2 * Math.PI);
        g.fillStyle = fill; g.fill();
        g.lineWidth = ring ? 4 : 2; g.strokeStyle = ring || COLORS.ink; g.stroke();
        g.fillStyle = COLORS.ink;
        if (v !== null) { g.font = '600 13px system-ui, sans-serif'; g.fillText(num(v), x, y); }
        else if (sub) { g.font = '11px system-ui, sans-serif'; g.fillText(sub, x, y); }
        else { g.font = '14px system-ui, sans-serif'; g.fillStyle = '#5c6270'; g.fillText('?', x, y); }
      }
    });
    // column labels
    g.font = 'italic 15px system-ui, sans-serif'; g.fillStyle = '#5c6270';
    const labels = ['x', ...Array.from({ length: layers }, (_, l) => `a${['⁽¹⁾', '⁽²⁾'][l]}`), 'f'];
    labels.forEach((t, i) => g.fillText(t, xs[i], 40));
  }

  rebuild();
  return { root, get step() { return k; }, setStep(n) { k = Math.max(0, Math.min(steps.length, n)); update(); } };
}
