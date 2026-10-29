<!--
  CSS 551 · Lecture 10 (Tuesday November 3, online): Rasterization and Antialiasing.
  Mounts, in order: L10-open.md, ../../topics/rasterization.md (~46 min, 32 slides),
  ../../topics/antialiasing.md (~34 min, 21 slides), L10-discuss.md (HW4
  walk-through, wrap).
  Re-sequenced 2026-10-25 (was Lecture 9, Thursday October 29, opened by paper Quiz 3): now a
  Tuesday online meeting with no quiz; HW4 goes out tonight.

  Minute plan (120 min, Tue 5:45–7:45 PM synchronous online):
    0:00  opening                                     2 min
    0:02  rasterization (topic)                      46 min
    0:48  antialiasing (topic)                       34 min
    1:22  HW4 walk-through                            6 min
    1:28  wrap                                        2 min
    1:30  questions, HW3 and HW4 help; buffer        30 min
    2:00  end
  CUT 2026-10-08: the two discussion questions (L10-discuss.md).
  Demos: raster twice (res,angle in the rasterization topic; aa,angle in the
  antialiasing topic). Numbers: numbers-pipeline.json ras.*, numbers-systems.json
  aa.*.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 10: Rasterization and Antialiasing**

> Jack Bresenham's line algorithm, developed at IBM and published in 1965, uses integer additions only, no multiplication or division per pixel.

<small>Bresenham, IBM Systems Journal, 1965</small>

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Rasterization**: the edge function, culling by winding, one pixel by hand, setup in code, the top-left rule, barycentric weights for every attribute, the demo
- **Around the test**: 2×2 quads; clipping at the near plane; the depth buffer, its precision and its history; early z; perspective-correct interpolation; blending and transparency; lines
- **The machine**: the GPU pipeline, deferred and tile-based rendering, the frame loop and vsync, varyings in GLSL
- **Sampling and antialiasing**: the sampling theorem, the Fourier view, filters, coverage and sample patterns, SSAA and MSAA and their cost, post-process AA, mip levels from derivatives, shading aliasing, aliasing in time, upscaling
- the **HW4** walk-through

Reading: [Rasterization](../../textbook/rasterization.html) and [Sampling and Antialiasing](../../textbook/antialiasing.html).

