// trace-lab: one Cornell box traced two ways, one lab (lib/core/lab.js). The path lab's box with a mirror sphere, a glass sphere and a tall
// white box by the red wall, under a square light that moves on the ceiling and shrinks to a point. Whitted's tracer and a path tracer
// render it progressively; the tracing camera, its image plane carrying the current image, and the scene are seen from another camera.
// Pick a pixel (on the image plane, in the inset, or on any surface) and explore its primary ray, its tree of Whitted rays, or the paths
// through it; then what Whitted cannot see: soft shadows, color bleeding, caustics. The computations are the WebGL program's,
// lib/programs/trace-lab/webgl/tracelab.js; the views are trace-lab-views.js and trace-lab-views-miss.js, the images trace-lab-render.js,
// the drawing trace-lab-kit.js.
import { makeLab } from '../core/lab.js';
import { injectCss as injectRayLabCss } from './ray-lab-ui.js';
import { Engine } from './trace-lab-render.js';
import { KEYS, resolutionRow } from './trace-lab-kit.js';
import { TOPICS, makeCommon, makeFirstViews } from './trace-lab-views.js';
import { makeMissViews } from './trace-lab-views-miss.js';

export const TITLE = 'Trace lab: a pixel\'s rays and paths';
export const HUB_LINE = 'One Cornell box traced two ways: click a pixel of the image plane and follow its primary ray, its tree of Whitted rays, or the paths a path tracer sends through it; soft shadows, color bleeding and caustics, which only the paths find.';

const PROGRAM = {
  title: 'Trace lab: the whole program',
  base: new URL('../programs/trace-lab/', import.meta.url),
  tracks: [
    { id: 'webgl', label: 'WebGL · three.js', files: ['webgl/tracelab.js', 'webgl/scene.js', 'webgl/index.html'], run: 'webgl/index.html',
      note: 'Serve the course folder (python3 -m http.server) and open lib/programs/trace-lab/webgl/. tracelab.js holds every computation, and the demo calls these same functions; scene.js renders the two images side by side, Whitted a few rows per frame and the path tracer one pass at a time, and prints the paths of a clicked pixel.' },
    { id: 'unity', label: 'Unity · C#', files: ['unity/TraceLab.cs', 'unity/TraceLabScene.cs'],
      note: 'Put both files in Assets, put TraceLabScene on an empty GameObject, press Play. TraceLab.cs is tracelab.js, line for line where the languages allow; TraceLabScene draws the two images with Texture2D in OnGUI. It has not been run in the Unity editor: it compiles against a stand-in for the Unity API, and a test runs it on the same inputs as the JavaScript and compares every number.' },
  ],
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A Cornell box with a mirror sphere, a glass sphere and a tall white box, traced two ways. The tracing camera (the <b>eye</b>) has an image plane
  one unit in front of it, drawn in the scene with the current image on it; the scene is seen by a second camera that you turn and zoom. Click a
  pixel on the image plane, in the image at the top right, or on any surface of the box (the pixel that sees that point).</p>
  <h4>Camera</h4>
  <p>The pixel's primary ray: pixel to screen coordinates (sx, sy) to a direction d to the first hit. Drag the <b>eye</b>, the <b>look at</b> point
  and the <b>light</b>; the field of view and the resolution change the image plane and every pixel's ray.</p>
  <h4>Whitted</h4>
  <p>The pixel's tree of rays: primary, reflection and refraction rays, and the shadow rays of each diffuse hit, one to the light's center or
  several spread over the light (Cook's distributed rays). The tree diagram shows each ray's weight and share; hover a node to find its ray.</p>
  <h4>Paths</h4>
  <p>N paths through the pixel, each from its own random point of the pixel. The list names each path's vertices and its type in Heckbert's
  notation, read from the eye (E eye, D diffuse, S mirror or glass, L light); select one for its throughput at each vertex. The chart is the
  running mean against N, with the value of thousands of paths and its 1/√N band. Next-event estimation (NEE), Russian roulette and the
  max depth are as in the path lab.</p>
  <h4>What Whitted misses</h4>
  <p>The two images side by side, then soft shadows (the penumbra, the light's size), color bleeding (the box face by the red wall) and
  caustics (the bright spot the glass focuses onto the floor, which a point light removes).</p>
  <h4>Resolution</h4>
  <p>The resolution row sets both images' size, 4:3. Both images are traced again; the picked pixel stays on the same spot of the image.
  Each image is kept per setting, so going back to an earlier one shows it at once.</p>
  <h4>The code</h4>
  <p>The code card is the program itself, in the track you choose, with each variable's current value beside its line. A test runs the C# on
  the same inputs and compares every number. <code>&lt;/&gt;</code> opens the whole program for both tracks.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const CSS = `
.rl-inset.tl-inset { width: 290px; }
.tl-inset .rl-seg { margin-bottom: 4px; }
.tl-inset .tl-img { display: block; image-rendering: pixelated; border: 1px solid #2c3140; border-radius: 3px; background: #0b0c10; cursor: crosshair; }
.tl-stage { position: absolute; inset: 46px 8px 56px 8px; display: flex; gap: 10px; z-index: 3; background: #0b0c10; }
.tl-scell { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; }
.tl-scap { font: 600 13px/1.3 -apple-system, Segoe UI, Roboto, sans-serif; color: #c7cdda; padding: 2px 4px 6px; min-height: 2.6em; }
.tl-scell .tl-img { display: block; image-rendering: pixelated; cursor: crosshair; border: 1px solid #262a35; }
.demo-shell-root--embed .tl-stage { top: 8px; bottom: 76px; }
.tl-pathrow { display: flex; gap: 8px; align-items: flex-start; margin-top: 4px; }
.tl-pix { flex: 0 0 132px; }
.tl-pixsvg { display: block; width: 132px; height: 132px; }
.tl-pixsvg .tl-start { cursor: pointer; }
.tl-list { flex: 1 1 auto; min-width: 0; max-height: 210px; overflow-y: auto; border: 1px solid #1f2330; border-radius: 4px; font: 11px/1.45 -apple-system, Segoe UI, Roboto, sans-serif; color: #c7cdda; font-variant-numeric: tabular-nums; }
.tl-item { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto 40px 14px; gap: 4px; align-items: center; padding: 1px 5px; cursor: pointer; }
.tl-item:hover { background: #171b26; }
.tl-item.on { background: #2a2310; color: #fff; }
.tl-item b { color: #8b93a7; font-weight: 600; text-align: right; }
.tl-walk { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tl-word { color: #8ec2ff; font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 10.5px; white-space: nowrap; }
.tl-val { text-align: right; }
.tl-chips { display: flex; flex-wrap: wrap; gap: 3px; margin-top: 4px; max-height: 88px; overflow-y: auto; }
.tl-chips .lab-btn { padding: 1px 5px; font-size: 10.5px; }
.tl-tree-svg { max-height: max(300px, calc(100vh - 470px)); }
.demo-shell-root--embed .tl-pathrow { display: none; }
`;
function injectCss() {
  if (document.getElementById('tl-css')) return;
  const st = document.createElement('style');
  st.id = 'tl-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectRayLabCss();
  injectCss();
  const engine = new Engine();
  const common = makeCommon(engine);
  const views = [...makeFirstViews(engine, common), ...makeMissViews(engine, common)];
  let showRes = null;
  const lab = makeLab(container, {
    stage, controls, name: 'trace-lab', topics: TOPICS, views, keys: KEYS, program: PROGRAM,
    files: { webgl: 'webgl/tracelab.js', unity: 'unity/TraceLab.cs' },
    help: HELP_HTML,
    legend: 'drag: turn · drag the eye, look at, light · click the image plane, the inset or the box: pick a pixel · scroll zoom · WASD move · H home',
    header: (card, ctx) => { showRes = resolutionRow(card, ctx); },
  });
  // the resolution row lives outside the views' panels: show its value after every change
  const listen = () => showRes?.();
  container.addEventListener('click', listen);
  listen();
  Object.assign(lab, { engine });
  container.traceLab = lab;     // for tools that drive the page (tools and screenshots reach the engine through it)
  return lab;
}
