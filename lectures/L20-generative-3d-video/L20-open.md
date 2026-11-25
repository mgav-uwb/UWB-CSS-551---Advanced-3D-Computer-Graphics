<!--
  CSS 551 · L20, Thursday December 10 (in person): Generative 3D and Video, and Where the Field Is Going.
  Plan C (planning/css551-au26-plan-c-2026-09-29.md), week 11.
  Re-sequenced 2026-10-25 (was L19, Tuesday December 8): the last meeting of the quarter; the
  inverse-rendering lecture that followed it is unscheduled (lectures/archive/L20-inverse-rendering).

  COMPOSITION: index.html mounts L20-open.md (title + tonight), then
  ../../topics/generative-3d-video.md (~86 min), then ../../topics/graphics-meets-generative.md
  (~14 min), then L20-discuss.md (wrap), then ../../topics/generative-3d-video-supplement.md
  (~65 min, time permitting, or reading).
  EDIT 2026-11-24 LESS MATH (Marcel: "PCA, eigenvalues, hilbert spaces... way over the math level of the
  class. can the following lectures use less math?"): the generative topic is a method survey (36 content
  slides from 59); its worked and counted slides are in the supplement after the wrap.

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence; no "next time".

  Plan (120 min, Thu 5:45-7:45 PM in person; 48 slides in the core, 33 in the supplement):
    0:00  Opening                                                    2 min
    0:02  Generative 3D and video, networks, VR (topic, 37 slides)  86 min
    1:28  Graphics meets generative models (topic, 8 slides)        14 min
    1:42  Wrap                                                       2 min
    1:44  Questions and buffer, or the supplement                   16 min
    2:00  end
  CUT 2026-10-08: the six discussion questions; their 18 minutes are questions and buffer.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 20: Generative 3D and Video, and Where the Field Is Going**

> DreamFusion (2022) made 3D objects from text with no 3D training data, by using a 2D image model as a critic of rendered views.

<small>Poole et al., arXiv:2209.14988</small>

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Generative 3D, three routes**: what an engine needs; a 2D image model as critic, and how it fails; views that agree; reconstruction in one pass
- **Video**: a time axis, the attention bill, a 3D autoencoder, flicker, render-then-restyle
- **World models**: the loop, drift, GameNGen and four steps live, noising the context, Genie
- **Networks inside the renderer**: upscaling, frame generation, jitter and accumulation, radiance caching
- **Relighting, and VR (virtual reality)**: one number with many answers; the frame budget, latency, reprojection, foveation
- **Graphics meets generative models**: reading a generated image, data and compute, provenance, the merged field

<small>Reading: the course text, <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 8 and 10, and <a href="../../textbook/learned-scenes.html">Learned Scenes</a>, Section 9.</small>

