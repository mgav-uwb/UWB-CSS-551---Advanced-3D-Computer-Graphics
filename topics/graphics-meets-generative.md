<!--
  CSS 551 · TOPIC DECK: Graphics meets generative models: the gallery, what still breaks, the merged field (~14 min, densified 2026-09-29).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/graphics-meets-generative.md"> among others; it carries no
  logistics (no title, Thursday, homework, wrap) and no "Part N" numbering.

  TEACHES: what text-to-image looks like at scale (gallery); what still breaks and what graphics keeps; the merged field (generated assets, learned rendering of authored scenes, capture, world models).
  NEEDS:   the diffusion topics and the learned-scenes topic; mount it after them. The ControlNet, score-distillation
           and video slides that used to live here moved to topics/diffusion-2.md and topics/generative-3d-video.md
           (Plan C, 2026-09-29), where they are worked with numbers.
  DEMOS:   none. Media: ../../media/generative/gallery-*.jpg, credit lines VERBATIM from media/generative/CREDITS.md.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Paths are relative to
  the lecture page that mounts this topic (lectures/LNN-slug/index.html).
-->

### Graphics meets generative models

<small>(~14 min)</small>


---

## Gallery: prompt to image

<div style="display: flex; gap: 12px; justify-content: center; align-items: flex-start;">
<div style="flex: 1 1 0; min-width: 0;"><img src="../../media/generative/gallery-1.jpg" class="media-shot" style="max-height: 230px;" alt="a generated solarpunk city street: trees on terraced towers, a small tram, a lake, warm daylight"><small class="credit">Prototyperspective · CC0 · via Wikimedia Commons</small></div>
<div style="flex: 1 1 0; min-width: 0;"><img src="../../media/generative/gallery-2.jpg" class="media-shot" style="max-height: 230px;" alt="a generated cyberpunk tower in the rain, red neon on dark glass"><small class="credit">CC0 · via Wikimedia Commons</small></div>
<div style="flex: 1 1 0; min-width: 0;"><img src="../../media/generative/gallery-3.jpg" class="media-shot" style="max-height: 230px;" alt="a generated landscape painting: a red Shinto shrine gate among forested mountains"><small class="credit">Benlisquare · Public domain · via Wikimedia Commons</small></div>
</div>

<small>Prompts, left to right: "utopia at street level in city … solarpunk, green trees, matte painting" · "Cyberpunk, Tower of Babel, in the rain, highly detailed, illustration" · "Hakurei Shrine in distance … forests, mountains, rivers" (Stable Diffusion, 2022–23)</small>


---

## What to look for in a generated image

Read the gallery like a renderer would:

| check | what a renderer guarantees | what a generator does |
| ----- | -------------------------- | --------------------- |
| shadows | all cast away from the same light | may point different ways |
| reflections | match the reflected object | plausible, often wrong in detail |
| perspective | parallel lines meet at consistent vanishing points | mostly right, drifts at the edges |
| counts and text | exact | approximate |
| repeated structure (windows, fence posts) | identical by instancing | similar, not identical |


---

## What still breaks, and what graphics keeps

- **object permanence, physics, counting, text**: no scene exists inside the model, so nothing enforces them
- **no camera to move, no light to change, no edit that keeps everything else fixed**
- graphics keeps: **control**, **consistency**, **real time**
- a learned scene has the camera and the consistency but **only one place**; a learned image has every place and **no camera**


---

## The data and the compute

```text
   LAION-5B (Schuhmann et al. 2022, arXiv:2210.08402):   5.85 billion image-text pairs, 2.32 billion in English
   Stable Diffusion v1 (its model card):                 32 × 8 A100 GPUs; 150,000 GPU-hours reported
   the course's digit network:                           60,000 digits; 15 minutes of CPU
```

- the recipe is the same across seven orders of magnitude; what separates the course's network from a product is **data and compute**
- the data is scraped from the web: licensing, consent and memorization are open questions, not settled ones


---

## Provenance: marking what was made

- **Content Credentials (C2PA)**: an open standard, founded in February 2021 by Adobe, Arm, BBC, Intel, Microsoft and Truepic, for attaching **tamper-evident metadata** about a file's origin and edits
- **invisible watermarks**: SynthID (Google DeepMind, 2023) embeds a pattern in the pixels of generated images that a detector network can find after resizing or rotation, with a confidence rather than a certainty
- metadata can be stripped; watermarks can be attacked; neither proves an unmarked image is real


---

## The merged field

```text
   generated assets in engines     textures, props, characters from a prompt, then authored on
   learned rendering of authored   a renderer that is partly a network: denoising, upscaling,
     scenes                          neural materials, learned lighting (DLSS-class)
   scenes from photographs         NeRF and splats as capture; edited, relit, exported
   world models                    predict the next frame from an action: a renderer with no scene
```

- every row stands on the pipeline: a camera, a projection, a depth buffer, a loop
- what changes is **who authors the representation** and **what it is made of**


---

## Every row, and where this course covered it

| row of the merged field | the pipeline it stands on | the lectures |
| ----------------------- | ------------------------- | ------------ |
| generated assets | meshes, UVs, PBR materials, levels of detail | meshes, textures, PBR |
| learned rendering | jitter, motion vectors, accumulation, path tracing | antialiasing, ray tracing, light transport |
| scenes from photographs | poses, rays, compositing, projection Jacobians | viewing, rasterization, learned scenes |
| world models | the frame loop, input, latency | interaction, diffusion |
| VR | two `V`s, reprojection, foveation | viewing, texture filtering, interaction |

