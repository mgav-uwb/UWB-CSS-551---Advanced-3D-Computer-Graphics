// dct-lab: the discrete cosine transform (DCT) as a change of basis, for lecture L16 ("The space of images"). A lab (lib/core/lab.js) with no program and
// no code card: up to five topics, each one view of numbers and pictures that move together. The views are in dct-lab-views.js (bases, rebuild, lowpass;
// the last two in dct-lab-views-rebuild.js); the rest are in dct-lab-held.js, which stays private (the public build ships a stub in its place, and the
// lab shows the topics that have a view).
import { makeLab } from '../core/lab.js';
import { KEYS, makeViews, topicsOf } from './dct-lab-views.js';

export const TITLE = 'DCT lab';
export const HUB = 'The discrete cosine transform as a change of basis: the pixel basis and the cosine basis, rebuilding an image one basis image at a time, and keeping the lowest k × k coefficients.';

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>The discrete cosine transform (DCT) writes an image as a weighted sum of cosine images. The weights are the coefficients. Nothing is lost: with every coefficient the image comes back exactly.</p>
  <h4>Conventions</h4>
  <p>An <i>n</i> × <i>n</i> image is X. The coefficient grid is Y, written Y[v][u]: row v is the vertical frequency, column u the horizontal frequency. Vectors are columns; a row is written as a transpose.</p>
  <p>C is the n × n DCT matrix: row k is a cosine that makes k half-periods across the n pixels. The basis image for (u, v) is B = c_v c_uᵀ, where c_k is row k of C written as a column, so B[y][x] = C[v][y] C[u][x].</p>
  <p>Mean squared error (MSE) is the average squared difference between two images with pixel values in [0, 1]. Peak signal-to-noise ratio (PSNR) = 10 log10(1 / MSE) decibels (dB); it reads "exact" when the MSE is below 1e-12.</p>
  <h4>The topics</h4>
  <p><b>Bases</b>: the same toy image as a sum of pixel images and as a sum of cosine images. <b>Rebuild</b>: add the cosine images one at a time in zigzag order, and drop a row, a column or one coefficient by clicking its number or cell. <b>Keep k × k</b>: keep only the lowest k × k block of coefficients and read the PSNR. Rebuild and Keep k × k also work on a picture cut into 8 × 8 blocks.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const CSS = `
.tl-seg { align-items: center; }
.tl-seglabel { font: 500 11px/1 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; margin-right: 3px; min-width: 52px; }
.reveal section.demo-full [data-demo] canvas.tl-overlay { height: 100% !important; width: 100% !important; }
`;
function injectCss() {
  if (document.getElementById('dl-css')) return;
  const st = document.createElement('style');
  st.id = 'dl-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  const views = makeViews();
  return makeLab(container, {
    stage, controls, name: 'dct-lab', topics: topicsOf(views), views, keys: KEYS, help: HELP_HTML,
    legend: 'click cells, numbers and charts · move the sliders',
  });
}
