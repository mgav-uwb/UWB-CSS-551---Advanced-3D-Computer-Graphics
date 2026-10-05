<!--
  CSS 551 · Lecture 11 (Thursday November 5, in person): Illumination.
  Mounts, in order: L11-open.md, ../../topics/illumination.md (~78 min, 56 slides),
  L11-discuss.md (discussion, HW5 walk-through, wrap). Quiz 4, on paper, comes first.

  Minute plan (120 min, Thu 5:45–7:45 PM in person):
    0:00  Quiz 4 (paper, 20 min): rasterization, antialiasing, meshes, texture mapping, HW4
    0:20  opening                                     2 min
    0:22  illumination (topic)                       78 min
    1:40  discussion: two questions                  10 min
    1:50  HW5 walk-through                            8 min
    1:58  wrap                                        2 min
    2:00  end
  Demo: illumination (lightAz,shine). Numbers: numbers-surfaces.json ill.*, and
  tools/gen-lecture-figures-c.mjs (l11_q1, l11_q2) for the discussion answers.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 11: Illumination**

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Quiz 4

**Laptops and phones away.** A pencil and the quiz sheet, nothing else.

- **20 minutes**, 5:45 to 6:05 PM: 8 multiple-choice questions, 5 points each
- **Covers**: Lecture 9, rasterization and antialiasing (Thursday, October 29); Lecture 10, meshes and texture mapping (Tuesday, November 3); HW4
- Mark one letter per question in the grid on the first page; only the grid is graded


---

## Tonight

- **What you see**: light, normal, eye; the three terms pictured; the local model and what it leaves out
- **Diffuse**: Lambert's cosine, worked on the demo's marked point (N·L = 0.988) in color; normals under a non-uniform scale
- **Specular and ambient**: the mirror vector, R·V to a power, Blinn's half vector and its exponent, energy, four models in eleven years, per vertex or per pixel; ambient occlusion, a sky in nine numbers, why π
- **Light sources**: directional, point, spot worked; falloff; many lights and their cost; area lights; tone mapping a real scene
- **Color in rendering**: shade in linear light; the sRGB curve; the pitfall of lighting codes
- **Discussion**, then the **HW5** walk-through

Reading: [Local Illumination](../../textbook/illumination.html); for the Unity track, [Unity Shaders](../../textbook/unity-shaders.html).

