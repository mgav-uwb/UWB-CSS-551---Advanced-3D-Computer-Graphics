<!--
  CSS 551 · TOPIC DECK: Rotation: matrices, axis-angle, quaternions, Euler angles (~64 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/rotation-quaternions.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES: a rotation is where the axes land (columns); orthonormal columns, determinant +1, the
  transpose as inverse, a mirror is not a rotation; the 2D rotation lifted to R_y; Rodrigues from the
  projection split and a cross, worked on one vector and column by column; the diagonal axis at 120
  degrees; reading axis and angle back out of a matrix and its failure near 180; quaternions (half
  angle, the sandwich verified on one point, quaternion to matrix, the product as composition worked
  against matrices, slerp worked, the double cover and the long way round, drift measured, what Unity
  stores); Euler angles (three conventions give three poses, gimbal lock by the inner axis, extraction
  at the lock), and why quaternions have no lock.
  EDITED 2026-10-08: the check-yourself slide and the duplicate "Six orders, six different rotations" table
  cut (its note folded into "Euler angles: three turns in a row"); "Why" titles renamed; the two-API slide in
  Unity/WebGL code tabs; the composed-rotation slide labelled R_x(30)·R_y(30) and qx qy, as on the
  composition slide; notes no longer cite a homework slerp or shortest-arc exercise (HW2 has neither).
  NEEDS:   the vectors-review topic (projection split, the cross) and the vector-geometry topic ("two vectors, a whole frame"); mount it after them.
  RESEQUENCED 2026-10-05 (L04, after vector-geometry): history table, squad, the matrix-lerp failure and the recap slide removed (squad and the matrix lerp moved to the animation topic; both are in the animation chapter, Sections 4 and 5).
  DEMOS:   data-demo="axis-angle" data-controls="angle" (under the lecture page's 200px crop).
           Fallback: axis (0,1,0), 30 deg: R columns (0.866,0,-0.5) / (0,1,0) / (0.5,0,0.866); q = (0, 0.259, 0, 0.966).
  NUMBERS: every number is from textbook/figures/numbers-foundations.json (key rot) or recomputed by
           node against lib/core/xform.js.
  FIGURES: ../../textbook/figures/rot-*.svg (computed by tools/gen-textbook-figures-foundations.mjs).
  SOURCE:  derived 2026-09-18 from the former S03 rotation deck; expanded 2026-09-29 (Plan C, an
           80-minute Thursday lecture) with the textbook chapter's properties, log map, conversions,
           composition, slerp, double cover, drift and Euler-convention sections. Real C# excerpts are
           from Kelvin Sung's CSS 451 ClassExamples.
  DENSIFIED 2026-09-29 (Plan C; Marcel: 60+ slides per two hours): history (Euler, Rodrigues, Hamilton), small angles and angular velocity with the drift of a linear step, Hamilton's rules and the product written out, matrix to quaternion worked, nlerp, the matrix-lerp failure, squad, both APIs and the degrees pitfall, Euler orders and ambiguity, Apollo's gimbal, a check-yourself slide. Numbers from numbers-foundations.json (rot) and numbers-motion.json (anim) or node.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Paths are relative to the
  lecture page that mounts this topic (lectures/LNN-slug/index.html).
-->

### Rotation: matrices, axis-angle, quaternions, Euler angles

<small>(~64 min)</small>


---

### Rotation about an axis

<small>(~16 min)</small>

---

## What a rotation must preserve

A rotation is a transform that keeps a rigid body rigid:

- **lengths** stay the same: no stretch, no squash
- **angles** stay the same: perpendicular stays perpendicular
- the **origin** stays put (it is a rotation, not a move)
- **handedness** stays the same: a right hand stays a right hand

So a rotation just says **where the three axes go**. Find that, and you have the whole matrix.


---

## Rotating a point in 2D

<img src="../../textbook/figures/rot-2d.svg" alt="a point rotated by theta about the origin in 2D" style="height:220px">

```text
x' = x cos θ - y sin θ          [ x' ]   [ cos θ   -sin θ ] [ x ]
y' = x sin θ + y cos θ          [ y' ] = [ sin θ    cos θ ] [ y ]
```

Worked: `(2, 1)` by 30° lands at `(1.232, 1.866)`.


---

## The columns are where the axes go

<img src="../../textbook/figures/rot-columns.svg" alt="the columns of a rotation matrix are the images of the basis vectors" style="height:250px">

```text
first column  = ( cos θ,  sin θ )   <- where (1,0) lands
second column = ( -sin θ, cos θ )   <- where (0,1) lands
```

**A rotation matrix is its rotated basis vectors, stacked as columns.**


---

## Lift 2D into 3D: rotate about y

Rotating about the **y axis** leaves `y` alone and spins the `x`-`z` plane:

```text
            [  cos θ   0   sin θ ]
   R_y(θ) = [   0      1    0    ]
            [ -sin θ   0   cos θ ]
```

- the **middle row and column** are `(0, 1, 0)`: `y` is untouched
- the corners carry the 2D spin, now in z and x
- at θ = 90°: column 0 is `(0, 0, -1)`: the old x axis now points along `-z`


---

## Orthonormal columns, determinant +1

`R_y(30°)` has columns `(0.866, 0, -0.5)`, `(0, 1, 0)`, `(0.5, 0, 0.866)`:

```text
col0 . col0 = 0.866² + 0.5² = 0.75 + 0.25 = 1         every column has length 1
col0 . col2 = 0.866(0.5) + 0 + (-0.5)(0.866) = 0      every pair is perpendicular
det R       = 1                                        RᵀR = I, so R⁻¹ = Rᵀ
Rᵀ (1.016, 0.6, -0.24) = (1, 0.6, 0.3)                 the transpose undoes it
```

Nine numbers, **six constraints**, three degrees of freedom.


---

## A mirror is not a rotation

<img src="../../textbook/figures/rot-reflection.svg" alt="a mirror flips handedness; two mirrors make a rotation" style="height:220px">

```text
M_x = diag(-1, 1, 1):   orthonormal columns, det = -1
(M_x x) × (M_x y) = (-x) × y = -z,   but M_x z = +z          handedness flipped
M_y M_x = diag(-1, -1, 1) = R_z(180°),   det = +1              two mirrors: a rotation
```


---

### Axis-angle: any axis

<small>(~20 min)</small>

---

## The general question

We can spin about x, y, or z. But a rotation can be about **any** axis, a unit vector `n`, by any angle `θ`.

- store a rotation as **just that**: an axis `n` and an angle `θ` (four numbers)
- but how do you *apply* it: rotate an arbitrary `v` about an arbitrary `n`?

The answer reuses **exactly** the projection split of the vectors review.


---

## Split v into along-axis and across-axis

<img src="../../textbook/figures/rot-rodrigues.svg" alt="v split into a frozen part along n and a turning part across n" style="height:250px">

```text
v-par  = (v . n) n          the piece along the axis     (frozen)
v-perp = v - v-par          the piece in the rotation plane (turns)
w      = n × v              the plane's second axis, |w| = |v-perp|
```


---

## Turn inside the plane: Rodrigues

A 2D rotation of `v-perp` by `θ`, using `v-perp` and `w` as the two axes:

```text
v-perp' = cos θ · v-perp + sin θ · w
```

Add back the frozen part and substitute; this is the axis-angle rotation of `v`:

```text
v' = cos θ · v  +  (1 - cos θ)(v . n) n  +  sin θ · (n × v)
```


---

## Worked: Rodrigues on one vector

`n = (0, 1, 0)`, `θ = 30°`, `v = (1, 0.6, 0.3)`:

```text
v . n = 0.6          n × v = (1·0.3 - 0·0.6,  0·1 - 0·0.3,  0·0.6 - 1·1) = (0.3, 0, -1)
v' = 0.866 (1, 0.6, 0.3) + 0.134 · 0.6 (0, 1, 0) + 0.5 (0.3, 0, -1)
   = (0.866 + 0.15,  0.520 + 0.080,  0.260 - 0.5) = (1.016, 0.6, -0.240)
```

The library's `R_y(30°)` applied to the same `v` gives `(1.016, 0.6, -0.240)`.


---

## Worked: build R_y(30) column by column

Apply Rodrigues to each basis vector; the results are the columns:

```text
x=(1,0,0): v.n=0, n × x=(0,0,-1) -> 0.866(1,0,0)+0.5(0,0,-1) = (0.866, 0, -0.5)
y=(0,1,0): v.n=1, n × y=(0,0,0)  -> (0,1,0), unchanged        = (0, 1, 0)
z=(0,0,1): v.n=0, n × z=(1,0,0)  -> 0.866(0,0,1)+0.5(1,0,0)   = (0.5, 0, 0.866)
```

These three columns **are** `R_y(30°)`, and the demo's `R` panel, digit for digit.


---

## Worked: the diagonal axis at 120°

<img src="../../textbook/figures/rot-diagonal-axis.svg" alt="rotation by 120 degrees about the cube diagonal permutes the axes" style="height:230px">

`n = (1, 1, 1)/√3`, `θ = 120°`: `sin θ = 0.866`, `1 - cos θ = 1.5`. Rodrigues on the three axes gives:

```text
R = [ 0 0 1 ]      x -> y,   y -> z,   z -> x         R (1,1,1) = (1,1,1): the axis is fixed
    [ 1 0 0 ]      three of these turns are the identity
    [ 0 1 0 ]
```


---

<!-- .slide: class="demo-full" -->

## Axis-angle, live

<div class="cockpit" data-demo="axis-angle" data-controls="angle"><pre class="viz-fallback">  model {axX,axY,axZ, angle} -> spun cube + R/q panel, one model
  -- default: axis (0,1,0), angle 30 deg ------------------
     q [x,y,z,w] = (0, sin15, 0, cos15) = (0, 0.259, 0, 0.966)
     R = axisAngleMatrix(0,1,0,30):
        [ 0.866   0     0.5  ]
        [ 0       1     0    ]
        [-0.500   0     0.866]</pre></div>


---

## Reading axis and angle out of a matrix

`R = R_x(30°) R_y(30°)`, rows `(0.866, 0, 0.5)`, `(0.25, 0.866, -0.433)`, `(-0.433, 0.5, 0.75)`:

```text
trace R = 1 + 2 cos θ = 2.482          ->  cos θ = 0.741,  θ = 42.18°
R - Rᵀ gives (R21-R12, R02-R20, R10-R01) = (0.933, 0.933, 0.25)
divide by 2 sin θ = 1.343              ->  n = (0.695, 0.695, 0.186)
```

Two rotations about two axes are **one** rotation about a third.


---

## Pitfall: the axis near a half turn

For `R_y(θ)`, the vector read from `R - Rᵀ` has length `2 sin θ`:

| θ | length of the antisymmetric vector |
| --- | --- |
| 170° | 0.347 |
| 179° | 0.035 |
| 179.9° | 0.0035 |
| 180° | 2e-16 (round-off) |

At 180° you divide noise by noise: the "axis" points anywhere. The diagonal still works: `sqrt((Rii + 1)/2)` gives `(0, 1, 0)`.


---

## Small rotations are almost linear

For a small angle θ (radians), `R ≈ I + θ K`, where `K v = axis × v`: a rotation is **first order** a cross product.

| angle | error of `I + θK` | error of `I + θK + ½θ²K²` | column length of `I + θK` |
| --- | --- | --- | --- |
| 1° | 0.000152 | 0.00000089 | 1.0002 |
| 5° | 0.00381 | 0.000111 | 1.0038 |
| 10° | 0.0152 | 0.000885 | 1.0151 |
| 30° | 0.134 | 0.0236 | 1.1288 |
| 60° | 0.500 | 0.181 | 1.448 |

<img src="../../textbook/figures/rot-small-angle.svg" alt="error of the first- and second-order approximations to a rotation against angle" style="height:150px">


---

## Pitfall: stepping with the linear rule grows the object

Spin at `ω = 90°/s` about y and step a point with `p ← p + (ω × p) Δt` at 60 frames per second:

```text
   p = (1, 0, 0),  ω = (0, 1.5708, 0),  ω × p = (0, 0, −1.5708),  Δt = 1/60
   one step:     p = (1, 0, −0.0262)       length 1.000343     exact: (0.9997, 0, −0.0262)
   after 1 s:    length 1.0208             after 10 s: length 1.2282
```

- each step multiplies the length by `√(1 + (ωΔt)²)`; the error **compounds**
- fix: step the rotation itself (a quaternion or axis-angle for `ωΔt`), or renormalize every frame


---

## Angular velocity is an axis times a rate

`ω` is a vector: its **direction** is the spin axis, its **length** the rate in radians per second. A point on the body moves at `v = ω × p`.

```text
   ω = (0, 1.5708, 0)          a quarter turn per second about +y
   p = (1, 0, 0):   v = ω × p = (0, 0, −1.5708)     speed 1.5708 = |ω| · (distance from the axis)
   one frame's turn:  ω Δt = 1.5708 / 60 = 0.0262 rad = 1.5°  →  q = (0, sin 0.75°, 0, cos 0.75°)
```

The step that does not drift: turn by the **quaternion of `ωΔt`** each frame, `q ← q_step · q`.


---

### Quaternions

<small>(~26 min)</small>

---

## The trouble with storing the matrix

Nine numbers, six hidden constraints, where **four** would do. Three problems:

- **drift**: composing matrices in floating point breaks orthonormality; shapes shear
- **interpolation**: averaging two rotation matrices is not a rotation
- **redundancy**: nine numbers for three degrees of freedom

Axis-angle interpolates well but composes awkwardly. The quaternion does both.


---

## A quaternion for a rotation

Fold the axis-angle `(n, θ)` into four numbers using the **half angle**:

```text
q = ( sin(θ/2) n ,  cos(θ/2) ) = ( x, y, z, w )
```

- the vector part `(x, y, z)` points along the axis, scaled by `sin(θ/2)`
- the scalar part `w = cos(θ/2)`
- always **unit length**: `x² + y² + z² + w² = sin²(θ/2) + cos²(θ/2) = 1`

Worked, `R_y(30°)`: half angle 15°, `q = (0, 0.259, 0, 0.966)`; `0.259² + 0.966² = 0.067 + 0.933 = 1`.


---

## Hamilton's rules

Three imaginary units, one rule, carved into Broom Bridge, Dublin, on 16 October 1843:

```text
   i² = j² = k² = ijk = −1
   so   ij = k,  jk = i,  ki = j        but   ji = −k,  kj = −i,  ik = −j        (order matters)
```

- a quaternion is `w + x i + y j + z k`; engines store `(x, y, z, w)`
- the **non-commutative** product is exactly why it can hold rotations: rotations do not commute either
- Hamilton called `w` the **scalar** part and `(x, y, z)` the **vector** part; the words come from here


---

## Applying a quaternion to a point

The **sandwich** `p' = q p q⁻¹`, expanded into vector operations (`qv = (x, y, z)`, scalar `w`):

```text
p' = p + 2w (qv × p) + 2 qv × (qv × p)
```

Two cross products and some scaling; no trig at apply time. `q⁻¹` negates the vector part: `(-x, -y, -z, w)`.


---

## Verify the identity on one point

Rotate `p = (1, 0, 0)` by 90° about `y`: `q = (0, 0.707, 0, 0.707)`.

```text
qv × p            = (0,0.707,0) × (1,0,0)       = (0, 0, -0.707)
2w (qv × p)       = 1.414 (0, 0, -0.707)        = (0, 0, -1)
qv × (qv × p)     = (0,0.707,0) × (0,0,-0.707)  = (-0.5, 0, 0)
2 qv × (qv × p)                                 = (-1, 0, 0)
p' = (1,0,0) + (0,0,-1) + (-1,0,0)              = (0, 0, -1)
```

`R_y(90°)` sent `(1,0,0)` to `(0,0,-1)` (its column 0). **The quaternion and the matrix agree.**


---

## Quaternion to matrix, no trig

```text
R = [ 1-2(y²+z²)   2(xy-zw)     2(xz+yw)   ]
    [ 2(xy+zw)     1-2(x²+z²)   2(yz-xw)   ]
    [ 2(xz-yw)     2(yz+xw)     1-2(x²+y²) ]
```

For `q = (0, 0.259, 0, 0.966)`:

```text
R00 = 1 - 2(0.259² + 0) = 1 - 0.134 = 0.866        R02 = 2(0 + 0.259·0.966) = 0.5
```

All nine give `R_y(30°)`, with no cosine evaluated.


---

## The product, written out

With `q = (v, w)` and `r = (u, s)` (vector part, scalar part):

```text
   q r = ( w u + s v + v × u ,   w s − v · u )

   components:  x = w·ux + s·vx + (vy·uz − vz·uy)
                y = w·uy + s·vy + (vz·ux − vx·uz)
                z = w·uz + s·vz + (vx·uy − vy·ux)
                w = w·s − (vx·ux + vy·uy + vz·uz)
```

A dot, a cross, and two scalings: 16 multiplies, against 27 for a `3×3` matrix product. The cross product is where the order enters.


---

## Composing rotations = multiplying quaternions

```csharp [1-6]
Vector4 QMultiplication(Vector4 q1, Vector4 q2) {
    Vector4 r;
    r.x =  q1.x*q2.w + q1.y*q2.z - q1.z*q2.y + q1.w*q2.x;
    r.y = -q1.x*q2.z + q1.y*q2.w + q1.z*q2.x + q1.w*q2.y;
    r.z =  q1.x*q2.y - q1.y*q2.x + q1.z*q2.w + q1.w*q2.z;
    r.w = -q1.x*q2.x - q1.y*q2.y - q1.z*q2.z + q1.w*q2.w;
}
```

<small>`EX_8_1_MyScript.cs`. Like matrix multiply, the product is **not commutative**: order is the rotation order.</small>


---

## Worked: compose, and check against the matrices

`R_y(30°)` first, then `R_x(30°)`: `qy = (0, 0.259, 0, 0.966)`, `qx = (0.259, 0, 0, 0.966)`:

```text
q = qx qy = (0.25, 0.25, 0.067, 0.933)            |q|² = 1.000
sandwich on (1, 2, 3)                   -> (2.366, 0.683, 2.817)
R_x(30°) R_y(30°) on (1, 2, 3)          -> (2.366, 0.683, 2.817)
angle 2 acos(0.933) = 42.2°, axis (0.695, 0.695, 0.186)
```


---

## Matrix to quaternion: read the trace

The trace of `R` is `1 + 2 cos θ`, and `w = cos(θ/2)`, so `w` falls out of the trace:

```text
   s = 2 √(1 + trace)          w = s / 4
   x = (m21 − m12) / s         y = (m02 − m20) / s         z = (m10 − m01) / s
```

- when the trace is near `−1` (a half turn) `s` is near 0: switch to the branch of the **largest diagonal entry** (Shepperd's method)
- this is how `Quaternion.LookRotation`, `Matrix4x4.rotation` and three.js `setFromRotationMatrix` get their answer


---

## Worked: the composed rotation back to four numbers

The product `R_x(30)·R_y(30)` from the composition slide (y first, then x):

```text
   R = [ 0.866   0      0.5   ]      trace = 0.866 + 0.866 + 0.75 = 2.4821
       [ 0.25    0.866 −0.433 ]      s = 2 √3.4821 = 3.7321      w = 0.933
       [−0.433   0.5    0.75  ]      x = (0.5 − (−0.433)) / 3.7321 = 0.25
                                     y = (0.5 − (−0.433)) / 3.7321 = 0.25
                                     z = (0.25 − 0) / 3.7321       = 0.067
```

`(0.25, 0.25, 0.067, 0.933)`: the **same** four numbers as the quaternion product `qx qy`. Angle `2 acos 0.933 = 42.18°`.


---

## The shortest arc from one direction to another

To turn unit vector `a` onto unit vector `b` by the smallest rotation: axis `a × b`, angle `acos(a · b)`, and a quaternion with no trigonometry:

```text
   q = normalize( a × b ,  1 + a · b )            (vector part, scalar part)

   a = (0.6, 0.8, 0),  b = (0, 0.6, 0.8):   a · b = 0.48,  a × b = (0.64, −0.48, 0.36)
   q = normalize(0.64, −0.48, 0.36, 1.48) = (0.372, −0.279, 0.209, 0.860)          angle 61.3°
   check: q applied to a gives (0, 0.6, 0.8) = b
```


---

## Pitfall: turning a vector onto its opposite

```text
   a = (1, 0, 0),  b = (−1, 0, 0):   a × b = (0, 0, 0),  1 + a · b = 0     q = normalize(0, 0, 0, 0): undefined
```

Every axis perpendicular to `a` gives a valid half turn, so the formula has nothing to pick. Robust code detects `1 + a · b < ε` and chooses **any** perpendicular axis (for example `a × (0, 1, 0)`, or `a × (1, 0, 0)` if that is also near zero).


---

## Slerp: blending orientations

<img src="../../textbook/figures/rot-slerp.svg" alt="slerp walks the great arc; the plain average leaves the unit sphere" style="height:210px">

Identity `(0,0,0,1)` to `R_y(120°)`, `q2 = (0, 0.866, 0, 0.5)`: `cos Ω = 0.5`, `Ω = 60°`.

```text
slerp at t = 1/2:  0.577 (0, 0.866, 0, 1.5) = (0, 0.5, 0, 0.866)    = the quaternion of R_y(60°)
plain average:     (0, 0.433, 0, 0.75),  length 0.866               not a rotation
```


---

## Pitfall: q and -q, and the long way round

`q` and `-q` are the **same rotation**: `(0, 0.259, 0, 0.966)` and `(0, -0.259, 0, -0.966)` both give `R_y(30°)`.

```text
q1 = identity,  q2 = -(quaternion of R_y(120°)) = (0, -0.866, 0, -0.5)
q1 . q2 = -0.5  ->  slerp walks 120° in 4D  ->  a 240° turn: the long way round
fix: if q1 . q2 < 0, negate q2 first
```


---

## nlerp: cheaper, almost as good

Normalize the straight blend instead of walking the arc: `nlerp(t) = normalize((1 − t) q1 + t q2)`.

`q1` = identity, `q2` = 120° about y (`q1·q2 = 0.5`, arc `Ω = 60°`):

| t | slerp angle | nlerp angle |
| --- | --- | --- |
| 0.25 | 30.0° | 27.8° |
| 0.5 | 60.0° | 60.0° |

- same path, **uneven speed**: at most 1.1 times the average rate for this pair
- no `sin`, no `acos`: games blend thousands of bones per frame with nlerp and renormalize


---

## Drift, measured

<img src="../../textbook/figures/rot-drift.svg" alt="error growth over 200,000 float32 compositions: matrix, quaternion, renormalized quaternion" style="height:220px">

200,000 compositions of `R_y(1°)` in float32:

| representation | error after 200,000 steps |
| --- | --- |
| 3×3 matrix product | columns off orthonormal by 5.7e-3 |
| quaternion product | length off 1 by 2.1e-3 |
| quaternion, renormalized each step | 1.8e-8 |


---

## What Unity's Quaternion stores

`UnityEngine.Quaternion` is four floats `(x, y, z, w)`, the same `q`:

- `transform.rotation` is a **quaternion**, always
- build with `Quaternion.AngleAxis(angle, axis)`; compose with `*`; blend with `Slerp`
- three.js: `Quaternion.setFromAxisAngle`, `multiply`, `slerp`, same layout

You *read* Euler angles in the Inspector, but the engine *stores* a quaternion.


---

## The same rotation in two APIs

<div class="code-tabs">

```csharp
// Unity: degrees; q1 * q2 applies q2 first; q * v rotates a vector
Quaternion q = Quaternion.AngleAxis(30f, Vector3.up);
Vector3 p = q * new Vector3(1, 0, 0);                         // (0.866, 0, −0.5)
```

```javascript
// three.js: radians; q1.multiply(q2) is q1·q2 (q2 acts first)
const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);
const p = new THREE.Vector3(1, 0, 0).applyQuaternion(q);     // (0.866, 0, −0.5)
```

</div>

Same four numbers `(0, 0.259, 0, 0.966)`, same image of `+x`; **units differ**: radians in three.js, degrees in Unity.


---

## Pitfall: degrees where radians were expected

```text
   Math.sin(30)             = −0.988      (30 radians: 4.77 full turns and a bit)
   Math.sin(30 · π / 180)   =  0.5
```

- a rotation built from `30` radians turns the object by `30 mod 2π = 4.867 rad = 278.9°`
- the bug is silent: the result is still a valid rotation, just the wrong one
- rule: convert at the boundary (`THREE.MathUtils.degToRad`, `Mathf.Deg2Rad`), never inside the math


---

### Euler angles and gimbal lock

<small>(~14 min)</small>

---

## Euler angles: three turns in a row

Three rotations about three axes, in a **fixed order**: readable ("pitch 20, yaw 45, roll 10"), but the order is a convention.

| convention | product | where x lands for (20°, 45°, 10°) |
| --- | --- | --- |
| Unity, `Quaternion.Euler` | `R_y R_x R_z` (Z first) | (0.738, 0.163, -0.654) |
| three.js default, XYZ | `R_x R_y R_z` | (0.696, 0.401, -0.595) |
| aerospace, extrinsic XYZ | `R_z R_y R_x` | (0.696, 0.123, -0.707) |

Same three numbers, **three poses**: Unity and three.js differ by 15.2°.


---

## The lock: the inner axis lands on the outer one

<img src="../../textbook/figures/rot-gimbal.svg" alt="at a 90-degree middle angle the inner and outer rotation axes coincide" style="height:220px">

Unity's order: `Z` inner, `X` middle, `Y` outer. After the middle turn, the inner axis in the world is:

```text
R_x(x) z = (0, -sin x, cos x)
x = 30°:  (0, -0.5, 0.866)        a distinct direction
x = 90°:  (0, -1, 0)              the outer Y axis itself: Z and Y do the same thing
```


---

## Extraction, and the lock

Reading the triple back from `R` (Unity order):

```text
(20°, 45°, 10°):  x = asin(-R12) = asin(0.342) = 20°
                  y = atan2(R02, R22) = atan2(0.6645, 0.6645) = 45°
                  z = atan2(R10, R11) = atan2(0.163, 0.925) = 10°
(90°, 45°, 10°):  R12 = -1, so x = 90°, but R02 = R22 = R10 = R11 = 0:  atan2(0, 0)
                  only y - z survives: atan2(R01, R00) = 35°
```

At the lock, `(90°, 45°, 10°)` and `(90°, 60°, 25°)` are the **same orientation**.


---

## Two triples, one rotation

```text
   (20°, 45°, 10°)   and   (160°, 225°, 190°)   give the SAME matrix in Unity's ZXY order
```

- every orientation has **two** Euler triples (away from the lock), and infinitely many at the lock
- so "interpolate the three angles" can take the long way: from `(20, 45, 10)` to `(160, 225, 190)` is a large motion between identical poses
- store and interpolate quaternions; show Euler angles only in the inspector


---

## Gimbal lock, in flight

The Apollo guidance platform held its orientation on **three gimbals**. Near lock, the crew was warned to steer away; on Apollo 11, when Houston warned that Columbia was close to gimbal lock, Michael Collins answered:

> "How about sending me a fourth gimbal for Christmas?"

<small>Apollo 11 air-to-ground transcript, 1969.</small>

Three gimbals are three Euler angles in hardware; the fourth gimbal Collins asked for is the extra degree of freedom a quaternion has for free.


---

## Quaternions have no lock

Gimbal lock is a disease of the **representation**, not of rotation itself:

- three sequential angles have singular configurations: the 90° collapse
- a **quaternion** names axis and angle **directly**: no gimbals to align
- engines **store** quaternions and only **show** Euler angles for editing

