<!--
  CSS 551 · TOPIC DECK: The interactive loop, MVC, and the tool (Unity and WebGL side by side) (~50 min).
  Mounted as <section data-markdown="../../topics/interactive-loop-tool.md">. No logistics.

  TEACHES: why an interactive program cannot finish; four ways to wait for input (why the frame
  loop); the frame loop; who owns it (inversion of control, never block); the smallest loop in
  each track; one frame in order (Unity's player loop against the browser's); continuous versus
  on-demand loops; events against polling (held keys); the budget at 30 to 144 Hz;
  per-frame versus per-second motion (deltaTime); the two clocks and the fixed-timestep
  accumulator, worked and in code; interpolation between steps; two time pitfalls (per-frame
  damping, the hitch and the tunnel); a tool without a model (the tangle, predicted), MVC defined,
  the same tool untangled (WithoutNotify, the focused box), why split this way, MVC's origin
  (Reenskaug 1979), the alternatives (MVP, MVVM, one-way data flow, immediate mode, ECS), who
  tells the view (continuous redraw, dirty flag, requestRender, observer); the
  one-model-two-views demo; one drag end to end; where the model lives in each track; undo, as
  snapshots or as commands, in code; the event table with Unity's classic Input names; the
  device-pixel pitfall; 2D hit testing, target sizes and the drag state machine; click or drag,
  worked; latency, input to photon, a missed v-sync, and in a headset; the two homework tracks
  side by side; Unity's editor and object model; the Bounce script in both tracks; the script
  lifecycle and the two C# traps; the WebGL track's demo anatomy; implement and replace.
  RESEQUENCED 2026-10-05 (L03 "Building blocks"): nothing that needs matrices or the camera. Moved to
  interaction-3d.md (mounted after viewing): pixel to NDC, picking in 3D, dragging on the ground,
  snapping, the arcball, the orbit controller. Archived (old open/discuss snapshot and git history):
  "The matrix, predicted", "The Transform: local and world, worked", "Matrices: rows, columns, and
  the printout"; the Transform and matrix layout are taught by the affine and scene-graphs topics.
  The mvc-transform demo's matrix card is shown as an opaque second view.
  NEEDS:   the vectors-review topic (the aim worked); the big-picture topics (the loop of era 7).
  DEMOS: mvc-transform (tx,ry,s) on a demo-full slide; its matrix card must stay
    VISIBLE (the mounting page must not carry the big-picture overview rule
    that hides .mat-panel cards).
  FIGURES: ../../textbook/figures/unity-{deltatime,editor,object-model}.svg,
    ui-{hittest,latency}.svg
    (tools/gen-textbook-figures-unity.mjs; numbers in numbers-unity.json).
  NUMBERS, all node-checked against lib/core/xform.js or taken from
    textbook/figures/numbers-unity.json and textbook/interaction.html:
    - speed 3/s: 0.05 per frame at 60 Hz, 0.1 at 30, 0.0208 at 144; 3 units after 1 s
    - fixed 20 ms at 60 Hz: carries 16.67, 13.33, 10, 6.67, 3.33, 0; 5 fixed steps per 6 frames
    - accumulator, dt 10 ms, frames 16/20/33/8/17: steps 1/2/3/1/2, carries 6/6/9/7/4, alpha 0.9 (frame 3), 0.4 (frame 5)
    - makeTRS(1.5,0,0, 0,30,0, 2,2,2) rows (the demo's panel): [1.732 0 1 1.5] [0 2 0 0] [-1 0 1.732 0] [0 0 0 1]
    - aim: normalize((4,0,-2) - (1,0,2)) = (0.6, 0, -0.8)
    - undo: 3 doubles = 24 bytes; bunny 35,947 vertices x 12 bytes = 431,364 bytes per snapshot
  CODE TABS (2026-10-07): every example written for both tracks is a <div class="code-tabs"> with a
    csharp and a javascript fence (lib/code-tabs.js); the C# compiles against Unity API stubs, the
    JavaScript was run in a node harness (tangled: cube 3, slider 1.5; untangled: all 3, one render).
    data-run="name" adds a Run tab that executes the WebGL listing's text as written, with the
    hidden setup named in lib/code-run.js (EXAMPLES: spin, keys, accumulator, tangle, untangled,
    dirty, undo, bounce). Changing a listing means checking its runner still works.
  TRIMMED 2026-10-08: float drift (vector-geometry's precision section has it), Unity's clocks by name
    (unity-basics.html section 4), running the WebGL track (webgl-basics.html section 1) and checking a
    build against the engine (implement and replace covers it). Second pass the same day: "What the
    discipline buys: undo" merged into the undo code slide; MVC's origin moved before the alternatives.
  READING: ../../textbook/interaction.html (Sections 1 to 4, 7, 10) and
    ../../textbook/unity-basics.html (Sections 1 to 5, 7, 11).

  reveal.js: FLAT; notes follow "Note:"; plain text math, no KaTeX; never two
  "_" on one markdown line outside a code fence; paths relative to the lecture page.
-->

### The interactive loop, MVC, and the tool

<small>(~50 min) · reading: <a href="../../textbook/interaction.html">Interactive Systems</a>, Sections 1 to 4, 7 and 10 · <a href="../../textbook/unity-basics.html">Unity for This Course</a>, Sections 1 to 5, 7 and 11</small>


---

## Why an interactive program cannot finish

- a **batch** program has all its input at the start: read, compute, write, exit (a compiler; a film renderer drawing one frame)
- an interactive program's next input **depends on its last output**: the person looks at the picture, then acts
- input arrives **over time** and from **several sources at once**: mouse, keys, clock, network, the window system
- the picture must change **without input** too: animation, simulation, a blinking cursor
- so the program must outlive every single input: **wait, respond, redraw, repeat**, until the person quits


---

## Four ways to wait for input

| design | how it waits | what breaks |
| --- | --- | --- |
| blocking read | stops until the next keystroke: `scanf`, `Console.ReadLine`, the browser's `prompt` | nothing moves while it waits; it hears only one source |
| callbacks only | handlers run when events arrive; nothing runs otherwise | no event, no change: animation needs a timer, a loop again |
| a thread per source | each input source gets its own thread | threads write the same state at once: races, locks |
| **the frame loop** | drains every source once per frame, then updates, then draws | at most a frame of input latency |


---

## A program that never returns

```text
   initialize the state                   ← Unity: Start()     WebGL: make()
   repeat forever:
       read input      (mouse, keys)      ┐
       update state    (move, simulate)   ├ one frame
       redraw          (state → pixels)   ┘
```

- at 60 frames per second each trip gets **16.7 ms**, all of it
- the screen is never the truth: it is a picture of the state, as fresh as the last redraw
- your code hooks the middle; the framework owns the loop


---

## Who owns the loop

- a console program's `main` calls everything it needs, then **returns**
- an interactive program hands the loop to a framework, which **calls your functions**: inversion of control
- **Unity** owns the whole loop: you write `Start` and `Update`; the engine calls them, by name
- the **browser** owns the event loop: you register handlers, and ask for each frame with `requestAnimationFrame`
- the rule that follows: **never block**. A 2 s computation in `Update` or in a handler freezes the window for 2 s, **120** missed frames at 60 Hz


---

## The smallest loop, in each track

A cube turning at **90° per second**:

<div class="code-tabs" data-run="spin">

```csharp
using UnityEngine;

public class Spin : MonoBehaviour {             // attach to the cube
    public float degPerSec = 90f;
    float angle;                                 // the state
    void Update() {                              // the engine calls this once per frame
        angle += degPerSec * Time.deltaTime;     // update: rate × seconds
        transform.localRotation = Quaternion.Euler(0f, angle, 0f);   // show the state
    }
}
// no loop in this file: the engine runs it and calls Update by name
```

```javascript
const degPerSec = 90;
let angle = 0, last = performance.now();         // the state, and the clock
function frame(now) {                            // the browser calls this once per refresh
  const dt = (now - last) / 1000;  last = now;   // seconds since the last frame
  angle += degPerSec * dt;                       // update: rate × seconds
  cube.rotation.y = angle * Math.PI / 180;       // show the state (three.js wants radians)
  renderer.render(scene, camera);                // draw
  requestAnimationFrame(frame);                  // ask for the next frame
}
requestAnimationFrame(frame);
```

</div>

At 60 Hz each frame turns **1.5°**; after one second, **90°** at any rate.


---

## One frame, in order

| | Unity, every frame | browser, every refresh |
| --- | --- | --- |
| 1 | input for this frame is read | input events: their **handlers** run |
| 2 | `FixedUpdate`, 0 or more times | `requestAnimationFrame` callbacks: **your frame** |
| 3 | `Update`, on every script | style and layout of the page |
| 4 | `LateUpdate`, on every script | paint and composite: the GPU draws |
| 5 | rendering: every camera draws | wait for v-sync; the picture is shown |
| 6 | wait for v-sync; the picture is shown | |

Events arriving mid-frame **wait** for the next trip.


---

## Two kinds of loop

- **continuous**: render every frame whether or not anything changed; a game, where something always changes
- **on demand**: render only when an event changed the state; the course's demos, which draw nothing while idle
- the same structure either way: an event arrives, a handler **edits the state**, a frame is **requested**, the frame **reads the state**
- handlers **edit and request**; only the frame **draws**


---

## Events or polling

A key that is **held** is state; a key that was **pressed** is an event. Move at 4 units/s while D or A is held; Space recenters, once:

<div class="code-tabs" data-run="keys">

```csharp
public float speed = 4f;
float x;                                              // the state
void Update() {
    float dir = 0f;
    if (Input.GetKey(KeyCode.D)) dir += 1f;           // held: polled every frame
    if (Input.GetKey(KeyCode.A)) dir -= 1f;
    x += dir * speed * Time.deltaTime;
    if (Input.GetKeyDown(KeyCode.Space)) x = 0f;      // pressed this frame: once
    transform.localPosition = new Vector3(x, 0f, 0f);
}
```

```javascript
const held = new Set();                                   // keys down right now
addEventListener('keydown', (e) => {
  held.add(e.code);
  if (e.code === 'Space' && !e.repeat) x = 0;             // a press: handled once
});
addEventListener('keyup', (e) => held.delete(e.code));
addEventListener('blur', () => held.clear());             // released in another window
function frame(now) {
  const dt = (now - last) / 1000;  last = now;
  const dir = (held.has('KeyD') ? 1 : 0) - (held.has('KeyA') ? 1 : 0);   // held: polled
  x += dir * speed * dt;
  ship.position.x = x;
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
```

</div>


---

## The budget at other rates

| display rate | one frame | where you meet it |
| --- | --- | --- |
| 30 Hz | 33.3 ms | cinematic console games, a laptop on battery |
| 60 Hz | 16.7 ms | most monitors, the course's reference |
| 90 Hz | 11.1 ms | a VR headset's minimum |
| 120 Hz | 8.33 ms | phones, high-refresh laptops |
| 144 Hz | 6.94 ms | gaming monitors |

Everything, input, simulation, drawing and the operating system, shares one row.


---

## Per frame against per second

<img src="../../textbook/figures/unity-deltatime.svg" alt="Distance moved after one second at 60, 30 and 144 frames per second: the per-frame form moves 60, 30 and 144 units; the per-second form moves 3 units at every rate" style="max-height: 300px; width: auto;">

`p.x += 1` moves **60, 30 or 144** units in a second, depending on the machine. `p.x += 3 * dt` moves 0.05, 0.1 or 0.0208 per frame and **3 units** after one second on all three.


---

## Two clocks

Unity's **Update** runs once per rendered frame; **FixedUpdate** runs on a fixed 20 ms clock. At 60 Hz:

| frame | ends at (ms) | fixed steps | carried (ms) |
| --- | --- | --- | --- |
| 1 | 16.67 | 0 | 16.67 |
| 2 | 33.33 | 1 | 13.33 |
| 3 | 50.00 | 1 | 10.00 |
| 4 | 66.67 | 1 | 6.67 |
| 5 | 83.33 | 1 | 3.33 |
| 6 | 100.00 | 1 | 0.00 |

Six frames, **five** fixed steps: 60 Updates and 50 FixedUpdates a second. Physics in FixedUpdate, visuals in Update.


---

## The accumulator, worked

Fixed step **10 ms**; frames of 16, 20, 33, 8 and 17 ms. Add the frame to the accumulator, run every step that fits, carry the rest.

| frame (ms) | accumulated | steps | carried | render at α |
| --- | --- | --- | --- | --- |
| 16 | 16 | 1 | 6 | 0.6 |
| 20 | 26 | 2 | 6 | 0.6 |
| 33 | 39 | 3 | 9 | 0.9 |
| 8 | 17 | 1 | 7 | 0.7 |
| 17 | 24 | 2 | 4 | 0.4 |

Nine steps of exactly 10 ms in 94 ms of wall time. Clamp a stalled frame (at 250 ms, say) or it demands hundreds of steps.


---

## Real code: the accumulator

<div class="code-tabs" data-run="accumulator">

```csharp
public float speed = 3f;
float prev, curr;                              // the last two fixed states
void FixedUpdate() {                           // Unity's while loop: 0, 1 or more per frame
    prev = curr;
    curr += speed * Time.fixedDeltaTime;       // always exactly 0.02 s
}
void Update() {                                // once per frame: draw between the two
    float alpha = (Time.time - Time.fixedTime) / Time.fixedDeltaTime;
    float x = Mathf.Lerp(prev, curr, alpha);   // Lerp clamps alpha to [0, 1]
    transform.localPosition = new Vector3(x, 0f, 0f);
}
```

```javascript
const DT = 0.010;                          // fixed step, seconds
let acc = 0, last = performance.now() / 1000;
let prev = initialState(), curr = prev;
function frame(nowMs) {
  const now = nowMs / 1000;
  acc += Math.min(now - last, 0.25);       // clamp a stall (the spiral of death)
  last = now;
  while (acc >= DT) {                      // run every whole step that fits
    prev = curr;
    curr = step(curr, DT);
    acc -= DT;
  }
  draw(lerp(prev, curr, acc / DT));        // alpha = carry / step
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

</div>


---

## Drawing between two steps

The simulation holds states at step times; the frame falls between them.

```text
   previous step:  x = 1.0         current step:  x = 1.2
   carry 4 ms of a 10 ms step:     α = 0.4
   draw at         x = 1.0 + 0.4 · (1.2 − 1.0) = 1.08
```

Without it, motion **judders**: some frames show two steps of progress, some one, some none.


---

## Pitfall: damping per frame

`v *= 0.9` every frame, meant as "slow down". After one second:

| rate | 0.9 raised to the frames | speed left |
| --- | --- | --- |
| 30 Hz | 0.9^30 | 0.0424 |
| 60 Hz | 0.9^60 | 0.0018 |
| 144 Hz | 0.9^144 | 0.00000026 |

The 30 Hz machine keeps **23.6×** the speed of the 60 Hz one. Fix: `v *= Math.exp(-k * dt)` with k = −ln(0.9) · 60 = **6.32** per second, which leaves **0.0018** after one second at every rate.


---

## Pitfall: the hitch and the tunnel

Speed **3 units/s**, per-second motion, then one frame stalls for **250 ms**:

- the object jumps **0.75** units in a single step
- a wall **0.2** thick is skipped whenever one step is longer than 0.2 / 3 = **0.067 s** (a 15 fps frame)
- on a fixed **10 ms** step, the largest move is **0.03**: the wall is never skipped


---

## A tool without a model

A scale slider, a number box, and the `=` key doubling the scale. Each handler updates everything it knows about:

<div class="code-tabs" data-run="tangle">

```csharp
public Transform cube;  public Slider slider;  public InputField box;  // one number, three copies
void Start() {
    slider.onValueChanged.AddListener(v => {
        cube.localScale = Vector3.one * v;             // copy 1
        box.text = v.ToString("0.00");                 // copy 3
    });
    box.onEndEdit.AddListener(t => {
        float v = float.Parse(t);
        cube.localScale = Vector3.one * v;
        slider.value = v;              // copy 2; fires onValueChanged: the handler above
    });
}
void Update() {
    if (Input.GetKeyDown(KeyCode.Equals))
        cube.localScale *= 2f;                         // slider and box keep the old value
}
```

```javascript
slider.addEventListener('input', () => {
  const v = +slider.value;
  cube.scale.setScalar(v);  box.value = v.toFixed(2);  render();   // copies 1 and 3
});
box.addEventListener('change', () => {
  const v = parseFloat(box.value);
  cube.scale.setScalar(v);  slider.value = v;  render();           // copies 1 and 2
});
addEventListener('keydown', (e) => {
  if (e.key === '=') { cube.scale.multiplyScalar(2); render(); }  // slider, box stale
});
```

</div>

Predict: slider to 1.5, press `=`, then nudge the slider to 1.6. What do the cube, slider and box show at each step?


---

## Model, view, controller

- the **model** is the application's state, the only thing that changes
- a **view** is a function from the model to something visible; it owns no state
- a **controller** turns events into edits of the model, and never touches a view

```text
   events ──▶ controller ──writes──▶ MODEL ──read by──▶ view 1 (the cube)
                                           ──read by──▶ view 2 (the sixteen numbers)
```

Data flows **one way**. Two views of one model cannot disagree, because neither stores anything.


---

## The same tool, untangled

<div class="code-tabs" data-run="untangled">

```csharp
public Transform cube;  public Slider slider;  public InputField box;
float s = 1f;                                            // the MODEL: one copy
void Start() {                                           // CONTROLLERS edit the model
    slider.onValueChanged.AddListener(v => s = v);
    box.onEndEdit.AddListener(t => { if (float.TryParse(t, out float v)) s = v; });
}
void Update() { if (Input.GetKeyDown(KeyCode.Equals)) s *= 2f; }
void LateUpdate() {                                      // VIEWS read the model
    cube.localScale = Vector3.one * s;
    slider.SetValueWithoutNotify(s);                     // no event back to a controller
    if (!box.isFocused) box.SetTextWithoutNotify(s.ToString("0.00"));
}
```

```javascript
const model = { s: 1 };                                      // the MODEL: one copy
slider.addEventListener('input', () => { model.s = +slider.value; requestRender(); });
box.addEventListener('change', () => {                       // CONTROLLERS edit the model
  const v = parseFloat(box.value);
  if (Number.isFinite(v)) model.s = v;
  requestRender();
});
addEventListener('keydown', (e) => { if (e.key === '=') { model.s *= 2; requestRender(); } });
function view() {                                            // VIEWS read the model
  cube.scale.setScalar(model.s);
  slider.value = model.s;                                    // setting .value fires no event
  if (document.activeElement !== box) box.value = model.s.toFixed(2);
  renderer.render(scene, camera);
}
```

</div>

Slider to 1.5, then `=`: cube, slider and box all show **3**. Three controllers, one model, one view function: **3 + 3** pieces instead of 3 × 3.


---

## Why split the program this way

- **one truth**: n ways to edit and m displays become **n + m** pieces instead of n × m connections, and displays cannot disagree
- the parts **change at different rates**: a transform's math is fixed; widgets, layouts and input devices change every release
- the model **runs without a screen**: saved, sent over a network, replayed, and tested; the homework is graded by running its model math and comparing numbers
- views and controllers are **replaceable**: the Unity and WebGL tracks are two sets of views and controllers on one specification
- the cost: one indirection per edit, and structure a 50-line prototype does not need


---

## Where MVC came from

- **Trygve Reenskaug**, a visiting scientist at **Xerox PARC**, 1978 to 1979, working in Smalltalk
- his note of May 12, 1979, "Thing-Model-View-Editor"; renamed in his note of December 10, 1979, "Models-Views-Controllers"
- implemented for the Smalltalk-80 library by others at PARC; written up by Krasner and Pope (1988)


---

## Alternatives to MVC

| architecture | the idea | where you meet it |
| --- | --- | --- |
| none | handlers edit widgets and draw | prototypes |
| model–view–presenter | a presenter holds the logic; the view is passive | Taligent (1996); Android apps |
| model–view–viewmodel | the view binds to a view model; bindings copy changes | Microsoft's WPF (2006) |
| one-way data flow | `update(state, msg)` returns the next state; view = f(state) | Elm; Redux (2015) |
| immediate mode | the interface is redrawn from the model every frame | Dear ImGui; debug panels |
| entity–component–system | arrays of components; systems update them every frame | game simulation; Unity DOTS |

Every row but the first keeps MVC's core: **the state in one place, every display computed from it**.


---

## Who tells the view?

Unity's loop runs every frame, so a view can simply run every frame. An on-demand loop needs a **request**. Either way, a **dirty flag** turns many edits into one redraw:

<div class="code-tabs" data-run="dirty">

```csharp
float s = 1f;  bool dirty = true;               // the model, and "changed since drawn?"
public void SetScale(float v) { s = v; dirty = true; }   // every controller calls this
void LateUpdate() {
    if (!dirty) return;                         // unchanged: skip the views
    dirty = false;
    cube.localScale = Vector3.one * s;
    label.text = s.ToString("0.00");
}
```

```javascript
let pending = false;
function requestRender() {                 // any number of edits in one frame...
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; view(); });   // ...one render
}
```

</div>


---

## One model, two views: predict first

- the **model** is three numbers, **{tx, ry, s}**: a slide along x, a turn about y in degrees, a uniform scale
- **view 1** draws a cube placed by those numbers
- **view 2** prints the sixteen numbers the renderer draws that cube with
- three sliders are the **controller**

Predict: drag `ry` from 0 to 90. Which view changes? Is there any slider setting where the two views disagree?


---

<!-- .slide: class="demo-full" -->

## One model, two views, live

<div class="cockpit" data-demo="mvc-transform" data-controls="tx,ry,s"><pre class="viz-fallback">  controller: three sliders (tx, ry, s) write the model
  model:      { tx, ry, s }
  view 1:     a cube placed by the model
  view 2:     the 16 numbers the cube is drawn with
  at tx = 1.5, ry = 30°, s = 2:
      [ 1.732  0   1      1.5 ]
      [ 0      2   0      0   ]
      [-1      0   1.732  0   ]
      [ 0      0   0      1   ]</pre></div>


---

## One drag, end to end

The demo's on-demand loop at 60 Hz (times illustrative):

```text
   0.0 ms   pointermove: the ry slider's controller sets model.ry = 30,
            calls requestRender(): no frame pending, so one is requested
   3.1 ms   wheel: a controller sets model.s = 2; requestRender() finds a
            frame pending and returns
   9.0 ms   the frame runs: update() reads the model once, makeTRS → the
            cube's matrix and the panel's 16 numbers, then render()
  16.7 ms   v-sync: the picture with ry = 30 and s = 2 is scanned out
```

Two edits, **one** render; no picture ever shows the new `ry` with the old `s`.


---

## Where the model lives, in each track

| | Unity track | WebGL track |
| --- | --- | --- |
| model | a script's fields, or the Transform itself; saved in the scene, shown in the Inspector | a plain object, `{ tx, ry, s }` |
| controller | `Update` reading `Input`; UI listeners | DOM handlers: input, pointer, key |
| view | `LateUpdate` writing Transforms and UI; the engine draws the Transforms | `update()`: three.js objects and panels, then `render()` |
| loop | continuous: views may run every frame | on demand: every edit requests a frame |

Game code often lets the **Transform be the model**: a pose is state, and the renderer is its view. Keep a separate model when the state is not a pose (a typed number, a selection, an undo history) or when two views must agree.


---

## Undo: store the edit, not the model

<div class="code-tabs" data-run="undo">

```csharp
public interface ICommand { void Do(); void Undo(); }
public class MoveVertex : ICommand {                    // one edit, and its inverse
    readonly Vector3[] verts;  readonly int i;  readonly Vector3 d;
    public MoveVertex(Vector3[] verts, int i, Vector3 d) { this.verts = verts; this.i = i; this.d = d; }
    public void Do()   { verts[i] += d; }
    public void Undo() { verts[i] -= d; }
}
// in the tool's MonoBehaviour:
readonly Stack<ICommand> history = new Stack<ICommand>();
void Run(ICommand c) { c.Do(); history.Push(c); dirty = true; }
void UndoLast()      { if (history.Count > 0) { history.Pop().Undo(); dirty = true; } }
```

```javascript
class MoveVertex {                               // one edit, and its inverse
  constructor(mesh, i, d) { Object.assign(this, { mesh, i, d }); }
  do()   { this.mesh.move(this.i, this.d); }
  undo() { this.mesh.move(this.i, this.d.map((x) => -x)); }
}
const history = [];
function run(cmd) { cmd.do(); history.push(cmd); requestRender(); }
function undo()   { const c = history.pop(); if (c) { c.undo(); requestRender(); } }
```

</div>

A stack of snapshots costs **24 bytes** each for this demo's model, **431 kB** for the bunny's 35,947 vertices; a command costs about **16 bytes**.


---

## What the controller hears

| event | carries | Unity (classic `Input`) | used for |
| --- | --- | --- | --- |
| pointerdown, pointermove, pointerup | position, button, pressure, pointer type | `GetMouseButtonDown`, `mousePosition`, `GetTouch` | picking, dragging, orbiting |
| wheel | delta, modifier keys | `mouseScrollDelta` | zoom, scroll |
| keydown, keyup | key code, repeat flag | `GetKeyDown`, `GetKeyUp`, `GetKey` | fly controls (WASD), shortcuts |
| gamepad (polled once per frame) | axes in [−1, 1], buttons | `GetAxis("Horizontal")` | continuous control |
| resize, visibilitychange | the new size; hidden or shown | `Screen.width`, `OnApplicationFocus` | reallocating the framebuffer; pausing |


---

## Pitfall: the wrong pixel grid

An **800 × 500** CSS-pixel canvas on a display with device-pixel ratio **2** has a **1,600 × 1,000** drawing buffer. A click arrives at CSS **(300, 200)**.

| normalized against | x | y | |
| --- | --- | --- | --- |
| the CSS size, 800 × 500 | −0.249 | 0.198 | correct |
| the buffer size, 1,600 × 1,000 | −0.624 | 0.599 | wrong by 2× from the center |

Normalize against the size the event was **measured in**: the element's bounding rectangle.


---

## Hit testing in two dimensions

<img src="../../textbook/figures/ui-hittest.svg" alt="Left: a pentagon with vertices numbered 0 to 4; point A inside it with a dashed ray to the right crossing one edge; point B outside with a ray crossing none. Right: a state diagram with idle, pressed, dragging and clicked states joined by arrows labeled down, move over four pixels, up, and done." style="max-height: 250px; width: auto;">

Cast a ray to the right; **odd** crossings means inside. Pentagon (1, 1), (5, 0.5), (6, 3), (3.5, 5), (0.5, 3.5):

- **A = (3, 2.5)**: edges cross y = 2.5 at x = 0.7 (left, not counted) and **5.8** (right): **1** crossing, inside
- **B = (5.5, 4.5)**: crossings at 4.125 and 2.5, both left: **0**, outside


---

## Near misses, target sizes, and a drag's states

- circle of radius **1.2** at (2, 2) against (2.8, 2.9): 0.64 + 0.81 = **1.45** > 1.44, outside by a hair
- make hit shapes larger than drawn ones: at least **8 px** for a mouse, about **44 px** for a finger
- a drag is a **state machine**: idle, then **pressed** on pointerdown, **dragging** once it moves over **4 px**, **clicked** if released before that


---

## Click or drag, worked

The 4-pixel threshold decides, from the offsets since pointerdown:

```text
   moves (1, 0), (2, 1), (3, 1):   distances 1, 2.24, 3.16      all < 4, then up   →  CLICK: select
   move  (3, 3):                   distance 4.24                > 4                 →  DRAGGING
                                   from here, pointerup ends the drag and selects nothing
```

The same machine with a **timer** instead of a distance tells a tap from a long press.


---

## Latency: input to photon

<img src="../../textbook/figures/ui-latency.svg" alt="A timeline with vertical syncs at 0, 16.7, 33.3 and 50 milliseconds: an input at 3 milliseconds, a blue bar for rendering frame 1 between 16.7 and 33.3, a green bar for scanning it out between 33.3 and 50, and a dashed red line at 41.7 where the mid-screen pixel changes." style="max-height: 230px; width: auto;">

Input at 3 ms, 60 Hz, double buffered: wait for the next frame **13.7** + render **16.7** + scan out to mid-screen **8.3** = **38.7 ms**, two and a half frames. At 120 Hz every term halves: **17.8 ms**.


---

## Pitfall: a missed v-sync

A renderer takes **25 ms** a frame on a **60 Hz** display with v-sync:

- 25 ms misses every other sync, so frames present every **33.3 ms**: **30** frames per second, not 40
- input just after a frame starts: wait **16.7** + render to the next sync it can make **33.3** + scan out **8.3** = **58 ms**
- one frame **over** the budget costs a **whole** refresh interval


---

## Latency in a headset

- 90 Hz: **11.1 ms** a frame; the same pipeline is **27.8 ms** from head pose to mid-screen photon
- a head turning at **100°/s** moves **2.78°** in that time: an object 1 m away is drawn **4.9 cm** off, **56 pixels** at 20 pixels per degree
- **reprojection**: read the pose again just before scan-out and rotate the finished frame; only **5.6 ms** is left, **0.56°**, about 1 cm


---

## Two tracks, one specification

| | Unity track | WebGL track |
| --- | --- | --- |
| language | C# | JavaScript (ES modules) |
| scene | GameObjects with components | three.js scene graph, inside the course's demo shell |
| the loop | Update every frame; FixedUpdate on 20 ms | render on demand after a model edit |
| math | Vector3, Quaternion, Matrix4x4 | `lib/core/xform.js`: plain arrays, column-major |
| you submit | the project folder, without `Library/` | one JavaScript file |
| graded by | **the same numbers**, run and compared | **the same numbers**, run and compared |


---

## Unity: the editor

<img src="../../textbook/figures/unity-editor.svg" alt="Schematic of the Unity editor's default layout: Hierarchy at left, Scene and Game views in the center, Inspector at right, Project and Console at the bottom, the Play button at the top" style="max-height: 280px; width: auto;">

| window | shows | window | shows |
| --- | --- | --- | --- |
| **Hierarchy** | the scene graph | **Inspector** | the selected object's components |
| **Scene** | the editor's camera | **Project** | `Assets/` on disk |
| **Game** | the scene's camera | **Console** | logs, compile errors |


---

## Unity: objects are bags of components

<img src="../../textbook/figures/unity-object-model.svg" alt="A GameObject drawn as a container holding a Transform, a MeshFilter, a MeshRenderer and a script component; Unity calls the script's methods" style="max-height: 300px; width: auto;">

- a **GameObject** is a name and a list of components; it does nothing by itself
- every one has exactly one **Transform**; a **script** is one more component, and **Unity calls its methods**
- `GetComponent<T>()` finds a sibling; a `public` field is filled by dragging in the Inspector


---

## The bounce, in each track

<div class="code-tabs" data-run="bounce">

```csharp
public class Bounce : MonoBehaviour {
    public float yRange = 3f;   // shown in the Inspector; its value there wins
    public float speed  = 2f;
    private float dir   = 1f;
    void Start()  { Debug.Log("Bounce on " + gameObject.name); }   // once
    void Update() {                                                // every frame
        Vector3 p = transform.localPosition;      // a copy: Vector3 is a struct
        p.y += dir * speed * Time.deltaTime;      // rate × seconds
        if (p.y > yRange || p.y < -yRange) dir = -dir;
        transform.localPosition = p;              // write the copy back
    }
}
```

```javascript
const model = { y: 0, dir: 1 };                 // the state
const yRange = 3, speed = 2;
let last = performance.now();
function frame(now) {                           // the browser calls this once per refresh
  const dt = (now - last) / 1000;  last = now;  // seconds since the last frame
  model.y += model.dir * speed * dt;            // rate × seconds
  if (model.y > yRange || model.y < -yRange) model.dir = -model.dir;
  cube.position.y = model.y;                    // the view reads the model
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

</div>

At 60 Hz each step is 2 / 60 = **0.0333**; the top, 3 units up, takes **1.5 s** at any rate: 90 frames at 60 Hz, 45 at 30.


---

## Unity: the script lifecycle

- **Awake**, then **Start**: once, before the object's first frame
- **FixedUpdate**: on the fixed clock, 0 or more times a frame
- **Update**: every frame
- **LateUpdate**: every frame, after every object's Update; a following camera reads final positions here
- Unity calls them **by name**: a misspelled `update()` is never called, and nothing warns you


---

## Two traps in the first hour

- **the struct copy**: `transform.localPosition.x += 1;` does not compile. `Vector3` is a struct, the property returns a **copy**, and C# refuses to assign into a copy. Read into a local, modify, write back.
- **the Inspector wins**: change `public float yRange = 10f;` to `3f` in the code, and nothing changes; the Inspector still holds 10. Set it there.
- same family: `mesh.vertices[0] = v` does nothing; the property returns a fresh array. Fill a local array, assign it once.


---

## WebGL track: a demo is one function

```javascript
export function make(container, { stage, controls } = {}) {
  const model = { tx: 0, ry: 0, s: 1 };                 // the MODEL
  const shell = makeShell(container, { stage });         // frame: rail, help, settings
  const sc = makeScene(shell.sceneEl, { fill: true });   // three.js scene, camera, render()
  const cube = new THREE.Mesh(box, material);
  cube.matrixAutoUpdate = false;                         // the model drives the matrix
  const panel = new Mat4Panel(shell.addCard('Matrix'));  // VIEW 2
  function update() {                                    // model → both views
    const M = makeTRS(model.tx, 0, 0, 0, model.ry, 0, model.s, model.s, model.s);
    cube.matrix.fromArray(M);                            // VIEW 1
    panel.update(M);
    sc.render();                                         // request a frame
  }
  slider.onInput((v) => { model.tx = v; update(); });    // the CONTROLLER
}
```


---

## Implement and replace

Where a homework names a helper, it is **off limits**: build it from primitives, then use the helper as the **answer key**.

| task | Unity | three.js | build from |
| --- | --- | --- | --- |
| aim | `Transform.LookAt`, `Quaternion.LookRotation` | `Object3D.lookAt`, `Matrix4.lookAt` | a subtraction, a normalize, 2 crosses |
| angle | `Vector3.Angle` | `Vector3.angleTo` | a dot and two lengths |
| shadow on a direction | `Vector3.Project` | `projectOnVector` | a dot and a scale |
| face normals | `Mesh.RecalculateNormals` | `computeVertexNormals` | edge crosses |

