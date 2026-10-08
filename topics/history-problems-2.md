<!--
  CSS 551 · TOPIC DECK (2026-10-03): Problems and solutions, about 1980
  to 2018 (~35 min, 26 slides). Mounted by lectures/L02-big-picture-2/.
  Continues history-problems-1.md (L01).

  TEACHES: the problem families of the chapter's Section 6, plus four the
  chapter dates earlier but that belong with them (measured reflectance,
  procedural modeling, motion capture; the frame-buffer thread from 1976),
  NAMED, NOT EXPLAINED, in the same slide form as part 1: the problem in one
  precise sentence, the named solutions with year, people and organization, an
  image, a footer of organizations, lag lines where the chapter has them.
  Order: frame buffers as products; the frame-buffer cost chart; hardware
  pipelines; particles; compositing; radiosity; measured reflectance;
  procedural texture; procedural modeling; points; the rendering equation;
  Reyes; motion capture; physically based animation; volumes; 3D scanning;
  hair and fur; NPR; captured light; consumer hardware; GPU computing;
  physically based materials; path-traced films; real-time rays; who.
  EDIT 2026-10-08: the L02 discussion questions were cut; the halvings of display-memory
    price (about 25 in 50 years) and one pixel then and now (7.9 million times cheaper)
    are now on the "Display memory" slide.
  SOURCE: planning/history-draft/history-of-graphics.html (v0.5) Sections 4 to
    6, supplements/problems-and-solutions.html; figures/fig-fb-cost.svg.
  IMAGE PATHS: relative to the lecture page: ../../topics/media/history/.

  reveal.js: FLAT; notes follow "Note:"; no math; never two "_" on one line
  outside a code fence.
-->

### Problems and solutions, 1980 to 2018

<small>(~35 min): from frame buffers as products to ray-tracing hardware, each problem with its solutions, people and organizations. Reading: <a href="../../textbook/history-of-graphics.html">A History of Computer Graphics</a>, Section 6.</small>


---

## Frame buffers become products (1976 to 1987)

<div class="cols stack"><div class="txt">

**Problem.** A raster display needed its whole picture in memory, and that memory had to fall from a laboratory budget to the price of a card for a personal computer (PC).

- **1976**: in the US, about 2,000 graphics terminals at "$50,000 and up", 10,000 to 15,000 at "$10,000 and under"
- **1980 to 1981**: raster systems from Genisco, Ikonas, Ramtek, AED; six recommended 512 × 512 systems from $19,820 to $53,100
- **CGA**, the Color Graphics Adapter of International Business Machines (IBM), announced 12 August 1981: 16 KB for $300
- **Macintosh** (1984): a 512 × 342 one-bit bitmap in 21,888 bytes of its 128 KB, $2,495
- **EGA**, the Enhanced Graphics Adapter (1984): $524 with 64 KB, $982 with 256 KB; the first **VGA** (Video Graphics Array) card (reportedly 1987): $595

<span class="cost">**Cost (2026 $):** Genisco GCT-3000 with 1 MB (1980) $195,000; AED 512 (1981) under $46,000; CGA $1,063, that is **$68,000 per MB**; VGA $1,690, **$6,745 per MB**.</span>

</div><div class="pic duo">
<div><img src="../../topics/media/history/commons-ibm-cga.jpg" alt="An IBM Color Graphics Adapter card" style="max-height: 130px;">
<small class="credit">Malvineous · CC BY-SA 4.0</small></div>
<div><img src="../../topics/media/history/photo-pixar-image-computer.jpg" alt="The Pixar Image Computer of 1986" style="max-height: 130px;">
<small class="credit">Adam Schuster · CC BY 2.0</small></div>
</div></div>

<small class="orgs">Genisco, Ikonas, Ramtek, AED, IBM, Apple, Pixar; taught in L09 (the frame buffer)</small>


---

## Display memory, 1975 to 2025

<div class="figslide"><img src="../../topics/media/history/fig-fb-cost.svg" alt="Frame-buffer memory in 2026 dollars per megabyte on a log scale from 1975 to 2025, red points from the E&S frame buffer at 1.9 million down to the RTX 5090 at 0.061, ordinary DRAM in gray below" style="width: 690px; max-height: 465px;"></div>

<small>In 2026 dollars: the Evans & Sutherland (E&S) frame buffer of 1975 cost **$1.83 a pixel**, $1,914,903 per MB; the RTX 5090 of 2025, 32 GB for $1,999, costs **$0.061 per MB** with its processor: log₂(1,914,903 / 0.061) ≈ **25** halvings in 50 years, one every 2 years; a pixel, 4 bytes now against 1 then, is about **7.9 million** times cheaper.</small>


---

## Hardware pipelines for interactive 3D (1982 to 1993)

<div class="cols"><div class="txt">

**Problem.** General-purpose processors could not transform, clip and rasterize thousands of shaded polygons per frame at interactive rates, so the pipeline stages had to be built as special-purpose hardware.

- **the Geometry Engine** (1982, **Jim Clark**, Stanford): transformation and clipping on a custom very-large-scale integration (VLSI) chip; Silicon Graphics (SGI) founded around it; IRIS 1000 reportedly November 1983
- **Pixel-Planes** (1985, Henry Fuchs, John Poulton, John Eyles, University of North Carolina, UNC): a processor behind every pixel
- **SGI GT** (1988, Kurt Akeley and Tom Jermoluk); **edge-function rasterization** (1988, Juan Pineda)
- **RealityEngine** (1993, Akeley, SGI): textured, antialiased triangles in real time, hardware multisampling

</div><div class="pic">
<img src="../../topics/media/history/commons-sgi-ge25a.jpg" alt="The die of an SGI GE25A Geometry Engine chip">
<small class="credit">Pauli Rautakorpi · CC BY 3.0</small>
</div></div>

<small class="orgs">Stanford, Silicon Graphics, UNC Chapel Hill; venues: SIGGRAPH, the conference of the Association for Computing Machinery's graphics group (ACM SIGGRAPH); architectures in the pipelines deck</small>


---

## Amorphous phenomena: particle systems (1982 to 1983)

<div class="cols"><div class="txt">

**Problem.** Phenomena without well-defined surfaces (fire, sparks, smoke, spray) cannot be represented by polygon meshes.

- **particle systems** (1983, **William Reeves**, Lucasfilm): clouds of short-lived points governed by stochastic rules
- first used for the wall of fire in the **Genesis sequence** of *Star Trek II* (1982)

</div><div class="pic">
<img src="../../topics/media/history/paper-reeves.jpg" alt="A figure from Reeves's 1983 paper: a wall of fire spreading over a planet">
<small class="credit">Reeves: particle systems, 1983 · ACM · fair use</small>
</div></div>

<small class="orgs">Lucasfilm Computer Division; venues: ACM Transactions on Graphics (TOG), SIGGRAPH; taught in L03 (simulation)</small>


---

## Digital compositing (1984)

<div class="cols stack"><div class="txt">

**Problem.** Effects shots combine separately rendered layers, and pixels that an element covers only partly had to be combined without edge fringes, which needs a per-pixel coverage value and a consistent algebra of compositing operators.

- **alpha compositing and the over operator** (1984, **Thomas Porter and Tom Duff**, Lucasfilm): the compositing algebra, with **premultiplied alpha**, that window systems, games and film all use
- the alpha channel itself: Catmull and Alvy Ray Smith at the New York Institute of Technology (NYIT), 1970s

</div><div class="pic">
<img src="../../topics/media/history/commons-alpha-compositing.png" alt="The Porter-Duff compositing operators shown on two overlapping shapes">
<small class="credit">Wereon · public domain</small>
</div></div>

<small class="orgs">Lucasfilm, NYIT; venues: SIGGRAPH; worked by hand in the film-pipeline deck tonight</small>


---

## Indirect illumination: radiosity (1984 to 1988)

<div class="cols"><div class="txt">

**Problem.** Neither local shading nor Whitted ray tracing computes indirect illumination, light reflected between diffuse surfaces, which produces the soft indirect light and color bleeding that dominate interiors.

- **radiosity** (1984, Cindy Goral, Kenneth Torrance, Donald Greenberg and Bennett Battaile, Cornell): the energy balance of radiative heat transfer applied to lighting; the **Cornell box**
- **the hemicube** (1985, Michael Cohen and Greenberg): form factors with z-buffer hardware
- **the measured box** (1986, Meyer, Rushmeier, Cohen, Greenberg, Torrance): a real box photographed and compared with its rendering
- **progressive refinement** (1988, Cohen, Shenchang Chen, John Wallace, Greenberg): viewable while it converges; the **factory**, about 30,000 patches

</div><div class="pic">
<img src="../../topics/media/history/paper-radiosity-factory.jpg" alt="A steel-mill interior lit only by radiosity: gantry cranes and rolling stands" style="max-height: 230px;">
<small class="credit">The radiosity factory, 1988 · Cornell Program of Computer Graphics · fair use</small>
<img src="../../topics/media/history/site-cornell-box.png" alt="The Cornell box: a red wall, a green wall and two blocks under a ceiling light" style="max-height: 130px;">
<small class="credit">SeeSchloss · public domain</small>
</div></div>

<small class="orgs">Cornell Program of Computer Graphics; venues: SIGGRAPH, ACM TOG; taught in L12 and L13</small>


---

## Measuring reflectance: BRDF acquisition (1977 to 2003)

<div class="cols"><div class="txt">

**Problem.** Analytic reflection models have a few parameters, and nothing tied them to a real material without measuring how it scatters light from every incoming to every outgoing direction, a four-dimensional function.

- **the bidirectional reflectance distribution function (BRDF)** defined (1977, Fred Nicodemus and colleagues, National Bureau of Standards, NBS)
- **imaging gonioreflectometer** (1992, Greg Ward, Lawrence Berkeley Laboratory), with an anisotropic model fit to its data
- **image-based BRDF measurement** (1999, Marschner, Westin, Lafortune, Torrance, Greenberg, Cornell): many angles in one photograph
- **the light stage** (2000, Paul Debevec and colleagues): a face under light from the whole sphere
- **the MERL BRDF database** (2003, Matusik, Pfister, Brand, McMillan, Mitsubishi Electric Research Laboratories, MERL): 100 measured materials

</div><div class="pic">
<img src="../../topics/media/history/commons-gonioreflectometer.jpg" alt="A gonioreflectometer: two articulated arms hold a light and a detector around a sample">
<small class="credit">EditorErin · CC BY-SA 4.0</small>
</div></div>

<small class="orgs">NBS, Lawrence Berkeley Laboratory, Cornell, University of Southern California, MERL; venues: NBS monographs, SIGGRAPH, Eurographics Rendering Workshop (EGRW), ACM TOG; taught in L12</small>


---

## Procedural, solid and example-based texture (1985 to 2001)

<div class="cols"><div class="txt">

**Problem.** Image textures have finite resolution and extent, so they repeat, stretch and cannot fill a volume; marble, wood and clouds needed patterns computed as functions of position, and a small photograph of a material had to be extended to any size without seams.

- **Perlin noise** and a shading language (1985, **Ken Perlin**); **solid texturing** (1985, Darwyn Peachey)
- **reaction-diffusion** (1991, Greg Turk, UNC; Andrew Witkin and Michael Kass)
- **cellular texture** (1995, Fleischer, Laidlaw, Currin, Barr, Caltech); **Worley's cellular basis** (1996, Steven Worley)
- **synthesis from examples**: Heeger and Bergen (1995); Efros and Leung (1999, Berkeley); Wei and Levoy (2000, Stanford); **image quilting** (2001, Efros and Freeman)

</div><div class="pic">
<img src="../../topics/media/history/paper-perlin.png" alt="A marble vase textured with Perlin noise" style="max-height: 220px;">
<small class="credit">Perlin: an image synthesizer, 1985 · Ken Perlin · fair use</small>
<img src="../../topics/media/history/commons-worley.jpg" alt="Worley noise: gray cells around scattered feature points" style="max-height: 130px;">
<small class="credit">Rocchini · CC BY-SA 3.0</small>
</div></div>

<small class="orgs">New York University, UNC Chapel Hill, Caltech, UC Berkeley, Stanford; venues: SIGGRAPH, International Conference on Computer Vision (ICCV); taught in L10 (procedural texture)</small>


---

## Procedural modeling: grammars for plants and buildings (1968 to 2006)

<div class="cols"><div class="txt">

**Problem.** Plants, buildings and cities contain thousands of similar but not identical parts, too many to model by hand and too structured for random displacement, so they had to be generated by rules that encode how the parts grow or are assembled.

- **L-systems** (1968, Aristid Lindenmayer, a biologist): string rewriting in parallel
- **plants as turtle graphics** (1988, Przemyslaw Prusinkiewicz, Regina, with Lindenmayer and James Hanan); *The Algorithmic Beauty of Plants* (1990)
- **shape grammars** (1975, George Stiny and James Gips)
- **procedural cities** (2001, Yoav Parish and Pascal Müller, ETH Zurich); **CGA shape** for buildings (2006, Müller, Wonka and colleagues)
- **Houdini** (SideFX), from PRISMS (1987)

</div><div class="pic">
<img src="../../topics/media/history/commons-l-system-tree.jpg" alt="A branching tree drawn by an L-system">
<small class="credit">Nevit Dilmen · CC BY-SA 3.0</small>
</div></div>

<small class="orgs">University of Regina, ETH Zurich, Arizona State, SideFX; venues: Journal of Theoretical Biology, SIGGRAPH, ACM TOG</small>


---

## Points as a rendering primitive (1985 to 2001)

<div class="cols"><div class="txt">

**Problem.** When a model has more triangles than the image has pixels, as dense scans do, each triangle covers less than a pixel and its connectivity is wasted work, but bare points leave holes between samples and alias when minified.

- **points as a display primitive** (1985, **Marc Levoy and Turner Whitted**, UNC): surfaces from points alone, each spread over a small footprint
- **QSplat** (2000, Szymon Rusinkiewicz and Levoy, Stanford): the Digital Michelangelo scans drawn interactively from a sphere hierarchy
- **surface splatting** (2001, Matthias Zwicker, Hanspeter Pfister, Jeroen van Baar, Markus Gross, ETH Zurich and MERL): each point an elliptical Gaussian filtered in screen space
- 3D Gaussian splatting (2023) projects its Gaussians the same way

</div><div class="pic">
<img src="../../topics/media/history/site-point-cloud.png" alt="A lidar point cloud of a street intersection">
<small class="credit">Daniel L. Lu · CC BY 4.0</small>
</div></div>

<small class="orgs">UNC Chapel Hill, Stanford, ETH Zurich, MERL; venues: UNC technical reports, SIGGRAPH; taught in L18 (splats)</small>


---

## One equation for all light: the rendering equation (1986 to 1997)

<div class="cols"><div class="txt">

**Problem.** Ray tracing handled specular paths and radiosity diffuse interreflection, but global illumination had no general formulation and no estimator that covered all light paths.

- **the rendering equation and path tracing** (1986, **James Kajiya**, Caltech): all of light transport as one integral equation, estimated by random paths
- the same year, independently: Immel, Cohen and Greenberg (Cornell)
- **multiple importance sampling** (1995, Eric Veach and Leonidas Guibas, Stanford)
- **photon mapping** (1996, Henrik Wann Jensen)

<span class="cost">**Lag:** path tracing, 1986 paper to the first feature film rendered with it (2006), 20 years.</span>

</div><div class="pic">
<img src="../../topics/media/history/commons-path-tracing-001.png" alt="A path-traced scene with soft shadows, color bleeding and glossy reflections">
<small class="credit">Qutorial · CC BY-SA 4.0</small>
</div></div>

<small class="orgs">Caltech, Cornell, Stanford; venues: SIGGRAPH, EGRW (now the Eurographics Symposium on Rendering, EGSR); taught in L12 and L13</small>


---

## Feature-film rendering: Reyes and shading languages (1984 to 1995)

<div class="cols"><div class="txt">

**Problem.** A feature film needs well over a hundred thousand frames of complex scenes with motion blur, displacement and custom materials, and 1980s renderers could neither fit such scenes in memory nor let artists program materials.

- **shade trees** (1984, Robert Cook, Lucasfilm): materials as user-built expression trees
- **the Reyes architecture** (1987, Cook, Loren Carpenter and Ed Catmull, Lucasfilm then Pixar): every surface diced into **micropolygons** smaller than a pixel, film-scale scenes streamed through memory
- **the RenderMan Interface** and the **RenderMan Shading Language** (1990, Pat Hanrahan and Jim Lawson, Pixar)
- *Toy Story* (1995) rendered with RenderMan

<span class="cost">**Lag:** programmable shading, shade trees (1984) to programmable consumer hardware (2001), 17 years.</span>

</div><div class="pic">
<img src="../../topics/media/history/paper-reyes.png" alt="A figure from the Reyes paper: a surface diced into micropolygons">
<small class="credit">Cook, Carpenter, Catmull: Reyes, 1987 · ACM, Lucasfilm and Pixar · fair use</small>
</div></div>

<small class="orgs">Lucasfilm Computer Division, Pixar; venues: SIGGRAPH; taught in L11 (shaders)</small>


---

## Motion capture (1878 to 2002)

<div class="cols"><div class="txt">

**Problem.** Keyframed human motion looks mechanical because the timing and weight shifts of a real body are too subtle to specify by hand, so the motion had to be measured from a performer and turned into joint angles that drive a skeleton.

- precursors: **sequential photographs** (1878, Eadweard Muybridge, for Leland Stanford); **the rotoscope** (Max Fleischer, filed 1915, granted 1917)
- **sensor capture** for computer animation (1980 and 1982, Tom Calvert and colleagues, Simon Fraser University)
- **optical marker systems**: Vicon, first system 1979, trading from 1984 (Oxford Metrics)
- **motion graphs** (2002, Lucas Kovar, Michael Gleicher and Frédéric Pighin, Wisconsin and Southern California): captured clips cut and rejoined into new motion

</div><div class="pic">
<img src="../../topics/media/history/commons-muybridge-horse.jpg" alt="Muybridge's twelve photographs of a galloping horse" style="max-height: 200px;">
<small class="credit">Eadweard Muybridge · public domain</small>
<img src="../../topics/media/history/commons-rotoscope-patent.png" alt="The rotoscope patent drawing: an artist tracing a projected frame" style="max-height: 160px;">
<small class="credit">Max Fleischer · public domain</small>
</div></div>

<small class="orgs">Simon Fraser University, Oxford Metrics (Vicon), University of Wisconsin-Madison, University of Southern California, Carnegie Mellon; venues: SIGGRAPH, IEEE Computer Graphics and Applications (CG&A), ACM TOG; taught in L07</small>


---

## Physically based animation (1987 to 1999)

<div class="cols"><div class="txt">

**Problem.** Cloth, collisions, smoke and water cannot be keyframed convincingly by hand, and numerical simulation of them was unstable or too slow at the time steps production needs.

- **elastically deformable models** (1987, Demetri Terzopoulos, John Platt, Alan Barr and Kurt Fleischer)
- **implicit cloth with large stable steps** (1998, David Baraff and Andrew Witkin)
- **stable fluids** (1999, **Jos Stam**, Alias|Wavefront)

</div><div class="pic">
<img src="../../topics/media/history/site-sim-cloth.png" alt="The course's simulation of a cloth draped over a sphere">
<small class="credit">course figure</small>
</div></div>

<small class="orgs">Alias|Wavefront; venues: SIGGRAPH; taught in L03 (physics simulation)</small>


---

## Volume visualization (1987 to 1988)

<div class="cols"><div class="txt">

**Problem.** Computed tomography (CT) and magnetic resonance imaging (MRI) scanners produce 3D grids of scalar samples with no surface representation, which polygon renderers cannot display, and clinicians needed images of bone and tissue.

- **marching cubes** (1987, William Lorensen and Harvey Cline, General Electric): triangle surfaces extracted from volume data
- **direct volume rendering** (1988), two papers the same year: **Marc Levoy** (UNC) and **Robert Drebin, Loren Carpenter and Pat Hanrahan** (Pixar)

</div><div class="pic">
<img src="../../topics/media/history/site-ct-volume.png" alt="One CT scan rendered two ways: volume rendering and cinematic rendering">
<small class="credit">Franz A. Fellner · CC BY 4.0</small>
</div></div>

<small class="orgs">General Electric, UNC Chapel Hill, Pixar; venues: SIGGRAPH, IEEE CG&A; taught in L18 (the volume integral)</small>


---

## 3D scanning and reconstruction (1982 to 2010)

<div class="cols"><div class="txt">

**Problem.** Real objects had to be modeled to a fraction of a millimeter, but a scanner sees one side at a time, so many partial, noisy range images had to be aligned and merged into one closed surface; photographs give shape only where points match across views.

- **structured light** (1982, Jeffrey Posdamer and Martin Altschuler)
- **zippered range scans** (1994, Greg Turk and Marc Levoy, Stanford): the test object, a terra-cotta rabbit, the **Stanford bunny**
- **volumetric merging** (1996, Brian Curless and Levoy); **Digital Michelangelo** (2000); **Poisson reconstruction** (2006, Kazhdan, Bolitho, Hoppe)
- from photographs: **Facade** (1996, Debevec, Taylor, Malik, Berkeley); **Photo Tourism** (2006, Snavely, Seitz, Szeliski); patch-based multi-view stereo, **PMVS** (2010, Furukawa and Ponce)

</div><div class="pic">
<img src="../../topics/media/history/site-stanford-bunny-photo.jpg" alt="A 3D-printed Stanford bunny" style="max-height: 170px;">
<small class="credit">funnypolynomial · CC BY 2.0</small>
<img src="../../topics/media/history/paper-debevec-facade.jpg" alt="Facade: the Berkeley Campanile modeled from photographs" style="max-height: 170px;">
<small class="credit">Debevec, Taylor, Malik: Facade, 1996 · ACM · fair use</small>
</div></div>

<small class="orgs">Stanford, University of Washington, Microsoft Research, Johns Hopkins, UC Berkeley; venues: SIGGRAPH, Symposium on Geometry Processing, ACM TOG, IEEE Transactions on Pattern Analysis and Machine Intelligence; taught in L10 and L18</small>


---

## Hair and fur (1989 to 2003)

<div class="cols"><div class="txt">

**Problem.** Hair and fur consist of many thousands of fibers, each thinner than a pixel and translucent, so neither surface shading models nor one sample per pixel can render it, and light scattered inside the fibers sets its color and highlights.

- **volumetric fur** (1989, **James Kajiya and Timothy Kay**, Caltech): fur as a 3D texture of densities, ray-traced, with a lighting model for thin cylinders
- **the hair scattering model** (2003, Stephen Marschner, Henrik Wann Jensen, Mike Cammarano, Steve Worley and Pat Hanrahan, Stanford): fibers as rough dielectric cylinders, which explained the **two highlights** of real hair, one white and one colored

</div><div class="pic">
<img src="../../topics/media/history/film-monsters-inc.jpg" alt="Sulley from Monsters, Inc., covered in simulated fur">
<small class="credit"><em>Monsters, Inc.</em>: Sulley's fur, 2001 · Pixar · fair use</small>
</div></div>

<small class="orgs">Caltech, Stanford; venues: SIGGRAPH, ACM TOG</small>


---

## Non-photorealistic rendering (1990 to 1998)

<div class="cols"><div class="txt">

**Problem.** Technical illustration, cartoons and painting convey shape with outlines, hatching and limited palettes rather than physically correct light, and a renderer had to produce such images from 3D models automatically.

- **comprehensible rendering** (1990, Takafumi Saito and Tokiichiro Takahashi, Nippon Telegraph and Telephone, NTT): depth and normals stored per pixel, the geometric buffers of later deferred shading, outlines and hatching drawn from them
- **pen-and-ink illustration** (1994, Georges Winkenbach and David Salesin, University of Washington)
- **painterly rendering** (1998, Aaron Hertzmann, NYU)
- **Gooch shading** (1998, Amy Gooch, Bruce Gooch, Peter Shirley and Elaine Cohen, Utah): a cool-to-warm ramp instead of dark shadows

</div><div class="pic">
<img src="../../topics/media/history/commons-gooch-bunny.png" alt="The Stanford bunny with Gooch shading, blue to pale yellow">
<small class="credit">Eduardo Graells-Garrido and Maria-Cecilia Rivara · CC BY-SA 3.0</small>
</div></div>

<small class="orgs">NTT Human Interface Laboratories, University of Washington, NYU, University of Utah; venues: SIGGRAPH; taught in L11 (shaders)</small>


---

## Captured light: image-based rendering (1996 to 1998)

<div class="cols stack"><div class="txt">

**Problem.** Hand-built models and lights could not reproduce the look and lighting of real scenes, so new views and illumination had to come from photographs: views rendered from captured rays instead of geometry, light measured instead of designed.

- **light field rendering** (1996, **Marc Levoy and Pat Hanrahan**, Stanford): new views from a 4D table of rays, no geometry; the **Lumigraph** (1996, Gortler, Grzeszczuk, Szeliski, Cohen, Microsoft Research)
- **high-dynamic-range radiance maps** (1997, **Paul Debevec** and Jitendra Malik, Berkeley): real light levels from a bracket of exposures
- **image-based lighting** (1998, Debevec): computer-generated objects lit with captured light

</div><div class="pic">
<img src="../../topics/media/history/paper-debevec-ibl.jpg" alt="Debevec's 1998 figure: synthetic objects lit by a captured light probe">
<small class="credit">Debevec: rendering synthetic objects into real scenes, 1998 · ACM · fair use</small>
</div></div>

<small class="orgs">Stanford, Microsoft Research, UC Berkeley; venues: SIGGRAPH; worked in the film-pipeline deck (the light probe)</small>


---

## Consumer 3D hardware and programmable shading (1996 to 2004)

<div class="cols"><div class="txt">

**Problem.** Real-time 3D needed hardware a household could buy, and once that existed its fixed-function pipeline evaluated only built-in lighting and texturing, so the custom materials of film rendering could not run at game frame rates.

- **3dfx Voodoo** (1996): only "the inner rasterization loop", the rest on the host
- **NVIDIA GeForce 256** (announced 31 August 1999, "the world's first graphics processing unit"): transform and lighting on the rasterizer's chip, "15 million sustained polygons per second"
- **GeForce3** (22 February 2001): a user-programmable vertex engine (Lindholm, Kilgard, Moreton)
- **ATI Radeon 9700** (2002): the pixel stage programmable in floating point

<span class="cost">**Cost (2026 $):** Voodoo card $299 (1996) = $614; GeForce 256 card $349.99 (1999) = $676; GeForce3 $350 to $400 (2001) = $636 to $727.</span>

</div><div class="pic">
<img src="../../topics/media/history/photo-voodoo.jpg" alt="A 3dfx Voodoo Graphics add-in card">
<small class="credit">Dennis Lamczak · CC BY-SA 3.0</small>
</div></div>

<small class="orgs">3dfx Interactive, NVIDIA, ATI Technologies, Microsoft, Khronos Group; venues: SIGGRAPH, IEEE Micro; taught in L11 (shaders)</small>


---

## General-purpose computing on GPUs (2004 to 2012)

<div class="wide">

**Problem.** The GPU had become the cheapest parallel arithmetic machine available, but computations other than rendering had to be disguised as graphics operations to run on it.

- **Brook for GPUs** (2004, Ian Buck, Pat Hanrahan and colleagues, Stanford): the GPU as a stream computer
- **CUDA**, Compute Unified Device Architecture (programming guide 1.0, 23 June 2007, NVIDIA), on the unified **Tesla** architecture of the GeForce 8800 (November 2006)
- **AlexNet** (2012, Krizhevsky, Sutskever and Hinton): trained on two consumer gaming GPUs, GTX 580s

</div>

<div class="pipefig"><img src="../../topics/media/history/fig-pipe-unified-2006.svg" alt="The unified-shader pipeline of 2006 with a compute path (CUDA, 2007) running on the same processor pool" style="max-height: 250px;"></div>

<small class="orgs">Stanford, NVIDIA, University of Toronto; venues: SIGGRAPH, ACM Queue, Neural Information Processing Systems (NeurIPS); taught in L14 (networks)</small>


---

## Physically based materials in production (2012 to 2013)

<div class="cols"><div class="txt">

**Problem.** Ad hoc material parameters, neither energy-conserving nor fit to measured reflectance, had to be retuned for each lighting setup; studios needed physically based materials controlled by a few artist-friendly parameters.

- **the Disney principled BRDF** (2012, **Brent Burley**, Walt Disney Animation Studios): a few artist-friendly parameters fit to measured materials; used on *Wreck-It Ralph*
- **real-time physically based rendering (PBR)** (2013, **Brian Karis**, Epic Games): the same kind of model inside a game frame, Unreal Engine 4

<span class="cost">**Lag:** Cook-Torrance (1982) to the default artist workflow (2012 to 2013), about 30 years.</span>

</div><div class="pic">
<img src="../../topics/media/history/paper-cook-torrance.jpg" alt="A figure from Cook and Torrance's 1982 paper: the same vase in different metals" style="max-height: 360px;">
<small class="credit">Cook and Torrance: a reflectance model, 1982 · ACM · fair use</small>
</div></div>

<small class="orgs">Walt Disney Animation Studios, Epic Games; venues: SIGGRAPH courses; taught in L12 (metal-roughness)</small>


---

## Path tracing in feature-film production (2006 to 2018)

<div class="cols"><div class="txt">

**Problem.** Reyes rendering relied on approximations (shadow maps, caches) that made lighting slow to set up; path tracing needs none but was too noisy and slow for film-scale scenes.

- **Arnold** (Marcos Fajardo; Solid Angle with Sony Pictures Imageworks): *Monster House* (2006), reported as the first feature rendered with path tracing
- *Monsters University* (2013): the first Pixar feature with ray-traced global illumination
- **Hyperion** (Walt Disney Animation Studios): *Big Hero 6* (2014)
- **RenderMan's path tracer** (Per Christensen and colleagues, Pixar): *Finding Dory* (2016), path-traced throughout
- **Manuka** (Weta Digital): spectral path tracing at film scale

</div><div class="pic">
<img src="../../topics/media/history/film-finding-dory.jpg" alt="A frame from Finding Dory">
<small class="credit"><em>Finding Dory</em>, 2016 · Disney/Pixar · fair use</small>
</div></div>

<small class="orgs">Solid Angle, Sony Pictures Imageworks, Pixar, Walt Disney Animation Studios, Weta Digital; venues: ACM TOG; taught in L13</small>


---

## Real-time ray tracing and denoising (2017 to 2018)

<div class="cols"><div class="txt">

**Problem.** In a 16 ms game frame, programmable GPU cores could trace only a few rays per pixel, and Monte Carlo estimates from so few samples are too noisy to display.

- **denoisers** (2017): spatiotemporal variance-guided filtering, **SVGF** (Christoph Schied and colleagues); kernel-predicting networks for film (Bako, Vogels and colleagues); a recurrent denoising autoencoder (Chaitanya and colleagues)
- **DirectX Raytracing (DXR)** announced 19 March 2018 (Microsoft)
- **NVIDIA Turing** (13 August 2018): "dedicated ray-tracing processors called RT Cores", "up to 10 GigaRays a second"; GeForce RTX cards from 20 August 2018

<span class="cost">**Cost:** GeForce RTX 2080, $699 (2018) = $896, 8 GB. **Lag:** recursive ray tracing 1980 to consumer ray-tracing hardware 2018, 38 years.</span>

</div><div class="pic">
<img src="../../topics/media/history/commons-rtx-2080.jpg" alt="An MSI GeForce RTX 2080 graphics card">
<small class="credit">Jacek Halicki · CC BY-SA 4.0</small>
</div></div>

<small class="orgs">NVIDIA, Microsoft; venues: High Performance Graphics (HPG), ACM TOG; taught in L13</small>


---

## Who, 1980 to 2018

- **studios**: Lucasfilm and Pixar, Walt Disney Animation Studios, Sony Pictures Imageworks, Weta Digital
- **hardware companies**: Silicon Graphics, 3dfx, ATI, NVIDIA
- **software companies**: Alias|Wavefront, SideFX, Microsoft, Epic Games
- **research laboratories**: Xerox Palo Alto Research Center, Bell Labs, Microsoft Research, MERL, NVIDIA Research, Disney Research
- **universities**: Cornell, Stanford, UNC, Caltech, Berkeley, Carnegie Mellon, ETH Zurich
- **venues**: SIGGRAPH and ACM TOG, Eurographics and Computer Graphics Forum, EGSR, HPG

