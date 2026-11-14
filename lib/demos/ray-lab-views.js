// ray-lab-views: the catalog behind the ray-lab demo (runtime: lib/core/lab.js). Five topics: a ray against a sphere, a triangle and a
// box; Whitted's tree of rays; Snell's law and Fresnel; shadow acne; the bounding-volume hierarchy. run() calls the program's own
// functions (lib/programs/ray-lab/webgl/raylab.js), so the numbers beside the code are that code's output.
//   makeViews(): the views of all five topics. This file holds the first and the third; ray-lab-whitted.js holds Whitted and acne,
//   ray-lab-bvh.js the hierarchy.
import * as R from '../programs/ray-lab/webgl/raylab.js';
import { COL, V } from '../core/lab-viz.js';
import { arr, P, addA, mulA, unitDir, f, g, vt, vg } from './ray-lab-ui.js';
import { makeWhittedViews } from './ray-lab-whitted.js';
import { makeBvhViews } from './ray-lab-bvh.js';

export const TOPICS = [
  { id: 'rays', label: 'Rays' }, { id: 'whitted', label: 'Whitted' }, { id: 'glass', label: 'Glass' }, { id: 'acne', label: 'Acne' }, { id: 'bvh', label: 'BVH' },
];

export const KEYS = {
  o: COL.a, d: COL.b, c: COL.c, m: COL.cyan, b: COL.gold, cp: COL.gold, disc: COL.amber, t0: COL.green, t1: COL.amber, hit: COL.green, n: COL.gold,
  A: COL.a, B: COL.b, C: COL.c, e1: COL.a, e2: COL.b, s: COL.cyan, p: COL.purple, q: COL.pink, det: COL.gold, u: COL.a, v: COL.b, t: COL.green, bary: COL.green,
  lo: COL.a, hi: COL.c, xs: COL.a, ys: COL.c, zs: COL.b, enter: COL.green, exit: COL.amber,
  theta1: COL.white, theta2: COL.cyan, reflect: COL.a, refract: COL.cyan, F: COL.gold, k: COL.amber, tir: COL.red,
  light: COL.gold, sum: COL.gold, primary: COL.white, shadow: COL.gold, blocked: COL.gray, eps: COL.amber, surface: COL.green, probe: COL.white,
  node: COL.gold, boxes: COL.cyan, tris: COL.amber, brute: COL.gray, best: COL.green, split: COL.gold, cost: COL.gold, areaL: COL.a, areaR: COL.b, areaP: COL.white, leaf: COL.gray,
};

const DECK_EYE = [3, 3, 6];
const DECK_BASIS = R.lookAtBasis(DECK_EYE, [0, 0, 0], [0, 1, 0]);
/** the deck's camera (e = (3, 3, 6), 28 degrees, 150 x 150 pixels): the unit direction of one pixel */
const deckDir = (px, py) => R.pixelRay(DECK_EYE, DECK_BASIS, 28, 150, 150, px, py).dir;
const setRay = (m, o, d) => { m.o.set(...o); m.d.set(...d); };

/** the ray as the picture draws it: solid ahead of the origin, dashed behind it */
function drawRay(v, o, dir, color = COL.b, { far = 14, k = 'd' } = {}) {
  v.bar(P(o), P(addA(o, mulA(dir, far))), color, { r: 0.012, k });
  v.dashed(P(o), P(addA(o, mulA(dir, -far))), COL.dim, { k });
}

// ================================================================ sphere
const sphereView = {
  id: 'rays.sphere', topic: 'rays', label: 'sphere', home: { eye: [4.9, 3.6, 7.3], target: [0.7, 0.9, 1.6] }, inputTitle: 'Ray and sphere',
  init: { o: [3, 3, 6], d: [-0.37197, -0.36957, -0.8515], c: [0, 0, 0], r: 1.2 },
  handles: [{ id: 'o', label: 'o', color: COL.a }, { id: 'd', label: 'd', base: 'o', color: COL.b }, { id: 'c', label: 'c', color: COL.c }],
  params: [{ id: 'r', label: 'radius r', min: 0.2, max: 3, step: 0.05 }],
  regions: ['Ray against a sphere'],
  presets: [
    { label: 'deck: pixel (89, 62)', run: (m) => { setRay(m, DECK_EYE, deckDir(89, 62)); m.c.set(0, 0, 0); m.r = 1.2; } },
    { label: 'deck: pixel (20, 20), a miss', run: (m) => { setRay(m, DECK_EYE, deckDir(20, 20)); m.c.set(0, 0, 0); m.r = 1.2; } },
    { label: 'origin inside', run: (m) => { setRay(m, [0, 0, 0], [0, 1, 0]); m.c.set(0, 0, 0); m.r = 1.2; } },
    { label: 'sphere behind the origin', run: (m) => { setRay(m, [0, 0, 3], [0, 0, 1]); m.c.set(0, 0, 0); m.r = 1; } },
    { label: 'grazing', run: (m) => { setRay(m, [-4, 1, 0], [1, 0, 0]); m.c.set(0, 0, 0); m.r = 1; } },
  ],
  run(m) {
    const o = arr(m.o), dir = unitDir(m.d), c = arr(m.c);
    const s = R.raySphere(o, dir, c, m.r, 0);
    return { ...s, o, dir, c, root: Math.sqrt(Math.max(s.disc, 0)) };
  },
  draw(v, m, r) {
    const o = r.o, c = r.c;
    v.sphere(P(c), m.r, COL.c, { k: 'c' });
    drawRay(v, o, r.dir);
    v.dashed(P(c), P(o), COL.cyan, { k: 'm' });
    v.label('m', P(mulA(addA(c, o), 0.5)), COL.cyan, 'a', 'm');
    // the closest approach: the foot of the perpendicular from the center, whose distance squared is r² − (b² − c′)
    const foot = addA(o, mulA(r.dir, -r.b));
    v.dashed(P(c), P(foot), COL.amber, { k: 'disc' });
    v.point(P(foot), COL.white, { r: 0.045, k: 'disc' });
    if (r.disc >= 0) {
      const near = addA(o, mulA(r.dir, r.t0)), far = addA(o, mulA(r.dir, r.t1));
      v.bar(P(near), P(far), COL.amber, { r: 0.03, k: 'disc' });
      v.point(P(near), r.t0 > 0 ? COL.green : COL.gray, { r: 0.07, k: 't0', label: 't0', anchor: 'ar' });
      v.point(P(far), r.t1 > 0 ? COL.amber : COL.gray, { r: 0.07, k: 't1', label: 't1', anchor: 'ar' });
    }
    if (r.kind === 'hit' || r.kind === 'inside') {
      v.arrow(P(r.hit), P(addA(r.hit, r.n)), COL.gold, { k: 'n', label: 'n', r: 0.02, head: 0.2, hr: 0.06 });
      if (r.kind === 'inside') v.arrow(P(r.hit), P(addA(r.hit, mulA(r.n, -1))), COL.gray, { k: 'n', r: 0.012, head: 0.14, hr: 0.04 });
    }
  },
  explain(m, r) {
    const mm = R.dot(r.m, r.m);
    const rows = [
      `{m|m} = o − c = ${vg(r.m)}`,
      `{b|b} = m·d = ${f(r.b)}`,
      `{cp|c′} = m·m − r² = ${f(mm)} − ${f(m.r * m.r)} = ${f(r.cPrime)}`,
      `{disc|b² − c′} = ${f(r.b * r.b)} − ${f(r.cPrime)} = ${f(r.disc)}`,
    ];
    if (r.disc >= 0) rows.push(`t = −b ∓ √(b² − c′) = ${f(-r.b)} ∓ ${f(r.root)}: {t0|t₀ = ${f(r.t0)}} and {t1|t₁ = ${f(r.t1)}}`);
    else rows.push('t = −b ∓ √(b² − c′): the root of a negative number, no real t');
    if (r.kind === 'hit' || r.kind === 'inside') {
      rows.push(`{hit|hit} = o + t d = ${vg(r.hit)}`, `{n|n} = (hit − c) / r = ${vg(r.n)}`);
      if (r.kind === 'inside') rows.push(`d·n = ${f(R.dot(r.dir, r.n))} > 0: n faces away from the ray, so flip it to ${vg(r.facing)}`);
    }
    const graze = r.disc >= 0 && r.disc < 1e-9;
    const status = {
      hit: graze ? { text: 'graze: the discriminant is 0, the ray touches the sphere at one point (t₀ = t₁)', tone: 'warn' }
        : { text: `hit: the ray enters the sphere at t = ${f(r.t0)} and leaves at t = ${f(r.t1)}`, tone: 'ok' },
      miss: { text: 'miss: the discriminant is negative, so the ray has no real intersection with the sphere', tone: 'bad' },
      inside: { text: `origin inside the sphere: the smaller root ${f(r.t0)} is behind the origin, so the hit is the exit at t = ${f(r.t1)}`, tone: 'warn' },
      behind: { text: `sphere behind the origin: both roots (${f(r.t0)}, ${f(r.t1)}) are negative, so nothing is hit`, tone: 'warn' },
    }[r.kind];
    // the parabola around its lowest point t = −b, wide enough to show both roots and the zero line
    const w = Math.max(3, 2 * r.root + 2), lo = -r.b - w, hi = -r.b + w;
    const y0 = Math.min(-1, -r.disc - 0.5);
    return {
      hud: `{disc|b² − c′ = ${f(r.disc)}}  ${{ hit: `entry at {t0|t = ${f(r.t0)}}`, miss: 'no real root: a miss', inside: `inside: exit at {t1|t = ${f(r.t1)}}`, behind: 'both roots negative' }[r.kind]}`,
      rows, status,
      chart: { curve: "f(t) = t² + 2bt + c′", x: [Number(lo.toFixed(1)), Number(hi.toFixed(1))], y: [Number(y0.toFixed(1)), Number(Math.max(w * w - r.disc, 1).toFixed(1))], xLabel: 't', series: [{ fn: (t) => t * t + 2 * r.b * t + r.cPrime, color: COL.gold }], at: r.t, atY: 0 },
      values: [['entry t₀', f(r.t0), 't0'], ['exit t₁', f(r.t1), 't1'], ['b', f(r.b), 'b'], ['b² − c′', f(r.disc), 'disc'], ['hit', r.kind === 'hit' || r.kind === 'inside' ? vt(r.hit) : 'none', 'hit'], ['kind', r.kind]],
      fact: 'The smaller root that is positive is the entry. With the origin inside, only the larger root is positive: every refraction ray inside glass is in this case. The roots are where the curve crosses zero; its lowest point is −(b² − c′).',
    };
  },
};

// ================================================================ triangle
const TRI_A = [0, 0, 0], TRI_B = [2, 0, 0], TRI_C = [0, 2, 0];
const triangleView = {
  id: 'rays.triangle', topic: 'rays', label: 'triangle', home: { eye: [3.4, 2.8, 4.4], target: [0.7, 0.7, 0.2] }, inputTitle: 'Ray and triangle',
  init: { A: TRI_A, B: TRI_B, C: TRI_C, o: [0.5, 0.5, 1], d: [0, 0, -1] },
  handles: [{ id: 'A', color: COL.a }, { id: 'B', color: COL.b }, { id: 'C', color: COL.c }, { id: 'o', label: 'o', color: COL.white }, { id: 'd', label: 'd', base: 'o', color: COL.gold }],
  regions: ['Ray against a triangle'],
  presets: [
    { label: 'deck: a hit', set: { A: TRI_A, B: TRI_B, C: TRI_C, o: [0.5, 0.5, 1], d: [0, 0, -1] } },
    { label: 'deck: a miss', set: { A: TRI_A, B: TRI_B, C: TRI_C, o: [1.5, 1.5, 1], d: [0, 0, -1] } },
    { label: 'parallel, d = (1, 0, 0)', set: { A: TRI_A, B: TRI_B, C: TRI_C, o: [0.5, 0.5, 1], d: [1, 0, 0] } },
    { label: 'triangle behind the origin', set: { A: TRI_A, B: TRI_B, C: TRI_C, o: [0.5, 0.5, -1], d: [0, 0, -1] } },
    { label: 'through the edge AB', set: { A: TRI_A, B: TRI_B, C: TRI_C, o: [1, 0, 1], d: [0, 0, -1] } },
    { label: 'from below', set: { A: TRI_A, B: TRI_B, C: TRI_C, o: [0.5, 0.5, -1], d: [0, 0, 1] } },
  ],
  run(m) {
    const o = arr(m.o), dir = unitDir(m.d), A = arr(m.A), B = arr(m.B), C = arr(m.C);
    return { ...R.rayTriangle(o, dir, A, B, C), o, dir, A, B, C };
  },
  draw(v, m, r) {
    const [A, B, C] = [P(r.A), P(r.B), P(r.C)];
    v.patch([A, B, C], COL.gold, 0.22, { k: 'bary' });
    v.poly([A, B, C], COL.gold, { closed: true, k: 'bary' });
    if (r.kind !== 'parallel' && R.length(R.cross(r.e1, r.e2)) > 1e-6) v.plane(A, P(r.n), 3.2, COL.gray, { opacity: 0.05, grid: false, outline: false });
    v.arrow(A, P(addA(r.A, r.e1)), COL.a, { k: 'e1', label: 'e1', r: 0.018, head: 0.18, hr: 0.055, anchor: 'b' });
    v.arrow(A, P(addA(r.A, r.e2)), COL.b, { k: 'e2', label: 'e2', r: 0.018, head: 0.18, hr: 0.055, anchor: 'l' });
    drawRay(v, r.o, r.dir, COL.gold, { k: 'd' });
    if (r.kind !== 'parallel') {
      const q = r.hit;
      const color = r.kind === 'hit' ? COL.green : r.kind === 'behind' ? COL.gray : COL.red;
      v.point(P(q), color, { r: 0.07, k: 'hit', label: r.kind === 'hit' ? 'hit' : 'plane point', anchor: 'ar' });
      // the parallelogram u e1 + v e2: how far along each edge the point sits
      const au = addA(r.A, mulA(r.e1, r.u)), av = addA(r.A, mulA(r.e2, r.v));
      v.dashed(A, P(au), COL.a, { k: 'u' });
      v.dashed(P(au), P(q), COL.b, { k: 'v' });
      v.dashed(A, P(av), COL.b, { k: 'v' });
      v.dashed(P(av), P(q), COL.a, { k: 'u' });
    }
    v.arrow(P(addA(r.A, mulA(addA(r.e1, r.e2), 1 / 3))), P(addA(addA(r.A, mulA(addA(r.e1, r.e2), 1 / 3)), r.n)), COL.cyan, { k: 'n', label: 'n', r: 0.012, head: 0.14, hr: 0.04 });
  },
  explain(m, r) {
    const parallel = r.kind === 'parallel';
    const ok = (c) => (c ? '✓' : '✗');
    const rows = [
      `{e1|e1} = B − A = ${vg(r.e1)}    {e2|e2} = C − A = ${vg(r.e2)}    {s|s} = o − A = ${vg(r.s)}`,
      `{p|p} = d × e2 = ${vg(r.p)}    {q|q} = s × e1 = ${vg(r.q)}`,
      `{det|det} = e1·p = ${f(r.det)}${parallel ? '  (< 10⁻⁶ in size: the ray is parallel to the plane)' : ''}`,
    ];
    if (!parallel) {
      rows.push(`{u|u} = s·p / det = ${f(r.u)}    {v|v} = d·q / det = ${f(r.v)}    {t|t} = e2·q / det = ${f(r.t)}`);
      rows.push(`u ≥ 0 ${ok(r.u >= 0)}   v ≥ 0 ${ok(r.v >= 0)}   u + v = ${f(r.u + r.v)} ≤ 1 ${ok(r.u + r.v <= 1)}   t > 0 ${ok(r.t > R.EPS)}`);
      rows.push(`{bary|(1 − u − v, u, v)} = ${vg(r.bary)}${r.kind === 'hit' ? `    hit = ${vg(r.hit)}` : ''}`);
    }
    const status = {
      hit: { text: `hit: u, v ≥ 0 and u + v ≤ 1, at t = ${f(r.t)}`, tone: 'ok' },
      outside: { text: `miss: the ray meets the plane outside the triangle, beyond the edge ${r.edge} (${{ AC: 'u < 0', AB: 'v < 0', BC: 'u + v > 1' }[r.edge]})`, tone: 'bad' },
      parallel: { text: 'parallel: det = 0, the ray never meets the triangle\'s plane, so there is no u, v or t', tone: 'warn' },
      behind: { text: `behind the origin: the point is inside the triangle, but t = ${f(r.t)} ≤ 0`, tone: 'warn' },
    }[r.kind];
    return {
      hud: parallel ? '{det|det = 0}  parallel: no hit' : `{u|u = ${f(r.u)}}  {v|v = ${f(r.v)}}  {t|t = ${f(r.t)}}  ${r.kind === 'hit' ? 'inside' : r.kind === 'outside' ? 'outside' : 'behind'}`,
      rows, status,
      values: [['det', f(r.det), 'det'], ['t', parallel ? 'none' : f(r.t), 't'], ['u', parallel ? 'none' : f(r.u), 'u'], ['v', parallel ? 'none' : f(r.v), 'v'], ['weights', parallel ? 'none' : vt(r.bary), 'bary'], ['kind', r.kind]],
      fact: 'One solve gives t and the barycentric weights together, from two cross products and four dot products. A robust tracer tests |det| < ε, because a ray almost parallel to the plane gives a huge t from a tiny determinant.',
    };
  },
  panelTitle: 'Where the ray meets the plane, in (u, v)',
  panel(host, m, r) {
    const X = (u) => 52 + 78 * u, Y = (vv) => 150 - 78 * vv;
    const clampU = Math.max(-0.65, Math.min(2.0, r.u)), clampV = Math.max(-0.65, Math.min(1.7, r.v));
    const dot = r.kind === 'parallel' ? '' : `<circle cx="${X(clampU)}" cy="${Y(clampV)}" r="5.5" fill="${r.kind === 'hit' ? '#3fd97f' : r.kind === 'behind' ? '#8b93a7' : '#ff5a52'}"/>
      <text x="${X(clampU) + 8}" y="${Y(clampV) - 6}">(${f(r.u, 2)}, ${f(r.v, 2)})</text>`;
    host.innerHTML = `<svg class="rl-svg" viewBox="0 0 280 205" role="img" aria-label="the hit in barycentric coordinates u and v">
      <polygon points="${X(0)},${Y(0)} ${X(1)},${Y(0)} ${X(0)},${Y(1)}" fill="#ffd166" fill-opacity="0.16" stroke="#ffd166"/>
      <line x1="${X(-0.65)}" y1="${Y(0)}" x2="${X(2)}" y2="${Y(0)}" stroke="#3a4152" stroke-dasharray="3 3"/>
      <line x1="${X(0)}" y1="${Y(-0.65)}" x2="${X(0)}" y2="${Y(1.7)}" stroke="#3a4152" stroke-dasharray="3 3"/>
      <line x1="${X(-0.3)}" y1="${Y(1.3)}" x2="${X(1.3)}" y2="${Y(-0.3)}" stroke="#3a4152" stroke-dasharray="3 3"/>
      <text x="${X(0) - 16}" y="${Y(0) + 14}" style="fill:#ff7b72">A</text><text x="${X(1) - 4}" y="${Y(0) + 14}" style="fill:#79c0ff">B (u = 1)</text><text x="${X(0) + 6}" y="${Y(1) + 3}" style="fill:#7ee787">C (v = 1)</text>
      <text x="${X(0.55)}" y="${Y(0.62)}" transform="rotate(-45 ${X(0.55)} ${Y(0.62)})" style="fill:#79829a">u + v = 1</text>
      <text x="${X(1.35)}" y="${Y(0) - 5}" style="fill:#79829a">v = 0</text><text x="${X(0) + 5}" y="${Y(1.62)}" style="fill:#79829a">u = 0</text>
      ${dot}</svg>`;
  },
};

// ================================================================ box
const BOX_LO = [0, 0, 0], BOX_HI = [1, 1, 1];
const AXIS = [['x', COL.a, '#ff7b72', 'xs'], ['y', COL.c, '#7ee787', 'ys'], ['z', COL.b, '#79c0ff', 'zs']];
const boxView = {
  id: 'rays.box', topic: 'rays', label: 'box (slabs)', home: { eye: [3.6, 2.6, 4.2], target: [0.5, 0.5, 0.5] }, inputTitle: 'Ray and box',
  init: { lo: BOX_LO, hi: BOX_HI, o: [-1, 0.5, 0.5], d: [0.98058, 0.19612, 0] },
  handles: [{ id: 'lo', label: 'lo', color: COL.a }, { id: 'hi', label: 'hi', color: COL.c }, { id: 'o', label: 'o', color: COL.white }, { id: 'd', label: 'd', base: 'o', color: COL.gold }],
  regions: ['Ray against a box'],
  presets: [
    { label: 'deck: enters at t = 1.02', set: { lo: BOX_LO, hi: BOX_HI, o: [-1, 0.5, 0.5], d: [0.98058, 0.19612, 0] } },
    { label: 'a miss: the intervals do not overlap', set: { lo: BOX_LO, hi: BOX_HI, o: [-1, 0.5, 0.5], d: [0.7, 0.7, 0] } },
    { label: 'parallel to a slab, outside it', set: { lo: BOX_LO, hi: BOX_HI, o: [-1, 1.6, 0.5], d: [1, 0, 0] } },
    { label: 'origin inside', set: { lo: BOX_LO, hi: BOX_HI, o: [0.4, 0.5, 0.5], d: [1, 0.3, 0.2] } },
    { label: 'box behind the origin', set: { lo: BOX_LO, hi: BOX_HI, o: [-1, 0.5, 0.5], d: [-1, 0, 0] } },
    { label: 'through a corner', set: { lo: BOX_LO, hi: BOX_HI, o: [-1, -1, -1], d: [1, 1, 1] } },
  ],
  run(m) {
    const o = arr(m.o), dir = unitDir(m.d);
    const lo = R.minPoint(arr(m.lo), arr(m.hi)), hi = R.maxPoint(arr(m.lo), arr(m.hi));
    return { ...R.rayBox(o, dir, lo, hi), o, dir, lo, hi };
  },
  draw(v, m, r) {
    const size = [r.hi[0] - r.lo[0], r.hi[1] - r.lo[1], r.hi[2] - r.lo[2]];
    v.box(P(r.lo), V(size[0], 0, 0), V(0, size[1], 0), V(0, 0, size[2]), COL.gray, { k: 'lo', opacity: 0.1 });
    drawRay(v, r.o, r.dir, COL.gold, { k: 'd' });
    const col = [COL.a, COL.c, COL.b];
    if (r.kind === 'hit' || r.kind === 'inside') {
      const enter = r.kind === 'hit' ? r.hit : null;
      const exit = addA(r.o, mulA(r.dir, r.tExit));
      if (enter) v.point(P(enter), col[r.axis], { r: 0.075, k: 'enter', label: 'enter', anchor: 'ar' });
      if (Number.isFinite(r.tExit) && r.tExit > 0) v.point(P(exit), COL.amber, { r: 0.06, k: 'exit', label: 'exit', anchor: 'ar' });
      v.bar(P(enter ?? r.o), P(exit), COL.amber, { r: 0.03, k: 'exit' });
      v.arrow(P(r.hit), P(addA(r.hit, mulA(r.n, 0.7))), COL.gold, { k: 'n', label: 'n', r: 0.015, head: 0.14, hr: 0.04 });
    }
  },
  explain(m, r) {
    const rows = AXIS.map(([name, , , key], a) => {
      const s = r[name], lo = r.lo[a], hi = r.hi[a];
      const body = Math.abs(r.dir[a]) < 1e-12
        ? (s[0] === -Infinity ? `d${name} = 0 and o${name} = ${g(r.o[a])} is between ${g(lo)} and ${g(hi)}: every t` : `d${name} = 0 and o${name} = ${g(r.o[a])} is outside [${g(lo)}, ${g(hi)}]: no t at all`)
        : `t ∈ [(${g(lo)} − ${g(r.o[a])}) / ${f(r.dir[a])}, (${g(hi)} − ${g(r.o[a])}) / ${f(r.dir[a])}] = [${f(s[0], 2)}, ${f(s[1], 2)}]`;
      return `{${key}|${name} slab}: ${body}`;
    });
    rows.push(`{enter|enter} = largest lower bound = ${f(r.tEnter, 2)}    {exit|leave} = smallest upper bound = ${f(r.tExit, 2)}`);
    if (r.kind === 'hit' || r.kind === 'inside') rows.push(`hit = o + t d = ${vg(r.hit)} on the ${'xyz'[r.axis]} = ${g(r.n[r.axis] > 0 ? r.hi[r.axis] : r.lo[r.axis])} face`);
    const status = {
      hit: { text: `hit: the three intervals overlap from t = ${f(r.tEnter, 2)} to ${f(r.tExit, 2)}; the ray enters through the ${'xyz'[r.axis]} slab`, tone: 'ok' },
      miss: { text: r.tEnter === Infinity || r.tExit === -Infinity ? 'miss: one slab has no t at all (a zero component of d with the origin outside it)' : `miss: the largest lower bound ${f(r.tEnter, 2)} is past the smallest upper bound ${f(r.tExit, 2)}, so no t is inside all three slabs`, tone: 'bad' },
      inside: { text: `origin inside the box: the largest lower bound ${f(r.tEnter, 2)} is behind the origin, so the hit is the exit at t = ${f(r.tExit, 2)}`, tone: 'warn' },
      behind: { text: `box behind the origin: the overlap ends at t = ${f(r.tExit, 2)} ≤ 0`, tone: 'warn' },
    }[r.kind];
    return {
      hud: `{enter|enter ${f(r.tEnter, 2)}}  {exit|leave ${f(r.tExit, 2)}}  ${{ hit: 'hit', miss: 'miss', inside: 'inside', behind: 'behind' }[r.kind]}`,
      rows, status,
      values: [['x slab', `${f(r.x[0], 2)} … ${f(r.x[1], 2)}`, 'xs'], ['y slab', `${f(r.y[0], 2)} … ${f(r.y[1], 2)}`, 'ys'], ['z slab', `${f(r.z[0], 2)} … ${f(r.z[1], 2)}`, 'zs'], ['t', f(r.t, 2), 'enter'], ['hit', r.t < Infinity ? vt(r.hit) : 'none', 'hit'], ['kind', r.kind]],
      fact: 'Six divisions and a few comparisons: the slab test (Kay and Kajiya, 1986) that a bounding-volume hierarchy runs millions of times. Drag lo and hi to resize the box; the program sorts the corners.',
    };
  },
  panelTitle: 'The three slabs on the ray',
  panel(host, m, r) {
    const rowsY = [28, 62, 96];
    const finite = [0, ...[...r.x, ...r.y, ...r.z].filter(Number.isFinite)];
    let lo = Math.min(...finite) - 0.4, hi = Math.max(...finite) + 0.4;
    if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
    const X = (t) => 46 + ((Math.max(lo, Math.min(hi, t)) - lo) / (hi - lo)) * 214;
    let bars = '';
    AXIS.forEach(([name, , color], a) => {
      const s = r[name], y = rowsY[a];
      bars += `<text x="8" y="${y + 4}" style="fill:${color}">${name}</text>`;
      if (s[0] === -Infinity) bars += `<rect x="46" y="${y - 6}" width="214" height="12" fill="${color}" fill-opacity="0.12" stroke="${color}" stroke-dasharray="3 3"/><text x="${46 + 107}" y="${y + 4}" text-anchor="middle">every t</text>`;
      else if (s[0] === Infinity) bars += `<text x="${46 + 107}" y="${y + 4}" text-anchor="middle" style="fill:#ff8d85">no t: the origin is outside this slab</text>`;
      else bars += `<rect x="${X(s[0])}" y="${y - 6}" width="${Math.max(2, X(s[1]) - X(s[0]))}" height="12" fill="${color}" fill-opacity="0.5" stroke="${color}"/>
        <text x="${X(s[0])}" y="${y - 9}" text-anchor="middle">${f(s[0], 2)}</text><text x="${X(s[1])}" y="${y - 9}" text-anchor="middle">${f(s[1], 2)}</text>`;
    });
    const overlap = r.tEnter <= r.tExit && Number.isFinite(r.tEnter) && Number.isFinite(r.tExit)
      ? `<rect x="${X(r.tEnter)}" y="12" width="${Math.max(2, X(r.tExit) - X(r.tEnter))}" height="98" fill="#3fd97f" fill-opacity="0.16" stroke="#3fd97f" stroke-dasharray="2 2"/>` : '';
    host.innerHTML = `<svg class="rl-svg" viewBox="0 0 280 135" role="img" aria-label="the t interval of each slab and their overlap">
      ${overlap}${bars}
      <line x1="${X(0)}" y1="10" x2="${X(0)}" y2="112" stroke="#ffd166" stroke-width="1.5"/><text x="${X(0)}" y="124" text-anchor="middle" style="fill:#ffd166">t = 0, the origin</text>
      <text x="46" y="132" style="fill:#79829a">${f(lo, 1)}</text><text x="260" y="132" text-anchor="end" style="fill:#79829a">t = ${f(hi, 1)}</text></svg>`;
  },
};

// ================================================================ refraction
const incoming = (deg) => [Math.sin((deg * Math.PI) / 180), -Math.cos((deg * Math.PI) / 180), 0];
const refractionView = {
  id: 'glass.refraction', topic: 'glass', label: 'Snell and Fresnel', home: { eye: [0, 0.4, 8.5], target: [0, 0.2, 0] }, grid: 'xy', inputTitle: 'Light at a surface',
  init: { theta: 30, n1: 1, n2: 1.5 },
  params: [
    { id: 'theta', label: 'angle θ₁', min: 0, max: 89.5, step: 0.5, unit: '°', play: true },
    { id: 'n1', label: 'index n₁ (above)', min: 1, max: 2.6, step: 0.01 },
    { id: 'n2', label: 'index n₂ (below)', min: 1, max: 2.6, step: 0.01 },
  ],
  regions: ['Reflection and refraction'],
  presets: [
    { label: 'air → glass, 30°', set: { theta: 30, n1: 1, n2: 1.5 } },
    { label: 'air → glass, 60°', set: { theta: 60, n1: 1, n2: 1.5 } },
    { label: 'glass → air, 30°', set: { theta: 30, n1: 1.5, n2: 1 } },
    { label: 'critical angle 41.81°', set: { theta: 41.5, n1: 1.5, n2: 1 } },
    { label: 'total internal reflection, 50°', set: { theta: 50, n1: 1.5, n2: 1 } },
    { label: 'window at 89°', set: { theta: 89, n1: 1, n2: 1.5 } },
    { label: 'water → air, 50°', set: { theta: 50, n1: 1.33, n2: 1 } },
    { label: 'air → diamond, 60°', set: { theta: 60, n1: 1, n2: 2.42 } },
  ],
  run(m) {
    const d = incoming(m.theta);
    const s = R.snellFresnel(d, [0, 1, 0], m.n1, m.n2);
    return { ...s, d, n: [0, 1, 0], theta: m.theta };
  },
  draw(v, m, r) {
    const L = 3;
    const rad = (m.theta * Math.PI) / 180;
    const origin = V(0, 0, 0);
    const dense = m.n1 > m.n2 ? 1 : -1;
    v.box(V(-3.4, dense > 0 ? 0 : -2.6, -0.4), V(6.8, 0, 0), V(0, 2.6, 0), V(0, 0, 0.8), COL.cyan, { opacity: 0.07, k: 'n' });
    v.label(`n₁ = ${g(m.n1, 2)}`, V(2.5, 2.3, 0), COL.white, 'l');
    v.label(`n₂ = ${g(m.n2, 2)}`, V(2.5, -2.3, 0), COL.white, 'l');
    v.dashed(V(0, -L, 0), V(0, L, 0), COL.gray, { k: 'n' });
    v.label('n', V(0, L, 0), COL.gray, 'ar', 'n');
    v.arrow(V(-Math.sin(rad) * L, Math.cos(rad) * L, 0), origin, COL.white, { r: 0.03, k: 'theta1', label: 'd', anchor: 'l' });
    v.arrow(origin, P(mulA(r.reflected, L)), COL.a, { r: 0.01 + 0.035 * r.kReflect, k: 'reflect', label: r.tir ? 'r (all of it)' : 'r', anchor: 'r' });
    if (!r.tir) v.arrow(origin, P(mulA(r.refracted, L)), COL.cyan, { r: 0.01 + 0.035 * r.kRefract, k: 'refract', label: 't', anchor: 'r' });
    if (m.theta > 1) v.arc(origin, V(0, 1, 0), V(-Math.sin(rad), Math.cos(rad), 0), 0.9, COL.white, { k: 'theta1', label: 'θ₁' });
    if (!r.tir && r.thetaT > 1) v.arc(origin, V(0, -1, 0), P(r.refracted), 0.9, COL.cyan, { k: 'theta2', label: 'θ₂' });
    v.point(origin, COL.white, { r: 0.05 });
  },
  explain(m, r) {
    const rows = [
      `Snell: {theta1|n₁ sin θ₁} = ${g(m.n1, 2)} × ${f(Math.sin((m.theta * Math.PI) / 180), 4)} = ${f(m.n1 * Math.sin((m.theta * Math.PI) / 180), 4)}`,
      `η = n₁/n₂ = ${f(r.eta, 4)},  cos θ₁ = −d·n = ${f(r.cosI, 4)}`,
      `{k|k} = 1 − η²(1 − cos²θ₁) = ${f(r.k, 4)}`,
    ];
    if (r.tir) rows.push('{tir|k < 0}: sin θ₂ would exceed 1, so there is no refracted ray');
    else rows.push(`{theta2|θ₂} = ${f(r.thetaT, 2)}°,  {refract|t} = η d + (η cos θ₁ − √k) n = ${vg(r.refracted)}`);
    rows.push(`{reflect|r} = d − 2(d·n) n = ${vg(r.reflected)}`);
    rows.push(`F₀ = ((n₁ − n₂)/(n₁ + n₂))² = ${f(r.f0, 4)},  {F|Schlick F} = F₀ + (1 − F₀)(1 − cos θ₁)⁵ = ${f(r.fSchlick, 4)}`);
    rows.push(`exact Fresnel (unpolarized) = ${f(r.fExact, 4)}`);
    rows.push(r.tir ? 'reflected share: 1, not F; refracted share: 0' : `reflected share F = ${f(r.kReflect, 3)}, refracted share 1 − F = ${f(r.kRefract, 3)}`);
    const critical = r.critical < 90 ? `critical angle arcsin(n₂/n₁) = ${f(r.critical, 2)}°` : 'no critical angle going into the denser medium';
    const status = r.tir
      ? { text: `total internal reflection: θ₁ = ${f(m.theta, 1)}° is past the critical angle ${f(r.critical, 2)}°, so all of the light reflects`, tone: 'bad' }
      : { text: `refracts to θ₂ = ${f(r.thetaT, 2)}°; ${f(100 * r.kReflect, 1)} % reflects, ${f(100 * r.kRefract, 1)} % refracts. ${critical[0].toUpperCase()}${critical.slice(1)}`, tone: 'ok' };
    const at = (deg, key) => R.snellFresnel(incoming(deg), [0, 1, 0], m.n1, m.n2)[key];
    return {
      hud: r.tir ? `{tir|total internal reflection}  θ₁ = ${f(m.theta, 1)}° > ${f(r.critical, 2)}°` : `θ₁ = ${f(m.theta, 1)}°  {theta2|θ₂ = ${f(r.thetaT, 2)}°}  {F|F = ${f(r.kReflect, 3)}}`,
      rows, status,
      chart: { curve: 'F: Schlick gold, exact cyan', x: [0, 90], y: [0, 1], xLabel: 'θ₁ (degrees)', series: [{ fn: (deg) => at(deg, 'fSchlick'), color: COL.gold }, { fn: (deg) => at(deg, 'fExact'), color: COL.cyan }], at: m.theta, atY: r.kReflect },
      values: [['θ₂', r.tir ? 'none' : `${f(r.thetaT, 2)}°`, 'theta2'], ['critical', r.critical < 90 ? `${f(r.critical, 2)}°` : 'none'], ['k', f(r.k, 4), 'k'], ['F, Schlick', f(r.fSchlick, 4), 'F'], ['F, exact', f(r.fExact, 4)], ['F₀', f(r.f0, 4)]],
      fact: 'A window is nearly invisible face-on and a mirror at a grazing angle. The Schlick formula (1994) is fitted to light entering a denser medium; used from inside with cos θ₁ it stays low until total internal reflection, where the exact curve reaches 1. A tracer sends only the reflected ray when k < 0.',
    };
  },
};

// ================================================================ the catalog
export function makeViews() {
  return [sphereView, triangleView, boxView, ...makeWhittedViews(), refractionView, ...makeBvhViews()];
}
