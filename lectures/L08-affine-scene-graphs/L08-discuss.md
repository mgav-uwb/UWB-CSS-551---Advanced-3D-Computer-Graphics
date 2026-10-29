<!--
  CSS 551 · L08 HW3 walk-through and wrap (~8 min). The supplements mounted after this file are covered
  time permitting.
  EDITED 2026-10-29: formulas typeset (inline code spans written `$...$`, lib/deck-math.js); function names
  stay plain code spans.
-->

### HW3, and the wrap

<small>(~8 min)</small>


---

## HW3: one arm, two ways

Out today, due **Wed Nov 4, 11:59 PM**; Unity or WebGL. [HW3 page](../../homework/hw03/index.html)

| Part | Build | One check on the page |
| --- | --- | --- |
| A, operators (44 points) | `rotateY`, `rotateZ`, `pivotRotateZ` | `$(6, 3, 0)$` turned `$90^\circ$` about `$(8, 3, 0)$`: `$(8, 1, 0)$` |
| A | `toParent`, `fromParent`, `toWorld`, `worldToNode` | the hand's origin: `$(-0.7793, 1.4725, 0.45)$` |
| B, matrices (56 points) | `translation`, `rotationY`, `rotationZ`, `scaling` | `$T(3,0,0) \cdot S(2,1,1)$`: column 3 `$(3, 0, 0)$`; `$S \cdot T$`: `$(6, 0, 0)$` |
| B | `localMatrices`, `worldMatrices` | column 3 of `$W_{\text{hand}}$`: the same `$(-0.7793, 1.4725, 0.45)$` |
| B | `rigidInverse`, `worldToLocal` | world `$(0, 1, 0)$` in the hand's frame: `$(0.3857, -0.9404, 0)$`, A's answer |


---

## HW3: the rules, and the runner

- **Part A** uses no matrices and no quaternions: points, vector addition and subtraction, sin and cos
- **Part B** builds the factors by hand; products through `matMul` (WebGL) or `*` (Unity) are allowed
- off limits: the engines' rotate-a-vector helpers, matrix constructors and inverses, and parenting (the page lists them)
- the runner places the boxes with **your Part B** world matrices and marks **your Part A** origins on them in pink: when both parts are right, the pink balls sit on the boxes' origins

Graded on the page's inputs and on a hidden set: a check scores only when both match.


---

## Wrap

An affine map is a linear part and a translation, one `$4 \times 4$` matrix in homogeneous coordinates; composing maps multiplies their matrices, read right to left, and a rigid map is undone by a transpose. A scene graph multiplies them down the tree, `$W_{\text{child}} = W_{\text{parent}} \cdot L_{\text{child}}$`: the matrix form of Lecture 7's operators. The view is the inverse of the camera node's world matrix.

- **Read:** [Affine Transformations](../../textbook/affine-transforms.html), Sections 0 to 9; [Scene Graphs](../../textbook/scene-graphs.html), Sections 2 to 13
- **Due:** HW2, Wednesday October 28; HW3, Wednesday November 4, 11:59 PM
- **Quiz 3**, Canvas: Thursday October 29, 8:00 PM, to Sunday November 1, 11:59 PM

