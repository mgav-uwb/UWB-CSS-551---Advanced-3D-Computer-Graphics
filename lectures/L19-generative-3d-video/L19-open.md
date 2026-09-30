<!--
  CSS 551 · L19, Tuesday December 8 (online): Generative 3D and Video, and Where the Field Is Going.
  Plan C (planning/css551-au26-plan-c-2026-09-29.md), week 11.

  COMPOSITION: index.html mounts L19-open.md (title + tonight), then
  ../../topics/generative-3d-video.md (~68 min), then ../../topics/graphics-meets-generative.md
  (~20 min), then L19-discuss.md (discussion 28 min + wrap).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence; no "next time".

  Plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Opening                                          3 min
    0:02  Generative 3D and video, networks, VR (topic, 45 slides)   68 min
    1:10  Graphics meets generative models (topic, 7 slides)         20 min
    1:30  Discussion: six questions                                  28 min
    1:58  Wrap                                                        2 min
    2:00  end
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 19: Generative 3D and Video, and Where the Field Is Going**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Generative 3D, three routes**: what an engine needs; views that agree (an epipolar line by hand); one pass (unknowns counted)
- **Video**: a 3D autoencoder, the attention bill, temporal attention by hand, flicker, render-then-restyle
- **World models**: the loop, GameNGen, drift and its fix, Genie
- **Networks inside the renderer**: frame generation, jitter, accumulation, radiance caching, neural materials
- **Relighting, and VR**: one number with many answers; budgets, latency, reprojection, foveation, stereo
- **Graphics meets generative models**: reading a generated image, data and compute, provenance, the merged field

<small>Reading: the course text, <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 8 and 10, and <a href="../../textbook/learned-scenes.html">Learned Scenes</a>, Section 9.</small>

