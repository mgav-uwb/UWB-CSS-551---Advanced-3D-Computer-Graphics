<!--
  CSS 551 · TOPIC DECK: Scene graphs and hierarchical modeling (~66 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/scene-graphs.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES: an articulated thing is a tree of local transforms; W_child = W_parent · L_child, worked on a
  two-node chain and on the demo's base-arm-hand; a joint as a pivot sandwich inside the local transform;
  Sung's SceneNode and its CompositeXform recursion; the matrix stack traced on a tree with a mirrored
  sibling; local to world and back with the inverse, the hand from three frames; the camera as a node
  (V as the inverse of its world matrix); dirty flags, bounding volumes up the tree, reuse of one mesh;
  the inherited-shear pitfall; the Unity Transform worked; three levels in two orders; a joint
  at an end worked; the subtree claim checked on the demo (dirty flags on the demo).
  CUT 2026-10-08: the arithmetic "Predict, then check" slide and the "Check yourself" questions;
  "Check: yaw the base to 90°" renamed "Dirty flags on the demo"; the two tracks' parent APIs in
  Unity/WebGL code tabs.
  MOVED 2026-10-06 (re-sequence): kinematics, inverse kinematics and skinning to topics/animation.md;
  the rigid-bodies section to topics/physics-simulation.md; the recap slide removed.
  NEEDS:   the affine topic (block product, rigid inverse, pivot sandwich, column reading).
  DEMOS:   data-demo="scene-graph" data-controls="baseRy,armBend" (handRy and armT stay at 0).
           Fallback W_hand at baseRy = 30, armBend = 40: rows (0.66,-0.56,0.50,-0.78), (0.64,0.77,0,1.47),
           (-0.38,0.32,0.87,0.45), (0,0,0,1); computed through the chain in lib/demos/scene-graph.js.
  NUMBERS: textbook/figures/numbers-pipeline.json, key sg (Warm, demo, bends, yaws, stack, dirty, frames,
           cameraNode, bounds, shear); the two-node chain recomputed by node against lib/core/xform.js.
  FIGURES: ../../textbook/figures/sg-*.svg (tools/gen-textbook-figures-pipeline.mjs).
  SOURCE:  converted 2026-09-29 (Plan C) from sessions/S05-scene-graphs/L05-scene-graphs.md (Plan B's
           lecture 5): logistics, CDP tour and machine-problem slides removed; the stack trace, dirty
           flags, frames, camera node, bounds and shear sections added from the textbook chapter.
           Real C# excerpts are from Kelvin Sung's CSS 451 ClassExamples, Topic5-SceneNode+HierarchicalModeling
           (5.1.SceneNode+PrimitiveList, 5.3.PointOnHierarchy).
  DENSIFIED 2026-09-29 (Plan C; 55+ slides per Thursday): sixty years of trees, the arm-poses figure and a predict slide, the arm as glTF nodes and joint versus mesh nodes, both tracks' parent APIs and debugging, the reparenting pitfall, aim constraints, the two-array tree, the frame order, the culling-tree distinction and the bounding sphere, transparency order, matrix ownership, import conventions, FK and two-link IK worked, linear blend skinning worked and the candy wrapper, a check-yourself slide. Numbers from numbers-pipeline.json (sg) and numbers-motion.json (anim) or node.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores (`W_child`, `L_arm`). No <small> on math.
  Paths are relative to the lecture page that mounts this topic.
-->

### Scene graphs and hierarchical modeling

<small>(~66 min)</small>


---

### Articulated things

<small>(~10 min)</small>

---

## The problem: a robot arm

A **base** bolted to the floor, an **arm** hinged on the base, a **hand** on the arm's tip.

```text
        [ hand ]      <- rides the arm's tip
           |
        [ arm ]       <- hinges on the base
           |
        [ base ]      <- yaws on the floor
```

Three rigid parts, three joints, and they are **not independent**: swing the base and the arm and hand must swing with it.


---

## Move the parent, children follow

Place each part with its **own** world transform. Now yaw the base 30°:

- **nothing** happens to the arm: its world transform never mentioned the base
- the base rotates; arm and hand **stay put**; the linkage **breaks apart**

**Fix:** place each part **relative to its parent**; the parent's motion **propagates down**.


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

## The plan: local transforms, composed up the tree

Give every node **one local transform**, where it sits **in its parent's space**, and derive its **world transform** by walking the path from the root:

```text
   base:  L_base            world = L_base
    |
   arm:   L_arm             world = L_base · L_arm
    |
   hand:  L_hand            world = L_base · L_arm · L_hand
```

Author each part **once**, in its parent's frame. Composition does the rest.


---

### The composite transform

<small>(~22 min)</small>

---

## The composite rule

A child's world transform is its **parent's world transform** times its **own local transform**:

```text
   W_child = W_parent · L_child
```

Read right to left: `L_child` acts **first**, placing a point in the **parent's** frame; then `W_parent` carries it the rest of the way **to world**.


---

## The rule, down the whole arm

```text
   W_base = L_base                    (the root's parent is the world: identity)
   W_arm  = W_base · L_arm            = L_base · L_arm
   W_hand = W_arm  · L_hand           = L_base · L_arm · L_hand
```

Each world transform is the running product of every local transform **from the root to that node**. The hand carries the base's yaw **and** the arm's bend, for free.


---

## Worked: two nodes, tiny numbers

<img src="../../textbook/figures/sg-chain-2d.svg" alt="a base turned 90 degrees swings its child from (1,0,0) to (0,0,-1)" style="height:210px">

`L_base = R_y(90°)`, `L_arm = T(1, 0, 0)`:

```text
                              [ 0   0   1   0 ]      linear part: R_y(90)
   W_arm = R_y(90) · T(1,0,0) = [ 0   1   0   0 ]      column 3: R_y(90) (1,0,0) = (0, 0, -1)
                              [-1   0   0  -1 ]
                              [ 0   0   0   1 ]
```

The arm's origin, at `(1,0,0)` in the **base's** frame, lands at **`(0,0,-1)` in world**.


---

## Worked: three levels, two orders

`L_base = T(0, 1, 0)`, `L_arm = R_z(90°)`, `L_hand = T(2, 0, 0)`. The hand's origin, applied right to left:

```text
   W_hand · 0 = T(0,1,0) · R_z(90) · T(2,0,0) · 0
      (0,0,0) → T(2,0,0) → (2,0,0) → R_z(90) → (0,2,0) → T(0,1,0) → (0, 3, 0)

   swap the base and arm locals:  R_z(90) · T(0,1,0) · T(2,0,0) · 0
      (2,0,0) → (2,1,0) → R_z(90) → (−1, 2, 0)
```

- the root-most factor acts **last**: a rotation above a translation swings it


---

## The demo's arm: three locals

```text
   L_base = makeTRS(0, 0.2, 0,   0, baseRy, 0,   1,1,1)   yaw on the floor
   L_arm  = T_joint · T_lift · R_bend · T_pivot           hinge at the joint
   L_hand = makeTRS(0, 0.7, 0,   0, handRy, 0,   1,1,1)   twist at the tip
```

- `L_base`, `L_hand`: one TRS each; each part turns about its **own** center
- `L_arm`: the hinge is at the arm's **lower end**, so the rotation sits **between** translations: `T_pivot = T(0, 0.7, 0)` puts the end at the origin, `R_bend` hinges there, `T_joint = T(0, 0.2, 0)` sets it on the base's top


---

## The same arm as glTF nodes

```json
{ "nodes": [
  { "name": "base",  "translation": [0, 0.2, 0], "rotation": [0, 0.2588, 0, 0.9659], "children": [1] },
  { "name": "joint", "translation": [0, 0.2, 0], "rotation": [0, 0, 0.342, 0.9397],  "children": [2] },
  { "name": "arm",   "translation": [0, 0.7, 0], "mesh": 0, "children": [3] },
  { "name": "hand",  "translation": [0, 0.7, 0], "mesh": 1 } ] }
```

- rotations are **quaternions** `(x, y, z, w)`: 30° about y, 40° about z
- the **joint** is its own node: it rotates; the **arm** node below it only offsets the mesh, so the bend happens at the joint


---

## Joint nodes and mesh nodes

```text
   base  ── joint (rotates) ── arm (offset 0.7, draws the box) ── hand (offset 0.7, draws the box)
```

- put the **rotation** on a node whose origin is at the hinge
- put the **geometry** on a child that shifts the mesh so the hinge is at its end
- then animators key one rotation per joint and never touch a pivot


---

## Worked: a joint at an end

A box spans `y ∈ [−1, 1]` about its origin. Hinge it by **30°** about its **lower end** and place that end at `(0, 3, 0)`:

```text
   L = T(0, 3, 0) · R_z(30°) · T(0, 1, 0)       lift the lower end to the origin, hinge, carry

   translation column = (0, 3, 0) + R_z(30°)(0, 1, 0) = (−0.5, 3.866, 0)
   lower end (0, −1, 0)  →  (0, 3, 0)            stays on the joint
   upper end (0,  1, 0)  →  (−1, 4.732, 0)       swings by 30°
```


---

## Base-arm-hand, live

<div class="cockpit" data-demo="scene-graph" data-controls="baseRy,armBend"><pre class="viz-fallback">  model {baseRy, armBend} -> W_base, W_arm, W_hand through the chain
  -- default: baseRy = 30 deg, armBend = 40 deg (handRy = 0, armT = 0) --------
     panel shows the HAND's world matrix W_hand = W_arm · L_hand:
        [  0.66  -0.56   0.50  -0.78 ]
        [  0.64   0.77   0.00   1.47 ]
        [ -0.38   0.32   0.87   0.45 ]
        [  0.00   0.00   0.00   1.00 ]
     column 3 (-0.78, 1.47, 0.45) is the hand's WORLD position</pre></div>


---

## Worked: the hand across poses

| baseRy | armBend | hand, world |
| --- | --- | --- |
| 0 | 0 | (0, 1.80, 0) |
| 0 | 40 | (−0.90, 1.47, 0) |
| 30 | 40 | (−0.78, 1.47, 0.45), the demo's default |
| 90 | 40 | (0, 1.47, 0.90) |
| 0 | 80 | (−1.38, 0.64, 0) |

- the **bend** moves the hand in the base's own plane: `-1.4 sin(bend)`, `0.4 + 1.4 cos(bend)`
- the **yaw** swings that point about the vertical: same height 1.47, radius 0.90


---

## The arm across poses, pictured

<img src="../../textbook/figures/sg-arm-poses.svg" alt="the base, arm and hand drawn at several bend angles, the hand tracing an arc about the joint" style="height:300px">

The hand traces a **circle of radius 1.4 about the joint** as the bend changes; the base yaw swings that circle about the vertical.


---

### Sung's SceneNode, and the matrix stack

<small>(~16 min)</small>

---

## A SceneNode is a node in the tree

```csharp [1-6]
public class SceneNode : MonoBehaviour {
    protected Matrix4x4 mCombinedParentXform;   // this node's WORLD matrix
    public Vector3 NodeOrigin = Vector3.zero;   // node's pivot offset
    public List<NodePrimitive> PrimitiveList;   // geometry hanging on this node
    public List<SceneNode> ChildrenList;        // child nodes
}
```

<small>SceneNode.cs, 5.1.SceneNode+PrimitiveList. A node = a local frame, a list of primitives, a list of children.</small>


---

## CompositeXform: the recursion

```csharp [1-11]
public void CompositeXform(ref Matrix4x4 parentXform) {
    Matrix4x4 orgT = Matrix4x4.Translate(NodeOrigin);
    Matrix4x4 trs  = Matrix4x4.TRS(transform.localPosition, transform.localRotation, transform.localScale);
    mCombinedParentXform = parentXform * orgT * trs;   // W = W_parent · L

    foreach (SceneNode child in ChildrenList)          // recurse into children
        child.CompositeXform(ref mCombinedParentXform);

    foreach (NodePrimitive p in PrimitiveList)         // draw this node's shapes
        p.LoadShaderMatrix(ref mCombinedParentXform);
}
```

<small>SceneNode.cs, 5.1. The fourth line is the rule; the loop passes this node's world matrix down.</small>


---

## Reading the recursion

<img src="../../textbook/figures/sg-recursion.svg" alt="the recursion's call stack, one frame per edge of the root-to-node path" style="height:200px">

```text
   base.CompositeXform(identity)      W_base = identity · L_base
     arm.CompositeXform(W_base)       W_arm  = W_base · L_arm
       hand.CompositeXform(W_arm)     W_hand = W_arm · L_hand
```

The call stack **is** the path from the root to the node.


---

## The matrix stack, with a mirrored sibling

Add a second arm, `L_arm2 = S(-1, 1, 1) · L_arm`, with its own hand. Default pose:

| step | depth | top's origin, world |
| --- | --- | --- |
| push base | 1 | (0, 0.2, 0) |
| push arm | 2 | (−0.39, 0.94, 0.22) |
| push hand; draw; pop | 3, then 2 | (−0.78, 1.47, 0.45) |
| draw arm; pop | 1 | |
| push arm2 | 2 | (0.39, 0.94, −0.22) |
| push hand2; draw; pop | 3, then 2 | (0.78, 1.47, −0.45) |
| draw arm2; pop; draw base; pop | 1, then 0 | |

Five pushes, five products, depth three. `det W_arm2 = -1`: its triangles' winding flips.


---

## Geometry hangs on the node

```csharp [1-6]
public void LoadShaderMatrix(ref Matrix4x4 nodeMatrix) {
    Matrix4x4 p    = Matrix4x4.TRS(Pivot, Quaternion.identity, Vector3.one);
    Matrix4x4 invp = Matrix4x4.TRS(-Pivot, Quaternion.identity, Vector3.one);
    Matrix4x4 trs  = Matrix4x4.TRS(transform.localPosition, transform.localRotation, transform.localScale);
    Matrix4x4 m    = nodeMatrix * p * trs * invp;      // node world · pivot sandwich
    GetComponent<Renderer>().material.SetMatrix("MyXformMat", m);
}
```

<small>NodePrimitive.cs, 5.1. `p · trs · invp` is the primitive's own pivoted placement inside the node's frame.</small>


---

### Local and world

<small>(~16 min)</small>

---

## Local to world, and back

```text
   p_world = W · p_local            placement: vertices, attachment points, a tip
   p_local = W⁻¹ · p_world          inquiry: a mouse-ray hit, another object, a collision
```

Two-node chain: the arm's tip at local `(1, 0, 0)`:

```text
   W_arm · (1, 0, 0, 1) = (0, 0, -2)                 one unit past the arm's origin (0,0,-1)
   W_arm⁻¹ = [R_y(90)ᵀ | -R_y(90)ᵀ (0,0,-1)]         the rigid inverse, translation (-1, 0, 0)
   W_arm⁻¹ · (0, 0, -1, 1) = (0, 0, 0)               the arm's world origin comes home
```


---

## Real code: a point on the hierarchy

```csharp [1-4]
// mCombinedParentXform is this node's WORLD matrix (from CompositeXform)
AxisFrame.localPosition = mCombinedParentXform.MultiplyPoint(kDefaultTreeTip);
Vector3 up      = mCombinedParentXform.GetColumn(1).normalized;   // world up axis
Vector3 forward = mCombinedParentXform.GetColumn(2).normalized;   // world forward axis
```

<small>SceneNode.cs, 5.3.PointOnHierarchy. `MultiplyPoint` sends a local point to world; columns 1 and 2 are the node's world axes.</small>


---

## Parents and children in both tracks

<div class="code-tabs">

```csharp
hand.transform.SetParent(arm.transform, false);   // keep the LOCAL values
Vector3 w = hand.transform.position;               // world
Vector3 l = hand.transform.localPosition;          // in the parent's frame
Vector3 q = hand.transform.TransformPoint(0, 0.3f, 0);          // local → world
Vector3 r = arm.transform.InverseTransformPoint(Vector3.up);    // world → local
```

```javascript
arm.add(hand);                                  // keep the LOCAL values
hand.updateMatrixWorld();
const w = hand.getWorldPosition(new THREE.Vector3());
const q = hand.localToWorld(new THREE.Vector3(0, 0.3, 0));
const r = arm.worldToLocal(new THREE.Vector3(0, 1, 0));
```

</div>


---

## The Transform: local and world, worked

<img src="../../textbook/figures/unity-hierarchy.svg" alt="A parent at (2,0,0) turned 90 degrees about y; its child at local (1,0,0) lands at world (2,0,-1), and a grandchild at local (0,1,0) lands at (2,1,-1)" style="max-height: 280px; width: auto;">

Parent at (2, 0, 0), turned 90° about y. Child at local (1, 0, 0): world = (2, 0, 0) + Ry(90°)·(1, 0, 0) = **(2, 0, −1)**. Grandchild at local (0, 1, 0): **(2, 1, −1)**.


---

## Debugging a hierarchy: draw the frames

- draw each node's **axes** at its world origin: three.js `new THREE.AxesHelper(0.3)` added to the node; Unity `Debug.DrawRay(t.position, t.right)` (and `up`, `forward`)
- print a node's **world columns**: they are its axes and origin (the affine topic's frame reading)
- a wrong frame is visible at once: an axis pointing the wrong way, an origin in the wrong place, axes of the wrong length (hidden scale)


---

## Pitfall: reparenting keeps world or local?

| call | keeps | the child |
| --- | --- | --- |
| Unity `SetParent(p)` (default `worldPositionStays = true`) | **world** pose | stays where it is on screen; its local values are recomputed |
| Unity `SetParent(p, false)` | **local** values | jumps into the new parent's frame |
| three.js `p.add(child)` | **local** values | jumps |
| three.js `p.attach(child)` | **world** pose | stays |

Keeping the world pose means computing `L = W_newParent⁻¹ · W_child`, which **fails under shear** (the previous pitfall).


---

## Worked: the hand, seen from three frames

At the demo's default pose, the hand's origin:

| frame | the hand's origin | why |
| --- | --- | --- |
| world | (−0.779, 1.472, 0.450) | column 3 of `W_hand` |
| the base's | (−0.900, 1.272, 0) | yaw undone: `-1.4 sin 40°`, `0.2 + 1.4 cos 40°` |
| the arm's | (0, 0.7, 0) | exactly `L_hand`'s translation |

And the world point `(0, 1, 0)` in the hand's frame: `W_hand⁻¹ (0, 1, 0) = (0.386, -0.940, 0)`.


---

## The camera is a node

Parent a camera to the hand, `L_cam = T(0, 0.3, 0)`:

```text
   camera, world:  W_hand · (0, 0.3, 0) = (-0.946, 1.702, 0.546)

   V = (W_hand · L_cam)⁻¹ = [  0.66   0.64  -0.38  -0.26 ]
                            [ -0.56   0.77   0.32  -2.01 ]
                            [  0.50   0.00   0.87   0.00 ]
                            [  0      0      0      1    ]
```

The **view matrix** is the inverse of the camera node's world matrix; its rows are `W_hand`'s rotation columns.


---

## Aim constraints: a look-at inside the tree

A spotlight on the hand must point at a target `g` in the world. The look-at gives a **world** rotation; the node stores a **local** one:

```text
   R_world = lookAt(eye = hand light position, at = g)          (the viewing lecture's basis)
   R_local = R_parentWorld⁻¹ · R_world = R_parentWorld^T · R_world
```

Every "follow", "aim", and "look at" constraint in an animation system is this line, run after the parent's world matrix is known.


---

### Engineering the tree

<small>(~12 min)</small>

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

## Dirty flags on the demo

At yaw 30°, bend 40°, the hand is at **(−0.779, 1.472, 0.450)**; in the base's frame it is **(−0.900, 1.272, 0)**, and the base sits at **(0, 0.2, 0)**.

```text
   yaw 90°:  (0, 0.2, 0) + R_y(90°) · (−0.900, 1.272, 0) = (0, 1.472, 0.900)
   then change only the hand's yaw:  the hand's position does not move
```

- the base yaw recomputed **3** world matrices; the hand yaw recomputes **1**, and only an orientation changes


---

## Where the tree sits in the frame

```text
   input  →  update locals (gameplay, animation, constraints)
          →  propagate world matrices (dirty nodes only)
          →  cull (bounds, frustum)  →  sort (transparent back to front)  →  draw
```

Everything that **writes** a local runs before propagation; everything that **reads** a world matrix runs after.


---

## The tree as two arrays

Store nodes **parent before child**; then one forward loop updates every world matrix:

```text
   parent = [ −1,  0,  1 ]          base, arm, hand
   for i in 0 … n−1:
       W[i] = (parent[i] < 0) ? L[i] : W[parent[i]] · L[i]
```

- no recursion, no pointers: cache-friendly, and trivially one product per node
- animation runtimes and GPU skinning store skeletons this way


---

## Bounding volumes up the tree

<img src="../../textbook/figures/sg-bounds.svg" alt="world boxes for base, arm and hand, and the subtree boxes that contain them" style="height:230px">

Each node stores a box around **its whole subtree**. Culling tests the tree top down:

- plane `x = 1` (keep `x < 1`): the root box is inside: **one test** accepts all three parts
- plane `x = -0.6` (keep `x < -0.6`): root straddles; base rejected; arm subtree straddles; arm and hand tested: **five tests**


---

## Worked: a sphere is cheaper and looser

The whole arm's bounding **sphere**: center `(−0.312, 0.853, 0.143)`, radius `1.318`. Test against the plane `x = 1` (keep `x < 1`):

```text
   signed distance of the center:  −0.312 − 1 = −1.312
   inside if distance < −r:        −1.312 < −1.318 ?   no, by 0.006: the sphere STRADDLES
   the box test said: max x = 0.478 < 1: inside, accept all
```

One subtraction instead of six box corners, at the price of false "maybe"s that send the test down the tree.


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


---

## Pitfall: who owns the matrix?

| engine | edit through | if you set the matrix directly |
| --- | --- | --- |
| three.js | `position`, `quaternion`, `scale` | set `matrixAutoUpdate = false`, or the next render **overwrites** it from TRS |
| Unity | `localPosition`, `localRotation`, `localScale` | no setter: decompose into TRS (shear is lost) |

The demo builds its matrices with our own `makeTRS` and turns three.js's update **off**, so the library, not three.js, owns them.


---

## Importing: a conversion node at the root

| system | up | handedness | units |
| --- | --- | --- | --- |
| glTF 2.0 | +Y | right-handed | meters |
| three.js | +Y | right-handed | (scene units) |
| Unity | +Y | **left-handed** | meters |

Going from glTF to Unity flips one axis (`det = −1`): importers insert that mirror at the root, or convert every node, so that windings stay right.


---

## Reuse: one mesh, many placements

<img src="../../textbook/figures/sg-instances.svg" alt="one wheel mesh placed four times by four local transforms" style="height:220px">

- one arm mesh, **both** shoulders: a mirrored `L_arm`
- one wheel mesh, four corners: four translations
- one finger rig, **five** times: five local frames

Author the mesh **once**; the tree places the copies.


---

## Pitfall: a child cannot store inherited shear

<img src="../../textbook/figures/sg-shear.svg" alt="a rotated child under a non-uniformly scaled parent becomes a parallelogram" style="height:210px">

Parent `S(2, 1, 1)`, child `R_z(45°)`. The child's world columns:

```text
   (1.414, 0.707, 0) and (-1.414, 0.707, 0):  lengths 1.581, 1.581;  126.9° apart, not 90°
   read back as TRS:  rotation 26.6° (not 45°), scale (1.581, 1.581):  rebuilt entry error 0.707
```

