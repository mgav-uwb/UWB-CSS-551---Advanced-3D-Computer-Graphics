<!--
  CSS 551 · Lecture 10 (Session 10) — PBR, Diffusion Models & Learned Scenes.
  THE GRADUATE FINALE, rebuilt 2026-09-16 (design: planning/css551-s10-
  generative-rebuild-design-2026-09-16.md). Three beats: honest light (the
  rendering equation and PBR, shortened), learned images (diffusion models,
  conceptual, with a live toy demo), learned scenes (NeRF and 3D Gaussian
  splatting, live). Then the course in one picture, and a closing beat that
  ENDS the course. The former GPU/API-model segment is dropped by decision.

  reveal.js: FLAT deck — every slide a top-level "---" section (no "--"
  stacks). Notes follow "Note:". Math is plain unicode text or fenced ```text
  blocks (no KaTeX plugin). Never two "_" on one markdown line outside a code
  fence; backtick names with underscores. No <small> on math. No forward
  references; the last slide ends the course.

  COMPOSITION (topic-deck pilot, 2026-09-18): this session is a thin shell.
  index.html mounts, in order: L10-rendering-frontier.md (title + tonight),
  ../../topics/pbr-rendering-equation.md, ../../topics/learned-images-
  foundations.md, ../../topics/diffusion-ladder.md, ../../topics/learned-
  scenes.md, then L10-close.md (the course in one picture + wrap). The topics
  carry the content and their own minute tags; this file carries only the
  session's own slides and the plan below.

  DEMO EMBEDS (nine across the topics, each on its own flat slide; brdf-lobe and gsplat under
  the scoped 210px crop, the seven Part-2 exhibits on demo-full slides that
  get the full ~500px viewport, as in S01). Part 2 opens with two exhibits on
  networks and embeddings, then a LADDER of five on diffusion:
   - Part 1: data-demo="brdf-lobe"        data-controls="roughness"
   - Part 2: A data-demo="mlp-fit"          data-controls="epochs,hidden" (a network is a function; trained live)
             B data-demo="embed-map"        data-controls="highlight" (class embeddings read from the trained denoiser)
             C data-demo="diffusion-image"  data-controls="t"      (a real render dissolving)
             D data-demo="diffusion-2d"     data-controls="steps,stochastic" (the mechanism on dots)
             E data-demo="diffusion-digits" data-controls="steps"  (exact denoiser on MNIST: memorizes)
             F data-demo="diffusion-digits" data-controls="smooth" (kernel bandwidth: novel digits)
             G data-demo="diffusion-net"    data-controls="guide,steps" (a TRAINED MLP denoiser, in-browser)
   - Part 3: data-demo="gsplat"           data-controls="fov"
  All exact-denoiser demos are deterministic (seeded); every caption says the
  denoiser is the exact posterior mean for the finite set, the function a
  network approximates. diffusion-net's weights: lib/assets/mnist/
  mlp-denoiser.{bin,json}, trained by tools/train-mlp.py (10 min, CPU).

  MEDIA: ../../media/generative/*.jpg, license-verified; credit lines copied
  VERBATIM from media/generative/CREDITS.md.
  READING: the course text's five topic chapters (../../textbook/) are linked
  from the Tonight and Wrap slides.

  Session plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Intro                                   3 min
    0:03  Part 1  From Phong to PBR              12 min  (two Phong slides merged; radiometry cut)
    0:15  Part 2  Learned images: diffusion      81 min  (networks, embeddings, the space of images; seven exhibits; the papers)
    1:36  Part 3  Learned scenes: NeRF and 3DGS  12 min  (NeRF pair merged)
    1:48  Part 4  The course in one picture       7 min
    1:55  Wrap                                    5 min
    2:00  end
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 10 — PBR, Diffusion Models & Learned Scenes**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>

---

## Tonight

- **From Phong to PBR** — the honest energy accounting Phong approximates; **BRDFs**, microfacets, the **metallic/roughness** model
- **Learned images: diffusion** — destroy an image with noise, learn to undo it, sample; text, control, video; a toy you can drive
- **Learned scenes: NeRF and 3DGS** — one scene learned from photographs, rendered live; where learned images and learned scenes meet
- **The course in one picture** — every piece you built this quarter, assembled

<small>Reading: the course text, five topic chapters (<a href="../../textbook/light-transport-pbr.html">light transport</a> · <a href="../../textbook/neural-nets-embeddings.html">networks</a> · <a href="../../textbook/image-space.html">the space of images</a> · <a href="../../textbook/diffusion-models.html">diffusion</a> · <a href="../../textbook/learned-scenes.html">learned scenes</a>), where tonight's lines are written out.</small>

