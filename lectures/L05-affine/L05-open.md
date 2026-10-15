<!--
  CSS 551 · L05, Thursday October 15, 2026 (week 3, in person): Affine transformations.
  Mounted by index.html: L05-open.md, ../../topics/affine-transforms.md (~50 min), L05-discuss.md, then
  ../../topics/affine-transforms-supplement.md (~38 min, time permitting).
  Resequenced 2026-10-05: affine moves from Tuesday L06 to this Thursday; the topic is
  condensed to the quiz-day target (60 to 70 slides with this shell).

  Plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Quiz 1, on paper (L03, L04, HW1)                20 min
    0:20  Rotation, finished: the rotation topic on the
          L04 page (L04 ran long on vector geometry)      45 min
    1:05  Opening                                          1 min
    1:06  Affine transformations: homogeneous
          coordinates first, ending on the whole chain
          of a spiral pass (football demo) (topic)        50 min
    1:56  HW2 walk-through (the table only) and wrap       4 min
  Tight: setup help gives first, the supplements are reading, and the football section (~6 min)
  and the demo slides are where the time can flex.
  CUT 2026-10-08: the three discussion questions; the affine topic's Check and predict slides.
  ADDED 2026-10-14: the topic's closing section, One throw, the whole chain (3 slides, ~6 min).
  SPLIT 2026-10-15 (Marcel): the affine topic opens on homogeneous coordinates (what they are and why
  graphics uses them), trimmed to a ~50-minute core with 2D figures; further worked examples, the
  condition number, the polar decomposition, planes, conjugation and the projective worked examples
  moved to the supplement, mounted after the wrap. Rotation finishes first, from the L04 page.

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math; never two "_" on one
  markdown line outside a code fence; no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 5: Affine Transformations**

> Multiplying two 4 × 4 matrices takes 64 multiplications and 48 additions; for two affine matrices, whose last row is (0, 0, 0, 1), you can skip a quarter of that.

<small>computed</small>

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Quiz 1

**Laptops and phones away.** A pencil and the quiz sheet, nothing else.

- **20 minutes**, 5:45 to 6:05 PM: 8 multiple-choice questions, 5 points each
- **Covers**: Lecture 3, building blocks: vectors, MVC, the main loop (Thursday, October 8); Lecture 4, vector geometry (Tuesday, October 13); HW1
- Mark one letter per question in the grid on the first page; only the grid is graded


---

## Tonight

- **Rotation, finished**, on the [Lecture 4 page](../L04-rotation/index.html)
- **Homogeneous coordinates**: one more number, and why graphics uses it
- **Affine maps**: a linear part and a shift; the determinant
- **Composition and the inverse**: order matters; undoing a rigid placement
- **Frames, storage, TRS**; **normals, pivots**, and where affine ends
- **One throw, the whole chain**, live; the **HW2 walk-through**

Reading: [Affine Transformations](../../textbook/affine-transforms.html) in the course text.

