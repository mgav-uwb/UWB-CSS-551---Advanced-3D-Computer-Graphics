<!--
  CSS 551 · TOPIC DECK — Honest light: from Phong to the rendering equation and PBR (~20 min).
  A topic is a reusable stretch of slides that a session page mounts as one
  <section data-markdown="../../topics/pbr-rendering-equation.md"> among others; it carries no
  session logistics (no title, Thursday, MP, wrap) and no "Part N" numbering.
  Sessions compose topics in their index.html; see sessions/README.md.

  TEACHES: why a local model is wrong (energy, reciprocity, bounces); the rendering equation term by term; the BRDF; microfacets, D/G/F evaluated once by hand; the metallic/roughness sliders on a computed sphere grid; the lobe live.
  FIGURES: ../../textbook/figures/pbr-sphere-grid.svg (tools/gen-textbook-figures.mjs); worked numbers from figures/numbers.json.
  NEEDS:   a local illumination model (Phong) taught earlier; the history chapter's era 3.
  DEMOS:   data-demo="brdf-lobe" data-controls="roughness" (under the 210px crop, not demo-full)

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Demo embeds live on
  demo-full slides (a short ## title + the embed div + its viz-fallback pre).
  Image/handout paths are relative to the SESSION page that mounts this
  topic (sessions/SNN/index.html): ../../media/..., ../../textbook/...
-->

### Honest light: from Phong to the rendering equation

<small>(~20 min)</small>

---

## Phong's confession, and what it gets wrong

Last week's local model shaded each point from the lights, the normal and the eye, and **nothing else in the scene**. Three departures from physics:

- **energy** — Phong can reflect **more** light than arrives; a real surface reflects **at most** what hits it
- **reciprocity** — swap the light and the eye and a real surface looks identical; Phong's terms carry no such guarantee
- **no bounces** — the scene's **indirect** light (color bleeding, soft shadows) is absent, faked by the **ambient** constant

Not three bugs but one gap: Phong never **balances the light energy** at a point. Tonight, the honest accounting.

Note: One slide where there were two: last week's confession and its three symptoms. Local shading consults the lights, the normal and the eye, and nothing else; ambient was a constant standing in for all the bounced light we could not compute. Say the three departures briskly: energy, a surface can glow brighter than its illumination; reciprocity, swapping light and eye should change nothing and Phong does not promise it; bounces, absent entirely. Then the reframing that sets up the rest of Part 1: these are symptoms of one missing thing, an energy balance at the point, which the rendering equation writes down.

---

## The rendering equation

Kajiya, 1986 — the honest balance of light at a surface point `p`, for the outgoing direction `ωo` toward the eye:

```text
   Lo(p, ωo) = Le(p, ωo) + ∫  f(p, ωi, ωo) · Li(p, ωi) · (n·ωi) dωi
                            Ω
```

Every symbol:

- **Lo(p, ωo)** — outgoing radiance from `p` toward the eye (**what the pixel gets**)
- **Le(p, ωo)** — light `p` **emits** itself (nonzero only if `p` is a light source)
- **∫ … dωi over Ω** — **sum over every incoming direction** `ωi` in the hemisphere `Ω` above `p`
- **f(p, ωi, ωo)** — the **BRDF**: what fraction of light from `ωi` leaves toward `ωo` (the material)
- **Li(p, ωi)** — incoming radiance **arriving** at `p` from direction `ωi`
- **(n·ωi)** — the **cosine** / projected-area factor — last week's **N·L**

Note: This is the theoretical peak of the course — walk it slowly, name every symbol on the slide (playbook §3 — no name-dropping; every symbol earns its place). The rendering equation, written down by Jim Kajiya in 1986, says: the light leaving a surface point p in the direction of your eye equals the light that point EMITS, plus the sum of all the light ARRIVING at p from every direction, each bit scaled by how the material redirects that direction toward your eye and by a cosine. Term by term. `Lo(p, ωo)`: the outgoing radiance — the single number we ultimately want, the brightness of p as seen along the outgoing direction ωo toward the camera; this is what becomes the pixel. `Le`: the emitted term, zero for ordinary surfaces and nonzero only where p is itself a light (a lamp filament, a glowing screen) — it is how light ENTERS the system. The integral sign with subscript Ω: "add up over every incoming direction ωi in the hemisphere Ω of directions above the surface" — this is the solid-angle integral from two slides ago, and `dωi` is the little solid-angle bin. Inside the integral, three factors multiply: `f(p, ωi, ωo)`, the BRDF, the material's answer to "light came in along ωi — what fraction heads out along ωo?" (next slides); `Li(p, ωi)`, the incoming radiance along that direction — the brightness of whatever p can see out there; and `(n·ωi)`, the cosine between the normal and the incoming direction — literally last week's `N·L`, the projected-area weighting that makes grazing light count for less. Read the whole thing as an ENERGY BALANCE: out = emitted + (sum over all incoming) material × incoming × cosine. Every one of Phong's three failures is fixed here — energy is conserved because the BRDF integral is bounded, reciprocity is a constraint we put on f, and bounces are automatic because Li is itself the Lo of other surfaces. Next: that self-reference, which is the whole story of global illumination.

---

## The BRDF: the material's answer

Pull one factor out of the integral: `f(p, ωi, ωo)`, the **BRDF** — **B**idirectional **R**eflectance **D**istribution **F**unction. Given light from `ωi`, it returns the fraction that leaves toward `ωo`. It **is** the material:

```text
   diffuse (matte)   f = constant          same to every direction → the flat, view-independent term
   specular (shiny)  f peaks near mirror    big only when ωo is near L's reflection → the highlight
```

A **physical** BRDF must obey exactly the rules Phong broke:

- **non-negative** — no negative light
- **reciprocal** — `f(ωi, ωo) = f(ωo, ωi)` — swap light and eye, same value (Helmholtz)
- **energy-conserving** — integrated over the hemisphere, it reflects **at most** what arrived

Phong and Blinn from S09 **are** BRDFs — just crude ones that break the last two.

Note: Define the BRDF as the material term and connect its rules back to Phong's three failures (playbook §3 — reuse the structure just built). Inside the rendering equation, one factor is where the SURFACE lives: `f(p, ωi, ωo)`, the bidirectional reflectance distribution function — spell the acronym out — a function of an incoming direction and an outgoing direction that returns how much of the light coming in along ωi is reflected out along ωo. It is literally the definition of "what this material looks like": a piece of chalk, a mirror, brushed aluminum, and skin differ only in their f. Two poles anchor intuition: a perfectly matte surface has a CONSTANT BRDF — it sends incoming light equally to every outgoing direction, which is exactly why diffuse was view-independent last week; a shiny surface has a BRDF that spikes when ωo is near the mirror reflection of ωi and is near zero elsewhere — the compact, view-dependent highlight. Now the three physical laws a real BRDF must satisfy, and notice they are precisely the rules Phong broke: it must be non-negative (no negative light — Phong got this one, via the clamp); it must be reciprocal, f(ωi,ωo) = f(ωo,ωi), the Helmholtz symmetry — swap the lamp and the eye and the number is unchanged; and integrated over the whole outgoing hemisphere it must reflect no more energy than came in (conservation). Phong's `R·V` term and Blinn's `H·N` term ARE BRDFs — legitimate, useful ones — but ad-hoc ones that do not guarantee reciprocity or conservation, which is the technical content of "Phong is not physically based." The modern move is to build f from a physical model that does obey all three. That model is microfacets. Next.

---

## Microfacets, and the two sliders

The physical specular BRDF models a rough surface as a field of microscopic **perfect mirrors**, the **microfacets**; a highlight is the **statistical fraction** angled to bounce the light into your eye.

```text
   smooth surface            rough surface
   ▁▁▁▁▁▁▁▁▁▁  facets aligned  ╱╲╱╲╱╲╱╲  facets scattered
   → tight, bright highlight   → broad, dim highlight
```

- **Cook-Torrance** assembles three factors: **D** (how many facets point the right way; **roughness** lives here), **G** (facets shadow each other at grazing angles), **F** (**Fresnel**: every surface is mirror-like edge-on)
- engines expose two artist sliders on top: **metallic** (dielectric: colored diffuse + weak white specular; metal: no diffuse, tinted specular) and **smoothness** (Unity's name for 1 − roughness)
- the same machinery under Unity's Standard Shader, glTF and every modern renderer

Note: Microfacet theory at concept depth, then the two knobs artists touch, in one slide. Zoom into any surface and it is a rugged landscape of tiny facets, each a perfect mirror; a pixel covers millions, so what you see is the fraction whose orientation reflects the light toward your eye, which is where roughness enters: aligned facets give a tight bright highlight, scattered facets a broad dim one. Cook-Torrance multiplies three physical factors, D for the distribution of facet orientations (GGX is the modern default), G for facets shadowing each other at grazing angles, F for the Fresnel rise of reflectance toward one at the edges; name what each does, not its formula. On top of that machinery the industry exposes two sliders: metallic decides whether the base color is a diffuse color under a weak white specular (plastic, wood, skin) or a tint on the specular with no diffuse at all (gold, copper, steel), and smoothness is one minus roughness. Those are the sliders in Unity's Standard Shader, and the same parameterization moves a material between glTF, Unreal and every modern engine. Next: the three factors as numbers.

---

## One evaluation, by hand

Normal up, light at 30° on one side, eye at 30° on the other, plastic (`F0 = 0.04`), roughness α = 0.3:

```text
   n·ωi = n·ωo = 0.866          h = normalize(ωi + ωo) = n   →  n·h = 1,  ωo·h = 0.866
   D = α² / π                  = 0.09 / π                         = 3.537   (the peak of the α = 0.3 curve)
   G = G₁(ωi)·G₁(ωo),  G₁ = 2(n·x) / ((n·x) + √(α² + (1−α²)(n·x)²))  = 0.9926² = 0.985
   F = F0 + (1 − F0)(1 − ωo·h)⁵ = 0.04 + 0.96 × 4.3e−5                 = 0.0400
   f_spec = D·G·F / (4 (n·ωi)(n·ωo)) = 3.537 × 0.985 × 0.040 / 3.0     = 0.0465
```

- against a mid-gray diffuse term `0.6/π = 0.191`: the highlight adds a quarter of the diffuse value at the mirror direction
- move the light to 45°: `h` tilts 7.5°, `D` drops to 2.57, `f_spec = 0.041`; make it rougher (α = 0.6): `D = 0.884`, `f_spec = 0.011`
- the highlight got **dimmer as it got wider** with no separate brightness knob: energy conservation doing the bookkeeping

Note: One full evaluation, so that the three letters are numbers and not names. Set the geometry so the eye is exactly in the mirror direction: the half-vector is the normal, D is at its peak, G is nearly one because nothing is grazing, and Fresnel adds nothing at 30 degrees. Multiply and divide: 0.0465, about a quarter of a mid-gray Lambertian term. Then two perturbations from the course text: tilt the light and D falls off the peak; roughen the surface and D falls to a quarter, so the highlight dims as it widens without anyone setting a brightness. That coupling is what Phong lacked; the course-text chapter shows the same lobe over-reflecting by a factor of two at low exponents. Next: the two sliders, rendered.

---

## The two sliders, rendered

<img src="../../textbook/figures/pbr-sphere-grid.svg" class="media-shot" style="max-height: 400px;" alt="a five by five grid of shaded spheres: roughness increasing left to right, metallic increasing top to bottom; the plastic row keeps its color in shadow, the metal row goes dark except for tinted reflections">

<small>Computed by the course-text figure generator: one directional light plus a two-tone sky/ground, Lambert + GGX D + Smith G + Schlick F. Across: roughness 0.1 to 0.9. Down: metallic 0 to 1.</small>

Note: The whole model in one picture, computed from the formulas on the previous slides by a forty-line ray marcher in the course-text figure generator, so it and the equations cannot disagree. Read it two ways. Across a row, roughness widens and dims the highlight, the coupling just computed. Down a column, metallic removes the diffuse term, so the shadow side goes dark, and tints the specular with the base color, so the reflections of the sky and the light turn red. The faint horizon line on the plastic spheres is real: Fresnel makes even plastic a weak mirror, strongest at the rim. Next: the lobe itself, live.

---

## The reflectance lobe: roughness reshapes it

The specular BRDF, drawn as a **polar lobe** around the mirror direction, shows how tightly a surface focuses reflected light. **Roughness** sets its width. Two models, two roughness→width mappings:

```text
   Phong:  radius ∝ max(0, cos φ)^s      s = 2/roughness² − 2   (classic Blinn mapping)
   GGX:    the GGX normal-distribution shape        α = roughness²
```

At **roughness = 0.4** (the demo default):

```text
   Phong:  s = 2/0.4² − 2 = 10.5      lobe half-width (HWHM) ≈ 21°
   GGX:    α = 0.4² = 0.16            lobe half-width (HWHM) ≈  6°
```

Same roughness, **different** lobe: GGX has a **narrower core** (and, in a full BRDF, wider tails) — which is why `GGX` became the modern default. **Honest note:** the demo's GGX curve is the distribution's **shape** reused as a lobe radius — no Fresnel, no geometry term, no solid-angle normalization. **Shape, not calibrated units.**

Note: Set up the demo before it appears and pre-verify its numbers (playbook §3 — verify against the demo's own math). The demo draws the specular BRDF as a polar LOBE: a curve whose radius in each direction is how much light the surface reflects that way, drawn around the mirror (specular) direction. A needle-thin lobe is a mirror; a fat lobe is a matte-ish rough surface; roughness is the knob that fattens or thins it. The demo offers two lobe models with two different roughness-to-width mappings, and it is important to say they are NOT calibrated to each other. Phong uses the classic Blinn mapping from roughness to a shininess exponent, `s = 2/roughness² − 2`; at roughness 0.4 that is `2/0.16 − 2 = 12.5 − 2 = 10.5`, and numerically (the demo walks the lobe in 1° steps and reports where it falls to half its peak) that gives a half-width at half-maximum of about 21°. GGX maps roughness to a parameter `α = roughness²`; at roughness 0.4 that is `0.16`, and its lobe's half-width at half-max is about 6° — much narrower core at the same roughness value. I recomputed both against the demo's own formulas; those are the numbers on the panel. The teaching point of the pair: GGX concentrates more energy in a narrow core (and, in the real BRDF, keeps more in wide tails than Phong) — that combination of tight core and long tail matches measured real materials better, which is why GGX displaced Phong as the industry default D term over the last decade. THE honesty note, which is on the demo caption and must be said aloud: the GGX curve here is the normal-distribution SHAPE reused as a lobe radius — it has no Fresnel term, no geometry/shadowing term, and no solid-angle normalization, so it is not a calibrated, energy-conserving BRDF; it shows lobe SHAPE, not calibrated units. That honesty is the point of an instrumented demo. Next: it, live.

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

Note: The live demo (`brdf-lobe`, embed control `roughness`). The embed shows the course's Cornell scene — the same tall-box-plus-bunny, short-box-plus-teapot room from S01 — with four material identities distributed over its objects: gold metal teapot, aluminum metal short box, pastel plastic bunny, saturated glossy tall box. All four wear the ONE plotted BRDF, so the roughness slider reshapes every highlight together: drag it toward its minimum (0.05) and the highlights tighten toward mirrors — the metals sharpen into reflections of the red and green walls (a captured environment map; a pure metal has no diffuse term) — while the underlying lobe collapses toward a needle along the mirror direction; drag toward 1 and everything spreads matte. Watch the panel's `s`/`α`, HWHM, and formula cells update with each drag. The fallback carries the hand-verified default pair, recomputed via node against the demo's own formulas: at roughness 0.4, Phong `s = 10.5` gives a half-width-at-half-max of about 21°, and GGX `α = 0.16` gives about 6° — the GGX-flavored lobe is the narrower core, as noted. The full sandbox on the course hub adds the 2D lobe plot as a click-to-swap inset, the incident-angle slider, and the Phong-vs-GGX radio toggle so you can flip between the two lobe shapes at a fixed roughness and see the core narrow — and compare the metals against the plastic bunny at the same roughness. Repeat the honesty caption once here: the GGX curve is the distribution's shape reused as a lobe radius, not a calibrated BRDF — shape, not units. That closes the theory arc: the rendering equation is the honest accounting, the BRDF is its material term, microfacets build a physical BRDF, and roughness is the one knob you just dragged. Next part: how the hardware actually turns all this into a frame.
