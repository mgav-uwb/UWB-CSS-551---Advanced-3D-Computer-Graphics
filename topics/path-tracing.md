<!--
  CSS 551 · TOPIC DECK: Path tracing and the Cornell box (~34 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/path-tracing.md"> among others; no lecture
  logistics, no "Part N" numbering.

  TEACHES: the Monte Carlo estimator and its 1/√N error; four samples of the
  cosine integral by hand (3.811 against π); cosine-weighted importance sampling
  (every sample exactly π); the measured convergence (0.30 at 4 samples, 0.136
  at 16, 0.0094 at 4096); path tracing as a random walk; Russian roulette and why
  it is unbiased (q = 0.7: 24 % of paths reach the sixth bounce); one path's
  throughput through the Cornell box's floor and red wall; the three Cornell
  panels (direct only, 8 and 512 samples); light sampling, BRDF sampling and MIS;
  denoisers.
  NEEDS:   the pbr topic (the rendering equation, the BRDF, ρ/π); the ray-tracing
           topic (rays, shadow rays, distributed rays).
  DEMOS:   none (the Cornell box is a computed figure).
  FIGURES: ../../textbook/figures/rt-convergence.svg, rt-cornell.png, rt-mis.svg
           (tools/gen-textbook-figures-motion.mjs, -motion-2.mjs).
  NUMBERS: textbook/figures/numbers-motion.json (rt.monteCarlo, rt.cornell);
           the path-throughput and roulette lines from tools/gen-lecture-figures-c.mjs,
           using the albedos of the textbook's Cornell scene.

  reveal.js: FLAT; notes follow "Note:"; plain unicode math; never two "_" on one
  markdown line outside a code fence. Paths relative to the lecture page.
-->

### Path tracing and the Cornell box

<small>(~34 min)</small>


---

## Estimate an integral by sampling

The rendering equation's integral over the hemisphere has no closed form for any real scene. **Sample it**:

```text
   I = ∫ f(ω) dω        draw N directions ωi from a density p(ω), and average

   Î = (1/N) · Σ  f(ωi) / p(ωi)
```

- **unbiased**: the expected value of Î is exactly I, for any p that is positive wherever f is
- its error (standard deviation) falls as **1/√N**
- choosing p close to the **shape** of f (**importance sampling**) shrinks the constant; p ∝ f makes every sample exact


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

```text
   continue with probability q, and divide the rest of the path's contribution X by q
   stop with probability 1 − q, contributing 0

   E = q · E[X]/q + (1 − q) · 0 = E[X]           the expectation is unchanged
```

With q = 0.7 after two bounces:

- 0.7⁴ = **24 %** of paths reach the sixth bounce
- expected extra bounces: q/(1 − q) = **2.33**
- the cost is variance, about 1/q on the terminated part; choosing q from the path's **throughput** (dark paths die young) keeps it small


---

## One path's contribution

A path leaves the eye, hits the **white floor** (albedo 0.75), bounces to the **red wall** (0.75, 0.15, 0.15), and there its shadow ray sees the light.

With cosine-weighted bounces and a diffuse BRDF k/π, each bounce's weight is:

```text
   (k/π) · cos θ / (cos θ / π) = k                  each bounce multiplies by the albedo

   throughput into the red wall's direct light:   0.75 × (0.75, 0.15, 0.15) = (0.5625, 0.1125, 0.1125)
   if roulette with q = 0.7 let this bounce happen:  ÷ 0.7 → (0.804, 0.161, 0.161)
```

Averaged over hundreds of such paths, the floor near the red wall comes out **pink**: color bleeding, which no line of the code names.


---

## The Cornell box

<img src="../../textbook/figures/rt-cornell.png" class="media-shot" style="max-height: 280px;" alt="three renderings of a Cornell box: direct light only with a black ceiling and black shadows; path traced at 8 samples per pixel, noisy; path traced at 512 samples, with a lit ceiling, soft filled shadows and red and green tints on the spheres">

- **direct light only** (256 samples per pixel): the local model with area-light shadows; **black ceiling**, black shadows
- **path traced, 8 samples**: every effect is present, buried in noise
- **path traced, 512 samples**: noise down by √64 = **8**; ceiling lit from below, shadows filled, spheres tinted red and green


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

## Fewer samples, and a filter

Production path tracers add better densities (glossy lobes, many lights chosen by expected contribution, bidirectional paths for caustics) and one more step:

- a **denoiser**: render at a few samples per pixel, then filter with a learned network that reads the noisy image plus the normals, albedo and depth
- by the 1/√N law, cutting noise tenfold costs a hundred times the rays; the denoiser buys much of that reduction with one filter pass
- real-time path tracing in current games runs at one or two samples per pixel with temporal accumulation and a denoiser

Every one of these is the same estimator with a better p, or a better use of its samples.

