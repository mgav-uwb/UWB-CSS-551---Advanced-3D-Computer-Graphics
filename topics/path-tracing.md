<!--
  CSS 551 · TOPIC DECK: Path tracing and the Cornell box (~20 min, 12 slides; more in path-tracing-supplement.md).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/path-tracing.md"> among others; no lecture
  logistics, no "Part N" numbering.

  TEACHES: the rendering equation recalled (the three-light sum); the Monte Carlo estimator, its
  variance and the central-limit 1/√N (σ of one sample 2π/√12, relative 0.577); drawing uniform and
  cosine-weighted directions (Malley); stratification (0.291 to 0.072 at four samples); soft shadows,
  depth of field and motion blur as more dimensions; the path tracer in twenty lines of JS;
  next-event estimation and the area-to-solid-angle change of variables (G = 0.32); the fixed-depth
  pitfall and the furnace test (68 % at depth 3); fireflies (one sample worth 6283); caustics and
  the bidirectional family; participating media (Beer-Lambert); the budget per frame; the history;
  the levers table. Earlier material: four samples of the
  cosine integral by hand (3.811 against π); cosine-weighted importance sampling
  (every sample exactly π); the measured convergence (0.30 at 4 samples, 0.136
  at 16, 0.0094 at 4096); path tracing as a random walk; Russian roulette and why
  it is unbiased (q = 0.7: 24 % of paths reach the sixth bounce); one path's
  throughput through the Cornell box's floor and red wall; the three Cornell
  panels (direct only, 8 and 512 samples); light sampling, BRDF sampling and MIS;
  denoisers.
  EDIT 2026-10-08: "Why the error is 1/√N" retitled "The error falls as 1/√N" (no "Why" titles).
  NEEDS:   the pbr topic (the rendering equation, the BRDF, ρ/π); the ray-tracing
           topic (rays, shadow rays, distributed rays).
  DEMOS:   none (the Cornell box is a computed figure).
  FIGURES: ../../textbook/figures/rt-convergence.svg, rt-cornell.png, rt-mis.svg, rt-soft-shadow.png,
           rt-thin-lens.png, rt-media.svg
           (tools/gen-textbook-figures-motion.mjs, -motion-2.mjs).
  NUMBERS: textbook/figures/numbers-motion.json (rt.monteCarlo, rt.cornell, rt.softShadow, rt.thinLens,
           rt.media); textbook/figures/numbers.json (reSum); the densified extras (variance,
           stratification, Malley, area light, furnace, firefly) from tools/gen-lecture-figures-d1.mjs
           (lectures/L17-diffusion-1/analysis/numbers-d1.json, key dense);
           the path-throughput and roulette lines from tools/gen-lecture-figures-c.mjs,
           using the albedos of the textbook's Cornell scene.

  CUT 2026-11-12 (L13 polish): the core keeps 12 slides (the estimator, 1/√N derived, four samples, measured, the
  random walk, roulette, the fixed-depth pitfall, the Cornell box, fireflies, MIS, fog, the levers); drawing a
  direction, stratification, lens and shutter, the code, next-event estimation, one path's contribution, where
  unidirectional tracing fails, denoising, the budget and the history moved in order to path-tracing-supplement.md.
  Deleted as repeats of the same evening: "The integral, recalled" (the light-transport core's three-light sum,
  with Li where the core has Li·Δω) and "More dimensions, the same estimator: soft shadows" (the ray-tracing
  core's slide, same numbers). Fixes: the code's sampled direction is wi (the light direction wl), roulette on
  its own lines; one path's floor-to-wall bounce is not divided by q (roulette starts after two bounces), and
  its note has the wall's BRDF k/π. The estimator, its variance and roulette's expectation typeset by MathJax.

  reveal.js: FLAT; notes follow "Note:"; plain unicode math; never two "_" on one
  markdown line outside a code fence. Paths relative to the lecture page.
-->

### Path tracing and the Cornell box

<small>(~20 min)</small>


---

## Estimate an integral by sampling

The rendering equation's integral over the hemisphere has no closed form for any real scene. **Sample it**:

Draw N directions ωi from a density p(ω), and average:

<div class="tex" role="img" aria-label="I = ∫ f(ω) dω;  Î = (1/N) · Σ f(ωi) / p(ωi), with ωi drawn from p">
\[ I = \int f(\omega)\, d\omega \qquad\qquad \hat I = \frac{1}{N} \sum_{i=1}^{N} \frac{f(\omega_i)}{p(\omega_i)} \]
</div>

- **unbiased**: the expected value of Î is exactly I, for any p that is positive wherever f is
- its error (standard deviation) falls as **1/√N**
- choosing p close to the **shape** of f (**importance sampling**) shrinks the constant; p ∝ f makes every sample exact


---

## The error falls as 1/√N

Î is an average of N independent copies of one random variable Y = f(ω)/p(ω), so:

<div class="tex" role="img" aria-label="Var[Î] = Var[Y] / N, so the standard deviation is σY / √N">
\[ \operatorname{Var}[\hat I] = \frac{\operatorname{Var}[Y]}{N} \qquad \sigma_{\hat I} = \frac{\sigma_Y}{\sqrt N} \]
</div>

```text
   the cosine integral with uniform directions:  cos θ is uniform on [0, 1], so Y = 2π·u
   mean  2π · ½ = π                                 exact
   σ_Y   2π / √12 = 1.814                           relative to π:  0.577
   predicted relative error:  N = 1: 0.577    N = 4: 0.289    N = 4096: 0.0090
   measured (200 trials):     N = 1: 0.585    N = 4: 0.300    N = 4096: 0.0094
```

- the √N is not a property of rendering: it is the **central limit theorem**, and every sampling method inherits it
- the only other lever is σ_Y, the **spread of one sample**; the rest of this topic is ways to shrink it


---

## Four samples, by hand

The irradiance from a uniform sky of radiance 1: `∫ cos θ dω = π` over the hemisphere.

```text
   uniform directions,  p = 1/(2π):
   cosines of four draws:   0.720  0.456  0.763  0.487      sum 2.426
   Î = (1/4) · Σ cos θi / (1/2π) = 2π × 2.426 / 4 = 3.811          21 % above π = 3.1416

   cosine-weighted directions,  p = cos θ / π:
   each term  cos θi / (cos θi / π) = π                            exact, for any N
```

Cosine-weighted sampling folded the integrand into the density. It is the standard choice for **diffuse** bounces, because the cosine is always a factor.


---

## The 1/√N law, measured

<img src="../../textbook/figures/rt-convergence.svg" class="media-shot" style="max-height: 260px;" alt="measured RMS relative error of the uniform estimate against the number of samples on log axes, falling on a line of slope one half">

```text
   N         1       4       16      64      256     1024    4096
   error     0.585   0.300   0.136   0.073   0.036   0.018   0.0094
```

Four times the samples **halves** the error. A clean frame is not a few more samples than a preview: it is a few **hundred times** more.


---

## Path tracing: a random walk from the eye

Kajiya, 1986: apply the estimator **recursively**. At each hit:

```text
   radiance(ray):
      hit = nearest intersection;  if none: return sky
      L  = emitted(hit)
      L += direct light: one sample point on a light, one shadow ray         (next-event estimation)
      ωi = one random bounce direction (cosine-weighted for diffuse)
      L += f · cos θ / p(ωi) · radiance(ray from hit along ωi)               (indirect)
      return L
```

- **one** bounce direction per hit: the path does not branch, it **walks**
- each pixel averages **many** paths
- the walk ends when it escapes, or when **Russian roulette** stops it


---

## Russian roulette is unbiased

Stop a path at random, and **boost** the survivors:

- continue with probability q, and **divide** the rest of the path's contribution X by q
- stop with probability 1 − q, contributing 0

<div class="tex" role="img" aria-label="E = q · E[X]/q + (1 − q) · 0 = E[X]: the expectation is unchanged">
\[ E = q \cdot \frac{E[X]}{q} + (1 - q) \cdot 0 = E[X] \]
</div>

With q = 0.7 after two bounces:

- 0.7⁴ = **24 %** of paths reach the sixth bounce
- expected extra bounces: q/(1 − q) = **2.33**
- the cost is variance, about 1/q on the terminated part; choosing q from the path's **throughput** (dark paths die young) keeps it small


---

## Pitfall: stopping at a fixed depth

Truncating the walk at depth d **drops** every longer path: the image is too dark, and more samples do not fix it.

```text
   a closed box, every wall albedo a = 0.75, emission E:  radiance = E(1 + a + a² + …) = E/(1 − a) = 4E

   depth kept     1        2        3        6
   sum           1.75     2.31     2.73     3.47         of 4
   fraction      44 %     58 %     68 %     87 %
```

- the **white furnace test**: render a scene whose exact answer you know (a white enclosure, a white object under a uniform sky) and compare; a darker image means lost energy
- bright interiors (snow, white rooms, clouds) are where truncation shows; Russian roulette keeps the expectation exact at any depth


---

## The Cornell box

<img src="../../textbook/figures/rt-cornell.png" class="media-shot" style="max-height: 280px;" alt="three renderings of a Cornell box: direct light only with a black ceiling and black shadows; path traced at 8 samples per pixel, noisy; path traced at 512 samples, with a lit ceiling, soft filled shadows and red and green tints on the spheres">

- **direct light only** (256 samples per pixel): the local model with area-light shadows; **black ceiling**, black shadows
- **path traced, 8 samples**: every effect is present, buried in noise
- **path traced, 512 samples**: noise down by √64 = **8**; ceiling lit from below, shadows filled, spheres tinted red and green


---

## Fireflies

A path that reaches a **small, bright** light by a BRDF-sampled bounce scores enormously:

```text
   a light of solid angle 0.001 sr and radiance 1000;  a uniform bounce hits it with probability 0.00016
   that one sample contributes  Le / p = 1000 · 2π = 6283       (the pixel's true value is about 1)
```

- one sample in about 6,300 is a **firefly**: an isolated white pixel that averaging removes only slowly
- **clamping** each sample's value removes fireflies and **adds bias** (energy is thrown away)
- the unbiased fixes: next-event estimation for small lights, MIS for glossy surfaces, and more samples


---

## Where to sample: light, BRDF, or both

<img src="../../textbook/figures/rt-mis.svg" class="media-shot" style="max-height: 190px;" alt="the error of light sampling, BRDF sampling and their balance-heuristic combination on three integrands; each single strategy fails badly on one, the combination is close to the best on all">

- **light sampling**: every sample aims at the light; fails when the BRDF is a **narrow** lobe
- **BRDF sampling**: every sample follows the lobe; fails when the light is **small**
- **multiple importance sampling** (Veach and Guibas, 1995) draws from both and weights each sample by `w = pa / (pa + pb)`; never much worse than the better one

```text
   one sample, small-light case:  p_light = 2.70,  p_BRDF = 1.448,  f = 3.91
      light only 1.448     BRDF only 2.70     combined  f / (½ p_light + ½ p_BRDF) = 1.885
```


---

## Light through fog: participating media

<img src="../../textbook/figures/rt-media.svg" class="media-shot" style="max-height: 180px;" alt="Transmittance against distance for three extinction coefficients: exponential decays">

```text
   transmittance  T(d) = exp(−σ_t d)            Beer–Lambert
   σ_t = 0.5:  d = 0.5: 0.779   1: 0.607   2: 0.368   4: 0.135      half at d = ln 2 / σ_t = 1.386
   fog σ_t = 0.05:  visibility (T = 2 %) at 78.2 units
   single scattering, σ_s = 0.3 along 2 units in 4 steps:  in-scattered light 0.378
```

- a volume is a medium that absorbs and scatters **everywhere along the ray**, not only at surfaces
- a path tracer samples a **distance** along the ray (with density ∝ T) the same way it samples a direction
- the same exponential is the **alpha compositing** of NeRF's volume rendering (the learned-scenes lecture)


---

## The estimator's levers

| lever | what it changes | cost |
| ----- | --------------- | ---- |
| more samples N | error ∝ 1/√N | linear in N |
| importance sampling (cosine, GGX, light) | σ of one sample | a better density |
| stratification, low-discrepancy sequences | clumping | none |
| multiple importance sampling | worst case across strategies | two densities per sample |
| Russian roulette | path length | variance, no bias |
| next-event estimation | small lights | one shadow ray per bounce |
| denoising | residual noise | a filter pass, some bias |
