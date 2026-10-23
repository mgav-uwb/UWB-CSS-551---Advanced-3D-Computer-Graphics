<!--
  CSS 551 · TOPIC DECK: The scene graph and hierarchical modeling, an introduction (~28 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/scene-graph-intro.md"> among others; it carries no
  logistics (no title, homework, wrap) and no "Part N" numbering.
  Lectures compose topics in their index.html; see lectures/README.md and topics/README.md.

  TEACHES (before homogeneous coordinates: every transform is an operator on points, composed right
  to left; no 4x4 matrices on the slides): translate, scale and rotate as operators with their inverses
  (Sung's summary); two operators in a row and why the order matters (Sung's (3, 8) example); undo in
  reverse order; rotation about a pivot, p' = pt + R(p − pt); the articulated-object problem (move the
  parent, the children follow) and two CSS 451 final projects; the scene graph as a tree of nodes; a
  node's local transform as scale, rotate, translate, local(p) = t + R(s ⊙ p); a node's world placement
  as its parent's world placement after its own local one; a 2D base-arm-hand worked by hand; a joint as
  a pivot (a box hinged at its end); parents, local and world, and the point conversions in both tracks
  (code tabs); reparenting that keeps the world pose or the local values; the scene-graph demo; then the
  spiral pass of the football demo read as nested frames: spin about the ball's own axis, the wobble as a
  rotation about a circling axis, the aim as an angle read from the velocity, the flight as a translation,
  the throw, field and camera as parents, the catch as a change of parent, and Euler angles typed against
  the quaternion stored.
  NEEDS:   the two L06 recap topics (linear-algebra-recap: vectors, dot, atan2; rotation-recap: 2D
           rotation, R_x, R_y, R_z, Rodrigues, Euler angles, quaternions). Homogeneous coordinates and
           affine maps come after this topic: the scene-graph topic (scene-graphs.md) and the affine topic
           write the same chains as products of 4x4 matrices.
  DEMOS:   data-demo="scene-graph" data-controls="baseRy,armBend" (demo-full; embed and fallback copied
           from scene-graphs.md); data-demo="football" data-controls="step:1" (demo-full; embed and
           fallback copied from affine-transforms.md). Football steps referenced: 2 spin, 3 wobble, 4 aim,
           5 flight, 6 throw set-up, 8 the catch, 10 field in the world, 11 camera, 14 what is stored
           (the Stored tab, the straight up preset).
  NUMBERS: computed by node (scratch check of 2026-10-20): Sung's order example (8, −1) and (6, 1.5),
           the undo back to (3, 8); the pivot (6, 3) about (8, 3) by 90° to (8, 1), about the origin to
           (−3, 6); TRS of (1, 1) with s = (2, 1), 90°, t = (3, 0) to (2, 2); the 2D arm (arm (2, 1), hand
           (2, 2), bent (1, 1)); the joint at an end (−0.5, 3.866, 0), (0, 3, 0), (−1, 4.732, 0) as in
           scene-graphs.md; the code tabs checked with lib/vendor/three.module.js (hand (1, 1, 0), tip
           (0.5, 1, 0), tip in the arm's frame (1.5, 0, 0)); the wobble sandwich equal to the rotation about
           (cos ψ, sin ψ, 0) to 1e-16; football: apex 6.17 m at 1.12 s, catch 2.30 s (2.305), aim −31.4°,
           23 turns, 60° per frame at 600 rpm and 60 frames per second.
  FIGURES: ../../textbook/figures/sg-tree.svg; ../../topics/media/css451/sung-ch09-s16.webp
           (cropped to the figure from Sung's CSS 451 chapter 9 slide 16);
           ../../topics/media/css451/2017-2-images-screenshot_edit_mode_rotating_hood.jpg and
           2019-3.Team8-screenShot-Shot2.jpg (CSS 451 final projects, from old/CSS-451/html-recovered).
  READING: ../../textbook/scene-graphs.html.
  SOURCE:  written 2026-10-20 for the L06 recap lecture, from scene-graphs.md (problem, tree, joint at an
           end, both tracks' parent APIs, reparenting, the demo) and affine-transforms.md (the spiral pass),
           restated without 4x4 matrices; operators, order, inverse and pivot from K. Sung's CSS 451 slides,
           chapters 8 and 9 (Sung, Shirley, Baer, Essentials of Interactive Computer Graphics).

  SIMPLIFIED 2026-10-20 (Marcel: first linear algebra for most of the room): cut the joint-node slide and the
  reparenting table (the catch slide keeps reparenting). 20 slides, ~25 min.
  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Paths are relative to the
  lecture page that mounts this topic (lectures/LNN-slug/index.html).
  2026-10-22: display formulas typeset with MathJax (lib/deck-math.js); the ASCII form kept as each block's aria-label.
-->

### The scene graph and hierarchical modeling

<small>(~25 min) · reading: <a href="../../textbook/scene-graphs.html">Scene Graphs</a></small>


---

## Three operators on a point

| operator | moves `(x, y)` to | undo | does nothing | keeps the shape |
| --- | --- | --- | --- | --- |
| translate `T(tx, ty)` | `(x + tx, y + ty)` | `T(−tx, −ty)` | `T(0, 0)` | yes |
| scale `S(sx, sy)` | `(sx·x, sy·y)` | `S(1/sx, 1/sy)` | `S(1, 1)` | no |
| rotate `R(θ)` | `(x cos θ − y sin θ, x sin θ + y cos θ)` | `R(−θ)` | `R(0)` | yes |

An operator is written **to the left** of the point it acts on: `T V` is "translate `V`".

<span class="credit">After K. Sung, CSS 451 slides, ch. 8 (Sung, Shirley, Baer, Essentials of Interactive Computer Graphics)</span>


---

## Two operators in a row: the order matters

`V = (3, 8)`, translate `T(−1, −5)`, scale `S(3, 0.5)`:

<div class="tex" style="font-size:0.75em" role="img" aria-label="   T(−1,−5) S(3, 0.5) V :   (3, 8)  ─S→  (9, 4)    ─T→  (8, −1)      scale first, then translate
   S(3, 0.5) T(−1,−5) V :   (3, 8)  ─T→  (2, 3)    ─S→  (6, 1.5)     translate first, then scale">
\[
\begin{aligned}
T(-1, -5)\, S(3, 0.5)\, V:&\quad (3, 8) \xrightarrow{\;S\;} (9, 4) \xrightarrow{\;T\;} (8, {-1}) && \text{scale first, then translate} \\
S(3, 0.5)\, T(-1, -5)\, V:&\quad (3, 8) \xrightarrow{\;T\;} (2, 3) \xrightarrow{\;S\;} (6, 1.5) && \text{translate first, then scale}
\end{aligned}
\]
</div>

- read right to left: the operator **next to the point** acts **first**
- same two operators, different order, different point: `T S ≠ S T`

<span class="credit">K. Sung, CSS 451 slides, ch. 9 (Sung, Shirley, Baer, Essentials of Interactive Computer Graphics)</span>


---

## Undo: the inverses, in reverse order

To undo "translate, then scale", undo the **scale first**, then the translation:

<div class="tex" role="img" aria-label="   (S T)⁻¹ = T⁻¹ S⁻¹
   (6, 1.5)  ─S(1/3, 2)→  (2, 3)  ─T(1, 5)→  (3, 8)          back where it started">
\[ (S\,T)^{-1} = T^{-1}\, S^{-1} \]
\[ (6, 1.5) \xrightarrow{\;S(1/3,\ 2)\;} (2, 3) \xrightarrow{\;T(1,\ 5)\;} (3, 8) \qquad \text{back where it started} \]
</div>

Shoes go on after socks and come off before them.

<span class="credit">K. Sung, CSS 451 slides, ch. 9</span>


---

## Rotate about a pivot

`R(θ)` turns about the **origin**. To turn about a point `pt`, move `pt` to the origin, turn, move back:

<div class="tex" style="font-size:0.7em" role="img" aria-label="   R_pt(θ) = T(pt) R(θ) T(−pt)          p' = pt + R(θ)(p − pt)
   p = (6, 3), pt = (8, 3), θ = 90°:   (6, 3) ─T(−pt)→ (−2, 0) ─R(90°)→ (0, −2) ─T(pt)→ (8, 1)
   about the origin instead:           R(90°)(6, 3) = (−3, 6), the object flies off">
\[ R_{p_t}(\theta) = T(p_t)\, R(\theta)\, T(-p_t) \qquad p' = p_t + R(\theta)\,(p - p_t) \]
\[
\begin{aligned}
p = (6, 3),\ p_t = (8, 3),\ \theta = 90^\circ:&\quad (6, 3) \xrightarrow{\;T(-p_t)\;} ({-2}, 0) \xrightarrow{\;R(90^\circ)\;} (0, {-2}) \xrightarrow{\;T(p_t)\;} (8, 1) \\
\text{about the origin instead:}&\quad R(90^\circ)\,(6, 3) = ({-3}, 6),\ \text{the object flies off}
\end{aligned}
\]
</div>

<img src="../../topics/media/css451/sung-ch09-s16.webp" alt="Sung's figure: a rectangle moved by T(−8,−3) so its corner pr is at the origin, rotated 45 degrees, and moved back by T(8,3), so it turns about its corner" style="height:220px">

<span class="credit">K. Sung, CSS 451 slides, ch. 9 (Sung, Shirley, Baer, Essentials of Interactive Computer Graphics)</span>


---

## The problem: parts attached to parts

```text
        [ hand ]      rides the arm's tip
           |
        [ arm ]       hinges on the base
           |
        [ base ]      turns on the floor
```

- place each part by its **own** world numbers, then turn the base 30°: the arm and hand **stay put**, the linkage breaks
- **fix:** place each part **relative to its parent**; the parent's motion **carries** its children


---

## Built by CSS 451 students

<div style="display:flex; gap:18px; justify-content:center; align-items:flex-start;">
<figure style="margin:0; width:48%;"><img src="../../topics/media/css451/2017-2-images-screenshot_edit_mode_rotating_hood.jpg" alt="Motus Unitatis: a desk lamp whose hood is being rotated about its joint with a three-disk rotation handle" style="width:100%;"><figcaption style="font-size:0.5em;">the lamp's hood turns about its joint, not about the origin<br><span class="credit">CSS 451 final project, Fall 2017 (Motus Unitatis, an animation editor)</span></figcaption></figure>
<figure style="margin:0; width:48%;"><img src="../../topics/media/css451/2019-3.Team8-screenShot-Shot2.jpg" alt="Dynamic Trees: a tree built from a hierarchy of branch nodes, with a rotation handle on one joint" style="width:100%;"><figcaption style="font-size:0.5em;">every branch is a node; move one and its sub-branches follow<br><span class="credit">CSS 451 final project, Fall 2019 (Dynamic Trees)</span></figcaption></figure>
</div>


---

## A scene graph is a tree of nodes

<img src="../../textbook/figures/sg-tree.svg" alt="a scene tree: world, base, arm, hand, with a camera and a light as nodes" style="height:230px">

- a **node** holds a **local transform** (where it sits **in its parent's frame**), a list of **children**, and maybe geometry
- the root's parent is the **world**
- cameras and lights are nodes too: they ride whatever they are attached to


---

## A node's local transform: scale, rotate, translate

Each node stores three things, applied **scale first, then rotate, then translate**:

<div class="tex" role="img" aria-label="   local(p) = t + R(s ⊙ p)                s ⊙ p: each coordinate times its own scale
   s = (2, 1), R = 90°, t = (3, 0),  p = (1, 1):
      s ⊙ p = (2, 1)  ─R(90°)→  (−1, 2)  ─+t→  (2, 2)">
\[ \text{local}(p) = t + R(s \odot p) \qquad s \odot p:\ \text{each coordinate times its own scale} \]
\[
\begin{aligned}
&s = (2, 1),\ R = 90^\circ,\ t = (3, 0),\ p = (1, 1): \\
&\qquad s \odot p = (2, 1) \xrightarrow{\;R(90^\circ)\;} ({-1}, 2) \xrightarrow{\;+t\;} (2, 2)
\end{aligned}
\]
</div>

| | Unity `Transform` | three.js `Object3D` |
| --- | --- | --- |
| translate `t` | `localPosition` (3 floats) | `position` (3) |
| rotate `R` | `localRotation`, a quaternion (4) | `quaternion` (4) |
| scale `s` | `localScale` (3) | `scale` (3) |


---

## A node's world placement: its parent's, after its own

A point of a node reaches the world through **every ancestor**, nearest first:

<div class="tex" role="img" aria-label="   world(p) = world_parent( local(p) )
   base  → world:   local_base(p)
   arm   → world:   local_base( local_arm(p) )
   hand  → world:   local_base( local_arm( local_hand(p) ) )">
\[ \text{world}(p) = \text{world}_{\text{parent}}\big(\text{local}(p)\big) \]
\[
\begin{aligned}
\text{base} \to \text{world}:&\quad \text{local}_{\text{base}}(p) \\
\text{arm} \to \text{world}:&\quad \text{local}_{\text{base}}\big(\text{local}_{\text{arm}}(p)\big) \\
\text{hand} \to \text{world}:&\quad \text{local}_{\text{base}}\Big(\text{local}_{\text{arm}}\big(\text{local}_{\text{hand}}(p)\big)\Big)
\end{aligned}
\]
</div>

- each part is authored **once**, in its parent's frame; turn the base and everything below it turns
- read right to left: the hand's own local transform acts **first**, the root's **last**


---

## Worked: a 2D arm, small numbers

| node | local: in the parent's frame | world origin |
| --- | --- | --- |
| base | at `(2, 0)`, turned 90° | `(2, 0)` |
| arm | at `(1, 0)`, elbow 0° | `(2, 0) + R(90°)(1, 0) = (2, 1)` |
| hand | at `(1, 0)` | `(2, 0) + R(90°)((1, 0) + (1, 0)) = (2, 2)` |

Bend the elbow 90°; **nothing else changes**:

<div class="tex" style="font-size:0.75em" role="img" aria-label="   hand origin in the base's frame:  (1, 0) + R(90°)(1, 0) = (1, 1)
   in the world:                     (2, 0) + R(90°)(1, 1) = (2, 0) + (−1, 1) = (1, 1)">
\[
\begin{aligned}
\text{hand origin in the base's frame:}&\quad (1, 0) + R(90^\circ)\,(1, 0) = (1, 1) \\
\text{in the world:}&\quad (2, 0) + R(90^\circ)\,(1, 1) = (2, 0) + ({-1}, 1) = (1, 1)
\end{aligned}
\]
</div>


---

## Parents, local and world, in both tracks

<div class="code-tabs">

```csharp
void BuildArm(Transform baseNode, Transform arm, Transform hand)
{
    arm.SetParent(baseNode, false);      // false: keep the local values
    hand.SetParent(arm, false);

    baseNode.localPosition = new Vector3(2f, 0f, 0f);
    baseNode.localRotation = Quaternion.AngleAxis(90f, Vector3.forward);
    arm.localPosition = new Vector3(1f, 0f, 0f);
    arm.localRotation = Quaternion.AngleAxis(90f, Vector3.forward);   // the elbow
    hand.localPosition = new Vector3(1f, 0f, 0f);

    Vector3 handWorld = hand.position;                         // (1, 1, 0)
    Vector3 tipWorld = hand.TransformPoint(0.5f, 0f, 0f);      // local to world: (0.5, 1, 0)
    Vector3 tipInArm = arm.InverseTransformPoint(tipWorld);    // world to local: (1.5, 0, 0)
}
```

```javascript
function buildArm(baseNode, arm, hand) {
  baseNode.add(arm);                       // add: keep the local values
  arm.add(hand);

  const zAxis = new THREE.Vector3(0, 0, 1);
  baseNode.position.set(2, 0, 0);
  baseNode.quaternion.setFromAxisAngle(zAxis, Math.PI / 2);
  arm.position.set(1, 0, 0);
  arm.quaternion.setFromAxisAngle(zAxis, Math.PI / 2);      // the elbow
  hand.position.set(1, 0, 0);

  baseNode.updateMatrixWorld();
  const handWorld = hand.getWorldPosition(new THREE.Vector3());      // (1, 1, 0)
  const tipWorld = hand.localToWorld(new THREE.Vector3(0.5, 0, 0));  // local to world: (0.5, 1, 0)
  const tipInArm = arm.worldToLocal(tipWorld.clone());               // world to local: (1.5, 0, 0)
}
```

</div>


---

<!-- .slide: class="demo-full" -->

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

### A spiral pass, frame by frame

<small>(~10 min)</small>


---

## The ball's frames, nested

| frame | its parent | moved by | the idea |
| --- | --- | --- | --- |
| object (the mesh) | spin axis | spin φ about the ball's long axis | rotation about a fixed axis |
| spin axis | velocity | wobble: a 3° tilt about a circling axis | rotation about any axis |
| velocity | flight | aim: a turn about x by the climb angle | an angle read from a vector |
| flight | throw | the parabola | a translation |
| throw | field | heading 12°, release at (20, 2, 25) | rotate, then translate |
| field | world | midfield to the origin, then a turn | a placement |

A camera is one more node: on a tripod in the field, or riding a frame of the ball.

<a href="../../lib/demo.html?demo=football&amp;controls=step:1" target="_blank" rel="noopener">Open the spiral pass in a new tab ↗</a>


---

## Spin and wobble: rotations about axes

**Step 2, spin:** a turn about the ball's own long axis (its z) <a href="../../lib/demo.html?demo=football&amp;controls=step:2" target="_blank" rel="noopener">open step 2 ↗</a>

<div class="tex" role="img" aria-label="   φ = 2π · (rpm / 60) · t          600 rpm: 10 turns a second, 60° per frame at 60 frames a second">
\[ \varphi = 2\pi \cdot \frac{\text{rpm}}{60} \cdot t \]
\[ \text{600 rpm: 10 turns a second, } 60^\circ \text{ per frame at 60 frames a second} \]
</div>

**Step 3, wobble:** the nose tilts 3° toward a direction ψ that circles twice a second <a href="../../lib/demo.html?demo=football&amp;controls=step:3" target="_blank" rel="noopener">open step 3 ↗</a>

<div class="tex" role="img" aria-label="   a turn by β = 3° about the axis (cos ψ, sin ψ, 0)        Rodrigues, with an axis that moves
   built as R_z(ψ) R_x(β) R_z(−ψ):  turn the axis onto x, tilt about x, turn back">
\[
\begin{aligned}
&\text{a turn by } \beta = 3^\circ \text{ about the axis } (\cos\psi,\ \sin\psi,\ 0) \\
&\qquad \text{Rodrigues, with an axis that moves} \\
&\text{built as } R_z(\psi)\, R_x(\beta)\, R_z(-\psi): \\
&\qquad \text{turn the axis onto } x \text{, tilt about } x \text{, turn back}
\end{aligned}
\]
</div>


---

## Aim and fly: an angle from a vector, then a translation

**Step 4, aim:** the nose follows the velocity, `v(t) = (0, v sin α − g t, v cos α)` <a href="../../lib/demo.html?demo=football&amp;controls=step:4" target="_blank" rel="noopener">open step 4 ↗</a>

<div class="tex" style="font-size:0.75em" role="img" aria-label="   climb angle θ = atan2(vy, vz)        30° at release, 0° at the top, −31.4° at the catch
   turn about x by −θ                   a positive turn about x takes +z toward −y">
\[
\begin{aligned}
&\text{climb angle } \theta = \text{atan2}(v_y, v_z) && 30^\circ \text{ at release, } 0^\circ \text{ at the top, } {-31.4^\circ} \text{ at the catch} \\
&\text{turn about } x \text{ by } {-\theta} && \text{a positive turn about } x \text{ takes } {+z} \text{ toward } {-y}
\end{aligned}
\]
</div>

**Step 5, flight:** a pure translation, along a parabola in the throw's vertical plane <a href="../../lib/demo.html?demo=football&amp;controls=step:5" target="_blank" rel="noopener">open step 5 ↗</a>

<div class="tex" style="font-size:0.75em" role="img" aria-label="   y(t) = v sin α · t − ½ g t²,   z(t) = v cos α · t        22 m/s at 30°, g = 9.808 m/s²
   top: 6.17 m above the release, at t = 1.12 s">
\[
\begin{aligned}
&y(t) = v \sin\alpha \cdot t - \tfrac{1}{2}\, g\, t^2, \quad z(t) = v \cos\alpha \cdot t && 22\ \text{m/s at } 30^\circ,\ g = 9.808\ \text{m/s}^2 \\
&\text{top: } 6.17\ \text{m above the release, at } t = 1.12\ \text{s}
\end{aligned}
\]
</div>


---

## The catch: a change of parent

<a href="../../lib/demo.html?demo=football&amp;controls=step:8" target="_blank" rel="noopener">Step 8 ↗</a>: at `t = 2.30 s` the ball stops being a child of the throw and becomes a child of the **cart**

- its world pose must not jump: its new local transform is its current world placement **seen from the cart's frame**
- afterwards it rides the cart: the cart moves, the ball follows
- Unity: `ball.SetParent(cart, true)`; three.js: `cart.attach(ball)`


---

## What you type, what is stored

<a href="../../lib/demo.html?demo=football&amp;controls=step:14" target="_blank" rel="noopener">Step 14 ↗</a>, the Stored tab:

- **typed:** Euler angles, X (pitch), Y (heading), Z (spin), applied Z, then X, then Y; the spin angle keeps growing
- **read back:** Unity's `eulerAngles`, recovered from the rotation and wrapped to [0°, 360°)
- **stored:** a unit quaternion, 4 numbers; the one built from the half angles flips sign every whole turn: **q and −q are one rotation**
- the **straight up** preset: at X = −90°, heading and spin turn about the same axis: **gimbal lock**


---

<!-- .slide: class="demo-full" -->

## A spiral pass, live: ride any frame of the chain

<div class="cockpit" data-demo="football" data-controls="step:1"><pre class="viz-fallback">  clip point = P · V · F · H · T(t) · A(t) · W(t) · S(t) · mesh point     (steps 1 to 14 build it one link at a time)
  -- default throw: 22 m/s at 30 deg, from (20, 2, 25), heading 12 deg, 600 rpm, Seattle g = 9.808 m/s2 --
     climb angle  30 deg at release, 0 at the top (t = 1.12 s), -31.4 deg at the catch
     apex         6.17 m above the release (8.17 m above the field)
     the catch    t = 2.30 s, 1.3 m up, 43.9 m from the release; the cart drove 21.4 m (it would land at 2.41 s, 45.8 m)
     after it     ball = F · K(t) · D(t) · K(tc)^-1 · H·T·A·W·S(tc): a change of parent
  views: object, spin axis, velocity, flight, throw, field, world, camera, cart
  shot cameras: tripod, pan, sideline, chase, skycam, ball cam, spin cam, receiver, orbit; any of three balls</pre></div>

