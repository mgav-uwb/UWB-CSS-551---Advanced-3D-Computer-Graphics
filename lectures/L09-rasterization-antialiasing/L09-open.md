<!--
  CSS 551 · Lecture 9 (Thursday October 29, in person): Rasterization and Antialiasing.
  Mounts, in order: L09-open.md, ../../topics/rasterization.md (~45 min),
  ../../topics/antialiasing.md (~33 min), L09-discuss.md (discussion, HW4
  walk-through, wrap). Then Quiz 4 on paper.

  Minute plan (120 min, Thu 5:45–7:45 PM in person):
    0:00  opening                                     2 min
    0:02  rasterization (topic)                      45 min
    0:47  antialiasing (topic)                       33 min
    1:20  discussion: two questions                  12 min
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

- **Rasterization**: the edge function, one pixel by hand, triangle setup, the top-left rule, barycentric weights, the demo
- **Around the test**: clipping at the near plane; the depth buffer and early z; perspective-correct interpolation; blending
- **Sampling and antialiasing**: the sampling theorem, the alias frequency, coverage, SSAA and MSAA, sample patterns, aliasing in time
- **Discussion**, the **HW4** walk-through, then **Quiz 4**

Reading: [Rasterization](../../textbook/rasterization.html) and [Sampling and Antialiasing](../../textbook/antialiasing.html).

