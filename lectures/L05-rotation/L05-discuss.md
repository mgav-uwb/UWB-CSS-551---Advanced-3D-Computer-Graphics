<!--
  CSS 551 · L05 discussion, HW2 walk-through and wrap (~20 min), the end of class.
  Two peer-instruction questions; answers ONLY in the notes; numbers computed by node
  against lib/core/xform.js (quatFromAxisAngle). Distractors are the topic's pitfalls.
-->

### Discussion

<small>(~20 min)</small>


---

## Question 1: the quaternion

Which quaternion `(x, y, z, w)` rotates by 90° about the x axis?

- **A.** `(1, 0, 0, 0)`
- **B.** `(0.707, 0, 0, 0.707)`
- **C.** `(0.707, 0.707, 0, 0)`
- **D.** `(0, 0, 0, 1)`


---

## Question 2: the long way round

A hand-written slerp, with no sign check, blends from the identity `(0, 0, 0, 1)` to `q2 = (0, -0.966, 0, -0.259)`. How far does the object turn over the blend?

- **A.** 150°
- **B.** 210°
- **C.** 105°
- **D.** 75°


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

A rotation is where the axes land; Rodrigues spins the across-axis part; a quaternion folds axis and angle through the half angle so that rotations compose by multiplication and blend by slerp. Euler angles are for reading, not storing.

- **Read:** [Rotation](../../textbook/rotation.html), sections 1 to 8
- **Due:** HW2, Wednesday October 21, 11:59 PM

