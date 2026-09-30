<!--
  CSS 551 · TOPIC DECK: Texture mapping, detail without geometry (~45 min, 33 slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/texture-mapping.md"> among others; no
  lecture logistics, no "Part N" numbering.

  TEACHES: a texture as a lookup; UV space on [0,1]²; UVs as a per-vertex
  attribute on the 2×2 grid; interpolation; wrap modes (1.3 → 0.3 or 1.0); the
  placement matrix T(off)·T(c)·S·R·T(−c) with both worked cases ([2,0,−0.5] and
  [1.41,1.41,−0.66]); magnification with one bilinear sample worked (0.411 against
  nearest 0.2); minification, the mipmap (32.8 % overhead) and the level from the
  footprint (λ = 1.696); bump mapping as detail in the normal (N·L 0.669 → 0.441);
  a texture as a function.
  NEEDS:   the affine topic (homogeneous matrices, rotate about a point); the
           meshes topic (the 2×2 grid); rasterization (interpolation).
  DEMOS:   data-demo="uv-placement" data-controls="offU,tile" (under the page's crop).
  FIGURES: ../../textbook/figures/tex-mipmap.png, tex-bump.png (textbook generators).
  NUMBERS: textbook/figures/numbers-surfaces.json (tex.*) and
           numbers-systems.json (aa.mip).

  Derived from the Plan B single-file deck sessions/S08-texture-mapping (retired):
  the Unity code excerpts, multi-texturing, noise and the CDP plan are gone; the
  bilinear sample, the mip-level computation and bump mapping are new.

  reveal.js: FLAT; notes follow "Note:"; plain unicode math; never two "_" on one
  markdown line outside a code fence. Paths relative to the lecture page.
-->

### Texture mapping: detail without geometry

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

Texturing is a **lookup**: a coordinate goes in, a color comes out. Three stages, one stretch each:

```text
   per-vertex UV         placement           sampling
   (u,v) on each   →   transform the   →   read the image
   vertex              UVs                 at (u,v)
```

- **UVs**: every vertex carries a `(u,v)`; the rasterizer interpolates it across each triangle, so every drawn pixel has its own `(u,v)`
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

Between vertices, the rasterizer **interpolates** the UV the same way it interpolates everything else. So although only the **corners** have authored UVs, **every pixel** inside the triangle ends up with its own smoothly varying `(u,v)`: and thus its own texel.


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

Only the corners have authored UVs; the rasterizer **linearly interpolates** for every point between them. Take the first triangle of the grid's split, `tri0 = (0, 3, 1)`, and walk to the **midpoint of edge (0, 3)**:

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

Do the same for scale/tiling, so the texture grows or spins **in place** around its middle instead of sliding toward a corner. Wrapping a rotation in `T(c)·R·T(−c)` is the identical trick we used to orbit in 3D: reused, one dimension down.


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

### Sampling, and two variations

<small>(~16 min)</small>

---

## From (u,v) to a pixel

After placement, each pixel has a final `(u,v)`. **Sampling** is turning that coordinate into an actual color from the texel grid. It is rarely a clean hit on one texel, the pixel's footprint usually falls **between** texels, or covers **many**, so the sampler must **filter**:

- **magnification**: the texture is **bigger** on screen than in texels; one texel spans **many** pixels
- **minification**: the texture is **smaller** on screen than in texels; one pixel covers **many** texels

These are opposite problems, and each has its own fix. The whole job of the sampler is to return a sensible color in both cases.


---

## Magnification: nearest vs bilinear

When one texel covers many pixels, how do we color the pixels **between** texel centers?

- **nearest**: snap to the closest texel. Sharp, blocky **squares**: perfect for a crisp checker or pixel art
- **bilinear**: blend the **four** surrounding texels by distance. Smooth, no blocks: natural for photos

```text
   nearest:              bilinear:
   ┌──┬──┐               ┌──┬──┐      the pixel (•) blends
   │  │  │               │ ╲│  │      the 4 nearest texels,
   ├──┼──┤ • → one texel ├──•──┤      weighted by how close
   │  │  │               │  │╱ │      each corner is
   └──┴──┘               └──┴──┘
```

Our demo uses **nearest** on purpose: the checker stays crisp, so you can see the tiling exactly. Bilinear would soften the squares' edges into gray gradients.


---

## One bilinear sample, by hand

A 4×4 texture, sampled at `(u, v) = (0.3, 0.6)`. Texel coordinates are `(u·4 − 0.5, v·4 − 0.5) = (0.7, 1.9)`: between columns 0 and 1, rows 1 and 2, with fractions `fx = 0.7`, `fy = 0.9`.

```text
   the four texels:      t00 = 0.2   t10 = 0.9      (row 1)
                         t01 = 0.8   t11 = 0.2      (row 2)

   along x, row 1:  0.2 + 0.7·(0.9 − 0.2) = 0.69
   along x, row 2:  0.8 + 0.7·(0.2 − 0.8) = 0.38
   along y:         0.69 + 0.9·(0.38 − 0.69) = 0.411

   weights (1−fx)(1−fy), fx(1−fy), (1−fx)fy, fx·fy = 0.03, 0.07, 0.27, 0.63   (sum 1)
```

Bilinear returns **0.411**; nearest returns the one texel whose square the sample falls in, **0.2**. Two lerps along x, one along y: three multiply-adds per channel.


---

## Minification aliases: watch the checker

The hard case: the surface recedes, so **many texels** crowd into **one pixel**. Sampling just **one** of them per pixel is a lie: which texel you happen to hit changes wildly from frame to frame, and the surface **shimmers and sparkles**. This is **aliasing**.

- crank the demo's **`tile` to 6**: the checker squares get tiny, and the far part of the quad **breaks into noise** instead of clean checks
- the fix is not to pick one texel but to **average** all the texels the pixel covers: but averaging many texels **every** pixel every frame is too slow to do live

So the average is **precomputed**: the mipmap.


---

## Mipmaps: prefilter the average

A **mipmap** is the texture pre-shrunk into a **pyramid** of ever-smaller copies, each level the **average** of four texels from the level below:

```text
   level 0:  8×8   (full)      each higher level is
   level 1:  4×4   (½)         the 2×2-averaged
   level 2:  2×2   (¼)         down-sample of the
   level 3:  1×1   (⅛)         one below it
```

When a pixel covers many texels, the sampler picks the level whose texels are **about pixel-sized** and reads **one** value there: but that value already **is** the average of the texels underneath. The costly per-pixel averaging is done **once**, offline.

- 85 texels for an 8×8 base: 32.8 % extra memory (the pyramid tends to 1/3 more) buys alias-free minification
- **trilinear**: blend the two nearest levels so the transition between them is smooth too


---

## Which level? The footprint, worked

The sampler measures how far `(u, v)` moves per pixel, in texels, from the screen-space derivatives (a 2×2 block of pixels gives them for free):

```text
   256-texel texture,  ∂u/∂x = 0.0125,  ∂v/∂x = 0.002,  ∂u/∂y = 0.001,  ∂v/∂y = 0.009

   footprint along x:  256 · √(0.0125² + 0.002²) = 3.241 texels
   footprint along y:  256 · √(0.001² + 0.009²)  = 2.318 texels
   ρ = max = 3.241        λ = log₂ ρ = 1.696
```

- `λ = 1.696`: between level 1 (texels twice the size, 1.62 per pixel) and level 2 (0.81 per pixel)
- **trilinear** reads both levels bilinearly and blends 0.696 of the way from level 1 to level 2
- the footprint is 1.4 times longer in x than in y: **anisotropic** filtering takes several samples along the long axis at the finer level `λ = 1.213` instead of blurring both axes to the coarser one


---

## Texture compression: 4 bits per texel

GPUs sample **compressed** textures directly. BC1 (DXT1) stores each 4×4 block as two colors and sixteen 2-bit indices:

```text
   one block: 2 endpoint colors in 5:6:5 bits (32 bits) + 16 × 2-bit indices (32 bits) = 64 bits
   palette: the two endpoints and two colors between them at ⅓ and ⅔
   64 bits / 16 texels = 4 bits per texel,  against 24 uncompressed:   6 times smaller
   the chapter's block: RMS error 8.1 codes (of 255), worst texel 20.4
```

Fixed-rate blocks mean the GPU can find any texel's block by arithmetic: random access, unlike JPEG.


---

## Bump mapping: detail in the normal

A texture can store not a color but a **height** `h(u, v)`. Its slope tilts the normal, and the lighting does the rest; the geometry stays flat.

```text
   at uv (0.54, 0.5) on a brick groove wall:   ∂h/∂u = 18.33,  ∂h/∂v = 0      (central differences)
   relief 0.02 × the demo's bump 1.2:   n = normalize(−0.024·18.33, 0, 1) = normalize(−0.44, 0, 1)
                                                                     = (−0.403, 0, 0.915)

   light L = (0.426, 0.609, 0.669):   N·L flat = 0.669    N·L bumped = 0.441
```

<img src="../../textbook/figures/tex-bump.png" class="media-shot" style="max-height: 200px;" alt="a flat quad lit with a brick height map: without bump mapping it is uniformly lit; with it the mortar grooves shade as if recessed">


---

## Normal maps and tangent space

A normal map stores a tilted normal per texel, in the triangle's own **tangent frame** (T along u, B along v, N out of the surface):

```text
   the grid's triangle (0, 3, 1):  T = (1, 0, 0),  B = (0, 0, 1),  N = (0, 1, 0)      handedness −1
   a texel stores RGB (186, 186, 225)  →  decode c/255·2 − 1  →  tangent-space (0.457, 0.457, 0.762)
   to world:  0.457·T + 0.457·B + 0.762·N  =  (0.457, 0.762, 0.457)
```

Tangent space makes one normal map reusable on any surface, and it is why normal maps look **blue**: most normals point along +N, the blue channel.


---

## A texture can be a function

Every texture so far was an **image**: stored texels. But sampling only needs a **color for a `(u,v)`**, and a **function** supplies that as well as a lookup table does:

```text
   image texture:       color = imageLookup(u, v)      (read stored texels)
   procedural texture:  color = f(u, v)                (compute from math)
```

- **no memory** for pixels: just the formula; never blocky
- perfect for **regular** patterns (checker, brick) and **noise** (marble, wood, clouds)
- the trade: an **arbitrary** picture (a face) is easier to paint than to derive

The checker in the demo is exactly this: a function of `(u,v)`, the parity of `⌊u·8⌋ + ⌊v·8⌋`, precomputed into a texture.


---

## Cube maps: a texture indexed by direction

<img src="../../textbook/figures/tex-cubemap.svg" class="media-shot" style="max-height: 200px;" alt="a direction vector from the center of a cube, hitting the minus-Y face at a marked texel">

Six square faces around the origin; a **direction** picks a face by its largest component, then a texel:

```text
   d = (0.303, −0.808, 0.505):   largest |component| is y, negative   →   face −Y
   s, t = (sc / |ma| + 1) / 2, (tc / |ma| + 1) / 2 = (0.688, 0.188)   →   texel (176, 48) of 256
   512 × 512 × 6 faces × 3 bytes = 4.7 MB;  with mips 6.3 MB
```

Used for skies, reflections (look up the reflected direction R), and the lighting of image-based and physically based rendering.


---


## Shadow maps: a depth texture from the light

<img src="../../textbook/figures/tex-shadowmap.svg" class="media-shot" style="max-height: 200px;" alt="a box on a floor lit by a directional light; the light's depth map and two floor points, one in the box's shadow">

Williams (1978): render the scene's **depth from the light** into a texture. When shading a point, transform it to the light's view and compare:

```text
   a point in the box's shadow:   stored depth 9.333,  its own depth 10.833   farther → in shadow
   a lit floor point:             stored 8.333,        its own 8.333          equal   → lit
   bias 0.0197 (the depth change across one texel on a floor at 48°) stops a surface shadowing itself
```

