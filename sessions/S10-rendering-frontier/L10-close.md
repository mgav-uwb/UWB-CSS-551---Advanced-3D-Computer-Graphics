<!--
  CSS 551 · S10 session shell, closing slides: the course in one picture (~7 min)
  and the wrap (~5 min). Mounted by index.html AFTER the four topic decks. The
  last slide ENDS the course (no forward references anywhere).
-->

### The course in one picture

<small>(~7 min)</small>

---

## The whole pipeline, in your own hands

Every box below is something **you built by hand** this quarter — no engine did it for you:

```text
   PLACE          makeTRS / matMul (S03/S04) ─▶ scene graph compose (S05)
                  a model's local transform, then its parent chain → world matrix W

   VIEW           lookAtBasis → V (S06) ─▶ perspective P (S06)
                  world → camera space,  then camera → clip space

   PROJECT        clip ─▶ perspective divide ─▶ NDC ─▶ viewport (S06)
                  ÷w makes far things small; map the cube to pixels

   SURFACE        mesh: vertices + indices + normals (S07)
                  UVs + the texture matrix (S08)

   SHADE          Phong illumination: diffuse N·L, specular R·V^s, ambient (S09)
                  — the local face of Part 1's rendering equation
```

A vertex flows **top to bottom**: placed by **W**, viewed by **V**, projected by **P**, divided, mapped to a pixel, then **shaded**. `W`, `V`, `P` — three matrices you can **derive from scratch**.

---

## Final Project: the demo

The Final Project is your chance to **use** this pipeline knowledge on something of your own — a scene, a tool, an effect, a small renderer.

- **when** — the Final Project is due, and demoed, in **finals week**
- **format** — a short demo of your project: **show it running**, name what pipeline pieces you used, and what you would do next
- **details on Canvas** — the exact date, time, per-team slot, format, and rubric all live on **Canvas**, the single source of truth

Thursday's studio (`lab10`) is your **last work session** before the demo: a checkpoint on where each team stands, and time to close gaps with the instructor in the room.

---

### Wrap

<small>(~5 min)</small>

---

## The course, one idea

You learned to build a **3D renderer's pipeline from first principles** — every stage, by hand:

- **vectors and matrices** are the language: a dot product is a cosine, a matrix is a change of space
- **three matrices** carry a vertex to the screen: model/world **W**, view **V**, projection **P** — each derivable from scratch
- a **surface** is a mesh (S07) dressed by a texture (S08) and lit by a shading model (S09)
- **lighting** is really an **energy balance** — the rendering equation — that Phong approximates and PBR pursues
- the **frontier**, learned scenes and learned images, changes the **representation** (and who authors it), not these **foundations**

You can now read the pipeline in any engine — or any research paper — and **recognize every piece**, because you built them.

---

## Wrap

- **Thursday** — the Final Project **studio** (`lab10`): per-team checkpoint + last work session with the instructor in the room, before the finals-week demo
- **Final Project** — due and demoed in **finals week**; *format and dates on Canvas*
- **Course evaluations** — please fill out the **course evaluation** for CSS 551; your candid feedback shapes how this course is taught next — it genuinely matters, and it is anonymous
- **Read the course text** — five chapters (<a href="../../textbook/index.html">index</a>): tonight's equations, the exact denoiser worked by hand, images as functions, and the papers

Ten weeks ago a triangle on a screen was somebody else's magic. Now it is **yours** — placed by **W**, viewed by **V**, projected by **P**, and lit by a model you can **derive**. Go build something with it.

