<!--
  CSS 551 · L06, Tuesday October 20, 2026 (week 4, online): Meshes.
  Mounts, in order: L06-open.md, ../../topics/meshes.md (~50 min, 35 slides),
  ../../topics/texture-coordinates.md (~45 min, 33 slides), L06-discuss.md
  (discussion and wrap).

  Minute plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  opening                                     2 min
    0:02  meshes (topic)                             48 min
    0:50  texture coordinates (topic)                45 min
    1:35  discussion: four questions                 22 min
    1:57  wrap                                        3 min
    2:00  end
  Demos: mesh-grid (n,lift), uv-placement (offU,tile), fur (lightAz). Numbers:
  numbers-surfaces.json mesh.* and tex.*, textbook/meshes.html Sections 2, 5, 12 and
  textbook/texture-mapping.html Section 2, recomputed by node for the discussion.

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math; never two "_" on one
  markdown line outside a code fence; no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 6: Meshes**

*Triangles, normals, and the texture coordinates they carry.*

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Meshes**: two arrays, a winding rule, the 2×2 grid by hand and live
- **Structure**: half-edges, Euler's formula, valence
- **Normals**: cross products, averaging, hard edges that split vertices
- **Processing**: sweeps, edge collapse, levels of detail, smoothing, marching cubes, OBJ and glTF
- **Texture coordinates**: UVs, wrap modes, projections, seams and atlases, the placement matrix
- **Fur and hair**: texels, shells and fins, tangent lighting, strands
- **Discussion**: four questions

Reading: [Polygonal Meshes](../../textbook/meshes.html) and [Texture Mapping](../../textbook/texture-mapping.html), Sections 1 to 4.

