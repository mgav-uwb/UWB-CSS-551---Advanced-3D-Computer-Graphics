<!--
  CSS 551 · L18 HW8 walk-through (5 min) and wrap (2 min).
  CUT 2026-10-08: the six multiple-choice discussion questions (guidance, the latent, the depth
  condition, one flow-matching step, rescale not clip, the latent's penalty); the freed 18 minutes
  are questions and buffer.
  Re-sequenced 2026-10-25 (was L17): HW8 goes out tonight (due Friday December 11), so the HW8
  walk-through moved here from the learned-scenes lecture. HW8 numbers from homework/hw08/expected.json,
  which match textbook/figures/numbers.json.
-->

### HW8, and the wrap

<small>(~7 min)</small>


---

## HW8: diffusion and learned scenes

Out tonight, due **Friday December 11, 11:59 PM**, the last day work is accepted (no late token). JavaScript (the WebGL track) or a Python notebook. Six functions, each checked against the text's numbers:

```text
   denoise(x, t, data)           exact denoiser, spiral, step 15 of 50   x̂₀ = (0.0367, 0.1490)
   ddimStep(x, x̂₀, tFrom, tTo)   one DDIM step                           (0.8534, 1.0442)
   sampleDDIM(starts, data, 50)  the sampler, first 60 starts            mean distance 0.0090
   renderRay(σ, colors, δ)       Lecture 19's 5 samples                  C = (0.791, 0.217, 0.226), T = 0.0672
   projectSplat(s, 30°, t, f)    Lecture 19's worked splat               radii 40.11, 10.00 px at 30.0°
   compositeSplats(row, u)       three splats at u = 0.45                C = (0.468, 0.223, 0.348), T = 0.2354
```

- the library's own denoiser and sampler are the **answer key**, not the tool: compare against them, do not call them
- <a href="../../homework/hw08/index.html">the HW8 page</a> has the skeleton for each track and the tolerances


---

## Wrap

- Guidance, latents, text and control all change **what the denoiser estimates or where the point lives**; the sampler is the one from before
- Guidance extrapolates past the conditional estimate: sharper, less varied, clamped at the rail; rescaling, intervals and distillation are its repairs
- Score distillation turns an image model into a **judge of renders**; with a differentiable renderer it trains a 3D scene, and it averages rather than samples

- **Read**: <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 3.2 and 5 to 9
- **Out**: HW8, due Friday December 11, 11:59 PM
- **Quiz 7**, on Canvas: tonight 8 PM to Sunday December 6, 11:59 PM; Lectures 15 to 17, HW6 and HW7

