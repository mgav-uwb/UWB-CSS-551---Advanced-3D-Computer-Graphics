<!--
  CSS 551 · L01 discussion and wrap (~20 min). Three peer-instruction
  questions (vote, argue in pairs, vote again, then work it); answers and
  worked solutions in the notes only. No quiz in week 1.

  NUMBERS, node-checked:
    Q1  1920 x 1080 x 3 bytes = 6,220,800 bytes = 6.2 MB. Distractors: 2.1 MB
        (one byte per pixel), 12.4 MB (two buffers), 49.8 MB (1920 x 1080 x 24
        = 49,766,400, bits counted as bytes).
    Q2  depths arrive red 5.0, green 2.0, blue 3.5 (smaller is nearer), buffer
        cleared to far: red written, green written, blue rejected; green, 2 writes.
    Q3  512 x 512 x 16 = 4,194,304 bits at four cents a bit = $167,772 (the
        history chapter's Exercise 1, "about $168,000"; 2026-10-02 correction from
        one cent: E&S frame buffer $80,000 for 256 KB in 1975, Smith). Distractors:
        $10,486 (262,144 pixels, the 16 bits forgotten), $20,972 (2 bytes per
        pixel priced per byte), $1,342,177 (bits multiplied by 8 again).

  reveal.js: FLAT; notes follow "Note:"; never two "_" on one line outside a fence.
-->

### Discussion

<small>(~20 min) · vote · argue in pairs for two minutes · vote again</small>


---

## Question 1: one framebuffer

A display of **1920 × 1080** pixels stores **RGB at 8 bits per channel**. How much memory does **one** framebuffer hold?

- **A.** 2.1 MB
- **B.** 6.2 MB
- **C.** 12.4 MB
- **D.** 49.8 MB


---

## Question 2: who wins the pixel?

A z-buffer is cleared to "far". Three surfaces land on **one pixel** in this order (smaller depth is nearer):

| order | surface | depth |
| --- | --- | --- |
| 1 | red | 5.0 |
| 2 | green | 2.0 |
| 3 | blue | 3.5 |

What color ends in the framebuffer, and how many **color writes** happened?

- **A.** blue, 3 writes
- **B.** green, 2 writes
- **C.** green, 3 writes
- **D.** red, 1 write


---

## Question 3: what the z-buffer cost in 1974

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

A scene is data (meshes, transforms, materials, a camera, lights), and rendering is the pipeline that turns it into a grid of pixels: project, rasterize, test depth, shade. Local lighting and one sample per pixel are the pipeline's two cheap lies; chasing the photograph and antialiasing are what the field did about them.

- **Read**: <a href="../../textbook/history-of-graphics.html">A History of Computer Graphics</a>, Sections 1 to 4, and the <a href="../../syllabus/index.html">syllabus</a>
- **Before next Thursday**: pick a track, install and read as on the previous slide
- **Due**: nothing yet

