// diffusion-net: a REAL learned denoiser, in the browser. A tiny class-
// conditional MLP (about a million weights, trained for fifteen minutes on a
// laptop CPU on 60,000 MNIST digits; tools/train-mlp.py) predicts the clean
// 20x20 digit behind a noisy one at time t. Same schedule and sampler as the exact-
// denoiser demos, but the function was LEARNED, so it is smooth: its samples
// are new digits, and the nearest-training-digit panel proves it (distance
// well above the memorization threshold). Knobs: digit (conditioning),
// guide (classifier-free guidance on the prediction), steps.
import { SliderRow, ButtonRow, ValueTable } from '../core/cockpit.js';
import { makeShell } from '../core/demo-shell.js';
import { resolveControlIds } from './registry.js';
import { makeDataset, nearestIndex, makeRng, randn } from '../core/diffusion-nd.js';
import { loadMlpDenoiser } from '../core/mlp-denoiser.js';
import { makeDigitView, noiseSamples, wireSizing, loadMnistSubset, D, M, NOVEL_THRESHOLD } from './digit-view.js';

const PARAMS = {
  steps: { label: 'steps', min: 2, max: 60, step: 1, value: 30, format: (v) => v.toFixed(0) },
  guide: { label: 'guide', min: 0, max: 6, step: 0.5, value: 2, format: (v) => `w = ${v.toFixed(1)}` },
};
const DIGIT_OPTIONS = [{ value: -1, label: 'any' }, ...Array.from({ length: 10 }, (_, i) => ({ value: i, label: String(i) }))];
const SEED = 8;
const ANIM_MS = 1600;
const WEIGHTS = new URL('../assets/mnist/', import.meta.url);

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>The same walk from noise to digits as the exact-denoiser demo, but the
  denoiser is now a small neural network that was <em>trained</em>: about a
  million weights, fifteen minutes on a laptop CPU, 60,000 digits. It never sees
  the training set at sampling time; it only remembers what it learned about
  digits in general.</p>
  <h4>The concept</h4>
  <p>Because the learned function is smooth, its samples land between
  training examples: the nearest-training-digit panel shows a distance well
  above the memorization threshold for every sample. That is the whole leap
  from a lookup to a generator, and the only thing that changes when you
  scale this up is the network and the data: images instead of digits, text
  instead of a class button.</p>
  <h4>Try this</h4>
  <p>Pick a digit and run at w = 1, then 3, then 6: strokes bolden, then
  overcook. Set <code>any</code> and watch the classes mix. Drop steps to 5.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

export function make(container, { stage = 'embed', controls } = {}) {
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'diffusion-net');
  const model = { digit: 3, steps: PARAMS.steps.value, guide: PARAMS.guide.value };
  let net = null, data = null;
  let frames = []; let shown = noiseSamples(makeRng, randn, SEED); let stepK = 0; let selected = 0; let animHandle = null;

  const shell = makeShell(container, { stage, help: { html: HELP_HTML }, settings: [], legend: 'a trained network denoises · click a sample to inspect it', nav: null });
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 540; canvas.style.display = 'block';
  if (stage === 'full') { canvas.style.width = '100%'; canvas.style.height = '100%'; }
  shell.sceneEl.appendChild(canvas);
  const view = makeDigitView(canvas, canvas.getContext('2d'));

  const controlsCard = shell.addCard('controller — the trained denoiser');
  const digitRow = new ButtonRow(controlsCard, { id: 'diffusion-net-digit', label: 'digit', options: DIGIT_OPTIONS, value: model.digit });
  digitRow.onChange((v) => { model.digit = Number(v); recompute(); });
  for (const id of ids) {
    const s = new SliderRow(controlsCard, { id: `diffusion-net-${id}`, ...PARAMS[id] });
    s.onInput((v) => { model[id] = v; recompute(); });
  }
  const readoutCard = shell.addCard('readout — the sample');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'digit', label: 'digit', format: (v) => v },
      { id: 'step', label: 'step', format: (v) => v },
      { id: 'guide', label: 'guide w', format: (v) => v.toFixed(1) },
      { id: 'params', label: 'weights', format: (v) => (v ? v.toLocaleString('en-US') : '–') },
      { id: 'dist', label: 'nearest digit', format: (v) => (Number.isFinite(v) ? v.toFixed(3) : '–') },
      { id: 'novel', label: 'verdict', format: (v) => v },
    ],
  });
  const note = document.createElement('p');
  note.className = 'demo-hint';
  note.textContent = 'denoiser = a trained MLP (tools/train-mlp.py); the training set is loaded only to measure how far each sample is from it';
  readoutCard.appendChild(note);

  function draw() {
    let nearest = null, dist = NaN;
    if (data && shown) { const nn = nearestIndex(shown[selected], data); dist = nn.dist; nearest = { vec: data.x.subarray(nn.index * D, (nn.index + 1) * D), label: data.y[nn.index], dist }; }
    view.draw({ shown, selected, nearest, loadingText: net ? null : 'loading the network (4 MB)…' });
    table.update('digit', model.digit < 0 ? 'any' : String(model.digit));
    table.update('step', `${stepK} / ${model.steps}`);
    table.update('guide', model.guide);
    table.update('params', net ? net.params : 0);
    table.update('dist', dist);
    table.update('novel', Number.isFinite(dist) ? (dist < NOVEL_THRESHOLD ? 'memorized' : 'novel') : '–');
  }
  function recompute() {
    if (animHandle) { cancelAnimationFrame(animHandle); animHandle = null; }
    if (!net) { shown = noiseSamples(makeRng, randn, SEED + Math.round(model.steps * 7 + model.guide * 3)); stepK = 0; draw(); return; }
    frames = [];
    net.sample({ steps: model.steps, m: M, seed: SEED, cls: model.digit, w: model.guide, onStep: (k, t, samples) => frames.push({ k, samples: samples.map((v) => v.slice()) }) });
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
    try {
      [net, data] = await Promise.all([loadMlpDenoiser(WEIGHTS), loadMnistSubset(makeDataset)]);
      recompute();
    } catch (err) { console.warn('diffusion-net: could not load the network or the digits', err); draw(); }
  })();
}
