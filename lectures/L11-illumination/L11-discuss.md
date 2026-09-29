<!--
  CSS 551 · Lecture 11, discussion (20 min: two peer-instruction questions, the
  HW5 walk-through) and the wrap. Answers only in the notes. Numbers from
  tools/gen-lecture-figures-c.mjs (l11_q1, l11_q2) and numbers-surfaces.json.
-->

### Discussion

<small>(~20 min, then the quiz)</small>


---

## Question 1: the light moves

The demo's sphere (r = 1.2) and marked point `P = (0.693, 0.693, 0.693)`, `N = (0.577, 0.577, 0.577)`. The point light moves to **azimuth 90°, elevation 0°** on its radius-3 orbit, i.e. to `(3, 0, 0)`. The diffuse term `max(0, N·L)` is now:

- **A.** 0.212
- **B.** 0.531
- **C.** 0.577
- **D.** 0.988


---

## Question 2: the normal under a scale

A circle's point `(0.707, 0.707)` has normal `n = (0.707, 0.707)`. The model is scaled by **M = diag(2, 1)**. The correct unit normal of the stretched shape at the moved point is:

- **A.** (0.707, 0.707)
- **B.** (0.894, 0.447)
- **C.** (0.354, 0.707)
- **D.** (0.447, 0.894)


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

- A lit point is **three dot products per light**: `max(0, N·L)`, `max(0, R·V)^s`, plus a constant ambient; normals move by `(M⁻¹)ᵀ`
- The sum is unbounded; **tone-map** it (Reinhard `x/(1 + x)`) before display
- **Out**: HW5, due Wednesday November 11. **Midterm**: Thursday November 12, first 75 minutes, weeks 1–6
- **Now**: Quiz 5, 20 minutes, on paper: meshes, texture mapping, illumination, and HW4

