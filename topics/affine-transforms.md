<!--
  CSS 551 · TOPIC DECK: Affine transformations over homogeneous coordinates (~95 min).
  A topic is a reusable stretch of slides that a session page mounts as one
  <section data-markdown="../../topics/affine-transforms.md"> among others; it carries no
  session logistics (no title, Thursday, MP, wrap) and no "Part N" numbering.
  Sessions compose topics in their index.html; see sessions/README.md.

  TEACHES: the affine map x -> A x + t as the family every placement transform belongs to; what it preserves (lines, parallels, ratios) and what it does not; the determinant as volume and handedness; points versus displacements; homogeneous coordinates as the lift that makes affine maps linear (the 4x4 block [A t; 0 1], w = 1 points, w = 0 vectors); composition as the block product and why order matters (T.R vs R.T worked to the demo's numbers, live); the block inverse and the rigid case; a matrix as an affine frame (columns + origin), object versus world space; TRS as the special case engines store (and the shear it cannot); normals by the inverse transpose; pivots as conjugation with translation (I - R)p; where affine ends (the last row, projective maps, the perspective matrix of the viewing lecture).
  NEEDS:   the vectors topic (dot, cross, projection) and the rotation topic (R_y, columns are where the axes land).
  DEMOS:   data-demo="trs-order" data-controls="tx,ry" (under the session page's 200px crop). Fallback hand-verified (lib/core/xform.js): tx = 1.5, ry = 60: T.R column 3 = (1.50, 0, 0); R.T column 3 = (0.75, 0, -1.30).
  SOURCE:  reframed 2026-09-18 (Plan B) from the former sessions/S04-matrices-spaces/L04-matrices-spaces.md (35 slides), whose worked numbers (T.R/R.T, the rigid inverse, the pivot at (2,0,0)) are kept digit for digit; Sung's Topic4 CDP code slides are reduced to two, the rest being the matrix studio's job. Real C# / shader excerpts are from Kelvin Sung's CSS 451 ClassExamples.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores (`R_y`, `T·R`, `-R^T t`). No <small> on
  math. Paths are relative to the SESSION page that mounts this topic.
-->

### Affine transformations over homogeneous coordinates

<small>(~95 min)</small>

Note: Every placement transform of the pipeline, translate, rotate, scale, shear, and every product of them, is one kind of map: affine, a linear part plus a translation. Name the family first, learn what it preserves, then lift it into homogeneous coordinates so that the whole family becomes one 4x4 matrix multiplied like any other. Composition, inverses, frames, pivots and the normal's inverse-transpose all fall out of two block formulas. The one matrix in the pipeline that is not affine, the perspective projection, is where this topic ends and the viewing lecture begins.

---

### Affine maps

<small>(~25 min)</small>

---

## The question: placing a model

A mesh is authored once, in its own coordinates. To put it in the world you **translate** it, **rotate** it, **scale** it, sometimes **shear** it, and you do these in **some order**, then undo them for picking and cameras.

- what **family of maps** is that, and what does every member of it do to shapes?
- is there **one representation** that composes, inverts, and stores all of them the same way?

The answers: **affine maps**, and **homogeneous coordinates**.

Note: Pose the problem before the machinery. The operations every scene needs are few, translate, rotate, scale, shear, but they are combined in every order and undone constantly, for hit tests, for cameras, for hierarchies. The mathematician's question is what family they form; the engineer's is what single data type holds them all. Tonight answers both with one object.

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

Note: The definition, and the table that says the family is closed: rotations, scales and shears are linear (t = 0), translation is the identity plus a shift, and any composition of these is again some A and some t, which the composition slide proves. The vocabulary to insist on: linear means the origin stays put; affine means a linear map followed by a shift. Everything before the projection matrix is affine.

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

Note: The theorem to remember: affine maps are exactly the maps that send lines to lines and preserve ratios along them. The shear is the honest example, because it breaks angles and lengths (the square leans into a parallelogram) while keeping every line straight and every midpoint a midpoint. Rotations and reflections are the orthogonal special case that also keep lengths and angles. This is why a triangle mesh survives any affine map as a triangle mesh: straight edges stay straight, and a vertex halfway along an edge stays halfway.

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

Note: Two facts about the determinant that graphics uses constantly. First, it is the volume scale factor, so a rotation has determinant one and a scale by two along one axis has determinant two. Second, its sign is handedness: a mirror has determinant minus one, and after a mirror every counter-clockwise triangle winds clockwise, which is why an imported model with one negative scale factor renders inside out. Determinant zero means a dimension was collapsed, and that is precisely the transform you cannot invert.

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

Note: The distinction the whole topic keeps returning to, proved in one line: subtract two mapped points and the translation cancels, so displacements transform by A alone. A position is a place and moves with the world; a direction, a surface normal, a velocity, the arrow from one object to another, has no place and must not move when the world is shifted. The homogeneous w in the next stretch is the bookkeeping that makes the matrix do this automatically.

---

## Composing two affine maps

Do `f(x) = A x + t`, then `g(x) = B x + s`:

```text
   g(f(x)) = B (A x + t) + s = (B A) x + (B t + s)
```

- the linear parts **multiply** (`B A`, `f` first): a product of matrices
- the translations do **not** simply add: `t` gets pushed through `B` first (`B t`), then `s` is added
- so **order matters**, and it matters through the translation term

Note: The composition rule, and the reason order matters lives in the middle term: the first map's translation t is transformed by the second map's linear part B before the second translation is added. Rotate then translate keeps the translation as is; translate then rotate swings the translation around. Keep this formula in view: the 4x4 block product on the next stretch is exactly this rule written as a matrix.

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

Note: The homogeneous lift. Adding a constant one to the point and a block row to the matrix turns "A x + t" into a single matrix-vector product; check by multiplying the block form. Now translation, rotation, scale and shear are all one type of object, which is the whole engineering reason for four-by-four matrices: one multiply, one inverse, one upload. The bottom row of zeros and a one is the signature of an affine matrix; keep an eye on it, because the projection matrix later changes it.

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

Note: The w convention is not decoration; it is the previous stretch's "displacements feel only A" made automatic. With w = 0 the fourth column is multiplied by zero, so the same matrix moves points and leaves directions alone, decided entirely by the input. The type arithmetic is a pleasant check: subtracting two points gives w = 0, so it is a vector, as it should be; a point plus a vector has w = 1, a point. Normals will need one more refinement, later tonight.

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

Note: The composition rule as a block multiply, which is the single most useful identity of the night: the product's linear part is the product of linear parts, and its translation column is the first translation transformed by the second linear part plus the second translation. On column vectors the matrix nearest the point applies first, so B·A means A first, and you read right to left, the same convention as quaternion products and the library. The next slide puts numbers in.

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

Note: The demo's default numbers, derived from the block formula rather than by multiplying sixteen entries. T·R: the second map is the translation, whose linear part is the identity, so the first map's (zero) translation passes through and the column is t itself. R·T: the second map is the rotation, so the translation column is R applied to t, which rotates (1.5, 0, 0) by sixty degrees about y into (0.75, 0, −1.299), printed as −1.30 by the panel. Two products, one linear part, two different translation columns; the whole lesson in one column. Verified against makeTRS and matMul in the library.

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

Note: The live demo (trs-order, embed controls tx and ry, rotate mode). The sliders write the model, and both cubes and all four matrix panels re-render from the library's makeTRS and matMul; the model drives the matrix, never the reverse. The fallback is hand-verified and matches the worked slide digit for digit; the panel prints two decimals, so 0.866 shows as 0.87 and −1.299 as −1.30. Drag tx and ry and watch the two cubes diverge: the left rotates about its own center then slides to tx; the right slides to tx then swings about the origin on a lever arm. The full T·S versus S·T toggle is on the hub.

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

Note: The second block identity. Solving the affine equation for x gives the inverse's linear part as A inverse and its translation as minus A inverse t; for a rigid transform A is a rotation and its inverse is its transpose, so the whole inverse costs a transpose and one three-vector product, the closed form every engine hand-codes for cameras. The reversal rule for products is the socks-then-shoes rule. Uses: bringing a world point into an object's own frame for a hit test, and the view matrix of the viewing lecture, which is the camera's inverse.

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

Note: The rigid inverse on real numbers, unchanged from the library check. The rotation's transpose is its inverse, and the translation column is minus that transpose applied to t: the rows of R transposed are the columns of R, so R transpose t picks out the z component two, giving (0, 0, 2), negated. Students should see that the inverse cost was a transpose and a three-vector product, no Gaussian elimination; the library's invertTRS generalizes it to include scale by first dividing each column by its length.

---

### Frames and spaces

<small>(~20 min)</small>

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

Note: The column reading from the rotation topic, completed: the fourth basis element is the origin, and its image is column 3. So an affine matrix is literally a coordinate frame, three axes plus an origin, written down. Given a matrix in a debugger, the translation is column 3 verbatim, the object's world-space axes are the other columns, and their lengths are the scale factors. This is the practical skill of the topic, and the reason the matrix panel of every demo shows columns.

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

Note: Coordinate spaces are the conceptual core the rest of the pipeline is built on. A mesh is authored once in object space; the model matrix places that same mesh anywhere without touching the vertices; the inverse brings a world point back into the object's frame for tests like "is this point inside me". Scene graphs chain these matrices up a parent tree, and the camera adds one more frame through the view matrix, which is the camera's inverse. In Unity, localPosition lives in the parent's frame and position is the fully composed world value; the difference is exactly the parent chain.

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

Note: Where the general affine map and the engine's data structure part ways. An affine map has twelve degrees of freedom; a Transform stores nine, position, a rotation quaternion, and three axis-aligned scale factors, which is the product T·R·S. The three missing numbers are shear. This is not academic: a child rotated forty-five degrees under a parent scaled non-uniformly is sheared in world space, and Unity's Transform cannot hold that matrix, which is why lossyScale exists and why such hierarchies render oddly. Reading TRS back from a matrix, lengths of columns for the scales and normalized columns for the rotation, is what the library's invertTRS does first.

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

Note: The one refinement the w = 0 rule needs. A tangent direction is a difference of points and transforms by A; a normal is defined by being perpendicular to tangents, and perpendicularity is not preserved by a non-uniform scale, as the worked numbers show: the transformed normal is no longer perpendicular to the transformed surface. The fix is the inverse transpose, which keeps every dot product with tangents at zero; for rotations it equals A, which is why the bug hides until the first squashed model. The illumination lecture's shaders do exactly this.

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

Note: The most reused composition idiom in graphics, and a clean application of the block product: the linear part is the rotation and the translation column comes out as p minus R p. Everything off-center, joints, doorknobs, scaling about a corner, is this conjugation. The fixed point is the tell that it is right: p goes to the origin, stays there under R, comes back to p.

---

## Worked: pivot (2, 0, 0), rotate 90° about y

`R = R_y(90)`, `p = (2, 0, 0)`. `R p = 2 · column 0 = (0, 0, −2)`, so `(I − R) p = (2, 0, 0) − (0, 0, −2) = (2, 0, 2)`:

```text
      [ 0   0   1   2 ]      pivot   (2,0,0) → (2, 0,  0)    FIXED
  M = [ 0   1   0   0 ]      (3,0,0) → (2, 0, −1)    +x of the pivot swings to −z
      [ −1  0   0   2 ]      (2,0,1) → (3, 0,  0)    +z of the pivot swings to +x
      [ 0   0   0   1 ]
```

Note: The numbers from the library check, now derived from the block formula in one line: the translation column is p minus R p, and R p is twice the first column of the rotation. Check the fixed point by direct multiplication, then two neighbors: one unit in +x of the pivot swings a quarter turn to −z, one unit in +z swings to +x, a right-handed turn about the vertical through the pivot. This is what Sung's PivotedScaleRotate computes, next.

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

<small>XformLoader.cs, 4.7.PivotedScaleRotate and 4.4.CPU-TRS. Both upload the matrix to the shader as `MyXformMat`; the matrix studio pokes at these and at TSvsST and InverseTransform.</small>

Note: Two real excerpts, unedited. The first is the pivot conjugation line for line, with the full TRS in the middle so the object scales and rotates about the pivot instead of its own origin. The second is the block layout in Unity's column-major sixteen-float array: the translation in entries 12 to 14 is column 3, the scale on the diagonal at 0, 5 and 10. Seeing the raw indices demystifies the matrix: sixteen floats with known slots, the slots the frame slide named. The other Topic4 projects, TSvsST and InverseTransform, are the studio's, where order and the inverse chain are toggled live.

---

## Where affine ends: the last row

The bottom row `(0, 0, 0, 1)` is what keeps `w = 1`. Change it and the map is no longer affine:

```text
   general 4×4:  (x, y, z, w) with w ≠ 1  →  the point is  (x/w, y/w, z/w)      (homogeneous ≡ up to scale)
   perspective:  bottom row (0, 0, −1, 0)  →  w = −z_view:  divide by depth, far things shrink
```

- a matrix whose last row is not `(0,0,0,1)` is **projective**: lines still go to lines, but parallels can meet and ratios are not kept
- `w = 0` is a **point at infinity**, which is exactly what a direction is: the vectors of tonight were points at infinity all along
- the perspective matrix of the viewing lecture is the **one non-affine matrix** in the pipeline; the divide by `w` is its signature

Note: Close the topic by naming the boundary. Homogeneous coordinates are defined up to scale, so a general four-by-four with a non-trivial last row produces w not equal to one and the point is recovered by dividing. Affine maps are the special case that never changes w. The perspective projection deliberately writes minus z into w, so that dividing by w divides by depth and distant things shrink; parallel lines meet at a vanishing point, which no affine map does. And the w = 0 vectors of tonight are, in this language, points at infinity: a direction is where parallel lines meet. That is the viewing lecture's opening.

---

## The pipeline, stage by stage

Sung's `451Shader` applies the chain explicitly, one coordinate space at a time:

```glsl [1-3]
float4x4 MyXformMat;                        // our model matrix, uploaded from C# (affine)
o.vertex = mul(MyXformMat, v.vertex);       // object → world      (affine)
o.vertex = mul(UNITY_MATRIX_VP, o.vertex);  // world → view → clip (view: affine; projection: not)
```

`UnityObjectToClipPos(v)` folds all of it into one `MVP` multiply. Split, it is a chain of frame changes: **model → world → view → projection**, every arrow a `4×4`, all affine but the last.

Note: The bridge to the viewing lecture. The engine's one-liner hides three matrices; Sung's shader unfolds it so each coordinate-space change is visible. Model and view are affine frame changes of tonight's kind, the view matrix being the camera's rigid inverse; the projection is the projective map of the previous slide, with the divide by w done by the hardware after the vertex shader. Tonight you own M; the viewing lecture builds V and P.

---

## Affine, one machine

- an **affine map** is `A x + t`: lines to lines, parallels to parallels, ratios kept; `det A` is volume and handedness
- **homogeneous coordinates** make it one `4×4` `[A t; 0 1]`: `w = 1` points move, `w = 0` vectors do not
- **compose** by the block product `[BA, Bt + s]`, right to left: order matters through the translation
- **invert** by `[A⁻¹, −A⁻¹t]`; rigid: `R^T` and `−R^T t`
- a matrix **is a frame** (columns + origin); `TRS` is the 9-number case engines store; normals take `A⁻ᵀ`; pivots are `(I − R) p`
- the last row `(0,0,0,1)` is the boundary: the perspective matrix crosses it

Note: The synthesis slide. One family of maps, one lift that makes it linear, two block identities (product and inverse) from which composition order, the rigid inverse, frames, pivots and the normal rule all follow, one data structure (TRS) that stores most but not all of it, and one boundary where the projection matrix leaves the family. The through-line from the rotation topic: the rotation matrix is now the linear part of an affine map. The through-line forward: scene graphs chain these matrices, and the view and projection matrices are two more factors on the same product.
