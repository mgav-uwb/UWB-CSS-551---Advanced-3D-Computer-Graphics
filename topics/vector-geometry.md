<!--
  CSS 551 · TOPIC DECK: Vector geometry: frames, lines, planes, triangles, precision (~30 min).
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
  EDITED 2026-10-08: the three two-track listings (point to segment, barycentric weights, the atan2
  angle) put in Unity/WebGL code tabs; notes that pointed at a HW1 which-side exercise now point at
  HW2's signedDistance (EX3) and shadowOnPlane (EX4).
  EDITED 2026-10-13 (consistency pass): one name per quantity (line direction d, distance along it t; the
  segment code renamed to match and given the clamp), every given stated on the slide that uses it, the
  arccos threshold corrected to sqrt(eps/2) = 2.4e-4 rad, the cancellation example replaced by one that
  loses digits (1000000.1 and 1000000.2 in float32), "behind the start o", lookAt sign note.
  FIXED 2026-10-13: the segment table gave the distances to the infinite line (0.894, 1.342) as the
  distances to the segment; they are 2.828 and 1.414 (Quiz bank item vec-segment-distance-01 has it right).
  EDITED 2026-10-13 (improvement pass): frame, orthonormal, look-at, skew lines, normal, frustum culling,
  clipping, barycentric, centroid, float32, machine epsilon, cancellation and atan2 defined where they first
  appear; figures for Gram-Schmidt, the parametric line, the distance to a line, skew lines, projection and
  reflection, and the ray cases; the vec-geometry demo slide (five modes) before the precision pitfalls.
  NEEDS:   the vectors-review topic (the projection split, the cross product, the triple product).
  DEMOS:   vec-geometry (data-controls="modes,reflect"), one full-slide demo with five modes.
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

<small>(~30 min) · reading: <a href="../../textbook/vectors.html">Vectors</a>, Sections 4 to 8</small>


---

## Two vectors, a whole frame

<img src="../../textbook/figures/vec-frame.svg" alt="an orthonormal frame built from a and b" style="height:290px">

A **frame**: three axes to measure along; **orthonormal**: each of unit length, mutually perpendicular. From `a = (2, 1, 0)`, `b = (1, 2, 1)`:

```text
w = normalize(a)             = (0.894, 0.447, 0)        along a
u = normalize(a × b)         = (0.267, -0.535, 0.802)   a × b = (1, -2, 3): perpendicular to a and b
t = normalize(a × (a × b))   = (0.359, -0.717, -0.598)  a × (1, -2, 3) = (3, -6, -5): perpendicular to a and u
```


---

## When the frame cannot be built

Same recipe, `a = (0, 0, 1)`, `b = (1, 0, 1)`:

```text
   w = a = (0, 0, 1)      u = a × b = (0, 1, 0)      t = a × u = (−1, 0, 0)      three right angles
```

Now `b = (0, 0, 2)`, parallel to a:

```text
   a × b = (0, 0, 0)      normalize(0, 0, 0) = 0 / 0 = (NaN, NaN, NaN)
```

- parallel inputs span **no plane**, so no axis square to both exists: `u = normalize(0)` fails, and `t` with it
- the **look-at** failure: a camera builds its frame from its view direction and an "up" hint; up along the view direction breaks it
- test |a × b| before normalizing: 0 / 0 is NaN (not a number), and NaN spreads into everything computed from it


---

## Coordinates in a frame

Read a vector in the frame `(w, u, t)` of `a = (2, 1, 0)`, `b = (1, 2, 1)` by **three dots**:

```text
a in the frame:  (a·w, a·u, a·t) = (2.236, 0, 0)          a is the first axis, at its own length
b in the frame:  (b·w, b·u, b·t) = (1.789, 0, -1.673)
rebuild:         1.789 w - 1.673 t = (1, 2, 1)             1.789² + 1.673² = 6 = |b|²
```

- `1.789 = a·b / |a| = 4/√5`: the **shadow** of b on a; `1.673`: the **height** of the parallelogram on a and b, negative because `t ∝ a × (a × b) = 4a − 5b` points away from b
- each axis is unit and square to the other two, so `b·w` picks out exactly b's amount along w: the dots **are** the coordinates


---

## Gram-Schmidt: another recipe

Make three vectors an orthonormal frame, one at a time: from each, subtract its shadow on the axes already built, then normalize.

<div style="display:flex; gap:24px; align-items:center; justify-content:center;">
<img src="../../textbook/figures/vec-gram-schmidt.svg" alt="b split into its shadow along e1 and a perpendicular remainder, which normalizes to e2" style="height:330px; margin:0;">
<pre style="width:auto; margin:0;"><code class="text">a = (2, 1, 0)  b = (1, 2, 1)  c = (0, 0, 1)&#10;
e1 = a / |a|   = (0.894, 0.447, 0)&#10;
r2 = b - (b·e1) e1
   = (1,2,1) - 1.789 e1 = (-0.6, 1.2, 1)
e2 = r2 / |r2| = (-0.359, 0.717, 0.598)&#10;
r3 = c - (c·e1) e1 - (c·e2) e2
   = c - 0 e1 - 0.598 e2 = (0.214, -0.429, 0.643)
e3 = r3 / |r3| = (0.267, -0.535, 0.802)</code></pre>
</div>

`e3 = u` and `e2 = -t`: the two recipes build the same frame up to order and sign; `e1 × e2 = e3`, so it is right-handed (like the axes: x × y = z).


---

## A line is a point and a direction

<img src="../../textbook/figures/vec-param-line.svg" alt="a line P(t) = P0 + t d with ticks at t = -1, 0, 0.5, 1, 2; the segment from 0 to 1 and the ray t at least 0 highlighted" style="height:200px">

Every point on the line is the base point plus some amount of the direction:

```text
P(t) = P0 + t * d
```

- `t = 0` sits at `P0`; `t = 1` sits at `P0 + d`; negative `t` runs backward (this `t` is a number, not the frame axis)
- a **segment** keeps `t` in a range (`0` to `1` if `d = P1 − P0`); a **ray**: `t ≥ 0`
- with a **unit** direction `d̂ = d / |d|`, `t` is a **distance** along the line


---

## Worked: nearest point on a segment

<img src="../../textbook/figures/vec-line-foot.svg" alt="three points projected onto a segment, two clamped to its ends" style="height:200px">

Segment `P0 = (0, 0)` to `P1 = (4, 2)`: `d = P1 − P0 = (4, 2)`, `|d| = 4.472`, `d̂ = (0.894, 0.447)`. For a query point `Pt` (a fixed point, not P(t)): `t = (Pt − P0) · d̂`, foot `P0 + t d̂`, nearest point `P0 + clamp(t, 0, |d|) d̂`.

| Pt | t | foot | inside? | nearest point of the segment |
| --- | --- | --- | --- | --- |
| (1, 3) | 2.236 | (2, 1) | yes | (2, 1), distance 2.236 |
| (6, 4) | 7.155 | (6.4, 3.2) | no, t > 4.472 | the end (4, 2), distance 2.828 |
| (−1, 1) | −0.447 | (−0.4, −0.2) | no, t < 0 | the start (0, 0), distance 1.414 |


---

## Real code: point to segment, both tracks

<div class="code-tabs">

```csharp
// GameObjects: P0, P1 segment ends; Pt query point; Pon marks the foot
Vector3 d    = P1.transform.localPosition - P0.transform.localPosition;  // direction
Vector3 p    = Pt.transform.localPosition - P0.transform.localPosition;  // Pt - P0
Vector3 dHat = d.normalized;                       // unit direction
float t = Vector3.Dot(p, dHat);                    // distance along the line
Pon.transform.localPosition = P0.transform.localPosition + t * dHat;  // foot
bool inside = (t >= 0) && (t <= d.magnitude);      // the segment range test
float tc = Mathf.Clamp(t, 0f, d.magnitude);        // clamp to the segment
Vector3 nearest = P0.transform.localPosition + tc * dHat;  // nearest point of the segment
```

```javascript
// points are [x, y, z] arrays; sub, dot, normalize from lib/core/xform.js
const d    = sub(P1, P0);                          // direction
const p    = sub(Pt, P0);                          // Pt - P0
const dHat = normalize(d);                         // unit direction
const t    = dot(p, dHat);                         // distance along the line
const foot = [P0[0] + t * dHat[0], P0[1] + t * dHat[1], P0[2] + t * dHat[2]];
const inside = t >= 0 && t <= Math.hypot(...d);    // the segment range test
const tc = Math.min(Math.max(t, 0), Math.hypot(...d));   // clamp to the segment
const nearest = [P0[0] + tc * dHat[0], P0[1] + tc * dHat[1], P0[2] + tc * dHat[2]];
// P0 = (0,0,0), P1 = (4,2,0), Pt = (6,4,0): t = 7.155, inside false, nearest (4, 2, 0)
```

</div>

<small>The C# is adapted from EX_5_3_MyScript.cs (Chap-5-DotProducts), with the slide's names.</small>


---

## Distance to a line in 3D: one cross

<img src="../../textbook/figures/vec-point-line.svg" alt="in the plane of a and b, a lies 1.633 along the line and 1.528 across it; the parallelogram of a and the unit direction has height 1.528" style="height:240px">

The point `a = (2, 1, 0)`; the line through the origin along `b = (1, 2, 1)`, unit `b̂ = b / |b| = (0.408, 0.816, 0.408)`:

```text
along:   a · b̂       = 4 / √6        = 1.633
across:  |a × b̂|     = √14 / √6      = 1.528       |a × b̂| = |a| |b̂| sin θ = |a| sin θ
check:   1.633² + 1.528² = 2.667 + 2.333 = 5 = |a|²
```

The across distance is the length of a's across part from the projection split, **without building that vector**. For a line through `P0`, use `Pt − P0` in place of `a`.


---

## Two skew lines: one cross, one dot

<img src="../../textbook/figures/vec-skew-lines.svg" alt="two skew lines joined by their shortest segment, perpendicular to both, of length 0.707" style="height:270px">

**Skew lines** neither meet nor run parallel (only in 3D). Line 1 is `p1 + s d1`, line 2 is `p2 + t d2`. The shortest segment between them is perpendicular to both: along **d1 × d2**.

```text
   distance = | (p2 − p1) · (d1 × d2) | / | d1 × d2 |       the part of p2 − p1 along d1 × d2

   p1 = (0, 0, 0), d1 = (1, 0, 0);   p2 = (0, 1, 2), d2 = (0, 1, 1)
   d1 × d2 = (0, −1, 1),  (p2 − p1)·(0, −1, 1) = −1 + 2 = 1
   distance = 1 / √2 = 0.707
```


---

## A plane is a point and a normal

<img src="../../textbook/figures/vec-plane-distance.svg" alt="a plane with its normal and a point's signed distance" style="height:310px">

The **normal** `n` is a vector perpendicular to the plane. Every point of the plane has the same dot with it (for P, Q in the plane, P − Q lies in the plane, so n · (P − Q) = 0):

```text
n · P = D        D = n · Q for any point Q on the plane;   with unit n, D is the plane's signed distance from the origin
```


---

## Worked: point-to-plane distance

Plane through `Q = (1, 0, 0)` with normal `m = (1, 2, 2)`. First make the normal **unit**:

```text
|m| = √(1 + 4 + 4) = 3      n = m / 3 = (1/3, 2/3, 2/3)      D = n · Q = 1/3
```

Signed distance of `P = (4, 1, 0)`, `n · P − D = n · (P − Q)` (the part of P − Q along the unit normal), and its foot on the plane:

```text
n · P - D = (4 + 2 + 0)/3 - 1/3 = 5/3 ≈ 1.667          positive: P is on the side n points to
foot = P - 1.667 n = (3.444, -0.111, -1.111)            check: n · foot = 0.333 = D, on the plane
```


---

## Which side? Reuse the dot sign

The **sign** of `n · P - D` says which side: the vectors review's "is it in front?" dot test, with the plane's offset D subtracted:

```text
n · P - D  >  0   ->  P is in FRONT (the side n points to)
n · P - D  =  0   ->  P is ON the plane
n · P - D  <  0   ->  P is BEHIND
```

One dot, one subtraction, one comparison: HW2's `signedDistance`, and later **frustum culling** (skip objects outside the camera's view volume, a truncated pyramid bounded by six planes) and **clipping** (cut triangles at those planes).


---

## Project onto a plane: remove the normal part

Keep only the across part: **v − (v·n) n**, for a unit normal n. Project `v = a = (2, 1, 0)` onto the plane through the origin with normal `n = (1, 2, 2)/3`:

```text
   v·n = (2 + 2 + 0)/3 = 1.333
   v − 1.333 (0.333, 0.667, 0.667) = (1.556, 0.111, −0.889)
   check: (1.556, 0.111, −0.889)·n = 0
```

A shadow direction on the ground, a camera sliding along a wall, a velocity after hitting a floor. A **point** p projects onto `n · P = D` as `p − (n · p − D) n`: the foot of two slides back.


---

## Reflection: flip the along part

<img src="../../textbook/figures/vec-project-reflect.svg" alt="left: projecting v drops its part along n; right: reflecting d off a 45 degree mirror flips the along part, turning (1, 0, 0) into (0, -1, 0)" style="height:270px">

Reflection keeps the part across the unit normal **n** and **negates** the part along it:

```text
   r = d − 2 (d·n) n

   d = (1, 0, 0), a mirror tilted 45°: n = (1, 1, 0)/√2 = (0.707, 0.707, 0)
   d·n = 0.707   →   r = (1, 0, 0) − 2 (0.707) (0.707, 0.707, 0) = (0, −1, 0)
```

The sign of n does not matter (it appears twice): `−n` gives the same `r`. The figure draws `d` and `r` from the hit point.


---

## Ray against plane: four cases

Ray `o + t d` (start `o`, direction `d`, `t ≥ 0`), plane `n · P = D`. Substitute: `n · (o + t d) = D`, so `n · o + t (n · d) = D` and `t = (D − n · o) / (n · d)`: the gap still to close over the rate the ray closes it.

<img src="../../textbook/figures/vec-ray-plane.svg" alt="side view of the plane with four rays: a hit at t = 1.667, a hit at Q at t = 1, a parallel ray that never meets, and a plane behind the ray's start at t = -1.667" style="height:330px">


---

## Worked: a ray meets the ground

A ray from `o = (0, 5, 0)` along `d = (0.6, −0.8, 0)`; the ground `y = 0` is `n = (0, 1, 0)`, `D = 0`:

```text
   n · d = −0.8          (the ray descends 0.8 per unit of t)
   n · o =  5            (it starts 5 above the plane)
   t = (D − n · o) / (n · d) = (0 − 5) / (−0.8) = 6.25
   hit = o + 6.25 d = (3.75, 0, 0)
```

With `o` above the ground (`n · o > D`), `n · d ≥ 0` means the ray climbs or runs level: **no hit**. (A mouse-drag tool casts this ray from the camera; on no hit it leaves the object where it was.)


---

## Barycentric coordinates: weights in a triangle

<img src="../../textbook/figures/vec-barycentric.svg" alt="a triangle with a point and its three sub-triangles" style="height:240px">

```text
X = w0 P0 + w1 P1 + w2 P2,   w0 + w1 + w2 = 1         X is a weighted mix of the corners
n  = (P1 - P0) × (P2 - P0)                            the triangle's normal; |n| = twice its area
w0 = ((P1 - X) × (P2 - X)) · n / (n · n)              opposite P0
w1 = ((P2 - X) × (P0 - X)) · n / (n · n)              opposite P1;   w2 = 1 - w0 - w1
```

Each weight is the **signed area** of the sub-triangle opposite its corner, over the whole. (Barycentric, from barycenter, the center of mass: X is the balance point of masses w0, w1, w2 at the corners.)


---

## Worked: inside, on an edge, outside

`P0 = (0,0,0)`, `P1 = (2,0,0)`, `P2 = (0,0,-2)`; `n = (0, 4, 0)`, `n · n = 16`.

| X | (w0, w1, w2) | sum | verdict |
| --- | --- | --- | --- |
| (0.5, 0, −0.5) | (0.5, 0.25, 0.25) | 1 | inside |
| (2/3, 0, −2/3) | (1/3, 1/3, 1/3) | 1 | inside: the centroid (the corners' average) |
| (1, 0, −1) | (0, 0.5, 0.5) | 1 | on the edge opposite P0 |
| (2, 0, −2) | (−1, 1, 1) | 1 | outside, beyond the edge opposite P0 |

First row by hand: `(P1 - X) × (P2 - X) = (1.5, 0, 0.5) × (-0.5, 0, -1.5) = (0, 2, 0)`, dot n = 8, `w0 = 8/16 = 0.5`.


---

## Real code: barycentric weights, both tracks

<div class="code-tabs">

```csharp
// Vector3 corners P0, P1, P2 and the point X
Vector3 n  = Vector3.Cross(P1 - P0, P2 - P0);
float   nn = Vector3.Dot(n, n);
float   w0 = Vector3.Dot(Vector3.Cross(P1 - X, P2 - X), n) / nn;
float   w1 = Vector3.Dot(Vector3.Cross(P2 - X, P0 - X), n) / nn;
float   w2 = 1f - w0 - w1;                       // the weights sum to 1
bool inside = w0 >= 0f && w1 >= 0f && w2 >= 0f;
```

```javascript
// corners P0, P1, P2 and the point X as [x, y, z]; sub, dot, cross from xform.js
const n  = cross(sub(P1, P0), sub(P2, P0));
const nn = dot(n, n);
const w0 = dot(cross(sub(P1, X), sub(P2, X)), n) / nn;
const w1 = dot(cross(sub(P2, X), sub(P0, X)), n) / nn;
const w2 = 1 - w0 - w1;                          // the weights sum to 1
const inside = w0 >= 0 && w1 >= 0 && w2 >= 0;    // X = (0.5, 0, -0.5): [0.5, 0.25, 0.25], true
```

</div>


---

<!-- .slide: class="demo-full" -->

## Frames, segments, planes, rays, triangles, live

<div class="cockpit" data-demo="vec-geometry" data-controls="modes,reflect"><pre class="viz-fallback">  frame        a = (2, 1, 0), b = (1, 2, 1):  w = (0.894, 0.447, 0), u = (0.267, -0.535, 0.802), t = (0.359, -0.717, -0.598)
  segment      P0 = (0, 0), P1 = (4, 2), Pt = (1, 3):  t = 2.236, foot (2, 1), inside, distance 2.236
  plane        n = (1, 2, 2)/3, D = 1/3, P = (4, 1, 0):  n·P - D = 1.667 (in front), foot (3.444, -0.111, -1.111)
  ray          o = (0, 5, 0), d = (0.6, -0.8, 0) against y = 0:  t = 6.25, hit (3.75, 0, 0)
  barycentric  X = (0.5, 0, -0.5):  (w0, w1, w2) = (0.5, 0.25, 0.25), inside</pre></div>


---

## Pitfall: arccos near 0° and just past 1

Angle between `a = (1, 0, 0)` and `b = (cos θ, sin θ, 0)`, every operation in **float32** (single precision: 24 significant bits, about 7 decimal digits; the GPU's and Unity's number type):

| true θ (rad) | float32 dot | acos: relative error | atan2(\|a×b\|, a·b) (next slide): relative error |
| --- | --- | --- | --- |
| 0.01 | 0.99994999 | 8.7e-5 | 1.8e-8 |
| 0.001 | 0.99999952 | 0.023 | 4.2e-8 |
| 0.0001 | 1.00000000 | 1 (returns 0) | 2.9e-8 |

- **ε** (machine epsilon) = 1.19e-7, the gap between 1 and the next float32 (just below 1 the gap is ε/2); the dot is about 1 − θ²/2, so below θ = √(ε/2) ≈ 2.4e-4 rad (0.014°) it rounds to exactly 1 and acos returns **0**
- normalize (1, 0, 4) in float32 and dot it with itself: **1.0000001**, and acos of that is **NaN**


---

## Real code: an angle that never fails

<div class="code-tabs">

```csharp
// Unity: degrees between two directions; no normalize, no clamp needed
float AngleDeg(Vector3 a, Vector3 b) {
    return Mathf.Atan2(Vector3.Cross(a, b).magnitude, Vector3.Dot(a, b)) * Mathf.Rad2Deg;
}
```

```javascript
// WebGL: degrees between two directions; cross and dot from lib/core/xform.js
function angleDeg(a, b) {
    return Math.atan2(Math.hypot(...cross(a, b)), dot(a, b)) * 180 / Math.PI;
}
angleDeg([2, 1, 0], [1, 2, 1]);   // 43.0887
```

</div>

- `atan2(y, x)` is the angle of the point (x, y), in all four quadrants, with no division
- |a × b| = |a||b| sin θ and a · b = |a||b| cos θ: atan2 of the pair cancels **both lengths**
- full precision near 0° and near 180°; no domain to leave


---

## Pitfall: cancellation far from the origin

Two points 0.1 apart, a million units from the origin, stored in float32:

```text
   x1 = 1000000.1   stored as 1000000.125        float32 numbers near 10⁶ are 0.0625 apart
   x2 = 1000000.2   stored as 1000000.1875
   x2 − x1 = 0.0625                              true 0.1: 37.5 % wrong
   near the origin:  0.2 − 0.1 = 0.1000000015     right to 8 digits
```

- **cancellation**: subtracting two nearly equal numbers cancels their leading digits; what is left is mostly their rounding errors
- the spacing of float32 grows with size: 0.6 to 1.2 × 10⁻⁷ times the number, **0.0625** at 10⁶
- the cure: **keep the numbers small**: store positions relative to a nearby origin (the camera, the object) before they become float32

