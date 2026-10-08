<!--
  CSS 551 · TOPIC DECK (2026-10-03): The pipeline, period by period, and
  price and performance (~14 min, 13 slides). Mounted by
  lectures/L02-big-picture-2/.

  TEACHES: the graphics pipeline as six stages and where each ran (host
  software, dedicated hardware, programmable GPU, absent); the recurring
  pattern (Blythe 2008; Myer and Sutherland's wheel of reincarnation, 1968);
  one slide per period with its pipeline figure and its price (vector display
  processor; host plus frame buffer; the Geometry Engine; SGI GT and
  RealityEngine; the raster-only PC card; hardware transform and lighting;
  programmable stages; unified shaders; ray-tracing and tensor cores); the
  price-performance chart; the lag chart (median 21 years) and the two budgets.
  The then-and-now chart of the early machines is in history-machines.md (L01).
  EDIT 2026-10-08: the L02 discussion questions were cut; the triangle series' yearly
    factor (about 3.0) is now in the "Price and performance" caption, and the two budgets'
    ratio (864,000) in "Ideas wait for hardware". The copy of fig-price-perf.svg in media/
    still has its "x3.0 a year" subtitle removed.
  SOURCE: planning/history-draft/history-of-graphics.html (v0.5) Sections 7, 8
    and 12; figures/fig-pipe-*.svg, fig-price-perf.svg, fig-lag.svg.
  IMAGE PATHS: relative to the lecture page: ../../topics/media/history/.

  reveal.js: FLAT; notes follow "Note:"; no math; never two "_" on one line
  outside a code fence.
-->

### The pipeline, period by period

<small>(~14 min): the same six stages, redrawn for each period, with the price of the hardware</small>


---

## Six stages, and where each runs

- **application**: walks the scene, issues drawing commands
- **geometry**: transforms (later lights) each vertex
- **clip and project**: cuts primitives to the view, divides by depth
- **rasterize**: finds the pixels a primitive covers (for vectors, generates the line)
- **fragment**: each pixel's color: interpolation, texturing, later pixel shaders; depth test and blending
- **frame buffer and display**

> "early use of fixed-function hardware acceleration to produce a cost-effective solution, followed by replacement with a more flexible interface" <small>Blythe, 2008</small>


---

## 1964 to the mid-1970s: the vector display processor

<div class="pipefig"><img src="../../topics/media/history/fig-pipe-vector-1963.svg" alt="Pipeline for the vector display processor: application, transform and clip in host software; a hardware line generator; a display-list processor refreshing a vector CRT"></div>

<div class="wide">

- the host builds a **display list**; a display processor reads it over and over to refresh a vector cathode-ray tube (CRT); a line generator strokes each segment
- the clipping divider and the head-mounted display's matrix multiplier (1968), then the Evans & Sutherland LDS-1 (1969), moved transform and clipping into hardware

<span class="cost">**Cost:** IBM 2250, $76,800 (1966) = $763,000 in 2026 dollars. 3D rotation hardware (1972): $40,000 to $70,000 = $308,000 to $539,000.</span>

</div>


---

## 1973 to the early 1980s: host plus frame buffer

<div class="pipefig"><img src="../../topics/media/history/fig-pipe-framebuffer-1975.svg" alt="Pipeline for host plus frame buffer: every stage host software except the frame buffer, its color map and the video output"></div>

<div class="wide">

- every stage from transformation to writing pixels is **host software**; the only graphics hardware is the frame buffer, its color map and the video output
- SuperPaint (1973); the E&S frame buffers at NYIT with Smith's Paint programs (1975 to 1977); no standard interface

<span class="cost">**Cost:** E&S frame buffer, $80,000 (1975) = $479,000 in 2026 dollars, for 512 × 512 × 8 bits.</span>

</div>


---

## 1982 to 1986: the Geometry Engine

<div class="pipefig"><img src="../../topics/media/history/fig-pipe-sgi-1983.svg" alt="Pipeline for the first generation: transform and clipping in fixed Geometry Engine chips, hidden surfaces left to the application"></div>

<div class="wide">

- Clark's Geometry System: **twelve copies of one chip**, each set by a register to one role: four for the matrix transform, four to six for clipping, two for scaling
- "equivalent to 5 million floating-point operations per second, corresponding to a fully transformed, clipped, scaled coordinate each 15 microseconds" (Clark, 1982)
- first generation (Akeley): flat-shaded points, lines and polygons, no lighting, hidden surfaces left to the application; IRIS GL

<span class="cost">**Cost:** model prices not found; the IRIS 1000 to 2400 sat in a "$45,000 to $100,000" market segment (Carlson).</span>

</div>


---

## 1988 to 1997: SGI GT, RealityEngine, InfiniteReality

<div class="cols"><div class="txt">

- **GT** (1988): geometry, scan conversion, raster and display subsystems; lighting, Gouraud shading and depth buffering in hardware; "100,000 lighted, 4-sided polygons per second"
- **RealityEngine** (1993): "lighted, smooth shaded, depth buffered, texture mapped, antialiased triangles"; up to **353 processors**: 6, 8 or 12 Geometry Engines (Intel i860XP), Fragment Generators, 80 Image Engines; over 1 million triangles and 240 million pixels a second
- **OpenGL 1.0** (1992): SGI's interface made an open standard
- **InfiniteReality** (1996): over 7 million triangles and 710 million pixels a second, sort-middle

<span class="cost">**Cost:** Personal IRIS (1988) $15,990 and $29,990 = $43,500 and $81,600; Crimson RealityEngine (1993) $99,900 = **$223,000**; Onyx RealityEngine2 $159,900 = $356,000.</span>

</div><div class="pic">
<img src="../../topics/media/history/site-sgi-onyx.jpg" alt="An SGI Onyx deskside graphics workstation" style="max-height: 360px;">
<small class="credit">Retro-Computing Society of Rhode Island · CC BY-SA 4.0</small>
</div></div>


---

## 1996 to 1998: the raster-only PC card

<div class="pipefig"><img src="../../topics/media/history/fig-pipe-voodoo-1996.svg" alt="Pipeline for the Voodoo: application through triangle setup in host software, rasterization and texturing on the card, a 2D card kept for display"></div>

<div class="wide">

- the **3dfx Voodoo** did only the back half: the host computed transform, lighting, clipping and even triangle setup, sending each triangle's starting color and its increments
- the card: spans, perspective-correct filtered texturing, fog, a 16-bit depth buffer, blending; a peak of **50 million pixels a second**; Voodoo2 (1998) moved setup to hardware; Glide or Direct3D

<span class="cost">**Cost:** Orchid Righteous 3D (Voodoo), $299 (1996) = $614 in 2026 dollars, 4 MB; a 2D card still required.</span>

</div>


---

## 1999: hardware transform and lighting

<div class="pipefig"><img src="../../topics/media/history/fig-pipe-tnl-1999.svg" alt="Pipeline for the GeForce 256: application in software, every other stage in fixed-function hardware"></div>

<div class="wide">

- the **GeForce 256** put the whole fixed-function pipeline on one chip: "Integrated Transform Engine, Integrated Lighting Engine and a 256-bit Rendering Engine on a Single Chip" (NVIDIA, 1999)
- later description: "a fixed-function 32-bit floating-point vertex transform and lighting processor and a fixed-function integer pixel-fragment pipeline" (Lindholm et al., 2008); exposed by DirectX 7

<span class="cost">**Cost:** Creative 3D Blaster Annihilator Pro (GeForce 256 DDR), $349.99 (1999) = $676, 32 MB.</span>

</div>


---

## 2001 to 2005: programmable vertex and pixel stages

<div class="pipefig"><img src="../../topics/media/history/fig-pipe-programmable-2001.svg" alt="Pipeline with programmable stages: vertex and pixel shaders in orange; setup, rasterization and raster operations fixed"></div>

<div class="wide">

- the vertex stage became an application program on the **GeForce3** (2001), "embedded in the broader fixed function pipeline" (Lindholm, Kilgard, Moreton)
- the pixel stage became programmable in floating point on the **Radeon 9700** (2002); before this, flexibility came from many passes through the fixed pipeline (Peercy et al., 2000)
- setup, rasterization and raster operations stayed fixed

<span class="cost">**Cost:** GeForce3, $350 to $400 in a September 2001 review = $636 to $727; launch list price reported at $499 to $699.</span>

</div>


---

## 2005 to 2017: unified shaders and GPU computing

<div class="pipefig"><img src="../../topics/media/history/fig-pipe-unified-2006.svg" alt="Pipeline for unified shaders: vertex, geometry and pixel work on one programmable processor pool, with compute (CUDA) on the same pool"></div>

<div class="wide">

- **Xbox 360** graphics (2005): "48 parallel unified shaders", 10 MB of embedded memory; **GeForce 8800** (8 November 2006): 128 stream processors at 1.35 GHz, each assigned vertex, pixel or geometry work as needed
- Direct3D 10: a programmable geometry stage, stream output, every fixed function a shader can express removed; **CUDA** (2007); **Vulkan 1.0** (16 February 2016)

<span class="cost">**Cost:** GeForce 8800 GTX, $599 (2006) = $957, 768 MB, "520 gigaflops of raw shader horsepower."</span>

</div>


---

## 2018 to 2026: ray-tracing cores, tensor cores, mesh shaders

<div class="pipefig"><img src="../../topics/media/history/fig-pipe-rtx-2018.svg" alt="Pipeline for the current period: unified programmable stages with fixed-function RT cores and tensor cores beside them, and task and mesh shaders"></div>

<div class="wide">

- **ray-tracing (RT) cores**: "The SM only has to launch a ray probe, and the RT core does the BVH traversal and ray-triangle tests" (SM: streaming multiprocessor; BVH: bounding-volume hierarchy); about 10 billion rays a second against about 1.1 billion in software before
- **tensor cores** for network arithmetic (upscaling, frame generation); **task and mesh shaders**; DirectX 12 Ultimate (19 March 2020)

<span class="cost">**Cost:** RTX 4090, $1,599 (2022) = $1,759, 82.6 TFLOPS (trillion floating-point operations a second). RTX 5090, $1,999 (2025), 104.8 TFLOPS, 3,352 "AI TOPS" (vendor figure).</span>

</div>


---

## Price and performance

<div class="figslide"><img src="../../topics/media/history/fig-price-perf.svg" alt="Two log charts in 2026 dollars: triangles per second per dollar from 0.133 (1988 Personal IRIS) to 22,200 (1999 GeForce 256); peak GFLOPS per dollar from 0.074 (1999) to 52.4 (2025, RTX 5090)" style="width: 900px; max-height: 450px;"></div>

<small>Triangles per second per 2026 dollar: **0.133** in 1988, 4.94 and 4.49 in 1993, 570 in 1996 (card only), **22,178** in 1999. Over 11 years that is (22,178 / 0.133)^(1/11) ≈ **3.0×** a year. The series stops at 1999: no vendor triangle rates after.</small>


---

## Ideas wait for hardware

<div class="figslide"><img src="../../topics/media/history/fig-lag.svg" alt="Ten bars from the year of publication to the year of wide use: head-mounted display 48 years, z-buffer 22, texture mapping 22, bump mapping 26, Catmull-Clark 19, ray tracing 38, mipmaps 13, path tracing 20, programmable shading 17, radiance fields 3" style="width: 760px; max-height: 380px;"></div>

<small>Median **21 years** from paper to routine use. A 60 Hz game frame: **16.7 ms**. A film frame: minutes to hours on a farm, played back later; 4 hours is **864,000** game frames.</small>

