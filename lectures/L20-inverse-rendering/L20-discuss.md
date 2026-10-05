<!--
  CSS 551 · L20 discussion (15 min) and wrap (3 min). Three peer-instruction
  questions; answers and worked solutions only in the notes. Numbers from
  textbook/figures/numbers-inverse.json, key "discussion" (tools/gen-textbook-figures-inverse.mjs).
-->

### Discussion

<small>(~15 min · three questions · vote, argue in pairs, vote again)</small>


---

## Question 1: the light you assumed

A Lambert pixel with no ambient light reads **0.36**, where the surface has n·l = 0.6. The fit assumes the light intensity is **E = 1.5**. Which albedo does it return?

- **A.** 0.60
- **B.** 0.40
- **C.** 0.90
- **D.** 0.24


---

## Question 2: a moving edge

A pixel covers x in [0, 1]. An object of value 0.9 covers [0, t) and background 0.2 covers [t, 1], with t = 0.45. The renderer samples x = 0.125, 0.375, 0.625, 0.875 with hard coverage and differentiates each sample. What does it report for d(pixel)/dt, and what is the derivative of the true pixel integral?

- **A.** 0 and 0.7
- **B.** 0.7 and 0.7
- **C.** 0.175 and 0.7
- **D.** 0 and 0


---

## Question 3: a soft edge

A soft rasterizer uses a = σ((r − d)/s) with s = w / (2 ln 9), and w = 2 pixels. A pixel center is **1 pixel inside** the rim. What are its coverage a and its da/dr, per pixel?

- **A.** 1 and 0
- **B.** 0.9 and 0.198
- **C.** 0.9 and 0.549
- **D.** 0.75 and 0.25


---

## Wrap

- A renderer is a function of the scene's parameters; inverse rendering descends its loss, computed in **reverse mode**
- Shading and lighting differentiate cleanly; **visibility** does not, and edge sampling, reparameterization, path-space methods and soft rasterizers each restore the missing boundary term
- Images underdetermine scenes: more views, restricted representations and **priors** supply the rest

**Final examination**: Thursday December 17, 5:45 PM, in person, two hours, cumulative with weeks 7 to 11 weighted. Tonight's material is not on it.

