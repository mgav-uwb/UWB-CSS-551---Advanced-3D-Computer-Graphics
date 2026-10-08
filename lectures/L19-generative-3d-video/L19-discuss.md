<!--
  CSS 551 · L19 wrap (2 min).
  CUT 2026-10-08: the six multiple-choice discussion questions (the attention bill, one pixel to one
  splat, relighting, networks in the frame loop, foveation, accumulating frames); the freed 18
  minutes are questions and buffer.
-->


## Wrap

- Networks inside the renderer and inside the headset reuse the pipeline's buffers: jitter, motion vectors, depth, the head pose
- Generative 3D and video are **consistency problems**: between views of one object, between frames of one clip; the pipeline supplies consistency for free, the generator has to learn it
- The field is merging from both sides: generators that use your cameras and renderers, and renderers with networks in the loop; **every row stands on the pipeline**

- **Read**: <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 8 and 10; <a href="../../textbook/learned-scenes.html">Learned Scenes</a>, Section 9
- **Due**: HW8, Wednesday December 9, 11:59 PM
- **Thursday**: Quiz 8 in the first 20 minutes, on Lecture 18, tonight's lecture and HW8

