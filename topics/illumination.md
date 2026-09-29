<!--
  CSS 551 · TOPIC DECK: Local illumination, from Lambert to tone mapping (~76 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/illumination.md"> among others; it carries
  no lecture logistics (no title, homework, wrap) and no "Part N" numbering.

  TEACHES: the light, normal and eye directions; local scope; Lambert's projected
  area and N·L, clamped; the worked marked point (N·L = 0.988); normals under a
  non-uniform scale and the inverse-transpose (36.9° error); the mirror vector
  R = 2(N·L)N − L and R·V to a power (0.879^30 = 0.021); Blinn's half vector
  (H·N = 0.969); ambient; directional, point and spot lights; attenuation;
  several lights summed; HDR and Reinhard tone mapping.
  NEEDS:   the vectors topic (dot product, projection split); the affine topic (the
           model matrix); the meshes topic (per-vertex normals).
  DEMOS:   data-demo="illumination" data-controls="lightAz,shine" (under the page's
           crop). Fallback numbers are the textbook's numbers-surfaces.json ill.default.
  NUMBERS: textbook/figures/numbers-surfaces.json (ill.*), all recomputed by the
           surfaces generator against the demo's own vector math.

  Derived from the Plan B single-file deck sessions/S09-illumination (retired);
  the studio logistics, the light-to-shader globals slide and the CDP plan are gone.

  reveal.js: FLAT (every slide a top-level "---" section). Notes follow "Note:".
  Plain unicode math, no KaTeX; never two "_" on one markdown line outside a code
  fence; no <small> on math. Paths are relative to the lecture page that mounts
  this topic (lectures/LNN-slug/index.html).
-->

### Local illumination: light, normal, eye

<small>(~76 min)</small>


---

## A mesh needs light to read as shape

Texture a sphere and freeze the shading: it reads as a flat **disk**, a sticker. What tells your eye it is a **ball** is the way its brightness **varies** across the surface: bright where it faces the light, dark where it turns away.

- geometry (the mesh) sets the **shape**; a texture sets the **base color**
- neither, alone, produces the **shading** that makes a surface look solid and curved

Here: compute that brightness, a **local**, **cheap** model, a few dot products per point.


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

- **L**: direction to the light (where illumination comes from)
- **N**: the surface **normal** (the per-vertex normal of the meshes topic)
- **V**: direction to the eye (the camera)

Shading is a function of the **angles** between these three: the whole geometry of the problem.


---

## Local illumination: honest scope

This model shades each point using **only** the lights, the normal, and the eye: **never** the other surfaces in the scene. That buys enormous speed, and it costs realism:

- **captured**: direct light on a point: matte shading, highlights, per-light falloff
- **ignored**: light **bouncing** between surfaces: color bleeding, soft shadows, mirror reflections of the room, a surface lighting its neighbor

A red wall next to a white one does not tint the white one here: that needs light **bounces**, a far larger computation and **its own subject**. This topic buys speed with the local assumption, and it is enough for a huge amount of convincing shading.


---

## The recipe: ambient + diffuse + specular

The **Phong** model sums **three** terms at each point, built one at a time below:

```text
   color  =   ambient      +      diffuse       +      specular
              (constant)      (matte, on N·L)      (glint, on R·V)
```

- **ambient**: a constant fill so shadows are not pure black (the confession term)
- **diffuse**: matte: bright facing the light, dark facing away (next)
- **specular**: the sharp highlight where the surface mirrors the light to your eye (after that)

Three terms, each a dot product; add and clamp to the display range. That is Phong.


---

### Diffuse reflection

<small>(~28 min)</small>

---

## Lambert: brightness follows the projected area

A **matte** surface (chalk, paper, unfinished wood) scatters incoming light **equally in all directions**: so its brightness does **not** depend on where you look from. It depends only on how much light the patch **catches**, and that is a **projected-area** question:

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

The fraction of the beam a patch catches is the **cosine** of the angle θ between the surface normal **N** and the light direction **L**. For **unit** vectors, that cosine is just their **dot product** (the vectors topic):

```text
   diffuse  =  cos θ  =  N · L            (N, L unit vectors)

   N ∥ L   (facing the light)   → cos 0°  = 1     full brightness
   θ = 60°                       → cos 60° = 0.5   half
   N ⊥ L   (edge-on)            → cos 90° = 0     no light caught
```

The projected-area shrink **is** a cosine, and the vectors topic already told us a cosine of two unit vectors is their dot product. No new machinery: the diffuse term is one dot product, `N · L`.


---

## Clamp the back face: max(0, N·L)

Past 90°, the surface faces **away** from the light and `N · L` goes **negative**: but there is no such thing as **negative** light. A back-facing patch simply gets **none**, so we **clamp** at zero:

```text
   diffuse  =  k_d · lightColor · max(0, N · L)
```

- `max(0, · )`: negative cosines (surface turned away) become **0**, not a dark glow
- `k_d`: the surface's **diffuse color / reflectance** (how much of each channel it reflects)
- `lightColor`: the light's color and intensity

The whole diffuse term: clamp the cosine, scale by the surface color and the light. Matte shading, done.


---

## Our worked point: a marked spot on a sphere

The demo (in a moment) lights a sphere of radius **1.2**, centered at the origin, and marks **one** point where it shows the live numbers. The marked point sits where the normal is `N = normalize(1, 1, 1)`:

```text
   N     = normalize(1, 1, 1) = (0.577, 0.577, 0.577)     the surface normal
   point = 1.2 · N            = (0.693, 0.693, 0.693)     on the sphere
```

For a sphere centered at the origin, the outward **normal at any point is just the normalized point**: so N does not depend on the radius we chose. We will now light this exact point with the default light and get the diffuse number by hand, then read it off the live panel.


---

## Step 1: the light and L

The demo's **default** light orbits at radius **3**, at azimuth **45°** and elevation **30°** (the same cos/sin orbit formula as the viewing topic's camera). That puts it at:

```text
   lightPos = 3·(cos30°·sin45°,  sin30°,  cos30°·cos45°)
            = 3·(0.6124, 0.5000, 0.6124)
            = (1.837, 1.500, 1.837)

   L = normalize(lightPos − point)
     = normalize(1.144, 0.807, 1.144)
     = (0.633, 0.446, 0.633)
```

**L** points from the marked point **toward** the light: subtract the point from the light position, then normalize to unit length. Three carried decimals; every digit is checked against the demo's own vector code.


---

## Step 2: N·L, the diffuse number

Now dot the normal with the light direction:

```text
   N · L = (0.577)(0.633) + (0.577)(0.446) + (0.577)(0.633)
         = 0.577 · (0.633 + 0.446 + 0.633)
         = 0.577 · 1.712
         = 0.988

   diffuse = max(0, N·L) = 0.988
```

The marked point faces **almost straight into** the light (`N·L` near 1), so it is **near full** diffuse brightness: `0.988`. Hold that number: the live panel reads exactly **`0.988`** at the default light, because the demo runs this same arithmetic.


---

## Meet the demo: light a sphere

The `illumination` demo lights **one** sphere with **one** orbiting point light and marks the spot we just computed. As you drag the light, the panel shows the live **classic-Phong** numbers at that point:

- **`lightAz`**: swing the light around the sphere (azimuth); watch `N·L` and the shading move together
- **`shine`**: the specular exponent (the specular stretch); watch the highlight tighten as it climbs

The panel reads **`N·L`**, **`R·V`**, **`diffuse`**, and **`specular`**: all computed in our own vector math, not read off the GPU. The full sandbox adds `lightEl` and the diffuse/specular toggles.


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

Swing the light to the **far** side, azimuth 225°, elevation −30°, and the marked point now faces **away** from it:

```text
   lightPos = (−1.837, −1.500, −1.837)
   N · L    = −0.998          (normal and light nearly opposite)
   diffuse  = max(0, −0.998) = 0.000
```

The clamp earns its keep: `N·L` is almost `−1` (the point faces directly **away**), so the diffuse term is exactly **0**, the marked point is in **shadow-from-facing**, and the sphere's near side goes dark. This is the honest behavior of `max(0, N·L)`, and the demo shows it the instant the light passes behind.


---

## A trap: normals do not transform like points

When you transform a model by a matrix **M** (the affine topic), you transform its **positions** by M. But transforming its **normals** by M is **wrong**: under a **non-uniform** scale the normal ends up **tilted off** the surface:

```text
   stretch a circle wide (scale x by 2):

     before          transform the point by M     transform the normal by M
      ↑ N               ↗ (still on rim)              → N no longer ⊥ surface!
      ●──               ●────                          ●────  points the wrong way
```

A normal is **perpendicular** to the surface, and "perpendicular" is **not** preserved by non-uniform scaling. Positions and normals obey **different** transform rules: the fix is the next slide.


---

## The fix: the inverse-transpose

Transform a normal by the **inverse-transpose** of the model matrix, `(M⁻¹)ᵀ`, and perpendicularity is restored. It is the matrix that keeps the normal **orthogonal to the surface** after the surface deforms:

```text
   position:   p'  =  M · p
   normal:     n'  =  (M⁻¹)ᵀ · n            then re-normalize
```

- for a **pure rotation** `(M⁻¹)ᵀ = M`, so nothing changes: the trap only bites under **scaling/shearing**
- engines usually compute `(M⁻¹)ᵀ` for you and hand it to the shader as the "normal matrix"

In Unity, `UnityObjectToWorldNormal` applies it; the Unity-shaders chapter shows the shortcut that breaks under non-uniform scale.


---

### Specular and ambient

<small>(~20 min)</small>

---

## The specular highlight

A **shiny** surface (polished metal, wet plastic, an apple) shows a compact **bright spot**: the reflection of the light source itself. Unlike diffuse, it **depends on where you look**: move your head and the glint slides across the surface.

- the highlight appears where the surface **mirrors** the light **toward your eye**
- it is **view-dependent** (diffuse was not): a function of **V**, the eye direction
- **tight** on a mirror-smooth surface, **broad** on a rough one

So specular needs the light's **mirror direction** and how close the **eye** sits to it.


---

## R: reflect L about the normal

The mirror direction **R** is **L reflected about the normal N**. Build it with the vectors topic's **projection split**: decompose L into the part **along N** and the part **in the surface**, then flip the in-surface part:

```text
   L  =  (N·L) N   +   [ L − (N·L) N ]        along N  +  in the surface
   R  =  (N·L) N   −   [ L − (N·L) N ]        keep along-N, FLIP in-surface

     ⇒   R  =  2 (N·L) N  −  L
```

- `(N·L) N` is L's **projection onto N**: the projection of one vector onto another
- reflecting **keeps** the along-normal part and **negates** the tangential part
- the same **decompose-then-reassemble** move as the rotation topic's Rodrigues formula: projection is the reusable tool


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

`R·V = 0.879`: the eye sits fairly close to the mirror direction (cosine near 1), so this point is near the **center** of the highlight. The panel reads exactly **`0.879`**. Next: raise it to a power to make the highlight **tight**.


---

## Shininess: R·V to a power

A raw cosine `R·V` gives a highlight **too broad** for a shiny surface. Raise it to a **shininess exponent** s and the falloff sharpens: high powers of a number below 1 collapse fast:

```text
   specular  =  k_s · lightColor · max(0, R·V)^s

   at our point, R·V = 0.879:
      s = 1    → 0.879        broad, washed-out sheen
      s = 30   → 0.021        a tight, plausible highlight   ← demo default
      s = 128  → 0.00000007    a pinpoint glint (near mirror)
```

`0.879^30 = 0.021`: the panel's specular reading. Bigger s ⇒ **tighter, sharper** highlight (glossier surface); smaller s ⇒ **broad, soft** sheen (rougher). `k_s` is the specular color, usually the light's color (white glints on colored plastic).


---

## Honest note: the demo renders Blinn, not Phong

The panel computes **classic Phong** (`R·V`). But three.js's `MeshPhongMaterial` shades with **Blinn's** variant: the **half-vector** `H = normalize(L + V)`, dotted with the **normal**:

```text
   Phong (our panel):   max(0, R · V)^s
   Blinn (the pixels):  max(0, H · N)^s        H = normalize(L + V)
   at our point:  R·V = 0.879      H·N = 0.969   (different numbers!)
```

- `H·N = 1` exactly when `R·V = 1`, so the highlight sits in the **same place**
- not numerically equal (Blinn needs a **larger** exponent), but they **peak together**: qualitative agreement is the point, stated honestly on the demo


---

## Ambient: the confession term

Diffuse and specular go to **0** where no light directly reaches: but real shadows are never **pure black**, because bounced light fills them. The local model **confesses** with a single constant:

```text
   ambient  =  k_a · ambientColor            (same everywhere, no direction)

   color  =  ambient  +  diffuse  +  specular
          =  k_a·amb  +  k_d·light·max(0,N·L)  +  k_s·light·max(0,R·V)^s
```

- a **constant** floor on every point, lit or not: so shadows read as **dark**, not **void**
- a **fudge**: a stand-in for the bounced light this model will not trace (too high → flat; too low → inky)

That is the whole **Phong sum**: three terms, added up.


---

### Light sources

<small>(~12 min)</small>

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

- **directional**: parallel rays, no position (the **sun**): `L` is a **constant** everywhere, no falloff
- **point**: a position radiating in **all** directions (a **bulb**): `L` points toward it, intensity **falls off** with distance
- **spot**: a point light **restricted to a cone** (a **flashlight**): a point light plus a direction and a cone angle

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

A spotlight is a point light **masked by a cone**. Kelvin Sung's `9.4.PointLightSource` shader builds the mask by hand: the angle **α** to the spot's aim, faded between an inner and outer cone:

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

The cone is a **second** angular test layered on `N·L`: `acos` for the angle, `smoothstep` for the soft edge.


---

## Many lights: just add them

One surface, several lights? The reflection model is **linear** in the lights, so the answer is the simplest possible: **sum** each light's contribution:

```text
   color  =  ambient  +  Σ over lights [ diffuse_i  +  specular_i ]
```

- each light `i` contributes its **own** `diffuse_i` (its `N·L_i`) and `specular_i` (its `R_i·V`), with its own color and attenuation
- **ambient** is added **once** (it is the scene fill, not per-light)
- more lights ⇒ more terms ⇒ more cost: the honest reason real-time budgets **cap** the light count per object

Three dot products per light, summed. That is the entire local lighting model, end to end.


---

### High dynamic range and tone mapping

<small>(~6 min)</small>

---

## Brightness has no ceiling; the screen does

Several lights and a bright specular easily push the computed color past **1**: but a display maxes out at **1** (full white). Naively **clipping** above 1 **destroys** bright detail:

```text
   sky = 6.0, cloud = 4.0, sun = 40.0          real (high-dynamic-range) values
   clip to 1:   sky → 1,  cloud → 1,  sun → 1   all pure white, detail GONE
```

- a lighting sum is naturally **HDR**: values above 1 are normal, not a bug
- **clipping** flattens every bright value to the same white, losing the differences

We need to **compress** the high range into `[0,1]` while **keeping** the differences: tone mapping.


---

## Reinhard: squash it smoothly

The simplest respectable tone-map is the **Reinhard** curve: divide each value by **one plus itself**:

```text
   display  =  x / (1 + x)
      x = 0.5 → 0.33     x = 4 → 0.80
      x = 1   → 0.50     x = 8 → 0.89
      x = 2   → 0.67     x → ∞ → 1  (approaches, never clips hard)
```

- small values pass **almost unchanged** (`0.5 → 0.33`), so shadows and midtones keep their look
- large values are **squeezed** toward, never past, 1, so bright regions **stay distinct** (`4 → 0.80`, `8 → 0.89`, not both 1)
- one line, no parameters (film curves are fancier, and **exposure** scales `x` first); apply it **last**, after all lighting

