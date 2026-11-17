// particle-lab: one particle and one spring, the way you step it, the fixed step and contacts, one lab (lib/core/lab.js). Four topics:
// one spring (a mass stepped by explicit, semi-implicit, Verlet and implicit Euler beside the exact motion), energy (the phase plane,
// the energy against the step and the step limit), the frame loop (the accumulator, and one spring stepped by the frame against the
// fixed step) and contacts (one bounce, a thin wall and tunneling). The computations are the WebGL program's,
// lib/programs/particle-lab/webgl/particle.js; the views are in particle-lab-views.js, -frames.js and -contacts.js.
import { makeLab } from '../core/lab.js';
import { TOPICS, KEYS, springViews } from './particle-lab-views.js';
import { frameViews } from './particle-lab-frames.js';
import { contactViews } from './particle-lab-contacts.js';
import { injectCss } from './particle-lab-draw.js';

export const TITLE = 'Particle Lab';
export const HUB_LINE = 'One particle on one spring: why explicit Euler gains energy, the stability limit, Verlet, the fixed step and the accumulator, and contacts that push a particle out or miss a thin wall.';

const PROGRAM = {
  title: 'Particle lab: the whole program',
  base: new URL('../programs/particle-lab/', import.meta.url),
  tracks: [
    { id: 'webgl', label: 'WebGL · three.js', files: ['webgl/particle.js', 'webgl/scene.js', 'webgl/index.html'], run: 'webgl/index.html',
      note: 'Serve the course folder (python3 -m http.server) and open lib/programs/particle-lab/webgl/. particle.js holds every computation, and the demo calls these same functions; scene.js draws five masses on five springs and steps them with the keyboard.' },
    { id: 'unity', label: 'Unity · C#', files: ['unity/ParticleLab.cs', 'unity/ParticleLabScene.cs'],
      note: 'Put both files in Assets, put ParticleLabScene on an empty GameObject, press Play. ParticleLab.cs is particle.js, line for line where the languages allow. It has not been run in the Unity editor; the C# is compiled and its numbers compared with the JavaScript by the course tests.' },
  ],
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A particle is a position, a velocity and a mass; a force gives an acceleration a = F / m, and a step of length h updates the velocity from the
  acceleration and the position from the velocity. Here the force is one spring, F = −k x (and a damper, −c v, if you add one), so the exact motion is known
  and every integrator can be held against it. <b>One spring</b>: explicit, semi-implicit, Verlet and implicit Euler, one step at a time, with the
  numbers of each update. <b>Energy</b>: the phase plane (x against v / ω, where the exact motion is a circle), the energy against the step, and the
  growth per step against h ω. <b>Frame loop</b>: the accumulator, and one spring stepped by the frame against the fixed step. <b>Contacts</b>: one
  bounce, and a thin wall that a long step jumps.</p>
  <h4>Try this</h4>
  <p>One spring, preset <b>by hand: explicit</b> then <b>by hand: semi-implicit</b>: one line in a different order, and the mass is at 1 or at 0 after one
  step. <b>five steps: explicit</b>: the energy doubles every step (50, 100, 200, 400, 800 J). Energy, <b>semi, h = 0.19</b> then <b>h = 0.21</b>: bounded
  while h ω &lt; 2, then 9 × 10<sup>111</sup> J. Frame loop, <b>worked: 16 20 33 8 17</b>, then <b>250 ms stall</b>: the step per frame is thrown off
  course and the fixed step is not. Contacts, <b>tunneling: 1 substep</b> then <b>16 substeps: stopped</b>.</p>
  <h4>The code</h4>
  <p>The code card is the program itself, in the track you choose, with each variable's current value beside its line. A test runs the C# on the same
  inputs and compares every number. <code>&lt;/&gt;</code> opens the whole program for both tracks.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const CSS = `
.pl-table { width: 100%; border-collapse: collapse; margin-top: 6px; font: 11.5px/1.4 'SF Mono', Menlo, Consolas, monospace; color: #c7cdda; }
.pl-table th { text-align: right; color: #79829a; font-weight: 500; padding: 1px 3px; }
.pl-table td { text-align: right; padding: 1px 3px; }
.pl-table tr.on td { background: #2a2310; color: #ffd166; }
`;
function injectLocalCss() {
  if (document.getElementById('pl-css')) return;
  const st = document.createElement('style');
  st.id = 'pl-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

export function allViews() {
  return [...springViews(), ...frameViews(), ...contactViews()];
}

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  injectLocalCss();
  return makeLab(container, {
    stage, controls, name: 'particle-lab', topics: TOPICS, views: allViews(), keys: KEYS, program: PROGRAM,
    files: { webgl: 'webgl/particle.js', unity: 'unity/ParticleLab.cs' }, help: HELP_HTML,
    legend: 'one spring · play the steps · drag the mass to change the start · hover a term to find it in the picture',
  });
}
