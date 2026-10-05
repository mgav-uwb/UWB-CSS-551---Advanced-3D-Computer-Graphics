<!--
  CSS 551 · TOPIC DECK · Diffusion models I: the forward process, the denoiser, DDPM and DDIM (~100 min, 72 content slides).
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
  dots exhibit; how many steps (table); the probability-flow ODE; the exact
  denoiser on digits memorizes (exhibit), the bandwidth knob (exhibit) and its ceiling; the trained
  network draws (exhibit), watched step by step; the papers 2015 to 2022.
  DENSIFIED (2026-09-29): the generative families; why not independent pixels; Box-Muller
  (−0.480, −1.476); the forward process in code; one pixel forward (0.562 ± 0.711); two steps
  compose (0.72, 0.28); the cosine formula (0.4938); the noise shell (√d); the terminal-SNR
  pitfall (linear √ᾱ(1) = 0.0064); the Gaussian-data denoiser (0.211); softmax underflow (−1720);
  the noised data as a blur; Tweedie checked (−0.268); the score field on its own slide; ε̂
  amplification (6.365 at t = 0.9); the training counted (15 % null label); the sampler in code;
  a DDPM step worked (0.957, 0.875); the cost of a sample; Euler and solver order; DDIM
  inversion; slerp between noises (14.1 vs 20); memorization at scale; three error sources; the
  bimodal reverse step; 2015 to 2022 milestones; the whole method on one slide.
  EXPANDED (2026-10-05, 54 to 72 content slides): check, one forward draw (0.248); the schedule in the
  library (0.7869, 5.67 dB, 0 dB at t = 0.496); the spiral-dissolving exhibit (diffusion-2d, t); the
  exact denoiser derived by Bayes; the squared-error split (0.961 vs 1.605); check, little noise
  (0.993); the shrinkage factor derived (s² = 0.25: 0.084); Tweedie derived; one score arrow from
  the library ((−1.440, −0.966)); the million weights counted; one training example (0.170, 0.166);
  ε loss = SNR · x₀ loss (1,411); the loss floor (0.004 to 0.950); ten steps in dB; the reverse step
  keeps the variance (1.0000); check, two steps beat five (0.084 vs 0.103); the memorization test in
  numbers (nearest-other 0.490); the network in node (a printed 7; ink 94, 90, 58).
  NOT HERE (topics/diffusion-2.md, lecture 17): guidance beyond one sentence, latent diffusion, text
  conditioning at scale, ControlNet, text-to-3D, video, evaluation.
  NEEDS:   topics/neural-nets-embeddings.md ("smooth between the examples", "a network is a function",
           Adam) and topics/image-space.md ("an image is a point", "noise is the missing choice",
           PSNR, the cosine-basis ordering).
  DEMOS:   data-demo="diffusion-image" data-controls="t"; "diffusion-2d" data-controls="t" (forward)
           and data-controls="steps,stochastic";
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

<small>(~100 min)</small>


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

## The generative model families

| family | a sample is made by | strength | weakness |
| ------ | ------------------- | -------- | -------- |
| VAE (2013, arXiv:1312.6114) | decoding a random code | one pass | blurry |
| GAN (2014, arXiv:1406.2661) | a generator trained against a critic | sharp, one pass | unstable, drops modes |
| autoregressive (2016, arXiv:1601.06759) | one pixel at a time | exact likelihood | one step per pixel |
| flow (2016, arXiv:1605.08803) | an invertible network on noise | exact likelihood | restricted networks |
| **diffusion** | many small denoising steps | stable, sharp, diverse | many network calls |

- diffusion trades **sampling cost** for the easiest training of the five: a squared error against a target it generates itself


---

## Why not sample each pixel on its own?

The simplest generator: learn each pixel's own distribution from the data, then draw every pixel independently.

- every pixel's **histogram** would be right, and the image would be **static**: which pixels are dark depends on which other pixels are dark
- the information is in the **joint** distribution; for 400 binary pixels a full table of it has 2⁴⁰⁰ entries
- every family on the previous slide is a way to represent that joint distribution **without** the table; diffusion does it as a chain of small, learnable conditional steps


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

## The forward process, in code

```js
// x0: clean image as numbers in [-1, 1]; t in [0, 1]
function noisify(x0, t, rng) {
  const a = alphaBar(t);                            // the cosine schedule
  const eps = x0.map(() => randn(rng));             // one standard normal per pixel
  const xt = x0.map((v, i) => Math.sqrt(a) * v + Math.sqrt(1 - a) * eps[i]);
  return { xt, eps };                               // the training pair: input xt, target eps (or x0)
}
```

- no loop over time steps: the closed form jumps to any t in **one** line per pixel
- training calls this with a **fresh** t and fresh noise for every example in every batch


---

## Sampling a Gaussian: Box–Muller

The forward process needs ε ~ N(0, 1) per pixel. From two uniform numbers u₁, u₂:

```text
   r = √(−2 ln u₁),   z₁ = r cos(2π u₂),   z₂ = r sin(2π u₂)      two independent normals

   u₁ = 0.3, u₂ = 0.7:   r = 1.552,   z₁ = −0.480,   z₂ = −1.476
```

- one pair of uniforms, two Gaussian numbers; a 49,152-pixel image needs 24,576 pairs
- the course's generator is a seeded PRNG (mulberry32), so a slide shows the same noise every time


---

## One pixel through the forward process

A pixel of value **0.8**, at t = 0.5 (ᾱ = 0.494):

```text
   x(0.5) = √0.494 · 0.8 + √0.506 · ε = 0.562 + 0.711 ε
   its distribution:  mean 0.562,  standard deviation 0.711
   95 % of draws in   [0.562 − 1.96·0.711,  0.562 + 1.96·0.711]  =  [−0.83, 1.96]
```

- the signal has shrunk by 0.703 and the noise is already larger than it: SNR ≈ 0 dB
- every pixel of the image does this **independently**; the image is still there only as a faint bias of each pixel's mean


---

## Check: one draw by hand

A pixel of value **0.8** at t = 0.3 (ᾱ = 0.787, √ᾱ = 0.887, √(1 − ᾱ) = 0.462), with the noise draw **ε = −1.0**. What is x(0.3)?

- **A.** 0.248
- **B.** 0.416
- **C.** 0.710
- **D.** 1.172


---

## Small steps compose into one jump

The original definition is a chain of small steps, `x_k = √(1 − β_k) x_(k−1) + √β_k ε_k`. Two steps, β₁ = 0.1, β₂ = 0.2:

```text
   x₂ = √0.8 ( √0.9 x₀ + √0.1 ε₁ ) + √0.2 ε₂
      = √(0.8 · 0.9) x₀  +  [ √0.08 ε₁ + √0.2 ε₂ ]
   signal coefficient²   0.8 · 0.9 = 0.72 = ᾱ
   noise variance        0.08 + 0.2 = 0.28 = 1 − ᾱ          independent Gaussians add variances
```

- so `x_k = √ᾱ_k x₀ + √(1 − ᾱ_k) ε` with **ᾱ = Π(1 − β)**: any noise level in one draw
- this closed form is what makes training cheap: no need to simulate the chain step by step


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

## The cosine schedule's formula

Nichol & Dhariwal (2021) define ᾱ through a squared cosine with a small offset s = 0.008:

```text
   f(t) = cos²( (t + s)/(1 + s) · π/2 ),      ᾱ(t) = f(t) / f(0)

   t = 0.5:   f(0.5) = 0.4938,   f(0) = 0.9998,   ᾱ = 0.4938      (the library agrees)
```

- the offset keeps the first steps from being **too small** to learn from; dividing by f(0) makes ᾱ(0) exactly 1
- near t = 0 and t = 1 the curve is flat, so little time is spent at noise levels where the image barely changes


---

## The schedule, in the library

```js
import('./lib/core/diffusion.js').then(d => {
  console.log(d.alphaBar(0.3), d.snrDb(0.3), d.alphaBar(0.999));
});
```

```text
   alphaBar(0.3)    0.7869          the table's 0.787
   snrDb(0.3)       5.67 dB         10 · log10(0.7869 / 0.2131) = 10 · log10(3.69)
   alphaBar(0.999)  2.4 × 10⁻⁶      where every sampling run starts
   ᾱ = 0.5 (0 dB)   at t = 0.496    found by bisection on alphaBar
```

- SNR in decibels is **10 · log10(ᾱ / (1 − ᾱ))**; 0 dB means signal and noise have equal power
- the sampler starts at t = 0.999, not 1: at t = 1 the ε̂ formula divides by zero


---

## The noise lives on a shell

A standard Gaussian vector in d dimensions has length close to **√d**:

```text
   d = 400 (a 20 × 20 digit)           ‖ε‖ ≈ 20
   d = 49,152 (128 × 128 RGB)          ‖ε‖ ≈ 221.7
   d = 786,432 (512 × 512 RGB)         ‖ε‖ ≈ 886.8        with a spread of only about ±0.7
```

- the "cloud" at t = 1 is a thin **shell**, not a ball: almost no noise vector is short
- the image-space lecture's "the cube is all corners" in Gaussian form; it matters when noises are **interpolated** (later tonight)


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

## Pitfall: the last step is not pure noise

Training reaches its noisiest level at t = 1; sampling starts from **pure** noise. If ᾱ(1) > 0 the two differ:

```text
   DDPM's linear schedule, 1000 steps:   ᾱ(1) = 4.0 × 10⁻⁵,   √ᾱ = 0.0064
      a trace of the image's mean brightness survives at t = 1 in training, never at sampling
   the cosine schedule, run to t = 0.999 in this course:   ᾱ = 2.4 × 10⁻⁶,   √ᾱ = 0.0016
```

- the network learns to **read** that trace at the noisiest step; at sampling it is absent, so the model cannot make very dark or very bright images (Lin et al. 2023, arXiv:2305.08891)
- fixes: a schedule that reaches exactly zero signal, and starting samples at the **same** noise level used in training


---

## A dataset you can see

400 points on a spiral in ℝ²: each point is an "image" with two pixels.

<img src="../../textbook/figures/diff-spiral-forward.svg" class="media-shot" style="max-height: 260px;" alt="400 spiral points walked forward: by t = 0.6 the spiral is gone, by t = 1 the cloud is a standard Gaussian">

- by t = 0.6 the spiral is gone; by t = 1 the cloud is the standard Gaussian
- it would be the **same cloud** for a ring, two moons, or a million photographs
- two dimensions let us draw what happens in 49,152: every rule tonight is shown on the spiral first


---

<!-- .slide: class="demo-full" -->

## The spiral, dissolving

<div class="cockpit" data-demo="diffusion-2d" data-controls="t"><pre class="viz-fallback">  400 points on a spiral; forward mode: each point x(t) = √ᾱ · x(0) + √(1 − ᾱ) · ε
  drag t: by t = 0.6 the spiral is gone; by t = 1 the cloud is N(0, I)
  data buttons: ring, moons: the cloud at t = 1 is the same for every shape
  readout: ᾱ(t) and SNR; t = 0.35 by default</pre></div>


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

## The exact denoiser, derived

Bayes' rule over the N training points, each equally likely a priori:

```text
   prior          P(x₀ = x⁽ⁱ⁾) = 1/N
   likelihood     p(x_t | x⁽ⁱ⁾) = N( x_t ; √ᾱ x⁽ⁱ⁾, (1 − ᾱ) I )
                              ∝ exp( −‖x_t − √ᾱ x⁽ⁱ⁾‖² / (2(1 − ᾱ)) )
   posterior      wᵢ = p(x_t | x⁽ⁱ⁾) / Σⱼ p(x_t | x⁽ʲ⁾)         the 1/N and the Gaussian's constant cancel
   mean           x̂₀ = Σᵢ wᵢ x⁽ⁱ⁾
```

- the weights are a **softmax** of the logits −d²/(2(1 − ᾱ)): the networks lecture's softmax, with distances as scores
- the only data-dependent input is the distance from x_t to each **scaled** training point


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

## Why the mean: the squared error splits

For any guess f, with m = E[x₀ | x_t] and the expectation over the posterior:

```text
   E[(f − x₀)²] = (f − m)²  +  E[(x₀ − m)²]          the cross term has mean zero
                  ─────────    ───────────
                  your miss    the posterior variance: no guess can remove it

   the worked example (m = 0.197, posterior variance 1 − 0.197² = 0.961):
   guess f = 0.197 (the mean)          0.961
   guess f = 0.3   (the observation)   0.961 + 0.011 = 0.972
   guess f = 0     (the data mean)     0.961 + 0.039 = 1.000
   guess f = +1    (the nearer point)  0.961 + 0.645 = 1.605
```

- the posterior mean is the **unique** minimizer: any other guess adds its squared miss
- a network trained with squared error is pushed toward exactly this function


---

## Check: the same point, little noise

Data {−1, +1}, the same observation x_t = 0.3, but now **ᾱ = 0.9** (√ᾱ = 0.949, 1 − ᾱ = 0.1). What does the exact denoiser return?

- **A.** 0.197
- **B.** 0.300
- **C.** 0.993
- **D.** exactly 1


---

## When the data is Gaussian, the denoiser is linear

Suppose the data itself is one standard Gaussian, x₀ ~ N(0, 1). Then x_t is Gaussian too, and the posterior mean is a straight line:

```text
   x̂₀ = √ᾱ · x_t / (ᾱ + (1 − ᾱ)) = √ᾱ · x_t
   ᾱ = 0.494,  x_t = 0.3:   x̂₀ = 0.703 · 0.3 = 0.211
```

- the best denoiser **shrinks** the observation toward the mean, more at higher noise: the **Wiener filter**
- real data is not Gaussian, so the true denoiser bends; but at very high noise every dataset looks Gaussian and the learned denoiser is close to this line


---

## The shrinkage factor, derived

Let x₀ ~ N(0, s²). Then x₀ and x_t are jointly Gaussian, and the conditional mean of one given the other is a regression line:

```text
   Cov(x₀, x_t) = √ᾱ · s²            Var(x_t) = ᾱ s² + (1 − ᾱ)
   x̂₀ = Cov / Var · x_t  =  √ᾱ s² / (ᾱ s² + 1 − ᾱ) · x_t

   s² = 1      (unit variance):   √ᾱ · x_t                         0.703 · 0.3 = 0.211
   s² = 0.25   (ᾱ = 0.494):       0.1757 / 0.6295 = 0.279 · x_t    0.279 · 0.3 = 0.084
```

- narrower data, stronger shrinkage: the observation is trusted only as far as the data's own spread allows
- the factor depends on the data's variance; the schedule's variance bookkeeping assumes **s² = 1**


---

## Pitfall: the exact denoiser underflows

The weights are a softmax of `−‖x_t − √ᾱ x⁽ⁱ⁾‖² / (2(1 − ᾱ))`. For digits at small noise:

```text
   t = 0.1:   1 − ᾱ = 0.0279
   a squared distance of 96 (a digit's nearest neighbor sits at about 9.8)
   logit = −96 / (2 · 0.0279) = −1720
   exp(−1720) = 0 in double precision, for EVERY training digit
   naive softmax: 0 / 0 = NaN
```

- subtract the **largest logit** first (log-sum-exp), as in the networks lecture's softmax pitfall; the nearest digit then gets weight ≈ 1
- the demos compute the exact denoiser this way


---

## Two limits

- **t → 0** (little noise): 1 − ᾱ → 0, the weights become **one-hot**, and x̂₀ is exactly the nearest training point: the exact denoiser **memorizes**
- **t → 1** (all noise): the weights become **equal**, and x̂₀ is the **data mean**: at high noise the best guess is the average image
- every sampling run therefore starts as a **gray blur** and sharpens as the noise falls
- the left panel of the figure: nearly a step at ᾱ = 0.9, nearly flat at ᾱ = 0.05


---

## The noised data is the data, blurred

The distribution of x_t is the data's distribution **scaled by √ᾱ and blurred** by a Gaussian of variance 1 − ᾱ:

```text
   two data points ±1:
   ᾱ = 0.9:    bumps at ±0.949, width 0.316    two bumps   (density at 0: 2 % of the peak)
   ᾱ = 0.25:   bumps at ±0.500, width 0.866    one bump    (density at 0 above the bumps)
```

- blurring makes the density **smooth and positive everywhere**, so its gradient, the score, is defined at every x
- denoising at level t is estimating the data from this blurred version; sampling walks from heavy blur to none


---

## Tweedie's formula, derived

The noised density is a sum of Gaussians, one per training point:

```text
   p_t(x)   = (1/N) Σᵢ N( x ; √ᾱ x⁽ⁱ⁾, 1 − ᾱ )
   ∇ p_t(x) = (1/N) Σᵢ N(…) · (√ᾱ x⁽ⁱ⁾ − x) / (1 − ᾱ)        the gradient of each Gaussian
   ∇ log p_t = ∇p_t / p_t = Σᵢ wᵢ (√ᾱ x⁽ⁱ⁾ − x) / (1 − ᾱ)    wᵢ: the same softmax weights
             = (√ᾱ x̂₀ − x) / (1 − ᾱ)
   solve for x̂₀:   x̂₀ = ( x + (1 − ᾱ) ∇ log p_t(x) ) / √ᾱ
```

- the softmax weights appear because dividing by p_t **normalizes** the Gaussians' heights
- for a finite dataset the identity is exact; for any data it holds with p_t the true noised density


---

## Tweedie's formula, checked

The posterior mean is a step up the log-density's gradient:

```text
   x̂₀ = ( x_t + (1 − ᾱ) · ∇ log p_t(x_t) ) / √ᾱ

   the two-point example (ᾱ = ¼, x_t = 0.3, x̂₀ = 0.197):
   score  ∇ log p_t = (√ᾱ x̂₀ − x_t) / (1 − ᾱ) = (0.5 · 0.197 − 0.3) / 0.75 = −0.268
   back   (0.3 + 0.75 · (−0.268)) / 0.5 = 0.197                                  the same x̂₀
```

- a denoiser and a score model are **the same model** in different units
- this is why "denoising score matching" and "diffusion" turned out to be one method


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



---

## The score field

<img src="../../textbook/figures/diff-score-field.svg" class="media-shot" style="max-height: 330px;" alt="arrows from grid points to their denoised estimates at t = 0.5 on the spiral">

- each arrow runs from a grid point to its denoised estimate at t = 0.5; the arrows are the score, scaled
- far from the spiral they point toward its **center of mass**; near it, toward the **nearest arm**
- a sampler follows these arrows, re-evaluated at a lower noise level after each step


---

## One arrow of the field, computed

The spiral, t = 0.5 (√ᾱ = 0.7027, 1 − ᾱ = 0.5062), at the grid point x = (0.8, 0.6):

```text
   d.denoisePoint(0.8, 0.6, 0.5, spiral)     x̂₀ = (0.102, 0.158)
   the data's own mean                              (−0.014, 0.095)
   the drawn arrow     x̂₀ − x                     = (−0.698, −0.442)
   the score   (√ᾱ x̂₀ − x) / (1 − ᾱ)             = (−1.440, −0.966)
   the noise   −√(1 − ᾱ) · score                  = (1.024, 0.687)
   Tweedie back   (x + 0.5062 · score) / 0.7027   = (0.102, 0.158)
```

- the estimate sits near the **center of mass**, nudged toward the grid point's side of the spiral: at 0 dB the softmax is still broad
- arrow and score both point back toward the data; the score is longer because it divides by 1 − ᾱ


---

## Pitfall: recovering x̂₀ from ε̂ at high noise

A network that predicts ε̂ gives `x̂₀ = (x_t − √(1 − ᾱ) ε̂) / √ᾱ`: any error in ε̂ is multiplied by √(1 − ᾱ)/√ᾱ:

```text
   t      √(1 − ᾱ)/√ᾱ        an error of 0.1 in ε̂ becomes
   0.1    0.169               0.017 in x̂₀
   0.5    1.012               0.101
   0.9    6.365               0.64           larger than the whole signal range of a pixel
```

- predicting ε is **ill-conditioned at high noise**; predicting x₀ is ill-conditioned at low noise
- the v-parameterization of the four-coordinates table is **balanced at both ends**; the course's network predicts x₀ and clamps it


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

## The training, counted

```text
   the data                  60,000 MNIST digits, 20 × 20, values in [−1, 1]
   the network               3 hidden layers of 512 SiLU units, 1,002,064 weights, predicts x₀
   its inputs                400 noisy pixels + 64-number time code + 64-number class code = 528
   the run                   41,210 steps × batch 512 = 21.1 million examples ≈ 351.7 epochs
   the time                  about fifteen minutes on a laptop CPU, Adam
```

- every one of the 21 million training examples was **new**: a fresh t and fresh noise on a known digit
- **15 %** of the time the label is replaced by the **no class** row of the embedding (tools/train-mlp.py), so the same network also samples unconditionally; the next lecture uses both for guidance


---

## Counting the million weights

tools/train-mlp.py: inputs 400 pixels + 64 time numbers + 64 class numbers = **528**.

```text
   layer 1    528 → 512     528 · 512 + 512  =   270,848
   layer 2    512 → 512     512 · 512 + 512  =   262,656
   layer 3    512 → 512     512 · 512 + 512  =   262,656
   output     512 → 400     512 · 400 + 400  =   205,200
   class embedding          11 rows · 64     =       704
   time code  64 sines and cosines of 1000·t at fixed frequencies:   0
                                              ───────────
                                               1,002,064
```

- the time enters as **numbers the network reads**, not as weights; the class is a **learned** 64-vector, row 10 the "no class" row
- one forward pass: about one multiply-add per weight, the cost slide's **1,002,064**


---

## One training example, by hand

A two-pixel "image" x₀ = (0.8, −0.4), drawn t = 0.5 (√ᾱ = 0.7027, √(1 − ᾱ) = 0.7114), drawn ε = (0.3, −1.1):

```text
   input       x_t = 0.7027 · x₀ + 0.7114 · ε                    = (0.776, −1.064)
   targets     x₀ = (0.8, −0.4)      ε = (0.3, −1.1)
               v  = 0.7027 · ε − 0.7114 · x₀                    = (−0.358, −0.488)
   the net says x̂₀ = (0.5, 0.1)
   x₀ loss     ((0.5 − 0.8)² + (0.1 + 0.4)²) / 2  = (0.09 + 0.25) / 2 = 0.170
   implied ε̂  (x_t − 0.7027 · x̂₀) / 0.7114                       = (0.596, −1.594)
   ε loss      ((0.596 − 0.3)² + (−1.594 + 1.1)²) / 2              = 0.166
```

- one example: a random t, a random ε, one squared error; the gradient of that number trains the network
- the same mistake costs **0.170** as an x₀ error and **0.166** as an ε error


---

## Two losses, one SNR apart

Since `ε = (x_t − √ᾱ x₀)/√(1 − ᾱ)`, at a fixed input:

```text
   ε − ε̂ = −(√ᾱ / √(1 − ᾱ)) · (x₀ − x̂₀)
   ‖ε − ε̂‖²  =  SNR(t) · ‖x₀ − x̂₀‖²,      SNR = ᾱ / (1 − ᾱ)

   the example (t = 0.5):   0.170 · 0.976 = 0.166
   t = 0.1:   SNR = 34.8          t = 0.9:   SNR = 0.0247
```

- an ε loss is an x₀ loss **weighted by the SNR**: it counts a t = 0.1 error **1,411 times** as heavily as a t = 0.9 error
- the minimizer at every t is the same posterior mean; only **which noise levels the network attends to** changes


---

## The loss has a floor

The best possible x₀ loss at a noise level is the **posterior variance**, averaged over x_t. For the data {−1, +1}, by numerical integration:

| ᾱ | 0.9 | 0.5 | 0.25 | 0.05 |
| - | --- | --- | ---- | ---- |
| minimum x₀ loss | 0.004 | 0.450 | 0.742 | 0.950 |

- at high noise the floor approaches the **data variance**, 1: the exact denoiser itself scores that badly
- a training curve averaged over random t levels off **above zero**; that level is not a bug and not a failure to learn
- losses in different coordinates (x₀, ε, v) have different floors and cannot be compared by their numbers


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

## The sampler, in code

```js
// DDIM (sigma = 0) or DDPM (eta = 1), from the course library's rule
let x = gaussianNoise(d, rng);
const ts = timeline(steps, 0.999);                 // 0.999 … 0
for (let k = 0; k < steps; k++) {
  const t = ts[k], tn = ts[k + 1];
  const a = alphaBar(t), an = alphaBar(tn);
  const x0 = denoise(x, t);                        // the network or the exact posterior mean
  const eps = x.map((v, i) => (v - Math.sqrt(a) * x0[i]) / Math.sqrt(1 - a));
  const sig = eta * Math.sqrt((1 - an) / (1 - a)) * Math.sqrt(1 - a / an);
  const z = gaussianNoise(d, rng);
  x = x0.map((v, i) => Math.sqrt(an) * v + Math.sqrt(1 - an - sig * sig) * eps[i] + sig * z[i]);
}
// x is the sample (at tn = 0, an = 1 and x = x0)
```

- one **denoise** call per step: the step count is the cost of a sample


---

## Ten steps: where the noise levels fall

`timeline(10)` spaces t evenly from 0.999 to 0; the schedule turns that into noise levels:

| t | 0.999 | 0.899 | 0.799 | 0.699 | 0.599 | 0.499 | 0.400 | 0.300 | 0.200 | 0.100 | 0 |
| - | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | ----- | - |
| ᾱ | 0.0000 | 0.025 | 0.095 | 0.204 | 0.342 | 0.495 | 0.648 | 0.787 | 0.899 | 0.972 | 1 |
| SNR (dB) | −56.1 | −16.0 | −9.8 | −5.9 | −2.8 | −0.1 | 2.7 | 5.7 | 9.5 | 15.4 | ∞ |

- the first step crosses **40 dB** of pure noise, where the estimate is the data mean and little happens
- the middle steps cross about **3 dB** each; 0.2 to 0.1 crosses 6 dB; the last step ends on x̂₀ itself


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

## One DDPM step, worked

The same particle and step, now with fresh noise (η = 1) and a fixed draw z = (0.5, −0.3):

```text
   σ  = √((1 − ᾱ′)/(1 − ᾱ)) · √(1 − ᾱ/ᾱ′)                         = 0.329
   the ε̂ coefficient  √(1 − ᾱ′ − σ²)                               = 0.814
   x_t′ = 0.4792 · x̂₀ + 0.814 · ε̂ + 0.329 · z                      = (0.957, 0.875)

   DDIM from the same state:                                        (0.853, 1.044)
```

- the particle moved about **0.2**, ten times the DDIM move: most of that is the fresh noise, which later steps correct
- the stochastic sampler **forgets** part of its past each step; the deterministic one carries it all the way


---

## The reverse step keeps the variance

The squares of the reverse step's three weights sum to one, as the forward formula's do:

```text
   ᾱ(t′) + (1 − ᾱ(t′) − σ²) + σ² = 1

   DDPM step 15:   0.2297 + 0.814² + 0.329²  =  0.2297 + 0.6622 + 0.1081  =  1.0000
   DDIM step 15:   0.2297 + 0.8777²          =  0.2297 + 0.7703           =  1.0000
   last step, t = 0.020 → 0:   ᾱ(0) = 1,  so σ = 0 and the ε̂ weight is 0:   x = x̂₀
```

- σ decides only how the noise share is **split** between the old noise ε̂ and fresh noise z
- at the final step **both** samplers output the estimate: σ vanishes, whatever η is


---

## The cost of a sample

```text
   the course's network        1,002,064 multiply-adds per call
   30 DDIM steps               ≈ 30 million multiply-adds per digit
   50 steps                    ≈ 50 million
```

- the sampler calls the network once per step, so **steps are the cost**; the table two slides on is the trade-off
- ways to cut it: better ODE solvers (Heun, DPM-Solver), and **distillation** into models that sample in one to four steps (consistency models, Song et al. 2023, arXiv:2303.01469)


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

## Check: two steps beat five?

The spiral, exact denoiser, DDIM, 300 particles; mean distance from a landed particle to the nearest data point:

| steps | 2 | 5 | 10 | 20 |
| ----- | - | - | -- | -- |
| distance | 0.084 | 0.103 | 0.064 | 0.020 |

Why does 2 steps score better than 5?

- **A.** two large steps integrate the ODE more accurately than five
- **B.** below ten steps all particles land near the center of mass; 0.08 to 0.10 is the spiral's gap width, not accuracy
- **C.** the 5-step run drew unlucky noise
- **D.** the 2-step sampler skips the high-noise steps


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

## Euler's method, and why steps matter

Solve dx/dt = f(x, t) by stepping: `x ← x + h · f(x, t)`.

- Euler's error per step is O(h²), over the whole run **O(h)**: halve the step, halve the error (first order)
- DDIM is this first-order method on the probability-flow ODE; the spiral table's **0.064 → 0.020 → 0.009** at 10, 20, 50 steps is its convergence, until the floor set by the data's spacing
- **Heun's** method (predict with Euler, then average the slopes at both ends) is second order: error O(h²), the choice in EDM
- the fewer steps you can afford, the more a higher-order solver pays


---

## DDIM inversion

A deterministic sampler is **invertible**: run the same ODE forward in time, from an image to a noise.

- image → noise (inversion) → the **same** noise → the same image back, up to solver error
- edit in between: change the condition (the class, a caption) and sample from the inverted noise; layout and pose survive, content changes
- this is the basis of many diffusion image editors; DDPM, which injects fresh noise, has no such inverse


---

## Interpolating between two noises

Two starting noises for digits, `ε_a` and `ε_b`, each of length ≈ **20** (d = 400). Their straight-line midpoint:

```text
   ‖(ε_a + ε_b)/2‖ ≈ 20 / √2 = 14.1          independent noises are nearly perpendicular
   no real noise is that short: the model never saw such inputs, and the result is washed out
```

- **spherical interpolation** (slerp) moves along the great circle between the two, keeping the length at 20
- the same slerp as the rotation lecture's quaternions: interpolate **directions**, not points


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

## Memorization in large models

The exact denoiser memorizes by construction; trained networks mostly do not, but not never:

- Carlini et al. (2023, arXiv:2301.13188) extracted **more than a thousand** training images from state-of-the-art diffusion models by generating many samples and searching for near-copies
- duplicated training images were the most likely to be regurgitated
- the course's check is the same idea on digits: the distance from a sample to its **nearest training example**, with a memorization threshold


---

## The memorization test, in numbers

The demos' distance is the **root-mean-square** pixel difference, in [−1, 1] units: `√( Σ (aⱼ − bⱼ)² / 400 )`.

```text
   threshold "memorized"                  0.06    a total distance of 0.06 · 20 = 1.2
   exact denoiser samples                 0.000
   bandwidth h = 3                        0.29
   training digit to its nearest OTHER    0.490   (mean over the 2,000-digit set; total 9.80)
   the network's samples                  0.47    (closest of a hundred 0.18)
```

- the network's samples sit as far from the training set as **training digits sit from each other**
- 0.06 per pixel is 3 % of the range: a copy up to faint noise


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

## The network, in node

```js
const net = md.makeMlpDenoiser(manifest, weights);  // lib/core/mlp-denoiser.js
net.sample({ steps: 30, m: 3, seed: 1, cls: 7, w: 2 });  // three 7s; w = 2 is guidance
```

<div style="display:flex; gap:1.2em; align-items:flex-start; justify-content:center;">
<pre style="width:auto; font-size:0.46em; line-height:1.0; margin:0;"><code>....................
.............++#+...
.......+#########...
......###########...
.....+###########...
.....+####+++###+...
............+###....
............###+....
...........+###.....
...........###......
..........###+......
.........####.......
........+###........
........###+........
.......####.........
......+###..........
......###+..........
.....####...........
....+###+...........</code></pre>
<div style="font-size:0.75em; text-align:left; max-width:55%;">

- printed: `#` above 0.3, `+` between −0.3 and 0.3, `.` below
- ink pixels (above 0) per sample: **94, 90, 58**: three 7s of different weights from three noises
- w = 2 calls the network **twice** per step (with and without the label): 60 × 1,002,064 ≈ **60 million** multiply-adds per digit; the three took 0.55 s

</div>
</div>


---

## The network, watched

<img src="../../textbook/figures/diff-net-trajectory.png" class="media-shot" style="max-height: 170px;" alt="the network drawing a 5: the noisy state and the estimate at ten steps of a 30-step run">

<img src="../../textbook/figures/diff-net-steps.png" class="media-shot" style="max-height: 190px;" alt="the network with 3, 5, 10 and 30 steps from the same eight noises, class 3">

- top: drawing a 5, x(t) above and x̂₀ below, t = 1.0 … 0. At step 0, from pure static and the label, the estimate is already a **soft 5**; by step 9 the slant and loop are decided; the last steps add edges
- bottom: 3, 5, 10 and 30 steps from the same noises; mean distance to the nearest training digit **0.48 to 0.51** in every row: nearest-neighbor distance measures **novelty, not quality**


---

## Three sources of error in a sample

| error | where it comes from | seen on |
| ----- | ------------------- | ------- |
| **solver** error | too few, too large steps | the spiral with the exact denoiser: 0.103 at 5 steps, 0.009 at 50 |
| **denoiser** error | the network is not the posterior mean | the network's samples: new digits, some malformed |
| **data** limits | finite data, memorization, gaps | the exact denoiser on digits: copies |

- the exact denoiser isolates the first; the network trades the third for the second
- every improvement in the literature targets one row: better solvers, better networks, more and cleaner data


---

## The reverse step is Gaussian only when it is small

The two-point example at ᾱ = ¼, x_t = 0.3: the true posterior over x₀ is **two spikes**, at −1 (weight 0.401) and +1 (weight 0.599).

```text
   a single Gaussian with the same mean and variance:  mean 0.197,  standard deviation 0.980
   it puts its peak between the two points, where there is no data
```

- a **large** reverse step would need that two-spike distribution; a model that outputs one Gaussian cannot represent it
- over a **small** step the true reverse move is close to Gaussian, which is why DDPM uses many small steps and why few-step samplers need special training


---

## From 2015 to image generators

| year | milestone |
| ---- | --------- |
| 2015 | Sohl-Dickstein et al.: diffusion probabilistic models, on small images |
| 2020 | DDPM: sample quality competitive with GANs (CIFAR-10 FID 3.17) |
| 2021 | Dhariwal & Nichol, arXiv:2105.05233: diffusion models beat GANs on ImageNet |
| 2022 | DALL·E 2 (Ramesh et al., arXiv:2204.06125); Stable Diffusion released publicly in August (Rombach et al., arXiv:2112.10752) |
| 2023 to 2024 | transformer denoisers, flow matching at scale, video models |

- five years from a paper about small images to generators anyone could run on a gaming GPU


---

## The whole method, one slide

```text
   destroy    x_t = √ᾱ x₀ + √(1 − ᾱ) ε                     ᾱ(0.5) = 0.494, SNR −0.1 dB
   learn      minimize ‖net(x_t, t) − x₀‖² over random (x₀, t, ε)     1,002,064 weights
   sample     x̂₀ = net(x, t);  ε̂ = (x − √ᾱ x̂₀)/√(1 − ᾱ)
              x ← √ᾱ′ x̂₀ + √(1 − ᾱ′ − σ²) ε̂ + σ z                 30 steps, 30 M multiply-adds
```

- the exact denoiser **memorizes**; the network, smooth between examples, **draws**


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

