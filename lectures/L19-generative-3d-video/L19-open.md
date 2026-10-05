<!--
  CSS 551 · L19, Tuesday December 8 (online): Generative 3D and Video, and Where the Field Is Going.
  Plan C (planning/css551-au26-plan-c-2026-09-29.md), week 11.

  COMPOSITION: index.html mounts L19-open.md (title + tonight), then
  ../../topics/generative-3d-video.md (~84 min), then ../../topics/graphics-meets-generative.md
  (~14 min), then L19-discuss.md (discussion 18 min + wrap).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence; no "next time".

  Plan (120 min, Tue 5:45-7:45 PM synchronous online; 80 slides):
    0:00  Opening                                          2 min
    0:02  Generative 3D and video, networks, VR (topic, 62 slides)   84 min
    1:26  Graphics meets generative models (topic, 8 slides)         14 min
    1:40  Discussion: six questions                                  18 min
    1:58  Wrap                                                        2 min
    2:00  end
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 19: Generative 3D and Video, and Where the Field Is Going**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Generative 3D, three routes**: what an engine needs; views that agree (an epipolar line by hand, checked); one pass (unknowns counted)
- **Video**: a 3D autoencoder, the attention bill, temporal attention by hand, flicker, render-then-restyle
- **World models**: the loop, drift derived, GameNGen and four steps live, the fix, Genie
- **Networks inside the renderer**: frame generation, Halton jitter, accumulation derived, upscaling, radiance caching, neural materials
- **Relighting, and VR**: one number with many answers, two lights; budgets, pixels per degree, latency, reprojection, foveation, stereo
- **Graphics meets generative models**: reading a generated image, data and compute, provenance, the merged field

<small>Reading: the course text, <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 8 and 10, and <a href="../../textbook/learned-scenes.html">Learned Scenes</a>, Section 9.</small>

