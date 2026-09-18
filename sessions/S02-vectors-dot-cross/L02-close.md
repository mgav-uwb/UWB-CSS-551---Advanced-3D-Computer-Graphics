<!--
  CSS 551 · S02 session shell, closing slides: the plan for Thursday and the
  wrap (~5 min). Mounted by index.html AFTER the two topic decks.
-->

## The plan for Thursday

Three exercises, each one tool from the first hour:

- **EX1, Vectors:** march an object along a line; aim and fire a projectile
- **EX2, Plane:** draw a plane from its normal and `D`; show the normal
- **EX3, In front of:** color a point by which side of a plane it's on

The rotation exercises (**EX4–EX6**: shadow on a plane, reflection, project to a cylinder) are the studio after; they use the projection split that built Rodrigues.

---

## Wrap

- **Thursday studio**: build **EX1–EX3** from tonight's math (aim, plane, which-side)
- **MP1 is due this week**: the orientation implement-and-replace. *Details on Canvas.*
- **MP2 goes out**: the vector-math machine problem. *Details on Canvas.*

A vector is a displacement; the dot measures alignment, the cross makes perpendicularity. A rotation is where the axes land: store it as a quaternion, reason about it as an axis and an angle, and never trust three Euler angles near `90`.

