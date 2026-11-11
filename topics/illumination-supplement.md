<!--
  CSS 551 · TOPIC DECK (supplement): Local illumination, further (~26 min, 19 slides).
  Mounted after the wrap of a lecture that mounts illumination.md, and covered time permitting: no
  homework or quiz needs it. Split from illumination.md 2026-11-10, text unchanged but for typeset
  formulas and tables.

  TEACHES: the marked point worked (N·L 0.988, R·V 0.879, 0.021, Blinn 0.969 and 0.387, the sum per channel),
  the numbers HW5's phong checks; normals under a non-uniform scale and the inverse transpose; the
  normalized Phong lobe; per-vertex against per-pixel lighting; ambient occlusion; falloff by
  the numbers; the spot cone's smoothstep worked; the cost of many lights (forward, deferred, tiled); area
  lights against point lights.
  NEEDS:   illumination.md, mounted before it.
  FIGURES: ../../textbook/figures/ill-ao.svg, ill-area-light.svg.
  NUMBERS: textbook/figures/numbers-surfaces.json (ill.*).

  reveal.js: FLAT; notes follow "Note:". Display math is a raw <div class="tex"> block typeset by
  MathJax (lib/deck-math.js); inline math is a code span written `$...$`.
-->

### Supplement: local illumination, further

<small>(~12 min, time permitting) · reading: <a href="../../textbook/illumination.html">Local Illumination</a>, Sections 3, 4 and 7 to 10</small>


---

### The marked point, worked

<small>the numbers HW5's phong checks</small>


---

## Our worked point: a marked spot on a sphere

The illumination demo lights a sphere of radius **1.2**, centered at the origin, and marks **one** point where it shows the live numbers. The marked point sits where the normal is `N = normalize(1, 1, 1)`:

<div class="tex" style="font-size:0.74em" role="img" aria-label="N = normalize(1, 1, 1) = (0.577, 0.577, 0.577), the surface normal
point = 1.2 · N = (0.693, 0.693, 0.693), on the sphere">
\[ \begin{aligned} N &= \operatorname{normalize}(1, 1, 1) = (0.577,\ 0.577,\ 0.577) && \text{the surface normal} \\ \text{point} &= 1.2\, N = (0.693,\ 0.693,\ 0.693) && \text{on the sphere} \end{aligned} \]
</div>

For a sphere centered at the origin, the outward **normal at any point is just the normalized point**: so N does not depend on the radius. The next two slides light this point with the demo's default light.


---

## Step 1: the light and L

The demo's **default** light orbits at radius **3**, at azimuth **45°** and elevation **30°** (the same cos/sin orbit formula as the viewing topic's camera). That puts it at:

<div class="tex" style="font-size:0.74em" role="img" aria-label="lightPos = 3·(cos30°·sin45°, sin30°, cos30°·cos45°) = 3·(0.6124, 0.5000, 0.6124) = (1.837, 1.500, 1.837)
L = normalize(lightPos − point) = normalize(1.144, 0.807, 1.144) = (0.633, 0.446, 0.633)">
\[ \begin{aligned} \text{lightPos} &= 3\,(\cos 30^\circ \sin 45^\circ,\ \sin 30^\circ,\ \cos 30^\circ \cos 45^\circ) \\ &= 3\,(0.6124,\ 0.5000,\ 0.6124) = (1.837,\ 1.500,\ 1.837) \\[6pt] L &= \operatorname{normalize}(\text{lightPos} - \text{point}) \\ &= \operatorname{normalize}(1.144,\ 0.807,\ 1.144) = (0.633,\ 0.446,\ 0.633) \end{aligned} \]
</div>

**L** points from the marked point **toward** the light: subtract the point from the light position, then normalize to unit length.


---

## Step 2: N·L, the diffuse number

Now dot the normal with the light direction:

<div class="tex" style="font-size:0.74em" role="img" aria-label="N · L = (0.577)(0.633) + (0.577)(0.446) + (0.577)(0.633) = 0.577 · (0.633 + 0.446 + 0.633) = 0.577 · 1.712 = 0.988
diffuse = max(0, N·L) = 0.988">
\[ \begin{aligned} N \cdot L &= (0.577)(0.633) + (0.577)(0.446) + (0.577)(0.633) \\ &= 0.577 \cdot (0.633 + 0.446 + 0.633) = 0.577 \cdot 1.712 = 0.988 \\[6pt] \text{diffuse} &= \max(0,\ N \cdot L) = 0.988 \end{aligned} \]
</div>

The marked point faces **almost straight into** the light (`N·L` near 1, an angle of 8.8°), so it is **near full** diffuse brightness. The demo's panel reads the same **`0.988`** at the default light.


---

## Light behind: the clamp gives 0

Swing the light to the **far** side, azimuth 225°, elevation −30°, and the marked point now faces **away** from it:

<div class="tex" style="font-size:0.74em" role="img" aria-label="lightPos = (−1.837, −1.500, −1.837)
N · L = −0.998   (normal and light nearly opposite)
diffuse = max(0, −0.998) = 0">
\[ \begin{aligned} \text{lightPos} &= (-1.837,\ -1.500,\ -1.837) \\ N \cdot L &= -0.998 && \text{normal and light nearly opposite} \\ \text{diffuse} &= \max(0,\ -0.998) = 0 \end{aligned} \]
</div>

`N·L` is almost `−1`, so the clamp makes the diffuse term exactly **0**: the marked point is unlit, and the sphere's near side goes dark the instant the light passes behind it in the demo.


---

## Worked R and the highlight R·V

At the marked point, with `N·L = 0.988`, the default light and the camera at (3, 3, 6):

<div class="tex" style="font-size:0.74em" role="img" aria-label="R = 2(0.988)(0.577, 0.577, 0.577) − (0.633, 0.446, 0.633) = (0.508, 0.695, 0.508), the mirror direction
V = normalize(cameraPos − point), camera (3, 3, 6): (0.370, 0.370, 0.852), toward the eye
R · V = 0.879, how aligned mirror and eye are">
\[ \begin{aligned} R &= 2\,(0.988)\,(0.577,\ 0.577,\ 0.577) - (0.633,\ 0.446,\ 0.633) \\ &= (0.508,\ 0.695,\ 0.508) \\ V &= \operatorname{normalize}\big((3, 3, 6) - \text{point}\big) = (0.370,\ 0.370,\ 0.852) \\ R \cdot V &= 0.879 \end{aligned} \]
</div>

`R·V = 0.879`: the eye is **28.5°** off the mirror direction. As a cosine, 0.879 looks large; raised to the 30th power it is 0.021, so the marked point sits at the **edge** of the highlight. The panel reads exactly **`0.879`**.


---

## Blinn at the marked point

<div class="tex" style="font-size:0.74em" role="img" aria-label="H·N = 0.969;  Blinn 0.969^30 = 0.387 against Phong 0.879^30 = 0.021
the same highlight as Phong: 0.969^s = 0.021  →  s = ln 0.0208 / ln 0.9689 ≈ 122  (≈ 4 × 30)">
\[ \begin{aligned} \text{Blinn, } H \cdot N = 0.969:\quad & 0.969^{30} = 0.387 \\ \text{Phong, } R \cdot V = 0.879:\quad & 0.879^{30} = 0.021 \\ \text{Blinn matching Phong:}\quad & 0.969^{s} = 0.021 \;\Rightarrow\; s = \frac{\ln 0.0208}{\ln 0.9689} \approx 122 \approx 4 \times 30 \end{aligned} \]
</div>

H from the unit L = (0.633, 0.446, 0.633) and V = (0.370, 0.370, 0.852): `$H = \operatorname{normalize}(1.003,\ 0.816,\ 1.485)$`. HW5's `phong` checks both: specular 0.0208 and Blinn 0.3873.


---

## The same sum, in color

The terms are **per channel**: a red plastic sphere at the marked point, `$k_a = 0.12$`, `$k_d = (0.86, 0.36, 0.30)$`, `$k_s = 0.5$` (white), `N·L = 0.988`, `(R·V)^30 = 0.021`:

| term | computed as | R | G | B |
| ---- | ----------- | - | - | - |
| ambient | 0.12 × kd | 0.103 | 0.043 | 0.036 |
| diffuse | kd × 0.988 | 0.850 | 0.356 | 0.297 |
| specular | 0.5 × 0.021 | 0.010 | 0.010 | 0.010 |
| **sum** | | **0.964** | **0.409** | **0.343** |

The highlight is **white** because ks is white: plastic reflects the light's color at the surface. A metal's highlight takes the metal's color.


---

## Scaling a model bends its normals

Stretch a sphere into an ellipsoid with the model matrix, `$M = \operatorname{diag}(2, 1)$`. The **positions** land where they should. The **normals** stored with the mesh were perpendicular to the sphere; pushed through the same `M`, they are no longer perpendicular to the ellipsoid:

<img src="../../textbook/figures/ill-normal-transform.svg" class="media-shot" style="max-height: 230px;" alt="A unit circle scaled 2 times in x becomes an ellipse. At the point that was at 45 degrees: the gray tangent of the ellipse, the red normal pushed through M, which leans off the surface, and the green inverse-transpose normal, perpendicular to the tangent.">

At the point that was at 45°, the pushed normal (red) is **36.9°** off the true one (green). Every `N·L` there uses the wrong direction, and the ellipsoid shades like a different shape.


---

## The fix: the inverse transpose

A **tangent** lies in the surface, so it moves like the positions: `$t' = M\,t$`. The new normal must stay perpendicular to every new tangent, and `$(M^{-1})^{\mathsf T} n$` does:

<div class="tex" role="img" aria-label="n' = (M⁻¹)ᵀ n:   n'ᵀ t' = nᵀ M⁻¹ M t = nᵀ t = 0   for every tangent t">
\[ n' = (M^{-1})^{\mathsf T} n: \qquad n'^{\mathsf T}\, t' = n^{\mathsf T} M^{-1} M\, t = n^{\mathsf T}\, t = 0 \]
</div>

- a **rotation** has `$(M^{-1})^{\mathsf T} = M$`; a **uniform** scale changes only the length: both are fixed by renormalizing
- only **non-uniform** scale and shear need the inverse transpose, so the bug hides until a model is squashed
- engines compute this **normal matrix** once per object (three.js's `normalMatrix`, Unity's `UnityObjectToWorldNormal`), then renormalize


---

## Energy: a shininess slider should not change brightness

Raising s narrows the lobe, and a narrow lobe also **reflects less total light**. The normalized Phong lobe fixes it:

<div class="tex" style="font-size:0.74em" role="img" aria-label="normalized specular = (s + 2) / (2π) · (R·V)^s;  s = 30: factor 5.093;  s = 128: factor 20.69">
\[ \text{normalized specular} = \frac{s + 2}{2\pi}\,(R \cdot V)^s \qquad s = 30:\ 5.093 \qquad s = 128:\ 20.69 \]
</div>

With the factor, a sharper highlight is **brighter and smaller** with the same total, the way a polished surface looks.


---

## Per vertex or per pixel?

| shading | what is interpolated | lighting evaluations, the bunny |
| ------- | -------------------- | ------------------------------- |
| Gouraud: light each vertex | colors | 35,947 (every vertex) |
| Phong: light each pixel | normals | about 250,000 (on screen) |

Per pixel costs **7 times** more here and is universal now. Per-vertex lighting **misses highlights** that fall between vertices: a highlight smaller than a triangle is either smeared or lost entirely.


---

## Ambient occlusion: the sky a point sees

The ambient constant lights every point the same, so an object on a floor looks **pasted on**. Fill light comes from all around; a point in a crease or under an object gets **less**:

<img src="../../textbook/figures/illd-ao-rays.svg" class="media-shot" style="max-height: 200px;" alt="Side view of a unit sphere resting on a floor. From three floor points, at 0.5, 1.5 and 3 radii from the contact, a fan of rays over the upper hemisphere: green where the direction escapes, red where the sphere blocks it. The point at 0.5 is mostly blocked toward the sphere (AO 0.28), the point at 1.5 partly (AO 0.83), the point at 3 only near the horizon (AO 0.97).">

<div class="tex" role="img" aria-label="AO(p) = (1/π) ∫ over the hemisphere of visible(ω) cos θ dω,  between 0 (buried) and 1 (open sky);   ambient = k_a · k_d · AO(p)">
\[ \text{AO}(p) = \frac{1}{\pi} \int_{\text{hemisphere}} \text{visible}(\omega)\, \cos\theta \; d\omega \qquad \text{ambient} = k_a\, k_d\, \text{AO}(p) \]
</div>

AO: the cosine-weighted fraction of rays over the hemisphere that **escape**; 1 in the open, 0 buried.


---

## Contact shadows from ambient occlusion

<img src="../../textbook/figures/ill-ao.svg" class="media-shot" style="max-height: 165px;" alt="AO on the floor plotted against the distance from the contact point of a resting unit sphere: near 0 at the contact, rising through 0.65 at one radius to nearly 1 by four radii.">

The floor beside a unit sphere resting on it, 4,000 rays per point:

| distance from contact (radii) | 0.05 | 0.25 | 0.5 | 1 | 2 | 4 |
| ----------------------------- | ---- | ---- | --- | - | - | - |
| AO | 0.003 | 0.088 | 0.282 | 0.647 | 0.908 | 0.988 |

- under the contact the sphere hides almost the whole sky: the dark ring that **seats** the sphere on the floor
- a point in a 90° crease sees exactly **half** its hemisphere, AO 0.5: the wall hides the half on its side
- computed once for static objects (baked into a texture), or each frame from the depth buffer (screen-space AO)


---

## Falloff, by the numbers

| distance d | inverse square 1/d² | a polynomial falloff |
| ---------- | ------------------- | -------------------- |
| 1 | 1 | 0.891 |
| 2 | 0.25 | 0.765 |
| 4 | 0.0625 | 0.534 |
| 10 | 0.01 | 0.196 |

The physical law drops **100 times** from 1 to 10; the tuned polynomial drops 4.5 times. Artists liked the second because rooms stayed lit; physically based engines use the first, with **real** light intensities and exposure.


---

## The spot cone, worked at 20°

Inner angle 15° (full strength), outer 25° (zero), the shader's soft edge between:

<div class="tex" style="font-size:0.74em" role="img" aria-label="α = 20°:  n = 15 − 20 = −5,  range = 25 − 15 = 10,  x = n² / range² = 25 / 100 = 0.25
smoothstep(1, 0, x):  t = (x − 1) / (0 − 1) = 0.75,  S = 3t² − 2t³ = 1.688 − 0.844 = 0.844">
\[ \begin{aligned} \alpha = 20^\circ:\quad n &= 15 - 20 = -5,\quad \text{range} = 25 - 15 = 10 \\ x &= \frac{n^2}{\text{range}^2} = \frac{25}{100} = 0.25 \\ \text{smoothstep}(1, 0, x):\quad t &= \frac{x - 1}{0 - 1} = 0.75 \\ S &= 3t^2 - 2t^3 = 1.688 - 0.844 = 0.844 \end{aligned} \]
</div>

| angle | 10° | 15° | 18° | 20° | 22° | 25° |
| ----- | --- | --- | --- | --- | --- | --- |
| strength | 1 | 1 | 0.977 | **0.844** | 0.515 | 0 |


---

## Many lights, the cost

A 1080p frame, overdraw 3, 32 lights:

| method | light evaluations | |
| ------ | ----------------- | - |
| forward: every light at every fragment | 199,065,600 | |
| deferred: every light at every pixel, once | 66,355,200 | G-buffer 41.5 MB |
| tiled deferred, 16×16 tiles, about 6 lights reach each tile | 12,441,600 | 16 times fewer than forward |


---

## Area lights: a point fails up close

<img src="../../textbook/figures/ill-area-light.svg" class="media-shot" style="max-height: 200px;" alt="irradiance under a disc light of radius 0.5 as a function of height, compared with a point light of the same power">

A disc light of radius 0.5 and radiance 1, straight above a point at height h, against a point light of the same power:

| h | 0.25 | 0.5 | 1 | 2 | 4 |
| - | ---- | --- | - | - | - |
| disc (exact) | 2.513 | 1.571 | 0.628 | 0.185 | 0.048 |
| point | 12.566 | 3.142 | 0.785 | 0.196 | 0.049 |
| point / disc | **5.0** | 2.0 | 1.25 | 1.06 | 1.02 |
