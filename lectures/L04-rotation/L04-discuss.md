<!--
  CSS 551 · L04 discussion and wrap (~26 min). Four peer-instruction questions:
  project, vote, argue in pairs for two minutes, vote again, then work it.
  Answers ONLY in the notes. Every number computed by node against lib/core/xform.js
  (quatFromAxisAngle for questions 3 and 4); distractors are the pitfalls the topics name.
  Resequenced 2026-10-05: questions 1 and 2 are the old L04 (vectors) questions 2 and 3,
  questions 3 and 4 the old L05 (rotation) questions 1 and 2. The old L04 questions on
  the aim (now L03 question 1), the float32 angle and the reflection are in
  ../archive/L03-L11-pre-resequence-2026-10-05/ (the old L04 discuss file).
-->

### Discussion

<small>(~26 min)</small>


---

## Question 1: the signed distance

A plane passes through `Q = (0, 2, 0)` with normal `m = (0, 3, 4)`. What is the signed distance of `P = (1, 7, 5)` from it?

- **A.** `35`
- **B.** `7`
- **C.** `8.2`
- **D.** `-7`


---

## Question 2: inside the triangle?

Triangle `P0 = (0,0,0)`, `P1 = (4,0,0)`, `P2 = (0,0,-4)`. The point `X = (3, 0, -3)` lies in its plane. Which is true?

- **A.** Inside: its barycentric weights sum to 1
- **B.** Outside, beyond the edge opposite `P0`
- **C.** On the edge from `P1` to `P2`
- **D.** Outside, beyond the edge opposite `P1`


---

## Question 3: the quaternion

Which quaternion `(x, y, z, w)` rotates by 90° about the x axis?

- **A.** `(1, 0, 0, 0)`
- **B.** `(0.707, 0, 0, 0.707)`
- **C.** `(0.707, 0.707, 0, 0)`
- **D.** `(0, 0, 0, 1)`


---

## Question 4: the long way round

A hand-written slerp, with no sign check, blends from the identity `(0, 0, 0, 1)` to `q2 = (0, -0.966, 0, -0.259)`. How far does the object turn over the blend?

- **A.** 150°
- **B.** 210°
- **C.** 105°
- **D.** 75°


---

## Wrap

Lines, planes and triangles are points plus directions, and every query about them is a dot, a cross or a sign. A rotation is where the axes land; Rodrigues spins the across-axis part, and a quaternion folds axis and angle through the half angle so that rotations compose by multiplication and blend by slerp.

- **Read:** [Vectors](../../textbook/vectors.html), Sections 4 to 8 · [Rotation](../../textbook/rotation.html), Sections 1 to 8
- **Due:** HW1, Wednesday October 14, 11:59 PM
- **Thursday:** Quiz 1 in the first 20 minutes (Lecture 3, tonight's lecture, HW1), then the lecture and the HW2 walk-through

