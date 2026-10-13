<!--
  CSS 551 · TOPIC DECK: Rotation: matrices, axis-angle, quaternions, Euler angles (~78 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/rotation-quaternions.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES: a rotation is where the axes land (columns); orthonormal columns, determinant +1, the
  transpose as inverse, a mirror is not a rotation; the 2D rotation lifted to R_y; Rodrigues from the
  projection split and a cross, worked on one vector and column by column; the diagonal axis at 120
  degrees; reading axis and angle back out of a matrix (the trace and why it is 1 + 2 cos θ) and its
  failure near 180; small angles, angular velocity, and the drift of a linear step; quaternions (what
  one is, the half angle and why, the sandwich verified on one point, quaternion to matrix, the product
  as composition worked against matrices, slerp worked, the double cover and the long way round, drift
  measured, what Unity stores); Euler angles (yaw, pitch, roll; three conventions give three poses;
  gimbals; gimbal lock by the inner axis; extraction at the lock), and why quaternions have no lock; one
  rotation, five definitions.
  EDITED 2026-10-13 (consistency pass): nothing used before it is defined (the sandwich and the product
  slides moved ahead of "why the half angle", no q on the angular-velocity slide, the axes demo after the
  mirror slide); Rij, x-hat, the right-hand rule, the identity quaternion, nlerp and lerp defined; the
  substitution in Rodrigues shown; Euler order names (three.js XYZ = R_x R_y R_z, Unity ZXY = R_y R_x R_z)
  explained; three.js setFromRotationMatrix described correctly; QMultiplication in both tracks.
  EDITED 2026-10-13 (improvement pass: no unexplained terms, an intuitive picture for every concept, a
  demo for every main concept): terms defined where they first appear (degrees of freedom, transpose,
  determinant as the triple product of the columns, diag, trace, the antisymmetric part, first order,
  the cross-product matrix K, ω and Δt, quaternion, conjugate, the 4D unit sphere and Ω, double cover,
  Shepperd's method, yaw/pitch/roll, intrinsic and extrinsic, gimbal); the angular-velocity slide moved
  before the pitfall that uses ω; "what a quaternion is" moved before the rotation quaternion; new slides:
  where the axes land (demo), Rodrigues live, why trace = 1 + 2 cos θ, spinning live, why the half angle,
  the half angle live, order matters live, slerp live, yaw/pitch/roll, gimbals, gimbal lock live, one
  rotation five definitions (demo); "What Unity's Quaternion stores" merged into the two-API slide; the
  section minute tags made to add up (they summed to 76 against a 64-minute header).
  EDITED 2026-10-08: the check-yourself slide and the duplicate "Six orders, six different rotations" table
  cut; "Why" titles renamed; the two-API slide in Unity/WebGL code tabs; the composed-rotation slide labelled
  R_x(30)·R_y(30) and qx qy; notes no longer cite a homework slerp or shortest-arc exercise (HW2 has neither).
  NEEDS:   the vectors-review topic (projection split, the cross, the triple product) and the vector-geometry
           topic ("two vectors, a whole frame"); mount it after them.
  RESEQUENCED 2026-10-05 (L04, after vector-geometry): history table, squad, the matrix-lerp failure and the
  recap slide removed (squad and the matrix lerp moved to the animation topic).
  DEMOS:   rotation-ways (mode:columns,mirror, then modes), axis-angle (angle,rodrigues; angle,halfangle),
           spin-step, rot-compose, quat-slerp, euler-gimbal; all full-slide (demo-full), registry slugs.
  NUMBERS: every number is from textbook/figures/numbers-foundations.json (key rot) or recomputed by
           node against lib/core/xform.js and lib/core/rot-reps.js (lib/tests/rot-reps.test.mjs checks them).
  FIGURES: ../../textbook/figures/rot-*.svg (tools/gen-textbook-figures-foundations.mjs and
           tools/gen-textbook-figures-rotation-intuition.mjs).
  SOURCE:  derived 2026-09-18 from the former S03 rotation deck; expanded 2026-09-29 (Plan C) with the
           textbook chapter's properties, log map, conversions, composition, slerp, double cover, drift and
           Euler-convention sections. Real C# excerpts are from Kelvin Sung's CSS 451 ClassExamples.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Paths are relative to the
  lecture page that mounts this topic (lectures/LNN-slug/index.html).
-->

### Rotation: matrices, axis-angle, quaternions, Euler angles

<small>(~78 min) · reading: <a href="../../textbook/rotation.html">Rotation</a>, Sections 1 to 8</small>


---

### Rotation matrices: where the axes land

<small>(~17 min)</small>

---

## What a rotation must preserve

A rotation is a transform that keeps a rigid body rigid:

- **lengths** stay the same: no stretch, no squash
- **angles** stay the same: perpendicular stays perpendicular
- the **origin** stays put (it is a rotation, not a move)
- **handedness** stays the same: a right hand stays a right hand

Every `v = x x̂ + y ŷ + z ẑ` (`x̂, ŷ, ẑ`: the unit axes) lands at `x (where x̂ goes) + y (where ŷ goes) + z (where ẑ goes)`: a rotation is fixed by **where the three axes go**.


---

## Rotating a point in 2D

<img src="../../textbook/figures/rot-2d.svg" alt="a point rotated by theta about the origin in 2D" style="height:220px">

A point at radius r and angle φ is `(r cos φ, r sin φ)`; turning adds θ; expand `cos(φ + θ)` and `sin(φ + θ)`:

```text
x' = x cos θ - y sin θ          [ x' ]   [ cos θ   -sin θ ] [ x ]
y' = x sin θ + y cos θ          [ y' ] = [ sin θ    cos θ ] [ y ]
```

Positive θ turns counter-clockwise (x toward y). Worked: `(2, 1)` by 30° lands at `(1.232, 1.866)`.


---

## The columns are where the axes go

<img src="../../textbook/figures/rot-columns.svg" alt="the columns of a rotation matrix are the images of the basis vectors" style="height:220px">

<small>Figure: the same reading in 3D, for the next slide's R_y(30°).</small>

A matrix times a vector is a **mix of the matrix's columns**: `M (x, y) = x · column 0 + y · column 1`.

```text
M (1, 0) = column 0 = ( cos θ,  sin θ )   <- where the x axis lands
M (0, 1) = column 1 = ( -sin θ, cos θ )   <- where the y axis lands
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
- the corners are the 2D rotation of the z-x plane, turning z toward x (the cyclic order x → y → z → x), so `+sin θ` sits top right: the 2D pattern mirrored
- at θ = 90°: column 0 is `(0, 0, -1)`: the old x axis now points along `-z`
- the same pattern for the others: `R_x(θ)` turns y toward z, `R_z(θ)` turns x toward y (the 2D matrix, plus a 1 for z)


---

## Orthonormal columns, determinant +1

`R_y(30°)` has columns `(0.866, 0, -0.5)`, `(0, 1, 0)`, `(0.5, 0, 0.866)`:

```text
col0 · col0 = 0.866² + 0.5² = 0.75 + 0.25 = 1         every column has length 1
col0 · col2 = 0.866(0.5) + 0 + (-0.5)(0.866) = 0      every pair is perpendicular
det R = col0 · (col1 × col2) = 1                       the triple product: volume +1, right-handed
Rᵀ (0.866, 0, -0.5) = (col0 · col0, col1 · col0, col2 · col0) = (1, 0, 0)    R⁻¹ = Rᵀ
```

- **orthonormal**: unit length and mutually perpendicular; **Rᵀ** (transpose): rows written as columns
- entry (i, j) of `RᵀR` is `col i · col j`, so orthonormal columns say exactly `RᵀR = I`
- nine numbers, **six constraints**, **three degrees of freedom** (three numbers you can still choose)


---

## A mirror is not a rotation

<img src="../../textbook/figures/rot-reflection.svg" alt="a mirror flips handedness; two mirrors make a rotation" style="height:200px">

`diag(s0, s1, s2)` is the matrix with `s0, s1, s2` on the diagonal and zeros elsewhere: it scales each axis.

```text
M_x = diag(-1, 1, 1): flips x (a mirror in the y-z plane); orthonormal columns, det = -1
(M_x x̂) × (M_x ŷ) = (-x̂) × ŷ = -ẑ,   but M_x ẑ = +ẑ           handedness flipped
M_y = diag(1, -1, 1):  M_y M_x = diag(-1, -1, 1) = R_z(180°), det = +1      two mirrors: a rotation
```


---

<!-- .slide: class="demo-full" -->

## Where the axes land, live

<div class="cockpit" data-demo="rotation-ways" data-controls="mode:columns,mirror"><pre class="viz-fallback">  choose where x lands (azimuth, elevation) and where y lands (twist about x');
  z' = x' × y' is forced: three numbers fix a rotation
  -- default: R_y(30) --------------------------------------------
     x lands at (0.866, 0, -0.5)   y lands at (0, 1, 0)   z lands at (0.5, 0, 0.866)
     det = +1            mirror on: z' = -(x' × y'), det = -1, not a rotation</pre></div>


---

### Axis-angle: any axis

<small>(~22 min)</small>

---

## The general question

We can spin about x, y, or z. But a rotation can be about **any** axis, a unit vector `n`, by any angle `θ`.

- store a rotation as **just that**: an axis `n` and an angle `θ` (four numbers, one constraint: `|n| = 1`)
- positive `θ` follows the **right-hand rule**: thumb along `n`, the fingers curl the way the turn goes
- but how do you *apply* it: rotate an arbitrary `v` about an arbitrary `n`?

The answer reuses **exactly** the projection split of the vectors review.


---

## Split v into along-axis and across-axis

<img src="../../textbook/figures/rot-rodrigues.svg" alt="v split into a frozen part along n and a turning part across n" style="height:250px">

```text
v-par  = (v · n) n          the piece along the axis     (frozen)
v-perp = v - v-par          the piece in the rotation plane (turns)
w      = n × v              the plane's second axis: |w| = |v| sin∠(n, v) = |v-perp|
```


---

## Turn inside the plane: Rodrigues

A 2D rotation of `v-perp` by `θ`, using `v-perp` and `w` as the two axes:

```text
v-perp' = cos θ · v-perp + sin θ · w
```

Add back the frozen part, substitute `v-perp = v − (v · n) n` and `w = n × v`, and collect the `(v · n) n` terms:

```text
v' = v-par + v-perp' = (v · n) n  +  cos θ (v − (v · n) n)  +  sin θ (n × v)
   = cos θ · v  +  (1 - cos θ)(v · n) n  +  sin θ · (n × v)          Rodrigues' formula
```


---

## Worked: Rodrigues on one vector

`n = (0, 1, 0)`, `θ = 30°` (cos θ = 0.866, sin θ = 0.5, 1 − cos θ = 0.134), `v = (1, 0.6, 0.3)`:

```text
v · n = 0.6          n × v = (1·0.3 - 0·0.6,  0·1 - 0·0.3,  0·0.6 - 1·1) = (0.3, 0, -1)
v' = 0.866 (1, 0.6, 0.3) + 0.134 · 0.6 (0, 1, 0) + 0.5 (0.3, 0, -1)
   = (0.866 + 0.15,  0.520 + 0.080,  0.260 - 0.5) = (1.016, 0.6, -0.240)
```

The library's `R_y(30°)` applied to the same `v` gives `(1.016, 0.6, -0.240)`.


---

<!-- .slide: class="demo-full" -->

## Rodrigues, live

<div class="cockpit" data-demo="axis-angle" data-controls="angle,rodrigues"><pre class="viz-fallback">  v = (1, 0.6, 0.3) about n = (0, 1, 0):
     v·n = 0.6     v-par = (0, 0.6, 0)     v-perp = (1, 0, 0.3)     w = n × v = (0.3, 0, -1)
  -- angle 30 deg ----------------------------------------------
     v' = cos θ v + (1 - cos θ)(v·n) n + sin θ (n × v) = (1.016, 0.6, -0.240)
     v' sweeps a circle of radius |v-perp| = 1.044 at height v·n = 0.6</pre></div>


---

## Worked: build R_y(30) column by column

`n = (0, 1, 0)`, `θ = 30°`: apply Rodrigues to each unit axis; the results are the columns:

```text
x̂ = (1,0,0): x̂·n = 0, n × x̂ = (0,0,-1) -> 0.866(1,0,0) + 0.5(0,0,-1) = (0.866, 0, -0.5)
ŷ = (0,1,0): ŷ·n = 1, n × ŷ = (0,0,0)  -> along the axis, unchanged      = (0, 1, 0)
ẑ = (0,0,1): ẑ·n = 0, n × ẑ = (1,0,0)  -> 0.866(0,0,1) + 0.5(1,0,0)      = (0.5, 0, 0.866)
```

These three columns **are** `R_y(30°)`: the axes demo's "x/y/z lands at" rows, digit for digit.


---

## Worked: the diagonal axis at 120°

<img src="../../textbook/figures/rot-diagonal-axis.svg" alt="rotation by 120 degrees about the cube diagonal permutes the axes" style="height:230px">

`n = (1, 1, 1)/√3`, `θ = 120°`: `sin θ = 0.866`, `1 - cos θ = 1.5`. Rodrigues on the three axes gives:

```text
R = [ 0 0 1 ]      x -> y,   y -> z,   z -> x         R (1,1,1) = (1,1,1): the axis is fixed
    [ 1 0 0 ]      three of these turns are the identity
    [ 0 1 0 ]
```

As a matrix: `R = I + sin θ K + (1 − cos θ) K²`, with `K` the **cross-product matrix** of n: `K v = n × v`.


---

## The trace: why it is 1 + 2 cos θ

<img src="../../textbook/figures/rot-trace.svg" alt="the axis keeps all of itself; each of two perpendicular directions in the rotation plane keeps cos theta of itself" style="height:330px">

**Trace** = the sum of the diagonal. With `eᵢ` the i-th unit axis, `R eᵢ` is column i and diagonal entry `i` is `eᵢ · (R eᵢ)`: **how much of axis i stays itself**. The trace is the same in every orthonormal frame, so measure in one lined up with the rotation:

```text
along the axis: 1     in the plane: cos θ + cos θ     trace = 1 + 2 cos θ, for any axis
R_y(30):  0.866 + 1 + 0.866 = 2.732 = 1 + 2(0.866)
```


---

## Reading axis and angle out of a matrix

`R = R_x(30°) R_y(30°)` (R_y acts first), rows `(0.866, 0, 0.5)`, `(0.25, 0.866, -0.433)`, `(-0.433, 0.5, 0.75)`; `Rij` is the entry in row i, column j:

```text
trace R = 1 + 2 cos θ = 2.482                       ->  cos θ = 0.741,  θ = 42.18°
(R21 - R12, R02 - R20, R10 - R01) = (0.933, 0.933, 0.25) = 2 sin θ · n
divide by 2 sin θ = 1.343                           ->  n = (0.695, 0.695, 0.186)
```

The differences come from `R − Rᵀ`, twice the **antisymmetric part**: in Rodrigues the `cos θ` and `(1 − cos θ)` terms are symmetric (equal across the diagonal) and cancel; the `sin θ (n × v)` term is not, and its off-diagonal entries are n's components. Two rotations about two axes are **one** rotation about a third.


---

## Pitfall: the axis near a half turn

For `R_y(θ)`, the vector of differences read from `R − Rᵀ` has length `2 sin θ`:

| θ | length of (R21 − R12, R02 − R20, R10 − R01) |
| --- | --- |
| 170° | 0.347 |
| 179° | 0.035 |
| 179.9° | 0.0035 |
| 180° | 2e-16 (round-off) |

At 180° you divide noise by noise: the "axis" points anywhere. The diagonal still works: at 180°, `R = 2 n nᵀ − I` (`n nᵀ`: the matrix of products `nᵢ nⱼ`), so `Rii = 2 nᵢ² − 1` and `|nᵢ| = √((Rii + 1)/2)`: here `(0, 1, 0)`; the signs come from `Rij = 2 nᵢ nⱼ`.


---

## Small rotations are almost linear

**First order** in θ (in radians): keep the terms proportional to θ, drop θ², θ³, ... Then `sin θ ≈ θ`, `1 − cos θ ≈ 0` (next term `θ²/2`), and Rodrigues becomes

```text
R v ≈ v + θ (n × v)          R ≈ I + θ K,   K = the cross-product matrix: K v = n × v
```

| angle (axis y) | largest entry error of `I + θK` | of `I + θK + ½θ²K²` (next term) | column length of `I + θK` |
| --- | --- | --- | --- |
| 1° | 0.000152 | 0.00000089 | 1.0002 |
| 5° | 0.00381 | 0.000111 | 1.0038 |
| 30° | 0.134 | 0.0236 | 1.1288 |

A small turn moves each point **along the tangent** `n × v`; the exact turn bends back onto the circle.


---

## Angular velocity is an axis times a rate

`ω` (omega) is a vector: its **direction** is the spin axis, its **length** the rate in radians per second. A point at `p` on the body moves with velocity `ω × p`, tangent to its circle. `Δt` is the time step: the time one frame advances the simulation.

```text
   ω = (0, 1.5708, 0)          a quarter turn per second about +y  (90°/s = 1.5708 rad/s)
   p = (1, 0, 0):   velocity ω × p = (0, 0, −1.5708)     speed 1.5708 = |ω| · (distance from the axis)
   one frame, Δt = 1/60 s:  |ω| Δt = 0.0262 rad = 1.5°   →   turn exactly 1.5° about y each frame
```



---

## Pitfall: the linear step grows the object

<img src="../../textbook/figures/rot-tangent-step.svg" alt="a linear step along the tangent lands outside the circle; repeated steps spiral outward while exact steps stay on the circle" style="height:300px">

`p ← p + (ω × p) Δt` steps along the tangent, **perpendicular** to `p`: for `p` square to the axis, Pythagoras makes each step multiply the length by `√(1 + (|ω|Δt)²)`.

```text
90°/s about y, 60 steps/s:  one step 1.000343   after 1 s 1.0208   after 10 s 1.2282
```


---

<!-- .slide: class="demo-full" -->

## Spinning, live: linear step vs exact step

<div class="cockpit" data-demo="spin-step" data-controls="time,rate,fps,play"><pre class="viz-fallback">  p0 = (1, 0, 0), ω = 90°/s about +y, 60 steps per second
     linear step   p ← p + (ω × p) Δt          exact step   p ← (turn of |ω|Δt about ω) p
  -- time 1 s ------------  linear |p| = 1.0208     exact |p| = 1.0000
  -- time 10 s -----------  linear |p| = 1.2282     exact |p| = 1.0000
     predicted after k steps: (1 + (|ω|Δt)²)^(k/2)</pre></div>


---

### Quaternions

<small>(~25 min)</small>

---

## The trouble with storing the matrix

Nine numbers with six hidden constraints, for three degrees of freedom. Three problems:

- **drift**: composing matrices in floating point breaks orthonormality; shapes shear
- **interpolation**: averaging two rotation matrices is not a rotation
- **size**: nine numbers to store, send and keep consistent, where four will do

Axis-angle has no simple rule for composing two turns. The quaternion composes by one product and interpolates cleanly.


---

## What a quaternion is

A number with one real part and **three** imaginary parts, `w + x i + y j + z k`, multiplied by Hamilton's rule, carved into Broom Bridge, Dublin, on 16 October 1843:

```text
   i² = j² = k² = ijk = −1
   so   ij = k,  jk = i,  ki = j        but   ji = −k,  kj = −i,  ik = −j        (order matters)
```

- engines store the four numbers as `(x, y, z, w)`; `w` is the **scalar part** (a number, not Rodrigues' `w = n × v`), `(x, y, z)` the **vector part**
- like complex numbers (one `i`) turn the plane, quaternions turn space
- the product is **not commutative**, and neither are rotations


---

## A quaternion for a rotation

Fold the axis-angle `(n, θ)` into four numbers using the **half angle**:

```text
q = ( sin(θ/2) n ,  cos(θ/2) ) = ( x, y, z, w )
```

- the vector part `(x, y, z)` points along the axis, scaled by `sin(θ/2)`
- the scalar part `w = cos(θ/2)`
- always **unit length**: `x² + y² + z² + w² = sin²(θ/2) + cos²(θ/2) = 1`
- no turn (θ = 0) gives `(0, 0, 0, 1)`, the **identity** quaternion

Worked, `R_y(30°)`: half angle 15°, `q = (0, 0.259, 0, 0.966)`; `0.259² + 0.966² = 0.067 + 0.933 = 1`.


---

## The product, written out

Write each quaternion as (vector part, scalar part): `q = (qv, qw)`, `r = (rv, rw)`.

```text
   q r = ( qw rv + rw qv + qv × rv ,   qw rw − qv · rv )
           vector part                 scalar part
```

- the scalar part: product of the scalars minus the dot of the vectors
- the vector part: each vector scaled by the other's scalar, plus their cross

A dot, a cross, and two scalings: 16 multiplies, against 27 for a `3×3` matrix product. The cross product is where the order enters.


---

## Applying a quaternion to a point

Write the point `p` as the quaternion `(p, 0)` (vector part `p`, scalar part 0). The sandwich `p' = q p q⁻¹`, expanded into vector operations (`qv = (x, y, z)`, scalar `w`):

```text
p' = p + 2w (qv × p) + 2 qv × (qv × p)
```

Two cross products and some scaling; no trig at apply time. `q⁻¹` is the **conjugate**, the vector part negated: `(-x, -y, -z, w)`.


---

## Check the formula on one point

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

## Why the half angle

<img src="../../textbook/figures/rot-half-angle.svg" alt="the object turns theta; the quaternion's point on its circle turns theta over two, so a full turn of the object takes q to minus the identity" style="height:250px">

q turns a point by a **sandwich**, `q p q⁻¹`, one multiply on each side:

- **across** the axis, each side turns `p` by `θ/2`: total `θ`
- **along** the axis, the left multiply adds a scalar part; the right one removes it
- so `q` has turned only `θ/2`: at 360°, `q = (0, 0, 0, −1)`, **minus** the identity


---

<!-- .slide: class="demo-full" -->

## The half angle, live

<div class="cockpit" data-demo="axis-angle" data-controls="angle,halfangle"><pre class="viz-fallback">  the cube turns θ about y; q = (0, sin(θ/2), 0, cos(θ/2)) turns θ/2
     θ =  30:  q = (0, 0.259, 0, 0.966)
     θ = 180:  q = (0, 1, 0, 0)          w = 0
     θ = 360:  q = (0, 0, 0, -1)         the cube is home; q is minus the identity
     θ = 720:  q = (0, 0, 0, 1)          q is home</pre></div>


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

## Composing rotations = multiplying quaternions

Turn by `q1`, then by `q2`: `q2 (q1 p q1⁻¹) q2⁻¹ = (q2 q1) p (q2 q1)⁻¹`, so the product `q2 q1` **is** the composite; like matrices, the right factor acts first.

<div class="code-tabs">

```csharp
// returns the product q1 q2; a quaternion is stored as (x, y, z, w) in a Vector4
Vector4 QMultiplication(Vector4 q1, Vector4 q2) {
    Vector4 r;
    r.x =  q1.x*q2.w + q1.y*q2.z - q1.z*q2.y + q1.w*q2.x;
    r.y = -q1.x*q2.z + q1.y*q2.w + q1.z*q2.x + q1.w*q2.y;
    r.z =  q1.x*q2.y - q1.y*q2.x + q1.z*q2.w + q1.w*q2.z;
    r.w = -q1.x*q2.x - q1.y*q2.y - q1.z*q2.z + q1.w*q2.w;
    return r;
}
```

```javascript
// returns the product q1 q2; a quaternion is stored as (x, y, z, w) in a THREE.Vector4
function QMultiplication(q1, q2) {
    const r = new THREE.Vector4();
    r.x =  q1.x*q2.w + q1.y*q2.z - q1.z*q2.y + q1.w*q2.x;
    r.y = -q1.x*q2.z + q1.y*q2.w + q1.z*q2.x + q1.w*q2.y;
    r.z =  q1.x*q2.y - q1.y*q2.x + q1.z*q2.w + q1.w*q2.z;
    r.w = -q1.x*q2.x - q1.y*q2.y - q1.z*q2.z + q1.w*q2.w;
    return r;
}
```

</div>

<small>The C# is `EX_8_1_MyScript.cs`. Each line is one component of the product formula.</small>


---

## Worked: compose, and check against the matrices

`R_y(30°)` first, then `R_x(30°)`: `qy = (0, 0.259, 0, 0.966)`, `qx = (0.259, 0, 0, 0.966)`:

```text
q = qx qy = (0.25, 0.25, 0.067, 0.933)            |q|² = 1.000
sandwich on (1, 2, 3)                   -> (2.366, 0.683, 2.817)
R_x(30°) R_y(30°) on (1, 2, 3)          -> (2.366, 0.683, 2.817)
angle 2 acos(0.933) = 42.18°, axis (0.695, 0.695, 0.186)
the other order, qy qx = (0.25, 0.25, -0.067, 0.933): an end pose 15.4° away
```


---

<!-- .slide: class="demo-full" -->

## Order matters, live

<div class="cockpit" data-demo="rot-compose" data-controls="angleA,angleB,axes,play"><pre class="viz-fallback">  A = 30° about y, B = 30° about x
     A then B:  qB qA = (0.25, 0.25, 0.067, 0.933)    one turn of 42.18° about (0.695, 0.695, 0.186)
     B then A:  qA qB = (0.25, 0.25, -0.067, 0.933)   one turn of 42.18° about (0.695, 0.695, -0.186)
     the two end poses differ by 15.4°
  set both to 90°: each order is one 120° turn, about two different cube diagonals</pre></div>


---

## Matrix to quaternion: read the trace

The trace of `R` is `1 + 2 cos θ`, and `w = cos(θ/2)`, so `w` falls out of the trace (`1 + trace = 4w²`):

```text
   s = 2 √(1 + trace) = 4w      w = s / 4
   x = (R21 − R12) / s         y = (R02 − R20) / s         z = (R10 − R01) / s
   why: from the quaternion-to-matrix table, R21 − R12 = 2(yz + xw) − 2(yz − xw) = 4xw
```

- when the trace is near `−1` (a half turn) `s` is near 0, and dividing by it amplifies round-off
- **Shepperd's method** (1978): take the largest of `4w² = 1 + trace`, `4x² = 1 + R00 − R11 − R22` (likewise y, z) by a square root, then divide the others by it
- three.js's `setFromRotationMatrix` uses a variant: the trace branch whenever the trace is positive, else the largest diagonal


---

## Worked: the composed rotation back to four numbers

The product `R_x(30°) R_y(30°)` from the composition slide (y first, then x):

```text
   R = [ 0.866   0      0.5   ]      trace = 0.866 + 0.866 + 0.75 = 2.482
       [ 0.25    0.866 −0.433 ]      s = 2 √3.482 = 3.732      w = s/4 = 0.933
       [−0.433   0.5    0.75  ]      x = (R21 − R12)/s = (0.5 + 0.433)/3.732 = 0.25
                                     y = (R02 − R20)/s = (0.5 + 0.433)/3.732 = 0.25
                                     z = (R10 − R01)/s = (0.25 − 0)/3.732    = 0.067
```

`(0.25, 0.25, 0.067, 0.933)`: the **same** four numbers as the quaternion product `qx qy`. Angle `2 acos 0.933 = 42.18°`.


---

## The shortest arc between two directions

<img src="../../textbook/figures/rot-shortest-arc.svg" alt="unit vectors a and b, the arc from a to b, the axis a cross b, and the halfway direction" style="height:250px">

Turn unit `a` onto unit `b` by the smallest rotation (axis along `a × b`, angle `θ = acos(a · b)`); the quaternion needs no trigonometry:

```text
   q = normalize( a × b ,  1 + a · b )            (vector part, scalar part)
   a = (0.6, 0.8, 0),  b = (0, 0.6, 0.8):   a · b = 0.48,  a × b = (0.64, −0.48, 0.36)
   q = (0.372, −0.279, 0.209, 0.860),  angle 61.3°;   check: q applied to a gives b
   why: |a × b| = 2 sin(θ/2) cos(θ/2) and 1 + a · b = 2 cos²(θ/2); normalizing cancels 2 cos(θ/2)
```


---

## Pitfall: turning a vector onto its opposite

```text
   a = (1, 0, 0),  b = (−1, 0, 0):   a × b = (0, 0, 0),  1 + a · b = 0     q = normalize(0, 0, 0, 0): undefined
```

Every axis perpendicular to `a` gives a valid half turn, so the formula has nothing to pick. Robust code detects `1 + a · b` below a small tolerance (say `1e-6`), takes a unit axis `n` perpendicular to `a` (normalize `a × (0, 1, 0)`, or `a × (1, 0, 0)` when `a` lies along y) and returns the half turn `q = (n, 0)`: here `(0, 0, 1, 0)`.


---

## Slerp: blending orientations

<img src="../../textbook/figures/rot-slerp.svg" alt="slerp walks the great arc; the plain average leaves the unit sphere" style="height:220px">

Unit quaternions are the points of length 1, a **sphere in 4D**. **Slerp** (spherical linear interpolation) walks the **great arc** (shortest path on it) from `q1` (at `t = 0`) to `q2` (at `t = 1`) at constant speed. `Ω` is the angle between them: `cos Ω = q1 · q2`, the dot of the four components.

```text
slerp(q1, q2, t) = ( sin((1 − t)Ω) q1 + sin(tΩ) q2 ) / sin Ω
q1 = identity (0,0,0,1), q2 = R_y(120°) = (0, 0.866, 0, 0.5):   cos Ω = 0.5,  Ω = 60° (half the turn)
t = 1/2:  both weights sin 30° / sin 60° = 0.577:   0.577 (q1 + q2) = (0, 0.5, 0, 0.866), the quaternion of R_y(60°)
plain average (q1 + q2)/2 = (0, 0.433, 0, 0.75),  length 0.866                     not a rotation
```


---

## Pitfall: q and -q, and the long way round

<img src="../../textbook/figures/rot-long-way.svg" alt="on the circle, q2 is 60 degrees from the identity and minus q2 is 120 degrees away: the short and the long arcs" style="height:230px">

`q` and `-q` give the **same matrix** (each entry is a product of two components): two quaternions per rotation, the **double cover**.

```text
q1 = identity,  q2 = R_y(120°) = (0, 0.866, 0, 0.5),  −q2 = (0, −0.866, 0, −0.5): same rotation
q1 · (−q2) = −0.5  ->  slerp toward −q2 walks Ω = 120° in 4D  ->  a 240° turn: the long way round
fix: if q1 · q2 < 0, negate q2 first (same rotation, the short arc)
```


---

## nlerp: cheaper, almost as good

**nlerp** (normalized linear interpolation): normalize the straight blend instead of walking the arc, `nlerp(t) = normalize((1 − t) q1 + t q2)`.

`q1` = identity, `q2` = 120° about y (`q1·q2 = 0.5`, arc `Ω = 60°`):

| t | turned so far, slerp | turned so far, nlerp |
| --- | --- | --- |
| 0.25 | 30.0° | 27.8° |
| 0.5 | 60.0° | 60.0° |

- same path, **uneven speed**: at most 1.1 times the average rate for this pair
- no `sin`, no `acos`: animation systems blend thousands of joint rotations per frame with nlerp


---

<!-- .slide: class="demo-full" -->

## Slerp, nlerp, and the long way, live

<div class="cockpit" data-demo="quat-slerp" data-controls="t,endAngle,method,flip,play,arc"><pre class="viz-fallback">  q1 = identity, q2 = 120° about y, t = 0.5
     slerp:  q = (0, 0.5, 0, 0.866)      turned 60°     |q| = 1
     nlerp:  t = 0.25 turned 27.8° (slerp 30.0°)
     lerp (straight blend, not normalized):  q = (0, 0.433, 0, 0.75), |q| = 0.866: not a rotation
     use -q2 with no sign check:  q1·q2 = -0.5, a 240° swing the other way</pre></div>


---

## Drift, measured

<img src="../../textbook/figures/rot-drift.svg" alt="error growth over 200,000 float32 compositions: matrix, quaternion, renormalized quaternion" style="height:180px">

200,000 compositions of `R_y(1°)` in float32:

| representation | error after 200,000 steps |
| --- | --- |
| 3×3 matrix product | columns off orthonormal by 5.7e-3 |
| quaternion product | length off 1 by 2.1e-3 |
| quaternion, renormalized each step | 1.8e-8 |

Both drift: the quaternion is repaired by one division, the matrix by a Gram-Schmidt on its columns.


---

## The same rotation in Unity and three.js

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

- both store the same four numbers `(0, 0.259, 0, 0.966)`; Unity's `transform.rotation` is **always** a quaternion
- build with `AngleAxis` / `setFromAxisAngle`; compose with `*` / `multiply`; blend with `Slerp` / `slerp`
- the Inspector *shows* Euler angles; the stored rotation is the quaternion; **units differ**: radians in three.js, degrees in Unity


---

## Pitfall: degrees where radians were expected

```text
   Math.sin(30)             = −0.988      (30 radians = 4.77 turns)
   Math.sin(30 · π / 180)   =  0.5
```

- a rotation built from `30` radians turns the object by `30 mod 2π = 4.867 rad = 278.9°`
- the bug is silent: the result is still a valid rotation, just the wrong one
- rule: convert at the boundary (`THREE.MathUtils.degToRad`, `Mathf.Deg2Rad`), never inside the math


---

### Euler angles and gimbal lock

<small>(~14 min)</small>

---

## Yaw, pitch, roll

<img src="../../textbook/figures/rot-yaw-pitch-roll.svg" alt="an airplane with its three body axes: yaw about up, pitch about the wing axis, roll about the forward axis" style="height:370px">

- **yaw**: turn about the **up** axis (look left or right): Unity's `y`
- **pitch**: turn about the **side** (wing) axis (nose up or down): Unity's `x`
- **roll**: turn about the **forward** axis (bank the wings): Unity's `z`


---

## Euler angles: three turns in a row

Three rotations about three axes, in a **fixed order**. **Intrinsic**: each turn about the object's own, already-turned axis; **extrinsic**: about the fixed world axes.

- one product, two readings: `R_y R_x R_z` right to left is extrinsic Z, X, Y; left to right, intrinsic Y, X, Z
- order *names* use either reading: three.js 'XYZ' is `R_x R_y R_z`; Unity's 'ZXY' is `R_y R_x R_z` (three.js: 'YXZ')
- the table: where the x axis lands for (x, y, z) = (20°, 45°, 10°)

| convention | product | x axis lands at |
| --- | --- | --- |
| Unity `Quaternion.Euler` | `R_y R_x R_z` | (0.738, 0.163, -0.654) |
| three.js default XYZ | `R_x R_y R_z` | (0.696, 0.401, -0.595) |
| aerospace (x roll, y pitch, z yaw) | `R_z R_y R_x` | (0.696, 0.123, -0.707) |


---

## Same three numbers, three poses

<img src="../../textbook/figures/rot-euler-orders.svg" alt="the same three angles under three conventions give three different poses" style="height:380px">

Unity and three.js differ by **15.2°**, Unity and aerospace by 8.2°: name the order whenever you pass Euler angles between tools.


---

## A gimbal is a ring on two pins

<img src="../../textbook/figures/rot-gimbal.svg" alt="at a 90-degree middle angle the inner and outer rotation axes coincide" style="height:230px">

A **gimbal** turns about the line through its two pins. Nest three: three Euler angles. Unity: `Z` inner, `X` middle, `Y` outer. The outer axis is always `ŷ`; after a middle turn of `x` degrees the inner axis is

```text
R_x(x) ẑ = (0, -sin x, cos x)     (the outer turn y spins both together, so take y = 0)
x = 30°:  (0, -0.5, 0.866)        60° from ŷ: a distinct direction
x = 90°:  (0, -1, 0)              along ŷ: the inner Z and outer Y now turn about the same line
```


---

<!-- .slide: class="demo-full" -->

## Gimbal lock, live

<div class="cockpit" data-demo="euler-gimbal" data-controls="x,y,z,order,wiggle"><pre class="viz-fallback">  Unity order: outer Y (yaw), middle X (pitch), inner Z (roll)
  -- (x, y, z) = (20, 45, 10) --  x lands at (0.738, 0.163, -0.654)
                         inner axis 70° from the outer axis
  -- (x, y, z) = (90, 45, 10) --  inner axis = outer axis: LOCKED
                         wiggle outer and wiggle inner swing the airplane about the same axis (opposite senses)</pre></div>


---

## Extraction, and the lock

Reading the triple back from `R` (Unity order); `atan2(s, c)` is the angle whose sine and cosine are proportional to `s` and `c`, in all four quadrants:

```text
R_y R_x R_z:  R12 = -sin x,  R02 = sin y cos x,  R22 = cos y cos x,  R10 = cos x sin z,  R11 = cos x cos z
(20°, 45°, 10°):  x = asin(-R12) = asin(0.342) = 20°
                  y = atan2(R02, R22) = atan2(0.6645, 0.6645) = 45°
                  z = atan2(R10, R11) = atan2(0.163, 0.925) = 10°
(90°, 45°, 10°):  R12 = -1, so x = 90°, but R02 = R22 = R10 = R11 = 0:  atan2(0, 0)
                  only y - z survives (row 0 is (cos(y-z), sin(y-z), 0)): atan2(R01, R00) = 35°
```

At the lock, `(90°, 45°, 10°)` and `(90°, 60°, 25°)` are the **same orientation**.


---

## Two triples, one rotation

```text
   (20°, 45°, 10°)   and   (160°, 225°, 190°)   give the SAME matrix R_y R_x R_z (Unity's order)
```

- with each angle in [0°, 360°), every orientation has **two** Euler triples (away from the lock), and infinitely many at the lock
- so "interpolate the three angles" can take the long way: from `(20, 45, 10)` to `(160, 225, 190)` is a large motion between identical poses
- store and interpolate quaternions; show Euler angles only in the Inspector


---

## Gimbal lock, in flight

The Apollo guidance platform held its orientation on **three gimbals**. Near lock, the crew was warned to steer away; on Apollo 11, when Houston warned that the command module Columbia was close to gimbal lock, Michael Collins answered:

> "How about sending me a fourth gimbal for Christmas?"

<small>Apollo 11 air-to-ground transcript, 1969.</small>

Three gimbals are three Euler angles in hardware. A fourth, redundant gimbal keeps the axes from lining up; a quaternion has no nested axes to line up.


---

## Quaternions have no lock

Gimbal lock is a disease of the **representation**, not of rotation itself:

- three sequential angles have singular configurations: the 90° collapse
- a **quaternion** names axis and angle **directly**: no gimbals to align
- engines **store** quaternions and only **show** Euler angles for editing

The Euler angles are a **chart**: coordinates laid over the rotations, like latitude and longitude over the globe, and like longitude at a pole they fail at some points.


---

<!-- .slide: class="demo-full" -->

## One rotation, five definitions

<div class="cockpit" data-demo="rotation-ways" data-controls="modes,mirror"><pre class="viz-fallback">  define by: columns | axis-angle | quaternion | Euler | from-to; every readout is the same rotation
  -- default: R_y(30) --------------------------------------------
     columns      x lands at (0.866, 0, -0.5), y at (0, 1, 0), z at (0.5, 0, 0.866)
     axis-angle   (0, 1, 0), 30°
     quaternion   (0, 0.259, 0, 0.966)
     Euler        (0, 30, 0), Unity order
     from-to      (1, 0, 0) onto (0.866, 0, -0.5)</pre></div>

