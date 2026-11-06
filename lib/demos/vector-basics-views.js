// vector-basics-views: the catalog behind the vector-basics demo. A view is one relationship with one picture:
//   { id, topic, label, group?, init, handles, params?, home, presets?, regions, run(m), draw(v, m, r), explain(m, r), enter?(m), edited?(m) }
// m holds the view's editable values (Vector3s and numbers). run(m) calls the WebGL program's own functions
// (lib/programs/vector-basics/webgl/vectorbasics.js) and returns their named results r, so the numbers in the picture, in
// the formulas and beside the code are that code's output. regions names the program sections the code card shows.
// Views with the same group share their values, so a and b set under the dot product are still a and b under the cross.
import * as VB from '../programs/vector-basics/webgl/vectorbasics.js';
import { COL, V, add, sub, mul, mid, unit, cross, tangents } from './vector-basics-viz.js';

// ---------------------------------------------------------------- number and vector text

const clean = (x, d) => { const s = x.toFixed(d); return Number(s) === 0 ? (0).toFixed(d) : s; };
/** a number for a formula: 2 decimals, a true minus sign, NaN spelled out */
export const f = (x, d = 2) => (Number.isFinite(x) ? clean(x, d).replace('-', '−') : (Number.isNaN(x) ? 'none' : '∞'));
const short = (x) => (Number.isFinite(x) ? String(Number(clean(x, 2))).replace('-', '−') : 'none');
/** a vector for a formula: trailing zeros dropped, so (2, 1, 0) stays short */
export const vt = (p) => `(${short(p.x)}, ${short(p.y)}, ${short(p.z)})`;
const deg = (rad) => (Number.isFinite(rad) ? `${f((rad * 180) / Math.PI, 1)}°` : 'none');
const near0 = (x) => Math.abs(x) < 5e-3;

// ---------------------------------------------------------------- homes, handles

const HOME = { eye: [3.5, 3.0, 5.6], target: [0.5, 0.7, 0] };
const WIDE = { eye: [4.8, 3.9, 7.6], target: [0.3, 0.4, 0] };
const GROUND = { eye: [0.3, 6.6, 4.5], target: [0.2, 0, 0.2] };
const FRONT = { eye: [0, 0.4, 9.5], target: [0, 0.4, 0] };
const CROSSV = { eye: [5, 2.4, 6.6], target: [0.8, 0, 0.8] };
const CLOSE = { eye: [2.4, 1.9, 4], target: [0.5, 0.55, 0] };
const TALL = { eye: [4.2, 3.4, 6.8], target: [0.2, 1.3, 0] };
const SIDE = { eye: [6.6, 3, 3.2], target: [-0.2, 0.2, -0.7] };

const pt = (id, color, extra = {}) => ({ id, color, ...extra });
const vec = (id, color, base, extra = {}) => ({ id, color, base, ...extra });
const gpt = (id, color, extra = {}) => ({ id, color, fixed: 'y', ...extra });

/** the formula-term colors; a view's keys extend these */
export const KEYS = {
  a: COL.a, b: COL.b, c: COL.c, θ: COL.cyan, proj: COL.amber, rej: COL.purple, scalar: COL.amber, bHat: COL.b,
  n: COL.c, nHat: COL.c, P: COL.pink, Q: COL.cyan, O: COL.gray, v: COL.amber, u: COL.amber, w: COL.purple, d: COL.gold,
  t: COL.white, s: COL.white, x: COL.gold, X: COL.gold, foot: COL.white, near: COL.c, hit: COL.gold, sum: COL.c, diff: COL.c,
  A: COL.a, B: COL.b, C: COL.c, area: COL.c, height: COL.purple, r: COL.pink, along: COL.amber, across: COL.purple,
  mix: COL.gold, pFromO: COL.pink, qFromO: COL.cyan, e1: COL.a, e2: COL.b, unit: COL.amber, scaled: COL.purple,
  sa: COL.a, sb: COL.b, tb: COL.b, m: COL.purple, slerp: COL.c, nlerp: COL.amber, chord: COL.purple,
};

export const TOPICS = [
  { id: 'points', label: 'Points, vectors' }, { id: 'frames', label: 'Frames' }, { id: 'normalize', label: 'Normalize' },
  { id: 'ops', label: 'Operations' }, { id: 'dot', label: 'Dot' }, { id: 'cross', label: 'Cross' },
  { id: 'define', label: 'Lines, planes' }, { id: 'tests', label: 'Position tests' }, { id: 'interp', label: 'Interpolation' },
];

const AB = { a: [2, 1, 0], b: [1, 2, 1] };
const ABH = [vec('a', COL.a), vec('b', COL.b)];
const AB_PRESETS = [
  { label: 'perpendicular', set: { a: [2, 0, 0], b: [0, 2, 0] } },
  { label: 'parallel', set: { a: [2, 1, 0], b: [3, 1.5, 0] } },
  { label: 'opposite', set: { a: [2, 1, 0], b: [-2, -1, 0] } },
  { label: 'obtuse', set: { a: [2, 1, 0], b: [-1, 1, 1] } },
];

// Five corners for the polygon views, in the ground plane.
const CONVEX5 = { v0: [2, 0, 0], v1: [0.6, 0, 1.9], v2: [-1.6, 0, 1.2], v3: [-1.6, 0, -1.2], v4: [0.6, 0, -1.9] };
const ARROW5 = { v0: [2.4, 0, 0], v1: [-1.8, 0, 2.2], v2: [-0.6, 0, 0], v3: [-1.8, 0, -2.2], v4: [0.6, 0, -0.3] };
const STAR5 = { v0: [2.4, 0, 0], v1: [-1.9, 0, 1.4], v2: [0.7, 0, -2.3], v3: [0.7, 0, 2.3], v4: [-1.9, 0, -1.4] };
const POLY = ['v0', 'v1', 'v2', 'v3', 'v4'];
const polyHandles = POLY.map((id) => gpt(id, COL.b));
const polyVerts = (m) => POLY.map((id) => m[id]);

function drawPolygon(v, verts) {
  v.groundPolygon(verts, COL.b, 0.18, { k: 'poly' });
  v.poly(verts.map((p) => V(p.x, 0.012, p.z)), COL.b, { k: 'poly', closed: true });
}

// ---------------------------------------------------------------- the views

const VIEW_LIST = [
  // ------------------------------------------------------------ points and vectors
  {
    id: 'pv.diff', topic: 'points', label: 'Q − P',
    init: { P: [-1.5, 0.5, 1], Q: [2, 1.5, -1], O: [0, 0, 0] },
    handles: [pt('P', COL.pink), pt('Q', COL.cyan), pt('O', COL.gray)],
    home: HOME,
    presets: [{ label: 'move O', set: { O: [-2, 1, 2] } }, { label: 'O at the origin', set: { O: [0, 0, 0] } }, { label: 'P = Q', set: { P: [1, 1, 0], Q: [1, 1, 0] } }],
    regions: ['Points and vectors: subtract, add, move the origin'],
    run: (m) => VB.pointsAndVectors(m.P, m.Q, m.O),
    draw(v, m, r) {
      v.dashed(m.O, m.P, COL.pink, { k: 'pFromO' });
      v.dashed(m.O, m.Q, COL.cyan, { k: 'qFromO' });
      v.arrow(m.P, m.Q, COL.amber, { k: 'v', r: 0.04, hr: 0.11 });
      v.label('v', mid(m.P, m.Q), COL.amber, 'a', 'v');
      // the same vector, drawn from elsewhere: a vector has no position of its own
      v.vec(m.O, r.v, COL.amber, { k: 'v', r: 0.014, hr: 0.06, head: 0.18 });
      v.vec(V(-3, 0, -2.5), r.v, COL.amber, { k: 'v', r: 0.014, hr: 0.06, head: 0.18, label: 'v again', anchor: 'a' });
    },
    explain: (m, r) => ({
      hud: `{v} = {Q} − {P} = ${vt(r.v)}`,
      rows: [
        `{v} = {Q} − {P} = ${vt(m.Q)} − ${vt(m.P)} = {v|${vt(r.v)}}`,
        `{P} + {v} = {Q|${vt(r.r)}}, the point Q again`,
        `measured from {O}: {pFromO|P − O} = ${vt(r.pFromO)}, {qFromO|Q − O} = ${vt(r.qFromO)}`,
        `({qFromO|Q − O}) − ({pFromO|P − O}) = {v|${vt(r.vFromO)}}, whatever O is`,
      ],
      fact: 'A point is a position and needs an origin. A vector is a displacement and has no position: all three amber arrows are v.',
      values: [['P from O', vt(r.pFromO), 'pFromO'], ['Q from O', vt(r.qFromO), 'qFromO'], ['v', vt(r.v), 'v'], ['|v|', f(r.v.length()), 'v']],
    }),
  },
  {
    id: 'pv.affine', topic: 'points', label: 'what adds',
    init: { P: [-1.5, 0.5, 1], Q: [2, 1.5, -1], O: [0, 0, 0], t: 0.5 },
    handles: [pt('P', COL.pink), pt('Q', COL.cyan), pt('O', COL.gray)],
    params: [{ id: 't', label: 't', min: -0.5, max: 1.5, step: 0.01, play: true }],
    home: WIDE,
    presets: [{ label: 'midpoint', set: { t: 0.5 } }, { label: 'move O', set: { O: [-2, 1, 2] } }, { label: 'O at the origin', set: { O: [0, 0, 0] } }],
    regions: ['Points and vectors: what adds and what does not'],
    run: (m) => VB.affineCombination(m.P, m.Q, m.O, m.t),
    draw(v, m, r) {
      v.patch([m.O, m.P, r.sum, m.Q], COL.a, 0.08, { k: 'sum' });
      v.dashed(m.O, m.P, COL.pink, { k: 'pFromO' });
      v.dashed(m.O, m.Q, COL.cyan, { k: 'qFromO' });
      v.dashed(m.P, r.sum, COL.a, { k: 'sum' });
      v.dashed(m.Q, r.sum, COL.a, { k: 'sum' });
      v.point(r.sum, COL.a, { k: 'sum', r: 0.11, label: 'P + Q, from O', anchor: 'a' });
      v.bar(m.P, m.Q, COL.gold, { k: 'mix', r: 0.02 });
      v.point(r.mix, COL.gold, { k: 'mix', r: 0.12, label: '(1−t)P + tQ', anchor: 'b' });
    },
    explain: (m, r) => ({
      hud: `{mix|(1−t)P + tQ} ignores {O}; {sum|P + Q} does not`,
      rows: [
        `{mix|(1−${f(m.t)})P + ${f(m.t)}Q} = {mix|${vt(r.mix)}}, weights sum to 1`,
        `{sum|(P − O) + (Q − O) + O} = {sum|${vt(r.sum)}}, weights sum to 2`,
        `{sum} − {P} − {Q} = ${vt(sub(sub(r.sum, m.P), m.Q))} = −{O}`,
      ],
      fact: 'Drag O: the gold point stays, the red one moves. Weights that sum to 1 cancel the origin, so they give a point. Other weights give an answer that depends on the origin chosen.',
      values: [['weights', `${f(1 - m.t)} + ${f(m.t)} = 1`, 'mix'], ['mix', vt(r.mix), 'mix'], ['P + Q from O', vt(r.sum), 'sum']],
    }),
  },
  {
    id: 'pv.w', topic: 'points', label: 'w = 1, w = 0',
    init: { p: [-2, 0.5, 1], v: [1.5, 1, 0], move: [1.5, 0.5, -2] },
    handles: [pt('p', COL.pink), vec('v', COL.amber, 'p'), vec('move', COL.gray)],
    home: HOME,
    presets: [{ label: 'no move', set: { move: [0, 0, 0] } }, { label: 'up 2', set: { move: [0, 2, 0] } }],
    regions: ['Points and vectors: w = 1 and w = 0'],
    keys: { p: COL.pink, pMoved: COL.pink, vMoved: COL.amber, move: COL.gray },
    run: (m) => VB.homogeneous(m.p, m.v, m.move),
    draw(v, m, r) {
      const pm = V(r.pMoved.x, r.pMoved.y, r.pMoved.z);
      const vm = V(r.vMoved.x, r.vMoved.y, r.vMoved.z);
      v.arrow(V(), m.move, COL.gray, { k: 'move', r: 0.016, hr: 0.06, head: 0.18 });
      v.arrow(m.p, add(m.p, m.v), COL.amber, { k: 'v', r: 0.03 });
      v.arrow(m.p, pm, COL.gray, { k: 'move', r: 0.016, hr: 0.06, head: 0.18 });
      v.arrow(pm, add(pm, vm), COL.amber, { k: 'vMoved', r: 0.03, label: 'v, unchanged', anchor: 'a' });
      v.point(pm, COL.pink, { k: 'pMoved', r: 0.12, label: 'p moved', anchor: 'b' });
    },
    explain: (m, r) => ({
      hud: `{pMoved|(x, y, z, 1)} moves by {move}; {vMoved|(x, y, z, 0)} does not`,
      rows: [
        `[I {move|t}] {p|(${short(m.p.x)}, ${short(m.p.y)}, ${short(m.p.z)}, 1)} = {pMoved|(${short(r.pMoved.x)}, ${short(r.pMoved.y)}, ${short(r.pMoved.z)}, 1)}`,
        `[I {move|t}] {v|(${short(m.v.x)}, ${short(m.v.y)}, ${short(m.v.z)}, 0)} = {vMoved|(${short(r.vMoved.x)}, ${short(r.vMoved.y)}, ${short(r.vMoved.z)}, 0)}`,
      ],
      fact: 'The translation column is multiplied by w. A direction, a velocity and a normal are vectors, so a translation leaves them alone.',
      values: [['p', vt(m.p), 'p'], ['p moved', vt(V(r.pMoved.x, r.pMoved.y, r.pMoved.z)), 'pMoved'], ['v', vt(m.v), 'v'], ['v moved', vt(V(r.vMoved.x, r.vMoved.y, r.vMoved.z)), 'vMoved']],
    }),
  },

  // ------------------------------------------------------------ frames
  {
    id: 'frame.build', topic: 'frames', label: 'build one', group: 'ab',
    init: AB, handles: ABH, home: HOME, presets: AB_PRESETS.slice(0, 2),
    regions: ['Frames: build one from two vectors'],
    run: (m) => VB.buildFrame(m.a, m.b),
    draw(v, m, r) {
      const o = V();
      v.arrow(o, m.a, COL.a, { k: 'a', r: 0.018, hr: 0.07 });
      v.arrow(o, m.b, COL.b, { k: 'b', r: 0.018, hr: 0.07 });
      v.dashed(o, r.along, COL.gray, { k: 'along' });
      v.arrow(r.along, m.b, COL.gray, { k: 'across', r: 0.014, hr: 0.06, head: 0.18, label: 'across', anchor: 'l' });
      v.arrow(o, r.u, COL.amber, { k: 'u', r: 0.05, hr: 0.11, label: 'u', anchor: 'b' });
      if (r.acrossLen > VB.EPS) {
        v.arrow(o, r.v, COL.c, { k: 'v', r: 0.05, hr: 0.11, label: 'v', anchor: 'l' });
        v.arrow(o, r.w, COL.purple, { k: 'w', r: 0.05, hr: 0.11, label: 'w', anchor: 'r' });
        v.rightAngle(r.along, unit(sub(o, r.along)), r.v, 0.18, COL.white, 'across');
      }
    },
    keys: { v: COL.c, u: COL.amber, w: COL.purple, across: COL.gray, along: COL.gray },
    explain: (m, r) => ({
      hud: `{u} ⟂ {v} ⟂ {w}, each of length 1, and {u} × {v} = {w}`,
      rows: [
        `{u} = {a} / |{a}| = {u|${vt(r.u)}}`,
        `{across} = {b} − ({b}·{u}){u} = {across|${vt(r.across)}}`,
        `{v} = {across} / |{across}| = {v|${vt(r.v)}}`,
        `{w} = {u} × {v} = {w|${vt(r.w)}}`,
      ],
      status: r.acrossLen > VB.EPS
        ? { text: 'three unit axes, each square to the other two', tone: 'ok' }
        : { text: 'b is parallel to a: nothing is left across, so there is no frame', tone: 'bad' },
      fact: 'A cross product gives the third axis, so two vectors that are not parallel determine a frame. LH in the picture shows the same numbers on Unity\'s axes.',
      values: [['u·v', f(r.u.dot(r.v), 3), 'v'], ['u·w', f(r.u.dot(r.w), 3), 'w'], ['v·w', f(r.v.dot(r.w), 3), 'w'], ['|u|, |v|, |w|', `${f(r.u.length())}, ${f(r.v.length())}, ${f(r.w.length())}`, 'u']],
    }),
  },
  {
    id: 'frame.coords', topic: 'frames', label: 'coordinates',
    init: { O: [1, 0.2, -1.5], a: [2, 0.5, 0.5], b: [-0.5, 1.5, 1], P: [2, 2.2, 1] },
    handles: [pt('P', COL.pink), pt('O', COL.gray), vec('a', COL.a, 'O'), vec('b', COL.b, 'O')],
    home: WIDE,
    presets: [{ label: 'P at O', set: { P: [1, 0.2, -1.5] } }, { label: 'world axes', set: { O: [0, 0, 0], a: [2, 0, 0], b: [0, 2, 0] } }],
    regions: ['Frames: build one from two vectors', "Frames: a point's coordinates in a frame"],
    keys: { x: COL.amber, y: COL.c, z: COL.purple, r: COL.pink, v: COL.c },
    run(m) {
      const fr = VB.buildFrame(m.a, m.b);
      return { ...fr, ...VB.pointInFrame(m.P, m.O, fr.u, fr.v, fr.w) };
    },
    draw(v, m, r) {
      v.vec(m.O, r.u, COL.amber, { k: 'x', r: 0.045, hr: 0.1, label: 'u', anchor: 'b' });
      v.vec(m.O, r.v, COL.c, { k: 'y', r: 0.045, hr: 0.1, label: 'v', anchor: 'l' });
      v.vec(m.O, r.w, COL.purple, { k: 'z', r: 0.045, hr: 0.1, label: 'w', anchor: 'r' });
      v.vec(m.O, m.a, COL.a, { k: 'a', r: 0.012, hr: 0.05, head: 0.16 });
      v.vec(m.O, m.b, COL.b, { k: 'b', r: 0.012, hr: 0.05, head: 0.16 });
      const p1 = add(m.O, mul(r.u, r.x));
      const p2 = add(p1, mul(r.v, r.y));
      const p3 = add(p2, mul(r.w, r.z));
      v.bar(m.O, p1, COL.amber, { k: 'x', r: 0.022 });
      v.bar(p1, p2, COL.c, { k: 'y', r: 0.022 });
      v.bar(p2, p3, COL.purple, { k: 'z', r: 0.022 });
      v.label(`x = ${f(r.x)}`, mid(m.O, p1), COL.amber, 'b', 'x');
      v.label(`y = ${f(r.y)}`, mid(p1, p2), COL.c, 'l', 'y');
      v.label(`z = ${f(r.z)}`, mid(p2, p3), COL.purple, 'r', 'z');
      v.dashed(m.O, m.P, COL.pink, { k: 'r' });
    },
    explain: (m, r) => ({
      hud: `{x} = ({r|P − O})·{u}, {y} = ({r|P − O})·{v}, {z} = ({r|P − O})·{w}`,
      rows: [
        `{x} = ${vt(r.r)}·${vt(r.u)} = {x|${f(r.x)}}`,
        `{y} = ${vt(r.r)}·${vt(r.v)} = {y|${f(r.y)}}`,
        `{z} = ${vt(r.r)}·${vt(r.w)} = {z|${f(r.z)}}`,
        `{O} + {x}{u} + {y}{v} + {z}{w} = {P|${vt(r.back)}}`,
      ],
      fact: 'One point, two sets of coordinates. Walking x along u, y along v and z along w from O arrives at P. A vector in the frame takes the same three dots without subtracting O.',
      values: [['P in the world', vt(m.P), 'P'], ['P in the frame', `(${short(r.x)}, ${short(r.y)}, ${short(r.z)})`, 'r']],
    }),
  },

  // ------------------------------------------------------------ normalize
  {
    id: 'norm', topic: 'normalize', label: 'length and direction',
    init: { v: [2, 1.5, 1.5], s: 1 },
    handles: [vec('v', COL.a)],
    params: [{ id: 's', label: 's', min: -2, max: 2, step: 0.05 }],
    home: HOME,
    presets: [{ label: '3-4-5', set: { v: [3, 0, 4] } }, { label: '(1, 1, 1)', set: { v: [1, 1, 1] } }, { label: 'already unit', set: { v: [0, 1, 0] } }, { label: 'zero', set: { v: [0, 0, 0] } }],
    regions: ['Normalizing: length and direction'],
    keys: { v: COL.a, floor: COL.gray, len: COL.a, unit: COL.amber, scaled: COL.purple },
    run: (m) => VB.normalizeVector(m.v, m.s),
    draw(v, m, r) {
      const o = V();
      const base = V(m.v.x, 0, m.v.z);
      v.sphere(o, 1, COL.dim, { k: 'unit' });
      v.arrow(o, m.v, COL.a, { k: 'v', r: 0.03 });
      v.bar(o, V(m.v.x, 0, 0), COL.gray, { k: 'floor', r: 0.012 });
      v.bar(V(m.v.x, 0, 0), base, COL.gray, { k: 'floor', r: 0.012 });
      v.bar(o, base, COL.gray, { k: 'floor', r: 0.018 });
      v.dashed(base, m.v, COL.gray, { k: 'len' });
      if (r.floor > 0.2) v.label(`√(x²+z²) = ${f(r.floor)}`, mid(o, base), COL.gray, 'b', 'floor');
      v.arrow(o, r.unit, COL.amber, { k: 'unit', r: 0.05, hr: 0.11 });
      v.point(r.unit, COL.amber, { k: 'unit', r: 0.09, label: 'v̂', anchor: 'r' });
      if (Math.abs(m.s - 1) > 1e-3) v.arrow(o, r.scaled, COL.purple, { k: 'scaled', r: 0.016, hr: 0.07, label: 's v', anchor: 'l' });
    },
    explain: (m, r) => ({
      hud: `|{v}| = √(x² + y² + z²) = {len|${f(r.len)}},  {unit|v̂} = {v} / |{v}|`,
      rows: [
        `{floor|√(x² + z²)} = √(${f(m.v.x)}² + ${f(m.v.z)}²) = {floor|${f(r.floor)}}`,
        `{len||v|} = √(${f(r.floor)}² + ${f(m.v.y)}²) = {len|${f(r.len)}}`,
        `{unit|v̂} = ${vt(m.v)} / ${f(r.len)} = {unit|${vt(r.unit)}}`,
        `|{unit|v̂}| = ${f(r.unitLen, 3)},  |{scaled|s v}| = |s||v| = ${f(r.scaled.length())}`,
      ],
      status: r.len < VB.EPS
        ? { text: 'v = 0: no direction to keep. three.js and Unity return zero; dividing by the length by hand gives NaN', tone: 'bad' }
        : m.s < 0 ? { text: 's < 0: the direction of s v is −v̂', tone: 'warn' } : { text: 's > 0: s v has the same direction, so the same v̂', tone: 'ok' },
      fact: 'The wire sphere has radius 1, and v̂ always lands on it. A normal or a light direction must be unit length before it goes into a dot product.',
      values: [['|v|', f(r.len, 3), 'len'], ['v̂', vt(r.unit), 'unit'], ['s v', vt(r.scaled), 'scaled'], ['unit of s v', vt(r.scaledUnit), 'scaled']],
    }),
  },

  // ------------------------------------------------------------ operations
  {
    id: 'ops.add', topic: 'ops', label: 'a + b', group: 'ab',
    init: AB, handles: ABH, home: HOME, presets: AB_PRESETS.slice(0, 3),
    regions: ['Operations: add'],
    run: (m) => VB.addVectors(m.a, m.b),
    draw(v, m, r) {
      const o = V();
      v.patch([o, m.a, r.sum, m.b], COL.c, 0.08, { k: 'sum' });
      v.arrow(o, m.a, COL.a, { k: 'a' });
      v.arrow(o, m.b, COL.b, { k: 'b' });
      v.arrow(m.a, r.sum, COL.b, { k: 'b', r: 0.016, hr: 0.06, head: 0.2 });
      v.arrow(m.b, r.sum, COL.a, { k: 'a', r: 0.016, hr: 0.06, head: 0.2 });
      v.arrow(o, r.sum, COL.c, { k: 'sum', r: 0.04, hr: 0.1, label: 'a + b', anchor: 'a' });
    },
    explain: (m, r) => ({
      hud: `{a} + {b} = {b} + {a} = {sum|${vt(r.sum)}}`,
      rows: [
        `x: ${f(m.a.x)} + ${f(m.b.x)} = {sum|${f(r.sum.x)}}`,
        `y: ${f(m.a.y)} + ${f(m.b.y)} = {sum|${f(r.sum.y)}}`,
        `z: ${f(m.a.z)} + ${f(m.b.z)} = {sum|${f(r.sum.z)}}`,
      ],
      fact: 'Tip to tail: b from a\'s tip, or a from b\'s tip. The two paths are the sides of a parallelogram and its diagonal is the sum.',
      values: [['a + b', vt(r.sum), 'sum'], ['b + a', vt(r.sumOther), 'sum'], ['|a + b|', f(r.sum.length()), 'sum'], ['|a| + |b|', f(m.a.length() + m.b.length())]],
    }),
  },
  {
    id: 'ops.sub', topic: 'ops', label: 'a − b', group: 'ab',
    init: AB, handles: ABH, home: HOME, presets: AB_PRESETS.slice(0, 3),
    regions: ['Operations: subtract'],
    keys: { negB: COL.b, viaNeg: COL.c },
    run: (m) => VB.subtractVectors(m.a, m.b),
    draw(v, m, r) {
      const o = V();
      v.arrow(o, m.a, COL.a, { k: 'a' });
      v.arrow(o, m.b, COL.b, { k: 'b' });
      v.arrow(m.b, m.a, COL.c, { k: 'diff', r: 0.04, hr: 0.1 });
      v.label('a − b', mid(m.a, m.b), COL.c, 'a', 'diff');
      v.arrow(o, r.negB, COL.b, { k: 'negB', r: 0.016, hr: 0.06, head: 0.2, label: '−b', anchor: 'b' });
      v.arrow(r.negB, r.viaNeg, COL.a, { k: 'a', r: 0.012, hr: 0.05, head: 0.18 });
      v.arrow(o, r.viaNeg, COL.c, { k: 'viaNeg', r: 0.016, hr: 0.06, head: 0.2, label: 'a + (−b)', anchor: 'b' });
    },
    explain: (m, r) => ({
      hud: `{a} − {b} = {a} + ({negB|−b}) = {diff|${vt(r.diff)}}`,
      rows: [
        `{diff} = ${vt(m.a)} − ${vt(m.b)} = {diff|${vt(r.diff)}}`,
        `{a} + ({negB|−b}) = ${vt(m.a)} + ${vt(r.negB)} = {viaNeg|${vt(r.viaNeg)}}`,
      ],
      fact: 'a − b runs from the tip of b to the tip of a. For two points it is the arrow between them, and its length is their distance.',
      values: [['a − b', vt(r.diff), 'diff'], ['distance', f(r.diff.length()), 'diff']],
    }),
  },
  {
    id: 'ops.scale', topic: 'ops', label: 's a', group: 'ab',
    init: { ...AB, s: 1.5 }, handles: [vec('a', COL.a)],
    params: [{ id: 's', label: 's', min: -2, max: 2, step: 0.05 }],
    home: HOME,
    presets: [{ label: 'double', set: { s: 2 } }, { label: 'reverse', set: { s: -1 } }, { label: 'zero', set: { s: 0 } }],
    regions: ['Operations: scale'],
    run: (m) => VB.scaleVector(m.a, m.s),
    draw(v, m, r) {
      const o = V();
      v.line(o, m.a, COL.dim, { k: 'a' });
      v.arrow(o, r.scaled, COL.c, { k: 'scaled', r: 0.05, hr: 0.12, label: 's a', anchor: 'b' });
      v.arrow(o, m.a, COL.a, { k: 'a', r: 0.025 });
    },
    keys: { scaled: COL.c },
    explain: (m, r) => ({
      hud: `|${f(m.s)} {a}| = |${f(m.s)}| × ${f(r.lenA)} = {scaled|${f(r.lenScaled)}}`,
      rows: [`${f(m.s)} × ${vt(m.a)} = {scaled|${vt(r.scaled)}}`, `|{scaled|s a}| = |s||{a}| = {scaled|${f(r.lenScaled)}}`],
      status: m.s < 0 ? { text: 's < 0 reverses the arrow', tone: 'warn' } : near0(m.s) ? { text: 's = 0 gives the zero vector', tone: 'bad' } : { text: 's > 0 keeps the direction', tone: 'ok' },
      fact: 'Scaling stays on the line through the origin along a.',
      values: [['s a', vt(r.scaled), 'scaled'], ['|a|', f(r.lenA), 'a'], ['|s a|', f(r.lenScaled), 'scaled']],
    }),
  },
  {
    id: 'ops.combo', topic: 'ops', label: 's a + t b', group: 'ab',
    init: { ...AB, s: 0.8, t: 0.6 }, handles: ABH,
    params: [{ id: 's', label: 's', min: -2, max: 2, step: 0.05 }, { id: 't', label: 't', min: -2, max: 2, step: 0.05 }],
    home: HOME,
    presets: [{ label: 'parallel', set: { a: [2, 1, 0], b: [3, 1.5, 0] } }, { label: 'perpendicular', set: { a: [2, 0, 0], b: [0, 2, 0] } }],
    regions: ['Operations: linear combination'],
    keys: { sa: COL.a, tb: COL.b, c: COL.gold, normal: COL.c },
    run: (m) => VB.linearCombination(m.a, m.b, m.s, m.t),
    draw(v, m, r) {
      const o = V();
      const parallel = r.normal.length() < VB.EPS;
      if (!parallel) {
        for (let i = -2; i <= 2; i++) {
          v.poly([add(mul(m.a, i), mul(m.b, -2)), add(mul(m.a, i), mul(m.b, 2))], COL.dim);
          v.poly([add(mul(m.a, -2), mul(m.b, i)), add(mul(m.a, 2), mul(m.b, i))], COL.dim);
        }
        v.patch([add(mul(m.a, -2), mul(m.b, -2)), add(mul(m.a, 2), mul(m.b, -2)), add(mul(m.a, 2), mul(m.b, 2)), add(mul(m.a, -2), mul(m.b, 2))], COL.c, 0.05, { k: 'normal' });
      } else {
        v.line(o, m.a, COL.dim);
      }
      v.arrow(o, m.a, COL.a, { k: 'a', r: 0.018, hr: 0.07 });
      v.arrow(o, m.b, COL.b, { k: 'b', r: 0.018, hr: 0.07 });
      v.arrow(o, r.sa, COL.a, { k: 'sa', r: 0.035, hr: 0.1 });
      v.arrow(r.sa, r.c, COL.b, { k: 'tb', r: 0.035, hr: 0.1 });
      v.arrow(o, r.c, COL.gold, { k: 'c', r: 0.04, hr: 0.11, label: 's a + t b', anchor: 'a' });
    },
    explain: (m, r) => ({
      hud: `{c|c} = ${f(m.s)} {a} + ${f(m.t)} {b} = {c|${vt(r.c)}}`,
      rows: [
        `{sa|s a} = {sa|${vt(r.sa)}},  {tb|t b} = {tb|${vt(r.tb)}}`,
        `{c|c} = {sa|s a} + {tb|t b} = {c|${vt(r.c)}}`,
        `{c|c}·({a} × {b}) = ${f(r.offPlane, 3)}`,
      ],
      status: r.normal.length() < VB.EPS ? { text: 'a parallel to b: the combinations fill a line, not a plane', tone: 'bad' } : { text: 'a and b are a basis of their plane: every point of it has one (s, t)', tone: 'ok' },
      fact: 'c stays in the plane of a and b for every s and t, because a × b is square to both.',
      values: [['c', vt(r.c), 'c'], ['c·(a×b)', f(r.offPlane, 3), 'normal']],
    }),
  },

  // ------------------------------------------------------------ dot
  {
    id: 'dot.angle', topic: 'dot', label: 'angle', group: 'ab',
    init: AB, handles: ABH, home: HOME, presets: AB_PRESETS,
    regions: ['Dot: the angle between two vectors'],
    keys: { d: COL.gold, rebuilt: COL.gold, cosT: COL.cyan, lenA: COL.a, lenB: COL.b },
    run: (m) => VB.angleBetween(m.a, m.b),
    draw(v, m, r) {
      const o = V();
      v.arrow(o, m.a, COL.a, { k: 'a', r: 0.035, hr: 0.1 });
      v.arrow(o, m.b, COL.b, { k: 'b', r: 0.035, hr: 0.1 });
      v.arc(o, m.a, m.b, 0.8, COL.cyan, { k: 'θ', label: `θ = ${deg(r.theta)}` });
      if (Math.abs(r.d) < 5e-3 && Number.isFinite(r.theta)) v.rightAngle(o, unit(m.a), unit(m.b), 0.26, COL.white, 'θ');
    },
    explain: (m, r) => ({
      hud: `{a}·{b} = |{a}||{b}| cos {θ}:  {d|${f(r.d)}} = {lenA|${f(r.lenA)}} × {lenB|${f(r.lenB)}} × {cosT|${f(r.cosT, 3)}}`,
      rows: [
        `{a}·{b} = a<sub>x</sub>b<sub>x</sub> + a<sub>y</sub>b<sub>y</sub> + a<sub>z</sub>b<sub>z</sub>`,
        `= ${f(m.a.x)}·${f(m.b.x)} + ${f(m.a.y)}·${f(m.b.y)} + ${f(m.a.z)}·${f(m.b.z)} = {d|${f(r.d)}}`,
        `|{a}||{b}| cos {θ} = {lenA|${f(r.lenA)}} × {lenB|${f(r.lenB)}} × {cosT|${f(r.cosT, 3)}} = {rebuilt|${f(r.rebuilt)}}`,
        `{θ} = acos({d|${f(r.d)}} / ({lenA|${f(r.lenA)}} × {lenB|${f(r.lenB)}})) = {θ|${deg(r.theta)}}`,
      ],
      status: !Number.isFinite(r.theta) ? { text: 'a zero vector has no direction, so no angle: cos θ divides by zero', tone: 'bad' }
        : Math.abs(r.d) < 5e-3 ? { text: 'a·b = 0: square to each other', tone: 'ok' }
          : r.d > 0 ? { text: 'a·b > 0: the angle is under 90°', tone: 'ok' } : { text: 'a·b < 0: the angle is over 90°', tone: 'warn' },
      chart: { x: [0, 180], y: [-1, 1], xLabel: 'θ', series: [{ fn: (x) => Math.cos((x * Math.PI) / 180), color: COL.cyan }], at: (r.theta * 180) / Math.PI, atY: r.cosT, curve: 'cos θ' },
      values: [['|a|', f(r.lenA), 'a'], ['|b|', f(r.lenB), 'b'], ['cos θ', f(r.cosT, 3), 'θ'], ['θ', deg(r.theta), 'θ']],
    }),
  },
  {
    id: 'dot.project', topic: 'dot', label: 'projection', group: 'ab',
    init: AB, handles: ABH, home: HOME, presets: AB_PRESETS,
    regions: ['Dot: projection'],
    run: (m) => VB.projectOnto(m.a, m.b),
    draw(v, m, r) {
      const o = V();
      v.line(o, m.b, COL.dim, { k: 'b' });
      v.arrow(o, m.a, COL.a, { k: 'a', r: 0.03 });
      v.arrow(o, m.b, COL.b, { k: 'b', r: 0.018, hr: 0.07 });
      v.arrow(o, r.proj, COL.amber, { k: 'proj', r: 0.05, hr: 0.12, label: 'proj', anchor: 'b' });
      v.arrow(r.proj, m.a, COL.purple, { k: 'rej', r: 0.03, hr: 0.09 });
      v.label('rej', mid(r.proj, m.a), COL.purple, 'r', 'rej');
      if (r.rej.length() > 0.1 && r.proj.length() > 0.1) v.rightAngle(r.proj, unit(mul(r.proj, -1)), unit(r.rej), 0.2, COL.white, 'rej');
      v.arc(o, m.a, m.b, 0.55, COL.cyan, { k: 'θ', label: 'θ' });
    },
    explain: (m, r) => ({
      hud: `{scalar|a·b̂} = |{a}| cos {θ} = {scalar|${f(r.scalar)}}`,
      rows: [
        `{bHat|b̂} = {b} / |{b}| = {bHat|${vt(r.bHat)}}`,
        `{scalar|a·b̂} = {scalar|${f(r.scalar)}}, the signed length of the shadow`,
        `{proj} = ({scalar|a·b̂}) {bHat|b̂} = {proj|${vt(r.proj)}}`,
        `{rej} = {a} − {proj} = {rej|${vt(r.rej)}}`,
        `{rej}·{b} = ${f(r.check, 3)}, {proj} + {rej} = {a}`,
      ],
      status: m.b.length() < VB.EPS ? { text: 'b = 0: there is no direction to project onto', tone: 'bad' } : r.scalar < 0 ? { text: 'negative length: the shadow points against b', tone: 'warn' } : { text: 'a splits into a part along b and a part square to b', tone: 'ok' },
      fact: 'A dot with a unit vector measures along it. This one split is the basis of frames, reflection, distance to a plane, and closest points.',
      values: [['a·b̂', f(r.scalar), 'scalar'], ['proj', vt(r.proj), 'proj'], ['rej', vt(r.rej), 'rej'], ['|rej|', f(r.rej.length()), 'rej']],
    }),
  },
  {
    id: 'dot.facing', topic: 'dot', label: 'front, behind, cone',
    init: { f: [2.4, 0.4, 0], t: [1.6, 1.4, 1.2], fov: 70 },
    handles: [vec('f', COL.gold), vec('t', COL.pink)],
    params: [{ id: 'fov', label: 'field of view', min: 10, max: 170, step: 1, unit: '°' }],
    home: HOME,
    presets: [{ label: 'inside', set: { t: [2, 0.5, 0.2] } }, { label: 'outside the cone', set: { t: [0.4, 2, 1.2] } }, { label: 'behind', set: { t: [-2, -0.2, 1] } }, { label: 'exactly beside', set: { f: [2, 0, 0], t: [0, 2, 0] } }],
    regions: ['Dot: in front, behind, inside a cone'],
    keys: { f: COL.gold, t: COL.pink, fHat: COL.gold, tHat: COL.pink, cosT: COL.cyan, cosHalf: COL.c },
    run: (m) => VB.facing(m.f, m.t, m.fov),
    draw(v, m, r) {
      const o = V();
      v.plane(o, m.f, 2.8, COL.dim, { opacity: 0.18, grid: false, k: 'ahead' });
      v.cone(o, m.f, m.fov / 2, 3, COL.c, 0.12, { k: 'cosHalf' });
      v.arrow(o, m.f, COL.gold, { k: 'f', r: 0.04, hr: 0.11 });
      v.arrow(o, m.t, r.inCone ? COL.c : r.ahead ? COL.amber : COL.red, { k: 't', r: 0.03 });
      v.arc(o, m.f, m.t, 0.7, COL.cyan, { k: 'cosT', label: deg(Math.acos(Math.min(1, Math.max(-1, r.cosT)))) });
    },
    explain: (m, r) => ({
      hud: `{cosT|f̂·t̂} = {cosT|${f(r.cosT, 3)}},  {cosHalf|cos(fov/2)} = {cosHalf|${f(r.cosHalf, 3)}}`,
      rows: [
        `{cosT|f̂·t̂} > 0 : ${r.ahead ? 'yes, in front' : 'no, behind or beside'}`,
        `{cosT|f̂·t̂} > {cosHalf|cos(${f(m.fov / 2, 0)}°)} : ${r.inCone ? 'yes, inside the cone' : 'no, outside the cone'}`,
      ],
      status: r.inCone ? { text: 'inside the cone', tone: 'ok' } : r.ahead ? { text: 'in front of the viewer, outside the cone', tone: 'warn' } : { text: 'behind the plane square to forward', tone: 'bad' },
      fact: 'No angle is computed: comparing cosines is enough, and it needs no acos. Back-face culling is this same sign test, with the normal for f and the direction to the eye for t.',
      values: [['f̂', vt(r.fHat), 'f'], ['t̂', vt(r.tHat), 't']],
    }),
  },
  {
    id: 'dot.lambert', topic: 'dot', label: 'Lambert shading',
    init: { n: [0, 2, 0], l: [1.4, 1.6, 0.6] },
    handles: [vec('n', COL.c), vec('l', COL.gold)],
    home: HOME,
    presets: [{ label: 'overhead', set: { l: [0, 3, 0] } }, { label: 'at 60°', set: { n: [0, 2, 0], l: [2.6, 1.5, 0] } }, { label: 'grazing', set: { n: [0, 2, 0], l: [3, 0.1, 0] } }, { label: 'behind', set: { n: [0, 2, 0], l: [1, -1.5, 0] } }],
    regions: ['Dot: Lambert shading'],
    keys: { l: COL.gold, lHat: COL.gold, cosT: COL.cyan, diffuse: COL.white },
    run: (m) => VB.lambert(m.n, m.l),
    draw(v, m, r) {
      const o = V();
      const g = Math.round(40 + 215 * r.diffuse);
      const shade = (g << 16) + (g << 8) + g;
      v.plane(o, m.n, 2, shade, { k: 'diffuse', opacity: 0.92, grid: false });
      v.arrow(o, m.n, COL.c, { k: 'n', r: 0.04, hr: 0.11 });
      v.arrow(o, m.l, COL.gold, { k: 'l', r: 0.04, hr: 0.11 });
      v.arc(o, m.n, m.l, 0.8, COL.cyan, { k: 'cosT', label: 'θ' });
    },
    explain: (m, r) => ({
      hud: `{diffuse|diffuse} = max(0, {nHat|n̂}·{lHat|l̂}) = {diffuse|${f(r.diffuse, 3)}}`,
      rows: [
        `{nHat|n̂} = {nHat|${vt(r.nHat)}},  {lHat|l̂} = {lHat|${vt(r.lHat)}}`,
        `{nHat|n̂}·{lHat|l̂} = {cosT|${f(r.cosT, 3)}}`,
        `{diffuse|diffuse} = max(0, {cosT|${f(r.cosT, 3)}}) = {diffuse|${f(r.diffuse, 3)}}`,
      ],
      status: r.cosT <= 0 ? { text: 'the light is behind the surface: clamped to 0', tone: 'bad' } : { text: 'the brightness of the patch is this number', tone: 'ok' },
      chart: { x: [0, 180], y: [0, 1], xLabel: 'θ', series: [{ fn: (x) => Math.max(0, Math.cos((x * Math.PI) / 180)), color: COL.cyan }], at: (Math.acos(Math.min(1, Math.max(-1, r.cosT))) * 180) / Math.PI, atY: r.diffuse, curve: 'max(0, cos θ)' },
      fact: 'A beam at an angle spreads over more surface by 1 / cos θ. Without normalizing, the shading would change with the length of n or l.',
      values: [['n̂·l̂', f(r.cosT, 3), 'cosT'], ['diffuse', f(r.diffuse, 3), 'diffuse']],
    }),
  },
  {
    id: 'dot.reflect', topic: 'dot', label: 'reflection',
    init: { src: [-2, 2, 0.8], n: [0, 1.5, 0] },
    handles: [pt('src', COL.white), vec('n', COL.c)],
    home: HOME,
    presets: [{ label: 'straight down', set: { src: [0, 2.5, 0], n: [0, 1.5, 0] } }, { label: 'grazing', set: { src: [-3, 0.4, 0], n: [0, 1.5, 0] } }, { label: 'tilted mirror', set: { src: [-2, 2, 0.8], n: [0.8, 1.5, 0.3] } }],
    regions: ['Dot: reflection'],
    keys: { d: COL.white, r: COL.pink, along: COL.gold, across: COL.cyan, dn: COL.gold, src: COL.white },
    run: (m) => VB.reflectVector(mul(m.src, -1), m.n),
    draw(v, m, r) {
      const o = V();
      const d = mul(m.src, -1);
      v.plane(o, m.n, 2.8, COL.b, { opacity: 0.14 });
      v.arrow(m.src, o, COL.white, { k: 'd', r: 0.035, hr: 0.1 });
      v.label('d', mid(m.src, o), COL.white, 'a', 'd');
      v.arrow(o, m.n, COL.c, { k: 'n', r: 0.025 });
      v.arrow(o, r.r, COL.pink, { k: 'r', r: 0.04, hr: 0.11, label: 'r', anchor: 'a' });
      v.vec(o, r.along, COL.gold, { k: 'along', r: 0.022, hr: 0.08, label: '(d·n̂)n̂', anchor: 'b' });
      v.vec(o, r.across, COL.cyan, { k: 'across', r: 0.022, hr: 0.08, label: 'across', anchor: 'b' });
      v.dashed(d, r.along, COL.gray, { k: 'along' });
      v.dashed(d, r.across, COL.gray, { k: 'across' });
      v.dashed(r.r, r.across, COL.gray, { k: 'r' });
    },
    explain: (m, r) => ({
      hud: `{r} = {d} − 2({d}·{nHat|n̂}){nHat|n̂} = {r|${vt(r.r)}}`,
      rows: [
        `{d}·{nHat|n̂} = {dn|${f(r.dn)}}`,
        `{along|(d·n̂)n̂} = {along|${vt(r.along)}},  {across|across} = {across|${vt(r.across)}}`,
        `{r} = {across|across} − {along|along} = {r|${vt(r.r)}}`,
        `|{r}| = ${f(r.r.length())} = |{d}|`,
      ],
      status: r.dn > 0 ? { text: 'd·n̂ > 0: d arrives from behind the surface', tone: 'warn' } : { text: 'only the part along the normal reverses', tone: 'ok' },
      fact: 'Reflection is a projection used twice. The same formula is in Phong specular highlights, mirror rays, and a bounce in physics.',
      values: [['d', vt(mul(m.src, -1)), 'd'], ['r', vt(r.r), 'r'], ['d·n̂', f(r.dn), 'dn']],
    }),
  },

  // ------------------------------------------------------------ cross
  {
    id: 'cross.dir', topic: 'cross', label: 'direction', group: 'ab',
    init: AB, handles: ABH, home: CROSSV, presets: AB_PRESETS,
    regions: ['Cross: the product and its checks'],
    keys: { flipped: COL.gray },
    run: (m) => VB.crossProduct(m.a, m.b),
    draw(v, m, r) {
      const o = V();
      v.arrow(o, m.a, COL.a, { k: 'a', r: 0.035, hr: 0.1 });
      v.arrow(o, m.b, COL.b, { k: 'b', r: 0.035, hr: 0.1 });
      v.arrow(o, r.c, COL.c, { k: 'c', r: 0.045, hr: 0.12, label: 'a × b', anchor: 'a' });
      v.arrow(o, r.flipped, COL.gray, { k: 'flipped', r: 0.012, hr: 0.05, head: 0.18, label: 'b × a', anchor: 'b' });
      if (r.c.length() > 0.05 && m.a.length() > 0.05 && m.b.length() > 0.05) {
        v.rightAngle(o, unit(r.c), unit(m.a), 0.26, COL.white, 'c');
        v.rightAngle(o, unit(r.c), unit(m.b), 0.26, COL.white, 'c');
      }
      v.arc(o, m.a, m.b, 0.6, COL.cyan, { k: 'θ', label: 'θ' });
    },
    explain: (m, r) => ({
      hud: `{a} × {b} = {c|${vt(r.c)}},  square to {a} and to {b}`,
      rows: [
        `{c|c<sub>x</sub>} = a<sub>y</sub>b<sub>z</sub> − a<sub>z</sub>b<sub>y</sub> = ${f(m.a.y)}·${f(m.b.z)} − ${f(m.a.z)}·${f(m.b.y)} = {c|${f(r.cx)}}`,
        `{c|c<sub>y</sub>} = a<sub>z</sub>b<sub>x</sub> − a<sub>x</sub>b<sub>z</sub> = ${f(m.a.z)}·${f(m.b.x)} − ${f(m.a.x)}·${f(m.b.z)} = {c|${f(r.cy)}}`,
        `{c|c<sub>z</sub>} = a<sub>x</sub>b<sub>y</sub> − a<sub>y</sub>b<sub>x</sub> = ${f(m.a.x)}·${f(m.b.y)} − ${f(m.a.y)}·${f(m.b.x)} = {c|${f(r.cz)}}`,
        `{c|c}·{a} = ${f(r.dotA, 3)},  {c|c}·{b} = ${f(r.dotB, 3)},  {flipped|b × a} = −{c|c}`,
        `{θ} = atan2(|{c|c}|, {a}·{b}) = {θ|${deg(r.theta)}}`,
      ],
      status: r.c.length() < VB.EPS ? { text: 'parallel: a × b = 0, so there is no plane and no normal', tone: 'bad' } : { text: 'a × b is square to the plane of a and b', tone: 'ok' },
      fact: 'Right hand: fingers from a to b, thumb along a × b. Vector3.Cross in Unity uses the same formula on left-handed axes, so there the left hand predicts it. Switch the picture to LH to see that.',
      values: [['|a × b|', f(r.c.length()), 'c'], ['θ', deg(r.theta), 'θ']],
    }),
  },
  {
    id: 'cross.area', topic: 'cross', label: 'area', group: 'ab',
    init: AB, handles: ABH, home: HOME, presets: AB_PRESETS,
    regions: ['Cross: area'],
    keys: { area: COL.c, triArea: COL.amber, baseLen: COL.b, height: COL.purple, sinT: COL.cyan },
    run: (m) => VB.areaFromCross(m.a, m.b),
    draw(v, m, r) {
      const o = V();
      const sum = add(m.a, m.b);
      v.patch([o, m.b, sum, m.a], COL.c, 0.18, { k: 'area' });
      v.patch([o, m.b, m.a], COL.amber, 0.28, { k: 'triArea' });
      v.arrow(o, m.a, COL.a, { k: 'a', r: 0.03 });
      v.arrow(o, m.b, COL.b, { k: 'baseLen', r: 0.03 });
      v.dashed(m.a, sum, COL.b, { k: 'baseLen' });
      v.dashed(m.b, sum, COL.a, { k: 'a' });
      const bHat = unit(m.b);
      const foot = mul(bHat, m.a.dot(bHat));
      v.dashed(o, foot, COL.gray, { k: 'height' });
      v.bar(foot, m.a, COL.purple, { k: 'height', r: 0.022 });
      v.label(`height ${f(r.height)}`, mid(foot, m.a), COL.purple, 'r', 'height');
      if (r.height > 0.1 && foot.length() > 0.1) v.rightAngle(foot, unit(mul(foot, -1)), unit(sub(m.a, foot)), 0.18, COL.white, 'height');
      v.arc(o, m.a, m.b, 0.55, COL.cyan, { k: 'sinT', label: 'θ' });
    },
    explain: (m, r) => ({
      hud: `{area||a × b|} = |{a}||{b}| {sinT|sin θ} = {area|${f(r.area)}}`,
      rows: [
        `{area||a × b|} = |{c|${vt(r.c)}}| = {area|${f(r.area)}}`,
        `{baseLen||b|} × {height|height} = ${f(r.baseLen)} × ${f(r.height)} = {area|${f(r.baseLen * r.height)}}`,
        `|{a}||{b}| {sinT|sin θ} = ${f(m.a.length())} × ${f(r.baseLen)} × ${f(r.sinT, 3)} = {area|${f(m.a.length() * r.baseLen * r.sinT)}}`,
        `{triArea|triangle} = {area||a × b|} / 2 = {triArea|${f(r.triArea)}}`,
      ],
      chart: { x: [0, 180], y: [0, 1], xLabel: 'θ', series: [{ fn: (x) => Math.sin((x * Math.PI) / 180), color: COL.cyan }], at: (Math.atan2(r.area, m.a.dot(m.b)) * 180) / Math.PI, atY: r.sinT, curve: 'sin θ' },
      status: r.area < VB.EPS ? { text: 'parallel: the parallelogram collapses, area 0', tone: 'bad' } : { text: 'base times height: the same area both ways', tone: 'ok' },
      values: [['parallelogram', f(r.area), 'area'], ['triangle', f(r.triArea), 'triArea'], ['height', f(r.height), 'height'], ['sin θ', f(r.sinT, 3), 'sinT']],
    }),
  },
  {
    id: 'cross.normal', topic: 'cross', label: 'normal',
    init: { p0: [-1, 0, 0.8], p1: [1.2, 0.3, 0.8], p2: [0, 0.3, -1] },
    handles: [pt('p0', COL.a), pt('p1', COL.c), pt('p2', COL.b)],
    home: TALL,
    presets: [
      { label: 'swap p1, p2', run(m) { const t = m.p1.clone(); m.p1.copy(m.p2); m.p2.copy(t); } },
      { label: 'collinear', set: { p0: [-2, 0, 0], p1: [0, 1, 0], p2: [2, 2, 0] } },
      { label: 'back to start', set: { p0: [-1, 0, 0.8], p1: [1.2, 0.3, 0.8], p2: [0, 0.3, -1] } },
    ],
    regions: ["Cross: a triangle's normal"],
    keys: { e1: COL.c, e2: COL.b, nHat: COL.gold, area: COL.c, p0: COL.a, p1: COL.c, p2: COL.b },
    run: (m) => VB.triangleNormal(m.p0, m.p1, m.p2),
    draw(v, m, r) {
      const cen = mul(add(add(m.p0, m.p1), m.p2), 1 / 3);
      v.patch([m.p0, m.p1, m.p2], COL.c, 0.22, { k: 'area' });
      v.arrow(m.p0, m.p1, COL.c, { k: 'e1', r: 0.025, label: 'e1', anchor: 'b' });
      v.arrow(m.p0, m.p2, COL.b, { k: 'e2', r: 0.025, label: 'e2', anchor: 'l' });
      v.bar(m.p1, m.p2, COL.gray, { r: 0.008 });
      v.arrow(cen, add(cen, r.n), COL.c, { k: 'n', r: 0.018, hr: 0.07 });
      v.arrow(cen, add(cen, r.nHat), COL.gold, { k: 'nHat', r: 0.04, hr: 0.11, label: 'n̂', anchor: 'r' });
    },
    explain: (m, r) => ({
      hud: `{n} = ({p1} − {p0}) × ({p2} − {p0}) = {n|${vt(r.n)}}`,
      rows: [
        `{e1} = {e1|${vt(r.e1)}},  {e2} = {e2|${vt(r.e2)}}`,
        `{n} = {e1} × {e2} = {n|${vt(r.n)}}`,
        `{area} = |{n}| / 2 = {area|${f(r.area)}}`,
        `{nHat|n̂} = {nHat|${vt(r.nHat)}},  plane: {nHat|n̂}·X = ${f(r.d)}`,
      ],
      status: r.n.length() < VB.EPS ? { text: 'collinear corners: the cross is 0, so the triangle has no normal', tone: 'bad' } : { text: 'p0 → p1 → p2 runs counterclockwise seen from the tip of n (right-handed axes)', tone: 'ok' },
      fact: 'The winding order sets the normal\'s direction. Swap two corners and it reverses, which is how a renderer tells front from back.',
      values: [['n', vt(r.n), 'n'], ['area', f(r.area), 'area'], ['n̂', vt(r.nHat), 'nHat']],
    }),
  },
  {
    id: 'cross.side', topic: 'cross', label: 'which side',
    init: { a: [-2, 0, 1], b: [2, 0, -0.5], p: [0.5, 0, -1.5], up: [0, 1, 0] },
    handles: [gpt('a', COL.a), gpt('b', COL.b), gpt('p', COL.pink)],
    home: GROUND,
    presets: [{ label: 'on the line', set: { a: [-2, 0, 0], b: [2, 0, 0], p: [1, 0, 0] } }, { label: 'other side', set: { p: [0.5, 0, 2.5] } }, { label: 'swap a, b', run(m) { const t = m.a.clone(); m.a.copy(m.b); m.b.copy(t); } }],
    regions: ['Cross: which side of an edge'],
    keys: { e: COL.gold, r: COL.pink, c: COL.c, s: COL.c, p: COL.pink },
    run: (m) => VB.sideOfEdge(m.a, m.b, m.p, m.up),
    draw(v, m, r) {
      const e = r.e.length() > 1e-6 ? unit(r.e) : V(1, 0, 0);
      const left = V(e.z, 0, -e.x);   // the side where s > 0: e x left points along +y
      const start = sub(m.a, mul(e, 4));
      const halfPlane = (side) => [start, add(start, mul(left, side * 4)), add(add(start, mul(e, 8)), mul(left, side * 4)), add(start, mul(e, 8))];
      v.patch(halfPlane(1), COL.c, r.s > 0 ? 0.16 : 0.03, { k: 's' });
      v.patch(halfPlane(-1), COL.a, r.s < 0 ? 0.16 : 0.03, { k: 's' });
      v.line(m.a, r.e, COL.dim);
      v.arrow(m.a, m.b, COL.gold, { k: 'e', r: 0.04, hr: 0.11, label: 'e', anchor: 'a' });
      v.arrow(m.a, m.p, COL.pink, { k: 'r', r: 0.025, label: 'r', anchor: 'a' });
      v.vec(m.a, mul(r.c, 0.25), r.s >= 0 ? COL.c : COL.a, { k: 'c', r: 0.03, label: 'e × r (scaled)', anchor: 'a' });
    },
    explain: (m, r, ctx) => {
      const lh = ctx && ctx.mirror;
      const pos = lh ? 'right' : 'left';
      const neg = lh ? 'left' : 'right';
      return {
        hud: `{s} = ({e} × {r})·up = {s|${f(r.s)}}`,
        rows: [
          `{e} = b − a = {e|${vt(r.e)}},  {r} = p − a = {r|${vt(r.r)}}`,
          `{c|e × r} = {c|${vt(r.c)}}`,
          `{s} = {c|e × r}·up = {s|${f(r.s)}}`,
        ],
        status: Math.abs(r.s) < 5e-3 ? { text: 's = 0: p is on the line through a and b', tone: 'warn' }
          : r.s > 0 ? { text: `s > 0: p is to the ${pos} of the edge, seen from above`, tone: 'ok' } : { text: `s < 0: p is to the ${neg} of the edge, seen from above`, tone: 'bad' },
        fact: 'This one sign is the inner test of a rasterizer\'s edge functions and of point-in-convex-polygon. Its meaning flips with the handedness of the axes: switch the picture to LH.',
        values: [['s', f(r.s), 's'], ['e × r', vt(r.c), 'c']],
      };
    },
  },
  {
    id: 'cross.volume', topic: 'cross', label: 'volume',
    init: { a: [2, 0.3, 0.4], b: [0.4, 2, 0.2], c: [0.2, 0.4, 2] },
    handles: [vec('a', COL.a), vec('b', COL.b), vec('c', COL.c)],
    home: HOME,
    presets: [{ label: 'unit axes', set: { a: [1, 0, 0], b: [0, 1, 0], c: [0, 0, 1] } }, { label: 'coplanar', set: { a: [2, 0, 0], b: [0, 2, 0], c: [1, 1, 0] } }, { label: 'mirrored', set: { a: [2, 0, 0], b: [0, 2, 0], c: [0, 0, -2] } }],
    regions: ['Cross: triple product'],
    keys: { bc: COL.purple, volume: COL.gold, size: COL.gold },
    run: (m) => VB.tripleProduct(m.a, m.b, m.c),
    draw(v, m, r) {
      const o = V();
      v.box(o, m.a, m.b, m.c, r.volume >= 0 ? COL.c : COL.red, { k: 'volume', opacity: 0.08 });
      v.arrow(o, m.a, COL.a, { k: 'a', r: 0.035 });
      v.arrow(o, m.b, COL.b, { k: 'b', r: 0.035 });
      v.arrow(o, m.c, COL.c, { k: 'c', r: 0.035 });
      v.arrow(o, r.bc, COL.purple, { k: 'bc', r: 0.016, hr: 0.07, head: 0.2, label: 'b × c', anchor: 'a' });
    },
    explain: (m, r) => ({
      hud: `{a}·({b} × {c}) = {volume|${f(r.volume)}}`,
      rows: [
        `{bc|b × c} = {bc|${vt(r.bc)}}, the area of one face, and its normal`,
        `{a}·{bc|(b × c)} = {volume|${f(r.volume)}}: that area × the height along the normal`,
      ],
      status: r.coplanar ? { text: 'volume 0: the three vectors lie in one plane', tone: 'bad' } : r.volume > 0 ? { text: 'positive: (a, b, c) has the handedness of the axes', tone: 'ok' } : { text: 'negative: (a, b, c) has the opposite handedness', tone: 'warn' },
      fact: 'The triple product is the 3 × 3 determinant of [a b c]. It reads volume, coplanarity and handedness from one number. Sign flips with any swap of two vectors.',
      values: [['volume', f(r.size), 'size'], ['b × c', vt(r.bc), 'bc']],
    }),
  },
];

// ---------------------------------------------------------------- lines and planes, several definitions of one object

/** the shared row of a line's forms, so every definition shows what the others say */
function lineForms(p, d) {
  const dd = d.dot(d);
  const m = cross(p, d);
  return [
    ['point, direction', `${vt(p)}, ${vt(d)}`],
    ['two points', `${vt(p)}, ${vt(add(p, d))}`],
    ['moment P × d', vt(m)],
    ['nearest origin', dd > VB.EPS ? vt(mul(cross(d, m), 1 / dd)) : 'none'],
  ];
}
function planeForms(q, n) {
  const nHat = unit(n);
  return [
    ['point, normal', `${vt(q)}, ${vt(n)}`],
    ['ax + by + cz = d', `${f(n.x)}, ${f(n.y)}, ${f(n.z)}, ${f(n.dot(q))}`],
    ['unit normal form', `${vt(nHat)}·X = ${f(nHat.dot(q))}`],
  ];
}
const LINE0 = { P: [-1.5, 0.5, 1], d: [2, 0.8, -1] };
const PLANE0 = { Q: [0.5, 0.5, 0], n: [0.6, 1.4, 0.4] };

VIEW_LIST.push(
  {
    id: 'line.pd', topic: 'define', label: 'line: P + t d', group: 'line',
    init: { ...LINE0, t: 0.75 },
    handles: [pt('P', COL.pink), vec('d', COL.gold, 'P')],
    params: [{ id: 't', label: 't', min: -2, max: 2, step: 0.01, play: true }],
    home: WIDE,
    presets: [{ label: 'along x', set: { P: [0, 1, 0], d: [1, 0, 0] } }, { label: 'through the origin', set: { P: [0, 0, 0], d: [1, 1, 0] } }, { label: 't = 0', set: { t: 0 } }, { label: 't = 1', set: { t: 1 } }],
    regions: ['Lines: a point and a direction'],
    keys: { x: COL.gold, along: COL.gold, d: COL.amber },
    run: (m) => VB.lineFromPointDirection(m.P, m.d, m.t),
    draw(v, m, r) {
      v.line(m.P, m.d, COL.gray, { k: 'd' });
      v.bar(m.P, add(m.P, m.d), COL.amber, { r: 0.03, k: 'd' });
      v.arrow(m.P, add(m.P, m.d), COL.amber, { r: 0.03, k: 'd' });
      v.bar(m.P, r.x, COL.gold, { k: 'x', r: 0.018 });
      v.point(r.x, COL.gold, { k: 'x', r: 0.12, label: `X(${f(m.t)})`, anchor: 'b' });
    },
    explain: (m, r) => ({
      hud: `{x|X(t)} = {P} + {t} {d} = {x|${vt(r.x)}}`,
      rows: [`{x|X(${f(m.t)})} = ${vt(m.P)} + ${f(m.t)} × ${vt(m.d)} = {x|${vt(r.x)}}`],
      status: m.d.length() < VB.EPS ? { text: 'd = 0: a point, not a line', tone: 'bad' } : m.t < 0 ? { text: 't < 0: on the line, not on the ray from P', tone: 'warn' } : m.t > 1 ? { text: 't > 1: on the ray, past the segment from P to P + d', tone: 'info' } : { text: '0 ≤ t ≤ 1: on the segment from P to P + d', tone: 'ok' },
      fact: 'A line has one parameter: every value of t names one point. The same line has many descriptions, since any point of it serves as P and any non-zero multiple of d as direction.',
      values: lineForms(m.P, m.d),
    }),
  },
  {
    id: 'line.2p', topic: 'define', label: 'two points', group: 'line',
    init: { ...LINE0, t: 0.5, A: [0, 0, 0], B: [1, 0, 0] },
    handles: [pt('A', COL.a), pt('B', COL.b)],
    params: [{ id: 't', label: 't', min: -1, max: 2, step: 0.01, play: true }],
    home: WIDE,
    presets: [{ label: 'midpoint', set: { t: 0.5 } }, { label: 'A = B', run(m) { m.B.copy(m.A); } }],
    regions: ['Lines: two points'],
    keys: { d: COL.amber, x: COL.gold, len: COL.amber },
    enter(m) { m.A.copy(m.P); m.B.copy(add(m.P, m.d)); },
    edited(m) { if (sub(m.B, m.A).length() > VB.EPS) { m.P.copy(m.A); m.d.copy(sub(m.B, m.A)); } },
    run: (m) => VB.lineFromTwoPoints(m.A, m.B, m.t),
    draw(v, m, r) {
      v.line(m.A, r.d, COL.gray, { k: 'd' });
      v.bar(m.A, m.B, COL.amber, { k: 'd', r: 0.03 });
      v.point(r.x, COL.gold, { k: 'x', r: 0.12, label: `X(${f(m.t)})`, anchor: 'b' });
    },
    explain: (m, r) => ({
      hud: `{x|X(t)} = {A} + {t}({B} − {A}) = {x|${vt(r.x)}}`,
      rows: [`{d} = {B} − {A} = {d|${vt(r.d)}},  |{d}| = {len|${f(r.len)}}`, `{x|X} = (1 − t){A} + t{B} = {x|${vt(r.x)}}`],
      status: r.len < VB.EPS ? { text: 'A = B: one point does not fix a line', tone: 'bad' } : { text: `the form below is the same line, with P = A and d = B − A`, tone: 'ok' },
      fact: 'The line through two points is a lerp with t free to leave [0, 1].',
      values: lineForms(m.A, r.d),
    }),
  },
  {
    id: 'line.planes', topic: 'define', label: 'two planes', group: 'line',
    init: { ...LINE0, n1: [0, 1, 0], n2: [1, 0, 0], c1: 0, c2: 0 },
    handles: [vec('n1', COL.a), vec('n2', COL.b)],
    params: [{ id: 'c1', label: 'c1', min: -3, max: 3, step: 0.05 }, { id: 'c2', label: 'c2', min: -3, max: 3, step: 0.05 }],
    home: WIDE,
    presets: [{ label: 'floor, wall', set: { n1: [0, 1, 0], n2: [1, 0, 0], c1: 0, c2: 1 } }, { label: 'parallel', set: { n1: [0, 1, 0], n2: [0, 2, 0], c1: 0, c2: 1 } }],
    regions: ['Lines: where two planes meet'],
    keys: { n1: COL.a, n2: COL.b, d: COL.gold, p: COL.pink, c1: COL.a, c2: COL.b },
    enter(m) {
      const [t, b] = tangents(m.d);
      m.n1.copy(t);
      m.n2.copy(b);
      m.c1 = t.dot(m.P);
      m.c2 = b.dot(m.P);
    },
    edited(m) {
      const r = VB.lineFromTwoPlanes(m.n1, m.c1, m.n2, m.c2);
      if (r.dd > VB.EPS) { m.P.copy(r.p); m.d.copy(r.d); }
    },
    run: (m) => VB.lineFromTwoPlanes(m.n1, m.c1, m.n2, m.c2),
    draw(v, m, r) {
      const ok = r.dd > VB.EPS;
      const q1 = mul(m.n1, m.c1 / Math.max(m.n1.dot(m.n1), 1e-9));
      const q2 = mul(m.n2, m.c2 / Math.max(m.n2.dot(m.n2), 1e-9));
      v.plane(ok ? r.p : q1, m.n1, 3, COL.a, { k: 'n1', opacity: 0.12 });
      v.plane(ok ? r.p : q2, m.n2, 3, COL.b, { k: 'n2', opacity: 0.12 });
      v.arrow(V(), m.n1, COL.a, { k: 'n1', r: 0.03 });
      v.arrow(V(), m.n2, COL.b, { k: 'n2', r: 0.03 });
      if (ok) {
        v.line(r.p, r.d, COL.gold, { k: 'd' });
        v.arrow(r.p, add(r.p, r.d), COL.gold, { k: 'd', r: 0.035, hr: 0.1, label: 'd', anchor: 'a' });
        v.point(r.p, COL.pink, { k: 'p', r: 0.1, label: 'p', anchor: 'b' });
      }
    },
    explain: (m, r) => ({
      hud: `{d} = {n1} × {n2} = {d|${vt(r.d)}}`,
      rows: [
        `{n1}·X = {c1},  {n2}·X = {c2}, with {c1} = ${f(m.c1)}, {c2} = ${f(m.c2)}`,
        `{d} = {n1} × {n2} = {d|${vt(r.d)}}`,
        `{p} = ({c1} {n2} × {d} + {c2} {d} × {n1}) / ({d}·{d}) = {p|${r.dd > VB.EPS ? vt(r.p) : 'none'}}`,
      ],
      status: r.dd > VB.EPS ? { text: 'p solves both equations, and it is the line\'s point nearest the origin', tone: 'ok' } : { text: 'parallel normals: d = 0, no line. The form below keeps the last valid line', tone: 'bad' },
      fact: 'In 3D one linear equation is a plane, so a line takes two. Its direction is square to both normals, which is a cross product.',
      values: lineForms(m.P, m.d),
    }),
  },
  {
    id: 'line.moment', topic: 'define', label: 'd : m', group: 'line',
    init: { ...LINE0, s: 0 },
    handles: [pt('P', COL.pink), vec('d', COL.gold, 'P')],
    params: [{ id: 's', label: 'slide P', min: -2, max: 2, step: 0.01, play: true }],
    home: SIDE,
    presets: [{ label: 'through the origin', set: { P: [0, 0, 0], d: [1, 1, 0] } }, { label: 'along x, height 2', set: { P: [0, 2, 0], d: [1, 0, 0], s: 0 } }],
    regions: ['Lines: direction and moment'],
    keys: { m: COL.purple, near: COL.c, d: COL.gold, dist: COL.c },
    run: (m) => VB.lineMoment(add(m.P, mul(m.d, m.s)), m.d),
    draw(v, m, r) {
      const o = V();
      const p = add(m.P, mul(m.d, m.s));
      v.line(p, m.d, COL.gray, { k: 'd' });
      v.patch([o, p, add(p, m.d), m.d], COL.purple, 0.14, { k: 'm' });
      v.dashed(o, p, COL.pink);
      v.point(p, COL.pink, { r: 0.1, label: 'P + s d', anchor: 'b' });
      v.vec(p, m.d, COL.gold, { k: 'd', r: 0.03 });
      v.vec(o, r.m, COL.purple, { k: 'm', r: 0.04, hr: 0.11, label: 'm = P × d', anchor: 'a' });
      v.bar(o, r.near, COL.c, { k: 'near', r: 0.02 });
      v.point(r.near, COL.c, { k: 'near', r: 0.09, label: 'nearest', anchor: 'b' });
    },
    explain: (m, r) => ({
      hud: `{m} = P × {d} = {m|${vt(r.m)}}, the same for every P on the line`,
      rows: [
        `{d}·{m} = ${f(r.check, 3)}`,
        `{near|nearest} = ({d} × {m}) / ({d}·{d}) = {near|${vt(r.near)}}`,
        `distance from the origin: |{m}| / |{d}| = {dist|${f(r.dist)}}`,
      ],
      status: m.d.length() < VB.EPS ? { text: 'd = 0: no line', tone: 'bad' } : r.dist < 5e-3 ? { text: 'm = 0: the line passes through the origin', tone: 'warn' } : { text: 'drag slide P: the purple parallelogram changes shape, its area |m| does not', tone: 'ok' },
      fact: 'Plücker coordinates (d : m) describe the line itself, with no point singled out. Six numbers, one constraint d·m = 0, and one common scale: four degrees of freedom.',
      values: [['d', vt(m.d), 'd'], ['m', vt(r.m), 'm'], ['|m|', f(r.m.length()), 'm'], ['distance', f(r.dist), 'dist']],
    }),
  },
  {
    id: 'line.2d', topic: 'define', label: 'ax + by = c',
    init: { n: [1, 2, 0], c: 2 },
    handles: [{ id: 'n', color: COL.c, fixed: 'z', label: '(a, b)' }],
    params: [{ id: 'c', label: 'c', min: -5, max: 5, step: 0.05 }],
    home: FRONT, grid: 'xy',
    presets: [{ label: 'y = x + 1', set: { n: [-1, 1, 0], c: 1 } }, { label: 'y = 2', set: { n: [0, 1, 0], c: 2 } }, { label: 'x = 2 (no slope)', set: { n: [1, 0, 0], c: 2 } }, { label: 'c = 0', set: { c: 0 } }],
    regions: ['Lines: in the plane, ax + by = c'],
    keys: { near: COL.pink, dir: COL.gold, slope: COL.amber, intercept: COL.amber, c: COL.white },
    run: (m) => VB.line2D(m.n.x, m.n.y, m.c),
    draw(v, m, r) {
      if (r.nn < VB.EPS) return;
      v.line(r.near, r.dir, COL.amber, { k: 'dir' });
      v.dashed(V(), r.near, COL.pink, { k: 'near' });
      v.point(r.near, COL.pink, { k: 'near', r: 0.09, label: 'nearest', anchor: 'bl' });
      v.vec(r.near, unit(r.dir), COL.gold, { k: 'dir', r: 0.03, label: '(b, −a)', anchor: 'a' });
      v.arrow(V(), m.n, COL.c, { k: 'n', r: 0.03 });
      if (!r.vertical) v.point(V(0, r.intercept, 0), COL.amber, { k: 'intercept', r: 0.08, label: `k = ${f(r.intercept)}`, anchor: 'l' });
      if (r.near.length() > 0.05) v.rightAngle(r.near, unit(mul(r.near, -1)), unit(r.dir), 0.18, COL.white, 'near');
    },
    explain: (m, r) => ({
      hud: `${f(m.n.x)} x + ${f(m.n.y)} y = ${f(m.c)}`,
      rows: [
        `{n|(a, b)}·X = {c}: every point on the line has the same dot with the normal`,
        r.vertical ? `y = m x + k does not exist: b = 0` : `y = {slope|${f(r.slope)}} x + {intercept|${f(r.intercept)}}`,
        `{near|nearest} = c {n|n} / ({n|n}·{n|n}) = {near|${vt(r.near)}},  {dir|(b, −a)} = {dir|${vt(r.dir)}}`,
      ],
      status: r.nn < VB.EPS ? { text: 'a = b = 0: not a line', tone: 'bad' } : r.vertical ? { text: 'a vertical line has no slope, and the implicit form has no trouble with it', tone: 'warn' } : { text: 'the signed distance of a point from this line is (ax + by − c) / |(a, b)|', tone: 'ok' },
      fact: 'In the plane one equation is a line, so the implicit form has the same shape as the plane\'s one dimension up. Dragging (a, b) to double its length with c doubled too leaves the line in place.',
      values: [['(a, b)', `(${f(m.n.x)}, ${f(m.n.y)})`, 'n'], ['c', f(m.c), 'c'], ['slope', r.vertical ? 'none' : f(r.slope), 'slope'], ['k', r.vertical ? 'none' : f(r.intercept), 'intercept']],
    }),
  },
  {
    id: 'plane.pn', topic: 'define', label: 'plane: Q, n', group: 'plane',
    init: { ...PLANE0, X: [2, 0, 0] },
    handles: [
      pt('Q', COL.cyan), vec('n', COL.c, 'Q'),
      pt('X', COL.gold, { plane: (m) => ({ q: m.Q, n: m.n }) }),
    ],
    home: HOME,
    presets: [{ label: 'floor', set: { Q: [0, 0, 0], n: [0, 1, 0] } }, { label: 'wall', set: { Q: [1, 0, 0], n: [1, 0, 0] } }, { label: 'tilted', set: { Q: [0.5, 0.5, 0], n: [0.6, 1.4, 0.4] } }],
    regions: ['Planes: a point and a normal'],
    keys: { toX: COL.gold, s: COL.white, d: COL.white },
    enter(m) { const nh = unit(m.n); m.X.addScaledVector(nh, -sub(m.X, m.Q).dot(nh)); },
    edited(m) { const nh = unit(m.n); m.X.addScaledVector(nh, -sub(m.X, m.Q).dot(nh)); },
    run: (m) => VB.planeFromPointNormal(m.Q, m.n, m.X),
    draw(v, m, r) {
      v.plane(m.Q, m.n, 3, COL.b, { k: 'n' });
      v.vec(m.Q, m.n, COL.c, { k: 'n', r: 0.04, hr: 0.11 });
      v.arrow(m.Q, m.X, COL.gold, { k: 'toX', r: 0.03 });
      if (r.toX.length() > 0.1) v.rightAngle(m.Q, r.nHat, unit(r.toX), 0.24, COL.white, 'toX');
    },
    explain: (m, r) => ({
      hud: `{n}·({X} − {Q}) = 0`,
      rows: [
        `{toX|X − Q} = {toX|${vt(r.toX)}}`,
        `{n}·({toX|X − Q}) = ${f(m.n.dot(r.toX), 3)}: X stays on the plane however it is dragged`,
        `expanded: {n}·X = {d|${f(r.d)}}, with {d} = {n}·{Q}`,
      ],
      status: m.n.length() < VB.EPS ? { text: 'n = 0: no plane', tone: 'bad' } : { text: 'every arrow in the plane from Q is square to n', tone: 'ok' },
      fact: 'A plane is the set of points whose arrow from Q has dot 0 with n. Dragging X is confined to that set.',
      values: planeForms(m.Q, m.n),
    }),
  },
  {
    id: 'plane.3p', topic: 'define', label: 'three points', group: 'plane',
    init: { ...PLANE0, A: [0, 0, 0], B: [1, 0, 0], C: [0, 0, 1] },
    handles: [pt('A', COL.a), pt('B', COL.b), pt('C', COL.c)],
    home: HOME,
    presets: [{ label: 'collinear', set: { A: [-2, 0, 0], B: [0, 1, 0], C: [2, 2, 0] } }, { label: 'swap B, C', run(m) { const t = m.B.clone(); m.B.copy(m.C); m.C.copy(t); } }],
    regions: ['Planes: three points'],
    keys: { u: COL.b, v: COL.c, n: COL.gold, d: COL.white },
    enter(m) { const [t, b] = tangents(m.n); m.A.copy(m.Q); m.B.copy(add(m.Q, mul(t, 2))); m.C.copy(add(m.Q, mul(b, 2))); },
    edited(m) { const n = cross(sub(m.B, m.A), sub(m.C, m.A)); if (n.length() > VB.EPS) { m.Q.copy(m.A); m.n.copy(n); } },
    run: (m) => VB.planeFromThreePoints(m.A, m.B, m.C),
    draw(v, m, r) {
      if (!r.collinear) v.plane(m.A, r.n, 3.2, COL.b, { k: 'n', opacity: 0.1 });
      v.patch([m.A, m.B, m.C], COL.gold, 0.25, { k: 'n' });
      v.arrow(m.A, m.B, COL.b, { k: 'u', r: 0.025, label: 'u', anchor: 'b' });
      v.arrow(m.A, m.C, COL.c, { k: 'v', r: 0.025, label: 'v', anchor: 'l' });
      if (!r.collinear) v.vec(m.A, unit(r.n), COL.gold, { k: 'n', r: 0.04, hr: 0.11, label: 'n̂', anchor: 'a' });
    },
    explain: (m, r) => ({
      hud: `{n} = ({B} − {A}) × ({C} − {A}) = {n|${vt(r.n)}}`,
      rows: [`{u} = {u|${vt(r.u)}},  {v} = {v|${vt(r.v)}}`, `{n} = {u} × {v} = {n|${vt(r.n)}}`, `{n}·X = {d|${f(r.d)}}`],
      status: r.collinear ? { text: 'collinear points: a whole family of planes holds them, so they fix none', tone: 'bad' } : { text: 'three points not on a line fix one plane', tone: 'ok' },
      fact: 'This is why a triangle is the graphics primitive: its three corners always lie in one plane.',
      values: r.collinear ? [['n', vt(r.n), 'n']] : planeForms(m.A, r.n),
    }),
  },
  {
    id: 'plane.dirs', topic: 'define', label: 'Q + s u + t v', group: 'plane',
    init: { ...PLANE0, u: [1, 0, 0], v: [0, 0, 1], s: 0.8, t: 0.6 },
    handles: [pt('Q', COL.cyan), vec('u', COL.amber, 'Q'), vec('v', COL.c, 'Q')],
    params: [{ id: 's', label: 's', min: -2, max: 2, step: 0.01 }, { id: 't', label: 't', min: -2, max: 2, step: 0.01 }],
    home: HOME,
    presets: [{ label: 'u parallel to v', set: { u: [2, 0, 0], v: [1, 0, 0] } }, { label: 'origin', set: { s: 0, t: 0 } }],
    regions: ['Planes: a point and two directions'],
    keys: { u: COL.amber, v: COL.c, n: COL.gold, x: COL.gold, d: COL.white },
    enter(m) { const [t, b] = tangents(m.n); m.u.copy(mul(t, 1.6)); m.v.copy(mul(b, 1.6)); },
    edited(m) { const n = cross(m.u, m.v); if (n.length() > VB.EPS) m.n.copy(n); },
    run: (m) => VB.planeFromPointDirections(m.Q, m.u, m.v, m.s, m.t),
    draw(v, m, r) {
      const at = (i, j) => add(add(m.Q, mul(m.u, i)), mul(m.v, j));
      for (let i = -2; i <= 2; i++) {
        v.poly([at(i, -2), at(i, 2)], COL.dim);
        v.poly([at(-2, i), at(2, i)], COL.dim);
      }
      v.patch([at(-2, -2), at(2, -2), at(2, 2), at(-2, 2)], COL.b, 0.1, { k: 'n' });
      v.vec(m.Q, m.u, COL.amber, { k: 'u', r: 0.03 });
      v.vec(m.Q, m.v, COL.c, { k: 'v', r: 0.03 });
      v.bar(m.Q, at(m.s, 0), COL.amber, { k: 'u', r: 0.02 });
      v.bar(at(m.s, 0), r.x, COL.c, { k: 'v', r: 0.02 });
      v.point(r.x, COL.gold, { k: 'x', r: 0.12, label: 'X(s, t)', anchor: 'a' });
      if (r.n.length() > VB.EPS) v.vec(m.Q, unit(r.n), COL.gold, { k: 'n', r: 0.035, hr: 0.1, label: 'n̂', anchor: 'a' });
    },
    explain: (m, r) => ({
      hud: `{x|X} = {Q} + ${f(m.s)} {u} + ${f(m.t)} {v} = {x|${vt(r.x)}}`,
      rows: [`{n} = {u} × {v} = {n|${vt(r.n)}}`, `{n}·{x|X} − {d|d} = ${f(r.check, 3)}: X satisfies the implicit form`],
      status: r.n.length() < VB.EPS ? { text: 'u parallel to v: the combinations fill a line', tone: 'bad' } : { text: 'two parameters reach every point of the plane', tone: 'ok' },
      fact: 'Parametric generates points; implicit tests them. The cross product converts the first into the second. A texture coordinate is this (s, t).',
      values: r.n.length() < VB.EPS ? [['n', vt(r.n), 'n']] : planeForms(m.Q, r.n),
    }),
  },
  {
    id: 'plane.abcd', topic: 'define', label: 'ax + by + cz = d', group: 'plane',
    init: { ...PLANE0, pa: 1, pb: 2, pc: 2, pd: 2 },
    handles: [],
    params: [
      { id: 'pa', label: 'a', min: -3, max: 3, step: 0.05 }, { id: 'pb', label: 'b', min: -3, max: 3, step: 0.05 },
      { id: 'pc', label: 'c', min: -3, max: 3, step: 0.05 }, { id: 'pd', label: 'd', min: -6, max: 6, step: 0.05 },
    ],
    home: WIDE,
    presets: [{ label: 'x + 2y + 2z = 2', set: { pa: 1, pb: 2, pc: 2, pd: 2 } }, { label: 'floor y = 1', set: { pa: 0, pb: 1, pc: 0, pd: 1 } }, { label: 'scale by 2', run(m) { m.pa *= 2; m.pb *= 2; m.pc *= 2; m.pd *= 2; } }, { label: 'through the origin', set: { pd: 0 } }],
    regions: ['Planes: ax + by + cz = d'],
    keys: { q: COL.pink, nHat: COL.c, dist: COL.pink, len: COL.c },
    enter(m) { m.pa = m.n.x; m.pb = m.n.y; m.pc = m.n.z; m.pd = m.n.dot(m.Q); },
    edited(m) {
      const r = VB.planeFromImplicit(m.pa, m.pb, m.pc, m.pd);
      if (r.len > VB.EPS) { m.Q.copy(r.q); m.n.copy(r.n); }
    },
    run: (m) => VB.planeFromImplicit(m.pa, m.pb, m.pc, m.pd),
    draw(v, m, r) {
      if (r.len < VB.EPS) return;
      v.plane(r.q, r.n, 3.4, COL.b, { k: 'n' });
      v.dashed(V(), r.q, COL.pink, { k: 'q' });
      v.point(r.q, COL.pink, { k: 'q', r: 0.1, label: 'q', anchor: 'b' });
      v.vec(r.q, r.nHat, COL.c, { k: 'nHat', r: 0.04, hr: 0.11, label: 'n̂', anchor: 'a' });
      const axis = [[m.pa, V(1, 0, 0), 'x'], [m.pb, V(0, 1, 0), 'y'], [m.pc, V(0, 0, 1), 'z']];
      for (const [coef, e, name] of axis) {
        if (Math.abs(coef) > 0.05 && Math.abs(m.pd / coef) < 8) {
          v.point(mul(e, m.pd / coef), COL.gold, { r: 0.08, label: `${name} = ${f(m.pd / coef)}`, anchor: 'a' });
        }
      }
    },
    explain: (m, r) => ({
      hud: `${f(m.pa)} x + ${f(m.pb)} y + ${f(m.pc)} z = ${f(m.pd)}`,
      rows: [
        `{n} = (a, b, c),  |{n}| = {len|${f(r.len)}}`,
        `{nHat|n̂}·X = {dist|${f(r.dist)}}, dividing through by |{n}|`,
        `{q|q} = {dist|${f(r.dist)}} {nHat|n̂} = {q|${vt(r.q)}}, nearest the origin`,
      ],
      status: r.len < VB.EPS ? { text: 'a = b = c = 0: not a plane', tone: 'bad' } : { text: 'scaling all four numbers leaves the plane where it is', tone: 'ok' },
      fact: 'The gold points are where the plane meets the axes. three.js and Unity store n·X + constant = 0, so for a unit normal their constant is −d.',
      values: r.len < VB.EPS ? [['n', vt(r.n), 'n']] : [['n̂', vt(r.nHat), 'nHat'], ['distance from O', f(r.dist), 'dist'], ['q', vt(r.q), 'q']],
    }),
  },
);

// ---------------------------------------------------------------- relative position tests

const kindTone = (kind, good, warn = []) => (good.includes(kind) ? 'ok' : warn.includes(kind) ? 'warn' : 'bad');

VIEW_LIST.push(
  {
    id: 't.pt-plane', topic: 'tests', label: 'point, plane',
    init: { P: [1.8, 2, 0.8], Q: [0, 0, 0], n: [0.3, 1.5, 0.2] },
    handles: [pt('P', COL.pink), pt('Q', COL.cyan), vec('n', COL.c, 'Q')],
    home: HOME,
    presets: [{ label: 'in front', set: { P: [1, 2, 0] } }, { label: 'on it', set: { Q: [0, 0, 0], n: [0, 1, 0], P: [1.5, 0, 1] } }, { label: 'behind', set: { P: [1, -1.5, 0] } }],
    regions: ['Tests: point and plane'],
    keys: { s: COL.gold },
    run: (m) => VB.pointPlane(m.P, m.Q, m.n),
    draw(v, m, r) {
      v.plane(m.Q, m.n, 3, COL.b, {});
      v.vec(m.Q, m.n, COL.c, { k: 'n', r: 0.03 });
      v.dashed(m.Q, m.P, COL.pink, { k: 'P' });
      v.bar(m.P, r.foot, r.s >= 0 ? COL.gold : COL.purple, { k: 's', r: 0.025 });
      v.label(`s = ${f(r.s)}`, mid(m.P, r.foot), COL.gold, 'r', 's');
      v.point(r.foot, COL.white, { k: 'foot', label: 'foot', anchor: 'b' });
    },
    explain: (m, r) => ({
      hud: `{s} = ({P} − {Q})·{nHat|n̂} = {s|${f(r.s)}}`,
      rows: [
        `{nHat|n̂} = {nHat|${vt(r.nHat)}}`,
        `{s} = ${vt(sub(m.P, m.Q))}·${vt(r.nHat)} = {s|${f(r.s)}}`,
        `{foot} = {P} − {s}{nHat|n̂} = {foot|${vt(r.foot)}}`,
      ],
      status: r.side === 'front' ? { text: 's > 0: in front, on the side n points to', tone: 'ok' } : r.side === 'behind' ? { text: 's < 0: behind', tone: 'warn' } : { text: 's = 0: on the plane', tone: 'info' },
      fact: 'Frustum culling, clipping and half-space tests all run this one line.',
      values: [['s', f(r.s), 's'], ['side', r.side, 's'], ['foot', vt(r.foot), 'foot']],
    }),
  },
  {
    id: 't.pt-line', topic: 'tests', label: 'point, line',
    init: { P: [1.5, 2.2, 1], A: [-1.5, 0.5, 0], d: [1.5, 0.3, 0.4] },
    handles: [pt('P', COL.pink), pt('A', COL.a), vec('d', COL.gold, 'A')],
    home: HOME,
    presets: [{ label: 'on the line', set: { A: [0, 0, 0], d: [1, 1, 0], P: [2, 2, 0] } }, { label: 'square to d', set: { A: [0, 0, 0], d: [1, 0, 0], P: [0, 2, 0] } }],
    regions: ['Tests: point and line'],
    keys: { dist: COL.c, crossDist: COL.c, r: COL.pink, t: COL.white },
    run: (m) => VB.pointLine(m.P, m.A, m.d),
    draw(v, m, r) {
      v.line(m.A, m.d, COL.gray, { k: 'd' });
      v.vec(m.A, m.d, COL.gold, { k: 'd', r: 0.03 });
      v.patch([m.A, add(m.A, m.d), add(m.P, m.d), m.P], COL.purple, 0.12, { k: 'crossDist' });
      v.arrow(m.A, m.P, COL.pink, { k: 'r', r: 0.016, hr: 0.06, head: 0.2, label: 'r', anchor: 'l' });
      v.bar(m.P, r.foot, COL.c, { k: 'dist', r: 0.028 });
      v.label(`${f(r.dist)}`, mid(m.P, r.foot), COL.c, 'r', 'dist');
      v.point(r.foot, COL.white, { k: 'foot', label: 'foot', anchor: 'b' });
      if (r.dist > 0.1) v.rightAngle(r.foot, unit(m.d), unit(sub(m.P, r.foot)), 0.2, COL.white, 'dist');
    },
    explain: (m, r) => ({
      hud: `distance = {dist|${f(r.dist)}} = |{d} × {r}| / |{d}| = {crossDist|${f(r.crossDist)}}`,
      rows: [
        `{t} = ({r}·{d}) / ({d}·{d}) = {t|${f(r.t)}}`,
        `{foot} = {A} + {t}{d} = {foot|${vt(r.foot)}}`,
        `{dist||P − foot|} = {dist|${f(r.dist)}}`,
        `{crossDist||d × r| / |d|} = {crossDist|${f(r.crossDist)}}, area / base`,
      ],
      status: m.d.length() < VB.EPS ? { text: 'd = 0: no line', tone: 'bad' } : r.dist < 5e-3 ? { text: 'distance 0: P is on the line', tone: 'ok' } : { text: 'the dot and the cross reach the same distance', tone: 'info' },
      values: [['distance', f(r.dist), 'dist'], ['t', f(r.t), 't'], ['foot', vt(r.foot), 'foot']],
    }),
  },
  {
    id: 't.pt-seg', topic: 'tests', label: 'point, segment',
    init: { P: [1, 2, 1], A: [-1.5, 0.5, 0], B: [2, 0.5, -0.5] },
    handles: [pt('P', COL.pink), pt('A', COL.a), pt('B', COL.b)],
    home: HOME,
    presets: [{ label: 'beside', set: { P: [0, 2, 0] } }, { label: 'past B', set: { P: [4, 1.5, 0] } }, { label: 'before A', set: { P: [-3.5, 1.5, 0] } }, { label: 'A = B', run(m) { m.B.copy(m.A); } }],
    regions: ['Tests: point and segment'],
    keys: { raw: COL.amber, t: COL.c, dist: COL.c, near: COL.c },
    run: (m) => VB.pointSegment(m.P, m.A, m.B),
    draw(v, m, r) {
      v.line(m.A, r.d, COL.dim);
      v.bar(m.A, m.B, COL.gold, { k: 'd', r: 0.035 });
      const foot = add(m.A, mul(r.d, r.raw));
      if (Math.abs(r.raw - r.t) > 1e-6) {
        v.dashed(m.P, foot, COL.gray, { k: 'raw' });
        v.point(foot, COL.amber, { k: 'raw', r: 0.07, label: `unclamped, t = ${f(r.raw)}`, anchor: 'b' });
      }
      v.bar(m.P, r.near, COL.c, { k: 'dist', r: 0.028 });
      v.label(f(r.dist), mid(m.P, r.near), COL.c, 'r', 'dist');
      v.point(r.near, COL.c, { k: 'near', r: 0.1, label: 'nearest', anchor: 'a' });
    },
    explain: (m, r) => ({
      hud: `{t} = clamp({raw|${f(r.raw)}}, 0, 1) = {t|${f(r.t)}}`,
      rows: [
        `{raw|raw} = (P − A)·{d} / ({d}·{d}) = {raw|${f(r.raw)}}`,
        `{t} = clamp({raw|raw}, 0, 1) = {t|${f(r.t)}}`,
        `{near|nearest} = {A} + {t}{d} = {near|${vt(r.near)}},  distance {dist|${f(r.dist)}}`,
      ],
      status: r.dd <= VB.EPS ? { text: 'A = B: the segment is a point, so it is the nearest', tone: 'warn' } : r.raw < 0 ? { text: 't < 0: the foot is before A, so A is nearest', tone: 'warn' } : r.raw > 1 ? { text: 't > 1: the foot is past B, so B is nearest', tone: 'warn' } : { text: '0 ≤ t ≤ 1: the foot is on the segment', tone: 'ok' },
      values: [['unclamped t', f(r.raw), 'raw'], ['t', f(r.t), 't'], ['nearest', vt(r.near), 'near'], ['distance', f(r.dist), 'dist']],
    }),
  },
  {
    id: 't.pt-tri', topic: 'tests', label: 'point, triangle',
    init: { P: [0.4, 1, 0.3], A: [-1.8, 0, 1.2], B: [2, 0, 1], C: [0, 0, -2] },
    handles: [pt('P', COL.pink), pt('A', COL.a), pt('B', COL.c), pt('C', COL.b)],
    home: HOME,
    presets: [{ label: 'centroid', run(m) { m.P.copy(mul(add(add(m.A, m.B), m.C), 1 / 3)); } }, { label: 'on an edge', run(m) { m.P.copy(mid(m.B, m.C)); } }, { label: 'outside', set: { P: [3, 0.6, 2] } }, { label: 'at a corner', run(m) { m.P.copy(m.A); } }],
    regions: ['Tests: point and triangle'],
    keys: { wa: COL.a, wb: COL.c, wc: COL.b, height: COL.pink, A: COL.a, B: COL.c, C: COL.b },
    run: (m) => VB.pointTriangle(m.P, m.A, m.B, m.C),
    draw(v, m, r) {
      if (r.nn < VB.EPS) { v.poly([m.A, m.B, m.C], COL.gray, { closed: true }); return; }
      const foot = sub(m.P, mul(unit(r.n), r.height));
      const piece = (w, c, p, q, k) => v.patch([foot, p, q], w < 0 ? COL.red : c, Math.min(0.75, 0.12 + Math.abs(w) * 0.6), { k });
      piece(r.wa, COL.a, m.B, m.C, 'wa');
      piece(r.wb, COL.c, m.C, m.A, 'wb');
      piece(r.wc, COL.b, m.A, m.B, 'wc');
      v.poly([m.A, m.B, m.C], COL.white, { closed: true });
      v.dashed(m.P, foot, COL.pink, { k: 'height' });
      v.point(foot, r.inside ? COL.c : COL.red, { r: 0.08, label: 'foot', anchor: 'b' });
    },
    explain: (m, r) => ({
      hud: `{wa|w<sub>a</sub>} = {wa|${f(r.wa)}},  {wb|w<sub>b</sub>} = {wb|${f(r.wb)}},  {wc|w<sub>c</sub>} = {wc|${f(r.wc)}}`,
      rows: [
        `{wa|w<sub>a</sub>} = (({B} − P) × ({C} − P))·n / n·n = {wa|${f(r.wa)}}`,
        `{wb|w<sub>b</sub>} = (({C} − P) × ({A} − P))·n / n·n = {wb|${f(r.wb)}}`,
        `{wc|w<sub>c</sub>} = (({A} − P) × ({B} − P))·n / n·n = {wc|${f(r.wc)}}`,
        `sum = ${f(r.wa + r.wb + r.wc)}, height above the plane {height|${f(r.height)}}`,
      ],
      status: r.nn < VB.EPS ? { text: 'collinear corners: no triangle to be inside', tone: 'bad' } : r.inside ? { text: 'all three weights ≥ 0: the foot is inside', tone: 'ok' } : { text: 'a negative weight (red piece): the foot is outside, past the opposite edge', tone: 'bad' },
      fact: 'Each weight is the signed area of the piece opposite its corner, over the whole area. A rasterizer computes these for every pixel.',
      values: [['w_a', f(r.wa), 'wa'], ['w_b', f(r.wb), 'wb'], ['w_c', f(r.wc), 'wc'], ['height', f(r.height), 'height']],
    }),
  },
  {
    id: 't.pt-poly', topic: 'tests', label: 'point, polygon',
    init: { ...ARROW5, P: [0.3, 0, 0.2] },
    handles: [gpt('P', COL.pink), ...polyHandles],
    home: GROUND,
    presets: [{ label: 'concave', set: ARROW5 }, { label: 'convex', set: CONVEX5 }, { label: 'pentagram', set: { ...STAR5, P: [0.05, 0, 0.1] } }, { label: 'in the notch', set: { ...ARROW5, P: [-1.5, 0, 0] } }],
    regions: ['Tests: point and polygon', 'Tests: is a polygon convex'],
    keys: { crossings: COL.gold, winding: COL.purple, poly: COL.b, convex: COL.c },
    run(m) { const verts = polyVerts(m); return { ...VB.pointPolygon(m.P, verts), ...VB.polygonConvex(verts) }; },
    draw(v, m) {
      const verts = polyVerts(m);
      drawPolygon(v, verts);
      const y = 0.03;
      v.bar(V(m.P.x, y, m.P.z), V(7, y, m.P.z), COL.gold, { k: 'crossings', r: 0.012 });
      for (let i = 0; i < verts.length; i++) {
        const a = verts[i], b = verts[(i + 1) % verts.length];
        if ((a.z > m.P.z) !== (b.z > m.P.z)) {
          const t = (m.P.z - a.z) / (b.z - a.z);
          const x = a.x + t * (b.x - a.x);
          if (x > m.P.x) v.point(V(x, y, m.P.z), COL.gold, { k: 'crossings', r: 0.085 });
        }
      }
    },
    explain: (m, r) => ({
      hud: `{crossings|${r.crossings}} crossing${r.crossings === 1 ? '' : 's'}: ${r.evenOdd ? 'odd, inside' : 'even, outside'}`,
      rows: [
        `ray from P along +x crosses {crossings|${r.crossings}} edge${r.crossings === 1 ? '' : 's'}`,
        `even-odd rule: ${r.evenOdd ? 'inside' : 'outside'}`,
        `winding number {winding|${r.winding}}: ${r.nonZero ? 'inside' : 'outside'}`,
        `turns: {convex|${r.positive}} one way, {convex|${r.negative}} the other, so ${r.convex ? 'convex' : 'not convex'}`,
      ],
      status: r.evenOdd === r.nonZero ? { text: r.evenOdd ? 'inside by both rules' : 'outside by both rules', tone: r.evenOdd ? 'ok' : 'warn' } : { text: 'the rules disagree: this happens only where a polygon crosses itself', tone: 'bad' },
      fact: 'A convex polygon needs only one sign test per edge. A general polygon needs the crossing count, or triangles.',
      values: [['crossings', String(r.crossings), 'crossings'], ['winding', String(r.winding), 'winding'], ['convex', String(r.convex), 'convex']],
    }),
  },
  {
    id: 't.line-line', topic: 'tests', label: 'line, line',
    init: { p1: [-2, 0.5, 1], d1: [1.5, 0.3, 0], p2: [0, -0.5, -1.5], d2: [0.2, 1, 1] },
    handles: [pt('p1', COL.a), vec('d1', COL.a, 'p1'), pt('p2', COL.b), vec('d2', COL.b, 'p2')],
    home: WIDE,
    presets: [
      { label: 'skew', set: { p1: [-2, 0.5, 1], d1: [1.5, 0.3, 0], p2: [0, -0.5, -1.5], d2: [0.2, 1, 1] } },
      { label: 'intersecting', set: { p1: [-2, 0, 0], d1: [1, 0, 0], p2: [1, -1, 0], d2: [0, 1, 0] } },
      { label: 'parallel', set: { p1: [-2, 0, 0], d1: [1, 0.5, 0], p2: [-2, 1.5, 0], d2: [2, 1, 0] } },
      { label: 'same line', set: { p1: [-2, 0, 0], d1: [1, 0.5, 0], p2: [0, 1, 0], d2: [2, 1, 0] } },
    ],
    regions: ['Tests: line and line'],
    keys: { c1: COL.a, c2: COL.b, gap: COL.gold, n: COL.c, d1: COL.a, d2: COL.b, t1: COL.a, t2: COL.b },
    run: (m) => VB.lineLine(m.p1, m.d1, m.p2, m.d2),
    draw(v, m, r) {
      v.line(m.p1, m.d1, COL.a, { k: 'd1' });
      v.line(m.p2, m.d2, COL.b, { k: 'd2' });
      v.vec(m.p1, m.d1, COL.a, { k: 'd1', r: 0.03 });
      v.vec(m.p2, m.d2, COL.b, { k: 'd2', r: 0.03 });
      if (!r.parallel) {
        v.bar(r.c1, r.c2, COL.gold, { k: 'gap', r: 0.028 });
        v.point(r.c1, COL.a, { k: 'c1', r: 0.1 });
        v.point(r.c2, COL.b, { k: 'c2', r: 0.1 });
        v.label(`gap ${f(Math.abs(r.gap))}`, mid(r.c1, r.c2), COL.gold, 'r', 'gap');
        if (Math.abs(r.gap) > 0.1) v.vec(r.c1, unit(r.n), COL.c, { k: 'n', r: 0.016, hr: 0.06, head: 0.2, label: 'n', anchor: 'l' });
      }
    },
    explain: (m, r) => ({
      hud: `${r.kind}: gap = ({p2|p2} − {p1|p1})·{n|n̂} = {gap|${f(Math.abs(r.gap))}}`,
      rows: [
        `{n} = {d1} × {d2} = {n|${vt(r.n)}}`,
        r.parallel ? `d1 × d2 = 0, so the gap is |r × d1| / |d1| = {gap|${f(r.gap)}}` : `{gap} = r·{n|n̂} = {gap|${f(r.gap)}}`,
        r.parallel ? '' : `{t1} = {t1|${f(r.t1)}}, {t2} = {t2|${f(r.t2)}}: closest points {c1|${vt(r.c1)}}, {c2|${vt(r.c2)}}`,
      ].filter(Boolean),
      status: { text: { skew: 'skew: not parallel, and they never meet', intersecting: 'intersecting: gap 0', parallel: 'parallel: same direction, apart', 'same line': 'same line: parallel, gap 0' }[r.kind], tone: kindTone(r.kind, ['intersecting', 'same line'], ['parallel', 'skew']) },
      fact: 'In 3D two lines usually miss each other. The closest points are joined by a segment square to both.',
      values: [['kind', r.kind, 'gap'], ['|gap|', f(Math.abs(r.gap)), 'gap']],
    }),
  },
  {
    id: 't.seg-seg', topic: 'tests', label: 'segment, segment',
    init: { a: [-2, 0.5, 1], b: [1.5, 1, 0], c: [0.5, -0.5, -1.5], d: [0.5, 2, 2] },
    handles: [pt('a', COL.a), pt('b', COL.a), pt('c', COL.b), pt('d', COL.b)],
    home: HOME,
    presets: [
      { label: 'crossing', set: { a: [-2, 0, 0], b: [2, 0, 0], c: [0, -1.5, 0], d: [0, 1.5, 0] } },
      { label: 'end to end', set: { a: [-2, 0, 0], b: [0, 0, 0], c: [1, 0.5, 0], d: [3, 1, 0] } },
      { label: 'parallel', set: { a: [-2, 0, 0], b: [2, 0, 0], c: [-1, 1.5, 0], d: [1, 1.5, 0] } },
    ],
    regions: ['Tests: segment and segment'],
    keys: { c1: COL.a, c2: COL.b, dist: COL.gold, s: COL.a, t: COL.b, a: COL.a, b: COL.a, c: COL.b, d: COL.b },
    run: (m) => VB.segmentSegment(m.a, m.b, m.c, m.d),
    draw(v, m, r) {
      v.bar(m.a, m.b, COL.a, { k: 's', r: 0.035 });
      v.bar(m.c, m.d, COL.b, { k: 't', r: 0.035 });
      v.bar(r.c1, r.c2, COL.gold, { k: 'dist', r: 0.025 });
      v.point(r.c1, COL.white, { k: 'c1', r: 0.09 });
      v.point(r.c2, COL.white, { k: 'c2', r: 0.09 });
      v.label(f(r.dist), mid(r.c1, r.c2), COL.gold, 'r', 'dist');
    },
    explain: (m, r) => ({
      hud: `distance = {dist|${f(r.dist)}} at {s} = {s|${f(r.s)}}, {t} = {t|${f(r.t)}}`,
      rows: [
        `on ab: {c1|${vt(r.c1)}}`,
        `on cd: {c2|${vt(r.c2)}}`,
      ],
      status: r.dist < 5e-3 ? { text: 'distance 0: the segments touch', tone: 'ok' } : (r.s > 0 && r.s < 1 && r.t > 0 && r.t < 1) ? { text: 'closest points are inside both segments: the same answer as the two lines', tone: 'info' } : { text: 'a clamp was active: the closest point is at an end, and the lines\' answer would be wrong', tone: 'warn' },
      fact: 'A capsule collision test is this distance against the sum of the radii.',
      values: [['s', f(r.s), 's'], ['t', f(r.t), 't'], ['distance', f(r.dist), 'dist']],
    }),
  },
  {
    id: 't.line-plane', topic: 'tests', label: 'line, plane',
    init: { o: [-1.5, 3, 1], d: [1, -1.5, -0.5], q: [0, 0, 0], n: [0, 1.5, 0] },
    handles: [pt('o', COL.pink), vec('d', COL.gold, 'o'), pt('q', COL.cyan), vec('n', COL.c, 'q')],
    home: WIDE,
    presets: [
      { label: 'hit ahead', set: { o: [-1.5, 3, 1], d: [1, -1.5, -0.5] } },
      { label: 'hit behind', set: { o: [-1.5, 3, 1], d: [1, 1.5, -0.5] } },
      { label: 'parallel', set: { o: [-1.5, 2, 1], d: [1, 0, -0.5], q: [0, 0, 0], n: [0, 1.5, 0] } },
      { label: 'in the plane', set: { o: [-1.5, 0, 1], d: [1, 0, -0.5], q: [0, 0, 0], n: [0, 1.5, 0] } },
    ],
    regions: ['Tests: line and plane'],
    keys: { o: COL.pink, q: COL.cyan, denom: COL.c, num: COL.purple, hit: COL.gold, t: COL.white },
    run: (m) => VB.linePlane(m.o, m.d, m.q, m.n),
    draw(v, m, r) {
      v.plane(m.q, m.n, 3.5, COL.b, {});
      v.vec(m.q, m.n, COL.c, { k: 'n', r: 0.03 });
      v.line(m.o, m.d, COL.gray, { k: 'd' });
      v.vec(m.o, m.d, COL.gold, { k: 'd', r: 0.035, hr: 0.1 });
      if (!r.parallel) {
        if (r.t > 0) v.bar(m.o, r.hit, COL.amber, { k: 't', r: 0.02 });
        v.point(r.hit, r.t >= 0 ? COL.gold : COL.gray, { k: 'hit', r: 0.12, label: `t = ${f(r.t)}`, anchor: 'b' });
      }
    },
    explain: (m, r) => ({
      hud: `{t} = {n}·({q} − {o}) / {n}·{d} = {num|${f(r.num)}} / {denom|${f(r.denom)}} = {t|${r.parallel ? 'none' : f(r.t)}}`,
      rows: [
        `{denom|n·d} = {denom|${f(r.denom)}}`,
        `{num|n·(q − o)} = {num|${f(r.num)}}`,
        r.parallel ? 'n·d = 0: the line runs parallel to the plane' : `{hit} = {o} + {t}{d} = {hit|${vt(r.hit)}}`,
      ],
      status: { text: { 'hit ahead': 't > 0: a ray from o hits the plane', 'hit behind': 't < 0: the line meets the plane, a ray from o does not', parallel: 'parallel: no meeting point', 'in the plane': 'in the plane: every point meets it' }[r.kind], tone: kindTone(r.kind, ['hit ahead'], ['hit behind', 'in the plane']) },
      fact: 'The ray tracer\'s first test, and the mouse pick against a ground plane.',
      values: [['kind', r.kind, 'hit'], ['t', r.parallel ? 'none' : f(r.t), 't'], ['hit', r.parallel ? 'none' : vt(r.hit), 'hit']],
    }),
  },
  {
    id: 't.seg-plane', topic: 'tests', label: 'segment, plane',
    init: { a: [-1.5, 2, 1], b: [1.5, -1.2, -0.5], q: [0, 0, 0], n: [0.2, 1.5, 0.1] },
    handles: [pt('a', COL.a), pt('b', COL.b), pt('q', COL.cyan), vec('n', COL.c, 'q')],
    home: HOME,
    presets: [
      { label: 'crosses', set: { a: [-1.5, 2, 1], b: [1.5, -1.2, -0.5], q: [0, 0, 0], n: [0, 1.5, 0] } },
      { label: 'same side', set: { a: [-1.5, 2, 1], b: [1.5, 0.6, -0.5], q: [0, 0, 0], n: [0, 1.5, 0] } },
      { label: 'touches', set: { a: [-1.5, 2, 1], b: [1.5, 0, -0.5], q: [0, 0, 0], n: [0, 1.5, 0] } },
      { label: 'in the plane', set: { a: [-1.5, 0, 1], b: [1.5, 0, -0.5], q: [0, 0, 0], n: [0, 1.5, 0] } },
    ],
    regions: ['Tests: segment and plane'],
    keys: { sa: COL.a, sb: COL.b, q: COL.cyan, t: COL.white, hit: COL.gold },
    run: (m) => VB.segmentPlane(m.a, m.b, m.q, m.n),
    draw(v, m, r) {
      v.plane(m.q, m.n, 3.2, COL.b, {});
      v.vec(m.q, m.n, COL.c, { k: 'n', r: 0.03 });
      v.bar(m.a, m.b, COL.gold, { r: 0.03 });
      const nn = m.n.dot(m.n);
      if (nn > VB.EPS) {
        v.dashed(m.a, sub(m.a, mul(m.n, r.sa / nn)), COL.a, { k: 'sa' });
        v.dashed(m.b, sub(m.b, mul(m.n, r.sb / nn)), COL.b, { k: 'sb' });
      }
      if (r.crosses) v.point(r.hit, COL.gold, { k: 'hit', r: 0.12, label: 'hit', anchor: 'r' });
    },
    explain: (m, r) => ({
      hud: `{sa} = {sa|${f(r.sa)}}, {sb} = {sb|${f(r.sb)}}: ${r.kind}`,
      rows: [
        `{sa} = ({a} − {q})·{n} = {sa|${f(r.sa)}}`,
        `{sb} = ({b} − {q})·{n} = {sb|${f(r.sb)}}`,
        r.crosses ? `{t} = {sa} / ({sa} − {sb}) = {t|${f(r.t)}},  {hit} = {hit|${vt(r.hit)}}` : `{sa} × {sb} = ${f(r.sa * r.sb)} is not negative: no crossing`,
      ],
      status: { text: { crosses: 'opposite signs: the segment crosses', 'same side': 'same sign: both ends on one side', touches: 'one end is on the plane', 'in the plane': 'both ends are on the plane' }[r.kind], tone: kindTone(r.kind, ['crosses'], ['touches', 'in the plane']) },
      fact: 'Clipping a triangle against a frustum plane computes exactly this t on each edge that crosses.',
      values: [['sa', f(r.sa), 'sa'], ['sb', f(r.sb), 'sb'], ['t', f(r.t), 't']],
    }),
  },
  {
    id: 't.seg-tri', topic: 'tests', label: 'segment, triangle',
    init: { a: [0.3, 2, 0.4], b: [0.1, -1.2, 0.2], p0: [-1.8, 0, 1.2], p1: [2, 0, 1], p2: [0, 0, -2] },
    handles: [pt('a', COL.a), pt('b', COL.b), pt('p0', COL.gray), pt('p1', COL.gray), pt('p2', COL.gray)],
    home: HOME,
    presets: [
      { label: 'hit', set: { a: [0.3, 2, 0.4], b: [0.1, -1.2, 0.2] } },
      { label: 'outside', set: { a: [2.5, 2, 2.4], b: [2.5, -1.2, 2.2] } },
      { label: 'same side', set: { a: [0.3, 2, 0.4], b: [0.1, 0.6, 0.2] } },
    ],
    regions: ['Tests: segment and triangle'],
    keys: { sa: COL.a, sb: COL.b, wa: COL.a, wb: COL.c, wc: COL.b, hit: COL.gold },
    run: (m) => VB.segmentTriangle(m.a, m.b, m.p0, m.p1, m.p2),
    draw(v, m, r) {
      v.patch([m.p0, m.p1, m.p2], r.kind === 'hit' ? COL.c : COL.b, 0.28, {});
      v.poly([m.p0, m.p1, m.p2], COL.white, { closed: true });
      v.plane(m.p0, r.n, 3.6, COL.dim, { opacity: 0.05, grid: false });
      v.bar(m.a, m.b, COL.gold, { r: 0.03 });
      if (r.kind === 'hit' || r.kind === 'outside the triangle') {
        v.point(r.hit, r.kind === 'hit' ? COL.gold : COL.red, { k: 'hit', r: 0.12, label: r.kind === 'hit' ? 'hit' : 'misses the triangle', anchor: 'r' });
      }
    },
    explain: (m, r) => ({
      hud: `${r.kind}`,
      rows: [
        `signed distances: {sa} = {sa|${f(r.sa)}}, {sb} = {sb|${f(r.sb)}}`,
        `crossing at {t|t} = {t|${f(r.t)}}: {hit|${vt(r.hit)}}`,
        `weights there: {wa|${f(r.wa)}}, {wb|${f(r.wb)}}, {wc|${f(r.wc)}}`,
      ],
      status: { text: { hit: 'crosses the plane, and all three weights are ≥ 0', 'outside the triangle': 'crosses the plane, and a weight is negative', 'same side': 'does not reach the triangle\'s plane', touches: 'one end is on the plane', 'in the plane': 'both ends are on the plane' }[r.kind], tone: kindTone(r.kind, ['hit'], ['touches', 'in the plane']) },
      fact: 'Two tests composed: segment and plane, then point and triangle. The Möller-Trumbore algorithm solves for the same t and weights directly.',
      values: [['kind', r.kind, 'hit'], ['t', f(r.t), 't'], ['hit', vt(r.hit), 'hit']],
    }),
  },
  {
    id: 't.seg-poly', topic: 'tests', label: 'segment, polygon',
    init: { ...ARROW5, a: [0.4, 2, 0.1], b: [0.5, -1.4, 0.2] },
    handles: [pt('a', COL.a), pt('b', COL.b), ...polyHandles],
    home: HOME,
    presets: [
      { label: 'hit', set: { a: [0.4, 2, 0.1], b: [0.5, -1.4, 0.2] } },
      { label: 'through the notch', set: { a: [-1.5, 2, 0], b: [-1.5, -1.4, 0] } },
      { label: 'same side', set: { a: [0.4, 2, 0.1], b: [0.5, 0.8, 0.2] } },
    ],
    regions: ['Tests: segment and polygon'],
    keys: { crossings: COL.gold, hit: COL.gold, sa: COL.a, sb: COL.b, poly: COL.b },
    run: (m) => VB.segmentPolygon(m.a, m.b, polyVerts(m)),
    draw(v, m, r) {
      drawPolygon(v, polyVerts(m));
      v.bar(m.a, m.b, COL.gold, { r: 0.03 });
      if (r.kind === 'hit' || r.kind === 'outside the polygon') {
        v.point(r.hit, r.kind === 'hit' ? COL.gold : COL.red, { k: 'hit', r: 0.12, label: r.kind === 'hit' ? 'hit' : 'misses the polygon', anchor: 'r' });
        v.bar(V(r.hit.x, 0.03, r.hit.z), V(7, 0.03, r.hit.z), COL.gold, { k: 'crossings', r: 0.01 });
      }
    },
    explain: (m, r) => ({
      hud: `${r.kind}`,
      rows: [
        `heights above y = 0: {sa} = {sa|${f(r.sa)}}, {sb} = {sb|${f(r.sb)}}`,
        `crossing at {hit|${vt(r.hit)}}, ray crossings {crossings|${r.crossings}}`,
      ],
      status: { text: { hit: 'crosses the plane, at a point inside the polygon', 'outside the polygon': 'crosses the plane, at a point outside the polygon', 'same side': 'does not reach the plane', touches: 'one end is on the plane', 'in the plane': 'both ends are on the plane' }[r.kind], tone: kindTone(r.kind, ['hit'], ['touches', 'in the plane']) },
      values: [['kind', r.kind, 'hit'], ['crossings', String(r.crossings), 'crossings']],
    }),
  },
  {
    id: 't.tri-plane', topic: 'tests', label: 'triangle, plane',
    init: { p0: [-1.5, 1.6, 1], p1: [2, 1, 0.8], p2: [0.2, -1.4, -1.4], q: [0, 0, 0], n: [0, 1.5, 0] },
    handles: [pt('p0', COL.a), pt('p1', COL.c), pt('p2', COL.b), pt('q', COL.cyan), vec('n', COL.c, 'q')],
    home: HOME,
    presets: [
      { label: 'crosses', set: { p0: [-1.5, 1.6, 1], p1: [2, 1, 0.8], p2: [0.2, -1.4, -1.4] } },
      { label: 'all in front', set: { p0: [-1.5, 1.6, 1], p1: [2, 1, 0.8], p2: [0.2, 0.5, -1.4] } },
      { label: 'through a corner', set: { p0: [-1.5, 0, 1], p1: [2, 1, 0.8], p2: [0.2, -1.4, -1.4] } },
      { label: 'in the plane', set: { p0: [-1.5, 0, 1], p1: [2, 0, 0.8], p2: [0.2, 0, -1.4] } },
    ],
    regions: ['Tests: triangle and plane'],
    keys: { s0: COL.a, s1: COL.c, s2: COL.b, q: COL.cyan, p0: COL.a, p1: COL.c, p2: COL.b, cut0: COL.gold },
    run: (m) => VB.trianglePlane(m.p0, m.p1, m.p2, m.q, m.n),
    draw(v, m, r) {
      v.plane(m.q, m.n, 3.2, COL.b, {});
      v.vec(m.q, m.n, COL.c, { k: 'n', r: 0.03 });
      v.patch([m.p0, m.p1, m.p2], COL.gold, 0.24, {});
      v.poly([m.p0, m.p1, m.p2], COL.white, { closed: true });
      const nn = m.n.dot(m.n);
      if (nn > VB.EPS) {
        v.dashed(m.p0, sub(m.p0, mul(m.n, r.s0 / nn)), COL.a, { k: 's0' });
        v.dashed(m.p1, sub(m.p1, mul(m.n, r.s1 / nn)), COL.c, { k: 's1' });
        v.dashed(m.p2, sub(m.p2, mul(m.n, r.s2 / nn)), COL.b, { k: 's2' });
      }
      if (r.cuts >= 1) v.point(r.cut0, COL.gold, { k: 'cut0', r: 0.09 });
      if (r.cuts >= 2) {
        v.point(r.cut1, COL.gold, { k: 'cut0', r: 0.09 });
        v.bar(r.cut0, r.cut1, COL.gold, { k: 'cut0', r: 0.035 });
      }
    },
    explain: (m, r) => ({
      hud: `{s0|${f(r.s0)}}, {s1|${f(r.s1)}}, {s2|${f(r.s2)}}: ${r.kind}`,
      rows: [
        `signed distances ({p0}, {p1}, {p2}): {s0|${f(r.s0)}}, {s1|${f(r.s1)}}, {s2|${f(r.s2)}}`,
        r.cuts >= 2 ? `cut along {cut0|${vt(r.cut0)}} to {cut0|${vt(r.cut1)}}` : r.cuts === 1 ? `one point on the plane: {cut0|${vt(r.cut0)}}` : 'no point of the triangle is on the plane',
      ],
      status: { text: { crosses: 'mixed signs: the plane cuts the triangle along a segment', 'all in front': 'all positive: entirely in front', 'all behind': 'all negative: entirely behind', 'in the plane': 'all zero: the triangle lies in the plane', touches: 'one or two corners on the plane, the rest on one side' }[r.kind], tone: kindTone(r.kind, ['crosses'], ['touches', 'in the plane']) },
      fact: 'Clipping keeps the front piece, a triangle or a quad, so one triangle can become two.',
      values: [['kind', r.kind], ['cut points', String(r.cuts), 'cut0']],
    }),
  },
  {
    id: 't.plane-plane', topic: 'tests', label: 'plane, plane',
    init: { q1: [0, 0, 0], n1: [0, 1.5, 0], q2: [1, 0.5, 0], n2: [1.2, 0.8, 0.4] },
    handles: [pt('q1', COL.a), vec('n1', COL.a, 'q1'), pt('q2', COL.b), vec('n2', COL.b, 'q2')],
    home: WIDE,
    presets: [
      { label: 'meet in a line', set: { q1: [0, 0, 0], n1: [0, 1.5, 0], q2: [1, 0.5, 0], n2: [1.2, 0.8, 0.4] } },
      { label: 'square', set: { q1: [0, 0, 0], n1: [0, 1.5, 0], q2: [1, 0, 0], n2: [1.5, 0, 0] } },
      { label: 'parallel', set: { q1: [0, 0, 0], n1: [0, 1.5, 0], q2: [0, 1.5, 0], n2: [0, 2, 0] } },
      { label: 'same plane', set: { q1: [0, 0, 0], n1: [0, 1.5, 0], q2: [2, 0, 1], n2: [0, 2, 0] } },
    ],
    regions: ['Tests: plane and plane'],
    keys: { n1: COL.a, n2: COL.b, q1: COL.a, q2: COL.b, d: COL.gold, p: COL.pink, gap: COL.gold, angle: COL.cyan },
    run: (m) => VB.planePlane(m.q1, m.n1, m.q2, m.n2),
    draw(v, m, r) {
      const c1 = r.parallel ? m.q1 : r.p;
      const c2 = r.parallel ? m.q2 : r.p;
      v.plane(c1, m.n1, 3, COL.a, { k: 'n1', opacity: 0.12 });
      v.plane(c2, m.n2, 3, COL.b, { k: 'n2', opacity: 0.12 });
      v.vec(m.q1, m.n1, COL.a, { k: 'n1', r: 0.03 });
      v.vec(m.q2, m.n2, COL.b, { k: 'n2', r: 0.03 });
      if (!r.parallel) {
        v.line(r.p, r.d, COL.gold, { k: 'd' });
        v.point(r.p, COL.pink, { k: 'p', r: 0.1, label: 'p', anchor: 'b' });
      }
    },
    explain: (m, r) => ({
      hud: `${r.kind}${r.parallel ? `: gap ${f(Math.abs(r.gap))}` : `, at {angle|${deg(r.angle)}}`}`,
      rows: [
        `{d} = {n1} × {n2} = {d|${vt(r.d)}}`,
        r.parallel ? `{gap} = ({q2} − {q1})·n̂₁ = {gap|${f(r.gap)}}` : `{p} = {p|${vt(r.p)}},  angle between the normals {angle|${deg(r.angle)}}`,
      ],
      status: { text: { 'meet in a line': 'the normals are not parallel: one line of intersection', parallel: 'parallel normals, a gap between: no intersection', 'same plane': 'parallel normals, no gap: one plane' }[r.kind], tone: kindTone(r.kind, ['meet in a line'], ['same plane']) },
      fact: 'Unlike lines, two planes in 3D cannot be skew. They meet unless they are parallel.',
      values: [['kind', r.kind], ['angle', deg(r.angle), 'angle'], ['gap', f(Math.abs(r.gap)), 'gap']],
    }),
  },
  {
    id: 't.tri-tri', topic: 'tests', label: 'triangle, triangle',
    init: { a0: [-2, 0, 1], a1: [2, 0, 1], a2: [0, 0, -2], b0: [0, -1.2, 0.3], b1: [0.6, 1.6, 0.8], b2: [-0.8, 1.4, -0.6] },
    handles: [pt('a0', COL.a), pt('a1', COL.a), pt('a2', COL.a), pt('b0', COL.b), pt('b1', COL.b), pt('b2', COL.b)],
    home: HOME,
    presets: [
      { label: 'intersecting', set: { b0: [0, -1.2, 0.3], b1: [0.6, 1.6, 0.8], b2: [-0.8, 1.4, -0.6] } },
      { label: 'one side', set: { b0: [0, 0.5, 0.3], b1: [0.6, 1.6, 0.8], b2: [-0.8, 1.4, -0.6] } },
      { label: 'plane cut, no contact', set: { b0: [3.4, -1.2, 2.6], b1: [3.6, 1.6, 3.2], b2: [2.6, 1.4, 2.4] } },
      { label: 'coplanar overlap', set: { b0: [-0.5, 0, 0], b1: [1, 0, 0.2], b2: [0, 0, -0.8] } },
      { label: 'coplanar apart', set: { b0: [3, 0, 2], b1: [4, 0, 2], b2: [3, 0, 3] } },
    ],
    regions: ['Tests: triangle and triangle'],
    keys: { s0: COL.b, s1: COL.b, s2: COL.b, hits: COL.gold, a0: COL.a, b0: COL.b },
    run: (m) => VB.triangleTriangle(m.a0, m.a1, m.a2, m.b0, m.b1, m.b2),
    draw(v, m, r) {
      const pierced = r.kind === 'intersecting' || r.kind === 'coplanar, overlapping';
      v.patch([m.a0, m.a1, m.a2], COL.a, pierced ? 0.42 : 0.24, { k: 'a0' });
      v.patch([m.b0, m.b1, m.b2], COL.b, pierced ? 0.42 : 0.24, { k: 'b0' });
      v.poly([m.a0, m.a1, m.a2], COL.a, { closed: true, k: 'a0' });
      v.poly([m.b0, m.b1, m.b2], COL.b, { closed: true, k: 'b0' });
      const edge = (p, q, t0, t1, t2) => {
        const h = VB.segmentTriangle(p, q, t0, t1, t2);
        if (h.kind === 'hit') v.point(h.hit, COL.gold, { k: 'hits', r: 0.1 });
      };
      edge(m.b0, m.b1, m.a0, m.a1, m.a2); edge(m.b1, m.b2, m.a0, m.a1, m.a2); edge(m.b2, m.b0, m.a0, m.a1, m.a2);
      edge(m.a0, m.a1, m.b0, m.b1, m.b2); edge(m.a1, m.a2, m.b0, m.b1, m.b2); edge(m.a2, m.a0, m.b0, m.b1, m.b2);
    },
    explain: (m, r) => ({
      hud: `${r.kind}`,
      rows: [
        `corners of the blue triangle against the red plane: {s0|${f(r.s0)}}, {s1|${f(r.s1)}}, {s2|${f(r.s2)}}`,
        `edges piercing the other triangle: {hits|${r.hits}}`,
      ],
      status: { text: { 'one side of the plane': 'all one sign: rejected by the early out, with no edge test', intersecting: 'an edge pierces the other triangle (gold points)', 'no contact': 'the plane is cut, but no edge pierces the triangle', 'coplanar, overlapping': 'in one plane, and overlapping', 'coplanar, apart': 'in one plane, and apart' }[r.kind], tone: kindTone(r.kind, ['intersecting', 'coplanar, overlapping'], ['no contact', 'one side of the plane']) },
      fact: 'Collision between two meshes runs this test on triangle pairs, after bounding boxes have ruled most pairs out.',
      values: [['kind', r.kind], ['piercing edges', String(r.hits), 'hits']],
    }),
  },
);

// ---------------------------------------------------------------- interpolation

VIEW_LIST.push(
  {
    id: 'interp.lerp', topic: 'interp', label: 'lerp', group: 'ab',
    init: { ...AB, t: 0.35 }, handles: ABH,
    params: [{ id: 't', label: 't', min: -0.5, max: 1.5, step: 0.01, play: true }],
    home: HOME,
    presets: [{ label: 't = 0.5', set: { t: 0.5 } }, { label: 't = 1.25', set: { t: 1.25 } }, { label: 'opposite', set: { a: [2, 1, 0], b: [-2, -1, 0] } }, { label: 'perpendicular', set: { a: [2, 0, 0], b: [0, 2, 0] } }],
    regions: ['Interpolation: lerp'],
    keys: { x: COL.gold, w0: COL.a, w1: COL.b, len: COL.gold },
    run: (m) => VB.lerpVector(m.a, m.b, m.t),
    draw(v, m, r) {
      const o = V();
      v.arrow(o, m.a, COL.a, { k: 'a', r: 0.03 });
      v.arrow(o, m.b, COL.b, { k: 'b', r: 0.03 });
      v.line(m.a, sub(m.b, m.a), COL.dim);
      v.bar(m.a, m.b, COL.gray, { r: 0.012 });
      for (let i = 0; i <= 10; i++) v.point(VB.lerpVector(m.a, m.b, i / 10).x, COL.gray, { r: 0.035 });
      v.arrow(o, r.x, COL.gold, { k: 'x', r: 0.04, hr: 0.11, label: `t = ${f(m.t)}`, anchor: 'a' });
    },
    explain: (m, r) => ({
      hud: `{x|x} = {w0|${f(r.w0)}} {a} + {w1|${f(r.w1)}} {b} = {x|${vt(r.x)}}`,
      rows: [
        `{w0|1 − t} = {w0|${f(r.w0)}},  {w1|t} = {w1|${f(r.w1)}}, sum 1`,
        `{x|x} = {x|${vt(r.x)}},  |{x|x}| = {len|${f(r.len)}}`,
      ],
      chart: {
        x: [-0.5, 1.5], y: [0, Math.max(m.a.length(), m.b.length(), r.len) * 1.15], xLabel: 't', curve: '|x(t)|',
        series: [{ fn: (t) => VB.lerpVector(m.a, m.b, t).len, color: COL.gold }], at: m.t, atY: r.len,
      },
      status: m.t < 0 || m.t > 1 ? { text: 't outside [0, 1]: extrapolating. Unity\'s Vector3.Lerp would clamp; three.js, mix and LerpUnclamped do not', tone: 'warn' } : { text: 'equal steps in t are equal steps along the chord', tone: 'ok' },
      fact: 'The gray dots mark t = 0, 0.1, ..., 1. Their spacing is even, and the length of x dips between them when a and b point different ways.',
      values: [['x', vt(r.x), 'x'], ['|x|', f(r.len), 'len']],
    }),
  },
  {
    id: 'interp.slerp', topic: 'interp', label: 'slerp, nlerp', group: 'ab',
    init: { ...AB, t: 0.35 }, handles: ABH,
    params: [{ id: 't', label: 't', min: 0, max: 1, step: 0.01, play: true }],
    home: CLOSE,
    presets: [{ label: 'wide angle', set: { a: [2, 0, 0], b: [-1.8, 0.8, 0] } }, { label: 'perpendicular', set: { a: [2, 0, 0], b: [0, 2, 0] } }, { label: 'close', set: { a: [2, 0, 0], b: [2, 0.3, 0] } }, { label: 'opposite', set: { a: [2, 0, 0], b: [-2, 0, 0] } }],
    regions: ['Interpolation: lerp, nlerp and slerp'],
    keys: { slerp: COL.c, nlerp: COL.amber, chord: COL.purple, aHat: COL.a, bHat: COL.b, theta: COL.cyan, w0: COL.a, w1: COL.b },
    run: (m) => VB.slerpVector(m.a, m.b, m.t),
    draw(v, m, r) {
      const o = V();
      v.arc(o, r.aHat, r.bHat, 1, COL.dim, { fill: 0.05 });
      v.bar(r.aHat, r.bHat, COL.purple, { k: 'chord', r: 0.008 });
      v.arrow(o, m.a, COL.a, { k: 'a', r: 0.012, hr: 0.05, head: 0.16 });
      v.arrow(o, m.b, COL.b, { k: 'b', r: 0.012, hr: 0.05, head: 0.16 });
      for (let i = 0; i <= 10; i++) {
        const s = VB.slerpVector(m.a, m.b, i / 10);
        v.point(s.slerp, COL.c, { k: 'slerp', r: 0.03 });
        v.point(add(s.nlerp, mul(s.nlerp, 0.1)), COL.amber, { k: 'nlerp', r: 0.03 });
      }
      v.arrow(o, r.chord, COL.purple, { k: 'chord', r: 0.018, hr: 0.06, head: 0.18, label: 'lerp', anchor: 'b' });
      v.arrow(o, r.nlerp, COL.amber, { k: 'nlerp', r: 0.024, hr: 0.08, label: 'nlerp', anchor: 'a' });
      v.arrow(o, r.slerp, COL.c, { k: 'slerp', r: 0.034, hr: 0.1, label: 'slerp', anchor: 'r' });
    },
    explain(m, r) {
      const thetaDeg = (r.theta * 180) / Math.PI;
      return {
        hud: `{slerp} = sin((1−t){theta|θ}) / sin {theta|θ} {aHat|â} + sin(t{theta|θ}) / sin {theta|θ} {bHat|b̂}`,
        rows: [
          `{theta|θ} = {theta|${deg(r.theta)}},  {w0|w₀} = {w0|${f(r.w0, 3)}},  {w1|w₁} = {w1|${f(r.w1, 3)}}`,
          `{slerp} = {slerp|${vt(r.slerp)}}, turned {slerp|${f(Math.acos(Math.min(1, Math.max(-1, r.aHat.dot(r.slerp)))) * 180 / Math.PI, 1)}°}`,
          `{nlerp} = {nlerp|${vt(r.nlerp)}}, turned {nlerp|${f(Math.acos(Math.min(1, Math.max(-1, r.aHat.dot(r.nlerp)))) * 180 / Math.PI, 1)}°}`,
          `{chord|lerp}: |{chord|x}| = ${f(r.chord.length())}, inside the unit sphere`,
        ],
        chart: {
          x: [0, 1], y: [0, Math.max(thetaDeg, 1)], xLabel: 't', curve: 'angle turned from a',
          series: [
            { fn: (t) => t * thetaDeg, color: COL.c },
            { fn: (t) => (Math.acos(Math.min(1, Math.max(-1, r.aHat.dot(VB.slerpVector(m.a, m.b, t).nlerp)))) * 180) / Math.PI, color: COL.amber },
          ],
          at: m.t, atY: m.t * thetaDeg,
        },
        status: r.sinT < VB.EPS
          ? (r.cosT < 0 ? { text: 'opposite: every plane through a holds a half turn, so no one path is defined, and the chord passes through 0', tone: 'bad' } : { text: 'parallel: nothing to turn through, so the weights fall back to lerp\'s', tone: 'warn' })
          : { text: 'slerp is the straight green line in the chart: constant turning speed. nlerp is behind it before t = 1/2 and ahead after', tone: 'ok' },
        fact: 'Green dots (slerp) are evenly spaced; amber dots (nlerp, drawn slightly outside the sphere) bunch at the ends. The gap grows with the angle. Quaternion slerp is this same formula in 4D.',
        values: [['θ', deg(r.theta), 'theta'], ['sin θ', f(r.sinT, 3), 'theta']],
      };
    },
  },
  {
    id: 'interp.bary', topic: 'interp', label: 'across a triangle',
    init: {
      p0: [-2, 0, 1.5], p1: [2.2, 0, 1.2], p2: [0, 0, -2.2], X: [0.2, 0, 0.3],
      v0: [-0.9, 1.4, 0.5], v1: [0.9, 1.4, 0.5], v2: [0, 1.4, -1],
    },
    handles: [
      gpt('X', COL.gold), gpt('p0', COL.a), gpt('p1', COL.c), gpt('p2', COL.b),
      vec('v0', COL.a, 'p0'), vec('v1', COL.c, 'p1'), vec('v2', COL.b, 'p2'),
    ],
    home: HOME,
    presets: [{ label: 'centroid', run(m) { m.X.copy(mul(add(add(m.p0, m.p1), m.p2), 1 / 3)); } }, { label: 'at p0', run(m) { m.X.copy(m.p0); } }, { label: 'mid edge', run(m) { m.X.copy(mid(m.p1, m.p2)); } }, { label: 'outside', set: { X: [3, 0, 2.5] } }],
    regions: ['Interpolation: across a triangle'],
    keys: { w0: COL.a, w1: COL.c, w2: COL.b, x: COL.gold, xHat: COL.pink, X: COL.gold, p0: COL.a, p1: COL.c, p2: COL.b, v0: COL.a, v1: COL.c, v2: COL.b },
    run: (m) => VB.barycentricInterpolate(m.X, m.p0, m.p1, m.p2, m.v0, m.v1, m.v2),
    draw(v, m, r) {
      const piece = (w, c, p, q, k) => v.patch([m.X, p, q], w < 0 ? COL.red : c, Math.min(0.7, 0.1 + Math.abs(w) * 0.6), { k });
      piece(r.w0, COL.a, m.p1, m.p2, 'w0');
      piece(r.w1, COL.c, m.p2, m.p0, 'w1');
      piece(r.w2, COL.b, m.p0, m.p1, 'w2');
      v.poly([m.p0, m.p1, m.p2], COL.white, { closed: true });
      v.vec(m.p0, m.v0, COL.a, { k: 'v0', r: 0.025 });
      v.vec(m.p1, m.v1, COL.c, { k: 'v1', r: 0.025 });
      v.vec(m.p2, m.v2, COL.b, { k: 'v2', r: 0.025 });
      v.vec(m.X, r.x, COL.gold, { k: 'x', r: 0.04, hr: 0.11, label: 'x', anchor: 'l' });
      v.vec(m.X, r.xHat, COL.pink, { k: 'xHat', r: 0.018, hr: 0.07, label: 'x̂', anchor: 'r' });
    },
    explain: (m, r) => ({
      hud: `{x} = {w0|${f(r.w0)}} {v0} + {w1|${f(r.w1)}} {v1} + {w2|${f(r.w2)}} {v2}`,
      rows: [
        `weights: {w0|${f(r.w0)}}, {w1|${f(r.w1)}}, {w2|${f(r.w2)}}, sum ${f(r.w0 + r.w1 + r.w2)}`,
        `{x} = {x|${vt(r.x)}},  |{x}| = ${f(r.x.length())}`,
        `{xHat|x̂} = {xHat|${vt(r.xHat)}}`,
      ],
      status: Math.min(r.w0, r.w1, r.w2) < 0 ? { text: 'a negative weight: X is outside, and x is extrapolated', tone: 'bad' } : { text: 'inside: x is a weighted average of the three corner vectors', tone: 'ok' },
      fact: 'Phong shading: the corners hold normals, the rasterizer interpolates them, and the fragment shader normalizes the result, since an average of unit vectors is shorter than 1.',
      values: [['x', vt(r.x), 'x'], ['|x|', f(r.x.length()), 'x'], ['x̂', vt(r.xHat), 'xHat']],
    }),
  },
  {
    id: 'interp.bilinear', topic: 'interp', label: 'across a quad',
    init: { p00: [-2, 0, 1.6], p10: [2, 0.8, 1.6], p01: [-2, 0.8, -1.6], p11: [2, 0, -1.6], s: 0.4, t: 0.6 },
    handles: [pt('p00', COL.a), pt('p10', COL.c), pt('p01', COL.b), pt('p11', COL.purple)],
    params: [{ id: 's', label: 's', min: 0, max: 1, step: 0.01, play: true }, { id: 't', label: 't', min: 0, max: 1, step: 0.01, play: true }],
    home: HOME,
    presets: [{ label: 'flat', set: { p00: [-2, 0, 1.6], p10: [2, 0, 1.6], p01: [-2, 0, -1.6], p11: [2, 0, -1.6] } }, { label: 'twisted', set: { p00: [-2, 0, 1.6], p10: [2, 1.4, 1.6], p01: [-2, 1.4, -1.6], p11: [2, 0, -1.6] } }, { label: 'center', set: { s: 0.5, t: 0.5 } }],
    regions: ['Interpolation: across a quad'],
    keys: { bottom: COL.amber, top: COL.cyan, x: COL.gold },
    run: (m) => VB.bilinearPatch(m.p00, m.p10, m.p01, m.p11, m.s, m.t),
    draw(v, m, r) {
      const at = (s, t) => VB.bilinearPatch(m.p00, m.p10, m.p01, m.p11, s, t).x;
      for (let i = 0; i <= 8; i++) {
        const a = [], b = [];
        for (let j = 0; j <= 8; j++) { a.push(at(i / 8, j / 8)); b.push(at(j / 8, i / 8)); }
        v.poly(a, COL.dim);
        v.poly(b, COL.dim);
      }
      v.poly([m.p00, m.p10, m.p11, m.p01], COL.gray, { closed: true });
      v.point(r.bottom, COL.amber, { k: 'bottom', r: 0.09, label: 'bottom', anchor: 'b' });
      v.point(r.top, COL.cyan, { k: 'top', r: 0.09, label: 'top', anchor: 'a' });
      v.bar(r.bottom, r.top, COL.gold, { k: 'x', r: 0.018 });
      v.point(r.x, COL.gold, { k: 'x', r: 0.13, label: 'x', anchor: 'r' });
    },
    explain: (m, r) => ({
      hud: `{x} = lerp({bottom}, {top}, ${f(m.t)})`,
      rows: [
        `{bottom} = lerp(p00, p10, ${f(m.s)}) = {bottom|${vt(r.bottom)}}`,
        `{top} = lerp(p01, p11, ${f(m.s)}) = {top|${vt(r.top)}}`,
        `{x} = {x|${vt(r.x)}}`,
      ],
      status: { text: 'lerping in s first or in t first gives the same point', tone: 'ok' },
      fact: 'The weights are (1−s)(1−t), s(1−t), (1−s)t and st, which sum to 1. A texture sample blends its four nearest texels with them.',
      values: [['x', vt(r.x), 'x'], ['weights', `${f((1 - m.s) * (1 - m.t))}, ${f(m.s * (1 - m.t))}, ${f((1 - m.s) * m.t)}, ${f(m.s * m.t)}`]],
    }),
  },
);

export const VIEWS = VIEW_LIST;
export const viewById = (id) => VIEW_LIST.find((view) => view.id === id);
