<!--
  CSS 551 · TOPIC DECK: Animation: keyframes, interpolation, skeletons, skinning (the core, ~50 min, 19 slides).
  Mounted as <section data-markdown="../../topics/animation.md">. No logistics.

  GOALS: motion is interpolation in the right representation (blend the parts of a transform, never
    the matrix); a skeleton is a scene graph that deforms a mesh.
  OUTCOMES (students can): compute a linear in-between and say why the direction snaps at a key; state
    the Catmull-Rom tangent rule and why it removes the corner; separate path from timing with an
    easing s(t); predict what blending matrices does to a rotation and pick each TRS part's blend;
    compute how far a slerp has turned and apply the sign check; solve a two-link arm for both elbows
    and detect an unreachable target; compute a linear-blend-skinned vertex and explain the candy wrapper.
  TEACHES: a keyframe and an animation channel; linear in-betweening and its corner; the Catmull-Rom
    tangent rule; easing as retiming; why matrices are never blended, keyed rotations by slerp, the
    Euler wrap pitfall; interpolating TRS parts and rebuilding; skeletons as scene graphs, forward
    kinematics, two-link inverse kinematics (both branches, unreachable targets); linear blend skinning,
    the candy wrapper, skinning on the GPU.
  NEEDS:   the rotation topic (quaternions, slerp, the q and -q sign check), TRS and the composite rule
    (the scene-graph topic; HW3).
  DEMOS:   keyframe (t,ease) on two demo-full slides: first before anything is defined, again
    after the worked numbers.
  NUMBERS: textbook/figures/numbers-motion.json key anim (keys, easing, editor, squash,
    matrixLerp, slerp, squad, ik, bind, skinning), all reproduced in node. Computed for this
    deck by node against lib/core/xform.js:
    - spline speed per unit t on the demo's Catmull-Rom (reflected end points):
      piece 1 at s = 0, 0.25, 0.5, 0.75, 1: 5.35, 5.91, 5.79, 5.07, 4.40; piece 2: 4.40,
      4.90, 5.56, 5.67, 5.15; lengths 2.715 and 2.620
    - TRS halfway, A = identity, B = T(2,0,0) R_y(90) S(2): matrix lerp has column 0 =
      (0.5, 0, -1), length 1.118, angle 63.4 degrees, sends (1,0,0) to (1.5, 0, -1);
      parts (t = (1,0,0), R_y(45), s = 1.5) send it to (2.061, 0, -1.061)
    - Euler wrap: yaw keys 350 and 10 degrees; Euler lerp sweeps 340 degrees; quaternions
      (0, 0.0872, 0, -0.9962) and (0, 0.0872, 0, 0.9962), dot -0.985, after the sign check
      the arc is 20 degrees
    - blend tree: walk 1.5 m/s, run 4 m/s, speed 2.5: run weight 0.4; knee 20 and 60
      degrees about one axis: slerp gives 36 degrees
    - retargeting: thigh 0.45 m against 0.36 m at 30 degrees from vertical: knee 0.225 m
      against 0.18 m forward; copying positions stretches the thigh by 25 %
    - motion capture: 60 joints x 3 rotation channels x 120 frames per second = 21,600 keys per second
  READING: ../../textbook/animation.html, Sections 1 and 3 to 7.
  CUT 2026-11-13 (Marcel: "what are we actually teaching ... be specific on goals and outcomes"): the core
    keeps the slides the outcomes above need; the curve editor, the spline's speed, worked smoothstep, the
    animator's principles, squash, squad, long chains, one skinned vertex, blend shapes, motion capture,
    retargeting and blend trees moved, in order, to animation-supplement.md (after the wrap). The demo's
    "ease" switch is now "path" (linear | spline): easing means retiming. The Catmull-Rom slide states the
    cubic by its four conditions; the supplement writes the Hermite basis and the Bezier.
  EDIT 2026-10-08: the easing code slide in Unity/WebGL code tabs.
  EDIT 2026-11-03 (Marcel): the keyframe demo opens the topic, before it is talked about; every
    formula typeset; "Worked: reading a value" corrected (the second key's slope is -1, not flat;
    anim.editor.slopeAtKey1 and anim.editor.peak).

  reveal.js: FLAT; notes follow "Note:" and stay plain text. Display math is a raw <div class="tex">
  block typeset by MathJax (lib/deck-math.js; TeX inside, the ASCII form as aria-label, no blank line
  inside); inline math is a code span written `$...$`. Code identifiers stay plain code spans. Never
  two "_" on one markdown line outside a code fence or code span; paths relative to the lecture page.
-->

### Animation: keyframes, interpolation, skeletons, skinning

<small>(~50 min) · reading: <a href="../../textbook/animation.html">Animation and Interpolation</a>, Sections 1 and 3 to 7</small>


---

<!-- .slide: class="demo-full" -->

## Keyframes, live

<div class="cockpit" data-demo="keyframe" data-controls="t,ease"><pre class="viz-fallback">  three keys K0 = (-2.2, 0.5, 0), K1 = (0, 1.9, -0.6), K2 = (2.2, 0.7, 0) at t = 0, 0.5, 1
  controls:  t (0 to 1), path = linear | spline (Catmull-Rom)
  readout:   mode, x, y, z of the in-between</pre></div>


---

## A keyframe is a value at a time

- a **keyframe**: one animated quantity at a stated time (a position, an angle, a color)
- **in-betweening** (interpolation): the value at every other time, from the keys on either side
- an **animation channel**: one scalar against time; a position is three channels, a TRS node ten (3 translation, 4 quaternion, 3 scale)
- the demo's three keys, at times `$0$`, `$\tfrac12$`, `$1$`:

<div class="tex" role="img" aria-label="K0 = (−2.2, 0.5, 0)      K1 = (0, 1.9, −0.6)      K2 = (2.2, 0.7, 0)">
\[
K_0 = (-2.2,\ 0.5,\ 0) \qquad K_1 = (0,\ 1.9,\ {-0.6}) \qquad K_2 = (2.2,\ 0.7,\ 0)
\]
</div>


---

## Worked: linear in-betweening

At `$t = 0.35$` the point is on the first segment, `$0.35 \times 2 = 0.7$` of the way from `$K_0$` to `$K_1$`:

<div class="tex" style="font-size:0.74em" role="img" aria-label="K0 + 0.7 · (K1 − K0) = (−2.2 + 1.54,  0.5 + 0.98,  −0.42) = (−0.66, 1.48, −0.42)
velocity, segment 1:  2 (K1 − K0) = (4.4,  2.8, −1.2)    per unit t
velocity, segment 2:  2 (K2 − K1) = (4.4, −2.4,  1.2)
angle between them:   66°, all at once, at t = ½">
\[
\begin{gathered}
K_0 + 0.7\,(K_1 - K_0) = (-2.2 + 1.54,\ 0.5 + 0.98,\ {-0.42}) = (-0.66,\ 1.48,\ {-0.42}) \\[8pt]
\begin{aligned}
\text{velocity, segment 1:} &\quad 2\,(K_1 - K_0) = (4.4,\ 2.8,\ {-1.2}) \text{ per unit } t \\
\text{velocity, segment 2:} &\quad 2\,(K_2 - K_1) = (4.4,\ {-2.4},\ 1.2) \\
\text{angle between them:} &\quad 66^\circ, \text{ all at once, at } t = \tfrac12
\end{aligned}
\end{gathered}
\]
</div>

- the position is continuous; the **direction snaps** at the key, and the eye reads the corner as a jerk


---

## A spline through the keys: Catmull-Rom

Each piece is a **cubic** between two keys, set by its end points and its tangents, with tangent `$m = \tfrac12(\text{next key} - \text{previous key})$`:

<div class="tex" style="font-size:0.74em" role="img" aria-label="open end: reflect a neighbor     p₋₁ = 2 K0 − K1 = (−4.4, −0.9, 0.6)
m0 = ½ (K1 − p₋₁) = (2.2, 1.4, −0.6)        m1 = ½ (K2 − K0) = (2.2, 0.1, 0)
each piece: the cubic with c(0) = K0, c(1) = K1, c′(0) = m0, c′(1) = m1, for s from 0 to 1">
\[
\begin{gathered}
\text{open end, reflect a neighbor:}\quad p_{-1} = 2K_0 - K_1 = (-4.4,\ {-0.9},\ 0.6) \\[4pt]
m_0 = \tfrac12 (K_1 - p_{-1}) = (2.2,\ 1.4,\ {-0.6}) \qquad m_1 = \tfrac12 (K_2 - K_0) = (2.2,\ 0.1,\ 0) \\[8pt]
\text{each piece: the cubic with } c(0) = K_0,\ c(1) = K_1,\ c'(0) = m_0,\ c'(1) = m_1
\end{gathered}
\]
</div>

- the curve passes **through** every key, and its velocity at `$K_1$` is the same on both sides: `$2m_1 = (4.4,\ 0.2,\ 0)$`


---

<!-- .slide: class="demo-full" -->

## The worked numbers, live

<div class="cockpit" data-demo="keyframe" data-controls="t,ease"><pre class="viz-fallback">  three keys K0 = (-2.2, 0.5, 0), K1 = (0, 1.9, -0.6), K2 = (2.2, 0.7, 0) at t = 0, 0.5, 1
  controls:  t (0 to 1), path = linear | spline (Catmull-Rom)
  readout:   mode, x, y, z of the in-between
  t = 0.35:  linear (-0.66, 1.48, -0.42); spline (-0.66, 1.671, -0.508)</pre></div>


---

## Easing: the same path, retimed

An **easing function** `$s(t)$` maps normalized time to normalized progress; the position is `$\text{path}(s(t))$`.

<div class="tex" style="font-size:0.76em" role="img" aria-label="smoothstep      s = 3t² − 2t³              zero velocity at both ends
smootherstep    s = 6t⁵ − 15t⁴ + 10t³      zero acceleration at the ends too
cubic in-out    s = 4t³  (first half)
CSS ease-in-out Bézier (0,0) (0.42,0) (0.58,1) (1,1), read as s against t">
\[
\begin{gathered}
\begin{aligned}
\text{smoothstep} &\quad s = 3t^2 - 2t^3 && \text{zero velocity at both ends} \\
\text{smootherstep} &\quad s = 6t^5 - 15t^4 + 10t^3 && \text{zero acceleration at the ends too} \\
\text{cubic in-out} &\quad s = 4t^3 && \text{first half}
\end{aligned} \\[8pt]
\text{CSS ease-in-out: Bézier } (0,0),\ (0.42,0),\ (0.58,1),\ (1,1), \text{ read as } s \text{ against } t
\end{gathered}
\]
</div>

- at `$t = 0.35$`, smoothstep gives `$s = 0.282$`: 35&nbsp;% of the time gone, 28&nbsp;% of the way along, because it started from rest
- Disney's animators called it **slow in and slow out**: real things start from rest and stop


---

## Never lerp the matrices

Blend the identity and `$R_z(90^\circ)$` entry by entry at `$t = 0.5$`:

<div class="tex" role="img" aria-label="M = ½ I + ½ R = [ 0.5  −0.5 ]
                [ 0.5   0.5 ]
columns of length 0.707, det 0.5:   the object shrinks to half its area
half turn, R_z(180):                the blend is the zero matrix, det 0: gone">
\[
\begin{gathered}
M = \tfrac12 I + \tfrac12 R = \begin{bmatrix} 0.5 & -0.5 \\ 0.5 & 0.5 \end{bmatrix} \\[8pt]
\text{columns of length } 0.707,\ \det M = 0.5\text{:} \text{ the object shrinks to half its area} \\
\text{half turn, } R_z(180^\circ)\text{:} \text{ the blend is the zero matrix, } \det M = 0\text{:} \text{ gone}
\end{gathered}
\]
</div>

- a matrix blend is not a rotation; the columns stop being unit and orthogonal
- blend **the parts**: translations by lerp, rotations by slerp or nlerp, scales by lerp (or in log space)


---

## Keyed rotations: slerp between keys

- each pair of orientation keys is blended by the rotation topic's **slerp**: constant angular speed along the shortest arc, so at parameter `$u$` it has turned `$u$` times the whole angle
- the chapter's pair: identity to `$120^\circ$` about `$y$`; at `$t = 0.25$` slerp gives `$30^\circ$` exactly; normalized lerp gives `$27.8^\circ$`
- games use normalized lerp between dense keys: the speed error is invisible over a few degrees


---

## Pitfall: yaw keys at 350° and 10°

Two keys `$20^\circ$` apart across the wrap of the angle:

<div class="tex" style="font-size:0.74em" role="img" aria-label="Euler channel, linear:  350 → 10   sweeps  340°   the long way round, through 180
quaternions:  q(350°) = (0, 0.0872, 0, −0.9962)     q(10°) = (0, 0.0872, 0, 0.9962)
dot = −0.985 &lt; 0  →  negate one  →  slerp turns  20°">
\[
\begin{aligned}
\text{Euler channel, linear:} &\quad 350 \to 10 \text{ sweeps } 340^\circ, \text{ the long way round, through } 180 \\
\text{quaternions:} &\quad q(350^\circ) = (0,\ 0.0872,\ 0,\ {-0.9962}) \\
&\quad q(10^\circ) = (0,\ 0.0872,\ 0,\ 0.9962) \\
\text{dot:} &\quad -0.985 \lt 0 \ \to\ \text{negate one} \ \to\ \text{slerp turns } 20^\circ
\end{aligned}
\]
</div>

- exporters **unwrap** Euler channels (`$350 \to 370$`) or key **quaternions** with the sign check


---

## Interpolate the parts, then rebuild

Halfway between `$A$`, the identity, and `$B = T(2, 0, 0)\,R_y(90^\circ)\,S(2)$`:

<div class="tex" role="img" aria-label="matrix lerp:  column 0 = (0.5, 0, −1):  length 1.118, rotation 63.4°
              sends (1, 0, 0) to (1.5, 0, −1)
parts:        t = (1, 0, 0),  R_y(45°) by slerp,  s = 1.5
              sends (1, 0, 0) to (2.061, 0, −1.061)">
\[
\begin{aligned}
\text{matrix lerp:} &\quad \text{column 0} = (0.5,\ 0,\ {-1})\text{:} \text{ length } 1.118, \text{ rotation } 63.4^\circ \\
&\quad \text{sends } (1, 0, 0) \text{ to } (1.5,\ 0,\ {-1}) \\[6pt]
\text{parts:} &\quad t = (1, 0, 0),\ R_y(45^\circ) \text{ by slerp},\ s = 1.5 \\
&\quad \text{sends } (1, 0, 0) \text{ to } (2.061,\ 0,\ {-1.061})
\end{aligned}
\]
</div>

- glTF and FBX store **translation, rotation, scale** channels per node; the matrix is never stored
- a camera: interpolate eye and target (or eye and a quaternion), then rebuild the view matrix


---

## A skeleton is a scene graph of joints

- each **joint** is a node; its local transform is a **rotation** about the joint (plus a fixed offset to the parent)
- **forward kinematics**: key the joint angles, slerp them, multiply down the chain: the composite rule
- most character animation is authored this way: rotation channels on joints, one translation channel on the root (the hips)


---

## Kinematics: the tree run forward and backward

<img src="../../textbook/figures/anim-ik.svg" alt="a two-link arm reaching for a target, with the elbow-up and elbow-down solutions drawn" style="height:210px">

- **forward kinematics**: joint angles in, hand position out: the composite rule
- **inverse kinematics** (IK): hand position in, joint angles out: solve the composite rule **backward**


---

## Worked: two-link inverse kinematics

Links `$l_1 = 1$`, `$l_2 = 0.8$`; target `$(1.2, 0.9)$`, distance `$d = 1.5$`:

<div class="tex" style="font-size:0.74em" role="img" aria-label="law of cosines at the elbow:  cos θ2 = (d² − l1² − l2²) / (2 l1 l2) = (2.25 − 1 − 0.64) / 1.6 = 0.3812
                              θ2 = 67.6°
shoulder:  θ1 = atan2(0.9, 1.2) − atan2(l2 sin θ2, l1 + l2 cos θ2) = 36.87° − 29.54° = 7.3°
elbow at (cos 7.3°, sin 7.3°) = (0.992, 0.128);  forward kinematics back to the tip: (1.2, 0.9)">
\[
\begin{gathered}
\text{law of cosines at the elbow:} \quad \cos\theta_2 = \frac{d^2 - l_1^2 - l_2^2}{2\,l_1 l_2} = \frac{2.25 - 1 - 0.64}{1.6} = 0.3812 \\[2pt]
\theta_2 = 67.6^\circ \\[8pt]
\text{shoulder:} \quad \theta_1 = \text{atan2}(0.9,\ 1.2) - \text{atan2}(l_2 \sin\theta_2,\ l_1 + l_2 \cos\theta_2) \\
= 36.87^\circ - 29.54^\circ = 7.3^\circ \\[8pt]
\text{elbow at } (\cos 7.3^\circ,\ \sin 7.3^\circ) = (0.992,\ 0.128) \\
\text{forward kinematics back to the tip: } (1.2,\ 0.9)
\end{gathered}
\]
</div>


---

## IK has two answers, or none

<div class="tex" style="font-size:0.76em" role="img" aria-label="elbow down:  θ1 = 7.3°,   θ2 = 67.6°      elbow at (0.992, 0.128)
elbow up:    θ1 = 66.4°,  θ2 = −67.6°     elbow at (0.4, 0.916)
target (2, 0.5):  d = 2.062 &gt; l1 + l2 = 1.8   unreachable: acos of a number above 1">
\[
\begin{gathered}
\begin{aligned}
\text{elbow down:} &\quad \theta_1 = 7.3^\circ,\ \theta_2 = 67.6^\circ && \text{elbow at } (0.992,\ 0.128) \\
\text{elbow up:} &\quad \theta_1 = 66.4^\circ,\ \theta_2 = -67.6^\circ && \text{elbow at } (0.4,\ 0.916)
\end{aligned} \\[8pt]
\text{target } (2,\ 0.5)\text{:} \quad d = 2.062 \gt l_1 + l_2 = 1.8 \\
\text{unreachable: } \arccos \text{ of a number above } 1
\end{gathered}
\]
</div>

Solvers pick a branch (a pole vector for knees and elbows) and **clamp** unreachable targets to the reach circle.


---

## Skinning: one mesh, many bones

<img src="../../textbook/figures/anim-skinning.svg" alt="a bent limb whose vertices near the joint follow a blend of the two bones' transforms" style="height:210px">

A character is **one** mesh; each vertex follows a **weighted blend** of a few bones' transforms. Near a joint the weights share; far from it one bone owns the vertex.


---

## Linear blend skinning

<div class="tex" role="img" aria-label="v' = Σ wᵢ · Wᵢ · Bᵢ⁻¹ · v, over bones i, with Σ wᵢ = 1">
\[
v' = \sum_i w_i\, W_i\, B_i^{-1}\, v, \qquad \sum_i w_i = 1
\]
</div>

- `$B_i$`: bone `$i$`'s world matrix in the bind pose (when the mesh was attached)
- `$W_i$`: bone `$i$`'s world matrix now
- `$B_i^{-1}$` takes the vertex into bone `$i$`'s frame; `$W_i$` carries it back out, posed

Games cap influences at **4 bones per vertex** (glTF stores `JOINTS_0` and `WEIGHTS_0` as four each).


---

## Pitfall: the candy wrapper

2D vertex `$(2, 0.4)$`, weight `$0.5$`, bone `$B$` turns about `$(2, 0)$`:

<div class="tex" role="img" aria-label="B turns 90°:    B's image (1.6, 0),   blend (1.8, 0.2):   distance from the pivot 0.4 → 0.283
B turns 180°:   B's image (2, −0.4),  blend (2, 0):       distance 0: the limb collapses to its axis">
\[
\begin{aligned}
B \text{ turns } 90^\circ\text{:} &\quad B\text{'s image } (1.6,\ 0), \quad \text{blend } (1.8,\ 0.2) \\
&\quad \text{distance from the pivot } 0.4 \to 0.283 \\[6pt]
B \text{ turns } 180^\circ\text{:} &\quad B\text{'s image } (2,\ {-0.4}), \quad \text{blend } (2,\ 0) \\
&\quad \text{distance } 0\text{: the limb collapses to its axis}
\end{aligned}
\]
</div>

Linear blending of rotations is the matrix-lerp failure again. **Dual quaternion skinning** (Kavan et al., 2007) blends rotations on the sphere and keeps the volume.


---

## Real code: skinning on the GPU

```glsl
// vertex shader: four bone indices and weights per vertex
mat4 skin = w.x * bones[int(j.x)] + w.y * bones[int(j.y)]
          + w.z * bones[int(j.z)] + w.w * bones[int(j.w)];   // bones[i] = W_i * inverse(B_i)
gl_Position = proj * view * skin * vec4(position, 1.0);
```

| | Unity | three.js |
| --- | --- | --- |
| skinned mesh | `SkinnedMeshRenderer` | `THREE.SkinnedMesh` + `THREE.Skeleton` |
| per-vertex data | `Mesh.boneWeights` | attributes `skinIndex`, `skinWeight` |
| inverse bind matrices | `Mesh.bindposes` | `skeleton.boneInverses` |
| influences | `quality = SkinQuality.Bone4` | four, fixed |
