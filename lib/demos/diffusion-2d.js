// diffusion-2d: a diffusion model's mechanism on a 2D point cloud you can
// SEE. The "images" are ~400 points on a spiral / ring / two moons. Forward
// mode: drag `t` and watch the shape dissolve into a Gaussian blob under the
// cosine noise schedule. Reverse mode: start from pure noise and step the
// denoiser `steps` times; the shape reassembles. `stochastic` switches the
// deterministic (DDIM-style) step to the noisy (DDPM-style) one.
//
// The denoiser is the EXACT posterior mean for this dataset (a softmax-
// weighted average of the data points, lib/core/diffusion.js), the answer a
// trained network approximates, so nothing is trained in the browser and
// every frame is deterministic for a given seed. Arrows (⚙ toggle) show
// "which way is the data" at every point of the plane.
import { SliderRow, ButtonRow, ValueTable } from '../core/cockpit.js';
import { makeShell } from '../core/demo-shell.js';
import { resolveControlIds } from './registry.js';
import {
  SHAPES, makeShape, makeRng, noisePoints, alphaBar, snrDb, sample,
  meanNearestDistance, scoreField,
} from '../core/diffusion.js';

// Order matters for tools/test-demos.mjs (it drives the FIRST range input):
// in the sandbox `t` is first and forward mode is the default, and `t`
// changes both the readout (SNR) and the canvas. A reverse-mode embed lists
// `steps` first (data-controls="steps,stochastic"), which changes the readout
// (nearest-data distance) and the canvas.
const PARAMS = {
  t: { label: 't', min: 0, max: 1, step: 0.01, value: 0.35, format: (v) => v.toFixed(2) },
  steps: { label: 'steps', min: 2, max: 100, step: 1, value: 20, format: (v) => v.toFixed(0) },
  stochastic: { label: 'stochastic', min: 0, max: 1, step: 1, value: 0, format: (v) => (v === 1 ? 'DDPM' : 'DDIM') },
};

const SHAPE_OPTIONS = SHAPES.map((s) => ({ value: s, label: s }));
const N_DATA = 400;
const N_SAMPLES = 300;
const SEED = 11;
const EXTENT = 1.3; // plot half-width in data units
const ANIM_MS = 1400;

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A diffusion model on a dataset small enough to watch: about 400 points on
  a shape stand in for "all images". <em>Forward</em> mode adds noise on a
  schedule (<code>t</code> = 0 is the data, 1 is pure noise). <em>Reverse</em>
  mode starts from noise and repeatedly asks the denoiser "which way is the
  data from here?", <code>steps</code> times; the shape reassembles.</p>
  <h4>The concept</h4>
  <p>Generating means sampling a new point from the data's region of a huge
  space. The trick: destroy structure with a noise process you understand,
  then learn to undo it one small step at a time. The denoiser here is the
  exact best answer for this dataset (an average of the data points weighted by
  how close each could be); a real model's network <em>learns</em> that answer
  for images.</p>
  <h4>Try this</h4>
  <p>Forward: drag <code>t</code> from 0 to 1 and watch the signal-to-noise
  ratio fall. Reverse: set <code>steps</code> to 3, then 20, then 80, and read
  the "nearest data" distance. Flip <code>stochastic</code>: DDIM lands the same
  noise on the same points every time; DDPM wanders. In ⚙, turn on
  <code>arrows</code> to see the pull toward the data at every point.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

/**
 * make(container, opts)
 * opts.stage === 'full' builds all three sliders + a mode button row.
 * Otherwise opts.controls picks sliders; a control list containing `steps`
 * mounts reverse mode, otherwise forward mode.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'diffusion-2d');
  const model = {
    shape: 'spiral',
    mode: stage === 'full' ? 'forward' : (ids.includes('steps') ? 'reverse' : 'forward'),
    t: PARAMS.t.value,
    steps: PARAMS.steps.value,
    stochastic: PARAMS.stochastic.value,
  };
  const disp = { arrows: false, ghost: true };

  let data = makeShape(model.shape, N_DATA);
  let frames = []; // reverse mode: [{ k, t, pts }]
  let frameIdx = 0;
  let animHandle = null;
  let shown = data; // points currently drawn
  let shownT = model.t;
  let stepK = 0;

  const settingsFields = [
    { label: 'arrows', toggle: true, title: 'Show the pull toward the data at each grid point',
      getCurrent: () => disp.arrows, apply: (v) => { disp.arrows = v; draw(); } },
    { label: 'ghost', toggle: true, title: 'Show the clean dataset faintly behind the points',
      getCurrent: () => disp.ghost, apply: (v) => { disp.ghost = v; draw(); } },
  ];

  const shell = makeShell(container, {
    stage,
    help: { html: HELP_HTML },
    settings: settingsFields,
    legend: 'forward: drag t · reverse: drag steps',
    nav: null,
  });

  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 540;
  canvas.style.display = 'block';
  if (stage === 'full') {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
  }
  shell.sceneEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function recomputeForward() {
    shownT = model.t;
    shown = noisePoints(data, model.t, makeRng(SEED));
    stepK = 0;
  }

  function recomputeReverse() {
    frames = [];
    sample({
      data, steps: model.steps, stochastic: model.stochastic === 1, n: N_SAMPLES, seed: SEED,
      onStep: (k, t, pts) => frames.push({ k, t, pts }),
    });
    frameIdx = frames.length - 1;
    showFrame(frameIdx);
  }

  function showFrame(i) {
    const f = frames[i];
    shown = f.pts;
    shownT = f.t;
    stepK = f.k;
  }

  // Replay the reverse run from noise to the result over ANIM_MS, then rest
  // on the final frame. The final frame is drawn synchronously FIRST so a
  // programmatic slider change (the harness) always sees the settled result.
  function animateReverse() {
    if (animHandle) cancelAnimationFrame(animHandle);
    draw();
    const start = performance.now();
    const tick = (now) => {
      if (!frames.length) { animHandle = null; return; }
      // rAF's timestamp can precede the performance.now() taken above (it is
      // the frame's start time), so clamp u to [0, 1] and the index to range.
      const u = Math.min(1, Math.max(0, (now - start) / ANIM_MS));
      frameIdx = Math.min(frames.length - 1, Math.max(0, Math.round(u * (frames.length - 1))));
      showFrame(frameIdx);
      draw();
      if (u < 1) animHandle = requestAnimationFrame(tick);
      else animHandle = null;
    };
    animHandle = requestAnimationFrame(tick);
  }

  function recompute() {
    if (model.mode === 'forward') {
      if (animHandle) { cancelAnimationFrame(animHandle); animHandle = null; }
      recomputeForward();
      draw();
    } else {
      recomputeReverse();
      animateReverse();
    }
  }

  function draw() {
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#171b26';
    ctx.fillRect(0, 0, W, H);
    const side = Math.min(W, H) - 24;
    const ox = (W - side) / 2;
    const oy = (H - side) / 2;
    const toX = (x) => ox + ((x + EXTENT) / (2 * EXTENT)) * side;
    const toY = (y) => oy + (1 - (y + EXTENT) / (2 * EXTENT)) * side;
    const dot = Math.max(1.5, side / 240);

    // plot frame
    ctx.strokeStyle = 'rgba(140,150,175,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox, oy, side, side);

    if (disp.arrows) {
      const arrows = scoreField(14, shownT, data, EXTENT);
      ctx.strokeStyle = 'rgba(255,180,0,0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const a of arrows) {
        const x1 = toX(a.x), y1 = toY(a.y);
        const x2 = toX(a.x + 0.3 * a.dx), y2 = toY(a.y + 0.3 * a.dy);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();
    }

    if (disp.ghost) {
      ctx.fillStyle = 'rgba(120,150,200,0.22)';
      for (let i = 0; i < data.length / 2; i++) {
        ctx.beginPath();
        ctx.arc(toX(data[2 * i]), toY(data[2 * i + 1]), dot * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.fillStyle = model.mode === 'forward' ? '#00b46e' : '#ffb400';
    for (let i = 0; i < shown.length / 2; i++) {
      const x = toX(shown[2 * i]), y = toY(shown[2 * i + 1]);
      if (x < ox - 4 || x > ox + side + 4 || y < oy - 4 || y > oy + side + 4) continue;
      ctx.beginPath();
      ctx.arc(x, y, dot, 0, Math.PI * 2);
      ctx.fill();
    }

    updateReadout();
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (stage === 'full' && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      const w = shell.sceneEl.clientWidth;
      const h = shell.sceneEl.clientHeight;
      if (w < 2 || h < 2) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      draw();
    }).observe(shell.sceneEl);
  }
  if (stage !== 'full' && typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const rect = canvas.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        draw();
      }
    });
    io.observe(canvas);
  }

  // ---- rail ----
  const controlsCard = shell.addCard('controller — the noise process');
  if (stage === 'full') {
    const modeRow = new ButtonRow(controlsCard, {
      id: 'diffusion-2d-mode', label: 'mode',
      options: [{ value: 'forward', label: 'forward' }, { value: 'reverse', label: 'reverse' }],
      value: model.mode,
    });
    modeRow.onChange((v) => { model.mode = v; recompute(); });
  }
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `diffusion-2d-${id}`, ...PARAMS[id] });
    sliders[id].onInput((v) => { model[id] = v; recompute(); });
  }
  const shapeRow = new ButtonRow(controlsCard, {
    id: 'diffusion-2d-shape', label: 'data', options: SHAPE_OPTIONS, value: model.shape,
  });
  shapeRow.onChange((v) => { model.shape = v; data = makeShape(v, N_DATA); recompute(); });

  const readoutCard = shell.addCard('readout — the schedule');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'mode', label: 'mode', format: (v) => v },
      { id: 't', label: 't', format: (v) => v.toFixed(2) },
      { id: 'abar', label: 'ᾱ(t)', format: (v) => v.toFixed(3) },
      { id: 'snr', label: 'SNR', format: (v) => (Number.isFinite(v) ? `${v.toFixed(1)} dB` : '∞') },
      { id: 'step', label: 'step', format: (v) => v },
      { id: 'dist', label: 'nearest data', format: (v) => v.toFixed(3) },
    ],
  });
  const note = document.createElement('p');
  note.className = 'demo-hint';
  note.textContent = 'denoiser = exact posterior mean for this dataset (what a network learns to approximate)';
  readoutCard.appendChild(note);

  function updateReadout() {
    table.update('mode', model.mode);
    table.update('t', shownT);
    table.update('abar', alphaBar(shownT));
    table.update('snr', snrDb(shownT));
    table.update('step', model.mode === 'reverse' ? `${stepK} / ${model.steps}` : '–');
    table.update('dist', meanNearestDistance(shown, data));
  }

  recompute();
}
