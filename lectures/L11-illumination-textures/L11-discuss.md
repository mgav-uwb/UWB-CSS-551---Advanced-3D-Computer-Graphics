<!--
  CSS 551 · Lecture 11, the HW5 walk-through and the wrap (~10 min).
  CUT 2026-10-08: the two multiple-choice discussion questions (the light moves to
  (3, 0, 0); which mip level); the freed time goes to midterm questions and HW5 help.
    HW5 numbers from homework/hw05/index.html (lib/skeletons/expected.js).
-->

### HW5, and the wrap

<small>(~10 min)</small>


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

- **Read**: [Local Illumination](../../textbook/illumination.html); [Texture Mapping](../../textbook/texture-mapping.html), Sections 5 to 11; for the Unity track, [Unity Shaders](../../textbook/unity-shaders.html)
- **Out**: HW5, due Wednesday November 11, 11:59 PM
- **Midterm**: Thursday November 12, the first 75 minutes: Lectures 1 to 11 and HW5

