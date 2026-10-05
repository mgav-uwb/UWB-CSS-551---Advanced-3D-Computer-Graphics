// inverse-render: rendering run backwards. A target image of one sphere under
// one directional light is rendered from hidden parameters; a second render
// starts from a wrong guess, and gradient descent (Adam) on the image loss
// moves albedo, light direction, radius and center until the two images
// agree. The renderer and its hand-written gradients live in
// lib/core/inverse-render.js (checked against finite differences in
// lib/tests/inverse-render.test.mjs). The edge toggle shows the visibility
// problem: with a hard edge a pixel is either in or out, so the loss has no
// radius gradient from the silhouette (exactly zero under flat shading); a
// soft edge of width w (Soft Rasterizer style) gives one back.
import { SliderRow, ButtonRow, ValueTable, makeButton, makeRow } from '../core/cockpit.js';
import { makeShell } from '../core/demo-shell.js';
import { resolveControlIds } from './registry.js';
import { TRUE_PARAMS, START_PARAMS, render, lossAndGrad, makeFit } from '../core/inverse-render.js';

// Order matters for tools/test-demos.mjs (it drives the FIRST range input):
// `steps` starts training at once, which changes the readout and the render.
const PARAMS = {
  steps: { label: 'steps', min: 0, max: 600, step: 1, value: 0, format: (v) => v.toFixed(0) },
  w: { label: 'edge w', min: 0.5, max: 4, step: 0.1, value: 1.5, format: (v) => `${v.toFixed(1)} px` },
  lr: { label: 'rate', min: 0.005, max: 0.08, step: 0.005, value: 0.02, format: (v) => v.toFixed(3) },
};
const N = 64;
const FREE = {
  all: [true, true, true, true, true, true, true, true],
  appearance: [true, true, true, true, true, false, false, false],
  radius: [false, false, false, false, false, true, false, false],
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Top left, the <em>target</em>: a 64 × 64 render of a sphere from hidden parameters (the
  "photograph"). Top right, the <em>current</em> render from the optimizer's parameters. Bottom
  left, the error |current − target|, brightened. Bottom right, each pixel's share of
  dL/dr, the loss gradient with respect to the radius: red pushes the radius up, blue down.</p>
  <h4>The concept</h4>
  <p>The renderer is a function of its parameters, and its gradient is written out by the chain
  rule. Each step renders, compares with the target (mean squared error), back-propagates
  through every pixel, and lets Adam move the free parameters. With a <em>hard</em> edge a pixel
  is inside or outside the sphere; moving the radius a little changes no pixel center's
  coverage, so the silhouette contributes nothing to dL/dr. Under <em>flat</em> shading that is
  the only place the radius shows, and it never moves. A <em>soft</em> edge (coverage a sigmoid
  of the signed distance, width w) gives the silhouette a gradient back.</p>
  <h4>Try this</h4>
  <p>Press play: everything converges in about 300 steps. Then pick flat, hard, optimize
  radius, and play: dL/dr reads 0 and the radius stays put. Switch the edge to soft: the
  bottom-right panel lights up along the rim and the radius walks to 0.62. In the radius and color+light modes, the parameters that are not optimized start at their true values.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const enc = (v) => {
  const c = Math.min(1, Math.max(0, v));
  return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
};

export function make(container, { stage = 'embed', controls } = {}) {
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'inverse-render');
  const model = { steps: PARAMS.steps.value, w: PARAMS.w.value, lr: PARAMS.lr.value, shading: 'lambert', edge: 'hard', free: 'all' };
  const opts = () => ({ n: N, edge: model.edge, w: model.w, shading: model.shading });
  let target, fit, last, history = [], anim = null, playing = false;
  let stepsPerFrame = 4;

  const shell = makeShell(container, {
    stage, help: { html: HELP_HTML },
    settings: [
      { label: 'steps/frame', decimals: 0, title: 'Optimizer steps per animation frame, default 4', getCurrent: () => stepsPerFrame, apply: (v) => { stepsPerFrame = Math.max(1, Math.round(v)); } },
    ],
    legend: 'play: the optimizer fits the render to the target', nav: null,
  });
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 540; canvas.style.display = 'block';
  if (stage === 'full') { canvas.style.width = '100%'; canvas.style.height = '100%'; }
  shell.sceneEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const tile = document.createElement('canvas');
  tile.width = N; tile.height = N;
  const tctx = tile.getContext('2d');

  const controlsCard = shell.addCard('controller: the optimizer');
  const sliders = {};
  for (const id of ids) {
    const s = new SliderRow(controlsCard, { id: `inverse-render-${id}`, ...PARAMS[id] });
    sliders[id] = s;
    s.onInput((v) => {
      model[id] = v;
      if (id === 'steps') { playing = false; run(); } else run(true);
    });
  }
  const row = makeRow(controlsCard);
  const playBtn = makeButton(row, 'play', () => { playing = !playing; if (playing && model.steps >= PARAMS.steps.max) { model.steps = 0; reset(); } run(); });
  makeButton(row, 'step', () => { playing = false; setSteps(Math.min(PARAMS.steps.max, (fit ? fit.iter : 0) + 1)); run(); });
  makeButton(row, 'reset', () => { playing = false; setSteps(0); run(true); });
  const shadingRow = new ButtonRow(controlsCard, { id: 'inverse-render-shading', label: 'shading', value: model.shading,
    options: [{ value: 'flat', label: 'flat' }, { value: 'lambert', label: 'Lambert' }, { value: 'blinn', label: 'Blinn-Phong' }] });
  shadingRow.onChange((v) => { model.shading = v; run(true); });
  const edgeRow = new ButtonRow(controlsCard, { id: 'inverse-render-edge', label: 'edge', value: model.edge,
    options: [{ value: 'hard', label: 'hard' }, { value: 'soft', label: 'soft' }] });
  edgeRow.onChange((v) => { model.edge = v; run(true); });
  const freeRow = new ButtonRow(controlsCard, { id: 'inverse-render-free', label: 'optimize', value: model.free,
    options: [{ value: 'all', label: 'all' }, { value: 'appearance', label: 'color+light' }, { value: 'radius', label: 'radius' }] });
  freeRow.onChange((v) => { model.free = v; run(true); });

  const readoutCard = shell.addCard('readout: current vs true');
  const f3 = (a) => a.map((v) => v.toFixed(2).replace('-', '−')).join('  ');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'step', label: 'step', format: (v) => v.toFixed(0) },
      { id: 'loss', label: 'loss', format: (v) => v.toExponential(2) },
      { id: 'alb', label: 'albedo', format: (v) => v },
      { id: 'albT', label: '  true', format: (v) => v, className: 'row-h' },
      { id: 'light', label: 'light az el', format: (v) => v },
      { id: 'lightT', label: '  true', format: (v) => v, className: 'row-h' },
      { id: 'geo', label: 'r cx cy', format: (v) => v },
      { id: 'geoT', label: '  true', format: (v) => v, className: 'row-h' },
      { id: 'dr', label: 'dL/dr rim, in', format: (v) => v },
    ],
  });
  table.table.style.whiteSpace = 'nowrap';
  const note = document.createElement('p');
  note.className = 'demo-hint';
  note.textContent = 'rows: current values, then true; P = a·S + (1 − a)·BG per pixel; gradients by the chain rule, checked against finite differences; Adam on the free parameters';
  readoutCard.appendChild(note);

  function setSteps(v) {
    model.steps = v;
    if (sliders.steps) { sliders.steps.input.value = String(v); sliders.steps.readout.textContent = PARAMS.steps.format(v); }
  }
  function reset() {
    target = render(TRUE_PARAMS, opts());
    // parameters that are not optimized start at their true values, so the
    // free ones are the only thing wrong
    const free = FREE[model.free];
    const start = START_PARAMS.map((v, i) => (free[i] ? v : TRUE_PARAMS[i]));
    fit = makeFit({ start, target, opts: opts(), lr: model.lr, free });
    last = lossAndGrad(fit.p, target, opts());
    history = [last.loss];
  }
  // Advance the optimizer toward model.steps a few steps per frame; while
  // playing, keep raising model.steps. Restart (deterministic replay) when
  // the target count drops below the steps already taken or a setting changes.
  function run(restart = false) {
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    if (restart || !fit || model.steps < fit.iter) reset();
    playBtn.textContent = playing ? 'pause' : 'play';
    draw();
    const tick = () => {
      if (playing) setSteps(Math.min(PARAMS.steps.max, Math.max(model.steps, fit.iter + stepsPerFrame)));
      const k = Math.min(stepsPerFrame, model.steps - fit.iter);
      for (let i = 0; i < k; i++) { fit.step(); }
      if (k > 0) { last = lossAndGrad(fit.p, target, opts()); history.push(last.loss); }
      if (playing && fit.iter >= PARAMS.steps.max) playing = false;
      playBtn.textContent = playing ? 'pause' : 'play';
      draw();
      anim = fit.iter < model.steps || playing ? requestAnimationFrame(tick) : null;
    };
    if (fit.iter < model.steps || playing) anim = requestAnimationFrame(tick);
  }

  function blit(img, x, y, s, mode) {
    const id = tctx.createImageData(N, N);
    let maxR = 1e-12;
    if (mode === 'grad') for (let k = 0; k < N * N; k++) maxR = Math.max(maxR, Math.abs(last.mapR[k]));
    for (let k = 0; k < N * N; k++) {
      let r, g, b;
      if (mode === 'img') { r = enc(img[3 * k]); g = enc(img[3 * k + 1]); b = enc(img[3 * k + 2]); }
      else if (mode === 'err') {
        const e = (Math.abs(img[3 * k] - target[3 * k]) + Math.abs(img[3 * k + 1] - target[3 * k + 1]) + Math.abs(img[3 * k + 2] - target[3 * k + 2])) / 3;
        r = g = b = enc(Math.min(1, 3 * e));
      } else {
        // dL/dr pushes r DOWN when positive (descent): show −dL/dr, red = grow, blue = shrink
        const x = -last.mapR[k] / maxR, v = Math.sign(x) * Math.sqrt(Math.abs(x)); // sqrt: a few rim pixels dominate otherwise
        r = v > 0 ? Math.round(40 + 215 * v) : 40; b = v < 0 ? Math.round(40 - 215 * v) : 40; g = 40;
        if (maxR <= 1e-12) { r = g = b = 34; }
      }
      id.data[4 * k] = r; id.data[4 * k + 1] = g; id.data[4 * k + 2] = b; id.data[4 * k + 3] = 255;
    }
    tctx.putImageData(id, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tile, x, y, s, s);
  }

  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#171b26'; ctx.fillRect(0, 0, W, H);
    const pad = Math.round(W * 0.02), lab = Math.round(H * 0.045);
    const top = Math.round(36 * (W / (canvas.clientWidth || W)));
    const plotW = Math.round(W * 0.3);
    const s = Math.floor(Math.min((W - plotW - 4 * pad) / 2, (H - top - 2 * pad - 2 * lab) / 2));
    const fs = Math.max(11, Math.round(H * 0.028));
    ctx.font = `${fs}px system-ui, sans-serif`;
    const cells = [
      ['target (hidden parameters)', target, 'img'],
      [`current, step ${fit.iter}`, last.img, 'img'],
      ['|current − target| × 3', last.img, 'err'],
      ['−dL/dr per pixel (red: grow)', null, 'grad'],
    ];
    cells.forEach(([label, img, mode], q) => {
      const cx = pad + (q % 2) * (s + pad), cy = top + Math.floor(q / 2) * (s + lab + pad);
      ctx.fillStyle = '#c9cfdd'; ctx.fillText(label, cx, cy + fs);
      blit(img, cx, cy + lab, s, mode);
      ctx.strokeStyle = 'rgba(140,150,175,0.4)'; ctx.lineWidth = 1; ctx.strokeRect(cx + 0.5, cy + lab + 0.5, s - 1, s - 1);
    });
    if (Math.abs(last.parts.rEdge) + Math.abs(last.parts.rInterior) === 0) {
      const cx = pad + s + pad, cy = top + s + lab + pad + lab;
      ctx.fillStyle = '#ffb400'; ctx.fillText('dL/dr = 0 at every pixel', cx + 8, cy + s / 2);
    }
    // loss plot (log scale)
    const ix = W - plotW - pad, iy = top + lab, iw = plotW, ih = H - top - pad - lab;
    ctx.fillStyle = '#c9cfdd'; ctx.fillText('loss vs step (log)', ix, top + fs);
    ctx.strokeStyle = 'rgba(140,150,175,0.5)'; ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);
    if (history.length > 1) {
      const lo = Math.log10(1e-9), hi = Math.log10(Math.max(...history, 1e-8));
      const span = Math.max(PARAMS.steps.max / 2, history.length);
      ctx.strokeStyle = '#ffb400'; ctx.lineWidth = 2; ctx.beginPath();
      history.forEach((l, i) => {
        const x = ix + 4 + ((iw - 8) * i) / span;
        const y = iy + 4 + (ih - 8) * (1 - (Math.log10(Math.max(1e-9, l)) - lo) / (hi - lo || 1));
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.stroke();
    }
    const p = fit.p;
    table.update('step', fit.iter);
    table.update('loss', last.loss);
    table.update('alb', f3(p.slice(0, 3))); table.update('albT', f3(TRUE_PARAMS.slice(0, 3)));
    table.update('light', f3(p.slice(3, 5))); table.update('lightT', f3(TRUE_PARAMS.slice(3, 5)));
    table.update('geo', f3(p.slice(5, 8))); table.update('geoT', f3(TRUE_PARAMS.slice(5, 8)));
    const e1 = (v) => (v === 0 ? '0' : v.toExponential(1).replace('-', '−'));
    table.update('dr', `${e1(last.parts.rEdge)}, ${e1(last.parts.rInterior)}`);
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (stage === 'full' && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => { const w = shell.sceneEl.clientWidth, h = shell.sceneEl.clientHeight; if (w < 2 || h < 2) return; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); draw(); }).observe(shell.sceneEl);
  }
  if (stage !== 'full' && typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => { for (const e of entries) { if (!e.isIntersecting) continue; const r = canvas.getBoundingClientRect(); if (r.width < 2) continue; canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); draw(); } }).observe(canvas);
  }
  reset(); draw();
}
