// trace-lab-views: the catalog behind the trace-lab demo (runtime: lib/core/lab.js), part one: what every view shares (the image plane,
// the inset with the image, picking a pixel from the inset, the plane or the box, the engine's progress), and the views Camera (a pixel
// is a ray), Whitted (the tree of rays) and Paths (the paths through a pixel). The other four are in trace-lab-views-miss.js. Every
// number is the program's (lib/programs/trace-lab/webgl/tracelab.js); the images come from trace-lab-render.js.
import * as T from '../programs/trace-lab/webgl/tracelab.js';
import { COL } from '../core/lab-viz.js';
import { P, f, vg, plural, commas, swatch, el, segmented, once } from './ray-lab-ui.js';
import { settingsOf, pixelOf, DEFAULT_WIDTH, PIXEL_CAP } from './trace-lab-render.js';
import { NAMES, SHORT, HOME, CLOSE, KIND_COLOR, lines, drawRoom, drawRig, pixelSquare, makePlane, pixelOnPlane, pixelAt, paintCopy, mountInset, treeSvg, pixelSvg, walkWords } from './trace-lab-kit.js';

export const TOPICS = [{ id: 'camera', label: 'Camera' }, { id: 'whitted', label: 'Whitted' }, { id: 'paths', label: 'Paths' }, { id: 'miss', label: 'What Whitted misses' }];

/** one set of values for every view: one scene, one camera, one picked pixel (as fractions of the image) */
export const INIT = {
  eye: [0, 0, 5.2], look: [0, 0, 0], light: [0.3, T.LIGHT_Y, -0.5], fov: 42, size: 0.6, res: DEFAULT_WIDTH, fx: 0.5, fy: 0.5,
  depth: 5, shadowRays: 16, maxDepth: 6, nee: true, roulette: 'fixed', paths: 16, sel: 0, show: 'path',
};
/** where the presets put the pixel, as fractions of the image (the center of a pixel of the 96 x 72 image), so they land on the same spot
 *  at every resolution; lib/tests/programs/trace-lab.test.mjs checks each one at every size */
export const PIX = {
  center: { fx: 0.5, fy: 0.5 }, corner: { fx: 0.001, fy: 0.001 }, mirror: { fx: 0.4635, fy: 0.7153 }, miss: { fx: 0.0573, fy: 0.5069 },
  light: { fx: 0.5365, fy: 0.1597 }, glass: { fx: 0.6302, fy: 0.7847 }, face: { fx: 0.3177, fy: 0.6458 }, caustic: { fx: 0.6719, fy: 0.9514 },
  penumbra: { fx: 0.5282, fy: 0.9519 }, umbra: { fx: 0.5938, fy: 0.9514 }, floor: { fx: 0.4219, fy: 0.9236 }, ceiling: { fx: 0.4219, fy: 0.0625 },
  redFloor: { fx: 0.1927, fy: 0.9514 },
};
/** the default light, behind the glass sphere so that its caustic lands in front of it; and one that grazes the box face by the red wall */
export const BACK = [0.3, -0.5];
/** the tracers' settings the presets were written for: a preset states them, whatever an earlier one left */
const WHITTED_STD = { depth: 5, shadowRays: 16, size: 0.6 };
const PATHS_STD = { maxDepth: 6, nee: true, roulette: 'fixed', size: 0.6 };
export const FRONT_LEFT = [-0.75, 0.55];
export const LIGHT_HANDLE = { id: 'light', label: 'light', color: COL.gold, fixed: 'y', anchor: 'a' };
export const PATH_COLORS = [COL.gold, COL.cyan, COL.pink, COL.green, COL.purple, COL.amber, COL.b, COL.a, COL.c];
const hex = (c) => `#${c.toString(16).padStart(6, '0')}`;
export const rgb = (c, d = 3) => `(${f(c[0], d)}, ${f(c[1], d)}, ${f(c[2], d)})`;
/** a swatch at the images' exposure */
export const sw = (c) => swatch(c.map((x) => x * 1.5));
export const ratio = (c) => (c[1] > 0 ? f(c[0] / c[1], 2) : 'none (green 0)');

/** keep the light on the ceiling, inside it, and the values in range */
export function clampValues(m) {
  const half = m.size / 2, lim = T.HALF - half - 0.01;
  m.light.y = T.LIGHT_Y;
  m.light.x = Math.max(-lim, Math.min(lim, m.light.x));
  m.light.z = Math.max(-lim, Math.min(lim, m.light.z));
  m.fx = Math.max(0, Math.min(0.9999, m.fx));
  m.fy = Math.max(0, Math.min(0.9999, m.fy));
}

/** pixel (px, py) of the current image, stored as the fractions of its center */
export function setPixel(m, px, py) {
  const W = m.res, H = (m.res * 3) / 4;
  m.fx = (px + 0.5) / W;
  m.fy = (py + 0.5) / H;
}

// ================================================================ what every view shares

export function makeCommon(engine) {
  const s = { ctx: null, plane: null, inset: null, view: null, m: null, st: null, px: 0, py: 0, lastRefresh: 0, unlisten: null };
  const sourceOf = (kind) => (kind === 'whitted' ? engine.whittedNow?.canvas : engine.path?.canvas);

  function caption(kind) {
    if (kind === 'whitted') {
      const w = engine.whittedNow;
      if (!w) return '';
      return w.done ? `Whitted, ${s.st.width} × ${s.st.height}: ${commas(w.rays)} rays, ${f(w.rays / (s.st.width * s.st.height), 1)} per pixel. Click a pixel.`
        : `Whitted, ${s.st.width} × ${s.st.height}: row ${w.row} of ${s.st.height}`;
    }
    const p = engine.path;
    if (!p) return '';
    const st = p.stats();
    return st.spp ? `Path tracer, ${s.st.width} × ${s.st.height}: ${st.spp} samples per pixel, noise ${f(100 * st.noise, 1)} %. Click a pixel.`
      : `Path tracer, ${s.st.width} × ${s.st.height}: the first pass (the earlier picture stays until it is done)`;
  }

  function paint() {
    if (!s.m || !s.st) return;
    const shown = sourceOf(s.m.show);
    if (s.plane && shown) s.plane.show(shown);
    if (s.inset && s.inset.box.style.display !== 'none') {
      paintCopy(s.inset.canvas, shown, s.px, s.py);
      s.inset.caption.textContent = caption(s.m.show);
      s.inset.show();
    }
    s.view?.repaint?.(s);
  }

  let pending = 0;
  function onProgress(kind) {
    if (!s.m) return;
    // a picture the view shows changed: paint it now, draw the scene once on the next frame
    if (kind === s.m.show || (kind !== 'job' && s.view?.inset === false)) {
      paint();
      if (!pending && typeof requestAnimationFrame === 'function') pending = requestAnimationFrame(() => { pending = 0; s.ctx?.render(); });
    }
    const now = performance.now();
    const finished = (kind === 'job' && engine.job?.done) || (kind === 'path' && engine.path?.done);
    const wants = s.view?.live ?? [];
    if (wants.includes(kind) && (now - s.lastRefresh > 900 || finished)) { s.lastRefresh = now; s.ctx?.refresh(); }
  }

  function pick(m, px, py) {
    setPixel(m, px, py);
    m.sel = 0;
    s.ctx.update();
  }

  return {
    s, paint, caption,
    setup(view, ctx) {
      s.ctx = ctx;
      s.view = view;
      engine.host = ctx.sceneEl;
      s.plane ??= makePlane(ctx.world);
      s.unlisten ??= engine.listen(onProgress);
      if (!s.inset) {
        s.inset = mountInset(ctx, {
          getShow: () => s.m?.show ?? 'path',
          onSwitch: (k) => { if (s.m) { s.m.show = k; s.ctx.update(); } },
          onPick: (e, canvas) => { if (s.m && s.st) { const [px, py] = pixelAt(canvas, e, s.st.width, s.st.height); pick(s.m, px, py); } },
        });
      }
      s.inset.box.style.display = view.inset === false ? 'none' : '';
    },
    /** what each run() begins with: the settings, the pixel, the engine pointed at them, the plane placed and painted */
    prepare(m, wantJob) {
      s.m = m;
      const st = settingsOf(m);
      const [px, py] = pixelOf(m);
      s.st = st; s.px = px; s.py = py;
      const basis = T.lookAtBasis(st.camera.eye, st.camera.look, [0, 1, 0]);
      engine.configure(st, [px, py], wantJob);
      if (s.plane) s.plane.place(st, basis);
      paint();
      return { st, px, py, basis, W: st.width, H: st.height };
    },
    /** a click in the scene: on the image plane, its pixel; on a surface of the box, the pixel that sees that point */
    onPick(ray, e, ctx) {
      const m = ctx.state();
      if (!s.st) return;
      const basis = T.lookAtBasis(s.st.camera.eye, s.st.camera.look, [0, 1, 0]);
      let px = pixelOnPlane({ origin: ray.origin, dir: ray.dir }, s.st, basis);
      if (!px) {
        const hit = T.intersect(s.st.scene, ray.origin, ray.dir);
        if (!hit.hit) return;
        const cam = s.st.camera, rel = T.sub(hit.p, cam.eye), z = -T.dot(rel, basis.w);
        if (z <= 0.01) return;
        const tanHalf = Math.tan((cam.fovDeg * Math.PI) / 360), aspect = cam.width / cam.height;
        const sx = T.dot(rel, basis.u) / (z * tanHalf * aspect), sy = T.dot(rel, basis.v) / (z * tanHalf);
        if (Math.abs(sx) >= 1 || Math.abs(sy) >= 1) return;
        px = [Math.floor(((sx + 1) / 2) * cam.width), Math.floor(((1 - sy) / 2) * cam.height)];
      }
      pick(m, px[0], px[1]);
    },
  };
}

/** the properties every view has */
export function base(common, extra) {
  const view = {
    group: 'tl', init: INIT, home: HOME, grid: 'none', axes: false, handleSize: 0.08,
    edited(m) { clampValues(m); },
    onPick: (ray, e, ctx) => common.onPick(ray, e, ctx),
    leave() {},
    ...extra,
  };
  const ownSetup = extra.setup;
  view.setup = (ctx) => { common.setup(view, ctx); ownSetup?.(ctx); };
  // sel names a node of Whitted's tree in one view and a path in another: each view starts from its own
  if ('selStart' in extra) view.enter = (m) => { m.sel = extra.selStart; };
  return view;
}

// ================================================================ Camera: a pixel is a ray

function cameraView(engine, common) {
  return base(common, {
    id: 'camera.ray', topic: 'camera', label: 'a pixel is a ray', inputTitle: 'Camera, light, field of view',
    handles: [{ id: 'eye', label: 'eye', color: COL.white, anchor: 'ar' }, { id: 'look', label: 'look at', color: COL.c, anchor: 'a' }, LIGHT_HANDLE],
    params: [{ id: 'fov', label: 'field of view', min: 20, max: 90, step: 1, unit: '°' }, { id: 'size', label: 'light side', min: 0, max: 1.2, step: 0.05 }],
    regions: ['The ray through a pixel', 'The nearest hit'],
    live: ['path'],
    presets: [
      { label: 'center pixel', set: { ...PIX.center } },
      { label: 'a corner: sx, sy near ±1', set: { ...PIX.corner } },
      { label: 'a pixel on the mirror', set: { ...PIX.mirror } },
      { label: 'beside the box (a miss)', set: { ...PIX.miss } },
      { label: 'the light, seen directly', set: { ...PIX.light } },
      { label: 'the camera back home', run: (m) => { m.eye.set(0, 0, 5.2); m.look.set(0, 0, 0); m.fov = 42; } },
    ],
    run(m) {
      const c = common.prepare(m, false);
      const cam = c.st.camera;
      const ray = T.pixelRay(cam.eye, c.basis, cam.fovDeg, cam.width, cam.height, c.px, c.py, 0.5, 0.5);
      const hit = T.intersect(c.st.scene, cam.eye, ray.dir);
      const whitted = T.tracePixel(c.st.scene, cam, c.px, c.py, c.st.wOpt).color;
      const img = engine.path;
      const value = img && img.passes ? img.value(c.px, c.py) : null;
      const pathText = value ? `${rgb(value)} ${sw(value)} after ${plural(img.passes, 'sample')}` : 'its first pass is not done';
      return { ...ray, ...hit, ...c, whitted, pathText, eye: cam.eye, cam };
    },
    draw(v, m, r) {
      drawRoom(v, r.st.scene);
      drawRig(v, r.st, r.basis, { volume: true, axes: true, label: false });
      const sq = pixelSquare(r.cam, r.basis, r.px, r.py);
      v.poly(sq.corners.map(P), COL.gold, { closed: true, k: 'pixel' });
      v.point(P(sq.center), COL.gold, { r: 0.025, k: 'pixel' });
      const end = r.hit ? r.p : T.add(r.eye, T.scale(r.dir, 9));
      v.arrow(P(r.eye), P(end), COL.white, { k: 'primary', r: 0.012, head: 0.16, hr: 0.05 });
      if (r.hit) {
        v.point(P(r.p), COL.cyan, { r: 0.06, k: 'hit', label: SHORT[r.id], anchor: 'ar' });
        v.arrow(P(r.p), P(T.add(r.p, T.scale(r.n, 0.45))), COL.cyan, { k: 'hit', r: 0.008, head: 0.1, hr: 0.03 });
      } else v.label('misses the box', P(end), COL.gray, 'a', 'primary');
    },
    explain(m, r) {
      const where = r.hit ? `{hit|the ${NAMES[r.id]}} at {hit|t = ${f(r.t, 3)}}, p = ${vg(r.p, 3)}` : 'nothing: it passes beside the box, and the pixel is black';
      return {
        hud: `{pixel|pixel (${r.px}, ${r.py})} → {dir|d = ${vg(r.dir, 3)}} → ${r.hit ? `{hit|${SHORT[r.id]}, t = ${f(r.t, 2)}}` : 'a miss'}`,
        rows: [
          `{pixel|pixel (${r.px}, ${r.py})} of ${r.W} × ${r.H}; its center is (${r.px} + 0.5, ${r.py} + 0.5)`,
          `{sx|sx = 2 (${r.px} + 0.5) / ${r.W} − 1 = ${f(r.sx, 4)}}, {sy|sy = 1 − 2 (${r.py} + 0.5) / ${r.H} = ${f(r.sy, 4)}}`,
          `tan(fov / 2) = tan(${f(m.fov / 2, 1)}°) = ${f(r.tanHalf, 4)}; aspect ${r.W} / ${r.H} = ${f(r.W / r.H, 3)}`,
          `{plane|on the image plane}, one unit in front of the eye: sx tan aspect u + sy tan v − w = ${vg(r.toward, 3)}`,
          `{dir|d} = that, normalized = ${vg(r.dir, 4)}`,
          `the {primary|primary ray} e + t d hits ${where}`,
          `{whitted|Whitted}: ${rgb(r.whitted)} ${sw(r.whitted)}; {path|path tracer}: ${r.pathText}`,
        ],
        status: r.hit ? { text: `pixel (${r.px}, ${r.py}) sees the ${NAMES[r.id]}`, tone: 'info' } : { text: `pixel (${r.px}, ${r.py}) sees nothing: its ray passes beside the box`, tone: 'warn' },
        values: [['pixel', `(${r.px}, ${r.py}) of ${r.W} × ${r.H}`, 'pixel'], ['(sx, sy)', `(${f(r.sx, 3)}, ${f(r.sy, 3)})`, 'sx'], ['d', vg(r.dir, 3), 'dir'], ['t', r.hit ? f(r.t, 3) : '∞', 'hit'], ['surface', r.hit ? NAMES[r.id] : 'none', 'hit'], ['field of view', `${m.fov}°`]],
        fact: 'The image plane in the scene carries the image itself: click it, or the inset, or any point of the box, to pick the pixel that sees it. The pixel is stored as a fraction of the image, so it stays on the same spot when the resolution changes.',
      };
    },
  });
}

// ================================================================ Whitted: the tree of rays

function whittedView(common) {
  let hover = -1, treeSig = '';
  return base(common, {
    id: 'whitted.tree', topic: 'whitted', label: 'tree of rays', inputTitle: 'Light and depth', home: CLOSE, selStart: -1,
    handles: [LIGHT_HANDLE],
    params: [{ id: 'depth', label: 'depth limit', min: 0, max: 8, step: 1 }, { id: 'size', label: 'light side', min: 0, max: 1.2, step: 0.05 }],
    regions: ['Whitted: the shadow rays', 'Whitted: shade a ray', 'Whitted: the tree of one pixel'],
    live: [],
    presets: [
      { label: 'the mirror sees the box', run: (m) => Object.assign(m, { ...PIX.mirror, ...WHITTED_STD, sel: -1, show: 'whitted' }) },
      { label: 'through the glass', run: (m) => Object.assign(m, { ...PIX.glass, ...WHITTED_STD, sel: -1, show: 'whitted' }) },
      { label: 'the box face by the red wall: white, no pink', run: (m) => { m.light.set(FRONT_LEFT[0], T.LIGHT_Y, FRONT_LEFT[1]); Object.assign(m, { ...PIX.face, ...WHITTED_STD, sel: -1, show: 'whitted' }); } },
      { label: 'the caustic spot: its shadow rays hit the glass', run: (m) => { m.light.set(BACK[0], T.LIGHT_Y, BACK[1]); Object.assign(m, { ...PIX.caustic, ...WHITTED_STD, sel: -1, show: 'whitted' }); } },
      { label: 'a shadow edge, 1 shadow ray: hard', run: (m) => { m.light.set(BACK[0], T.LIGHT_Y, BACK[1]); Object.assign(m, { ...PIX.penumbra, ...WHITTED_STD, shadowRays: 1, sel: -1, show: 'whitted' }); } },
      { label: 'the same edge, 16 shadow rays: a penumbra', run: (m) => { m.light.set(BACK[0], T.LIGHT_Y, BACK[1]); Object.assign(m, { ...PIX.penumbra, ...WHITTED_STD, sel: -1, show: 'whitted' }); } },
    ],
    leave() { hover = -1; },
    run(m) {
      const c = common.prepare(m, false);
      const node = T.tracePixel(c.st.scene, c.st.camera, c.px, c.py, c.st.wOpt);
      const tree = T.rayTree(node);
      const want = hover >= 0 ? hover : m.sel;
      const sel = want >= 0 && want < tree.rows.length && !tree.rows[want].isShadow ? want : -1;
      const direct = node.direct ?? {};
      return { ...c, ...node, ...direct, side: Math.round(Math.sqrt(m.shadowRays)), total: direct.count, node, tree, rows: tree.rows, sum: tree.sum, sel };
    },
    draw(v, m, r) {
      drawRoom(v, r.st.scene);
      drawRig(v, r.st, r.basis, { volume: false });
      for (const row of r.rows) {
        const n = row.node, key = `n${row.id}`, on = row.id === r.sel || row.parent === r.sel && row.isShadow;
        if (row.isShadow) {
          const lit = [], dark = [], rest = [], ends = [];
          for (const smp of n.direct.samples) {
            if (smp.visible) lit.push(n.p, smp.lightPoint);
            else {
              // a blocked shadow ray: solid gray to what stopped it, then faint to the point of the light it was aimed at
              const e = T.add(n.p, T.scale(smp.wi, Math.min(smp.blockerT, smp.r)));
              dark.push(n.p, e);
              if (smp.blocker >= 0) rest.push(e, smp.lightPoint);
              ends.push(e);
            }
          }
          lines(v, lit, COL.gold, { k: key, dashed: true, opacity: on || r.sel < 0 ? 1 : 0.5 });
          lines(v, dark, COL.gray, { k: key, opacity: on || r.sel < 0 ? 0.95 : 0.4 });
          lines(v, rest, COL.dim, { k: key, dashed: true, opacity: 0.6 });
          if (ends.length <= 16) ends.forEach((e) => v.point(P(e), COL.red, { r: 0.025, k: key }));
          continue;
        }
        const escapes = n.material === 'none';
        const end = escapes ? T.add(n.o, T.scale(n.d, 2.5)) : n.p;
        const color = KIND_COLOR[row.kind];
        v.arrow(P(n.o), P(end), color, { k: key, r: (row.id === r.sel ? 2.5 : 1) * (0.006 + 0.02 * Math.sqrt(row.accum)), head: 0.14, hr: row.id === r.sel ? 0.06 : 0.04 });
        if (escapes) v.point(P(end), COL.gray, { r: 0.035, k: key });
        else v.point(P(n.p), color, { r: row.id === r.sel ? 0.07 : 0.04, k: key });
        if (row.id === r.sel) v.label(`#${row.id} ${row.kind}: ${escapes ? 'leaves the box' : SHORT[n.id]}`, P(end), color, 'ar', key);
      }
    },
    explain(m, r) {
      const nodes = r.rows.filter((row) => !row.isShadow);
      const rows = [`{pixel|pixel (${r.px}, ${r.py})}: one primary ray through its center; depth limit ${Math.round(m.depth)}, ${plural(m.shadowRays, 'shadow ray')} per diffuse hit`];
      for (const row of nodes.slice(0, 9)) {
        const n = row.node, key = `n${row.id}`;
        let what;
        if (n.material === 'none') what = 'leaves the box: black';
        else if (n.material === 'light') what = `the light: Le = ${f(n.local[0], 1)}`;
        else if (n.material === 'diffuse') what = `the ${NAMES[n.id]}: {shadow|${n.direct.lit} of ${n.direct.count} shadow rays reach the light}, direct light ${rgb(n.local)}`;
        else if (n.material === 'mirror') what = `the mirror: sends reflection ×${f(n.wReflect, 2)}${n.truncated ? ' (cut by the depth limit)' : ''}`;
        else what = `the glass, ${n.entering ? 'entering' : 'leaving'}: ${n.bend.tir ? 'total internal reflection, ×1' : `reflection ×F = ${f(n.wReflect, 3)}, refraction ×(1 − F) = ${f(n.wRefract, 3)}`}${n.truncated ? ' (cut by the depth limit)' : ''}`;
        const line = `{${key}|#${row.id} ${row.kind}} hits ${what}`;
        rows.push(row.id === r.sel ? `<span style="background:#2a2310;border-radius:3px;padding:0 3px">${line}</span>` : line);
      }
      if (nodes.length > 9) rows.push(`... ${nodes.length - 9} more rays in the tree`);
      rows.push(`color = Σ accumulated weight × local = {sum|${rgb(r.sum)}} ${sw(r.sum)}`);
      const blockers = new Set();
      for (const row of r.rows) if (row.isShadow) for (const smp of row.node.direct.samples) if (!smp.visible && smp.blocker >= 0) blockers.add(NAMES[smp.blocker]);
      const blocked = r.tree.rows.filter((row) => row.isShadow).reduce((a, row) => a + row.node.direct.count - row.node.direct.lit, 0);
      return {
        hud: `pixel (${r.px}, ${r.py}): ${plural(r.tree.rays, 'ray')}, ${r.tree.shadowRays} of them shadow rays → {sum|color} ${sw(r.sum)}`,
        rows,
        status: { text: `${plural(nodes.length, 'ray')} in the tree, ${plural(r.tree.shadowRays, 'shadow ray')} (${blocked} blocked${blockers.size ? ` by the ${[...blockers].join(', the ')}` : ''})${r.tree.truncatedRays ? `; ${r.tree.truncatedRays} cut by the depth limit` : ''}`, tone: 'info' },
        values: [['pixel', `(${r.px}, ${r.py})`, 'pixel'], ['rays', String(r.tree.rays)], ['shadow rays', String(r.tree.shadowRays), 'shadow'], ['blocked', String(blocked), 'blocked'], ['color', rgb(r.sum, 3), 'sum'], ['red / green', ratio(r.sum)]],
        fact: 'Whitted\'s tracer bends rays only at the mirror and the glass and sends every other question to the light along a straight shadow ray, so a diffuse point gets the light it sees directly and nothing else: no ambient term, no light from the walls. Hover a node of the tree to find its ray; click to keep it.',
      };
    },
    panelTitle: 'The tree of rays of the pixel',
    panel(host, m, r, ctx) {
      if (once(host, 'whitted', (h) => {
        treeSig = '';
        h._seg = segmented(h, 'shadow rays', [[1, '1: the center', 'One shadow ray, to the light\'s center (Whitted)'], [4, '4'], [16, '16'], [64, '64', 'Cook\'s distributed rays: one per square of an 8 × 8 grid on the light']], () => ctx.state().shadowRays, (x) => { ctx.state().shadowRays = x; ctx.update(); });
        const box = el('div', 'rl-tree', h);
        box.addEventListener('mouseover', (e) => {
          const g = e.target.closest ? e.target.closest('.rl-node') : null;
          const id = g ? Number(g.dataset.id) : -1;
          if (id !== hover) { hover = id; ctx.refresh(); }
        });
        box.addEventListener('mouseleave', () => { if (hover !== -1) { hover = -1; ctx.refresh(); } });
        box.addEventListener('click', (e) => {
          const g = e.target.closest ? e.target.closest('.rl-node') : null;
          if (!g) return;
          const id = Number(g.dataset.id);
          ctx.state().sel = ctx.state().sel === id ? -1 : id;
          ctx.refresh();
        });
        el('div', 'rl-key', h).innerHTML = '<span><i style="background:#e7eaf0"></i>primary</span><span><i style="background:#ff7b72"></i>reflection</span><span><i style="background:#56d4dd"></i>refraction</span><span><i style="background:#ffd166"></i>shadow ray, lit</span><span><i style="background:#8b93a7"></i>shadow ray, blocked</span><span>node fill: its local term; square: its share of the pixel; number: accumulated weight; ×: weight on the edge; k/N: shadow rays that reach the light</span>';
      })) { /* built */ }
      host._seg();
      const sig = `${r.px},${r.py},${r.st.wKey}`;
      const box = host.querySelector('.rl-tree');
      if (sig !== treeSig) { treeSig = sig; box.innerHTML = treeSvg(r.rows); }
      box.querySelectorAll('.rl-node').forEach((g) => g.classList.toggle('sel', Number(g.dataset.id) === r.sel));
    },
  });
}

// ================================================================ Paths: the paths through a pixel

/** the first n paths of the picked pixel, their totals, and the background job's totals for the converged value */
export function pathsOf(engine, c, n) {
  const samples = [];
  for (let k = 0; k < n; k++) samples.push(T.pixelSample(c.st.scene, c.st.camera, c.px, c.py, k, c.st.pOpt));
  const totals = T.pixelPaths(c.st.scene, c.st.camera, c.px, c.py, 0, n, c.st.pOpt, T.emptyTotals());
  const job = engine.job && engine.job.key === `${c.st.pKey}|${c.px},${c.py}` ? engine.job : null;
  const conv = job && job.totals.count >= n ? T.pixelEstimate(job.totals) : T.pixelEstimate(totals);
  const convTotals = job && job.totals.count >= n ? job.totals : totals;
  return { samples, totals, est: T.pixelEstimate(totals), conv, convTotals, convCount: convTotals.count, jobDone: job ? job.done : true };
}

/** the paths as faint batched lines, their shadow rays dashed; colorOf(sample) picks each path's color */
export function drawPaths(v, eye, samples, { colorOf, sel = -1, nee = true, k = 'paths' } = {}) {
  const groups = new Map(), lit = [], dark = [];
  samples.forEach((smp, i) => {
    if (i === sel) return;
    const color = colorOf(smp);
    if (!groups.has(color)) groups.set(color, []);
    const seg = groups.get(color);
    let from = eye;
    for (const vx of smp.path.vertices) { seg.push(from, vx.p); from = vx.p; }
    const last = smp.path.vertices[smp.path.vertices.length - 1];
    if (smp.path.escaped) seg.push(from, T.add(from, T.scale(last ? last.direction : smp.dir, last ? 1.2 : 8)));
    if (nee) for (const vx of smp.path.vertices) if (vx.material === 'diffuse' && vx.lightPoint[1] > 0) (vx.visible ? lit : dark).push(vx.p, vx.lightPoint);
  });
  const faint = samples.length > 64 ? 0.22 : samples.length > 16 ? 0.4 : 0.6;
  for (const [color, seg] of groups) lines(v, seg, color, { k, opacity: color === COL.dim ? faint * 0.7 : faint });
  lines(v, lit, COL.green, { k: 'nee', dashed: true, opacity: faint * 0.8 });
  lines(v, dark, COL.red, { k: 'nee', dashed: true, opacity: faint * 0.6 });
}

/** one path drawn bright: an arrow per segment, its vertices sized by the throughput's luminance, its shadow rays */
export function drawOnePath(v, eye, smp, { label = true } = {}) {
  let from = eye;
  smp.path.vertices.forEach((vx, i) => {
    const key = `v${i + 1}`, color = PATH_COLORS[i % 9];
    v.arrow(P(from), P(vx.p), color, { k: key, r: 0.014, hr: 0.05, head: 0.15 });
    const T3 = vx.throughput, peak = Math.max(T3[0], T3[1], T3[2], 1e-6);
    const tint = (Math.round((255 * T3[0]) / peak) << 16) | (Math.round((255 * T3[1]) / peak) << 8) | Math.round((255 * T3[2]) / peak);
    v.point(P(vx.p), vx.material === 'light' ? COL.gold : tint, { r: 0.035 + 0.06 * Math.min(1, T.luminance(T3)), k: key });
    if (label && smp.path.vertices.length <= 7) v.label(`${i + 1}`, P(vx.p), color, i % 2 ? 'br' : 'ar', key);
    if (vx.material === 'diffuse' && vx.lightPoint[1] > 0) {
      v.dashed(P(vx.p), P(vx.lightPoint), vx.visible ? COL.green : COL.red, { k: key });
      v.point(P(vx.lightPoint), vx.visible ? COL.green : COL.red, { r: 0.025, k: key });
    }
    from = vx.p;
  });
  const last = smp.path.vertices[smp.path.vertices.length - 1];
  if (smp.path.escaped) v.arrow(P(from), P(T.add(from, T.scale(last ? last.direction : smp.dir, last ? 1.2 : 8))), COL.gray, { k: 'out', r: 0.01, hr: 0.04, head: 0.12 });
}

/** the rows of one path's vertex table, as path-lab's One path shows them */
export function vertexRows(smp, nee) {
  const rows = [];
  smp.path.vertices.slice(0, 7).forEach((vx, i) => {
    const key = `v${i + 1}`;
    if (vx.material === 'light') {
      rows.push(`{${key}|v${i + 1}, the light}: T = ${rgb(vx.throughput, 2)}${vx.contribution[0] > 0 ? `, {contribution|T × Le = ${rgb(vx.contribution, 3)}}` : ': already counted by the shadow ray before it'}`);
      return;
    }
    const how = vx.event === 'bounce' ? `× albedo ${rgb(vx.albedo, 2)}` : vx.event === 'mirror' ? '× reflectance 0.9' : vx.event === 'reflect' ? `reflects (F = ${f(vx.F, 3)}; × F / F = 1)` : vx.event === 'refract' ? `refracts (1 − F = ${f(1 - vx.F, 3)}; × 1)` : '';
    const stop = vx.stop === 'roulette' ? `, stopped by roulette (q = ${f(vx.q, 2)})` : vx.stop === 'depth' ? ', the depth limit' : vx.q < 1 ? `, ÷ q ${f(vx.q, 2)}` : '';
    rows.push(`{${key}|v${i + 1}, ${SHORT[vx.id]}}: {throughput|T = ${rgb(vx.throughput, 2)}} ${how}${stop}`);
    if (vx.material === 'diffuse' && nee) rows.push(`  shadow ray ${vx.visible ? 'reaches the light' : vx.blocker >= 0 ? `blocked by the ${SHORT[vx.blocker]}` : 'faces away'}: {contribution|T × direct = ${rgb(vx.contribution, 3)}}`);
  });
  if (smp.path.vertices.length > 7) rows.push(`... ${smp.path.vertices.length - 7} more vertices`);
  return rows;
}

/** the running mean against N, with the converged value and its 1/sqrt(N) band */
export function runningChart(totals, conv) {
  const n = totals.running.length, sd = Math.sqrt(conv.variance);
  const top = Math.max(0.05, ...totals.running, conv.meanLum + 2 * sd) * 1.08;
  return {
    x: [1, Math.max(2, n)], y: [0, top], xLabel: 'paths N', curve: 'running mean (gold), converged value ± 1 standard deviation / √N',
    series: [
      { fn: (x) => totals.running[Math.max(0, Math.min(n - 1, Math.round(x) - 1))], color: COL.gold },
      { fn: () => conv.meanLum, color: COL.white },
      { fn: (x) => conv.meanLum + sd / Math.sqrt(x), color: COL.gray },
      { fn: (x) => conv.meanLum - sd / Math.sqrt(x), color: COL.gray },
    ],
  };
}

function pathsView(engine, common) {
  let hover = -1;
  const colorOf = (smp) => (T.luminance(smp.path.radiance) > 0 ? COL.b : COL.dim);
  return base(common, {
    id: 'paths.pixel', topic: 'paths', label: 'paths through a pixel', inputTitle: 'Light and paths', home: CLOSE, selStart: 0,
    handles: [LIGHT_HANDLE],
    params: [{ id: 'maxDepth', label: 'max depth', min: 0, max: 10, step: 1 }, { id: 'size', label: 'light side', min: 0, max: 1.2, step: 0.05 }],
    regions: ['Path tracing: one path', 'Light paths: what one path carries', 'Path tracing: the paths through one pixel'],
    live: ['job', 'path'],
    presets: [
      { label: 'the floor, 16 paths', run: (m) => Object.assign(m, { ...PIX.floor, ...PATHS_STD, paths: 16, sel: 0, show: 'path' }) },
      { label: 'the floor, 256 paths', run: (m) => Object.assign(m, { ...PIX.floor, ...PATHS_STD, paths: 256, sel: 0, show: 'path' }) },
      { label: 'the ceiling: no direct light', run: (m) => Object.assign(m, { ...PIX.ceiling, ...PATHS_STD, paths: 64, sel: 0, show: 'path' }) },
      { label: 'through the glass', run: (m) => Object.assign(m, { ...PIX.glass, ...PATHS_STD, paths: 16, sel: 0, show: 'path' }) },
      { label: 'next-event estimation off', run: (m) => Object.assign(m, { ...PIX.floor, ...PATHS_STD, paths: 64, nee: false, sel: 0 }) },
      { label: 'roulette off, depth 3', run: (m) => Object.assign(m, { ...PIX.floor, ...PATHS_STD, paths: 64, roulette: 'off', maxDepth: 3, sel: 0 }) },
    ],
    leave() { hover = -1; },
    run(m) {
      const c = common.prepare(m, true);
      const n = m.paths;
      const p = pathsOf(engine, c, n);
      const at = hover >= 0 && hover < n ? hover : Math.max(0, Math.min(n - 1, m.sel));
      const smp = p.samples[at];
      const parts = T.lightPaths(smp.path);
      return { ...c, ...p, ...smp.path, ...parts, ...p.est, at, smp, sample: smp, n, colorOf };
    },
    draw(v, m, r) {
      drawRoom(v, r.st.scene);
      drawRig(v, r.st, r.basis, { volume: false });
      drawPaths(v, r.st.camera.eye, r.samples, { colorOf: r.colorOf, sel: r.at, nee: m.nee });
      drawOnePath(v, r.st.camera.eye, r.smp);
    },
    explain(m, r) {
      const words = r.names.length ? r.names.map((nm, i) => `${nm} ${rgb(r.contributions[i], 3)}`).join('; ') : 'nothing: no shadow ray reached the light, and it did not land on the light where that counts';
      return {
        hud: `{pixel|pixel (${r.px}, ${r.py})}: {mean|mean of ${r.n} = ${f(r.est.meanLum, 3)}} ± {se|${f(r.est.standardError, 3)}}; {converged|${commas(r.convCount)} paths: ${f(r.conv.meanLum, 3)}}`,
        rows: [
          `{mean|${plural(r.n, 'path')}: mean luminance ${f(r.est.meanLum, 4)}} ± {se|${f(r.est.standardError, 4)}} (standard error), color ${rgb(r.est.mean)} ${sw(r.est.mean)}`,
          `{converged|${commas(r.convCount)} paths${r.jobDone ? '' : ' so far'}: ${f(r.conv.meanLum, 4)} ± ${f(r.conv.standardError, 4)}}; ${r.totals.zeroPaths} of the ${r.n} paths carried nothing`,
          `path ${r.at} (${walkWords(r.smp.path)}): ${r.word}; it carries ${words}`,
          ...vertexRows(r.smp, m.nee),
          `{contribution|its sample L = ${rgb(r.smp.path.radiance)}}, luminance ${f(T.luminance(r.smp.path.radiance), 4)}`,
        ],
        status: Math.abs(r.est.meanLum - r.conv.meanLum) <= 3 * r.est.standardError + 1e-9
          ? { text: `the mean of ${r.n} is within ${f(Math.abs(r.est.meanLum - r.conv.meanLum) / Math.max(r.est.standardError, 1e-9), 1)} standard errors of the converged value; four times the paths halve the error`, tone: 'ok' }
          : { text: `the mean of ${r.n} is ${f(Math.abs(r.est.meanLum - r.conv.meanLum) / Math.max(r.est.standardError, 1e-9), 1)} standard errors from the converged value: a few rare, bright paths are not in it yet`, tone: 'warn' },
        chart: runningChart(r.totals, r.conv),
        values: [['paths', String(r.n)], ['mean', f(r.est.meanLum, 4), 'mean'], ['standard error', f(r.est.standardError, 4), 'se'], ['converged', `${f(r.conv.meanLum, 4)} (${commas(r.convCount)})`, 'converged'], ['zero paths', String(r.totals.zeroPaths)], ['rays, path ' + r.at, String(r.smp.path.rays)]],
        fact: 'Each path starts at its own random point of the pixel (the dots in the magnified pixel) and takes its own random bounces; the pixel is their mean. A path also carries the light its shadow rays find at each diffuse vertex (next-event estimation), so one walk is several light paths, named in Heckbert\'s notation read from the eye: E the eye, D a diffuse bounce, S a mirror or glass bounce, L the light.',
      };
    },
    panelTitle: 'The paths through the pixel',
    panel(host, m, r, ctx) {
      once(host, 'paths', (h) => {
        h._segs = [
          segmented(h, 'paths N', [[1, '1'], [4, '4'], [16, '16'], [64, '64'], [256, '256']], () => ctx.state().paths, (x) => { ctx.state().paths = x; ctx.update(); }),
          segmented(h, 'next-event', [[true, 'on', 'A shadow ray to the light at every diffuse vertex'], [false, 'off', 'Only a path that lands on the light counts']], () => ctx.state().nee, (x) => { ctx.state().nee = x; ctx.update(); }),
          segmented(h, 'roulette', [['off', 'off'], ['fixed', 'q = 0.7'], ['throughput', 'q = throughput']], () => ctx.state().roulette, (x) => { ctx.state().roulette = x; ctx.update(); }),
        ];
        const row = el('div', 'tl-pathrow', h);
        const pix = el('div', 'tl-pix', row);
        pix.addEventListener('click', (e) => {
          const c = e.target.closest ? e.target.closest('.tl-start') : null;
          if (c) { ctx.state().sel = Number(c.dataset.path); ctx.refresh(); }
        });
        const list = el('div', 'tl-list', row);
        list.addEventListener('mouseover', (e) => {
          const it = e.target.closest ? e.target.closest('[data-path]') : null;
          const id = it ? Number(it.dataset.path) : -1;
          if (id !== hover) { hover = id; ctx.refresh(); }
        });
        list.addEventListener('mouseleave', () => { if (hover !== -1) { hover = -1; ctx.refresh(); } });
        list.addEventListener('click', (e) => {
          const it = e.target.closest ? e.target.closest('[data-path]') : null;
          if (it) { ctx.state().sel = Number(it.dataset.path); ctx.refresh(); }
        });
      });
      host._segs.forEach((show) => show());
      host.querySelector('.tl-pix').innerHTML = pixelSvg(r.samples, (smp) => hex(r.colorOf(smp) === COL.dim ? 0x4a5266 : 0x79c0ff), r.at);
      const list = host.querySelector('.tl-list');
      const sig = `${r.st.pKey}|${r.px},${r.py}|${r.n}|${r.at}`;
      if (list.dataset.sig !== sig) {
        list.dataset.sig = sig;
        list.innerHTML = r.samples.slice(0, 256).map((smp, i) => {
          const parts = T.lightPaths(smp.path);
          const L = smp.path.radiance;
          return `<div class="tl-item${i === r.at ? ' on' : ''}" data-path="${i}"><b>${i}</b><span class="tl-walk">${walkWords(smp.path)}</span><span class="tl-word">${parts.word}${smp.path.hitLight ? '' : ''}</span><span class="tl-val">${f(T.luminance(L), 3)}</span>${sw(L)}</div>`;
        }).join('');
        // keep the selected path in sight, scrolling the list only (not the rail)
        const on = list.querySelector('.tl-item.on');
        if (on) {
          const top = on.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
          if (top < list.scrollTop || top > list.scrollTop + list.clientHeight - 20) list.scrollTop = Math.max(0, top - 40);
        }
      }
    },
  });
}

export function makeFirstViews(engine, common) {
  return [cameraView(engine, common), whittedView(common), pathsView(engine, common)];
}

export { PIXEL_CAP };
