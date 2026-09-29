<!--
  CSS 551 · L20 discussion (10 min), open discussion (8 min), wrap (2 min).
  Two peer-instruction questions; answers only in the notes. Numbers from
  lectures/L20-synthesis-review/figures/numbers.json (tools/gen-lecture-figures-d2.mjs),
  which match textbook/figures/numbers-unity.json (normalHack) and numbers-systems.json (col.blend).
-->

### Discussion

<small>(~20 min · two questions, then open discussion)</small>


---

## Question 1: a normal under a scale

A surface point has unit normal `(0.707, 0.707, 0)`. The object is scaled by `(2, 1, 1)`. What is the correct unit normal afterwards?

- **A.** `(0.707, 0.707, 0)`
- **B.** `(0.894, 0.447, 0)`
- **C.** `(0.447, 0.894, 0)`
- **D.** `(1.414, 0.707, 0)`


---

## Question 2: blending in sRGB

A pixel is half pure red `(255, 0, 0)` and half pure green `(0, 255, 0)`, stored in 8-bit sRGB. What code values should the averaged pixel have?

- **A.** `(128, 128, 0)`
- **B.** `(188, 188, 0)`
- **C.** `(255, 255, 0)`
- **D.** `(64, 64, 0)`


---

## Open discussion

- Which of the week-3 tools would you reach for first in a job that is mostly neural?
- What would you need to learn next to work on relighting a captured scene? On a world model?
- Where did a readout surprise you this term, and what did it teach?


---

## Wrap

- One chain carried the course: from model coordinates to pixels, then run backwards to learn a scene, then steered by its buffers to learn images
- Every learned method of the last five weeks stands on the foundation weeks: the dot product, the quaternion, `V` and `P`, compositing, sampling

**Final examination**: Thursday December 17, 5:45 PM, in person, two hours, cumulative with weeks 7 to 11 weighted. **Now**: Quiz 8.

