<!--
  CSS 551 · Lecture 12 (Tuesday November 10, online): Illumination and texture sampling.
  Mounts, in order: L12-open.md, ../../topics/illumination.md (~56 min, 42 slides),
  ../../topics/texture-sampling.md (~20 min), L12-discuss.md (HW5 walk-through, wrap), then
  the supplements ../../topics/illumination-supplement.md and texture-sampling-supplement.md,
  time permitting (no homework or quiz needs them).
  Re-sequenced 2026-10-25 (was Lecture 11, Thursday November 5, opened by paper Quiz 4): now a
  Tuesday online meeting with no quiz; the exam-review minutes went to questions and buffer.

  Minute plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  opening                                     2 min
    0:02  illumination (topic)                       50 min
    0:52  texture sampling (topic)                   20 min
    1:12  HW5 walk-through                            8 min
    1:20  wrap                                        2 min
    1:22  questions, HW4 and HW5 help; supplements   38 min
    2:00  end
  CUT 2026-10-08: the two discussion questions (L12-discuss.md).
  EDIT 2026-11-10: polished to the topics/README.md contract (typeset formulas, the chapter's figures);
  local against global first; the terms one at a time (ambient, diffuse, specular), each with the illumination
  demo showing it alone, then all three; worked arithmetic and slides no quiz needs moved to the supplements.
  Demos: shading-lab (view:disk.ball,lock), illumination (terms:a, terms:d, terms:s, terms:ads,toggles), bump-map (bump,lightAz). Numbers:
  numbers-surfaces.json ill.* and tex.*, numbers-systems.json aa.mip.

  reveal.js: FLAT deck; notes follow "Note:"; display math typeset by lib/deck-math.js; never two
  "_" on one markdown line outside a code fence or code span; no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 12: Illumination and Texture Sampling**

> Jim Blinn introduced bump mapping in 1978, two years after he and Martin Newell introduced environment mapping.

<small>Blinn, SIGGRAPH 1978; Blinn and Newell, CACM 1976</small>


<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Local and global**: what a local model computes, and what it cannot show (cast shadows)
- **Ambient, diffuse, specular**, one at a time: no direction, the light's, the light's and the eye's
- **All three** together, per color channel; Blinn's half vector
- **Light sources**: directional, point, spot; falloff; many lights; tone mapping
- **Color**: shade in linear light, not in sRGB codes
- **Texture sampling**: bilinear, mipmaps, bump mapping, shadow maps
- the **HW5** walk-through

Reading: [Local Illumination](../../textbook/illumination.html); [Color](../../textbook/color.html), Sections 5 and 6; [Texture Mapping](../../textbook/texture-mapping.html), Sections 5 to 11; for the Unity track, [Unity Shaders](../../textbook/unity-shaders.html).

