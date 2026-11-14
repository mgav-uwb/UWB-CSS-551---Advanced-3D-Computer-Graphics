// trace-lab-kit: what the trace-lab views share. Names and colors of the surfaces, the box and its objects drawn in the lab's scene,
// the tracing camera with its view volume and its image plane (a textured quad that carries the current render, crisp), the inset
// with the 2D copy of the image (click a pixel), the resolution and image switches, and the tree diagram of ray-lab's Whitted view
// (copied here: ray-lab-whitted.js does not export it). Rays are drawn in batches (one line object per kind), so 256 paths draw fast.
import * as THREE from '../vendor/three.module.js';
import * as T from '../programs/trace-lab/webgl/tracelab.js';
import { COL, V, css } from '../core/lab-viz.js';
import { drawCamera } from './view-lab-kit.js';
import { P, f, css3, el, segmented } from './ray-lab-ui.js';
import { SIZES, pixelOf } from './trace-lab-render.js';

export const NAMES = ['red wall', 'green wall', 'floor', 'ceiling', 'back wall', 'mirror sphere', 'glass sphere', 'white box', 'light'];
export const SHORT = ['red wall', 'green wall', 'floor', 'ceiling', 'back wall', 'mirror', 'glass', 'box', 'light'];
export const HOME = { eye: [3.9, 2.3, 10.4], target: [1.3, -0.1, 2.9] };
export const CLOSE = { eye: [6.0, 3.0, 8.4], target: [1.45, 0.55, 1.35] };
export const KIND_COLOR = { primary: COL.white, reflection: COL.a, refraction: COL.cyan };
const KIND_HEX = { primary: '#e7eaf0', reflection: '#ff7b72', refraction: '#56d4dd' };

export const KEYS = {
  pixel: COL.gold, primary: COL.white, hit: COL.cyan, eye: COL.white, light: COL.gold, plane: COL.gold, sx: COL.a, sy: COL.c, dir: COL.white,
  sum: COL.gold, shadow: COL.gold, blocked: COL.gray, whitted: COL.b, path: COL.pink, mean: COL.gold, se: COL.amber, converged: COL.white,
  red: COL.a, caustic: COL.gold, glass: COL.cyan, nee: COL.green, throughput: COL.c, contribution: COL.gold, fraction: COL.gold, exact: COL.white,
  v1: COL.gold, v2: COL.cyan, v3: COL.pink, v4: COL.green, v5: COL.purple, v6: COL.amber, v7: COL.b, v8: COL.a, v9: COL.c,
};

const vec = (a) => V(a[0], a[1], a[2]);

/** a direction in words for a vertex sequence: "floor, red wall, light" */
export function walkWords(path) {
  return path.vertices.map((v) => SHORT[v.id]).join(', ') + (path.escaped ? ', out the front' : '');
}

// ---------------------------------------------------------------- batched lines

/** many segments as one line object, tagged k for highlighting; pairs is a flat list [a0, b0, a1, b1, ...] of arrays */
export function lines(viz, pairs, color, { k, opacity = 1, dashed = false } = {}) {
  if (pairs.length < 2) return;
  const pos = [];
  for (const p of pairs) {
    if (!Number.isFinite(p[0]) || !Number.isFinite(p[1]) || !Number.isFinite(p[2])) return;
    pos.push(p[0], p[1], p[2]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 0.08, gapSize: 0.06, transparent: opacity < 1, opacity })
    : new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity });
  const obj = new THREE.LineSegments(g, mat);
  if (dashed) obj.computeLineDistances();
  viz._track(obj, k);
}

// ---------------------------------------------------------------- the box and its objects

/** the box and its three objects as a faint model, the light as a gold square (a gold point at size 0) */
export function drawRoom(v, scene) {
  const H = T.HALF;
  const quads = [
    [[-H, -H, -H], [-H, H, -H], [-H, H, H], [-H, -H, H], COL.red, 0.14],
    [[H, -H, -H], [H, H, -H], [H, H, H], [H, -H, H], COL.green, 0.14],
    [[-H, -H, -H], [H, -H, -H], [H, -H, H], [-H, -H, H], COL.gray, 0.1],
    [[-H, H, -H], [H, H, -H], [H, H, H], [-H, H, H], COL.gray, 0.04],
    [[-H, -H, -H], [H, -H, -H], [H, H, -H], [-H, H, -H], COL.gray, 0.08],
  ];
  for (const [a, b, c, d, color, opacity] of quads) {
    v.patch([vec(a), vec(b), vec(c), vec(d)], color, opacity, { k: 'box' });
    v.poly([vec(a), vec(b), vec(c), vec(d)], color, { closed: true, k: 'box' });
  }
  v.sphere(vec(scene.mirror.center), scene.mirror.radius, COL.white, { k: 'mirror' });
  v.sphere(vec(scene.glass.center), scene.glass.radius, COL.cyan, { k: 'glass' });
  const b = scene.box, h = b.half;
  // the box's edges in the world: its local axes turned about y
  const ax = V(b.cos * 2 * h[0], 0, -b.sin * 2 * h[0]), az = V(b.sin * 2 * h[2], 0, b.cos * 2 * h[2]), ay = V(0, 2 * h[1], 0);
  const o = vec(b.center).sub(ax.clone().multiplyScalar(0.5)).sub(ay.clone().multiplyScalar(0.5)).sub(az.clone().multiplyScalar(0.5));
  v.box(o, ax, ay, az, COL.white, { k: 'whitebox', opacity: 0.06 });
  const s = scene.lightSide / 2, y = scene.lightY - 0.004;
  if (s > 0) v.patch([V(scene.lightX - s, y, scene.lightZ - s), V(scene.lightX + s, y, scene.lightZ - s), V(scene.lightX + s, y, scene.lightZ + s), V(scene.lightX - s, y, scene.lightZ + s)], COL.gold, 0.9, { k: 'light' });
  else v.point(V(scene.lightX, scene.lightY, scene.lightZ), COL.gold, { r: 0.05, k: 'light' });
}

// ---------------------------------------------------------------- the tracing camera and its image plane

/** where pixel (px, py)'s corners and center sit on the image plane, in the world */
export function pixelSquare(cam, basis, px, py) {
  const at = (jx, jy) => T.add(cam.eye, T.pixelRay(cam.eye, basis, cam.fovDeg, cam.width, cam.height, px, py, jx, jy).toward);
  return { corners: [at(0, 0), at(1, 0), at(1, 1), at(0, 1)], center: at(0.5, 0.5) };
}

/** the eye, its axes, the view volume as four dashed edges through the image plane's corners, and the plane's outline */
export function drawRig(v, st, basis, { volume = true, axes = false, label = true } = {}) {
  const cam = st.camera;
  drawCamera(v, { eye: cam.eye, look: { ...basis, valid: true } }, { axes, label });
  const corner = (sx, sy) => T.add(cam.eye, T.pixelRay(cam.eye, basis, cam.fovDeg, cam.width, cam.height, sx, sy, 0, 0).toward);
  const quad = [corner(0, 0), corner(cam.width, 0), corner(cam.width, cam.height), corner(0, cam.height)];
  v.poly(quad.map(P), COL.gold, { closed: true, k: 'plane' });
  if (volume) {
    const far = [];
    for (const q of quad) far.push(cam.eye, T.add(cam.eye, T.scale(T.sub(q, cam.eye), 6.6)));
    lines(v, far, COL.dim, { k: 'eye', dashed: true });
  }
  return quad;
}

/** the textured quad of the image plane: one mesh kept across updates (the lab's drawing is rebuilt on each), its texture the
 *  canvas of the image shown, nearest filtering so the pixels stay square */
export function makePlane(world) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.renderOrder = -1;
  world.add(mesh);
  let source = null;
  return {
    mesh,
    /** show a canvas on the plane; call again after the canvas changed */
    show(canvas) {
      if (canvas !== source) {
        mat.map?.dispose();
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.generateMipmaps = false;
        mat.map = tex;
        mat.needsUpdate = true;
        source = canvas;
      } else if (mat.map) mat.map.needsUpdate = true;
    },
    /** one unit in front of the eye, spanning the image: x along u, y along v, facing the eye */
    place(st, basis) {
      const cam = st.camera, tanHalf = Math.tan((cam.fovDeg * Math.PI) / 360), aspect = cam.width / cam.height;
      const m = new THREE.Matrix4().makeBasis(vec(basis.u), vec(basis.v), vec(basis.w));
      mesh.quaternion.setFromRotationMatrix(m);
      mesh.position.copy(vec(T.sub(cam.eye, basis.w)));
      mesh.scale.set(2 * tanHalf * aspect, 2 * tanHalf, 1);
      mesh.visible = true;
    },
    hide() { mesh.visible = false; },
  };
}

/** the pixel under a ray from the lab's camera, if the ray crosses the image plane inside the image */
export function pixelOnPlane(ray, st, basis) {
  const cam = st.camera, w = basis.w;
  const q = T.sub(cam.eye, w);
  const denom = T.dot(ray.dir, w);
  if (Math.abs(denom) < 1e-9) return null;
  const t = T.dot(T.sub(q, ray.origin), w) / denom;
  if (t <= 0) return null;
  const rel = T.sub(T.add(ray.origin, T.scale(ray.dir, t)), q);
  const tanHalf = Math.tan((cam.fovDeg * Math.PI) / 360), aspect = cam.width / cam.height;
  const sx = T.dot(rel, basis.u) / (tanHalf * aspect), sy = T.dot(rel, basis.v) / tanHalf;
  if (Math.abs(sx) > 1 || Math.abs(sy) > 1) return null;
  return [Math.min(cam.width - 1, Math.floor(((sx + 1) / 2) * cam.width)), Math.min(cam.height - 1, Math.floor(((1 - sy) / 2) * cam.height))];
}

// ---------------------------------------------------------------- 2D images: the inset and its copies

/** the pixel under a click on a canvas that shows a width x height image, drawn at the canvas's full box */
export function pixelAt(canvas, e, width, height) {
  const b = canvas.getBoundingClientRect();
  return [Math.max(0, Math.min(width - 1, Math.floor(((e.clientX - b.left) / b.width) * width))), Math.max(0, Math.min(height - 1, Math.floor(((e.clientY - b.top) / b.height) * height)))];
}

/** a canvas that shows an image crisply at its box's width; slide decks size every canvas of a demo, so the size is set here */
export function imageCanvas(parent, cls = '') {
  const c = el('canvas', `tl-img ${cls}`, parent);
  c.style.setProperty('width', '100%', 'important');
  c.style.setProperty('height', 'auto', 'important');
  return c;
}

/** copy a source canvas (the tracer's own) to a shown one, with the picked pixel outlined */
export function paintCopy(target, source, px, py, color = '#ffd166') {
  if (!source) return;
  const S = Math.max(2, Math.round(384 / source.width));
  if (target.width !== source.width * S) { target.width = source.width * S; target.height = source.height * S; }
  const g = target.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(source, 0, 0, target.width, target.height);
  if (px == null) return;
  g.lineWidth = 3;
  g.strokeStyle = '#0b0c10';
  g.strokeRect(px * S - 2, py * S - 2, S + 4, S + 4);
  g.lineWidth = 2;
  g.strokeStyle = color;
  g.strokeRect(px * S - 2, py * S - 2, S + 4, S + 4);
}

/** the resolution row, shared by every view: the lab's header puts it in the topic card */
export function resolutionRow(parent, ctx) {
  return segmented(parent, 'resolution', SIZES.map((w) => [w, `${w} × ${(w * 3) / 4}`, `${w * (w * 3) / 4} pixels; both images are traced again`]),
    () => ctx.state().res, (w) => { ctx.state().res = w; ctx.update(); });
}

/** the inset at the top right of the scene: which image, the image (click a pixel), its caption */
export function mountInset(ctx, { onPick, onSwitch, getShow }) {
  const box = el('div', 'rl-inset tl-inset', ctx.sceneEl);
  for (const ev of ['mousedown', 'wheel', 'touchstart', 'pointerdown']) box.addEventListener(ev, (e) => e.stopPropagation());
  const show = segmented(box, 'image', [['whitted', 'Whitted', 'Whitted\'s tracer: mirror and refraction rays, shadow rays to the light'], ['path', 'path tracer', 'The path tracer: the mean of its samples so far']], getShow, onSwitch);
  const canvas = imageCanvas(box, 'rl-pick');
  canvas.setAttribute('aria-label', 'The rendered image; click a pixel to pick it');
  canvas.addEventListener('click', (e) => onPick(e, canvas));
  const caption = el('p', 'rl-caption', box);
  return { box, canvas, caption, show, remove() { box.remove(); } };
}

// ---------------------------------------------------------------- Whitted's tree, as ray-lab draws it

/** where each node of one pixel's tree sits: leaves evenly across, a parent over the middle of its children */
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

/** the tree of rays of one pixel: a node per ray (filled with its local color), the weight on each edge, a swatch of its share of the
 *  pixel, and under each diffuse node its shadow rays: how many reached the light */
export function treeSvg(rows) {
  const L = treeLayout(rows), XS = 58, YS = 52, PAD = 30;
  let depth = 0;
  rows.forEach((row) => { depth = Math.max(depth, row.level); });
  const X = (id) => PAD + L.x[id] * XS, Y = (id) => 18 + rows[id].level * YS;
  const W = Math.max(220, (L.leaves - 1) * XS + 2 * PAD + 44), H = 18 + depth * YS + 46;
  let edges = '', nodes = '';
  for (const row of rows) {
    if (row.isShadow) continue;
    const n = row.node, id = row.id;
    if (row.parent >= 0) {
      const px = X(row.parent), py = Y(row.parent) + 12, cx = X(id), cy = Y(id) - 11;
      const lx = px + (cx - px) * 0.42, ly = py + (cy - py) * 0.42;
      edges += `<line x1="${px}" y1="${py}" x2="${cx}" y2="${cy}" stroke="${KIND_HEX[row.kind]}" stroke-width="${1 + 3 * Math.sqrt(row.accum)}" stroke-opacity="0.8"/><text x="${lx + (cx >= px ? 5 : -5)}" y="${ly}" text-anchor="${cx >= px ? 'start' : 'end'}" style="fill:${KIND_HEX[row.kind]}">×${f(row.weight, 2)}</text>`;
    }
    let stub = '';
    if (n.direct) {
      const lit = n.direct.lit, all = n.direct.count, hue = lit === 0 ? '#8b93a7' : '#ffd166';
      stub = `<line x1="${X(id) - 6}" y1="${Y(id) + 8}" x2="${X(id) - 19}" y2="${Y(id) + 21}" stroke="${hue}" stroke-dasharray="2 2"/><rect x="${X(id) - 23}" y="${Y(id) + 21}" width="8" height="8" fill="${hue}"><title>${lit} of ${all} shadow rays reach the light</title></rect><text x="${X(id) - 12}" y="${Y(id) + 37}" text-anchor="middle" style="fill:${hue}">${lit}/${all}</text>`;
    }
    const where = n.material === 'none' ? 'leaves the box' : NAMES[n.id];
    nodes += `<g class="rl-node" data-id="${id}"><title>#${id} ${row.kind}: ${where}</title>
      <circle cx="${X(id)}" cy="${Y(id)}" r="10" fill="${css3(row.local.map((c) => Math.min(1, c * 1.5)))}" stroke="${KIND_HEX[row.kind]}" stroke-width="2.5"${n.truncated ? ' stroke-dasharray="3 2"' : ''}/>
      <text x="${X(id) + 14}" y="${Y(id) - 1}" style="fill:#c7cdda">#${id} ${SHORT[n.id] ?? 'out'}</text>${stub}
      <rect x="${X(id) + 14}" y="${Y(id) + 3}" width="9" height="9" fill="${css3(row.contribution.map((c) => Math.min(1, c * 1.5)))}" stroke="#444b5c"/>
      <text x="${X(id) + 26}" y="${Y(id) + 11}">${f(row.accum, 2)}</text>${n.truncated ? `<text x="${X(id) + 14}" y="${Y(id) + 23}" style="fill:#ffa657">cut</text>` : ''}</g>`;
  }
  return `<svg class="rl-svg rl-tree-svg tl-tree-svg" viewBox="0 0 ${W} ${H}" style="max-width:${Math.max(400, W * 1.1)}px" role="img" aria-label="the tree of rays of the picked pixel">${edges}${nodes}</svg>`;
}

// ---------------------------------------------------------------- a magnified pixel

/** the pixel's square, magnified, with the point where each path starts: color by what the path carried */
export function pixelSvg(samples, colorOf, sel) {
  const S = 150;
  let s = `<svg class="tl-pixsvg" viewBox="-8 -8 ${S + 16} ${S + 16}" role="img" aria-label="where each path starts inside the pixel">`;
  s += `<rect x="0" y="0" width="${S}" height="${S}" fill="#11141b" stroke="#ffd166" stroke-width="1.5"/>`;
  s += `<line x1="${S / 2}" y1="0" x2="${S / 2}" y2="${S}" stroke="#262a35"/><line x1="0" y1="${S / 2}" x2="${S}" y2="${S / 2}" stroke="#262a35"/>`;
  samples.forEach((smp, i) => {
    const on = i === sel;
    s += `<circle class="tl-start" data-path="${i}" cx="${(smp.jx * S).toFixed(1)}" cy="${(smp.jy * S).toFixed(1)}" r="${on ? 5 : samples.length > 64 ? 2.2 : 3.2}" fill="${colorOf(smp)}" stroke="${on ? '#fff' : 'none'}" stroke-width="1.5"><title>path ${i}</title></circle>`;
  });
  return `${s}</svg>`;
}

export { css };
export { pixelOf };
