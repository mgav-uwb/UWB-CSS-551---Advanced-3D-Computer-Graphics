// sampling-lab: sampling and antialiasing as a lab (lib/core/lab.js). Five topics: the signal (a sine sampled below its frequency
// and the alias it returns as, a two-tone signal reconstructed from its samples), the zone plate rendered one pixel at a time, the
// reconstruction filters (box, tent, Gaussian, Lanczos-3, Mitchell-Netravali) as curves and on a picture, samples (the coverage of
// an edge by sample patterns, random against stratified, SSAA against MSAA, the space coverage is blended in) and time (a wheel
// filmed at a frame rate, the history a temporal filter keeps). The computations are the WebGL program's,
// lib/programs/sampling-lab/webgl/samplinglab.js; the views are in sampling-lab-views.js and the 2D drawing in sampling-lab-draw.js.
import { makeLab } from '../core/lab.js';
import { TOPICS, KEYS, makeViews } from './sampling-lab-views.js';

const PROGRAM = {
  title: 'Sampling lab: the whole program',
  base: new URL('../programs/sampling-lab/', import.meta.url),
  tracks: [
    { id: 'webgl', label: 'WebGL · three.js', files: ['webgl/samplinglab.js', 'webgl/scene.js', 'webgl/index.html'], run: 'webgl/index.html',
      note: 'Serve the course folder (python3 -m http.server) and open lib/programs/sampling-lab/webgl/. samplinglab.js holds every computation, and the demo calls these same functions; scene.js renders a zone plate pixel by pixel with its zonePixel (up and down arrows change the samples per pixel, J jitters them).' },
    { id: 'unity', label: 'Unity · C#', files: ['unity/SamplingLab.cs', 'unity/SamplingLabScene.cs'],
      note: 'Put both files in Assets, put SamplingLabScene on an empty GameObject, press Play. SamplingLab.cs is samplinglab.js, line for line where the languages allow. It has been compiled against a stand-in for the Unity API and run on test cases, not opened in the Unity editor.' },
  ],
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Sampling and what it loses. Every number and every pixel of the pictures comes from the program shown in the code card, which runs here.</p>
  <h4>Signal</h4>
  <p><b>Aliasing in 1D</b>: a sine of frequency f sampled fs times per unit. Above the Nyquist frequency fs/2 the samples are those of a lower sine, |f − k fs|, drawn in green;
  the lower graph shows the alias against f (drag in it to change f). <b>From samples</b>: a two-tone signal rebuilt from its samples by each filter, with the RMS errors of the
  lecture; click a plot to move the probe and read the weights the filter gives the samples under it.</p>
  <h4>Zone plate</h4>
  <p>½ + ½ cos(K r² / size) rendered one pixel at a time, each pixel the mean of n × n samples. With one sample the rings past the gold circle are aliases; more samples turn that region
  gray. Click a pixel to read its frequency and the frequency it shows as. The plot on the right is the same fold along an axis.</p>
  <h4>Filters</h4>
  <p>The kernel of each filter, what it passes by frequency (H at ½, 1 and 1½ cycles per pixel), and the filter applied to a picture: red where the reconstruction goes above 1, blue
  below 0. B and C shape the Mitchell–Netravali cubic.</p>
  <h4>Samples</h4>
  <p><b>Coverage</b>: drag the yellow ends of the edge across the pixel; every pattern estimates the coverage and the exact value is the area. <b>Random or stratified</b>, <b>SSAA against MSAA</b>
  (shader runs, instructions, color memory) and <b>blend space</b> (coverage blended as codes or as light).</p>
  <h4>Time</h4>
  <p>A wheel filmed at a frame rate is the same alias along the time axis: at 12 spokes, 2 rev/s and 24 fps it stands still. The shutter slider is the motion blur that removes the alias.
  <b>The history</b>: what a temporal filter keeps from earlier frames.</p>
  <h4>The code</h4>
  <p>The code card is the program itself, in the track you choose, with each variable's current value beside its line. A test runs the C# on the same inputs and compares every number.
  <code>&lt;/&gt;</code> opens the whole program for both tracks.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const CSS = `
.sl-seg { align-items: center; }
.sl-seglabel { font: 500 11px/1 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; margin-right: 3px; min-width: 52px; }
/* lib.css sizes every canvas of a slide demo to the scene's height; this one is the scene's overlay */
.reveal section.demo-full [data-demo] canvas.sl-overlay { height: 100% !important; width: 100% !important; }
`;
function injectCss() {
  if (document.getElementById('sl-css')) return;
  const st = document.createElement('style');
  st.id = 'sl-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  const lab = makeLab(container, {
    stage, controls, name: 'sampling-lab', topics: TOPICS, views: makeViews(), keys: KEYS, program: PROGRAM,
    files: { webgl: 'webgl/samplinglab.js', unity: 'unity/SamplingLab.cs' },
    help: HELP_HTML,
    legend: 'drag in the plots · click a pixel, a row or a pattern · drag the ends of the edge',
  });
  return lab;
}
