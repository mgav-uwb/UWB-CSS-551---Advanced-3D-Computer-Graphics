<!--
  CSS 551 · L06 discussion and wrap (~30 min). Four peer-instruction questions; answers ONLY
  in the notes. Numbers computed by node against lib/core/xform.js (makeTRS, axisAngleMatrix,
  matMul, applyMat4) and from textbook/figures/numbers-foundations.json (aff.obliqueScale).
-->

### Discussion

<small>(~30 min)</small>


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

## Wrap

An affine map is a linear part plus a shift; one extra coordinate makes it one 4x4 matrix, composed by multiplying right to left and inverted by blocks. Points carry w = 1, directions w = 0, and normals ride the inverse transpose.

- **Read:** [Affine Transformations](../../textbook/affine-transforms.html)
- **Due:** HW2, Wednesday October 21, 11:59 PM
- **Thursday:** lecture, the HW3 walk-through, and Quiz 3 (this week's two lectures and HW2)

