<!--
  CSS 551 · L07, Thursday October 22, 2026 (week 4, in person): Scene graphs.
  EDITED 2026-10-25 (re-plan): L07 as given covered Quiz 2 and scene-graph-intro; scene-graph-concepts was not
  reached and moved to L08 (Tuesday October 27), with affine. HW3 was rebuilt (scene graphs by operators, Part A,
  this lecture; by matrices, Part B, L08) and goes out Tuesday October 27, due Wednesday November 4. The page now
  mounts L07-open.md, ../../topics/scene-graph-intro.md and L07-discuss.md.
  Mounted as built on 2026-10-22: L07-open.md, ../../topics/scene-graph-intro.md (~28 min), ../../topics/scene-graph-concepts.md
  (~30 min, 16 slides), L07-discuss.md. Re-composed 2026-10-22: L06 did not reach the scene graph and the affine
  lecture was not given, so L07 teaches the scene graph by concepts with the spiral pass as the running example
  (demo links open in a new tab); scene-graphs.md, the 4x4 matrix version, waits for the affine topic.
  55 slides after the 2026-10-08 cuts (exercise slides and discussion questions; re-sequenced 2026-10-06: kinematics and skinning moved to the animation topic,
  rigid bodies to the physics topic, both in L10).

  Plan as given (120 min, Thu 5:45-7:45 PM in person):
    0:00  Quiz 2, on paper (vectors, rotation)        20 min (students needed about twice that)
    0:20  Opening                                      2 min
    0:22  The scene graph: operators on points, the tree,
          local and world, the spiral pass (intro)     to the end of class
  (Planned and moved to L08: scene graphs in practice, the HW3 walk-through.)

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math; never two "_" on one
  markdown line outside a code fence; no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 7: Scene Graphs and Hierarchical Modeling**

> VRML 1.0 (1994), the first 3D format for the web, was based on the file format of SGI's Open Inventor scene-graph library.

<small>VRML 1.0 specification (Bell, Parisi and Pesce), 1995</small>

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Quiz 2

**Laptops and phones away.** A pencil and the quiz sheet, nothing else.

- **20 minutes**, 5:45 to 6:05 PM: 8 multiple-choice questions, 5 points each
- **Covers**: vectors (dot and cross products, distances) and rotation through Rodrigues' formula, from Thursday, October 15, and Tuesday, October 20; HW2 is on Quiz 3
- **Formula sheet**: the last page, to tear off: dot and cross products, the axis rotations, Rodrigues, the quaternion rules (q v q*), and a sin and cos table
- Mark one letter per question in the grid on the first page; only the grid is graded


---

## Tonight

- **Operators on points**: translate, rotate, scale; order matters; undo in reverse; rotate about a pivot
- **The scene graph**: a tree of nodes, a local placement per node, the world placement up the tree, base-arm-hand live
- **A spiral pass, frame by frame**: spin, wobble, aim, flight, and the catch as a change of parent

Reading: [Scene Graphs](../../textbook/scene-graphs.html), Sections 1 to 5.

