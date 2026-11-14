// tex-lab: texture sampling as a lab (lib/core/lab.js). Six topics: the lookup (wrap modes, nearest and bilinear), the two regimes on a
// tilted floor rendered pixel by pixel by the program's own sampler, the mipmap (the pyramid, the level from the screen-space
// derivatives, trilinear), anisotropic filtering, the cube map lookup and the shadow map lookup. The computations are the WebGL
// program's, lib/programs/tex-lab/webgl/texlab.js; the views are in tex-lab-views.js and the 2D drawing in tex-lab-draw.js.
import { makeLab } from '../core/lab.js';
import { TOPICS, KEYS, makeViews } from './tex-lab-views.js';

const PROGRAM = {
  title: 'Texture lab: the whole program',
  base: new URL('../programs/tex-lab/', import.meta.url),
  tracks: [
    { id: 'webgl', label: 'WebGL · three.js', files: ['webgl/texlab.js', 'webgl/scene.js', 'webgl/index.html'], run: 'webgl/index.html',
      note: 'Serve the course folder (python3 -m http.server) and open lib/programs/tex-lab/webgl/. texlab.js holds every computation, and the demo calls these same functions; scene.js draws a tilted checker floor with the graphics processing unit\'s (GPU) own sampler and prints the level texlab.js picks for one pixel.' },
    { id: 'unity', label: 'Unity · C#', files: ['unity/TexLab.cs', 'unity/TexLabScene.cs'],
      note: 'Put both files in Assets, put TexLabScene on an empty GameObject, press Play. TexLab.cs is texlab.js, line for line where the languages allow. It has been compiled against a stand-in for the Unity API and run on test cases, not opened in the Unity editor. Unity\'s axes are left-handed: the numbers are the same, the pictures mirror images.' },
  ],
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>The sampler, the part of the pipeline that turns a texture coordinate (u, v) into a value. Every number and every pixel of the
  pictures comes from the program shown in the code card, which runs here.</p>
  <h4>Lookup</h4>
  <p><b>Drag the yellow dot</b> over the texture (or use the u and v sliders). The texel grid is drawn with its values; outside the
  unit square the copies follow the wrap mode. <b>Nearest</b> reads the texel whose square holds the point. <b>Bilinear</b> blends the
  four texels around it by the weights shown in them.</p>
  <h4>Regimes</h4>
  <p>A checker floor, one pixel at a time. <b>Click a pixel</b> to read its footprint. Tilt it and the near rows magnify while the far rows
  minify; pick <b>nearest</b> there and the far checks break into moiré. <b>mip level</b> colors each pixel by the level it read.</p>
  <h4>Mipmap</h4>
  <p><b>The pyramid</b>: click a texel of any level to see the four it averages. <b>Level from derivatives</b>: the footprint of the clicked
  pixel is the parallelogram spanned by the two derivative vectors, and λ = log₂ ρ picks the level; the lecture's example (256
  texels, λ = 1.696) is a preset.</p>
  <h4>Aniso</h4>
  <p>The left half of the floor is trilinear and the right half anisotropic with up to the chosen number of taps. The chart shows the error of a
  pixel against the 16-sample average as the limit grows.</p>
  <h4>Cube map and shadow</h4>
  <p>Drag the ball <b>d</b> and the face and texel follow. Drag the ball <b>P</b> over the floor to test it against the light's depth map; the
  top-down panel tests every floor point the same way.</p>
  <h4>The code</h4>
  <p>The code card is the program itself, in the track you choose, with each variable's current value beside its line. A test runs the C#
  on the same inputs and compares every number. <code>&lt;/&gt;</code> opens the whole program for both tracks. The sampler here is the
  program's, not the GPU's (graphics processing unit); scene.js shows the GPU's.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const CSS = `
.tl-seg { align-items: center; }
.tl-seglabel { font: 500 11px/1 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; margin-right: 3px; min-width: 52px; }
.tl-panel-canvas { margin: 4px 0; }
/* lib.css sizes every canvas of a slide demo to the scene's height; these two are not the scene */
.reveal section.demo-full [data-demo] canvas.tl-overlay { height: 100% !important; width: 100% !important; }
.reveal section.demo-full [data-demo] canvas.tl-panel-canvas { height: auto !important; width: 100% !important; }
`;
function injectCss() {
  if (document.getElementById('tl-css')) return;
  const st = document.createElement('style');
  st.id = 'tl-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  const lab = makeLab(container, {
    stage, controls, name: 'tex-lab', topics: TOPICS, views: makeViews(), keys: KEYS, program: PROGRAM,
    files: { webgl: 'webgl/texlab.js', unity: 'unity/TexLab.cs' },
    help: HELP_HTML,
    legend: 'drag the dot or click a pixel · drag a ball in the cube and shadow views · scroll zoom there',
  });
  return lab;
}
