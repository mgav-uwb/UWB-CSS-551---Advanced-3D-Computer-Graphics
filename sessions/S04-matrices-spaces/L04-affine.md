<!--
  CSS 551 · Lecture 4 (week 4): Affine Transformations over Homogeneous Coordinates.
  Reframed 2026-09-18 (Plan B; planning/css551-au26-schedule-2026-09-18.md):
  the former "Matrices & coordinate spaces" deck is now the affine-transforms
  topic, with the same worked numbers and the same trs-order demo. The
  Thursday that follows this Tuesday is lab03 (projection EX4-EX6, MP2 due,
  MP3 out); the matrix studio (lab04) is the Thursday after.

  COMPOSITION (topic decks): index.html mounts, in order: L04-affine.md
  (title + tonight), ../../topics/affine-transforms.md (~95 min), then
  L04-close.md (Thursday + wrap).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence; backtick names
  with underscores (`R_y`, `T·R`).

  DEMO EMBED (one, under the page's 200px crop):
   - data-demo="trs-order" data-controls="tx,ry"

  Session plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Intro                                              3 min
    0:03  Affine maps                                       25 min  (topic)
    0:28  Homogeneous coordinates (composition, inverse)    25 min  (topic; demo)
    0:53  Frames and spaces (TRS, normals)                  20 min  (topic)
    1:13  Pivots, and where affine ends                     20 min  (topic)
    1:33  Thursday + wrap                                    5 min
    1:38  end (+ 22 min buffer)
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 4: Affine Transformations over Homogeneous Coordinates**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>

---

## Tonight

- **Affine maps**: `A x + t`: what the family preserves (lines, parallels, ratios) and does not; the determinant; points versus displacements; why composing them makes order matter
- **Homogeneous coordinates**: one `4×4`, `[A t; 0 1]`; `w = 1` points and `w = 0` vectors; composition and the inverse as **block formulas**, with `T·R` versus `R·T` live
- **Frames and spaces**: a matrix is a frame; object and world space; `TRS`, the 9-number case engines store, and the shear it cannot; normals by the inverse transpose
- **Pivots, and where affine ends**: `T(p)·R·T(−p)`; the last row, projective maps, the perspective matrix

<small>Thursday's studio is the projection trio (EX4–EX6). MP2 is due this week; MP3 goes out.</small>

