<!--
  CSS 551 · L07, Thursday October 22, 2026 (week 4, in person): Scene graphs.
  Mounted by index.html: L07-open.md, ../../topics/scene-graphs.md (~66 min, 50 slides), L07-discuss.md.
  60 slides (re-sequenced 2026-10-06: kinematics and skinning moved to the animation topic,
  rigid bodies to the physics topic, both in L10).

  Plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Quiz 2, on paper (L05, L06, HW2)            20 min
    0:20  Opening                                      2 min
    0:22  Scene graphs and hierarchical modeling      66 min
    1:28  Discussion: three questions                 18 min
    1:46  HW3 walk-through                            10 min
    1:56  Wrap                                         4 min

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math; never two "_" on one
  markdown line outside a code fence; no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 7: Scene Graphs and Hierarchical Modeling**

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
- **Discussion**, then the **HW3 walk-through**

Reading: [Scene Graphs](../../textbook/scene-graphs.html) in the course text.

