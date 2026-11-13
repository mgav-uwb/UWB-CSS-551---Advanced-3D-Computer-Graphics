<!--
  CSS 551 · Lecture 13, the HW6 walk-through and the wrap (~5 min); the light-transport supplement
  follows, time permitting. Numbers from numbers-motion.json rt.camera, rt.whittedRender, rt.cornell.
  Re-sequenced 2026-10-25: merged from the Lecture 12 wrap and the Lecture 13 HW6 walk-through and wrap
  (../archive/L13-path-tracing-pre-merge-2026-10-25/); HW6 out Tuesday November 17 (moved 2026-11-09 from
  November 12, one release a week), due Wednesday November 25; the walk-through stays here.
  EDIT 2026-11-12: "Out tonight" corrected to Tuesday November 17; the camera is the slides' (HW6's), not the
  illumination demo's; the wrap names the three supplements that follow it.
-->

### HW6, and the wrap

<small>(~5 min)</small>


---

## HW6: a ray tracer

Out **Tuesday November 17**, due **Wednesday November 25, 11:59 PM**. Unity (C# writing a `Texture2D`) or WebGL, from the skeleton.

- **`cameraRay`, `hitSphere`, `hitTriangle`, `reflect`**: pixel **(89, 62)** of 150 × 150 at the camera of the slides gives `d = (−0.372, −0.3696, −0.8515)`; the r = 1.2 sphere is hit at **t = 6.2281**; Möller–Trumbore gives **(t, u, v) = (1, 0.25, 0.25)**
- **`trace`**: a shadow ray toward one point light, and one mirror bounce (depth up to 3)
- **the Cornell box, lit directly**, 96 × 72: lit floor **0.6933**, floor in shadow **0.08**, red wall **(0.5834, 0.1167, 0.0933)**, and the red wall seen in the mirror sphere **(0.456, 0.0912, 0.073)**

The full specification and the rubric numbers: [HW6](../../homework/hw06/index.html).


---

## HW6: implement and replace

Build from dot, cross, normalize, length, sqrt and tan; use the engine only to check.

| Track | Off limits in the submission |
| --- | --- |
| Unity | `Physics.Raycast` and every collider; `Ray`, `Plane` and `Bounds` helpers; `Vector3.Reflect`; `Camera.ScreenPointToRay`, `ViewportPointToRay` |
| WebGL | `THREE.Raycaster`; `Ray.intersectSphere`, `intersectTriangle`, `intersectBox`; `Vector3.reflect`; anything that renders the scene for you |

Graded on the page's inputs and on a hidden set: a check scores only when both match.


---

## Wrap

- Light at a point obeys **Lo = Le + ∫ f · Li · cos**; the BRDF is the material, and a matte one is ρ/π
- A ray tracer **searches** per pixel: three intersection routines, shadow and secondary rays, and a **BVH** to make the search logarithmic
- A path tracer **samples**: `(1/N) Σ f/p`, a random walk from the eye ended by **Russian roulette**, error falling as **1/√N**
- **Due**: HW5, Wednesday November 18, 11:59 PM. HW6 goes out Tuesday November 17, due Wednesday November 25
- **Quiz 5**, on Canvas: tonight 8 PM to Sunday November 15, 11:59 PM; Lectures 11 and 12 and HW4
- The slides after this one (ray tracing, path tracing and light transport, further) are covered time permitting, or reading
