<!--
  CSS 551 · Lecture 5 (Session 5) — Scene graphs & hierarchical modeling.
  reveal.js: FLAT deck — every slide is a top-level "---" section (no vertical
  "--" stacks). Keeps the verify-deck harness's demo probe correct (it selects
  "section.present [data-demo]", which inside a vertical stack matches a demo on
  a not-yet-shown sibling slide, 0x0 -> fill times out). Flat = one section per
  slide = demo only matched when shown. Notes follow "Note:".

  Real C# excerpts are from Kelvin Sung's CSS 451 ClassExamples,
  Topic5-SceneNode+HierarchicalModeling (5.1.SceneNode+PrimitiveList,
  5.2.SceneNodeControl, 5.3.PointOnHierarchy, 5.5.DecomposeTRS) — the CDP
  projects students walk in Parts 3-5 and rebuild in Thursday's studio.

  MATH IS PLAIN TEXT ON PURPOSE. This shell loads NO KaTeX plugin (only
  markdown/highlight/notes), so "$...$" would render literally. All formulas
  are unicode plain text or fenced ```text blocks, like S01-S04. Never two "_"
  on one markdown line OUTSIDE a code fence (they pair into <em> and shred the
  line): in prose AND speaker notes ALWAYS backtick names with underscores —
  write `L_base`, `W_child`, `R_y`, `p_world`, never bare L_base ... W_child.
  Matrices inside ```text fences are safe. No <small> on math. NO forward /
  "next time" references anywhere — not even a one-liner in the wrap.

  DEMO: scene-graph embedded ONCE in Part 2, controls "baseRy,armBend"
  (handRy and armT stay at their defaults 0 and 0). The panel shows the HAND's
  world matrix `W_hand`. The ASCII viz-fallback shows the HAND-VERIFIED default
  state (baseRy=30, armBend=40, handRy=0, armT=0), two decimals, matching the
  demo panel:
     W_hand = [  0.66  -0.56   0.50  -0.78 ]
              [  0.64   0.77   0.00   1.47 ]
              [ -0.38   0.32   0.87   0.45 ]
              [  0.00   0.00   0.00   1.00 ]
  Computed via node against lib/core/xform.js (makeTRS + matMul) through the
  exact chain in lib/demos/scene-graph.js (W_base=L_base; W_arm=W_base·L_arm;
  W_hand=W_arm·L_hand). The Part-2 simplified worked chain (L_base=R_y(90),
  L_arm=T(1,0,0) -> W_arm col3 = (0,0,-1)) is also node-verified.

  Session plan (120 min, Tue 5:45-7:45 PM synchronous online). Sums to ~110 + buffer.
    0:00  Intro (title + tonight)                       ~2 min
    0:02  Part 1  Articulated things                    15 min   (the arm problem; move the parent, children follow; where hierarchies show up)
    0:17  Part 2  The composite transform               30 min   (W_child = W_parent · L_child on the 3-node arm; worked 2-node chain; demo)
    0:47  Part 3  Sung's SceneNode                      25 min   (CompositeXform recursion; NodePrimitive; why not Unity parenting)
    1:12  Part 4  Local vs world                        20 min   (point through the chain; inverse pulls world back to local; reusing subtrees)
    1:32  Part 5  CDP walkthrough + MP4 tour            15 min   (5.1 / 5.2 projects; MP4 4-generation hierarchy — Canvas)
    1:47  Wrap                                           5 min   (Thu SceneNode studio + MP4 lab; MP3 + MP3a due; MP4 out)
    1:52  end (+ buffer)
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 5 — Scene Graphs & Hierarchical Modeling**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>

---

## Tonight

- An **articulated thing** is a tree of parts — move a parent, its children come along
- Each node owns a **local transform**; its **world transform** is the product up the chain
- The rule is one line: `W_child` = `W_parent` · `L_child`
- Sung's **SceneNode** does exactly this with a **recursion** — real code, on the slide
- A point moves **local → world** by the composite; **world → local** by its inverse

---

### Part 1 · Articulated things

<small>(~15 min)</small>

---

## The problem: a robot arm

Picture a simple arm: a **base** bolted to the floor, an **arm** hinged on the base, a **hand** on the arm's tip.

```text
        [ hand ]      <- rides the arm's tip
           |
        [ arm ]       <- hinges on the base
           |
        [ base ]      <- yaws on the floor
```

Three rigid parts, three joints. The catch: they are **not independent**. Swing the base and the arm and hand must swing with it — they are **attached**.

---

## Move the parent, children follow

Place each part with its **own** world transform. Now yaw the base 30°:

- **Nothing** happens to the arm — its world transform never mentioned the base
- the base rotates; arm and hand **stay put**; the linkage **breaks apart**

**Fix:** place each part **relative to its parent**; the parent's motion **propagates down**.

---

## Where this shows up

The base-arm-hand tree is everywhere something is **built from jointed parts**:

- **Robots & mechanisms** — arms, grippers, backhoes, landing gear
- **Characters** — a skeleton is a tree of bones; the hand bone rides the forearm rides the upper arm
- **Solar systems** — moon orbits planet orbits star; each frame nested in the last
- **Vehicles** — turret on hull, wheels on axles, rotor on mast

---

## The plan: local transforms, composed up the tree

Give every node **one local transform** — where it sits **in its parent's space** — and derive its **world transform** by walking the path from the root.

```text
   base:  L_base            world = L_base
    |
   arm:   L_arm             world = L_base · L_arm
    |
   hand:  L_hand            world = L_base · L_arm · L_hand
```

Author each part **once**, in its parent's frame. Composition does the rest.

---

### Part 2 · The composite transform

<small>(~30 min)</small>

---

## Local space, per node

Each node's local transform is written **in its parent's frame**:

- `L_base` — the base in **world** space (the root's parent)
- `L_arm` — the arm in the **base's** space (on top, bent at the joint)
- `L_hand` — the hand in the **arm's** space (at the tip, twisting)

Mesh vertices stay in their part's **own** local space.

---

## The composite rule

A child's world transform is its **parent's world transform** times its **own local transform**:

```text
   W_child = W_parent · L_child
```

Read it right-to-left (S04's rule): `L_child` acts **first** — it places a point in the **parent's** frame — then `W_parent` carries that point the rest of the way **to world**.

---

## The rule, down the whole arm

Apply `W_child = W_parent · L_child` from the root down:

```text
   W_base = L_base                    (root: parent is the world, W = identity)
   W_arm  = W_base · L_arm            = L_base · L_arm
   W_hand = W_arm  · L_hand           = L_base · L_arm · L_hand
```

Each world transform is the running product of every local transform **from the root to that node**. The hand carries the base's yaw **and** the arm's bend, for free.

---

## Worked chain: two nodes, tiny numbers

Take a base that **yaws 90°** and an arm that sits **one unit out the base's x-axis**:

```text
   L_base = R_y(90)          L_arm = T(1, 0, 0)
```

The base has no children-carrying translation, just the turn; the arm's local transform is a pure offset in the base's frame. Compute `W_arm = W_base · L_arm = R_y(90) · T(1,0,0)` — next slide.

---

## Worked chain: multiply it out

`R_y(90)` has translation zero; `T(1,0,0)` has rotation identity. Their product `W_arm`:

```text
              [ 0   0   1   0 ]      rotation block = R_y(90)
   W_arm  =   [ 0   1   0   0 ]      translation column 3 = R_y(90)·(1,0,0)
              [-1   0   0  -1 ]                            = (0, 0, -1)
              [ 0   0   0   1 ]
```

The arm's origin, at `(1,0,0)` in the **base's** frame, lands at **`(0,0,-1)` in world** — the base's 90° turn **swung the child around**. Move the parent, the child followed.

---

## The real arm's local transforms

The demo's three nodes, built from `makeTRS` and `matMul` (all in `lib/core/xform.js`):

```text
   L_base = makeTRS(0, 0.2, 0,   0, baseRy, 0,   1,1,1)   yaw on the floor
   L_arm  = T_joint · T_lift · R_bend · T_pivot           hinge at the joint
   L_hand = makeTRS(0, 0.7, 0,   0, handRy, 0,   1,1,1)   twist at the tip
```

`L_base` and `L_hand` are single `makeTRS` calls — each part turns about its **own** center. `L_arm` needs four factors, because its hinge is at an **end**, not the center.

---

## Why the arm needs a pivot

To bend the arm **about the joint** (its lower end), not its center, sandwich the hinge between two translations — the pivot idiom from S04:

```text
   L_arm = T_joint · T_lift · R_bend · T_pivot
```

Read right-to-left: `T_pivot` shifts the centered arm box so its **lower end** sits at the origin; `R_bend` hinges about that origin; `T_lift` and `T_joint` carry the bent arm up to the **base's top surface**.

---

## Meet the demo

One **model** — `{baseRy, armBend, handRy, armT}` — builds all three world matrices through the chain, then places three flat boxes with them:

- drag **`baseRy`**: the whole arm yaws — base, arm, and hand together
- drag **`armBend`**: the arm hinges at the **joint**; the hand rides the tip
- the panel prints the **hand's** world matrix `W_hand` — the full chain's leaf

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

### Part 3 · Sung's SceneNode

<small>(~25 min)</small>

---

## A SceneNode is a node in the tree

Sung's `SceneNode` holds exactly what a tree node needs — its **children** and its **geometry**:

```csharp [1-8]
public class SceneNode : MonoBehaviour {
    protected Matrix4x4 mCombinedParentXform;   // this node's WORLD matrix

    public Vector3 NodeOrigin = Vector3.zero;   // node's pivot offset
    public List<NodePrimitive> PrimitiveList;   // geometry hanging on this node
    public List<SceneNode> ChildrenList;        // child nodes
}
```

<small>SceneNode.cs — 5.1.SceneNode+PrimitiveList. A node = a local frame + a list of primitives + a list of children.</small>

---

## CompositeXform: the recursion

One method computes every node's world matrix — by **recursion down the tree**:

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

<small>SceneNode.cs — 5.1. The highlighted line is our rule; the loop passes this node's world matrix down.</small>

---

## Reading the recursion

Follow one call down the arm:

```text
   root call:   base.CompositeXform(identity)
                  W_base = identity · L_base
                  -> arm.CompositeXform(W_base)
                       W_arm = W_base · L_arm
                       -> hand.CompositeXform(W_arm)
                            W_hand = W_arm · L_hand
```

Each level multiplies **one** local matrix onto the accumulated parent product and passes it down. The call stack **is** the path from the root to the node.

---

## Geometry hangs on the node

A `NodePrimitive` is a drawable shape carried at a node's frame; it applies its **own** pivot sandwich, then uploads the matrix to the shader:

```csharp [1-6]
public void LoadShaderMatrix(ref Matrix4x4 nodeMatrix) {
    Matrix4x4 p    = Matrix4x4.TRS(Pivot, Quaternion.identity, Vector3.one);
    Matrix4x4 invp = Matrix4x4.TRS(-Pivot, Quaternion.identity, Vector3.one);
    Matrix4x4 trs  = Matrix4x4.TRS(transform.localPosition, transform.localRotation, transform.localScale);
    Matrix4x4 m    = nodeMatrix * p * trs * invp;      // node world · pivot sandwich
    GetComponent<Renderer>().material.SetMatrix("MyXformMat", m);
}
```

<small>NodePrimitive.cs — 5.1. `nodeMatrix` is the node's world matrix; `p · trs · invp` is the primitive's own pivoted placement.</small>

---

## Why not Unity's transform parenting?

Unity's `Transform` already does parent-child composition. We **implement it ourselves** anyway:

- the course is about **building** the machinery, not calling it — Code, Demo, **Practice**
- `SceneNode` composes by explicit `Matrix4x4` products — parenting **visible in code**, not hidden
- same choice as our demo: boxes flat, `matrixAutoUpdate` **off**, matrices by hand

---

### Part 4 · Local vs world

<small>(~20 min)</small>

---

## A point on the hierarchy → world

A vertex authored in a node's **local** frame reaches **world** by the node's composite matrix. Sung's `PointOnHierarchy` reads a fixed local point and multiplies it through:

```csharp [1-4]
// mCombinedParentXform is this node's WORLD matrix (from CompositeXform)
AxisFrame.localPosition = mCombinedParentXform.MultiplyPoint(kDefaultTreeTip);
Vector3 up      = mCombinedParentXform.GetColumn(1).normalized;   // world up   axis
Vector3 forward = mCombinedParentXform.GetColumn(2).normalized;   // world fwd  axis
```

<small>SceneNode.cs — 5.3.PointOnHierarchy. `MultiplyPoint` sends a local point to world; columns 1-2 read the node's world axes.</small>

---

## Worked: the hand's tip in world

Reuse the simplified two-node chain (base yaws 90°, arm out `(1,0,0)`), and ask where the **arm's tip** at local `(1,0,0)` lands:

```text
   W_arm = R_y(90) · T(1,0,0)          (from Part 2)
   tip_world = W_arm · (1, 0, 0, 1) = (0, 0, -2)
```

The tip is one unit past the arm's origin; the arm's origin is already at world `(0,0,-1)`, so the tip sits at `(0,0,-2)` — both swung onto the world **−z** axis by the base's turn.

---

## World → local: use the inverse

Sometimes you have a **world** point — a mouse-ray hit, another object's position — and need it in a node's **own** frame (to test "is this inside me?", or to attach something). Invert the composite:

```text
   p_local = W⁻¹ · p_world
```

`W` is a TRS chain, so `invertTRS` (S04) gives its inverse directly — no general 4×4 inversion needed. `W · W⁻¹ = I`, so the round trip returns the point unchanged.

---

## Worked: pull a world point home

Invert the simplified `W_arm` and bring the arm's world origin `(0,0,-1)` back to local:

```text
              [ 0   0  -1  -1 ]
   W_arm⁻¹ =  [ 0   1   0   0 ]        W_arm⁻¹ · (0, 0, -1, 1) = (0, 0, 0)
              [ 1   0   0   0 ]
              [ 0   0   0   1 ]
```

The arm's origin, at world `(0,0,-1)`, maps back to local `(0,0,0)` — exactly where it started. Inverse undoes the chain.

---

## Reusing subtrees

One **geometry**, placed many times — each instance differs **only by its matrices**:

- one arm mesh, **both** shoulders — mirrored `L_arm`
- one wheel mesh, four corners — four translations
- one finger rig **five** times — five local frames

Author the mesh **once**; the tree places the copies.

---

## Local vs world, in Unity

Sung's `DecomposeTRS` composes a parent and child **by hand**, then **decomposes** the product back into world position, scale, and rotation:

```csharp [1-7]
Matrix4x4 parentTRS  = Matrix4x4.TRS(parentXform.localPosition, parentXform.localRotation, parentXform.localScale);
Matrix4x4 myTRS      = Matrix4x4.TRS(transform.localPosition, transform.localRotation, transform.localScale);
Matrix4x4 concatMatrix = parentTRS * myTRS;             // W_child = W_parent · L_child

WorldTransform.localPosition = concatMatrix.GetColumn(3);   // world position = column 3
Vector3 x = concatMatrix.GetColumn(0);                      // world x axis (length = world scale x)
Vector3 y = concatMatrix.GetColumn(1);
Vector3 z = concatMatrix.GetColumn(2);
```

<small>DecomposeTRS.cs (AnalyzeXform) — 5.5. `parentTRS * myTRS` is our composite; the columns read world position and scaled axes.</small>

---

### Part 5 · This in Sung's CDPs

<small>(~15 min)</small>

---

## Code, Demo, Practice

**CDP** — read real code, watch it run, rebuild it Thursday. Tonight's scene-node projects:

- **5.1.SceneNode+PrimitiveList** — the `SceneNode` class, `CompositeXform`, primitives on nodes
- **5.2.SceneNodeControl** — a live hierarchy: select a node, move it, watch the subtree follow

Both build the base-arm-hand tree, on Canvas; Thursday's studio pokes them live.

---

## SceneNodeControl: driving the tree

`5.2.SceneNodeControl` lets you **select a node** and edit its **local** transform as the tree recomposes:

- pick the **base** and yaw it — arm and hand **sweep along**
- pick the **arm** and bend it — the hand rides the tip, the base **stays put**
- each drag rewrites one local transform; `CompositeXform` re-runs top-down

---

## MP4: the hierarchy machine

**MP4** is a **four-generation hierarchy** built on the `SceneNode` you just read — one level deeper than tonight's arm.

- **four levels** of parent-child composition, not three
- each generation adds its local, exactly `W_child = W_parent · L_child`, one more level down

Details, requirements, and grading are **on Canvas** — the single source of truth.

---

## Scene graphs, one idea

- An **articulated thing** is a tree; each node owns a **local transform**
- A child's world transform is `W_child` = `W_parent` · `L_child` — the product up the tree
- `CompositeXform` **recursion** computes every node's world matrix top-down
- **Local → world** is the composite; **world → local** is its inverse (`invertTRS`)
- Shared geometry + per-node matrices = **reuse**: one mesh, many placements

---

## The plan for Thursday

The SceneNode studio — walk and poke the real hierarchy projects:

- **5.1.SceneNode+PrimitiveList** — trace `CompositeXform`; add a node; predict the composite
- **5.2.SceneNodeControl** — re-pivot a joint; move a parent and confirm the subtree follows

Plus **MP4 lab time** — start the four-generation hierarchy with the instructor circulating.

---

## Wrap

- **Thursday studio** — SceneNode CDP: **5.1.SceneNode+PrimitiveList**, **5.2.SceneNodeControl**, plus **MP4 lab time**
- **MP3 + MP3a due**; **MP4 goes out** — the four-generation hierarchy. *Details on Canvas.*

A scene graph is a tree of local transforms. A child's world matrix is its parent's, times its own — composed all the way down.

