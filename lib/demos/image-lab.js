// image-lab: image processing as arithmetic, one lab (lib/core/lab.js). Six topics: filters (convolution with an editable kernel and four border
// rules, the median, the unsharp mask), Fourier (the spectrum with low- and high-pass masks, one frequency as a pair of dots, the convolution
// theorem, 3-tap responses), JPEG (one block through the cosine transform, quantization, zigzag and run lengths; the 64 basis images; a whole image
// with its measured size and chroma subsampling), pyramids, tone (histograms, linear light) and comparison (PSNR, SSIM). The computations are the
// WebGL program's, lib/programs/image-lab/webgl/imagelab.js; the views are in image-lab-views.js and the files it imports.
import { makeLab } from '../core/lab.js';
import { TOPICS, KEYS, makeViews } from './image-lab-views.js';

export const TITLE = 'Image lab';
export const HUB = 'Convolution, the Fourier transform, JPEG, pyramids, histograms and PSNR, each as numbers and pictures you can change, with the code beside them.';

const PROGRAM = {
  title: 'Image lab: the whole program',
  base: new URL('../programs/image-lab/', import.meta.url),
  tracks: [
    { id: 'webgl', label: 'WebGL · three.js', files: ['webgl/imagelab.js', 'webgl/scene.js', 'webgl/index.html'], run: 'webgl/index.html',
      note: 'Serve the course folder (python3 -m http.server) and open lib/programs/image-lab/webgl/. imagelab.js holds every computation, and the demo calls these same functions; scene.js shows a generated picture beside its JPEG at a quality you set with the arrow keys.' },
    { id: 'unity', label: 'Unity · C#', files: ['unity/ImageLab.cs', 'unity/ImageLabScene.cs'],
      note: 'Put both files in Assets, put ImageLabScene on an empty GameObject, press Play. ImageLab.cs is imagelab.js, line for line where the languages allow (in double). It has been compiled against a stand-in for the Unity API and run on test cases, not opened in the Unity editor.' },
  ],
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Image processing as arithmetic on an array of numbers. Every picture and every number comes from the program shown in the code card, which runs here.</p>
  <h4>Filter</h4>
  <p><b>Convolution</b>: click or drag over the source or the result to move the window. Its cells show the pixel (white) and the kernel weight (pink); cells past the
  edge (orange) are what the border rule supplies. Edit any kernel cell. <b>Median</b> and <b>Unsharp</b> use the same pixel picker.</p>
  <h4>Fourier</h4>
  <p><b>Spectrum</b>: click the spectrum to set the mask radius and read a coefficient. <b>One frequency</b>: sliders for u, v and phase; the dots are the transform.
  <b>Convolution theorem</b>: the two routes give the same image. <b>3-tap responses</b>: the factor each frequency is multiplied by.</p>
  <h4>JPEG</h4>
  <p><b>One block</b>: pick a coefficient to see its basis image, its table entry and its rounding. <b>64 basis images</b>: keep the K × K lowest. <b>Whole image</b>: quality, size, and 4:2:0 against 4:4:4.</p>
  <h4>The rest</h4>
  <p>Pyramids rebuild the image exactly; histogram tools show equalization, stretch and gamma; linear light shows why blending codes darkens; PSNR and SSIM compare a distorted copy with the original.</p>
  <h4>The code</h4>
  <p>The code card is the program itself, in the track you choose, with each variable's current value beside its line. A test runs the C# on the same inputs and compares every number. <code>&lt;/&gt;</code> opens the whole program for both tracks.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const CSS = `
.tl-seg { align-items: center; }
.tl-seglabel { font: 500 11px/1 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; margin-right: 3px; min-width: 52px; }
.tl-panel-canvas { margin: 4px 0; }
.reveal section.demo-full [data-demo] canvas.tl-overlay { height: 100% !important; width: 100% !important; }
.reveal section.demo-full [data-demo] canvas.tl-panel-canvas { height: auto !important; width: 100% !important; }
`;
function injectCss() {
  if (document.getElementById('il-css')) return;
  const st = document.createElement('style');
  st.id = 'il-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  return makeLab(container, {
    stage, controls, name: 'image-lab', topics: TOPICS, views: makeViews(), keys: KEYS, program: PROGRAM,
    files: { webgl: 'webgl/imagelab.js', unity: 'unity/ImageLab.cs' },
    help: HELP_HTML,
    legend: 'click or drag on the pictures · edit kernel cells in the rail',
  });
}
