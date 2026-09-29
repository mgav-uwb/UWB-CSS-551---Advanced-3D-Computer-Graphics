<!--
  CSS 551 · TOPIC DECK: Generative 3D and video (~62 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/generative-3d-video.md"> among others; it carries no
  logistics (no title, Thursday, homework, wrap) and no "Part N" numbering.

  TEACHES: three routes from a prompt or a photo to a 3D asset (optimize per asset, generate views then
  reconstruct, reconstruct in one pass) and what each costs; why per-asset score distillation averages
  and grows extra faces; multi-view generation as a consistency problem stated with a ring of cameras;
  feed-forward reconstruction as one unprojected Gaussian per pixel; video as diffusion over a block of
  latents and the attention bill, full against factorized; world models and the drift of a next-frame
  predictor against a renderer; neural rendering inside engines (upscaling, frame generation,
  denoising) counted in shaded pixels and samples; relighting, and why a captured scene cannot do it.
  NEEDS:   the diffusion topics (guidance, latents, cross-attention, score distillation); the learned-scenes
           topic (NeRF, splats, the differentiable renderer); viewing (lookAt, the projection); ray tracing
           (Monte Carlo error); illumination (Lambert).
  DEMOS:   none. Media: ../../media/generative/video-strip.jpg, credit line verbatim from media/generative/CREDITS.md.
  FIGURES: ../../lectures/L19-generative-3d-video/figures/{attention-cost,drift}.svg and numbers.json;
           ../../lectures/L17-diffusion-2/figures/sds-toy.svg (tools/gen-lecture-figures-d2.mjs).
  PAPERS:  only those with identifiers in the course text (diffusion-models.html, learned-scenes.html,
           history-of-graphics.html): DreamFusion, Video Diffusion Models (Ho et al. 2022), NeRF, 3DGS. The
           multi-view and feed-forward routes are described as families without names on purpose.

  reveal.js: FLAT (every slide a top-level "---" section). Notes follow "Note:".
  Plain unicode math or fenced ```text blocks. Never two "_" on one markdown line
  outside a code fence. No <small> on math. Paths are relative to the lecture page
  that mounts this topic (lectures/LNN-slug/index.html).
-->

### Generative 3D and video

<small>(~62 min)</small>


---

## From a prompt or a photo to a 3D asset: three routes

| route | what runs | time per asset | the weak point |
| ----- | --------- | -------------- | -------------- |
| **optimize per asset** | score distillation: a frozen image model judges renders of a scene being trained | minutes to hours | averages; extra faces; saturated color |
| **generate views, then reconstruct** | an image model makes several views at known cameras at once; NeRF or splats fit them | seconds, plus a reconstruction | views that disagree |
| **reconstruct in one pass** | a network trained on many 3D objects maps images straight to splats | one forward pass | only as good as its 3D training data |

- the three share the **learned-scene renderer** of the last lecture; they differ in who supplies the pictures and when


---

## Route 1: how score distillation fails

<img src="../L17-diffusion-2/figures/sds-toy.svg" class="media-shot" style="max-height: 200px;" alt="score distillation pulling twelve starts to one clump near the spiral's center, against DDIM carrying them to twelve points on the spiral">

- **averaging**: on the spiral, one point 0.122 off the data; in 3D, smooth, over-simple shapes
- **saturation**: very high guidance makes the average recognizable, and guidance saturates
- **extra faces**: each render is judged **alone** by a model with no scene; the typical view of a head is a front, so every side becomes one


---

## Route 2: generate views that agree

Condition the image model on a **camera** and generate several views of one object at once, with attention **across the views**. Four cameras on a ring, radius 2, elevation 20°, looking at the origin:

```text
   azimuth   eye                      w (back axis)          u (right axis)      V translation
   0°        (0, 0.684, 1.879)        (0, 0.342, 0.940)      (1, 0, 0)           (0, 0, −2)
   90°       (1.879, 0.684, 0)        (0.940, 0.342, 0)      (0, 0, −1)          (0, 0, −2)
   180°      (0, 0.684, −1.879)       (0, 0.342, −0.940)     (−1, 0, 0)          (0, 0, −2)
   270°      (−1.879, 0.684, 0)       (−0.940, 0.342, 0)     (0, 0, 1)           (0, 0, −2)

   one surface point X = (0.3, 0.2, 0), 40° field of view, lands at NDC:
     (0.427, 0.267)     (0, 0.142)     (−0.427, 0.267)     (0, 0.361)
```

- consistency has a precise meaning: the pixel at each of those four positions must show **the same surface**
- the poses are the viewing lecture's `lookAt`; the model must learn what your `V` and `P` compute


---

## Few views are not many photographs

- a capture has **hundreds** of photographs; a generated set has **four to a few dozen**
- NeRF and splats fit whatever the views allow: with few views, regions seen once are **unconstrained** (the floaters of the last lecture) and thin parts are **missed**
- disagreement between views, however small, becomes **blur or ghosting** in the fit: the optimizer averages the views it cannot reconcile
- so the generated views must be **very** consistent, and the reconstruction needs priors that plain photogrammetry does not


---

## Route 3: reconstruct in one pass

A network trained on many 3D objects outputs, for **every pixel** of its input views, one Gaussian: a depth along the pixel's ray, a scale, a rotation, an opacity, a color. Place one:

```text
   image 256×256, vertical field of view 50°  →  tan(25°) = 0.4663
   pixel (180, 100):  NDC x = (180.5/256)·2 − 1 = 0.4102      NDC y = 1 − (100.5/256)·2 = 0.2148
   ray direction (camera space):  (0.4102·0.4663, 0.2148·0.4663, −1) = (0.1913, 0.1002, −1)
   predicted depth 2.4 along −z:   splat center = 2.4·(0.1913, 0.1002, −1) = (0.459, 0.240, −2.4)

   Gaussians per view: 256·256 = 65,536        four views: 262,144   (the bonsai scene: about 240,000)
```

- the unprojection is the **interaction lecture's**, run once per pixel; the network only supplies the depth and the shape
- trained **through the splat renderer**: render the predicted Gaussians from other views, compare with the true images


---

## Video: add a time axis

A clip is a **block of latents** `(t, y, x, channels)`; the recipe of the diffusion lectures is unchanged (Ho et al. 2022):

```text
   16 frames of 64×64×4 latents  =  262,144 numbers to denoise per step
   2×2 patches  →  1,024 tokens per frame,  16,384 tokens per clip
```

<img src="../../media/generative/video-strip.jpg" class="media-shot" style="max-height: 125px;" alt="six frames of a generated clip: a white dragon in a snowy scene, its pose changing across frames">
<small class="credit">prompted by Lumi's AI Dreams · Public domain · via Wikimedia Commons (six frames)</small>

- **temporal attention**: each frame's tokens attend to the same place in the other frames, so an object stays the same object
- consistency across the strip is whatever that attention learned; there is **no scene, camera or physics** behind it


---

## The attention bill

<img src="../L19-generative-3d-video/figures/attention-cost.svg" class="media-shot" style="max-height: 230px;" alt="bar chart on a log scale: one frame's attention 1,048,576 scores, factorized space-then-time 17,039,360, full space-time 268,435,456">

```text
   full space-time:   16,384² = 268,435,456 scores per layer            (256× one frame)
   factorized:        space within each frame   16 · 1,024²  = 16,777,216
                      time at each position     1,024 · 16²  =    262,144     total 17,039,360   (15.75× less)
   120 frames instead of 16:  full attention grows (120/16)² = 56×
```

- factorizing into **space, then time** is how the first video diffusion models stayed affordable; the price is that a token never attends to a different place in a different frame directly


---

## World models

A **world model** predicts the next frame from the previous frames and a controller input: a renderer with **no scene state**, whose errors feed its next input.

<img src="../L19-generative-3d-video/figures/drift.svg" class="media-shot" style="max-height: 200px;" alt="a thrown ball's height over 60 frames: the renderer's exact arc, and a predictor with a one-percent velocity error per frame drifting above it">

```text
   a ball thrown up at 5 m/s, 60 Hz; the predictor extrapolates from its own last two frames, 1 % velocity error
   error at frame 10: 0.035 m      frame 30: 0.274 m      frame 60: 0.696 m      (true height at 60: 0.100 m)
```

- a renderer draws frame 60 **from the state**; a predictor draws it **from frame 59**, and small errors compound


---

## Networks inside the renderer

```text
   upscaling:        render 960×540 = 518,400 px, display 1920×1080 = 2,073,600 px   → shade 25 % of the pixels
   frame generation: one generated frame between every two rendered                    → 12.5 % of displayed pixels shaded
   denoising:        Monte Carlo noise ∝ 1/√N; a quarter of the noise costs 16× the samples
                     a learned denoiser turns 1 to 4 samples per pixel into a clean frame instead
```

- all three are **inside the frame loop** of the interaction lecture, with the renderer's own depth, normals and motion vectors as inputs
- the scene, the camera and the light stay authored and exact; the network fills in pixels, frames and samples


---

## Relighting: what a capture cannot do

A floor point, normal `(0, 1, 0)`, albedo 0.8, captured under a light at 45°:

```text
   captured:          0.8 · (N·L) = 0.8 · 0.707 = 0.566
   move the light overhead:
     a mesh with a Lambert material:   0.8 · 1.0 = 0.800      (recomputed from the light)
     a splat or a NeRF sample:         0.566                  (the color was stored, not computed)
```

- a learned scene stores **radiance**: the product of material and lighting at capture time
- relighting needs the two **separated**: an albedo and a BRDF per point (the PBR lecture) plus an estimate of the capture's light, an inverse problem with many answers

