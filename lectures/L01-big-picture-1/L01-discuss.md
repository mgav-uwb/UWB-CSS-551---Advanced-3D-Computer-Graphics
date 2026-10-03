<!--
  CSS 551 · L01 discussion and wrap (2026-10-03; ~20 min of questions,
  then ~3 min for the setup slide and the wrap). Four peer-instruction
  questions (vote, argue in pairs, vote again, then work it); answers and
  worked solutions in the notes only. No quiz in week 1.

  NUMBERS, node-checked against the chapter (planning/history-draft/
  history-of-graphics.html v0.5, Section 3 and Exercises 1, 2, 3, 6) and
  figures/numbers-history-draft.json (CPI table: 1972 = 41.8, factor 7.702):
    Q1  (1/30 s) / 20 us = 1,666.7, about 1,667 spots. Distractors: 50,000
        (spots per second, 30 Hz ignored), 32,000 (the display-file size),
        833 (60 Hz used). Slide: machines, "The display file and the flicker budget".
    Q2  3,000 lines x 30 frames x 2 endpoints x 16 = 2,880,000 multiplications a
        second (the paper's "about 3,000,000"). Distractors: 90,000 (lines per
        second), 1,440,000 (one endpoint per line), 46,080,000 (16 counted twice).
        Slide: machines, "The head-mounted display as a machine".
    Q3  $80 x 7.702 x 40 h = $24,646, about $24,600. Distractors: $3,200
        (nominal, not converted), $3,081 (the teletype at $10), $46,212 (the $150
        rate). Slide: machines, "IBM 2250: what it cost".
    Q4  512 x 512 x 16 = 4,194,304 bits at four cents a bit = $167,772 (the
        chapter's Exercise 1; kept from the live L01-discuss.md). Distractors:
        $10,486 (the 16 bits forgotten), $20,972 (2 bytes priced per byte),
        $1,342,177 (bits multiplied by 8 again). Slide: problems-1, "Visibility:
        the z-buffer (1974)".
  The "Before next Thursday" slide is the live one, links rebased one level.

  reveal.js: FLAT; notes follow "Note:"; never two "_" on one line outside a fence.
-->

### Discussion

<small>(~20 min): vote, argue in pairs for two minutes, vote again</small>


---

## Question 1: Sketchpad's flicker budget

The TX-2 showed one spot of Sketchpad's display file every **20 µs**. To avoid flicker, the whole picture must be shown **30 times a second**. How many spots can one picture have?

- **A.** 833
- **B.** about 1,667
- **C.** 32,000
- **D.** 50,000


---

## Question 2: the head-mounted display's multiplier

The 1968 head-mounted display drew **3,000 lines at 30 frames a second**. Its matrix multiplier transformed each **endpoint** with **16 multiplications**. How many multiplications per second is that?

- **A.** 90,000
- **B.** 1.44 million
- **C.** 2.88 million
- **D.** 46 million


---

## Question 3: a design week on an IBM 2250

About 1971 a refreshed graphics console such as the IBM 2250 cost **$80 per console hour** to run. The 1972-to-2026 price factor is **7.702**. What did a **40-hour** design week cost, in 2026 dollars?

- **A.** about $3,080
- **B.** about $3,200
- **C.** about $24,600
- **D.** about $46,200


---

## Question 4: what the z-buffer cost in 1974

A **512 × 512** depth buffer at **16 bits per pixel**, with memory at about **four cents per bit**. What did the depth buffer alone cost?

- **A.** $10,486
- **B.** $20,972
- **C.** $167,772
- **D.** $1,342,177


---

## Before next Thursday (October 8)

HW1 goes out on October 8. Get your tools working this week, not that night.

| | Unity track | WebGL track |
| --- | --- | --- |
| **Install** | Unity Hub and the editor **6000.3.11f1** (several GB) | nothing: a browser and Python 3 |
| **Read** | <a href="../../textbook/unity-basics.html#install">Unity for This Course</a>, Sections 1 to 4 | <a href="../../textbook/webgl-basics.html#serve">WebGL and three.js for This Course</a>, Sections 1 to 3 |
| **Check** | open one class-example project from Canvas and press Play | run the course locally and open <code>homework/run.html?hw=hw01</code> |

- **Pick a track** for HW1 (you may switch per assignment)
- bring setup problems to Thursday's discussion, or post them on Canvas before then


---

## Wrap

Graphics began as the display end of machines built for air defense, aircraft and cars, and every technique since began as a problem stated precisely, solved first in a handful of laboratories (MIT, Utah, Xerox PARC, NYIT, Cornell) and then carried into hardware once memory and arithmetic became cheap enough.

- **Read**: <a href="../../textbook/history-of-graphics.html">A History of Computer Graphics</a>, Sections 1 to 5, and the <a href="../../syllabus/index.html">syllabus</a>
- **Before next Thursday**: pick a track, install and read as on the previous slide
- **Due**: nothing yet

