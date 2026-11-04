<!--
  CSS 551 · Lecture 13 (Thursday November 12, in person): Light Transport, Ray Tracing, and Path Tracing.
  The bridge: the rendering equation as the thing every renderer, and later every neural model of
  images, approximates; the ray tracer that searches it and the path tracer that samples it.
  Mounts, in order: L13-open.md, ../../topics/pbr-rendering-equation.md (the core, ~21 min, 13 slides),
  ../../topics/ray-tracing.md (~45 min, 26 slides), ../../topics/path-tracing.md (~38 min, 24 slides),
  L13-discuss.md (the HW6 walk-through and the wrap), then
  ../../topics/pbr-rendering-equation-supplement.md (~46 min, 28 slides) after the wrap, time permitting.
  Re-sequenced 2026-10-25: merges Lecture 12 (Tuesday November 10, light transport, PBR and ray tracing)
  and Lecture 13 (Thursday November 12, path tracing after a 75-minute exam); the old files are in
  ../archive/L13-path-tracing-pre-merge-2026-10-25/. The light-transport topic was split into a core and
  a supplement for this meeting.

  Minute plan (120 min, Thu 5:45–7:45 PM in person):
    0:00  opening                                     1 min
    0:01  light transport, the core (topic)          21 min
    0:22  ray tracing (topic)                        45 min
    1:07  path tracing (topic)                       38 min
    1:45  HW6 walk-through                            4 min
    1:49  wrap                                        1 min
    1:50  questions, HW5 and HW6 help; buffer        10 min
    2:00  end
  At the pace of the earlier lectures the three topics run past two hours. HW6 needs only ray
  tracing (rays, the three intersections, the shadow ray, one mirror bounce), so if time runs short,
  stop path tracing after the Cornell box and go to the HW6 walk-through.
  Demos: none in the core topics (brdf-lobe is in the supplement). Numbers: numbers.json,
  numbers-motion.json rt.*, numbers-pipeline.json view.*; figures from tools/gen-lecture-figures-pbr.mjs
  and tools/gen-lecture-figures-c.mjs (l13_*).
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 13: Light Transport, Ray Tracing, and Path Tracing**

> Jim Kajiya's 1986 paper The Rendering Equation stated the equation and introduced path tracing to solve it.

<small>Kajiya, SIGGRAPH 1986</small>

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Light transport**: radiance and the solid angle; the rendering equation, worked as a sum and read as a self-reference; the BRDF and ρ/π
- **Ray tracing**: the ray through a pixel; sphere, triangle and box; Whitted's shadows, mirrors and glass; the BVH; distributed rays; rasterize or trace
- **Path tracing**: Monte Carlo and 1/√N; drawing directions; the path tracer in code; next-event estimation; Russian roulette; the Cornell box; fireflies and MIS
- the **HW6** walk-through

Reading: [Light Transport and PBR](../../textbook/light-transport-pbr.html), Sections 1 to 3 and 11, and [Ray Tracing](../../textbook/ray-tracing.html).

