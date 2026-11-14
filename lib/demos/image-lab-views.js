// image-lab-views: the view catalog behind the image-lab demo (runtime: lib/core/lab.js). Six topics: filters (convolution, the median, the unsharp
// mask), Fourier (spectrum and masks, one frequency, the convolution theorem, the response of 3-tap kernels), JPEG (one block, the 64 basis images,
// a whole image), pyramids, tone (histograms, linear light) and comparison (PSNR, SSIM). The views are in image-lab-filters.js, -fourier.js, -jpeg.js and
// -tone.js; each run() calls the program's own functions (lib/programs/image-lab/webgl/imagelab.js).
import { convView, medianView, unsharpView, FILTER_KEYS } from './image-lab-filters.js';
import { spectrumView, frequencyView, theoremView, responseView, FOURIER_KEYS } from './image-lab-fourier.js';
import { blockView, basisView, imageView, JPEG_KEYS } from './image-lab-jpeg.js';
import { pyramidView, toneView, lightView, metricsView, ssimView, TONE_KEYS } from './image-lab-tone.js';
import { makeResolution } from './image-lab-draw.js';

export const TOPICS = [
  { id: 'filter', label: 'Filter' }, { id: 'fourier', label: 'Fourier' }, { id: 'jpeg', label: 'JPEG' },
  { id: 'pyramid', label: 'Pyramid' }, { id: 'tone', label: 'Tone' }, { id: 'compare', label: 'Compare' },
];
export const KEYS = { ...FILTER_KEYS, ...FOURIER_KEYS, ...JPEG_KEYS, ...TONE_KEYS };

export function makeViews() {
  // the resolution of each computed picture of the scene, one value per picture for this lab, so switching views keeps it
  const res = makeResolution();
  return [
    convView(), medianView(), unsharpView(),
    spectrumView(res), frequencyView(), theoremView(res), responseView(),
    blockView(), basisView(), imageView(res),
    pyramidView(res),
    toneView(res), lightView(res),
    metricsView(res), ssimView(),
  ];
}
