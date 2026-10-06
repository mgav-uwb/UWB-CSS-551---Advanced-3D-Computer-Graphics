<!--
  CSS 551 · L03 (Thursday October 8, week 2, in person): Building blocks: vectors, MVC,
  the main loop. HW1 goes out. No quiz: Quiz 1 is Thursday October 15 (L03, L04, HW1).

  COMPOSITION: index.html mounts L03-open.md (this file), then
  ../../topics/vectors-review.md (~30 min), then
  ../../topics/interactive-loop-tool.md (~50 min), then
  L03-discuss.md (discussion ~20 min with the HW1 walk-through, and the wrap).

  Plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Title and tonight                                      ~3 min (this file)
    0:03  Vectors, a review: displacements, dot, cross           ~30 min (topic)
    0:33  The loop, MVC, interaction, the two tracks             ~50 min (topic)
    1:23  Discussion: four questions, HW1 walk-through, wrap     ~22 min
    1:45  HW1 setup help, both tracks; buffer                    ~15 min
    2:00  end
  Resequenced 2026-10-05: vectors review first, then the loop; the 3D interaction (NDC,
  picking, arcball, orbit) moved to L08 and the physics topic to L10.

  reveal.js: FLAT; notes follow "Note:"; plain text math; never two "_" on
  one line outside a code fence.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 3: Building Blocks**

> "What I cannot create, I do not understand."

<small>Richard Feynman, written on his blackboard, 1988</small>


<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Tonight

1. **vectors, a review**: displacements, length and normalize, the dot product (angle, projection, sign), the cross product (perpendicular, area, handedness), in both tracks
2. **the loop**: frame budgets, per frame against per second, the two clocks, the accumulator, three time pitfalls
3. **model, view, controller**: one model, two views; undo as commands; events, 2D hit testing, click or drag; latency
4. **the tool, two tracks**: Unity's editor, objects, scripts, clocks; the WebGL track's demo anatomy; implement and replace
5. discussion, the **HW1** walk-through, then setup help

Reading: <a href="../../textbook/vectors.html">Vectors</a>, Sections 1 to 3 · <a href="../../textbook/interaction.html">Interactive Systems</a>, Sections 1 to 4, 7 and 10 · <a href="../../textbook/unity-basics.html">Unity for This Course</a>, Sections 1 to 5 and 11.

