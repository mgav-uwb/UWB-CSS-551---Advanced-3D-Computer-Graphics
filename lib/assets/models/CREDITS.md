---
title: "CSS 551 · Model Assets — Credits & Provenance"
version: "1.0"
status: draft
created_by: "Claude"
created_at: "2026-07-18T14:00"
last_modified_by: "Claude"
last_modified_at: "2026-07-18T14:00"
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
- **Local files:** `bunny.l0.mesh.bin` … `bunny.l3.mesh.bin`

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
| 1.0 | 2026-07-18T14:00 | Claude | Initial credits: bunny + dragon (Stanford 3D Scanning Repository) provenance/terms, teapot (Newell, public domain) note, generated-LOD size table. |
