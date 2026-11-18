// rig-lab-views: the catalog behind the rig-lab demo (runtime: lib/core/lab.js). Each view calls the program's own functions
// (lib/programs/rig-lab/webgl/riglab.js), so the numbers beside the code are that code's output. Topics: forward kinematics on a chain of
// bones, inverse kinematics (the two-link law of cosines, cyclic coordinate descent, the Jacobian pseudo-inverse), skinning (linear blend
// with its bind pose, the candy wrapper against dual quaternions, blend shapes) and motion (blend trees by slerp, retargeting). The
// iterative solvers step on request or on a timer; the timer stops when the view changes.
//   makeViews(S): S draws the meshes (rig-lab.js); a stub in the node tests. The result also carries .solver, the iterative
//   solvers' state and steps, so the tests can drive them without a timer.
import * as RL from '../programs/rig-lab/webgl/riglab.js';
import { COL, V } from '../core/lab-viz.js';

export const TOPICS = [
  { id: 'fk', label: 'Forward' }, { id: 'ik', label: 'Inverse' }, { id: 'skin', label: 'Skinning' }, { id: 'motion', label: 'Motion' },
];

export const KEYS = {
  L1: COL.a, L2: COL.b, L3: COL.c, W1: COL.a, W2: COL.b, W3: COL.c, tip: COL.gold, hand: COL.gray, th1: COL.a, th2: COL.b, th3: COL.c,
  d: COL.cyan, cos2: COL.pink, l1: COL.a, l2: COL.b, elbow: COL.purple, target: COL.gold, reach: COL.gray, down: COL.c, up: COL.pink,
  joint: COL.gold, toEnd: COL.cyan, toTarget: COL.gold, delta: COL.pink, err: COL.red, J: COL.cyan, goal: COL.white, det: COL.amber, lambda: COL.purple,
  v: COL.pink, vp: COL.white, bA: COL.a, bB: COL.b, bC: COL.c, wA: COL.a, wB: COL.b, wC: COL.c, rest: COL.gray, shrink: COL.red,
  twist: COL.gold, lbs: COL.red, dq: COL.green, closed: COL.cyan, vol: COL.amber, radius: COL.gold,
  neutral: COL.gray, shape1: COL.a, shape2: COL.b, walk: COL.b, run: COL.amber, blend: COL.green, q: COL.pink, slerp: COL.cyan, speed: COL.gold,
  perf: COL.gray, copy: COL.cyan, stretch: COL.red, pin: COL.green,
};

const BONE = [COL.a, COL.b, COL.c, COL.amber];
const FAR_LEG = 0x2a8c55;   // the blend tree's other leg, a darker green
const HOME_XY = { eye: [0.8, 0.7, 4.6], target: [0.8, 0.5, 0] };
const HOME_IK = { eye: [0.5, 0.2, 7.4], target: [0.5, 0.2, 0] };
const HOME_TUBE = { eye: [1.1, 1.0, 5.2], target: [1.1, 0.5, 0] };
const HOME_WRAP = { eye: [0.75, 0.1, 6.6], target: [0.75, 0, 0] };
const HOME_SHAPES = { eye: [1.0, 2.5, 3.6], target: [1.0, 0, 0] };
const HOME_LEG = { eye: [0, -0.4, 2.7], target: [0, -0.45, 0] };

// ---------------------------------------------------------------- small helpers

const P = (a) => V(a[0], a[1], a[2] ?? 0);
const f = (x, d = 2) => (Number.isFinite(x) ? (Number(x.toFixed(d)) === 0 ? (0).toFixed(d) : x.toFixed(d)).replace('-', '−') : 'none');
const g = (x, d = 3) => String(Number(Number.isFinite(x) ? f(x, d).replace('−', '-') : 0)).replace('-', '−');
const deg = (x, d = 1) => `${f(x, d)}°`;
const p2 = (a, d = 2) => `(${f(a[0], d)}, ${f(a[1], d)})`;
const p3 = (a, d = 2) => `(${f(a[0], d)}, ${f(a[1], d)}, ${f(a[2], d)})`;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]);
const pct = (x, d = 1) => `${f(100 * x, d)} %`;
const tgt = (m) => [m.target.x, m.target.y, 0];
const axisOf = (W, c) => [W[4 * c], W[4 * c + 1], W[4 * c + 2]];
const zeros = (n) => { const out = []; for (let i = 0; i < n; i++) out.push(0); return out; };
const BONE_NAME = ['A', 'B', 'C'];
const BONE_KEY = ['bA', 'bB', 'bC'];
const WEIGHT_KEY = ['wA', 'wB', 'wC'];

// small DOM helpers for the panels (browser only)
function el(tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
function btn(parent, label, onClick, title) {
  const b = el('button', 'lab-btn', parent, label);
  b.type = 'button';
  if (title) b.title = title;
  b.addEventListener('click', (e) => { e.stopPropagation(); b.blur(); onClick(); });
  return b;
}
function once(host, id, build) {
  if (host.dataset.built === id) return false;
  host.innerHTML = '';
  host.dataset.built = id;
  build(host);
  return true;
}
/** a 4 x 4 matrix, as rows, from the program's column-major array */
function matHtml(m, title, key) {
  let h = `<div class="rl-m"${key ? ` data-k="${key}"` : ''}><div class="rl-mt">${title}</div><table>`;
  for (let r = 0; r < 4; r++) {
    h += '<tr>';
    for (let c = 0; c < 4; c++) h += `<td>${g(m[4 * c + r])}</td>`;
    h += '</tr>';
  }
  return `${h}</table></div>`;
}

// ---------------------------------------------------------------- shared drawing

function drawBones(v, joints, tip, { colors = BONE, r = 0.045, ghost = false, keys = null, jointR = 0.07 } = {}) {
  const pts = [...joints, tip];
  for (let i = 0; i < pts.length - 1; i++) {
    v.bar(P(pts[i]), P(pts[i + 1]), ghost ? COL.dim : colors[i % colors.length], { k: ghost ? 'ghost' : keys?.[i], r: ghost ? r * 0.55 : r });
  }
  if (ghost) return;
  for (let i = 0; i < joints.length; i++) v.point(P(joints[i]), colors[i % colors.length], { r: jointR, k: keys?.[i] });
}

function drawAngle(v, center, e1, e2, radius, color, label, k) {
  v.arc(P(center), P(e1), P(e2), radius, color, { k, label, fill: 0.14 });
}

// ---------------------------------------------------------------- the iterative solvers' state (shared by the CCD and Jacobian views)

const ARM = [1, 0.8, 0.6, 0.5];
const START = [35, -20, 25, -30];
const TOLERANCE = 0.001;
const BUDGET = 300;
const REACH = ARM.reduce((s, x) => s + x, 0);

// A step of a solver turns the joints at once; the drawing turns them over 6 ms per degree of the largest turn, at least
// STEP_MS_MIN (STEP_MS_LATE after the first STEP_SLOW steps, so a run of a hundred small steps stays short) and at most
// STEP_MS_MAX, so a run can be watched step by step.
const STEP_MS_MIN = 200, STEP_MS_LATE = 60, STEP_MS_MAX = 600, STEP_SLOW = 12;
const shortTurn = (a, b) => ((((b - a + 180) % 360) + 360) % 360) - 180;   // from a to b the short way, in degrees
const wrap180 = (a) => shortTurn(0, a);   // an angle shown in [-180, 180): CCD's turns add up past a full turn

function makeSolver() {
  const S = { angles: START.slice(), startPose: START.slice(), errors: [], joint: ARM.length - 1, steps: 0, timer: null, stopped: '', trail: [], follow: true, lastTarget: null, last: null, anim: null };
  const tipOf = (angles) => RL.forwardKinematics(ARM, angles).tip;
  const errorAt = (angles, target) => norm(sub(tipOf(angles), target));
  S.stop = () => { if (S.timer) clearInterval(S.timer); S.timer = null; S.anim = null; };
  /** the pose to draw: between two steps, on the way from the old angles to the new */
  S.animating = () => !!S.anim && performance.now() - S.anim.start < S.anim.dur;
  S.shown = () => {
    if (!S.animating()) return S.angles;
    const k = (performance.now() - S.anim.start) / S.anim.dur, e = k * k * (3 - 2 * k);
    return S.anim.from.map((a, i) => a + shortTurn(a, S.anim.to[i]) * e);
  };
  const animateFrom = (from) => {
    const biggest = Math.max(...from.map((a, i) => Math.abs(shortTurn(a, S.angles[i]))));
    const least = S.steps <= STEP_SLOW ? STEP_MS_MIN : STEP_MS_LATE;
    S.anim = { from, to: S.angles.slice(), start: performance.now(), dur: Math.min(STEP_MS_MAX, Math.max(least, 6 * biggest)) };
  };
  /** one press of step, sweep or 5 steps: the change is drawn as motion */
  S.press = (fn) => { const from = S.angles.slice(); fn(); animateFrom(from); };
  S.reset = (m) => {
    S.stop();
    S.angles = START.slice();
    S.startPose = START.slice();
    S.joint = ARM.length - 1;
    S.steps = 0;
    S.stopped = '';
    S.trail = [tipOf(START)];
    S.errors = [errorAt(START, tgt(m))];
    S.lastTarget = [m.target.x, m.target.y];
    S.last = null;
  };
  /** start from a given pose instead of START */
  S.pose = (angles, m) => {
    S.reset(m);
    S.angles = angles.slice();
    S.startPose = angles.slice();
    S.trail = [tipOf(angles)];
    S.errors = [errorAt(angles, tgt(m))];
  };
  /** back to the pose this case started from (a preset's pose, or START) */
  S.restart = (m) => S.pose(S.startPose, m);
  /** the target moved: the error is measured again, the pose stays, and the history starts over */
  S.retarget = (m) => {
    const now = [m.target.x, m.target.y];
    if (S.lastTarget && S.lastTarget[0] === now[0] && S.lastTarget[1] === now[1]) return false;
    S.lastTarget = now;
    S.errors = [errorAt(S.angles, tgt(m))];
    S.steps = 0;
    S.stopped = '';
    S.trail = [tipOf(S.angles)];
    return true;
  };
  const record = (error, joint) => {
    S.errors.push(error);
    S.steps += 1;
    S.trail.push(tipOf(S.angles));
    S.last = { joint, error };
    const n = S.errors.length;
    if (error <= TOLERANCE) S.stopped = 'reached';
    else if (S.steps >= BUDGET) S.stopped = 'budget';
    else if (n > 8 && S.errors[n - 9] - error < 1e-5) S.stopped = 'stalled';
  };
  S.ccdStep = (m) => {
    const joint = S.joint;
    const r = RL.ccdJoint(ARM, S.angles, tgt(m), joint);
    S.angles = r.angles;
    S.joint = joint === 0 ? ARM.length - 1 : joint - 1;
    record(r.error, joint);
  };
  S.ccdSweep = (m) => { for (let k = 0; k < ARM.length && !S.stopped; k++) S.ccdStep(m); };
  S.jacStep = (m) => {
    const r = RL.pseudoInverseStep(ARM, S.angles, tgt(m), m.lambda, RL.MAX_STEP);
    if (r.singular) { S.stopped = 'singular'; return; }
    S.angles = r.angles;
    record(r.remaining, -1);
  };
  S.step = (kind, m) => { if (S.stopped === 'reached') return; if (kind === 'ccd') S.ccdStep(m); else S.jacStep(m); };
  S.runAll = (kind, m) => { S.stopped = S.stopped === 'singular' ? 'singular' : ''; while (!S.stopped) S.step(kind, m); };
  /** run: step until the tip is within TOLERANCE, drawing each step as motion; after a finished run it plays again from the start */
  S.start = (kind, ctx) => {
    if (S.timer || S.stopped === 'singular') return;
    if (S.stopped === 'reached') S.restart(ctx.state());
    S.stopped = S.stopped === 'budget' || S.stopped === 'stalled' ? '' : S.stopped;
    S.timer = setInterval(() => {
      const m = ctx.state();
      if (S.animating()) { ctx.refresh(); return; }
      S.anim = null;
      if (S.stopped) { S.stop(); ctx.refresh(); return; }
      const from = S.angles.slice();
      S.step(kind, m);
      animateFrom(from);
      ctx.refresh();
    }, 30);
  };
  S.reset({ target: { x: 1, y: 0.6 } });
  return S;
}

// ---------------------------------------------------------------- the tubes

const TUBE2 = RL.makeTube(2, 0.32, 33, 14);
const TUBE3 = RL.makeTube(3, 0.32, 49, 14);
const WRAP = RL.makeTube(2, 0.4, 33, 16);           // ring 16 is at x = 1, the joint
const WRAP_RING = 16 * 16;
const SHAPES = RL.makeTube(2, 0.4, 25, 16);
const BULGE = RL.bulgeOffsets(SHAPES.positions, 2, 0.6).offsets;
const FLATTEN = RL.flattenOffsets(SHAPES.positions, 0.7).offsets;

/** the weights of every vertex as colors: the bone colors, mixed by weight */
function weightColors(weights) {
  const hex = [COL.a, COL.b, COL.c];
  const out = new Float32Array(weights.length * 3);
  for (let i = 0; i < weights.length; i++) {
    for (let k = 0; k < weights[i].length; k++) {
      const c = hex[k];
      out[3 * i] += weights[i][k] * ((c >> 16) & 255) / 255;
      out[3 * i + 1] += weights[i][k] * ((c >> 8) & 255) / 255;
      out[3 * i + 2] += weights[i][k] * (c & 255) / 255;
    }
  }
  return out;
}

/** the front-most vertex within a radius of the mouse's ray */
function nearestToRay(positions, ray, offset = [0, 0, 0], within = 0.12) {
  let best = -1, bestT = Infinity;
  for (let i = 0; i < positions.length; i++) {
    const p = [positions[i][0] + offset[0] - ray.origin[0], positions[i][1] + offset[1] - ray.origin[1], positions[i][2] + offset[2] - ray.origin[2]];
    const t = p[0] * ray.dir[0] + p[1] * ray.dir[1] + p[2] * ray.dir[2];
    if (t < 0) continue;
    const d = Math.hypot(p[0] - t * ray.dir[0], p[1] - t * ray.dir[1], p[2] - t * ray.dir[2]);
    if (d < within && t < bestT) { best = i; bestT = t; }
  }
  return best;
}

export function makeViews(S) {
  const look = { weights: true, glass: true, wire: true, rest: true };
  const shapeLook = { glass: false, wire: true, rest: true };
  const solver = makeSolver();

  /** the display toggles of the mesh views */
  function lookButtons(host, ctx, which, state = look) {
    const row = el('div', 'lab-btns rl-look', host);
    const defs = { weights: ['weights as color', 'Color each vertex by its bone weights'], glass: ['see through', 'Draw the skin translucent, to see the bones and the points inside'],
      wire: ['wireframe', 'Draw the triangles\' edges'], rest: ['bind pose', 'Draw the bind-pose mesh faintly'] };
    for (const k of which) {
      const b = btn(row, defs[k][0], () => { state[k] = !state[k]; b.classList.toggle('on', state[k]); ctx.refresh(); }, defs[k][1]);
      b.classList.toggle('on', state[k]);
    }
  }
  function choose(host, label, names, get, set, ctx, cls = '') {
    const row = el('div', `lab-btns ${cls}`, host);
    el('span', 'rl-seglabel', row, label);
    const bs = names.map(([value, text, title]) => {
      const b = btn(row, text, () => { set(value); show(); ctx.refresh(); }, title);
      b.dataset.value = String(value);
      return b;
    });
    function show() { bs.forEach((b) => b.classList.toggle('on', b.dataset.value === String(get()))); }
    show();
    return show;
  }

  // ------------------------------------------------------------ Forward: a chain of bones as a scene graph
  const FK_LEN = (m) => [1, 0.8, m.l3];
  const fkView = {
    id: 'fk', topic: 'fk', label: 'a chain of bones', home: HOME_XY, grid: 'xy', axes: false, inputTitle: 'Joint angles',
    init: { t1: 30, t2: -50, t3: 40, l3: 0.6, bone: 2 },
    params: [
      { id: 't1', label: 'θ₁ shoulder', min: -180, max: 180, step: 0.1, unit: '°', play: true },
      { id: 't2', label: 'θ₂ elbow', min: -180, max: 180, step: 0.1, unit: '°', play: true },
      { id: 't3', label: 'θ₃ wrist', min: -180, max: 180, step: 0.1, unit: '°', play: true },
      { id: 'l3', label: 'l₃ hand', min: 0, max: 1.2, step: 0.05 },
    ],
    presets: [
      { label: 'straight', set: { t1: 0, t2: 0, t3: 0, l3: 0.6 } },
      { label: 'the inverse kinematics slide\'s arm', set: { t1: 7.3285, t2: 67.5889, t3: 0, l3: 0 } },
      { label: 'curled', set: { t1: 60, t2: 90, t3: 90, l3: 0.6 } },
      { label: 'folded back', set: { t1: 20, t2: 180, t3: 0, l3: 0.6 } },
    ],
    regions: ['Forward kinematics: the chain as a scene graph', 'Forward kinematics: by hand'],
    run(m) {
      const lengths = FK_LEN(m), angles = [m.t1, m.t2, m.t3];
      const chain = RL.forwardKinematics(lengths, angles);
      const hand = RL.tipByHand(lengths, angles);
      const parts = [];
      for (let i = 1; i <= 3; i++) parts.push(RL.tipByHand(lengths.slice(0, i), angles.slice(0, i)).tip);
      return { lengths, angles, ...chain, heading: hand.heading, parts, gap: norm(sub(chain.tip, hand.tip)) };
    },
    draw(v, m, r) {
      S.begin();
      for (let i = 0; i < 3; i++) {
        const a = P(r.joints[i]), b = P(i < 2 ? r.joints[i + 1] : r.tip), k = `W${i + 1}`;
        v.bar(a, b, BONE[i], { k, r: i + 1 === m.bone ? 0.07 : 0.045 });
        const W = r.worlds[i];
        v.arrow(a, a.clone().add(P(axisOf(W, 0)).multiplyScalar(0.42)), COL.red, { k, r: 0.013, hr: 0.04, head: 0.12 });
        v.arrow(a, a.clone().add(P(axisOf(W, 1)).multiplyScalar(0.42)), COL.green, { k, r: 0.013, hr: 0.04, head: 0.12 });
        v.point(a, BONE[i], { r: 0.075, k, label: `J${i + 1}`, anchor: 'b' });
        drawAngle(v, r.joints[i], i === 0 ? [1, 0, 0] : axisOf(r.worlds[i - 1], 0), axisOf(W, 0), 0.5 + 0.1 * i, BONE[i], `θ${i + 1}`, `th${i + 1}`);
      }
      v.point(P(r.tip), COL.gold, { r: 0.1, k: 'tip', label: 'tip', anchor: 'ar' });
      v.dashed(V(0, 0, 0), V(r.tip[0], 0, 0), COL.gray, { k: 'hand' });
      v.dashed(V(r.tip[0], 0, 0), P(r.tip), COL.gray, { k: 'hand' });
    },
    explain(m, r) {
      const t = r.tip;
      const L = (i) => `${deg(r.angles[i])}`;
      const term = (axis) => r.parts.map((p, i) => f(p[axis] - (i ? r.parts[i - 1][axis] : 0), 3)).join(' + ');
      const same = r.gap < 1e-9;
      return {
        hud: `{tip} = {W3|W₃} (l₃, 0, 0) = ${p2(t)}`,
        rows: [
          `local: {W1|L₁} = R(${L(0)}), {W2|L₂} = T(${f(r.lengths[0])}, 0) R(${L(1)}), {W3|L₃} = T(${f(r.lengths[1])}, 0) R(${L(2)})`,
          `world: {W1|W₁} = {W1|L₁}, {W2|W₂} = {W1|W₁} {W2|L₂}, {W3|W₃} = {W2|W₂} {W3|L₃}`,
          `joints, the last column of each W: J₁ ${p2(r.joints[0])}, J₂ ${p2(r.joints[1])}, J₃ ${p2(r.joints[2])}`,
          `{tip} = {W3|W₃} (${f(r.lengths[2])}, 0, 0) = {tip|${p2(t, 3)}}`,
          `by hand: {hand|x} = l₁ cos θ₁ + l₂ cos(θ₁+θ₂) + l₃ cos(θ₁+θ₂+θ₃) = ${term(0)} = ${f(r.parts[2][0], 3)}`,
          `{hand|y} = l₁ sin θ₁ + l₂ sin(θ₁+θ₂) + l₃ sin(θ₁+θ₂+θ₃) = ${term(1)} = ${f(r.parts[2][1], 3)}`,
        ],
        status: { text: same ? `The matrices and the sum of the bones reach the same point${r.gap > 0 ? ` (they differ by ${r.gap.toExponential(1)})` : ''}.` : `The matrices and the hand sum differ by ${f(r.gap, 6)}.`, tone: same ? 'ok' : 'bad' },
        values: [['total heading θ₁+θ₂+θ₃', deg(r.heading), 'hand'], ['|tip|', f(norm(t), 3), 'tip'], ['bone lengths', `${f(r.lengths[0])}, ${f(r.lengths[1])}, ${f(r.lengths[2])}`], ['reach', f(r.lengths[0] + r.lengths[1] + r.lengths[2])]],
        fact: 'Each bone is a node of a scene graph: its local matrix turns about its joint, and its world matrix is its parent\'s world matrix times its own. The red and green arrows are each bone\'s x and y axes. Only the first joint has no parent, so every bone keeps its length.',
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'fk', (h) => {
        const row = el('div', 'lab-btns', h);
        el('span', 'rl-seglabel', row, 'bone');
        for (let i = 1; i <= 3; i++) {
          const b = btn(row, `${i}`, () => { ctx.state().bone = i; ctx.refresh(); });
          b.dataset.bone = String(i);
        }
        el('div', 'rl-mats', h);
      });
      host.querySelectorAll('[data-bone]').forEach((b) => b.classList.toggle('on', Number(b.dataset.bone) === m.bone));
      const i = m.bone - 1;
      const parent = i === 0 ? RL.identity() : r.worlds[i - 1];
      host.querySelector('.rl-mats').innerHTML = `<div class="rl-eq">${matHtml(parent, `W<sub>${i}</sub>${i === 0 ? ' (the root: I)' : ''}`)}<span class="rl-op">×</span>${matHtml(r.locals[i], `L<sub>${i + 1}</sub>`, `L${i + 1}`)}<span class="rl-op">=</span>${matHtml(r.worlds[i], `W<sub>${i + 1}</sub>`, `W${i + 1}`)}</div>`;
    },
    panelTitle: 'The matrices of one bone',
  };

  // ------------------------------------------------------------ Inverse: two links, the law of cosines
  const ik2View = {
    id: 'ik2', topic: 'ik', label: 'two links', home: HOME_IK, grid: 'xy', axes: false, inputTitle: 'Target and links',
    init: { target: [1.2, 0.9, 0], l1: 1, l2: 0.8, bend: 1 },
    handles: [{ id: 'target', label: 'p', color: COL.gold, fixed: 'z', anchor: 'ar' }],
    params: [
      { id: 'l1', label: 'l₁', min: 0.3, max: 2, step: 0.05 },
      { id: 'l2', label: 'l₂', min: 0.3, max: 2, step: 0.05 },
    ],
    presets: [
      { label: 'the lecture\'s target (1.2, 0.9)', set: { target: [1.2, 0.9, 0], l1: 1, l2: 0.8, bend: 1 } },
      { label: 'the other elbow', set: { target: [1.2, 0.9, 0], l1: 1, l2: 0.8, bend: -1 } },
      { label: 'out of reach (2, 0.5)', set: { target: [2, 0.5, 0], l1: 1, l2: 0.8, bend: 1 } },
      { label: 'stretched (1.8, 0)', set: { target: [1.8, 0, 0], l1: 1, l2: 0.8, bend: 1 } },
      { label: 'folded (0.2, 0)', set: { target: [0.2, 0, 0], l1: 1, l2: 0.8, bend: 1 } },
      { label: 'inside the fold (0.05, 0)', set: { target: [0.05, 0, 0], l1: 1, l2: 0.8, bend: 1 } },
    ],
    regions: ['Two-link inverse kinematics: the law of cosines', 'Forward kinematics: the chain as a scene graph'],
    run(m) {
      const t = tgt(m);
      const sol = RL.twoLinkIK(m.l1, m.l2, t, m.bend);
      const down = RL.twoLinkIK(m.l1, m.l2, t, 1), up = RL.twoLinkIK(m.l1, m.l2, t, -1);
      const chain = RL.forwardKinematics([m.l1, m.l2], [sol.theta1, sol.theta2]);
      return { ...sol, locals: chain.locals, worlds: chain.worlds, joints: chain.joints, down, up, other: m.bend > 0 ? up : down, reach: m.l1 + m.l2, inner: Math.abs(m.l1 - m.l2) };
    },
    draw(v, m, r) {
      S.begin();
      v.circle(V(0, 0, 0), V(0, 0, 1), r.reach, COL.gray, { k: 'reach' });
      if (r.inner > 0.01) v.circle(V(0, 0, 0), V(0, 0, 1), r.inner, COL.dim, { k: 'reach' });
      const o = r.other;
      drawBones(v, [[0, 0, 0], o.elbow], o.tip, { ghost: true });
      drawBones(v, [[0, 0, 0], r.elbow], r.tip, { keys: ['l1', 'l2'], r: 0.05 });
      v.dashed(V(0, 0, 0), V(m.target.x, m.target.y, 0), r.reachable ? COL.cyan : COL.red, { k: 'd' });
      v.point(P(r.tip), COL.gold, { r: 0.045, k: 'tip' });
      const dir1 = [Math.cos(r.theta1 * RL.DEG), Math.sin(r.theta1 * RL.DEG), 0];
      drawAngle(v, [0, 0, 0], [1, 0, 0], dir1, 0.4, COL.a, 'θ₁', 'th1');
      if (Math.abs(r.theta2) > 0.5) drawAngle(v, r.elbow, dir1, axisOf(r.worlds[1], 0), 0.35, COL.b, 'θ₂', 'th2');
      v.label(r.reachable ? 'd' : 'd (out of reach)', V(m.target.x / 2, m.target.y / 2, 0), r.reachable ? COL.cyan : COL.red, 'ab', 'd');
    },
    explain(m, r) {
      const d2 = r.distance * r.distance;
      const reachTxt = `|l₁ − l₂| = ${f(r.inner)} ≤ d ≤ l₁ + l₂ = ${f(r.reach)}`;
      const sign = m.bend > 0 ? '+' : '−';
      const rows = [
        `{d} = |target| = ${f(r.distance, 3)}, reachable when ${reachTxt}`,
        `{cos2|cos θ₂} = (d² − l₁² − l₂²) / (2 l₁ l₂) = (${f(d2, 3)} − ${f(m.l1 * m.l1)} − ${f(m.l2 * m.l2)}) / ${f(2 * m.l1 * m.l2)} = {cos2|${f(r.cos2, 4)}}`,
        r.reachable ? `{th2|θ₂} = ${sign}acos(cos θ₂) = {th2|${deg(r.theta2)}}` : `cos θ₂ ${r.cos2 > 1 ? 'is above 1' : 'is below −1'}: acos has no value, so it is clamped to ${f(r.clamped, 0)}: {th2|θ₂} = ${deg(r.theta2)}`,
        `{th1|θ₁} = atan2(p_y, p_x) − atan2(l₂ sin θ₂, l₁ + l₂ cos θ₂) = ${deg(r.direction, 2)} − ${deg(r.correction, 2)} = {th1|${deg(r.theta1)}}`,
        `{elbow} = l₁ (cos θ₁, sin θ₁) = ${p2(r.elbow, 3)}; forward kinematics gives the tip {tip|${p2(r.tip, 3)}}`,
        `both elbows: {down|elbow down} θ₁ ${deg(r.down.theta1)}, θ₂ ${deg(r.down.theta2)}; {up|elbow up} θ₁ ${deg(r.up.theta1)}, θ₂ ${deg(r.up.theta2)}`,
      ];
      return {
        hud: `{cos2|cos θ₂} = ${f(r.cos2, 3)}; {th1|θ₁} = ${deg(r.theta1)}, {th2|θ₂} = ${deg(r.theta2)}`,
        rows,
        status: r.reachable
          ? { text: `Reachable: the tip lands on the target (error ${f(r.error, 6)}).`, tone: 'ok' }
          : { text: `Out of reach: d = ${f(r.distance, 3)} is ${r.distance > r.reach ? `above the reach ${f(r.reach)}` : `below ${f(r.inner)}`}. The arm points at the target, ${r.distance > r.reach ? 'fully stretched' : 'folded flat'}, and stops ${f(r.error, 3)} short.`, tone: 'warn' },
        chart: { curve: 'cos θ₂ against d', x: [0, 2.6], y: [-1.5, 2], xLabel: 'distance d to the target', at: r.distance, atY: r.cos2, series: [
          { color: COL.pink, fn: (d) => RL.twoLinkIK(m.l1, m.l2, [d, 0, 0], 1).cos2 },
          { color: COL.dim, fn: () => 1 }, { color: COL.dim, fn: () => -1 }] },
        values: [['elbow', p2(r.elbow, 3), 'elbow'], ['tip', p2(r.tip, 3), 'tip'], ['θ₁', deg(r.theta1), 'th1'], ['θ₂', deg(r.theta2), 'th2'], ['reach', f(r.reach), 'reach'], ['error', f(r.error, 4), 'err']],
        fact: 'Two links and the line to the target form a triangle, so the law of cosines gives the elbow. The two signs of θ₂ are the two elbows, mirror images across the line to the target.',
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'ik2', (h) => {
        choose(h, 'elbow', [[1, 'down (θ₂ > 0)', 'The lecture\'s elbow-down solution'], [-1, 'up (θ₂ < 0)', 'The mirror solution']], () => ctx.state().bend, (x) => { ctx.state().bend = x; }, ctx);
      });
      host.querySelectorAll('[data-value]').forEach((b) => b.classList.toggle('on', Number(b.dataset.value) === m.bend));
    },
    panelTitle: 'Which elbow',
  };

  // ------------------------------------------------------------ Inverse: iterative solvers
  const iterPanel = (kind) => (host, m, r, ctx) => {
    once(host, `iter-${kind}`, (h) => {
      const row = el('div', 'lab-btns', h);
      const animate = (fn) => { solver.stop(); solver.press(fn); ctx.refresh(); requestAnimationFrame(function frame() { ctx.refresh(); if (solver.animating()) requestAnimationFrame(frame); }); };
      btn(row, 'step', () => animate(() => solver.step(kind, ctx.state())), kind === 'ccd' ? 'Turn the next joint' : 'One pseudo-inverse step');
      if (kind === 'ccd') btn(row, 'sweep', () => animate(() => solver.ccdSweep(ctx.state())), 'Turn every joint once, from the one nearest the tip to the base');
      else btn(row, '5 steps', () => animate(() => { for (let i = 0; i < 5 && !solver.stopped; i++) solver.step(kind, ctx.state()); }));
      const run = btn(row, 'run', () => { if (solver.timer) solver.stop(); else solver.start(kind, ctx); ctx.refresh(); }, 'Step until the tip is within 0.001 of the target; after a finished run, play it again from the start');
      run.classList.add('rl-run');
      btn(row, 'restart', () => { solver.restart(ctx.state()); ctx.refresh(); }, 'Back to the starting pose');
      const row2 = el('div', 'lab-btns', h);
      const follow = btn(row2, 'follow the target', () => { solver.follow = !solver.follow; follow.classList.toggle('on', solver.follow); }, 'When the target moves, start stepping');
      follow.classList.toggle('on', solver.follow);
      el('div', 'rl-iter', h);
    });
    const run = host.querySelector('.rl-run');
    run.textContent = solver.timer ? 'pause' : 'run';
    run.classList.toggle('on', !!solver.timer);
    const A = solver.angles;
    host.querySelector('.rl-iter').textContent = `pose θ = (${A.map((a) => f(wrap180(a), 1)).join(', ')}) degrees; iteration ${solver.steps}${kind === 'ccd' ? `, next joint ${solver.joint + 1}` : ''}`;
  };

  const solverStatus = (kind, m, error) => {
    const dist = norm([m.target.x, m.target.y, 0]);
    const reachable = dist <= REACH + 1e-9;
    if (solver.stopped === 'reached') return { text: `Reached: the tip is within ${TOLERANCE} of the target after ${solver.steps} steps (error ${f(error, 4)}). Run plays it again; restart goes back.`, tone: 'ok' };
    if (solver.stopped && !reachable) return { text: `Out of reach: the target is ${f(dist - REACH, 3)} beyond the reach ${f(REACH)}. The arm stretches toward it and stays ${f(error, 3)} short.`, tone: 'warn' };
    if (solver.stopped === 'singular') return { text: 'Singular: all the Jacobian\'s columns point the same way, so no change of angles moves the tip along the arm. The step is zero.', tone: 'warn' };
    if (solver.stopped === 'stalled' || solver.stopped === 'budget') return { text: `Stopped after ${solver.steps} steps, ${f(error, 4)} from the target.`, tone: 'warn' };
    if (solver.timer) return { text: `Stepping: iteration ${solver.steps}, error ${f(error, 4)}.`, tone: 'info' };
    return { text: reachable ? `Ready: ${f(error, 3)} from the target. Press step.` : `The target is ${f(dist - REACH, 3)} beyond the reach ${f(REACH)}: no pose can reach it.`, tone: reachable ? 'info' : 'warn' };
  };
  const errorChart = (kind, error) => {
    const e = solver.errors;
    const xmax = Math.max(8, e.length - 1);
    return { curve: 'error |target − tip|', x: [0, xmax], y: [0, Math.max(0.5, e[0] * 1.35)], xLabel: kind === 'ccd' ? 'joint rotations' : 'steps', at: e.length - 1, atY: error, series: [{ color: COL.red, fn: (x) => {
      const i = Math.min(e.length - 1, Math.floor(x)), j = Math.min(e.length - 1, i + 1);
      return x > e.length - 1 ? NaN : e[i] + (e[j] - e[i]) * (x - i);
    } }] };
  };
  const iterKeys = { J1: BONE[0], J2: BONE[1], J3: BONE[2], J4: BONE[3] };
  const drawIter = (v, m, r, ghost) => {
    S.begin();
    v.circle(V(0, 0, 0), V(0, 0, 1), REACH, COL.gray, { k: 'reach' });
    if (!r.animating) drawBones(v, ghost.joints, ghost.tip, { ghost: true });   // the next step's pose, faint; hidden while a step moves
    drawBones(v, r.joints, r.now, { keys: ['J1', 'J2', 'J3', 'J4'], r: 0.045 });
    if (solver.trail.length > 1) v.poly(solver.trail.map(P), COL.cyan, { k: 'trail' });
    v.point(P(r.now), COL.gold, { r: 0.05, k: 'tip' });
    v.dashed(P(r.now), V(m.target.x, m.target.y, 0), COL.red, { k: 'err' });
  };

  const SOLVER_INIT = { target: [1, 0.6, 0], lambda: 0.3 };   // a target the solvers need several steps for
  const ccdView = {
    id: 'ccd', topic: 'ik', label: 'cyclic coordinate descent', group: 'iter', home: HOME_IK, grid: 'xy', axes: false, inputTitle: 'Target',
    init: SOLVER_INIT, keys: iterKeys,
    handles: [{ id: 'target', label: 'p', color: COL.gold, fixed: 'z', anchor: 'ar' }],
    presets: [
      { label: 'start over', run: (m) => { solver.reset(m); } },
      { label: 'a near target (1, 0.6)', run: (m) => { m.target.set(1, 0.6, 0); solver.reset(m); } },
      { label: 'a far target (2.4, 1.2)', run: (m) => { m.target.set(2.4, 1.2, 0); solver.reset(m); } },
      { label: 'behind the base (-1.5, -0.5)', run: (m) => { m.target.set(-1.5, -0.5, 0); solver.reset(m); } },
      { label: 'out of reach (3.5, 1.5)', run: (m) => { m.target.set(3.5, 1.5, 0); solver.reset(m); } },
    ],
    regions: ['Cyclic coordinate descent: one joint', 'Cyclic coordinate descent: a sweep'],
    enter(m) { solver.reset(m); },
    leave() { solver.stop(); },
    edited(m, ctx) { if (solver.retarget(m) && solver.follow) solver.start('ccd', ctx); },
    run(m) {
      const t = tgt(m);
      const now = RL.forwardKinematics(ARM, solver.shown());
      const next = RL.ccdJoint(ARM, solver.angles, t, solver.joint);
      const sweep = RL.ccdSweep(ARM, solver.angles, t);
      const after = RL.forwardKinematics(ARM, next.angles);
      return { ...next, deltas: sweep.deltas, errors: sweep.errors, now: now.tip, joints: now.joints, ghost: { joints: after.joints, tip: after.tip }, current: solver.angles, joint: solver.joint, sweepAngles: sweep.angles, animating: solver.animating() };
    },
    draw(v, m, r) {
      drawIter(v, m, r, r.ghost);
      if (r.animating) return;
      const j = r.joint;
      v.point(P(r.pivot), COL.white, { r: 0.11, k: 'joint' });
      v.label(`joint ${j + 1}`, P(r.pivot), COL.white, 'bl', 'joint');
      const unitEnd = P(r.toEnd), unitTarget = P(r.toTarget);
      v.arrow(P(r.pivot), P(r.pivot).add(unitEnd), COL.cyan, { k: 'toEnd', r: 0.012, hr: 0.045, head: 0.14 });
      v.arrow(P(r.pivot), P(r.pivot).add(unitTarget), COL.gold, { k: 'toTarget', r: 0.012, hr: 0.045, head: 0.14 });
      if (Math.abs(r.delta) > 0.3) v.arc(P(r.pivot), unitEnd, unitTarget, Math.min(0.6, 0.4 * Math.min(unitEnd.length(), unitTarget.length())), COL.pink, { k: 'delta', label: `Δθ ${deg(r.delta, 1)}` });
    },
    explain(m, r) {
      const error = solver.errors[solver.errors.length - 1];
      const sweeps = Math.floor(solver.steps / ARM.length);
      return {
        hud: `joint ${r.joint + 1}: {delta|Δθ} = ${deg(r.delta)}; error {err|${f(error, 3)}}`,
        rows: [
          `next joint: ${r.joint + 1} of ${ARM.length}, at the pivot ${p2(r.pivot)}`,
          `{toEnd} = tip − pivot = ${p2(r.toEnd)}, {toTarget} = target − pivot = ${p2(r.toTarget)}`,
          `{delta|Δθ} = the signed angle from {toEnd} to {toTarget} = {delta|${deg(r.delta, 2)}}`,
          `turning joint ${r.joint + 1} by Δθ: the error goes {err|${f(error, 3)}} → ${f(r.error, 3)}`,
          `a sweep from here (joints ${ARM.length} down to 1): errors ${r.errors.map((e) => f(e, 3)).join(', ')}`,
          `iteration ${solver.steps} (${sweeps} full ${sweeps === 1 ? 'sweep' : 'sweeps'}), error ${f(error, 4)}`,
        ],
        status: solverStatus('ccd', m, error),
        chart: errorChart('ccd', error),
        values: [['θ₁, θ₂', `${f(wrap180(solver.angles[0]), 1)}°, ${f(wrap180(solver.angles[1]), 1)}°`], ['θ₃, θ₄', `${f(wrap180(solver.angles[2]), 1)}°, ${f(wrap180(solver.angles[3]), 1)}°`], ['iterations', String(solver.steps)], ['error', f(error, 4), 'err'], ['|target|', f(norm(tgt(m)), 3), 'target'], ['reach', f(REACH), 'reach']],
        fact: 'Cyclic coordinate descent (CCD; Wang and Chen, 1991) turns one joint at a time, from the joint nearest the tip (the end effector) back to the base: one sweep. At each joint, the arrows to the tip and to the target make an angle; turning the joint by it swings the tip onto the line toward the target. No turn can increase the error, and sweeps repeat until the error is under the tolerance or the step budget runs out. It needs no matrix, and a joint limit is one clamp per turn; but the joints nearest the tip do most of the turning, so a long chain curls.',
      };
    },
    panel: iterPanel('ccd'), panelTitle: 'Step the solver',
  };

  const jacView = {
    id: 'jac', topic: 'ik', label: 'Jacobian', group: 'iter', home: HOME_IK, grid: 'xy', axes: false, inputTitle: 'Target and damping',
    init: SOLVER_INIT, keys: iterKeys,
    handles: [{ id: 'target', label: 'p', color: COL.gold, fixed: 'z', anchor: 'ar' }],
    params: [{ id: 'lambda', label: 'λ damping', min: 0, max: 1, step: 0.05 }],
    presets: [
      { label: 'start over', run: (m) => { solver.reset(m); } },
      { label: 'a near target (1, 0.6)', run: (m) => { m.target.set(1, 0.6, 0); solver.reset(m); } },
      { label: 'a far target (2.4, 1.2)', run: (m) => { m.target.set(2.4, 1.2, 0); solver.reset(m); } },
      { label: 'straight arm: singular', run: (m) => { m.target.set(2.2, 0, 0); m.lambda = 0; solver.pose([0, 0, 0, 0], m); } },
      { label: 'nearly straight, undamped', run: (m) => { m.target.set(2.2, 0, 0); m.lambda = 0; solver.pose([3, 3, 3, 3], m); } },
      { label: 'nearly straight, λ = 0.5', run: (m) => { m.target.set(2.2, 0, 0); m.lambda = 0.5; solver.pose([3, 3, 3, 3], m); } },
    ],
    regions: ['Jacobian: the columns', 'Jacobian: a pseudo-inverse step'],
    enter(m) { solver.reset(m); },
    leave() { solver.stop(); },
    edited(m, ctx) { if (solver.retarget(m) && solver.follow) solver.start('jacobian', ctx); },
    run(m) {
      const t = tgt(m);
      const now = RL.forwardKinematics(ARM, solver.shown());
      const jac = RL.jacobian(ARM, solver.angles);
      const step = RL.pseudoInverseStep(ARM, solver.angles, t, m.lambda, RL.MAX_STEP);
      const after = RL.forwardKinematics(ARM, step.angles);
      return { ...jac, ...step, now: now.tip, joints: now.joints, ghost: { joints: after.joints, tip: after.tip }, current: solver.angles, animating: solver.animating() };
    },
    draw(v, m, r) {
      drawIter(v, m, r, r.ghost);
      if (r.animating) return;
      const twenty = 20 * RL.DEG;
      r.columns.forEach((c, j) => {
        const from = P(r.now), to = from.clone().add(V(c[0] * twenty, c[1] * twenty, 0));
        v.arrow(from, to, BONE[j], { k: `J${j + 1}`, r: 0.016, hr: 0.05, head: 0.15, label: `J${j + 1}`, anchor: 'a' });
      });
      v.arrow(P(r.now), P(r.now).add(V(r.goal[0], r.goal[1], 0)), COL.white, { k: 'goal', r: 0.018, hr: 0.06, head: 0.16, label: 'step', anchor: 'br' });
    },
    explain(m, r) {
      const error = solver.errors[solver.errors.length - 1];
      const lam = m.lambda;
      const size = Math.hypot(r.error[0], r.error[1]);
      return {
        hud: r.singular ? `{det|det(J Jᵀ)} = ${f(r.det, 4)}: singular, the step is zero` : `{delta|Δθ} = Jᵀ (J Jᵀ + λ² I)⁻¹ e = (${r.deltas.map((d) => f(d, 1)).join(', ')})°`,
        rows: [
          `{J|columns of J} = z × (tip − joint) per radian: ${r.columns.map((c, j) => `J${j + 1} ${p2(c)}`).join('; ')}`,
          `J Jᵀ = [a b; b c] = [${f(r.a, 3)} ${f(r.b, 3)}; ${f(r.b, 3)} ${f(r.c, 3)}], {det|det} = ${f(r.det, 4)}`,
          `e = target − tip = ${p2(r.error, 3)}, length ${f(size, 3)}${size > RL.MAX_STEP ? `, limited to ${RL.MAX_STEP}: {goal|goal} = ${p2(r.goal, 3)}` : ''}`,
          `{lambda|λ} = ${f(lam)}: the damped J Jᵀ + λ² I has det ${f(r.dampedDet, 4)}${r.singular ? ' (zero: no step)' : ''}`,
          `{delta|Δθ} = Jᵀ (J Jᵀ + λ² I)⁻¹ {goal|goal} = (${r.deltas.map((d) => f(d, 1)).join(', ')})°`,
          `the tip after this step: error {err|${f(error, 3)}} → ${f(r.remaining, 3)}; iteration ${solver.steps}`,
        ],
        status: solverStatus('jacobian', m, error),
        chart: errorChart('jacobian', error),
        values: [['θ₁, θ₂', `${f(wrap180(solver.angles[0]), 1)}°, ${f(wrap180(solver.angles[1]), 1)}°`], ['θ₃, θ₄', `${f(wrap180(solver.angles[2]), 1)}°, ${f(wrap180(solver.angles[3]), 1)}°`], ['largest |Δθ|', deg(Math.max(...r.deltas.map(Math.abs)), 1), 'delta'], ['det(J Jᵀ)', f(r.det, 4), 'det'], ['iterations', String(solver.steps)], ['error', f(error, 4), 'err']],
        fact: 'Each column of J is how fast the tip moves when one joint turns (the arrows are a 20 degree turn of each joint). The pseudo-inverse picks the smallest change of angles that moves the tip by the goal, to first order. With a straight arm every column is perpendicular to it, so nothing moves along it; damping (Wampler 1986, Nakamura and Hanafusa 1986) trades accuracy for a step that stays small near that case.',
      };
    },
    panel: iterPanel('jacobian'), panelTitle: 'Step the solver',
  };

  // ------------------------------------------------------------ Skinning: linear blend, two or three bones
  function lbsView(bones) {
    const tube = bones === 2 ? TUBE2 : TUBE3;
    const lengths = bones === 2 ? [1, 1] : [1, 1, 1];
    const id = bones === 2 ? 'lbs' : 'lbs3';
    const three = bones === 3;
    const jointsX = (m) => { const out = []; for (let i = 1; i < bones; i++) out.push(i + m.shift); return out; };
    return {
      id, topic: 'skin', label: three ? 'linear blend, 3 bones' : 'linear blend', home: three ? { eye: [1.5, 1.2, 6.4], target: [1.5, 0.5, 0] } : HOME_TUBE, grid: 'xy', axes: false, inputTitle: 'Pose, weights and the vertex',
      init: three ? { a: 25, b: 35, c: -50, width: 0.5, shift: 0, v: [2, 0.1, 0], bone: 2 } : { a: 30, b: 45, width: 0.6, shift: 0.5, v: [1.5, 0.1, 0], bone: 1 },
      handles: [{ id: 'v', label: 'v', color: COL.pink, fixed: 'z', anchor: 'ar' }],
      params: [
        { id: 'a', label: 'bone A', min: -90, max: 90, step: 0.1, unit: '°' },
        { id: 'b', label: 'bone B (local)', min: -180, max: 180, step: 0.1, unit: '°' },
        ...(three ? [{ id: 'c', label: 'bone C (local)', min: -180, max: 180, step: 0.1, unit: '°' }] : []),
        { id: 'width', label: 'ramp width', min: 0.1, max: 1, step: 0.05 },
        { id: 'shift', label: 'ramp shift', min: -0.5, max: 0.5, step: 0.05 },
      ],
      presets: three ? [
        { label: 'straight', set: { a: 0, b: 0, c: 0 } },
        { label: 'a finger', set: { a: 25, b: 35, c: -50 } },
        { label: 'the end bone twisting back', set: { a: 0, b: 0, c: 150, v: [2.1, 0.3, 0] } },
      ] : [
        { label: 'the lecture\'s vertex', set: { a: 30, b: 45, width: 0.6, shift: 0.5, v: [1.5, 0.1, 0] } },
        { label: 'bind pose', set: { a: 0, b: 0 } },
        { label: 'candy wrapper: 90°', set: { a: 0, b: 90, width: 0.4, shift: 0, v: [1, 0.32, 0] } },
        { label: 'candy wrapper: 180°', set: { a: 0, b: 180, width: 0.4, shift: 0, v: [1, 0.32, 0] } },
        { label: 'rigid: weight 1 on B', set: { a: 30, b: 45, width: 0.1, shift: -0.45, v: [1.5, 0.1, 0] } },
      ],
      regions: ['Skinning: bind pose and inverse bind matrices', 'Skinning: one vertex', 'Weights painted by falloff', 'Skinning: a mesh'],
      run(m) {
        const angles = three ? [m.a, m.b, m.c] : [m.a, m.b];
        const bind = RL.forwardKinematics(lengths, zeros(bones));
        const pose = RL.forwardKinematics(lengths, angles);
        const sm = RL.skinningMatrices(bind.worlds, pose.worlds);
        const jx = jointsX(m);
        const painted = RL.paintWeights(tube.positions, jx, m.width);
        const mesh = RL.skinMesh(tube.positions, painted.weights, sm.inverseBinds, pose.worlds);
        const probe = [m.v.x, m.v.y, m.v.z];
        const pw = RL.paintWeights([probe], jx, m.width).weights[0];
        const sv = RL.skinVertex(probe, pw, sm.inverseBinds, pose.worlds);
        return { ...sm, ...mesh, weights: painted.weights, local: sv.local, candidates: sv.candidates, blended: sv.blended, weightSum: sv.weightSum, probe, pw,
          bindWorlds: bind.worlds, poseWorlds: pose.worlds, poseJoints: pose.joints, poseTip: pose.tip, bindJoints: bind.joints, jx };
      },
      draw(v, m, r) {
        S.begin();
        S.show('main', { positions: r.posed, tris: tube.tris, colors: look.weights ? weightColors(r.weights) : null, glass: look.glass, wire: look.wire });
        if (look.rest) S.show('rest', { positions: tube.positions, tris: tube.tris, ghost: true });
        for (let i = 0; i < bones; i++) {
          const a = r.poseJoints[i], b = i + 1 < bones ? r.poseJoints[i + 1] : r.poseTip;
          v.bar(P(a), P(b), BONE[i], { k: BONE_KEY[i], r: 0.028 });
          v.point(P(a), BONE[i], { r: 0.06, k: BONE_KEY[i] });
        }
        const bl = P(r.blended);
        r.candidates.forEach((c, i) => {
          if (r.pw[i] < 1e-9) return;
          v.dashed(P(c), bl, BONE[i], { k: BONE_KEY[i] });
          v.point(P(c), BONE[i], { r: 0.05, k: BONE_KEY[i], label: `${BONE_NAME[i]}`, anchor: 'ar' });
        });
        v.point(bl, COL.white, { r: 0.075, k: 'vp', label: "v′", anchor: 'ar' });
      },
      explain(m, r) {
        const joint = r.poseJoints[1];
        const rest = norm(sub(r.probe, r.bindJoints[1]));
        const posed = norm(sub(r.blended, joint));
        const rows = [`{v} = ${p3(r.probe, 3)}, weights ${r.pw.map((w, i) => `{${WEIGHT_KEY[i]}|w${BONE_NAME[i]}} = ${f(w, 3)}`).join(', ')}, sum ${f(r.weightSum, 3)}`];
        r.local.forEach((l, i) => {
          if (r.pw[i] < 1e-9) { rows.push(`{${BONE_KEY[i]}|${BONE_NAME[i]}}: weight 0, not used`); return; }
          rows.push(`{${BONE_KEY[i]}|${BONE_NAME[i]}}: B${BONE_NAME[i]}⁻¹ v = ${p3(l, 3)}, then W${BONE_NAME[i]} of that = ${p3(r.candidates[i], 3)}`);
        });
        rows.push(`{vp|v′} = ${r.pw.map((w, i) => (w < 1e-9 ? null : `${f(w, 3)} ${p3(r.candidates[i], 3)}`)).filter(Boolean).join(' + ')} = {vp|${p3(r.blended, 3)}}`);
        rows.push(`distance from the joint of B: ${f(rest, 3)} at rest, {shrink|${f(posed, 3)}} posed`);
        const rigid = r.pw.some((w) => w > 1 - 1e-9);
        const bend = Math.abs(m.b) + (three ? Math.abs(m.c) : 0);
        return {
          hud: `{vp|v′} = Σ w W B⁻¹ {v} = ${p2(r.blended, 3)}`,
          rows,
          status: rigid ? { text: 'All the weight is on one bone: the vertex moves rigidly with it.', tone: 'info' }
            : { text: `The blend is between the rigid answers, ${pct(1 - posed / Math.max(rest, 1e-9))} ${posed <= rest ? 'closer to' : 'farther from'} the joint of B than at rest.`, tone: bend > 120 ? 'warn' : 'info' },
          chart: { curve: 'weights along the tube', x: [0, tube.positions[tube.positions.length - 3][0]], y: [0, 1.4], xLabel: 'x along the tube', at: r.probe[0], atY: r.pw[1],
            series: lengths.map((_, i) => ({ color: BONE[i], fn: (x) => RL.paintWeights([[x, 0, 0]], r.jx, m.width).weights[0][i] })) },
          values: [
            ['W_B (joint of B)', p2(r.poseJoints[1], 3), 'bB'], ['weights sum', f(r.weightSum, 3)],
            ['rest distance', f(rest, 3), 'rest'], ['posed distance', f(posed, 3), 'shrink'],
          ],
          fact: 'The bind pose is the mesh as modeled, with each bone\'s world matrix B recorded. B⁻¹ takes a vertex into the bone\'s own frame; W carries it back out, posed. Weights are painted by a smooth ramp across each joint, and drag the pink point or click the skin to move v.',
        };
      },
      panel(host, m, r, ctx) {
        once(host, id, (h) => {
          choose(h, 'bone', BONE_NAME.slice(0, bones).map((n, i) => [i, n]), () => ctx.state().bone, (x) => { ctx.state().bone = x; }, ctx);
          el('div', 'rl-mats', h);
          lookButtons(h, ctx, ['weights', 'glass', 'wire', 'rest']);
        });
        host.querySelectorAll('[data-value]').forEach((b) => b.classList.toggle('on', Number(b.dataset.value) === m.bone));
        const i = Math.min(m.bone, bones - 1);
        const n = BONE_NAME[i];
        host.querySelector('.rl-mats').innerHTML = `<div class="rl-eq">${matHtml(r.poseWorlds[i], `W<sub>${n}</sub>`)}<span class="rl-op">×</span>${matHtml(r.inverseBinds[i], `B<sub>${n}</sub>⁻¹`)}<span class="rl-op">=</span>${matHtml(r.skins[i], `K<sub>${n}</sub> = W B⁻¹`)}</div>`;
      },
      panelTitle: 'Bind pose and skinning matrices',
      onPick(ray, e, ctx) {
        const r = ctx.lastRun;
        if (!r) return;
        const at = nearestToRay(r.posed, ray);
        if (at < 0) return;
        const m = ctx.state();
        m.v.set(tube.positions[at][0], tube.positions[at][1], tube.positions[at][2]);
        ctx.update();
      },
      setup(ctx) { ctx.lastRun = null; },
    };
  }
  const lbsTwo = lbsView(2), lbsThree = lbsView(3);
  for (const vw of [lbsTwo, lbsThree]) {
    const run = vw.run;
    vw.run = function wrapped(m, ctx) { const r = run(m, ctx); if (ctx) ctx.lastRun = r; return r; };
  }

  // ------------------------------------------------------------ Skinning: the candy wrapper against dual quaternions
  const wrapperView = {
    id: 'wrapper', topic: 'skin', label: 'candy wrapper', home: HOME_WRAP, inputTitle: 'Twist of bone B', grid: 'none', axes: false,
    init: { twist: 180, width: 0.6 },
    params: [
      { id: 'twist', label: 'twist about the axis', min: 0, max: 360, step: 1, unit: '°', play: true },
      { id: 'width', label: 'ramp width', min: 0.1, max: 1, step: 0.05 },
    ],
    presets: [
      { label: 'no twist', set: { twist: 0, width: 0.6 } },
      { label: 'quarter turn (90°)', set: { twist: 90, width: 0.6 } },
      { label: 'half turn (180°)', set: { twist: 180, width: 0.6 } },
      { label: 'three quarters (270°)', set: { twist: 270, width: 0.6 } },
      { label: 'full turn (360°)', set: { twist: 360, width: 0.6 } },
    ],
    regions: ['Candy wrapper: a twisted joint', 'Candy wrapper: measuring the collapse', 'Candy wrapper: the closed form', 'Dual quaternions: skin a vertex'],
    run(m) {
      const bones = RL.twistBones(m.twist);
      const sm = RL.skinningMatrices(bones.binds, bones.poses);
      const painted = RL.paintWeights(WRAP.positions, [1], m.width);
      const lbs = RL.skinMesh(WRAP.positions, painted.weights, sm.inverseBinds, bones.poses);
      const dqPosed = [];
      for (let i = 0; i < WRAP.positions.length; i++) dqPosed.push(RL.skinVertexDQ(WRAP.positions[i], painted.weights[i], sm.skins).blended);
      const sample = RL.skinVertexDQ(WRAP.positions[WRAP_RING], painted.weights[WRAP_RING], sm.skins);
      const mLbs = RL.measureCollapse(WRAP.positions, lbs.posed, WRAP.tris);
      const mDq = RL.measureCollapse(WRAP.positions, dqPosed, WRAP.tris);
      const closed = RL.twistRatio(m.twist, painted.weights[WRAP_RING][1]);
      const ringRadius = (posed) => { let s = 0; for (let i = 0; i < 16; i++) s += Math.hypot(posed[WRAP_RING + i][1], posed[WRAP_RING + i][2]); return s / 16; };
      return { ...bones, ...mLbs, ...sample, radius: closed.radius, area: closed.area, weights: painted.weights, posedLbs: lbs.posed, posedDq: dqPosed, mDq,
        measuredLbs: ringRadius(lbs.posed) / 0.4, measuredDq: ringRadius(dqPosed) / 0.4, wRing: painted.weights[WRAP_RING][1] };
    },
    draw(v, m, r) {
      S.begin();
      const colors = look.weights ? weightColors(r.weights) : null;
      S.show('main', { positions: r.posedLbs, tris: WRAP.tris, colors, glass: look.glass, wire: look.wire, offset: [0, 0.85, 0] });
      S.show('second', { positions: r.posedDq, tris: WRAP.tris, colors, glass: look.glass, wire: look.wire, offset: [0, -0.85, 0] });
      for (const [posed, dy, color, name, k] of [[r.posedLbs, 0.85, COL.red, 'linear blend', 'lbs'], [r.posedDq, -0.85, COL.green, 'dual quaternion', 'dq']]) {
        const ring = [];
        for (let i = 0; i < 16; i++) ring.push(V(posed[WRAP_RING + i][0], posed[WRAP_RING + i][1] + dy, posed[WRAP_RING + i][2]));
        v.poly(ring, color, { closed: true, k });
        v.circle(V(1, dy, 0), V(1, 0, 0), 0.4, COL.dim, { k: 'rest' });
        v.bar(V(0, dy, 0), V(2, dy, 0), COL.dim, { r: 0.012, k: 'rest' });
        v.label(name, V(-0.08, dy, 0), color, 'l', k);
      }
    },
    explain(m, r) {
      const w = r.wRing;
      const ok = (x) => f(x, 3);
      return {
        hud: `{twist|twist} ${deg(m.twist, 0)}: ring radius {lbs|${ok(r.measuredLbs)}} (linear), {dq|${ok(r.measuredDq)}} (dual quaternion)`,
        rows: [
          `vertex at radius r, weight w = ${f(w, 2)} on the twisted bone B: {lbs|v′} = (1 − w) v + w R v`,
          `{closed|closed form}: |v′| / r = √((1 − w)² + w² + 2 w (1 − w) cos θ) = {closed|${ok(r.radius)}} at θ = ${deg(m.twist, 0)}; area × ${ok(r.area)}`,
          `measured on the mesh: the ring at the joint has radius ${ok(r.measuredLbs)} r (linear blend), ${ok(r.measuredDq)} r (dual quaternion)`,
          `volume of the tube: {vol|rest ${ok(r.restVolume)}}, linear blend ${ok(r.posedVolume)} (${pct(r.ratio)}), collapse {lbs|${pct(r.collapse)}}`,
          `dual quaternion: volume ${ok(r.mDq.posedVolume)} (${pct(r.mDq.ratio)}), collapse {dq|${pct(r.mDq.collapse)}}`,
          `dual quaternion of a ring vertex: real (${r.blend.slice(0, 4).map((x) => f(x, 3)).join(', ')}), a unit quaternion`,
        ],
        status: r.measuredLbs < 0.25 ? { text: `Collapsed: the linear blend's ring at the joint has radius ${ok(r.measuredLbs)} of its rest value, and the tube has lost ${pct(r.collapse, 0)} of its volume.`, tone: 'bad' }
          : r.collapse > 0.02 ? { text: `The linear blend has lost ${pct(r.collapse)} of the volume; the dual quaternion blend has lost ${pct(Math.abs(r.mDq.collapse))}.`, tone: 'warn' }
            : { text: 'No visible loss of volume.', tone: 'ok' },
        chart: { curve: 'ring radius at the joint', x: [0, 360], y: [0, 1.5], xLabel: 'twist (degrees)', at: m.twist, atY: r.radius,
          series: [{ color: COL.red, fn: (x) => RL.twistRatio(x, w).radius }, { color: COL.green, fn: () => 1 }] },
        values: [['ring radius, linear', ok(r.measuredLbs), 'lbs'], ['ring radius, dual quat.', ok(r.measuredDq), 'dq'], ['closed form', ok(r.radius), 'closed'], ['volume, linear', pct(r.ratio), 'vol'], ['volume, dual quat.', pct(r.mDq.ratio), 'dq']],
        fact: 'Linear blending averages the two bones\' rotated copies of a vertex, so a vertex on the joint\'s cross-section lands closer to the axis. Dual quaternion skinning (Kavan, Collins, Zara and O\'Sullivan, 2007) blends rotations as unit dual quaternions, so the skin stays a rigid transform of the vertex.',
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'wrapper', (h) => { lookButtons(h, ctx, ['weights', 'glass', 'wire']); });
    },
    panelTitle: 'Drawing',
  };

  // ------------------------------------------------------------ Skinning: blend shapes
  const shapesView = {
    id: 'shapes', topic: 'skin', label: 'blend shapes', home: HOME_SHAPES, inputTitle: 'Shape weights', grid: 'none', axes: false,
    init: { w1: 0.8, w2: 0.5, sel: 12 * 16 + 2 },
    params: [
      { id: 'w1', label: 'w₁ bulge', min: -0.5, max: 1.5, step: 0.05 },
      { id: 'w2', label: 'w₂ flatten', min: -0.5, max: 1.5, step: 0.05 },
    ],
    presets: [
      { label: 'neutral', set: { w1: 0, w2: 0 } }, { label: 'bulge', set: { w1: 1, w2: 0 } }, { label: 'flatten', set: { w1: 0, w2: 1 } },
      { label: 'both at 1', set: { w1: 1, w2: 1 } }, { label: 'beyond 1', set: { w1: 1.5, w2: 0 } },
    ],
    regions: ['Blend shapes: the targets', 'Blend shapes: the weighted sum'],
    run(m) {
      const sel = Math.max(0, Math.min(SHAPES.positions.length - 1, Math.round(m.sel)));
      const mix = RL.blendShapes(SHAPES.positions, [BULGE, FLATTEN], [m.w1, m.w2]);
      const size = RL.blendShapes(SHAPES.positions, [BULGE, FLATTEN], [1, 1]);
      return { ...mix, sel, offsets: [BULGE, FLATTEN], full: size.moved, neutral: SHAPES.positions[sel] };
    },
    draw(v, m, r) {
      S.begin();
      const heat = new Float32Array(3 * r.posed.length);
      for (let i = 0; i < r.posed.length; i++) {
        const k = Math.min(1, norm(sub(r.posed[i], SHAPES.positions[i])) / 0.3);
        heat[3 * i] = 0.36 + 0.64 * k; heat[3 * i + 1] = 0.55 + 0.1 * k - 0.2 * k * k; heat[3 * i + 2] = 0.82 - 0.6 * k;
      }
      S.show('main', { positions: r.posed, tris: SHAPES.tris, colors: heat, glass: shapeLook.glass, wire: shapeLook.wire });
      if (shapeLook.rest) S.show('rest', { positions: SHAPES.positions, tris: SHAPES.tris, ghost: true });
      const n = P(r.neutral), a = n.clone().add(P(BULGE[r.sel]).multiplyScalar(m.w1)), b = a.clone().add(P(FLATTEN[r.sel]).multiplyScalar(m.w2));
      v.point(n, COL.gray, { r: 0.04, k: 'neutral', label: 'neutral', anchor: 'br' });
      v.arrow(n, a, COL.a, { k: 'shape1', r: 0.012, hr: 0.04, head: 0.1 });
      v.arrow(a, b, COL.b, { k: 'shape2', r: 0.012, hr: 0.04, head: 0.1 });
      v.point(b, COL.white, { r: 0.05, k: 'vp', label: 'posed', anchor: 'ar' });
    },
    explain(m, r) {
      const n = r.neutral, o1 = BULGE[r.sel], o2 = FLATTEN[r.sel];
      const posed = r.posed[r.sel];
      return {
        hud: `posed = neutral + {shape1|${f(m.w1)}} offset₁ + {shape2|${f(m.w2)}} offset₂`,
        rows: [
          `vertex ${r.sel}: neutral ${p3(n, 3)}`,
          `{shape1|offset₁ (bulge)} = ${p3(o1, 3)}, {shape2|offset₂ (flatten)} = ${p3(o2, 3)}`,
          `posed = ${p3(n, 3)} + ${f(m.w1)} ${p3(o1, 3)} + ${f(m.w2)} ${p3(o2, 3)} = {vp|${p3(posed, 3)}}`,
          `the largest move of any vertex: ${f(r.moved, 3)}; both shapes at weight 1 together: ${f(r.full, 3)}`,
        ],
        status: Math.abs(m.w1) > 1 || Math.abs(m.w2) > 1 ? { text: 'A weight beyond 1 pushes the shape past the one that was modeled.', tone: 'warn' }
          : m.w1 * m.w2 !== 0 ? { text: 'Both shapes move the same vertices, so their offsets add to a shape neither modeled.', tone: 'info' } : { text: 'One shape at a time: the surface is the neutral shape plus that shape\'s offsets.', tone: 'info' },
        values: [['w₁ bulge', f(m.w1), 'shape1'], ['w₂ flatten', f(m.w2), 'shape2'], ['vertex', String(r.sel)], ['moved', f(norm(sub(posed, n)), 3), 'vp']],
        fact: 'A blend shape stores an offset for every vertex. The weighted sum is the skinning sum of the previous views applied to positions instead of matrices. Color shows how far each vertex moved. Click the skin to follow another vertex.',
      };
    },
    panel(host, m, r, ctx) { once(host, 'shapes', (h) => { lookButtons(h, ctx, ['glass', 'wire', 'rest'], shapeLook); }); },
    panelTitle: 'Drawing',
    onPick(ray, e, ctx) {
      const r = ctx.lastRun;
      if (!r) return;
      const at = nearestToRay(r.posed, ray);
      if (at < 0) return;
      ctx.state().sel = at;
      ctx.update();
    },
    setup(ctx) { ctx.lastRun = null; },
  };
  const shapesRun = shapesView.run;
  shapesView.run = function wrapped(m, ctx) { const r = shapesRun(m, ctx); if (ctx) ctx.lastRun = r; return r; };

  // ------------------------------------------------------------ Motion: a blend tree over two looping clips, joint by joint, with slerp
  // One stride of each clip, keyed every eighth of the stride from the heel strike: [hip, knee] flexion in degrees, the hip forward of
  // vertical (the character faces left). The keys at phase 7/8, late in the swing, are the supplement's worked frame: knee 20° and 60°.
  const WALK_KEYS = [[28, 5], [22, 18], [10, 10], [-2, 5], [-10, 12], [0, 45], [22, 58], [30, 20]];
  const RUN_KEYS = [[38, 22], [25, 40], [8, 28], [-8, 25], [5, 70], [30, 100], [48, 95], [50, 60]];
  const CLIPS = [1.5, 4], STRIDE = [1.1, 0.7], LEG = [0.45, 0.45], FLOOR = -0.92, WORKED = 0.875;
  const legAngles = (flexion) => [-90 - flexion[0], flexion[1]];
  const strideTime = (t) => (1 - t) * STRIDE[0] + t * STRIDE[1];
  const blendAt = (phase, t) => {
    const walk = legAngles(RL.sampleClip(WALK_KEYS, phase)), run = legAngles(RL.sampleClip(RUN_KEYS, phase));
    return { walk, run, ...RL.blendPose(walk, run, t) };
  };
  const blendView = {
    id: 'blend', topic: 'motion', label: 'blend tree', home: HOME_LEG, inputTitle: 'Speed and stride', grid: 'xy', axes: false,
    init: { speed: 2.5, phase: WORKED },
    params: [
      { id: 'speed', label: 'speed', min: 0, max: 5, step: 0.05 },
      { id: 'phase', label: 'phase of the stride', min: 0, max: 1, step: 0.005, play: 'loop', rate: (m) => 1 / strideTime(RL.blendTreeWeights(CLIPS, m.speed).t) },
    ],
    presets: [
      { label: 'the lecture\'s 2.5 m/s', set: { speed: 2.5, phase: WORKED } }, { label: 'walk clip (1.5)', set: { speed: 1.5 } }, { label: 'run clip (4)', set: { speed: 4 } },
      { label: 'slower than the walk', set: { speed: 0.5 } }, { label: 'faster than the run', set: { speed: 5 } },
    ],
    regions: ['Blend trees: sample a looping clip', 'Blend trees: weights from a parameter', 'Quaternions: slerp', 'Blend trees: blend a pose'],
    run(m) {
      const tree = RL.blendTreeWeights(CLIPS, m.speed);
      const near = blendAt(m.phase, tree.t), far = blendAt(m.phase + 0.5, tree.t);
      const qa = RL.quatFromAxisAngle([0, 0, 1], near.walk[1]), qb = RL.quatFromAxisAngle([0, 0, 1], near.run[1]);
      const mix = RL.quatSlerp(qa, qb, tree.t);
      const legs = { walk: RL.forwardKinematics(LEG, near.walk), run: RL.forwardKinematics(LEG, near.run), blend: RL.forwardKinematics(LEG, near.angles), far: RL.forwardKinematics(LEG, far.angles) };
      // the hip rides at the height that puts the lower of the blended feet on the floor
      const hipY = FLOOR - Math.min(legs.blend.tip[1], legs.far.tip[1]);
      return { ...tree, angles: near.angles, quaternions: near.quaternions, linear: near.linear, walkPose: near.walk, runPose: near.run, ...mix, qa, qb, legs, hipY, stride: strideTime(tree.t) };
    },
    draw(v, m, r) {
      S.begin();
      const at = (p) => V(p[0], p[1] + r.hipY, 0);
      v.poly([V(-1.2, FLOOR, 0), V(1.2, FLOOR, 0)], COL.gray, { k: 'floor' });
      const leg = (fk, color, rBar, rJoint, k) => {
        const pts = [[0, 0, 0], fk.joints[1], fk.tip];
        for (let i = 0; i < 2; i++) v.bar(at(pts[i]), at(pts[i + 1]), color, { k, r: rBar });
        v.point(at(pts[1]), color, { r: rJoint, k });
        v.point(at(pts[2]), color, { r: rJoint, k });
      };
      leg(r.legs.far, FAR_LEG, 0.04, 0.055, 'blend');   // the other leg, half a stride away, behind
      leg(r.legs.walk, COL.b, 0.02, 0.035, 'walk');
      leg(r.legs.run, COL.amber, 0.02, 0.035, 'run');
      leg(r.legs.blend, COL.green, 0.05, 0.07, 'blend');
      v.point(at([0, 0, 0]), COL.white, { r: 0.07, k: 'blend', label: 'hip', anchor: 'br' });
      v.label('walk', at(r.legs.walk.tip), COL.b, 'bl', 'walk');
      v.label('run', at(r.legs.run.tip), COL.amber, 'ar', 'run');
      v.label('blend', at(r.legs.blend.tip), COL.green, 'br', 'blend');
    },
    explain(m, r) {
      const knee = r.angles[1];
      const hip = (a) => deg(-(a[0] + 90));
      return {
        hud: `speed {speed|${f(m.speed)}} m/s, phase ${f(m.phase, 3)}: run weight {run|${f(r.t)}}, walk weight {walk|${f(1 - r.t)}}; knee {blend|${deg(knee)}}`,
        rows: [
          `{run|run weight} = (${f(m.speed)} − ${f(CLIPS[0])}) / (${f(CLIPS[1])} − ${f(CLIPS[0])}) = {run|${f(r.t, 3)}}, {walk|walk weight} = ${f(1 - r.t, 3)}${m.speed < CLIPS[0] || m.speed > CLIPS[1] ? ' (outside the clips: the end clip has all of it)' : ''}`,
          `both clips at phase ${f(m.phase, 3)} of the stride: knee {walk|${deg(r.walkPose[1])}} in the walk, {run|${deg(r.runPose[1])}} in the run, as quaternions {q|q_walk} = (0, 0, ${f(r.qa[2], 4)}, ${f(r.qa[3], 4)}), q_run = (0, 0, ${f(r.qb[2], 4)}, ${f(r.qb[3], 4)})`,
          `{slerp|slerp}: Ω = acos(q_walk · q_run) = ${deg(r.omega * 180 / Math.PI)}; weights sin((1 − t) Ω) / sin Ω = ${f(r.w0, 3)} and sin(t Ω) / sin Ω = ${f(r.w1, 3)}`,
          `{q|q} = (0, 0, ${f(r.q[2], 4)}, ${f(r.q[3], 4)}): the knee angle 2 atan2(q_z, q_w) = {blend|${deg(knee)}}`,
          `blending the angles directly gives ${deg(r.linear[1])}; about one shared axis, slerp is linear in the angle`,
          `hip, forward of vertical: {walk|${hip(r.walkPose)}} in the walk, {run|${hip(r.runPose)}} in the run, {blend|${hip(r.angles)}} blended`,
          `one stride: ${f(STRIDE[0])} s in the walk, ${f(STRIDE[1])} s in the run, blended with the same weights to ${f(r.stride)} s`,
        ],
        status: { text: `At ${f(m.speed)} m/s the pose is ${pct(1 - r.t, 0)} walk and ${pct(r.t, 0)} run, one stride every ${f(r.stride)} s.`, tone: 'info' },
        chart: { curve: 'knee angle over one stride', x: [0, 1], y: [0, 110], xLabel: 'phase of the stride', at: m.phase, atY: knee,
          series: [
            { color: COL.b, fn: (x) => RL.sampleClip(WALK_KEYS, x)[1] },
            { color: COL.amber, fn: (x) => RL.sampleClip(RUN_KEYS, x)[1] },
            { color: COL.green, fn: (x) => blendAt(x, r.t).angles[1] },
          ] },
        values: [['walk weight', f(1 - r.t, 3), 'walk'], ['run weight', f(r.t, 3), 'run'], ['knee (slerp)', deg(knee), 'blend'], ['knee (angle blend)', deg(r.linear[1])], ['one stride', `${f(r.stride)} s`]],
        fact: 'A one-parameter blend tree maps the speed to a weight between the two neighboring clips. Both clips are read at the same phase of the stride, so their feet strike together, and each joint\'s two rotations are blended with slerp (Shoemake, 1985); the stride time blends with the same weights. The hip here rides at the height that puts the lower foot on the floor. The character faces left.',
      };
    },
  };

  // ------------------------------------------------------------ Motion: retargeting a leg
  const PERF = [0.45, 0.45];
  const retargetView = {
    id: 'retarget', topic: 'motion', label: 'retargeting', home: HOME_LEG, inputTitle: 'The performer\'s leg and the character\'s', grid: 'xy', axes: false,
    init: { hip: 30, knee: 40, thigh: 0.36, pin: 0 },
    params: [
      { id: 'hip', label: 'hip from vertical', min: 0, max: 70, step: 0.5, unit: '°' },
      { id: 'knee', label: 'knee bend', min: 0, max: 110, step: 0.5, unit: '°' },
      { id: 'thigh', label: 'character\'s thigh and shin', min: 0.2, max: 0.6, step: 0.01 },
    ],
    presets: [
      { label: 'the lecture\'s legs', set: { hip: 30, knee: 40, thigh: 0.36, pin: 0 } },
      { label: 'pin the foot with inverse kinematics', set: { hip: 30, knee: 80, thigh: 0.36, pin: 1 } },
      { label: 'a much shorter leg', set: { hip: 30, knee: 40, thigh: 0.24, pin: 1 } },
      { label: 'same length', set: { hip: 30, knee: 40, thigh: 0.45, pin: 0 } },
    ],
    regions: ['Retargeting a leg', 'Two-link inverse kinematics: the law of cosines'],
    run(m) {
      const angles = [-90 - m.hip, m.knee];
      const perf = RL.forwardKinematics(PERF, angles);
      const copy = RL.forwardKinematics([m.thigh, m.thigh], angles);
      const rt = RL.retargetLeg(PERF[0], m.thigh, m.hip);
      const pin = RL.twoLinkIK(m.thigh, m.thigh, perf.tip, 1);
      const pinned = RL.forwardKinematics([m.thigh, m.thigh], [pin.theta1, pin.theta2]);
      const shown = m.pin ? pinned : copy;
      return { ...rt, ...pin, perf, copy, pinned, shown, floor: perf.tip[1], footGap: sub(shown.tip, perf.tip) };
    },
    draw(v, m, r) {
      S.begin();
      v.poly([V(-1.2, r.floor, 0), V(1.2, r.floor, 0)], COL.gray, { k: 'floor' });
      drawBones(v, [[0, 0, 0], r.perf.joints[1]], r.perf.tip, { colors: [COL.gray, COL.gray], r: 0.03, keys: ['perf', 'perf'] });
      drawBones(v, [[0, 0, 0], r.shown.joints[1]], r.shown.tip, { colors: [m.pin ? COL.green : COL.cyan, m.pin ? COL.green : COL.cyan], r: 0.04, keys: [m.pin ? 'pin' : 'copy', m.pin ? 'pin' : 'copy'] });
      // the knee if the position were copied instead of the angle
      v.point(P(r.perf.joints[1]), COL.red, { r: 0.04, k: 'stretch', label: 'copied position', anchor: 'bl' });
      v.point(P(r.perf.tip), COL.gray, { r: 0.05, k: 'perf', label: 'performer\'s foot', anchor: 'br' });
      v.point(P(r.shown.tip), m.pin ? COL.green : COL.cyan, { r: 0.05, k: m.pin ? 'pin' : 'copy' });
      v.point(V(0, 0, 0), COL.white, { r: 0.06, k: 'perf', label: 'hip', anchor: 'br' });
    },
    explain(m, r) {
      const above = r.shown.tip[1] - r.floor;
      const reachable = r.reachable;
      return {
        hud: `copy the angle: knee {copy|${f(r.kneeCopyAngle, 3)}} m forward; copy the position: {stretch|${f(r.kneeCopyPosition, 3)}} m`,
        rows: [
          `thigh: performer ${f(PERF[0])} m, character ${f(m.thigh)} m; hip ${deg(m.hip)} from vertical`,
          `{copy|copy the angle}: knee ${f(m.thigh)} sin ${deg(m.hip, 0)} = {copy|${f(r.kneeCopyAngle, 3)}} m forward; the bone keeps its length`,
          `{stretch|copy the position}: knee ${f(PERF[0])} sin ${deg(m.hip, 0)} = {stretch|${f(r.kneeCopyPosition, 3)}} m forward; the thigh must stretch {stretch|${pct(r.stretch, 0)}}`,
          m.pin
            ? `{pin|inverse kinematics}: the foot target is the performer's foot, at distance ${f(r.distance, 3)}; the character's leg reaches ${f(2 * m.thigh, 3)}; θ₁ ${deg(r.theta1)}, θ₂ ${deg(r.theta2)}`
            : `copying the angles puts the foot ${p2(r.footGap, 3)} from the performer's foot (${above >= 0 ? 'above' : 'below'} the floor by ${f(Math.abs(above), 3)} m)`,
        ],
        status: m.pin
          ? (reachable ? { text: 'The foot is back on the performer\'s foot: the contact is repaired.', tone: 'ok' } : { text: `The performer's foot is ${f(r.distance - 2 * m.thigh, 3)} m beyond this leg's reach: inverse kinematics stretches the leg toward it and stops short.`, tone: 'warn' })
          : Math.abs(r.stretch) < 1e-9 ? { text: 'The legs are the same length: copying the angles puts the foot where the performer\'s is.', tone: 'ok' }
            : { text: `The copied angles leave the character's foot ${f(Math.hypot(r.footGap[0], r.footGap[1]), 3)} m from the planted foot.`, tone: 'warn' },
        values: [['knee, copy angle', f(r.kneeCopyAngle, 3), 'copy'], ['knee, copy position', f(r.kneeCopyPosition, 3), 'stretch'], ['stretch', pct(r.stretch, 0), 'stretch'], ['foot gap', f(Math.hypot(r.footGap[0], r.footGap[1]), 3)]],
        fact: 'Retargeting copies rotations, never positions. A shorter leg at the same angles ends its foot somewhere else, so a layer of inverse kinematics pins the foot to the contact point wherever the leg can reach it.',
      };
    },
    panel(host, m, r, ctx) {
      once(host, 'retarget', (h) => {
        choose(h, 'foot', [[0, 'copy the angles'], [1, 'pin with inverse kinematics']], () => ctx.state().pin, (x) => { ctx.state().pin = x; }, ctx);
      });
      host.querySelectorAll('[data-value]').forEach((b) => b.classList.toggle('on', Number(b.dataset.value) === m.pin));
    },
    panelTitle: 'The character\'s foot',
  };

  const views = [fkView, ik2View, ccdView, jacView, lbsTwo, lbsThree, wrapperView, shapesView, blendView, retargetView];
  return Object.assign(views, { solver });
}
