<!--
  CSS 551 · TOPIC DECK: Rotation: matrices, axis-angle, quaternions, Euler angles (~45 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/rotation-quaternions.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES (2D first, a picture or a demo per idea): what a rotation keeps (an F rotated, sheared,
  mirrored); the 2D rotation; the columns are where the axes land (the point (2, 1) as a mix of landed
  axes); R_y as the 2D turn seen from above; orthonormal columns, determinant +1, the transpose as
  inverse; Rodrigues as the 2D rotation inside the plane across the axis, worked on one vector;
  quaternions (why not the matrix: the average of two rotations shrinks; the unit complex number as the
  2D rotation; Hamilton's rule and the product; the half-angle quaternion; the sandwich as three arrows
  tip to tail; why the half angle, one factor at a time; composition as the product, worked against
  matrices, and the order; slerp worked; the double cover and the long way round; what Unity and
  three.js store); Euler angles (yaw, pitch, roll; three turns in a row, extrinsic and intrinsic;
  three conventions give three poses; gimbals and the lock; what locks: the angles, not the airplane); one
  rotation, five definitions.
  SUPPLEMENT: rotation-quaternions-supplement.md (~37 min), mounted after the lecture's wrap and covered
  time permitting: a mirror is not a rotation; R_y(30) column by column, the diagonal axis at 120
  degrees, the trace and the log map, small angles, angular velocity and the linear step (spin-step);
  QMultiplication in both tracks, the sandwich checked by hand, quaternion to matrix and back, order
  matters live (rot-compose), the shortest arc and its opposite-vector case, nlerp, drift measured,
  degrees against radians; Euler extraction at the lock and the two Euler triples.
  EDITED 2026-10-15 (Marcel: "if we apply rotations along one of the axes of the model frame, we should
  never collapse two axes"): the gimbal slide says which two axes line up (a world axis and a body axis,
  never two body axes); the euler-gimbal demo gains own-axis turns (data-controls "own"); "Quaternions
  have no lock" became "What locks: the angles, not the airplane", with the 1-degree table, the 1/cos x
  rate in the note and the Apollo quote kept.
  SPLIT 2026-10-15: 16 slides moved to the supplement (the textbook's Appendix holds the same material).
  TRIMMED 2026-10-15 (Marcel: "trim it and make it more intuitive and visual", ~45 min): seven more
  slides to the supplement (mirror, column-by-column, QMultiplication code, the hand check of the
  sandwich, order live, shortest arc, degrees pitfall); merged: the general question into the split, the
  product into "what a quaternion is", composition with its worked numbers, Apollo into "no lock"; new
  computed figures (gen-textbook-figures-rotation-intuition.mjs): rot-preserve, rot-columns-2d,
  rot-y-topview, rot-rodrigues-plane, rot-matrix-average, rot-complex, rot-sandwich-sum,
  rot-sandwich-halves, rot-euler-steps; a new slide, the 2D rotation as a unit complex number.
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
           quat-slerp, euler-gimbal; all full-slide (demo-full), registry slugs.
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

<small>(~45 min) · reading: <a href="../../textbook/rotation.html">Rotation</a>, Sections 1 to 7</small>


---

### Rotation matrices: where the axes land

<small>(~10 min)</small>

---

## What a rotation must preserve

<img src="../../textbook/figures/rot-preserve.svg" alt="an F shape rotated keeps its lengths, its angles and its handedness; sheared, its lengths and angles change; mirrored, it turns over" style="height:250px">

A rotation keeps a rigid body rigid: **lengths**, **angles** and **handedness** stay, and the **origin** stays put.

Every `v = x x̂ + y ŷ + z ẑ` (`x̂, ŷ, ẑ`: the unit axes) lands at `x (where x̂ goes) + y (where ŷ goes) + z (where ẑ goes)`: a rotation is fixed by **where the axes go**.


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

<img src="../../textbook/figures/rot-columns-2d.svg" alt="the x and y axes land at the two columns of R(30 degrees); the point (2, 1) lands at 2 times column 0 plus 1 times column 1; the unit square lands on a unit square" style="height:300px">

`M (x, y) = x · column 0 + y · column 1`: feed `(1, 0)` and out comes column 0, where the x axis lands. **A rotation matrix is its rotated axes, stacked as columns.**


---

## Lift 2D into 3D: rotate about y

<img src="../../textbook/figures/rot-y-topview.svg" alt="left: the 2D rotation turns x toward y; right: rotation about y seen from above, z to the right and x up, the same counter-clockwise turn" style="height:270px">

```text
            [  cos θ   0   sin θ ]      y is untouched: middle row and column (0, 1, 0)
   R_y(θ) = [   0      1    0    ]      x lands at (cos θ, 0, −sin θ): x tips toward −z
            [ -sin θ   0   cos θ ]      likewise R_x turns y toward z, R_z turns x toward y
```


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

<!-- .slide: class="demo-full" -->

## Where the axes land, live

<div class="cockpit" data-demo="rotation-ways" data-controls="mode:columns,mirror"><pre class="viz-fallback">  choose where x lands (azimuth, elevation) and where y lands (twist about x');
  z' = x' × y' is forced: three numbers fix a rotation
  -- default: R_y(30) --------------------------------------------
     x lands at (0.866, 0, -0.5)   y lands at (0, 1, 0)   z lands at (0.5, 0, 0.866)
     det = +1            mirror on: z' = -(x' × y'), det = -1, not a rotation</pre></div>


---

### Axis-angle: any axis

<small>(~7 min)</small>

---

## Any axis: split v along and across it

<img src="../../textbook/figures/rot-rodrigues.svg" alt="v split into a frozen part along the axis n and a turning part across it" style="height:250px">

Turn by `θ` about **any** unit axis `n` (right-hand rule: thumb along `n`, the fingers curl with the turn). The projection split of the vectors review does the work:

```text
v-par  = (v · n) n          along the axis: frozen
v-perp = v - v-par          across the axis: turns
w      = n × v              the plane's second axis: |w| = |v| sin∠(n, v) = |v-perp|
```


---

## Turn inside the plane: Rodrigues

<img src="../../textbook/figures/rot-rodrigues-plane.svg" alt="left: v, its frozen part along n, its turning part and w on the circle across the axis; right: that plane seen from the tip of n, where the turn is the 2D rotation by 30 degrees" style="height:280px">

```text
v-perp' = cos θ · v-perp + sin θ · w                  the 2D rotation, with v-perp and w as the axes
v'      = v-par + v-perp'
        = cos θ · v  +  (1 − cos θ)(v · n) n  +  sin θ · (n × v)          Rodrigues' formula
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

### Quaternions

<small>(~19 min)</small>

---

## The trouble with storing the matrix

<img src="../../textbook/figures/rot-matrix-average.svg" alt="averaging the matrices of a 0 and a 120 degree rotation gives half of the 60 degree rotation: the shape shrinks to half size" style="height:270px">

- **interpolation**: the average of two rotation matrices is not a rotation; here it is half of `R(60°)`
- **drift**: products of many matrices in floating point stop being orthonormal; shapes shear
- **size**: nine numbers and six constraints for three degrees of freedom


---

## In 2D, a rotation is a unit complex number

<img src="../../textbook/figures/rot-complex.svg" alt="multiplying 2 + i by cos 30 + i sin 30 turns it 30 degrees to 1.232 + 1.866i; multiplying two unit complex numbers adds their angles" style="height:300px">

Write `(x, y)` as `x + y i`, with `i² = −1`. Multiplying by `cos θ + i sin θ` gives `(x cos θ − y sin θ) + (x sin θ + y cos θ) i`: **the 2D rotation, as one product**. Two turns: multiply, and the angles add, in either order.


---

## What a quaternion is

Hamilton's 3D version, carved into Broom Bridge, Dublin, on 16 October 1843: **three** imaginary units, `w + x i + y j + z k`, with

```text
   i² = j² = k² = ijk = −1:     ij = k,  jk = i,  ki = j     but     ji = −k,  kj = −i,  ik = −j
```

Written as (vector part, scalar part), `q = (qv, qw)`, the product is a dot, a cross and two scalings:

```text
   q r = ( qw rv + rw qv + qv × rv ,   qw rw − qv · rv )
```

- engines store `(x, y, z, w)`; `w` is the **scalar part** (not Rodrigues' `w = n × v`)
- the cross product makes `q r ≠ r q`: 3D rotations do not commute either


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

## Applying a quaternion: the sandwich

<img src="../../textbook/figures/rot-sandwich-sum.svg" alt="seen from above, p = (1, 0, 0) plus the two correction terms, tip to tail, lands at (0, 0, -1): a 90 degree turn about y" style="height:260px">

Write the point as `(p, 0)` and multiply on **both** sides: `p' = q p q⁻¹`, where `q⁻¹ = (−x, −y, −z, w)`, the **conjugate**. Expanded, with no trig:

```text
p' = p + 2w (qv × p) + 2 qv × (qv × p)
```


---

## Why the half angle

<img src="../../textbook/figures/rot-sandwich-halves.svg" alt="across the axis, q p turns p by 45 degrees and the right factor turns it another 45; along the axis, q p tips into the scalar part and the right factor tips it back" style="height:280px">

- **across** the axis, each side of `q p q⁻¹` turns `p` by `θ/2`: `θ` in all
- **along** the axis, the left factor tips `p` into `w`; the right one tips it back
- so `q` itself has turned only `θ/2`: at 360°, `q = (0, 0, 0, −1)`, **minus** the identity


---

<!-- .slide: class="demo-full" -->

## The half angle, live

<div class="cockpit" data-demo="axis-angle" data-controls="angle,halfangle"><pre class="viz-fallback">  the cube turns θ about y; q = (0, sin(θ/2), 0, cos(θ/2)) turns θ/2
     θ =  30:  q = (0, 0.259, 0, 0.966)
     θ = 180:  q = (0, 1, 0, 0)          w = 0
     θ = 360:  q = (0, 0, 0, -1)         the cube is home; q is minus the identity
     θ = 720:  q = (0, 0, 0, 1)          q is home</pre></div>


---

## Composing = multiplying

<img src="../../textbook/figures/rot-noncommute.svg" alt="an airplane turned 90 degrees about x then 90 about y, and 90 about y then 90 about x: the final poses differ" style="height:270px">

`q1` then `q2`: `q2 (q1 p q1⁻¹) q2⁻¹ = (q2 q1) p (q2 q1)⁻¹`, so **the product `q2 q1` is the composite** (the right factor acts first, as with matrices).

```text
R_y(30°) first, then R_x(30°):  q = qx qy = (0.25, 0.25, 0.067, 0.933),  |q|² = 1
on (1, 2, 3): (2.366, 0.683, 2.817), the same as the matrices R_x(30°) R_y(30°)
the other order:  qy qx = (0.25, 0.25, −0.067, 0.933), a pose 15.4° away
```


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

`q` and `-q` give the **same matrix** (the sandwich `q v q*` uses `q` twice, so the two signs cancel): two quaternions per rotation, the **double cover**.

```text
q1 = identity,  q2 = R_y(120°) = (0, 0.866, 0, 0.5),  −q2 = (0, −0.866, 0, −0.5): same rotation
q1 · (−q2) = −0.5  ->  slerp toward −q2 walks Ω = 120° in 4D  ->  a 240° turn: the long way round
fix: if q1 · q2 < 0, negate q2 first (same rotation, the short arc)
```


---

<!-- .slide: class="demo-full" -->

## Slerp, nlerp, and the long way, live

<div class="cockpit" data-demo="quat-slerp" data-controls="t,endAngle,method,flip,play,arc"><pre class="viz-fallback">  q1 = identity, q2 = 120° about y, t = 0.5
     slerp:  q = (0, 0.5, 0, 0.866)      turned 60°     |q| = 1
     nlerp:  t = 0.25 turned 27.8° (slerp 30.0°)
     lerp (straight blend, not normalized):  q = (0, 0.433, 0, 0.75), |q| = 0.866: not a rotation
     use -q2 with no sign check:  q1·q2 = -0.5, a 240° swing the other way</pre></div>


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

### Euler angles and gimbal lock

<small>(~9 min)</small>

---

## Yaw, pitch, roll

<img src="../../textbook/figures/rot-yaw-pitch-roll.svg" alt="a Cessna 208 model with its three body axes: yaw about up, pitch about the wing axis, roll about the forward axis" style="height:370px">

- **yaw**: turn about the **up** axis (look left or right): Unity's `y`
- **pitch**: turn about the **side** (wing) axis (nose up or down): Unity's `x`
- **roll**: turn about the **forward** axis (bank the wings): Unity's `z`


---

## Euler angles: three turns in a row

<img src="../../textbook/figures/rot-euler-steps.svg" alt="Unity's Euler angles (20, 45, 10) built as roll 10 degrees about z, then pitch 20 about x, then yaw 45 about y, each about the fixed world axis" style="height:260px">

Three turns about three axes in a **fixed order**: Unity's `Quaternion.Euler(x, y, z)` is the product `R_y R_x R_z`.

- **extrinsic**, right to left: about the fixed world axes, z, then x, then y (the figure)
- **intrinsic**, left to right: about the body's own turned axes, y, then x, then z


---

## Same three numbers, three poses

<img src="../../textbook/figures/rot-euler-orders.svg" alt="the same three angles under three conventions give a Cessna 208 model three different poses" style="height:380px">

Unity and three.js differ by **15.2°**, Unity and aerospace by 8.2°: name the order whenever you pass Euler angles between tools.


---

## A gimbal is a ring on two pins

<img src="../../textbook/figures/rot-gimbal.svg" alt="a Cessna 208 model pitched 30 and 90 degrees: at 90 degrees, nose straight down, the inner and outer rotation axes coincide" style="height:260px">

A **gimbal** turns about the line through its two pins. Nest three: three Euler angles. Unity: `Y` outer, `X` middle, `Z` inner. The outer axis is fixed to the **world** (always `ŷ`); the inner axis is fixed to the **airplane** (its nose), so the middle turn carries it:

```text
R_x(x) ẑ = (0, -sin x, cos x)     (the outer turn y spins both together, so take y = 0)
x = 30°:  (0, -0.5, 0.866)        60° from ŷ: a distinct direction
x = 90°:  (0, -1, 0)              along ŷ: the airplane's nose axis lies on the world's ŷ
```


---

<!-- .slide: class="demo-full" -->

## Gimbal lock, live

<div class="cockpit" data-demo="euler-gimbal" data-controls="x,y,z,order,wiggle,own"><pre class="viz-fallback">  Unity order: outer Y (yaw), middle X (pitch), inner Z (roll)
  -- (x, y, z) = (20, 45, 10) --  x lands at (0.738, 0.163, -0.654)
                         inner axis 70° from the outer axis
  -- (x, y, z) = (90, 45, 10) --  inner axis = outer axis: LOCKED
                         wiggle outer and wiggle inner swing the airplane about the same axis (opposite senses)
  -- (x, y, z) = (89, 0, 0), turn the airplane 1° about its own fin axis --
                         the angles move by x -0.41°, y +45.00°, z +45.00°</pre></div>


---

## What locks: the angles, not the airplane

The airplane's own axes stay perpendicular; turning it about any of them always works. What fails is **reading the pose back as three angles**. Turn the airplane 1° about its own fin axis; Unity's angles move by:

```text
pitch x      y         z
  20°        1.06°     0.36°
  60°        2.00°     1.73°
  80°        5.74°     5.65°
  89°        45°       45°
  90°        90°       90°      for any turn, however small
```

- Euler angles are a **chart**, like longitude: at the pole, one step can change it by 90°
- engines **store** quaternions (no nested axes to line up) and **show** Euler angles

> "How about sending me a fourth gimbal for Christmas?"

<small>Michael Collins, Apollo 11, when Houston warned that Columbia's three-gimbal guidance platform was near lock; air-to-ground transcript, 1969.</small>


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

