<!--
  CSS 551 · TOPIC DECK: Texture coordinates, detail without geometry (~45 min, 33 slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/texture-coordinates.md"> among others; no
  lecture logistics, no "Part N" numbering.

  TEACHES: a texture as a lookup from (u, v) to a color; UV space on [0,1]²; UVs as
  a per-vertex attribute on the 2×2 grid; barycentric interpolation of UVs; wrap
  modes (1.3 → 0.3 or 1.0); where coordinates come from: planar, cylindrical and
  spherical projections worked on one point ((1.0, 0.8), (0.086, 1.2), (0.086, 0.779)),
  the seam (u 0.0016 against 0.9984), the vertex split, charts and atlases with
  gutters, the stretch 1/cos φ of a spherical map; the placement matrix
  T(off)·T(c)·S·R·T(−c) with both worked cases ([2,0,−0.5] and [1.41,1.41,−0.66]);
  fur and hair as detail that leaves the surface: Kajiya-Kay texels, shells and
  fins, tangent lighting, explicit strands, Brave.
  NEEDS:   the affine topic (homogeneous matrices, rotate about a pivot); the
           meshes topic (the 2×2 grid, vertex attributes, the hard-edge split); the
           vector-geometry topic (barycentric weights).
  COMPANION: texture-sampling.md picks up at the lookup (filtering, mipmaps, bump
           and normal maps, cube and shadow maps); this topic does not depend on it.
  DEMOS:   data-demo="uv-placement" data-controls="offU,tile";
           data-demo="fur" data-controls="lightAz" (under the page's crop).
  FIGURES: ../../textbook/figures/tex-uv-grid.svg (textbook generators).
  NUMBERS: textbook/figures/numbers-surfaces.json (tex.*); projections and seam
           from textbook/texture-mapping.html Section 2, recomputed by node.

  Split from texture-mapping.md (2026-10-06, archived in topics/archive/): the
  coordinate and placement stages and the fur and hair stretch; the sampling
  stage moved to texture-sampling.md, the strand simulation to the physics topic.

  EDIT 2026-10-08: the "Why" title renamed ("Fur: what a flat texture cannot do").

  reveal.js: FLAT; notes follow "Note:"; plain unicode math; never two "_" on one
  markdown line outside a code fence. Paths relative to the lecture page.
-->

### Texture coordinates: detail without geometry

<small>(~45 min)</small>


---

## Detail is expensive in triangles

A mesh is **geometry**: vertices and triangles. To make a mesh look like a **brick wall** that way, every mortar line and chip would need its own triangles: a flat wall could balloon to **millions** of them, all to draw a picture that never changes shape.

- geometry sets the **shape**; the bumps and colors of a real surface are mostly **not** shape
- the GPU already draws one flat quad almost for free: the cost is in the **count** of triangles

There should be a way to add surface **detail** without adding surface **geometry**.


---

## A texture is an image glued to a surface

Take a **2D image**, the **texture**, and glue it onto the surface: as the surface is drawn, each point picks up the color of the image at the spot it is glued to.

- the surface keeps its (cheap) geometry: a few big triangles
- the **appearance** comes from the image: as detailed as you like at **no extra geometry**
- one image can wrap a whole wall, a whole character, a whole planet

The real question: **which image point lands on which surface point?**, the heart of texture mapping.


---

## UV space: the image has its own coordinates

The image lives in its **own 2D coordinate system**, independent of world units. We call its axes **u** and **v** (some call them s and t), and, crucially, we **normalize** them to the unit square:

```text
   v
   1 ┌───────────────┐   (1,1) = far corner of the image
     │               │
     │    texture     │   any point in the image is (u, v)
     │    (the image) │   with 0 ≤ u ≤ 1 and 0 ≤ v ≤ 1
     │               │
   0 └───────────────┘
     0               1  u
```

`(0,0)` is one corner, `(1,1)` the opposite corner: **regardless** of the image's pixel dimensions. A 64×64 image and a 4096×4096 image share the same UV square. That is what lets one coordinate address **any** texture.


---

## The lookup pipeline

Texturing is a **lookup**: a coordinate goes in, a color comes out. Three stages:

```text
   per-vertex UV         placement           sampling
   (u,v) on each   →   transform the   →   read the image
   vertex              UVs                 at (u,v)
```

- **UVs**: every vertex carries a `(u,v)`; it is interpolated across each triangle, so every drawn pixel has its own `(u,v)`
- **placement**: a 3×3 matrix **moves, rotates, and tiles** the image by transforming those `(u,v)`
- **sampling**: the sampler turns the final `(u,v)` into an actual texel color


---

### UV coordinates

<small>(~10 min)</small>

---

## A UV is a per-vertex attribute

A texture coordinate is stored **exactly like a position or a normal**: one `(u,v)` per vertex, in a parallel array. A mesh vertex now carries **three** things:

```text
   vertex i:   position pᵢ = (x, y, z)     ← where it is
               normal   nᵢ = (nx, ny, nz)  ← which way it faces
               texcoord uvᵢ = (u, v)        ← where on the image
```

Between vertices, the UV is **interpolated** with the triangle's **barycentric weights**, like any other vertex attribute. So although only the **corners** have authored UVs, **every pixel** inside the triangle ends up with its own smoothly varying `(u,v)`: and thus its own texel.


---

## Assign UVs to the 2×2 grid

Take the meshes topic's **2×2 grid**: nine vertices in a 3×3 lattice (row = Z, column = X). We glue the whole image across it **once** by giving each vertex the natural coordinate `(u, v) = (col/2, row/2)`:

```text
              col 0        col 1        col 2
   row 0    (0.0, 0.0)   (0.5, 0.0)   (1.0, 0.0)
   row 1    (0.0, 0.5)   (0.5, 0.5)   (1.0, 0.5)
   row 2    (0.0, 1.0)   (0.5, 1.0)   (1.0, 1.0)
```

The four corners of the grid get the four corners of the unit square; the center vertex `v4` lands at the **center** of the image `(0.5, 0.5)`. The image is stretched exactly once across the whole grid.


---

## Interpolation: a worked midpoint

Only the corners have authored UVs; every point between them gets the **barycentric** blend of the corners. Take the first triangle of the grid's split, `tri0 = (0, 3, 1)`, and walk to the **midpoint of edge (0, 3)**:

```text
   vertex 0:  UV = (0, 0)         (row 0, col 0)
   vertex 3:  UV = (0, 0.5)       (row 1, col 0)

   midpoint = ½·(0,0) + ½·(0,0.5) = (0, 0.25)
```

Halfway **along the edge in space** is halfway **across the image** in UV: `(0, 0.25)`, a quarter of the way up the left edge of the texture. The picture follows the surface because the UV is carried along with it.


---

## Outside the unit square: wrap modes

Nothing forces a UV to stay in `[0,1]`. UVs of `1.3` or `−0.2` are common (placement makes them on purpose to **tile**). What color comes back is set by the texture's **wrap mode**:

- **repeat**: drop the whole-number part; the image **tiles** endlessly (`1.3 → 0.3`, `2.75 → 0.75`)
- **clamp**: pin to the nearest edge; the border pixel **smears** outward (`1.3 → 1.0`)
- **mirror**: every other copy is flipped, so tiles meet **seamlessly**

Same geometry, same UVs: only the wrap rule differs. Our demo uses **repeat** so that scaling the UVs up tiles the checker.


---

## Repeat vs clamp, numerically

One value, two wrap modes. Feed the sampler `u = 1.3`:

```text
   repeat:  u_wrapped = u − ⌊u⌋ = 1.3 − 1 = 0.3     (fractional part)
   clamp:   u_wrapped = min(max(u, 0), 1) = 1.0      (pinned to the edge)
```

Under **repeat**, `1.3` reads the image at `0.3`: you have walked 30% into the **second** copy of the tiled image. Under **clamp**, `1.3` reads the image at its right edge `1.0`: every value past 1 returns that same edge column.


---

### Where coordinates come from

<small>(~10 min)</small>


---

## Three projections, one point

Each is a formula on the vertex position `p = (x, y, z)`, applied per vertex:

```text
   r = |p|,   θ = atan2(z, x)  (longitude),   φ = asin(y / r)  (latitude)

   planar (onto the ground):   (u, v) = (x, z) + c
   cylindrical:                (u, v) = (θ / 2π, y) + c
   spherical:                  (u, v) = (θ / 2π, φ / π + 0.5)
```

```text
   p = (0.5, 0.7, 0.3):   r = 0.911,   θ = 31.0°,   φ = 50.2°
   planar, c = (0.5, 0.5):       (1.0, 0.8)       on the square's right edge
   cylindrical, v = y + 0.5:     (0.086, 1.2)     above the square: scale y to the model first
   spherical:                    (0.086, 0.779)
```


---

## The seam: neighbors on opposite edges

Any projection that **wraps** around has a line where `u` jumps from 1 back to 0:

```text
   a = (0.999, 0,  0.01)   →   u = 0.0016
   b = (0.999, 0, −0.01)   →   u = 0.9984          a and b are 0.02 apart in space
```

- a triangle with corners at `a` and `b` interpolates `u` from 0.0016 to 0.9984 across its width
- it shows almost the **whole texture, backwards**, squeezed into one thin strip: the streak at θ = 0 on every spherically mapped model
- at the **poles** a whole row of texels lands on one vertex: the map **pinches**


---

## The fix: split the seam's vertices

A vertex holds **one** UV. Where the seam needs two, store the position **twice**:

- one copy with `u` near **0**, used by the triangles on one side
- one copy with `u` near **1**, used by the triangles on the other side
- same position, same normal, different UV

```text
   a cylinder of 5 rings × 16 steps:   80 vertices if u could wrap
                                       85 with the seam column duplicated  (u = 0 and u = 1)
```

The same split the meshes topic makes for a **hard edge**: one position, two normals.


---

## Unwrapping: cut, flatten, pack

For a general mesh no formula is good everywhere, so the tool **cuts** it:

- **seams** are chosen where they will not be seen (under the arm, along the back)
- each piece, a **chart**, is flattened into the plane with as little stretch as possible
- the charts are **packed** into one image, the **atlas**: 16 charts of 256 × 256 fill a 1024 × 1024 texture
- a **gutter** of a few texels separates the charts, because a filtered lookup reads **neighboring** texels and would mix two charts

Least Squares Conformal Maps (Lévy and others, 2002) is the common flattening: it preserves angles as well as it can.


---

## Distortion: how much a map stretches

A **checker** texture shows the stretch: squares stay square only where the map is faithful.

```text
   spherical map, a ring at latitude φ:   circumference 2π cos φ,  yet it spans all of u
   horizontal stretch of the texture:     1 / cos φ

      φ:        0°     30°     45°     60°     80°     90°
      stretch:  1.00   1.15    1.41    2.00    5.76    ∞  (the pole)
```

- a planar projection stretches a face tilted by α from the projection plane by **1 / cos α**: 2 at 60°, a streak at 90°
- unwrapping places seams to keep every chart's stretch near 1


---

### Placement transforms

<small>(~14 min)</small>

---

## Placing the texture = transforming the UVs

Authored UVs give **one** default placement (the image, once, across the surface). To **slide** the image over, **spin** it, or **tile** it, we do not touch the geometry: we **transform the UVs** before the lookup:

- **offset** `(offU, offV)`: slide the image across the surface
- **rotation**: spin the image about a point
- **tile / scale**: a factor > 1 shrinks the image in UV terms, so it **repeats** more (with repeat wrap)

All three are a **2D transform applied to `(u,v)`**. A 2D transform of a coordinate is what the affine topic built in 3D, one dimension smaller.


---

## It is the affine matrix, now 3×3

To rotate-and-translate a 2D point with a single matrix, we use the **homogeneous** trick one dimension down: write `(u, v)` as `(u, v, 1)` and use a **3×3** matrix:

```text
        ┌ a  b  tx ┐   ┌ u ┐     a,b,c,d  = rotate + scale (the 2×2 block)
   M =  │ c  d  ty │ · │ v │      tx, ty   = translation (offset)
        └ 0  0  1  ┘   └ 1 ┘      bottom row 0 0 1 = homogeneous
```

- 3D placement (the affine topic) used a **4×4** on `(x, y, z, 1)`
- 2D placement (UV) uses a **3×3** on `(u, v, 1)`

Same structure: a linear block for rotation/scale, a translation column, a homogeneous bottom row. The only change is the **dimension**.


---

## Rotate and scale about the UV center

Rotating `(u,v)` directly spins the image about the **corner** `(0,0)`: the texture swings away off-screen. We want it to spin about its **center** `(0.5, 0.5)`. That is the affine topic's **rotate-about-a-point** pattern, `T·R·T⁻¹`:

```text
   1. T(−c)   move the center to the origin        c = (0.5, 0.5)
   2. R       rotate (and scale) about the origin
   3. T(+c)   move the center back
```

Do the same for scale/tiling, so the texture grows or spins **in place** around its middle instead of sliding toward a corner. Wrapping a rotation in `T(c)·R·T(−c)` is the affine topic's pivot sandwich, one dimension down.


---

## The placement matrix, assembled

Put it together: offset, plus rotate-and-scale about the center. Our library's `uvMat3(offU, offV, rot, tileU, tileV)` builds exactly this, in this order (right-to-left on the UV point):

```text
   M = T(off) · T(c) · S · R · T(−c)          c = (0.5, 0.5)

     T(−c)  recenter: move (0.5,0.5) to origin
     R      rotate about the origin (UV convention)
     S      scale by the tile factor
     T(c)   move the center back
     T(off) finally slide by the offset
```

The rotate-and-scale live **inside** the center sandwich; the offset is applied **last**, on the outside. This is the exact composition three.js pins for a texture matrix, so our numbers match the engine's element for element.


---

## Worked matrix: the defaults

At the demo's defaults, no offset, no rotation, tile = 2, the matrix is pure scale about the center. Displayed row-major, matching the live `Mat3Panel`, 2 decimals:

```text
   offU = 0, offV = 0, rot = 0°, tile = 2

        ┌  2.00   0.00  −0.50 ┐
   M =  │  0.00   2.00  −0.50 │
        └  0.00   0.00   1.00 ┘
```

The `2.00` on the diagonal is the tile factor: UVs are doubled, so with **repeat** wrap the checker fits **twice** on each axis. The `−0.50, −0.50` in the last column is what keeps that doubling centered on `(0.5, 0.5)` instead of the corner: the center sandwich, in numbers. The bottom row `0, 0, 1` is the homogeneous row.


---

## Worked matrix: offset, rotate, tile

Turn on all three: offset the U by 0.25, rotate 45°, tile 2. Displayed row-major, matching the live `Mat3Panel`, 2 decimals:

```text
   offU = 0.25, offV = 0, rot = 45°, tile = 2      (cos45° = sin45° = 0.7071)

        ┌  1.41   1.41  −0.66 ┐
   M =  │ −1.41   1.41   0.50 │
        └  0.00   0.00   1.00 ┘
```

The 2×2 block is `tile · [cos, sin; −sin, cos]` = `2 · 0.7071 = 1.41` on the diagonal, `±1.41` off it: rotation **and** the ×2 tile, together. The last column `−0.66, 0.50` is the center-sandwich translation **plus** the `+0.25` offset folded into U. Every cell is one of the three knobs.


---

## Meet the demo: place a texture

The `uv-placement` demo textures a quad with an in-code **8×8 checkerboard** and drives its `texture.matrix` **straight from our `uvMat3`**: the exact matrix we just built. Two controls on the slide:

- **`offU`**: slide the checker across the surface (the translation cell moves)
- **`tile`**: the scale factor; at 2 the checker fits twice per axis, at 6 it fits six times

The panel shows the live **3×3** matrix as you drag: the same numbers as our worked slides. The full sandbox adds `offV` and `rot`. The homework builds this matrix by hand.


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

<small>(~15 min)</small>


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

A hair is a thin **cylinder**; it has no single normal. Kajiya and Kay light it by its **tangent** T, the direction the hair runs:

```text
   diffuse   =  sin(T, L)  =  √(1 − (T·L)²)
   specular  =  ((T·L)(T·V) + sin(T, L) sin(T, V))^p

   light 60° off the hair (T·L = 0.5):   diffuse √0.75 = 0.866
   light along the hair   (T·L = 1):     diffuse 0
```

- brightest with the light **across** the hair, dark with it **along** the hair
- the highlight is a **band** that slides along the strands as the light moves


---

<!-- .slide: class="demo-full" -->

## The fur, live: explicit strands

<div class="cockpit" data-demo="fur" data-controls="lightAz"><pre class="viz-fallback">  the Stanford bunny grown with 100,000 hairs, 5 segments each, Kajiya-Kay lit
  controls:  light azimuth (instant, a shader uniform); in the full demo also elevation,
             shine, root darkening (instant) and hairs, length, gravity, curl (regrow)
  readout:   light direction, hairs, segments, vertices, regrow time, draw time</pre></div>


---

## Hair at film scale

- **Brave** (Pixar, 2012): Merida has more than **1,500** sculpted curls making about **111,700** hairs, simulated with a new solver, **Taz**
- film simulates **every** strand, with stiffness, twist and hair-to-hair collision; games simulate **guides** or a few cards
- the trade: accuracy per frame against a frame budget

