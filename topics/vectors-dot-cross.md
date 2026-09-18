<!--
  CSS 551 · TOPIC DECK — Vectors: dot and cross products, lines and planes (~55 min).
  A topic is a reusable stretch of slides that a session page mounts as one
  <section data-markdown="../../topics/vectors-dot-cross.md"> among others; it carries no
  session logistics (no title, Thursday, MP, wrap) and no "Part N" numbering.
  Sessions compose topics in their index.html; see sessions/README.md.

  TEACHES: a vector is a displacement; the dot product (angle, projection, which side) with worked numbers; the cross product (perpendicular, area, normal, a frame); parametric lines, segments, planes and signed distance; the live dot-cross demo.
  NEEDS:   nothing beyond high-school vectors; the demo state a=(2,1,0), b=(1,2,1) is reused in every worked example.
  DEMOS:   data-demo="dot-cross" data-controls="ax,ay,bx,by" (under the session page's 200px crop). Fallback numbers hand-verified: a.b = 4, |a| = 2.24, |b| = 2.45, theta = 43.1 deg, a x b = (1, -2, 3).
  SOURCE:  derived 2026-09-18 from the former sessions/S02-vectors-dot-cross/L02-vectors-dot-cross.md (43 slides) (Plan B merge of the vectors and rotation Tuesdays); the CDP walkthrough slides were dropped (the labs open those projects) and a few code slides trimmed. Real C# excerpts are from Kelvin Sung's CSS 451 ClassExamples.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Demo embeds live on
  demo-full or cropped slides (a short ## title + the embed div + its
  viz-fallback pre). Paths are relative to the SESSION page that mounts this
  topic (sessions/SNN/index.html).
-->

### Vectors: dot and cross products, lines and planes

<small>(~55 min)</small>

Note: The toolbox the whole course draws on: the dot product (angle, projection, which side) and the cross product (perpendicular, area, a normal, a frame), then lines and planes as a point plus a direction or a normal. Everything after this, rotation, view matrices, lighting, is built from these two products. One (a, b) pair runs through every worked example and the live demo, so the panel agrees with the slides digit for digit.

---
### Vectors are displacements

<small>(~15 min)</small>

---

## A problem to hold onto

A patrol drone sits at **A**; a target drifts through the scene at **R**.

Press the trigger and a ball should launch **from A straight at R**.

- Which **direction** does the ball travel?
- How do you turn "point at R" into a per-frame velocity?

By the end of the vectors stretch you can build the aim; the first studio's EX1 is exactly this.

Note: The strong hook for the night, posed before any formula (playbook §4). This is the MP3 aim-line / traveling-ball pattern in miniature and the literal EX1 exercise of the vectors studio. The answer is a displacement: aim = R − A, normalized, scaled by speed. Do not resolve it yet — the point is that "aim a thing at another thing" is a vector-subtract-then-normalize, which is the whole of the vectors stretch.

---

## Point vs. displacement

Two things wear the same three numbers `(x, y, z)` but mean different things:

- a **position** — *where* something is, measured from the origin (a place)
- a **displacement** — *how to get* from one place to another (an arrow: direction + length)

A position is a displacement **from the origin**. That is the only reason a point and a vector look alike.

Note: This is the single reframe of the vectors stretch. Students arrive thinking "vector = point". A vector is an arrow you can pick up and drop anywhere; a point is that arrow pinned to the origin. Sung's Chap-4 project literally has a "draw position as vector / draw vector as position" toggle to make exactly this point — same three numbers, two readings.

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

Note: Real excerpt, unedited. tip minus tail is the most-used line in all of graphics. Flag the ordering trap now: subtraction is not commutative, and a reversed aim vector is a first-week EX1 bug. Tie it straight back to the hook — aim = R − A is this exact line.

---

## Add and scale, geometrically

Two operations, both with a picture:

- **add** — lay arrows tip-to-tail; `u + v` is tail-of-u to tip-of-v
- **scale** — `2v` is same direction, twice as long; `-v` flips it; `0.5v` halves it

Marching along an aim each frame is **scale-then-add**: `pos = pos + speed * dt * aim`.

Note: Addition and scaling are the two vector-space operations; everything else tonight is built from these plus the two products. "March along a direction" — the EX1 verb — is scale (speed·dt) then add (to position). This is the vectors stretch of S01's loop body (read, nudge, write) now with a vector nudge instead of a scalar one.

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

Note: Real excerpt showing BOTH the hand-built normalize and the engine's `.normalized`. This is the implement-and-replace rule made concrete: you divide by magnitude yourself, then check against `.normalized`. Magnitude is Pythagoras in 3D. A unit vector is the honest representation of "a direction" — no length smuggled in.

---

### The dot product

<small>(~30 min)</small>

---

## The question the dot product answers

Two directions, `a` and `b`. Before any formula:

- **How aligned are they?** Same way, opposite, or square to each other?
- **How much of `a` points along `b`?** (a shadow length)
- **Is the target in front of me or behind me?**

One number answers all three. That number is the dot product.

Note: Pose the uses before the definition (playbook §4). These three questions — angle, projection, side — are the three faces of the dot product, and they map to the next three slide clusters. Naming them first means each definition lands as "oh, that is the how-aligned number", not an abstract sum.

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

Note: Both definitions, side by side, because the bridge between them is the whole tool. The algebraic form is cheap to compute (three multiplies, two adds); the geometric form is what it MEANS (alignment). Set equal and solve for cos(theta) and you get the angle for free — the next slide. Derivation is the law of cosines; state the equality here, use it next.

---

## Worked: the dot product of a and b

Take **a = (2, 1, 0)** and **b = (1, 2, 1)** — the demo's starting vectors.

```text
a . b = 2*1 + 1*2 + 0*1 = 2 + 2 + 0 = 4
|a|   = sqrt(2*2 + 1*1 + 0*0) = sqrt(5) ~= 2.236
|b|   = sqrt(1*1 + 2*2 + 1*1) = sqrt(6) ~= 2.449
```

The dot is **positive (4)**, so the angle is under 90° — the two arrows broadly agree.

Note: Hand-verified, and deliberately the SAME (a, b) the live demo opens with, so the panel reads 4 / 2.24 / 2.45 digit-for-digit (playbook §3 cross-consistency). Recompute live: 2·1=2, 1·2=2, 0·1=0, sum 4. sqrt(5)=2.2360..., sqrt(6)=2.4494.... Positive dot = acute angle; we make that precise next.

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

Note: The angle falls straight out of the equality of the two definitions. 4/sqrt(30): sqrt(30)=5.4772, 4/5.4772=0.7303. acos(0.7303)=43.09°, round 43.1°. This matches the demo's theta readout exactly. Note the tidy special cases: cos=+1 same direction, cos=0 perpendicular (dot exactly 0), cos=−1 opposite — the sign of the dot alone already tells you acute / right / obtuse.

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

Note: Real excerpt, unedited. Line 1 is the algebraic dot; lines 4-5 are exactly the previous slide's two formulas in C#. The Epsilon guard matters — a zero vector has no direction, so the angle is undefined and the division would blow up. `Mathf.Rad2Deg` because `Acos` returns radians. This is the CDP we walk in the studio.

---

## Projection: split a into two parts

"How much of `a` points along `b`?" Decompose `a` into a piece **along b** and a piece **square to b**:

```text
a-along = ( (a . b) / (b . b) ) * b        (the shadow of a on b)
a-perp  = a  -  a-along                     (what's left, perpendicular to b)
```

`a-along` is a scaled copy of `b`; `a-perp` is orthogonal to it. Together they rebuild `a`.

Note: Projection is the second face of the dot. The scalar (a·b)/(b·b) is how many b's fit into a's shadow; times b gives the vector. a-perp is whatever is left over, and it is perpendicular to b by construction — proved on the next slide. This "split into parallel + perpendicular" is the move behind reflection, shadows, and the Gram-Schmidt step that builds the view frame in the cross-product stretch. I write a-along / a-perp as words, never subscripts, on purpose.

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

Note: Prove, don't postulate (playbook §3). Using exact thirds: a-along=(2/3,4/3,2/3), a-perp=(4/3,−1/3,−2/3). The dot a-perp·b = 4/3 − 2/3 − 2/3 = 0 exactly — the leftover really is square to b. This is the payoff of the split: you can always peel a vector into "the part along a direction" plus "the part across it", and the cross-check is one dot product.

---

## Sign = the in-front-of test

The **sign** of the dot is a decision, no angle needed:

```text
a . b  >  0   ->  angle < 90   ->  b is in FRONT of a
a . b  =  0   ->  angle = 90   ->  square on
a . b  <  0   ->  angle > 90   ->  b is BEHIND a
```

Aim `a` = the way the drone faces, `b` = toward the target. `a . b > 0` means the target is ahead. This exact test is the vectors studio's EX3.

Note: The third face, and the cheapest — no sqrt, no acos, just the sign of three-multiplies-and-add. "In front vs behind" is a plane test in disguise (the lines-and-planes stretch reuses it verbatim as which-side-of-a-plane). Bring the hook back: the drone only fires if the target is in front. EX3_InfrontOfExercise is this sign test colored green/red.

---

## Dot &amp; cross, live

<div class="cockpit" data-demo="dot-cross" data-controls="ax,ay,bx,by"><pre class="viz-fallback">  model {ax,ay,az, bx,by,bz} -> arrows + value panel, two views
  -- default state: a=(2,1,0), b=(1,2,1) ------------------
     a . b = 2*1 + 1*2 + 0*1        = 4
     |a|   = sqrt(5) ~= 2.24    |b| = sqrt(6) ~= 2.45
     theta = acos(4/sqrt(30))       ~= 43.1 deg
     a x b = (1*1-0*2, 0*1-2*1, 2*2-1*1) = (1, -2, 3)</pre></div>

Note: The live demo (dot-cross, embed controls ax,ay,bx,by; hidden az=0, bz=1 stay at defaults, so it opens on a=(2,1,0), b=(1,2,1)). The fallback is hand-verified and matches the two prior worked slides digit-for-digit: dot 4, |a| 2.24, |b| 2.45, theta 43.1°, cross (1,−2,3). Drag ax/ay and watch a·b and theta move together; the green a×b arrow is the the cross-product stretch topic, already on screen so the transition is seamless.

---

### The cross product

<small>(~25 min)</small>

---

## The question the cross product answers

The dot gives a **number**. Sometimes you need a **direction**:

- two edges of a triangle — **which way does it face?** (its normal)
- "forward" and "up" — **build a right-facing axis**
- **how big** is the parallelogram they span? (an area)

The cross takes two vectors and returns a **third, perpendicular to both**.

Note: Frame the cross by contrast with the dot (playbook §3, situate). Dot: two vectors in, one scalar out (alignment). Cross: two vectors in, one vector out (perpendicularity). The three bullets are the three uses — normal, frame axis, area — and they organize the rest of the cross-product stretch. "Perpendicular to both inputs" is the defining property; everything else follows from it.

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

Note: Hand-verified, same a and b as the dot-product stretch, matching the demo's green arrow (1,−2,3). The component formula has a cyclic pattern (x uses y,z; y uses z,x; z uses x,y) — point it out, it is how you remember it. The two zero dots are the proof that the result is perpendicular to BOTH inputs: (a×b)·a = 2−2+0 = 0, (a×b)·b = 1−4+3 = 0. That perpendicularity is the whole reason the cross exists.

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

Note: Real excerpt from Chap-6, which draws v1×v2 in black and v2×v1 in red — visibly opposite. The cross is antisymmetric: order picks the side. For our numbers b×a = (−1, 2, −3). This ordering is a live bug source: a mesh whose face windings disagree flips half its normals inward. The right-hand rule is the convention that fixes "which side is out".

---

## The length is an area

The magnitude of the cross is the **area of the parallelogram** the two vectors span:

```text
|a x b| = |a| * |b| * sin(theta)
```

For our a and b: `|a x b| = sqrt(1*1 + 2*2 + 3*3) = sqrt(14) ~= 3.742`.

Cross-check via the geometric form: `sqrt(5)*sqrt(6)*sin(43.1) = sqrt(30)*0.683 ~= 3.742`. **Same number.**

Note: The third use — area — and a second consistency check across the two forms (playbook §3, prove). Component length: sqrt(1+4+9)=sqrt(14)=3.7417. Geometric: sin(43.09°)=0.6831, sqrt(30)·0.6831 = 5.4772·0.6831 = 3.7417. They agree to four figures — the model explains the measurement. A triangle is half a parallelogram, so triangle area = |a×b|/2 ≈ 1.871; that is how you get the area of a mesh face.

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

Note: Real excerpt. THE workhorse use of the cross: every lit triangle needs a normal, and it is the normalized cross of two edges. The `if` is the right-hand-rule ambiguity resolved by fiat — dot the normal against a reference direction and flip if it points the wrong way. This single idea (normal = cross of edges) reappears in meshes, lighting, and collision for the rest of the quarter.

---

## Two vectors, a whole frame

Dot and cross **together** turn two rough vectors into three perpendicular axes — the move behind every view matrix:

```text
w = normalize(a)                 first axis: along a
u = normalize(a x b)             second: perpendicular to the a-b plane
third = normalize(a x (a x b))   completes a right-handed set
```

For our a, b these three are along `(2,1,0)`, `(1,-2,3)`, `(3,-6,-5)` — mutually perpendicular.

Note: Foreshadow the view matrix (S06) explicitly. Given any two non-parallel vectors you can manufacture an orthonormal frame: one cross gives an axis square to both, a second cross completes the trio. Hand-check the three directions are mutually perpendicular: a·(a×b)=0 (shown), a·(a×(a×b)) = 2·3+1·(−6)+0·(−5)=0, (a×b)·(a×(a×b)) = 1·3+(−2)(−6)+3(−5)=3+12−15=0. Three zero dots = three right angles. This is exactly how lookAt builds u, v, w from eye/at/up — you will implement it in S06.

---

### Lines and planes

<small>(~20 min)</small>

---

## The question, before the equations

Two shapes run the whole course; both are "a point plus a direction":

- Is a clicked point **on this segment**, and where's the nearest point on it?
- Is an object **in front of a wall** or behind it, and **how far**?

Neither needs new math — both are the dot and the cross you already have.

Note: Pose before formula (playbook §4). Lines and planes are not a new topic so much as a packaging of the dot and cross stretches: a line is a point plus a direction, a plane is a point plus a normal, and every query about them is a projection (dot) or a normal (cross). Keep the two driving questions on screen; the next slides answer each.

---

## A line is a point and a direction

Every point on the line is the base point plus some amount of the direction:

```text
P(t) = P0 + t * d
```

- `t = 0` sits at `P0`; `t = 1` sits at `P0 + d`; negative `t` runs backward
- `d` is the direction (often kept unit); `t` slides you along it; a **segment** clamps `t` to `[0, 1]` (nearest point on a segment: project, then clamp)
- this is **march-along-a-direction**, now named

Note: The parametric line. One base point, one direction, one scalar knob t. This IS the EX1 marching-along-a-line motion written as an equation — the vectors stretch's `pos = pos + speed*dt*aim` is P(t) with t growing over time. Unit d is convenient because then t is a distance in world units.

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

Note: Real excerpt — the Chap-5 point-to-line CDP we walk in the studio. It is the dot and lines stretches fused: dot the query offset against the unit direction to get the projected length d (that is t in world units), step d along the line to the foot, and the inside test is 0 ≤ d ≤ |v1| — the clamp range. Nothing here is new; it is projection plus a comparison.

---

## A plane is a point and a normal

Flip it around: instead of a direction to run along, a plane has a **normal** it is square to.

```text
n . P = D            (every point P on the plane has the same dot with n)
```

- `n` is the plane's normal (from a cross, the cross-product stretch); `D` fixes how far out it sits
- `D = n . Q` for any known point `Q` on the plane
- if `n` is **unit**, then `D` is the plane's signed distance from the origin

Note: The plane equation. A plane is the set of points whose dot with the normal is a constant — geometrically, "everyone the same height along n". D is that constant, pinned by any one known point Q. Watch the convention: this course uses n·P = D (equivalently n·P − D = 0), which is exactly the convention the EX2/EX3 skeletons state in their comments. Keeping n unit makes D a real distance.

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

Note: Hand-verified. Normalizing is the step students skip — a non-unit normal gives a distance scaled by |m|, so divide first. |m|=3 exactly (1+4+4=9). n·Q = 1/3, n·P = 6/3 = 2, distance = 2 − 1/3 = 5/3 ≈ 1.667. The result is SIGNED: positive means P is on the side the normal points (in front). Flip a coordinate of P to the far side and the sign flips — which is the next slide.

---

## Which side? Reuse the dot sign

The **sign** of `n . P - D` is the which-side test — the same sign trick as the dot-product stretch's in-front-of:

```text
n . P - D  >  0   ->  P is in FRONT (the normal's side)
n . P - D  =  0   ->  P is ON the plane
n . P - D  <  0   ->  P is BEHIND
```

Thursday's EX3 colors a point **green** in front, **red** behind — one dot, one subtraction, one comparison.

Note: The which-side test is the in-front-of test from the dot-product stretch with the plane's constant D subtracted off. This closes the loop: the drone's "target ahead?" and the plane's "which side?" are the same computation. EX3_InfrontOfExercise is literally this — n = the plane's up vector, test the point, set the color. Warn them of the EX3 gotcha: move the plane so its position is not all zeros, or D is trivially 0 and the test looks right for the wrong reason.

---

## Two products, one slide

- **Vector** = displacement (direction + length); a point is one from the origin
- **Dot** `a·b = |a||b|cos θ` — **angle**, **projection**, **which side**
- **Cross** `a×b` ⊥ both — **normal**, **area**, **a frame**
- **Line** `P=P0+t d`, **plane** `n·P=D` — distances and sides are dots

Two products. Rotation (next), cameras, lighting build on them.

Note: The synthesis slide (a real recap, not a roadmap — it earns its place, playbook §3 exception). If they keep four things: displacement, dot's three faces, cross's three uses, and "lines and planes are just dots". Each maps to a Part. This is the scaffold S03 (rotation) and S06 (view matrix) hang on — the frame-from-two-vectors move on the recap is literally next week's tool.
