<!--
  CSS 551 · Lecture 10 (Session 10a): Light and Learned Images.
  The first of the two graduate-finish Tuesdays (Plan B, 2026-09-18; schedule:
  planning/css551-au26-schedule-2026-09-18.md). Two beats: honest light (the
  rendering equation and PBR, with one evaluation by hand), then learned
  images (networks and embeddings, then the diffusion ladder with its seven
  live exhibits). The following Tuesday (Session 10b, sessions/S11-learned-
  scenes/) takes learned scenes, graphics-meets-generative, and the close of
  the course; this session's wrap points only at Thursday.

  reveal.js: FLAT deck, every slide a top-level "---" section (no "--"
  stacks). Notes follow "Note:". Math is plain unicode text or fenced ```text
  blocks (no KaTeX plugin). Never two "_" on one markdown line outside a code
  fence; backtick names with underscores. No <small> on math.

  COMPOSITION (topic decks): this session is a thin shell. index.html mounts,
  in order: L10-rendering-frontier.md (title + tonight),
  ../../topics/pbr-rendering-equation.md, ../../topics/learned-images-
  foundations.md, ../../topics/diffusion-ladder.md, then L10-close.md (wrap).
  The topics carry the content and their own minute tags; this file carries
  only the session's own slides and the plan below.

  DEMO EMBEDS (eight across the topics; brdf-lobe under the scoped 210px crop,
  the seven exhibits on demo-full slides that get the full ~500px viewport):
   - light:  data-demo="brdf-lobe"        data-controls="roughness"
   - images: A data-demo="mlp-fit"          data-controls="epochs,hidden"
             B data-demo="embed-map"        data-controls="highlight"
             C data-demo="diffusion-image"  data-controls="t"
             D data-demo="diffusion-2d"     data-controls="steps,stochastic"
             E data-demo="diffusion-digits" data-controls="steps"
             F data-demo="diffusion-digits" data-controls="smooth"
             G data-demo="diffusion-net"    data-controls="guide,steps"
  READING: four course-text chapters (../../textbook/) linked from Tonight.

  Session plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Intro                                       3 min
    0:03  Honest light: rendering equation and PBR   20 min  (topic; one evaluation by hand; the sphere grid)
    0:23  Learned images: foundations                26 min  (topic; exhibits A, B)
    0:49  Learned images: the diffusion ladder       42 min  (topic; exhibits C-G, the scalings, the papers)
    1:31  Wrap                                        5 min
    1:36  end + buffer (24 min; the ladder's exhibit G is the one not to rush)
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 10: Light and Learned Images**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>

---

## Tonight

- **From Phong to PBR**: the honest energy accounting Phong approximates; **BRDFs**, microfacets with **D, G, F as numbers**, the **metallic/roughness** model rendered
- **Learned images: foundations**: a network is a function you can train live; **embeddings**; two encoders, one space
- **Learned images: the diffusion ladder**: destroy an image with noise, learn to undo it, sample; a lookup table that memorizes, a network that does not; guidance; the three scalings to Stable Diffusion

<small>Reading: the course text (<a href="../../textbook/light-transport-pbr.html">light transport</a> · <a href="../../textbook/neural-nets-embeddings.html">networks</a> · <a href="../../textbook/image-space.html">the space of images</a> · <a href="../../textbook/diffusion-models.html">diffusion</a>), where tonight's lines are written out with figures and worked examples.</small>

