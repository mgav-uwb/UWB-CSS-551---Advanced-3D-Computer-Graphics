<!--
  CSS 551 · TOPIC DECK: Learned scenes, further (~98 min, 41 content slides in seven groups), mounted after the
  lecture's wrap, time permitting, or as reading. Cut 2026-11-24 from topics/learned-scenes.md (L19): every
  derivation and worked number, in the topic's order, with the slides' original text and numbers.
  EDIT 2026-11-24 LESS MATH (Marcel: "PCA, eigenvalues, hilbert spaces... way over the math level of the
    class. can the following lectures use less math?"): the core states each method in words and keeps only
    the formulas HW8 uses; the arithmetic, the integral and its derivation, the eigenvalues of the footprint,
    the Jacobian worked and the spherical harmonics worked live here. Nothing graded needs this file: the
    quiz families (tools/quiz-families-c.mjs, topic learned-scenes) and HW8's formulas are on core slides.
  NEEDS: topics/learned-scenes.md.
  NUMBERS: as quoted in the original topic: lectures/L19-learned-scenes/figures/numbers.json key "dense"
    (tools/gen-lecture-figures-d2.mjs) and textbook/figures/numbers.json (volume, volumeMore, thinSurface,
    hierarchical, ellipse, covProj, sh, splatPixel, marching); constants from the public NeRF and 3DGS code.
  ACRONYMS AND GREEK: each acronym is spelled out and each Greek letter named at its first use in this file;
    paper and product names (COLMAP, Instant-NGP, Mip-NeRF, NeuS, arXiv) stay names.
  reveal.js: FLAT; notes follow "Note:" and stay plain text; plain-unicode math in ```text fences; never
    two "_" on one markdown line outside a code fence.
-->

### Supplement: learned scenes, further

<small>(~98 min, time permitting) · reading: <a href="../../textbook/learned-scenes.html">Learned Scenes</a></small>


---

### Poses and capture, further

<small>(~5 min)</small>


---

## Triangulation, worked

Structure from motion's core step in two dimensions: two cameras see one feature; intersect their rays:

```text
   2D: cameras at A = (−1, 0) and B = (1, 0) both see a feature; their rays point
       33.02° and −19.29° from straight ahead
   intersect the two rays:   (0.300, 2.000)                    the true point
   tilt B's ray by 0.5°:      (0.313, 2.020)                   0.024 away
```

- a half-degree matching error moves the point by 0.024 at a baseline of 2: triangulation is only as good as the **angle between the rays**
- every NeRF (neural radiance field) and splat scene starts from these poses; bad poses make blur that no training fixes


---

## A capture, counted

```text
   an orbit with a photo every 5°:   360 / 5 = 72 photos per ring
   three rings (low, level, high):   216 photos
   with a 60° field of view, neighboring photos overlap by 1 − 5/60 = 92 %
```


---

### NeRF's network and encoding, further

<small>(~7 min)</small>


---

## The network, layer by layer

The original NeRF network (`run_nerf_helpers.py`), its inputs after the positional encoding γ (gamma):

```text
   γ(p): 3 + 3·2·10 = 63 numbers          γ(d): 3 + 3·2·4 = 27 numbers

   8 layers of 256 units, ReLU (rectified linear unit); γ(p) concatenated again after the fifth       493,056 weights
   σ (sigma) head: 256 → 1                                                        257
   feature: 256 → 256                                                          65,792
   color: [feature, γ(d)] 283 → 128 → 3                                    36,352 + 387
   total                                                                      595,844
```

- about **600,000 weights for one scene**, evaluated at every sample of every ray: 192 samples per ray means 192 full network passes per pixel
- the skip connection re-feeds the position so that deep layers do not lose it


---

## Positional encoding, worked

One coordinate through the encoding (π, pi, as usual):

```text
   γ(p) = ( sin(πp), cos(πp),  sin(2πp), cos(2πp),  sin(4πp), cos(4πp),  …  up to 2^(L−1) )

   p = 0.3, L = 4:    k=0: 0.809, 0.588    k=1: 0.951, −0.309
                      k=2: −0.588, −0.809  k=3: 0.951, 0.309
```

- one number became eight; two points 0.01 apart now differ a lot in the high-frequency entries (`cos(8π·0.31) = 0.063` against `0.309`)
- it is the **cosine basis** of the space-of-images chapter again: the network combines many frequencies and can place an edge
- NeRF uses L = 10 for position (60 numbers) and L = 4 for direction


---

## How high the frequencies go

```text
   L = 10:   frequencies π, 2π, 4π, …, 2⁹π = 512π
   the highest sine has period 2/512 = 0.0039 of the unit coordinate
```

- a scene normalized into a cube of side 2 can place detail at about 1/500 of its width
- too few frequencies: blur; too many: the network fits **noise** between the training views and flickers in new ones
- the view direction gets only L = 4: highlights move slowly with the eye


---

### The volume integral, further

<small>(~26 min)</small>


---

## Rendering a field: the volume integral

A pixel is made by **marching a camera ray** `r(s) = o + s·d` through the field and compositing front to back:

```text
   C(r) = ∫ T(s) · σ(r(s)) · c(r(s), d) ds        T(s) = exp( − ∫ σ(r(u)) du )   (the transmittance:
          ─────────────────────────────                     ────────────────      how much of the ray survives to depth s)

   sampled at points s₁ < … < sN, spacing δ (delta):
   αᵢ = 1 − exp(−σᵢ δᵢ)        Tᵢ = ∏ (1 − αⱼ) over j < i        C = Σ Tᵢ αᵢ cᵢ
```

- αᵢ, α (alpha), is the **opacity of the i-th slab**, Tᵢ how much of the ray is **still unblocked** when it gets there, Tᵢαᵢ the slab's **weight** in the pixel
- this is the **alpha compositing** of the texturing lecture, run front to back; the weights sum to `1 − T(end)`, the rest is background
- no depth buffer, no sorting of surfaces: **occlusion is a product of transmittances**; ∏ (capital pi) is a product, Σ (capital sigma) a sum


---

## Where T comes from: absorption

Light crossing a short length `ds` of density σ loses a fraction σ·ds of itself:

```text
   dT = −σ(s) · T · ds                      the change is proportional to what is left
   dT / T = −σ ds   →   ln T(s) = −∫ σ du   →   T(s) = exp( −∫ σ(r(u)) du )
```

- the **Beer–Lambert law** of the light-transport lecture, along one camera ray
- on samples it becomes a sum in the exponent; for the five-sample ray worked a few slides on:

```text
   T(end) = exp( −0.2 · (0 + 0.5 + 4 + 8 + 1) ) = e^(−2.7) = 0.0672
```


---

## What one slab contributes, exactly

Inside slab i the density is σᵢ and the color cᵢ. The light that the slab emits toward the eye, attenuated inside the slab itself:

```text
   ∫ from 0 to δ of  σᵢ · e^(−σᵢ u) · cᵢ du  =  (1 − e^(−σᵢ δ)) · cᵢ  =  αᵢ cᵢ
   σ = 4, δ = 0.2:   numerical integral 0.5507,   1 − e^(−0.8) = 0.5507

   each weight:   Tᵢ αᵢ = Tᵢ − Tᵢ(1 − αᵢ) = Tᵢ − Tᵢ₊₁
   their sum telescopes:   Σ Tᵢ αᵢ = T₁ − T(N+1) = 1 − T(end) = 0.933
```

- the discrete formula is **exact** when the density is constant inside each slab; the error comes only from density that varies within a step
- the weights summing to `1 − T(end)` is a theorem, not a normalization


---

## The camera ray, worked

NeRF's synthetic scenes: 800×800 images, horizontal field of view 0.6911 rad (39.6°):

```text
   focal length   f = 400 / tan(0.6911 / 2) = 1111.11 pixels
   pixel (i, j) = (600, 250):   direction in camera space
       ( (600 − 400)/1111.11,  −(250 − 400)/1111.11,  −1 ) = (0.180, 0.135, −1)
   world ray:   o = the camera's position,  d = R·(0.180, 0.135, −1)    (R from the camera-to-world pose)
```

- this is the viewing lecture's projection **run backwards**, once per pixel: the unprojection of the interaction lecture
- `−(j − 400)`: image rows count **down**, the camera's `y` counts **up**


---

## Stratified samples, worked

The synthetic scenes use near 2, far 6 (`run_nerf.py`). The coarse pass splits `[2, 6]` into 64 bins and draws **one random depth per bin**:

```text
   bin width (6 − 2)/64 = 0.0625
   bin 10, uniform u = 0.37:   s = 2 + (10 + 0.37)·0.0625 = 2.648
```

- fixed depths would sample the same planes every step and miss what lies between (the thin-surface pitfall); jittered depths cover the whole ray **over training**
- the fine pass then adds samples where the coarse weights are large


---

## One ray, five samples, by hand

Spacing δ = 0.2. The network returned these densities and colors:

```text
   i   σᵢ    color            αᵢ = 1 − e^(−0.2σᵢ)     Tᵢ                 wᵢ = Tᵢαᵢ
   1   0     (air)            1 − e^0    = 0          1                  0
   2   0.5   gray  (.5,.5,.5) 1 − e^−0.1 = 0.095      1                  0.095
   3   4     red   (.9,.2,.2) 1 − e^−0.8 = 0.551      1 × 0.905 = 0.905  0.498
   4   8     red   (.9,.2,.2) 1 − e^−1.6 = 0.798      0.905 × 0.449 = 0.407   0.325
   5   1     blue  (.2,.3,.9) 1 − e^−0.2 = 0.181      0.407 × 0.202 = 0.082   0.015

   C = 0.095·gray + 0.498·red + 0.325·red + 0.015·blue = (0.791, 0.217, 0.226),   T(end) = 0.067
```

<img src="../../textbook/figures/ls-volume-render.svg" class="media-shot" style="max-height: 240px;" alt="the transmittance stepping down from 1 to 0.07 along five samples with the per-sample weights as bars peaking at samples 3 and 4, and a red swatch of the resulting pixel color">


---

## The march in code

The chapter's hands-on, run in node:

```js
const sig = [0, 0.5, 4, 8, 1], d = 0.2; let T = 1, w = [];
for (const s of sig) { const a = 1 - Math.exp(-s * d); w.push(T * a); T *= 1 - a; }
console.log('weights', w.map(x => x.toFixed(3)), 'T_end', T.toFixed(3));
```

```text
   σ₄ = 8:    weights 0.000 0.095 0.498 0.324 0.015     T_end 0.067     C = (0.791, 0.217, 0.226)
   σ₄ = 80:   weights 0.000 0.095 0.498 0.407 0.000     T_end 0.000     C = (0.862, 0.229, 0.229)
```

- a denser fourth sample takes **all** the weight that reached it (0.407 = T₄) and leaves the blue sample nothing
- the color loses its blue tint and its background share: a solid red surface


---

## The background, worked

`T(end)` is the part of the ray that reaches the background; the pixel is `C + T(end)·background`:

```text
   the worked ray:  C = (0.791, 0.217, 0.226),   T(end) = 0.0672
   over black:  (0.791, 0.217, 0.226)
   over white:  (0.858, 0.284, 0.293)
```


---

## A depth, worked

The weights `wᵢ = Tᵢαᵢ` are a distribution along the ray (after dividing by their sum), so they give a **depth**:

```text
   weights (0, 0.095, 0.498, 0.324, 0.015)      sum 0.933 = 1 − T(end)
   sample depths sᵢ = 0.2·i:  0.2, 0.4, 0.6, 0.8, 1.0

   expected depth = Σ wᵢ sᵢ / 0.933 = (0.095·0.4 + 0.498·0.6 + 0.324·0.8 + 0.015·1.0) / 0.933 = 0.656
```

- between samples 3 and 4, where the red stuff is: a NeRF renders a **depth map** with no extra work
- that map is the input ControlNet takes, and it is linear in distance already, unlike a depth buffer


---

## A thin surface, worked

A leaf of density 50, 0.02 thick, at `s = 0.61`. Its true opacity is `1 − e^(−50·0.02) = 0.632`.

```text
   δ = 0.2, samples at 0.0, 0.2, 0.4, 0.6, 0.8:   none inside the slab     opacity 0        (invisible)
   δ = 0.2, shifted by 0.02 (…, 0.62, …):        one inside, assumed to fill the whole step
                                                  opacity 1 − e^(−50·0.2) = 1.000          (fully opaque)
   δ = 0.02:                                      opacity 0.632                            (correct)
```


- coarse sampling does not blur a thin surface: it **misses it or overstates it**, and which depends on where the samples fall, so it **flickers** from ray to ray


---

## Coarse to fine, worked

March a **coarse** set, treat its weights as a distribution along the ray, and draw **fine** samples by inverting its cumulative sum:

```text
   normalized weights:  (0, 0.102, 0.534, 0.348, 0.016)     cumulative: (0, 0.102, 0.636, 0.984, 1)

   uniform u:        0.10    0.25    0.50    0.75    0.90
   lands in slab:    2       3       3       4       4
   fine sample s:    0.396   0.455   0.549   0.665   0.752
```

<img src="../../textbook/figures/ls-hierarchical.svg" class="media-shot" style="max-height: 160px;" alt="the cumulative distribution of the coarse weights, steep over the red slabs, with five uniform numbers mapped through it to depths">

- four of five fine samples land in the two red slabs, none in the empty first one; NeRF uses **64 coarse + 128 fine** per ray
- it is the **importance sampling** of the ray-tracing lecture, with the coarse pass supplying the importance


---

### Training, further

<small>(~5 min)</small>


---

## One gradient, by hand

The red channel of the worked ray, differentiated (finite differences on the same five samples):

```text
   ∂C_red / ∂c₃,red  = w₃ = 0.498          more red at sample 3: the pixel gets redder by its weight
   ∂C_red / ∂σ₃      = +0.014              thicker at sample 3: slightly redder (it hides the red sample 4 behind it,
                                                                                 but is itself red)
   ∂C_red / ∂σ₂      = −0.058              thicker gray at sample 2: less red (it hides both red samples)
```

- a density gradient is a **trade**: the sample gains weight, everything behind it loses weight
- training moves density toward where the photo's color is and away from where it is not


---

## Training cost, counted

```text
   a batch of 4,096 rays × (64 coarse + 128 fine) samples  =  786,432 network evaluations per step
   each evaluation: about 600,000 multiply-adds                 ≈ 4.7 × 10¹¹ per step
```

- the method's cost is **evaluations × network size**; both later speedups attack one factor
- Instant-NGP shrinks the network to one small layer and moves the capacity into a lookup table; splatting drops the network and the per-sample march entirely


---

### Faster and sharper, further

<small>(~12 min)</small>


---

## A hash grid, counted

Instant-NGP (instant neural graphics primitives; Müller et al. 2022, arXiv:2201.05989), as configured for NeRF:

```text
   the repository's NeRF config (configs/nerf/base.json):
     levels 8,  features per entry 4,  table size 2¹⁹ = 524,288 per level,  coarsest grid 16³
     network: 64 units, 1 hidden layer
   table parameters:   8 × 4 × 524,288 = 16,777,216   (33.6 megabytes at 16 bits)
```

- the capacity moved **from weights you multiply to entries you look up**: each sample reads a few dozen numbers instead of running 600,000 multiply-adds
- training fell from a day to minutes; the network became a small decoder


---

## Hash collisions, counted

Fine levels have more grid vertices than table entries, so vertices share entries through a **hash**:

```text
   a 64³ grid:   65³ = 274,625 vertices      fits in 524,288 entries: no sharing
   a 128³ grid:  129³ = 2,146,689 vertices   four vertices per entry on average
```

- a collision averages the gradients of every vertex that shares the entry; most of those vertices sit in **empty space**, where the loss is indifferent, so the occupied ones win
- the coarse levels have no collisions, so the tiny network can use them to tell colliding fine vertices apart


---

## Cones: the encoding of a region, worked

Mip-NeRF (Barron et al. 2021, arXiv:2103.13415) encodes a Gaussian region instead of a point; the average of each sine over the region damps it. ω (omega) is the frequency, μ (mu) and σ the region's center and spread:

```text
   E[ sin(ω x) ] = sin(ω μ) · exp(−½ ω² σ²),   for x ~ N(μ, σ²)

   σ = 0.002 (a pixel's footprint at some distance)
   ω = π:  1.000     8π:  0.999     64π:  0.922     256π:  0.274     512π:  0.006
```

- frequencies finer than the footprint are **switched off automatically**: prefiltering, as in the antialiasing lecture, in the encoding
- the same scene now renders without shimmer at every distance


---

## The contraction, worked

Mip-NeRF 360 (Barron et al. 2022, arXiv:2111.12077) **contracts** space so that everything fits in a ball of radius 2:

```text
   contract(x) = x                         if ‖x‖ ≤ 1
               = (2 − 1/‖x‖) · x/‖x‖       otherwise

   ‖x‖:        0.5    1      2      4      10     100     ∞
   contracted: 0.5    1      1.5    1.75   1.9    1.99    2
```

- the near region keeps its detail; the far region is squeezed in proportion to **disparity**, 1/distance, like a depth buffer
- its abstract reports a 57 % lower mean-squared error than Mip-NeRF on unbounded scenes


---

## NeuS's opacity, worked

NeuS (neural implicit surfaces; Wang et al. 2021, arXiv:2106.10689) derives the opacity from the **signed distance** `f` through a steep logistic Φ (capital phi):

```text
   Φ_s(f) = 1 / (1 + e^(−s·f)),   s = 64
   f = −0.05:  0.039        f = 0:  0.500        f = 0.05:  0.961
```

- the surface is exactly the zero set of `f`; marching cubes on `f` gives a clean mesh
- `s` is learned and grows during training: the transition sharpens from fog to a surface


---

### Splats, further

<small>(~34 min)</small>


---

## One splat, in bytes

```text
   position 3  +  scale 3  +  rotation (quaternion) 4  +  opacity 1  +  color (degree-3 harmonics) 48
   = 59 floats = 236 bytes per splat

   the bonsai in the demo (MB: megabytes):   240,000 splats × 236 B = 56.6 MB
   the paper's 734 MB average scene:   734 MB / 236 B ≈ 3.1 million splats
```

- **81 % of the bytes are color** (48 of 59 floats): the view dependence, not the geometry, dominates memory
- compression work attacks exactly that: fewer harmonics, shared palettes, quantized coefficients


---

## A footprint's radii, worked

A 3D Gaussian projected to the screen is a 2D Gaussian with covariance `Σ′ = J W Σ Wᵀ Jᵀ` (`W` the view rotation, `J` the Jacobian of your projection). Its footprint is an **ellipse**:

```text
   Σ′ = [ 0.5  0.3 ]      trace 0.7, det 0.01,  λ² − 0.7λ + 0.01 = 0   (λ, lambda)
        [ 0.3  0.2 ]      λ₁ = 0.685, λ₂ = 0.015  →  radii √λ = 0.83 and 0.12 px,  tilt ½·atan(0.6/0.3) = 31.7°
```

<img src="../../textbook/figures/ls-splat.svg" class="media-shot" style="max-height: 200px;" alt="left: nested 1, 2, 3 sigma ellipses of the worked covariance with its principal axes drawn; right: three colored splats along one pixel row and their front-to-back composite">

- axes = eigenvectors of `Σ′`, radii = square roots of its eigenvalues: a **7-to-1 sliver**; the rasterizer touches only pixels within about three radii, and thin splats are how a Gaussian scene draws an **edge or a leaf**


---

## Where Σ comes from: a scale and a quaternion

Gradient descent on nine covariance entries would not keep Σ symmetric positive definite, so each splat stores a **scale** `s` and a **rotation quaternion** `q`:

```text
   Σ = R S Sᵀ Rᵀ,    S = diag(s),  R = R(q)          (TRS without the T, applied to the unit sphere)

   s = (0.16, 0.04, 0.04), rotated 30° about z:
   R = [ 0.866  −0.5    0 ]      RS columns: (0.1386, 0.08, 0), (−0.02, 0.0346, 0), (0, 0, 0.04)
       [ 0.5     0.866  0 ]
       [ 0       0      1 ]      Σ = RS(RS)ᵀ = [ 0.0196  0.0104  0      ]
                                               [ 0.0104  0.0076  0      ]
                                               [ 0       0       0.0016 ]
```

- eigenvalues `0.16², 0.04², 0.04²`, first eigenvector `(0.866, 0.5, 0)`: the covariance remembers the scale and the rotation exactly
- the optimizer can move either one without ever producing an invalid shape


---

## Projection, worked at two depths

Perspective is not affine, so splatting **linearizes** it at the splat's center `t = (tx, ty, tz)` in view space, focal length `f` pixels:

```text
   screen = (f·tx/tz, f·ty/tz)        J = [ f/tz   0      −f·tx/tz² ]
                                          [ 0      f/tz   −f·ty/tz² ]
   Σ′ = J W Σ Wᵀ Jᵀ   (W = the view rotation)

   t = (0.5, 0.3, 2.0), f = 500:   J = [ 250  0    −62.5 ]      center (125, 75) px
                                       [ 0    250  −37.5 ]
   Σ′ = [ 1231  653 ]    eigenvalues 1608.5, 100.0   →   radii 40.1 and 10.0 px, at 30.0°
        [  653  477 ]
   at depth 4:  radii 20.0 and 5.0 px, a quarter of the pixels
```

<img src="../../textbook/figures/ls-splat-projection.svg" class="media-shot" style="max-height: 150px;" alt="the worked splat's one, two and three sigma ellipses on the screen at depth 2, solid, and at depth 4, dashed, half the size">


---

## The same splat, moved to the side

Move the splat to `tx = 1.5`: only J's third column changes, `−f·tx/tz² = −500·1.5/4 = −187.5`. That column multiplies the splat's **depth** extent `Σzz`:

```text
                             Σzz = 0.0016 (the worked splat)     Σzz = 0.0256 (thicker in depth)
   centered,   tx = 0.5:     radii 40.11, 10.00 px at 30.0°        41.66, 10.00 px at 30.1°
   to the side, tx = 1.5:    radii 40.65, 10.29 px at 29.3°        49.75, 12.68 px at 22.9°

   the depth term in the side splat's Σ′₁₁:  187.5² × Σzz = 56.25 px² (thin),  900 px² (thick)
```

- a splat with depth extent, off to the side of the view, **smears sideways**: its far end projects closer to the center than its near end
- the linearization is exact only at the center `t`; the farther a big splat sits from the view axis, the more its true footprint departs from this ellipse


---

## A floor under every footprint: the 0.3 px² dilation

The rasterizer adds **0.3 px²** to the diagonal of every projected covariance (`cuda_rasterizer/forward.cu`: `cov[0][0] += 0.3f`) and bounds each splat at **3 standard deviations**:

```text
   a tiny splat, Σ′ = diag(0.01, 0.01):   variance 0.31 after dilation   →   radius ⌈3·√0.31⌉ = 2 px
   the worked splat:  largest eigenvalue 1608.8 after dilation            →   radius ⌈3·√1608.8⌉ = 121 px
```

- the dilation is a **low-pass filter**: no splat is thinner than about half a pixel, so no splat can fall between pixel centers and vanish (the thin-surface pitfall, on screen)
- the 3σ bound decides which pixels a splat is even considered for


---

## Which tiles a splat touches

The screen is cut into **16×16-pixel tiles** (`config.h`: `BLOCK_X 16, BLOCK_Y 16`); each tile blends only the splats listed for it.

```text
   1920×1080:   120 × 68 = 8,160 tiles
   the worked splat: center (125, 75), radius 121  →  tiles x 0..15, y 0..12  →  16 × 13 = 208 tile entries
```

- one splat becomes **one entry per tile it overlaps**; a big splat is expensive, a thin one cheap
- a tile's threads then march its list front to back and stop once the transmittance drops below 1/10,000


---

## Sort once: one key per splat and tile

Every (splat, tile) entry gets a 64-bit key, and one GPU **radix sort** orders them all:

```text
   key = [ tile index (upper 32 bits) | depth (lower 32 bits) ]
   sorted by key  →  grouped by tile, and front to back inside each tile
```

- one global sort per frame replaces the per-pixel sorting a correct blend would need
- the price: the order is per **splat center**, not per pixel; two overlapping splats at nearly the same depth can blend in the wrong order in part of the tile


---

## Spherical-harmonic color, worked

A leaf looks different from different sides. Each splat stores its color in the **spherical harmonic** basis, the Fourier basis on the sphere of directions:

```text
   c(d) = Σ k_lm · Y_lm(d)         degree 0: 0.2821          degree 1: 0.4886·(y, z, x)
   the splatting paper: degree 3, 16 functions, 48 coefficients per splat (red, green, blue)

   red (2.5, 0, 0.6, −0.4), green (1.2, 0, 0.1, 0.1), blue (0.8, 0, −0.3, 0.2)
   d = (0.6, 0, 0.8):   basis (0.2821, 0, 0.3909, 0.2932)
     r = 2.5·0.2821 + 0.6·0.3909 − 0.4·0.2932 = 0.823     g = 0.407   b = 0.167     warm orange
   d = (−0.6, 0, 0.8):  r = 1.057 (clamped to 1)          g = 0.348   b = 0.050     redder, brighter
```

- the `x` coefficient of red, `−0.4`, is what makes the two sides differ; degree 0 only is a matte point
- view dependence is **captured, not simulated**: there is no light in the scene


---

## Training a splat scene: the constants

| ingredient | what the paper does |
| ---------- | ------------------- |
| initialization | one Gaussian per point of the structure-from-motion cloud that came with the camera poses |
| loss | `(1 − λ)·L1 + λ·(1 − SSIM)` between render and photo, `λ = 0.2`: L1 the mean absolute error, SSIM the structural similarity |
| densification | every 100 iterations, from 500 to 15,000: a Gaussian with a large screen-space position gradient (above 2×10⁻⁴) is **cloned** if small, **split** in two if large |
| pruning | opacity below a threshold: deleted; every 3,000 iterations all opacities reset near zero, so floaters must re-earn their place |
| schedule | 30,000 iterations; spherical-harmonic degree raised one step at a time |

- the **number** of primitives changes during training: the bonsai ended at about 240,000 from a few tens of thousands


---

## Clone or split: the rule, worked

Every 100 iterations from 500 to 15,000 (reference code), a splat whose average screen-space position gradient exceeds **0.0002** is densified:

```text
   small (largest scale ≤ 1 % of the scene extent):   clone it: a copy, moved along the gradient
   large:   split it into two, positions drawn from the splat's own Gaussian,
            scales divided by 1.6   (the code: / (0.8·N), N = 2)

   s = (0.16, 0.04, 0.04)   →   two splats of s = (0.1, 0.025, 0.025)
```

- a large gradient means the optimizer **wants to move the splat and cannot fit the photos by moving it**: under-reconstruction (clone) or over-reconstruction (split)
- the count grows from the structure-from-motion points to hundreds of thousands


---

## Three splats blended, worked

Along the pixel row of the figure, at `u = 0.45`, front to back:

```text
   splat        falloff at u      αᵢ = opacity·falloff    Tᵢ        wᵢ = Tᵢαᵢ    color
   1 red        e^−0.5  = 0.607   0.8 × 0.607 = 0.485     1         0.485        (.85,.20,.20)
   2 blue       e^−0.255 = 0.775  0.7 × 0.775 = 0.542     0.515     0.279        (.20,.45,.90)
   3 yellow     e^−7.03 = 0.001   0.9 × 0.001 = 0.001     0.236     0.000        (.95,.75,.15)

   C = 0.485·red + 0.279·blue + 0·yellow = (0.469, 0.223, 0.348);   T = 0.235 of the pixel shows the background
```

- `C = Σ Tᵢ αᵢ cᵢ`: the **NeRF march with three samples** instead of hundreds, sorted by depth once per frame
- the yellow splat is invisible here not because it is occluded (24 % of the ray reaches it) but because **its footprint does not extend to this pixel**; one row over it dominates


---

## Zooming out, counted

Zoom out 4× and a 1-pixel splat becomes 0.25 pixel wide; the dilation then dominates:

```text
   variance 0.25² = 0.0625 px²,   + 0.3 dilation = 0.3625 px²      the dilation is 83 % of it
   rendered width √0.3625 / 0.25 = 2.41× what the geometry says:   thin structures look fat and bright
```

- Mip-Splatting (Yu et al. 2023, arXiv:2311.16493): a **3D** smoothing filter tied to the training views' sampling rate, and a 2D filter that behaves like a pixel's box filter, instead of a fixed 0.3
- the dilation fixes aliasing at the training scale and causes it at others


---

## The field of view sets f

The demo's one slider is the field of view. It enters every splat through the focal length in J:

```text
   f = (H/2) / tan(fov/2),   H = 800 rows
   fov 40°:   f = 1099.0 px        fov 60°:   f = 692.8 px        fov 80°:   f = 476.7 px

   every screen radius is proportional to f:   40° → 80° shrinks each ellipse by 476.7 / 1099.0 = 0.434
```

- widening the field of view shrinks every footprint; fewer pixels per splat, more splats per tile
- small splats fall toward the 0.3 px² floor: wide angles are where the dilation and the zoom-out pitfall show


---

### Meshes and metrics, further

<small>(~10 min)</small>


---

## Marching squares: one cell, worked

A density field defines a surface implicitly: the set where σ crosses a threshold. **Marching squares** (2D) and **marching cubes** (3D, Lorensen & Cline 1987) turn it into segments or triangles:

```text
   each cell: compare its corners to the threshold → a 4-bit code (16 cases; cubes: 8 bits, 256)
              a table names the crossed edges; each crossing placed by linear interpolation

   cell (9, 5), threshold 0.5, corners (lower left, counter-clockwise): 0.630, 0.247, 0.180, 0.460
   only the first is above → code 0001 = 1 → the contour cuts the bottom and left edges
   bottom: (0.5 − 0.630)/(0.247 − 0.630) = 0.34 of the way     left: 0.76 of the way up
```


- the mesh inherits the field's faults: floaters become little shells; thin parts vanish exactly as in the thin-surface pitfall


---

## Pitfall: the ambiguous cell

Corners (lower left, lower right, upper right, upper left) `0.7, 0.2, 0.8, 0.3`, threshold 0.5:

```text
   above:  lower left and upper right, the diagonal pair   →   code 0101 = 5
   crossings:  bottom 0.4 from the left     right 0.5 up     top 0.4 from the left     left 0.5 up
   four crossings, two ways to pair them:
      separate the two high corners  (two short segments cutting them off)
      connect them through the middle  (two segments cutting off the low corners)
   the cell's center, the average of the corners:  (0.7 + 0.2 + 0.8 + 0.3) / 4 = 0.5    on the threshold: no answer
```

- both pairings are valid contours; choosing them inconsistently in neighboring cells leaves **cracks** in the surface
- marching cubes has the same ambiguity on cube faces and resolves it with the same center test


---

## Marching cubes: 256 cases

```text
   each cube has 8 corners, each above or below the threshold:   2⁸ = 256 cases
   up to rotation and complement:   15 distinct patterns (Lorensen & Cline 1987)
   each pattern: up to 4 triangles, vertices placed on crossed edges by linear interpolation
```

- the 2D cell from the last slide was one of 16 cases; the 3D table is the same idea
- a 256³ grid has 16.8 million cells; only the few percent that straddle the surface emit triangles


---

## Reading a PSNR gap

```text
   27.69 dB against 27.21 dB (decibels):   a gap of 0.48 dB
   the ratio of mean squared errors is 10^(0.48/10) = 1.117:   11.7 % more squared error
```

- half a decibel is a small difference; the benchmark table's gap in **speed** (0.06 against 134 frames per second) is not

