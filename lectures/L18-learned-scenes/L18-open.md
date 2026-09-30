<!--
  CSS 551 · L18, Thursday December 3 (in person): Learned Scenes.
  Plan C (planning/css551-au26-plan-c-2026-09-29.md), week 10. Quiz 7 follows the discussion.

  COMPOSITION: index.html mounts L18-open.md (title + tonight), then
  ../../topics/learned-scenes.md (~78 min), then L18-discuss.md (discussion and
  the HW8 walk-through, 20 min, + wrap). The last 20 minutes are Quiz 7, on paper.

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence; no "next time".

  Plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Opening                                        2 min
    0:02  Learned scenes: NeRF and 3DGS (topic, 49 slides)  78 min
    1:20  Discussion: three questions                    8 min
    1:28  HW8 walk-through                               8 min
    1:36  Wrap                                           2 min
    1:38  (buffer 2 min)  1:40  Quiz 7, 20 min           2:00 end
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 18: Learned Scenes**

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Poses first**: structure from motion, one triangulation by hand; capturing well
- **NeRF**: the network layer by layer; rays and stratified samples; **one ray by hand**; one gradient by hand; the cost counted
- **Faster and sharper**: hash grids, cones against aliasing, unbounded scenes, signed distances
- **3D Gaussian splatting**: **one splat projected by hand**; bytes, dilation, tiles, the sort; clone and split; **three splats blended**; popping; live
- **Back to meshes, and judging a scene**: marching squares and cubes, 2DGS; PSNR, SSIM, LPIPS
- **Discussion**, the **HW8 walk-through**, then **Quiz 7**

<small>Reading: the course text, <a href="../../textbook/learned-scenes.html">Learned Scenes</a>, where every number tonight is worked with a figure.</small>

