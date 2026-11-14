// ray-lab-whitted: two views of the ray-lab demo (lib/demos/ray-lab-views.js) that render an image: Whitted's tree of rays, and shadow acne.
// The image is rendered in chunks by the program's own functions, a few rows per animation frame, and stopped the moment anything changes,
// so a drag stays responsive; a click on the image picks a pixel, whose tree of rays is then computed by the same function that made it.
import * as R from '../programs/ray-lab/webgl/raylab.js';
import { COL, V } from '../core/lab-viz.js';
import { arr, P, addA, mulA, f, vt, vg, sci, plural, commas, swatch, css3, el, segmented, once } from './ray-lab-ui.js';

// ================================================================ the progressive image

/** Renders into a canvas a few rows at a time. start(key, ...) does nothing if the key is the one already shown or in progress. */
export class ProgressiveImage {
  constructor(canvas, width, height, onProgress) {
    this.canvas = canvas;
    this.width = width;
    this.height = height;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.data = this.ctx.createImageData(width, height);
    this.onProgress = onProgress;
    this.key = null;
    this.token = 0;
    this.raf = 0;
    this.row = 0;
    this.rays = 0;
    this.stats = {};
    this.done = false;
  }

  cancel() {
    this.token += 1;
    cancelAnimationFrame(this.raf);
    this.key = null;
  }

  start(key, renderBlock) {
    if (key === this.key) return;
    cancelAnimationFrame(this.raf);
    this.key = key;
    const token = ++this.token;
    this.row = 0;
    this.rays = 0;
    this.stats = {};
    this.done = false;
    this.canvas.dataset.done = '0';
    const step = () => {
      if (token !== this.token) return;
      const t0 = performance.now();
      while (this.row < this.height && performance.now() - t0 < 9) this.block(renderBlock);
      this.ctx.putImageData(this.data, 0, 0);
      this.done = this.row >= this.height;
      this.canvas.dataset.done = this.done ? '1' : '0';
      this.onProgress?.(this);
      if (!this.done) this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }

  block(renderBlock) {
    const y1 = Math.min(this.row + 2, this.height);
    const out = renderBlock(this.row, y1, this.stats);
    let at = 0;
    for (let y = this.row; y < y1; y++) {
      for (let x = 0; x < this.width; x++) {
        const target = (y * this.width + x) * 4;
        for (let c = 0; c < 3; c++) this.data.data[target + c] = Math.round(255 * Math.pow(Math.min(Math.max(out.pixels[at + c], 0), 1), 1 / 2.2));
        this.data.data[target + 3] = 255;
        at += 3;
      }
    }
    this.rays += out.rays;
    this.row = y1;
  }
}

/** the pixel under a click on a canvas that shows a width x height image */
function pixelAt(canvas, e, width, height) {
  const b = canvas.getBoundingClientRect();
  // a canvas drawn with object-fit: contain shows the image centered in its box
  const k = Math.min(b.width / width, b.height / height);
  const left = b.left + (b.width - width * k) / 2, top = b.top + (b.height - height * k) / 2;
  return [Math.max(0, Math.min(width - 1, Math.floor((e.clientX - left) / k))), Math.max(0, Math.min(height - 1, Math.floor((e.clientY - top) / k)))];
}

/** an outline around one pixel, on a canvas laid over the image at a few times its size (four at 96 x 60): about 384 pixels across at
 *  every resolution, so the outline is the same size on the page */
function markPixel(over, px, py, width, height, color = '#ffd166') {
  const S = Math.max(2, Math.round(384 / width));
  over.width = width * S;
  over.height = height * S;
  const c = over.getContext('2d');
  c.clearRect(0, 0, over.width, over.height);
  c.lineWidth = 2;
  c.strokeStyle = '#0b0c10';
  c.strokeRect(px * S - 2, py * S - 2, S + 4, S + 4);
  c.lineWidth = 1.5;
  c.strokeStyle = color;
  c.strokeRect(px * S - 2, py * S - 2, S + 4, S + 4);
}

// ================================================================ the resolution
// The Whitted and acne images share one resolution, the lab's: it stays when the view changes. Each view's pixel (m.px, m.py) indexes an
// image m.res pixels wide; the presets and the starting pixels give theirs at 96 x 60 (res: 96). run() moves the pixel to the lab's size,
// to the same spot of the picture, and keeps that spot as fractions of the image, so going back to a size gives back the same index.
const SIZES = [[64, 40], [96, 60], [144, 90], [192, 120]];
const BASE_W = 96;
const sizeOf = (w) => SIZES.find((s) => s[0] === w) ?? [w, Math.round((w * 60) / 96)];
const sizeText = (w) => `${sizeOf(w)[0]} × ${sizeOf(w)[1]}`;
/** a scene from the program with its camera at width w (and the height that keeps the aspect); no w keeps the scene's own 96 x 60 */
function sized(scene, w) {
  if (!w) return scene;
  const [width, height] = sizeOf(w);
  return { ...scene, camera: { ...scene.camera, width, height } };
}

/** a view's pixel, kept at the lab's size w x h (see above) */
function pixelSpot() {
  let spot = null;   // the fractions of the image (fx, fy) and the index they were last shown at (px, py of an image w wide)
  return function fit(m, w, h) {
    const from = m.res ?? BASE_W;
    if (from !== w) {
      const [w0, h0] = sizeOf(from);
      const kept = spot && spot.w === from && spot.px === m.px && spot.py === m.py;
      const fx = kept ? spot.fx : (Math.round(m.px) + 0.5) / w0, fy = kept ? spot.fy : (Math.round(m.py) + 0.5) / h0;
      m.px = Math.max(0, Math.min(w - 1, Math.floor(fx * w)));
      m.py = Math.max(0, Math.min(h - 1, Math.floor(fy * h)));
      m.res = w;
      spot = { fx, fy, px: m.px, py: m.py, w };
      return;
    }
    m.px = Math.max(0, Math.min(w - 1, Math.round(m.px)));
    m.py = Math.max(0, Math.min(h - 1, Math.round(m.py)));
    if (!spot || spot.w !== w) spot = { fx: (m.px + 0.5) / w, fy: (m.py + 0.5) / h, px: m.px, py: m.py, w };
    // a pixel picked at this size (a click, a slider, a preset) is the new spot, one coordinate at a time
    if (spot.px !== m.px) { spot.fx = (m.px + 0.5) / w; spot.px = m.px; }
    if (spot.py !== m.py) { spot.fy = (m.py + 0.5) / h; spot.py = m.py; }
  };
}

/** the resolution row of a panel */
function resolutionRow(parent, lab, set) {
  return segmented(parent, 'resolution', SIZES.map(([w, h]) => [w, `${w} × ${h}`, `Render the image at ${w} × ${h} pixels`]), () => lab.res, set);
}

// ================================================================ Whitted
const KIND_COLOR = { primary: COL.white, reflection: COL.a, refraction: COL.cyan };
const MATERIAL_COLOR = { mirror: COL.white, glass: COL.cyan, diffuse: COL.a };
const MATERIAL_WORDS = { mirror: 'the mirror sphere', glass: 'the glass sphere', diffuse: 'the diffuse sphere', sky: 'nothing: the background' };

/** the chapter's scene with the view's light, at the view's resolution (m.res; 96 x 60 without it) */
export const whittedScene = (m) => sized({ ...R.chapterScene(), light: arr(m.light) }, m.res);
export const whittedOpt = (m) => ({ maxDepth: Math.round(m.depth), eps: 1e-4, mode: 'offset', single: false });

/** the pixel through the glass sphere with the most rays at depth 4 at a resolution (the first in reading order); rays do not depend on the light */
const mostRaysAt = new Map();
function mostRays(w) {
  if (!mostRaysAt.has(w)) {
    const scene = sized(R.chapterScene(), w), cam = scene.camera, opt = whittedOpt({ depth: 4 });
    const basis = R.lookAtBasis(cam.eye, cam.look, [0, 1, 0]);
    let best = [0, 0], most = -1;
    for (let y = 0; y < cam.height; y++) {
      for (let x = 0; x < cam.width; x++) {
        const ray = R.pixelRay(cam.eye, basis, cam.fovDeg, cam.width, cam.height, x, y);
        const hit = R.intersectScene(scene, cam.eye, ray.dir, 0, Infinity);
        if (hit.index < 0 || scene.spheres[hit.index].kind !== 'glass') continue;
        const rays = R.tracePixel(scene, x, y, opt).rays;
        if (rays > most) { most = rays; best = [x, y]; }
      }
    }
    mostRaysAt.set(w, best);
  }
  return mostRaysAt.get(w);
}

/** where each node of one pixel's tree sits in a drawing: leaves evenly across, a parent over the middle of its children */
function treeLayout(rows) {
  const kids = rows.map(() => []);
  rows.forEach((row) => { if (!row.isShadow && row.parent >= 0) kids[row.parent].push(row.id); });
  const x = new Array(rows.length).fill(0);
  let leaves = 0;
  (function place(id) {
    if (!kids[id].length) { x[id] = leaves++; return; }
    kids[id].forEach(place);
    x[id] = (x[kids[id][0]] + x[kids[id][kids[id].length - 1]]) / 2;
  })(0);
  return { kids, x, leaves };
}

const KIND_HEX = { primary: '#e7eaf0', reflection: '#ff7b72', refraction: '#56d4dd' };

/** the tree of rays of one pixel: a node per ray (filled with its local color), the weight on each edge, a swatch of its contribution, shadow-ray stubs */
function treeSvg(rows) {
  const L = treeLayout(rows), XS = 54, YS = 50, PAD = 30;
  let depth = 0;
  rows.forEach((row) => { depth = Math.max(depth, row.level); });
  const X = (id) => PAD + L.x[id] * XS, Y = (id) => 18 + rows[id].level * YS;
  const W = Math.max(220, (L.leaves - 1) * XS + 2 * PAD + 36), H = 18 + depth * YS + 44;
  let edges = '', nodes = '';
  for (const row of rows) {
    if (row.isShadow) continue;
    const n = row.node, id = row.id;
    if (row.parent >= 0) {
      const px = X(row.parent), py = Y(row.parent) + 12, cx = X(id), cy = Y(id) - 11;
      const lx = px + (cx - px) * 0.42, ly = py + (cy - py) * 0.42;
      edges += `<line x1="${px}" y1="${py}" x2="${cx}" y2="${cy}" stroke="${KIND_HEX[row.kind]}" stroke-width="${1 + 3 * Math.sqrt(row.accum)}" stroke-opacity="0.8"/><text x="${lx + (cx >= px ? 5 : -5)}" y="${ly}" text-anchor="${cx >= px ? 'start' : 'end'}" style="fill:${KIND_HEX[row.kind]}">×${f(row.weight, 2)}</text>`;
    }
    const shadowRow = rows.find((r2) => r2.isShadow && r2.parent === id);
    let stub = '';
    if (shadowRow) {
      const blocked = n.shadow.blocked;
      stub = `<line x1="${X(id) - 6}" y1="${Y(id) + 8}" x2="${X(id) - 19}" y2="${Y(id) + 21}" stroke="${blocked ? '#8b93a7' : '#ffd166'}" stroke-dasharray="2 2"/><rect class="rl-stub" x="${X(id) - 23}" y="${Y(id) + 21}" width="8" height="8" fill="${blocked ? '#8b93a7' : '#ffd166'}"><title>shadow ray: ${blocked ? 'blocked' : 'reaches the light'}</title></rect>`;
    }
    nodes += `<g class="rl-node" data-id="${id}"><title>#${id} ${row.kind}: ${n.material === 'sky' ? 'leaves the scene' : n.material}</title>
      <circle cx="${X(id)}" cy="${Y(id)}" r="10" fill="${css3(row.local)}" stroke="${KIND_HEX[row.kind]}" stroke-width="2.5"${n.truncated ? ' stroke-dasharray="3 2"' : ''}/>
      <text x="${X(id) + 14}" y="${Y(id) - 1}" style="fill:#c7cdda">#${id}</text>${stub}
      <rect x="${X(id) + 14}" y="${Y(id) + 3}" width="9" height="9" fill="${css3(row.contribution)}" stroke="#444b5c"/>
      <text x="${X(id) + 26}" y="${Y(id) + 11}">${f(row.accum, 2)}</text>${n.truncated ? `<text x="${X(id) + 14}" y="${Y(id) + 23}" style="fill:#ffa657">cut</text>` : ''}</g>`;
  }
  // the height ray-lab-ui's .rl-tree-svg rule allows, less the 28 px of the resolution row above the tree, so the tree still ends inside the rail
  return `<svg class="rl-svg rl-tree-svg" viewBox="0 0 ${W} ${H}" style="max-width:${Math.max(400, W * 1.1)}px;max-height:max(280px, calc(100vh - 523px))" role="img" aria-label="the tree of rays of the clicked pixel">${edges}${nodes}</svg>`;
}

function whittedView(lab) {
  let image = null, current = null, caption = null, over = null, canvas = null, hover = -1, treeSig = '', inset = null, resShow = null;
  const fit = pixelSpot();
  const showCaption = () => {
    if (!image || !caption) return;
    const m = current.m, w = image.width, h = image.height;
    const stage = image.done ? `${commas(w * h)} primary rays and ${commas(image.rays)} rays in all (${f(image.rays / (w * h), 1)} per pixel)` : `rendering: row ${image.row} of ${h}`;
    caption.textContent = `${w} × ${h} pixels, depth ${Math.round(m.depth)}: ${stage}. Click a pixel.`;
  };
  /** a new resolution: the pixel sliders' ranges are the image's, and the lab kit builds sliders with the view, so the view is built again
   *  (the rail keeps its scroll) */
  const setRes = (w) => {
    if (w === lab.res) return;
    lab.res = w;
    const rail = current.ctx.shell?.railEl, top = rail ? rail.scrollTop : 0;
    current.ctx.setView('whitted.tree');
    if (rail) rail.scrollTop = top;
  };
  return {
    id: 'whitted.tree', topic: 'whitted', label: 'tree of rays', home: { eye: [7.2, 4.6, 12.5], target: [0.4, 1.5, 1.2] }, inputTitle: 'Light, depth and pixel',
    init: { light: [2, 5, 4], depth: 4, px: 67, py: 31, res: BASE_W, sel: -1 },
    handles: [{ id: 'light', label: 'light', color: COL.gold }],
    params: [
      { id: 'depth', label: 'depth limit', min: 0, max: 4, step: 1 },
      { id: 'px', label: 'pixel x', min: 0, get max() { return sizeOf(lab.res)[0] - 1; }, step: 1 },
      { id: 'py', label: 'pixel y', min: 0, get max() { return sizeOf(lab.res)[1] - 1; }, step: 1 },
    ],
    regions: ['The ray through a pixel', 'Whitted: the shadow ray', 'Whitted: shade a ray', 'Whitted: the tree of one pixel', 'Whitted: render the image'],
    // the pixels are given at 96 x 60 (res: 96) and land on the same spot of the picture at the lab's resolution
    presets: [
      { label: 'glass sphere', set: { px: 67, py: 31, res: BASE_W, depth: 4, sel: -1 } },
      { label: 'mirror sphere', set: { px: 40, py: 32, res: BASE_W, depth: 4, sel: -1 } },
      { label: 'mirror sees the glass', set: { px: 41, py: 28, res: BASE_W, depth: 4, sel: -1 } },
      { label: 'floor in shadow', set: { px: 35, py: 40, res: BASE_W, depth: 4, sel: -1 } },
      // the pixel with the most rays is a different spot at each resolution: it is looked up at the lab's (at 96 x 60, pixel (56, 29))
      { label: 'through the glass, the most rays', run: (m) => { const [px, py] = mostRays(lab.res); Object.assign(m, { px, py, res: lab.res, depth: 4, sel: -1 }); } },
      { label: 'diffuse sphere', set: { px: 48, py: 25, res: BASE_W, depth: 4, sel: -1 } },
      { label: 'background', set: { px: 30, py: 7, res: BASE_W, depth: 4, sel: -1 } },
      { label: 'mirror, depth 0', set: { px: 40, py: 32, res: BASE_W, depth: 0, sel: -1 } },
      { label: 'glass, depth 1', set: { px: 67, py: 31, res: BASE_W, depth: 1, sel: -1 } },
    ],
    leave() { image?.cancel(); hover = -1; inset?.remove(); inset = null; },
    run(m) {
      const [W, H] = sizeOf(lab.res);
      fit(m, W, H);
      const scene = whittedScene(m), opt = whittedOpt(m), cam = scene.camera;
      const basis = R.lookAtBasis(cam.eye, cam.look, [0, 1, 0]);
      const ray = R.pixelRay(cam.eye, basis, cam.fovDeg, cam.width, cam.height, m.px, m.py);
      const node = R.tracePixel(scene, m.px, m.py, opt);
      const tree = R.rayTree(node);
      const want = hover >= 0 ? hover : m.sel;
      const sel = want >= 0 && want < tree.rows.length && !tree.rows[want].isShadow ? want : -1;
      return { ...ray, ...node, ...tree, tree, node, scene, basis, opt, sel, shadowRay: node.shadow, ...(node.shadow ?? {}) };
    },
    draw(v, m, r) {
      const scene = r.scene, cam = scene.camera;
      scene.spheres.forEach((s, i) => v.sphere(P(s.c), s.r, MATERIAL_COLOR[s.kind], { k: `s${i}` }));
      v.plane(V(0, scene.floorY, 0), V(0, 1, 0), 5, COL.gray, { opacity: 0.07, grid: true });
      v.point(P(cam.eye), COL.white, { r: 0.07, k: 'primary', label: 'eye', anchor: 'a' });
      // the image plane one unit in front of the eye, with the clicked pixel on it
      const tanH = r.tanHalf, aspect = cam.width / cam.height;
      const corner = (sx, sy) => addA(cam.eye, addA(addA(mulA(r.basis.u, sx * tanH * aspect), mulA(r.basis.v, sy * tanH)), mulA(r.basis.w, -1)));
      v.poly([P(corner(-1, -1)), P(corner(1, -1)), P(corner(1, 1)), P(corner(-1, 1))], COL.gray, { closed: true, k: 'primary' });
      v.point(P(corner(r.sx, r.sy)), COL.gold, { r: 0.035, k: 'primary' });
      r.rows.forEach((row) => {
        const n = row.node, key = `n${row.id}`, on = row.id === r.sel;
        if (row.isShadow) {
          const s = n.shadow, end = s.blocked ? addA(s.origin, mulA(s.aim, Math.min(s.blockerT, 1))) : scene.light;
          const mine = row.parent === r.sel;
          v.dashed(P(s.origin), P(end), s.blocked ? COL.gray : COL.gold, { k: key, dash: 0.12, gap: 0.08 });
          if (mine) v.bar(P(s.origin), P(end), s.blocked ? COL.gray : COL.gold, { r: 0.02, k: key });
          if (s.blocked) v.point(P(end), COL.red, { r: 0.04, k: key });
          return;
        }
        const color = KIND_COLOR[row.kind];
        // a ray that leaves the scene is clipped at 3.5 units and ends in a gray dot
        const escapes = n.index === R.NONE;
        const end = escapes ? addA(n.o, mulA(n.d, 3.5)) : n.p;
        v.arrow(P(n.o), P(end), color, { k: key, r: (on ? 3 : 1) * (0.006 + 0.022 * Math.sqrt(row.accum)), head: 0.16, hr: on ? 0.07 : 0.045 });
        if (escapes) v.point(P(end), COL.gray, { r: 0.04, k: key });
        else v.point(P(n.p), color, { r: on ? 0.08 : 0.045, k: key });
        if (on) v.label(`#${row.id} ${row.kind}${n.truncated ? ', cut at the depth limit' : escapes ? ', escapes' : ''}`, P(end), color, 'ar', key);
      });
    },
    explain(m, r) {
      const tree = r.tree;
      const nodes = tree.rows.filter((row) => !row.isShadow);
      const count = (kind) => nodes.filter((row) => row.kind === kind).length;
      const blocked = tree.rows.filter((row) => row.isShadow && row.node.shadow.blocked).length;
      const rows = [
        `pixel (${m.px}, ${m.py}) of ${sizeText(lab.res)}: {primary|(sx, sy) = (${f(r.sx, 4)}, ${f(r.sy, 4)})}, d = ${vg(r.dir, 4)}`,
      ];
      for (const row of nodes) {
        const n = row.node, key = `n${row.id}`;
        const where = n.index === R.NONE ? 'nothing: the background' : `${n.index === R.FLOOR ? 'the floor' : MATERIAL_WORDS[n.material] ?? 'the floor'}${n.index === R.FLOOR ? '' : n.entering ? '' : ' (from inside)'}`;
        const shadow = n.shadow ? (n.shadow.blocked ? ', shadow ray blocked' : ', shadow ray reaches the light') : '';
        let sends = '';
        if (n.truncated) sends = `; depth limit ${Math.round(m.depth)}: its secondary ${n.material === 'glass' ? 'rays are' : 'ray is'} not sent`;
        else if (n.reflection && n.refraction) sends = `; sends reflection ×F = ${f(n.wReflect, 3)} and refraction ×(1 − F) = ${f(n.wRefract, 3)}`;
        else if (n.reflection) sends = n.material === 'glass' ? '; total internal reflection: reflection ×1' : `; sends reflection ×k_r = ${f(n.wReflect, 2)}`;
        const line = `{${key}|#${row.id} ${row.kind}} hits ${where}${n.index === R.NONE ? '' : ` at t = ${f(n.t, 2)}`}${shadow}${sends}`;
        rows.push(row.id === r.sel ? `<span style="background:#2a2310;border-radius:3px;padding:0 3px">${line}</span>` : line);
      }
      rows.push(`color = Σ accumulated weight × local = {sum|${vt(tree.sum, 3)}} ${swatch(tree.sum)}`);
      const kinds = [['primary', count('primary')], ['reflection', count('reflection')], ['refraction', count('refraction')]].filter((k) => k[1] > 0).map(([k, c]) => plural(c, `${k} ray`)).join(', ');
      const status = {
        text: `${plural(tree.rays, 'ray')} in this pixel: ${kinds}, ${plural(tree.shadowRays, 'shadow ray')} (${blocked} blocked)${tree.truncatedRays ? `; ${tree.truncatedRays} cut off by the depth limit` : ''}`,
        tone: 'info',
      };
      return {
        hud: `pixel (${m.px}, ${m.py}): ${plural(tree.rays, 'ray')} → {sum|color} ${swatch(tree.sum)}`,
        rows, status,
        fact: 'Every node is shade() called again for a secondary ray. A pixel\'s color is the sum, over its tree, of the accumulated weight times the node\'s own term. A shadow ray adds no color: it decides whether its node gets the diffuse and specular terms. At the depth limit a mirror or glass node returns only its own term. Hover a node of the tree to find its ray; click to keep it.',
      };
    },
    panelTitle: 'The tree of rays of the pixel',
    panel(host, m, r, ctx) {
      current = { m, ctx };
      const [W, H] = sizeOf(lab.res);
      if (!inset) host.dataset.built = '';
      once(host, `whitted|${W}`, (h) => {
        image?.cancel();
        inset?.remove();
        treeSig = '';
        resShow = resolutionRow(h, lab, setRes);
        const box = el('div', 'rl-tree', h);
        box.addEventListener('mouseover', (e) => {
          const g = e.target.closest ? e.target.closest('.rl-node') : null;
          const id = g ? Number(g.dataset.id) : -1;
          if (id !== hover) { hover = id; current.ctx.refresh(); }
        });
        box.addEventListener('mouseleave', () => { if (hover !== -1) { hover = -1; current.ctx.refresh(); } });
        box.addEventListener('click', (e) => {
          const g = e.target.closest ? e.target.closest('.rl-node') : null;
          if (!g) return;
          const id = Number(g.dataset.id);
          current.m.sel = current.m.sel === id ? -1 : id;
          current.ctx.refresh();
        });
        // the render is an inset at the top right of the scene pane; it takes clicks, not camera drags
        inset = el('div', 'rl-inset', ctx.sceneEl);
        for (const ev of ['mousedown', 'wheel', 'touchstart']) inset.addEventListener(ev, (e) => e.stopPropagation());
        const wrap = el('div', 'rl-image', inset);
        canvas = el('canvas', 'rl-pick', wrap);
        canvas.width = W;
        canvas.height = H;
        canvas.setAttribute('aria-label', 'The rendered image; click a pixel to see its tree of rays');
        over = el('canvas', 'rl-over', wrap);
        caption = el('p', 'rl-caption', inset);
        image = new ProgressiveImage(canvas, W, H, showCaption);
        canvas.addEventListener('click', (e) => {
          const [px, py] = pixelAt(canvas, e, W, H);
          current.m.px = px;
          current.m.py = py;
          current.m.sel = -1;
          current.ctx.update();
        });
        const key = el('div', 'rl-key', inset);
        key.innerHTML = '<span><i style="background:#e7eaf0"></i>primary</span><span><i style="background:#ff7b72"></i>reflection</span><span><i style="background:#56d4dd"></i>refraction</span><span><i style="background:#ffd166"></i>shadow ray, lit</span><span><i style="background:#8b93a7"></i>shadow ray, blocked</span><span>node fill: local color; square: its share of the pixel; number: accumulated weight; ×: weight on the edge</span>';
      });
      resShow();
      markPixel(over, m.px, m.py, W, H);
      const scene = r.scene, opt = r.opt;
      // a change to the light, the depth or the resolution stops the render in progress and starts again; the old picture stays until it is overwritten
      image.start(`${W}x${H}|${m.light.x},${m.light.y},${m.light.z}|${opt.maxDepth}`, (y0, y1) => R.renderRows(scene, y0, y1, opt));
      showCaption();
      const sig = `${W}|${m.px},${m.py},${opt.maxDepth},${m.light.x},${m.light.y},${m.light.z}`;
      const box = host.querySelector('.rl-tree');
      if (sig !== treeSig) { treeSig = sig; box.innerHTML = treeSvg(r.rows); }
      box.querySelectorAll('.rl-node').forEach((g) => g.classList.toggle('sel', Number(g.dataset.id) === r.sel));
    },
  };
}

// ================================================================ shadow acne
/** the acne scene with the view's light, at the view's resolution (m.res; 96 x 60 without it) */
export const acneScene = (m) => sized({ ...R.acneScene(), light: arr(m.light) }, m.res);
export const acneOpt = (m) => ({ maxDepth: 0, eps: m.logEps <= -9.5 ? 0 : Math.pow(10, m.logEps), mode: m.tmin ? 'tmin' : 'offset', single: m.single === 1 });

/** the height of a point above the surface the ray hit, along the normal on the light's side (negative: below the surface) */
function heightAbove(scene, index, p, lightSide) {
  const s = index >= 0 ? scene.spheres[index] : null;
  return lightSide * (s ? R.length(R.sub(p, s.c)) - s.r : p[1] - scene.floorY);
}

function acneView(lab) {
  let image = null, current = null, caption = null, over = null, canvas = null, bits = null, cure = null, stage = null, resShow = null;
  const fit = pixelSpot();
  const showCaption = () => {
    if (!image || !caption) return;
    const s = image.stats;
    const stage = image.done ? '' : `rendering: row ${image.row} of ${image.height}. `;
    const share = s.lit ? ` (${f((100 * s.self) / s.lit, 1)} %)` : '';
    caption.textContent = `${stage}Lit surface pixels that shadow themselves: ${s.self ?? 0} of ${s.lit ?? 0}${share}. Shadowed floor pixels: ${s.floor ?? 0}. Click a pixel of the image to probe it.`;
  };
  return {
    id: 'acne.epsilon', topic: 'acne', label: 'epsilon', home: { eye: [6.4, 3.6, 7.4], target: [0.6, 0.6, 0.6] }, inputTitle: 'Offset and light',
    init: { light: [3, 3.5, 3], logEps: -9.5, single: 1, tmin: 0, px: 42, py: 24, res: BASE_W },
    handles: [{ id: 'light', label: 'light', color: COL.gold }],
    params: [{ id: 'logEps', label: 'log₁₀ ε', min: -9.5, max: 0, step: 0.5 }],
    regions: ['Shadow acne: offsetting the origin', 'Whitted: the shadow ray'],
    presets: [
      { label: 'ε = 0: acne', set: { logEps: -9.5, single: 1, tmin: 0 } },
      { label: '32-bit, ε = 1e-9: still acne', set: { logEps: -9, single: 1, tmin: 0 } },
      { label: '64-bit, ε = 1e-9: clear', set: { logEps: -9, single: 0, tmin: 0 } },
      { label: '32-bit, ε = 1e-4: clear', set: { logEps: -4, single: 1, tmin: 0 } },
      { label: 'ε = 1: peter-panning', set: { logEps: 0, single: 1, tmin: 0 } },
      { label: 'ignore t < ε, ε = 0', set: { logEps: -9.5, single: 1, tmin: 1 } },
      { label: 'ignore t < ε, ε = 1e-4', set: { logEps: -4, single: 1, tmin: 1 } },
    ],
    leave() { image?.cancel(); stage?.remove(); stage = null; },
    run(m) {
      fit(m, ...sizeOf(lab.res));
      const scene = acneScene(m), opt = acneOpt(m);
      const node = R.tracePixel(scene, m.px, m.py, opt);
      let probe = null;
      if (node.index !== R.NONE) {
        const s = node.shadow, sphere = node.index >= 0 ? scene.spheres[node.index] : null;
        const outward = sphere ? R.scale(R.sub(node.p, sphere.c), 1 / sphere.r) : [0, 1, 0];
        const lightSide = R.dot(outward, s.aim) >= 0 ? 1 : -1;
        // where the shadow ray first meets the surface it started on, as a parameter t of its own (light at t = 1)
        const own = sphere ? R.raySphere(s.origin, s.aim, sphere.c, sphere.r, s.tMin)
          : { t: Math.abs(s.aim[1]) > R.EPS ? (scene.floorY - s.origin[1]) / s.aim[1] : Infinity };
        const crossing = sphere ? R.raySphere(s.origin, s.aim, sphere.c, sphere.r, -Infinity) : own;
        const nearest = sphere ? (Math.abs(crossing.t0) < Math.abs(crossing.t1) ? crossing.t0 : crossing.t1) : own.t;
        probe = {
          pointHeight: heightAbove(scene, node.index, node.p, lightSide), originHeight: heightAbove(scene, node.index, s.origin, lightSide),
          selfT: own.t, nearest, aimLength: R.length(s.aim), self: s.blocked && s.blocker === node.index && node.nDotL > 0, facesAway: node.nDotL <= 0, lightSide, sphere,
        };
      }
      return { ...node, ...(node.shadow ?? {}), node, scene, opt, probe, tree: R.rayTree(node) };
    },
    draw(v, m, r) {
      const scene = r.scene;
      scene.spheres.forEach((s, i) => v.sphere(P(s.c), s.r, i === 0 ? COL.white : COL.a, { k: `s${i}` }));
      v.plane(V(0, scene.floorY, 0), V(0, 1, 0), 5, COL.gray, { opacity: 0.07, grid: true });
      if (!r.probe) return;
      const n = r.node, s = r.shadow;
      v.arrow(P(n.o), P(n.p), COL.white, { k: 'probe', r: 0.008, head: 0.14, hr: 0.04 });
      v.point(P(n.p), r.probe.self ? COL.red : COL.green, { r: 0.07, k: 'probe', label: r.probe.self ? 'acne' : 'lit', anchor: 'ar' });
      v.arrow(P(n.p), P(addA(n.p, mulA(n.n, 0.6))), COL.cyan, { k: 'surface', r: 0.012, head: 0.12, hr: 0.035, label: 'n', anchor: 'ar' });
      const end = s.blocked ? addA(s.origin, mulA(s.aim, Math.min(s.blockerT, 1))) : scene.light;
      v.dashed(P(s.origin), P(end), s.blocked ? COL.gray : COL.gold, { k: 'shadow', dash: 0.12, gap: 0.08 });
    },
    explain(m, r) {
      const o = r.opt, p = r.probe;
      const epsText = o.eps === 0 ? '0' : sci(o.eps);
      const spacing = m.single === 1 ? '2⁻²³ ≈ 1.2e−7' : '2⁻⁵² ≈ 2.2e−16';
      const rows = [
        `{eps|ε} = ${o.eps === 0 ? '0' : `10^${f(m.logEps, 1)} = ${epsText}`}, applied as ${m.tmin ? 'a minimum t: hits with t < ε are ignored' : 'an offset of the origin along the normal'}`,
        `A hit point is stored as a ${m.single === 1 ? '32-bit float' : '64-bit double'}: its coordinates near 1 are spaced ${spacing} apart, so it lies off the surface by about that much`,
      ];
      let status;
      if (!p) {
        rows.push('This pixel hits nothing: pick a pixel on a sphere or the floor.');
        status = { text: 'the background: no hit point, no shadow ray', tone: 'info' };
      } else {
        const above = p.originHeight >= 0;
        rows.push(`{probe|stored hit point}: ${sci(Math.abs(p.pointHeight))} ${p.pointHeight >= 0 ? 'above' : 'below'} the surface;  {shadow|shadow-ray origin}: ${p.originHeight === 0 ? 'on' : `${sci(Math.abs(p.originHeight))} ${above ? 'above' : 'below'}`} the surface`);
        rows.push(`first crossing of the surface: t = ${sci(p.selfT)} ${p.selfT > r.tMin ? '>' : '≤'} tMin = ${sci(r.tMin)}${p.selfT >= 1 ? ' (beyond the light)' : ''}`);
        if (p.facesAway && r.blocked && r.blocker === r.index) status = { text: 'this surface faces away from the light (N·L ≤ 0), so it shadows itself: a real shadow, not acne', tone: 'info' };
        else if (p.self) status = { text: `acne: the shadow ray meets its own surface at t = ${sci(p.selfT)} (${sci(p.selfT * p.aimLength)} away), so the surface blocks its own light`, tone: 'bad' };
        else if (r.blocked) status = { text: `shadowed by ${r.blocker === R.FLOOR ? 'the floor' : `sphere ${r.blocker}`} at t = ${f(r.blockerT, 3)}: a real shadow`, tone: 'info' };
        else if (o.eps > 0.1) status = { text: `lit, but ε = ${f(o.eps, 2)} lifts the origin far above the surface: it can start past a thin blocker, and shadows detach from their casters (peter-panning)`, tone: 'warn' };
        else status = { text: `clear: the origin is ${sci(Math.abs(p.originHeight))} ${above ? 'above' : 'below'} the surface and nothing is hit before the light`, tone: 'ok' };
      }
      return {
        hud: `{eps|ε = ${epsText}}  ${m.single === 1 ? '32-bit' : '64-bit'} hit points  ${!p ? 'background' : p.self ? '{probe|acne}' : '{probe|clear}'}`,
        rows, status,
        values: [['ε', epsText, 'eps'], ['hit point', m.single === 1 ? '32-bit' : '64-bit'], ['point off surface', p ? sci(p.pointHeight) : 'none', 'probe'], ['origin height', p ? sci(p.originHeight) : 'none', 'shadow'], ['crossing at t', p ? sci(p.selfT) : 'none'], ['cure', m.tmin ? 'ignore t < ε' : 'offset origin']],
        fact: 'Rounding puts the stored hit point a hair above or below the surface, so about half of the lit points on a sphere start a shadow ray underneath it and meet the surface again at a t of the same size. An ε must be bigger than that rounding: 5e−8 clears this scene in 32 bits, 1e−14 in 64. (The floor\'s y = −1 is exact in 32 bits, so only the spheres speckle here.) Too large an ε, peter-panning, starts the ray on the far side of thin things.',
      };
    },
    panelTitle: 'Epsilon, precision, and the image',
    panel(host, m, r, ctx) {
      current = { m, ctx };
      const [W, H] = sizeOf(lab.res);
      if (!stage) host.dataset.built = '';
      once(host, `acne|${W}`, (h) => {
        image?.cancel();
        bits = segmented(h, 'hit point', [[1, '32-bit float', 'What shaders and Unity store'], [0, '64-bit double', 'What JavaScript computes in']], () => current.m.single, (v) => { current.m.single = v; current.ctx.update(); });
        cure = segmented(h, 'cure', [[0, 'offset the origin', 'Move the origin ε along the normal'], [1, 'ignore t < ε', 'Keep the origin; discard hits with a small t']], () => current.m.tmin, (v) => { current.m.tmin = v; current.ctx.update(); });
        // a new resolution builds this panel and the image again (the panel's id holds the size)
        resShow = resolutionRow(h, lab, (w) => { if (w !== lab.res) { lab.res = w; current.ctx.update(); } });
        // the render fills the scene pane, over the 3D scene, pixelated; the strip stays readable below it
        stage?.remove();
        stage = el('div', 'rl-stage', ctx.sceneEl);
        const wrap = el('div', 'rl-swrap', stage);
        canvas = el('canvas', 'rl-pick rl-scanvas', wrap);
        canvas.width = W;
        canvas.height = H;
        canvas.setAttribute('aria-label', 'The rendered image; click a pixel to probe it');
        over = el('canvas', 'rl-over rl-scanvas', wrap);
        caption = el('p', 'rl-caption', h);
        image = new ProgressiveImage(canvas, W, H, showCaption);
        canvas.addEventListener('click', (e) => {
          const [px, py] = pixelAt(canvas, e, W, H);
          current.m.px = px;
          current.m.py = py;
          current.ctx.update();
        });
        el('div', 'rl-line', h);
      });
      bits();
      cure();
      resShow();
      markPixel(over, m.px, m.py, W, H, '#7ee787');
      const scene = r.scene, opt = r.opt;
      // every pixel is traced by shade(); the lit pixels whose shadow ray was stopped by their own surface are the acne
      image.start(`${W}x${H}|${m.light.x},${m.light.y},${m.light.z}|${opt.eps}|${opt.mode}|${opt.single}`, (y0, y1, stats) => {
        const pixels = [];
        let rays = 0;
        for (let y = y0; y < y1; y++) {
          for (let x = 0; x < W; x++) {
            const node = R.tracePixel(scene, x, y, opt);
            pixels.push(node.color[0], node.color[1], node.color[2]);
            rays += node.rays;
            stats.lit = stats.lit ?? 0;
            stats.self = stats.self ?? 0;
            stats.floor = stats.floor ?? 0;
            if (node.index === R.NONE) continue;
            if (node.nDotL > 0.05) {
              stats.lit += 1;
              if (node.shadow.blocked && node.shadow.blocker === node.index) stats.self += 1;
            }
            if (node.index === R.FLOOR && node.shadow.blocked) stats.floor += 1;
          }
        }
        return { pixels, rays };
      });
      showCaption();
      const line = host.querySelector('.rl-line');
      line.innerHTML = r.probe ? heightLine(r) : '';
    },
  };
}

/** the heights of the stored hit point and the shadow-ray origin above the surface, on a scale that is linear near 0 and logarithmic away from it */
function heightLine(r) {
  const p = r.probe;
  const Y = (h) => 86 - Math.sign(h) * (Math.log10(1 + Math.abs(h) / 1e-17) / 17) * 60;
  const mark = (h, color, label, dy = 0) => `<circle cx="130" cy="${Y(h)}" r="3.5" fill="${color}"/><text x="138" y="${Y(h) + 3 + dy}" style="fill:${color}">${label}: ${h === 0 ? '0' : sci(h)}</text>`;
  const ticks = [1, 1e-3, 1e-6, 1e-9, 1e-12, 1e-15].map((t) => `<line x1="40" x2="46" y1="${Y(t)}" y2="${Y(t)}" stroke="#3a4152"/><text x="38" y="${Y(t) + 3}" text-anchor="end" style="fill:#79829a">${sci(t)}</text><line x1="40" x2="46" y1="${Y(-t)}" y2="${Y(-t)}" stroke="#3a4152"/><text x="38" y="${Y(-t) + 3}" text-anchor="end" style="fill:#79829a">−${sci(t)}</text>`).join('');
  const band = r.opt.single ? `<rect x="46" y="${Y(6e-8)}" width="60" height="${Y(-6e-8) - Y(6e-8)}" fill="#ffd166" fill-opacity="0.14"/><text x="48" y="${Y(6e-8) - 3}" style="fill:#ffd166">±½ spacing of 32-bit floats</text>` : '';
  return `<svg class="rl-svg" viewBox="0 0 280 170" role="img" aria-label="heights above the surface of the stored hit point and the shadow ray's origin">
    <text x="8" y="10" style="fill:#79829a">height above the surface, toward the light</text>
    <line x1="46" y1="22" x2="46" y2="150" stroke="#3a4152"/><line x1="46" y1="${Y(0)}" x2="106" y2="${Y(0)}" stroke="#3fd97f" stroke-width="2"/><text x="112" y="${Y(0) + 3}" style="fill:#3fd97f">the surface</text>
    ${band}${ticks}${mark(p.pointHeight, '#e7eaf0', 'stored hit point')}${mark(p.originHeight, '#ffd166', 'ray origin', Math.abs(Y(p.originHeight) - Y(p.pointHeight)) < 11 ? 11 : 0)}</svg>`;
}

/** the Whitted and acne views; the array's resolution property (not enumerable) is the object holding the size they share, for the tests */
export function makeWhittedViews() {
  const lab = { res: BASE_W };   // the resolution the two image views share: the width of the image, 96 x 60 to start
  const views = [whittedView(lab), acneView(lab)];
  Object.defineProperty(views, 'resolution', { value: lab, enumerable: false });
  return views;
}

/** the widths and heights the resolution row offers */
export const RESOLUTIONS = SIZES.map((s) => s.slice());

