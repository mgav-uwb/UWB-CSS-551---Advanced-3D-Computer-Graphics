<!--
  CSS 551 · TOPIC DECK: Physics inside the frame loop (the core, ~46 min, 18 slides).
  Mounted as <section data-markdown="../../topics/physics-simulation.md">. No logistics.

  GOALS: a simulation is a state plus a step rule, and the step must respect the stiffness.
  OUTCOMES (students can): take one step of explicit Euler, semi-implicit Euler and Verlet on a spring;
    use h·sqrt(k/m) to judge stability and scale substeps with stiffness; carry out one distance-
    constraint projection and say why it cannot explode and what it costs; resolve a contact (push out,
    reflect the normal velocity with restitution) and compute the per-step travel that tunnels.
  TEACHES (before the 2026-11-13 cut; the core keeps the integrators, the cloth, contacts, the rigid
    body as a node, one bounce, and the method map): a particle as position, velocity and mass; forces to acceleration;
  explicit versus semi-implicit Euler worked by hand on one spring; energy growth
  (1 + (h omega)^2 per step) and the stability limit h omega < 2; the fixed step and
  substeps; stiffness versus stability; cloth as springs or as constraints (XPBD),
  one constraint projection worked; collisions by projection and tunneling; fluids
  as particles (SPH: density, pressure, viscosity, the CFL step); rigid bodies and
  hair as particle clusters; rigid bodies in an engine (broad and narrow phase,
  response, stacking, ragdolls); hair strands; what film and games use.
  NEEDS:   the interactive-loop topic (the frame loop, the two clocks, the
    fixed-timestep accumulator) and the animation topic (keyframes, skeletons).
  RIGID BODIES (moved here 2026-10-06 from the scene-graph topic, conceptual): state and the
    engine step, broad and narrow phase, restitution and friction, stacking and sleeping
    (Baraff, SIGGRAPH 1989), kinematic vs dynamic and ragdolls, Unity PhysX vs three.js
    libraries, film vs games; media ../../media/icons/sim-rigid.webp. HAIR STRANDS slide moved
    from the texture-mapping topic (media ../../media/icons/sim-hair.webp).
  DEMOS:   cloth (stiffness,substeps) twice, on demo-full slides: first before anything is defined, again
    after the tables; fluid (viscosity,sound) is in physics-simulation-supplement.md.
  NUMBERS, all from node against lib/core/sim-cloth.js, lib/core/sim-fluid.js and
    lib/tests/sim.test.mjs:
    - spring k = 100 N/m, m = 1 kg, h = 0.1 s, x0 = 1 m at rest: omega = 10 rad/s
      explicit: (x, v, E) = (1, 0, 50) (1, -10, 100) (0, -20, 200) (-2, -20, 400)
      semi-implicit: (1, 0, 50) (0, -10, 50) (-1, -10, 100) (-1, 0, 50) (0, 10, 50)
      exact x(t) = cos 10t: 1, 0.540, -0.416, -0.990, -0.654
    - explicit energy factor per step 1 + (h omega)^2: 2 at h = 0.1; 1.01 at h = 0.01,
      2.705 after 100 steps (1 s)
    - semi-implicit, 200 steps: max energy 1.0e3 J at h = 0.19 (bounded), 9.1e111 J at 0.21
    - cloth 24 x 24, 0.3 kg: particle mass 0.000521 kg; k = 2000 N/m:
      h = 4.167 / 1.042 / 0.260 ms at 4 / 16 / 64 substeps; h sqrt(k/m) = 8.16 / 2.04 / 0.51
      springs: explode at 16 substeps, 1.2 % stretch at 64 (24.8 ms per frame in node)
      constraints (2 passes per substep): stretch 125.3 / 5.3 / 2.0 / 1.2 % at 1 / 4 / 16 / 64 substeps
        (0.45 / 1.64 / 6.96 / 27.8 ms per frame in node)
      Those stretches were without wind. Re-measured 2026-11-13 as the demo runs (wind 1.2, damping 0.4,
      sphere and floor of lib/demos/cloth.js), readout's median over 2 to 8 s and its peak:
        springs k = 1995: explode at 1, 4, 16, 32 substeps; hold at 64 (0.9 %, peak 2.8 %)
        springs, 16 substeps: hold at k = 200 (h sqrt(k/m) = 0.64), explode at k = 224 (0.68)
        constraints k = 1995: 157 / 15.2 / 1.6 / 1.2 % (peaks 260 / 25.1 / 4.3 / 2.9 %) at 1 / 4 / 16 / 64
      The cloth's limit: in its fastest mode neighbors move oppositely; 2 axis links (2u stretch each)
        and 4 diagonals give 8k on a particle, omega_max = sqrt(8) sqrt(k/m), limit 2 / sqrt(8) = 0.71.
      Costs kept from the quiet-machine run above (2026-11-13 timings ran on a machine at load 28).
    - one XPBD projection: masses 1 kg (w = 1), rest 1 m, now 1.2 m, h = 1/60 s,
      k = 1000 N/m: alpha~ = 1/(k h^2) = 3.6; dlambda = -0.2 / 5.6 = -0.0357;
      each particle moves 0.0357 m; new length 1.1286 m. k infinite: each moves 0.1, length 1.
    - tunneling: 5 m/s at 60 Hz is 8.33 cm per frame, 0.52 cm per substep at 16
    - SPH: spacing 8 px, H = 16 px (8 lattice neighbors plus itself), dt = 0.4 H / c =
      3.556 ms at c = 1800 px/s, 7.111 ms at c = 900
  SOURCES (facts on the last slides): Terzopoulos et al. SIGGRAPH 1987; Baraff and
    Witkin SIGGRAPH 1998 (technical Academy Award 2006, with Kass); Stam SIGGRAPH 1999
    (Maya Fluid Effects, technical Academy Award 2008); Mueller, Charypar and Gross SCA
    2003; Jakobsen GDC 2001 (Hitman); Mueller et al. 2007 (PBD); Macklin, Mueller and
    Chentanez MIG 2016 (XPBD); Macklin et al. SCA 2019 (small steps); Stomakhin et al.
    SIGGRAPH 2013 (Frozen snow); Brave's Taz hair solver (fxguide).
  READING: ../../textbook/animation.html, Sections 8 to 10, 12 and 13.
  CUT 2026-11-13 (Marcel: "what are we actually teaching ... be specific on goals and outcomes"): the core
    keeps the slides the outcomes above need; implicit Euler, damping, the XPBD code, particle rigid
    bodies and hair, the engine's broad and narrow phase, response, tumbling cubes, stacking, engines,
    fluids and film against games moved, in order, to physics-simulation-supplement.md (after the wrap).
    The cloth now opens the topic, unexplained, as the keyframe demo opens animation. The cloth tables
    re-measured with the demo's wind; the cloth's own limit (about 0.7, not 2) explained; the demo's
    driving order corrected (springs explode at the default stiffness at once).
  EDIT 2026-10-08: the energy factor derived in three steps on its slide (retitled "Energy growth and
    the stability limit"); "Why stacking is hard" retitled "Stacking: contact every frame"; the
    multiple-choice predict-first slide on the spring cloth cut (its question moved to the table
    slide's note); the viscosity prediction asked open, without lettered options.

  EDIT 2026-11-03 (Marcel): every formula typeset; the cloth's links drawn
    (textbook/figures/phys-cloth-links.svg, tools/gen-lecture-figures-physics.mjs); the fixed-step
    loop is real code.

  reveal.js: FLAT; notes follow "Note:" and stay plain text. Display math is a raw <div class="tex">
  block typeset by MathJax (lib/deck-math.js; TeX inside, the ASCII form as aria-label, no blank line
  inside); inline math is a code span written `$...$`. Code identifiers stay plain code spans. Never
  two "_" on one markdown line outside a code fence or code span; paths relative to the lecture page.
-->

### Physics inside the frame loop

<small>(~46 min) · reading: <a href="../../textbook/animation.html">Animation and Interpolation</a>, Sections 8 to 10, 12 and 13</small>


---

<!-- .slide: class="demo-full" -->

## A cloth, live

<div class="cockpit" data-demo="cloth" data-controls="stiffness,substeps"><pre class="viz-fallback">  a 24 × 24 cloth, 0.3 kg, pinned at two corners, over a sphere, in a gusting wind
  controls:  stiffness k (N/m), substeps per 1/60 s frame, links = constraints | springs
  readout:   step h, h·√(k/m), max stretch, kinetic energy, step time, state</pre></div>


---

## A particle is three numbers and a rule

<div class="tex" style="font-size:0.76em" role="img" aria-label="state:   position x = (x, y, z)      velocity v = (vx, vy, vz)      mass m
forces:  gravity  m·(0, −9.81, 0)     springs     wind     contact
rule:    acceleration a = F / m                       (Newton, 1687)
step h:  new v  from a,    new x  from v">
\[
\begin{aligned}
\text{state:} &\quad \text{position } \mathbf{x} = (x, y, z), \quad \text{velocity } \mathbf{v} = (v_x, v_y, v_z), \quad \text{mass } m \\
\text{forces:} &\quad \text{gravity } m\,(0,\ {-9.81},\ 0), \quad \text{springs, wind, contact} \\
\text{rule:} &\quad \text{acceleration } \mathbf{a} = \mathbf{F} / m \qquad \text{(Newton, 1687)} \\
\text{step } h\text{:} &\quad \text{new } \mathbf{v} \text{ from } \mathbf{a}, \quad \text{new } \mathbf{x} \text{ from } \mathbf{v}
\end{aligned}
\]
</div>

- a cloth, a splash, a crowd of dice, a head of hair: **thousands of particles**, each with this state
- the physics is two lines; everything interesting is in **which forces** and **how you step**


---

## One spring, by hand

A 1 kg mass on a spring, `$k = 100$` N/m, pulled to `$x = 1$` m and released; `$h = 0.1$` s.

<div class="tex" style="font-size:0.74em" role="img" aria-label="a = −k·x / m = −100 · 1 / 1 = −100 m/s²
explicit Euler       (both updates use the OLD state)
   x ← x + h·v     = 1 + 0.1 · 0      = 1
   v ← v + h·a     = 0 + 0.1 · (−100) = −10
semi-implicit Euler  (velocity first, then position with the NEW velocity)
   v ← v + h·a     = −10
   x ← x + h·v     = 1 + 0.1 · (−10)  = 0">
\[
\begin{aligned}
a &= -k x / m = -100 \cdot 1 / 1 = -100 \text{ m/s}^2 \\[8pt]
&\textbf{explicit Euler} \quad \text{(both updates use the old state)} \\
x &\leftarrow x + h v = 1 + 0.1 \cdot 0 = 1 \\
v &\leftarrow v + h a = 0 + 0.1 \cdot (-100) = -10 \\[8pt]
&\textbf{semi-implicit Euler} \quad \text{(velocity first, then position with the new velocity)} \\
v &\leftarrow v + h a = -10 \\
x &\leftarrow x + h v = 1 + 0.1 \cdot (-10) = 0
\end{aligned}
\]
</div>


---

## Five steps later

| `$t$` (s) | exact `$x = \cos 10t$` | explicit `$x$` | explicit energy (J) | semi-implicit `$x$` | semi-implicit energy (J) |
| --- | --- | --- | --- | --- | --- |
| 0.0 | 1.000 | 1 | 50 | 1 | 50 |
| 0.1 | 0.540 | 1 | 100 | 0 | 50 |
| 0.2 | −0.416 | 0 | 200 | −1 | 100 |
| 0.3 | −0.990 | −2 | 400 | −1 | 50 |
| 0.4 | −0.654 | −4 | 800 | 0 | 50 |

- explicit Euler **doubles** the energy every step: the spring gains energy from nowhere
- semi-implicit Euler is **wrong in phase**; its energy swings between 50 and 100 J but does **not grow**


---

## Energy growth and the stability limit

<div class="tex" style="font-size:0.72em" role="img" aria-label="explicit Euler, spring with ω = √(k/m); energy E = (m/2)(v² + ω²x²):
   1. x' = x + h·v              v' = v − h·ω²·x
   2. v'² + ω²x'² = (1 + (h·ω)²)(v² + ω²x²)       the 2h·ω²·x·v terms cancel
   3. so every step multiplies E by 1 + (h·ω)², the amplitude by √(1 + (h·ω)²)
   h = 0.1,  ω = 10:   × 2      per step
   h = 0.01, ω = 10:   × 1.01   per step,  × 2.705 after 1 s (100 steps)
semi-implicit Euler:
   bounded while h·ω &lt; 2      (h &lt; 0.2 s here)
   h = 0.19:  bounded, peaks at 1,000 J over 200 steps
   h = 0.21:  energy reaches 9 × 10¹¹¹ J">
\[
\begin{aligned}
&\textbf{explicit Euler}, \text{ spring with } \omega = \sqrt{k/m}, \text{ energy } E = \tfrac{m}{2}(v^2 + \omega^2 x^2)\text{:} \\
&\quad 1.\ \ x' = x + h v, \qquad v' = v - h\,\omega^2 x \\
&\quad 2.\ \ v'^2 + \omega^2 x'^2 = \big(1 + (h\omega)^2\big)(v^2 + \omega^2 x^2) \qquad \text{the } 2h\,\omega^2 x v \text{ terms cancel} \\
&\quad 3.\ \ \text{so every step multiplies } E \text{ by } 1 + (h\omega)^2, \text{ the amplitude by } \sqrt{1 + (h\omega)^2} \\[4pt]
&\quad h = 0.1,\ \omega = 10\text{:} \ \times 2 \text{ per step} \\
&\quad h = 0.01,\ \omega = 10\text{:} \ \times 1.01 \text{ per step}, \ \times 2.705 \text{ after 1 s (100 steps)} \\[8pt]
&\textbf{semi-implicit Euler}\text{:} \\
&\quad \text{bounded while } h\omega \lt 2 \quad (h \lt 0.2 \text{ s here}) \\
&\quad h = 0.19\text{:} \ \text{bounded, peaks at } 1{,}000 \text{ J over 200 steps} \\
&\quad h = 0.21\text{:} \ \text{energy reaches } 9 \times 10^{111} \text{ J}
\end{aligned}
\]
</div>


---

## Verlet: positions only

<div class="tex" role="img" aria-label="x(n+1) = 2·x(n) − x(n−1) + a(n)·h²          the velocity is implied: (x(n) − x(n−1)) / h
same spring, starting at rest (x(−1) = x(0) = 1):   1, 0, −1, −1, 0, 1">
\[
\begin{gathered}
x_{n+1} = 2x_n - x_{n-1} + a_n h^2 \qquad \text{the velocity is implied: } \frac{x_n - x_{n-1}}{h} \\[6pt]
\text{same spring, starting at rest } (x_{-1} = x_0 = 1)\text{:} \quad 1,\ 0,\ {-1},\ {-1},\ 0,\ 1
\end{gathered}
\]
</div>

- the **same positions** as semi-implicit Euler on this spring, with no velocity stored
- a constraint can then move a position directly and the velocity follows: the basis of **position-based** methods
- used by Jakobsen for **Hitman**'s cloth and ragdolls (GDC 2001)


---

## The step is fixed; the frame is not

```js
// each displayed frame (16.7 ms at 60 Hz)
const h = (1 / 60) / substeps;
for (let s = 0; s < substeps; s++) {
  applyForces();
  stepVelocities(h);
  stepPositions(h);
  resolveContacts();
}
```

- the **accumulator** from the loop topic keeps the step fixed however long the frame took
- **substeps** shorten `$h$` without shortening the frame: 16 substeps at 60 Hz is `$h = 1.04$` ms
- the price is compute: 16 substeps cost about 16 times one step


---

## A cloth is a grid of links

<img src="../../textbook/figures/phys-cloth-links.svg" alt="three panels drawing the links on a 4 by 4 patch of the cloth grid. Structural links join each particle to its four neighbors: 1,104 in the 24 by 24 cloth, they hold the length. Shear links cross each cell's diagonals: 1,058, they resist shearing into a diamond. Bend links skip one particle: 1,056, they resist folding, 5 times softer here. In all, 3,218 links for 576 particles." style="height:330px">

- one material, three jobs: without shear links a square **collapses** into a rhombus; without bend links it **crumples** like paper tissue


---

## Stiffness against the step

A cloth of 576 particles, **0.3 kg** in all: each particle is **0.000521 kg**. Links at `$k = 2000$` N/m:

| substeps | `$h$` (ms) | `$h\sqrt{k/m}$` | springs |
| --- | --- | --- | --- |
| 4 | 4.167 | 8.16 | explode at once |
| 16 | 1.042 | 2.04 | explode at once |
| 32 | 0.521 | 1.02 | explode at once |
| 64 | 0.260 | 0.51 | hold, about 1 % stretch |

- the cloth fails far **below** one spring's limit of 2: neighbors swing against each other, a particle feels about `$8k$`, and the limit falls to about **0.7**
- **4 times stiffer, twice the substeps**: the same `$h\sqrt{k/m}$` needs `$h \propto 1/\sqrt{k}$`
- 64 substeps: about **25&nbsp;ms** per frame on a laptop, over the 16.7&nbsp;ms budget


---

## Constraints instead of springs

Instead of a force proportional to the stretch, **move the two particles back** toward the rest length:

<div class="tex" style="font-size:0.74em" role="img" aria-label="two particles, 1 kg each, rest length 1 m, now 1.2 m apart:   C = 1.2 − 1 = 0.2
rigid link:   each moves 0.1 toward the other        → length 1.0
XPBD, k = 1000 N/m, h = 1/60 s:
   α̃ = 1 / (k·h²) = 3.6
   Δλ = −C / (1 + 1 + α̃) = −0.2 / 5.6 = −0.0357
   each moves 0.0357 toward the other                 → length 1.1286
then:  velocity = (new position − old position) / h">
\[
\begin{aligned}
&\text{two particles, 1 kg each, rest length 1 m, now 1.2 m apart:} \quad C = 1.2 - 1 = 0.2 \\[6pt]
&\textbf{rigid link:} \ \text{each moves } 0.1 \text{ toward the other} \ \to\ \text{length } 1.0 \\[6pt]
&\textbf{XPBD},\ k = 1000 \text{ N/m},\ h = 1/60 \text{ s}\text{:} \\
&\quad \tilde\alpha = \frac{1}{k h^2} = 3.6 \\
&\quad \Delta\lambda = \frac{-C}{1 + 1 + \tilde\alpha} = \frac{-0.2}{5.6} = -0.0357 \\
&\quad \text{each moves } 0.0357 \text{ toward the other} \ \to\ \text{length } 1.1286 \\[6pt]
&\text{then: velocity} = (\text{new position} - \text{old position}) / h
\end{aligned}
\]
</div>


---

## Constraints: the same cloth, the same k

| substeps | `$h$` (ms) | stretch while it flutters | peak | cost per frame |
| --- | --- | --- | --- | --- |
| 1 | 16.67 | about 160 % | 260 % | 0.5 ms |
| 4 | 4.167 | about 15 % | 25 % | 1.6 ms |
| 16 | 1.042 | about 1.6 % | 4.3 % | 7 ms |
| 64 | 0.260 | about 1.2 % | 2.9 % | 28 ms |

- **never explodes**, at any setting; too few substeps make it **rubbery**, not dangerous
- 16 substeps: a cloth that holds its size within a few percent at about 7 ms


---

<!-- .slide: class="demo-full" -->

## The cloth, live

<div class="cockpit" data-demo="cloth" data-controls="stiffness,substeps"><pre class="viz-fallback">  a 24 × 24 cloth, 0.3 kg, pinned at two corners, over a sphere, in a gusting wind
  controls:  stiffness k (N/m), substeps per 1/60 s frame, links = constraints | springs
  readout:   step h, h·√(k/m), max stretch, kinetic energy, step time, state
  default k = 1995:  springs explode at 16 and 32 substeps, hold at 64
  16 substeps:       springs hold at k = 200 (h·√(k/m) = 0.64), explode at k = 224 (0.68)
  constraints:       about 160 % stretch at 1 substep, 1.6 % at 16</pre></div>


---

## Contacts: push the particle out

<div class="tex" role="img" aria-label="sphere at c, radius r;   particle at p;   d = |p − c|
if d &lt; r:   p ← c + (p − c) · r / d          (straight out along the normal)
floor y = y0:   if p.y &lt; y0:   p.y ← y0
friction: keep only part of this step's sliding motion along the surface">
\[
\begin{aligned}
&\text{sphere at } c, \text{ radius } r; \ \text{particle at } p; \quad d = \lvert p - c \rvert \\
&\text{if } d \lt r\text{:} \quad p \leftarrow c + (p - c)\,\frac{r}{d} \qquad \text{(straight out along the normal)} \\
&\text{floor } y = y_0\text{:} \quad \text{if } p_y \lt y_0\text{:} \ \ p_y \leftarrow y_0 \\[6pt]
&\text{friction: keep only part of this step's sliding motion along the surface}
\end{aligned}
\]
</div>

- **tunneling**: at 5 m/s a particle moves **8.33 cm per frame** at 60 Hz, past any thinner obstacle
- 16 substeps: **0.52 cm** per step, so thin walls stop it


---

## A rigid body is a node that physics moves

- **state**: position, orientation (a quaternion), **linear** velocity, **angular** velocity
- **properties**: mass, how the mass is spread (the inertia), a **collider** shape
- every fixed step the engine: adds forces (gravity, springs, your pushes), **integrates** velocity and position, then **resolves contacts**
- the result is written back into the node's **local transform**, and the scene graph carries it from there


---

## Worked: one bounce

A ball arrives at `$v = (3, -4, 0)$` on a floor with normal `$n = (0, 1, 0)$`, restitution `$e = 0.5$` (the share of the approach speed along the normal that comes back), no friction:

<div class="tex" style="font-size:0.76em" role="img" aria-label="normal part:   (v · n) n = (0, −4, 0)        tangential part:  (3, 0, 0)
after:         tangential kept, normal reversed and scaled by e
               v' = (3, 0, 0) − 0.5 · (0, −4, 0) = (3, 2, 0)
speed 5 → 3.606;   kinetic energy kept: 13 / 25 = 52 %
it ended the step 0.05 inside the floor:  push out by (0, 0.05, 0)">
\[
\begin{aligned}
\text{normal part:} &\quad (v \cdot n)\,n = (0,\ {-4},\ 0) \qquad \text{tangential part: } (3,\ 0,\ 0) \\
\text{after:} &\quad \text{tangential kept, normal reversed and scaled by } e \\
&\quad v' = (3,\ 0,\ 0) - 0.5 \cdot (0,\ {-4},\ 0) = (3,\ 2,\ 0) \\
\text{speed:} &\quad 5 \to 3.606; \quad \text{kinetic energy kept: } 13 / 25 = 52\,\% \\
\text{contact:} &\quad \text{ended the step } 0.05 \text{ inside the floor: push out by } (0,\ 0.05,\ 0)
\end{aligned}
\]
</div>


---

## Kinematic, dynamic, and the ragdoll

- **kinematic** body: moved by animation or code; it pushes others but nothing pushes it (a moving platform, an animated character)
- **dynamic** body: moved by the physics engine (a crate, debris)
- a **ragdoll** is a character's skeleton as a chain of dynamic bodies joined by joints: when a character falls, the game switches its bones from **animated to simulated**
- blending the two (animation driving the bones as targets, physics reacting to hits) is **active ragdoll** or physics-based animation


---

## Where each method lives

| material | real-time (games) | offline (film) |
| --- | --- | --- |
| cloth | position-based constraints, few substeps | implicit integration: stable at any step, one linear solve per step (Baraff and Witkin, 1998) |
| rigid bodies | impulse and constraint solvers (Unity uses NVIDIA PhysX) | the same, with smaller steps and more contacts |
| liquids | particles, or a height field for a surface | grid and hybrid solvers with a pressure solve (Stam, 1999, onward) |
| snow, sand | rare | material point method (Disney, Frozen, 2013) |
| hair | strands of links, few per character | every strand: Merida (Brave, 2012) has about 111,700 hairs |
