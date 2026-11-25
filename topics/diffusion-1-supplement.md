<!--
  CSS 551 · TOPIC DECK: Diffusion models I, further (~80 min, 38 content slides plus six dividers),
  mounted after the lecture's wrap, time permitting. Cut 2026-11-24 from topics/diffusion-1.md (L17)
  (Marcel: "PCA, eigenvalues, hilbert spaces... way over the math level of the class. can the
  following lectures use less math?"): every derivation and worked step of the core, in the topic's
  order, grouped as the forward process worked, the exact denoiser derived, training worked, sampling
  worked, and the digits measured. Nothing graded needs these slides; the HW8 check values (the
  denoiser at step 15 of 50, (0.0367, 0.149); the DDIM step to (0.8534, 1.0442)) are worked here.
  NEEDS: topics/diffusion-1.md.
  NUMBERS: as in that topic's previous version: tools/gen-lecture-figures-d1.mjs
           (lectures/L17-diffusion-1/analysis/numbers-d1.json: schedule, linear, exact2, exact3, ddim,
           flow, steps), checked against textbook/figures/numbers.json; the digit and network values
           quoted from textbook/diffusion-models.html Sections 1, 3 and 6.
  Acronyms spelled out and Greek letters named at their first use in this file. The time step of
  Euler's method is Δt.
  reveal.js: FLAT; notes follow "Note:"; plain-unicode math and ```text fences (no KaTeX); never two
  "_" on one markdown line outside a code fence or code span.
-->

### Supplement: diffusion models I, further

<small>(~80 min, time permitting) · reading: <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 1 to 4</small>


---

### The forward process, worked


---

## Sampling a Gaussian: Box–Muller

The forward process needs one standard Gaussian number ε (epsilon) per pixel. From two uniform numbers u₁, u₂:

```text
   r = √(−2 ln u₁),   z₁ = r cos(2π u₂),   z₂ = r sin(2π u₂)      two independent normals

   u₁ = 0.3, u₂ = 0.7:   r = 1.552,   z₁ = −0.480,   z₂ = −1.476
```

- one pair of uniforms, two Gaussian numbers; a 49,152-pixel image needs 24,576 pairs
- π (pi) is the circle constant; the course's generator is a seeded pseudorandom number generator (PRNG, mulberry32), so a slide shows the same noise every time


---

## One pixel through the forward process

A pixel of value **0.8**, at t = 0.5 (ᾱ (alpha-bar), the schedule, = 0.494):

```text
   x(0.5) = √0.494 · 0.8 + √0.506 · ε = 0.562 + 0.711 ε
   its distribution:  mean 0.562,  standard deviation 0.711
   95 % of draws in   [0.562 − 1.96·0.711,  0.562 + 1.96·0.711]  =  [−0.83, 1.96]
```

- the signal has shrunk by 0.703 and the noise is already as large: signal-to-noise ratio (SNR) ≈ 0 decibels (dB)
- every pixel of the image does this **independently**; the image is still there only as a faint bias of each pixel's mean


---

## Small steps compose into one jump

The original definition is a chain of small steps, `x_k = √(1 − β_k) x_(k−1) + √β_k ε_k`. β (beta) is the noise added at step k. Two steps, β₁ = 0.1, β₂ = 0.2:

```text
   x₂ = √0.8 ( √0.9 x₀ + √0.1 ε₁ ) + √0.2 ε₂
      = √(0.8 · 0.9) x₀  +  [ √0.08 ε₁ + √0.2 ε₂ ]
   signal coefficient²   0.8 · 0.9 = 0.72 = ᾱ
   noise variance        0.08 + 0.2 = 0.28 = 1 − ᾱ          independent Gaussians add variances
```

- so `x_k = √ᾱ_k x₀ + √(1 − ᾱ_k) ε` with **ᾱ = Π(1 − β)**, Π (capital pi) a product: any noise level in one draw
- this closed form is what makes training cheap: no need to simulate the chain step by step


---

## The cosine schedule, in numbers

| t | ᾱ | √ᾱ | √(1 − ᾱ) | SNR (dB) | peak SNR (PSNR) of a digit (dB) |
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

## Two schedules, in numbers

The original schedule of DDPM (denoising diffusion probabilistic models): 1,000 steps with noise variances β rising linearly from 10⁻⁴ to 0.02, ᾱ = Π(1 − β).

| t | 0.1 | 0.3 | 0.5 | 0.7 | 0.9 |
| - | --- | --- | --- | --- | --- |
| ᾱ, cosine | 0.972 | 0.787 | 0.494 | 0.203 | 0.024 |
| ᾱ, linear β | 0.897 | 0.396 | 0.079 | 0.007 | 0.0003 |
| SNR cosine (dB) | 15.4 | 5.7 | −0.1 | −5.9 | −16.1 |
| SNR linear (dB) | 9.4 | −1.8 | −10.7 | −21.5 | −35.6 |

- the linear schedule destroys the signal early: at t = 0.7 the image is 99 % noise with three tenths of the steps to go
- what matters is that the noise levels are spaced **evenly in SNR**; the cosine schedule does about 3 dB per tenth


---

## The noise lives on a shell

A standard Gaussian vector in d dimensions has length close to **√d**:

```text
   d = 400 (a 20 × 20 digit)           ‖ε‖ ≈ 20
   d = 49,152 (128 × 128 red, green, blue)          ‖ε‖ ≈ 221.7
   d = 786,432 (512 × 512 RGB)         ‖ε‖ ≈ 886.8        with a spread of only about ±0.7
```

- the "cloud" at t = 1 is a thin **shell**, not a ball: almost no noise vector is short
- the image-space lecture's "the cube is all corners" in Gaussian form; it matters when noises are **interpolated** (the interpolation slide)


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

### The exact denoiser, derived


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
- Σ (capital sigma) sums over the training points; the only data-dependent input is the distance from x_t to each **scaled** one


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

## The squared error splits: the mean wins

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
   naive softmax: 0 / 0 = NaN (not a number)
```

- subtract the **largest logit** first (log-sum-exp), as in the networks lecture's softmax pitfall; the nearest digit then gets weight ≈ 1
- the demos compute the exact denoiser this way


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

- ∇ (nabla) is the gradient; the softmax weights appear because dividing by p_t **normalizes** the Gaussians' heights
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

### Training, worked


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

## The loss floor, in numbers

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

- KL: the Kullback–Leibler divergence, a distance between two distributions; θ (theta): the network's weights; σ (sigma): the steps' shared standard deviation; λ (lambda): a fixed weight per step
- DDPM's observation: **drop λ_t** (weight every noise level equally) and samples get better; that is the one-line loss
- whatever the weighting, the minimizer at each t is the **posterior mean**: the loss approximates the exact denoiser


---

### Sampling, worked


---

## The reverse step, with fresh noise

The general step from t to t′, with σ (sigma) the size of the fresh noise:

```text
   x_(t′) = √ᾱ(t′) · x̂₀  +  √(1 − ᾱ(t′) − σ²) · ε̂  +  σ · z,          z ~ N(0, I)

   σ = 0         DDIM (denoising diffusion implicit models; Song, Meng & Ermon 2021, arXiv:2010.02502): deterministic
   σ > 0         DDPM (Ho, Jain & Abbeel 2020): part of the noise replaced by fresh noise
```

- read it as: **re-noise the current best guess** to the next, slightly lower, noise level, reusing the noise already believed to be in the picture
- the forward formula and the reverse step are **the same equation**, with x̂₀ standing in for the unknown x₀


---

## The sampler with fresh noise, in code

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

The same particle and step, now with fresh noise (η (eta) = 1) and a fixed draw z = (0.5, −0.3):

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

## The ODE underneath

- the forward process is a stochastic differential equation (SDE), `dx = −½β(t) x dt + √β(t) dw`; its time reversal (Anderson 1982) has a drift that involves the **score**, and running it backward is DDPM
- every such SDE has a companion **ordinary** differential equation (ODE) with the same densities at every t (Song et al. 2021, arXiv:2011.13456):

```text
   dx/dt = −½ β(t) · ( x + ∇ₓ log p_t(x) )            the probability-flow ODE
```

- **DDIM is a first-order solver for it**: that is why its paths are smooth and one start gives one landing
- higher-order solvers (Heun's method in EDM, DPM-Solver) cut the step count; the steps table is their convergence curve


---

## Euler's method, and why steps matter

Solve dx/dt = f(x, t) by stepping with a time step Δt: `x ← x + Δt · f(x, t)`.

- Euler's error per step is O(Δt²), over the whole run **O(Δt)**: halve the step, halve the error (first order)
- DDIM is this first-order method on the probability-flow ODE; the spiral table's **0.064 → 0.020 → 0.009** at 10, 20, 50 steps is its convergence, until the floor set by the data's spacing
- **Heun's** method (predict with Euler, then average the slopes at both ends) is second order: error O(Δt²), the choice in EDM
- the fewer steps you can afford, the more a higher-order solver pays


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

### Digits, measured


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

