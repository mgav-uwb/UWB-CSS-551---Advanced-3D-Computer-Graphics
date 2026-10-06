<!--
  CSS 551 · TOPIC DECK: Affine transformations over homogeneous coordinates (~70 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/affine-transforms.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES: the affine map x -> A x + t as the family every placement transform belongs to; what it preserves (lines, parallels, ratios) and what it does not; the determinant as volume and handedness; points versus displacements; homogeneous coordinates as the lift that makes affine maps linear (the 4x4 block [A t; 0 1], w = 1 points, w = 0 vectors); composition as the block product and why order matters (T.R vs R.T worked to the demo's numbers, live); the block inverse and the rigid case; a matrix as an affine frame (columns + origin), object versus world space; TRS as the special case engines store (and the shear it cannot); normals by the inverse transpose; pivots as conjugation with translation (I - R)p; where affine ends (the last row, projective maps, the perspective matrix of the viewing lecture).
  NEEDS:   the vectors-review topic (dot, cross, projection) and the rotation topic (R_y, columns are where the axes land).
  DEMOS:   data-demo="trs-order" data-controls="tx,ry" (under the lecture page's 200px crop). Fallback hand-verified (lib/core/xform.js): tx = 1.5, ry = 60: T.R column 3 = (1.50, 0, 0); R.T column 3 = (0.75, 0, -1.30).
  SOURCE:  reframed 2026-09-18 (Plan B) from the former sessions/S04-matrices-spaces/L04-matrices-spaces.md (35 slides), whose worked numbers (T.R/R.T, the rigid inverse, the pivot at (2,0,0)) are kept digit for digit; Sung's Topic4 CDP code slides are reduced to two. Trimmed 2026-09-29 (Plan C, a 90-minute Tuesday lecture): the separate two-map composition slide was folded into the block-product slide. Real C# / shader excerpts are from Kelvin Sung's CSS 451 ClassExamples.
  DENSIFIED 2026-09-29 (Plan C; 60+ slides per two hours): the family ladder, figures for shear, points and vectors, blocks, order, normals, frame, polar, storage, pivot, projective; affine combinations; a determinant and area; winding and two mirrors; Möbius and Roberts; T·S vs S·T; predict-then-run; w in both APIs; the demo inverse; the oblique-scale and conditioning pitfalls; planes by the inverse transpose; a 2D frame both ways; storage conventions; TRS read-back and apply-and-undo; polar decomposition; costs; scale about a corner; the pivot in three.js; a projective map worked; TRS in both tracks; a check-yourself slide. Numbers from numbers-foundations.json (aff, rot) or node.

  RESEQUENCED 2026-10-05 (L05, a quiz day, 60 to 70 slides with the lecture shell): moved to the chapter only: the
  shear, points-and-vectors, order, storage, normals and projective figure slides, the history of homogeneous
  coordinates (Section 2), the cost of an affine product (Section 10), the polar decomposition stepped (Section 6;
  the one-slide summary stays) and the recap slide.
  EXPANDED 2026-10-05 (80-slide target): checks on the block inverse, reading a frame and a stretched normal; the condition number; a row-vector matrix pasted as columns; the polar decomposition stepped (stretch, then rotation); mirror and shear detection in both tracks; why the inverse transpose; the normal matrix in both tracks' shaders; the ground plane moved; conjugation F X F^-1; where the parallels meet. Numbers from node against lib/core/xform.js; textbook Sections 2.1, 4.1, 6.1, 7, 8 and Exercises 2, 3, 4, 6, 10.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores (`R_y`, `T·R`, `-R^T t`). No <small> on
  math. Paths are relative to the lecture page that mounts this topic.
-->

### Affine transformations over homogeneous coordinates

<small>(~70 min)</small>


---

### Affine maps

<small>(~20 min)</small>

---

## The question: placing a model

A mesh is authored once, in its own coordinates. To put it in the world you **translate** it, **rotate** it, **scale** it, sometimes **shear** it, and you do these in **some order**, then undo them for picking and cameras.

- what **family of maps** is that, and what does every member of it do to shapes?
- is there **one representation** that composes, inverts, and stores all of them the same way?

The answers: **affine maps**, and **homogeneous coordinates**.


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

## A ladder of transformation families

| family | example | keeps lines | keeps parallels | keeps angles | keeps lengths |
| --- | --- | --- | --- | --- | --- |
| rigid (6 numbers) | rotate + translate | yes | yes | yes | yes |
| similarity (7) | + uniform scale | yes | yes | yes | no |
| affine (12) | + non-uniform scale, shear | yes | yes | no | no |
| projective (15) | + perspective | yes | **no** | no | no |

Each step up the ladder gives up one invariant. Placement transforms are the third rung; the camera's perspective is the fourth.


---

## What an affine map preserves

An affine map keeps the **structure of lines** and nothing more:

- **lines go to lines**, and **parallel lines stay parallel**
- **ratios along a line** survive: the midpoint of a segment maps to the midpoint of the image segment
- **lengths and angles are not preserved** in general (only when `A` is orthogonal: rotations and reflections)

```text
   shear  A = [[1, 0.5], [0, 1]]  on the unit square:   (0,0)→(0,0)  (1,0)→(1,0)  (0,1)→(0.5,1)  (1,1)→(1.5,1)
   the square becomes a parallelogram; the midpoint (0.5, 0.5) → (0.75, 0.5), still the midpoint of the image diagonal
```


---

## Affine combinations: weights that sum to one

Points cannot be added, but they can be **averaged**: `α p + β q` is a point when `α + β = 1`.

```text
   f(α p + β q) = α f(p) + β f(q)        whenever α + β = 1       (the t's add up to exactly one t)

   f(x) = A x + (1, 1),  A = [[1, 0.5], [0, 1]]
   p = (0, 0) → (1, 1)        q = (2, 0) → (3, 1)        midpoint (1, 0) → (2, 1) = ½ (1,1) + ½ (3,1)
```

- this is **why** an affine map keeps ratios: a point at weight `t` along a segment stays at weight `t`
- weights that do not sum to one mix in the origin: `p + q` depends on where the origin is, so it is not a point


---

## Worked: a determinant, and an area

```text
   A = [ 2  1  0 ]         det A = 2 · (1·3 − 0·0) − 1 · (0·3 − 0·0) + 0 = 6
       [ 0  1  0 ]
       [ 0  0  3 ]

   2D: triangle (0,0), (1,0), (0,1), area 0.5
       under diag(2, 3):   (0,0), (2,0), (0,3), area 3 = 0.5 · det = 0.5 · 6
```

Volumes (and areas) scale by `|det A|` **everywhere at once**: every triangle of the mesh grows by the same factor.


---

## Two mirrors make a rotation

```text
   mirror in x:  diag(−1, 1, 1),  det −1
   mirror in y:  diag(1, −1, 1),  det −1
   product:      diag(−1, −1, 1), det (−1)(−1) = +1      a half turn about z
```

Determinants multiply, so an **even** number of mirrors is a rotation and an **odd** number is a mirror. A model with scale `(−1, −1, 1)` is only turned; one with `(−1, 1, 1)` is mirrored and renders inside out unless the renderer flips its culling.


---

## Pitfall: a mirror flips the winding

```text
   triangle (0,0), (1,0), (0,1):     edge function  = +1   counter-clockwise, normal (0, 0, +1)
   mirror x → −x:  (0,0), (−1,0), (0,1):  edge function = −1   clockwise,  normal (0, 0, −1)
```

- back-face culling keeps counter-clockwise triangles: after the mirror the **whole mesh is culled**, or drawn inside out
- engines check `det < 0` on the model matrix and flip the culling mode (Unity does this automatically for negative scale)


---

## The determinant: volume and handedness

`det A` is the factor by which `A` scales **volume**, and its **sign** says whether handedness flipped:

```text
   det diag(2, 1, 1) =  2      twice the volume
   det R             =  1      a rotation keeps volume and handedness
   det diag(-1,1,1)  = -1      a mirror: same volume, left hand ↔ right hand
   det = 0                     a dimension collapsed: not invertible (a zero scale)
```

- a **negative determinant** turns every right-handed frame into a left-handed one: triangle windings flip, normals point inward
- the `det = 0` case is why a zero scale cannot be undone


---

## Points move, displacements do not

Apply `f` to two points and subtract:

```text
   f(p) − f(q) = (A p + t) − (A q + t) = A (p − q)
```

A **displacement** (the vector from `q` to `p`, a velocity, a normal) feels only the linear part `A`. The translation cancels. Points have a location and move with `t`; vectors have no location and ignore it.

```text
   translate by (2, 0, 0):   point (0,0,0) → (2,0,0)      moved
                             vector (1,0,0) → (1,0,0)     unchanged
```


---

### Homogeneous coordinates

<small>(~25 min)</small>

---

## The lift: one more coordinate makes affine linear

Append a `1` to every point, `(x, y, z) → (x, y, z, 1)`, and pack `A` and `t` into one `4×4`:

```text
   [ A  t ] [ x ]   [ A x + t ]
   [ 0  1 ] [ 1 ] = [    1    ]            the affine map is now ONE matrix product
```

In one line: **`[A t; 0 1] · (x, 1) = (A x + t, 1)`**.

- the top-left `3×3` is the linear part, **column 3** is the translation, the bottom row is `(0, 0, 0, 1)`
- translation became a matrix multiply, so **every** placement transform is the same data type
- this is why graphics is done in `4×4`: one code path, one upload to the GPU, one composition rule


---

## w = 1 for points, w = 0 for vectors

Feed the block matrix a vector with `w = 0`:

```text
   [ A  t ] [ v ]   [ A v ]
   [ 0  1 ] [ 0 ] = [  0  ]            the translation column is multiplied by w and vanishes
```

- a **point** `(x, y, z, 1)` gets `A x + t`: it moves
- a **vector** `(x, y, z, 0)` gets `A v`: the translation is gone, exactly as the subtraction proved
- point minus point gives `w = 1 − 1 = 0`, a vector; point plus vector gives `w = 1`, a point: the arithmetic keeps the types straight


---

## w in the APIs

| operation | Unity | three.js |
| --- | --- | --- |
| point (w = 1) | `M.MultiplyPoint3x4(p)` | `p.applyMatrix4(M)` (divides by w) |
| direction (w = 0) | `M.MultiplyVector(v)` | `v.transformDirection(M)` (**normalizes** too) |
| normal | `M.inverse.transpose.MultiplyVector(n)` | `n.applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(M))` |

Pick the call by what the vector **means**, not by its type: both libraries store positions and directions in the same `Vector3`.


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

## Worked: T·R and R·T from the block formula

`T` = translate by `t = (1.5, 0, 0)`; `R` = `R_y(60)`, `cos60 = 0.5`, `sin60 = 0.866`.

```text
   T·R :  B = I, s = t;  A = R, t' = 0     →  linear part R,  translation  I·0 + t   = (1.5, 0, 0)
   R·T :  B = R, s = 0;  A = I, t' = t     →  linear part R,  translation  R·t + 0   = (1.5·cos60, 0, −1.5·sin60) = (0.75, 0, −1.30)

   T·R = [ 0.5    0  0.866  1.5 ]      R·T = [ 0.5    0  0.866   0.75 ]
         [ 0      1  0      0   ]            [ 0      1  0       0    ]
         [ −0.866 0  0.5    0   ]            [ −0.866 0  0.5    −1.30 ]
```

Same linear part, different translation column: **rotate then translate** drops the move in as is; **translate then rotate** swings the move by `60°`. The object lands at `(1.5, 0, 0)` in one case and on an arc of radius `1.5` in the other.


---

## Worked: T·S and S·T

`T` = translate by `(1, 0, 0)`, `S` = uniform scale by 2:

```text
   T·S :  linear part 2I,  translation  I·0 + (1, 0, 0) = (1, 0, 0)      scale in place, then move 1
   S·T :  linear part 2I,  translation  2·(1, 0, 0)    = (2, 0, 0)      move 1, then the move is scaled too
```

The scale **stretches the translation** when it acts second. Same lesson as `T·R` and `R·T`: column 3 carries the order.


---

## Predict before you drag

Set the demo to `tx = 2`, `ry = 90`. Before looking, write down **column 3** of each product:

```text
   T·R :  ( ?, ?, ? )
   R·T :  ( ?, ?, ? )
```

Then drag, and compare with the panels.


---

## Order, live

One **model** `{tx, ry}` builds two cubes from the same `T` and `R`, multiplied in opposite orders: **left** is `T·R` (spins in place, slides over), **right** is `R·T` (sweeps an arc). The panels print both products; compare **column 3**.

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

## Worked: invert M = T(2,0,0)·R_y(90)

`R_y(90)` sends the x-axis to `−z` (columns `(0,0,−1)`, `(0,1,0)`, `(1,0,0)`); `t = (2, 0, 0)`.

```text
      [ 0   0   1   2 ]                 [ 0   0  −1   0 ]
  M = [ 0   1   0   0 ]      M⁻¹  =     [ 0   1   0   0 ]      linear part R^T,  column 3 = −R^T t
      [ −1  0   0   0 ]                 [ 1   0   0  −2 ]
      [ 0   0   0   1 ]                 [ 0   0   0   1 ]

   R^T t = (row 0 of R^T · t, …) = (0, 0, 2)   →   −R^T t = (0, 0, −2)
```

Multiply `M · M⁻¹` and every entry lands on the identity. One transpose, one small product, no elimination.


---

## Worked: undo the demo's T·R

`M = T(1.5, 0, 0) · R_y(60)`. The inverse by the reversal rule: `M⁻¹ = R_y(60)⁻¹ · T(1.5, 0, 0)⁻¹ = R_y(−60) · T(−1.5, 0, 0)`:

```text
   linear part  R^T,  first row (0.5, 0, −0.866)
   translation  −R^T t = −R^T (1.5, 0, 0) = (−0.75, 0, −1.299)

   check: M⁻¹ · (1.5, 0, 0, 1) = (0, 0, 0, 1)      the object's origin comes home
```

The inverse of `T·R` has the shape of `R·T`: a rotation first, then a translation.


---

## Check: invert by blocks

`M = T(0, 3, 0) · R_z(90°)`; `R_z(90°)` has columns `(0, 1, 0)`, `(−1, 0, 0)`, `(0, 0, 1)`. What is **column 3 of M⁻¹**?

- **A.** `(−3, 0, 0)`
- **B.** `(0, −3, 0)`
- **C.** `(3, 0, 0)`
- **D.** `(0, 3, 0)`


---

## Pitfall: inverting as if the matrix were TRS

`M` has columns `(1.5, 0.5, 0)` and `(0.5, 1.5, 0)`: a **non-uniform scale along a diagonal**. It is affine, `det = 2`, but not `T·R·S` (its columns are not orthogonal: dot 1.5).

```text
   true inverse, column 0:           (0.75, −0.25, 0)
   invertTRS (assumes T·R·S), col 0: (0.6,   0.2,  0)
   M · invertTRS(M), row 0:          (1, 0.6, 0)        should be (1, 0, 0): error 0.6
```

A TRS inverse divides by column lengths and transposes; that is only right when the columns are **orthogonal**.


---

## The condition number: largest stretch over smallest

`κ(A)` = the largest factor `A` stretches any direction by, over the smallest. A round trip through `A` and `A⁻¹` keeps about `κ · ε` relative accuracy:

| A | stretches | κ |
| --- | --- | --- |
| a rotation | 1, 1, 1 | 1 |
| diag(2, 1, 1) | 2, 1, 1 | 2 |
| the shear `[[1, 0.5], [0, 1]]` | 1.281, 0.781 | 1.640 |
| diag(10⁶, 1, 1) | 10⁶, 1, 1 | 10⁶ |

In float32, ε = 2⁻²³ ≈ 1.2 × 10⁻⁷: at κ = 10⁶ only about one decimal digit survives.


---

## Pitfall: huge scales lose digits

Round-trip a point through `M = diag(s, 1, 1)` and its inverse in 32-bit floats:

| scale `s` | condition number | round-trip error | predicted (`κ · 2⁻²³`) |
| --- | --- | --- | --- |
| 1 | 1 | 2.4e−7 | 1.2e−7 |
| 100 | 100 | 2.3e−6 | 1.2e−5 |
| 10,000 | 10,000 | 2.7e−4 | 1.2e−3 |
| 1,000,000 | 10⁶ | 0.024 | 0.12 |
| 10,000,000 | 10⁷ | 0.34 | 1.2 |

Keep scales near 1: model in sensible units, and never "hide" an object with scale `1e−7`.


---

### Frames and spaces

<small>(~25 min)</small>

---

## A matrix is a frame

Feed the block matrix the basis vectors and the origin:

```text
   M · (1,0,0,0) = column 0      where the x-axis lands (a vector)
   M · (0,1,0,0) = column 1      where the y-axis lands
   M · (0,0,1,0) = column 2      where the z-axis lands
   M · (0,0,0,1) = column 3      where the ORIGIN lands (a point)
```

An affine matrix **is** an affine frame: three axis vectors and an origin, stacked as columns. Read any placement matrix by eye: column 3 is the position, columns 0–2 are the object's axes in the world, and their lengths are its scale.


---

## Check: read a frame

A matrix has columns `(0, 2, 0)`, `(−3, 0, 0)`, `(0, 0, 1)` and `(5, 5, 5)`. Position, scale, rotation?

- **A.** at `(5, 5, 5)`, scale `(2, 3, 1)`, `R_z(90°)`, right-handed
- **B.** at `(5, 5, 5)`, scale `(2, −3, 1)`, a mirror
- **C.** at `(0, 2, 0)`, scale `(3, 2, 1)`, `R_z(90°)`
- **D.** at `(5, 5, 5)`, scale `(2, 3, 1)`, `R_z(−90°)`


---

## Worked: a 2D frame, both directions

<img src="../../textbook/figures/aff-frame.svg" alt="a 2D frame with its two axis columns and origin drawn over the world grid, and one point read in both frames" style="height:220px">

```text
   columns c0 = (1.299, 0.75),  c1 = (−0.5, 0.866),  origin t = (1.5, 1)
   frame point q = (0.5, 0.5):   world = t + 0.5 c0 + 0.5 c1 = (1.9, 1.808)          (active: move the point)
   world point (3, 3):           frame coords = M⁻¹ (3, 3) = (1.533, 0.982)            (passive: rename the point)
```


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

## Pitfall: a row-vector matrix pasted as columns

`T(2, 0, 0)` copied from a row-vector source without transposing: the 2 lands in the **bottom row**.

```text
   [ 1  0  0  0 ]        (0, 0, 0, 1) → w = 1  → (0, 0, 0)        should be (2, 0, 0)
   [ 0  1  0  0 ]        (1, 0, 0, 1) → w = 3  → (0.333, 0, 0)    should be (3, 0, 0)
   [ 0  0  1  0 ]        (2, 0, 0, 1) → w = 5  → (0.4, 0, 0)      should be (4, 0, 0)
   [ 2  0  0  1 ]        x = −0.5     → w = 0  → a point at infinity
```

Nothing moves by 2: the object is **squashed toward the origin** by a projective divide. The tell is a bottom row other than `(0, 0, 0, 1)`.


---

## Worked: read TRS back from a matrix

```text
   M = [ 1     0   0.433  1 ]      |col 0| = √(1² + 1.732²) = 2        sx = 2
       [ 0     1   0      2 ]      |col 1| = 1                          sy = 1
       [−1.732 0   0.25   3 ]      |col 2| = √(0.433² + 0.25²) = 0.5   sz = 0.5
       [ 0     0   0      1 ]      t = (1, 2, 3)
   R = columns / lengths:  (0.5, 0, −0.866), (0, 1, 0), (0.866, 0, 0.5)   =  R_y(60)
```

`M = T(1, 2, 3) · R_y(60) · S(2, 1, 0.5)`, read off by eye.


---

## Worked: apply it, then undo it

The same `M = T(1, 2, 3) · R_y(60) · S(2, 1, 0.5)` on the point `(1, 1, 1)`:

```text
   S:  (2, 1, 0.5)      R_y(60):  (1.433, 1, −1.482)      T:  (2.433, 3, 1.518)

   M⁻¹ = S⁻¹ · R^T · T⁻¹:   linear rows (0.25, 0, −0.433), (0, 1, 0), (1.732, 0, 1)
                            translation −S⁻¹ R^T t = (1.049, −2, −4.732)
   M⁻¹ · (2.433, 3, 1.518, 1) = (1, 1, 1, 1)
```

Scale first, rotate, move; undo in reverse: move back, unrotate, unscale.


---

## Any affine map: a rotation times a stretch

<img src="../../textbook/figures/aff-polar.svg" alt="the shear's unit circle mapped to an ellipse, with the stretch directions and the rotation marked" style="height:220px">

```text
   A = [[1, 0.5], [0, 1]]  (the shear)  =  R · P,   P symmetric
   stretches 1.281 and 0.781 along directions at 52.0° and −38.0°,   then R = rotation by −14.0°
   TRS read-back of A: column lengths 1 and 1.118, columns 63.4° apart (not 90°): not a rotation
```


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

## Real code: detect a mirror and a shear

```js
import { normalize, dot, cross } from '../core/xform.js';
const col = (m, j) => [m[4 * j], m[4 * j + 1], m[4 * j + 2]];
const [c0, c1, c2] = [0, 1, 2].map((j) => col(M, j));
const det = dot(c0, cross(c1, c2));                  // < 0: mirrored, flip the culling
const [u0, u1, u2] = [c0, c1, c2].map(normalize);
const shear = Math.max(Math.abs(dot(u0, u1)), Math.abs(dot(u0, u2)), Math.abs(dot(u1, u2)));
// TRS(1,2,3, 0,60,0, 2,1,0.5): det 1, shear 0      oblique scale: det 2, shear 0.6
```

```csharp
float det = m.determinant;                           // equals the 3x3 part's for an affine m
Vector3 u0 = ((Vector3)m.GetColumn(0)).normalized, u1 = ((Vector3)m.GetColumn(1)).normalized;
bool sheared = Mathf.Abs(Vector3.Dot(u0, u1)) > 1e-4f;   // and the other two pairs
```


---

## Normals need the inverse transpose

A surface direction `d` transforms by `A d`. A **normal** must stay perpendicular to the surface, and `A n` does not:

```text
   scale A = diag(2, 1, 1);  surface along d = (1, 1, 0), normal n = (1, −1, 0)
   A d = (2, 1, 0)        A n = (2, −1, 0)        (A d)·(A n) = 4 − 1 = 3 ≠ 0     WRONG
   A⁻ᵀ n = diag(½, 1, 1) n = (0.5, −1, 0)         (A d)·(A⁻ᵀ n) = 1 − 1 = 0    right
```

- normals transform by `(A⁻¹)^T`, the **inverse transpose** of the linear part (then renormalize)
- for a rotation `A⁻ᵀ = A`, so nobody notices until the first non-uniform scale


---

## Why the inverse transpose

A normal `n` is defined by `n · d = 0` for every tangent `d`. Find `N` so that `(N n) · (A d) = 0` too:

```text
   (N n) · (A d)  =  (N n)ᵀ (A d)  =  nᵀ Nᵀ A d

   choose Nᵀ A = I,  i.e.  N = (A⁻¹)ᵀ = A⁻ᵀ:      nᵀ Nᵀ A d  =  nᵀ d  =  n · d  =  0
```

- any `N` that keeps every such dot at zero is a multiple of `A⁻ᵀ`, so renormalizing afterward is all that is left
- a rotation is orthogonal, `R⁻ᵀ = R`; a uniform scale `s I` gives `(1/s) I`, the same direction: **only non-uniform scale and shear** need it


---

## Check: a stretched surface's normal

A model is scaled by `A = diag(1, 1, 3)`. A face normal was `(0, 0.707, 0.707)`. The correct world normal, renormalized:

- **A.** `(0, 0.316, 0.949)`
- **B.** `(0, 0.949, 0.316)`
- **C.** `(0, 0.707, 0.707)`
- **D.** `(0, 0.707, 2.121)`


---

## Real code: the normal matrix in both tracks' shaders

```glsl
// three.js ShaderMaterial: normalMatrix is supplied per object
uniform mat3 normalMatrix;       // inverse transpose of modelViewMatrix's 3x3
attribute vec3 normal;
varying vec3 vN;
void main() {
  vN = normalize(normalMatrix * normal);     // a view-space normal
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
```

```hlsl
// Unity built-in pipeline (UnityCG.cginc)
float3 n = UnityObjectToWorldNormal(v.normal);
// = normalize(mul(v.normal, (float3x3)unity_WorldToObject)): normal times the INVERSE,
//   which as a row vector is the inverse transpose
```


---

## Planes transform by the inverse transpose too

A plane is a row `π = (n, d)` with `π · (x, 1) = 0`. Keep the equation true under `M`: `π' = π · M⁻¹`, i.e. `π'ᵀ = M⁻ᵀ πᵀ`.

```text
   π = (1/3, 2/3, 2/3, −1/3)            the unit-normal plane of the vector-geometry topic
   π' = π · M⁻¹ = (1.238, 0.667, 0.522, −4.472)
   normalized:   n' = (0.825, 0.444, 0.348),  d' = −2.981
   check: a mapped point of the plane satisfies π' · (x', 1) = 0        (0 to 4 digits)
   naive M·n gives (0.622, 0.667, −0.411): the mapped point misses the plane by 3.0
```

Clipping planes, frustum planes and mirror planes all move this way.


---

## Worked: the ground plane, moved

The plane `y = 0` is `π = (0, 1, 0, 0)`. Move it with `M = T(0, 2, 0) · diag(1, 3, 1)`:

```text
   M⁻¹: linear part diag(1, 1/3, 1),  translation −diag(1, 1/3, 1)(0, 2, 0) = (0, −2/3, 0)
   π' = π · M⁻¹ = (0, 1/3, 0, −2/3)       normalized: (0, 1, 0, −2)     the plane y = 2
   check:  M (0, 0, 0) = (0, 2, 0) and M (1, 0, 5) = (1, 2, 5) both lie on y = 2
```

The scale did nothing to a plane through the origin except be undone; the translation moved it.


---

### Pivots, and where affine ends

<small>(~20 min)</small>

---

## Rotate about a pivot: conjugate the rotation

`R` spins about the origin. To spin about a point `p`: bring `p` to the origin, rotate, send it back:

```text
   M = T(p) · R · T(−p)        read right to left: pivot to origin, rotate, pivot back
   by the block formula:  linear part R,  translation  p − R p = (I − R) p
```

`p` is the **fixed point**: `T(−p)` sends it to the origin, `R` leaves the origin, `T(p)` returns it. Swap `R` for `S` to scale about a point. The translation column `(I − R) p` is a number you would never enter by hand, which is why you build it from the sandwich.


---

## Worked: pivot (2, 0, 0), rotate 90° about y

`R = R_y(90)`, `p = (2, 0, 0)`. `R p = 2 · column 0 = (0, 0, −2)`, so `(I − R) p = (2, 0, 0) − (0, 0, −2) = (2, 0, 2)`:

```text
      [ 0   0   1   2 ]      pivot   (2,0,0) → (2, 0,  0)    FIXED
  M = [ 0   1   0   0 ]      (3,0,0) → (2, 0, −1)    +x of the pivot swings to −z
      [ −1  0   0   2 ]      (2,0,1) → (3, 0,  0)    +z of the pivot swings to +x
      [ 0   0   0   1 ]
```


---

## Worked: scale about a corner

Double a unit square about its corner `p = (1, 1, 0)`: `M = T(p) · S(2) · T(−p)`:

```text
   translation column = (I − S) p = (1 − 2)(1, 1, 0) = (−1, −1, 0)
   (1, 1, 0) → (1, 1, 0)     the corner stays put
   (2, 1, 0) → (3, 1, 0)     the far edge moves twice as far from the corner
```

<img src="../../textbook/figures/aff-pivot.svg" alt="an object rotated about an off-center pivot, with the pivot fixed" style="height:170px">


---

## Conjugation: do it in the frame where it is simple

The sandwich is `M = F · X · F⁻¹` with any frame `F`, not only a translation:

```text
   F = T(p),         X = R              rotate about the point p
   F = R_z(45°),     X = diag(2, 1, 1)  scale by 2 along the diagonal (1, 1, 0)/√2

   R_z(45°) · diag(2, 1, 1) · R_z(−45°) = [ 1.5  0.5  0 ]      M (1, 1, 0) = (2, 2, 0)   doubled
                                          [ 0.5  1.5  0 ]      M (1, −1, 0) = (1, −1, 0) unchanged
                                          [ 0    0    1 ]
```

The oblique scale of the inverse pitfall is exactly this sandwich: a symmetric matrix, no rotation, and not a TRS.


---

## The pivot sandwich in three.js

```js
const p = new THREE.Vector3(2, 0, 0);
const M = new THREE.Matrix4()
  .makeTranslation(p.x, p.y, p.z)                                   // T(p)
  .multiply(new THREE.Matrix4().makeRotationY(Math.PI / 2))         // · R
  .multiply(new THREE.Matrix4().makeTranslation(-p.x, -p.y, -p.z)); // · T(−p)
// M.elements[12], [13], [14] = 2, 0, 2       (the column (I − R) p)
```

`multiply` appends on the right, so the chain reads left to right as written and acts right to left, as in the Unity code: same matrix, same column `(2, 0, 2)`.


---

## Real code: the pivot sandwich, and a matrix by hand

```csharp [1-4]
Matrix4x4 m   = Matrix4x4.TRS(transform.localPosition, transform.localRotation, transform.localScale);
Matrix4x4 ipm = Matrix4x4.Translate(-PivotPosition);   // T(-p)
Matrix4x4 pm  = Matrix4x4.Translate( PivotPosition);   // T(p)
m = pm * m * ipm;                                      // T(p) · M · T(-p), right to left
```

```csharp [1-3]
Matrix4x4 m = Matrix4x4.identity;            // column-major, 16 floats
m[12] = p.x; m[13] = p.y; m[14] = p.z;       // column 3 = the translation
m[0]  = s.x; m[5]  = s.y; m[10] = s.z;       // the diagonal = the scale factors
```

<small>XformLoader.cs, 4.7.PivotedScaleRotate and 4.4.CPU-TRS. Both upload the matrix to the shader as `MyXformMat`; TSvsST and InverseTransform toggle order and the inverse chain the same way.</small>


---

## Where affine ends: the last row

The bottom row `(0, 0, 0, 1)` is what keeps `w = 1`. Change it and the map is no longer affine:

```text
   general 4×4:  (x, y, z, w) with w ≠ 1  →  the point is  (x/w, y/w, z/w)      (homogeneous ≡ up to scale)
   perspective:  bottom row (0, 0, −1, 0)  →  w = −z_view:  divide by depth, far things shrink
```

- a matrix whose last row is not `(0,0,0,1)` is **projective**: lines still go to lines, but parallels can meet and ratios are not kept
- `w = 0` is a **point at infinity**, which is exactly what a direction is: every `w = 0` vector is a point at infinity
- the camera's perspective matrix is the **one non-affine matrix** in the pipeline; the divide by `w` is its signature


---

## Worked: a projective map in 2D

Put a nonzero entry in the last row: `H = [[1, 0, 0], [0, 1, 0], [0, 0.5, 1]]`, so `w = 1 + 0.5 y`:

| in | w | out = (x/w, y/w) |
| --- | --- | --- |
| (0, 0) | 1 | (0, 0) |
| (1, 0) | 1 | (1, 0) |
| (0, 1) | 1.5 | (0, 0.667) |
| (1, 1) | 1.5 | (0.667, 0.667) |
| (0, 2) | 2 | (0, 1) |
| (1, 2) | 2 | (0.5, 1) |

The parallel lines `x = 0` and `x = 1` now **converge**: their images are 1, 0.667, 0.5 apart at `y` = 0, 1, 2.


---

## Worked: where the parallels meet

Same `H`, `w = 1 + 0.5 y`, along the line `x = 1`:

```text
   (1, 6)    → w = 4     → (0.25, 1.5)
   (1, 100)  → w = 51    → (0.02, 1.961)
   y → ∞     →             (1/(1 + 0.5y), y/(1 + 0.5y)) → (0, 2)
   x = 0:    (0, y)      → (0, y/(1 + 0.5y))          → (0, 2) as well
```

Every vertical line approaches **(0, 2)**: the **vanishing point**, the image of the point at infinity `(0, 1, 0)`.


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

## Real code: a matrix from TRS, in both tracks

```csharp
Matrix4x4 m = Matrix4x4.TRS(new Vector3(1, 2, 3),
                            Quaternion.Euler(0, 60, 0),
                            new Vector3(2, 1, 0.5f));
Vector3 q = m.MultiplyPoint3x4(new Vector3(1, 1, 1));   // (2.433, 3, 1.518)
```

```js
const m = new THREE.Matrix4().compose(new THREE.Vector3(1, 2, 3),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 3, 0)),
  new THREE.Vector3(2, 1, 0.5));
const q = new THREE.Vector3(1, 1, 1).applyMatrix4(m);   // (2.433, 3, 1.518)
```

Both build `T·R·S`; `m.decompose(pos, quat, scale)` in three.js reads it back.


---

## Check yourself

1. `M` has column 3 = `(4, 0, 0)` and columns 0 to 2 = `R_y(90)`. Is `M = T·R` or `R·T` for `t = (4, 0, 0)`?
2. A model matrix has `det = −2`. What happens to its triangles, and what should the renderer do?
3. `M = T(p)·R·T(−p)` with `p = (0, 0, 3)`, `R = R_y(180)`. Column 3?
4. A normal `(0, 1, 0)` under `A = diag(1, 4, 1)`: transform it.

