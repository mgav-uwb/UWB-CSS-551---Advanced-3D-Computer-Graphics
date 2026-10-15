<!--
  CSS 551 · TOPIC DECK (supplement): Rotation, further (~37 min).
  Mounted after the lecture's wrap that mounts rotation-quaternions.md, and covered time permitting:
  nothing later in the course, no homework and no quiz item needs it. Its slides are the rotation topic's
  deeper material, in the topic's order; the textbook's Rotation Appendix covers the same ground.

  TEACHES: a mirror is not a rotation (det −1, two mirrors make one); R_y(30) built column by column;
  the diagonal axis at 120 degrees (a permutation of the axes); the trace and why it is
  1 + 2 cos θ; reading axis and angle back out of a matrix (the log map) and its failure near a half
  turn; small rotations to first order, angular velocity, and the drift of a linear step (live);
  the quaternion product in both tracks (QMultiplication); the sandwich checked by hand on one point;
  quaternion to matrix and matrix to quaternion (Shepperd's branch), worked on the composed rotation;
  order matters, live; the shortest arc and turning a vector onto its opposite; nlerp; drift measured
  over 200,000 float32 compositions; degrees where radians were expected; Euler extraction in Unity's
  order, the lock, and the two triples of one orientation.
  NEEDS:   rotation-quaternions.md, mounted before it (the slides use its R_y(30), its composed rotation
           R_x(30)·R_y(30), its shortest-arc formula and its slerp pair).
  DEMOS:   spin-step, rot-compose (full slides, demo-full), registry slugs.
  NUMBERS: textbook/figures/numbers-foundations.json (key rot) and the motion numbers (anim.slerp), or node
           against lib/core/xform.js and lib/core/rot-reps.js, as in the topic.
  FIGURES: ../../textbook/figures/rot-reflection.svg, rot-trace.svg, rot-tangent-step.svg, rot-shortest-arc.svg, rot-drift.svg.
  SOURCE:  split 2026-10-15 from rotation-quaternions.md (16 slides, then 7 more when the core was trimmed
           to ~45 min; text unchanged except notes that named a textbook section or a slide no longer next
           to them).

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Paths are relative to the
  lecture page that mounts this topic (lectures/LNN-slug/index.html).
-->

### Supplement: rotation, further

<small>(~37 min, time permitting) · reading: <a href="../../textbook/rotation.html#appendix">Rotation, Appendix</a></small>


---

### Rotation matrices, further

<small>(~2 min)</small>

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

### Axis-angle, further

<small>(~14 min)</small>

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

### Quaternions, further

<small>(~18 min)</small>

---

## The quaternion product in both tracks

The product formula of the lecture, component by component; `q2 q1` is "`q1`, then `q2`".

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

<!-- .slide: class="demo-full" -->

## Order matters, live

<div class="cockpit" data-demo="rot-compose" data-controls="angleA,angleB,axes,play"><pre class="viz-fallback">  A = 30° about y, B = 30° about x
     A then B:  qB qA = (0.25, 0.25, 0.067, 0.933)    one turn of 42.18° about (0.695, 0.695, 0.186)
     B then A:  qA qB = (0.25, 0.25, -0.067, 0.933)   one turn of 42.18° about (0.695, 0.695, -0.186)
     the two end poses differ by 15.4°
  set both to 90°: each order is one 120° turn, about two different cube diagonals</pre></div>


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

## Pitfall: degrees where radians were expected

```text
   Math.sin(30)             = −0.988      (30 radians = 4.77 turns)
   Math.sin(30 · π / 180)   =  0.5
```

- a rotation built from `30` radians turns the object by `30 mod 2π = 4.867 rad = 278.9°`
- the bug is silent: the result is still a valid rotation, just the wrong one
- rule: convert at the boundary (`THREE.MathUtils.degToRad`, `Mathf.Deg2Rad`), never inside the math


---

### Euler angles, further

<small>(~3 min)</small>

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

