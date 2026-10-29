<!--
  CSS 551 · TOPIC DECK: Scene graphs in practice (~16 min, 9 slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/scene-graph-concepts.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES (concepts, no matrix arithmetic): where scene graphs show up and their history; joint
  nodes and mesh nodes; the camera as a node and the view as the inverse of its placement;
  reparenting that keeps the world pose or the local values; drawing the frames to debug; reuse
  (one mesh, many placements); a conversion node at the root on import; who owns a node's
  matrix in three.js and Unity; why a child cannot store inherited shear; where the tree sits in
  the frame loop; dirty flags; bounding volumes up the tree; the transform tree against the culling
  tree; transparency against tree order. The spiral-pass demo is the running example, opened in a
  new tab at the matching step (lib/demo.html?demo=football&controls=step:N).
  BUILT 2026-10-22 for L07 from the concept slides of scene-graphs.md (Marcel: "make it more about
  concepts, less about numbers"; "use the spiral demo more for examples"; "instead of embedded
  instances, add links that open the demo in a new tab"). scene-graphs.md is unchanged and is the
  matrix version, for after the affine topic.
  SPLIT 2026-10-25 for L08 (Tuesday October 27; L07 did not reach this topic): the core stays here (where
  this shows up, joint and mesh nodes, the camera as a node, reparenting, reuse, the tree in the frame, dirty
  flags, bounding volumes); the two matrix pitfalls (who owns the matrix, inherited shear) moved to
  scene-graph-matrices.md, after the affine topic; sixty years of trees, drawing the frames, importing, the
  transform tree against the culling tree and transparency order moved to scene-graph-concepts-supplement.md.
  NEEDS:   scene-graph-intro (local and world placement, the spiral pass as nested frames).
  DEMOS:   none embedded; links to the football demo at steps 8, 9, 11, 12.
  FIGURES: ../../textbook/figures/sg-tree.svg, sg-instances.svg, sg-bounds.svg; sgd-joint-mesh.svg, sgd-frame-loop.svg
           (tools/gen-lecture-figures-scene-graph.mjs).
  EDITED 2026-10-29 (Marcel: MathJax formulas instead of ASCII, vector illustrations, the ASCII kept as alt text):
  the joint-and-mesh chain and the frame-loop flow are generated SVG figures (the joint figure adds the two cases,
  the rotation on the mesh node against the rotation on a joint, one 40-degree turn each); inline formulas typeset.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes follow "Note:". Inline formulas are
  code spans written `$...$` (lib/deck-math.js typesets them); code identifiers stay plain code spans. Never two
  "_" on one markdown line outside a code fence or code span. Diagrams are SVG figures with the ASCII as alt
  text. Paths are relative to the lecture page that mounts this topic.
-->

### Scene graphs in practice

<small>(~16 min)</small>


---

## Where this shows up

<img src="../../textbook/figures/sg-tree.svg" alt="a scene tree: world, base, arm, hand, with a camera and a light as nodes" style="height:230px">

- **mechanisms**: arms, grippers, backhoes, turrets on hulls, wheels on axles
- **characters**: a skeleton is a tree of bones; the hand rides the forearm rides the upper arm
- **solar systems**: moon orbits planet orbits star
- **every scene file**: glTF, USD and FBX store a node tree with a local transform per node


---

## Joint nodes and mesh nodes

<img src="../../textbook/figures/sgd-joint-mesh.svg" alt="base ── joint (rotates) ── arm (offset 0.7, draws the box) ── hand (offset 0.7, draws the box). Below, one 40° turn two ways: rotation on the mesh node turns the box about its center and its lower end leaves the hinge; rotation on the joint, with the mesh offset 0.7 on a child, turns it about the hinge and its lower end stays on the base" style="height:330px">

- put the **rotation** on a node whose origin is at the hinge
- put the **geometry** on a child that shifts the mesh so the hinge is at its end
- then animators key one rotation per joint and never touch a pivot


---

## The camera is a node

- a camera is placed like any other node: on a tripod in the field, on a robot's wrist, or riding a frame of the ball
- it sees the world from **its own frame**, so drawing needs the **inverse** of its world placement: the **view** transform
- move its parent and the camera follows: a chase camera, a camera on a helmet

<a href="../../lib/demo.html?demo=football&amp;controls=step:11" target="_blank" rel="noopener">Spiral pass, step 11: place a camera ↗</a>

<a href="../../lib/demo.html?demo=football&amp;controls=step:12" target="_blank" rel="noopener">step 12: the view is the inverse of the camera ↗</a>


---

## Pitfall: reparenting keeps world or local?

| call | keeps | the child |
| --- | --- | --- |
| Unity `SetParent(p)` (default `worldPositionStays = true`) | **world** pose | stays where it is on screen; its local values are recomputed |
| Unity `SetParent(p, false)` | **local** values | jumps into the new parent's frame |
| three.js `p.add(child)` | **local** values | jumps |
| three.js `p.attach(child)` | **world** pose | stays |

Keeping the world pose means computing a **new local placement** from the two world placements; that fails when a parent above has non-uniform scale (the shear pitfall below).

<a href="../../lib/demo.html?demo=football&amp;controls=step:8" target="_blank" rel="noopener">Spiral pass, step 8: the catch, a change of parent ↗</a>


---

## Reuse: one mesh, many placements

<img src="../../textbook/figures/sg-instances.svg" alt="one wheel mesh placed four times by four local transforms" style="height:220px">

- one arm mesh, **both** shoulders: a mirrored `$L_{\text{arm}}$`
- one wheel mesh, four corners: four translations
- one finger rig, **five** times: five local frames

Author the mesh **once**; the tree places the copies.

<a href="../../lib/demo.html?demo=football&amp;controls=step:9" target="_blank" rel="noopener">Spiral pass, step 9: three balls, three chains ↗</a>


---

## Where the tree sits in the frame

<div><img src="../../textbook/figures/sgd-frame-loop.svg" alt="input  →  update locals (gameplay, animation, constraints)
       →  propagate world matrices (dirty nodes only)
       →  cull (bounds, frustum)  →  sort (transparent back to front)  →  draw
input and update write local transforms; cull, sort and draw read world matrices; then the next frame" style="height:172px"></div>

Everything that **writes** a local runs before propagation; everything that **reads** a world matrix runs after.


---

## Dirty flags: recompute only what moved

An edit to one node invalidates **its subtree's** world matrices and nothing else.

| edited node, 59-bone skeleton | matrices recomputed |
| --- | --- |
| the root (the character moves) | 59 |
| the first spine bone | 46 |
| the left upper arm | 19 |
| the left hand | 16 |
| a fingertip | 1 |

The demo: hand yaw recomputes 1, the bend 2, the base yaw 3.


---

## Bounding volumes up the tree

<img src="../../textbook/figures/sg-bounds.svg" alt="world boxes for base, arm and hand, and the subtree boxes that contain them" style="height:230px">

Each node stores a box around **its whole subtree**. Culling tests the tree top down:

- a subtree's box **outside** the view: skip the whole subtree, **one test**
- **inside**: draw all of it, no more tests
- **straddling** the edge: open it and test its children

