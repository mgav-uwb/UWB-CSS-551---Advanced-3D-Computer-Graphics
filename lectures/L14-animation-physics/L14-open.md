<!--
  CSS 551 · Lecture 14 (Tuesday November 17, week 8, online): Animation and Physics.
  Mounts, in order: L14-open.md, ../../topics/animation.md (the core, ~45 min, 20 slides with its title),
  ../../topics/physics-simulation.md (the core, ~50 min, 21 slides with its title), L14-discuss.md (the wrap),
  then, after the wrap, time permitting or as reading: ../../topics/animation-supplement.md (26 slides) and
  ../../topics/physics-simulation-supplement.md (26 slides), the worked numbers behind the methods.
  Re-sequenced 2026-10-25 (was Lecture 10, Tuesday November 3): after ray and path tracing, the last
  lecture before the neural weeks.

  Goals: a qualitative survey of the methods that move a scene, each by the problem it solves, its idea,
  how it breaks and who uses it: keyframes, easing, blending transforms, slerp, forward and inverse
  kinematics and the IK solver families, skinning; particles and springs, stability and substeps,
  implicit steps and constraints, collision detection and response, level sets, fluids, rigid bodies and
  ragdolls. The outcomes are in each topic's header. Graded: Quiz 6 (opens Thursday) asks a slerp angle
  and substeps for a stiffer cloth; the final asks a linear in-between and a Verlet step; each rule is
  stated on a core slide. No homework covers this lecture.

  Minute plan (120 min, Tue 5:45-7:45 PM synchronous online), at the room's pace (about 2.4 min a slide;
  41 core slides, 9 of them demos):
    0:00  opening                                     2 min
    0:02  animation, a survey of methods             45 min
    0:47  physics, a survey of simulation methods    50 min   (start by 0:55: both graded physics
                                                               rules sit in its first nine slides)
    1:37  wrap                                        2 min
    1:39  questions, HW5 and HW6 help; buffer        21 min
    2:00  end
  If animation runs long, skip "Forward kinematics, live", then "Easing, live". If physics runs long,
  skip "Tunneling, live", then "Fluids: particles or grids".
  REWRITTEN 2026-11-17 (Marcel: "can we make the lecture more a qualitative review of methods for the more
  advanced topics: forward vs inverse kinematics, springs and particles, level sets, collision detections,
  etc. the math is too advanced for this audience to cover in any detail"): both cores rewritten as method
  surveys; the worked slides moved to the supplements; collision detection, response and level sets added
  to the core (see the topic headers).
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

- **Where motion comes from**: keyframes, inverse kinematics, motion capture, simulation, blended clips
- **Keyframes**: in-betweening, splines and easing; blend a transform's parts, never its matrix; slerp
- **Skeletons**: forward against inverse kinematics, how IK solvers work (live), skinning and the candy wrapper
- **Simulation**: particles and springs, why stiff springs explode, substeps, implicit steps and constraints (live)
- **Collisions and beyond**: broad and narrow phase, tunneling, response, level sets, fluids, rigid bodies and ragdolls

Reading: [Animation and Interpolation](../../textbook/animation.html), Sections 1, 3 to 10, 12 and 13.
