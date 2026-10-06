<!--
  CSS 551 · L05 discussion, HW2 walk-through and wrap (~28 min), the end of class.
  Three peer-instruction questions; answers ONLY in the notes. Numbers computed by node
  against lib/core/xform.js (makeTRS, axisAngleMatrix, matMul, applyMat). Distractors are
  the topic's pitfalls.
  Resequenced 2026-10-05: questions 1 to 3 are the old L06 (affine) questions 1 to 3; the
  HW2 slides are the old L05 (rotation) walk-through. The old L06 questions 4 to 6
  (reading the scale back, the determinant, into the object's frame) are in
  ../archive/L03-L11-pre-resequence-2026-10-05/ (the old L06 discuss file).
-->

### Discussion

<small>(~28 min, with the HW2 walk-through)</small>


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

## HW2: vectors and rotation

Out tonight, due **Wed Oct 21, 11:59 PM**; Unity or WebGL. [HW2 page](../../homework/hw02/index.html)

| | Build | One check on the page |
| --- | --- | --- |
| EX1 | `marchStep`, `lineFrame` | one step toward `(4, 0, 3)`: `(0.8, 0, 0.6)` |
| EX2, 3 | `planeFromPoint`, `signedDistance` | `D = 0.3333`; distance `1.6667` |
| EX4 | `shadowOnPlane` | `(3.4444, -0.1111, -1.1111)` |
| EX5 | `linePlaneHit`, `reflect` | hit `(0.4286, 0.2857, 0)` |
| EX6 | `projectToCylinder` | `(0.4, 0.6, -0.3)`, inside |
| rotation | `rotateAxisAngle`, `quatFromAxisAngle`, `quatRotate` | both give `(1.016, 0.6, -0.2402)` |


---

## HW2: implement and replace

Build from dot, cross, normalize, length and components; use the engine only to check.

| Track | Off limits in the submission |
| --- | --- |
| Unity | `Vector3.Project`, `ProjectOnPlane`, `Reflect`, `Angle`, `MoveTowards`, `Lerp`; the `Plane` struct; `Quaternion.AngleAxis` and quaternion × vector |
| WebGL | `projectOnVector`, `projectOnPlane`, `reflect`, `applyAxisAngle`, `angleTo`; `THREE.Plane`, `THREE.Ray`; `setFromAxisAngle`, `applyQuaternion`; xform.js `quatFromAxisAngle`, `axisAngleMatrix` |

Graded on the page's inputs and on a hidden set: a check scores only when both match.


---

## Wrap

An affine map is a linear part plus a shift; one extra coordinate makes it one 4x4 matrix, composed by multiplying right to left and inverted by blocks. Points carry w = 1, directions w = 0, and normals ride the inverse transpose.

- **Read:** [Affine Transformations](../../textbook/affine-transforms.html)
- **Due:** HW2, Wednesday October 21, 11:59 PM

