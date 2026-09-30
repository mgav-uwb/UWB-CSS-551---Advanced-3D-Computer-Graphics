<!--
  CSS 551 · TOPIC DECK: Sampling and antialiasing (~34 min, 21 slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/antialiasing.md"> among others; no lecture
  logistics, no "Part N" numbering.

  TEACHES: sampling and reconstruction, the sampling theorem, three filters
  measured (RMS 0.308, 0.182, 0.090); the alias frequency |f − k fs| (4.5 at 6 →
  1.5); the zone plate (Nyquist radius 60 px); prefilter or supersample; coverage
  along one edge at 1, 4 and 16 samples; SSAA against MSAA (8.3 M against 2.07 M
  shades at 1080p); stratified sampling (RMS 0.127 → 0.054); aliasing in time
  (the wagon wheel, TAA's ghost); the code-space blending pitfall.
  NEEDS:   the rasterization topic (pixel centers, coverage, the demo).
  DEMOS:   data-demo="raster" data-controls="aa,angle" (under the page's crop).
  FIGURES: ../../textbook/figures/aa-*.svg, aa-zoneplate.png
           (tools/gen-textbook-figures-systems.mjs).
  NUMBERS: textbook/figures/numbers-systems.json (aa.*), numbers-pipeline.json
           (ras.coverage); the 1080p cost line from tools/gen-lecture-figures-c.mjs.

  reveal.js: FLAT; notes follow "Note:"; plain unicode math; never two "_" on
  one markdown line outside a code fence. Paths relative to the lecture page.
-->

### Sampling and antialiasing

<small>(~34 min)</small>


---

## Sampling and reconstruction

<img src="../../textbook/figures/aa-reconstruction.svg" class="media-shot" style="max-height: 230px;" alt="one band-limited signal sampled ten times per unit and reconstructed three ways: box, tent and Lanczos-3, with their errors">

**Sampling theorem** (Nyquist, Shannon): a signal with no frequency above B is **exactly** determined by samples at rate fs > 2B. The **Nyquist frequency** fs/2 is the most the samples can hold.

```text
   f(x) = sin(2π·1.5x) + ½ sin(2π·4x)      highest frequency 4,  fs = 10,  Nyquist 5
   reconstruct with a box (hold each sample)   RMS error 0.308      (the signal's own RMS: 0.791)
                    a tent (linear)             RMS error 0.182
                    Lanczos-3 (windowed sinc)   RMS error 0.090
```

Same samples, three filters: the **filter** decides how much of the signal comes back. A display is a box, and cannot be changed.


---

## Aliasing: a wrong low frequency

<img src="../../textbook/figures/aa-alias.svg" class="media-shot" style="max-height: 210px;" alt="a 4.5 Hz sine sampled six times per unit; the samples fit a 1.5 Hz sine exactly">

Above Nyquist, a frequency f gives **the same samples** as `|f − k·fs|` for the k that lands in [0, fs/2]:

```text
   f = 4.5,  fs = 6,  Nyquist 3:     |4.5 − 6| = 1.5
   a pattern of 0.8 cycles per pixel, one sample per pixel:   |0.8 − 1| = 0.2   (a 5-pixel stripe that is not there)
```

The high frequency is not lost; it is **replaced** by a low one, and reconstruction draws the low one. An edge (a step, all frequencies), a fine texture, a thin highlight: each is content above Nyquist.


---

## The Fourier view: sampling makes copies

<img src="../../textbook/figures/aa-spectra.svg" class="media-shot" style="max-height: 220px;" alt="a signal's spectrum and its copies at multiples of the sampling rate, overlapping when the signal extends past Nyquist; below, the frequency responses of box, tent and Gaussian filters">

Sampling at rate fs **copies the spectrum** to every multiple of fs. Where copies overlap, their frequencies are indistinguishable: that overlap **is** aliasing. A filter's job is to pass what is below Nyquist and stop the rest. How well three pixel filters do (sampling rate 1 per pixel):

| cycles per pixel | box | tent | Gaussian, σ ½ pixel |
| ---------------- | --- | ---- | ------------------- |
| 0.5 (Nyquist) | 0.637 | 0.405 | 0.291 |
| 1.0 | 0 | 0 | 0.007 |
| 1.5 (must be 0) | **0.212** | 0.045 | about 0 |


---

## The zone plate

<img src="../../textbook/figures/aa-zoneplate.png" class="media-shot" style="max-height: 300px;" alt="three renderings of a zone plate: one sample per pixel with false rings in the outer region, 16 and 256 samples per pixel with the outer region blending to gray">

`½ + ½ cos(k r²)`: frequency grows with radius and passes Nyquist at **r = 60 px**. Left, 1 sample per pixel: beyond 60 px the rings are **aliases**, curving the wrong way. Middle and right, 16 and 256 samples averaged: the region finer than a pixel becomes **gray**, which is the correct picture of it.


---

## Two remedies

Content above Nyquist must be removed **before** sampling; after sampling it is too late.

- **prefilter** analytically, when the content's form allows: the **mipmap** (texture already filtered at every scale), exact edge coverage, a line drawn as a filtered ridge; exact and cheap, one kind of content each
- **supersample** when it does not: evaluate several positions per pixel and average; works on anything (shading, shadows), costs in proportion to the samples, and reduces aliasing without eliminating it, because averaging is a box filter

Real pipelines use both: mipmaps for textures, multisampled coverage for edges, temporal supersampling for what remains.


---

## Choosing a filter

<img src="../../textbook/figures/aa-filters.svg" class="media-shot" style="max-height: 200px;" alt="four reconstruction filters over six pixels: box, tent, Gaussian with sigma one half, and Lanczos-3, the last dipping below zero">

- **box**: averages the samples inside the pixel; cheap, leaks aliases
- **tent**, **Gaussian**: weigh by distance, reach into neighbors; less leakage, softer
- **Lanczos**: **negative lobes** restore sharpness, and ring near high-contrast edges (Lanczos-3 dips to −0.147)

Film renderers use wide Gaussian or Mitchell filters; real-time renderers mostly box-filter one pixel's samples.


---


## Mitchell and Netravali (1988): two knobs

<img src="../../textbook/figures/aa-mitchell.svg" class="media-shot" style="max-height: 190px;" alt="the Mitchell-Netravali family of cubic filters for several (B, C) pairs, from the blurry B-spline to the sharp Catmull-Rom">

A family of cubics with two parameters, B (blur) and C (ringing):

| filter (B, C) | at 0 | at 0.5 | at 1 | at 1.5 |
| ------------- | ---- | ------ | ---- | ------ |
| cubic B-spline (1, 0) | 0.667 | 0.479 | 0.167 | 0.021 |
| **Mitchell (⅓, ⅓)** | 0.889 | 0.535 | 0.056 | −0.035 |
| Catmull–Rom (0, ½) | 1 | 0.563 | 0 | −0.063 |

```text
   Mitchell at x = 0.5:  ((12 − 9B − 6C)·0.125 + (−18 + 12B + 6C)·0.25 + (6 − 2B)) / 6
                       = (0.875 − 3 + 5.333) / 6 = 0.535
```


---

## Coverage along one edge

<img src="../../textbook/figures/aa-msaa.svg" class="media-shot" style="max-height: 150px;" alt="the edge y = 0.3x + 0.2 crossing six pixels, with the four-sample rotated-grid pattern and a sixteen-sample pattern">

| pixel | exact | 1 sample | 4 samples | 16 samples |
| ----- | ----- | -------- | --------- | ---------- |
| (0, 0) | 0.650 | 1 | 0.50 | 0.625 |
| (1, 0) | 0.350 | 0 | 0.50 | 0.375 |
| (2, 0) | 0.067 | 0 | 0 | 0.063 |
| (3, 1) | 0.750 | 1 | 0.75 | 0.750 |
| (4, 1) | 0.450 | 0 | 0.50 | 0.438 |

n samples give **n + 1 levels**. Four on a **rotated grid** (no two share a row or column) give a near-horizontal edge five levels; a 2×2 square gives it three.


---

## SSAA and MSAA: where the cost goes

- **SSAA** (supersampling): run the whole pipeline, **shading included**, at n samples per pixel
- **MSAA** (multisampling): test **coverage and depth** at n samples, run the fragment shader **once per pixel per triangle**, write that color to every covered sample, average at the resolve

```text
   1920 × 1080, 4 samples, one layer:
      SSAA   8,294,400 fragment-shader runs     8,294,400 samples stored
      MSAA   2,073,600 fragment-shader runs     8,294,400 samples stored
```

MSAA gives edges 4-sample quality at the shading cost of none. What it does **not** touch: aliasing **inside** a triangle (a texture, a thin highlight), which is what mipmaps and shader-side filtering are for.


---

## Where the four samples sit

The 4× pattern of the coverage table, in pixel coordinates:

```text
   (0.375, 0.125)   (0.875, 0.375)   (0.125, 0.625)   (0.625, 0.875)
```

- no two share a **row** or a **column**: a near-horizontal or near-vertical edge sees **four** distinct thresholds, five coverage levels
- a 2×2 square grid puts two samples on each row: the same edge gets only **three** levels
- n samples give at most **n + 1** levels: 2, 5, 9, 17 for 1, 4, 8, 16


---


## What antialiasing costs

A 1920 × 1080 frame, 4 million fragments at 300 instructions each:

| | fragment runs | instructions | color memory |
| --- | --- | --- | --- |
| no AA | 4,000,000 | 1.2 billion | 7.9 MB |
| SSAA 4× | 16,000,000 | 4.8 billion | 31.6 MB |
| MSAA 4× | 4,000,000 | 1.2 billion | 31.6 MB |

MSAA pays in **memory and bandwidth**, not in shading; SSAA pays in both.


---


## Post-process antialiasing: find the edges in the image

When the pipeline cannot afford samples, **search the finished image** for edges and blend across them:

- **MLAA** (Reshetov, 2009): classify edge shapes (L, Z, U) from color discontinuities; estimate coverage from the shape
- **FXAA** (Lottes, 2009): one cheap full-screen pass along luminance edges
- **SMAA** (Jimenez et al., 2012): MLAA's shapes, sharper, optionally combined with a few real samples

One pass, fixed cost, works with deferred shading. It cannot recover what was never sampled: a wire thinner than a pixel stays broken.


---

## Supersampling, live

<div class="cockpit" data-demo="raster" data-controls="aa,angle"><pre class="viz-fallback">  the same triangle at res = 12; aa = samples per pixel axis
  -- aa off (1 sample per pixel):   coverage 19.4 %   (28 of 144 pixels, all or nothing)
  -- aa = 4 (4 × 4 = 16 samples):   coverage 20.7 %   (fractional pixels along the edges)
     true area 20.7 %; drag aa → the staircase becomes a ramp; drag angle → it no longer crawls</pre></div>


---

## Lines, Wu's way

<img src="../../textbook/figures/aa-wu.png" class="media-shot" style="max-height: 200px;" alt="the line from (1,1) to (6,3) drawn with Wu's method: each column lights two pixels with complementary intensities">

Bresenham picks **one** pixel per column; Wu (1991) lights **two**, weighted by distance:

```text
   (1, 1) to (6, 3), slope 0.4:
   x = 2:  y = 1.4  →  pixel row 1 at 0.6,  row 2 at 0.4
   x = 3:  y = 1.8  →  row 1 at 0.2,  row 2 at 0.8
   x = 4:  y = 2.2  →  row 2 at 0.8,  row 3 at 0.2
   10 pixels touched instead of Bresenham's 6; the total intensity per column stays 1
```


---


## Textures: the derivatives pick the mip level

A 256×256 texture. At one pixel the UV changes by:

```text
   per pixel right:  du = 0.0125,  dv = 0.002      × 256  →  (3.2, 0.512) texels   length 3.241
   per pixel up:     du = 0.001,   dv = 0.009      × 256  →  (0.256, 2.304) texels  length 2.318

   ρ = max(3.241, 2.318) = 3.241 texels per pixel
   λ = log2 ρ = 1.696   →  blend mip levels 1 and 2, weight 0.696 on level 2   (trilinear)
   the footprint is 1.4 times longer than wide: anisotropic filtering takes 2 taps at λ = 1.213
```

The 2×2 quad exists to provide exactly these four numbers.


---


## Shading aliasing: a highlight thinner than a pixel

A sharp specular highlight on a bumpy surface can be **smaller than a pixel**: the lighting itself aliases, even with a perfect texture filter.

```text
   average two unit normals 30° apart:            length 0.966   (the mip level blurred them)
   Toksvig (2005): a normal of length 0.9, shininess 64:
      effective shininess = 0.9·64 / (0.9 + 64·(1 − 0.9)) = 57.6 / 7.3 = 7.9
```

A shorter averaged normal means the normals **disagreed**: widen the lobe, and the sparkle becomes a correct, broader glint.


---

## Where the samples go

<img src="../../textbook/figures/aa-stratified.svg" class="media-shot" style="max-height: 200px;" alt="sixteen random sample positions clumping in a pixel beside sixteen stratified positions, one per cell of a 4 by 4 grid">

A pixel half covered by an edge, 16 samples, 2,000 trials:

```text
   random samples       RMS error 0.127     (binomial prediction √(0.5·0.5/16) = 0.125)
   stratified (jitter)  RMS error 0.054     2.35 times smaller
```

- **regular grid**: aliasing becomes regular patterns (moiré)
- **random**: aliasing becomes noise, which the eye forgives, with variance
- **stratified**, one random sample per cell: the noise, with less variance; for an edge the error falls as N^(−3/4), not N^(−1/2)


---

## Aliasing in time

The frame rate samples **time**, and the theorem applies unchanged:

```text
   a wheel with 12 spokes (30° apart), turning 2 revolutions per second, filmed at 24 fps
   per frame it turns 720° / 24 = 30°: exactly one spoke → it appears to stand still
```

- a film camera **prefilters in time**: the open shutter integrates motion into blur
- **TAA** (temporal antialiasing): jitter the sample position a sub-pixel amount every frame and blend with the previous frames, reprojected; one sample per frame, many over a few frames
- its failure is stale history: at a blend weight of 0.1, a pixel reaches 90 % of a new value after **22 frames**, about a third of a second at 60 Hz: the length of the ghost


---

## Rendering fewer pixels: temporal upscaling

Temporal antialiasing's accumulation, turned into resolution:

```text
   output 3840 × 2160 = 8,294,400 pixels
   render 2560 × 1440 = 3,686,400 pixels     44 % of the output, a different sub-pixel jitter each frame
   accumulate over frames, reprojected by motion vectors → the output resolution
```

- NVIDIA's DLSS (2018, a trained network does the accumulation), AMD's FSR (2021; temporal from version 2, hand-designed rather than trained), Intel's XeSS (2022)
- same failure as TAA: **ghosts** where the history is wrong, and new detail that takes several frames to resolve


---

## Pitfall: antialiasing in the wrong space

Coverage is a fraction of **light**, so it must be blended in linear light, before encoding:

```text
   a white edge on black at 50 % coverage, written as code 128 (sRGB):
      emits 21 % of full light, not 50 %
   a one-pixel white line straddling two pixels at 50 % each:
      carries 42 % of its light instead of 100 %: it looks thinner and darker
```

The fix is an **sRGB framebuffer**: the blend unit decodes to linear, averages, re-encodes.

