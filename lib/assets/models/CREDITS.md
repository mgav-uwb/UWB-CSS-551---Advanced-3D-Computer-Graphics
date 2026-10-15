---
title: "CSS 551 · Model Assets: Credits & Provenance"
version: "1.8"
status: draft
created_by: "Claude"
created_at: "2026-07-18T14:00"
last_modified_by: "Claude"
last_modified_at: "2026-10-15T01:30"
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

# Model Assets: Credits & Provenance

Real-mesh demo assets used across the S01 overview deck and later sessions
(`mesh-view`, `our-scene`, `lod`, `illumination`, `uv-placement`, `bump-map`).
Each source model is baked into four LOD levels (`l0`–`l3`) as compact
`.mesh.bin` files (format v1, see `prep-models.mjs`).

## Football (football/)

- **Model:** "Football" by **rnepb13**
- **Source:** BlendSwap, `http://www.blendswap.com/blends/view/58039` (Blender 2.63, published 2012-10-29)
- **Terms:** Creative Commons Attribution 3.0: any use, commercial included, as long as rnepb13 is credited.
  `football/BLENDSWAP_LICENSE.txt` is the license as it came with the model.
- **Changes:** converted to glTF and OBJ by `tools/convert-football-blend.py` (subdivision applied at level 2,
  materials rebuilt as leather, white stripe and laces, textures resized to 1024 × 1024 JPEG, scaled to 0.28 m,
  y up, long axis on z, laces on +y).
- **Local files:** `football/football.glb`, `football/football.obj`, `football/football.mtl`,
  `football/football_albedo.jpg`, `football/football_normal.jpg`, `football/BlenderFootball.blend`,
  `football/BLENDSWAP_LICENSE.txt`, `football/FOOTBALL.md` (the full-size textures, the .psd and the downloaded
  archive are kept out of the published site)

## Field drawing (field/)

- **What:** `field/huskies_field.jpg`, a drawing of the Husky Stadium field at the University of Washington,
  supplied by Marcel (`Washington-Huskies.jpeg`, private copy only); its original source is not recorded. The
  logos and marks on it belong to their owners.
- **Changes:** the white background outside the field-level outline filled with dark ground
  (`tools/make-field-texture.py`); the plane's size and placement are in `field/FIELD.md`.

## Stadium (stadium/)

- **Not used (2026-10-15):** the football demo drew too slowly with it and went back to the field drawing. The
  converted files stay in the course's private copy with their converter; they are no longer published.

- **Model:** "Soccer and American football stadium" by **ericchip1983**
- **Source:** BlendSwap, `http://www.blendswap.com/blends/view/74526`
- **Terms:** Creative Commons Attribution 3.0: any use, commercial included, as long as ericchip1983 is credited.
  `stadium/74526 - Soccer and American football stadium  - License.html` is the license page as it came.
- **Changes:** converted by `tools/convert-stadium-blend.py` (American-football layer only, modifiers applied,
  lightened to about 108,000 faces, materials rebuilt, the field texture on a plane at the real field size, meters,
  long axis on z, field center at the origin), then compressed with gltfpack (meshopt).
- **Local files:** `stadium/stadium.glb`, `stadium/stadium.obj`, `stadium/stadium.mtl`, `stadium/stadium_*.jpg`,
  `stadium/STADIUM.md`, the license page and `preview_74526.jpg` (the 91 MB `.blend` and the downloaded archive are
  kept out of the repository and the published site)

## Aircraft (aircraft/)

The frame, files, sizes and the Cessna's hinges are in `aircraft/AIRCRAFT.md`.

- **Cessna 208 Caravan** (`aircraft/cessna/`): "Cessna 208 Caravan (Wheels version)" by **Helijah** (Emmanuel
  Baranger), BlendSwap blend 66877, **CC0** (`aircraft/cessna/BLENDSWAP_LICENSE.txt`; the author's FlightGear
  read-me says GPL).
- **Harrier II** (`aircraft/harrier/`): "Harrier II" by **panko10**, BlendSwap, `https://blendswap.com/blend/30230`,
  **CC BY 3.0**.
- **Airbus A380** (`aircraft/A380/`): "Airbus-A380" by **theMaker**, BlendSwap blend 87811 (now
  `https://blendswap.com/blend/19434`), **CC BY-SA 3.0**, fan art, no commercial use (`aircraft/A380/87811 -
  LICENSE.html`); the converted model is under the same license.
- **Changes:** converted by `tools/convert-aircraft-blend.py` (one frame: nose +z, top +y, meters, centered; the
  Cessna's outside only, with its moving parts as hinged nodes; the Harrier without its missiles and bombs; the
  Harrier and A380 lightened; materials rebuilt), then compressed with gltfpack (meshopt).
- **Local files:** `<name>.glb`, `<name>.obj`, `<name>.mtl` and the JPEG textures in each folder, the license
  files, `AIRCRAFT.md` (the `.blend` files, archives and the Cessna's original textures are kept out of the published
  site)

## Stanford Bunny

- **Model:** Stanford Computer Graphics Laboratory
- **Source:** Stanford 3D Scanning Repository, `https://graphics.stanford.edu/data/3Dscanrep/`
- **File used:** `bunny/reconstruction/bun_zipper.ply` (35,947 vertices, 69,451 triangles: full resolution, used as `bunny.l3`)
- **Terms:** free to use for research and education; do not use in ways that
  misrepresent the Stanford Computer Graphics Laboratory (no implied
  endorsement, no commercial resale of the raw data). Credit line above
  must accompany any use.
- **Local files:** `bunny.l0.mesh.bin` … `bunny.l3.mesh.bin`, `bunny.pm.bin`

### bunny.pm.bin: Progressive Mesh stream

- **Model:** Stanford Computer Graphics Laboratory (derived from `bunny.l3.mesh.bin` above; same terms).
- **Method:** progressive mesh per H. Hoppe, "Progressive Meshes", SIGGRAPH 1996:
  greedy half-edge collapses ordered by Garland–Heckbert quadric error, recorded
  as vertex splits (base mesh 500 triangles / 1,368 vertices + 34,579 splits
  replaying to the full 69,451 triangles / 35,947 vertices).
- **Generator:** `tools/build-pm.mjs` (PMB1 format; runtime `lib/core/pm.js`).
  Regenerate with `cd tools && npm run build:pm` (deterministic, byte-stable).

### bunny.mg.l0..l4: adaptive multiresolution levels

- **Model:** Stanford Computer Graphics Laboratory (derived from `bunny.l3.mesh.bin` above; same terms).
- **Method:** after Gavriliu, Carranza, Breen & Barr, IEEE Visualization 2001 (mesh-graph variant):
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
  LOD budget, see table below)
- **Terms:** same as bunny above (free for research/education; credit
  required; no misrepresenting use).
- **Local files:** `dragon.l0.mesh.bin` … `dragon.l3.mesh.bin`

## Utah Teapot

- **Data:** Martin Newell, 1975: the original teapot control-point dataset
  is in the public domain.
- **Geometry generator:** `TeapotGeometry.js`, vendored from the three.js
  examples (MIT license). Vendored in Task B2; recorded in
  `../vendor/VERSIONS.md` when added.
- Not distributed as a `.mesh.bin`: generated procedurally at runtime from
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
| 1.8 | 2026-10-15T01:30 | Claude | The field drawing (Husky Stadium, supplied by Marcel) replaces the stadium in the football demo; the stadium is no longer published. |
| 1.7 | 2026-10-15T01:00 | Claude | The aircraft: a Cessna 208 by Helijah (CC0), a Harrier II by panko10 (CC BY 3.0) and an A380 by theMaker (CC BY-SA 3.0, non-commercial), from BlendSwap, converted by tools/convert-aircraft-blend.py. |
| 1.6 | 2026-10-14T23:50 | Claude | The stadium: "Soccer and American football stadium" by ericchip1983 (BlendSwap, CC BY 3.0), converted by tools/convert-stadium-blend.py. |
| 1.5 | 2026-10-14T23:45 | Claude | The football is "Football" by rnepb13 (BlendSwap, CC BY 3.0), converted by tools/convert-football-blend.py; the generated ball is retired. |
| 1.4 | 2026-10-14T23:00 | Claude | The football model (GLB, OBJ + MTL, PNG texture) for both tracks, generated by tools/gen-football-model.mjs. |
| 1.3 | 2026-09-30T18:00 | Claude | Em-dashes replaced with colons, commas and parentheses (house style); no content change. |
| 1.2 | 2026-07-19T04:30 | Claude | Added bunny.mg.l0..l4 adaptive multiresolution levels (after Gavriliu, Carranza, Breen & Barr, IEEE Visualization 2001 (mesh-graph variant), DOI 10.1109/VISUAL.2001.964524; built from bunny.l3 by tools/build-mg2001.mjs): provenance entry, size-table rows, related link. |
| 1.1 | 2026-07-19T02:20 | Claude | Added bunny.pm.bin progressive-mesh stream (Hoppe 1996 method, built from bunny.l3 by tools/build-pm.mjs): provenance entry, size-table row, related link. |
| 1.0 | 2026-07-18T14:00 | Claude | Initial credits: bunny + dragon (Stanford 3D Scanning Repository) provenance/terms, teapot (Newell, public domain) note, generated-LOD size table. |
