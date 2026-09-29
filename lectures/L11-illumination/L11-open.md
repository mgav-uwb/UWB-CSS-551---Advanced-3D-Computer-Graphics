<!--
  CSS 551 · Lecture 11 (Thursday November 5, in person): Illumination.
  Mounts, in order: L11-open.md, ../../topics/illumination.md (~76 min),
  L11-discuss.md (discussion, HW5 walk-through, wrap). Then Quiz 5 on paper.

  Minute plan (120 min, Thu 5:45–7:45 PM in person):
    0:00  opening                                     2 min
    0:02  illumination (topic)                       76 min
    1:18  discussion: two questions                  12 min
    1:30  HW5 walk-through                            8 min
    1:38  wrap                                        2 min
    1:40  Quiz 5 (paper, 20 min): meshes, texture mapping, illumination, HW4
    2:00  end
  Demo: illumination (lightAz,shine). Numbers: numbers-surfaces.json ill.*, and
  tools/gen-lecture-figures-c.mjs (l11_q1, l11_q2) for the discussion answers.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 11: Illumination**

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **What you see**: light, normal, eye; the local model and what it leaves out
- **Diffuse**: Lambert's cosine, worked on the demo's marked point (N·L = 0.988); normals under a non-uniform scale
- **Specular and ambient**: the mirror vector, R·V to a power, Blinn's half vector
- **Light sources**: directional, point, spot; attenuation; many lights; tone mapping
- **Discussion**, the **HW5** walk-through, then **Quiz 5**

Reading: [Local Illumination](../../textbook/illumination.html); for the Unity track, [Unity Shaders](../../textbook/unity-shaders.html).

