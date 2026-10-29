<!--
  CSS 551 · TOPIC DECK: The scene graph as matrices (~14 min, 12 slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/scene-graph-matrices.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES: Lecture 7's local operator t + R(s ⊙ p) as one matrix T·R·S, and world(p) = world_parent(local(p))
  as W_child = W_parent · L_child; the rule unrolled down a chain; Lecture 7's 2D arm as 3x3 products (hand
  (2, 2), bent (1, 1)); the HW3 arm's three locals as operators (Part A) and as matrices (Part B); W_hand at
  baseRy 30, armBend 40, and the same hand origin by operators; local to world and back, the rigid inverse; a
  world point carried into the hand's frame both ways (undo in reverse order); Sung's CompositeXform, the rule
  once per node; the view matrix as the camera node's inverse; who owns the matrix; inherited shear.
  NEEDS:   scene-graph-intro (Lecture 7: operators, local and world placement), affine-transforms (block product,
           rigid inverse, pivot sandwich, column reading).
  DEMOS:   none embedded; a link to the scene-graph demo (lib/demo.html?demo=scene-graph) in a new tab.
  NUMBERS: node, 2026-10-25, against homework/hw03/solution/hw03.js and lib/core/xform.js: W_hand, W_arm column 3,
           the operator steps (0, 0.7, 0), (−0.8999, 1.2725, 0), (−0.7793, 1.4725, 0.45); the undo steps (0, 0.8, 0),
           (0.3857, −0.2404, 0), (0.3857, −0.9404, 0); the 2D arm as 3x3 products; the camera node from
           numbers-pipeline.json sg.cameraNode, recomputed (camera at (−0.946, 1.702, 0.546), V sends it to 0).
  FIGURES: ../../textbook/figures/sg-shear.svg; sgd-arm-2d.svg (tools/gen-lecture-figures-scene-graph.mjs).
  SOURCE:  built 2026-10-25 for L08 from the matrix slides of scene-graphs.md (the composite rule, the rule down
           the arm, the demo's locals, local to world and back, the hand from three frames, CompositeXform, the
           camera node) restated against Lecture 7's operators and HW3's two parts; the two matrix pitfalls
           (who owns the matrix, inherited shear) moved here from scene-graph-concepts.md.
           Real C# excerpt from Kelvin Sung's CSS 451 ClassExamples, Topic5-SceneNode+HierarchicalModeling.

  EDITED 2026-10-29 (Marcel: MathJax formulas instead of ASCII, vector illustrations, the ASCII kept as alt text):
  every inline formula typeset; Lecture 7's 2D arm gains a figure, straight and bent, each node's frame drawn
  (sgd-arm-2d), beside its two bullets; a 3x3's translation column is "the last column", not "column 3".

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Display math is a raw <div class="tex"> block typeset by MathJax
  (lib/deck-math.js; TeX inside, ASCII as aria-label, no blank line inside); an inline
  formula is a code span written `$...$`, typeset in place; code identifiers stay plain
  code spans. Never two "_" on one markdown line outside a code fence or code span.
  Figures are SVG with the ASCII as alt text. Paths are relative to the
  lecture page that mounts this topic (lectures/LNN-slug/index.html).
-->

### The scene graph as matrices

<small>(~14 min) · reading: <a href="../../textbook/scene-graphs.html">Scene Graphs</a>, Sections 2 to 5 and 8</small>


---

## A node's local transform is one matrix

<div class="tex" role="img" aria-label="local(p) = t + R(s ⊙ p)                 is the matrix  L = T(t) · R · S = [ R S  t ; 0 1 ]
world(p) = world_parent(local(p))      is the product  W_child = W_parent · L_child">
\[
\begin{aligned}
\text{local}(p) &= t + R\,(s \odot p) &&\Longleftrightarrow\quad L = T(t)\,R\,S = \begin{bmatrix} R S & t \\ 0 & 1 \end{bmatrix} \\[4pt]
\text{world}(p) &= \text{world}_{\text{parent}}\big(\text{local}(p)\big) &&\Longleftrightarrow\quad W_{\text{child}} = W_{\text{parent}} \cdot L_{\text{child}}
\end{aligned}
\]
</div>

- read right to left: `$L_{\text{child}}$` acts **first**, placing a point in the **parent's** frame; `$W_{\text{parent}}$` carries it the rest of the way **to the world**
- the root's parent is the world, so the root's `$W$` is its own `$L$`


---

## The rule, down a chain

<div class="tex" role="img" aria-label="W_base = L_base                    (the root's parent is the world: identity)
W_arm  = W_base · L_arm            = L_base · L_arm
W_hand = W_arm  · L_hand           = L_base · L_arm · L_hand">
\[
\begin{aligned}
W_{\text{base}} &= L_{\text{base}} && \text{(the root's parent is the world: identity)} \\
W_{\text{arm}} &= W_{\text{base}} \cdot L_{\text{arm}} && = L_{\text{base}} \cdot L_{\text{arm}} \\
W_{\text{hand}} &= W_{\text{arm}} \cdot L_{\text{hand}} && = L_{\text{base}} \cdot L_{\text{arm}} \cdot L_{\text{hand}}
\end{aligned}
\]
</div>

Each world transform is the running product of every local transform **from the root to that node**: the root-most factor acts **last**. HW3's `worldMatrices` is these three lines.


---

## Worked: Lecture 7's 2D arm, as matrices

Base at `$(2, 0)$` turned `$90^\circ$`; arm at `$(1, 0)$` with elbow angle `$e$`; hand at `$(1, 0)$`. On `$(x, y, 1)$`:

<div class="tex" style="font-size:0.74em" role="img" aria-label="L_base = T(2, 0) · R(90°)     L_arm = T(1, 0) · R(e)     L_hand = T(1, 0)
e = 0:    W_hand = [ 0 −1 2 ; 1 0 2 ; 0 0 1 ]         hand origin (2, 2)
e = 90°:  W_hand = [ −1 0 1 ; 0 −1 1 ; 0 0 1 ]        hand origin (1, 1)">
\[
L_{\text{base}} = T(2, 0)\,R(90^\circ) \qquad L_{\text{arm}} = T(1, 0)\,R(e) \qquad L_{\text{hand}} = T(1, 0)
\]
\[
e = 0\text{: } W_{\text{hand}} = \begin{bmatrix} 0 & {-1} & 2 \\ 1 & 0 & 2 \\ 0 & 0 & 1 \end{bmatrix}
\qquad
e = 90^\circ\text{: } W_{\text{hand}} = \begin{bmatrix} {-1} & 0 & 1 \\ 0 & {-1} & 1 \\ 0 & 0 & 1 \end{bmatrix}
\]
</div>

<div style="display:flex; align-items:center; gap:18px; justify-content:center">
<ul style="flex:1; margin:0">
<li>the last column is the hand's origin: <strong>(2, 2)</strong>, and <strong>(1, 1)</strong> with the elbow bent: Lecture 7's answers</li>
<li>columns 0 and 1 are the hand's axes in the world: bent, its <code>$x$</code>-axis points along <code>$-x$</code> (<code>$90^\circ + 90^\circ$</code>)</li>
</ul>
<img src="../../textbook/figures/sgd-arm-2d.svg" alt="two panels of the 2D arm, each node's frame drawn (x-axis thick, y-axis thin): elbow e = 0, base (2, 0), arm (2, 1), hand (2, 2), every x-axis along +y; elbow e = 90°, base (2, 0), arm (2, 1), hand (1, 1), the hand's x-axis along −x" style="height:250px">
</div>


---

## The HW3 arm: three locals, two ways

| node | Part A: `toParent(p)`, an operator | Part B: `$L$`, a matrix |
| --- | --- | --- |
| base | `$(0, 0.2, 0) + R_y(\text{baseRy})\, p$` | `$T(0, 0.2, 0) \cdot R_y(\text{baseRy})$` |
| arm | `$\begin{array}{l} (0, 0.2 + \text{armT}, 0) \\ \quad {} + R_z(\text{armBend})\big(p + (0, 0.7, 0)\big) \end{array}$` | `$\begin{array}{l} T(0, 0.2 + \text{armT}, 0) \\ \quad {} \cdot R_z(\text{armBend}) \cdot T(0, 0.7, 0) \end{array}$` |
| hand | `$(0, 0.7, 0) + R_y(\text{handRy})\, p$` | `$T(0, 0.7, 0) \cdot R_y(\text{handRy})$` |

- the arm is a box centered on its origin with its **hinge at the lower end**: `$T(0, 0.7, 0)$` puts the lower end at the origin, `$R_z$` hinges there, `$T(0, 0.2 + \text{armT}, 0)$` sets the hinge on the base's top
- a rotation **between** two translations: Lecture 7's pivot, inside one local transform


---

## Worked: the hand at base 30°, bend 40°

<div class="tex" role="img" aria-label="W_hand = L_base · L_arm · L_hand = [  0.6634  −0.5567  0.5    −0.7793 ]
                                    [  0.6428   0.766   0       1.4725 ]
                                    [ −0.383    0.3214  0.866   0.45   ]
                                    [  0        0       0       1      ]">
\[
W_{\text{hand}} = L_{\text{base}}\,L_{\text{arm}}\,L_{\text{hand}} = \begin{bmatrix} 0.6634 & {-0.5567} & 0.5 & {-0.7793} \\ 0.6428 & 0.766 & 0 & 1.4725 \\ {-0.383} & 0.3214 & 0.866 & 0.45 \\ 0 & 0 & 0 & 1 \end{bmatrix}
\]
</div>

- column 3: the hand's origin in the world, **(−0.7793, 1.4725, 0.45)**; the arm's, column 3 of `$W_{\text{arm}}$`, is (−0.3897, 0.9362, 0.225)
- columns 0 to 2: the hand's axes in the world, unit length (no scale anywhere on the chain)

<a href="../../lib/demo.html?demo=scene-graph&amp;controls=baseRy,armBend" target="_blank" rel="noopener">Open base-arm-hand in a new tab ↗</a>


---

## The same hand by operators (Part A)

The hand's origin, `$0$` in its own frame, carried up the chain one node at a time:

<div class="tex" style="font-size:0.74em" role="img" aria-label="hand → arm:     (0, 0.7, 0) + R_y(0) · 0 = (0, 0.7, 0)
arm → base:     (0, 0.2, 0) + R_z(40°) ((0, 0.7, 0) + (0, 0.7, 0)) = (0, 0.2, 0) + (−0.8999, 1.0725, 0) = (−0.8999, 1.2725, 0)
base → world:   (0, 0.2, 0) + R_y(30°) (−0.8999, 1.2725, 0) = (−0.7793, 1.4725, 0.45)">
\[
\begin{aligned}
\text{hand} \to \text{arm:}&\quad (0, 0.7, 0) + R_y(0)\,0 = (0, 0.7, 0) \\
\text{arm} \to \text{base:}&\quad (0, 0.2, 0) + R_z(40^\circ)\big((0, 0.7, 0) + (0, 0.7, 0)\big) = ({-0.8999}, 1.2725, 0) \\
\text{base} \to \text{world:}&\quad (0, 0.2, 0) + R_y(30^\circ)\,({-0.8999}, 1.2725, 0) = ({-0.7793}, 1.4725, 0.45)
\end{aligned}
\]
</div>

- the same three numbers as column 3 of `$W_{\text{hand}}$`: HW3's A5 and B4 checks must agree
- an operator moves **one point**; the matrix carries every point of the hand, and its axes, at once


---

## Local to world, and back

<div class="tex" role="img" aria-label="p_world = W · p_local            placement: vertices, attachment points, a tip
p_local = W⁻¹ · p_world          inquiry: a mouse-ray hit, another object, a collision
W = [R | t] rigid:   W⁻¹ = [Rᵀ | −Rᵀ t]">
\[
\begin{aligned}
p_{\text{world}} &= W \cdot p_{\text{local}} && \text{placement: vertices, attachment points, a tip} \\
p_{\text{local}} &= W^{-1} \cdot p_{\text{world}} && \text{inquiry: a mouse-ray hit, another object, a collision}
\end{aligned}
\]
\[ W = [\,R \mid t\,] \text{ rigid: } W^{-1} = [\,R^T \mid {-R^T t}\,]\text{, a transpose and one product} \]
</div>

- every factor of the arm's chain is a rotation or a translation, so `$W_{\text{hand}}$` is **rigid** and its inverse is the affine topic's transpose formula: HW3's `rigidInverse`
- Unity `TransformPoint` / `InverseTransformPoint`, three.js `localToWorld` / `worldToLocal` are these two lines


---

## Worked: a world point in the hand's frame, two ways

World `$(0, 1, 0)$`, below and beside the hand:

<div class="tex" style="font-size:0.74em" role="img" aria-label="matrices:         W_hand⁻¹ (0, 1, 0) = (0.3857, −0.9404, 0)
undo the base:    R_y(−30°) ((0, 1, 0) − (0, 0.2, 0)) = (0, 0.8, 0)
undo the arm:     R_z(−40°) ((0, 0.8, 0) − (0, 0.2, 0)) − (0, 0.7, 0) = (0.3857, −0.2404, 0)
undo the hand:    R_y(0) ((0.3857, −0.2404, 0) − (0, 0.7, 0)) = (0.3857, −0.9404, 0)">
\[
\begin{aligned}
\text{matrices:}&\quad W_{\text{hand}}^{-1}\,(0, 1, 0) = (0.3857, {-0.9404}, 0) \\[4pt]
\text{undo the base:}&\quad R_y({-30^\circ})\big((0, 1, 0) - (0, 0.2, 0)\big) = (0, 0.8, 0) \\
\text{undo the arm:}&\quad R_z({-40^\circ})\big((0, 0.8, 0) - (0, 0.2, 0)\big) - (0, 0.7, 0) = (0.3857, {-0.2404}, 0) \\
\text{undo the hand:}&\quad R_y(0)\big((0.3857, {-0.2404}, 0) - (0, 0.7, 0)\big) = (0.3857, {-0.9404}, 0)
\end{aligned}
\]
</div>

- operators undo in **reverse order**: the root's placement first, the hand's own last (Lecture 7's socks and shoes)
- HW3's A6 (operators) and B6 (matrices) checks: the same point


---

## The recursion: one product per node

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

<small>Sung's SceneNode.cs (CSS 451, 5.1). The fourth line is the rule; the loop passes this node's world matrix down. The root call passes `Matrix4x4.identity`.</small>


---

## The view matrix: the camera node's inverse

Parent a camera to the hand, `$L_{\text{cam}} = T(0, 0.3, 0)$`:

<div class="tex" style="font-size:0.74em" role="img" aria-label="camera, world:  W_hand · (0, 0.3, 0) = (−0.946, 1.702, 0.546)
V = (W_hand · L_cam)⁻¹ = [  0.66   0.64  −0.38  −0.26 ]
                         [ −0.56   0.77   0.32  −2.01 ]
                         [  0.50   0.00   0.87   0.00 ]
                         [  0      0      0      1    ]">
\[
\begin{aligned}
&\text{camera, world: } W_{\text{hand}} \cdot (0, 0.3, 0) = ({-0.946}, 1.702, 0.546) \\[6pt]
&V = (W_{\text{hand}} \cdot L_{\text{cam}})^{-1} = \begin{bmatrix} 0.66 & 0.64 & {-0.38} & {-0.26} \\ {-0.56} & 0.77 & 0.32 & {-2.01} \\ 0.50 & 0.00 & 0.87 & 0.00 \\ 0 & 0 & 0 & 1 \end{bmatrix}
\end{aligned}
\]
</div>

The **view matrix** is the inverse of the camera node's world matrix: it sends the camera to the origin. Thursday's viewing lecture builds the same kind of matrix from eye, at and up.


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

- parent: scaled **by 2 along `$x$` only**; child: turned **`$45^\circ$`**
- the child's square comes out a **parallelogram**: its corners are no longer 90°
- no scale, rotation and translation of the child alone describes that shape, so an engine that reads a world pose back as TRS **loses it**
- rule: keep non-uniform scale on leaf nodes

