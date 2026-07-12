<!--
  CSS 551 · Lecture 3 (Session 3) — Rotation: axis-angle, quaternions, gimbal lock.
  reveal.js: FLAT deck — every slide is a top-level "---" section (no vertical
  "--" stacks). Keeps the verify-deck harness's demo probe correct (it selects
  "section.present [data-demo]", which inside a vertical stack matches a demo on
  a not-yet-shown sibling slide, 0x0 -> fill times out). Flat = one section per
  slide = demo only matched when shown. Notes follow "Note:".

  Real C# excerpts are from Kelvin Sung's CSS 451 ClassExamples,
  Topic3-VectorMath+Rotation (Chap-8-Quaternions, 3.1.GimbalLock,
  3.3.Quaternion-OurOwnExample) — the CDP projects students walk in Parts 3-5.
  The Thursday studio rebuilds EX4-EX6 from Topic3-InClassCodingExercises.

  MATH IS PLAIN TEXT ON PURPOSE. This shell loads NO KaTeX plugin (only
  markdown/highlight/notes), so "$...$" would render literally. All formulas
  are unicode plain text or fenced ```text blocks, like S01/S02. Never two "_"
  on one markdown line (they pair into <em> and shred the line): write angles
  as "theta/2", vectors as (0, 1, 0), use words "v-par"/"v-perp" not
  subscripts, no <small> on math. Verify every slide at 1280x620.

  DEMO: axis-angle embedded ONCE in Part 2, controls "angle" (angle-only keeps
  it stage-scoped to Rodrigues; the axis stays at its PARAMS default (0,1,0)).
  ASCII viz-fallback shows the HAND-VERIFIED default state:
     axis (0,1,0), angle 30 deg
     R = axisAngleMatrix(0,1,0,30), col-major cols =
        col0 (cos30, 0, -sin30) = (0.866, 0, -0.5)
        col1 (0, 1, 0)
        col2 (sin30, 0,  cos30) = (0.5, 0, 0.866)
     q [x,y,z,w] = (0, sin15, 0, cos15) = (0, 0.259, 0, 0.966)
  The SAME axis/angle default drives every worked example in Parts 1-3 so the
  deck, the demo, and the panel agree digit-for-digit. R_y is the lib's
  right-handed convention: R_y(theta) maps (1,0,0) -> (cos,0,-sin); at 90 deg
  -> (0,0,-1). Verified against lib/core/xform.js axisAngleMatrix.

  Session plan (120 min, Tue 5:45-7:45 PM synchronous online). Sums to ~110 + buffer.
    0:00  Intro (title + tonight)                       ~2 min
    0:02  Part 1  Rotation about an axis                20 min   (2D matrix -> R_y; columns = rotated basis)
    0:22  Part 2  Axis-angle: any axis (Rodrigues)      25 min   (split par/perp; rotate perp via cross; demo)
    0:47  Part 3  Quaternions                           30 min   (half-angle; q p q-inv; product; slerp; Unity)
    1:17  Part 4  Euler angles and gimbal lock          20 min   (Euler order; the lock; Sung 3.1)
    1:37  Part 5  CDP walkthrough                        10 min   (MyQuaternion rotation-plane projection)
    1:47  Wrap                                           5 min   (EX4-EX6 Thu; MP2 due; MP3 out)
    1:52  end (+ buffer)
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 3 — Rotation: Axis-Angle, Quaternions, Gimbal Lock**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>

---

## Tonight

- A **rotation** keeps lengths and angles — its matrix columns are the **rotated basis**
- **Axis-angle** (Rodrigues): spin a vector about *any* axis using last week's split + cross
- **Quaternions** store a rotation in four numbers — the engine's real format
- **Euler angles** read nicely for humans but **gimbal-lock**; that is why quaternions win

<small>Thursday's studio builds EX4–EX6 from this math. MP2 is due this week; MP3 goes out.</small>

---

### Part 1 · Rotation about an axis

<small>(~20 min)</small>

---

## What a rotation must preserve

A rotation is a transform that keeps a rigid body rigid:

- **lengths** stay the same — no stretch, no squash
- **angles** stay the same — perpendicular stays perpendicular
- the **origin** stays put (it is a rotation, not a move)

So a rotation just says **where the three axes go**. Find that, and you have the whole matrix.

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

---

## The columns are where the axes go

Look at the two columns of that 2D matrix:

```text
first column  = ( cos(theta),  sin(theta) )   <- where (1,0) lands
second column = ( -sin(theta), cos(theta) )   <- where (0,1) lands
```

Feed in `(1, 0)`: you get the first column. Feed in `(0, 1)`: the second.

**A rotation matrix is literally its rotated basis vectors, stacked as columns.**

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

---

## Read R_y off its columns

The columns of `R_y(theta)` are where the three axes land:

```text
x-axis (1,0,0) -> ( cos(theta), 0, -sin(theta) )    (column 0)
y-axis (0,1,0) -> ( 0, 1, 0 )                        (column 1, fixed)
z-axis (0,0,1) -> ( sin(theta), 0,  cos(theta) )     (column 2)
```

Sanity check at `theta = 90`: `x`-axis `(1,0,0) -> (0, 0, -1)`. The old x now points along `-z`. **The columns told you before you multiplied anything.**

---

### Part 2 · Axis-angle: any axis

<small>(~25 min)</small>

---

## The general question

We can spin about x, y, or z. But a rotation can be about **any** axis — a unit vector `n` — by any angle `theta`.

- store a rotation as **just that**: an axis `n` and an angle `theta` (four numbers)
- but how do you *apply* it — rotate an arbitrary `v` about an arbitrary `n`?

The answer reuses **exactly** last week's projection split.

---

## Split v into along-axis and across-axis

The part of `v` **along** `n` does not move when you spin about `n`. Only the part **across** `n` turns.

```text
v-par  = (v . n) n          the piece parallel to the axis  (frozen)
v-perp = v - v-par          the piece in the rotation plane (turns)
```

`v-par` sits on the axis; `v-perp` lies in the plane perpendicular to `n`. Spinning about `n` only swings `v-perp`.

---

## Build the second axis of the plane with a cross

In that plane, `v-perp` is one direction. For a clean 2D spin we need a second, perpendicular to it and the **same length**:

```text
w = n x v            perpendicular to both n and v, |w| = |v-perp|
```

Now `{v-perp, w}` is a right-angle pair spanning the rotation plane — a little 2D coordinate frame to turn inside.

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

---

## Worked: build R_y(30) from Rodrigues

Axis `n = (0, 1, 0)`, angle `theta = 30` (`cos30 = 0.866`, `sin30 = 0.5`). Apply Rodrigues to each basis vector — the results are the columns:

```text
e_x=(1,0,0): v.n=0, n x e_x=(0,0,-1) -> 0.866(1,0,0)+0.5(0,0,-1) = (0.866, 0, -0.5)
e_y=(0,1,0): v.n=1, n x e_y=(0,0,0)  -> (0,1,0) unchanged           = (0, 1, 0)
e_z=(0,0,1): v.n=0, n x e_z=(1,0,0)  -> 0.866(0,0,1)+0.5(1,0,0)     = (0.5, 0, 0.866)
```

These three columns **are** the `R_y(30)` matrix — and the demo's `R` panel, digit-for-digit.

---

## The axis-angle sandbox

One **model** — `{axX, axY, axZ, angle}` — drives two **views**: the spun cube and the value panel.

- the gold two-sided arrow is the axis `n`; the cube spins about it
- the panel shows the quaternion `q` (Part 3) and the 4×4 matrix `R`
- with the embed's **angle** slider, the axis is fixed at `(0, 1, 0)` — pure `R_y`

---

## Axis-angle, live

<div class="cockpit" data-demo="axis-angle" data-controls="angle"><pre class="viz-fallback">  model {axX,axY,axZ, angle} -> spun cube + R/q panel, one model
  -- default: axis (0,1,0), angle 30 deg ------------------
     q [x,y,z,w] = (0, sin15, 0, cos15) = (0, 0.259, 0, 0.966)
     R = axisAngleMatrix(0,1,0,30):
        [ 0.866   0     0.5  ]
        [ 0       1     0    ]
        [-0.500   0     0.866]</pre></div>

---

### Part 3 · Quaternions

<small>(~30 min)</small>

---

## Why not just store the matrix?

Nine numbers, six hidden constraints — where **four** would do. Three problems:

- **drift** — composing matrices breaks orthonormality; shapes shear
- **interpolation** — averaging two rotation matrices is not a rotation
- **redundant** — nine numbers for three degrees of freedom

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

---

## Worked: the quaternion for R_y(30)

Axis `n = (0, 1, 0)`, angle `theta = 30`, so the half angle is `15`:

```text
sin(15) = 0.259     cos(15) = 0.966
q = ( 0.259*(0,1,0), 0.966 ) = ( 0, 0.259, 0, 0.966 )
```

Only the `y` component is non-zero (the axis is `y`), and `w = cos15 = 0.966`. This is the demo panel's `q` row, exactly.

---

## Applying a quaternion to a point

To rotate a point `p`, quaternions use a **sandwich**: `p' = q p q-inv`. Expanded into pure vector operations (with `q_v = (x,y,z)` the vector part, `w` the scalar):

```text
p' = p + 2w (q_v x p) + 2 q_v x (q_v x p)
```

Two cross products and some scaling — no trig at apply time. `q-inv` just negates the vector part: `(-x, -y, -z, w)`.

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

`(1,0,0) -> (0,0,-1)` — the same answer `R_y(90)` gave in Part 1. **The quaternion and the matrix agree.**

---

## Real code: q p q-inv

Sung's own quaternion, not the engine's — the sandwich, spelled out:

```csharp [1-8]
Vector3 QRotation(Vector4 qr, Vector3 p) {
    Vector4 pq     = new Vector4(p.x, p.y, p.z, 0);
    Vector4 qr_inv = new Vector4(-qr.x, -qr.y, -qr.z, qr.w);
                   // q-inv: same axis by -theta = negate the vector part
    pq = QMultiplication(qr, pq);      // q * p
    pq = QMultiplication(pq, qr_inv);  // (q * p) * q-inv
    return new Vector3(pq.x, pq.y, pq.z);
}
```

<small>EX_8_1_MyScript.cs — Chap-8-Quaternions. `p` becomes `(p, 0)`; sandwich it between `q` and `q-inv`.</small>

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

---

## Why interpolation just works

To blend from orientation `q1` to `q2` — say a camera easing between two angles — **slerp** walks the short arc on the unit sphere:

```text
slerp(q1, q2, t)  =  the unit quaternion t of the way from q1 to q2
                     (constant angular speed, always a valid rotation)
```

- every step is still **unit length** -> still a real rotation (no shearing)
- it takes the **shortest** turn between the two orientations

---

## Real code: stepping along an arc

Sung walks one orientation toward another in equal quaternion steps:

```csharp [1-4]
float delta = theta / (float)(kNumSteps);
Quaternion q = Quaternion.AngleAxis(delta, n);          // one small step
steps[0].transform.localRotation = q * White.localRotation;
// each next step:  steps[i] = q * steps[i-1]            // compose repeatedly
```

<small>3.3 TheWorld.cs — `n = Cross(v1, v2)` is the axis, `theta = acos(Dot(v1, v2))` the angle. Compose the same small `q` repeatedly to sweep the arc.</small>

---

## What Unity's Quaternion stores

`UnityEngine.Quaternion` is four floats `(x, y, z, w)` — the same `q` we built:

- `transform.rotation` is a **quaternion** under the hood, always
- build with `Quaternion.AngleAxis(angle, axis)`; compose with `*`; blend with `Slerp`

You *read* Euler angles in the Inspector, but the engine *stores* a quaternion.

---

### Part 4 · Euler angles and gimbal lock

<small>(~20 min)</small>

---

## Euler angles: three turns in a row

The human way to say an orientation: three rotations about three axes, in a fixed order.

```text
orientation = rotate about one axis, then a second, then a third
```

- Unity's `Quaternion.Euler(x, y, z)` applies them in the order **Z, then X, then Y**
- three readable numbers — "pitch 20, yaw 45, roll 0"
- the order is a **convention**; different engines pick different ones

---

## Real code: the gimbal-lock demo

Sung's `3.1.GimbalLock` drives three Euler sliders into one quaternion:

```csharp [1-4]
void UpdateXRotate(float v) {
    Vector3 eulerAngles = TheCylinder.localRotation.eulerAngles;
    eulerAngles.x = v;                                   // set ONE Euler axis
    TheCylinder.localRotation = Quaternion.Euler(eulerAngles);
}
```

<small>RotationDemoControl.cs — three sliders (X, Y, Z), each sets one Euler component, then `Quaternion.Euler` rebuilds the rotation. The order is Unity's Z-X-Y.</small>

---

## The lock: two axes collapse

In a Z-X-Y order, the **middle** axis is X. Pitch it to `90` degrees and the first and third axes line up:

```text
X = 90  ->  the Z axis has been tipped onto the Y axis
        ->  the Z slider and the Y slider now do the SAME thing
        ->  one degree of freedom is gone (three knobs, two effects)
```

You can no longer turn in one direction at all until you back `X` off `90`. That dead direction is **gimbal lock**.

---

## Why quaternions dodge it

Gimbal lock is a disease of the **representation**, not of rotation itself:

- three sequential angles have singular configs — the `90`-degree collapse
- a **quaternion** names axis and angle **directly** — no gimbals to align
- engines **store** quaternions, only **show** Euler for editing

---

### Part 5 · This math in Sung's CDPs

<small>(~10 min)</small>

---

## Code, Demo, Practice

**CDP** — read real code, watch it run, rebuild it Thursday. Tonight's rotation projects:

- **Chap-8-Quaternions** — `q p q-inv`, quaternion product, our own `MyQuaternion`
- **3.1.GimbalLock** — the Euler sliders and the `90`-degree collapse
- **3.3.Quaternion-OurOwnExample** — sweeping an arc by composing small quaternions

All three are in the course materials on Canvas.

---

## Walkthrough: drawing the rotation plane

`MyQuaternion.ShowRotation` visualizes a quaternion by drawing its **rotation plane** — and it does so with Part 2's projection split:

```csharp [1-6]
Vector3 na = axisPt.normalized;                          // unit axis n
Vector3 PiOnAxis = axisPt +
        Vector3.Dot((initPos - axisPt), na) * na;        // project init pt onto the axis
float s = (initPos - PiOnAxis).magnitude;                // radius of the swing
mPlaneOfRotation.PlaneNormal = na;                       // the plane is perpendicular to n
mPlaneOfRotation.Center = PiOnAxis;                      // centered where the axis pierces it
```

<small>MyQuaternion.cs — Chap-8. The rotation plane's normal is the axis; its center is `v-par` landed on the axis; its radius is `|v-perp|`.</small>

---

## Rotation, three ways

- **Matrix** — columns are the rotated axes; nine numbers, six constraints, drifts
- **Axis-angle (Rodrigues)** — spin the across-axis part; a dot, a cross, a scale
- **Quaternion** — `(sin(theta/2) n, cos(theta/2))`; compose by `*`, blend by slerp, no lock
- **Euler** — three readable angles, but a middle-axis `90` **gimbal-locks**

Engines store the quaternion; they show you Euler.

---

## The plan for Thursday

Three exercises, each projecting a point onto a shape:

- **EX4 — Shadow on a plane:** project a point onto a plane along its normal
- **EX5 — Reflection:** intersect a line with a plane, reflect across the normal
- **EX6 — Project to a cylinder:** project a point onto a cylinder's surface

The tool is the parallel/perpendicular split that built Rodrigues.

---

## Wrap

- **Thursday studio** — build **EX4–EX6**: shadow-on-plane, reflection, project-to-cylinder
- **MP2 is due this week** — the vector-math machine problem. *Details on Canvas.*
- **MP3 goes out** — the next machine problem. *Details on Canvas.*

A rotation is where the axes land. Store it as a quaternion, reason about it as an axis and an angle, and never trust three Euler angles near `90`.

