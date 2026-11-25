<!--
  CSS 551 · TOPIC DECK · Diffusion models I: destroy, learn to undo, sample (~90 min, 38 content slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/diffusion-1.md"> among others; it carries no
  session logistics (no title, Thursday, homework, wrap) and no "Part N" numbering.
  See topics/README.md for the contract.

  GOALS: diffusion as a method students can explain without derivations. Noise supplies the choices
  a concept leaves open; destroying is fixed arithmetic; the best undo for a finite dataset is a
  weighted average of it; a network trained by plain regression approximates that average; sampling
  re-noises the current guess, a little less each step; the network's smoothness makes new images.
  OUTCOMES: Students can
    - say what is learned and what is fixed in a diffusion model, and why sampling starts from a Gaussian;
    - explain why training can jump to any noise level, and what one training step does;
    - describe the exact denoiser as a weighted average and predict it at very high and very low noise;
    - read the DDIM step as "re-noise the best guess to a lower level", and say what DDPM changes;
    - relate the number of steps to cost and accuracy, and say why DDIM is repeatable and invertible;
    - explain why the exact denoiser memorizes and a trained network draws new images, and how
      memorization is measured.
  EDIT 2026-11-24 LESS MATH (Marcel: "PCA, eigenvalues, hilbert spaces... way over the math level of
  the class. can the following lectures use less math?"): the core rewritten as a conceptual survey,
  69 to 38 content slides. Every derivation and worked step moved, in topic order, to
  topics/diffusion-1-supplement.md, mounted after the wrap: Box-Muller, one pixel forward, steps
  composing, the schedule's formula and tables, the library's schedule, the noise shell, the
  terminal-SNR pitfall, the denoiser derived and worked, the squared-error split, Gaussian shrinkage,
  underflow, the blurred density, Tweedie, the four coordinates, one score arrow, the ε̂ pitfall, the
  weights counted, one training example, the SNR weighting, the loss floor's table, the likelihood
  bound, the reverse step with σ, the DDPM sampler, ten steps in dB, the DDIM and DDPM steps worked,
  the variance check, the ODE and Euler's orders, the two-spike reverse step, the memorization metric,
  the network in node. Formulas kept on core slides are the ones a quiz family (dif-forward-concept,
  dif-denoiser-concept, dif-hw8-ddim) or HW8 (denoise, ddimStep) uses, each read in words. New or
  rewritten core slides: the schedule (what drowns first), which schedule (figure, no table), the
  denoiser as a field of arrows, what the network predicts, the course's network, the loss never
  reaches zero, two samplers (DDIM and DDPM), the sampler in code (DDIM only), why many small steps.
  Acronyms spelled out and Greek letters named at first use (ε epsilon, ᾱ alpha-bar, Σ capital sigma).
  NEEDS:   topics/neural-nets-embeddings.md ("smooth between the examples", "a network is a function",
           softmax, Adam) and topics/image-space.md ("an image is a point", "noise is the missing
           choice", the thin shell, PSNR, the cosine-basis ordering).
  NOT HERE (topics/diffusion-2.md, the next lecture): guidance beyond one sentence, latent diffusion,
           text conditioning at scale, ControlNet, text-to-3D, video, evaluation.
  DEMOS:   data-demo="diffusion-image" data-controls="t"; "diffusion-2d" data-controls="t" (forward)
           and data-controls="steps,stochastic";
           "diffusion-digits" data-controls="steps" and data-controls="smooth"; "diffusion-net"
           data-controls="steps"; all demo-full.
  FIGURES: ../../textbook/figures/diff-*.svg|png (computed by tools/gen-textbook-figures.mjs).
  NUMBERS: the measured values kept here (the spiral's step table, the bandwidth table, the network's
           0.47 and 0.18, 1,002,064 weights) are quoted unchanged from the previous version, which
           took them from tools/gen-lecture-figures-d1.mjs (lectures/L17-diffusion-1/analysis/numbers-d1.json)
           and textbook/diffusion-models.html Sections 1, 3 and 6.
  HISTORY: densified 2026-09-29, expanded 2026-10-05 (54 to 72 content slides), the three Check
           slides cut 2026-10-08; those additions are now mostly in the supplement.
  Replaces, for Plan C, the first half of topics/archive/diffusion-ladder.md (archived).

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Demo embeds live on
  demo-full slides (a short ## title + the embed div + its viz-fallback pre).
  Paths are relative to the lecture page (lectures/LNN-slug/index.html).
-->

### Diffusion models I: destroy, learn to undo, sample

<small>(~90 min)</small>


---

## Noise is the missing choice

A concept fixes a few hundred numbers of a picture; the rest (which cat, which pose, which light) must come from somewhere. Diffusion supplies them as **random noise**.

```text
   destroy:   walk real images into noise on a schedule            (nothing is learned)
   learn:     a network that undoes one small step                 (a regression)
   sample:    start from fresh noise, undo step by step            (one image per noise)
```

- different starting noise, different image: the condition steers, **the noise decides**
- a one-to-many problem becomes a sequence of **one-to-one steps**, each of which a network can learn
- the idea: Sohl-Dickstein et al. 2015; made practical: Ho, Jain & Abbeel 2020, DDPM (denoising diffusion probabilistic models)


---

## The generative model families

| family | a sample is made by | strength | weakness |
| ------ | ------------------- | -------- | -------- |
| VAE, variational autoencoder (2013) | decoding a random code | one pass | blurry |
| GAN, generative adversarial network (2014) | a generator trained against a critic | sharp, one pass | unstable, drops modes |
| autoregressive (2016) | one pixel at a time | exact likelihood | one step per pixel |
| flow (2016) | an invertible network on noise | exact likelihood | restricted networks |
| **diffusion** | many small denoising steps | stable, sharp, diverse | many network calls |

- diffusion trades **sampling cost** for the easiest training of the five: a squared error against a target it makes itself


---

## Independent pixels are not enough

The simplest generator: learn each pixel's own distribution from the data, then draw every pixel independently.

- every pixel's **histogram** would be right, and the image would be **static**: which pixels are dark depends on which other pixels are dark
- the information is in the **joint** distribution; for 400 black-or-white pixels a full table of it has 2⁴⁰⁰ entries
- every family on the previous slide is a way to represent that joint distribution **without** the table; diffusion does it as a chain of small, learnable steps


---

## The forward process

Mix the picture with noise, more noise as t runs from 0 to 1:

```text
   x(t)  =  √ᾱ(t) · x(0)   +   √(1 − ᾱ(t)) · ε
             how much picture       how much noise
```

- ε (epsilon): fresh Gaussian noise, one bell-curve number per pixel; ᾱ(t) (alpha-bar): the **schedule**, falling from 1 (all picture) at t = 0 to 0 (all noise) at t = 1
- the two weights trade off so the overall spread of pixel values stays fixed while the share that is picture shrinks
- at t = 1 **every** image has become the same plain Gaussian noise: the one thing we know how to draw from
- nothing is learned in this direction; it is fixed arithmetic


---

## The forward process, in code

```js
// x0: clean image as numbers in [-1, 1]; t in [0, 1]
function noisify(x0, t, rng) {
  const a = alphaBar(t);                            // the schedule
  const eps = x0.map(() => randn(rng));             // one Gaussian number per pixel
  const xt = x0.map((v, i) => Math.sqrt(a) * v + Math.sqrt(1 - a) * eps[i]);
  return { xt, eps };                               // the training pair: input xt, target eps (or x0)
}
```

- no loop over noise steps: the formula **jumps** to any t in one line per pixel
- why one jump is allowed: many small noise steps add up to one larger Gaussian noise, so the chain never has to be simulated
- training calls this with a **fresh** t and fresh noise for every example


---

## The schedule: what drowns first

<img src="../../textbook/figures/diff-forward-digit.png" class="media-shot" style="max-height: 120px;" alt="one digit 7 walked forward from t = 0 to t = 1 in eleven panels">

- the schedule ᾱ(t) sets how fast the picture drowns; the course uses the **cosine schedule** (Nichol & Dhariwal 2021)
- fine detail drowns first; the 7's bar and stroke survive to about t = 0.6: coarse structure is the **last** to go
- picture and noise are equally strong at about t = 0.5; on either side the signal-to-noise ratio (SNR) changes steadily


---

## Which schedule

<img src="../../textbook/figures/diff-schedules.svg" class="media-shot" style="max-height: 230px;" alt="the cosine and linear schedules plotted on the same axes">

- DDPM's original **linear** schedule destroyed the picture early: at t = 0.5 only 8 % of its strength was left, so half of training was spent on near-pure noise
- the **cosine** schedule keeps about half at t = 0.5 and spaces the noise levels evenly from almost clean to almost noise
- a schedule is a choice of **which noise levels the network practices on**


---

<!-- .slide: class="demo-full" -->

## A real picture, dissolving

<div class="cockpit" data-demo="diffusion-image" data-controls="t"><pre class="viz-fallback">  left: x(0), the Cornell render (128×128×3 = 49,152 numbers)
  right: x(t) = √ᾱ · x(0) + √(1 − ᾱ) · noise, for the t on the slider
  readout: ᾱ(t), SNR in dB, PSNR against the original
  t = 0.3: ᾱ 0.787, SNR 5.7 dB    t = 0.5: ᾱ 0.494, SNR −0.1 dB    t = 0.9: SNR −16.1 dB</pre></div>


---

## A dataset you can see

400 points on a spiral in the plane: each point is an "image" with two pixels.

<img src="../../textbook/figures/diff-spiral-forward.svg" class="media-shot" style="max-height: 260px;" alt="400 spiral points walked forward: by t = 0.6 the spiral is gone, by t = 1 the cloud is a standard Gaussian">

- by t = 0.6 the spiral is gone; by t = 1 the cloud is plain Gaussian noise
- it would be the **same cloud** for a ring, two moons, or a million photographs
- two dimensions let us draw what happens in 49,152: every rule tonight is shown on the spiral first


---

<!-- .slide: class="demo-full" -->

## The spiral, dissolving

<div class="cockpit" data-demo="diffusion-2d" data-controls="t"><pre class="viz-fallback">  400 points on a spiral; forward mode: each point x(t) = √ᾱ · x(0) + √(1 − ᾱ) · ε
  drag t: by t = 0.6 the spiral is gone; by t = 1 the cloud is plain Gaussian noise
  data buttons: ring, moons: the cloud at t = 1 is the same for every shape
  readout: ᾱ(t) and SNR; t = 0.35 by default</pre></div>


---

## The denoiser's question

Given a noisy x_t and its t: **where was the clean image?** For a finite training set the best answer is exact:

```text
   x̂₀ = Σᵢ wᵢ x⁽ⁱ⁾                      a weighted average
   wᵢ = softmax( −‖x_t − √ᾱ x⁽ⁱ⁾‖² / (2(1 − ᾱ)) )
```

- Σ (capital sigma) sums over the training images x⁽ⁱ⁾; each is weighted by how well it **explains** the noisy one, closer weighing more: the networks lecture's softmax, with distances as scores
- this average is the **posterior mean**, written E[x₀ | x_t]: the best guess in squared error; a trained network approximates it
- compute it with the largest score subtracted first (the softmax guard), or at low noise every weight rounds to 0 (homework 8, HW8: `denoise`)


---

## Two limits

<img src="../../textbook/figures/diff-1d-denoiser.svg" class="media-shot" style="max-height: 200px;" alt="the exact denoiser as a function of the observation at four noise levels, and the density of the noisy data">

- **little noise**: the weights become one-hot, and the answer is the **nearest training image**: the exact denoiser **memorizes**
- **much noise**: every image explains the noise about equally, and the answer is the **average image**, a gray blur
- so every sampling run starts as a blur and sharpens as the noise falls


---

## The denoiser as a field of arrows

<img src="../../textbook/figures/diff-score-field.svg" class="media-shot" style="max-height: 300px;" alt="arrows from grid points to their denoised estimates at t = 0.5 on the spiral">

- each arrow runs from a point of the plane to the denoiser's guess for it, at the halfway noise level
- far from the spiral the arrows point to its **center**; near it, to the **nearest arm**
- a sampler follows these arrows, re-drawn at a lower noise level after each step; the literature calls this field the **score**


---

## What the network predicts

A network can be trained to output the clean image or the noise; the forward formula turns one into the other:

```text
   clean image   x̂₀                                the course's network
   noise         ε̂ = (x_t − √ᾱ x̂₀) / √(1 − ᾱ)       DDPM, Stable Diffusion 1
```

- **same information**, different units: knowing the noisy image and either one gives the other
- the choice moves where small errors grow: a noise prediction gives a poor clean image at very high noise; a third choice, the **velocity**, a blend of the two, behaves well at both ends (Stable Diffusion 2)


---

## Training, in one line

```text
   for step in range(N):
       x0  = random_batch(images)                  # clean images
       t   = uniform(0, 1, size=batch)             # a noise level per image
       eps = normal(0, 1, shape=x0.shape)          # the noise
       xt  = sqrt(abar(t)) * x0 + sqrt(1 - abar(t)) * eps
       loss = mean((net(xt, t, label) - target)**2)       # target = x0, or eps
       loss.backward(); optimizer.step()
```

- noise a clean image to a random level, ask the network for the clean image, penalize the **squared error**
- a small, well-posed **regression** against a target the trainer made itself: no adversary to balance


---

## The course's network

Trained on MNIST, the Modified National Institute of Standards and Technology set of handwritten digits:

```text
   the data       60,000 handwritten digits, 20 × 20 pixels
   the network    3 hidden layers of 512 units, 1,002,064 weights, predicts the clean digit
   its inputs     the noisy digit, the noise level t, the class (which digit)
   the run        about fifteen minutes on a laptop processor: 21 million training examples
```

- every training example was **new**: a fresh t and fresh noise on a known digit, so the data never runs out
- **15 %** of the time the class is replaced by a "no class" code, so the same network also draws without a class; the next lecture's guidance needs both


---

## Pitfall: the loss never reaches zero

- from a noisy image the clean one is genuinely **uncertain**: at high noise many digits could have produced it
- even the perfect denoiser, the weighted average, misses by that uncertainty; at very high noise its error is nearly the whole spread of the data
- a training curve averaged over random noise levels therefore levels off **above zero**: not a bug, not a failure to learn
- losses measured in different units (clean image or noise) have different floors: compare curves, not numbers across them


---

## Sampling: one reverse step

Start from pure noise at t near 1; step t down to 0. Each step: guess, recover the noise, re-noise to a lower level t′, where ᾱ′ = ᾱ(t′) is a little larger.

```text
   guess            x̂₀  = denoise(x_t, t)
   implied noise    ε̂   = (x_t − √ᾱ x̂₀) / √(1 − ᾱ)
   next level       x_t′ = √ᾱ′ · x̂₀ + √(1 − ᾱ′) · ε̂
```

- read it as: **re-noise the current best guess** to the next, slightly lower, noise level, reusing the noise believed to be in the picture
- it is the forward formula with the guess standing in for the unknown clean image (HW8's `ddimStep`)


---

## Two samplers: DDIM and DDPM

- **DDIM** (denoising diffusion implicit models, Song, Meng & Ermon 2021) is the step on the last slide: no randomness after the start, so **one starting noise gives one image**, every time
- **DDPM** swaps part of the believed noise ε̂ for **fresh** noise at every step: the same start lands somewhere different on each run
- both land **equally accurately**; they differ in variety and in repeatability
- at the last step both return the guess itself: at t = 0 there is no noise left to mix in


---

## The sampler, in code

```js
// DDIM: start from noise, step the noise level down to 0
let x = gaussianNoise(d, rng);
const ts = timeline(steps, 0.999);                 // 0.999 … 0
for (let k = 0; k < steps; k++) {
  const a = alphaBar(ts[k]), an = alphaBar(ts[k + 1]);
  const x0 = denoise(x, ts[k]);                    // the network, or the exact weighted average
  const eps = x.map((v, i) => (v - Math.sqrt(a) * x0[i]) / Math.sqrt(1 - a));
  x = x0.map((v, i) => Math.sqrt(an) * v + Math.sqrt(1 - an) * eps[i]);
}
// x is the sample: at the last step an = 1, so x = x0
```

- one **denoise** call per step: the step count is the cost of a sample
- the run starts at t = 0.999, not 1: at exactly 1 the picture's share is 0 and the noise formula divides by zero


---

## The cost of a sample

```text
   the course's network     about 1 million multiply-adds per call
   30 DDIM steps            about 30 million multiply-adds per digit
```

- the sampler calls the network once per step, so **steps are the cost**
- fewer steps: better step rules (the animation lecture's integrators beyond Euler), and **distillation**, a student network trained to jump many steps at once (consistency models, Song et al. 2023)


---

<!-- .slide: class="demo-full" -->

## The mechanism, on dots

<div class="cockpit" data-demo="diffusion-2d" data-controls="steps,stochastic"><pre class="viz-fallback">  start from pure noise; ask the exact denoiser "where was the data?"
  steps times, re-noising the estimate a little less each time: the spiral reassembles
  drag steps:  5 (points land between the arms) → 20 → 50 (crisp)
  stochastic:  DDIM (same start, same landing) vs DDPM (fresh noise each step)
  readout: mean distance from a landed point to the nearest data point
  DDIM: 5 steps 0.103, 20 steps 0.020, 50 steps 0.009</pre></div>


---

## Sampling on the spiral, and how many steps

<img src="../../textbook/figures/diff-spiral-sampling.svg" class="media-shot" style="max-height: 210px;" alt="300 particles at five moments of a 50-step DDIM run, six paths, and the DDPM landing">

| steps | 5 | 10 | 20 | 50 | 100 |
| ----- | - | -- | -- | -- | --- |
| DDIM | 0.103 | 0.064 | 0.020 | 0.009 | 0.008 |
| DDPM (fresh noise) | 0.096 | 0.067 | 0.020 | 0.009 | 0.008 |

- more steps land closer to the data, until the **floor** set by the spacing of the 400 points: like Euler's method in the animation lecture, smaller steps, smaller error
- stochastic and deterministic land **equally accurately**; they differ in **which** point a start reaches


---

## DDIM inversion

A deterministic sampler can be **run backward**: from an image to the noise that produces it.

- image → noise (inversion) → the **same** noise → the same image back, up to step error
- edit in between: change the condition (the class, a caption) and sample from the inverted noise; layout and pose survive, content changes
- this is the basis of many diffusion image editors; DDPM, which injects fresh noise, has no such inverse


---

## Interpolating between two noises

Every starting noise for a digit has length close to **20** (√400: the image-space lecture's thin shell). The straight-line midpoint of two of them:

```text
   length of (ε_a + ε_b) / 2   ≈   20 / √2   =   14.1
```

- two random noises are nearly perpendicular, so their average is shorter by √2; no real noise is that short, the model never saw such an input, and the result comes out washed out
- **spherical interpolation** (slerp) moves along the great circle between the two, keeping the length at 20: the rotation lecture's slerp, applied to noise


---

## From dots to digits

2,000 handwritten digits, 20 × 20: each is a point with 400 coordinates. The same exact denoiser, the same sampler.

<img src="../../textbook/figures/diff-digits-trajectory.png" class="media-shot" style="max-height: 150px;" alt="the estimate x-hat-zero at nine steps of a 20-step run, top with the exact denoiser, bottom with bandwidth 3, and the nearest training digit">

- top: the guess is the average digit at step 0, has **chosen a particular 7** by step 4, and lands on it exactly
- an exact denoiser for a finite set can only **return the set**: at the last step the weights are one-hot
- the demos measure it: the distance from a sample to its nearest training digit, per pixel; below 0.06 reads "memorized"


---

<!-- .slide: class="demo-full" -->

## Digits, the exact denoiser

<div class="cockpit" data-demo="diffusion-digits" data-controls="steps"><pre class="viz-fallback">  2,000 MNIST digits (20×20) = the training set; a digit is a 400-vector
  start from noise; the exact posterior-mean denoiser walks back `steps` times
  the panel shows the selected sample beside its nearest training digit:
  distance 0.000, verdict "memorized": an exact denoiser only returns the set
  buttons pick the digit (conditioning); click a sample to inspect it
  MNIST (LeCun, Cortes, Burges) · CC BY-SA 3.0</pre></div>


---

## The bandwidth knob, and its ceiling

Keep the weights from ever becoming one-hot: give the softmax a minimum width h (a **bandwidth**), so it keeps averaging to the end.

<img src="../../textbook/figures/diff-digits-bandwidth.png" class="media-shot" style="max-height: 200px;" alt="twelve samples per row at bandwidths 0, 1.5, 3 and 5 from the same twelve noises">

| bandwidth h | 0 | 1.5 | 3 | 5 |
| ----------- | - | --- | - | - |
| mean distance to nearest training digit | 0.000 | 0.016 | 0.29 | 0.43 |
| what you get | copies | still copies | novel blends, thick and soft | one blur of the whole set |

- **no bandwidth gives crisp and new digits**: an average cannot invent a stroke, only mix strokes


---

## Memorization in large models

The exact denoiser memorizes by construction; trained networks mostly do not, but not never:

- Carlini et al. (2023) extracted **more than a thousand** training images from state-of-the-art diffusion models by generating many samples and searching for near-copies
- duplicated training images were the most likely to come back
- the course's check is the same idea on digits: the distance from a sample to its **nearest training example**; below 0.06 per pixel (3 % of the range) is a copy


---

<!-- .slide: class="demo-full" -->

## Digits nobody wrote, by averaging

<div class="cockpit" data-demo="diffusion-digits" data-controls="smooth"><pre class="viz-fallback">  same 2,000 digits, same walk; drag smooth (the bandwidth h):
    exact  → every sample is a training digit (distance 0.000, memorized)
    h = 3  → blends of neighbors: new digits, distance ≈ 0.29, "novel", soft
    h = 5  → one blurry average of everything (0.43)
  the network in the next exhibits learns what this knob can only imitate</pre></div>


---

## A network has no ceiling

A million weights cannot store 60,000 digits. Trained to approximate the weighted average, a network learns the **regularities of strokes** and fills the gaps between examples smoothly.

<img src="../../textbook/figures/diff-net-samples.png" class="media-shot" style="max-height: 250px;" alt="one hundred digits drawn by the course's network, ten per class">

- one hundred digits nobody wrote: the course's network, 30 DDIM steps, one class per row
- mean distance to the nearest training digit **0.47** per pixel; the closest of the hundred **0.18**; every row legibly its class


---

<!-- .slide: class="demo-full" -->

## The network draws

<div class="cockpit" data-demo="diffusion-net" data-controls="steps"><pre class="viz-fallback">  the course's trained class-conditional denoiser (1,002,064 weights, 15 minutes
  of training on a laptop, 60,000 MNIST digits) samples 12 digits from noise
  buttons: which digit (conditioning)    steps: how many DDIM steps
  the panel: nearest training digit, distance well above the memorization
  threshold for every sample: these digits were learned, not looked up
  MNIST (LeCun, Cortes, Burges) · CC BY-SA 3.0</pre></div>


---

## The network, watched

<img src="../../textbook/figures/diff-net-trajectory.png" class="media-shot" style="max-height: 170px;" alt="the network drawing a 5: the noisy state and the estimate at ten steps of a 30-step run">

<img src="../../textbook/figures/diff-net-steps.png" class="media-shot" style="max-height: 190px;" alt="the network with 3, 5, 10 and 30 steps from the same eight noises, class 3">

- top: drawing a 5, the noisy state above and the guess below, t = 1.0 … 0. From pure static and the label the guess is already a **soft 5**; by step 9 the slant and loop are decided; the last steps add edges
- bottom: 3, 5, 10 and 30 steps from the same noises; distance to the nearest training digit **0.48 to 0.51** in every row: it measures **novelty, not quality**


---

## Three sources of error in a sample

| error | where it comes from | seen on |
| ----- | ------------------- | ------- |
| **step** error | too few, too large steps | the spiral with the exact denoiser: 0.103 at 5 steps, 0.009 at 50 |
| **denoiser** error | the network is not the exact weighted average | the network's samples: new digits, some malformed |
| **data** limits | finite data, memorization, gaps | the exact denoiser on digits: copies |

- the exact denoiser isolates the first; the network trades the third for the second
- every improvement in the literature targets one row: better samplers, better networks, more and cleaner data


---

## Why many small steps

- from a very noisy value, the clean one can be **several separate possibilities**: with training values −1 and +1, it was one or the other, never in between
- a model that outputs **one bell curve** per step cannot represent two separate peaks: it would put its peak in the middle, where there is no data
- over a **small** step the next state is close to a single bell curve, so the model is accurate: hence many small steps, and special training for few-step samplers


---

## From 2015 to image generators

| year | milestone |
| ---- | --------- |
| 2015 | Sohl-Dickstein et al.: diffusion probabilistic models, on small images |
| 2020 | DDPM: sample quality competitive with GANs on small images |
| 2021 | Dhariwal & Nichol: diffusion models beat GANs on ImageNet |
| 2022 | DALL·E 2 (Ramesh et al.); Stable Diffusion released publicly in August (Rombach et al.) |
| 2023 to 2024 | transformer denoisers, flow matching at scale, video models |

- five years from a paper about small images to generators anyone could run on a gaming graphics card


---

## The whole method, one slide

```text
   destroy   x_t = √ᾱ x₀ + √(1 − ᾱ) ε           nothing is learned
   learn     net(x_t, t) ≈ x₀                     a plain regression
   sample    x̂₀ = net(x_t, t);  ε̂ from x̂₀
             x ← √ᾱ′ x̂₀ + √(1 − ᾱ′) ε̂            re-noise, a little less
```

- the exact denoiser **memorizes**; the network, smooth between examples, **draws**


---

## The papers, 2015 to 2022

| Year | Paper | What it added |
| ---- | ----- | ------------- |
| 2015 | Sohl-Dickstein et al., arXiv:1503.03585 | diffusion probabilistic models: destroy, learn to undo |
| 2019 | Song & Ermon, arXiv:1907.05600 | the score (field of arrows) view |
| 2020 | Ho, Jain & Abbeel, DDPM, arXiv:2006.11239 | predict the noise; it works at scale |
| 2021 | Song, Meng & Ermon, DDIM, arXiv:2010.02502 | deterministic, few-step sampling |
| 2021 | Song et al., arXiv:2011.13456 | diffusion in continuous time; one deterministic path per noise |
| 2021 | Nichol & Dhariwal, arXiv:2102.09672 | the cosine schedule |
| 2022 | Karras et al., EDM, arXiv:2206.00364 | schedule, sampler and network output untangled |
| 2022 | Lipman et al., arXiv:2210.02747; Liu et al., arXiv:2209.03003 | flow matching; rectified flow |

