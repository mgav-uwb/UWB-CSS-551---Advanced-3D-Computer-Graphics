<!--
  CSS 551 · L08, Tuesday October 27, 2026 (week 5, online): Viewing.
  Mounted by index.html: L08-open.md, ../../topics/viewing.md (~76 min),
  ../../topics/interaction-3d.md (~16 min), L08-discuss.md.
  Resequenced 2026-10-05: the 3D interaction (pixel to NDC, unprojection, picking, dragging
  on the ground, snapping, the arcball, the orbit controller) follows the matrices it
  inverts; the viewing topic trimmed to keep the lecture at about 80 slides.

  Plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Opening                                          2 min
    0:02  Viewing: frame, view matrix, projection,
          the chain, camera moves, the lens (topic)       76 min
    1:18  Interaction in 3D: NDC, rays, picking,
          dragging, snapping, arcball, orbit (topic)      16 min
    1:34  Discussion: four peer-instruction questions     21 min
    1:55  Wrap                                             5 min
    2:00  End

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math; never two "_" on one
  markdown line outside a code fence; no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 8: Viewing**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **The camera is a frame**: eye, at, up to u, v, w
- **The view matrix**: rows are the basis; the inverse of the camera's pose; the pole
- **Projection**: the pinhole, field of view, P entry by entry, NDC, depth precision, clipping
- **The full chain**: one vertex from object space to a pixel; frustum culling
- **Moving the camera**: dolly and zoom, off-axis and stereo frusta, the thin lens
- **Interaction in 3D**: a pixel back to a ray; picking; dragging on the ground; snapping; the arcball; orbiting
- **Discussion**: four questions, vote, argue, vote again

Reading: [Viewing](../../textbook/viewing.html) · [Interactive Systems](../../textbook/interaction.html), Sections 5, 6, 8 and 9.

