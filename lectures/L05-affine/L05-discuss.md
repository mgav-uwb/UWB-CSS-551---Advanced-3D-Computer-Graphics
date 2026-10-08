<!--
  CSS 551 · L05 HW2 walk-through and wrap (~14 min); setup help follows, to the end of class.
  CUT 2026-10-08: the three multiple-choice discussion questions (order, the normal, the pivot);
  the freed time goes to setup help. The HW2 slides are the old L05 (rotation) walk-through;
  older questions are in ../archive/L03-L11-pre-resequence-2026-10-05/.
-->

### HW2, and the wrap

<small>(~14 min) · then setup help, both tracks</small>


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
- **Now:** HW2 setup help, both tracks

