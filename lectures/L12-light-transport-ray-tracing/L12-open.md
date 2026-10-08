<!--
  CSS 551 · Lecture 12 (Tuesday November 10, online): Light Transport, PBR, and Ray Tracing.
  The bridge week: the rendering equation as the thing every renderer, and later
  every neural model of images, approximates. Mounts, in order: L12-open.md,
  ../../topics/pbr-rendering-equation.md (~69 min, 42 slides), ../../topics/ray-tracing.md
  (~45 min, 26 slides), L12-discuss.md (the midterm's logistics and the wrap; the review questions moved to the
  practice midterm, practice/midterm/index.html, on 2026-10-08, and the time to light transport).

  Minute plan (120 min, Tue 5:45–7:45 PM synchronous online):
    0:00  opening                                     2 min
    0:02  light transport and PBR (topic)            69 min
    1:11  ray tracing (topic)                        45 min
    1:56  the midterm: logistics, the practice midterm 3 min
    1:59  wrap                                        1 min
    2:00  end
  Demo: brdf-lobe (roughness). Numbers: numbers.json, numbers-motion.json rt.*,
  numbers-pipeline.json view.*; figures from tools/gen-lecture-figures-pbr.mjs.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 12: Light Transport, PBR, and Ray Tracing**

> Jim Kajiya's 1986 paper The Rendering Equation stated the equation and introduced path tracing to solve it.

<small>Kajiya, SIGGRAPH 1986</small>

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Light transport and PBR**: solid angle, the four radiometric quantities, radiance; the rendering equation, worked as a sum; the solid angle of a patch; bounces as a series; BRDF lobes, the BRDF's unit, reciprocity, and why Phong is not one; the half vector; microfacets, D, G and F by hand; metals and dielectrics; the furnace test; environment lighting by the split sum; importance sampling; measured and principled materials; light under the surface
- **Ray tracing**: five dates; the ray through a pixel; sphere, triangle and box intersections; instancing; Whitted's shadows, mirrors and glass and how many rays they take; the BVH and the surface area heuristic; soft shadows, depth of field, media; what Whitted misses; rasterize or trace; hardware and denoising
- **The midterm**: what it covers, and the practice midterm

Reading: [Light Transport and PBR](../../textbook/light-transport-pbr.html) and [Ray Tracing](../../textbook/ray-tracing.html).

