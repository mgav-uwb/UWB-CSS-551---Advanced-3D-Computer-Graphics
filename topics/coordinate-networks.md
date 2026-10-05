<!--
  CSS 551 · TOPIC DECK · Coordinate networks (~27 min, 20 content slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/coordinate-networks.md"> among others; it carries no
  session logistics (no title, Thursday, homework, wrap) and no "Part N" numbering.
  See topics/README.md for the contract.

  Marcel (2026-10-05): "add a lecture on image learning nets as a way for students to understand the
  function approximation nature. We can discuss SIREN too."

  TEACHES: an image as a function from pixel coordinates to colour; fitting one image with a small
  multilayer perceptron as pure function approximation (inputs, outputs, loss, Adam on mini-batches
  of pixels, what memorizing one signal means, PSNR); spectral bias (Rahaman et al. 2019) measured
  region by region; Fourier feature mapping (Tancik et al. 2020) and positional encoding
  (Mildenhall et al. 2020), each worked on one pixel, and the frequency-scale trade-off measured
  on and between the pixels; SIREN (Sitzmann et al. 2020), its derivative property, its
  initialization worked and what breaks without it, and ω₀; multiresolution hash encoding
  (Müller et al. 2022) with the spatial hash worked on four vertices; the same recipe for shapes and
  radiance fields; the papers.
  NEEDS:   topics/neural-nets-embeddings.md (a network is a function, ReLU, gradient descent, Adam,
           mini-batches, the sinusoidal time code, overfitting). Mounted after it in L14.
  DEMOS:   data-demo="coord-net" data-controls="sigma,omega" (demo-full).
  FIGURES: ../../textbook/figures/nn-coordnet-{fits,sigma,omega}.png, computed by
           lectures/L14-neural-nets-embeddings/analysis/coord-net-figures.mjs.
  NUMBERS: every parameter count and PSNR is from
           lectures/L14-neural-nets-embeddings/analysis/coord-net-numbers.mjs
           (numbers-coord-net.json), which runs lib/core/coord-net.js with the demo's own settings
           (2 hidden layers of 48, Adam, 256 random pixels per step, seed 1): the demo shows the
           same values at the same step. PSNR ↔ MSE conversions and ratios are arithmetic on those.
  CITATIONS (confirmed through the arXiv API 2026-10-05; DOI through Crossref):
           Rahaman et al., arXiv:1806.08734 (ICML 2019); Mildenhall et al., arXiv:2003.08934;
           Tancik et al., arXiv:2006.10739; Sitzmann et al., arXiv:2006.09661;
           Müller et al., arXiv:2201.05989, DOI 10.1145/3528223.3530127 (ACM TOG 41(4), 102).

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Demo embeds live on
  demo-full slides (a short ## title + the embed div + its viz-fallback pre).
  Paths are relative to the lecture page (lectures/LNN-slug/index.html).
-->

### Coordinate networks

<small>(~27 min)</small>


---

## An image is a function

A picture of 64 × 64 pixels is a table of 4,096 colours. Read it as a function instead:

```text
   f : (x, y) ∈ [−1, 1]²  →  (r, g, b) ∈ [0, 1]³

   pixel (i, j) = (10, 20)     x = (10 + 0.5)/64 · 2 − 1 = −0.6719
                               y = (20 + 0.5)/64 · 2 − 1 = −0.3594
   f(−0.6719, −0.3594) = (0.95, 0.35, 0.20)        inside the orange disc
```

- the table stores f at 4,096 points; a **coordinate network** is an MLP (multilayer perceptron) `f_θ` that can be evaluated at **any** (x, y)
- the same idea fits a shape, `(x, y, z) → distance`, or a scene, `(x, y, z, direction) → (density, colour)`


---

## Fitting one image with an MLP

```text
   input        (x, y)                                 2 numbers
   hidden 1     ReLU(W₁ p + b₁)          2 × 48 + 48        144 weights
   hidden 2     ReLU(W₂ h + b₂)          48 × 48 + 48     2,352
   output       W₃ h + b₃ = (r, g, b)    48 × 3 + 3         147
   total                                                 2,643

   loss         L = (1/3B) Σ over B pixels, 3 channels: ( f_θ(xᵢ, yᵢ) − cᵢ )²
   training     Adam, η = 0.005, B = 256 random pixels per step
```

- the **training set** is the 4,096 pixels of **one** image; there is no test image
- one step: 256 pixels × 2,544 multiply-adds forward, about twice that backward


---

## What "memorizing one signal" means

```text
   the image      4,096 pixels × 3 = 12,288 numbers
   the network    2,643 weights               4.6 times fewer numbers

   PSNR = 10 log₁₀( 1 / MSE )     peak signal-to-noise ratio, colours in [0, 1]
   MSE 0.0658    →  11.82 dB
   MSE 0.00757   →  21.21 dB      +10 dB = 10 times less error
```

- a perfect fit would be **compression**: the weights would reproduce 12,288 numbers from 2,643
- the network is overfit **by design**; the only question is how close it gets, and the answer is measured in PSNR
- a trained coordinate network **is** the image: to display it, evaluate it at every pixel centre


---

## A ReLU network on raw coordinates blurs

<img src="../../textbook/figures/nn-coordnet-fits.png" class="media-shot" style="max-height: 160px;" alt="four 64 by 64 panels: the test card, the ReLU fit (blurred), the Fourier-feature fit and the SIREN fit after 2000 steps">
<span class="credit">target · ReLU on raw (x, y) · ReLU + Fourier features, σ = 6 · SIREN, ω₀ = 30; 2000 steps each</span>

| region of the test card (ReLU, 2000 steps) | pixels | PSNR |
| ------------------------------------------ | ------ | ---- |
| smooth backdrop | 1,656 | **23.54 dB** |
| a ring along the disc's edge | 216 | 18.72 dB |
| stripes, period 16 down to 3 pixels | 1,296 | 11.29 dB |
| checkerboard, 4-pixel squares | 928 | **7.56 dB** |

- whole image: 11.82 dB at 2000 steps, 12.10 dB at 4000; learning rate 0.001, 0.005, 0.02: 11.63, 11.82, 11.99 dB


---

## Spectral bias

A network trained by gradient descent fits the **low frequencies** of its target first and the high frequencies late or never (Rahaman et al., ICML 2019, arXiv:1806.08734).

- a ReLU network is **continuous and piecewise linear** in (x, y): its pieces are large and its derivatives piecewise constant; a 4-pixel checkerboard needs a fold every 4 pixels in both directions
- in the neural tangent kernel (NTK) analysis, gradient descent shrinks each frequency component of the error at a rate that falls with frequency (Tancik et al. 2020)
- the same bias is useful elsewhere: it is why networks interpolate smoothly between training examples


---

## Check: which region does the plain network fit best?

The ReLU network on raw (x, y), 2000 steps on the test card. Rank the regions from best to worst fit.

- **A.** checkerboard, stripes, disc edge, backdrop
- **B.** backdrop, disc edge, stripes, checkerboard
- **C.** disc edge, backdrop, checkerboard, stripes
- **D.** all four within 2 dB of each other


---

## Fourier features

Feed the network sines and cosines of the coordinates instead of the coordinates (Tancik et al., NeurIPS 2020, arXiv:2006.10739):

```text
   γ(v) = ( cos 2πBv, sin 2πBv ),    v = (u, v) ∈ [0, 1]²
   B: 16 × 2, entries ~ N(0, σ²), drawn once, fixed

   pixel (10, 20):  v = (0.1641, 0.3203),  σ = 6
          b                    2π b·v      (cos, sin)
   row 1  (−6.6166, −2.0136)   −10.8731    (−0.1222, 0.9925)
   row 2  (−2.6317, −3.6818)   −10.1228    (−0.7661, 0.6427)
   16 rows → 32 inputs;  first layer 32 × 48 + 48;  total 4,083 weights
```

- each row of B is a plane wave across the image, with |b| cycles per image width; B is drawn once and **never trained**
- the network now combines waves that already oscillate at the needed rates


---

## Positional encoding

NeRF (neural radiance fields; Mildenhall et al., ECCV 2020, arXiv:2003.08934) uses fixed, axis-aligned octaves in place of random B:

```text
   γ(p) = ( sin 2ᵏπp, cos 2ᵏπp ),   k = 0 … L−1,   for each coordinate p

   p = x = −0.6719, L = 6
   k        0         1         2         3         4         5
   freq     π         2π        4π        8π        16π       32π
   sin   −0.8577    0.8819   −0.8315    0.9239   −0.7071    1.0000
   cos   −0.5141   −0.4714   −0.5556   −0.3827   −0.7071    0.0000
```

- on 64 pixels across [−1, 1], the 32π pair has a period of **2 pixels**: the finest pattern the grid can hold
- NeRF uses L = 10 for position and L = 4 for direction; the transformer's position code and the diffusion denoiser's time code are the same construction


---

## Fourier features fix the blur

PSNR of the whole image, same picture, same optimizer, same batches:

| step | 0 | 100 | 300 | 1000 | 2000 | 4000 |
| ---- | - | --- | --- | ---- | ---- | ---- |
| ReLU, raw (x, y), 2,643 weights | 7.09 | 11.33 | 11.49 | 11.67 | 11.82 | 12.10 |
| ReLU + Fourier features (σ = 6), 4,083 | 5.89 | 11.58 | 14.57 | 19.24 | **21.21** | **22.27** |
| SIREN (ω₀ = 30), 2,643 | 5.35 | **12.95** | **16.01** | 18.14 | 18.89 | 20.16 |

- with Fourier features the stripes rise from 11.29 to 22.30 dB and the checkerboard from 7.56 to 18.74 dB; the backdrop stays near 23 dB
- 9.4 dB over the plain network at step 2000: the error is **8.7 times** smaller


---

## The frequency scale: a trade-off

<img src="../../textbook/figures/nn-coordnet-sigma.png" class="media-shot" style="max-height: 150px;" alt="Fourier-feature fits at sigma 1, 6 and 48 after 2000 steps: blurred, sharp, speckled">
<span class="credit">Fourier features at σ = 1, 6, 48; 2000 steps each</span>

| σ (cycles per width) | 1 | 3 | 6 | 12 | 24 | 48 |
| -------------------- | - | - | - | -- | -- | -- |
| PSNR on the pixels | 14.79 | 20.04 | **21.21** | 18.72 | 15.55 | 15.11 |
| PSNR between the pixels | 18.06 | **22.58** | 21.03 | 16.34 | 9.12 | 9.02 |

- small σ: only slow waves, the result blurs like the plain network
- large σ: waves faster than the 32-cycle limit of the grid; the fit passes near the pixels and is **noise in between**


---

## Pitfall: choosing the scale by the training error

```text
            on the pixels    between them
   σ = 24   15.55 dB         9.12 dB          6.4 dB worse between
   σ = 3    20.04 dB         22.58 dB         no gap
```

- the score on the training pixels says nothing about the function **between** them, and a coordinate network is evaluated between pixels whenever the image is zoomed, resampled or rendered from a new view
- check a coordinate network off its training grid: shifted samples, a higher resolution render, or held-out pixels
- the same failure in 3D: a radiance field with too-high frequencies shows "floaters" and grain in views between the training cameras


---

## SIREN: sine as the activation

A sinusoidal representation network (SIREN; Sitzmann et al., NeurIPS 2020, arXiv:2006.09661) replaces ReLU with a sine in every hidden layer:

```text
   h₁ = sin( ω₀ (W₁ p + b₁) )     h₂ = sin( ω₀ (W₂ h₁ + b₂) )
   f  = W₃ h₂ + b₃                ω₀ = 30
```

- the input layer is itself a bank of plane waves, now **trained**; deeper layers build sums and products of waves (sin a · sin b is a sum of waves at a ± b)
- the derivative of sin is a shifted sin, so **the derivative of a SIREN is a SIREN**: gradients and Laplacians of the fitted signal are smooth and meaningful
- a ReLU network's second derivative is zero almost everywhere: it cannot be fitted to a gradient or a differential equation
- the paper fits images, audio, video, signed distance functions (SDFs), and solutions of the Poisson, Helmholtz and wave equations


---

## Pitfall: SIREN without its initialization

```text
   first layer    W ~ U(−1/n, 1/n), n = 2:    |W| ≤ 0.5
                  phases ω₀ |W p + b| up to 51 rad (8 periods)
   hidden layer   W ~ U(−√(6/n)/ω₀, √(6/n)/ω₀), n = 48:
                  |W| ≤ 0.0118,   ω₀ |W| ≤ 0.354

                          paper's init    without the 1/ω₀
   mean |ω₀ z|, layer 2   2.35 rad        23.87 rad
   PSNR at step 2000      18.89 dB        13.27 dB
```

- the bound √(6/n) keeps each layer's input to the sine spread over about one period whatever the depth; dividing by ω₀ cancels the factor inside the sine
- without it every hidden sine sees phases spread over many periods: its output is effectively random in the input, and training starts from noise


---

## The SIREN's frequency plays the same role

<img src="../../textbook/figures/nn-coordnet-omega.png" class="media-shot" style="max-height: 150px;" alt="SIREN fits at omega zero 1, 30 and 90 after 2000 steps: a smooth blur, sharp, and speckled">
<span class="credit">SIREN at ω₀ = 1, 30, 90; 2000 steps each</span>

| ω₀ | 1 | 5 | 10 | 30 | 90 |
| -- | - | - | -- | -- | -- |
| PSNR on the pixels | 11.05 | 11.87 | 13.34 | **18.89** | 17.95 |
| PSNR between the pixels | 12.86 | 14.16 | 16.26 | **22.56** | 17.82 |

- ω₀ = 1: the sines stay near their linear part; the network is a smooth function like the plain ReLU one
- ω₀ = 90: speckle between the pixels, the large-σ failure again; the paper's 30 is best here


---

<!-- .slide: class="demo-full" -->

## Exhibit: three networks learn one picture

<div class="cockpit" data-demo="coord-net" data-controls="sigma,omega"><pre class="viz-fallback">  a 64 × 64 test card and three networks fitting it, live, side by side:
  ReLU on raw (x, y), ReLU on Fourier features (slider σ), SIREN (slider ω₀)
  each step: 256 random pixels, mean squared error, one Adam step
  PSNR at step 2000 (pauses there): ReLU 11.82, Fourier (σ = 6) 21.21, SIREN (ω₀ = 30) 18.89 dB
  σ = 1: blurred (14.79);  σ = 48: speckled (15.11);  ω₀ = 1: blurred (11.05)
  picture "blobs" (low frequencies only): ReLU 41.54, Fourier 37.83, SIREN 52.30 dB</pre></div>


---

## Check: the low-frequency picture

The "blobs" picture holds only soft Gaussians over a gradient. After 2000 steps, what does the plain ReLU network on raw (x, y) reach?

- **A.** about 12 dB, as on the test card
- **B.** about 41 dB, close to the other two
- **C.** about 21 dB, the Fourier network's test-card score
- **D.** below 10 dB: ReLU networks cannot fit images


---

## Multiresolution hash encoding

Instant NGP (neural graphics primitives; Müller et al., *ACM TOG* 41(4), 2022, arXiv:2201.05989) **trains** the encoding itself:

```text
   L grids, resolutions N_l = ⌊N_min · bˡ⌋
   N_min = 16, N_max = 2048, L = 16:   b = 1.3819
   level l:  the cell around p;  its 4 corners (8 in 3D) index a table
             of T feature vectors (F = 2 numbers);  interpolate bilinearly
   concatenate L · F = 32 features  →  a small MLP  →  colour

   spatial hash  h(v) = ( v₁ · 1  XOR  v₂ · 2654435761 ) mod T,  T = 2¹⁴
   (37, 12) → 13417    (38, 12) → 13418
   (37, 13) → 11736    (38, 13) → 11739
```

- coarse levels fit in the table one entry per vertex; fine levels have more vertices than T entries and **collide**
- a shared entry receives the gradients of every vertex hashed to it; the other levels and the MLP tell the colliding points apart


---

## What the hash grid changes

```text
   one configuration:  L = 16,  F = 2,  T = 2¹⁹ entries per level
                       (the paper's range: T from 2¹⁴ to 2²⁴)
   table parameters    at most 16 × 2¹⁹ × 2 = 16,777,216
   the MLP             a few thousand

   2D, N_min = 16 → N_max = 2048, dense where (N_l + 1)² ≤ 2¹⁹:
   the first 12 levels (16 … 561) dense;  the last 4 (775 … 2047) hashed
```

- most parameters sit in the **tables**, and each pixel touches only 4 entries per level: training updates a tiny fraction of them per step
- the high frequencies come from the fine grids, not from sines, so the MLP can be very small
- the paper's result: "training of high-quality neural graphics primitives in a matter of seconds, and rendering in tens of milliseconds at a resolution of 1920 × 1080"


---

## One recipe, many signals

| signal | coordinate network | output | fitted to |
| ------ | ------------------ | ------ | --------- |
| image | (x, y) | (r, g, b) | the pixels |
| video | (x, y, t) | (r, g, b) | the frames |
| shape | (x, y, z) | signed distance | surface points, gradient length 1 (SIREN) |
| radiance field | (x, y, z, direction) | (density, r, g, b) | photographs, through volume rendering (NeRF) |

- all four use the same parts: an encoding (Fourier, octaves, sines or hash grids), an MLP, a loss, Adam
- a radiance field is a coordinate network whose loss compares **rendered** pixels with photographs; the learned-scenes lecture renders one


---

## The papers, 2019 to 2022

| Year | Paper | What it added |
| ---- | ----- | ------------- |
| 2019 | Rahaman et al., ICML, arXiv:1806.08734 | spectral bias: networks learn low frequencies first |
| 2020 | Mildenhall et al., ECCV, arXiv:2003.08934 | NeRF, with positional encoding of coordinates |
| 2020 | Tancik et al., NeurIPS, arXiv:2006.10739 | Fourier features; σ as the kernel's bandwidth |
| 2020 | Sitzmann et al., NeurIPS, arXiv:2006.09661 | SIREN: sine activations and their initialization |
| 2022 | Müller et al., *ACM TOG* 41(4), DOI 10.1145/3528223.3530127 | Instant NGP: multiresolution hash encoding |

