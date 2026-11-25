<!--
  CSS 551 · L18, Thursday December 3 (in person): Diffusion Models II.
  Plan C (planning/css551-au26-plan-c-2026-09-29.md), week 10.
  Re-sequenced 2026-10-25 (was L17, Tuesday December 1): a Thursday in person; HW8 goes out tonight,
  so its walk-through moved here from the learned-scenes lecture.

  COMPOSITION: index.html mounts L18-open.md (title + tonight), then
  ../../topics/diffusion-2.md (~98 min, 41 content slides), then L18-discuss.md (the HW8 walk-through
  and the wrap), then ../../topics/diffusion-2-supplement.md (~74 min, 31 slides; time permitting, or reading).
  EDIT 2026-11-24 LESS MATH (Marcel: "PCA, eigenvalues, hilbert spaces... way over the math level of the
  class. can the following lectures use less math?"): the topic is a conceptual method survey; its worked
  numbers and derivations moved to the supplement after the wrap. Tonight's bullets follow; each acronym
  is spelled out at its first use in this file.

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence; no "next time".

  Plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Opening (2 slides)                             2 min
    0:02  Diffusion models II (topic, 41 slides)        98 min
    1:40  Questions and buffer                          13 min
    1:53  HW8 walk-through                               5 min
    1:58  Wrap                                           2 min
    2:00  end
  CUT 2026-10-08: the six discussion questions; their 18 minutes are questions and buffer.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 18: Diffusion Models II**

> DDIM (denoising diffusion implicit models, 2021) made the sampler deterministic and cut the steps to tens, from the same trained network.

<small>Song, Meng and Ermon, arXiv:2010.02502</small>

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **The condition**: five ways in; the class and time slots; the label dropped in training
- **Guidance**: what it does and costs, its repairs, live
- **Faster samplers**: flow matching, reflow, distillation
- **Latents**: the autoencoder; what an 8 × 8 block costs
- **Text**: cross-attention, attention editing, text encoders
- **Control**: ControlNet, rendered conditions, inpainting, SDEdit (stochastic differential editing)
- **Text to 3D**: score distillation, DreamFusion and after
- **Judging**: FID (Fréchet inception distance), precision and recall, CLIP (contrastive language-image pretraining) score, memorization
- the **HW8** (homework 8) walk-through

<small>Reading: the course text, <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 3.2 and 5 to 9.</small>

