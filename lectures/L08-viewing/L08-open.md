<!--
  CSS 551 · L08, Tuesday October 27, 2026 (week 5, online): Viewing.
  Mounted by index.html: L08-open.md, ../../topics/viewing.md (~93 min), L08-discuss.md.

  Plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Opening                                          2 min
    0:02  Viewing: frame, view matrix, projection,
          the chain, camera moves (topic)                93 min
    1:35  Discussion: five peer-instruction questions    21 min
    1:56  Wrap                                             4 min
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
- **Projection**: the pinhole, field of view, P entry by entry, NDC, depth precision
- **The full chain**: one vertex from object space to a pixel; frustum culling
- **Moving the camera**: tumble, track, dolly
- **Discussion**: five questions, vote, argue, vote again

Reading: [Viewing](../../textbook/viewing.html) in the course text.

