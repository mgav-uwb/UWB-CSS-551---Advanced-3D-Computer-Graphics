<!--
  CSS 551 · TOPIC DECK: The interactive loop, MVC, and the tool (Unity and WebGL side by side) (~50 min).
  Mounted as <section data-markdown="../../topics/interactive-loop-tool.md">. No logistics.

  TEACHES: the frame loop and its budget; continuous versus on-demand loops;
  per-frame versus per-second motion (deltaTime); the two clocks and the
  fixed-timestep accumulator, worked; MVC with the one-model-two-views demo and
  a predicted matrix; what MVC buys (undo two ways, retained versus immediate
  mode); the two homework tracks side by side; Unity's editor, object model,
  script lifecycle, the two C# traps, the Transform's local and world values
  worked, the matrix layout; the WebGL track's demo anatomy (makeShell,
  makeScene, SliderRow, Mat4Panel, one update function) and how to run it;
  implement and replace in both tracks; checking a build against the engine.
  ADDED 2026-09-29 (densification): frame budgets at 30 to 144 Hz; the accumulator
  in code; interpolation between steps; three time pitfalls (per-frame damping, the
  hitch and the tunnel, float drift far from the origin); Unity's Time properties;
  MVC's origin (Reenskaug 1979); undo as commands in code; the event table; the
  device-pixel pitfall; 2D hit testing, target sizes and the drag state machine;
  picking by ray and ID buffer; dragging on a plane; the arcball; the orbit
  controller's constants; latency, input to photon, and in a headset. Numbers from
  textbook/interaction.html (Sections 2, 4, 5, 7 to 10), lib/core/orbit-camera.js and
  tools/gen-lecture-figures-a.mjs. A physics-simulation topic follows this one in L03.
  NEEDS:   nothing beyond the big-picture topics (the loop of era 7); vectors and
    matrices are used as pictures and printed numbers only.
  DEMOS: mvc-transform (tx,ry,s) on a demo-full slide; its matrix card must stay
    VISIBLE (the mounting page must not carry the big-picture overview rule
    that hides .mat-panel cards).
  FIGURES: ../../textbook/figures/unity-{deltatime,editor,object-model,hierarchy,matrix}.svg,
    ui-{hittest,picking,arcball,latency}.svg
    (tools/gen-textbook-figures-unity.mjs; numbers in numbers-unity.json).
  NUMBERS, all node-checked against lib/core/xform.js or taken from
    textbook/figures/numbers-unity.json and textbook/interaction.html:
    - speed 3/s: 0.05 per frame at 60 Hz, 0.1 at 30, 0.0208 at 144; 3 units after 1 s
    - fixed 20 ms at 60 Hz: carries 16.67, 13.33, 10, 6.67, 3.33, 0; 5 fixed steps per 6 frames
    - accumulator, dt 10 ms, frames 16/20/33/8/17: steps 1/2/3/1/2, carries 6/6/9/7/4, alpha 0.9 (frame 3), 0.4 (frame 5)
    - makeTRS(1.5,0,0, 0,30,0, 2,2,2) rows: [1.732 0 1 1.5] [0 2 0 0] [-1 0 1.732 0] [0 0 0 1]
    - parent (2,0,0) ry 90, child local (1,0,0): world (2,0,-1); grandchild (0,1,0): (2,1,-1)
    - makeTRS(2,0.5,-1, 0,30,0, 2,2,2) rows: [1.732 0 1 2] [0 2 0 0.5] [-1 0 1.732 -1] [0 0 0 1]
    - undo: 3 doubles = 24 bytes; bunny 35,947 vertices x 12 bytes = 431,364 bytes per snapshot
  READING: ../../textbook/unity-basics.html (Sections 1 to 7, 11) and
    ../../textbook/interaction.html (Sections 1 to 3).

  reveal.js: FLAT; notes follow "Note:"; plain text math, no KaTeX; never two
  "_" on one markdown line outside a code fence; paths relative to the lecture page.
-->

### The interactive loop, MVC, and the tool

<small>(~50 min) · reading: <a href="../../textbook/unity-basics.html">Unity for This Course</a>, Sections 1 to 7 and 11 · <a href="../../textbook/interaction.html">Interactive Systems</a>, Sections 1 to 3</small>


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

## Two kinds of loop

- **continuous**: render every frame whether or not anything changed; a game, where something always changes
- **on demand**: render only when an event changed the state; the course's demos, which draw nothing while idle
- the same structure either way: an event arrives, a handler **edits the state**, a frame is **requested**, the frame **reads the state**
- no correct program draws inside an event handler


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

## Pitfall: floats drift far from the origin

Add **0.05** per frame for **3,600** frames (a minute at 60 Hz) in 32-bit floats:

| start | exact end | float32 end | error |
| --- | --- | --- | --- |
| 0 | 180 | 180.006 | 0.006 |
| 1000 | 1180 | 1180.146 | 0.146 |

Same steps, **23 times** the error: float32 numbers near 1000 are spaced 8 times wider than near 180.


---

## Model, view, controller

- the **model** is the application's state, the only thing that changes
- a **view** is a function from the model to something visible; it owns no state
- a **controller** turns events into edits of the model, and never touches a view

```text
   events ──▶ controller ──writes──▶ MODEL ──read by──▶ view 1 (the cube)
                                           ──read by──▶ view 2 (the matrix)
```

Data flows **one way**. Two views of one model cannot disagree, because neither stores anything.


---

## One model, two views: predict first

The model is three numbers, **{tx, ry, s}**. Both views read one matrix:

```text
   M = T(tx, 0, 0) · Ry(ry) · S(s, s, s)
```

Predict the matrix at **tx = 1.5, ry = 30°, s = 2**, then set the sliders and read the panel.


---

<!-- .slide: class="demo-full" -->

## One model, two views, live

<div class="cockpit" data-demo="mvc-transform" data-controls="tx,ry,s"><pre class="viz-fallback">  controller: three sliders (tx, ry, s) write the model
  model:      { tx, ry, s }
  view 1:     a cube drawn with M = T(tx,0,0) · Ry(ry) · S(s,s,s)
  view 2:     the 16 entries of that same M
  at tx = 1.5, ry = 30°, s = 2:
      [ 1.732  0   1      1.5 ]
      [ 0      2   0      0   ]
      [-1      0   1.732  0   ]
      [ 0      0   0      1   ]</pre></div>


---

## The matrix, predicted

```text
   M = T(1.5, 0, 0) · Ry(30°) · S(2, 2, 2)

     [ 1.732   0   1.000   1.5 ]      column 1 = 2 · (cos 30°, 0, −sin 30°)
     [ 0       2   0       0   ]      column 2 = 2 · (0, 1, 0)
     [−1.000   0   1.732   0   ]      column 3 = 2 · (sin 30°, 0, cos 30°)
     [ 0       0   0       1   ]      column 4 = the translation
```

Each of the first three columns is **where an axis lands**, scaled; the last column is **where the origin lands**.


---

## What the discipline buys

- **undo** is a stack of past models: this demo's model is 3 doubles, **24 bytes**; 1,000 snapshots are 24 kB
- a mesh editor's model is bigger: the bunny's 35,947 vertices are **431 kB** per snapshot, so store the **command** instead ("move vertex 1,204 by (0.1, 0, −0.05)", about 16 bytes, undone by its negation)
- **saving** is serializing the model; **networking** is replicating it; a **test** is a model and an expected view
- **immediate mode** UI rebuilds the view from the model every frame: MVC with no widget objects at all


---

## Where MVC came from

- **Trygve Reenskaug**, a visiting scientist at **Xerox PARC**, 1978 to 1979, working in Smalltalk
- his note of May 12, 1979, "Thing-Model-View-Editor"; renamed in his note of December 10, 1979, "Models-Views-Controllers"
- implemented for the Smalltalk-80 library by others at PARC; written up by Krasner and Pope (1988)


---

## Real code: undo as commands

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

About **16 bytes** of state per edit instead of **431 kB** per bunny snapshot.


---

## What the controller hears

| event | carries | used for |
| --- | --- | --- |
| pointerdown, pointermove, pointerup | position, button, pressure, pointer type | picking, dragging, orbiting (mouse, pen and touch in one form) |
| wheel | delta, modifier keys | zoom, scroll |
| keydown, keyup | key code, repeat flag | fly controls (the demos' WASD), shortcuts |
| gamepad (polled once per frame) | axes in [−1, 1], buttons | continuous control |
| resize, visibilitychange | the new size; hidden or shown | reallocating the framebuffer; pausing the loop |


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

## Picking in 3D: a ray from the mouse

<img src="../../textbook/figures/ui-picking.svg" alt="A perspective sketch: the eye at (3, 3, 6) with a small orange near-plane rectangle in front of it, a red ray to a hit point on a blue sphere at the origin labeled with t = 6.23, and a dashed green ray landing on a grid ground plane at (0.5, 0, 1.63)." style="max-height: 270px; width: auto;">

The clicked pixel becomes a **ray** from the eye; the nearest hit is the picked object (here the sphere at **t = 6.23**). The alternative: render object **IDs** as colors and read back one pixel.


---

## Dragging on the ground, worked

A mouse position has two numbers; a world position has three. Add a **constraint**: the ground plane y = 0.

```text
   eye o = (3, 3, 6), ray through pixel (60, 110): d = (−0.426, −0.512, −0.746)
   reach y = 0:  t = −o_y / d_y = 3 / 0.512 = 5.861
   point:        o + t·d = (0.501, 0, 1.629)
```

As the mouse moves, the intersection slides along the plane, and the object follows.


---

## Turning an object: the arcball

<img src="../../textbook/figures/ui-arcball.svg" alt="Left: a unit circle in the window with two red mouse points at (0.2, 0.1) and (0.5, 0.3) joined by a blue arc, and a gray point outside the circle projected to its rim. Right: the sphere in profile with the two points at heights z = 0.975 and 0.812." style="max-height: 230px; width: auto;">

Lift the mouse onto a sphere: (x, y) becomes (x, y, √(1 − x² − y²)). Drag (0.2, 0.1) to (0.5, 0.3): p1 = (0.2, 0.1, 0.975), p2 = (0.5, 0.3, 0.812); axis = normalize(p1 × p2) = **(−0.545, 0.838, 0.026)**, angle = arccos(p1 · p2) = **22.8°** (Shoemake, 1992).


---

## Orbiting: the demos' camera controller

- horizontal drag: yaw **0.4° per pixel**, so a **90-pixel** drag turns **36°**
- vertical drag: pitch, clamped short of the poles, so the horizon never flips
- wheel: distance × **1.12** per notch out, × **0.88** per notch in; five notches out is **1.76**, five in **0.53**
- an orbit **cannot roll**: right for inspecting an object, where the arcball is right for turning one in the hand


---

## Latency: input to photon

<img src="../../textbook/figures/ui-latency.svg" alt="A timeline with vertical syncs at 0, 16.7, 33.3 and 50 milliseconds: an input at 3 milliseconds, a blue bar for rendering frame 1 between 16.7 and 33.3, a green bar for scanning it out between 33.3 and 50, and a dashed red line at 41.7 where the mid-screen pixel changes." style="max-height: 230px; width: auto;">

Input at 3 ms, 60 Hz, double buffered: wait for the next frame **13.7** + render **16.7** + scan out to mid-screen **8.3** = **38.7 ms**, two and a half frames. At 120 Hz every term halves: **17.8 ms**.


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

<img src="../../textbook/figures/unity-editor.svg" alt="Schematic of the Unity editor's default layout: Hierarchy at left, Scene and Game views in the center, Inspector at right, Project and Console at the bottom, the Play button at the top" style="max-height: 330px; width: auto;">

**Hierarchy** (the scene graph) · **Scene** (the editor's camera) · **Game** (the scene's camera) · **Inspector** (the selected object's components) · **Project** (`Assets/` on disk) · **Console**


---

## Unity: objects are bags of components

<img src="../../textbook/figures/unity-object-model.svg" alt="A GameObject drawn as a container holding a Transform, a MeshFilter, a MeshRenderer and a script component; Unity calls the script's methods" style="max-height: 300px; width: auto;">

- a **GameObject** is a name and a list of components; it does nothing by itself
- every one has exactly one **Transform**; a **script** is one more component, and **Unity calls its methods**
- `GetComponent<T>()` finds a sibling; a `public` field is filled by dragging in the Inspector


---

## Unity: the script lifecycle

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

**Awake**, **Start** once · **Update** every frame · **LateUpdate** after every Update · **FixedUpdate** on the fixed clock. Unity calls them **by name**: a misspelled `update()` is never called, and nothing warns you.


---

## Unity's clocks, by name

- `Time.deltaTime`: seconds since the last frame, **scaled** by `Time.timeScale`
- `Time.fixedDeltaTime`: the fixed step, **0.02 s** by default (the 50 steps a second of the table)
- `Time.timeScale = 0.5`: slow motion; **0** stops the scaled clock, and `FixedUpdate` stops with it
- `Time.unscaledDeltaTime`: the real frame time, for a pause menu that must keep animating


---

## Two traps in the first hour

- **the struct copy**: `transform.localPosition.x += 1;` does not compile. `Vector3` is a struct, the property returns a **copy**, and C# refuses to assign into a copy. Read into a local, modify, write back.
- **the Inspector wins**: change `public float yRange = 10f;` to `3f` in the code, and nothing changes; the Inspector still holds 10. Set it there.
- same family: `mesh.vertices[0] = v` does nothing; the property returns a fresh array. Fill a local array, assign it once.


---

## The Transform: local and world, worked

<img src="../../textbook/figures/unity-hierarchy.svg" alt="A parent at (2,0,0) turned 90 degrees about y; its child at local (1,0,0) lands at world (2,0,-1), and a grandchild at local (0,1,0) lands at (2,1,-1)" style="max-height: 280px; width: auto;">

Parent at (2, 0, 0), turned 90° about y. Child at local (1, 0, 0): world = (2, 0, 0) + Ry(90°)·(1, 0, 0) = **(2, 0, −1)**. Grandchild at local (0, 1, 0): **(2, 1, −1)**.


---

## Matrices: rows, columns, and the printout

```text
   TRS: t = (2, 0.5, −1), 30° about y, scale 2

     [ 1.732   0   1.000   2.0 ]     Unity: m[row, col], so m[0,3] = 2
     [ 0       2   0       0.5 ]     flat index runs DOWN columns:
     [−1.000   0   1.732  −1.0 ]       m[12], m[13], m[14] = the translation
     [ 0       0   0       1   ]     lib/core/xform.js: the same column-major layout
```

`Debug.Log(Matrix4x4.TRS(...))` prints these four rows; the course library prints the same numbers.


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

## WebGL track: running it

- ES modules do not load from `file://`: serve the course folder with a **local static server**

```text
   python3 -m http.server 8551          (from the folder that holds lib/)
   http://localhost:8551/lib/demo.html?demo=mvc-transform
```

- the browser's **developer console** is your Console: errors, `console.log`, and live inspection of the model
- the math primitives are `dot`, `cross`, `normalize`, `matMul`, `makeTRS` from `lib/core/xform.js`: arrays in, arrays out


---

## Implement and replace

Where a homework names a helper, it is **off limits**: build it from primitives, then use the helper as the **answer key**.

| task | Unity | three.js | build from |
| --- | --- | --- | --- |
| aim | `Transform.LookAt`, `Quaternion.LookRotation` | `Object3D.lookAt`, `Matrix4.lookAt` | 3 cross products |
| camera | `Matrix4x4.LookAt`, `Matrix4x4.Perspective` | `Matrix4.makePerspective` | V, P by entry |
| blend rotations | `Quaternion.Slerp` | `Quaternion.slerp` | the formula |
| normals | `Mesh.RecalculateNormals` | `computeVertexNormals` | face crosses |


---

## Checking a build against the engine

The Transform example, three ways:

```text
   by hand:     child = (2, 0, 0) + Ry(90°)·(1, 0, 0) = (2, 0, −1)
                grandchild = child + Ry(90°)·(0, 1, 0) = (2, 1, −1)
   Unity:       grandchild.transform.position            → (2.0, 1.0, -1.0)
   the library: matMul(matMul(P, C), G), entries 12 to 14 → [ 2, 1, -1 ]
```

Three routes, one answer: that is what a homework's **run and compare** rubric checks.

