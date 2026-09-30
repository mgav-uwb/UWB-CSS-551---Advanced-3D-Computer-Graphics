<!--
  CSS 551 · TOPIC DECK: Diffusion models II: conditioning, guidance, latents, control, text to 3D (~88 min, densified 2026-09-29).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/diffusion-2.md"> among others; it carries no
  logistics (no title, Thursday, homework, wrap) and no "Part N" numbering.

  TEACHES: how a condition reaches the denoiser (the five mechanisms; the course network's class and time embeddings; condition dropout);
           guidance in noise coordinates, as a tilted distribution, before classifier-free (classifier guidance), negative prompts,
           dynamic thresholding and the guidance interval; the sampler table, reflow, guidance on a velocity, distillation to few steps;
           the VAE penalty and reparameterization, the latent scale factor, what eight-fold downsampling costs; cross-attention at
           scale, Prompt-to-Prompt, text encoders; zero convolutions, rendering the conditions, inpainting channels, SDEdit;
           DreamFusion's numbers and its successors; FID's sample-size bias, precision and recall, CLIP score, memorization;
           the guided sampler as code; what breaks and what the pipeline supplies. Also (the original list): classifier-free guidance, worked on two numbers, live, and its cost in saturated pixels; flow matching and one Euler step by hand; the three scalings; latent diffusion and the variational autoencoder; cross-attention worked on a three-word caption; ControlNet, and the depth buffer against the linear depth a condition wants; score distillation, one step by hand with the identity renderer, and what it converges to on the spiral; FID and its blind spots; the papers.
  NEEDS:   the first diffusion topic (the forward process, the exact denoiser, DDPM and DDIM); the networks and embeddings topic (embeddings, attention); viewing (the projection matrix and the depth buffer); the learned-scenes idea of a differentiable renderer is introduced here in one slide.
  DEMOS:   data-demo="diffusion-net" data-controls="guide,steps" (demo-full).
  FIGURES: ../../textbook/figures/diff-*.svg|png (tools/gen-textbook-figures.mjs, numbers.json; diff-sampler-steps.svg added);
           the densified slides' numbers: lectures/L17-diffusion-2/figures/numbers.json, key "dense";
           ../../lectures/L17-diffusion-2/figures/{sds-toy,depth-buffer}.svg and numbers.json
           (tools/gen-lecture-figures-d2.mjs). Media: ../../media/generative/{cfg-row,controlnet-depth}.jpg,
           credit lines verbatim from media/generative/CREDITS.md.

  reveal.js: FLAT (every slide a top-level "---" section). Notes follow "Note:".
  Plain unicode math or fenced ```text blocks. Never two "_" on one markdown line
  outside a code fence. No <small> on math. Paths are relative to the lecture page
  that mounts this topic (lectures/LNN-slug/index.html).
-->

### Diffusion models II: conditioning, guidance, latents, control, text to 3D

<small>(~88 min)</small>


---

## Where the recipe stands

```text
   forward:   x_t = √ᾱ(t)·x₀ + √(1−ᾱ(t))·ε            ε ~ N(0, I)
   denoiser:  x̂₀(x_t, t)  (and ε̂ = (x_t − √ᾱ·x̂₀) / √(1−ᾱ): the same function, other coordinates)
   DDIM:      x_next = √ᾱ(t_next)·x̂₀ + √(1−ᾱ(t_next))·ε̂

   one step on the spiral, t = 0.699 → 0.679:
     x_t = (0.866, 1.056)   √ᾱ = 0.452   √(1−ᾱ) = 0.892
     x̂₀  = (0.037, 0.149)   ε̂  = (0.952, 1.108)
     x_next = 0.479·(0.037, 0.149) + 0.878·(0.952, 1.108) = (0.853, 1.044)
```

- everything tonight **changes what goes into x̂₀**, or **where x lives**; the sampler above stays


---

## How a condition gets in

| mechanism | how the network reads the condition | used in |
| --------- | ----------------------------------- | ------- |
| embedding added | a learned vector per class, summed into the hidden state | the course's digit network; class-conditional models |
| cross-attention | image tokens attend to the caption's token vectors, every layer | Stable Diffusion, Imagen |
| concatenation | a condition image (depth, mask, low-res) stacked on x_t as extra channels | super-resolution, inpainting |
| adapter | a trained copy of the encoder reads the condition and adds its features to the frozen model | ControlNet |
| guidance | conditional minus unconditional prediction, amplified at sampling time | all of the above |

- the first four decide **what the network sees**; guidance decides **how hard the sampler listens**


---

## The class slot, concretely

The course's digit network (`lib/core/mlp-denoiser.js`, 1,002,064 weights) builds its first layer's input by **concatenation**:

```text
   input = [ x_t (400 numbers) | time embedding (64) | e_c (64) ]  →  528 numbers
   label c ∈ {0, …, 9}  →  e_c, a learned 64-vector;   "no class"  →  e_10, the eleventh
   first layer:   h = SiLU( W·input + b ) = SiLU( W_x·x_t + W_t·τ(t) + W_c·e_c + b )     512 units

   concatenate, then multiply by W  =  a sum of three products: the class adds W_c·e_c to every unit
```

- the same weights for every class: only the 64 numbers of `e_c` change with the label
- every richer condition later tonight (a caption, a depth map) is this slot with more numbers in it


---

## How the time gets in

The noise level enters the same way as a coordinate enters NeRF: through **sines and cosines at many frequencies**.

```text
   τ(t): 32 frequencies fᵢ = 10000^(−i/32),  angle = 1000·t·fᵢ,  then (sin, cos) of each  →  64 numbers

                   i = 0 (f = 1)      i = 8 (f = 0.1)    i = 16 (f = 0.01)   i = 24 (f = 0.001)
   t = 0.50        (−0.468, −0.884)   (−0.262, 0.965)    (−0.959, 0.284)     (0.479, 0.878)
   t = 0.52        (−0.998,  0.066)   ( 0.987, −0.163)   (−0.883, 0.469)     (0.497, 0.868)
```

- high frequencies tell nearby times apart; low frequencies say roughly **where** in the run the step is
- the same idea as the transformer's position encoding and NeRF's positional encoding: give a small network frequencies


---

## Training with the condition dropped

```text
   for each training example (x₀, c):
       with probability 0.15:  c ← "no class"
       t ~ U(0, 1),  ε ~ N(0, I),  x_t = √ᾱ·x₀ + √(1−ᾱ)·ε
       loss = ‖ x̂₀(x_t, t, c) − x₀ ‖²

   a batch of 128:  about 128 × 0.15 = 19.2 unconditional examples, 108.8 conditional
```

- one network, one loss, two tasks: the conditional and the unconditional estimate share every weight
- drop too rarely and the unconditional estimate is poor; too often and the conditional one is


---

## Classifier-free guidance

Train **one** network with and without its condition: the condition is dropped at random (15 % of the time in the course's run) and replaced by a "no class" embedding. At sampling time, exaggerate the difference:

```text
   x̂₀  ←  x̂₀(∅) + w · ( x̂₀(c) − x̂₀(∅) )

   w = 0   the condition is ignored
   w = 1   plain conditioning
   w > 1   extrapolate past the conditional estimate, along "what makes this a c"
```

- two network evaluations per step instead of one: guidance **doubles the sampling cost**
- Ho & Salimans (2022); the digit network has an eleventh embedding for "no class"


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

   tilted:  precision λ = (1 − w)·1 + w·4        mean = (w·4·1) / λ

   w     precision    mean     standard deviation
   1     4            1.000    0.500        (plain conditioning)
   3     10           1.200    0.316        (past the conditional mean, and narrower)
   7     22           1.273    0.213
```

- guidance **sharpens** and **shifts away** from the unconditional mean: more "a 3" than any 3, and less variety
- that is the variety loss the saturation table counted, derived instead of measured


---

## Before classifier-free: classifier guidance

Dhariwal & Nichol (2021, arXiv:2105.05233) guided with a **separate classifier** trained on noisy images:

```text
   score of the guided density:   ∇ log p(x_t) + s · ∇ log p(c | x_t)
                                  ─────────────   ────────────────────
                                  the denoiser    the gradient of a classifier's log-probability
```

| | classifier guidance (2021) | classifier-free guidance (2022) |
| - | ------------------------- | -------------------------------- |
| extra network | a classifier trained on noisy images at every t | none: the same denoiser with and without c |
| per step | one denoiser pass + a classifier backward pass | two denoiser passes |
| conditions | only what the classifier knows (1,000 ImageNet classes) | anything the denoiser reads: captions, depth |

- Ho & Salimans (2022, arXiv:2207.12598) replaced the classifier by the difference of the denoiser's two estimates


---

## Negative prompts

Replace the unconditional estimate by an estimate for what you **do not** want:

```text
   x̂₀ ← x̂₀(neg) + w · ( x̂₀(c) − x̂₀(neg) )

   x̂₀(c) = (0.5, 0.1)     x̂₀(∅) = (0.2, 0.2)     x̂₀(neg) = (0.4, 0.3)         w = 3
   from "no class":    (0.2, 0.2) + 3·(0.3, −0.1) = (1.1, −0.1)
   from the negative:  (0.4, 0.3) + 3·(0.1, −0.2) = (0.7, −0.3)
```

- the step now points **away from the negative** as well as toward the prompt; the second pixel is pushed down harder
- same cost: still two network passes per step, the second with the negative caption in the "no class" slot


---

<!-- .slide: class="demo-full" -->

## The guide knob, live

<div class="cockpit" data-demo="diffusion-net" data-controls="guide,steps"><pre class="viz-fallback">  a trained class-conditional MLP denoiser (≈1,000,000 weights, 15 minutes
  of CPU training on 60,000 MNIST digits) samples 12 digits from noise
  buttons: which digit (conditioning)   guide: classifier-free guidance w
  the panel: nearest training digit, distance well above the memorization
  threshold for every sample: these digits were learned, not looked up
  MNIST (LeCun, Cortes, Burges) · CC BY-SA 3.0</pre></div>


---

## Guidance is not free

| w | pixels at full white (8 samples of a 3, 30 steps) | what it looks like |
| - | -------------------- | ------------------ |
| 1 | 7.3 % | varied 3s |
| 2 | 8.8 % | bolder |
| 4 | 10.9 % | thick, alike |
| 8 | 15.9 % | blotched, clamped |

<img src="../../media/generative/cfg-row.jpg" class="media-shot" style="max-height: 112px;" alt="the same prompt and seed at guidance scales 2.5, 7.5, 12.5, 20 and 30: a couple in a wood-paneled room, growing more saturated and stylized to the right">
<small class="credit">MrAlanKoh · CC BY-SA 4.0 · via Wikimedia Commons (one row of the original grid)</small>

- at scale, text-to-image sits near `w ≈ 7`; past that, saturation and repetition
- remedies: apply `w` only in the **middle** of the run; **rescale** instead of clipping


---

## Rescale, do not clip: dynamic thresholding

Imagen (Saharia et al. 2022, arXiv:2205.11487) handles an overshooting estimate by **rescaling** it: take `s`, a high percentile of `|x̂₀|` (at least 1), clip to `[−s, s]`, divide by `s`.

```text
   guided estimate, five pixels:   ( 1.1,  −0.1,  0.4,  −0.9,  1.3 )
   clip to [−1, 1]:                ( 1.0,  −0.1,  0.4,  −0.9,  1.0 )     two pixels flattened at the rail
   rescale by s = 1.3:             ( 0.846, −0.077, 0.308, −0.692, 1.0 )  every ratio between pixels kept
```

- clipping destroys the **difference** between the two brightest pixels (1.1 and 1.3 both become 1.0); rescaling keeps it
- the price: the whole estimate gets dimmer; the sampler restores contrast over the remaining steps


---

## Guide only where it helps

Kynkäänniemi et al. (2024, arXiv:2404.07724): guidance is **harmful at high noise**, largely **unnecessary at low noise**, and beneficial only in the middle; restricting it to an interval improved ImageNet-512 FID from 1.81 to 1.40.

```text
   30 steps, guidance at every step:        30 × 2 = 60 network evaluations
   guidance on 10 middle steps only:        20 × 1 + 10 × 2 = 40 evaluations      (a third fewer)
```

- at high noise the estimate is the data mean; extrapolating it pushes every sample toward the **same** layout, the variety loss again
- at low noise the image is decided; guidance there only adds contrast


---

## Flow matching: the straight-line version

If the goal is an ODE from noise to data, the forward process need not be a diffusion. Draw the **straight line**:

```text
   x_t = (1 − t)·x₀ + t·ε          dx_t/dt = ε − x₀        (constant along the line)

   train:   a network v(x_t, t) ≈ ε − x₀, by squared error
   sample:  Euler from t = 1 down to 0:   x ← x − Δt · v(x, t)

   exact marginal velocity for a finite dataset:
       v(x_t, t) = (x_t − x̂₀) / t,     x̂₀ = Σ wᵢ xᵢ,   wᵢ ∝ exp( −‖x_t − (1−t)xᵢ‖² / 2t² )
```

- every ingredient survives: a schedule (weights `1 − t` and `t`), a posterior-mean target, conditioning, guidance
- straight paths are the point: **an Euler step along a straight line is exact**


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

## Straight lines help the sampler, measured

The chapter's sampler table: the same exact denoiser on the spiral, mean distance of 300 samples to the data (lower is better).

| steps | DDIM | flow matching |
| ----- | ---- | ------------- |
| 10 | 0.0641 | 0.0342 |
| 20 | 0.0197 | 0.0099 |
| 50 | 0.0086 | 0.0077 |
| 100 | 0.0081 | 0.0055 |

<img src="../../textbook/figures/diff-sampler-steps.svg" class="media-shot" style="max-height: 118px;" alt="mean nearest distance to the data against the number of sampling steps for DDPM, DDIM and flow matching on a log axis">

- at 10 and 20 steps the straight-path sampler halves the error; at 100 both are at the data's own resolution


---

## Crossing paths, and why reflow straightens them

Pair each noise with a data point at random and the straight segments can **cross**; the learned velocity at a crossing is an average, and the average path bends.

```text
   data {−1, +1}, noises {+0.8, −1.2}
   random pairing:   −1 ↔ +0.8,  +1 ↔ −1.2        paths meet at t = 0.5, x = −0.1
                     total squared length 1.8² + 2.2² = 8.08
   re-paired:        −1 ↔ −1.2,  +1 ↔ +0.8         no crossing
                     total squared length 0.2² + 0.2² = 0.08
```

- **rectified flow** (Liu et al. 2022) samples the trained model once, pairs each noise with the image it produced, and trains again on those pairs: the new paths do not cross
- straighter paths, fewer steps: the route to one-to-four-step samplers


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

## From a thousand steps to four

| method | idea | steps |
| ------ | ---- | ----- |
| DDPM (2020) | the stochastic reverse chain | 1,000 |
| DDIM (2021) | the deterministic ODE, larger steps | 20 to 50 |
| progressive distillation (Salimans & Ho 2022, arXiv:2202.00512) | a student learns to do two teacher steps in one; repeat | 1,024 → 4 in 8 halvings |
| consistency models (Song et al. 2023, arXiv:2303.01469) | map any point on a trajectory straight to its end | 1 to 2 |

```text
   a guided 50-step sampler:    50 steps × 2 passes = 100 network evaluations
   a distilled 4-step sampler with guidance folded in:  4 evaluations       25× fewer
```


---

## Three scalings: digits to Stable Diffusion

| | the course's network | Stable Diffusion (2022) |
| - | -------------------- | ----------------------- |
| the point | 20×20 gray, 400 numbers | a 64×64×4 latent (16,384 numbers) for a 512×512×3 image |
| the condition | a class index, via a learned 64-vector | a caption, via CLIP's text encoder, read at every layer |
| the network | a 3-layer perceptron, 10⁶ weights | a U-Net (later a transformer), about 10⁹ weights |
| the data | 60,000 digits | billions of captioned images |
| schedule, loss, sampler, guidance | | **the same** |

<img src="../../textbook/figures/diff-guidance-latent.svg" class="media-shot" style="max-height: 150px;" alt="guidance as extrapolation on the left; on the right the block diagram of latent diffusion: encoder, diffusion in the latent, decoder, with the caption entering through cross-attention">


---

## Scaling the point: diffuse a latent

```text
   image 512×512×3 = 786,432 numbers  ──encoder──▶  latent 64×64×4 = 16,384 numbers
   ratio 48×                            diffuse and denoise here            ──decoder──▶ image, once

   numbers pushed through the denoiser per image:
     1,000 steps on pixels:  786,432,000        30 steps on the latent:  491,520      (1,600× fewer)
```

- latent diffusion (Rombach et al. 2022) **is** Stable Diffusion; it is why the method fits on a gaming GPU
- the latent keeps **layout, shape and color**; the decoder, trained with perceptual and adversarial losses, **re-synthesizes the fine texture**
- a 768×768 image at the same 8× downsampling: a 96×96×4 latent, still 48× smaller


---

## The autoencoder behind the latent

A **variational** autoencoder (Kingma & Welling 2014):

```text
   encoder:   image  ──▶  a mean μ and a variance σ² for each latent number
   sample:    z = μ + σ·ε,   ε ~ N(0, 1)            (the decoder is trained on samples, not on μ)
   decoder:   z  ──▶  image
   loss:      reconstruction  +  a small penalty keeping each (μ, σ²) near N(0, 1)
```

- the penalty makes the latent space **smooth with no holes**: every point near the data decodes to something plausible
- without it the diffusion model would have to learn a distribution full of gaps; with it, diffusing a latent is as well posed as diffusing pixels


---

## The penalty, on one latent number

The penalty is the Kullback-Leibler divergence from the encoder's Gaussian to the standard normal, in closed form per number:

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

## What eight-fold downsampling costs

Each latent cell stands for an **8×8 block** of pixels. The decoder, not the diffusion model, decides everything inside a block.

```text
   a 12-pixel-tall letter:   12 / 8 = 1.5 latent cells tall
   a 32-pixel face:          32 / 8 = 4 cells across: eyes, nose and mouth share 16 cells
   a 512×512 image:          64 × 64 = 4,096 cells in all
```

- small text, distant faces and fingers are drawn **mostly by the decoder**, from a handful of numbers: that is where latent models fail first
- the fixes at scale: more latent channels (16 instead of 4 in later models) and higher resolutions


---

## Scaling the condition: text in the class slot

The digit network's class vector becomes the caption's token vectors, read by **cross-attention**: queries from an image token, keys and values from the caption's tokens.

```text
   one image token:  q = (1, 0.5)          caption "a red cube", d = 2
   token     key k           value v       score q·k/√2     weight
   "a"       (0.2, 0.1)      (0, 0)        0.177            0.189
   "red"     (1.5, 0.2)      (1, 0)        1.131            0.490
   "cube"    (0.4, 1.2)      (0, 1)        0.707            0.321

   the token's update: 0.189·(0,0) + 0.490·(1,0) + 0.321·(0,1) = (0.490, 0.321)
```

- the weights depend on the **data**: a different image token asks a different question of the same caption
- the caption's vectors come from **CLIP**'s text encoder (Radford et al. 2021), trained so an image and its caption embed near each other


---

## Cross-attention at Stable Diffusion scale

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

## Attention maps are editable

A token's cross-attention weights say **where** in the image each word acts. Keep the weights, change a word's value vector, and the edit lands in the same place:

```text
   the image token from before, caption "a red cube":   weights (0.189, 0.490, 0.321)
   update:  0.490·(1, 0) + 0.321·(0, 1)            = (0.490, 0.321)

   swap "cube" → "sphere", keep the weights:   v_sphere = (0.2, 0.9)
   update:  0.490·(1, 0) + 0.321·(0.2, 0.9)        = (0.554, 0.289)
```

- Prompt-to-Prompt (Hertz et al. 2022, arXiv:2208.01626) injects the original run's attention maps into the edited run: the layout stays, the object changes
- without the injection, a one-word change re-rolls the whole picture


---

## Which text encoder?

| model | text encoder | trained on |
| ----- | ------------ | ---------- |
| Stable Diffusion v1 | CLIP ViT-L/14 text tower, frozen | image-caption pairs (contrastive) |
| Imagen (Saharia et al. 2022) | T5, a frozen language model | text only |

- Imagen's finding (its abstract): making the **language model** bigger improved fidelity and image-text alignment **much more** than making the image model bigger
- CLIP's text vectors know what things **look like**; a language model's know how words **relate**: counting, negation, "the red cube left of the blue sphere"


---

## Scaling the network

- the course's denoiser: a perceptron, a million weights, fifteen minutes of CPU
- 2020 to 2022: **U-Nets**, convolutional, with attention layers at the coarse resolutions
- 2023 on: **diffusion transformers** (DiT, Peebles & Xie 2023): cut the latent into patches, treat them as tokens, stack attention layers
- quality followed scale; the recipe did not change

```text
   a 64×64×4 latent, 2×2 patches  →  32×32 = 1,024 tokens of 16 numbers each
   one self-attention layer compares every token with every other:  1,024² = 1,048,576 scores
```


---

## ControlNet: structure from the pipeline

<div class="two"><div>

A **trainable copy** of the frozen model's encoder reads a structural image (depth, normals, edges) and adds its features back into the frozen model through connections that **start at zero**, so training begins from the unchanged model (Zhang, Rao & Agrawala 2023).

- the frozen model keeps what it knows about appearance
- the copy learns only "respect this structure"
- depth and normals are **the pipeline's own by-products**

</div><div>

<img src="../../media/generative/controlnet-depth.jpg" class="media-shot" style="max-height: 250px;" alt="left: the estimated depth map of a toy robot at a lectern; right: a generated stormtrooper figure at the same lectern in the same pose">
<small class="credit">lllyasviel/ControlNet README, depth example · Apache-2.0 · github.com/lllyasviel/ControlNet</small>

</div></div>


---

## Your depth buffer is not that depth map

<img src="../L17-diffusion-2/figures/depth-buffer.svg" class="media-shot" style="max-height: 250px;" alt="the stored depth-buffer value rising steeply near the eye and flattening toward the far plane, against a straight line linear in distance">

```text
   n = 1, f = 8 (the viewing chapter's P):   A = −(f+n)/(f−n) = −1.2857    B = −2fn/(f−n) = −2.2857
   distance 2:  NDC z = 0.1429,  buffer = 0.571        half the buffer's range is spent by distance 1.78
   back to distance:   d = B / (z_ndc + A)             z_ndc = 0.1429  →  d = −2.2857 / −1.1428 = 2.0
```

- feed the raw buffer and the whole scene past distance 3 sits in the top quarter of the range: the condition is **nearly flat**
- linearize first, then map to the model's convention (in the example above, near is bright)


---

## Zero convolutions: why ControlNet starts as the original

The copy's features enter the frozen model through a layer whose weight starts at **zero**:

```text
   y = F(x) + w · g(x, c)          F frozen, g the trainable copy, w initialized to 0

   step 0:   w = 0  →  y = F(x): exactly the original model's output
   but ∂L/∂w = g · ∂L/∂y ≠ 0:      g = 0.7,  ∂L/∂y = 0.4   →   ∂L/∂w = 0.28
   one SGD step, lr = 0.1:         w = −0.028             the control signal is born
```

- training cannot damage the frozen model at the start, so a few thousand condition-image pairs suffice
- the zero weight has a nonzero gradient because the copy's features `g` are not zero


---

## Rendering the conditions yourself

Your renderer can write every condition a ControlNet reads, if the encodings match:

```text
   normals:  view-space unit normal → RGB by (n + 1)/2 · 255
             n = (0, 0.6, 0.8)   →   (128, 204, 230)
   depth:    linear distance, near bright:  (far − d)/(far − near)
             n = 1, f = 8, d = 2  →  0.857  →  219 of 255
   edges:    a line drawing of silhouettes and creases, white on black
```

- conventions differ between models: which way is `+y` in the normal map, whether near is bright; check the model's examples before feeding your buffers
- the depth line is the linearized buffer of the pitfall slide, remapped to near-bright


---

## Inpainting: the condition as extra channels

Stable Diffusion's inpainting model reads **9 channels** instead of 4:

```text
   4   the noisy latent x_t
   4   the encoded image with the hole blanked
   1   the mask, downsampled to 64×64
   ──
   9   channels  →  64 × 64 × 9 = 36,864 numbers into the first layer
```

- the 5 extra input channels' weights start at **zero**, the same trick as ControlNet: the model begins as the text-to-image model and learns to use them
- concatenation is the cheapest way in: no new layers, only a wider first one


---

## SDEdit: start from your sketch

Meng et al. (2021, arXiv:2108.01073): noise a rough input to a time `t₀`, then run the ordinary sampler from there. On the spiral, a "sketch" at `(0.9, 0.9)`, 0.648 from the data:

```text
   t₀      after DDIM to t = 0      distance to the data     moved from the sketch
   0.2     (0.467, 0.377)           0.016                    0.678
   0.5     (0.517, 0.248)           0.006                    0.756
   0.8     (0.156, 0.084)           0.010                    1.104
```

- small `t₀` stays **close to the sketch**; large `t₀` forgets it; every run lands **on** the data
- this is how a rough render, a paint-over or a blocky layout becomes a realistic image with the same composition


---

## Our render, "made more realistic"

<div style="display:flex; gap:14px; justify-content:center; align-items:center;">
<img src="../../media/ai/hair-render-source.jpg" style="width: 33%; border-radius: 8px;" alt="the course's hair render: a primitive head and shoulders with simulated hair blowing back">
<img src="../../media/ai/hair-render-realistic.jpg" style="width: 33%; border-radius: 8px;" alt="a photoreal woman in the same pose with the same pink-tipped hair blowing back">
</div>

```text
   left:  this course's render (simulated hair, primitive head)      right:  Gemini, "make a more realistic version"
```

<small class="credit">left: course render · right: AI-generated by Marcel Gavriliu with Google Gemini, 2026</small>

- kept: **pose, framing, lighting direction, the hair's shape and color**; replaced: everything that looked like primitives
- the render supplied the **composition**; the model supplied **realism**, the SDEdit trade on a production model


---

## Text to 3D: score distillation

Optimize a 3D scene θ (a NeRF, or Gaussians) so that **its renders score well** under a text-conditioned image model (DreamFusion, Poole et al. 2022):

```text
   loop:
     pick a random camera;  render   x = g(θ)                      (differentiable renderer)
     pick t and ε;          noise it x_t = √ᾱ·x + √(1−ᾱ)·ε
     ask the frozen model:  ε̂ = ε̂(x_t; caption, t)
     update:                θ ← θ − lr · w(t) · (ε̂ − ε) · ∂x/∂θ     (the denoiser's own Jacobian is dropped)
```

- the image model **judges**, the renderer **renders**, the gradient flows back through the renderer only
- no 3D training data: the image model already knows what the object looks like from any angle


---

## One score-distillation step by hand

Make the "scene" a 2D point θ and the renderer the identity (`x = θ`). The image model is the exact spiral denoiser. Then

```text
   ε̂ − ε = √ᾱ·(θ − x̂₀(x_t)) / √(1−ᾱ)          choose w(t) = √(1−ᾱ)/√ᾱ:   step = θ − x̂₀(x_t)

   θ = (0.5, 0.5),  t = 0.5 (√ᾱ = 0.703, √(1−ᾱ) = 0.711),  ε = (0.3, −0.4)
   x_t   = 0.703·(0.5, 0.5) + 0.711·(0.3, −0.4) = (0.565, 0.067)
   x̂₀    = (0.074, 0.087)          ε̂ = (0.720, 0.008)          ε̂ − ε = (0.420, 0.408)
   w·(ε̂ − ε) = (0.426, 0.413) = θ − x̂₀   ✓
   lr = 0.05:   θ ← (0.5, 0.5) − 0.05·(0.426, 0.413) = (0.479, 0.479)
```

- score distillation moves the scene **toward the denoiser's estimate of its own noised render**


---

## What score distillation converges to

<img src="../L17-diffusion-2/figures/sds-toy.svg" class="media-shot" style="max-height: 290px;" alt="left: twelve points pulled by score distillation from scattered starts to one clump near the spiral's center; right: DDIM carries the same twelve starts onto twelve different places on the spiral">

- 400 steps: all twelve collapse to **one point** (spread 0.035), **0.122 off the data**; DDIM: spread 0.48, 0.006 from the data
- it seeks a θ likely **at every noise level at once**; at high noise the estimate is the data's mean, so it **averages**, it does not sample


---

## DreamFusion, by the numbers

From the paper (Poole et al. 2022, arXiv:2209.14988):

```text
   image model:       Imagen's 64×64 base model, frozen            renders:  64×64
   timesteps:         t ~ U(0.02, 0.98)                           (the extremes are numerically unstable)
   guidance:          w = 100                                     (image sampling uses 5 to 30)
   optimization:      15,000 iterations, about 1.5 hours on a TPUv4 machine with 4 chips
   view prompts:      elevation above 60°: append "overhead view";
                      otherwise a weighted mix of "front view", "side view", "back view" by azimuth
```

- the view prompts are a **patch for the extra-face problem**: they tell the judge which side it is looking at
- 64×64 renders explain the soft look of the results; the successors add resolution


---

## After DreamFusion

| paper | what it changed |
| ----- | --------------- |
| Magic3D (Lin et al. 2022, arXiv:2211.10440) | coarse NeRF first, then a **mesh** refined with a latent diffusion model at high resolution |
| ProlificDreamer (Wang et al. 2023, arXiv:2305.16213) | **variational** score distillation: treats the 3D scene as a random variable, works at ordinary guidance, less saturation |
| Zero-1-to-3 (Liu et al. 2023, arXiv:2303.11328) | an image model conditioned on a **relative camera change**: the step to the multi-view route |

- all three keep the core loop: render, noise, ask a frozen image model, backpropagate through the renderer
- the next lecture takes the multi-view route further


---

## Judging a generator: FID

A generator's samples are supposed to be new, so there is no reference image. Compare **distributions** instead (Heusel et al. 2017):

```text
   embed many generated and many real images with a fixed network (Inception, 2,048 features)
   fit a Gaussian to each set;   FID = ‖μ_g − μ_r‖² + tr( Σ_g + Σ_r − 2(Σ_g Σ_r)^½ )

   toy FID on the digits (2 principal coordinates instead of 2,048 features):
     half the data vs the other half   0.12     exact denoiser (copies)   0.40
     blurred average (h = 5)           0.65     the network's samples     0.88
     uniform noise                     59.7
```

- blind spot 1: **copies score best**; FID cannot see memorization
- blind spot 2: it sees only what its embedding sees; a model can have an excellent FID and draw six fingers


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


---

## Precision and recall: quality and coverage apart

Kynkäänniemi et al. (2019, arXiv:1904.06991) ask two questions with nearest-neighbor balls: are the samples **on** the data (precision), and does the data get **covered** (recall)?

```text
   real points   0, 1, 2, 3, 4          each real ball: radius to its nearest real neighbor = 1
   generated     0.4, 1.2, 3.1, 6       each generated ball: radius to its nearest generated neighbor

   precision:  samples inside some real ball:        0.4 ✓   1.2 ✓   3.1 ✓   6 ✗        3/4 = 0.75
   recall:     real points inside some sample ball:  0 ✓ 1 ✓ 2 ✓ 3 ✓ 4 ✓                   5/5 = 1.00
```

- heavy guidance raises precision (typical samples) and lowers recall (less variety); one FID number mixes the two
- in practice the points are image embeddings and the balls use the `k`-th nearest neighbor, `k = 3`


---

## CLIP score: does the image match the caption?

Embed the image and the caption with CLIP; the score is their **cosine**:

```text
   image embedding   (0.6, 0.8, 0)
   caption A         (0.8, 0.6, 0)      cosine 0.96
   caption B         (0, 0.6, 0.8)      cosine 0.48
```

- measures prompt following, not quality: a caption-matching blur can score well
- the same dot product as attention scores and embedding similarity in the networks lecture


---

## Memorization, measured

Carlini et al. (2023, arXiv:2301.13188) extracted **over a thousand training images** from state-of-the-art diffusion models with a generate-and-filter pipeline: generate many samples per caption, keep the ones that are near-identical to each other, check against the training set.

- duplicated training images are the ones most likely to be memorized
- FID rewards memorization; only a novelty test catches it
- the course's demo carries one: the **nearest training digit** readout, whose distance stays well above the copy threshold at every guidance scale


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

## What still breaks, and what the pipeline supplies

| failure of a diffusion model | why | what graphics has instead |
| ---------------------------- | --- | ------------------------- |
| the cup changes between frames | no object persists between samples | a scene graph: the cup is one node |
| hands with six fingers, text that does not spell | fine structure drawn by the decoder from a few latent cells | geometry and glyphs, drawn exactly |
| cannot move the camera an inch | no camera exists | `V`, recomputed per frame |
| an edit changes everything | every sample re-rolls the whole picture | edit a node, re-render |
| physics is only plausible | nothing integrates motion | a simulation step |

- the merged field uses each for what it is good at: the pipeline for **structure and control**, the model for **appearance**


---

## The papers

| Year | Paper | What it added |
| ---- | ----- | ------------- |
| 2014 | Kingma & Welling, VAE | the autoencoder behind latent diffusion |
| 2017 | Heusel et al. | the Fréchet inception distance |
| 2021 | Radford et al., CLIP | text and images in one space |
| 2022 | Ho & Salimans | classifier-free guidance |
| 2022 | Rombach et al., latent diffusion | Stable Diffusion: diffuse in a latent |
| 2022 | Lipman et al., flow matching; Liu et al., rectified flow | straight paths from noise to data |
| 2022 | Poole et al., DreamFusion | text to 3D by score distillation |
| 2023 | Zhang, Rao & Agrawala, ControlNet | conditioning on depth, normals, edges |
| 2023 | Peebles & Xie, DiT | the network is whatever scales |

