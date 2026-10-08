<!--
  CSS 551 · Lecture 12 (Tuesday November 10, online): Light Transport, PBR, and Ray Tracing.
  The bridge week: the rendering equation as the thing every renderer, and later
  every neural model of images, approximates. Mounts, in order: L12-open.md,
  ../../topics/pbr-rendering-equation.md (~47 min, 35 slides), ../../topics/ray-tracing.md
  (~45 min, 26 slides), L12-discuss.md (the discussion slot is the midterm review).

  Minute plan (120 min, Tue 5:45–7:45 PM synchronous online):
    0:00  opening                                     2 min
    0:02  light transport and PBR (topic)            47 min
    0:49  ray tracing (topic)                        45 min
    1:34  midterm review: logistics and eight questions spanning weeks 1–6  24 min
    1:58  wrap                                        2 min
    2:00  end
  Demo: brdf-lobe (roughness). Numbers: numbers.json, numbers-motion.json rt.*,
  numbers-pipeline.json view.*, and tools/gen-lecture-figures-c.mjs (l12_q1 to
  l12_q4) and node for review questions 5 to 8.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 12: Light Transport, PBR, and Ray Tracing**

> Jim Kajiya's 1986 paper The Rendering Equation stated the equation and introduced path tracing to solve it.

<small>Kajiya, SIGGRAPH 1986</small>

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Honest light**: solid angle, the four radiometric quantities, radiance; the rendering equation, worked as a sum; BRDF lobes, reciprocity, and why Phong is not one; microfacets, D, G and F by hand; metals and dielectrics; the furnace test; environment lighting by the split sum; importance sampling; measured and principled materials; light under the surface
- **Ray tracing**: five dates; the ray through a pixel; sphere, triangle and box intersections; instancing; Whitted's shadows, mirrors and glass and how many rays they take; the BVH and the surface area heuristic; soft shadows, depth of field, media; what Whitted misses; rasterize or trace; hardware and denoising
- **Midterm review**: what the exam covers, and eight questions across weeks 1–6

Reading: [Light Transport and PBR](../../textbook/light-transport-pbr.html) and [Ray Tracing](../../textbook/ray-tracing.html).

