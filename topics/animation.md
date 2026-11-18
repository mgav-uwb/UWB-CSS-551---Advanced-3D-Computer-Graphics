<!--
  CSS 551 · TOPIC DECK: Animation: a survey of methods (the core, ~45 min, 20 slides).
  Mounted as <section data-markdown="../../topics/animation.md">. No logistics.

  GOALS: know the methods that move a character, what problem each solves, how it works in one picture,
    where it breaks and who uses it: keyframes and in-betweening, easing, blending transforms by their
    parts, slerp, skeletons, forward against inverse kinematics and the IK solver families, skinning,
    blend shapes, motion capture and blend trees.
  OUTCOMES (students can): say which method fits a task (a gesture, a foot on a stair, a face, a
    crowd of walk cycles); give a linear in-between; say why a linear path jerks at a key and a spline
    does not; separate path from timing; say why matrices are never blended and what is blended instead;
    say how far a slerp has turned (u times the angle) and why yaw keys at 350 and 10 degrees spin;
    contrast FK and IK and name what each IK solver family does and how IK fails (two answers, none,
    popping); say what linear blend skinning averages and why a twisting joint pinches.
  TEACHES: the same as OUTCOMES, qualitatively. The worked numbers (the in-between and the spline at
    t = 0.35, the matrix midpoint, the yaw quaternions, the two-link solution, the skinning formula and
    the candy wrapper's coordinates, skinning code) are in animation-supplement.md, after the wrap.
  NEEDS:   the rotation topic (quaternions, slerp), TRS and the composite rule (the scene-graph topic).
  GRADED from this topic: Quiz 6 (a slerp angle: "Rotations: slerp, the short way round"); the final
    (a linear in-between: "Keyframes and in-betweening"). Both rules stay on those slides.
  DEMOS:   keyframe (t,ease) before anything is defined; keyframe (t,ease,timing) after easing; rig-lab
    view:fk after the skeleton; rig-lab view:ik2 and view:ccd after the IK solvers; rig-lab view:wrapper
    after the candy wrapper. Bare view ids (view:ik2, never view:ik.ik2).
  NUMBERS: textbook/figures/numbers-motion.json key anim (keys, slerp, ik, skinning); smoothstep(0.35)
    = 0.282; the matrix midpoint of I and R_z(90) has columns of length 0.707, of I and R_z(180) is 0.
  READING: ../../textbook/animation.html, Sections 1 and 3 to 7.
  REWRITTEN 2026-11-17 (Marcel: "can we make the lecture more a qualitative review of methods for the
    more advanced topics: forward vs inverse kinematics, springs and particles, level sets, collision
    detections, etc. the math is too advanced for this audience to cover in any detail"): every slide
    states a method's problem, idea, failure and users in words; the worked slides moved, unchanged, to
    the front of animation-supplement.md; new: "Where motion comes from", "Forward or inverse
    kinematics", "How IK solvers work", "Forward kinematics, live", "IK by iteration, live", "Faces,
    performances and blended clips". The 2026-11-13 cut's history is in git.
  ACRONYMS 2026-11-17 (Marcel: "we should define every acronym, always, e.g. ccd. ccd can be better
    explained"): every acronym is spelled out at its first use, on the slides and in the notes; new slide
    "Cyclic coordinate descent (CCD)" before "IK by iteration, live".

  reveal.js: FLAT; notes follow "Note:" and stay plain text. Display math is a raw <div class="tex">
  block typeset by MathJax (lib/deck-math.js; TeX inside, the ASCII form as aria-label, no blank line
  inside); inline math is a code span written `$...$`. Code identifiers stay plain code spans. Never
  two "_" on one markdown line outside a code fence or code span; paths relative to the lecture page.
-->

### Animation: a survey of methods

<small>(~45 min) · reading: <a href="../../textbook/animation.html">Animation and Interpolation</a>, Sections 1 and 3 to 7</small>


---

<!-- .slide: class="demo-full" -->

## Keyframes, live

<div class="cockpit" data-demo="keyframe" data-controls="t,ease"><pre class="viz-fallback">  three keys K0 = (-2.2, 0.5, 0), K1 = (0, 1.9, -0.6), K2 = (2.2, 0.7, 0) at t = 0, 0.5, 1
  controls:  t (0 to 1), path = linear | spline (Catmull-Rom)
  readout:   mode, x, y, z of the in-between</pre></div>


---

## Where motion comes from

| method | who decides the pose | good at | weak at |
| --- | --- | --- | --- |
| **keyframing** | an animator, at a few moments | full control, style | slow to author; contacts drift |
| **inverse kinematics** | a goal: "hand here, foot there" | contacts, reaching, aiming | two answers, or none |
| **motion capture** | a performer in a suit | realistic motion, fast | cleanup; other body sizes |
| **simulation** | physical laws and settings | cloth, hair, debris, water | hard to direct; can explode |
| **blending clips** | the game: speed, direction | responsive characters | only as good as its clips |


---

## Keyframes and in-betweening

- a **keyframe**: one value at a stated time (a position, an angle, a color)
- **in-betweening**: the value at every other time, computed from the keys on either side
- an **animation channel**: one number against time; glTF (Graphics Library Transmission Format) and FBX (Autodesk's Filmbox format) store a translation, a rotation and a scale channel per node
- **linear** in-betweening: a share of the time between two keys is the same share of the way between their values; the demo's `$t = 0.35$` is 70&nbsp;% of the way from the key at `$0$` to the key at `$0.5$`


---

## Straight lines, or a curve through the keys

<div style="display:flex; gap:18px; align-items:center;"><div style="flex:0 0 50%; font-size:0.78em;">

- **linear**: the position is continuous, but the direction **snaps** at every key, and the eye reads the corner as a jerk
- **spline** (Catmull and Rom, 1974): a smooth curve **through** every key; at each key it heads from the previous key toward the next, so there is no corner
- animation tools draw each channel as a curve with handles at the keys: the **curve editor** of Maya, Blender and Unity

</div><div style="flex:1 1 50%;">
<img src="../../textbook/figures/anim-keyframes.svg" alt="the keyframe demo's three keys joined two ways: straight hops in amber that turn by 66 degrees at the middle key, and the Catmull-Rom spline in blue that passes through every key with no corner" style="width:100%; max-height:430px;">
</div></div>


---

## Easing: the same path, retimed

<div style="display:flex; gap:18px; align-items:center;"><div style="flex:0 0 48%; font-size:0.80em;">

- the path fixes **where**; easing fixes **when**: it maps time to progress along the path
- Disney's animators called it **slow in and slow out**: real things start from rest and come to rest
- smoothstep, smootherstep, ease-in-out: the same S, with sharper or softer ends

</div><div style="flex:1 1 52%;">
<img src="../../textbook/figures/anim-easing.svg" alt="progress against time for five easing curves, a straight line and four S shapes of increasing steepness, all through (0, 0), (0.5, 0.5) and (1, 1)" style="width:100%; max-height:430px;">
</div></div>


---

<!-- .slide: class="demo-full" -->

## Easing, live

<div class="cockpit" data-demo="keyframe" data-controls="t,ease,timing"><pre class="viz-fallback">  the same three keys; timing = none | smoothstep | smootherstep | cubic in-out
  the position is path(s(t)); 21 dots mark equal steps of time along the path
  readout: progress s and the position
  t = 0.35, smoothstep:  s = 0.282 (35 % of the time, 28 % of the way)
  play: t from 0 to 1 in 2.5 s</pre></div>


---

## Blend the parts, never the matrix

- average "no turn" and "a quarter turn" as matrices, entry by entry: the object **shrinks to 71&nbsp;%** in each direction; average across a half turn and it **vanishes**
- an average of rotation matrices is not a rotation
- so animation stores **translation, rotation and scale** separately and blends each by its own rule: positions and scales along straight lines, rotations along the sphere
- the matrix is rebuilt from the blended parts every frame; a camera blends its position and its orientation, then rebuilds its view


---

## Rotations: slerp, the short way round

- **slerp** turns at a constant speed along the shortest arc: at blend parameter `$u$` it has turned `$u$` times the whole angle; a quarter of the way through a 120° turn, 30°
- **Euler angle** keys are plain numbers: yaw keys at 350° and 10° are 20° apart, but a straight line between the numbers spins **340° the long way**
- **quaternion** keys take the 20° arc after the sign check from the rotation topic; exporters also **unwrap** Euler channels (350 to 370)
- games often use a normalized straight-line blend between dense keys: the difference is invisible over a few degrees


---

## A skeleton is a scene graph of joints

- each **joint** is a node; its local transform is a **rotation** about the joint (plus a fixed offset to the parent)
- the animator keys joint angles; each frame the angles are multiplied down the chain: the scene graph's composite rule
- most character animation is authored this way: rotation channels on every joint, one translation channel on the root (the hips)


---

<!-- .slide: class="demo-full" -->

## Forward kinematics, live

<div class="cockpit" data-demo="rig-lab" data-controls="view:fk"><pre class="viz-fallback">  a chain of three bones (1, 0.8 and a hand): joint angles in, the hand's position out
  controls:  θ₁ shoulder, θ₂ elbow, θ₃ wrist, the hand's length; play swings a joint
  presets:   straight, curled, folded back, the inverse kinematics slide's two-link arm
  every joint's angle is relative to its parent, so turning the shoulder carries the whole arm</pre></div>


---

## Forward or inverse kinematics

| | forward kinematics (FK) | inverse kinematics (IK) |
| --- | --- | --- |
| the animator sets | every joint's angle | where the hand or foot must be |
| the computer finds | where the hand ends up | the joint angles |
| natural for | swings, gestures, tails, arcs | feet on stairs, a hand on a rail, aiming, looking |
| goes wrong when | a contact must hold: every joint needs new keys | the goal is out of reach, or several poses reach it |

Rigs mix both: FK on the spine and arms by default, IK on the legs, switchable limb by limb.


---

## How IK solvers work

- **two bones** (an arm, a leg): the upper bone, the lower bone and the line to the target form a triangle with known sides; one formula gives the angles, exactly and instantly
- **one joint at a time**, cyclic coordinate descent (CCD): turn each joint so the tip points at the target, from the tip back to the root, and sweep the chain until close; cheap, for spines, tails and tentacles
- **all joints at once** (the Jacobian methods of robotics): estimate how a small turn of each joint moves the tip, turn them all a little toward the target, repeat; smooth, and handles several goals together
- in engines: Unity's Animation Rigging (Two Bone IK, Chain IK); three.js `CCDIKSolver`


---

## IK has two answers, or none

<div style="display:flex; gap:18px; align-items:center;"><div style="flex:0 0 56%; font-size:0.78em;">

- a two-bone arm reaches most targets **two ways**, elbow up or elbow down; a rig picks one with a **pole target** that says which way the knee or elbow points
- **out of reach**: no pose touches the target; the solver straightens the arm toward it
- long chains have **endless** answers: solvers add joint limits and a preferred pose
- near full stretch a small move of the target makes a large change of angle: knees **pop** as a leg straightens

</div><div style="flex:1 1 44%;">
<img src="../../textbook/figures/anim-ik.svg" alt="a two-link arm reaching for a target, with the elbow-up and elbow-down solutions drawn" style="width:100%; max-height:430px;">
</div></div>


---

<!-- .slide: class="demo-full" -->

## Inverse kinematics, live

<div class="cockpit" data-demo="rig-lab" data-controls="view:ik2"><pre class="viz-fallback">  a two-link arm, l1 = 1 and l2 = 0.8; drag the target, or a preset
  the lecture's target (1.2, 0.9):  cos θ2 = 0.381, θ1 = 7.3°, θ2 = 67.6°
  the other elbow:                  θ1 = 66.4°, θ2 = −67.6°
  out of reach (2, 0.5):            cos θ2 = 1.631, the arm points at the target, stretched
  stretched (1.8, 0), folded (0.2, 0), inside the fold (0.05, 0)</pre></div>


---

## Cyclic coordinate descent (CCD)

<div style="font-size:0.8em;">

The **end effector** is the chain's tip: the hand, the foot, the end of the tail. One **sweep** runs from the joint nearest the tip back to the root:

1. at the current joint, draw two arrows: one to the end effector, one to the target
2. turn the joint by the angle between the arrows: the end effector swings onto the line toward the target
3. keep that angle and move one joint toward the root
4. at the root the sweep is done; sweep again until the end effector is within a tolerance of the target, or a step limit is reached

- **strengths**: no matrix to build or invert, so it is a few lines of code and never blows up near full stretch, where the Jacobian methods need damping; a joint limit is one clamp per turn; no turn ever moves the end effector farther from the target
- **weaknesses**: the joints nearest the tip turn first and most, so a long chain **curls**; it places the end effector but not its orientation; a long chain that has to straighten takes many sweeps, where FABRIK (forward and backward reaching inverse kinematics) usually needs fewer

</div>


---

<!-- .slide: class="demo-full" -->

## IK by iteration, live

<div class="cockpit" data-demo="rig-lab" data-controls="view:ccd"><pre class="viz-fallback">  a four-joint arm and a target; cyclic coordinate descent, one joint per step
  at each step: the joint, the direction to the tip and the direction to the target; turn by the angle between
  step, run, restart, follow the target; the error |target − tip| plotted against joint rotations
  presets: a near target (1, 0.6), a far target (2.4, 1.2), behind the base (−1.5, −0.5), out of reach (3.5, 1.5)</pre></div>


---

## Skinning: one mesh, many bones

<div style="display:flex; gap:18px; align-items:center;"><div style="flex:0 0 52%; font-size:0.76em;">

- a character is **one** mesh, modeled once in a rest pose with the skeleton inside it
- each bone carries a vertex **rigidly**, as if glued to that bone alone: one candidate position per bone
- **linear blend skinning**: the vertex goes to the **weighted average** of its candidates; near a joint the weights are shared, far from it one bone owns the vertex
- artists **paint** the weights; games allow up to 4 bones per vertex; the GPU (graphics processing unit) does the averaging

</div><div style="flex:1 1 48%;">
<img src="../../textbook/figures/anim-skinning.svg" alt="a bent limb whose vertices near the joint follow a blend of the two bones' transforms; at 90 degrees the strip thins at the joint, at 180 degrees it collapses" style="width:100%; max-height:430px;">
</div></div>


---

## Pitfall: the candy wrapper

- the average of two points on a circle lies **inside** the circle: a skin bent or twisted at a joint **shrinks** there
- at a half twist, the two bones carry a vertex to opposite sides of the limb, and the average lands **on the axis**: the forearm pinches like a candy wrapper
- linear blending of rotations is the matrix-blend failure again
- fixes: **dual quaternion skinning** (Kavan et al., 2007) blends the rotations themselves; extra twist bones; corrective shapes


---

<!-- .slide: class="demo-full" -->

## The candy wrapper, live

<div class="cockpit" data-demo="rig-lab" data-controls="view:wrapper"><pre class="viz-fallback">  a tube skinned to two bones; bone B twists about the tube's axis
  linear blend skinning against dual quaternion skinning, side by side
  ring radius at the joint (linear, dual quaternion):
    0°: 1.000, 1.000    90°: 0.707, 1.000    180°: 0.000, 1.000    270°: 0.707, 1.000</pre></div>


---

## Faces, performances and blended clips

- **blend shapes** (faces): an artist sculpts a smile, a blink, a raised brow as offsets from the neutral face; the posed face adds them with weights an animator keys
- **motion capture**: cameras track markers on a performer at 120 frames a second or more, solved into joint angles: realistic motion in minutes, then days of cleanup
- **retargeting**: copy the performer's joint **rotations** onto a character of another size; the feet then slide, and IK pins them back down
- **blend trees**: a game mixes a walk clip and a run clip by the character's speed, joint by joint with slerp, then IK puts the feet on the ground
