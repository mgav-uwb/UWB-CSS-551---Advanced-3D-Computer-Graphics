<!--
  CSS 551 · L04 discussion and wrap (~28 min). Five peer-instruction questions:
  project, vote, argue in pairs for two minutes, vote again, then work it.
  Answers ONLY in the notes. Every number computed by node against lib/core/xform.js
  (and Math.fround for question 4); distractors are the pitfalls the topic names.
-->

### Discussion

<small>(~28 min)</small>


---

## Question 1: the aim

A drone at `A = (2, 0, 1)` fires at a target at `R = (-1, 0, 5)`. What is the unit aim direction?

- **A.** `(-0.6, 0, 0.8)`
- **B.** `(0.6, 0, -0.8)`
- **C.** `(-3, 0, 4)`
- **D.** `(-0.43, 0, 0.57)`


---

## Question 2: the signed distance

A plane passes through `Q = (0, 2, 0)` with normal `m = (0, 3, 4)`. What is the signed distance of `P = (1, 7, 5)` from it?

- **A.** `35`
- **B.** `7`
- **C.** `8.2`
- **D.** `-7`


---

## Question 3: inside the triangle?

Triangle `P0 = (0,0,0)`, `P1 = (4,0,0)`, `P2 = (0,0,-4)`. The point `X = (3, 0, -3)` lies in its plane. Which is true?

- **A.** Inside: its barycentric weights sum to 1
- **B.** Outside, beyond the edge opposite `P0`
- **C.** On the edge from `P1` to `P2`
- **D.** Outside, beyond the edge opposite `P1`


---

## Question 4: a very small angle

Two unit normals are `0.0002` radians apart. In float32, what does `acos(dot(n1, n2))` return?

- **A.** `0.0002`
- **B.** `0`
- **C.** `NaN`
- **D.** `0.00024`


---

## Question 5: a reflection

A ray travels along **d = (0, 0, −1)** and hits a surface whose **unit** normal is **n = (0, 0.6, 0.8)**. Which way does it bounce?

- **A.** (0, 0.48, −0.36)
- **B.** (0, 0.96, 0.28)
- **C.** (0, −0.96, −2.28)
- **D.** (0, 0.6, 0.8)


---

## Wrap

A vector is a displacement; the dot measures alignment and casts shadows; the cross makes perpendiculars, areas and frames. Lines, planes, and triangles are points plus directions, and every query about them is a dot, a cross, or a sign.

- **Read:** [Vectors](../../textbook/vectors.html), sections 1 to 8
- **Due:** HW1, Wednesday October 14, 11:59 PM
- **Thursday:** Quiz 1 in the first 20 minutes (Lecture 3, tonight's lecture, HW1), then the lecture and the HW2 walk-through

