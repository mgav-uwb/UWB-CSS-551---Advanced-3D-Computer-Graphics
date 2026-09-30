<!--
  CSS 551 · Lecture 9 (Thursday October 29, in person): Rasterization and Antialiasing.
  Mounts, in order: L09-open.md, ../../topics/rasterization.md (~46 min, 32 slides),
  ../../topics/antialiasing.md (~34 min, 21 slides), L09-discuss.md (discussion, HW4
  walk-through, wrap). Then Quiz 4 on paper.

  Minute plan (120 min, Thu 5:45–7:45 PM in person):
    0:00  opening                                     2 min
    0:02  rasterization (topic)                      46 min
    0:48  antialiasing (topic)                       34 min
    1:22  discussion: two questions                  10 min
    1:32  HW4 walk-through                            6 min
    1:38  wrap                                        2 min
    1:40  Quiz 4 (paper, 20 min): viewing, rasterization and antialiasing, HW3
    2:00  end
  Demos: raster twice (res,angle in the rasterization topic; aa,angle in the
  antialiasing topic). Numbers: numbers-pipeline.json ras.*, numbers-systems.json
  aa.*, and tools/gen-lecture-figures-c.mjs for the discussion answers.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 9: Rasterization and Antialiasing**

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Rasterization**: the edge function, culling by winding, one pixel by hand, setup in code, the top-left rule, barycentric weights for every attribute, the demo
- **Around the test**: 2×2 quads; clipping at the near plane; the depth buffer, its precision and its history; early z; perspective-correct interpolation; blending and transparency; lines
- **The machine**: the GPU pipeline, deferred and tile-based rendering, the frame loop and vsync, varyings in GLSL
- **Sampling and antialiasing**: the sampling theorem, the Fourier view, filters, coverage and sample patterns, SSAA and MSAA and their cost, post-process AA, mip levels from derivatives, shading aliasing, aliasing in time, upscaling
- **Discussion**, the **HW4** walk-through, then **Quiz 4**

Reading: [Rasterization](../../textbook/rasterization.html) and [Sampling and Antialiasing](../../textbook/antialiasing.html).

