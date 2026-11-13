<!--
  CSS 551 · Lecture 13 (Thursday November 12, in person): Light Transport, Ray Tracing, and Path Tracing.
  The bridge: the rendering equation as the thing every renderer, and later every neural model of
  images, approximates; the ray tracer that searches it and the path tracer that samples it.
  Mounts, in order: L13-open.md, ../../topics/pbr-rendering-equation.md (the core, ~21 min, 13 slides),
  ../../topics/ray-tracing.md (the core, ~28 min, 16 slides), ../../topics/path-tracing.md (the core, ~20 min,
  12 slides), L13-discuss.md (the HW6 walk-through and the wrap), then, after the wrap, time permitting:
  ../../topics/ray-tracing-supplement.md (~14 min, 8 slides), ../../topics/path-tracing-supplement.md
  (~16 min, 10 slides), ../../topics/pbr-rendering-equation-supplement.md (~46 min, 28 slides).
  Re-sequenced 2026-10-25: merges Lecture 12 (Tuesday November 10, light transport, PBR and ray tracing)
  and Lecture 13 (Thursday November 12, path tracing after a 75-minute exam); the old files are in
  ../archive/L13-path-tracing-pre-merge-2026-10-25/. The light-transport topic was split into a core and
  a supplement for this meeting.

  Minute plan (120 min, Thu 5:45–7:45 PM in person), estimates; at the room's pace the 41 core slides
  take about 100 minutes, which the buffer absorbs:
    0:00  opening                                     1 min
    0:01  light transport, the core (topic)          21 min
    0:22  ray tracing, the core (topic)              28 min
    0:50  path tracing, the core (topic)             20 min
    1:10  HW6 walk-through                            4 min
    1:14  wrap                                        1 min
    1:15  buffer at the room's pace; questions       45 min
    2:00  end
  CUT 2026-11-12 (L13 polish; the meeting ran about 50 minutes over): the ray-tracing and path-tracing
  topics cut to cores, the rest moved in order to two supplements after the wrap, the repeats of the
  same evening deleted (the three-light sum, soft shadows, fog); errata; MathJax for the reference
  formulas (lib/deck-math.js); the steradian defined next to the radian. HW6 needs only ray tracing
  (rays, the three intersections, the shadow ray, one mirror bounce).
  Demos: none in the core topics (brdf-lobe is in the light-transport supplement). Numbers: numbers.json,
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

- **Light transport**: radiance and the steradian; the rendering equation, worked as a sum and read as a self-reference; the BRDF and ρ/π
- **Ray tracing**: the ray through a pixel; sphere, triangle and box; Whitted's shadows, mirrors and glass; the BVH; distributed rays; rasterize or trace
- **Path tracing**: Monte Carlo and 1/√N; the random walk; Russian roulette; the Cornell box; fireflies and MIS; fog
- the **HW6** walk-through

Reading: [Light Transport and PBR](../../textbook/light-transport-pbr.html), Sections 1 to 3 and 11, and [Ray Tracing](../../textbook/ray-tracing.html).
