<!--
  CSS 551 · L04 wrap (~5 min); HW1 help and open questions follow.
  CUT 2026-10-08: the four multiple-choice discussion questions (the signed distance, inside the
  triangle, the quaternion for 90 degrees about x, the long way round) and the discussion header
  slide; the freed time goes to HW1 help and open questions. Older questions are in
  ../archive/L03-L11-pre-resequence-2026-10-05/.
-->

## Wrap

A line is a point plus a direction, a plane a point plus a normal, a triangle three corners with weights; every query about them is a dot, a cross or a sign, and in float32 an angle is atan2 of the cross and the dot. A rotation is where the axes land; Rodrigues spins the across-axis part, and a quaternion folds axis and angle through the half angle so that rotations compose by multiplication and blend by slerp.

- **Read:** [Vectors](../../textbook/vectors.html), Sections 4 to 8 · [Rotation](../../textbook/rotation.html), Sections 1 to 7
- **Due:** HW1, Wednesday October 14, 11:59 PM
- **Thursday:** Quiz 1 in the first 20 minutes (Lecture 3, tonight's lecture, HW1), then the lecture and the HW2 walk-through
- **Now:** HW1 help and open questions, both tracks; then the supplement, time permitting

