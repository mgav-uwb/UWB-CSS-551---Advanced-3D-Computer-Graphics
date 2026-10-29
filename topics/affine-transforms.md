<!--
  CSS 551 · TOPIC DECK: Affine transformations over homogeneous coordinates (~50 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/affine-transforms.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES: homogeneous coordinates first: a point as a ray through the origin ((x, y) -> (x, y, 1), (x, y, w) is (x/w, y/w)), and why graphics uses them (one matrix for every placement, perspective by the divide, w = 0 as a direction and a point at infinity, one 4-vector data type; the hardware history stated accurately); translation as a shear one dimension up; points move, directions do not (w in both APIs); a light at infinity (point versus directional, L.xyz − L.w · p); the affine map x -> A x + t and what it preserves; the determinant as area and handedness; composition as the block product and why order matters (T·R vs R·T in 2D, then the 3D demo); the block inverse and the rigid case as subtract-then-dot; a matrix as a frame (columns + origin, read backward), object versus world space, column-major storage, TRS and the shear it cannot store, TRS in both tracks; normals by the inverse transpose (the ellipse); the pivot sandwich step by step and in both tracks; where affine ends (the last row) and the pipeline; one throw as one chain (football demo). Every core picture is 2D.
  SUPPLEMENT: affine-transforms-supplement.md (~38 min), mounted after the lecture's wrap and covered time permitting: the ladder of families, affine combinations, the 3x3 determinant worked, two mirrors, the winding pitfall; T·R and R·T worked to the demo's numbers, T·S and S·T, the 3D rigid inverse, undoing the demo's T·R, inverting a non-TRS matrix, the condition number and huge scales; a row-vector matrix pasted as columns, TRS read back and undone, the polar decomposition, detecting a mirror and a shear; the inverse transpose derived and in both tracks' shaders, planes and the ground plane; the 3D pivot, scaling about a corner, conjugation; a projective map in 2D and its vanishing point.
  NEEDS:   the vectors-review topic (dot, cross, projection) and the rotation topic (R_y, columns are where the axes land).
  DEMOS:   data-demo="trs-order" data-controls="tx,ry" (under the lecture page's 200px crop). Fallback hand-verified (lib/core/xform.js): tx = 1.5, ry = 60: T.R column 3 = (1.50, 0, 0); R.T column 3 = (0.75, 0, -1.30).
           data-demo="football" data-controls="step:1" (a full slide). Fallback numbers from lib/tests/football.test.mjs (default throw).
  SOURCE:  reframed 2026-09-18 (Plan B) from the former sessions/S04-matrices-spaces/L04-matrices-spaces.md (35 slides), whose worked numbers (T.R/R.T, the rigid inverse, the pivot at (2,0,0)) are kept digit for digit; Sung's Topic4 CDP code slides are reduced to two. Trimmed 2026-09-29 (Plan C, a 90-minute Tuesday lecture): the separate two-map composition slide was folded into the block-product slide. Real C# / shader excerpts are from Kelvin Sung's CSS 451 ClassExamples.
  DENSIFIED 2026-09-29 (Plan C; 60+ slides per two hours): the family ladder, figures for shear, points and vectors, blocks, order, normals, frame, polar, storage, pivot, projective; affine combinations; a determinant and area; winding and two mirrors; Möbius and Roberts; T·S vs S·T; predict-then-run; w in both APIs; the demo inverse; the oblique-scale and conditioning pitfalls; planes by the inverse transpose; a 2D frame both ways; storage conventions; TRS read-back and apply-and-undo; polar decomposition; costs; scale about a corner; the pivot in three.js; a projective map worked; TRS in both tracks; a check-yourself slide. Numbers from numbers-foundations.json (aff, rot) or node.

  RESEQUENCED 2026-10-05 (L05, a quiz day, 60 to 70 slides with the lecture shell): moved to the chapter only: the
  shear, points-and-vectors, order, storage, normals and projective figure slides, the history of homogeneous
  coordinates (Section 2), the cost of an affine product (Section 10), the polar decomposition stepped (Section 6;
  the one-slide summary stays) and the recap slide.
  EXPANDED 2026-10-05 (80-slide target): checks on the block inverse, reading a frame and a stretched normal; the condition number; a row-vector matrix pasted as columns; the polar decomposition stepped (stretch, then rotation); mirror and shear detection in both tracks; why the inverse transpose; the normal matrix in both tracks' shaders; the ground plane moved; conjugation F X F^-1; where the parallels meet. Numbers from node against lib/core/xform.js; textbook Sections 2.1, 4.1, 6.1, 7, 8 and Exercises 2, 3, 4, 6, 10.

  EDITED 2026-10-08: cut the three multiple-choice Check slides (invert by blocks, read a frame, a
  stretched surface's normal), the check-yourself slide, and the arithmetic predict slide (its column-3
  prompt is in the demo's note); "Why the inverse transpose" renamed; the mirror-and-shear, normal-matrix
  and TRS listings in Unity/WebGL code tabs; the three.js pivot slide and Sung's pivot excerpt merged
  into one tabbed slide (the by-hand storage block dropped; the column-major slide covers it).

  EDITED 2026-10-14 (~70 to ~76 min): a closing section, One throw, the whole chain: the spiral pass as
  P·V·F·H·T·A·W·S (a table of the eight links) and the football demo, which builds the chain one link at a
  time, lets the observer ride any frame, and shows Euler angles against the stored quaternion (L04).
  EDITED 2026-10-14 (later): the demo gained a target cart that catches the ball (a change of parent), two more
  balls (one at rest, one spinning on its tip), a gravity menu (Seattle, Denver, the Moon, a white dwarf), any
  ball as the camera's target, and a Code window with the whole program for both tracks (lib/programs/football/);
  the ball model is in lib/assets/models/football/. Default numbers now use Seattle's g = 9.808 m/s².

  EDITED 2026-10-15 (Marcel: an appendix for what can wait, a more intuitive core with 2D examples and many
  pictures, and an opening on homogeneous coordinates): a new first section (a point as a ray, why graphics
  uses w, translation as a shear, points and directions, a light at infinity), every core concept on one 2D
  figure from tools/gen-textbook-figures-affine-intuition.mjs (aff-rays, aff-lift, aff-lights, aff-det-2d,
  aff-order-2d, aff-rigid-2d, aff-pivot-2d, aff-normals-ellipse) or the fixed foundations figures (aff-shear,
  aff-frame, aff-projective); 26 slides moved to affine-transforms-supplement.md; the question slide, the
  old lift, w and points-move slides, the determinant table, the 2D-frame worked slide and the w-in-the-APIs
  table folded into the new slides; the football slide's full-page link dropped (every demo has a ↗ button).

  EDITED 2026-10-25 for L08 (Tuesday October 27; the affine lecture of October 15 was not given, and Lecture 7
  taught translate, rotate, scale, order, undo and the pivot as operators on points): trimmed to a ~32-minute
  core for a lecture that also finishes the scene graph; a new slide, Lecture 7's operators as matrices (Sung's
  (3, 8) example as 3x3 products), the inverse slide names Lecture 7's undo and the pivot slide its (6, 3) about
  (8, 3); display formulas typeset with MathJax (lib/deck-math.js), the ASCII form kept as each block's
  aria-label. Moved to affine-transforms-supplement.md: why graphics uses homogeneous coordinates, a light at
  infinity, what an affine map preserves, object and world space, TRS in both tracks' code, normals by the
  inverse transpose, the pivot in both tracks' code, the pipeline stage by stage, and One throw, the whole chain
  (the football demo). Numbers of the new slides from node (3x3 products).

  EDITED 2026-10-29 (Marcel: MathJax formulas instead of ASCII, vector illustrations, the ASCII kept as alt text):
  every inline formula on a slide typeset; the affine-map, Lecture 7 operator and block-inverse formulas
  restacked to fit the slide's width (the operator products carry their order as a label under each product).

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Display math is a raw <div class="tex"> block typeset by MathJax
  (lib/deck-math.js; TeX inside, ASCII as aria-label, no blank line inside); an inline
  formula is a code span written `$...$`, typeset in place; code identifiers stay plain
  code spans; diagrams are SVG figures with the ASCII as alt text. Never two "_" on one
  markdown line outside a code fence or code span. No <small> on math. Paths are
  relative to the lecture page that mounts this topic.
-->

### Affine transformations over homogeneous coordinates

<small>(~32 min) · reading: <a href="../../textbook/affine-transforms.html">Affine Transformations</a>, Sections 0 to 9</small>


---

### Homogeneous coordinates: one more number

<small>(~6 min)</small>

---

## Homogeneous coordinates: one more number

<img src="../../textbook/figures/aff-rays.svg" alt="points of a line lifted to (x, w): the points (1, 0.5), (2, 1), (4, 2) lie on one ray through the origin and all name x = 2; shrinking w with x fixed moves the hit on the line w = 1 out to 4 and 6; w = 0 never meets the line" style="height:255px">

- a 2D point `$(x, y)$` is written `$(x, y, 1)$`; a 3D point `$(x, y, z)$` is written `$(x, y, z, 1)$`
- any multiple names the same point: `$(x, y, w)$` is `$(x/w,\ y/w)$`, so `$(1, 0.5)$`, `$(2, 1)$`, `$(4, 2)$` all name `$x = 2$`
- `$w = 0$` never reaches the line `$w = 1$`: `$(x, y, 0)$` is a **direction**, a point at infinity


---

## Translation becomes a matrix

<img src="../../textbook/figures/aff-lift.svg" alt="the plane w = 1 above the floor w = 0 in (x, y, w) space: a flag on the plane slides by t = (2, 1), the w axis leans, and a direction on the floor does not move" style="height:340px">

<div class="tex" role="img" aria-label="[ 1  0  tx ] [ x ]   [ x + tx ]
[ 0  1  ty ] [ y ] = [ y + ty ]        in 3D, the same lift:  [A t; 0 1] · (x, 1) = (A x + t, 1)
[ 0  0  1  ] [ 1 ]   [   1    ]">
\[
\begin{bmatrix} 1 & 0 & t_x \\ 0 & 1 & t_y \\ 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} x \\ y \\ 1 \end{bmatrix} = \begin{bmatrix} x + t_x \\ y + t_y \\ 1 \end{bmatrix}
\qquad \text{in 3D, the same lift: } \begin{bmatrix} A & t \\ 0 & 1 \end{bmatrix} \begin{bmatrix} x \\ 1 \end{bmatrix} = \begin{bmatrix} A x + t \\ 1 \end{bmatrix}
\]
</div>


---

## Points move, directions do not

Subtract two moved points: `$(A p + t) - (A q + t) = A (p - q)$`. The `$t$` cancels; `$w$` does that bookkeeping:

<div class="tex" style="font-size:0.72em" role="img" aria-label="[ A  t ] [ v ]   [ A v ]       point (w = 1):      A x + t     moved
[ 0  1 ] [ 0 ] = [  0  ]       direction (w = 0):  A v         the translation column times 0
point − point: w = 1 − 1 = 0, a direction        point + direction: w = 1 + 0 = 1, a point">
\[
\begin{bmatrix} A & t \\ 0 & 1 \end{bmatrix} \begin{bmatrix} v \\ 0 \end{bmatrix} = \begin{bmatrix} A v \\ 0 \end{bmatrix}
\qquad
\begin{aligned}
&\text{point } (w = 1)\text{: } A x + t && \text{moved} \\
&\text{direction } (w = 0)\text{: } A v && \text{the translation column times } 0
\end{aligned}
\]
\[ \text{point} - \text{point: } w = 1 - 1 = 0 \text{, a direction} \qquad \text{point} + \text{direction: } w = 1 + 0 = 1 \text{, a point} \]
</div>

| | Unity | three.js |
| --- | --- | --- |
| point `$(w = 1)$` | `M.MultiplyPoint3x4(p)` | `p.applyMatrix4(M)` |
| direction `$(w = 0)$` | `M.MultiplyVector(v)` | `v.transformDirection(M)` (also normalizes) |


---

### Affine maps

<small>(~4 min)</small>

---

## An affine map: a linear part and a shift

<div class="tex" role="img" aria-label="f(x) = A x + t          A: a 3×3 matrix (the linear part),  t: a vector (the translation)">
\[ f(x) = A\,x + t \]
\[ A\text{: a } 3 \times 3 \text{ matrix (the linear part)}, \qquad t\text{: a vector (the translation)} \]
</div>

| map | A | t |
| --- | --- | --- |
| translation by `$t$` | `$I$` | `$t$` |
| rotation `$R$` about the origin | `$R$` | `$0$` |
| scale by `$(s_x, s_y, s_z)$` | `$\operatorname{diag}(s_x, s_y, s_z)$` | `$0$` |
| shear `$x' = x + k\,y$` | `$\left[\begin{smallmatrix} 1 & k & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 1 \end{smallmatrix}\right]$` | `$0$` |
| any product of these | a product of the `$A$`'s | some vector |

A **linear** map is the special case `$t = 0$`: it fixes the origin. Translation is the one thing a matrix alone cannot do; the `$+\,t$` is what makes the family **affine**.


---

## The determinant: area and handedness

<img src="../../textbook/figures/aff-det-2d.svg" alt="left: the unit square and its image under A with columns (2, 0) and (1, 1.5), a parallelogram of area 3; right: a counter-clockwise triangle and its mirror image under diag(−1, 1), now clockwise" style="height:340px">

- `$\lvert \det A \rvert$` scales **every** area (every volume in 3D) by the same factor; `$\det A = 0$` collapses a dimension, and nothing undoes it
- `$\det A \lt 0$` is a **mirror**: windings flip, so back-face culling drops the front faces; engines flip the culling mode when `$\det \lt 0$` (Unity does it for a negative scale)


---

### Composition and the inverse

<small>(~12 min)</small>

---

## Composition is the block product

Multiply two affine matrices and the composition rule appears:

<div class="tex" role="img" aria-label="[ B  s ] [ A  t ]   [ B A   B t + s ]
[ 0  1 ] [ 0  1 ] = [  0      1     ]        first A (nearest the point), then B">
\[
\begin{bmatrix} B & s \\ 0 & 1 \end{bmatrix} \begin{bmatrix} A & t \\ 0 & 1 \end{bmatrix} = \begin{bmatrix} B A & B t + s \\ 0 & 1 \end{bmatrix}
\qquad \text{first } A \text{ (nearest the point), then } B
\]
</div>

- read a product **right to left**: the matrix nearest the vector acts first, as Lecture 7's operators did
- the translation column of the product is `$B\,t + s$`: the first translation, pushed through the second linear part


---

## Lecture 7's operators, as matrices

`$T(-1, -5)$` and `$S(3, 0.5)$` moved `$V = (3, 8)$` to two different points. As `$3 \times 3$` matrices on `$(x, y, 1)$`:

<div class="tex" style="font-size:0.72em" role="img" aria-label="T(−1,−5) · S(3,0.5) = [ 3  0    −1 ]      (3, 8, 1) → (8, −1, 1)      scale first, then translate
                       [ 0  0.5  −5 ]
                       [ 0  0     1 ]
S(3,0.5) · T(−1,−5) = [ 3  0    −3   ]    (3, 8, 1) → (6, 1.5, 1)     translate first, then scale
                       [ 0  0.5  −2.5 ]
                       [ 0  0     1   ]">
\[
\begin{aligned}
\underset{\text{scale first, then translate}}{T({-1},{-5})\,S(3, 0.5)} &= \begin{bmatrix} 3 & 0 & {-1} \\ 0 & 0.5 & {-5} \\ 0 & 0 & 1 \end{bmatrix}: & (3, 8, 1) &\to (8, {-1}, 1) \\[6pt]
\underset{\text{translate first, then scale}}{S(3, 0.5)\,T({-1},{-5})} &= \begin{bmatrix} 3 & 0 & {-3} \\ 0 & 0.5 & {-2.5} \\ 0 & 0 & 1 \end{bmatrix}: & (3, 8, 1) &\to (6, 1.5, 1)
\end{aligned}
\]
</div>

- **the matrix is the operator**: the same two answers as Lecture 7, now from one product each
- same linear part, different column 3: `$t = (-1, -5)$` against `$S\,t = (-3, -2.5)$`, the block formula's `$B\,t + s$`


---

## Order matters: `$T \cdot R$` against `$R \cdot T$`

<img src="../../textbook/figures/aff-order-2d.svg" alt="a flag at the origin; T·R turns it 90 degrees in place and slides it to (2, 0); R·T slides it to (2, 0) first and then swings it about the origin to (0, 2), along a dashed quarter circle" style="height:420px">

`$T \cdot R = [\,R \mid t\,]$` and `$R \cdot T = [\,R \mid R\,t\,]$`: the same linear part, a different column 3. The factor nearest the point acts first.


---

<!-- .slide: class="demo-full demo-rail-2col" -->

## Order, live

<div class="cockpit" data-demo="trs-order" data-controls="tx,ry"><pre class="viz-fallback">  model {tx, ry} -> two cubes: left T·R, right R·T (same factors, opposite order)
  -- default: tx = 1.5, ry = 60 deg -----------------------
     left  = T·R   [ 0.50   0     0.87   1.50 ]   translation (1.50, 0, 0)
                   [ 0.00   1.00  0.00   0.00 ]
                   [-0.87   0     0.50   0.00 ]
     right = R·T   [ 0.50   0     0.87   0.75 ]   translation (0.75, 0, -1.30)
                   [ 0.00   1.00  0.00   0.00 ]
                   [-0.87   0     0.50  -1.30 ]</pre></div>


---

## The inverse, by blocks

Undo `$f(x) = A\,x + t$`: solve for `$x$`, `$x = A^{-1}(y - t) = A^{-1} y - A^{-1} t$`. In block form:

<div class="tex" style="font-size:0.72em" role="img" aria-label="[ A  t ]⁻¹   [ A⁻¹   −A⁻¹ t ]
[ 0  1 ]   = [  0       1   ]
rigid (A = R, a rotation):  R⁻¹ = R^T, so the inverse is  [ R^T  −R^T t ]:  a transpose and one matrix-vector product
for a product, reverse the order:  (B·A)⁻¹ = A⁻¹ · B⁻¹     (socks then shoes)
Lecture 7's undo: (S T)⁻¹ = T(1, 5) · S(1/3, 2) sends (6, 1.5) back to (3, 8)">
\[
\begin{bmatrix} A & t \\ 0 & 1 \end{bmatrix}^{-1} = \begin{bmatrix} A^{-1} & {-A^{-1} t} \\ 0 & 1 \end{bmatrix}
\qquad \text{rigid } (A = R)\text{: } \begin{bmatrix} R^T & {-R^T t} \\ 0 & 1 \end{bmatrix}, \text{ since } R^{-1} = R^T
\]
\[
(B\,A)^{-1} = A^{-1}\,B^{-1} \qquad (S\,T)^{-1} = T(1, 5)\,S(1/3, 2)\text{: } (6, 1.5) \to (3, 8), \text{ Lecture 7's undo}
\]
</div>

- rotations are orthonormal, so `$R^{-1} = R^T$` for free: this is why engines keep rotation as an orthonormal block or a unit quaternion
- scale inverts by reciprocals; a zero scale (`$\det = 0$`) has no inverse


---

## Undo a rigid placement: subtract, then dot

<img src="../../textbook/figures/aff-rigid-2d.svg" alt="left: a frame at t = (3, 1) turned 30 degrees and a world point p = (4, 3); right: the same point in the frame's coordinates, (1.866, 1.232), the two dot products of p − t with the frame's axes" style="height:370px">

`$M = [\,R \mid t\,]$`, so `$M^{-1} = [\,R^T \mid {-R^T t}\,]$`: a transpose and one product, no elimination. HW3's `rigidInverse` and `worldToLocal` (Part B) are this, in 3D.


---

### Frames, storage, and TRS

<small>(~6 min)</small>

---

## A matrix is a frame

<img src="../../textbook/figures/aff-frame.svg" alt="a 2D frame drawn in the world: column 0 and column 1 are the object's axes, column 3 its origin at (1.5, 1); a point at object (1/2, 1/2) lands at (1.9, 1.808)" style="height:270px">

<div class="tex" style="font-size:0.7em" role="img" aria-label="M · (1, 0, 0, 0) = column 0     where the x-axis lands
M · (0, 1, 0, 0) = column 1     where the y-axis lands
M · (0, 0, 0, 1) = column 3     where the ORIGIN lands
the column lengths are the scale factors">
\[
\begin{aligned}
M\,(1, 0, 0, 0) &= \text{column } 0 && \text{where the } x\text{-axis lands} \\
M\,(0, 1, 0, 0) &= \text{column } 1 && \text{where the } y\text{-axis lands} \\
M\,(0, 0, 0, 1) &= \text{column } 3 && \text{where the origin lands} \\
& && \text{the column lengths are the scale factors}
\end{aligned}
\]
</div>

Read backward, `$M^{-1}$` gives a world point's coordinates in the frame: world `$(3, 3)$` is frame `$(1.533, 0.982)$`.


---

## Column-major, row-major, and 16 floats

<div class="tex" style="font-size:0.68em" role="img" aria-label="memory index = 4·col + row     (column-major: OpenGL, WebGL, three.js elements, Unity Matrix4x4)
translation = elements 12, 13, 14
T·R as rows:            transposed (row-vector convention, as in older DirectX texts):
[ 0.5   0  0.866  1.5 ]  [ 0.5    0  −0.866  0 ]
[ 0     1  0      0   ]  [ 0      1   0      0 ]
[−0.866 0  0.5    0   ]  [ 0.866  0   0.5    0 ]
[ 0     0  0      1   ]  [ 1.5    0   0      1 ]      translation in the last ROW">
\[
\text{memory index} = 4 \cdot \text{col} + \text{row} \qquad \text{translation} = \text{elements } 12, 13, 14
\]
\[
T \cdot R = \begin{bmatrix} 0.5 & 0 & 0.866 & 1.5 \\ 0 & 1 & 0 & 0 \\ {-0.866} & 0 & 0.5 & 0 \\ 0 & 0 & 0 & 1 \end{bmatrix}
\qquad \text{transposed (row vectors): } \begin{bmatrix} 0.5 & 0 & {-0.866} & 0 \\ 0 & 1 & 0 & 0 \\ 0.866 & 0 & 0.5 & 0 \\ 1.5 & 0 & 0 & 1 \end{bmatrix}
\]
</div>

- **column-major** (OpenGL, WebGL, three.js `elements`, Unity `Matrix4x4`): entry (row, col) at index `$4 \cdot \text{col} + \text{row}$`, the layout of HW3's WebGL arrays
- both conventions map the point `$(1, 0, 0)$` to `$(2, 0, -0.866)$`: the numbers are transposed **and** the multiplication order is reversed: `$v \cdot M$` instead of `$M \cdot v$`


---

## TRS: the special case engines store

Any affine `$A$` can be written as a **rotation times a symmetric stretch**, `$A = R\,S$` (the polar decomposition); engines store the case where the stretch is **axis-aligned**:

<div class="tex" style="font-size:0.72em" role="img" aria-label="M = T · R · S       columns 0–2 = the rotated axes, each SCALED by its factor;  column 3 = t
read it back:  sx = |column 0|,  sy = |column 1|,  sz = |column 2|,  R = the columns normalized">
\[
M = T \cdot R \cdot S \qquad \text{columns } 0\text{–}2\text{: the rotated axes, each scaled; column } 3\text{: } t
\]
\[
\text{read it back: } s_x = |\text{col } 0|,\ s_y = |\text{col } 1|,\ s_z = |\text{col } 2|, \quad R = \text{the columns, normalized}
\]
</div>

- **12 numbers** describe an affine map (9 + 3); a `Transform` stores **9** (position 3, rotation 3, scale 3)
- the missing 3 are **shear**: `$T \cdot R \cdot S$` cannot represent a sheared object
- so a rotated child under a non-uniformly scaled parent is a shear that Unity **cannot store** as a Transform (its `lossyScale` is the honest admission)


---

### Pivots, and where affine ends

<small>(~4 min)</small>

---

## Rotate about a pivot: a sandwich

<img src="../../textbook/figures/aff-pivot-2d.svg" alt="four panels: a square with its corner at the pivot c = (2, 1); moved so the pivot is at the origin; turned 90 degrees there; moved back, with the pivot fixed and the square turned about it" style="height:300px">

<div class="tex" style="font-size:0.72em" role="img" aria-label="M = T(c) · R · T(−c)        linear part R, translation (I − R) c; here c = (2, 1): (3, −1)
Lecture 7: T(8,3) · R(90°) · T(−8,−3) = [ 0 −1 11 ; 1 0 −5 ; 0 0 1 ]: (6, 3) → (8, 1)">
\[
M = T(c)\,R\,T({-c}) \qquad \text{linear part } R, \text{ translation } (I - R)\,c; \text{ here } c = (2, 1)\text{: } (3, {-1})
\]
\[
\text{Lecture 7: } T(8, 3)\,R(90^\circ)\,T({-8}, {-3}) = \begin{bmatrix} 0 & {-1} & 11 \\ 1 & 0 & {-5} \\ 0 & 0 & 1 \end{bmatrix}\!: \quad (6, 3) \to (8, 1)
\]
</div>

Swap `$R$` for a scale to scale about a corner.


---

## Where affine ends: the last row

<img src="../../textbook/figures/aff-projective.svg" alt="left: a grid under an affine map stays a grid of parallels; right: the same grid through a 3 by 3 with last row (0, 0.5, 1) and the divide by w: the verticals converge" style="height:300px">

- an affine matrix keeps the bottom row `$(0, 0, 0, 1)$`, so `$w$` stays 1; change that row and `$w$` varies, and the point is `$(x/w,\ y/w,\ z/w)$`
- such a map is **projective**: lines stay lines, but parallels meet; the perspective matrix (bottom row `$(0, 0, -1, 0)$`, so `$w = -z$`) is the one such matrix in the pipeline

