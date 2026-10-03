<!--
  CSS 551 · TOPIC DECK (2026-10-03): What computer graphics is, and where
  it is used (~13 min, 13 slides). Mounted by lectures/L01-big-picture-1/.
  No logistics.

  TEACHES: the standard definitions (Foley et al. 1990, Hughes et al. 2014, the
  name of ACM SIGGRAPH); the neighboring fields by input and output (the
  fields figure); vision as the inverse problem; image processing and
  analysis; visualization; HCI and UX; computational geometry in its two
  meanings; the newer neighbors (computational photography, neural
  rendering); then twelve fields of use, one image each, on four slides.
  NEEDS: nothing. NAMED, NOT EXPLAINED: every technique here returns later.
  SOURCE: planning/history-draft/history-of-graphics.html (draft v0.5),
    Sections 1 and 2. Figures and images copied to topics/media/
    (planning/history-draft/media/manifest.json gives each credit and license).
  IMAGE PATHS: relative to the LECTURE PAGE (reveal resolves them against the
    HTML page), three levels up from the draft lecture folder, then
    topics/media/.

  reveal.js: FLAT; notes follow "Note:"; no math; never two "_" on one line
  outside a code fence.
-->

### What computer graphics is

<small>(~13 min): the field among its neighbors, then where it is used</small>


---

## Definitions

> "Computer graphics concerns the **pictorial synthesis** of real or imaginary objects from their computer-based models, whereas the related field of image processing treats the **converse process**."
> <small>Foley, van Dam, Feiner and Hughes, 1990, p. 2</small>

> "the science and art of **communicating visually** via a computer's display and its **interaction devices**"
> <small>Hughes, van Dam, McGuire, Sklar, Foley, Feiner and Akeley, 2014</small>

The society carries both halves in its name: **ACM SIGGRAPH**, the Association for Computing Machinery's Special Interest Group on Computer Graphics and Interactive Techniques.


---

## The fields, by input and output

<img src="../../topics/media/history/fig-fields-io.svg" alt="Fields by input and output: graphics maps a model to an image, vision an image to a model, image processing an image to an image, visualization data to an image, computational geometry geometry to geometry, HCI connects person and system; neural rendering and inverse graphics bridge model and image" style="width: 860px; max-width: 100%; max-height: none;">


---

## Vision runs the arrow backwards

- "In computer vision, we are trying to do **the inverse**, i.e., to describe the world that we see in one or more images and to reconstruct its properties, such as shape, illumination, and color distributions."
- vision is hard "because it is an **inverse problem**, in which we seek to recover some unknowns given insufficient information"
- the forward models it inverts "are usually developed in physics ... and **in computer graphics**"
- the same idea in vision research: **analysis by synthesis** (Yuille and Kersten, 2006); networks trained as **inverse graphics** (Kulkarni, Whitney, Kohli and Tenenbaum, 2015)

<small>Szeliski, *Computer Vision: Algorithms and Applications*, 2nd ed., 2022, sec. 1.1</small>


---

## Image processing and image analysis

- **image processing**: an image in, an image out (noise removal, sharpening, compression)
- **image analysis**: an image in, "attributes extracted from those images (e.g., edges, contours, and the identity of individual objects)" out
- **computer vision** beyond, with "no clear-cut boundaries in the continuum"
- where they meet graphics: 3D modeling "provides an important intersection between image processing and computer graphics and is the basis for many 3-D visualization systems (e.g., flight simulators)"

<small>Gonzalez and Woods, *Digital Image Processing*, 3rd ed., 2008, ch. 1</small>


---

## Visualization

<div class="cols stack"><div class="txt">

- data with **no shape of its own** gets one
- defined by purpose: visual representations of datasets that help people carry out tasks more effectively (Munzner, 2014)
- **scientific visualization**, founded as a field by the 1987 report to the US National Science Foundation (NSF), *Visualization in Scientific Computing* (ViSC; McCormick, DeFanti and Brown): it "transforms the symbolic into the geometric"
- **information visualization**: the same idea for abstract data, not simulations
- data graphics are older than computers: Playfair's bar and line charts (1786), Minard's map of Napoleon's march (1869)

</div><div class="pic">
<img src="../../topics/media/history/commons-minard.png" alt="Minard's 1869 chart of Napoleon's Russian campaign: a band whose width shows the army's size, narrowing on the retreat">
<small class="credit">Charles Joseph Minard · public domain</small>
</div></div>


---

## Human-computer interaction and user experience

<div class="cols"><div class="txt">

- **HCI**: "a discipline concerned with the design, evaluation and implementation of interactive computing systems for human use and with the study of major phenomena surrounding them" (Hewett et al., ACM SIGCHI curricula, 1992)
- **UX**: a "user's perceptions and responses that result from the use and/or anticipated use of a system, product or service" (ISO 9241-210:2019)
- Sketchpad (1963) belongs to both graphics and HCI
- 9 December 1968: Engelbart's demonstration of the oN-Line System (NLS) and the mouse

</div><div class="pic">
<img src="../../topics/media/history/photo-engelbart-1968.jpg" alt="Douglas Engelbart at a console during the 1968 demonstration">
<small class="credit">SRI International · CC BY-SA 3.0</small>
</div></div>


---

## Computational geometry, two meanings

- **algorithms with proven bounds**: the discipline was "christened 'Computational Geometry' in a paper by M. I. Shamos (1975)"; convex hulls, closest points, Voronoi diagrams
- **the older meaning, curve and surface design**: Forrest (1971), Bézier (1972), Riesenfeld (1973) used the phrase for spline modeling
- also the subtitle of Minsky and Papert's *Perceptrons* (1969)
- so the first computational geometry was **computer-aided design**, that is, graphics

<small>Preparata and Shamos, *Computational Geometry: An Introduction*, 1985, sec. 1.1</small>


---

## Newer neighbors

<div class="cols stack"><div class="txt">

- **computational photography** "combines plentiful computing, digital sensors, modern optics, actuators, probes and smart lights to escape the limitations of traditional film cameras" (Raskar and Tumblin, 2007)
- **neural rendering**: "deep image or video generation approaches that enable explicit or implicit control of scene properties"; it "combines generative machine learning techniques with physical knowledge from computer graphics" (Tewari et al., 2020)
- **inverse graphics**: a vision network trained with a graphics model as its target
- the ACM classification of 2012 files graphics under Computing methodologies and vision under Artificial intelligence, and has no node for neural rendering

</div><div class="pic">
<img src="../../topics/media/history/app-hdr-exposures.jpg" alt="A bracket of photographs of the same scene at different exposures, with a mirrored ball">
<small class="credit">Imroy · CC BY-SA 2.5</small>
</div></div>


---

## Where it is used: design, buildings, film

<div class="grid3">
<div><img src="../../topics/media/history/commons-n7771-geneva.jpg" alt="A Boeing 777-200 at Geneva airport, 1995"><small class="credit">Aero Icarus · CC BY-SA 2.0</small>

**Design and manufacturing.** Boeing 777: "the first jetliner to be 100 percent digitally designed using three-dimensional computer graphics", no full-scale mock-up; United service June 1995; software CATIA (Dassault Systèmes, 1981).

</div>
<div><img src="../../topics/media/history/commons-scan-to-bim.jpg" alt="A laser scan of a mechanical room turned into a building information model"><small class="credit">Oregon State University · CC BY-SA 2.0</small>

**Architecture and construction.** Building information modeling (BIM): US General Services Administration program 2003, required from fiscal 2007; UK "fully collaborative 3D BIM" by 2016; ISO 19650-1:2018.

</div>
<div><img src="../../topics/media/history/site-mocap.jpg" alt="A motion-capture suit with reflective markers"><small class="credit">Mbrickn · CC0</small>

**Film and visual effects.** *Tron* and the Genesis sequence of *Star Trek II* (1982). Visual-effects Oscar: *Young Sherlock Holmes* nominated (1986 ceremony); *Terminator 2* and *Jurassic Park* won (1992 and 1994 ceremonies).

</div>
</div>


---

## Where it is used: animation, games, medicine

<div class="grid3">
<div><img src="../../topics/media/history/site-film-bbb.png" alt="A frame from the open animated short Big Buck Bunny"><small class="credit">Blender Foundation · CC BY 3.0</small>

**Animation.** "Feature length computer-animated movies didn't exist before Pixar made history with its release of *Toy Story* in 1995" (Computer History Museum). With Disney, Pixar built CAPS (Computer Animation Production System) to color hand-drawn animation digitally.

</div>
<div><img src="../../topics/media/history/photo-computer-space.jpg" alt="The fiberglass cabinet of the 1971 arcade game Computer Space"><small class="credit">Mbrickn · CC0</small>

**Games.** *Spacewar!* (Massachusetts Institute of Technology, MIT, 1961 to 1962), the first widely distributed computer game; *Computer Space* (1971) in an arcade cabinet; the GeForce 256 (1999) "often thought of as the first consumer GPU" (graphics processing unit). Games paid for the consumer GPU.

</div>
<div><img src="../../topics/media/history/site-ct-volume.png" alt="One CT scan rendered two ways, classic volume rendering and cinematic rendering"><small class="credit">Franz A. Fellner · CC BY 4.0</small>

**Medicine.** Computed tomography (CT): Hounsfield, 1973. Visible Human: male 1994, 1,871 sections at 1 mm, about 15 GB; female 1995, 5,189 images at 0.33 mm, about 40 GB. Rendered by marching cubes (1987) and volume rendering (1988).

</div>
</div>


---

## Where it is used: science, training, virtual reality

<div class="grid3">
<div><img src="../../topics/media/history/app-nasa-black-hole.jpg" alt="A ray-traced black hole with a bright accretion disk bent by gravity"><small class="credit">NASA Scientific Visualization Studio · public domain</small>

**Science.** Levinthal's interactive molecular model-building at MIT (1966); the Protein Data Bank, Brookhaven, 1971, with seven structures; NASA's Scientific Visualization Studio, Goddard, founded by Jim Strong in 1990.

</div>
<div><img src="../../topics/media/history/commons-link-trainer.jpg" alt="A Link Trainer flight simulator on display at the Air Zoo"><small class="credit">Michael Barera · CC BY-SA 4.0</small>

**Simulation and training.** Link trainer: 1929, patented 1930, more than 500,000 pilots trained in the Second World War. Then the image generators of Evans & Sutherland (E&S) and networked simulation (SIMNET).

</div>
<div><img src="../../topics/media/history/photo-nasa-view.jpg" alt="A person wearing the NASA Ames VIEW head-mounted display and a data glove"><small class="credit">NASA Ames Research Center · public domain</small>

**Virtual and augmented reality.** Sutherland's head-mounted display (1968); NASA Ames VIEW (1986); the CAVE (1992); "augmented reality" in print in January 1992 (Caudell and Mizell, Boeing); about 2.25 million smart glasses shipped in the first quarter of 2026 (IDC).

</div>
</div>


---

## Where it is used: machines, heritage, forensics

<div class="grid3">
<div><img src="../../topics/media/history/site-point-cloud.png" alt="A lidar point cloud of a San Francisco street intersection"><small class="credit">Daniel L. Lu · CC BY 4.0</small>

**Robots and self-driving cars.** CARLA, an open driving simulator (2017); Waymo: "over 15 billion miles in simulation" (April 2020); 25,000 labeled frames from a commercial game trained a street-scene segmenter (2016).

</div>
<div><img src="../../topics/media/history/app-cosmic-buddha.jpg" alt="An ambient-occlusion texture baked from a laser scan of a carved stone Buddha"><small class="credit">Smithsonian Institution · CC0</small>

**Cultural heritage.** Digital Michelangelo: the David as about two billion polygons of raw scan data (2000); Smithsonian Open Access (2020): nearly three million 2D and 3D items under CC0.

</div>
<div><img src="../../topics/media/history/commons-forensic-face.jpg" alt="A forensic facial reconstruction of a historical figure from a skull scan"><small class="credit">Cicero Moraes (Arc-Team) · CC BY 4.0</small>

**Forensics, twins, shops.** US National Institute of Justice survey of 3D crime-scene scanners (2016); NASA's digital twin, "an integrated multiphysics, multiscale simulation" (2010); IKEA: "around 60-75%" of product images computer-generated (2014).

</div>
</div>

