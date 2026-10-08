<!--
  CSS 551 · TOPIC DECK: Path tracing and the Cornell box (~38 min, 24 content slides at a brisk pace).
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
           (lectures/L16-diffusion-1/analysis/numbers-d1.json, key dense);
           the path-throughput and roulette lines from tools/gen-lecture-figures-c.mjs,
           using the albedos of the textbook's Cornell scene.

  reveal.js: FLAT; notes follow "Note:"; plain unicode math; never two "_" on one
  markdown line outside a code fence. Paths relative to the lecture page.
-->

### Path tracing and the Cornell box

<small>(~38 min)</small>


---

## The integral, recalled

Tuesday's rendering equation, at one surface point:

```text
   Lo(ωo) = Le(ωo) + ∫ f(ωi, ωo) · Li(ωi) · cos θi  dωi          over the hemisphere

   a diffuse point (f = ρ/π, ρ = 0.6) lit by three directions:
      Li = 2   at 20°:   (0.6/π) · 2   · 0.940 = 0.359
      Li = 0.8 at 60°:   (0.6/π) · 0.8 · 0.500 = 0.076
      Li = 0.5 at 75°:   (0.6/π) · 0.5 · 0.259 = 0.025          sum 0.460
```

- with three point sources the integral is a **sum**; with light arriving from every direction (the sky, every other surface) it is an integral with no closed form
- and **Li is itself an Lo** of another surface: the unknown appears on both sides


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

## The error falls as 1/√N

Î is an average of N independent copies of one random variable Y = f(ω)/p(ω), so:

```text
   Var[Î] = Var[Y] / N          standard deviation  σ_Y / √N

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

## Drawing a direction

Two uniform random numbers u₁, u₂ in [0, 1) become a direction on the hemisphere around the normal (z up):

```text
   uniform in solid angle:        cos θ = u₁            φ = 2π u₂         p = 1/(2π)
   cosine-weighted (Malley):      r = √u₁,  φ = 2π u₂   (a uniform point on the unit disk)
                                  lift it: z = √(1 − u₁)                  p = cos θ / π

   u₁ = 0.36, u₂ = 0.25:
     uniform          cos θ = 0.36,   sin θ = 0.933,   direction (0, 0.933, 0.36)
     cosine-weighted  disk point (0, 0.6),  z = 0.8,    direction (0, 0.6, 0.8)
```

- Malley's method: sample the **disk** uniformly and project up; the projection is what makes the density ∝ cos θ
- the same two numbers give a direction **closer to the normal** under cosine weighting: that is the point


---

## The 1/√N law, measured

<img src="../../textbook/figures/rt-convergence.svg" class="media-shot" style="max-height: 260px;" alt="measured RMS relative error of the uniform estimate against the number of samples on log axes, falling on a line of slope one half">

```text
   N         1       4       16      64      256     1024    4096
   error     0.585   0.300   0.136   0.073   0.036   0.018   0.0094
```

Four times the samples **halves** the error. A clean frame is not a few more samples than a preview: it is a few **hundred times** more.


---

## Stratify: spread the samples out

Independent samples clump by chance. Split [0, 1) into N equal strata and draw **one sample in each**:

```text
   the cosine integral, N = 4, 20,000 trials of each

   independent samples          relative RMS error 0.291
   one per quarter of [0, 1)    relative RMS error 0.072          4 times less, same cost

   four stratum midpoints (0.125, 0.375, 0.625, 0.875):  2π × 2.0 / 4 = π     exact here
```

- the estimator stays **unbiased**: each stratum is sampled in proportion to its width
- the same idea as the antialiasing topic's **jittered** pixel samples; in several dimensions, low-discrepancy sequences (Sobol, Halton) do it for every dimension at once
- stratification helps most on **smooth** integrands; a hard shadow edge inside one stratum gets no help


---

## More dimensions, the same estimator: soft shadows

An area light turns the shadow test into an integral over the light's surface. Four shadow rays to four points on a square light (side 1.2, center (0.8, 3, 0.8)) from the floor point (0.44, 0, −0.16):

<img src="../../textbook/figures/rt-soft-shadow.png" class="media-shot" style="max-height: 180px;" alt="Two renderings of a red sphere on a gray floor: one shadow ray gives a hard-edged shadow; sixteen jittered shadow rays give a soft, graded edge">

```text
   light samples     (0.5, 3, 0.5)  (0.5, 3, 1.1)  (1.1, 3, 0.5)  (1.1, 3, 1.1)
   blocked?           yes            yes            no             no
   visibility estimate 2/4 = 0.5          exact 0.496
   umbra radius 0.506, penumbra width 0.215 (similar triangles estimate 0.24)
```


---

## More dimensions: lens and shutter

<img src="../../textbook/figures/rt-thin-lens.png" class="media-shot" style="max-height: 140px;" alt="Two renderings of three colored spheres on a checkered floor: pinhole sharp everywhere; thin lens with the middle sphere sharp and the near and far spheres blurred">

| dimension sampled | effect | textbook scene |
| ----------------- | ------ | -------------- |
| point in the pixel | antialiasing | the antialiasing topic |
| point on the lens (aperture 0.12) | depth of field | focus 3.482: blur 6.71 px near, 4.1 px far |
| instant in the shutter interval | motion blur | a moving object, averaged over time |
| point on the light | soft shadows | the slide before |

- each is one more coordinate of the random path: a pixel's value is an integral over **all of them at once**


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

## The path tracer, in code

```js
function radiance(ray, depth, throughput) {
  const hit = scene.intersect(ray);
  if (!hit) return sky(ray.dir);
  let L = depth === 0 ? hit.emission : [0, 0, 0];     // emission seen directly; later bounces use NEE
  // next-event estimation: one point on the light, one shadow ray
  const s = light.samplePoint(rng);                    // point, normal, pdf by area
  const toL = sub(s.p, hit.p), r2 = dot(toL, toL), wi = scale(toL, 1 / Math.sqrt(r2));
  if (!scene.occluded(hit.p, s.p)) {
    const G = Math.max(0, dot(hit.n, wi)) * Math.max(0, -dot(s.n, wi)) / r2;
    L = add(L, mul(hit.brdf(wi), scale(light.Le, G / s.pdfA)));
  }
  // one bounce, cosine-weighted: f cos / p = albedo for a diffuse surface
  let q = 1;
  if (depth >= 2) { q = Math.min(0.95, luminance(throughput)); if (rng() > q) return L; }
  const wo = cosineSample(hit.n, rng(), rng());
  const next = radiance({ o: offset(hit.p, hit.n), dir: wo }, depth + 1, mul(throughput, hit.albedo));
  return add(L, scale(mul(hit.albedo, next), 1 / q));
}
```

- about twenty lines; every production path tracer is this plus better sampling and a faster `intersect`


---

## Next-event estimation: sampling the light by area

Pick a point on the light **uniformly by area**, p_A = 1/A, and convert:

```text
   p_ω = p_A · r² / cos θ_light      a patch of the light subtends less solid angle as r² grows
   estimate  =  f · Le · G / p_A,       G = cos θ_surface · cos θ_light / r²

   light area A = 0.25 (p_A = 4);  distance r = 1.5;  cos θ_surface = 0.8,  cos θ_light = 0.9
   p_ω = 4 · 2.25 / 0.9 = 10            G = 0.8 · 0.9 / 2.25 = 0.32
   a diffuse surface of albedo 0.75, Le = 10:   (0.75/π) · 10 · 0.32 / 4 = 0.191
```

- the r² and the two cosines are the **geometry term**: the light's size as seen from the point, times how squarely each faces the other
- sampling the light is excellent for **small** lights and diffuse surfaces; for a mirror it is useless (MIS, below)


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

## Where unidirectional path tracing fails

A **point light** seen through **glass** or in a **mirror**: the paths that carry the light are eye → floor → glass → light.

- a path from the eye must hit the light **by chance** after the specular bounce; a point light has zero area, so the probability is **zero**
- next-event estimation cannot help: the shadow ray from the floor hits the glass, which refracts it away
- result: the **caustic** under a glass of water is missing, however many samples

| method | idea | year |
| ------ | ---- | ---- |
| bidirectional path tracing | trace from the light too, connect the two subpaths | Lafortune & Willems 1993; Veach & Guibas 1994 |
| photon mapping | shoot photons from the light, store them, gather near each eye hit | Jensen 1996 |
| Metropolis light transport | mutate paths that carry light into nearby paths | Veach & Guibas 1997 |


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

## Fewer samples, and a filter

Production path tracers add better densities (glossy lobes, many lights chosen by expected contribution, bidirectional paths for caustics) and one more step:

- a **denoiser**: render at a few samples per pixel, then filter with a learned network that reads the noisy image plus the normals, albedo and depth
- by the 1/√N law, cutting noise tenfold costs a hundred times the rays; the denoiser buys much of that reduction with one filter pass
- real-time path tracing in current games runs at one or two samples per pixel with temporal accumulation and a denoiser

Every one of these is the same estimator with a better p, or a better use of its samples.


---

## The budget, counted

```text
   one 1920 × 1080 frame                            2,073,600 pixels
   at 512 samples per pixel                         1,061,683,200 paths
   each path: ~4 bounces, each a ray and a shadow ray  ≈ 8.5 billion rays per frame

   a GPU with hardware ray tracing: on the order of 10⁹ to 10¹⁰ rays per second
   ⇒ film: minutes to hours per frame on a farm;   games: 1 to 2 samples per pixel, then a denoiser
```

- the same estimator runs at both ends; the difference is **how many samples** and **what fills the gap**
- Blinn's law, in practice: as hardware grows faster, film spends the gain on better images, not on shorter render times


---

## Path tracing in production

- **1986**: Kajiya's *The Rendering Equation* (SIGGRAPH) names the integral and the path-tracing estimator
- **1995 to 1997**: Veach's thesis work: multiple importance sampling, bidirectional path tracing, Metropolis light transport
- **2000s to 2010s**: film renderers move from rasterization-style shading (REYES) with baked lighting to path tracing (Arnold, RenderMan RIS, Manuka, Hyperion); survey: Christensen & Jarosz, *The Path to Path-Traced Movies* (2016)
- **2018**: consumer GPUs gain ray-tracing hardware (NVIDIA Turing); games add path-traced effects at one or two samples per pixel


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

