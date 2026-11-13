<!--
  CSS 551 · TOPIC DECK: Light transport, from Phong to the rendering equation (~21 min, 13 slides; the rest
  of the PBR material is in pbr-rendering-equation-supplement.md).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/pbr-rendering-equation.md"> among others; it
  carries no lecture logistics (no title, homework, wrap) and no "Part N" numbering.

  TEACHES: why a local model is wrong (energy, reciprocity, bounces); irradiance and radiance (a uniform
  sky of radiance 1 gives E = π); the steradian defined (Ω = A/r², by analogy with θ = l/r) and the solid angle, and that of a small patch (dA cos θ / r²); the
  rendering equation term by term, pictured, worked as a three-light sum (Lo = 0.460) and read as a
  self-reference; bounces as a geometric series (1/(1 − ρ)); the BRDF and its laws; the cosine over the
  hemisphere integrated (π, so a matte BRDF is ρ/π); BRDF lobes. The rest (radiometry worked further,
  reciprocity, the BRDF's unit, Phong's energy, microfacets, Fresnel, the furnace test, the metallic and
  roughness sliders, environment lighting, importance sampling, the lobe live, measured materials,
  subsurface light) is the supplement.
  FIGURES: ../../textbook/figures/pbr-sphere-grid.svg, pbr-furnace.svg
           (tools/gen-textbook-figures.mjs).
  NUMBERS: textbook/figures/numbers.json (reSum, phongAlbedo, ct_mirror, ct_off,
           ct_mirror_rough, ggxD_at_normal, fresnel, furnace); numbers-surfaces.json
           ill.irradiance.
  NEEDS:   a local illumination model (the illumination topic); the history
           chapter's era 3.
  DEMOS:   none (the brdf-lobe demo moved to the supplement).

  v2 (Plan C, 2026-09-29): expanded from ~20 to ~40 min for the light-transport
  lecture; the D formula on the hand evaluation corrected to 1/(πα²); em-dashes removed.

  v3 (2026-10-05, L12 to ~80 slides): a point light to a pixel; a cosine-or-albedo check; the hemisphere
  integral π and ρ/π derived; 2π/(s + 2) derived; GGX evaluated away from the mirror (f = 0.0202); F0 from the
  index (water, glass, diamond, Brewster); a metal-or-plastic highlight check; the diffuse-plus-specular energy
  pitfall (1.21 against 0.88 at 80°). Numbers from node and the chapter's hands-on code.

  EDIT 2026-10-08: the two multiple-choice Check slides cut (cosine or albedo; metal or plastic), their
  results moved into the notes of "The integral as a sum" and "Metals and dielectrics"; titles without
  "Why" ("Radiance does not fade with distance", "Phong breaks the energy budget"). 35 slides.

  SLOWED 2026-10-08 (L12's review questions moved out of the lecture; ~69 min, 42 slides): computed figures
  (tools/gen-lecture-figures-pbr.mjs, textbook/figures/pbrr-*.svg) and derivations: irradiance and radiance pictured;
  the solid angle of a patch, dA cos θ / r², deriving the point light's I cos θ / d²; the rendering equation
  pictured; Li·Δω in the three-light sum instead of setting Δω to 1; bounces as a geometric series
  (1/(1 − ρ): 2 at 0.5, 5 at 0.8); the BRDF's unit, 1/sr (0.424 at α = 0.1); the half vector and the facets
  facing it; Snell's law before Fresnel (35.26° in glass at 60°).

  SPLIT 2026-10-25 (L13 merges light transport, ray tracing and path tracing into one meeting): the
  core keeps the 13 slides ray tracing and path tracing build on (radiance, the solid angle, the
  rendering equation, the BRDF and ρ/π); the other 28 slides, text unchanged, moved in order to
  pbr-rendering-equation-supplement.md, mounted after the lecture's wrap. Three notes reworded (the
  path-tracing topic twice, the lobe demo in the supplement); one supplement note likewise.

  EDIT 2026-11-12 (Marcel: "make sure we define steradians properly"): "Solid angle: the steradian" defines it
  next to the radian (θ = l/r, Ω = A/r²; one steradian is a cone of half-angle 32.77°; no unit, sr marks it).
  The display formulas typeset by MathJax (lib/deck-math.js; the ASCII form stays as aria-label): the
  irradiance integral, the rendering equation, the bounce series, the cosine integral and ρ/π.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Display formulas are MathJax blocks (lib/deck-math.js); the rest
  is plain unicode text or fenced ```text blocks. Never two "_" on one markdown line outside a code fence; backtick names
  with underscores. No <small> on math. Paths are relative to the page that mounts
  this topic (lectures/LNN-slug/index.html).
-->

### Light transport: from Phong to the rendering equation

<small>(~21 min)</small>


---

## What the local model gets wrong

The illumination topic shaded each point from the lights, the normal and the eye, and **nothing else in the scene**. Three departures from physics:

- **energy**: Phong can reflect **more** light than arrives; a real surface reflects **at most** what hits it
- **reciprocity**: swap the light and the eye and a real surface looks identical; Phong's terms carry no such guarantee
- **no bounces**: the scene's **indirect** light (color bleeding, soft shadows) is absent, faked by the **ambient** constant

One gap behind all three: Phong never **balances the light energy** at a point. This topic writes the balance down.


---

## Irradiance and radiance

<img src="../../textbook/figures/pbrr-radiance.svg" alt="Left: a horizontal patch with light arriving from many directions over a dashed hemisphere, labeled irradiance E, all the light arriving at a patch, unit W per square meter. Right: the same patch with one narrow cone of directions running to a pixel, labeled radiance L, the light along one ray, per square meter of beam and per steradian, unit W per square meter per steradian" style="height:320px">

- **irradiance E**: everything arriving at a patch, per m²: what a light meter lying flat reads
- **radiance L**: the light along **one ray**, per m² of beam and per steradian of directions: what a **pixel** reads


---

## Irradiance adds up radiance

Irradiance is radiance summed over every direction above the patch, each weighted by its **cosine** (Lambert's foreshortening):

<div class="tex" role="img" aria-label="E = ∫ Li(ωi) (n·ωi) dωi over the hemisphere Ω above the point">
\[ E = \int_{\Omega} L_i(\omega_i)\,(\mathbf n \cdot \omega_i)\,d\omega_i \]
</div>

A uniform sky of radiance 1 gives

<div class="tex" role="img" aria-label="E = ∫ cos θ dω = π">
\[ E = \int_{\Omega} \cos\theta\, d\omega = \pi \]
</div>

Radiance is **constant along a ray** in empty space; irradiance depends on how the patch is turned.


---

## Solid angle: the steradian

A **radian** measures an angle by the **arc** it cuts on a circle; a **steradian** (sr) measures a **solid angle**, a cone of directions, by the **area** it cuts on a sphere:

<div class="tex" role="img" aria-label="θ = l / r radians (arc length over radius);  Ω = A / r² steradians (area over radius squared)">
\[ \theta = \frac{l}{r}\ \text{rad} \qquad\qquad \Omega = \frac{A}{r^2}\ \text{sr} \]
</div>

- **one steradian** cuts an area **r²**: a cone of half-angle **32.8°**
- both are ratios (m/m, m²/m²), so they have no unit; **sr** is written to mark a solid angle

| directions | solid angle |
| ---------- | ----------- |
| the whole sphere | 4π = **12.57** sr |
| a hemisphere: every direction above a surface | 2π = **6.28** sr |
| a cone of half-angle α | 2π(1 − cos α) |
| the sun from Earth, α = 0.2666° | **0.000068** sr |


---

## The solid angle of a small patch

<img src="../../textbook/figures/pbrr-solid-angle.svg" alt="A point light of intensity 10 watts per steradian at the left and a small patch 2 m away at the right, tilted so its normal is 60 degrees from the line to the light; a thin cone joins them. Beside it: the patch seen from the light looks smaller by cos theta and by r squared, so d omega equals dA cos theta over r squared; the flux into the patch is I d omega, so E equals I cos theta over r squared, 1.25 W per square meter" style="height:330px">

Two facts the illumination topic used without proof, from one formula: **Lambert's cosine** and the **inverse square**.


---

## The rendering equation

Kajiya, 1986: the balance of light at a surface point `p`, for the outgoing direction `ωo` toward the eye:

<div class="tex" role="img" aria-label="Lo(p, ωo) = Le(p, ωo) + ∫ over Ω of f(p, ωi, ωo) · Li(p, ωi) · (n·ωi) dωi">
\[ L_o(p, \omega_o) = L_e(p, \omega_o) + \int_{\Omega} f(p, \omega_i, \omega_o)\, L_i(p, \omega_i)\, (\mathbf n \cdot \omega_i)\, d\omega_i \]
</div>

- **Lo(p, ωo)**: outgoing radiance from `p` toward the eye (**what the pixel gets**)
- **Le(p, ωo)**: light `p` **emits** itself (nonzero only on a light source)
- **∫ … dωi over Ω**: **sum over every incoming direction** `ωi` in the hemisphere `Ω` above `p`
- **f(p, ωi, ωo)**: the **BRDF**: what fraction of light from `ωi` leaves toward `ωo` (the material)
- **Li(p, ωi)**: incoming radiance **arriving** at `p` from direction `ωi`
- **(n·ωi)**: the **cosine**, the illumination topic's **N·L**


---

## The rendering equation, pictured

<img src="../../textbook/figures/pbrr-rendering-eq.svg" alt="A point p on a surface with its normal n and a dashed hemisphere of directions above it. Orange arrows of incoming light Li arrive from several directions, one highlighted with its angle theta to the normal; a purple lobe around the mirror direction is labeled f, the material; a green arrow leaves toward the eye, labeled Lo(p, omega o). Beside it the equation read in words: what leaves toward the eye equals what p emits plus, over every arriving direction, material times arriving light times cosine times the direction's solid angle" style="height:340px">

Each arriving ray contributes **f · Li · cos θ · Δω**; Lo adds them all up.


---

## The integral as a sum

Replace the sky by **three small distant lights**, so the integral becomes a sum. A small light gives its radiance over a small solid angle, so it enters as the product **Li·Δω** (W/m²). A matte surface, albedo ρ = 0.6, whose BRDF is the constant ρ/π = **0.191**:

| light | Li·Δω | angle to n | n·ωi | f · Li·Δω · (n·ωi) |
| ----- | -- | ---------- | ---- | --------------- |
| 1 | 2.0 | 20° | 0.940 | 0.191 × 2.0 × 0.940 = 0.359 |
| 2 | 0.8 | 60° | 0.500 | 0.191 × 0.8 × 0.500 = 0.076 |
| 3 | 0.5 | 75° | 0.259 | 0.191 × 0.5 × 0.259 = 0.025 |
| **Lo** | | | | **0.460** |

- the **cosine**, not the BRDF, makes light 3 nearly irrelevant: it is grazing
- Lo does not depend on ωo at all: a constant BRDF is the **definition** of matte


---

## The equation refers to itself

Li on the right is **some other point's Lo**. The unknown appears on **both sides**:

```text
   the red wall's   Lo(wall → box)   is the white box's   Li(box ← wall)
```

- that self-reference **is** indirect light: color bleeding, filled shadows, a ceiling lit from below
- it is why the equation has **no closed form** for any real scene
- two ways to cope: **approximate** it (local models, ambient, baked light, image-based lighting) or **sample** it (ray tracing and path tracing, the Monte Carlo estimate of the integral)


---

## Bounces add up

<img src="../../textbook/figures/pbrr-bounces.svg" alt="Two bar charts of the light carried by the direct term and by bounces 1 to 7. Left, every surface reflecting 0.5: bars 1, 0.5, 0.25, 0.13 and so on, summing to 2 times the direct light, the first four terms 1.875. Right, every surface reflecting 0.8: bars 1, 0.8, 0.64, 0.51 and so on, summing to 5 times the direct light, the first four terms 2.952" style="height:300px">

Every surface reflects a fraction ρ:

<div class="tex" role="img" aria-label="L = Ldirect (1 + ρ + ρ² + ρ³ + …) = Ldirect / (1 − ρ)">
\[ L = L_{\text{direct}}\,(1 + \rho + \rho^2 + \rho^3 + \cdots) = \frac{L_{\text{direct}}}{1 - \rho} \]
</div>

A light room is mostly **indirect** light: at ρ = 0.8, four of every five parts.


---

## The BRDF: the material's answer

Pull one factor out of the integral: `f(p, ωi, ωo)`, the **B**idirectional **R**eflectance **D**istribution **F**unction. Given light from `ωi`, it returns how much radiance leaves toward `ωo` per unit of irradiance arriving from `ωi`. It **is** the material:

```text
   diffuse (matte)   f = constant = ρ/π    same to every direction: the flat, view-independent term
   specular (shiny)  f peaks near mirror    big only when ωo is near the light's reflection: the highlight
```

A **physical** BRDF must obey exactly the rules Phong broke:

- **non-negative**: no negative light
- **reciprocal**: `f(ωi, ωo) = f(ωo, ωi)`; swap light and eye, same value (Helmholtz)
- **energy-conserving**: `∫ f · (n·ωi) dωi ≤ 1`; it reflects **at most** what arrived


---

## The cosine over the hemisphere, integrated

Write a direction by its angle θ from the normal and its azimuth φ; the patch of solid angle is `dω = sin θ dθ dφ`:

<div class="tex" role="img" aria-label="∫Ω cos θ dω = ∫ from 0 to 2π ∫ from 0 to π/2 of cos θ sin θ dθ dφ = 2π · [sin² θ / 2] from 0 to π/2 = π">
\[ \int_{\Omega} \cos\theta\, d\omega = \int_0^{2\pi}\!\!\int_0^{\pi/2} \cos\theta \sin\theta\, d\theta\, d\varphi = 2\pi \Big[ \tfrac{\sin^2\theta}{2} \Big]_0^{\pi/2} = \pi \]
</div>

A matte surface reflecting a fraction ρ:

<div class="tex" role="img" aria-label="∫ f cos θ dω = f · π = ρ, so f = ρ / π">
\[ \int_{\Omega} f \cos\theta\, d\omega = f\,\pi = \rho \quad\Longrightarrow\quad f = \frac{\rho}{\pi} \]
</div>

The π in every Lambertian shader is this integral, not a convention.


---

## BRDF lobes, drawn

<img src="../../textbook/figures/pbr-lobes.svg" class="media-shot" style="max-height: 280px;" alt="polar plots of reflectance for a fixed incoming direction: a Lambertian half-circle, a glossy lobe around the mirror direction, and a sharp specular spike">

For light from one direction, the BRDF's value in every outgoing direction:

- **Lambertian**: a half-circle, the same everywhere: matte
- **glossy**: a lobe around the mirror direction: roughness sets its width
- **mirror**: a spike: all the light in one direction
