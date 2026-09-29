<!--
  CSS 551 · L07, Thursday October 22, 2026 (week 4, in person): Scene graphs.
  Mounted by index.html: L07-open.md, ../../topics/scene-graphs.md (~78 min), L07-discuss.md.

  Plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Opening                                       2 min
    0:02  Scene graphs and hierarchical modeling      78 min
    1:20  Discussion: two questions                   12 min
    1:32  HW3 walk-through and wrap                    8 min
    1:40  Quiz 3, on paper                            20 min

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math; never two "_" on one
  markdown line outside a code fence; no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 7: Scene Graphs and Hierarchical Modeling**

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Articulated things**: move the parent, the children follow
- **The composite transform**: `W_child = W_parent · L_child`, worked and live
- **Sung's SceneNode** and the matrix stack, with a mirrored sibling
- **Local and world**: the inverse, the hand from three frames, the camera as a node
- **Engineering the tree**: dirty flags, subtree bounds, reuse, and inherited shear
- **Discussion**, the **HW3 walk-through**, then **Quiz 3**

Reading: [Scene Graphs](../../textbook/scene-graphs.html) in the course text.

