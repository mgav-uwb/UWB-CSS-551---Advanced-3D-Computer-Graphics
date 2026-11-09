<!--
  CSS 551 · Lecture 14, the wrap (~4 min).
  Re-sequenced 2026-10-25 (was Lecture 10): HW5 due Wednesday November 18; Quiz 6 on Canvas.
  2026-11-09: HW6 goes out tonight (moved from Lecture 13), due Wednesday November 25.
  CUT 2026-10-08: the four multiple-choice discussion questions (smoothstep at a quarter
  second, two-link IK for (1, 1), half-weight skinning at a quarter turn, substeps for a
  stiff cloth particle) and the discussion header; the freed time goes to questions.

  reveal.js: FLAT; notes follow "Note:"; never two "_" on one line outside a fence.
-->

## Wrap

Animation interpolates the parts of a transform, positions by curves, rotations by slerp, and rebuilds the matrix; a skeleton is a scene graph whose world matrices blend a skin. Simulation steps forces on a fixed clock, and the step must stay under the stiffness limit or be replaced by constraints that cannot explode.

- **Read**: [Animation and Interpolation](../../textbook/animation.html)
- **Due**: HW5, tomorrow, Wednesday November 18, 11:59 PM. **Out**: HW6, due Wednesday November 25
- **Quiz 6**, on Canvas: Thursday November 19, 8 PM to Sunday November 22, 11:59 PM; Lecture 13, tonight's lecture and HW5

