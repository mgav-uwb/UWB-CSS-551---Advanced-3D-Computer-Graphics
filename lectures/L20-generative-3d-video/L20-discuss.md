<!--
  CSS 551 · L20 wrap (2 min), the last meeting.
  Re-sequenced 2026-10-25 (was L19): HW8 due Friday December 11; Quiz 8 on Canvas; the final exam.
  CUT 2026-10-08: the six multiple-choice discussion questions (the attention bill, one pixel to one
  splat, relighting, networks in the frame loop, foveation, accumulating frames); the freed 18
  minutes are questions and buffer.
-->


## Wrap

- Networks inside the renderer and inside the headset reuse the pipeline's buffers: jitter, motion vectors, depth, the head pose
- Generative 3D and video are **consistency problems**: between views of one object, between frames of one clip; the pipeline supplies consistency for free, the generator has to learn it
- The field is merging from both sides: generators that use your cameras and renderers, and renderers with networks in the loop; **every row stands on the pipeline**

- **Read**: <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 8 and 10; <a href="../../textbook/learned-scenes.html">Learned Scenes</a>, Section 9
- **Due**: HW8, tomorrow at 11:59 PM. **Quiz 8**, on Canvas: tonight 8 PM to Sunday 11:59 PM
- **Final exam**: Thursday December 17, 5:45 PM, UW2-305, cumulative

