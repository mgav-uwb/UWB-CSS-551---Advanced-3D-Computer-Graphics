<!--
  CSS 551 · L05, Thursday October 15, 2026 (week 3, in person): Rotation.
  Mounted by index.html: L05-open.md, ../../topics/rotation-quaternions.md (~78 min), L05-discuss.md.

  Plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Quiz 1, on paper (L03, L04, HW1)            20 min
    0:20  Opening                                      2 min
    0:22  Rotation: matrices, axis-angle, quaternions,
          Euler angles (topic)                        78 min
    1:40  Discussion: two questions                   12 min
    1:52  HW2 walk-through and wrap                    8 min

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math; never two "_" on one
  markdown line outside a code fence; no em-dashes.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 5: Rotation**

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Quiz 1

**Laptops and phones away.** A pencil and the quiz sheet, nothing else.

- **20 minutes**, 5:45 to 6:05 PM: 8 multiple-choice questions, 5 points each
- **Covers**: Lecture 3, the interactive loop, MVC and the tool (Thursday, October 8); Lecture 4, vectors (Tuesday, October 13); HW1
- Mark one letter per question in the grid on the first page; only the grid is graded


---

## Tonight

- **Rotation about an axis**: columns are where the axes land; orthonormal, det +1; mirrors
- **Axis-angle**: Rodrigues from the projection split; reading the axis back out
- **Quaternions**: the half angle, the sandwich, composition, slerp, the double cover, drift
- **Euler angles**: three conventions, three poses, and gimbal lock
- **Discussion**, then the **HW2 walk-through**

Reading: [Rotation](../../textbook/rotation.html) in the course text.

