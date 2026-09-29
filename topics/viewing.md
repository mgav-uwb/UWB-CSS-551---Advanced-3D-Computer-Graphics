<!--
  CSS 551 · TOPIC DECK: Viewing: the camera frame, the view matrix, projection, the chain (~88 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/viewing.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES: a camera is a frame (eye, at, up to w, u, v by cross products); the view matrix as rows of the
  basis and translation -basis·eye, worked at the demo's defaults, the "wrong" identity-rotation view, the
  pole failure of lookAt; the pinhole and the divide by depth; field of view and focal length; the
  projection matrix entry by entry, worked on a marked point with near-plane clipping; NDC depth is not
  linear and what a depth buffer can resolve (the near-plane pitfall); the full chain for one vertex
  from object space to a pixel; frustum planes and culling; orthographic projection; camera moves
  (tumble, track, dolly) as frame edits, the dolly worked; Sung's CameraMatrices, Tumble and
  DrawCameraFrustum code.
  NEEDS:   the vectors topic (a frame from two vectors), the affine topic (rigid inverse, block product),
           the scene-graphs topic (the camera as a node) helps but is not required.
  DEMOS:   data-demo="view-matrix" data-controls="az,el,dist" and data-demo="projection" data-controls="fov,near",
           each on its own slide under the lecture page's crop rules.
           view-matrix fallback at az=35, el=20, dist=7, at=(0,0.5,0), up=(0,1,0): rows (0.82,0,-0.57,0),
           (-0.20,0.94,-0.28,-0.47), (0.54,0.34,0.77,-7.17). projection fallback at fov 45, aspect 1.78,
           near 1, far 8: P rows (1.36,0,0,0), (0,2.41,0,0), (0,0,-1.29,-2.29), (0,0,-1,0); marked box NDC
           (0,0,0.02), and (0,0,-2.13) at near 2.5.
  NUMBERS: textbook/figures/numbers-pipeline.json, key view (eye, u, v, w, V, wrong, P, mark, depths, fov,
           depthPrecision, chain, viewport, frustum, pole, ortho) and lib/core/xform.js (lookAtBasis, perspective).
  FIGURES: ../../textbook/figures/view-*.svg (tools/gen-textbook-figures-pipeline.mjs).
  SOURCE:  converted 2026-09-29 (Plan C) from sessions/S06-3d-viewing/L06-3d-viewing.md (Plan B's lecture 6):
           logistics and the machine-problem slide removed; the pole, field of view, depth precision, the
           one-vertex chain, frustum culling and the dolly added from the textbook chapter. Real C# excerpts
           are from Kelvin Sung's CSS 451 ClassExamples, Topic6-3DViewing (6.8.OurOwnProjMatrix CameraMatrices.cs,
           6.3.Tumble CameraManipulation.cs, 6.4.DrawCameraFrustum).

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Paths are relative to
  the lecture page that mounts this topic.
-->

### Viewing: the camera, the view matrix, and projection

<small>(~88 min)</small>


---

### The camera is a frame

<small>(~14 min)</small>

---

## Place the eye

A rendered image needs a **viewer**. Three things pin a camera down:

- a **position** in the world: where the camera sits
- a **direction**: what it aims at
- an **orientation**: which way is up


---

## eye, at, up

- `eye`: the camera's **position** in world space
- `at`: the **point it looks at**
- `up`: a rough **up direction** (usually world +Y); a cross product straightens it

<img src="../../textbook/figures/view-frame.svg" alt="eye, at, up and the camera axes u, v, w" style="height:260px">


---

## Building the camera's axes

Three perpendicular unit axes fixed to the camera, `u` (right), `v` (up), `w` (backward):

```text
   w = normalize(eye − at)        from the target back toward the eye
   u = normalize(up × w)          right = rough up × backward
   v = w × u                      true up = backward × right
```

Each cross is **perpendicular** to its inputs, so `u`, `v`, `w` come out **orthonormal**. This is the vectors lecture's "two vectors, a whole frame".


---

## Why w points back

`w = eye − at` looks backward. Two reasons:

- the camera looks down **−w**, matching the projection's assumption that visible points have **negative z**
- it keeps `u`, `v`, `w` **right-handed**, the same chirality as the world


---

## The camera, live

The `view-matrix` demo: the model `{az, el, dist}` places the eye on a sphere around `at = (0, 0.5, 0)` and rebuilds `w`, `u`, `v`; the panel prints `V`.

<div class="cockpit" data-demo="view-matrix" data-controls="az,el,dist"><pre class="viz-fallback">  model {az, el, dist} → eye on a sphere → w,u,v via cross products → V
  -- default: az = 35°, el = 20°, dist = 7  (at = (0, 0.5, 0), up = (0,1,0)) --
     eye = (3.77, 2.89, 5.39)
     panel shows the view matrix V (rows u, v, w; right column = −basis·eye):
        [  0.82   0.00  -0.57   0.00 ]   ← u (right),  −u·eye = 0.00
        [ -0.20   0.94  -0.28  -0.47 ]   ← v (up),     −v·eye = −0.47
        [  0.54   0.34   0.77  -7.17 ]   ← w (back),   −w·eye = −7.17
        [  0.00   0.00   0.00   1.00 ]</pre></div>


---

### The view matrix

<small>(~16 min)</small>

---

## What the view matrix does

```text
   p_view = V · p_world
```

`V` re-expresses a world point in the camera's frame: `eye` at the origin, looking down −w. It is **rigid**, a rotation and a translation, no scale.


---

## Rows are the basis; translation is −basis·eye

To express a world point in the camera's axes: subtract the eye, then **dot with each axis**:

```text
   p_view = R (p − eye) = R p − R eye

        [ u_x  u_y  u_z  −u·eye ]
   V =  [ v_x  v_y  v_z  −v·eye ]          rows = u, v, w
        [ w_x  w_y  w_z  −w·eye ]
        [  0    0    0     1    ]
```

This is the rigid inverse `[Rᵀ | −Rᵀ t]` of the camera's placement: the view matrix is the **inverse of the camera's pose**.


---

## Worked: V at the demo's defaults

`eye = (3.773, 2.894, 5.388)`, `at = (0, 0.5, 0)`, `up = (0, 1, 0)`:

```text
   eye − at = (3.773, 2.394, 5.388), length 7.000   ->  w = (0.539, 0.342, 0.770)
   up × w   = (0.770, 0, −0.539)                     ->  u = (0.819, 0, −0.574)
   w × u                                             ->  v = (−0.196, 0.940, −0.280)

   −u·eye = −(0.819·3.773 + 0 − 0.574·5.388)             =  0.00
   −v·eye = −(−0.196·3.773 + 0.940·2.894 − 0.280·5.388) = −0.47
   −w·eye = −(0.539·3.773 + 0.342·2.894 + 0.770·5.388)  = −7.17
```

Every entry matches the panel, because the demo runs this arithmetic.


---

## The wrong view matrix

Sung's `CameraMatrices` ships a mode `ViewMatrixWrong`, "to show we are doing something":

```text
   V_wrong = [ 1  0  0  −3.77 ]     rotation = IDENTITY
             [ 0  1  0  −2.89 ]     the basis is thrown away
             [ 0  0  1  −5.39 ]
             [ 0  0  0    1   ]
```

It moves the eye to the origin but **never turns** the world: the camera always faces world −z, whatever `at` is.

```csharp
case ViewMatrixMode.ViewMatrixWrong:
    // this is to show we are doing something @
    break;   // r stays Matrix4x4.identity
```


---

## Pitfall: the pole

Raise the elevation toward 90° with `up = (0, 1, 0)`. `|up × w| = cos(el)`:

| elevation | length of `up × w` |
| --- | --- |
| 60° | 0.5 |
| 85° | 0.087 |
| 89° | 0.017 |
| 89.9° | 0.0017 |
| 90° | 0: no right axis at all |

`u` is recovered from a shrinking vector, then from nothing. Clamp the pitch (the course's orbit clamps at ±89.9°) or store orientation as a **quaternion**.


---

### Projection

<small>(~30 min)</small>

---

## The pinhole camera

<img src="../../textbook/figures/view-pinhole.svg" alt="rays through a pinhole: farther objects project smaller" style="height:260px">

Light through one point onto a plane: **farther projects smaller**. That is perspective, one operation: **divide by depth**.


---

## Similar triangles: divide by depth

Eye at the origin looking down −z, image plane at distance `d`. A point `(x, y, z)` with `z < 0`:

```text
   x' / d = x / (−z)      ->     x' = d · x / (−z)       y' = d · y / (−z)
```

Worked: `d = 1`, a point at height 2, depth 4: `y' = 1 · 2 / 4 = 0.5`. Double the depth, halve the height.


---

## Field of view and focal length

<img src="../../textbook/figures/view-fov-focal.svg" alt="focal length and field of view on a 36 by 24 mm sensor" style="height:200px">

| lens (36×24 mm sensor) | vertical fov | horizontal fov |
| --- | --- | --- |
| 14 mm | 81.2° | 104.3° |
| 29 mm, the demo's 45° | 45° | 72.8° at aspect 1.78 |
| 50 mm | 27.0° | 39.6° |
| 200 mm | 6.9° | 10.3° |


---

## NDC: the canonical cube

A matrix cannot divide. So put the depth into the **fourth coordinate**, `w' = −z`, and let the pipeline divide by it:

```text
   after the divide, visible points satisfy
       −1 ≤ x_ndc ≤ 1      −1 ≤ y_ndc ≤ 1      −1 ≤ z_ndc ≤ 1
```

Whatever the fov, aspect, near or far, the visible region becomes this **2×2×2 box**. Anything outside is clipped.


---

## Anatomy of P, entry by entry

`perspective(fov, aspect, near, far)`, `f = 1 / tan(fov/2)`:

```text
        [ f/aspect   0            0                        0              ]
   P =  [    0       f            0                        0              ]
        [    0       0   (far+near)/(near−far)   2·far·near/(near−far)    ]
        [    0       0           −1                        0              ]
```

- **f/aspect, f**: scale x and y so the field of view fits the ±1 box
- **row 2**: maps z = −near to −1 and z = −far to +1 after the divide
- **the −1**: copies −z into `w'`, so the divide **is** the divide by depth


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

## Worked: P and the marked point

fov 45°, aspect 1.78, near 1, far 8: `f = 2.414`, `f/a = 1.356`, `9/(−7) = −1.286`, `16/(−7) = −2.286`.

```text
   view space:    (0, 0, −1.8)                       on the sightline, 1.8 in front
   clip:          P (0, 0, −1.8, 1) = (0, 0, 0.029, 1.8)
   NDC:           divide by w' = 1.8  ->  (0, 0, 0.016)    inside, just past near (−1)
   near = 2.5:    NDC z = −2.13                             outside: clipped
```


---

## NDC depth is not linear

Same P (near 1, far 8):

| view z | −1 | −1.5 | −2 | −3 | −4 | −6 | −8 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| NDC z | −1 | −0.238 | 0.143 | 0.524 | 0.714 | 0.905 | 1 |

Half the NDC range, −1 to 0, is spent between depth 1 and about 1.8. Depth resolution is **concentrated near the eye**.


---

## Pitfall: what a depth buffer can resolve

near 0.1, far 1000: the smallest depth difference two surfaces need to be told apart:

| distance | 24-bit fixed | float32 | float32, reversed z |
| --- | --- | --- | --- |
| 1 | 6.0e-7 | 6.0e-7 | 7.5e-8 |
| 10 | 6.0e-5 | 6.0e-5 | 9.3e-7 |
| 100 | 0.006 | 0.006 | 5.8e-6 |
| 500 | 0.149 | 0.149 | 1.8e-5 |

At 100 m, surfaces closer than **6 mm** share a depth value: z-fighting. The step scales as `d²/near`: near = 0.001 makes it **100 times worse**.


---

## Orthographic projection

<img src="../../textbook/figures/view-ortho-persp.svg" alt="the same scene in perspective and orthographic projection" style="height:220px">

```text
   perspective:  w' = −z   ->  divide by depth   ->  far things shrink, parallels converge
   orthographic: w' = 1    ->  no divide         ->  size constant, parallels stay parallel
```


---

### The full chain

<small>(~18 min)</small>

---

## One vertex, object space to pixel

<img src="../../textbook/figures/view-chain.svg" alt="the chain of spaces from object to pixel" style="height:140px">

| stage | coordinates | by |
| --- | --- | --- |
| object | (0.5, 0.5, 0.5) | authored |
| world | (0.683, 1.000, 0.183) | `M = T(0, 0.5, 0) R_y(30°)` |
| view | (0.455, 0.285, −6.320) | `V` of the worked slide |
| clip | (0.616, 0.687, 5.840, 6.320) | `P`; note `w' = 6.32 = −z` |
| NDC | (0.098, 0.109, 0.924) | divide by `w'` |
| pixel | (702.7, 320.8), window depth 0.962 | viewport 1280×720 |


---

## ComputeFromScratch: V in C#

```csharp [1-8]
case ViewMatrixMode.ComputeFromScratch:
    Vector3 V = -transform.forward;   // the backward axis (our w)
    Vector3 U = transform.up;         // the up hint
    Vector3 W = Vector3.Cross(V, U);  // right (our u)
    U = Vector3.Cross(W, V);          // straightened up (our v)
    r.SetRow(0, W.normalized);        // rows ARE the basis
    r.SetRow(1, U.normalized);
    r.SetRow(2, V.normalized);
    break;
```

<small>CameraMatrices.cs, 6.8.OurOwnProjMatrix. Sung's letters differ: his V, W, U are our w, u, v.</small>


---

## SetGlobalMatrix: your matrices, in the shader

```csharp [1-6]
Matrix4x4 t = Matrix4x4.TRS(-transform.position, Quaternion.identity, Vector3.one);
Matrix4x4 u = r * t;                          // V = R · T(−eye)
Shader.SetGlobalMatrix("CameraViewMatrix", u);

Matrix4x4 p = Matrix4x4.Perspective(c.fieldOfView, c.aspect, c.nearClipPlane, c.farClipPlane);
Shader.SetGlobalMatrix("CameraProjMatrix", p);
```

<small>CameraMatrices.cs, 6.8. `r * t` is `R · T(−eye)`: rotate after moving the eye to the origin.</small>


---

## Frustum planes and culling

<img src="../../textbook/figures/view-frustum-planes.svg" alt="the six frustum planes and three test boxes" style="height:210px">

Six planes, from the rows of `P V`, each `n · p + d ≥ 0` inside. Near: `(−0.539, −0.342, −0.770, 6.171)`, normal = the view direction.

| box | verdict | deciding plane |
| --- | --- | --- |
| [−1,1] × [−0.5,1.5] × [−1,1] | straddles | far: one corner inside, one outside |
| [5.5,6.5] × [0,1] × [−0.5,0.5] | outside | right: even the most inside corner is at −1.127 |
| [−0.5,0.5] × [0,1] × [−8.5,−7.5] | outside | far |


---

### Moving the camera

<small>(~10 min)</small>

---

## Camera controls are frame edits

- **tumble** (orbit): swing `eye` around `at` on a sphere: the demo's `az`, `el`
- **track** (pan): slide `eye` and `at` together
- **dolly**: move `eye` along the sightline: the demo's `dist`

Worked dolly, distance 7 to 4: `eye' = at + 4w = (2.156, 1.868, 3.079)`. The basis is unchanged; only `−w·eye'` changes, from −7.17 to **−4.17**.


---

## Tumble, in Sung's code

```csharp [1-5]
Quaternion q = Quaternion.AngleAxis(Direction * RotateDelta, transform.right);
Matrix4x4 r = Matrix4x4.Rotate(q);
Matrix4x4 invP = Matrix4x4.TRS(-LookAtPosition.localPosition, Quaternion.identity, Vector3.one);
r = invP.inverse * r * invP;                    // pivot sandwich about the target
transform.localPosition = r.MultiplyPoint(transform.localPosition);   // move the eye
```

<small>CameraManipulation.cs, 6.3.Tumble. A pivot sandwich rotates the eye about the target; then the camera re-aims.</small>


---

## Drawing the frustum

```csharp [1-4]
float tanFOV = Mathf.Tan(Mathf.Deg2Rad * 0.5f * c.fieldOfView);
float nearPlaneHeight = 2f * c.nearClipPlane * tanFOV;   // 2·near·tan(fov/2)
float nearPlaneWidth  = c.aspect * nearPlaneHeight;
Vector3 nearPlaneCenter = eye + c.nearClipPlane * transform.forward;
```

<small>CameraManipulation_DrawFrustum.cs, 6.4. The projection demo builds its wireframe from the same formula.</small>

At the demo's defaults the near window is `±0.737 × ±0.414`: `tan 22.5° = 0.414`, times 1.78.


---

## Viewing, one idea

- A camera is a **frame**: `eye`, `at`, `up` to orthonormal `w`, `u`, `v` by cross products; clamp away from the pole
- `V`: **rows = basis**, translation **−basis·eye**; the inverse of the camera's pose
- Projection **divides by depth**: `P`'s −1 row makes `w' = −z`; NDC is the cube; depth precision lives near the eye
- The **chain**: object, `M`, world, `V`, view, `P`, clip, divide, NDC, viewport, pixel
- **Moving the camera** is editing the frame; `V` is rebuilt

