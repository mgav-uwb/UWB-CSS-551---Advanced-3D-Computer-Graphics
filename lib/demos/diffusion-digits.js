// diffusion-digits: the diffusion mechanism on REAL images, small enough to
// compute exactly. The dataset is 2,000 handwritten digits (MNIST, 20x20,
// 200 per class); an image is a 400-vector, and the denoiser is the exact
// posterior mean over the dataset (lib/core/diffusion-nd.js), the function a
// network learns to approximate. Three knobs a real model has:
//   digit   — conditioning (only that class pulls)
//   guide   — classifier-free guidance scale w (1 = plain conditioning)
//   smooth  — kernel bandwidth h. 0 = exact: every sample lands ON a training
//             digit (memorization). > 0 keeps blending neighbors to the end,
//             like the smooth function a network learns: samples land BETWEEN
//             training digits (novel); too large and everything collapses to
//             one blurry average. The "nearest training digit" panel makes
//             the difference visible: distance ~0 at exact, larger above.
// Reverse-only: start from noise, walk back `steps` times; the run replays as
// an animation after the settled frame is drawn.
import { SliderRow, ButtonRow, ValueTable } from '../core/cockpit.js';
import { makeShell } from '../core/demo-shell.js';
import { resolveControlIds } from './registry.js';
import { makeDataset, sampleVec, nearestIndex, makeRng, randn } from '../core/diffusion-nd.js';
import { makeDigitView, noiseSamples, wireSizing, loadMnistSubset, D, M, NOVEL_THRESHOLD } from './digit-view.js';

const PARAMS = {
  steps: { label: 'steps', min: 2, max: 60, step: 1, value: 30, format: (v) => v.toFixed(0) },
  guide: { label: 'guide', min: 0, max: 6, step: 0.5, value: 1, format: (v) => `w = ${v.toFixed(1)}` },
  smooth: { label: 'smooth', min: 0, max: 5, step: 0.25, value: 0, format: (v) => (v === 0 ? 'exact' : `h = ${v.toFixed(2)}`) },
};
const DIGIT_OPTIONS = [{ value: -1, label: 'any' }, ...Array.from({ length: 10 }, (_, i) => ({ value: i, label: String(i) }))];
const SEED = 5;
const ANIM_MS = 1600;

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Diffusion on real images. 2,000 handwritten digits (20×20 pixels) are the
  training set; each is a point in a 400-dimensional space. Start from pure
  noise and walk back <code>steps</code> times, each step asking the exact
  denoiser "which digit was this, most likely?"</p>
  <h4>The three knobs</h4>
  <p><code>digit</code> conditions the denoiser (only that class pulls).
  <code>guide</code> is classifier-free guidance: exaggerate what the class
  adds. <code>smooth</code> is the honest one: at "exact" the denoiser is the
  true posterior mean for this finite set, so every sample is a training digit
  (memorization). Raise it and the denoiser blends neighbors, like the smooth
  function a network learns, and samples appear that are in nobody's training
  set; raise it too far and everything collapses to one blurry average. The
  right panel shows the selected sample beside its nearest training digit and
  the distance.</p>
  <h4>Try this</h4>
  <p>Pick a digit, run at exact: click samples, distance ≈ 0. Set smooth to 3:
  distances jump, and the samples are new digits. Set it to 5: one blur.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

export function make(container, { stage = 'embed', controls } = {}) {
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'diffusion-digits');
  const model = { digit: 3, steps: PARAMS.steps.value, guide: PARAMS.guide.value, smooth: PARAMS.smooth.value };
  let data = null;
  let frames = []; let shown = noiseSamples(makeRng, randn, SEED); let stepK = 0; let selected = 0; let animHandle = null;

  const shell = makeShell(container, { stage, help: { html: HELP_HTML }, settings: [], legend: 'drag steps · click a sample to inspect it', nav: null });
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 540; canvas.style.display = 'block';
  if (stage === 'full') { canvas.style.width = '100%'; canvas.style.height = '100%'; }
  shell.sceneEl.appendChild(canvas);
  const view = makeDigitView(canvas, canvas.getContext('2d'));

  const controlsCard = shell.addCard('controller — the denoiser');
  const digitRow = new ButtonRow(controlsCard, { id: 'diffusion-digits-digit', label: 'digit', options: DIGIT_OPTIONS, value: model.digit });
  digitRow.onChange((v) => { model.digit = Number(v); recompute(); });
  for (const id of ids) {
    const s = new SliderRow(controlsCard, { id: `diffusion-digits-${id}`, ...PARAMS[id] });
    s.onInput((v) => { model[id] = v; recompute(); });
  }
  const readoutCard = shell.addCard('readout — the sample');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'digit', label: 'digit', format: (v) => v },
      { id: 'step', label: 'step', format: (v) => v },
      { id: 'guide', label: 'guide w', format: (v) => v.toFixed(1) },
      { id: 'smooth', label: 'smooth h', format: (v) => (v === 0 ? 'exact' : v.toFixed(2)) },
      { id: 'dist', label: 'nearest digit', format: (v) => (Number.isFinite(v) ? v.toFixed(3) : '–') },
      { id: 'novel', label: 'verdict', format: (v) => v },
    ],
  });
  const note = document.createElement('p');
  note.className = 'demo-hint';
  note.textContent = 'denoiser = exact posterior mean over 2,000 training digits (smooth = exact); a network learns a smoother version of it';
  readoutCard.appendChild(note);

  function draw() {
    let nearest = null, dist = NaN;
    if (data && shown) { const nn = nearestIndex(shown[selected], data); dist = nn.dist; nearest = { vec: data.x.subarray(nn.index * D, (nn.index + 1) * D), label: data.y[nn.index], dist }; }
    view.draw({ shown, selected, nearest, loadingText: data ? null : 'loading 2,000 digits…' });
    table.update('digit', model.digit < 0 ? 'any' : String(model.digit));
    table.update('step', `${stepK} / ${model.steps}`);
    table.update('guide', model.guide);
    table.update('smooth', model.smooth);
    table.update('dist', dist);
    table.update('novel', Number.isFinite(dist) ? (dist < NOVEL_THRESHOLD ? 'memorized' : 'novel') : '–');
  }
  function recompute() {
    if (animHandle) { cancelAnimationFrame(animHandle); animHandle = null; }
    if (!data) { shown = noiseSamples(makeRng, randn, SEED + Math.round(model.steps * 7 + model.guide * 3 + model.smooth * 11)); stepK = 0; draw(); return; }
    frames = [];
    sampleVec({ data, steps: model.steps, m: M, seed: SEED, cls: model.digit, w: model.guide, bw: model.smooth,
      onStep: (k, t, samples) => frames.push({ k, samples: samples.map((v) => v.slice()) }) });
    const last = frames[frames.length - 1]; shown = last.samples; stepK = last.k; draw();
    const start = performance.now();
    const tick = (now) => {
      if (!frames.length) { animHandle = null; return; }
      const u = Math.min(1, Math.max(0, (now - start) / ANIM_MS));
      const f = frames[Math.min(frames.length - 1, Math.max(0, Math.round(u * (frames.length - 1))))];
      shown = f.samples; stepK = f.k; draw();
      animHandle = u < 1 ? requestAnimationFrame(tick) : null;
    };
    animHandle = requestAnimationFrame(tick);
  }
  canvas.addEventListener('click', (ev) => { const i = view.hitTest(ev); if (i >= 0) { selected = i; draw(); } });
  wireSizing(canvas, shell.sceneEl, stage, draw);
  draw();
  (async () => {
    try { data = await loadMnistSubset(makeDataset); recompute(); }
    catch (err) { console.warn('diffusion-digits: could not load the MNIST subset', err); }
  })();
}
