<!--
  CSS 551 · TOPIC DECK (supplement): Polygonal meshes, further (~14 min, 9 slides).
  Mounted after the wrap of a lecture that mounts meshes.md, and covered time permitting: no homework
  needs it, and every graded idea is in the topic. Its slides are the meshes topic's further material, in
  the topic's order; textbook/meshes.html Sections 5 and 7 to 12 cover them.

  TEACHES: Newell's polygon normal; editing as moving vertices; a level-of-detail ladder and when to
  switch; vertex-cache order; Laplacian and Taubin smoothing; marching cubes; glTF files.
  NEEDS:   meshes.md, mounted before it (the 2×2 grid, normals, edge collapse).
  DEMOS:   lod (level,dist).
  FIGURES: ../../textbook/figures/mesh-lod-ladder.svg, mesh-smoothing.svg, mesh-marching-cubes.svg
           (textbook generators).
  NUMBERS: textbook/figures/numbers-surfaces.json (mesh.lodDistance, mesh.cache, mesh.shrinkage, mesh.marching);
           Newell's quad recomputed by node.
  EDIT 2026-11-05: split from meshes.md (Marcel: 72 slides is more than two hours at the current pace). The
  vertex-cache slide corrected: 0.605 is the row-major order with a cache of 32, not an optimized order with
  a cache of 16 (the chapter, Section 11, has it right).

  reveal.js: FLAT; notes follow "Note:" and stay plain text. Display math is a raw <div class="tex">
  block typeset by MathJax (lib/deck-math.js; TeX inside, the ASCII form as aria-label, no blank line
  inside); inline math is a code span written `$...$`. Code identifiers stay plain code spans. Never
  two "_" on one markdown line outside a code fence or code span; paths relative to the lecture page.
-->

### Supplement: polygonal meshes, further

<small>(~14 min, time permitting) · reading: <a href="../../textbook/meshes.html">Polygonal Meshes</a>, Sections 5 and 7 to 12</small>


---

## Newell's method: the normal of a polygon

A four-sided face whose corner is lifted, (0, 0, 0), (1, 0, 0), (1, 1, **0.2**), (0, 1, 0), is not flat. Crosses at different corners **disagree**:

<div class="tex" style="font-size:0.72em" role="img" aria-label="cross at vertex 0:  (0, 0, 1)          cross at vertex 2:  (−0.192, −0.192, 0.962)
Newell: sum over edges (p → q) of
   Nx += (p_y − q_y)(p_z + q_z),  Ny += (p_z − q_z)(p_x + q_x),  Nz += (p_x − q_x)(p_y + q_y)
= (−0.2, −0.2, 2)  →  normalized (−0.099, −0.099, 0.990)">
\[ \begin{gathered} \text{cross at vertex 0: } (0,\ 0,\ 1) \qquad \text{cross at vertex 2: } ({-0.192},\ {-0.192},\ 0.962) \\[8pt] N_x = \sum_{p \to q} (p_y - q_y)(p_z + q_z) \quad N_y = \sum_{p \to q} (p_z - q_z)(p_x + q_x) \quad N_z = \sum_{p \to q} (p_x - q_x)(p_y + q_y) \\[8pt] N = ({-0.2},\ {-0.2},\ 2) \;\to\; ({-0.099},\ {-0.099},\ 0.990) \end{gathered} \]
</div>

One normal from every edge at once: the average orientation, robust to a bent face (Tampieri, Graphics Gems III, 1992).


---

## Editing a mesh = moving vertices

A polygon editor is the demo's `lift` generalized: let the user grab any vertex and move it, then recompute the affected normals. Kelvin Sung's `7.5` project keeps a draggable sphere per vertex and re-reads them every frame:

```csharp [1-9]
void InitControllers(Vector3[] v) {           // one sphere handle per vertex
    for (int i = 0; i < v.Length; i++) { … place a sphere at v[i] … }
}
void Update() {                               // every frame:
    for (int i = 0; i < mControllers.Length; i++)
        v[i] = mControllers[i].transform.localPosition;   // read handles → vertices
    ComputeNormals(v, n);                     // positions changed → normals stale → rebuild
    theMesh.vertices = v;   theMesh.normals = n;
}
```

Move one vertex and only one position changes, but the normals of **every face touching it**, and of every vertex on those faces, must be recomputed.


---

## A level-of-detail ladder, and when to switch

<img src="../../textbook/figures/mesh-lod-ladder.svg" class="media-shot" style="height:190px" alt="Log-log plot of mean error against triangle count for the bunny: the blue QEM points at 868, 3,472 and 13,889 triangles lie on a straight line below the red MG2001 points at 145 to 3,879 triangles.">

A 720-row screen with a 45° field of view: one pixel spans `$2\tan(22.5^\circ)/720 = 0.00115$` units at distance 1. A level is safe beyond the distance where its worst error is under a pixel:

| level | triangles | max error | safe beyond | error at distance 2 |
| ----- | --------- | --------- | ----------- | ------------------- |
| 0 | 868 | 0.0154 | 13.4 | 6.7 px |
| 1 | 3,472 | 0.00635 | 5.5 | 2.8 px |
| 2 | 13,889 | 0.00192 | 1.7 | 0.8 px |


---

<!-- .slide: class="demo-full" -->

## Levels of detail, live

<div class="cockpit" data-demo="lod" data-controls="level,dist"><pre class="viz-fallback">  one model at five resolutions, L0 to L4
  controls:  model, level, dist (0 to 12; 0 = pick the level by hand)
  readout:   model, level, vertices, triangles</pre></div>


---

## Order matters: the vertex cache

A GPU keeps the last few transformed vertices; a triangle whose vertices are still there costs no vertex-shader work. The measure is **ACMR**, vertices transformed per triangle. A 10×10 grid, 200 triangles:

| index order | cache size | ACMR |
| ----------- | ---------- | ---- |
| triangles shuffled | 16 | 2.695 |
| row-major, as built | 16 | 1.100 |
| row-major, as built | 32 | 0.605 |

Same triangles, **2.45 times** less vertex work by reordering at the same cache size. The last row is the lower bound, `$121/200$`: each vertex transformed once.


---

## Smoothing, and why it shrinks

<img src="../../textbook/figures/mesh-smoothing.svg" class="media-shot" style="height:200px" alt="Mean radius of a 162-vertex icosphere against the number of smoothing steps: with the umbrella operator at lambda 0.5 it falls in a straight line from 1 to 0.64 over twenty steps; with Taubin's alternating lambda and mu it stays at 1.0.">

**Laplacian smoothing**: move each vertex a fraction `$\lambda$` toward the average of its neighbors. It removes noise, and it **shrinks**. An icosphere of radius 1 (162 vertices), `$\lambda = 0.5$`:

| steps | 1 | 5 | 20 |
| ----- | - | - | -- |
| radius | 0.978 | 0.893 | 0.637 |

Taubin (1995) alternates `$\lambda = 0.5$` with `$\mu = -0.53$`, a step back out: after 20 steps, radius **1.016**: smooth, and the same size.


---

## Meshes from volumes: marching cubes

<img src="../../textbook/figures/mesh-marching-cubes.svg" class="media-shot" style="height:200px" alt="A unit cube with its eight corners labeled by their field values, four of them filled as inside, six green points on the cut edges, and the green hexagon they form triangulated into four triangles slicing across the cell.">

A CT scan, a fluid or a signed distance field gives **values on a grid**. Marching cubes (Lorensen and Cline, 1987) visits each cube:

- 8 corners, each inside or outside: `$2^8 = 256$` cases, 15 up to symmetry, in a lookup table
- the chapter's cube: 4 corners inside, case 27; the surface crosses 6 edges, and makes 4 triangles
- each crossing by linear interpolation of the values: `$t = 0.6$` on edge 1–2


---

## Mesh files: glTF

**glTF 2.0** (Khronos, 2017), the interchange format for real-time work: JSON describing the scene, pointing into typed **binary buffers** the GPU uploads without parsing.

```json
"accessors": [
  { "componentType": 5126, "count": 9,  "type": "VEC3", "min": [-1.5,0,-1.5], "max": [1.5,0.4,1.5] },
  { "componentType": 5126, "count": 9,  "type": "VEC3" },
  { "componentType": 5123, "count": 24, "type": "SCALAR" } ]
```

- 5126 is float32, 5123 is uint16; mode 4 is a triangle list
- the grid: positions `$9 \times 3 \times 4 = 108$` bytes, normals 108, indices `$24 \times 2 = 48$`: **264** bytes in one buffer
- the position accessor's `min` and `max` are the bounding box a loader frames the model with

