<!--
  CSS 551 · TOPIC DECK: Generative 3D and video, networks in the renderer, VR (~68 min, densified 2026-09-29).
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
  PAPERS:  DreamFusion, Video Diffusion Models (Ho et al. 2022), NeRF, 3DGS; added 2026-09-29, every identifier
           confirmed on arXiv: Zero-1-to-3, LRM, LGM, CogVideoX, FVD, the FVD content-bias study, GameNGen, Genie,
           neural radiance caching, real-time neural appearance models.
  DENSE:   added what an engine needs, cross-view attention, an epipolar line, the camera as a condition, unknowns
           against measurements, a generated orbit as views, two named reconstructors, minutes against seconds, a 3D
           VAE, the token count of ten seconds, image to video, flicker and warp error, temporal attention by hand,
           render-then-restyle, FVD, a world model's loop, GameNGen, context noising, Genie, frame generation, jitter,
           accumulation, paths per second, radiance caching, neural materials, the albedo-shading ambiguity,
           relightable captures, and a VR section (budget, motion to photon, reprojection, foveation, stereo, vergence
           and focus, splats in a headset, half rate plus synthesis). Numbers: lectures/L19-generative-3d-video/figures/
           numbers.json key "dense".

  reveal.js: FLAT (every slide a top-level "---" section). Notes follow "Note:".
  Plain unicode math or fenced ```text blocks. Never two "_" on one markdown line
  outside a code fence. No <small> on math. Paths are relative to the lecture page
  that mounts this topic (lectures/LNN-slug/index.html).
-->

### Generative 3D and video

<small>(~68 min)</small>


---

## From a prompt or a photo to a 3D asset: three routes

| route | what runs | time per asset | the weak point |
| ----- | --------- | -------------- | -------------- |
| **optimize per asset** | score distillation: a frozen image model judges renders of a scene being trained | minutes to hours | averages; extra faces; saturated color |
| **generate views, then reconstruct** | an image model makes several views at known cameras at once; NeRF or splats fit them | seconds, plus a reconstruction | views that disagree |
| **reconstruct in one pass** | a network trained on many 3D objects maps images straight to splats | one forward pass | only as good as its 3D training data |

- the three share the **learned-scene renderer** of the last lecture; they differ in who supplies the pictures and when


---

## What an engine needs from an asset

A generated splat cloud or field is not yet an asset. An engine wants:

```text
   a triangle mesh with UVs            the rasterizer's primitive (the meshes and texture lectures)
   material maps                       albedo, normal, roughness, metallic: 4 × 1024² = 4.2 million texels
   levels of detail                    the bunny's QEM ladder: 868, 3,472, 13,889, 69,451 triangles
                                       level 0 is safe beyond distance 13.4 (error under a pixel at 720 rows)
   a pivot, a scale, a collision shape
```

- the generative step makes the **shape and the look**; the pipeline's own tools (marching cubes, UV unwrapping, simplification, baking) make it **usable**
- materials matter most: without separate albedo and roughness the asset cannot be relit (the relighting slide at the end)


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

## Attention across views

Let the four views' tokens attend to **each other**, not only within their own view:

```text
   4 views × 1,024 tokens = 4,096 tokens
   joint attention:          4,096²      = 16,777,216 scores per layer
   each view alone:          4 × 1,024²  =  4,194,304                    (4× less)
```

- the extra scores are the ones that **compare views**: a token in view 0 can look at the tokens where the same surface lands in view 90
- the model is never told where those tokens are; it must learn the geometry of the previous slide from data


---

## Where the model should look: an epipolar line

A pixel of view 0 does not fix a depth; the points along its ray project to a **line** in view 90:

```text
   view 0's ray through X = (0.3, 0.2, 0) passes X at distance 1.964 from camera 0
   along that ray,  seen by the 90° camera (NDC):
     distance 1.464:   (−0.783,  0.372)
     distance 1.964:   ( 0.000,  0.142)       X itself
     distance 2.464:   ( 0.812, −0.096)
```

- a correct model puts view 0's surface point **somewhere on this line** in view 90, and the depth decides where
- some multi-view models restrict cross-view attention to epipolar lines; most leave it to learning


---

## The camera as a condition

Zero-1-to-3 (Liu et al. 2023, arXiv:2303.11328): condition an image model on **one input image** and a **relative camera change**, and it draws the object from the new viewpoint.

- trained on renders of synthetic 3D objects from known cameras, then applied to photographs and paintings (its abstract)
- the camera change enters the condition slot like a caption; the model has to learn what your `V` computes
- used alone it makes one view at a time, and neighboring views need not agree: the reason later models generate **several views jointly**


---

## Few views are not many photographs

- a capture has **hundreds** of photographs; a generated set has **four to a few dozen**
- NeRF and splats fit whatever the views allow: with few views, regions seen once are **unconstrained** (the floaters of the last lecture) and thin parts are **missed**
- disagreement between views, however small, becomes **blur or ghosting** in the fit: the optimizer averages the views it cannot reconcile
- so the generated views must be **very** consistent, and the reconstruction needs priors that plain photogrammetry does not


---

## Unknowns against measurements

A one-pass reconstructor that places one Gaussian per pixel of four 256×256 views:

```text
   measurements:  4 × 256 × 256 pixels × 3 colors         =   786,432 numbers
   unknowns:      262,144 Gaussians × 14 numbers          = 3,670,016
                  (position 3, scale 3, rotation 4, opacity 1, color 3)
   unknowns per measurement:                                     4.67
```

- the problem is **under-determined** almost five times over; the answer comes from what the network learned about **objects in general**
- that is why these networks train on about a million objects: the prior does most of the work


---

## Video as views: reconstruct a generated orbit

Ask a video model for a slow orbit around an object, then fit splats to the frames:

```text
   a 49-frame orbit:   49 views instead of 4          12× the measurements
   the poses:  known if the camera path was the condition, estimated by structure from motion otherwise
```

- more views reduce the under-determination of the last slide, **if** the frames agree; flicker becomes blur in the fit
- it joins the two halves of the course's neural weeks: a learned **image** model supplies the photographs a learned **scene** needs


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

## Two reconstructors, named

| model | input | output | from its abstract |
| ----- | ----- | ------ | ----------------- |
| LRM (Hong et al. 2023, arXiv:2311.04400) | one image | a NeRF | a 500-million-parameter transformer, about 1 million objects, a 3D model in **5 seconds** |
| LGM (Tang et al. 2024, arXiv:2402.05054) | several views, from a multi-view diffusion model | Gaussians | multi-view Gaussian features fused for differentiable rendering |

- both are trained **through a renderer**: predict the scene, render it from held-out views, compare with the true images
- the data is renders of 3D asset libraries plus multi-view captures, as LRM's abstract describes


---

## Minutes against seconds

```text
   DreamFusion (route 1):   15,000 iterations, about 1.5 hours on four TPU chips     5,400 s
   LRM (route 3):           one forward pass                                          5 s
   ratio                                                                          about 1,000×
```

- the optimization cost moved from **every asset** to **training once**; each new asset is then almost free
- the price is paid in data: route 3 needs a large 3D training set, route 1 needs none


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

## One prompt, ten seconds

<video src="../../media/ai/gemini-wind.mp4" poster="../../media/ai/gemini-wind-poster.jpg" controls muted loop playsinline data-autoplay style="max-height: 300px; border-radius: 8px;"></video>

```text
   prompt:  "make a video of a woman with long hair blowing in the wind"
   240 frames at 24 per second, 1280 × 720, several cuts; no scene, camera or simulation behind it
```

<small class="credit">AI-generated by Marcel Gavriliu with Google Gemini, 2026</small>

- watch the **hair and the scarf**: cloth and hair a physics engine would simulate strand by strand, learned from footage instead
- watch **across the cuts**: does the coat, the scarf, the face stay the same person?


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

## Compressing time as well: a 3D autoencoder

CogVideoX (Yang et al. 2024, arXiv:2408.06072) encodes video with a **3D causal VAE**: 4× in time, 8×8 in space. Its abstract's output: 10-second clips, 16 frames per second, 768×1360 pixels.

```text
   pixels:    160 frames × 768 × 1360 × 3        =   501 million numbers
   latent:    160 / 4 = 40 frames of 96 × 170    (8× smaller in each spatial direction)
```

- neighboring frames are nearly identical, so time compresses as well as space
- **causal**: a latent frame depends only on the current and earlier video frames, so a clip can be extended


---

## The token count of ten seconds

```text
   2×2 patches of a 96×170 latent frame:   48 × 85 = 4,080 tokens per frame
   40 latent frames:                        163,200 tokens
   full space-time attention, one layer:    163,200² ≈ 2.7 × 10¹⁰ scores
```

- about 99 times the 16-frame example's full attention (268,435,456): **length is the expensive axis**
- this is why long video uses compression in time, windowed or factorized attention, and generation in chunks


---

## Image to video: condition on the first frame

Give the model the first frame and ask for the rest:

```text
   encode the given frame to a latent;  put it in the first latent frame's place (or concatenate it as channels)
   denoise the other frames; the given one stays fixed
```

- the concatenation mechanism of Tuesday's table, along the time axis
- the same idea animates a render: make a frame in your engine, let a video model continue it, and the first frame's composition is guaranteed


---

## Why generated frames flicker

- each frame's fine texture is decided by the **noise** it started from; independent noises give independent textures
- temporal attention ties frames together only as far as training taught it; small details (hair, foliage, text) slip
- a renderer has no such problem: the same scene, camera and seed give the same texture every frame

```text
   a warp check: pixel (100, 50) in frame t moves by optical flow (3, −1)
   compare frame t at (100, 50) = 0.62 with frame t+1 at (103, 49) = 0.60:   error 0.02
   averaged over the image, this "warp error" measures flicker
```


---

## Temporal attention, by hand

One token of frame `t` attends to the tokens at the **same position** in frames `t−1`, `t`, `t+1` (d = 2):

```text
   q = (1, 0.5)
   frame    key k          value v        score q·k/√2     weight
   t−1      (0.9, 0.6)     (0.8, 0.2)     0.849            0.362
   t        (1.0, 0.5)     (0.7, 0.3)     0.884            0.375
   t+1      (0.2, 1.1)     (0.1, 0.9)     0.530            0.263

   the token's update: (0.578, 0.422)
```

- the neighbor frames that **look alike** get the most weight: the update pulls the token toward what the same place showed a moment ago
- the third frame differs (an occlusion, a cut) and gets less; that is how temporal attention holds an object steady


---

## Consistency by construction: render, then restyle

Keep the scene and the camera in the pipeline, and let a model paint each frame:

```text
   per frame, from the renderer:   depth, normals, edges, motion vectors        (all exact, all consistent)
   per frame, from the model:      appearance, conditioned on those buffers (ControlNet-style) and on the previous frame
   10 seconds at 24 fps:           240 frames of buffers, rendered in seconds
```

- geometry, camera and timing are **guaranteed** consistent; only the texture can flicker
- this is the merged field's middle row in practice: an authored scene, a learned look


---

## Judging video: FVD

The video version of FID (Unterthiner et al. 2018, arXiv:1812.01717): embed clips with a network trained on video, fit Gaussians, compute the Fréchet distance.

- it inherits FID's blind spots: sample-size bias, and only what its embedding sees
- it is weak on **temporal** quality: Ge et al. (2024, arXiv:2404.12391) find FVD "increases only slightly with large temporal corruption"
- human studies and warp error fill the gaps


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

## A world model's loop

```js
// a world model as a frame loop: no scene, only frames and actions
let frames = [first];                                    // a start image, or a few
for (let k = 0; ; k++) {
  const action = readController();                       // the input of the interaction lecture
  const ctx = frames.slice(-8);                          // the last few frames are the only "state"
  const next = sample(model, { ctx, action }, steps);    // a conditional diffusion sampler
  frames.push(next); display(next);
}
```

- the loop is the **interaction lecture's frame loop** with the scene and the renderer replaced by one conditional sampler
- the context window is the whole memory: whatever left the last frames is forgotten


---

## GameNGen: DOOM on a diffusion model

Valevski et al. (2024, arXiv:2408.14837):

```text
   20 frames per second on a single TPU                      50 ms per frame
   4 DDIM sampling steps per frame                            12.5 ms per step, decoding included in the budget
   next-frame PSNR 29.4, "comparable to lossy JPEG compression"
   trained on play sessions recorded from a reinforcement-learning agent
```

- the frame budget of an interactive renderer, met by a diffusion model **only** because four steps suffice here
- human raters were "only slightly better than random chance" at telling short clips from the real game (its abstract)


---

## Fighting drift: noise the context

A next-frame model trained on **clean** past frames meets its **own** slightly wrong frames at play time; the errors compound (the drift slide).

- GameNGen's fix, from its paper: during training, **add noise to the context frames** and tell the model how much, so it learns to correct imperfect inputs
- the same idea as the forward process itself: train on corrupted inputs so that corruption at test time is familiar
- without it, quality degrades within seconds; with it, the paper reports stable play over multi-minute sessions


---

## Genie: actions nobody labeled

Bruce et al. (2024, arXiv:2402.15391): an 11-billion-parameter world model trained **without action labels**, from unlabeled Internet videos.

- a latent action model infers, from pairs of consecutive frames, a small discrete "action" that explains the change
- at play time a user picks those latent actions; the dynamics model generates the next frame
- prompted by a text, a sketch or a photograph, it produces an environment one can act in frame by frame


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

## Frame generation: move pixels along motion vectors

Between rendered frames A and B, a generated frame places each pixel **halfway along its motion**:

```text
   a pixel at x = 100 in A moves +8 px by B          in the middle frame:  x = 104
   a pixel behind it becomes visible in B only      in the middle frame:  no source in A → must be filled
```

- motion vectors and depth come from the renderer; a network handles the **disoccluded** pixels and the blend
- one generated frame per rendered frame halves the shading per displayed frame; latency is not reduced, since the generated frame depends on the **next** real one


---

## Jitter: a new sub-pixel sample every frame

Temporal upscalers and antialiasing move the projection by a **sub-pixel offset** each frame, from a low-discrepancy sequence:

```text
   Halton bases 2 and 3, minus 0.5 (offsets in pixels):
   frame 1: ( 0.000, −0.167)    frame 2: (−0.250,  0.167)
   frame 3: ( 0.250, −0.389)    frame 4: (−0.375, −0.056)
```

- over frames, each pixel is sampled at many positions: **supersampling spread over time**
- the offset goes into `P` as a tiny translation of the projected image; motion vectors undo it when frames are combined


---

## Accumulating over frames

Blend each new frame into a history with weight α (after reprojecting the history by the motion vectors):

```text
   history ← (1 − α)·history + α·current,     α = 0.1

   noise variance of the history, for independent frames:   α / (2 − α) = 0.0526 of one frame's
   the same as averaging about (2 − α)/α = 19 frames
```

- 19 samples' worth of noise reduction for the cost of one sample per frame, as long as the reprojection is right
- where it is wrong (disocclusions, fast motion) the history must be **rejected**, and the noise returns: the ghosting artifact


---

## Paths per second

```text
   1920×1080 at 60 fps, one path per pixel:    124,416,000 paths per second
   3840×2160 at 60 fps:                        497,664,000
   Monte Carlo error at 1 path per pixel:      the full 1/√1; a clean image wants hundreds
```

- real-time path tracing is **one or two samples per pixel**, plus reconstruction: accumulation over frames, a learned denoiser, and upscaling from a lower resolution
- every term of the last three slides multiplies the effective sample count


---

## Neural radiance caching

Müller et al. (2021, arXiv:2106.12372): a small network **trained while rendering** predicts the light arriving at a point, so a path can stop after a bounce or two and ask the cache for the rest.

```text
   overhead from its abstract:   about 2.6 ms at full HD
   a 60 fps frame:               16.7 ms            the cache costs about 16 % of the frame
```

- no pretraining: the network adapts to the scene **as it changes**, self-training on the renderer's own few-bounce samples
- a network used as a **data structure** inside a physically based renderer, not as a replacement for it


---

## Neural materials

Zeltner et al. (2023, arXiv:2305.02678), from its abstract: learned hierarchical textures read by **small neural decoders** that output reflectance and importance-sampled directions, so layered material graphs that were offline-only render in real time.

- the decoder replaces a deep stack of analytic BRDF layers with one small network per material
- it keeps two graphics priors: **shading frames** and a **microfacet** sampling distribution (the PBR lecture's)


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


---

## One number, many answers

The captured pixel says only `albedo × shading = 0.566`:

```text
   albedo 0.800, shading 0.707      product 0.566   (the true scene: light at 45°)
   albedo 0.566, shading 1.000      product 0.566   (a darker floor, light overhead)
   albedo 0.707, shading 0.800      product 0.566
```

- every row explains the photograph equally well; relighting needs to know which one is true
- the extra information comes from **many lights** (a light stage), **many views** of a specular surface, or a **learned prior** about materials


---

## Relightable captures

Store the ingredients instead of the product, per splat or per sample:

```text
   albedo (3)  +  normal (3)  +  roughness (1)  +  metallic (1)          = 8 numbers
   at render time:   the illumination lecture's shading, computed per light, per frame
```

- relighting then costs a **shading pass**, like any mesh with a PBR material
- the hard part moves to capture: estimating these from photographs taken under one unknown light


---

## VR: two eyes, ninety times a second

```text
   Meta Quest 3:  2064 × 2208 per eye                    9,114,624 pixels per frame
   at 90 Hz:      820,316,160 pixels per second          6.6 × 1080p at 60 fps
   frame budget:  11.1 ms at 90 Hz,  8.3 ms at 120 Hz
```

- every frame is rendered **twice**, from two cameras, at more than twice a monitor's pixel count
- dropping a frame is not a hitch but **discomfort**: the budget is a hard deadline


---

## Motion to photon

The time from a head movement to the updated light reaching the eye must stay **under about 20 ms** (the target Carmack and others set for presence).

```text
   a head turning at 200° per second, 20 ms of latency:   the world lags by 4°
   if a 2064-pixel-wide eye image spans about 100°:        20.6 pixels per degree
   4° of lag:                                             about 83 pixels of error
```

- latency adds up across the loop: sensor, simulation, render, scan-out
- the interaction lecture's latency budget, with a tighter deadline and a nauseous user as the penalty


---

## Reprojection: fix the head's last move

Just before scan-out, re-read the head pose and **warp the finished frame** by the rotation since it was rendered:

```text
   the head turned 1° since the render:   shift the image by about 21 pixels
   cost: one full-screen resampling pass, a fraction of a millisecond
```

- rotation needs no depth: a rotation of the camera moves every pixel the same way, whatever its distance
- translation does need depth (near things move more): the depth buffer again, now a reprojection input
- also covers a dropped frame: show the last frame, warped to the new pose


---

## Foveated rendering

The eye sees sharply only near the center of gaze. Render the center at full rate and the rest at a quarter:

```text
   a 100° field, a 20° full-resolution center, the periphery at 1/4 the pixel rate:
   (20² + (100² − 20²)/4) / 100²  =  (400 + 2,400) / 10,000  =  28 % of the shading
```

- fixed foveation uses the lens center; **eye-tracked** foveation follows the gaze and can shrink the center
- the rasterizer's variable-rate shading, or rendering the periphery into a smaller target and upscaling


---

## The second eye is another V

Two cameras, offset by half the interpupillary distance (about 63 mm between the eyes) to each side:

```text
   V_left, V_right = translate(±0.0315 m along the head's x) · V_head

   angle between the two eyes' lines of sight to a point:
     at 0.5 m:  7.21°      at 1 m:  3.61°      at 10 m:  0.36°
```

- beyond about 10 m the two images barely differ: stereo depth is a **near-field** cue
- the same scene, two `V`s, two `P`s (asymmetric, because each eye's lens is off-center)


---

## Focus and vergence disagree

The eyes **converge** on a virtual object's depth, but **focus** at the display's fixed optical distance:

```text
   object at 0.5 m:   vergence demands 1/0.5 = 2.00 diopters
   display focused at 1.5 m:   0.67 diopters
   mismatch:   1.33 diopters
```

- in the real world the two always agree; in a headset they conflict for near objects, a cause of eye strain
- varifocal and light-field displays try to put focus back; neither is in mainstream headsets


---

## Learned scenes in a headset

```text
   240,000 splats × 2 eyes × 90 frames per second  =  43,200,000 splat projections per second
   plus a sort per eye per frame
```

- splatting's real-time speed is what makes captured places viewable in VR at all; a per-pixel ray-marched NeRF would miss the deadline by orders of magnitude
- the pitfalls get worse: popping and aliasing are more visible with **two** slightly different views


---

## When a frame is late: half rate plus synthesis

If a frame takes 13 ms, it misses the 11.1 ms deadline of 90 Hz. The fallback:

```text
   render at 45 Hz (22.2 ms per frame, enough for the 13 ms render)
   synthesize every second displayed frame: reproject the last one by head pose, extrapolate motion by motion vectors
   the display still updates at 90 Hz; the head's rotation is always current
```

- the rotation correction is exact (previous slide); moving objects are extrapolated and can **wobble** at their edges
- the same frame-generation idea as the flat-screen case, with a hard deadline instead of a smoothness goal

