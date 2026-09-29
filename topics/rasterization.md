<!--
  CSS 551 · TOPIC DECK: Rasterization, how a projected triangle becomes pixels (~45 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/rasterization.md"> among others; no lecture
  logistics, no "Part N" numbering.

  TEACHES: the edge function as the which-side test, one pixel worked (E = 0.1264,
  0.1072, 0.1804); triangle setup (bounding box 90 of 144 pixels, per-step
  increments, fixed point at 1/256 pixel); the top-left rule on a shared diagonal
  (20 fragments to 16); barycentric weights as normalized edge functions (0.305,
  0.259, 0.436) and the interpolated color; near-plane clipping in clip space (a
  quadrilateral, two triangles); the depth buffer (13 of 16 drawn); early z and
  overdraw (6.2 M against 2.07 M shaded fragments); perspective-correct
  interpolation (u = 0.167, not 0.5); the over operator and premultiplied alpha;
  the GPU pipeline and the 8 ns per-pixel budget.
  NEEDS:   the vectors topic (the which-side test, the cross product); the viewing
           topic (clip coordinates, the divide, NDC).
  DEMOS:   data-demo="raster" data-controls="res,angle" (under the page's crop).
  FIGURES: ../../textbook/figures/ras-*.svg (tools/gen-textbook-figures-pipeline.mjs).
  NUMBERS: textbook/figures/numbers-pipeline.json (ras.*).

  reveal.js: FLAT; notes follow "Note:"; plain unicode math, no KaTeX; never two
  "_" on one markdown line outside a code fence (edge functions are written E12,
  E20, E01). Paths are relative to the lecture page (lectures/LNN-slug/index.html).
-->

### Rasterization: from a triangle to pixels

<small>(~45 min)</small>


---

## The problem

Viewing leaves each triangle as **three points** on the image plane. The screen is a **grid of pixels**. For every pixel, two questions:

- **is it inside?** test the pixel's **center** against the triangle
- **what color?** blend the three corners' attributes (color, normal, UV, depth) by where the center sits

The answer to both is the same three numbers per pixel, the **edge functions**. A GPU evaluates them for billions of pixel centers a second.


---

## The edge function

For a directed edge from **a** to **b** and a point **p** on the image plane:

```text
   E_ab(p) = (bx − ax)(py − ay) − (by − ay)(px − ax)
           = z component of (b − a) × (p − a)
```

- **positive** when p is to the **left** of the edge, zero **on** it, negative to the right
- it is twice the signed area of the triangle (a, b, p): the vectors topic's which-side test, in 2D
- for a counter-clockwise triangle v0 v1 v2, **p is inside exactly when E12, E20, E01 are all ≥ 0**

And it is **linear** in p: one pixel to the right adds a constant. Three additions per pixel, which is why it could be frozen into silicon (Pineda, 1988).


---

## One pixel, by hand

<img src="../../textbook/figures/ras-edge-functions.svg" class="media-shot" style="max-height: 250px;" alt="the demo's triangle over a 12 by 12 pixel grid, pixel centers as dots, pixel (5, 6) outlined as inside and pixel (1, 9) dashed as outside">

```text
   v0 = (0.242, 0.143)   v1 = (0.877, 0.479)   v2 = (0.361, 0.858)      twice-area E01(v2) = 0.414
   pixel (5, 6) of 12×12:  center ((5 + ½)/12, (6 + ½)/12) = (0.458, 0.542)

   E12 = (0.361 − 0.877)(0.542 − 0.479) − (0.858 − 0.479)(0.458 − 0.877) = 0.1264
   E20 = (0.242 − 0.361)(0.542 − 0.858) − (0.143 − 0.858)(0.458 − 0.361) = 0.1072
   E01 = (0.877 − 0.242)(0.542 − 0.143) − (0.479 − 0.143)(0.458 − 0.242) = 0.1804    all ≥ 0: inside
```

Pixel (1, 9): E = (0.124, −0.161, 0.451), one negative, **outside**. Of 144 pixels, **28** pass (19.4 %).


---

## Triangle setup: visit only the box

The rasterizer does not test all 144 pixels. Once per triangle it computes:

- the **bounding box**, clamped to the screen: columns 2 to 10, rows 1 to 10, **90 pixels**
- each edge function at the box's first pixel center
- each edge function's **step** per pixel in x and in y (the coefficients of the linear form)

```text
   edge   ∂E/∂x    ∂E/∂y          at pixel (4, 6):  E = (22.741, 6.862, 30.019)   (pixel² units)
   E12   −4.548   −6.192          one step right, (5, 6):
   E20    8.580   −1.428             (22.741 − 4.548,  6.862 + 8.580,  30.019 − 4.032)
   E01   −4.032    7.620           = (18.193, 15.442, 25.987)  = 144 × (0.1264, 0.1072, 0.1804)
```

In hardware the vertices snap to **1/256 pixel** (8 sub-pixel bits): every E is an integer, and no rounding error accumulates along a row.


---

## Shared edges: the top-left rule

<img src="../../textbook/figures/ras-fill-rule.svg" class="media-shot" style="max-height: 230px;" alt="two triangles sharing the diagonal of a 4 by 4 grid, the four pixel centers on the diagonal marked, drawn twice without a rule and once with it">

A pixel center **exactly on** a shared edge (E = 0) happens constantly: a diagonal through the grid hits one per row.

```text
   T1 = (0,0) (4,0) (4,4)     T2 = (0,0) (4,4) (0,4)      4 centers on the diagonal
   no rule:        T1 10 + T2 10 = 20 fragments for 16 pixels, 4 drawn twice
   top-left rule:  T1 10 + T2  6 = 16, none twice, no gap
```

A tie is drawn only if the edge is a **top** or **left** edge of its triangle. A transparent mesh at α = 0.5 drawn twice on the seam composites to **0.75**: a visible line.


---

## Barycentric weights: what color is it?

Divide the three edge functions by the twice-area and they are the pixel's **barycentric coordinates**, the weights that write p as a blend of the corners:

```text
   w0 = E12(p) / E01(v2)    w1 = E20(p) / E01(v2)    w2 = E01(p) / E01(v2)      w0 + w1 + w2 = 1

   pixel (5, 6):  w = (0.1264, 0.1072, 0.1804) / 0.414 = (0.305, 0.259, 0.436)

   color = 0.305 · red (0.92, 0.25, 0.20) + 0.259 · green (0.20, 0.75, 0.35) + 0.436 · blue (0.20, 0.45, 0.95)
         = (0.420, 0.467, 0.566)
```

- each weight is **1** at its own vertex, **0** on the opposite edge, linear between
- **every** per-vertex attribute is interpolated this way: color, normal, UV, depth


---

## The triangle, live

<div class="cockpit" data-demo="raster" data-controls="res,angle"><pre class="viz-fallback">  one triangle (red, green, blue corners) over a res × res framebuffer;
  a pixel is drawn when its CENTER passes all three edge functions,
  and colored by the barycentric blend of the corners
  -- defaults: res = 12, angle = 15°, aa off ------------------------------
     pixels 144    covered 28    coverage 19.4 %    (true area 20.7 %)
     drag res → the same triangle, finer; drag angle → the stair-steps crawl</pre></div>


---

## Before the test: clipping at the near plane

A vertex behind the eye has **w < 0**; the divide flips it to the wrong side of the screen. So triangles are cut **before** the divide, in clip space, where the near plane is linear: `z + w ≥ 0`.

```text
   view-space v0 = (−0.8, 0.4, −3)   v1 = (1, 0.6, −2.4)   v2 = (0.3, −0.5, −0.4)   (v2 closer than near = 1)
   z + w through P:         4.571          3.200              −1.371      → two in, one out

   edge 1→2 crosses at t = 3.2 / (3.2 + 1.371) = 0.700
   edge 2→0 crosses at t = 1.371 / (1.371 + 4.571) = 0.231
   output: v0, v1, c12, c20  → a quadrilateral, fanned into (0,1,2) and (0,2,3)
```

Unclipped, v2 divides by w = 0.4 to NDC (1.02, −3.02, −4.43): off the cube and upside down.


---

## After the test: the depth buffer

<img src="../../textbook/figures/ras-zbuffer.svg" class="media-shot" style="max-height: 230px;" alt="two overlapping rectangles of pixels, A at constant depth 0.3 and B with depth rising left to right, with the resulting color and depth buffers">

Beside the color, keep per pixel the **depth of the nearest thing drawn so far**. Clear to 1 (far). A fragment writes only if it is **nearer**.

```text
   A: x 1..3, y 1..4, depth 0.3, drawn first      B: x 2..5, y 2..5, depth 0.2 + 0.1 (x − 2), drawn second
   x = 2:  B 0.2 < 0.3  → B wins (3 pixels)       x = 3:  B 0.3, not < 0.3 → discarded (3 pixels)
   B: 16 fragments, 13 drawn, 3 rejected.  Draw B first: the same picture.
```


---

## Early z: do not shade what will be hidden

The depth test is drawn after the fragment shader, but a fragment that fails it was shaded for nothing. Hardware tests **first** whenever the shader does not write depth or discard.

```text
   the two rectangles:   A then B   28 shaded without early z,   25 with it
                         B then A   28 shaded without,           22 with it

   1920 × 1080, average overdraw 3:
      back to front     6,220,800 fragments shaded
      random order      3,801,600     (1 + ½ + ⅓ = 1.83 per pixel)
      front to back     2,073,600     (one per pixel)
```

Engines sort opaque draws **front to back**, or draw a cheap depth-only pass first so that shading has **zero overdraw**.


---

## Perspective-correct interpolation

<img src="../../textbook/figures/ras-perspective-correct.svg" class="media-shot" style="max-height: 200px;" alt="an edge receding from depth 1 to depth 5 with u from 0 to 1; the screen midpoint lies only a sixth of the way along the edge">

Screen-space weights are linear **on the screen**; attributes are linear **in the world**. Interpolate `a/w` and `1/w`, then divide.

```text
   A: x = −1, z = −1, u = 0      B: x = 1, z = −5, u = 1      screen x: −1 → 0.2
   screen midpoint (t = ½, x = −0.4):
      linear      u = 0.5                                     wrong
      1/w  = ½·(1/1) + ½·(1/5) = 0.6      depth 1/0.6 = 1.667
      u/w  = ½·(0/1) + ½·(1/5) = 0.1      u = 0.1 / 0.6 = 0.167
```

The screen's midpoint is a **sixth** of the way along the edge. Without the division, a receding texture slides toward the near end.


---

## Blending: the over operator

A fragment that passes the depth test can be **combined** with what is there instead of replacing it:

```text
   C = α · Csrc + (1 − α) · Cdst                       (Porter and Duff, 1984)

   red at α 0.5 over blue           → (0.5, 0, 0.5)
   green at α 0.5 over that         → (0.25, 0.5, 0.25)
   the two swapped                  → (0.5, 0.25, 0.25)      not commutative: sort back to front
```

**Premultiplied** color stores (αC, α). Filter a texel pair opaque red (1,0,0,1) and transparent (0,0,0,0) halfway, then composite over white:

```text
   straight:       color (0.5, 0, 0), α 0.5  → 0.5·(0.5,0,0) + 0.5·(1,1,1) = (0.75, 0.5, 0.5)   a dark fringe
   premultiplied:  (0.5, 0, 0, 0.5)          → (0.5,0,0) + 0.5·(1,1,1)     = (1, 0.5, 0.5)     correct
```


---

## The GPU pipeline

| stage | does | where it was taught |
| ----- | ---- | ------------------- |
| vertex shader | M, V, P per vertex; outputs clip coordinates | affine, scene graphs, viewing |
| clip, divide, viewport | near-plane clip, ÷w, to pixels; cull by the twice-area sign | viewing, here |
| rasterize | setup, edge functions, tie rule, barycentric, ÷w interpolation | here |
| fragment shader | per covered sample: texture lookups, lighting | texture mapping, illumination |
| depth test, blend | z compare (early when possible), over | here |


---

## The budget

```text
   60 frames per second                   16.67 ms per frame
   1920 × 1080                            2,073,600 pixels
   pixels per second                      124,416,000
   time per pixel, if one core did it     8 ns
```

Eight nanoseconds is a few dozen instructions on one core. The GPU meets the budget by running **thousands** of pixels at once, and every technique in this topic (setup once, three additions per pixel, early z, no overdraw) exists to keep the per-pixel work small.

