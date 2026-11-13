<!--
  CSS 551 · TOPIC DECK: Ray tracing, further (~14 min, 8 slides), mounted after the lecture's wrap, time permitting.
  Cut 2026-11-12 from topics/ray-tracing.md (L13 polish): the slides the core does not build on, in the
  topic's order, text unchanged. Numbers: textbook/figures/numbers-motion.json (rt.*).
  NEEDS: topics/ray-tracing.md; instancing also needs the normal transform (illumination-supplement.md).
  reveal.js: FLAT; notes follow "Note:"; display formulas are MathJax blocks (lib/deck-math.js).
-->

### Supplement: ray tracing, further

<small>(~14 min, time permitting) · reading: <a href="../../textbook/ray-tracing.html#instancing">Ray Tracing, Sections 3, 4 and 10</a></small>


---

## Ray tracing, in five dates

| year | who | what |
| ---- | --- | ---- |
| 1968 | Appel (IBM) | rays from the eye to find visible surfaces and shadows |
| 1980 | Whitted | recursive rays: reflection, refraction, shadows (74 minutes for the famous image, VAX-11/780) |
| 1984 | Cook, Porter, Carpenter | distributed rays: soft shadows, glossy reflection, depth of field, motion blur |
| 1986 | Kajiya | the rendering equation; path tracing solves it by Monte Carlo |
| 2018 | NVIDIA Turing | ray tracing hardware in consumer GPUs |


---

## Three outcomes of one triangle test

```text
   hit:       o = (0.5, 0.5, 1), d = (0, 0, −1):     u = 0.25, v = 0.25, u + v = 0.5,  t = 1    inside
   miss:      o = (1.5, 1.5, 1):                      u = 0.75, v = 0.75, u + v = 1.5 > 1       outside
   parallel:  d = (1, 0, 0), in the triangle's plane:  det = e1 · (d × e2) = 0                   no hit
```

A robust tracer tests `|det| < ε`, not `det = 0`: a ray **almost** parallel gives a huge t from a tiny determinant.


---

## Instancing: transform the ray, not the object

A thousand chairs: one chair and a thousand matrices. Pull the ray into object space by M⁻¹, intersect there, carry the answer back.

```text
   o' = M⁻¹ o (a point),   d' = M⁻¹ d (a vector, NOT renormalized: t stays the world t)

   ellipsoid = unit sphere scaled by S = diag(2, 1, 1);  ray o = (4, 0.5, 0), d = (−1, 0, 0)
   o' = (2, 0.5, 0),  d' = (−0.5, 0, 0):   a = 0.25,  b = −1,  c = 3.25,  disc = 0.1875
   t = 2.268,   object hit (0.866, 0.5, 0),   world hit (1.732, 0.5, 0)
   normal: (S⁻¹)ᵀ·(0.866, 0.5, 0) → (0.655, 0.756, 0)       through S instead: (0.961, 0.277, 0), 33° off
```


---

## Worked: the refracted direction

Air into glass, `η = 1/1.5`. The ray `d = (0.5, −0.866, 0)` hits a glass surface with normal `n = (0, 1, 0)` at 30°:

```text
   cos θ1 = −d·n = 0.866
   k = 1 − η² (1 − cos² θ1) = 1 − 0.444 × 0.25 = 0.889         √k = 0.943
   t = η d + (η cos θ1 − √k) n
     = (0.333, −0.577, 0) + (0.577 − 0.943) (0, 1, 0)  =  (0.333, −0.943, 0)
   angle from −n:  asin 0.333 = 19.47°          |t| = 1: no renormalizing
   reflected ray:  d − 2 (d·n) n = (0.5, 0.866, 0)
```


---

## Worked: total internal reflection

Glass to air, `η = 1.5`: the square root's argument is `k = 1 − 2.25 sin² θ1`.

```text
   θ1 = 30°:      k = 1 − 2.25 × 0.25  =  0.438     θ2 = asin(1.5 × 0.5) = 48.6°      bends away from n
   θ1 = 41.81°:   k ≈ 0                              θ2 = 90°: the critical angle, asin(1/1.5)
   θ1 = 50°:      k = 1 − 2.25 × 0.587 = −0.320     no refracted ray: all of it reflects
```

A tracer tests `k < 0` and sends only the reflected ray, with weight 1, not F.


---

## Building a good BVH: the surface area heuristic

Where to split a node? The probability that a random ray hitting the parent also hits a child is the ratio of their **surface areas**. The expected cost of a split (MacDonald and Booth, 1990):

```text
   cost = C_trav + (A_left / A) · N_left · C_tri + (A_right / A) · N_right · C_tri       (C = 1 each)

   14 triangles, no split:                       14
   split into 7 + 7, children with area 0.6, 0.5:   1 + 0.6·7 + 0.5·7 = 8.7     good
   split into 7 + 7, overlapping children 0.9, 0.9: 1 + 0.9·7 + 0.9·7 = 13.6    barely worth it
```


---

## Depth of field: sample the lens

<img src="../../textbook/figures/rt-thin-lens.png" class="media-shot" style="max-height: 220px;" alt="three spheres at different depths rendered through a thin lens: the middle one sharp, the near and far ones blurred">

A pinhole camera is always in focus. A **thin lens** of radius 0.12 focused at 3.482 blurs everything else:

```text
   sphere at depth 2.31:    blur circle 6.71 px
   sphere at depth 3.482:   0 px               (in focus)
   sphere at depth 5.044:   4.1 px
   32 rays per pixel, each from a random point on the lens, aimed at the pixel's point on the focal plane
```


---

## Ray tracing in hardware, and denoising

- **RT cores** (NVIDIA Turing, 2018; AMD and Intel since): fixed-function BVH traversal and ray–triangle tests, exposed through DirectX Raytracing and Vulkan
- real-time budgets allow about **1 or 2 rays per pixel per effect**, far too few for a clean image
- a **denoiser** reconstructs the image from those samples: spatial and temporal filters guided by normals and depth (SVGF, Schied et al., 2017), or a trained network (NVIDIA's OptiX denoiser, film renderers)

The ray tracer produces noise; the denoiser, like TAA, borrows from neighbors in space and time.
