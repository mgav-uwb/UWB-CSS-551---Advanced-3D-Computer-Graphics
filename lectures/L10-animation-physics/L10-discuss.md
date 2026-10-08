<!--
  CSS 551 · Lecture 10, the wrap (~4 min).
  CUT 2026-10-08: the four multiple-choice discussion questions (smoothstep at a quarter
  second, two-link IK for (1, 1), half-weight skinning at a quarter turn, substeps for a
  stiff cloth particle) and the discussion header; the freed time goes to questions.

  reveal.js: FLAT; notes follow "Note:"; never two "_" on one line outside a fence.
-->

## Wrap

Animation interpolates the parts of a transform, positions by curves, rotations by slerp, and rebuilds the matrix; a skeleton is a scene graph whose world matrices blend a skin. Simulation steps forces on a fixed clock, and the step must stay under the stiffness limit or be replaced by constraints that cannot explode.

- **Read**: [Animation and Interpolation](../../textbook/animation.html)
- **Due**: HW4, Wednesday November 4, 11:59 PM
- **Thursday**: **Quiz 4** in the first 20 minutes, on Lecture 9, tonight's lecture and HW4

