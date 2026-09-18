<!--
  CSS 551 · Lecture 11 (Session 10b): Learned Scenes, and Where the Field Is Going.
  The second of the two graduate-finish Tuesdays (Plan B, 2026-09-18; schedule:
  planning/css551-au26-schedule-2026-09-18.md) and THE LAST LECTURE of the
  quarter. Two beats: learned scenes (NeRF with the volume integral worked by
  hand, Gaussian splatting with a splat projected and blended by hand, the
  live scene), then graphics meets generative models (ControlNet, score
  distillation, video, what breaks, the merged field). Then the course in
  one picture and a closing beat that ENDS the course.

  reveal.js: FLAT deck, every slide a top-level "---" section (no "--"
  stacks). Notes follow "Note:". Math is plain unicode text or fenced ```text
  blocks (no KaTeX plugin). Never two "_" on one markdown line outside a code
  fence; backtick names with underscores. No <small> on math. No forward
  references; the last slide ends the course.

  COMPOSITION (topic decks): this session is a thin shell. index.html mounts,
  in order: L11-learned-scenes.md (title + tonight),
  ../../topics/learned-scenes.md, ../../topics/graphics-meets-generative.md,
  then L11-close.md (the course in one picture, the Final Project demo, the
  course in one idea, wrap).

  DEMO EMBEDS (one): data-demo="gsplat" data-controls="fov" under the scoped
  210px crop. MEDIA: ../../media/generative/*.jpg in the graphics-meets-
  generative topic, credit lines VERBATIM from media/generative/CREDITS.md.
  FIGURES: ../../textbook/figures/ls-*.svg in the learned-scenes topic.
  READING: the learned-scenes chapter (../../textbook/learned-scenes.html).

  Session plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Intro                                       3 min
    0:03  Learned scenes: NeRF and 3DGS               45 min  (topic; one ray and three splats by hand; gsplat live)
    0:48  Graphics meets generative models            30 min  (topic)
    1:18  The course in one picture                    7 min
    1:25  Final Project: the demo                      5 min
    1:30  The course, one idea + wrap                   8 min
    1:38  end + buffer (22 min)
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 11: Learned Scenes, and Where the Field Is Going**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>

---

## Tonight

- **Learned scenes: NeRF and 3DGS**: a scene as a function; the volume integral, **one ray by hand**; Gaussian splatting, **one splat projected and three blended by hand**; a real scene live
- **Graphics meets generative models**: ControlNet on your depth buffer; text to 3D through the renderer; video; what still breaks; the merged field
- **The course in one picture**: every piece you built this quarter, assembled

<small>Reading: the course text, <a href="../../textbook/learned-scenes.html">Learned Scenes</a>, where tonight's ray and splats are worked with figures; the <a href="../../textbook/diffusion-models.html">diffusion chapter</a>'s last sections cover ControlNet, score distillation and video.</small>

