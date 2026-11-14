<!--
  CSS 551 · TOPIC DECK: Animation, further (~25 min, 17 slides), mounted after the lecture's wrap, time permitting.
  Cut 2026-11-13 from topics/animation.md (L14): the slides the core does not build on, in the topic's order.
  Numbers: textbook/figures/numbers-motion.json key anim, and the computations listed in animation.md's
  history (git) header: spline speeds, squad, retargeting, blend tree, motion capture.
  NEEDS: topics/animation.md.
  reveal.js: FLAT; notes follow "Note:" and stay plain text; display formulas are MathJax blocks
  (lib/deck-math.js; TeX inside, the ASCII form as aria-label); inline math is a code span `$...$`;
  never two "_" on one markdown line outside a code fence or code span.
-->

### Supplement: animation, further

<small>(~25 min, time permitting) · reading: <a href="../../textbook/animation.html">Animation and Interpolation</a>, Sections 1 to 7 and 11</small>


---

## Worked: the spline at t = 0.35

Local parameter `$s = 0.7$` on the first piece:

<div class="tex" style="font-size:0.66em" role="img" aria-label="Hermite weights:  h00 = 2s³ − 3s² + 1   h10 = s³ − 2s² + s   h01 = −2s³ + 3s²   h11 = s³ − s²
c(s) = h00·K0 + h10·m0 + h01·K1 + h11·m1
h00 = 0.216    h10 = 0.063    h01 = 0.784    h11 = −0.147
c = 0.216 K0 + 0.063 m0 + 0.784 K1 − 0.147 m1 = (−0.66, 1.671, −0.508)
linear, same t:                                 (−0.66, 1.48,  −0.42)">
\[
\begin{gathered}
h_{00} = 2s^3 - 3s^2 + 1 \quad h_{10} = s^3 - 2s^2 + s \quad h_{01} = -2s^3 + 3s^2 \quad h_{11} = s^3 - s^2 \\[2pt]
c(s) = h_{00}\,K_0 + h_{10}\,m_0 + h_{01}\,K_1 + h_{11}\,m_1 \\[8pt]
h_{00} = 0.216 \qquad h_{10} = 0.063 \qquad h_{01} = 0.784 \qquad h_{11} = -0.147 \\[8pt]
\begin{aligned}
c &= 0.216\,K_0 + 0.063\,m_0 + 0.784\,K_1 - 0.147\,m_1 = (-0.66,\ 1.671,\ {-0.508}) \\
\text{linear, same } t &= (-0.66,\ 1.48,\ {-0.42})
\end{aligned}
\end{gathered}
\]
</div>

- same `$x$` (the keys are evenly spaced in `$x$`); the spline is **0.19 higher** and **0.09 farther back**, bulging past the chord


---

## Pitfall: a spline is not a speed

Speed along the demo's spline, per unit t:

| `$s$` on the piece | 0 | 0.25 | 0.5 | 0.75 | 1 |
| --- | --- | --- | --- | --- | --- |
| piece 1 (length 2.715) | 5.35 | 5.91 | 5.79 | 5.07 | 4.40 |
| piece 2 (length 2.620) | 4.40 | 4.90 | 5.56 | 5.67 | 5.15 |

- the parameter is **not distance**: the object speeds up and slows down by **34 %** with no visible cause
- fix: reparametrize by **arc length**, then drive the distance with an easing curve (a motion-path constraint)


---

## The curve editor: a channel is a Bézier

<img src="../../textbook/figures/anim-editor.svg" alt="one channel segment with two Bezier handles, and the same segment with the in-handle dragged past the next key so the curve doubles back in time" style="height:220px">

- keys `$(t_0, v_0)$` and `$(t_1, v_1)$`, out-handle `$h_0$`, in-handle `$h_1$`: a cubic Bézier in the (time, value) plane
- with control points `$P_0 = (t_0, v_0)$`, `$P_1 = h_0$`, `$P_2 = h_1$`, `$P_3 = (t_1, v_1)$`: `$B(s) = (1-s)^3 P_0 + 3(1-s)^2 s P_1 + 3(1-s) s^2 P_2 + s^3 P_3$`
- the value at time `$\tau$` is `$y(s^*)$` where `$x(s^*) = \tau$`: a root-find, one per evaluation


---

## Worked: reading a value off the channel

Keys `$(0, 0)$` and `$(1, 2)$`; handles `$(0.5, 1.2)$` and `$(0.6, 2.4)$`. The value at time `$0.35$`:

<div class="tex" style="font-size:0.72em" role="img" aria-label="bisection on x(s) = 0.35:   s* = 0.2888
value:                      y(s*) = 1.001
slope at the first key:     1.2 / 0.5 = 2.4 units per second   (the handle's slope)
slope at the second key:    (2 − 2.4) / (1 − 0.6) = −1
on the way:                 the value peaks at 2.078 at time 0.854, then comes down to 2">
\[
\begin{aligned}
\text{bisection on } x(s) = 0.35\text{:} &\quad s^* = 0.2888 \\
\text{value:} &\quad y(s^*) = 1.001 \\[6pt]
\text{slope at the first key:} &\quad 1.2 / 0.5 = 2.4 \text{ units per second (the handle's slope)} \\
\text{slope at the second key:} &\quad (2 - 2.4) / (1 - 0.6) = -1 \\
\text{on the way:} &\quad \text{peaks at } 2.078 \text{ at time } 0.854, \text{ then comes down to } 2
\end{aligned}
\]
</div>


---

## Pitfall: a handle past the next key

Drag the in-handle to `$(1.3, 2.4)$`, past the key at time `$1$`:

<div class="tex" role="img" aria-label="x(s) climbs to 1.066 at s = 0.849, then returns to 1
at time 1 the channel has two values:  1.952  and  2">
\[
\begin{gathered}
x(s) \text{ climbs to } 1.066 \text{ at } s = 0.849, \text{ then returns to } 1 \\
\text{at time } 1 \text{ the channel has two values: } 1.952 \text{ and } 2
\end{gathered}
\]
</div>

- the root-find has **no unique answer**; the channel doubles back in time
- editors **clamp** handles inside `$[t_0, t_1]$`, or switch to weighted tangents where only the slope is set
- engines get channels **baked**: dense samples or Hermite tangents, no root-find at run time


---

## Worked: smoothstep at t = 0.35

<div class="tex" style="font-size:0.7em" role="img" aria-label="t² = 0.1225     t³ = 0.042875
s = 3 · 0.1225 − 2 · 0.042875 = 0.3675 − 0.08575 = 0.282
other curves at t = 0.35:   smootherstep 0.235   cubic 0.171   CSS 0.256   linear 0.35
linear path at s = 0.282:   (−0.96, 1.29, −0.34)      instead of   (−0.66, 1.48, −0.42)">
\[
\begin{gathered}
t^2 = 0.1225 \qquad t^3 = 0.042875 \\
s = 3 \cdot 0.1225 - 2 \cdot 0.042875 = 0.3675 - 0.08575 = 0.282 \\[8pt]
\text{other curves at } t = 0.35\text{:} \quad \text{smootherstep } 0.235 \quad \text{cubic } 0.171 \quad \text{CSS } 0.256 \quad \text{linear } 0.35 \\
\text{linear path at } s = 0.282\text{:} \quad (-0.96,\ 1.29,\ {-0.34}) \quad \text{instead of} \quad (-0.66,\ 1.48,\ {-0.42})
\end{gathered}
\]
</div>

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
| squash and stretch | a ball flattens on impact, lengthens in flight | `$S(s_x, s_y, s_z)$` with `$s_x s_y s_z = 1$`, about the contact point |
| slow in and slow out | ease at every key | `$s(t)$`; flat tangents |
| arcs | motion follows curves | the spline, not the polyline |
| anticipation | a small move opposite the main one | an extra key, an overshooting handle |
| follow-through | parts keep moving after the body stops | channels offset in time, or a spring |
| timing | frame count sets weight | key spacing on the time axis |


---

## Worked: squash at constant volume

| `$s_y$` | 0.5 | 0.8 | 1.2 | 1.5 | 2 |
| --- | --- | --- | --- | --- | --- |
| `$s_x = s_z = 1/\sqrt{s_y}$` | 1.414 | 1.118 | 0.913 | 0.816 | 0.707 |
| volume `$s_x s_y s_z$` | 1 | 1 | 1 | 1 | 1 |

- squash about the **contact point**; stretch along the **velocity**, which needs a rotation into the velocity frame first


---

## More than two keys: squad

<img src="../../textbook/figures/anim-squad.svg" alt="a chain of slerps with a corner at each key, and a squad curve through the same keys without the corner" style="height:190px">

A chain of slerps turns at constant speed between keys but **kinks** at each key: the angular speed jumps from 60 to 82.8 degrees per unit at the middle key of the chapter's example. **Squad** (spherical quadrangle) adds inner control quaternions and holds the speed across the key: 65.1 before, 65.2 after.


---

## Squad, worked

Keys: `$q_0$` identity, `$q_1$` is `$60^\circ$` about `$y$`, `$q_2$` is `$120^\circ$` about `$y$` then `$60^\circ$` about `$x$`:

<div class="tex" style="font-size:0.74em" role="img" aria-label="s1 = q1 · exp(−¼ [ log(q1⁻¹ q2) + log(q1⁻¹ q0) ])  = (−0.068, 0.506, −0.118, 0.852)
squad(t) = slerp( slerp(q0, q1, t),  slerp(s0, s1, t),  2t(1 − t) )        s0 = q0
t = 0.5:  slerp (0, 0.259, 0, 0.966), 30° about y
          squad (−0.018, 0.261, −0.031, 0.965), 4.1° away: already leaning toward x">
\[
\begin{gathered}
s_1 = q_1 \exp\!\Big({-\tfrac14}\big[\log(q_1^{-1} q_2) + \log(q_1^{-1} q_0)\big]\Big) = (-0.068,\ 0.506,\ {-0.118},\ 0.852) \\[8pt]
\operatorname{squad}(t) = \operatorname{slerp}\big(\operatorname{slerp}(q_0, q_1, t),\ \operatorname{slerp}(s_0, s_1, t),\ 2t(1 - t)\big), \qquad s_0 = q_0 \\[8pt]
\begin{aligned}
t = 0.5\text{:} \quad \operatorname{slerp} &= (0,\ 0.259,\ 0,\ 0.966), \quad 30^\circ \text{ about } y \\
\operatorname{squad} &= (-0.018,\ 0.261,\ {-0.031},\ 0.965) \\
& 4.1^\circ \text{ away: already leaning toward } x
\end{aligned}
\end{gathered}
\]
</div>


---

## Long chains: solve by iteration

- **cyclic coordinate descent** (CCD): rotate one joint at a time so the end effector points at the target; sweep the chain until close
- **Jacobian** methods: linearize the end-effector position in the joint angles, take a pseudo-inverse step, repeat
- real rigs add **joint limits**, a preferred bend, and the pole target
- IK keeps **feet planted** on uneven ground and **hands on handles** while the rest of the body is keyframed


---

## Worked: one vertex, two bones

Vertex `$(1.5, 0.1, 0)$`, weights `$0.5$` and `$0.5$`. Bone `$A$` rotates `$30^\circ$` about `$z$` at the origin; bone `$B$` (bind at `$x = 1$`) adds a local `$45^\circ$` at its joint:

<div class="tex" style="font-size:0.74em" role="img" aria-label="under A:   (1.249, 0.837, 0)
under B:   (0.899, 1.009, 0)
blended:   (1.074, 0.923, 0)          distance to the joint: 0.51 at rest → 0.471 posed">
\[
\begin{aligned}
\text{under } A\text{:} &\quad (1.249,\ 0.837,\ 0) \\
\text{under } B\text{:} &\quad (0.899,\ 1.009,\ 0) \\
\text{blended:} &\quad (1.074,\ 0.923,\ 0), \qquad \text{distance to the joint: } 0.51 \text{ at rest} \to 0.471 \text{ posed}
\end{aligned}
\]
</div>

The blended point lies **between** the two rigid answers, and **closer to the joint** than either.


---

## Blend shapes: faces

- a face has few bones and many shapes: a smile, a blink, a raised brow
- each **blend shape** (morph target) stores a full set of vertex **offsets** from the neutral face
- the posed face is `$\text{neutral} + \sum_k w_k\,\text{offset}_k$`: the skinning sum, on positions instead of matrices
- Unity: `SkinnedMeshRenderer.SetBlendShapeWeight`; three.js: `mesh.morphTargetInfluences`


---

## Motion capture

- markers on a performer, tracked by cameras at **120 or more** frames per second, **solved** into joint angles on a matching skeleton
- the result: one key per frame on every channel: 60 joints × 3 rotation channels × 120 frames per second = **21,600 keys per second**
- edited in the same curve editor, after a **filtering** pass that removes marker jitter


---

## Retargeting: copy angles, then fix contacts

The performer's thigh is **0.45 m**, the character's **0.36 m**; the hip is at **30°** from vertical:

<div class="tex" style="font-size:0.7em" role="img" aria-label="copy the angle:      knee 0.36 · sin 30° = 0.18 m forward      the bone keeps its length
copy the position:   knee 0.45 · sin 30° = 0.225 m forward     the thigh must stretch 25 %">
\[
\begin{aligned}
\text{copy the angle:} &\quad \text{knee } 0.36 \sin 30^\circ = 0.18 \text{ m forward} && \text{the bone keeps its length} \\
\text{copy the position:} &\quad \text{knee } 0.45 \sin 30^\circ = 0.225 \text{ m forward} && \text{the thigh must stretch } 25\,\%
\end{aligned}
\]
</div>

- retargeting copies **rotations**, never positions
- shorter legs at the same angles leave the feet **sliding or sinking**: IK repairs the contacts


---

## Blend trees: many clips, one pose

A **blend tree** maps a parameter to a weighted blend of clips, joint by joint:

<div class="tex" role="img" aria-label="walk clip at 1.5 m/s,  run clip at 4 m/s,  speed 2.5 m/s:
   run weight  = (2.5 − 1.5) / (4 − 1.5) = 0.4        walk weight 0.6
one knee: 20° in the walk, 60° in the run (same axis):
   slerp(walk, run, 0.4) = 20° + 0.4 · 40° = 36°">
\[
\begin{aligned}
&\text{walk clip at } 1.5 \text{ m/s, run clip at } 4 \text{ m/s, speed } 2.5 \text{ m/s:} \\
&\qquad \text{run weight} = \frac{2.5 - 1.5}{4 - 1.5} = 0.4, \qquad \text{walk weight } 0.6 \\[6pt]
&\text{one knee: } 20^\circ \text{ in the walk, } 60^\circ \text{ in the run (same axis):} \\
&\qquad \operatorname{slerp}(\text{walk},\ \text{run},\ 0.4) = 20^\circ + 0.4 \cdot 40^\circ = 36^\circ
\end{aligned}
\]
</div>

- the clips share a **phase**, so the feet of the walk and the run land together
- transitions cross-fade the same way, with a weight that ramps over a fraction of a second
