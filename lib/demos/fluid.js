// fluid: a 2D SPH fluid, live (lib/core/sim-fluid.js, after Mueller, Charypar and Gross 2003). A dam
// of water collapses across a box, or a drop falls into a pool. Every particle carries a mass; each
// step computes densities from the neighbors within H = 16 px, pressure from how far each density is
// above rest, then pressure, viscosity and gravity forces, and moves the particles one fixed step.
// Particles are colored by speed. The readout shows the step the CFL condition allows and how far the
// fluid compresses: SPH of this kind is only weakly incompressible.
import { SliderRow, ButtonRow, ValueTable, makeButton, makeRow } from '../core/cockpit.js';
import { makeShell } from '../core/demo-shell.js';
import { makeFluid, REST_DENS, H } from '../core/sim-fluid.js';
import { resolveControlIds } from './registry.js';

// Order matters for tools/test-demos.mjs: viscosity is first, and the fluid moves every frame, so both
// the readout and the canvas change once it is dragged.
const PARAMS = {
  viscosity: { label: 'viscosity', min: 0.2, max: 12, step: 0.1, value: 2.5, format: (v) => v.toFixed(1) },
  sound: { label: 'stiffness (c)', min: 600, max: 3000, step: 50, value: 1800, format: (v) => `${v.toFixed(0)} px/s` },
  particles: { label: 'particles', min: 300, max: 2000, step: 100, value: 900, format: (v) => v.toFixed(0) },
  steps: { label: 'steps/frame', min: 1, max: 12, step: 1, value: 5, format: (v) => v.toFixed(0) },
};
const W = 800, HT = 600;

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Water as particles: a dam breaking across a box, or a drop falling into a pool. Color is speed.</p>
  <h4>The concept</h4>
  <p>Smoothed particle hydrodynamics: each particle's density is a weighted count of its neighbors
  within 16 px; where density is above rest, pressure pushes neighbors apart; viscosity evens out
  their velocities; gravity pulls down. One fixed time step, as long as the speed of sound allows
  (dt = 0.4 H / c), repeated <code>steps/frame</code> times per displayed frame.</p>
  <h4>Try this</h4>
  <p>Drop <code>viscosity</code> to 0.2 and watch the spray, then raise it to 10 for honey.
  Lower <code>stiffness</code> and read the peak compression: a softer fluid squeezes more but takes
  longer steps. Switch to <code>drop</code> for a splash.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

export function make(container, { stage = 'embed', controls } = {}) {
  const model = { viscosity: PARAMS.viscosity.value, sound: PARAMS.sound.value, particles: PARAMS.particles.value, steps: PARAMS.steps.value, layout: 'dam' };
  const shell = makeShell(container, { stage, help: { html: HELP_HTML }, legend: 'a 2D fluid of particles' });

  const canvas = document.createElement('canvas');
  canvas.width = 800; canvas.height = 600;
  canvas.style.display = 'block';
  if (stage === 'full') { canvas.style.width = '100%'; canvas.style.height = '100%'; }
  shell.sceneEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let F, stepMs = 0;
  function build() {
    F = makeFluid({ width: W, height: HT, count: model.particles, layout: model.layout, sound: model.sound, visc: model.viscosity });
  }

  function draw() {
    const cw = canvas.width, ch = canvas.height;
    ctx.fillStyle = '#171b26';
    ctx.fillRect(0, 0, cw, ch);
    const s = Math.min((cw - 20) / W, (ch - 20) / HT);
    const ox = (cw - W * s) / 2, oy = (ch - HT * s) / 2;
    ctx.strokeStyle = 'rgba(140,150,175,0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox, oy, W * s, HT * s);
    const r = Math.max(1.5, 4.2 * s);
    for (let i = 0; i < F.n; i++) {
      const sp = Math.hypot(F.v[2 * i], F.v[2 * i + 1]);
      const t = Math.min(1, sp / 600);
      ctx.fillStyle = `rgb(${Math.round(60 + 190 * t)},${Math.round(130 + 110 * t)},${Math.round(230 + 25 * t)})`;
      ctx.beginPath();
      ctx.arc(ox + F.x[2 * i] * s, oy + (HT - F.x[2 * i + 1]) * s, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function stepOnce() {
    if (F.exploded) return;
    F.params.visc = model.viscosity;
    F.params.sound = model.sound;
    const t0 = performance.now();
    F.step(model.steps);
    stepMs = stepMs * 0.8 + 0.2 * (performance.now() - t0);
  }

  // ---- rail ----
  const controlsCard = shell.addCard('controller: the fluid');
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'fluid');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `fluid-${id}`, ...PARAMS[id] });
    sliders[id].onInput((v) => {
      model[id] = v;
      if (id === 'particles') build();
      if (!running) { stepOnce(); draw(); }
      updateReadout();
    });
  }
  const layoutRow = new ButtonRow(controlsCard, {
    id: 'fluid-layout', label: 'scene',
    options: [{ value: 'dam', label: 'dam break' }, { value: 'drop', label: 'drop' }],
    value: model.layout,
  });
  layoutRow.onChange((v) => { model.layout = v; build(); draw(); updateReadout(); });
  const row = makeRow(controlsCard);
  makeButton(row, 'reset', () => { build(); draw(); updateReadout(); });

  const readoutCard = shell.addCard('readout: this frame');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'n', label: 'particles', format: (v) => v.toFixed(0) },
      { id: 'dt', label: 'step dt', format: (v) => `${(1000 * v).toFixed(2)} ms` },
      { id: 'time', label: 'sim time', format: (v) => `${v.toFixed(2)} s` },
      { id: 'comp', label: 'peak compression', format: (v) => `${(100 * v).toFixed(1)} %` },
      { id: 'vmax', label: 'max speed', format: (v) => `${v.toFixed(0)} px/s` },
      { id: 'cost', label: 'compute/frame', format: (v) => `${v.toFixed(1)} ms` },
    ],
  });
  const note = document.createElement('p');
  note.className = 'demo-hint';
  note.textContent = `kernel radius H = ${H} px; rest density from the starting lattice; dt = 0.4 H / c`;
  readoutCard.appendChild(note);

  function updateReadout() {
    const st = F.stats();
    table.update('n', F.n);
    table.update('dt', st.dt);
    table.update('time', st.time);
    table.update('comp', Math.max(0, st.maxRho / REST_DENS - 1));
    table.update('vmax', st.maxV);
    table.update('cost', stepMs);
  }

  // ---- canvas sizing and the loop (runs only while visible) ----
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const fit = () => {
    const rect = (stage === 'full' ? shell.sceneEl : canvas).getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return;
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    draw();
  };
  if (stage === 'full' && typeof ResizeObserver !== 'undefined') new ResizeObserver(fit).observe(shell.sceneEl);

  let running = false, raf = 0, visible = stage === 'full';
  function tick() {
    if (!running) return;
    stepOnce(); draw(); updateReadout();
    raf = requestAnimationFrame(tick);
  }
  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) raf = requestAnimationFrame(tick); else cancelAnimationFrame(raf);
  }
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => {
      for (const e of entries) {
        visible = e.isIntersecting;
        if (visible && stage !== 'full') fit();
        setRunning(visible && document.visibilityState !== 'hidden');
      }
    }).observe(canvas);
  }
  document.addEventListener('visibilitychange', () => setRunning(visible && document.visibilityState !== 'hidden'));

  build();
  stepOnce();
  draw();
  updateReadout();
  setRunning(visible);
  return { model, sliders };
}
