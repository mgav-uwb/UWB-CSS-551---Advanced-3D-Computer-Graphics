<!--
  CSS 551 · TOPIC DECK: Animation: keyframes, interpolation, skeletons, skinning (~46 min).
  Mounted as <section data-markdown="../../topics/animation.md">. No logistics.

  TEACHES: a keyframe and an animation channel; linear in-betweening and its corner;
  the Catmull-Rom spline through the keys, worked; the spline's uneven speed; the curve
  editor (a Bezier per channel segment in (time, value)), reading a value by root-finding,
  the overlapping-handle failure, flat and stepped keys; easing as retiming, smoothstep
  worked, the animator's principles that are geometry, squash at constant volume; why
  matrices are never blended, keyed rotations by slerp (the rotation topic's), the Euler
  wrap pitfall, squad through several keys; interpolating TRS parts and rebuilding;
  skeletons as scene graphs, forward kinematics, two-link inverse kinematics (both
  branches, unreachable targets), iterative IK; the bind pose and linear blend skinning,
  one vertex worked, the candy wrapper, skinning on the GPU (GLSL, with each engine's names), blend shapes;
  motion capture, retargeting, blend trees.
  NEEDS:   the rotation topic (quaternions, slerp, the q and -q sign check), the affine
    topic (TRS, the rigid inverse), the scene-graph topic (the composite rule).
  DEMOS:   keyframe (t,ease) on a demo-full slide.
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
  READING: ../../textbook/animation.html, Sections 1 to 7 and 11.
  EDIT 2026-10-08: the easing code slide in Unity/WebGL code tabs.

  reveal.js: FLAT; notes follow "Note:"; plain text math, no KaTeX; never two
  "_" on one markdown line outside a code fence; paths relative to the lecture page.
-->

### Animation: keyframes, interpolation, skeletons, skinning

<small>(~46 min) · reading: <a href="../../textbook/animation.html">Animation and Interpolation</a>, Sections 1 to 7 and 11</small>


---

## A keyframe is a value at a time

- a **keyframe**: one animated quantity at a stated time (a position, an angle, a color)
- **in-betweening** (interpolation): the value at every other time, from the keys on either side
- an **animation channel**: one scalar against time; a position is three channels, a TRS node ten (3 translation, 4 quaternion, 3 scale)
- the demo's three keys, at times 0, ½, 1:

```text
   K0 = (−2.2, 0.5, 0)      K1 = (0, 1.9, −0.6)      K2 = (2.2, 0.7, 0)
```


---

## Worked: linear in-betweening

At **t = 0.35** the point is on the first segment, 0.35 × 2 = **0.7** of the way from K0 to K1:

```text
   K0 + 0.7 · (K1 − K0) = (−2.2 + 1.54,  0.5 + 0.98,  −0.42) = (−0.66, 1.48, −0.42)

   velocity, segment 1:  2 (K1 − K0) = (4.4,  2.8, −1.2)    per unit t
   velocity, segment 2:  2 (K2 − K1) = (4.4, −2.4,  1.2)
   angle between them:   66°, all at once, at t = ½
```

- the position is continuous; the **direction snaps** at the key, and the eye reads the corner as a jerk


---

## A spline through the keys: Catmull-Rom

Each piece is a cubic **Hermite** curve between two keys, with tangent **m = ½ (next key − previous key)**:

```text
   open end: reflect a neighbor     p₋₁ = 2 K0 − K1 = (−4.4, −0.9, 0.6)
   m0 = ½ (K1 − p₋₁) = (2.2, 1.4, −0.6)        m1 = ½ (K2 − K0) = (2.2, 0.1, 0)

   c(s) = h00(s)·K0 + h10(s)·m0 + h01(s)·K1 + h11(s)·m1        s ∈ [0, 1] on the piece
```

- the curve passes **through** every key, and its velocity at K1 is the same on both sides: **2 m1 = (4.4, 0.2, 0)**


---

## Worked: the spline at t = 0.35

Local parameter **s = 0.7** on the first piece:

```text
   h00 = 0.216    h10 = 0.063    h01 = 0.784    h11 = −0.147

   c = 0.216 K0 + 0.063 m0 + 0.784 K1 − 0.147 m1 = (−0.66, 1.671, −0.508)
   linear, same t:                                 (−0.66, 1.48,  −0.42)
```

- same **x** (the keys are evenly spaced in x); the spline is **0.19 higher** and **0.09 farther back**, bulging past the chord


---

<!-- .slide: class="demo-full" -->

## Keyframes, live

<div class="cockpit" data-demo="keyframe" data-controls="t,ease"><pre class="viz-fallback">  three keys K0 = (-2.2, 0.5, 0), K1 = (0, 1.9, -0.6), K2 = (2.2, 0.7, 0) at t = 0, 0.5, 1
  controls:  t (0 to 1), ease = linear | smooth (Catmull-Rom)
  readout:   mode, x, y, z of the in-between
  t = 0.35:  linear (-0.66, 1.48, -0.42); smooth (-0.66, 1.671, -0.508)</pre></div>


---

## Pitfall: a spline is not a speed

Speed along the demo's spline, per unit t:

| s on the piece | 0 | 0.25 | 0.5 | 0.75 | 1 |
| --- | --- | --- | --- | --- | --- |
| piece 1 (length 2.715) | 5.35 | 5.91 | 5.79 | 5.07 | 4.40 |
| piece 2 (length 2.620) | 4.40 | 4.90 | 5.56 | 5.67 | 5.15 |

- the parameter is **not distance**: the object speeds up and slows down by **34 %** with no visible cause
- fix: reparametrize by **arc length**, then drive the distance with an easing curve (a motion-path constraint)


---

## The curve editor: a channel is a Bézier

<img src="../../textbook/figures/anim-editor.svg" alt="one channel segment with two Bezier handles, and the same segment with the in-handle dragged past the next key so the curve doubles back in time" style="height:220px">

- keys **(t0, v0)** and **(t1, v1)**, out-handle **h0**, in-handle **h1**: a cubic Bézier in the (time, value) plane
- the value at time τ is **y(s\*)** where **x(s\*) = τ**: a root-find, one per evaluation


---

## Worked: reading a value off the channel

Keys **(0, 0)** and **(1, 2)**; handles **(0.5, 1.2)** and **(0.6, 2.4)**. The value at time **0.35**:

```text
   bisection on x(s) = 0.35:   s* = 0.2888
   value:                      y(s*) = 1.001

   slope at the first key:     1.2 / 0.5 = 2.4 units per second   (the handle's slope)
   at the second key:          flat, coming down from a handle at 2.4 to the key at 2
```


---

## Pitfall: a handle past the next key

Drag the in-handle to **(1.3, 2.4)**, past the key at time 1:

```text
   x(s) climbs to 1.066 at s = 0.849, then returns to 1
   at time 1 the channel has two values:  1.952  and  2
```

- the root-find has **no unique answer**; the channel doubles back in time
- editors **clamp** handles inside [t0, t1], or switch to weighted tangents where only the slope is set
- engines get channels **baked**: dense samples or Hermite tangents, no root-find at run time


---

## Easing: the same path, retimed

An **easing function** s(t) maps normalized time to normalized progress; the position is **path(s(t))**.

```text
   smoothstep      s = 3t² − 2t³              zero velocity at both ends
   smootherstep    s = 6t⁵ − 15t⁴ + 10t³      zero acceleration at the ends too
   cubic in-out    s = 4t³  (first half)
   CSS ease-in-out Bézier (0,0) (0.42,0) (0.58,1) (1,1), read as s against t
```

- Disney's animators called it **slow in and slow out**: real things start from rest and stop


---

## Worked: smoothstep at t = 0.35

```text
   t² = 0.1225     t³ = 0.042875
   s = 3 · 0.1225 − 2 · 0.042875 = 0.3675 − 0.08575 = 0.282

   other curves at t = 0.35:   smootherstep 0.235   cubic 0.171   CSS 0.256   linear 0.35
   linear path at s = 0.282:   (−0.96, 1.29, −0.34)      instead of   (−0.66, 1.48, −0.42)
```

- 35 % of the time gone, **28.2 %** of the way along; smoothstep's slope at the middle is **1.5**


---

## Real code: easing and keys, both tracks

<div class="code-tabs">

```csharp
float s = Mathf.SmoothStep(0f, 1f, 0.35f);                         // 0.28175
var curve = AnimationCurve.EaseInOut(0f, 0f, 1f, 1f);               // flat tangents
float s2 = curve.Evaluate(0.35f);                                   // 0.28175
transform.rotation = Quaternion.Slerp(qa, qb, s);                   // eased slerp
```

```javascript
const s = THREE.MathUtils.smoothstep(0.35, 0, 1);                   // 0.28175
const track = new THREE.VectorKeyframeTrack('.position', [0, 0.5, 1],
  [-2.2, 0.5, 0,  0, 1.9, -0.6,  2.2, 0.7, 0]);                     // linear by default
mesh.quaternion.slerpQuaternions(qa, qb, s);
```

</div>


---

## The animator's principles that are geometry

| principle | on screen | in this course's machinery |
| --- | --- | --- |
| squash and stretch | a ball flattens on impact, lengthens in flight | S(sx, sy, sz) with sx·sy·sz = 1, about the contact point |
| slow in and slow out | ease at every key | s(t); flat tangents |
| arcs | motion follows curves | the spline, not the polyline |
| anticipation | a small move opposite the main one | an extra key, an overshooting handle |
| follow-through | parts keep moving after the body stops | channels offset in time, or a spring |
| timing | frame count sets weight | key spacing on the time axis |


---

## Worked: squash at constant volume

| sy | 0.5 | 0.8 | 1.2 | 1.5 | 2 |
| --- | --- | --- | --- | --- | --- |
| sx = sz = 1/√sy | 1.414 | 1.118 | 0.913 | 0.816 | 0.707 |
| volume sx·sy·sz | 1 | 1 | 1 | 1 | 1 |

- squash about the **contact point**; stretch along the **velocity**, which needs a rotation into the velocity frame first


---

## Never lerp the matrices

Blend the identity and `R_z(90)` entry by entry at `t = 0.5`:

```text
   M = ½ I + ½ R = [ 0.5  −0.5 ]
                   [ 0.5   0.5 ]
   columns of length 0.707, det 0.5:   the object shrinks to half its area
   half turn, R_z(180):                the blend is the zero matrix, det 0: gone
```

- a matrix blend is not a rotation; the columns stop being unit and orthogonal
- blend **the parts**: translations by lerp, rotations by slerp or nlerp, scales by lerp (or in log space)


---

## Keyed rotations: slerp between keys

- each pair of orientation keys is blended by the rotation topic's **slerp**: constant angular speed along the shortest arc
- the chapter's pair: identity to 120° about y; at t = 0.25 slerp gives **30°** exactly; normalized lerp gives **27.8°**
- games use normalized lerp between dense keys: the speed error is invisible over a few degrees


---

## Pitfall: yaw keys at 350° and 10°

Two keys 20° apart across the wrap of the angle:

```text
   Euler channel, linear:  350 → 10   sweeps  340°   the long way round, through 180
   quaternions:  q(350°) = (0, 0.0872, 0, −0.9962)     q(10°) = (0, 0.0872, 0, 0.9962)
   dot = −0.985 < 0  →  negate one  →  slerp turns  20°
```

- exporters **unwrap** Euler channels (350 → 370) or key **quaternions** with the sign check


---

## More than two keys: squad

<img src="../../textbook/figures/anim-squad.svg" alt="a chain of slerps with a corner at each key, and a squad curve through the same keys without the corner" style="height:190px">

A chain of slerps turns at constant speed between keys but **kinks** at each key: the angular speed jumps from 60 to 82.8 degrees per unit at the middle key of the chapter's example. **Squad** (spherical quadrangle) adds inner control quaternions and holds the speed across the key: 65.1 before, 65.2 after.


---

## Squad, worked

Keys: **q0** identity, **q1** = 60° about y, **q2** = 120° about y then 60° about x:

```text
   s1 = q1 · exp(−¼ [ log(q1⁻¹ q2) + log(q1⁻¹ q0) ])  = (−0.068, 0.506, −0.118, 0.852)

   squad(t) = slerp( slerp(q0, q1, t),  slerp(s0, s1, t),  2t(1 − t) )        s0 = q0

   t = 0.5:  slerp (0, 0.259, 0, 0.966), 30° about y
             squad (−0.018, 0.261, −0.031, 0.965), 4.1° away: already leaning toward x
```


---

## Interpolate the parts, then rebuild

Halfway between **A** = identity and **B** = T(2, 0, 0) · R_y(90°) · S(2):

```text
   matrix lerp:  column 0 = (0.5, 0, −1):  length 1.118, rotation 63.4°
                 sends (1, 0, 0) to (1.5, 0, −1)
   parts:        t = (1, 0, 0),  R_y(45°) by slerp,  s = 1.5
                 sends (1, 0, 0) to (2.061, 0, −1.061)
```

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

Links `l1 = 1`, `l2 = 0.8`; target `(1.2, 0.9)`, distance `d = 1.5`:

```text
   law of cosines at the elbow:  cos θ2 = (d² − l1² − l2²) / (2 l1 l2) = (2.25 − 1 − 0.64) / 1.6 = 0.3812
                                 θ2 = 67.6°
   shoulder:  θ1 = atan2(0.9, 1.2) − atan2(l2 sin θ2, l1 + l2 cos θ2) = 36.87° − 29.54° = 7.3°
   elbow at (cos 7.3°, sin 7.3°) = (0.992, 0.128);  forward kinematics back to the tip: (1.2, 0.9)
```


---

## IK has two answers, or none

```text
   elbow down:  θ1 = 7.3°,   θ2 = 67.6°      elbow at (0.992, 0.128)
   elbow up:    θ1 = 66.4°,  θ2 = −67.6°     elbow at (0.4, 0.916)
   target (2, 0.5):  d = 2.062 > l1 + l2 = 1.8   unreachable: acos of a number above 1
```

Solvers pick a branch (a pole vector for knees and elbows) and **clamp** unreachable targets to the reach circle.


---

## Long chains: solve by iteration

- **cyclic coordinate descent** (CCD): rotate one joint at a time so the end effector points at the target; sweep the chain until close
- **Jacobian** methods: linearize the end-effector position in the joint angles, take a pseudo-inverse step, repeat
- real rigs add **joint limits**, a preferred bend, and the pole target
- IK keeps **feet planted** on uneven ground and **hands on handles** while the rest of the body is keyframed


---

## Skinning: one mesh, many bones

<img src="../../textbook/figures/anim-skinning.svg" alt="a bent limb whose vertices near the joint follow a blend of the two bones' transforms" style="height:210px">

A character is **one** mesh; each vertex follows a **weighted blend** of a few bones' transforms. Near a joint the weights share; far from it one bone owns the vertex.


---

## Linear blend skinning

```text
   v' = Σ  wᵢ · Wᵢ · Bᵢ⁻¹ · v          Σ wᵢ = 1
         i

   Bᵢ   bone i's world matrix in the bind pose (when the mesh was attached)
   Wᵢ   bone i's world matrix now
   Bᵢ⁻¹ takes the vertex into bone i's frame; Wᵢ carries it back out, posed
```

Games cap influences at **4 bones per vertex** (glTF stores `JOINTS_0` and `WEIGHTS_0` as four each).


---

## Worked: one vertex, two bones

Vertex `(1.5, 0.1, 0)`, weights `0.5 / 0.5`. Bone A rotates `30°` about z at the origin; bone B (bind at `x = 1`) adds a local `45°` at its joint:

```text
   under A:   (1.249, 0.837, 0)
   under B:   (0.899, 1.009, 0)
   blended:   (1.074, 0.923, 0)          distance to the joint: 0.51 at rest → 0.471 posed
```

The blended point lies **between** the two rigid answers, and **closer to the joint** than either.


---

## Pitfall: the candy wrapper

2D vertex `(2, 0.4)`, weight `0.5`, bone B turns about `(2, 0)`:

```text
   B turns 90°:    B's image (1.6, 0),   blend (1.8, 0.2):   distance from the pivot 0.4 → 0.283
   B turns 180°:   B's image (2, −0.4),  blend (2, 0):       distance 0: the limb collapses to its axis
```

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


---

## Blend shapes: faces

- a face has few bones and many shapes: a smile, a blink, a raised brow
- each **blend shape** (morph target) stores a full set of vertex **offsets** from the neutral face
- the posed face is **neutral + Σ wₖ · offsetₖ**: the skinning sum, on positions instead of matrices
- Unity: `SkinnedMeshRenderer.SetBlendShapeWeight`; three.js: `mesh.morphTargetInfluences`


---

## Motion capture

- markers on a performer, tracked by cameras at **120 or more** frames per second, **solved** into joint angles on a matching skeleton
- the result: one key per frame on every channel: 60 joints × 3 rotation channels × 120 frames per second = **21,600 keys per second**
- edited in the same curve editor, after a **filtering** pass that removes marker jitter


---

## Retargeting: copy angles, then fix contacts

The performer's thigh is **0.45 m**, the character's **0.36 m**; the hip is at **30°** from vertical:

```text
   copy the angle:      knee 0.36 · sin 30° = 0.18 m forward      the bone keeps its length
   copy the position:   knee 0.45 · sin 30° = 0.225 m forward     the thigh must stretch 25 %
```

- retargeting copies **rotations**, never positions
- shorter legs at the same angles leave the feet **sliding or sinking**: IK repairs the contacts


---

## Blend trees: many clips, one pose

A **blend tree** maps a parameter to a weighted blend of clips, joint by joint:

```text
   walk clip at 1.5 m/s,  run clip at 4 m/s,  speed 2.5 m/s:
      run weight  = (2.5 − 1.5) / (4 − 1.5) = 0.4        walk weight 0.6
   one knee: 20° in the walk, 60° in the run (same axis):
      slerp(walk, run, 0.4) = 20° + 0.4 · 40° = 36°
```

- the clips share a **phase**, so the feet of the walk and the run land together
- transitions cross-fade the same way, with a weight that ramps over a fraction of a second

