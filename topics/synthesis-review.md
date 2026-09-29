<!--
  CSS 551 · TOPIC DECK: Synthesis and review: the map, the thread, twelve worked problems (~74 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/synthesis-review.md"> among others; it carries no
  logistics beyond one slide on the final's format, and no "Part N" numbering.

  TEACHES: the map of the field (the history chapter's era-to-chapter map); the one chain the course
  follows, from model coordinates to learned scenes; where each foundation tool reappears in the neural
  weeks; the final's format and the pitfalls its distractors are built from; twelve review problems
  across the term, each posed on one slide and worked on the next.
  NEEDS:   the whole course; mount last.
  DEMOS:   none.
  FIGURES: ../../textbook/figures/hist-map.svg (tools/gen-textbook-figures-history.mjs). Every answer is
           recomputed in ../../lectures/L20-synthesis-review/figures/numbers.json by tools/gen-lecture-figures-d2.mjs
           from lib/core and checked against the textbook's numbers JSONs.

  reveal.js: FLAT (every slide a top-level "---" section). Notes follow "Note:".
  Plain unicode math or fenced ```text blocks. Never two "_" on one markdown line
  outside a code fence. No <small> on math. Paths are relative to the lecture page
  that mounts this topic (lectures/LNN-slug/index.html).
-->

### Synthesis and review

<small>(~74 min)</small>


---

## The map of the field

<img src="../../textbook/figures/hist-map.svg" class="media-shot" style="max-height: 470px;" alt="eight eras of computer graphics on the left, linked to the course text's chapters on the right: 28 links from the eras to 20 chapters">

<small>From <a href="../../textbook/history-of-graphics.html#era-map">A History of Computer Graphics, Section 10</a>: eight eras, 28 links into 20 chapters.</small>


---

## One chain, eleven weeks

```text
   model coords ──TRS──▶ world ──W = W_parent·L──▶ scene ──V──▶ eye ──P──▶ clip ──÷w──▶ NDC ──viewport──▶ pixels
       vectors, rotation,        scene graphs              viewing                       rasterization, depth test,
       affine transforms                                                                 antialiasing
                                                                                                │
   pixels ◀── shade: N·L, R·V, textures, sRGB ◀── light transport: the rendering equation, path tracing
                                                                                                │
   run it backwards:  photographs ──▶ a scene (NeRF, splats), through a differentiable version of this chain
   run it sideways:   images as points ──▶ a denoiser learns where they are (diffusion), conditioned on the chain's buffers
```


---

## Where the foundations came back

| foundation tool | where it returned in weeks 8 to 11 |
| --------------- | ---------------------------------- |
| dot product, cosine | attention scores; embedding similarity |
| quaternion | a splat's stored rotation |
| TRS, `M = T·R·S` | a splat's covariance `R S Sᵀ Rᵀ` |
| `V`, `P`, the divide | a splat's Jacobian; NeRF's camera rays; the ring of views |
| depth buffer | a ControlNet condition, after linearizing |
| alpha compositing | volume rendering and splat blending, `C = Σ Tᵢαᵢcᵢ` |
| importance sampling | NeRF's coarse-to-fine samples |
| sampling, Fourier bases | positional encoding; the DCT of the space of images |
| Lambert | why a captured scene cannot be relit |


---

## The final examination

- **Thursday December 17, 5:45 PM**, in person, two hours
- about **50 multiple-choice items**, on paper; pencil; no devices, no notes
- **cumulative**, with weeks 7 to 11 weighted more heavily
- items are **computational**: which entry of the matrix, which pixel wins the depth test, what N·L is after the light moves, how many samples halve the error
- the wrong options are the **pitfalls**: the normal pushed through `M`, the sheared read-back, the code-space blend, the per-frame step, Euler angles near 90°, the raw depth buffer, the clamped guidance, the thin surface between samples


---

## Review 1: vectors

`a = (2, 1, 0)`, `b = (1, 2, 1)`.

1. The angle between them.
2. `a × b`, and the area of the triangle with sides `a` and `b`.


---

## Review 1, worked

```text
   a·b = 2 + 2 + 0 = 4        |a| = √5 = 2.236       |b| = √6 = 2.449
   cos θ = 4 / (2.236·2.449) = 0.730              θ = 43.09°

   a × b = (1·1 − 0·2,  0·1 − 2·1,  2·2 − 1·1) = (1, −2, 3)
   |a × b| = √14 = 3.742  (the parallelogram)     triangle = 1.871
   check: (a × b)·a = 2 − 2 + 0 = 0,   (a × b)·b = 1 − 4 + 3 = 0
```

- the pitfall: `b × a = (−1, 2, −3)`; the order sets the direction, the right-hand rule sets which one


---

## Review 2: a plane

A plane passes through `Q = (1, 0, 0)` with normal along `(1, 2, 2)`. How far is `P = (4, 1, 0)` from it, on which side, and where is the foot of the perpendicular?


---

## Review 2, worked

```text
   n = (1, 2, 2) / 3 = (0.333, 0.667, 0.667)
   signed distance = n·(P − Q) = (0.333·3 + 0.667·1 + 0.667·0) = 1.667      positive: the side n points to
   foot = P − 1.667·n = (4, 1, 0) − (0.556, 1.111, 1.111) = (3.444, −0.111, −1.111)
```

- the pitfall: `(1, 2, 2)·(P − Q) = 5` is three times too large; an unnormalized normal scales every distance by its length


---

## Review 3: a rotation

Rotate `p = (2, 0, 0)` by 30° about `y`. Give the result, and the unit quaternion for the rotation.


---

## Review 3, worked

```text
   R_y(θ):  x′ = x cos θ + z sin θ,   z′ = −x sin θ + z cos θ
   p′ = (2·0.866, 0, −2·0.5) = (1.732, 0, −1)

   q = (sin(θ/2)·axis, cos(θ/2)) = (0, sin 15°, 0, cos 15°) = (0, 0.259, 0, 0.966)
```

- the pitfall: `(0, 0.5, 0, 0.866)` uses the full angle; that quaternion rotates by 60°
- rotating `+x` about `+y` by a positive angle moves it toward `−z` in a right-handed frame


---

## Review 4: composition order

`T` translates by `(1.5, 0, 0)`; `R` rotates 60° about `y`. Give the translation column of `T·R` and of `R·T`.


---

## Review 4, worked

```text
   T·R:  rotate first, then translate          translation column (1.5, 0, 0)
   R·T:  translate first, then rotate the translated point
         R·(1.5, 0, 0) = (1.5 cos 60°, 0, −1.5 sin 60°) = (0.75, 0, −1.299)
```

- the upper-left 3×3 is the same `R` in both; **only where the object ends up** differs
- the pitfall: reading `T·R` left to right as "translate, then rotate"


---

## Review 5: a scene graph

A base node has local transform `R_y(90°)`. Its child, an arm, has local transform `T(1, 0, 0)`. Where in the world are the arm's origin, and the point `(1, 0, 0)` of the arm's own frame?


---

## Review 5, worked

```text
   W_arm = W_base · L_arm = R_y(90°) · T(1, 0, 0)

   arm origin:        R_y(90°)·(1, 0, 0) = (0, 0, −1)
   arm-local (1,0,0): R_y(90°)·(2, 0, 0) = (0, 0, −2)
```

- the pitfall: the product in the other order, `L_arm · W_base`, gives `(1, 0, −1)`: the arm's offset applied in the world frame instead of the base's turned frame


---

## Review 6: depth

A perspective camera has near 1 and far 8. What NDC depth does a point at distance 2 get, and at distance 4? What does that mean for the depth buffer?


---

## Review 6, worked

```text
   A = −9/7 = −1.2857      B = −16/7 = −2.2857
   distance 2 (z = −2):   (−1.2857·(−2) − 2.2857) / 2 = (2.5714 − 2.2857)/2 = 0.1429
   distance 4 (z = −4):   (5.1429 − 2.2857) / 4 = 0.7143
   distance 6:            0.9048
```

- the near quarter of the depth range, from 1 to 2.75, takes about three quarters of the NDC range: precision is **near the camera**
- inverting: `d = B / (z_ndc + A)`, which is what a ControlNet depth condition needs


---

## Review 7: interpolation across a triangle

A segment runs from A (eye `z = −1`, `u = 0`) to B (eye `z = −5`, `u = 1`); on screen, A is at `x = −1` and B at `x = 0.2`. At the screen midpoint, what is `u`?


---

## Review 7, worked

```text
   screen midpoint: x = −0.4, halfway on screen (t = 0.5)
   1/z   interpolates linearly on screen:  (1/1 + 1/5)/2 = 0.6      depth there = 1/0.6 = 1.667
   u/z   interpolates linearly on screen:  (0/1 + 1/5)/2 = 0.1
   u = 0.1 / 0.6 = 0.167
```

- the pitfall: `u = 0.5`, the screen-linear answer, which makes textures swim on a floor
- the far half of the segment covers less screen: halfway on screen is only a sixth of the way in `u`


---

## Review 8: shading at a point

A sphere point `(0.693, 0.693, 0.693)` with unit normal `(0.577, 0.577, 0.577)`; a point light at `(1.837, 1.5, 1.837)`. Compute N·L.


---

## Review 8, worked

```text
   light − point = (1.144, 0.807, 1.144)        length 1.808
   L = (0.633, 0.446, 0.633)
   N·L = 0.577·(0.633 + 0.446 + 0.633) = 0.577·1.712 = 0.988      (8.8° between N and L)

   with the camera at (3, 3, 6):  R·V = 0.879,   (R·V)^30 = 0.021:  a dim highlight, bright diffuse
```

- the pitfall: using the light's position as `L`, or forgetting to normalize it


---

## Review 9: Monte Carlo

A path tracer at 64 samples per pixel shows noise you want to halve. How many samples? To cut it to a quarter?


---

## Review 9, worked

```text
   error ∝ 1/√N
   halve:    √N must double      N × 4  = 256 samples per pixel
   quarter:  √N must quadruple   N × 16 = 1,024 samples per pixel
```

- the pitfall: 128, doubling the samples, cuts the noise only by `√2`, about 29 %
- this law is why importance sampling, NeRF's coarse-to-fine pass and learned denoisers exist


---

## Review 10: one neuron's gradient

A network `f(x) = w₂·tanh(w₁x + b₁) + b₂` with `w₁ = (1, −1)`, `b₁ = (0.5, 0.5)`, `w₂ = (0.8, −0.6)`, `b₂ = 0.1`. For `x = 0.4`, target `y = 0.3`, squared-error loss: compute `f`, the loss, and `∂L/∂b₂`; then take one step with learning rate 0.1.


---

## Review 10, worked

```text
   z = (0.4 + 0.5, −0.4 + 0.5) = (0.9, 0.1)       a = tanh z = (0.7163, 0.0997)
   f = 0.8·0.7163 − 0.6·0.0997 + 0.1 = 0.6132     loss = (0.6132 − 0.3)² = 0.0981
   ∂L/∂b₂ = 2(f − y) = 0.6265                      ∂L/∂w₂ = 2(f − y)·a = (0.4487, 0.0624)
   step: b₂ ← 0.1 − 0.1·0.6265 = 0.0374
```

- the pitfall: dropping the factor 2 of the squared error, or updating in the direction of the gradient


---

## Review 11: one DDIM step

On the spiral, at `t = 0.699` a point is at `x_t = (0.866, 1.056)`; the denoiser returns `x̂₀ = (0.037, 0.149)`. With `√ᾱ = 0.452`, `√(1−ᾱ) = 0.892` now and `√ᾱ = 0.479`, `√(1−ᾱ) = 0.878` at the next time, give the next point.


---

## Review 11, worked

```text
   ε̂ = (x_t − 0.452·x̂₀) / 0.892 = ((0.866 − 0.017)/0.892, (1.056 − 0.067)/0.892) = (0.952, 1.108)
   x_next = 0.479·(0.037, 0.149) + 0.878·(0.952, 1.108) = (0.853, 1.044)
```

- the pitfall: stepping with the old noise level's weights, or with the true `ε` (which the sampler never has)
- this is HW8's `ddimStep`, and the first line of Tuesday's diffusion recap


---

## Review 12: two splats on one pixel

Front to back at one pixel: a red splat with `α = 0.6`, then a blue splat with `α = 0.5`, over a black background. The pixel's color, and the transmittance left?


---

## Review 12, worked

```text
   T₁ = 1       w₁ = 1 · 0.6 = 0.6
   T₂ = 0.4     w₂ = 0.4 · 0.5 = 0.2
   C = 0.6·(1, 0, 0) + 0.2·(0, 0, 1) = (0.6, 0, 0.2)        T(end) = 0.4 · 0.5 = 0.2
```

- the pitfall: compositing in the wrong order gives `(0.2, 0, 0.5)`; splats are **sorted by depth** before blending
- the weights sum to `1 − T(end) = 0.8`: the rest is background

