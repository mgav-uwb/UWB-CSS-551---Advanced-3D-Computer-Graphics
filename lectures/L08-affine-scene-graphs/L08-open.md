<!--
  CSS 551 · L08, Tuesday October 27, 2026 (week 5, in person): Affine transformations and the scene graph
  as matrices.
  Mounted by index.html: L08-open.md, ../../topics/scene-graph-concepts.md (~16 min),
  ../../topics/affine-transforms.md (~32 min), ../../topics/scene-graph-matrices.md (~14 min), L08-discuss.md
  (HW3 and the wrap, ~8 min); then, time permitting, ../../topics/scene-graph-concepts-supplement.md (~10 min)
  and ../../topics/affine-transforms-supplement.md (~58 min).
  BUILT 2026-10-25 (re-plan of 2026-10-25): the affine lecture of October 15 was not given; L07 (October 22)
  finished scene-graph-intro (operators on points, the tree, local and world, the spiral pass) and did not
  reach scene-graph-concepts. Tonight picks up there, gives affine, and writes the scene graph as matrices.
  Quizzes are on Canvas from Quiz 3 on, so no class time goes to a quiz.

  Plan (120 min, Tue 5:45-7:45 PM in person; the class runs at about 60 % of the topic headers' minute
  estimates, so the ~72 estimated minutes of the main line fill the two hours):
    0:00  Opening: HW2, HW3, Quiz 3 on Canvas, grading   3 min
    0:03  Scene graphs in practice (concepts)            ~25 min
    0:28  Affine transformations                         ~52 min
    1:20  The scene graph as matrices                    ~23 min
    1:43  HW3 walk-through and wrap                      ~12 min
    1:55  Buffer                                          5 min
  If time runs short: the concept slides after reparenting and the order demo are where the time can flex;
  never skip the HW3 slides.

  reveal.js: FLAT deck; notes follow "Note:"; formulas are MathJax (lib/deck-math.js): display blocks in
  <div class="tex">, inline ones as code spans written `$...$`; never two "_" on one markdown line outside a
  code fence or code span; no em-dashes.
  EDITED 2026-10-29: the inline formula on the Tonight slide typeset.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 8: Affine Transformations and the Scene Graph as Matrices**

> August Ferdinand Möbius introduced homogeneous coordinates in 1827, in *Der barycentrische Calcul*.

<small>A. F. Möbius, Der barycentrische Calcul, Leipzig, 1827</small>

<small>Autumn 2026 · Tue 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## This week

- **HW2** (vector geometry): due **Wednesday, October 28**, 11:59 PM
- **HW3**, out today: the robot arm by operators (**Part A**, Lecture 7) and by matrices (**Part B**, tonight); due **Wednesday, November 4**, 11:59 PM. [HW3 page](../../homework/hw03/index.html)
- **Quiz 3**, on Canvas: **Thursday, October 29, 8:00 PM** to **Sunday, November 1, 11:59 PM**
  - 8 questions, 45 minutes, one attempt; open book
  - every value computed **by hand**: pencil and paper, a basic calculator for arithmetic; an honor statement opens the quiz
  - covers Lecture 7, tonight, and HW2
- **Grading** (updated syllabus): no midterm; the final is 500 points, quizzes 250 (best 5 of 8, 50 each), homework 250


---

## Tonight

- **Scene graphs in practice**: joints and meshes, the camera as a node, reparenting, reuse, the tree in the frame loop, dirty flags, bounding volumes
- **Affine transformations**: homogeneous coordinates; a linear part and a shift; composition and order; the inverse; frames and storage; the pivot sandwich
- **The scene graph as matrices**: `$W_{\text{child}} = W_{\text{parent}} \cdot L_{\text{child}}$`; the HW3 arm by operators and by matrices; local to world and back; the view as the camera's inverse
- the **HW3 walk-through**

Reading: [Affine Transformations](../../textbook/affine-transforms.html), Sections 0 to 9; [Scene Graphs](../../textbook/scene-graphs.html), Sections 2 to 13.

