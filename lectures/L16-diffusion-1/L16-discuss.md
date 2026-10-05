<!--
  CSS 551 · L16 discussion and wrap (~30 min). Mounted by index.html AFTER the topic.
  Four peer-instruction questions (vote, argue in pairs two minutes, vote again, then work it).
  Answers and worked solutions live ONLY in the Note: blocks. Numbers from
  tools/gen-lecture-figures-d1.mjs (analysis/numbers-d1.json in this folder, keys exact3, exact2,
  ddim, psnr85, steps) and textbook/diffusion-models.html Sections 1 and 4.
-->

### Discussion

<small>(~27 min)</small>


---

## Question 1: three training points

The dataset is three scalars, **{−1, 0, +1}**. At a time where ᾱ = ¼, you observe x_t = 0.3. What does the exact denoiser return?

- **A.** 0.000
- **B.** 0.125
- **C.** 0.197
- **D.** 0.300


---

## Question 2: one jump to the end

The lecture's particle at step 15: x_t = (0.8662, 1.0562), x̂₀ = (0.0367, 0.1490), ε̂ = (0.9523, 1.1084). Instead of stepping to t′ = 0.6793, the sampler jumps straight to **t′ = 0** with σ = 0. Where does the particle land?

- **A.** (0.8534, 1.0442)
- **B.** (0.0367, 0.1490)
- **C.** (0.9523, 1.1084)
- **D.** (0.8662, 1.0562)


---

## Question 3: what 8.5 dB means

At t = 0.5 the noised digit has **PSNR 8.5 dB** against the clean one (pixels in [0, 1]). What is the typical per-pixel error?

- **A.** 0.085
- **B.** 0.14
- **C.** 0.38
- **D.** 0.71


---

## Question 4: stochastic or deterministic?

On the spiral with the exact denoiser, 300 particles, **50 steps**: DDIM (σ = 0) lands a mean distance **0.009** from the data, DDPM (σ > 0) **0.009**. Which statement is right?

- **A.** DDPM is more accurate, because fresh noise corrects errors
- **B.** DDIM is more accurate, because it has no randomness
- **C.** they are equally accurate; they differ in **which** data point a given start reaches
- **D.** DDPM cannot land on the data, because noise is added at every step


---

## Wrap

- the forward process is bookkeeping; the exact denoiser is a softmax-weighted average of the data, and a trained network approximates it
- sampling re-noises the current estimate to a lower level, step by step; a network **generalizes** where the exact denoiser can only memorize

**Read:** [Diffusion Models](../../textbook/diffusion-models.html), Sections 1 to 6

**Due:** HW7, Wednesday November 25, 11:59 PM · **Thursday:** Thanksgiving, no class · **Quiz 6**: on Canvas, Thursday November 26, 12:00 AM to Sunday November 29, 11:59 PM; 20 minutes, alone, no notes; on Lecture 15 and HW7

