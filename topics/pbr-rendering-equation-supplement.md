<!--
  CSS 551 · TOPIC DECK (supplement): Light transport, further (~46 min, 28 slides).
  Mounted after the wrap of a lecture that mounts pbr-rendering-equation.md, and covered time permitting:
  no homework needs it. Its slides are the light-transport topic's further radiometry, the BRDF's laws
  worked, the microfacet model and Fresnel by hand, energy and the furnace test, the metallic and
  roughness sliders, environment lighting, importance sampling, the lobe live, measured materials and
  light under the surface, in the topic's order; the course text covers them in Light Transport and PBR,
  Sections 3 to 10.

  TEACHES: radiance does not fade with distance; the four radiometric quantities; a point light to a pixel
  (E = 1.25, Lo = 0.239); reciprocity; the BRDF's unit, 1/sr (0.424 at α = 0.1); why Phong is not a BRDF
  (a lobe reflects 2π/(s + 2): 2.09 at s = 1); microfacets, the half vector, D, G and F evaluated by hand
  (f = 0.0465; 0.0202 away from the mirror); Snell's law (35.26° in glass at 60°); Fresnel exactly (glass
  at 60°: 0.089 against Schlick's 0.070; gold's F0 0.967 red, 0.324 blue); F0 from the index; metals and
  dielectrics; the furnace test (a rough surface at α = 1 keeps 30 %); the diffuse-plus-specular energy
  pitfall (1.21 against 0.88 at 80°); metallic and roughness on a computed sphere grid; the split sum;
  importance sampling the lobe; the lobe live; the α-convention pitfall; measured and principled
  materials; subsurface scattering.
  NEEDS:   pbr-rendering-equation.md, mounted before it (radiance, the rendering equation, the BRDF, ρ/π).
  DEMOS:   data-demo="brdf-lobe" data-controls="roughness" (under the page's crop).
  FIGURES: ../../textbook/figures/pbr-sphere-grid.svg, pbr-furnace.svg, pbrr-*.svg
           (tools/gen-textbook-figures.mjs, tools/gen-lecture-figures-pbr.mjs).
  NUMBERS: textbook/figures/numbers.json (phongAlbedo, ct_mirror, ct_off, ct_mirror_rough,
           ggxD_at_normal, fresnel, furnace); numbers-surfaces.json ill.irradiance.
  SOURCE:  split 2026-10-25 from pbr-rendering-equation.md (28 slides, text unchanged), when L13 merged
           light transport, ray tracing and path tracing into one meeting.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence; backtick names
  with underscores. No <small> on math. Paths are relative to the page that mounts
  this topic (lectures/LNN-slug/index.html).
-->

### Supplement: light transport, further

<small>(~46 min, time permitting) · reading: <a href="../../textbook/light-transport-pbr.html#brdf">Light Transport and PBR, Sections 3 to 10</a></small>


---

### Radiometry, further

<small>(~5 min)</small>


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

### The BRDF, further

<small>(~7 min)</small>


---

## Reciprocity: paths can run backward

A physical BRDF is **reciprocal**: f(ωi, ωo) = f(ωo, ωi) (Helmholtz). Consequence: the light carried along a path is the same in either direction.

- a camera ray traced **from the eye** finds the same light as a photon traveling **from the lamp** along the same path
- so renderers may trace from the eye (path tracing), from the lights (photon mapping), or **both and connect** (bidirectional path tracing)
- Phong's specular term is **not** reciprocal: with it, the choice of direction changes the answer


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

### Microfacets and Fresnel

<small>(~18 min)</small>


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

### Energy and the two sliders

<small>(~5 min)</small>


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

### Lighting, sampling and measured materials

<small>(~11 min)</small>


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

