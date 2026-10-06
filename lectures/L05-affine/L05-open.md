<!--
  CSS 551 · L05, Thursday October 15, 2026 (week 3, in person): Affine transformations.
  Mounted by index.html: L05-open.md, ../../topics/affine-transforms.md (~70 min), L05-discuss.md.
  Resequenced 2026-10-05: affine moves from Tuesday L06 to this Thursday; the topic is
  condensed to the quiz-day target (60 to 70 slides with this shell).

  Plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Quiz 1, on paper (L03, L04, HW1)                20 min
    0:20  Opening                                          2 min
    0:22  Affine transformations over homogeneous
          coordinates (topic)                             70 min
    1:32  Discussion: three questions                     14 min
    1:46  HW2 walk-through and wrap                       14 min

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
- **Covers**: Lecture 3, building blocks: vectors, MVC, the main loop (Thursday, October 8); Lecture 4, rotation (Tuesday, October 13); HW1
- Mark one letter per question in the grid on the first page; only the grid is graded


---

## Tonight

- **Affine maps**: a linear part and a shift; what they preserve; the determinant and mirrors
- **Homogeneous coordinates**: w = 1 points, w = 0 vectors; composition and inverse by blocks; conditioning
- **Frames and spaces**: a matrix is a frame; storage layouts; TRS; normals and planes by the inverse transpose
- **Pivots, and where affine ends**: the conjugation sandwich; the last row and the vanishing point
- **Discussion**, then the **HW2 walk-through**

Reading: [Affine Transformations](../../textbook/affine-transforms.html) in the course text.

