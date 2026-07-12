<!--
  CSS 551 · Lecture 4 (Session 4) — Matrices & coordinate spaces.
  reveal.js: FLAT deck — every slide is a top-level "---" section (no vertical
  "--" stacks). Keeps the verify-deck harness's demo probe correct (it selects
  "section.present [data-demo]", which inside a vertical stack matches a demo on
  a not-yet-shown sibling slide, 0x0 -> fill times out). Flat = one section per
  slide = demo only matched when shown. Notes follow "Note:".

  Real C# / shader excerpts are from Kelvin Sung's CSS 451 ClassExamples,
  Topic4-Matrices (4.4.CPU-TRS, 4.5.TSvsST, 4.6.InverseTransform,
  4.7.PivotedScaleRotate) — the CDP projects students walk in Parts 4-5 and
  rebuild in Thursday's studio.

  MATH IS PLAIN TEXT ON PURPOSE. This shell loads NO KaTeX plugin (only
  markdown/highlight/notes), so "$...$" would render literally. All formulas
  are unicode plain text or fenced ```text blocks, like S01-S03. Never two "_"
  on one markdown line OUTSIDE a code fence (they pair into <em> and shred the
  line): in prose and speaker notes ALWAYS backtick names with underscores —
  write `R_y`, `T·R`, `R·T`, `-R^T t`, never bare R_y ... R_z. Matrices inside
  ```text fences are safe. No <small> on math. Verify every slide at 1280x620.

  DEMO: trs-order embedded ONCE in Part 2, controls "tx,ry" (rotate mode; the
  second factor B is R_y). ASCII viz-fallback shows the HAND-VERIFIED default
  (tx=1.5, ry=60), matching the Part-2 worked example digit-for-digit:
     T = makeTRS(1.5,0,0, 0,0,0, 1,1,1)   R = makeTRS(0,0,0, 0,60,0, 1,1,1)
     left  = T·R  -> rot block R_y(60), translation column (1.50, 0, 0)
     right = R·T  -> SAME rot block,     translation column (0.75, 0, -1.30)
       cos60 = 0.50, sin60 = 0.866 (Mat4Panel prints toFixed(2): 0.87, -1.30)
  Verified via node against lib/core/xform.js makeTRS/matMul. Same tx/ry drive
  the worked slides AND the panel so deck <-> demo <-> fallback agree.

  Session plan (120 min, Tue 5:45-7:45 PM synchronous online). Sums to ~110 + buffer.
    0:00  Intro (title + tonight)                       ~2 min
    0:02  Part 1  A matrix is a machine                 20 min   (columns = basis images; 4x4 homogeneous; read TRS by eye)
    0:22  Part 2  Composition & order                   25 min   (multiply = right-to-left; T·R vs R·T worked; demo)
    0:47  Part 3  Inverses                              20 min   (undo T/R/S; rigid inverse R^T, -R^T t; verify M·M^-1 = I)
    1:07  Part 4  Pivots and spaces                     25 min   (T(p)·R·T(-p) derived; object vs world; 451Shader bridge)
    1:32  Part 5  CDP walkthrough                       15 min   (TSvsST + PivotedScaleRotate + CPU-TRS XformLoader)
    1:47  Wrap                                           5 min   (Thu Topic4 studio + MP3 lab; MP3a out)
    1:52  end (+ buffer)
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 4 — Matrices & Coordinate Spaces**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>

---

## Tonight

- A **matrix is a machine**: its columns are where the basis axes land
- **4×4 homogeneous**: points carry `w=1`, vectors `w=0` — and it matters
- **Composition = multiplication**, right-to-left — so order is not free
- **Inverses** undo a transform; rigid ones have a clean closed form
- **Pivots and spaces**: rotate about any point; object vs world space

---

### Part 1 · A matrix is a machine

<small>(~20 min)</small>

---

## What a transform matrix does

A matrix times a vector is a **machine**: feed in a point, get a transformed point.

```text
[ x' ]   [ a  b  c ] [ x ]
[ y' ] = [ d  e  f ] [ y ]
[ z' ]   [ g  h  i ] [ z ]
```

The trick from S03 still holds: feed in `(1,0,0)` and you read out **column 0**. So the columns are **where the three axes land** — the machine is fully described by what it does to the basis.

---

## Why 3×3 is not enough: translation

A 3×3 always fixes the origin — feed in `(0,0,0)`, get `(0,0,0)`. But **translation moves the origin**. No 3×3 can do it. The fix: add a fourth coordinate `w` and a fourth column that carries the move.

```text
[ x' ]   [ 1  0  0  tx ] [ x ]
[ y' ] = [ 0  1  0  ty ] [ y ]
[ z' ]   [ 0  0  1  tz ] [ z ]
[ w' ]   [ 0  0  0  1  ] [ w ]
```

The **fourth column** `(tx, ty, tz, 1)` is the translation — now moves are matrix multiplies too.

---

## Points carry w=1, vectors carry w=0

The fourth coordinate `w` distinguishes a **position** from a **direction**:

- a **point** (a location) is `(x, y, z, 1)` — it lives somewhere
- a **vector** (a direction / displacement) is `(x, y, z, 0)` — it only points

In the multiply the translation column is scaled by `w`: it **moves points** (`w=1`), **leaves vectors alone** (`w=0`).

---

## Numeric check: move a point, not a vector

Take `T` = translate by `(2, 0, 0)`. Apply it to a point at the origin and to the x-direction:

```text
point  (0,0,0, w=1):  T · (0,0,0,1) = (0+2, 0, 0, 1) = (2, 0, 0)   moved
vector (1,0,0, w=0):  T · (1,0,0,0) = (1+0, 0, 0, 0) = (1, 0, 0)   unchanged
```

The point slid over by 2; the direction did not budge. **The `w=0` killed the translation column** — one line of arithmetic proves the convention.

---

## Reading a TRS matrix by eye

A transform built as **translate · rotate · scale** stores all three parts in plain sight:

```text
[ R00*sx  R01*sy  R02*sz  tx ]     cols 0-2 : rotated axes, each SCALED
[ R10*sx  R11*sy  R12*sz  ty ]                by that axis's scale factor
[ R20*sx  R21*sy  R22*sz  tz ]     col  3   : the translation (tx,ty,tz)
[   0       0       0     1  ]     bottom   : always (0,0,0,1) for affine
```

- **column 3** is the position — read the translation straight off
- **each of columns 0–2** is a rotated axis, its length = that axis's scale
- **bottom row** `(0,0,0,1)` marks it affine (a `perspective` matrix breaks this)

---

### Part 2 · Composition & order

<small>(~25 min)</small>

---

## Composing transforms = multiplying matrices

Want to do transform `A`, then transform `B`? **Multiply** their matrices. But watch the side:

```text
first A, then B   ->   M = B · A          (B on the LEFT)
```

Applied to a point: `M·p = B·(A·p)` — the matrix **nearest the point acts first**. You read a product **right-to-left**.

---

## Order is not free: T·R vs R·T

Same two factors, two orders, two different results:

- **`T·R`** — rotate first, then translate: spin in place, **then** carry the object to its spot
- **`R·T`** — translate first, then rotate: shove it out, **then** swing it around the origin (it sweeps an arc)

Rotation and translation **do not commute**. `T·R ≠ R·T`. We will build both by hand, then watch them live.

---

## Worked: T·R (rotate, then translate)

Let `T` = translate `(1.5, 0, 0)` and `R` = `R_y(60)` (`cos60 = 0.5`, `sin60 = 0.866`). Multiply `T · R`:

```text
        [ 0.5    0   0.866 ]                     [ 0.5    0   0.866  1.5 ]
R_y(60)=[ 0      1   0     ]     T·R  =          [ 0      1   0      0   ]
        [-0.866  0   0.5   ]                     [-0.866  0   0.5    0   ]
                                                 [ 0      0   0      1   ]
```

The rotation block is **untouched**; the translation column is exactly `(1.5, 0, 0)`. Rotating first, then translating, just drops the move into column 3.

---

## Worked: R·T (translate, then rotate)

Same `T` and `R`, opposite order — `R · T`:

```text
              [ 0.5    0   0.866  0.75  ]
R·T  =        [ 0      1   0      0     ]
              [-0.866  0   0.5   -1.30  ]
              [ 0      0   0      1     ]
```

The rotation block is the **same** — but the translation column is now `(0.75, 0, -1.30)`, **not** `(1.5, 0, 0)`. The rotation got applied **to the translation too**, swinging `(1.5, 0, 0)` around by `60°`.

---

## The order sandbox

One **model** — `{tx, ry}` — builds two cubes from the **same** `T` and `R`, multiplied in **opposite orders**:

- the **left** cube is `T·R`; the **right** cube is `R·T`
- slide `tx` and `ry` and watch: left spins in place and slides over; right sweeps an arc
- the panels below print `T·R`, `R·T`, and the two factors `T`, `R` — compare column 3

---

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

### Part 3 · Inverses

<small>(~20 min)</small>

---

## The inverse undoes the transform

If `M` moves the world one way, `M⁻¹` moves it **back** — `M⁻¹ · M = I`, the identity. You reach for inverses to go from **world space back into an object's own space** (Part 4), and to build the **view matrix** (the camera's inverse, S06).

For a product, the inverse **reverses the order**: `(A·B)⁻¹ = B⁻¹ · A⁻¹`.

---

## Inverting T, R, S one at a time

Each basic transform has an obvious undo:

```text
translate by t      ->  translate by -t
rotate by R         ->  rotate the other way = R^T   (R is orthonormal, so R^-1 = R^T)
scale by (sx,sy,sz) ->  scale by (1/sx, 1/sy, 1/sz)
```

The rotation case is the gift: a rotation matrix is **orthonormal** (its columns are unit and mutually perpendicular), so its inverse is just its **transpose** — no division, no trig.

---

## The rigid inverse: R^T and −R^T t

A **rigid** transform (rotation + translation, no scale) is `M = T · R`. Invert with the reversal rule:

```text
M^-1 = (T·R)^-1 = R^-1 · T^-1 = R^T · T(-t)
```

Multiplying it out, the closed form is:

```text
        [        |        ]      top-left 3x3  =  R^T   (rotation, transposed)
M^-1 =  [   R^T  | -R^T t ]      column 3      =  -R^T t
        [        |        ]
        [ 0  0  0     1    ]
```

No general inversion needed — a transpose and one matrix-vector product.

---

## Worked: verify M · M⁻¹ = I

Take `M = T(2,0,0) · R_y(90)`. Since `R_y(90)` sends x-axis to `-z`, `M` is:

```text
      [ 0   0   1   2 ]                    [ 0   0  -1   0 ]
M  =  [ 0   1   0   0 ]      M^-1  =  R^T = [ 0   1   0   0 ]  , col3 = -R^T t
      [-1   0   0   0 ]        of R_y(90):  [ 1   0   0  -2 ]
      [ 0   0   0   1 ]                     [ 0   0   0   1 ]
```

Check `-R^T t` with `t = (2,0,0)`: `R^T t = (0,0,2)`, so `-R^T t = (0,0,-2)` — column 3 above. Multiply `M · M⁻¹` and every entry lands on the identity.

---

## Real code: the inverse chain, spelled out

Sung's `InverseTransform` builds `T⁻¹`, `R⁻¹`, `S⁻¹` separately and chains them:

```csharp [1-8]
// inverse translation: negate the position
Matrix4x4 invT = Matrix4x4.Translate(-RefBlueTree.localPosition);
// inverse rotation: same axis, negated angle
float rotAngle; Vector3 rotAxis;
RefBlueTree.localRotation.ToAngleAxis(out rotAngle, out rotAxis);
Matrix4x4 invR = Matrix4x4.Rotate(Quaternion.AngleAxis(-rotAngle, rotAxis));
// inverse scale: reciprocate each factor (assuming no zeros!)
Matrix4x4 invS = Matrix4x4.Scale(new Vector3(1/s.x, 1/s.y, 1/s.z));
```

<small>XformLoader.cs — 4.6.InverseTransform. Undo order is `invS · invR · invT` (reverse of `T·R·S`).</small>

---

### Part 4 · Pivots and spaces

<small>(~25 min)</small>

---

## Rotate about a pivot, not the origin

`R_y` spins about the **origin**. But you usually want to spin about **some other point** `p` — a doorknob, a joint, an object's own center.

The move: bring `p` to the origin, rotate, send it back.

```text
1. T(-p)   translate so the pivot sits at the origin
2. R       do the rotation (now centered correctly)
3. T(p)    translate back to where the pivot was
```

Composed (right-to-left, pivot-to-origin first): `M = T(p) · R · T(-p)`.

---

## Worked: pivot at (2,0,0), rotate 90° about y

Let `p = (2, 0, 0)` and `R = R_y(90)`. Build `M = T(p) · R · T(-p)`:

```text
      [ 0   0   1   2 ]      Check the three key points:
M  =  [ 0   1   0   0 ]        pivot   (2,0,0) -> (2, 0,  0)   FIXED
      [-1   0   0   2 ]        (3,0,0) -> (2, 0, -1)   +x of pivot swings to -z
      [ 0   0   0   1 ]        (2,0,1) -> (3, 0,  0)   +z of pivot swings to +x
```

The pivot `(2,0,0)` **does not move** — that is the whole point of a pivot. Its neighbors swing around it on a `90°` arc.

---

## Object space vs world space

Every object has its **own** coordinate frame:

- **object (local) space** — relative to the object's own origin and axes; the mesh's vertices live here
- **world space** — the shared scene frame everything is placed into

The **model matrix** `M` is the bridge: `p_world = M · p_object`. The other way — world back into the object's frame — is `p_object = M⁻¹ · p_world` (Part 3's inverse).

---

## Unity: localPosition vs position

Unity exposes both frames on every `Transform`:

- **`transform.localPosition`** — in the **parent's** space (object space if no parent)
- **`transform.position`** — in **world** space
- `Matrix4x4.TRS(...)` on the local T/R/S builds the **local** model matrix

The engine composes that local matrix up the parent chain to get world `position`.

---

## Real code: pivoted rotation

Sung's `PivotedScaleRotate` builds the sandwich exactly as we derived it:

```csharp [1-6]
// Pivot is an offset in object space
Matrix4x4 m = Matrix4x4.TRS(transform.localPosition,
                            transform.localRotation,
                            transform.localScale);
Matrix4x4 ipm = Matrix4x4.Translate(-PivotPosition);   // T(-p)
Matrix4x4 pm  = Matrix4x4.Translate( PivotPosition);   // T(p)
m = pm * m * ipm;                                      // T(p) · M · T(-p)
```

<small>XformLoader.cs — 4.7.PivotedScaleRotate. `pm * m * ipm` is the pivot sandwich, right-to-left.</small>

---

## The pipeline, stage by stage

How does the model matrix reach the screen? Sung's `451Shader` does it **explicitly**, one stage at a time:

```glsl [1-5]
// our own model->world matrix, uploaded from C# (Matrix4x4.TRS)
float4x4 MyXformMat;

o.vertex = mul(MyXformMat, v.vertex);      // object -> world (our TRS)
o.vertex = mul(UNITY_MATRIX_VP, o.vertex); // world -> view -> clip (camera)
```

Unity's shortcut `UnityObjectToClipPos(v)` folds **all** of this into one `MVP` multiply. Splitting it shows the stages: **model → world → view → projection**. S06 builds that `VP` half.

---

### Part 5 · This math in Sung's CDPs

<small>(~15 min)</small>

---

## Code, Demo, Practice

**CDP** — read real code, watch it run, rebuild it Thursday. Tonight's matrix projects:

- **4.4.CPU-TRS** — build T, R, S matrices by hand, upload to the shader
- **4.5.TSvsST** — the same two factors in both orders (Part 2, in Unity)
- **4.7.PivotedScaleRotate** — the pivot sandwich `T(p)·M·T(-p)` (Part 4)

All on Canvas; Thursday's studio pokes at them live.

---

## Real code: TSvsST — order in Unity

`4.5.TSvsST` builds one scale and one translate, then multiplies them **both** ways:

```csharp [1-9]
Matrix4x4 sm = Matrix4x4.Scale(s);        // scale
Matrix4x4 tm = Matrix4x4.identity;
tm[12] = p.x; tm[13] = p.y; tm[14] = p.z; // translate (col 3)

switch (mode) {
  case ScaleThenTranslate: cm = tm * sm; break;  // sm FIRST, then tm
  case TranslateThenScale: cm = sm * tm; break;  // tm FIRST, then sm
}
mMaterial.SetMatrix("MyXformMat", cm);
```

<small>XformLoader.cs — 4.5.TSvsST. `tm * sm` is scale-then-translate — the right-to-left rule from Part 2.</small>

---

## Real code: CPU-TRS — a matrix by hand

`4.4.CPU-TRS` writes each transform straight into the 16 entries — no helper:

```csharp [1-9]
Matrix4x4 m = Matrix4x4.identity;   // column-major
switch (mode) {
  case Translation:                 // col 3 = position
    m[12]=p.x; m[13]=p.y; m[14]=p.z; break;
  case Scale:                       // diagonal = scale factors
    m[0]=s.x; m[5]=s.y; m[10]=s.z;  break;
  case Rotate:                      // let SetTRS fill the rotation block
    m.SetTRS(Vector3.zero, q, Vector3.one); break;
}
mMaterial.SetMatrix("MyXformMat", m);
```

<small>XformLoader.cs — 4.4.CPU-TRS. `m[12..14]` is column 3; `m[0],m[5],m[10]` is the diagonal — exactly the layout from Part 1.</small>

---

## Matrices, one machine

- **A matrix is its columns** — images of the basis; column 3 is the translation
- **4×4 homogeneous** — `w=1` points translate, `w=0` vectors do not
- **Compose by multiplying**, right-to-left — `T·R ≠ R·T`, order is the operation
- **Invert** to undo and to change frames — rigid inverse is `R^T` and `-R^T t`
- **Pivots and spaces** — `T(p)·R·T(-p)` rotates about any point; `M` maps object to world

---

## The plan for Thursday

The Topic4 studio — walk and poke three real projects:

- **TSvsST** — flip scale-then-translate vs translate-then-scale; predict the divergence
- **PivotedScaleRotate** — change the pivot; predict where the fixed point lands
- **InverseTransform** — watch `M⁻¹·M` snap a copy back to the identity pose

Plus **MP3 lab time** — hands on your machine problem with the instructor circulating.

---

## Wrap

- **Thursday studio** — Topic4 CDP: **TSvsST**, **PivotedScaleRotate**, **InverseTransform**, plus **MP3 lab time**
- **MP3a goes out** — the next deliverable. *Details on Canvas.*

A matrix is a machine you read by its columns. Compose by multiplying — order is the operation — and invert to change frames.

