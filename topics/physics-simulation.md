<!--
  CSS 551 · TOPIC DECK: Physics inside the frame loop (~30 min).
  Mounted as <section data-markdown="../../topics/physics-simulation.md">. No logistics.

  TEACHES: a particle as position, velocity and mass; forces to acceleration;
  explicit versus semi-implicit Euler worked by hand on one spring; energy growth
  (1 + (h omega)^2 per step) and the stability limit h omega < 2; the fixed step and
  substeps; stiffness versus stability; cloth as springs or as constraints (XPBD),
  one constraint projection worked; collisions by projection and tunneling; fluids
  as particles (SPH: density, pressure, viscosity, the CFL step); rigid bodies and
  hair as particle clusters; what film and games use.
  NEEDS:   the interactive-loop topic (the frame loop, the two clocks, the
    fixed-timestep accumulator). Vectors are used only as (x, y, z) triples; the
    vectors lecture comes later.
  DEMOS:   cloth (stiffness,substeps) and fluid (viscosity,sound), each on a
    demo-full slide.
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
      constraints: stretch 369.9 / 31.6 / 3.6 / 1.3 % at 1 / 4 / 16 / 64 substeps
        (0.45 / 1.64 / 6.96 / 27.8 ms per frame in node)
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
  READING: ../../textbook/animation.html (the section on stepping a spring).

  reveal.js: FLAT; notes follow "Note:"; plain text math, no KaTeX; never two
  "_" on one markdown line outside a code fence; paths relative to the lecture page.
-->

### Physics inside the frame loop

<small>(~30 min) · reading: <a href="../../textbook/animation.html">Animation and Interpolation</a>, the section on stepping a spring</small>


---

## A particle is three numbers and a rule

```text
   state:   position x = (x, y, z)      velocity v = (vx, vy, vz)      mass m
   forces:  gravity  m·(0, −9.81, 0)     springs     wind     contact
   rule:    acceleration a = F / m                       (Newton, 1687)
   step h:  new v  from a,    new x  from v
```

- a cloth, a splash, a crowd of dice, a head of hair: **thousands of particles**, each with this state
- the physics is two lines; everything interesting is in **which forces** and **how you step**


---

## One spring, by hand

A 1 kg mass on a spring, **k = 100 N/m**, pulled to **x = 1 m** and released; **h = 0.1 s**.

```text
   a = −k·x / m = −100 · 1 / 1 = −100 m/s²

   explicit Euler       (both updates use the OLD state)
      x ← x + h·v     = 1 + 0.1 · 0      = 1
      v ← v + h·a     = 0 + 0.1 · (−100) = −10

   semi-implicit Euler  (velocity first, then position with the NEW velocity)
      v ← v + h·a     = −10
      x ← x + h·v     = 1 + 0.1 · (−10)  = 0
```


---

## Five steps later

| t (s) | exact x = cos 10t | explicit x | explicit energy (J) | semi-implicit x | semi-implicit energy (J) |
| --- | --- | --- | --- | --- | --- |
| 0.0 | 1.000 | 1 | 50 | 1 | 50 |
| 0.1 | 0.540 | 1 | 100 | 0 | 50 |
| 0.2 | −0.416 | 0 | 200 | −1 | 100 |
| 0.3 | −0.990 | −2 | 400 | −1 | 50 |
| 0.4 | −0.654 | −4 | 800 | 0 | 50 |

- explicit Euler **doubles** the energy every step: the spring gains energy from nowhere
- semi-implicit Euler is **wrong in phase** but its energy stays near 50 J


---

## Why the energy grows, and how fast

```text
   explicit Euler, spring with ω = √(k/m):
      energy after one step = energy before × (1 + (h·ω)²)

      h = 0.1,  ω = 10:   × 2      per step
      h = 0.01, ω = 10:   × 1.01   per step,  × 2.705 after 1 s (100 steps)

   semi-implicit Euler:
      bounded while h·ω < 2      (h < 0.2 s here)
      h = 0.19:  energy stays under 1,000 J over 200 steps
      h = 0.21:  energy reaches 9 × 10¹¹¹ J
```


---

## A third way: step with the future force

**Implicit (backward) Euler** uses the acceleration at the **end** of the step. For one spring it solves exactly:

```text
   v₁ = (v₀ − h·k·x₀/m) / (1 + h²·k/m)          x₁ = x₀ + h·v₁
   same spring, h = 0.1:   v₁ = (0 − 10) / 2 = −5      x₁ = 1 + 0.1·(−5) = 0.5
```

| t (s) | 0.0 | 0.1 | 0.2 | 0.3 | 0.4 |
| --- | --- | --- | --- | --- | --- |
| x | 1 | 0.5 | 0 | −0.25 | −0.25 |
| energy (J) | 50 | 25 | 12.5 | 6.25 | 3.125 |

- **stable at any step**, but it **drains** energy: here, half per step
- for a cloth it means solving one linear system per step: Baraff and Witkin's **Large Steps** (1998)


---

## Verlet: positions only

```text
   x(n+1) = 2·x(n) − x(n−1) + a(n)·h²          the velocity is implied: (x(n) − x(n−1)) / h
   same spring, starting at rest (x(−1) = x(0) = 1):   1, 0, −1, −1, 0, 1
```

- the **same positions** as semi-implicit Euler on this spring, with no velocity stored
- a constraint can then move a position directly and the velocity follows: the basis of **position-based** methods
- used by Jakobsen for **Hitman**'s cloth and ragdolls (GDC 2001)


---

## The step is fixed; the frame is not

```text
   each displayed frame (16.7 ms at 60 Hz):
      for s in 1 … substeps:
         h = (1/60) / substeps
         apply forces, step velocities, step positions, resolve contacts
```

- the **accumulator** from the loop topic keeps the step fixed however long the frame took
- **substeps** shorten h without shortening the frame: 16 substeps at 60 Hz is h = 1.04 ms
- the price is compute: 16 substeps cost about 16 times one step


---

## Damping, and its own limit

- real materials lose energy: a spring gets a **damper**, force −c · (relative velocity)
- **critical damping** c = 2·√(k·m): for the 1 kg, 100 N/m spring, **c = 20 N·s/m**
- a damper is stiffness in velocity: stepped explicitly it is stable only while **h·c/m** stays small

**The pitfall, measured**: in this course's cloth, a fixed damper of 0.4 N·s/m on each link made **every** spring cloth explode, even at k = 50 with 16 substeps, because each particle weighs 0.000521 kg. Scaling it to 2 % of critical per link fixed it.


---

## A cloth is a grid of links

```text
   24 × 24 particles                      links in the course's cloth
     o───o───o      structural  ─ │           1,104   hold the length
     │ ╲ │ ╱ │      shear       ╲ ╱           1,058   resist shearing into a diamond
     o───o───o      bend        over 2          1,056   resist folding (5× softer here)
                                            ───────
                                            3,218 links for 576 particles
```

- one material, three jobs: without shear links a square **collapses** into a rhombus; without bend links it **crumples** like paper tissue


---

## Predict first

On the demo's cloth, **k = 2000 N/m**, **springs**, 16 substeps:

- **A.** it hangs and flutters, stretched about 1 %
- **B.** it sags much further than on constraints, but holds
- **C.** it explodes within a few frames
- **D.** it freezes in place

Then: how many substeps make it hold?


---

## Stiffness against the step

A cloth of 576 particles, **0.3 kg** in all: each particle is **0.000521 kg**. Links at **k = 2000 N/m**:

| substeps | h (ms) | h·√(k/m) | springs |
| --- | --- | --- | --- |
| 4 | 4.167 | 8.16 | explode |
| 16 | 1.042 | 2.04 | explode |
| 64 | 0.260 | 0.51 | hold, 1.2 % stretch |

- a cloth node pulls on up to 12 links, so it goes unstable **below** the single-spring limit of 2
- 64 substeps: **24.8 ms** per frame on a laptop, already over the whole 16.7 ms budget


---

## Constraints instead of springs

Instead of a force proportional to the stretch, **move the two particles back** toward the rest length:

```text
   two particles, 1 kg each, rest length 1 m, now 1.2 m apart:   C = 1.2 − 1 = 0.2

   rigid link:   each moves 0.1 toward the other        → length 1.0
   XPBD, k = 1000 N/m, h = 1/60 s:
      α̃ = 1 / (k·h²) = 3.6
      Δλ = −C / (1 + 1 + α̃) = −0.2 / 5.6 = −0.0357
      each moves 0.0357 toward the other                 → length 1.1286
   then:  velocity = (new position − old position) / h
```


---

## XPBD, one substep in code

```js
for (const p of particles) { p.prev = p.x; p.v += h * g; p.x += h * p.v; }   // predict
collide(particles);                                                          // contacts
for (const L of links) {                                                     // project
  const d = sub(L.b.x, L.a.x), len = length(d), C = len - L.rest;
  const alpha = 1 / (k * h * h);
  const dl = -C / (L.a.w + L.b.w + alpha);
  L.a.x -= L.a.w * dl * d / len;   L.b.x += L.b.w * dl * d / len;
}
for (const p of particles) p.v = (p.x - p.prev) / h;                         // velocities
```

(`w` = 1/m, 0 for a pinned particle; `lib/core/sim-cloth.js` is this with arrays)


---

## Constraints: the same cloth, the same k

| substeps | h (ms) | max stretch | cost per frame |
| --- | --- | --- | --- |
| 1 | 16.67 | 369.9 % | 0.45 ms |
| 4 | 4.167 | 31.6 % | 1.64 ms |
| 16 | 1.042 | 3.6 % | 6.96 ms |
| 64 | 0.260 | 1.3 % | 27.8 ms |

- **never explodes**, at any setting; too few substeps make it **rubbery**, not dangerous
- 16 substeps: a cloth that holds its size at under 7 ms


---

<!-- .slide: class="demo-full" -->

## The cloth, live

<div class="cockpit" data-demo="cloth" data-controls="stiffness,substeps"><pre class="viz-fallback">  a 24 × 24 cloth, 0.3 kg, pinned at two corners, over a sphere, in a gusting wind
  controls:  stiffness k (N/m), substeps per 1/60 s frame, links = constraints | springs
  readout:   step h, h·√(k/m), max stretch, kinetic energy, step time, state
  k = 2000:  springs explode at 16 substeps and hold at 64;
             constraints stretch 369.9 % at 1 substep, 3.6 % at 16</pre></div>


---

## Contacts: push the particle out

```text
   sphere at c, radius r;   particle at p;   d = |p − c|
   if d < r:   p ← c + (p − c) · r / d          (straight out along the normal)
   floor y = y0:   if p.y < y0:   p.y ← y0

   friction: keep only part of this step's sliding motion along the surface
```

- **tunneling**: at 5 m/s a particle moves **8.33 cm per frame** at 60 Hz, past any thinner obstacle
- 16 substeps: **0.52 cm** per step, so thin walls stop it


---

## Rigid bodies and hair from the same parts

- **a cube**: 8 particles and all **28** links between them, solved as rigid constraints; it lands, tumbles and stays a cube (within 2 % in the tests)
- **a ragdoll**: particles at the joints, links as bones; Jakobsen's **Hitman** (GDC 2001) ran its characters and cloth this way
- **a hair**: a chain of 14 links pinned at the root, with links over every second particle for bending
- production engines treat rigid bodies with their own solvers (positions, orientations, impulses), but the idea carries


---

## Fluids as particles

Smoothed particle hydrodynamics (Müller, Charypar and Gross, 2003):

```text
   density    ρᵢ = Σⱼ m · W(|xᵢ − xⱼ|)        W: a bump of radius H around each particle
   pressure   pᵢ = k · (ρᵢ − ρ₀)             above rest density → push
   forces     pressure (push apart) + viscosity (match neighbors' velocity) + gravity
   step       aᵢ = Fᵢ / ρᵢ,  then the same Euler step as the cloth
```

- a particle only feels neighbors within **H**: a grid of cell size H finds them in 9 cells
- course demo: spacing **8 px**, H = **16 px**: on the rest lattice, 8 neighbors plus itself


---

## The kernel and the neighbor grid

```text
   W(r) = 4 / (π·H⁸) · (H² − r²)³   for r < H,  0 beyond       (integrates to 1 over the plane)
   H = 16 px:   W(0) = 4.97 × 10⁻³     W(8 px) = 2.10 × 10⁻³ (42 % of the peak)     W(16 px) = 0

   900 particles, all pairs:   404,550 distance checks per step
   grid of 16 px cells:        9 cells per particle, about 9 particles within H at rest
```

- the rest density ρ₀ is the sum of W over the resting lattice, so the dam starts **at rest**, not exploding


---

## The fluid's step limit

```text
   pressure waves travel at the speed of sound c; a step must not skip a neighbor:
      dt ≤ 0.4 · H / c                      (the CFL condition)

      c = 1800 px/s:  dt = 3.556 ms          c = 900 px/s:  dt = 7.111 ms

   stiffer (larger c) → less compression, shorter steps, more steps per frame
```

- this SPH is only **weakly** incompressible: the demo's densest particle sits **20 to 30 %** above rest in a dam break
- real water compresses by a fraction of a percent: film solvers enforce incompressibility with a pressure solve


---

## Predict: viscosity

The dam breaks with viscosity **2.5**. Drop it to **0.2**; what changes first?

- **A.** the wave reaches the far wall later
- **B.** the front breaks into spray and single particles fly
- **C.** the fluid compresses more
- **D.** nothing visible; viscosity only matters for honey


---

<!-- .slide: class="demo-full" -->

## The fluid, live

<div class="cockpit" data-demo="fluid" data-controls="viscosity,sound"><pre class="viz-fallback">  a 2D SPH fluid: a dam of 900 particles collapsing across an 800 × 600 px box
  controls:  viscosity, stiffness (speed of sound c)
  readout:   particles, step dt = 0.4 H / c, sim time, peak compression, max speed, compute per frame
  at c = 1800 px/s: dt = 3.556 ms; peak compression about 20 to 30 %</pre></div>


---

## Where each method lives

| material | real-time (games) | offline (film) |
| --- | --- | --- |
| cloth | position-based constraints, few substeps | implicit integration (Baraff and Witkin, 1998) |
| rigid bodies | impulse and constraint solvers (Unity uses NVIDIA PhysX) | the same, with smaller steps and more contacts |
| liquids | particles, or a height field for a surface | grid and hybrid solvers with a pressure solve (Stam, 1999, onward) |
| snow, sand | rare | material point method (Disney, Frozen, 2013) |
| hair | strands of links, few per character | every strand: Merida (Brave, 2012) has about 111,700 hairs |


---

## What to keep

- a simulation is **forces → accelerations → a fixed step**, many substeps per frame
- **explicit Euler** gains energy every step; **semi-implicit Euler** is stable while **h·√(k/m) < 2**
- stiff springs need short steps; **constraints** (XPBD) trade that for softness and never explode
- contacts are **projections**; substeps also stop **tunneling**
- fluids are particles with **density and pressure** in place of links, under a **CFL** step limit

