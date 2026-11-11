<!--
  CSS 551 · TOPIC DECK: Local illumination, from Lambert to tone mapping (~56 min, 42 slides, incl. a color section).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/illumination.md"> among others; it carries
  no lecture logistics (no title, homework, wrap) and no "Part N" numbering.

  TEACHES: local against global illumination (what a local model cannot show: cast shadows, hard or soft,
  bounced light, reflections); the light, normal and eye directions; Lambert's projected area and N·L,
  clamped; the worked marked point (N·L = 0.988); the mirror vector R = 2(N·L)N − L and R·V to a power (0.879^30 = 0.021); Blinn's
  half vector (H·N = 0.969, 0.387 at s = 30); ambient; the sum per channel; directional, point and spot
  lights; attenuation and irradiance (1.25); several lights summed; HDR tone mapping as a camera's two steps
  (exposure alone, then Reinhard's curve alone at one exposure; where it runs, in Unity and three.js);
  why images store sRGB codes (the eye's sensitivity, 256 levels), the curve (code 128 = 0.216 of the light),
  decode-shade-encode, a blend both ways (Rec. 709 luminance), the pitfall.
  NEEDS:   the vectors topic (dot product, projection split); the affine topic (the
           model matrix); the meshes topic (per-vertex normals).
  DEMOS:   data-demo="shading-lab" data-controls="view:disk.ball,lock" (the opening: disk or ball);
           data-demo="illumination", four embeds: ambient alone (terms:a), diffuse alone (terms:d),
           specular alone (terms:s), all three with a switch per term (terms:ads,toggles);
           data-demo="light-lab" data-controls="view:tone.hdr" (tone mapping, live);
           data-demo="light-lab" data-controls="view:local.point" (the whole local model, last).
  FIGURES: ../../textbook/figures/illd-local-global.svg, illd-tonemap-exposure.svg, illd-tonemap-curves.svg,
           illd-tonemap-curve.svg
           (tools/gen-lecture-figures-light.mjs), ill-vectors.svg, ill-lambert.svg, ill-normal-transform.svg,
           ill-shininess.svg, ill-lights.svg, col-transfer.svg, ill-sphere-terms.png
           (the textbook's surfaces and systems generators; the ASCII they replace is their alt).
  NUMBERS: textbook/figures/numbers-surfaces.json (ill.*), recomputed by node 2026-11-10.
  SUPPLEMENT: topics/illumination-supplement.md (the marked point worked, for HW5; energy, per vertex or per pixel, ambient occlusion,
           falloff by the numbers, the spot cone worked, the cost of many lights, area lights).

  Condensed 2026-10-06 (twelve slides to the chapter only). EDIT 2026-10-08: slide titles and text
  without editorializing.
  EDIT 2026-11-10 (Marcel: "move the local illumination slide earlier, before any details. define local
  vs. global and have a table what is gained lost. slides mention soft shadows. how about hard shadows?";
  then "let's present concepts not calculations, unless the calculations reveal something about the concepts",
  and one demo view per term, then all three with on/off switches): the terms now run ambient, diffuse,
  specular, each with the demo showing it alone; the marked point's arithmetic moved to the supplement;
  "Local and global illumination" now second, with the table; the formulas typeset (lib/deck-math.js);
  the three ASCII drawings replaced by the chapter's figures; the normal-transform slide restored (ray
  tracing's instancing relies on it; then moved to the supplement with a problem-first setup, Marcel: "it
  feels out of place"); "The same sum, in color" moved after ambient; the embed gains
  lightEl so the light-behind numbers can be reached; fixes: the marked point is at the edge of the
  highlight, not its center; a light costs two dot products, not three; linear 0.216 and luminance 0.200
  for code 128; 26 sRGB codes below 1 %. Seven slides no homework or quiz needs moved to the supplement.
  EDIT 2026-11-10 (Marcel: "the tone mapping slides need a better explanation too"): HDR rebuilt problem first as a
  camera's two steps, each figure changing one thing (exposure alone, then the curve alone at exposure 0.5, rendered
  from the light lab's own HDR scene); where the curve runs and how Unity and three.js turn it on; the light lab's
  Tone view live. The light lab's image cells now keep their size inside a demo-full slide.

  reveal.js: FLAT (every slide a top-level "---" section). Notes follow "Note:".
  Display math is a raw <div class="tex"> block typeset by MathJax (lib/deck-math.js; TeX inside, the
  ASCII form as aria-label, no blank line inside); inline math is a code span written `$...$`. Never
  two "_" on one markdown line outside a code fence or code span; paths relative to the lecture page.
-->

### Local illumination: light, normal, eye

<small>(~50 min)</small>


---

## A mesh needs light to read as shape

Texture a sphere and freeze the shading: it reads as a flat **disk**, a sticker. What tells your eye it is a **ball** is the way its brightness **varies** across the surface: bright where it faces the light, dark where it turns away.

- geometry (the mesh) sets the **shape**; a texture sets the **base color**
- neither, alone, produces the **shading** that makes a surface look solid and curved

A lighting model computes that brightness at every point, from the point's normal, the lights and the eye.


---

<!-- .slide: class="demo-full" -->

## Disk or ball, live

<div class="cockpit" data-demo="shading-lab" data-controls="view:disk.ball,lock"><pre class="viz-fallback">  one texture on a flat disk and on a sphere, side by side; light at az 40°, el 35°
  frozen (no shading): brightness 1 everywhere, and the sphere reads as a disk
  plain and frozen: the two pictures are identical, 0 of 57,600 pixels differ
  lit: the disk is 0.66 everywhere; the sphere runs from 0.10 to 0.84
  presets: "lit", "plain and frozen"</pre></div>


---

## Local and global illumination

- **local**: a point's color comes from its own position and normal, the lights and the eye; **no other surface** is consulted
- **global**: what reaches a point depends on the **rest of the scene**: what blocks the light, what reflects light onto it

<img src="../../textbook/figures/illd-local-global.svg" class="media-shot" style="max-height: 245px;" alt="Side view, two panels. A floor with point P, a gray box between P and a point light, a red wall at the left. Left, local: the light direction from P passes straight through the box, P is lit with N·L = 0.73, and the floor has no shadow anywhere. Right, global: the shadow ray from P stops at the box (visibility 0), the floor behind the box is dark, and a dashed path from the light off the red wall to P carries a red tint.">

Local gains speed: a few dot products per light per point, **however large the scene**, each point independent of the rest. It loses everything that needs a second surface.


---

## What a local model cannot show

| effect | the local model | what it takes |
| ------ | ----------- | ------------- |
| direct light: matte, highlights | computed | one or two dot products per light |
| the side turned away from a light | dark, from `max(0, N·L)` | nothing extra |
| **hard shadow** from another object | **none**: lit as if nothing were in the way | one **visibility test** per light per point: a shadow map or a shadow ray |
| **soft shadow**, from a light with area | **none** | many visibility tests per light |
| light bounced off other surfaces | **one constant**: ambient | following light from surface to surface |
| mirror reflection, refraction | **none** | a reflected or refracted ray; an environment map fakes it |

A local model has **no cast shadows at all**, hard or soft; real-time renderers multiply each light's terms by a visibility factor, 0 or 1.


---

## The triangle: light, surface, eye

Every local lighting model is built from **three** directions meeting at a surface point:

<img src="../../textbook/figures/ill-vectors.svg" class="media-shot" style="max-height: 215px;" alt="     light                 eye
        ↖    N (normal)    ↗
          \      ↑       /
        L   \    |     /   V
              ──●──────────      the shaded point
The marked point on the demo's sphere, with arrows N, L toward the light at (1.84, 1.50, 1.84), V toward the eye, the mirror direction R and the half vector H.">

- **L**: direction to the light (where illumination comes from)
- **N**: the surface **normal** (the per-vertex normal of the meshes topic)
- **V**: direction to the eye (the camera)

Shading is a function of the **angles** between these three (R and H, also drawn, come with the specular term).


---

## The recipe: ambient + diffuse + specular

The **Phong** model sums **three** terms at each point, built one at a time below:

<div class="tex" role="img" aria-label="color = ambient (constant) + diffuse (matte, on N·L) + specular (glint, on R·V)">
\[ \text{color} \;=\; \underbrace{\text{ambient}}_{\text{constant}} \;+\; \underbrace{\text{diffuse}}_{\text{matte, on } N\cdot L} \;+\; \underbrace{\text{specular}}_{\text{glint, on } R\cdot V} \]
</div>

- **ambient**: a constant fill so shadows are not pure black
- **diffuse**: matte: bright facing the light, dark facing away (next)
- **specular**: the sharp highlight where the surface mirrors the light to your eye (after that)

Diffuse and specular are one dot product each per light; ambient is a constant. Add them, then map the sum into the display's range.


---

## The three terms, pictured

<img src="../../textbook/figures/ill-sphere-terms.png" class="media-shot" style="max-height: 290px;" alt="the demo's sphere rendered four times: ambient only, diffuse only, specular only, and their sum">

Ambient is flat, diffuse follows the cosine, specular is a small bright spot; the sum is the image. Each needs one more direction than the last: ambient none, diffuse the light's, specular the light's and the eye's.


---

### The three terms, one at a time

<small>(~28 min)</small>


---

## Ambient: a constant for bounced light

Where no light reaches directly, real surfaces are still not **pure black**: light bounced off everything else fills them. The local model cannot follow those bounces, so it adds a **constant**:

<div class="tex" role="img" aria-label="ambient = k_a · k_d     (no L, no N, no V)">
\[ \text{ambient} = k_a \cdot k_d \qquad \text{(no } L\text{, no } N\text{, no } V\text{)} \]
</div>

- `$k_d$` is the surface's color; `$k_a$` says how much fill light the scene has
- **no direction**: move the light, turn the surface, move the eye, and ambient does not change
- a stand-in for bounced light: too high and everything flattens; too low and shadows go inky


---

<!-- .slide: class="demo-full" -->

## Ambient alone, live

<div class="cockpit" data-demo="illumination" data-controls="terms:a,lightAz,lightEl,ka,kd,hue"><pre class="viz-fallback">  ambient only: diffuse and specular off
  the sphere is one flat color, ka times the surface color, and reads as a disk
  drag the light: nothing changes; drag ka or kd: the whole disk brightens or darkens; drag hue: its color changes</pre></div>


---

## Lambert: brightness follows the projected area

A **matte** surface (chalk, paper, unfinished wood) scatters incoming light **equally in all directions**: so its brightness does **not** depend on where you look from. It depends only on how much light the patch **catches**, and that is a **projected-area** question:

<img src="../../textbook/figures/ill-lambert.svg" class="media-shot" style="max-height: 230px;" alt="   light straight on (N ∥ L)        light at a grazing angle
      │ │ │ │ │  same beam            ╲ ╲ ╲ ╲ ╲  same beam,
      ▼ ▼ ▼ ▼ ▼  hits a small          ▽  ▽  ▽    spread over a
   ───────────  patch fully         ────────────  LARGER patch
     full brightness                  dim: energy per area drops
Right: the clamped cosine of the angle between N and L from 0 to 180 degrees, with the demo's marked point at 8.8 degrees, 0.988.">

The **same** beam at 60° covers **twice** the patch, so each bit of surface catches **half**. Brightness tracks the **angle** the surface makes to the light.


---

## That cosine is N·L

The fraction of the beam a patch catches is the **cosine** of the angle θ between the surface normal **N** and the light direction **L**. For **unit** vectors, that cosine is just their **dot product** (the vectors topic):

<div class="tex" role="img" aria-label="diffuse = cos θ = N · L   (N, L unit vectors)
N ∥ L (facing the light):  cos 0° = 1    full brightness
θ = 60°:                   cos 60° = 0.5 half
N ⊥ L (edge-on):           cos 90° = 0   no light caught">
\[ \begin{gathered} \text{diffuse} = \cos\theta = N \cdot L \qquad (N,\ L \text{ unit vectors}) \\[6pt] \begin{array}{lll} N \parallel L \text{ (facing the light)} & \cos 0^\circ = 1 & \text{full brightness} \\ \theta = 60^\circ & \cos 60^\circ = 0.5 & \text{half} \\ N \perp L \text{ (edge-on)} & \cos 90^\circ = 0 & \text{no light caught} \end{array} \end{gathered} \]
</div>

No new machinery: the diffuse term is one dot product, `N · L`.


---

## Clamp the back face: max(0, N·L)

Past 90°, the surface faces **away** from the light and `N · L` goes **negative**: but there is no such thing as **negative** light. A back-facing patch simply gets **none**, so we **clamp** at zero:

<div class="tex" role="img" aria-label="diffuse = k_d · lightColor · max(0, N · L)">
\[ \text{diffuse} = k_d \cdot \text{lightColor} \cdot \max(0,\ N \cdot L) \]
</div>

- `max(0, · )`: negative cosines (surface turned away) become **0**, not a dark glow
- `$k_d$`: the surface's **diffuse color / reflectance** (how much of each channel it reflects)
- `lightColor`: the light's color and intensity

The whole diffuse term: clamp the cosine, scale by the surface color and the light.


---

<!-- .slide: class="demo-full" -->

## Diffuse alone, live

<div class="cockpit" data-demo="illumination" data-controls="terms:d,lightAz,lightEl,kd,hue"><pre class="viz-fallback">  diffuse only: ambient and specular off
  bright where the surface faces the light, falling off as the cosine, black past 90°
  drag the light: the bright side follows it; behind the sphere the near side goes black
  drag kd or hue: the brightness or the color of the lit side changes; the eye does not matter</pre></div>


---

## The specular highlight

A **shiny** surface (polished metal, wet plastic, an apple) shows a compact **bright spot**: the reflection of the light source itself. Unlike diffuse, it **depends on where you look**: move your head and the glint slides across the surface.

- the highlight appears where the surface **mirrors** the light **toward your eye**
- it is **view-dependent** (diffuse was not): a function of **V**, the eye direction
- **tight** on a mirror-smooth surface, **broad** on a rough one

So specular needs the light's **mirror direction** and how close the **eye** sits to it: the first term that reads V.


---

## R: reflect L about the normal

The mirror direction **R** is **L reflected about the normal N**. Build it with the vectors topic's **projection split**: decompose L into the part **along N** and the part **in the surface**, then flip the in-surface part:

<div class="tex" role="img" aria-label="L = (N·L) N + [ L − (N·L) N ]     along N + in the surface
R = (N·L) N − [ L − (N·L) N ]     keep along-N, FLIP in-surface
  = 2 (N·L) N − L">
\[ \begin{aligned} L &= \underbrace{(N\cdot L)\,N}_{\text{along } N} + \underbrace{\big[L - (N\cdot L)\,N\big]}_{\text{in the surface}} \\ R &= (N\cdot L)\,N - \big[L - (N\cdot L)\,N\big] \\ &= 2\,(N\cdot L)\,N - L \end{aligned} \]
</div>

- `(N·L) N` is L's **projection onto N**: the projection of one vector onto another
- reflecting **keeps** the along-normal part and **negates** the tangential part
- the same **decompose-then-reassemble** move as the rotation topic's Rodrigues formula


---

## Shininess: R·V to a power

A raw cosine `R·V` gives a highlight **too broad** for a shiny surface. Raise it to a **shininess exponent** s and the falloff sharpens:

<div class="tex" role="img" aria-label="specular = k_s · max(0, R·V)^s">
\[ \text{specular} = k_s \cdot \max(0,\ R \cdot V)^{s} \]
</div>

<img src="../../textbook/figures/ill-shininess.svg" class="media-shot" style="max-height: 215px;" alt="Four curves of cosine to the power s against the angle between R and V from 0 to 60 degrees, for s = 1, 8, 30 and 128, each tighter than the last; at 28.5 degrees the s = 30 curve reads 0.021.">

Bigger s, **tighter** highlight: 28.5° off the mirror direction, s = 1 still gives 0.88, s = 30 gives 0.02. `$k_s$` is the highlight's color, usually white: plastic.


---

<!-- .slide: class="demo-full" -->

## Specular alone, live

<div class="cockpit" data-demo="illumination" data-controls="terms:s,lightAz,lightEl,ks,shine"><pre class="viz-fallback">  specular only: ambient and diffuse off, the body black
  one bright spot where the surface mirrors the light toward the eye
  drag the light, or orbit the camera: the spot moves with both
  drag shine: the spot tightens; drag ks: it dims or brightens</pre></div>


---

## Blinn's half vector

Most engines use **Blinn's** variant (1977): take the direction **halfway** between the light and the eye, and ask how close the **normal** is to it:

<div class="tex" role="img" aria-label="H = (L + V) / |L + V|   with L and V unit vectors;   specular = k_s · max(0, N · H)^s">
\[ H = \frac{L + V}{\lVert L + V \rVert} \quad (L,\ V \text{ unit}) \qquad\qquad \text{specular} = k_s \max(0,\ N \cdot H)^s \]
</div>

<img src="../../textbook/figures/illd-half-vector.svg" class="media-shot" style="max-height: 230px;" alt="Two side views of a surface with normal N. Left: L 40 degrees to the left of N, V 15 degrees to the right, R the mirror of L; R and V are 25 degrees apart and H, halfway between L and V, is 12.5 degrees from N. Right: the same L at length 3 and V at length 1: H = normalize(L + V) leans toward the light, 27.1 degrees from N instead of 12.5.">

- **normalize L and V first**: only two unit vectors add up to their bisector
- `N·H = 1` exactly when `R·V = 1`: the **same place**; but N to H is **half** the angle R to V, so about **4 times** the exponent


---

## Phong or Blinn-Phong

| | Phong | Blinn-Phong |
| - | ----- | ----------- |
| the specular term | `max(0, R·V)^s` | `max(0, N·H)^s` |
| work per light and point | `R = 2(N·L)N − L` | `H`: add, normalize; one `H` for the whole surface if the light is directional and the viewer far |
| the same highlight | exponent s | exponent about 4s |
| eye more than 90° from R | cut to 0: with a low exponent the highlight's edge shows | `N·H` stays positive while L and V are above the surface: a smooth fade |
| grazing light and view | the highlight stays round | the highlight stretches along the surface, as on a wet road; closer to measured materials |

Blinn-Phong is the real-time default; its H returns in physically based shading as the microfacet normal.


---

## The Phong sum

Add the three terms, **per color channel**, and per light:

<div class="tex" role="img" aria-label="color = k_a·k_d + k_d·max(0, N·L) + k_s·max(0, R·V)^s     (each light's color multiplies its two terms)">
\[ \text{color} = k_a\, k_d \;+\; k_d \max(0,\ N\cdot L) \;+\; k_s \max(0,\ R\cdot V)^s \]
</div>

- `$k_d$` colors the ambient and the diffuse terms: the body color
- `$k_s$` colors the highlight: **white** for plastic (the light reflects off a clear coat), the **metal's own color** for gold or copper
- the light's color multiplies its diffuse and specular terms


---

<!-- .slide: class="demo-full" -->

## All three, live

<div class="cockpit" data-demo="illumination" data-controls="terms:ads,toggles,lightAz,lightEl,ka,kd,ks,shine"><pre class="viz-fallback">  all three terms, each with its own switch
  ambient alone: a flat disk; + diffuse: a lit ball with a black-free shadow side; + specular: the glint
  drag the light: diffuse and specular follow it, ambient stays; orbit: only specular moves
  drag ka, kd, ks, shine: each changes only its own term</pre></div>


---

### Light sources

<small>(~8 min)</small>

---

## Three kinds of light

`L` and the light's intensity come from a **light source**, and there are three workhorse kinds:

<img src="../../textbook/figures/ill-lights.svg" class="media-shot" style="max-height: 200px;" alt="   directional          point                    spot
   ═══════════          ·  ·  ·                   ╲   │   ╱
   ═══> ═══>           ·   ●   ·  radiates          ╲  │  ╱   a cone from
   ═══> ═══>            ·  ·  ·   in all              ╲ │ ╱    a point, aimed
   parallel rays,        directions,                  ╲│╱     in a direction
   infinitely far        from a position               ●
Below: attenuation against distance, inverse square against a gentler polynomial; spot strength against the angle to its axis, 1 inside 15 degrees, 0 beyond 25, 0.844 at 20.">

- **directional**: parallel rays, no position (the **sun**): `L` is a **constant** everywhere, no falloff
- **point**: a position radiating in **all** directions (a **bulb**): `L` points toward it, intensity **falls off** with distance
- **spot**: a point light **restricted to a cone** (a **flashlight**): a point light plus a direction and a cone angle


---

## Distance attenuation

A point or spot light gets **dimmer** with distance. Light spreads over a sphere whose area grows as `$d^2$`, so ideal falloff is **inverse-square**; in practice a tunable polynomial is common:

<div class="tex" role="img" aria-label="physical:   attenuation = 1 / d²                     (inverse-square)
practical:  attenuation = 1 / (kc + kl·d + kq·d²)    (constant, linear, quadratic)">
\[ \text{physical: } \frac{1}{d^2} \qquad\qquad \text{practical: } \frac{1}{k_c + k_l\, d + k_q\, d^2} \]
</div>

- double the distance, **a quarter** of the light; `$k_c$` avoids a divide-by-zero at `$d = 0$`; a cutoff radius makes distant lights free
- the light a surface receives from a point light: `$E = I \cos\theta / d^2$`, the cosine from Lambert and the square from distance


---

## The spot cone, in real code

A spotlight is a point light **masked by a cone**: the angle **α** to the spot's aim, faded between an inner and an outer cone. In a Unity shader:

```csharp [1-15]
float ComputeDiffuse(v2f i) {
    float3 l = normalize(SlightPos - i.vertexWC);  // direction to the spotlight
    float strength = 0;
    float alpha = acos(dot(l, LightDirection));    // angle α to the spot's aim
    float ndotl = clamp(dot(i.normal, l), 0, 1);   // the diffuse cosine
    if (alpha < _MaxTheta) {                        // inside the outer cone
        if (alpha > _MinTheta) {                    // soft edge: fade
            float n = _MinTheta - alpha;            // how far past the inner cone
            float range = _MaxTheta - _MinTheta;    // width of the soft edge
            strength = smoothstep(1, 0, (n * n) / (range * range));
        }
        else strength = 1;                          // inner cone: full
    }
    return ndotl * strength;                        // diffuse, masked by the cone
}
```

The cone is a **second** angular test layered on `N·L`: `acos` for the angle, `smoothstep` for the soft edge, on the **squared** fraction of the way through it.


---

## Many lights: just add them

One surface, several lights? The reflection model is **linear** in the lights, so the answer is the simplest possible: **sum** each light's contribution:

<div class="tex" role="img" aria-label="color = ambient + Σ over lights [ diffuse_i + specular_i ]">
\[ \text{color} = \text{ambient} + \sum_{i \,\in\, \text{lights}} \big(\text{diffuse}_i + \text{specular}_i\big) \]
</div>

- each light `i` contributes its **own** diffuse (its `N·L`) and specular (its `R·V`), with its own color and attenuation
- **ambient** is added **once** (it is the scene fill, not per-light)
- more lights ⇒ more terms ⇒ more cost: the reason real-time budgets **cap** the light count per object

Two dot products per light, summed: the whole local lighting model, end to end.


---

### High dynamic range and tone mapping

<small>(~8 min)</small>


---

## The sum has no ceiling; the screen does

- the lighting sum is an amount of **light**: lights add, a highlight concentrates, nothing stops it at 1
- values above 1 are **correct**: the sum is *high dynamic range* (HDR)
- a display has a **ceiling**, its white, and the framebuffer stores 0 to 1 per channel

| in one scene | ground | cloud | sky | sun |
| ------------ | ------ | ----- | --- | --- |
| light | about 0.1 | 4 | up to 6 | 40 |
| clipped at 1 | about 0.1 | 1 | 1 | 1 |

Clipping keeps the ground and turns every bright value into the **same** white. **Tone mapping** fits the whole range on the screen and keeps it in order.


---

## Exposure: one scale for all the light

A camera's aperture and shutter set how much light reaches the sensor. A renderer multiplies every value by an **exposure** `$k$` before display.

<img src="../../textbook/figures/illd-tonemap-exposure.svg" class="media-shot" style="max-height: 255px;" alt="The same scene twice, clipped at 1. Left, exposure 4: the green ground is well lit, while the sky, the clouds, the sun and the lit side of a sphere are one flat white. Right, exposure 0.15: a blue sky with gray clouds and a white sun, and the ground near black.">

- `$k$` chooses which brightness lands **mid-screen**; it keeps every ratio
- so one `$k$` cannot fit this scene: expose for the ground and the sky is white; expose for the sky and the ground is near black
- **auto exposure** measures the frame's average brightness and sets `$k$`: the eye adapting as you leave a tunnel


---

## A curve: squeeze the brights

Film does not cut off at white: its response **bends** toward it. The simplest such curve, Reinhard's, runs after the exposure:

<div class="tex" role="img" aria-label="display = x / (1 + x),   where x = k × light">
\[ \text{display} = \frac{x}{1 + x}, \qquad x = k \cdot \text{light} \]
</div>

<img src="../../textbook/figures/illd-tonemap-curves.svg" class="media-shot" style="max-height: 190px;" alt="Display value against x = k × light from 0 to 8: clipping rises along the diagonal and goes flat at 1; Reinhard rises with slope 1 and bends toward 1 without reaching it, with cloud 4 at 0.80 and sky 6 at 0.86 marked; the ACES film curve rises faster through the midtones and reaches 1 near x = 7.">

- small `$x$`: nearly `$x$`, so the darks are almost unchanged
- large `$x$`: near 1, never 1, so bright values stay **distinct** and in order
- engines use film-like S curves (ACES is the common one): deeper blacks, more midtone contrast, a similar shoulder


---

## The curve alone: one exposure, two ways

<img src="../../textbook/figures/illd-tonemap-curve.svg" class="media-shot" style="max-height: 280px;" alt="The same scene at exposure 0.5, twice. Left, clipped at 1: the sky, the clouds and the sun are one white, and the sphere's highlight a flat white patch. Right, Reinhard: a pale sky with gray clouds, a bright sun disk, a sphere whose highlight fades smoothly; labels sky 0.75, cloud 0.67, sun 0.95.">

- clipped: the sky, the clouds and the sun are one white; the sphere's highlight is a flat patch
- Reinhard: three grays in order, a visible sun, a highlight that fades; the ground barely changes
- the price: bright values sit **closer together**, so the sky loses contrast and color


---

## Where it runs: last

<div class="tex" role="img" aria-label="the sum of all lights → times k → x → x/(1+x) → a value in [0, 1) → encode → the display">
\[ \text{all lights, summed} \xrightarrow{\ \times\, k\ } x \xrightarrow{\ x/(1+x)\ } [0, 1) \xrightarrow{\ \text{encode}\ } \text{the display} \]
</div>

- once per pixel, after **every** light is summed; the encode is the next section's subject
- Unity (URP): HDR on in the pipeline asset, then a Volume with **Tonemapping** (Neutral or ACES) and **Post Exposure** for `$k$`
- three.js: `renderer.toneMapping = THREE.ACESFilmicToneMapping`, and `renderer.toneMappingExposure` for `$k$`


---

<!-- .slide: class="demo-full" -->

## Tone mapping, live

<div class="cockpit" data-demo="light-lab" data-controls="view:tone.hdr"><pre class="viz-fallback">  the scene of this section, three times: clipped at 1, Reinhard x/(1+x), and a film curve (ACES)
  slider: exposure k; presets exposure 1, 0.5 and 0.1
  click a pixel (presets: the sun, the sky, a cloud, the highlight): its light, and what each curve shows
  chart: the three curves against x = k × light, on a log axis</pre></div>


---

### Color in rendering

<small>(~8 min)</small>


---

## Why an image stores codes, not light

A pixel has **256 levels** per channel. The eye notices a step in light **in proportion to the light already there**: a small step is plain in the darks and invisible in the brights.

<img src="../../textbook/figures/col-ramps.png" class="media-shot" style="max-height: 200px;" alt="Four horizontal gray ramps: the first, codes from 0 to 255, looks evenly spaced; the second, linear light from 0 to 1, brightens quickly and spends most of its length in light grays; the third, 32 levels quantized in linear light, shows wide dark bands at the left and fine steps at the right; the fourth, 32 levels quantized in sRGB, shows even bands throughout.">

- third strip: levels **evenly spaced in light**: wide bands in the darks, wasted steps in the brights
- fourth strip: the same number of levels **evenly spaced in sRGB codes**: even to the eye

So a stored **code** is an encoded value, spent where the eye can see the difference; it is **not** an amount of light.


---

## The sRGB curve: from code to light

<img src="../../textbook/figures/col-transfer.svg" class="media-shot" style="max-height: 200px;" alt="Linear light against encoded value: the sRGB decode curve rises slowly then steeply, nearly on top of a dashed gamma 2.2 curve, with code 128 marked at linear 0.216 and linear 0.5 marked at code 188.">

<div class="tex" role="img" aria-label="light ≈ code^2.2 (decode),   code ≈ light^(1/2.2) (encode),   both in [0, 1]; the exact curve has a short straight piece near black">
\[ \text{light} \approx \text{code}^{2.2} \ \ \text{(decode)} \qquad \text{code} \approx \text{light}^{1/2.2} \ \ \text{(encode)} \qquad \text{both in } [0, 1] \]
</div>

- the **middle** code, 128, is only **22 %** of full light; **half** the light is code **188**
- below 1 % of full light there are **26** sRGB codes, against **3** if the byte stored light


---

## Decode, shade, encode

Light **adds**: two lights add, a surface reflects a fraction, a filter averages. Codes do not add, so every such operation must happen on **light**:

<div class="tex" role="img" aria-label="texture codes → decode → light → shade, blend, filter (in light) → encode → framebuffer codes → the display turns them back into light">
\[ \text{codes} \xrightarrow{\ \text{decode}\ } \text{light} \xrightarrow{\ \text{shade, blend, filter}\ } \text{light} \xrightarrow{\ \text{encode}\ } \text{codes} \xrightarrow{\ \text{display}\ } \text{light} \]
</div>

- the GPU does both conversions when the texture and the framebuffer are declared **sRGB**: in Unity, the **Linear** color space (Player settings) and the sRGB box on color textures; in three.js, `texture.colorSpace = THREE.SRGBColorSpace` and the renderer's sRGB output
- **data** textures, normal maps and height maps, are not colors: never decode them


---

## A blend, both ways

Mix red and green half and half. Which is the mix: the average of the **codes**, or the average of the **light**?

<div style="display:flex; gap:28px; justify-content:center; margin:0.3em 0;" role="img" aria-label="Two swatches: left, the average of the codes, (128, 128, 0), a dark olive; right, the average of the light, encoded, (188, 188, 0), a bright yellow."><div><div style="width:190px; height:90px; background:rgb(128,128,0); border-radius:4px;"></div><div style="font-size:0.55em;">codes averaged (128, 128, 0)</div></div><div><div style="width:190px; height:90px; background:rgb(188,188,0); border-radius:4px;"></div><div style="font-size:0.55em;">light averaged (188, 188, 0)</div></div></div>

A fine red and green checker, seen from afar, is the ground truth: the eye averages **photons**.

| averaged | per channel | luminance |
| -------- | ----------- | --------- |
| the codes: (128, 128, 0) | light **0.216** | **0.200**: too dark |
| the light: 0.5 each | code (188, 188, 0) | **0.464** |
| the checker, seen from afar | | **0.464** |

Luminance is computed on light (Rec. 709): `$Y = 0.2126\,R + 0.7152\,G + 0.0722\,B$`. Only the blend done in light matches the checker.


---

## Pitfall: lighting the codes

An albedo texel of code 200, lit at N·L = 0.5:

| | the arithmetic | light | stored code |
| - | -------------- | ----- | ----------- |
| correct | decode 200 → 0.578, × 0.5 | 0.289 | 146 |
| wrong | 200 × 0.5 | 0.127 | 100 |

The wrong one delivers **44 %** of the correct light. Shading on codes makes every partly lit surface **too dark** and every falloff **too steep**; artists then brighten the lights to compensate, and the highlights blow out.


---

<!-- .slide: class="demo-full" -->

## The whole local model, live

<div class="cockpit" data-demo="light-lab" data-controls="view:local.point"><pre class="viz-fallback">  one point lit by up to two lights, seen from one eye: N, L, V, and R (Phong) or H (Blinn)
  sliders: shininess s, k_a, k_s, a second light; switches: Phong R·V or Blinn H·N, raw or normalized lobe, material
  the swatches: ambient + diffuse + specular = the pixel
  preset "the marked point (deck)": Phong, s = 30, specular 0.021
  "Blinn, same s": 0.387, eighteen times brighter; "Blinn, s = 123": back to about 0.021
  tabs Lights, Tone and Gamma: the light types, tone mapping and the sRGB encoding, one view each</pre></div>

