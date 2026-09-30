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
  DENSIFIED 2026-09-29 (Plan C; 60+ slides per two hours): Brunelleschi and Alberti, checks on V and V as the camera's inverse, the pinhole worked, rows of P derived, a predict slide, the NDC-cube and depth-precision figures, behind-the-camera, homogeneous clipping and Sutherland-Hodgman, a near-plane clip worked, the viewport transform and the y-flip pitfall, both tracks' camera matrices and Unity's -z view space, unprojection worked and picking in both tracks, zoom versus dolly and the dolly zoom, off-axis and stereo projection, depth of field, a check-yourself slide. Numbers from numbers-pipeline.json (view) or node.

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

## Perspective is six hundred years old

- **about 1415**: Filippo Brunelleschi demonstrates linear perspective in Florence: a painted panel of the Baptistery, viewed through a hole in its back and a mirror, lines up with the real building
- **1435**: Leon Battista Alberti's *De pictura* writes down the construction: the picture is a **window**, and every scene point is drawn where its line to the eye crosses the window
- **today**: a GPU does Alberti's construction for every vertex: the view matrix places the eye, the projection matrix finds the crossing, the divide by `w` is the similar triangle


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

## Check: V's rows are a rotation

```text
   u = ( 0.8192,  0,      −0.5736)      |u| = 1
   v = (−0.1962,  0.9397, −0.2802)      |v| = 1        u·v = v·w = w·u = 0
   w = ( 0.539,   0.342,   0.7698)      |w| = 1        u × v = w  (right-handed)

   V · (eye, 1) = (0, 0, 0, 1)          the eye lands on the view-space origin
   V · (at, 1)  = (0, 0, −7, 1)         the target lands 7 units down −z: the demo's distance
```

Three checks that catch every wrong view matrix: unit rows, orthogonal rows, eye to origin.


---

## V is the camera's world matrix, inverted

The camera is an object with a world matrix whose columns are its axes and position:

```text
   C = [ u  v  w  eye ]          (the camera as a node: axes in columns, origin in column 3)
       [ 0  0  0   1  ]
   V = C⁻¹ = [ u^T   −u·eye ]    rigid inverse: transpose the rotation, rotate and negate the origin
             [ v^T   −v·eye ]
             [ w^T   −w·eye ]
```

This is why the scene-graph topic's camera node gives `V` for free: invert its world matrix.


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

## Worked: one point through a pinhole

Image plane at distance `d = 1`, point at `(y, z) = (2, −4)`:

```text
   y' = d · y / (−z) = 1 · 2 / 4 = 0.5
   move it twice as far, (2, −8):   y' = 0.25          twice as far, half as tall
```

Division by depth is the **only** non-linear step in the whole pipeline, and the homogeneous `w` is how a matrix asks for it.


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

## Row 3 puts the depth into w

```text
   row 3 of P = (0, 0, −1, 0)     →   w' = −z_view
   after the divide:  x_ndc = x' / w' = (f / aspect) · x / (−z)       y_ndc = f · y / (−z)
```

`f = 1 / tan(fov / 2)`: at 45°, `f = 2.414`; at the demo's aspect 1.78, `f / aspect = 1.356`. The x and y rows are just the pinhole with the window scaled to `[−1, 1]`.


---

## Solving the depth row

The depth row is `(0, 0, A, B)`, so `z_ndc = (A z + B) / (−z)`. Require near → −1 and far → +1 (near 1, far 8):

```text
   z = −1:   (−A + B) / 1  = −1
   z = −8:   (−8A + B) / 8 = +1
   ⇒  A = −(f + n)/(f − n) = −9/7 = −1.2857        B = −2 f n/(f − n) = −16/7 = −2.2857
```

Two conditions, two unknowns: the depth row is the only part of `P` that is **fitted** rather than read off a triangle.


---

## Predict before you drag

In the frustum demo, widen the vertical field of view from **45° to 90°** (aspect 1.78, near 1, far 8). Predict:

```text
   P[0][0] = f / aspect :   1.358  →  ?
   P[1][1] = f          :   2.414  →  ?
   the depth row        :   (−1.2857, −2.2857)  →  ?
```


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

## The frustum becomes a cube

<img src="../../textbook/figures/view-frustum-ndc.svg" alt="the view frustum on the left and the NDC cube it maps to on the right, with near slices mapped to thick slabs and far slices to thin ones" style="height:300px">

Equal steps in view depth become **unequal** slabs of the NDC cube: the near slices are fat, the far ones thin.


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

## Depth precision, pictured

<img src="../../textbook/figures/view-depth-precision.svg" alt="the smallest resolvable depth step against distance for fixed-point, float and reversed-z float depth buffers" style="height:300px">

Reversed z (store `1 − depth` in a float) puts the float format's dense values near 0 exactly where the `1/z` curve is flat, and flattens the error curve.


---

## Orthographic projection

<img src="../../textbook/figures/view-ortho-persp.svg" alt="the same scene in perspective and orthographic projection" style="height:220px">

```text
   perspective:  w' = −z   ->  divide by depth   ->  far things shrink, parallels converge
   orthographic: w' = 1    ->  no divide         ->  size constant, parallels stay parallel
```


---

## Pitfall: a point behind the camera

Send the view-space point `(0.5, 0, +1)`, one unit **behind** the eye, through `P`:

```text
   clip = (0.679, 0, −3.571, −1)            w' = −z = −1: negative
   divide:  (−0.679, 0, 3.571)              x flipped sign; z outside [−1, 1]
```

Divide first and the point appears on the **opposite side** of the screen. Triangles that cross the eye plane must be **clipped before the divide**.


---

## Clipping in homogeneous coordinates

Inside the frustum means, before any divide:

```text
   −w ≤ x ≤ w,     −w ≤ y ≤ w,     −w ≤ z ≤ w          (and so w > 0)
```

- six linear inequalities in `(x, y, z, w)`: each edge is cut where one of them becomes an equality
- clipping here, instead of in NDC, never divides by zero and never sees a flipped point
- **Sutherland and Hodgman, 1974** ("Reentrant polygon clipping"): clip the polygon against one plane at a time, feeding each stage's output to the next


---

## Worked: clip a triangle at the near plane

View-space triangle `A(−1, 0, −3)`, `B(1, 0, −3)`, `C(0, 0, 1)`; near plane `z = −1`. `A` and `B` are in front, `C` is behind:

```text
   edge B→C:  t = (−1 − (−3)) / (1 − (−3)) = 0.5    →  (0.5, 0, −1)
   edge A→C:  t = 0.5                               →  (−0.5, 0, −1)
   result:    the quad A, B, (0.5, 0, −1), (−0.5, 0, −1)   =  two triangles
   in clip space: A has w = 3 (inside), C has w = −1 (outside)
```

One triangle in, two out: clipping can **grow** the triangle count.


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

## The viewport transform

NDC `[−1, 1]` to pixels on a `W × H` target with the origin at the **top left**:

```text
   px = (x_ndc + 1) / 2 · W               py = (1 − y_ndc) / 2 · H               depth = (z_ndc + 1) / 2

   W × H = 1280 × 720:   NDC (0, 0)       → (640, 360)       the center
                         NDC (0.5, −0.5)  → (960, 540)
                         NDC (−1, 1)      → (0, 0)           the top-left corner
```

The `1 − y` is the flip from NDC's up to the image's down.


---

## Pitfall: whose y points down?

| convention | origin of the pixel grid | y |
| --- | --- | --- |
| OpenGL / WebGL framebuffer | bottom left | up |
| Direct3D render targets, image files, HTML canvas, DOM mouse events | top left | down |
| Unity screen space (`Input.mousePosition`, `WorldToScreenPoint`) | bottom left | up |

An upside-down render, a mouse pick that hits the mirror image of the target: the y flip was applied **zero or two** times.


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

## The camera's matrices in both tracks

| quantity | three.js | Unity |
| --- | --- | --- |
| `V` | `camera.matrixWorldInverse` | `cam.worldToCameraMatrix` |
| `P` | `camera.projectionMatrix` | `cam.projectionMatrix` (GPU form: `GL.GetGPUProjectionMatrix`) |
| world → NDC | `p.clone().project(camera)` | `cam.WorldToViewportPoint(p)` (0 to 1, not −1 to 1) |
| NDC → world | `v.unproject(camera)` | `cam.ViewportToWorldPoint(v)` |


---

## Pitfall: Unity's view space looks down −z

Unity's world is **left-handed** with `+z` forward. Its `worldToCameraMatrix` uses the **OpenGL convention**, camera looking down `−z`: the matrix includes a **z flip**, determinant `−1`.

```text
   a point 5 m in front of a Unity camera:   world forward +z   →   view z = −5
```

Hand-building `V` from `transform.right`, `up`, `forward` gives the left-handed version; compare against `worldToCameraMatrix` only after negating its third row.


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

## Unprojection: a pixel back to a ray

Invert the chain for a pixel at NDC `(x, y)`: the view-space direction through it is

```text
   d_view = ( x / P[0][0],   y / P[1][1],   −1 ) = ( x · aspect · tan(fov/2),  y · tan(fov/2),  −1 )
   d_world = x' u + y' v − w          (rotate by the camera's axes), then normalize
   ray:  eye + t · d_world
```

This is the first line of every ray tracer and every mouse pick.


---

## Worked: two rays from the demo's camera

```text
   center pixel, NDC (0, 0):   d_view = (0, 0, −1)          d_world = −w = (−0.539, −0.342, −0.770)
   top-right corner, NDC (1, 1):
       d_view = (1 / 1.3563, 1 / 2.4142, −1) = (0.737, 0.414, −1)
       d_world = 0.737 u + 0.414 v − w = (−0.016, 0.047, −1.309)   →   normalized (−0.012, 0.036, −0.999)
```

The center ray points straight down the sightline at the target; the corner ray leans by half the field of view in each direction.


---

## Picking in both tracks

```js
// three.js: NDC from the mouse, then a ray from the camera
const ndc = new THREE.Vector2((e.clientX / w) * 2 - 1, -(e.clientY / h) * 2 + 1);
raycaster.setFromCamera(ndc, camera);
const hits = raycaster.intersectObjects(scene.children);
```

```csharp
// Unity: screen pixels (origin bottom left) straight to a ray
Ray r = cam.ScreenPointToRay(Input.mousePosition);
if (Physics.Raycast(r, out RaycastHit hit)) Debug.Log(hit.point);
```


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

## Zoom is not dolly

| move | changes | perspective |
| --- | --- | --- |
| **dolly** | the eye (`V`) | near things grow faster than far things: the depth relations change |
| **zoom** | the field of view (`P`) | the whole image scales about its center: depth relations stay |

A 2× zoom on the demo: `fov 45° → 23.4°`. A 2× dolly: distance `7 → 3.5`. Same subject size, different pictures.


---

## The dolly zoom

Dolly **out** and zoom **in** together, keeping the subject's height constant: `d · tan(fov/2) = constant`.

```text
   d = 5,  fov = 45°:     half-height of the view at the subject = 5 · tan 22.5° = 2.071
   d = 10: fov = 2 · atan(2.071 / 10) = 23.4°     the subject stays the same size; the background swells
```

First used on film in Alfred Hitchcock's *Vertigo* (1958), which is why it is often called the Vertigo effect.


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

## Off-axis projection: the window need not be centered

General frustum with near-plane window `[l, r] × [b, t]`:

```text
   P = [ 2n/(r−l)    0         (r+l)/(r−l)     0    ]
       [ 0           2n/(t−b)  (t+b)/(t−b)     0    ]
       [ 0           0         A               B    ]
       [ 0           0         −1              0    ]

   symmetric (l = −r):  the third column's top entries are 0: the ordinary P
   left half of the demo's window (l = −0.7373, r = 0):  P[0][0] = 2.713,  P[0][2] = −1
```


---

## Stereo for VR: two off-axis eyes

Two eyes `6.4 cm` apart looking at a screen `2 m` away: each eye's window is the **same** physical screen, so each frustum is off-axis:

```text
   eye offset ±0.032 m   →   left eye's skew entry  P[0][2] = +0.032  (right eye: −0.032)
   both frusta meet at the screen plane: objects there have zero disparity
```

Toed-in cameras (rotating each eye inward) are the common mistake: they add vertical disparity at the corners.


---

## Depth of field: a real lens has an aperture

<img src="../../textbook/figures/view-dof.svg" alt="a thin lens focusing one depth sharply while nearer and farther points spread into circles of confusion" style="height:180px">

50 mm lens at f/2.8, focused at 3 m, 6 µm pixels:

| object distance | 1 m | 2 m | 3 m | 5 m | 10 m |
| --- | --- | --- | --- | --- | --- |
| blur circle, pixels | 100.9 | 25.2 | 0 | 20.2 | 35.3 |

The pinhole of tonight has **no** blur at all; film renderers add it. Focused at the hyperfocal distance, 29.8 m at f/2.8, everything from half that distance to infinity is acceptably sharp.


---

## Check yourself

1. The eye is at `(0, 0, 10)` looking at the origin, up `+y`. Write `V`'s translation column.
2. Near 0.5, far 100. A student sets near to 0.01. What happens to depth resolution at 50 m?
3. A vertex has clip coordinates `(2, 1, 3, 4)`. Is it inside the frustum? Its NDC?
4. A game's field-of-view slider says 90° **horizontal** at 16:9. What vertical fov goes into `P`?


---

## Viewing, one idea

- A camera is a **frame**: `eye`, `at`, `up` to orthonormal `w`, `u`, `v` by cross products; clamp away from the pole
- `V`: **rows = basis**, translation **−basis·eye**; the inverse of the camera's pose
- Projection **divides by depth**: `P`'s −1 row makes `w' = −z`; NDC is the cube; depth precision lives near the eye
- The **chain**: object, `M`, world, `V`, view, `P`, clip, divide, NDC, viewport, pixel
- **Moving the camera** is editing the frame; `V` is rebuilt

