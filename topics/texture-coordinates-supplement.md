<!--
  CSS 551 · TOPIC DECK (supplement): Texture coordinates, further (~5 min, 3 slides).
  Mounted after the wrap of the lecture that mounts texture-coordinates.md, and covered time
  permitting: no homework needs it, and every graded idea is in the topic.

  TEACHES: how much a map stretches (1/cos φ on a spherical map, 1/cos α on a planar one); hair
  at film scale (Brave, Taz; guides and cards in games).
  NEEDS:   texture-coordinates.md, mounted before it (the projections, the checker).
  DEMOS:   none.
  FIGURES: none.
  NUMBERS: 1/cos φ recomputed by node (1.00, 1.15, 1.41, 2.00, 5.76); Brave from fxguide's feature.
  SOURCE:  moved 2026-11-05 from texture-coordinates.md (Marcel: "move to supplement"), the
           text unchanged except that the formulas are typeset.

  reveal.js: FLAT; notes follow "Note:" and stay plain text. Display math is a raw <div class="tex">
  block typeset by MathJax (lib/deck-math.js; TeX inside, the ASCII form as aria-label, no blank line
  inside); inline math is a code span written `$...$`. Never two "_" on one markdown line outside a
  code fence or code span; paths relative to the lecture page.
-->

### Supplement: texture coordinates, further

<small>(~5 min, time permitting) · reading: <a href="../../textbook/texture-mapping.html#unwrap">Texture Mapping, Section 2</a> and <a href="../../textbook/animation.html">Animation, Section 14</a></small>


---

## Distortion: how much a map stretches

A **checker** texture shows the stretch: squares stay square only where the map is faithful. On a spherical map, a ring at latitude `$\phi$` has circumference `$2\pi \cos\phi$`, yet it spans all of `$u$`:

<div class="tex" role="img" aria-label="horizontal stretch of the texture:     1 / cos φ">
\[
\text{horizontal stretch of the texture} = \frac{1}{\cos\phi}
\]
</div>

| `$\phi$` | `$0^\circ$` | `$30^\circ$` | `$45^\circ$` | `$60^\circ$` | `$80^\circ$` | `$90^\circ$` |
| -------- | ----------- | ------------ | ------------ | ------------ | ------------ | ------------ |
| stretch | 1.00 | 1.15 | 1.41 | 2.00 | 5.76 | `$\infty$` (the pole) |

- a planar projection stretches a face tilted by `$\alpha$` from the projection plane by `$1 / \cos\alpha$`: 2 at `$60^\circ$`, a streak at `$90^\circ$`
- unwrapping places seams to keep every chart's stretch near 1


---

## Hair at film scale

- **Brave** (Pixar, 2012): Merida has more than **1,500** sculpted curls making about **111,700** hairs, simulated with a new solver, **Taz**
- film simulates **every** strand, with stiffness, twist and hair-to-hair collision; games simulate **guides** or a few cards
- the trade: accuracy per frame against a frame budget

