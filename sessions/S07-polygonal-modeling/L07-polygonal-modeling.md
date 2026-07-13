<!--
  CSS 551 · Lecture 7 (Session 7) — Polygonal modeling: building a mesh by
  hand. We stop USING geometry the engine hands us and BUILD it ourselves: a
  triangle mesh is a vertex array plus an index array, and we hand-construct
  the whole thing — an n×n grid of quads split into triangles — the way Sung's
  MyMesh.cs does, then compute its normals by hand, deform it, and sweep a
  profile into a surface of revolution (MP6's general cylinder).

  reveal.js: FLAT deck — every slide is a top-level "---" section (no vertical
  "--" stacks). Keeps the verify-deck harness's demo probe correct (it selects
  "section.present [data-demo]"; inside a vertical stack that would match a
  demo on a not-yet-shown sibling slide, 0x0 -> pixel probe times out). Flat =
  one section per slide = demo only matched when shown. Notes follow "Note:".

  ONE DEMO, on its own slide (flat), with the scoped-CSS cap:
   - Part 2: data-demo="mesh-grid" data-controls="n,lift". Fallback shows the
     HAND-VERIFIED n=2 defaults: counts 9 verts / 8 tris / 24 indices; first
     two triangles (0,3,1) and (1,3,4); center vertex v4 lifted to 0.4.
  Recomputed via node against lib/demos/mesh-grid.js + lib/core/xform.js
  (cross, sub, normalize). See README for the exact digits.

  IMPORTANT ordering fact — OUR demo vs Sung's MyMesh.cs differ, ON PURPOSE:
   - OUR mesh-grid.js splits each quad (row,col) as tri0=(v00,v10,v01),
     tri1=(v01,v10,v11) — at n=2 that is (0,3,1) and (1,3,4), both CCW seen
     from +Y. This is what students SEE in the embedded demo.
   - Sung's MyMesh.cs fans each quad from v00: t=(0,3,4) then (0,4,1). Same 9
     vertices, same 8 triangles, DIFFERENT split diagonal / index order.
  The worked 2×2 example in Part 2 uses OUR indices (the demo is ground truth);
  a speaker note flags Sung's different ordering honestly so students reading
  MyMesh.cs in the studio are not confused.

  MATH IS PLAIN TEXT ON PURPOSE. This shell loads NO KaTeX plugin (only
  markdown/highlight/notes), so "$...$" would render literally. All formulas
  are unicode plain text (−, ·, ×, →, ≤, ², ³, θ, Δ) or fenced ```text blocks,
  like S01-S06. Never two "_" on one markdown line OUTSIDE a code fence (they
  pair into <em> and shred the line): in prose AND speaker notes ALWAYS
  backtick names with underscores (v00, v10, v01, v11, row*(n+1)+col,
  MyMesh_NormalSupport, ComputeNormals, FaceNormal, MeshFilter, ...). Matrices
  and code inside ```text / ```csharp fences are safe. No <small> on math. NO
  forward / "next time" references anywhere — the wrap may preview the FIXED
  Thursday studio (paired lab) but never a later SESSION.

  Real C# excerpts are from Kelvin Sung's CSS 451 ClassExamples,
  Topic7-PolygonalModeling: 7.1.QuadAndIndexedTriangles/ATriangle.cs (the ONE
  triangle + the "CCW by default is culled" comment); 7.3.Simple2x2Mesh/
  MyMesh.cs (the 9-vertex, 8-triangle hand build — THE excerpt); 7.5.
  NormalAverageSupport/MyMesh_NormalSupport.cs (FaceNormal + ComputeNormals
  accumulation), MyMesh_Manipulate.cs (InitControllers) and 7.5/MyMesh.cs (the Update loop
  that re-reads vertices and recomputes normals). These are the CDP projects
  students run Thursday (lab07).

  Session plan (120 min, Tue 5:45-7:45 PM synchronous online). Sums to ~110 + buffer.
    0:00  Intro (title + tonight)                     ~2 min
    0:02  Part 1  Everything is triangles             15 min  (why triangles; mesh = verts + indices; winding; ATriangle.cs)
    0:17  Part 2  Indexed triangles by hand           30 min  (2×2 grid; MyMesh.cs; row-major index; first quad → 2 tris; 8 tris; count formulas; mesh-grid demo)
    0:47  Part 3  Normals                             25 min  (face normal = cross of edges, numeric; averaged vertex normals + NormalSupport; faceted vs smooth; what the lift shows)
    1:12  Part 4  Manipulation & sweep                20 min  (move a vertex → recompute normals; rotational sweep = profile × rotations; poles; MP6 general cylinder)
    1:32  Part 5  CDP walkthrough + FP proposal setup 15 min  (Simple2x2Mesh + NormalAverageSupport; Thursday's proposal workshop structure)
    1:47  Wrap                                         5 min  (Thu MyMesh studio + FP proposal workshop; MP5 due; MP6 out; FP proposal due — Canvas)
    1:52  end (+ buffer)
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 7 — Polygonal Modeling: Building a Mesh by Hand**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>

---

## Tonight

- **Everything is triangles** — a mesh is a **vertex array** plus an **index array**; winding picks the face
- **Build a grid by hand** — the 2×2 mesh exactly as `MyMesh.cs` does, then any n×n
- **Normals from scratch** — a face normal is a **cross product** (S02 again); average them per vertex
- **Deform and sweep** — move a vertex and recompute; spin a profile into a surface of revolution
- **The CDP + the Final Project** — run the real `MyMesh` project; start the FP proposal Thursday

---

### Part 1 · Everything is triangles

<small>(~15 min)</small>

---

## Why triangles

Every real-time surface — a character, a terrain, a car — is a **triangle mesh**. Not squares, not curves: triangles. Two reasons the hardware insists:

- a triangle is always **planar** — three points define exactly one flat plane, so there is no ambiguity about the surface between them
- a triangle is always **convex** — filling (rasterizing) it is a fixed, simple loop the GPU does billions of times a second

A quad's four corners can be non-planar (bent), and its fill is ambiguous. Split it into two triangles and both problems vanish.

---

## A mesh is two arrays

A triangle mesh is just **two lists**:

- a **vertex array** — the positions (and later normals, colors, UVs), each vertex stored **once**
- an **index array** — flat triples; each group of three indices names one triangle by pointing into the vertex array

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

A triangle's three indices are listed in an **order** — clockwise or counter-clockwise as seen from one side. That **winding order** is how the GPU decides which side faces you:

- vertices ordered **counter-clockwise** (CCW) as seen from the front → that side is the **front face**
- the back face is usually **culled** — not drawn at all, to save fill

Order the three indices wrong and the triangle faces **away**: it vanishes (culled) or lights from the inside. Winding is not cosmetic — it is the surface's outward direction.

---

## One triangle, in Sung's code

`ATriangle.cs` builds the simplest possible mesh — three vertices, one triple — and warns about winding in a comment:

```csharp [1-9]
v = new Vector3[3];     // allocate first, THEN assign to the mesh
t = new int[3];
v[0] = new Vector3(-0.5f, 0, -0.5f);
v[1] = new Vector3( 0.5f, 0,  0.5f);
v[2] = new Vector3( 0.5f, 0, -0.5f);
t[0] = 0;   // t array is always multiples of 3
t[1] = 1;   //  WATCH for the default culling!! CCW by default is culled!
t[2] = 2;
theMesh.vertices = v;   theMesh.triangles = t;
```

<small>ATriangle.cs — 7.1.QuadAndIndexedTriangles. Three positions, one index triple; the comment is the winding warning made real.</small>

---

### Part 2 · Indexed triangles by hand

<small>(~30 min)</small>

---

## The 2×2 grid: nine vertices

The smallest interesting mesh: a **2×2 grid of quads** on the ground (the XZ plane). Two quads per side means a **3×3 lattice of vertices** — nine of them. We number them **row by row** (row = Z, column = X):

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

Nine vertices, four quads, and — split each quad in two — **eight triangles**.

---

## The vertices, in Sung's code

`MyMesh.cs` sets the nine positions directly — row by row, exactly our numbering:

```csharp [1-11]
Vector3[] v = new Vector3[9];   // 2×2 mesh needs 3×3 vertices
int[]     t = new int[8*3];     // 8 triangles × 3 indices
v[0] = new Vector3(-1,0,-1);  v[1] = new Vector3(0,0,-1);  v[2] = new Vector3(1,0,-1);
v[3] = new Vector3(-1,0, 0);  v[4] = new Vector3(0,0, 0);  v[5] = new Vector3(1,0, 0);
v[6] = new Vector3(-1,0, 1);  v[7] = new Vector3(0,0, 1);  v[8] = new Vector3(1,0, 1);
```

`v[4]` is the **center** vertex — the one we will lift later. Each row shares a Z; each column shares an X. (Our demo spans ±1.5 instead of ±1 — same layout, wider grid.)

---

## Row-major indexing

For an n×n grid, the vertex at (`row`, `col`) — both running 0…n — lives at a single formula:

```text
   index(row, col) = row · (n + 1) + col
```

At n=2 that is `row·3 + col`: (0,0)→0, (1,1)→4, (2,2)→8. One quad sits at each (`row`, `col`) for `row`, `col` in 0…n−1, with four corners:

```text
   v00 = index(row,   col)       v01 = index(row,   col+1)
   v10 = index(row+1, col)       v11 = index(row+1, col+1)
```

Every triangle we write is one of these four names — no magic numbers.

---

## The first quad → two triangles

Take quad (0,0): corners `v00`=0, `v10`=3, `v01`=1, `v11`=4. Split along the `v10`–`v01` diagonal into two triangles, **both wound CCW seen from +Y** (from above):

```text
   tri0 = (v00, v10, v01) = (0, 3, 1)
   tri1 = (v01, v10, v11) = (1, 3, 4)
```

Check tri0's winding with a cross product (Part 3's tool, previewed): edges `v10−v00 = (0,0,1.5)` and `v01−v00 = (1.5,0,0)`; their cross is `(0, +2.25, 0)` — points **+Y, up**. Front face up. Correct.

---

## All eight triangles

Apply the same split to all four quads — `index(row,col)` for the corners, `(v00,v10,v01)` then `(v01,v10,v11)`:

```text
   quad (0,0):  (0,3,1)  (1,3,4)
   quad (0,1):  (1,4,2)  (2,4,5)
   quad (1,0):  (3,6,4)  (4,6,7)
   quad (1,1):  (4,7,5)  (5,7,8)
```

Eight triangles, 24 indices. Every interior edge is shared by two triangles; the center vertex `4` appears in **six** of them — stored once, referenced six times.

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

The `mesh-grid` demo builds this grid **by hand** — positions, indices, and normals as plain arrays fed to the GPU (never a built-in `PlaneGeometry`). Two controls:

- **`n`** — quads per side (2…10); drag it and the topology rebuilds, counts update live
- **`lift`** — moves the **one** center vertex up or down in Y; the surface tents, and normals recompute

The panel prints the three counts and the first two triangles' index triples — the exact numbers we just derived.

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

### Part 3 · Normals

<small>(~25 min)</small>

---

## Why a mesh needs normals

Positions give a surface its **shape**; they say nothing about which way it **faces**. Lighting needs the facing direction — the **normal** — at every point:

- how bright a surface is depends on the angle between its normal and the light (S02's dot product, a later topic)
- a flat position array with no normals renders **unlit** — a silhouette, no shading

So every vertex carries a **unit normal** alongside its position. The question is where those normals come from — and the answer is a cross product.

---

## A face normal is a cross product

A triangle is flat, so it has **one** normal. Take two edges from a shared corner and **cross** them (S02) — the result is perpendicular to both, i.e. perpendicular to the triangle:

```text
   faceN = (v1 − v0) × (v2 − v0)
```

The **winding order** fixes the sign: list `v0, v1, v2` CCW-as-seen-from-front and the cross points **out** the front. Then normalize to unit length. Concretely, our demo's `tri0 = (0, 3, 1)`, flat (`lift = 0`):

```text
   edge1 = v3 − v0 = (0, 0, 1.5)      edge2 = v1 − v0 = (1.5, 0, 0)
   faceN = edge1 × edge2 = (0, 2.25, 0)   →   normalize → (0, 1, 0)
```

Straight up — exactly what a flat floor's normal should be.

---

## From face normals to vertex normals

A face normal is per-**triangle**, but lighting samples per-**vertex**, and each interior vertex is shared by several faces. Average them: a vertex's normal is the sum of its incident face normals, then normalized.

```text
   n[i] = normalize( Σ  faceN(f) )     over every face f that touches vertex i
```

If we sum the **un-normalized** face normals, each contributes in proportion to its area (bigger triangle, bigger vote) — a good default. `MyMesh_NormalSupport.cs` does exactly this, face by face:

```csharp [1-8]
Vector3 FaceNormal(Vector3[] v, int i0, int i1, int i2) {
    Vector3 a = v[i1] - v[i0];
    Vector3 b = v[i2] - v[i0];
    return Vector3.Cross(a, b).normalized;
}
// n[4] is the center vertex — sum of ALL SIX faces that meet there:
n[4] = (triNormal[0] + triNormal[1] + triNormal[2]
      + triNormal[5] + triNormal[6] + triNormal[7]).normalized;
```

---

## Faceted vs smooth

The averaging is also a **style** choice — the same positions, two different looks:

- **faceted (flat):** give every vertex of a triangle that triangle's **own** face normal. Each face is uniformly lit — you see every facet, a low-poly look.
- **smooth:** average the incident face normals per vertex (what we just did). Normals vary gradually across a face, so the faceting disappears into a smooth-looking surface.

Same triangles, same positions — only the normals differ. Smooth shading is why a coarse sphere can look round.

---

## What the lift does to the normals

Flat (`lift = 0`), every face normal is `(0, 1, 0)` and every averaged vertex normal is straight up. Lift the center vertex and the **six faces touching it tilt** — their cross products gain horizontal components:

```text
   tri1 = (1, 3, 4), center v4 lifted +0.4:
     edge1 = v3 − v1 = (−1.5, 0, 1.5)      edge2 = v4 − v1 = (0, 0.4, 1.5)
     faceN = edge1 × edge2 = (−0.6, 2.25, −0.6)   →   normalize → (−0.25, 0.94, −0.25)
```

The face now leans **away from the peak**. Averaged in, the mid-edge vertices' normals tilt **toward** the peak; the peak vertex `v4` — by symmetry of its six tilted faces — stays **(0, 1, 0)**. Toggle the demo's normals overlay and watch them swing as you drag `lift`.

---

### Part 4 · Manipulation & sweep

<small>(~20 min)</small>

---

## Editing a mesh = moving vertices

A polygon modeling editor is, at its core, **the demo's `lift` generalized**: let the user grab any vertex and move it, then recompute the affected normals. Sung's project does exactly that — a draggable sphere per vertex, re-read every frame (`MyMesh_Manipulate.cs` + `7.5/MyMesh.cs`):

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

Move a vertex and its position is stale in nothing else — but its **normal, and its neighbors' normals, must be recomputed**. Geometry and normals travel together.

---

## Sweeping a profile into a surface

Dragging builds arbitrary surfaces one vertex at a time. For a **surface of revolution** there is a better way: take a **profile curve** and **spin it** around an axis. This is MP6's **general cylinder**.

```text
   profile (in the XY plane)          swept around the Y axis
        y                                    ___
        │  ● p3                             /   \      each profile point
        │ ●  p2                            |     |     traces a circle;
        │ ●  p1                            |     |     adjacent circles
        │  ● p0                             \___/      form quad rings
        └────── x                        (a vase / cylinder)
```

Choose P profile points and S rotation steps → a **P × S grid** of vertices, connected into quads exactly like our flat grid — only now the rows wrap around.

---

## The rotation is S03, reused

Each profile point `p` becomes `S` copies, one per rotation step `θ_j = j · Δθ` with `Δθ = 2π / S`. Rotating about the Y axis is the axis-angle rotation from S03:

```text
                [  cos θ   0   sin θ ]
   R_y(θ) =     [    0     1     0   ]        vertex(i, j) = R_y(θ_j) · profile[i]
                [ −sin θ   0   cos θ ]
```

No new math — a surface of revolution is a **profile array crossed with a rotation array**, each rotation one of S03's matrices. Build the vertex grid, split into triangles, compute normals as before.

---

## Degenerate case: the poles

If a profile point lies **on** the axis (radius 0), all `S` rotated copies land on the **same point** — the circle collapses to one vertex, a **pole**. The quads around it are **degenerate**: two corners coincide, so the "triangle" has zero area and **no normal** (its cross product is the zero vector).

- a **sphere** swept pole-to-pole has exactly this at top and bottom
- fix: collapse the pole to **one** vertex and cap with a **triangle fan**, not quads — or keep the profile off the axis

Guard it: our `computeNormals` returns `(0, 1, 0)` when a vertex's summed normal is near-zero length, so a pole never yields a `NaN`.

---

### Part 5 · CDP walkthrough + FP proposal workshop

<small>(~15 min)</small>

---

## The CDP: run MyMesh

Thursday's studio runs Sung's real **polygonal-modeling** projects:

- **`7.3.Simple2x2Mesh`** — the 9-vertex hand build; confirm `MyMesh.cs`'s rows and `t[]` triples match tonight (his fan `(0,3,4)/(0,4,1)` vs the demo's `(0,3,1)/(1,3,4)`)
- **`7.5.NormalAverageSupport`** — `MyMesh_NormalSupport.cs`: `FaceNormal` + the per-vertex `ComputeNormals` sum; normals drawn as segments
- **`7.4.SimpleAttemptAtMaipulation`** — draggable vertex handles; move one, watch normals recompute

Implement-and-replace (S05): you build the mesh — no vertex or index is a black box.

---

## The Final Project proposal

The **Final Project** is your own graphics project, built on the course's machinery — meshes, the camera, transforms. It starts with a **one-paragraph proposal**, workshopped Thursday.

- pick something you can actually build in the remaining weeks — a small scene, a modeling tool, a rendering effect
- state the **idea**, the **core technique** it exercises, and a **minimal deliverable** you are confident you can finish
- small and concrete beats ambitious and vague — a finished small thing outscores an unfinished big one

The proposal **template and requirements are on Canvas** (the single source of truth).

---

## Thursday's proposal workshop

The second half of Thursday — come with a rough idea, leave with a peer-reviewed pitch:

- **brainstorm (timeboxed)** — list candidate ideas, no filtering; then pick one
- **one-paragraph pitch** — the idea, the core technique, the minimal deliverable (template on Canvas)
- **peer-feedback rounds** — pair up, read each other's pitch, ask the two questions that matter: *is the scope finishable?* and *what is the biggest risk?*
- **revise** — tighten the pitch using the feedback before you submit

Bring a laptop and a half-formed idea.

---

## Polygonal modeling, one idea

- A surface is **data**: a **vertex array** plus an **index array** of triangle triples; **winding** picks the front face
- Build a grid **by hand** — `index(row,col) = row·(n+1)+col`, split each quad in two → `(n+1)²` verts, `2n²` tris, `6n²` indices
- **Normals** are cross products of edges, **averaged** per vertex — the same S02 tool, now lighting the surface
- **Editing** moves vertices and recomputes normals; **sweeping** a profile by S03's rotation builds a surface of revolution
- Watch the **poles** — a profile point on the axis is degenerate; guard the normalize

---

## Thursday: the studio + FP workshop

- **MyMesh studio** — run `7.3.Simple2x2Mesh`, `7.5.NormalAverageSupport`, `7.4.SimpleAttemptAtMaipulation`: read the arrays, toggle averaged normals, drag a vertex
- **FP proposal workshop** — timeboxed brainstorm → one-paragraph pitch → peer feedback → revise
- bring a **laptop** and a **half-formed project idea**

---

## Wrap

- **Thursday** — MyMesh CDP studio (`7.3`/`7.5`/`7.4`) + the Final Project proposal workshop
- **MP5 due**; **MP6 goes out** — the polygonal-modeling editor (planar mesh, vertex manipulation, general cylinder); **FP proposal due**. *Details on Canvas.*

A surface is data: vertices and index triples you build, normals you compute from cross products, deformations you apply. You can make geometry now — not just place it and view it.

