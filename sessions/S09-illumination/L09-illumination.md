<!--
  CSS 551 · Lecture 9 (Session 9) — Illumination. Local lighting: a surface
  point's color is a small function of three directions — the light L, the
  surface normal N, and the eye V — summed into ambient + diffuse + specular
  (the classic Phong model). Diffuse from Lambert's projected-area argument
  (N·L); specular from the mirror direction R = 2(N·L)N − L dotted with V, to
  the shininess power; ambient as the fudge/confession term. Then light-source
  types (directional/point/spot with the real spotlight-cone shader), and a
  short HDR + Reinhard tone-mapping coda before the Topic9 CDP plan.

  reveal.js: FLAT deck — every slide is a top-level "---" section (no vertical
  "--" stacks). Keeps the verify-deck harness's demo probe correct (it selects
  "section.present [data-demo]"; inside a vertical stack that would match a
  demo on a not-yet-shown sibling slide -> 0x0 -> pixel probe times out). Flat
  = one section per slide = demo only matched when shown. Notes follow "Note:".

  ONE DEMO, on its own slide (flat), with the scoped-CSS cap:
   - Part 2: data-demo="illumination" data-controls="lightAz,shine". Fallback
     carries the HAND-VERIFIED default readouts (lightAz=45, lightEl=30,
     shine=30): N·L=0.988, R·V=0.879, diffuse=0.988, specular=0.021, plus the
     one-line note that swinging the light behind (az=225, el=−30) drives
     N·L=−0.998 so diffuse=0.000. The panel is a ValueTable (class .mat-panel).
  All worked numbers recomputed via node against the demo's exact vector math
  (xform's dot/normalize/sub, sphere r=1.2, marked point n=normalize(1,1,1),
  camera (3,3,6)) — see README for the one-liner and the digit checks.

  DEMO vs PANEL honesty (carried from the T16 demo header): three's
  MeshPhongMaterial shades Blinn-Phong internally (half-vector H·N); the
  cockpit's JS readout computes CLASSIC Phong (mirror vector R, dotted with V).
  This deck teaches classic Phong for the worked math and mentions Blinn's H·N
  as a one-slide variant, stating honestly that the demo's material is Blinn
  while the panel numbers are classic — qualitative agreement is the point.

  MATH IS PLAIN TEXT ON PURPOSE. This shell loads NO KaTeX plugin (only
  markdown/highlight/notes), so "$...$" would render literally. All formulas
  are unicode plain text (·, ×, →, ², ⁻¹, θ, α, ≤, ⌊⌋, √) or fenced ```text
  blocks, like S01-S08. Never two "_" on one markdown line OUTSIDE a code fence
  (they pair into <em> and shred the line): in prose AND speaker notes ALWAYS
  backtick names with underscores (`ComputeDiffuse`, `451NoCullShader`,
  `PointLight.cs`, `LoadLight.cs`, `LightPosition`, `LightDirection`,
  `SlightPos`, `_MinTheta`, `_MaxTheta`, `vertexWC`, `UNITY_MATRIX_M`,
  `MeshPhongMaterial`, `UnityObjectToWorldNormal`, `data-demo`, ...). Code and
  matrices inside ```text / ```csharp fences are safe. No <small> on math. NO
  forward / "next time" references anywhere — the no-bounces limitation of
  local lighting is named HONESTLY as a scope boundary of this model (a richer
  model that traces bounces is "its own large subject") but never as a named
  future SESSION. The wrap may preview the FIXED Thursday studio + FP progress
  demos (paired lab). References to PAST sessions (S02 projection, S03
  rotation/reflection, S04 matrices, S05 implement-and-replace, S07 mesh, S08
  texture) are fine.

  Real C# / shader excerpts are from Kelvin Sung's CSS 451 ClassExamples,
  Topic9-Illumination: 9.3.DiffuseIllumination/451NoCullShader.shader (the
  hand normal-transform in the vertex stage — "we don't have access to
  inverse-transpose" — THE Part-2 excerpt) + its plain diffuse `ComputeDiffuse`;
  9.4.PointLightSource/451NoCullShader.shader (`ComputeDiffuse` with the
  spotlight cone: acos of L·dir + smoothstep falloff — THE Part-4 excerpt) +
  `PointLight.cs` / `LoadLight.cs` (how the light params reach the shader).
  These are the CDP projects students run Thursday (lab09). Topic10 is DROPPED
  — do NOT reference it.

  Session plan (110 min, Tue 5:45-7:45 PM synchronous online). Sums to ~111 + buffer.
    0:00  Intro (title + tonight)                  ~3 min
    0:03  Part 1  What you see                      15 min  (a mesh needs light to read as shape; the light-surface-eye triangle; local-illumination scope; N, L, V; the Phong sum previewed)
    0:18  Part 2  Diffuse                           30 min  (Lambert's projected-area argument; diffuse = max(0,N·L); worked N·L=0.988 at the marked point; the demo; light-behind sanity; normals need the inverse-transpose + the 451 hand-transform excerpt)
    0:48  Part 3  Specular & ambient                25 min  (mirror R = 2(N·L)N − L from S02's projection split; Phong R·V^s worked 0.879^30=0.021; shininess behavior; Blinn H·N as the one-beat variant; ambient the confession term; the full Phong sum)
    1:13  Part 4  Light sources                     20 min  (directional/point/spot; distance attenuation; the spot cone ComputeDiffuse excerpt; PointLight.cs/LoadLight.cs; multiple lights sum)
    1:33  Part 5  HDR + tone mapping + CDP          15 min  (values exceed 1; Reinhard x/(1+x) worked 4→0.8; Topic9 CDP plan; FP progress-demo logistics)
    1:48  Wrap                                       3 min  (Thu shader studio + FP progress demos; MP6 due — Canvas)
    1:51  end (+ buffer)
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 9 — Illumination: Light, Surface, Eye**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>

---

## Tonight

- **What you see** — a surface reads as a solid only once it is **lit**; the light–surface–eye triangle
- **Diffuse** — the soft, matte term: **Lambert's** `max(0, N·L)`, from a projected-area argument
- **Specular & ambient** — the sharp **highlight** `R·V` to a power, plus a constant **fill**
- **Light sources** — directional, point, and **spot** lights; distance falloff; many lights **sum**
- **HDR & tone mapping** — when brightness exceeds **1**, squash it back into `[0,1]` for the screen

---

### Part 1 · What you see

<small>(~15 min)</small>

---

## A mesh needs light to read as shape

Texture the sphere from S08 and freeze the shading: it reads as a flat **disk**, a sticker. What tells your eye it is a **ball** is the way its brightness **varies** across the surface — bright where it faces the light, dark where it turns away.

- geometry (S07) sets the **shape**; a texture (S08) sets the **base color**
- neither, alone, produces the **shading** that makes a surface look solid and curved

Tonight: compute that brightness — a **local**, **cheap** model, a few dot products per point.

---

## The triangle: light, surface, eye

Every local lighting model is built from **three** directions meeting at a surface point:

```text
     light                 eye
        ↖    N (normal)    ↗
          \      ↑       /
        L   \    |     /   V
              ──●──────────      the shaded point
```

- **L** — direction to the light (where illumination comes from)
- **N** — the surface **normal** (the per-vertex normal we built in S07)
- **V** — direction to the eye (the camera)

Shading is a function of the **angles** between these three — the whole geometry of the problem.

---

## Local illumination: honest scope

This model shades each point using **only** the lights, the normal, and the eye — **never** the other surfaces in the scene. That buys enormous speed, and it costs realism:

- **captured** — direct light on a point: matte shading, highlights, per-light falloff
- **ignored** — light **bouncing** between surfaces: color bleeding, soft shadows, mirror reflections of the room, a surface lighting its neighbor

A red wall next to a white one does not tint the white one here — that needs light **bounces**, a far larger computation and **its own subject**. Tonight we buy speed with the local assumption, and it is enough for a huge amount of convincing shading.

---

## The recipe: ambient + diffuse + specular

The **Phong** model sums **three** terms at each point, built one at a time tonight:

```text
   color  =   ambient      +      diffuse       +      specular
              (constant)      (matte, on N·L)      (glint, on R·V)
```

- **ambient** — a constant fill so shadows are not pure black (the confession term)
- **diffuse** — matte: bright facing the light, dark facing away (**Part 2**)
- **specular** — the sharp highlight where the surface mirrors the light to your eye (**Part 3**)

Three terms, each a dot product; add and clamp to the display range. That is Phong.

---

### Part 2 · Diffuse reflection

<small>(~30 min)</small>

---

## Lambert: brightness follows the projected area

A **matte** surface (chalk, paper, unfinished wood) scatters incoming light **equally in all directions** — so its brightness does **not** depend on where you look from. It depends only on how much light the patch **catches**, and that is a **projected-area** question:

```text
   light straight on (N ∥ L)        light at a grazing angle
      │ │ │ │ │  same beam            ╲ ╲ ╲ ╲ ╲  same beam,
      ▼ ▼ ▼ ▼ ▼  hits a small          ▽  ▽  ▽    spread over a
   ───────────  patch fully         ────────────  LARGER patch
     full brightness                  dim: energy per area drops
```

A fixed beam of light striking a surface **head-on** is concentrated on a small patch; striking at a **grazing** angle, the **same** beam smears over a larger patch, so each bit of surface catches **less**. Brightness tracks the **angle** the surface makes to the light.

---

## That cosine is N·L

The fraction of the beam a patch catches is the **cosine** of the angle θ between the surface normal **N** and the light direction **L**. For **unit** vectors, that cosine is just their **dot product** (S02):

```text
   diffuse  =  cos θ  =  N · L            (N, L unit vectors)

   N ∥ L   (facing the light)   → cos 0°  = 1     full brightness
   θ = 60°                       → cos 60° = 0.5   half
   N ⊥ L   (edge-on)            → cos 90° = 0     no light caught
```

The projected-area shrink **is** a cosine, and S02 already told us a cosine of two unit vectors is their dot product. No new machinery — the diffuse term is one dot product, `N · L`.

---

## Clamp the back face: max(0, N·L)

Past 90°, the surface faces **away** from the light and `N · L` goes **negative** — but there is no such thing as **negative** light. A back-facing patch simply gets **none**, so we **clamp** at zero:

```text
   diffuse  =  k_d · lightColor · max(0, N · L)
```

- `max(0, · )` — negative cosines (surface turned away) become **0**, not a dark glow
- `k_d` — the surface's **diffuse color / reflectance** (how much of each channel it reflects)
- `lightColor` — the light's color and intensity

The whole diffuse term: clamp the cosine, scale by the surface color and the light. Matte shading, done.

---

## Our worked point: a marked spot on a sphere

The demo (in a moment) lights a sphere of radius **1.2**, centered at the origin, and marks **one** point where it shows the live numbers. The marked point sits where the normal is `N = normalize(1, 1, 1)`:

```text
   N     = normalize(1, 1, 1) = (0.577, 0.577, 0.577)     the surface normal
   point = 1.2 · N            = (0.693, 0.693, 0.693)     on the sphere
```

For a sphere centered at the origin, the outward **normal at any point is just the normalized point** — so N does not depend on the radius we chose. We will now light this exact point with the default light and get the diffuse number by hand, then read it off the live panel.

---

## Step 1 — the light and L

The demo's **default** light orbits at radius **3**, at azimuth **45°** and elevation **30°** (the same cos/sin orbit formula the view matrix used in S06). That puts it at:

```text
   lightPos = 3·(cos30°·sin45°,  sin30°,  cos30°·cos45°)
            = 3·(0.6124, 0.5000, 0.6124)
            = (1.837, 1.500, 1.837)

   L = normalize(lightPos − point)
     = normalize(1.144, 0.807, 1.144)
     = (0.633, 0.446, 0.633)
```

**L** points from the marked point **toward** the light — subtract the point from the light position, then normalize to unit length. Three carried decimals; every digit is checked against the demo's own vector code.

---

## Step 2 — N·L, the diffuse number

Now dot the normal with the light direction:

```text
   N · L = (0.577)(0.633) + (0.577)(0.446) + (0.577)(0.633)
         = 0.577 · (0.633 + 0.446 + 0.633)
         = 0.577 · 1.712
         = 0.988

   diffuse = max(0, N·L) = 0.988
```

The marked point faces **almost straight into** the light (`N·L` near 1), so it is **near full** diffuse brightness — `0.988`. Hold that number: the live panel reads exactly **`0.988`** at the default light, because the demo runs this same arithmetic.

---

## Meet the demo: light a sphere

The `illumination` demo lights **one** sphere with **one** orbiting point light and marks the spot we just computed. As you drag the light, the panel shows the live **classic-Phong** numbers at that point:

- **`lightAz`** — swing the light around the sphere (azimuth); watch `N·L` and the shading move together
- **`shine`** — the specular exponent (Part 3); watch the highlight tighten as it climbs

The panel reads **`N·L`**, **`R·V`**, **`diffuse`**, and **`specular`** — all computed in our own vector math, not read off the GPU. The full sandbox adds `lightEl` and the diffuse/specular toggles.

---

## The lighting, live

<div class="cockpit" data-demo="illumination" data-controls="lightAz,shine"><pre class="viz-fallback">  one sphere (r = 1.2), one orbiting point light, one marked point n = normalize(1,1,1)
  -- default light: lightAz = 45°, lightEl = 30°, shine = 30 ----------------------
     N·L      = 0.988        diffuse  = max(0, N·L)      = 0.988
     R·V      = 0.879        specular = max(0, R·V)^30   = 0.021
     (classic Phong at the marked point; three renders Blinn-Phong internally)
     swing the light behind (az = 225°, el = −30°): N·L = −0.998 → diffuse = 0.000
     drag lightAz → N·L and the shading move together; drag shine → the highlight tightens</pre></div>

---

## Sanity check: light behind → dark

Swing the light to the **far** side — azimuth 225°, elevation −30° — and the marked point now faces **away** from it:

```text
   lightPos = (−1.837, −1.500, −1.837)
   N · L    = −0.998          (normal and light nearly opposite)
   diffuse  = max(0, −0.998) = 0.000
```

The clamp earns its keep: `N·L` is almost `−1` (the point faces directly **away**), so the diffuse term is exactly **0** — the marked point is in **shadow-from-facing**, and the sphere's near side goes dark. This is the honest behavior of `max(0, N·L)`, and the demo shows it the instant the light passes behind.

---

## A trap: normals do not transform like points

When you transform a model by a matrix **M** (S04), you transform its **positions** by M. But transforming its **normals** by M is **wrong** — under a **non-uniform** scale the normal ends up **tilted off** the surface:

```text
   stretch a circle wide (scale x by 2):

     before          transform the point by M     transform the normal by M
      ↑ N               ↗ (still on rim)              → N no longer ⊥ surface!
      ●──               ●────                          ●────  points the wrong way
```

A normal is **perpendicular** to the surface, and "perpendicular" is **not** preserved by non-uniform scaling. Positions and normals obey **different** transform rules — the fix is the next slide.

---

## The fix: the inverse-transpose

Transform a normal by the **inverse-transpose** of the model matrix, `(M⁻¹)ᵀ`, and perpendicularity is restored. It is the matrix that keeps the normal **orthogonal to the surface** after the surface deforms:

```text
   position:   p'  =  M · p
   normal:     n'  =  (M⁻¹)ᵀ · n            then re-normalize
```

- for a **pure rotation** `(M⁻¹)ᵀ = M`, so nothing changes — the trap only bites under **scaling/shearing**
- engines usually compute `(M⁻¹)ᵀ` for you and hand it to the shader as the "normal matrix"

The idea is old and exact; but what if the shader is **not** handed that matrix? Sung's CSS 451 shader hits exactly that — next slide.

---

## In real code: the hand normal-transform

Sung's `9.3.DiffuseIllumination/451NoCullShader.shader` has **no** inverse-transpose available. Its trick: transform a nearby point **along the normal**, transform the base point, and take their **difference** as the new normal:

```csharp [1-8]
o.vertexWC = mul(UNITY_MATRIX_M, v.vertex);   // the point, in world space
// this is not pretty but we don't have access to inverse-transpose ...
float3 p = v.vertex + v.normal;               // a step ALONG the normal
p = mul(UNITY_MATRIX_M, float4(p, 1));        // that stepped point, in world space
o.normal = normalize(p - o.vertexWC);         // world-space normal = the difference
// NOTE: this is in the world space!!
```

Push the point **and** a point one step along its normal through the **same** `M`, subtract, normalize. For a rigid `M` this recovers the normal exactly — a stand-in when the proper matrix is missing.

---

### Part 3 · Specular & ambient

<small>(~25 min)</small>

---

## The specular highlight

A **shiny** surface (polished metal, wet plastic, an apple) shows a compact **bright spot** — the reflection of the light source itself. Unlike diffuse, it **depends on where you look**: move your head and the glint slides across the surface.

- the highlight appears where the surface **mirrors** the light **toward your eye**
- it is **view-dependent** (diffuse was not) — a function of **V**, the eye direction
- **tight** on a mirror-smooth surface, **broad** on a rough one

So specular needs the light's **mirror direction** and how close the **eye** sits to it.

---

## R: reflect L about the normal (S02 again)

The mirror direction **R** is **L reflected about the normal N**. Build it with S02's **projection split**: decompose L into the part **along N** and the part **in the surface**, then flip the in-surface part:

```text
   L  =  (N·L) N   +   [ L − (N·L) N ]        along N  +  in the surface
   R  =  (N·L) N   −   [ L − (N·L) N ]        keep along-N, FLIP in-surface

     ⇒   R  =  2 (N·L) N  −  L
```

- `(N·L) N` is L's **projection onto N** — exactly S02's projection of one vector onto another
- reflecting **keeps** the along-normal part and **negates** the tangential part
- the same **decompose-then-reassemble** move as S03's rotations — projection is the reusable tool

---

## Worked R and the highlight R·V

At the marked point, with `N·L = 0.988` and the default light, `R = 2(N·L)N − L`:

```text
   R = 2(0.988)(0.577, 0.577, 0.577) − (0.633, 0.446, 0.633)
     = (0.508, 0.695, 0.508)                    the mirror direction

   V = normalize(cameraPos − point),  camera (3, 3, 6)
     = (0.370, 0.370, 0.852)                    toward the eye

   R · V = 0.879                                how aligned mirror & eye are
```

`R·V = 0.879` — the eye sits fairly close to the mirror direction (cosine near 1), so this point is near the **center** of the highlight. The panel reads exactly **`0.879`**. Next: raise it to a power to make the highlight **tight**.

---

## Shininess: R·V to a power

A raw cosine `R·V` gives a highlight **too broad** for a shiny surface. Raise it to a **shininess exponent** s and the falloff sharpens — high powers of a number below 1 collapse fast:

```text
   specular  =  k_s · lightColor · max(0, R·V)^s

   at our point, R·V = 0.879:
      s = 1    → 0.879        broad, washed-out sheen
      s = 30   → 0.021        a tight, plausible highlight   ← demo default
      s = 128  → 0.00000007    a pinpoint glint (near mirror)
```

`0.879^30 = 0.021` — the panel's specular reading. Bigger s ⇒ **tighter, sharper** highlight (glossier surface); smaller s ⇒ **broad, soft** sheen (rougher). `k_s` is the specular color, usually the light's color (white glints on colored plastic).

---

## Honest note: the demo renders Blinn, not Phong

The panel computes **classic Phong** (`R·V`). But three.js's `MeshPhongMaterial` shades with **Blinn's** variant: the **half-vector** `H = normalize(L + V)`, dotted with the **normal**:

```text
   Phong (our panel):   max(0, R · V)^s
   Blinn (the pixels):  max(0, H · N)^s        H = normalize(L + V)
   at our point:  R·V = 0.879      H·N = 0.969   (different numbers!)
```

- `H·N = 1` exactly when `R·V = 1`, so the highlight sits in the **same place**
- not numerically equal (Blinn needs a **larger** exponent), but they **peak together** — qualitative agreement is the point, stated honestly on the demo

---

## Ambient: the confession term

Diffuse and specular go to **0** where no light directly reaches — but real shadows are never **pure black**, because bounced light fills them. The local model **confesses** with a single constant:

```text
   ambient  =  k_a · ambientColor            (same everywhere, no direction)

   color  =  ambient  +  diffuse  +  specular
          =  k_a·amb  +  k_d·light·max(0,N·L)  +  k_s·light·max(0,R·V)^s
```

- a **constant** floor on every point, lit or not — so shadows read as **dark**, not **void**
- a **fudge**: a stand-in for the bounced light this model will not trace (too high → flat; too low → inky)

That is the whole **Phong sum** — three terms, added up.

---

### Part 4 · Light sources

<small>(~20 min)</small>

---

## Three kinds of light

`L` and the light's intensity come from a **light source**, and there are three workhorse kinds:

```text
   directional          point                    spot
   ═══════════          ·  ·  ·                   ╲   │   ╱
   ═══> ═══>           ·   ●   ·  radiates          ╲  │  ╱   a cone from
   ═══> ═══>            ·  ·  ·   in all              ╲ │ ╱    a point, aimed
   parallel rays,        directions,                  ╲│╱     in a direction
   infinitely far        from a position               ●
```

- **directional** — parallel rays, no position (the **sun**): `L` is a **constant** everywhere, no falloff
- **point** — a position radiating in **all** directions (a **bulb**): `L` points toward it, intensity **falls off** with distance
- **spot** — a point light **restricted to a cone** (a **flashlight**): a point light plus a direction and a cone angle

The demo used a **point** light. Real scenes mix all three.

---

## Distance attenuation

A point or spot light gets **dimmer** with distance. Light spreads over a sphere whose area grows as `d²`, so ideal falloff is **inverse-square**; in practice a tunable polynomial is common:

```text
   physical:   attenuation = 1 / d²                     (inverse-square)
   practical:  attenuation = 1 / (kc + kl·d + kq·d²)    (constant, linear, quadratic)
```

- **inverse-square** is the honest physics: double the distance, **quarter** the brightness
- the **polynomial** form tunes the falloff; `kc` avoids a divide-by-zero at `d = 0`; a hard **cutoff** radius (Sung's `Near`/`Far`) makes distant lights free

Multiply the light's intensity by the attenuation before the Phong sum.

---

## The spot cone, in real code

A spotlight is a point light **masked by a cone**. Sung's `9.4.PointLightSource/451NoCullShader.shader` builds the mask by hand — the angle **α** to the spot's aim, faded between an inner and outer cone:

```csharp [1-12]
float ComputeDiffuse(v2f i) {
    float3 l = normalize(SlightPos - i.vertexWC);  // direction to the spotlight
    float strength = 0;
    float alpha = acos(dot(l, LightDirection));    // angle α to the spot's aim
    float ndotl = clamp(dot(i.normal, l), 0, 1);   // the diffuse cosine
    if (alpha < _MaxTheta) {                        // inside the outer cone
        if (alpha > _MinTheta)                      // soft edge: fade
            strength = smoothstep(1, 0, ... );
        else strength = 1;                          // inner cone: full
    }
    return ndotl * strength;                        // diffuse, masked by the cone
}
```

The cone is a **second** angular test layered on `N·L` — `acos` for the angle, `smoothstep` for the soft edge.

---

## Getting the light into the shader

The shader needs the light's position, color, and range as **globals**. Sung's `PointLight.cs` pushes them; `LoadLight.cs` calls that every frame:

```csharp [1-9]
// PointLight.cs — hand the light's parameters to every shader
public void LoadLightToShader() {
    Shader.SetGlobalVector("LightPosition",  transform.localPosition);
    Shader.SetGlobalColor ("LightColor",     LightColor);
    Shader.SetGlobalFloat ("LightNear",      Near);      // cutoff range
    Shader.SetGlobalFloat ("LightFar",       Far);
    Shader.SetGlobalVector("LightDirection", DirLight.up);      // spot aim
    Shader.SetGlobalVector("SlightPos",      DirLight.localPosition);
}
// LoadLight.cs — void Update() { ALight.LoadLightToShader(); }   every frame
```

The light is an ordinary object in the scene; a script copies its transform and color into shader **globals** each frame, and every lit shader reads them. No magic — data handed from CPU to GPU, exactly the implement-and-replace spirit of S05.

---

## Many lights: just add them

One surface, several lights? The reflection model is **linear** in the lights, so the answer is the simplest possible: **sum** each light's contribution:

```text
   color  =  ambient  +  Σ over lights [ diffuse_i  +  specular_i ]
```

- each light `i` contributes its **own** `diffuse_i` (its `N·L_i`) and `specular_i` (its `R_i·V`), with its own color and attenuation
- **ambient** is added **once** (it is the scene fill, not per-light)
- more lights ⇒ more terms ⇒ more cost — the honest reason real-time budgets **cap** the light count per object

Three dot products per light, summed. That is the entire local lighting model, end to end.

---

### Part 5 · HDR, tone mapping & the CDP

<small>(~15 min)</small>

---

## Brightness has no ceiling; the screen does

Several lights and a bright specular easily push the computed color past **1** — but a display maxes out at **1** (full white). Naively **clipping** above 1 **destroys** bright detail:

```text
   sky = 6.0, cloud = 4.0, sun = 40.0          real (high-dynamic-range) values
   clip to 1:   sky → 1,  cloud → 1,  sun → 1   all pure white — detail GONE
```

- a lighting sum is naturally **HDR** — values above 1 are normal, not a bug
- **clipping** flattens every bright value to the same white, losing the differences

We need to **compress** the high range into `[0,1]` while **keeping** the differences — tone mapping.

---

## Reinhard: squash it smoothly

The simplest respectable tone-map is the **Reinhard** curve — divide each value by **one plus itself**:

```text
   display  =  x / (1 + x)
      x = 0.5 → 0.33     x = 4 → 0.80
      x = 1   → 0.50     x = 8 → 0.89
      x = 2   → 0.67     x → ∞ → 1  (approaches, never clips hard)
```

- small values pass **almost unchanged** (`0.5 → 0.33`), so shadows and midtones keep their look
- large values are **squeezed** toward — never past — 1, so bright regions **stay distinct** (`4 → 0.80`, `8 → 0.89`, not both 1)
- one line, no parameters (film curves are fancier, and **exposure** scales `x` first); apply it **last**, after all lighting

---

## The CDP: run the Topic9 projects

Thursday's studio runs Sung's real **illumination** projects — the shaders we read tonight:

- **`9.2.AnalyzingTheNormal`** — visualize the per-vertex normal; see why a wrong normal wrecks shading
- **`9.3.DiffuseIllumination`** — the hand normal-transform + `ComputeDiffuse` = `max(0, N·L)` (Part 2)
- **`9.4.PointLightSource`** — the point light, `PointLight.cs`/`LoadLight.cs`, and the **spot cone** shader (Part 4)

Implement-and-replace (S05): you read and modify the shading math yourself — no engine lighting doing it for you.

---

## Thursday: shader studio + FP progress demos

- **Shader studio** — run `9.2.AnalyzingTheNormal`, `9.3.DiffuseIllumination`, `9.4.PointLightSource`: visualize normals, read the diffuse `N·L`, tweak the spot cone
- **FP progress demos** — each team shows current progress on the **Final Project**, in a short **timed** slot, and gets quick feedback
- bring a **laptop**; the projects are on **Canvas**, and the FP demo running order + feedback form are on **Canvas** too

---

## Illumination, one idea

- A surface's shaded color is a **local** function of three directions: light **L**, normal **N**, eye **V**
- **Diffuse** is Lambert's matte term, `max(0, N·L)` — the projected-area cosine, clamped
- **Specular** is the highlight, `max(0, R·V)^s` — the mirror direction `R = 2(N·L)N − L`, to a shininess power
- **Ambient** is the constant confession term; sum all three (per light) for the **Phong** model
- Real light is **HDR**; **tone-map** it (Reinhard `x/(1+x)`) to fit the display

---

## Wrap

- **Thursday** — the illumination CDP studio (`9.2`/`9.3`/`9.4`) + Final Project progress demos (timed slots, feedback on Canvas)
- **MP6 is due** — *details on Canvas.*

Shading is **local**: at each point, one soft **diffuse** cosine `N·L`, one sharp **specular** `R·V^s`, a constant **ambient** floor — summed per light, tone-mapped to the screen. Three dot products make a flat mesh read as a lit, solid surface.

