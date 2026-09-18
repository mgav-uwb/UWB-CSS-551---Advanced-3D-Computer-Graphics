<!--
  CSS 551 · TOPIC DECK — Learned images: the diffusion ladder (~55 min).
  A topic is a reusable stretch of slides that a session page mounts as one
  <section data-markdown="../../topics/diffusion-ladder.md"> among others; it carries no
  session logistics (no title, Thursday, MP, wrap) and no "Part N" numbering.
  Sessions compose topics in their index.html; see sessions/README.md.

  TEACHES: forward process on a real render (C); the mechanism on dots (D); the exact denoiser on MNIST, which memorizes (E); a smoothing knob that generalizes (F); a trained network drawing digits with conditioning and guidance (G); latent diffusion; text in the class slot; the network is whatever scales; the papers (two slides); gallery; ControlNet; text-to-3D; video; what still breaks.
  NEEDS:   the learned-images-foundations topic (exhibit letters continue from it: A, B there; C–G here).
  DEMOS:   data-demo="diffusion-image" (t); "diffusion-2d" (steps,stochastic); "diffusion-digits" (steps) and (smooth); "diffusion-net" (guide,steps); all demo-full. Media: ../../media/generative/*.jpg, credits verbatim from media/generative/CREDITS.md.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Demo embeds live on
  demo-full slides (a short ## title + the embed div + its viz-fallback pre).
  Image/handout paths are relative to the SESSION page that mounts this
  topic (sessions/SNN/index.html): ../../media/..., ../../textbook/...
-->

### Learned images: the diffusion ladder

<small>(~55 min)</small>

Note: The ladder: five live exhibits, each answering "but how do you get from that to any picture?" a little further. A real picture dissolving; the mechanism on dots; the exact denoiser on real digits, which can only memorize; a smoothing knob that turns it into a generator; then a network that was actually trained, drawing digits it never saw. Then the three scalings to Stable Diffusion, the papers, and what still breaks. The galleries at the end are the designated cut if we run long.

---

## Forward: add noise, on schedule

A schedule of small noising steps turns **any** image into pure noise; by the end, every image looks the same.

```text
   x(0) = the image        x(t) = √ᾱ(t) · image  +  √(1−ᾱ(t)) · noise
   x(1) = pure noise, no trace of the image;  nothing is learned here
```

- exhibit C next: the course's Cornell render, 49,152 numbers, dissolving as `t` moves
- watch for: the `t` where you stop recognizing a room, and where the signal-to-noise ratio crosses 0 dB

Note: Setup for exhibit C. The forward process is bookkeeping: pick t, scale the image down a little, add the scheduled amount of noise. Every training image is walked toward noise along the same schedule; at t equal to one all of them are the same Gaussian blob, which is the whole point, because that is the one distribution we can sample from trivially. The exhibit does it to our own render so the "image is a point" idea is concrete: three numbers per pixel, forty-nine thousand of them, all noised at once.

---

<!-- .slide: class="demo-full" -->

## Exhibit C: a real picture, dissolving

<div class="cockpit" data-demo="diffusion-image" data-controls="t"><pre class="viz-fallback">  left: x(0), the Cornell render (128×128×3 = 49,152 numbers)
  right: x(t) = √ᾱ · x(0) + √(1−ᾱ) · noise, for the t on the slider
  drag t: around 0.5 the room is still there; around 0.7 it is gone;
  at 1 nothing remains. Readout: ᾱ(t), SNR in dB, PSNR vs the original.</pre></div>

Note: Drag t slowly. Around 0.3 the room is grainy but obvious; around 0.6 the SNR crosses zero and the walls are guesses; by 0.8 there is nothing to see. Say the two facts: nothing was learned, this is arithmetic; and the end state is the same for any picture, which is what makes noise a usable starting point for the reverse direction. Leave it at about 0.5 and advance: the reverse direction needs a picture of what "undo" means, so we drop to two dimensions where the space is visible.

---

## Reverse: a denoiser

The learned part. Given a noisy point and its `t`, predict the noise that was added (equivalently: where the clean point was).

- the network's job in one sentence: **"from here, which way is the data?"**
- that answer is a **vector field** over the whole space: at every noisy point, a pull toward the sheet
- exhibit D next: 400 points on a spiral stand in for "all images", so the field can be drawn; the demo's denoiser is the **exact** optimal answer for those 400 points, the thing a network approximates
- watch for: the spiral **reassembling** from noise, and how few `steps` it takes

Note: The one conceptual load-bearing slide. The denoiser answers a local question: given this noisy point and how noisy it is, where was the clean point? Its answer everywhere at once is a vector field pointing back toward the data. Two dimensions make the field drawable, which is why the spiral: the 400 points are the "photographs", everything else in the plane is "static". Be honest about the demo: because the dataset is tiny, it computes the exact best answer, an average of the 400 points weighted by how likely each was the origin; a diffusion model's network learns that function for images, where no closed form exists. Announce the watch-fors: arrows on, the reassembly, the step counter, and the steps slider, which is the whole "samplers" story: many small steps (DDPM) or a few larger deterministic ones (DDIM, 2021), same denoiser.

---

<!-- .slide: class="demo-full" -->

## Exhibit D: the mechanism, on dots

<div class="cockpit" data-demo="diffusion-2d" data-controls="steps,stochastic"><pre class="viz-fallback">  start from pure noise; ask the denoiser "which way is the data?"
  steps times, moving a little each time: the spiral reassembles
  drag steps:  3 (coarse, points land between arms) → 20 → 80 (crisp)
  stochastic:  DDIM (deterministic: same start, same landing) vs
               DDPM (a little fresh noise each step: the same start wanders)
  readout: nearest-data distance falls as the shape comes back</pre></div>

Note: Start at 20 steps: the animation runs from noise to the spiral; read the nearest-data distance aloud at the end. Turn on arrows in the settings gear once, so the field is visible, then off. Drag steps down to 3: coarse, points land between the arms; up to 80: crisp. Flip stochastic and re-run twice: the same starting noise lands differently each time; back to deterministic: identical every time. Then the honest question, out loud: this reassembled a spiral from a spiral's own points. How does that become "draw me anything"? The next three exhibits answer it one step at a time.

---

## Training, in one line

```text
   pick an image, pick a random t, add that much noise,
   ask the network for the noise, compare, nudge the weights.   repeat, billions of times.
```

- **denoising diffusion** (Ho, Jain & Abbeel, 2020): the recipe above, and nothing else
- every step is a small, well-posed regression: predict a known noise vector
- that is why it trains stably where earlier generative methods fought their own training

Note: The training loop fits on one line and that is the point: no adversary, no delicate balance, a regression against a noise vector you generated yourself, so the target is always known. Ho, Jain and Abbeel's 2020 paper is the reference; the idea has roots in 2015, and a parallel line of work by Song and colleagues arrived at the same place from the "vector field" side. Do not derive the loss; say that it compares predicted and actual noise and nudges the weights to reduce the difference. In fifteen minutes of this lecture's preparation, exactly this loop trained the network in exhibit G.

---

## From dots to digits

Same mechanism, real images: **2,000 handwritten digits**, 20×20 pixels, so each image is a point in a **400-dimensional** space.

- the denoiser is still the **exact** best answer for that finite set: an average of the training digits, weighted by how likely each was the origin
- exhibit E next: start from noise, walk back; a digit appears
- watch for the panel on the right: every sample lands **exactly on a training digit**. An exact denoiser for a finite set can only **memorize**

Note: Setup for exhibit E, the rung that moves from dots to pictures. Nothing changes but the dimension: 400 numbers per point instead of two, and the "sheet" is now the set of things that look like handwritten digits. The exact denoiser is the same weighted average as on the spiral. What to watch: the reassembly is now a digit appearing out of static, and the panel on the right compares the selected sample with its nearest training digit. The distance will read zero. That is the honest limit of a lookup table: with the exact answer for a finite set, you can only ever get the set back.

---

<!-- .slide: class="demo-full" -->

## Exhibit E: digits, the exact denoiser

<div class="cockpit" data-demo="diffusion-digits" data-controls="steps"><pre class="viz-fallback">  2,000 MNIST digits (20×20) = the training set; a digit is a 400-vector
  start from noise; the exact posterior-mean denoiser walks back `steps` times
  the panel shows the selected sample beside its nearest training digit:
  distance 0.000, verdict "memorized": an exact denoiser only returns the set
  buttons pick the digit (conditioning); click a sample to inspect it
  MNIST (LeCun, Cortes, Burges) · CC BY-SA 3.0</pre></div>

Note: Run it: twelve threes appear from noise. Click three or four of them: the nearest training digit is identical, distance zero, verdict memorized. Click another digit button: same story for sevens. Say the conclusion plainly: this "generator" is a lookup table with extra steps; it can never draw a three nobody wrote. So what does a network add? Next slide: one knob.

---

## The leap: from lookup to generalization

A network cannot store the training set; it learns a **smooth** function that agrees with it. Exhibit F fakes that with one knob.

- `smooth` widens the denoiser's kernel: it keeps **blending neighbors** all the way to the end instead of snapping to one training digit
- watch for: the nearest-digit distance jumping above the threshold, and digits **nobody wrote**
- too smooth, and every sample collapses to one blurry average: the other failure

Note: The rung the whole gap turns on. A network with a million weights cannot memorize sixty thousand images; gradient descent finds a smooth function that agrees with the training pairs and interpolates between them. The exhibit imitates that smoothness with a kernel bandwidth: at exact, the denoiser snaps to the nearest training digit; with some smoothing, it keeps averaging nearby digits to the end and produces a three that is a blend of several threes, a stroke from this one and a loop from that one. The panel now reads a distance well above the threshold: not in the training set. Push the knob too far and the average of everything is a grey blur, the other failure mode, which real models show as mode collapse. Generalization lives between those two.

---

<!-- .slide: class="demo-full" -->

## Exhibit F: digits nobody wrote

<div class="cockpit" data-demo="diffusion-digits" data-controls="smooth"><pre class="viz-fallback">  same 2,000 digits, same walk; drag smooth:
    exact   → every sample is a training digit (distance 0.000, memorized)
    h ≈ 3   → blends of neighbors: new digits, distance ≈ 0.2, "novel"
    h = 5   → one blurry average: too smooth
  the network in the next exhibit learns the middle regime by itself</pre></div>

Note: Start at exact, click a sample: memorized. Drag smooth to 3 and run: the threes soften slightly and the panel flips to "not in the training set", distance around 0.2; click several samples, none matches a training digit exactly, each is a plausible three. Drag to 5: every sample is the same grey blur, the average of all threes. Back to 3. The sentence to land: a real network learns this middle regime on its own, from data, with no knob; the proof is next.

---

## A real learned denoiser

Exhibit G replaces the exact answer with a **trained network**: a small MLP, about a million weights, trained for fifteen minutes on a laptop CPU on 60,000 digits, running in your browser now.

- at sampling time it never sees the training set; it only remembers what it learned about digits
- the digit buttons are **conditioning** (a class embedding, the slot text goes into later); `guide` is **classifier-free guidance**: exaggerate what the class adds
- watch for: the nearest-digit distance, well above the threshold for every sample, and what `guide` does to the strokes

Note: The payoff rung. Everything in exhibits E and F was exact arithmetic on the data; this one is a network trained by the one-line loop three slides ago, in fifteen minutes, on this laptop. Its denoiser is a function of the noisy image, the time and the class, and nothing else; the training set is loaded only so the panel can measure the distance to it. Watch the distances: never zero. Then the two knobs a real model has: the class buttons are conditioning, exactly the slot that a text embedding fills in Stable Diffusion, and guide is classifier-free guidance, the difference between the conditional and unconditional predictions, amplified. Announce: w at 1, then 3, then 6.

---

<!-- .slide: class="demo-full" -->

## Exhibit G: the network draws

<div class="cockpit" data-demo="diffusion-net" data-controls="guide,steps"><pre class="viz-fallback">  a trained class-conditional MLP denoiser (≈1,000,000 weights, 15 minutes
  of CPU training on 60,000 MNIST digits) samples 12 digits from noise
  buttons: which digit (conditioning)   guide: classifier-free guidance w
  the panel: nearest training digit, distance well above the memorization
  threshold for every sample: these digits were learned, not looked up
  MNIST (LeCun, Cortes, Burges) · CC BY-SA 3.0</pre></div>

Note: Run at w equal to 1 on threes: twelve different, plausible threes, distances around 0.2 to 0.3, never a training digit. Click a few. Then w to 3: bolder, more "three-like" strokes; w to 6: thick, saturated, some overcooked. That arc, faithful to overcooked, is the guidance scale in every image tool. Switch to any: the classes mix. Drop steps to 5: coarser but still digits, the speed trade from exhibit D. Then the sentence that closes the gap: scale this up, a bigger network, images instead of digits, a text embedding in the class slot, and you have Stable Diffusion. The next slides are exactly those three scalings.

---

## Latent diffusion: why it got cheap

A 512×512 RGB image is 786,432 numbers; denoising that a thousand times per picture is unaffordable.

```text
   image (512×512×3)  ──encoder──▶  latent (64×64×4)  ──diffuse here──▶  ──decoder──▶  image
   a learned, lossy compression: 48× fewer numbers to denoise
```

- a **variational autoencoder** learns the compression once; diffusion runs in the small space
- decode once at the end; the decoder restores the fine texture the latent left out
- this is **Stable Diffusion** (Rombach et al., 2022), and it is why the method left the lab

Note: Scaling one: the size of the point. Our digits were 400 numbers; a photograph is a million. Instead of diffusing pixels, first learn a compression: an encoder squeezes the image to a 64 by 64 grid with four channels, a lossy learned "texture" of the image, and a decoder rebuilds pixels from it. Run the entire noising and denoising in that small space and decode once at the end. Rombach and colleagues' 2022 paper is what Stable Diffusion is; the release put text-to-image on a gaming GPU and started everything since.

---

## Text in the class slot

Exhibit G's digit button was a **class embedding**. A prompt is the same slot, filled by text.

- **CLIP** (2021): a joint embedding trained so an image and its caption land near each other; words become vectors the network reads
- the denoiser attends to those vectors at every step (**cross-attention**): "which way is the data, *given this caption*?"
- **classifier-free guidance** (Ho & Salimans, 2022) is exhibit G's `guide`: train with and without the caption, exaggerate the difference by `w`

<img src="../../media/generative/cfg-row.jpg" class="media-shot" style="max-height: 170px;" alt="the same prompt and seed at guidance scales 2.5, 7.5, 12.5, 20 and 30: a couple in a wood-paneled room, growing more saturated and stylized to the right">
<small class="credit">MrAlanKoh · CC BY-SA 4.0 · via Wikimedia Commons (one row of the original grid)</small>

Note: Scaling two: what fills the conditioning slot. The class embedding you clicked in exhibit G becomes a text embedding: CLIP, trained on hundreds of millions of image-caption pairs so that matching pairs embed close together, turns the prompt into vectors, and the network consults them at every layer through cross-attention. Guidance is unchanged from the toy: the pull with the caption minus the pull without, amplified by w. Walk the strip: the same seed and prompt at rising guidance, faithful to saturated, the same arc as the digits. Anything you can embed can steer the walk, which the control slide exploits.

---

## The network is whatever scales

- ours: an MLP, a million weights, fifteen minutes; theirs: a **U-Net** (2020–22), then a **diffusion transformer** (DiT, Peebles & Xie 2023) with billions, on image patches
- the recipe (noise, learn to undo, sample) did not change from exhibit G to the frontier; the network and the data got bigger
- gallery next: what the recipe draws at that scale

Note: Scaling three: the network. Say it as continuity: nothing about the mechanism changed between the million-weight MLP in your browser and the largest image models; the denoiser became a U-Net, then a transformer over image patches, trained on billions of captioned images. Quality followed scale. Do not detail either architecture.

---

## Where it came from: the papers (2015–2020)

| Year | Paper | What it added |
| ---- | ----- | ------------- |
| 2015 | Sohl-Dickstein, Weiss, Maheswaranathan & Ganguli, *Deep Unsupervised Learning using Nonequilibrium Thermodynamics* | **diffusion probabilistic models**: destroy, learn to undo |
| 2019 | Song & Ermon, *Generative Modeling by Estimating Gradients of the Data Distribution* | the **score** (vector field) view |
| 2020 | Ho, Jain & Abbeel, *Denoising Diffusion Probabilistic Models* | **DDPM**: predict the noise; it works at scale |
| 2020 | Song, Meng & Ermon, *Denoising Diffusion Implicit Models* | **DDIM**: deterministic, few-step sampling |

Note: Provenance, first half, so the names on the previous slides have papers attached. Read down the right column: the 2015 idea, borrowed from thermodynamics; the 2019 vector-field view, which is what exhibit D's arrows draw; the 2020 recipe that made it practical, predict the noise; and the 2020 fast sampler, which is the steps slider. Every one is linked in Chapter 1 with a confirmed identifier.

---

## Where it came from: the papers (2021–2023)

| Year | Paper | What it added |
| ---- | ----- | ------------- |
| 2021 | Dhariwal & Nichol, *Diffusion Models Beat GANs on Image Synthesis* | guidance; quality past GANs |
| 2021 | Radford et al., *Learning Transferable Visual Models from Natural Language Supervision* | **CLIP**: text and images, one space |
| 2022 | Ho & Salimans, *Classifier-Free Diffusion Guidance* | the `guide` knob |
| 2022 | Rombach et al., *High-Resolution Image Synthesis with Latent Diffusion Models* | **Stable Diffusion**: diffuse in a latent |
| 2022 | Ramesh et al. (DALL·E 2); Saharia et al. (Imagen) | text-to-image at scale, two routes |
| 2023 | Peebles & Xie, *Scalable Diffusion Models with Transformers* | **DiT**: the network is whatever scales |

Note: Second half. Guidance in 2021 and its classifier-free form in 2022, the guide slider; CLIP as the shared space of the "two encoders" slide; latent diffusion as the reason it fits on a gaming GPU; the two 2022 text-to-image systems, one diffusing in CLIP's space and one conditioning on a language model; and the transformer denoiser. The two on-ramps for a graduate student are the 2020 DDPM paper and the 2022 latent diffusion paper; both are in Chapter 1.

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

- a depth buffer (S06) and normals (S07) are exactly what **our pipeline produces**
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
- this is where learned images meet learned scenes, the next topic's subject

Note: The slide that pays the chapter's promise about generative 3D. No 3D training data is needed: the image model already knows what a "ceramic teapot" looks like from any angle, so optimize a 3D representation until its renders satisfy the image model from every random viewpoint. The renderer has to be differentiable so the image model's push can flow back into the scene, which NeRF and splats both are. That is the same machinery Part 3 uses to learn a scene from photographs, aimed at a prompt instead of at photos. Quality lags dedicated 3D methods and takes hours per asset, and it is improving fast.

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
- the two are merging: generated textures and assets in engines; learned rendering of authored scenes; **world models** that predict the next frame from an action

Note: The honest slide, and the one that justifies the rest of the quarter. A diffusion model has no scene, so it has nothing that enforces that the cup on frame one is the cup on frame sixty, that objects fall, that there are five fingers, that a sign spells a word. It has no camera you can move an inch. Graphics has exactly those things and lacks the model's taste for appearance. The field is merging them from both sides: engines that ship generated textures and assets, differentiable renderers that let images train scenes, and world models that generate the next frame in response to a controller input. Transition to Part 3: the other half of the era, one scene learned from its own photographs.
