<!--
  CSS 551 · Lecture 13, the HW6 walk-through and the wrap. No discussion slot
  tonight: the midterm used the first 75 minutes. Numbers from
  numbers-motion.json rt.camera, rt.whittedRender, rt.cornell.
-->

## HW6: a ray tracer

Out tonight, due **Wednesday November 18, 11:59 PM**. Unity (C# writing a `Texture2D`) or WebGL, from the skeleton.

- **`cameraRay`, `hitSphere`, `hitTriangle`, `reflect`**: pixel **(89, 62)** of 150 × 150 at the illumination demo's camera gives `d = (−0.372, −0.3696, −0.8515)`; the r = 1.2 sphere is hit at **t = 6.2281**; Möller–Trumbore gives **(t, u, v) = (1, 0.25, 0.25)**
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

- The rendering equation is an integral; **sample it**: `(1/N) Σ f/p`, unbiased, error falling as **1/√N**
- A path tracer is a **random walk** from the eye, one bounce per hit, ended by **Russian roulette**; color bleeding, soft shadows and a lit ceiling appear without being named
- **Out**: HW6, due Wednesday November 18. No quiz this week

