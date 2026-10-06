<!--
  CSS 551 · Lecture 10, discussion (24 min: four peer-instruction questions) and
  the wrap. Answers only in the notes. Numbers computed by node:
    Q1  smoothstep at t = 0.25: 3(0.0625) - 2(0.015625) = 0.15625; 8 units -> 1.25.
        Distractors: 2 (linear), 0.5 (ease-in t squared), 6.75 (1 - s).
    Q2  l1 = l2 = 1, target (1, 1), d = sqrt 2: cos theta2 = 0, theta2 = 90;
        theta1 = 45 - atan2(1, 1) = 0; forward kinematics (1, 1).
        Distractors' tips: (45, 90) -> (0, 1.414); (45, 0) -> (1.414, 1.414);
        (0, 45) -> (1.707, 0.707).
    Q3  vertex (3, 0.6), pivot (3, 0), weights 0.5/0.5, B turns 90: B's image (2.4, 0),
        blend (2.7, 0.3), distance 0.424 (0.6 x 0.707).
    Q4  m = 0.004 kg, k = 100 N/m: omega = 158.1 rad/s; h = 1/60: h omega = 2.635 > 2;
        need n > 1.318, so 2 substeps (h omega = 1.318). Distractors: 3 (h omega < 1),
        209 (no square root: h k/m < 2), 1.

  reveal.js: FLAT; notes follow "Note:"; never two "_" on one line outside a fence.
-->

### Discussion

<small>(~24 min)</small>


---

## Question 1: eased, a quarter of the way in time

An object moves from **x = 0** to **x = 8** in one second, eased by **smoothstep**, s = 3t² − 2t³. Where is it at **t = 0.25 s**?

- **A.** 2
- **B.** 1.25
- **C.** 0.5
- **D.** 6.75


---

## Question 2: reach for (1, 1)

A two-link planar arm, **l1 = l2 = 1**, shoulder at the origin, reaches for **(1, 1)**. Which angles put the tip there, elbow-down branch (θ2 > 0)?

- **A.** θ1 = 0°, θ2 = 90°
- **B.** θ1 = 45°, θ2 = 90°
- **C.** θ1 = 45°, θ2 = 0°
- **D.** θ1 = 0°, θ2 = 45°


---

## Question 3: half a weight, a quarter turn

A vertex at **(3, 0.6)** has weights **0.5 / 0.5** on bone A (which stays still) and bone B, which turns **90°** about the joint at **(3, 0)**. With linear blend skinning, how far from the joint is the skinned vertex?

- **A.** 0.6
- **B.** 0.424
- **C.** 0.3
- **D.** 0


---

## Question 4: how many substeps?

A cloth particle weighs **0.004 kg** and hangs on a link of **k = 100 N/m**, stepped by **semi-implicit Euler** at 60 frames per second. What is the **smallest** number of equal substeps per frame that keeps it bounded?

- **A.** 1
- **B.** 2
- **C.** 3
- **D.** 209


---

## Wrap

Animation interpolates the parts of a transform, positions by curves, rotations by slerp, and rebuilds the matrix; a skeleton is a scene graph whose world matrices blend a skin. Simulation steps forces on a fixed clock, and the step must stay under the stiffness limit or be replaced by constraints that cannot explode.

- **Read**: [Animation and Interpolation](../../textbook/animation.html)
- **Due**: HW4, Wednesday November 4, 11:59 PM
- **Thursday**: **Quiz 4** in the first 20 minutes, on Lecture 9, tonight's lecture and HW4

