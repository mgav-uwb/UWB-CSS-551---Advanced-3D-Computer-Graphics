<!--
  CSS 551 · TOPIC DECK: Polygonal meshes, built by hand (~48 min, 35 slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/meshes.md"> among others; no lecture
  logistics, no "Part N" numbering.

  TEACHES: why triangles; a mesh is a vertex array plus an index array; winding
  picks the front face; the 2×2 grid built by hand (row-major index, the split,
  all eight triangles); the counts (n+1)², 2n², 6n²; face normals as cross
  products (flat (0, 2.25, 0), lifted (−0.6, 2.25, −0.6)); averaged vertex normals;
  flat, Gouraud and Phong shading; editing moves vertices; a surface of
  revolution as a profile crossed with rotations; degenerate poles; the other
  diagonal; hard edges split vertices (a cube has 24); OBJ and glTF files.
  NEEDS:   the vectors topic (cross product); the rotation topic (R_y).
  DEMOS:   data-demo="mesh-grid" data-controls="n,lift" (under the page's crop).
  FIGURES: ../../textbook/figures/mesh-shading-modes.png, mesh-sweep.svg
           (textbook generators).
  NUMBERS: textbook/figures/numbers-surfaces.json (mesh.*).

  Derived from the Plan B single-file deck sessions/S07-polygonal-modeling
  (retired); the CDP walkthrough and the Final Project workshop are gone, and
  the Unity code excerpts are cut to the one that carries the normal averaging.

  reveal.js: FLAT; notes follow "Note:"; plain unicode math; never two "_" on
  one markdown line outside a code fence (backtick v00, v10, ...). Paths are
  relative to the lecture page (lectures/LNN-slug/index.html).
-->

### Polygonal meshes: everything is triangles

<small>(~48 min)</small>


---

## Why triangles

Every real-time surface, a character, a terrain, a car, is a **triangle mesh**. Not squares, not curves: triangles. Two reasons the hardware insists:

- a triangle is always **planar**: three points define exactly one flat plane, so there is no ambiguity about the surface between them
- a triangle is always **convex**: filling (rasterizing) it is a fixed, simple loop the GPU does billions of times a second

A quad's four corners can be non-planar (bent), and its fill is ambiguous. Split it into two triangles and both problems vanish.


---

## A mesh is two arrays

A triangle mesh is just **two lists**:

- a **vertex array**: the positions (and later normals, colors, UVs), each vertex stored **once**
- an **index array**: flat triples; each group of three indices names one triangle by pointing into the vertex array

```text
   vertices v[]         indices t[]  (triples)
     v0 = (…)             t = [ 0, 3, 1,   ← triangle 0
     v1 = (…)                   1, 3, 4,   ← triangle 1
     v2 = (…)                   … ]
     …
```

Vertices are **shared**: a corner touched by six triangles is stored once and referenced six times. That is the whole point of *indexed* triangles.


---

## Winding picks the front face

A triangle's three indices are listed in an **order**: clockwise or counter-clockwise as seen from one side. That **winding order** is how the GPU decides which side faces you:

- vertices ordered **counter-clockwise** (CCW) as seen from the front → that side is the **front face**
- the back face is usually **culled**: not drawn at all, to save fill

Order the three indices wrong and the triangle faces **away**: it vanishes (culled) or lights from the inside. Winding is not cosmetic: it is the surface's outward direction.


---

### Indexed triangles by hand

<small>(~15 min)</small>

---

## The 2×2 grid: nine vertices

The smallest interesting mesh: a **2×2 grid of quads** on the ground (the XZ plane). Two quads per side means a **3×3 lattice of vertices**: nine of them. We number them **row by row** (row = Z, column = X):

```text
        col 0     col 1     col 2         (X →)
  row 0   v0 ────── v1 ────── v2      z = −1.5
          │  ╲       │  ╲       │
          │    ╲     │    ╲     │
  row 1   v3 ────── v4 ────── v5      z =  0
          │  ╲       │  ╲       │
          │    ╲     │    ╲     │
  row 2   v6 ────── v7 ────── v8      z = +1.5
```

Nine vertices, four quads, and (split each quad in two) **eight triangles**.


---

## Row-major indexing

For an n×n grid, the vertex at (`row`, `col`), both running 0…n, lives at a single formula:

```text
   index(row, col) = row · (n + 1) + col
```

At n=2 that is `row·3 + col`: (0,0)→0, (1,1)→4, (2,2)→8. One quad sits at each (`row`, `col`) for `row`, `col` in 0…n−1, with four corners:

```text
   v00 = index(row,   col)       v01 = index(row,   col+1)
   v10 = index(row+1, col)       v11 = index(row+1, col+1)
```

Every triangle we write is one of these four names: no magic numbers.


---

## The first quad → two triangles

Take quad (0,0): corners `v00`=0, `v10`=3, `v01`=1, `v11`=4. Split along the `v10`–`v01` diagonal into two triangles, **both wound CCW seen from +Y** (from above):

```text
   tri0 = (v00, v10, v01) = (0, 3, 1)
   tri1 = (v01, v10, v11) = (1, 3, 4)
```

Check tri0's winding with a cross product (the normals stretch uses the same tool): edges `v10−v00 = (0,0,1.5)` and `v01−v00 = (1.5,0,0)`; their cross is `(0, +2.25, 0)`, points **+Y, up**. Front face up. Correct.


---

## All eight triangles

Apply the same split to all four quads: `index(row,col)` for the corners, `(v00,v10,v01)` then `(v01,v10,v11)`:

```text
   quad (0,0):  (0,3,1)  (1,3,4)
   quad (0,1):  (1,4,2)  (2,4,5)
   quad (1,0):  (3,6,4)  (4,6,7)
   quad (1,1):  (4,7,5)  (5,7,8)
```

Eight triangles, 24 indices. Every interior edge is shared by two triangles; the center vertex `4` appears in **six** of them: stored once, referenced six times.


---

## The other diagonal

A quad can be cut along **either** diagonal. Kelvin Sung's classroom code fans each quad from `v00`:

```text
   this topic's split, along v10–v01:    (0, 3, 1)  (1, 3, 4)
   the fan from v00, along v00–v11:      (0, 3, 4)  (0, 4, 1)
```

- the same nine vertices and eight triangles, both wound counter-clockwise from above
- they differ in **which edge the surface bends along** when a vertex is lifted
- read a mesh's index array before assuming its split


---

## Counting, for any n

Read the three counts straight off the construction:

```text
   vertices  = (n + 1)²      one per lattice point, (n+1) per side
   triangles = 2 n²          n² quads, 2 triangles each
   indices   = 6 n²          3 per triangle → 3 · 2n²
```

Check at n=2: `(2+1)² = 9` vertices, `2·2² = 8` triangles, `6·2² = 24` indices. At n=10: `121` / `200` / `600`. The demo prints these live as you drag `n`.


---

## Beyond two arrays: the half-edge structure

<img src="../../textbook/figures/mesh-halfedge.svg" class="media-shot" style="max-height: 240px;" alt="the 2 by 2 grid with each edge split into two opposite half-edges; the ring around the center vertex highlighted">

Index arrays answer "draw it". Editing needs **neighbors**: which faces touch this vertex, which face is across this edge. A **half-edge** mesh stores each edge twice, once per side, with four links:

```text
   half-edge:  to (vertex),  face,  next (around the face),  twin (the opposite half)
   the 2×2 grid:  V 9,  F 8,  E 16  →  24 half-edges inside faces (8 boundary edges have one side)
   the ring around vertex 4:  twin, then next, repeated  →  1, 3, 6, 7, 5, 2    (valence 6)
```


---


## Euler's formula checks a mesh

For a closed surface, **V − E + F = 2 − 2g** (g = holes through it); each boundary loop subtracts 1 more.

```text
   cube             8 − 12 + 6          =  2      closed, genus 0
   the 2×2 grid     9 − 16 + 8          =  1      one boundary loop
   icosphere      162 − 480 + 320       =  2
   Stanford bunny  34,834 − 104,288 + 69,451 = −3     genus 0, so 5 boundary loops
```

The bunny has **five holes in its base** (loops of 80, 42, 40, 39 and 22 edges): where the scanner could not see. A mesh tool that gets −3 and expected 2 has found them.


---


## Valence: meshes are mostly sixes

<img src="../../textbook/figures/mesh-valence.svg" class="media-shot" style="max-height: 230px;" alt="histogram of vertex valence on the Stanford bunny, peaked sharply at six">

```text
   Stanford bunny:  valence 6 for 75.1 % of vertices,  5 or 7 for 22.5 %,  mean 5.988
```

For a large closed triangle mesh, **E ≈ 3V** and **F ≈ 2V** (from Euler), so the average valence is **6**. Irregular vertices (4, 5, 7, 8) are where subdivision and remeshing leave artifacts.


---

## Meet the demo: a mesh you build

The `mesh-grid` demo builds this grid **by hand**: positions, indices, and normals as plain arrays fed to the GPU (never a built-in `PlaneGeometry`). Two controls:

- **`n`**: quads per side (2…10); drag it and the topology rebuilds, counts update live
- **`lift`**: moves the **one** center vertex up or down in Y; the surface tents, and normals recompute

The panel prints the three counts and the first two triangles' index triples: the exact numbers we just derived.


---

## The mesh, live

<div class="cockpit" data-demo="mesh-grid" data-controls="n,lift"><pre class="viz-fallback">  model {n, lift} → (n+1)² verts + 6n² indices built BY HAND → GPU
  -- default: n = 2, lift = 0.4 (center vertex v4 lifted +0.4 in Y) ----------
     counts:   vertices (n+1)² = 9    triangles 2n² = 8    indices 6n² = 24
     first two triangles (index triples):
        tri0: (0, 3, 1)
        tri1: (1, 3, 4)
     drag n → topology rebuilds (n=10 → 121 / 200 / 600); drag lift → tents v4</pre></div>


---

### Normals, and a mesh from a profile

<small>(~17 min)</small>

---

## Why a mesh needs normals

Positions give a surface its **shape**; they say nothing about which way it **faces**. Lighting needs the facing direction, the **normal**, at every point:

- how bright a surface is depends on the angle between its normal and the light (the dot product with the light direction, in the illumination topic)
- a flat position array with no normals renders **unlit**: a silhouette, no shading

So every vertex carries a **unit normal** alongside its position. The question is where those normals come from: and the answer is a cross product.


---

## A face normal is a cross product

A triangle is flat, so it has **one** normal. Take two edges from a shared corner and **cross** them (the vectors topic): the result is perpendicular to both, i.e. perpendicular to the triangle:

```text
   faceN = (v1 − v0) × (v2 − v0)
```

The **winding order** fixes the sign: list `v0, v1, v2` CCW-as-seen-from-front and the cross points **out** the front. Then normalize to unit length. Concretely, our demo's `tri0 = (0, 3, 1)`, flat (`lift = 0`):

```text
   edge1 = v3 − v0 = (0, 0, 1.5)      edge2 = v1 − v0 = (1.5, 0, 0)
   faceN = edge1 × edge2 = (0, 2.25, 0)   →   normalize → (0, 1, 0)
```

Straight up: exactly what a flat floor's normal should be.


---

## Newell's method: the normal of a polygon

A four-sided face whose corner is lifted, (0, 0, 0), (1, 0, 0), (1, 1, **0.2**), (0, 1, 0), is not flat. Crosses at different corners **disagree**:

```text
   cross at vertex 0:  (0, 0, 1)          cross at vertex 2:  (−0.192, −0.192, 0.962)

   Newell: sum over edges (p → q) of
      Nx += (p_y − q_y)(p_z + q_z),  Ny += (p_z − q_z)(p_x + q_x),  Nz += (p_x − q_x)(p_y + q_y)
   = (−0.2, −0.2, 2)  →  normalized (−0.099, −0.099, 0.990)
```

One normal from every edge at once: the average orientation, robust to a bent face (Tampieri, Graphics Gems III, 1992).


---

## From face normals to vertex normals

A face normal is per-**triangle**, but lighting samples per-**vertex**, and each interior vertex is shared by several faces. Average them: a vertex's normal is the sum of its incident face normals, then normalized.

```text
   n[i] = normalize( Σ  faceN(f) )     over every face f that touches vertex i
```

If we sum the **un-normalized** face normals, each contributes in proportion to its area (bigger triangle, bigger vote): a good default. Kelvin Sung's `MyMesh_NormalSupport.cs` does exactly this, face by face:

```csharp [1-8]
Vector3 FaceNormal(Vector3[] v, int i0, int i1, int i2) {
    Vector3 a = v[i1] - v[i0];
    Vector3 b = v[i2] - v[i0];
    return Vector3.Cross(a, b).normalized;
}
// n[4] is the center vertex: sum of ALL SIX faces that meet there:
n[4] = (triNormal[0] + triNormal[1] + triNormal[2]
      + triNormal[5] + triNormal[6] + triNormal[7]).normalized;
```


---

## Faceted vs smooth

<img src="../../textbook/figures/mesh-shading-modes.png" class="media-shot" style="max-height: 360px;" alt="three renderings of the same 80-face icosphere: flat shaded with every facet visible; Gouraud shaded, smooth but with no highlight; Phong shaded, smooth with a specular highlight">

<small>The same 80 triangles in the same positions, three times; only the normals and where they are evaluated change. Computed by the course-text generator.</small>


---

## Hard edges: one position, two normals

Averaging assumes the surface is **smooth** across every edge. A cube averaged that way gets one diagonal normal per corner, `(1, 1, 1)/√3`, and shades as a rounded blob.

- an edge whose two face normals differ by more than a threshold (Maya's and Blender's default: **30°**) is **hard**
- a vertex holds **one** normal, so a hard edge forces a **split**: the vertex is stored once per smooth group, same position, different normals
- a correctly shaded cube has **24** vertices, not 8: 6 faces × 4 corners
- a flat-shaded 80-triangle sphere has **240** (every edge hard, 3 per triangle) against 42 smooth

Texture seams force the same split: one position, two texture coordinates.


---

## What the lift does to the normals

Flat (`lift = 0`), every face normal is `(0, 1, 0)` and every averaged vertex normal is straight up. Lift the center vertex and the **six faces touching it tilt**: their cross products gain horizontal components:

```text
   tri1 = (1, 3, 4), center v4 lifted +0.4:
     edge1 = v3 − v1 = (−1.5, 0, 1.5)      edge2 = v4 − v1 = (0, 0.4, 1.5)
     faceN = edge1 × edge2 = (−0.6, 2.25, −0.6)   →   normalize → (−0.25, 0.94, −0.25)
```

The face now leans **away from the peak**. Averaged in, the mid-edge vertices' normals tilt **toward** the peak; the peak vertex `v4`, by symmetry of its six tilted faces, stays **(0, 1, 0)**. Toggle the demo's normals overlay and watch them swing as you drag `lift`.


---

## Editing a mesh = moving vertices

A polygon modeling editor is, at its core, **the demo's `lift` generalized**: let the user grab any vertex and move it, then recompute the affected normals. Kelvin Sung's `7.5` project does exactly that, a draggable sphere per vertex, re-read every frame:

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

Move a vertex and its position is stale in nothing else: but its **normal, and its neighbors' normals, must be recomputed**. Geometry and normals travel together.


---

## Sweeping a profile into a surface

For a **surface of revolution**: take a **profile curve** and **spin it** around an axis, a general cylinder.

<img src="../../textbook/figures/mesh-sweep.svg" class="media-shot" style="max-height: 330px;" alt="a profile polyline beside the rotation axis, and the wireframe surface of revolution it sweeps, rings connected by meridians">

Choose P profile points and S rotation steps: a **P × S grid** of vertices, in quads like the flat grid; the rows wrap around.


---

## The rotation is the rotation topic, reused

Each profile point `p` becomes `S` copies, one per rotation step `θ_j = j · Δθ` with `Δθ = 2π / S`. Rotating about the Y axis is the axis-angle rotation of the rotation topic:

```text
                [  cos θ   0   sin θ ]
   R_y(θ) =     [    0     1     0   ]        vertex(i, j) = R_y(θ_j) · profile[i]
                [ −sin θ   0   cos θ ]
```

No new math: a surface of revolution is a **profile array crossed with a rotation array**, each rotation one of the rotation topic's matrices. Build the vertex grid, split into triangles, compute normals as before.


---

## Degenerate case: the poles

If a profile point lies **on** the axis (radius 0), all `S` rotated copies land on the **same point**: the circle collapses to one vertex, a **pole**. The quads around it are **degenerate**: two corners coincide, so the "triangle" has zero area and **no normal** (its cross product is the zero vector).

- a **sphere** swept pole-to-pole has exactly this at top and bottom
- fix: collapse the pole to **one** vertex and cap with a **triangle fan**, not quads, or keep the profile off the axis

Guard it: our `computeNormals` returns `(0, 1, 0)` when a vertex's summed normal is near-zero length, so a pole never yields a `NaN`.


---

## Simplification: collapse an edge

<img src="../../textbook/figures/mesh-edge-collapse.svg" class="media-shot" style="max-height: 220px;" alt="an edge collapsed: its two endpoints merged into one vertex, the two triangles on the edge removed">

Merge an edge's two endpoints into one vertex; the two triangles that shared the edge vanish:

```text
   before:  V 8,  T 8,  E 15
   after:   V 7,  T 6,  E 12        one collapse: −1 vertex, −2 triangles, −3 edges
```

Repeat, cheapest edge first, until the triangle budget is met. The question is **which** edge is cheapest and **where** the merged vertex goes.


---


## The quadric error, worked

Garland and Heckbert (1997): the cost of moving a vertex is the **sum of squared distances** to the planes of its original triangles.

```text
   the lifted 2×2 grid, edge 4–1 (the center to an edge vertex), 7 planes involved:
      merge at vertex 4        cost 0.160
      merge at vertex 1        cost 1.457
      merge at the midpoint    cost 0.404
      merge at the optimum (0, 0.338, 0)   cost 0.135     (solve a 3×3 system)
   edge 0–1, on the flat border:  merge at vertex 1, cost 0: free
```

Each vertex keeps one 4×4 matrix, the sum of its planes' quadrics; a collapse adds two matrices. Cheap enough for millions of edges.


---


## A level-of-detail ladder, and when to switch

<img src="../../textbook/figures/mesh-lod-ladder.svg" class="media-shot" style="max-height: 200px;" alt="the Stanford bunny at 868, 3,472, 13,889 and 69,451 triangles side by side">

A 720-row screen with a 45° field of view: one pixel spans **0.00115** units at distance 1. A level is safe beyond the distance where its worst error is under a pixel:

| level | triangles | max error | safe beyond | error at distance 2 |
| ----- | --------- | --------- | ----------- | ------------------- |
| 0 | 868 | 0.0154 | 13.4 | 6.7 px |
| 1 | 3,472 | 0.00635 | 5.5 | 2.8 px |
| 2 | 13,889 | 0.00192 | 1.7 | 0.8 px |


---


## Order matters: the vertex cache

A GPU keeps the last few transformed vertices; a triangle whose vertices are still there costs no vertex-shader work. The measure is **ACMR**, vertices transformed per triangle:

```text
   a 10×10 grid, 200 triangles, cache of 16 vertices:
      triangles shuffled              ACMR 2.695    (almost every vertex transformed again)
      row-major, as built             ACMR 1.100
      optimized order                 ACMR 0.605    (the lower bound: each vertex once)
```

Same triangles, **4.5 times** less vertex work, by reordering the index array.


---


## Smoothing, and why it shrinks

<img src="../../textbook/figures/mesh-smoothing.svg" class="media-shot" style="max-height: 200px;" alt="a noisy sphere smoothed by Laplacian steps, shrinking; and by Taubin's alternating steps, keeping its size">

**Laplacian smoothing**: move each vertex a fraction λ toward the average of its neighbors. It removes noise, and it **shrinks**:

```text
   icosphere of radius 1 (162 vertices), λ = 0.5:
      after 1 step:  0.978      after 5:  0.893      after 20:  0.637
   Taubin (1995): alternate λ = 0.5 and μ = −0.53 (a step back out)
      after 20 steps: 1.016      smooth, and the same size
```


---


## Meshes from volumes: marching cubes

<img src="../../textbook/figures/mesh-marching-cubes.svg" class="media-shot" style="max-height: 220px;" alt="one cube of a grid with four corners inside a sphere, the surface crossing six of its edges, triangulated into four triangles">

A CT scan, a fluid or a signed distance field gives **values on a grid**. Marching cubes (Lorensen and Cline, 1987) visits each cube:

```text
   8 corners, each inside or outside:   2^8 = 256 cases,  15 up to symmetry, in a lookup table
   the chapter's cube: 4 corners inside, case 27;  the surface crosses 6 edges
   crossing on an edge, by linear interpolation of the values:  e.g. t = 0.6 on edge 1–2
   → 4 triangles
```


---

## Mesh files: OBJ

Wavefront **OBJ** (1990): text, one vertex or face per line, indices starting at **1**. The lifted 2×2 grid:

```text
   v -1.5 0 -1.5        f 1 4 2
   v  0   0 -1.5        f 2 4 5
   v  1.5 0 -1.5        f 2 5 3
   v -1.5 0  0          f 3 5 6
   v  0   0.4 0         f 4 7 5
   v  1.5 0  0          f 5 7 8
   v -1.5 0  1.5        f 5 8 6
   v  0   0  1.5        f 6 8 9
   v  1.5 0  1.5
```

- `f 1 4 2` is the triangle `(0, 3, 1)`: add 1 to every index
- normals and texture coordinates are separate lists, joined per corner as `f 1/1/1 4/4/4 2/2/2`
- no binary form, no scene graph, no animation; readable everywhere


---


## Mesh files: glTF

**glTF 2.0** (Khronos, 2017), the interchange format for real-time work: JSON describing the scene, pointing into typed **binary buffers** the GPU uploads without parsing.

```text
   "accessors": [
     { "componentType": 5126, "count": 9,  "type": "VEC3", "min": [-1.5,0,-1.5], "max": [1.5,0.4,1.5] },
     { "componentType": 5126, "count": 9,  "type": "VEC3" },
     { "componentType": 5123, "count": 24, "type": "SCALAR" } ]
```

- 5126 is float32, 5123 is uint16; mode 4 is a triangle list
- the grid: positions 9 × 3 × 4 = **108** bytes, normals **108**, indices 24 × 2 = **48**: 264 bytes in one buffer
- the position accessor's `min` and `max` are the bounding box a loader frames the model with

