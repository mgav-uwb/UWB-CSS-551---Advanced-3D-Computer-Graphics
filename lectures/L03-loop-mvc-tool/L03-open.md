<!--
  CSS 551 · L03 (Thursday October 8, week 2, in person): The interactive loop,
  MVC, and the tool (Unity and WebGL side by side). HW1 goes out. No quiz:
  Quiz 1 is Thursday October 15 (L03, L04, HW1).

  COMPOSITION: index.html mounts L03-open.md (this file), then
  ../../topics/interactive-loop-tool.md (~54 min), then
  ../../topics/physics-simulation.md (~30 min, mounted by the integrator), then
  L03-discuss.md (discussion ~20 min with the HW1 walk-through, and the wrap).

  Plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Title and tonight                                      ~3 min (this file)
    0:03  The loop, MVC and interaction, the two tracks          ~54 min (topic)
    0:57  Physics inside the loop                                ~27 min (topic)
    1:24  Discussion: four questions, HW1 walk-through, wrap     ~20 min
    1:44  HW1 setup help, both tracks; buffer                    ~16 min
    2:00  end
  81 slides (expanded 2026-10-05 from 76).

  reveal.js: FLAT; notes follow "Note:"; plain text math; never two "_" on
  one line outside a code fence.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 3: The Interactive Loop, MVC, and the Tool**

*Unity and WebGL, side by side.*

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Tonight

1. **the loop**: frame budgets, per frame against per second, the two clocks, the accumulator in code, three time pitfalls
2. **model, view, controller**: one model, two views; undo as commands; events, hit testing, picking, dragging and snapping, the arcball; latency and VR
3. **the tool, two tracks**: Unity's editor, objects, scripts in both tracks, clocks and Transform; the WebGL track's demo anatomy; implement and replace
4. **physics inside the loop**: particles, springs, cloth and fluids on the fixed step
5. discussion, the **HW1** walk-through, then setup help for HW1

Reading: <a href="../../textbook/unity-basics.html">Unity for This Course</a>, Sections 1 to 7 and 11 · <a href="../../textbook/interaction.html">Interactive Systems</a>, Sections 1 to 3.

