<!--
  CSS 551 · TOPIC DECK (supplement): Scene graphs in practice, further (~10 min, 5 slides).
  Mounted after the wrap of a lecture that mounts scene-graph-concepts.md, covered time permitting.
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/scene-graph-concepts-supplement.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.

  TEACHES (concepts, no matrix arithmetic): sixty years of scene graphs (Sketchpad to glTF); drawing a node's
  frames to debug a hierarchy; a conversion node at the root on import; the transform tree against the
  culling tree; transparency order against tree order.
  SOURCE:  split 2026-10-25 from scene-graph-concepts.md (slides unchanged), for L08.
  NEEDS:   scene-graph-intro and scene-graph-concepts.
  DEMOS:   none embedded; a link to the football demo at step 10.
  FIGURES: none.
  EDITED 2026-10-29 (formulas typeset and figures for ASCII, across L08): checked; these slides have no formula
  and no ASCII diagram, so nothing changed.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Inline formulas are code spans written `$...$` (lib/deck-math.js);
  code identifiers stay plain code spans. Never two "_" on one markdown line outside
  a code fence or code span. Paths are relative to the lecture page that
  mounts this topic (lectures/LNN-slug/index.html).
-->

### Supplement: scene graphs in practice, further

<small>(~10 min, time permitting)</small>


---

## Sixty years of trees

| year | system | the tree |
| --- | --- | --- |
| 1963 | Sketchpad (Sutherland) | master drawings and instances: edit the master, every copy changes |
| 1992 | OpenGL 1.0 | `glPushMatrix` / `glPopMatrix`: the tree walked as a matrix stack (removed from core in OpenGL 3.1, 2009) |
| 1994 | VRML 1.0 | the first web 3D format, built on SGI's Open Inventor scene-graph files |
| 2016 | USD (Pixar, open-sourced) | film's scene description: layered trees of prims |
| 2017 | glTF 2.0 (Khronos) | the web and engine interchange format: nodes with TRS or a matrix |


---

## Debugging a hierarchy: draw the frames

- draw each node's **axes** at its world origin: three.js `new THREE.AxesHelper(0.3)` added to the node; Unity `Debug.DrawRay(t.position, t.right)` (and `up`, `forward`)
- a wrong frame is visible at once: an axis pointing the wrong way, an origin in the wrong place, axes of the wrong length (hidden scale)


---

## Importing: a conversion node at the root

| system | up | handedness | units |
| --- | --- | --- | --- |
| glTF 2.0 | +Y | right-handed | meters |
| three.js | +Y | right-handed | (scene units) |
| Unity | +Y | **left-handed** | meters |

Going from glTF to Unity flips one axis (a mirror): importers insert that mirror at the root, or convert every node, so that windings stay right.

<a href="../../lib/demo.html?demo=football&amp;controls=step:10" target="_blank" rel="noopener">Spiral pass, step 10: place the field in the world ↗</a>


---

## The transform tree is not the culling tree

- the **scene graph** groups by *what moves with what* (arm under base)
- a **bounding volume hierarchy** groups by *what is near what* (the ray-tracing lecture's BVH)
- a character's hand and a lamp on a far table can be siblings in the scene graph and far apart in space

Engines keep **both**: the hierarchy for transforms, a spatial structure (BVH, octree, grid) rebuilt or refit from the world boxes for culling and picking.


---

## Pitfall: transparency ignores the tree order

A depth-first traversal draws in **tree order**. Opaque surfaces do not care, because the depth buffer sorts them. Transparent surfaces blend with what is **already drawn**, so they must be drawn **back to front** by distance from the camera, regardless of where they sit in the tree.

Renderers therefore traverse to collect `(world matrix, mesh, material)`, then **sort** the transparent list by view depth before drawing.

