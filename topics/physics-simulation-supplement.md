<!--
  CSS 551 · TOPIC DECK: Physics, further (~50 min, 25 slides), mounted after the lecture's wrap, time permitting.
  Cut 2026-11-13 from topics/physics-simulation.md (L14): the slides the core does not build on, in the topic's
  order.
  REWORKED 2026-11-17 (Marcel: the lecture "more a qualitative review of methods ... the math is too advanced
    for this audience to cover in any detail"): the core's worked slides moved here unchanged, in the topic's
    order (one spring by hand and the five-step table, the energy factor and the stability limit with its
    phase-plane demo, the fixed step live, the stiffness table, one XPBD projection and the constraint
    table, the push-out formula, one bounce), some retitled "Worked: ..."; "Collisions, step one", "step
    two" and "Response" removed, since the core's two collision-detection slides and "Collision response"
    now say what they said.
  Numbers: physics-simulation.md's header and its git history (lib/core/sim-cloth.js, sim-fluid.js,
  lib/tests/sim.test.mjs).
  NEEDS: topics/physics-simulation.md.
  reveal.js: FLAT; notes follow "Note:" and stay plain text; display formulas are MathJax blocks
  (lib/deck-math.js; TeX inside, the ASCII form as aria-label); inline math is a code span `$...$`;
  never two "_" on one markdown line outside a code fence or code span.
-->

### Supplement: physics, further

<small>(time permitting, or reading) · reading: <a href="../../textbook/animation.html">Animation and Interpolation</a>, Sections 8 to 14</small>


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

<!-- .slide: class="demo-full" -->

## Energy and the step limit, live

<div class="cockpit" data-demo="particle-lab" data-controls="view:phase"><pre class="viz-fallback">  the phase plane: x against v / omega, where the exact motion is a circle; energy against step
  h = 0.1, omega = 10 (h omega = 1): explicit x2 energy per step, semi-implicit bounded
  h = 0.01: explicit x1.01 per step, x2.705 after 100 steps
  semi-implicit at h = 0.19 (h omega = 1.9): bounded; at h = 0.21 (2.1): grows
  the Step limit view: growth per step against h omega for all four integrators</pre></div>


---

<!-- .slide: class="demo-full" -->

## The fixed step, live

<div class="cockpit" data-demo="particle-lab" data-controls="view:stepping"><pre class="viz-fallback">  the same spring stepped two ways while the frames vary: one step per frame (h = the frame's
  length) against a fixed 10 ms step from the accumulator; the readout is how far each ends from
  the exact motion
  steady 60 Hz: 0.096 against 0.055;  jittery frames: 0.15;  a 100 ms hitch: 0.23
  a 250 ms stall: 0.94 against 0.056;  the stall with 16 substeps per frame: 0.043</pre></div>


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

## Worked: one constraint projection

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

## Worked: pushing a particle out

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

### Rigid bodies in an engine

<small>(~15 min)</small>


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
