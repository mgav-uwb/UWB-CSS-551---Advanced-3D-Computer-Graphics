<!--
  CSS 551 · TOPIC DECK: Affine transformations over homogeneous coordinates (~88 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/affine-transforms.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES: the affine map x -> A x + t as the family every placement transform belongs to; what it preserves (lines, parallels, ratios) and what it does not; the determinant as volume and handedness; points versus displacements; homogeneous coordinates as the lift that makes affine maps linear (the 4x4 block [A t; 0 1], w = 1 points, w = 0 vectors); composition as the block product and why order matters (T.R vs R.T worked to the demo's numbers, live); the block inverse and the rigid case; a matrix as an affine frame (columns + origin), object versus world space; TRS as the special case engines store (and the shear it cannot); normals by the inverse transpose; pivots as conjugation with translation (I - R)p; where affine ends (the last row, projective maps, the perspective matrix of the viewing lecture).
  NEEDS:   the vectors topic (dot, cross, projection) and the rotation topic (R_y, columns are where the axes land).
  DEMOS:   data-demo="trs-order" data-controls="tx,ry" (under the lecture page's 200px crop). Fallback hand-verified (lib/core/xform.js): tx = 1.5, ry = 60: T.R column 3 = (1.50, 0, 0); R.T column 3 = (0.75, 0, -1.30).
  SOURCE:  reframed 2026-09-18 (Plan B) from the former sessions/S04-matrices-spaces/L04-matrices-spaces.md (35 slides), whose worked numbers (T.R/R.T, the rigid inverse, the pivot at (2,0,0)) are kept digit for digit; Sung's Topic4 CDP code slides are reduced to two. Trimmed 2026-09-29 (Plan C, a 90-minute Tuesday lecture): the separate two-map composition slide was folded into the block-product slide. Real C# / shader excerpts are from Kelvin Sung's CSS 451 ClassExamples.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores (`R_y`, `T·R`, `-R^T t`). No <small> on
  math. Paths are relative to the lecture page that mounts this topic.
-->

### Affine transformations over homogeneous coordinates

<small>(~88 min)</small>


---

### Affine maps

<small>(~22 min)</small>

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
- `w = 0` is a **point at infinity**, which is exactly what a direction is: the vectors of tonight were points at infinity all along
- the perspective matrix of the viewing lecture is the **one non-affine matrix** in the pipeline; the divide by `w` is its signature


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

## Affine, one machine

- an **affine map** is `A x + t`: lines to lines, parallels to parallels, ratios kept; `det A` is volume and handedness
- **homogeneous coordinates** make it one `4×4` `[A t; 0 1]`: `w = 1` points move, `w = 0` vectors do not
- **compose** by the block product `[BA, Bt + s]`, right to left: order matters through the translation
- **invert** by `[A⁻¹, −A⁻¹t]`; rigid: `R^T` and `−R^T t`
- a matrix **is a frame** (columns + origin); `TRS` is the 9-number case engines store; normals take `A⁻ᵀ`; pivots are `(I − R) p`
- the last row `(0,0,0,1)` is the boundary: the perspective matrix crosses it

