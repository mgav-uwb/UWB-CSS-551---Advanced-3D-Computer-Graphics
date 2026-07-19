<!--
  CSS 551 · Lecture 1 (Session 1) — 3D Computer Graphics: The Big Picture.
  A story-driven, informal overview of the WHOLE field. v2 restructure: the
  running example is "our scene" — a modified Cornell box (one red wall, one
  green, white everywhere else; a brick pillar, a sphere, the Stanford bunny
  on a pedestal, one ceiling light) that the deck renders LIVE (the our-scene
  demo closes Act 2) and checkpoints with pre-rendered stills at every act
  close. No math, no equations — scale facts (counts, times) are the only
  numbers. Every technical term is bolded exactly ONCE, at its introduction,
  then used plainly ever after.

  Live demos are PAIRS: a setup slide (what the demo shows + what to look
  for + the act's era-anchor line where the map below says) followed by a
  full-slide exhibit whose first line is the reveal comment
      .slide: class="demo-full"
  holding ONLY a short ## title + the embed div (+ its viz-fallback pre).
  index.html's .demo-full CSS grows those embeds to ~520px viewports; embeds
  on ordinary slides (none remain here) keep the 200px teaser crop.

  reveal.js: FLAT deck — every slide is a top-level "---" section (no vertical
  "--" stacks). This keeps the verify-deck harness's demo probe correct: it
  selects "section.present [data-demo]", which inside a vertical stack matches
  a demo on a not-yet-shown sibling slide (0x0 -> fill times out) and can also
  mis-count the walk. Flat = one section per slide = only matched when shown.
  S02-S10 copy this: keep decks flat. Notes follow "Note:".

  MARKDOWN/KaTeX minefield (marked runs before KaTeX): never two "_" on one
  line; no <small> around math; this deck has NO math at all, on purpose —
  the informal register is the point. Verify every slide at 1280x620.

  DEMOS (12 embeds, all registry slugs, embed stage; each a setup+demo-full
  PAIR):
   - Act 1: data-demo="mesh-view"    data-controls="wire,spin"
              (REPLACES the old mesh-grid embed — mesh-grid is S07's, not
               this deck's; the mesh figure slide stays)
            data-demo="scene-graph"  data-controls="baseRy,armBend"
   - Act 2: data-demo="projection"   data-controls="fov"
            data-demo="raster"       data-controls="res,angle"
            data-demo="illumination" data-controls="lightAz,lightEl"
            data-demo="our-scene"    data-controls="stage,lightX"  (act close)
   - Act 3: data-demo="uv-placement" data-controls="offU,tile"
            data-demo="bump-map"     data-controls="bump,lightAz"
   - Act 4: data-demo="raster"       data-controls="res,aa"
   - Act 6: data-demo="lod"          data-controls="level,dist"
   - Act 7: data-demo="keyframe"     data-controls="t,ease"
   - Act 8: data-demo="gsplat"       data-controls="fov"
              (fov slider so the verify-deck pixel probe has a control to
               drive; the scene itself needs none)
  Readout/matrix cards are hidden by this deck's index.html for all demos
  EXCEPT lod, bump-map, mesh-view, and our-scene, whose count readouts are
  scale facts and the point (overview register, no math on screen). The
  upgraded demos (mesh-view, lod, illumination, uv-placement, bump-map)
  carry a model-selector button row visible in embeds — Notes direct its
  live use (e.g. "switch to the bunny").

  SCENE STILLS: figures/scene-stage0..4.png + scene-hero.png are GENERATED
  by tools/gen-scene-shots.mjs (the our-scene demo rendered headless) —
  re-run the tool, never hand-edit the PNGs. scene-hero.png is an orbited
  angle with the RED wall out of frame (flagged in its slide's Note);
  scene-stage4.png is the canonical dual-wall Cornell view — Cornell-box
  slides use stage4.

  FIGURES: sessions/S01-.../figures/*.svg are GENERATED — edit
  tools/gen-figures.mjs and re-run it, never the SVGs.
  MEDIA: ../../media/overview/*.jpg, all license-verified; on-slide credit
  lines are copied VERBATIM from media/overview/CREDITS.md — edit there first.
  READING: ../../handouts/ch01-intro-3d-graphics.html is the primary reading
  (the field's history, papers, people) — pointed to from the "Tonight"
  slide, the wrap slide's reading line, and the per-act era-anchor lines that
  deep-link its section ids (#era-utah, #era-raster, #era-photograph,
  #era-capture, #era-realtime, #era-neural). The Act 0 timeline slide shows
  ../../handouts/figures/cg-timeline.svg.

  Session plan (120 min, Tue 5:45-7:45 PM synchronous online). Sums to ~111
  + buffer. 84 slides total:
    0:00  Intro (title + tonight's shape)          ~2 min   (2 slides)
    0:02  Act 0  The goal, pixels, our scene        8 min   (6 slides)
    0:10  Act 1  A world in numbers                12 min  (10 slides)
    0:22  Act 2  From scene to image               18 min  (15 slides)
    0:40  Act 3  Surfaces that lie                 12 min  (10 slides)
    0:52  Act 4  The jaggies problem                8 min   (6 slides)
    1:00  Act 5  Chasing the photograph            10 min   (7 slides)
    1:10  Act 6  Where worlds come from            14 min  (10 slides)
    1:24  Act 7  Making it move                    14 min  (10 slides)
    1:38  Act 8  Worlds you can enter               8 min   (6 slides)
    1:46  Wrap                                      5 min   (2 slides)
    1:51  end (+ buffer)
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 1 — 3D Computer Graphics: The Big Picture**

*One scene, start to finish.*

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>

---

## Tonight

We build **one small world** — and meet every area of computer graphics on the way.

- put a world in numbers — then take its picture
- make surfaces look real, and fix the jagged edges
- chase the photograph (or choose not to)
- where worlds come from — then make them move
- step inside

<small>Thursday = hands-on studio: Unity install + your first code.</small>

<small>Primary reading: <a href="../../handouts/ch01-intro-3d-graphics.html">Chapter 1 · Introduction to 3D Computer Graphics</a> — the story behind everything tonight.</small>

---

## The goal, in one sentence

> **Synthesize** a 2D **image** of a 3D **scene**.

- *synthesize* — the picture is **computed**, not photographed
- that, whole, is the field of **computer graphics**
- the mirror-image field: computer vision *analyzes* images — we *make* them

---

## A screen is a grid of pixels

<img src="figures/pixels-zoom.svg" alt="a coarse pixel grid on a screen, with a 3×3 patch magnified to show each pixel's red, green, blue numbers" style="max-height: 370px; width: auto;">

a **pixel** — *picture element* — is one little colored square of the grid

---

## A color is three numbers

- each pixel stores three numbers: **RGB** — red, green, blue intensities
- the **framebuffer** is the whole array in memory — a few million numbers
- the monitor repaints itself *from the framebuffer*, 60 times a second

So "drawing" — anything, ever — means one thing: **write numbers into the framebuffer.**

---

## Where those numbers show up

<div style="display: flex; gap: 14px; justify-content: center; align-items: flex-start;">
<div style="flex: 1 1 0; min-width: 0;"><img src="../../media/overview/open-movie-still.jpg" class="media-shot" style="max-height: 200px;" alt="Big Buck Bunny character still from the Blender open movie — a plump animated rabbit"><small class="credit">© Blender Foundation | bigbuckbunny.org</small></div>
<div style="flex: 1 1 0; min-width: 0;"><img src="../../media/overview/cad-model.jpg" class="media-shot" style="max-height: 200px;" alt="engineering CAD render of a quasi-poloidal stellarator, a precisely modeled fusion device"><small class="credit">U.S. Government · Public domain · via Wikimedia Commons</small></div>
<div style="flex: 1 1 0; min-width: 0;"><img src="../../media/overview/ct-volume.jpg" class="media-shot" style="max-height: 200px;" alt="volume rendering of a whole-body CT scan, the body shown as a translucent 3D image"><small class="credit">Franz A. Fellner · CC BY 4.0 · via Wikimedia Commons</small></div>
</div>

Games · film & VFX · CAD & engineering · medical imaging · scientific visualization · simulation & training

---

## Where all this came from

<img src="../../handouts/figures/cg-timeline.svg" alt="timeline of computer graphics from 1950 to today: interactive pictures born, the Utah school, chasing the photograph, the raster machines, the programmable era, capturing reality, real time catches film, the neural era" style="max-height: 340px; width: 88%;">

Seventy-five years, eight eras — tonight's tour crosses all of them.

<small><a href="../../handouts/ch01-intro-3d-graphics.html">Chapter 1</a> tells this story properly — the people, the papers, the machines.</small>

---

## Meet tonight's scene

<img src="figures/scene-hero.png" alt="our scene: a small room with white walls and a green wall, a brick pillar, a blue-gray sphere, and a rabbit statue on a white pedestal, lit by one square ceiling light" style="max-height: 260px; width: auto;">

A room, two colored walls. A brick pillar, a sphere, a rabbit on a pedestal, one ceiling light.

**By the end of tonight you'll understand every trick in this picture — and we build it live.**

---

### Act 1 · A world in numbers

<small>(~12 min)</small>

---

## What's in a scene

A scene is a cast list, not a picture:

- **objects** — the walls, the pillar, the sphere, the rabbit
- a **camera** — the point of view the image will be made from
- **lights** — the ceiling lamp, without which every pixel is black

---

## A 3D thing is a mesh of triangles

<img src="figures/mesh-sphere.svg" alt="a low-poly sphere drawn as a wireframe: vertices as dots, one triangle highlighted" style="max-height: 300px; width: auto;">

**vertices** connected into **triangles** — together, a **mesh** (a triangle is the simplest **polygon**)

---

## A real mesh, in hand

Every model — hand-built cube or scanned rabbit — is *the same data*: vertices plus triangles.

- drag `wire`: cross-fade the skin away — the triangles were under there all along
- `spin` it — 3D data, not a picture; the readout counts vertices and triangles

<small>Meshes — and most of tonight's pipeline — came out of one school: the University of Utah, 1968–1980 — <a href="../../handouts/ch01-intro-3d-graphics.html#era-utah">Chapter 1 §2</a></small>

---

<!-- .slide: class="demo-full" -->

## Meshes, live

<div class="cockpit" data-demo="mesh-view" data-controls="wire,spin"><pre class="viz-fallback">  one real triangle mesh, orbiting: vertices + triangles, nothing else
    cube: 12 triangles ... bunny/dragon: tens of thousands
  drag wire: cross-fade solid skin ⇄ bare wireframe
  drag spin: turn it — it's 3D data, not a picture
  buttons pick the model: cube · teapot · bunny · dragon</pre></div>

---

## Placing things: transforms

Every object carries a **transform**: *place it, orient it, size it.*

- the pillar: stood upright, at the back of the room
- the rabbit: scaled to size, set on its pedestal
- one mesh, many placements — a forest is one tree transformed a hundred times

---

## Scenes nest: the scene graph

The **scene graph**: objects attach to objects — *move the parent, the children follow.* Drag `baseRy`, then `armBend`.

Watch for: turning the base carries everything above it — bending the arm never moves the base.

---

<!-- .slide: class="demo-full" -->

## The scene graph, live

<div class="cockpit" data-demo="scene-graph" data-controls="baseRy,armBend"><pre class="viz-fallback">  base   (turn it: baseRy)
  └─ arm   (bend it: armBend)
     └─ hand
  turn the base  → arm AND hand come along for the ride
  bend the arm   → only the hand follows; the base ignores it
  same idea: a pedestal carries its rabbit</pre></div>

---

## Materials, first look

Each object also carries a **material** — its *surface recipe*:

- base color — one wall painted red, one green, on an all-white room
- shininess — the sphere glints, the walls don't
- much more soon: Act 3 is materials, all the way down

---

## Our scene so far

<img src="figures/scene-stage0.png" alt="our scene drawn as white wireframe on black: the room, the pillar, the pedestal, the sphere, and the bunny, every triangle's edges visible" style="max-height: 370px; width: auto;">

Our world exists — as triangles. Meshes, transforms, a graph, materials. No pixels of it yet.

---

### Act 2 · From scene to image

<small>(~18 min)</small>

Everything in this act, together, is **rendering**.

---

## The virtual camera

The camera makes a **projection**: the 3D scene squashed onto a flat image — near things big, far things small: **perspective**. Drag `fov`.

Watch for: the pyramid is everything the camera can see; the picture-in-the-picture is what it sees right now.

---

<!-- .slide: class="demo-full" -->

## The camera, live

<div class="cockpit" data-demo="projection" data-controls="fov"><pre class="viz-fallback">        far plane
      ┌───────────────┐
       \    scene    /       the camera's pyramid of visible space
        \  objects  /        (the "frustum"), seen from outside;
         \         /         the camera's own picture appears on
          ┌───────┐          its image plane
          │ image │
           \plane/
            \   /
             (eye)</pre></div>

---

## Two projections

- *perspective* — near big, far small; how eyes and cameras see
- **orthographic** — no shrink with distance; architects' flat drawings, engineering views
- the **field of view** is the lens's zoom ring — wide for drama, narrow for telephoto

---

## Who's in front?

**Visibility**: nearer surfaces must hide farther ones. The **z-buffer** remembers *depth* per pixel:

```text
   framebuffer (color per pixel)      z-buffer (depth per pixel)
   ┌──────────────────┐               ┌──────────────────┐
   │ wall  wall  wall │               │ far   far   far  │
   │ rabbit box  wall │               │ near  mid   far  │
   └──────────────────┘               └──────────────────┘
   a new surface lands on a pixel:
   closer than what's stored? → draw it, remember its depth. else skip.
```

---

## Rasterization fills the pixels

**Rasterization**: color every pixel whose *center* falls inside the triangle. Drag `res` — blocky at 8, smooth at 64.

Watch for: the smooth color blend across the face — and the stair-steps on the edges.

---

<!-- .slide: class="demo-full" -->

## Rasterization, live

<div class="cockpit" data-demo="raster" data-controls="res,angle"><pre class="viz-fallback">   the triangle (math)          the pixels (framebuffer, res = 8)
        ▲                            · · · · · · · ·
       ╱ ╲                           · · ■ ■ · · · ·
      ╱   ╲            ──►           · ■ ■ ■ ■ · · ·
     ╱     ╲                         · ■ ■ ■ ■ ■ · ·
    ╱───────╲                        ■ ■ ■ ■ ■ ■ ■ ·
   filled where the pixel CENTER falls inside</pre></div>

---

## Lighting: three ingredients

**Lighting** turns geometry into something the eye believes. Three ingredients:

- **ambient** — the everywhere-fill; why shadows aren't pitch black
- **diffuse** — the matte part; bright where the surface *faces the light*
- **specular** — the highlight; the bright spot that slides across shiny things

---

## Drive the light

One light, one sphere — our scene's lamp, taken to the lab. Swing `lightAz` behind it; raise `lightEl` for overhead light.

Watch for: the lit/dark boundary, the white highlight tracking the light, and the dark side never reaching black.

---

<!-- .slide: class="demo-full" -->

## Lighting, live

<div class="cockpit" data-demo="illumination" data-controls="lightAz,lightEl"><pre class="viz-fallback">      light ☀ (position set by lightAz around, lightEl up/down)
         \
          \        bright where the surface faces the light,
        ( sphere )     falling off to the dark side;
                       the white specular highlight slides
                       around to always face the light</pre></div>

---

## Flat vs smooth shading

**Shading** = deciding each pixel's final color from the lighting.

- *flat* — one color per triangle: faceted, disco-ball look
- *smooth* — blend across triangles: the mesh's secret facets disappear
- the classic smooth recipes are named **Gouraud** and **Phong** — names to recognize, details later

---

## The pipeline, one picture

```text
  scene  ──►  camera &      ──►  rasterize  ──►  shade  ──►  framebuffer
              projection
  (objects,   3D → flat          which pixels    what color    the numbers
   lights,    triangles          each triangle   each pixel    the monitor
   camera)    on the image       covers          gets          shows
```

This assembly line is the **pipeline** — and a **GPU** is a machine *shaped like this picture*.

<small>Utah worked out the stations in the 1970s; the machines shaped like them came two decades later — <a href="../../handouts/ch01-intro-3d-graphics.html#era-utah">Chapter 1 §2</a> · <a href="../../handouts/ch01-intro-3d-graphics.html#era-raster">§4</a></small>

---

## The pipeline, run on our scene

Every station at once, live: drag `stage` through the first three stops.

- *wireframe* — Act 1's world: triangles, edges only
- *flat* — lit, one color per triangle
- *smooth* — the facets vanish
- then slide `lightX` — the whole room answers the light

<small>(the slider has two more stops — we haven't earned those acts yet)</small>

---

<!-- .slide: class="demo-full" -->

## Our scene, live

<div class="cockpit" data-demo="our-scene" data-controls="stage,lightX"><pre class="viz-fallback">  our scene — a small room: red wall left, green wall right, a brick
  pillar, a sphere, the rabbit on its pedestal, one ceiling light
  drag stage:  wireframe → flat → smooth  (→ textured → anti-aliased:
               those two stops belong to Acts 3 and 4)
  drag lightX: slide the ceiling light — the whole room answers</pre></div>

---

## Rendered — and yet

<img src="figures/scene-stage2.png" alt="our scene smooth-shaded: red and green walls, gray untextured pillar and pedestal, sphere and bunny — everything with the same shiny gray plastic look" style="max-height: 230px; width: auto;">

- everything looks like **plastic** — the same shiny gray-ness everywhere
- every edge is **jagged** — the raster demo's stair-steps, now on everything

Two problems, two acts.

---

### Act 3 · Surfaces that lie

<small>(~12 min)</small>

---

## Paint by image: texture mapping

**Texture mapping**: glue an *image* onto a mesh. The image is the **texture**.

- brick photo on a flat face → instant masonry — our pillar is exactly this
- detail is now *pixels in an image*, not triangles — enormously cheaper

<small>The paint trick is 1974, Catmull; the groove lie two slides ahead is 1978, Blinn — the same Utah school — <a href="../../handouts/ch01-intro-3d-graphics.html#era-utah">Chapter 1 §2</a></small>

---

## How the glue works: UVs

**UV coordinates**: every vertex knows *its spot on the image* — like gift-wrapping with labeled paper. Drag `offU`, then `tile`.

Watch for: the image slides and repeats across the surface — the mesh never changes.

---

<!-- .slide: class="demo-full" -->

## UVs, live

<div class="cockpit" data-demo="uv-placement" data-controls="offU,tile"><pre class="viz-fallback">   the texture (image)             the mesh
   ┌───────────────┐            each vertex carries a
   │ ▓▒ brick ▒▓  │            (u, v) address into the image;
   │ ▒▓ rows  ▓▒  │   ─glue─►  pixels between vertices blend
   └───────────────┘            their addresses
   drag offU: slide the wrap sideways · drag tile: repeat it more
   buttons: quad → cube → teapot → bunny (watch for seams)</pre></div>

---

## Bump mapping: fake the grooves

**Bump mapping** (and its modern cousin **normal mapping**): the *lighting* lies about the geometry. Drag `lightAz`, then turn `bump` to zero.

Watch for: the readout's triangle count — it never leaves 2.

---

<!-- .slide: class="demo-full" -->

## Bump mapping, live

<div class="cockpit" data-demo="bump-map" data-controls="bump,lightAz"><pre class="viz-fallback">  the wall is 2 flat triangles — but its lighting pretends grooves:
    bump = 0 :  flat shading, the wall looks like what it is (flat)
    bump > 0 :  mortar lines darken and catch light like real recesses
  swing lightAz: the fake shadows TRACK the light — that's what sells it
  buttons: wall → teapot (the lie works on curved things too)</pre></div>

---

## Textures without images

- **procedural textures** — patterns *computed*, not photographed: wood rings, marble veins, noise
- **solid textures** — the pattern fills 3D space; the object is *carved out of virtual marble*
- no photo, no seams, endless variety from a small recipe

---

## Mirrors on a budget

**Environment mapping**: reflect a *stored picture* of the surroundings.

- shiny chrome, water glints, sunglasses — without simulating any actual light bouncing
- the reflection is a lookup into a panorama photographed (or pre-rendered) once
- close enough to fool almost everyone, almost always

---

## PBR: the modern package

- modern engines bundle this whole act into **PBR** — *physically based rendering* — materials
- one standard recipe card: base color, roughness, metalness, bumps
- recognize the term: it's on every engine's material panel, every asset store

---

## Our scene, after the lies

<img src="figures/scene-stage3.png" alt="our scene with textures applied: the pillar wears brick, the floor is a checkerboard, the walls stay red, green, and white — same geometry as before" style="max-height: 380px; width: auto;">

Brick on the pillar, a checkered floor — and not one new triangle.

---

### Act 4 · The jaggies problem

<small>(~8 min)</small>

---

## Why edges stair-step

**Aliasing**: the pixel grid **samples** a smooth edge at too few points.

- each pixel takes *one look* at the world — at its center — and must pick a side
- a smooth diagonal, asked pixel-by-pixel, answers in stair-steps
- more pixels shrink the steps but never remove them

---

## More samples per pixel

**Anti-aliasing** by **supersampling**: take several looks per pixel, *average* them. Set `res` low, then turn `aa` on.

Watch for: edge pixels taking in-between shades — the staircase dissolving.

---

<!-- .slide: class="demo-full" -->

## Anti-aliasing, live

<div class="cockpit" data-demo="raster" data-controls="res,aa"><pre class="viz-fallback">  the same triangle edge, aa off vs on:
    aa off :  ■ ■ ■ □ □ □     each pixel all-or-nothing → stair-steps
    aa 2×2 :  ■ ■ ▓ ░ □ □     4 samples per pixel, averaged →
                              edge pixels take in-between shades
  the staircase dissolves into a soft, honest edge</pre></div>

---

## Textures alias too

- a checkerboard walking into the distance: shimmer and moiré — many texture squares per pixel
- **mipmaps**: keep *pre-shrunk copies* of every texture; each pixel reads the right size
- built into every GPU; on by default, forever

---

## Our scene, clean-edged

<img src="figures/scene-stage4.png" alt="our scene fully rendered with anti-aliasing: red and green walls, brick pillar, checkered floor, sphere, and bunny, every silhouette smooth" style="max-height: 250px; width: auto;">

Compare any silhouette with the last checkpoint — the stair-steps are gone.

<small>Rasterization's fixed recipe is why the GPU exists: hard-wired raster machines first, programmable at the shading stops later — <a href="../../handouts/ch01-intro-3d-graphics.html#era-raster">Chapter 1 §4</a></small>

---

### Act 5 · Chasing the photograph

<small>(~10 min)</small>

---

## What our lighting can't do

Act 2's lighting is **local** — each point is lit *alone*, as if nothing else existed:

- no **shadows** — the pillar casts nothing onto the floor
- no **reflections** — the sphere doesn't truly mirror the room
- no color bleeding — a red wall doesn't blush the white floor beside it

---

## Global illumination

<div style="display: flex; gap: 16px; justify-content: center; align-items: flex-start;">
<div style="flex: 1 1 0; min-width: 0;"><img src="figures/scene-stage4.png" style="max-height: 210px; width: auto;" alt="our scene at its best: anti-aliased, textured, locally lit — no shadows, no color bleeding"><small class="credit">our scene — the best Act 4 can do</small></div>
<div style="flex: 1 1 0; min-width: 0;"><img src="../../media/overview/cornell-box.jpg" class="media-shot" style="max-height: 210px;" alt="the Cornell box: a cube room with one red wall, one green wall, and two boxes, lit from a ceiling light — soft shadows and color bleeding visible"><small class="credit">SeeSchloss · Public domain · via Wikimedia Commons</small></div>
</div>

Our scene copies a famous original: the Cornell box — a *real* box, built and photographed to test exactly this. **Global illumination (GI)**: let light *bounce*.

<small>The race to match the photograph began in the late 1970s — <a href="../../handouts/ch01-intro-3d-graphics.html#era-photograph">Chapter 1 §3</a></small>

---

## How: follow the light

- **ray tracing** — trace lines of sight from the camera into the scene
- **path tracing** — follow *many bounces* per ray; the film standard
- **radiosity** — let light diffuse between surface patches; soft, matte worlds

One line each — these are *names to recognize*, not algorithms for tonight.

---

## What honest light buys

<img src="../../media/overview/path-traced-room.jpg" class="media-shot" style="max-height: 340px;" alt="a path-traced render of three cow figurines — chrome, ceramic, and glass — on a glossy wooden table, each material's reflections and refractions honestly computed">
<small class="credit">KaiaVintr · CC BY-SA 4.0 · via Wikimedia Commons</small>

Not a photograph: chrome, ceramic, glass — all *followed light, honestly computed*.

---

## The price: real-time vs offline

- a game must finish each frame in about **16 milliseconds** — that's **real-time** rendering
- a film frame may take **minutes to hours** — that's **offline** rendering
- same math, wildly different budgets — the field's permanent tension

---

## Not chasing the photo: NPR

<img src="../../media/overview/toon-shading.jpg" class="media-shot" style="max-height: 300px;" alt="the Utah teapot rendered three ways: wireframe, flat color, and cel-shaded with quantized color bands and bold outlines like a cartoon drawing">
<small class="credit">NicolasSourd · CC BY-SA 3.0 · via Wikimedia Commons</small>

**Non-photorealistic rendering**: toon shading, sketch lines, painterly strokes — *realism is a choice, not the goal*.

---

### Act 6 · Where worlds come from

<small>(~14 min)</small>

---

## Scan the real world

<img src="../../media/overview/point-cloud.jpg" class="media-shot" style="max-height: 220px;" alt="a LiDAR point cloud of a San Francisco street intersection: millions of colored dots forming buildings, cars, and roads">
<small class="credit">Daniel L. Lu · CC BY 4.0 · via Wikimedia Commons</small>

**3D scanning**: **photogrammetry** (many photos → shape) or **LiDAR** (laser distances) → a **point cloud** → a mesh.

<small>Capturing reality — shape first, then motion — became graphics' own project in the 1990s — <a href="../../handouts/ch01-intro-3d-graphics.html#era-capture">Chapter 1 §6</a></small>

---

## The Stanford bunny

<img src="../../media/overview/stanford-bunny.jpg" class="media-shot" style="max-height: 190px;" alt="photograph of a physical 3D-printed Stanford bunny, the field's famous scanned rabbit model, printed back into the real world">
<small class="credit">funnypolynomial · CC BY 2.0 · via Wikimedia Commons</small>

- 1994: a ceramic rabbit, laser-scanned → **69,451 triangles** — the field's favorite test object
- this photo: the scan, **3D-printed back into the world**
- and you've met it: our scene's rabbit *is* the Stanford bunny

---

## Smooth from few numbers

<img src="figures/bezier-spline.svg" alt="a Bézier curve steered by four control points, with the smooth curve threading near its control polygon" style="max-height: 310px; width: auto;">

**Curves and surfaces**: a **Bézier** curve — *4 points steer a perfect curve*. Chains of them are **splines**; the surface version is **NURBS**.

---

## Subdivision surfaces

- **subdivision**: model blocky → the computer *rounds it*, step after step
- each pass splits and smooths every face; two or three passes: sculpture
- how film characters are actually modeled (an Oscar was won for it)

---

## Detail costs triangles: LOD

**Level of detail (LOD)**: keep the *same object at several resolutions* — a **multi-resolution** ladder. Push it away with `dist` — can you tell?

Watch for: the distance where coarse and fine become indistinguishable — that's the trick's whole license.

---

<!-- .slide: class="demo-full" -->

## LOD, live

<div class="cockpit" data-demo="lod" data-controls="level,dist"><pre class="viz-fallback">  the same model at several resolutions, L0 (coarse) ... fine:
    L0: hundreds of triangles ... top rung: tens of thousands
  drag level: watch the facets appear/disappear up close
  drag dist:  push it away — at distance, coarse and fine
              look IDENTICAL, so why pay for fine?
  buttons pick the model: ico · teapot · bunny · dragon</pre></div>

---

## Mesh simplification

- **mesh simplification**: *compute* the coarser rungs automatically
- collapse the edges that matter least, one by one, until the budget fits
- scans arrive with millions of triangles you don't need — this is the diet

---

## Worlds from formulas

- **procedural generation**: worlds *computed* from rules, not sculpted
- the engine: **noise** — controlled randomness at several scales, stacked
- a grid of vertices, heights lifted by noise: terrain nobody sculpted

---

## Volumes, not surfaces

<img src="../../media/overview/ct-volume.jpg" class="media-shot" style="max-height: 300px;" alt="two renderings of the same whole-body CT scan side by side: classic volume rendering and modern cinematic rendering, muscle and blood vessels visible through the skin">
<small class="credit">Franz A. Fellner · CC BY 4.0 · via Wikimedia Commons</small>

**Volumetric modeling**: fill space with **voxels** (3D pixels) — then **volume rendering** looks *inside*. Medicine's view of you.

---

### Act 7 · Making it move

<small>(~14 min)</small>

---

## Animation is state over time

- **animation**: change the scene's *numbers* between frames — that's all motion is
- each frame is a still; motion lives in the *differences* between consecutive stills
- a flying bird = its transform, changing a little, 60 times a second

---

## Keyframes

**Keyframes**: pose the *important moments*; the computer **interpolates** the rest — **in-betweening**. Scrub `t`, then flip `ease`.

Watch for: the corner at the middle key — there with linear, gone with smooth.

---

<!-- .slide: class="demo-full" -->

## Keyframes, live

<div class="cockpit" data-demo="keyframe" data-controls="t,ease"><pre class="viz-fallback">  a short flight: 3 posed keyframes, computer fills between
     key A ●───────● key B ───────● key C
                 scrub t →
  ease = linear : constant speed, mechanical corner at key B
  ease = smooth : the corner at key B vanishes — alive
  (the smooth version is a spline — Act 6's 4 points, now in TIME)</pre></div>

---

## Characters: skeletons

- **skeletal animation**: build a **rig** of bones inside the mesh
- **skinning** glues the mesh's vertices to nearby bones — bend a bone, the surface follows
- animate *dozens of bones*, not millions of vertices

---

## Motion capture

<img src="../../media/overview/mocap.jpg" class="media-shot" style="max-height: 250px;" alt="a motion-capture suit dotted with reflective markers, shown on a mannequin in a museum display case">
<small class="credit">Mbrickn · CC0 · via Wikimedia Commons</small>

**Motion capture**: record a *real performer's* motion onto the rig.

<small>Same era, same project as scanning: the 1990s capture wave, pointed at motion — <a href="../../handouts/ch01-intro-3d-graphics.html#era-capture">Chapter 1 §6</a></small>

---

## Simulation: let physics act

- **physical simulation**: when hand-animation is hopeless — water, cloth, smoke, hair
- encode the *rules* (gravity pulls, springs resist, fluids flow) and step them each frame
- the animator becomes a *director of conditions*, not of outcomes

---

## Two families of simulation

<img src="../../media/overview/fluid-sim.jpg" class="media-shot" style="max-height: 190px;" alt="a fluid simulation frame from Blender: liquid mid-splash, caught as a sheet of droplets">
<small class="credit">Charybdis · CC BY-SA 3.0 · via Wikimedia Commons</small>

- **particles & mass-spring** (**Lagrangian**): track *moving stuff* — cloth as a spring net; **particle systems** for fire and spray
- **grid-based** (**Eulerian**): divide *space* into fixed cells; stuff flows between them — how water and smoke are done

---

## Rigid bodies & collisions

- **rigid-body** simulation: solid things tumble, stack, and rest — no bending
- **collision detection**: the other half — *notice the overlap*, push things apart
- crates, ragdolls, debris: every game's physics engine, running right now

---

## Procedural animation

- **procedural animation**: motion from *rules*, live — not recorded, not posed
- a flock: each bird follows three urges — stay close, don't crash, match neighbors
- the flock's shape is *nobody's* design — it emerges

---

### Act 8 · Worlds you can enter

<small>(~8 min)</small>

---

## Interactive = a loop

```text
        ┌────────────────────────────────────┐
        │  read input   (keys, mouse, head)  │
        │  update       (move, simulate)     │
        │  redraw       (the WHOLE pipeline) │
        └───────────────────▲────────────────┘
              again, and again, and again
```

**Redraw** everything, at a **frame rate** of ~60 per second → about **16 ms** per lap. *Thursday's lab lives inside this loop.*

---

## Games

A game is everything tonight, at once, at 60, forever:

- a scene (Act 1) rendered (Act 2) with lying surfaces (Act 3), clean edges (Act 4)
- budget lighting (Act 5), streamed LOD worlds (Act 6), animation and physics (Act 7)
- all inside the loop, answering *you*, every 16 milliseconds

<small>Today's GPUs even trace true rays inside that budget — 1980's photograph-chasing, returned as silicon — <a href="../../handouts/ch01-intro-3d-graphics.html#era-realtime">Chapter 1 §7</a></small>

---

## VR & AR

<img src="../../media/overview/vr-headset.jpg" class="media-shot" style="max-height: 280px;" alt="a person wearing a virtual reality headset, head tilted upward, immersed in an unseen world">
<small class="credit">MIKI Yoshihito · CC BY 2.0 · via Wikimedia Commons</small>

- **virtual reality**: one image *per eye* + head tracking — **latency** is the enemy
- **augmented reality**: draw *into* the real world — pipeline meets computer vision

---

## The frontier: neural rendering

- **neural rendering**: scenes *learned from photographs* — walk a camera where no photo was taken
- the names on every current paper: **NeRFs** and **Gaussian splatting**
- next door: generative 3D — describe a scene in words, receive a model (week 10)

<small>The newest era on the timeline — five years old and moving. Next slide: one, live — <a href="../../handouts/ch01-intro-3d-graphics.html#era-neural">Chapter 1 §8</a></small>

---

<!-- .slide: class="demo-full" -->

## A scanned world, live

<div class="cockpit" data-demo="gsplat" data-controls="fov"><pre class="viz-fallback">  a real photographed scene, rendered live in your browser from
  ~240,000 translucent 3D blobs (Gaussians), blended back-to-front —
  no triangle mesh, no textures; notice the soft, fuzzy edges.
  drag fov: the camera's zoom ring, live in a learned world.

  Scene: "bonsai" from the Mip-NeRF 360 dataset (Barron et al., CVPR
  2022, Google Research); .splat reconstruction by dylanebert
  (huggingface.co/datasets/dylanebert/3dgs) — see media/gsplat/ATTRIBUTION.md</pre></div>

---

## The tour is the syllabus

| Tonight | The deep dive |
| --- | --- |
| Act 1 · a world in numbers | S05 (scene graphs) · S07 (meshes) |
| Act 2 · scene to image | S02–S04 (the math) · S06 · S09 |
| Act 3 · surfaces that lie | S08 (texturing) |
| Acts 4–5 · jaggies & the photo | S09 · S10 |
| Act 6 · worlds' origins | S07 · S10 |
| Act 8 · worlds you enter | S10 |

<small>Act 7 (making it move) is woven through the machine problems.</small>

---

## Our stance, and Thursday

- this course **builds** the machinery — we don't just call it
- you will implement the engine's math yourself, then check it against the engine
- **Thursday**: Unity install · the interactive loop · MVC — bring a laptop
- **MP1 is out this week** — *details on Canvas*
- **Read Chapter 1** — the field's history, the papers, the people (linked from the course site)

