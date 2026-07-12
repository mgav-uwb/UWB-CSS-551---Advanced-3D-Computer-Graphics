<!--
  CSS 551 · Lecture 2 (Session 2) — Vector Math I: Dot & Cross Products, Lines, Planes.
  reveal.js: FLAT deck — every slide is a top-level "---" section (no vertical
  "--" stacks). Keeps the verify-deck harness's demo probe correct (it selects
  "section.present [data-demo]", which inside a vertical stack matches a demo on
  a not-yet-shown sibling slide, 0x0 -> fill times out). Flat = one section per
  slide = demo only matched when shown. Notes follow "Note:".

  Real C# excerpts are from Kelvin Sung's CSS 451 ClassExamples,
  Topic3-VectorMath+Rotation (Chap-4-Vectors, Chap-5-DotProducts,
  Chap-6-CrossProducts) — the CDP projects students walk in Part 5 and rebuild
  as EX1-EX3 in Thursday's studio.

  MATH IS PLAIN TEXT ON PURPOSE. This shell loads NO KaTeX plugin (only
  markdown/highlight/notes), so "$...$" would render literally. All formulas
  are unicode plain text or fenced ```text blocks, like S01's matrices. Never
  two "_" on one markdown line (they pair into <em> and shred the line): write
  vectors as (2, 1, 0), use words "a-perp" not subscripts, no <small> on math.
  Verify every slide at 1280x620.

  DEMO: dot-cross embedded ONCE in Part 2, controls ax,ay,bx,by (2D-flavored;
  hidden az=0, bz=1 stay at PARAMS defaults, so the live embed's initial state
  is a=(2,1,0), b=(1,2,1) — same as the fallback). ASCII viz-fallback shows the
  HAND-VERIFIED default state:
     a=(2,1,0), b=(1,2,1)
     a.b = 2*1 + 1*2 + 0*1 = 4
     |a| = sqrt(5) ~= 2.24    |b| = sqrt(6) ~= 2.45
     cos = 4/sqrt(30) ~= 0.730 -> theta ~= 43.1 deg
     a x b = (1*1-0*2, 0*1-2*1, 2*2-1*1) = (1, -2, 3)
  The SAME (a,b) pair is reused for every worked example in Parts 2-3 so the
  deck, the demo, and the panel agree digit-for-digit.

  Session plan (120 min, Tue 5:45-7:45 PM synchronous online). Sums to ~110 + buffer.
    0:00  Intro (title + what tonight sets up)        ~2 min
    0:02  Part 1  Vectors are displacements           15 min   (position vs displacement, Vector3)
    0:17  Part 2  The dot product                      30 min   (angle, projection, sign + demo)
    0:47  Part 3  The cross product                    25 min   (perpendicular, area, normal, frame)
    1:12  Part 4  Lines and planes                     20 min   (P(t)=P0+t d; plane (n,d); distances)
    1:32  Part 5  This math in Sung's CDPs             15 min   (Chap-5 point-to-line; MP3 aim-line)
    1:47  Wrap                                          5 min   (EX1-EX3 Thu; MP1 due; MP2 out)
    1:52  end (+ buffer)
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 2 — Vector Math I: Dot &amp; Cross Products, Lines, Planes**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>

---

## Tonight

- A **vector** is a displacement — a direction with a length, not a place
- The **dot product** answers *"how aligned?"* — angle, projection, which side
- The **cross product** answers *"what's perpendicular?"* — a normal, an area, a frame
- **Lines and planes** are just a point plus a direction (or a normal)

<small>Thursday's studio builds EX1–EX3 from exactly this math. MP1 is due this week; MP2 goes out.</small>

---

### Part 1 · Vectors are displacements

<small>(~15 min)</small>

---

## A problem to hold onto

A patrol drone sits at **A**; a target drifts through the scene at **R**.

Press the trigger and a ball should launch **from A straight at R**.

- Which **direction** does the ball travel?
- How do you turn "point at R" into a per-frame velocity?

By the end of Part 1 you can build the aim; Thursday's EX1 is exactly this.

---

## Point vs. displacement

Two things wear the same three numbers `(x, y, z)` but mean different things:

- a **position** — *where* something is, measured from the origin (a place)
- a **displacement** — *how to get* from one place to another (an arrow: direction + length)

A position is a displacement **from the origin**. That is the only reason a point and a vector look alike.

---

## From two points, a vector

The displacement **from Pi to Pj** is tip minus tail:

```csharp
Vector3 vectorVe = Pj.transform.localPosition - Pi.transform.localPosition;
```

<small>EX_4_1_MyScript.cs — Chap-4-Vectors: Ve = Pj − Pi.</small>

- subtract **tail from tip**: `Pi − Pj` would point the other way
- the result is an **arrow** (direction + length), not a place
- the aim problem is exactly this: `aim = R − A`

---

## Add and scale, geometrically

Two operations, both with a picture:

- **add** — lay arrows tip-to-tail; `u + v` is tail-of-u to tip-of-v
- **scale** — `2v` is same direction, twice as long; `-v` flips it; `0.5v` halves it

Marching along an aim each frame is **scale-then-add**: `pos = pos + speed * dt * aim`.

---

## Length, and the unit vector

An aim needs a **direction**, not a length. Strip the length off by dividing by it:

```csharp
Vector3 vectorVs = ScalingFactor * vectorVa;              // scale
Vector3 unitVa   = (1.0f / vectorVa.magnitude) * vectorVa;  // normalize by hand
// Vector3 dirVa = vectorVa.normalized;                   // the engine's way
```

<small>EX_4_2_MyScript.cs — Chap-4-Vectors. Both ways shown; the course rule says build the top one.</small>

- **magnitude** `|v| = sqrt(x·x + y·y + z·z)` — the arrow's length
- **normalize** `v / |v|` — same direction, length 1 (a *unit* vector)

---

## Unity's Vector3, briefly

- `Vector3` is a **struct** (value type) — the S01 write-back trap still applies
- **instance** members describe *one* vector: `v.magnitude`, `v.normalized`, `v.x`
- **static** members combine *two*: `Vector3.Dot`, `Vector3.Cross`, `Vector3.Normalize`

**The rule:** where the assignment says so, use only these **primitives** — build `LookAt`, projection, and distance from them.

---

### Part 2 · The dot product

<small>(~30 min)</small>

---

## The question the dot product answers

Two directions, `a` and `b`. Before any formula:

- **How aligned are they?** Same way, opposite, or square to each other?
- **How much of `a` points along `b`?** (a shadow length)
- **Is the target in front of me or behind me?**

One number answers all three. That number is the dot product.

---

## Two definitions, one number

**Algebraic** — multiply matching components, add:

```text
a . b  =  ax*bx  +  ay*by  +  az*bz
```

**Geometric** — lengths times the cosine of the angle between:

```text
a . b  =  |a| * |b| * cos(theta)
```

The two are **equal** — that equality is the entire power of the dot product.

---

## Worked: the dot product of a and b

Take **a = (2, 1, 0)** and **b = (1, 2, 1)** — the demo's starting vectors.

```text
a . b = 2*1 + 1*2 + 0*1 = 2 + 2 + 0 = 4
|a|   = sqrt(2*2 + 1*1 + 0*0) = sqrt(5) ~= 2.236
|b|   = sqrt(1*1 + 2*2 + 1*1) = sqrt(6) ~= 2.449
```

The dot is **positive (4)**, so the angle is under 90° — the two arrows broadly agree.

---

## From dot to angle

Rearrange the geometric definition for the angle:

```text
cos(theta) = (a . b) / (|a| * |b|)
theta      = acos( cos(theta) )
```

For our a and b:

```text
cos(theta) = 4 / (sqrt(5) * sqrt(6)) = 4 / sqrt(30) ~= 0.7303
theta      = acos(0.7303) ~= 43.1 degrees
```

---

## Real code: dot, then angle

```csharp [1-6]
float dot = Vector3.Dot(v1, v2);
if ((v1.magnitude > float.Epsilon) && (v2.magnitude > float.Epsilon))
{
    cosTheta = dot / (v1.magnitude * v2.magnitude);
    theta = Mathf.Acos(cosTheta) * Mathf.Rad2Deg;
}
```

<small>EX_5_1_MyScript.cs — Chap-5-DotProducts. The guard avoids dividing by a zero-length vector.</small>

---

## Projection: split a into two parts

"How much of `a` points along `b`?" Decompose `a` into a piece **along b** and a piece **square to b**:

```text
a-along = ( (a . b) / (b . b) ) * b        (the shadow of a on b)
a-perp  = a  -  a-along                     (what's left, perpendicular to b)
```

`a-along` is a scaled copy of `b`; `a-perp` is orthogonal to it. Together they rebuild `a`.

---

## Worked: the split, and the check

For **a = (2, 1, 0)**, **b = (1, 2, 1)**: `a . b = 4`, `b . b = 6`, so the scalar is `4/6 = 2/3`.

```text
a-along = (2/3)(1, 2, 1) = (0.667, 1.333, 0.667)
a-perp  = (2,1,0) - (0.667,1.333,0.667) = (1.333, -0.333, -0.667)
```

Check perpendicularity — `a-perp . b` must be **0**:

```text
(4/3)(1) + (-1/3)(2) + (-2/3)(1) = 4/3 - 2/3 - 2/3 = 0   OK
```

---

## Real code: the projected length

The scalar projection is a single dot against a **unit** `b`:

```csharp [1-3]
Vector3 nv = v2.normalized;              // unit vector along v2
float length = Vector3.Dot(v1, nv);      // how far v1 reaches along v2
Vector3 pt = P0.transform.localPosition + length * nv;  // the foot point
```

<small>EX_5_2_MyScript.cs — Chap-5-DotProducts. Dot with a unit vector = a length.</small>

---

## Sign = the in-front-of test

The **sign** of the dot is a decision, no angle needed:

```text
a . b  >  0   ->  angle < 90   ->  b is in FRONT of a
a . b  =  0   ->  angle = 90   ->  square on
a . b  <  0   ->  angle > 90   ->  b is BEHIND a
```

Aim `a` = the way the drone faces, `b` = toward the target. `a . b > 0` means the target is ahead. This exact test is Thursday's EX3.

---

## The dot &amp; cross sandbox

Same **model** — six numbers `ax,ay,az, bx,by,bz` — drives **two views**: the 3D arrows and the value panel. Drag `ax, ay, bx, by` below.

- red = `a`, blue = `b`, amber dashed = the projection of `a` onto `b`
- the panel reads `a . b`, `|a|`, `|b|`, `theta`, and `a x b` (Part 3)
- watch the dot go through **0** as you swing `a` past square to `b`

---

## Dot &amp; cross, live

<div class="cockpit" data-demo="dot-cross" data-controls="ax,ay,bx,by"><pre class="viz-fallback">  model {ax,ay,az, bx,by,bz} -> arrows + value panel, two views
  -- default state: a=(2,1,0), b=(1,2,1) ------------------
     a . b = 2*1 + 1*2 + 0*1        = 4
     |a|   = sqrt(5) ~= 2.24    |b| = sqrt(6) ~= 2.45
     theta = acos(4/sqrt(30))       ~= 43.1 deg
     a x b = (1*1-0*2, 0*1-2*1, 2*2-1*1) = (1, -2, 3)</pre></div>

---

### Part 3 · The cross product

<small>(~25 min)</small>

---

## The question the cross product answers

The dot gives a **number**. Sometimes you need a **direction**:

- two edges of a triangle — **which way does it face?** (its normal)
- "forward" and "up" — **build a right-facing axis**
- **how big** is the parallelogram they span? (an area)

The cross takes two vectors and returns a **third, perpendicular to both**.

---

## The cross product, by components

```text
a x b = ( ay*bz - az*by ,
          az*bx - ax*bz ,
          ax*by - ay*bx )
```

For **a = (2, 1, 0)**, **b = (1, 2, 1)**:

```text
a x b = ( 1*1 - 0*2 , 0*1 - 2*1 , 2*2 - 1*1 ) = (1, -2, 3)
```

Check it is perpendicular to both — each dot must be **0**:

```text
(a x b) . a = 1*2 + (-2)*1 + 3*0 = 0      (a x b) . b = 1*1 + (-2)*2 + 3*1 = 0
```

---

## Right-hand rule

The cross is perpendicular to the a-b plane — but *which* side?

- **Right-hand rule:** fingers along `a`, curl toward `b`, thumb is `a x b`
- swap the inputs and the thumb flips: **`b x a = -(a x b)`**

```csharp [3-4]
Vector3 v1xv2 = Vector3.Cross(v1, v2);
Vector3 v2xv1 = Vector3.Cross(v2, v1);   // equals -v1xv2
```

<small>EX_6_1_MyScript.cs — Chap-6: draws both, opposite directions.</small>

---

## The length is an area

The magnitude of the cross is the **area of the parallelogram** the two vectors span:

```text
|a x b| = |a| * |b| * sin(theta)
```

For our a and b: `|a x b| = sqrt(1*1 + 2*2 + 3*3) = sqrt(14) ~= 3.742`.

Cross-check via the geometric form: `sqrt(5)*sqrt(6)*sin(43.1) = sqrt(30)*0.683 ~= 3.742`. **Same number.**

---

## Building a normal from two edges

A triangle face with corners `P0, P1, P2`. Two edges out of `P0`:

```text
e1 = P1 - P0        e2 = P2 - P0        n = normalize(e1 x e2)
```

```csharp [1-3]
Vector3 n = Vector3.Cross(v1, v2);
if (Vector3.Dot(n, Vector3.forward) > 0)
    n = -n;                          // flip so the normal faces the chosen side
```

<small>EX_6_1_MyScript.cs — the plane's normal is the cross of its two spanning edges.</small>

---

## Two vectors, a whole frame

Dot and cross **together** turn two rough vectors into three perpendicular axes — the move behind every view matrix:

```text
w = normalize(a)                 first axis: along a
u = normalize(a x b)             second: perpendicular to the a-b plane
third = normalize(a x (a x b))   completes a right-handed set
```

For our a, b these three are along `(2,1,0)`, `(1,-2,3)`, `(3,-6,-5)` — mutually perpendicular.

---

### Part 4 · Lines and planes

<small>(~20 min)</small>

---

## The question, before the equations

Two shapes run the whole course; both are "a point plus a direction":

- Is a clicked point **on this segment**, and where's the nearest point on it?
- Is an object **in front of a wall** or behind it, and **how far**?

Neither needs new math — both are the dot and the cross you already have.

---

## A line is a point and a direction

Every point on the line is the base point plus some amount of the direction:

```text
P(t) = P0 + t * d
```

- `t = 0` sits at `P0`; `t = 1` sits at `P0 + d`; negative `t` runs backward
- `d` is the direction (often kept unit); `t` slides you along it
- this is **march-along-a-direction** from Part 1, now named

---

## A segment clamps t

A **segment** is a line with `t` held to a finite range:

```text
P(t) = P0 + t * d ,   with t in [0, 1]      (endpoints P0 and P0 + d)
```

- ask for the nearest point on a segment: project, then **clamp `t`** into `[0, 1]`
- `t < 0` -> the nearest point is `P0`; `t > 1` -> it's the far end

Clamping is the difference between "infinite line" and "the thing you can actually walk on".

---

## Worked: point-to-line, in code

Is `Pt` alongside the segment `P0 -> P1`, and where does it land?

```csharp [1-5]
Vector3 vt  = Pt.transform.localPosition - P0.transform.localPosition;
Vector3 v1n = v1.normalized;                       // unit direction
float d = Vector3.Dot(vt, v1n);                    // projected length = t
Pon.transform.localPosition = P0.transform.localPosition + d * v1n;  // foot
bool inside = (d >= 0) && (d <= v1.magnitude);     // clamp test
```

<small>EX_5_3_MyScript.cs — Chap-5-DotProducts. Projection length + a range test = "inside the segment?"</small>

---

## A plane is a point and a normal

Flip it around: instead of a direction to run along, a plane has a **normal** it is square to.

```text
n . P = D            (every point P on the plane has the same dot with n)
```

- `n` is the plane's normal (from a cross, Part 3); `D` fixes how far out it sits
- `D = n . Q` for any known point `Q` on the plane
- if `n` is **unit**, then `D` is the plane's signed distance from the origin

---

## Worked: point-to-plane distance

Plane through `Q = (1, 0, 0)` with normal `m = (1, 2, 2)`. First make the normal **unit**:

```text
|m| = sqrt(1 + 4 + 4) = 3      n = (1/3, 2/3, 2/3)      D = n . Q = 1/3
```

Distance of `P = (4, 1, 0)` from the plane:

```text
n . P - D = (4 + 2 + 0)/3 - 1/3 = 6/3 - 1/3 = 5/3 ~= 1.667   (positive -> in front)
```

---

## Which side? Reuse the dot sign

The **sign** of `n . P - D` is the which-side test — the same sign trick as Part 2's in-front-of:

```text
n . P - D  >  0   ->  P is in FRONT (the normal's side)
n . P - D  =  0   ->  P is ON the plane
n . P - D  <  0   ->  P is BEHIND
```

Thursday's EX3 colors a point **green** in front, **red** behind — one dot, one subtraction, one comparison.

---

### Part 5 · This math in Sung's CDPs

<small>(~15 min)</small>

---

## Code, Demo, Practice

**CDP** — read real code, watch it run, rebuild it Thursday. Tonight's projects:

- **Chap-4** — position vs displacement, scale, normalize
- **Chap-5** — angle, projection, point-to-line (`EX_5_1`–`5_3`)
- **Chap-6** — cross, antisymmetry, the normal (`EX_6_1`)

All three are in the course materials on Canvas.

---

## Walkthrough: point-to-line distance

`EX_5_3` is tonight's math, assembled:

```text
vt  = Pt - P0                 offset from the line's base to the test point
v1n = normalize(P1 - P0)      unit direction of the segment
d   = dot(vt, v1n)            PROJECTION (Part 2): distance along the line
foot = P0 + d * v1n           LINE point (Part 4): P(t) with t = d
inside = 0 <= d <= |P1 - P0|  SEGMENT clamp (Part 4)
```

Every line is a dot, a scale, an add, or a compare — nothing you have not seen tonight.

---

## The aim-line and the traveling ball

Back to the hook — the aim-line pattern, and Thursday's **EX1**:

```csharp [1-4]
if (Input.GetKeyDown(KeyCode.Space)) {
    Projectile.SetActive(true);
    // aim = normalize(Red.position - ObjA.position);  <- you build this
}
// each frame while active: Projectile.position += ProjectileSpeed * dt * aim;
```

<small>EX1_VectorExercise.cs — Chap-4 in-class exercise. The aim is a displacement; the ball marches along it.</small>

---

## The plan for Thursday

Three exercises, each one tool from tonight:

- **EX1 — Vectors:** march an object along a line; aim and fire a projectile
- **EX2 — Plane:** draw a plane from its normal and `D`; show the normal
- **EX3 — In front of:** color a point by which side of a plane it's on

You have the math. Thursday turns it into `Dot`, `Cross`, and `.normalized`.

---

## Two products, one slide

- **Vector** = displacement (direction + length); a point is one from the origin
- **Dot** `a·b = |a||b|cos θ` — **angle**, **projection**, **which side**
- **Cross** `a×b` ⊥ both — **normal**, **area**, **a frame**
- **Line** `P=P0+t d`, **plane** `n·P=D` — distances and sides are dots

Two products. Rotation, cameras, lighting build on them.

---

## Wrap

- **Thursday studio** — build **EX1–EX3** from tonight's math (aim, plane, which-side)
- **MP1 is due this week** — the orientation implement-and-replace. *Details on Canvas.*
- **MP2 goes out** — the next machine problem. *Details on Canvas.*

A vector is a displacement. The dot measures alignment; the cross makes perpendicularity. Reach for those two before you reach for anything the engine hands you.

