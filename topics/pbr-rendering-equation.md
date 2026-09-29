<!--
  CSS 551 · TOPIC DECK: Honest light, from Phong to the rendering equation and PBR (~40 min).
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

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no KaTeX
  plugin). Never two "_" on one markdown line outside a code fence; backtick names
  with underscores. No <small> on math. Paths are relative to the page that mounts
  this topic (lectures/LNN-slug/index.html or sessions/SNN/index.html).
-->

### Honest light: from Phong to the rendering equation

<small>(~40 min)</small>


---

## What the local model gets wrong

The illumination topic shaded each point from the lights, the normal and the eye, and **nothing else in the scene**. Three departures from physics:

- **energy**: Phong can reflect **more** light than arrives; a real surface reflects **at most** what hits it
- **reciprocity**: swap the light and the eye and a real surface looks identical; Phong's terms carry no such guarantee
- **no bounces**: the scene's **indirect** light (color bleeding, soft shadows) is absent, faked by the **ambient** constant

One gap behind all three: Phong never **balances the light energy** at a point. This topic writes the balance down.


---

## The unit: radiance

The balance is a statement about **radiance**, so the unit comes first:

- **flux**: power, in watts
- **irradiance E**: flux arriving **per unit area**, W/m²; what a light meter held against the surface reads; it already includes the **cosine** (Lambert's argument)
- **radiance L**: flux per unit area **per unit solid angle**, W/(m²·sr): the light traveling along **one ray**; constant along a ray in empty space; what a pixel measures

```text
   E = ∫ Li(ωi) · (n·ωi) dωi        over the hemisphere Ω above the point

   a uniform sky of radiance 1:    E = ∫ cos θ dω = π = 3.1416
```


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

## The integral as a sum

Replace the sky by **three small distant lights**, so the integral becomes a sum. A matte surface, albedo ρ = 0.6, whose BRDF is the constant ρ/π = **0.191**:

| light | Li | angle to n | n·ωi | f · Li · (n·ωi) |
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

## The BRDF: the material's answer

Pull one factor out of the integral: `f(p, ωi, ωo)`, the **B**idirectional **R**eflectance **D**istribution **F**unction. Given light from `ωi`, it returns the fraction that leaves toward `ωo`. It **is** the material:

```text
   diffuse (matte)   f = constant = ρ/π    same to every direction: the flat, view-independent term
   specular (shiny)  f peaks near mirror    big only when ωo is near the light's reflection: the highlight
```

A **physical** BRDF must obey exactly the rules Phong broke:

- **non-negative**: no negative light
- **reciprocal**: `f(ωi, ωo) = f(ωo, ωi)`; swap light and eye, same value (Helmholtz)
- **energy-conserving**: `∫ f · (n·ωi) dωi ≤ 1`; it reflects **at most** what arrived


---

## Why Phong is not a BRDF

Light straight down the normal, Phong's specular lobe with ks = 1: how much leaves, in total?

```text
   ∫ cos^s θ · cos θ dω  =  2π / (s + 2)

   s                    1        4        8        32       128
   reflected/arriving   2.094    1.047    0.628    0.185    0.048
```

- a broad lobe (s ≤ 4) sends out **more** light than came in; a sharp one sends out almost **none**
- **normalized Phong** multiplies by (s + 2)/2π: sharper highlights become **brighter**, as a real surface's do


---

## Microfacets, and the two sliders

The physical specular BRDF models a rough surface as a field of microscopic **perfect mirrors**, the **microfacets**; a highlight is the **fraction** of them angled to bounce the light into your eye.

```text
   smooth surface              rough surface
   ▁▁▁▁▁▁▁▁▁▁  facets aligned    ╱╲╱╲╱╲╱╲  facets scattered
   → tight, bright highlight     → broad, dim highlight
```

- **Cook-Torrance** multiplies three factors: **D** (how many facets face the half vector; **roughness** lives here), **G** (facets shadowing each other at grazing angles), **F** (**Fresnel**: every surface is mirror-like edge-on)
- `f = D · G · F / (4 (n·ωi)(n·ωo))`
- engines expose two sliders on top: **metallic** and **smoothness** (Unity's name for 1 − roughness)


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

## Fresnel, exactly

Schlick's `F0 + (1 − F0)(1 − cos θ)⁵` is an approximation. The exact reflectance splits by polarization:

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

## Energy: the furnace test

<img src="../../textbook/figures/pbr-furnace.svg" class="media-shot" style="max-height: 205px;" alt="directional albedo of the single-scattering microfacet model against roughness, for several viewing angles, falling well below one at high roughness">

Put a perfectly reflective surface (F = 1) inside a uniformly lit sphere: it should vanish, returning **exactly** what arrives. The single-bounce microfacet model does not:

```text
   α = 1,  viewed head-on:      albedo 0.302     70 % of the light lost
   averaged over the hemisphere: 0.379 at α = 1,   0.691 at α = 0.5
```

The lost light bounced **between facets**, which the model ignores. Multiple-scattering compensation adds it back; without it, a roughness texture is also a darkness texture.


---

## The two sliders, rendered

<img src="../../textbook/figures/pbr-sphere-grid.svg" class="media-shot" style="max-height: 400px;" alt="a five by five grid of shaded spheres: roughness increasing left to right, metallic increasing top to bottom; the plastic row keeps its color in shadow, the metal row goes dark except for tinted reflections">

<small>Computed by the course-text figure generator: one directional light plus a two-tone sky/ground, Lambert + GGX D + Smith G + Schlick F. Across: roughness 0.1 to 0.9. Down: metallic 0 to 1.</small>


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

Same roughness, **different** lobe: GGX has a **narrower core** (and, in a full BRDF, longer tails). **Honest note:** the demo's GGX curve is the distribution's **shape** used as a lobe radius: no Fresnel, no G, no normalization. **Shape, not calibrated units.**


---

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

