<!--
  CSS 551 · TOPIC DECK: Linear algebra for graphics, a recap (~40 min, 31 slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/linear-algebra-recap.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES (a slow recap for a room that is not yet fluent in vectors, one idea per slide): points
  against displacements, a vector written as a column; add and scale; length and the unit vector;
  aim and march; a polygon as an ordered list of vertices, edges as differences, triangles, the
  winding; how Unity and three.js store one (opposite front-face windings); a line as a point and
  a direction (segment, ray, two points); a plane as a point and a normal (n·x = D, from three
  points); the dot product by components and as |a||b| cos θ, the angle, the perpendicular test
  and the sign; the trigonometry under both products (the law of cosines, the angle-difference
  identities for the dot and the 2D perp-dot, Lagrange's identity as cos² + sin² = 1); projection
  and the along/across split; the cross product by components, the right-hand rule, the area,
  the parallel test, a face normal and its winding; closest points and distances (point to point,
  to a line by projection and by one cross, to a segment by clamping, to a plane by the signed
  distance); closest-point code in both tracks; Unity's and three.js's Vector3 with their traps;
  the two cheat sheets.
  BUILT 2026-10-20 for L06 (the recap lecture) from vectors-review.md and vector-geometry.md (slides
  copied and adapted; those topics are unchanged).
  2026-10-22: display formulas typeset with MathJax (lib/deck-math.js); the ASCII form kept as each block's aria-label.
  NEEDS:   nothing beyond high-school algebra and trigonometry.
  DEMOS:   dot-cross (data-controls="ax,ay,bx,by") and vec-geometry (data-controls="modes,reflect"),
           each on a demo-full slide, markup and fallbacks as in vectors-review.md and vector-geometry.md.
  NUMBERS: a = (2, 1, 0), b = (1, 2, 1) as in the demo and vectors-review.md; the trig pair at
           20° and 80°; the plane through (0, 2, 0) with normal (0, 3, 4) and P = (1, 4, 3)
           (deliberately not HW2's published plane); the segment (0, 0) to (4, 2) with t as a
           fraction of d. All recomputed by node (and the vendored three.js); the C# compiled with
           mcs against homework/grading/unity-shim and run.
  HW2:     no code for HW2's graded functions (planeFromPoint, signedDistance, shadowOnPlane,
           linePlaneHit, reflect, projectToCylinder, marchStep, lineFrame); the plane distance is
           shown as a formula and a worked example only.
  FIGURES: ../../textbook/figures/vec-*.svg and vecr-*.svg; two inline SVGs (the 3 by 2 polygon,
           the unit-circle pair); ../../topics/media/css451/sung-ch08-s23.webp (Sung's CSS 451
           slides, chapter 8, slide 23).
  READING: ../../textbook/vectors.html; ../../reference/linear-algebra-cheat-sheet.html,
           ../../reference/trig-cheat-sheet.html.
  SOURCE:  C# excerpts on the vector slides are from Kelvin Sung's CSS 451 ClassExamples (Chap-4 to Chap-6).

  SIMPLIFIED 2026-10-20 (Marcel: for most of the room this is the first linear algebra): cut the law-of-cosines,
  perp-dot and Lagrange slides, the engines' mesh storage, the cross-product line distance and the vec-geometry
  demo; the plane moved after the cross product, which it uses. 25 slides, ~34 min.
  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Paths are relative to the
  lecture page that mounts this topic (lectures/LNN-slug/index.html).
-->

### Linear algebra for graphics, a recap

<small>(~34 min) · reading: <a href="../../textbook/vectors.html">Vectors</a> · cheat sheets: <a href="../../reference/linear-algebra-cheat-sheet.html">linear algebra</a>, <a href="../../reference/trig-cheat-sheet.html">trigonometry</a></small>


---

## Points and displacements

<img src="../../textbook/figures/vecr-points.svg" alt="Points Pi at (1, 1) and Pj at (4, 3) with dashed position arrows from the origin and a red displacement arrow from Pi to Pj labeled Pj minus Pi equals (3, 2)" style="height:300px">

```csharp
Vector3 vectorVe = Pj.transform.localPosition - Pi.transform.localPosition;
```

- a **point** is a place; a **vector** is a displacement: how far, in which direction
- the vector from Pi to Pj is **tip minus tail**: Pj − Pi = (3, 2); `Pi − Pj` points the other way


---

## Writing a vector: a column of numbers

<img src="../../topics/media/css451/sung-ch08-s23.webp" alt="Sung's slide: a vertex position Va = (xa, ya, za), written as a column vector and as its transpose, a row vector" style="height:300px">
<span class="credit">K. Sung, CSS 451 slides, ch. 8 (Sung, Shirley, Baer, Essentials of Interactive Computer Graphics)</span>

- the **components** are the amounts along x, y and z: (2, 1, 0) is 2 along x, 1 along y, 0 along z
- this course writes a vector as a **column**; its **transpose** is the same numbers as a row
- a matrix acts on a column from the **left**: `M v`


---

## Add and scale, geometrically

<img src="../../textbook/figures/vecr-add-scale.svg" alt="Left: u = (3, 1) and v = (1, 2) laid tip to tail give u + v = (4, 3), with v then u giving the same sum. Right: v = (2, 0.5) with 2v, 0.5v and minus v drawn along the same line" style="height:330px">

Add **component by component**: (3, 1) + (1, 2) = (4, 3). Scale **every component**: 2 · (2, 0.5) = (4, 1).


---

## Length, and the unit vector

<img src="../../textbook/figures/vecr-normalize.svg" alt="v = (3, 4) of length 5 drawn with its 3 and 4 legs, and the unit vector (0.6, 0.8) on a dashed unit circle; a note that (0, 0, 0) has no direction" style="height:300px">

<div class="tex" role="img" aria-label="|v| = sqrt(vx² + vy² + vz²)        |(3, 4, 0)| = sqrt(9 + 16) = 5
v̂  = v / |v|                        (3, 4, 0) / 5 = (0.6, 0.8, 0), length 1">
\[
\begin{aligned}
\lvert v \rvert &= \sqrt{v_x^2 + v_y^2 + v_z^2} && \lvert (3,\ 4,\ 0) \rvert = \sqrt{9 + 16} = 5 \\
\hat v &= v \,/\, \lvert v \rvert && (3,\ 4,\ 0) \,/\, 5 = (0.6,\ 0.8,\ 0),\ \text{length } 1
\end{aligned}
\]
</div>

A **unit vector** has length 1: a direction only. **(0, 0, 0) has no direction**: test the length before dividing.


---

## Worked: aim and march

<img src="../../textbook/figures/vecr-aim-march.svg" alt="Top view: drone A at (1, 0, 2), target R at (4, 0, -2), the red unit aim (0.6, 0, -0.8), and 31 green dots, one per frame, marching to the target" style="height:265px">

From **A** to **R** at **10 units/s**, one frame every **0.016 s**:

<div class="tex" style="font-size:0.65em" role="img" aria-label="1. aim      R − A                = (3, 0, −4)              tip minus tail
2. length   √(3² + 0² + 4²)      = 5                       the distance to fly
3. unit     (3, 0, −4) / 5       = (0.6, 0, −0.8)          direction only, length 1
4. step     10 × 0.016 × unit    = (0.096, 0, −0.128)      scale, then add each frame: length 0.16
5. frames   5 / 0.16             = 31.25                   after 31 steps, 0.04 is left">
\[
\begin{array}{llll}
\text{1. aim} & R - A & = (3,\ 0,\ {-4}) & \text{tip minus tail} \\
\text{2. length} & \sqrt{3^2 + 0^2 + 4^2} & = 5 & \text{the distance to fly} \\
\text{3. unit} & (3,\ 0,\ {-4}) \,/\, 5 & = (0.6,\ 0,\ {-0.8}) & \text{direction only, length 1} \\
\text{4. step} & 10 \times 0.016 \times \text{unit} & = (0.096,\ 0,\ {-0.128}) & \text{scale, then add each frame: length 0.16} \\
\text{5. frames} & 5 \,/\, 0.16 & = 31.25 & \text{after 31 steps, 0.04 is left}
\end{array}
\]
</div>


---

## A polygon is an ordered list of vertices

<svg viewBox="0 0 520 285" style="height:250px" role="img" aria-label="A 3 by 2 rectangle with corners P0 (0, 0), P1 (3, 0), P2 (3, 2), P3 (0, 2) in counterclockwise order; red edge arrows e0 = (3, 0), e1 = (0, 2), e2 = (-3, 0), e3 = (0, -2); a dashed diagonal from P0 to P2 splits it into triangles T0 and T1">
  <defs><marker id="la-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#c0392b"/></marker></defs>
  <polygon points="140,230 380,230 380,70 140,70" fill="#e8f6ef" stroke="none"/>
  <line x1="140" y1="230" x2="380" y2="70" stroke="#66708a" stroke-width="2" stroke-dasharray="7 6"/>
  <line x1="150" y1="230" x2="368" y2="230" stroke="#c0392b" stroke-width="3" marker-end="url(#la-arr)"/>
  <line x1="380" y1="222" x2="380" y2="82" stroke="#c0392b" stroke-width="3" marker-end="url(#la-arr)"/>
  <line x1="372" y1="70" x2="152" y2="70" stroke="#c0392b" stroke-width="3" marker-end="url(#la-arr)"/>
  <line x1="140" y1="78" x2="140" y2="218" stroke="#c0392b" stroke-width="3" marker-end="url(#la-arr)"/>
  <g fill="#1c2530" font-family="sans-serif" font-size="17">
    <circle cx="140" cy="230" r="5"/><circle cx="380" cy="230" r="5"/><circle cx="380" cy="70" r="5"/><circle cx="140" cy="70" r="5"/>
    <text x="120" y="257" text-anchor="end">P0 (0, 0)</text>
    <text x="400" y="257">P1 (3, 0)</text>
    <text x="400" y="62">P2 (3, 2)</text>
    <text x="120" y="62" text-anchor="end">P3 (0, 2)</text>
    <text x="300" y="185" fill="#00805a">T0</text>
    <text x="200" y="125" fill="#00805a">T1</text>
  </g>
  <g fill="#c0392b" font-family="sans-serif" font-size="15">
    <text x="260" y="252" text-anchor="middle">e0 = P1 − P0 = (3, 0)</text>
    <text x="392" y="155">e1 = (0, 2)</text>
    <text x="260" y="58" text-anchor="middle">e2 = (−3, 0)</text>
    <text x="128" y="155" text-anchor="end">e3 = (0, −2)</text>
  </g>
</svg>

- the **order** is the polygon: P0, P1, P2, P3, then back to P0
- each **edge** is a difference of consecutive vertices; around a closed loop the edges sum to **(0, 0)**
- a **triangle** is the simplest polygon, always flat; a polygon with n corners splits into **n − 2** triangles
- the order's direction is the **winding**: here **counterclockwise**, seen from the front


---

## A line is a point and a direction

<img src="../../textbook/figures/vec-param-line.svg" alt="a line P(t) = P0 + t d with ticks at t = -1, 0, 0.5, 1, 2; the segment from 0 to 1 and the ray t at least 0 highlighted" style="height:200px">

Every point on the line is the base point plus some amount of the direction:

<div class="tex" role="img" aria-label="P(t) = P0 + t d          through two points:  d = P1 − P0">
\[
P(t) = P_0 + t\,d \qquad \text{through two points: } d = P_1 - P_0
\]
</div>

- `t = 0` gives `P0`; `t = 1` gives `P0 + d`; negative `t` runs backward
- **segment**: `0 ≤ t ≤ 1` (with `d = P1 − P0`); **ray**: `t ≥ 0`; **line**: any `t`
- with a **unit** direction, `t` is a **distance** along the line


---

## The dot product: two definitions, one number

<div class="tex" style="font-size:0.75em" role="img" aria-label="by components:   a · b = ax bx + ay by + az bz           a number, not a vector
geometrically:   a · b = |a| |b| cos θ                    θ = the angle between a and b">
\[
\begin{aligned}
&\text{by components:} && a \cdot b = a_x b_x + a_y b_y + a_z b_z && \text{a number, not a vector} \\
&\text{geometrically:} && a \cdot b = \lvert a \rvert\, \lvert b \rvert \cos\theta && \theta = \text{the angle between } a \text{ and } b
\end{aligned}
\]
</div>

For **a = (2, 1, 0)**, **b = (1, 2, 1)**:

<div class="tex" role="img" aria-label="a · b      = 2·1 + 1·2 + 0·1     = 4
|a| |b|    = √5 · √6             = √30 ≈ 5.477
cos θ      = 4 / 5.477           ≈ 0.7303
θ          = arccos(0.7303)      ≈ 43.1°">
\[
\begin{aligned}
a \cdot b &= 2 \cdot 1 + 1 \cdot 2 + 0 \cdot 1 &&= 4 \\
\lvert a \rvert\, \lvert b \rvert &= \sqrt{5} \cdot \sqrt{6} &&= \sqrt{30} \approx 5.477 \\
\cos\theta &= 4 \,/\, 5.477 &&\approx 0.7303 \\
\theta &= \arccos(0.7303) &&\approx 43.1^\circ
\end{aligned}
\]
</div>

Three multiplies and two adds answer geometric questions. arccos returns **0° to 180°**: the angle has no sign.


---

## The sign: in front, at 90°, or behind

<img src="../../textbook/figures/vec-dot-sign.svg" alt="the sign of the dot product splits space into front and behind" style="height:220px">

<div class="tex" role="img" aria-label="a · b &gt; 0  -&gt;  θ &lt; 90°: b in FRONT of a      a · b = 0  -&gt;  θ = 90°: perpendicular      a · b &lt; 0  -&gt;  θ &gt; 90°: b BEHIND a">
\[
\begin{aligned}
a \cdot b &\gt 0 &&\Rightarrow\ \theta \lt 90^\circ\text{: } b \text{ in FRONT of } a \\
a \cdot b &= 0 &&\Rightarrow\ \theta = 90^\circ\text{: perpendicular} \\
a \cdot b &\lt 0 &&\Rightarrow\ \theta \gt 90^\circ\text{: } b \text{ BEHIND } a
\end{aligned}
\]
</div>

- (2, 1, 0) · (−1, 2, 1) = −2 + 2 + 0 = **0**: perpendicular
- the drone faces `a`, the target is along `b`: fire only when `a · b > 0`
- in floating point, test `|a · b| ≤ eps |a| |b|`, never `== 0`


---

## The dot product is the cosine of a difference

<svg viewBox="0 0 300 290" style="height:250px" role="img" aria-label="The unit circle with u at 20 degrees and v at 80 degrees; arcs mark alpha = 20 degrees, beta = 80 degrees and the angle between them, beta minus alpha = 60 degrees">
  <line x1="20" y1="150" x2="285" y2="150" stroke="#9aa3b5" stroke-width="1.5"/>
  <line x1="150" y1="280" x2="150" y2="15" stroke="#9aa3b5" stroke-width="1.5"/>
  <circle cx="150" cy="150" r="120" fill="none" stroke="#9aa3b5" stroke-width="1.5" stroke-dasharray="5 5"/>
  <path d="M184,150 A34,34 0 0 0 181.9,138.4" fill="none" stroke="#2a6fdb" stroke-width="2.5"/>
  <path d="M205,150 A55,55 0 0 0 159.5,95.8" fill="none" stroke="#7a52c7" stroke-width="2"/>
  <path d="M229.9,120.9 A85,85 0 0 0 164.8,66.3" fill="none" stroke="#00a36c" stroke-width="3"/>
  <line x1="150" y1="150" x2="262.8" y2="109.0" stroke="#2a6fdb" stroke-width="4"/>
  <line x1="150" y1="150" x2="170.8" y2="31.8" stroke="#c0392b" stroke-width="4"/>
  <g font-family="sans-serif" font-size="17">
    <text x="268" y="104" fill="#2a6fdb">u</text>
    <text x="176" y="28" fill="#c0392b">v</text>
    <text x="190" y="146" fill="#2a6fdb" font-size="14">α</text>
    <text x="196" y="112" fill="#7a52c7" font-size="14">β</text>
    <text x="212" y="78" fill="#00a36c" font-size="15">β − α</text>
    <text x="275" y="168" fill="#66708a" font-size="14">x</text>
    <text x="156" y="22" fill="#66708a" font-size="14">y</text>
  </g>
</svg>

<div class="tex" role="img" aria-label="u = (cos α, sin α) = (0.940, 0.342)              α = 20°
v = (cos β, sin β) = (0.174, 0.985)              β = 80°
u · v = cos α cos β + sin α sin β = cos(β − α)
      = 0.163 + 0.337 = 0.500 = cos 60°">
\[
\begin{aligned}
u &= (\cos\alpha,\ \sin\alpha) = (0.940,\ 0.342) && \alpha = 20^\circ \\
v &= (\cos\beta,\ \sin\beta) = (0.174,\ 0.985) && \beta = 80^\circ \\
u \cdot v &= \cos\alpha \cos\beta + \sin\alpha \sin\beta = \cos(\beta - \alpha) \\
&= 0.163 + 0.337 = 0.500 = \cos 60^\circ
\end{aligned}
\]
</div>


---

## The projection of u onto v

<img src="../../textbook/figures/vecr-projection.svg" alt="u and v drawn in their own plane with v along the x axis and the angle theta between them; the shadow of u on v, length |u| cos theta = 1.633, is highlighted in green, and a dashed orange line rises from its end to the tip of u. Beside it four steps: the shadow is a right triangle's side of length |u| cos theta; replacing cos theta by the dot product gives (u . v) / |v|; the direction is v / |v|; length times direction is ((u . v) / (v . v)) v" style="height:330px">

<div class="tex" role="img" aria-label="u-along = ( (u · v) / (v · v) ) v        v · v = |v|²: no square root
if |v| = 1:  u-along = (u · v) v        u-across = u − u-along">
\[
\begin{aligned}
u_{\text{along}} &= \left( \frac{u \cdot v}{v \cdot v} \right) v && v \cdot v = \lvert v \rvert^2\text{: no square root} \\
\text{if } \lvert v \rvert = 1\text{:}\quad u_{\text{along}} &= (u \cdot v)\, v && u_{\text{across}} = u - u_{\text{along}}
\end{aligned}
\]
</div>


---

## Worked: the split, and the check

For **u = (2, 1, 0)**, **v = (1, 2, 1)**: `u · v = 4`, `v · v = 6`, so the scale is `4/6 = 2/3`.

<div class="tex" role="img" aria-label="u-along  = (2/3)(1, 2, 1)                   = (0.667, 1.333, 0.667)
u-across = (2, 1, 0) − (0.667, 1.333, 0.667) = (1.333, −0.333, −0.667)">
\[
\begin{aligned}
u_{\text{along}} &= (2/3)(1,\ 2,\ 1) &&= (0.667,\ 1.333,\ 0.667) \\
u_{\text{across}} &= (2,\ 1,\ 0) - (0.667,\ 1.333,\ 0.667) &&= (1.333,\ {-0.333},\ {-0.667})
\end{aligned}
\]
</div>

Check: `u-across · v` must be **0**:

<div class="tex" role="img" aria-label="(4/3)(1) + (−1/3)(2) + (−2/3)(1) = 4/3 − 2/3 − 2/3 = 0">
\[
(4/3)(1) + ({-1/3})(2) + ({-2/3})(1) = 4/3 - 2/3 - 2/3 = 0
\]
</div>


---

## The cross product, by components

<div class="tex" role="img" aria-label="a × b = ( ay bz − az by ,
          az bx − ax bz ,
          ax by − ay bx )">
\[
a \times b = \begin{pmatrix} a_y b_z - a_z b_y \\ a_z b_x - a_x b_z \\ a_x b_y - a_y b_x \end{pmatrix}
\]
</div>

For **a = (2, 1, 0)**, **b = (1, 2, 1)**:

<div class="tex" role="img" aria-label="a × b = ( 1·1 − 0·2 , 0·1 − 2·1 , 2·2 − 1·1 ) = (1, −2, 3)">
\[
a \times b = (1 \cdot 1 - 0 \cdot 2,\ \ 0 \cdot 1 - 2 \cdot 1,\ \ 2 \cdot 2 - 1 \cdot 1) = (1,\ {-2},\ 3)
\]
</div>

Check it is perpendicular to both; each dot must be **0**:

<div class="tex" role="img" aria-label="(a × b) · a = 1·2 + (−2)·1 + 3·0 = 0      (a × b) · b = 1·1 + (−2)·2 + 3·1 = 0">
\[
\begin{aligned}
(a \times b) \cdot a &= 1 \cdot 2 + ({-2}) \cdot 1 + 3 \cdot 0 = 0 \\
(a \times b) \cdot b &= 1 \cdot 1 + ({-2}) \cdot 2 + 3 \cdot 1 = 0
\end{aligned}
\]
</div>


---

## Right-hand rule

<img src="../../textbook/figures/vecr-right-hand.svg" alt="a and b spanning a shaded plane, a curl arrow from a toward b, a cross b = (1, -2, 3) on one side of the plane and b cross a = (-1, 2, -3) dashed on the other" style="height:320px">

```csharp
Vector3 v1xv2 = Vector3.Cross(v1, v2);
Vector3 v2xv1 = Vector3.Cross(v2, v1);   // equals -v1xv2
```


---

## The length is an area; zero means parallel

<img src="../../textbook/figures/vec-cross-area.svg" alt="the parallelogram spanned by a and b, area |a x b|" style="height:220px">

<div class="tex" role="img" aria-label="|a × b| = |a| |b| sin θ = √(1 + 4 + 9) = √14 ≈ 3.742     parallelogram on a and b
triangle on a and b: half of it                  ≈ 1.871
parallel: a × b = 0       (1, 2, 1) × (−2, −4, −2) = (0, 0, 0)">
\[
\begin{gathered}
\lvert a \times b \rvert = \lvert a \rvert\, \lvert b \rvert \sin\theta = \sqrt{1 + 4 + 9} = \sqrt{14} \approx 3.742 \qquad \text{parallelogram on } a \text{ and } b \\
\text{triangle on } a \text{ and } b\text{: half of it} \approx 1.871 \\
\text{parallel: } a \times b = 0 \qquad (1,\ 2,\ 1) \times ({-2},\ {-4},\ {-2}) = (0,\ 0,\ 0)
\end{gathered}
\]
</div>


---

## Worked: a face normal, and the winding

<img src="../../textbook/figures/vecr-face-normal.svg" alt="Left: the triangle P0 = (0,0,0), P1 = (2,0,0), P2 = (0,0,-2) with edges e1, e2, a counterclockwise winding arrow and the normal (0, 1, 0) pointing up. Right: P1 and P2 swapped, clockwise winding, normal (0, -1, 0) pointing down" style="height:300px">

<div class="tex" role="img" aria-label="e1 = P1 − P0 = (2, 0, 0)     e2 = P2 − P0 = (0, 0, −2)
e1 × e2 = (0·(−2) − 0·0, 0·0 − 2·(−2), 2·0 − 0·0) = (0, 4, 0)    normal (0, 1, 0), area 4/2 = 2">
\[
\begin{aligned}
e_1 &= P_1 - P_0 = (2,\ 0,\ 0) \qquad e_2 = P_2 - P_0 = (0,\ 0,\ {-2}) \\
e_1 \times e_2 &= \big(0 \cdot ({-2}) - 0 \cdot 0,\ \ 0 \cdot 0 - 2 \cdot ({-2}),\ \ 2 \cdot 0 - 0 \cdot 0\big) = (0,\ 4,\ 0) \\
&\text{normal } (0,\ 1,\ 0),\ \text{area } 4/2 = 2
\end{aligned}
\]
</div>


---

<!-- .slide: class="demo-full" -->

## Dot &amp; cross, live

<div class="cockpit" data-demo="dot-cross" data-controls="ax,ay,bx,by"><pre class="viz-fallback">  model {ax,ay,az, bx,by,bz} -> arrows + value panel, two views
  -- default state: a=(2,1,0), b=(1,2,1) ------------------
     a . b = 2*1 + 1*2 + 0*1        = 4
     |a|   = sqrt(5) ~= 2.24    |b| = sqrt(6) ~= 2.45
     theta = acos(4/sqrt(30))       ~= 43.1 deg
     a x b = (1*1-0*2, 0*1-2*1, 2*2-1*1) = (1, -2, 3)</pre></div>


---

## A plane is a point and a normal

<img src="../../textbook/figures/vec-plane-distance.svg" alt="a plane with its normal and a point's signed distance" style="height:250px">

The **normal** n is perpendicular to the plane; X is on the plane when `X − P0` is perpendicular to n:

<div class="tex" style="font-size:0.75em" role="img" aria-label="n · (X − P0) = 0      that is      n · X = D,   D = n · P0
from three points A, B, C:   n = (B − A) × (C − A),   D = n · A
A = (0, 2, 0), B = (1, 2, 0), C = (0, 6, −3):   n = (1, 0, 0) × (0, 4, −3) = (0, 3, 4),   D = 6">
\[
\begin{gathered}
n \cdot (X - P_0) = 0 \quad \text{that is} \quad n \cdot X = D,\ \ D = n \cdot P_0 \\
\text{from three points } A, B, C\text{:} \quad n = (B - A) \times (C - A),\ \ D = n \cdot A \\
A = (0,\ 2,\ 0),\ B = (1,\ 2,\ 0),\ C = (0,\ 6,\ {-3})\text{:} \\
n = (1,\ 0,\ 0) \times (0,\ 4,\ {-3}) = (0,\ 3,\ 4),\ \ D = 6
\end{gathered}
\]
</div>


---

## Distance: point to point, point to line

<div class="tex" role="img" aria-label="point to point:   |Q − P| = √((Qx − Px)² + (Qy − Py)² + (Qz − Pz)²)
                  A = (1, 0, 2), R = (4, 0, −2):   |R − A| = |(3, 0, −4)| = 5
point to line P0 + t d:   t = (P − P0) · d / (d · d)      the projection's scale
                          foot = P0 + t d                  the closest point of the line
                          distance = |P − foot|            the across part's length">
\[
\begin{gathered}
\text{point to point:} \quad \lvert Q - P \rvert = \sqrt{(Q_x - P_x)^2 + (Q_y - P_y)^2 + (Q_z - P_z)^2} \\
A = (1,\ 0,\ 2),\ R = (4,\ 0,\ {-2})\text{:} \quad \lvert R - A \rvert = \lvert (3,\ 0,\ {-4}) \rvert = 5
\end{gathered}
\]
\[
\begin{aligned}
\text{point to line } P_0 + t\,d\text{:} \quad t &= (P - P_0) \cdot d \,/\, (d \cdot d) && \text{the projection's scale} \\
\text{foot} &= P_0 + t\,d && \text{the closest point of the line} \\
\text{distance} &= \lvert P - \text{foot} \rvert && \text{the across part's length}
\end{aligned}
\]
</div>

P = **a = (2, 1, 0)**, line through the origin along **b = (1, 2, 1)**: `t = 4/6`, foot `(0.667, 1.333, 0.667)`, distance **1.528**.


---

## Distance to a segment: clamp t

Segment `P0 = (0, 0)` to `P1 = (4, 2)`, so `d = (4, 2)`, `d · d = 20`, and `t = (P − P0) · d / 20`:

| P | t | foot on the line | t in [0, 1]? | nearest point of the segment | distance |
| --- | --- | --- | --- | --- | --- |
| (1, 3) | 0.5 | (2, 1) | yes | (2, 1) | 2.236 |
| (6, 4) | 1.6 | (6.4, 3.2) | no, past P1 | the end (4, 2) | 2.828 |
| (−1, 1) | −0.1 | (−0.4, −0.2) | no, before P0 | the start (0, 0) | 1.414 |

<img src="../../textbook/figures/vec-line-foot.svg" alt="three points projected onto a segment, two clamped to its ends" style="height:170px">


---

## Distance to a plane: one dot

Plane through `P0 = (0, 2, 0)` with normal `m = (0, 3, 4)`. First make the normal **unit**:

<div class="tex" role="img" aria-label="|m| = √(0 + 9 + 16) = 5      n = (0, 0.6, 0.8)      D = n · P0 = 1.2">
\[
\lvert m \rvert = \sqrt{0 + 9 + 16} = 5 \qquad n = (0,\ 0.6,\ 0.8) \qquad D = n \cdot P_0 = 1.2
\]
</div>

Point `P = (1, 4, 3)`:

<div class="tex" style="font-size:0.75em" role="img" aria-label="signed distance   s = n · P − D = (0 + 2.4 + 2.4) − 1.2 = 3.6      positive: the side n points to
closest point     P − s n = (1, 4 − 2.16, 3 − 2.88) = (1, 1.84, 0.12)    check: n · (1, 1.84, 0.12) = 1.2 = D">
\[
\begin{aligned}
\text{signed distance} \quad s &= n \cdot P - D = (0 + 2.4 + 2.4) - 1.2 = 3.6 \\
&\text{positive: the side } n \text{ points to} \\
\text{closest point} \quad P - s\,n &= (1,\ 4 - 2.16,\ 3 - 2.88) = (1,\ 1.84,\ 0.12) \\
&\text{check: } n \cdot (1,\ 1.84,\ 0.12) = 1.2 = D
\end{aligned}
\]
</div>

`s > 0` in front, `s = 0` on the plane, `s < 0` behind: (1, 0, 0) gives −1.2. In code: HW2, EX2 and EX3.


---

## Closest point and distance: code, both tracks

<div class="code-tabs">

```csharp
// The point of the line through a with direction d nearest to p
static Vector3 ClosestPointOnLine(Vector3 p, Vector3 a, Vector3 d)
{
    float t = Vector3.Dot(p - a, d) / Vector3.Dot(d, d);   // how many d's along
    return a + t * d;
}

// The point of the segment from a to b nearest to p
static Vector3 ClosestPointOnSegment(Vector3 p, Vector3 a, Vector3 b)
{
    Vector3 d = b - a;
    float dd = Vector3.Dot(d, d);
    if (dd == 0f) return a;                                // a == b: one point
    float t = Mathf.Clamp01(Vector3.Dot(p - a, d) / dd);   // stay between the ends
    return a + t * d;
}

float distance = Vector3.Distance(p, ClosestPointOnSegment(p, a, b));
```

```javascript
// The point of the line through a with direction d nearest to p
function closestPointOnLine(p, a, d) {
  const t = new THREE.Vector3().subVectors(p, a).dot(d) / d.dot(d);   // how many d's along
  return a.clone().addScaledVector(d, t);                             // clone: a stays put
}

// The point of the segment from a to b nearest to p
function closestPointOnSegment(p, a, b) {
  const d = new THREE.Vector3().subVectors(b, a);
  const dd = d.dot(d);
  if (dd === 0) return a.clone();                                     // a == b: one point
  const t = THREE.MathUtils.clamp(new THREE.Vector3().subVectors(p, a).dot(d) / dd, 0, 1);
  return a.clone().addScaledVector(d, t);
}

const distance = p.distanceTo(closestPointOnSegment(p, a, b));
```

</div>

<small>a = (0, 0, 0), b = (4, 2, 0), p = (6, 4, 0): line foot (6.4, 3.2, 0), segment point (4, 2, 0), distance 2.828.</small>


---

## Vector3 in Unity and three.js

| the math | Unity (C#) | three.js | watch for |
| --- | --- | --- | --- |
| a · b | `Vector3.Dot(a, b)` | `a.dot(b)` | |
| a × b | `Vector3.Cross(a, b)` | `a.cross(b)` | three.js **overwrites a**: use `crossVectors` |
| \|a\| | `a.magnitude` | `a.length()` | |
| â | `a.normalized` | `a.normalize()` | three.js **overwrites a**: `clone()` first |
| \|Q − P\| | `Vector3.Distance(P, Q)` | `P.distanceTo(Q)` | |
| θ | `Vector3.Angle(a, b)` | `a.angleTo(b)` | Unity **degrees**, three.js **radians** |

```js
const a = new THREE.Vector3(2, 1, 0), b = new THREE.Vector3(1, 2, 1);
const n = a.cross(b);   // n IS a, and a is now (1, -2, 3)
a.dot(b);               // 0, not 4
```


---

## Two cheat sheets

[**Linear algebra cheat sheet**](../../reference/linear-algebra-cheat-sheet.html)

- vectors, length, normalize; dot and cross, with the tests
- projection; lines, rays, segments, planes; every distance and closest point
- triangles and polygons: normal, area, barycentric weights
- rotation and quaternion formulas; Unity and three.js names for each

[**Trigonometry cheat sheet**](../../reference/trig-cheat-sheet.html)

- the unit circle, exact values, degrees and radians
- the identities: Pythagorean, sum and difference, double and half angle
- the laws of sines and cosines; atan2; the graphics uses

