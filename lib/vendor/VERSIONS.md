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
