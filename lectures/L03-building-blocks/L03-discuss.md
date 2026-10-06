<!--
  CSS 551 · L03 discussion, HW1 walk-through, and wrap (~22 min); setup help follows.

  NUMBERS, node-checked:
    Q1  A = (2,0,1), R = (-1,0,5): R - A = (-3,0,4), length 5, unit (-0.6,0,0.8) (lib/core/xform.js
        sub, normalize). Distractors: (0.6,0,-0.8) (A - R, reversed), (-3,0,4) (not normalized),
        (-0.43,0,0.57) (divided by |-3| + |4| = 7).
    Q2  2 units/s at 90 Hz: 2/90 = 0.0222 per frame; 5 units take 225 frames
        (unity-basics Exercise 1). Distractors: 2.5 (the per-frame bug: 2 units
        per frame), 90 (one second's worth of frames), 450 (the step halved).
    Q3  60 Hz frames, 20 ms fixed step: 50 FixedUpdate calls per second.
        Distractors: 60 (one per frame), 1.2 (60/50 inverted), 110 (both clocks added).
    Q4  v *= 0.95 per frame: 0.95^30 = 0.215, 0.95^60 = 0.046, ratio 4.66.
        Distractors: 0.21 (inverted), 1 (the per-second fix), 2 (frame-count ratio).
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

### Discussion

<small>(~22 min, with the HW1 walk-through) · vote · argue in pairs · vote again</small>


---

## Question 1: the aim

A drone at `A = (2, 0, 1)` fires at a target at `R = (-1, 0, 5)`. What is the unit aim direction?

- **A.** `(-0.6, 0, 0.8)`
- **B.** `(0.6, 0, -0.8)`
- **C.** `(-3, 0, 4)`
- **D.** `(-0.43, 0, 0.57)`


---

## Question 2: how many frames?

An `Update` moves an object with `p.x += 2f * Time.deltaTime;` on a machine that renders **90 frames per second**. How many frames until it has moved **5 units**?

- **A.** 2.5
- **B.** 90
- **C.** 225
- **D.** 450


---

## Question 3: the two clocks

A Unity game renders at a steady **60 frames per second** with the default fixed step of **20 ms**. How many times per second does `FixedUpdate` run?

- **A.** 1.2
- **B.** 50
- **C.** 60
- **D.** 110


---

## Question 4: damping at two frame rates

A game slows a sliding puck with `v *= 0.95;` once **per frame**. After **one second**, how many times more speed does the puck keep on a **30 Hz** machine than on a **60 Hz** machine?

- **A.** 0.21
- **B.** 1
- **C.** 2
- **D.** 4.66


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

- **Read**: <a href="../../textbook/vectors.html">Vectors</a>, Sections 1 to 3 · <a href="../../textbook/interaction.html">Interactive Systems</a>, Sections 1 to 4, 7, 10 · <a href="../../textbook/unity-basics.html">Unity for This Course</a>, Sections 1 to 5, 11
- **Due**: HW1, Wednesday October 14, 11:59 PM, on Canvas
- **Quiz 1**: Thursday October 15, the first 20 minutes: tonight's lecture, Tuesday's, and HW1
- **Now**: HW1 setup help, both tracks

