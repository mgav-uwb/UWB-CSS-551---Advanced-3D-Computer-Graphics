<!--
  CSS 551 · TOPIC DECK: How a film frame is made: the production pipeline (~28 min).
  Mounted as <section data-markdown="../../topics/film-pipeline.md">. No logistics.

  EDIT 2026-10-08: "Why premultiply" retitled "Premultiplied alpha and the fringe"; the over
    operator's one-line derivation (coverage) added to its slide and notes.
  TEACHES: the departments a feature-film frame passes through; capture of motion
  (markers, performance capture), shape (photogrammetry, LiDAR time of flight worked)
  and light (the HDR light probe, exposure merging worked); layout and previs,
  animation, FX; lighting and production path tracers (RenderMan, Arnold, Hyperion);
  render farms in sourced numbers; noise and denoisers; render passes; compositing
  (the alpha channel, Porter-Duff over worked in premultiplied form, why premultiply,
  associativity, deep compositing worked); color management (linear light, ACES);
  matching CG to a plate; where learned models are entering the pipeline.
  NEEDS:   the history decks (path tracing, textures); nothing else.
  COMPANION: mounted in L02 between topics/history-studios-films.md and
    topics/history-frontier.md.
  DEMOS:   none. FIGURES: ../../textbook/figures/rt-convergence.svg, col-blend.png;
    media per ../../media/overview/CREDITS.md (mocap, point-cloud, fluid-sim).
  NUMBERS: computed by node in tools/gen-lecture-figures-a.mjs (the over operator,
    the fringe, associativity, deep samples, sRGB 128 = 0.216 linear, linear 0.5 =
    code 188, 9.97 stops, farm arithmetic). SOURCED FIGURES (web-verified 2026-09-29):
    Toy Story 114,240 frames, 800,000 machine-hours, 45 min to 30 h per frame, 117
    SPARCstation 20s (Pixar figures via Britannica and others); Monsters University
    about 29 h per frame, 24,000 cores, 100 million CPU hours (VentureBeat, nofilmschool);
    Big Hero 6: Hyperion, 55,000 cores, about 4,600 computers, 1.5 MW (Engadget,
    Electronic Design, fxguide); Finding Dory the first Pixar feature rendered with
    RenderMan RIS path tracing and the first with RenderMan Denoise (renderman.pixar.com,
    fxguide); the ML denoiser (Disney Research with ILM, Pixar and WDAS) used on every
    Pixar feature since Toy Story 4 and released in RenderMan 25, April 2023, render time
    reductions of 2 to 4 times (befores & afters, CG Channel); Arnold: Fajardo, Monster
    House (2006), Sci-Tech award 2017 (CG Channel, fxguide); Porter and Duff,
    "Compositing Digital Images," SIGGRAPH 1984, Computer Graphics 18(3):253-259; Debevec,
    "Rendering Synthetic Objects into Real Scenes," SIGGRAPH 1998; OpenEXR 2.0 with deep
    data, ILM and Weta Digital, April 2013, deep compositing developed at Weta and used
    on Avatar (fxguide, CG Channel); ACES 1.0, December 2014, AMPAS; Gollum's performance
    capture (Andy Serkis, Weta, The Two Towers, 2002). Blinn's law is quoted as an
    attributed observation.
  LINK: https://www.pixar.com/pixar-in-a-box (Pixar and Khan Academy; confirmed 2026-09-29).
  READING: ../../textbook/history-of-graphics.html (eras 3 and 7), ../../textbook/color.html
    (linear light), ../../textbook/ray-tracing.html (Monte Carlo noise).

  reveal.js: FLAT; notes follow "Note:"; plain unicode math; never two "_" on one
  markdown line outside a code fence; paths relative to the lecture page.
-->

### How a film frame is made

<small>(~28 min) · the production pipeline, from capture to the final pixel</small>


---

## One frame, many departments

```text
 story ─▶ previs ─▶ modeling / capture ─▶ layout ─▶ animation ─▶ FX
                                                              │
   delivery ◀─ color ◀─ compositing ◀─ rendering ◀─ lighting ◀┘
```

- each arrow is a **file handoff**: meshes, rigs, curves, caches, images
- each department can **redo its part** without the others redoing theirs
- the frame you see is the last of hundreds of versions


---

## The two budgets, one more time

| | a game frame | a feature-film frame |
| --- | --- | --- |
| time to make it | 16.7 ms | about 29 hours, as reported (Monsters University, 2013) |
| ratio | 1 | about 6 million (6.8 orders of magnitude) |
| who waits | the player, every frame | nobody: frames are computed, then played |
| light transport | rasterize, a few rays, denoise | path trace, many samples per pixel, denoise |


---

### Capture: motion, shape, light

<small>(~7 min)</small>

---

## Capturing motion

<img src="../../media/overview/mocap.jpg" class="media-shot" style="max-height: 230px;" alt="a motion-capture suit dotted with reflective markers, shown on a mannequin in a museum display case">
<small class="credit">Mbrickn · CC0 · via Wikimedia Commons</small>

- **markers**: retroreflective dots on a suit; a ring of cameras sees each dot from several angles
- **triangulation**: two or more rays through one dot meet at its 3D position, hundreds of times a second
- **solving**: the marker cloud is fitted to the rig's bones each frame; animators then edit the curves


---

## Performance capture: the face too

- body markers give the **skeleton**; the face needs **dozens of points** or a camera on the head
- **Gollum** (The Two Towers, 2002): Andy Serkis performed on set; Weta's animators built the digital performance from his body and face
- **Avatar** (2009): each actor wore a head-mounted camera recording the face, on a capture stage viewed live through a virtual camera
- the actor's performance, retargeted onto a character with different proportions


---

## Capturing shape: photogrammetry and LiDAR

<img src="../../media/overview/point-cloud.jpg" class="media-shot" style="max-height: 150px;" alt="a colorful LiDAR point cloud of a city street intersection, buildings and cars rendered as dense dots">
<small class="credit">Daniel L. Lu · CC BY 4.0 · via Wikimedia Commons</small>

- **photogrammetry**: hundreds of photos, matched features, each feature triangulated: a colored point cloud, then a mesh
- **LiDAR**: a laser pulse and a clock, distance = c · t / 2: an echo after **66.7 ns** is **10.0 m** away; 1 cm of precision needs **66.7 ps** of timing


---

## Capturing light: the HDR light probe

- photograph a **chrome ball** at the position where a CG object will stand: it reflects the whole room
- a sensor holds about 8 to 12 stops; a sunlit window and a shadowed wall differ by far more
- so shoot a **bracket**: 1/1000 s to 1 s is a factor of 1,000, **9.97 stops**, and merge into one high-dynamic-range image
- the merged probe **lights** the CG element, not just its reflections (Debevec, SIGGRAPH 1998)


---

## Merging exposures, worked

A sensor value is roughly **radiance × exposure time**, clipped at 1. Estimate radiance as value ÷ time; trust mid-range values.

| pixel | at 1/1000 s | at 1/100 s | at 1/10 s | radiance |
| --- | --- | --- | --- | --- |
| window | 0.80 | 1.00 (clipped) | 1.00 (clipped) | 0.80 ÷ 0.001 = **800** |
| wall | 0.002 (noise) | 0.02 | 0.20 | 0.20 ÷ 0.1 = **2.0** |

Ratio **400 : 1** in one image. No single exposure records both: at 1/1000 s the wall is noise, at 1/10 s the window is white.


---

### Build, move, simulate

<small>(~4 min)</small>

---

## Layout, previs, animation

- **previs**: a rough, fast version of the whole sequence: gray models, blocked cameras, timing; the director cuts the film before it is made
- **layout**: the final cameras and set dressing, shot by shot
- **animation**: animators key the rig's controls at **24 frames per second**; many shots are posed "on twos" (12 poses a second) and refined
- the animation is **curves** over time, keyframes and interpolation at studio scale


---

## FX: simulation as a department

<img src="../../media/overview/fluid-sim.jpg" class="media-shot" style="max-height: 220px;" alt="a fluid simulation frame from Blender: liquid mid-splash, caught as a sheet of droplets">
<small class="credit">Charybdis · CC BY-SA 3.0 · via Wikimedia Commons</small>

- water, smoke, fire, destruction, cloth, hair: motion from **rules**, not keys
- the artist sets conditions (viscosity, wind, stiffness) and runs the solver; results are cached to disk per frame
- a single water shot can be days of simulation before any lighting


---

### Light it, render it

<small>(~7 min)</small>

---

## Lighting: the artist places the lights

- a **lighting artist** places key, fill and rim lights per shot, plus the probe as the sky
- lights are chosen for the **story** first and the physics second: where the eye should go
- the renderer's job is then to be **physically honest** about what those lights do


---

## Production path tracers

| renderer | studio | landmark |
| --- | --- | --- |
| **RenderMan** | Pixar | the RIS path tracer; *Finding Dory* (2016) the first Pixar feature rendered with it |
| **Arnold** | Solid Angle (Marcos Fajardo), developed with Sony Pictures Imageworks | *Monster House* (2006); Academy Sci-Tech award, 2017 |
| **Hyperion** | Walt Disney Animation Studios | written for *Big Hero 6* (2014) |

All three follow the rendering equation of week 7 by Monte Carlo: many random light paths per pixel.


---

## The render farm, in numbers

| film | machines | the figure | per frame |
| --- | --- | --- | --- |
| *Toy Story* (1995) | 117 Sun SPARCstation 20s | 800,000 machine-hours for 114,240 frames | **7.0 h** on average; 45 min to 30 h |
| *Monsters University* (2013) | 24,000 cores | 100 million CPU hours | about **29 h** (reported; about 670 core-hours) |
| *Big Hero 6* (2014) | 55,000 cores, about 4,600 computers, 1.5 MW | Hyperion, global illumination throughout | |

100 million CPU hours ÷ 24,000 cores = **4,167 hours per core**: 174 days of every core busy.


---

## Blinn's law

> As technology advances, rendering time remains constant.

- attributed to **Jim Blinn**: artists spend every gain on richer frames, not faster ones
- Toy Story's average **7 h** a frame; Monsters University's reported **29 h**, on hardware thousands of times faster
- the game budget is fixed by the display (16.7 ms), so games spend gains the same way: on more per frame


---

## Noise, and the denoiser

<img src="../../textbook/figures/rt-convergence.svg" alt="Measured error of a Monte Carlo estimate against the number of samples on log axes: 0.30 at 4 samples, 0.136 at 16, 0.073 at 64, 0.0094 at 4096; four times the samples halves the error" style="max-height: 250px; width: auto;">

- Monte Carlo noise falls as **1 / √N**: halving the noise costs **4×** the samples
- **RenderMan Denoise** (from Disney Research Zurich and WDAS): first used on *Finding Dory*
- a **learned** denoiser, trained on frames from ILM, Pixar and Disney, on every Pixar feature since *Toy Story 4* (2019); in RenderMan 25 (2023), render times cut **2 to 4×**


---

## Render in layers

- one frame is rendered as many **passes** (AOVs): diffuse, specular, reflection, shadow, depth, motion vectors, object IDs
- the compositor rebuilds the frame from the passes, and can **re-balance** them without a re-render
- a note like "the rim light is too hot" costs minutes in comp instead of hours on the farm


---

### Compositing

<small>(~7 min)</small>

---

## Four channels: color and coverage

- **alpha** is the fraction of the pixel the element **covers**: 1 opaque, 0 empty, 0.5 half
- the integral alpha channel: Ed Catmull and Alvy Ray Smith, New York Institute of Technology, 1970s
- **Porter and Duff** (Lucasfilm, SIGGRAPH 1984): an algebra of compositing operators on RGBA images, with color stored **premultiplied** by alpha


---

## Over, by hand

Premultiplied pixels (r, g, b, α). F covers a fraction αF of the pixel; B shows through the rest, 1 − αF:

```text
   out = F + (1 − αF) · B          (every channel, alpha too)

   F: straight color (0.8, 0.2, 0.2), α = 0.5  →  premultiplied (0.4, 0.1, 0.1, 0.5)
   B: (0.2, 0.4, 0.8, 1)

   out = (0.4, 0.1, 0.1, 0.5) + 0.5 · (0.2, 0.4, 0.8, 1) = (0.5, 0.3, 0.5, 1)
```

One multiply-add per channel, the same formula for color and alpha.


---

## Premultiplied alpha and the fringe

Average two neighbors (a downsample, a blur): an **opaque red** pixel and a **fully transparent** pixel whose stored color happens to be green.

| | average | over black |
| --- | --- | --- |
| straight | (0.5, 0.5, 0, α 0.5) | **(0.25, 0.25, 0)**: a green fringe |
| premultiplied | (0.5, 0, 0, α 0.5) | **(0.5, 0, 0)**: correct |

A transparent pixel's color should not matter; in straight alpha it does.


---

## Over is associative

```text
   A = (0.5, 0, 0, 0.5)   B = (0, 0.5, 0, 0.5)   C = (0, 0, 1, 1)

   A over B            = (0.5, 0.25, 0, 0.75)
   (A over B) over C   = (0.5, 0.25, 0.25, 1)
   A over (B over C)   = (0.5, 0.25, 0.25, 1)
```

So a stack of layers can be **grouped** any way: precombine the foreground elements once, reuse them over every background.


---

## Deep compositing

A **deep** pixel stores a **list** of samples with depths, not one color. Insert a new CG element at depth 6 into a pixel holding fog at 5 and a red wall at 8:

```text
   fog  z = 5  α 0.3 gray      element  z = 6  α 0.5 blue      wall  z = 8  opaque red

   deep (sort by z, then over):   (0.44, 0.09, 0.44, 1)     the element sits behind the fog
   flat (element over the frame): (0.395, 0.045, 0.545, 1)  the element pasted in front of it
```

Developed at Weta Digital (Avatar); stored in OpenEXR 2.0 (ILM and Weta, 2013).


---

## Color: work in linear light

<img src="../../textbook/figures/col-blend.png" alt="Pure red and pure green blended half and half: left, a fine checker of the two; middle, the average of the display codes, (128, 128, 0), too dark; right, the average in linear light, (188, 188, 0), which matches the checker seen from a distance" style="max-height: 180px; width: auto;">

- display code **128** is **0.216** in linear light, not 0.5; the linear midpoint 0.5 is code **188**
- light adds in **linear** units: blends, filters, lighting and compositing are all done there, then encoded for the display
- **ACES** (Academy of Motion Picture Arts and Sciences, version 1.0 in December 2014): one scene-linear, wide-gamut color pipeline from camera to projector


---

## Matching CG to the plate

- **matchmove**: solve the real camera's path from the footage, so the CG camera moves identically
- **lens**: measure the lens distortion and apply it to the CG
- **light**: the probe from the set; **grain** and **motion blur** matched to the camera
- a CG element that fails any one of these reads as pasted on


---

## Where learned models are entering

- **denoising**: a trained denoiser on every Pixar feature since *Toy Story 4* (2019), a few slides back
- **capture**: learned scenes (week 10) turn photographs into a renderable scene, the photogrammetry step learned
- **roto and matting**: separating an actor from the plate, frame by frame, is increasingly done by trained networks
- **concept and previs**: image generators (weeks 9 and 10) produce references and rough frames


---

## The pipeline, mapped onto this course

| stage | where the course opens it |
| --- | --- |
| capture: triangulation, rays | vectors (week 3), learned scenes (week 10) |
| rigs, layout, cameras | scene graphs (week 4), viewing (week 5) |
| animation, FX | the loop and physics (Thursday), animation in the text |
| lighting, rendering, noise | illumination (week 6), light transport and path tracing (week 7) |
| compositing, color | antialiasing's coverage (week 5), color in the text |
| denoising, generation | networks, images, diffusion (weeks 8 to 10) |

Watch: **Pixar in a Box**, Pixar's lessons with Khan Academy: <a href="https://www.pixar.com/pixar-in-a-box">pixar.com/pixar-in-a-box</a>

