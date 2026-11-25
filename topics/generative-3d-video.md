<!--
  CSS 551 · TOPIC DECK: Generative 3D and video, networks in the renderer, VR (~86 min, 36 content slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/generative-3d-video.md"> among others; it carries no
  logistics (no title, Thursday, homework, wrap) and no "Part N" numbering.

  GOALS: the neural era's last step as a survey of methods, each with its problem, its idea, where it breaks
    and who uses it: three routes from a prompt or a photo to a 3D asset; video as diffusion with a time axis,
    whose costs are consistency and length; world models, renderers with no scene state; networks inside a
    real-time renderer; why a captured scene cannot be relit; the budgets of a headset.
  OUTCOMES (students can): name the three routes to a 3D asset with the cost and weak point of each; explain why
    score distillation averages and grows extra faces; say what consistency between generated views means and why
    views are generated jointly with the camera as a condition; explain why a one-pass reconstructor leans on a
    learned prior; say how attention cost grows with clip length (n tokens, n² scores) and what factorizing and a
    3D autoencoder save; explain flicker and what render-then-restyle guarantees; explain why a world model drifts
    and how noising the context helps; describe upscaling, frame generation, jitter and accumulation as networks
    and reuse inside the frame loop; explain why a captured scene cannot be relit; state a headset's frame budget
    and what reprojection and foveation buy.
  EDIT 2026-11-24 LESS MATH (Marcel: "PCA, eigenvalues, hilbert spaces... way over the math level of the class.
    can the following lectures use less math?"): the core is a method survey, 59 to 36 content slides. Moved, in
    order, to topics/generative-3d-video-supplement.md: the camera ring worked, attention across views counted,
    the epipolar line and its check, unknowns against measurements, video as views, one Gaussian placed, the
    attention bill counted, the token count of ten seconds, temporal attention and the softmax by hand, FVD, the
    compounding-error recurrence, which frame has the pixel, Halton, the history's noise derived, upscaling spends
    frames, paths per second, neural materials, two known lights, relightable captures, and the VR arithmetic
    (sharpness, the second eye, disparity, vergence, splats in a headset, the late frame). New: "Route 1: a 2D
    image model as the critic". Folded in: minutes against seconds (into the reconstructors), the disoccluded
    strips (into frame generation), photometric stereo and relightable captures (into one number, many answers),
    the late frame (into reprojection), pixels per degree (into the VR budget). Quiz families: gen-sds-concept
    (route 1 slides), gen-multiview-concept (three routes; route 2; attention across views; the camera as a
    condition), gen-video-concept (the attention bill; flicker; render, then restyle), gen-world-models (world
    models; fighting drift).
  ACRONYMS 2026-11-24: each acronym is spelled out at its first use in this file, slides and notes alike; paper
    and product names (DreamFusion, Zero-1-to-3, CogVideoX, GameNGen, Genie, DOOM) stay names; each Greek letter
    is named in parentheses at its first use.

  TEACHES: three routes from a prompt or a photo to a 3D asset (optimize per asset, generate views then
  reconstruct, reconstruct in one pass) and what each costs; why per-asset score distillation averages
  and grows extra faces; multi-view generation as a consistency problem; feed-forward reconstruction as one
  Gaussian per pixel; video as diffusion over a block of latents and the attention bill, full against
  factorized; world models and the drift of a next-frame predictor against a renderer; neural rendering
  inside engines (upscaling, frame generation, denoising, accumulation); relighting, and why a captured
  scene cannot do it; a headset's budgets.
  NEEDS:   the diffusion topics (guidance, latents, cross-attention, score distillation); the learned-scenes
           topic (NeRF, splats, the differentiable renderer); viewing (lookAt, the projection); ray tracing
           (Monte Carlo error); illumination (Lambert).
  DEMOS:   data-demo="diffusion-2d" data-controls="steps,stochastic" (demo-full). Media: ../../media/generative/video-strip.jpg, credit line verbatim from media/generative/CREDITS.md.
  FIGURES: ../../lectures/L20-generative-3d-video/figures/{attention-cost,drift}.svg and numbers.json;
           ../../lectures/L18-diffusion-2/figures/sds-toy.svg (tools/gen-lecture-figures-d2.mjs).
  PAPERS:  DreamFusion, Video Diffusion Models (Ho et al. 2022), NeRF, 3DGS; added 2026-09-29, every identifier
           confirmed on arXiv: Zero-1-to-3, LRM, LGM, CogVideoX, FVD, the FVD content-bias study, GameNGen, Genie,
           neural radiance caching, real-time neural appearance models.
  HISTORY: densified 2026-09-29, expanded 2026-10-05 (numbers in lectures/L20-generative-3d-video/figures/
           numbers.json key "dense", computed with lib/core/xform.js and lib/core/diffusion.js in node); two Check
           slides cut 2026-10-08; figure paths moved 2026-10-25.

  reveal.js: FLAT (every slide a top-level "---" section). Notes follow "Note:".
  Plain unicode math or fenced ```text blocks. Never two "_" on one markdown line
  outside a code fence. No <small> on math. Paths are relative to the lecture page
  that mounts this topic (lectures/LNN-slug/index.html).
-->

### Generative 3D and video

<small>(~86 min)</small>


---

## From a prompt or a photo to a 3D asset: three routes

| route | what runs | time per asset | the weak point |
| ----- | --------- | -------------- | -------------- |
| **optimize per asset** | score distillation: a frozen image model judges renders of a scene being trained | minutes to hours | averages; extra faces; saturated color |
| **generate views, then reconstruct** | an image model makes several views at known cameras at once; a NeRF (neural radiance field) or splats fit them | seconds, plus a reconstruction | views that disagree |
| **reconstruct in one pass** | a network trained on many 3D objects maps images straight to splats | one forward pass | only as good as its 3D training data |

- the three share the **learned-scene renderer** of the last lecture; they differ in who supplies the pictures and when


---

## What an engine needs from an asset

A generated splat cloud or field is not yet an asset. An engine wants:

- a **triangle mesh** with UV texture coordinates: the rasterizer's primitive (the meshes and texture lectures)
- **material maps**: albedo, normal, roughness, metallic, so the asset can be lit and relit
- **levels of detail**: simpler meshes for distant copies (the meshes lecture's simplification)
- a pivot, a scale, a collision shape
- the generative step makes the **shape and the look**; the pipeline's own tools (marching cubes, UV unwrapping, simplification, baking) make it **usable**


---

## Route 1: a 2D image model as the critic

DreamFusion (Poole et al. 2022): a 3D object from a caption, with **no 3D training data**.

- **the idea**: render the scene from a random camera, add noise to the render, ask a **frozen** image model what it expects to see there, and nudge the scene so the render moves that way; repeat from new cameras
- the image model **judges**; the renderer **renders**; only the scene (a NeRF or splats) is trained
- all of the knowledge comes from the **2D** model, trained on ordinary pictures
- **the cost**: thousands of steps per object, minutes to hours


---

## Route 1: how score distillation fails

<img src="../L18-diffusion-2/figures/sds-toy.svg" class="media-shot" style="max-height: 200px;" alt="score distillation pulling twelve starts to one clump near the spiral's center, against the DDIM (denoising diffusion implicit models) sampler carrying them to twelve points on the spiral">

- **averaging**: on the spiral, all twelve starts collapse to one clump off the data; in 3D, smooth, over-simple shapes
- **saturation**: very high guidance makes the average recognizable, and guidance saturates the colors
- **extra faces**: each render is judged **alone** by a model with no scene; the typical view of a head is a front, so every side becomes one


---

## Route 2: generate views that agree

Condition the image model on a **camera** and generate several views of one object **at once**:

- four cameras on a ring around the object, each one a `lookAt` from the viewing lecture
- **consistency** has a precise meaning: where one surface point lands in each view, those pixels must show **the same surface**
- the model is never told where a point lands; it must learn what your `V` and `P` compute
- when the views agree, the learned-scenes reconstruction turns them into a scene; when they do not, it fills the disagreement with floaters


---

## Attention across views

Each view is a grid of tokens. Let the four views' tokens attend to **each other**, not only within their own view:

- four views attended **jointly** cost about **4 times** the scores of four views attended separately
- every extra score **compares two views**: a token in one view can look at the tokens where the same surface lands in another
- some models restrict that look to the **epipolar line**, the line a pixel's ray traces across the other view; most leave it to learning


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

## Route 3: reconstruct in one pass

A network trained on many 3D objects outputs, for **every pixel** of its input views, one Gaussian splat:

- the pixel fixes a **ray** (the interaction lecture's unprojection); the network predicts the **depth** along it and the splat's shape, opacity and color
- four views of 256 × 256 give a quarter of a million splats, the size of the bonsai capture, drawn by the same real-time rasterizer
- each pixel gives **3** numbers (a color) and asks for **14** (position, scale, rotation, opacity, color): the answer comes from what the network learned about **objects in general**
- trained **through the splat renderer**: predict the splats, render them from other views, compare with the true images


---

## Two reconstructors, named

| model | input | output | from its abstract |
| ----- | ----- | ------ | ----------------- |
| LRM, Large Reconstruction Model (Hong et al. 2023, arXiv:2311.04400) | one image | a NeRF | a 500-million-parameter transformer, about 1 million objects, a 3D model in **5 seconds** |
| LGM, Large Multi-View Gaussian Model (Tang et al. 2024, arXiv:2402.05054) | several views, from a multi-view diffusion model | Gaussians | multi-view Gaussian features fused for differentiable rendering |

- both are trained **through a renderer**: predict the scene, render it from held-out views, compare with the true images
- the cost moved from **every asset** to **training once**: DreamFusion takes about 1.5 hours per object, LRM 5 seconds, about 1,000 times faster
- the price is data: route 3 needs a large 3D training set; route 1 needs none


---

## Video: add a time axis

A clip is a **block of latents**: frames × height × width × channels. The recipe of the diffusion lectures is unchanged (Ho et al. 2022).

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

## The same clip, "as a CGI sketch"

<div style="display:flex; gap:12px; justify-content:center;">
<video src="../../media/ai/gemini-wind.mp4" poster="../../media/ai/gemini-wind-poster.jpg" controls muted loop playsinline data-autoplay style="width: 46%; border-radius: 8px;"></video>
<video src="../../media/ai/gemini-wind-cgi.mp4" poster="../../media/ai/gemini-wind-cgi-poster.jpg" controls muted loop playsinline data-autoplay style="width: 46%; border-radius: 8px;"></video>
</div>

```text
   follow-up prompt:  "make the same video look like it was a CGI sketch... not fully polished"
```

<small class="credit">both AI-generated by Marcel Gavriliu with Google Gemini, 2026</small>

- it **looks** like CGI (computer-generated imagery), a flat-shaded mesh from the meshes lecture: facets, grey material, low-poly waves
- there is **no mesh**: count the facets on the cheek from one frame to the next, and across a cut


---

## The same clip, edited by prompt

<div style="display:flex; gap:12px; justify-content:center;">
<video src="../../media/ai/gemini-wind.mp4" poster="../../media/ai/gemini-wind-poster.jpg" controls muted loop playsinline data-autoplay style="width: 46%; border-radius: 8px;"></video>
<video src="../../media/ai/gemini-wind-blonde.mp4" poster="../../media/ai/gemini-wind-blonde-poster.jpg" controls muted loop playsinline data-autoplay style="width: 46%; border-radius: 8px;"></video>
</div>

```text
   follow-up prompt:  "make her blonde with bright purple lips and steely eyes"
```

<small class="credit">both AI-generated by Marcel Gavriliu with Google Gemini, 2026</small>

- kept: the coast, the coat, the scarf, the shots and their timing; changed: **hair, lips, eyes**
- watch the **lips across the cuts**: an edit the model must remember in every shot


---

## The attention bill

<img src="../L20-generative-3d-video/figures/attention-cost.svg" class="media-shot" style="max-height: 230px;" alt="bar chart on a log scale: one frame's attention 1,048,576 scores, factorized space-then-time 17,039,360, full space-time 268,435,456">

- every token scores every other token: **n tokens make n² scores**; 16 frames of 1,024 tokens cost 256 times one frame
- 120 frames instead of 16 is 7.5 times the tokens, so **7.5² ≈ 56 times** the scores: **length is the expensive axis**
- **factorized** attention (space within each frame, then time at each position) costs about 16 times less; the price: a token cannot look at a different place in a different frame in one step


---

## Compressing time as well: a 3D autoencoder

CogVideoX (Yang et al. 2024, arXiv:2408.06072) encodes video with a **3D causal VAE** (variational autoencoder): 4 times smaller in time, 8 × 8 in space. Its clips: 10 seconds, 16 frames per second, 768 × 1360 pixels.

- neighboring frames are nearly identical, so time compresses as well as space: 160 frames become 40 latent frames
- fewer latent frames are fewer tokens, and the attention bill falls with the **square**
- **causal**: a latent frame depends only on the current and earlier video frames, so a clip can be extended


---

## Image to video: condition on the first frame

Give the model the first frame and ask for the rest:

- encode the given frame to a latent and put it in the first latent frame's place (or attach it as extra channels); denoise the other frames while it stays fixed
- the concatenation mechanism of the conditioning table (Diffusion models II), along the time axis
- the same idea animates a render: make a frame in your engine, let a video model continue it, and the first frame's composition is guaranteed


---

## Flicker in generated frames

- each frame's fine texture is decided by the **noise** it started from; independent noises give independent textures
- temporal attention ties frames together only as far as training taught it; small details (hair, foliage, text) slip
- a renderer has no such problem: the same scene, camera and seed give the same texture every frame
- to measure it, follow each pixel along its motion into the next frame and compare: the average difference, the **warp error**, measures flicker


---

## Consistency by construction: render, then restyle

Keep the scene and the camera in the pipeline, and let a model paint each frame:

```text
   per frame, from the renderer:   depth, normals, edges, motion vectors        (all exact, all consistent)
   per frame, from the model:      appearance, conditioned on those buffers (ControlNet-style) and on the previous frame
   10 seconds at 24 frames/s:      240 frames of buffers, rendered in seconds
```

- geometry, camera and timing are **guaranteed** consistent; only the texture can flicker
- this is the merged field's middle row in practice: an authored scene, a learned look


---

## World models

A **world model** predicts the next frame from the previous frames and a controller input: a renderer with **no scene state**, whose errors feed its next input.

<img src="../L20-generative-3d-video/figures/drift.svg" class="media-shot" style="max-height: 200px;" alt="a thrown ball's height over 60 frames: the renderer's exact arc, and a predictor with a one-percent velocity error per frame drifting above it">

- a renderer draws frame 60 **from the state**; a predictor draws it **from frame 59**, carrying every earlier error forward
- a thrown ball with a 1 % error per frame: invisible at frame 10, seven times the ball's true height by frame 60; nothing **removes** the error, since there is no state to compare against


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

- **20 frames per second** on a single TPU, with **4** sampling steps per frame
- next frames close to the real game's, about the quality of a lossy JPEG (Joint Photographic Experts Group) image; human raters were "only slightly better than random chance" at telling short clips from the real game (its abstract)
- trained on play sessions recorded from a reinforcement-learning agent; the game logic, levels and art all came from the original
- the frame budget of an interactive renderer, met by a diffusion model **only** because four steps suffice here


---

<!-- .slide: class="demo-full" -->

## Four steps, live

<div class="cockpit" data-demo="diffusion-2d" data-controls="steps,stochastic"><pre class="viz-fallback">  the course's exact denoiser on the spiral, sampled from pure noise with DDIM
  drag steps to 4, the GameNGen budget: the particles stop between the arms
  mean distance to the nearest data point (seed 11, 300 particles):
    4 steps 0.098      20 steps 0.019      50 steps 0.009
  four steps from pure noise are not enough here; a next frame is mostly fixed by its context frames</pre></div>


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

- **upscaling**: render a quarter of the pixels (960 × 540 for a 1920 × 1080 display); a network trained on full-resolution frames supplies the rest
- **frame generation**: a network makes every other displayed frame; with upscaling, one displayed pixel in eight is shaded
- **denoising**: Monte Carlo noise falls only as 1/√N, so a quarter of the noise costs 16 times the samples; a learned denoiser turns 1 to 4 samples per pixel into a clean frame
- all three sit **inside the frame loop**, read the renderer's own depth, normals and motion vectors, and leave the scene, the camera and the light authored and exact


---

## Frame generation: move pixels along motion vectors

Between rendered frames A and B, a generated frame places each pixel **halfway along its motion**:

- a pixel that moves 8 pixels from A to B sits 4 pixels along in the middle frame
- background the moving object **uncovers** exists only in B; background it is about to **cover** exists only in A; the renderer's **depth** says which surface is in front
- motion vectors and depth come from the renderer; a network fills what neither frame shows and blends the rest
- latency is not reduced: the generated frame waits for the **next** real one


---

## Jitter: a new sub-pixel sample every frame

Temporal antialiasing and temporal upscalers move the projection by a **sub-pixel offset** each frame:

- the offsets come from an evenly spreading sequence (Halton's), so over a few frames they cover the pixel without clustering
- over frames, each pixel is sampled at many positions: **supersampling spread over time**
- the offset goes into `P` as a tiny translation of the projected image; motion vectors undo it when frames are combined


---

## Accumulating over frames

Blend each new frame into a running **history**, after moving the history along the motion vectors:

```text
   history ← 0.9 · history + 0.1 · current         keep 90 % of the old, take 10 % of the new
```

- the new frame's weight, α (alpha) = 0.1, makes the noise fall as if about **19 frames** were averaged, for the cost of one sample per frame
- a still camera converges to more detail than one frame holds; upscalers fill their missing pixels from this history
- where the reprojection is wrong (uncovered pixels, fast motion) the history must be **rejected** and the noise returns; kept anyway, it leaves **ghosts**


---

## Neural radiance caching

Müller et al. (2021, arXiv:2106.12372): a small network **trained while rendering** predicts the light arriving at a point, so a path can stop after a bounce or two and ask the cache for the rest.

```text
   overhead from its abstract:   about 2.6 ms at full HD (high definition, 1920 × 1080)
   a frame at 60 frames/s:       16.7 ms            the cache costs about 16 % of the frame
```

- no pretraining: the network adapts to the scene **as it changes**, self-training on the renderer's own few-bounce samples
- a network used as a **data structure** inside a physically based renderer, not as a replacement for it


---

## Relighting: what a capture cannot do

A floor point with albedo 0.8, photographed under a light at 45°:

- the photograph records the floor's brightness, **0.566**: the albedo times the Lambert term (0.8 · cos 45°)
- move the light overhead: a mesh with a Lambert material recomputes **0.800**; a splat or a NeRF sample still shows **0.566**, the stored color
- a learned scene stores **radiance**: material and lighting multiplied together at capture time
- relighting needs them **separated**: an albedo and a BRDF (bidirectional reflectance distribution function) per point, plus an estimate of the capture's light


---

## One number, many answers

The captured pixel says only **albedo × shading = 0.566**:

```text
   albedo 0.800, shading 0.707      (the true scene: light at 45°)
   albedo 0.566, shading 1.000      (a darker floor, light overhead)
   albedo 0.707, shading 0.800
```

- every row explains the photograph equally well: separating material from light has **many answers**
- photograph again under a second **known** light and only one row survives: **photometric stereo** (Woodham 1980); a **light stage** uses dozens of lights
- or a **learned prior** picks the most plausible split; storing albedo, normal, roughness and metallic per splat then makes a capture relightable with an ordinary shading pass


---

## VR: two eyes, ninety times a second

A VR (virtual reality) headset, the Meta Quest 3: 2064 × 2208 pixels per eye, at 90 Hz.

- every frame is rendered **twice**, from two cameras: 6.6 times the pixels per second of a 1080p monitor at 60 frames per second
- the frame budget is **11.1 ms** at 90 Hz, 8.3 ms at 120 Hz; dropping a frame is not a hitch but **discomfort**
- even so, about **20 pixels per degree** of view against the 60 the eye resolves: antialiasing and texture filtering matter more, and head motion magnifies shimmer


---

## Motion to photon

The time from a head movement to the updated light reaching the eye must stay **under about 20 ms** (the target Carmack and others set for presence).

- a head turning at 200° per second with 20 ms of latency: the world lags by **4°**, about 80 pixels on this headset

- latency adds up across the loop: sensor, simulation, render, scan-out
- the interaction lecture's latency budget, with a tighter deadline and a nauseous user as the penalty


---

## Reprojection: fix the head's last move

Just before scan-out, re-read the head pose and **warp the finished frame** by the rotation since it was rendered:

- rotation needs no depth: turning the camera moves every pixel the same way, whatever its distance; translation needs the depth buffer (near things move more)
- cost: one full-screen resampling pass, a fraction of a millisecond
- it also covers a late frame: render at half rate and **synthesize** every other displayed frame by reprojection and motion vectors; moving objects can **wobble** at their edges


---

## Foveated rendering

The eye sees sharply only near the center of gaze:

- render a 20° center at full rate and the rest at a quarter: about **28 %** of the shading
- fixed foveation uses the lens center; **eye-tracked** foveation follows the gaze and can shrink the center
- the rasterizer's variable-rate shading, or rendering the periphery into a smaller target and upscaling

