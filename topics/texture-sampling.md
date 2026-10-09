<!--
  CSS 551 · TOPIC DECK: Texture sampling, from a coordinate to a color (~18 min, 15 slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/texture-sampling.md"> among others; no
  lecture logistics, no "Part N" numbering.

  TEACHES: the lookup as texel addressing (u·W − 0.5, texel centers); the two
  regimes; magnification with one bilinear sample worked (0.411 against nearest
  0.2); minification and aliasing; the mipmap (32.8 % overhead) and the level from
  the footprint (λ = 1.696); BC1 compression (4 bits per texel); bump mapping as
  detail in the normal (N·L 0.669 → 0.441), live; normal maps in tangent space; a
  texture as a function; cube maps (face −Y, texel (176, 48)); shadow maps.
  NEEDS:   the texture-coordinates topic (UVs, placement); the illumination topic
           (N·L, the reflected direction R); rasterization (the depth buffer).
  DEMOS:   data-demo="bump-map" data-controls="bump,lightAz" (under the page's crop).
  FIGURES: ../../textbook/figures/tex-minification.png, tex-bump.png,
           tex-cubemap.svg, tex-shadowmap.svg (textbook generators).
  NUMBERS: textbook/figures/numbers-surfaces.json (tex.*) and
           numbers-systems.json (aa.mip).

  Split from texture-mapping.md (2026-10-06, archived in topics/archive/).

  reveal.js: FLAT; notes follow "Note:"; plain unicode math; never two "_" on one
  markdown line outside a code fence. Paths relative to the lecture page.
-->

### Texture sampling: from a coordinate to a color

<small>(~18 min)</small>


---

## The lookup: a coordinate in, a texel out

Every pixel of a textured triangle arrives with its own `(u, v)`: interpolated from the vertices' UVs, then placed by the 3×3 placement matrix. The **sampler** turns it into a color.

```text
   a W × H image: texel i covers u from i/W to (i+1)/W; its center is at (i + 0.5)/W
   continuous texel coordinate:   x = u·W − 0.5,   y = v·H − 0.5

   W = 256,  u = 0.3:   u·W = 76.8   →   x = 76.3   →   nearest texel 76
   u = 1.3 under repeat wraps to 0.3 first: the same texel
```

- **texel**: one pixel of the texture image
- the **wrap mode** maps `(u, v)` into the unit square; then the **filter** decides which texels to read and how to weight them


---

## Two regimes: magnification and minification

A sample is rarely a clean hit on one texel, the pixel's footprint usually falls **between** texels, or covers **many**, so the sampler must **filter**:

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

The placement demo uses **nearest** on purpose: the checker stays crisp, so the tiling can be counted. Bilinear would soften the squares' edges into gray gradients.


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

The surface recedes, so **many texels** crowd into **one pixel**. Reading just **one** of them per pixel is a guess: which texel the sample hits changes from frame to frame, and the surface **shimmers and sparkles**. This is **aliasing**.

<img src="../../textbook/figures/tex-minification.png" class="media-shot" style="max-height: 185px;" alt="a checkerboard floor receding to the horizon: left, one sample per pixel, the far rows dissolve into noise and moire; right, mipmapped, the far rows fade smoothly to gray">

- left: one texel per pixel; the far rows break into **moiré** and noise
- right: the **average** of the texels each pixel covers; the far rows fade to gray
- averaging hundreds of texels per pixel every frame is too slow, so the average is **precomputed**: the mipmap


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

<!-- .slide: class="demo-full" -->

## Bump mapping, live

<div class="cockpit" data-demo="bump-map" data-controls="bump,lightAz"><pre class="viz-fallback">  a flat brick wall: one quad, two triangles, one orbiting point light
  -- defaults: bump = 1.2, lightAz = 55° ------------------------------------
     the color map and the height map come from the same procedural brick function
     drag bump → 0: the grooves vanish; the wall is flat, because it always was
     drag lightAz → the mortar grooves shade and unshade as the light swings
     the triangle count stays 2 at every setting</pre></div>


---

## Normal maps and tangent space

A normal map stores a tilted normal per texel, in the triangle's own **tangent frame** (T along u, B along v, N out of the surface):

```text
   the 2×2 grid's triangle (0, 3, 1):  T = (1, 0, 0),  B = (0, 0, 1),  N = (0, 1, 0)      handedness −1
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

The placement demo's checker is exactly this: a function of `(u,v)`, the parity of `⌊u·8⌋ + ⌊v·8⌋`, precomputed into a texture.


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

