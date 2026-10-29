<!--
  CSS 551 · L07 HW3 note and wrap (~4 min).
  EDITED 2026-10-25: HW3 was rebuilt (Part A, operators on points, this lecture; Part B, the same arm as
  matrices, L08), out Tuesday October 27, due Wednesday November 4; its walk-through is in L08. The old HW3
  table and rules slides are replaced by one slide.
  CUT 2026-10-08: the three multiple-choice discussion questions (where is the child,
  inherited shear, into the hand's frame); the freed time goes to setup help.
-->

### HW3, and the wrap

<small>(~4 min)</small>


---

## HW3: scene graphs, by operators and by matrices

Out **Tuesday, October 27**, due **Wednesday, November 4, 11:59 PM**; Unity or WebGL. [HW3 page](../../homework/hw03/index.html)

- **Part A**, tonight's operators: rotate a point, turn it about a pivot, move a point from a node's frame to its parent's and back, walk the arm's chain to the world and down again
- **Part B**, Lecture 8: the same arm as `4 × 4` matrices
- the two parts must agree: the hand's origin by operators is column 3 of the hand's world matrix


---

## Wrap

A scene graph is a tree of nodes, each placing its children in its own frame: a node's world placement is its parent's, after its own local one. Move a parent and its whole subtree follows; reparenting keeps either the world pose or the local values; a camera is one more node, and the view undoes its placement.

- **Read:** [Scene Graphs](../../textbook/scene-graphs.html), Sections 1 to 14
- **Due:** HW2, Wednesday October 28, 11:59 PM; HW3 (out Tuesday) Wednesday November 4

