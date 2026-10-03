<!--
  CSS 551 · TOPIC DECK (2026-10-03): Problems and solutions, 1959 to
  about 1982 (~50 min, 26 slides). Mounted by lectures/L01-big-picture-1/.
  Continued by history-problems-2.md (L02).

  TEACHES: the problem families of the chapter's Section 4 and the first half
  of the frame-buffer thread (Section 5), NAMED, NOT EXPLAINED: per slide the
  problem in one precise sentence, the named solutions with year, people and
  organization, an image, and a footer of organizations; lag lines where the
  chapter gives one. Order: the map (the timeline figure, three crops); the
  Utah department; lines; curves; clipping; visibility; the z-buffer; frame
  buffers before RAM; smooth shading; surface detail; the teapot; the first
  RAM frame buffer; computational geometry; level of detail; skeletons and
  skinning; reflection models; shadows; aliasing; fractal terrain;
  subdivision; ray tracing; implicit surfaces and level sets; who.
  NUMBER LEFT FOR THE DISCUSSION: the z-buffer's 1974 cost (L01 Q4).
  SOURCE: planning/history-draft/history-of-graphics.html (v0.5) Sections 4
    and 5, supplements/problems-and-solutions.html; figures/fig-timeline.svg.
  IMAGE PATHS: relative to the lecture page: ../../topics/media/history/.

  reveal.js: FLAT; notes follow "Note:"; no math; never two "_" on one line
  outside a code fence.
-->

### Problems and solutions, 1959 to 1982

<small>(~50 min): from line drawing to ray tracing, each problem with its solutions, people and organizations. Reading: <a href="../../textbook/history-of-graphics.html">A History of Computer Graphics</a>, Sections 4 and 5.</small>


---

## The map, 1 of 3

<div class="map" style="height: 432px;"><img src="../../topics/media/history/fig-timeline.svg" alt="Timeline rows 1 to 8: interaction and displays, frame buffers, curves and surfaces, lines and clipping, hidden lines and surfaces, shading and reflection, surface detail, procedural and example texture" style="margin-top: 0;"></div>
<div class="map-axis"><img src="../../topics/media/history/fig-timeline.svg" alt="the decade axis, 1950s to 2020s"></div>


---

## The map, 2 of 3

<div class="map" style="height: 389px;"><img src="../../topics/media/history/fig-timeline.svg" alt="Timeline rows 9 to 16: shadows, aliasing and sampling, rays and global illumination, too many polygons, animation and physics, motion capture, computational geometry, measured reflectance" style="margin-top: -432px;"></div>
<div class="map-axis"><img src="../../topics/media/history/fig-timeline.svg" alt="the decade axis, 1950s to 2020s"></div>


---

## The map, 3 of 3

<div class="map" style="height: 476px;"><img src="../../topics/media/history/fig-timeline.svg" alt="Timeline rows 17 to 25: procedural modeling, implicit surfaces and level sets, nature and fuzzy objects, film production, volumes and captured light, scanning and reconstruction, points hair and illustration, real-time hardware, learned images and scenes" style="margin-top: -821px;"></div>


---

## The University of Utah department (1965 to 1980)

<div class="cols"><div class="txt">

- **David Evans** recruited in 1965 to build a computer science department, concentrated on graphics, funded by ARPA's Information Processing Techniques Office
- **Ivan Sutherland** joined in 1968; Evans and Sutherland founded **Evans & Sutherland** the same year
- Utah work on later slides: visible surfaces (Warnock, Watkins), shading (Gouraud, Phong), the z-buffer and texture mapping (Catmull), reflection models and bump mapping (Blinn), the teapot (Newell), subdivision (Loop)
- alumni: **Catmull** (Pixar), **Warnock** (Adobe), **Jim Clark** (Silicon Graphics, then Netscape), **Alan Kay** (Xerox Palo Alto Research Center, PARC), **Blinn** (NASA's Jet Propulsion Laboratory); **Nolan Bushnell**, an undergraduate, founded Atari

</div><div class="pic">
<img src="../../topics/media/history/commons-ed-catmull.jpg" alt="Ed Catmull in 2014" style="max-height: 300px;">
<small class="credit">Steve Jurvetson · CC BY 2.0</small>
</div></div>

<small class="orgs">University of Utah, ARPA IPTO, Evans & Sutherland, Pixar, Adobe, Silicon Graphics, Xerox PARC, Atari</small>


---

## Interactive drawing and line rasterization (1963 to 1965)

<div class="cols"><div class="txt">

**Problem.** No system let a user create and edit a drawing while the machine kept its geometric constraints, and a line on a plotter or raster device must be approximated by discrete steps, which 1960s machines could not afford to choose with floating-point arithmetic.

- **Sketchpad** (1963, Ivan Sutherland, MIT, on the TX-2): interactive drawing, constraints, instances (the machines deck)
- **Bresenham's line algorithm** (1965, Jack Bresenham, IBM): the steps of a line chosen with **integer additions only**; written for a pen plotter

</div><div class="pic">
<img src="../../topics/media/history/commons-bresenham.png" alt="A line approximated by a staircase of pixels, as Bresenham's algorithm chooses them">
<small class="credit">Crotalus horridus · public domain</small>
</div></div>

<small class="orgs">MIT Lincoln Laboratory, IBM; venues: the conferences of the American Federation of Information Processing Societies (AFIPS), IBM Systems Journal; taught in L09 (rasterization)</small>


---

## Free-form curves and surfaces (1959 to 1975)

<div class="cols stack"><div class="txt">

**Problem.** Car bodies and aircraft skins had no mathematical representation that numerically controlled machining could use and that a designer could shape through a few control points.

- **de Casteljau's algorithm** (1959, Paul de Faget de Casteljau, Citroën): internal reports kept secret
- **Ferguson patches** (1964, James Ferguson, Boeing); **Coons patch** (1967, Steven Coons, MIT Project MAC)
- **Bézier curves** (Pierre Bézier, Renault): UNISURF, 1971 paper, 1972 book
- **B-splines** (de Boor 1972; Gordon and Riesenfeld, 1974) and **rational B-splines**, later NURBS (1975, Ken Versprille, Syracuse)

</div><div class="pic duo">
<div><img src="../../topics/media/history/commons-de-casteljau.png" alt="De Casteljau's construction: repeated linear interpolation between control points">
<small class="credit">Marc J · CC0</small></div>
<div><img src="../../topics/media/history/commons-nurbs-surface.png" alt="A NURBS surface with its control net">
<small class="credit">chrschn · public domain</small></div>
</div></div>

<small class="orgs">Citroën, Renault, Boeing, MIT Project MAC, General Motors Research, Syracuse University; taught in the curves chapter</small>


---

## Clipping (1967 to 1974)

<div class="cols"><div class="txt">

**Problem.** Lines and polygons extending beyond the viewing window had to be cut at its boundary before display, because off-screen coordinates wrapped around or overloaded the display hardware, and the cut had to keep up with flight simulation.

- **Cohen-Sutherland line clipping** (usually dated 1967, Danny Cohen and Sutherland)
- **the clipping divider** (1968, Robert Sproull and Sutherland): clipping and the perspective division in hardware, part of the head-mounted display
- **reentrant polygon clipping** (1974, Sutherland and Gary Hodgman): whole polygons, plane by plane, in a pipeline; the algorithm the graphics pipeline still runs

</div><div class="pic">
<img src="../../topics/media/history/commons-sutherland-hodgman.png" alt="A polygon clipped against a window edge by edge">
<small class="credit">Wojciech Mula · public domain</small>
</div></div>

<small class="orgs">Harvard, Evans & Sutherland; venues: AFIPS, Communications of the ACM (CACM); taught in L08 (viewing)</small>


---

## Visibility: hidden lines and hidden surfaces (1963 to 1972)

<div class="cols stack"><div class="txt">

**Problem.** No efficient general algorithm determined which surfaces are visible from the viewpoint, so solids could be shown only as wireframes with every edge drawn, and shaded images were impossible.

- **hidden-line removal for polyhedra** (1963, Lawrence Roberts, MIT Lincoln Laboratory), in a thesis that also began computer vision
- **quantitative invisibility** (1967, Arthur Appel, IBM)
- **area subdivision** (1969, John Warnock, Utah); **scan-line visible surfaces** (1970, Gary Watkins, Utah)
- **the painter's algorithm** (1972, Martin Newell, Richard Newell and Tom Sancha, Cambridge): sort back to front, paint over

</div><div class="pic">
<img src="../../topics/media/history/commons-painters-algorithm.png" alt="The painter's algorithm: distant mountains painted first, then nearer layers over them">
<small class="credit">Zapyon · CC BY-SA 3.0</small>
</div></div>

<small class="orgs">MIT Lincoln Laboratory, IBM, University of Utah, Cambridge CAD Centre; venues: ACM Annual Conference, university reports</small>


---

## Visibility: the z-buffer (1974)

<div class="cols"><div class="txt">

**Problem.** Every visible-surface algorithm sorted polygons, at a cost that grows with the scene; in 1974 Sutherland, Sproull and Schumacker compared ten and showed they "differ mainly in how they sort".

- **the z-buffer** (1974, **Edwin Catmull**, Utah PhD thesis): sorts nothing; a depth for every pixel, the nearest surface wins
- found independently the same year by **Wolfgang Straßer** (Technische Universität, TU, Berlin)
- the price is memory: a 512 × 512 buffer at 16 bits, when memory cost about **four cents a bit** (E&S sold a 256 KB frame buffer for $80,000 in 1975)

<span class="cost">**Lag:** 1974 thesis to the consumer 3D card of 1996, 22 years.</span>

</div><div class="pic">
<img src="../../topics/media/history/commons-z-buffer.jpg" alt="A rendered scene and its depth buffer as a grayscale image" style="max-height: 230px;">
<small class="credit">T-tus · CC BY 2.0</small>
<img src="../../topics/media/history/paper-catmull.png" alt="A figure from Catmull's thesis: curved patches with textures" style="max-height: 150px;">
<small class="credit">Catmull: curved surfaces, texture-mapped patches, 1974 · ACM · fair use</small>
</div></div>

<small class="orgs">University of Utah, TU Berlin; venues: ACM Computing Surveys, university reports; taught in L09</small>


---

## Frame buffers before RAM (1968 to 1973)

<div class="cols"><div class="txt">

**Problem.** A raster display can fill areas but needs memory for the whole image, and for its first decade that memory was the most expensive part of the system; random-access memory (RAM) was too costly to hold it.

- **BRAD**, Brookhaven Raster Display (1968): 512 × 512 × 2 bits on **drum** tracks
- **SuperPaint** (online April 1973, Richard Shoup, Xerox PARC): 640 × 486 × 8 bits in **shift registers**, chosen over Intel's 1103 dynamic RAM; a second buffer "deemed too expensive"
- **Xerox Alto** (1973): a 606 × 808 one-bit bitmap in main memory: 61,206 bytes, **46.7 %** of the base 128 KB

<span class="cost">**Cost:** BRAD $50,000 (1968) = $463,000 in 2026 dollars. SuperPaint: not found (the video digitizer alone "~$12,000"). Alto: estimates conflict, $12,000, $32,000 or $40,000; $12,000 (1973) = $87,000.</span>

</div><div class="pic">
<img src="../../topics/media/history/photo-superpaint.jpg" alt="The SuperPaint system at the Computer History Museum: monitor, tablet and frame buffer" style="max-height: 360px;">
<small class="credit">Marshall Astor · CC BY-SA 2.0</small>
</div></div>

<small class="orgs">Brookhaven National Laboratory, Xerox PARC; taught in L09 (the frame buffer)</small>


---

## Smooth shading of polygon meshes (1971 to 1975)

<div class="cols stack"><div class="txt">

**Problem.** One shade per polygon makes the facets of a mesh that approximates a curved surface visible, and a smooth alternative had to be cheap enough to evaluate at every pixel.

- **Gouraud shading** (1971, Henri Gouraud, Utah): colors computed at the vertices, interpolated across
- **Phong shading and the Phong highlight** (1975, Bui Tuong Phong, Utah): the normal interpolated, a specular highlight added

</div><div class="pic duo">
<div><img src="../../topics/media/history/commons-d3d-shading-modes.png" alt="The same sphere flat-shaded and Gouraud-shaded">
<small class="credit">Lukáš Buričin · public domain</small></div>
<div><img src="../../topics/media/history/paper-phong.png" alt="A figure from Phong's work: shaded objects with specular highlights">
<small class="credit">Phong: illumination for computer generated pictures, 1975 · ACM · fair use</small></div>
</div></div>

<small class="orgs">University of Utah; venues: IEEE Transactions on Computers, CACM; taught in L11 (illumination)</small>


---

## Surface detail without geometry (1974 to 1986)

<div class="cols"><div class="txt">

**Problem.** Fine surface detail (patterns, labels, wrinkles, reflections) modeled as polygons exceeded 1970s memory and time, so it had to be mapped onto surfaces from stored images or functions.

- **texture mapping** (1974, Catmull, Utah): images glued onto curved patches
- **environment mapping** (1976, Jim Blinn and Martin Newell, Utah): reflections from a stored picture of the surroundings
- **bump mapping** (1978, Blinn, Utah): normals perturbed, not geometry
- **mipmapping** (1983, Lance Williams, New York Institute of Technology, NYIT): a prefiltered pyramid, so distant textures stop shimmering
- **cube maps** (1986, Ned Greene); Heckbert's survey of the thread (1986)

<span class="cost">**Lags:** texture mapping 1974 to 1996, 22 years; mipmaps 1983 to 1996, 13; bump mapping 1978 to 2004, 26.</span>

</div><div class="pic">
<img src="../../topics/media/history/commons-mipmap-example.jpg" alt="A texture and its mipmap pyramid of halved copies">
<small class="credit">Mulad, after a NASA image · CC BY-SA 3.0</small>
</div></div>

<small class="orgs">University of Utah, New York Institute of Technology; venues: CACM, SIGGRAPH, IEEE Computer Graphics and Applications (CG&A); taught in L10 (textures)</small>


---

## The test object: the Utah teapot

<div class="cols"><div class="txt">

- digitized by **Martin Newell**, a Utah student, in 1974 or 1975: the Newells' own Melitta teapot
- **28 bicubic Bézier patches**, entered by hand, with no bottom
- Frank Crow added four bottom patches in 1987: the 32-patch teapot most libraries ship
- the physical pot is at the Computer History Museum

</div><div class="pic">
<img src="../../topics/media/history/site-utah-teapot-photo.jpg" alt="The original Melitta teapot at the Computer History Museum">
<small class="credit">Michael Hicks · CC BY 2.0</small>
</div></div>

<small class="orgs">University of Utah, Computer History Museum; taught in the curves chapter (patches)</small>


---

## The first RAM frame buffer (1975)

<div class="cols stack"><div class="txt">

**Problem.** Paint programs and shaded images needed a whole picture in random-access memory, at a price a laboratory could pay.

- **Evans & Sutherland frame buffer** (1975, designed by Sutherland, James Kajiya, Demos and Cheadle): 512 × 512 pixels at 8 bits
- "the price of that first RAM framebuffer product was **$80,000** for 512 by 512 pixels, eight bits each" (Alvy Ray Smith)
- **NYIT** bought five more at $60,000 each and, about 1977, combined three into the **first 24-bit frame buffer**; Smith wrote the paint program **Paint3** for it

<span class="cost">**Cost:** $80,000 (1975) = **$479,000** in 2026 dollars (× 5.984): **$1.83 a pixel**, $1.91 million a megabyte, about six times the cheapest memory of the year. NYIT's 24-bit system: $180,000 = $956,000.</span>

</div><div class="pic">
<img src="../../topics/media/history/photo-es-framebuffer.png" alt="A Klein bottle as a wireframe on an E&S Picture System and as a color raster image">
<small class="credit">Evans & Sutherland Computer Corp. · public domain</small>
</div></div>

<small class="orgs">Evans & Sutherland, New York Institute of Technology (NYIT)</small>


---

## Computational geometry: search structures, partitions, solids (1975 to 1996)

<div class="cols"><div class="txt">

**Problem.** Graphics programs keep asking geometric questions (what lies near a point or along a ray, which faces are in front, how to triangulate scattered points, how to combine two solids), and testing every pair costs time quadratic in the scene.

- **computational geometry as a field** (1975 to 1978, Michael Shamos, Yale): convex hulls, closest points, the **Voronoi diagram** and its dual, the **Delaunay triangulation**
- **k-d tree** (1975, Jon Louis Bentley, Stanford); **binary space partitioning (BSP) tree** (1980, Henry Fuchs, Zvi Kedem and Bruce Naylor, UT Dallas)
- **quad-edge structure** (1985, Leonidas Guibas and Jorge Stolfi, Xerox PARC and Stanford)
- **constructive solid geometry** (1977 to 1980, Herbert Voelcker and Aristides Requicha, Rochester); the Computational Geometry Algorithms Library, **CGAL** (from 1996)

</div><div class="pic">
<img src="../../topics/media/history/commons-delaunay-voronoi.png" alt="A Delaunay triangulation of points with its dual Voronoi diagram" style="max-height: 200px;">
<small class="credit">Hferee · public domain</small>
<img src="../../topics/media/history/commons-csg-tree.png" alt="A constructive solid geometry tree of a cube, a sphere and three cylinders" style="max-height: 180px;">
<small class="credit">Zottie · CC BY-SA 3.0</small>
</div></div>

<small class="orgs">Yale, Stanford, Xerox PARC, University of Texas at Dallas, University of Rochester; venues: IEEE Symposium on Foundations of Computer Science (FOCS), CACM, SIGGRAPH, ACM Transactions on Graphics (TOG)</small>


---

## Geometric complexity: level of detail and simplification (1976 to 1997)

<div class="cols stack"><div class="txt">

**Problem.** Scenes held more polygons than could be drawn in one frame time, so distant objects needed fewer polygons without visible popping between levels, and dense scanned meshes needed simplification.

- **hierarchical models and level of detail (LOD)** (1976, **Jim Clark**): a hierarchy of bounding volumes, detail chosen by screen size
- **progressive meshes** (1996, Hugues Hoppe, Microsoft Research): one mesh that streams as a continuous sequence of levels
- **quadric error metrics** (1997, Michael Garland and Paul Heckbert, Carnegie Mellon): the standard cost for edge-collapse simplification

</div><div class="pic">
<img src="../../topics/media/history/commons-stanford-bunny-qem.png" alt="The Stanford bunny simplified to fewer and fewer triangles by quadric error metrics">
<small class="credit">Trevorgoodchild · public domain</small>
</div></div>

<small class="orgs">Microsoft Research, Carnegie Mellon University; venues: CACM, SIGGRAPH; taught in L10 (meshes)</small>


---

## Character animation: skeletons and skinning (1976 to 2000)

<div class="cols"><div class="txt">

**Problem.** Specifying every vertex of a deforming body in every frame is infeasible, so motion had to be controlled by a few parameters, the joint angles of a skeleton that drives the skin.

- **skeleton-driven keyframing** (1976, Nestor Burtnyk and Marceli Wein)
- **the principles of traditional animation applied to 3D** (1987, John Lasseter, Pixar)
- **skinning by joint-dependent local deformation** (1988, Nadia Magnenat-Thalmann, Richard Laperrière and Daniel Thalmann)
- **pose space deformation** (2000, J. P. Lewis, Matt Cordner and Nickson Fong): named and fixed the artifacts of linear blend skinning

</div><div class="pic">
<img src="../../topics/media/history/film-luxo.jpg" alt="Luxo Jr.: two desk lamps and a ball">
<small class="credit"><em>Luxo Jr.</em>, 1986 · Pixar · fair use</small>
</div></div>

<small class="orgs">Pixar; venues: CACM, Graphics Interface, SIGGRAPH; taught in L07 (scene graphs)</small>


---

## Physically based reflection models (1967 to 1982)

<div class="cols stack"><div class="txt">

**Problem.** Phong's highlight is an empirical function, not derived from surface physics, so it could not make metals and plastics look like their materials or be tied to measured reflectance.

- **microfacet theory** (1967, Kenneth Torrance and Ephraim Sparrow): a rough surface as a distribution of tiny mirrors, in optics
- **Trowbridge-Reitz distribution** (1975), later renamed **GGX**: the one most engines use now
- **Blinn's reflection models** (1977, Jim Blinn, Utah): Torrance-Sparrow brought into graphics; the **half-vector** highlight
- **Cook-Torrance** (1981, 1982, Robert Cook and Torrance, Cornell): with the Fresnel color shift, in the first issue of ACM Transactions on Graphics

</div><div class="pic">
<img src="../../topics/media/history/commons-blinn-phong.png" alt="The same scene with Phong and Blinn-Phong highlights side by side">
<small class="credit">Rainwarrior · CC BY-SA 3.0</small>
</div></div>

<small class="orgs">University of Utah, Cornell University; venues: Journal of the Optical Society of America (JOSA), SIGGRAPH, ACM TOG; taught in L11 and L12</small>


---

## Cast shadows (1977 to 1987)

<div class="cols"><div class="txt">

**Problem.** Local shading does not test whether a point is visible from the light, so objects cast no shadows and appear to float; the visibility test had to be cheap enough for a scan-line renderer.

- **shadow volumes** (1977, Franklin Crow): shadowed regions as polygonal volumes, in a paper that also surveyed shadow algorithms
- **shadow maps** (1978, Lance Williams): depth rendered from the light, compared per pixel
- **percentage-closer filtering** (1987, William Reeves, David Salesin and Robert Cook, Pixar): soft shadow-map edges for film

</div><div class="pic">
<img src="../../topics/media/history/commons-shadow-volume.png" alt="A shadow volume extruded from an occluder away from the light">
<small class="credit">SamVandenBerghe · public domain</small>
</div></div>

<small class="orgs">Pixar; venues: SIGGRAPH; taught in L12 (shadow rays and maps)</small>


---

## Aliasing (1977 to 1986)

<div class="cols"><div class="txt">

**Problem.** One point sample per pixel undersamples edges, textures and motion, which produces stair-stepped edges, crawling textures and strobing.

- **aliasing diagnosed** (1977, Franklin Crow): the term borrowed from sampling theory, filtering as the cure
- **motion blur** (1983, Michael Potmesil and Indranil Chakravarty): filtering in time
- **the A-buffer** (1984, Loren Carpenter, Lucasfilm): subpixel coverage masks with hidden-surface removal
- **stochastic sampling** (1986, Robert Cook, Pixar): jittered samples, so aliasing turns into noise
- hardware **multisampling** (1993, the RealityEngine, Silicon Graphics)

</div><div class="pic">
<img src="../../topics/media/history/commons-anti-aliasing-demo.png" alt="A diagonal edge with and without antialiasing" style="max-height: 340px;">
<small class="credit">trlkly · CC BY-SA 3.0</small>
</div></div>

<small class="orgs">Lucasfilm, Pixar, Silicon Graphics; venues: CACM, SIGGRAPH, ACM TOG; taught in L09 (antialiasing)</small>


---

## Natural shapes: fractal terrain (1967 to 1982)

<div class="cols stack"><div class="txt">

**Problem.** Terrain, coastlines and clouds have irregular detail at every scale, too much to model by hand, so it had to be generated.

- **fractal geometry** (Benoit Mandelbrot): "How long is the coast of Britain?" (1967); books of 1977 and 1982
- ***Vol Libre*** (1980, Loren Carpenter, Boeing): a fractal-landscape flyover film shown at SIGGRAPH; frames reported at 20 to 40 minutes each on a VAX-11/780
- **stochastic fractal rendering** (1982, Alain Fournier, Don Fussell and Carpenter): terrain by subdivision with random displacement

</div><div class="pic">
<img src="../../topics/media/history/film-genesis.jpg" alt="The Genesis sequence of Star Trek II: a planet surface of fractal terrain under a wave of fire">
<small class="credit"><em>Star Trek II</em>: the Genesis Effect, 1982 · Paramount Pictures · fair use</small>
</div></div>

<small class="orgs">Boeing; venues: Science, CACM, SIGGRAPH; taught in L10 (procedural texture)</small>


---

## Smooth surfaces of arbitrary topology: subdivision (1974 to 1998)

<div class="cols"><div class="txt">

**Problem.** Tensor-product spline patches need a rectangular control grid, so surfaces of arbitrary topology (characters, organic shapes) had to be stitched from patches whose seams crack when animated.

- **corner cutting** (1974, George Chaikin): smooth curves by repeatedly cutting corners
- **Catmull-Clark subdivision** (1978, Catmull and Jim Clark): smooth surfaces from any quadrilateral cage; **Doo-Sabin** (1978) in the same issue
- **Loop subdivision** (1987, Charles Loop, Utah): the same for triangle meshes
- **subdivision in production** (1998, Tony DeRose, Michael Kass and Tien Truong, Pixar): creases and textures, used in the short *Geri's Game* (1997)

<span class="cost">**Lag:** Catmull-Clark 1978 to *Geri's Game* 1997, 19 years. Technical Achievement Award to Catmull, DeRose and Jos Stam, 2006.</span>

</div><div class="pic">
<img src="../../topics/media/history/commons-catmull-clark-levels.png" alt="A cube cage subdivided by Catmull-Clark, levels 0 to 3" style="max-height: 300px;">
<small class="credit">Banlu Kemiyatorn · CC0</small>
</div></div>

<small class="orgs">University of Utah, Pixar; venues: Computer-Aided Design, Computer Graphics and Image Processing, SIGGRAPH; taught in L10 and the curves chapter</small>


---

## Shadows, reflection and refraction: ray tracing (1968 to 1984)

<div class="cols"><div class="txt">

**Problem.** Local shading evaluates a surface point from the light sources alone, ignoring the rest of the scene, so it cannot compute cast shadows, mirror reflection or refraction.

- **ray casting for shading** (1968, Arthur Appel, IBM): rays from the eye, with shadow tests
- **refraction** (1979, Douglas Kay and Donald Greenberg, Cornell)
- **recursive ray tracing** (1980, **Turner Whitted**, Bell Labs): shadows, reflection and refraction from one recursive algorithm; 44, 74 and 122 minutes per picture on a VAX-11/780, at 480 × 640
- **distributed ray tracing** (1984, Cook, Thomas Porter and Carpenter, Lucasfilm): depth of field, soft shadows, motion blur, glossy reflection

<span class="cost">**Lag:** recursive ray tracing 1980 to ray-tracing hardware in consumer cards (2018), 38 years.</span>

</div><div class="pic">
<img src="../../topics/media/history/site-whitted.png" alt="The course's render of Whitted's scene: glass and mirror spheres over a checkerboard" style="max-height: 200px;">
<small class="credit">course figure</small>
<img src="../../topics/media/history/paper-distributed-rt.jpg" alt="The 1984 frame of pool balls with motion blur from distributed ray tracing" style="max-height: 170px;">
<small class="credit">Cook, Porter, Carpenter: "1984", 1984 · ACM, Lucasfilm · fair use</small>
</div></div>

<small class="orgs">IBM, Cornell University, Bell Labs, Lucasfilm; venues: AFIPS, CACM, SIGGRAPH; taught in L12</small>


---

## Implicit surfaces, level sets and sparse volumes (1982 to 2013)

<div class="cols"><div class="txt">

**Problem.** Meshes and patches represent a surface by its boundary, so shapes that blend, merge or split need their connectivity rebuilt at every change; a surface defined as the zero set of a function changes topology for free, but has to be stored, moved and rendered.

- **blobby models** (1982, Jim Blinn, Jet Propulsion Laboratory): summed Gaussian fields around atoms
- **soft objects** (1986, Geoff Wyvill, Craig McPheeters and Brian Wyvill): fields of finite radius, now called metaballs
- **the level set method** (1988, Stanley Osher and James Sethian, University of California, Los Angeles (UCLA), and UC Berkeley); for liquids: Foster and Fedkiw (2001), the **particle level set** (2002, Enright, Marschner and Fedkiw, Stanford and Industrial Light & Magic)
- **VDB** (2013, Ken Museth, DreamWorks Animation): sparse grids, released as OpenVDB

</div><div class="pic">
<img src="../../topics/media/history/commons-metaballs.png" alt="Two metaballs apart, then merged into one blended shape" style="max-height: 200px;">
<small class="credit">GlydeG · public domain</small>
<img src="../../topics/media/history/commons-level-set.jpg" alt="A level-set function cut by a plane at zero; the zero set changes topology" style="max-height: 170px;">
<small class="credit">Oleg Alexandrov · public domain</small>
</div></div>

<small class="orgs">NASA Jet Propulsion Laboratory, UCLA, UC Berkeley, Stanford, Pacific Data Images/DreamWorks, Industrial Light & Magic, DreamWorks Animation; venues: ACM TOG, The Visual Computer, Journal of Computational Physics, SIGGRAPH</small>


---

## Who, 1959 to 1982

- **universities**: MIT (Lincoln Laboratory, Project MAC), Harvard, Utah, Cambridge, Cornell, Syracuse, Yale, Stanford, TU Berlin
- **corporate laboratories and companies**: IBM, Bell Labs, Evans & Sutherland, Xerox PARC, Boeing, General Motors Research, Citroën, Renault, NYIT, and by the end Lucasfilm
- **funders**: ARPA's Information Processing Techniques Office and the Office of Naval Research
- **venues**: the AFIPS Joint Computer Conferences and CACM, then ACM Computing Surveys, and from **1974 SIGGRAPH**, which has carried most of the field's papers since

