<!--
  CSS 551 · L18 discussion (10 min), HW8 walk-through (8 min), wrap (2 min).
  Two peer-instruction questions; answers only in the notes. Numbers from
  lectures/L18-learned-scenes/figures/numbers.json (tools/gen-lecture-figures-d2.mjs).
  HW8 numbers from homework/hw08/expected.json, which match textbook/figures/numbers.json.
-->

### Discussion

<small>(~10 min · two questions · vote, argue in pairs, vote again)</small>


---

## Question 1: a two-sample ray

A ray meets two samples with densities `σ = 2` and `σ = 3`, spacing `δ = 0.25`. What fraction of the ray reaches the background?

- **A.** 0.079
- **B.** 0.287
- **C.** 0.007
- **D.** 0.472


---

## Question 2: a splat's footprint

A splat projects to the screen with covariance `Σ′ = [ 5  2 ; 2  2 ]` (pixels squared). The radii of its one-standard-deviation ellipse are:

- **A.** 2.236 and 1.414 px
- **B.** 6 and 1 px
- **C.** 2.449 and 1.000 px
- **D.** 1.871 and 1.871 px


---

## HW8: diffusion and learned scenes

Out tonight, due **Wednesday December 9, 11:59 PM**. JavaScript (the WebGL track) or a Python notebook. Six functions, each checked against the text's numbers:

```text
   denoise(x, t, data)           exact denoiser, spiral, step 15 of 50   x̂₀ = (0.0367, 0.1490)
   ddimStep(x, x̂₀, tFrom, tTo)   one DDIM step                           (0.8534, 1.0442)
   sampleDDIM(starts, data, 50)  the sampler, first 60 starts            mean distance 0.0090
   renderRay(σ, colors, δ)       tonight's five samples                  C = (0.791, 0.217, 0.226), T = 0.0672
   projectSplat(s, 30°, t, f)    tonight's worked splat                  radii 40.11, 10.00 px at 30.0°
   compositeSplats(row, u)       three splats at u = 0.45                C = (0.468, 0.223, 0.348), T = 0.2354
```

- the library's own denoiser and sampler are the **answer key**, not the tool: compare against them, do not call them
- <a href="../../homework/hw08/index.html">the HW8 page</a> has the skeleton for each track and the tolerances


---

## Wrap

- A learned scene is **one place, learned from its photographs**: a field rendered by an integral, or Gaussians rendered by your rasterizer with your `V` and a Jacobian of your `P`
- Both composite front to back with the same `C = Σ Tᵢαᵢcᵢ`; they differ in **what a sample is** and **how many there are**

**Reading**: <a href="../../textbook/learned-scenes.html">Learned Scenes</a>. **Due**: HW8, Wednesday December 9, 11:59 PM. **Now**: Quiz 7.

