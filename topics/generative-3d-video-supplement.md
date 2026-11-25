<!--
  CSS 551 · TOPIC DECK: Generative 3D and video, further (~65 min, 27 content slides), mounted after the lecture's
  wrap, time permitting. Moved 2026-11-24 from topics/generative-3d-video.md (L20) when the core became a method
  survey (Marcel: "PCA, eigenvalues, hilbert spaces... way over the math level of the class. can the following
  lectures use less math?"): the worked and counted slides, in the topic's order. Numbers as in that topic's
  header (lectures/L20-generative-3d-video/figures/numbers.json key "dense").
  NEEDS: topics/generative-3d-video.md.
  ACRONYMS: each acronym is spelled out at its first use in this file; each Greek letter is named at its first use.
  reveal.js: FLAT; notes follow "Note:" and stay plain text; plain unicode math or fenced ```text blocks; never two
  "_" on one markdown line outside a code fence. Paths are relative to the lecture page that mounts this topic.
-->

### Supplement: generative 3D and video, further

<small>(~65 min, time permitting) · reading: <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 8 and 10; <a href="../../textbook/learned-scenes.html">Learned Scenes</a>, Section 9</small>


---

### Generative 3D, worked


---

## Four cameras on a ring, worked

Four cameras on a ring, radius 2, elevation 20°, looking at the origin (NDC: normalized device coordinates):

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

## Attention across views, counted

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

## The line, checked, and what a match is worth

```text
   slope from the near point to X:   (0.1421 − 0.3718) / (0 − (−0.7829))  = −0.2934
   slope from X to the far point:    (−0.0960 − 0.1421) / (0.8115 − 0)    = −0.2934      one line

   along the line, NDC x moves 1.594 per unit of depth along camera 0's ray
   a 256-pixel-wide view: one pixel = 2/256 = 0.0078 NDC   →   depth error 0.0078 / 1.594 = 0.0049
```

- a match **on** the line fixes the depth: searching for the NDC x = 0 crossing recovers 1.964, the distance to X
- a match one pixel off moves the depth by 0.0049 at this 90° baseline; a narrow baseline makes the line shorter and the same pixel worth more depth


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

## One Gaussian placed, worked

Route 3 outputs, for **every pixel** of its input views, one Gaussian: a depth along the pixel's ray, a scale, a rotation, an opacity, a color. Place one:

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

### Video, worked


---

## The attention bill, counted

16 frames of 64 × 64 × 4 latents, cut into 2 × 2 patches: 1,024 tokens per frame, 16,384 tokens per clip.

```text
   one frame:         1,024²               =   1,048,576 scores per layer
   full space-time:   16,384²              = 268,435,456                       (256× one frame)
   factorized:        space within each frame   16 · 1,024²  = 16,777,216
                      time at each position     1,024 · 16²  =    262,144     total 17,039,360   (15.75× less)
   120 frames instead of 16:  full attention grows (120/16)² = 56×
```

- the spatial part of the factorized layer is just sixteen images; the temporal part is tiny


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

## Temporal attention, by hand

One token of frame `t` attends to the tokens at the **same position** in frames `t−1`, `t`, `t+1` (key length d = 2):

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

## The softmax, step by step

The same three keys and values, every intermediate number:

```text
   frame    q·k     ÷ √2       e^score     weight = e / 6.456     weight · v
   t−1      1.20    0.8485     2.336       0.362                  (0.289, 0.072)
   t        1.25    0.8839     2.420       0.375                  (0.262, 0.112)
   t+1      0.75    0.5303     1.699       0.263                  (0.026, 0.237)
                               sum 6.456                          sum (0.578, 0.422)
```

- dividing by `√d` keeps the scores' spread independent of the key length, so the softmax does not saturate as `d` grows
- a score gap of 0.35 becomes a weight ratio of only `e^0.35 = 1.42`: attention **blends**, it does not pick


---

## Judging video: FVD (Fréchet video distance)

The video version of FID, the Fréchet inception distance (Unterthiner et al. 2018, arXiv:1812.01717): embed clips with a network trained on video, fit Gaussians, compute the Fréchet distance.

- it inherits FID's blind spots: sample-size bias, and only what its embedding sees
- it is weak on **temporal** quality: Ge et al. (2024, arXiv:2404.12391) find FVD "increases only slightly with large temporal corruption"
- human studies and warp error fill the gaps


---

### World models, worked


---

## Compounding error

Write the per-frame step `d` (height change between frames; time step Δt, read "delta t") for both:

```text
   renderer:    D(k) = D(k−1) + g·Δt²                 from the state; nothing carries over
   predictor:   d(k) = 1.01 · d(k−1) + g·Δt²          from its own last two frames
   step error:  e(k) = d(k) − D(k) = 1.01 · e(k−1) + 0.01 · D(k−1)

   frame:                 10          30          60
   step error (m/frame):  0.0067      0.0153      0.0087
   height error (m):      0.035       0.274       0.696        (the sum of the step errors)
```

- every frame keeps all the old error, grown by 1 %, and adds 1 % of the current velocity: nothing ever **removes** error, since there is no state to compare against
- a bias ten times smaller (0.1 %) still leaves 0.053 m at frame 60; only a reference outside the loop resets the error


---

### Networks inside the renderer, worked


---

## Which frame has the pixel

One row: a foreground object covers `x = 100…139` in frame A and moves +8 px by frame B; the background is still.

```text
   frame A:       object at 100…139
   frame B:       object at 108…147
   middle frame:  object at 104…143          (each pixel halfway along its motion)

   background at 100…103 in the middle frame:   hidden in A, visible in B   →  copy from B only
   background at 144…147 in the middle frame:   visible in A, hidden in B   →  copy from A only
   background elsewhere:                        visible in both             →  blend A and B
```

- a 200-row object leaves two strips of 4 × 200 = 800 pixels each that only **one** frame can supply
- the renderer's **depth** says which surface is in front at each pixel; without it, the generator guesses and the edges shimmer


---

## Halton, by radical inverse

Write the frame index in base b, mirror its digits behind the point:

```text
   i     base 2    mirrored    value       base 3    mirrored    value
   1     1         0.1         0.5         1         0.1         0.3333
   2     10        0.01        0.25        2         0.2         0.6667
   3     11        0.11        0.75        10        0.01        0.1111
   4     100       0.001       0.125       11        0.11        0.4444
   5     101       0.101       0.625       12        0.21        0.7778

   jitter offsets in pixels, Halton bases 2 and 3 minus 0.5:
   frame 1: ( 0.000, −0.167)   frame 2: (−0.250, 0.167)   frame 3: ( 0.250, −0.389)   frame 4: (−0.375, −0.056)
```

- every new point lands in the **largest remaining gap**: after 4 frames the base-2 coordinate has visited each quarter of the pixel's width once
- two coprime bases keep the x and y sequences from lining up into a diagonal


---

## The history's noise, derived

Unroll the core's recurrence, history ← (1 − α)·history + α·current, with α (alpha) the new frame's weight: the frame k frames ago carries weight `α(1 − α)ᵏ`:

```text
   history = α·x₀ + α(1−α)·x₁ + α(1−α)²·x₂ + …        weights sum to α / (1 − (1−α)) = 1
   independent frames, variance v each:
   Var = v · α² · (1 + (1−α)² + (1−α)⁴ + …) = v · α² / (1 − (1−α)²) = v · α / (2 − α)

   α = 0.1:   0.1 / 1.9 = 0.0526      a simulation of 200,000 frames:  0.053
```

- the weights are geometric, so the history has no fixed window: old frames fade, they never drop out
- smaller α: less noise, longer memory, more ghosting when the reprojection is wrong


---

## Upscaling spends frames

Render 1920×1080, display 3840×2160: each rendered sample stands for **4** display pixels.

```text
   jitter moves the sample among the 4 display pixels under each rendered pixel, frame by frame
   one sample per display pixel:   at least 4 frames  =  4 × 16.7 ms = 66.7 ms at 60 frames/s
   the history at α = 0.1:         about 19 frames' worth  →  19 / 4 = 4.75 samples per display pixel
```

- a still camera converges to more detail than one frame contains; a fast pan resets the history and the image softens
- this is why upscalers read **motion vectors**: reprojection keeps the 19 frames of samples usable while the camera moves


---

## Paths per second

```text
   1920×1080 at 60 frames/s, one path per pixel:   124,416,000 paths per second
   3840×2160 at 60 frames/s:                       497,664,000
   Monte Carlo error at 1 path per pixel:          the full 1/√1; a clean image wants hundreds
```

- real-time path tracing is **one or two samples per pixel**, plus reconstruction: accumulation over frames, a learned denoiser, and upscaling from a lower resolution
- every term of the last three slides multiplies the effective sample count


---

## Neural materials

Zeltner et al. (2023, arXiv:2305.02678), from its abstract: learned hierarchical textures read by **small neural decoders** that output reflectance and importance-sampled directions, so layered material graphs that were offline-only render in real time.

- the decoder replaces a deep stack of analytic BRDF (bidirectional reflectance distribution function) layers with one small network per material
- it keeps two graphics priors: **shading frames** and a **microfacet** sampling distribution (the PBR, physically based rendering, lecture's)


---

### Relighting and headsets, further


---

## Two known lights pin it down

Photograph the same floor point again with the light **overhead**. Each explanation of the first photo predicts the second:

```text
   explanation of 0.566 under the 45° light        predicted under the overhead light
   albedo 0.800, normal up                         0.800 · cos 0°  = 0.800
   albedo 0.566, normal facing the 45° light       0.566 · cos 45° = 0.400
   albedo 0.707, normal tilted 8.13°               0.707 · cos 8.13° = 0.700

   measured: 0.800   →   solve  tan θ = (0.566/0.800 − cos 45°) / sin 45°  →  tilt θ (theta) = 0.0°, albedo 0.800
```

- two lights give two equations for two unknowns (albedo and the normal's tilt): **photometric stereo** (Woodham 1980)
- a light stage does the same with dozens of known lights, and recovers specular parameters as well


---

## Relightable captures

Store the ingredients instead of the product, per splat or per sample:

```text
   albedo (3)  +  normal (3)  +  roughness (1)  +  metallic (1)          = 8 numbers
   at render time:   the illumination lecture's shading, computed per light, per frame
```

- relighting then costs a **shading pass**, like any mesh with a physically based material
- the hard part moves to capture: estimating these from photographs taken under one unknown light


---

## How sharp a headset is

Resolution on a headset is counted in **pixels per degree** of the visual field:

```text
   2064 pixels across about 100°:        20.6 pixels per degree
   20/20 vision resolves 1 arcminute:    60 pixels per degree
   ratio:                                60 / 20.6 = 2.9 times short in each direction
   matching the eye over 100°:           6,000 pixels across, per eye
```

- a monitor at a normal desk distance gives more pixels per degree than this headset does
- this is why antialiasing and texture filtering matter more in VR: each pixel covers more of the world, and shimmer is magnified by head motion


---

## The second eye is another V

Two cameras, offset by half the IPD (interpupillary distance, about 63 mm between the eyes) to each side:

```text
   V_left, V_right = translate(±0.0315 m along the head's x) · V_head

   angle between the two eyes' lines of sight to a point:
     at 0.5 m:  7.21°      at 1 m:  3.61°      at 10 m:  0.36°
```

- beyond about 10 m the two images barely differ: stereo depth is a **near-field** cue
- the same scene, two `V`s, two `P`s (asymmetric, because each eye's lens is off-center)


---

## Stereo disparity in pixels

The angle between the two eyes' lines of sight, at 20.6 pixels per degree:

```text
   distance    angle     disparity
   0.5 m       7.21°     148.8 px
   1 m         3.61°      74.5 px
   2 m         1.80°      37.2 px
   10 m        0.36°       7.5 px
```

- disparity halves with each doubling of distance: depth precision is spent on the near field
- at 10 m a one-pixel rendering error is 13 % of the whole disparity; at 0.5 m it is under 1 %


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

- the rotation correction is exact (the reprojection slide); moving objects are extrapolated and can **wobble** at their edges
- the same frame-generation idea as the flat-screen case, with a hard deadline instead of a smoothness goal

