// light-lab-views-img: the catalog behind the light-lab demo, second half: the views whose picture is an image the program renders per pixel
// (shading per vertex and per pixel, tone mapping, the sRGB curve, blending and lighting in the wrong space). Each view covers the lab's
// scene with a Stage of canvases (light-lab-images.js) and draws nothing in 3D. First half: light-lab-views.js.
import * as LL from '../programs/light-lab/webgl/lightlab.js';
import { Stage, paint, slices, el, segmented, once, chart, putRgb, putBg, byte } from './light-lab-images.js';
import { KEYS, f, vt, toDirection, DEG } from './light-lab-views.js';

const WHITE = [1, 1, 1];
const camButtons = (ctx, on) => { const e = ctx.sceneEl?.querySelector('.lab-views'); if (e) e.style.display = on ? '' : 'none'; };

/** one stage per view: made when the view is entered, removed when it is left */
function stageHost(specs, opts) {
  const h = { stage: null };
  h.setup = (ctx) => { if (!ctx.sceneEl) return; camButtons(ctx, false); h.stage = new Stage(ctx.sceneEl, specs, opts); h.stage.cells.forEach((c, i) => { c.onClick = (u, v) => h.click?.(i, u, v, ctx); }); h.ctx = ctx; };
  h.leave = (ctx) => { h.stage?.destroy(); h.stage = null; if (ctx?.sceneEl) camButtons(ctx, true); };
  /** run fn when the cell's key changes */
  h.when = (i, key, fn) => { const c = h.stage?.cells[i]; if (c && c.key !== key) { c.key = key; fn(c); } };
  return h;
}

// ---------------------------------------------------------------- a small icosphere for the shading view
function icosphere(level) {
  const t = (1 + Math.sqrt(5)) / 2;
  let pos = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(LL.normalize);
  let tris = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let k = 0; k < level; k++) {
    const cache = new Map(), next = [];
    const mid = (a, b) => { const key = a < b ? `${a}|${b}` : `${b}|${a}`; if (!cache.has(key)) { cache.set(key, pos.length); pos = [...pos, LL.normalize(LL.add(pos[a], pos[b]))]; } return cache.get(key); };
    for (const [a, b, c] of tris) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); next.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
    tris = next;
  }
  return { pos, tris };
}
const meshes = [0, 1, 2].map((l) => icosphere(l));
const SHADE_KD = [0.8, 0.45, 0.25], SHADE_KS = [0.9, 0.9, 0.9];
const SCALE = 0.92;

function shadeParams(m) {
  const L = toDirection(m.az, m.el);
  const shade = (P, N) => LL.shadeSurface(P, N, LL.add(P, [0, 0, 100]), [LL.add(P, LL.scale(L, 100))], [WHITE], WHITE, 0.1, SHADE_KD, SHADE_KS, m.s, m.model, false);
  return { L, shade };
}
/** the colors of the corners of triangle t, per vertex */
function cornerColors(mesh, sp) { return mesh.pos.map((p) => sp.shade(p, p).color); }

export function makeImageViews() {
  const views = [];

  // ============================================================ Gouraud against Phong shading on a coarse mesh
  const sh = stageHost([{ aspect: 1, w: 240, h: 240, caption: 'per vertex (Gouraud)' }, { aspect: 1, w: 240, h: 240, caption: 'per pixel (Phong shading)' }]);
  const shState = { covered: 0 };
  /** which front-facing triangle covers the point (u, v) of the unit disc, with its weights */
  function locate(mesh, u, v) {
    for (let t = 0; t < mesh.tris.length; t++) {
      const [a, b, c] = mesh.tris[t].map((i) => mesh.pos[i]);
      if (LL.dot(LL.add(LL.add(a, b), c), [0, 0, 1]) <= 0) continue;
      const w = LL.barycentric([u, v], [a[0], a[1]], [b[0], b[1]], [c[0], c[1]]);
      if (w.inside) return { t, w: [w.u, w.v, w.w] };
    }
    return null;
  }
  const colorsAt = (mesh, sp, corners, hit) => {
    const [a, b, c] = mesh.tris[hit.t];
    const g = LL.gouraud(hit.w, corners[a], corners[b], corners[c]).color;
    const n = LL.phongShading(hit.w, mesh.pos[a], mesh.pos[b], mesh.pos[c]).normal;
    return { gouraud: g, phong: sp.shade(n, n).color, truth: sp.shade(n, n).color, normal: n };
  };
  views.push({
    id: 'local.shading', topic: 'local', label: 'per vertex, per pixel', inputTitle: 'Light and mesh',
    init: { az: 35, el: 30, s: 60, level: 0, wire: true, model: 'blinn', probe: [0.15, 0.1] },
    params: [{ id: 'az', label: 'light azimuth °', min: -180, max: 180, step: 1, play: true }, { id: 'el', label: 'light elevation °', min: -60, max: 89, step: 1 }, { id: 's', label: 'shininess s', min: 1, max: 128, step: 1 }],
    home: { eye: [0, 0, 6], target: [0, 0, 0] }, grid: 'none', axes: false,
    presets: [{ label: 'highlight on a vertex', run: (m) => aimHighlight(m, 'vertex') }, { label: 'highlight between vertices', run: (m) => aimHighlight(m, 'face') }, { label: '80 triangles', run: (m) => { m.level = 1; } }, { label: '320 triangles', run: (m) => { m.level = 2; } }],
    regions: ['Shading: barycentric weights', 'Shading: per vertex', 'Shading: per pixel', 'Shading: cost'],
    setup: sh.setup, leave: sh.leave,
    run(m) {
      const mesh = meshes[m.level], sp = shadeParams(m), corners = cornerColors(mesh, sp);
      const hit = locate(mesh, m.probe.x, m.probe.y);
      const at = hit ? colorsAt(mesh, sp, corners, hit) : null;
      const H = LL.normalize(LL.add(sp.L, [0, 0, 1]));
      const peak = sp.shade(H, H).specular[0], vertexPeak = Math.max(...mesh.pos.map((p) => sp.shade(p, p).specular[0]));
      const cost = LL.shadingCost(mesh.pos.length, shState.covered || Math.round(Math.PI * 110 * 110), 1, 1, 1, 20);
      const w = hit ? { u: hit.w[0], v: hit.w[1], w: hit.w[2] } : { u: 0, v: 0, w: 0 };
      return { ...cost, ...w, L: sp.L, peak, vertexPeak, at, hit, vertices: mesh.pos.length, triangles: mesh.tris.length };
    },
    draw(v, m, r, ctx) {
      if (!sh.stage) return;
      const mesh = meshes[m.level], sp = shadeParams(m), corners = cornerColors(mesh, sp);
      const key = JSON.stringify([m.az, m.el, m.s, m.level, m.model]);
      for (const i of [0, 1]) {
        sh.when(i, key, (cell) => {
          const { width: W, height: Hh } = cell.canvas, img = cell.g.createImageData(W, Hh), data = img.data;
          for (let k = 0; k < data.length; k += 4) { data[k] = 11; data[k + 1] = 12; data[k + 2] = 16; data[k + 3] = 255; }
          const front = mesh.tris.filter((t) => LL.dot(LL.add(LL.add(mesh.pos[t[0]], mesh.pos[t[1]]), mesh.pos[t[2]]), [0, 0, 1]) > 0);
          let covered = 0;
          slices(cell, front.length, (n) => {
            const [a, b, c] = front[n].map((q) => mesh.pos[q]);
            const px = (p) => [((p[0] * SCALE) * 0.5 + 0.5) * W, (0.5 - p[1] * SCALE * 0.5) * Hh];
            const A = px(a), B = px(b), C = px(c);
            const x0 = Math.max(0, Math.floor(Math.min(A[0], B[0], C[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(A[0], B[0], C[0])));
            const y0 = Math.max(0, Math.floor(Math.min(A[1], B[1], C[1]))), y1 = Math.min(Hh - 1, Math.ceil(Math.max(A[1], B[1], C[1])));
            const ca = corners[front[n][0]], cb = corners[front[n][1]], cc = corners[front[n][2]];
            for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
              const w = LL.barycentric([x + 0.5, y + 0.5], A, B, C);
              if (!w.inside) continue;
              const ws = [w.u, w.v, w.w];
              let col;
              if (i === 0) col = LL.gouraud(ws, ca, cb, cc).color;
              else { const nrm = LL.phongShading(ws, a, b, c).normal; col = sp.shade(nrm, nrm).color; }
              putRgb(data, (y * W + x) * 4, col);
              if (i === 1) covered++;
            }
            cell.g.putImageData(img, 0, 0);
          }, () => {
            if (i === 1) { shState.covered = covered; }
            if (m.wire) {
              cell.g.strokeStyle = 'rgba(11,12,16,0.55)'; cell.g.lineWidth = 1;
              for (const t of front) { cell.g.beginPath(); t.forEach((q, k) => { const p = mesh.pos[q], X = (p[0] * SCALE * 0.5 + 0.5) * W, Y = (0.5 - p[1] * SCALE * 0.5) * Hh; if (k === 0) cell.g.moveTo(X, Y); else cell.g.lineTo(X, Y); }); cell.g.closePath(); cell.g.stroke(); }
            }
          });
        });
        sh.stage.mark(sh.stage.cells[i], m.probe.x * SCALE * 0.5 + 0.5, 0.5 - m.probe.y * SCALE * 0.5);
      }
    },
    explain(m, r) {
      const fewer = r.vertexPeak < 0.5 * r.peak;
      const status = fewer ? { text: `The highlight falls between vertices: per vertex it reaches ${f(r.vertexPeak, 2)} of the true peak ${f(r.peak, 2)}.`, tone: 'warn' }
        : { text: `A vertex is near the highlight: per vertex reaches ${f(r.vertexPeak, 2)} of the true peak ${f(r.peak, 2)}.`, tone: 'ok' };
      const rows = [`{V|Gouraud}: light the ${r.vertices} vertices once, then c = u c_a + v c_b + w c_c`, `{R|Phong shading}: n = normalize(u n_a + v n_b + w n_c), then light that pixel`,
        `lighting evaluations: per vertex ${r.gouraudEvals.toLocaleString('en-US')}, per pixel about ${r.pixelEvals.toLocaleString('en-US')} (${f(r.ratio, 0)} times)`];
      if (r.at) rows.push(`probe weights (${f(r.u, 2)}, ${f(r.v, 2)}, ${f(r.w, 2)}): Gouraud ${vt(r.at.gouraud, 2)}, Phong shading ${vt(r.at.phong, 2)}`);
      return { hud: `{V|per vertex ${r.vertices}} · {R|per pixel ${r.pixelEvals.toLocaleString('en-US')}} · ${r.triangles} triangles`, rows, status,
        values: [['vertices', String(r.vertices)], ['triangles', String(r.triangles)], ['true peak', f(r.peak, 3)], ['vertex peak', f(r.vertexPeak, 3)]],
        fact: 'The Stanford bunny: 35,947 lighting evaluations per vertex against about 250,000 per pixel, 7 times more. Click an image to probe a pixel.' };
    },
    panelTitle: 'Mesh and highlight model',
    panel(host, m, r, ctx) {
      once(host, 'shading', (h) => {
        segmented(h, 'mesh', [[0, '20 triangles'], [1, '80'], [2, '320']], () => ctx.state().level, (v) => { ctx.state().level = v; ctx.update(); });
        segmented(h, 'edges', [[true, 'shown'], [false, 'hidden']], () => ctx.state().wire, (v) => { const s = ctx.state(); s.wire = v; sh.stage?.cells.forEach((c) => { c.key = null; }); ctx.update(); });
        segmented(h, 'highlight', [['phong', 'Phong R·V'], ['blinn', 'Blinn H·N']], () => ctx.state().model, (v) => { ctx.state().model = v; ctx.update(); });
      });
      host.querySelectorAll('.ll-seg').forEach((row, i) => row.querySelectorAll('.lab-btn').forEach((b) => b.classList.toggle('on', b.dataset.value === String([m.level, m.wire, m.model][i]))));
    },
  });
  sh.click = (i, u, v, ctx) => { const m = ctx.state(); m.probe.set(((u - 0.5) * 2) / SCALE, -((v - 0.5) * 2) / SCALE, 0); ctx.update(); };
  function aimHighlight(m, kind) {
    const mesh = meshes[0];
    let best = null, bestD = 9;
    const target = LL.normalize([0.3, 0.3, 0.9]);
    const cands = kind === 'vertex' ? mesh.pos : mesh.tris.map((t) => LL.normalize(LL.add(LL.add(mesh.pos[t[0]], mesh.pos[t[1]]), mesh.pos[t[2]])));
    for (const c of cands) { const d = LL.length(LL.sub(c, target)); if (c[2] > 0.4 && d < bestD) { bestD = d; best = c; } }
    const L = LL.sub(LL.scale(best, 2 * best[2]), [0, 0, 1]);
    m.az = Math.round(Math.atan2(L[0], L[2]) * DEG); m.el = Math.round(Math.asin(L[1]) * DEG); m.level = 0; m.s = 60; m.model = 'blinn';
  }

  // ============================================================ High dynamic range, exposure, three tone maps
  const SIZE = 192;
  const radiance = new Float32Array(SIZE * SIZE * 3), kinds = new Uint8Array(SIZE * SIZE);
  for (let j = 0; j < SIZE; j++) for (let i = 0; i < SIZE; i++) { const r = LL.hdrScene((i + 0.5) / SIZE, (j + 0.5) / SIZE); radiance.set(r.radiance, (j * SIZE + i) * 3); kinds[j * SIZE + i] = r.kind; }
  const KIND = ['sky', 'cloud', 'sun', 'sphere', 'ground'];
  const CURVES = [['clip', 'clipped at 1', KEYS.clip], ['reinhard', 'Reinhard x/(1+x)', KEYS.reinhard], ['aces', 'ACES fit (Narkowicz 2015)', KEYS.aces]];
  const th = stageHost(CURVES.map(([, cap]) => ({ aspect: 1, w: SIZE, h: SIZE, caption: cap })));
  const toneRgb = (rgb, e, curve) => rgb.map((x) => LL.toneMapChannel(x, e)[curve]);
  views.push({
    id: 'tone.hdr', topic: 'tone', label: 'HDR and exposure', inputTitle: 'Exposure',
    init: { exposure: 1, probe: [0.8, 0.18] },
    params: [{ id: 'exposure', label: 'exposure', min: 0.05, max: 4, step: 0.05 }],
    home: { eye: [0, 0, 6], target: [0, 0, 0] }, grid: 'none', axes: false,
    presets: [{ label: 'exposure 1', run: (m) => { m.exposure = 1; } }, { label: 'exposure 0.5', run: (m) => { m.exposure = 0.5; } }, { label: 'exposure 0.1', run: (m) => { m.exposure = 0.1; } },
      { label: 'the sun', run: (m) => { m.probe.set(0.8, 0.18, 0); } }, { label: 'the sky', run: (m) => { m.probe.set(0.05, 0.03, 0); } }, { label: 'a cloud', run: (m) => { m.probe.set(0.3, 0.22, 0); } }, { label: 'the highlight', run: (m) => { m.probe.set(0.474, 0.679, 0); } }],
    regions: ['Tone mapping', 'sRGB: encode', 'An HDR scene'],
    setup: th.setup, leave: th.leave,
    run(m) {
      const x = Math.min(SIZE - 1, Math.floor(m.probe.x * SIZE)), y = Math.min(SIZE - 1, Math.floor(m.probe.y * SIZE));
      const rad = Array.from(radiance.subarray((y * SIZE + x) * 3, (y * SIZE + x) * 3 + 3));
      const ch = LL.toneMapChannel(Math.max(...rad), m.exposure);
      const deck = [['sky', 6], ['cloud', 4], ['sun', 40]].map(([n, v]) => [n, v, LL.toneMapChannel(v, m.exposure)]);
      const codes = {}; for (const [k] of CURVES) codes[k] = toneRgb(rad, m.exposure, k).map((q) => LL.srgbEncode(q).byte);
      return { ...ch, ...LL.srgbEncode(ch.reinhard), rad, kind: kinds[y * SIZE + x], deck, codes };
    },
    draw(v, m, r, ctx) {
      if (!th.stage) return;
      CURVES.forEach(([curve], i) => {
        th.when(i, `${m.exposure}`, (cell) => paint(cell, (x, y, data, k) => { const o = (y * SIZE + x) * 3; putRgb(data, k, toneRgb([radiance[o], radiance[o + 1], radiance[o + 2]], m.exposure, curve)); }));
        th.stage.mark(th.stage.cells[i], m.probe.x, m.probe.y);
      });
    },
    explain(m, r) {
      const allWhite = r.codes.clip.every((b) => b === 255);
      const status = allWhite ? { text: `At exposure ${f(m.exposure)} clipping turns this pixel white; Reinhard keeps ${f(r.reinhard, 3)} of its brightest channel.`, tone: 'warn' }
        : { text: `This pixel (${KIND[r.kind]}) is below white at exposure ${f(m.exposure)}: clip ${f(r.clip, 3)}, Reinhard ${f(r.reinhard, 3)}, ACES ${f(r.aces, 3)}.`, tone: 'ok' };
      return { hud: `{clip|clip ${f(r.clip, 3)}} · {reinhard|Reinhard ${f(r.reinhard, 3)}} · {aces|ACES ${f(r.aces, 3)}} · x = ${f(Math.max(...r.rad), 2)}`,
        rows: [`probe: ${KIND[r.kind]}, linear radiance x = ${vt(r.rad, 2)}, brightest channel × exposure ${f(m.exposure)} = ${f(r.scaled, 3)}`, `{clip|clip} min(1, x) = ${f(r.clip, 3)};  {reinhard|Reinhard} x/(1 + x) = ${f(r.reinhard, 3)};  {aces|ACES} = ${f(r.aces, 3)}`,
          `display codes: clip (${r.codes.clip.join(', ')}), Reinhard (${r.codes.reinhard.join(', ')}), ACES (${r.codes.aces.join(', ')})`,
          ...r.deck.map(([n, v, t]) => `${n} ${v}: clip ${f(t.clip, 3)}, Reinhard ${f(t.reinhard, 3)}, ACES ${f(t.aces, 3)}`)], status,
        values: [['exposure', f(m.exposure)], ['x scaled', f(r.scaled, 3)], ['sky 6', f(r.deck[0][2].reinhard, 3)], ['cloud 4', f(r.deck[1][2].reinhard, 3)], ['sun 40', f(r.deck[2][2].reinhard, 3)]],
        fact: 'The scene spans values from 0.03 to 40. Click an image to probe a pixel. The curves run last, per channel, and the sRGB encode follows.' };
    },
    panelTitle: 'The three curves',
    panel(host, m, r) {
      once(host, 'tone', (h) => el('div', 'll-chartbox', h));
      host.querySelector('.ll-chartbox').innerHTML = chart({ title: 'output against x × exposure (log x)', x: [0.0625, 64], y: [0, 1.05], logX: true, xTicks: [0.125, 0.5, 2, 8, 32], yTicks: [0, 0.5, 1],
        series: CURVES.map(([k, , c]) => ({ fn: (x) => LL.toneMapChannel(x, 1)[k], color: c, label: k === 'clip' ? 'clip' : k === 'reinhard' ? 'Reinhard' : 'ACES fit' })),
        marks: [{ x: Math.max(r.scaled, 0.0625), y: r.reinhard, color: 0xffd166 }] });
    },
  });
  th.click = (i, u, v, ctx) => { ctx.state().probe.set(u, v, 0); ctx.update(); };

  // ============================================================ the sRGB curve and its strips
  const gc = stageHost([1, 2, 3, 4, 5].map((n) => ({ aspect: 10, w: 512, h: 52, caption: ['codes evenly spaced', 'light evenly spaced, sRGB-encoded', 'light written as codes (conversion skipped)', 'quantized in light, then encoded', 'quantized in the sRGB code'][n - 1], smooth: false })), { column: true });
  views.push({
    id: 'gamma.curve', topic: 'gamma', label: 'the sRGB curve', inputTitle: 'A code',
    init: { code: 128, levels: 32 },
    params: [{ id: 'code', label: 'code (0 to 255)', min: 0, max: 255, step: 1 }, { id: 'levels', label: 'levels', min: 4, max: 256, step: 1 }],
    home: { eye: [0, 0, 6], target: [0, 0, 0] }, grid: 'none', axes: false,
    presets: [{ label: 'code 128', run: (m) => { m.code = 128; } }, { label: 'light 0.5 is code 188', run: (m) => { m.code = 188; } }, { label: 'a dark code', run: (m) => { m.code = 10; } }, { label: '8 levels', run: (m) => { m.levels = 8; } }, { label: '32 levels', run: (m) => { m.levels = 32; } }],
    regions: ['sRGB: decode', 'sRGB: encode', 'Quantization', 'Codes in the darks'],
    setup: gc.setup, leave: gc.leave,
    run(m) {
      const c = m.code / 255, dec = LL.srgbDecode(c), enc = LL.srgbEncode(dec.linear), under = LL.codesBelow(0.01), q = LL.quantize(0.02, m.levels);
      return { ...dec, ...enc, srgb: under.srgb, linear8: under.linear, ...q, c, half: LL.srgbEncode(0.5), gamma22: Math.pow(c, 2.2) };
    },
    draw(v, m, r, ctx) {
      if (!gc.stage) return;
      const fns = [(x) => x, (x) => LL.srgbEncode(x).code, (x) => x, (x) => LL.srgbEncode(LL.quantize(x, m.levels).quantized).code, (x) => LL.quantize(LL.srgbEncode(x).code, m.levels).quantized];
      fns.forEach((fn, i) => gc.when(i, `${m.levels}`, (cell) => {
        const W = cell.canvas.width, Hh = cell.canvas.height, img = cell.g.createImageData(W, Hh);
        for (let x = 0; x < W; x++) {
          const t = x / (W - 1), b = Math.floor(fn(t) * 255 + 0.5);
          for (let y = 0; y < Hh; y++) { const o = (y * W + x) * 4; img.data[o] = b; img.data[o + 1] = b; img.data[o + 2] = b; img.data[o + 3] = 255; }
        }
        cell.g.putImageData(img, 0, 0);
      }));
    },
    explain(m, r) {
      const status = r.segment === 0 ? { text: `Code ${m.code} is on the straight segment (c ≤ 0.04045): v = c / 12.92.`, tone: 'info' } : { text: `Code ${m.code} is on the power segment: v = ((c + 0.055) / 1.055)^2.4.`, tone: 'ok' };
      return { hud: `code ${m.code} → light ${f(r.linear, 4)} · light 0.5 → code ${r.half.byte}`,
        rows: [`decode: v = c / 12.92 for c ≤ 0.04045, else ((c + 0.055) / 1.055)^2.4.  c = ${f(r.c, 4)} gives v = ${f(r.linear, 4)}`, `encode: c = 12.92 v for v ≤ 0.0031308, else 1.055 v^(1/2.4) − 0.055.  v = ${f(r.linear, 4)} gives code ${r.byte}`,
          `light 0.5 encodes to ${f(r.half.code, 3)}, code ${r.half.byte}; a power 2.2 would give v = ${f(r.gamma22, 4)} here`,
          `below 1 % of full light: sRGB ${r.srgb} codes, linear 8-bit ${r.linear8}; in ${m.levels} levels, light 0.02 is level ${r.index}`], status,
        values: [['decoded', f(r.linear, 4)], ['re-encoded', String(r.byte)], ['codes < 1 %', `${r.srgb} against 3`], ['step near black', '12.9 times finer']],
        fact: 'Counting black, 26 sRGB codes stand for light below 1 % of full light, against 3 for linear 8-bit codes.' };
    },
    panelTitle: 'Decode curve',
    panel(host, m, r, ctx) {
      once(host, 'gc', (h) => { segmented(h, 'range', [['full', 'full'], ['darks', 'darks']], () => ctx.state().zoom ?? 'full', (v) => { ctx.state().zoom = v; ctx.update(); }); el('div', 'll-chartbox', h); });
      const zoom = m.zoom === 'darks';
      host.querySelectorAll('.lab-btn').forEach((b) => b.classList.toggle('on', b.dataset.value === (zoom ? 'darks' : 'full')));
      const hi = zoom ? 0.12 : 1;
      host.querySelector('.ll-chartbox').innerHTML = chart({ title: 'light against code', x: [0, hi], y: [0, zoom ? 0.012 : 1.02], xTicks: zoom ? [0.04045, 0.1] : [0.25, 0.5, 0.75, 1], yTicks: zoom ? [0.0031308, 0.01] : [0, 0.5, 1], xLabel: 'code c',
        series: [{ fn: (c) => LL.srgbDecode(c).linear, color: KEYS.right, label: 'sRGB' }, { fn: (c) => Math.pow(c, 2.2), color: KEYS.clip, dash: true, label: 'power 2.2' }, { fn: (c) => c, color: 0x4a5266, label: 'c' }],
        marks: [{ x: r.c, y: r.linear, color: 0xffd166, label: f(r.linear, 3) }] });
    },
  });

  // ============================================================ blending in codes against in light
  const PAL = { yellow: [1, 1, 0], red: [1, 0, 0], white: [1, 1, 1], blue: [0, 0, 1], black: [0, 0, 0], green: [0, 1, 0] };
  const gb = stageHost([{ aspect: 1, w: 200, h: 200, caption: 'codes averaged (wrong)' }, { aspect: 1, w: 200, h: 200, caption: 'light averaged (right)' }, { aspect: 1, w: 200, h: 200, caption: 'a fine pattern of both, averaged by the eye', follow: true, smooth: false }]);
  views.push({
    id: 'gamma.blend', topic: 'gamma', label: 'blending', inputTitle: 'Mix',
    init: { t: 0.5, a: 'yellow', b: 'black' },
    params: [{ id: 't', label: 'mix t', min: 0, max: 1, step: 0.01 }],
    home: { eye: [0, 0, 6], target: [0, 0, 0] }, grid: 'none', axes: false,
    presets: [{ label: 'yellow and black (deck)', run: (m) => Object.assign(m, { a: 'yellow', b: 'black', t: 0.5 }) }, { label: 'red and green', run: (m) => Object.assign(m, { a: 'red', b: 'green', t: 0.5 }) }, { label: 'white and black, 25 %', run: (m) => Object.assign(m, { a: 'white', b: 'black', t: 0.25 }) }, { label: 'blue and white', run: (m) => Object.assign(m, { a: 'blue', b: 'white', t: 0.5 }) }],
    regions: ['sRGB: decode', 'Luminance', 'Blending in two spaces'],
    setup: gb.setup, leave: gb.leave,
    run(m) { return { ...LL.blendSpaces(PAL[m.a], PAL[m.b], m.t) }; },
    draw(v, m, r) {
      if (!gb.stage) return;
      const key = `${m.a}${m.b}${m.t}`;
      gb.when(0, key, (c) => paint(c, (x, y, d, k) => { d[k] = Math.round(r.codesMix[0] * 255); d[k + 1] = Math.round(r.codesMix[1] * 255); d[k + 2] = Math.round(r.codesMix[2] * 255); }));
      gb.when(1, key, (c) => paint(c, (x, y, d, k) => { d[k] = Math.round(r.lightCodes[0] * 255); d[k + 1] = Math.round(r.lightCodes[1] * 255); d[k + 2] = Math.round(r.lightCodes[2] * 255); }));
      const bayer = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
      const draw3 = (c) => paint(c, (x, y, d, k) => { const useB = (bayer[y % 4][x % 4] + 0.5) / 16 < m.t; const code = PAL[useB ? m.b : m.a]; d[k] = Math.round(code[0] * 255); d[k + 1] = Math.round(code[1] * 255); d[k + 2] = Math.round(code[2] * 255); });
      gb.stage.cells[2].onResize = (c) => { c.key = key; draw3(c); };
      gb.when(2, key, draw3);
    },
    explain(m, r) {
      const status = { text: `Averaging the codes gives luminance ${f(r.codesY, 3)}; the light average, which the eye sees in a fine pattern, is ${f(r.lightY, 3)}: the wrong blend has ${f(r.ratio * 100, 0)} % of the light.`, tone: r.ratio < 0.9 ? 'bad' : 'ok' };
      return { hud: `{wrong|codes Y ${f(r.codesY, 3)}} · {right|light Y ${f(r.lightY, 3)}}`,
        rows: [`blend (1 − t) A + t B, t = ${f(m.t)}`, `{wrong|in codes}: ${vt(r.codesMix, 3)}, which decodes to light ${vt(r.codesLight, 3)}, Y = ${f(r.codesY, 3)}`, `{right|in light}: ${vt(r.lightMix, 3)}, which encodes to code ${vt(r.lightCodes.map((c) => c * 255), 1)}, Y = ${f(r.lightY, 3)}`],
        status, values: [['Y, codes', f(r.codesY, 4)], ['Y, light', f(r.lightY, 4)], ['ratio', f(r.ratio, 3)]],
        fact: 'The slide rounds the code average to (128, 128, 0), which decodes to 0.216; the unrounded mean is code 127.5, light 0.214.' };
    },
    panelTitle: 'The two colors',
    panel(host, m, r, ctx) {
      once(host, 'blend', (h) => {
        const names = Object.keys(PAL);
        segmented(h, 'A', names.map((n) => [n, n]), () => ctx.state().a, (v) => { ctx.state().a = v; ctx.update(); });
        segmented(h, 'B', names.map((n) => [n, n]), () => ctx.state().b, (v) => { ctx.state().b = v; ctx.update(); });
      });
      host.querySelectorAll('.ll-seg').forEach((row, i) => row.querySelectorAll('.lab-btn').forEach((b) => b.classList.toggle('on', b.dataset.value === [m.a, m.b][i])));
    },
  });

  // ============================================================ lighting on the codes against in light
  const L0 = LL.normalize([0.5, 0.55, 0.67]);
  const gl = stageHost([{ aspect: 1, w: 200, h: 200, caption: 'lit on the codes (conversion skipped)' }, { aspect: 1, w: 200, h: 200, caption: 'lit in light, then encoded' }]);
  views.push({
    id: 'gamma.light', topic: 'gamma', label: 'lighting', inputTitle: 'Albedo and N·L',
    init: { albedo: 200, nDotL: 0.5 },
    params: [{ id: 'albedo', label: 'albedo code', min: 0, max: 255, step: 1 }, { id: 'nDotL', label: 'N·L', min: 0, max: 1, step: 0.01 }],
    home: { eye: [0, 0, 6], target: [0, 0, 0] }, grid: 'none', axes: false,
    presets: [{ label: 'albedo 200, N·L 0.5 (deck)', run: (m) => { m.albedo = 200; m.nDotL = 0.5; } }, { label: 'N·L 0.2', run: (m) => { m.nDotL = 0.2; } }, { label: 'albedo 128', run: (m) => { m.albedo = 128; m.nDotL = 0.5; } }],
    regions: ['sRGB: decode', 'sRGB: encode', 'Lighting in two spaces'],
    setup: gl.setup, leave: gl.leave,
    run(m) { return LL.lightSpaces(m.albedo / 255, m.nDotL); },
    draw(v, m, r) {
      if (!gl.stage) return;
      [0, 1].forEach((i) => gl.when(i, `${m.albedo}`, (cell) => paint(cell, (x, y, d, k) => {
        const px = ((x + 0.5) / 200) * 2 - 1, py = 1 - ((y + 0.5) / 200) * 2, rr = (px * px + py * py) / 0.85;
        if (rr >= 1) { putBg(d, k); return; }
        const n = [px / 0.92, py / 0.92, Math.sqrt(Math.max(0, 1 - (px * px + py * py) / 0.8464))], nl = Math.max(0, LL.dot(n, L0)), ls = LL.lightSpaces(m.albedo / 255, nl);
        const b = i === 0 ? Math.floor(ls.wrongCode * 255 + 0.5) : Math.floor(ls.rightCode * 255 + 0.5);
        d[k] = b; d[k + 1] = b; d[k + 2] = b;
      })));
    },
    explain(m, r) {
      const status = { text: `The wrong way delivers ${f(r.fraction * 100, 0)} % of the correct light at N·L ${f(m.nDotL)}.`, tone: r.fraction < 0.9 ? 'bad' : 'ok' };
      return { hud: `{right|correct code ${Math.round(r.rightCode * 255)}} · {wrong|wrong code ${Math.round(r.wrongCode * 255)}} · ${f(r.fraction * 100, 0)} %`,
        rows: [`albedo code ${m.albedo} decodes to ${f(r.albedoLinear, 3)}`, `{right|right}: ${f(r.albedoLinear, 3)} × ${f(m.nDotL)} = ${f(r.rightLight, 3)} light, encoded to code ${Math.round(r.rightCode * 255)}`, `{wrong|wrong}: code ${m.albedo} × ${f(m.nDotL)} = code ${f(r.wrongCode * 255, 0)}, which is ${f(r.wrongLight, 3)} light`], status,
        values: [['right light', f(r.rightLight, 3)], ['wrong light', f(r.wrongLight, 3)], ['fraction', f(r.fraction, 3)]] };
    },
    panelTitle: 'Displayed code against N·L',
    panel(host, m, r) {
      once(host, 'gl', (h) => { el('div', 'll-chartbox', h); el('div', 'll-note', h, 'Click a sphere to set N·L from that pixel.'); });
      host.querySelector('.ll-chartbox').innerHTML = chart({ title: 'code written against N·L', x: [0, 1], y: [0, 1], xTicks: [0, 0.5, 1], yTicks: [0, 0.5, 1], xLabel: 'N·L',
        series: [{ fn: (n) => LL.lightSpaces(m.albedo / 255, n).rightCode, color: KEYS.right, label: 'right' }, { fn: (n) => LL.lightSpaces(m.albedo / 255, n).wrongCode, color: KEYS.wrong, label: 'wrong' }], marks: [{ x: m.nDotL, y: r.rightCode, color: KEYS.right }, { x: m.nDotL, y: r.wrongCode, color: KEYS.wrong }] });
    },
  });
  gl.click = (i, u, v, ctx) => { const px = (u * 2 - 1), py = 1 - v * 2; if ((px * px + py * py) / 0.85 >= 1) return; const n = [px / 0.92, py / 0.92, Math.sqrt(Math.max(0, 1 - (px * px + py * py) / 0.8464))]; ctx.state().nDotL = Math.round(Math.max(0, LL.dot(n, L0)) * 100) / 100; ctx.update(); };

  return views;
}
export const stageBusy = () => false;
