<!--
  CSS 551 · L08 discussion and wrap (~25 min). Five peer-instruction questions; answers ONLY
  in the notes. Numbers computed by node against lib/core/xform.js (lookAtBasis, perspective,
  applyMat4, perspectiveDivide) and from textbook/figures/numbers-pipeline.json (view).
-->

### Discussion

<small>(~21 min)</small>


---

## Question 1: into the camera's frame

`eye = (5, 0, 0)`, `at = (0, 0, 0)`, `up = (0, 1, 0)`. Where is the world point `(0, 0, 2)` in view space?

- **A.** `(-2, 0, -5)`
- **B.** `(2, 0, -5)`
- **C.** `(-2, 0, 5)`
- **D.** `(-5, 0, 2)`


---

## Question 2: depth in NDC

`P = perspective(90°, 1, near 1, far 3)`. A point at view-space depth `z = -2`, halfway between near and far. What is its NDC z?

- **A.** `0`
- **B.** `0.5`
- **C.** `1`
- **D.** `-0.5`


---

## Question 3: the near plane

With near = 0.1 and far = 1000, a 24-bit depth buffer separates surfaces about 6 mm apart at 100 m. Someone sets near = 0.01 "so nothing gets clipped". What is the separation at 100 m now?

- **A.** 0.6 mm
- **B.** 6 mm
- **C.** 60 mm
- **D.** 600 mm


---

## Question 4: field of view

A game's setting is a **horizontal** field of view of 90° on a 16:9 screen. What is the vertical field of view it renders with?

- **A.** 90°
- **B.** 58.7°
- **C.** 50.6°
- **D.** 45°


---

## Question 5: behind the eye

A vertex's clip coordinates are `(0.8, -0.2, 1.5, -2)`. What should the pipeline do with it?

- **A.** Treat it as outside: `w < 0` puts it behind the eye; clip the triangle's edges against the frustum before dividing
- **B.** Draw it at NDC `(-0.4, 0.1, -0.75)`
- **C.** Draw it at NDC `(0.4, -0.1, 0.75)`
- **D.** Keep it: `|x|, |y|, |z|` are all at most `|w| = 2`, so it is inside


---

## Wrap

A camera is a frame and a lens: `V` is the inverse of the camera's pose, built from three cross products; `P` sets up the divide by depth that makes far things small, and maps the frustum to the NDC cube.

- **Read:** [Viewing](../../textbook/viewing.html)
- **Due:** HW3, Wednesday October 28, 11:59 PM
- **Thursday:** Quiz 3 in the first 20 minutes (Lecture 7, tonight's lecture, HW3), then the lecture and the HW4 walk-through

