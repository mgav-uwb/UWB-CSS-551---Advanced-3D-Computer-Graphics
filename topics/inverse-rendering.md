<!--
  CSS 551 · TOPIC DECK: Inverse and differentiable rendering (~80 min, built 2026-10-05).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/inverse-rendering.md"> among others; it carries no
  logistics (no title, quiz, homework, wrap) and no "Part N" numbering.

  TEACHES: rendering as a function R(θ); the image loss and its gradient; the inverse problem and Hadamard's
           conditions; the albedo-intensity valley (exact), other ambiguities, unknowns counted, Ramamoorthi and
           Hanrahan's lighting limit; analysis by synthesis (Blanz and Vetter, OpenDR) and Adam; the course fit step by
           step; AD forward and reverse on one pixel, their costs, the tape; Lambert and Blinn-Phong derivatives, one
           pixel's gradient worked, the gradient check, shadowed pixels; the pixel integral, Leibniz's boundary term,
           the flat-disk radius (0 vs -0.1635 vs -0.165), the staircase, the silent pitfall, explaining away; edge
           sampling, reparameterization (and warped-area sampling), path-space differentiation, soft rasterizers, the
           soft edge in numbers, the width trade-off, the hard plateau, the four families compared (plus nvdiffrast and
           PyTorch3D); differentiating a path tracer (the 20.1 GB tape), Mitsuba 2 and 3 with Dr.Jit, radiative
           backpropagation and path replay, decorrelated Monte Carlo gradients; recovering materials, lighting,
           geometry (Laplacian preconditioning, SDFs), all at once (nvdiffrec), volumes; NeRF and 3DGS as inverse
           rendering (smooth by construction; radiance, not materials); priors as MAP, the gray-world pick, learned and
           diffusion priors; open problems; a reading list.
  NEEDS:   illumination (Lambert, Blinn-Phong); ray tracing and path tracing; antialiasing (coverage); networks
           (gradient descent, Adam, backpropagation); learned scenes (volume rendering, splats), not re-taught.
  DEMOS:   data-demo="inverse-render" data-controls="steps" (demo-full).
  FIGURES: ../../textbook/figures/inv-{fit.png,loss,silhouette,coverage,ambiguity}.svg and every number from
           ../../textbook/figures/numbers-inverse.json (tools/gen-textbook-figures-inverse.mjs, engine
           lib/core/inverse-render.js).
  PAPERS:  every DOI confirmed on Crossref and every arXiv id on the arXiv API (2026-10-05); listed on the last slide.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence.
  No <small> on math. Paths are relative to the lecture page that mounts this
  topic (lectures/LNN-slug/index.html).
  CUT 2026-10-08: "Why Adam" renamed.
-->

### Inverse and differentiable rendering

<small>(~80 min)</small>


---

## Rendering is a function

```text
   forward:   θ = (shapes, materials, lights, camera)  ──R──▶  image  (3P numbers for P pixels)
   inverse:   a photograph I*  ──?──▶  θ
```

- **inverse rendering**: find θ such that R(θ) matches I*
- **differentiable rendering**: compute ∂R/∂θ, or the gradient of a loss through R
- the rasterizer and the path tracer of this term are both such functions R


---

## The course renderer: eight parameters

| parameter | true (hidden) | start of the fit |
| --- | --- | --- |
| albedo ρ (red, green, blue) | 0.85, 0.35, 0.20 | 0.50, 0.50, 0.50 |
| light azimuth, elevation | 0.70, 0.45 | −0.50, 0.00 |
| sphere radius r | 0.62 | 0.42 |
| sphere center (cx, cy) | 0.08, −0.06 | −0.12, 0.10 |

- one sphere, one directional light, an orthographic camera, 64 × 64 pixels
- the output: 3 · 64² = **12,288 numbers**


---

## One pixel

```text
   P = a · S + (1 − a) · B

   a = coverage: 1 if the pixel center is inside the disk, else 0
   S = ρ · (ka + E · max(0, n·l))          Lambert, ambient ka = 0.08, intensity E = 1
   B = background (0.10, 0.12, 0.16)
   n = (dx, dy, √(r² − d²)) / r            the sphere's normal at distance d from the center
```

- the Lambert term of the illumination lecture on the ray–sphere geometry of the ray-tracing lecture
- a is the part that will cause trouble


---

## The loss and its gradient

```text
   L(θ) = (1 / 3P) · Σk ( Rk(θ) − I*k )²                    mean squared error (MSE)

   ∇L   = (2 / 3P) · Σk ( Rk(θ) − I*k ) · ∇Rk(θ)
```

- each pixel's **error** weights that pixel's **sensitivity** to the parameters
- a pixel that is already right, or that does not depend on θ, contributes nothing
- the update: θ ← θ − η · (a step direction built from ∇L)


---

## The inverse problem in practice

- **material capture**: photographs of a sample in, BRDF (bidirectional reflectance distribution function) parameters out
- **lighting estimation**: a photograph in, an environment map out, to insert virtual objects
- **3D reconstruction**: many photographs in, geometry and textures out
- **relighting**: separate the photograph into geometry, material and light, then change the light


---

## Ill-posed

Hadamard: a problem is **well-posed** when a solution

- exists
- is **unique**
- depends **continuously** on the data

Inverse rendering fails uniqueness routinely and continuity often.


---

## Albedo against intensity: an exact tie

```text
   no ambient (ka = 0):   S = ρ · E · max(0, n·l)

   ρ = (0.8, 0.4, 0.2), E = 1      and      ρ = (0.4, 0.2, 0.1), E = 2
   largest pixel difference between the two images:   0   (exactly)
```

- the image sees only the **product** ρ · E
- with the ambient term ka = 0.08 restored, the two images differ by an MSE of 1.37 × 10⁻⁴, below the noise of most photographs


---

## The valley

<img src="../../textbook/figures/inv-ambiguity.svg" class="media-shot" style="max-height: 420px;" alt="heat map of loss over albedo scale and light intensity; a white valley along a hyperbola, two circles on it, a green dot near (1.07, 0.93)">


---

## More ties

- **shape against shading**: a darker patch is darker paint, or a surface turned away from the light
- **bas-relief**: a flattened shape under a moved light gives the same shaded image
- **mirror against texture**: a reflected environment looks like a painted one
- **lighting frequency**: from a convex Lambertian object, only the low spherical-harmonic frequencies of distant light can be recovered (Ramamoorthi and Hanrahan 2001)


---

## Counting

```text
   one 64 × 64 photograph:                     12,288 numbers
   a per-pixel albedo texture:                 12,288 unknowns
   a per-pixel depth:                           4,096 unknowns
   the light (direction, intensity):                3 unknowns
                                               ─────────────
                                               16,387 unknowns
```

- more unknowns than measurements: information has to come from elsewhere
- more views, known lights, a restricted representation, or a **prior**


---

## Analysis by synthesis

```text
   θ  ──render──▶  R(θ)  ──compare with I*──▶  L(θ)
   ▲                                             │
   └──── θ ← θ − η · (preconditioned ∇L) ◀───────┘     backward pass
```

- explain an observation by **generating** candidates and adjusting them until they match
- Blanz and Vetter 1999: a morphable face model fitted to a photograph with hand-derived gradients
- Loper and Black 2014, OpenDR: a general differentiable rasterizer


---

## Per-parameter steps: Adam

- the parameters have **different units**: albedo in [0, 1], angles in radians, a radius in image units
- one learning rate for all is too large for some and too small for others
- **Adam** divides each parameter's step by its own running gradient magnitude
- the course fit: Adam, step size 0.02, β₁ = 0.9, β₂ = 0.999, box limits (albedo clamped to [0, 1])


---

## The fit, step by step

| step | 0 | 10 | 50 | 100 | 200 | 300 |
| --- | --- | --- | --- | --- | --- | --- |
| loss, hard edge | 0.0304 | 0.0156 | 0.00337 | 0.00157 | 5.4 × 10⁻⁶ | 8.0 × 10⁻¹⁰ |
| loss, soft edge | 0.0297 | 0.0185 | 0.00249 | 3.6 × 10⁻⁶ | 1.1 × 10⁻⁹ | 5.2 × 10⁻¹¹ |

- all eight parameters free, from the gray start
- by step 300 every parameter matches the hidden value to three decimals


---

## Watching it converge

<img src="../../textbook/figures/inv-fit.png" class="media-shot" style="max-height: 230px;" alt="seven small sphere renders: the orange target, the gray start lit from the left, then spheres growing orange and moving until they match">

- left to right: the target, then steps 0, 25, 50, 100, 200, 300 (hard edge)
- color settles first; position and light take longer


---

## Step 25: two explanations for one change

```text
                       albedo               light az, el     radius    center
   step 25:     (0.768, 0.298, 0.139)     (−0.028, 0.034)    0.605    (0.332, 0.023)
   step 100:    (0.821, 0.341, 0.196)     ( 0.354, 0.418)    0.581    (0.157, −0.041)
   true:        (0.85,  0.35,  0.20 )     ( 0.70,  0.45 )    0.62     (0.08, −0.06)
```

- the target is brighter on the right: the light moves right, and **so does the sphere** (to 0.332)
- once the light has swung over, the center comes back


---

<!-- .slide: class="demo-full" -->

## Inverse rendering, live

<div class="cockpit" data-demo="inverse-render" data-controls="steps"><pre class="viz-fallback">  target: a 64 × 64 sphere rendered from hidden parameters
  current: the optimizer's render; Adam on the image loss, live
  readout: step, loss, albedo / light / radius / center, current against true
  edge: hard (silhouette has no radius gradient) or soft (width w)
  flat + hard + radius only: dL/dr = 0, the radius never moves</pre></div>


---

## Three ways to get a gradient

- **symbolic**: differentiate the formula by hand or by algebra system; expressions grow, and a renderer is a program, not a formula
- **finite differences**: (L(θ + h·eᵢ) − L(θ − h·eᵢ)) / 2h, two renders per parameter, with truncation and rounding error
- **automatic differentiation (AD)**: apply the chain rule to the program, operation by operation, exactly


---

## Forward mode

- carry a **tangent** v̇ = ∂v/∂θⱼ alongside every value v, for one chosen input θⱼ
- each operation updates both: for v = a · b, v̇ = ȧ · b + a · ḃ
- one pass gives ∂(every output)/∂θⱼ
- Wengert 1964


---

## Forward mode on one pixel

```text
   L = (ρ · max(0, n·l) − T)²     n = (0.6, 0, 0.8),  l = (sin φ, 0, cos φ),  ρ = 0.5,  φ = 0.3,  T = 0.7

   values:   u = n·l = 0.9416    s = max(0, u) = 0.9416    P = ρs = 0.4708    L = 0.05254

                      u̇         ṡ         Ṗ          L̇
   seed ρ̇ = 1:       0         0       0.9416    −0.4316      = ∂L/∂ρ
   seed φ̇ = 1:    0.3368    0.3368    0.1684    −0.0772      = ∂L/∂φ
```

- two inputs, **two passes**


---

## Reverse mode

- run forward and **record** every operation (the tape)
- then carry an **adjoint** v̄ = ∂L/∂v backward from the output: v̄ᵢ += v̄ₖ · ∂vₖ/∂vᵢ
- one backward pass gives ∂L/∂(every input)
- Linnainmaa 1976; backpropagation (Rumelhart, Hinton and Williams 1986)


---

## Reverse mode on the same pixel

```text
   L̄ = 1
   P̄ = 2(P − T)       = −0.4584
   ρ̄ = P̄ · s          = −0.4316      ← ∂L/∂ρ
   s̄ = P̄ · ρ          = −0.2292
   ū = s̄ · [u > 0]    = −0.2292
   φ̄ = ū · du/dφ      = −0.0772      ← ∂L/∂φ
```

- **one backward pass**, both derivatives, the same numbers as the two forward passes


---

## What each mode costs

```text
   forward mode:   one pass per INPUT          reverse mode:   one pass per OUTPUT, plus the tape

   the course renderer:     8 inputs           forward:          8 passes
   a 512 × 512 RGB texture: 786,432 inputs     forward:    786,432 passes
   one loss:                1 output           reverse:          1 backward pass
```

- a loss is one number, so differentiable renderers, like network trainers, run in **reverse mode**
- the price is **memory**: every intermediate value of the forward pass is kept for the backward pass


---

## Differentiating Lambert

```text
   S = ρ (ka + E max(0, n·l))           on a lit point (n·l > 0):

   ∂S/∂ρ = ka + E n·l        ∂S/∂l = ρ E n        ∂S/∂n = ρ E l
```

- the albedo derivative is the **shading itself**: brighter points move the albedo more
- the light derivative points along the **normal**; the normal derivative along the **light**


---

## Down to the parameters

```text
   l(az, el) = (cos el · sin az,  sin el,  cos el · cos az)
   ∂l/∂az    = (cos el · cos az,  0,       −cos el · sin az)

   inside the disk, z = √(r² − d²):
   ∂n/∂r     = (−dx/r²,  −dy/r²,  d²/(z r²))
```

- the chain rule continues through the light's angles and the sphere's geometry
- ∂n/∂r grows without bound as z → 0, at the rim


---

## One pixel at the start: forward values

```text
   pixel (20, 28), center (−0.35938, 0.10938); start center (−0.12, 0.10), radius 0.42
   d = 0.2396        z = √(0.42² − 0.2396²) = 0.3450
   n = (−0.5699, 0.0223, 0.8214)        l = (−0.4794, 0, 0.8776)        n·l = 0.9941

   rendered:  0.5 · (0.08 + 0.9941) = 0.5370  (every channel)
   target:    (0.2004, 0.0825, 0.0471)
```

- this pixel is much too bright: in the target the light is on the other side


---

## The same pixel: its share of the gradient

```text
   ∂P/∂ρ = 0.08 + 0.9941 = 1.0741
   red albedo:   2 (0.5370 − 0.2004) · 1.0741 / 12,288 = +5.89 × 10⁻⁵     descent lowers ρR

   ∂(n·l)/∂az = n · (0.8776, 0, 0.4794) = −0.1064
   azimuth:   (0.6733 + 0.9091 + 0.9798) · 0.5 · (−0.1064) / 12,288 = −1.11 × 10⁻⁵
                                                         descent raises az, toward 0.70
```

- 12,288 such contributions are summed into one gradient per step


---

## Blinn–Phong: through a normalization

```text
   spec = ks E (n·h)^p        h = (l + v) / |l + v|

   ∂h/∂l = (I − h hᵀ) / |l + v|
   ∂spec/∂l = ks E p (n·h)^(p−1) · (n − (n·h) h) / |l + v|
```

- differentiating a **normalized** vector removes the component along it
- the highlight covers few pixels, so its gradient is strong but local


---

## Checking the gradient

At albedo (0.6, 0.4, 0.3), light (0.2, 0.3), radius 0.55, center (0.03, −0.02), 32 × 32, soft edge:

| | ∂L/∂ρR | ∂L/∂az | ∂L/∂r | ∂L/∂cx |
| --- | --- | --- | --- | --- |
| analytic (Lambert) | −0.010932 | −0.010965 | −0.033121 | −0.048778 |
| central differences, h = 10⁻⁶ | −0.010932 | −0.010965 | −0.033121 | −0.048778 |

- largest relative disagreement over all eight: 1.4 × 10⁻⁷ (Lambert), 1.2 × 10⁻⁷ (Blinn–Phong)


---

## Shadowed pixels do not vote

```text
   ∂ max(0, u) / ∂u = 1 if u > 0,   0 if u < 0
```

- a pixel the current light leaves in shadow passes **no gradient** to the light, however wrong it is
- only pixels lit **now** pull the light toward the truth
- shadows, reflections and refractions that move with θ are more discontinuities of the same kind


---

## A pixel is an integral

```text
   I_pixel(θ) = ∫ over the pixel's area of  f(x, θ) dx
```

- when an edge crosses the pixel, f **jumps** there
- the jump **moves** when θ changes the geometry
- the antialiasing lecture estimated this integral by samples; now its **derivative** is needed


---

## Leibniz: the boundary term

```text
   I(θ) = ∫₀¹ f(x, θ) dx,     f jumps from f_in to f_out at x = t(θ)

   dI/dθ  =  ∫₀¹ ∂f/∂θ dx   +   (f_in − f_out) · dt/dθ
             ─────────────       ─────────────────────
             interior term        boundary term
```

- in 2D the boundary term is an integral **along the edges**: the jump across the edge times its normal velocity
- differentiating fixed samples one by one captures the **interior term only**


---

## In one dimension, by hand

```text
   pixel [0, 1];  object 0.8 on [0, t), background 0.1 on [t, 1]

   I(t)  = 0.8 t + 0.1 (1 − t) = 0.1 + 0.7 t        dI/dt = 0.7   (all boundary term)
   one sample at x = 0.5, with t = 0.3:  reads 0.1 for every t near 0.3   →  derivative 0
```

- the sample changes only when t crosses 0.5, by a jump of 0.7, which no derivative sees


---

## The flat disk

Flat shading (S = ρ): the radius shows only in the silhouette. Other parameters true, r = 0.5 (true 0.62):

| pixel model | loss | ∂L/∂r |
| --- | --- | --- |
| hard edge, 1 sample per pixel, analytic | 0.02194 | **0** |
| hard edge, 16 × 16 samples, central differences | 0.01982 | −0.1635 |
| soft edge, w = 1.5 px, analytic | 0.01785 | −0.1650 |

- the supersampled image approximates the pixel integral: its derivative is the **right answer**
- the hard renderer reports nothing; the soft edge reports nearly the right number


---

## The staircase

<img src="../../textbook/figures/inv-silhouette.svg" class="media-shot" style="max-height: 400px;" alt="loss against radius for three pixel models; a zoom shows the one-sample curve as a staircase and the other two as straight lines">


---

## Pitfall: the radius that never moves

- flat disk, hard edge, only the radius free, start at 0.42, 200 steps of Adam
- the radius ends at **exactly 0.42**: every gradient was exactly zero
- nothing reports an error; the loss just stays at its starting value
- with **Lambert** shading the same fit converges, because ∂n/∂r ≠ 0 inside the disk: the bug hides until a flat or textured object, or an outline-only parameter, appears


---

## Pitfall: explaining away

```text
   free: albedo and light only;  geometry stuck at the start (r = 0.42, center (−0.12, 0.10))
   after 400 steps:  loss 0.0167
                     albedo (0.791, 0.327, 0.187)    light (0.857, 0.152)     true light (0.70, 0.45)
```

- the appearance bends to cover for the wrong shape
- a low, flat loss does **not** mean the right parameters


---

## Fix 1: edge sampling

Li, Aittala, Durand and Lehtinen 2018

- find the **silhouette edges** of the mesh as seen from the camera, and from shading points for shadows and indirect light
- sample points **on** the edges; at each, evaluate the radiance on both sides
- contribution: the difference times the edge's normal velocity
- **unbiased**; the cost is finding and sampling the edges, with a hierarchy over edges for secondary rays


---

## Fix 2: reparameterization

Loubet, Holzschuch and Jakob 2019

- change the integration variable so that the discontinuity **stays put** as θ changes
- the sampled directions around a pixel or shading point rotate to follow the moving silhouette
- the boundary term becomes an interior term; no explicit edges needed
- biased where the local estimate is poor; Bangaru, Li and Durand 2020 made the warp **unbiased** (warped-area sampling)


---

## Fix 3: path-space differentiation

Zhang, Miller, Yan, Gkioulekas and Zhao 2020

- differentiate the **path integral** of light transport itself
- the derivative = an interior path integral + a **boundary path integral** over paths that touch a discontinuity
- estimate both by Monte Carlo, as a path tracer estimates the forward integral
- unbiased and general, including discontinuities met deep in a path


---

## Fix 4: soft rasterizers

- **Neural 3D Mesh Renderer** (Kato, Ushiku and Harada 2018): hard forward render; in the backward pass, an approximate gradient from interpolating the color as the edge sweeps across the pixel
- **Soft Rasterizer** (Liu, Li, Chen and Li 2019): coverage becomes a **probability**, a sigmoid of the signed distance to the edge; triangles along a pixel blend by a softmax over depth instead of a depth test
- every pixel near an edge then depends **smoothly** on the edge's position
- the cost is **bias**: the image is blurred, and matches a photograph only as the blur goes to zero


---

## A soft edge in numbers

```text
   a = σ((r − d) / s),    s = w / (2 ln 9) pixels:   a goes from 0.1 to 0.9 over w pixels

   w = 1.5 px:
   r − d (px)    −1       −0.5      0       0.5       1
   a           0.0507   0.1877    0.5    0.8123   0.9493

   peak of da/dr, at the rim:  ln 9 / (2w) per pixel
   w = 0.5: 2.197        w = 1.5: 0.732        w = 3: 0.366
```

- a narrower edge gives a larger peak on fewer pixels


---

## Sharp or wide

<img src="../../textbook/figures/inv-coverage.svg" class="media-shot" style="max-height: 300px;" alt="coverage against r minus d for a hard step and three sigmoids, and their derivatives as bell curves">

- narrow edge: a sharp image, a **large** gradient on **few** pixels
- wide edge: a blurred image, a **small** gradient on **many** pixels
- common practice: start wide (a broad basin), anneal narrow (an accurate image)


---

## The hard edge's plateau

<img src="../../textbook/figures/inv-loss.svg" class="media-shot" style="max-height: 330px;" alt="log loss against step; the hard-edge curve jumps between 1e-10 and 1e-5 after step 200; the soft-edge curve keeps falling">

- after step 200 the hard-edge loss jumps between about 10⁻¹⁰ and 10⁻⁵: rim pixels flip in and out
- the smallest one-pixel flip costs 1.74 × 10⁻⁶ of loss


---

## The four families

| family | unbiased | needs | in practice |
| --- | --- | --- | --- |
| edge sampling | yes | explicit silhouette edges | redner; triangle meshes |
| reparameterization | warped-area: yes | a few auxiliary rays | Mitsuba |
| path space | yes | boundary paths | general global illumination |
| soft rasterization | no (blurred) | nothing extra | PyTorch3D; also nvdiffrast's analytic antialiasing |


---

## Differentiating a path tracer

```text
   naive reverse mode stores every intermediate value of every path:

   512 × 512 pixels × 64 samples × 6 bounces × 50 floats × 4 bytes  =  20.1 GB
                                                                       for ONE gradient
```

- (assumption: 50 stored floats per path vertex)
- the tape, not the arithmetic, is the obstacle


---

## Mitsuba 2 and 3, and Dr.Jit

- **Mitsuba 2** (Nimier-David, Vicini, Zeltner and Jakob 2019): one renderer written against generic numeric types, compiled into variants: scalar, vectorized, polarized, spectral, **differentiable**
- **Dr.Jit** (Jakob, Speierer, Roussel and Vicini 2022), the compiler under **Mitsuba 3**: traces the renderer into a graph, fuses it into large GPU (graphics processing unit) kernels, differentiates in forward or reverse mode
- loops are recorded symbolically, so a kernel does not grow with the number of bounces


---

## Radiative backpropagation

- treat the backward pass as **light transport**: the image-space gradient ∂L/∂I is emitted from the camera as an adjoint radiance
- paths carry it into the scene; at each parameter, accumulate adjoint × forward radiance
- memory: that of a **forward render**, independent of path length
- **path replay backpropagation** (Vicini, Speierer and Jakob 2021): replay each path with the same random numbers; cost linear in path length


---

## Monte Carlo gradients

- a gradient estimate multiplies estimates; two estimates from the **same** random samples are correlated
- E[X · Y] ≠ E[X] · E[Y] for correlated X, Y: the product is **biased**
- remedy: **decorrelate**, with independent samples for the two factors
- an optimizer averages noisy gradients over steps, so few samples per step suffice, but only if each estimate is unbiased


---

## Recovering materials and lighting

- **materials**: known geometry and lights; gradients through the BRDF (the microfacet model of the light-transport lecture): albedo, roughness, metalness, or full textures
- **lighting**: an environment map or area lights, with known geometry
- **jointly**: inverse path tracing recovers the materials and emitters of a room (Azinović, Li, Kaplanyan and Nießner 2019)
- the difficulty: the albedo–intensity tie, and highlights that cover few pixels


---

## Recovering geometry

- raw vertex gradients are **large near silhouettes and noisy**; following them moves vertices independently and **tangles** the mesh
- **large steps** (Nicolet, Jacobson and Jakob 2021): precondition the step by (I + λ L)⁻¹, L the mesh Laplacian; each update spreads to the neighbors
- **signed distance functions (SDFs)** (Vicini, Speierer and Jakob 2022): geometry as a distance field, with silhouette-aware gradients


---

## Everything at once, and volumes

- **nvdiffrec** (Munkberg et al. 2022): a triangle mesh, its materials and an environment light from photographs, by differentiable rasterization end to end; the result loads into a game engine
- **volumes**: density and albedo grids recovered by differentiable volumetric path tracing (one of Mitsuba 2's demonstrations); memory and many scattering events per path are the obstacles


---

## NeRF as inverse rendering

- a NeRF (neural radiance field) is fitted by exactly this loop: render, compare with the photographs, backpropagate
- its renderer is the **volume integral**: occlusion is a product of transmittances, Tᵢ = Π (1 − αⱼ) over j < i
- every quantity is smooth in the densities: **no edge to sample**; a surface is a steep but differentiable rise in density


---

## Gaussian splatting as inverse rendering

- 3D Gaussian splatting renders by **sorted alpha blending** of Gaussians with smooth footprints: coverage is the Gaussian's value, a **soft edge by construction**
- only the sort order is discrete, and its gradient is ignored
- both NeRF and splats invert for **radiance**, not materials and lights: the capture's lighting is baked in, so neither relights without a further decomposition


---

## Regularization and priors

```text
   minimize   L(θ) + λ Ω(θ)

   L = −log p(photograph | θ)      the data term
   Ω = −log p(θ)                   the prior
   the minimizer is the maximum a posteriori (MAP) estimate
```

- hand-built Ω: smoothness (a Laplacian or total-variation term), plausible albedos, natural illumination
- where the data term is flat, as on the valley, **the prior alone decides**


---

## A prior picks a point on the valley

```text
   gray-world prior:   Ω = (mean albedo − 0.5)²
   on the valley s · E = 1:   mean albedo = s · (0.8 + 0.4 + 0.2)/3 = 0.4667 s

   minimum:   s = 0.5 / 0.4667 = 1.071      E = 0.933      albedo (0.857, 0.429, 0.214)
```

- the answer is exactly as right as the prior


---

## Learned priors

- **shape, illumination and reflectance from shading** (Barron and Malik 2015): one image, many hand-built priors combined
- learned: a network trained on many scenes predicts the parameters, or **initializes** the optimization
- a **diffusion model as the prior**: score how plausible a rendered view looks
- score distillation (DreamFusion, Poole et al. 2022): no photograph at all, only the prior, pushed through a differentiable renderer


---

## Open problems

- **global-illumination gradients**: boundary terms from shadows, reflections and caustics deep in a path are expensive and high in variance
- **noise**: how to split samples between the forward value and the gradient, and how to reuse them across steps
- **local minima**: a shape that must move farther than its silhouette's width sees no pull; explaining away is a minimum the optimizer accepts
- **real capture**: camera response, white balance, lens distortion, vignetting, motion blur, interreflections, lights outside the frame


---

## Reading

- Li, Aittala, Durand, Lehtinen 2018, edge sampling, doi:10.1145/3272127.3275109
- Loubet, Holzschuch, Jakob 2019, reparameterization, doi:10.1145/3355089.3356510
- Zhang, Miller, Yan, Gkioulekas, Zhao 2020, path-space, doi:10.1145/3386569.3392383
- Liu, Li, Chen, Li 2019, Soft Rasterizer, doi:10.1109/ICCV.2019.00780
- Kato, Ushiku, Harada 2018, Neural 3D Mesh Renderer, doi:10.1109/CVPR.2018.00411
- Nimier-David et al. 2019, Mitsuba 2, doi:10.1145/3355089.3356498
- Jakob et al. 2022, Dr.Jit, doi:10.1145/3528223.3530099
- Nimier-David et al. 2020, radiative backpropagation, doi:10.1145/3386569.3392406

