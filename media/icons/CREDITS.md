---
title: "CSS 551 · Site icons: credits and provenance"
version: "1.2"
status: final
created_by: "Claude"
created_at: "2026-09-29T18:00"
last_modified_by: "Claude"
last_modified_at: "2026-09-29T21:30"
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
| `teddy.png` | A furry teddy | our own shell-fur scene after Kajiya and Kay, “Rendering Fur with Three Dimensional Textures,” SIGGRAPH 1989 (the original image is not reproduced) | original render |
| `voxel.png` | A voxel world | our own scene | original render |

## Film and game stills

Cropped to 640 × 640 from freely licensed files; the credit line must accompany any use.

| File | Subject | Author | Source | License | Credit line |
| ---- | ------- | ------ | ------ | ------- | ----------- |
| `film-bbb.jpg` | Big Buck Bunny (2008), the bunny | Blender Foundation (Project Peach) | https://commons.wikimedia.org/wiki/File:Big.Buck.Bunny.-.Bunny.Portrait.png (via `media/overview/open-movie-still.jpg`) | CC BY 3.0 | © Blender Foundation · bigbuckbunny.org · CC BY 3.0 |
| `film-sintel.jpg` | Sintel (2010), the heroine | Blender Foundation (Project Durian) | https://commons.wikimedia.org/wiki/File:Sintel-screenshot-4.jpg | CC BY 3.0 | © Blender Foundation · sintel.org · CC BY 3.0 |
| `game-supertuxkart.jpg` | SuperTuxKart 0.9, the start line | STK dev team | https://commons.wikimedia.org/wiki/File:Supertuxkart-0.9-screenshot-2.jpg | CC BY 3.0 | SuperTuxKart team · CC BY 3.0 · via Wikimedia Commons |
| `game-0ad.jpg` | 0 A.D. alpha 25, a Spartan city | Wildfire Games | https://commons.wikimedia.org/wiki/File:0_A.D._alpha_25_-_playing_as_Spartans.jpg | CC BY-SA 3.0 | Wildfire Games · CC BY-SA 3.0 · via Wikimedia Commons |

`game-0ad.jpg` carries a share-alike obligation: a derivative of it stays under CC BY-SA 3.0 or a compatible license.

---

## Change Log

| Version | Date             | Author | Summary |
| ------- | ---------------- | ------ | ------- |
| 1.2     | 2026-09-29T21:30 | Claude | Two more renders: a shell-fur teddy after Kajiya and Kay, and a pastel voxel world. |
| 1.1     | 2026-09-29T21:00 | Claude | Four film and game stills (Big Buck Bunny, Sintel, SuperTuxKart, 0 A.D.), freely licensed and credited. |
| 1.0     | 2026-09-29T18:00 | Claude | Five pastel icons rendered from the course's own models and scenes. |
