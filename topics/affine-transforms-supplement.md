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
  NEEDS:   affine-transforms.md, mounted before it (the slides use its block formulas and the trs-order demo's
           numbers).
  DEMOS:   data-demo="football" data-controls="step:1" (the last slide, a full slide).
  NUMBERS: textbook/figures/numbers-foundations.json (key aff) or node against lib/core/xform.js, as in the topic.
  FIGURES: ../../textbook/figures/aff-lights.svg, aff-shear.svg, aff-polar.svg, aff-normals-ellipse.svg; the
           before | after figures affd-mirrors, affd-winding, affd-ts-st, affd-corner-scale and affd-vanishing
           from tools/gen-lecture-figures-affine.mjs.
  SOURCE:  split 2026-10-15 from affine-transforms.md (26 slides, text unchanged except two notes that named a
           textbook section or exercise that moved to the chapter's Appendix).

  EDITED 2026-10-25 (L08, Tuesday October 27, mounts the trimmed affine topic): from affine-transforms.md, why
  graphics uses homogeneous coordinates and a light at infinity (a new first section), what an affine map
  preserves, object and world space, TRS in both tracks' code, normals by the inverse transpose, the pivot in
  both tracks' code, the pipeline stage by stage, and One throw, the whole chain (the football demo), each in
  its section; text unchanged except notes that pointed across the two files.

  EDITED 2026-10-29 (Marcel: "use mathjax formulas instead of ascii, and vector illustrations. keep ascii
  versions as alt text"): every ```text formula block is a MathJax display block with its ASCII as aria-label,
  and every formula on a slide (prose, bullets, tables, headings) is an inline `$...$` formula; new before |
  after figures for two mirrors, the winding flip, T·S against S·T, the corner scale (in place of the rotation
  pivot figure) and the vanishing point. Numbers unchanged; the figures' numbers are asserted by the generator.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:" and stay plain text. Display math is a raw <div class="tex"> block
  typeset by MathJax (lib/deck-math.js; TeX inside, ASCII as aria-label, no blank
  line inside); inline math is a code span written `$...$` (the code span keeps
  marked off the TeX). Pictures are SVG figures from a generator, the ASCII or a
  description as alt text. Paths are relative to the lecture page that mounts
  this topic (lectures/LNN-slug/index.html).
-->

### Supplement: affine transformations, further

<small>(~58 min, time permitting) · reading: <a href="../../textbook/affine-transforms.html#appendix">Affine Transformations, Appendix</a> and the chapter's worked examples</small>


---

### Homogeneous coordinates, further

<small>(~5 min)</small>

---

## Why graphics uses them

- **one matrix for every placement**: rotation, scale and shear are matrix products, but translation is an addition; with the extra coordinate all four become one `$3 \times 3$` (2D) or `$4 \times 4$` (3D) product, and a chain of placements multiplies down to one matrix
- **perspective**: a matrix can write depth into `$w$`; dividing `$x$`, `$y$`, `$z$` by `$w$` afterward makes distant things smaller (the viewing lecture)
- **points at infinity**: `$w = 0$` is a direction, which a translation cannot move; a directional light such as the sun is one
- **one data type from file to shader**: shading languages make `vec4` / `float4` and the `$4 \times 4$` product built-in types; the first programmable vertex processors (DirectX 8 vertex shaders, 2000, in hardware on the GeForce 3, 2001) computed on 4-component registers; today's GPUs (graphics processing units) execute scalar instructions per thread, and a `vec4` is four of them


---

## A light at infinity

<img src="../../textbook/figures/aff-lights.svg" alt="left: a point light at (1, 4, 1) with rays spreading to the ground; right: a directional light (−1, 2, 0) with parallel rays; the same box casts a shadow ending at x = 4.333 and x = 4" style="height:330px">

- a light at `$(x, y, z, 1)$` is a **point light**; at `$(x, y, z, 0)$` it is a **directional light**, the sun: parallel rays
- one formula for both: the direction toward the light from a surface point `$p$` is `$L_{xyz} - L_w \, p$`


---

### Affine maps, further

<small>(~7 min)</small>

---

## What an affine map preserves

An affine map keeps the **structure of lines** and nothing more:

- **lines go to lines**, and **parallel lines stay parallel**
- **ratios along a line** survive: the midpoint of a segment maps to the midpoint of the image segment
- **lengths and angles are not preserved** in general (only when `$A$` is orthogonal: rotations and reflections)

<img src="../../textbook/figures/aff-shear.svg" alt="the unit square and its image under the shear [[1, 0.5], [0, 1]], a parallelogram; the midpoint (0.5, 0.5) maps to (0.75, 0.5), the midpoint of the image diagonal" style="height:250px">


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

Points cannot be added, but they can be **averaged**: `$\alpha p + \beta q$` is a point when `$\alpha + \beta = 1$`.

<div class="tex" style="font-size:0.72em" role="img" aria-label="f(α p + β q) = α f(p) + β f(q)        whenever α + β = 1       (the t's add up to exactly one t)
f(x) = A x + (1, 1),  A = [[1, 0.5], [0, 1]]
p = (0, 0) → (1, 1)        q = (2, 0) → (3, 1)        midpoint (1, 0) → (2, 1) = ½ (1,1) + ½ (3,1)">
\[ f(\alpha p + \beta q) = \alpha f(p) + \beta f(q) \quad \text{whenever } \alpha + \beta = 1 \quad (\text{the } t\text{'s add up to exactly one } t) \]
\[ f(x) = A\,x + (1, 1), \quad A = \begin{bmatrix} 1 & 0.5 \\ 0 & 1 \end{bmatrix}\!: \qquad p = (0, 0) \to (1, 1), \quad q = (2, 0) \to (3, 1) \]
\[ \text{midpoint } (1, 0) \to (2, 1) = \tfrac{1}{2}\,(1, 1) + \tfrac{1}{2}\,(3, 1) \]
</div>

- this is **why** an affine map keeps ratios: a point at weight `$t$` along a segment stays at weight `$t$`
- weights that do not sum to one mix in the origin: `$p + q$` depends on where the origin is, so it is not a point


---

## Worked: a determinant, and an area

<div class="tex" role="img" aria-label="A = [ 2  1  0 ]         det A = 2 · (1·3 − 0·0) − 1 · (0·3 − 0·0) + 0 = 6
    [ 0  1  0 ]
    [ 0  0  3 ]
2D: triangle (0,0), (1,0), (0,1), area 0.5
    under diag(2, 3):   (0,0), (2,0), (0,3), area 3 = 0.5 · det = 0.5 · 6">
\[ A = \begin{bmatrix} 2 & 1 & 0 \\ 0 & 1 & 0 \\ 0 & 0 & 3 \end{bmatrix} \qquad \det A = 2\,(1 \cdot 3 - 0 \cdot 0) - 1\,(0 \cdot 3 - 0 \cdot 0) + 0 = 6 \]
\[ \begin{aligned} &\text{2D: the triangle } (0, 0), (1, 0), (0, 1)\text{, area } 0.5 \\ &\text{under } \operatorname{diag}(2, 3)\text{: } (0, 0), (2, 0), (0, 3)\text{, area } 3 = 0.5 \cdot \det = 0.5 \cdot 6 \end{aligned} \]
</div>

Volumes (and areas) scale by `$\lvert \det A \rvert$` **everywhere at once**: every triangle of the mesh grows by the same factor.


---

## Two mirrors make a rotation

<div class="tex" style="font-size:0.72em" role="img" aria-label="mirror in x:  diag(−1, 1, 1),  det −1
mirror in y:  diag(1, −1, 1),  det −1
product:      diag(−1, −1, 1), det (−1)(−1) = +1      a half turn about z">
\[ \begin{aligned} &\text{mirror in } x\text{: } && \operatorname{diag}({-1}, 1, 1), && \det = {-1} \\ &\text{mirror in } y\text{: } && \operatorname{diag}(1, {-1}, 1), && \det = {-1} \\ &\text{product: } && \operatorname{diag}({-1}, {-1}, 1), && \det = ({-1})({-1}) = {+1} && \text{a half turn about } z \end{aligned} \]
</div>

<img src="../../textbook/figures/affd-mirrors.svg" alt="three panels: a flag (det = +1); mirrored in x by diag(−1, 1, 1), the pennant now points left (det = −1: a mirror image); mirrored again in y by diag(−1, −1, 1), the flag is the start turned 180 degrees about the origin (det = (−1)(−1) = +1: a half turn)" style="height:270px">

Determinants multiply, so an **even** number of mirrors is a rotation and an **odd** number is a mirror. A model with scale `$(-1, -1, 1)$` is only turned; one with `$(-1, 1, 1)$` is mirrored and renders inside out unless the renderer flips its culling.


---

## Pitfall: a mirror flips the winding

<img src="../../textbook/figures/affd-winding.svg" alt="triangle (0,0), (1,0), (0,1):     edge function  = +1   counter-clockwise, normal (0, 0, +1)
mirror x → −x:  (0,0), (−1,0), (0,1):  edge function = −1   clockwise,  normal (0, 0, −1)" style="height:290px">

- back-face culling keeps counter-clockwise triangles: after the mirror the **whole mesh is culled**, or drawn inside out
- engines check `$\det \lt 0$` on the model matrix and flip the culling mode (Unity does this automatically for negative scale)


---

### Composition and the inverse, further

<small>(~12 min)</small>

---

## Worked: `$T \cdot R$` and `$R \cdot T$` from the block formula

`$T$` = translate by `$t = (1.5, 0, 0)$`; `$R = R_y(60^\circ)$`, `$\cos 60^\circ = 0.5$`, `$\sin 60^\circ = 0.866$`.

<div class="tex" style="font-size:0.68em" role="img" aria-label="T·R :  B = I, s = t;  A = R, t' = 0     →  linear part R,  translation  I·0 + t   = (1.5, 0, 0)
R·T :  B = R, s = 0;  A = I, t' = t     →  linear part R,  translation  R·t + 0   = (1.5·cos60, 0, −1.5·sin60) = (0.75, 0, −1.30)
T·R = [ 0.5    0  0.866  1.5 ]      R·T = [ 0.5    0  0.866   0.75 ]
      [ 0      1  0      0   ]            [ 0      1  0       0    ]
      [ −0.866 0  0.5    0   ]            [ −0.866 0  0.5    −1.30 ]">
\[ \begin{aligned} T \cdot R\text{: } & B = I,\ s = t;\ A = R,\ t' = 0 \;\to\; \text{linear part } R\text{, translation } I \cdot 0 + t = (1.5, 0, 0) \\ R \cdot T\text{: } & B = R,\ s = 0;\ A = I,\ t' = t \;\to\; \text{linear part } R\text{, translation } R\,t + 0 \\ & \phantom{B = R,\ s = 0;\ A = I,\ t' = t \;\to\;} = (1.5 \cos 60^\circ, 0, {-1.5} \sin 60^\circ) = (0.75, 0, {-1.30}) \end{aligned} \]
\[ T \cdot R = \begin{bmatrix} 0.5 & 0 & 0.866 & 1.5 \\ 0 & 1 & 0 & 0 \\ {-0.866} & 0 & 0.5 & 0 \end{bmatrix} \qquad R \cdot T = \begin{bmatrix} 0.5 & 0 & 0.866 & 0.75 \\ 0 & 1 & 0 & 0 \\ {-0.866} & 0 & 0.5 & {-1.30} \end{bmatrix} \]
</div>

Same linear part, different translation column: **rotate then translate** drops the move in as is; **translate then rotate** swings the move by `$60^\circ$`. The object lands at `$(1.5, 0, 0)$` in one case and on an arc of radius 1.5 in the other.


---

## Worked: `$T \cdot S$` and `$S \cdot T$`

`$T$` = translate by `$(1, 0, 0)$`, `$S$` = uniform scale by 2:

<div class="tex" style="font-size:0.68em" role="img" aria-label="T·S :  linear part 2I,  translation  I·0 + (1, 0, 0) = (1, 0, 0)      scale in place, then move 1
S·T :  linear part 2I,  translation  2·(1, 0, 0)    = (2, 0, 0)      move 1, then the move is scaled too">
\[ \begin{aligned} T \cdot S\text{: } & \text{linear part } 2I\text{, translation } I \cdot 0 + (1, 0, 0) = (1, 0, 0) && \text{scale in place, then move } 1 \\ S \cdot T\text{: } & \text{linear part } 2I\text{, translation } 2 \cdot (1, 0, 0) = (2, 0, 0) && \text{the move is scaled too} \end{aligned} \]
</div>

<img src="../../textbook/figures/affd-ts-st.svg" alt="two panels: T·S scales the flag in place to twice its size, then moves it 1, so its foot lands at (1, 0) and column 3 is (1, 0, 0); S·T moves the flag 1 first, then the scale doubles the move too, so its foot lands at (2, 0) and column 3 is (2, 0, 0)" style="height:286px">

The scale **stretches the translation** when it acts second. Same lesson as `$T \cdot R$` and `$R \cdot T$`: column 3 carries the order.


---

## Worked: invert `$M = T(2, 0, 0) \cdot R_y(90^\circ)$`

`$R_y(90^\circ)$` sends the `$x$`-axis to `$-z$`; its columns are `$(0, 0, -1)$`, `$(0, 1, 0)$`, `$(1, 0, 0)$`, and `$t = (2, 0, 0)$`.

<div class="tex" style="font-size:0.72em" role="img" aria-label="    [ 0   0   1   2 ]                 [ 0   0  −1   0 ]
M = [ 0   1   0   0 ]      M⁻¹  =     [ 0   1   0   0 ]      linear part R^T,  column 3 = −R^T t
    [ −1  0   0   0 ]                 [ 1   0   0  −2 ]
    [ 0   0   0   1 ]                 [ 0   0   0   1 ]
 R^T t = (row 0 of R^T · t, …) = (0, 0, 2)   →   −R^T t = (0, 0, −2)">
\[ M = \begin{bmatrix} 0 & 0 & 1 & 2 \\ 0 & 1 & 0 & 0 \\ {-1} & 0 & 0 & 0 \\ 0 & 0 & 0 & 1 \end{bmatrix} \qquad M^{-1} = \begin{bmatrix} 0 & 0 & {-1} & 0 \\ 0 & 1 & 0 & 0 \\ 1 & 0 & 0 & {-2} \\ 0 & 0 & 0 & 1 \end{bmatrix} \qquad \begin{aligned} &\text{linear part } R^T \\ &\text{column } 3 = {-R^T t} \end{aligned} \]
\[ R^T t = (\text{row } 0 \text{ of } R^T \cdot t, \dots) = (0, 0, 2) \quad \to \quad {-R^T t} = (0, 0, {-2}) \]
</div>

Multiply `$M \cdot M^{-1}$` and every entry lands on the identity. One transpose, one small product, no elimination.


---

## Worked: undo the demo's `$T \cdot R$`

`$M = T(1.5, 0, 0) \cdot R_y(60^\circ)$`. The inverse by the reversal rule: `$M^{-1} = R_y(60^\circ)^{-1} \cdot T(1.5, 0, 0)^{-1} = R_y(-60^\circ) \cdot T(-1.5, 0, 0)$`:

<div class="tex" role="img" aria-label="linear part  R^T,  first row (0.5, 0, −0.866)
translation  −R^T t = −R^T (1.5, 0, 0) = (−0.75, 0, −1.299)
check: M⁻¹ · (1.5, 0, 0, 1) = (0, 0, 0, 1)      the object's origin comes home">
\[ \begin{aligned} &\text{linear part } R^T\text{, first row } (0.5, 0, {-0.866}) \\ &\text{translation } {-R^T t} = {-R^T}\,(1.5, 0, 0) = ({-0.75}, 0, {-1.299}) \\ &\text{check: } M^{-1} \cdot (1.5, 0, 0, 1) = (0, 0, 0, 1) \quad \text{the object's origin comes home} \end{aligned} \]
</div>

The inverse of `$T \cdot R$` has the shape of `$R \cdot T$`: a rotation first, then a translation.


---

## Pitfall: inverting as if the matrix were TRS

`$M$` has columns `$(1.5, 0.5, 0)$` and `$(0.5, 1.5, 0)$`: a **non-uniform scale along a diagonal**. It is affine, `$\det = 2$`, but not `$T \cdot R \cdot S$` (its columns are not orthogonal: dot 1.5).

<div class="tex" role="img" aria-label="true inverse, column 0:           (0.75, −0.25, 0)
invertTRS (assumes T·R·S), col 0: (0.6,   0.2,  0)
M · invertTRS(M), row 0:          (1, 0.6, 0)        should be (1, 0, 0): error 0.6">
\[ \begin{aligned} &\text{true inverse, column } 0\text{: } (0.75, {-0.25}, 0) \\ &\texttt{invertTRS} \text{ (assumes } T \cdot R \cdot S\text{), column } 0\text{: } (0.6, 0.2, 0) \\ &M \cdot \texttt{invertTRS}(M)\text{, row } 0\text{: } (1, 0.6, 0)\text{, should be } (1, 0, 0)\text{: error } 0.6 \end{aligned} \]
</div>

A TRS inverse divides by column lengths and transposes; that is only right when the columns are **orthogonal**.


---

## The condition number: largest stretch over smallest

`$\kappa(A)$` = the largest factor `$A$` stretches any direction by, over the smallest. A round trip through `$A$` and `$A^{-1}$` keeps about `$\kappa \cdot \varepsilon$` relative accuracy:

| `$A$` | stretches | `$\kappa$` |
| --- | --- | --- |
| a rotation | 1, 1, 1 | 1 |
| `$\operatorname{diag}(2, 1, 1)$` | 2, 1, 1 | 2 |
| the shear `$\left[\begin{smallmatrix} 1 & 0.5 \\ 0 & 1 \end{smallmatrix}\right]$` | 1.281, 0.781 | 1.640 |
| `$\operatorname{diag}(10^6, 1, 1)$` | `$10^6$`, 1, 1 | `$10^6$` |

In float32, `$\varepsilon = 2^{-23} \approx 1.2 \times 10^{-7}$`: at `$\kappa = 10^6$` only about one decimal digit survives.


---

## Pitfall: huge scales lose digits

Round-trip a point through `$M = \operatorname{diag}(s, 1, 1)$` and its inverse in 32-bit floats:

| scale `$s$` | condition number | round-trip error | predicted (`$\kappa \cdot 2^{-23}$`) |
| --- | --- | --- | --- |
| 1 | 1 | `$2.4 \times 10^{-7}$` | `$1.2 \times 10^{-7}$` |
| 100 | 100 | `$2.3 \times 10^{-6}$` | `$1.2 \times 10^{-5}$` |
| 10,000 | 10,000 | `$2.7 \times 10^{-4}$` | `$1.2 \times 10^{-3}$` |
| 1,000,000 | `$10^6$` | 0.024 | 0.12 |
| 10,000,000 | `$10^7$` | 0.34 | 1.2 |

Keep scales near 1: model in sensible units, and never "hide" an object with scale `$10^{-7}$`.


---

### Frames, storage, and TRS, further

<small>(~8 min)</small>

---

## Object space and world space

Every object has its **own** frame; the model matrix `$M$` is the bridge:

<div class="tex" style="font-size:0.68em" role="img" aria-label="p_world  = M · p_object          place the mesh: its vertices never change
p_object = M⁻¹ · p_world         bring a world point (a mouse ray hit) into the object's frame">
\[ \begin{aligned} p_{\text{world}} &= M \cdot p_{\text{object}} && \text{place the mesh: its vertices never change} \\ p_{\text{object}} &= M^{-1} \cdot p_{\text{world}} && \text{bring a world point (a mouse ray hit) into the object's frame} \end{aligned} \]
</div>

- **object (local) space**: the frame the mesh was authored in; a cube's corners at `$\pm 0.5$` forever
- **world space**: the shared scene frame everything is placed into
- Unity: `transform.localPosition` is in the **parent's** frame, `transform.position` in the **world**; `Matrix4x4.TRS(...)` builds the local `$M$`


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

Both build `$T \cdot R \cdot S$`; `m.decompose(pos, quat, scale)` in three.js reads it back.


---

## Pitfall: a row-vector matrix pasted as columns

`$T(2, 0, 0)$` copied from a row-vector source without transposing: the 2 lands in the **bottom row**.

<div class="tex" style="font-size:0.72em" role="img" aria-label="[ 1  0  0  0 ]        (0, 0, 0, 1) → w = 1  → (0, 0, 0)        should be (2, 0, 0)
[ 0  1  0  0 ]        (1, 0, 0, 1) → w = 3  → (0.333, 0, 0)    should be (3, 0, 0)
[ 0  0  1  0 ]        (2, 0, 0, 1) → w = 5  → (0.4, 0, 0)      should be (4, 0, 0)
[ 2  0  0  1 ]        x = −0.5     → w = 0  → a point at infinity">
\[ \begin{bmatrix} 1 & 0 & 0 & 0 \\ 0 & 1 & 0 & 0 \\ 0 & 0 & 1 & 0 \\ 2 & 0 & 0 & 1 \end{bmatrix} \qquad \begin{aligned} (0, 0, 0, 1) &\to w = 1 \to (0, 0, 0) && \text{should be } (2, 0, 0) \\ (1, 0, 0, 1) &\to w = 3 \to (0.333, 0, 0) && \text{should be } (3, 0, 0) \\ (2, 0, 0, 1) &\to w = 5 \to (0.4, 0, 0) && \text{should be } (4, 0, 0) \\ x = {-0.5} &\to w = 0 \to \text{a point at infinity} \end{aligned} \]
</div>

Nothing moves by 2: the object is **squashed toward the origin** by a projective divide. The tell is a bottom row other than `$(0, 0, 0, 1)$`.


---

## Worked: read TRS back from a matrix

<div class="tex" style="font-size:0.72em" role="img" aria-label="M = [ 1     0   0.433  1 ]      |col 0| = √(1² + 1.732²) = 2        sx = 2
    [ 0     1   0      2 ]      |col 1| = 1                          sy = 1
    [−1.732 0   0.25   3 ]      |col 2| = √(0.433² + 0.25²) = 0.5   sz = 0.5
    [ 0     0   0      1 ]      t = (1, 2, 3)
R = columns / lengths:  (0.5, 0, −0.866), (0, 1, 0), (0.866, 0, 0.5)   =  R_y(60)">
\[ M = \begin{bmatrix} 1 & 0 & 0.433 & 1 \\ 0 & 1 & 0 & 2 \\ {-1.732} & 0 & 0.25 & 3 \\ 0 & 0 & 0 & 1 \end{bmatrix} \qquad \begin{aligned} \lvert \text{col } 0 \rvert &= \sqrt{1^2 + 1.732^2} = 2 && s_x = 2 \\ \lvert \text{col } 1 \rvert &= 1 && s_y = 1 \\ \lvert \text{col } 2 \rvert &= \sqrt{0.433^2 + 0.25^2} = 0.5 && s_z = 0.5 \\ t &= (1, 2, 3) \end{aligned} \]
\[ R = \text{the columns over their lengths: } (0.5, 0, {-0.866}),\ (0, 1, 0),\ (0.866, 0, 0.5) = R_y(60^\circ) \]
</div>

`$M = T(1, 2, 3) \cdot R_y(60^\circ) \cdot S(2, 1, 0.5)$`, read off by eye.


---

## Worked: apply it, then undo it

The same `$M = T(1, 2, 3) \cdot R_y(60^\circ) \cdot S(2, 1, 0.5)$` on the point `$(1, 1, 1)$`:

<div class="tex" style="font-size:0.72em" role="img" aria-label="S:  (2, 1, 0.5)      R_y(60):  (1.433, 1, −1.482)      T:  (2.433, 3, 1.518)
M⁻¹ = S⁻¹ · R^T · T⁻¹:   linear rows (0.25, 0, −0.433), (0, 1, 0), (1.732, 0, 1)
                         translation −S⁻¹ R^T t = (1.049, −2, −4.732)
M⁻¹ · (2.433, 3, 1.518, 1) = (1, 1, 1, 1)">
\[ S\text{: } (2, 1, 0.5) \qquad R_y(60^\circ)\text{: } (1.433, 1, {-1.482}) \qquad T\text{: } (2.433, 3, 1.518) \]
\[ \begin{aligned} M^{-1} &= S^{-1} \cdot R^T \cdot T^{-1} \\ \text{linear rows} &\text{: } (0.25, 0, {-0.433}),\ (0, 1, 0),\ (1.732, 0, 1) \\ \text{translation} &\text{: } {-S^{-1} R^T t} = (1.049, {-2}, {-4.732}) \\ M^{-1} \cdot (2.433, 3, 1.518, 1) &= (1, 1, 1, 1) \end{aligned} \]
</div>

Scale first, rotate, move; undo in reverse: move back, unrotate, unscale.


---

## Any affine map: a rotation times a stretch

<img src="../../textbook/figures/aff-polar.svg" alt="the shear's unit circle mapped to an ellipse, with the stretch directions and the rotation marked" style="height:220px">

<div class="tex" style="font-size:0.64em" role="img" aria-label="A = [[1, 0.5], [0, 1]]  (the shear)  =  R · P,   P symmetric
stretches 1.281 and 0.781 along directions at 52.0° and −38.0°,   then R = rotation by −14.0°
TRS read-back of A: column lengths 1 and 1.118, columns 63.4° apart (not 90°): not a rotation">
\[ A = \begin{bmatrix} 1 & 0.5 \\ 0 & 1 \end{bmatrix} \text{ (the shear)} = R \cdot P, \quad P \text{ symmetric} \]
\[ \begin{gathered} \text{stretches } 1.281 \text{ and } 0.781 \text{ along directions at } 52.0^\circ \text{ and } {-38.0^\circ}\text{, then } R = \text{rotation by } {-14.0^\circ} \\ \text{TRS read-back of } A\text{: column lengths } 1 \text{ and } 1.118\text{, columns } 63.4^\circ \text{ apart (not } 90^\circ\text{): not a rotation} \end{gathered} \]
</div>


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

## Normals need the inverse transpose

<img src="../../textbook/figures/aff-normals-ellipse.svg" alt="the unit circle with a normal and tangent at 45 degrees, and the ellipse after diag(2, 1): the normal pushed through A leans away from the true normal, the inverse-transpose normal is perpendicular to the tangent" style="height:350px">

- a tangent moves by `$A$`; the normal must stay perpendicular to it, and `$A\,n$` does not: use `$A^{-T} n$`, the **inverse transpose**, then renormalize
- why: `$(A^{-T} n) \cdot (A\,d) = n^T A^{-1} A\,d = n \cdot d = 0$`; for a rotation `$A^{-T} = A$`, so the bug hides until the first non-uniform scale


---

## The inverse transpose, derived

A normal `$n$` is defined by `$n \cdot d = 0$` for every tangent `$d$`. Find `$N$` so that `$(N n) \cdot (A\,d) = 0$` too:

<div class="tex" role="img" aria-label="(N n) · (A d)  =  (N n)ᵀ (A d)  =  nᵀ Nᵀ A d
choose Nᵀ A = I,  i.e.  N = (A⁻¹)ᵀ = A⁻ᵀ:      nᵀ Nᵀ A d  =  nᵀ d  =  n · d  =  0">
\[ (N n) \cdot (A\,d) = (N n)^T (A\,d) = n^T N^T A\,d \]
\[ \text{choose } N^T A = I\text{, i.e. } N = (A^{-1})^T = A^{-T}\text{:} \qquad n^T N^T A\,d = n^T d = n \cdot d = 0 \]
</div>

- any `$N$` that keeps every such dot at zero is a multiple of `$A^{-T}$`, so renormalizing afterward is all that is left
- a rotation is orthogonal, `$R^{-T} = R$`; a uniform scale `$s I$` gives `$(1/s)\, I$`, the same direction: **only non-uniform scale and shear** need it


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

A plane is a row `$\pi = (n, d)$` with `$\pi \cdot (x, 1) = 0$`. Keep the equation true under `$M$`: `$\pi' = \pi \cdot M^{-1}$`, i.e. `$\pi'^T = M^{-T} \pi^T$`.

<div class="tex" style="font-size:0.72em" role="img" aria-label="π = (1/3, 2/3, 2/3, −1/3)            the unit-normal plane of the vector-geometry topic
π' = π · M⁻¹ = (1.238, 0.667, 0.522, −4.472)
normalized:   n' = (0.825, 0.444, 0.348),  d' = −2.981
check: a mapped point of the plane satisfies π' · (x', 1) = 0        (0 to 4 digits)
naive M·n gives (0.622, 0.667, −0.411): the mapped point misses the plane by 3.0">
\[ \begin{aligned} \pi &= (1/3, 2/3, 2/3, {-1/3}) \quad \text{the unit-normal plane of the vector-geometry topic} \\ \pi' &= \pi \cdot M^{-1} = (1.238, 0.667, 0.522, {-4.472}) \\ n' &= (0.825, 0.444, 0.348), \quad d' = {-2.981} \quad \text{(normalized)} \\ \text{check: } & \text{a mapped point of the plane satisfies } \pi' \cdot (x', 1) = 0 \text{ to 4 digits} \\ \text{naive } M\,n &= (0.622, 0.667, {-0.411})\text{: the mapped point misses the plane by } 3.0 \end{aligned} \]
</div>

Clipping planes, frustum planes and mirror planes all move this way.


---

## Worked: the ground plane, moved

The plane `$y = 0$` is `$\pi = (0, 1, 0, 0)$`. Move it with `$M = T(0, 2, 0) \cdot \operatorname{diag}(1, 3, 1)$`:

<div class="tex" style="font-size:0.72em" role="img" aria-label="M⁻¹: linear part diag(1, 1/3, 1),  translation −diag(1, 1/3, 1)(0, 2, 0) = (0, −2/3, 0)
π' = π · M⁻¹ = (0, 1/3, 0, −2/3)       normalized: (0, 1, 0, −2)     the plane y = 2
check:  M (0, 0, 0) = (0, 2, 0) and M (1, 0, 5) = (1, 2, 5) both lie on y = 2">
\[ \begin{aligned} M^{-1}\text{: } & \text{linear part } \operatorname{diag}(1, 1/3, 1) \\ & \text{translation } {-\operatorname{diag}(1, 1/3, 1)}\,(0, 2, 0) = (0, {-2/3}, 0) \\ \pi' = \pi \cdot M^{-1} &= (0, 1/3, 0, {-2/3})\text{, normalized } (0, 1, 0, {-2})\text{: the plane } y = 2 \\ \text{check: } & M\,(0, 0, 0) = (0, 2, 0) \text{ and } M\,(1, 0, 5) = (1, 2, 5) \text{ both lie on } y = 2 \end{aligned} \]
</div>

The scale did nothing to a plane through the origin except be undone; the translation moved it.


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

## Worked: pivot `$(2, 0, 0)$`, rotate `$90^\circ$` about `$y$`

`$R = R_y(90^\circ)$`, `$p = (2, 0, 0)$`. `$R\,p = 2 \cdot \text{column } 0 = (0, 0, -2)$`, so `$(I - R)\,p = (2, 0, 0) - (0, 0, -2) = (2, 0, 2)$`:

<div class="tex" style="font-size:0.68em" role="img" aria-label="    [ 0   0   1   2 ]      pivot   (2,0,0) → (2, 0,  0)    FIXED
M = [ 0   1   0   0 ]      (3,0,0) → (2, 0, −1)    +x of the pivot swings to −z
    [ −1  0   0   2 ]      (2,0,1) → (3, 0,  0)    +z of the pivot swings to +x
    [ 0   0   0   1 ]">
\[ M = \begin{bmatrix} 0 & 0 & 1 & 2 \\ 0 & 1 & 0 & 0 \\ {-1} & 0 & 0 & 2 \\ 0 & 0 & 0 & 1 \end{bmatrix} \qquad \begin{aligned} \text{pivot } (2, 0, 0) &\to (2, 0, 0) && \textbf{fixed} \\ (3, 0, 0) &\to (2, 0, {-1}) && {+x} \text{ of the pivot swings to } {-z} \\ (2, 0, 1) &\to (3, 0, 0) && {+z} \text{ of the pivot swings to } {+x} \end{aligned} \]
</div>


---

## Worked: scale about a corner

Double a unit square about its corner `$p = (1, 1, 0)$`: `$M = T(p) \cdot S(2) \cdot T(-p)$`:

<div class="tex" style="font-size:0.72em" role="img" aria-label="translation column = (I − S) p = (1 − 2)(1, 1, 0) = (−1, −1, 0)
(1, 1, 0) → (1, 1, 0)     the corner stays put
(2, 1, 0) → (3, 1, 0)     the far edge moves twice as far from the corner">
\[ \begin{aligned} &\text{translation column} = (I - S)\,p = (1 - 2)\,(1, 1, 0) = ({-1}, {-1}, 0) \\ &(1, 1, 0) \to (1, 1, 0) \quad \text{the corner stays put} \\ &(2, 1, 0) \to (3, 1, 0) \quad \text{the far edge moves twice as far from the corner} \end{aligned} \]
</div>

<img src="../../textbook/figures/affd-corner-scale.svg" alt="before: the unit square with corners (1, 1), (2, 1), (2, 2), (1, 2) at the corner p = (1, 1); after M = T(p) · S(2) · T(−p): the square with corners (1, 1), (3, 1), (3, 3), (1, 3), the corner p fixed and every other point twice as far from it" style="height:262px">


---

## Conjugation: do it in the frame where it is simple

The sandwich is `$M = F \cdot X \cdot F^{-1}$` with any frame `$F$`, not only a translation:

<div class="tex" style="font-size:0.72em" role="img" aria-label="F = T(p),         X = R              rotate about the point p
F = R_z(45°),     X = diag(2, 1, 1)  scale by 2 along the diagonal (1, 1, 0)/√2
R_z(45°) · diag(2, 1, 1) · R_z(−45°) = [ 1.5  0.5  0 ]      M (1, 1, 0) = (2, 2, 0)   doubled
                                       [ 0.5  1.5  0 ]      M (1, −1, 0) = (1, −1, 0) unchanged
                                       [ 0    0    1 ]">
\[ \begin{aligned} F &= T(p), & X &= R && \text{rotate about the point } p \\ F &= R_z(45^\circ), & X &= \operatorname{diag}(2, 1, 1) && \text{scale by 2 along the diagonal } (1, 1, 0)/\sqrt{2} \end{aligned} \]
\[ R_z(45^\circ) \cdot \operatorname{diag}(2, 1, 1) \cdot R_z({-45^\circ}) = \begin{bmatrix} 1.5 & 0.5 & 0 \\ 0.5 & 1.5 & 0 \\ 0 & 0 & 1 \end{bmatrix} \]
\[ M\,(1, 1, 0) = (2, 2, 0) \text{ doubled} \qquad M\,(1, {-1}, 0) = (1, {-1}, 0) \text{ unchanged} \]
</div>

The oblique scale of the inverse pitfall is exactly this sandwich: a symmetric matrix, no rotation, and not a TRS.


---

### Where affine ends, further

<small>(~3 min)</small>

---

## Worked: a projective map in 2D

Put a nonzero entry in the last row: `$H = \left[\begin{smallmatrix} 1 & 0 & 0 \\ 0 & 1 & 0 \\ 0 & 0.5 & 1 \end{smallmatrix}\right]$`, so `$w = 1 + 0.5\, y$`:

| in | `$w$` | out `$= (x/w,\ y/w)$` |
| --- | --- | --- |
| (0, 0) | 1 | (0, 0) |
| (1, 0) | 1 | (1, 0) |
| (0, 1) | 1.5 | (0, 0.667) |
| (1, 1) | 1.5 | (0.667, 0.667) |
| (0, 2) | 2 | (0, 1) |
| (1, 2) | 2 | (0.5, 1) |

The parallel lines `$x = 0$` and `$x = 1$` now **converge**: their images are 1, 0.667, 0.5 apart at `$y = 0, 1, 2$`.


---

## Worked: where the parallels meet

Same `$H$`, `$w = 1 + 0.5\, y$`, along the line `$x = 1$`:

<div class="tex" style="font-size:0.72em" role="img" aria-label="(1, 6)    → w = 4     → (0.25, 1.5)
(1, 100)  → w = 51    → (0.02, 1.961)
y → ∞     →             (1/(1 + 0.5y), y/(1 + 0.5y)) → (0, 2)
x = 0:    (0, y)      → (0, y/(1 + 0.5y))          → (0, 2) as well">
\[ \begin{aligned} (1, 6) &\to w = 4 && \to (0.25, 1.5) \\ (1, 100) &\to w = 51 && \to (0.02, 1.961) \\ y \to \infty\text{: } (1, y) &\to \left(\tfrac{1}{1 + 0.5 y}, \tfrac{y}{1 + 0.5 y}\right) && \to (0, 2) \\ x = 0\text{: } (0, y) &\to \left(0, \tfrac{y}{1 + 0.5 y}\right) && \to (0, 2) \text{ as well} \end{aligned} \]
</div>

<img src="../../textbook/figures/affd-vanishing.svg" alt="before: the parallel vertical lines x = −1, 0, 1, 2 (x = 1 in red, with the point (1, 6)); after H, w = 1 + 0.5 y: the images are lines that all meet at the vanishing point (0, 2), and (1, 6) lands at (0.25, 1.5); horizontal lines stay horizontal, and y = 0, 1, 2 land at 0, 0.667, 1" style="height:240px">

Every vertical line approaches `$(0, 2)$`: the **vanishing point**, the image of the point at infinity `$(0, 1, 0)$`.


---

## The pipeline, stage by stage

Sung's `451Shader` applies the chain explicitly, one coordinate space at a time:

```glsl [1-3]
float4x4 MyXformMat;                        // our model matrix, uploaded from C# (affine)
o.vertex = mul(MyXformMat, v.vertex);       // object → world      (affine)
o.vertex = mul(UNITY_MATRIX_VP, o.vertex);  // world → view → clip (view: affine; projection: not)
```

`UnityObjectToClipPos(v)` folds all of it into one `MVP` multiply. Split, it is a chain of frame changes: **model → world → view → projection**, every arrow a `$4 \times 4$`, all affine but the last.


---

### One throw, the whole chain

<small>(~6 min)</small>


---

## One throw, one chain

<div class="tex" role="img" aria-label="p_clip = P · V · F · H · T(t) · A(t) · W(t) · S(t) · p_mesh       applied right to left">
\[ p_{\text{clip}} = P \cdot V \cdot F \cdot H \cdot T(t) \cdot A(t) \cdot W(t) \cdot S(t) \cdot p_{\text{mesh}} \qquad \text{applied right to left} \]
</div>

| Link | Matrix | From → to |
| --- | --- | --- |
| `$S(t)$` spin | `$R_z(\varphi)$`, `$\varphi = 2\pi \cdot \text{rpm} / 60 \cdot t$` | object → spin axis |
| `$W(t)$` wobble | `$R_z(\psi) \cdot R_x(\beta) \cdot R_z(-\psi)$` | spin axis → velocity |
| `$A(t)$` aim | `$R_x(-\theta)$`, `$\theta = \operatorname{atan2}(v_y, v_z)$` | velocity → flight |
| `$T(t)$` flight | `$T(0, y(t), z(t))$`, a parabola | flight → throw |
| `$H$` set-up | `$T(\text{start}) \cdot R_y(h)$` | throw → field |
| `$F$` field | `$R_y(\gamma) \cdot T(-25, 0, -55)$` | field → world |
| `$V$` view | `$(F \cdot C)^{-1}$`, `$C$` the camera's placement | world → camera |
| `$P$` projection | `perspective(fov, aspect, near, far)` | camera → clip |

`$S$`, `$W$`, `$A$`, `$T$` change every frame; `$H$`, `$F$` once per throw; `$M = F \cdot H \cdot T \cdot A \cdot W \cdot S$` is the model matrix.


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

