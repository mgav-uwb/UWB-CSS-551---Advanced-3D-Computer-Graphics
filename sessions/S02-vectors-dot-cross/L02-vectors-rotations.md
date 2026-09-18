<!--
  CSS 551 · Lectures 2 & 3 (one Tuesday, week 3): Vectors and Rotations.
  Plan B (2026-09-18; planning/css551-au26-schedule-2026-09-18.md) merged the
  vectors and rotation Tuesdays into one evening; the Thursday labs (lab02
  vectors EX1-EX3, then lab03 projection EX4-EX6 a week later) are unchanged.

  COMPOSITION (topic decks): this session is a thin shell. index.html mounts,
  in order: L02-vectors-rotations.md (title + tonight),
  ../../topics/vectors-dot-cross.md (~55 min), ../../topics/rotation-
  quaternions.md (~50 min), then L02-close.md (Thursday + wrap). The former
  single-file decks L02-vectors-dot-cross.md and L03-rotation-quaternions.md
  are retired; their worked numbers and demos live on in the two topics.

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence.

  DEMO EMBEDS (two, under the page's 200px crop):
   - vectors:  data-demo="dot-cross"  data-controls="ax,ay,bx,by"
   - rotation: data-demo="axis-angle" data-controls="angle"

  Session plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Intro                                    3 min
    0:03  Vectors: dot, cross, lines, planes      55 min  (topic)
    0:58  Rotation: axis-angle, quaternions       50 min  (topic)
    1:48  Thursday + wrap                          5 min
    1:53  end (+ 7 min buffer; the dot-product worked slides are the ones to pace)
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lectures 2 &amp; 3: Vectors and Rotations**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>

---

## Tonight

- **Vectors**: a displacement, not a place; the **dot product** (how aligned: angle, projection, which side); the **cross product** (what is perpendicular: a normal, an area, a frame); **lines and planes** as a point plus a direction or a normal
- **Rotation**: a rotation is where the axes land; **axis-angle** (Rodrigues) from the projection split and a cross; **quaternions**, the engine's real format; **Euler angles** and gimbal lock

<small>Thursday's studio builds EX1–EX3 from the first hour. MP1 is due this week; MP2 goes out.</small>

