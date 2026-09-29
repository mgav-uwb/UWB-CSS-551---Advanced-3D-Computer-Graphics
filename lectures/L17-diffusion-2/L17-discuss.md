<!--
  CSS 551 · L17 discussion (28 min) and wrap (3 min). Four peer-instruction
  questions: project, vote, argue in pairs two minutes, vote again, then work it.
  Answers and worked solutions are in the notes only. Every number is from
  lectures/L17-diffusion-2/figures/numbers.json (tools/gen-lecture-figures-d2.mjs).
-->

### Discussion

<small>(~28 min · four questions · vote, argue in pairs, vote again)</small>


---

## Question 1: guidance

At one step, a pixel pair has unconditional estimate `(0.1, −0.2)` and conditional estimate `(0.3, 0.0)`. With classifier-free guidance at `w = 4`, before any clamping, the guided estimate is:

- **A.** `(1.2, 0.0)`
- **B.** `(0.3, 0.0)`
- **C.** `(0.9, 0.6)`
- **D.** `(1.1, 0.8)`


---

## Question 2: the latent

An encoder downsamples by 8 in each direction and outputs 4 channels. For a 1024×1024 RGB image, how many numbers does the diffusion model denoise at each step?

- **A.** 49,152
- **B.** 65,536
- **C.** 393,216
- **D.** 16,384


---

## Question 3: the depth condition

A renderer uses near `n = 1` and far `f = 8`. A pixel's depth buffer stores `0.8571`. How far from the eye is the surface?

- **A.** 7.0
- **B.** 4.0
- **C.** 5.33
- **D.** 1.17


---

## Question 4: one flow-matching step

Data `{−1, +1}`, `t = 0.5`, and a particle at `x = −0.3`. The exact velocity gives `x̂₀ = −0.537`. After one Euler step of the sampler to `t = 0.4`, the particle is at:

- **A.** `−0.253`
- **B.** `−0.347`
- **C.** `−0.537`
- **D.** `+0.347`


---

## Wrap

- Guidance, latents, text and control all change **what the denoiser estimates or where the point lives**; the sampler is the one from before
- Score distillation turns an image model into a **judge of renders**; with a differentiable renderer it trains a 3D scene, and it averages rather than samples

**Reading**: the course text, <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 3.2 and 5 to 9. **Thursday**: Quiz 7 at the end of class; HW8 goes out.

