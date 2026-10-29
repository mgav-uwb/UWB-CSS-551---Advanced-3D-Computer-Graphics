<!--
  CSS 551 · TOPIC DECK: Interaction in 3D: from a pixel to the world (~16 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/interaction-3d.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.

  TEACHES: pixel to normalized device coordinates (pixel centers, the y flip); unprojection, a pixel
  back to a ray, worked on two rays from the view-matrix demo's camera; picking by ray and by ID
  buffer; picking in both tracks; dragging on the ground plane, worked; snapping (hard and soft),
  worked; the arcball (Shoemake 1992); the orbit controller's constants.
  CREATED 2026-10-05 from interactive-loop-tool.md (pixel to NDC, picking, dragging, snapping,
  arcball, orbit) and viewing.md (unprojection, two rays, picking in both tracks), so that the 3D
  interaction follows the matrices it inverts.
  NEEDS:   the viewing topic (V, P, NDC, the viewport transform), the interactive-loop topic (MVC,
           events, the device-pixel pitfall, the drag state machine), the vector-geometry topic (ray
           against plane) and the rotation topic (axis-angle). Mount it after the viewing topic.
  DEMOS:   none (figures).
  NUMBERS: textbook/interaction.html (Sections 5, 6, 8, 9; Exercise 1), textbook/figures/numbers-pipeline.json
           (key view), lib/core/orbit-camera.js; node against lib/core/xform.js.
  FIGURES: ../../textbook/figures/ui-{picking,arcball}.svg (tools/gen-textbook-figures-systems.mjs);
           uid-{pixel-ndc,ground-drag,snap}.svg (tools/gen-lecture-figures-interaction.mjs).
  READING: ../../textbook/interaction.html, Sections 5, 6, 8 and 9.

  EDIT 2026-10-08: the picking code in Unity/WebGL code tabs.
  EDITED 2026-10-29 (Marcel: MathJax formulas instead of ASCII, and vector illustrations, the ASCII kept as
  alt text, as in CSS 343): every formula and worked block typeset (display blocks and inline `$…$`), the
  ASCII kept as each block's aria-label; three figures: a pixel's center to NDC with the y flip, the ground
  drag in the ray's vertical plane, hard and soft snapping (the snapping cases are the figure, its alt the
  old ASCII). Numbers unchanged, recomputed in the generator.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Display math is a raw <div class="tex"> block typeset by MathJax
  (lib/deck-math.js; TeX inside, ASCII as aria-label, no blank line inside); an inline
  formula is a code span written `$…$`; diagrams are SVG figures from a generator, the
  ASCII as alt text. Speaker notes stay plain text. Never two "_" on one markdown line
  outside a code span or fence. Paths are relative to the lecture page.
-->

### Interaction in 3D: from a pixel to the world

<small>(~16 min) · reading: <a href="../../textbook/interaction.html">Interactive Systems</a>, Sections 5, 6, 8 and 9</small>


---

## From a pixel to normalized device coordinates

Picking runs the viewport transform backward, from a pixel's center:

<div class="tex" style="font-size:0.72em" role="img" aria-label="   s_x = 2 (px + ½) / W − 1           s_y = 1 − 2 (py + ½) / H        (pixel centers; y flips)
   1920 × 1080, pixel (960, 270):   s_x = 2 · 960.5 / 1920 − 1 = 0.0005    s_y = 1 − 2 · 270.5 / 1080 = 0.499">
\[ s_x = \frac{2\,(p_x + \frac{1}{2})}{W} - 1 \qquad s_y = 1 - \frac{2\,(p_y + \frac{1}{2})}{H} \qquad (y \text{ flips}) \]
\[ \begin{aligned} W \times H = 1920 \times 1080,\ \text{pixel } (960, 270)\text{:} \quad s_x &= 2 \cdot 960.5 / 1920 - 1 = 0.0005 \\ s_y &= 1 - 2 \cdot 270.5 / 1080 = 0.499 \end{aligned} \]
</div>

<img src="../../textbook/figures/uid-pixel-ndc.svg" alt="Left: a 150 by 150 pixel window, rows counting down from (0, 0) at the top left; pixel (89, 62), zoomed, has its corner at (89, 62) and its center, half a pixel in, at (89.5, 62.5). Scale to [−1, 1] and flip y. Right: the NDC square from (−1, −1) to (1, 1) with y up; the same center lands at (0.1933, 0.1667). 150 × 150, pixel (89, 62): s_x = 0.1933, s_y = 0.1667." style="height:202px">

- the result runs from `$-1$` to `$1$`, `$y$` **up**, whatever the window's size
- the figure's pixel is the one the picking ray passes through


---

## Unprojection: a pixel back to a ray

Invert the chain for a pixel at NDC `$(x, y)$`: the view-space direction through it is

<div class="tex" role="img" aria-label="   d_view = ( x / P[0][0],   y / P[1][1],   −1 ) = ( x · aspect · tan(fov/2),  y · tan(fov/2),  −1 )
   d_world = x' u + y' v − w          (rotate by the camera's axes), then normalize
   ray:  eye + t · d_world">
\[ \begin{aligned} d_{\text{view}} &= \big( x / P[0][0],\ y / P[1][1],\ {-1} \big) \\ &= \big( x \cdot \text{aspect} \cdot \tan(\text{fov}/2),\ y \cdot \tan(\text{fov}/2),\ {-1} \big) \\ d_{\text{world}} &= x' u + y' v - w \quad \text{(rotate by the camera's axes), then normalize} \\ \text{ray: } &\ \text{eye} + t\, d_{\text{world}} \end{aligned} \]
</div>

This is the first line of every ray tracer and every mouse pick.


---

## Worked: two rays from the demo's camera

<div class="tex" style="font-size:0.72em" role="img" aria-label="   center pixel, NDC (0, 0):   d_view = (0, 0, −1)          d_world = −w = (−0.539, −0.342, −0.770)
   top-right corner, NDC (1, 1):
       d_view = (1 / 1.3563, 1 / 2.4142, −1) = (0.737, 0.414, −1)
       d_world = 0.737 u + 0.414 v − w = (−0.016, 0.047, −1.309)   →   normalized (−0.012, 0.036, −0.999)">
\[ \begin{aligned} \text{center pixel, NDC } (0, 0)\text{:} \quad & d_{\text{view}} = (0, 0, {-1}) \\ & d_{\text{world}} = -w = ({-0.539}, {-0.342}, {-0.770}) \\[6pt] \text{top-right corner, NDC } (1, 1)\text{:} \quad & d_{\text{view}} = (1 / 1.3563,\ 1 / 2.4142,\ {-1}) = (0.737, 0.414, {-1}) \\ & d_{\text{world}} = 0.737\, u + 0.414\, v - w = ({-0.016}, 0.047, {-1.309}) \\ & \phantom{d_{\text{world}}} \to \text{normalized } ({-0.012}, 0.036, {-0.999}) \end{aligned} \]
</div>

The center ray points straight down the sightline at the target; the corner ray leans by half the field of view in each direction.


---

## Picking in 3D: a ray from the mouse

<img src="../../textbook/figures/ui-picking.svg" alt="A perspective sketch: the eye at (3, 3, 6) with a small orange near-plane rectangle in front of it, a red ray to a hit point on a blue sphere at the origin labeled with t = 6.23, and a dashed green ray landing on a grid ground plane at (0.5, 0, 1.63)." style="max-height: 330px; width: auto;">

The clicked pixel becomes a **ray** from the eye; the nearest hit is the picked object (here the sphere at `$t = 6.23$`). The alternative: render object **IDs** as colors and read back one pixel.


---

## Picking in both tracks

<div class="code-tabs">

```csharp
// screen pixels (origin bottom left) straight to a ray
Ray r = cam.ScreenPointToRay(Input.mousePosition);
if (Physics.Raycast(r, out RaycastHit hit)) Debug.Log(hit.point);
```

```javascript
// NDC from the mouse, then a ray from the camera
const ndc = new THREE.Vector2((e.clientX / w) * 2 - 1, -(e.clientY / h) * 2 + 1);
raycaster.setFromCamera(ndc, camera);
const hits = raycaster.intersectObjects(scene.children);
```

</div>


---

## Dragging on the ground, worked

A mouse position has two numbers; a world position has three. Add a **constraint**: the ground plane `$y = 0$`.

<div class="tex" style="font-size:0.74em" role="img" aria-label="   eye o = (3, 3, 6), ray through pixel (60, 110): d = (−0.426, −0.512, −0.746)
   reach y = 0:  t = −o_y / d_y = 3 / 0.512 = 5.861
   point:        o + t·d = (0.501, 0, 1.629)">
\[ \text{eye } o = (3, 3, 6), \quad \text{ray through pixel } (60, 110)\text{: } d = ({-0.426}, {-0.512}, {-0.746}) \]
\[ \text{reach } y = 0\text{: } t = -o_y / d_y = 3 / 0.512 = 5.861, \qquad \text{point: } o + t\, d = (0.501, 0, 1.629) \]
</div>

<img src="../../textbook/figures/uid-ground-drag.svg" alt="Side view in the ray's vertical plane: the eye o = (3, 3, 6) at height 3 above the ground line y = 0; the ray drops 0.512 per unit of t and lands after t = 3 / 0.512 = 5.861, at (0.501, 0, 1.629); a dashed ray aimed above the horizon never lands." style="height:280px">

As the mouse moves, the intersection slides along the plane, and the object follows.


---

## Snapping, worked

Round the dragged value `$x$` to the nearest multiple of the grid `$g$`:

<div class="tex" role="img" aria-label="x' = g · round(x / g)        soft: x' only if |x − x'| ≤ r, else x">
\[ x' = g \cdot \operatorname{round}(x / g) \qquad \text{soft, radius } r\text{: } x' \text{ only if } \lvert x - x' \rvert \le r\text{, else } x \]
</div>

<img src="../../textbook/figures/uid-snap.svg" alt="   0.25 grid:   1.37 → 1.25     1.13 → 1.25     2.5 → 2.5
   15° grid:    37° → 30°       52.4° → 45°     97° → 90°
   soft snap, radius 0.05:   1.28 is 0.03 from 1.25 → snaps        1.37 is 0.12 away → moves freely" style="height:298px">

Snapping to other objects' vertices is the same test against a list of candidates: the closest within the radius wins.


---

## Turning an object: the arcball

<img src="../../textbook/figures/ui-arcball.svg" alt="Left: a unit circle in the window with two red mouse points at (0.2, 0.1) and (0.5, 0.3) joined by a blue arc, and a gray point outside the circle projected to its rim. Right: the sphere in profile with the two points at heights z = 0.975 and 0.812." style="max-height: 230px; width: auto;">

Lift the mouse onto a sphere and drag `$(0.2, 0.1)$` to `$(0.5, 0.3)$` (Shoemake, 1992):

<div class="tex" role="img" aria-label="(x, y) becomes (x, y, √(1 − x² − y²))
p1 = (0.2, 0.1, 0.975), p2 = (0.5, 0.3, 0.812)
axis = normalize(p1 × p2) = (−0.545, 0.838, 0.026)
angle = arccos(p1 · p2) = 22.8°">
\[ \begin{aligned} (x, y) &\mapsto \big( x, y, \sqrt{1 - x^2 - y^2} \big) \\ p_1 &= (0.2, 0.1, 0.975), \quad p_2 = (0.5, 0.3, 0.812) \\ \text{axis} &= \operatorname{normalize}(p_1 \times p_2) = ({-0.545}, 0.838, 0.026) \\ \text{angle} &= \arccos(p_1 \cdot p_2) = 22.8^\circ \end{aligned} \]
</div>


---

## Orbiting: the demos' camera controller

- horizontal drag: yaw **0.4° per pixel**, so a **90-pixel** drag turns **36°**
- vertical drag: pitch, clamped short of the poles, so the horizon never flips
- wheel: the distance times **1.12** per notch out, **0.88** per notch in; five notches out is `$1.12^5 = 1.76$`, five in `$0.88^5 = 0.53$`
- an orbit **cannot roll**: right for inspecting an object, where the arcball is right for turning one in the hand

