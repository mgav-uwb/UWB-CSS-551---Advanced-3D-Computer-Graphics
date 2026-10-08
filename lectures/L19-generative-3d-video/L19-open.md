<!--
  CSS 551 · L19, Tuesday December 8 (online): Generative 3D and Video, and Where the Field Is Going.
  Plan C (planning/css551-au26-plan-c-2026-09-29.md), week 11.

  COMPOSITION: index.html mounts L19-open.md (title + tonight), then
  ../../topics/generative-3d-video.md (~84 min), then ../../topics/graphics-meets-generative.md
  (~14 min), then L19-discuss.md (wrap).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence; no "next time".

  Plan (120 min, Tue 5:45-7:45 PM synchronous online; 71 slides):
    0:00  Opening                                          2 min
    0:02  Generative 3D and video, networks, VR (topic, 60 slides)   84 min
    1:26  Graphics meets generative models (topic, 8 slides)         14 min
    1:40  Questions and buffer                                       18 min
    1:58  Wrap                                                        2 min
    2:00  end
  CUT 2026-10-08: the six discussion questions; their 18 minutes are questions and buffer.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 19: Generative 3D and Video, and Where the Field Is Going**

> DreamFusion (2022) made 3D objects from text with no 3D training data, by using a 2D image model as a critic of rendered views.

<small>Poole et al., arXiv:2209.14988</small>

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

