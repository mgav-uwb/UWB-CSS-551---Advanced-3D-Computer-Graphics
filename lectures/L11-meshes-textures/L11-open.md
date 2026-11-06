<!--
  CSS 551 · L11, Thursday November 5, 2026 (week 6, in person): Meshes and texture coordinates.
  Mounts, in order: L11-open.md, ../../topics/meshes.md, ../../topics/texture-coordinates.md,
  L11-discuss.md (the wrap), then, time permitting, ../../topics/meshes-supplement.md and
  ../../topics/texture-coordinates-supplement.md.
  Re-sequenced 2026-10-25: built as L06 (Tuesday October 20), which went to a vectors and rotation
  recap instead; the deck waited in L06-meshes/ and is now Lecture 11, a Thursday in person.
  EDIT 2026-11-05 (Marcel: "polish L11"): formulas typeset and drawings generated, as in L05 to L09 and
  L14; slides no homework or quiz needs moved to the two supplements.

  Minute plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  opening                                     2 min
    0:02  meshes (topic)                             38 min
    0:40  texture coordinates (topic)                43 min
    1:23  wrap                                        3 min
    1:26  questions (HW4, the topics); supplements   34 min
    2:00  end
  Demos: mesh-view (wire,spin), mesh-grid (n,lift), simplify-compare (tris,wire), uv-placement (offU,tile),
  fur (lightAz); lod (level,dist) in the supplement. Numbers: numbers-surfaces.json mesh.* and tex.*,
  textbook/meshes.html Sections 2, 5, 12 and textbook/texture-mapping.html Section 2, recomputed by node.

  reveal.js: FLAT deck; notes follow "Note:"; formulas typeset (lib/deck-math.js); never two "_" on one
  markdown line outside a code fence or code span; no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 11: Meshes and Texture Coordinates**

> For a closed triangle mesh without holes, Euler's formula `$V - E + F = 2$` implies about twice as many triangles as vertices: the bunny's 69,451 triangles on the 34,834 vertices they use come close.

<small>course text, Polygonal Meshes; computed</small>


<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **Meshes**: two arrays, a winding rule, the 2×2 grid by hand and live
- **Structure**: half-edges, Euler's formula, valence
- **Normals**: cross products, averaging, hard edges that split vertices
- **Processing**: sweeps, edge collapse and the quadric error, OBJ files
- **Texture coordinates**: UVs, wrap modes, projections, seams and atlases, the placement matrix
- **Fur and hair**: texels, shells and fins, tangent lighting, strands

Reading: [Polygonal Meshes](../../textbook/meshes.html), [Texture Mapping](../../textbook/texture-mapping.html), Sections 1 to 4, and [Animation](../../textbook/animation.html), Section 14 (hair and fur).

