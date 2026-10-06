<!--
  CSS 551 · Lecture 9 (Thursday October 29, in person): Rasterization and Antialiasing.
  Mounts, in order: L09-open.md, ../../topics/rasterization.md (~46 min, 32 slides),
  ../../topics/antialiasing.md (~34 min, 21 slides), L09-discuss.md (discussion, HW4
  walk-through, wrap). Quiz 3, on paper, comes first.

  Minute plan (120 min, Thu 5:45–7:45 PM in person):
    0:00  Quiz 3 (paper, 20 min): scene graphs (L07), viewing and interaction in 3D (L08), HW3
    0:20  opening                                     2 min
    0:22  rasterization (topic)                      46 min
    1:08  antialiasing (topic)                       34 min
    1:42  discussion: two questions                  10 min
    1:52  HW4 walk-through                            6 min
    1:58  wrap                                        2 min
    2:00  end
  Demos: raster twice (res,angle in the rasterization topic; aa,angle in the
  antialiasing topic). Numbers: numbers-pipeline.json ras.*, numbers-systems.json
  aa.*, and tools/gen-lecture-figures-c.mjs for the discussion answers.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 9: Rasterization and Antialiasing**

> Jack Bresenham's line algorithm, developed at IBM and published in 1965, uses integer additions only, no multiplication or division per pixel.

<small>Bresenham, IBM Systems Journal, 1965</small>

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Quiz 3

**Laptops and phones away.** A pencil and the quiz sheet, nothing else.

- **20 minutes**, 5:45 to 6:05 PM: 8 multiple-choice questions, 5 points each
- **Covers**: Lecture 7, scene graphs (Thursday, October 22); Lecture 8, viewing and interaction in 3D (Tuesday, October 27); HW3
- Mark one letter per question in the grid on the first page; only the grid is graded


---

## Tonight

- **Rasterization**: the edge function, culling by winding, one pixel by hand, setup in code, the top-left rule, barycentric weights for every attribute, the demo
- **Around the test**: 2×2 quads; clipping at the near plane; the depth buffer, its precision and its history; early z; perspective-correct interpolation; blending and transparency; lines
- **The machine**: the GPU pipeline, deferred and tile-based rendering, the frame loop and vsync, varyings in GLSL
- **Sampling and antialiasing**: the sampling theorem, the Fourier view, filters, coverage and sample patterns, SSAA and MSAA and their cost, post-process AA, mip levels from derivatives, shading aliasing, aliasing in time, upscaling
- **Discussion**, then the **HW4** walk-through

Reading: [Rasterization](../../textbook/rasterization.html) and [Sampling and Antialiasing](../../textbook/antialiasing.html).

