// path-lab: Monte Carlo integration and path tracing, one lab (lib/core/lab.js). Four topics: the Monte Carlo estimator on an integral with a
// known answer (the cosine over the hemisphere, pi), the solid angle and the terms of the rendering equation at a point, a Cornell box that
// path-traces progressively (samples per pixel, noise, depth, Russian roulette, next-event estimation, fireflies), and one traced path with
// its throughput at every bounce. The computations are the WebGL program's, lib/programs/path-lab/webgl/pathlab.js; the views are in
// path-lab-views.js and the progressive renderer in path-lab-render.js.
import { makeLab } from '../core/lab.js';
import { makeViews, TOPICS, KEYS } from './path-lab-views.js';

export const TITLE = 'Path lab';
export const HUB_LINE = 'Monte Carlo and path tracing: the 1/√N error, stratified and importance sampling, solid angle and the cosine, a progressive Cornell box with roulette and next-event estimation, and one traced path.';

const PROGRAM = {
  title: 'Path lab: the whole program',
  base: new URL('../programs/path-lab/', import.meta.url),
  tracks: [
    { id: 'webgl', label: 'WebGL · three.js', files: ['webgl/pathlab.js', 'webgl/scene.js', 'webgl/index.html'], run: 'webgl/index.html',
      note: 'Serve the course folder (python3 -m http.server) and open lib/programs/path-lab/webgl/. pathlab.js holds every computation, and the demo calls these same functions; scene.js path-traces a Cornell box progressively into a 2D canvas (D, R, N, L change the depth, roulette, next-event estimation and light; Space starts again).' },
    { id: 'unity', label: 'Unity · C#', files: ['unity/PathLab.cs', 'unity/PathLabScene.cs'],
      note: 'Put both files in Assets, put PathLabScene on an empty GameObject, press Play. PathLab.cs is pathlab.js, line for line where the languages allow; PathLabScene draws the same progressive render with a Texture2D in OnGUI. Compiled against a stand-in for the Unity API and not run in the Unity editor.' },
  ],
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Four topics. <b>Estimator</b>: the Monte Carlo estimate of an integral whose answer is known, ∫ cos θ dω = π over the hemisphere, drawn
  three ways. <b>Solid angle</b>: a patch seen from a point, the cosine integrated, and the rendering equation's terms for one point.
  <b>Cornell box</b>: a path tracer that refines as samples accumulate. <b>One path</b>: a single traced path, vertex by vertex.</p>
  <h4>Estimator</h4>
  <p>Î = (1/N) Σ f(ωᵢ)/p(ωᵢ). <b>N samples</b> shows one run, the lecture's four draws included. <b>Error against N</b> measures the root-mean-square
  error over many runs against the prediction 0.577/√N (uniform) and 0.577/N<sup>1.5</sup> (one sample per stratum); click the plot to pick N.
  <b>Spread</b> overlays the histograms of the estimate: all three are centered on π, with very different widths.</p>
  <h4>Cornell box</h4>
  <p>Every pixel gets one more sample per pass, and the image is the mean. The noise shown is the standard error of the pixels relative
  to the image's mean; it falls as 1/√N. <b>Max depth</b> is the number of bounces (0 is direct light only). Russian roulette, next-event
  estimation and a clamp can be switched; <b>two renders</b> puts one change side by side with the same seed. Rendering pauses when you
  leave the view.</p>
  <h4>One path</h4>
  <p>Click a pixel of the preview, or a point on the box, and the path through it is drawn: its vertices, the throughput T at each, and the
  shadow rays (green clear, red blocked). The sample's value is the sum of T times the direct light at each vertex.</p>
  <h4>The code</h4>
  <p>The code card is the program itself, in the track you choose, with each variable's current value beside its line. A test runs the C#
  on the same inputs and compares every number, and checks the statistical claims (the error law, unbiasedness, the variance of each
  sampling method) with a fixed seed. <code>&lt;/&gt;</code> opens the whole program for both tracks.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const CSS = `
.pl-seg { align-items: center; }
.pl-seglabel { font: 500 11px/1 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; margin-right: 3px; min-width: 62px; }
.pl-canvas { display: block; width: 100%; max-width: 300px; aspect-ratio: 1; image-rendering: pixelated; background: #0b0c10; border: 1px solid #262a35; margin: 4px 0; }
.pl-stage { position: absolute; inset: 46px 8px 56px 8px; display: flex; gap: 10px; z-index: 2; background: #0b0c10; }
.pl-scell { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; }
.pl-scap { font: 600 14px/1.3 -apple-system, Segoe UI, Roboto, sans-serif; color: #c7cdda; padding: 2px 4px 6px; }
.pl-swrap { flex: 1 1 0; min-height: 0; }
.pl-scanvas { display: block; width: 100%; height: 100%; object-fit: contain; object-position: center top; image-rendering: pixelated; }
.demo-shell-root--embed .pl-stage { top: 8px; bottom: 76px; }
.demo-shell-root--embed .pl-scap { font-size: 12px; padding-bottom: 2px; }
.pl-cell { flex: 1 1 0; min-width: 0; }
.pl-cell .pl-canvas { max-width: none; }
.pl-cap { font: 600 11px/1.3 -apple-system, Segoe UI, Roboto, sans-serif; color: #aab2c5; min-height: 2.6em; }
.pl-plot { display: block; width: 100%; height: auto; }
.pl-plotbox { cursor: default; }
.pl-pick { position: relative; display: inline-block; width: 100%; max-width: 300px; }
.pl-pick .pl-canvas { cursor: crosshair; max-width: none; }
.pl-cross { position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px; border: 1.5px solid #ffd166; border-radius: 50%; pointer-events: none; box-shadow: 0 0 0 1px rgba(11, 12, 16, 0.8); }
.pl-table { margin-top: 4px; }
.pl-table td { font-size: 11px; }
.demo-shell-root--embed .pl-table { display: none; }
.demo-shell-root--embed .pl-canvas { max-width: 200px; }
`;
function injectCss() {
  if (document.getElementById('pl-css')) return;
  const st = document.createElement('style');
  st.id = 'pl-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  const views = makeViews();
  const lab = makeLab(container, {
    stage, controls, name: 'path-lab', topics: TOPICS, views, keys: KEYS, program: PROGRAM,
    files: { webgl: 'webgl/pathlab.js', unity: 'unity/PathLab.cs' },
    help: HELP_HTML,
    legend: 'drag: turn · scroll zoom · WASD move · click the box: trace a path through that point · H home',
  });
  return Object.assign(lab, { engines: views.engines, loops: views.loops });
}
