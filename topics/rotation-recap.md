<!--
  CSS 551 · TOPIC DECK: Rotation, from 2D to Rodrigues, Euler angles, quaternions (~45 min, 39 slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/rotation-recap.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES (a slower second pass, for a room that needs the linear algebra rebuilt; 3x3 only, no
  homogeneous coordinates): what a rotation keeps; the 2D rotation derived from the angle-sum
  identities; Sung's worked (8, 4) by 45 degrees and the whole rectangle turned; the columns are where
  the axes land; the three axis rotations as 3x3 matrices; orthonormal columns, determinant +1, the
  transpose as inverse; order matters (two quarter turns on (1, 0, 0)); Rodrigues' formula derived in
  five steps (split, the along part stays, a second axis w = n x v, the 2D turn in the plane, add back
  and simplify), three checks, a tilted-axis example that ties back to the two quarter turns, the
  matrix form, the code in both tracks, the demo; Euler angles (yaw, pitch, roll; three turns in a row;
  Unity's and three.js's orders; gimbals and the lock; what locks: the angles, not the airplane);
  quaternions as rules, not derived (Hamilton's rules, the product as a dot and a cross, the rotation
  quaternion with the half angle stated, conjugate and inverse, the sandwich worked by hand,
  composition, unit length and the sign, slerp, the API in both tracks); one rotation, five definitions.
  RELATION to rotation-quaternions.md (the L04 topic, unchanged): this deck reuses its figures, demos and
  numbers; it drops the complex-number bridge and the half-angle derivation ("why the half angle", the
  half-angle demo), and adds the 2D derivation from the trig identities, Sung's two figures, the
  step-by-step Rodrigues derivation, the tilted-axis example, the K-matrix form and the Rodrigues code.
  NEEDS:   the linear-algebra recap topic (the projection split, the cross product, the angle-sum link);
           mount it after that topic.
  DEMOS:   axis-angle (angle,rodrigues), euler-gimbal (x,y,z,order,wiggle,own), quat-slerp
           (t,endAngle,method,flip,play,arc), rotation-ways (modes,mirror); all full-slide (demo-full),
           registry slugs, embeds copied from rotation-quaternions.md.
  NUMBERS: recomputed by node on 2026-10-20 against lib/core/xform.js (axisAngleMatrix,
           quatFromAxisAngle), lib/core/rot-reps.js (quatMul, quatConj, quatRotate, quatToAxisAngle,
           slerp, eulerMatrix) and lib/vendor/three.module.js (applyAxisAngle, setFromAxisAngle,
           multiply, premultiply, applyQuaternion, slerpQuaternions, Euler 'YXZ'); the rest are the
           L04 topic's numbers (textbook/figures/numbers-foundations.json, key rot).
  FIGURES: ../../textbook/figures/rot-*.svg (tools/gen-textbook-figures-foundations.mjs and
           tools/gen-textbook-figures-rotation-intuition.mjs); ../../topics/media/css451/sung-ch08-s18.webp
           and sung-ch08-s20.webp (slides 18 and 20 of Kelvin Sung's CSS 451 Chapter 8 deck, recovered
           in old/CSS-451/html-recovered/slides/).
  READING: ../../textbook/rotation.html.
  SOURCE:  derived 2026-10-20 from rotation-quaternions.md (L04) and Sung's CSS 451 Chapter 8 slides
           (Sung, Shirley, Baer, Essentials of Interactive Computer Graphics).

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Paths are relative to the
  lecture page that mounts this topic (lectures/LNN-slug/index.html).
-->

### Rotation: from 2D to Rodrigues, Euler angles, quaternions

<small>(~45 min) · reading: <a href="../../textbook/rotation.html">Rotation</a></small>


---

### Rotation matrices, a review

<small>(~10 min)</small>


---

## What a rotation must preserve

<img src="../../textbook/figures/rot-preserve.svg" alt="an F shape rotated keeps its lengths, its angles and its handedness; sheared, its lengths and angles change; mirrored, it turns over" style="height:250px">

A rotation keeps a rigid body rigid:

- **lengths** stay
- **angles** stay
- **handedness** stays (no mirror image)
- the **origin** stays put


---

## Rotating a point in 2D: the angle-sum identities

<img src="../../textbook/figures/rot-2d.svg" alt="the point (2, 1) rotated by 30 degrees about the origin lands at (1.232, 1.866); its length stays 2.236" style="height:210px">

```text
a point at radius r and angle φ:        x = r cos φ             y = r sin φ
turn it by θ, so its angle is φ + θ:    x' = r cos(φ + θ)       y' = r sin(φ + θ)
the angle sums:    cos(φ + θ) = cos φ cos θ − sin φ sin θ
                   sin(φ + θ) = sin φ cos θ + cos φ sin θ
multiply by r:     x' = x cos θ − y sin θ
                   y' = x sin θ + y cos θ
```

Positive θ turns counter-clockwise, x toward y. The identities: [trig cheat sheet](../../reference/trig-cheat-sheet.html), Sum and difference.


---

## Worked: (8, 4) turned by 45°

<img src="../../topics/media/css451/sung-ch08-s18.webp" alt="Sung's slide: the operator R(45 degrees) turns the vertex (8, 4) to (2.83, 8.49) along a circle about the origin" style="height:340px">
<span class="credit">K. Sung, CSS 451 slides, ch. 8 (Sung, Shirley, Baer, Essentials of Interactive Computer Graphics)</span>

```text
x' = 8 cos 45° − 4 sin 45° = (8 − 4)(0.7071) = 2.828       length before: √(8² + 4²) = 8.944
y' = 8 sin 45° + 4 cos 45° = (8 + 4)(0.7071) = 8.485       length after:  √(2.828² + 8.485²) = 8.944
```


---

## Rotate every vertex: the whole object turns

<img src="../../topics/media/css451/sung-ch08-s20.webp" alt="Sung's slide: a rectangle with corners (5, 2), (8, 2), (8, 4), (5, 4) rotated by 45 degrees about the origin" style="height:340px">
<span class="credit">K. Sung, CSS 451 slides, ch. 8 (Sung, Shirley, Baer, Essentials of Interactive Computer Graphics)</span>

The same `R(45°)` on each corner: `(5, 2)` → `(2.121, 4.950)` and `(8, 2)` → `(4.243, 7.071)`. The bottom edge is 3 long before and after.


---

## The columns are where the axes go

<img src="../../textbook/figures/rot-columns-2d.svg" alt="the x and y axes land at the two columns of R(30 degrees); the point (2, 1) lands at 2 times column 0 plus 1 times column 1; the unit square lands on a unit square" style="height:300px">

`M (x, y) = x · column 0 + y · column 1`: feed `(1, 0)` and out comes column 0, where the x axis lands. **A rotation matrix is its rotated axes, stacked as columns.**


---

## Three axis rotations in 3D

```text
           [ cos θ   −sin θ    0 ]
  R_z(θ) = [ sin θ    cos θ    0 ]        turns x toward y
           [   0        0      1 ]

           [ 1     0        0    ]
  R_x(θ) = [ 0   cos θ   −sin θ  ]        turns y toward z
           [ 0   sin θ    cos θ  ]

           [  cos θ   0   sin θ ]
  R_y(θ) = [    0     1     0   ]        turns z toward x, so x tips toward −z
           [ −sin θ   0   cos θ ]
```

- each is the 2D rotation, placed in the plane across its axis
- the axis's own row and column are 0 except a 1 on the diagonal: that axis does not move
- `R_y` looks flipped (`+sin θ` top right) because its plane is read z, then x


---

## Orthonormal columns, determinant +1

`R_y(30°)` has columns `(0.866, 0, -0.5)`, `(0, 1, 0)`, `(0.5, 0, 0.866)`:

```text
col0 · col0 = 0.866² + 0.5² = 0.75 + 0.25 = 1         every column has length 1
col0 · col2 = 0.866(0.5) + 0 + (-0.5)(0.866) = 0      every pair is perpendicular
det R = col0 · (col1 × col2) = 1                       the triple product: volume +1, right-handed
Rᵀ (0.866, 0, -0.5) = (col0 · col0, col1 · col0, col2 · col0) = (1, 0, 0)    R⁻¹ = Rᵀ
```

- **orthonormal**: unit length and mutually perpendicular
- **Rᵀ** (the transpose): rows written as columns; for a rotation it is the inverse, so undoing a rotation costs nothing
- nine numbers, six constraints, **three degrees of freedom** (three numbers you can still choose)


---

## Order matters: two quarter turns

<img src="../../textbook/figures/rot-noncommute.svg" alt="an airplane turned 90 degrees about x then 90 about y, and 90 about y then 90 about x: the final poses differ" style="height:230px">

```text
R_x(90°) = [ 1 0  0 ]     R_y(90°) = [  0 0 1 ]
           [ 0 0 −1 ]                [  0 1 0 ]
           [ 0 1  0 ]                [ −1 0 0 ]
R_x(90°) R_y(90°) (1, 0, 0):    R_y first: (0, 0, −1),    then R_x: (0, 1, 0)
R_y(90°) R_x(90°) (1, 0, 0):    R_x first: (1, 0, 0),     then R_y: (0, 0, −1)
```

In `R2 R1 v` the **rightmost** matrix acts first. 2D turns commute (the angles add); 3D turns about different axes do not.


---

### Rodrigues' formula, step by step

<small>(~14 min)</small>


---

## Turn about any axis: the plan

<img src="../../textbook/figures/rot-rodrigues.svg" alt="v split into a frozen part along the axis n and a turning part across it" style="height:250px">

Turn `v` by `θ` about a **unit** axis `n` (right-hand rule: thumb along `n`, the fingers curl with the turn):

1. split `v` into a part **along** `n` and a part **across** `n`
2. the along part does not move
3. build a second axis in the plane across `n`
4. turn the across part in that plane, exactly as in 2D
5. add the two parts back


---

## Step 1: split v along and across the axis

```text
v-par  = (v · n) n          the projection of v onto the unit axis: the along part
v-perp = v − v-par          what is left: the across part, perpendicular to n

v · n  = 1(0) + 0.6(1) + 0.3(0) = 0.6
v-par  = 0.6 (0, 1, 0) = (0, 0.6, 0)
v-perp = (1, 0.6, 0.3) − (0, 0.6, 0) = (1, 0, 0.3)          check: v-perp · n = 0
```

- **step 2**: `v-par` lies on the axis, and points on the axis do not move: `v-par` stays `(0, 0.6, 0)`


---

## Step 3: a second axis in the turning plane, w = n × v

```text
w = n × v = (1·0.3 − 0·0.6,  0·1 − 0·0.3,  0·0.6 − 1·1) = (0.3, 0, −1)

why n × v and n × v-perp are the same:   n × v = n × v-par + n × v-perp = 0 + n × v-perp
w is perpendicular to n and to v-perp:   w · n = 0          w · v-perp = 0.3(1) + 0 + (−1)(0.3) = 0
w is as long as v-perp:                  |w| = |n| |v-perp| sin 90° = |v-perp| = 1.044
```

`v-perp` and `w`: two perpendicular arrows of the **same length**, both across `n`. They are the x and y axes of a little 2D picture.


---

## Step 4: turn inside the plane, as in 2D

<img src="../../textbook/figures/rot-rodrigues-plane.svg" alt="left: v, its frozen part along n, its turning part and w on the circle across the axis; right: that plane seen from the tip of n, where the turn is the 2D rotation by 30 degrees" style="height:270px">

In 2D, the x axis turned by θ is `cos θ (1, 0) + sin θ (0, 1)`. In the plane, `v-perp` plays x and `w` plays y:

```text
v-perp' = cos θ v-perp + sin θ w = 0.866 (1, 0, 0.3) + 0.5 (0.3, 0, −1) = (1.016, 0, −0.240)
```


---

## Step 5: add back, then simplify

```text
v' = v-par + v-perp'
   = (v · n) n  +  cos θ (v − (v · n) n)  +  sin θ (n × v)          substitute v-perp and w
   = cos θ v  +  (1 − cos θ)(v · n) n  +  sin θ (n × v)              collect the (v · n) n terms

worked:  v' = (0, 0.6, 0) + (1.016, 0, −0.240) = (1.016, 0.6, −0.240)
the library's R_y(30°) v = (1.016, 0.6, −0.240)
```

**Rodrigues' formula**: one dot, one cross, three scalings, no matrix.


---

## Three checks

```text
θ = 0:          cos 0 = 1, sin 0 = 0
                v' = v + 0 + 0 = v                                   no turn, no change
v along n:      v = a n,  so n × v = 0  and  (v · n) n = v
                v' = cos θ v + (1 − cos θ) v + 0 = v                  the axis stays put
n = (0, 0, 1):  v · n = z,   n × v = (−y, x, 0)
                v' = (x cos θ − y sin θ,  x sin θ + y cos θ,  z)      the rows of R_z(θ)
```


---

## Worked: a tilted axis

`n = (1, 1, 1)/√3 = (0.577, 0.577, 0.577)`, `θ = 120°` (cos θ = −0.5, sin θ = 0.866, 1 − cos θ = 1.5), `v = (1, 0, 0)`:

```text
v · n = 0.577          (v · n) n = (0.333, 0.333, 0.333)          n × v = (0, 0.577, −0.577)
v' = −0.5 (1, 0, 0)  +  1.5 (0.333, 0.333, 0.333)  +  0.866 (0, 0.577, −0.577)
   = (−0.5 + 0.5 + 0,   0 + 0.5 + 0.5,   0 + 0.5 − 0.5) = (0, 1, 0)
```

- the same turn sends y to z and z to x: it **cycles the three axes**
- it is the matrix `R_x(90°) R_y(90°)` of the order slide: two quarter turns are one 120° turn about the diagonal


---

## The same formula as a matrix

```text
     [  0   −nz    ny ]
K =  [  nz    0   −nx ]        K v = n × v: the cross product with n, written as a matrix
     [ −ny   nx    0  ]

R = I + sin θ K + (1 − cos θ) K²

n = (0, 1, 0), θ = 30°:    K = [ 0 0 1 ; 0 0 0 ; −1 0 0 ]      K² = [ −1 0 0 ; 0 0 0 ; 0 0 −1 ]
R = [ 0.866 0 0.5 ; 0 1 0 ; −0.5 0 0.866 ] = R_y(30°)
```


---

## Real code: Rodrigues, both tracks

<div class="code-tabs">

```csharp
// turn v by angleDeg degrees about the unit axis n
static Vector3 RotateAboutAxis(Vector3 v, Vector3 n, float angleDeg)
{
    float theta = angleDeg * Mathf.Deg2Rad;
    float c = Mathf.Cos(theta);
    float s = Mathf.Sin(theta);
    Vector3 along = Vector3.Dot(v, n) * n;    // steps 1 and 2: stays
    Vector3 across = v - along;               // turns
    Vector3 w = Vector3.Cross(n, v);          // step 3: the second axis
    return along + c * across + s * w;        // steps 4 and 5
}
// check: Quaternion.AngleAxis(angleDeg, n) * v gives the same vector
```

```javascript
// turn v by angle radians about the unit axis n (THREE.Vector3s)
function rotateAboutAxis(v, n, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const along = n.clone().multiplyScalar(v.dot(n));     // steps 1 and 2: stays
  const across = v.clone().sub(along);                  // turns
  const w = new THREE.Vector3().crossVectors(n, v);     // step 3: the second axis
  return along.add(across.multiplyScalar(c)).add(w.multiplyScalar(s));  // steps 4 and 5
}
// check: v.clone().applyAxisAngle(n, angle) gives the same vector
```

</div>


---

<!-- .slide: class="demo-full" -->

## Rodrigues, live

<div class="cockpit" data-demo="axis-angle" data-controls="angle,rodrigues"><pre class="viz-fallback">  v = (1, 0.6, 0.3) about n = (0, 1, 0):
     v·n = 0.6     v-par = (0, 0.6, 0)     v-perp = (1, 0, 0.3)     w = n × v = (0.3, 0, -1)
  -- angle 30 deg ----------------------------------------------
     v' = cos θ v + (1 - cos θ)(v·n) n + sin θ (n × v) = (1.016, 0.6, -0.240)
     v' sweeps a circle of radius |v-perp| = 1.044 at height v·n = 0.6</pre></div>


---

### Euler angles and gimbal lock

<small>(~8 min)</small>


---

## Yaw, pitch, roll

<img src="../../textbook/figures/rot-yaw-pitch-roll.svg" alt="a Cessna 208 model with its three body axes: yaw about up, pitch about the wing axis, roll about the forward axis" style="height:370px">

- **yaw**: turn about the **up** axis (look left or right): Unity's `y`
- **pitch**: turn about the **side** (wing) axis (nose up or down): Unity's `x`
- **roll**: turn about the **forward** axis (bank the wings): Unity's `z`


---

## Euler angles: three turns in a row

<img src="../../textbook/figures/rot-euler-steps.svg" alt="Unity's Euler angles (20, 45, 10) built as roll 10 degrees about z, then pitch 20 about x, then yaw 45 about y, each about the fixed world axis" style="height:210px">

| convention | product | about world axes | about own axes |
| --- | --- | --- | --- |
| Unity | `R_y R_x R_z` | z, x, y | y, x, z |
| three.js, default `'XYZ'` | `R_x R_y R_z` | z, y, x | x, y, z |

Unity's order is three.js's `'YXZ'`. The same three numbers under the two orders differ by 15.2°.


---

## A gimbal is a ring on two pins

<img src="../../textbook/figures/rot-gimbal.svg" alt="a Cessna 208 model pitched 30 and 90 degrees: at 90 degrees, nose straight down, the inner and outer rotation axes coincide" style="height:260px">

A **gimbal** turns about the line through its two pins. Nest three: three Euler angles. Unity: `Y` outer, `X` middle, `Z` inner. The outer axis is fixed to the **world**; the inner axis is fixed to the **airplane** (its nose), so the middle turn carries it:

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

Turning the airplane about its own axes always works. What fails is **reading the pose back as three angles**. Turn it 1° about its own fin axis; Unity's angles move by:

```text
pitch x      y         z
  20°        1.06°     0.36°
  60°        2.00°     1.73°
  80°        5.74°     5.65°
  89°        45°       45°
```

- Euler angles are like longitude: at the pole, one small step can change it by 90°
- engines **store** quaternions (no nested axes to line up) and **show** Euler angles

> "How about sending me a fourth gimbal for Christmas?"

<small>Michael Collins, Apollo 11, when Houston warned that the guidance platform was near lock; air-to-ground transcript, 1969.</small>


---

### Quaternions: the rules

<small>(~12 min)</small>


---

## What a quaternion is

Four numbers, written with three imaginary units:

```text
q = w + x i + y j + z k          stored as (x, y, z, w) in Unity and three.js
w: the scalar part               (x, y, z): the vector part, written qv
```

Hamilton's rules for the units, carved into Broom Bridge, Dublin, on 16 October 1843:

```text
i² = j² = k² = ijk = −1
ij = k     jk = i     ki = j
ji = −k    kj = −i    ik = −j          the order matters: ij ≠ ji
```


---

## The product: a dot and a cross

With `q = (qv, qw)` and `r = (rv, rw)`, the rules multiply out to:

```text
q r = ( qw rv + rw qv + qv × rv ,    qw rw − qv · rv )
        vector part                   scalar part
```

Worked, `i j` with `i = (1, 0, 0, 0)` and `j = (0, 1, 0, 0)`: vector `0 + 0 + (1, 0, 0) × (0, 1, 0) = (0, 0, 1)`, scalar `0 − 0 = 0`, so `i j = (0, 0, 1, 0) = k`; swap the factors and the cross flips: `j i = −k`.

- the **dot** and the **cross** of the vector parts, plus scalings
- only the cross term changes when the order changes: `q r ≠ r q` in general


---

## A rotation as a quaternion

The rule: a turn by `θ` about the unit axis `n` is the quaternion

```text
q = ( sin(θ/2) n ,  cos(θ/2) )          the half angle
```

- unit length: `sin²(θ/2) + cos²(θ/2) = 1`
- no turn (`θ = 0`): `q = (0, 0, 0, 1)`, the **identity** quaternion

```text
90° about z:   half angle 45°:   q = (0, 0, 0.7071, 0.7071)
30° about y:   half angle 15°:   q = (0, 0.259, 0, 0.966)            0.259² + 0.966² = 1
90° about x:   q = (0.7071, 0, 0, 0.7071)        90° about y:   q = (0, 0.7071, 0, 0.7071)
```


---

## Conjugate and inverse

```text
q* = (−x, −y, −z, w)          the conjugate: flip the vector part
q q* = (0, 0, 0, 1)            for a unit q: the conjugate is the inverse
```

Worked, 90° about z: `q* = (0, 0, −0.7071, 0.7071)`, the turn by −90° about z. With the product rule: vector `0.7071 (0, 0, −0.7071) + 0.7071 (0, 0, 0.7071) + 0 = 0`, scalar `0.7071² + 0.7071² = 1`.

- undoing a rotation costs one sign flip, like the transpose of a rotation matrix


---

## Rotate a vector: the sandwich, by hand

The rule: write the vector as a quaternion with zero scalar part, `(v, 0)`, and multiply on both sides:

```text
v' = q (v, 0) q*
q = 90° about z = (0, 0, 0.7071, 0.7071),   v = (1, 0, 0)

q (v, 0):   vector 0.7071 (1, 0, 0) + 0 + (0, 0, 0.7071) × (1, 0, 0) = (0.7071, 0.7071, 0)
            scalar 0.7071(0) − (0, 0, 0.7071) · (1, 0, 0) = 0
(that) q*:  vector 0 + 0.7071 (0.7071, 0.7071, 0) + (0.7071, 0.7071, 0) × (0, 0, −0.7071)
                 = (0.5, 0.5, 0) + (−0.5, 0.5, 0) = (0, 1, 0)
            scalar 0 − 0 = 0
v' = (0, 1, 0)                 x turned 90° about z lands on y
```


---

## Composing = multiplying

`q1` first, then `q2`: the product **`q2 q1`** (the right factor acts first, as with matrices).

```text
qx = 90° about x = (0.7071, 0, 0, 0.7071)       qy = 90° about y = (0, 0.7071, 0, 0.7071)
qx qy:  vector 0.7071 (0, 0.7071, 0) + 0.7071 (0.7071, 0, 0) + (0.7071, 0, 0) × (0, 0.7071, 0)
             = (0, 0.5, 0) + (0.5, 0, 0) + (0, 0, 0.5) = (0.5, 0.5, 0.5)
        scalar 0.7071(0.7071) − 0 = 0.5
qx qy = (0.5, 0.5, 0.5, 0.5):   cos(θ/2) = 0.5, θ = 120°, axis (1, 1, 1)/√3       on (1, 0, 0): (0, 1, 0)
qy qx = (0.5, 0.5, −0.5, 0.5):  120° about (1, 1, −1)/√3                           on (1, 0, 0): (0, 0, −1)
```

The two quarter turns of the order slide, a third time: the same answers as `R_x(90°) R_y(90°)` and Rodrigues.


---

## Keep it a rotation: unit length, and q or −q

- **renormalize**: products of many quaternions drift off length 1 in floating point; divide by the length now and then
- **two quaternions per rotation**: `q` and `−q` give the same `v'` (the sandwich uses `q` twice, so the signs cancel)

```text
q  = (0, 0.259, 0, 0.966):        (1, 0, 0) turns to (0.866, 0, −0.5)
−q = (0, −0.259, 0, −0.966):      (1, 0, 0) turns to (0.866, 0, −0.5)
blending from q1 to q2: if q1 · q2 < 0 (the four-number dot), use −q2: the short way round
```


---

## Slerp: blending orientations

<img src="../../textbook/figures/rot-slerp.svg" alt="slerp walks the great arc; the plain average leaves the unit sphere" style="height:200px">

Unit quaternions are the points of length 1: a **sphere in 4D**. **Slerp** (spherical linear interpolation) walks the shortest arc on it, from `q1` at `t = 0` to `q2` at `t = 1`, at constant speed:

```text
slerp(q1, q2, t) = ( sin((1 − t)Ω) q1 + sin(tΩ) q2 ) / sin Ω            cos Ω = q1 · q2
q1 = identity (0, 0, 0, 1),  q2 = 120° about y = (0, 0.866, 0, 0.5):     cos Ω = 0.5, Ω = 60°
t = 1/2:   (0, 0.5, 0, 0.866), the quaternion of 60° about y: halfway, and still a rotation
plain average (q1 + q2)/2 = (0, 0.433, 0, 0.75): length 0.866, not a rotation
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

## The same operations in Unity and three.js

<div class="code-tabs">

```csharp
// Unity: angles in degrees; a * b applies b first
Quaternion qx = Quaternion.AngleAxis(90f, Vector3.right);
Quaternion qy = Quaternion.AngleAxis(90f, Vector3.up);
Quaternion both = qx * qy;                          // qy first, then qx
Vector3 p = both * new Vector3(1, 0, 0);            // (0, 1, 0)
Quaternion back = Quaternion.Inverse(both);         // the conjugate
Quaternion half = Quaternion.Slerp(Quaternion.identity, both, 0.5f);
Quaternion fromEuler = Quaternion.Euler(20f, 45f, 10f);   // R_y R_x R_z
```

```javascript
// three.js: angles in radians; a.multiply(b) is a b (b acts first)
const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
const both = qx.clone().multiply(qy);               // qy first, then qx
const p = new THREE.Vector3(1, 0, 0).applyQuaternion(both);   // (0, 1, 0)
const back = both.clone().invert();                 // the conjugate
const identity = new THREE.Quaternion();
const half = new THREE.Quaternion().slerpQuaternions(identity, both, 0.5);
const e = new THREE.Euler(0.349, 0.785, 0.175, 'YXZ');      // Unity's order
const fromEuler = new THREE.Quaternion().setFromEuler(e);
```

</div>


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

