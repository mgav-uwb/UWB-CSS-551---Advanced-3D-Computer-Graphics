---
title: "CSS 551 · Model Assets — Credits & Provenance"
version: "1.2"
status: draft
created_by: "Claude"
created_at: "2026-07-18T14:00"
last_modified_by: "Claude"
last_modified_at: "2026-07-19T04:30"
contributors:
  - "Claude"
tags:
  - "css551"
  - "assets"
  - "models"
  - "credits"
  - "licensing"
related:
  - path: "../vendor/VERSIONS.md"
    desc: "vendored library versions (three.js, gaussian-splats-3d); teapot generator (TeapotGeometry.js) recorded there when vendored in B2"
  - path: "../../tools/prep-models.mjs"
    desc: "the offline pipeline that generated the bunny/dragon .mesh.bin files listed below"
  - path: "../../tools/build-pm.mjs"
    desc: "the offline builder that generated the bunny.pm.bin progressive-mesh stream listed below"
  - path: "../../tools/build-mg2001.mjs"
    desc: "the offline builder that generated the bunny.mg.l0..l4 adaptive multiresolution levels listed below"
---

# Model Assets — Credits & Provenance

Real-mesh demo assets used across the S01 overview deck and later sessions
(`mesh-view`, `our-scene`, `lod`, `illumination`, `uv-placement`, `bump-map`).
Each source model is baked into four LOD levels (`l0`–`l3`) as compact
`.mesh.bin` files (format v1 — see `prep-models.mjs`).

## Stanford Bunny

- **Model:** Stanford Computer Graphics Laboratory
- **Source:** Stanford 3D Scanning Repository, `https://graphics.stanford.edu/data/3Dscanrep/`
- **File used:** `bunny/reconstruction/bun_zipper.ply` (35,947 vertices, 69,451 triangles — full resolution, used as `bunny.l3`)
- **Terms:** free to use for research and education; do not use in ways that
  misrepresent the Stanford Computer Graphics Laboratory (no implied
  endorsement, no commercial resale of the raw data). Credit line above
  must accompany any use.
- **Local files:** `bunny.l0.mesh.bin` … `bunny.l3.mesh.bin`, `bunny.pm.bin`

### bunny.pm.bin — Progressive Mesh stream

- **Model:** Stanford Computer Graphics Laboratory (derived from `bunny.l3.mesh.bin` above; same terms).
- **Method:** progressive mesh per H. Hoppe, "Progressive Meshes", SIGGRAPH 1996 —
  greedy half-edge collapses ordered by Garland–Heckbert quadric error, recorded
  as vertex splits (base mesh 500 triangles / 1,368 vertices + 34,579 splits
  replaying to the full 69,451 triangles / 35,947 vertices).
- **Generator:** `tools/build-pm.mjs` (PMB1 format; runtime `lib/core/pm.js`).
  Regenerate with `cd tools && npm run build:pm` (deterministic, byte-stable).

### bunny.mg.l0..l4 — adaptive multiresolution levels

- **Model:** Stanford Computer Graphics Laboratory (derived from `bunny.l3.mesh.bin` above; same terms).
- **Method:** after Gavriliu, Carranza, Breen & Barr, IEEE Visualization 2001 (mesh-graph variant) —
  "Fast Extraction of Adaptive Multiresolution Meshes with Guaranteed
  Properties from Volumetric Data", DOI 10.1109/VISUAL.2001.964524. The
  paper's candidate-vertex connectivity graph is the input mesh's
  vertex/edge graph; Stage 1 builds a simple independent disk covering
  (Dijkstra balls, wavefront simplicity test, ≤×2 radius-ratio
  enforcement), the mesh is the dual of the graph-Voronoi partition of the
  disk centers, and Stage 2 refines by the max-distance error metric,
  emitting a level each time the global max error halves. Vertices are
  selected input vertices (never invented); UVs carried from the input.
- **Generator:** `tools/build-mg2001.mjs` (format v1; validating tests
  `lib/tests/mg2001.test.mjs`). Regenerate with `cd tools && npm run
  build:mg2001` (deterministic, byte-stable).

## Stanford Dragon

- **Model:** Stanford Computer Graphics Laboratory
- **Source:** Stanford 3D Scanning Repository, `https://graphics.stanford.edu/data/3Dscanrep/`
- **File used:** `dragon_recon/dragon_vrip.ply` (437,645 vertices, 871,414
  triangles source; simplified to ~80,000 triangles for `dragon.l3` per the
  LOD budget — see table below)
- **Terms:** same as bunny above (free for research/education; credit
  required; no misrepresenting use).
- **Local files:** `dragon.l0.mesh.bin` … `dragon.l3.mesh.bin`

## Utah Teapot

- **Data:** Martin Newell, 1975 — the original teapot control-point dataset
  is in the public domain.
- **Geometry generator:** `TeapotGeometry.js`, vendored from the three.js
  examples (MIT license). Vendored in Task B2; recorded in
  `../vendor/VERSIONS.md` when added.
- Not distributed as a `.mesh.bin` — generated procedurally at runtime from
  the vendored geometry class, so no baked file ships here.

## Generated LOD levels (actuals from `tools/prep-models.mjs`)

| File | Triangles | Vertices | Size (KB) |
| --- | ---: | ---: | ---: |
| bunny.l3.mesh.bin | 69,451 | 35,947 | 1,937 |
| bunny.pm.bin | 500 base → 69,451 | 1,368 base → 35,947 | 833 |
| bunny.mg.l0.mesh.bin | 145 | 76 | 4 |
| bunny.mg.l1.mesh.bin | 300 | 154 | 8 |
| bunny.mg.l2.mesh.bin | 704 | 365 | 20 |
| bunny.mg.l3.mesh.bin | 1,735 | 894 | 48 |
| bunny.mg.l4.mesh.bin | 3,879 | 1,977 | 107 |
| bunny.l2.mesh.bin | 13,889 | 7,024 | 382 |
| bunny.l1.mesh.bin | 3,472 | 1,796 | 97 |
| bunny.l0.mesh.bin | 868 | 454 | 24 |
| dragon.l3.mesh.bin | 79,996 | 40,958 | 2,217 |
| dragon.l2.mesh.bin | 15,988 | 8,526 | 454 |
| dragon.l1.mesh.bin | 3,992 | 2,465 | 124 |
| dragon.l0.mesh.bin | 1,324 | 1,119 | 51 |

Regenerate with `cd tools && npm run prep:models` (downloads are cached in
`tools/.model-cache/`, which is gitignored and not committed).

---

## Change Log

| Version | Date | Author | Summary |
| --- | --- | --- | --- |
| 1.2 | 2026-07-19T04:30 | Claude | Added bunny.mg.l0..l4 adaptive multiresolution levels (after Gavriliu, Carranza, Breen & Barr, IEEE Visualization 2001 (mesh-graph variant), DOI 10.1109/VISUAL.2001.964524; built from bunny.l3 by tools/build-mg2001.mjs): provenance entry, size-table rows, related link. |
| 1.1 | 2026-07-19T02:20 | Claude | Added bunny.pm.bin progressive-mesh stream (Hoppe 1996 method, built from bunny.l3 by tools/build-pm.mjs): provenance entry, size-table row, related link. |
| 1.0 | 2026-07-18T14:00 | Claude | Initial credits: bunny + dragon (Stanford 3D Scanning Repository) provenance/terms, teapot (Newell, public domain) note, generated-LOD size table. |
