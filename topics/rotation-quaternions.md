<!--
  CSS 551 · TOPIC DECK — Rotation: axis-angle, quaternions, gimbal lock (~50 min).
  A topic is a reusable stretch of slides that a session page mounts as one
  <section data-markdown="../../topics/rotation-quaternions.md"> among others; it carries no
  session logistics (no title, Thursday, MP, wrap) and no "Part N" numbering.
  Sessions compose topics in their index.html; see sessions/README.md.

  TEACHES: a rotation is where the axes land (columns); the 2D rotation lifted to R_y; Rodrigues from the projection split and a cross, worked to the demo's numbers; quaternions (half angle, the sandwich verified on one point, the product as composition, slerp, what Unity stores); Euler angles and gimbal lock, and why quaternions dodge it.
  NEEDS:   the vectors topic (projection split, the cross, "two vectors, a whole frame"); mount it after that topic.
  DEMOS:   data-demo="axis-angle" data-controls="angle" (under the session page's 200px crop). Fallback hand-verified: axis (0,1,0), 30 deg: R columns (0.866,0,-0.5) / (0,1,0) / (0.5,0,0.866); q = (0, 0.259, 0, 0.966).
  SOURCE:  derived 2026-09-18 from the former sessions/S03-rotation-quaternions/L03-rotation-quaternions.md (38 slides) (Plan B merge of the vectors and rotation Tuesdays); the CDP walkthrough slides were dropped (the labs open those projects) and a few code slides trimmed. Real C# excerpts are from Kelvin Sung's CSS 451 ClassExamples.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Demo embeds live on
  demo-full or cropped slides (a short ## title + the embed div + its
  viz-fallback pre). Paths are relative to the SESSION page that mounts this
  topic (sessions/SNN/index.html).
-->

### Rotation: axis-angle, quaternions, gimbal lock

<small>(~50 min)</small>

Note: A rotation is the one transform that keeps lengths and angles but is genuinely hard to store well: three representations, matrix, axis-angle, quaternion, each answer a different question, and every engine uses all three. Build them in that order, then Euler angles and the lock as the reason storage uses quaternions. Rodrigues is the projection split plus a cross from the vectors stretch; nothing new is needed.

---
### Rotation about an axis

<small>(~20 min)</small>

---

## What a rotation must preserve

A rotation is a transform that keeps a rigid body rigid:

- **lengths** stay the same — no stretch, no squash
- **angles** stay the same — perpendicular stays perpendicular
- the **origin** stays put (it is a rotation, not a move)

So a rotation just says **where the three axes go**. Find that, and you have the whole matrix.

Note: Frame rotation by its invariants before any formula (playbook §4). A rotation is a linear map that preserves the dot product — that is the compact definition, and it forces lengths and angles to be preserved. Because it is linear and fixes the origin, it is fully determined by where it sends the three basis vectors. That single fact — "a rotation is where the axes land" — is what makes the matrix columns readable, which is the next slide's payoff.

---

## Rotating a point in 2D

Spin the point `(x, y)` counter-clockwise by `theta`. Trace where it lands:

```text
x' = x*cos(theta) - y*sin(theta)
y' = x*sin(theta) + y*cos(theta)
```

Read it as one matrix times the column vector `(x, y)`:

```text
[ x' ]   [ cos(theta)  -sin(theta) ] [ x ]
[ y' ] = [ sin(theta)   cos(theta) ] [ y ]
```

Note: The one derivation everything else lifts from. Fastest path: a point at radius r and start angle phi is (r cos phi, r sin phi); rotating adds theta, so the new point is (r cos(phi+theta), r sin(phi+theta)); expand with the angle-addition formulas and regroup in terms of x = r cos phi and y = r sin phi. The two expressions above fall straight out. Keep the column-vector convention (matrix on the LEFT, vector on the right) — that is the lib's convention and the whole course's.

---

## The columns are where the axes go

Look at the two columns of that 2D matrix:

```text
first column  = ( cos(theta),  sin(theta) )   <- where (1,0) lands
second column = ( -sin(theta), cos(theta) )   <- where (0,1) lands
```

Feed in `(1, 0)`: you get the first column. Feed in `(0, 1)`: the second.

**A rotation matrix is literally its rotated basis vectors, stacked as columns.**

Note: This is the reading that makes rotation matrices legible for the rest of the quarter. Multiplying the matrix by (1,0) selects column 0; by (0,1) selects column 1. So the columns are not abstract numbers — they are the images of the basis vectors, the new x-axis and new y-axis. When we open the demo panel in the axis-angle stretch, that is exactly what you are looking at: each column is a landed axis. This is the glass-cockpit tie-in — the matrix panel shows the axes' destinations.

---

## Lift 2D into 3D: rotate about y

Rotating about the **y axis** leaves `y` alone and spins the `x`–`z` plane. Drop the 2D block into the x–z slots:

```text
          [ cos(theta)   0   sin(theta) ]
R_y(theta) = [   0          1     0        ]
          [ -sin(theta)  0   cos(theta) ]
```

- the **middle row and column** are `(0, 1, 0)` — `y` is untouched
- the top-left / corners carry the 2D spin, now in x and z

Note: Axis rotations are the 2D matrix embedded in the plane perpendicular to the axis. For y, that plane is x-z, so the cos/sin land in the four corners and the y row/column stay the identity. Watch the sign pattern: for R_y the +sin sits top-right and -sin bottom-left — the opposite of the textbook R_z — because in a right-handed frame with y up, the x axis tips toward -z. This exact matrix is what our lib's axisAngleMatrix(0,1,0,theta) produces; we will read it off the demo panel next.

---

## Read R_y off its columns

The columns of `R_y(theta)` are where the three axes land:

```text
x-axis (1,0,0) -> ( cos(theta), 0, -sin(theta) )    (column 0)
y-axis (0,1,0) -> ( 0, 1, 0 )                        (column 1, fixed)
z-axis (0,0,1) -> ( sin(theta), 0,  cos(theta) )     (column 2)
```

Sanity check at `theta = 90`: `x`-axis `(1,0,0) -> (0, 0, -1)`. The old x now points along `-z`. **The columns told you before you multiplied anything.**

Note: The payoff of the column reading and a hand-checked special case. At 90 degrees cos=0, sin=1, so column 0 = (0,0,-1): the x axis has swung a quarter turn in the x-z plane to point down -z, exactly what a right-handed spin about y does. Verify against the lib: axisAngleMatrix(0,1,0,90) times (1,0,0) is column 0 = (0,0,-1). Students should be able to predict any axis's destination by reading a column — no multiply needed. This is the whole habit the axis-rotation stretch is trying to build.

---

### Axis-angle: any axis

<small>(~25 min)</small>

---

## The general question

We can spin about x, y, or z. But a rotation can be about **any** axis — a unit vector `n` — by any angle `theta`.

- store a rotation as **just that**: an axis `n` and an angle `theta` (four numbers)
- but how do you *apply* it — rotate an arbitrary `v` about an arbitrary `n`?

The answer reuses **exactly** last week's projection split.

Note: Axis-angle is the most human representation: "turn 40 degrees about this stick." Four numbers (three for the axis, one for the angle; the axis is unit so really three degrees of freedom). The open question is how to turn (n, theta) into the moved vector v'. We are about to derive Rodrigues' formula geometrically, and the only tools are the parallel/perpendicular split (dot) and a perpendicular partner (cross) from the vectors stretch — no new machinery.

---

## Split v into along-axis and across-axis

The part of `v` **along** `n` does not move when you spin about `n`. Only the part **across** `n` turns.

```text
v-par  = (v . n) n          the piece parallel to the axis  (frozen)
v-perp = v - v-par          the piece in the rotation plane (turns)
```

`v-par` sits on the axis; `v-perp` lies in the plane perpendicular to `n`. Spinning about `n` only swings `v-perp`.

Note: This is the projection split from earlier tonight, reused verbatim — (v.n)n is the shadow of v on the unit axis n, and v-perp is the leftover, which is perpendicular to n by construction. The geometric insight of the whole formula: a rotation about n does nothing to the along-axis component and rotates the across-axis component within its plane. So we only have to solve a 2D rotation, in the plane perpendicular to n. n must be unit for (v.n)n to be the true projection.

---

## Build the second axis of the plane with a cross

In that plane, `v-perp` is one direction. For a clean 2D spin we need a second, perpendicular to it and the **same length**:

```text
w = n x v            perpendicular to both n and v, |w| = |v-perp|
```

Now `{v-perp, w}` is a right-angle pair spanning the rotation plane — a little 2D coordinate frame to turn inside.

Note: The cross product manufactures the plane's other axis ("two vectors, a whole frame", earlier tonight). n x v is perpendicular to n (so it lies in the rotation plane) and perpendicular to v. Its length: |n x v| = |n||v|sin(angle between) = |v-perp|, because |n|=1 and |v|sin(angle) is exactly the perpendicular component's length. So w has the same length as v-perp and is 90 degrees around from it — a perfect (v-perp, w) basis to run the 2D rotation in. Note n x v = n x v-perp since n x v-par = 0.

---

## Turn inside the plane: Rodrigues

A 2D rotation of `v-perp` by `theta`, using `v-perp` and `w` as the two axes:

```text
v-perp' = cos(theta) * v-perp + sin(theta) * w
```

Add back the frozen part and substitute — the axis-angle rotation of `v`:

```text
v' = cos(theta) v + (1 - cos(theta)) (v . n) n + sin(theta) (n x v)
```

Note: This IS the axis-rotation stretch's 2D rotation (cos on the current axis, sin on the perpendicular one), applied inside the rotation plane, then the untouched v-par added back. Substitute v-perp = v - (v.n)n and w = n x v into v' = v-par + v-perp': v' = (v.n)n + cos(theta)(v - (v.n)n) + sin(theta)(n x v), and regrouping the (v.n)n terms gives the boxed line. That is Rodrigues' rotation formula. Every term is a dot, a cross, or a scale — nothing past the dot and the cross. Build a rotation matrix by applying it to each of e_x, e_y, e_z; its columns are the results.

---

## Worked: build R_y(30) from Rodrigues

Axis `n = (0, 1, 0)`, angle `theta = 30` (`cos30 = 0.866`, `sin30 = 0.5`). Apply Rodrigues to each basis vector — the results are the columns:

```text
e_x=(1,0,0): v.n=0, n x e_x=(0,0,-1) -> 0.866(1,0,0)+0.5(0,0,-1) = (0.866, 0, -0.5)
e_y=(0,1,0): v.n=1, n x e_y=(0,0,0)  -> (0,1,0) unchanged           = (0, 1, 0)
e_z=(0,0,1): v.n=0, n x e_z=(1,0,0)  -> 0.866(0,0,1)+0.5(1,0,0)     = (0.5, 0, 0.866)
```

These three columns **are** the `R_y(30)` matrix — and the demo's `R` panel, digit-for-digit.

Note: Hand-verified, and deliberately the demo's default state (axis (0,1,0), angle 30) so the panel reads these exact numbers (playbook §3 cross-consistency). Recompute e_z: n x e_z = (0,1,0) x (0,0,1) = (1*1-0*0, 0*0-0*1, 0*0-1*0) = (1,0,0); 0.866(0,0,1) + 0.5(1,0,0) = (0.5, 0, 0.866). Column 0 = (0.866,0,-0.5) matches the axis-rotation stretch's R_y column reading (cos,0,-sin at 30 deg). Rodrigues and the axis-matrix are the same object, reached two ways.

---

## Axis-angle, live

One **model** `{axX, axY, axZ, angle}` drives the spun cube and the `R`/`q` panel; with the embed's **angle** slider the axis is fixed at `(0, 1, 0)`, pure `R_y`.

<div class="cockpit" data-demo="axis-angle" data-controls="angle"><pre class="viz-fallback">  model {axX,axY,axZ, angle} -> spun cube + R/q panel, one model
  -- default: axis (0,1,0), angle 30 deg ------------------
     q [x,y,z,w] = (0, sin15, 0, cos15) = (0, 0.259, 0, 0.966)
     R = axisAngleMatrix(0,1,0,30):
        [ 0.866   0     0.5  ]
        [ 0       1     0    ]
        [-0.500   0     0.866]</pre></div>

Note: The live demo (axis-angle, embed control "angle"; axis stays at its default (0,1,0), so it opens on a pure R_y(30)). The fallback is hand-verified and matches the Part-2 worked slide and the Part-3 quaternion slide digit-for-digit: R columns (0.866,0,-0.5) / (0,1,0) / (0.5,0,0.866), and q = (0, 0.259, 0, 0.966). Drag angle from 30 and watch both R and q update together — R's column 0 sweeps (cos,0,-sin) while q's y-component is sin(angle/2). The full four-slider sandbox with the trace-path toggle is on the hub.

---

### Quaternions

<small>(~30 min)</small>

---

## Why not just store the matrix?

Nine numbers, six hidden constraints — where **four** would do. Three problems:

- **drift** — composing matrices breaks orthonormality; shapes shear
- **interpolation** — averaging two rotation matrices is not a rotation
- **redundant** — nine numbers for three degrees of freedom

Note: Motivate quaternions by the matrix's failure modes, not by fiat. Nine floats, but a rotation has only three degrees of freedom, so six constraints must hold; floating-point composition erodes them and the object visibly shears after enough frames (re-orthonormalizing is a chore). And you cannot blend matrices: the componentwise average of two rotation matrices is not orthonormal, so smooth camera/animation blends are impossible. Axis-angle interpolates better but composes awkwardly. Quaternions are four numbers, one constraint (unit length), compose by multiplication, and interpolate cleanly — the reason every engine stores them.

---

## A quaternion for a rotation

Take the axis-angle `(n, theta)` and fold it into four numbers using the **half angle**:

```text
q = ( sin(theta/2) * n ,  cos(theta/2) )
  = ( x, y, z, w )        <- three "vector" parts + one "scalar" part w
```

- the vector part `(x, y, z)` points along the axis, scaled by `sin(theta/2)`
- the scalar part `w = cos(theta/2)`
- a rotation quaternion is always **unit length**: `x*x + y*y + z*z + w*w = 1`

Note: The half-angle is the one surprise; it falls out of the q p q-inv sandwich applying the rotation twice over (theta/2 on each side composes to theta). Component order here is (x,y,z,w) — three.js and Unity's storage order, and our quatFromAxisAngle's. Unit length is the single constraint (versus the matrix's six), and it is cheap to restore: divide by the norm. Note x*x+y*y+z*z = sin^2(theta/2) and w*w = cos^2(theta/2), summing to 1 for free.

---

## Worked: the quaternion for R_y(30)

Axis `n = (0, 1, 0)`, angle `theta = 30`, so the half angle is `15`:

```text
sin(15) = 0.259     cos(15) = 0.966
q = ( 0.259*(0,1,0), 0.966 ) = ( 0, 0.259, 0, 0.966 )
```

Only the `y` component is non-zero (the axis is `y`), and `w = cos15 = 0.966`. This is the demo panel's `q` row, exactly.

Note: Hand-verified against the demo, same default as the first two stretches. sin(15 deg) = 0.2588, cos(15 deg) = 0.9659; the vector part is sin15 times (0,1,0) = (0, 0.259, 0) and w = 0.966. Check unit length: 0.259^2 + 0.966^2 = 0.067 + 0.933 = 1.000. This is quatFromAxisAngle(0,1,0,30) and it is what the cockpit's q [x,y,z,w] row displays. Small angle -> w near 1 and vector part near 0 (identity is (0,0,0,1)).

---

## Applying a quaternion to a point

To rotate a point `p`, quaternions use a **sandwich**: `p' = q p q-inv`. Expanded into pure vector operations (with `q_v = (x,y,z)` the vector part, `w` the scalar):

```text
p' = p + 2w (q_v x p) + 2 q_v x (q_v x p)
```

Two cross products and some scaling — no trig at apply time. `q-inv` just negates the vector part: `(-x, -y, -z, w)`.

Note: The sandwich q p q-inv is the actual rotation operator; p is treated as a quaternion (p, 0). The expanded vector identity above avoids constructing quaternions at apply time — just two crosses and a couple of scales, which is why it is fast. q-inv for a UNIT quaternion is the conjugate (negate the vector part), because inverting a rotation means the same axis by -theta, i.e. sin flips sign on the vector part while cos(=w) stays. We verify the identity numerically next.

---

## Verify the identity on one point

Rotate `p = (1, 0, 0)` by `90` about `y`: `q = (0, 0.707, 0, 0.707)` (`sin45 = cos45 = 0.707`), so `q_v = (0, 0.707, 0)`, `w = 0.707`.

```text
q_v x p         = (0,0.707,0) x (1,0,0) = (0, 0, -0.707)
2w (q_v x p)    = 2(0.707)(0,0,-0.707)  = (0, 0, -1.0)
q_v x (q_v x p) = (0,0.707,0) x (0,0,-0.707) = (-0.5, 0, 0)
2 q_v x (q_v x p)                            = (-1.0, 0, 0)
p' = (1,0,0) + (0,0,-1.0) + (-1.0,0,0)  =  (0, 0, -1)
```

`(1,0,0) -> (0,0,-1)` — the same answer `R_y(90)` gave in the axis-rotation stretch. **The quaternion and the matrix agree.**

Note: Digit-checked by hand. First cross: (0,0.707,0) x (1,0,0) = (0.707*0 - 0*0, 0*1 - 0*0, 0*0 - 0.707*1) = (0,0,-0.707); times 2w = 1.414 gives (0,0,-1.0). Second cross: (0,0.707,0) x (0,0,-0.707) = (0.707*(-0.707) - 0, 0 - 0, 0 - 0) = (-0.5,0,0); times 2 = (-1,0,0). Sum with p: (1-1, 0, -1) = (0,0,-1). This is exactly R_y(90) applied to (1,0,0) from the axis-rotation stretch — the two representations rotate the point to the same place, which is the point of showing both.

---

## Composing rotations = multiplying quaternions

Do rotation `q1`, then `q2`? **Multiply** the quaternions:

```csharp [1-6]
Vector4 QMultiplication(Vector4 q1, Vector4 q2) {
    Vector4 r;
    r.x =  q1.x*q2.w + q1.y*q2.z - q1.z*q2.y + q1.w*q2.x;
    r.y = -q1.x*q2.z + q1.y*q2.w + q1.z*q2.x + q1.w*q2.y;
    r.z =  q1.x*q2.y - q1.y*q2.x + q1.z*q2.w + q1.w*q2.z;
    r.w = -q1.x*q2.x - q1.y*q2.y - q1.z*q2.z + q1.w*q2.w;
}
```

<small>EX_8_1_MyScript.cs. Like matrix multiply, the product is **not commutative** — order is the rotation order.</small>

Note: Real excerpt. Quaternion multiply is the composition operator: q2 * q1 means "apply q1, then q2" (same right-to-left reading as matrices on column vectors). It is 16 multiplies and 12 adds — cheaper than a 3x3 matrix product (27 mult) and it stays a rotation with only a length renormalize, no orthonormalization. Non-commutative, exactly like rotations themselves: pitch-then-yaw is not yaw-then-pitch. This is why chaining thousands of rotations per frame is safe in quaternion form.

---

## Why interpolation just works

To blend from orientation `q1` to `q2` — say a camera easing between two angles — **slerp** walks the short arc on the unit sphere:

```text
slerp(q1, q2, t)  =  the unit quaternion t of the way from q1 to q2
                     (constant angular speed, always a valid rotation)
```

- every step is still **unit length** -> still a real rotation (no shearing)
- it takes the **shortest** turn between the two orientations

Note: Slerp = spherical linear interpolation. Unit quaternions live on the surface of the 4D unit sphere; a rotation blend is a walk along that surface, and slerp traces the great-circle arc at constant angular speed. Contrast the matrix: a componentwise average leaves the sphere (not unit, not orthonormal) and the object shears mid-blend. Sung's OurOwnExample composes many small AngleAxis quaternions to walk from one orientation to another — the same idea, discretized. One slide; the takeaway is "blending orientations is a sphere walk, and only quaternions stay on the sphere."

---

## What Unity's Quaternion stores

`UnityEngine.Quaternion` is four floats `(x, y, z, w)` — the same `q` we built:

- `transform.rotation` is a **quaternion** under the hood, always
- build with `Quaternion.AngleAxis(angle, axis)`; compose with `*`; blend with `Slerp`

You *read* Euler angles in the Inspector, but the engine *stores* a quaternion.

Note: Tie the math to the tool students actually touch. Every transform's rotation is a quaternion internally — the Inspector's three Euler fields are a human-readable view computed on demand, not the storage. AngleAxis is exactly our (sin(theta/2) axis, cos(theta/2)); the * operator is QMultiplication; Slerp is the arc walk. The one honest caveat: the Inspector shows Euler, which is why beginners think rotations are three angles — the Euler stretch shows why that view is the leaky one.

---

### Euler angles and gimbal lock

<small>(~20 min)</small>

---

## Euler angles: three turns in a row

The human way to say an orientation: three rotations about three axes, in a fixed order.

```text
orientation = rotate about one axis, then a second, then a third
```

- Unity's `Quaternion.Euler(x, y, z)` applies them in the order **Z, then X, then Y** (Sung's `3.1.GimbalLock` project sets one Euler component at a time and rebuilds with it; you will run it in a studio)
- three readable numbers — "pitch 20, yaw 45, roll 0"
- the order is a **convention**; different engines pick different ones

Note: Euler angles are three sequential axis rotations (the axis-rotation stretch matrices) composed in a chosen order. Unity's Quaternion.Euler(x,y,z) documents its order as Z first, then X, then Y (verified in this session's project code, RotationDemoControl.cs, which sets one Euler component at a time and rebuilds with Quaternion.Euler). The order matters because rotations do not commute, and every engine/DCC tool picks its own (Z-X-Y, X-Y-Z, ...) — a frequent source of "why is my imported model rotated wrong" bugs. Readable, but as we will see, structurally fragile.

---

## The lock: two axes collapse

In a Z-X-Y order, the **middle** axis is X. Pitch it to `90` degrees and the first and third axes line up:

```text
X = 90  ->  the Z axis has been tipped onto the Y axis
        ->  the Z slider and the Y slider now do the SAME thing
        ->  one degree of freedom is gone (three knobs, two effects)
```

You can no longer turn in one direction at all until you back `X` off `90`. That dead direction is **gimbal lock**.

Note: The concrete lock, tied to the demo's exact order. With Z applied first (inner) and Y last (outer), the middle X rotation carries the inner Z axis; at X=90 the tipped Z axis coincides with the outer Y axis, so rotating Z and rotating Y produce the identical motion — the two gimbals are parallel and one rotational freedom vanishes. In the project: set the X slider to 90, then drag Y and Z and watch them do the same spin. Generically (any order) the lock is at the middle angle = +/-90, where the outer and inner axes align; the locked value and axis depend on the convention, so "middle axis at 90" is the honest general statement.

---

## Why quaternions dodge it

Gimbal lock is a disease of the **representation**, not of rotation itself:

- three sequential angles have singular configs — the `90`-degree collapse
- a **quaternion** names axis and angle **directly** — no gimbals to align
- engines **store** quaternions, only **show** Euler for editing

Note: Close the loop from the quaternion stretch. There is nothing wrong with the orientation at pitch 90 — the object is fine; it is the (yaw, pitch, roll) coordinate chart that goes singular there, the way longitude is undefined at the poles. A quaternion stores one axis and one angle with no sequence of nested frames, so there is no configuration where two of them align. That is the concrete engineering reason engines keep rotation as a quaternion internally and expose Euler only as an editing convenience. This is the "why quaternions win" payoff the whole night has been building to.

---

## Rotation, three ways

- **Matrix** — columns are the rotated axes; nine numbers, six constraints, drifts
- **Axis-angle (Rodrigues)** — spin the across-axis part; a dot, a cross, a scale
- **Quaternion** — `(sin(theta/2) n, cos(theta/2))`; compose by `*`, blend by slerp, no lock
- **Euler** — three readable angles, but a middle-axis `90` **gimbal-locks**

Engines store the quaternion; they show you Euler.

Note: The synthesis slide (a real recap, playbook §3 exception). Four representations of one operation, each with its niche: the matrix for applying to many points, axis-angle for a human "turn about this stick", the quaternion for storage/compose/blend, Euler for the Inspector. The through-line from the vectors stretch: Rodrigues is the projection split plus a cross, and the quaternion is that axis-angle folded through the half angle. Next week these rotations become the linear part of an affine map.
