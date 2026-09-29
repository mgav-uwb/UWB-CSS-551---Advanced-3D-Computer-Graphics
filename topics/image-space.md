<!--
  CSS 551 · TOPIC DECK · The space of images (~78 min).
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

<small>(~78 min)</small>


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

## Operations become linear algebra

- **averaging** two images: add the vectors and halve
- a **blur**: a linear operator on the vector
- the **difference** of two frames: a vector whose length measures how much moved
- the **mean squared error** between an image and a noisy copy: ‖x − y‖² / 3mn
- **brightness** ×2: a scalar multiple; **crossfade**: a straight line between two points

The question the rest of the lecture keeps asking: which of these points **look like anything**?


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

## Bases: the same image, different coordinates

The raster is the list of coefficients in the **box-function basis**. Other bases hold the same image in other numbers.

<img src="../../textbook/figures/img-dct-basis.png" class="media-shot" style="max-height: 240px;" alt="the 64 basis images of the 8 by 8 discrete cosine transform">

- the 64 basis images of the 8 × 8 **discrete cosine transform** (DCT), the basis JPEG uses; frequency rises across and down
- any 8 × 8 patch is a weighted sum of these 64 pictures, exactly as it is a weighted sum of 64 single-pixel pictures
- choosing a basis is choosing **which numbers come first**


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

## Histograms and equalization

The **histogram** counts pixels by value: nothing about content, a great deal about exposure. The render: **28.6 %** of pixels below 0.25, **65.6 %** below 0.5.

<img src="../../textbook/figures/img-histogram.svg" class="media-shot" style="max-height: 200px;" alt="the render's histogram before and after equalization, with the cumulative distribution">

- **equalization**: map each value v to C(v), the fraction of pixels at or below v; monotone, so brighter stays brighter
- worked, from the render's cumulative distribution: 0.1 ↦ 0.28, 0.3 ↦ 0.29, 0.5 ↦ 0.71, 0.8 ↦ 0.96; the mean rises from 0.404 to 0.555
- the black spike cannot be spread: equalization maps **values**, not pixels


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

## Pitfall: what the metrics reward

- **PSNR rewards blur.** The blurred 3 scores 18.8 dB, better than the noisy one at 14.1: blurring removes energy, noise adds it, and mean squared error counts energy. A model trained to maximize PSNR learns to **hedge toward the average**
- **Both are blind to alignment.** A one-pixel shift costs 12.7 dB, worse than the visibly noisy copy, and drops SSIM to 0.85
- neither can judge whether a generated image is a **good different image**: a reference is required
- learned metrics (LPIPS: distances between a trained network's feature maps; Zhang et al. 2018, arXiv:1801.03924) track human judgment better, at the price of depending on that network


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

## The sheet has structure

<img src="../../textbook/figures/img-pca-digits.svg" class="media-shot" style="max-height: 300px;" alt="the 2,000 digits projected onto their two principal directions, colored by class">

- the 2,000 vectors of ℝ⁴⁰⁰ on their two directions of greatest variance (**10 %** and **7 %** of the total; a crude shadow)
- 1s, thin and vertical, sit alone at the left; 0s, wide loops, at the right; the axis between them is roughly "how much ink"
- moving along the sheet changes content in ways that **have names**; a learned encoder finds coordinates like these, many more of them, nonlinear


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

