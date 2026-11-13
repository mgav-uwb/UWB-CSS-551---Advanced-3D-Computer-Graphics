<!--
  CSS 551 · TOPIC DECK: Path tracing, further (~16 min, 10 slides), mounted after the lecture's wrap, time permitting.
  Cut 2026-11-12 from topics/path-tracing.md (L13 polish): the slides the core does not build on, in the
  topic's order, text unchanged but for the fixes listed in path-tracing.md's CUT note.
  Numbers: as path-tracing.md.
  NEEDS: topics/path-tracing.md, topics/ray-tracing.md.
  reveal.js: FLAT; notes follow "Note:"; display formulas are MathJax blocks (lib/deck-math.js).
-->

### Supplement: path tracing, further

<small>(~16 min, time permitting) · reading: <a href="../../textbook/ray-tracing.html#montecarlo">Ray Tracing, Sections 7, 8 and 10</a></small>


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

## More dimensions: lens and shutter

<img src="../../textbook/figures/rt-thin-lens.png" class="media-shot" style="max-height: 140px;" alt="Two renderings of three colored spheres on a checkered floor: pinhole sharp everywhere; thin lens with the middle sphere sharp and the near and far spheres blurred">

| dimension sampled | effect | textbook scene |
| ----------------- | ------ | -------------- |
| point in the pixel | antialiasing | the antialiasing topic |
| point on the lens (aperture 0.12) | depth of field | focus 3.482: blur 6.71 px near, 4.1 px far |
| instant in the shutter interval | motion blur | a moving object, averaged over time |
| point on the light | soft shadows | the ray-tracing topic |

- each is one more coordinate of the random path: a pixel's value is an integral over **all of them at once**


---

## The path tracer, in code

```js
function radiance(ray, depth, throughput) {
  const hit = scene.intersect(ray);
  if (!hit) return sky(ray.dir);
  let L = depth === 0 ? hit.emission : [0, 0, 0];     // emission seen directly; later bounces use NEE
  // next-event estimation: one point on the light, one shadow ray
  const s = light.samplePoint(rng);                    // point, normal, pdf by area
  const toL = sub(s.p, hit.p), r2 = dot(toL, toL), wl = scale(toL, 1 / Math.sqrt(r2));
  if (!scene.occluded(hit.p, s.p)) {
    const G = Math.max(0, dot(hit.n, wl)) * Math.max(0, -dot(s.n, wl)) / r2;
    L = add(L, mul(hit.brdf(wl), scale(light.Le, G / s.pdfA)));
  }
  // one bounce, cosine-weighted: f cos / p = albedo for a diffuse surface
  let q = 1;
  if (depth >= 2) {                                    // Russian roulette
    q = Math.min(0.95, luminance(throughput));
    if (rng() > q) return L;
  }
  const wi = cosineSample(hit.n, rng(), rng());
  const next = radiance({ o: offset(hit.p, hit.n), dir: wi }, depth + 1, mul(throughput, hit.albedo));
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

## One path's contribution

A path leaves the eye, hits the **white floor** (albedo 0.75), bounces to the **red wall** (0.75, 0.15, 0.15), and there its shadow ray sees the light.

With cosine-weighted bounces and a diffuse BRDF k/π, each bounce's weight is:

```text
   (k/π) · cos θ / (cos θ / π) = k                  each bounce multiplies by the albedo

   throughput into the red wall's direct light:   0.75 × (0.75, 0.15, 0.15) = (0.5625, 0.1125, 0.1125)
   roulette starts after two bounces, so this bounce is not divided by q
```

Averaged over hundreds of such paths, the floor near the red wall comes out **pink**: color bleeding, which no line of the code names.


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
