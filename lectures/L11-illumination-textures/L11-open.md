<!--
  CSS 551 · Lecture 11 (Thursday November 5, in person): Surface appearance,
  illumination and texture mapping.
  Mounts, in order: L11-open.md, ../../topics/illumination.md (~60 min, 44 slides),
  ../../topics/texture-sampling.md (~18 min, 15 slides), L11-discuss.md (discussion,
  HW5 walk-through, wrap). Quiz 4, on paper, comes first.

  Minute plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Quiz 4 (paper, 20 min): Lecture 9 (rasterization, antialiasing),
          Lecture 10 (animation, physics), HW4
    0:20  opening                                     2 min
    0:22  illumination (topic)                       60 min
    1:22  texture sampling (topic)                   18 min
    1:40  discussion: two questions                  10 min
    1:50  HW5 walk-through                            8 min
    1:58  wrap                                        2 min
    2:00  end
  Demos: illumination (lightAz,shine), bump-map (bump,lightAz). Numbers:
  numbers-surfaces.json ill.* and tex.*, numbers-systems.json aa.mip, and
  tools/gen-lecture-figures-c.mjs (l11_q1) for the discussion answers.

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math; never two "_" on one
  markdown line outside a code fence; no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 11: Surface Appearance**

*Illumination and texture mapping.*

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Quiz 4

**Laptops and phones away.** A pencil and the quiz sheet, nothing else.

- **20 minutes**, 5:45 to 6:05 PM: 8 multiple-choice questions, 5 points each
- **Covers**: Lecture 9, rasterization and antialiasing (Thursday, October 29); Lecture 10, animation and physics (Tuesday, November 3); HW4
- Mark one letter per question in the grid on the first page; only the grid is graded


---

## Tonight

- **Diffuse**: light, normal, eye; Lambert's cosine on the marked point (N·L = 0.988)
- **Specular and ambient**: R·V to a power, Blinn's half vector, energy, ambient occlusion
- **Light sources**: directional, point, spot; falloff; many lights; area lights; tone mapping
- **Color**: shade in linear light, not in sRGB codes
- **Texture sampling**: bilinear, mipmaps, compression, bump and normal maps, cube and shadow maps
- **Discussion**, then the **HW5** walk-through

Reading: [Local Illumination](../../textbook/illumination.html); [Texture Mapping](../../textbook/texture-mapping.html), Sections 5 to 11; for the Unity track, [Unity Shaders](../../textbook/unity-shaders.html).

