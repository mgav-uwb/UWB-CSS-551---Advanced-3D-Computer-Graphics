<!--
  CSS 551 · Lecture 6 (Session 6) — 3D viewing: view & projection matrices,
  from scratch. THE thesis session: we hand-build the two matrices every
  renderer uses to turn a placed 3D world into pixels — the camera's view
  matrix V and the perspective projection matrix P — and we build them the
  way this course insists, out of the vectors and matrices from S02-S05.

  reveal.js: FLAT deck — every slide is a top-level "---" section (no vertical
  "--" stacks). Keeps the verify-deck harness's demo probe correct (it selects
  "section.present [data-demo]"; inside a vertical stack that would match a
  demo on a not-yet-shown sibling slide, 0x0 -> pixel probe times out). Flat =
  one section per slide = demo only matched when shown. Notes follow "Note:".

  Real C# excerpts are from Kelvin Sung's CSS 451 ClassExamples,
  Topic6-3DViewing (6.8.OurOwnProjMatrix/.../CameraMatrices.cs — the five-mode
  ViewMatrixMode enum incl. ComputeFromScratch and ViewMatrixWrong, plus the
  Shader.SetGlobalMatrix upload; 6.4.DrawCameraFrustum — the closed-form
  frustum corners; 6.3.Tumble/CameraManipulation — the orbit). These are the
  CDP projects students run in Thursday's studio (lab06).

  MATH IS PLAIN TEXT ON PURPOSE. This shell loads NO KaTeX plugin (only
  markdown/highlight/notes), so "$...$" would render literally. All formulas
  are unicode plain text (−, ·, ×, →, ≤, ⁻¹) or fenced ```text blocks, like
  S01-S05. Never two "_" on one markdown line OUTSIDE a code fence (they pair
  into <em> and shred the line): in prose AND speaker notes ALWAYS backtick
  names with underscores. Matrices inside ```text fences are safe. No <small>
  on math. NO forward / "next time" references anywhere — not even in the wrap.

  TWO DEMOS, each on its own slide (flat), each with the scoped-CSS cap:
   - Part 1: data-demo="view-matrix" data-controls="az,el,dist". Fallback
     shows the HAND-VERIFIED V at defaults (az=35, el=20, dist=7; at=(0,0.5,0),
     up=(0,1,0)) — rows u,v,w with the −dot(·,eye) translation column, 2
     decimals, matching the Mat4Panel.
   - Part 3: data-demo="projection" data-controls="fov,near". Fallback carries
     P at defaults (fov 45, aspect 1.78, near 1, far 8) plus the marked-point
     NDC line ((0.00, 0.00, 0.02) → INSIDE).
  Both recomputed via node against lib/core/xform.js (lookAtBasis, perspective,
  matMul, applyMat4, perspectiveDivide). See README for the exact digits.

  Session plan (120 min, Tue 5:45-7:45 PM synchronous online). Sums to ~110 + buffer.
    0:00  Intro (title + tonight)                     ~2 min
    0:02  Part 1  The camera is a frame               20 min  (eye/at/up → w,u,v; view-matrix demo)
    0:22  Part 2  The view matrix                     20 min  (rows = basis, translation = −basis·eye; worked V at defaults; ViewMatrixWrong)
    0:42  Part 3  Projection                          30 min  (pinhole + similar triangles → divide; P anatomy; projection demo; ortho contrast)
    1:12  Part 4  The full chain                      20 min  (model→world→view→clip→NDC→screen; ComputeFromScratch + Wrong + SetGlobalMatrix)
    1:32  Part 5  Manipulating the camera             15 min  (tumble/track/dolly as frame ops; DrawCameraFrustum; MP5)
    1:47  Wrap                                         5 min  (Thu CameraMatrices studio; MP4 due; MP5 out — Canvas)
    1:52  end (+ buffer)
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 6 — 3D Viewing: View & Projection Matrices, from Scratch**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>

---

## Tonight

- The **camera is a frame** — `eye`, `at`, `up` → an orthonormal basis `w`, `u`, `v`
- The **view matrix** `V` puts the world in that frame: rows = basis, translation = −basis·`eye`
- **Projection** flattens depth by **dividing by it** — the perspective matrix `P`, entry by entry
- The **full chain**: model → world → view → clip → NDC → screen, all our own matrices
- **Moving the camera** — tumble/track/dolly — is just editing the frame

---

### Part 1 · The camera is a frame

<small>(~20 min)</small>

---

## Place the eye

Five sessions put objects **in the world**: vectors, rotations, the 4×4 matrix, hierarchies of them. A rendered image needs one more thing — a **viewer**. Where do we stand, and which way do we look?

- a **position** in the world — where the camera sits
- a **direction** — what it aims at
- an **orientation** — which way is up

Answer those three and the camera is fully pinned down.

---

## eye, at, up

The standard way to aim a camera, and the one Sung's projects use:

- `eye` — the camera's **position** in world space
- `at` — the **point it looks at** (the target)
- `up` — a rough **up direction** (usually world +Y)

```text
        up ↑
           |        · at   (the target)
           |       /
         eye ●————/        (the camera, looking toward at)
```

`up` only has to be **roughly** up; a cross product straightens it into the camera's axes.

---

## Building the camera's axes

We want three perpendicular unit axes fixed to the camera: `u` (right), `v` (up), `w` (backward). Build them in order with cross products (S02):

```text
   w = normalize(eye − at)        points from the target back toward the eye
   u = normalize(up × w)          right = rough-up × backward
   v = w × u                      true up = backward × right
```

Each cross product yields a vector **perpendicular** to its two inputs — so `u`, `v`, `w` come out **mutually orthogonal** and, after normalizing, **unit length**.

---

## Why w points back

It looks backwards that `w = eye − at` (target-to-eye), not `at − eye`. Two reasons, worth stating once:

- the camera looks down its **−`w`** axis, so "forward" is negative — matching how projection expects the view direction to be **−z**
- it keeps `u`, `v`, `w` a **right-handed** frame, same chirality as the world

---

## Meet the demo: orbit the eye

The `view-matrix` demo is a hand-built camera. One **model** — `{az, el, dist}` — places the `eye` on a sphere around the target and rebuilds `w`, `u`, `v` every frame:

- **`az`** (azimuth) — swing the eye **around** the target horizontally
- **`el`** (elevation) — raise or lower the eye
- **`dist`** — move the eye **toward / away** from the target; the panel prints the view matrix `V`

---

## The camera, live

<div class="cockpit" data-demo="view-matrix" data-controls="az,el,dist"><pre class="viz-fallback">  model {az, el, dist} → eye on a sphere → w,u,v via cross products → V
  -- default: az = 35°, el = 20°, dist = 7  (at = (0, 0.5, 0), up = (0,1,0)) --
     eye = (3.77, 2.89, 5.39)
     panel shows the view matrix V (rows u, v, w; right column = −basis·eye):
        [  0.82   0.00  -0.57   0.00 ]   ← u (right),  −u·eye = 0.00
        [ -0.20   0.94  -0.28  -0.47 ]   ← v (up),     −v·eye = −0.47
        [  0.54   0.34   0.77  -7.17 ]   ← w (back),   −w·eye = −7.17
        [  0.00   0.00   0.00   1.00 ]</pre></div>

---

### Part 2 · The view matrix

<small>(~20 min)</small>

---

## What the view matrix does

Objects live in **world** space. The camera renders whatever lands in **its own** frame. The view matrix `V` is the change of coordinates:

```text
   p_view = V · p_world
```

It takes a world point and re-expresses it in the camera's frame — `eye` at the origin, looking down −`w`. Everything the camera "sees" is easiest to reason about once it is in this frame.

---

## Rows are the basis

To express a world vector in the camera's axes, **dot it with each axis**. That is what putting the axes in the **rows** of the rotation part does:

```text
           [ u_x  u_y  u_z ]
   R =     [ v_x  v_y  v_z ]        (rows = u, v, w)
           [ w_x  w_y  w_z ]
```

Then `R · d` = ( `u`·`d`, `v`·`d`, `w`·`d` ) — the components of `d` along the camera's right, up, and back axes. The rotation part of `V` is just the basis, **as rows**.

---

## Translation is −basis·eye

`V` must also move the `eye` to the origin. A world point `p` becomes, in camera coordinates:

```text
   p_view = R · (p − eye) = R·p − R·eye
```

So the translation column is **−R·eye** = ( −`u`·`eye`, −`v`·`eye`, −`w`·`eye` ). Rotate first, then subtract the eye's coordinates in the rotated frame:

```text
        [ u_x  u_y  u_z  −u·eye ]
   V =  [ v_x  v_y  v_z  −v·eye ]
        [ w_x  w_y  w_z  −w·eye ]
        [  0    0    0     1    ]
```

---

## Worked: V at the demo's defaults

Same camera as the demo (az=35°, el=20°, dist=7), so `eye = (3.77, 2.89, 5.39)`, `at = (0, 0.5, 0)`. Build the basis:

```text
   w = normalize(eye − at) = ( 0.54,  0.34,  0.77 )
   u = normalize(up × w)   = ( 0.82,  0.00, −0.57 )
   v = w × u               = (−0.20,  0.94, −0.28 )
```

Each is unit length; each pair dots to ≈ 0. These three vectors are the top-left 3×3 of `V`, one per row.

---

## Worked: the translation column

Dot each axis with `eye` and negate (4-dec operands below; panel rounds to 2):

```text
   −u·eye = −(0.8192·3.7729 + 0.0000·2.8941 + −0.5736·5.3883) =  0.00
   −v·eye = −(−0.1962·3.7729 + 0.9397·2.8941 + −0.2802·5.3883) = −0.47
   −w·eye = −(0.5390·3.7729 + 0.3420·2.8941 + 0.7698·5.3883)   = −7.17
```

```text
   V = [  0.82   0.00  −0.57   0.00 ]
       [ −0.20   0.94  −0.28  −0.47 ]
       [  0.54   0.34   0.77  −7.17 ]
       [  0.00   0.00   0.00   1.00 ]
```

Every entry matches the demo panel — because the demo runs this exact arithmetic.

---

## The wrong view matrix

Sung's `CameraMatrices` includes a mode `ViewMatrixWrong` — deliberately broken, "just to show ourselves we are actually doing something":

```text
   V_wrong = [ 1  0  0  −eye_x ]     rotation = IDENTITY
             [ 0  1  0  −eye_y ]     (the basis is thrown away)
             [ 0  0  1  −eye_z ]
             [ 0  0  0    1    ]
```

It still translates the eye to the origin, but **never rotates** the world into the camera's axes. Swing `at` and the view **does not turn** — the camera always faces world −z.

---

### Part 3 · Projection

<small>(~30 min)</small>

---

## The pinhole camera

How does a 3D world become a flat image? The oldest answer is a **pinhole**: light passes through a single point onto a plane behind it.

```text
   world          pinhole        image plane
     · P              |               |
      \               |         P' ·  |
       \              |          /    |
        ●─────────────●─────────/─────
       /              |        /      |
      · Q             |    Q' ·       |
```

Objects **farther away project smaller** — why railroad tracks converge. That shrink-with-distance is **perspective**: one operation, dividing by depth.

---

## Similar triangles → divide by depth

Put the eye at the origin looking down −z, with a projection plane at distance `d`. A point at camera-space (x, y, z) — with z **negative** (in front) — projects by similar triangles:

```text
       x'      x                    x                     y
      ─── = ─────      →    x' = d·───      and    y' = d·───
       d     −z                    −z                    −z
```

Divide the position by its **depth** (−z). Double the depth, halve the projected size — foreshortening, exactly.

---

## NDC: the canonical cube

A matrix cannot divide — matrix-times-vector only multiplies and adds. The trick: put the depth into the **4th coordinate** `w'`, then let the pipeline divide by it. The result lands in **normalized device coordinates**:

```text
   after the divide, visible points satisfy:
       −1 ≤ x_ndc ≤ 1        (left / right)
       −1 ≤ y_ndc ≤ 1        (bottom / top)
       −1 ≤ z_ndc ≤ 1        (near / far)
```

NDC is a **canonical cube**: whatever the fov, aspect, near, or far, the visible region is always this 2×2×2 box. Anything outside is clipped.

---

## The projection demo

The `projection` demo shows a **camera frustum** from the outside — the truncated pyramid a fixed subject camera can see — while you drive its projection:

- **`fov`** — vertical field of view; widen it and the pyramid **flares**
- **`near`** — near clipping plane; push it out and it **slices** close objects away
- boxes **inside** stay bright, boxes **outside** dim; the panel prints `P` and the marked box's **NDC**, live

---

## The frustum, live

<div class="cockpit" data-demo="projection" data-controls="fov,near"><pre class="viz-fallback">  subject camera eye=(4,3,6), at=(0,0.5,0); sliders drive its P
  -- default: fov = 45°, aspect = 1.78, near = 1, far = 8 --------------------
     P = perspective(fov, aspect, near, far) =
        [ 1.36   0.00   0.00   0.00 ]
        [ 0.00   2.41   0.00   0.00 ]
        [ 0.00   0.00  −1.29  −2.29 ]
        [ 0.00   0.00  −1.00   0.00 ]
     marked box NDC [x, y, z] = (0.00, 0.00, 0.02)  →  INSIDE the frustum
     drag near past ~1.8 and it flips OUTSIDE; at near=2.5 the readout shows (0.00, 0.00, −2.13)</pre></div>

---

## Anatomy of P, entry by entry

Our `perspective(fov, aspect, near, far)` in `lib/core/xform.js`, with `f = 1 / tan(fov / 2)`:

```text
        [ f/aspect    0             0                    0          ]
   P =  [    0        f             0                    0          ]
        [    0        0    (far+near)/(near−far)   2·far·near/(near−far) ]
        [    0        0            −1                    0          ]
```

- **f/aspect, f** — scale x and y so the fov and screen shape fit the ±1 box
- **row 2** — remaps z (near, far) into NDC depth [−1, 1]
- **the −1** — copies −z into `w'`, so the divide **is** the divide-by-depth

---

## Worked: P and a marked point

At the defaults, `f = 1/tan(22.5°) = 2.41`, `f/aspect = 1.36`, and the z-row is `9/(−7) = −1.29`, `16/(−7) = −2.29` (the panel's `P`).

The marked box sits **1.8 units** in front of the subject eye, on-axis. Push it through `P·V` and divide:

```text
   NDC = (0.00, 0.00, 0.02)   →   inside (all |components| ≤ 1)
```

Its NDC z is barely positive — it sits **just past the near plane**. Slide `near` out to 2.5 and z → −2.13 — **clipped**.

---

## Orthographic projection

Not every projection has perspective. An **orthographic** projection drops the depth divide entirely — parallel lines stay parallel, size does **not** change with distance:

```text
   perspective:  w' = −z   →   divide by depth   →   far things shrink
   orthographic: w' = 1    →   no divide          →   size is constant
```

Sung's `CameraMatrices` offers both via a `ProjectionMatrix` enum (`Perspective` / `Orthographics`, via `Matrix4x4.Ortho`). Orthographic is what CAD and 2D-style games use — measurements you can trust off the screen.

---

### Part 4 · The full chain

<small>(~20 min)</small>

---

## The full chain, in our names

Every vertex takes the same trip. Here it is, with **our own** matrix names on each arrow:

```text
   object      model       world      view       clip        NDC       screen
   vertex  ──────────▶  point  ────────▶  point  ────────▶  point  ──────▶  pixel
            makeTRS /            V =                P =          ÷ w'       viewport
            matMul chain      lookAtBasis        perspective  (divide)     scale
            (S04/S05)                                          by depth
```

Model (S04/S05) places it in the world; `V` re-expresses it in the camera's frame; `P` then the perspective divide gives NDC; the viewport scales NDC's ±1 box to pixels.

---

## ComputeFromScratch: the view matrix in C#

Sung's `CameraMatrices.ComputeFromScratch` builds `V`'s rotation exactly as we did — cross products, then `SetRow`:

```csharp [1-8]
case ViewMatrixMode.ComputeFromScratch:
    Vector3 V = -transform.forward;   // the backward axis (our w)
    Vector3 U = transform.up;         // the up vector
    Vector3 W = Vector3.Cross(V, U);  // right = back × up
    U = Vector3.Cross(W, V);          // straighten up = right × back
    r.SetRow(0, W.normalized);        // rows ARE the basis
    r.SetRow(1, U.normalized);
    r.SetRow(2, V.normalized);
    break;
```

<small>CameraMatrices.cs — 6.8.OurOwnProjMatrix. `SetRow` of the three axes = our "rows are the basis".</small>

---

## ...and the wrong one, for contrast

The same file's `ViewMatrixWrong` case is **empty** — that is the whole point:

```csharp [1-4]
case ViewMatrixMode.ViewMatrixWrong:
    // this is to show we are doing something @
    break;   // r stays Matrix4x4.identity — no basis, no rotation
```

The rotation stays identity, so the camera never turns to face `at`. Flip between `ComputeFromScratch` and `ViewMatrixWrong` in the studio and the difference **is** the cross products.

---

## SetGlobalMatrix: feeding your own matrices

Once `V` and `P` are built by hand, they are shipped to the shader — the student's OWN matrices replace the engine's:

```csharp [1-6]
Matrix4x4 t = Matrix4x4.TRS(-transform.position, Quaternion.identity, Vector3.one);
Matrix4x4 u = r * t;                          // V = R · T(−eye), Part 2's structure
Shader.SetGlobalMatrix("CameraViewMatrix", u);

Matrix4x4 p = Matrix4x4.Perspective(c.fieldOfView, c.aspect, c.nearClipPlane, c.farClipPlane);
Shader.SetGlobalMatrix("CameraProjMatrix", p);   // our P, uploaded by hand
```

<small>CameraMatrices.cs — 6.8. `r * t` is exactly `R · T(−eye)`; the two `SetGlobalMatrix` calls hand the shader OUR view and projection.</small>

---

### Part 5 · Manipulating the camera

<small>(~15 min)</small>

---

## Camera controls

Every camera control — orbit, pan, zoom — is an **edit to `eye`, `at`, or `up`**; then `V` is rebuilt. Three classic moves, all just where you put the inputs before `lookAtBasis`:

- **tumble** (orbit) — swing `eye` around `at` on a sphere → the demo's **`az`**, **`el`**
- **track** (pan) — slide `eye` **and** `at` together → the frame shifts sideways
- **dolly** — move `eye` toward / away from `at` → the demo's **`dist`**

---

## Tumble, in Sung's code

`6.3.Tumble`'s `CameraManipulation` orbits the camera about the target by rotating the `eye` position around the pivot, then re-aiming:

```csharp [1-6]
// orbit about the target's frame, then look back at it
Quaternion q = Quaternion.AngleAxis(Direction * RotateDelta, transform.right);
Matrix4x4 r = Matrix4x4.Rotate(q);
Matrix4x4 invP = Matrix4x4.TRS(-LookAtPosition.localPosition, Quaternion.identity, Vector3.one);
r = invP.inverse * r * invP;                    // pivot sandwich (S05) about the target
transform.localPosition = r.MultiplyPoint(transform.localPosition);   // move the eye
```

<small>CameraManipulation.cs — 6.3.Tumble. A pivot sandwich rotates `eye` around the target; then the camera re-aims at it.</small>

---

## Drawing the frustum you now understand

`6.4.DrawCameraFrustum` draws the truncated pyramid with the **exact** corner formula from Part 3 — the same one our demo uses:

```csharp [1-5]
float tanFOV = Mathf.Tan(Mathf.Deg2Rad * 0.5f * c.fieldOfView);
float nearPlaneHeight = 2f * c.nearClipPlane * tanFOV;   // = 2·near·tan(fov/2)
float nearPlaneWidth  = c.aspect * nearPlaneHeight;      // width = aspect · height
Vector3 nearPlaneCenter = eye + c.nearClipPlane * transform.forward;
// far plane the same with farClipPlane; connect the 8 corners with line segments
```

<small>CameraManipulation_DrawFrustum.cs — 6.4. Corner height `2·near·tan(fov/2)`; our `projection` demo builds its wireframe identically.</small>

---

## MP5: camera manipulation

**MP5** is the **camera manipulation machine problem** — interactive camera controls built on tonight's frame math.

- the moves are the ones we just named — **tumble, track, dolly** — as edits to `eye`, `at`, `up`
- rebuild `V` from the edited frame each time, exactly `lookAtBasis`

Requirements, deliverables, due date, and points are **on Canvas** — the single source of truth.

---

## 3D viewing, one idea

- A camera is a **frame**: `eye`, `at`, `up` → orthonormal `w`, `u`, `v` by cross products
- The **view matrix** `V` puts the world in that frame: **rows = basis**, translation = **−basis·eye**
- **Projection** flattens depth by **dividing by it**; `P`'s −1 row makes `w' = −z`
- The **full chain** is model → world → `V` → `P` → divide → screen — every arrow ours
- **Moving the camera** is editing the frame; `V` is rebuilt — nothing new

---

## Thursday: the studio

The **CameraMatrices studio** — poke `6.8.OurOwnProjMatrix`, all **five** view-matrix modes live:

- switch the four correct modes and predict each — same view, four routes
- break it: flip to **`ViewMatrixWrong`** and predict what "wrong" looks like first
- **MP5 kickoff** — start the camera-manipulation machine, instructor circulating

---

## Wrap

- **Thursday studio** — CameraMatrices CDP: all five `ViewMatrixMode` modes live (incl. breaking it with `ViewMatrixWrong`)
- **MP4 due**; **MP5 goes out** — the camera-manipulation machine. *Details on Canvas.*

A camera is a frame plus a lens. The view matrix puts the world in the frame; projection divides by depth. Both are matrices you built yourself tonight.

