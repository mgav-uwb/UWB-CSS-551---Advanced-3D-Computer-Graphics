<!--
  CSS 551 · L19, Tuesday December 8 (online): Learned Scenes.
  Plan C (planning/css551-au26-plan-c-2026-09-29.md), week 11.
  Re-sequenced 2026-10-25 (was L18, Thursday December 3, opened by paper Quiz 7): a Tuesday online
  meeting with no quiz; the HW8 walk-through moved to Lecture 18, when HW8 goes out.

  COMPOSITION: index.html mounts L19-open.md (title + tonight), then
  ../../topics/learned-scenes.md (~94 min), then L19-discuss.md (the wrap), then
  ../../topics/learned-scenes-supplement.md (~98 min, time permitting, or reading).
  EDIT 2026-11-24 LESS MATH (Marcel: "PCA, eigenvalues, hilbert spaces... way over the math level of the
  class. can the following lectures use less math?"): the topic is a method survey of 40 slides; every
  derivation and worked number moved to its supplement; Tonight and the plan follow.

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence; no "next time".

  Plan (120 min, Tue 5:45-7:45 PM synchronous online; 43 slides before the supplement):
    0:00  Opening                                        2 min
    0:02  Learned scenes (topic, 40 slides)             94 min
    1:36  Wrap                                           2 min
    1:38  Questions, HW8 help; buffer                   22 min
    2:00  end
    After the wrap: the supplement (49 slides), time permitting, or reading.
  CUT 2026-10-08: the three discussion questions; their 6 minutes are questions and buffer.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 19: Learned Scenes**

> The original NeRF, a neural radiance field (2020), stores a whole scene in one network of eight layers of 256 units: a few hundred thousand weights.

<small>course text, Learned Scenes</small>

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Poses first**: structure from motion and triangulation; capturing a scene well
- **NeRF**: a scene stored in a network; rays marched and **composited front to back**; what training cannot see
- **Faster and sharper**: hash grids, cones against aliasing, unbounded scenes, signed distances
- **3D Gaussian splatting**: **project, sort, blend**, grow; popping; a real scene, live
- **Back to meshes, and judging a scene**: marching cubes, flat splats; three image metrics

<small>Reading: the course text, <a href="../../textbook/learned-scenes.html">Learned Scenes</a>; worked numbers in the supplement after the wrap.</small>

