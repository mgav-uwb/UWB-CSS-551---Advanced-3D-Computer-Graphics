<!--
  CSS 551 · TOPIC DECK: Vector geometry: frames, lines, planes, triangles, precision (~28 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/vector-geometry.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES: two vectors to an orthonormal frame and its parallel-input failure; coordinates in a frame
  by dots; Gram-Schmidt; parametric lines and segments (the clamp table), point to segment in both
  tracks, point to line in 3D by one cross, the distance between skew lines; planes and signed
  distance, which side, projection onto a plane, reflection; ray against plane (four cases) and a ray
  meeting the ground; barycentric coordinates (inside, on an edge, outside) in both tracks; the
  float32 hazards: arccos near 0 and just past 1, the atan2 angle in both tracks, cancellation far
  from the origin.
  SPLIT 2026-10-05 from vectors-dot-cross.md (archived in topics/archive/). Moved to the chapter only:
  "is it a basis" (Exercise 7), "dots need an orthonormal frame" (Section 1.1), ray against sphere
  (the ray-tracing topic), interpolating attributes with the weights (the rasterization topic), and
  testing with == (Section 8).
  NEEDS:   the vectors-review topic (the projection split, the cross product, the triple product).
  DEMOS:   none (figures).
  NUMBERS: textbook/figures/numbers-foundations.json (keys vec, line, plane) or recomputed by node
           against lib/core/xform.js and Math.fround.
  FIGURES: ../../textbook/figures/vec-*.svg (tools/gen-textbook-figures-foundations.mjs).
  READING: ../../textbook/vectors.html, Sections 4 to 8.
  SOURCE:  Real C# excerpts are from Kelvin Sung's CSS 451 ClassExamples (Chap-5).

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Paths are relative to the
  lecture page that mounts this topic (lectures/LNN-slug/index.html).
-->

### Vector geometry: frames, lines, planes, triangles

<small>(~28 min) · reading: <a href="../../textbook/vectors.html">Vectors</a>, Sections 4 to 8</small>


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

## Gram-Schmidt: the same frame, another recipe

Orthonormalize `a`, `b`, `c = (0, 0, 1)` in order: subtract what each vector has along the axes already built, then normalize.

```text
e1 = a / |a|                                     = (0.894, 0.447, 0)
b - (b.e1) e1 = (1,2,1) - 1.789 e1 = (-0.6, 1.2, 1)   ->  e2 = (-0.359, 0.717, 0.598)
c - (c.e1) e1 - (c.e2) e2 = (0.214, -0.429, 0.643)    ->  e3 = (0.267, -0.535, 0.802)
```

`e3 = u` and `e2 = -t`: the two recipes build the same frame up to order and sign; `e1 x e2 = e3`, so it is right-handed.


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

## Real code: point to segment, both tracks

```csharp
Vector3 vt  = Pt.transform.localPosition - P0.transform.localPosition;
Vector3 v1n = v1.normalized;                       // unit direction
float d = Vector3.Dot(vt, v1n);                    // projected length = t
Pon.transform.localPosition = P0.transform.localPosition + d * v1n;  // foot
bool inside = (d >= 0) && (d <= v1.magnitude);     // the segment range test
```

<small>EX_5_3_MyScript.cs, Chap-5-DotProducts.</small>

```js
const v1n = normalize(sub(P1, P0)), d = dot(sub(Pt, P0), v1n);   // xform.js
const inside = d >= 0 && d <= Math.hypot(...sub(P1, P0));
// P0 = (0,0,0), P1 = (4,2,0), Pt = (6,4,0):  d = 7.155, inside = false
```


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

## Reflection: flip the along part

Split **d** into the part along a unit normal **n** and the part across it; reflection keeps the across part and **negates** the along part:

```text
   r = d − 2 (d·n) n

   d = (1, 0, 0), a mirror tilted 45°: n = (1, 1, 0)/√2 = (0.707, 0.707, 0)
   d·n = 0.707   →   r = (1, 0, 0) − 2 · 0.707 · (0.707, 0.707, 0) = (0, −1, 0)
```

A ray going right, off a 45° mirror, goes straight down. Mirrors, bounces, specular highlights, ray-traced reflections: all this line.


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

## Pitfall: arccos near 0° and just past 1

Angle between `(1, 0, 0)` and `(cos θ, sin θ, 0)`, every operation in float32:

| true θ (rad) | float32 dot | acos: relative error | atan2(\|a×b\|, a·b): relative error |
| --- | --- | --- | --- |
| 0.01 | 0.99994999 | 8.7e-5 | 1.8e-8 |
| 0.001 | 0.99999952 | 0.023 | 4.2e-8 |
| 0.0001 | 1.00000000 | 1 (returns 0) | 2.9e-8 |

- below θ = √(2ε) ≈ 4.9e-4 rad (0.03°) the dot rounds to exactly 1 and acos returns **0**
- normalize (1, 0, 4) in float32 and dot it with itself: **1.0000001**, and acos of that is **NaN**


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

## Pitfall: cancellation far from the origin

```text
   (10⁶, 1, 0) · (1, −10⁶, 0) = 10⁶ − 10⁶ = 0          in exact arithmetic
   in float32, each product is known to about ± 0.1   → the computed 0 is noise of that size
```

- the relative error of float32 is about **1.2 × 10⁻⁷**; at 10⁶ that is **0.1** absolute
- positions a million units from the origin lose everything below a tenth of a unit
- **subtract a nearby reference point first**, then compute: the view matrix does exactly this for every vertex

