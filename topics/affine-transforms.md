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

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores (`R_y`, `T·R`, `-R^T t`). No <small> on
  math. Paths are relative to the lecture page that mounts this topic.
-->

### Affine transformations over homogeneous coordinates

<small>(~50 min) · reading: <a href="../../textbook/affine-transforms.html">Affine Transformations</a>, Sections 0 to 9</small>


---

### Homogeneous coordinates: one more number

<small>(~9 min)</small>

---

## Homogeneous coordinates: one more number

<img src="../../textbook/figures/aff-rays.svg" alt="points of a line lifted to (x, w): the points (1, 0.5), (2, 1), (4, 2) lie on one ray through the origin and all name x = 2; shrinking w with x fixed moves the hit on the line w = 1 out to 4 and 6; w = 0 never meets the line" style="height:255px">

- a 2D point (x, y) is written (x, y, 1); a 3D point (x, y, z) is written (x, y, z, 1)
- any multiple names the same point: (x, y, w) is (x/w, y/w), so (1, 0.5), (2, 1), (4, 2) all name x = 2
- w = 0 never reaches the line w = 1: (x, y, 0) is a **direction**, a point at infinity


---

## Why graphics uses them

- **one matrix for every placement**: rotation, scale and shear are matrix products, but translation is an addition; with the extra coordinate all four become one `3×3` (2D) or `4×4` (3D) product, and a chain of placements multiplies down to one matrix
- **perspective**: a matrix can write depth into `w`; dividing `x`, `y`, `z` by `w` afterward makes distant things smaller (the viewing lecture)
- **points at infinity**: `w = 0` is a direction, which a translation cannot move; a directional light such as the sun is one
- **one data type from file to shader**: shading languages make `vec4` / `float4` and the `4×4` product built-in types; the first programmable vertex processors (DirectX 8 vertex shaders, 2000, in hardware on the GeForce 3, 2001) computed on 4-component registers; today's GPUs (graphics processing units) execute scalar instructions per thread, and a `vec4` is four of them


---

## Translation becomes a matrix

<img src="../../textbook/figures/aff-lift.svg" alt="the plane w = 1 above the floor w = 0 in (x, y, w) space: a flag on the plane slides by t = (2, 1), the w axis leans, and a direction on the floor does not move" style="height:380px">

```text
[ 1  0  tx ] [ x ]   [ x + tx ]
[ 0  1  ty ] [ y ] = [ y + ty ]        in 3D, the same lift:  [A t; 0 1] · (x, 1) = (A x + t, 1)
[ 0  0  1  ] [ 1 ]   [   1    ]
```


---

## Points move, directions do not

Subtract two moved points: `(A p + t) − (A q + t) = A (p − q)`. The `t` cancels; `w` does that bookkeeping:

```text
[ A  t ] [ v ]   [ A v ]       point (w = 1):      A x + t     moved
[ 0  1 ] [ 0 ] = [  0  ]       direction (w = 0):  A v         the translation column times 0
point − point: w = 1 − 1 = 0, a direction        point + direction: w = 1 + 0 = 1, a point
```

| | Unity | three.js |
| --- | --- | --- |
| point (w = 1) | `M.MultiplyPoint3x4(p)` | `p.applyMatrix4(M)` |
| direction (w = 0) | `M.MultiplyVector(v)` | `v.transformDirection(M)` (also normalizes) |


---

## A light at infinity

<img src="../../textbook/figures/aff-lights.svg" alt="left: a point light at (1, 4, 1) with rays spreading to the ground; right: a directional light (−1, 2, 0) with parallel rays; the same box casts a shadow ending at x = 4.333 and x = 4" style="height:330px">

- a light at (x, y, z, 1) is a **point light**; at (x, y, z, 0) it is a **directional light**, the sun: parallel rays
- one formula for both: the direction toward the light from a surface point p is L.xyz − L.w · p


---

### Affine maps

<small>(~6 min)</small>

---

## An affine map: a linear part and a shift

```text
   f(x) = A x + t          A: a 3×3 matrix (the linear part),  t: a vector (the translation)
```

| map | A | t |
| --- | --- | --- |
| translation by `t` | `I` | `t` |
| rotation `R` about the origin | `R` | `0` |
| scale by `(sx, sy, sz)` | `diag(sx, sy, sz)` | `0` |
| shear `x' = x + k·y` | `[[1, k, 0], [0, 1, 0], [0, 0, 1]]` | `0` |
| any product of these | a product of the A's | some vector |

A **linear** map is the special case `t = 0`: it fixes the origin. Translation is the one thing a matrix alone cannot do; the `+ t` is what makes the family **affine**.


---

## What an affine map preserves

An affine map keeps the **structure of lines** and nothing more:

- **lines go to lines**, and **parallel lines stay parallel**
- **ratios along a line** survive: the midpoint of a segment maps to the midpoint of the image segment
- **lengths and angles are not preserved** in general (only when `A` is orthogonal: rotations and reflections)

<img src="../../textbook/figures/aff-shear.svg" alt="the unit square and its image under the shear [[1, 0.5], [0, 1]], a parallelogram; the midpoint (0.5, 0.5) maps to (0.75, 0.5), the midpoint of the image diagonal" style="height:250px">


---

## The determinant: area and handedness

<img src="../../textbook/figures/aff-det-2d.svg" alt="left: the unit square and its image under A with columns (2, 0) and (1, 1.5), a parallelogram of area 3; right: a counter-clockwise triangle and its mirror image under diag(−1, 1), now clockwise" style="height:340px">

- `|det A|` scales **every** area (every volume in 3D) by the same factor; `det A = 0` collapses a dimension, and nothing undoes it
- `det A < 0` is a **mirror**: windings flip, so back-face culling drops the front faces; engines flip the culling mode when `det < 0` (Unity does it for a negative scale)


---

### Composition and the inverse

<small>(~12 min)</small>

---

## Composition is the block product

Multiply two affine matrices and the composition rule appears:

```text
   [ B  s ] [ A  t ]   [ B A   B t + s ]
   [ 0  1 ] [ 0  1 ] = [  0      1     ]        first A (nearest the point), then B
```

In one line: **`[B s; 0 1] · [A t; 0 1] = [B A,  B t + s; 0 1]`**.

- read a product **right to left**: the matrix nearest the vector acts first
- the translation column of the product is `B t + s`: the first translation, pushed through the second linear part
- the same right-to-left order as the quaternion product


---

## Order matters: T·R against R·T

<img src="../../textbook/figures/aff-order-2d.svg" alt="a flag at the origin; T·R turns it 90 degrees in place and slides it to (2, 0); R·T slides it to (2, 0) first and then swings it about the origin to (0, 2), along a dashed quarter circle" style="height:420px">

`T·R = [R | t]` and `R·T = [R | R t]`: the same linear part, a different column 3. The factor nearest the point acts first.


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

Undo `f(x) = A x + t`: solve for `x`, `x = A⁻¹ (y − t) = A⁻¹ y − A⁻¹ t`. In block form:

```text
   [ A  t ]⁻¹   [ A⁻¹   −A⁻¹ t ]
   [ 0  1 ]   = [  0       1   ]

   rigid (A = R, a rotation):  R⁻¹ = R^T, so the inverse is  [ R^T  −R^T t ]:  a transpose and one matrix-vector product
   for a product, reverse the order:  (B·A)⁻¹ = A⁻¹ · B⁻¹     (socks then shoes)
```

In one line: **`[A t; 0 1]⁻¹ = [A⁻¹,  −A⁻¹ t; 0 1]`**, and for a rotation `A⁻¹ = A^T`.

- rotations are orthonormal, so `R⁻¹ = R^T` for free: this is why engines keep rotation as an orthonormal block or a unit quaternion
- scale inverts by reciprocals; a zero scale (`det = 0`) has no inverse


---

## Undo a rigid placement: subtract, then dot

<img src="../../textbook/figures/aff-rigid-2d.svg" alt="left: a frame at t = (3, 1) turned 30 degrees and a world point p = (4, 3); right: the same point in the frame's coordinates, (1.866, 1.232), the two dot products of p − t with the frame's axes" style="height:370px">

`M = [R | t]`, so `M⁻¹ = [Rᵀ | −Rᵀ t]`: a transpose and one product, no elimination. HW3's `rigidInverse` and `worldToLocal` are this, in 3D.


---

### Frames, storage, and TRS

<small>(~9 min)</small>

---

## A matrix is a frame

<img src="../../textbook/figures/aff-frame.svg" alt="a 2D frame drawn in the world: column 0 and column 1 are the object's axes, column 3 its origin at (1.5, 1); a point at object (1/2, 1/2) lands at (1.9, 1.808)" style="height:330px">

```text
M · (1, 0, 0, 0) = column 0     where the x-axis lands          M · (0, 0, 0, 1) = column 3     where the ORIGIN lands
M · (0, 1, 0, 0) = column 1     where the y-axis lands          the column lengths are the scale factors
```

Read backward, `M⁻¹` gives a world point's coordinates in the frame: world `(3, 3)` is frame `(1.533, 0.982)`.


---

## Object space and world space

Every object has its **own** frame; the model matrix `M` is the bridge:

```text
   p_world  = M · p_object          place the mesh: its vertices never change
   p_object = M⁻¹ · p_world         bring a world point (a mouse ray hit) into the object's frame
```

- **object (local) space**: the frame the mesh was authored in; a cube's corners at `±0.5` forever
- **world space**: the shared scene frame everything is placed into
- Unity: `transform.localPosition` is in the **parent's** frame, `transform.position` in the **world**; `Matrix4x4.TRS(...)` builds the local `M`


---

## Column-major, row-major, and 16 floats

```text
   memory index = 4·col + row     (column-major: OpenGL, WebGL, three.js elements, Unity Matrix4x4)
   translation = elements 12, 13, 14

   T·R as rows:            transposed (row-vector convention, as in older DirectX texts):
   [ 0.5   0  0.866  1.5 ]  [ 0.5    0  −0.866  0 ]
   [ 0     1  0      0   ]  [ 0      1   0      0 ]
   [−0.866 0  0.5    0   ]  [ 0.866  0   0.5    0 ]
   [ 0     0  0      1   ]  [ 1.5    0   0      1 ]      translation in the last ROW
```

Both conventions map the point `(1, 0, 0)` to `(2, 0, −0.866)`: the numbers are transposed **and** the multiplication order is reversed (`v·M` instead of `M·v`).


---

## TRS: the special case engines store

Any affine `A` can be written as a **rotation times a symmetric stretch** (`A = R S`, polar decomposition); engines store the case where the stretch is **axis-aligned**:

```text
   M = T · R · S       columns 0–2 = the rotated axes, each SCALED by its factor;  column 3 = t
   read it back:  sx = |column 0|,  sy = |column 1|,  sz = |column 2|,  R = the columns normalized
```

- **12 numbers** describe an affine map (9 + 3); a `Transform` stores **9** (position 3, rotation 3, scale 3)
- the missing 3 are **shear**: `T·R·S` cannot represent a sheared object
- so a rotated child under a non-uniformly scaled parent is a shear that Unity **cannot store** as a Transform (its `lossyScale` is the honest admission)


---

## Real code: a matrix from TRS, in both tracks

<div class="code-tabs">

```csharp
Matrix4x4 m = Matrix4x4.TRS(new Vector3(1, 2, 3),
                            Quaternion.Euler(0, 60, 0),
                            new Vector3(2, 1, 0.5f));
Vector3 q = m.MultiplyPoint3x4(new Vector3(1, 1, 1));   // (2.433, 3, 1.518)
```

```javascript
const m = new THREE.Matrix4().compose(new THREE.Vector3(1, 2, 3),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 3, 0)),
  new THREE.Vector3(2, 1, 0.5));
const q = new THREE.Vector3(1, 1, 1).applyMatrix4(m);   // (2.433, 3, 1.518)
```

</div>

Both build `T·R·S`; `m.decompose(pos, quat, scale)` in three.js reads it back.


---

### Normals, pivots, and where affine ends

<small>(~9 min)</small>

---

## Normals need the inverse transpose

<img src="../../textbook/figures/aff-normals-ellipse.svg" alt="the unit circle with a normal and tangent at 45 degrees, and the ellipse after diag(2, 1): the normal pushed through A leans away from the true normal, the inverse-transpose normal is perpendicular to the tangent" style="height:350px">

- a tangent moves by `A`; the normal must stay perpendicular to it, and `A n` does not: use `A⁻ᵀ n`, the **inverse transpose**, then renormalize
- why: `(A⁻ᵀ n) · (A d) = nᵀ A⁻¹ A d = n · d = 0`; for a rotation `A⁻ᵀ = A`, so the bug hides until the first non-uniform scale


---

## Rotate about a pivot: a sandwich

<img src="../../textbook/figures/aff-pivot-2d.svg" alt="four panels: a square with its corner at the pivot c = (2, 1); moved so the pivot is at the origin; turned 90 degrees there; moved back, with the pivot fixed and the square turned about it" style="height:440px">

`M = T(c) · R · T(−c)`: linear part `R`, translation `(I − R) c`, here `(3, −1)`. Swap `R` for a scale to scale about a corner.


---

## Real code: the pivot sandwich

<div class="code-tabs">

```csharp
Matrix4x4 m   = Matrix4x4.TRS(transform.localPosition, transform.localRotation, transform.localScale);
Matrix4x4 ipm = Matrix4x4.Translate(-PivotPosition);   // T(-p)
Matrix4x4 pm  = Matrix4x4.Translate( PivotPosition);   // T(p)
m = pm * m * ipm;                                      // T(p) · M · T(-p), right to left
```

```javascript
const p = new THREE.Vector3(2, 0, 0);
const M = new THREE.Matrix4()
  .makeTranslation(p.x, p.y, p.z)                                   // T(p)
  .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2))         // · R
  .multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z)); // · T(−p)
// M.elements[12], [13], [14] = 2, 0, 2       (the column (I − R) p)
```

</div>

<small>The C# is XformLoader.cs, 4.7.PivotedScaleRotate; it uploads the matrix to the shader as `MyXformMat`. three.js's `multiply` appends on the right, so the chain reads as written and acts right to left.</small>


---

## Where affine ends: the last row

<img src="../../textbook/figures/aff-projective.svg" alt="left: a grid under an affine map stays a grid of parallels; right: the same grid through a 3 by 3 with last row (0, 0.5, 1) and the divide by w: the verticals converge" style="height:300px">

- an affine matrix keeps the bottom row `(0, 0, 0, 1)`, so `w` stays 1; change that row and `w` varies, and the point is `(x/w, y/w, z/w)`
- such a map is **projective**: lines stay lines, but parallels meet; the perspective matrix (bottom row `(0, 0, −1, 0)`, so `w = −z`) is the one such matrix in the pipeline


---

## The pipeline, stage by stage

Sung's `451Shader` applies the chain explicitly, one coordinate space at a time:

```glsl [1-3]
float4x4 MyXformMat;                        // our model matrix, uploaded from C# (affine)
o.vertex = mul(MyXformMat, v.vertex);       // object → world      (affine)
o.vertex = mul(UNITY_MATRIX_VP, o.vertex);  // world → view → clip (view: affine; projection: not)
```

`UnityObjectToClipPos(v)` folds all of it into one `MVP` multiply. Split, it is a chain of frame changes: **model → world → view → projection**, every arrow a `4×4`, all affine but the last.


---

### One throw, the whole chain

<small>(~6 min)</small>


---

## One throw, one chain

```text
p_clip = P · V · F · H · T(t) · A(t) · W(t) · S(t) · p_mesh       applied right to left
```

| Link | Matrix | From → to |
| --- | --- | --- |
| `S(t)` spin | `R_z(φ)`, φ = 2π · rpm / 60 · t | object → spin axis |
| `W(t)` wobble | `R_z(ψ) · R_x(β) · R_z(−ψ)` | spin axis → velocity |
| `A(t)` aim | `R_x(−θ)`, θ = `atan2(v_y, v_z)` | velocity → flight |
| `T(t)` flight | translate(0, y(t), z(t)), a parabola | flight → throw |
| `H` set-up | `T(start) · R_y(h)` | throw → field |
| `F` field | `R_y(γ) · T(−25, 0, −55)` | field → world |
| `V` view | `(F · C)⁻¹`, C the camera's placement | world → camera |
| `P` projection | perspective(fov, aspect, near, far) | camera → clip |

`S`, `W`, `A`, `T` change every frame; `H`, `F` once per throw; `M = F·H·T·A·W·S` is the model matrix.


---

<!-- .slide: class="demo-full" -->

## A spiral pass, live: ride any frame of the chain

<div class="cockpit" data-demo="football" data-controls="step:1"><pre class="viz-fallback">  clip point = P · V · F · H · T(t) · A(t) · W(t) · S(t) · mesh point     (steps 1 to 14 build it one link at a time)
  -- default throw: 22 m/s at 30 deg, from (20, 2, 25), heading 12 deg, 600 rpm, Seattle g = 9.808 m/s2 --
     climb angle  30 deg at release, 0 at the top (t = 1.12 s), -31.4 deg at the catch
     apex         6.17 m above the release (8.17 m above the field)
     the catch    t = 2.30 s, 1.3 m up, 43.9 m from the release; the cart drove 21.4 m (it would land at 2.41 s, 45.8 m)
     after it     ball = F · K(t) · D(t) · K(tc)^-1 · H·T·A·W·S(tc): a change of parent
  views: object, spin axis, velocity, flight, throw, field, world, camera, cart
  shot cameras: tripod, pan, sideline, chase, skycam, ball cam, spin cam, receiver, orbit; any of three balls</pre></div>

