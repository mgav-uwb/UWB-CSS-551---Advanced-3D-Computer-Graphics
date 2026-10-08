<!--
  CSS 551 · L07 HW3 walk-through and wrap (~14 min); HW3 setup help follows.
  CUT 2026-10-08: the three multiple-choice discussion questions (where is the child,
  inherited shear, into the hand's frame); the freed time goes to setup help.
-->

### HW3, and the wrap

<small>(~14 min) · then setup help, both tracks</small>


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

- **Read:** [Scene Graphs](../../textbook/scene-graphs.html), Sections 1 to 14
- **Due:** HW3, Wednesday October 28, 11:59 PM

