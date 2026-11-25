<!--
  CSS 551 · TOPIC DECK: Diffusion models II: conditioning, guidance, latents, control, text to 3D (~98 min, 41 content slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/diffusion-2.md"> among others; it carries no
  logistics (no title, Thursday, homework, wrap) and no "Part N" numbering.

  GOALS: the pieces that turn the first lecture's recipe into the systems people use, as a survey of methods:
         for each, the problem, the idea in words or one picture, where it breaks, who uses it.
  OUTCOMES: Students can
    - explain how a condition (a class, a caption, a depth image) reaches the denoiser, and why one network
      trained with its condition dropped about 15 % of the time supplies both estimates guidance needs;
    - say what raising the guidance weight w does (closer to the condition, less variety, saturation) and why
      guidance doubles the cost of a step;
    - explain why straight paths (flow matching, reflow) and distillation cut the step count, from about 100
      network evaluations per image to 4;
    - explain what latent diffusion gains (48 times fewer numbers to denoise) and what it gives up (the detail
      inside each 8 × 8 block: small text, faces, fingers);
    - describe cross-attention as each image region weighing the caption's words, and ControlNet, inpainting
      and SDEdit as ways to impose structure, including conditions rendered by their own pipeline;
    - describe score distillation as a frozen image model judging renders from random cameras, and say why it
      averages rather than samples (smooth, saturated, many-faced results);
    - say what FID, precision and recall, CLIP score and a memorization test each measure and miss.
  EDIT 2026-11-24 LESS MATH (Marcel: "PCA, eigenvalues, hilbert spaces... way over the math level of the class.
           can the following lectures use less math?"): rewritten as a conceptual method survey, 64 to 41 content
           slides. Every derivation, worked arithmetic and formula-heavy slide moved, in this topic's order, to
           topics/diffusion-2-supplement.md (mounted after the wrap). Formulas left on core slides: the DDIM step
           (HW8's ddimStep) and the guidance mix (Quiz 8, dif-cfg-concept), each read aloud in words beside it.
           New on core slides: the guidance figure diff-net-guidance.png; flow matching, reflow, the autoencoder,
           cross-attention, attention editing, the depth-buffer pitfall, score distillation and FID in words.
           Each acronym spelled out and each Greek letter named at its first use in this file.
  TEACHES: the five ways a condition reaches the denoiser; the class and time slots of the course's network; condition
           dropout; classifier-free guidance, its history (classifier guidance), negative prompts, its cost in
           saturation, dynamic thresholding and the guidance interval; flow matching, reflow, distillation to few steps;
           the three scalings: latent diffusion and its autoencoder, text through cross-attention and attention
           editing, text encoders, the network family; ControlNet, the depth-buffer pitfall, rendering the conditions,
           inpainting, SDEdit; score distillation, what it converges to, DreamFusion and its successors; FID,
           precision and recall, CLIP score, memorization; what the pipeline supplies.
  NEEDS:   the first diffusion topic (the forward process, the exact denoiser, DDPM and DDIM); the networks and
           embeddings topic (embeddings, attention); viewing (the projection matrix and the depth buffer); the
           learned-scenes idea of a differentiable renderer is introduced here in one slide.
  DEMOS:   data-demo="diffusion-net" data-controls="guide,steps" (demo-full);
           data-demo="diffusion-digits" data-controls="smooth,guide" (demo-full; smooth first so the harness probe changes pixels).
  NUMBERS: computed with node scripts on lib/core/diffusion.js and lib/core/diffusion-nd.js (spiral exact denoiser,
           MNIST subset with the demo's seed 5); textbook/figures/numbers.json (samplerSteps).
  FIGURES: ../../textbook/figures/diff-*.svg|png (tools/gen-textbook-figures.mjs, numbers.json);
           ../../lectures/L18-diffusion-2/figures/{sds-toy,depth-buffer}.svg and numbers.json
           (tools/gen-lecture-figures-d2.mjs). Media: ../../media/generative/{cfg-row,controlnet-depth}.jpg,
           credit lines verbatim from media/generative/CREDITS.md.

  reveal.js: FLAT (every slide a top-level "---" section). Notes follow "Note:".
  Plain unicode math or fenced ```text blocks. Never two "_" on one markdown line
  outside a code fence. No <small> on math. Paths are relative to the lecture page
  that mounts this topic (lectures/LNN-slug/index.html).
  HISTORY: densified 2026-09-29; expanded to 70 slides 2026-10-05; CUT 2026-10-08: the five multiple-choice Check
           slides; PATHS 2026-10-25: figures moved from lectures/L17-diffusion-2 to lectures/L18-diffusion-2.
-->

### Diffusion models II: conditioning, guidance, latents, control, text to 3D

<small>(~98 min)</small>


---

## Where the recipe stands

```text
   forward:   x_t = √ᾱ·x₀ + √(1 − ᾱ)·ε            the clean image, faded, plus noise
   denoiser:  x̂₀(x_t, t)                           the network's best guess of the clean image
   DDIM:      x_next = √ᾱ_next·x̂₀ + √(1 − ᾱ_next)·ε̂
              "re-noise the best guess to the next, lower noise level"
```

- ε (epsilon) is the drawn noise; ᾱ (alpha-bar), the schedule, says how much of the image survives at time t; ε̂ is the noise the guess implies
- DDIM (denoising diffusion implicit models) adds **no fresh noise**: one start gives one result; fewer steps mean fewer network calls and a less accurate landing
- everything tonight changes **what goes into x̂₀**, or **where x lives**; the sampler stays


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

The course's digit network (1,002,064 weights) reads one long input vector:

```text
   [ the noisy image: 400 numbers | the time: 64 numbers | the class: 64 numbers ]   →  528 numbers

   digit c = 0 … 9   →   a learned vector of 64 numbers for that digit
   "no class"        →   an eleventh learned vector
```

- the same weights for every class: only the class's 64 numbers change with the label
- every richer condition later tonight (a caption, a depth map) is this slot with more numbers in it


---

## How the time gets in

The noise level becomes **64 numbers**: sines and cosines of the time at 32 frequencies, from fast to slow.

- fast waves tell **neighboring steps** apart; slow waves say roughly **where** in the run a step is
- the same idea as a transformer's position encoding and the positional encoding of NeRF (neural radiance fields): hand a small network a range of frequencies
- these 64 numbers fill the time slot of the input on the last slide


---

## Training with the condition dropped

The training loop of the first lecture, with one coin flip added:

```text
   for each training image and its label:
       with probability 0.15, replace the label by "no class"
       noise the image to a random level, ask the network for the clean image, penalize the squared error
```

- one network, one loss, two tasks: the **conditional** and the **unconditional** estimate share every weight
- drop too rarely and the unconditional estimate is poor; too often and the conditional one is; 10 to 20 % is typical


---

## Classifier-free guidance

At sampling time, run the network **twice** per step, with the label and without, and step **past** the labeled guess:

```text
   x̂₀ ← x̂₀(∅) + w · ( x̂₀(c) − x̂₀(∅) )       "start from the unlabeled guess; add w times the change the label makes"
```

<div style="display:flex; gap:18px; align-items:center;"><div style="flex:0 0 52%; font-size:0.78em;">

- w = 0 ignores the label; w = 1 is plain conditioning; w > 1 exaggerates it
- samples match the label **more strongly** and **vary less**
- two passes per step: guidance **doubles the cost**

</div><div style="flex:1 1 48%;">
<img src="../../textbook/figures/diff-net-guidance.png" class="media-shot" style="width:100%; max-height:250px;" alt="the course's network asked for a 3 from the same eight noises at guidance weights 0, 1, 2, 4 and 8 (rows): assorted digits at 0, varied 3s at 1, then bolder and more alike 3s, blotchy at 8">
<small>the course's network asked for a 3; rows w = 0, 1, 2, 4, 8</small>
</div></div>


---

## Before classifier-free: classifier guidance

Dhariwal & Nichol (2021) steered the sampler with a **separate classifier**, trained on noisy images, that said which way makes the image more "a c":

| | classifier guidance (2021) | classifier-free guidance (2022) |
| - | ------------------------- | -------------------------------- |
| extra network | a classifier trained on noisy images at every noise level | none: the same denoiser with and without c |
| per step | one denoiser pass and one classifier pass back | two denoiser passes |
| conditions | only what the classifier knows (1,000 ImageNet classes) | anything the denoiser reads: captions, depth |

- Ho & Salimans (2022): the difference between the denoiser's two guesses points the same way as the classifier's steering, so the classifier can go


---

## Negative prompts

Fill the "no class" slot with a caption of what you **do not** want.

- guidance steps from the "no class" guess toward the prompt's guess; with a negative prompt it steps from the **negative's** guess toward the prompt's
- the step now points **toward the prompt and away from the negative**
- same cost: two passes per step, the second with the negative caption in the "no class" slot
- users type "blurry, extra fingers" there; the model moves away from its own idea of those, and can over-correct


---

<!-- .slide: class="demo-full" -->

## The guide knob, live

<div class="cockpit" data-demo="diffusion-net" data-controls="guide,steps"><pre class="viz-fallback">  a trained class-conditional MLP (multilayer perceptron) denoiser
  (≈1,000,000 weights, 15 minutes of training on a laptop processor, on
  60,000 MNIST digits: the Modified National Institute of Standards and
  Technology handwritten-digit set) samples 12 digits from noise
  buttons: which digit (conditioning)   guide: classifier-free guidance w
  the panel: nearest training digit, distance well above the memorization
  threshold for every sample: these digits were learned, not looked up
  MNIST (LeCun, Cortes, Burges) · CC BY-SA 3.0</pre></div>


---

<!-- .slide: class="demo-full" -->

## Guidance on a lookup table, live

<div class="cockpit" data-demo="diffusion-digits" data-controls="smooth,guide"><pre class="viz-fallback">  2,000 MNIST digits (20×20); the denoiser is the exact posterior mean
  digit buttons: the condition (3 by default)    guide: classifier-free w
  smooth: kernel bandwidth h (0 = exact, every sample a training digit)
  the panel: the selected sample beside its nearest training digit
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

Kynkäänniemi et al. (2024, arXiv:2404.07724): guidance is **harmful at high noise**, largely **unnecessary at low noise**, and beneficial only in the middle; restricting it to an interval improved ImageNet-512 FID (Fréchet inception distance, the quality score at the end of tonight; lower is better) from 1.81 to 1.40.

```text
   30 steps, guidance at every step:        30 × 2 = 60 network evaluations
   guidance on 10 middle steps only:        20 × 1 + 10 × 2 = 40 evaluations      (a third fewer)
```

- at high noise the estimate is the data mean; extrapolating it pushes every sample toward the **same** layout, the variety loss again
- at low noise the image is decided; guidance there only adds contrast


---

## Flow matching: the straight-line version

<div style="display:flex; gap:18px; align-items:center;"><div style="flex:0 0 50%; font-size:0.78em;">

- pair each training image with a noise image and join them by a **straight line**
- train the network to predict the **direction** along the line (the velocity); sampling follows it from noise to data in small steps
- the same ingredients: a noise level, a squared-error loss, conditioning, guidance
- an Euler step (a straight step of size Δt (delta t) along the current direction) is **exact** along a straight path, so a few steps follow it closely
- Lipman et al. (2022); Liu et al. (2022)

</div><div style="flex:1 1 50%;">
<img src="../../textbook/figures/diff-flow-paths.svg" class="media-shot" style="width:100%; max-height:400px;" alt="six particles from the same starts under DDIM and under the exact flow-matching velocity; the flow paths are straighter">
<small>six starts, under DDIM and under flow matching</small>
</div></div>


---

## Straight lines help the sampler, measured

The chapter's sampler table: the same exact denoiser on the spiral, mean distance of 300 samples to the data (lower is better).

| steps | DDIM | flow matching |
| ----- | ---- | ------------- |
| 10 | 0.0641 | 0.0342 |
| 20 | 0.0197 | 0.0099 |
| 50 | 0.0086 | 0.0077 |
| 100 | 0.0081 | 0.0055 |

<img src="../../textbook/figures/diff-sampler-steps.svg" class="media-shot" style="max-height: 118px;" alt="mean nearest distance to the data against the number of sampling steps for DDPM (denoising diffusion probabilistic models), DDIM and flow matching on a log axis">

- at 10 and 20 steps the straight-path sampler halves the error; at 100 both are at the data's own resolution


---

## Crossing paths, and why reflow straightens them

- pair images with noises **at random** and the straight segments **cross**: at a crossing the network sees one point on two paths, learns their average direction, and the sampled path **bends**
- **rectified flow** (Liu et al. 2022): run the trained model once, pair each noise with the image it produced, and train again on those pairs
- the model's own paths never cross, so the new paths are **straighter**: fewer steps for the same accuracy, the route to samplers of one to four steps


---

## From a thousand steps to four

| method | idea | steps |
| ------ | ---- | ----- |
| DDPM (denoising diffusion probabilistic models, 2020) | the stochastic reverse chain | 1,000 |
| DDIM (2021) | deterministic: no fresh noise per step, so larger steps | 20 to 50 |
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
| the condition | a class index, via a learned 64-vector | a caption, via CLIP's (contrastive language-image pretraining) text encoder, read at every layer |
| the network | a 3-layer perceptron, 10⁶ weights | a U-Net (later a transformer), about 10⁹ weights |
| the data | 60,000 digits | billions of captioned images |
| schedule, loss, sampler, guidance | | **the same** |

<img src="../../textbook/figures/diff-guidance-latent.svg" class="media-shot" style="max-height: 118px;" alt="guidance as extrapolation on the left; on the right the block diagram of latent diffusion: encoder, diffusion in the latent, decoder, with the caption entering through cross-attention">


---

## Scaling the point: diffuse a latent

```text
   image 512×512×3 = 786,432 numbers  ──encoder──▶  latent 64×64×4 = 16,384 numbers
   ratio 48×                            diffuse and denoise here            ──decoder──▶ image, once

   numbers pushed through the denoiser per image:
     1,000 steps on pixels:  786,432,000        30 steps on the latent:  491,520      (1,600× fewer)
```

- latent diffusion (Rombach et al. 2022) **is** Stable Diffusion; it is why the method fits on a gaming GPU (graphics processing unit)
- the latent keeps **layout, shape and color**; the decoder, trained with perceptual and adversarial losses, **re-synthesizes the fine texture**
- a 768×768 image at the same 8× downsampling: a 96×96×4 latent, still 48× smaller


---

## The autoencoder behind the latent

A **variational autoencoder** (VAE; Kingma & Welling 2014) sits between the image and the latent:

- the **encoder** maps an image not to one latent but to a small **cloud** around it: a center and a spread for every latent number
- the **decoder** is trained on points drawn from that cloud, so it learns to decode a **neighborhood**, not a single point
- a small penalty keeps every cloud near a standard bell curve: the latent space has **no holes**
- so the diffusion model's samples, which land between training latents, still decode into plausible images


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

The digit network's class vector becomes the caption's **word vectors**, read by **cross-attention** in every layer:

- each image region asks a question (its **query**); each caption word offers a **key** and a **value**
- a region takes a weighted mix of the words' values, weighted by how well each key matches its query: a region showing the cube listens mostly to "cube"
- different regions weigh the same caption differently: that is how a caption says **what goes where**
- the word vectors come from **CLIP**'s text encoder, trained so an image and its caption embed near each other
- captions are cut at **77 tokens**: words past the limit never reach the image


---

## Attention maps are editable

A word's cross-attention weights, over all image regions, form a **map** of where that word acts.

- Prompt-to-Prompt (Hertz et al. 2022): generate once and record the maps; change one word ("cube" to "sphere") and generate again **with the recorded maps**
- the layout stays and only the object changes
- without the recorded maps, a one-word change re-rolls the whole picture


---

## Which text encoder?

| model | text encoder | trained on |
| ----- | ------------ | ---------- |
| Stable Diffusion v1 | CLIP ViT-L/14 (a vision transformer) text tower, frozen | image-caption pairs (contrastive) |
| Imagen (Saharia et al. 2022) | T5 (Text-to-Text Transfer Transformer), a frozen language model | text only |

- Imagen's finding (its abstract): making the **language model** bigger improved fidelity and image-text alignment **much more** than making the image model bigger
- CLIP's text vectors know what things **look like**; a language model's know how words **relate**: counting, negation, "the red cube left of the blue sphere"


---

## Scaling the network

- the course's denoiser: a perceptron, a million weights, fifteen minutes on a laptop processor
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

<img src="../L18-diffusion-2/figures/depth-buffer.svg" class="media-shot" style="max-height: 250px;" alt="the stored depth-buffer value rising steeply near the eye and flattening toward the far plane, against a straight line linear in distance">

- the perspective matrix stores a depth that changes **fast near the camera** and slowly far away: with near 1 and far 8, half the buffer's range is used up by distance 1.78
- feed the raw buffer and everything past distance 3 sits in the top quarter: the condition is **nearly flat**
- convert the buffer back to distance first, then map it to the model's convention (in the example, near is bright)


---

## Rendering the conditions yourself

Your renderer can write every condition a ControlNet reads, if the encodings match:

```text
   normals:  view-space unit normal → RGB (red, green, blue) by (n + 1)/2 · 255
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

SDEdit (stochastic differential editing; Meng et al. 2021, arXiv:2108.01073): noise a rough input to a time `t₀`, then run the ordinary sampler from there. On the spiral, a "sketch" at `(0.9, 0.9)`, 0.648 from the data:

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

Optimize a 3D scene (a NeRF, or 3D Gaussians) so that **its renders look right** to a frozen, text-conditioned image model (DreamFusion, Poole et al. 2022):

```text
   repeat:
     pick a random camera and render the scene              (a differentiable renderer)
     add noise to the render, at a random level
     ask the frozen image model to denoise it, given the caption
     nudge the scene so its render moves toward the model's denoised version
```

- the image model **judges**, the renderer **renders**; the nudge flows back through the renderer only
- no 3D training data: the knowledge comes from a 2D image model judging renders from random cameras
- each view is judged **alone**: nothing asks the views to agree


---

## What score distillation converges to

<img src="../L18-diffusion-2/figures/sds-toy.svg" class="media-shot" style="max-height: 240px;" alt="left: twelve points pulled by score distillation from scattered starts to one clump near the spiral's center; right: DDIM carries the same twelve starts onto twelve different places on the spiral">

- twelve starts, one image model: score distillation pulls all twelve to **one point**, **off the data**; DDIM carries them to twelve points **on** it
- at high noise the model's guess is the data's **average**, and every noise level pulls toward it: it **averages**, it does not sample
- hence smooth, over-simple results; the very high guidance it needs **saturates** the colors


---

## DreamFusion, by the numbers

From the paper (Poole et al. 2022, arXiv:2209.14988):

```text
   image model:       Imagen's 64×64 base model, frozen            renders:  64×64
   noise levels:      drawn evenly from 0.02 to 0.98              (the extremes are numerically unstable)
   guidance:          w = 100                                     (image sampling uses 5 to 30)
   optimization:      15,000 iterations, about 1.5 hours on a TPU (tensor processing unit) v4 machine with 4 chips
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
- the generative 3D topic takes the multi-view route further


---

## Judging a generator: FID

A generator's samples are supposed to be new, so there is no reference image. Compare the **two collections** instead (Heusel et al. 2017):

- a fixed image network turns each image into 2,048 features; FID (Fréchet inception distance) compares the generated and the real **clouds of features** by their average and their spread: 0 means they match
- blind spot 1: **copies score best**; FID cannot see memorization
- blind spot 2: it sees only what its features see: a model can have an excellent FID and draw six fingers
- compare FIDs only at the **same sample count** (commonly 50,000): fewer samples inflate it

```text
   a toy FID on the digits, with 2 coarse features instead of 2,048:
     half the data against the other half   0.12       the exact denoiser (copies)   0.40
     a blurred average                      0.65       the network's samples         0.88
     uniform noise                          59.7
```


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

