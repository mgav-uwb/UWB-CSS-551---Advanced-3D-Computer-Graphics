<!--
  CSS 551 · L17 wrap (2 min).
  CUT 2026-10-08: the six multiple-choice discussion questions (guidance, the latent, the depth
  condition, one flow-matching step, rescale not clip, the latent's penalty); the freed 18 minutes
  are questions and buffer.
-->


## Wrap

- Guidance, latents, text and control all change **what the denoiser estimates or where the point lives**; the sampler is the one from before
- Guidance extrapolates past the conditional estimate: sharper, less varied, clamped at the rail; rescaling, intervals and distillation are its repairs
- Score distillation turns an image model into a **judge of renders**; with a differentiable renderer it trains a 3D scene, and it averages rather than samples

- **Read**: <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 3.2 and 5 to 9
- **Thursday**: Quiz 7 in the first 20 minutes, on Lecture 16 and tonight's lecture; HW8 goes out

