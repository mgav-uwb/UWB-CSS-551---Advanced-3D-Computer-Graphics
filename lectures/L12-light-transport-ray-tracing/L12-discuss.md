<!--
  CSS 551 · Lecture 12, the discussion slot as midterm review (28 min: the exam's
  logistics and scope, eight questions spanning weeks 1–6) and the wrap. Answers
  only in the notes. Numbers from tools/gen-lecture-figures-c.mjs (l12_q1 to l12_q4; questions 5 to 8 computed by node).
-->

### Midterm review

<small>(~30 min)</small>


---

## The midterm

- **Thursday November 12**, the first **75 minutes** of class, in person; lecture follows
- **weeks 1–6**: the big picture, the interactive loop, vectors, rotation, affine transformations, scene graphs, viewing, rasterization and antialiasing, meshes, texture mapping, illumination
- about **30 multiple-choice items**, on paper, closed book; bring a **pencil**; no devices
- items are **computational**: which entry of the matrix, which pixel is inside, what N·L is after the light moves; the wrong options are the pitfalls from the text
- the worked examples and exercises in the chapters are the best preparation


---

## Review 1: order of transformations

`R` rotates **90° about z**, `T` translates by **(2, 0, 0)**. Where does `M = T · R` send the point `p = (1, 0, 0)`?

- **A.** (2, 1, 0)
- **B.** (0, 3, 0)
- **C.** (3, 0, 0)
- **D.** (3, 1, 0)


---

## Review 2: a scene-graph chain

A parent node's world transform is **R_y(90°)**; its child's local transform is **T(1, 0, 0)**. With `W_child = W_parent · L_child`, where is the child's origin in world space?

- **A.** (1, 0, 0)
- **B.** (0, 0, 1)
- **C.** (0, 0, −1)
- **D.** (−1, 0, 0)


---

## Review 3: depth after projection

An OpenGL-style perspective matrix with **near 1, far 10**. A point at view-space **z = −2**. Its NDC depth `z/w` is:

- **A.** −0.778
- **B.** −0.111
- **C.** 0.111
- **D.** 0.222


---

## Review 4: the Phong sum

At one point: `kd = 0.8`, `N·L = 0.6`, `ks = 0.5`, `R·V = 0.9`, shininess **s = 16**, one white light of intensity 1, no ambient. The shaded value is:

- **A.** 0.480
- **B.** 0.573
- **C.** 0.893
- **D.** 0.930


---

## Review 5: which mip level?

A texture is **512 texels** wide. At one pixel the texture coordinate u changes by **0.0156** per pixel (v barely changes). Which mip level does trilinear filtering center on?

- **A.** 0
- **B.** 3
- **C.** 8
- **D.** 9


---


## Review 6: a normal under a scale

A model is scaled by **M = diag(2, 1, 1)**. At a surface point the unit normal before the scale is **(0.6, 0.8, 0)**. The correct unit normal after it is:

- **A.** (0.6, 0.8, 0)
- **B.** (0.832, 0.555, 0)
- **C.** (0.351, 0.936, 0)
- **D.** (0.3, 0.8, 0)


---

## Review 7: a quaternion

The unit quaternion for a rotation of **90° about the y axis**, written (x, y, z, w):

- **A.** (0, 1, 0, 0)
- **B.** (0, 0.707, 0, 0.707)
- **C.** (0.707, 0, 0, 0.707)
- **D.** (0, 0.851, 0, 0.525)


---


## Review 8: a color from three corners

A triangle with corners **v0 = (0, 0)** red (1, 0, 0), **v1 = (4, 0)** green (0, 1, 0), **v2 = (0, 4)** blue (0, 0, 1). The interpolated color at the point **(1, 1)** is:

- **A.** (0.333, 0.333, 0.333)
- **B.** (0.5, 0.25, 0.25)
- **C.** (0.25, 0.25, 0.5)
- **D.** (1, 0.5, 0.5)


---

## Wrap

- Light at a point obeys **Lo = Le + ∫ f · Li · cos**; the BRDF is the material, and a physical one conserves energy and is reciprocal
- A ray tracer **searches** per pixel: three intersection routines, shadow and secondary rays, and a **BVH** to make the search logarithmic
- **Due**: HW5, Wednesday November 11, 11:59 PM
- **Thursday**: the **midterm**, the first 75 minutes of class

