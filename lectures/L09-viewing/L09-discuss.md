<!--
  CSS 551 · L09 wrap (~3 min); questions and buffer follow, then the interaction-in-3D supplement,
  time permitting.
  CUT 2026-10-08: the four multiple-choice discussion questions (into the camera's frame, the
  near plane, dragging on the ground, behind the eye) and the Discussion header slide; the
  freed time goes to questions on HW3 and the topics, and buffer.
  Re-sequenced 2026-10-25 (was L08): Thursday, in person; Quiz 3 on Canvas; HW3 due November 4.
  EDITED 2026-10-29: formulas typeset with MathJax (lib/deck-math.js), inline as `$…$` code spans.
-->

## Wrap

A camera is a frame and a lens: `$V$` is the inverse of the camera's pose, built from three cross products; `$P$` sets up the divide by depth that makes far things small, and maps the frustum to the NDC cube. Run backward, the chain turns a pixel into a ray, and a ray plus a constraint is a pick, a drag or a turn.

- **Read:** [Viewing](../../textbook/viewing.html) · [Interactive Systems](../../textbook/interaction.html), Sections 5, 6, 8 and 9
- **Due:** HW3, Wednesday November 4, 11:59 PM
- **Quiz 3**, on Canvas: tonight 8 PM to Sunday November 1, 11:59 PM; Lectures 7 and 8 and HW2
- The slides after this one, interaction in 3D, are covered time permitting, or reading

