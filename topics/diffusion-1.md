<!--
  CSS 551 · TOPIC DECK · Diffusion models I: the forward process, the denoiser, DDPM and DDIM (~88 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/diffusion-1.md"> among others; it carries no
  session logistics (no title, Thursday, homework, wrap) and no "Part N" numbering.
  See topics/README.md for the contract.

  TEACHES: noise as the missing choice; the forward process and its variance bookkeeping; the cosine
  schedule (table) and one digit walked forward; the dissolving-render exhibit; the linear schedule it
  replaced; the spiral as a dataset you can see; the exact denoiser (posterior mean) and a two-point
  worked example; its two limits (memorize, mean); one function in four coordinates (x0, ε, score, v)
  worked at one point; the score field; the training loop and where the squared error comes from; the
  course's network; the reverse step (DDIM σ = 0, DDPM σ > 0) worked; sampling on the spiral and the
  dots exhibit; how many steps (table); the probability-flow ODE; flow matching (worked); the exact
  denoiser on digits memorizes (exhibit), the bandwidth knob (exhibit) and its ceiling; the trained
  network draws (exhibit), watched step by step; the papers 2015 to 2022.
  NOT HERE (topics/diffusion-2.md, lecture 17): guidance beyond one sentence, latent diffusion, text
  conditioning at scale, ControlNet, text-to-3D, video, evaluation.
  NEEDS:   topics/neural-nets-embeddings.md ("smooth between the examples", "a network is a function",
           Adam) and topics/image-space.md ("an image is a point", "noise is the missing choice",
           PSNR, the cosine-basis ordering).
  DEMOS:   data-demo="diffusion-image" data-controls="t"; "diffusion-2d" data-controls="steps,stochastic";
           "diffusion-digits" data-controls="steps" and data-controls="smooth"; "diffusion-net"
           data-controls="steps"; all demo-full.
  FIGURES: ../../textbook/figures/diff-*.svg|png (computed by tools/gen-textbook-figures.mjs).
  NUMBERS: recomputed by tools/gen-lecture-figures-d1.mjs (lectures/L16-diffusion-1/analysis/numbers-d1.json:
           schedule, linear, exact2, exact3, ddim, flow, steps) and checked against
           textbook/figures/numbers.json; the digit and network figures' numbers are quoted from
           textbook/diffusion-models.html Sections 1, 3 and 6.
  Replaces, for Plan C, the first half of topics/archive/diffusion-ladder.md (archived).

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Demo embeds live on
  demo-full slides (a short ## title + the embed div + its viz-fallback pre).
  Paths are relative to the lecture page (lectures/LNN-slug/index.html).
-->

### Diffusion models I: destroy, learn to undo, sample

<small>(~88 min)</small>


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
- the idea: Sohl-Dickstein et al. 2015 (arXiv:1503.03585); made practical: Ho, Jain & Abbeel 2020, DDPM (arXiv:2006.11239)


---

## The forward process

Fix a schedule ᾱ(t) falling from 1 at t = 0 to 0 at t = 1 (the course uses the cosine schedule, Nichol & Dhariwal 2021, arXiv:2102.09672):

```text
   x(t) = √ᾱ(t) · x(0)  +  √(1 − ᾱ(t)) · ε,          ε ~ N(0, I)

   the weights satisfy ᾱ + (1 − ᾱ) = 1: if x(0) has unit variance, so does every x(t)
   signal-to-noise ratio  SNR = ᾱ / (1 − ᾱ)
```

- at t = 1 **every** image has become the same standard Gaussian: the one distribution we can sample trivially
- nothing is learned in this direction; it is arithmetic


---

## The cosine schedule

| t | ᾱ | √ᾱ | √(1 − ᾱ) | SNR (dB) | PSNR of a digit (dB) |
| - | - | -- | -------- | -------- | -------------------- |
| 0.1 | 0.972 | 0.986 | 0.167 | 15.4 | 21.2 |
| 0.3 | 0.787 | 0.887 | 0.462 | 5.7 | 12.3 |
| 0.5 | 0.494 | 0.703 | 0.711 | −0.1 | 8.5 |
| 0.7 | 0.203 | 0.451 | 0.893 | −5.9 | 6.4 |
| 0.9 | 0.024 | 0.155 | 0.988 | −16.1 | 3.3 |

<img src="../../textbook/figures/diff-forward-digit.png" class="media-shot" style="max-height: 95px;" alt="one digit 7 walked forward from t = 0 to t = 1 in eleven panels">

- the SNR crosses **0 dB at t = 0.5** and falls about 3 dB per tenth of t through the middle
- the 7 survives to about t = 0.6: coarse structure is the **last** to drown


---

<!-- .slide: class="demo-full" -->

## A real picture, dissolving

<div class="cockpit" data-demo="diffusion-image" data-controls="t"><pre class="viz-fallback">  left: x(0), the Cornell render (128×128×3 = 49,152 numbers)
  right: x(t) = √ᾱ · x(0) + √(1 − ᾱ) · noise, for the t on the slider
  readout: ᾱ(t), SNR in dB, PSNR against the original
  t = 0.3: ᾱ 0.787, SNR 5.7 dB    t = 0.5: ᾱ 0.494, SNR −0.1 dB    t = 0.9: SNR −16.1 dB</pre></div>


---

## Which schedule

DDPM's original schedule: 1,000 steps with noise variances β rising linearly from 10⁻⁴ to 0.02, ᾱ = Π(1 − β).

| t | 0.1 | 0.3 | 0.5 | 0.7 | 0.9 |
| - | --- | --- | --- | --- | --- |
| ᾱ, cosine | 0.972 | 0.787 | 0.494 | 0.203 | 0.024 |
| ᾱ, linear β | 0.897 | 0.396 | 0.079 | 0.007 | 0.0003 |
| SNR cosine (dB) | 15.4 | 5.7 | −0.1 | −5.9 | −16.1 |
| SNR linear (dB) | 9.4 | −1.8 | −10.7 | −21.5 | −35.6 |

<img src="../../textbook/figures/diff-schedules.svg" class="media-shot" style="max-height: 120px;" alt="the cosine and linear schedules plotted on the same axes">

- the linear schedule destroys the signal early: at t = 0.7 the image is 99 % noise with three tenths of the steps to go
- what matters is that the noise levels are spaced **evenly in SNR**; the cosine schedule does about 3 dB per tenth


---

## A dataset you can see

400 points on a spiral in ℝ²: each point is an "image" with two pixels.

<img src="../../textbook/figures/diff-spiral-forward.svg" class="media-shot" style="max-height: 260px;" alt="400 spiral points walked forward: by t = 0.6 the spiral is gone, by t = 1 the cloud is a standard Gaussian">

- by t = 0.6 the spiral is gone; by t = 1 the cloud is the standard Gaussian
- it would be the **same cloud** for a ring, two moons, or a million photographs
- two dimensions let us draw what happens in 49,152: every rule tonight is shown on the spiral first


---

## The denoiser's question

Given x(t) and t, **where was x(0)?** For a finite dataset {x⁽ⁱ⁾} the best answer is exact: the posterior mean.

```text
   x̂₀(x_t, t) = E[x₀ | x_t] = Σᵢ wᵢ x⁽ⁱ⁾
   wᵢ ∝ exp( −‖x_t − √ᾱ x⁽ⁱ⁾‖² / (2(1 − ᾱ)) )            a softmax over the training points
```

- a **weighted average** of the training data, weighted by how well each point explains x(t)
- it minimizes the expected squared error among **all** functions of x(t); a trained network approximates it
- the demos compute this exactly; for a million photographs the sum is unaffordable, and useless (next)


---

## The exact denoiser, worked

Two training scalars, x⁽¹⁾ = −1 and x⁽²⁾ = +1; a time where ᾱ = ¼ (√ᾱ = ½, 1 − ᾱ = ¾); observe x_t = 0.3.

```text
   scaled data            ½·(−1) = −0.5          ½·(+1) = +0.5
   squared distances      (0.3 + 0.5)² = 0.64    (0.3 − 0.5)² = 0.04
   logits −d²/(2·¾)       −0.4267                −0.0267
   softmax weights        0.401                  0.599
   posterior mean         x̂₀ = 0.401·(−1) + 0.599·(+1) = 0.197
```

<img src="../../textbook/figures/diff-1d-denoiser.svg" class="media-shot" style="max-height: 190px;" alt="the exact denoiser as a function of the observation at four noise levels, and the density of the noisy data">

- a **pull toward the nearer point**, not a jump onto it


---

## Two limits

- **t → 0** (little noise): 1 − ᾱ → 0, the weights become **one-hot**, and x̂₀ is exactly the nearest training point: the exact denoiser **memorizes**
- **t → 1** (all noise): the weights become **equal**, and x̂₀ is the **data mean**: at high noise the best guess is the average image
- every sampling run therefore starts as a **gray blur** and sharpens as the noise falls
- the left panel of the figure: nearly a step at ᾱ = 0.9, nearly flat at ᾱ = 0.05


---

## One function, four coordinates

| the network predicts | formula | recover x̂₀ by | used by |
| -------------------- | ------- | ------------- | ------- |
| the clean image x̂₀ | the posterior mean | itself | the course's network |
| the noise ε̂ | `(x_t − √ᾱ x̂₀) / √(1 − ᾱ)` | `(x_t − √(1 − ᾱ) ε̂) / √ᾱ` | DDPM, Stable Diffusion 1 |
| the score ∇log p_t | −ε̂ / √(1 − ᾱ) | from ε̂ | score-based models (Song & Ermon 2019, arXiv:1907.05600) |
| the velocity v̂ | √ᾱ ε̂ − √(1 − ᾱ) x̂₀ | √ᾱ x_t − √(1 − ᾱ) v̂ | Stable Diffusion 2, distillation |

- the score identity is **Tweedie's formula**: the posterior mean is a step up the gradient of the log density of the noised data
- ε̂ is ill-conditioned at high noise for recovering x̂₀, x̂₀ at high noise for the network; v̂ is well-conditioned at both ends


---

## Four coordinates at one point

The 50-step spiral run, first particle, step 15: t = 0.6993, √ᾱ = 0.4517, √(1 − ᾱ) = 0.8922.

```text
   the particle         x_t  = (0.8662, 1.0562)
   exact denoiser       x̂₀   = (0.0367, 0.1490)      near the data's center: mostly noise
   the noise            ε̂    = (x_t − 0.4517·x̂₀) / 0.8922            = (0.9523, 1.1084)
   the score            −ε̂ / 0.8922                                   = (−1.067, −1.242)
   the velocity         v̂    = 0.4517·ε̂ − 0.8922·x̂₀                  = (0.397, 0.368)
   check                0.4517·x_t − 0.8922·v̂  = (0.037, 0.149)  = x̂₀
```

<img src="../../textbook/figures/diff-score-field.svg" class="media-shot" style="max-height: 250px;" alt="arrows from grid points to their denoised estimates at t = 0.5 on the spiral">


---

## Training, in one line

```text
   for step in range(N):
       x0  = random_batch(images)                  # clean images
       t   = uniform(0, 1, size=batch)             # a noise level per image
       eps = normal(0, 1, shape=x0.shape)          # the noise
       xt  = sqrt(abar(t)) * x0 + sqrt(1 - abar(t)) * eps
       loss = mean((net(xt, t, label) - target)**2)       # target = eps, or x0, or v
       loss.backward(); optimizer.step()
```

- every step is a small, well-posed **regression** against a target the trainer generated itself; no adversary
- the course's network: 3 hidden layers of 512 SiLU units, **1,002,064 weights**, trained with Adam on 60,000 digits for fifteen minutes on a laptop CPU (41,210 steps of batch 512), predicting x₀


---

## Where the squared error comes from

The reverse process is a chain of Gaussians; the log likelihood of a training image is bounded by a sum over steps:

```text
   −log p(x₀)  ≤  Σ_t  E[ KL( q(x_(t−1) | x_t, x₀)  ‖  p_θ(x_(t−1) | x_t) ) ]  + const

   two Gaussians of equal variance:  KL = ‖mean₁ − mean₂‖² / (2σ²)
   ⇒ each term = λ_t · ‖ε − ε_θ‖²,   λ_t fixed by the schedule
```

- DDPM's observation: **drop λ_t** (weight every noise level equally) and samples get better; that is the one-line loss
- whatever the weighting, the minimizer at each t is the **posterior mean**: the loss approximates the exact denoiser


---

## Sampling: one reverse step

Start from x ~ N(0, I) and step t down a sequence `t_K > … > t_0 = 0`. At each step: form x̂₀, recover ε̂, move to the next time t′.

```text
   x_(t′) = √ᾱ(t′) · x̂₀  +  √(1 − ᾱ(t′) − σ²) · ε̂  +  σ · z,          z ~ N(0, I)

   σ = 0         DDIM (Song, Meng & Ermon 2021, arXiv:2010.02502): deterministic
   σ > 0         DDPM (Ho, Jain & Abbeel 2020): part of the noise replaced by fresh noise
```

- read it as: **re-noise the current best guess** to the next, slightly lower, noise level, reusing the noise already believed to be in the picture
- the forward formula and the reverse step are **the same equation**, with x̂₀ standing in for the unknown x₀


---

## One DDIM step, worked

The same particle, step 15 of 50: t = 0.6993 → t′ = 0.6793.

```text
   schedule        √ᾱ(t)  = 0.4517,  √(1 − ᾱ(t))  = 0.8922
                   √ᾱ(t′) = 0.4792,  √(1 − ᾱ(t′)) = 0.8777
   the particle    x_t = (0.8662, 1.0562)
   denoiser        x̂₀  = (0.0367, 0.1490)
   implied noise   ε̂   = (x_t − 0.4517·x̂₀) / 0.8922                  = (0.9523, 1.1084)
   next (σ = 0)    x_t′ = 0.4792·x̂₀ + 0.8777·ε̂                        = (0.8534, 1.0442)
```

- the particle moved (−0.013, −0.012): a small step toward the estimate, because ᾱ changed by only 0.026
- fifty such steps carry it from the Gaussian cloud onto the spiral


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
| DDIM (σ = 0) | 0.103 | 0.064 | 0.020 | 0.009 | 0.008 |
| DDPM (σ at its full value) | 0.096 | 0.067 | 0.020 | 0.009 | 0.008 |

- below ten steps the particles land near the center of mass; from 20, the error roughly **halves per doubling**; from 50 it reaches the floor set by the 400 points' spacing
- stochastic and deterministic land **equally accurately**; they differ in **which** point a start reaches


---

## The ODE underneath

- the forward process is a stochastic differential equation, `dx = −½β(t) x dt + √β(t) dw`; its time reversal (Anderson 1982) has a drift that involves the **score**, and running it backward is DDPM
- every such SDE has a companion **ordinary** differential equation with the same densities at every t (Song et al. 2021, arXiv:2011.13456):

```text
   dx/dt = −½ β(t) · ( x + ∇ₓ log p_t(x) )            the probability-flow ODE
```

- **DDIM is a first-order solver for it**: that is why its paths are smooth and one start gives one landing
- higher-order solvers (Heun's method in EDM, DPM-Solver) cut the step count; the steps table is their convergence curve


---

## Flow matching: the straight-line version

Replace the diffusion by a **straight line** between data and noise (Lipman et al. 2022, arXiv:2210.02747; rectified flow, Liu et al. 2022, arXiv:2209.03003):

```text
   x_t = (1 − t)·x₀ + t·ε,      dx_t/dt = ε − x₀
   train v(x_t, t) by squared error; sample by Euler's method from t = 1 down to 0

   worked, data {−1, +1}, t = 0.5, x_t = 0.3:
   scaled points ∓0.5;  logits −d²/(2t²) = −1.28, −0.08;  weights 0.2315, 0.7685
   x̂₀ = 0.537;   v = (x_t − x̂₀)/t = −0.474
   Euler to t = 0.4:  x = 0.3 − 0.1·(−0.474) = 0.347        jump to t = 0:  x = 0.537 = x̂₀
```

- an Euler step along a straight line is exact, so nearly straight paths sample in **few steps**; Stable Diffusion 3 uses this


---

## From dots to digits

2,000 handwritten digits, 20 × 20: each is a point of ℝ⁴⁰⁰. The same exact denoiser, the same sampler.

<img src="../../textbook/figures/diff-digits-trajectory.png" class="media-shot" style="max-height: 150px;" alt="the estimate x-hat-zero at nine steps of a 20-step run, top with the exact denoiser, bottom with bandwidth 3, and the nearest training digit">

- top: the estimate is the mean digit at step 0, has **chosen a particular 7** by step 4, and lands on it at distance **0.000**
- an exact denoiser for a finite set can only **return the set**: at the last step the weights are one-hot
- the demos measure it: distance from a sample to its nearest training digit, per pixel; below 0.06 reads "memorized"


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

Add a floor h² to the kernel variance, 1 − ᾱ → 1 − ᾱ + h², so the weights never become one-hot (a kernel density estimator's bandwidth):

<img src="../../textbook/figures/diff-digits-bandwidth.png" class="media-shot" style="max-height: 200px;" alt="twelve samples per row at bandwidths 0, 1.5, 3 and 5 from the same twelve noises">

| bandwidth h | 0 | 1.5 | 3 | 5 |
| ----------- | - | --- | - | - |
| mean distance to nearest training digit | 0.000 | 0.016 | 0.29 | 0.43 |
| what you get | copies | still copies | novel blends, thick and soft | one blur of the whole set |

- **no bandwidth gives crisp and new digits**: a kernel average cannot invent a stroke, only mix strokes


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

A network is smooth between examples in the space of **functions**, not of pixels (lecture 14's approximator). Trained to approximate the posterior mean on 60,000 digits, it learns the regularities of strokes.

<img src="../../textbook/figures/diff-net-samples.png" class="media-shot" style="max-height: 250px;" alt="one hundred digits drawn by the course's network, ten per class">

- one hundred digits nobody wrote: the course's network, 30 DDIM steps, one class per row
- mean distance to the nearest training digit **0.47** per pixel; the closest of the hundred **0.18**; every row legibly its class


---

<!-- .slide: class="demo-full" -->

## The network draws

<div class="cockpit" data-demo="diffusion-net" data-controls="steps"><pre class="viz-fallback">  the course's trained class-conditional denoiser (1,002,064 weights, 15 minutes
  of CPU training on 60,000 MNIST digits) samples 12 digits from noise
  buttons: which digit (conditioning)    steps: how many DDIM steps
  the panel: nearest training digit, distance well above the memorization
  threshold for every sample: these digits were learned, not looked up
  MNIST (LeCun, Cortes, Burges) · CC BY-SA 3.0</pre></div>


---

## The network, watched

<img src="../../textbook/figures/diff-net-trajectory.png" class="media-shot" style="max-height: 170px;" alt="the network drawing a 5: the noisy state and the estimate at ten steps of a 30-step run">

<img src="../../textbook/figures/diff-net-steps.png" class="media-shot" style="max-height: 190px;" alt="the network with 3, 5, 10 and 30 steps from the same eight noises, class 3">

- top: drawing a 5, x(t) above and x̂₀ below, t = 1.0 … 0. At step 0, from pure static and the label, the estimate is already a **soft 5**; by step 9 the slant and loop are decided; the last steps add edges
- bottom: 3, 5, 10 and 30 steps from the same noises; mean distance to the nearest training digit **0.48 to 0.51** in every row: nearest-neighbor distance measures **novelty, not quality**


---

## The papers, 2015 to 2022

| Year | Paper | What it added |
| ---- | ----- | ------------- |
| 2015 | Sohl-Dickstein et al., arXiv:1503.03585 | diffusion probabilistic models: destroy, learn to undo |
| 2019 | Song & Ermon, arXiv:1907.05600 | the score (vector field) view |
| 2020 | Ho, Jain & Abbeel, DDPM, arXiv:2006.11239 | predict the noise; it works at scale |
| 2021 | Song, Meng & Ermon, DDIM, arXiv:2010.02502 | deterministic, few-step sampling |
| 2021 | Song et al., arXiv:2011.13456 | diffusion as an SDE; the probability-flow ODE |
| 2021 | Nichol & Dhariwal, arXiv:2102.09672 | the cosine schedule |
| 2022 | Karras et al., EDM, arXiv:2206.00364 | schedule, sampler and parameterization untangled |
| 2022 | Lipman et al., arXiv:2210.02747; Liu et al., arXiv:2209.03003 | flow matching; rectified flow |

