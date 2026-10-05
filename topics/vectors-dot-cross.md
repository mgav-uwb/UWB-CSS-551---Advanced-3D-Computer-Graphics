<!--
  CSS 551 · TOPIC DECK: Vectors: dot and cross products, frames, lines and planes (~90 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/vectors-dot-cross.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES: a vector is a displacement (aim and march worked); the dot product (angle, projection,
  which side) with worked numbers and the acos precision pitfall; the cross product (perpendicular,
  area, a face normal, the triple product and handedness); two vectors to an orthonormal frame and
  Gram-Schmidt, coordinates in a frame; parametric lines and segments (the clamp table), point to line
  in 3D by one cross; planes and signed distance, which side, ray against plane (four cases);
  barycentric coordinates in a triangle.
  ADDED 2026-09-29 (densification): where the products came from (Hamilton 1843, Gibbs
  1881 to 1884); the law of cosines as the dot product; reflection and projection onto
  a plane, worked; two more precision pitfalls (normalizing a tiny vector, cancellation
  far from the origin); a predict-first poke; Newell's polygon normal; polygon area by
  crosses; the 2D perp-dot product and line-line intersection; the distance between
  skew lines; ray against sphere; Unity's Vector3 and its traps. Numbers from
  tools/gen-lecture-figures-a.mjs and textbook/vectors.html Section 8.
  ADDED 2026-10-05 (expansion to the 80-slide target): checks on an angle, a non-unit
  projection and a winding; the dot past 1 (NaN) and the atan2 angle in both tracks; the
  algebra rules (linearity, antisymmetry, non-associativity); is-it-a-basis by the triple
  product; the frame's parallel-input failure; dots need an orthonormal frame; point to
  segment in the WebGL track; a ray meets the ground; barycentric interpolation of
  attributes and the weights in both tracks; three.js's Vector3 mutation trap. Numbers from
  node against lib/core/xform.js, Math.fround, and lib/vendor/three.module.js; textbook
  Exercises 1, 2, 4, 7, 8, 9.
  NEEDS:   nothing beyond high-school vectors; the demo state a=(2,1,0), b=(1,2,1) is reused in every worked example.
  DEMOS:   data-demo="dot-cross" data-controls="ax,ay,bx,by" (under the lecture page's 200px crop).
           Fallback numbers: a.b = 4, |a| = 2.24, |b| = 2.45, theta = 43.1 deg, a x b = (1, -2, 3).
  NUMBERS: every number is from textbook/figures/numbers-foundations.json (keys vec, line, plane) or
           recomputed by node against lib/core/xform.js (the aim-and-march example).
  FIGURES: ../../textbook/figures/vec-*.svg (computed by tools/gen-textbook-figures-foundations.mjs).
  SOURCE:  derived 2026-09-18 from the former S02 vectors deck; expanded 2026-09-29 (Plan C, a full
           90-minute lecture) with the textbook chapter's frames, triple product, barycentric,
           ray-plane and precision sections. Real C# excerpts are from Kelvin Sung's CSS 451 ClassExamples.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Paths are relative to the
  lecture page that mounts this topic (lectures/LNN-slug/index.html).
-->

### Vectors: dot and cross products, frames, lines and planes

<small>(~90 min)</small>


---

### Vectors are displacements

<small>(~12 min)</small>

---

## A problem to hold onto

A patrol drone sits at **A**; a target drifts through the scene at **R**.

Press the trigger and a ball should launch **from A straight at R**.

- Which **direction** does the ball travel?
- How do you turn "point at R" into a per-frame velocity?


---

## Point vs. displacement

Two things wear the same three numbers `(x, y, z)` but mean different things:

- a **position**: *where* something is, measured from the origin (a place)
- a **displacement**: *how to get* from one place to another (an arrow: direction and length)

A position is a displacement **from the origin**. That is the only reason a point and a vector look alike.


---

## From two points, a vector

The displacement **from Pi to Pj** is tip minus tail:

```csharp
Vector3 vectorVe = Pj.transform.localPosition - Pi.transform.localPosition;
```

<small>EX_4_1_MyScript.cs, Chap-4-Vectors: Ve = Pj − Pi.</small>

- subtract **tail from tip**: `Pi − Pj` would point the other way
- the result is an **arrow** (direction and length), not a place
- the aim problem is exactly this: `aim = R − A`


---

## Add and scale, geometrically

Two operations, both with a picture:

- **add**: lay arrows tip to tail; `u + v` runs from the tail of u to the tip of v
- **scale**: `2v` is the same direction, twice as long; `-v` flips it; `0.5v` halves it

Marching along an aim each frame is **scale, then add**: `pos = pos + speed * dt * aim`.


---

## Length, and the unit vector

An aim needs a **direction**, not a length. Strip the length off by dividing by it:

```csharp
Vector3 vectorVs = ScalingFactor * vectorVa;              // scale
Vector3 unitVa   = (1.0f / vectorVa.magnitude) * vectorVa;  // normalize by hand
// Vector3 dirVa = vectorVa.normalized;                   // the engine's way
```

<small>EX_4_2_MyScript.cs, Chap-4-Vectors. Build the top one; check it against the bottom one.</small>

- **magnitude** `|v| = sqrt(x·x + y·y + z·z)`: the arrow's length
- **normalize** `v / |v|`: same direction, length 1 (a *unit* vector)


---

## Worked: aim and march

Drone at `A = (1, 0, 2)`, target at `R = (4, 0, -2)`, speed 10, one frame of `dt = 0.016` s:

```text
aim       = R - A              = (3, 0, -4)
|aim|     = sqrt(9 + 0 + 16)   = 5
unit aim  = (3, 0, -4) / 5     = (0.6, 0, -0.8)
step      = 10 * 0.016 * (0.6, 0, -0.8) = (0.096, 0, -0.128)
```

Reverse the subtraction (`A - R`) and the ball flies **away** from the target.


---

## Where the two products came from

- **1843**: William Rowan Hamilton's **quaternions**; the product of two pure quaternions (0, **a**) and (0, **b**) is ( −**a · b**, **a × b** )
- both products were born as the **two halves of one multiplication**
- **1881 to 1884**: Josiah Willard Gibbs (and Oliver Heaviside, independently) split them apart as **vector analysis**, the notation used today
- the rotation lecture puts them back together


---

### The dot product

<small>(~24 min)</small>

---

## The question the dot product answers

Two directions, `a` and `b`. Before any formula:

- **How aligned are they?** Same way, opposite, or square to each other?
- **How much of `a` points along `b`?** (a shadow length)
- **Is the target in front of me or behind me?**

One number answers all three. That number is the dot product.


---

## Two definitions, one number

**Algebraic**: multiply matching components, add:

```text
a . b  =  ax*bx  +  ay*by  +  az*bz
```

**Geometric**: lengths times the cosine of the angle between:

```text
a . b  =  |a| * |b| * cos(theta)
```

The two are **equal**; that equality is the entire use of the dot product.


---

## The law of cosines is the dot product

Expand the squared length of **a − b**:

```text
   |a − b|² = (a − b)·(a − b) = a·a − 2 a·b + b·b = |a|² + |b|² − 2 |a||b| cos θ

   a = (2, 1, 0), b = (1, 2, 1):  a − b = (1, −1, −1),  |a − b|² = 3
                                  |a|² + |b|² − 2 a·b = 5 + 6 − 8 = 3
```

The geometric definition **follows** from the algebraic one: the triangle with sides a, b, a − b.


---

## Worked: the dot product of a and b

Take **a = (2, 1, 0)** and **b = (1, 2, 1)**, the demo's starting vectors.

```text
a . b = 2*1 + 1*2 + 0*1 = 2 + 2 + 0 = 4
|a|   = sqrt(2*2 + 1*1 + 0*0) = sqrt(5) ~= 2.236
|b|   = sqrt(1*1 + 2*2 + 1*1) = sqrt(6) ~= 2.449
```

The dot is **positive (4)**, so the angle is under 90°: the two arrows broadly agree.


---

## From dot to angle

Rearrange the geometric definition for the angle:

```text
cos(theta) = (a . b) / (|a| * |b|)
theta      = acos( cos(theta) )
```

For our a and b:

```text
cos(theta) = 4 / (sqrt(5) * sqrt(6)) = 4 / sqrt(30) ~= 0.7303
theta      = acos(0.7303) ~= 43.1 degrees
```


---

## Real code: dot, then angle

```csharp [1-6]
float dot = Vector3.Dot(v1, v2);
if ((v1.magnitude > float.Epsilon) && (v2.magnitude > float.Epsilon))
{
    cosTheta = dot / (v1.magnitude * v2.magnitude);
    theta = Mathf.Acos(cosTheta) * Mathf.Rad2Deg;
}
```

<small>EX_5_1_MyScript.cs, Chap-5-DotProducts. The guard avoids dividing by a zero-length vector.</small>


---

## Check: an angle by hand

What is the angle between **(1, 1, 0)** and **(1, 0, 1)**?

- **A.** 45°
- **B.** 60°
- **C.** 90°
- **D.** 30°


---

## Projection: split a into two parts

<img src="../../textbook/figures/vec-dot-projection.svg" alt="a split into a part along b and a part across b" style="height:300px">

```text
a-along = ( (a . b) / (b . b) ) * b        a-perp = a - a-along
```


---

## Worked: the split, and the check

For **a = (2, 1, 0)**, **b = (1, 2, 1)**: `a . b = 4`, `b . b = 6`, so the scalar is `4/6 = 2/3`.

```text
a-along = (2/3)(1, 2, 1) = (0.667, 1.333, 0.667)
a-perp  = (2,1,0) - (0.667,1.333,0.667) = (1.333, -0.333, -0.667)
```

Check perpendicularity: `a-perp . b` must be **0**:

```text
(4/3)(1) + (-1/3)(2) + (-2/3)(1) = 4/3 - 2/3 - 2/3 = 0   OK
```


---

## Check: a shadow on a non-unit direction

Split **a = (3, 4, 0)** along **c = (1, 1, 0)**. What is the along part?

- **A.** (7, 7, 0)
- **B.** (3.5, 3.5, 0)
- **C.** (4.95, 4.95, 0)
- **D.** (−0.5, 0.5, 0)


---

## Reflection: flip the along part

Split **d** into the part along a unit normal **n** and the part across it; reflection keeps the across part and **negates** the along part:

```text
   r = d − 2 (d·n) n

   d = (1, 0, 0), a mirror tilted 45°: n = (1, 1, 0)/√2 = (0.707, 0.707, 0)
   d·n = 0.707   →   r = (1, 0, 0) − 2 · 0.707 · (0.707, 0.707, 0) = (0, −1, 0)
```

A ray going right, off a 45° mirror, goes straight down. Mirrors, bounces, specular highlights, ray-traced reflections: all this line.


---

## Project onto a plane: remove the normal part

Keep only the across part: **v − (v·n) n**, for a unit normal n.

```text
   v = a = (2, 1, 0),  n = (1, 2, 2)/3
   v·n = (2 + 2 + 0)/3 = 1.333
   v − 1.333 · (0.333, 0.667, 0.667) = (1.556, 0.111, −0.889)
   check: (1.556, 0.111, −0.889)·n = 0
```

A shadow direction on the ground, a camera sliding along a wall, a velocity after hitting a floor.


---

## Sign = the in-front-of test

<img src="../../textbook/figures/vec-dot-sign.svg" alt="the sign of the dot product splits space into front and behind" style="height:220px">

```text
a . b > 0  ->  b in FRONT of a      a . b = 0  ->  square on      a . b < 0  ->  b BEHIND a
```

Aim `a` = the way the drone faces, `b` = toward the target. Fire only when `a . b > 0`.


---

## Pitfall: acos near zero

Angle between `(1, 0, 0)` and `(cos θ, sin θ, 0)`, in float32:

| true θ (rad) | float32 dot | acos: relative error | atan2(\|a×b\|, a·b): relative error |
| --- | --- | --- | --- |
| 0.1 | 0.99500418 | 1.2e-6 | 3.9e-8 |
| 0.01 | 0.99994999 | 8.7e-5 | 1.8e-8 |
| 0.001 | 0.99999952 | 0.023 | 4.2e-8 |
| 0.0001 | 1.00000000 | 1 (returns 0) | 2.9e-8 |

Below θ = sqrt(2ε) ≈ 4.9e-4 rad (0.03°) the dot rounds to exactly 1 and acos returns **0**.


---

## Pitfall: a dot just past 1

Normalize **(1, 0, 4)** with every operation in float32, then dot it with itself:

```text
   |v|   = 4.1231055                 v̂ = (0.24253564, 0, 0.97014254)
   v̂ · v̂ = 1.0000001                 acos(1.0000001) = NaN
   (1, 1, 1) normalized the same way:  v̂ · v̂ = 0.99999994,  an angle of 0.02° to itself
```

- rounding can push the dot of two unit vectors **a hair past 1 or −1**, where acos is undefined
- **clamp** to [−1, 1] before acos, or skip acos: the next slide


---

## Real code: an angle that never fails

```csharp
// Unity: degrees between two directions; no normalize, no clamp needed
float AngleDeg(Vector3 a, Vector3 b) {
    return Mathf.Atan2(Vector3.Cross(a, b).magnitude, Vector3.Dot(a, b)) * Mathf.Rad2Deg;
}
```

```js
// WebGL track, with lib/core/xform.js
const angleDeg = (a, b) => Math.atan2(Math.hypot(...cross(a, b)), dot(a, b)) * 180 / Math.PI;
angleDeg([2, 1, 0], [1, 2, 1]);   // 43.0887
```

- |a × b| = |a||b| sin θ and a · b = |a||b| cos θ: atan2 of the pair cancels **both lengths**
- full precision near 0° and near 180°; no domain to leave


---

## Pitfall: normalizing a tiny vector

- normalize = divide by the length, and the length is √(x² + y² + z²)
- in float32, (10⁻²⁰)² = 10⁻⁴⁰ still exists (a denormal); **(10⁻²⁵)² = 0 exactly**
- a vector of length 10⁻²⁵ normalizes to **0 / 0 = NaN**, which then spreads through every later computation
- short vectors come from **cross products of nearly parallel inputs** and **differences of nearly equal points**: guard the length before dividing


---

## Pitfall: cancellation far from the origin

```text
   (10⁶, 1, 0) · (1, −10⁶, 0) = 10⁶ − 10⁶ = 0          in exact arithmetic
   in float32, each product is known to about ± 0.1   → the computed 0 is noise of that size
```

- the relative error of float32 is about **1.2 × 10⁻⁷**; at 10⁶ that is **0.1** absolute
- positions a million units from the origin lose everything below a tenth of a unit
- **subtract a nearby reference point first**, then compute: the view matrix does exactly this for every vertex


---

## Pitfall: testing with ==

```text
   0.1 + 0.2 == 0.3                      → false   (0.30000000000000004 in doubles)
   dot(n, n) == 1   for n = normalize(1, 1, 1) in float32   → false   (0.99999994)
   dot(v, n) == 0   for a vector "in the plane"             → false after any rotation
```

- test against a **tolerance**: |x − y| < ε, with ε chosen for the scale (1e-6 near 1, larger for big coordinates)
- "is this vector unit length?" and "is this point on the plane?" are **always** tolerance tests


---

## Predict first: a perpendicular pair

Set the demo to **a = (2, 1, 0)** and **b = (−1, 2, 1)**. Before running, predict:

- a · b = ?
- θ = ?
- a × b = ?  (and is it perpendicular to both?)


---

## Dot &amp; cross, live

<div class="cockpit" data-demo="dot-cross" data-controls="ax,ay,bx,by"><pre class="viz-fallback">  model {ax,ay,az, bx,by,bz} -> arrows + value panel, two views
  -- default state: a=(2,1,0), b=(1,2,1) ------------------
     a . b = 2*1 + 1*2 + 0*1        = 4
     |a|   = sqrt(5) ~= 2.24    |b| = sqrt(6) ~= 2.45
     theta = acos(4/sqrt(30))       ~= 43.1 deg
     a x b = (1*1-0*2, 0*1-2*1, 2*2-1*1) = (1, -2, 3)</pre></div>


---

### The cross product

<small>(~23 min)</small>

---

## The question the cross product answers

The dot gives a **number**. Sometimes you need a **direction**:

- two edges of a triangle: **which way does it face?** (its normal)
- "forward" and "up": **build a right-facing axis**
- **how big** is the parallelogram they span? (an area)

The cross takes two vectors and returns a **third, perpendicular to both**.


---

## The cross product, by components

```text
a x b = ( ay*bz - az*by ,
          az*bx - ax*bz ,
          ax*by - ay*bx )
```

For **a = (2, 1, 0)**, **b = (1, 2, 1)**:

```text
a x b = ( 1*1 - 0*2 , 0*1 - 2*1 , 2*2 - 1*1 ) = (1, -2, 3)
```

Check it is perpendicular to both; each dot must be **0**:

```text
(a x b) . a = 1*2 + (-2)*1 + 3*0 = 0      (a x b) . b = 1*1 + (-2)*2 + 3*1 = 0
```


---

## Right-hand rule

The cross is perpendicular to the a-b plane, but on *which* side?

- **Right-hand rule:** fingers along `a`, curl toward `b`, thumb is `a x b`
- swap the inputs and the thumb flips: **`b x a = -(a x b)`**

```csharp [1-2]
Vector3 v1xv2 = Vector3.Cross(v1, v2);
Vector3 v2xv1 = Vector3.Cross(v2, v1);   // equals -v1xv2
```

<small>EX_6_1_MyScript.cs, Chap-6: draws both, in opposite directions.</small>


---

## The rules the two products obey

```text
   dot:    a · b = b · a                      a · (2b + c) = 2 a · b + a · c = 8
   cross:  b × a = −(a × b)                   a × a = 0
           a × (b × c) = (0, 0, −4)           (a × b) × c = (−2, −1, 0)          with c = (0, 0, 1)
```

- both are **linear** in each argument: scale or add inputs first or afterward, same answer
- the dot is **symmetric**; the cross is **antisymmetric** and **not associative**: the brackets matter
- a × a = 0 is the cross product's parallel test, the one the frame construction trips on


---

## The length is an area

<img src="../../textbook/figures/vec-cross-area.svg" alt="the parallelogram spanned by a and b, area |a x b|" style="height:230px">

```text
|a x b| = |a| |b| sin(theta) = sqrt(1 + 4 + 9) = sqrt(14) ~= 3.742
check:    sqrt(5) sqrt(6) sin(43.1°) = 5.477 * 0.683 ~= 3.742
```


---

## The area of any polygon: sum the crosses

For a polygon in the plane, twice the area is the sum over its edges of `x_i · y_next − x_next · y_i`, the z part of each edge's cross product:

```text
   pentagon (1, 1), (5, 0.5), (6, 3), (3.5, 5), (0.5, 3.5)

   area = ½ · Σ (x_i · y_next − x_next · y_i) = 16.875
```

The sign tells the winding: **positive** counterclockwise, **negative** clockwise.


---

## In 2D: the perp-dot product

For plane vectors, keep only the cross product's **z** part: `u ⊥ v = u_x · v_y − u_y · v_x`.

```text
   (2, 1) ⊥ (1, 2) =  2·2 − 1·1 =  3    v is counterclockwise from u: a LEFT turn
   (1, 2) ⊥ (2, 1) =  1·1 − 2·2 = −3    clockwise: a RIGHT turn
```

- **zero**: parallel · **sign**: which side · **size**: the parallelogram's area
- the edge functions of the rasterization lecture are this, one per triangle edge


---

## Two lines in 2D, intersected

Lines p + t r and q + s u. Cross both sides with u, then with r:

```text
   t = (q − p) ⊥ u / (r ⊥ u),     s = (q − p) ⊥ r / (r ⊥ u)

   p = (0, 0), r = (4, 2);  q = (0, 3), u = (2, −1)
   r ⊥ u = 4·(−1) − 2·2 = −8
   t = ((0, 3) ⊥ (2, −1)) / −8 = (0 − 6) / −8 = 0.75     → p + 0.75 r = (3, 1.5)
   s = ((0, 3) ⊥ (4, 2)) / −8 = (0 − 12) / −8 = 1.5      → q + 1.5 u  = (3, 1.5)
```

**r ⊥ u = 0**: parallel lines, no single answer. For segments, accept only **0 ≤ t, s ≤ 1**.


---

## Worked: a face normal from two edges

`P0 = (0,0,0)`, `P1 = (2,0,0)`, `P2 = (0,0,-2)`:

```text
e1 = P1 - P0 = (2, 0, 0)      e2 = P2 - P0 = (0, 0, -2)
e1 x e2 = (0*(-2) - 0*0,  0*0 - 2*(-2),  0) = (0, 4, 0)    ->  n = (0, 1, 0)
```

- the face lies in the ground plane and faces **up**; the length 4 is **twice the area** (2)
- swap `P1` and `P2`: `n = (0, -1, 0)`, same triangle, **opposite winding**

```csharp
Vector3 n = Vector3.Cross(v1, v2);
if (Vector3.Dot(n, Vector3.forward) > 0) n = -n;   // flip to face the chosen side
```


---

## Check: which way does it face?

`P0 = (0, 0, 0)`, `P1 = (0, 0, −2)`, `P2 = (2, 0, 0)`. The face normal is `normalize((P1 − P0) × (P2 − P0))`. It points:

- **A.** up, (0, 1, 0)
- **B.** down, (0, −1, 0)
- **C.** along x, (1, 0, 0)
- **D.** nowhere: the corners are collinear


---

## Newell's method: the normal of a polygon

A four-sided face whose corner is lifted, (0, 0, 0), (1, 0, 0), (1, 1, **0.2**), (0, 1, 0), is not flat. Crosses at different corners **disagree**:

```text
   cross at vertex 0:  (0, 0, 1)          cross at vertex 2:  (−0.192, −0.192, 0.962)

   Newell: sum over edges (p → q) of
      Nx += (p_y − q_y)(p_z + q_z),  Ny += (p_z − q_z)(p_x + q_x),  Nz += (p_x − q_x)(p_y + q_y)
   = (−0.2, −0.2, 2)  →  normalized (−0.099, −0.099, 0.990)
```

One normal from every edge at once: the average orientation, robust to a bent face (Tampieri, Graphics Gems III, 1992).


---

## The triple product: volume and handedness

<img src="../../textbook/figures/vec-triple.svg" alt="the parallelepiped spanned by a, b, c" style="height:250px">

```text
c = (0, 0, 1):   b x c = (2, -1, 0)     a . (b x c) = 4 - 1 = 3   = det[a; b; c]
swap b and c:    a . (c x b) = -3       (the mirror-image box)
```


---

## Worked: is it a basis?

The triple product is zero exactly when three vectors lie in one plane:

```text
   (1, 2, 3), (2, 4, 6), (0, 1, 0):   (2,4,6) × (0,1,0) = (−6, 0, 2)
                                      (1,2,3) · (−6, 0, 2) = −6 + 6 = 0     coplanar: NOT a basis
   (1, 0, 0), (1, 1, 0), (1, 1, 1):   (1,1,0) × (1,1,1) = (1, −1, 0)
                                      (1,0,0) · (1, −1, 0) = 1 > 0          a right-handed basis, volume 1
```

The second is a basis but **not orthonormal**: its coordinates cannot be read off by dots.


---

## Two vectors, a whole frame

<img src="../../textbook/figures/vec-frame.svg" alt="an orthonormal frame built from a and b" style="height:230px">

```text
w = normalize(a)             = (0.894, 0.447, 0)
u = normalize(a x b)         = (0.267, -0.535, 0.802)
t = normalize(a x (a x b))   = (0.359, -0.717, -0.598)      raw: (3, -6, -5)
```


---

## When the frame cannot be built

Same recipe, `a = (0, 0, 1)`, `b = (1, 0, 1)`:

```text
   w = a = (0, 0, 1)      a × b = (0, 1, 0) = u      a × u = (−1, 0, 0)      three right angles
```

Now `b = (0, 0, 2)`, parallel to a:

```text
   a × b = (0, 0, 0)      normalize(0, 0, 0) = 0 / 0 = (NaN, NaN, NaN)
```

- parallel inputs span **no plane**, so no first axis can be chosen
- the look-at failure: an **up vector along the view direction**; test |a × b| before normalizing


---

## Coordinates in a frame

Read a vector in the frame `(w, u, t)` by **three dots**:

```text
a in the frame:  (a.w, a.u, a.t) = (2.236, 0, 0)          a is the first axis, at its own length
b in the frame:  (b.w, b.u, b.t) = (1.789, 0, -1.673)
rebuild:         1.789 w - 1.673 t = (1, 2, 1)             1.789² + 1.673² = 6 = |b|²
```

- `1.789 = 4/sqrt(5)`: the **shadow** of b on a; `1.673`: the parallelogram **height**
- dotting with each axis of an orthonormal frame **is** the change of coordinates


---

## Pitfall: dots need an orthonormal frame

Basis `e1 = (1, 0, 0)`, `e2 = (1, 1, 0)`, `e3 = (0, 0, 1)`; the vector `v = (3, 2, 0)`:

```text
   the true coordinates:  v = 1 e1 + 2 e2          → (1, 2, 0)      found by solving
   three dots:            (v·e1, v·e2, v·e3) = (3, 5, 0)
   rebuild from the dots: 3 e1 + 5 e2 = (8, 5, 0)                 not v
```

- the dot recipe needs axes that are **unit** and **mutually perpendicular**
- otherwise coordinates come from **solving** (the inverse matrix of the affine lecture), or orthonormalize first


---

## Gram-Schmidt: the same frame, another recipe

Orthonormalize `a`, `b`, `c = (0, 0, 1)` in order: subtract what each vector has along the axes already built, then normalize.

```text
e1 = a / |a|                                     = (0.894, 0.447, 0)
b - (b.e1) e1 = (1,2,1) - 1.789 e1 = (-0.6, 1.2, 1)   ->  e2 = (-0.359, 0.717, 0.598)
c - (c.e1) e1 - (c.e2) e2 = (0.214, -0.429, 0.643)    ->  e3 = (0.267, -0.535, 0.802)
```

`e3 = u` and `e2 = -t`: the two recipes build the same frame up to order and sign; `e1 x e2 = e3`, so it is right-handed.


---

### Lines, planes, and triangles

<small>(~31 min)</small>

---

## The question, before the equations

Two shapes run the whole course; both are "a point plus a direction":

- Is a clicked point **on this segment**, and where is the nearest point on it?
- Is an object **in front of a wall** or behind it, and **how far**?
- Where does a **ray hit** that wall? Is the hit **inside a triangle**?

Neither needs new math: all of it is the dot and the cross.


---

## A line is a point and a direction

Every point on the line is the base point plus some amount of the direction:

```text
P(t) = P0 + t * d
```

- `t = 0` sits at `P0`; `t = 1` sits at `P0 + d`; negative `t` runs backward
- a **segment** clamps `t` to its range; a **ray** keeps only `t ≥ 0`
- this is **march along a direction**, now named


---

## Worked: nearest point on a segment

<img src="../../textbook/figures/vec-line-foot.svg" alt="three points projected onto a segment, two clamped to its ends" style="height:200px">

Segment `P0 = (0,0)` to `P1 = (4,2)`: `|v| = 4.472`, unit `v = (0.894, 0.447)`.

| Pt | d = (Pt − P0) · v̂ | foot | inside? | nearest point |
| --- | --- | --- | --- | --- |
| (1, 3) | 2.236 | (2, 1) | yes | (2, 1), distance 2.236 |
| (6, 4) | 7.155 | (6.4, 3.2) | no, d > 4.472 | the end (4, 2), distance 0.894 |
| (−1, 1) | −0.447 | (−0.4, −0.2) | no, d < 0 | the start (0, 0), distance 1.342 |


---

## Real code: point to line

```csharp [1-5]
Vector3 vt  = Pt.transform.localPosition - P0.transform.localPosition;
Vector3 v1n = v1.normalized;                       // unit direction
float d = Vector3.Dot(vt, v1n);                    // projected length = t
Pon.transform.localPosition = P0.transform.localPosition + d * v1n;  // foot
bool inside = (d >= 0) && (d <= v1.magnitude);     // the segment range test
```

<small>EX_5_3_MyScript.cs, Chap-5-DotProducts. Projection length plus a range test.</small>


---

## Real code: point to segment, WebGL track

```js
import { sub, dot, normalize } from '../core/xform.js';
const add = (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]];
const scale = (p, s) => p.map((x) => x * s);
const v1  = sub(P1, P0);                          // segment direction
const v1n = normalize(v1);                        // unit direction
const d   = dot(sub(Pt, P0), v1n);                // projected distance along the line
const foot = add(P0, scale(v1n, d));              // foot of the perpendicular
const inside = d >= 0 && d <= Math.hypot(...v1);  // the clamp test
// P0 = (0,0,0), P1 = (4,2,0), Pt = (6,4,0):  d = 7.155, inside = false
```

The same five steps as the C# excerpt: the library supplies **sub, dot, normalize**; the two helpers are one line each.


---

## Distance to a line in 3D: one cross

The line through the origin along `b̂ = (0.408, 0.816, 0.408)`; the point at `a = (2, 1, 0)`:

```text
along:   a . b̂       = 4 / sqrt(6)       = 1.633
across:  |a x b̂|     = sqrt(14)/sqrt(6)  = 1.528
check:   1.633² + 1.528² = 2.667 + 2.333 = 5 = |a|²
```

The across distance is `|a-perp|` from the projection split, **without building the vector**.


---

## Two skew lines: one cross, one dot

Lines through **p1** along **d1** and **p2** along **d2**. The shortest segment between them is along **d1 × d2**:

```text
   distance = | (p2 − p1) · (d1 × d2) | / | d1 × d2 |

   p1 = (0, 0, 0), d1 = (1, 0, 0);   p2 = (0, 1, 2), d2 = (0, 1, 1)
   d1 × d2 = (0, −1, 1),  (p2 − p1)·(0, −1, 1) = −1 + 2 = 1
   distance = 1 / √2 = 0.707
```

Motion capture triangulation: two camera rays through one marker **nearly** meet; the midpoint of this segment is the estimate.


---

## A plane is a point and a normal

<img src="../../textbook/figures/vec-plane-distance.svg" alt="a plane with its normal and a point's signed distance" style="height:240px">

```text
n . P = D        D = n . Q for any point Q on the plane;   with unit n, D is the plane's distance from the origin
```


---

## Worked: point-to-plane distance

Plane through `Q = (1, 0, 0)` with normal `m = (1, 2, 2)`. First make the normal **unit**:

```text
|m| = sqrt(1 + 4 + 4) = 3      n = (1/3, 2/3, 2/3)      D = n . Q = 1/3
```

Signed distance of `P = (4, 1, 0)`, and its foot on the plane:

```text
n . P - D = (4 + 2 + 0)/3 - 1/3 = 5/3 ~= 1.667         (positive: in front)
foot = P - 1.667 n = (3.444, -0.111, -1.111)            check: n . foot = 0.333 = D
```


---

## Which side? Reuse the dot sign

The **sign** of `n . P - D` is the which-side test, the in-front-of test with the plane's offset subtracted:

```text
n . P - D  >  0   ->  P is in FRONT (the normal's side)
n . P - D  =  0   ->  P is ON the plane
n . P - D  <  0   ->  P is BEHIND
```

One dot, one subtraction, one comparison: frustum culling, clipping, and the homework's green-or-red point.


---

## Ray against plane: four cases

Ray `o + t d`, plane `n . P = D`: `t = (D - n . o) / (n . d)`. With the plane above, `n = (1/3, 2/3, 2/3)`, `D = 1/3`:

| origin o | direction d | n · d | t | hit |
| --- | --- | --- | --- | --- |
| (4, 1, 0) | −n | −1 | 1.667 | (3.444, −0.111, −1.111), the foot |
| (0, 0, 0) | (1, 0, 0) | 1/3 | 1 | (1, 0, 0) = Q |
| (0, 0, 0) | (0, 1, −1)/√2 | 0 | none | parallel: the direction lies in the plane |
| (4, 1, 0) | +n | 1 | −1.667 | behind the origin: a ray never reaches it |


---

## Worked: a ray meets the ground

A ray from `o = (0, 5, 0)` along `d = (0.6, −0.8, 0)`; the ground `y = 0` is `n = (0, 1, 0)`, `D = 0`:

```text
   n · d = −0.8          (the ray descends 0.8 per unit of t)
   n · o =  5            (it starts 5 above the plane)
   t = (D − n · o) / (n · d) = (0 − 5) / (−0.8) = 6.25
   hit = o + 6.25 d = (3.75, 0, 0)
```

With `n · d ≥ 0` the ray climbs or runs level: **no hit**, and a drag tool keeps the object where it was.


---

## Ray against sphere: a quadratic of dots

A ray **o + t d** (unit d) against a sphere of radius r at the origin: |o + t d|² = r², so

```text
   t² + 2 (o·d) t + (o·o − r²) = 0       b = o·d,  c = o·o − r²,  t = −b ± √(b² − c)

   o = (3, 3, 6), r = 1.2, d = (−0.372, −0.370, −0.852)  (the ray-tracing lecture's pixel)
   b = −7.334,  c = 52.56,  b² − c = 1.222
   t = 7.334 − 1.105 = 6.228 (enters)      t = 8.439 (leaves)
```

**b² − c < 0**: a miss. Every ray tracer's first test, built from **two dot products**.


---

## Barycentric coordinates: weights in a triangle

<img src="../../textbook/figures/vec-barycentric.svg" alt="a triangle with a point and its three sub-triangles" style="height:240px">

```text
X = w0 P0 + w1 P1 + w2 P2,   w0 + w1 + w2 = 1
w0 = ((P1 - X) x (P2 - X)) . n / (n . n)       (and cyclically for w1, w2)
```

Each weight is the **signed area** of the sub-triangle opposite its corner, over the whole.


---

## Worked: inside, on an edge, outside

`P0 = (0,0,0)`, `P1 = (2,0,0)`, `P2 = (0,0,-2)`; `n = (0, 4, 0)`, `n . n = 16`.

| X | (w0, w1, w2) | sum | verdict |
| --- | --- | --- | --- |
| (0.5, 0, −0.5) | (0.5, 0.25, 0.25) | 1 | inside |
| (2/3, 0, −2/3) | (1/3, 1/3, 1/3) | 1 | inside: the centroid |
| (1, 0, −1) | (0, 0.5, 0.5) | 1 | on the edge opposite P0 |
| (2, 0, −2) | (−1, 1, 1) | 1 | outside, beyond the edge opposite P0 |

First row by hand: `(P1 - X) x (P2 - X) = (1.5,0,0.5) x (-0.5,0,-1.5) = (0, 2, 0)`, dot n = 8, `w0 = 8/16 = 0.5`.


---

## The weights carry anything stored at the corners

Same triangle, `X = (0.5, 0, −0.5)`, weights `(0.5, 0.25, 0.25)`:

| stored at P0, P1, P2 | interpolated at X |
| --- | --- |
| colors red (1,0,0), green (0,1,0), blue (0,0,1) | (0.5, 0.25, 0.25) |
| texture coordinates (0,0), (1,0), (0,1) | (0.25, 0.25) |
| depths 2, 4, 6 | 0.5·2 + 0.25·4 + 0.25·6 = 3.5 |

Same weights, any attribute: the rasterizer fills every pixel this way.


---

## Real code: barycentric weights, both tracks

```csharp
Vector3 n  = Vector3.Cross(P1 - P0, P2 - P0);
float   nn = Vector3.Dot(n, n);
float   w0 = Vector3.Dot(Vector3.Cross(P1 - X, P2 - X), n) / nn;
float   w1 = Vector3.Dot(Vector3.Cross(P2 - X, P0 - X), n) / nn;
float   w2 = 1f - w0 - w1;                       // the weights sum to 1
bool inside = w0 >= 0f && w1 >= 0f && w2 >= 0f;
```

```js
const n = cross(sub(P1, P0), sub(P2, P0)), nn = dot(n, n);
const w0 = dot(cross(sub(P1, X), sub(P2, X)), n) / nn;
const w1 = dot(cross(sub(P2, X), sub(P0, X)), n) / nn;
const w2 = 1 - w0 - w1;      // X = (1, 0, -0.5): [0.25, 0.5, 0.25], inside
```


---

## Check it yourself

From `css551/`, each line prints a number from these slides:

```js
// save as check.mjs in css551/, run: node check.mjs
import { dot, cross, normalize } from './lib/core/xform.js';
const a = [2, 1, 0], b = [1, 2, 1];
console.log(dot(a, b), cross(a, b));              // 4 [ 1, -2, 3 ]
const n = normalize([1, 2, 2]), D = dot(n, [1, 0, 0]);
console.log(dot(n, [4, 1, 0]) - D);               // 1.6666666666666667
```

Replace any library call with your own three-line version and compare.


---

## Unity's Vector3: the same atoms, three traps

| the text | Unity | watch for |
| --- | --- | --- |
| a · b, a × b | `Vector3.Dot(a, b)`, `Vector3.Cross(a, b)` | same formulas; Unity's frame is **left-handed**, so the cross product obeys the **left-hand rule** on screen |
| \|a\|, â | `a.magnitude`, `a.normalized` | a vector too short to normalize comes back as **(0, 0, 0)**, silently |
| θ | `Vector3.Angle(a, b)` | **degrees**, not radians; arccos of the dot, with its small-angle loss |


---

## three.js's Vector3: the same atoms, one trap

| the text | three.js | watch for |
| --- | --- | --- |
| a · b | `a.dot(b)` | returns a number; nothing changes |
| a × b | `a.cross(b)` | **overwrites a** with a × b; `new THREE.Vector3().crossVectors(a, b)` keeps both |
| â | `a.normalize()` | overwrites a; `a.clone().normalize()` keeps it; a zero vector stays zero |
| θ | `a.angleTo(b)` | **radians**; a clamped arccos |

```js
const a = new THREE.Vector3(2, 1, 0), b = new THREE.Vector3(1, 2, 1);
const n = a.cross(b);   // n IS a, and a is now (1, -2, 3)
a.dot(b);               // 0, not 4
```


---

## Two products, one slide

- **Vector** = displacement (direction and length); a point is one from the origin
- **Dot** `a·b = |a||b|cos θ`: **angle**, **projection**, **which side**; use atan2 for small angles
- **Cross** `a×b` ⊥ both: **normal**, **area**, **handedness**, **a frame**
- **Line** `P = P0 + t d`, **plane** `n·P = D`: distances, sides and hits are dots
- **Barycentric** weights: signed area ratios; all non-negative means inside

