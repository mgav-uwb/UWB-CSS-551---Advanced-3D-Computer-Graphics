<!--
  CSS 551 · L19, Tuesday December 8 (online): Learned Scenes.
  Plan C (planning/css551-au26-plan-c-2026-09-29.md), week 11.
  Re-sequenced 2026-10-25 (was L18, Thursday December 3, opened by paper Quiz 7): a Tuesday online
  meeting with no quiz; the HW8 walk-through moved to Lecture 18, when HW8 goes out.

  COMPOSITION: index.html mounts L19-open.md (title + tonight), then
  ../../topics/learned-scenes.md (~85 min), then L19-discuss.md (the wrap).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence; no "next time".

  Plan (120 min, Tue 5:45-7:45 PM synchronous online; 60 slides):
    0:00  Opening                                        2 min
    0:02  Learned scenes: NeRF and 3DGS (topic, 56 slides)  85 min
    1:27  Questions, HW8 help; buffer                   31 min
    1:58  Wrap                                           2 min
    2:00  end
  CUT 2026-10-08: the three discussion questions; their 6 minutes are questions and buffer.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 19: Learned Scenes**

> The original NeRF (2020) stores a whole scene in one network of eight layers of 256 units: a few hundred thousand weights.

<small>course text, Learned Scenes</small>

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Poses first**: structure from motion, one triangulation by hand; capturing well
- **NeRF**: the network layer by layer; the compositing formula derived; rays and stratified samples; **one ray by hand**; one gradient by hand; the cost counted
- **Faster and sharper**: hash grids, cones against aliasing, unbounded scenes, signed distances
- **3D Gaussian splatting**: **one splat projected by hand**; bytes, dilation, tiles, the sort; clone and split; **three splats blended**; popping; live
- **Back to meshes, and judging a scene**: marching squares and cubes, 2DGS; PSNR, SSIM, LPIPS

<small>Reading: the course text, <a href="../../textbook/learned-scenes.html">Learned Scenes</a>, where every number tonight is worked with a figure.</small>

