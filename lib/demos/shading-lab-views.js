// shading-lab-views: the catalog behind the shading-lab demo (runtime: lib/core/lab.js). Three views: a disk and a sphere under
// one light (the pictures, and the middle row seen from above), an icosphere with one normal per face or per vertex, and a wall
// of bumps and dents. run() calls the program's own functions (lib/programs/shading-lab/webgl/shading.js), so the numbers beside
// the code are that code's output.
import * as THREE from '../vendor/three.module.js';
import * as P from '../programs/shading-lab/webgl/shading.js';
import { COL, V } from '../core/lab-viz.js';
import { overlayFor, showOverlay, hideOverlay, codesToCanvas, text, arrow2d, sun, segmented, once, el } from './shading-lab-draw.js';

export const KEYS = {
  N: 0x7ee787, L: 0xffa657, nl: 0xffa657, b: 0xffd166, disk: 0x8b93a7, sphere: 0xffa657, differ: 0xff7b72, ka: 0x79c0ff,
  face: 0xd2a8ff, vertex: 0x56d4dd, bump: 0x7ee787, dent: 0xff79c6,
};

const f = (x, d = 2) => (Number.isFinite(x) ? (Number(x.toFixed(d)) === 0 ? (0).toFixed(d) : x.toFixed(d)).replace('-', '−') : 'none');
const vt = (a, d = 2) => `(${a.map((x) => f(x, d)).join(', ')})`;
const arr = (v) => [v.x, v.y, v.z];
const grayCss = (code) => `rgb(${code},${code},${code})`;
const n0 = (k) => k.toLocaleString('en-US');

// ================================================================ the disk and the sphere

// the resolution of the per-pixel pictures: one value for the lab, res.step (makeViews), an index into each view's own sizes
const RES_DEFAULT = 1;
const stepOf = (sizes, res) => Math.max(0, Math.min(sizes.length - 1, res.step));
const sizeOf = (sizes, res) => sizes[stepOf(sizes, res)];
function resolutionRow(parent, sizes, res, changed) {
  return segmented(parent, 'resolution', sizes.map((n, i) => [i, `${n} × ${n}`]), () => stepOf(sizes, res), (v) => { res.step = v; changed(); });
}

// both pictures are computed whole on every change: at 240 that is about 0.1 s already, so one larger size only
const PIC_SIZES = [120, 240, 360];
const TEXTURES = [['plain', 'plain'], ['checker', 'checker'], ['planet', 'planet']];
let pics = { key: '' };


function pictures(m, n) {
  const key = [m.texture, m.shading, m.ka, m.az, m.el, m.spin, n].join('|');
  if (pics.key !== key) {
    const L = P.lightFromAngles(m.az, m.el);
    const disk = P.renderPicture('disk', L, m.ka, m.shading, m.spin, m.texture, n);
    const sphere = P.renderPicture('sphere', L, m.ka, m.shading, m.spin, m.texture, n);
    pics = { key, n, disk, sphere, diff: P.countDifferent(disk, sphere), diskCv: null, sphereCv: null };
  }
  return pics;
}

/** where the light's sun is drawn on a picture, in unit-circle coordinates: on the circle's face when the light is in front,
 *  in a band just outside it (out to 1 + BAND) when it is behind */
const BAND = 0.3;
function sunSpot(L) {
  if (L[2] >= 0) return { x: L[0], y: L[1], behind: false };
  const h = Math.hypot(L[0], L[1]);
  const phi = Math.acos(Math.max(-1, Math.min(1, L[2]))) * P.DEG;
  const r = 1 + (BAND * (phi - 90)) / 90;
  const dx = h > 1e-6 ? L[0] / h : 0, dy = h > 1e-6 ? L[1] / h : 1;
  return { x: dx * r, y: dy * r, behind: true };
}
/** the inverse: a point of the picture, in unit-circle coordinates, to the light's angles */
function anglesAt(x, y) {
  let r = Math.hypot(x, y);
  let L;
  if (r <= 1) L = [x, y, Math.sqrt(Math.max(0, 1 - r * r))];
  else {
    r = Math.min(r, 1 + BAND);
    const phi = (90 + (90 * (r - 1)) / BAND) / P.DEG;
    const h = Math.hypot(x, y);
    L = [(Math.sin(phi) * x) / h, (Math.sin(phi) * y) / h, Math.cos(phi)];
  }
  return { az: Math.round(Math.atan2(L[0], L[2]) * P.DEG), el: Math.round(Math.asin(Math.max(-1, Math.min(1, L[1]))) * P.DEG) };
}

function ballLayout(ov, w, h) {
  const narrow = w < 640;
  const top = ov.top, gap = narrow ? 14 : 30, bottom = 58, labelH = 24;
  let secH = 178;
  const S = Math.max(120, Math.min((w - 3 * gap) / 2, h - top - labelH - secH - bottom));
  // the slice's radius: its sun and labels stay inside its own half of the pane
  const R = Math.min((S / 2 + gap / 2) / 1.75, (secH - 44) / 1.34);
  secH = Math.min(secH, 1.34 * R + 50);
  const spare = Math.max(0, h - top - bottom - (labelH + S + 16 + secH));
  const x0 = (w - (2 * S + gap)) / 2, y0 = top + labelH + spare / 2;
  return { S, R, narrow, y0, secTop: y0 + S + 16, secH, boxes: [{ shape: 'disk', x: x0 }, { shape: 'sphere', x: x0 + S + gap }] };
}

/** the picture under canvas point (x, y), with the point in its unit-circle coordinates */
function ballHit(ov, x, y) {
  const lay = ov.layout;
  if (!lay) return null;
  let best = null;
  for (const b of lay.boxes) {
    const cx = b.x + lay.S / 2, cy = lay.y0 + lay.S / 2;
    const u = (x - cx) / (lay.S / 2), v = -(y - cy) / (lay.S / 2);
    const d = Math.hypot(u, v);
    if (!best || d < best.d) best = { shape: b.shape, u, v, d };
  }
  return best;
}

function ballDrag(ctx, x, y) {
  const hit = ballHit(overlayFor(ctx), x, y);
  if (!hit || hit.d > 1.6) return;
  Object.assign(ctx.state(), anglesAt(hit.u, hit.v));
  ctx.update();
}
function ballHover(ctx, x, y) {
  const hit = ballHit(overlayFor(ctx), x, y);
  if (!hit || hit.d > 1) return;
  const m = ctx.state();
  m.probe = hit.shape;
  m.px = Math.round(hit.u * 100) / 100;
  m.py = Math.round(hit.v * 100) / 100;
  if (!P.insideCircle(m.px, m.py)) return;
  ctx.refresh();
}

function paintBall(ov, g, w, h, m, r) {
  const lay = ballLayout(ov, w, h);
  ov.layout = lay;
  const { S, y0 } = lay;
  if (!r.pics.diskCv) { r.pics.diskCv = codesToCanvas(r.pics.disk, r.pics.n); r.pics.sphereCv = codesToCanvas(r.pics.sphere, r.pics.n); }
  const spot = sunSpot(r.L);
  for (const b of lay.boxes) {
    const cv = b.shape === 'disk' ? r.pics.diskCv : r.pics.sphereCv;
    g.save();
    g.globalAlpha = ov.dim(b.shape, 'differ', 'b', 'N', 'nl', 'L', 'ka');
    g.imageSmoothingEnabled = true;
    g.drawImage(cv, b.x, y0, S, S);
    g.restore();
    const title = lay.narrow ? (b.shape === 'disk' ? 'flat disk: one normal' : 'sphere: a normal per point')
      : b.shape === 'disk' ? 'flat disk: one normal everywhere' : 'sphere: a different normal at every point';
    text(g, title, b.x + S / 2, y0 - 8, { size: lay.narrow ? 12 : 13, align: 'center', color: b.shape === 'disk' ? '#aab2c5' : '#ffc38a', weight: 600 });
    const cx = b.x + S / 2, cy = y0 + S / 2;
    sun(g, cx + (spot.x * S) / 2, cy - (spot.y * S) / 2, 6, spot.behind);
    if (b.shape === m.probe && P.insideCircle(m.px, m.py)) {
      const px = cx + (m.px * S) / 2, py = cy - (m.py * S) / 2;
      g.strokeStyle = '#ffffff';
      g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(px - 7, py); g.lineTo(px - 2, py); g.moveTo(px + 2, py); g.lineTo(px + 7, py);
      g.moveTo(px, py - 7); g.lineTo(px, py - 2); g.moveTo(px, py + 2); g.lineTo(px, py + 7);
      g.stroke();
    }
    // the middle row, marked on the picture
    g.save();
    g.globalAlpha = 0.45 * ov.dim('b', b.shape);
    g.strokeStyle = '#ffd166';
    g.setLineDash([4, 4]);
    g.beginPath();
    g.moveTo(b.x, cy);
    g.lineTo(b.x + S, cy);
    g.stroke();
    g.restore();
  }
  paintSection(ov, g, lay, m, r);
}

/** the middle row seen from above: x to the right, z toward the eye drawn downward; each point's normal and brightness */
function paintSection(ov, g, lay, m, r) {
  const R = lay.R;
  const base = lay.secTop + 10;
  const thetas = [-80, -60, -40, -20, 0, 20, 40, 60, 80];
  for (const b of lay.boxes) {
    const cx = b.x + lay.S / 2;
    const disk = b.shape === 'disk';
    const zOf = (x) => (disk ? 0.42 : Math.sqrt(Math.max(0, 1 - x * x)));
    const Y = (z) => base + z * R;
    // the shape's outline in the slice
    g.save();
    g.globalAlpha = ov.dim(b.shape, 'N', 'b');
    g.strokeStyle = disk ? '#8b93a7' : '#ffa657';
    g.lineWidth = 2;
    g.beginPath();
    if (disk) { g.moveTo(cx - R, Y(0.42)); g.lineTo(cx + R, Y(0.42)); } else {
      for (let i = 0; i <= 60; i++) {
        const a = Math.PI * (i / 60);
        const x = -Math.cos(a);
        if (i === 0) g.moveTo(cx + x * R, Y(zOf(x))); else g.lineTo(cx + x * R, Y(zOf(x)));
      }
    }
    g.stroke();
    g.restore();
    thetas.forEach((t, i) => {
      const x = Math.sin(t / P.DEG);
      const N = disk ? P.diskNormal(x, 0) : P.sphereNormal(x, 0);
      const br = P.brightness(N, r.L, m.ka, m.shading);
      const px = cx + x * R, py = Y(zOf(x));
      g.save();
      g.globalAlpha = ov.dim('N');
      arrow2d(g, px, py, px + N[0] * R * 0.3, py + N[2] * R * 0.3, '#7ee787', 1.6, 6);
      g.restore();
      g.save();
      g.globalAlpha = ov.dim('b', 'nl');
      g.fillStyle = grayCss(P.srgbCode(br.b));
      g.strokeStyle = '#ffd166';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(px, py, 5, 0, 2 * Math.PI);
      g.fill();
      g.stroke();
      g.restore();
      if (!disk && i % 2 === 0) text(g, f(br.b), px + N[0] * R * 0.46, py + N[2] * R * 0.46 + 4, { size: lay.narrow ? 10 : 11, align: 'center', color: '#ffd166' });
    });
    if (disk) text(g, lay.narrow ? `${f(r.diskB)} everywhere` : `brightness ${f(r.diskB)} at every point`, cx, Y(0.42) - 14, { size: lay.narrow ? 11 : 12, align: 'center', color: '#ffd166' });
    // the light, as this slice sees it: a sun in its direction, a dashed line to the shape
    const lx = r.L[0], lz = r.L[2];
    const len = Math.hypot(lx, lz);
    const ax = cx, ay = disk ? Y(0.42) : base + R * 0.45;
    if (len > 0.05) {
      const ux = lx / len, uz = lz / len;
      const sx = cx + ux * R * 1.7, sy = Math.min(base + R * 1.3, Math.max(base - 2, base + uz * R * 1.7));
      g.save();
      g.globalAlpha = ov.dim('L');
      g.strokeStyle = '#ffa657';
      g.lineWidth = 1.5;
      g.setLineDash([4, 4]);
      g.beginPath();
      g.moveTo(sx, sy);
      g.lineTo(ax, ay);
      g.stroke();
      g.restore();
      sun(g, sx, sy, 5, uz < 0);
      text(g, uz < 0 ? 'L (behind)' : 'L', sx + (ux >= 0 ? 12 : -12), sy + 16, { size: 12, color: '#ffa657', weight: 700, align: ux >= 0 ? 'left' : 'right' });
    } else {
      text(g, `L points ${r.L[1] > 0 ? 'up' : 'down'}, out of this slice`, cx, base + R * 1.3, { size: 11.5, color: '#ffa657', align: 'center' });
    }
  }
  text(g, lay.narrow ? 'the dashed row from above: normals green, brightness in the dots; eye below' : 'the dashed middle row, seen from above: green arrows are normals, dots are brightness; the eye is below',
    lay.boxes[0].x, lay.secTop + lay.secH - 4, { size: lay.narrow ? 10.5 : 11.5, color: '#79829a' });
}

function ballView(res) {
  return {
    id: 'disk.ball', topic: 'disk', label: 'disk or ball', inputTitle: 'Light and shading',
    init: { shading: 0, ka: 0.1, az: 40, el: 35, spin: 0, texture: 'planet', probe: 'sphere', px: 0.45, py: 0.3 },
    params: [
      { id: 'shading', label: 'shading', min: 0, max: 1, step: 0.01, play: true },
      { id: 'ka', label: 'ambient', min: 0, max: 0.5, step: 0.01 },
      { id: 'az', label: 'light az', min: -180, max: 180, step: 1, unit: '°', play: true },
      { id: 'el', label: 'light el', min: -90, max: 90, step: 1, unit: '°' },
      { id: 'spin', label: 'spin', min: 0, max: 360, step: 1, unit: '°', play: true },
    ],
    presets: [
      { label: 'frozen', set: { shading: 0 } },
      { label: 'lit', set: { shading: 1 } },
      // the lecture's "0 of 57,600 pixels differ" is at 240 by 240
      { label: 'plain and frozen', run: (m) => { Object.assign(m, { texture: 'plain', shading: 0 }); res.step = PIC_SIZES.indexOf(240); } },
      { label: 'light at the eye', set: { shading: 1, az: 0, el: 0 } },
      { label: 'raking light', set: { shading: 1, az: 80, el: 10 } },
      { label: 'light behind', set: { shading: 1, az: 150, el: 20 } },
      { label: 'no ambient', set: { shading: 1, ka: 0 } },
    ],
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['Normals: a disk and a sphere', 'Shading at a point', 'Shade a pixel'],
    setup(ctx) { showOverlay(ctx, { down: (x, y) => ballDrag(ctx, x, y), move: (x, y) => ballDrag(ctx, x, y), hover: (x, y) => ballHover(ctx, x, y) }); },
    leave(ctx) { hideOverlay(ctx); },
    run(m) {
      const L = P.lightFromAngles(m.az, m.el);
      const size = sizeOf(PIC_SIZES, res);
      const p = pictures(m, size);
      const row = P.middleRow(L, m.ka, m.shading, size);   // as many points as the picture has columns
      const shape = P.insideCircle(m.px, m.py) ? m.probe : 'sphere';
      const px = P.insideCircle(m.px, m.py) ? m.px : 0, py = P.insideCircle(m.px, m.py) ? m.py : 0;
      const pix = P.shadePixel(shape, px, py, L, m.ka, m.shading, m.spin, m.texture);
      const br = P.brightness(pix.N, L, m.ka, m.shading);
      const z = P.sphereNormal(px, py)[2];
      return { L, pics: p, diff: p.diff.count, total: p.diff.total, diskB: row.disk[0], sphereLow: row.sphereLow, sphereHigh: row.sphereHigh,
        diskSpread: row.diskSpread, shape, px, py, z, nDotL: br.nDotL, lambert: br.lambert, lit: br.lit, b: pix.b, N: pix.N, uv: pix.uv, baseColor: pix.baseColor, color: pix.color, code: pix.code };
    },
    draw(v, m, r, ctx) {
      const ov = ctx.sceneEl ? overlayFor(ctx) : null;
      if (!ov) return;
      ov.painter = (g, w, h) => paintBall(ov, g, w, h, m, r);
      ov.repaint();
    },
    explain(m, r) {
      const frozen = m.shading === 0;
      const rows = [
        `{N|N}: disk (0, 0, 1) everywhere; sphere (x, y, √(1 − x² − y²)), at the cross ${vt(r.N)}`,
        `{L|L} = ${vt(r.L)} (az ${f(m.az, 0)}°, el ${f(m.el, 0)}°)`,
        `{b|brightness} = (1 − s) + s(ka + (1 − ka) max(0, {nl|N·L})), s = ${f(m.shading)}, {ka|ka} = ${f(m.ka)}`,
        `at the cross (${r.shape}, ${f(r.px)}, ${f(r.py)}): {nl|N·L} = ${f(r.nDotL, 3)}, {b|brightness} ${f(r.b, 3)}, codes ${vt(r.code, 0)}`,
        `middle row: {disk|disk ${f(r.diskB)}} at every x; {sphere|sphere ${f(r.sphereLow)} to ${f(r.sphereHigh)}}`,
        `{differ|pixels that differ}: ${n0(r.diff)} of ${n0(r.total)}`,
      ];
      let status;
      if (frozen && r.diff === 0) status = { text: 'Frozen, nothing printed: the two pictures are the same, pixel for pixel. No image can tell this ball from a disk.', tone: 'warn' };
      else if (frozen) status = { text: `Frozen: the pictures differ only where the texture squeezes toward the sphere's rim (${n0(r.diff)} pixels). That squeeze is the one cue left, and a picture printed on a disk could carry it too.`, tone: 'warn' };
      else if (r.L[2] < 0) status = { text: 'The light is behind the shape: the sphere shows a lit crescent, and the disk faces away from the light and gets ambient only.', tone: 'info' };
      else status = { text: `The sphere's brightness runs from ${f(r.sphereLow)} to ${f(r.sphereHigh)} along the middle row; the disk's is one value, ${f(r.diskB)}. That variation is what reads as a ball.`, tone: 'ok' };
      const L = r.L, ka = m.ka, s = m.shading;
      const at = (x) => P.brightness(P.sphereNormal(x, 0), L, ka, s).b;
      return {
        hud: frozen ? `{b|frozen}: brightness 1 everywhere · {differ|${n0(r.diff)} pixels differ}` : `middle row: {disk|disk ${f(r.diskB)}, flat} · {sphere|sphere ${f(r.sphereLow)} to ${f(r.sphereHigh)}}`,
        rows, status,
        chart: { x: [-1, 1], y: [0, 1], curve: 'brightness along the middle row: disk gray, sphere orange', xLabel: 'x',
          series: [{ fn: () => r.diskB, color: COL.gray }, { fn: at, color: COL.amber }], at: Math.abs(r.py) < 0.03 ? r.px : undefined, atY: r.b },
        values: [['disk brightness', `${f(r.diskB, 3)} (one value)`, 'disk'], ['sphere, middle row', `${f(r.sphereLow, 3)} to ${f(r.sphereHigh, 3)}`, 'sphere'],
          ['pixels that differ', `${n0(r.diff)} of ${n0(r.total)}`, 'differ'], ['N at the cross', vt(r.N), 'N'], ['N·L at the cross', f(r.nDotL, 3), 'nl']],
        fact: 'Drag on either picture to move the light: inside the circle, the light sits where you point; just outside it, the light goes behind. Hover to move the cross.',
      };
    },
    panelTitle: 'Texture',
    panel(host, m, r, ctx) {
      once(host, 'ball', (h) => {
        h.refreshers.push(segmented(h, 'texture', TEXTURES, () => ctx.state().texture, (v) => { ctx.state().texture = v; ctx.update(); }));
        el('p', 'lab-note', h, 'plain: one color, so outline and shading are the only cues. checker and planet: the image squeezes toward the sphere\'s rim and not on the disk.');
        h.refreshers.push(resolutionRow(h, PIC_SIZES, res, () => ctx.update()));
      });
      for (const fn of host.refreshers) fn();
    },
  };
}

// ================================================================ facets: one normal per face or per vertex

const ICO_R = 1.4;
const icoCache = [];
function icoAt(level) {
  if (!icoCache[level]) {
    let mesh = P.icosahedron();
    for (let k = 0; k < level; k++) mesh = P.subdivide(mesh.vertices, mesh.triangles);
    const faceN = mesh.triangles.map((t) => P.faceNormal(mesh.vertices[t[0]], mesh.vertices[t[1]], mesh.vertices[t[2]]));
    icoCache[level] = { mesh, faceN, vertexN: P.vertexNormals(mesh.vertices, mesh.triangles) };
  }
  return icoCache[level];
}

const facet = { obj: null, geoKey: '', colorKey: '' };
function ensureFacetMesh(ctx, level) {
  if (!ctx.world) return null;
  if (!facet.obj) {
    facet.obj = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ vertexColors: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
    ctx.world.add(facet.obj);
  }
  if (facet.geoKey !== String(level)) {
    const { mesh } = icoAt(level);
    const pos = new Float32Array(mesh.triangles.length * 9);
    mesh.triangles.forEach((t, i) => t.forEach((vi, j) => {
      const p = mesh.vertices[vi];
      pos.set([p[0] * ICO_R, p[1] * ICO_R, p[2] * ICO_R], i * 9 + j * 3);
    }));
    facet.obj.geometry.dispose();
    facet.obj.geometry = new THREE.BufferGeometry();
    facet.obj.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    facet.obj.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.length), 3));
    facet.geoKey = String(level);
    facet.colorKey = '';
  }
  return facet.obj;
}

const BASE = P.albedo('plain', 0, 0);
function colorFacets(level, mode, L, ka) {
  const key = [level, mode, L.join(','), ka].join('|');
  if (!facet.obj || facet.colorKey === key) return;
  facet.colorKey = key;
  const { mesh, faceN, vertexN } = icoAt(level);
  const col = facet.obj.geometry.attributes.color;
  mesh.triangles.forEach((t, i) => t.forEach((vi, j) => {
    const N = mode === 'face' ? faceN[i] : vertexN[vi];
    const c = P.scale(BASE, P.brightness(N, L, ka, 1).b);
    col.setXYZ(i * 3 + j, c[0], c[1], c[2]);
  }));
  col.needsUpdate = true;
}

function facetView() {
  return {
    id: 'mesh.facets', topic: 'mesh', label: 'facets', inputTitle: 'Light and mesh',
    init: { light: [2.0, 1.5, 1.2], level: 1, ka: 0.1, mode: 'face', showNormals: true },
    handles: [{ id: 'light', label: 'light', color: COL.gold }],
    params: [{ id: 'level', label: 'subdivisions', min: 0, max: 4, step: 1 }, { id: 'ka', label: 'ambient', min: 0, max: 0.5, step: 0.01 }],
    presets: [
      { label: '20 faces, flat', set: { level: 0, mode: 'face' } },
      { label: '20 faces, smooth', set: { level: 0, mode: 'vertex' } },
      { label: '320 faces, flat', set: { level: 2, mode: 'face' } },
      { label: '320 faces, smooth', set: { level: 2, mode: 'vertex' } },
      { label: '5,120 faces, flat', set: { level: 4, mode: 'face' } },
    ],
    home: { eye: [0.3, 0.8, 6.8], target: [0, 0, 0] }, grid: 'none', axes: false, handleSize: 0.07,
    regions: ['Face normals and vertex normals', 'Shading at a point'],
    setup(ctx) { if (facet.obj) facet.obj.visible = true; },
    leave() { if (facet.obj) facet.obj.visible = false; },
    run(m) {
      const level = Math.round(m.level);
      const { mesh, faceN, vertexN } = icoAt(level);
      const L = P.normalize(arr(m.light));
      // the face that faces the light most, for the code card's values
      let best = 0;
      faceN.forEach((n, i) => { if (P.dot(n, L) > P.dot(faceN[best], L)) best = i; });
      const t = mesh.triangles[best];
      const n = P.cross(P.sub(mesh.vertices[t[1]], mesh.vertices[t[0]]), P.sub(mesh.vertices[t[2]], mesh.vertices[t[0]]));
      const br = P.brightness(faceN[best], L, m.ka, 1);
      const faceB = faceN.map((N) => P.brightness(N, L, m.ka, 1).b);
      const distinct = new Set(faceB.map((b) => b.toFixed(3))).size;
      return { level, L, triangles: mesh.triangles.length, vertices: mesh.vertices.length, n, nDotL: br.nDotL, lambert: br.lambert, lit: br.lit, b: br.b,
        sums: vertexN, normals: vertexN, distinct, low: Math.min(...faceB), high: Math.max(...faceB), best, mesh, faceN, vertexN };
    },
    draw(v, m, r, ctx) {
      ensureFacetMesh(ctx, r.level);
      if (facet.obj) facet.obj.visible = true;
      colorFacets(r.level, m.mode, r.L, m.ka);
      const light = V(m.light.x, m.light.y, m.light.z);
      const Lv = V(...r.L);
      v.dashed(V(0, 0, 0), light, COL.gray, { k: 'L' });
      v.arrow(Lv.clone().multiplyScalar(ICO_R), Lv.clone().multiplyScalar(ICO_R + 0.75), COL.amber, { k: 'L', label: 'L', r: 0.022 });
      if (m.showNormals && r.level <= 1) {
        const color = m.mode === 'face' ? COL.purple : COL.cyan;
        const k = m.mode === 'face' ? 'face' : 'vertex';
        if (m.mode === 'face') {
          r.mesh.triangles.forEach((t, i) => {
            const c = P.scale(P.add(P.add(r.mesh.vertices[t[0]], r.mesh.vertices[t[1]]), r.mesh.vertices[t[2]]), ICO_R / 3);
            v.arrow(V(...c), V(...P.add(c, P.scale(r.faceN[i], 0.32))), color, { k, r: 0.009, head: 0.08, hr: 0.03 });
          });
        } else {
          r.mesh.vertices.forEach((p, i) => {
            const c = P.scale(p, ICO_R);
            v.arrow(V(...c), V(...P.add(c, P.scale(r.vertexN[i], 0.32))), color, { k, r: 0.009, head: 0.08, hr: 0.03 });
          });
        }
      }
    },
    explain(m, r) {
      const face = m.mode === 'face';
      const rows = [
        `level ${r.level}: ${n0(r.triangles)} triangles, ${n0(r.vertices)} vertices`,
        face ? `{face|one normal per triangle}: cross(b − a, c − a), normalized; the whole triangle gets one brightness`
          : `{vertex|one normal per vertex}: the area-weighted sum of its triangles' normals, normalized; brightness blends across each triangle`,
        `{L|L} = ${vt(r.L)}; the face most toward it: {nl|N·L} = ${f(r.nDotL, 3)}, {b|brightness} ${f(r.b, 3)}`,
        `faces' brightness: ${f(r.low)} to ${f(r.high)}, ${n0(r.distinct)} distinct values (to 3 places)`,
      ];
      const status = face
        ? { text: r.level <= 2 ? 'One brightness per triangle: the steps between neighbors draw every edge, and the ball reads as a cut gem.' : 'One brightness per triangle, but the steps are now small: the facets fade, except near the dark side and the outline.', tone: r.level <= 2 ? 'warn' : 'info' }
        : { text: 'Per-vertex normals: inside the outline the brightness has no steps and the surface reads as round. The outline is still a polygon: shading changes how a mesh reads, not its geometry.', tone: 'ok' };
      return {
        hud: `${face ? '{face|flat}' : '{vertex|smooth}'} · ${n0(r.triangles)} triangles · {b|brightness ${f(r.low)} to ${f(r.high)}}`,
        rows, status,
        values: [['triangles', n0(r.triangles)], ['vertices', n0(r.vertices)], ['normals', face ? `${n0(r.triangles)} (per face)` : `${n0(r.vertices)} (per vertex)`],
          ['L', vt(r.L), 'L'], ['brightness range', `${f(r.low, 3)} to ${f(r.high, 3)}`, 'b']],
        fact: 'Drag the gold light handle. Orbit to see the outline: smooth shading does not round it.',
      };
    },
    panelTitle: 'Normals',
    panel(host, m, r, ctx) {
      once(host, 'facets', (h) => {
        h.refreshers.push(segmented(h, 'normals', [['face', 'one per face'], ['vertex', 'one per vertex']], () => ctx.state().mode, (v) => { ctx.state().mode = v; ctx.update(); }));
        h.refreshers.push(segmented(h, 'arrows', [['true', 'show'], ['false', 'hide']], () => String(ctx.state().showNormals), (v) => { ctx.state().showNormals = v === 'true'; ctx.update(); }));
        el('p', 'lab-note', h, 'Arrows are drawn up to 80 triangles (level 1).');
      });
      for (const fn of host.refreshers) fn();
    },
  };
}

// ================================================================ bump or dent

const WALL_SIZES = [48, 96, 144, 192], WALL_MARGIN = 1.25, COLS = 4, ROWS = 3;
let walls = { key: '' };
function wallImages(m, n) {
  const key = [m.angle, m.tilt, m.ka, n].join('|');
  if (walls.key !== key) {
    const L = P.lightInPicture(m.angle, m.tilt);
    const bump = P.renderWall(false, L, m.ka, n, WALL_MARGIN);
    const dent = P.renderWall(true, L, m.ka, n, WALL_MARGIN);
    const turned = P.renderWall(false, P.turnHalf(L), m.ka, n, WALL_MARGIN);
    walls = { key, n, bump, dent, same: P.countDifferent(turned, dent), bumpCv: null, dentCv: null };
  }
  return walls;
}
const isDent = (m, row, col) => m.layout === 'mixed' && (row + col) % 2 === 1;
const fromWord = (deg) => {
  const a = ((deg % 360) + 360) % 360;
  return a >= 45 && a < 135 ? 'above' : a >= 135 && a < 225 ? 'the left' : a >= 225 && a < 315 ? 'below' : 'the right';
};

function wallLayout(ov, w, h) {
  const C = Math.max(60, Math.min((w - 40) / COLS, (h - ov.top - 74) / ROWS));
  return { C, x0: (w - COLS * C) / 2, y0: ov.top + 14 };
}
function wallHit(ov, m, x, y) {
  const lay = ov.layout;
  if (!lay) return null;
  let gx = x - lay.x0, gy = y - lay.y0;
  if (m.turned) { gx = COLS * lay.C - gx; gy = ROWS * lay.C - gy; }
  const col = Math.floor(gx / lay.C), row = Math.floor(gy / lay.C);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
  const u = ((gx - col * lay.C) / lay.C) * 2 * WALL_MARGIN - WALL_MARGIN;
  const v = WALL_MARGIN - ((gy - row * lay.C) / lay.C) * 2 * WALL_MARGIN;
  return { row, col, u, v };
}
function wallHover(ctx, x, y) {
  const m = ctx.state();
  const hit = wallHit(overlayFor(ctx), m, x, y);
  if (!hit) return;
  m.px = Math.round(hit.u * 100) / 100;
  m.py = Math.round(hit.v * 100) / 100;
  m.dent = isDent(m, hit.row, hit.col);
  ctx.refresh();
}

function paintWall(ov, g, w, h, m, r) {
  const lay = wallLayout(ov, w, h);
  ov.layout = lay;
  const { C, x0, y0 } = lay;
  if (!r.walls.bumpCv) { r.walls.bumpCv = codesToCanvas(r.walls.bump, r.walls.n); r.walls.dentCv = codesToCanvas(r.walls.dent, r.walls.n); }
  g.save();
  if (m.turned) { g.translate(x0 + (COLS * C) / 2, y0 + (ROWS * C) / 2); g.rotate(Math.PI); g.translate(-(x0 + (COLS * C) / 2), -(y0 + (ROWS * C) / 2)); }
  g.imageSmoothingEnabled = true;
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const dent = isDent(m, row, col);
      g.globalAlpha = ov.dim(dent ? 'dent' : 'bump', 'nl', 'b', 'L', 'N');
      g.drawImage(dent ? r.walls.dentCv : r.walls.bumpCv, x0 + col * C, y0 + row * C, C + 0.5, C + 0.5);
    }
  }
  g.restore();
  // labels and the light are drawn upright, where the turned picture puts them
  const place = (row, col) => {
    let cx = x0 + (col + 0.5) * C, cy = y0 + (row + 0.5) * C;
    if (m.turned) { cx = 2 * x0 + COLS * C - cx; cy = 2 * y0 + ROWS * C - cy; }
    return [cx, cy];
  };
  if (m.truth) {
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const dent = isDent(m, row, col);
        const [cx, cy] = place(row, col);
        text(g, dent ? 'dent' : 'bump', cx, cy + C * 0.47, { size: 12, align: 'center', weight: 700, color: dent ? '#ff79c6' : '#7ee787' });
      }
    }
    const shown = m.angle + (m.turned ? 180 : 0);
    const a = shown / P.DEG;
    const gx = x0 + (COLS * C) / 2, gy = y0 + (ROWS * C) / 2;
    const rx = (COLS * C) / 2 + 26, ry = (ROWS * C) / 2 + 22;
    const t = Math.min(rx / Math.max(1e-6, Math.abs(Math.cos(a))), ry / Math.max(1e-6, Math.abs(Math.sin(a))));
    sun(g, gx + Math.cos(a) * t, gy - Math.sin(a) * t, 6, false);
  }
  const shownFrom = fromWord(m.angle + (m.turned ? 180 : 0));
  text(g, m.turned ? `the same picture, turned half a turn: as shown, the light comes from ${shownFrom}` : 'a wall of round bumps and dents, one light, straight on',
    x0, y0 + ROWS * C + 22, { size: 12.5, color: '#aab2c5' });
}

function bumpView(res) {
  return {
    id: 'read.bump', topic: 'read', label: 'bump or dent', inputTitle: 'Light',
    init: { angle: 90, tilt: 55, ka: 0.15, layout: 'mixed', turned: false, truth: false, px: 0.45, py: 0.45, dent: false },
    params: [
      { id: 'angle', label: 'light from', min: 0, max: 360, step: 1, unit: '°', play: true },
      { id: 'tilt', label: 'tilt', min: 5, max: 85, step: 1, unit: '°' },
      { id: 'ka', label: 'ambient', min: 0, max: 0.5, step: 0.01 },
    ],
    presets: [
      { label: 'from above', set: { angle: 90, turned: false } },
      { label: 'from below', set: { angle: 270, turned: false } },
      { label: 'turned', set: { angle: 90, turned: true } },
      { label: 'all bumps', set: { layout: 'all', angle: 90 } },
      { label: 'show the truth', set: { truth: true } },
    ],
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['Bump or dent', 'Shading at a point'],
    setup(ctx) { showOverlay(ctx, { hover: (x, y) => wallHover(ctx, x, y), down: (x, y) => wallHover(ctx, x, y) }); },
    leave(ctx) { hideOverlay(ctx); },
    run(m) {
      const L = P.lightInPicture(m.angle, m.tilt);
      const w = wallImages(m, sizeOf(WALL_SIZES, res));
      const N = P.wallNormal(m.px, m.py, m.dent);
      const inside = P.insideCircle(m.px, m.py);
      const z = inside ? Math.sqrt(Math.max(0, 1 - m.px * m.px - m.py * m.py)) : undefined;
      const br = P.brightness(N, L, m.ka, 1);
      return { L, walls: w, same: w.same.count, total: w.same.total, N, z, s: inside ? (m.dent ? -1 : 1) : undefined, nDotL: br.nDotL, lambert: br.lambert, lit: br.lit, b: br.b, inside };
    },
    draw(v, m, r, ctx) {
      const ov = ctx.sceneEl ? overlayFor(ctx) : null;
      if (!ov) return;
      ov.painter = (g, w, h) => paintWall(ov, g, w, h, m, r);
      ov.repaint();
    },
    explain(m, r) {
      const from = fromWord(m.angle), opposite = fromWord(m.angle + 180);
      const what = r.inside ? (m.dent ? 'dent' : 'bump') : 'wall';
      const rows = [
        `{L|L} = ${vt(r.L)}: from ${from}, ${f(m.tilt, 0)}° off the line of sight`,
        `{bump|bump} {N|N} = (x, y, z); {dent|dent} {N|N} = (−x, −y, z); wall (0, 0, 1)`,
        `at the pointer (${what}, ${f(m.px)}, ${f(m.py)}): {N|N} = ${vt(r.N)}, {nl|N·L} = ${f(r.nDotL, 3)}, {b|brightness} ${f(r.b, 3)}`,
        `a dent lit from ${from} against a bump lit from ${opposite}: ${n0(r.same)} of ${n0(r.total)} pixels differ`,
      ];
      const status = r.same === 0
        ? { text: `A dent lit from ${from} and a bump lit from ${opposite} are the same picture. The eye settles it by assuming light from above${m.turned ? '; turned, the picture swaps which cells look raised' : ''}.`, tone: 'info' }
        : { text: `${n0(r.same)} pixels differ.`, tone: 'bad' };
      return {
        hud: `light from ${m.turned ? fromWord(m.angle + 180) + ' (as shown)' : from} · {dent|dent} from ${from} = {bump|bump} from ${opposite}: ${n0(r.same)} pixels differ`,
        rows, status,
        values: [['L', vt(r.L), 'L'], ['N at the pointer', vt(r.N), 'N'], ['N·L', f(r.nDotL, 3), 'nl'], ['pixels that differ', `${n0(r.same)} of ${n0(r.total)}`]],
        fact: 'Which cells look raised? Turn the picture, or swing the light below, and they swap. Then show the truth.',
      };
    },
    panelTitle: 'Picture',
    panel(host, m, r, ctx) {
      once(host, 'wall', (h) => {
        h.refreshers.push(segmented(h, 'cells', [['mixed', 'bumps and dents'], ['all', 'all bumps']], () => ctx.state().layout, (v) => { ctx.state().layout = v; ctx.update(); }));
        h.refreshers.push(segmented(h, 'picture', [['false', 'upright'], ['true', 'turned 180°']], () => String(ctx.state().turned), (v) => { ctx.state().turned = v === 'true'; ctx.update(); }));
        h.refreshers.push(segmented(h, 'labels', [['false', 'hidden'], ['true', 'bump or dent']], () => String(ctx.state().truth), (v) => { ctx.state().truth = v === 'true'; ctx.update(); }));
        h.refreshers.push(resolutionRow(h, WALL_SIZES, res, () => ctx.update()));
      });
      for (const fn of host.refreshers) fn();
    },
  };
}

/** res: the resolution of the two views' per-pixel pictures, one value for the lab, so switching views keeps it */
export function makeViews(res = { step: RES_DEFAULT }) {
  return [ballView(res), facetView(), bumpView(res)];
}
