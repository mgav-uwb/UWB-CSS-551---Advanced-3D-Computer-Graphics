<!--
  CSS 551 · TOPIC DECK: Ray tracing, rays, intersections, Whitted, the BVH (~44 min, 22 slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/ray-tracing.md"> among others; no lecture
  logistics, no "Part N" numbering.

  TEACHES: the rasterizer's loop turned inside out; the ray through a pixel from
  the camera basis (pixel (89, 62) → d = (−0.372, −0.370, −0.852)); ray against a
  sphere (t = 6.228; a miss at pixel (20, 20)); Möller–Trumbore on one triangle
  (det 4, u = v = 0.25, t = 1); the slab test on a box (t ∈ [1.02, 2.04]);
  instancing by transforming the ray, and the normal through the inverse transpose
  (33° error otherwise); Whitted recursion (13 segments for two primary rays),
  reflection, Snell refraction and Fresnel for glass; shadow acne; the BVH
  (4.3 × 10¹¹ tests to about 2 × 10⁸ for the bunny at 1080p); distributed rays
  and the soft shadow's penumbra.
  NEEDS:   the viewing topic (the camera basis u, v, w); the illumination topic
           (N·L, R); the rasterization topic (edge functions, barycentric weights);
           the pbr topic (Fresnel) helps but is not required.
  DEMOS:   none (the renders are computed figures).
  FIGURES: ../../textbook/figures/rt-*.svg, rt-whitted.png, rt-soft-shadow.png
           (tools/gen-textbook-figures-motion.mjs, -motion-2.mjs).
  NUMBERS: textbook/figures/numbers-motion.json (rt.*).

  reveal.js: FLAT; notes follow "Note:"; plain unicode math; never two "_" on one
  markdown line outside a code fence. Paths relative to the lecture page.
-->

### Ray tracing

<small>(~44 min)</small>


---

## Turn the loop inside out

```text
   rasterizer:   for each triangle:  for each pixel it covers:   is this triangle nearest here?
   ray tracer:   for each pixel:     for each object:            which object does this ray hit first?
```

- the rasterizer **projects** geometry onto the screen; the tracer **searches** the scene from the eye
- a ray tracer gets **shadows, mirrors and refraction** by sending more rays from the hit point
- it pays per pixel a **search**, which a tree over the scene turns from linear to logarithmic

Appel cast rays for visibility and shadows in 1968; Whitted made the hit point a source of rays in 1980; since 2018 GPUs trace rays in dedicated hardware.


---

## Ray tracing, in five dates

| year | who | what |
| ---- | --- | ---- |
| 1968 | Appel (IBM) | rays from the eye to find visible surfaces and shadows |
| 1980 | Whitted | recursive rays: reflection, refraction, shadows (74 minutes per image on a VAX-11/780) |
| 1984 | Cook, Porter, Carpenter | distributed rays: soft shadows, glossy reflection, depth of field, motion blur |
| 1986 | Kajiya | the rendering equation; path tracing solves it by Monte Carlo |
| 2018 | NVIDIA Turing | ray tracing hardware in consumer GPUs |


---

## The ray through a pixel

A ray: `r(t) = o + t·d`, `t ≥ 0`. From the viewing topic's camera (eye e, basis u right, v up, w backward, vertical field of view φ, S × S pixels):

```text
   sx = 2(px + ½)/S − 1        sy = 1 − 2(py + ½)/S
   d  = normalize( sx·tan(φ/2)·u + sy·tan(φ/2)·v − w ),    o = e
```

The illumination demo's camera: e = (3, 3, 6), φ = 28°, S = 150, tan 14° = 0.2493.

```text
   u = (0.894, 0, −0.447)   v = (−0.183, 0.913, −0.365)   w = (0.408, 0.408, 0.816)
   pixel (89, 62):   (sx, sy) = (0.1933, 0.1667)
   d = normalize(0.0482·u + 0.0416·v − w) = (−0.372, −0.370, −0.852)
```

The projection matrix run **backward**: a pixel to the line of points that project there. No matrix, no divide.


---

## Ray against a sphere

Substitute the ray into `|p − c|² = r²`. With `m = o − c` and unit d:

```text
   t² + 2 b t + c' = 0,     b = m·d,   c' = m·m − r²,     t = −b ± √(b² − c')

   the demo's sphere, r = 1.2 at the origin, m = e = (3, 3, 6):
   b  = 3(−0.372) + 3(−0.370) + 6(−0.852) = −7.334
   c' = 54 − 1.44 = 52.56
   b² − c' = 53.78 − 52.56 = 1.222 > 0:    t = 7.334 ∓ 1.106 → entry 6.228, exit 8.439
   hit = e + 6.228 d = (0.683, 0.698, 0.697)    within 0.012 of the marked point
```

Pixel (20, 20): b² − c' = −1.887, no real root: a **miss**, the ray sees the background. The normal at a hit is (p − c)/r.


---

## Ray against a triangle: Möller–Trumbore

Solve `o + t d = A + u e1 + v e2` for t, u, v at once (Cramer's rule):

```text
   e1 = B − A,  e2 = C − A,  s = o − A,  p = d × e2,  q = s × e1
   det = e1·p     u = s·p / det     v = d·q / det     t = e2·q / det
   hit when u ≥ 0, v ≥ 0, u + v ≤ 1, t > 0;   det = 0: the ray is parallel

   A = (0,0,0)  B = (2,0,0)  C = (0,2,0);   o = (0.5, 0.5, 1),  d = (0, 0, −1)
   p = (2, 0, 0)   det = 4   u = 0.25   q = (0, 2, −1)   v = 0.25   t = 1
   hit (0.5, 0.5, 0),  barycentric (1 − u − v, u, v) = (0.5, 0.25, 0.25)
```

From (1.5, 1.5, 1): u = v = 0.75, u + v = 1.5 > 1, **outside**. The weights are the rasterizer's barycentric weights, in 3D.


---

## Three outcomes of one triangle test

```text
   hit:       o = (0.5, 0.5, 1), d = (0, 0, −1):     u = 0.25, v = 0.25, u + v = 0.5,  t = 1    inside
   miss:      o = (1.5, 1.5, 1):                      u = 0.75, v = 0.75, u + v = 1.5 > 1       outside
   parallel:  d = (1, 0, 0), in the triangle's plane:  det = e1 · (d × e2) = 0                   no hit
```

A robust tracer tests `|det| < ε`, not `det = 0`: a ray **almost** parallel gives a huge t from a tiny determinant.


---

## Ray against a box: three slabs

An axis-aligned box is three slabs. Per axis, the ray is inside for `t ∈ [(x0 − ox)/dx, (x1 − ox)/dx]` (sorted); the box is hit when the three intervals **overlap**.

```text
   box [0,1]³,   o = (−1, 0.5, 0.5),   d = (0.981, 0.196, 0)
   x slab:  t ∈ [1.02, 2.04]
   y slab:  t ∈ [−2.55, 2.55]
   z slab:  dz = 0 and oz inside: no constraint
   overlap [1.02, 2.04]:  enters at t = 1.02,  at (0, 0.7, 0.5) on the left face
```

Enter at the **largest** lower bound, leave at the **smallest** upper bound. This test is what the acceleration tree runs millions of times.


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

## Whitted: the hit point sends rays

<img src="../../textbook/figures/rt-whitted-2d.svg" class="media-shot" style="max-height: 230px;" alt="two primary rays traced to depth 2 in a flat scene: shadow rays toward the light, a reflection off a mirror sphere, and refraction into and out of a glass sphere; thirteen ray segments">

```text
   shade(ray, depth):
      hit = nearest intersection;  if none: return background
      color = ambient
      for each light:  if the shadow ray to it hits nothing:  color += diffuse + specular
      if mirror and depth < max:  color += kr · shade(reflected ray, depth + 1)
      if glass  and depth < max:  color += F · shade(reflected) + (1 − F) · shade(refracted)
      return color
```

Two primary rays to depth 2: **13 segments**, 6 of them shadow rays. One recursion; the image is a tree of rays per pixel.


---

## Reflection, refraction, Fresnel

```text
   reflect:   r = d − 2 (d·n) n                          (the illumination topic's R, sign of L reversed)
   refract:   n1 sin θ1 = n2 sin θ2                       (Snell)
              t = η d + (η cos θ1 − √(1 − η²(1 − cos² θ1))) n,    η = n1/n2;   √ of a negative: total internal reflection

   air → glass (n = 1.5):   30° → 19.47°      60° → 35.26°
   glass → air:  critical angle arcsin(1/1.5) = 41.81°; beyond it the ray stays inside

   Fresnel (Schlick), F0 = ((1 − 1.5)/(1 + 1.5))² = 0.04:
      0°  0.04     45°  0.042     60°  0.07     80°  0.41     89°  0.92
```

A window is nearly invisible face-on and a **mirror** at a grazing angle. Whitted weights the reflected ray by F and the refracted ray by 1 − F.


---

## The Whitted render

<img src="../../textbook/figures/rt-whitted.png" class="media-shot" style="max-height: 300px;" alt="three spheres over a checkered plane: a mirror sphere reflecting the floor upside down, a glass sphere showing an inverted view of the scene, a diffuse sphere, all with hard shadows">

320 × 200 = 64,000 primary rays, depth 4, three spheres and a plane, one point light.

- **has**: exact hard shadows, reflections of things off-screen, refraction through the glass (the inverted view)
- **lacks**: everything **soft**: point light, so hard shadow edges; one reflection ray, so perfect mirrors; a diffuse hit sends no rays, so no color bleeding


---

## How many rays does Whitted need?

Each hit on a glass surface spawns a **reflected** and a **refracted** ray, and each hit sends a **shadow** ray toward each light:

```text
   the 2D figure:   13 segments: 2 primary, 3 reflected, 2 refracted, 6 shadow (5 blocked)
   the 320 × 200 render:   64,000 primary rays, depth limit 4
      worst case per pixel:  1 + 2 + 4 + 8 + 16 = 31 rays (without shadow rays)
      worst case per frame:  1,984,000 rays, plus a shadow ray at every hit
```

The depth limit and Fresnel-weighted **cutoffs** (stop when a ray's weight is tiny) keep the tree small in practice.


---

## Pitfall: shadow acne

A shadow ray that starts **exactly** at the hit point re-hits the same surface at `t ≈ 10⁻⁸` from rounding, and the surface shadows itself in speckles.

```text
   fix:  o_shadow = hit + ε · n        ε = 10⁻⁴ in the chapter's code
   or:   accept only hits with t > ε
```

- ε too small: acne returns at large scene scales
- ε too large: shadows detach from contact points (**peter-panning**) and thin objects are missed


---

## Acceleration: the bounding-volume hierarchy

<img src="../../textbook/figures/rt-bvh.svg" class="media-shot" style="max-height: 230px;" alt="a three-level box hierarchy over 14 triangles and one ray's traversal: the boxes tested and the leaves reached">

A binary tree of boxes: each node holds the box of everything below it. A ray descends only into boxes it hits, and skips any box beyond the nearest hit so far.

```text
   14 triangles, median split, depth 3:   15 box tests + 7 triangle tests   (brute force: 14 triangle tests)
   the bunny, 69,451 triangles, 1920×1080, 3 rays per pixel:
      brute force:  2,073,600 × 3 × 69,451 ≈ 4.3 × 10¹¹ tests
      BVH:          log₂ 69,451 = 16.1 levels → about 2 × 10⁸ tests,  2,000 times fewer
```


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

## Distributed rays: soft shadows

<img src="../../textbook/figures/rt-soft-shadow.png" class="media-shot" style="max-height: 230px;" alt="a sphere over a floor lit by a square area light: one shadow ray per pixel gives a hard shadow, sixteen give a soft penumbra with noise at its edge">

Cook, Porter and Carpenter, 1984: every hard edge in a Whitted image is an **integral replaced by one sample**. Send several rays, at random positions in the integral's domain, and average.

```text
   sphere r 0.5 at height 0.5; square light, side 1.2, at height 3
   umbra ends at radius 0.506, full light from 0.721:  penumbra 0.215 wide
   a point in its middle:  4 stratified light samples → 2 visible → 0.5     (exact 0.496)
                           1 sample at the light's center → blocked → 0     (wrongly black)
```

The same idea on the lens gives **depth of field**, on the shutter **motion blur**, on the lobe **glossy** reflection: N rays, noise falling as 1/√N.


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


## Fog and smoke: rays through a medium

<img src="../../textbook/figures/rt-media.svg" class="media-shot" style="max-height: 180px;" alt="transmittance falling exponentially with distance through a medium, and light scattered into a ray along its length">

In a medium, a ray loses light by **extinction** and gains it by **in-scattering**:

```text
   σt = 0.5:   T(d) = e^(−σt d):   d = 1 → 0.607,   d = 2 → 0.368,   d = 4 → 0.135;   half at 1.386
   light fog, σt = 0.05:   contrast falls to 2 % at 78.2 units: the visibility distance
```

The volume rendering of NeRF, later in the course, is this equation, with σ and color learned by a network.


---


## What Whitted cannot see

Whitted rays go only in **mirror** and **refraction** directions, and to the lights. Missing:

- **color bleeding**: the red wall's light on the white box (diffuse to diffuse)
- **caustics**: light focused by glass onto a floor (specular to diffuse, seen from the light's side)
- **soft indirect shadows** and light around corners
- **glossy** reflection (a lobe, not a mirror)

All are the rendering equation's integral over the **whole hemisphere**, which Whitted replaced by at most two directions. Path tracing, on Thursday, restores it.


---


## Rasterize or trace?

| | rasterization | ray tracing |
| --- | --- | --- |
| loop | for each triangle, find its pixels | for each pixel, find its triangle |
| visibility | depth buffer | nearest hit along the ray |
| cost grows with | triangles × covered pixels | pixels × log(triangles) |
| shadows, reflections | extra passes and tricks (shadow maps, probes) | more rays |
| data structure | none needed (streams triangles) | a BVH, rebuilt when things move |

Games in 2026 do **both**: rasterize what the camera sees, trace rays for shadows, reflections and indirect light.


---


## Ray tracing in hardware, and denoising

- **RT cores** (NVIDIA Turing, 2018; AMD and Intel since): fixed-function BVH traversal and ray–triangle tests, exposed through DirectX Raytracing and Vulkan
- real-time budgets allow about **1 or 2 rays per pixel per effect**, far too few for a clean image
- a **denoiser** reconstructs the image from those samples: spatial and temporal filters guided by normals and depth (SVGF, Schied et al., 2017), or a trained network (NVIDIA's OptiX denoiser, film renderers)

The ray tracer produces noise; the denoiser, like TAA, borrows from neighbors in space and time.

