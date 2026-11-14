// volume-lab: volume rendering the way a neural radiance field makes a pixel, one lab (lib/core/lab.js). Five topics: one ray (the
// density and color along it, the samples, the opacity, transmittance and weight of each, the pixel as a sum, the opacity of a step),
// samples (the count against a finely sampled reference, a thin surface between samples, coarse to fine), surface (a density that
// sharpens, a signed distance), encoding (a fit with and without sines and cosines, the footprint that switches the fine ones off) and a
// small 3D volume rendered one ray per pixel. The computations are the WebGL program's, lib/programs/volume-lab/webgl/volumelab.js; the
// views are in volume-lab-views*.js and the pictures in volume-lab-plots.js.
import { makeLab } from '../core/lab.js';
import { makeViews, TOPICS, KEYS } from './volume-lab-views.js';

export const TITLE = 'Volume lab';
export const HUB_LINE = 'Volume rendering along one ray: density, opacity, transmittance and weight per sample, the pixel as a sum, convergence against a reference, a thin surface, coarse-to-fine sampling, a density that sharpens into a surface, positional encoding, and a small volume rendered per pixel.';

const PROGRAM = {
  title: 'Volume lab: the whole program',
  base: new URL('../programs/volume-lab/', import.meta.url),
  tracks: [
    { id: 'webgl', label: 'WebGL · three.js', files: ['webgl/volumelab.js', 'webgl/scene.js', 'webgl/index.html'], run: 'webgl/index.html',
      note: 'Serve the course folder (python3 -m http.server) and open lib/programs/volume-lab/webgl/. volumelab.js holds every computation, and the demo calls these same functions; scene.js renders three Gaussian blobs one ray per pixel into a 2D canvas (N, S, B, A and D change the samples, the sampler, the background and the camera; click a pixel for its weights).' },
    { id: 'unity', label: 'Unity · C#', files: ['unity/VolumeLab.cs', 'unity/VolumeLabScene.cs'],
      note: 'Put both files in Assets, put VolumeLabScene on an empty GameObject, press Play. VolumeLab.cs is volumelab.js, line for line where the languages allow; VolumeLabScene draws the same image with a Texture2D in OnGUI. Compiled against a stand-in for the Unity API and not run in the Unity editor.' },
  ],
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>How a pixel is made from a field of density and color, as in a neural radiance field (NeRF; Mildenhall and others, 2020). A camera ray is
  sampled; each sample is a slab with opacity α = 1 − e<sup>−σδ</sup>, the part of the ray still unblocked when it gets there is the transmittance T, the slab's
  weight is w = Tα, and the pixel is Σ w·c, with what is left, T<sub>end</sub>, showing the background.</p>
  <h4>Topics</h4>
  <p><b>One ray</b>: drag the bumps of a density by their circles (center, height) and squares (width), click a bar or a row to follow one sample
  through the formulas; the lecture's ray is the first preset. <b>Opacity and step</b> shows that two half slabs block what one slab does.
  <b>Samples</b>: the error against a finely sampled reference as N grows, for a regular and a stratified sampler; a thin leaf that falls
  between the samples; the coarse pass's weights turned into a distribution and inverted to place fine samples.
  <b>Surface</b>: a bump of fixed optical depth that sharpens until the weights are a spike, and a signed distance turned into a density as in NeuS
  (Wang and others, 2021). <b>Encoding</b>: a network's fit of a one-dimensional density with and without sines and cosines of doubling frequency, and the
  footprint that damps them (Mip-NeRF, Barron and others, 2021). <b>Volume</b>: three Gaussian blobs rendered one ray per pixel; click the image to
  pick a ray, and the plots in the rail are that ray.</p>
  <h4>Try this</h4>
  <p>One ray, <b>sample 4 at σ = 80</b>: the fourth weight becomes T<sub>4</sub> and the blue sample behind it gets nothing. Samples, <b>shifted by 0.02</b>: the leaf is
  opaque instead of invisible. Surface, <b>w = 0.005</b> with <b>N = 32</b>: the bump falls between samples. Encoding, <b>L = 10, 48 noisy points</b>:
  the fit passes through the points and is rough between them.</p>
  <h4>The code</h4>
  <p>The code card is the program itself, in the track you choose, with each variable's current value beside its line. A test runs the C#
  on the same inputs and compares every number, and checks the claims (the weights sum to 1 − T<sub>end</sub>, the quadrature's rate, the inverse transform's
  distribution) with a fixed seed. <code>&lt;/&gt;</code> opens the whole program for both tracks.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const CSS = `
.vl-seg { align-items: center; }
.vl-seglabel { font: 500 11px/1 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; margin-right: 3px; min-width: 62px; }
.vl-tablebox { max-height: 230px; overflow: auto; margin-top: 4px; }
.vl-table td { font-size: 11px; padding: 1px 4px; }
.vl-table tr[data-i] { cursor: pointer; }
.vl-table tr.on td { background: #2a2310; color: #ffd166; }
.vl-table tr.vl-sum td { border-top: 1px solid #2c3140; font-weight: 600; }
.vl-sw { display: inline-block; width: 22px; height: 10px; border: 1px solid #3a4152; vertical-align: middle; }
.vl-mini { display: block; width: 100%; height: auto; margin: 4px 0; background: #0b0c10; border: 1px solid #262a35; }
.demo-shell-root--embed .vl-tablebox { max-height: 110px; }
.demo-shell-root--embed .vl-mini { display: none; }
`;
function injectCss() {
  if (document.getElementById('vl-css')) return;
  const st = document.createElement('style');
  st.id = 'vl-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  const views = makeViews();
  return makeLab(container, {
    stage, controls, name: 'volume-lab', topics: TOPICS, views, keys: KEYS, program: PROGRAM,
    files: { webgl: 'webgl/volumelab.js', unity: 'unity/VolumeLab.cs' },
    help: HELP_HTML,
    legend: 'drag a bump\'s circle or square · click a bar or a row to follow a sample · click the volume image to pick a ray',
  });
}
