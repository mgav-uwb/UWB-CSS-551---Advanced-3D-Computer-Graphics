<!--
  CSS 551 · L09, Thursday October 29, 2026 (week 5, in person): Viewing.
  Mounted by index.html: L09-open.md, ../../topics/viewing.md (~76 min), L09-discuss.md, then
  ../../topics/interaction-3d.md (~16 min) after the wrap, as a supplement covered time permitting.
  Resequenced 2026-10-05: the 3D interaction (pixel to NDC, unprojection, picking, dragging
  on the ground, snapping, the arcball, the orbit controller) follows the matrices it
  inverts; the viewing topic trimmed to keep the lecture at about 80 slides.
  Re-sequenced 2026-10-25 (was L08, Tuesday October 27): affine transformations moved to L08, so
  viewing follows them on Thursday; Thursdays no longer open with a paper quiz (quizzes moved to
  Canvas); interaction in 3D became a supplement after the wrap.

  Plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Opening                                          2 min
    0:02  Viewing: frame, view matrix, projection,
          the chain, camera moves, the lens (topic)       76 min
    1:18  Wrap                                             3 min
    1:21  Questions (HW3, the topic); buffer              39 min
    2:00  End
  Time permitting: interaction in 3D (supplement, ~16 min).

  EDITED 2026-10-29: formulas typeset with MathJax (lib/deck-math.js): inline formulas are code spans
  written `$…$`.
  reveal.js: FLAT deck; notes follow "Note:" (plain text); never two "_" on one markdown line outside a
  code span or fence; no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 9: Viewing**

> The camera obscura was described in Chinese Mohist writings around the 4th century BCE and by Ibn al-Haytham around 1021.

<small>the Mohist Canon, about the 4th century BCE; Ibn al-Haytham, Book of Optics, about 1021</small>

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **The camera is a frame**: eye, at, up to `$u, v, w$`
- **The view matrix**: rows are the basis; the inverse of the camera's pose; the pole
- **Projection**: the pinhole, field of view, `$P$` entry by entry, NDC, depth precision, clipping
- **The full chain**: one vertex from object space to a pixel; frustum culling
- **Moving the camera**: dolly and zoom, off-axis and stereo frusta, the thin lens
- time permitting, **interaction in 3D**: a pixel back to a ray; picking; dragging on the ground; snapping; the arcball; orbiting

Reading: [Viewing](../../textbook/viewing.html) · [Interactive Systems](../../textbook/interaction.html), Sections 5, 6, 8 and 9.

