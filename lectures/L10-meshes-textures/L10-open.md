<!--
  CSS 551 · Lecture 10 (Tuesday November 3, online): Meshes and Texture Mapping.
  Mounts, in order: L10-open.md, ../../topics/meshes.md (~40 min),
  ../../topics/texture-mapping.md (~48 min), L10-discuss.md (discussion and wrap).

  Minute plan (120 min, Tue 5:45–7:45 PM synchronous online):
    0:00  opening                                     2 min
    0:02  meshes (topic)                             40 min
    0:42  texture mapping (topic)                    48 min
    1:30  discussion: four questions                 26 min
    1:56  wrap                                        4 min
    2:00  end
  Demos: mesh-grid (n,lift), uv-placement (offU,tile). Numbers:
  numbers-surfaces.json mesh.* and tex.*, numbers-systems.json aa.mip, and
  tools/gen-lecture-figures-c.mjs for the discussion answers.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 10: Meshes and Texture Mapping**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Meshes**: two arrays and a winding rule; the 2×2 grid by hand and live; face normals as cross products, averaged per vertex; a mesh swept from a profile
- **Texture mapping**: UVs per vertex; wrap modes; the placement matrix, worked and live; bilinear filtering, mipmaps and the level from the footprint; bump mapping
- **Discussion**: four questions

Reading: [Polygonal Meshes](../../textbook/meshes.html) and [Texture Mapping](../../textbook/texture-mapping.html).

