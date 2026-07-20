<!--
  CSS 551 · Lecture 10 (Session 10) — The rendering equation, PBR & neural
  rendering. THE GRADUATE FINALE. Picks up S09's honest confession (local
  shading ignores light BOUNCES — "its own large subject") and pays it off:
  the rendering equation is that subject, the honest energy accounting Phong
  only approximates. Then the modern GPU/API mental model (command buffers,
  pipeline state objects, bind groups — the explicit successor to GL's global
  state machine), a neural-rendering survey (NeRF → 3D Gaussian splatting,
  with the LIVE gsplat viewer), the whole course assembled into one picture,
  and a closing beat that ENDS the course.

  reveal.js: FLAT deck — every slide is a top-level "---" section (no vertical
  "--" stacks), so verify-deck's "section.present [data-demo]" probe only
  matches a demo when its slide is actually shown. Notes follow "Note:".

  TWO DEMO EMBEDS, each on its own flat slide, with the scoped-CSS cap:
   - Part 1: data-demo="brdf-lobe" data-controls="roughness". Fallback carries
     the HAND-VERIFIED r=0.4 pair (re-verified via node against the demo's own
     formulas): Phong s = 2/0.4² − 2 = 10.5 → HWHM 21°; GGX α = 0.4² = 0.16 →
     HWHM 6° (the GGX-flavored lobe is a NARROWER core than Phong at the same
     roughness — the two roughness→param mappings are NOT calibrated to match;
     the demo captions it "lobe SHAPE, not calibrated units").
   - Part 3: data-demo="gsplat" data-controls="orbitAz,dist". Fallback is a
     text description of the scene + the REQUIRED attribution (Mip-NeRF 360
     "bonsai", Barron et al.; .splat reconstruction by dylanebert) — see
     media/gsplat/ATTRIBUTION.md. gsplat loads an 8.7 MB .splat async and runs
     its own rAF loop that PAUSES off-screen (data-gsplatRunning) — it renders
     an AxesHelper immediately so the pixel probe passes on the camera orbit
     even before the splats finish loading (same as tools/test-demos.mjs).

  MATH IS PLAIN TEXT ON PURPOSE. This shell loads NO KaTeX plugin (only
  markdown/highlight/notes), so "$...$" would render literally. All formulas
  are unicode plain text (·, ×, →, ², ⁻¹, θ, ω, Ω, ∫, π, ≤, ≥, ∝, ∞) or fenced
  ```text blocks, like S01-S09. Never two "_" on one markdown line OUTSIDE a
  code fence (they pair into <em> and shred the line): in prose AND speaker
  notes ALWAYS backtick names with underscores (`data-demo`, `data-controls`,
  `k_d`, `k_s`, `k_a`, `Cook-Torrance`, `glEnable`, `glBindTexture`,
  `glDrawArrays`, `gsplatRunning`, ...). Code inside ```text fences is safe.
  No <small> on math.

  NO forward / "next time" references anywhere — this is the LAST session,
  nothing to forward-reference. NEVER name the later graphics course; NEVER
  mention shadow maps, multipass, or tessellation (out of scope by design).
  References to PAST sessions (S02 dot/projection, S03 rotation/reflection,
  S04 matrices, S05 scene graphs, S06 view/projection, S07 mesh, S08 texture,
  S09 illumination) are the whole point of Part 4. The wrap previews only the
  FIXED Thursday FP studio + the finals-week demo, and mentions course evals.
  The last slide ENDS the course — a closing beat, not a preview.

  Session plan (110 min, Tue 5:45-7:45 PM synchronous online). ~111 + buffer.
    0:00  Intro (title + tonight)                    ~3 min
    0:03  Part 1  From Phong to the rendering equation  35 min  (what Phong gets wrong: energy, reciprocity, no bounces; radiometry-lite: radiance/irradiance/solid angle, worked 0.25 sr; the rendering equation term-by-term; BRDF; microfacets; metallic/roughness = Unity's sliders; the brdf-lobe demo)
    0:38  Part 2  The modern GPU/API model             25 min  (the old GL state machine; command buffers; pipeline state objects; bind groups; what Unity does with your scene per frame — the draw-call walk)
    1:03  Part 3  Neural rendering survey              30 min  (inverse rendering; NeRF = a learned field + volume rendering; 3D Gaussian splatting = back to primitives, differentiable rasterization; the LIVE gsplat demo; what transfers, what changes)
    1:33  Part 4  The course in one picture            15 min  (the full pipeline assembled from the quarter's pieces; FP final-demo logistics)
    1:48  Wrap                                         ~3 min  (Thu FP studio + course wrap; course evaluations; the closing beat)
    1:51  end (+ buffer)
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 10 — The Rendering Equation, PBR & Neural Rendering**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>

---

## Tonight

- **From Phong to the rendering equation** — the honest energy accounting Phong approximates; **BRDFs**, microfacets, and the **metallic/roughness** material model
- **The modern GPU/API model** — how a modern graphics API actually draws your scene: **command buffers**, **pipeline state objects**, **bind groups**
- **Neural rendering** — scenes learned from photographs: **NeRF** and **3D Gaussian splatting**, one running live
- **The course in one picture** — every piece you built this quarter, assembled into the whole pipeline

---

### Part 1 · From Phong to the rendering equation

<small>(~35 min)</small>

---

## Where we left off: Phong's confession

Last week's local model shaded each point from the lights, the normal, and the eye — and **nothing else in the scene**. We named the cost honestly:

- **no bounces** — a red wall does not tint the white floor beside it
- **ambient** was a single **constant** standing in for all that missing bounced light
- a **fudge**, we said — with no physical justification beyond "shadows should not be pure black"

Tonight we replace the fudge with the **honest accounting**. Three specific things Phong gets **wrong** — and the one equation that gets them **right**.

---

## What Phong gets wrong

Three honest departures from physics:

- **energy** — Phong can reflect **more** light than arrives. Crank shininess or pile on lights and a surface can glow **brighter than its illumination** — a real surface reflects **at most** what hits it (some is absorbed)
- **reciprocity** — swap the **light** and the **eye** and a real surface looks **identical** (Helmholtz reciprocity). Phong's terms carry **no** guarantee of that symmetry
- **no bounces** — the whole scene's **indirect** light (color bleeding, soft shadows, a room reflected in a floor) is simply **absent**, faked by the ambient constant

None of these is a bug to patch — they are **symptoms of the same gap**: Phong never **balances the light energy** at a point.

---

## Radiometry-lite: solid angle

To balance light at a point we must measure "how much light, from which directions." The direction bookkeeping is the **solid angle** — the 2D angle's 3D cousin, measured in **steradians (sr)**:

```text
   plane angle           solid angle
   arc / radius          area / radius²          (a patch on a unit sphere)

   full circle = 2π rad   full sphere    = 4π sr
                          hemisphere      = 2π sr   ← the sky above a surface
```

A surface patch of area **A** seen from distance **r** subtends about `Ω ≈ A / r²` steradians — a directions-worth of "how big it looks," independent of how far away it is scaled out.

---

## A solid angle, worked (and its honest small print)

A **1 m²** flat panel viewed **head-on** from **2 m** away:

```text
   Ω ≈ A / r² = 1 / 2² = 1 / 4 = 0.25 sr
```

- **0.25 sr** out of the **2π ≈ 6.28 sr** hemisphere — the panel fills about **4%** of your sky
- **honest small print:** `A / r²` is the **small-angle** approximation — exact only for a patch that is **small** relative to `r` and **square-on** to the line of sight. Tilt it (foreshortening) or bring it close and the true solid angle differs; here the panel is a fair bit of the distance, so `0.25 sr` is a **good estimate**, not an identity

Move the panel to **4 m** and it subtends `1/16 = 0.0625 sr` — **four times** smaller, the inverse-square shrink you already met in S09's attenuation.

---

## Radiance and irradiance

Two quantities do all the work — keep them straight:

- **radiance** `L` — brightness **along a single ray**: power per unit **projected** area per unit **solid angle**. It is what a **pixel measures** and what stays **constant along a ray** through empty space. Directions in, directions out — all in radiance
- **irradiance** `E` — total power **landing on a patch** from the **whole hemisphere** of directions above it: `E = ∫ L·cosθ dω` over the hemisphere

```text
   radiance   L(p, ω)   — one point, one direction     (a ray's brightness)
   irradiance E(p)      — one point, all directions     (the patch's total dose)
```

Diffuse shading last week was really "**irradiance** in, times albedo" — the `cosθ` in that integral is our old friend **N·L**.

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

---

## Why it is hard: the light bounces

The catch hides in one symbol: `Li(p, ωi)` — the light **arriving** at `p` from direction `ωi` — is itself the **outgoing** radiance `Lo` of **whatever surface** `p` sees in that direction:

```text
   Li(p, ωi)  =  Lo( other surface, toward p )
```

- so the equation is **recursive** — to shade `p` you must first shade everything `p` can see, which needs everything **they** can see …
- that recursion **is** the bounced light: the red wall's `Lo` becomes the white floor's `Li`, and the floor picks up a pink tint — **color bleeding**, for free
- solving it fully is **global illumination**: an enormous computation, approximated by many methods, each its **own large subject**

Phong, in this light, is the **crudest** approximation: keep only **direct** lights, drop the recursion, and add a **constant** (ambient) where the bounces should be.

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

---

## Microfacets: a surface of tiny mirrors

The modern physical specular BRDF models a rough surface as a dense field of microscopic **perfect mirrors** — **microfacets** — each too small to see. A pixel's highlight is the **statistical fraction** of them angled to bounce the light straight into your eye:

```text
   smooth surface            rough surface
   ▁▁▁▁▁▁▁▁▁▁  facets aligned  ╱╲╱╲╱╲╱╲  facets scattered
   → tight, bright highlight   → broad, dim highlight
```

The **Cook-Torrance** specular BRDF assembles three physical factors:

- **D** — the **normal distribution**: how many microfacets point the right way (**roughness** lives here — `GGX` is today's standard `D`)
- **G** — **geometry / shadowing-masking**: facets **block** each other at grazing angles
- **F** — **Fresnel**: reflectance **rises toward 1** at grazing angles (every surface is mirror-like edge-on)

---

## The metallic / roughness workflow

Microfacet BRDFs have many physical inputs — but modern engines expose just **two** artist sliders that cover most real materials. This is the **metallic/roughness** (PBR) workflow, and you have already seen it in **Unity's Standard Shader**:

- **Metallic** — **dielectric** or **metal**? A **dielectric** shows a **colored diffuse** + a **weak white** specular (~**4%**) — plastic, wood, skin; a **metal** has **no diffuse**, its specular **tinted** by the base color — gold, copper, steel
- **Smoothness** (Unity's slider = **1 − roughness**) — high → **tight** highlight (aligned facets); low → **broad** sheen
- **Albedo / Base Color** — **diffuse color** for a dielectric, **specular tint** for a metal

The same `D`/`G`/`F` machinery underneath — the model glTF and every modern engine share.

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

### Part 2 · The modern GPU/API model

<small>(~25 min)</small>

---

## The old way: one giant state machine

For its first two decades, the graphics API (**OpenGL**) was one enormous **global state machine**. You **mutated** hidden global state one call at a time, then said "draw":

```text
   glEnable(GL_DEPTH_TEST);          // flip a global flag
   glBindTexture(GL_TEXTURE_2D, id); // set the "current" texture
   glUniform3f(loc, r, g, b);        // poke one shader input
   ...  (dozens–hundreds of such calls)
   glDrawArrays(...);                // NOW draw with whatever state is current
```

The costs:

- **hidden global state** — the result depends on **every** prior call; forget one `glEnable` and the bug is invisible
- **per-draw validation** — the driver **re-checks and re-compiles** state on every draw call — slow
- **single-threaded** — one global machine, so you **cannot** record draw work across threads

---

## Command buffers: record, then submit

Modern APIs (WebGPU, Vulkan, Metal) **separate recording from execution**. You **record** a list of GPU commands into a **command buffer**, then **submit** the whole buffer to the GPU's **queue**:

```text
   record  (on any thread, ahead of time):
      encoder.setPipeline(...)          // which shaders + fixed state
      encoder.setBindGroup(0, ...)      // which resources
      encoder.draw(...)                 //  draw
      encoder.draw(...)                 //  draw
   → finish() → a command buffer

   submit  (once per frame):
      queue.submit([ commandBuffer ])   // hand the whole list to the GPU
```

- recording touches **no** global state — a command buffer is a **self-contained** list
- so **many threads** can record **many** buffers in parallel, then submit them together — the multi-core win
- the GPU consumes a **pre-built** list instead of reacting to a live stream of mutations

---

## Pipeline state objects: bake the state once

The old per-draw state — shaders, blend mode, depth test, vertex layout — is **frozen** ahead of time into one **immutable** object: a **pipeline state object (PSO)**. Validate and compile it **once**, at creation; then **switch** PSOs instead of toggling flags:

```text
   at load time (once):
      pso = createRenderPipeline({
         vertexShader, fragmentShader,      // the programs
         vertexLayout,                       // how vertices are read
         blend, depthTest, cullMode          // the fixed-function state
      })                                     // ← driver validates + compiles HERE

   per draw:
      encoder.setPipeline(pso)               // one cheap switch, no re-validation
```

- all the state that used to be **scattered** across many `glEnable`/`glBind…` calls is **one** object
- the expensive **validation/compilation** happens **once up front**, never per-draw — predictable frame times
- you cannot end up in an **invalid** half-configured state — the object is **complete** or it does not exist

---

## Bind groups: the resources, in one bundle

A shader needs **resources** — textures, buffers, samplers. The old way bound each to a numbered slot, one call at a time. The modern way bundles them into a **bind group**: a pre-validated **set** you attach in **one** command:

```text
   at load time:
      bindGroup = createBindGroup({
         0: cameraUniforms,      // the view/projection matrices
         1: material.baseColor,  // a texture
         2: material.sampler     // how to sample it
      })

   per draw:
      encoder.setBindGroup(0, bindGroup)   // the shader's whole resource set, at once
```

- resources are grouped by **how often they change** — a **per-frame** group (camera), a **per-material** group (textures) — so you **rebind only what changed**, validated **once**
- together: **PSO** (shaders + fixed state) + **bind group** (resources) + a **draw** = one complete, self-contained unit of GPU work

---

## The old vs the new, side by side

```text
   OLD (OpenGL state machine)        NEW (WebGPU / Vulkan / Metal)
   ───────────────────────────       ─────────────────────────────
   mutate hidden global state        record explicit command buffers
   validate on every draw            validate ONCE (PSO + bind group)
   bind resources one slot at a time bind a whole set (bind group)
   single global context             many threads record in parallel
   "draw with whatever is current"   "submit a pre-built list of work"
```

Same GPU, same triangles, same shaders — a **more explicit, pre-validated, parallel** way to feed them. The cost is **more up-front code**; the win is **speed and predictability**.

---

## What an engine does with your scene, per frame

Conceptually, every frame Unity (or any engine) walks your scene and turns it into submitted GPU work:

```text
   1. CULL      drop objects outside the camera frustum (S06's clip test)
   2. SORT      opaque front-to-back (early-Z); transparent back-to-front (blending)
   3. BATCH     group draws that share a material / PSO, to switch state less
   4. for each batch:
        set PSO         (the material's shaders + fixed state)
        set bind groups (per-frame camera, per-material textures)
        set per-object  (the model matrix — S04's makeTRS)
        DRAW            (issue the draw; GPU runs vertex → fragment shaders)
   5. present   the finished framebuffer to the screen
```

- **cull** and **sort** reuse the **frustum** and **depth** ideas from S06's viewing pipeline
- the per-object step is **your** model matrix; the per-material state is **your** BRDF from Part 1
- the engine records all of this into **command buffers** and **submits** them — Part 2, applied

---

### Part 3 · Neural rendering survey

<small>(~30 min)</small>

---

## A different question: inverse rendering

Everything so far is **forward** rendering: **you build** the geometry and materials, then the pipeline projects and shades them into pixels. The frontier flips the arrow:

```text
   forward:   scene (meshes, materials, lights)  ──render──▶  image
   inverse:   many photographs  ──optimize──▶  a 3D scene you can re-render
```

- **inverse rendering / novel-view synthesis** — given a set of **photos** of a real scene from different angles, **recover** a 3D representation, then render it from **new** viewpoints the camera never saw
- the representation is **learned by optimization** (gradient descent), not modeled by an artist
- the last few years' breakthroughs — **NeRF**, then **3D Gaussian splatting** — are both this: **photographs in, a re-renderable 3D scene out**

---

## NeRF: the scene as a learned field

**NeRF** (Neural Radiance Fields, Mildenhall et al. 2020): represent the **entire scene** as a single continuous **function** — a small neural network — with **no mesh and no triangles**:

```text
   MLP:   (x, y, z,  view direction)  ──▶  (color,  density)
          a 3D point + where you look     what it emits + how opaque it is
```

- the scene **is** the network's **weights** — a "**learned field**" filling all of space, not a surface
- color depends on **view direction**, so it captures **shiny, view-dependent** appearance (glints, reflections) automatically
- **density** at a point says how much the point **blocks / emits** light — the hook for rendering it

The network is small; the scene lives entirely in what it **learned** from the training photos.

---

## NeRF: rendered by marching rays

To make a pixel, **march a ray** from the camera through the field and **accumulate** color, weighted by density — the same "**integrate along a ray**" idea, now through a **volume** instead of onto a surface:

```text
   for each pixel:
      shoot a ray from the camera (S06's un-project) into the scene
      sample the MLP at many points along the ray → (color_i, density_i)
      composite front-to-back:  denser points contribute more, and
         occlude points behind them   (alpha-compositing along the ray)
```

- **training** is the inverse loop: the whole march is **differentiable**, so gradient descent tunes the weights until the **rendered** rays match the **training photos**
- **cost:** hundreds of network evaluations **per ray**, millions of rays — NeRF is **slow** to train (hours) and slow to render
- but the **camera ray** you march is S06's projection **run backwards** — the viewing pipeline, reused

---

## 3D Gaussian splatting: back to primitives

**3D Gaussian Splatting** (Kerbl et al. 2023) keeps the "**learn it from photos**" idea but throws out the slow network. The scene is **millions of explicit primitives** — 3D **Gaussians**, little fuzzy translucent blobs:

```text
   each Gaussian:   position   (where)
                    covariance (its 3D shape: an oriented, stretched ellipsoid)
                    color      (view-dependent)
                    opacity    (how solid)
```

- render by **projecting** ("splatting") each Gaussian to the screen and **blending** them **back-to-front** — a **rasterizer**, not a ray-marcher, so it runs in **real time**
- still trained by **differentiable rasterization**: gradient descent moves, stretches, recolors, and fades the Gaussians until the render matches the **photos** (and **adds/removes** Gaussians as needed)
- "back to primitives" — the same **project-and-rasterize** pipeline you built, with a **fuzzy blob** as the primitive instead of a triangle

---

## A real splat scene, live

<div class="cockpit" data-demo="gsplat" data-controls="fov"><pre class="viz-fallback">  a real 3D Gaussian Splatting scene, rendered live: ~240,000 translucent
  3D Gaussians, projected and blended back-to-front — a rasterizer, in your
  browser. Drag orbitAz to orbit; dist to move in/out. Notice the soft,
  translucent edges — no triangle mesh, no textures; just fuzzy blobs.

  Scene: the "bonsai" scene from the Mip-NeRF 360 dataset (Barron et al.,
  CVPR 2022, Google Research); 3D Gaussian .splat reconstruction by dylanebert
  (huggingface.co/datasets/dylanebert/3dgs). See media/gsplat/ATTRIBUTION.md.</pre></div>

---

## What changes, what does not

Neural rendering upends the **representation** — but not the **pipeline foundations** you built this quarter:

```text
   CHANGES                              STAYS THE SAME
   ─────────────────────────────        ─────────────────────────────
   scene = a network / Gaussians        cameras: a view matrix V (S06)
   authored by OPTIMIZATION             projection: a matrix P (S06)
   appearance baked in (no relight)     "render = accumulate light along rays / onto pixels"
   photos in, 3D out                    homogeneous coords, the divide, the pipeline
```

- 3D Gaussian splatting literally **rasterizes with a projection matrix** — it **needs** your **V** and **P**
- "shade a point, accumulate along a ray, composite front-to-back" is **the same idea**, whether the primitive is a **triangle**, a **network sample**, or a **Gaussian**
- what you built is the **substrate** these run on — the frontier **stands on** the pipeline, it does not **erase** it

---

### Part 4 · The course in one picture

<small>(~15 min)</small>

---

## The whole pipeline, in your own hands

Every box below is something **you built by hand** this quarter — no engine did it for you:

```text
   PLACE          makeTRS / matMul (S03/S04) ─▶ scene graph compose (S05)
                  a model's local transform, then its parent chain → world matrix W

   VIEW           lookAtBasis → V (S06) ─▶ perspective P (S06)
                  world → camera space,  then camera → clip space

   PROJECT        clip ─▶ perspective divide ─▶ NDC ─▶ viewport (S06)
                  ÷w makes far things small; map the cube to pixels

   SURFACE        mesh: vertices + indices + normals (S07)
                  UVs + the texture matrix (S08)

   SHADE          Phong illumination: diffuse N·L, specular R·V^s, ambient (S09)
                  — the local face of Part 1's rendering equation
```

A vertex flows **top to bottom**: placed by **W**, viewed by **V**, projected by **P**, divided, mapped to a pixel, then **shaded**. `W`, `V`, `P` — three matrices you can **derive from scratch**.

---

## Final Project: the demo

The Final Project is your chance to **use** this pipeline knowledge on something of your own — a scene, a tool, an effect, a small renderer.

- **when** — the Final Project is due, and demoed, in **finals week**
- **format** — a short demo of your project: **show it running**, name what pipeline pieces you used, and what you would do next
- **details on Canvas** — the exact date, time, per-team slot, format, and rubric all live on **Canvas**, the single source of truth

Thursday's studio (`lab10`) is your **last work session** before the demo: a checkpoint on where each team stands, and time to close gaps with the instructor in the room.

---

### Wrap

<small>(~3 min)</small>

---

## The course, one idea

You learned to build a **3D renderer's pipeline from first principles** — every stage, by hand:

- **vectors and matrices** are the language: a dot product is a cosine, a matrix is a change of space
- **three matrices** carry a vertex to the screen: model/world **W**, view **V**, projection **P** — each derivable from scratch
- a **surface** is a mesh (S07) dressed by a texture (S08) and lit by a shading model (S09)
- **lighting** is really an **energy balance** — the rendering equation — that Phong approximates and PBR pursues
- the **frontier** (neural rendering) changes the **representation**, not these **foundations**

You can now read the pipeline in any engine — or any research paper — and **recognize every piece**, because you built them.

---

## Wrap

- **Thursday** — the Final Project **studio** (`lab10`): per-team checkpoint + last work session with the instructor in the room, before the finals-week demo
- **Final Project** — due and demoed in **finals week**; *format and dates on Canvas*
- **Course evaluations** — please fill out the **course evaluation** for CSS 551; your candid feedback shapes how this course is taught next — it genuinely matters, and it is anonymous

Ten weeks ago a triangle on a screen was somebody else's magic. Now it is **yours** — placed by **W**, viewed by **V**, projected by **P**, and lit by a model you can **derive**. Go build something with it.

