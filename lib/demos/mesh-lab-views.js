// mesh-lab-views: the catalog behind the mesh-lab demo (runtime: lib/core/lab.js). Each view works on the same mesh, the document in
// mesh-lab-doc.js, so a file loaded under one topic can be taken through all of them. run() calls the program's own functions
// (lib/programs/mesh-lab/webgl/meshlab.js), so the numbers beside the code are that code's output.
//   makeViews(doc, S): S is the surface drawn in the scene (mesh-lab.js); a stub in the node tests.
import * as THREE from '../vendor/three.module.js';
import * as ML from '../programs/mesh-lab/webgl/meshlab.js';
import { COL, V } from '../core/lab-viz.js';
import { pickTriangle } from './mesh-lab-doc.js';

export const TOPICS = [
  { id: 'files', label: 'Files' }, { id: 'winding', label: 'Winding' }, { id: 'topology', label: 'Topology' },
  { id: 'normals', label: 'Normals' }, { id: 'build', label: 'Build' }, { id: 'process', label: 'Process' },
];

export const KEYS = {
  n: COL.gold, nHat: COL.gold, e1: COL.a, e2: COL.b, s: COL.cyan, area: COL.c, V: COL.b, E: COL.amber, F: COL.c, T: COL.c, chi: COL.gold,
  a: COL.a, b: COL.b, c: COL.c, soup: COL.a, indexed: COL.c, front: COL.c, back: COL.amber, bad: COL.red, loops: COL.amber, genus: COL.purple,
  ring: COL.c, he: COL.gold, next: COL.c, twin: COL.pink, valence: COL.c, hard: COL.red, groups: COL.c, cost: COL.gold, best: COL.gold,
  acmr: COL.gold, misses: COL.red, degenerate: COL.red, crossed: COL.gold, caseIndex: COL.gold,
};

const HOME = { eye: [3.5, 2.6, 5], target: [0, 0, 0] };
const CLOSE = { eye: [2.2, 1.5, 3.4], target: [0, 0, 0] };
const CUBEVIEW = { eye: [3.3, 2.5, 4.5], target: [0, 0, 0] };

const P = (a) => V(a[0], a[1], a[2]);
const f = (x, d = 2) => (Number.isFinite(x) ? (Number(x.toFixed(d)) === 0 ? (0).toFixed(d) : x.toFixed(d)).replace('-', '−') : 'none');
const s0 = (x) => (Number.isFinite(x) ? String(Number((Math.abs(x) < 5e-3 ? 0 : x).toFixed(2))).replace('-', '−') : 'none');
const vt = (a) => `(${s0(a[0])}, ${s0(a[1])}, ${s0(a[2])})`;
const it = (a) => `(${a.join(', ')})`;
const bytes = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)} MB` : n >= 1024 ? `${(n / 1024).toFixed(1)} kB` : `${n} bytes`);
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const centroid = (a, b, c) => [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
const toward = (p, q, k) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k];
const hex3 = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

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
/** a row of mutually exclusive buttons; returns its show() */
function segmented(parent, label, options, get, set) {
  const row = el('div', 'lab-btns ml-seg', parent);
  el('span', 'ml-seglabel', row, label);
  const bs = options.map(([value, text]) => {
    const b = btn(row, text, () => { set(value); show(); });
    b.dataset.value = value;
    return b;
  });
  function show() { bs.forEach((b) => b.classList.toggle('on', b.dataset.value === String(get()))); }
  show();
  return show;
}
/** panels build once per view, and update what changes */
function once(host, id, build) {
  if (host.dataset.built === id) return false;
  host.innerHTML = '';
  host.dataset.built = id;
  build(host);
  return true;
}

export function makeViews(doc, S) {
  const INIT = { t: 0, v: 0, e: 0, h: 0, cull: 'back', weighting: 'area', shading: 'phong', arrows: 'on', tab: 'original' };
  const clamp = (m) => {
    m.t = Math.max(0, Math.min(doc.tris.length - 1, Math.round(m.t)));
    m.v = Math.max(0, Math.min(doc.positions.length - 1, Math.round(m.v)));
    m.e = Math.max(0, Math.min(doc.edges.edges.length - 1, Math.round(m.e)));
    m.h = Math.max(0, Math.min(doc.he.from.length - 1, Math.round(m.h)));
  };
  const triParam = () => ({ id: 't', label: 'triangle', min: 0, max: Math.max(1, doc.tris.length - 1), step: 1 });
  const showMesh = (extra = {}) => {
    S.use({ cull: 'none', shading: 'flat', wire: true, ...extra.use });
    S.show({ key: `${doc.version}|flat`, positions: doc.positions, tris: doc.tris, ...extra });
  };
  const cornersOf = (t) => doc.tris[t].map((i) => doc.positions[i]);

  /** the triangle under the mouse, drawn lightly */
  let hoverTri = -1;
  const hoverable = () => doc.tris.length <= 4000;
  function hoverHandler(ray, e, ctx) {
    if (!hoverable()) return;
    const hit = pickTriangle(doc.positions, doc.tris, ray.origin, ray.dir);
    const t = hit ? hit.tri : -1;
    if (t !== hoverTri) { hoverTri = t; ctx.refresh(); }
  }
  function drawHover(v, selected) {
    if (hoverTri < 0 || hoverTri >= doc.tris.length || hoverTri === selected) return;
    const [a, b, c] = cornersOf(hoverTri);
    v.patch([P(a), P(b), P(c)], COL.white, 0.14, { k: 'hover' });
  }
  /** the selected triangle: its fill, its corners by index, in order */
  function drawTriangle(v, t, { labels = true, color = COL.gold, fill = 0.32 } = {}) {
    const tri = doc.tris[t];
    const [a, b, c] = tri.map((i) => doc.positions[i]);
    if (fill > 0) v.patch([P(a), P(b), P(c)], color, fill, { k: 'tri' });
    v.poly([P(a), P(b), P(c)], color, { closed: true, k: 'tri' });
    if (labels) {
      tri.forEach((i, k) => {
        v.point(P(doc.positions[i]), [COL.a, COL.b, COL.c][k], { r: 0.055, k: ['a', 'b', 'c'][k] });
        v.label(`${['1st', '2nd', '3rd'][k]}: v${i}`, P(doc.positions[i]), [COL.a, COL.b, COL.c][k], 'a', ['a', 'b', 'c'][k]);
      });
    }
  }
  /** the edges of a triangle in the order its indices walk them */
  function drawWalk(v, tri) {
    const pts = tri.map((i) => doc.positions[i]);
    const cen = centroid(...pts);
    const n = ML.normalize(ML.faceNormal(...pts).n);
    const lifted = pts.map((p) => ML.add(toward(p, cen, 0.2), ML.scale(n, 0.02)));
    for (let k = 0; k < 3; k++) {
      const from = lifted[k], to = lifted[(k + 1) % 3];
      v.arrow(P(toward(from, to, 0.08)), P(toward(from, to, 0.92)), [COL.a, COL.b, COL.c][k], { r: 0.014, hr: 0.05, head: 0.16, k: 'walk' });
    }
  }

  const FORMAT_REGION = { obj: 'Files: read an OBJ', off: 'Files: read an OFF', ply: 'Files: read an ASCII PLY', stl: 'Files: read an STL', 'stl-binary': 'Files: read an STL' };

  // ------------------------------------------------------------ Files: one mesh, every representation
  const filesState = { tab: 'original', editing: false, lastKey: '', error: '' };
  const TABS = [['original', 'original'], ['vf', 'V + F lists'], ['ve', 'V + E lists'], ['he', 'half-edges'], ['soup', 'soup'], ['obj', 'OBJ'], ['off', 'OFF'], ['ply', 'PLY'], ['stl', 'STL'], ['gltf', 'glTF']];

  /** a tab's text, line by line, each line naming what it stores: { text, t?, v?, e?, h? } */
  function linesOf(tab) {
    return doc.get(`lines:${tab}`, () => {
      const out = [];
      const addVertices = () => {
        out.push({ text: `vertices (${doc.positions.length}), each stored once:`, head: true });
        doc.positions.forEach((p, i) => out.push({ text: `v[${i}] = ${vt(doc.filePoint(p))}`, v: i }));
      };
      if (tab === 'vf') {
        addVertices();
        out.push({ text: `triangles (${doc.tris.length}), indices into v[]:`, head: true });
        doc.tris.forEach((t, i) => out.push({ text: `t[${i}] = ${it(t)}`, t: i }));
      } else if (tab === 've') {
        addVertices();
        out.push({ text: `edges (${doc.edges.edges.length}), with the faces on each side:`, head: true });
        doc.edges.edges.forEach((e, i) => out.push({ text: `e[${i}] = (${e[0]}, ${e[1]})  faces ${e[2]}, ${e[3] === -1 ? 'none' : e[3]}`, e: i }));
      } else if (tab === 'he') {
        out.push({ text: `half-edges (${doc.he.from.length}): from -> to, face, next, twin`, head: true });
        for (let h = 0; h < doc.he.from.length; h++) {
          out.push({ text: `h[${h}]  ${doc.he.from[h]} -> ${doc.he.to[h]}   face ${doc.he.face[h]}   next ${doc.he.next[h]}   twin ${doc.he.twin[h] === -1 ? 'none' : doc.he.twin[h]}`, h, t: doc.he.face[h] });
        }
      } else if (tab === 'soup') {
        out.push({ text: `triangle soup (${doc.tris.length}): every triangle repeats its corners`, head: true });
        doc.tris.forEach((t, i) => out.push({ text: `t[${i}]  ${t.map((v) => vt(doc.filePoint(doc.positions[v]))).join('  ')}`, t: i }));
      } else if (tab === 'original') {
        const faceTri = [];
        let at = 0;
        doc.faces.forEach((face, i) => { faceTri[i] = at; at += Math.max(0, face.length - 2); });
        let vi = 0, fi = 0;
        doc.source.split('\n').forEach((line) => {
          const entry = { text: line };
          if (doc.format === 'obj' && !doc.edited) {
            if (/^\s*v\s/.test(line)) entry.v = vi++;
            else if (/^\s*f\s/.test(line)) entry.t = faceTri[fi++];
          }
          out.push(entry);
        });
      } else {
        const lines = doc.text(tab).split('\n');
        const V_ = doc.positions.length, firstV = { obj: 0, off: 2, ply: 9 }[tab];
        const firstF = firstV + V_;
        const faceTri = [];
        let at = 0;
        doc.faces.forEach((face, i) => { faceTri[i] = at; at += Math.max(0, face.length - 2); });
        lines.forEach((text, i) => {
          const entry = { text };
          if (tab === 'stl') {
            if (i >= 1 && i < 1 + 7 * doc.tris.length) entry.t = Math.floor((i - 1) / 7);
          } else if (tab !== 'gltf') {
            if (i >= firstV && i < firstF) entry.v = i - firstV;
            else if (i >= firstF) entry.t = faceTri[i - firstF];
          }
          out.push(entry);
        });
      }
      return out;
    });
  }

  function renderList(host, m) {
    const lines = linesOf(filesState.tab);
    const isSel = (l) => (l.h !== undefined ? l.h === m.h && filesState.tab === 'he' : l.e !== undefined ? l.e === m.e : l.t !== undefined ? l.t === m.t : false);
    let at = lines.findIndex(isSel);
    if (at < 0) at = 0;
    const from = Math.max(0, at - 150), to = Math.min(lines.length, from + 320);
    const key = `${doc.version}|${filesState.tab}|${from}|${at}`;
    if (filesState.lastKey === key) return;
    filesState.lastKey = key;
    const parts = [];
    if (from > 0) parts.push(`<div class="ml-line ml-more">${from} lines above</div>`);
    for (let i = from; i < to; i++) {
      const l = lines[i];
      const data = l.h !== undefined ? ` data-h="${l.h}" data-t="${l.t}"` : l.e !== undefined ? ` data-e="${l.e}"` : l.t !== undefined ? ` data-t="${l.t}"` : l.v !== undefined ? ` data-v="${l.v}"` : '';
      const cls = `ml-line${l.head ? ' ml-head' : ''}${i === at && isSel(l) ? ' on' : ''}`;
      parts.push(`<div class="${cls}"${data}>${l.text.replace(/&/g, '&amp;').replace(/</g, '&lt;') || ' '}</div>`);
    }
    if (to < lines.length) parts.push(`<div class="ml-line ml-more">${lines.length - to} lines below</div>`);
    host.innerHTML = parts.join('');
    const on = host.querySelector('.on');
    if (on) host.scrollTop = Math.max(0, on.offsetTop - host.clientHeight / 2);
  }

  const filesView = {
    id: 'files', topic: 'files', label: 'file formats', group: 'mesh', init: INIT, home: HOME, inputTitle: 'Selection',
    panelTitle: 'The same mesh, as data',
    get params() { return [triParam()]; },
    get regions() {
      const tab = filesState.tab;
      if (tab === 'original') return [FORMAT_REGION[doc.format], ...(doc.format.startsWith('stl') ? ['Files: weld a soup'] : []), 'Two arrays: triangles from faces'];
      return { vf: ['Two arrays: triangles from faces', 'Two arrays: soup against indexed'], ve: ['Topology: the edge list'], he: ['Half-edges: build them'], soup: ['Two arrays: soup against indexed', 'Files: weld a soup'],
        obj: ['Files: write an OBJ'], off: ['Files: write an OFF'], ply: ['Files: write an ASCII PLY'], stl: ['Files: write an STL'], gltf: ['Files: glTF\'s description of the buffers'] }[tab];
    },
    run(m) {
      clamp(m);
      return { positions: doc.positions, faces: doc.faces, tris: doc.tris, polygons: doc.faces.length, removed: doc.welded, ...doc.bytes, ...doc.edges, ...doc.he };
    },
    draw(v, m) {
      showMesh();
      drawHover(v, m.t);
      const tab = filesState.tab;
      if (tab === 've' || tab === 'he') {
        const ends = tab === 've' ? doc.edges.edges[m.e].slice(0, 2) : [doc.he.from[m.h], doc.he.to[m.h]];
        const [p, q] = ends.map((i) => doc.positions[i]);
        if (tab === 'he') {
          drawTriangle(v, m.t, { labels: false, fill: 0.16 });
          v.arrow(P(p), P(q), COL.gold, { r: 0.03, hr: 0.09, k: 'he' });
        } else v.bar(P(p), P(q), COL.gold, { r: 0.035, k: 'edge' });
        ends.forEach((i) => v.label(`v${i}`, P(doc.positions[i]), COL.gold));
      } else drawTriangle(v, m.t);
    },
    explain(m) {
      const b = doc.bytes, T = doc.tris.length, V_ = doc.positions.length;
      const quads = doc.faces.length !== T;
      const tri = doc.tris[m.t];
      const small = T <= 30000;
      return {
        hud: `{V|${V_} vertices}, {T|${T} triangles}: soup {soup|${bytes(b.soup)}}, indexed {indexed|${bytes(b.indexed)}}`,
        rows: [
          `{name|${doc.name}}${doc.edited ? ', edited' : ''}: read as ${doc.format.replace('-binary', ' (binary)').toUpperCase()}`,
          ...(doc.welded ? [`A soup of ${doc.fileVertices} corners: welding removed ${doc.welded}, leaving {V|${V_}}.`] : []),
          ...(quads ? [`${doc.faces.length} polygon faces in the file become {T|${T} triangles}.`] : []),
          `{soup|soup} = ${T} × 3 × 12 = {soup|${b.soup}} bytes`,
          `{indexed|indexed} = ${V_} × 12 + ${T} × 3 × ${b.indexSize} = {indexed|${b.indexed}} bytes`,
        ],
        values: [
          ['triangle', `t[${m.t}] = ${it(tri)}`, 'tri'], ['saved', `${f(b.ratio)} times`, 'indexed'],
          ...(small ? [['OBJ', bytes(doc.text('obj').length)], ['OFF', bytes(doc.text('off').length)], ['PLY', bytes(doc.text('ply').length)], ['STL', bytes(doc.text('stl').length)]] : []),
          ['glTF buffers', bytes(V_ * 12 + T * 3 * b.indexSize)], ...(doc.drawScale !== 1 ? [['drawn at', `× ${f(doc.drawScale, 3)}`]] : []),
        ],
        fact: 'Click a triangle, or a line of a listing: the two select each other. A format is a choice of what to spell out: a soup repeats positions, indexed lists share them, half-edges store the neighbors a listing would otherwise have to search for.',
      };
    },
    panel(host, m, r, ctx) {
      let list;
      once(host, 'files', (h) => {
        const tabs = el('div', 'lab-btns ml-tabs', h);
        TABS.forEach(([id, label]) => {
          const b = btn(tabs, label, () => { filesState.tab = id; filesState.editing = false; filesState.lastKey = ''; ctx.refresh(); });
          b.dataset.tab = id;
        });
        el('div', 'ml-list', h);
        const edit = el('div', 'ml-edit', h);
        edit.style.display = 'none';
        const area = el('textarea', 'ml-area', edit);
        area.spellcheck = false;
        const row = el('div', 'lab-btns ml-editrow', edit);
        btn(row, 'apply', () => {
          const err = doc.loadText(`${doc.name}, edited`, doc.format, area.value);
          filesState.error = err || '';
          if (!err) { filesState.editing = false; filesState.lastKey = ''; ctx.setView('files'); } else ctx.refresh();
        });
        btn(row, 'cancel', () => { filesState.editing = false; filesState.error = ''; ctx.refresh(); });
        const foot = el('div', 'lab-btns ml-foot', h);
        const editBtn = btn(foot, 'edit the text', () => { filesState.editing = true; filesState.lastKey = ''; area.value = doc.source; ctx.refresh(); }, 'Change the file and read it again');
        editBtn.classList.add('ml-editbtn');
        btn(foot, 'save this text', () => {
          const tab = filesState.tab;
          const text = linesOf(tab).map((l) => l.text).join('\n');
          const ext = { original: doc.format.replace('-binary', ''), obj: 'obj', off: 'off', ply: 'ply', stl: 'stl', gltf: 'gltf' }[tab] || 'txt';
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
          a.download = `${String(doc.name).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.${ext}`;
          a.click();
          URL.revokeObjectURL(a.href);
        }, 'Download what this tab shows');
        el('div', 'ml-err', h);
        h.querySelector('.ml-list').addEventListener('click', (e) => {
          const line = e.target.closest('.ml-line');
          if (!line) return;
          const d = line.dataset;
          if (d.t !== undefined) m.t = Number(d.t);
          if (d.v !== undefined) m.v = Number(d.v);
          if (d.e !== undefined) m.e = Number(d.e);
          if (d.h !== undefined) m.h = Number(d.h);
          ctx.update();
        });
      });
      list = host.querySelector('.ml-list');
      host.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === filesState.tab));
      const editing = filesState.editing && filesState.tab === 'original';
      list.style.display = editing ? 'none' : '';
      host.querySelector('.ml-edit').style.display = editing ? '' : 'none';
      host.querySelector('.ml-foot').style.display = editing ? 'none' : '';
      host.querySelector('.ml-editbtn').style.display = filesState.tab === 'original' && !doc.format.endsWith('binary') ? '' : 'none';
      host.querySelector('.ml-err').textContent = filesState.error;
      if (!editing) renderList(list, m);
    },
    onPick(ray, e, ctx) {
      const hit = pickTriangle(doc.positions, doc.tris, ray.origin, ray.dir);
      if (!hit) return;
      const m = ctx.state();
      m.t = hit.tri;
      m.v = hit.vertex;
      m.h = 3 * hit.tri + hit.edgeFromCorner;
      const a = doc.tris[hit.tri][hit.edgeFromCorner], b = doc.tris[hit.tri][(hit.edgeFromCorner + 1) % 3];
      const ei = doc.edges.edges.findIndex((x) => (x[0] === a && x[1] === b) || (x[0] === b && x[1] === a));
      if (ei >= 0) m.e = ei;
      ctx.update();
    },
    onHover: hoverHandler,
  };

  /** the eye and the triangle's corners on screen, in the model's coordinates */
  function eyeOf(ctx) {
    if (!ctx || !ctx.camera) return [0, 0, 10];
    const c = ctx.camera.position;
    return [c.x, c.y, ctx.mirror ? -c.z : c.z];
  }
  function onScreen(ctx, pts) {
    if (!ctx || !ctx.camera) return [[0, 0], [1, 0], [0, 1]];
    return pts.map((p) => {
      const s = new THREE.Vector3(p[0], p[1], ctx.mirror ? -p[2] : p[2]).project(ctx.camera);
      return [s.x, s.y];
    });
  }
  const pickTriOnly = (ray, e, ctx) => {
    const hit = pickTriangle(doc.positions, doc.tris, ray.origin, ray.dir);
    if (!hit) return;
    ctx.state().t = hit.tri;
    ctx.update();
  };

  // ------------------------------------------------------------ the views
  const list = [
    filesView,

    {
      id: 'winding', topic: 'winding', label: 'reverse a triangle', group: 'mesh', init: INIT, home: HOME, cameraDependent: true, inputTitle: 'Selection',
      panelTitle: 'Winding and culling',
      get params() { return [triParam()]; },
      regions: ['Winding: reverse a triangle', 'Winding: which side faces the eye', 'Winding: is the mesh consistent', 'Winding: repair it'],
      keys: { s: COL.cyan, area2: COL.cyan, before: COL.white, after: COL.white },
      run(m, ctx) {
        clamp(m);
        const [a, b, c] = cornersOf(m.t);
        const face = ML.facesEye(a, b, c, eyeOf(ctx));
        const [p0, p1, p2] = onScreen(ctx, [a, b, c]);
        const screen = ML.screenArea(p0, p1, p2);
        const rev = ML.reverseTriangle(doc.tris, m.t);
        return { ...face, ...screen, before: rev.before, after: rev.after, tris: rev.tris, reversed: rev.tris, ...doc.winding };
      },
      draw(v, m, r) {
        S.use({ cull: m.cull, shading: 'flat', wire: true });
        S.show({ key: `${doc.version}|flat`, positions: doc.positions, tris: doc.tris });
        drawHover(v, m.t);
        const [a, b, c] = cornersOf(m.t);
        const nHat = ML.normalize(r.n);
        const cen = centroid(a, b, c);
        const culled = (m.cull === 'back' && !r.front) || (m.cull === 'front' && r.front);
        drawTriangle(v, m.t, { fill: culled ? 0 : 0.3 });
        drawWalk(v, doc.tris[m.t]);
        v.arrow(P(cen), P(ML.add(cen, ML.scale(nHat, 1))), COL.gold, { r: 0.03, hr: 0.09, k: 'n', label: 'n', anchor: 'a' });
        for (const [x, y] of r.bad.slice(0, 500)) v.bar(P(doc.positions[x]), P(doc.positions[y]), COL.red, { r: 0.024, k: 'bad' });
      },
      explain(m, r, ctx) {
        const lh = ctx && ctx.mirror;
        const culled = (m.cull === 'back' && !r.front) || (m.cull === 'front' && r.front);
        const rule = lh ? 'clockwise' : 'counter-clockwise';
        return {
          hud: `t[${m.t}] = ${it(doc.tris[m.t])}: {n} = {e1} × {e2} = {n|${vt(r.n)}}`,
          rows: [
            `{e1} = ${vt(r.e1)}, {e2} = ${vt(r.e2)}, {n} = {e1} × {e2} = {n|${vt(r.n)}}`,
            `{s} = {n}·(eye − {a}) = {s|${f(r.s)}}: ${r.front ? '{front|front} faces the eye' : '{back|back} faces the eye'}`,
            `on screen, 2 × area = {s|${f(r.area2, 4)}}: ${r.ccw ? 'counter-clockwise' : 'clockwise'}, and ${rule} is the front`,
            r.consistent ? 'every shared edge is walked in opposite directions' : `{bad|${plural(r.count, 'edge is', 'edges are')}} walked the same way by both triangles`,
          ],
          status: culled ? { text: `${r.front ? 'front' : 'back'} face: culled, so this triangle is not drawn`, tone: 'bad' }
            : m.cull === 'none' ? { text: `culling off: front faces in blue, back faces in orange. This one: ${r.front ? 'front' : 'back'}`, tone: 'info' }
              : { text: `${r.front ? 'front' : 'back'} face: drawn`, tone: 'ok' },
          values: [['t', it(doc.tris[m.t]), 'tri'], ['reversed', it(r.after), 'tri'], ['side', r.front ? 'front' : 'back', 's'], ['bad edges', String(r.count), 'bad']],
          fact: 'Reverse a triangle with culling on and it vanishes, leaving a hole you can see through; orbit to look from inside and it is the only one drawn. The positions never moved. Unity treats clockwise as the front on its left-handed axes, the mirror of this rule, so the same indices face the same way: RH switches the picture.',
        };
      },
      panel(host, m, r, ctx) {
        once(host, 'winding', (h) => {
          const row = el('div', 'lab-btns', h);
          const first = btn(row, 'reverse this triangle', () => { doc.edit(ML.reverseTriangle(doc.tris, m.t).tris); ctx.update(); }, 'Swap two of its indices');
          first.classList.add('ml-primary');
          btn(row, 'flip all', () => { doc.edit(doc.tris.map(([a, b, c]) => [a, c, b])); ctx.update(); }, 'Turn the mesh inside out');
          btn(row, 'repair', () => { doc.edit(ML.reorient(doc.tris).tris); ctx.update(); }, 'Make the mesh consistent by flooding across shared edges');
          btn(row, 'restore', () => { doc.reset(); ctx.update(); }, 'Back to the mesh as the file has it');
          segmented(h, 'cull', [['none', 'off'], ['back', 'back faces'], ['front', 'front faces']], () => m.cull, (x) => { m.cull = x; ctx.update(); });
        });
      },
      onPick: pickTriOnly,
      onHover: hoverHandler,
    },

    {
      id: 'topo.euler', topic: 'topology', label: 'Euler\'s formula', group: 'mesh', init: INIT, home: HOME, inputTitle: 'Selection',
      panelTitle: 'Change the surface',
      get params() { return [triParam()]; },
      regions: ['Topology: Euler\'s formula', 'Topology: the edge list', 'Topology: boundary loops'],
      keys: { chi: COL.gold },
      run(m) { clamp(m); return { ...doc.euler, ...doc.edges, ...doc.loops }; },
      draw(v, m) {
        showMesh();
        drawHover(v, m.t);
        drawTriangle(v, m.t, { labels: false, fill: 0.22 });
        doc.loops.loops.slice(0, 40).forEach((loop) => {
          if (loop.length > 2000) return;
          for (let i = 0; i < loop.length; i++) v.bar(P(doc.positions[loop[i]]), P(doc.positions[loop[(i + 1) % loop.length]]), COL.amber, { r: 0.022, k: 'loops' });
        });
      },
      explain() {
        const e = doc.euler;
        return {
          hud: `{V} − {E} + {F} = ${e.V} − ${e.E} + ${e.F} = {chi|${e.chi}}`,
          rows: [
            `{chi|χ} = 2C − 2g − b, with C = ${e.components} ${e.components === 1 ? 'piece' : 'pieces'}, b = {loops|${e.loops}} boundary ${e.loops === 1 ? 'loop' : 'loops'}`,
            `so {genus|g} = (2 × ${e.components} − ${e.chi} − ${e.loops}) / 2 = {genus|${e.genus}}`,
            ...(e.unreferenced ? [`${plural(e.unreferenced, 'vertex', 'vertices')} that no triangle uses, not counted`] : []),
            ...(e.nonManifold ? [`{bad|${plural(e.nonManifold, 'edge')}} with more than two faces: not a surface there`] : []),
          ],
          status: e.nonManifold ? { text: 'non-manifold: some edge has more than two faces', tone: 'bad' }
            : e.loops ? { text: `open: ${plural(e.loops, 'boundary loop')}, drawn in amber`, tone: 'warn' }
              : e.genus ? { text: `closed, with ${plural(e.genus, 'hole')} through it`, tone: 'info' } : { text: 'closed, with no holes: χ = 2', tone: 'ok' },
          values: [['V', String(e.V), 'V'], ['E', String(e.E), 'E'], ['F', String(e.F), 'F'], ['χ', String(e.chi), 'chi'], ['g', String(e.genus), 'genus'], ['b', String(e.loops), 'loops']],
          fact: 'Three counts and a subtraction test a mesh. Delete a triangle from a closed mesh: F falls by 1, and χ with it, and a boundary loop appears. The 69,451-triangle bunny has χ = −3: five holes in its base, where the scanner could not see.',
        };
      },
      panel(host, m, r, ctx) {
        once(host, 'topo.euler', (h) => {
          const row = el('div', 'lab-btns', h);
          btn(row, 'delete this triangle', () => {
            if (doc.tris.length > 1) doc.edit(doc.tris.filter((_, i) => i !== m.t));
            ctx.setView('topo.euler');
          }).classList.add('ml-primary');
          btn(row, 'restore', () => { doc.reset(); ctx.setView('topo.euler'); });
        });
      },
      onPick: pickTriOnly,
      onHover: hoverHandler,
    },

    {
      id: 'topo.halfedge', topic: 'topology', label: 'half-edges', group: 'mesh', init: INIT, home: HOME,
      panelTitle: 'Walk the mesh',
      regions: ['Half-edges: build them', 'Half-edges: walk the ring of a vertex'],
      keys: { from: COL.gold, to: COL.gold, ring: COL.c, prev: COL.purple },
      run(m) {
        clamp(m);
        const he = doc.he;
        const walk = ML.vertexRing(he, m.h);
        return { ...he, ...walk, h: m.h, prev: he.next[he.next[m.h]] };
      },
      draw(v, m, r) {
        showMesh();
        drawHover(v, doc.he.face[m.h]);
        const he = doc.he;
        const arrow = (h, color, k, rad = 0.022) => {
          const tri = doc.tris[he.face[h]];
          const cen = centroid(...tri.map((i) => doc.positions[i]));
          const n = ML.scale(ML.faceNormal(...tri.map((i) => doc.positions[i])).nHat, 0.03);
          const a = ML.add(toward(doc.positions[he.from[h]], cen, 0.15), n), b = ML.add(toward(doc.positions[he.to[h]], cen, 0.15), n);
          v.arrow(P(toward(a, b, 0.06)), P(toward(a, b, 0.94)), color, { r: rad, hr: rad * 3.2, head: 0.18, k });
        };
        v.patch(doc.tris[he.face[m.h]].map((i) => P(doc.positions[i])), COL.gold, 0.2, { k: 'he' });
        arrow(he.next[m.h], COL.c, 'next');
        arrow(he.next[he.next[m.h]], COL.purple, 'prev');
        if (he.twin[m.h] !== -1) arrow(he.twin[m.h], COL.pink, 'twin');
        arrow(m.h, COL.gold, 'he', 0.034);
        const center = he.from[m.h];
        v.point(P(doc.positions[center]), COL.gold, { r: 0.09, k: 'from', label: `v${center}`, anchor: 'a' });
        if (r.ring.length <= 64) {
          r.ring.forEach((u) => {
            v.dashed(P(doc.positions[center]), P(doc.positions[u]), COL.c, { k: 'ring', dash: 0.06, gap: 0.05 });
            v.point(P(doc.positions[u]), COL.c, { r: 0.05, k: 'ring', label: `v${u}`, anchor: 'a' });
          });
        }
      },
      explain(m, r) {
        const he = doc.he;
        return {
          hud: `h[${m.h}]: {from|v${he.from[m.h]}} → {to|v${he.to[m.h]}}, {next|next} ${he.next[m.h]}, {twin|twin} ${he.twin[m.h] === -1 ? 'none' : he.twin[m.h]}`,
          rows: [
            `in face ${he.face[m.h]}; {next|next} = h[${he.next[m.h]}], {prev|next.next} = h[${r.prev}]`,
            `{twin|twin} = ${he.twin[m.h] === -1 ? 'none: this edge is on a boundary' : `h[${he.twin[m.h]}], in face ${he.face[he.twin[m.h]]}`}`,
            `next.next.twin, repeated: the {ring|ring} of v${he.from[m.h]} is ${r.ring.length > 12 ? `${r.ring.slice(0, 12).join(', ')}, ...` : r.ring.join(', ')}`,
          ],
          status: r.closed ? { text: `the walk came back to its start: valence ${r.valence}`, tone: 'ok' } : { text: `the walk ended at a boundary: valence ${r.valence}`, tone: 'warn' },
          values: [['half-edges', String(he.from.length), 'he'], ['with no twin', String(he.twin.filter((x) => x === -1).length), 'twin'], ['valence', String(r.valence), 'ring']],
          fact: 'An index array answers "draw it". Editing needs neighbors, and half-edges answer "which face is across this edge" and "what is around this vertex" without a search. Click a triangle near an edge to pick that half-edge.',
        };
      },
      panel(host, m, r, ctx) {
        once(host, 'topo.halfedge', (h) => {
          const row = el('div', 'lab-btns', h);
          btn(row, 'next', () => { m.h = doc.he.next[m.h]; ctx.update(); }).dataset.go = 'next';
          btn(row, 'next.next', () => { m.h = doc.he.next[doc.he.next[m.h]]; ctx.update(); });
          btn(row, 'twin', () => { const t = doc.he.twin[m.h]; if (t !== -1) m.h = t; ctx.update(); }).dataset.go = 'twin';
          btn(row, 'ring step: next.next.twin', () => {
            const t = doc.he.twin[doc.he.next[doc.he.next[m.h]]];
            if (t !== -1) m.h = t;
            ctx.update();
          }).classList.add('ml-primary');
        });
      },
      onPick(ray, e, ctx) {
        const hit = pickTriangle(doc.positions, doc.tris, ray.origin, ray.dir);
        if (!hit) return;
        ctx.state().h = 3 * hit.tri + hit.edgeFromCorner;
        ctx.update();
      },
      onHover: hoverHandler,
    },

    {
      id: 'topo.valence', topic: 'topology', label: 'valence', group: 'mesh', init: INIT, home: HOME,
      regions: ['Topology: valence'],
      run(m) { clamp(m); return { ...doc.valence }; },
      draw() {
        const val = doc.valence.valence;
        const palette = { 3: COL.red, 4: COL.amber, 5: COL.gold, 6: COL.c, 7: COL.cyan, 8: COL.b };
        const colorOf = (t, k) => hex3(palette[val[doc.tris[t][k]]] ?? COL.purple);
        S.use({ cull: 'none', shading: 'flat', wire: true });
        S.show({ key: `${doc.version}|valence`, positions: doc.positions, tris: doc.tris, colorOf });
      },
      explain() {
        const { histogram, mean } = doc.valence;
        const e = doc.euler;
        const top = Math.max(...histogram.slice(1), 1);
        const bars = histogram.map((y, x) => ({ x, y, color: x === 6 ? COL.c : COL.b })).filter((b) => b.y > 0);
        const mode = histogram.indexOf(top);
        return {
          hud: `mean {valence} = {valence|${f(mean, 3)}}`,
          rows: [
            `{E} / {V} = ${e.E} / ${e.V} = ${f(e.E / e.V)}, {F} / {V} = ${e.F} / ${e.V} = ${f(e.F / e.V)}`,
            `the mean valence is 2E / V = {valence|${f((2 * e.E) / e.V, 3)}}`,
            `valence ${mode} is the most common, at ${f((100 * top) / e.V, 1)} % of the vertices`,
          ],
          chart: { x: [-0.5, Math.max(9.5, histogram.length - 0.5)], y: [0, top * 1.1], xLabel: 'valence', curve: 'vertices of each valence', bars },
          values: [['V', String(e.V), 'V'], ['mean', f(mean, 3), 'valence']],
          fact: 'On a large closed mesh every triangle has 3 edges and every edge 2 triangles, so 3F = 2E, and Euler then gives E ≈ 3V: the average valence tends to 6. Colors: green is 6. An icosahedron is all 5s; subdividing it keeps those twelve and adds only 6s.',
        };
      },
    },

    {
      id: 'normals.face', topic: 'normals', label: 'a face', group: 'mesh', init: INIT, home: HOME, inputTitle: 'Selection',
      get params() { return [triParam()]; },
      regions: ['Normals: a face', 'Normals: Newell\'s polygon normal'],
      run(m) {
        clamp(m);
        const [a, b, c] = cornersOf(m.t);
        const fn = ML.faceNormal(a, b, c);
        const face = doc.faces[doc.triFace[m.t]];
        const nw = ML.newellNormal(face.map((i) => doc.positions[i]));
        return { ...fn, newellN: nw.n, polygon: face };
      },
      draw(v, m, r) {
        showMesh();
        drawHover(v, m.t);
        const [a, b, c] = cornersOf(m.t);
        drawTriangle(v, m.t, { labels: false });
        v.arrow(P(a), P(b), COL.a, { r: 0.022, k: 'e1', label: 'e1', anchor: 'a' });
        v.arrow(P(a), P(c), COL.b, { r: 0.022, k: 'e2', label: 'e2', anchor: 'a' });
        v.arrow(P(centroid(a, b, c)), P(ML.add(centroid(a, b, c), r.nHat)), COL.gold, { r: 0.03, hr: 0.09, k: 'nHat', label: 'n̂', anchor: 'a' });
        v.arrow(P(a), P(ML.add(a, r.n)), COL.gold, { r: 0.012, hr: 0.05, k: 'n', label: 'n', anchor: 'a' });
        if (doc.tris.length <= 2000) {
          doc.tris.forEach((t) => {
            const pts = t.map((i) => doc.positions[i]);
            const cen = centroid(...pts);
            v.dashed(P(cen), P(ML.add(cen, ML.scale(ML.faceNormal(...pts).nHat, 0.35))), COL.gray, { k: 'all', dash: 0.05, gap: 0.03 });
          });
        }
      },
      explain(m, r) {
        const poly = r.polygon.length > 3;
        return {
          hud: `{n} = {e1} × {e2} = {n|${vt(r.n)}},  area = {area|${f(r.area)}}`,
          rows: [
            `{e1} = ${vt(r.e1)},  {e2} = ${vt(r.e2)}`,
            `{n} = {n|${vt(r.n)}},  |{n}| / 2 = {area|${f(r.area)}}`,
            `{nHat|n̂} = {nHat|${vt(r.nHat)}}`,
            ...(poly ? [`this triangle comes from a ${r.polygon.length}-sided face; Newell's sum over its corners is ${vt(r.newellN)}`] : []),
          ],
          status: r.area < ML.EPS ? { text: 'zero area: the corners are collinear, and there is no normal', tone: 'bad' } : { text: 'the winding sets the direction; reverse it under Winding and this arrow flips', tone: 'ok' },
          values: [['n', vt(r.n), 'n'], ['area', f(r.area), 'area'], ['n̂', vt(r.nHat), 'nHat']],
          fact: 'On the 2 x 2 grid, triangle 1 gives (−0.6, 2.25, −0.6). Pick the cube for Newell\'s method: a quad\'s normal from all four corners.',
        };
      },
      onPick: pickTriOnly,
      onHover: hoverHandler,
    },

    {
      id: 'normals.vertex', topic: 'normals', label: 'a vertex; shading', group: 'mesh', init: INIT, home: HOME,
      panelTitle: 'Weighting and shading',
      regions: ['Normals: a vertex'],
      keys: { sum: COL.gold },
      run(m) {
        clamp(m);
        const normals = doc.get(`normals:${m.weighting}`, () => ML.vertexNormals(doc.positions, doc.tris, m.weighting).normals);
        return { normals, sums: normals };
      },
      draw(v, m, r) {
        const smooth = m.shading !== 'flat';
        S.use({ cull: 'none', shading: m.shading, wire: m.shading === 'flat' });
        S.show({ key: `${doc.version}|${smooth ? m.weighting : 'flat'}`, positions: doc.positions, tris: doc.tris, normalOf: smooth ? (t, k) => r.normals[doc.tris[t][k]] : null });
        if (m.arrows === 'on' && doc.positions.length <= 3000) {
          doc.positions.forEach((p, i) => { if (doc.cornersOf[i].length) v.bar(P(p), P(ML.add(p, ML.scale(r.normals[i], 0.32))), COL.gold, { r: 0.007, k: 'normals' }); });
        }
        const p = doc.positions[m.v];
        v.point(P(p), COL.gold, { r: 0.075, k: 'v', label: `v${m.v}`, anchor: 'a' });
        doc.cornersOf[m.v].slice(0, 32).forEach((t) => {
          const pts = doc.tris[t].map((i) => doc.positions[i]);
          v.patch(pts.map(P), COL.gold, 0.18, { k: 'faces' });
          const cen = centroid(...pts);
          v.arrow(P(cen), P(ML.add(cen, ML.scale(ML.faceNormal(...pts).nHat, 0.5))), COL.cyan, { r: 0.012, hr: 0.04, head: 0.12, k: 'faces' });
        });
        v.arrow(P(p), P(ML.add(p, r.normals[m.v])), COL.gold, { r: 0.03, hr: 0.09, k: 'normals', label: 'n', anchor: 'a' });
      },
      explain(m, r) {
        const faces = doc.cornersOf[m.v].length;
        const others = ['uniform', 'area', 'angle'].map((w) => [w, doc.get(`normals:${w}`, () => ML.vertexNormals(doc.positions, doc.tris, w).normals)[m.v]]);
        return {
          hud: `n[${m.v}] = normalize( Σ faces ) = {n|${vt(r.normals[m.v])}}`,
          rows: [
            `v${m.v} touches ${plural(faces, 'face')}, weighted by ${m.weighting}`,
            ...others.map(([w, n]) => `${w}: ${vt(n)}`),
          ],
          status: { flat: { text: 'flat: each face uses its own normal, so the facets show', tone: 'info' }, gouraud: { text: 'Gouraud: light computed at the vertices and interpolated, so a highlight between vertices is lost', tone: 'info' }, phong: { text: 'Phong: normals interpolated and light computed per pixel', tone: 'ok' } }[m.shading],
          values: [['n', vt(r.normals[m.v]), 'normals'], ['faces', String(faces), 'faces']],
          fact: 'Same triangles and positions under all three shadings; only the normals and where they are evaluated change. On the lifted 2 x 2 grid, area-weighted normal n1 = (−0.087, 0.981, −0.174) leans away from the peak.',
        };
      },
      panel(host, m, r, ctx) {
        once(host, 'normals.vertex', (h) => {
          segmented(h, 'weight', [['uniform', 'equal'], ['area', 'area'], ['angle', 'angle']], () => m.weighting, (x) => { m.weighting = x; ctx.update(); });
          segmented(h, 'shade', [['flat', 'flat'], ['gouraud', 'Gouraud'], ['phong', 'Phong']], () => m.shading, (x) => { m.shading = x; ctx.update(); });
          segmented(h, 'normals', [['on', 'show'], ['off', 'hide']], () => m.arrows, (x) => { m.arrows = x; ctx.update(); });
        });
      },
      onPick(ray, e, ctx) {
        const hit = pickTriangle(doc.positions, doc.tris, ray.origin, ray.dir);
        if (!hit) return;
        ctx.state().v = hit.vertex;
        ctx.update();
      },
    },

    {
      id: 'normals.hard', topic: 'normals', label: 'hard edges', group: 'mesh', init: { ...INIT, crease: 30 }, home: HOME, inputTitle: 'Crease angle',
      params: [{ id: 'crease', label: 'crease', min: 0, max: 180, step: 1, unit: '°' }],
      regions: ['Normals: split at hard edges'],
      keys: { groups: COL.c, hard: COL.red },
      presets: [{ label: 'cube', run() { loadBuiltin('cube'); } }, { label: 'icosphere, 80 faces', run() { loadBuiltin('icosphere1'); } }, { label: '30°', set: { crease: 30 } }, { label: 'every edge hard', set: { crease: 0 } }, { label: 'all smooth', set: { crease: 180 } }],
      run(m) {
        clamp(m);
        const crease = m.crease === 0 ? 0.001 : m.crease;
        return doc.get(`crease:${crease}`, () => ML.splitByCrease(doc.positions, doc.tris, crease));
      },
      draw(v, m, r) {
        S.use({ cull: 'none', shading: 'phong', wire: false });
        S.show({ key: `${doc.version}|crease${m.crease}`, positions: doc.positions, tris: doc.tris, normalOf: (t, k) => r.normals[r.groupOfCorner[3 * t + k]] });
        r.hard.slice(0, 3000).forEach(([a, b]) => v.bar(P(doc.positions[a]), P(doc.positions[b]), COL.red, { r: 0.012, k: 'hard' }));
      },
      explain(m, r) {
        const V_ = doc.euler.V;
        return {
          hud: `{V|${V_} positions} → {groups|${r.groups} vertices} at ${f(m.crease, 0)}°`,
          rows: [
            `{hard|${plural(r.hard.length, 'edge')}} meet at more than ${f(m.crease, 0)}°`,
            `each position splits once per smooth group: {groups|${r.groups}} vertices`,
            `memory: ${bytes(r.groups * 24 + doc.tris.length * 6)} with normals, against ${bytes(V_ * 24 + doc.tris.length * 6)} unsplit`,
          ],
          status: r.groups === V_ ? { text: 'no vertex is split: every normal is an average, so a sharp corner would look rounded', tone: 'info' } : { text: 'one position, several vertices: this is why a file\'s vertex count and a GPU\'s differ', tone: 'ok' },
          values: [['positions', String(V_), 'V'], ['vertices', String(r.groups), 'groups'], ['hard edges', String(r.hard.length), 'hard']],
          fact: 'A cube has 8 positions and 24 vertices at any crease under 90°: 6 faces × 4 corners. An 80-face sphere has 42 smooth and 240 with every edge hard. Texture seams force the same split.',
        };
      },
    },

    {
      id: 'build.subdivide', topic: 'build', label: 'subdivide', group: 'mesh', init: { ...INIT, level: 1, onSphere: 'yes' }, home: HOME, inputTitle: 'Level',
      panelTitle: 'Where the new vertices go',
      params: [{ id: 'level', label: 'level', min: 0, max: 5, step: 1 }],
      regions: ['Build: subdivide', 'Build: an icosahedron'],
      presets: [{ label: 'icosahedron', run() { loadBuiltin('icosahedron'); } }, { label: 'tetrahedron', run() { loadBuiltin('tetrahedron'); } }, { label: 'cube', run() { loadBuiltin('cube'); } }],
      run(m) {
        let positions = doc.positions, tris = doc.tris;
        const R = ML.meanRadius(positions);
        let level = 0;
        for (; level < m.level && tris.length * 4 <= 400000; level++) {
          const key = `sub:${m.onSphere}:${level + 1}`;
          const prev = { positions, tris };
          ({ positions, tris } = doc.get(key, () => ML.subdivide(prev.positions, prev.tris, m.onSphere === 'yes' ? R : 0)));
        }
        return { positions, tris, reached: level, finer: tris, points: positions };
      },
      draw(v, m, r) {
        S.use({ cull: 'none', shading: 'flat', wire: r.tris.length < 30000 });
        S.show({ key: `${doc.version}|sub${m.onSphere}${r.reached}`, positions: r.positions, tris: r.tris });
      },
      explain(m, r) {
        const e = ML.eulerCheck(r.positions.length, r.tris);
        return {
          hud: `{V} − {E} + {F} = ${e.V} − ${e.E} + ${e.F} = {chi|${e.chi}}`,
          rows: [
            `level ${r.reached}: {F} = ${doc.tris.length} × 4^${r.reached} = {F|${e.F}}`,
            `every edge gives a new vertex, so {V} grows by {E} at each level`,
            ...(r.reached < m.level ? [`stopped at level ${r.reached}, past 400,000 triangles`] : []),
          ],
          status: m.onSphere === 'yes' ? { text: 'on the sphere: each level is a closer approximation, χ unchanged', tone: 'ok' } : { text: 'flat: more triangles, and the shape does not change at all', tone: 'info' },
          values: [['V', String(e.V), 'V'], ['E', String(e.E), 'E'], ['F', String(e.F), 'F'], ['χ', String(e.chi), 'chi']],
          fact: 'From the icosahedron: 12, 42, 162, 642 vertices and 20, 80, 320, 1280 faces, with χ = 2 every time. The first twelve keep valence 5 forever; every later vertex has valence 6.',
        };
      },
      panel(host, m, r, ctx) {
        once(host, 'build.subdivide', (h) => {
          segmented(h, 'place', [['yes', 'on the sphere'], ['no', 'at the midpoints']], () => m.onSphere, (x) => { m.onSphere = x; doc.touch(); ctx.update(); });
          const row = el('div', 'lab-btns', h);
          btn(row, 'keep this mesh', () => {
            const res = r2.current;
            if (res) {
              const text = ML.writeObj(res.positions, res.tris);
              doc.install(`${doc.name}, subdivided`, 'obj', `# subdivided\n${text}`, ML.parseObj(text));
              m.level = 0;
              ctx.setView('build.subdivide');
            }
          }, 'Make this the current mesh, for the other topics');
        });
        r2.current = r;
      },
    },

    {
      id: 'build.sweep', topic: 'build', label: 'sweep', home: CLOSE, inputTitle: 'Profile (r, y)', handleSize: 0.05,
      init: { p0: [0, -1, 0], p1: [0.5, -0.9, 0], p2: [0.7, -0.5, 0], p3: [0.45, 0.1, 0], p4: [0.35, 0.5, 0], p5: [0.5, 0.9, 0], p6: [0.55, 1, 0], segments: 16, collapse: 'no' },
      handles: ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6'].map((id) => ({ id, color: COL.amber, fixed: 'z' })),
      params: [{ id: 'segments', label: 'segments', min: 3, max: 64, step: 1 }],
      panelTitle: 'The pole',
      regions: ['Build: a surface of revolution'],
      presets: [
        { label: 'closed at both ends', set: { p0: [0, -1, 0], p1: [0.5, -0.9, 0], p2: [0.7, -0.5, 0], p3: [0.45, 0.1, 0], p4: [0.35, 0.5, 0], p5: [0.3, 0.9, 0], p6: [0, 1, 0] } },
        { label: 'sphere', set: { p0: [0, -1, 0], p1: [0.59, -0.81, 0], p2: [0.95, -0.31, 0], p3: [1, 0, 0], p4: [0.95, 0.31, 0], p5: [0.59, 0.81, 0], p6: [0, 1, 0] } },
        { label: 'open tube', set: { p0: [0.5, -1, 0], p1: [0.5, -0.66, 0], p2: [0.5, -0.33, 0], p3: [0.5, 0, 0], p4: [0.5, 0.33, 0], p5: [0.5, 0.66, 0], p6: [0.5, 1, 0] } },
      ],
      edited(m) { for (let i = 0; i < 7; i++) if (m[`p${i}`].x < 0) m[`p${i}`].x = 0; },
      run(m) {
        const profile = [];
        for (let i = 0; i < 7; i++) profile.push([m[`p${i}`].x, m[`p${i}`].y]);
        return ML.surfaceOfRevolution(profile, m.segments, m.collapse === 'yes');
      },
      draw(v, m, r) {
        S.use({ cull: 'none', shading: 'flat', wire: true });
        const shape = [0, 1, 2, 3, 4, 5, 6].map((i) => `${m[`p${i}`].x},${m[`p${i}`].y}`).join(';');
        S.show({ key: `sweep|${m.segments}|${m.collapse}|${shape}`, positions: r.positions, tris: r.tris });
        const pts = [];
        for (let i = 0; i < 7; i++) pts.push(m[`p${i}`].clone());
        v.poly(pts, COL.amber, { k: 'profile' });
        for (let i = 0; i < 7; i++) {
          if (Math.abs(m[`p${i}`].x) < ML.EPS && m.collapse !== 'yes') {
            v.point(m[`p${i}`], COL.red, { r: 0.09, k: 'degenerate', label: 'degenerate ring', anchor: 'r' });
          }
        }
      },
      explain(m, r) {
        const P_ = 7, S_ = m.segments;
        const poles = [0, 1, 2, 3, 4, 5, 6].filter((i) => Math.abs(m[`p${i}`].x) < ML.EPS).length;
        const e = ML.eulerCheck(r.positions.length, r.tris);
        return {
          hud: `{V|${r.positions.length} vertices}, {T|${r.tris.length} triangles}, {degenerate|${r.degenerate} of zero area}`,
          rows: [
            m.collapse === 'yes' && poles ? `(P − ${poles}) × S + ${poles} = ${(P_ - poles) * S_ + poles} vertices: each pole is one vertex` : `P × S = ${P_} × ${S_} = ${P_ * S_} vertices`,
            `{T|${r.tris.length}} triangles; a quad at a pole is one triangle and an empty one`,
            `χ = ${e.chi}, with ${plural(e.loops, 'boundary loop')}`,
          ],
          status: r.degenerate ? { text: `${r.degenerate} triangles have zero area: their normal is undefined, and shading breaks at the pole`, tone: 'bad' } : { text: poles ? 'each pole is one vertex: no degenerate triangles' : 'no point on the axis, so no pole', tone: 'ok' },
          values: [['V', String(r.positions.length), 'V'], ['T', String(r.tris.length), 'T'], ['zero area', String(r.degenerate), 'degenerate'], ['segments', String(S_)]],
          fact: 'Drag the profile. With 7 rows and 16 segments the lecture\'s profile gives 112 vertices and 16 degenerate triangles; one pole vertex gives 97 and none. Every vertex is the profile point turned by R_y.',
        };
      },
      panel(host, m, r, ctx) {
        once(host, 'build.sweep', (h) => {
          segmented(h, 'on the axis', [['no', 'a ring of copies'], ['yes', 'one vertex']], () => m.collapse, (x) => { m.collapse = x; ctx.update(); });
        });
      },
    },

    {
      id: 'build.cube', topic: 'build', label: 'one marching cube', home: CUBEVIEW, inputTitle: 'Corner values', grid: 'none', axes: false,
      init: { c0: 0.59, c1: 0.12, c2: -0.08, c3: 0.25, c4: 0.12, c5: -0.17, c6: -0.33, c7: -0.08, iso: 0 },
      params: [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ id: `c${i}`, label: `corner ${i}`, min: -1, max: 1, step: 0.01 })),
      regions: ['Build: one marching cube'],
      keys: { crossed: COL.gold },
      presets: [
        { label: 'the lecture\'s cell', set: { c0: 0.588, c1: 0.123, c2: -0.082, c3: 0.245, c4: 0.123, c5: -0.17, c6: -0.33, c7: -0.082 } },
        { label: 'one corner', set: { c0: 0.5, c1: -0.5, c2: -0.5, c3: -0.5, c4: -0.5, c5: -0.5, c6: -0.5, c7: -0.5 } },
        { label: 'one face', set: { c0: 0.5, c1: 0.5, c2: 0.5, c3: 0.5, c4: -0.5, c5: -0.5, c6: -0.5, c7: -0.5 } },
        { label: 'opposite corners', set: { c0: 0.5, c1: -0.5, c2: -0.5, c3: -0.5, c4: -0.5, c5: -0.5, c6: 0.5, c7: -0.5 } },
        { label: 'all inside', set: { c0: 0.5, c1: 0.5, c2: 0.5, c3: 0.5, c4: 0.5, c5: 0.5, c6: 0.5, c7: 0.5 } },
      ],
      run(m) {
        const values = [m.c0, m.c1, m.c2, m.c3, m.c4, m.c5, m.c6, m.c7];
        return { values, ...ML.marchingCell(values, m.iso) };
      },
      draw(v, m, r) {
        S.use({ visible: false });
        const size = 2.4;
        const place = (c) => [(c[0] - 0.5) * size, (c[1] - 0.5) * size, (c[2] - 0.5) * size];
        const corners = ML.cubeCorners().map(place);
        const pairs = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
        pairs.forEach(([a, b], e) => {
          const hit = r.crossed.includes(e);
          v.bar(P(corners[a]), P(corners[b]), hit ? COL.gold : COL.dim, { r: hit ? 0.016 : 0.008, k: hit ? 'crossed' : 'cube' });
        });
        corners.forEach((c, i) => {
          const inside = r.values[i] > m.iso;
          v.point(P(c), inside ? COL.c : COL.gray, { r: inside ? 0.09 : 0.06, k: 'corner', label: `${i}: ${f(r.values[i])}`, anchor: 'a' });
        });
        r.crossed.forEach((e, i) => v.point(P(place(r.points[i])), COL.gold, { r: 0.05, k: 'crossed', label: `e${e}`, anchor: 'r' }));
        r.triangles.forEach((t) => {
          const pts = t.map((e) => P(place(r.points[r.crossed.indexOf(e)])));
          v.patch(pts, COL.cyan, 0.42, { k: 'tris' });
          v.poly(pts, COL.cyan, { closed: true, k: 'tris' });
        });
      },
      explain(m, r) {
        const bits = r.caseIndex.toString(2).padStart(8, '0');
        const inside = r.values.map((x, i) => (x > m.iso ? i : -1)).filter((i) => i >= 0);
        return {
          hud: `case {caseIndex|${r.caseIndex}} = ${bits} in binary: {crossed|${plural(r.crossed.length, 'crossed edge')}}, ${plural(r.triangles.length, 'triangle')}`,
          rows: [
            `inside: ${inside.length ? `corners ${inside.join(', ')}` : 'no corner'}, bit i set when value[i] > iso`,
            ...(r.crossed.length ? [`crossed edges: ${r.crossed.join(', ')}`] : []),
            ...r.loops.map((l, i) => `loop ${i + 1}: edges ${l.join(' → ')}, ${l.length - 2} ${l.length === 3 ? 'triangle' : 'triangles'}`),
          ],
          status: r.crossed.length === 0 ? { text: 'all corners on one side: the surface does not enter this cube', tone: 'info' } : r.loops.length > 1 ? { text: 'two separate pieces: this is an ambiguous case, and neighboring cubes must resolve it the same way', tone: 'warn' } : { text: 'one closed loop of crossings, filled with a fan', tone: 'ok' },
          values: [['case', String(r.caseIndex), 'caseIndex'], ['triangles', String(r.triangles.length), 'tris']],
          fact: 'Eight inside-or-outside corners make 2^8 = 256 cases, 15 up to symmetry. Each crossing is placed by interpolating the corner values, so the surface moves smoothly as a value slides, while the case number changes only when a sign does.',
        };
      },
    },

    {
      id: 'build.march', topic: 'build', label: 'march a grid', home: { eye: [4.2, 3.2, 6], target: [0, 0, 0] }, inputTitle: 'Grid and surface',
      init: { n: 12, iso: 0, field: 'sphere' },
      params: [{ id: 'n', label: 'cells', min: 2, max: 40, step: 1 }, { id: 'iso', label: 'iso', min: -1.5, max: 1.5, step: 0.01, play: true }],
      panelTitle: 'The field',
      regions: ['Build: march a grid', 'Build: one marching cube'],
      keys: { cellsCrossed: COL.gold },
      run(m) {
        const half = { sphere: 2.2, torus: 2.5, blobs: 3 }[m.field];
        return { ...ML.marchGrid(m.field, m.n, m.iso, half), half };
      },
      draw(v, m, r) {
        S.use({ cull: 'none', shading: 'flat', wire: r.tris.length < 12000 });
        S.show({ key: `march|${m.field}|${m.n}|${m.iso}`, positions: r.positions, tris: r.tris });
        const h = r.half;
        const P8 = [[-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h], [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]];
        [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => v.poly([P(P8[a]), P(P8[b])], COL.dim));
      },
      explain(m, r) {
        const e = r.tris.length ? ML.eulerCheck(r.positions.length, r.tris) : { chi: 0, genus: 0, loops: 0, V: 0, E: 0, F: 0 };
        return {
          hud: `${m.n}³ = ${m.n ** 3} cells, {cellsCrossed|${r.cellsCrossed}} crossed: {T|${r.tris.length} triangles}`,
          rows: [
            `{V} − {E} + {F} = ${e.V} − ${e.E} + ${e.F} = {chi|${e.chi}}`,
            `g = {genus|${e.genus}}, b = {loops|${e.loops}}`,
          ],
          status: !r.tris.length ? { text: 'iso is outside the field\'s range: no surface', tone: 'info' } : e.loops ? { text: 'the surface runs out of the grid: it has a boundary there', tone: 'warn' } : { text: 'closed: shared crossings are merged, so neighboring cubes join without a crack', tone: 'ok' },
          values: [['cells crossed', String(r.cellsCrossed), 'cellsCrossed'], ['triangles', String(r.tris.length), 'T']],
          fact: 'Nothing here is a mesh until this runs: the input is values on a grid, as from a CT scan, a fluid or a signed distance field. Slide iso on the blobs and watch them merge: χ changes when the topology does.',
        };
      },
      panel(host, m, r, ctx) {
        once(host, 'build.march', (h) => {
          segmented(h, 'field', [['sphere', 'sphere'], ['torus', 'torus'], ['blobs', 'two blobs']], () => m.field, (x) => { m.field = x; ctx.update(); });
        });
      },
    },

    {
      id: 'proc.collapse', topic: 'process', label: 'edge collapse', group: 'mesh', init: INIT, home: HOME,
      panelTitle: 'Collapse',
      regions: ['Simplify: the quadric of an edge', 'Simplify: collapse an edge', 'Simplify: the cheapest collapse'],
      keys: { atA: COL.a, atB: COL.b, atMid: COL.gray, faces: COL.purple },
      presets: [{ label: 'the lecture\'s grid, edge v4 v1', run(m) { loadBuiltin('grid'); m.e = doc.edges.edges.findIndex((x) => x[0] === 1 && x[1] === 4); } }, { label: 'icosphere, 320 faces', run() { loadBuiltin('icosphere2'); } }, { label: 'bunny, 868 triangles', run() { loadBuiltin('bunny0'); } }],
      run(m) {
        clamp(m);
        const [a, b] = doc.edges.edges[m.e];
        return { a, b, ...ML.edgeCost(doc.positions, doc.tris, a, b) };
      },
      draw(v, m, r) {
        showMesh();
        const pa = doc.positions[r.a], pb = doc.positions[r.b];
        doc.tris.forEach((t) => { if (t.includes(r.a) || t.includes(r.b)) v.patch(t.map((i) => P(doc.positions[i])), COL.purple, 0.22, { k: 'faces' }); });
        v.bar(P(pa), P(pb), COL.red, { r: 0.028, k: 'edge' });
        v.point(P(pa), COL.a, { r: 0.07, k: 'atA', label: `v${r.a}`, anchor: 'a' });
        v.point(P(pb), COL.b, { r: 0.07, k: 'atB', label: `v${r.b}`, anchor: 'a' });
        v.point(P(ML.scale(ML.add(pa, pb), 0.5)), COL.gray, { r: 0.05, k: 'atMid' });
        v.point(P(r.best), COL.gold, { r: 0.08, k: 'best', label: 'best', anchor: 'r' });
      },
      explain(m, r) {
        const e = doc.euler;
        return {
          hud: `merge v${r.a} and v${r.b}: added squared distance {cost|${f(r.cost, 4)}}`,
          rows: [
            `{faces|${plural(r.faces, 'plane')}} of the faces touching either end`,
            `at v${r.a} {atA|${f(r.atA, 4)}}, at v${r.b} {atB|${f(r.atB, 4)}}, at the middle {atMid|${f(r.atMid, 4)}}`,
            `the quadric's minimum: {best|${vt(r.best)}}, {cost|${f(r.cost, 4)}}`,
          ],
          status: { text: `V − E + F = ${e.V} − ${e.E} + ${e.F} = ${e.chi}: a collapse removes 1, 3 and 2, so χ holds`, tone: 'ok' },
          values: [['triangles', String(doc.tris.length), 'T'], ['vertices', String(e.V), 'V'], ['cost', f(r.cost, 4), 'cost'], ['χ', String(e.chi), 'chi']],
          fact: 'Click near an edge to pick it. On the lecture\'s grid, edge v4 v1 costs 0.16 at v4, 1.4566 at v1, 0.4041 at the middle and 0.1353 at (0, 0.338, 0). Flat regions cost nothing, so simplification removes them first.',
        };
      },
      panel(host, m, r, ctx) {
        const collapse = (a, b, p) => {
          const step = ML.collapseEdge(doc.positions, doc.tris, a, b, p);
          const c = ML.compactVertices(step.positions, step.tris);
          doc.edit(c.tris, c.positions);
        };
        const cheapest = (count) => {
          for (let i = 0; i < count; i++) {
            const s = ML.cheapestCollapse(doc.positions, doc.tris);
            if (s.a < 0) break;
            collapse(s.a, s.b, s.point);
          }
          ctx.update();
        };
        once(host, 'proc.collapse', (h) => {
          const row = el('div', 'lab-btns', h);
          btn(row, 'collapse this edge', () => {
            if (doc.tris.length <= 4) return;
            const [a, b] = doc.edges.edges[m.e];
            const neighbors = ML.neighborsOf(doc.positions.length, doc.tris);
            if (!ML.linkCondition(neighbors, a, b, doc.edges.edges[m.e][3] === -1 ? 1 : 2)) { h.querySelector('.ml-err').textContent = 'That collapse would pinch the surface: the two ends share other neighbors.'; return; }
            h.querySelector('.ml-err').textContent = '';
            collapse(a, b, ML.edgeCost(doc.positions, doc.tris, a, b).best);
            ctx.update();
          }).classList.add('ml-primary');
          const c1 = btn(row, 'the cheapest', () => cheapest(1));
          const c10 = btn(row, 'the cheapest × 10', () => cheapest(10));
          c1.dataset.cheap = c10.dataset.cheap = '1';
          btn(row, 'restore', () => { doc.reset(); ctx.update(); });
          el('div', 'ml-err', h);
        });
        const tooBig = doc.tris.length > 1500;
        host.querySelectorAll('[data-cheap]').forEach((b) => { b.disabled = tooBig; b.title = tooBig ? 'Over 1,500 triangles this page would recompute too many costs: a real simplifier keeps them in a queue' : ''; });
      },
      onPick(ray, e, ctx) {
        const hit = pickTriangle(doc.positions, doc.tris, ray.origin, ray.dir);
        if (!hit) return;
        const a = doc.tris[hit.tri][hit.edgeFromCorner], b = doc.tris[hit.tri][(hit.edgeFromCorner + 1) % 3];
        ctx.state().e = doc.edges.edges.findIndex((x) => (x[0] === a && x[1] === b) || (x[0] === b && x[1] === a));
        ctx.update();
      },
    },

    {
      id: 'proc.smooth', topic: 'process', label: 'smoothing', home: HOME, inputTitle: 'Smoothing',
      init: { steps: 5, lambda: 0.5, noise: 0, method: 'laplacian' },
      params: [{ id: 'steps', label: 'steps', min: 0, max: 40, step: 1, play: true }, { id: 'lambda', label: 'λ', min: 0, max: 1, step: 0.01 }, { id: 'noise', label: 'noise', min: 0, max: 0.4, step: 0.01 }],
      panelTitle: 'Method',
      regions: ['Smoothing: one Laplacian step'],
      keys: { radius: COL.gold, moved: COL.gold },
      presets: [{ label: 'icosphere, 320 faces (the lecture)', run(m) { loadBuiltin('icosphere2'); m.lambda = 0.5; m.noise = 0; } }, { label: 'noisy', set: { noise: 0.2 } }, { label: 'bunny, 868 triangles', run() { loadBuiltin('bunny0'); } }],
      run(m) {
        const V_ = doc.positions.length;
        if (V_ > 6000) return { tooBig: true, positions: doc.positions, moved: doc.positions, radius: 0, series: { laplacian: [], taubin: [] } };
        const key = `smooth:${m.lambda}:${m.noise}`;
        const data = doc.get(key, () => {
          const neighbors = ML.neighborsOf(V_, doc.tris);
          const normals = ML.vertexNormals(doc.positions, doc.tris, 'area').normals;
          let seed = 12345;
          const start = doc.positions.map((p, i) => {
            seed = (seed * 48271) % 2147483647;
            return ML.add(p, ML.scale(normals[i], m.noise * (seed / 2147483647 - 0.5) * 2));
          });
          const lap = [start], tau = [start];
          for (let k = 1; k <= 40; k++) {
            lap.push(ML.laplacianStep(lap[k - 1], neighbors, m.lambda));
            tau.push(ML.laplacianStep(ML.laplacianStep(tau[k - 1], neighbors, m.lambda), neighbors, -(m.lambda + 0.03)));
          }
          return { lap, tau, neighbors };
        });
        const positions = (m.method === 'taubin' ? data.tau : data.lap)[Math.round(m.steps)];
        return {
          positions, moved: positions, neighbors: data.neighbors, radius: ML.meanRadius(positions),
          series: { laplacian: data.lap.map(ML.meanRadius), taubin: data.tau.map(ML.meanRadius) },
        };
      },
      draw(v, m, r) {
        const normals = ML.vertexNormals(r.positions, doc.tris, 'area').normals;
        S.use({ cull: 'none', shading: 'phong', wire: false });
        S.show({ key: `${doc.version}|smooth${m.method}${m.lambda}${m.noise}${Math.round(m.steps)}`, positions: r.positions, tris: doc.tris, normalOf: (t, k) => normals[doc.tris[t][k]] });
      },
      explain(m, r) {
        if (r.tooBig) return { hud: 'over 6,000 vertices', rows: ['Pick a smaller mesh: this view keeps 80 copies of the positions.'], status: { text: 'too large for this view', tone: 'warn' }, values: [['vertices', String(doc.positions.length)]] };
        const start = r.series.laplacian[0];
        const mu = -(m.lambda + 0.03);
        return {
          hud: `after ${Math.round(m.steps)} steps: mean radius {radius|${f(r.radius, 3)}}, was ${f(start, 3)}`,
          rows: [
            m.method === 'taubin' ? `Taubin: λ = ${f(m.lambda)} and then μ = ${f(mu)} at each step` : `Laplacian: each vertex moves ${f(m.lambda)} of the way to its neighbors' mean`,
            `radius kept: {radius|${f((100 * r.radius) / start, 1)} %}`,
          ],
          chart: {
            x: [0, 40], y: [0, Math.max(...r.series.laplacian, ...r.series.taubin) * 1.08], xLabel: 'steps', curve: 'mean radius: Laplacian (red), Taubin (green)',
            series: [{ fn: (x) => r.series.laplacian[Math.round(x)], color: COL.red }, { fn: (x) => r.series.taubin[Math.round(x)], color: COL.c }],
            at: m.steps, atY: r.radius,
          },
          status: m.method === 'taubin' ? { text: 'the negative step pushes back out, so the shape keeps its size', tone: 'ok' } : { text: 'every vertex of a convex shape moves inward, so the shape shrinks', tone: 'warn' },
          values: [['radius', f(r.radius, 3), 'radius'], ['steps', String(Math.round(m.steps))]],
          fact: 'On the icosphere of radius 1 at λ = 0.5 the lecture\'s numbers are 0.978, 0.893 and 0.637 after 1, 5 and 20 steps, and Taubin holds 1.016. This mesh has radius ' + f(start, 2) + ': the fractions are the same.',
        };
      },
      panel(host, m, r, ctx) {
        once(host, 'proc.smooth', (h) => {
          segmented(h, 'method', [['laplacian', 'Laplacian'], ['taubin', 'Taubin']], () => m.method, (x) => { m.method = x; ctx.update(); });
        });
      },
    },

    {
      id: 'proc.cache', topic: 'process', label: 'vertex cache', home: { eye: [0.4, 5.4, 3.6], target: [0, 0, 0] }, inputTitle: 'The cache',
      init: { size: 16, progress: 1, order: 'built' },
      params: [{ id: 'size', label: 'entries', min: 4, max: 64, step: 1 }, { id: 'progress', label: 'drawn', min: 0, max: 1, step: 0.002, play: true }],
      panelTitle: 'The order of the triangles',
      regions: ['Cache: count the misses', 'Cache: shuffle the triangles', 'Cache: reorder the triangles'],
      keys: { acmr: COL.gold, misses: COL.red },
      presets: [{ label: '10 × 10 grid (the lecture)', run() { loadBuiltin('grid10'); } }, { label: 'icosphere, 320 faces', run() { loadBuiltin('icosphere2'); } }, { label: 'bunny, 868 triangles', run() { loadBuiltin('bunny0'); } }],
      run(m) {
        const size = Math.round(m.size);
        const orders = {
          built: doc.tris,
          shuffled: doc.get('shuffled', () => ML.shuffleTriangles(doc.tris, 42)),
          tipsify: doc.get(`tipsify:${size}`, () => ML.tipsify(doc.tris, doc.positions.length, size)),
        };
        const order = orders[m.order];
        const result = doc.get(`cache:${m.order}:${size}`, () => ML.cacheMisses(order, size));
        const costs = { built: doc.get(`cache:built:${size}`, () => ML.cacheMisses(orders.built, size)).acmr, shuffled: doc.get(`cache:shuffled:${size}`, () => ML.cacheMisses(orders.shuffled, size)).acmr, tipsify: doc.get(`cache:tipsify:${size}`, () => ML.cacheMisses(orders.tipsify, size)).acmr };
        const upto = Math.round(m.progress * order.length);
        const contents = ML.cacheMisses(order.slice(0, upto), size).cache;
        return { ...result, order, costs, upto, contents, size };
      },
      draw(v, m, r) {
        const heat = [COL.c, COL.gold, COL.amber, COL.red].map(hex3);
        S.use({ cull: 'none', shading: 'flat', wire: true, range: r.upto });
        S.show({ key: `${doc.version}|cache${m.order}${r.size}`, positions: doc.positions, tris: r.order, colorOf: (t) => heat[r.perTriangle[t]] });
        const last = r.upto - 1;
        if (last >= 0 && doc.positions.length <= 8000) {
          const tri = r.order[last];
          v.poly(tri.map((i) => P(doc.positions[i])), COL.white, { closed: true, k: 'last' });
        }
      },
      leave() { S.use({ range: Infinity }); },
      explain(m, r) {
        const bound = doc.euler.V / doc.tris.length;
        return {
          hud: `{acmr|ACMR ${f(r.acmr, 3)}}: {misses|${r.misses}} misses over {T|${doc.tris.length} triangles}`,
          rows: [
            `{acmr|as stored ${f(r.costs.built, 3)}}, shuffled ${f(r.costs.shuffled, 3)}, Tipsify ${f(r.costs.tipsify, 3)}`,
            `the bound, one miss per vertex: V / T = ${doc.euler.V} / ${doc.tris.length} = ${f(bound, 3)}`,
            `drawn so far: ${r.upto} of ${doc.tris.length}`,
          ],
          status: m.order === 'shuffled' ? { text: 'almost every vertex is transformed again, for the same picture', tone: 'bad' } : r.acmr < bound + 0.01 ? { text: 'at the bound: every vertex is transformed once', tone: 'ok' } : { text: 'green triangles cost nothing; red cost three shader runs', tone: 'info' },
          values: [['as stored', f(r.costs.built, 3), 'acmr'], ['shuffled', f(r.costs.shuffled, 3), 'acmr'], ['Tipsify', f(r.costs.tipsify, 3), 'acmr'], ['bound', f(bound, 3)]],
          fact: 'The same triangles at every setting; only the index array\'s order changes. A 10 × 10 grid as built costs 1.100 up to a cache of 20 and 0.605 from 21: a row must still be cached when the next row starts. Tipsify reaches 0.695 at 16.',
        };
      },
      panel(host, m, r, ctx) {
        once(host, 'proc.cache', (h) => {
          segmented(h, 'order', [['built', 'as stored'], ['shuffled', 'shuffled'], ['tipsify', 'Tipsify']], () => m.order, (x) => { m.order = x; ctx.update(); });
          el('div', 'ml-cache', h);
        });
        const box = host.querySelector('.ml-cache');
        const cells = [];
        for (let i = 0; i < r.size; i++) cells.push(`<span class="ml-cell${r.contents[i] === undefined ? ' empty' : ''}">${r.contents[i] ?? ''}</span>`);
        box.innerHTML = cells.join('');
      },
    },
  ];

  // loading a built-in from a preset goes through the same path as the picker, which the demo supplies
  let loadBuiltin = () => {};
  const r2 = { current: null };
  list.setLoader = (fn) => { loadBuiltin = fn; };
  return list;
}
