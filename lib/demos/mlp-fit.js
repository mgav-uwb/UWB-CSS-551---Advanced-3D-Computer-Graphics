// mlp-fit: a neural network is a function, and training makes it fit. A
// two-layer perceptron (`hidden` tanh units, 3·hidden + 1 weights) is trained
// IN THE BROWSER by gradient descent on twelve (x, y) points; drag `epochs`
// and watch the curve bend to pass through them. Between the points the
// function is smooth (it interpolates), which is the property the S10 ladder
// leans on: a learned denoiser is smooth where a lookup table is not.
import { SliderRow, ButtonRow, ValueTable } from '../core/cockpit.js';
import { makeShell } from '../core/demo-shell.js';
import { resolveControlIds } from './registry.js';
import { TARGETS, fit, predict } from '../core/mlp-fit.js';

const PARAMS = {
  epochs: { label: 'epochs', min: 0, max: 3000, step: 50, value: 400, format: (v) => v.toFixed(0) },
  hidden: { label: 'hidden', min: 1, max: 48, step: 1, value: 12, format: (v) => `${v.toFixed(0)} units` },
};
const TARGET_OPTIONS = Object.keys(TARGETS).map((k) => ({ value: k, label: k }));
const XMIN = -1.5, XMAX = 1.5, YMIN = -1.3, YMAX = 1.3;

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Twelve points sampled from a hidden curve, and a tiny neural network
  (<code>hidden</code> tanh units, 3·hidden + 1 weights) being trained to pass
  through them. <code>epochs</code> is how many gradient-descent steps have
  run: at 0 the network is a random wiggle; by a few hundred it fits.</p>
  <h4>The concept</h4>
  <p>A network is a function with knobs (weights). Training nudges the knobs
  so the function agrees with the examples. Two things to notice: with enough
  units it can fit almost anything (it is a universal approximator), and
  between the examples it is <em>smooth</em>: it interpolates instead of
  snapping to the nearest point. A learned image denoiser has exactly that
  property, and it is why a diffusion model can draw images nobody has seen.</p>
  <h4>Try this</h4>
  <p>Drag epochs from 0 up and watch the curve settle. Set hidden to 2: it
  cannot bend enough. Set it to 40 and pick the step: it fits, with a smooth
  ramp where the data has a jump.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

export function make(container, { stage = 'embed', controls } = {}) {
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'mlp-fit');
  const model = { target: 'wave', epochs: PARAMS.epochs.value, hidden: PARAMS.hidden.value };
  const disp = { truth: true };
  let result = null;

  const shell = makeShell(container, {
    stage, help: { html: HELP_HTML },
    settings: [{ label: 'truth', toggle: true, title: 'Show the hidden curve the points were sampled from', getCurrent: () => disp.truth, apply: (v) => { disp.truth = v; draw(); } }],
    legend: 'drag epochs — the network learns the curve', nav: null,
  });
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 540; canvas.style.display = 'block';
  if (stage === 'full') { canvas.style.width = '100%'; canvas.style.height = '100%'; }
  shell.sceneEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const controlsCard = shell.addCard('controller — the network');
  for (const id of ids) {
    const s = new SliderRow(controlsCard, { id: `mlp-fit-${id}`, ...PARAMS[id] });
    s.onInput((v) => { model[id] = v; recompute(); });
  }
  const targetRow = new ButtonRow(controlsCard, { id: 'mlp-fit-target', label: 'curve', options: TARGET_OPTIONS, value: model.target });
  targetRow.onChange((v) => { model.target = v; recompute(); });
  const readoutCard = shell.addCard('readout — the fit');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'units', label: 'hidden units', format: (v) => v.toFixed(0) },
      { id: 'weights', label: 'weights', format: (v) => v.toFixed(0) },
      { id: 'epochs', label: 'epochs', format: (v) => v.toFixed(0) },
      { id: 'loss', label: 'mean sq. error', format: (v) => v.toExponential(2) },
    ],
  });
  const note = document.createElement('p');
  note.className = 'demo-hint';
  note.textContent = 'f(x) = Σ w2·tanh(w1·x + b1) + b2, trained by full-batch gradient descent, seeded';
  readoutCard.appendChild(note);

  function recompute() { result = fit({ target: model.target, hidden: model.hidden, epochs: model.epochs }); draw(); }
  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#171b26'; ctx.fillRect(0, 0, W, H);
    const px = 40, py = 24, pw = W - 2 * px, ph = H - 2 * py;
    const toX = (x) => px + ((x - XMIN) / (XMAX - XMIN)) * pw;
    const toY = (y) => py + (1 - (y - YMIN) / (YMAX - YMIN)) * ph;
    ctx.strokeStyle = 'rgba(140,150,175,0.35)'; ctx.lineWidth = 1; ctx.strokeRect(px, py, pw, ph);
    ctx.beginPath(); ctx.moveTo(px, toY(0)); ctx.lineTo(px + pw, toY(0)); ctx.stroke();
    if (!result) return;
    if (disp.truth) {
      ctx.strokeStyle = 'rgba(120,150,200,0.45)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 200; i++) { const x = XMIN + ((XMAX - XMIN) * i) / 200; const y = TARGETS[model.target](x); i ? ctx.lineTo(toX(x), toY(y)) : ctx.moveTo(toX(x), toY(y)); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.strokeStyle = '#00b46e'; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i <= 300; i++) { const x = XMIN + ((XMAX - XMIN) * i) / 300; const y = Math.max(YMIN, Math.min(YMAX, predict(result.model, x))); i ? ctx.lineTo(toX(x), toY(y)) : ctx.moveTo(toX(x), toY(y)); }
    ctx.stroke();
    const { xs, ys } = result.samples;
    for (let i = 0; i < xs.length; i++) { ctx.fillStyle = '#ffb400'; ctx.beginPath(); ctx.arc(toX(xs[i]), toY(ys[i]), 6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
    ctx.fillStyle = '#c9cfdd'; ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('● samples   — the network   ┄ the hidden curve', px + 8, py + 18);
    table.update('units', model.hidden); table.update('weights', 3 * model.hidden + 1); table.update('epochs', model.epochs); table.update('loss', result.loss);
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (stage === 'full' && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => { const w = shell.sceneEl.clientWidth, h = shell.sceneEl.clientHeight; if (w < 2 || h < 2) return; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); draw(); }).observe(shell.sceneEl);
  }
  if (stage !== 'full' && typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => { for (const e of entries) { if (!e.isIntersecting) continue; const r = canvas.getBoundingClientRect(); if (r.width < 2) continue; canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); draw(); } }).observe(canvas);
  }
  recompute();
}
