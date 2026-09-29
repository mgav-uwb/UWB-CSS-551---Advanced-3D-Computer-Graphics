<!--
  CSS 551 · TOPIC DECK: Polygonal meshes, built by hand (~40 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/meshes.md"> among others; no lecture
  logistics, no "Part N" numbering.

  TEACHES: why triangles; a mesh is a vertex array plus an index array; winding
  picks the front face; the 2×2 grid built by hand (row-major index, the split,
  all eight triangles); the counts (n+1)², 2n², 6n²; face normals as cross
  products (flat (0, 2.25, 0), lifted (−0.6, 2.25, −0.6)); averaged vertex normals;
  flat, Gouraud and Phong shading; editing moves vertices; a surface of
  revolution as a profile crossed with rotations; degenerate poles.
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

<small>(~40 min)</small>


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

## Counting, for any n

Read the three counts straight off the construction:

```text
   vertices  = (n + 1)²      one per lattice point, (n+1) per side
   triangles = 2 n²          n² quads, 2 triangles each
   indices   = 6 n²          3 per triangle → 3 · 2n²
```

Check at n=2: `(2+1)² = 9` vertices, `2·2² = 8` triangles, `6·2² = 24` indices. At n=10: `121` / `200` / `600`. The demo prints these live as you drag `n`.


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

