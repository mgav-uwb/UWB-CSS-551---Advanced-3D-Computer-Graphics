<!--
  CSS 551 · TOPIC DECK: Synthesis and review: the map, the thread, twenty-three worked problems (~78 min, densified 2026-09-29).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/synthesis-review.md"> among others; it carries no
  logistics beyond one slide on the final's format, and no "Part N" numbering.

  TEACHES: the map of the field (the history chapter's era-to-chapter map); the one chain the course
  follows, from model coordinates to learned scenes; where each foundation tool reappears in the neural
  weeks; the final's format and the pitfalls its distractors are built from; twenty-three review problems
  across the term, each posed on one slide and worked on the next (13 to 23 added 2026-09-29: the rigid
  inverse, look-at, P entries, the viewport, barycentric weights, bilinear filtering, the mip level, a ray and a
  sphere, uniform against cosine sampling, attention weights, guidance).
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

<small>(~78 min)</small>


---

## The map of the field

<img src="../../textbook/figures/hist-map.svg" class="media-shot" style="max-height: 470px;" alt="eight eras of computer graphics on the left, linked to the course text's chapters on the right: 28 links from the eras to 20 chapters">

<small>The field's history mapped into the course's 20 chapters; the history itself is in <a href="../../textbook/history-of-graphics.html#map">A History of Computer Graphics</a>.</small>


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
- **45 multiple-choice questions**, 8 points each (360 points), on paper; pencil; no devices
- one **handwritten** cheat sheet allowed (one page, both sides); **everyone hands in a sheet**: the cheat sheet, or your name and "I did not use a cheat sheet"; otherwise **50 %** off
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


---

## Review 13: back into a node's frame

A node's world transform is `M = T(2, 0, 0) · R_y(90°)`. A world point `p = (2, 0, −1)` is touching it. Where is `p` in the node's own frame?

---

## Review 13, worked

```text
   rigid inverse:  M⁻¹ = R_y(90°)ᵀ · T(−2, 0, 0)          local = Rᵀ (p − t)
   p − t = (0, 0, −1)
   R_y(90°) sends +x to (0, 0, −1), so Rᵀ sends (0, 0, −1) to (1, 0, 0)
   local = (1, 0, 0)                check: M·(1, 0, 0) = R·(1, 0, 0) + t = (0, 0, −1) + (2, 0, 0) = (2, 0, −1) ✓
```

- pitfall 1: `p − t = (0, 0, −1)` with no rotation, the translation undone but not the turn
- pitfall 2: `R·(p − t) = (−1, 0, 0)`, rotating the wrong way: the inverse of a rotation is its **transpose**


---

## Review 14: a look-at camera

A camera at `eye = (3, 2, 4)` looks at the origin with up `(0, 1, 0)`. Give `w`, `u`, `v`, and the translation column of `V`.

---

## Review 14, worked

```text
   w = normalize(eye − at) = (3, 2, 4)/√29 = (0.557, 0.371, 0.743)
   u = normalize(up × w) = normalize(4, 0, −3) = (0.8, 0, −0.6)
   v = w × u = (−0.223, 0.928, −0.297)
   translation column = (−u·eye, −v·eye, −w·eye) = (0, 0, −5.385)
```

- the target lands at `(0, 0, −5.385)` in eye space: straight ahead, at distance `√29`, on the camera's `−z` axis
- pitfall: `w = normalize(at − eye)`, which makes the camera look **backward**, away from the target


---

## Review 15: the projection matrix

A camera with vertical field of view 60°, aspect 16:9, near 0.1, far 100. Give `P₀₀`, `P₁₁`, and the two depth entries `A` and `B`.

---

## Review 15, worked

```text
   f = 1 / tan(30°) = 1.7321
   P₀₀ = f / aspect = 1.7321 / 1.7778 = 0.9743        P₁₁ = f = 1.7321
   A = −(far + near)/(far − near) = −100.1 / 99.9 = −1.0020
   B = −2·far·near/(far − near) = −20 / 99.9 = −0.2002
```

- pitfall: `P₀₀ = f · aspect`, which stretches the image horizontally instead of compensating for the wide screen
- the ratio far/near = 1,000 puts almost all depth precision near the camera (Review 6)


---

## Review 16: NDC to pixels

A 1920×1080 viewport; pixel rows count **down** from the top. Where does NDC `(0.25, −0.5)` land?

---

## Review 16, worked

```text
   x_px = (x_ndc + 1)/2 · 1920 = 0.625 · 1920 = 1200
   y_px = (1 − y_ndc)/2 · 1080 = 0.75 · 1080 = 810
```

- NDC `y = −0.5` is below the center, and rows count down, so the pixel row is **greater** than 540
- pitfall: `(y_ndc + 1)/2 · 1080 = 270`, the image upside down


---

## Review 17: inside the triangle?

Triangle `A = (0, 0)`, `B = (4, 0)`, `C = (0, 4)`. Give the barycentric weights of `p = (1, 1)` and of `q = (5, 1)`, and say which point is inside.

---

## Review 17, worked

```text
   edge function e(a, b, p) = (b − a) × (p − a), the z of the 2D cross product;   area term e(A, B, C) = 16
   p = (1, 1):   w_A = e(B, C, p)/16 = 0.5    w_B = e(C, A, p)/16 = 0.25    w_C = e(A, B, p)/16 = 0.25
   q = (5, 1):   w_A = −0.5                   w_B = 1.25                    w_C = 0.25
```

- `p` is inside: all three weights are positive and sum to 1; `q` is outside, across edge `BC`, the edge opposite the negative weight
- the rasterizer's coverage test is exactly "all three edge functions ≥ 0"


---

## Review 18: bilinear filtering

Four texels: top row `10, 20`, bottom row `30, 40`. Sample at fractional position `u = 0.25` (across), `v = 0.5` (down) between their centers.

---

## Review 18, worked

```text
   top:     10·(1 − 0.25) + 20·0.25 = 12.5
   bottom:  30·0.75 + 40·0.25 = 32.5
   result:  12.5·(1 − 0.5) + 32.5·0.5 = 22.5
```

- pitfall: the plain average of the four texels, 25, which ignores where the sample is
- three linear interpolations; the order (rows first or columns first) does not matter


---

## Review 19: which mip level?

On screen, one pixel covers about 8 texels of a 1024² texture in each direction. Which mip level should be sampled, and how much extra memory does the full pyramid cost?

---

## Review 19, worked

```text
   level = log₂(8) = 3             level 3 is 128², one texel per pixel again
   pyramid memory: 1 + 1/4 + 1/16 + … = 4/3           one third more than the base texture
```

- pitfall: level 8, reading the footprint as the level; the level is its **logarithm**
- sampling level 0 instead aliases: 64 texels per pixel, one of them picked


---

## Review 20: a ray meets a sphere

A ray from the origin along `(0, 0, −1)` meets a sphere of radius 1 centered at `(0.5, 0, −5)`. Give the entry distance `t`, the hit point, and the surface normal there.

---

## Review 20, worked

```text
   o − c = (−0.5, 0, 5)       b = (o − c)·d = −5       c′ = |o − c|² − r² = 25.25 − 1 = 24.25
   discriminant  b² − c′ = 25 − 24.25 = 0.75
   t = −b − √0.75 = 5 − 0.866 = 4.134        (exit: 5.866)
   hit = (0, 0, −4.134)        normal = (hit − center)/r = (−0.5, 0, 0.866)
```

- the normal leans toward `−x` because the sphere's center is to the ray's right
- pitfall: taking `t = −b + √Δ`, the exit point on the far side of the sphere


---

## Review 21: Monte Carlo, uniform against cosine

A Lambert surface of albedo 0.5 under a uniform sky of radiance 1. Estimate the reflected radiance with directions sampled (a) uniformly over the hemisphere, (b) proportionally to `cos θ`. Give each estimator's mean and variance.

---

## Review 21, worked

```text
   exact:  L_out = albedo · 1 = 0.5
   (a) pdf 1/(2π):   one sample = (0.5/π)·1·cos θ / (1/(2π)) = cos θ
       mean E[cos θ] = 0.5 ✓      variance E[cos²θ] − 0.25 = 1/3 − 1/4 = 0.0833      std 0.289
       for a standard error of 0.01:   (0.289/0.01)² = 834 samples
   (b) pdf cos θ/π:  one sample = (0.5/π)·cos θ / (cos θ/π) = 0.5       variance 0
```

- importance sampling by the cosine makes every sample **exact** here: the pdf matches the integrand
- this is why path tracers sample cosine-weighted directions off diffuse surfaces


---

## Review 22: attention weights

A query `q = (1, 0)` and two keys `(2, 0)` and `(0, 2)`, dimension `d = 2`. Give the attention weights, and what they would be without the `1/√d` scale.

---

## Review 22, worked

```text
   scores q·k/√2:   2/1.414 = 1.414,   0
   softmax:         e^1.414 / (e^1.414 + 1) = 0.804,    0.196
   without 1/√d:    scores 2, 0   →   0.881, 0.119
```

- the scale keeps scores from growing with the dimension; without it, softmax saturates and attention becomes nearly **one-hot**, with vanishing gradients
- the same dot product as the vectors lecture's first slide, followed by a normalized exponential


---

## Review 23: guidance once more

At one step, the unconditional estimate of two pixels is `(0.1, 0.4)` and the conditional one `(0.3, 0.2)`. Give the guided estimate at `w = 2`.

---

## Review 23, worked

```text
   class direction:   (0.3, 0.2) − (0.1, 0.4) = (0.2, −0.2)
   guided:            (0.1, 0.4) + 2·(0.2, −0.2) = (0.5, 0.0)
```

- pitfall: `(0.3, 0.2) + 2·(0.2, −0.2) = (0.7, −0.2)`, starting from the conditional estimate: that is `w = 3`
- pitfall: `2·(0.3, 0.2) = (0.6, 0.4)`, scaling the conditional estimate instead of the difference

