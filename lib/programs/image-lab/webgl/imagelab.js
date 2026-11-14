// imagelab.js: image processing as arithmetic on arrays. An image is a flat array of numbers, row after row, w columns by h rows,
// values in [0, 1] unless a function says 0 to 255. The file covers convolution with a kernel and its border choices, the median
// and the unsharp mask, the discrete Fourier transform (by its formula and by the fast algorithm), frequency masks and the
// convolution theorem, the cosine transform and every step of JPEG (quantization, zigzag and run lengths, chroma subsampling, a
// whole image with its size), Gaussian and Laplacian pyramids, histograms and tone curves, linear light, and the two metrics
// PSNR and SSIM. No three.js and no drawing: scene.js shows one image and its JPEG, and the course demo (lib/demos/image-lab.js)
// runs these same functions, so a value the demo prints beside a line of code is the value that line computed. No function
// changes its arguments.
// The same functions, line for line where the languages allow, are ImageLab.cs in ../unity/ (lib/tests/programs/image-lab.test.mjs
// runs both on the same inputs and compares the numbers). The C# uses double, so the two tracks round alike.

// #region Test images
// Small images made by rules, so both tracks hold the same pixels. Park-Miller is the random generator; a Gaussian number is
// the sum of twelve uniform ones minus 6 (mean 0, variance 1). The glyph is 12 by 12 with
// ink 0.99, a soft edge 0.29 and paper 0; rows 4 to 6 hold the lecture's neighborhood (0.99, 0.29, 0) at columns 5 to 7. The
// scene is a color picture with a ramp, a disc, a box, a thin line and fine stripes; its luma is the gray test image.
export function nextRandom(state) {
  return (state * 48271) % 2147483647;
}

export function makeNoise(count, seed) {
  const values = new Array(count).fill(0);
  let state = seed;
  for (let k = 0; k < count; k++) {
    state = nextRandom(state);
    values[k] = state / 2147483647;
  }
  return values;
}

export function makeGaussianNoise(count, seed, sigma) {
  const values = new Array(count).fill(0);
  let state = seed;
  for (let k = 0; k < count; k++) {
    let sum = 0;
    for (let draw = 0; draw < 12; draw++) {
      state = nextRandom(state);
      sum += state / 2147483647;
    }
    values[k] = sigma * (sum - 6);
  }
  return values;
}

const GLYPH_ROWS = [
  '............',
  '...o##o.....',
  '..o###o.....',
  '.o####o.....',
  '...o##o.....',
  '...o##o.....',
  '...o##o.....',
  '...o##o.....',
  '...o##o.....',
  '...o##o.....',
  '.o######o...',
  '............',
];

export function makeGlyph() {
  const image = new Array(144).fill(0);
  for (let j = 0; j < 12; j++) {
    for (let i = 0; i < 12; i++) {
      const mark = GLYPH_ROWS[j].charAt(i);
      image[j * 12 + i] = mark === '#' ? 0.99 : (mark === 'o' ? 0.29 : 0);
    }
  }
  return image;
}

export function lumaOf(r, g, b) {
  const luma = new Array(r.length).fill(0);
  for (let k = 0; k < r.length; k++) luma[k] = 0.299 * r[k] + 0.587 * g[k] + 0.114 * b[k];
  return luma;
}

export function makeColorScene(n) {
  const r = new Array(n * n).fill(0);
  const g = new Array(n * n).fill(0);
  const b = new Array(n * n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) / n;
      const y = (j + 0.5) / n;
      let red = 0.30 + 0.50 * y;
      let green = 0.50 + 0.40 * y;
      let blue = 0.85 + 0.15 * y;
      if (y > 0.72) {
        const shade = Math.floor(i / 2) % 2 === 0 ? 0.8 : 1.0;
        red = 0.30 * shade; green = 0.55 * shade; blue = 0.25 * shade;
      }
      if (Math.abs(x + y - 1.0) < 1.5 / n) { red = 1.0; green = 0.9; blue = 0.1; }
      if ((x - 0.30) * (x - 0.30) + (y - 0.38) * (y - 0.38) < 0.17 * 0.17) { red = 0.9; green = 0.12; blue = 0.10; }
      if (x > 0.55 && x < 0.88 && y > 0.28 && y < 0.60) { red = 0.10; green = 0.20; blue = 0.85; }
      r[j * n + i] = red;
      g[j * n + i] = green;
      b[j * n + i] = blue;
    }
  }
  return { r, g, b };
}

export function makeScene(n) {
  const color = makeColorScene(n);
  return lumaOf(color.r, color.g, color.b);
}
// #endregion

// #region Borders
// A kernel centered on an edge pixel reaches past the image. Clamp repeats the edge pixel, wrap treats the image as a torus,
// mirror reflects it (the same rule as the texture lab's address modes), and zero treats the outside as black.
export function borderIndex(i, size, mode) {
  if (mode === 'zero') return (i < 0 || i >= size) ? -1 : i;
  if (mode === 'clamp') return Math.min(Math.max(i, 0), size - 1);
  const period = Math.floor(i / size);
  const inside = i - period * size;
  if (mode === 'mirror' && period % 2 !== 0) return size - 1 - inside;
  return inside;
}

export function pixelAt(image, w, h, i, j, mode) {
  const row = borderIndex(i, h, mode);
  const column = borderIndex(j, w, mode);
  if (row < 0 || column < 0) return 0;
  return image[row * w + column];
}
// #endregion

// #region Convolution at a pixel
// Replace a pixel by the weighted sum of its neighborhood: y(i, j) = sum over a, b of K(a, b) * x(i + a, j + b), with i the row
// and j the column, as in the lecture. Each product is kept so it can be read. (Written this way the sum is a correlation; a
// symmetric kernel gives the same numbers, and flipping the kernel in both directions turns it into convolution proper.)
export function convolvePixel(image, w, h, kernel, size, i, j, border) {
  const half = (size - 1) / 2;
  const neighbors = [];
  const products = [];
  let value = 0;
  for (let a = -half; a <= half; a++) {
    for (let b = -half; b <= half; b++) {
      const x = pixelAt(image, w, h, i + a, j + b, border);
      const weight = kernel[(a + half) * size + (b + half)];
      neighbors.push(x);
      products.push(weight * x);
      value += weight * x;
    }
  }
  return { neighbors, products, value };
}
// #endregion

// #region Convolution of an image
// The same sum at every pixel. The result may leave [0, 1] (a Sobel response is negative on one side of an edge), so its range
// is returned for the display to scale.
export function convolve(image, w, h, kernel, size, border) {
  const result = new Array(w * h).fill(0);
  let low = Infinity;
  let high = -Infinity;
  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      const value = convolvePixel(image, w, h, kernel, size, i, j, border).value;
      result[i * w + j] = value;
      low = Math.min(low, value);
      high = Math.max(high, value);
    }
  }
  return { image: result, low, high };
}
// #endregion

// #region Kernels
// The kernels of the lecture. Sizes are odd; values run row by row. The Gaussian is the binomial approximation. A kernel that sums
// to 1 keeps a constant image; Sobel and Laplacian sum to 0 and send a constant image to 0. A kernel is separable when it is a
// column times a row, and then two passes of size multiply-adds replace one pass of size squared.
export function makeKernel(name) {
  if (name === 'box3') return { size: 3, values: [1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9] };
  if (name === 'gauss3') return { size: 3, values: [1 / 16, 2 / 16, 1 / 16, 2 / 16, 4 / 16, 2 / 16, 1 / 16, 2 / 16, 1 / 16] };
  if (name === 'sharpen') return { size: 3, values: [0, -1, 0, -1, 5, -1, 0, -1, 0] };
  if (name === 'sobelX') return { size: 3, values: [-1, 0, 1, -2, 0, 2, -1, 0, 1] };
  if (name === 'sobelY') return { size: 3, values: [-1, -2, -1, 0, 0, 0, 1, 2, 1] };
  if (name === 'laplacian') return { size: 3, values: [0, 1, 0, 1, -4, 1, 0, 1, 0] };
  if (name === 'gauss5') {
    const row = [1, 4, 6, 4, 1];
    const values = [];
    for (let a = 0; a < 5; a++) {
      for (let b = 0; b < 5; b++) values.push(row[a] * row[b] / 256);
    }
    return { size: 5, values };
  }
  return { size: 3, values: [0, 0, 0, 0, 1, 0, 0, 0, 0] };
}

export function kernelSum(values) {
  let total = 0;
  for (let k = 0; k < values.length; k++) total += values[k];
  return total;
}

export function separate(values, size) {
  let pivotRow = 0;
  let pivotColumn = 0;
  for (let k = values.length - 1; k >= 0; k--) {
    if (Math.abs(values[k]) > 1e-12) { pivotRow = Math.floor(k / size); pivotColumn = k % size; }
  }
  const pivot = values[pivotRow * size + pivotColumn];
  const column = new Array(size).fill(0);
  const row = new Array(size).fill(0);
  for (let a = 0; a < size; a++) column[a] = values[a * size + pivotColumn];
  for (let b = 0; b < size; b++) row[b] = values[pivotRow * size + b] / pivot;
  let separable = Math.abs(pivot) > 1e-12;
  for (let a = 0; a < size; a++) {
    for (let b = 0; b < size; b++) {
      if (Math.abs(values[a * size + b] - column[a] * row[b]) > 1e-9) separable = false;
    }
  }
  const costFull = size * size;
  const costSeparable = 2 * size;
  return { separable, column, row, costFull, costSeparable };
}
// #endregion

// #region Median filter
// Replace a pixel by the median of its neighborhood. It is not linear, so it has no kernel: a lone wrong pixel is outvoted
// instead of spread over its neighbors, and a step edge stays a step.
export function medianPixel(image, w, h, size, i, j, border) {
  const half = (size - 1) / 2;
  const neighbors = [];
  for (let a = -half; a <= half; a++) {
    for (let b = -half; b <= half; b++) neighbors.push(pixelAt(image, w, h, i + a, j + b, border));
  }
  const sorted = neighbors.slice();
  for (let p = 1; p < sorted.length; p++) {
    const held = sorted[p];
    let q = p - 1;
    while (q >= 0 && sorted[q] > held) { sorted[q + 1] = sorted[q]; q--; }
    sorted[q + 1] = held;
  }
  const value = sorted[(sorted.length - 1) / 2];
  return { neighbors, sorted, value };
}

export function medianFilter(image, w, h, size, border) {
  const result = new Array(w * h).fill(0);
  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) result[i * w + j] = medianPixel(image, w, h, size, i, j, border).value;
  }
  return { image: result };
}
// #endregion

// #region Unsharp mask
// Add back the detail a blur removes: y = x + k (x - blur(x)). For a blur kernel B this is one kernel, (1 + k) times the
// identity minus k times B, so the convolution above applies it. Where the edge steepens the result leaves [0, 1]: the halo.
export function unsharpKernel(blur, size, amount) {
  const values = new Array(size * size).fill(0);
  const center = (size * size - 1) / 2;
  for (let k = 0; k < size * size; k++) {
    const identity = k === center ? 1 : 0;
    values[k] = identity + amount * (identity - blur[k]);
  }
  return { size, values };
}
// #endregion

// #region Frequency response of a kernel
// Put a cosine of frequency omega (radians per pixel) through a one-dimensional kernel with wrapped borders and the output is the
// same cosine times H(omega) = sum over a of taps(a) e^(-i a omega): the factor that frequency is multiplied by. A negative H
// inverts the stripes.
export function convolve1d(signal, taps, border) {
  const half = (taps.length - 1) / 2;
  const result = new Array(signal.length).fill(0);
  for (let i = 0; i < signal.length; i++) {
    let sum = 0;
    for (let a = -half; a <= half; a++) {
      const at = borderIndex(i + a, signal.length, border);
      if (at >= 0) sum += taps[a + half] * signal[at];
    }
    result[i] = sum;
  }
  return result;
}

export function frequencyResponse(taps, omega) {
  const half = (taps.length - 1) / 2;
  let re = 0;
  let im = 0;
  for (let a = -half; a <= half; a++) {
    re += taps[a + half] * Math.cos(a * omega);
    im -= taps[a + half] * Math.sin(a * omega);
  }
  const gain = Math.sqrt(re * re + im * im);
  return { re, im, gain };
}
// #endregion

// #region Discrete Fourier transform
// The coefficient at horizontal frequency u and vertical frequency v is X(u, v) = sum over x, y of image(x, y) e^(-2 pi i (u x / w
// + v y / h)), with x the column and y the row. Keep real and imaginary parts in two arrays. The inverse flips the sign and divides
// by w h. The sum has w h terms per coefficient, w h coefficients: this is the definition, and it is slow.
export function dft2d(re, im, w, h, inverse) {
  const sign = inverse ? 1 : -1;
  const scale = inverse ? 1 / (w * h) : 1;
  const outRe = new Array(w * h).fill(0);
  const outIm = new Array(w * h).fill(0);
  for (let v = 0; v < h; v++) {
    for (let u = 0; u < w; u++) {
      let sumRe = 0;
      let sumIm = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const angle = sign * 2 * Math.PI * (u * x / w + v * y / h);
          const c = Math.cos(angle);
          const s = Math.sin(angle);
          sumRe += re[y * w + x] * c - im[y * w + x] * s;
          sumIm += re[y * w + x] * s + im[y * w + x] * c;
        }
      }
      outRe[v * w + u] = sumRe * scale;
      outIm[v * w + u] = sumIm * scale;
    }
  }
  return { re: outRe, im: outIm };
}
// #endregion

// #region Fast Fourier transform
// Cooley and Tukey (1965): a transform of length n is two of length n / 2 plus n / 2 twiddle multiplications, so n log n instead
// of n squared. The 2D transform is the 1D transform of every row, then of every column. The length must be a power of two.
export function fft1d(re, im, inverse) {
  const n = re.length;
  const outRe = re.slice();
  const outIm = im.slice();
  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    while ((j & bit) !== 0) { j ^= bit; bit >>= 1; }
    j ^= bit;
    if (i < j) {
      const tr = outRe[i]; outRe[i] = outRe[j]; outRe[j] = tr;
      const ti = outIm[i]; outIm[i] = outIm[j]; outIm[j] = ti;
    }
  }
  for (let length = 2; length <= n; length *= 2) {
    const step = (inverse ? 2 : -2) * Math.PI / length;
    for (let start = 0; start < n; start += length) {
      for (let k = 0; k < length / 2; k++) {
        const c = Math.cos(step * k);
        const s = Math.sin(step * k);
        const p = start + k;
        const q = p + length / 2;
        const tr = outRe[q] * c - outIm[q] * s;
        const ti = outRe[q] * s + outIm[q] * c;
        outRe[q] = outRe[p] - tr;
        outIm[q] = outIm[p] - ti;
        outRe[p] += tr;
        outIm[p] += ti;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) { outRe[i] /= n; outIm[i] /= n; }
  }
  return { re: outRe, im: outIm };
}

export function fft2d(re, im, w, h, inverse) {
  let rowsRe = re.slice();
  let rowsIm = im.slice();
  for (let y = 0; y < h; y++) {
    const row = fft1d(rowsRe.slice(y * w, (y + 1) * w), rowsIm.slice(y * w, (y + 1) * w), inverse);
    for (let x = 0; x < w; x++) { rowsRe[y * w + x] = row.re[x]; rowsIm[y * w + x] = row.im[x]; }
  }
  for (let x = 0; x < w; x++) {
    const columnRe = new Array(h).fill(0);
    const columnIm = new Array(h).fill(0);
    for (let y = 0; y < h; y++) { columnRe[y] = rowsRe[y * w + x]; columnIm[y] = rowsIm[y * w + x]; }
    const column = fft1d(columnRe, columnIm, inverse);
    for (let y = 0; y < h; y++) { rowsRe[y * w + x] = column.re[y]; rowsIm[y * w + x] = column.im[y]; }
  }
  return { re: rowsRe, im: rowsIm };
}
// #endregion

// #region Spectrum and frequency masks
// Parseval: the picture's energy, the sum of its squares, equals the spectrum's energy divided by w h. The display puts zero
// frequency in the middle and shows log(1 + |X|), since the mean dwarfs everything else. A mask scales each coefficient by a
// number that depends on its distance from zero frequency (a frequency u above w / 2 counts as w - u: the grid folds it back).
export function imageEnergy(image) {
  let total = 0;
  for (let k = 0; k < image.length; k++) total += image[k] * image[k];
  return total;
}

export function spectralEnergy(re, im, w, h) {
  let total = 0;
  for (let k = 0; k < re.length; k++) total += re[k] * re[k] + im[k] * im[k];
  return total / (w * h);
}

export function logSpectrum(re, im, w, h) {
  const shown = new Array(w * h).fill(0);
  let peak = 0;
  for (let k = 0; k < re.length; k++) peak = Math.max(peak, Math.log(1 + Math.sqrt(re[k] * re[k] + im[k] * im[k])));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = ((y + h / 2) % h) * w + ((x + w / 2) % w);
      shown[y * w + x] = peak > 0 ? Math.log(1 + Math.sqrt(re[k] * re[k] + im[k] * im[k])) / peak : 0;
    }
  }
  return { shown, peak };
}

export function radialMask(w, h, radius, kind) {
  const mask = new Array(w * h).fill(0);
  const width = Math.max(radius, 0.01);
  for (let v = 0; v < h; v++) {
    for (let u = 0; u < w; u++) {
      const du = Math.min(u, w - u);
      const dv = Math.min(v, h - v);
      const distance = Math.sqrt(du * du + dv * dv);
      const low = distance <= radius ? 1 : 0;
      const soft = Math.exp(-distance * distance / (2 * width * width));
      let value = low;
      if (kind === 'high') value = 1 - low;
      if (kind === 'gaussian-low') value = soft;
      if (kind === 'gaussian-high') value = 1 - soft;
      mask[v * w + u] = value;
    }
  }
  return mask;
}

export function filterByMask(image, w, h, mask) {
  const zeros = new Array(w * h).fill(0);
  const spectrum = fft2d(image, zeros, w, h, false);
  const keptRe = new Array(w * h).fill(0);
  const keptIm = new Array(w * h).fill(0);
  for (let k = 0; k < w * h; k++) {
    keptRe[k] = spectrum.re[k] * mask[k];
    keptIm[k] = spectrum.im[k] * mask[k];
  }
  const back = fft2d(keptRe, keptIm, w, h, true);
  const energyBefore = spectralEnergy(spectrum.re, spectrum.im, w, h);
  const energyKept = spectralEnergy(keptRe, keptIm, w, h);
  let imaginary = 0;
  for (let k = 0; k < w * h; k++) imaginary = Math.max(imaginary, Math.abs(back.im[k]));
  return { spectrumRe: spectrum.re, spectrumIm: spectrum.im, keptRe, keptIm, filtered: back.re, imaginary, energyBefore, energyKept };
}
// #endregion

// #region One frequency
// A stripe pattern of u periods across and v down is 1/2 + 1/2 cos(2 pi (u x / w + v y / h)). Its spectrum is three dots: the
// mean at zero frequency and the pair (u, v) and (w - u, h - v), one at each side of the center. A frequency above w / 2 lands
// on the same pixels as w - u: the stripes alias.
export function frequencyImage(w, h, u, v, phase) {
  const image = new Array(w * h).fill(0);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) image[y * w + x] = 0.5 + 0.5 * Math.cos(2 * Math.PI * (u * x / w + v * y / h) + phase);
  }
  return image;
}

export function oneFrequency(w, h, u, v) {
  const image = frequencyImage(w, h, u, v, 0);
  const zeros = new Array(w * h).fill(0);
  const spectrum = fft2d(image, zeros, w, h, false);
  const us = [];
  const vs = [];
  const magnitudes = [];
  for (let k = 0; k < w * h; k++) {
    const magnitude = Math.sqrt(spectrum.re[k] * spectrum.re[k] + spectrum.im[k] * spectrum.im[k]);
    if (magnitude > 1e-6) { us.push(k % w); vs.push(Math.floor(k / w)); magnitudes.push(magnitude); }
  }
  const mirrorU = (w - u % w) % w;
  const mirrorV = (h - v % h) % h;
  const folded = Math.min(u % w, w - u % w);
  return { image, re: spectrum.re, im: spectrum.im, us, vs, magnitudes, mirrorU, mirrorV, folded };
}
// #endregion

// #region Convolution theorem
// Convolution in space is multiplication in frequency: F{K * x} = F{K} F{x}. Put the kernel in an image-sized array, flipped in both
// directions so the sum above becomes a true convolution, with its center at the corner (wrapped); transform it; multiply by the
// image's transform; transform back. The answer equals convolve with wrapped borders. For a large kernel this costs n log n.
export function convolveByFrequency(image, w, h, kernel, size) {
  const half = (size - 1) / 2;
  const padded = new Array(w * h).fill(0);
  for (let a = -half; a <= half; a++) {
    for (let b = -half; b <= half; b++) {
      const y = ((-a) % h + h) % h;
      const x = ((-b) % w + w) % w;
      padded[y * w + x] += kernel[(a + half) * size + (b + half)];
    }
  }
  const zeros = new Array(w * h).fill(0);
  const kernelSpectrum = fft2d(padded, zeros, w, h, false);
  const imageSpectrum = fft2d(image, zeros, w, h, false);
  const productRe = new Array(w * h).fill(0);
  const productIm = new Array(w * h).fill(0);
  for (let k = 0; k < w * h; k++) {
    productRe[k] = kernelSpectrum.re[k] * imageSpectrum.re[k] - kernelSpectrum.im[k] * imageSpectrum.im[k];
    productIm[k] = kernelSpectrum.re[k] * imageSpectrum.im[k] + kernelSpectrum.im[k] * imageSpectrum.re[k];
  }
  const back = fft2d(productRe, productIm, w, h, true);
  return { kernelRe: kernelSpectrum.re, kernelIm: kernelSpectrum.im, productRe, productIm, image: back.re };
}
// #endregion

// #region Cosine transform
// The orthonormal discrete cosine transform: row k of the matrix is sqrt(2 / n) cos((2 t + 1) k pi / 2 n) (sqrt(1 / n) for
// k = 0). An orthonormal transform is a rotation of coordinates: it keeps the sum of squares and loses nothing. The 2D basis
// image for horizontal frequency u and vertical v is the product of two rows; a block is a weighted sum of the n squared of them.
export function dctMatrix(n) {
  const matrix = new Array(n * n).fill(0);
  for (let k = 0; k < n; k++) {
    const scale = k === 0 ? Math.sqrt(1 / n) : Math.sqrt(2 / n);
    for (let t = 0; t < n; t++) matrix[k * n + t] = scale * Math.cos((2 * t + 1) * k * Math.PI / (2 * n));
  }
  return matrix;
}

export function dct1d(signal) {
  const n = signal.length;
  const matrix = dctMatrix(n);
  const coefficients = new Array(n).fill(0);
  for (let k = 0; k < n; k++) {
    for (let t = 0; t < n; t++) coefficients[k] += matrix[k * n + t] * signal[t];
  }
  return coefficients;
}

export function dctBasis(u, v, n) {
  const matrix = dctMatrix(n);
  const image = new Array(n * n).fill(0);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) image[y * n + x] = matrix[u * n + x] * matrix[v * n + y];
  }
  return image;
}

export function idct2d(coefficients, n) {
  const matrix = dctMatrix(n);
  const columns = new Array(n * n).fill(0);
  const block = new Array(n * n).fill(0);
  for (let v = 0; v < n; v++) {
    for (let x = 0; x < n; x++) {
      for (let u = 0; u < n; u++) columns[v * n + x] += matrix[u * n + x] * coefficients[v * n + u];
    }
  }
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      for (let v = 0; v < n; v++) block[y * n + x] += matrix[v * n + y] * columns[v * n + x];
    }
  }
  return { columns, block };
}

export function dct2d(block, n) {
  const matrix = dctMatrix(n);
  const rows = new Array(n * n).fill(0);
  const coefficients = new Array(n * n).fill(0);
  for (let y = 0; y < n; y++) {
    for (let u = 0; u < n; u++) {
      for (let x = 0; x < n; x++) rows[y * n + u] += matrix[u * n + x] * block[y * n + x];
    }
  }
  for (let v = 0; v < n; v++) {
    for (let u = 0; u < n; u++) {
      for (let y = 0; y < n; y++) coefficients[v * n + u] += matrix[v * n + y] * rows[y * n + u];
    }
  }
  return { rows, coefficients };
}

export function lowestFrequencies(coefficients, n, keep) {
  const kept = new Array(n * n).fill(0);
  for (let v = 0; v < keep && v < n; v++) {
    for (let u = 0; u < keep && u < n; u++) kept[v * n + u] = coefficients[v * n + u];
  }
  const rebuilt = idct2d(kept, n).block;
  return { kept, rebuilt };
}
// #endregion

// #region Quantization tables
// The standard luminance and chrominance tables of the JPEG standard (ITU-T T.81, Annex K), for quality 50. Rows are vertical
// frequency, columns horizontal; the entries grow toward the high frequencies, where the eye is least sensitive.
export const LUMA_TABLE = [
  16, 11, 10, 16, 24, 40, 51, 61,
  12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77,
  24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99,
];

export const CHROMA_TABLE = [
  17, 18, 24, 47, 99, 99, 99, 99,
  18, 21, 26, 66, 99, 99, 99, 99,
  24, 26, 56, 99, 99, 99, 99, 99,
  47, 66, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
  99, 99, 99, 99, 99, 99, 99, 99,
];
// #endregion

// #region Quantization
// The quality setting scales the table: percent = 5000 / quality below 50 and 200 - 2 quality from 50 up (the Independent JPEG
// Group's rule), and each entry becomes floor((entry percent + 50) / 100), at least 1. Dividing a coefficient by its entry and
// rounding is the only lossy step of JPEG. Rounding errs by at most half an entry, so the error of a coefficient is at most
// entry / 2.
export function roundHalfAway(x) {
  return x < 0 ? -Math.floor(-x + 0.5) : Math.floor(x + 0.5);
}

export function qualityScale(quality) {
  const q = Math.min(Math.max(quality, 1), 100);
  return q < 50 ? 5000 / q : 200 - 2 * q;
}

export function scaledTable(table, quality) {
  const scale = qualityScale(quality);
  const scaled = new Array(table.length).fill(0);
  for (let k = 0; k < table.length; k++) scaled[k] = Math.min(255, Math.max(1, Math.floor((table[k] * scale + 50) / 100)));
  return { scale, table: scaled };
}

export function quantize(coefficients, table) {
  const levels = new Array(coefficients.length).fill(0);
  const dequantized = new Array(coefficients.length).fill(0);
  const errors = new Array(coefficients.length).fill(0);
  let nonzero = 0;
  for (let k = 0; k < coefficients.length; k++) {
    levels[k] = roundHalfAway(coefficients[k] / table[k]);
    dequantized[k] = levels[k] * table[k];
    errors[k] = coefficients[k] - dequantized[k];
    if (levels[k] !== 0) nonzero++;
  }
  return { levels, dequantized, errors, nonzero };
}
// #endregion

// #region Zigzag and run lengths
// Read the 64 integers along the anti-diagonals, low frequencies first, so the zeros collect at the end. The first is the DC
// coefficient, stored as a difference from the previous block. The other 63 are stored as pairs (run of zeros before it, value);
// sixteen zeros in a row take the symbol (15, 0), and trailing zeros take one end-of-block mark.
export function zigzagOrder() {
  const order = [];
  for (let s = 0; s < 15; s++) {
    const first = Math.max(0, s - 7);
    const last = Math.min(s, 7);
    if (s % 2 === 1) {
      for (let row = first; row <= last; row++) order.push(row * 8 + (s - row));
    } else {
      for (let row = last; row >= first; row--) order.push(row * 8 + (s - row));
    }
  }
  return order;
}

export function runLengths(levels) {
  const order = zigzagOrder();
  const sequence = new Array(64).fill(0);
  for (let k = 0; k < 64; k++) sequence[k] = levels[order[k]];
  const runs = [];
  const values = [];
  let run = 0;
  for (let k = 1; k < 64; k++) {
    if (sequence[k] === 0) { run++; continue; }
    while (run > 15) { runs.push(15); values.push(0); run -= 16; }
    runs.push(run);
    values.push(sequence[k]);
    run = 0;
  }
  const endOfBlock = run > 0;
  return { sequence, dc: sequence[0], runs, values, endOfBlock };
}
// #endregion

// #region One JPEG block
// Subtract 128, transform, divide by the scaled table and round; to decode, multiply back, invert the transform, add 128 and
// round to a gray level. The pixels are 0 to 255, row by row. The error per pixel is what the rounding of the coefficients left.
export function jpegBlock(pixels, quality, table) {
  const shifted = new Array(64).fill(0);
  for (let k = 0; k < 64; k++) shifted[k] = pixels[k] - 128;
  const coefficients = dct2d(shifted, 8).coefficients;
  const scaled = scaledTable(table, quality);
  const quantized = quantize(coefficients, scaled.table);
  const restored = idct2d(quantized.dequantized, 8).block;
  const reconstructed = new Array(64).fill(0);
  const difference = new Array(64).fill(0);
  let squares = 0;
  let maxError = 0;
  for (let k = 0; k < 64; k++) {
    reconstructed[k] = Math.min(255, Math.max(0, roundHalfAway(restored[k] + 128)));
    difference[k] = pixels[k] - reconstructed[k];
    squares += difference[k] * difference[k];
    maxError = Math.max(maxError, Math.abs(difference[k]));
  }
  const rms = Math.sqrt(squares / 64);
  return {
    shifted, coefficients, scale: scaled.scale, table: scaled.table, levels: quantized.levels, dequantized: quantized.dequantized,
    nonzero: quantized.nonzero, reconstructed, difference, rms, maxError,
  };
}
// #endregion

// #region Chroma subsampling
// JPEG converts RGB to Y (brightness) and Cb, Cr (blue and red differences), then keeps the two color planes at half resolution
// in each direction (4:2:0): per 2 by 2 pixels, 4 Y + 1 Cb + 1 Cr = 6 numbers instead of 12, before any cosine transform. The
// eye resolves brightness detail better than color detail. The planes are 0 to 255.
export function rgbToYcc(r, g, b) {
  const y = 0.299 * r + 0.587 * g + 0.114 * b;
  const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
  const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
  return { y, cb, cr };
}

export function yccToRgb(y, cb, cr) {
  const r = y + 1.402 * (cr - 128);
  const g = y - 0.344136 * (cb - 128) - 0.714136 * (cr - 128);
  const b = y + 1.772 * (cb - 128);
  return { r, g, b };
}

export function halvePlane(plane, w, h) {
  const half = new Array((w / 2) * (h / 2)).fill(0);
  for (let y = 0; y < h / 2; y++) {
    for (let x = 0; x < w / 2; x++) {
      half[y * (w / 2) + x] = (plane[2 * y * w + 2 * x] + plane[2 * y * w + 2 * x + 1] + plane[(2 * y + 1) * w + 2 * x] + plane[(2 * y + 1) * w + 2 * x + 1]) / 4;
    }
  }
  return half;
}

export function repeatPlane(plane, w, h) {
  const full = new Array(4 * w * h).fill(0);
  for (let y = 0; y < 2 * h; y++) {
    for (let x = 0; x < 2 * w; x++) full[y * 2 * w + x] = plane[Math.floor(y / 2) * w + Math.floor(x / 2)];
  }
  return full;
}

export function chromaSubsample(r, g, b, w, h) {
  const luma = new Array(w * h).fill(0);
  const blue = new Array(w * h).fill(0);
  const red = new Array(w * h).fill(0);
  for (let k = 0; k < w * h; k++) {
    const c = rgbToYcc(r[k], g[k], b[k]);
    luma[k] = c.y; blue[k] = c.cb; red[k] = c.cr;
  }
  const blueHalf = halvePlane(blue, w, h);
  const redHalf = halvePlane(red, w, h);
  const blueFull = repeatPlane(blueHalf, w / 2, h / 2);
  const redFull = repeatPlane(redHalf, w / 2, h / 2);
  const outR = new Array(w * h).fill(0);
  const outG = new Array(w * h).fill(0);
  const outB = new Array(w * h).fill(0);
  for (let k = 0; k < w * h; k++) {
    const c = yccToRgb(luma[k], blueFull[k], redFull[k]);
    outR[k] = Math.min(255, Math.max(0, c.r));
    outG[k] = Math.min(255, Math.max(0, c.g));
    outB[k] = Math.min(255, Math.max(0, c.b));
  }
  const numbersBefore = 3 * w * h;
  const numbersAfter = w * h + 2 * (w / 2) * (h / 2);
  return { r: outR, g: outG, b: outB, luma, blueHalf, redHalf, numbersBefore, numbersAfter };
}
// #endregion

// #region Size of a JPEG image
// Cut a plane into 8 by 8 blocks and code each as above. The size is an estimate: the first-order entropy of the symbols (the
// category of each DC difference; the run and the category of each AC pair, with end-of-block and the 16-zero symbol) plus the
// bits of each value's magnitude. A real file spends a little more (Huffman tables, headers). Pixels are 0 to 255.
export function bitLength(value) {
  let magnitude = Math.abs(value);
  let bits = 0;
  while (magnitude >= 1) { bits++; magnitude = Math.floor(magnitude / 2); }
  return bits;
}

export function entropyBits(counts) {
  let total = 0;
  for (let k = 0; k < counts.length; k++) total += counts[k];
  let bits = 0;
  for (let k = 0; k < counts.length; k++) {
    if (counts[k] > 0) bits -= counts[k] * Math.log(counts[k] / total) / Math.log(2);
  }
  return bits;
}

export function codePlane(plane, w, h, quality, table) {
  const scaled = scaledTable(table, quality).table;
  const decoded = new Array(w * h).fill(0);
  const dcCounts = new Array(12).fill(0);
  const acCounts = new Array(256).fill(0);
  let extraBits = 0;
  let nonzero = 0;
  let previousDc = 0;
  for (let by = 0; by < h; by += 8) {
    for (let bx = 0; bx < w; bx += 8) {
      const block = new Array(64).fill(0);
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) block[y * 8 + x] = plane[(by + y) * w + bx + x] - 128;
      }
      const quantized = quantize(dct2d(block, 8).coefficients, scaled);
      const restored = idct2d(quantized.dequantized, 8).block;
      for (let y = 0; y < 8; y++) {
        for (let x = 0; x < 8; x++) decoded[(by + y) * w + bx + x] = Math.min(255, Math.max(0, restored[y * 8 + x] + 128));
      }
      nonzero += quantized.nonzero;
      const runs = runLengths(quantized.levels);
      const category = bitLength(runs.dc - previousDc);
      dcCounts[category]++;
      extraBits += category;
      previousDc = runs.dc;
      for (let p = 0; p < runs.runs.length; p++) {
        const size = bitLength(runs.values[p]);
        acCounts[runs.runs[p] * 16 + size]++;
        extraBits += size;
      }
      if (runs.endOfBlock) acCounts[0]++;
    }
  }
  const blocks = (w / 8) * (h / 8);
  const bits = entropyBits(dcCounts) + entropyBits(acCounts) + extraBits;
  return { decoded, blocks, nonzero, nonzeroPerBlock: nonzero / blocks, bits };
}

export function jpegColor(r, g, b, w, h, quality, subsample) {
  const luma = new Array(w * h).fill(0);
  const blue = new Array(w * h).fill(0);
  const red = new Array(w * h).fill(0);
  for (let k = 0; k < w * h; k++) {
    const c = rgbToYcc(r[k], g[k], b[k]);
    luma[k] = c.y; blue[k] = c.cb; red[k] = c.cr;
  }
  const codedY = codePlane(luma, w, h, quality, LUMA_TABLE);
  let codedBlue;
  let codedRed;
  let blueFull;
  let redFull;
  if (subsample) {
    codedBlue = codePlane(halvePlane(blue, w, h), w / 2, h / 2, quality, CHROMA_TABLE);
    codedRed = codePlane(halvePlane(red, w, h), w / 2, h / 2, quality, CHROMA_TABLE);
    blueFull = repeatPlane(codedBlue.decoded, w / 2, h / 2);
    redFull = repeatPlane(codedRed.decoded, w / 2, h / 2);
  } else {
    codedBlue = codePlane(blue, w, h, quality, CHROMA_TABLE);
    codedRed = codePlane(red, w, h, quality, CHROMA_TABLE);
    blueFull = codedBlue.decoded;
    redFull = codedRed.decoded;
  }
  const outR = new Array(w * h).fill(0);
  const outG = new Array(w * h).fill(0);
  const outB = new Array(w * h).fill(0);
  let squares = 0;
  for (let k = 0; k < w * h; k++) {
    const c = yccToRgb(codedY.decoded[k], blueFull[k], redFull[k]);
    outR[k] = Math.min(255, Math.max(0, c.r));
    outG[k] = Math.min(255, Math.max(0, c.g));
    outB[k] = Math.min(255, Math.max(0, c.b));
    squares += (outR[k] - r[k]) * (outR[k] - r[k]) + (outG[k] - g[k]) * (outG[k] - g[k]) + (outB[k] - b[k]) * (outB[k] - b[k]);
  }
  const bits = codedY.bits + codedBlue.bits + codedRed.bits;
  const bitsPerPixel = bits / (w * h);
  const psnr = 10 * Math.log(255 * 255 / Math.max(squares / (3 * w * h), 1e-10)) / Math.LN10;
  return { r: outR, g: outG, b: outB, bits, bitsPerPixel, ratio: 24 / bitsPerPixel, psnr };
}
// #endregion

// #region Image pyramids
// The Gaussian pyramid blurs and drops every other row and column, level after level: G(k + 1) = reduce(G(k)). The Laplacian
// pyramid keeps what each coarser level lost: L(k) = G(k) - expand(G(k + 1)), and the coarsest Gaussian level. Working back up,
// G(k) = L(k) + expand(G(k + 1)) rebuilds the image exactly, whatever reduce and expand are, since L(k) is defined as the
// difference. Burt and Adelson (1983). Reduce methods: drop, average (2 by 2), blur (3 by 3 binomial, then drop). Expand methods:
// repeat, bilinear.
export function reduceImage(image, w, h, method) {
  const w2 = w / 2;
  const h2 = h / 2;
  let source = image;
  if (method === 'blur') source = convolve(image, w, h, makeKernel('gauss3').values, 3, 'clamp').image;
  const result = new Array(w2 * h2).fill(0);
  for (let y = 0; y < h2; y++) {
    for (let x = 0; x < w2; x++) {
      if (method === 'average') {
        result[y * w2 + x] = (image[2 * y * w + 2 * x] + image[2 * y * w + 2 * x + 1] + image[(2 * y + 1) * w + 2 * x] + image[(2 * y + 1) * w + 2 * x + 1]) / 4;
      } else {
        result[y * w2 + x] = source[2 * y * w + 2 * x];
      }
    }
  }
  return { image: result, w: w2, h: h2 };
}

export function expandImage(image, w, h, method) {
  const w2 = 2 * w;
  const h2 = 2 * h;
  const result = new Array(w2 * h2).fill(0);
  for (let y = 0; y < h2; y++) {
    for (let x = 0; x < w2; x++) {
      if (method === 'repeat') {
        result[y * w2 + x] = image[Math.floor(y / 2) * w + Math.floor(x / 2)];
      } else {
        const fx = Math.min(w - 1, x / 2);
        const fy = Math.min(h - 1, y / 2);
        const x0 = Math.floor(fx);
        const y0 = Math.floor(fy);
        const x1 = Math.min(w - 1, x0 + 1);
        const y1 = Math.min(h - 1, y0 + 1);
        const tx = fx - x0;
        const ty = fy - y0;
        result[y * w2 + x] = (1 - ty) * ((1 - tx) * image[y0 * w + x0] + tx * image[y0 * w + x1])
          + ty * ((1 - tx) * image[y1 * w + x0] + tx * image[y1 * w + x1]);
      }
    }
  }
  return { image: result, w: w2, h: h2 };
}

export function pyramidPixels(n, levels) {
  let total = 0;
  for (let k = 0; k < levels; k++) total += (n / Math.pow(2, k)) * (n / Math.pow(2, k));
  return total;
}

export function gaussianPyramid(image, n, levels, method) {
  const images = [image];
  let size = n;
  for (let k = 1; k < levels; k++) {
    images.push(reduceImage(images[k - 1], size, size, method).image);
    size = size / 2;
  }
  return { images, pixels: pyramidPixels(n, levels) };
}

export function laplacianPyramid(image, n, levels, reduceMethod, expandMethod) {
  const gaussian = gaussianPyramid(image, n, levels, reduceMethod).images;
  const bands = [];
  let size = n;
  for (let k = 0; k < levels - 1; k++) {
    const up = expandImage(gaussian[k + 1], size / 2, size / 2, expandMethod).image;
    const band = new Array(size * size).fill(0);
    for (let p = 0; p < size * size; p++) band[p] = gaussian[k][p] - up[p];
    bands.push(band);
    size = size / 2;
  }
  const top = gaussian[levels - 1];
  return { gaussian, bands, top };
}

export function collapsePyramid(bands, top, n, expandMethod) {
  let size = n / Math.pow(2, bands.length);
  let image = top;
  const steps = [];
  for (let k = bands.length - 1; k >= 0; k--) {
    const up = expandImage(image, size, size, expandMethod).image;
    size = size * 2;
    image = new Array(size * size).fill(0);
    for (let p = 0; p < size * size; p++) image[p] = bands[k][p] + up[p];
    steps.push(image);
  }
  return { image, steps };
}
// #endregion

// #region Histogram
// Count pixels by value: nothing about content, a great deal about exposure. The bin of a value v in [0, 1] is floor(v bins),
// the last bin closed. The cumulative distribution C at a bin is the fraction of pixels in that bin or below.
export function histogram(image, bins) {
  const counts = new Array(bins).fill(0);
  let sum = 0;
  for (let k = 0; k < image.length; k++) {
    counts[Math.min(bins - 1, Math.floor(image[k] * bins))]++;
    sum += image[k];
  }
  const fractions = new Array(bins).fill(0);
  const cumulative = new Array(bins).fill(0);
  let running = 0;
  for (let b = 0; b < bins; b++) {
    fractions[b] = counts[b] / image.length;
    running += counts[b];
    cumulative[b] = running / image.length;
  }
  return { counts, fractions, cumulative, mean: sum / image.length };
}
// #endregion

// #region Equalization
// Map each value v to C(v), the fraction of pixels at or below v. The map is monotone, so brighter stays brighter, and it makes
// the histogram as flat as the data allow. It maps values, not pixels: pixels that share a value share a result.
export function equalize(image, bins) {
  const before = histogram(image, bins);
  const mapped = new Array(image.length).fill(0);
  let sum = 0;
  for (let k = 0; k < image.length; k++) {
    mapped[k] = before.cumulative[Math.min(bins - 1, Math.floor(image[k] * bins))];
    sum += mapped[k];
  }
  return { mapped, cumulative: before.cumulative, meanBefore: before.mean, meanAfter: sum / image.length };
}
// #endregion

// #region Stretch and gamma
// Two simpler tone curves. A linear stretch sends [low, high] to [0, 1] and clips what lies outside; a power curve v^gamma
// bends every value without clipping (gamma below 1 lifts the shadows, above 1 deepens them). Both are monotone.
export function stretchValue(v, low, high) {
  return Math.min(1, Math.max(0, (v - low) / (high - low)));
}

export function gammaValue(v, gamma) {
  return Math.pow(Math.min(1, Math.max(0, v)), gamma);
}
// #endregion

// #region Linear light
// A stored pixel is an sRGB code, not light. decode gives the light a code emits; encode is its inverse. To blend or blur,
// decode first, operate, encode for display. Averaging codes instead of light darkens every edge between bright and dark.
export function srgbDecode(code) {
  return code <= 0.04045 ? code / 12.92 : Math.pow((code + 0.055) / 1.055, 2.4);
}

export function srgbEncode(light) {
  return light <= 0.0031308 ? 12.92 * light : 1.055 * Math.pow(light, 1 / 2.4) - 0.055;
}

export function blendCodes(a, b, t) {
  const codeMix = (1 - t) * a + t * b;
  const lightOfCodeMix = srgbDecode(codeMix);
  const lightMix = (1 - t) * srgbDecode(a) + t * srgbDecode(b);
  const codeOfLightMix = srgbEncode(lightMix);
  return { codeMix, lightOfCodeMix, lightMix, codeOfLightMix };
}

export function convolveInLight(image, w, h, kernel, size, border) {
  const light = new Array(w * h).fill(0);
  for (let k = 0; k < w * h; k++) light[k] = srgbDecode(image[k]);
  const blurred = convolve(light, w, h, kernel, size, border).image;
  const result = new Array(w * h).fill(0);
  for (let k = 0; k < w * h; k++) result[k] = srgbEncode(Math.min(1, Math.max(0, blurred[k])));
  return { light, image: result };
}
// #endregion

// #region Comparing two images
// Mean squared error, PSNR = 10 log10(peak squared / MSE), and SSIM (Wang, Bovik, Sheikh and Simoncelli, 2004) on a patch:
// (2 mean_p mean_q + C1)(2 cov + C2) / ((mean_p^2 + mean_q^2 + C1)(var_p + var_q + C2)), with C1 = (0.01)^2, C2 = (0.03)^2 for
// values in [0, 1] and population variances.
export function meanSquaredError(a, b) {
  let total = 0;
  for (let k = 0; k < a.length; k++) total += (a[k] - b[k]) * (a[k] - b[k]);
  return total / a.length;
}

export function psnrOf(a, b, peak) {
  const mse = meanSquaredError(a, b);
  return Math.min(200, 10 * Math.log(peak * peak / Math.max(mse, 1e-20)) / Math.LN10);
}

export function ssimPatches(p, q, c1, c2) {
  const n = p.length;
  let meanP = 0;
  let meanQ = 0;
  for (let k = 0; k < n; k++) { meanP += p[k] / n; meanQ += q[k] / n; }
  let varianceP = 0;
  let varianceQ = 0;
  let covariance = 0;
  for (let k = 0; k < n; k++) {
    varianceP += (p[k] - meanP) * (p[k] - meanP) / n;
    varianceQ += (q[k] - meanQ) * (q[k] - meanQ) / n;
    covariance += (p[k] - meanP) * (q[k] - meanQ) / n;
  }
  const luminance = (2 * meanP * meanQ + c1) / (meanP * meanP + meanQ * meanQ + c1);
  const contrastStructure = (2 * covariance + c2) / (varianceP + varianceQ + c2);
  const ssim = luminance * contrastStructure;
  return { meanP, meanQ, varianceP, varianceQ, covariance, luminance, contrastStructure, ssim };
}

// #endregion

// #region Distortions and SSIM of an image
// SSIM of an image is the mean of SSIM over non-overlapping windows. A distortion is one of: noise (Gaussian, standard deviation
// amount), offset (every pixel plus amount), sparse (every hundredth pixel plus 0.5), shift (amount columns to the right, black
// fills the left), blur (amount passes of the 3 by 3 Gaussian).
export function ssimImage(a, b, w, h, window) {
  let total = 0;
  let count = 0;
  for (let by = 0; by + window <= h; by += window) {
    for (let bx = 0; bx + window <= w; bx += window) {
      const p = [];
      const q = [];
      for (let y = 0; y < window; y++) {
        for (let x = 0; x < window; x++) { p.push(a[(by + y) * w + bx + x]); q.push(b[(by + y) * w + bx + x]); }
      }
      total += ssimPatches(p, q, 0.0001, 0.0009).ssim;
      count++;
    }
  }
  return { ssim: total / count, windows: count };
}

export function distort(image, w, h, kind, amount) {
  const result = image.slice();
  if (kind === 'noise') {
    const noise = makeGaussianNoise(w * h, 20261105, amount);
    for (let k = 0; k < w * h; k++) result[k] = Math.min(1, Math.max(0, image[k] + noise[k]));
  }
  if (kind === 'offset') {
    for (let k = 0; k < w * h; k++) result[k] = image[k] + amount;
  }
  if (kind === 'sparse') {
    for (let k = 0; k < w * h; k += 100) result[k] = image[k] + 0.5;
  }
  if (kind === 'shift') {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) result[y * w + x] = x >= amount ? image[y * w + x - amount] : 0;
    }
  }
  if (kind === 'blur') {
    let blurred = image;
    for (let pass = 0; pass < amount; pass++) blurred = convolve(blurred, w, h, makeKernel('gauss3').values, 3, 'clamp').image;
    for (let k = 0; k < w * h; k++) result[k] = blurred[k];
  }
  return result;
}
// #endregion
