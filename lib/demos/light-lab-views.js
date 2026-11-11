// light-lab-views: the catalog behind the light-lab demo (runtime: lib/core/lab.js), first half: the lights and the local model at a point.
// The image views (shading per vertex and per pixel, tone mapping, sRGB) are in light-lab-views-img.js. run() calls the program's own
// functions (lib/programs/light-lab/webgl/lightlab.js), so the numbers beside the code are that code's output.
import * as THREE from '../vendor/three.module.js';
import * as LL from '../programs/light-lab/webgl/lightlab.js';
import { COL, V } from '../core/lab-viz.js';
import { el, btn, segmented, once, chart, esc } from './light-lab-images.js';

export const KEYS = {
  N: 0x7ee787, L: 0xffa657, V: 0x56d4dd, R: 0xff79c6, H: 0xd2a8ff, light: 0xffd166, eye: 0x56d4dd, d: 0x8b93a7,
  ambient: 0x79c0ff, diffuse: 0xff7b72, specular: 0xe7eaf0, sum: 0xffd166, atten: 0xff7b72, poly: 0x79c0ff, cutoff: 0xffa657,
  alpha: 0xd2a8ff, mask: 0xd2a8ff, nl: 0xffa657, arrive: 0xffd166, disc: 0xffd166, point: 0xff79c6, ratio: 0xffa657,
  clip: 0xff7b72, reinhard: 0x7ee787, aces: 0x79c0ff, wrong: 0xff7b72, right: 0x7ee787, code: 0xffd166, light2: 0xffa657,
};

// ---------------------------------------------------------------- small helpers shared with the image views
export const arr = (v) => [v.x, v.y, v.z];
export const P3 = (a) => V(a[0], a[1], a[2]);
export const f = (x, d = 2) => (Number.isFinite(x) ? (Number(x.toFixed(d)) === 0 ? (0).toFixed(d) : x.toFixed(d)).replace('-', '−') : 'none');
export const vt = (a, d = 2) => `(${a.map((x) => f(x, d)).join(', ')})`;
export const DEG = LL.DEG;
export const toDirection = (az, el) => {
  const a = (az * Math.PI) / 180, e = (el * Math.PI) / 180;
  return [Math.cos(e) * Math.sin(a), Math.sin(e), Math.cos(e) * Math.cos(a)];
};
const WHITE = [1, 1, 1];

// ---------------------------------------------------------------- the sphere of the local view, colored per vertex by the program
const SPHERE_R = 1.2;
const sphereState = { mesh: null, key: '' };
function ensureSphere(ctx) {
  if (sphereState.mesh || !ctx.world) return;
  const g = new THREE.SphereGeometry(SPHERE_R, 96, 64);
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
  sphereState.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  ctx.world.add(sphereState.mesh);
}
function colorSphere(ctx, key, shade) {
  if (!sphereState.mesh || sphereState.key === key) return;
  sphereState.key = key;
  const pos = sphereState.mesh.geometry.attributes.position, col = sphereState.mesh.geometry.attributes.color;
  for (let i = 0; i < pos.count; i++) {
    const c = shade([pos.getX(i), pos.getY(i), pos.getZ(i)]);
    col.setXYZ(i, Math.min(1, Math.max(0, c[0])), Math.min(1, Math.max(0, c[1])), Math.min(1, Math.max(0, c[2])));
  }
  col.needsUpdate = true;
}
const showSphere = (on) => { if (sphereState.mesh) sphereState.mesh.visible = on; };
const camButtons = (ctx, on) => { const e = ctx.sceneEl?.querySelector('.lab-views'); if (e) e.style.display = on ? '' : 'none'; };

const MATERIALS = {
  plastic: { label: 'red plastic', kd: [0.86, 0.36, 0.3], ksTint: [1, 1, 1] },
  metal: { label: 'gold metal', kd: [0.12, 0.09, 0.03], ksTint: [1, 0.78, 0.34] },
};

export function makeViews() {
  const views = [];

  // ============================================================ Lights: the three kinds at one surface point
  const typeState = { current: 'point', curve: 'polynomial' };
  const TYPE_DESC = {
    directional: 'Directional: parallel rays, a direction and no position. L is the same at every point and there is no falloff.',
    point: 'Point: a position radiating in all directions. L is computed per point and the intensity falls with distance.',
    spot: 'Spot: a point light masked by a cone around its aim D. The mask multiplies the intensity.',
  };
  views.push({
    id: 'lights.types', topic: 'lights', label: 'light types', inputTitle: 'Light, aim and point',
    init: { type: 'point', p: [0, 0, 0], light: [1.6, 2.4, 1.2], aim: [0, 0, 0], intensity: 1, kl: 0.09, kq: 0.032, far: 8, inner: 15, outer: 25, curve: 'polynomial' },
    handles: [{ id: 'p', label: 'p', color: COL.c, fixed: 'y' }, { id: 'light', label: 'light', color: COL.gold }, { id: 'aim', label: 'aim', color: COL.cyan, fixed: 'y' }],
    params: [{ id: 'kl', label: 'k_l', min: 0, max: 0.5, step: 0.01 }, { id: 'kq', label: 'k_q', min: 0, max: 0.2, step: 0.002 }, { id: 'far', label: 'Far', min: 1, max: 14, step: 0.5 },
      { id: 'inner', label: 'inner °', min: 0, max: 40, step: 1 }, { id: 'outer', label: 'outer °', min: 1, max: 60, step: 1 }],
    home: { eye: [4.2, 3.0, 6.0], target: [0.5, 1.1, 0.4] }, axes: false, handleSize: 0.055,
    presets: [1, 2, 4, 10].map((d) => ({ label: `d = ${d}`, run: (m) => Object.assign(m, { type: 'point' }) && m.p.set(0, 0, 0) && m.light.set(0, d, 0) && m.aim.set(0, 0, 0) })),
    get regions() { return ['Light: direction and distance', 'Light: distance attenuation', ...(typeState.current === 'spot' ? ['Light: the spot cone'] : []), 'Diffuse: Lambert']; },
    edited(m) { if (m.outer < m.inner + 0.5) m.outer = m.inner + 0.5; },
    run(m) {
      typeState.current = m.type; typeState.curve = m.curve;
      const p = arr(m.p), light = arr(m.light);
      let D = LL.normalize(LL.sub(arr(m.aim), light));
      if (LL.length(D) === 0) D = [0, -1, 0];
      const lv = LL.lightVector(m.type, p, light, D);
      const att = LL.attenuation(lv.d, 1, m.kl, m.kq, m.far);
      const cone = m.type === 'spot' ? LL.spotMask(lv.L, D, m.inner, m.outer) : null;
      const lam = LL.lambert([0, 1, 0], lv.L, WHITE, [m.intensity, m.intensity, m.intensity]);
      const falloff = m.type === 'directional' ? 1 : m.curve === 'inverse' ? att.inverseSquare : m.curve === 'cutoff' ? att.cutoff : att.polynomial;
      const mask = cone ? cone.strength : 1;
      return { ...lv, ...att, ...(cone ?? {}), ...lam, D, falloff, mask, arriving: m.intensity * falloff * mask * lam.clamped };
    },
    draw(v, m, r) {
      const p = P3(arr(m.p)), light = P3(arr(m.light)), N = V(0, 1, 0);
      v.plane(V(0, 0, 0), N, 3.2, COL.gray, { opacity: 0.07, k: 'floor' });
      v.arrow(p, p.clone().add(N), COL.c, { k: 'N', label: 'N', r: 0.02 });
      if (m.type === 'directional') {
        const D = P3(r.D);
        for (const [x, z] of [[0, 0], [1, 0.4], [-0.9, 0.6], [0.3, -1]]) {
          const q = V(m.p.x + x, 0, m.p.z + z);
          v.arrow(q.clone().addScaledVector(D, -2.4), q, COL.gray, { r: 0.012, hr: 0.04, head: 0.16, k: 'L' });
          v.arrow(q, q.clone().addScaledVector(D, -0.9), COL.amber, { r: 0.016, hr: 0.05, head: 0.16, k: 'L' });
        }
        v.label('L (the same everywhere)', p.clone().addScaledVector(P3(r.L), 1), COL.amber, 'a', 'L');
        return;
      }
      const toward = p.clone().add(P3(r.L).multiplyScalar(Math.min(1.2, r.d)));
      v.arrow(p, toward, COL.amber, { k: 'L', label: 'L', r: 0.022 });
      v.dashed(p, light, COL.gray, { k: 'd' });
      v.label(`d = ${f(r.d)}`, p.clone().lerp(light, 0.55), COL.gray, 'r', 'd');
      v.arc(p, V(0, 1, 0), P3(r.L), 0.5, COL.amber, { k: 'nl', label: `${f(r.thetaN, 0)}°` });
      if (m.type === 'point') v.sphere(light, Math.max(0.2, r.d), COL.dim, { k: 'atten' });
      if (m.type === 'spot') {
        const D = P3(r.D);
        v.cone(light, D, m.outer, 3.6, COL.purple, 0.07, { k: 'mask' });
        if (m.inner > 0.5) v.cone(light, D, m.inner, 3.6, COL.cyan, 0.1, { k: 'mask' });
        v.dashed(light, light.clone().addScaledVector(D, 3.4), COL.cyan, { k: 'alpha' });
        v.arc(light, D, p.clone().sub(light), 0.9, COL.purple, { k: 'alpha', label: `α ${f(r.alpha, 1)}°` });
      }
    },
    explain(m, r) {
      const rows = [TYPE_DESC[m.type]];
      if (m.type === 'directional') rows.push(`{L} = −(light direction) = ${vt(r.L)}, d: none`);
      else rows.push(`{L} = normalize(light − p) = ${vt(r.L)}, {d|d} = ${f(r.d)}`);
      if (m.type !== 'directional') {
        rows.push(`{atten|1/d²} = ${f(r.inverseSquare, 4)},  {poly|1/(1 + ${f(m.kl)}d + ${f(m.kq, 3)}d²)} = ${f(r.polynomial, 4)},  {cutoff|cutoff at Far ${f(m.far, 1)}} = ${f(r.cutoff, 4)}`);
      }
      if (m.type === 'spot') rows.push(`{alpha|α} = ${f(r.alpha, 1)}°, n = ${f(m.inner, 0)} − α = ${f(r.n, 1)}, x = n²/${f(r.range, 0)}² = ${f(r.x)}, t = ${f(r.t)}, {mask|mask} = 3t² − 2t³ = ${f(r.strength, 3)}`);
      rows.push(`{nl|N·L} = ${f(r.nDotL, 3)} (${f(r.thetaN, 1)}°), max(0, N·L) = ${f(r.clamped, 3)}`);
      rows.push(`{arrive|arriving} = I × falloff ${f(r.falloff, 3)} × mask ${f(r.mask, 3)} × ${f(r.clamped, 3)} = ${f(r.arriving, 4)}`);
      let status;
      if (r.nDotL <= 0) status = { text: 'The light is below the surface plane: nothing arrives.', tone: 'bad' };
      else if (m.type === 'spot' && r.strength === 0) status = { text: `Outside the outer cone (α ${f(r.alpha, 1)}° over ${f(m.outer, 0)}°): the mask is 0.`, tone: 'warn' };
      else if (m.type === 'spot' && r.strength < 1) status = { text: `In the soft edge: the mask is ${f(r.strength, 3)}.`, tone: 'info' };
      else if (m.type !== 'directional' && m.curve === 'cutoff' && r.d > m.far) status = { text: `Beyond Far (${f(m.far, 1)}): the cutoff gives 0.`, tone: 'warn' };
      else status = { text: m.type === 'directional' ? 'Directional: no falloff, the same L at every point.' : `Lit: ${f(r.arriving, 3)} of the light's intensity arrives.`, tone: 'ok' };
      return { hud: m.type === 'directional' ? `{L|L} = ${vt(r.L)} everywhere · {arrive|arriving ${f(r.arriving, 3)}}` : `{L|L} = ${vt(r.L)} · {d|d = ${f(r.d)}} · {arrive|arriving ${f(r.arriving, 3)}}`,
        rows, status, values: [['d', f(r.d)], ['1/d²', f(r.inverseSquare, 4)], ['polynomial', f(r.polynomial, 4)], ['cutoff', f(r.cutoff, 4)], ['mask', f(r.mask, 3)], ['N·L', f(r.nDotL, 3)]] };
    },
    panelTitle: 'Light type and falloff',
    panel(host, m, r, ctx) {
      let chartEl;
      once(host, 'types', (h) => {
        segmented(h, 'type', [['directional', 'directional'], ['point', 'point'], ['spot', 'spot']], () => ctx.state().type, (v) => { ctx.state().type = v; ctx.update(); });
        segmented(h, 'falloff', [['inverse', '1/d²'], ['polynomial', 'polynomial'], ['cutoff', 'polynomial + Far']], () => ctx.state().curve, (v) => { ctx.state().curve = v; ctx.update(); });
        el('div', 'll-chartbox', h);
      });
      host.querySelectorAll('.ll-seg').forEach((row) => row.querySelectorAll('.lab-btn').forEach((b) => b.classList.toggle('on', b.dataset.value === (row.firstChild.textContent === 'type' ? m.type : m.curve))));
      chartEl = host.querySelector('.ll-chartbox');
      const d = r.d;
      chartEl.innerHTML = chart({ title: 'falloff against distance', x: [0.25, 12], y: [0.003, 2], logY: true, xTicks: [2, 4, 6, 8, 10, 12], yTicks: [0.01, 0.1, 1], xLabel: 'distance d',
        series: [{ fn: (x) => LL.attenuation(x, 1, m.kl, m.kq, m.far).inverseSquare, color: KEYS.atten, label: '1/d²' }, { fn: (x) => LL.attenuation(x, 1, m.kl, m.kq, m.far).polynomial, color: KEYS.poly, label: 'polynomial' },
          { fn: (x) => LL.attenuation(x, 1, m.kl, m.kq, m.far).cutoff || 0.0031, color: KEYS.cutoff, dash: true, label: 'with Far' }],
        marks: m.type === 'directional' ? [] : [{ x: d, y: r.falloff, color: COL.gold, label: f(r.falloff, 3) }] });
    },
    regionsNote: '',
  });

  // ============================================================ Lights: the spot's soft edge
  const spotAt = (deg) => { const a = (deg * Math.PI) / 180; return LL.normalize([-Math.sin(a), Math.cos(a), 0]); };
  const floorImage = { key: '' };
  views.push({
    id: 'lights.spot', topic: 'lights', label: 'spot cone', inputTitle: 'Spot, aim and point',
    init: { p: [1.092, 0, 0], light: [0, 3, 0], aim: [0, 0, 0], inner: 15, outer: 25 },
    handles: [{ id: 'p', label: 'p', color: COL.c, fixed: 'y' }, { id: 'light', label: 'spot', color: COL.gold }, { id: 'aim', label: 'aim', color: COL.cyan, fixed: 'y' }],
    params: [{ id: 'inner', label: 'inner °', min: 0, max: 40, step: 1 }, { id: 'outer', label: 'outer °', min: 1, max: 60, step: 1 }],
    home: { eye: [3.6, 3.2, 4.2], target: [0, 1.4, 0] }, axes: false,
    presets: [10, 15, 18, 20, 22, 25].map((deg) => ({ label: `${deg}°`, run: (m) => { m.light.set(0, 3, 0); m.aim.set(0, 0, 0); m.inner = 15; m.outer = 25; m.p.set(3 * Math.tan((deg * Math.PI) / 180), 0, 0); } })),
    regions: ['Light: direction and distance', 'Light: the spot cone'],
    edited(m) { if (m.outer < m.inner + 0.5) m.outer = m.inner + 0.5; },
    run(m) {
      const light = arr(m.light);
      let D = LL.normalize(LL.sub(arr(m.aim), light));
      if (LL.length(D) === 0) D = [0, -1, 0];
      const lv = LL.lightVector('spot', arr(m.p), light, D);
      return { ...lv, ...LL.spotMask(lv.L, D, m.inner, m.outer), D };
    },
    draw(v, m, r) {
      const p = P3(arr(m.p)), light = P3(arr(m.light)), D = P3(r.D);
      v.plane(V(0, 0, 0), V(0, 1, 0), 3.2, COL.gray, { opacity: 0.07 });
      v.cone(light, D, m.outer, 3.8, COL.purple, 0.07, { k: 'mask' });
      if (m.inner > 0.5) v.cone(light, D, m.inner, 3.8, COL.cyan, 0.12, { k: 'mask' });
      v.dashed(light, light.clone().addScaledVector(D, 3.6), COL.cyan, { k: 'alpha' });
      v.dashed(light, p, COL.amber, { k: 'L' });
      v.arc(light, D, p.clone().sub(light), 1, COL.purple, { k: 'alpha', label: `α ${f(r.alpha, 1)}°` });
      v.point(p, COL.c, { r: 0.07 });
    },
    explain(m, r) {
      const status = r.strength >= 1 ? { text: `Inside the inner cone (α ${f(r.alpha, 1)}° within ${f(m.inner, 0)}°): full strength.`, tone: 'ok' }
        : r.strength <= 0 ? { text: `Outside the outer cone (α ${f(r.alpha, 1)}° past ${f(m.outer, 0)}°): no light.`, tone: 'warn' }
          : { text: `In the soft edge: strength ${f(r.strength, 3)}.`, tone: 'info' };
      return { hud: `{alpha|α = ${f(r.alpha, 1)}°} · {mask|strength ${f(r.strength, 3)}}`,
        rows: [`{alpha|α} = angle between −L and the aim D = ${f(r.alpha, 2)}°`, `n = inner − α = ${f(m.inner, 0)} − ${f(r.alpha, 2)} = ${f(r.n, 2)},  range = ${f(m.outer, 0)} − ${f(m.inner, 0)} = ${f(r.range, 0)}`,
          `x = n² / range² = ${f(r.x, 3)},  t = 1 − x = ${f(r.t, 3)}`, `{mask|strength} = 3t² − 2t³ = ${f(r.strength, 3)}`], status,
        values: [['α', `${f(r.alpha, 1)}°`], ['x', f(r.x, 3)], ['t', f(r.t, 3)], ['strength', f(r.strength, 3)]],
        fact: 'The soft edge starts slowly (0.977 at 18° for a 15° to 25° cone) and falls faster near the outer edge; its slope is zero at both ends, so there is no visible ring.' };
    },
    panelTitle: 'The edge, and the lit floor from above',
    panel(host, m, r, ctx) {
      once(host, 'spot', (h) => { el('div', 'll-chartbox', h); const row = el('div', '', h); row.style.cssText = 'display:flex;gap:8px;align-items:center;margin-top:4px'; const c = el('canvas', 'll-floor', row); c.width = 120; c.height = 120; c.style.cssText = 'width:120px;height:120px;border-radius:4px;background:#14161d'; el('div', 'll-note', row, 'The floor seen from above, lit by this spot: max(0, N·L) times the mask. The green dot is p.'); });
      host.querySelector('.ll-chartbox').innerHTML = chart({ title: 'strength against α', x: [0, 40], y: [0, 1.05], xTicks: [0, 10, 20, 30, 40], yTicks: [0, 0.5, 1], xLabel: 'α in degrees',
        series: [{ fn: (a) => LL.spotMask(spotAt(a), [0, -1, 0], m.inner, m.outer).strength, color: KEYS.mask }], marks: [{ x: r.alpha, y: r.strength, color: COL.gold, label: f(r.strength, 3) }] });
      const c = host.querySelector('.ll-floor'), g = c.getContext('2d');
      const light = arr(m.light), D = r.D, key = JSON.stringify([light, D, m.inner, m.outer, arr(m.p)]);
      if (floorImage.key === key) return;
      floorImage.key = key;
      const img = g.createImageData(120, 120);
      for (let j = 0; j < 120; j++) for (let i = 0; i < 120; i++) {
        const q = [((i + 0.5) / 120 - 0.5) * 8, 0, ((j + 0.5) / 120 - 0.5) * 8];
        const L = LL.lightVector('spot', q, light, D).L;
        const val = LL.spotMask(L, D, m.inner, m.outer).strength * LL.lambert([0, 1, 0], L, WHITE, WHITE).clamped;
        const b = LL.srgbEncode(val).byte, o = (j * 120 + i) * 4;
        img.data[o] = b; img.data[o + 1] = b; img.data[o + 2] = b; img.data[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      g.fillStyle = '#3fd97f';
      g.beginPath(); g.arc((m.p.x / 8 + 0.5) * 120, (m.p.z / 8 + 0.5) * 120, 3.5, 0, 7); g.fill();
    },
  });

  // ============================================================ Lights: an area light against a point
  views.push({
    id: 'lights.area', topic: 'lights', label: 'area light', inputTitle: 'Disc light',
    init: { R: 0.5, h: 1 },
    params: [{ id: 'R', label: 'radius R', min: 0.1, max: 1.5, step: 0.05 }, { id: 'h', label: 'height h', min: 0.1, max: 4, step: 0.05 }],
    home: { eye: [1.6, 1.3, 2.1], target: [0, 0.5, 0] }, axes: false,
    presets: [0.25, 0.5, 1, 2, 4].map((h) => ({ label: `h = ${h}`, run: (m) => { m.R = 0.5; m.h = h; } })),
    regions: ['Light: an area light'],
    run(m) { return LL.areaLight(m.R, 1, m.h); },
    draw(v, m, r) {
      v.plane(V(0, 0, 0), V(0, 1, 0), 2.6, COL.gray, { opacity: 0.07 });
      const c = V(0, m.h, 0), pts = [];
      for (let i = 0; i < 40; i++) pts.push(V(m.R * Math.cos((i / 40) * 2 * Math.PI), m.h, m.R * Math.sin((i / 40) * 2 * Math.PI)));
      v.patch(pts, COL.gold, 0.55, { k: 'disc' });
      v.poly(pts, COL.gold, { closed: true, k: 'disc' });
      v.point(V(0, 0, 0), COL.c, { r: 0.06 });
      v.arrow(V(0, 0, 0), V(0, 0.45, 0), COL.c, { label: 'N', r: 0.015, anchor: 'l' });
      v.dashed(V(0, 0, 0), pts[0], COL.amber, { k: 'disc' });
      v.dashed(V(0, 0, 0), pts[20], COL.amber, { k: 'disc' });
      v.arc(V(0, 0, 0), V(0, 1, 0), pts[0], 0.6, COL.amber, { k: 'disc', label: `${f(Math.atan(m.R / m.h) * DEG, 0)}°` });
      v.point(c, COL.pink, { r: 0.05, k: 'point' });
      v.label('point light', V(m.R + 0.1, m.h, 0), COL.pink, 'r', 'point');
    },
    explain(m, r) {
      const status = r.ratio >= 1.5 ? { text: `The point light is ${f(r.ratio, 1)} times too bright at this height.`, tone: 'bad' }
        : r.ratio > 1.1 ? { text: `The point light is ${f((r.ratio - 1) * 100, 0)} % too bright.`, tone: 'warn' } : { text: `The point light is within ${f((r.ratio - 1) * 100, 1)} % of the disc.`, tone: 'ok' };
      return { hud: `{disc|disc ${f(r.disc, 3)}} · {point|point ${f(r.point, 3)}} · {ratio|×${f(r.ratio, 2)}}`,
        rows: [`{disc|disc} E = π L R² / (h² + R²) = ${f(r.disc, 3)}`, `{point|point} E = π L R² / h² = ${f(r.point, 3)}`, `{ratio|ratio} = (h² + R²) / h² = ${f(r.ratio, 3)}`], status,
        values: [['h / R', f(m.h / m.R, 2)], ['half angle', `${f(Math.atan(m.R / m.h) * DEG, 1)}°`]],
        fact: 'L = 1, power of the point light equal to the disc. The disc formula is the inverse-square law with the light’s own size as the floor.' };
    },
    panelTitle: 'Irradiance on the axis',
    panel(host, m, r) {
      once(host, 'area', (h) => el('div', 'll-chartbox', h));
      host.querySelector('.ll-chartbox').innerHTML = chart({ title: 'E against height h (L = 1)', x: [0.1, 4], y: [0, 14], xTicks: [1, 2, 3, 4], yTicks: [0, 5, 10], xLabel: 'height h',
        series: [{ fn: (h) => LL.areaLight(m.R, 1, h).disc, color: KEYS.disc, label: 'disc' }, { fn: (h) => LL.areaLight(m.R, 1, h).point, color: KEYS.point, label: 'point light' }],
        marks: [{ x: m.h, y: r.disc, color: KEYS.disc }, { x: m.h, y: r.point, color: KEYS.point }] });
    },
  });

  // ============================================================ Local model: the equation at one point
  const localState = { model: 'phong', mat: 'plastic', normalized: false };
  const matOf = (m) => { const mt = MATERIALS[m.mat]; return { kd: mt.kd, ks: mt.ksTint.map((x) => x * m.ks) }; };
  const DECK = { n: [1, 1, 1], light: [1.837, 1.5, 1.837], eye: [3, 3, 6], light2: [-0.964, 1.026, -2.649], s: 30, ka: 0.12, ks: 0.5, I2: 0, model: 'phong', mat: 'plastic', normalized: false };
  const setDeck = (extra) => (m) => { for (const [k, v] of Object.entries({ ...DECK, ...extra })) { if (Array.isArray(v)) m[k].set(...v); else m[k] = v; } };
  views.push({
    id: 'local.point', topic: 'local', label: 'the equation at a point', inputTitle: 'Lights and eye',
    init: { ...DECK },
    handles: [{ id: 'light', label: 'light', color: COL.gold }, { id: 'eye', label: 'eye', color: COL.cyan }, { id: 'light2', label: 'L2', color: COL.amber }],
    params: [{ id: 's', label: 'shininess s', min: 1, max: 128, step: 1 }, { id: 'ka', label: 'k_a', min: 0, max: 0.5, step: 0.01 }, { id: 'ks', label: 'k_s', min: 0, max: 1, step: 0.05 }, { id: 'I2', label: 'light 2', min: 0, max: 1, step: 0.05 }],
    home: { eye: [4.5, 2.4, 0.2], target: [0.7, 0.7, 0.7] }, grid: 'none', axes: false, handleSize: 0.045,
    presets: [{ label: 'the marked point (deck)', run: setDeck({}) }, { label: 'light behind', run: setDeck({ light: [-1.837, -1.5, -1.837] }) },
      { label: 'second light, half', run: setDeck({ I2: 0.5 }) }, { label: 'Blinn, same s', run: setDeck({ model: 'blinn' }) }, { label: 'Blinn, s = 123', run: setDeck({ model: 'blinn', s: 123 }) },
      { label: 'normalized', run: setDeck({ normalized: true }) }, { label: 's = 128', run: setDeck({ s: 128 }) }, { label: 'gold metal', run: setDeck({ mat: 'metal', ks: 0.9 }) }],
    get regions() { return ['Diffuse: Lambert', 'Specular: the mirror direction', localState.model === 'blinn' ? "Specular: Blinn's half vector" : 'Specular: Phong', 'Ambient', 'The sum over lights']; },
    setup(ctx) { ensureSphere(ctx); showSphere(true); camButtons(ctx, true); },
    leave() { showSphere(false); },
    edited(m) { if (m.n.length() < 1e-6) m.n.set(0, 1, 0); m.n.normalize(); },
    onPick(ray, e, ctx) {
      const o = ray.origin, d = ray.dir, b = LL.dot(o, d), c = LL.dot(o, o) - SPHERE_R * SPHERE_R, disc = b * b - c;
      if (disc < 0) return;
      const t = -b - Math.sqrt(disc);
      if (t < 0) return;
      const m = ctx.state();
      m.n.set(o[0] + t * d[0], o[1] + t * d[1], o[2] + t * d[2]).normalize();
      ctx.update();
    },
    run(m) {
      localState.model = m.model; localState.mat = m.mat; localState.normalized = m.normalized;
      const N = LL.normalize(arr(m.n)), P = LL.scale(N, SPHERE_R), { kd, ks } = matOf(m);
      const light = arr(m.light), eye = arr(m.eye), light2 = arr(m.light2);
      const lights = m.I2 > 0 ? [light, light2] : [light], cols = m.I2 > 0 ? [WHITE, [m.I2, m.I2, m.I2]] : [WHITE];
      const shade = LL.shadeSurface(P, N, eye, lights, cols, WHITE, m.ka, kd, ks, m.s, m.model, m.normalized);
      const lv = LL.lightVector('point', P, light, [0, 0, 0]);
      const lam = LL.lambert(N, lv.L, kd, WHITE), mir = LL.mirrorDirection(N, lv.L);
      const ph = LL.phong(mir.R, shade.V, m.s, ks, WHITE, m.normalized), bl = LL.blinn(N, lv.L, shade.V, m.s, ks, WHITE, m.normalized);
      const L2 = LL.lightVector('point', P, light2, [0, 0, 0]).L;
      const bytes = shade.color.map((x) => LL.srgbEncode(x).byte);
      return { ...lv, ...lam, ...mir, ...ph, ...bl, ...shade, N, P, kd, ks, L2, nDotL2: LL.dot(N, L2), bytes, clipped: Math.max(...shade.color) > 1 };
    },
    draw(v, m, r, ctx) {
      const { kd, ks } = matOf(m), lights = m.I2 > 0 ? [arr(m.light), arr(m.light2)] : [arr(m.light)], cols = m.I2 > 0 ? [WHITE, [m.I2, m.I2, m.I2]] : [WHITE];
      colorSphere(ctx, JSON.stringify([lights, cols, arr(m.eye), m.ka, m.ks, m.s, m.model, m.mat, m.normalized]), (p) => LL.shadeSurface(p, LL.normalize(p), arr(m.eye), lights, cols, WHITE, m.ka, kd, ks, m.s, m.model, m.normalized).color);
      const P = P3(r.P);
      v.point(P, COL.white, { r: 0.045, k: 'p' });
      v.arrow(P, P.clone().addScaledVector(P3(r.N), 1.7), KEYS.N, { k: 'N', label: 'N', r: 0.016, hr: 0.055, head: 0.22 });
      v.arrow(P, P.clone().addScaledVector(P3(r.L), 1.7), KEYS.L, { k: 'L', label: 'L', r: 0.016, hr: 0.055, head: 0.22 });
      v.arrow(P, P.clone().addScaledVector(P3(r.V), 1.7), KEYS.V, { k: 'V', label: 'V', r: 0.016, hr: 0.055, head: 0.22 });
      if (m.model === 'blinn') v.arrow(P, P.clone().addScaledVector(P3(r.H), 1.7), KEYS.H, { k: 'H', label: 'H', r: 0.016, hr: 0.055, head: 0.22 });
      else v.arrow(P, P.clone().addScaledVector(P3(r.R), 1.7), KEYS.R, { k: 'R', label: 'R', r: 0.016, hr: 0.055, head: 0.22 });
      v.dashed(P, P3(arr(m.light)), KEYS.L, { k: 'L', dash: 0.06, gap: 0.08 });
      v.dashed(P, P3(arr(m.eye)), KEYS.V, { k: 'V', dash: 0.06, gap: 0.08 });
      if (m.I2 > 0) { v.dashed(P, P3(arr(m.light2)), COL.amber, { k: 'light2', dash: 0.06, gap: 0.08 }); v.arrow(P, P.clone().addScaledVector(P3(r.L2), 0.8), COL.amber, { k: 'light2', r: 0.012, hr: 0.045, head: 0.16 }); }
      v.arc(P, P3(r.N), P3(r.L), 0.9, KEYS.L, { k: 'nl', label: `${f(r.thetaN, 0)}°` });
    },
    explain(m, r) {
      const cos = m.model === 'blinn' ? r.hDotN : r.rDotV, fac = m.model === 'blinn' ? r.blinnFactor : r.phongFactor, theta = m.model === 'blinn' ? r.thetaH : r.thetaR;
      const sp = m.model === 'blinn' ? r.blinnSpec : r.phongSpec, lab = m.model === 'blinn' ? 'H·N' : 'R·V', ang = m.model === 'blinn' ? 'H' : 'R';
      const rows = [`{N} = ${vt(r.N, 3)},  {L} = ${vt(r.L, 3)},  {V} = ${vt(r.V, 3)}`,
        m.model === 'blinn' ? `{H} = normalize(L + V) = ${vt(r.H, 3)}` : `{R} = 2(N·L)N − L = ${vt(r.R, 3)}`,
        `{diffuse|diffuse} = k_d · max(0, {nl|N·L}) = ${vt(r.kd)} × ${f(r.clamped, 3)} = ${vt(r.lightDiffuse, 3)}`,
        `{specular|specular} = k_s · max(0, ${lab})^s${m.normalized ? ' · (s+2)/2π' : ''} = ${f(m.model === 'blinn' ? r.ks[0] : r.ks[0], 2)} × ${f(cos, 3)}^${m.s}${m.normalized ? ` × ${f(m.model === 'blinn' ? r.blinnNorm : r.phongNorm, 2)}` : ''} = ${f(r.ks[0], 2)} × ${f(fac, 4)} = ${f(sp[0], 3)}`,
        `{ambient|ambient} = k_a · k_d = ${f(m.ka)} × ${vt(r.kd)} = ${vt(r.ambient, 3)}`,
        `{sum|sum}${m.I2 > 0 ? ' over both lights' : ''} = ${vt(r.color, 3)}`];
      let status;
      if (r.nDotL <= 0) status = { text: `Facing away from the light (N·L ${f(r.nDotL, 3)}): diffuse and specular clamp to 0, only ambient remains.`, tone: 'bad' };
      else if (r.clipped) status = { text: `A channel of the sum is above 1 (${f(Math.max(...r.color), 2)}): the display clips it to 1.`, tone: 'warn' };
      else status = { text: `Lit: N·L ${f(r.nDotL, 3)}; the ${ang} direction is ${f(theta, 1)}° from ${m.model === 'blinn' ? 'N' : 'V'}, so the highlight adds ${f(sp[0], 3)}.`, tone: 'ok' };
      return { hud: `{nl|N·L ${f(r.nDotL, 3)}} · {${m.model === 'blinn' ? 'H' : 'R'}|${lab} ${f(cos, 3)}} · {sum|color ${vt(r.color, 2)}}`, rows, status,
        values: [['N·L', f(r.nDotL, 3)], [lab, f(cos, 3)], ['H·N', f(r.hDotN, 3)], ['R·V', f(r.rDotV, 3)], ['display code', `(${r.bytes.join(', ')})`], ['light 2 N·L2', f(r.nDotL2, 3)]],
        fact: 'Click the sphere to move the marked point. Drag the light, the eye or light 2. The sum is in linear light; the display encodes it with the sRGB curve.' };
    },
    panelTitle: 'Model, material, and the terms as colors',
    panel(host, m, r, ctx) {
      once(host, 'point', (h) => {
        segmented(h, 'specular', [['phong', 'Phong R·V'], ['blinn', 'Blinn H·N']], () => ctx.state().model, (v) => { ctx.state().model = v; ctx.update(); });
        segmented(h, 'lobe', [[false, 'raw'], [true, 'normalized']], () => ctx.state().normalized, (v) => { ctx.state().normalized = v; ctx.update(); });
        segmented(h, 'material', [['plastic', 'red plastic'], ['metal', 'gold metal']], () => ctx.state().mat, (v) => { const s = ctx.state(); s.mat = v; if (v === 'metal' && s.ks < 0.8) s.ks = 0.9; ctx.update(); });
        el('div', 'll-sw', h);
      });
      host.querySelectorAll('.ll-seg').forEach((row, i) => row.querySelectorAll('.lab-btn').forEach((b) => b.classList.toggle('on', b.dataset.value === String([m.model, m.normalized, m.mat][i]))));
      const css = (c) => `rgb(${c.map((x) => LL.srgbEncode(x).byte).join(',')})`;
      const sw = (name, c, big) => `<div class="ll-swatch${big ? ' big' : ''}"><i style="background:${css(c)}"></i>${name}<b>${vt(c, 2)}</b></div>`;
      host.querySelector('.ll-sw').innerHTML = sw('ambient', r.ambient) + sw('diffuse', r.diffuse) + sw('specular', r.specular) + sw('sum = pixel', r.color, true);
    },
  });

  // ============================================================ Local model: R, H and the lobes
  const unitInit = (a) => a;
  views.push({
    id: 'local.blinn', topic: 'local', label: 'Phong, Blinn, energy', inputTitle: 'Unit vectors at the point',
    init: { N: [0, 1, 0], L: [-0.5, 0.8, 0.3], V: [0.55, 0.78, 0.3], s: 30, normalized: false },
    handles: [{ id: 'N', label: 'N', color: KEYS.N }, { id: 'L', label: 'L', color: KEYS.L }, { id: 'V', label: 'V', color: KEYS.V }],
    params: [{ id: 's', label: 'shininess s', min: 1, max: 128, step: 1 }],
    home: { eye: [1.7, 1.4, 2.1], target: [0.2, 0.5, 0.2] }, axes: false, handleSize: 0.07,
    presets: [{ label: 'the marked point (deck)', run: (m) => { m.N.set(1, 1, 1); m.L.set(0.633, 0.446, 0.633); m.V.set(0.37, 0.37, 0.852); m.s = 30; } },
      { label: 'Blinn needs ~4 s', run: (m) => { m.N.set(1, 1, 1); m.L.set(0.633, 0.446, 0.633); m.V.set(0.37, 0.37, 0.852); m.s = 30; } },
      { label: 'eye on the mirror', run: (m) => { m.N.set(0, 1, 0); m.L.set(-0.6, 0.8, 0); m.V.set(0.6, 0.8, 0); } }, { label: 's = 128', run: (m) => { m.s = 128; } }],
    regions: ['Specular: the mirror direction', 'Specular: Phong', "Specular: Blinn's half vector", 'Specular: matching the exponent', 'Specular: energy'],
    edited(m) { for (const k of ['N', 'L', 'V']) { if (m[k].length() < 1e-6) m[k].set(0, 1, 0); m[k].normalize(); } },
    run(m) {
      const N = arr(m.N), L = arr(m.L), Vv = arr(m.V), ks = [1, 1, 1];
      const mir = LL.mirrorDirection(N, L), ph = LL.phong(mir.R, Vv, m.s, ks, WHITE, m.normalized), bl = LL.blinn(N, L, Vv, m.s, ks, WHITE, m.normalized);
      const ok = ph.phongFactor > 1e-30 && bl.hDotN > 0 && bl.hDotN < 1 && ph.phongFactor < 1;
      const mt = ok ? LL.matchExponent(ph.phongFactor, bl.hDotN, m.s) : { sBlinn: NaN, sRatio: NaN };
      return { ...mir, ...ph, ...bl, ...mt, ...LL.lobeEnergy(m.s) };
    },
    draw(v, m, r) {
      v.sphere(V(), 1, COL.dim, { k: 'sphere' });
      v.arrow(V(), P3(arr(m.N)), KEYS.N, { k: 'N', label: 'N', r: 0.018, hr: 0.06, head: 0.18 });
      v.arrow(V(), P3(arr(m.L)), KEYS.L, { k: 'L', label: 'L', r: 0.018, hr: 0.06, head: 0.18 });
      v.arrow(V(), P3(arr(m.V)), KEYS.V, { k: 'V', label: 'V', r: 0.018, hr: 0.06, head: 0.18 });
      v.arrow(V(), P3(r.R), KEYS.R, { k: 'R', label: 'R', r: 0.018, hr: 0.06, head: 0.18 });
      v.arrow(V(), P3(r.H), KEYS.H, { k: 'H', label: 'H', r: 0.018, hr: 0.06, head: 0.18 });
      v.arc(V(), P3(r.R), P3(arr(m.V)), 0.45, KEYS.R, { k: 'R', label: `${f(r.thetaR, 1)}°` });
      v.arc(V(), P3(arr(m.N)), P3(r.H), 0.35, KEYS.H, { k: 'H', label: `${f(r.thetaH, 1)}°` });
    },
    explain(m, r) {
      const rows = [`{R} = 2(N·L)N − L = ${vt(r.R, 3)};  {R|R·V} = ${f(r.rDotV, 3)}, ${f(r.thetaR, 1)}°;  Phong factor = ${f(r.phongFactor, 4)}`,
        `{H} = normalize(L + V) = ${vt(r.H, 3)};  {H|H·N} = ${f(r.hDotN, 3)}, ${f(r.thetaH, 1)}°;  Blinn factor = ${f(r.blinnFactor, 4)}`,
        `half angle / mirror angle = ${f(r.thetaH / Math.max(r.thetaR, 1e-9), 3)} (exactly 1/2 when N, L, V share a plane)`,
        `Blinn matches Phong's ${f(r.phongFactor, 4)} at s = ${Number.isFinite(r.sBlinn) ? f(r.sBlinn, 1) : 'none'}${Number.isFinite(r.sRatio) ? `, ${f(r.sRatio, 2)} × ${m.s}` : ''}`,
        `lobe integral with cosine: ${f(r.raw, 4)} (2π/(s+2) = ${f(r.exact, 4)}); normalizer (s+2)/2π = ${f(r.normalizer, 3)}; normalized total ${f(r.normalized, 3)}`];
      const status = r.nDotL <= 0 ? { text: 'L is behind the surface: no light arrives.', tone: 'bad' } : r.rDotV >= 0.99 ? { text: 'The eye is on the mirror direction: the center of the highlight.', tone: 'ok' } : r.rDotV <= 0 ? { text: 'The eye is more than 90° from the mirror direction: Phong gives 0.', tone: 'warn' } : { text: `The eye is ${f(r.thetaR, 1)}° off the mirror direction.`, tone: 'info' };
      return { hud: `{R|R·V ${f(r.rDotV, 3)}} · {H|H·N ${f(r.hDotN, 3)}} · s = ${m.s}`, rows, status, values: [['Phong', f(r.phongFactor, 4)], ['Blinn', f(r.blinnFactor, 4)], ['normalizer', f(r.normalizer, 3)], ['energy', f(r.raw, 4)]] };
    },
    panelTitle: 'Highlight against the angle to the mirror direction',
    panel(host, m, r, ctx) {
      once(host, 'blinn', (h) => { segmented(h, 'lobe', [[false, 'raw'], [true, 'normalized']], () => ctx.state().normalized, (v) => { ctx.state().normalized = v; ctx.update(); }); el('div', 'll-chartbox', h); });
      host.querySelectorAll('.lab-btn').forEach((b) => b.classList.toggle('on', b.dataset.value === String(m.normalized)));
      const at = (deg, s, blinn) => { const t = (deg * Math.PI) / 180, Vv = [Math.sin(t), Math.cos(t), 0]; return blinn ? LL.blinn([0, 1, 0], [0, 1, 0], Vv, s, WHITE, WHITE, m.normalized).blinnFactor * (m.normalized ? (s + 2) / (2 * Math.PI) : 1) : LL.phong([0, 1, 0], Vv, s, WHITE, WHITE, m.normalized).phongSpec[0]; };
      const top = m.normalized ? (m.s + 2) / (2 * Math.PI) : 1;
      host.querySelector('.ll-chartbox').innerHTML = chart({ title: 'factor against the angle between R and V', x: [0, 60], y: [0, top * 1.05], xTicks: [0, 15, 30, 45, 60], yTicks: [0, top / 2, top], xLabel: 'degrees',
        series: [{ fn: (a) => at(a, m.s, false), color: KEYS.R, label: `Phong s = ${m.s}` }, { fn: (a) => at(a, m.s, true), color: KEYS.H, label: `Blinn s = ${m.s}` }, { fn: (a) => at(a, 4 * m.s, true), color: COL.green, dash: true, label: `Blinn s = ${4 * m.s}` }],
        marks: [{ x: r.thetaR, y: at(r.thetaR, m.s, false), color: KEYS.R }] });
    },
  });
  void btn; void esc; void unitInit;
  return views;
}

export const TOPICS_A = [{ id: 'lights', label: 'Lights' }, { id: 'local', label: 'Local' }];
