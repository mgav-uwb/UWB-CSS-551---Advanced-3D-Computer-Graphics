<!--
  CSS 551 · TOPIC DECK: Diffusion models II, further (~74 min, 31 content slides), mounted after the lecture's wrap,
  time permitting, or reading. Moved 2026-11-24 from topics/diffusion-2.md (L18) when that topic became a conceptual
  method survey (Marcel: "PCA, eigenvalues, hilbert spaces... way over the math level of the class. can the following
  lectures use less math?"): every derivation, worked arithmetic and formula-heavy slide, in the core topic's order,
  under five group dividers. Nothing graded needs these slides: Quiz 8's diffusion items are conceptual and HW8's
  formulas are on the core recap slide and the HW8 page.
  NEEDS:   topics/diffusion-2.md (the core); the first diffusion topic (the forward process, the exact denoiser, DDIM).
  NUMBERS: as in the core topic's header (node scripts on lib/core/diffusion.js and lib/core/diffusion-nd.js;
           lectures/L18-diffusion-2/figures/numbers.json; textbook/figures/numbers.json).
  ACRONYMS AND GREEK: each acronym spelled out and each Greek letter named at its first use in this file.
  reveal.js: FLAT (every slide a top-level "---" section). Notes follow "Note:" and stay plain text.
  Plain unicode math or fenced ```text blocks. Never two "_" on one markdown line outside a code fence.
-->

### Supplement: diffusion models II, further

<small>(~74 min, time permitting) · reading: <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 5 to 9</small>


---

### Conditioning and guidance, worked


---

## One DDIM step on the spiral

The recap's three lines, on the chapter's spiral with the exact denoiser, `t = 0.699 → 0.679`:

```text
   x_t = (0.866, 1.056)       √ᾱ = 0.452     √(1 − ᾱ) = 0.892          ᾱ (alpha-bar): the schedule
   x̂₀  = (0.037, 0.149)       the denoiser's guess
   ε̂   = (x_t − √ᾱ·x̂₀) / √(1 − ᾱ) = (0.952, 1.108)                   ε (epsilon): the noise
   at t = 0.679:   √ᾱ = 0.479,  √(1 − ᾱ) = 0.878
   x_next = 0.479·(0.037, 0.149) + 0.878·(0.952, 1.108) = (0.853, 1.044)
```

- `ddimStep` in HW8 (homework 8) reproduces this step: (0.8534, 1.0442) to four places


---

## The class slot, as one layer

The course's digit network (`lib/core/mlp-denoiser.js`, 1,002,064 weights) builds its first layer's input by **concatenation**:

```text
   input = [ x_t (400 numbers) | time embedding (64) | e_c (64) ]  →  528 numbers
   label c ∈ {0, …, 9}  →  e_c, a learned 64-vector;   "no class"  →  e_10, the eleventh
   first layer:   h = SiLU( W·input + b ) = SiLU( W_x·x_t + W_t·τ(t) + W_c·e_c + b )     512 units
   SiLU (sigmoid linear unit): the activation;   τ (tau): the time embedding

   concatenate, then multiply by W  =  a sum of three products: the class adds W_c·e_c to every unit
```

- the same weights for every class: only the 64 numbers of `e_c` change with the label
- every richer condition later tonight (a caption, a depth map) is this slot with more numbers in it


---

## The time embedding, computed

The noise level enters the same way as a coordinate enters NeRF (neural radiance fields): through **sines and cosines at many frequencies**.

```text
   τ(t): 32 frequencies fᵢ = 10000^(−i/32),  angle = 1000·t·fᵢ,  then (sin, cos) of each  →  64 numbers

                   i = 0 (f = 1)      i = 8 (f = 0.1)    i = 16 (f = 0.01)   i = 24 (f = 0.001)
   t = 0.50        (−0.468, −0.884)   (−0.262, 0.965)    (−0.959, 0.284)     (0.479, 0.878)
   t = 0.52        (−0.998,  0.066)   ( 0.987, −0.163)   (−0.883, 0.469)     (0.497, 0.868)
```

- high frequencies tell nearby times apart; low frequencies say roughly **where** in the run the step is
- the same idea as the transformer's position encoding and NeRF's positional encoding: give a small network frequencies


---

## Guidance on two numbers

Two pixels at one step. Unconditional estimate `(0.2, 0.2)`, conditional `(0.5, 0.1)`; the class direction is `(0.3, −0.1)`.

```text
   w = 0:   (0.2, 0.2)                                  the label ignored
   w = 1:   (0.2, 0.2) + 1·(0.3, −0.1) = (0.5, 0.1)     plain conditioning
   w = 3:   (0.2, 0.2) + 3·(0.3, −0.1) = (1.1, −0.1)    outside [−1, 1]
            clamped to the valid range:  (1.0, −0.1)
```

- the clamp at large `w` is where the **saturated, over-contrasted** look of heavily guided images comes from
- the guided estimate is no longer the posterior mean of anything; the sampler's accuracy guarantees no longer hold


---

## Guidance in noise coordinates is the same guidance

The denoiser's two outputs are tied by `ε̂ = (x_t − √ᾱ·x̂₀) / √(1−ᾱ)`, an **affine** map that does not depend on the condition. Guide either one and you get the same step:

```text
   one pixel at the recap's step:  x_t = 0.866,  √ᾱ = 0.452,  √(1−ᾱ) = 0.892
   x̂₀(∅) = 0.2   →  ε̂(∅) = (0.866 − 0.452·0.2)/0.892 = 0.8695
   x̂₀(c) = 0.5   →  ε̂(c) = 0.7175

   guide ε̂ at w = 3:   0.8695 + 3·(0.7175 − 0.8695) = 0.4135
   guide x̂₀ at w = 3:  0.2 + 3·(0.5 − 0.2) = 1.1   →   ε̂ = (0.866 − 0.452·1.1)/0.892 = 0.4135   ✓
```

- papers write guidance on `ε̂` or on a velocity; the course writes it on `x̂₀`; for any affine reparameterization they agree **before clamping**


---

## What guidance does to a distribution

Guidance samples, approximately, from `p(x)^(1−w) · p(x | c)^w`. Two Gaussians make that exact:

```text
   p(x) = N(0, 1)           p(x | c) = N(1, 0.5²)            (precision 1 and 4)

   tilted:  precision λ (lambda) = (1 − w)·1 + w·4     mean = (w·4·1) / λ

   w     precision    mean     standard deviation
   1     4            1.000    0.500        (plain conditioning)
   3     10           1.200    0.316        (past the conditional mean, and narrower)
   7     22           1.273    0.213
```

- guidance **sharpens** and **shifts away** from the unconditional mean: more "a 3" than any 3, and less variety
- that is the variety loss the saturation table counted, derived instead of measured


---

## Bayes turns the classifier into a difference

```text
   Bayes:            p(c | x) = p(x | c) · p(c) / p(x)
   take the log:     log p(c | x) = log p(x | c) − log p(x) + log p(c)
   take ∇ (nabla) in x:  ∇ log p(c | x) = ∇ log p(x | c) − ∇ log p(x)          (p(c) has no x in it)

   guided score:     ∇ log p(x) + w · ( ∇ log p(x | c) − ∇ log p(x) )
                   = (1 − w) · ∇ log p(x) + w · ∇ log p(x | c)
                   = ∇ log [ p(x)^(1−w) · p(x | c)^w ]                     the tilted density

   check, the two Gaussians, x = 0.5:   ∇ log p(x) = −0.5     ∇ log p(x | c) = −(0.5 − 1)/0.25 = 2
     classifier gradient 2 − (−0.5) = 2.5      w = 3:   −0.5 + 3·2.5 = 7.0
     tilted N(1.2, 1/10):   −10·(0.5 − 1.2) = 7.0   ✓
```


---

## A negative prompt, on two numbers

```text
   x̂₀ ← x̂₀(neg) + w · ( x̂₀(c) − x̂₀(neg) )

   x̂₀(c) = (0.5, 0.1)     x̂₀(∅) = (0.2, 0.2)     x̂₀(neg) = (0.4, 0.3)         w = 3
   from "no class":    (0.2, 0.2) + 3·(0.3, −0.1) = (1.1, −0.1)
   from the negative:  (0.4, 0.3) + 3·(0.1, −0.2) = (0.7, −0.3)
```

- the step now points **away from the negative** as well as toward the prompt; the second pixel is pushed down harder


---

## Guidance on the lookup table, counted

Twelve 3s, 30 DDIM steps, the demo's seed; distance in the demo's per-pixel units (copy threshold 0.06):

| smooth h | w | mean nearest-digit distance | pixels outside [−1, 1] |
| -------- | - | --------------------------- | ---------------------- |
| exact | 1, 2, 4, 6 | 0.000 at every w | 0.0 % |
| 3 | 1 | 0.228 | 0.9 % |
| 3 | 2 | 0.220 | 11.4 % |
| 3 | 4 | 0.123 | 13.6 % |
| 3 | 6 | 0.049 | 15.0 % |

- on the smoothed lookup, guidance pulls samples **toward the most typical training 3s**: at `w = 6` the mean falls below the copy threshold
- the overshoot past the rail grows with `w`, the clamp's raw material


---

## The guided sampler, whole

```js
// DDIM with classifier-free guidance; net(x, t, c) returns x̂₀. c = null means "no class".
function sample(net, c, w, steps, shape) {
  let x = randn(shape);                                  // start at t = 1: pure noise
  for (let k = 0; k < steps; k++) {
    const t1 = 1 - k / steps, t2 = 1 - (k + 1) / steps;
    const a1 = alphaBar(t1), a2 = t2 > 0 ? alphaBar(t2) : 1;
    const u = net(x, t1, null), g = net(x, t1, c);       // two passes per step
    let x0 = add(u, scale(w, sub(g, u)));                // guidance on x̂₀
    x0 = clamp(x0, -1, 1);                               // or rescale (dynamic thresholding)
    const eps = scale(1 / Math.sqrt(1 - a1), sub(x, scale(Math.sqrt(a1), x0)));
    x = add(scale(Math.sqrt(a2), x0), scale(Math.sqrt(1 - a2), eps));
  }
  return x;
}
```

- every idea of tonight's first hour is a line here: the two passes, the extrapolation, the clamp, the DDIM re-mix


---

### Samplers, worked


---

## The velocity is a rescaled denoiser

```text
   the line:          x_t = (1 − t)·x₀ + t·ε         solve for the noise:  ε = (x_t − (1 − t)·x₀) / t
   one pair's velocity:   ε − x₀ = (x_t − (1 − t)·x₀)/t − x₀ = (x_t − x₀) / t

   the network sees only x_t, so it learns the average over the pairs through x_t:
       v(x_t, t) = E[ (x_t − x₀)/t | x_t ] = (x_t − E[x₀ | x_t]) / t = (x_t − x̂₀) / t

   the posterior weights:   x_t given x₀ᵢ is Gaussian, mean (1 − t)·x₀ᵢ, variance t²
                            wᵢ ∝ exp( −‖x_t − (1 − t)·x₀ᵢ‖² / 2t² )
```

- the same softmax as the diffusion denoiser, with `(1 − t, t)` in place of `(√ᾱ, √(1−ᾱ))`
- squared error on `ε − x₀` is minimized by this average, exactly as squared error on `x₀` is minimized by `x̂₀`


---

## One Euler step by hand

Data `{−1, +1}`, `t = 0.5`, `x_t = 0.3`:

```text
   scaled points (1−t)·xᵢ:   −0.5, +0.5        squared distances:  0.64, 0.04
   logits −d²/(2t²):         −1.28, −0.08      weights:  0.2315, 0.7685
   x̂₀ = −0.2315 + 0.7685 = 0.537
   v  = (0.3 − 0.537) / 0.5 = −0.474           (forward time; sampling runs it backward)

   Euler to t = 0.4:   x = 0.3 − 0.1·(−0.474) = 0.347
   one jump to t = 0:  x = 0.3 − 0.5·(−0.474) = 0.537 = x̂₀
```

<img src="../../textbook/figures/diff-flow-paths.svg" class="media-shot" style="max-height: 175px;" alt="six particles from the same starts under DDIM and under the exact flow-matching velocity; the flow paths are straighter">

- a single jump lands on the current estimate, exactly like a one-step DDIM jump; rectified flow re-pairs noise and data to straighten paths further, the route by which Stable Diffusion 3 samples in a few dozen steps


---

## A flow path first contracts, then chooses

The worked example again, `x_t = 0.3`, now at **`t = 0.9`**:

```text
   scaled points (1−t)·xᵢ:   −0.1, +0.1        squared distances:  0.16, 0.04
   logits −d²/(2·0.81):      −0.099, −0.025    weights:  0.482, 0.518
   x̂₀ = −0.482 + 0.518 = 0.037
   v  = (0.3 − 0.037) / 0.9 = +0.292           backward step: x = 0.3 − 0.1·0.292 = 0.271

   at t = 0.5 the same x had  x̂₀ = 0.537,  v = −0.474:  the step went right, to 0.347
```

- high noise: the estimate is nearly the data mean, the field **shrinks the cloud** toward it
- lower noise: the particle has **committed** to the `+1` side and the velocity changes sign


---

## Pitfall: the same t is not the same noise

SNR (signal-to-noise ratio): the signal weight squared over the noise weight squared.

```text
   flow matching, t = 0.5:      signal 1 − t = 0.5,  noise t = 0.5        SNR = 0.25/0.25 = 1     (0 dB)
   diffusion, ᾱ = 1/4:          signal √ᾱ = 0.5,     noise √(1−ᾱ) = 0.866  SNR = 0.25/0.75 = 1/3  (−4.8 dB)

   x = 0.3, data {−1, +1}:      flow x̂₀ = 0.537            diffusion x̂₀ = 0.197

   match the SNR:   (1 − t)/t = √(1/3)  →  t = 0.634
   rescale x:       x_flow = x · (1 − t)/√ᾱ = 0.3 · 0.732 = 0.2196
   flow x̂₀ at (0.2196, t = 0.634):   weights 0.401, 0.599   →   0.197      the diffusion answer   ✓
```

- the two processes are the **same family**: a scale and a time change map one onto the other
- moving a trained model between samplers needs **both** the time map and the rescaling of `x`


---

## Crossing paths, on two points

```text
   data {−1, +1}, noises {+0.8, −1.2}
   random pairing:   −1 ↔ +0.8,  +1 ↔ −1.2        paths meet at t = 0.5, x = −0.1
                     total squared length 1.8² + 2.2² = 8.08
   re-paired:        −1 ↔ −1.2,  +1 ↔ +0.8         no crossing
                     total squared length 0.2² + 0.2² = 0.08
```

- re-pairing removes the crossing and shortens the paths a hundredfold in this toy; rectified flow finds such pairings by sampling the trained model


---

## Guidance on a velocity

Flow matching guides the same way, on its velocity:

```text
   v ← v(∅) + w · ( v(c) − v(∅) )

   the worked step (x = 0.3, t = 0.5): v(∅) = −0.474
   suppose the class moves the estimate to x̂₀(c) = 0.9:   v(c) = (0.3 − 0.9)/0.5 = −1.2
   w = 2:   v = −0.474 + 2·(−1.2 + 0.474) = −1.926
   Euler to t = 0.4:   x = 0.3 − 0.1·(−1.926) = 0.493
```

- `v = (x_t − x̂₀)/t` is affine in `x̂₀` at fixed `x_t, t`, so this is guidance on `x̂₀` again, in the third coordinate system of the evening


---

## One distillation round by hand

The student must land in **one** step where the teacher lands in **two**. On the spiral, exact denoiser, from `x = (0.6, 0.9)`:

```text
   t:        0.8              0.5              0.2
   √ᾱ, √(1−ᾱ):  0.3067, 0.9518   0.7027, 0.7114   0.9480, 0.3183

   teacher, two DDIM steps:   (0.6, 0.9) → (0.4515, 0.7312) → (0.2326, 0.4415)
   plain DDIM, one step:      (0.6, 0.9) → (0.2061, 0.4054)                    0.0448 short

   the student's target x̃₀: the estimate for which one DDIM step 0.8 → 0.2 lands on the teacher
     α (alpha), σ (sigma): the signal and noise weights at 0.8; double primes: at 0.2
     x̃₀ = ( z″ − (σ″/σ)·x ) / ( α″ − (σ″/σ)·α )       σ″/σ = 0.3183/0.9518 = 0.3344
        = ( (0.2326, 0.4415) − 0.3344·(0.6, 0.9) ) / ( 0.9480 − 0.3344·0.3067 )
        = (0.0320, 0.1406) / 0.8455 = (0.0378, 0.1663)
```

- the student trains on `x̃₀` by the usual squared error; then it becomes the teacher and the steps halve again


---

### Latents and text, worked


---

## The penalty, on one latent number

The penalty is the Kullback-Leibler divergence from the encoder's Gaussian (center μ (mu), spread σ) to the standard normal, in closed form per number:

```text
   KL( N(μ, σ²) ‖ N(0, 1) ) = ½ ( μ² + σ² − 1 − ln σ² )

   μ = 0.5, σ = 0.8:   ½ (0.25 + 0.64 − 1 − ln 0.64) = ½ (−0.11 + 0.4463) = 0.1681
   μ = 0,   σ = 1:     0              (the prior itself: no penalty)
```

- the penalty pulls μ toward 0 and σ toward 1; the reconstruction loss pulls the other way, toward sharp, informative codes
- latent diffusion keeps the weight of this term **small**: enough to smooth the space, not so much that the codes blur


---

## Sampling through a gradient: the reparameterization

`z` is random, yet the encoder has to be trained through it. Write the randomness as an input:

```text
   z = μ + σ·ε,   ε ~ N(0, 1)          ∂z/∂μ = 1,   ∂z/∂σ = ε

   μ = 0.5, σ = 0.8, ε = 0.3:   z = 0.74
   a downstream loss (z − 1)²:  ∂L/∂z = 2(0.74 − 1) = −0.52
                                ∂L/∂μ = −0.52        ∂L/∂σ = −0.52 · 0.3 = −0.156
```

- the noise `ε` is drawn, then held fixed for the backward pass; the gradient flows to μ and σ as through any product and sum
- the same trick is inside every diffusion training step: `x_t = √ᾱ·x₀ + √(1−ᾱ)·ε`


---

## Scaling the latent to unit variance

Stable Diffusion v1's autoencoder does not produce unit-variance latents. The diffusion model works on rescaled ones, with the factor chosen to bring their spread to about 1:

```text
   configs/stable-diffusion/v1-inference.yaml:   scale_factor: 0.18215

   encode:   z = 0.18215 · E(image)            (1 / 0.18215 = 5.49)
   decode:   image = D( z / 0.18215 )
```

- the forward process assumes data of **unit variance**: with `x₀` five times too large, the noise at every `t` would be five times too small relative to the signal
- forgetting the factor on decode is a classic bug: the decoder sees latents 5.49 times too small and returns a gray smear


---

## Cross-attention on a three-word caption

Queries from an image token, keys and values from the caption's tokens:

```text
   one image token:  q = (1, 0.5)          caption "a red cube", d = 2
   token     key k           value v       score q·k/√2     weight
   "a"       (0.2, 0.1)      (0, 0)        0.177            0.189
   "red"     (1.5, 0.2)      (1, 0)        1.131            0.490
   "cube"    (0.4, 1.2)      (0, 1)        0.707            0.321

   the token's update: 0.189·(0,0) + 0.490·(1,0) + 0.321·(0,1) = (0.490, 0.321)
```

- the weights depend on the **data**: a different image token asks a different question of the same caption


---

## Cross-attention at Stable Diffusion scale

Stable Diffusion v1 reads captions with the text encoder of CLIP (contrastive language-image pretraining), ViT-L/14 (a vision transformer):

```text
   the caption:   77 tokens (CLIP's context length), 768 numbers each        (FrozenCLIPEmbedder, max_length 77)
   the image:     at the 64×64 latent level, 4,096 image tokens
   heads:         8 per attention layer                                      (v1-inference.yaml: num_heads 8)

   one head, one cross-attention layer:   4,096 × 77     =    315,392 scores
   one head, one self-attention layer:    4,096 × 4,096  = 16,777,216 scores      (53× more)
```

- a caption longer than 77 tokens is **truncated**: words past the limit never reach the image
- cross-attention is cheap next to the image's own self-attention; the caption is short, the image is long


---

## An attention edit, on numbers

```text
   the image token from before, caption "a red cube":   weights (0.189, 0.490, 0.321)
   update:  0.490·(1, 0) + 0.321·(0, 1)            = (0.490, 0.321)

   swap "cube" → "sphere", keep the weights:   v_sphere = (0.2, 0.9)
   update:  0.490·(1, 0) + 0.321·(0.2, 0.9)        = (0.554, 0.289)
```

- only the part of the update that came through the changed word moves, by that word's weight times the change in its value


---

### Control and score distillation, worked


---

## The depth buffer, back to distance

NDC (normalized device coordinates): what the projection matrix and the perspective divide produce.

```text
   n = 1, f = 8 (the viewing chapter's P):   A = −(f+n)/(f−n) = −1.2857    B = −2fn/(f−n) = −2.2857
   distance 2:  NDC z = 0.1429,  buffer = 0.571        half the buffer's range is spent by distance 1.78
   back to distance:   d = B / (z_ndc + A)             z_ndc = 0.1429  →  d = −2.2857 / −1.1428 = 2.0
```

- the stored value is linear in one over distance; inverting the projection matrix's depth row recovers the distance exactly


---

## Zero convolutions: why ControlNet starts as the original

The copy's features enter the frozen model through a layer whose weight starts at **zero**:

```text
   y = F(x) + w · g(x, c)          F frozen, g the trainable copy, w initialized to 0

   step 0:   w = 0  →  y = F(x): exactly the original model's output
   but ∂L/∂w = g · ∂L/∂y ≠ 0:      g = 0.7,  ∂L/∂y = 0.4   →   ∂L/∂w = 0.28
   one SGD (stochastic gradient descent) step, learning rate 0.1:       w = −0.028             the control signal is born
```

- training cannot damage the frozen model at the start, so a few thousand condition-image pairs suffice
- the zero weight has a nonzero gradient because the copy's features `g` are not zero


---

## The drawn noise cancels

The update's residual, `ε̂ − ε`, for a denoiser that returns `x̂₀`:

```text
   the render, noised:       x_t = √ᾱ·x + √(1−ᾱ)·ε
   the model's noise guess:  ε̂ = (x_t − √ᾱ·x̂₀) / √(1−ᾱ)
                               = (√ᾱ·x + √(1−ᾱ)·ε − √ᾱ·x̂₀) / √(1−ᾱ)
                               = ε + √ᾱ·(x − x̂₀) / √(1−ᾱ)

   so:   ε̂ − ε = (√ᾱ / √(1−ᾱ)) · (x − x̂₀(x_t))
```

- the drawn noise drops out: the residual is the gap between the render and the model's guess at what it was, scaled by the signal-to-noise amplitude ratio
- a weight `w(t) = √(1−ᾱ)/√ᾱ` cancels the ratio, so every `t` pulls with the same units


---

## One score-distillation step by hand

Make the "scene" a 2D point θ (theta) and the renderer the identity (`x = θ`). The image model is the exact spiral denoiser. Then

```text
   ε̂ − ε = √ᾱ·(θ − x̂₀(x_t)) / √(1−ᾱ)          choose w(t) = √(1−ᾱ)/√ᾱ:   step = θ − x̂₀(x_t)

   θ = (0.5, 0.5),  t = 0.5 (√ᾱ = 0.703, √(1−ᾱ) = 0.711),  ε = (0.3, −0.4)
   x_t   = 0.703·(0.5, 0.5) + 0.711·(0.3, −0.4) = (0.565, 0.067)
   x̂₀    = (0.074, 0.087)          ε̂ = (0.720, 0.008)          ε̂ − ε = (0.420, 0.408)
   w·(ε̂ − ε) = (0.426, 0.413) = θ − x̂₀   ✓
   learning rate 0.05:   θ ← (0.5, 0.5) − 0.05·(0.426, 0.413) = (0.479, 0.479)
```

- score distillation moves the scene **toward the denoiser's estimate of its own noised render**


---

## Two cameras: the renderer's Jacobian

Scene: a 3D point `θ = (0.5, 0.5, 0.2)`. Camera A renders `(θx, θy)`, camera B `(θz, θy)`; `t`, `ε` and the denoiser as before:

```text
                render x        x̂₀(x_t)            x − x̂₀ (the weighted residual)
   camera A:    (0.5, 0.5)      (0.0743, 0.0870)    (0.4257, 0.4130)
   camera B:    (0.2, 0.5)      (0.0427, 0.0898)    (0.1573, 0.4102)

   the Jacobian ∂x/∂θ picks coordinates;  the step on θ is Jᵀ · residual:
   camera A:    (0.4257, 0.4130, 0)       →  θ = (0.479, 0.479, 0.2)            (learning rate 0.05)
   camera B:    (0, 0.4102, 0.1573)       →  θ = (0.5, 0.479, 0.192)
```

- each view moves **only what it sees**; only the random choice of camera reaches every coordinate
- `θy` is seen by both cameras and pulled by both: each view is judged alone, with no agreement between them


---

### Judging a generator, worked


---

## FID on one dimension

With one feature, the covariances are numbers and the trace term collapses:

```text
   tr( σg² + σr² − 2·(σg²·σr²)^½ ) = σg² + σr² − 2·σg·σr = (σg − σr)²

   FID = (μg − μr)² + (σg − σr)²         the squared gap in mean, plus the squared gap in spread

   generated N(0.5, 0.8²) against real N(0, 1):   0.5² + (0.8 − 1)² = 0.25 + 0.04 = 0.29
```

- FID compares **only** a mean and a spread per direction (and their correlations): any two sets with the same first two moments score 0
- the 2,048-feature version is this, with matrices; the square root becomes a matrix square root


---

## Guidance, scored by FID

Real data: the conditional `N(1, 0.5²)`. Guided samples: the tilted Gaussians of the guidance slide.

```text
   w     guided samples           FID against N(1, 0.5²)
   1     N(1.000, 0.500²)         0
   3     N(1.200, 0.316²)         0.200² + 0.184² = 0.040 + 0.034 = 0.074
   7     N(1.273, 0.213²)         0.273² + 0.287² = 0.074 + 0.082 = 0.157
```

- every sample at `w = 7` is "very much a c", yet FID **worsens**: the samples are shifted and too narrow
- FID charges for both of guidance's effects: the shift away from the data and the lost variety


---

## FID depends on how many samples you draw

The same distribution against itself should score 0. A sampled estimate is **biased upward**, and the bias shrinks with the sample count:

```text
   2D standard normal samples against the exact N(0, I), 200 trials each

   N          25        100       400       1,600
   mean FID   0.154     0.036     0.008     0.002
```

- the bias falls roughly as `1/N`; with 2,048 features it is far larger at a given `N`, so papers fix `N` (commonly 50,000) and only compare at the same `N`
- a FID difference smaller than the estimate's own noise is not a result

