<!--
  CSS 551 · L20, Thursday December 10 (in person): Inverse and Differentiable Rendering. The last lecture.
  Plan C (planning/css551-au26-plan-c-2026-09-29.md), week 11. Quiz 8 opens the class.
  Rebuilt 2026-10-05 (Marcel: inverse rendering instead of a review session); not on the final.
  The previous review deck is archived at lectures/archive/L20-synthesis-review-v1/ and topics/archive/synthesis-review.md.

  COMPOSITION: index.html mounts L20-open.md (title, quiz, tonight), then
  ../../topics/inverse-rendering.md (~80 min), then L20-discuss.md (three questions, wrap).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence; no "next time".

  Plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Quiz 8, on paper (L18, L19, HW8)                       20 min
    0:20  Opening                                                 2 min
    0:22  Inverse and differentiable rendering (topic, 60 slides) 80 min
    1:42  Discussion: three questions                            15 min
    1:57  Wrap                                                    3 min
    2:00  end
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 20: Inverse and Differentiable Rendering**

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Quiz 8

**Laptops and phones away.** A pencil and the quiz sheet, nothing else.

- **20 minutes**, 5:45 to 6:05 PM: 8 multiple-choice questions, 5 points each
- **Covers**: Lecture 18, learned scenes (Thursday, December 3); Lecture 19, generative 3D and video (Tuesday, December 8); HW8
- Mark one letter per question in the grid on the first page; only the grid is graded
- Tonight's lecture, inverse rendering, is **not on the final**


---

## Tonight

- **Rendering as a function**, and the inverse problem: why it is ill-posed
- **Analysis by synthesis**: render, compare, push the error back, repeat
- **Automatic differentiation**: forward and reverse mode, and what each costs
- **Gradients of shading and lighting**, worked on one pixel
- **The visibility discontinuity**: why an edge has no derivative, and four ways around it
- **Differentiable path tracers**: Mitsuba 3, Dr.Jit, radiative backpropagation
- **What gets recovered**: materials, lights, geometry, volumes; NeRF and splats as special cases
- **Priors**, and the open problems

<small>Reading: the course text, <a href="../../textbook/inverse-rendering.html">Inverse and Differentiable Rendering</a>. Demo: <a href="../../lib/demo.html?demo=inverse-render">inverse-render</a>.</small>

