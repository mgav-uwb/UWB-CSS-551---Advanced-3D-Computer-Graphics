---
title: "CSS 551 · Site icons: credits and provenance"
version: "1.6"
status: final
created_by: "Claude"
created_at: "2026-09-29T18:00"
last_modified_by: "Claude"
last_modified_at: "2026-09-30T13:00"
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
| `furbunny.png` | A fur bunny | the Stanford bunny (Stanford Computer Graphics Laboratory) grown with about 110,000 strands, lit with the Kajiya-Kay model; after Kajiya and Kay (SIGGRAPH 1989) and Augusto Roman's fur bunny (Stanford CS348b rendering competition, 2003, whose image is not reproduced) | original render |
| `voxel.png` | A voxel world | our own scene | original render |
| `sim-splash.webp` | A splash, animated (about 2.6 s loop, 79 frames, 640 × 640) | our own simulation and render: a wave-equation height field after Kass and Miller (SIGGRAPH 1990), a crown sheet shedding ballistic droplets and a Worthington jet, physically based water material (`tools/site-splash.html`, `tools/gen-site-splash.mjs`); `sim-splash.png` stays as the still | original render |

## Film and game stills

Cropped to 640 × 640 from freely licensed files; the credit line must accompany any use.

| File | Subject | Author | Source | License | Credit line |
| ---- | ------- | ------ | ------ | ------- | ----------- |
| `film-bbb.jpg` | Big Buck Bunny (2008), the bunny | Blender Foundation (Project Peach) | https://commons.wikimedia.org/wiki/File:Big.Buck.Bunny.-.Bunny.Portrait.png (via `media/overview/open-movie-still.jpg`) | CC BY 3.0 | © Blender Foundation · bigbuckbunny.org · CC BY 3.0 |
| `film-sintel.jpg` | Sintel (2010), the heroine | Blender Foundation (Project Durian) | https://commons.wikimedia.org/wiki/File:Sintel-screenshot-4.jpg | CC BY 3.0 | © Blender Foundation · sintel.org · CC BY 3.0 |
| `game-supertuxkart.jpg` | SuperTuxKart 0.9, the start line | STK dev team | https://commons.wikimedia.org/wiki/File:Supertuxkart-0.9-screenshot-2.jpg | CC BY 3.0 | SuperTuxKart team · CC BY 3.0 · via Wikimedia Commons |
| `game-0ad.jpg` | 0 A.D. alpha 25, a Spartan city | Wildfire Games | https://commons.wikimedia.org/wiki/File:0_A.D._alpha_25_-_playing_as_Spartans.jpg | CC BY-SA 3.0 | Wildfire Games · CC BY-SA 3.0 · via Wikimedia Commons |
| `photo-bullet-time-rig.jpg` | A bullet-time camera rig around a dancer (Sony RX0 launch, 2017) | Sony Europe | https://commons.wikimedia.org/wiki/File:Sony_RX0_Lifestyle_Bullet-time_ballet_EU03.jpg | CC BY 4.0 | Sony Europe · CC BY 4.0 · via Wikimedia Commons |

`game-0ad.jpg` carries a share-alike obligation: a derivative of it stays under CC BY-SA 3.0 or a compatible license.

## Film and VR homage renders

Our own renders, made by `tools/gen-site-icons-film.mjs` (through `tools/site-icons-film.html`) from
primitives and procedural geometry. Each shows a technique, not the film's imagery.

| File | Subject | Terms |
| ---- | ------- | ----- |
| `film-homage-liquid-metal.png` | Liquid metal | our own render, after Terminator 2: Judgment Day (1991); no frame, character or logo from the film is reproduced |
| `film-homage-bullet-time.png` | Bullet time | our own render, after The Matrix (1999); no frame, character or logo from the film is reproduced |
| `film-homage-lamp.png` | An articulated desk lamp | our own render, after Luxo Jr. (1986); a generic lamp; no frame, character or logo from the film is reproduced |
| `film-homage-tentacles.png` | Simulated tentacles | our own render, after Pirates of the Caribbean: Dead Man's Chest (2006); no frame, character or logo from the film is reproduced |
| `film-homage-mocap.png` | Performance capture | our own render, after The Lord of the Rings (2002) and Avatar (2009); no frame, character or logo from the films is reproduced |
| `film-homage-vr.png` | A stereo pair | our own render, after head-mounted displays (Sutherland, 1968) |

---

## Change Log

| Version | Date             | Author | Summary |
| ------- | ---------------- | ------ | ------- |
| 1.6     | 2026-09-30T13:00 | Claude | The splash tile becomes an animated loop (`sim-splash.webp`): a height-field wave simulation with a crown, droplets and a Worthington jet. |
| 1.5     | 2026-09-30T11:00 | Claude | A real bullet-time rig photo (Sony Europe, CC BY 4.0), cropped square. |
| 1.4     | 2026-09-30T10:00 | Claude | The shell-fur teddy replaced by a strand-fur bunny (about 110,000 hairs, Kajiya-Kay shading). |
| 1.3     | 2026-09-29T23:30 | Claude | Six homage renders of film effects and VR (liquid metal, bullet time, lamp, tentacles, performance capture, stereo pair). |
| 1.2     | 2026-09-29T21:30 | Claude | Two more renders: a shell-fur teddy after Kajiya and Kay, and a pastel voxel world. |
| 1.1     | 2026-09-29T21:00 | Claude | Four film and game stills (Big Buck Bunny, Sintel, SuperTuxKart, 0 A.D.), freely licensed and credited. |
| 1.0     | 2026-09-29T18:00 | Claude | Five pastel icons rendered from the course's own models and scenes. |
