<!--
  CSS 551 · L06 discussion and wrap (~28 min). Six peer-instruction questions; answers ONLY
  in the notes. Numbers computed by node against lib/core/xform.js (makeTRS, axisAngleMatrix,
  matMul, applyMat4) and from textbook/figures/numbers-foundations.json (aff.obliqueScale).
-->

### Discussion

<small>(~28 min)</small>


---

## Question 1: order

`M = R_y(90°) · T(2, 0, 0)`, applied to column vectors. Where does the origin `(0, 0, 0)` land?

- **A.** `(2, 0, 0)`
- **B.** `(0, 0, -2)`
- **C.** `(0, 0, 2)`
- **D.** `(-2, 0, 0)`


---

## Question 2: the normal

A mesh is scaled by `A = diag(2, 1, 1)`. A surface with tangent `(1, 1, 0)` has unit normal `(0.707, -0.707, 0)`. After the scale, what is the unit normal?

- **A.** `(0.894, -0.447, 0)`
- **B.** `(0.447, -0.894, 0)`
- **C.** `(0.707, -0.707, 0)`
- **D.** `(-0.447, 0.894, 0)`


---

## Question 3: the pivot

Rotate 90° about y **about the pivot** `p = (2, 0, 0)`: `M = T(p) · R_y(90°) · T(-p)`. Where does the origin land?

- **A.** `(2, 0, 2)`
- **B.** `(-2, 0, -2)`
- **C.** `(0, 0, 2)`
- **D.** `(0, 0, 0)`


---

## Question 4: reading the scale back

A node's linear part is `[[1.5, 0.5, 0], [0.5, 1.5, 0], [0, 0, 1]]`. What does it actually stretch by, along its principal directions?

- **A.** `1.581, 1.581, 1`
- **B.** `2, 1, 1`
- **C.** `1.5, 1.5, 1`
- **D.** `2, 2, 1`


---

## Question 5: the determinant

A node's model matrix is `R_y(90°) · S(-1, 2, 1)`. What is `det` of its linear part, and what must the renderer do?

- **A.** `-2`: the mesh is mirrored and doubled in volume; flip the culling (front-face) mode
- **B.** `2`: doubled in volume; nothing special
- **C.** `-1`: mirrored, same volume; flip the culling mode
- **D.** `0`: the scale collapsed a dimension; skip the draw


---

## Question 6: into the object's frame

`M = T(0, 0, 4) · S(2, 2, 2)`. A ray hits the world point `(2, 0, 4)`. What are its coordinates in the object's own frame?

- **A.** `(1, 0, 0)`
- **B.** `(1, 0, -2)`
- **C.** `(2, 0, 0)`
- **D.** `(4, 0, 0)`


---

## Wrap

An affine map is a linear part plus a shift; one extra coordinate makes it one 4x4 matrix, composed by multiplying right to left and inverted by blocks. Points carry w = 1, directions w = 0, and normals ride the inverse transpose.

- **Read:** [Affine Transformations](../../textbook/affine-transforms.html)
- **Due:** HW2, Wednesday October 21, 11:59 PM
- **Thursday:** Quiz 2 in the first 20 minutes (Lecture 5, tonight's lecture, HW2), then the lecture and the HW3 walk-through

