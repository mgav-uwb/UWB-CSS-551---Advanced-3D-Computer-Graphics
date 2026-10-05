<!--
  CSS 551 · Lecture 9, discussion (20 min: two peer-instruction questions, the
  HW4 walk-through) and the wrap. Answers only in the notes. Every number is
  computed by tools/gen-lecture-figures-c.mjs (l09_q1, l09_q2) or quoted from
  numbers-pipeline.json.
-->

### Discussion

<small>(~20 min)</small>


---

## Question 1: which value is interpolated?

A counter-clockwise triangle `v0 = (0, 0)`, `v1 = (4, 0)`, `v2 = (0, 4)`. The pixel center `p = (1.5, 0.5)`. A texture coordinate `u` is 0 at v0, **1 at v1**, 0 at v2. What `u` does the rasterizer give this pixel?

- **A.** 0.125
- **B.** 0.375
- **C.** 0.500
- **D.** 1.500


---

## Question 2: perspective-correct

An edge on the screen runs from A, at depth `w = 2` with `u = 0`, to B, at depth `w = 6` with `u = 1`. At the **screen** midpoint of the edge, what `u` does a correct rasterizer use?

- **A.** 0.250
- **B.** 0.333
- **C.** 0.500
- **D.** 0.750


---

## HW4: viewing and rasterization

Out tonight, due **Wednesday November 4, 11:59 PM**. Unity or WebGL, from the skeleton.

- **`viewMatrix`, `perspectiveMatrix`**, every entry checked at the view-matrix demo's camera: V's translation (0, −0.4698, −7.171); P(45°, 16:9, 1, 8) third row (0, 0, −1.2857, −2.2857)
- **`worldToPixel`**: the cube corner (0.5, 0.5, 0.5) lands at pixel **(702.505, 320.864)**, NDC depth **0.924**
- **`edge`, `barycentric`, `rasterize`**: pixel (5, 6) weights **(0.3052, 0.259, 0.4358)**; **28** covered pixels at 12 × 12, **846** at 64 × 64; use the page's six-decimal vertices
- **off limits**: Unity `Matrix4x4.LookAt`, `Perspective`, `WorldToScreenPoint`; three.js `lookAt`, `makePerspective`, `Vector3.project`: the answer key, not the tool

The full specification and the rubric numbers: [HW4](../../homework/hw04/index.html).


---

## Wrap

- Inside is **three edge functions ≥ 0**; the same three numbers, divided by the twice-area, are the **barycentric weights**; attributes are interpolated in **1/w**
- One sample per pixel **aliases**: a frequency above Nyquist returns as `|f − k·fs|`. Supersample, prefilter, or accumulate over time
- **Due**: HW3 was due yesterday. **Out**: HW4, due Wednesday November 4

