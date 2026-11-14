// ray-lab-bvh: the bounding-volume hierarchy views of the ray-lab demo (lib/demos/ray-lab-views.js): one ray's traversal, stepped node by node
// with its test counts against brute force; the surface area heuristic on a real node; and the same formula by the numbers. The tree, the
// traversal and the costs are the program's (lib/programs/ray-lab/webgl/raylab.js); the triangles are lib/demos/ray-lab-data.js.
import * as R from '../programs/ray-lab/webgl/raylab.js';
import { COL, V } from '../core/lab-viz.js';
import { arr, P, addA, mulA, unitDir, f, g, sci, plural, commas, el, btn, once } from './ray-lab-ui.js';
import { deckTriangles, DECK_RAY, clusteredTriangles, spreadTriangles } from './ray-lab-data.js';

// ================================================================ the scenes and the trees
/** the generated scenes are centered on the origin; the figure's sits at about (4.6, 2.8), so all three share one camera */
const SHIFT = [4.6, 2.8, 0];
const shifted = (tris) => tris.map((t) => t.map((p) => addA(p, SHIFT)));
const SCENE_LIST = {
  deck: { label: 'the figure\'s 14 triangles', leaf: 2, depth: 3, ray: DECK_RAY, make: deckTriangles },
  clustered: { label: 'two clusters, 160 triangles', leaf: 4, depth: 12, ray: { o: [-0.4, 1.8, 0.2], d: [0.96, 0.24, 0.03] }, make: () => shifted(clusteredTriangles(5)) },
  spread: { label: '200 triangles spread evenly', leaf: 4, depth: 12, ray: { o: [-0.4, 2.8, 0], d: [1, 0.05, 0.02] }, make: () => shifted(spreadTriangles(200, 11)) },
};
const sceneCache = new Map(), treeCache = new Map();
function sceneOf(id) {
  if (!sceneCache.has(id)) {
    const s = SCENE_LIST[id];
    const tris = s.make();
    const lo = tris.map((t) => R.triBounds(t).lo), hi = tris.map((t) => R.triBounds(t).hi);
    const centroid = tris.map((t) => R.scale(R.add(R.add(t[0], t[1]), t[2]), 1 / 3));
    sceneCache.set(id, { ...s, id, tris, lo, hi, centroid });
  }
  return sceneCache.get(id);
}
function treeOf(sc, method) {
  const key = `${sc.id}|${method}`;
  if (!treeCache.has(key)) treeCache.set(key, R.buildBvh(sc.tris, sc.leaf, sc.depth, method));
  return treeCache.get(key);
}

const HOME = { eye: [4.6, 3, 10.4], target: [4.6, 2.9, 0] };
const SCENE_BTNS = [['deck', 'figure, 14'], ['clustered', 'two clusters'], ['spread', '200 spread']];
const rayPreset = (id) => ({ o: SCENE_LIST[id].ray.o, d: SCENE_LIST[id].ray.d });

const STEP_COLOR = { miss: COL.red, descend: COL.green, leaf: COL.cyan, skipped: COL.amber };
const STEP_HEX = { miss: '#ff5a52', descend: '#3fd97f', leaf: '#56d4dd', skipped: '#ffa657', none: '#2a2f3d' };

/** the edges of an axis-aligned box as six lines (a heavier box costs a mesh per face) */
function wireBox(v, lo, hi, color, k) {
  const c = (i, j, l) => V(i ? hi[0] : lo[0], j ? hi[1] : lo[1], l ? hi[2] : lo[2]);
  v.poly([c(0, 0, 0), c(1, 0, 0), c(1, 1, 0), c(0, 1, 0), c(0, 0, 0)], color, { k });
  v.poly([c(0, 0, 1), c(1, 0, 1), c(1, 1, 1), c(0, 1, 1), c(0, 0, 1)], color, { k });
  for (const [a, b] of [[[0, 0], [0, 0]], [[1, 0], [1, 0]], [[1, 1], [1, 1]], [[0, 1], [0, 1]]]) v.poly([c(a[0], a[1], 0), c(b[0], b[1], 1)], color, { k });
}
function drawTriangle(v, tri, color, k, fill = 0) {
  const pts = tri.map(P);
  if (fill > 0) v.patch(pts, color, fill, { k });
  v.poly(pts, color, { closed: true, k });
}

// ================================================================ traverse
/** the state of a traversal after its first `upto` steps */
function stateAt(r, upto) {
  const nodeKind = new Map(), triKind = new Map();
  let boxes = 0, tris = 0, best = Infinity, bestTri = -1;
  for (let i = 0; i < upto; i++) {
    const kind = r.kind[i];
    if (kind.startsWith('tri')) {
      tris += 1;
      triKind.set(r.tri[i], kind);
      if (kind === 'tri-nearest') { best = r.at[i]; bestTri = r.tri[i]; }
    } else { boxes += 1; nodeKind.set(r.node[i], kind); }
  }
  return { nodeKind, triKind, boxes, tris, best, bestTri };
}

/** where each node of the tree sits in a drawing: leaves evenly across, a parent over the middle of its children */
function layout(bvh) {
  const x = new Array(bvh.nodeCount).fill(0);
  let leaves = 0, levels = 0;
  (function place(id) {
    levels = Math.max(levels, bvh.depth[id]);
    if (bvh.left[id] < 0) { x[id] = leaves++; return; }
    place(bvh.left[id]);
    place(bvh.right[id]);
    x[id] = (x[bvh.left[id]] + x[bvh.right[id]]) / 2;
  })(0);
  return { x, leaves, levels };
}

function treeSvg(r, upto) {
  const L = layout(r.bvh), st = stateAt(r, upto);
  const cur = upto > 0 ? r.node[upto - 1] : -1;
  const w = 270, gapY = Math.min(26, 150 / Math.max(1, L.levels));
  const X = (id) => 6 + (L.leaves > 1 ? (L.x[id] / (L.leaves - 1)) * (w - 12) : w / 2), Y = (id) => 14 + r.bvh.depth[id] * gapY;
  const rad = Math.max(2.2, Math.min(6, (w / L.leaves) * 0.42));
  let edges = '', nodes = '';
  for (let id = 0; id < r.bvh.nodeCount; id++) {
    const kind = st.nodeKind.get(id) ?? 'none';
    if (r.bvh.left[id] >= 0) for (const c of [r.bvh.left[id], r.bvh.right[id]]) edges += `<line x1="${X(id)}" y1="${Y(id)}" x2="${X(c)}" y2="${Y(c)}" stroke="${st.nodeKind.has(c) ? '#59627a' : '#2a2f3d'}"/>`;
    const leaf = r.bvh.left[id] < 0;
    nodes += `<${leaf ? 'rect' : 'circle'} ${leaf ? `x="${X(id) - rad}" y="${Y(id) - rad}" width="${2 * rad}" height="${2 * rad}" rx="1.5"` : `cx="${X(id)}" cy="${Y(id)}" r="${rad}"`} fill="${STEP_HEX[kind]}" stroke="${id === cur ? '#ffd166' : '#0b0c10'}" stroke-width="${id === cur ? 2.4 : 1}"><title>node ${id}: ${leaf ? `leaf of ${r.bvh.count[id]} triangles` : 'inner node'}${st.nodeKind.has(id) ? `, ${kind}` : ', not reached'}</title></${leaf ? 'rect' : 'circle'}>`;
  }
  return `<svg class="rl-svg" viewBox="0 0 ${w} ${22 + L.levels * gapY}" role="img" aria-label="the tree, coloured by what the traversal has done to each node">${edges}${nodes}</svg>`;
}

function describe(r, j) {
  if (j < 0) return 'Nothing tested yet. Step forward: the first test is the root\'s box.';
  const kind = r.kind[j], id = r.node[j], count = r.bvh.count[id];
  const at = f(r.at[j], 2), best = f(r.best[j], 2);
  return {
    miss: `box ${id}: the ray misses it, so the ${plural(count, 'triangle')} below are never tested`,
    descend: `box ${id}: hit, entering at t = ${at}; descend into boxes ${r.bvh.left[id]} and ${r.bvh.right[id]}`,
    leaf: `box ${id}: hit, entering at t = ${at}; a leaf, so test its ${plural(count, 'triangle')}`,
    skipped: `box ${id}: hit, but it is entered at t = ${at}, farther than the nearest hit so far (t = ${best}): skipped`,
    'tri-miss': `triangle ${r.tri[j]}: the ray misses it`,
    'tri-nearest': `triangle ${r.tri[j]}: hit at t = ${at}, the nearest so far`,
    'tri-farther': `triangle ${r.tri[j]}: hit at t = ${at}, farther than the nearest (t = ${best})`,
  }[kind];
}

function traverseView() {
  let current = null, player = null;
  const stopPlay = () => { if (player) { clearInterval(player); player = null; } };
  return {
    id: 'bvh.traverse', topic: 'bvh', label: 'traverse a ray', group: 'bvh', home: HOME, inputTitle: 'Ray',
    init: { scene: 'deck', method: 'median', prune: 0, step: 0, o: DECK_RAY.o, d: DECK_RAY.d, axis: 0, cut: 0.5, cTrav: 1 },
    handles: [{ id: 'o', label: 'o', color: COL.white }, { id: 'd', label: 'd', base: 'o', color: COL.gold }],
    regions: ['BVH: build', 'BVH: traverse a ray', 'BVH: what the tree buys'],
    presets: [
      { label: 'figure: 14 triangles, median', set: { scene: 'deck', method: 'median', prune: 0, step: 0, ...rayPreset('deck') } },
      { label: 'figure, to the end', set: { scene: 'deck', method: 'median', prune: 0, step: 9999, ...rayPreset('deck') } },
      { label: 'two clusters, median', set: { scene: 'clustered', method: 'median', prune: 1, step: 9999, ...rayPreset('clustered') } },
      { label: 'two clusters, surface area', set: { scene: 'clustered', method: 'sah', prune: 1, step: 9999, ...rayPreset('clustered') } },
      { label: '200 spread triangles', set: { scene: 'spread', method: 'median', prune: 1, step: 9999, ...rayPreset('spread') } },
      { label: 'prune beyond the nearest hit', run: (m) => { m.prune = 1; } },
    ],
    leave() { stopPlay(); },
    run(m) {
      const sc = sceneOf(m.scene), bvh = treeOf(sc, m.method);
      const o = arr(m.o), dir = unitDir(m.d);
      const trace = R.traverseBvh(bvh, sc.tris, o, dir, m.prune === 1);
      const bruteResult = R.bruteForce(sc.tris, o, dir);
      const cost = R.frameCost(sc.tris.length, 1, 1);
      m.step = Math.max(0, Math.min(trace.steps, Math.round(m.step)));
      return { ...bvh, ...trace, ...cost, trace, bvh, sc, o, dir, bruteResult, triCount: sc.tris.length, upto: m.step };
    },
    draw(v, m, r) {
      const st = stateAt(r, r.upto), cur = r.upto > 0 ? r.upto - 1 : -1;
      r.sc.tris.forEach((tri, i) => {
        const kind = st.triKind.get(i);
        if (i === st.bestTri) drawTriangle(v, tri, COL.green, 'best', 0.45);
        else if (kind === 'tri-farther') drawTriangle(v, tri, COL.amber, 'tris', 0.25);
        else if (kind === 'tri-miss') drawTriangle(v, tri, COL.gray, 'tris', 0.12);
        else drawTriangle(v, tri, COL.dim, 'tris');
      });
      for (const [id, kind] of st.nodeKind) if (id !== r.node[cur]) wireBox(v, r.lo[id], r.hi[id], STEP_COLOR[kind], 'node');
      if (cur >= 0) {
        const id = r.node[cur], size = [r.hi[id][0] - r.lo[id][0], r.hi[id][1] - r.lo[id][1], r.hi[id][2] - r.lo[id][2]];
        v.box(P(r.lo[id]), V(size[0], 0, 0), V(0, size[1], 0), V(0, 0, size[2]), COL.gold, { k: 'node', opacity: 0.08 });
        if (r.tri[cur] >= 0) drawTriangle(v, r.sc.tris[r.tri[cur]], COL.gold, 'node', 0.5);
      }
      v.bar(P(r.o), P(addA(r.o, mulA(r.dir, 16))), COL.gold, { r: 0.012, k: 'ray' });
      if (Number.isFinite(st.best)) v.point(P(addA(r.o, mulA(r.dir, st.best))), COL.green, { r: 0.07, k: 'best', label: 'nearest', anchor: 'ar' });
    },
    explain(m, r) {
      const st = stateAt(r, r.upto), cur = r.upto - 1;
      const N = r.triCount, done = r.upto >= r.steps;
      const total = r.boxTests + r.triTests;
      const rows = [
        `{node|step ${r.upto} of ${r.steps}}: ${describe(r, cur)}`,
        `{boxes|box tests} ${st.boxes}${done ? '' : ` of ${r.boxTests}`} + {tris|triangle tests} ${st.tris}${done ? '' : ` of ${r.triTests}`} = ${st.boxes + st.tris}; brute force makes {brute|${N} triangle tests}`,
        `tree: ${r.nodeCount} nodes, ${Math.max(...r.depth)} levels deep, split by the ${m.method === 'sah' ? 'surface area heuristic' : 'median'}, leaves of up to ${r.sc.leaf} triangles${m.prune === 1 ? ', boxes beyond the nearest hit skipped' : ''}`,
      ];
      if (done) rows.push(r.hitTri >= 0 ? `{best|nearest hit}: t = ${f(r.t, 3)} on triangle ${r.hitTri}; brute force finds t = ${f(r.bruteResult.t, 3)} on triangle ${r.bruteResult.tri}` : 'no triangle is hit; brute force agrees');
      const status = done
        ? { text: `${r.boxTests} box tests + ${r.triTests} triangle tests = ${total}, against ${N} triangle tests by brute force${total >= N ? ': on a scene this small the boxes cost more than they save' : ''}`, tone: total < N ? 'ok' : 'warn' }
        : { text: cur < 0 ? 'press the step buttons, or drag the slider' : `${describe(r, cur)}`, tone: 'info' };
      const bunny = R.frameCost(69451, 1920 * 1080, 3);
      return {
        hud: `{node|step ${r.upto} / ${r.steps}}  {boxes|${st.boxes} boxes} + {tris|${st.tris} triangles} tested  vs {brute|${N}}`,
        rows, status,
        values: [['box tests', `${st.boxes} of ${r.boxTests}`, 'boxes'], ['triangle tests', `${st.tris} of ${r.triTests}`, 'tris'], ['brute force', `${N} triangle tests`, 'brute'],
          ['nearest t', Number.isFinite(st.best) ? f(st.best, 3) : 'none yet', 'best'], ['levels', `⌈log₂ ${N}⌉ = ${r.levels}`], ['ideal tree', `${r.withTree} box tests`]],
        fact: `A balanced tree over ${N} triangles has ⌈log₂ ${N}⌉ = ${r.levels} levels, so about 2 × ${r.levels} = ${r.withTree} box tests per ray in the best case. The bunny (69,451 triangles) at 1920 × 1080 and three rays per pixel: ${sci(bunny.brute)} tests by brute force, ${sci(bunny.withTree)} with a tree, ${commas(bunny.speedup)} times fewer.`,
      };
    },
    panelTitle: 'The traversal, step by step',
    panel(host, m, r, ctx) {
      current = { m, ctx, r };
      once(host, 'traverse', (h) => {
        const row = el('div', 'rl-step', h);
        const go = (to) => { current.m.step = Math.max(0, Math.min(current.r.steps, to)); current.ctx.update(); };
        btn(row, '|◀', () => { stopPlay(); go(0); }, 'Back to the start');
        btn(row, '◀', () => { stopPlay(); go(current.m.step - 1); }, 'Back one test');
        const slider = el('input', '', row);
        slider.type = 'range';
        slider.min = '0';
        slider.value = '0';
        slider.setAttribute('aria-label', 'step through the traversal');
        slider.addEventListener('input', () => { stopPlay(); go(Number(slider.value)); });
        btn(row, '▶', () => { stopPlay(); go(current.m.step + 1); }, 'Forward one test');
        btn(row, '▶|', () => { stopPlay(); go(current.r.steps); }, 'To the end');
        const play = btn(row, 'play', () => {
          if (player) { stopPlay(); return; }
          if (current.m.step >= current.r.steps) go(0);
          player = setInterval(() => { if (current.m.step >= current.r.steps) stopPlay(); else go(current.m.step + 1); }, 380);
        }, 'Step through at a steady pace');
        play.dataset.role = 'play';
        el('output', '', row);
        el('div', 'rl-tree', h);
        const key = el('div', 'rl-key', h);
        key.innerHTML = `<span><i style="background:${STEP_HEX.descend}"></i>box hit, descend</span><span><i style="background:${STEP_HEX.leaf}"></i>leaf reached</span><span><i style="background:${STEP_HEX.miss}"></i>box missed</span><span><i style="background:${STEP_HEX.skipped}"></i>skipped: beyond the nearest hit</span><span><i style="background:#ffd166"></i>this step</span>`;
        const scenes = el('div', 'lab-btns', h);
        el('span', 'rl-seglabel', scenes, 'scene');
        for (const [id, label] of SCENE_BTNS) btn(scenes, label, () => { const s = SCENE_LIST[id]; const mm = current.m; mm.scene = id; mm.o.set(...s.ray.o); mm.d.set(...s.ray.d); mm.step = 0; if (id === 'deck') { mm.method = 'median'; mm.prune = 0; } stopPlay(); current.ctx.update(); }).dataset.value = id;
        const methods = el('div', 'lab-btns', h);
        el('span', 'rl-seglabel', methods, 'split');
        for (const [id, label] of [['median', 'median'], ['sah', 'surface area']]) btn(methods, label, () => { current.m.method = id; current.m.step = 0; stopPlay(); current.ctx.update(); }).dataset.value = id;
        const pruneRow = el('div', 'lab-btns', h);
        el('span', 'rl-seglabel', pruneRow, 'skip far boxes');
        for (const [id, label] of [[0, 'off'], [1, 'on']]) btn(pruneRow, label, () => { current.m.prune = id; current.m.step = 0; stopPlay(); current.ctx.update(); }).dataset.value = String(id);
      });
      const slider = host.querySelector('input[type=range]');
      slider.max = String(r.steps);
      slider.value = String(m.step);
      host.querySelector('output').textContent = `${m.step} / ${r.steps}`;
      host.querySelector('.rl-tree').innerHTML = treeSvg(r, r.upto);
      host.querySelector('[data-role=play]').classList.toggle('on', player !== null);
      host.querySelectorAll('.lab-btns').forEach((rowEl) => {
        const first = rowEl.querySelector('.rl-seglabel')?.textContent;
        if (!first) return;
        const want = first === 'scene' ? m.scene : first === 'split' ? m.method : String(m.prune);
        rowEl.querySelectorAll('[data-value]').forEach((b) => b.classList.toggle('on', b.dataset.value === want));
      });
    },
  };
}

// ================================================================ the surface area heuristic on a real node
function sahView() {
  const AXES = ['x', 'y', 'z'];
  function sweepFor(sc, axis, cTrav) {
    return R.sweepSplits(sc.lo, sc.hi, sc.centroid, sc.tris.map((_, i) => i), axis, cTrav, 1);
  }
  function bestOverAxes(sc, cTrav) {
    let best = null;
    for (let a = 0; a < 3; a++) {
      const sweep = sweepFor(sc, a, cTrav);
      if (!best || sweep.bestCost < best.sweep.bestCost) best = { axis: a, sweep };
    }
    return best;
  }
  const kOf = (cut, n) => Math.max(1, Math.min(n - 1, Math.round(1 + cut * (n - 2))));
  const cutOf = (k, n) => (k - 1) / (n - 2);
  return {
    id: 'bvh.sah', topic: 'bvh', label: 'surface area heuristic', group: 'bvh', home: { eye: [4.6, 3, 14.5], target: [4.6, 2.9, 0] }, inputTitle: 'A candidate split of the root',
    init: { scene: 'deck', method: 'median', prune: 0, step: 0, o: DECK_RAY.o, d: DECK_RAY.d, axis: 0, cut: 0.5, cTrav: 1 },
    params: [
      { id: 'axis', label: 'axis (0 x, 1 y, 2 z)', min: 0, max: 2, step: 1 },
      { id: 'cut', label: 'split position', min: 0, max: 1, step: 0.005 },
      { id: 'cTrav', label: 'C_trav (C_tri = 1)', min: 0.25, max: 8, step: 0.25 },
    ],
    regions: ['BVH: boxes and areas', 'BVH: the surface area heuristic'],
    presets: [
      { label: 'two clusters, median cut', run: (m) => { m.scene = 'clustered'; m.cTrav = 1; const sc = sceneOf('clustered'); m.axis = 0; m.cut = cutOf(Math.floor(sc.tris.length / 2), sc.tris.length); } },
      { label: 'best cut on this axis', run: (m) => { const sc = sceneOf(m.scene); m.cut = cutOf(sweepFor(sc, Math.round(m.axis), m.cTrav).best, sc.tris.length); } },
      { label: 'best cut of all three axes', run: (m) => { const sc = sceneOf(m.scene), b = bestOverAxes(sc, m.cTrav); m.axis = b.axis; m.cut = cutOf(b.sweep.best, sc.tris.length); } },
      { label: 'figure: 14 triangles', run: (m) => { m.scene = 'deck'; m.axis = 0; const sc = sceneOf('deck'); m.cut = cutOf(7, sc.tris.length); m.cTrav = 1; } },
      { label: 'two clusters', run: (m) => { m.scene = 'clustered'; m.axis = 0; m.cut = 0.5; m.cTrav = 1; } },
      { label: 'traversal costs 8', set: { cTrav: 8 } },
    ],
    run(m) {
      const sc = sceneOf(m.scene), n = sc.tris.length, axis = Math.max(0, Math.min(2, Math.round(m.axis)));
      m.axis = axis;
      const sweep = sweepFor(sc, axis, m.cTrav), k = kOf(m.cut, n);
      const sah = R.sahCost(sweep.areaParent, sweep.areaLeft[k - 1], sweep.areaRight[k - 1], k, n - k, m.cTrav, 1);
      const left = sweep.sorted.slice(0, k), right = sweep.sorted.slice(k);
      const boxOf = (ids) => ids.reduce((b, i) => ({ lo: R.minPoint(b.lo, sc.lo[i]), hi: R.maxPoint(b.hi, sc.hi[i]) }), { lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] });
      const all = bestOverAxes(sc, m.cTrav);
      const { sorted, ...rest } = sweep;
      const parentBox = boxOf(sorted), size = R.sub(parentBox.hi, parentBox.lo);
      return { ...rest, ...sah, area: R.boxArea(parentBox.lo, parentBox.hi), dx: size[0], dy: size[1], dz: size[2], n, k, axis, sc, sweepSorted: sorted, left, right, leftBox: boxOf(left), rightBox: boxOf(right), parentBox, all, cutAt: (sc.centroid[sorted[k - 1]][axis] + sc.centroid[sorted[k]][axis]) / 2 };
    },
    draw(v, m, r) {
      const inLeft = new Set(r.left);
      r.sc.tris.forEach((tri, i) => drawTriangle(v, tri, inLeft.has(i) ? COL.a : COL.b, inLeft.has(i) ? 'areaL' : 'areaR', 0.18));
      wireBox(v, r.parentBox.lo, r.parentBox.hi, COL.white, 'areaP');
      for (const [box, color, key] of [[r.leftBox, COL.a, 'areaL'], [r.rightBox, COL.b, 'areaR']]) {
        const size = [box.hi[0] - box.lo[0], box.hi[1] - box.lo[1], box.hi[2] - box.lo[2]];
        v.box(P(box.lo), V(size[0], 0, 0), V(0, size[1], 0), V(0, 0, size[2]), color, { k: key, opacity: 0.07 });
      }
      const mid = mulA(addA(r.parentBox.lo, r.parentBox.hi), 0.5), normal = [0, 0, 0];
      normal[r.axis] = 1;
      mid[r.axis] = r.cutAt;
      const half = Math.max(...[0, 1, 2].filter((a) => a !== r.axis).map((a) => (r.parentBox.hi[a] - r.parentBox.lo[a]) / 2));
      v.plane(P(mid), P(normal), half, COL.gold, { opacity: 0.14, grid: false, k: 'split' });
    },
    explain(m, r) {
      const N = r.n, cT = m.cTrav;
      const better = r.cost < r.leafCost;
      const rows = [
        `A = ${f(r.areaParent, 2)} (the root's box),  {areaL|A_L} = ${f(r.areaLeft[r.k - 1], 2)} (${r.k} triangles),  {areaR|A_R} = ${f(r.areaRight[r.k - 1], 2)} (${N - r.k} triangles)`,
        `{cost|cost} = C_trav + (A_L/A)·n_L·C_tri + (A_R/A)·n_R·C_tri = ${g(cT, 2)} + ${f(r.pLeft, 3)} × ${r.k} + ${f(r.pRight, 3)} × ${N - r.k} = ${f(r.cost, 2)}`,
        `{leaf|no split}: n·C_tri = ${N}`,
        `{split|median cut}: after ${r.medianK} triangles, cost ${f(r.medianCost, 2)};  {best|best cut on the ${AXES[r.axis]} axis}: after ${r.best}, cost ${f(r.bestCost, 2)}`,
        `best of the three axes: ${AXES[r.all.axis]}, after ${r.all.sweep.best} triangles, cost ${f(r.all.sweep.bestCost, 2)}`,
      ];
      const status = better
        ? { text: `splitting here costs ${f(r.cost, 2)}, less than the ${N} of leaving ${N} triangles in one leaf: worth it`, tone: 'ok' }
        : { text: `splitting here costs ${f(r.cost, 2)}, no less than ${N} for one leaf: the builder makes a leaf`, tone: 'warn' };
      const top = Math.max(r.leafCost * 1.05, 2);
      return {
        hud: `{cost|cost ${f(r.cost, 2)}}  vs {leaf|${N}} unsplit  ·  k = ${r.k}`,
        rows, status,
        chart: { curve: `cost after k triangles, ${AXES[r.axis]} axis`, x: [0, N], y: [0, Number(top.toFixed(1))], xLabel: 'k', at: r.k, atY: r.cost,
          bars: r.costs.map((c, i) => ({ x: i + 1, y: c, color: i + 1 === r.best ? COL.gold : i + 1 === r.medianK ? COL.green : COL.dim })) },
        values: [['A_L / A', f(r.pLeft, 3), 'areaL'], ['A_R / A', f(r.pRight, 3), 'areaR'], ['left cost', f(r.costLeft, 2), 'areaL'], ['right cost', f(r.costRight, 2), 'areaR'], ['this cut', f(r.cost, 2), 'cost'], ['median cut', f(r.medianCost, 2), 'split']],
        fact: 'Bars: gold is the cheapest cut on this axis, green the median. The median counts triangles; the heuristic counts how likely a ray is to enter each child, so it cuts between clusters. MacDonald and Booth (1990). It tries every cut between neighbors along the sorted centroids (a sweep); binned builders try a fixed number.',
      };
    },
  };
}

// ================================================================ the formula by the numbers
function numbersView() {
  return {
    id: 'bvh.numbers', topic: 'bvh', label: 'heuristic by the numbers', home: { eye: [0, 0, 9], target: [0, 0, 0] }, grid: 'none', axes: false, inputTitle: 'Child areas and counts',
    init: { pL: 0.6, pR: 0.5, nL: 7, nR: 7, cTrav: 1 },
    params: [
      { id: 'pL', label: 'A_L / A', min: 0, max: 1.2, step: 0.05 },
      { id: 'pR', label: 'A_R / A', min: 0, max: 1.2, step: 0.05 },
      { id: 'nL', label: 'n_L triangles', min: 0, max: 30, step: 1 },
      { id: 'nR', label: 'n_R triangles', min: 0, max: 30, step: 1 },
      { id: 'cTrav', label: 'C_trav (C_tri = 1)', min: 0, max: 8, step: 0.25 },
    ],
    regions: ['BVH: the surface area heuristic'],
    presets: [
      { label: 'deck: 7 + 7, areas 0.6 and 0.5', set: { pL: 0.6, pR: 0.5, nL: 7, nR: 7, cTrav: 1 } },
      { label: 'deck: overlapping, 0.9 and 0.9', set: { pL: 0.9, pR: 0.9, nL: 7, nR: 7, cTrav: 1 } },
      { label: 'children as big as the parent', set: { pL: 1, pR: 1, nL: 7, nR: 7, cTrav: 1 } },
      { label: 'one triangle split off', set: { pL: 0.05, pR: 0.95, nL: 1, nR: 13, cTrav: 1 } },
      { label: 'traversal costs 8', set: { pL: 0.6, pR: 0.5, nL: 7, nR: 7, cTrav: 8 } },
    ],
    run(m) {
      const sah = R.sahCost(1, m.pL, m.pR, Math.round(m.nL), Math.round(m.nR), m.cTrav, 1);
      return { ...sah, nL: Math.round(m.nL), nR: Math.round(m.nR) };
    },
    draw(v, m, r) {
      // the parent's box as a square of area 1 and each child's as a square of area A_child / A, from opposite corners
      const side = 4, sl = side * Math.sqrt(m.pL), sr = side * Math.sqrt(m.pR);
      const sq = (x0, y0, s, color, key, fill) => { const c = [V(x0, y0, 0), V(x0 + s, y0, 0), V(x0 + s, y0 + s, 0), V(x0, y0 + s, 0)]; if (fill > 0) v.patch(c, color, fill, { k: key }); v.poly(c, color, { closed: true, k: key }); };
      sq(-side / 2, -side / 2, side, COL.white, 'areaP', 0.04);
      sq(-side / 2, -side / 2, sl, COL.a, 'areaL', 0.22);
      sq(side / 2 - sr, side / 2 - sr, sr, COL.b, 'areaR', 0.22);
      v.label('parent, area 1', V(0, -side / 2 - 0.45, 0), COL.white, '');
      v.label(`left: ${r.nL}`, V(-side / 2 + sl / 2, -side / 2 + sl / 2, 0), COL.a, '', 'areaL');
      v.label(`right: ${r.nR}`, V(side / 2 - sr / 2, side / 2 - sr / 2, 0), COL.b, '', 'areaR');
    },
    explain(m, r) {
      const rows = [
        `{areaL|A_L/A} = ${f(m.pL, 2)} with n_L = ${r.nL},  {areaR|A_R/A} = ${f(m.pR, 2)} with n_R = ${r.nR}`,
        `{cost|cost} = C_trav + (A_L/A)·n_L·C_tri + (A_R/A)·n_R·C_tri = ${g(m.cTrav, 2)} + ${f(m.pL, 2)} × ${r.nL} + ${f(m.pR, 2)} × ${r.nR} = ${f(r.cost, 2)}`,
        `{leaf|no split}: (n_L + n_R)·C_tri = ${r.nL + r.nR}`,
      ];
      const status = r.worthIt
        ? { text: `${f(r.cost, 2)} < ${r.leafCost}: splitting beats a leaf${r.cost > 0.9 * r.leafCost ? ', barely' : ''}`, tone: r.cost > 0.9 * r.leafCost ? 'warn' : 'ok' }
        : { text: `${f(r.cost, 2)} ≥ ${r.leafCost}: no better than a leaf, so the builder stops`, tone: 'bad' };
      return {
        hud: `{cost|cost ${f(r.cost, 2)}}  vs {leaf|${r.leafCost}} unsplit`,
        rows, status,
        values: [['left term', f(r.costLeft, 2), 'areaL'], ['right term', f(r.costRight, 2), 'areaR'], ['this split', f(r.cost, 2), 'cost'], ['no split', String(r.leafCost), 'leaf']],
        fact: 'The chance that a ray hitting the parent also hits a child is about the ratio of their surface areas. Two children that overlap, or that are nearly as big as the parent, save almost nothing; the heuristic prefers small, separate boxes over equal counts.',
      };
    },
  };
}

export function makeBvhViews() {
  return [traverseView(), sahView(), numbersView()];
}
