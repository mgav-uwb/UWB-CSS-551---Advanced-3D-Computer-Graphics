<!--
  CSS 551 · TOPIC DECK: Viewing: the camera frame, the view matrix, projection, the chain (~76 min).
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
  (tumble, track, dolly) as frame edits, the dolly worked; Sung's CameraMatrices code.
  CUT 2026-10-08: "Check: the window becomes 4:3" (its answer folded into the resize slide), the
           arithmetic "Predict before you drag" (its answer in the frustum demo's note) and "Check yourself";
           "Why w points back" and "Check: V's rows are a rotation" renamed; resize code in Unity/WebGL tabs.
  NEEDS:   the vector-geometry topic (a frame from two vectors), the affine topic (rigid inverse, block product),
           the scene-graphs topic (the camera as a node) helps but is not required.
  DEMOS:   data-demo="view-matrix" data-controls="az,el,dist" and data-demo="projection" data-controls="fov,near",
           each on its own slide under the lecture page's crop rules.
           view-matrix fallback at az=35, el=20, dist=7, at=(0,0.5,0), up=(0,1,0): rows (0.82,0,-0.57,0),
           (-0.20,0.94,-0.28,-0.47), (0.54,0.34,0.77,-7.17). projection fallback at fov 45, aspect 1.78,
           near 1, far 8: P rows (1.36,0,0,0), (0,2.41,0,0), (0,0,-1.29,-2.29), (0,0,-1,0); marked box NDC
           (0,0,0.02), and (0,0,-2.13) at near 2.5.
  NUMBERS: textbook/figures/numbers-pipeline.json, key view (eye, u, v, w, V, wrong, P, mark, depths, fov,
           depthPrecision, chain, viewport, frustum, pole, ortho) and lib/core/xform.js (lookAtBasis, perspective).
  FIGURES: ../../textbook/figures/view-*.svg (tools/gen-textbook-figures-pipeline.mjs) and vwd-*.svg
           (tools/gen-lecture-figures-viewing.mjs).
  SOURCE:  converted 2026-09-29 (Plan C) from sessions/S06-3d-viewing/L06-3d-viewing.md (Plan B's lecture 6):
           logistics and the machine-problem slide removed; the pole, field of view, depth precision, the
           one-vertex chain, frustum culling and the dolly added from the textbook chapter. Real C# excerpts
           are from Kelvin Sung's CSS 451 ClassExamples, Topic6-3DViewing (6.8.OurOwnProjMatrix CameraMatrices.cs,
           6.3.Tumble CameraManipulation.cs, 6.4.DrawCameraFrustum).
  DENSIFIED 2026-09-29 (Plan C; 60+ slides per two hours): Brunelleschi and Alberti, checks on V and V as the camera's inverse, the pinhole worked, rows of P derived, a predict slide, the NDC-cube and depth-precision figures, behind-the-camera, homogeneous clipping and Sutherland-Hodgman, a near-plane clip worked, the viewport transform and the y-flip pitfall, both tracks' camera matrices and Unity's -z view space, unprojection worked and picking in both tracks, zoom versus dolly and the dolly zoom, off-axis and stereo projection, depth of field, a check-yourself slide. Numbers from numbers-pipeline.json (view) or node.

  EXPANDED 2026-10-05 (L08 to ~80 slides): looking straight down (the degenerate up fixed), the depth row
  for any near and far, a point off the sightline to the pixel, where NDC depth crosses zero, the stale-aspect
  pitfall and resize in both tracks, a 4:3 check, orthographic depth, the frustum planes as rows of P V, the
  p-vertex rejection of box 2, a track worked, the circle of confusion worked. Numbers from node (xform.js).

  RESEQUENCED 2026-10-05 (L08 with interaction-3d, about 80 slides): unprojection, the two rays and picking
  in both tracks moved to interaction-3d.md (mounted right after this topic); moved to the chapter only:
  Tumble in Sung's code and drawing the frustum (Section 13; the orbit controller is in interaction-3d),
  depth precision pictured (Section 7 figure), a track worked (Section 13), a point off the sightline
  (Exercise 3), where NDC depth crosses zero (Exercise 5), and the recap slide.

  EDITED 2026-10-29 (Marcel: MathJax formulas instead of ASCII, and vector illustrations, the ASCII kept as
  alt text, in the CSS 343 style): every formula block typeset (29 blocks, each keeping its ASCII as the
  aria-label; the depth-row slide writes far as F, as the general slide does); every inline formula on a slide
  typeset; figures vwd-* from tools/gen-lecture-figures-viewing.mjs added to worked slides.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:" and stay plain text. Display math is a raw <div class="tex"> block typeset by
  MathJax (lib/deck-math.js; TeX inside, the ASCII form as aria-label, no blank line inside);
  inline math is a code span written `$...$`, which lib/deck-math.js typesets in place (in a
  table cell write | as \lvert ... \rvert). Pictures are SVG figures computed by a generator
  (never ASCII art), the ASCII kept as the img alt. Code identifiers stay plain code spans.
  Never two "_" on one markdown line outside a code fence or code span. Paths are relative to
  the lecture page that mounts this topic.
-->

### Viewing: the camera, the view matrix, and projection

<small>(~76 min)</small>


---

### The camera is a frame

<small>(~13 min)</small>

---

## Perspective is six hundred years old

- **about 1415**: Filippo Brunelleschi demonstrates linear perspective in Florence: a painted panel of the Baptistery, viewed through a hole in its back and a mirror, lines up with the real building
- **1435**: Leon Battista Alberti's *De pictura* writes down the construction: the picture is a **window**, and every scene point is drawn where its line to the eye crosses the window
- **today**: a GPU does Alberti's construction for every vertex: the view matrix places the eye, the projection matrix finds the crossing, the divide by `$w$` is the similar triangle


---

## Place the eye

A rendered image needs a **viewer**. Three things pin a camera down:

- a **position** in the world: where the camera sits
- a **direction**: what it aims at
- an **orientation**: which way is up


---

## eye, at, up

- `$\mathit{eye}$`: the camera's **position** in world space
- `$\mathit{at}$`: the **point it looks at**
- `$\mathit{up}$`: a rough **up direction** (usually world `$+y$`); a cross product straightens it

<img src="../../textbook/figures/view-frame.svg" alt="eye, at, up and the camera axes u, v, w" style="height:260px">


---

## Building the camera's axes

Three perpendicular unit axes fixed to the camera, `$u$` (right), `$v$` (up), `$w$` (backward):

<div class="tex" role="img" aria-label="w = normalize(eye − at)        from the target back toward the eye
u = normalize(up × w)          right = rough up × backward
v = w × u                      true up = backward × right">
\[
\begin{aligned}
w &= \operatorname{normalize}(\mathit{eye} - \mathit{at}) && \text{from the target back toward the eye} \\
u &= \operatorname{normalize}(\mathit{up} \times w) && \text{right} = \text{rough up} \times \text{backward} \\
v &= w \times u && \text{true up} = \text{backward} \times \text{right}
\end{aligned}
\]
</div>

Each cross is **perpendicular** to its inputs, so `$u$`, `$v$`, `$w$` come out **orthonormal**. This is the vectors lecture's "two vectors, a whole frame".


---

## w points back: −z is forward

`$w = \mathit{eye} - \mathit{at}$` looks backward. Two reasons:

- the camera looks down `$-w$`, matching the projection's assumption that visible points have **negative** `$z$`
- it keeps `$u$`, `$v$`, `$w$` **right-handed**, the same chirality as the world


---

<!-- .slide: class="demo-full" -->

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

### The view matrix

<small>(~17 min)</small>

---

## What the view matrix does

<div class="tex" role="img" aria-label="p_view = V · p_world">
\[
p_{\text{view}} = V\,p_{\text{world}}
\]
</div>

`$V$` re-expresses a world point in the camera's frame: `$\mathit{eye}$` at the origin, looking down `$-w$`. It is **rigid**, a rotation and a translation, no scale.


---

## Rows are the basis; translation is −basis·eye

To express a world point in the camera's axes: subtract the eye, then **dot with each axis**:

<div class="tex" style="font-size:0.72em" role="img" aria-label="p_view = R (p − eye) = R p − R eye
     [ u_x  u_y  u_z  −u·eye ]
V =  [ v_x  v_y  v_z  −v·eye ]          rows = u, v, w
     [ w_x  w_y  w_z  −w·eye ]
     [  0    0    0     1    ]">
\[
p_{\text{view}} = R\,(p - \mathit{eye}) = R\,p - R\,\mathit{eye}
\]
\[
V = \begin{bmatrix} u_x & u_y & u_z & -u \cdot \mathit{eye} \\ v_x & v_y & v_z & -v \cdot \mathit{eye} \\ w_x & w_y & w_z & -w \cdot \mathit{eye} \\ 0 & 0 & 0 & 1 \end{bmatrix} \qquad \text{rows} = u, v, w
\]
</div>

This is the rigid inverse `$[\,R^T \mid -R^T t\,]$` of the camera's placement: the view matrix is the **inverse of the camera's pose**.


---

## Worked: V at the demo's defaults

`$\mathit{eye} = (3.773, 2.894, 5.388)$`, `$\mathit{at} = (0, 0.5, 0)$`, `$\mathit{up} = (0, 1, 0)$`:

<div class="tex" style="font-size:0.68em" role="img" aria-label="eye − at = (3.773, 2.394, 5.388), length 7.000   -&gt;  w = (0.539, 0.342, 0.770)
up × w   = (0.770, 0, −0.539)                     -&gt;  u = (0.819, 0, −0.574)
w × u                                             -&gt;  v = (−0.196, 0.940, −0.280)
−u·eye = −(0.819·3.773 + 0 − 0.574·5.388)             =  0.00
−v·eye = −(−0.196·3.773 + 0.940·2.894 − 0.280·5.388) = −0.47
−w·eye = −(0.539·3.773 + 0.342·2.894 + 0.770·5.388)  = −7.17">
\[
\begin{aligned}
\mathit{eye} - \mathit{at} &= (3.773, 2.394, 5.388),\ \text{length } 7.000 && \to\ w = (0.539, 0.342, 0.770) \\
\mathit{up} \times w &= (0.770, 0, {-0.539}) && \to\ u = (0.819, 0, {-0.574}) \\
w \times u & && \to\ v = ({-0.196}, 0.940, {-0.280})
\end{aligned}
\]
\[
\begin{aligned}
-u \cdot \mathit{eye} &= -(0.819 \cdot 3.773 + 0 - 0.574 \cdot 5.388) &&= 0.00 \\
-v \cdot \mathit{eye} &= -({-0.196} \cdot 3.773 + 0.940 \cdot 2.894 - 0.280 \cdot 5.388) &&= {-0.47} \\
-w \cdot \mathit{eye} &= -(0.539 \cdot 3.773 + 0.342 \cdot 2.894 + 0.770 \cdot 5.388) &&= {-7.17}
\end{aligned}
\]
</div>

Every entry matches the panel, because the demo runs this arithmetic.


---

## Three checks on a view matrix

<div class="tex" style="font-size:0.7em" role="img" aria-label="u = ( 0.8192,  0,      −0.5736)      |u| = 1
v = (−0.1962,  0.9397, −0.2802)      |v| = 1        u·v = v·w = w·u = 0
w = ( 0.539,   0.342,   0.7698)      |w| = 1        u × v = w  (right-handed)
V · (eye, 1) = (0, 0, 0, 1)          the eye lands on the view-space origin
V · (at, 1)  = (0, 0, −7, 1)         the target lands 7 units down −z: the demo's distance">
\[
\begin{aligned}
u &= (0.8192, 0, {-0.5736}) && \lvert u \rvert = 1 \\
v &= ({-0.1962}, 0.9397, {-0.2802}) && \lvert v \rvert = 1 && u \cdot v = v \cdot w = w \cdot u = 0 \\
w &= (0.539, 0.342, 0.7698) && \lvert w \rvert = 1 && u \times v = w \ \text{(right-handed)}
\end{aligned}
\]
\[
\begin{aligned}
V\,(\mathit{eye}, 1) &= (0, 0, 0, 1) && \text{the eye lands on the view-space origin} \\
V\,(\mathit{at}, 1) &= (0, 0, {-7}, 1) && \text{the target lands 7 units down } {-z}\text{: the demo's distance}
\end{aligned}
\]
</div>

Three checks that catch every wrong view matrix: unit rows, orthogonal rows, eye to origin.


---

## V is the camera's world matrix, inverted

The camera is an object with a world matrix whose columns are its axes and position:

<div class="tex" style="font-size:0.72em" role="img" aria-label="C = [ u  v  w  eye ]          (the camera as a node: axes in columns, origin in column 3)
    [ 0  0  0   1  ]
V = C⁻¹ = [ u^T   −u·eye ]    rigid inverse: transpose the rotation, rotate and negate the origin
          [ v^T   −v·eye ]
          [ w^T   −w·eye ]">
\[
C = \begin{bmatrix} u & v & w & \mathit{eye} \\ 0 & 0 & 0 & 1 \end{bmatrix} \qquad \text{the camera as a node: axes in columns, origin in column 3}
\]
\[
V = C^{-1} = \begin{bmatrix} u^T & -u \cdot \mathit{eye} \\ v^T & -v \cdot \mathit{eye} \\ w^T & -w \cdot \mathit{eye} \end{bmatrix} \qquad \begin{aligned} &\text{rigid inverse: transpose the rotation,} \\ &\text{rotate and negate the origin} \end{aligned}
\]
</div>

This is why the scene-graph topic's camera node gives `$V$` for free: invert its world matrix.


---

## The wrong view matrix

Sung's `CameraMatrices` ships a mode `ViewMatrixWrong`, "to show we are doing something":

<div class="tex" style="font-size:0.7em" role="img" aria-label="V_wrong = [ 1  0  0  −3.77 ]     rotation = IDENTITY
          [ 0  1  0  −2.89 ]     the basis is thrown away
          [ 0  0  1  −5.39 ]
          [ 0  0  0    1   ]">
\[
V_{\text{wrong}} = \begin{bmatrix} 1 & 0 & 0 & {-3.77} \\ 0 & 1 & 0 & {-2.89} \\ 0 & 0 & 1 & {-5.39} \\ 0 & 0 & 0 & 1 \end{bmatrix} \qquad \begin{aligned} &\text{rotation} = \text{identity} \\ &\text{the basis is thrown away} \end{aligned}
\]
</div>

It moves the eye to the origin but **never turns** the world: the camera always faces world `$-z$`, whatever `$\mathit{at}$` is.

```csharp
case ViewMatrixMode.ViewMatrixWrong:
    // this is to show we are doing something @
    break;   // r stays Matrix4x4.identity
```


---

## Pitfall: the pole

Raise the elevation toward 90° with `$\mathit{up} = (0, 1, 0)$`. `$\lvert \mathit{up} \times w \rvert = \cos(\mathit{el})\text{:}$`

| elevation | length of `$\mathit{up} \times w$` |
| --- | --- |
| 60° | 0.5 |
| 85° | 0.087 |
| 89° | 0.017 |
| 89.9° | 0.0017 |
| 90° | 0: no right axis at all |

`$u$` is recovered from a shrinking vector, then from nothing. Clamp the pitch (the course's orbit clamps at ±89.9°) or store orientation as a **quaternion**.


---

## Worked: looking straight down

`$\mathit{eye} = (0, 5, 0)$`, `$\mathit{at} = (0, 0, 0)$`: a top-down map camera.

<div class="tex" style="font-size:0.72em" role="img" aria-label="up = (0, 1, 0):    w = (0, 1, 0)     up × w = 0        lookAtBasis throws a RangeError
up = (0, 0, −1):   w = (0, 1, 0)
                   u = (0, 0, −1) × (0, 1, 0) = (1, 0, 0)
                   v = w × u        = (0, 0, −1)
V translation = (−u·eye, −v·eye, −w·eye) = (0, 0, −5)">
\[
\begin{aligned}
\mathit{up} = (0, 1, 0)\text{:}\quad & w = (0, 1, 0), \quad \mathit{up} \times w = 0\text{: } \texttt{lookAtBasis}\text{ throws a }\texttt{RangeError} \\
\mathit{up} = (0, 0, {-1})\text{:}\quad & w = (0, 1, 0) \\
& u = (0, 0, {-1}) \times (0, 1, 0) = (1, 0, 0) \\
& v = w \times u = (0, 0, {-1}) \\
& V \text{ translation} = ({-u \cdot \mathit{eye}}, {-v \cdot \mathit{eye}}, {-w \cdot \mathit{eye}}) = (0, 0, {-5})
\end{aligned}
\]
</div>

The hint `$(0, 0, -1)$` makes world `$-z$` the top of the screen: north is up on the map.


---

### Projection

<small>(~35 min)</small>

---

## The pinhole camera

<img src="../../textbook/figures/view-pinhole.svg" alt="rays through a pinhole: farther objects project smaller" style="height:260px">

Light through one point onto a plane: **farther projects smaller**. That is perspective, one operation: **divide by depth**.


---

## Similar triangles: divide by depth

Eye at the origin looking down `$-z$`, image plane at distance `$d$`. A point `$(x, y, z)$` with `$z < 0$`:

<div class="tex" role="img" aria-label="x' / d = x / (−z)      -&gt;     x' = d · x / (−z)       y' = d · y / (−z)">
\[
\frac{x'}{d} = \frac{x}{-z} \quad\Longrightarrow\quad x' = \frac{d\,x}{-z}, \qquad y' = \frac{d\,y}{-z}
\]
</div>

Worked: `$d = 1$`, a point at height 2, depth 4: `$y' = 1 \cdot 2 / 4 = 0.5$`. Double the depth, halve the height.


---

## Worked: one point through a pinhole

Image plane at distance `$d = 1$`, point at `$(y, z) = (2, -4)$`:

<div class="tex" role="img" aria-label="y' = d · y / (−z) = 1 · 2 / 4 = 0.5
move it twice as far, (2, −8):   y' = 0.25          twice as far, half as tall">
\[
\begin{aligned}
&y' = \frac{d\,y}{-z} = \frac{1 \cdot 2}{4} = 0.5 \\
&\text{move it twice as far, } (2, {-8})\text{: } y' = 0.25 && \text{twice as far, half as tall}
\end{aligned}
\]
</div>

Division by depth is the **only** non-linear step in the whole pipeline, and the homogeneous `$w$` is how a matrix asks for it.


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

## Pitfall: a stale aspect ratio

`$P$` built for aspect 1.78 (fov 45°, near 1, far 8). Two view-space points 4 units out, `$(1, 0, -4)$` and `$(0, 1, -4)$`, one unit right and one unit up of the sightline:

| viewport | pixels right of center | pixels above center |
| --- | --- | --- |
| 1280 × 720 (matches `$P$`) | 217.0 | 217.3 |
| 720 × 720 (stale `$P$`) | 122.1 | 217.3 |
| 720 × 720, `$P$` rebuilt with aspect 1 | 217.3 | 217.3 |

With the stale `$P$`, a square renders 1.78 times narrower than it is tall. Read the aspect from the framebuffer on **every** resize.


---

## Resize: rebuild P in both tracks

<div class="code-tabs">

```csharp
// aspect follows the Game view's width / height until a script assigns it
cam.aspect = 16f / 9f;   // now frozen: a 4:3 window renders squeezed, as on the previous slide
cam.ResetAspect();       // back to the window's own width / height
```

```javascript
// the camera caches P; changing fov or aspect does nothing until updateProjectionMatrix
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();          // recompute camera.projectionMatrix
  renderer.setSize(innerWidth, innerHeight);
});
```

</div>

Only `$P[0][0] = f / \mathit{aspect}$` changes: 1.356 at 16:9, 1.811 at 4:3. `$P[1][1] = f$` follows the vertical field of view alone.


---

## NDC: the canonical cube

A matrix cannot divide. So put the depth into the **fourth coordinate**, `$w' = -z$`, and let the pipeline divide by it:

<div class="tex" role="img" aria-label="after the divide, visible points satisfy
    −1 ≤ x_ndc ≤ 1      −1 ≤ y_ndc ≤ 1      −1 ≤ z_ndc ≤ 1">
\[
\begin{gathered} \text{after the divide, visible points satisfy} \\ -1 \le x_{\text{ndc}} \le 1 \qquad -1 \le y_{\text{ndc}} \le 1 \qquad -1 \le z_{\text{ndc}} \le 1 \end{gathered}
\]
</div>

Whatever the fov, aspect, near or far, the visible region becomes this `$2 \times 2 \times 2$` **box**. Anything outside is clipped.


---

## Anatomy of P, entry by entry

`perspective(fov, aspect, near, far)`, `$f = 1 / \tan(\mathit{fov}/2)\text{:}$`

<div class="tex" role="img" aria-label="     [ f/aspect   0            0                        0              ]
P =  [    0       f            0                        0              ]
     [    0       0   (far+near)/(near−far)   2·far·near/(near−far)    ]
     [    0       0           −1                        0              ]">
\[
P = \begin{bmatrix} f/\mathit{aspect} & 0 & 0 & 0 \\ 0 & f & 0 & 0 \\ 0 & 0 & \dfrac{\mathit{far} + \mathit{near}}{\mathit{near} - \mathit{far}} & \dfrac{2 \cdot \mathit{far} \cdot \mathit{near}}{\mathit{near} - \mathit{far}} \\ 0 & 0 & -1 & 0 \end{bmatrix}
\]
</div>

- `$f/\mathit{aspect}$`, `$f$`: scale `$x$` and `$y$` so the field of view fits the `$\pm 1$` box
- **row 2**: maps `$z = -\mathit{near}$` to `$-1$` and `$z = -\mathit{far}$` to `$+1$` after the divide
- **the** `$-1$`: copies `$-z$` into `$w'$`, so the divide **is** the divide by depth


---

## Row 3 puts the depth into w

<div class="tex" role="img" aria-label="row 3 of P = (0, 0, −1, 0)     →   w' = −z_view
after the divide:  x_ndc = x' / w' = (f / aspect) · x / (−z)       y_ndc = f · y / (−z)">
\[
\begin{aligned}
&\text{row 3 of } P = (0, 0, {-1}, 0) \quad\to\quad w' = -z_{\text{view}} \\
&\text{after the divide: } x_{\text{ndc}} = \frac{x'}{w'} = \frac{f}{\mathit{aspect}} \cdot \frac{x}{-z}, \qquad y_{\text{ndc}} = \frac{f\,y}{-z}
\end{aligned}
\]
</div>

`$f = 1 / \tan(\mathit{fov} / 2)$`: at 45°, `$f = 2.414$`; at the demo's aspect 1.78, `$f / \mathit{aspect} = 1.356$`. The `$x$` and `$y$` rows are just the pinhole with the window scaled to `$[-1, 1]$`.


---

## Solving the depth row

The depth row is `$(0, 0, A, B)$`, so `$z_{\text{ndc}} = (A z + B) / (-z)$`. Require near `$\to -1$` and far `$\to +1$` (near 1, far 8):

<div class="tex" role="img" aria-label="z = −1:   (−A + B) / 1  = −1
z = −8:   (−8A + B) / 8 = +1
⇒  A = −(F + n)/(F − n) = −9/7 = −1.2857        B = −2 F n/(F − n) = −16/7 = −2.2857">
\[
\begin{aligned}
z = -1\text{:}\quad & ({-A} + B)/1 = -1 \\
z = -8\text{:}\quad & ({-8A} + B)/8 = +1 \\
\Rightarrow\quad & A = -\frac{F + n}{F - n} = -\frac{9}{7} = -1.2857 \\
& B = -\frac{2 F n}{F - n} = -\frac{16}{7} = -2.2857
\end{aligned}
\]
</div>

Two conditions, two unknowns: the depth row is the only part of `$P$` that is **fitted** rather than read off a triangle.


---

## The depth row, for any near and far

Near distance `$n$`, far distance `$F$`. The two conditions, multiplied out:

<div class="tex" style="font-size:0.78em" role="img" aria-label="z = −n:   (−A n + B) / n = −1      ⇒   −A n + B = −n
z = −F:   (−A F + B) / F = +1      ⇒   −A F + B =  F
subtract:  A (F − n) = −(F + n)    ⇒   A = (F + n) / (n − F)
back-substitute:                       B = 2 F n / (n − F)">
\[
\begin{aligned}
z = -n\text{:}\quad & ({-A n} + B)/n = -1 && \Rightarrow\quad -A n + B = -n \\
z = -F\text{:}\quad & ({-A F} + B)/F = +1 && \Rightarrow\quad -A F + B = F \\
\text{subtract:}\quad & A\,(F - n) = -(F + n) && \Rightarrow\quad A = \frac{F + n}{n - F} \\
\text{back-substitute:}\quad & && \phantom{\Rightarrow}\quad\ B = \frac{2 F n}{n - F}
\end{aligned}
\]
</div>

Check at `$n = 1$`, `$F = 8$`: `$A = 9/({-7}) = -1.2857$`, `$B = 16/({-7}) = -2.2857$`, the numbers of the previous slide.


---

<!-- .slide: class="demo-full" -->

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

fov 45°, aspect 1.78, near 1, far 8: `$f = 2.414$`, `$f/\mathit{aspect} = 1.356$`, `$9/({-7}) = -1.286$`, `$16/({-7}) = -2.286$`.

<div class="tex" style="font-size:0.78em" role="img" aria-label="view space:    (0, 0, −1.8)                       on the sightline, 1.8 in front
clip:          P (0, 0, −1.8, 1) = (0, 0, 0.029, 1.8)
NDC:           divide by w' = 1.8  -&gt;  (0, 0, 0.016)    inside, just past near (−1)
near = 2.5:    NDC z = −2.13                             outside: clipped">
\[
\begin{aligned}
\text{view space:}\quad & (0, 0, {-1.8}) && \text{on the sightline, 1.8 in front} \\
\text{clip:}\quad & P\,(0, 0, {-1.8}, 1) = (0, 0, 0.029, 1.8) \\
\text{NDC:}\quad & \text{divide by } w' = 1.8 \ \to\ (0, 0, 0.016) && \text{inside, just past near } ({-1}) \\
\text{near} = 2.5\text{:}\quad & \text{NDC } z = -2.13 && \text{outside: clipped}
\end{aligned}
\]
</div>


---

## NDC depth is not linear

Same P (near 1, far 8):

| view `$z$` | −1 | −1.5 | −2 | −3 | −4 | −6 | −8 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| NDC `$z$` | −1 | −0.238 | 0.143 | 0.524 | 0.714 | 0.905 | 1 |

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

At 100 m, surfaces closer than **6 mm** share a depth value: z-fighting. The step scales as `$d^2/\mathit{near}$`: `$\mathit{near} = 0.001$` makes it **100 times worse**.


---

## Orthographic projection

<img src="../../textbook/figures/view-ortho-persp.svg" alt="the same scene in perspective and orthographic projection" style="height:220px">

<div class="tex" style="font-size:0.76em" role="img" aria-label="perspective:  w' = −z   -&gt;  divide by depth   -&gt;  far things shrink, parallels converge
orthographic: w' = 1    -&gt;  no divide         -&gt;  size constant, parallels stay parallel">
\[
\begin{aligned}
\text{perspective:}\quad & w' = -z \ \to\ \text{divide by depth} \\ & \to\ \text{far things shrink, parallels converge} \\[4pt]
\text{orthographic:}\quad & w' = 1 \ \to\ \text{no divide} \\ & \to\ \text{size constant, parallels stay parallel}
\end{aligned}
\]
</div>


---

## Orthographic depth is linear

The box `$[-4, 4] \times [-2.25, 2.25]$`, near 1, far 8:

<div class="tex" style="font-size:0.68em" role="img" aria-label="        [ 0.25   0      0       0     ]
P_o  =  [ 0      0.444  0       0     ]        2/(r − l),  2/(t − b)
        [ 0      0     −0.286  −1.286 ]        −2/(F − n),  −(F + n)/(F − n)
        [ 0      0      0       1     ]        w' = 1: no divide
depth 4.5, halfway from near to far:   orthographic NDC z = −0.286·(−4.5) − 1.286 = 0
                                       perspective (same near, far):  NDC z = 0.778">
\[
P_o = \begin{bmatrix} 0.25 & 0 & 0 & 0 \\ 0 & 0.444 & 0 & 0 \\ 0 & 0 & {-0.286} & {-1.286} \\ 0 & 0 & 0 & 1 \end{bmatrix} \qquad \begin{aligned} & \frac{2}{r - l},\ \frac{2}{t - b} \\[2pt] & {-\frac{2}{F - n}},\ {-\frac{F + n}{F - n}} \\[2pt] & w' = 1\text{: no divide} \end{aligned}
\]
\[
\begin{aligned}
\text{depth 4.5, halfway from near to far:}\quad & \text{orthographic NDC } z = -0.286 \cdot ({-4.5}) - 1.286 = 0 \\
& \text{perspective (same near, far): NDC } z = 0.778
\end{aligned}
\]
</div>

No `$1/z$`: the depth buffer's resolution is **uniform** from near to far.


---

## Pitfall: a point behind the camera

Send the view-space point `$(0.5, 0, +1)$`, one unit **behind** the eye, through `$P$`:

<div class="tex" role="img" aria-label="clip = (0.678, 0, −3.571, −1)            w' = −z = −1: negative
divide:  (−0.678, 0, 3.571)              x flipped sign; z outside [−1, 1]">
\[
\begin{aligned}
\text{clip} &= (0.678, 0, {-3.571}, {-1}) && w' = -z = -1\text{: negative} \\
\text{divide:}\ & ({-0.678}, 0, 3.571) && x \text{ flipped sign; } z \text{ outside } [-1, 1]
\end{aligned}
\]
</div>

<img src="../../textbook/figures/vwd-behind.svg" alt="top view, x across and −z up: the eye at the origin and the near plane z = −1; the point (0.5, 0, −2) in front, w′ = 2, crosses the plane on its own side at x ndc = 0.339; the point (0.5, 0, +1) behind the eye, w′ = −1, projects through the eye to the other side, x ndc = −0.678" style="height:280px">

Divide first and the point appears on the **opposite side** of the screen. Triangles that cross the eye plane must be **clipped before the divide**.


---

## Clipping in homogeneous coordinates

Inside the frustum means, before any divide:

<div class="tex" role="img" aria-label="−w ≤ x ≤ w,     −w ≤ y ≤ w,     −w ≤ z ≤ w          (and so w &gt; 0)">
\[
-w \le x \le w, \qquad -w \le y \le w, \qquad -w \le z \le w \qquad (\text{and so } w \gt 0)
\]
</div>

- six linear inequalities in `$(x, y, z, w)$`: each edge is cut where one of them becomes an equality
- clipping here, instead of in NDC, never divides by zero and never sees a flipped point
- **Sutherland and Hodgman, 1974** ("Reentrant polygon clipping"): clip the polygon against one plane at a time, feeding each stage's output to the next


---

## Worked: clip a triangle at the near plane

View-space triangle `$A(-1, 0, -3)$`, `$B(1, 0, -3)$`, `$C(0, 0, 1)$`; near plane `$z = -1$`. `$A$` and `$B$` are in front, `$C$` is behind:

<img src="../../textbook/figures/vwd-clip-near.svg" alt="top view of view space, x across and −z (forward) up: triangle A(−1, 0, −3), B(1, 0, −3), C(0, 0, 1); the near plane z = −1 crosses edges A→C and B→C at (−0.5, 0, −1) and (0.5, 0, −1); the part with C, behind the near plane, is clipped; kept: the quad A, B, (0.5, 0, −1), (−0.5, 0, −1), two triangles; A has w = 3, C has w = −1" style="height:250px">

<div class="tex" style="font-size:0.7em" role="img" aria-label="edge B→C:  t = (−1 − (−3)) / (1 − (−3)) = 0.5    →  (0.5, 0, −1)
edge A→C:  t = 0.5                               →  (−0.5, 0, −1)
result:    the quad A, B, (0.5, 0, −1), (−0.5, 0, −1)   =  two triangles
in clip space: A has w = 3 (inside), C has w = −1 (outside)">
\[
\begin{aligned}
\text{edge } B \to C\text{:}\quad & t = \frac{-1 - ({-3})}{1 - ({-3})} = 0.5 \ \to\ (0.5, 0, {-1}) \\
\text{edge } A \to C\text{:}\quad & t = 0.5 \ \to\ ({-0.5}, 0, {-1}) \\
\text{result:}\quad & \text{the quad } A, B, (0.5, 0, {-1}), ({-0.5}, 0, {-1}) = \text{two triangles} \\
\text{in clip space:}\quad & A \text{ has } w = 3 \text{ (inside)}, \ C \text{ has } w = -1 \text{ (outside)}
\end{aligned}
\]
</div>

One triangle in, two out: clipping can **grow** the triangle count.


---

### The full chain

<small>(~17 min)</small>

---

## One vertex, object space to pixel

<img src="../../textbook/figures/view-chain.svg" alt="the chain of spaces from object to pixel" style="height:140px">

| stage | coordinates | by |
| --- | --- | --- |
| object | (0.5, 0.5, 0.5) | authored |
| world | (0.683, 1.000, 0.183) | `$M = T(0, 0.5, 0)\,R_y(30^\circ)$` |
| view | (0.455, 0.285, −6.320) | `$V$` of the worked slide |
| clip | (0.616, 0.687, 5.840, 6.320) | `$P$`; note `$w' = 6.32 = -z$` |
| NDC | (0.098, 0.109, 0.924) | divide by `$w'$` |
| pixel | (702.7, 320.8), window depth 0.962 | viewport 1280×720 |


---

## The viewport transform

NDC `$[-1, 1]$` to pixels on a `$W \times H$` target with the origin at the **top left**:

<div class="tex" style="font-size:0.72em" role="img" aria-label="px = (x_ndc + 1) / 2 · W               py = (1 − y_ndc) / 2 · H               depth = (z_ndc + 1) / 2
W × H = 1280 × 720:   NDC (0, 0)       → (640, 360)       the center
                      NDC (0.5, −0.5)  → (960, 540)
                      NDC (−1, 1)      → (0, 0)           the top-left corner">
\[
p_x = \frac{x_{\text{ndc}} + 1}{2} \cdot W \qquad p_y = \frac{1 - y_{\text{ndc}}}{2} \cdot H \qquad \text{depth} = \frac{z_{\text{ndc}} + 1}{2}
\]
\[
\begin{aligned}
W \times H = 1280 \times 720\text{:}\quad & \text{NDC } (0, 0) \to (640, 360) && \text{the center} \\
& \text{NDC } (0.5, {-0.5}) \to (960, 540) \\
& \text{NDC } ({-1}, 1) \to (0, 0) && \text{the top-left corner}
\end{aligned}
\]
</div>

<img src="../../textbook/figures/vwd-viewport.svg" alt="the NDC square from (−1, −1) to (1, 1) with y up, and a 1280 by 720 pixel grid with the origin at the top left and y down: NDC (0, 0) maps to (640, 360), (0.5, −0.5) to (960, 540), (−1, 1) to (0, 0)" style="height:230px">

The `$1 - y$` is the flip from NDC's up to the image's down.


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

<small>CameraMatrices.cs, 6.8. `r * t` is `$R\,T(-\mathit{eye})$`: rotate after moving the eye to the origin.</small>


---

## The camera's matrices in both tracks

| quantity | three.js | Unity |
| --- | --- | --- |
| `$V$` | `camera.matrixWorldInverse` | `cam.worldToCameraMatrix` |
| `$P$` | `camera.projectionMatrix` | `cam.projectionMatrix` (GPU form: `GL.GetGPUProjectionMatrix`) |
| world → NDC | `p.clone().project(camera)` | `cam.WorldToViewportPoint(p)` (0 to 1, not −1 to 1) |
| NDC → world | `v.unproject(camera)` | `cam.ViewportToWorldPoint(v)` |


---

## Pitfall: Unity's view space looks down −z

Unity's world is **left-handed** with `$+z$` forward. Its `worldToCameraMatrix` uses the **OpenGL convention**, camera looking down `$-z$`: the matrix includes a `$z$` **flip**, determinant `$-1$`.

<div class="tex" role="img" aria-label="a point 5 m in front of a Unity camera:   world forward +z   →   view z = −5">
\[
\text{a point 5 m in front of a Unity camera:} \quad \text{world forward } {+z} \ \to\ \text{view } z = -5
\]
</div>

Hand-building `$V$` from `transform.right`, `up`, `forward` gives the left-handed version; compare against `worldToCameraMatrix` only after negating its third row.


---

## The frustum's planes are rows of P V

Inside the left plane means NDC `$x \ge -1$`, so clip `$x + w \ge 0$`. Clip `$x$` and `$w$` are rows 0 and 3 of `$M = P\,V$` dotted with the world point:

<div class="tex" style="font-size:0.7em" role="img" aria-label="left   = r3 + r0        right = r3 − r0        bottom = r3 + r1
top    = r3 − r1        near  = r3 + r2        far    = r3 − r2
the demo camera:   r2 = (−0.693, −0.440, −0.990, 6.934)
                   r3 = (−0.539, −0.342, −0.770, 7.171)      (row 3 computes w' = depth)
near = r3 + r2 = (−1.232, −0.782, −1.759, 14.105)  ÷ 2.286  →  (−0.539, −0.342, −0.770, 6.171)">
\[
\begin{aligned}
\text{left} &= r_3 + r_0 & \text{right} &= r_3 - r_0 & \text{bottom} &= r_3 + r_1 \\
\text{top} &= r_3 - r_1 & \text{near} &= r_3 + r_2 & \text{far} &= r_3 - r_2
\end{aligned}
\]
\[
\begin{aligned}
\text{the demo camera:}\quad r_2 &= ({-0.693}, {-0.440}, {-0.990}, 6.934) \\
r_3 &= ({-0.539}, {-0.342}, {-0.770}, 7.171) \qquad \text{(row 3 computes } w' = \text{depth)} \\
\text{near} = r_3 + r_2 &= ({-1.232}, {-0.782}, {-1.759}, 14.105) \\
\div\, 2.286 &\to ({-0.539}, {-0.342}, {-0.770}, 6.171)
\end{aligned}
\]
</div>

Divide by the length of `$(a, b, c)$` and `$a x + b y + c z + d$` is a signed distance: the eye gets −1, the target +6.


---

## Frustum planes and culling

<img src="../../textbook/figures/view-frustum-planes.svg" alt="the six frustum planes and three test boxes" style="height:210px">

Six planes, from the rows of `$P\,V$`, each `$n \cdot p + d \ge 0$` inside. Near: `$({-0.539}, {-0.342}, {-0.770}, 6.171)$`, normal = the view direction.

| box | verdict | deciding plane |
| --- | --- | --- |
| `$[-1, 1] \times [-0.5, 1.5] \times [-1, 1]$` | straddles | far: one corner inside, one outside |
| `$[5.5, 6.5] \times [0, 1] \times [-0.5, 0.5]$` | outside | right: even the most inside corner is at −1.127 |
| `$[-0.5, 0.5] \times [0, 1] \times [-8.5, -7.5]$` | outside | far |


---

## Worked: one plane rejects box 2

Right plane, normalized: `$({-0.979}, {-0.203}, 0.005, 4.255)$`. Box 2 is `$[5.5, 6.5] \times [0, 1] \times [-0.5, 0.5]$`.

<div class="tex" style="font-size:0.74em" role="img" aria-label="p-vertex: the corner farthest along the normal, chosen by the normal's signs
   a &lt; 0 → x = 5.5      b &lt; 0 → y = 0      c &gt; 0 → z = 0.5
signed distance = −0.979·5.5 − 0.203·0 + 0.005·0.5 + 4.255 = −1.127">
\[
\begin{aligned}
&\text{p-vertex: the corner farthest along the normal, chosen by the normal's signs} \\
&\qquad a \lt 0 \to x = 5.5, \qquad b \lt 0 \to y = 0, \qquad c \gt 0 \to z = 0.5 \\
&\text{signed distance} = -0.979 \cdot 5.5 - 0.203 \cdot 0 + 0.005 \cdot 0.5 + 4.255 = -1.127
\end{aligned}
\]
</div>

<img src="../../textbook/figures/vwd-pvertex.svg" alt="top view at y = 0, x across and z up: the right plane, normalized (−0.979, −0.203, 0.005, 4.255), as a line near x = 4.35 with its normal pointing inside, toward the target (0, 0.5, 0) at signed distance +4.154; box 2, [5.5, 6.5] by [−0.5, 0.5], lies outside, and its p-vertex (5.5, 0, 0.5), the corner farthest along the normal, is at −1.127" style="height:215px">

Even the box's most-inside corner is 1.127 outside: **reject**, one dot product, no triangle touched. The target `$(0, 0.5, 0)$` scores +4.154 on the same plane.


---

### Moving the camera

<small>(~11 min)</small>

---

## Camera controls are frame edits

- **tumble** (orbit): swing `$\mathit{eye}$` around `$\mathit{at}$` on a sphere: the demo's `az`, `el`
- **track** (pan): slide `$\mathit{eye}$` and `$\mathit{at}$` together
- **dolly**: move `$\mathit{eye}$` along the sightline: the demo's `dist`

Worked dolly, distance 7 to 4: `$\mathit{eye}' = \mathit{at} + 4w = (2.156, 1.868, 3.079)$`. The basis is unchanged; only `$-w \cdot \mathit{eye}'$` changes, from −7.17 to **−4.17**.


---

## Zoom is not dolly

| move | changes | perspective |
| --- | --- | --- |
| **dolly** | the eye `$(V)$` | near things grow faster than far things: the depth relations change |
| **zoom** | the field of view `$(P)$` | the whole image scales about its center: depth relations stay |

A 2× zoom on the demo: `$\mathit{fov}\colon 45^\circ \to 23.4^\circ$`. A 2× dolly: distance `$7 \to 3.5$`. Same subject size, different pictures.


---

## The dolly zoom

Dolly **out** and zoom **in** together, keeping the subject's height constant: `$d \cdot \tan(\mathit{fov}/2) = \text{constant}$`.

<div class="tex" style="font-size:0.78em" role="img" aria-label="d = 5,  fov = 45°:     half-height of the view at the subject = 5 · tan 22.5° = 2.071
d = 10: fov = 2 · atan(2.071 / 10) = 23.4°     the subject stays the same size; the background swells">
\[
\begin{aligned}
d = 5,\ \mathit{fov} = 45^\circ\text{:}\quad & \text{half-height of the view at the subject} = 5 \cdot \tan 22.5^\circ = 2.071 \\
d = 10\text{:}\quad & \mathit{fov} = 2 \cdot \operatorname{atan}(2.071 / 10) = 23.4^\circ \\
& \text{the subject stays the same size; the background swells}
\end{aligned}
\]
</div>

<img src="../../textbook/figures/vwd-dolly-zoom.svg" alt="side view: the subject, half-height 2.071, framed by two cameras, one at distance 5 with fov 45°, one at distance 10 with fov 23.4°; on a background 5 units behind the subject the first sees half-height 4.14, the second 3.11" style="height:270px">

First used on film in Alfred Hitchcock's *Vertigo* (1958), which is why it is often called the Vertigo effect.


---

## Off-axis projection: the window need not be centered

General frustum with near-plane window `$[l, r] \times [b, t]$`:

<div class="tex" style="font-size:0.72em" role="img" aria-label="P = [ 2n/(r−l)    0         (r+l)/(r−l)     0    ]
    [ 0           2n/(t−b)  (t+b)/(t−b)     0    ]
    [ 0           0         A               B    ]
    [ 0           0         −1              0    ]
symmetric (l = −r):  the third column's top entries are 0: the ordinary P
left half of the demo's window (l = −0.7373, r = 0):  P[0][0] = 2.713,  P[0][2] = −1">
\[
P = \begin{bmatrix} \dfrac{2n}{r - l} & 0 & \dfrac{r + l}{r - l} & 0 \\ 0 & \dfrac{2n}{t - b} & \dfrac{t + b}{t - b} & 0 \\ 0 & 0 & A & B \\ 0 & 0 & -1 & 0 \end{bmatrix}
\]
\[
\begin{aligned}
&\text{symmetric } (l = -r)\text{: the third column's top entries are 0: the ordinary } P \\
&\text{left half of the demo's window } (l = -0.7373,\ r = 0)\text{: } P[0][0] = 2.713, \ P[0][2] = -1
\end{aligned}
\]
</div>


---

## Stereo for VR: two off-axis eyes

Two eyes 6.4 cm apart looking at a screen 2 m away: each eye's window is the **same** physical screen, so each frustum is off-axis:

<div class="tex" style="font-size:0.76em" role="img" aria-label="eye offset ±0.032 m   →   left eye's skew entry  P[0][2] = +0.032  (right eye: −0.032)
both frusta meet at the screen plane: objects there have zero disparity">
\[
\begin{aligned}
&\text{eye offset } \pm 0.032\text{ m} \ \to\ \text{left eye's skew entry } P[0][2] = +0.032 \ \text{(right eye: } {-0.032}\text{)} \\
&\text{both frusta meet at the screen plane: objects there have zero disparity}
\end{aligned}
\]
</div>

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

## Worked: the circle of confusion

Thin lens, focal length `$f$`, f-number `$N$`, aperture `$A = f/N$`, focused at `$d_f$`. A point at distance `$d$` blurs to a disk of diameter

<div class="tex" style="font-size:0.72em" role="img" aria-label="c = A · |d − d_f| / d · f / (d_f − f)
f = 50 mm, N = 2.8:   A = 17.86 mm;   d_f = 3 m;   subject at d = 5 m
c = 17.86 · (2000 / 5000) · (50 / 2950) = 0.121 mm   =  20.2 pixels of 6 µm
stop down to f/16:    A = 3.125 mm  →   c = 3.5 pixels
hyperfocal at f/2.8, c_max = 0.03 mm:   H = f² / (N c_max) + f = 29.8 m">
\[
c = A \cdot \frac{\lvert d - d_f \rvert}{d} \cdot \frac{f}{d_f - f}
\]
\[
\begin{aligned}
&f = 50\text{ mm},\ N = 2.8\text{:}\ \ A = 17.86\text{ mm}; \quad d_f = 3\text{ m}; \quad \text{subject at } d = 5\text{ m} \\
&c = 17.86 \cdot (2000 / 5000) \cdot (50 / 2950) = 0.121\text{ mm} = 20.2 \text{ pixels of } 6\ \mu\text{m} \\
&\text{stop down to } f/16\text{:}\ \ A = 3.125\text{ mm} \ \to\ c = 3.5 \text{ pixels} \\
&\text{hyperfocal at } f/2.8,\ c_{\max} = 0.03\text{ mm:}\ \ H = \frac{f^2}{N\,c_{\max}} + f = 29.8\text{ m}
\end{aligned}
\]
</div>

