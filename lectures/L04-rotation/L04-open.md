<!--
  CSS 551 · L04, Tuesday October 13, 2026 (week 3, online): Rotation.
  Mounted by index.html: L04-open.md, ../../topics/vector-geometry.md (~30 min),
  ../../topics/rotation-quaternions.md (~78 min), L04-discuss.md.
  Resequenced 2026-10-05: the vector geometry that leads into rotation (frames, lines, planes,
  barycentric weights, precision), then rotation; the vector basics moved to L03.
  Improvement pass 2026-10-13: every new term defined where it first appears, a figure for every
  concept, and a live demo for every main concept (eight demo slides: vec-geometry, rotation-ways
  twice, axis-angle twice, spin-step, rot-compose, quat-slerp, euler-gimbal); 75 slides became 86.

  Plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Opening                                          2 min
    0:02  Vector geometry: frames, Gram-Schmidt, lines,
          skew lines, planes, projection, reflection,
          rays, barycentric, the demo, precision (topic)  30 min
    0:32  Rotation: where the axes land, axis-angle and
          Rodrigues, the trace, angular velocity,
          quaternions and the half angle, composition,
          the shortest arc, slerp, Euler angles, gimbals
          and the lock, five definitions (topic)          78 min
    1:50  Wrap                                             5 min
    1:55  HW1 help and open questions                      5 min
  The demo slides are where the time can flex: skipping the two rotation-ways slides and the
  spin-step slide returns about 6 minutes to HW1 help.
  CUT 2026-10-08: the four discussion questions (L04-discuss.md keeps the wrap).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math; never two "_" on one
  markdown line outside a code fence; no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 4: Rotation**

> On 16 October 1843, William Rowan Hamilton carved i² = j² = k² = ijk = −1 into Broom Bridge in Dublin. The carving is gone; a plaque marks the spot, and mathematicians walk there every year.

<small>Hamilton, letter to his son Archibald, 1865; plaque at Broom Bridge, Dublin</small>

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Frames**: two vectors to an orthonormal frame, coordinates by dots, Gram-Schmidt
- **Lines and planes**: nearest points, skew lines, signed distance, which side, projection onto a plane, reflection, rays against planes
- **Triangles**: barycentric weights, inside or out, in both tracks
- **Precision**: arccos near 0° and past 1, an angle that never fails, cancellation
- **Rotation**: where the axes land; axis-angle and Rodrigues; angular velocity; quaternions and the half angle, composition, the shortest arc, slerp, the double cover, drift; yaw, pitch, roll, gimbals and gimbal lock; one rotation, five definitions
- **Wrap**, then HW1 help and open questions

Reading: [Vectors](../../textbook/vectors.html), Sections 4 to 8 · [Rotation](../../textbook/rotation.html), Sections 1 to 8.

