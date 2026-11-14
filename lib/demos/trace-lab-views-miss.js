// trace-lab-views-miss: the catalog behind the trace-lab demo, part two: "What Whitted cannot see" (the ray-tracing lecture's slide).
// The two images side by side, then one view per effect: soft shadows (the penumbra), color bleeding (the box face by the red wall),
// caustics (light focused by the glass onto the floor). Each reads the same pixel both ways: Whitted's tree, and the paths of the
// path tracer with the background job's thousands of paths for the converged value and the shares (trace-lab-render.js).
import * as T from '../programs/trace-lab/webgl/tracelab.js';
import { COL, V } from '../core/lab-viz.js';
import { P, f, plural, commas, el, segmented, once } from './ray-lab-ui.js';
import { NAMES, SHORT, CLOSE, lines, drawRoom, drawRig, imageCanvas, paintCopy, pixelAt } from './trace-lab-kit.js';
import { LIGHT_HANDLE, PATH_COLORS, PIX, BACK, FRONT_LEFT, rgb, sw, ratio, setPixel, pathsOf, drawPaths, drawOnePath, vertexRows, base } from './trace-lab-views.js';

const pct = (x, d = 0) => `${f(100 * x, d)} %`;
const at = (m, where, light = null, extra = {}) => {
  if (light) m.light.set(light[0], T.LIGHT_Y, light[1]);
  // a preset states the tracers' settings it was written for, whatever an earlier one left
  Object.assign(m, PIX[where], { sel: -1, maxDepth: 6, nee: true, roulette: 'fixed', depth: 5, shadowRays: 16, size: 0.6 }, extra);
};

/** Whitted's first hit at the pixel, its shadow rays, and a summary of the tree */
function whittedAt(c) {
  const node = T.tracePixel(c.st.scene, c.st.camera, c.px, c.py, c.st.wOpt);
  return { node, color: node.color, tree: T.rayTree(node) };
}

// ================================================================ the two images, side by side

function sideView(engine, common) {
  let stage = null;
  const canvases = [];
  const paintStage = (s) => {
    if (!stage || stage.style.display === 'none') return;
    paintCopy(canvases[0], engine.whittedNow?.canvas, s.px, s.py);
    paintCopy(canvases[1], engine.path?.canvas, s.px, s.py);
    stage.querySelector('[data-cap="whitted"]').textContent = `Whitted: ${common.caption('whitted').replace(/^Whitted, /, '').replace(/ Click a pixel\.$/, '')}`;
    stage.querySelector('[data-cap="path"]').textContent = `path tracer: ${common.caption('path').replace(/^Path tracer, /, '').replace(/ Click a pixel\.$/, '')}`;
  };
  return base(common, {
    id: 'miss.side', topic: 'miss', label: 'side by side', inputTitle: 'Light', inset: false, home: CLOSE,
    handles: [LIGHT_HANDLE],
    params: [{ id: 'size', label: 'light side', min: 0, max: 1.2, step: 0.05 }, { id: 'maxDepth', label: 'path max depth', min: 0, max: 10, step: 1 }],
    regions: ['Whitted: render the image', 'Path tracing: render the image', 'Noise, measured'],
    live: ['job', 'path'],
    presets: [
      { label: 'the ceiling: black for Whitted', run: (m) => at(m, 'ceiling', BACK) },
      { label: 'the floor in the glass\'s shadow: the caustic', run: (m) => at(m, 'caustic', BACK) },
      { label: 'the box face by the red wall', run: (m) => at(m, 'face', BACK) },
      { label: 'the open floor: the path tracer adds the walls\' light', run: (m) => at(m, 'floor', BACK) },
      { label: 'the same floor, path max depth 0: the two agree', run: (m) => at(m, 'floor', BACK, { maxDepth: 0 }) },
    ],
    setup(ctx) {
      if (!stage) {
        stage = el('div', 'tl-stage', ctx.sceneEl);
        for (const ev of ['mousedown', 'wheel', 'touchstart', 'pointerdown']) stage.addEventListener(ev, (e) => e.stopPropagation());
        for (const kind of ['whitted', 'path']) {
          const cell = el('div', 'tl-scell', stage);
          el('div', 'tl-scap', cell).dataset.cap = kind;
          const c = imageCanvas(cell, 'rl-pick');
          c.addEventListener('click', (e) => {
            const s = common.s;
            if (!s.m || !s.st) return;
            const [px, py] = pixelAt(c, e, s.st.width, s.st.height);
            setPixel(s.m, px, py);
            ctx.update();
          });
          canvases.push(c);
        }
      }
      stage.style.display = '';
    },
    leave() { if (stage) stage.style.display = 'none'; },
    repaint: (s) => paintStage(s),
    run(m) {
      const c = common.prepare(m, true);
      const w = whittedAt(c);
      const p = pathsOf(engine, c, 16);
      const img = engine.path, stats = img ? img.stats() : { spp: 0, noise: 0, mean: 0 };
      const noise = { mean: stats.mean, noise: stats.noise };
      return { ...c, w, p, stats, ...noise, spp: stats.spp };
    },
    draw(v, m, r) { drawRoom(v, r.st.scene); },
    explain(m, r) {
      const wc = r.w.color, pc = r.p.conv.mean, n = r.p.convCount;
      const diff = T.luminance(pc) - T.luminance(wc);
      const first = r.w.node;
      let why;
      if (first.material === 'none') why = { text: 'a miss: both tracers return black', tone: 'info' };
      else if (r.p.conv.causticShare > 0.3) why = { text: `${pct(r.p.conv.causticShare)} of the path tracer's light here came through the glass to the floor: a caustic, which Whitted's straight shadow rays cannot find`, tone: 'warn' };
      else if (first.material === 'diffuse' && T.luminance(wc) === 0 && T.luminance(pc) > 0) why = { text: 'Whitted: black, since no shadow ray reaches the light and it has no other source; the path tracer finds light that bounced off the other surfaces', tone: 'warn' };
      else if (r.p.conv.redShare > 0.3) why = { text: `${pct(r.p.conv.redShare)} of the light here came by way of the red wall: color bleeding`, tone: 'warn' };
      else if (Math.abs(diff) < 3 * r.p.conv.standardError + 0.01 * T.luminance(wc)) why = { text: 'the two agree within the path tracer\'s error: direct light, which both compute with the same formula', tone: 'ok' };
      else why = { text: `the path tracer is ${diff > 0 ? 'brighter' : 'darker'} by ${f(Math.abs(diff), 3)}: ${diff > 0 ? 'light from more than one bounce' : 'its max depth cuts light Whitted\'s tree keeps'}`, tone: 'info' };
      return {
        hud: `{pixel|pixel (${r.px}, ${r.py})}: {whitted|Whitted ${f(T.luminance(wc), 3)}}, {path|path ${f(T.luminance(pc), 3)}} (${commas(n)} paths)`,
        rows: [
          `{pixel|pixel (${r.px}, ${r.py})} sees ${first.material === 'none' ? 'nothing' : `the ${NAMES[first.id]}`}`,
          `{whitted|Whitted}: ${rgb(wc)} ${sw(wc)}, red / green ${ratio(wc)}`,
          `{path|path tracer}, ${commas(n)} paths: ${rgb(pc)} ${sw(pc)} ± ${f(r.p.conv.standardError, 3)}, red / green ${ratio(pc)}`,
          `of the path tracer's light: ${pct(r.p.conv.redShare)} by way of the red wall, ${pct(r.p.conv.causticShare)} through the glass (caustic paths)`,
          `the whole path image: ${r.spp} samples per pixel, noise ${pct(r.noise, 1)}`,
        ],
        status: why,
        values: [['Whitted', f(T.luminance(wc), 4), 'whitted'], ['path', f(T.luminance(pc), 4), 'path'], ['difference', f(diff, 4)], ['paths', commas(n)], ['via the red wall', pct(r.p.conv.redShare), 'red'], ['caustic', pct(r.p.conv.causticShare), 'caustic']],
        fact: 'The same box, camera and light, the same direct-light formula. Where the two differ, the path tracer is seeing light that took a diffuse bounce Whitted never takes: the ceiling (lit only by the floor), filled shadows, the pink of the box face by the red wall, and the bright spot in front of the glass sphere. Click either image to pick a pixel.',
      };
    },
  });
}

// ================================================================ soft shadows

function softView(engine, common) {
  return base(common, {
    id: 'miss.soft', topic: 'miss', label: 'soft shadows', inputTitle: 'Light', home: CLOSE,
    handles: [LIGHT_HANDLE],
    params: [{ id: 'size', label: 'light side', min: 0, max: 1.2, step: 0.05 }],
    regions: ['Whitted: the shadow rays', 'Next-event estimation', 'Sampling the light by area'],
    live: [],
    presets: [
      { label: 'the edge of the glass sphere\'s shadow', run: (m) => at(m, 'penumbra', BACK, { size: 0.6, show: 'whitted' }) },
      { label: 'the same point, a point light: hard', run: (m) => at(m, 'penumbra', BACK, { size: 0, show: 'whitted' }) },
      { label: 'the same point, a larger light', run: (m) => at(m, 'penumbra', BACK, { size: 1.1, show: 'whitted' }) },
      { label: 'in the umbra', run: (m) => at(m, 'umbra', BACK, { size: 0.6, show: 'whitted' }) },
    ],
    run(m) {
      const c = common.prepare(m, false);
      const first = T.intersect(c.st.scene, c.st.camera.eye, T.pixelRay(c.st.camera.eye, c.basis, c.st.camera.fovDeg, c.W, c.H, c.px, c.py, 0.5, 0.5).dir);
      if (first.material !== 'diffuse') return { ...c, first, ok: false };
      const n = T.dot(first.n, T.sub(c.st.camera.eye, first.p)) < 0 ? T.scale(first.n, -1) : first.n;
      const rng = T.makeRng(T.pathSeed(c.px, c.py, 0));
      const one = T.directLight(c.st.scene, first.p, n, first.albedo, 1, rng);
      const many = T.directLight(c.st.scene, first.p, n, first.albedo, m.shadowRays, T.makeRng(T.pathSeed(c.px, c.py, 0)));
      const exact = T.exactDirect(c.st.scene, first.p, n, first.albedo, 32);
      // the path tracer's own shadow ray at the pixel's first vertex, over 512 paths
      let seen = 0, count = 0, sum = [0, 0, 0];
      for (let k = 0; k < 512; k++) {
        const smp = T.pixelSample(c.st.scene, c.st.camera, c.px, c.py, k, { maxDepth: 0, roulette: 'off', nee: true });
        const v0 = smp.path.vertices[0];
        if (!v0 || v0.material !== 'diffuse') continue;
        count += 1;
        if (v0.visible) seen += 1;
        sum = T.add(sum, v0.contribution);
      }
      const pathFraction = count ? seen / count : 0;
      const pathDirect = T.scale(sum, count ? 1 / count : 0);
      const ne = many.samples[0];
      const area = T.areaLightSample(c.st.scene.lightArea, c.st.scene.power, ne.r, ne.cosSurface, ne.cosLight);
      return { ...c, ok: true, first, p: first.p, n, one, many, exact, pathFraction, pathDirect, pathCount: count, ...many, ...ne, ...area, lightArea: c.st.scene.lightArea, power: c.st.scene.power };
    },
    draw(v, m, r) {
      drawRoom(v, r.st.scene);
      drawRig(v, r.st, r.basis, { volume: false });
      if (!r.ok) return;
      v.point(P(r.p), COL.pink, { r: 0.05, k: 'pixel', label: 'the point', anchor: 'bl' });
      const lit = [], dark = [], rest = [], ends = [];
      for (const smp of r.many.samples) {
        if (smp.visible) lit.push(r.p, smp.lightPoint);
        else {
          const e = T.add(r.p, T.scale(smp.wi, Math.min(smp.blockerT, smp.r)));
          dark.push(r.p, e);
          if (smp.blocker >= 0) rest.push(e, smp.lightPoint);
          ends.push(e);
        }
      }
      lines(v, lit, COL.gold, { k: 'shadow', dashed: true });
      lines(v, dark, COL.gray, { k: 'blocked' });
      lines(v, rest, COL.dim, { k: 'blocked', dashed: true, opacity: 0.6 });
      ends.slice(0, 64).forEach((e) => v.point(P(e), COL.red, { r: 0.02, k: 'blocked' }));
      // the light's strata, each tinted by whether its shadow ray got through
      const s = r.st.scene, side = Math.round(Math.sqrt(r.many.count)), cell = s.lightSide / side, y = s.lightY - 0.006;
      if (s.lightSide > 0) {
        r.many.samples.forEach((smp, i) => {
          const a = Math.floor(i / side), b = i % side;
          const x0 = s.lightX - s.lightSide / 2 + a * cell, z0 = s.lightZ - s.lightSide / 2 + b * cell;
          v.patch([V(x0, y, z0), V(x0 + cell, y, z0), V(x0 + cell, y, z0 + cell), V(x0, y, z0 + cell)], smp.visible ? COL.green : COL.red, 0.5, { k: 'fraction' });
        });
      }
    },
    explain(m, r) {
      if (!r.ok) {
        return { hud: `pixel (${r.px}, ${r.py}) does not see a diffuse surface`, rows: ['Pick a pixel on the floor or a wall, near the edge of a shadow.'], status: { text: 'no diffuse surface at this pixel', tone: 'info' } };
      }
      const N = r.many.count;
      return {
        hud: `{pixel|pixel (${r.px}, ${r.py})}: light visible: {whitted|1 ray ${r.one.lit}/1}, {fraction|${N} rays ${r.many.lit}/${N}}, {exact|exact ${pct(r.exact.fraction)}}, {path|path tracer ${pct(r.pathFraction)}}`,
        rows: [
          `the point sees the light of side ${f(m.size, 2)}${m.size === 0 ? ' (a point light: all of it or none of it)' : ''}`,
          `{whitted|1 shadow ray}, to the light's center: ${r.one.lit ? 'reaches it' : `blocked by the ${NAMES[r.one.samples[0].blocker] ?? 'surface itself'}`}: visible fraction ${r.one.lit}, direct ${rgb(r.one.contribution)}`,
          `{fraction|${N} shadow rays}, one per square of a ${Math.sqrt(N)} × ${Math.sqrt(N)} grid on the light: ${r.many.lit} reach it, fraction ${f(r.many.fraction, 3)}, direct ${rgb(r.many.contribution)}`,
          `{exact|exact}, a 32 × 32 grid: fraction ${f(r.exact.fraction, 3)}, direct ${rgb(r.exact.contribution)}`,
          `{path|the path tracer's} shadow ray at its first vertex, ${r.pathCount} paths that start all over the pixel's square: ${f(r.pathFraction, 3)} reach the light, direct ${rgb(r.pathDirect)}`,
        ],
        status: m.size === 0 ? { text: `a point light: every shadow ray goes to the same point, so each point is lit or not, and the shadow is hard${r.pathFraction > 0.02 && r.pathFraction < 0.98 ? `; the path tracer's ${pct(r.pathFraction)} is the part of the pixel's square that is lit: the hard edge crosses this pixel` : ''}`, tone: 'info' }
          : r.exact.fraction > 0.02 && r.exact.fraction < 0.98 ? { text: `the penumbra: this point sees ${pct(r.exact.fraction)} of the light. One shadow ray says ${r.one.lit ? 'all' : 'none'} of it; ${N} rays say ${pct(r.many.fraction)}; the path tracer's shadow rays agree`, tone: 'ok' }
            : { text: r.exact.fraction >= 0.98 ? 'fully lit: every shadow ray reaches the light' : 'the umbra: no part of the light is visible', tone: 'info' },
        values: [['1 ray', String(r.one.lit), 'whitted'], [`${N} rays`, f(r.many.fraction, 3), 'fraction'], ['exact', f(r.exact.fraction, 3), 'exact'], ['path tracer', f(r.pathFraction, 3), 'path'], ['light side', f(m.size, 2), 'light'], ['G', f(r.G, 4)]],
        fact: 'Cook, Porter and Carpenter, 1984: a hard shadow edge is an integral over the light replaced by one sample. Sending N rays to points spread over the light, and averaging, gives the fraction of the light each point sees. The path tracer does the same with one random point per path, averaged over its paths. Move the light or change its size: a larger light, or a point farther below it, widens the penumbra.',
      };
    },
    panelTitle: 'Shadow rays per hit',
    panel(host, m, r, ctx) {
      once(host, 'soft', (h) => {
        h._seg = segmented(h, 'shadow rays', [[1, '1'], [4, '4'], [16, '16'], [64, '64']], () => ctx.state().shadowRays, (x) => { ctx.state().shadowRays = x; ctx.update(); });
        el('p', 'lab-note', h, 'Squares on the light: green where that square\'s shadow ray reached it, red where it was blocked.');
      });
      host._seg();
    },
  });
}

// ================================================================ color bleeding and caustics: the paths that carry them

function pathsMissView(engine, common, kind) {
  const bleed = kind === 'bleed';
  const tagged = (smp) => {
    const parts = T.lightPaths(smp.path);
    return bleed ? parts.viaRed.some(Boolean) : parts.caustic.some(Boolean);
  };
  const colorOf = (smp) => (tagged(smp) ? (bleed ? COL.pink : COL.gold) : COL.dim);
  let picked = -1, pickedAt = '';
  return base(common, {
    id: bleed ? 'miss.bleed' : 'miss.caustic', topic: 'miss', label: bleed ? 'color bleeding' : 'caustics', home: CLOSE, selStart: -1,
    inputTitle: 'Light', handles: [LIGHT_HANDLE],
    params: [{ id: 'size', label: 'light side', min: 0, max: 1.2, step: 0.05 }, { id: 'maxDepth', label: 'path max depth', min: 0, max: 10, step: 1 }],
    regions: bleed ? ['Light paths: what one path carries', 'Path tracing: one path'] : ['Light paths: what one path carries', 'Reflection and refraction', 'Path tracing: one path'],
    live: ['job'],
    presets: bleed ? [
      { label: 'the box face, the light grazing it', run: (m) => at(m, 'face', FRONT_LEFT, { paths: 64, size: 0.6, show: 'path' }) },
      { label: 'the box face, the light behind the box', run: (m) => at(m, 'face', BACK, { paths: 64, size: 0.6, show: 'path' }) },
      { label: 'the floor by the red wall', run: (m) => at(m, 'redFloor', BACK, { paths: 64, size: 0.6, show: 'path' }) },
      { label: 'the ceiling', run: (m) => at(m, 'ceiling', BACK, { paths: 64, size: 0.6, show: 'path' }) },
    ] : [
      { label: 'the caustic', run: (m) => at(m, 'caustic', BACK, { paths: 256, size: 0.6, show: 'path' }) },
      { label: 'the caustic, light side 0: a point light', run: (m) => at(m, 'caustic', BACK, { paths: 256, size: 0, show: 'path' }) },
      { label: 'the caustic, a larger light', run: (m) => at(m, 'caustic', BACK, { paths: 256, size: 1, show: 'path' }) },
      { label: 'the umbra beside it', run: (m) => at(m, 'umbra', BACK, { paths: 256, size: 0.6, show: 'path' }) },
    ],
    run(m) {
      const c = common.prepare(m, true);
      const w = whittedAt(c);
      if (pickedAt !== `${c.st.pKey}|${c.px},${c.py}`) { pickedAt = `${c.st.pKey}|${c.px},${c.py}`; picked = m.sel >= 0 ? m.sel : -1; }
      const n = Math.max(16, m.paths);
      const p = pathsOf(engine, c, n);
      const marked = p.samples.map((smp, i) => (tagged(smp) ? i : -1)).filter((i) => i >= 0);
      const first = marked.length ? marked[0] : 0;
      const smp = p.samples[picked >= 0 && picked < n ? picked : first];
      const parts = T.lightPaths(smp.path);
      let peak = 0;
      for (const s2 of p.samples) peak = Math.max(peak, T.luminance(s2.path.radiance));
      const example = T.mul([0.75, 0.75, 0.75], [0.75, 0.15, 0.15]);
      return { ...c, ...smp.path, ...parts, w, p, n, marked, smp, at: p.samples.indexOf(smp), peak, example };
    },
    draw(v, m, r) {
      drawRoom(v, r.st.scene);
      drawRig(v, r.st, r.basis, { volume: false });
      drawPaths(v, r.st.camera.eye, r.p.samples, { colorOf, sel: r.at, nee: m.nee });
      drawOnePath(v, r.st.camera.eye, r.smp);
      // Whitted's shadow rays from the first hit, for the caustic: they stop at the glass
      const d = r.w.node.direct;
      if (!bleed && d) {
        const dark = [], lit = [];
        const rest = [];
        for (const smp of d.samples) {
          const e = T.add(r.w.node.p, T.scale(smp.wi, Math.min(smp.blockerT, smp.r)));
          (smp.visible ? lit : dark).push(r.w.node.p, e);
          if (!smp.visible && smp.blocker >= 0) rest.push(e, smp.lightPoint);
        }
        lines(v, dark, COL.white, { k: 'whitted', opacity: 0.95 });
        lines(v, rest, COL.dim, { k: 'whitted', dashed: true, opacity: 0.6 });
        lines(v, lit, COL.gold, { k: 'whitted', dashed: true });
      }
    },
    explain(m, r) {
      const conv = r.p.conv, N = r.p.convCount, wc = r.w.color, pc = conv.mean;
      const d = r.w.node.direct;
      const share = bleed ? conv.redShare : conv.causticShare;
      const rows = [];
      rows.push(`{pixel|pixel (${r.px}, ${r.py})} sees ${r.w.node.material === 'none' ? 'nothing' : `the ${NAMES[r.w.node.id]}`}`);
      if (d) rows.push(`{whitted|Whitted}: ${d.lit} of ${d.count} shadow rays reach the light${d.lit < d.count ? ` (blocked by the ${[...new Set(d.samples.filter((x) => !x.visible && x.blocker >= 0).map((x) => SHORT[x.blocker]))].join(', ') || 'surface itself'})` : ''}: ${rgb(wc)} ${sw(wc)}, red / green ${ratio(wc)}`);
      else rows.push(`{whitted|Whitted}: ${rgb(wc)} ${sw(wc)}`);
      rows.push(`{path|path tracer}, ${commas(N)} paths: ${rgb(pc)} ${sw(pc)} ± ${f(conv.standardError, 3)}, red / green ${ratio(pc)}`);
      if (bleed) {
        rows.push(`{red|by way of the red wall}: ${pct(share)} of the pixel's light; ${plural(r.marked.length, 'path')} of the ${r.n} drawn carry some (pink)`);
        rows.push(`the lecture's path, floor then red wall: throughput 0.75 × (0.75, 0.15, 0.15) = ${rgb(r.example, 4)}: the red wall keeps five times the green and blue of what it receives`);
      } else {
        rows.push(`{caustic|through the glass} (E D S S L and longer): ${pct(share)} of the pixel's light; ${plural(r.marked.length, 'path')} of the ${r.n} drawn carry some (gold); over all ${commas(N)}: ${pct(r.p.convTotals.causticPaths / Math.max(1, r.p.convTotals.count), 1)} of the paths`);
        rows.push(`the brightest of the ${r.n} paths: ${f(r.peak, 2)}, ${f(r.peak / Math.max(conv.meanLum, 1e-9), 1)} times the pixel's mean ${f(conv.meanLum, 3)}`);
      }
      rows.push(`path ${r.at}: ${r.word}; ${r.names.length ? r.names.map((nm, i) => `${nm} ${rgb(r.contributions[i], 3)}`).join('; ') : 'it carries nothing'}`);
      rows.push(...vertexRows(r.smp, m.nee).slice(0, 6));
      let status;
      if (bleed) {
        status = conv.redOverGreen > 1.15 && wc[1] > 0
          ? { text: `red / green: Whitted ${f(wc[0] / wc[1], 2)}, path tracer ${f(conv.redOverGreen, 2)}: the face is pink only where light can bounce off the red wall onto it`, tone: 'ok' }
          : wc[1] === 0 ? { text: `Whitted: black (no shadow ray reaches the light); the path tracer: red / green ${f(conv.redOverGreen, 2)}`, tone: 'warn' }
            : { text: `red / green: Whitted ${ratio(wc)}, path tracer ${f(conv.redOverGreen, 2)}`, tone: 'info' };
      } else {
        status = m.size === 0
          ? { text: `a point light: no path can land on it, so nothing comes through the glass: ${pct(share)} caustic, however many samples (the supplement's "Where unidirectional path tracing fails")`, tone: 'warn' }
          : share > 0.3 ? { text: `Whitted: ${d && d.lit === 0 ? 'dark, its shadow rays stopped by the glass' : 'what its shadow rays see'}; path tracer: ${pct(share)} of this pixel came through the glass, from ${pct(r.marked.length / r.n)} of the paths, each of them bright`, tone: 'ok' }
            : { text: `${pct(share)} of this pixel came through the glass`, tone: 'info' };
      }
      return {
        hud: `{pixel|pixel (${r.px}, ${r.py})}: {whitted|Whitted ${f(T.luminance(wc), 3)}}, {path|path ${f(conv.meanLum, 3)}}, {${bleed ? 'red' : 'caustic'}|${pct(share)} ${bleed ? 'by way of the red wall' : 'through the glass'}}`,
        rows, status,
        values: bleed
          ? [['Whitted R/G', ratio(wc), 'whitted'], ['path R/G', f(conv.redOverGreen, 2), 'path'], ['via the red wall', pct(share), 'red'], ['paths', commas(N)], ['Whitted', rgb(wc, 3)], ['path', rgb(pc, 3)]]
          : [['Whitted', f(T.luminance(wc), 4), 'whitted'], ['path', f(conv.meanLum, 4), 'path'], ['caustic share', pct(share), 'caustic'], ['paths', commas(N)], ['light side', f(m.size, 2), 'light'], ['brightest / mean', f(r.peak / Math.max(conv.meanLum, 1e-9), 1)]],
        fact: bleed
          ? 'Color bleeding is diffuse to diffuse: light reaches the red wall, which keeps mostly red, and the wall lights the box. Whitted\'s tracer never leaves a diffuse surface except toward the light, so the face is white where it is lit and black where it is not. No line of the path tracer mentions color; each bounce multiplies the throughput by the albedo.'
          : 'A caustic is specular to diffuse, seen from the light: the glass focuses the light onto the floor. Whitted\'s shadow ray from the floor goes in a straight line, meets the glass and stops. The path tracer finds the light only when a random bounce from the floor enters the glass and, bent twice, lands on the light: few paths, each very bright, so the caustic is noisy. A point light cannot be landed on, and the caustic vanishes.',
      };
    },
    panelTitle: bleed ? 'The paths by way of the red wall' : 'The paths through the glass',
    panel(host, m, r, ctx) {
      once(host, kind, (h) => {
        h._segs = [
          segmented(h, 'paths N', [[16, '16'], [64, '64'], [256, '256']], () => Math.max(16, ctx.state().paths), (x) => { ctx.state().paths = x; ctx.update(); }),
          segmented(h, 'next-event', [[true, 'on'], [false, 'off']], () => ctx.state().nee, (x) => { ctx.state().nee = x; ctx.update(); }),
        ];
        el('p', 'lab-note', h, bleed ? 'Pink: the paths that reach the light by way of the red wall. Click a dot or a pink path number to follow one.' : 'Gold: the paths that reach the light through the glass. Click a dot or a number to follow one.');
        el('div', 'tl-chips', h).addEventListener('click', (e) => {
          const b = e.target.closest ? e.target.closest('[data-path]') : null;
          if (b) { picked = Number(b.dataset.path); ctx.state().sel = picked; ctx.refresh(); }
        });
      });
      host._segs.forEach((show) => show());
      host.querySelector('.tl-chips').innerHTML = r.marked.slice(0, 48).map((i) => `<button type="button" class="lab-btn${i === r.at ? ' on' : ''}" data-path="${i}" style="color:${bleed ? '#ff79c6' : '#ffd166'}">${i}</button>`).join('') || `<span class="lab-note">none of the ${r.n} paths</span>`;
    },
  });
}

export function makeMissViews(engine, common) {
  return [sideView(engine, common), softView(engine, common), pathsMissView(engine, common, 'bleed'), pathsMissView(engine, common, 'caustic')];
}

export { PATH_COLORS };
