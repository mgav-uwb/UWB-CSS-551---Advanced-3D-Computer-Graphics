<!--
  CSS 551 · L03 discussion, HW1 walk-through, and wrap (~20 min); setup help follows.

  NUMBERS, node-checked:
    Q1  2 units/s at 90 Hz: 2/90 = 0.0222 per frame; 5 units take 225 frames
        (unity-basics Exercise 1). Distractors: 2.5 (the per-frame bug: 2 units
        per frame), 90 (one second's worth of frames), 450 (the step halved).
    Q2  60 Hz frames, 20 ms fixed step: 50 FixedUpdate calls per second.
        Distractors: 60 (one per frame), 1.2 (60/50 inverted), 110 (both clocks added).
    Q3  parent (2,0,0) ry 90, child local (1,0,0): (2,0,-1) (lib/core/xform.js
        makeTRS + matMul). Distractors: (3,0,0) (rotation ignored), (2,0,1)
        (the rotation's sign flipped), (1,0,2) (parent and child swapped:
        Ry(90)(2,0,0) + (1,0,0) = (1,0,-2) is the other swap; (1,0,2) is the
        swap with the sign flipped too).
    Q4  v *= 0.95 per frame: 0.95^30 = 0.215, 0.95^60 = 0.046, ratio 4.66.
        Distractors: 0.21 (inverted), 1 (the per-second fix), 2 (frame-count ratio).
    HW1 (lib/skeletons/hw01.js, lib/skeletons/expected.js): advance() reaches
        (3,0,0) after one second at 60 Hz and at 20 Hz; trsMatrix for
        t = (2,0.5,-1), 30 deg, s = 2 has rows [1.732 0 1 2] [0 2 0 0.5]
        [-1 0 1.732 -1]; it sends (1,0,0) to (3.732, 0.5, -2); orientBasis's
        numbers are on the homework page.

  reveal.js: FLAT; notes follow "Note:"; never two "_" on one line outside a fence.
-->

### Discussion

<small>(~20 min, with the HW1 walk-through) · vote · argue in pairs · vote again</small>


---

## Question 1: how many frames?

An `Update` moves an object with `p.x += 2f * Time.deltaTime;` on a machine that renders **90 frames per second**. How many frames until it has moved **5 units**?

- **A.** 2.5
- **B.** 90
- **C.** 225
- **D.** 450


---

## Question 2: the two clocks

A Unity game renders at a steady **60 frames per second** with the default fixed step of **20 ms**. How many times per second does `FixedUpdate` run?

- **A.** 1.2
- **B.** 50
- **C.** 60
- **D.** 110


---

## Question 3: local to world

A parent sits at **(2, 0, 0)**, rotated **90° about y**. Its child has `localPosition` **(1, 0, 0)**. Where is the child in the world?

- **A.** (3, 0, 0)
- **B.** (2, 0, 1)
- **C.** (2, 0, −1)
- **D.** (1, 0, 2)


---

## Question 4: damping at two frame rates

A game slows a sliding puck with `v *= 0.95;` once **per frame**. After **one second**, how many times more speed does the puck keep on a **30 Hz** machine than on a **60 Hz** machine?

- **A.** 0.21
- **B.** 1
- **C.** 2
- **D.** 4.66


---

## HW1: the loop, MVC, and orientation

Out tonight, due **Wednesday October 14, 11:59 PM**. Unity or WebGL. <a href="../../homework/hw01/index.html">The homework page</a>

Three functions, each checked against numbers on the page:

- **advance** (per second, not per frame): after one second of frames the object reaches **(3, 0, 0)** at 60 Hz **and** at 20 Hz
- **the TRS matrix**, entry by entry: t = (2, 0.5, −1), 30° about y, s = 2 gives rows [1.732 0 1 2], [0 2 0 0.5], [−1 0 1.732 −1], and sends (1, 0, 0) to **(3.732, 0.5, −2)**
- **orient an object** to face a target from three cross products; the engine's look-at is **off limits** and is your answer key


---

## Wrap

The loop reads input, updates the state, and redraws, and motion written as rate times elapsed time is the same on every machine. MVC keeps one model as the only truth, which is why two views never disagree and why undo, saving and testing are cheap.

- **Read**: <a href="../../textbook/unity-basics.html">Unity for This Course</a>, Sections 1 to 7 and 11 · <a href="../../textbook/interaction.html">Interactive Systems</a>, Sections 1 to 3
- **Due**: HW1, Wednesday October 14, 11:59 PM, on Canvas
- **Quiz 1**: Thursday October 15, the first 20 minutes: tonight's lecture, Tuesday's, and HW1
- **Now**: HW1 setup help, both tracks

