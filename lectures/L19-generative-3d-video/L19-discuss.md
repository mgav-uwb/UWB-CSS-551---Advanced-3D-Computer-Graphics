<!--
  CSS 551 · L19 discussion (18 min) and wrap (2 min). Six peer-instruction
  questions; answers and worked solutions only in the notes. Numbers from
  lectures/L19-generative-3d-video/figures/numbers.json (tools/gen-lecture-figures-d2.mjs).
-->

### Discussion

<small>(~18 min · six questions · vote, argue in pairs, vote again)</small>


---

## Question 1: the attention bill

A video model uses full space-time attention over 8 frames, each cut into 32×32 = 1,024 tokens. How many times more attention scores does one layer compute than the same layer on a single frame?

- **A.** 8
- **B.** 16
- **C.** 64
- **D.** 512


---

## Question 2: one pixel to one splat

A one-pass reconstruction network sees a pixel at NDC `(0.5, 0)` in a camera with `tan(fov/2) = 0.4663`, and predicts depth 2 along `−z`. Where is the splat's center in camera space?

- **A.** `(1.0, 0, −2)`
- **B.** `(0.466, 0, −2)`
- **C.** `(0.233, 0, −1)`
- **D.** `(0.5, 0, −2)`


---

## Question 3: relighting

A floor point with albedo 0.6 and normal `(0, 1, 0)` was captured under a light from the direction `(1, 1, 0)/√2`. The light is moved straight overhead. What do a Lambert-shaded mesh and a trained splat scene show at that point?

- **A.** mesh 0.600, splat 0.424
- **B.** mesh 0.600, splat 0.600
- **C.** mesh 0.424, splat 0.424
- **D.** mesh 0.424, splat 0.600


---

## Question 4: networks in the frame loop

A game displays 3840×2160 at 120 frames per second. It renders at 1920×1080 and upscales, and generates one frame between every two rendered frames. What fraction of the displayed pixels per second were shaded by the renderer?

- **A.** 50 %
- **B.** 25 %
- **C.** 12.5 %
- **D.** 6.25 %


---

## Question 5: foveation

A headset's field is 90° square. The central 30° square is shaded at full rate and the rest at a quarter of the rate. What fraction of the full-rate shading work remains?

- **A.** 33 %
- **B.** 11 %
- **C.** 25 %
- **D.** 56 %


---

## Question 6: accumulating frames

A renderer blends each new frame into its history with weight `α = 0.2`. For independent per-frame noise, the history's noise variance equals that of an average of how many frames?

- **A.** 9
- **B.** 5
- **C.** 10
- **D.** 20


---

## Wrap

- Networks inside the renderer and inside the headset reuse the pipeline's buffers: jitter, motion vectors, depth, the head pose
- Generative 3D and video are **consistency problems**: between views of one object, between frames of one clip; the pipeline supplies consistency for free, the generator has to learn it
- The field is merging from both sides: generators that use your cameras and renderers, and renderers with networks in the loop; **every row stands on the pipeline**

**Reading**: <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 8 and 10; <a href="../../textbook/learned-scenes.html">Learned Scenes</a>, Section 9. **Due**: HW8, Wednesday December 9, 11:59 PM. **Thursday**: Quiz 8 in the first 20 minutes, on Lecture 18, tonight's lecture and HW8.

