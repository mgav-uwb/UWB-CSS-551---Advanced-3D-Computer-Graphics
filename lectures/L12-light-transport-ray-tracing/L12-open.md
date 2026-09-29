<!--
  CSS 551 · Lecture 12 (Tuesday November 10, online): Light Transport, PBR, and Ray Tracing.
  The bridge week: the rendering equation as the thing every renderer, and later
  every neural model of images, approximates. Mounts, in order: L12-open.md,
  ../../topics/pbr-rendering-equation.md (~40 min), ../../topics/ray-tracing.md
  (~48 min), L12-discuss.md (the discussion slot is the midterm review).

  Minute plan (120 min, Tue 5:45–7:45 PM synchronous online):
    0:00  opening                                     2 min
    0:02  light transport and PBR (topic)            40 min
    0:42  ray tracing (topic)                        48 min
    1:30  midterm review: logistics and four questions spanning weeks 1–6   28 min
    1:58  wrap                                        2 min
    2:00  end
  Demo: brdf-lobe (roughness). Numbers: numbers.json, numbers-motion.json rt.*,
  numbers-pipeline.json view.*, and tools/gen-lecture-figures-c.mjs (l12_q1 to
  l12_q4) for the review answers.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 12: Light Transport, PBR, and Ray Tracing**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Honest light**: radiance; the rendering equation, worked as a sum; the BRDF and why Phong is not one; microfacets by hand; Fresnel; the furnace test; the two sliders, live
- **Ray tracing**: the ray through a pixel; sphere, triangle and box intersections; instancing; Whitted's shadows, mirrors and glass; the BVH; soft shadows
- **Midterm review**: what the exam covers, and four questions across weeks 1–6

Reading: [Light Transport and PBR](../../textbook/light-transport-pbr.html) and [Ray Tracing](../../textbook/ray-tracing.html).

