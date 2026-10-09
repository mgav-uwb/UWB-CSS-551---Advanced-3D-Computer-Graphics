<!--
  CSS 551 · TOPIC DECK: Light transport, from Phong to the rendering equation and PBR (~69 min, 42 slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/pbr-rendering-equation.md"> among others; it
  carries no lecture logistics (no title, homework, wrap) and no "Part N" numbering.

  TEACHES: why a local model is wrong (energy, reciprocity, bounces); radiance and
  irradiance (a uniform sky of radiance 1 gives E = π); the rendering equation term by
  term, worked as a three-light sum (Lo = 0.460) and read as a self-reference; the BRDF
  and its laws; why Phong is not one (a lobe reflects 2π/(s + 2) of what arrives: 2.09
  at s = 1); microfacets, D, G and F evaluated once by hand (f = 0.0465); Fresnel
  exactly (glass at 60°: 0.089 against Schlick's 0.070; gold's F0 0.967 red, 0.324 blue);
  the furnace test (a rough surface at α = 1 keeps 30 %); metallic and roughness on a
  computed sphere grid; the lobe live; the α-convention pitfall.
  FIGURES: ../../textbook/figures/pbr-sphere-grid.svg, pbr-furnace.svg
           (tools/gen-textbook-figures.mjs).
  NUMBERS: textbook/figures/numbers.json (reSum, phongAlbedo, ct_mirror, ct_off,
           ct_mirror_rough, ggxD_at_normal, fresnel, furnace); numbers-surfaces.json
           ill.irradiance.
  NEEDS:   a local illumination model (the illumination topic); the history
           chapter's era 3.
  DEMOS:   data-demo="brdf-lobe" data-controls="roughness" (under the page's crop).

  v2 (Plan C, 2026-09-29): expanded from ~20 to ~40 min for the light-transport
  lecture; the D formula on the hand evaluation corrected to 1/(πα²); em-dashes removed.

  v3 (2026-10-05, L12 to ~80 slides): a point light to a pixel; a cosine-or-albedo check; the hemisphere
  integral π and ρ/π derived; 2π/(s + 2) derived; GGX evaluated away from the mirror (f = 0.0202); F0 from the
  index (water, glass, diamond, Brewster); a metal-or-plastic highlight check; the diffuse-plus-specular energy
  pitfall (1.21 against 0.88 at 80°). Numbers from node and the chapter's hands-on code.

  EDIT 2026-10-08: the two multiple-choice Check slides cut (cosine or albedo; metal or plastic), their
  results moved into the notes of "The integral as a sum" and "Metals and dielectrics"; titles without
  "Why" ("Radiance does not fade with distance", "Phong breaks the energy budget"). 35 slides.

  SLOWED 2026-10-08 (L12's midterm review moved to the practice midterm; ~69 min, 42 slides): computed figures
  (tools/gen-lecture-figures-pbr.mjs, textbook/figures/pbrr-*.svg) and derivations: irradiance and radiance pictured;
  the solid angle of a patch, dA cos θ / r², deriving the point light's I cos θ / d²; the rendering equation
  pictured; Li·Δω in the three-light sum instead of setting Δω to 1; bounces as a geometric series
  (1/(1 − ρ): 2 at 0.5, 5 at 0.8); the BRDF's unit, 1/sr (0.424 at α = 0.1); the half vector and the facets
  facing it; Snell's law before Fresnel (35.26° in glass at 60°).

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no KaTeX
  plugin). Never two "_" on one markdown line outside a code fence; backtick names
  with underscores. No <small> on math. Paths are relative to the page that mounts
  this topic (lectures/LNN-slug/index.html).
-->

### Light transport: from Phong to the rendering equation

<small>(~47 min)</small>


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

```text
   E = ∫ Li(ωi) · (n·ωi) dωi        over the hemisphere Ω above the point

   a uniform sky of radiance 1:    E = ∫ cos θ dω = π = 3.1416
```

Radiance is **constant along a ray** in empty space; irradiance depends on how the patch is turned.


---

## Solid angle: area on the unit sphere

A **solid angle** is to a sphere what an angle is to a circle: the area it covers on the **unit** sphere, in **steradians**.

```text
   the whole sphere          4π  = 12.566 sr
   a hemisphere              2π  =  6.283 sr         (every direction above a surface)
   the sun, seen from Earth  2π(1 − cos 0.2666°) = 0.000068 sr
```

Radiance is per steradian because a light's effect depends on **how big it looks**, not how big it is: the sun covers 0.000068 sr and still outshines the whole sky.


---

## The solid angle of a small patch

<img src="../../textbook/figures/pbrr-solid-angle.svg" alt="A point light of intensity 10 watts per steradian at the left and a small patch 2 m away at the right, tilted so its normal is 60 degrees from the line to the light; a thin cone joins them. Beside it: the patch seen from the light looks smaller by cos theta and by r squared, so d omega equals dA cos theta over r squared; the flux into the patch is I d omega, so E equals I cos theta over r squared, 1.25 W per square meter" style="height:330px">

Two facts the illumination topic used without proof, from one formula: **Lambert's cosine** and the **inverse square**.


---


## Radiance does not fade with distance

Radiance is **constant along a ray** in empty space. A consequence you can check with your eyes:

```text
   a white wall, 2 m away:   a pixel sees an area A of wall, each unit sending light toward you
   the same wall, 4 m away:  the pixel sees 4A of wall (the area grows with d²)
                             each unit's light reaching you drops to ¼ (inverse square)
                             4 × ¼ = 1:   the wall looks exactly as bright
```

A camera pixel collects light from a small **solid angle**: it measures radiance, and radiance does not fade with distance. Only the **size** of things on the screen changes.


---

## Four radiometric quantities, one table

| quantity | symbol | unit | what it answers | a light meter that reads it |
| -------- | ------ | ---- | --------------- | --------------------------- |
| flux | Φ | W | how much power in total | an integrating sphere around the bulb |
| intensity | I | W/sr | how much power per direction, from a point | a meter far away, pointed at the bulb |
| irradiance | E | W/m² | how much arrives per area | a meter lying flat on the table |
| radiance | L | W/(m²·sr) | how much travels along one ray | a camera pixel |

A point light's I is constant; the E it puts on a table falls as I cos θ / d²; the L a camera sees from the table does not fall with the camera's distance.


---

## Worked: from a point light to a pixel

A bulb of intensity `I = 10 W/sr`, `d = 2 m` from a matte table (ρ = 0.6), light arriving 60° from the normal:

```text
   irradiance on the table:   E  = I cos θ / d²  = 10 × 0.5 / 4      = 1.25 W/m²
   radiance toward the eye:   Lo = (ρ/π) · E     = 0.191 × 1.25      = 0.239 W/(m²·sr)
   move the bulb to 4 m:      E  = 0.3125,  Lo = 0.060                (inverse square)
   move the camera to 4 m:    Lo = 0.239                              (radiance does not fade)
```

Moving the **light** dims the table; moving the **camera** does not.


---

## The rendering equation

Kajiya, 1986: the balance of light at a surface point `p`, for the outgoing direction `ωo` toward the eye:

```text
   Lo(p, ωo) = Le(p, ωo) + ∫  f(p, ωi, ωo) · Li(p, ωi) · (n·ωi) dωi
                            Ω
```

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

```text
   every surface reflects a fraction ρ:
   L = Ldirect (1 + ρ + ρ² + ρ³ + …) = Ldirect / (1 − ρ)
```

A light room is mostly **indirect** light: at ρ = 0.8, four of every five parts.


---

## Reciprocity: paths can run backward

A physical BRDF is **reciprocal**: f(ωi, ωo) = f(ωo, ωi) (Helmholtz). Consequence: the light carried along a path is the same in either direction.

- a camera ray traced **from the eye** finds the same light as a photon traveling **from the lamp** along the same path
- so renderers may trace from the eye (path tracing), from the lights (photon mapping), or **both and connect** (bidirectional path tracing)
- Phong's specular term is **not** reciprocal: with it, the choice of direction changes the answer


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

## The BRDF's unit: per steradian

```text
   f(ωi, ωo) = dLo(ωo) / ( Li(ωi) · cos θi · dωi )
             = outgoing radiance / arriving irradiance
   unit:       (W/(m²·sr)) / (W/m²) = 1/sr
```

| surface | f at the mirror direction (light and eye at 30°) |
| --- | --- |
| matte, ρ = 0.6 | 0.191 in every direction |
| plastic, α = 0.3 | 0.0465 (specular) |
| plastic, α = 0.1 | 0.424 (specular) |
| a perfect mirror | unbounded: all the light in one direction |

The energy law limits the **integral** of f · cos, not the value of f.


---

## The cosine over the hemisphere, integrated

Write a direction by its angle θ from the normal and its azimuth φ; the patch of solid angle is `dω = sin θ dθ dφ`:

```text
   ∫Ω cos θ dω  =  ∫ from φ = 0 to 2π  ∫ from θ = 0 to π/2   cos θ sin θ dθ dφ
                =  2π · [ sin² θ / 2 ] from 0 to π/2
                =  2π · ½  =  π  =  3.1416          (a midpoint sum of 100,000 strips: 3.1415927)

   a matte surface reflecting a fraction ρ:   ∫ f cos dω = f · π = ρ    ⇒    f = ρ / π
```

The π in every Lambertian shader is this integral, not a convention.


---

## BRDF lobes, drawn

<img src="../../textbook/figures/pbr-lobes.svg" class="media-shot" style="max-height: 280px;" alt="polar plots of reflectance for a fixed incoming direction: a Lambertian half-circle, a glossy lobe around the mirror direction, and a sharp specular spike">

For light from one direction, the BRDF's value in every outgoing direction:

- **Lambertian**: a half-circle, the same everywhere: matte
- **glossy**: a lobe around the mirror direction: roughness sets its width
- **mirror**: a spike: all the light in one direction


---

## Phong breaks the energy budget

Light straight down the normal, Phong's specular lobe with ks = 1: how much leaves, in total?

```text
   ∫ cos^s θ · cos θ dω  =  2π / (s + 2)

   s                    1        4        8        32       128
   reflected/arriving   2.094    1.047    0.628    0.185    0.048
```

- a broad lobe (s ≤ 4) sends out **more** light than came in; a sharp one sends out almost **none**
- **normalized Phong** multiplies by (s + 2)/2π: sharper highlights become **brighter**, as a real surface's do


---

## The Phong lobe's total, derived

Light down the normal, so the mirror direction is the normal and the lobe is `cos^s θ`:

```text
   ∫Ω cos^s θ · cos θ dω  =  2π ∫ from 0 to π/2  cos^(s+1) θ · sin θ dθ
   substitute c = cos θ,  dc = −sin θ dθ:
                          =  2π ∫ from 0 to 1  c^(s+1) dc  =  2π / (s + 2)

   s = 1:    2π/3   = 2.094        returns twice what arrives
   s = 32:   2π/34  = 0.185        a numerical sum in node gives 0.1848 as well
```

The same substitution at s = 0 gives π: the plain cosine over the hemisphere.


---

## Microfacets, and the two sliders

The physical specular BRDF models a rough surface as a field of microscopic **perfect mirrors**, the **microfacets**; a highlight is the **fraction** of them angled to bounce the light into your eye.

- **smooth**: facets aligned, so a tight, bright highlight
- **rough**: facets scattered, so a broad, dim highlight

- **Cook-Torrance** multiplies three factors: **D** (how many facets face the half vector; **roughness** lives here), **G** (facets shadowing each other at grazing angles), **F** (**Fresnel**: every surface is mirror-like edge-on)
- `f = D · G · F / (4 (n·ωi)(n·ωo))`
- engines expose two sliders on top: **metallic** and **smoothness** (Unity's name for 1 − roughness)


---

## The half vector picks the facets

<img src="../../textbook/figures/pbrr-half-vector.svg" alt="Left: light arriving 20 degrees on one side of the normal, the eye 50 degrees on the other, and the half vector h between them at 15 degrees. Right: a jagged microsurface of small facets; the facets whose normals point along h are purple and reflect the incoming orange ray into the outgoing green ray; the others are gray. Caption: only facets whose normal is h send omega i into omega o; D(h) is the fraction of facets facing h" style="height:310px">

A mirror sends `ωi` into `ωo` only if its normal **bisects** them: `h = normalize(ωi + ωo)`.


---

## D: how many facets face the half vector

<img src="../../textbook/figures/pbr-d-and-fresnel.svg" class="media-shot" style="max-height: 200px;" alt="the GGX distribution D against the angle of the half vector from the normal for several roughness values, and the Fresnel reflectance against angle for glass and gold">

GGX (Walter et al., 2007) is the distribution engines use. Its peak, at the normal, is **1/(πα²)**:

```text
   α = 0.1    31.83         α = 0.3     3.537
   α = 0.6     0.884        α = 1.0     0.318 = 1/π    (a perfectly rough surface: flat)
```

D integrates to one over the projected hemisphere: a smooth surface has **all** its facets near the normal, so its peak is **tall and narrow**.


---


## G: facets hide each other

<img src="../../textbook/figures/pbr-geometry.svg" class="media-shot" style="max-height: 200px;" alt="the Smith masking term G1 against the angle from the normal for several roughness values, falling toward zero at grazing angles">

At grazing angles a facet's light is blocked by its neighbors (**shadowing**) or its reflection hidden from the eye (**masking**). Smith's G1 per direction, multiplied for the two:

```text
   G1 = 2(n·x) / ((n·x) + √(α² + (1 − α²)(n·x)²))
   α = 0.3:   at 30° from the normal 0.993;   at 80° it falls steeply;   at 90°, 0
```

Without G, a rough surface would glow at its **silhouette**: the 1/(n·ωo) of the BRDF's denominator blows up there.


---

## One evaluation, by hand

Normal up, light at 30° on one side, eye at 30° on the other, plastic (`F0 = 0.04`), roughness α = 0.3:

```text
   n·ωi = n·ωo = 0.866          h = normalize(ωi + ωo) = n   →  n·h = 1,  ωo·h = 0.866
   D = 1 / (π α²)              = 1 / (π × 0.09)                    = 3.537   (the GGX peak at α = 0.3)
   G = G₁(ωi)·G₁(ωo),  G₁ = 2(n·x) / ((n·x) + √(α² + (1−α²)(n·x)²))  = 0.9926² = 0.985
   F = F0 + (1 − F0)(1 − ωo·h)⁵ = 0.04 + 0.96 × 4.3e−5                 = 0.0400
   f_spec = D·G·F / (4 (n·ωi)(n·ωo)) = 3.537 × 0.985 × 0.040 / 3.0     = 0.0465
```

- against a mid-gray diffuse term `0.6/π = 0.191`: the highlight adds a quarter of the diffuse value at the mirror direction
- light to 45°: `h` tilts 7.5°, `D` drops to 2.57, `f_spec = 0.041`; rougher (α = 0.6): `D = 0.884`, `f_spec = 0.011`
- the highlight got **dimmer as it got wider** with no separate brightness knob: energy conservation doing the bookkeeping


---

## Worked: away from the mirror direction

Same plastic, α = 0.3; light 20° on one side, eye 50° on the other:

```text
   h = normalize(ωi + ωo) = (0.259, 0, 0.966)        15° from the normal: halfway between −20° and 50°
   D  = α² / (π ((n·h)² (α² − 1) + 1)²)                                       = 1.257
   G1(ωi) = 0.997      G1(ωo) = 0.970                  G  = 0.967
   F  = 0.04 + 0.96 (1 − ωo·h)⁵,  ωo·h = 0.819                                 = 0.0402
   f_spec = 1.257 × 0.967 × 0.0402 / (4 × 0.940 × 0.643)                       = 0.0202
```

D, off its peak, does almost all the work: 1.257 against 3.537 at the mirror, and `f_spec` falls from 0.0465 to 0.0202.


---

## Refraction first: Snell's law

<img src="../../textbook/figures/pbrr-snell.svg" alt="Light in air arriving at glass of index 1.5 at 60 degrees from the normal: a dashed reflected ray leaving at 60 degrees, labeled reflected 0.089, and a refracted ray bending to 35.3 degrees inside the glass, labeled enters 0.911. Beside it: Snell's law, sin theta t equals sin 60 over 1.5 equals 0.577, theta t 35.26 degrees, cos theta t 0.8165; then Rs 0.1766, Rp 0.0018, F 0.0892" style="height:310px">

The exact reflectance needs the **refracted** angle first: `sin θi = n · sin θt`.


---

## Fresnel, exactly

Schlick's `F0 + (1 − F0)(1 − cos θ)⁵` is an approximation. The exact reflectance splits by polarization, using the refracted cosine from Snell's law:

```text
   glass (n = 1.5) at 60°:   cos θt = 0.8165
      Rs = ((0.5 − 1.5·0.8165)/(0.5 + 1.5·0.8165))² = 0.1766
      Rp = ((0.8165 − 0.75)/(0.8165 + 0.75))²        = 0.0018
      F  = (Rs + Rp)/2 = 0.0892           Schlick: 0.0700, 21 % low
```

- at **Brewster's angle** 56.3°, Rp = 0: why polarized sunglasses remove glare off water
- a **metal** has a complex index; gold's F0 is **0.967** in red and **0.324** in blue: the reflection itself is colored
- a dielectric's F0 barely varies with wavelength (≈ 0.04): its reflection is white, its color comes from **under** the surface


---

## Fresnel for glass: exact against Schlick

| angle | 0° | 30° | 45° | 56.3° (Brewster) | 60° | 75° | 85° |
| ----- | -- | --- | --- | ---------------- | --- | --- | --- |
| exact | 0.040 | 0.042 | 0.050 | 0.074 | 0.089 | 0.253 | 0.613 |
| Schlick | 0.040 | 0.040 | 0.042 | 0.057 | 0.070 | 0.255 | 0.649 |

Schlick is low in the middle (21 % at 60°) and a little high at grazing. It survives because it costs one fifth power and matches the shape.


---

## F0 from the index of refraction

At normal incidence both polarizations agree: `F0 = ((n1 − n2) / (n1 + n2))²`, from air (`n1 = 1`):

| material | n | F0 | Brewster's angle |
| --- | --- | --- | --- |
| water | 1.33 | 0.020 | 53.1° |
| glass | 1.5 | 0.040 | 56.3° |
| diamond | 2.42 | 0.172 | 67.5° |

Water at Brewster: `Rs = 0.078`, `Rp = 0`: the glare off a lake at 53° is entirely s-polarized, and a polarizing filter removes all of it.


---


## Metals and dielectrics: the metallic slider

The same base color means two different things:

```text
   dielectric (metallic 0):   diffuse = base color          specular F0 = 0.04, white
   metal      (metallic 1):   diffuse = 0 (no body)         specular F0 = base color
   in between:                F0 = mix(0.04, base, metallic),  diffuse = base × (1 − metallic)
```

Gold's F0 is (0.967, 0.803, 0.324) head-on, rising toward white at grazing: the reflection is **gold** because the metal's reflectance is.


---

## Energy: the furnace test

<img src="../../textbook/figures/pbr-furnace.svg" class="media-shot" style="max-height: 205px;" alt="directional albedo of the single-scattering microfacet model against roughness, for several viewing angles, falling well below one at high roughness">

Put a perfectly reflective surface (F = 1) inside a uniformly lit sphere: it should vanish, returning **exactly** what arrives. The single-bounce microfacet model does not:

```text
   α = 1,  viewed head-on:      albedo 0.302     70 % of the light lost
   averaged over the hemisphere: 0.379 at α = 1,   0.691 at α = 0.5
```

The lost light bounced **between facets**, which the model ignores. Multiple-scattering compensation adds it back; without it, a roughness texture is also a darkness texture.


---

## Pitfall: diffuse and specular both at full strength

A white plastic (ρ = 0.8, F0 = 0.04) seen at 80° from the normal. Schlick: `F = 0.04 + 0.96 (1 − cos 80°)⁵ = 0.41`.

```text
   diffuse albedo + specular reflectance, added:      0.80 + 0.41           = 1.21     more out than in
   diffuse scaled by (1 − F), as energy requires:     0.80 × 0.59 + 0.41    = 0.88
```

The light that reflects at the surface is not there to enter the body. Scale the diffuse term by `1 − F` (or by `1 − E_spec`), not add it whole.


---

## The two sliders, rendered

<img src="../../textbook/figures/pbr-sphere-grid.svg" class="media-shot" style="max-height: 400px;" alt="a five by five grid of shaded spheres: roughness increasing left to right, metallic increasing top to bottom; the plastic row keeps its color in shadow, the metal row goes dark except for tinted reflections">

<small>Computed by the course-text figure generator: one directional light plus a two-tone sky/ground, Lambert + GGX D + Smith G + Schlick F. Across: roughness 0.1 to 0.9. Down: metallic 0 to 1.</small>


---

## Lighting from an environment: the split sum

An environment map is light from **every** direction: the rendering equation's integral, with a picture as Li. Karis (2013, Unreal Engine 4) splits it into two precomputed pieces:

```text
   ∫ f · Li · cos  ≈  (prefiltered environment at roughness α)  ×  (F0 · A + B)
   A, B: a 2D table over (n·v, α)           at n·v = 0.5, α = 0.5:   A = 0.679,  B = 0.0097
   plastic, F0 = 0.04:    0.04 × 0.679 + 0.0097 = 0.037
   gold:                  (0.689, 0.492, 0.207)
```

<img src="../../textbook/figures/pbr-split-sum-lut.png" class="media-shot" style="max-height: 150px;" alt="the split-sum lookup table: two channels over n dot v and roughness">


---


## Importance sampling the lobe

To estimate the integral with random directions, draw them **where the BRDF is large**. For GGX, two uniform numbers give a half vector:

```text
   α = 0.3,  u = (0.3, 0.25):   cos θh = √((1 − u1) / (1 + (α² − 1) u1)) = 0.981   → θh = 11.1°
                                φh = 2π u2 = 90°
   reflect the view about that half vector → the light direction to trace
```

<img src="../../textbook/figures/pbr-ggx-sampling.svg" class="media-shot" style="max-height: 150px;" alt="sample directions drawn by GGX importance sampling clustering around the mirror direction, against uniform samples spread over the hemisphere">

Samples cluster in the lobe; the weight f·cos/pdf stays near constant, so the noise is small.


---

## The reflectance lobe: roughness reshapes it

The specular BRDF, drawn as a **polar lobe** around the mirror direction. **Roughness** sets its width; two models, two mappings:

```text
   Phong:  radius ∝ max(0, cos φ)^s      s = 2/roughness² − 2   (classic Blinn mapping)
   GGX:    the GGX distribution shape      α = roughness²

   at roughness = 0.4 (the demo default):
   Phong:  s = 2/0.4² − 2 = 10.5      lobe half-width (HWHM) ≈ 21°
   GGX:    α = 0.4² = 0.16            lobe half-width (HWHM) ≈  6°
```

Same roughness, **different** lobe: GGX has a **narrower core** (and, in a full BRDF, longer tails). The demo's GGX curve is the distribution's **shape** used as a lobe radius: no Fresnel, no G, no normalization; its values are **not calibrated units**.


---

<!-- .slide: class="demo-full" -->

## The lobe, live

<div class="cockpit" data-demo="brdf-lobe" data-controls="roughness"><pre class="viz-fallback">  our Cornell scene, wearing ONE BRDF: gold metal teapot + aluminum box,
  plastic bunny + glossy tall box; drag roughness to reshape every highlight
  -- roughness = 0.4 (default) ---------------------------------------------
     Phong:  s = 2/0.4² − 2 = 10.5      HWHM ≈ 21°
     GGX:    α = 0.4²       = 0.16      HWHM ≈  6°
     same roughness, narrower GGX core (shape, not calibrated units:
     no Fresnel, no geometry term, no solid-angle normalization)
     drag roughness → 0.05 for needle-thin mirror highlights; → 1 for broad matte</pre></div>


---

## Pitfall: which roughness?

Engines square the slider: **α = roughness²**. A shader that uses the slider as α directly:

```text
   roughness 0.5:   peak of D = 1/(π α²)
      α = 0.25 (squared, the engine)     D peak = 5.09
      α = 0.5  (slider used directly)    D peak = 1.27        4× too dim, 2× too wide
```

The two conventions agree only at 0 and 1. A material exported from one and rendered by the other looks wrong exactly in the middle of the slider.


---

## Measured materials, and the principled BRDF

- **MERL** (Matusik, Pfister, Brand and McMillan, 2003): **100 real materials** measured on a gonioreflectometer, each a dense table of BRDF values; the ground truth analytic models are fitted against
- **Disney's principled BRDF** (Burley, 2012): a small set of artist-friendly parameters (base color, metallic, roughness, specular, sheen, clearcoat, anisotropy, subsurface) chosen by fitting the MERL materials
- nearly every engine and film renderer since uses a descendant of it

The two sliders of this topic are its core; the rest handle cloth (sheen), car paint (clearcoat), brushed metal (anisotropy).


---


## Light that goes under the surface

Skin, marble, milk, wax: light **enters**, scatters, and exits elsewhere. Inside, it fades by Beer–Lambert:

```text
   transmittance T = e^(−σ d)
   σ = 0.5 per cm:   1 cm → 0.607     3 cm → 0.223
   σ = 4 per cm:     1 cm → 0.018     3 cm → 0.000006
```

A BRDF cannot express it (light leaves from a **different point**); the full model is the BSSRDF. Jensen et al. (2001) made it practical with a diffusion approximation: the soft, glowing look of skin in film since.

