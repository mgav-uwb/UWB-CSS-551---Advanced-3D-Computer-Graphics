<!--
  CSS 551 · L07, Thursday October 22, 2026 (week 4, in person): Scene graphs.
  Mounted by index.html: L07-open.md, ../../topics/scene-graphs.md (~66 min, 48 slides), L07-discuss.md.
  55 slides after the 2026-10-08 cuts (exercise slides and discussion questions; re-sequenced 2026-10-06: kinematics and skinning moved to the animation topic,
  rigid bodies to the physics topic, both in L10).

  Plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Quiz 2, on paper (L05, L06, HW2)            20 min
    0:20  Opening                                      2 min
    0:22  Scene graphs and hierarchical modeling      66 min
    1:28  HW3 walk-through                            10 min
    1:38  Wrap                                         4 min
    1:42  HW3 setup help, both tracks; buffer         18 min

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
- **Covers**: Lecture 5, affine transformations (Thursday, October 15); Lecture 6, meshes and texture coordinates (Tuesday, October 20); HW2
- Mark one letter per question in the grid on the first page; only the grid is graded


---

## Tonight

- **Articulated things**: move the parent, the children follow
- **The composite transform**: `W_child = W_parent · L_child`, three levels in two orders, a joint at an end, live
- **Sung's SceneNode** and the matrix stack, with a mirrored sibling
- **Local and world**: the inverse, both tracks' parents, the hand from three frames, the camera as a node
- **Engineering the tree**: dirty flags, subtree bounds, reuse, and inherited shear
- the **HW3 walk-through**, then setup help

Reading: [Scene Graphs](../../textbook/scene-graphs.html), Sections 1 to 14.

