---
title: "CSS 551 · Vendored Library Versions"
version: "1.1"
status: draft
created_by: "Claude"
created_at: "2026-07-11T00:00"
last_modified_by: "Claude"
last_modified_at: "2026-07-18T00:00"
contributors:
  - "Claude"
tags:
  - "css551"
  - "vendor"
  - "provenance"
  - "licensing"
related:
  - path: "../assets/models/CREDITS.md"
    desc: "model asset credits/provenance (Stanford bunny/dragon, Utah teapot data)"
  - path: "../../tools/prep-models.mjs"
    desc: "offline pipeline that consumes the vendored three.js (PLYLoader) to bake model assets"
  - path: "../core/models.js"
    desc: "runtime loader that consumes the vendored TeapotGeometry.js"
---

# Vendored versions

- three.js 0.170.0 (build/three.module.js) — fetched 2026-07-11 from unpkg
- @mkkellogg/gaussian-splats-3d 0.4.7 (gaussian-splats-3d.module.js) — fetched
  2026-07-12 via `npm pack @mkkellogg/gaussian-splats-3d` (npm registry).
  MIT license (gaussian-splats-3d.LICENSE, copied verbatim from the package).
  Peer dependency `three >=0.160.0` — satisfied by the 0.170.0 above.
  ONE hand-edit: the two `from 'three'` bare-specifier imports at the top of
  the file are rewritten to `from './three.module.js'` (this repo has no
  bundler/import map); see the comment left in place at the top of the file.
  No other changes. .module.js.map intentionally not vendored (matches the
  three.module.js precedent above — source maps aren't needed at runtime).
- three.js `examples/jsm/geometries/TeapotGeometry.js` (vendored as
  `TeapotGeometry.js`) — fetched 2026-07-18 from unpkg at the pinned 0.170.0
  tag (`https://unpkg.com/three@0.170.0/examples/jsm/geometries/TeapotGeometry.js`)
  so it matches the three.module.js build above exactly. MIT license (three.js
  examples). Tessellates Martin Newell's 1975 teapot control-point dataset
  (public domain) into triangles at runtime — no data file is vendored
  separately, the control points live in this source file. ONE hand-edit: the
  `from 'three'` bare-specifier import at the top is rewritten to
  `from './three.module.js'`; see the comment left in place at the top of the
  file. No other changes.

---

## Change Log

| Version | Date             | Author | Summary       |
| ------- | ---------------- | ------ | ------------- |
| 1.1     | 2026-07-18T00:00 | Claude | Task B2: vendored `TeapotGeometry.js` (three.js 0.170.0 examples, MIT); added frontmatter/endmatter to this file. |
| 1.0     | 2026-07-11T00:00 | Claude | Initial: three.js 0.170.0, @mkkellogg/gaussian-splats-3d 0.4.7. |
