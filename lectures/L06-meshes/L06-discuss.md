<!--
  CSS 551 · L06 discussion (22 min: four peer-instruction questions) and the wrap.
  Answers only in the notes. Numbers computed by node:
    Q1  n = 5: (n+1)² = 36, 2n² = 50, 6n² = 150 (the meshes topic's counting slide).
    Q2  v3 − v1 = (−1.5, 0, 1.5), v4 − v1 = (0, 0.8, 1.5); cross (−1.2, 2.25, −1.2),
        length 2.818, unit (−0.426, 0.798, −0.426).
    Q3  spherical u at longitudes 350° and 10°: 0.9722 and 0.0278; the edge's
        midpoint without a seam split interpolates to 0.5.
    Q4  tile 3 about c = (0.5, 0.5): u' = 3u − 1, translation column (−1, −1).
-->

### Discussion

<small>(~22 min)</small>


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

## Question 3: across the seam

A sphere is mapped with the spherical projection, `u = θ / 2π`. Two vertices of one triangle sit at the same latitude, at longitudes **350°** and **10°**, with no seam split. What `u` does the **midpoint** of the edge between them sample?

- **A.** 0.000
- **B.** 0.500
- **C.** 0.972
- **D.** 1.000


---

## Question 4: the tiling matrix

The placement matrix `M = T(off) · T(c) · S · R · T(−c)` with `c = (0.5, 0.5)`, no offset, no rotation, **tile 3**. Its translation column (top two entries) is:

- **A.** (0, 0)
- **B.** (−1, −1)
- **C.** (−1.5, −1.5)
- **D.** (1, 1)


---

## Wrap

A mesh is a vertex array plus index triples; the cross product of two edges is the face normal, and winding picks its sign. A texture coordinate is one more vertex attribute, interpolated across each triangle and placed by a 3×3 matrix; seams and hard edges are where one position needs two vertices.

- **Read**: [Polygonal Meshes](../../textbook/meshes.html) · [Texture Mapping](../../textbook/texture-mapping.html), Sections 1 to 4 · [Animation](../../textbook/animation.html), Section 14, hair and fur
- **Due**: HW2, Wednesday October 21, 11:59 PM
- **Thursday**: **Quiz 2** in the first 20 minutes: Lecture 5 (affine transformations), tonight's lecture, HW2

