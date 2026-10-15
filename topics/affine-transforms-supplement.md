<!--
  CSS 551 · TOPIC DECK (supplement): Affine transformations, further (~38 min).
  Mounted after the lecture's wrap that mounts affine-transforms.md, and covered time permitting: no homework
  needs it, and every graded idea is in the lecture. Its slides are the affine topic's further worked examples
  and secondary pitfalls, in the topic's order; the textbook's Affine Transformations Appendix (conditioning,
  the polar decomposition, planes) covers the deepest of them.

  TEACHES: the ladder of transformation families; affine combinations; the 3x3 determinant expanded; two mirrors
  make a rotation; a mirror flips the winding; T·R and R·T worked to the demo's numbers; T·S and S·T; the rigid
  inverse of T(2,0,0)·R_y(90); undoing the demo's T·R; inverting a matrix that is not TRS; the condition number
  and huge scales measured in float32; a row-vector matrix pasted as columns; TRS read back and undone; the
  polar decomposition; detecting a mirror and a shear in both tracks; the inverse transpose derived; the normal
  matrix in both tracks' shaders; planes and the ground plane under a transform; the pivot at (2, 0, 0); scaling
  about a corner; conjugation F X F^-1; a projective map in 2D and where its parallels meet.
  NEEDS:   affine-transforms.md, mounted before it (the slides use its block formulas, the trs-order demo's
           numbers and its pivot code slide).
  DEMOS:   none.
  NUMBERS: textbook/figures/numbers-foundations.json (key aff) or node against lib/core/xform.js, as in the topic.
  FIGURES: ../../textbook/figures/aff-polar.svg, aff-pivot.svg.
  SOURCE:  split 2026-10-15 from affine-transforms.md (26 slides, text unchanged except two notes that named a
           textbook section or exercise that moved to the chapter's Appendix).

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Paths are relative to the
  lecture page that mounts this topic (lectures/LNN-slug/index.html).
-->

### Supplement: affine transformations, further

<small>(~38 min, time permitting) · reading: <a href="../../textbook/affine-transforms.html#appendix">Affine Transformations, Appendix</a> and the chapter's worked examples</small>


---

### Affine maps, further

<small>(~7 min)</small>

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

### Composition and the inverse, further

<small>(~12 min)</small>

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

### Frames, storage, and TRS, further

<small>(~8 min)</small>

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

## Real code: detect a mirror and a shear

<div class="code-tabs">

```csharp
float det = m.determinant;                           // equals the 3x3 part's for an affine m
Vector3 u0 = ((Vector3)m.GetColumn(0)).normalized, u1 = ((Vector3)m.GetColumn(1)).normalized;
bool sheared = Mathf.Abs(Vector3.Dot(u0, u1)) > 1e-4f;   // and the other two pairs
```

```javascript
import { normalize, dot, cross } from '../core/xform.js';
const col = (m, j) => [m[4 * j], m[4 * j + 1], m[4 * j + 2]];
const [c0, c1, c2] = [0, 1, 2].map((j) => col(M, j));
const det = dot(c0, cross(c1, c2));                  // < 0: mirrored, flip the culling
const [u0, u1, u2] = [c0, c1, c2].map(normalize);
const shear = Math.max(Math.abs(dot(u0, u1)), Math.abs(dot(u0, u2)), Math.abs(dot(u1, u2)));
// TRS(1,2,3, 0,60,0, 2,1,0.5): det 1, shear 0      oblique scale: det 2, shear 0.6
```

</div>


---

### Normals and pivots, further

<small>(~8 min)</small>

---

## The inverse transpose, derived

A normal `n` is defined by `n · d = 0` for every tangent `d`. Find `N` so that `(N n) · (A d) = 0` too:

```text
   (N n) · (A d)  =  (N n)ᵀ (A d)  =  nᵀ Nᵀ A d

   choose Nᵀ A = I,  i.e.  N = (A⁻¹)ᵀ = A⁻ᵀ:      nᵀ Nᵀ A d  =  nᵀ d  =  n · d  =  0
```

- any `N` that keeps every such dot at zero is a multiple of `A⁻ᵀ`, so renormalizing afterward is all that is left
- a rotation is orthogonal, `R⁻ᵀ = R`; a uniform scale `s I` gives `(1/s) I`, the same direction: **only non-uniform scale and shear** need it


---

## Real code: the normal matrix in both tracks' shaders

<div class="code-tabs">

<pre data-track="unity" data-label="Unity · HLSL"><code class="language-cpp">// Unity built-in pipeline (UnityCG.cginc)
float3 n = UnityObjectToWorldNormal(v.normal);
// = normalize(mul(v.normal, (float3x3)unity_WorldToObject)): normal times the INVERSE,
//   which as a row vector is the inverse transpose</code></pre>

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

</div>


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

### Where affine ends, further

<small>(~3 min)</small>

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

