<!--
  CSS 551 · L06, Tuesday October 20, 2026 (week 4, online): Vectors, rotation, and the scene graph.
  Built 2026-10-20 at Marcel's request: a slow recap of the linear algebra, rotation finished, the
  scene graph introduced.
  This lecture replaces the meshes lecture on this date; the meshes deck stays in ../L06-meshes/
  until the schedule is rebuilt. Homogeneous coordinates and affine maps start next week.
  Mounts, in order: L06-open.md, ../../topics/linear-algebra-recap.md (~40 min),
  ../../topics/rotation-recap.md (~45 min), ../../topics/scene-graph-intro.md (~28 min, with the
  spiral pass), L06-discuss.md (the wrap).

  Minute plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  opening                                                   2 min
    0:02  linear algebra recap: vectors, polygons, lines, planes,
          dot and cross, the trig identities behind them, closest
          points and distances, both tracks, the cheat sheets (topic) 40 min
    0:42  rotation: 2D from the angle-sum identities, R_x R_y R_z,
          Rodrigues derived, Euler angles and gimbal lock,
          quaternions by their rules (topic)                         45 min
    1:27  the scene graph and hierarchical modeling, the spiral
          pass walked through (topic)                                28 min
    1:55  wrap                                                       3 min
    1:58  buffer                                                     2 min
  The demo slides are where the time can flex.

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math; never two "_" on one
  markdown line outside a code fence; no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 6: Vectors, Rotation, and the Scene Graph**

> In 1840, three years before Hamilton's quaternions, the banker and mathematician Olinde Rodrigues published how to compose two rotations about arbitrary axes; his four parameters combine exactly as unit quaternions multiply.

<small>O. Rodrigues, Journal de Mathématiques Pures et Appliquées 5 (1840), 380–440; S. L. Altmann, Mathematics Magazine 62 (1989), 291–308</small>

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Linear algebra for graphics**: points and vectors, polygons, lines, planes
- **The two products**: dot and cross, and the trig identities behind them
- **Closest points and distances**: point to point, to a line, to a segment, to a plane, in Unity and WebGL
- **Rotation**: 2D from the angle-sum identities, the axis rotations, Rodrigues derived step by step
- **Euler angles** and gimbal lock
- **Quaternions**: the rules and the operations
- **The scene graph**: hierarchical modeling, then the spiral pass, link by link

Reading: [Vectors](../../textbook/vectors.html) · [Rotation](../../textbook/rotation.html) · [Scene Graphs](../../textbook/scene-graphs.html) · cheat sheets: [linear algebra](../../reference/linear-algebra-cheat-sheet.html), [trigonometry](../../reference/trig-cheat-sheet.html)

