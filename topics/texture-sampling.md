<!--
  CSS 551 · TOPIC DECK: Texture sampling, from a coordinate to a color (~14 min, 11 slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/texture-sampling.md"> among others; no
  lecture logistics, no "Part N" numbering.

  TEACHES: the lookup as texel addressing (u·W − 0.5, texel centers); the two
  regimes; magnification with one bilinear sample worked (0.411 against nearest
  0.2); minification and aliasing; the mipmap (32.8 % overhead) and the level from
  the footprint (λ = 1.696); bump mapping as detail in the normal (N·L 0.669 → 0.441),
  live; shadow maps as the per-light visibility test (bias 0.0197, 1.5 texels).
  NEEDS:   the texture-coordinates topic (UVs, placement); the illumination topic
           (N·L, local and global illumination); rasterization (the depth buffer);
           the antialiasing topic (the footprint from the 2×2 quad's derivatives).
  DEMOS:   data-demo="bump-map" data-controls="bump,lightAz" (under the page's crop).
  FIGURES: ../../textbook/figures/tex-filtering.png, tex-minification.png, tex-mipmap.png,
           tex-bump.png, tex-shadowmap.svg (textbook generators).
  NUMBERS: textbook/figures/numbers-surfaces.json (tex.*) and numbers-systems.json (aa.mip);
           every printed number recomputed in node on 2026-11-10.
  SUPPLEMENT: topics/texture-sampling-supplement.md (compression, normal maps and tangent
           space, procedural textures, cube maps), mounted after the lecture's wrap.

  Split from texture-mapping.md (2026-10-06, archived in topics/archive/).
  EDIT 2026-11-10: to the deck contract (MathJax display formulas with the ASCII as aria-label;
  the chapter's filtering and mipmap figures in place of the ASCII drawings). Four slides moved to
  the supplement. Shadow maps: 0.0131 is the depth change per texel, the bias 0.0197 is a texel
  and a half (the slide had called 0.0197 one texel); the slide now names the comparison as the
  per-light visibility test the local illumination model leaves out.
  Then (Marcel: "let's present concepts not calculations, unless the calculations reveal something
  about the concepts"): the lookup, the level and the bump slides state the rule, not a worked instance;
  the bilinear sample stays worked (Quiz 5's tex-bilinear uses its 0.411).

  reveal.js: FLAT; notes follow "Note:" and stay plain text. Display math is a raw <div class="tex">
  block typeset by MathJax (lib/deck-math.js; TeX inside, the ASCII form as aria-label, no blank line
  inside); inline math is a code span written `$...$`. Code identifiers stay plain code spans. Never
  two "_" on one markdown line outside a code fence, code span or tex block; paths relative to the
  lecture page.
-->

### Texture sampling: from a coordinate to a color

<small>(~14 min)</small>


---

## The lookup: a coordinate in, a texel out

Every pixel of a textured triangle arrives with its own `(u, v)`: interpolated from the vertices' UVs, then placed by the 3×3 placement matrix. The **sampler** turns it into a color.

<div class="tex" style="font-size:0.74em" role="img" aria-label="a W × H image: texel i covers u from i/W to (i+1)/W; its center is at (i + 0.5)/W
continuous texel coordinate:   x = u·W − 0.5,   y = v·H − 0.5">
\[ \text{texel } i \text{ covers } u \in \left[\tfrac{i}{W},\ \tfrac{i+1}{W}\right), \text{ center } \tfrac{i + 0.5}{W} \qquad\Rightarrow\qquad x = uW - 0.5, \quad y = vH - 0.5 \]
</div>

- **texel**: one pixel of the texture image; its value belongs to its **center**, hence the − 0.5
- the **wrap mode** maps `(u, v)` into the unit square first (under repeat, `$u = 1.3$` reads the same texel as `$0.3$`)
- then the **filter** decides which texels to read and how to weight them


---

## Two regimes: magnification and minification

A sample is rarely a clean hit on one texel, the pixel's footprint usually falls **between** texels, or covers **many**, so the sampler must **filter**:

- **magnification**: the texture is **bigger** on screen than in texels; one texel spans **many** pixels
- **minification**: the texture is **smaller** on screen than in texels; one pixel covers **many** texels

These are opposite problems, and each has its own fix. The whole job of the sampler is to return a sensible color in both cases.


---

## Magnification: nearest vs bilinear

When one texel covers many pixels, how do we color the pixels **between** texel centers?

- **nearest**: snap to the closest texel: blocky **squares**, right for pixel art
- **bilinear**: blend the **four** surrounding texels by distance: smooth, right for photos

<img src="../../textbook/figures/tex-filtering.png" class="media-shot" style="height: 160px; image-rendering: pixelated;" alt="nearest:              bilinear:
┌──┬──┐               ┌──┬──┐      the pixel (•) blends
│  │  │               │ ╲│  │      the 4 nearest texels,
├──┼──┤ • → one texel ├──•──┤      weighted by how close
│  │  │               │  │╱ │      each corner is
└──┴──┘               └──┴──┘
The next slide's 4×4 texture magnified 40 times: nearest (left) gives flat blocks, bilinear (right) smooth gradients between the texel centers (red crosses); the blue square is the sample (0.3, 0.6).">

The next slide's 4×4 texture, magnified 40 times: red crosses are texel centers, the blue square is the sample.


---

## One bilinear sample, by hand

A 4×4 texture, sampled at `$(u, v) = (0.3, 0.6)$`. Texel coordinates are `$(4u - 0.5,\ 4v - 0.5) = (0.7,\ 1.9)$`: between columns 0 and 1, rows 1 and 2, with fractions `$f_x = 0.7$`, `$f_y = 0.9$`.

<div class="tex" style="font-size:0.7em" role="img" aria-label="the four texels:  t00 = 0.2   t10 = 0.9   (row 1);   t01 = 0.8   t11 = 0.2   (row 2)
along x, row 1:  0.2 + 0.7·(0.9 − 0.2) = 0.69
along x, row 2:  0.8 + 0.7·(0.2 − 0.8) = 0.38
along y:         0.69 + 0.9·(0.38 − 0.69) = 0.411
weights (1−fx)(1−fy), fx(1−fy), (1−fx)fy, fx·fy = 0.03, 0.07, 0.27, 0.63   (sum 1)">
\[ \begin{aligned} \text{texels:} &\quad t_{00} = 0.2,\ t_{10} = 0.9 \ \text{(row 1)}, \quad t_{01} = 0.8,\ t_{11} = 0.2 \ \text{(row 2)} \\ \text{along } x \text{, row 1:} &\quad 0.2 + 0.7\,(0.9 - 0.2) = 0.69 \\ \text{along } x \text{, row 2:} &\quad 0.8 + 0.7\,(0.2 - 0.8) = 0.38 \\ \text{along } y\text{:} &\quad 0.69 + 0.9\,(0.38 - 0.69) = \mathbf{0.411} \\ \text{weights:} &\quad (1-f_x)(1-f_y),\ f_x(1-f_y),\ (1-f_x)f_y,\ f_x f_y \\ &\quad = 0.03,\ 0.07,\ 0.27,\ 0.63 \ \text{(sum 1)} \end{aligned} \]
</div>

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

<img src="../../textbook/figures/tex-mipmap.png" class="media-shot" style="height: 96px; image-rendering: pixelated;" alt="level 0:  8×8   (full)      each higher level is
level 1:  4×4   (½)         the 2×2-averaged
level 2:  2×2   (¼)         down-sample of the
level 3:  1×1   (⅛)         one below it
The 8 by 8 checker followed by its three mip levels: a 4 by 4 square, a 2 by 2 square and a single texel, all uniform gray.">

The 8×8 checker and its levels 4×4, 2×2, 1×1, each uniform gray. The sampler reads **one** value at the level whose texels are **about pixel-sized**, and that value already **is** the average underneath.

- `$64 + 16 + 4 + 1 = 85$` texels for an 8×8 base: 32.8 % extra memory (the series tends to `$\tfrac43$`)
- **trilinear**: blend the two nearest levels, so the switch between them is smooth


---

## Which level? The footprint

How many texels does one pixel cover? The screen-space derivatives of `(u, v)` (the antialiasing topic's 2×2 quad) give the footprint in texels; its log picks the level:

<div class="tex" style="font-size:0.8em" role="img" aria-label="ρ = size · max( |(∂u/∂x, ∂v/∂x)|, |(∂u/∂y, ∂v/∂y)| )   the longer side of the footprint, in texels
λ = log₂ ρ      ρ = 1 → level 0,  ρ = 2 → level 1,  ρ = 4 → level 2">
\[ \rho = \text{size} \cdot \max\!\Big( \big\lVert (\tfrac{\partial u}{\partial x}, \tfrac{\partial v}{\partial x}) \big\rVert,\ \big\lVert (\tfrac{\partial u}{\partial y}, \tfrac{\partial v}{\partial y}) \big\rVert \Big) \qquad \lambda = \log_2 \rho \]
</div>

- each level halves the texels, so doubling the footprint moves **one level** up
- `$\lambda$` is rarely whole: **trilinear** reads the two nearest levels and blends them (a footprint of 3.2 texels gives `$\lambda = 1.7$`, 70 % of the way from level 1 to level 2)
- a footprint much longer in one direction is **anisotropic**: taking the longer side blurs the shorter one; anisotropic filtering takes several samples along the long side at a finer level


---

## Bump mapping: detail in the normal

A texture can store not a color but a **height** `$h(u, v)$`. Its **slope tilts the normal**, and the lighting does the rest; the geometry stays flat:

<div class="tex" style="font-size:0.8em" role="img" aria-label="n = normalize( −k·∂h/∂u,  −k·∂h/∂v,  1 )     k: the bump strength">
\[ n = \operatorname{normalize}\!\left(-k\,\tfrac{\partial h}{\partial u},\ -k\,\tfrac{\partial h}{\partial v},\ 1\right) \qquad k \text{: the bump strength} \]
</div>

<img src="../../textbook/figures/tex-bump.png" class="media-shot" style="max-height: 170px;" alt="a flat quad lit with a brick height map: without bump mapping it is uniformly lit; with it the mortar grooves shade as if recessed">

On the brick wall, the groove's side tilts the normal about 24° away from the light: N·L drops from 0.67 to 0.44, and the groove **reads as recessed** on a surface that is flat.


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

## Shadow maps: depth from the light

<img src="../../textbook/figures/tex-shadowmap.svg" class="media-shot" style="max-height: 200px;" alt="a box on a floor lit by a directional light; the light's depth map and two floor points, one in the box's shadow">

Williams (1978): render the scene's **depth from the light** into a texture. When shading a point, transform it to the light's view and compare:

<div class="tex" style="font-size:0.72em" role="img" aria-label="a point in the box's shadow:   stored depth 9.333,  its own depth 10.833   farther → in shadow
a lit floor point:             stored 8.333,        its own 8.333          equal   → lit">
\[ \begin{aligned} \text{in the box's shadow:}& \quad \text{stored } 9.333 < \text{own } 10.833 \;\Rightarrow\; \text{shadowed} \\ \text{lit floor point:}& \quad \text{stored } 8.333 = \text{own } 8.333 \;\Rightarrow\; \text{lit} \end{aligned} \]
</div>

- the comparison is the **visibility test** the local model leaves out, for one light: a factor of **0 or 1** on that light's diffuse and specular
- the floor's depth changes `$0.0131$` per texel (it slopes 48° to the light); a bias of a texel and a half, `$0.0197$`, stops it shadowing itself
