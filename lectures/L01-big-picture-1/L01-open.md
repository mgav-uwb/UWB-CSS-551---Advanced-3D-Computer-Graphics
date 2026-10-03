<!--
  CSS 551 · L01 (Thursday October 1, week 1, in person): welcome, the course in
  brief, then The Big Picture, part 1 (rebuilt 2026-10-03; the original deck is in
  lectures/archive/L01-big-picture-1-v1/).

  COMPOSITION: index.html mounts L01-open.md (this file: title, the course in
  brief, tonight), ../../topics/history-what-is-cg.md,
  ../../topics/history-machines.md,
  ../../topics/history-problems-1.md, then L01-discuss.md
  (discussion, the setup slide for next Thursday, the wrap). Week 1 has no quiz
  and no homework out.

  Plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Title, welcome, the course in brief, tonight   ~12 min (this file, 7 slides)
    0:12  What computer graphics is, where it is used     ~13 min (13 slides)
    0:25  The early machines, 1958 to 1972                ~18 min (16 slides)
    0:43  Problems and solutions, 1959 to about 1982      ~50 min (26 slides)
    1:33  Discussion: four questions                      ~20 min (5 slides)
    1:53  Before next Thursday, wrap                       ~3 min (2 slides)
    1:56  buffer                                           ~4 min
    2:00  end
  69 slides. If the problems deck runs long, the buffer absorbs it; the
  discussion keeps its 20 minutes.

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

*What computer graphics is, the machines that started it, and the problems it solved first.*

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

**Exams**: one **handwritten** cheat sheet, both sides. **Everyone hands in a sheet**: the cheat sheet, or your name and "I did not use a cheat sheet". Otherwise **50 %** off.


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

The field's history, organized by problem:

1. **what computer graphics is**, among its neighbors, and where it is used
2. **the early machines**, 1958 to 1972: Sketchpad on the TX-2 first, each machine with its price
3. **problems and solutions**, 1959 to about 1982: the problem, the named solutions, the people and organizations
4. **discussion**: four questions on tonight's numbers

Reading: <a href="../../textbook/history-of-graphics.html">A History of Computer Graphics</a>, Sections 1 to 5.

