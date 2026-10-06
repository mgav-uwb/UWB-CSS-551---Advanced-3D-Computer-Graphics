<!--
  CSS 551 · Lecture 10 (Tuesday November 3, week 6, online): Animation and Physics.
  Mounts, in order: L10-open.md, ../../topics/animation.md (~46 min, 35 slides),
  ../../topics/physics-simulation.md (~44 min, 36 slides), L10-discuss.md (discussion and wrap).

  Minute plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  opening                                     2 min
    0:02  animation (topic)                          46 min
    0:48  physics inside the frame loop (topic)      44 min
    1:32  discussion: four questions                 24 min
    1:56  wrap                                        4 min
    2:00  end
  Demos: keyframe (t,ease), cloth (stiffness,substeps), fluid (viscosity,sound).
  Numbers: numbers-motion.json anim.*, lib/core/sim-cloth.js and sim-fluid.js, and node
  for the discussion answers (in L10-discuss.md).

  reveal.js: FLAT; notes follow "Note:"; plain-unicode math; never two "_" on one
  markdown line outside a code fence; no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 10: Animation and Physics**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Keyframes and timing**: in-betweening, the Catmull-Rom spline (live), Bézier channels, easing, squash
- **Rotations and transforms**: no matrix lerp, slerp between keys, the Euler wrap, squad, TRS rebuilt
- **Skeletons**: forward and inverse kinematics, skinning and the candy wrapper, blend shapes, motion capture, blend trees
- **Physics in the loop**: one spring three ways, Verlet, substeps, cloth by springs and by constraints (live)
- **Contacts, rigid bodies, hair, fluids**: one bounce, broad and narrow phase, stacking, strands, smoothed particles (live)
- **Discussion**: four questions

Reading: [Animation and Interpolation](../../textbook/animation.html).

