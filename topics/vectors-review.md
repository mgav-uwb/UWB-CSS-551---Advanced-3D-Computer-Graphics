<!--
  CSS 551 · TOPIC DECK: Vectors, a review: displacements, the dot product, the cross product (~30 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/vectors-review.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES (condensed, as a review of high-school and first-year vectors): a point against a
  displacement, tip minus tail; add and scale; length and normalize, with the zero-length caveat;
  aim and march worked; where the two products came from (Hamilton 1843, Gibbs 1881 to 1884); the
  dot product's two definitions and the law of cosines; the angle, worked and in code in both tracks;
  projection (the along and across split) with two checks; the sign test; the cross product by
  components, the right-hand rule, the algebra rules, the length as an area; the 2D perp-dot product,
  2D line intersection and polygon area (the pentagon of the 2D hit test); a face normal and its
  winding; Newell's polygon normal; the triple product as volume and handedness; Unity's and three.js's
  Vector3 with their traps.
  SPLIT 2026-10-05 from vectors-dot-cross.md (archived in topics/archive/): frames, Gram-Schmidt, lines,
  planes, reflection, rays against planes, barycentric weights and the precision pitfalls moved to
  vector-geometry.md.
  NEEDS:   nothing beyond high-school vectors; the demo state a=(2,1,0), b=(1,2,1) is reused in every worked example.
  DEMOS:   data-demo="dot-cross" data-controls="ax,ay,bx,by" (under the lecture page's 200px crop).
           Fallback numbers: a.b = 4, |a| = 2.24, |b| = 2.45, theta = 43.1 deg, a x b = (1, -2, 3).
  NUMBERS: textbook/figures/numbers-foundations.json (key vec) or recomputed by node against
           lib/core/xform.js, Math.fround and lib/vendor/three.module.js.
  FIGURES: ../../textbook/figures/vec-*.svg (tools/gen-textbook-figures-foundations.mjs).
  READING: ../../textbook/vectors.html, Sections 1 to 3 and 9.
  SOURCE:  Real C# excerpts are from Kelvin Sung's CSS 451 ClassExamples (Chap-4 to Chap-6).

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Paths are relative to the
  lecture page that mounts this topic (lectures/LNN-slug/index.html).
-->

### Vectors: displacements, dot, cross

<small>(~30 min) · reading: <a href="../../textbook/vectors.html">Vectors</a>, Sections 1 to 3 and 9</small>


---

## Points and displacements

- a **position**: *where* something is, a displacement **from the origin**
- a **displacement**: *how to get* from one place to another, an arrow with direction and length
- from Pi to Pj: **tip minus tail**

```csharp
Vector3 vectorVe = Pj.transform.localPosition - Pi.transform.localPosition;
```

<small>EX_4_1_MyScript.cs, Chap-4-Vectors: Ve = Pj − Pi. `Pi − Pj` points the other way.</small>


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

## Pitfall: a zero-length vector has no direction

- normalize divides by the length: **(0, 0, 0)** gives **0 / 0 = NaN** in all three components
- in float32 a short vector can reach zero length too: (10⁻²⁰)² = 10⁻⁴⁰ survives as a denormal, **(10⁻²⁵)² = 0 exactly**
- NaN spreads into every later computation, including the next frame's position
- short vectors come from **differences of nearly equal points** and **cross products of nearly parallel inputs**: test the length before dividing


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
- the quaternion product, kept whole, rotates vectors: engines store rotations that way


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

## Worked: the dot, the lengths, the angle

**a = (2, 1, 0)** and **b = (1, 2, 1)**, the demo's starting vectors:

```text
a . b      = 2*1 + 1*2 + 0*1         = 4
|a|        = sqrt(5)                 ~= 2.236
|b|        = sqrt(6)                 ~= 2.449
cos(theta) = (a . b) / (|a| |b|)     = 4 / sqrt(30) ~= 0.7303
theta      = acos(0.7303)            ~= 43.1 degrees
```

- **positive** dot: acute · **zero**: perpendicular · **negative**: obtuse


---

## Real code: dot, then angle, both tracks

```csharp
float dot = Vector3.Dot(v1, v2);
if ((v1.magnitude > float.Epsilon) && (v2.magnitude > float.Epsilon))
{
    cosTheta = dot / (v1.magnitude * v2.magnitude);
    theta = Mathf.Acos(cosTheta) * Mathf.Rad2Deg;
}
```

<small>EX_5_1_MyScript.cs, Chap-5-DotProducts. The guard avoids dividing by a zero-length vector.</small>

```js
import { dot } from '../core/xform.js';
const len = (v) => Math.hypot(...v);
const thetaDeg = Math.acos(dot(a, b) / (len(a) * len(b))) * 180 / Math.PI;   // 43.0887
```


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

## Sign = the in-front-of test

<img src="../../textbook/figures/vec-dot-sign.svg" alt="the sign of the dot product splits space into front and behind" style="height:220px">

```text
a . b > 0  ->  b in FRONT of a      a . b = 0  ->  square on      a . b < 0  ->  b BEHIND a
```

Aim `a` = the way the drone faces, `b` = toward the target. Fire only when `a . b > 0`.


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

## The area of any polygon: sum the crosses

For a polygon in the plane, twice the area is the sum over its edges of `x_i · y_next − x_next · y_i`, the z part of each edge's cross product:

```text
   pentagon (1, 1), (5, 0.5), (6, 3), (3.5, 5), (0.5, 3.5)

   area = ½ · Σ (x_i · y_next − x_next · y_i) = 16.875
```

The sign tells the winding: **positive** counterclockwise, **negative** clockwise.


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

