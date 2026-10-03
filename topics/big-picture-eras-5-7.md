<!--
  CSS 551 · TOPIC DECK: The big picture, part 2: eras 5 to 7 (~30 min).
  Mounted as <section data-markdown="../../topics/big-picture-eras-5-7.md">.
  No logistics.

  TEACHES: the programmable era (shaders, CUDA, every surface lies, procedural
  textures, environment maps, mipmaps, PBR, NPR); capturing and simulating
  reality (scanning, the Stanford bunny, curves and subdivision, LOD and
  simplification, procedural worlds, volumes; animation, keyframes, skeletons,
  procedural animation; motion capture and FX simulation moved to
  topics/film-pipeline.md, physics to topics/physics-simulation.md, 2026-09-29); real time
  catches film (the interactive loop and its 16 ms, games, ray-tracing cores
  and denoising, VR and AR).
  NEEDS:   topics/big-picture-eras-1-4.md (the pipeline demo, the eras before);
    this topic says "the same pipeline demo from the Utah era" and means the
    our-scene embed there.
  COMPANION: topics/film-pipeline.md follows it in L02, then topics/big-picture-neural-era.md.
  DEMOS: our-scene (stage,lightX) at the textured stop, lod (level,dist),
    keyframe (t,ease). The mounting page carries the .demo-full CSS.
  FIGURES: ../../media/figures/bezier-spline.svg; media per
    ../../media/overview/CREDITS.md.
  SOURCE: split from sessions/S01-cg-overview/L01-cg-overview.md (2026-09-29).
  READING: ../../textbook/history-of-graphics.html, Sections 5 to 7.

  reveal.js: FLAT; notes follow "Note:"; no math; never two "_" on one line
  outside a code fence; paths relative to the lecture page.
-->

### The big picture, continued: eras 5 to 7

<small>(~30 min) · reading: <a href="../../textbook/history-of-graphics.html#era-programmable">History, Sections 5 to 7</a></small>


---

### Era 5 · The programmable era

<small>2000–2015 · ~14 min · <a href="../../textbook/history-of-graphics.html#era-programmable">History §5</a></small>


---

## Shaders: the pipeline opens up

A **shader** is a small program the GPU runs *per vertex* and *per pixel*: you write the shading stage yourself.

- first written in raw GPU assembly; by 2004 the C-like languages **Cg**, **HLSL** and **GLSL** arrive
- shading becomes ordinary programming: any look, not a fixed menu
- the shaders written in this course, Unity's and WebGL's, are exactly these


---

## Graphics cards escape graphics

**2007**: NVIDIA's **CUDA** lets those thousands of shader processors run *non-graphics* programs.

- a GPU is thousands of small arithmetic units: perfect for anything massively parallel
- one-line answer to a famous question: **deep learning runs on graphics cards** because graphics spent thirty years building them
- the pipeline's hardware outgrew the pipeline


---

## Every surface lies

Utah's texture and bump tricks, now written as **shaders**, so *every* surface can lie, cheaply, at once.

- a texture lookup is a tiny per-pixel program: millions of pixels, every frame
- skin, armor, fabric, signage: shaders sampling images
- back to the pipeline demo: drag `stage` to *textured*; watch for brick, a checkerboard floor, an unchanged triangle count


---

<!-- .slide: class="demo-full" -->

## The pipeline, textured

<div class="cockpit" data-demo="our-scene" data-controls="stage,lightX"><pre class="viz-fallback">  the same Cornell box as the Utah era, one stop further:
  drag stage to 3 (textured): the tall box turns to brick, the floor
               to a checkerboard, and the triangle count does not move
  drag lightX: the brick still answers the light (it is a texture,
               not geometry)</pre></div>


---

## Textures without images

- **procedural textures**: patterns *computed*, not photographed (wood rings, marble veins, noise)
- **solid textures**: the pattern fills 3D space; the object is *carved out of virtual marble*
- no photo, no seams, endless variety from a small recipe


---

## Mirrors on a budget

**Environment mapping**: reflect a *stored picture* of the surroundings.

- shiny chrome, water glints, sunglasses, without simulating any actual light bouncing
- the reflection is a lookup into a panorama photographed (or pre-rendered) once
- close enough to fool almost everyone, almost always


---

## Textures alias too

- a checkerboard walking into the distance: shimmer and moiré, from many texture squares per pixel
- **mipmaps**: keep *pre-shrunk copies* of every texture; each pixel reads the right size
- built into every GPU; on by default, forever


---

## PBR: the modern package

- the era's tricks converge into **PBR** (*physically based rendering*) materials
- one standard recipe card: base color, roughness, metalness, bumps, grounded in real measurements
- recognize the term: it's on every engine's material panel, every asset store


---

## Realism is a choice: NPR

<img src="../../media/overview/toon-shading.jpg" class="media-shot" style="max-height: 260px;" alt="the Utah teapot rendered three ways: wireframe, flat color, and cel-shaded with quantized color bands and bold outlines like a cartoon drawing">
<small class="credit">NicolasSourd · CC BY-SA 3.0 · via Wikimedia Commons</small>

**Non-photorealistic rendering**: once shading is *programmable*, a shader can look drawn, painted, or printed; realism is one target among many.


---

### Era 6 · Capturing and simulating reality

<small>1990–2010 · ~18 min · <a href="../../textbook/history-of-graphics.html#era-capture">History §6</a></small>


---

## Scan the real world

<img src="../../media/overview/point-cloud.jpg" class="media-shot" style="max-height: 220px;" alt="a LiDAR point cloud of a San Francisco street intersection: millions of colored dots forming buildings, cars, and roads">
<small class="credit">Daniel L. Lu · CC BY 4.0 · via Wikimedia Commons</small>

**3D scanning**: **photogrammetry** (many photos → shape) or **LiDAR** (laser distances) → a **point cloud** → a mesh.


---

## The Stanford bunny

<img src="../../media/overview/stanford-bunny.jpg" class="media-shot" style="max-height: 190px;" alt="photograph of a physical 3D-printed Stanford bunny, the field's famous scanned rabbit model, printed back into the real world">
<small class="credit">funnypolynomial · CC BY 2.0 · via Wikimedia Commons</small>

- 1994: a clay rabbit, laser-scanned → **69,451 triangles**, the field's favorite test object
- this photo: the scan, **3D-printed back into the world**
- and you've met it: our scene's rabbit *is* the Stanford bunny


---

## Smooth from few numbers

<img src="../../media/figures/bezier-spline.svg" alt="a Bézier curve steered by four control points, with the smooth curve threading near its control polygon" style="max-height: 300px; width: auto;">

**Curves and surfaces**: a **Bézier** curve lets *4 points steer a perfect curve*. Chains of them are **splines**; the surface version is **NURBS**.


---

## Subdivision surfaces

- **subdivision**: model blocky → the computer *rounds it*, step after step
- each pass splits and smooths every face; two or three passes: sculpture
- how film characters are actually modeled (a technical Academy Award was won for it)


---

## Detail costs triangles: LOD

**Level of detail (LOD)**: keep the *same object at several resolutions*, a **multi-resolution** ladder. Push it away with `dist`: can you tell?

Watch for: the distance where coarse and fine become indistinguishable; that's the trick's whole license.


---

<!-- .slide: class="demo-full" -->

## LOD, live

<div class="cockpit" data-demo="lod" data-controls="level,dist"><pre class="viz-fallback">  the same model at several resolutions, L0 (coarse) ... fine:
    L0: hundreds of triangles ... top rung: tens of thousands
  drag level: watch the facets appear/disappear up close
  drag dist:  push it away; at distance, coarse and fine
              look IDENTICAL, so why pay for fine?
  buttons pick the model: ico · teapot · bunny · dragon</pre></div>


---

## Mesh simplification

- **mesh simplification**: *compute* the coarser rungs automatically, by **edge collapse**
- merge the edges that matter least, one by one, until the budget fits
- scans arrive with millions of triangles you don't need: this is the diet


---

## Worlds from formulas

- **procedural generation**: worlds *computed* from rules, not sculpted
- the engine: **noise**, controlled randomness at several scales, stacked
- a grid of vertices, heights lifted by noise: terrain nobody sculpted


---

## Volumes, not surfaces

<img src="../../media/overview/ct-volume.jpg" class="media-shot" style="max-height: 290px;" alt="two renderings of the same whole-body CT scan side by side: classic volume rendering and modern cinematic rendering, muscle and blood vessels visible through the skin">
<small class="credit">Franz A. Fellner · CC BY 4.0 · via Wikimedia Commons</small>

**Volumetric modeling**: fill space with **voxels** (3D pixels), then **volume rendering** looks *inside*. Medicine's view of you.


---

### Capturing reality, continued · making it move

A finished world is a postcard until its numbers **change over time**. Same era, second project: motion.


---

## Animation is state over time

- **animation**: change the scene's *numbers* between frames; that's all motion is
- each frame is a still; motion lives in the *differences* between consecutive stills
- a flying bird = its transform, changing a little, 60 times a second


---

## Keyframes

**Keyframes**: pose the *important moments*; the computer **interpolates** the rest (**in-betweening**). Scrub `t`, then flip `ease`.

Watch for: the corner at the middle key; there with linear, gone with smooth.


---

<!-- .slide: class="demo-full" -->

## Keyframes, live

<div class="cockpit" data-demo="keyframe" data-controls="t,ease"><pre class="viz-fallback">  a short flight: 3 posed keyframes, computer fills between
     key A ●───────● key B ───────● key C
                 scrub t →
  ease = linear : constant speed, mechanical corner at key B
  ease = smooth : the corner at key B vanishes; alive
  (the smooth version is a spline: Bézier's 4 points, now in TIME)</pre></div>


---

## Characters: skeletons

- **skeletal animation**: build a **rig** of bones inside the mesh
- **skinning** glues the mesh's vertices to nearby bones: bend a bone, the surface follows
- animate *dozens of bones*, not millions of vertices


---

## Procedural animation

- **procedural animation**: motion from *rules*, live, not recorded, not posed
- a flock: each bird follows three urges: stay close, don't crash, match neighbors
- the flock's shape is *nobody's* design: it emerges


---

### Era 7 · Real time catches film

<small>2010–2018 · ~8 min · <a href="../../textbook/history-of-graphics.html#era-realtime">History §7</a></small>


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

**Redraw** everything, at a **frame rate** of ~60 per second → about **16 ms** per lap. *Every homework in this course lives inside this loop.*


---

## Games

A game is every era so far, at once, at 60, forever:

- a scene (Utah) rendered (Utah) with lying surfaces (programmable), clean edges (raster machines)
- honest light where it fits the budget, streamed LOD worlds, animation and physics (capture era)
- all inside the loop, answering *you*, every 16 milliseconds



---

## Honest light in 16 ms

- **2018**: consumer GPUs ship dedicated **ray-tracing cores**: silicon whose one job is Whitted's 1980 ray-meets-triangle test
- not a film-style path trace per frame: rasterize the picture, trace a few rays where only rays will do (reflections, shadows, bounced color), then **denoise** the sparse result
- the offline light of Era 3, forty years later, inside the game's frame budget


---

## VR & AR

<img src="../../media/overview/vr-headset.jpg" class="media-shot" style="max-height: 270px;" alt="a person wearing a virtual reality headset, head tilted upward, immersed in an unseen world">
<small class="credit">MIKI Yoshihito · CC BY 2.0 · via Wikimedia Commons</small>

- **virtual reality**: one image *per eye* + head tracking; **latency** is the enemy
- **augmented reality**: draw *into* the real world; pipeline meets computer vision

