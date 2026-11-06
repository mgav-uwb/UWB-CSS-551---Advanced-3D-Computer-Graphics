<!--
  CSS 551 · TOPIC DECK: Texture coordinates, detail without geometry (~43 min, 28 slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/texture-coordinates.md"> among others; no
  lecture logistics, no "Part N" numbering.

  TEACHES: a texture as a lookup from (u, v) to a color; UV space on [0,1]²; UVs as
  a per-vertex attribute on the 2×2 grid; barycentric interpolation of UVs (the midpoint
  and the weights (0.2, 0.5, 0.3)); wrap modes (1.3 → 0.3, 1.0 or 0.7); where coordinates
  come from: planar, cylindrical and spherical projections worked on one point ((1.0, 0.8),
  (0.086, 1.2), (0.086, 0.779)), the seam (u 0.0016 against 0.9984), the vertex split,
  charts and atlases with gutters; the placement matrix T(off)·T(c)·S·R·T(−c) with both
  worked cases ([2,0,−0.5] and [1.41,1.41,−0.66]); fur and hair as detail that leaves the
  surface: Kajiya-Kay texels, shells and fins, tangent lighting, explicit strands.
  NEEDS:   the affine topic (homogeneous matrices, rotate about a pivot); the
           meshes topic (the 2×2 grid, vertex attributes, the hard-edge split); the
           rasterization topic (barycentric weights, perspective-correct interpolation).
  COMPANIONS: texture-sampling.md picks up at the lookup (filtering, mipmaps, bump
           and normal maps, cube and shadow maps); this topic does not depend on it.
           texture-coordinates-supplement.md (distortion, hair at film scale) is mounted
           after the lecture's wrap.
  DEMOS:   data-demo="uv-placement" data-controls="offU,tile";
           data-demo="fur" data-controls="lightAz" (under the page's crop).
  FIGURES: ../../textbook/figures/tex-uv-grid.svg, tex-wrap-modes.png, tex-placement.png
           (textbook generators); texd-uv-square, texd-lookup, texd-interp, texd-seam,
           texd-seam-split, texd-pivot, texd-placement-steps (tools/gen-lecture-figures-textures.mjs,
           every number computed and asserted there).
  NUMBERS: textbook/figures/numbers-surfaces.json (tex.*); projections and seam
           from textbook/texture-mapping.html Section 2, recomputed by node.

  Split from texture-mapping.md (2026-10-06, archived in topics/archive/): the
  coordinate and placement stages and the fur and hair stretch; the sampling
  stage moved to texture-sampling.md, the strand simulation to the physics topic.

  EDIT 2026-10-08: the "Why" title renamed ("Fur: what a flat texture cannot do").
  EDIT 2026-11-05 (Marcel, "polish L11"; "also apply formula and illustration improvements"):
  every formula typeset, ASCII drawings replaced by figures with the ASCII as alt text; the
  general barycentric case worked beside the midpoint; "Detail is expensive" and "A texture is
  an image" merged, "Repeat vs clamp" merged into the wrap modes (mirror's values added), "Meet
  the demo" moved to the live slide's note; "Distortion" and "Hair at film scale" moved to the
  supplement (33 slides to 28); the atlas arithmetic now leaves room for its gutters; notes
  pointing at slides that no longer exist removed.

  reveal.js: FLAT; notes follow "Note:" and stay plain text. Display math is a raw <div class="tex">
  block typeset by MathJax (lib/deck-math.js; TeX inside, the ASCII form as aria-label, no blank line
  inside); inline math is a code span written `$...$`. Code identifiers stay plain code spans. Never
  two "_" on one markdown line outside a code fence or code span; paths relative to the lecture page.
-->

### Texture coordinates: detail without geometry

<small>(~43 min) · reading: <a href="../../textbook/texture-mapping.html">Texture Mapping</a>, Sections 1 to 4</small>


---

## Detail is expensive in triangles

Modeling a brick wall as geometry gives every mortar line and chip its own triangles: **millions** of them, to draw a picture that never changes shape.

Instead, take a **2D image**, the **texture**, and glue it onto the surface: each surface point picks up the color of the image at the spot it is glued to.

- **geometry** sets the shape: a few big triangles
- **appearance** comes from the image, at no extra geometry; one image can wrap a wall, a character or a planet
- the question the rest of this topic answers: **which image point lands on which surface point?**


---

## UV space: the image has its own coordinates

The image lives in its own 2D system, axes **u** and **v** (some write s and t), **normalized** to the unit square:

<img src="../../textbook/figures/texd-uv-square.svg" alt="   v
   1 ┌───────────────┐   (1,1) = far corner of the image
     │               │
     │    texture    │   any point in the image is (u, v)
     │   (the image) │   with 0 ≤ u ≤ 1 and 0 ≤ v ≤ 1
     │               │
   0 └───────────────┘
     0               1  u
An 8 by 8 and a 32 by 32 checker share the square: (0.25, 0.75) is texel (2, 6) of one and texel (8, 24) of the other." style="height:300px">

The same `$(u, v)$` addresses **any** image, whatever its size: a texel index is `$\lfloor u \cdot \text{width} \rfloor$`.


---

## The lookup pipeline

Texturing is a **lookup**: a coordinate goes in, a color comes out.

<img src="../../textbook/figures/texd-lookup.svg" alt="   per-vertex UV         placement           sampling
   (u,v) on each   →   transform the   →   read the image
   vertex              UVs                 at (u,v)
One coordinate through it: interpolated (0, 0.25); the tile 2 matrix gives (−0.5, 0); repeat wrap gives (0.5, 0), texel (4, 0) of the 8 by 8 checker." style="height:256px">

- **UVs**: every vertex carries a `$(u, v)$`, interpolated across each triangle, so every drawn pixel has its own
- **placement**: a 3×3 matrix **moves, rotates and tiles** the image by transforming those `$(u, v)$`
- **sampling**: the sampler turns the final `$(u, v)$` into a texel color


---

### UV coordinates

<small>(~9 min)</small>

---

## A UV is a per-vertex attribute

A texture coordinate is stored **exactly like a position or a normal**, in a parallel array:

| vertex `$i$` | | |
| ------ | --- | --- |
| position | `$p_i = (x, y, z)$` | where it is |
| normal | `$n_i = (n_x, n_y, n_z)$` | which way it faces |
| texture coordinate | `$uv_i = (u, v)$` | where on the image |

Inside a triangle, the UV is **interpolated** with the barycentric weights of the rasterization topic, like any other attribute:

<div class="tex" role="img" aria-label="uv = w0 uv0 + w1 uv1 + w2 uv2,    w0 + w1 + w2 = 1">
\[
uv = w_0\, uv_0 + w_1\, uv_1 + w_2\, uv_2, \qquad w_0 + w_1 + w_2 = 1
\]
</div>

So three authored corners give **every pixel** its own `$(u, v)$`, and thus its own texel.


---

## Assign UVs to the 2×2 grid

The meshes topic's grid, the image once across it: `$(u, v) = (\text{col}/2,\ \text{row}/2)$`.

<img src="../../textbook/figures/tex-uv-grid.svg" alt="              col 0        col 1        col 2
   row 0    (0.0, 0.0)   (0.5, 0.0)   (1.0, 0.0)
   row 1    (0.0, 0.5)   (0.5, 0.5)   (1.0, 0.5)
   row 2    (0.0, 1.0)   (0.5, 1.0)   (1.0, 1.0)" style="height:340px">

Grid corners take the unit square's corners; the center vertex `v4` lands at `$(0.5, 0.5)$`.


---

## Interpolation, worked

Take `tri0 = (0, 3, 1)` from the grid's split, with corner UVs `$(0, 0)$`, `$(0, 0.5)$`, `$(0.5, 0)$`:

<img src="../../textbook/figures/texd-interp.svg" alt="tri0 on the mesh, corners v0 (−1.5, −1.5), v3 (−1.5, 0), v1 (0, −1.5), and in the image, corners (0, 0), (0, 0.5), (0.5, 0). The midpoint of edge (0, 3) is (−1.5, −0.75) on the mesh and (0, 0.25) in the image. Weights (0.2, 0.5, 0.3) give (−1.05, −0.75) on the mesh and (0.15, 0.25) in the image." style="height:296px">

<div class="tex" style="font-size:0.72em" role="img" aria-label="midpoint of edge (0, 3):       ½·(0, 0) + ½·(0, 0.5) = (0, 0.25)
weights (0.2, 0.5, 0.3):      0.2·(0, 0) + 0.5·(0, 0.5) + 0.3·(0.5, 0) = (0.15, 0.25)">
\[
\begin{aligned}
\text{midpoint of edge } (0, 3): &\quad \tfrac12 (0, 0) + \tfrac12 (0, 0.5) = (0,\ 0.25) \\
\text{weights } (0.2, 0.5, 0.3): &\quad 0.2\,(0, 0) + 0.5\,(0, 0.5) + 0.3\,(0.5, 0) = (0.15,\ 0.25)
\end{aligned}
\]
</div>


---

## Outside the unit square: wrap modes

A UV need not stay in `$[0, 1]$`; tiling makes such values on purpose. The texture's **wrap mode** picks what comes back:

<img src="../../textbook/figures/tex-wrap-modes.png" style="height:150px; image-rendering:pixelated" alt="Three strips of the same 4 by 4 checker with one red texel, sampled for u from −1 to 3: repeat shows four identical copies, clamp smears the edge columns into bands, mirror alternates flipped copies." style="height:140px">

<small>top to bottom: repeat, clamp, mirror; `$u$` from −1 to 3</small>

| mode | rule | `$u = 1.3$` | `$u = -0.2$` | |
| ---- | ---- | ----------- | ------------ | --- |
| **repeat** | `$u - \lfloor u \rfloor$` | 0.3 | 0.8 | the image tiles |
| **clamp** | `$\min(\max(u, 0), 1)$` | 1.0 | 0 | the border texel smears |
| **mirror** | every other copy flips | 0.7 | 0.2 | tiles meet with no seam |

Under repeat, `$1.3$` is 30 % into the **second** copy. The demo uses repeat.


---

### Where coordinates come from

<small>(~8 min)</small>


---

## Three projections, one point

Each is a formula on the vertex position `$p = (x, y, z)$`, applied per vertex, with

<div class="tex" style="font-size:0.74em" role="img" aria-label="r = |p|,   θ = atan2(z, x)  (longitude),   φ = asin(y / r)  (latitude)">
\[
r = |p|, \qquad \theta = \operatorname{atan2}(z, x) \ \text{ (longitude)}, \qquad \phi = \arcsin(y / r) \ \text{ (latitude)}
\]
</div>

| projection | `$(u, v)$` | at `$p = (0.5, 0.7, 0.3)$` | |
| ---------- | ---------- | -------------------------- | --- |
| planar, onto the ground | `$(x, z) + (0.5,\ 0.5)$` | `$(1.0,\ 0.8)$` | on the square's right edge |
| cylindrical | `$(\theta / 2\pi,\ y) + (0,\ 0.5)$` | `$(0.086,\ 1.2)$` | above the square: scale `$y$` to the model first |
| spherical | `$(\theta / 2\pi,\ \phi / \pi + \tfrac12)$` | `$(0.086,\ 0.779)$` | |

The point: `$r = 0.911$`, `$\theta = 31.0^\circ$`, `$\phi = 50.2^\circ$`.


---

## The seam: neighbors on opposite edges

Any projection that **wraps** has a line where `$u$` jumps from 1 back to 0:

<img src="../../textbook/figures/texd-seam.svg" alt="   a = (0.999, 0,  0.01)   →   u = 0.0016
   b = (0.999, 0, −0.01)   →   u = 0.9984          a and b are 0.02 apart in space
A thin triangle from b to a interpolates u from 0.9984 down to 0.0016: the whole image, backwards. Across the seam the same surface should read u from 0.9984 through 1 = 0 to 0.0016, only 0.32 % of the image." style="height:290px">

- a triangle with corners at `$a$` and `$b$` shows almost the **whole texture, backwards**, in one thin strip: the streak at `$\theta = 0$` on every spherically mapped model
- at the **poles** a whole row of texels lands on one vertex: the map **pinches**


---

## The fix: split the seam's vertices

A vertex holds **one** UV. Where the seam needs two, store the position **twice**:

<img src="../../textbook/figures/texd-seam-split.svg" alt="   a cylinder of 5 rings × 16 steps, unrolled:
   80 vertices if u could wrap: the last quads run from column 15, u = 0.9375, back to column 0, u = 0
   85 with the seam column duplicated: column 16 has column 0's positions and normals, with u = 1" style="height:224px">

- one copy with `$u$` near **0**, for the triangles on one side; one copy with `$u$` near **1**, for the other
- same position, same normal, different UV

The same split the meshes topic makes for a **hard edge**: one position, two normals.


---

## Unwrapping: cut, flatten, pack

For a general mesh no formula is good everywhere, so the tool **cuts** it:

- **seams** are chosen where they will not be seen (under the arm, along the back)
- each piece, a **chart**, is flattened into the plane with as little stretch as possible
- the charts are **packed** into one image, the **atlas**: a 4 × 4 layout gives each of 16 charts 256 × 256 texels of a 1024 × 1024 texture
- a **gutter** of a few texels, taken from that space, separates the charts, because a filtered lookup reads **neighboring** texels and would mix two charts

Least Squares Conformal Maps (Lévy and others, 2002) is the common flattening: it preserves angles as well as it can.


---

### Placement transforms

<small>(~12 min)</small>

---

## Placing = transforming the UVs

To **slide**, **spin** or **tile** the image, leave the geometry alone and transform the UVs before the lookup:

<img src="../../textbook/figures/tex-placement.png" alt="Three renderings of the 8 by 8 checker on a quad: the identity placement; tile 2, with twice the checks per side; offset 0.25, rotate 45°, tile 2, with the checks turned into diamonds." style="height:188px">

<small>identity · tile 2 · offset 0.25, rotate 45°, tile 2</small>

- **offset** `$(\text{off}_u, \text{off}_v)$` slides the image; **rotation** spins it about a point
- **tile**: a factor above 1 makes the image **repeat** more (with repeat wrap)
- all three are one **2D transform of `$(u, v)$`**: what the affine topic built in 3D, one dimension smaller


---

## It is the affine matrix, now 3×3

Write `$(u, v)$` as `$(u, v, 1)$`, the homogeneous trick one dimension down:

<div class="tex" role="img" aria-label="     ┌ a  b  tx ┐   ┌ u ┐
M =  │ c  d  ty │ · │ v │
     └ 0  0  1  ┘   └ 1 ┘">
\[
M \begin{pmatrix} u \\ v \\ 1 \end{pmatrix} =
\begin{pmatrix} a & b & t_x \\ c & d & t_y \\ 0 & 0 & 1 \end{pmatrix}
\begin{pmatrix} u \\ v \\ 1 \end{pmatrix}
\]
</div>

- `$a, b, c, d$`: rotate and scale (the 2×2 block)
- `$t_x, t_y$`: translation (the offset)
- bottom row `$0\ \ 0\ \ 1$`: homogeneous
- 3D placement used a **4×4** on `$(x, y, z, 1)$`; UV placement uses a **3×3** on `$(u, v, 1)$`


---

## Rotate and scale about the UV center

A bare rotation pivots about the **corner** `$(0, 0)$`, and the image swings away. Pivot about the **center** `$c = (0.5, 0.5)$` with the affine topic's sandwich:

<img src="../../textbook/figures/texd-pivot.svg" alt="   1. T(−c)   move the center to the origin        c = (0.5, 0.5)
   2. R       rotate (and scale) about the origin
   3. T(+c)   move the center back
Rotating the unit square by 45° alone sends its center to (0.71, 0); with T(c) · R · T(−c) the center stays at (0.5, 0.5)." style="height:300px">

<div class="tex" role="img" aria-label="T(c) · R · T(−c): 1. T(−c) center to origin, 2. R rotate, 3. T(c) center back">
\[
T(c)\, R\, T(-c): \quad \text{center to the origin, rotate (and scale), center back}
\]
</div>


---

## The placement matrix, assembled

Offset, plus rotate-and-scale about the center, read right to left:

<div class="tex" role="img" aria-label="M = T(off) · T(c) · S · R · T(−c)          c = (0.5, 0.5)">
\[
M = T(\text{off})\, T(c)\, S\, R\, T(-c), \qquad c = (0.5,\ 0.5)
\]
</div>

<img src="../../textbook/figures/texd-placement-steps.svg" alt="     T(−c)  recenter: move (0.5,0.5) to origin
     R      rotate about the origin (UV convention)
     S      scale by the tile factor
     T(c)   move the center back
     T(off) finally slide by the offset
The corner (1, 1) goes to (0.5, 0.5), (0.71, 0), (1.41, 0), (1.91, 0.5), (2.16, 0.5). The center (0.5, 0.5) goes to (0, 0), (0, 0), (0, 0), (0.5, 0.5), (0.75, 0.5)." style="height:232px">

<small>offset 0.25, rotate 45°, tile 2. Red: the corner `$(1, 1)$`. Orange: the center. Dashed: the unit square.</small>

The offset goes **last**, outside the sandwich. This is the composition three.js pins for a texture matrix, so our `uvMat3` matches the engine element for element.


---

## Worked matrix: the defaults

At the demo's defaults, no offset, no rotation, tile = 2, the matrix is pure scale about the center:

<div class="tex" role="img" aria-label="offU = 0, offV = 0, rot = 0°, tile = 2
     ┌  2.00   0.00  −0.50 ┐
M =  │  0.00   2.00  −0.50 │
     └  0.00   0.00   1.00 ┘">
\[
M = \begin{pmatrix} 2.00 & 0.00 & {-0.50} \\ 0.00 & 2.00 & {-0.50} \\ 0.00 & 0.00 & 1.00 \end{pmatrix}
\]
</div>

- `$2.00$` on the diagonal is the tile factor: UVs double, so with repeat wrap the checker fits **twice** on each axis
- `$-0.50$` keeps the doubling centered on `$(0.5, 0.5)$`: `$(1 - 2) \times 0.5$`, the sandwich in numbers
- `$(0.5, 0.5)$` maps to itself; the corner `$(1, 1)$` maps to `$(1.5, 1.5)$`


---

## Worked matrix: offset, rotate, tile

Offset the U by 0.25, rotate 45°, tile 2:

<div class="tex" style="font-size:0.74em" role="img" aria-label="offU = 0.25, offV = 0, rot = 45°, tile = 2      (cos45° = sin45° = 0.7071)
     ┌  1.41   1.41  −0.66 ┐
M =  │ −1.41   1.41   0.50 │
     └  0.00   0.00   1.00 ┘
tx = 0.5 − 2 (0.7071·0.5 + 0.7071·0.5) + 0.25 = −0.66
ty = 0.5 − 2 (−0.7071·0.5 + 0.7071·0.5) = 0.50">
\[
\begin{gathered}
M = \begin{pmatrix} 1.41 & 1.41 & {-0.66} \\ {-1.41} & 1.41 & 0.50 \\ 0.00 & 0.00 & 1.00 \end{pmatrix}
\qquad R = \begin{pmatrix} \cos & \sin \\ {-\sin} & \cos \end{pmatrix}, \quad \cos 45^\circ = \sin 45^\circ = 0.7071 \\[8pt]
\begin{aligned}
t_x &= 0.5 - 2\,(0.7071 \cdot 0.5 + 0.7071 \cdot 0.5) + 0.25 = -0.66 \\
t_y &= 0.5 - 2\,({-0.7071} \cdot 0.5 + 0.7071 \cdot 0.5) = 0.50
\end{aligned}
\end{gathered}
\]
</div>

- the 2×2 block is `$\text{tile} \cdot R$`: rotation **and** tile together, `$2 \times 0.7071 = 1.41$`
- the last column is the sandwich's correction with the `$+0.25$` folded into `$t_x$`
- every cell is one of the three knobs


---

<!-- .slide: class="demo-full" -->

## The placement, live

<div class="cockpit" data-demo="uv-placement" data-controls="offU,tile"><pre class="viz-fallback">  model {offU, offV, rot, tile} → uvMat3 → texture.matrix (checker on a quad)
  -- defaults: offU = 0, offV = 0, rot = 0°, tile = 2 -----------------------
     texture.matrix (row-major, matches the panel, 2 dp):
        [  2.00   0.00  -0.50
           0.00   2.00  -0.50
           0.00   0.00   1.00 ]
     tile = 2 → the checker repeats 2× on each axis (repeat wrap)
     drag offU → the checker slides (translation cell moves);
     drag tile → more/fewer squares (diagonal scales)</pre></div>


---

### Beyond the surface: fur and hair

<small>(~10 min) · reading: <a href="../../textbook/animation.html">Animation</a>, Section 14</small>


---

## Fur: what a flat texture cannot do

- a texture changes the **color** (or the normal) of a surface point; the surface stays where it is
- fur is **volume**: thousands of hairs standing off the surface, with gaps you see through
- at the **silhouette** a painted fur texture shows a hard edge where real fur is fuzzy
- a bump or normal map fakes relief **facing** you, and fails edge-on for the same reason


---

## Kajiya and Kay: textures in 3D

Kajiya and Kay (SIGGRAPH 1989, "Rendering Fur with Three Dimensional Textures"):

- fill a thin **volume** over the surface with **texels**: tiny 3D textures
- each texel stores **density** (how much fur is here), a **direction** (which way the hairs run) and a **lighting frame**
- render by **marching rays** through the volume, accumulating color and opacity
- their example: a **furry teddy bear**, ray traced


---

## Shells: fur as a stack of textures

Lengyel, Praun, Finkelstein and Hoppe (I3D 2001): the real-time version.

- draw the surface several times, each copy **pushed out** along its normals: **shells**
- each shell carries a 2D texture that is **opaque where a hair crosses** that height and transparent elsewhere
- stacked, the dots line up into hairs; **fins** (thin quads at the silhouette) fix the edge-on view
- 16 to 32 shells are enough to read as fur on a GPU


---

## Lighting a hair: the tangent, not the normal

A hair is a thin **cylinder**; it has no single normal. Kajiya and Kay light it by its **tangent** `$T$`, the direction the hair runs:

<div class="tex" role="img" aria-label="diffuse   =  sin(T, L)  =  √(1 − (T·L)²)
specular  =  (sin(T, L) sin(T, V) − (T·L)(T·V))^p
light 60° off the hair (T·L = 0.5):   diffuse √0.75 = 0.866
light along the hair   (T·L = 1):     diffuse 0">
\[
\begin{gathered}
\begin{aligned}
\text{diffuse} &= \sin(T, L) = \sqrt{1 - (T \cdot L)^2} \\
\text{specular} &= \bigl(\sin(T, L)\, \sin(T, V) - (T \cdot L)(T \cdot V)\bigr)^p
\end{aligned} \\[8pt]
\begin{aligned}
\text{light } 60^\circ \text{ off the hair } (T \cdot L = 0.5): &\quad \text{diffuse } \sqrt{0.75} = 0.866 \\
\text{light along the hair } (T \cdot L = 1): &\quad \text{diffuse } 0
\end{aligned}
\end{gathered}
\]
</div>

- brightest with the light **across** the hair, dark with it **along** the hair
- the highlight is a **band** that slides along the strands as the light moves


---

<!-- .slide: class="demo-full" -->

## The fur, live: explicit strands

<div class="cockpit" data-demo="fur" data-controls="lightAz"><pre class="viz-fallback">  the Stanford bunny grown with 100,000 hairs, 5 segments each, Kajiya-Kay lit
  controls:  light azimuth (instant, a shader uniform); in the full demo also elevation,
             shine, root darkening (instant) and hairs, length, gravity, curl (regrow)
  readout:   light direction, hairs, segments, vertices, regrow time, draw time</pre></div>

