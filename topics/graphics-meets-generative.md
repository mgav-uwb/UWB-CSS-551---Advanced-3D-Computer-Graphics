<!--
  CSS 551 · TOPIC DECK: Graphics meets generative models (~30 min).
  A topic is a reusable stretch of slides that a session page mounts as one
  <section data-markdown="../../topics/graphics-meets-generative.md"> among others; it carries no
  session logistics (no title, Thursday, MP, wrap) and no "Part N" numbering.
  Sessions compose topics in their index.html; see sessions/README.md.

  TEACHES: what text-to-image looks like at scale (gallery); ControlNet on the pipeline's own depth and normals; score distillation (text to 3D) as the place learned images and learned scenes meet; video as diffusion with a time axis; what still breaks and what graphics keeps; the merged field (world models, learned rendering of authored scenes).
  NEEDS:   the diffusion ladder (guidance, latent diffusion, "the class slot") and the learned-scenes topic (NeRF/splats, differentiable rendering); mount it after both.
  DEMOS:   none. Media: ../../media/generative/*.jpg, credit lines VERBATIM from media/generative/CREDITS.md.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Demo embeds live on
  demo-full slides (a short ## title + the embed div + its viz-fallback pre).
  Image/handout paths are relative to the SESSION page that mounts this
  topic (sessions/SNN/index.html): ../../media/..., ../../textbook/...
-->

### Graphics meets generative models

<small>(~30 min)</small>

Note: The two halves of the era, learned images and learned scenes, have each been taken apart. This stretch puts them next to the pipeline you built: what the image models produce at scale, how the pipeline's own depth buffer steers them, how an image model can train a 3D scene, what video adds, and what none of it can do that a renderer does. It ends on the merged field.

---

## Gallery: prompt to image

<div style="display: flex; gap: 12px; justify-content: center; align-items: flex-start;">
<div style="flex: 1 1 0; min-width: 0;"><img src="../../media/generative/gallery-1.jpg" class="media-shot" style="max-height: 230px;" alt="a generated solarpunk city street: trees on terraced towers, a small tram, a lake, warm daylight"><small class="credit">Prototyperspective · CC0 · via Wikimedia Commons</small></div>
<div style="flex: 1 1 0; min-width: 0;"><img src="../../media/generative/gallery-2.jpg" class="media-shot" style="max-height: 230px;" alt="a generated cyberpunk tower in the rain, red neon on dark glass"><small class="credit">CC0 · via Wikimedia Commons</small></div>
<div style="flex: 1 1 0; min-width: 0;"><img src="../../media/generative/gallery-3.jpg" class="media-shot" style="max-height: 230px;" alt="a generated landscape painting: a red Shinto shrine gate among forested mountains"><small class="credit">Benlisquare · Public domain · via Wikimedia Commons</small></div>
</div>

<small>Prompts, left to right: "utopia at street level in city … solarpunk, green trees, matte painting" · "Cyberpunk, Tower of Babel, in the rain, highly detailed, illustration" · "Hakurei Shrine in distance … forests, mountains, rivers" (Stable Diffusion, 2022–23)</small>

Note: Let the images sit for a moment, then read the prompts. Point at what the model gets right (lighting, materials, composition, all learned from photographs, none simulated) and at one thing it gets wrong in each, if visible. Then the graphics question: none of this has a scene, a camera, or a light you could move. That is the next slide's opening.

---

## Graphics-flavored control

**ControlNet** (Zhang, Rao & Agrawala, 2023): condition the denoiser on a **depth map**, a **normal map**, or an edge image, and it keeps that structure.

<img src="../../media/generative/controlnet-depth.jpg" class="media-shot" style="max-height: 250px;" alt="left: the estimated depth map of a toy robot at a lectern; right: a generated stormtrooper figure at the same lectern in the same pose">
<small class="credit">lllyasviel/ControlNet README, depth example · Apache-2.0 · github.com/lllyasviel/ControlNet</small>

- a depth buffer (the viewing lecture) and normals (the modeling lecture) are exactly what **our pipeline produces**
- render the geometry you control, let diffusion paint the appearance

Note: The bridge back to this course. ControlNet adds a side network that reads a structural image, a depth map, a normal map, an edge drawing, and steers the denoiser to respect it. Depth and normals are the pipeline's own by-products: every frame you rendered this quarter had a depth buffer and could write normals. So a practical division of labor appears: geometry and camera from the pipeline, where you have control; appearance from diffusion, where it has taste. Production pipelines already do this for concept art and texturing.

---

## Text to 3D: the two halves meet

**Score distillation** (DreamFusion, Poole et al., 2022): optimize a 3D scene so that **renders of it** score well under a text-conditioned image model.

```text
   3D scene (a NeRF or Gaussians)  ──render from a random view──▶  image
   image diffusion model: "does this look like <prompt>? push it this way"
   the push flows back through the renderer into the 3D scene; repeat
```

- diffusion **judges**, the pipeline **renders**, gradients flow through both
- the result is a real 3D asset: a camera you can move, geometry you can export
- the same differentiable renderer that learns a scene from photographs, aimed at a prompt

Note: The slide that pays the promise about generative 3D. No 3D training data is needed: the image model already knows what a "ceramic teapot" looks like from any angle, so optimize a 3D representation until its renders satisfy the image model from every random viewpoint. The renderer has to be differentiable so the image model's push can flow back into the scene, which NeRF and splats both are. That is the same machinery that learns a scene from photographs, aimed at a prompt instead of at photos. Quality lags dedicated 3D methods and takes hours per asset, and it is improving fast.

---

## Video: add a time axis

A clip is a **3D block of latents** (x, y, t). Frames must see each other; the rest of the recipe is unchanged.

<img src="../../media/generative/video-strip.jpg" class="media-shot" style="max-height: 120px;" alt="six frames of a generated clip: a white dragon in a snowy scene, its pose changing across frames">
<small class="credit">prompted by Lumi's AI Dreams · Public domain · via Wikimedia Commons (six frames)</small>

- **temporal attention**: each frame's denoiser attends to its neighbors in time, so motion is consistent
- **video diffusion** (Ho et al., 2022) to Sora-class models (2024): the same noise-and-undo recipe on space-time patches

Note: Video is diffusion with one more axis. The latent is now a block, width by height by time; the network attends across frames as well as within them so that a moving object stays the same object. The 2022 paper by Ho and colleagues established it; the 2024 generation (Sora and its open successors) scaled it on space-time patches with transformers. The strip is six frames of one generated clip; ask the room to watch for what breaks across them, which is the next slide.

---

## What still breaks, and what graphics keeps

- **object permanence, physics, counting, text**: no scene exists inside the model, so nothing enforces them
- **no camera to move, no light to change, no edit that keeps everything else fixed**
- graphics keeps: **control**, **consistency**, **real time**
- a learned scene has the camera and the consistency but **only one place**; a learned image has every place and **no camera**

Note: The honest slide, and the one that justifies the rest of the quarter. A diffusion model has no scene, so it has nothing that enforces that the cup on frame one is the cup on frame sixty, that objects fall, that there are five fingers, that a sign spells a word. It has no camera you can move an inch. Graphics has exactly those things and lacks the model's taste for appearance. The learned scene of the previous topic sits between: it has a camera and consistency, because it is one real place, and it cannot invent. Next: how the field is putting the pieces together.

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

Note: Close the topic on the map rather than a prediction. Four rows, all live in 2026. Generated assets are the least controversial: a texture or a prop from a prompt, then placed and lit by an ordinary engine. Learned rendering of authored scenes is what every GPU vendor ships: upscaling, denoising and frame generation are networks inside the frame loop, and neural materials and learned lighting are next. Capture, the learned-scenes topic, is already a production tool. World models are the frontier and the most contested: a network that produces the next frame given the last one and a controller input, a renderer with no scene, which inherits every failure of the previous slide and is improving. The sentence to end on: every row stands on the pipeline you built; what changes is who authors the representation and what it is made of.
