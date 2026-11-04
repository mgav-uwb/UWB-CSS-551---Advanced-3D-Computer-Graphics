<!--
  CSS 551 · Lecture 12 (Tuesday November 10, online): Illumination and texture sampling.
  Mounts, in order: L12-open.md, ../../topics/illumination.md (~60 min, 44 slides),
  ../../topics/texture-sampling.md (~18 min, 15 slides), L12-discuss.md (HW5
  walk-through, wrap).
  Re-sequenced 2026-10-25 (was Lecture 11, Thursday November 5, opened by paper Quiz 4): now a
  Tuesday online meeting with no quiz; the exam-review minutes went to questions and buffer.

  Minute plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  opening                                     2 min
    0:02  illumination (topic)                       60 min
    1:02  texture sampling (topic)                   18 min
    1:20  HW5 walk-through                            8 min
    1:28  wrap                                        2 min
    1:30  questions, HW4 and HW5 help; buffer        30 min
    2:00  end
  CUT 2026-10-08: the two discussion questions (L12-discuss.md).
  Demos: illumination (lightAz,shine), bump-map (bump,lightAz). Numbers:
  numbers-surfaces.json ill.* and tex.*, numbers-systems.json aa.mip.

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math; never two "_" on one
  markdown line outside a code fence; no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 12: Illumination and Texture Sampling**

> Jim Blinn introduced bump mapping in 1978, two years after he and Martin Newell introduced environment mapping.

<small>Blinn, SIGGRAPH 1978; Blinn and Newell, CACM 1976</small>


<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Diffuse**: light, normal, eye; Lambert's cosine on the marked point (N·L = 0.988)
- **Specular and ambient**: R·V to a power, Blinn's half vector, energy, ambient occlusion
- **Light sources**: directional, point, spot; falloff; many lights; area lights; tone mapping
- **Color**: shade in linear light, not in sRGB codes
- **Texture sampling**: bilinear, mipmaps, compression, bump and normal maps, cube and shadow maps
- the **HW5** walk-through

Reading: [Local Illumination](../../textbook/illumination.html); [Texture Mapping](../../textbook/texture-mapping.html), Sections 5 to 11; for the Unity track, [Unity Shaders](../../textbook/unity-shaders.html).

