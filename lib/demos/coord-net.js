// coord-net: an image is a function from pixel coordinates to colour, and a small network can be
// trained to BE that function. Three multilayer perceptrons fit the same 64 × 64 picture side by
// side, live in the browser (lib/core/coord-net.js: hand-written backward pass and Adam, seeded
// mini-batches of 256 pixels): a ReLU network on raw (x, y), which blurs (spectral bias); the same
// network on Fourier features of (x, y) with frequency scale σ; and a SIREN, sine activations with
// frequency ω₀. Readouts: steps, mini-batch loss and full-image PSNR for each, and a PSNR-vs-step
// plot. Training is deterministic, so a reading at step N matches
// lectures/L14-neural-nets-embeddings/analysis/numbers-coord-net.json at step N.
import { SliderRow, ButtonRow, ValueTable, makeRow, makeButton } from '../core/cockpit.js';
import { makeShell } from '../core/demo-shell.js';
import { resolveControlIds } from './registry.js';
import { IMAGE_N, makeImage, makeTrainer, render, mse, psnr, paramCount } from '../core/coord-net.js';

// Order matters for tools/test-demos.mjs (it drives the FIRST range input): sigma restarts the
// Fourier network, which changes its panel, its PSNR readout and its parameter row at once.
const PARAMS = {
  sigma: { label: 'Fourier scale σ', min: 1, max: 48, step: 1, value: 6, format: (v) => v.toFixed(0) },
  omega: { label: 'SIREN ω₀', min: 1, max: 90, step: 1, value: 30, format: (v) => v.toFixed(0) },
};
const KINDS = ['relu', 'fourier', 'siren'];
const NAMES = { relu: 'ReLU, raw (x, y)', fourier: 'ReLU + Fourier features', siren: 'SIREN' };
const SHORT = { relu: 'ReLU', fourier: 'Fourier', siren: 'SIREN' };
const COLORS = { relu: '#ff7a59', fourier: '#4fa3ff', siren: '#00b46e' };
const IMAGE_OPTIONS = [{ value: 'card', label: 'test card' }, { value: 'blobs', label: 'blobs' }];

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Left: a 64 × 64 picture. Right of it: three small neural networks, each trained to output the
  colour (r, g, b) of the picture at a pixel coordinate (x, y). Press <b>play</b>: every step each
  network sees 256 random pixels, measures its squared error, and takes one Adam step. The plot
  shows each network's PSNR (peak signal-to-noise ratio, higher is better) against the step.</p>
  <h4>The concept</h4>
  <p>A network fitted to one image is pure function approximation: it memorizes one signal. The
  plain ReLU network learns the smooth parts and blurs the checkerboard and stripes, because
  networks on raw coordinates learn low frequencies first (spectral bias). Feeding it sines and
  cosines of the coordinates at random frequencies of scale σ (Fourier features) fixes that; so
  does using sine as the activation (SIREN), with ω₀ setting its frequency.</p>
  <h4>Try this</h4>
  <p>Play to step 2000 (it pauses there). Then drag σ to 1 (blurry) and to 48 (noisy speckle):
  the scale is a trade-off. Drag ω₀ to 1 and the SIREN behaves like the blurry ReLU. Switch to
  <i>blobs</i>, a picture with only low frequencies: now the plain ReLU network does well.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

export function make(container, { stage = 'embed', controls } = {}) {
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'coord-net');
  const model = { sigma: PARAMS.sigma.value, omega: PARAMS.omega.value, image: 'card' };
  let pauseAt = 2000;          // ⚙: auto-pause at this step (0: never), so readings match the tables
  let frameBudget = 30;        // ⚙: milliseconds of training per animation frame
  let target = makeImage(model.image);
  const tr = {}, recon = {}, score = {}, history = {};
  let playing = false, raf = null, visible = true, rr = 0;

  const optsFor = (k) => (k === 'fourier' ? { sigma: model.sigma } : k === 'siren' ? { omega0: model.omega } : {});
  function restart(k) {
    tr[k] = makeTrainer(k, target, optsFor(k));
    history[k] = [];
    evaluate(k);
  }
  function evaluate(k) {
    recon[k] = render(tr[k].net, IMAGE_N, recon[k]);
    score[k] = psnr(mse(recon[k], target));
    const h = history[k];
    if (!h.length || h[h.length - 1][0] !== tr[k].steps) h.push([tr[k].steps, score[k]]);
  }

  const shell = makeShell(container, {
    stage, help: { html: HELP_HTML },
    settings: [
      { label: 'pause at step', decimals: 0, title: 'Training pauses when every network reaches this step (0: never). Default 2000.', getCurrent: () => pauseAt, apply: (v) => { pauseAt = Math.max(0, Math.round(v)); } },
      { label: 'ms per frame', decimals: 0, title: 'Training time per animation frame (speed vs. smoothness). Default 30.', getCurrent: () => frameBudget, apply: (v) => { frameBudget = Math.min(200, Math.max(5, Math.round(v))); } },
    ],
    legend: 'play: three networks learn the picture, live', nav: null,
  });
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 540; canvas.style.display = 'block';
  if (stage === 'full') { canvas.style.width = '100%'; canvas.style.height = '100%'; }
  shell.sceneEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const tile = document.createElement('canvas');
  tile.width = tile.height = IMAGE_N;
  const tctx = tile.getContext('2d');
  const tdata = tctx.createImageData(IMAGE_N, IMAGE_N);

  const controlsCard = shell.addCard('controller: the encodings');
  for (const id of ids) {
    const s = new SliderRow(controlsCard, { id: `coord-net-${id}`, ...PARAMS[id] });
    s.onInput((v) => { model[id] = v; restart(id === 'sigma' ? 'fourier' : 'siren'); draw(); });
  }
  const imageRow = new ButtonRow(controlsCard, { id: 'coord-net-image', label: 'picture', options: IMAGE_OPTIONS, value: model.image });
  imageRow.onChange((v) => { model.image = v; target = makeImage(v); KINDS.forEach(restart); draw(); });
  const row = makeRow(controlsCard);
  const playBtn = makeButton(row, 'play', () => { setPlaying(!playing); playBtn.blur(); });
  const stepBtn = makeButton(row, '+100', () => { setPlaying(false); for (let i = 0; i < 100; i++) KINDS.forEach((k) => tr[k].step()); KINDS.forEach(evaluate); draw(); stepBtn.blur(); });
  const resetBtn = makeButton(row, 'reset', () => { setPlaying(false); KINDS.forEach(restart); draw(); resetBtn.blur(); });

  const readoutCard = shell.addCard('readout: the fits');
  // one row per network: steps, mini-batch loss, full-image PSNR (weights are in the panel captions)
  const fmtLoss = (v) => (Number.isFinite(v) ? v.toFixed(4) : '–');
  const table = new ValueTable(readoutCard, {
    rows: [{ id: 'head', label: '', cols: 3, format: (v) => v }].concat(KINDS.map((k) => ({
      id: k, label: SHORT[k], cols: 3,
      format: (v) => v,
    }))),
  });
  table.table.style.whiteSpace = 'nowrap';
  table.update('head', ['step', 'loss', 'PSNR dB']);
  const note = document.createElement('p');
  note.className = 'demo-hint';
  note.textContent = '2 hidden layers of 48; Adam; 256 random pixels per step; PSNR over all 4,096 pixels';
  readoutCard.appendChild(note);

  function setPlaying(v) {
    playing = v;
    playBtn.textContent = v ? 'pause' : 'play';
    if (v && !raf && visible) raf = requestAnimationFrame(tick);
    if (!v && raf) { cancelAnimationFrame(raf); raf = null; }
    draw();
  }
  function tick() {
    raf = null;
    if (!playing || !visible) return;
    const t0 = performance.now();
    const done = () => pauseAt > 0 && KINDS.every((k) => tr[k].steps >= pauseAt);
    while (performance.now() - t0 < frameBudget && !done()) KINDS.forEach((k) => tr[k].step());
    // one full-image render per frame, round-robin, keeps the frame cost bounded
    evaluate(KINDS[rr++ % 3]);
    if (done()) { KINDS.forEach(evaluate); setPlaying(false); return; }
    draw();
    raf = requestAnimationFrame(tick);
  }

  function blit(img, x, y, size) {
    const d = tdata.data;
    for (let p = 0; p < IMAGE_N * IMAGE_N; p++) {
      for (let c = 0; c < 3; c++) d[4 * p + c] = Math.round(255 * Math.min(1, Math.max(0, img[3 * p + c])));
      d[4 * p + 3] = 255;
    }
    tctx.putImageData(tdata, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tile, x, y, size, size);
  }
  function draw() {
    const W = canvas.width, H = canvas.height, s = W / 720;
    ctx.fillStyle = '#171b26'; ctx.fillRect(0, 0, W, H);
    const pad = 10 * s, size = Math.min((W - 5 * pad) / 4, H * 0.42);
    const top = (stage === 'full' ? 58 : 26) * s;   // clear the sandbox legend strip
    ctx.font = `${Math.round(13 * s)}px system-ui, sans-serif`;
    const panels = [['target', target, '#c9cfdd', 'the picture: 4,096 pixels']].concat(KINDS.map((k) => [NAMES[k], recon[k], COLORS[k], `${paramCount(tr[k].net)} weights · ${score[k].toFixed(2)} dB`]));
    panels.forEach(([label, img, col, sub], i) => {
      const x = pad + i * (size + pad);
      ctx.fillStyle = col; ctx.fillText(label, x, top - 8 * s);
      blit(img, x, top, size);
      ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(x, top, size, size);
      ctx.fillStyle = '#c9cfdd'; ctx.fillText(sub, x, top + size + 16 * s);
    });
    // PSNR vs step
    const px = 46 * s, py = top + size + 34 * s, pw = W - px - 16 * s, ph = H - py - 26 * s;
    if (ph > 40) {
      ctx.strokeStyle = 'rgba(140,150,175,0.45)'; ctx.lineWidth = 1; ctx.strokeRect(px, py, pw, ph);
      const maxStep = Math.max(pauseAt || 0, ...KINDS.map((k) => tr[k].steps), 100);
      const lo = 5, hi = Math.max(35, ...KINDS.map((k) => Math.ceil(score[k] / 5) * 5));
      const toX = (st) => px + (pw * st) / maxStep, toY = (v) => py + ph - (ph * (Math.min(hi, Math.max(lo, v)) - lo)) / (hi - lo);
      ctx.fillStyle = '#8b93a7';
      for (let v = lo; v <= hi; v += 5) { ctx.fillText(`${v}`, px - 24 * s, toY(v) + 4 * s); ctx.strokeStyle = 'rgba(140,150,175,0.15)'; ctx.beginPath(); ctx.moveTo(px, toY(v)); ctx.lineTo(px + pw, toY(v)); ctx.stroke(); }
      ctx.fillText(`PSNR (dB) against step, 0 to ${maxStep}`, px + 8 * s, py + 16 * s);
      for (const k of KINDS) {
        const h = history[k]; if (!h.length) continue;
        ctx.strokeStyle = COLORS[k]; ctx.lineWidth = 2.5; ctx.beginPath();
        h.forEach(([st, v], i) => (i ? ctx.lineTo(toX(st), toY(v)) : ctx.moveTo(toX(st), toY(v))));
        ctx.stroke();
      }
      ctx.fillStyle = '#8b93a7';
      ctx.fillText(playing ? 'training…' : 'paused', px + pw - 70 * s, py + 16 * s);
    }
    for (const k of KINDS) table.update(k, [String(tr[k].steps), fmtLoss(tr[k].lastLoss), score[k].toFixed(2)]);
  }

  // pause work when the demo is off screen (another slide) or the tab is hidden
  const setVisible = (v) => { visible = v; if (v && playing && !raf) raf = requestAnimationFrame(tick); };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => setVisible(!document.hidden));
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (stage === 'full' && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => { const w = shell.sceneEl.clientWidth, h = shell.sceneEl.clientHeight; if (w < 2 || h < 2) return; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); draw(); }).observe(shell.sceneEl);
  }
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => {
      for (const e of entries) {
        setVisible(e.isIntersecting && !document.hidden);
        if (!e.isIntersecting || stage === 'full') continue;
        const r = canvas.getBoundingClientRect(); if (r.width < 2) continue;
        canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); draw();
      }
    }).observe(canvas);
  }
  KINDS.forEach(restart);
  draw();
}
