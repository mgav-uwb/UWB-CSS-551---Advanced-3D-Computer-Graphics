<!--
  CSS 551 · TOPIC DECK: Physics: a survey of simulation methods (the core, ~50 min, 23 slides).
  Mounted as <section data-markdown="../../topics/physics-simulation.md">. No logistics.

  GOALS: know the methods that make a scene move by itself, what problem each solves, how it works in
    one picture, where it breaks and who uses it: particles and springs, stepping and its stability,
    substeps, Verlet, implicit integration and constraints, collision detection (broad phase, narrow
    phase, continuous), collision response, level sets (distance fields for collisions, moving liquid
    surfaces), fluids as particles or grids, rigid bodies and ragdolls.
  OUTCOMES (students can): describe a simulation as a state and a step; say why explicit Euler gains
    energy and semi-implicit Euler does not; say why a stiff material needs short steps, and how the
    substeps grow with the stiffness (4 times stiffer, twice the substeps); take one Verlet step; pick
    among substeps, implicit integration and constraints, and say what each costs; say why a constraint
    solver cannot explode; describe broad and narrow phase and why tunneling happens; describe push-out,
    restitution and friction; say what a level set stores and how it answers a collision query and
    tracks a merging surface; place a material on the games-against-film map.
  TEACHES: the same as OUTCOMES, qualitatively. The worked numbers (one spring by hand and the five-step
    table, the energy factor and its derivation, the cloth's stiffness tables, the XPBD projection, the
    push-out formula, one bounce) are in physics-simulation-supplement.md, after the wrap.
  NEEDS:   the interactive-loop topic (the frame loop, the fixed-timestep accumulator), the
    ray-tracing topic (the BVH), the animation topic (skeletons).
  GRADED from this topic: Quiz 6 (substeps for a stiffer cloth: "Stiff springs need short steps");
    the final (a Verlet step: "Verlet: positions only"). Both rules stay on those slides.
  DEMOS:   cloth (stiffness,substeps) twice, on demo-full slides: first before anything is defined,
    again after constraints; particle-lab view:spring after the integrators, view:wall after
    collision detection. fluid (viscosity,sound) and particle-lab view:phase and view:stepping are in
    the supplement. Bare view ids.
  FIGURES: textbook/figures/phys-cloth-links.svg and phys-level-set.svg (tools/gen-lecture-figures-
    physics.mjs; the level set's distances measured from a traced outline, the push-out asserted to
    land on the surface; phys-level-set-merge.svg); anim-integrators.svg; rt-bvh.svg.
  NUMBERS: physics-simulation-supplement.md's slides and the git history of this header (lib/core/
    sim-cloth.js, sim-fluid.js, lib/tests/sim.test.mjs): one spring stable while Δt sqrt(k/m) < 2, the
    cloth at about 0.7 (measured: holds at 0.64, explodes at 0.68); springs at k = 2000 hold at 64
    substeps, about 25 ms a frame in node; constraints at 16 substeps stretch about 1.6 % for about
    7 ms; 1,000 bodies make 499,500 pairs; 5 m/s at 60 Hz is 8.33 cm a frame, 0.52 cm at 16 substeps.
  SOURCES: Baraff and Witkin SIGGRAPH 1998; Stam SIGGRAPH 1999; Mueller, Charypar and Gross SCA 2003;
    Jakobsen GDC 2001 (Hitman); Mueller et al. 2007 (PBD); Macklin, Mueller and Chentanez MIG 2016
    (XPBD); Stomakhin et al. SIGGRAPH 2013 (Frozen snow); Osher and Sethian, J. Comput. Phys. 1988
    (level sets); Foster and Fedkiw SIGGRAPH 2001 (liquids); Enright, Marschner and Fedkiw SIGGRAPH
    2002 (particle level set); Guendelman, Bridson and Fedkiw SIGGRAPH 2003 (nonconvex rigid bodies
    with signed distance collisions); Zhu and Bridson SIGGRAPH 2005 (FLIP in graphics); Brave's hair
    (the chapter, Section 14).
  READING: ../../textbook/animation.html, Sections 8 to 10, 12 and 13.
  REWRITTEN 2026-11-17 (Marcel: "can we make the lecture more a qualitative review of methods for the
    more advanced topics: forward vs inverse kinematics, springs and particles, level sets, collision
    detections, etc. the math is too advanced for this audience to cover in any detail"): every slide
    states a method's problem, idea, failure and users in words; the worked slides moved, unchanged, to
    physics-simulation-supplement.md; collision detection and response moved up from the supplement and
    rewritten; new: "Springs and particles", "The order of two lines", "Three ways out of the
    stiffness trap", the two level-set slides, "Fluids: particles or grids", "Rigid bodies and
    ragdolls". The 2026-11-13 cut's history is in git.
  2026-11-17, later (Marcel: "use Δt everywhere, including the final", "we need to explain verlet better", and
    a description of implicit integration): the time step is Δt in prose and math and `dt` in code, defined on
    "A simulation is a state and a step"; "Verlet: positions only" says what is stored and what a step does,
    with both forms of the step; new "Implicit integration: forces from the end of the step" and "Four ways to
    step, side by side" after "Three ways out of the stiffness trap"; every acronym spelled out at first use;
    new "Springs or constraints, side by side" (Marcel's springs-against-constraints description); level sets
    tied to grid fluids (Marcel: "level sets were meant to be related to grids for fluids, etc. not just a modeling
    concept"): "Fluids: particles or grids" now comes first, then "Level sets: a liquid's surface on the
    grid" and "Level sets: the same grid for collisions".

  reveal.js: FLAT; notes follow "Note:" and stay plain text. Display math is a raw <div class="tex">
  block typeset by MathJax (lib/deck-math.js; TeX inside, the ASCII form as aria-label, no blank line
  inside); inline math is a code span written `$...$`. Code identifiers stay plain code spans. Never
  two "_" on one markdown line outside a code fence or code span; paths relative to the lecture page.
-->

### Physics: a survey of simulation methods

<small>(~50 min) · reading: <a href="../../textbook/animation.html">Animation and Interpolation</a>, Sections 8 to 10, 12 and 13</small>


---

<!-- .slide: class="demo-full" -->

## A cloth, live

<div class="cockpit" data-demo="cloth" data-controls="stiffness,substeps"><pre class="viz-fallback">  a 24 × 24 cloth, 0.3 kg, pinned at two corners, over a sphere, in a gusting wind
  controls:  stiffness k (N/m), substeps per 1/60 s frame, links = constraints | springs
  readout:   step Δt, Δt·√(k/m), max stretch, kinetic energy, step time, state</pre></div>


---

## A simulation is a state and a step

<pre style="font-size:0.72em;"><code class="language-js">// every particle, every step of dt seconds
v = v + dt * F / m;   // the forces change the velocity (Newton: a = F / m)
x = x + dt * v;       // the velocity changes the position</code></pre>

- **Δt** (`dt` in code), the **time step**: the seconds one step covers, 1/60 s at 60 frames per second

- **state**: each particle's position, velocity and mass
- **forces**: gravity, springs to its neighbors, wind, contact
- a cloth, a splash, a pile of dice, a head of hair: **thousands of particles**, each with these two lines
- the difficulty is never the two lines: it is **which forces**, **how you step**, and **what happens at contact**


---

## Springs and particles

<img src="../../textbook/figures/phys-cloth-links.svg" alt="three panels drawing the links on a 4 by 4 patch of the cloth grid. Structural links join each particle to its four neighbors: 1,104 in the 24 by 24 cloth, they hold the length. Shear links cross each cell's diagonals: 1,058, they resist shearing into a diamond. Bend links skip one particle: 1,056, they resist folding, 5 times softer here. In all, 3,218 links for 576 particles." style="height:250px">

- a **spring** pulls two particles toward a rest distance, harder the more it is stretched; its **stiffness** says how hard
- **mass-spring** models: cloth as a grid of springs, hair as a chain, jelly as a lattice, a soft body as a mesh of them
- one material, three jobs: without shear links a square **collapses** into a diamond; without bend links it **crumples** like tissue


---

## The order of two lines

<div style="display:flex; gap:18px; align-items:center;"><div style="flex:0 0 50%; font-size:0.80em;">

- **explicit Euler**: move with the old velocity, then update it; every step adds energy, and a spring's swing **grows until it explodes** (red)
- **semi-implicit Euler**: update the velocity first, move with the new one; the energy wobbles but **does not grow** (blue)
- one line of code in a different order; games use the second

</div><div style="flex:1 1 50%;">
<img src="../../textbook/figures/anim-integrators.svg" alt="position against time for a spring: the exact cosine in gray, explicit Euler in red spiraling outward, semi-implicit Euler in blue staying on the cosine" style="width:100%; max-height:430px;">
</div></div>


---

<!-- .slide: class="demo-full" -->

## One spring, live

<div class="cockpit" data-demo="particle-lab" data-controls="view:spring"><pre class="viz-fallback">  a 1 kg mass on a k = 100 N/m spring, released at x = 1 m; Δt = 0.1 s
  integrator: explicit | semi-implicit | Verlet | implicit; step, back, play; the step table
  by hand, one step:   explicit x = 1, E = 100 J;   semi-implicit x = 0, E = 50 J
  five steps (t = 0.4): explicit x = -4, E = 800 J;  semi-implicit x = 0, E = 50 J
  Verlet: 1, 0, -1, -1, 0, 1;  implicit: x = -0.25, E = 3.125 J at t = 0.4</pre></div>


---

## The step is fixed; the frame is not

```js
// each displayed frame (16.7 ms at 60 Hz)
const dt = (1 / 60) / substeps;
for (let s = 0; s < substeps; s++) {
  applyForces();
  stepVelocities(dt);
  stepPositions(dt);
  resolveContacts();
}
```

- a simulation never steps by the frame's own duration: frames wobble, and the stability limit does not; the **accumulator** from the loop topic keeps the step fixed
- **substeps**: several short steps inside each displayed frame; the price is compute, 16 substeps cost about 16 times one step


---

## Stiff springs need short steps

- a stiff spring on a light particle **vibrates fast**; a step must be short against one vibration, or even semi-implicit Euler explodes
- the yardstick is `$\Delta t\sqrt{k/m}$`, the step times the vibration rate: one spring holds below **2**, a cloth below about **0.7**, because neighbors pull against each other
- keeping the yardstick fixed: **4 times stiffer needs half the step, twice the substeps**; 9 times stiffer, 3 times the substeps
- the demo's stiff cloth needs **64 substeps** as springs, about 25&nbsp;ms a frame on a laptop: over the 16.7&nbsp;ms budget


---

## Verlet: positions only

<div class="tex" role="img" aria-label="x(next) = x(now) + (x(now) − x(previous)) + a·Δt² = 2·x(now) − x(previous) + a·Δt²
the velocity is implied: (x(now) − x(previous)) / Δt">
\[
\begin{gathered}
x_{\text{next}} = x_{\text{now}} + (x_{\text{now}} - x_{\text{previous}}) + a\,\Delta t^2 = 2\,x_{\text{now}} - x_{\text{previous}} + a\,\Delta t^2 \\[4pt]
\text{the velocity is implied: } \frac{x_{\text{now}} - x_{\text{previous}}}{\Delta t}
\end{gathered}
\]
</div>

- each particle keeps **where it is** and **where it was**, and no velocity: the move since the last step *is* the velocity
- each step: keep going as it was going (the last move again), plus what the forces add (`$a\,\Delta t^2$`)
- on a spring it gives the same positions as semi-implicit Euler, with the same step limit: Verlet is not immune to stiff springs
- move a particle to fix a collision or a link, and its velocity **follows by itself**: the basis of **position-based** methods
- ropes, cloth, hair and ragdolls: Jakobsen built **Hitman**'s cloth and ragdolls on it (Game Developers Conference, 2001)


---

## Three ways out of the stiffness trap

| method | the idea | the cost | used in |
| --- | --- | --- | --- |
| **more substeps** | shorter steps | grows with the square root of the stiffness | everywhere, a little |
| **implicit integration** | step with the forces at the **end** of the step | one large linear solve per step; damps motion | film cloth (Baraff and Witkin, 1998) |
| **constraints** | move particles back to the rest length directly | cheap; cannot explode; soft if under-solved | games: cloth, ragdolls, hair (Müller et al., 2007) |


---

## Implicit integration: forces from the end of the step

<div style="font-size:0.84em;">

- **explicit** steps use the forces where the particle **is**; with a stiff spring the push overshoots, the next pull is harder still, and the swing grows without end
- **implicit** steps ask the other question: which end of the step has forces **there** that account for the move? The step looks back from where it lands
- the forces at the end depend on where every neighbor ends up, so each step is one **system of equations** for all particles, solved with a linear solver (conjugate gradients in Baraff and Witkin's cloth)
- for springs it is **stable at any step length**: a stiff cloth at 60 steps a second instead of thousands
- it **bleeds energy** (numerical damping): fine for cloth, which should settle; wrong for a pendulum that should swing for ever
- used for film cloth and soft bodies; games mostly take constraints instead, next

</div>


---

## Four ways to step, side by side

<div style="font-size:0.78em;">

| method | each step | stays stable | cost a step | used for |
| --- | --- | --- | --- | --- |
| **explicit Euler** | move with the old velocity, then update it | never on a spring: the energy grows every step | least | projectiles; nothing that oscillates |
| **semi-implicit Euler** | update the velocity, then move with the new one | while `$\Delta t\sqrt{k/m} < 2$` | least | game rigid bodies and particles |
| **Verlet** | the last move again, plus the forces; positions only | the same limit as semi-implicit | least | ropes, cloth, hair, ragdolls, with constraints |
| **implicit Euler** | solve for the end of the step | any step on springs; loses energy | one linear solve | film cloth, soft bodies |

</div>


---

## Constraints instead of springs

- **predict** where every particle goes this step, ignoring the links
- for each link, **move both ends back** toward the rest length: a link of rest length 1 m found 1.2 m long moves each end 0.1 m inward (equal masses)
- read each velocity off the move, as Verlet does
- a correction can never **overshoot**, so the solver **cannot explode**; too few passes leave the cloth **rubbery**, never dangerous
- **compliance** (extended position-based dynamics, XPBD, 2016) lets a link give a little: a softer material corrects less per step


---

## Springs or constraints, side by side

<div style="font-size:0.76em;">

| | **springs** (force-based) | **constraints** (position-based) |
| --- | --- | --- |
| each step | measure each link's stretch, turn it into a force (`$F = -k\,\Delta x$`), let the integrator move the particles | move the particles, then put each link's two ends straight back at the rest length; velocities follow from the moves |
| stiff cloth (cotton barely stretches) | needs a huge `$k$`: explodes with explicit steps, or costs a linear solve every step with implicit ones | stays stable with cheap steps; more passes make it stiffer |
| what "stiffness" means | a physical number, N/m, the same at any frame rate | depends on the passes and the step; **XPBD**'s compliance gives it back a physical meaning |
| cost for stiff cloth | high | low |
| used for | film cloth and soft bodies, engineering, stretchy materials | games: capes, flags, clothing; interactive tools |

</div>


---

<!-- .slide: class="demo-full" -->

## The cloth, live

<div class="cockpit" data-demo="cloth" data-controls="stiffness,substeps"><pre class="viz-fallback">  a 24 × 24 cloth, 0.3 kg, pinned at two corners, over a sphere, in a gusting wind
  controls:  stiffness k (N/m), substeps per 1/60 s frame, links = constraints | springs
  readout:   step Δt, Δt·√(k/m), max stretch, kinetic energy, step time, state
  default k = 1995:  springs explode at 16 and 32 substeps, hold at 64
  16 substeps:       springs hold at k = 200 (Δt·√(k/m) = 0.64), explode at k = 224 (0.68)
  constraints:       about 160 % stretch at 1 substep, 1.6 % at 16</pre></div>


---

## Collision detection: who might touch?

<div style="display:flex; gap:18px; align-items:center;"><div style="flex:0 0 55%; font-size:0.76em;">

- testing every pair is hopeless: 1,000 bodies make about **500,000 pairs**, every step
- **broad phase**: wrap each body in a simple box or sphere; keep only pairs whose boxes overlap
- find the overlaps without testing all pairs: **sort** the boxes along an axis (sweep and prune), drop them in a **grid** of cells, or keep a **tree** of boxes, the bounding volume hierarchy of the ray-tracing topic

</div><div style="flex:1 1 45%;">
<img src="../../textbook/figures/rt-bvh.svg" alt="the ray-tracing topic's bounding volume hierarchy: boxes inside boxes over 14 triangles, and the boxes one ray visits" style="width:100%; max-height:430px;">
</div></div>


---

## Collision detection: where, and when?

- **narrow phase**: for each surviving pair, the actual **contact**: the touching points, the direction to separate them (the **normal**) and how deep they overlap
- simple shapes have exact tests (sphere, box, capsule); a character's collider is a few capsules, not its render mesh; complex meshes are split into **convex** pieces
- **discrete** detection checks positions at the end of each step: a fast object can pass a thin wall **between** steps, **tunneling**
- **continuous** detection sweeps each body along its motion over the step (Unity's Rigidbody "Continuous" modes); substeps shrink the gap too


---

<!-- .slide: class="demo-full" -->

## Tunneling, live

<div class="cockpit" data-demo="particle-lab" data-controls="view:wall"><pre class="viz-fallback">  a particle at 5 m/s toward a wall 2 cm thick, one dot per step
  1 substep per 1/60 s frame: 8.33 cm per step, it jumps the wall
  16 substeps: 0.52 cm per step, a step ends inside the wall and is pushed back out: stopped
  a 10 cm wall stops it at 1 substep; at 1 m/s (1.67 cm per step) it does not reach the wall here</pre></div>


---

## Collision response: push out, bounce, slide

- **push out**: a particle that ends a step inside an obstacle moves to the nearest point on its surface, along the normal
- **bounce**: the part of the velocity along the normal reverses, scaled by the **restitution** (0 for clay, near 1 for a rubber ball)
- **slide**: the part along the surface is slowed by **friction**: high friction sticks and tumbles, low friction skates
- a push at a box's corner sets it **spinning**; a stack of boxes is in contact every frame and can **jitter** and **creep**, so engines put resting bodies to **sleep**


---

## Fluids: particles or grids

- **particles** (smoothed particle hydrodynamics, 2003): each particle measures how crowded its neighbors are and pushes away where it is too dense; splashes and spray, games and real-time
- **grids** (Stam's Stable Fluids, 1999): velocity stored in cells, a **pressure solve** keeps the volume constant; smoke, fire, film water
- **hybrids** (fluid-implicit particle, FLIP, and the material point method): particles carry the material, a grid solves the pressure; Houdini's liquids, Frozen's snow (2013)
- the liquid's **surface**: on a grid, a level set, next; from particles, a mesh built around them


---

## Level sets: a liquid's surface on the grid

<div style="display:flex; gap:18px; align-items:center;"><div style="flex:0 0 54%; font-size:0.72em;">

- a grid fluid already has cells; each also stores its **distance to the liquid's surface**: negative in the water, positive in the air
- each step the fluid's velocities **carry the distances** along, like dye, then the field is tidied back into true distances; the surface is **where the distance is zero** (Osher and Sethian, 1988), and the sign tells the pressure solve **which cells are water**
- drops merge, sheets tear, a splash breaks up: the zero set changes shape with **no mesh surgery**
- film water: Foster and Fedkiw (2001); the **particle level set** (Enright, Marschner and Fedkiw, 2002) keeps detail thinner than a cell; **marching cubes** draws the zero set (the meshes topic)

</div><div style="flex:1 1 48%;">
<img src="../../textbook/figures/phys-level-set-merge.svg" alt="two drops of liquid drawn three times: apart, with two surfaces; touching; overlapping, with one surface and nothing to stitch" style="width:100%; max-height:470px;">
</div></div>


---

## Level sets: the same grid for collisions

<div style="display:flex; gap:18px; align-items:center;"><div style="flex:0 0 40%; font-size:0.74em;">

- the same kind of grid, **baked once** around a solid: every point stores its **distance to the solid's surface**, negative inside, positive outside
- a collision test is then a **lookup**: the sign says inside, the value says how deep, the direction the distance grows points the way out
- the same cost for any shape: cloth against a body, hair against a head, piles of odd-shaped bodies (Guendelman, Bridson and Fedkiw, 2003)

</div><div style="flex:1 1 60%;">
<img src="../../textbook/figures/phys-level-set.svg" alt="a blob-shaped body with contour lines of its distance field, blue inside, black at the surface, orange outside, every 0.15; a particle outside at distance +0.56, and a particle inside at distance −0.30 with an arrow 0.30 long that ends on the surface" style="width:100%; max-height:470px;">
</div></div>


---

## Rigid bodies and ragdolls

- a **rigid body**: a scene-graph node whose transform physics writes; its state is position, orientation, velocity and spin, plus mass, inertia and a collider
- each fixed step the engine adds forces, steps, resolves contacts, and writes the node's **local transform**
- **kinematic** bodies are moved by animation (a platform, an animated character); **dynamic** bodies by the engine (a crate, debris)
- a **ragdoll**: a skeleton's bones as dynamic bodies joined at the joints; a falling character switches from **animated to simulated**


---

## Where each method lives

| material | real time (games) | offline (film) |
| --- | --- | --- |
| cloth | constraints, few substeps | implicit integration; collisions against level sets |
| rigid bodies | impulse solvers (Unity uses NVIDIA PhysX) | the same, with smaller steps; level sets for odd shapes |
| liquids | particles, or a height field for a surface | grids and hybrids, with a level-set surface |
| snow, sand | rare | material point method (Disney, Frozen, 2013) |
| hair | strands of links, a few per character | every strand: about 111,700 for Merida (Brave, 2012) |
