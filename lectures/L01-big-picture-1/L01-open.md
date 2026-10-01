<!--
  CSS 551 · L01 (Thursday October 1, week 1, in person): welcome, the course in
  brief, then The Big Picture, part 1 (history eras 1 to 4).

  COMPOSITION: index.html mounts L01-open.md (this file: title, the course in
  brief, tonight), ../../topics/big-picture-eras-1-4.md (~72 min), L01-discuss.md
  (discussion ~20 min and the wrap). Week 1 has no quiz and no homework out.

  Plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Title, welcome, the course in brief, tonight        ~12 min (this file)
    0:12  The big picture, eras 1 to 4                         ~72 min (topic)
    1:24  buffer                                               ~16 min
    1:40  Discussion: three questions, then the wrap           ~20 min
    2:00  end
  The buffer absorbs the Utah era, which runs long; if it is not needed, take
  questions on the course logistics before the discussion.

  Facts on these slides come from the syllabus and Plan C
  (planning/css551-au26-plan-c-2026-09-29.md): 1000 points (homework 200, quizzes best 6 of 8 at 40 = 240, midterm 200,
  final 360; decided 2026-09-30), quizzes from week 2, midterm Thu Nov 12, final Thu Dec 17, homework out Thursday
  due Wednesday 11:59 PM, two 48-hour late tokens. The site syllabus governs.

  reveal.js: FLAT; notes follow "Note:"; no math; never two "_" on one line
  outside a code fence.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 1: The Big Picture, part 1**

*Seventy-five years, eight eras, in order.*

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## What this course is

How a computer turns a description of a 3D world into a picture, and, increasingly, how it **learns** that world from pictures.

- **weeks 2 to 6, the foundation**: the interactive loop, vectors, rotation, affine transformations, scene graphs, viewing, rasterization and antialiasing, meshes, textures, illumination
- **week 7, the bridge**: light transport, physically based materials, ray tracing
- **weeks 8 to 11, the neural era**: networks and embeddings, the space of images, diffusion models, learned scenes, generative 3D and video (about **40 %** of the course)


---

## How each week runs

| Meeting | Minutes | What happens |
| --- | --- | --- |
| Tuesday, online (live, not recorded) | 90 + 30 | lecture with the demos, then discussion |
| Thursday, in person | 80 + 20 | lecture, then discussion and the homework walk-through |
| Thursday, last 20 minutes | 15–20 | **the weekly quiz**, on paper, from week 2 |

**Homework** goes out Thursday and is due the next **Wednesday at 11:59 PM** on Canvas, so Thursday's quiz can assume it was done.


---

## Grading

**1000 points**: your points divided by 10 is your percentage.

| Component | Points | Detail |
| --- | --- | --- |
| Final | 360 | Thursday December 17, two hours, 45 questions × 8 points, weeks 7 to 11 weighted |
| Weekly quizzes, 8 | 240 | 8 questions × 5 points = 40 each; **best 6 count**; no make-ups |
| Midterm | 200 | Thursday November 12, first 75 minutes, 25 questions × 8 points, weeks 1 to 6 |
| Homework, 8 | 200 | 25 points each; run and compared against the numbers the assignment names |

**Exams**: one **handwritten** cheat sheet, both sides, handed in with the exam; otherwise **50 %** off.


---

## Homework: two tracks

- each assignment: one specification, a **skeleton in each of two tracks**, and the numbers a correct build reproduces
- **Unity** (C#, the pinned version 6000.3.11f1) or **WebGL** (JavaScript on the course's demo library); for the two neural homeworks, **Python** or JavaScript
- **implement and replace**: where an assignment says so, the engine's helper is off limits; build it from primitives and check it against the helper
- **two late tokens** each: 48 hours, no penalty, one homework per token, declared at submission; without a token, late work is not accepted


---

## Where everything lives

- the **course site**: the <a href="../../syllabus/index.html">syllabus</a>, the <a href="../../schedule/index.html">schedule</a>, every lecture deck, every demo
- the **course text**: <a href="../../textbook/index.html">24 chapters</a>, free, the primary reading; every lecture, homework and quiz draws its numbers from it
- **Canvas**: submissions, grades, announcements and the Tuesday Zoom link; everything else is on this site, and the **syllabus** governs if anything disagrees


---

## Tonight

**Eight eras, 1950 to today**, each idea taught in the era that made it the point. Tonight, the first four:

1. interactive pictures are born (1950–1968)
2. the Utah school invents the pipeline (1968–1980)
3. chasing the photograph (1975–1990)
4. the raster machines (1980–2000)

Reading: <a href="../../textbook/history-of-graphics.html">A History of Computer Graphics</a>, Sections 1 to 4.

