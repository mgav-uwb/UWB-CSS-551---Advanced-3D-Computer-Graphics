<!--
  CSS 551 · TOPIC DECK: Diffusion models II: conditioning, guidance, latents, control, text to 3D (~85 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/diffusion-2.md"> among others; it carries no
  logistics (no title, Thursday, homework, wrap) and no "Part N" numbering.

  TEACHES: how a condition reaches the denoiser (the five mechanisms); classifier-free guidance, worked on two numbers, live, and its cost in saturated pixels; flow matching and one Euler step by hand; the three scalings; latent diffusion and the variational autoencoder; cross-attention worked on a three-word caption; ControlNet, and the depth buffer against the linear depth a condition wants; score distillation, one step by hand with the identity renderer, and what it converges to on the spiral; FID and its blind spots; the papers.
  NEEDS:   the first diffusion topic (the forward process, the exact denoiser, DDPM and DDIM); the networks and embeddings topic (embeddings, attention); viewing (the projection matrix and the depth buffer); the learned-scenes idea of a differentiable renderer is introduced here in one slide.
  DEMOS:   data-demo="diffusion-net" data-controls="guide,steps" (demo-full).
  FIGURES: ../../textbook/figures/diff-*.svg|png (tools/gen-textbook-figures.mjs, numbers.json);
           ../../lectures/L17-diffusion-2/figures/{sds-toy,depth-buffer}.svg and numbers.json
           (tools/gen-lecture-figures-d2.mjs). Media: ../../media/generative/{cfg-row,controlnet-depth}.jpg,
           credit lines verbatim from media/generative/CREDITS.md.

  reveal.js: FLAT (every slide a top-level "---" section). Notes follow "Note:".
  Plain unicode math or fenced ```text blocks. Never two "_" on one markdown line
  outside a code fence. No <small> on math. Paths are relative to the lecture page
  that mounts this topic (lectures/LNN-slug/index.html).
-->

### Diffusion models II: conditioning, guidance, latents, control, text to 3D

<small>(~85 min)</small>


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

