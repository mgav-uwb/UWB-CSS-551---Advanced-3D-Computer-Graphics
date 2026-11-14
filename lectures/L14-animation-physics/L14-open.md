<!--
  CSS 551 · Lecture 14 (Tuesday November 17, week 8, online): Animation and Physics.
  Mounts, in order: L14-open.md, ../../topics/animation.md (the core, ~50 min, 19 slides),
  ../../topics/physics-simulation.md (the core, ~46 min, 18 slides), L14-discuss.md (the wrap), then, after
  the wrap, time permitting: ../../topics/animation-supplement.md (~25 min, 17 slides) and
  ../../topics/physics-simulation-supplement.md (~30 min, 18 slides).
  Re-sequenced 2026-10-25 (was Lecture 10, Tuesday November 3): after ray and path tracing, the last
  lecture before the neural weeks.

  Goals: motion is interpolation in the right representation (blend the parts of a transform, never the
  matrix); a skeleton is a scene graph that deforms a mesh; a simulation is a state plus a step rule, and
  the step must respect the stiffness. The outcomes are in each topic's header. Graded: Quiz 6 (opens
  Thursday) asks a slerp angle and substeps for a stiffer cloth; the final asks a linear in-between and a
  Verlet step. No homework covers this lecture.

  Minute plan (120 min, Tue 5:45-7:45 PM synchronous online), at the room's pace (about 2.4 min a slide;
  40 core slides):
    0:00  opening                                     2 min
    0:02  animation, the core (topic)                50 min
    0:52  physics inside the frame loop, the core    46 min   (start by 1:00: both graded physics
                                                               items sit in its first eleven slides)
    1:38  wrap                                        2 min
    1:40  questions, HW5 and HW6 help; buffer        20 min
    2:00  end
  If animation runs long, skip "Real code: skinning on the GPU", then "Pitfall: yaw keys at 350° and 10°".
  CUT 2026-10-08: the four discussion questions (L14-discuss.md); the predict-first slide
  on the spring cloth (physics-simulation.md).
  CUT 2026-11-13 (Marcel: "what are we actually teaching in the animation and physics lectures. let's be
  specific on goals and outcomes"): both topics cut to cores of 19 and 18 slides from 36 and 35; the rest moved
  in order to two supplements after the wrap; the cloth demo now opens physics; errata (see the topic headers).
  Demos: keyframe (t,path) twice, cloth (stiffness,substeps) twice; fluid (viscosity,sound) in the supplement.
  Numbers: numbers-motion.json anim.*, lib/core/sim-cloth.js and sim-fluid.js.

  reveal.js: FLAT; notes follow "Note:" and stay plain text; formulas typeset by lib/deck-math.js
  (see the topic headers); never two "_" on one markdown line outside a code fence or code span;
  no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 14: Animation and Physics**

> Luxo Jr. (1986) was the first 3D computer-animated film nominated for an Academy Award.

<small>59th Academy Awards, 1987</small>

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Keyframes**: in-betweening, the Catmull-Rom spline (live), easing
- **Transforms in motion**: never blend the matrix; slerp between keys; interpolate the parts, then rebuild
- **Skeletons**: forward and inverse kinematics, linear blend skinning and the candy wrapper
- **Physics in the loop**: one spring stepped two ways, energy and the stability limit, Verlet, substeps
- **Cloth and contacts**: springs against constraints (live), pushing a particle out, one bounce

Reading: [Animation and Interpolation](../../textbook/animation.html), Sections 1, 3 to 10, 12 and 13.
