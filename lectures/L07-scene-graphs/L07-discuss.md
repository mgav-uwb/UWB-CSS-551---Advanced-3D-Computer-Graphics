<!--
  CSS 551 · L07 discussion, HW3 walk-through and wrap (~20 min), then the quiz.
  Three peer-instruction questions; answers ONLY in the notes; numbers computed by node against
  lib/core/xform.js (makeTRS, axisAngleMatrix, matMul, applyMat4) and from
  textbook/figures/numbers-foundations.json (aff) and numbers-pipeline.json (sg).
-->

### Discussion

<small>(~20 min, then Quiz 3)</small>


---

## Question 1: where is the child?

`L_base = T(0, 1, 0) · R_y(90°)` and `L_arm = T(0, 0, 2)`. Where is the arm's origin in the world?

- **A.** `(2, 1, 0)`
- **B.** `(0, 1, 2)`
- **C.** `(-2, 1, 0)`
- **D.** `(2, 0, 0)`


---

## Question 2: inherited shear

Parent `S(1, 2, 1)`, child `R_z(45°)`. What angle do the child's world x and y axes make?

- **A.** 90°
- **B.** 53.1°
- **C.** 45°
- **D.** 126.9°


---

## Question 3: into the hand's frame

At the default pose the hand's world matrix is `W_hand` (origin `(-0.78, 1.47, 0.45)`). A world point lies exactly at the hand's origin. What are its coordinates in the **arm's** frame, whose origin is `(-0.39, 0.94, 0.22)` and whose local places the hand at `T(0, 0.7, 0)`?

- **A.** `(0, 0.7, 0)`
- **B.** `(-0.39, 0.53, 0.23)`
- **C.** `(0, 0, 0)`
- **D.** `(0, -0.7, 0)`


---

## HW3: affine and scene graphs

Out tonight, due **Wed Oct 28, 11:59 PM**; Unity or WebGL. [HW3 page](../../homework/hw03/index.html)

| Part | Build | One check on the page |
| --- | --- | --- |
| 1 | `translation`, `rotationY`, `rotationZ`, `scaling`; both orders | `T(3,0,0)·S(2,1,1)`: column 3 `(3, 0, 0)`; `S·T`: `(6, 0, 0)` |
| 2 | `pivotRotateY`: `T(p) · R · T(-p)` | 90° about `(1.5, 0, 0)`: column 3 `(1.5, 0, 1.5)` |
| 3 | `rigidInverse`: `[Rᵀ, -Rᵀt]` | `T(0,0,-1)·R_y(90)` inverted, all 16 entries |
| 4 | `localMatrices`, `worldMatrices` | the arm at 30 and 40: hand origin `(-0.7793, 1.4725, 0.45)` |
| 5 | `worldToLocal` | world `(0, 1, 0)` in the hand frame: `(0.3857, -0.9404, 0)` |


---

## HW3: implement and replace

Build from matrix products, points through a matrix, sin and cos; use the engine only to check.

| Track | Off limits in the submission |
| --- | --- |
| Unity | `Matrix4x4.TRS`, `Translate`, `Rotate`, `Scale`, `.inverse`; Transform parenting; `TransformPoint`, `InverseTransformPoint` |
| WebGL | xform.js `makeTRS`, `axisAngleMatrix`, `invertTRS`; `Matrix4.invert`, `makeTranslation`, `makeRotationY`, `makeRotationZ`, `makeScale`, `compose`; Object3D parenting |

Graded on the page's inputs and on a hidden set: a check scores only when both match.


---

## Wrap

A scene graph is a tree of local transforms, and each node's world matrix is the product of the locals from the root. Local to world is that product; world to local, and the camera's view matrix, are its inverse.

- **Read:** [Scene Graphs](../../textbook/scene-graphs.html)
- **Due:** HW3, Wednesday October 28, 11:59 PM
- **Now:** Quiz 3, twenty minutes, on paper

