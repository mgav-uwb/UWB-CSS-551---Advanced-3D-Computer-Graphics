<!--
  CSS 551 · L19, Tuesday December 8 (online): Generative 3D and Video, and Where the Field Is Going.
  Plan C (planning/css551-au26-plan-c-2026-09-29.md), week 11.

  COMPOSITION: index.html mounts L19-open.md (title + tonight), then
  ../../topics/generative-3d-video.md (~62 min), then ../../topics/graphics-meets-generative.md
  (~20 min), then L19-discuss.md (discussion 28 min + wrap).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence; no "next time".

  Plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Opening                                          3 min
    0:03  Generative 3D and video (topic)                 62 min
    1:05  Graphics meets generative models (topic)        20 min
    1:25  Discussion: four questions                      30 min
    1:55  Wrap                                             3 min
    1:58  end
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 19: Generative 3D and Video, and Where the Field Is Going**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Generative 3D, three routes**: optimize per asset; generate views that agree, then reconstruct (a ring of cameras by hand); reconstruct in one pass (one pixel unprojected to a splat)
- **Video**: a block of latents, and the attention bill, full against factorized
- **World models**: the next frame from an action, and drift counted
- **Networks inside the renderer**: upscaling, frame generation, denoising, counted
- **Relighting**: what a capture cannot do
- **Graphics meets generative models**: the gallery, what still breaks, the merged field

<small>Reading: the course text, <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 8 and 10, and <a href="../../textbook/learned-scenes.html">Learned Scenes</a>, Section 9.</small>

