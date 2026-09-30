<!--
  CSS 551 · Lecture 10 (Tuesday November 3, online): Meshes and Texture Mapping.
  Mounts, in order: L10-open.md, ../../topics/meshes.md (~45 min, 31 slides),
  ../../topics/texture-mapping.md (~45 min, 33 slides), L10-discuss.md (discussion and wrap).

  Minute plan (120 min, Tue 5:45–7:45 PM synchronous online):
    0:00  opening                                     2 min
    0:02  meshes (topic)                             45 min
    0:47  texture mapping (topic)                    45 min
    1:32  discussion: four questions                 24 min
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

- **Meshes**: two arrays and a winding rule; the 2×2 grid by hand and live; half-edges, Euler's formula, valence; normals as cross products; a mesh swept from a profile; simplification by edge collapse and the quadric error; LOD distances; vertex-cache order; smoothing; marching cubes
- **Texture mapping**: UVs per vertex; wrap modes; the placement matrix, worked and live; bilinear filtering, mipmaps and the level from the footprint; compression; bump and normal maps; procedural textures; cube maps; shadow maps
- **Discussion**: four questions

Reading: [Polygonal Meshes](../../textbook/meshes.html) and [Texture Mapping](../../textbook/texture-mapping.html).

