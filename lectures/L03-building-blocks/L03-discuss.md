<!--
  CSS 551 · L03 HW1 walk-through and wrap (~10 min); setup help follows.
  CUT 2026-10-08: the four multiple-choice discussion questions (the aim, frames at 90 Hz, the two
  clocks, damping at two rates); the freed time goes to setup help.

  NUMBERS, node-checked:
    HW1 (lib/skeletons/hw01.js, lib/skeletons/expected.js): advance() reaches
        (3,0,0) after one second at 60 Hz and at 20 Hz; hitTest2D: circle (200,150)
        r 12 against (208,159): 64 + 81 = 145 > 144, a miss; segment (100,100) to
        (180,160), tol 5, against (188,160): t = 1.064 clamps to 1, distance 8 to b
        (4.8 from the infinite line), a miss; classifyPointer: release at (3,3) from
        the press, 18 > 16, drag; at (4,0), 16, click (TRS replaced 2026-10-06:
        matrices come in L05); orientBasis's numbers are on the homework page.
  Resequenced 2026-10-05: the old Question 3 (local to world through a parent's rotation)
  needs the scene-graph composition and is archived in
  ../archive/L03-L11-pre-resequence-2026-10-05/ (the old L03 discuss file).

  reveal.js: FLAT; notes follow "Note:"; never two "_" on one line outside a fence.
-->

### HW1, and the wrap

<small>(~10 min) · then setup help, both tracks</small>


---

## HW1: the loop, input, and orientation

Out tonight, due **Wednesday October 14, 11:59 PM**. Unity or WebGL. <a href="../../homework/hw01/index.html">The homework page</a>

Four functions, each checked against numbers on the page:

- **advance** (per second, not per frame): after one second of frames the object reaches **(3, 0, 0)** at 60 Hz **and** at 20 Hz
- **hitTest2D**, in pixels: a circle by squared distance (145 > 144 is a miss), a segment by projecting and **clamping t to [0, 1]**, a triangle by the **signs of three 2D cross products**, either winding; on the boundary counts as a hit
- **classifyPointer**: a drag only when the release is **more than 4 px** from the press; (3, 3) is a drag, (4, 0) a click
- **orient an object** to face a target from a subtraction, a normalize and two cross products; the engine's look-at is **off limits** and is your answer key


---

## Wrap

A vector is a displacement; the dot product measures alignment and casts shadows, the cross product makes perpendiculars, areas and handedness. The loop reads input, updates the state and redraws, motion written as rate times elapsed time is the same on every machine, and MVC keeps one model as the only truth.

- **Read**: <a href="../../textbook/vectors.html">Vectors</a>, Sections 1 to 3, 9 · <a href="../../textbook/interaction.html">Interactive Systems</a>, Sections 1 to 4, 7, 10 · <a href="../../textbook/unity-basics.html">Unity for This Course</a>, Sections 1 to 5, 7, 11
- **Due**: HW1, Wednesday October 14, 11:59 PM, on Canvas
- **Quiz 1**: Thursday October 15, the first 20 minutes: tonight's lecture, Tuesday's, and HW1
- **Now**: HW1 setup help, both tracks

