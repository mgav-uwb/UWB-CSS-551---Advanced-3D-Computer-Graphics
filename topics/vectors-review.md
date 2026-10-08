<!--
  CSS 551 · TOPIC DECK: Vectors, a review: displacements, the dot product, the cross product (~30 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/vectors-review.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES (condensed, as a review of high-school and first-year vectors): a point against a
  displacement, tip minus tail; add and scale; length and normalize, with the zero-length caveat;
  aim and march worked; where the two products came from (Hamilton 1843, Gibbs 1881 to 1884); the
  dot product's two definitions, derived through the law of cosines; the angle, worked and in code in
  both tracks (code tabs); projection (the along and across split) with two checks; the sign test; the
  cross product by components, the right-hand rule, the algebra rules (in its notes), the length as an
  area; the 2D perp-dot product (line intersection in its notes) and polygon area (the pentagon of the
  2D hit test); a face normal and its winding; the triple product as volume and handedness; Unity's
  and three.js's Vector3 with their traps.
  CUT 2026-10-08: the three multiple-choice Check slides (an angle by hand, a shadow on a non-unit
           direction, which way a face points) and the predict-first perpendicular pair; their numbers
           are Vectors chapter Exercises 1 and 2 and the demo's note.
  SPLIT 2026-10-05 from vectors-dot-cross.md (archived in topics/archive/): frames, Gram-Schmidt, lines,
  planes, reflection, rays against planes, barycentric weights and the precision pitfalls moved to
  vector-geometry.md.
  NEEDS:   nothing beyond high-school vectors; the demo state a=(2,1,0), b=(1,2,1) is reused in every worked example.
  DEMOS:   data-demo="dot-cross" data-controls="ax,ay,bx,by" (under the lecture page's 200px crop).
           Fallback numbers: a.b = 4, |a| = 2.24, |b| = 2.45, theta = 43.1 deg, a x b = (1, -2, 3).
  NUMBERS: textbook/figures/numbers-foundations.json (key vec) or recomputed by node against
           lib/core/xform.js, Math.fround and lib/vendor/three.module.js.
  FIGURES: ../../textbook/figures/vec-*.svg (tools/gen-textbook-figures-foundations.mjs) and
           vecr-*.svg (tools/gen-lecture-figures-vectors.mjs, 2026-10-08).
  TRIMMED 2026-10-08: the zero-length pitfall folded into the unit-vector slide, the law of cosines into
           "Two definitions", the product rules into the right-hand rule's note, 2D line intersection into
           the perp-dot note; Newell's method moved to meshes.md.
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

<img src="../../textbook/figures/vecr-points.svg" alt="Points Pi at (1, 1) and Pj at (4, 3) with dashed position arrows from the origin and a red displacement arrow from Pi to Pj labeled Pj minus Pi equals (3, 2)" style="height:300px">

```csharp
Vector3 vectorVe = Pj.transform.localPosition - Pi.transform.localPosition;
```

<small>EX_4_1_MyScript.cs, Chap-4-Vectors: Ve = Pj − Pi, tip minus tail. `Pi − Pj` points the other way.</small>


---

## Add and scale, geometrically

<img src="../../textbook/figures/vecr-add-scale.svg" alt="Left: u = (3, 1) and v = (1, 2) laid tip to tail give u + v = (4, 3), with v then u giving the same sum. Right: v = (2, 0.5) with 2v, 0.5v and minus v drawn along the same line" style="height:330px">

Marching along an aim each frame is **scale, then add**: `pos = pos + speed * dt * aim`.


---

## Length, and the unit vector

<img src="../../textbook/figures/vecr-normalize.svg" alt="v = (3, 4) of length 5 drawn with its 3 and 4 legs, and the unit vector (0.6, 0.8) on a dashed unit circle; a note that (0, 0, 0) has no direction" style="height:300px">

```csharp
Vector3 unitVa = (1.0f / vectorVa.magnitude) * vectorVa;  // normalize by hand
// Vector3 dirVa = vectorVa.normalized;                   // the engine's way
```

Test the length before dividing: short vectors come from **nearly equal points** and **nearly parallel crosses**.


---

## Worked: aim and march

<img src="../../textbook/figures/vecr-aim-march.svg" alt="Top view: drone A at (1, 0, 2), target R at (4, 0, -2), the red unit aim (0.6, 0, -0.8), and 31 green dots, one per frame, marching to the target" style="height:330px">

Reverse the subtraction (`A - R`) and the drone flies **away** from the target.


---

## Where the two products came from

- **1843**: William Rowan Hamilton's **quaternions**; the product of two pure quaternions (0, **a**) and (0, **b**) is ( −**a · b**, **a × b** )
- both products were born as the **two halves of one multiplication**
- **1881 to 1884**: Josiah Willard Gibbs (and Oliver Heaviside, independently) split them apart as **vector analysis**, the notation used today
- the quaternion product, kept whole, rotates vectors: engines store rotations that way


---

## Two definitions, one number

<img src="../../textbook/figures/vecr-law-cosines.svg" alt="The triangle with sides a, b and a minus b, squared lengths 5, 6 and 3 and angle 43.1 degrees, beside four steps: the third side is a minus b; the law of cosines gives its squared length from the angle; squaring a minus b component by component gives the same squared length with minus twice the dot product; so a dot b equals |a||b| cos theta" style="height:320px">

```text
algebraic:  a . b = ax*bx + ay*by + az*bz          geometric:  a . b = |a| |b| cos(theta)
```

Their equality lets **three multiplies and two adds** answer geometric questions: the angle, the shadow, in front or behind.


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


---

## Real code: dot, then angle, both tracks

<div class="code-tabs">

```csharp
float dot = Vector3.Dot(v1, v2);
if ((v1.magnitude > float.Epsilon) && (v2.magnitude > float.Epsilon))
{
    cosTheta = dot / (v1.magnitude * v2.magnitude);
    theta = Mathf.Acos(cosTheta) * Mathf.Rad2Deg;
}
```

```javascript
import { dot } from '../core/xform.js';
const len = (v) => Math.hypot(...v);
const thetaDeg = Math.acos(dot(a, b) / (len(a) * len(b))) * 180 / Math.PI;   // 43.0887
```

</div>

<small>The C# is EX_5_1_MyScript.cs, Chap-5-DotProducts; its guard avoids dividing by a zero-length vector.</small>


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

## Sign = the in-front-of test

<img src="../../textbook/figures/vec-dot-sign.svg" alt="the sign of the dot product splits space into front and behind" style="height:220px">

```text
a . b > 0  ->  b in FRONT of a      a . b = 0  ->  b at 90 degrees      a . b < 0  ->  b BEHIND a
```

Aim `a` = the way the drone faces, `b` = toward the target. Fire only when `a . b > 0`.


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

<img src="../../textbook/figures/vecr-right-hand.svg" alt="a and b spanning a shaded plane, a curl arrow from a toward b, a cross b = (1, -2, 3) on one side of the plane and b cross a = (-1, 2, -3) dashed on the other" style="height:320px">

```csharp
Vector3 v1xv2 = Vector3.Cross(v1, v2);
Vector3 v2xv1 = Vector3.Cross(v2, v1);   // equals -v1xv2
```


---

## The length is an area

<img src="../../textbook/figures/vec-cross-area.svg" alt="the parallelogram spanned by a and b, area |a x b|" style="height:230px">

```text
|a x b| = |a| |b| sin(theta) = sqrt(1 + 4 + 9) = sqrt(14) ~= 3.742
check:    sqrt(5) sqrt(6) sin(43.1°) = 5.477 * 0.683 ~= 3.742
```


---

## In 2D: the perp-dot product

<img src="../../textbook/figures/vecr-perp-dot.svg" alt="Two panels. Left: u = (2, 1), v = (1, 2), a counterclockwise arc and u perp v = 3, a left turn. Right: the order swapped, a clockwise arc and -3, a right turn. Both shade the parallelogram of area 3" style="height:260px">

`u ⊥ v = ux·vy − uy·vx`:

- **zero**: parallel
- **sign**: which side, left or right turn
- **size**: the parallelogram's area


---

## The area of any polygon: sum the crosses

<img src="../../textbook/figures/vecr-polygon-area.svg" alt="The pentagon (1, 1), (5, 0.5), (6, 3), (3.5, 5), (0.5, 3.5) with a triangle from the origin to each edge, blue triangles adding and red ones subtracting, summing to 16.875" style="height:340px">

The sign tells the winding: **positive** counterclockwise, **negative** clockwise.


---

## Worked: a face normal from two edges

<img src="../../textbook/figures/vecr-face-normal.svg" alt="Left: the triangle P0 = (0,0,0), P1 = (2,0,0), P2 = (0,0,-2) with edges e1, e2, a counterclockwise winding arrow and the normal (0, 1, 0) pointing up. Right: P1 and P2 swapped, clockwise winding, normal (0, -1, 0) pointing down" style="height:320px">

```csharp
Vector3 n = Vector3.Cross(v1, v2);
if (Vector3.Dot(n, Vector3.forward) > 0) n = -n;   // flip to face the chosen side
```


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

