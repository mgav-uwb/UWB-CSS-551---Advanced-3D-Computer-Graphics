<!--
  CSS 551 · L18, Thursday December 3 (in person): Learned Scenes.
  Plan C (planning/css551-au26-plan-c-2026-09-29.md), week 10. Quiz 7 opens the class.

  COMPOSITION: index.html mounts L18-open.md (title + tonight), then
  ../../topics/learned-scenes.md (~85 min), then L18-discuss.md (the HW8
  walk-through and wrap, 7 min). The first 20 minutes are Quiz 7, on paper.

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence; no "next time".

  Plan (120 min, Thu 5:45-7:45 PM in person; 62 slides):
    0:00  Quiz 7, on paper (L16, L17)                   20 min
    0:20  Opening                                        2 min
    0:22  Learned scenes: NeRF and 3DGS (topic, 56 slides)  85 min
    1:47  Questions and buffer                           6 min
    1:53  HW8 walk-through                               5 min
    1:58  Wrap                                           2 min
    2:00  end
  CUT 2026-10-08: the three discussion questions; their 6 minutes are questions and buffer.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 18: Learned Scenes**

> The original NeRF (2020) stores a whole scene in one network of eight layers of 256 units: a few hundred thousand weights.

<small>course text, Learned Scenes</small>

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Quiz 7

**Laptops and phones away.** A pencil and the quiz sheet, nothing else.

- **20 minutes**, 5:45 to 6:05 PM: 8 multiple-choice questions, 5 points each
- **Covers**: Lecture 16, diffusion models I (Tuesday, November 24); Lecture 17, diffusion models II (Tuesday, December 1)
- Mark one letter per question in the grid on the first page; only the grid is graded


---

## Tonight

- **Poses first**: structure from motion, one triangulation by hand; capturing well
- **NeRF**: the network layer by layer; the compositing formula derived; rays and stratified samples; **one ray by hand**; one gradient by hand; the cost counted
- **Faster and sharper**: hash grids, cones against aliasing, unbounded scenes, signed distances
- **3D Gaussian splatting**: **one splat projected by hand**; bytes, dilation, tiles, the sort; clone and split; **three splats blended**; popping; live
- **Back to meshes, and judging a scene**: marching squares and cubes, 2DGS; PSNR, SSIM, LPIPS
- the **HW8 walk-through**

<small>Reading: the course text, <a href="../../textbook/learned-scenes.html">Learned Scenes</a>, where every number tonight is worked with a figure.</small>

