<!--
  CSS 551 · L08 discussion and wrap (~26 min). Four peer-instruction questions; answers ONLY
  in the notes. Numbers computed by node against lib/core/xform.js (lookAtBasis, perspective,
  applyMat, perspectiveDivide) and from textbook/figures/numbers-pipeline.json (view).
  Resequenced 2026-10-05: four questions; the old questions 2 (depth in NDC) and 4 (field of
  view) are in ../archive/L03-L11-pre-resequence-2026-10-05/L08-viewing/L08-discuss.md;
  question 3 (dragging on the ground) is new, for the interaction-3d topic.
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

## Question 2: the near plane

With near = 0.1 and far = 1000, a 24-bit depth buffer separates surfaces about 6 mm apart at 100 m. Someone sets near = 0.01 "so nothing gets clipped". What is the separation at 100 m now?

- **A.** 0.6 mm
- **B.** 6 mm
- **C.** 60 mm
- **D.** 600 mm


---

## Question 3: dragging on the ground

A pick ray starts at the eye `o = (1, 3, 4)` with unit direction `d = (0, -0.6, -0.8)`. A drag constrained to the ground plane `y = 0` puts the object where?

- **A.** `(1, 0, 0)`
- **B.** `(1, 0.75, 1)`
- **C.** `(1, 1.2, 1.6)`
- **D.** `(1, 0, 4)`


---

## Question 4: behind the eye

A vertex's clip coordinates are `(0.8, -0.2, 1.5, -2)`. What should the pipeline do with it?

- **A.** Treat it as outside: `w < 0` puts it behind the eye; clip the triangle's edges against the frustum before dividing
- **B.** Draw it at NDC `(-0.4, 0.1, -0.75)`
- **C.** Draw it at NDC `(0.4, -0.1, 0.75)`
- **D.** Keep it: `|x|, |y|, |z|` are all at most `|w| = 2`, so it is inside


---

## Wrap

A camera is a frame and a lens: `V` is the inverse of the camera's pose, built from three cross products; `P` sets up the divide by depth that makes far things small, and maps the frustum to the NDC cube. Run backward, the chain turns a pixel into a ray, and a ray plus a constraint is a pick, a drag or a turn.

- **Read:** [Viewing](../../textbook/viewing.html) · [Interactive Systems](../../textbook/interaction.html), Sections 5, 6, 8 and 9
- **Due:** HW3, Wednesday October 28, 11:59 PM
- **Thursday:** Quiz 3 in the first 20 minutes (Lecture 7, tonight's lecture, HW3), then the lecture and the HW4 walk-through

