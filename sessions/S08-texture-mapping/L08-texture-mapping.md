<!--
  CSS 551 · Lecture 8 (Session 8) — Texture mapping. Detail without geometry:
  glue a 2D image onto a surface through a per-vertex UV coordinate, place it
  with a 3x3 UV-space transform (S04's matrices again), sample it (filtering,
  mipmaps, multi-texturing), and finally synthesize it from math (procedural
  checker + a one-slide noise teaser).

  reveal.js: FLAT deck — every slide is a top-level "---" section (no vertical
  "--" stacks). Keeps the verify-deck harness's demo probe correct (it selects
  "section.present [data-demo]"; inside a vertical stack that would match a
  demo on a not-yet-shown sibling slide -> 0x0 -> pixel probe times out). Flat
  = one section per slide = demo only matched when shown. Notes follow "Note:".

  ONE DEMO, on its own slide (flat), with the scoped-CSS cap:
   - Part 3: data-demo="uv-placement" data-controls="offU,tile". Fallback shows
     the HAND-VERIFIED defaults (offU=0, tile=2), displayed row-major exactly
     as the live Mat3Panel renders it (cell[i][j] = elements[j*3+i]):
     [2.00,0.00,-0.50 / 0.00,2.00,-0.50 / 0.00,0.00,1.00], translation in the
     LAST COLUMN, and the note that a tile of 2 makes the checker repeat 2x on
     each axis.
  The two worked UV matrices (defaults; and offU=0.25/rot=45/tile=2) are
  recomputed via node against lib/core/xform.js (uvMat3) — see README for the
  exact digits and the composition-order check.

  MATH IS PLAIN TEXT ON PURPOSE. This shell loads NO KaTeX plugin (only
  markdown/highlight/notes), so "$...$" would render literally. All formulas
  are unicode plain text (·, ×, →, ², ⁻¹, θ, Δ, ≤, ⌊⌋) or fenced ```text
  blocks, like S01-S07. Never two "_" on one markdown line OUTSIDE a code fence
  (they pair into <em> and shred the line): in prose AND speaker notes ALWAYS
  backtick names with underscores (_MainTex, _SecTex, MyTexScale_X,
  MyTexOffset_X, URepeat, VRepeat, Color1, Color2, texture.matrix,
  matrixAutoUpdate, uvMat3, wrapS, wrapT, DataTexture, tex2D, MyMesh.cs,
  TexturePlacement.cs, CheckerTexture.cs, ...). Matrices and code inside
  ```text / ```csharp fences are safe. No <small> on math. NO forward /
  "next time" references anywhere — lighting and procedural noise are named as
  CONCEPTS ("beyond this course's scope" for deep noise) but never as a named
  future SESSION. The wrap may preview the FIXED Thursday studio (paired lab).

  Real C# / shader excerpts are from Kelvin Sung's CSS 451 ClassExamples,
  Topic8-TextureMapping: 8.1.UVOnVertices/MyMesh.cs (the uv[0..8] per-vertex
  assignment — THE Part-2 excerpt); 8.2.OurOwnTexturePlacement/
  TexturePlacement.cs (students scale+offset the UVs themselves — THE Part-3
  excerpt); 8.6.MultiTexturing/451NoCullShader.shader (two samplers blended —
  Part 4); 8.7.SynthesizedTextures/CheckerTexture.cs + its shader's checker
  math (Part 5). These are the CDP projects students run Thursday (lab08).

  Session plan (120 min, Tue 5:45-7:45 PM synchronous online). Sums to ~110 + buffer.
    0:00  Intro (title + tonight)                  ~2 min
    0:02  Part 1  Detail without geometry          15 min  (the cost of detail; texture = image on a surface; UV space [0,1]²; the lookup pipeline)
    0:17  Part 2  UV coordinates                   30 min  (per-vertex attribute, interpolated; assign UVs to the 2x2 grid by hand; UVOnVertices excerpt; interpolation worked; wrap modes; u=1.3 numeric)
    0:47  Part 3  Placement transforms             25 min  (place = transform UVs; 3x3 in UV space; T·R·T⁻¹ about the UV center; the anatomy + 2 worked matrices; TexturePlacement.cs; uv-placement demo)
    1:12  Part 4  Sampling                         20 min  (mag/min filtering; nearest vs bilinear; minified checkers alias; mipmaps; multi-texturing blend)
    1:32  Part 5  Synthesized textures + CDP       15 min  (procedural = math→color; CheckerTexture.cs; one noise teaser; Topic8 CDP plan)
    1:47  Wrap                                      5 min  (Thu texture studio + MP6 lab — Canvas)
    1:52  end (+ buffer)
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 8 — Texture Mapping: Detail Without Geometry**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>

---

## Tonight

- **Detail without geometry** — glue a 2D **image** onto a surface instead of modeling every bump
- **UV coordinates** — one **per-vertex** number pair on `[0,1]²`; assign them to last week's grid by hand
- **Placement** — move, rotate, and tile the image with a **3×3 matrix** in UV space (S04, again)
- **Sampling** — turning a `(u,v)` into a pixel: filtering, why minified checkers **alias**, mipmaps, blending two textures
- **Synthesized textures** — an image is just a **function**: math → color, no picture needed

---

### Part 1 · Detail without geometry

<small>(~15 min)</small>

---

## Detail is expensive in triangles

Last week a surface was **geometry** — vertices and triangles. To make a mesh look like a **brick wall** that way, every mortar line and chip would need its own triangles: a flat wall could balloon to **millions** of them, all to draw a picture that never changes shape.

- geometry sets the **shape**; the bumps and colors of a real surface are mostly **not** shape
- the GPU already draws one flat quad almost for free — the cost is in the **count** of triangles

There should be a way to add surface **detail** without adding surface **geometry**.

---

## A texture is an image glued to a surface

Take a **2D image** — the **texture** — and glue it onto the surface: as the surface is drawn, each point picks up the color of the image at the spot it is glued to.

- the surface keeps its (cheap) geometry — a few big triangles
- the **appearance** comes from the image — as detailed as you like at **no extra geometry**
- one image can wrap a whole wall, a whole character, a whole planet

The real question: **which image point lands on which surface point?** — the heart of texture mapping.

---

## UV space: the image has its own coordinates

The image lives in its **own 2D coordinate system**, independent of world units. We call its axes **u** and **v** (some call them s and t), and — crucially — we **normalize** them to the unit square:

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

`(0,0)` is one corner, `(1,1)` the opposite corner — **regardless** of the image's pixel dimensions. A 64×64 image and a 4096×4096 image share the same UV square. That is what lets one coordinate address **any** texture.

---

## The lookup pipeline

Texturing is a **lookup**: a coordinate goes in, a color comes out. Three stages, and the rest of tonight is one stage each:

```text
   per-vertex UV         placement           sampling
   (u,v) on each   →   transform the   →   read the image
   vertex (Part 2)     UVs (Part 3)        at (u,v) (Part 4)
```

- **Part 2** — every vertex carries a `(u,v)`; the rasterizer interpolates it across each triangle, so every drawn pixel has its own `(u,v)`
- **Part 3** — a 3×3 matrix **moves, rotates, and tiles** the image by transforming those `(u,v)`
- **Part 4** — the sampler turns the final `(u,v)` into an actual texel color

---

### Part 2 · UV coordinates

<small>(~30 min)</small>

---

## A UV is a per-vertex attribute

A texture coordinate is stored **exactly like a position or a normal**: one `(u,v)` per vertex, in a parallel array. S07's vertex now carries **three** things:

```text
   vertex i:   position pᵢ = (x, y, z)     ← where it is        (S07)
               normal   nᵢ = (nx, ny, nz)  ← which way it faces (S07)
               texcoord uvᵢ = (u, v)        ← where on the image (tonight)
```

Between vertices, the rasterizer **interpolates** the UV the same way it interpolates everything else. So although only the **corners** have authored UVs, **every pixel** inside the triangle ends up with its own smoothly varying `(u,v)` — and thus its own texel.

---

## Assign UVs to last week's grid

Take S07's **2×2 grid** — nine vertices in a 3×3 lattice (row = Z, column = X). We glue the whole image across it **once** by giving each vertex the natural coordinate `(u, v) = (col/2, row/2)`:

```text
              col 0        col 1        col 2
   row 0    (0.0, 0.0)   (0.5, 0.0)   (1.0, 0.0)
   row 1    (0.0, 0.5)   (0.5, 0.5)   (1.0, 0.5)
   row 2    (0.0, 1.0)   (0.5, 1.0)   (1.0, 1.0)
```

The four corners of the grid get the four corners of the unit square; the center vertex `v4` lands at the **center** of the image `(0.5, 0.5)`. The image is stretched exactly once across the whole grid.

---

## The UVs, in Sung's code

`8.1.UVOnVertices/MyMesh.cs` sets the nine UVs directly — the same `(col/2, row/2)` table, row by row:

```csharp [1-8]
Vector2[] uv = new Vector2[9];   // one UV per vertex, parallel to v[] and n[]
uv[0] = new Vector2(0,   0);    uv[1] = new Vector2(0.5f, 0);    uv[2] = new Vector2(1, 0);
uv[3] = new Vector2(0,   0.5f); uv[4] = new Vector2(0.5f, 0.5f); uv[5] = new Vector2(1, 0.5f);
uv[6] = new Vector2(0,   1);    uv[7] = new Vector2(0.5f, 1);    uv[8] = new Vector2(1, 1);
theMesh.uv = uv;                 // hand it to the mesh, next to .vertices/.normals
```

`v4` again the center vertex — position `(0,0,0)`, UV `(0.5, 0.5)`. Same nine vertices as last week, now each tagged with a spot on the image.

---

## Interpolation: a worked midpoint

Only the corners have authored UVs; the rasterizer **linearly interpolates** for every point between them. Take the first triangle of S07's split, `tri0 = (0, 3, 1)`, and walk to the **midpoint of edge (0, 3)**:

```text
   vertex 0:  UV = (0, 0)         (row 0, col 0)
   vertex 3:  UV = (0, 0.5)       (row 1, col 0)

   midpoint = ½·(0,0) + ½·(0,0.5) = (0, 0.25)
```

Halfway **along the edge in space** is halfway **across the image** in UV — `(0, 0.25)`, a quarter of the way up the left edge of the texture. The picture follows the surface because the UV is carried along with it.

---

## Outside the unit square: wrap modes

Nothing forces a UV to stay in `[0,1]`. UVs of `1.3` or `−0.2` are common (we make them on purpose in Part 3 to **tile**). What color comes back is set by the texture's **wrap mode**:

- **repeat** — drop the whole-number part; the image **tiles** endlessly (`1.3 → 0.3`, `2.75 → 0.75`)
- **clamp** — pin to the nearest edge; the border pixel **smears** outward (`1.3 → 1.0`)
- **mirror** — every other copy is flipped, so tiles meet **seamlessly**

Same geometry, same UVs — only the wrap rule differs. Our demo uses **repeat** so that scaling the UVs up tiles the checker.

---

## Repeat vs clamp, numerically

One value, two wrap modes. Feed the sampler `u = 1.3`:

```text
   repeat:  u_wrapped = u − ⌊u⌋ = 1.3 − 1 = 0.3     (fractional part)
   clamp:   u_wrapped = min(max(u, 0), 1) = 1.0      (pinned to the edge)
```

Under **repeat**, `1.3` reads the image at `0.3` — you have walked 30% into the **second** copy of the tiled image. Under **clamp**, `1.3` reads the image at its right edge `1.0` — every value past 1 returns that same edge column.

---

### Part 3 · Placement transforms

<small>(~25 min)</small>

---

## Placing the texture = transforming the UVs

Authored UVs give **one** default placement (the image, once, across the surface). To **slide** the image over, **spin** it, or **tile** it, we do not touch the geometry — we **transform the UVs** before the lookup:

- **offset** `(offU, offV)` — slide the image across the surface
- **rotation** — spin the image about a point
- **tile / scale** — a factor > 1 shrinks the image in UV terms, so it **repeats** more (with repeat wrap)

All three are a **2D transform applied to `(u,v)`**. And a 2D transform of a coordinate is exactly what S04 built — only there it was 3D. Here it is one dimension smaller.

---

## It is S04's matrix, now 3×3

To rotate-and-translate a 2D point with a single matrix, we use S04's **homogeneous** trick one dimension down: write `(u, v)` as `(u, v, 1)` and use a **3×3** matrix:

```text
        ┌ a  b  tx ┐   ┌ u ┐     a,b,c,d  = rotate + scale (the 2×2 block)
   M =  │ c  d  ty │ · │ v │      tx, ty   = translation (offset)
        └ 0  0  1  ┘   └ 1 ┘      bottom row 0 0 1 = homogeneous
```

- 3D placement (S04) used a **4×4** on `(x, y, z, 1)`
- 2D placement (UV) uses a **3×3** on `(u, v, 1)`

Same structure: a linear block for rotation/scale, a translation column, a homogeneous bottom row. The only change is the **dimension**.

---

## Rotate and scale about the UV center

Rotating `(u,v)` directly spins the image about the **corner** `(0,0)` — the texture swings away off-screen. We want it to spin about its **center** `(0.5, 0.5)`. That is exactly S04's **rotate-about-a-point** pattern, `T·R·T⁻¹`:

```text
   1. T(−c)   move the center to the origin        c = (0.5, 0.5)
   2. R       rotate (and scale) about the origin
   3. T(+c)   move the center back
```

Do the same for scale/tiling, so the texture grows or spins **in place** around its middle instead of sliding toward a corner. Wrapping a rotation in `T(c)·R·T(−c)` is the identical trick we used to orbit in 3D — reused, one dimension down.

---

## The placement matrix, assembled

Put it together — offset, plus rotate-and-scale about the center. Our library's `uvMat3(offU, offV, rot, tileU, tileV)` builds exactly this, in this order (right-to-left on the UV point):

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

At the demo's defaults — no offset, no rotation, tile = 2 — the matrix is pure scale about the center. Displayed row-major, matching the live `Mat3Panel`, 2 decimals:

```text
   offU = 0, offV = 0, rot = 0°, tile = 2

        ┌  2.00   0.00  −0.50 ┐
   M =  │  0.00   2.00  −0.50 │
        └  0.00   0.00   1.00 ┘
```

The `2.00` on the diagonal is the tile factor: UVs are doubled, so with **repeat** wrap the checker fits **twice** on each axis. The `−0.50, −0.50` in the last column is what keeps that doubling centered on `(0.5, 0.5)` instead of the corner — the center sandwich, in numbers. The bottom row `0, 0, 1` is the homogeneous row.

---

## Worked matrix: offset, rotate, tile

Turn on all three — offset the U by 0.25, rotate 45°, tile 2. Displayed row-major, matching the live `Mat3Panel`, 2 decimals:

```text
   offU = 0.25, offV = 0, rot = 45°, tile = 2      (cos45° = sin45° = 0.7071)

        ┌  1.41   1.41  −0.66 ┐
   M =  │ −1.41   1.41   0.50 │
        └  0.00   0.00   1.00 ┘
```

The 2×2 block is `tile · [cos, sin; −sin, cos]` = `2 · 0.7071 = 1.41` on the diagonal, `±1.41` off it — rotation **and** the ×2 tile, together. The last column `−0.66, 0.50` is the center-sandwich translation **plus** the `+0.25` offset folded into U. Every cell is one of the three knobs.

---

## Building it yourself: TexturePlacement.cs

Sung's `8.2.OurOwnTexturePlacement` makes students do the placement **by hand** — no engine helper. Each frame it **scales** and **offsets** the saved initial UVs and writes them back:

```csharp [1-11]
public Vector2 Offset = Vector2.zero;   // the offU, offV of our matrix
public Vector2 Scale  = Vector2.one;    // the tile factor
Vector2[] mInitUV;                       // the authored (col/2,row/2) UVs, saved

void Update() {
    Vector2[] uv = theMesh.uv;
    for (int i = 0; i < uv.Length; i++) {
        uv[i].x = mInitUV[i].x * Scale.x;   // scale about the corner...
        uv[i].y = mInitUV[i].y * Scale.y;
        uv[i]   = Offset + uv[i];            // ...then offset
    }
    theMesh.uv = uv;                         // hand the placed UVs back
}
```

Same offset-and-scale as our matrix (here about the **corner**, no rotation) — students own the placement.

---

## Meet the demo: place a texture

The `uv-placement` demo textures a quad with an in-code **8×8 checkerboard** and drives its `texture.matrix` **straight from our `uvMat3`** — the exact matrix we just built. Two controls on the slide:

- **`offU`** — slide the checker across the surface (the translation cell moves)
- **`tile`** — the scale factor; at 2 the checker fits twice per axis, at 6 it fits six times

The panel shows the live **3×3** matrix as you drag — the same numbers as our worked slides. The full sandbox adds `offV` and `rot`.

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

### Part 4 · Sampling

<small>(~20 min)</small>

---

## From (u,v) to a pixel

After placement, each pixel has a final `(u,v)`. **Sampling** is turning that coordinate into an actual color from the texel grid. It is rarely a clean hit on one texel — the pixel's footprint usually falls **between** texels, or covers **many** — so the sampler must **filter**:

- **magnification** — the texture is **bigger** on screen than in texels; one texel spans **many** pixels
- **minification** — the texture is **smaller** on screen than in texels; one pixel covers **many** texels

These are opposite problems, and each has its own fix. The whole job of the sampler is to return a sensible color in both cases.

---

## Magnification: nearest vs bilinear

When one texel covers many pixels, how do we color the pixels **between** texel centers?

- **nearest** — snap to the closest texel. Sharp, blocky **squares** — perfect for a crisp checker or pixel art
- **bilinear** — blend the **four** surrounding texels by distance. Smooth, no blocks — natural for photos

```text
   nearest:              bilinear:
   ┌──┬──┐               ┌──┬──┐      the pixel (•) blends
   │  │  │               │ ╲│  │      the 4 nearest texels,
   ├──┼──┤ • → one texel ├──•──┤      weighted by how close
   │  │  │               │  │╱ │      each corner is
   └──┴──┘               └──┴──┘
```

Our demo uses **nearest** on purpose — the checker stays crisp, so you can see the tiling exactly. Bilinear would soften the squares' edges into gray gradients.

---

## Minification aliases: watch the checker

The hard case: the surface recedes, so **many texels** crowd into **one pixel**. Sampling just **one** of them per pixel is a lie — which texel you happen to hit changes wildly from frame to frame, and the surface **shimmers and sparkles**. This is **aliasing**.

- crank the demo's **`tile` to 6**: the checker squares get tiny, and the far part of the quad **breaks into noise** instead of clean checks
- the fix is not to pick one texel but to **average** all the texels the pixel covers — but averaging many texels **every** pixel every frame is too slow to do live

So we need the average **precomputed**. That is the mipmap.

---

## Mipmaps: prefilter the average

A **mipmap** is the texture pre-shrunk into a **pyramid** of ever-smaller copies, each level the **average** of four texels from the level below:

```text
   level 0:  8×8   (full)      each higher level is
   level 1:  4×4   (½)         the 2×2-averaged
   level 2:  2×2   (¼)         down-sample of the
   level 3:  1×1   (⅛)         one below it
```

When a pixel covers many texels, the sampler picks the level whose texels are **about pixel-sized** and reads **one** value there — but that value already **is** the average of the texels underneath. The costly per-pixel averaging is done **once**, offline.

- ~33% extra memory (the pyramid sums to 1/3 more) buys alias-free minification
- **trilinear**: blend the two nearest levels so the transition between them is smooth too

---

## Multi-texturing: blend two lookups

Nothing says a surface reads **one** texture. **Multi-texturing** samples **two** (or more) and **combines** them — a base color plus a detail layer, a diffuse map plus a stain, and so on. Sung's `8.6.MultiTexturing` shader does exactly this:

```csharp [1-9]
sampler2D _MainTex;      // texture 1: its own UVs (uv)
sampler2D _SecTex;       // texture 2: its own UVs (uv1)

fixed4 frag (v2f i) : SV_Target {
    fixed4 col = tex2D(_MainTex, i.uv);    // sample texture 1
    fixed4 c2  = tex2D(_SecTex,  i.uv1);   // sample texture 2
    col = 0.2 * col + 0.8 * c2;            // blend: 20% first, 80% second
    return col;
}
```

Two samplers, **two independent UV sets**, one weighted blend — the fragment's final color is a mix. The weights (here `0.2` / `0.8`) are just a design choice.

---

### Part 5 · Synthesized textures + CDP

<small>(~15 min)</small>

---

## A texture can be a function

Every texture so far was an **image** — stored texels. But sampling only needs a **color for a `(u,v)`**, and a **function** supplies that as well as a lookup table does:

```text
   image texture:       color = imageLookup(u, v)      (read stored texels)
   procedural texture:  color = f(u, v)                (compute from math)
```

- **no memory** for pixels — just the formula; never blocky
- perfect for **regular** patterns (checker, brick) and **noise** (marble, wood, clouds)
- the trade: an **arbitrary** picture (a face) is easier to paint than to derive

The checker in our demo is exactly this — a function of `(u,v)`, not an image.

---

## The checker, as math

Sung's `8.7.SynthesizedTextures` computes the checker in the **shader**, straight from `(u,v)` — the classic "is `⌊u⌋ + ⌊v⌋` even?" test, scaled by a repeat count:

```csharp [1-8]
// URepeat, VRepeat = how many checks across; Color1/Color2 = the two colors
int scaledU = int(i.uv.x * URepeat);   // which column of checks
int scaledV = int(i.uv.y * VRepeat);   // which row of checks
int uEven = fmod(scaledU, 2);          // 0 or 1
int vEven = fmod(scaledV, 2);
fixed4 ct = Color1;
if (uEven != vEven)                     // exactly one odd → the "other" square
    ct = Color2;
```

Multiply `(u,v)` by the repeat count, take the **integer** part to get which square you are in, and pick the color by the **parity** of `column + row`. Pure math → color. Our demo's 8×8 checker uses the same parity idea, precomputed into a `DataTexture`.

---

## Beyond patterns: noise (a teaser)

Regular patterns are easy. **Natural** surfaces — marble, wood, clouds, terrain — are **irregular** but not **random**: they need a controllable, smooth randomness called **noise**. A noise function turns `(u,v)` (or `(x,y,z)`) into a smoothly varying pseudo-random value you can shape into a material:

```text
   marble ≈ f( u, v + noise(u, v) )         warp a stripe pattern by noise
   wood   ≈ f( distance from an axis + noise )
```

Layer noise at several scales (**octaves**) and you get convincing organic detail — all from math, no image. The **deep** version of noise-based texturing is a subject of its own, **beyond this course's scope**; tonight it is enough to know a texture can be **computed**, from a clean checker to a noisy marble.

---

## The CDP: run the Topic8 projects

Thursday's studio runs Sung's real **texture-mapping** projects:

- **`8.1.UVOnVertices`** — the per-vertex `uv[]` assignment; the `(col/2, row/2)` table on the grid
- **`8.2.OurOwnTexturePlacement`** — `TexturePlacement.cs`: scale + offset the UVs by hand
- **`8.6.MultiTexturing`** — two samplers blended in the shader (`0.2` / `0.8`)
- **`8.7.SynthesizedTextures`** — the procedural checker computed from `(u,v)`

Implement-and-replace (S05): you build the UVs and the placement yourself.

---

## Texturing, one idea

- A **texture** adds surface detail **without geometry** — a 2D image (or **function**) glued to the mesh
- **UV coordinates** are a **per-vertex** attribute on `[0,1]²`, **interpolated** across each triangle
- **Placement** transforms the UVs — a **3×3 matrix**, S04's rotate-about-a-point pinned to the UV **center**
- **Sampling** filters the texel grid: nearest vs bilinear, and **mipmaps** to stop minified surfaces aliasing
- A texture can be **synthesized** — the checker is `f(u,v)`, pure math → color

---

## Thursday: texture studio + MP6 lab

- **Texture studio** — run `8.1.UVOnVertices`, `8.2.OurOwnTexturePlacement`, `8.6.MultiTexturing`, `8.7.SynthesizedTextures`: read the UVs, place the image by hand, blend two textures, and see the procedural checker
- **MP6 lab time** — hands-on work on the polygonal-modeling editor, including its **texture-placement** part
- bring a **laptop**; the projects are on **Canvas**

---

## Wrap

- **Thursday** — the texture CDP studio (`8.1`/`8.2`/`8.6`/`8.7`) + MP6 lab time
- **MP6 continues** — its texture-placement part is tonight's Part 3, applied to your own mesh. *Details on Canvas.*

A texture is a **lookup**: a coordinate in, a color out. Author a `(u,v)` per vertex, **place** it with a 3×3 matrix, **sample** it with a filter — or skip the image and **compute** the color from math. Detail without geometry.

