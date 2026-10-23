<!--
  CSS 551 · TOPIC DECK: Scene graphs in practice (~30 min, 16 slides).
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
  NEEDS:   scene-graph-intro (local and world placement, the spiral pass as nested frames).
  DEMOS:   none embedded; links to the football demo at steps 8, 9, 10, 11, 12.
  FIGURES: ../../textbook/figures/sg-tree.svg, sg-instances.svg, sg-shear.svg, sg-bounds.svg.
-->

### Scene graphs in practice

<small>(~30 min)</small>


---

## Where this shows up

<img src="../../textbook/figures/sg-tree.svg" alt="a scene tree: world, base, arm, hand, with a camera and a light as nodes" style="height:230px">

- **mechanisms**: arms, grippers, backhoes, turrets on hulls, wheels on axles
- **characters**: a skeleton is a tree of bones; the hand rides the forearm rides the upper arm
- **solar systems**: moon orbits planet orbits star
- **every scene file**: glTF, USD and FBX store a node tree with a local transform per node


---

## Sixty years of trees

| year | system | the tree |
| --- | --- | --- |
| 1963 | Sketchpad (Sutherland) | master drawings and instances: edit the master, every copy changes |
| 1992 | OpenGL 1.0 | `glPushMatrix` / `glPopMatrix`: the tree walked as a matrix stack (removed from core in OpenGL 3.1, 2009) |
| 1994 | VRML 1.0 | the first web 3D format, built on SGI's Open Inventor scene-graph files |
| 2016 | USD (Pixar, open-sourced) | film's scene description: layered trees of prims |
| 2017 | glTF 2.0 (Khronos) | the web and engine interchange format: nodes with TRS or a matrix |


---

## Joint nodes and mesh nodes

```text
   base  ── joint (rotates) ── arm (offset 0.7, draws the box) ── hand (offset 0.7, draws the box)
```

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

## Debugging a hierarchy: draw the frames

- draw each node's **axes** at its world origin: three.js `new THREE.AxesHelper(0.3)` added to the node; Unity `Debug.DrawRay(t.position, t.right)` (and `up`, `forward`)
- a wrong frame is visible at once: an axis pointing the wrong way, an origin in the wrong place, axes of the wrong length (hidden scale)


---

## Reuse: one mesh, many placements

<img src="../../textbook/figures/sg-instances.svg" alt="one wheel mesh placed four times by four local transforms" style="height:220px">

- one arm mesh, **both** shoulders: a mirrored `L_arm`
- one wheel mesh, four corners: four translations
- one finger rig, **five** times: five local frames

Author the mesh **once**; the tree places the copies.

<a href="../../lib/demo.html?demo=football&amp;controls=step:9" target="_blank" rel="noopener">Spiral pass, step 9: three balls, three chains ↗</a>


---

## Importing: a conversion node at the root

| system | up | handedness | units |
| --- | --- | --- | --- |
| glTF 2.0 | +Y | right-handed | meters |
| three.js | +Y | right-handed | (scene units) |
| Unity | +Y | **left-handed** | meters |

Going from glTF to Unity flips one axis (a mirror): importers insert that mirror at the root, or convert every node, so that windings stay right.

<a href="../../lib/demo.html?demo=football&amp;controls=step:10" target="_blank" rel="noopener">Spiral pass, step 10: place the field in the world ↗</a>


---

## Pitfall: who owns the matrix?

| engine | edit through | if you set the matrix directly |
| --- | --- | --- |
| three.js | `position`, `quaternion`, `scale` | set `matrixAutoUpdate = false`, or the next render **overwrites** it from TRS |
| Unity | `localPosition`, `localRotation`, `localScale` | no setter: decompose into TRS (shear is lost) |

The demo builds its matrices with our own `makeTRS` and turns three.js's update **off**, so the library, not three.js, owns them.


---

## Pitfall: a child cannot store inherited shear

<img src="../../textbook/figures/sg-shear.svg" alt="a rotated child under a non-uniformly scaled parent becomes a parallelogram" style="height:210px">

- parent: scaled **2× along x only**; child: turned **45°**
- the child's square comes out a **parallelogram**: its corners are no longer 90°
- no scale, rotation and translation of the child alone describes that shape, so an engine that reads a world pose back as TRS **loses it**
- rule: keep non-uniform scale on leaf nodes


---

## Where the tree sits in the frame

```text
   input  →  update locals (gameplay, animation, constraints)
          →  propagate world matrices (dirty nodes only)
          →  cull (bounds, frustum)  →  sort (transparent back to front)  →  draw
```

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


---

## The transform tree is not the culling tree

- the **scene graph** groups by *what moves with what* (arm under base)
- a **bounding volume hierarchy** groups by *what is near what* (the ray-tracing lecture's BVH)
- a character's hand and a lamp on a far table can be siblings in the scene graph and far apart in space

Engines keep **both**: the hierarchy for transforms, a spatial structure (BVH, octree, grid) rebuilt or refit from the world boxes for culling and picking.


---

## Pitfall: transparency ignores the tree order

A depth-first traversal draws in **tree order**. Opaque surfaces do not care, because the depth buffer sorts them. Transparent surfaces blend with what is **already drawn**, so they must be drawn **back to front** by distance from the camera, regardless of where they sit in the tree.

Renderers therefore traverse to collect `(world matrix, mesh, material)`, then **sort** the transparent list by view depth before drawing.

