<!--
  CSS 551 · TOPIC DECK: Physics, further (~30 min, 18 slides), mounted after the lecture's wrap, time permitting.
  Cut 2026-11-13 from topics/physics-simulation.md (L14): the slides the core does not build on, in the topic's
  order. Numbers: physics-simulation.md's header (lib/core/sim-cloth.js, sim-fluid.js, lib/tests/sim.test.mjs).
  NEEDS: topics/physics-simulation.md.
  reveal.js: FLAT; notes follow "Note:" and stay plain text; display formulas are MathJax blocks
  (lib/deck-math.js; TeX inside, the ASCII form as aria-label); inline math is a code span `$...$`;
  never two "_" on one markdown line outside a code fence or code span.
-->

### Supplement: physics, further

<small>(~30 min, time permitting) · reading: <a href="../../textbook/animation.html">Animation and Interpolation</a>, Sections 8 to 14</small>


---

## A third way: step with the future force

**Implicit (backward) Euler** uses the acceleration at the **end** of the step. For one spring it solves exactly:

<div class="tex" style="font-size:0.76em" role="img" aria-label="v₁ = (v₀ − h·k·x₀/m) / (1 + h²·k/m)          x₁ = x₀ + h·v₁
same spring, h = 0.1:   v₁ = (0 − 10) / 2 = −5      x₁ = 1 + 0.1·(−5) = 0.5">
\[
\begin{gathered}
v_1 = \frac{v_0 - h k x_0 / m}{1 + h^2 k / m}, \qquad x_1 = x_0 + h v_1 \\[6pt]
\text{same spring, } h = 0.1\text{:} \quad v_1 = \frac{0 - 10}{2} = -5, \qquad x_1 = 1 + 0.1 \cdot (-5) = 0.5
\end{gathered}
\]
</div>

| `$t$` (s) | 0.0 | 0.1 | 0.2 | 0.3 | 0.4 |
| --- | --- | --- | --- | --- | --- |
| `$x$` | 1 | 0.5 | 0 | −0.25 | −0.25 |
| energy (J) | 50 | 25 | 12.5 | 6.25 | 3.125 |

- **stable at any step**, but it **drains** energy: here, half per step
- for a cloth it means solving one linear system per step: Baraff and Witkin's **Large Steps** (1998)


---

## Damping, and its own limit

- real materials lose energy: a spring gets a **damper**, force `$-c \cdot (\text{relative velocity})$`
- **critical damping** `$c = 2\sqrt{k m}$`: for the 1 kg, 100 N/m spring, `$c = 20$` N·s/m
- a damper is stiffness in velocity: stepped explicitly it is stable only while `$h c / m$` stays small

**The pitfall, measured**: in this course's cloth, a fixed damper of 0.4 N·s/m on each link made **every** spring cloth explode, even at `$k = 50$` with 16 substeps, because each particle weighs 0.000521 kg. Scaling it to 2 % of critical per link fixed it.


---

## XPBD, one substep in code

```js
for (const p of particles) { p.prev = p.x; if (p.w) { p.v += h * g; p.x += h * p.v; } }  // predict
collide(particles);                                                          // contacts
for (let it = 0; it < 2; it++) for (const L of links) {                     // project, 2 passes
  const d = sub(L.b.x, L.a.x), len = length(d), C = len - L.rest;
  const alpha = 1 / (k * h * h);
  const dl = -C / (L.a.w + L.b.w + alpha);
  L.a.x -= L.a.w * dl * d / len;   L.b.x += L.b.w * dl * d / len;
}
for (const p of particles) p.v = (p.x - p.prev) / h;                         // velocities
```

(`w` = 1/m, 0 for a pinned particle; `lib/core/sim-cloth.js` holds the whole solver, with arrays)


---

## Rigid bodies and hair from the same parts

- **a cube**: 8 particles and all **28** links between them, solved as rigid constraints; it lands, tumbles and stays a cube (within 2 % in the tests)
- **a ragdoll**: particles at the joints, links as bones; Jakobsen's **Hitman** (GDC 2001) ran its characters and cloth this way
- **a hair**: a chain of 14 links pinned at the root, with links over every second particle for bending
- production engines treat rigid bodies with their own solvers (positions, orientations, impulses), but the idea carries


---

## Hair that moves: strands you simulate

- model hair as **strands**: chains of particles joined by links, rooted on the scalp
- simulate a few thousand **guide hairs**; draw many more **children** interpolated between guides
- each frame: gravity and **wind** push the particles, links keep each hair its length, particles that enter the head are **pushed back out**
- **follow the leader** (Müller, Kim and Chentanez, VRIPHYS 2012): fix each particle's distance to its parent, root to tip, so hair never stretches

<img src="../../media/icons/sim-hair.webp" class="media-shot" style="max-height: 190px;" alt="a pastel figure's long hair streaming back in a gusting wind">


---

### Rigid bodies in an engine

<small>(~15 min)</small>


---

## Collisions, step one: who might touch?

- testing every pair is `$n^2$`: 1,000 bodies make about 500,000 pairs
- **broad phase**: wrap each body in a simple **bounding volume** (a box or sphere) and keep only pairs whose volumes overlap
- boxes are kept in a structure (a sorted list, a grid or a **tree**) so overlaps are found without checking every pair
- the tree of boxes is a **bounding volume hierarchy** (BVH), the structure ray tracers also use


---

## Collisions, step two: where exactly?

- **narrow phase**: for each surviving pair, compute the actual **contact**: the points, the direction to separate them (the **contact normal**) and how deep they overlap
- simple shapes have exact tests: sphere against sphere, box against box, capsule against mesh
- complex meshes are approximated by **convex pieces** or simple collider shapes, never tested triangle by triangle every frame


---

## Response: bounce, slide, stop

- **restitution**: how much of the approach speed comes back as bounce (0 for clay, near 1 for a rubber ball)
- **friction**: resists sliding along the contact; high friction makes objects stick and tumble, low friction makes them skate
- engines apply short **impulses** (instant velocity changes) at the contact points, which is how a box hit on its corner starts to **spin**


---

## Tumbling cubes, simulated for this course

<img src="../../media/icons/sim-rigid.webp" class="media-shot" style="max-height: 300px;" alt="nine pastel cubes falling, colliding with the floor and each other, and settling on a pastel checkerboard">

- nine cubes fall, hit the floor and **each other**, tumble and settle
- each cube is a cluster of particles kept rigid by **shape matching**, the approach of NVIDIA's unified particle solver
- a check confirms no two cubes overlap by more than **1 % of an edge** at rest


---

## Stacking: contact every frame

- a box resting on another is in **contact every frame**, pushed by gravity, pushed back by the contact
- small errors in each correction add up: stacks **jitter**, **creep** sideways or slowly sink into each other
- engines add tricks: **sleeping** (freeze bodies that stopped moving), many **solver iterations**, a small allowed overlap (a contact **slop**)
- Baraff (SIGGRAPH 1989) treated resting contact analytically, as forces found all at once for bodies that touch at many points


---

## Physics engines you will meet

| | Unity (the Unity track) | three.js (the WebGL track) |
| --- | --- | --- |
| built in | **yes**: NVIDIA PhysX | **no** physics |
| a body | add a `Rigidbody` component | a library body, e.g. cannon-es or Rapier |
| a shape | a `Collider` (box, sphere, capsule, mesh) | the library's shapes |
| who moves the node | the engine writes the `Transform` | you copy the body's position and quaternion to the mesh each frame |


---

## Fluids as particles

Smoothed particle hydrodynamics (Müller, Charypar and Gross, 2003):

<div class="tex" style="font-size:0.74em" role="img" aria-label="density    ρᵢ = Σⱼ m · W(|xᵢ − xⱼ|)        W: a bump of radius H around each particle
pressure   pᵢ = k · (ρᵢ − ρ₀)             above rest density → push
forces     pressure (push apart) + viscosity (match neighbors' velocity) + gravity
step       aᵢ = Fᵢ / ρᵢ,  then the same Euler step as the cloth">
\[
\begin{aligned}
\text{density} &\quad \rho_i = \sum_j m\,W(\lvert x_i - x_j \rvert), \quad W\text{:} \text{a bump of radius } H \text{ around each particle} \\
\text{pressure} &\quad p_i = k\,(\rho_i - \rho_0), \quad \text{above rest density} \to \text{push} \\
\text{forces} &\quad \text{pressure (push apart)} + \text{viscosity (match neighbors' velocity)} + \text{gravity} \\
\text{step} &\quad a_i = F_i / \rho_i, \text{ then the same Euler step as the cloth}
\end{aligned}
\]
</div>

- a particle only feels neighbors within `$H$`: a grid of cell size `$H$` finds them in 9 cells
- course demo: spacing **8 px**, `$H = 16$` px: on the rest lattice, 8 neighbors plus itself


---

## The kernel and the neighbor grid

<div class="tex" style="font-size:0.74em" role="img" aria-label="W(r) = 4 / (π·H⁸) · (H² − r²)³   for r &lt; H,  0 beyond       (integrates to 1 over the plane)
H = 16 px:   W(0) = 4.97 × 10⁻³     W(8 px) = 2.10 × 10⁻³ (42 % of the peak)     W(16 px) = 0
900 particles, all pairs:   404,550 distance checks per step
grid of 16 px cells:        9 cells per particle, about 9 particles within H at rest">
\[
\begin{gathered}
W(r) = \frac{4}{\pi H^8}\,(H^2 - r^2)^3 \ \text{ for } r \lt H, \ \ 0 \text{ beyond} \qquad \text{(integrates to 1 over the plane)} \\[6pt]
H = 16 \text{ px:} \quad W(0) = 4.97 \times 10^{-3}, \quad W(16 \text{ px}) = 0 \\
W(8 \text{ px}) = 2.10 \times 10^{-3}, \ \ 42\,\% \text{ of the peak} \\[8pt]
\text{900 particles, all pairs: } 404{,}550 \text{ distance checks per step} \\
\text{grid of 16 px cells: 9 cells per particle, about 9 particles within } H \text{ at rest}
\end{gathered}
\]
</div>

- the rest density `$\rho_0$` is the sum of `$W$` over the resting lattice, so the dam starts **at rest**, not exploding


---

## The fluid's step limit

<div class="tex" role="img" aria-label="pressure waves travel at the speed of sound c; a step must not skip a neighbor:
   dt ≤ 0.4 · H / c                      (the CFL condition)
   c = 1800 px/s:  dt = 3.556 ms          c = 900 px/s:  dt = 7.111 ms
stiffer (larger c) → less compression, shorter steps, more steps per frame">
\[
\begin{gathered}
\text{pressure waves travel at the speed of sound } c; \text{ a step must not skip a neighbor:} \\[4pt]
\Delta t \le 0.4\,\frac{H}{c} \qquad \text{(the CFL condition)} \\[6pt]
c = 1800 \text{ px/s}\text{:} \ \Delta t = 3.556 \text{ ms} \qquad c = 900 \text{ px/s}\text{:} \ \Delta t = 7.111 \text{ ms} \\[6pt]
\text{stiffer (larger } c) \to \text{less compression, shorter steps, more steps per frame}
\end{gathered}
\]
</div>

- this SPH is only **weakly** incompressible: the demo's densest particle sits **20 to 30 %** above rest in a dam break, about 60 % for a moment when the wave hits the far wall
- real water compresses by a fraction of a percent: film solvers enforce incompressibility with a pressure solve


---

## Predict: viscosity

The dam breaks with viscosity **2.5**. Drop it to **0.2**: what changes first, and what does not?


---

<!-- .slide: class="demo-full" -->

## The fluid, live

<div class="cockpit" data-demo="fluid" data-controls="viscosity,sound"><pre class="viz-fallback">  a 2D SPH fluid: a dam of 900 particles collapsing across an 800 × 600 px box
  controls:  viscosity, stiffness (speed of sound c)
  readout:   particles, step dt = 0.4 H / c, sim time, peak compression, max speed, compute per frame
  at c = 1800 px/s: dt = 3.556 ms; peak compression about 20 to 30 %, near 60 % as the wave hits the far wall</pre></div>


---

## Film and games want different physics

- **games**: a few milliseconds per frame, must never explode, must respond to the player; approximations are fine if they look plausible
- **film**: no frame budget, but close-ups, directors and continuity; accuracy, many substeps, and **art direction** (the simulation is re-run until the shot looks right)
- both simulate **what cannot be keyframed** economically: debris, stacks, crowds of objects
