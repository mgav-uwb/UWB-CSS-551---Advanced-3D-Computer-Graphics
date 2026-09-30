---
title: "CSS 551 · Site icons: credits and provenance"
version: "1.0"
status: final
created_by: "Claude"
created_at: "2026-09-29T18:00"
last_modified_by: "Claude"
last_modified_at: "2026-09-29T18:00"
contributors:
  - "Claude"
tags:
  - "css551"
  - "assets"
  - "credits"
  - "site"
related:
  - path: "../../lib/assets/models/CREDITS.md"
    desc: "provenance and terms of the Stanford bunny and dragon meshes these icons render"
  - path: "../overview/CREDITS.md"
    desc: "the licensed photographs used in the lectures"
  - path: "../../lib/site-extras.js"
    desc: "the quotes and facts shown next to the icons, each with its source"
---

# Site icons: credits and provenance

The five pastel icons on the course site are renders made for this course by
`tools/gen-site-icons.mjs` (through `tools/site-icons.html`, three.js in headless Chromium).
They are generated; regenerate rather than edit.

| File | Subject | Data source | Terms |
| ---- | ------- | ----------- | ----- |
| `teapot.png` | The Utah teapot | Martin Newell's Bézier patch data (1975), via three.js `TeapotGeometry` | public-domain dataset |
| `bunny.png` | The Stanford bunny | Stanford Computer Graphics Laboratory, Stanford 3D Scanning Repository (scanned by Greg Turk and Marc Levoy, 1994) | free for research and education, with credit; no implied endorsement |
| `dragon.png` | The Stanford dragon | Stanford Computer Graphics Laboratory, Stanford 3D Scanning Repository (1996) | as above |
| `cornell.png` | A Cornell box | our own scene after Goral, Torrance, Greenberg and Battaile, SIGGRAPH 1984 | original render |
| `whitted.png` | Spheres over a checkerboard | our own scene after Whitted, “An Improved Illumination Model for Shaded Display,” CACM 1980 | original render |

---

## Change Log

| Version | Date             | Author | Summary |
| ------- | ---------------- | ------ | ------- |
| 1.0     | 2026-09-29T18:00 | Claude | Five pastel icons rendered from the course's own models and scenes. |
