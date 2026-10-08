<!--
  CSS 551 · TOPIC DECK · The space of images (~82 min, 53 content slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/image-space.md"> among others; it carries no
  session logistics (no title, Thursday, homework, wrap) and no "Part N" numbering.
  See topics/README.md for the contract.

  TEACHES: an image is a point of ℝ^(3mn); operations as linear algebra; the midpoint of two digits
  leaves the sheet; random points are static; the image as a function and the Riemann-sum distance;
  sampling connects the two views (stripes aliasing, worked); bases (the DCT basis; a digit rebuilt
  from K×K coefficients); the Fourier transform (a 4×4 worked) and the spectrum; convolution (Gaussian
  and Sobel on one pixel); pyramids (cost and exact rebuild; the dropped-vs-averaged downsample);
  histograms and equalization; JPEG (one block at quality 50; the quality table); PSNR and SSIM (four
  comparisons) and their pitfalls; the PSNR exhibit; the thin sheet measured on 2,000 digits; PCA;
  the concept map is not invertible; counting the missing choices; every inverse problem is one.
  DENSIFIED (2026-09-29): counting images (10^120.4); pixels as samples; linear light (0.214,
  0.735); memory and precision; distance concentration and the empty ball; a 1D DCT worked (99.65 %);
  PCA (80/20; digits 10.4/7.4 %); eigenfaces; the convolution theorem; separable filters; border
  handling (0.444 corner); unsharp masking; moiré on the zone plate (60.4 px); prefiltered
  downsampling; resamplers and bicubic overshoot (1.0625); stretch and gamma; shot noise; chroma
  subsampling; lossless vs lossy; PSNR by the numbers; SSIM on two patches (0.934); averaging
  frames; the render's many buffers; inverse problems, the null space (737,280), priors; papers.
  EXPANDED (2026-10-05): four checks (midpoint 9.25, checkerboard spectrum, equalizing two values,
  the 2× null space 49,152); two 3-tap blurs' responses (box −0.333 at π); the median filter; a 1D
  Laplacian pyramid; one JPEG coefficient quantized (−50.9 → −2 → −48); a nearest neighbor measured.
  EDIT 2026-10-08: the four multiple-choice Check slides cut (midpoint distance, checkerboard spectrum,
  equalizing two values, the 2× null space); each result moved into the note of the slide it checked.
  NEEDS:   vectors and dot products; the neural-nets-embeddings topic for "encoder" and "embedding";
           the antialiasing lecture for the sampling slide (named, not required).
           Companion of topics/diffusion-1.md, which picks up "noise is the missing choice".
  DEMOS:   data-demo="diffusion-image" data-controls="t" (demo-full; its PSNR readout is the metric
           of this topic; the forward process itself is explained in the diffusion lecture).
  FIGURES: ../../textbook/figures/img-*.svg|png (computed by tools/gen-textbook-figures.mjs).
  NUMBERS: quoted from textbook/image-space.html (numbers.json keys interp, alias_k*, dctErr,
           distances, digitPcaExplained); the aliasing, PSNR, dimension and pyramid values are
           recomputed by tools/gen-lecture-figures-d1.mjs (lectures/L16-diffusion-1/analysis/numbers-d1.json).

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Demo embeds live on
  demo-full slides (a short ## title + the embed div + its viz-fallback pre).
  Paths are relative to the lecture page (lectures/LNN-slug/index.html).
-->

### The space of images

<small>(~82 min)</small>


---

## An image is a point

An m × n RGB image is a point of ℝ³ᵐⁿ: list its numbers in a fixed order and it is **one point**, or the vector from the origin to it.

```text
   x = (r₁₁, g₁₁, b₁₁, r₁₂, …, b_mn)  ∈  [0, 1]^(3mn)
   128 × 128 RGB  →  49,152 coordinates        512 × 512 RGB  →  786,432
```

<img src="../../textbook/figures/img-as-vector.svg" class="media-shot" style="max-height: 230px;" alt="a 20 by 20 digit, a marked 5 by 5 patch with its pixel values, and the same 25 numbers listed as a vector">

- nothing is lost in the listing and nothing added: the picture and the vector are **the same object**


---

## How many images are there?

```text
   20 × 20 black-and-white images       2⁴⁰⁰    ≈ 10^120.4
   20 × 20 images with 256 gray levels  256⁴⁰⁰  ≈ 10^963.3
   atoms in the observable universe     roughly 10^80          (the usual estimate)
```

- every photograph ever taken, every frame of every film, is a vanishing fraction of the second number
- the space is not the problem; **finding the tiny part of it that looks like something** is


---

## Pixels are samples, not little squares

- a pixel value is a **sample** of a continuous image at a point (Alvy Ray Smith, *A Pixel Is Not A Little Square*, Microsoft technical memo 6, 1995)
- the little square is how one kind of **display** reconstructs the samples; a monitor, a printer and a resampling filter each reconstruct differently
- what the image is **between** samples is decided by a **reconstruction filter**: box (the squares), tent (bilinear), wider kernels (bicubic, Lanczos)
- this is why resizing, rotating and texture filtering are **filtering problems**, and why the antialiasing lecture's rules apply to every one of them


---

## Operations become linear algebra

- **averaging** two images: add the vectors and halve
- a **blur**: a linear operator on the vector
- the **difference** of two frames: a vector whose length measures how much moved
- the **mean squared error** between an image and a noisy copy: ‖x − y‖² / 3mn
- **brightness** ×2: a scalar multiple; **crossfade**: a straight line between two points

The question the rest of the lecture keeps asking: which of these points **look like anything**?


---

## Pitfall: average in linear light

Stored pixel values are **sRGB codes**, not light. The code 0.5 is not half the light:

```text
   decode(0.5) = 0.214          code 0.5 emits 21 % of white's light      (code 128: 0.216)
   mix black and white, half and half, correctly:  light 0.5  →  code encode(0.5) = 0.735
   averaging the codes instead:                    code 0.5   →  light 0.214            too dark
```

- blurring, resizing, antialiasing and blending **in code space** darken every edge between bright and dark
- the rule: **decode to linear, operate, encode for display**; the color chapter derives both curves


---

## Memory and precision

```text
   512 × 512 RGB, 8 bits per channel          786,432 bytes
   the same, 16-bit half floats             1,572,864 bytes
   the same, 32-bit floats                  3,145,728 bytes
   one 4K frame (3840 × 2160), RGBA 8-bit  33,177,600 bytes      ≈ 2 GB per second at 60 fps
```

- 8 bits per channel is enough for **display**; renders and HDR images need **floats**, because light values exceed 1
- networks work in floats in [−1, 1] or [0, 1]: the course's digits are 400 numbers in [−1, 1]


---

## The midpoint of two images

A 3 and an 8 as vectors in [−1, 1]⁴⁰⁰: ‖a − b‖ = **18.5**, 0.925 per pixel. The frames are (1 − t)·a + t·b, t = 0, 1/8, …, 1:

<img src="../../textbook/figures/img-interp-3-8.png" class="media-shot" style="max-height: 120px;" alt="nine frames interpolating linearly from a handwritten 3 to a handwritten 8">

- the midpoint is a **double exposure**, not a digit anyone would write
- its nearest neighbor in the dataset (a 3) is **0.46** per pixel away; a real digit's nearest neighbor is **0.49** away on average
- as close to the data as a real digit is, and still **not** one: the set of meaningful images is **curved**, not a subspace


---

## Random points are static

<img src="../../textbook/figures/img-random-vs-digits.png" class="media-shot" style="max-height: 170px;" alt="top row: ten uniformly random 20 by 20 images, all static; bottom row: ten digits, one per class">

- top: ten points drawn uniformly from [0, 1]⁴⁰⁰; bottom: ten points from the sheet, one per class
- both rows are vectors of exactly the same kind; the cube is full of the top row
- the images that look like anything form a **thin, folded, low-dimensional sheet** inside the cube
- **generation** = landing a new point on the sheet, on purpose


---

## High dimensions: distances concentrate

Two random points of the cube [−1, 1]ᵈ:

```text
   d          mean distance      relative spread of the squared distance
   2          1.16               0.84
   20         3.65               0.26
   400        16.3               0.059
   49,152     181.1              0.0053       (a 128 × 128 RGB image)
```

- in high dimensions **every random pair is about equally far apart**: "nearest" means little among random points
- the digits break this: nearest neighbors at **9.8** where random pairs sit at **16.3**; structure is exactly what random data lacks


---

## High dimensions: the cube is all corners

The fraction of the cube [−1, 1]ᵈ inside the unit ball:

```text
   d = 2       0.785           a disk in a square
   d = 3       0.524
   d = 10      0.0025
   d = 20      2.5 × 10⁻⁸
   d = 400     10^−395.9
```

- almost all of a high-dimensional cube's volume is **far from its center**, out in the corners
- a Gaussian cloud in d dimensions is a thin **shell** at radius about √d, not a solid ball (the diffusion lecture uses this)


---

## The image as a function

A continuous image is a function f : [0, 1]² → [0, 1]³. With finite energy these form a vector space with an inner product:

```text
   ⟨f, g⟩ = ∫∫ f(u,v)·g(u,v) du dv          ‖f‖² = ⟨f, f⟩

   f = mid-gray (½, ½, ½),   g = horizontal ramp (u, u, u)
   ‖f − g‖² = 3 ∫₀¹ (½ − u)² du = 3 · (¼ − ½ + ⅓) = 3 · 1/12 = ¼       ‖f − g‖ = ½
```

- sample both on an m × n grid: the per-pixel mean squared error converges to the same ¼. **Resolution changes the count of numbers, not the geometry**
- why it matters here: antialiasing is filtering a function before sampling it; a texture is a function on [0, 1]²; a NeRF is a network standing in for a function on ℝ³ × S²


---

## A render is many images

A renderer produces, per pixel, more than a color:

| buffer | what each pixel stores | used by |
| ------ | ---------------------- | ------- |
| color | radiance, often in floats | display, after tone mapping |
| depth | distance along the view ray | depth testing, fog, depth of field |
| normals | the surface normal | deferred lighting, denoisers |
| albedo | the surface's base color | denoisers, relighting |
| motion vectors | where the pixel was last frame | temporal antialiasing, upscaling |

- each buffer is a point in its own image space; learned denoisers and upscalers read **several at once**
- a **G-buffer** is exactly this stack, written by a rasterizer before lighting (deferred shading)


---

## Sampling connects the two views

A raster is the function sampled at pixel centers, `x_i = f((i − ½)/m)`. Stripes with k periods, f(u) = ½ + ½cos(2πku), at 8 pixels:

```text
   k = 2   0.854 0.146 0.146 0.854 0.854 0.146 0.146 0.854    two periods: survives
   k = 4   0.5   0.5   0.5   0.5   0.5   0.5   0.5   0.5      uniform gray: the stripes are gone
   k = 8   0     0     0     0     0     0     0     0        uniform black
```

<img src="../../textbook/figures/img-sampling-alias.svg" class="media-shot" style="max-height: 150px;" alt="three stripe patterns with the eight sample points marked on each">

- four periods on eight pixels is the **Nyquist limit**; at or above it the pattern **masquerades** as something else
- sampling throws information away: the k = 4 stripes and flat gray give **the same raster**


---

## Moiré: aliasing in two dimensions

<img src="../../textbook/figures/aa-zoneplate.png" class="media-shot" style="max-height: 230px;" alt="a zone plate of rings getting finer toward the edges, rendered with 1, 16 and 256 samples per pixel; the one-sample panel shows false rings beyond a radius">

- a **zone plate**: rings whose frequency rises with the radius; in the 200-pixel image it passes the Nyquist limit at radius **60.4 px**
- beyond it, one sample per pixel draws **false rings** that are not in the pattern; 16 and 256 samples per pixel average them to gray
- fabrics, brick walls and screen doors photographed or rendered at the wrong scale show the same moiré


---

## Bases: the same image, different coordinates

The raster is the list of coefficients in the **box-function basis**. Other bases hold the same image in other numbers.

<img src="../../textbook/figures/img-dct-basis.png" class="media-shot" style="max-height: 240px;" alt="the 64 basis images of the 8 by 8 discrete cosine transform">

- the 64 basis images of the 8 × 8 **discrete cosine transform** (DCT), the basis JPEG uses; frequency rises across and down
- any 8 × 8 patch is a weighted sum of these 64 pictures, exactly as it is a weighted sum of 64 single-pixel pictures
- choosing a basis is choosing **which numbers come first**


---

## A cosine basis in one dimension, worked

The ramp x = (0, 1, 2, 3, 4, 5, 6, 7) in the orthonormal 8-point DCT:

```text
   coefficients   9.90  −6.44  0  −0.67  0  −0.20  0  −0.05
   energy         Σ xᵢ² = 140 = Σ Xₖ²          (Parseval: an orthonormal basis keeps length)
   the first two coefficients hold 99.65 % of the energy
```

- a smooth signal's energy piles into the **low** coefficients; the odd ones vanish by the ramp's symmetry about its middle
- keep two numbers and rebuild a line that is within a fraction of a unit of the ramp everywhere


---

## A digit in the cosine basis

Transform the 20 × 20 digit (400 coefficients) and rebuild it from only the K × K lowest frequencies:

<img src="../../textbook/figures/img-dct-rebuild.png" class="media-shot" style="max-height: 130px;" alt="a digit 3 rebuilt from 1, 4, 9, 25, 64, 144 and 400 cosine coefficients">

| coefficients kept | 1 | 4 | 9 | 25 | 64 | 144 | 400 |
| ----------------- | - | - | - | -- | -- | --- | --- |
| RMS error per pixel | 0.43 | 0.41 | 0.36 | 0.31 | 0.15 | 0.09 | 0 |

- one coefficient is the mean gray; nine give a blob; **64 of 400** give a 3 anyone can read
- the pixel basis spends its numbers evenly; the cosine basis puts **what matters first**
- a noise schedule does the same thing in time: the coarse structure survives longest


---

## Principal components: the data's own basis

The cosine basis is fixed in advance. **PCA** finds the basis that fits **this** data: the eigenvectors of its covariance, in order of variance.

```text
   four points (2, 0), (0, 1), (−2, 0), (0, −1): mean 0
   covariance  [2  0; 0  0.5]      eigenvectors: the x and y axes
   variance explained: 2 / 2.5 = 80 %,   0.5 / 2.5 = 20 %

   the 2,000 digits in ℝ⁴⁰⁰: first two components 10.4 % and 7.4 %
```

- the first component is the direction of **greatest spread**; each later one the greatest spread perpendicular to the earlier ones
- PCA is a **linear** encoder; the learned encoders of the networks lecture are its nonlinear generalization


---

## Eigenfaces

Turk and Pentland (1991) ran PCA on aligned face photographs:

- each principal component, displayed as an image, is a ghostly face: an **eigenface**
- a new face is described by its coordinates on the top few dozen eigenfaces instead of by its pixels
- recognition becomes **nearest neighbor** among those short coordinate vectors

It worked on aligned, frontal, evenly lit faces and failed under changes of pose and light: a **linear** subspace cannot follow a **curved** sheet. Learned embeddings replaced it.


---

## The Fourier transform

For an m × n image, the coefficient at horizontal frequency u and vertical frequency v:

```text
   X_uv = Σᵢ Σⱼ x_ij · exp(−2πi (ui/m + vj/n))
   invertible, and Σ|x|² = (1/mn) Σ|X|²  (Parseval: the picture's energy is the spectrum's)

   4 × 4 stripes  x_ij = ½ + ½cos(2πi/4):   rows (1, ½, 0, ½)
   |X₀₀| = 8  (the sum of all 16 pixels)
   |X₁₀| = |X₃₀| = 4  (frequency 1, and its mirror at 4 − 1)
   every other coefficient is 0: sixteen numbers became three
```

<img src="../../textbook/figures/img-spectrum.png" class="media-shot" style="max-height: 170px;" alt="a digit and a render with their log-magnitude spectra, zero frequency at the center">

- the digit's 49 coefficients with |u|, |v| ≤ 3 hold **89.6 %** of its energy; the render's spectrum streaks perpendicular to its edges


---

## The convolution theorem

Convolution in space is **multiplication** in frequency:

```text
   F{ k * x } = F{k} · F{x}           each frequency is scaled by the kernel's response there
```

- a **Gaussian** blur's spectrum is a Gaussian: high frequencies fade smoothly, no ringing
- a **box** blur's spectrum is a sinc with **negative lobes**: some frequencies are inverted, which shows as ringing and faint stripes
- for a large kernel, transform, multiply and transform back: cost O(n log n) instead of O(n·k²)
- read backward: **sampling** multiplies by a comb, so the spectrum **repeats**, and overlapping copies are aliasing


---

## Two 3-tap blurs, frequency by frequency

The response of a kernel at frequency ω (radians per pixel) is the factor that frequency is multiplied by:

```text
   binomial [1 2 1]/4    H(ω) = ½ + ½ cos ω          box [1 1 1]/3    H(ω) = (1 + 2 cos ω)/3

   ω = 0       (flat)           1.000                                  1.000
   ω = π/2     (period 4 px)    0.500                                  0.333
   ω = 2π/3    (period 3 px)    0.250                                  0
   ω = π       (period 2 px)    0                                      −0.333
```

- applied to (1, −1, 1, −1, …): the binomial returns **all 0**; the box returns (−0.333, 0.333, …), the stripes **inverted** at a third of their contrast
- the box's negative lobe is the convolution theorem's "inverted frequencies", in one line of numbers


---

## Filters: convolution

Replace each pixel by a weighted sum of its neighborhood: `y_ij = Σ K_ab · x_(i+a, j+b)`. Linear and shift-invariant; **every** linear shift-invariant operation is one.

```text
   Gaussian ≈ (1/16)[1 2 1; 2 4 2; 1 2 1]
   Sobel x = [−1 0 1; −2 0 2; −1 0 1],   Sobel y = its transpose

   pixel (12, 15) of the digit: three rows of (0.99, 0.29, 0), a vertical edge
   Gaussian   (1/16)[(1+2+1)(0.99) + (2+4+2)(0.29) + (1+2+1)(0)] = (3.96 + 2.32)/16 = 0.392
   Sobel x    (−1 −2 −1)(0.99) + 0 + (1 + 2 + 1)(0) = −3.96          Sobel y  −0.004
   magnitude 3.96, direction 180°: the gradient points from paper toward ink
```

<img src="../../textbook/figures/img-filters-render.png" class="media-shot" style="max-height: 150px;" alt="the Cornell render, blurred, and its Sobel edge magnitude">


---

## Separable filters

A 2D Gaussian is a 1D Gaussian along rows, then along columns: `G(u, v) = g(u)·g(v)`.

```text
   kernel size     full 2D (multiply-adds per pixel)     separable (rows, then columns)
   3 × 3           9                                      6
   5 × 5           25                                     10
   15 × 15         225                                    30
```

- the saving grows with the kernel: **k² → 2k**
- the box and the Gaussian are separable; Sobel is too (`[1 2 1]ᵀ · [−1 0 1]`); a rotated or disk-shaped kernel is not
- the GPU version: two passes through a framebuffer, the standard bloom and depth-of-field blur in games


---

## Pitfall: what happens at the border

A 3 × 3 box blur of an image that is **1 everywhere**, with the outside treated as **0** (zero padding):

```text
   interior pixel   9/9 = 1.000
   edge pixel       6/9 = 0.667
   corner pixel     4/9 = 0.444           a dark frame appears around the image
```

- **clamp** (repeat the edge pixel), **mirror** (reflect), or **wrap** (the torus, right for tiling textures) avoid the dark frame
- the same choice is the texture topic's **wrap mode**; convolutional networks usually zero-pad, and their outputs are subtly worse at the borders


---

## Sharpening: the unsharp mask

Add back the detail a blur removes: `y = x + k·(x − blur(x))`.

```text
   a 1D edge            x    = (0,  0,     1,     1)
   blur [1 2 1]/4       b    = (0,  0.25,  0.75,  1)          ends clamped
   k = 1                y    = (0, −0.25,  1.25,  1)          steeper; under- and overshoot
```

- the over- and undershoot are the visible **halo** of oversharpening
- displayed values must be clamped to [0, 1]; the halo remains as a bright and a dark line along the edge


---

## A filter that is not linear: the median

Replace each pixel by the **median** of its neighborhood instead of a weighted sum:

```text
   salt noise, 1D        x = (0.2, 0.2, 1.0, 0.2, 0.2)
   3-tap box, middle three    0.467  0.467  0.467       the spike smeared over three pixels
   3-tap median, middle three 0.2    0.2    0.2         the spike removed

   a step edge           x = (0, 0, 0, 1, 1, 1)
   3-tap box                  0  0.333  0.667  1        the edge blurred
   3-tap median               0  0      1      1        the edge kept
```

- the median removes **salt-and-pepper** noise (isolated wrong pixels) and keeps edges; a blur smears both
- not linear: median(x + y) ≠ median(x) + median(y), so it has **no kernel** and no frequency response


---

## Scale: image pyramids

**Gaussian pyramid**: blur, drop every other row and column, repeat. **Laplacian pyramid**: at each level store what the next coarser level lost, `L_k = G_k − up(G_k+1)`; rebuild exactly by working back up.

<img src="../../textbook/figures/img-pyramid.png" class="media-shot" style="max-height: 190px;" alt="the render's Gaussian pyramid on top and Laplacian pyramid below">

```text
   four levels of 128²:  128² + 64² + 32² + 16² = 21,760 pixels
                         = 1.33 × the image (the mipmap's 4/3)
   rebuild from L₀, L₁, L₂, G₃: maximum error 0: nothing discarded, only rearranged by scale
```

- halving by dropping pixels scores **26.9 dB** against the exact area average; blur-then-drop scores **29.4 dB**


---

## A Laplacian pyramid in one dimension, worked

Four samples, the smallest pyramid: halve by averaging pairs, upsample by repeating.

```text
   G0           = (2, 4, 8, 6)
   G1           = ((2+4)/2, (8+6)/2)       = (3, 7)
   up(G1)       = (3, 3, 7, 7)
   L0 = G0 − up(G1)                         = (−1, 1, 1, −1)       the detail between the two scales

   rebuild:  L0 + up(G1) = (2, 4, 8, 6)    exact
```

- stored: L0 and G1, six numbers for four; the 2D pyramid's overhead is the smaller **4/3**
- the rebuild is exact for **any** choice of blur and upsampler, because L0 is defined as whatever up(G1) misses
- the detail level is small where the signal is smooth: a compressor gives it few bits


---

## Downsampling needs a prefilter

Stripes one pixel wide, alternating 1 and 0, halved by **dropping** every other column:

```text
   keep the even columns:   all 1   (white)
   keep the odd columns:    all 0   (black)      which one depends on a half-pixel shift
   average each pair:       all 0.5 (gray)       correct: the stripes are finer than the new pixels
```

- dropping pixels is sampling **without** a prefilter; averaging (or blurring first) is sampling **with** one
- measured on the render: dropped **26.9 dB**, blurred then dropped **29.4 dB**, against the exact area average


---

## Upsampling: nearest, bilinear, bicubic

Reconstruct a value halfway between samples:

```text
   samples 0 and 1:              nearest 0 or 1        bilinear 0.5
   samples (0, 1, 1, 1), between the two 1s, Catmull-Rom bicubic:
                                 t = 0.5: 1.0625       t = 0.25: 1.070       above both neighbors
```

- **nearest**: blocky; **bilinear**: smooth but soft; **bicubic**: sharper, with **overshoot** next to edges
- none of them adds detail that was not sampled: upsampling can only **interpolate**; making up plausible detail is the job of a learned prior (the inverse-problem slides)


---

## Histograms and equalization

The **histogram** counts pixels by value: nothing about content, a great deal about exposure. The render: **28.6 %** of pixels below 0.25, **65.6 %** below 0.5.

<img src="../../textbook/figures/img-histogram.svg" class="media-shot" style="max-height: 200px;" alt="the render's histogram before and after equalization, with the cumulative distribution">

- **equalization**: map each value v to C(v), the fraction of pixels at or below v; monotone, so brighter stays brighter
- worked, from the render's cumulative distribution: 0.1 ↦ 0.28, 0.3 ↦ 0.29, 0.5 ↦ 0.71, 0.8 ↦ 0.96; the mean rises from 0.404 to 0.555
- the black spike cannot be spread: equalization maps **values**, not pixels


---

## Contrast stretch and gamma

Two simpler tone curves than equalization:

```text
   linear stretch of [0.1, 0.8] to [0, 1]:   y = (v − 0.1) / 0.7
       0.1 ↦ 0      0.45 ↦ 0.5      0.8 ↦ 1
   power curve:  y = v^γ;   γ < 1 lifts the shadows,   γ > 1 deepens them
```

- all three curves are **monotone**: order is kept, only spacing changes
- a stretch **clips** everything outside the chosen range; a power curve never clips but bends every value


---

## Noise in real cameras

A pixel that collects N photons has **shot noise** with standard deviation √N:

```text
   N = 100 photons         SNR = 100 / 10  = 10       20 dB
   N = 10,000 photons      SNR = 10,000 / 100 = 100    40 dB
```

- dark images are noisy because they have **few photons**, not because the sensor is bad
- the path tracer's noise has the same form: few samples, large relative error
- phones fight it by merging a **burst** of frames (Hasinoff et al., SIGGRAPH Asia 2016): the averaging slide ahead


---

## Compression: what JPEG keeps

Cut into 8 × 8 blocks, transform each to the cosine basis, **divide by a quantization table** that grows toward high frequencies, round.

```text
   one block of the render (values 86 to 116), minus 128, transformed:
   DC −193.8;  largest others −50.9 (vertical frequency 5), 17.5, −15.7
   ÷ the quality-50 table (16 at DC, 10 to 24 low, 99 to 121 in the corner), rounded:
   seven nonzero integers of 64;  reconstructed with RMS error 4.4 gray levels, maximum 12
```

| quality | nonzero coefficients per block | PSNR of the whole render |
| ------- | ------------------------------ | ------------------------ |
| 90 | 16.2 | 42.5 dB |
| 50 | 7.7 | 34.3 dB |
| 10 | 3.3 | 28.3 dB |

<img src="../../textbook/figures/img-jpeg.png" class="media-shot" style="max-height: 120px;" alt="the render and its reconstructions at JPEG quality 90, 50 and 10">


---

## One coefficient through the quantizer

The block's coefficient at vertical frequency 5, horizontal 0: **−50.9**. Its quality-50 table entry: **24**.

```text
   quantize      round(−50.9 / 24)  = round(−2.12) = −2        the integer stored
   dequantize    −2 × 24            = −48
   error         −50.9 − (−48)      = −2.9         in this one coefficient

   quality 10    the table × 5: entry 120
   quantize      round(−50.9 / 120) = round(−0.42) = 0          the coefficient is gone
```

- at quality 10 the block loses its horizontal stripe, the 2.5-cycle pattern of the box's edge, which **blurs into the wall**
- quantization error is at most **half a table entry** per coefficient: 12 at quality 50 for this entry, 60 at quality 10


---

## JPEG's color trick: chroma subsampling

Before the cosine transform, JPEG converts RGB to **Y** (brightness) and **Cb, Cr** (color differences), then stores the color at **half resolution** in each direction (4:2:0):

```text
   per 2 × 2 block of pixels:   RGB: 4 × 3 = 12 numbers
                                 4:2:0: 4 Y + 1 Cb + 1 Cr = 6 numbers    half, before any DCT
```

- the eye resolves **brightness** detail far better than **color** detail, so the loss is rarely visible
- it shows on sharp red or blue edges, and on text over color: a **color fringe** one or two pixels wide
- video codecs make the same choice; render targets stored for later processing should not


---

## Lossless and lossy

| format | method | after saving | use for |
| ------ | ------ | ------------ | ------- |
| PNG | prediction plus DEFLATE, exact | identical pixels | screenshots, figures, masks, normal maps |
| JPEG | color subsampling, DCT, quantization | an approximation | photographs for viewing |
| EXR | floating point, lossless or lossy options | HDR values kept | renders, environment maps |

- a JPEG saved again is **quantized again**: errors accumulate across edits
- a network trained on JPEGs learns JPEG's blocking; many training pipelines store images losslessly for that reason


---

## Comparing two images: PSNR and SSIM

```text
   PSNR = 10 log₁₀ (1 / MSE),   MSE = ‖x − y‖² / N        (values in [0, 1])
          20 dB ⇔ RMS error 0.1 per pixel;   40 dB ⇔ 0.01
   SSIM = (2μₓμᵧ + C₁)(2σₓᵧ + C₂) / ((μₓ² + μᵧ² + C₁)(σₓ² + σᵧ² + C₂))     1 = identical
```

| compared with the 3 | PSNR (dB) | SSIM |
| ------------------- | --------- | ---- |
| the same 3, noised at t = 0.3 of the diffusion schedule | 14.1 | 0.880 |
| the same 3, blurred once | 18.8 | 0.958 |
| the same 3, shifted right one pixel | 12.7 | 0.853 |
| a handwritten 8 | 6.7 | 0.366 |

<img src="../../textbook/figures/img-metrics.png" class="media-shot" style="max-height: 110px;" alt="the digit 3 beside its noised, blurred and shifted copies and an 8">


---

## PSNR by the numbers

```text
   PSNR = −20 log₁₀(RMS error)        for values in [0, 1]
   halving the RMS error adds 20 log₁₀ 2 = 6.02 dB

   Gaussian noise σ = 0.1     20.0 dB
   σ = 0.05                   26.0 dB
   σ = 0.01                   40.0 dB
```

- rough reading: below 20 dB clearly damaged; 30 to 40 dB good; above 40 dB hard to tell apart
- dB compares **errors**, and only on the **same content**: 30 dB on a flat sky and 30 dB on foliage look different


---

## SSIM on two small patches, worked

Patches p = (0.2, 0.4, 0.6, 0.8) and q = (0.3, 0.4, 0.6, 0.7), C₁ = 0.01², C₂ = 0.03²:

```text
   means        μp = 0.5,  μq = 0.5                         brightness term = 1
   variances    σp² = 0.05,  σq² = 0.025    (population)
   covariance   σpq = 0.035
   SSIM = (2·0.25 + C₁)(2·0.035 + C₂) / ((0.25 + 0.25 + C₁)(0.05 + 0.025 + C₂)) = 0.934
   MSE = 0.005,  PSNR = 23.0 dB
```

- q is p with its **contrast reduced**; SSIM names what changed (the variance, not the mean), where PSNR only counts


---

## Pitfall: what the metrics reward

- **PSNR rewards blur.** The blurred 3 scores 18.8 dB, better than the noisy one at 14.1: blurring removes energy, noise adds it, and mean squared error counts energy. A model trained to maximize PSNR learns to **hedge toward the average**
- **Both are blind to alignment.** A one-pixel shift costs 12.7 dB, worse than the visibly noisy copy, and drops SSIM to 0.85
- neither can judge whether a generated image is a **good different image**: a reference is required
- learned metrics (LPIPS: distances between a trained network's feature maps; Zhang et al. 2018, arXiv:1801.03924) track human judgment better, at the price of depending on that network


---

## Averaging frames beats noise

Average N independent noisy copies of the same image:

```text
   N        noise divided by √N        PSNR gain
   4        2                          +6.0 dB
   16       4                          +12.0 dB
   64       8                          +18.1 dB
```

- the same **1/√N** as the path tracer's samples and the mini-batch's gradients: one law, three lectures
- averaging needs the copies **aligned**: a shifted average is the blur the metrics reward


---

<!-- .slide: class="demo-full" -->

## PSNR, live: a picture and its noisy copy

<div class="cockpit" data-demo="diffusion-image" data-controls="t"><pre class="viz-fallback">  left: the course's Cornell render, 128×128×3 = 49,152 numbers
  right: the same render mixed with noise, in the proportion set by t
  readout: PSNR against the original, computed as 10·log10(1/MSE)
  t = 0.1: 22.0 dB   t = 0.3: 13.5 dB   t = 0.5: 10.1 dB   t = 0.9: 7.2 dB
  (noisy values are clamped to the displayable range, so it never falls below
  6.8 dB; the mixing rule is the forward process of the diffusion lecture)</pre></div>


---

## The thin sheet, measured

All 1,999,000 pairwise distances between the 2,000 digits (pixels in [−1, 1]):

<img src="../../textbook/figures/img-distances.svg" class="media-shot" style="max-height: 200px;" alt="histogram of all pairwise distances between 2,000 digits, same-class and different-class pairs">

```text
   a digit to its nearest other digit        9.8       (mean over the 2,000)
   a digit to a typical other digit          17 to 20  (same class 17.4, different 20.1)
   a digit to a random point of the cube     ≈ 23      E‖x − r‖² = Σ (x_j² + ⅓) ≈ 400·4/3 = 533
   two random points of the cube             16.3      √(400 · 2/3)
```

- every digit has a neighbor at 10 while the surrounding space sits at 23: a **thin ribbon of digits threading a cube of static**


---

## Measuring a neighbor with the course library

From `css551/`, with the 2,000 digits the demos load:

```js
const nd = await import('./lib/core/diffusion-nd.js');
const data = nd.makeDataset(bytes, labels, 400);        // pixels in [−1, 1]
const a = data.x.subarray(0, 400), b = data.x.subarray(400, 800);
let s = 0; for (let j = 0; j < 400; j++) s += (a[j] - b[j]) ** 2;
const rest = { x: data.x.subarray(400), y: null, n: 1999, d: 400 };
const near = nd.nearestIndex(a, rest);                   // brute force over 1,999
```

```text
   labels 0 1     distance 21.48     per pixel 1.074     farther than a typical pair (20.1)
   nearest other to digit 0: index 610, label 0, 0.400 per pixel = 8.0 in total
```


---

## The sheet has structure

<img src="../../textbook/figures/img-pca-digits.svg" class="media-shot" style="max-height: 300px;" alt="the 2,000 digits projected onto their two principal directions, colored by class">

- the 2,000 vectors of ℝ⁴⁰⁰ on their two directions of greatest variance (**10 %** and **7 %** of the total; a crude shadow)
- 1s, thin and vertical, sit alone at the left; 0s, wide loops, at the right; the axis between them is roughly "how much ink"
- moving along the sheet changes content in ways that **have names**; a learned encoder finds coordinates like these, many more of them, nonlinear


---

## Inverse problems, one table

| operator applied to the true image | what the observation lost |
| ---------------------------------- | ------------------------- |
| blur | the high frequencies the kernel's spectrum zeroes or shrinks |
| downsample 4 × in each direction | 737,280 of 786,432 numbers of a 512 × 512 RGB image |
| JPEG | the rounding of every quantized coefficient |
| masking a region (inpainting) | every pixel under the mask |
| adding noise | nothing is removed, but the signal is uncertain |

- each operator is **many-to-one**; every observation is consistent with a whole set of true images
- choosing one from the set needs knowledge of **what images look like**: a prior


---

## The null space of downsampling

Downsampling by 4 in each direction, by averaging 4 × 4 blocks:

```text
   512 × 512 × 3   =  786,432 numbers in
   128 × 128 × 3   =   49,152 numbers out
   lost                737,280 dimensions: any pattern that averages to 0 over every block
```

- add any of those patterns to an image and its downsampled version **does not change**
- a super-resolution method must choose **one** of the images that downsample to the observation: interpolation picks the smoothest; a learned prior picks one that **looks like a photograph**


---

## A prior picks the plausible one

Every inverse problem becomes an optimization with two terms:

```text
   x̂ = argmin over x of   ‖A x − y‖²   +   λ · R(x)
                          fit the data     prefer likely images
```

- R = **smoothness** (penalize gradients): stable, but every answer is soft
- R = a **learned prior** (the thin sheet of real images): sharp, plausible answers; the diffusion lectures build one
- with noise as the operator, the best answer under squared error is the **posterior mean**, the denoiser of the next lecture


---

## The concept map is not invertible

<img src="../../textbook/figures/img-concept-map.svg" class="media-shot" style="max-height: 200px;" alt="five different photographs mapping to one embedding">

- the image encoder E is **many-to-one** by design: thousands of cat photographs land on one "cat" embedding
- so E has **no inverse function**; the honest inverse of a concept c is a distribution p(x | c) over images
- a decoder that took only the concept would return **one image per caption, forever**
- something must supply the **missing choices**: which cat, which pose, which light


---

## Counting the missing choices

```text
   a CLIP embedding                      512 numbers
   a 512 × 512 RGB image             786,432 numbers
   the caption fixes at most             512 of them         less than a thousandth
   left open by the concept          785,920       which cat, which pose, which light
   a starting noise image            786,432       random numbers: enough for every open choice
```

- the same asymmetry in every inverse problem tonight: **deconvolution** cannot recover what a blur removed; **JPEG decoding** cannot recover rounded coefficients; **upsampling** cannot recover a Laplacian level
- each is many-to-one, with the same honest answer: a **distribution** over the inputs, from which a prior over natural images picks the plausible ones


---

## The papers and the dates

| year | source | what it added |
| ---- | ------ | ------------- |
| 1822 | Fourier, *Théorie analytique de la chaleur* | functions as sums of sinusoids |
| 1901 | Pearson, *Philosophical Magazine* | principal components |
| 1928, 1949 | Nyquist; Shannon, *Proc. IRE* 37 | the sampling limit |
| 1965 | Cooley & Tukey, *Math. Comp.* 19 | the fast Fourier transform |
| 1991 | Turk & Pentland, *J. Cognitive Neuroscience* 3 | eigenfaces |
| 1992 | ITU-T T.81 | the JPEG standard |
| 1995 | Smith, Microsoft technical memo 6 | a pixel is not a little square |
| 2004 | Wang, Bovik, Sheikh & Simoncelli, *IEEE TIP* 13 | SSIM |
| 2018 | Zhang et al., arXiv:1801.03924 | LPIPS |

