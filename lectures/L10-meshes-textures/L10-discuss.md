<!--
  CSS 551 · Lecture 10, discussion (26 min: four peer-instruction questions) and
  the wrap. Answers only in the notes. Numbers from tools/gen-lecture-figures-c.mjs
  (l10_q1 to l10_q4) and numbers-surfaces.json.
-->

### Discussion

<small>(~30 min)</small>


---

## Question 1: counting a grid

An n × n grid of quads, each split into two triangles, with **indexed** vertices. For **n = 5**, how many vertices, triangles and indices?

- **A.** 25 vertices, 50 triangles, 150 indices
- **B.** 36 vertices, 25 triangles, 75 indices
- **C.** 36 vertices, 50 triangles, 150 indices
- **D.** 36 vertices, 50 triangles, 300 indices


---

## Question 2: a face normal after the lift

The 2×2 grid spans ±1.5; the center vertex v4 is lifted to **y = 0.8**. Triangle **(1, 3, 4)** has `v1 = (0, 0, −1.5)`, `v3 = (−1.5, 0, 0)`, `v4 = (0, 0.8, 0)`. Its unit face normal, with `(v3 − v1) × (v4 − v1)`:

- **A.** (−0.25, 0.94, −0.25)
- **B.** (−0.426, 0.798, −0.426)
- **C.** (0.426, −0.798, 0.426)
- **D.** (−1.2, 2.25, −1.2)


---

## Question 3: the tiling matrix

The placement matrix `M = T(off) · T(c) · S · R · T(−c)` with `c = (0.5, 0.5)`, no offset, no rotation, **tile 3**. Its translation column (top two entries) is:

- **A.** (0, 0)
- **B.** (−1, −1)
- **C.** (−1.5, −1.5)
- **D.** (1, 1)


---

## Question 4: which mip level?

A 1024 × 1024 texture. Across one pixel, `u` changes by **0.004** in x and `v` by **0.003** in y (the other derivatives are 0). Which level does a trilinear sampler read **most** from?

- **A.** level 0
- **B.** level 2
- **C.** level 4
- **D.** level 10


---

## Wrap

- A mesh is a **vertex array** plus **index triples**; the **cross product** of two edges is the face normal, and winding picks its sign
- A texture is a **lookup**: UVs per vertex, interpolated, **placed** by a 3×3 matrix, **filtered** by bilinear and the mipmap level `log₂` of the footprint
- **Due**: HW4, Wednesday November 4, 11:59 PM
- **Thursday**: **Quiz 5**, on this week's two lectures and HW4

