<!--
  CSS 551 · L05 HW2 walk-through and wrap (~14 min); setup help follows, to the end of class.
  CUT 2026-10-08: the three multiple-choice discussion questions (order, the normal, the pivot);
  the freed time goes to setup help. The HW2 slides are the old L05 (rotation) walk-through;
  older questions are in ../archive/L03-L11-pre-resequence-2026-10-05/.
  EDITED 2026-10-18: HW2 is vector geometry only (EX1 to EX6; the rotation functions dropped),
  due Wed Oct 28 (extended from Oct 21).
-->

### HW2, and the wrap

<small>(~4 to 14 min) · then setup help, both tracks, as time allows</small>


---

## HW2: vector geometry

Out tonight, due **Wed Oct 28, 11:59 PM** (extended from Oct 21); Unity or WebGL. [HW2 page](../../homework/hw02/index.html)

| | Build | One check on the page |
| --- | --- | --- |
| EX1 | `marchStep`, `lineFrame` | one step toward `(4, 0, 3)`: `(0.8, 0, 0.6)` |
| EX2, 3 | `planeFromPoint`, `signedDistance` | `D = 0.3333`; distance `1.6667` |
| EX4 | `shadowOnPlane` | `(3.4444, -0.1111, -1.1111)` |
| EX5 | `linePlaneHit`, `reflect` | hit `(0.4286, 0.2857, 0)` |
| EX6 | `projectToCylinder` | `(0.4, 0.6, -0.3)`, inside |


---

## HW2: implement and replace

Build from dot, cross, normalize, length and components; use the engine only to check.

| Track | Off limits in the submission |
| --- | --- |
| Unity | `Vector3.Project`, `ProjectOnPlane`, `Reflect`, `Angle`, `MoveTowards`, `Lerp`; the `Plane` struct |
| WebGL | `projectOnVector`, `projectOnPlane`, `reflect`, `angleTo`; `THREE.Plane`, `THREE.Ray` |

Graded on the page's inputs and on a hidden set: a check scores only when both match.


---

## Wrap

An affine map is a linear part plus a shift; one extra coordinate makes it one 4x4 matrix, composed by multiplying right to left and inverted by blocks. Points carry w = 1, directions w = 0, and normals ride the inverse transpose.

- **Read:** [Affine Transformations](../../textbook/affine-transforms.html)
- **Due:** HW2, Wednesday October 28, 11:59 PM (extended from October 21)
- **Now:** HW2 setup help, both tracks, as time allows; the supplement after this slide is time permitting, or reading

