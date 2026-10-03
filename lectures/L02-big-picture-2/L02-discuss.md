<!--
  CSS 551 · L02 discussion and wrap (2026-10-03; ~20 min of questions,
  ~2 min wrap). Four peer-instruction questions; answers and worked solutions
  in the notes only.

  NUMBERS, node-checked against the chapter (planning/history-draft/
  history-of-graphics.html v0.5, Sections 5, 8, 12 and Exercises 7, 8) and
  figures/numbers-history-draft.json (fbCost.firstToLast, pricePerf.triangleTrend):
    Q1  $1,914,903 / $0.061 = 31,391,852; log2 = 24.90 halvings in 50 years
        (one every 2.0 years). Distractors: 7.5 (log10, orders of magnitude),
        31.4 (the ratio in millions), 50 (the years). Slides: problems-2,
        "Display memory, 1975 to 2025".
    Q2  2025 pixel: 4 bytes x $0.061 / 1,048,576 = $2.327e-7; $1.83 / that =
        7,864,320, about 7.9 million. Distractors: 31.5 million (per-MB ratio,
        bytes per pixel ignored), 126 million (multiplied by 4 instead of
        divided), 30 (dollars per pixel against dollars per MB). Slides:
        problems-2 "Display memory"; problems-1 "The first RAM frame buffer".
    Q3  22,178 / 0.133 = 166,752; its 11th root = 2.98, about 3.0 a year
        (17.3 doublings in 11 years). Distractors: 1.41 (doubling every two
        years), 15,159 (the ratio divided by 11), 17.3 (the doublings). Slide:
        pipelines, "Price and performance" (the copied figure's "x3.0 a year"
        subtitle is removed).
    Q4  4 h = 14,400 s against 1/60 s: 864,000 (the chapter's "about 860,000").
        Distractors: 14,400 (seconds, the frame time ignored), 432,000 (30 frames
        a second), 51,840,000 (multiplied by 60 twice). Slides: pipelines, "Ideas
        wait for hardware"; film-pipeline, "The two budgets, one more time".

  reveal.js: FLAT; notes follow "Note:"; never two "_" on one line outside a fence.
-->

### Discussion

<small>(~20 min): vote, argue in pairs for two minutes, vote again</small>


---

## Question 1: how fast display memory got cheap

Display memory cost **$1,914,903 per MB** in 1975 (the E&S frame buffer) and **$0.061 per MB** in 2025 (an RTX 5090, processor included), both in 2026 dollars. How many **halvings** of price is that?

- **A.** 7.5
- **B.** about 25
- **C.** 31.4
- **D.** 50


---

## Question 2: one pixel, then and now

The 1975 E&S frame buffer cost **$1.83 a pixel** (8 bits) in 2026 dollars. A 2025 card's memory costs **$0.061 per MB** (1 MB = 1,048,576 bytes), and a pixel today takes **4 bytes**. How many times cheaper is a pixel?

- **A.** about 30
- **B.** about 7.9 million
- **C.** about 31.5 million
- **D.** about 126 million


---

## Question 3: triangles per dollar

Triangles per second per 2026 dollar went from **0.133** (1988, Personal IRIS) to **22,178** (1999, GeForce 256). By what **factor per year** did that grow?

- **A.** 1.41
- **B.** about 3.0
- **C.** 17.3
- **D.** 15,159


---

## Question 4: the two budgets

A game renders a frame at **60 frames a second**. A film frame takes **4 hours** on one machine. How many game frames' worth of time is one film frame?

- **A.** 14,400
- **B.** 432,000
- **C.** 864,000
- **D.** 51,840,000


---

## Wrap

Every period moved a stage of the pipeline into hardware once memory and arithmetic got cheap enough, made it programmable, and then merged it into one pool; display memory halved in price about every two years, and ideas waited a median of **21 years** from paper to routine use.

- **Read**: <a href="../../textbook/history-of-graphics.html">A History of Computer Graphics</a>, Sections 6 to 12; <a href="../../textbook/unity-basics.html">Unity for This Course</a>, Sections 1 to 7 and 11; <a href="../../textbook/interaction.html">Interactive Systems</a>, Sections 1 to 3
- **Quiz 1**: Thursday, the last 20 minutes
- **Due**: nothing yet; HW1 goes out Thursday

