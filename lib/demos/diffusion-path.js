// diffusion-path: how a diffusion sampler finds its way from noise to an image, as one lab (lib/core/lab.js) with four views and no code card:
// the cloud (a 2D spiral: the noised data, the denoiser's arrows, one sample and its path, the one big step), coarse to fine (the guess at every
// step), commitment (the weights on the training digits and two samples from nearby noise) and high dimensions (distances and lengths in 400
// numbers). The numbers are in diffusion-path-core.js; the views are in diffusion-path-{cloud,coarse,commit,highdim}.js.
import { makeLab } from '../core/lab.js';
import { cloudView } from './diffusion-path-cloud.js';
import { coarseView } from './diffusion-path-coarse.js';
import { commitView } from './diffusion-path-commit.js';
import { highView } from './diffusion-path-highdim.js';
import { KEYS } from './diffusion-path-draw.js';

export const TITLE = 'Diffusion path';
export const HUB = 'How a diffusion sampler finds its way from noise to an image: the cloud it walks in, the guess it refines, the step at which it commits, and what 400 dimensions do to distances.';
export const TOPICS = [
  { id: 'cloud', label: 'Cloud' }, { id: 'coarse', label: 'Coarse to fine' }, { id: 'commit', label: 'Commitment' }, { id: 'highdim', label: 'High dimensions' },
];
export { KEYS };
export const makeViews = () => [cloudView(), coarseView(), commitView(), highView()];

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A diffusion sampler starts from random noise and takes 30 small steps (denoising diffusion implicit models, DDIM, with no randomness added along the way). At each step a denoiser guesses the clean picture hiding in the current sample, and the sample moves part of the way toward that guess. Time <b>t</b> runs from 1 (pure noise) to 0 (clean); <b>ᾱ (alpha bar)</b> is the fraction of the data's size that is left at time t, and √(1 − ᾱ) is the noise level.</p>
  <p>The denoiser here is the <b>exact</b> one: its guess is a weighted average of the training points, and a point's weight falls quickly with its distance from the sample (a softmax of minus the squared distance). Nearer points count most. For digits you can also choose the <b>trained network</b> (a multilayer perceptron, MLP), which learned to approximate that average.</p>
  <h4>Cloud</h4>
  <p>Two numbers per point, so everything is visible. The heat map is the data after noising at this step; the yellow arrows are the denoiser's arrows (from each spot toward its guess); the gold dot is the sample, the blue line its path, the green dot its guess. Drag the step. <b>One big step</b> jumps from the first noise level straight to the guess: it lands on the average of all the data, off the spiral.</p>
  <h4>Coarse to fine</h4>
  <p>The guess at every step, from the blurry average of all digits to one specific digit. The share of the guess's energy in the coarsest block of discrete cosine transform (DCT) coefficients starts near 1 (a blur) and falls as detail arrives. Click the filmstrips to choose a step.</p>
  <h4>Commitment</h4>
  <p>The weights of the five heaviest digits spread evenly early and concentrate on one. Two samples from nearby noise (B = cos θ · A + sin θ · Z, with θ (theta) the angle between them) share a guess until a step at which they commit to different digits.</p>
  <h4>High dimensions</h4>
  <p>A digit is 400 numbers. The sample stays at the noise radius from its nearest digit, its length cannot tell it from a digit, the coarse part of the guess settles before the fine part, and the starting noise is about equally far from every digit.</p>
  <h4>Starting noise</h4>
  <p><b>On the shell (×1)</b> is ordinary noise. <b>Too large (×3)</b> and <b>too small (×0.7)</b> start the walk off the distance from the middle that the trained network saw in training: the network fails there, the exact lookup does not.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const CSS = `
.tl-seg { align-items: center; }
.tl-seglabel { font: 500 11px/1 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; margin-right: 3px; min-width: 52px; }
.reveal section.demo-full [data-demo] canvas.tl-overlay { height: 100% !important; width: 100% !important; }
.reveal section.demo-full [data-demo] canvas.tl-panel-canvas { height: auto !important; width: 100% !important; }
`;
function injectCss() {
  if (document.getElementById('dp-css')) return;
  const st = document.createElement('style');
  st.id = 'dp-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  return makeLab(container, {
    stage, controls, name: 'diffusion-path', topics: TOPICS, views: makeViews(), keys: KEYS, help: HELP_HTML,
    legend: 'drag the step slider · click the filmstrips · seeds are the preset buttons',
  });
}
