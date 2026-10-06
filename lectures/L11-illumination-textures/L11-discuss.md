<!--
  CSS 551 · Lecture 11, discussion (10 min: two peer-instruction questions), the
  HW5 walk-through and the wrap. Answers only in the notes. Numbers computed by node:
    Q1  light at (3, 0, 0): L = normalize(2.307, −0.693, −0.693) = (0.920, −0.276, −0.276);
        N·L = 0.212 (illumination chapter, exercise; gen-lecture-figures-c.mjs l11_q1).
    Q2  1024 × 0.004 = 4.096, 1024 × 0.003 = 3.072; ρ = 4.096, λ = log₂ 4.096 = 2.034.
    HW5 numbers from homework/hw05/index.html (lib/skeletons/expected.js).
-->

### Discussion

<small>(~20 min, with the HW5 walk-through)</small>


---

## Question 1: the light moves

The demo's sphere (r = 1.2) and marked point `P = (0.693, 0.693, 0.693)`, `N = (0.577, 0.577, 0.577)`. The point light moves to **azimuth 90°, elevation 0°** on its radius-3 orbit, i.e. to `(3, 0, 0)`. The diffuse term `max(0, N·L)` is now:

- **A.** 0.212
- **B.** 0.531
- **C.** 0.577
- **D.** 0.988


---

## Question 2: which mip level?

A 1024 × 1024 texture. Across one pixel, `u` changes by **0.004** in x and `v` by **0.003** in y (the other derivatives are 0). Which level does a trilinear sampler read **most** from?

- **A.** level 0
- **B.** level 2
- **C.** level 4
- **D.** level 10


---

## HW5: surfaces

Out tonight, due **Wednesday November 11, 11:59 PM**. Unity or WebGL, from the skeleton.

- **`gridMesh`, `faceNormal`, `vertexNormals`**: n = 2, lift 0.4: eight triples beginning `(0, 3, 1), (1, 3, 4)`; face normal of triangle 1 **(−0.6, 2.25, −0.6)** unnormalized; vertex 1 **(−0.0872, 0.9808, −0.1744)**
- **`uvPlacement`**: defaults (tile 2) **[2, 0, −0.5 / 0, 2, −0.5]**; offset 0.25, 45°, tile 2 **[1.4142, 1.4142, −0.6642 / −1.4142, 1.4142, 0.5]**
- **`phong`** at the marked point: **N·L = 0.9883**, **R·V = 0.8788**, specular **0.0208**; **H·N = 0.9689**, Blinn **0.3873** (s = 30); then **the fragment shader** that lights a sphere

The full specification and the rubric numbers: [HW5](../../homework/hw05/index.html).


---

## HW5: implement and replace

Build from dot, cross, normalize, sin, cos and pow; use the engine only to check.

| Track | Off limits in the submission |
| --- | --- |
| Unity | `Mesh.RecalculateNormals`; the built-in Plane; `Material.mainTextureScale` and `mainTextureOffset`; the Standard shader |
| WebGL | xform.js `uvMat3`; `PlaneGeometry`, `computeVertexNormals`, `Matrix3.setUvTransform`; texture `repeat`, `offset`, `rotation`; three.js lighting materials |

Graded on the page's inputs and on a hidden set; the shader is graded by eye.


---

## Wrap

A lit point is three dot products per light, `max(0, N·L)`, `max(0, R·V)^s` and a constant ambient, summed over the lights and tone-mapped for display. A texture lookup filters: bilinear when magnified, the mipmap level log₂ of the footprint when minified.

- **Read**: [Local Illumination](../../textbook/illumination.html) · [Texture Mapping](../../textbook/texture-mapping.html), Sections 5 to 11
- **Out**: HW5, due Wednesday November 11, 11:59 PM
- **Midterm**: Thursday November 12, the first 75 minutes: Lectures 1 to 11 and HW5

