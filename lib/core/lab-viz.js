// lab-viz: the drawing kit behind the lab demos (lib/core/lab.js). One Viz is built per update and thrown away: arrows,
// bars, dashed lines, angle arcs, plane patches, circles, boxes, cones and labels, every one tagged with an optional key k.
// setHighlight(key) dims everything whose k differs, which is what hovering a formula term or a line of code does.
// Every method skips an element with a non-finite coordinate: a zero vector's NaN must not reach three.js.
import * as THREE from '../vendor/three.module.js';

const { Vector3 } = THREE;

export const COL = {
  a: 0xff7b72, b: 0x79c0ff, c: 0x7ee787, amber: 0xffa657, purple: 0xd2a8ff, pink: 0xff79c6, cyan: 0x56d4dd,
  gold: 0xffd166, gray: 0x8b93a7, white: 0xe7eaf0, dim: 0x4a5266, red: 0xff5a52, green: 0x3fd97f,
};
const BG = new THREE.Color(0x0b0c10);
const Y_AXIS = new Vector3(0, 1, 0);

export const V = (x = 0, y = 0, z = 0) => new Vector3(x, y, z);
export const add = (a, b) => a.clone().add(b);
export const sub = (a, b) => a.clone().sub(b);
export const mul = (a, k) => a.clone().multiplyScalar(k);
export const mid = (a, b) => add(a, b).multiplyScalar(0.5);
export const unit = (a) => a.clone().normalize();
export const cross = (a, b) => new Vector3().crossVectors(a, b);
export const css = (hex) => `#${hex.toString(16).padStart(6, '0')}`;
const ok = (...ps) => ps.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z));

/** two unit vectors square to n and to each other, chosen the same way every time */
export function tangents(n) {
  const nh = unit(n);
  const helper = Math.abs(nh.y) < 0.9 ? V(0, 1, 0) : V(1, 0, 0);
  const t = unit(cross(helper, nh));
  return [t, cross(nh, t)];
}

function makeLabelSprite(text, color) {
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  const font = 'bold 30px -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
  ctx.font = font;
  const w = Math.ceil(ctx.measureText(text).width) + 18;
  const h = 44;
  cv.width = w;
  cv.height = h;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 7;
  ctx.strokeStyle = 'rgba(11,12,16,0.95)';
  ctx.strokeText(text, w / 2, h / 2 + 1);
  ctx.fillStyle = css(color);
  ctx.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.renderOrder = 20;
  sp.userData.aspect = w / h;
  return sp;
}

export class Viz {
  constructor() {
    this.group = new THREE.Group();
    this.labels = [];
    this.items = [];   // { mat, k, base color, base opacity }
  }

  _track(obj, k) {
    this.group.add(obj);
    const m = obj.material;
    this.items.push({ mat: m, k, color: m.color.clone(), opacity: m.opacity });
    return obj;
  }

  _mesh(geom, color, k, opacity = 1) {
    return this._track(new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity })), k);
  }

  /** dim everything not tagged key; no element with that key, or null: everything at full strength */
  setHighlight(key) {
    const active = key != null && this.items.some((it) => it.k === key);
    for (const it of this.items) {
      const dim = active && it.k !== key;
      it.mat.color.copy(it.color);
      if (dim) it.mat.color.lerp(BG, it.mat.isSpriteMaterial ? 0 : 0.72);
      it.mat.opacity = dim && it.mat.isSpriteMaterial ? 0.28 : it.opacity;
    }
  }

  bar(from, to, color, { k, r = 0.025 } = {}) {
    if (!ok(from, to)) return;
    const d = sub(to, from);
    const L = d.length();
    if (L < 1e-6) return;
    const m = this._mesh(new THREE.CylinderGeometry(r, r, L, 8), color, k);
    m.quaternion.setFromUnitVectors(Y_AXIS, unit(d));
    m.position.copy(mid(from, to));
  }

  arrow(from, to, color, { k, r = 0.03, head = 0.26, hr = 0.085, label, anchor = 'a', labelColor } = {}) {
    if (!ok(from, to)) return;
    const d = sub(to, from);
    const L = d.length();
    if (L < 1e-6) return;
    const dir = unit(d);
    const hl = Math.min(head, L * 0.5);
    const shaftL = L - hl;
    if (shaftL > 1e-6) {
      const s = this._mesh(new THREE.CylinderGeometry(r, r, shaftL, 8), color, k);
      s.quaternion.setFromUnitVectors(Y_AXIS, dir);
      s.position.copy(from).addScaledVector(dir, shaftL / 2);
    }
    const c = this._mesh(new THREE.ConeGeometry(hr, hl, 16), color, k);
    c.quaternion.setFromUnitVectors(Y_AXIS, dir);
    c.position.copy(from).addScaledVector(dir, L - hl / 2);
    if (label) this.label(label, to, labelColor ?? color, anchor, k);
  }

  /** an arrow for the vector vec, drawn starting at from */
  vec(from, vec, color, opts) {
    if (!ok(from, vec)) return;
    this.arrow(from, add(from, vec), color, opts);
  }

  dashed(from, to, color, { k, dash = 0.13, gap = 0.09 } = {}) {
    if (!ok(from, to) || sub(to, from).length() < 1e-6) return;
    const geom = new THREE.BufferGeometry().setFromPoints([from, to]);
    const line = new THREE.Line(geom, new THREE.LineDashedMaterial({ color, dashSize: dash, gapSize: gap }));
    line.computeLineDistances();
    this._track(line, k);
  }

  /** the full line through p along d, far enough to read as infinite */
  line(p, d, color, { k, extent = 14 } = {}) {
    if (!ok(p, d) || d.length() < 1e-6) return;
    const e = unit(d);
    this.dashed(add(p, mul(e, -extent)), add(p, mul(e, extent)), color, { k, dash: 0.16, gap: 0.1 });
  }

  poly(points, color, { k, closed = false } = {}) {
    if (!ok(...points)) return;
    const pts = points.map((p) => p.clone());
    if (closed) pts.push(pts[0].clone());
    this._track(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color })), k);
  }

  point(p, color, { k, r = 0.08, label, anchor = 'a' } = {}) {
    if (!ok(p)) return;
    const m = this._mesh(new THREE.SphereGeometry(r, 16, 12), color, k);
    m.position.copy(p);
    if (label) this.label(label, p, color, anchor, k);
  }

  /** translucent convex polygon: a triangle fan over its points */
  patch(points, color, opacity, { k, order = 0 } = {}) {
    if (points.length < 3 || !ok(...points)) return;
    const verts = [];
    for (let i = 1; i < points.length - 1; i++) {
      for (const p of [points[0], points[i], points[i + 1]]) verts.push(p.x, p.y, p.z);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
    const mesh = this._track(new THREE.Mesh(g, mat), k);
    mesh.renderOrder = order;
  }

  /** a filled polygon in the plane y = 0, concave allowed */
  groundPolygon(points, color, opacity, { k, y = 0.004 } = {}) {
    if (!ok(...points)) return;
    const contour = points.map((p) => new THREE.Vector2(p.x, p.z));
    const faces = THREE.ShapeUtils.triangulateShape(contour, []);
    const verts = [];
    for (const f of faces) for (const i of f) verts.push(points[i].x, y, points[i].z);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
    this._track(new THREE.Mesh(g, mat), k);
  }

  /** a square patch of the plane through q with normal n, with grid lines */
  plane(q, n, half, color, { k, opacity = 0.14, grid = true, outline = true } = {}) {
    if (!ok(q, n) || n.length() < 1e-6) return;
    const [t, b] = tangents(n);
    const corner = (i, j) => add(add(q, mul(t, i * half)), mul(b, j * half));
    const quad = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)];
    this.patch(quad, color, opacity, { k });
    if (outline) this.poly(quad, color, { k, closed: true });
    if (grid) {
      const col = new THREE.Color(color).lerp(BG, 0.55).getHex();
      for (const s of [-0.5, 0, 0.5]) {
        this.poly([corner(s, -1), corner(s, 1)], col, { k });
        this.poly([corner(-1, s), corner(1, s)], col, { k });
      }
    }
  }

  /** the angle from direction e1 to direction e2 at center, as an arc with a light fill */
  arc(center, e1, e2, radius, color, { k, label, fill = 0.16 } = {}) {
    if (!ok(center, e1, e2) || e1.length() < 1e-6 || e2.length() < 1e-6) return;
    const u = unit(e1);
    const c = cross(u, unit(e2));
    const w = c.length() > 1e-5 ? unit(cross(c, u)) : tangents(u)[0];
    const theta = u.angleTo(e2);
    const pts = [];
    const steps = Math.max(4, Math.ceil(theta / 0.08));
    for (let i = 0; i <= steps; i++) {
      const s = (i / steps) * theta;
      pts.push(add(center, add(mul(u, radius * Math.cos(s)), mul(w, radius * Math.sin(s)))));
    }
    this.poly(pts, color, { k });
    if (fill > 0 && theta > 0.01) this.patch([center, ...pts], color, fill, { k });
    if (label && theta > 0.01) {
      const s = theta / 2;
      const at = add(center, add(mul(u, 1.25 * radius * Math.cos(s)), mul(w, 1.25 * radius * Math.sin(s))));
      this.label(label, at, color, '', k);
    }
  }

  /** the small square that marks a right angle at p between unit directions e1 and e2 */
  rightAngle(p, e1, e2, s = 0.2, color = COL.white, k) {
    if (!ok(p, e1, e2)) return;
    this.poly([add(p, mul(e1, s)), add(p, mul(add(e1, e2), s)), add(p, mul(e2, s))], color, { k });
  }

  circle(center, n, r, color, { k, steps = 64 } = {}) {
    if (!ok(center, n) || n.length() < 1e-6) return;
    const [t, b] = tangents(n);
    const pts = [];
    for (let i = 0; i < steps; i++) {
      const s = (i / steps) * 2 * Math.PI;
      pts.push(add(center, add(mul(t, r * Math.cos(s)), mul(b, r * Math.sin(s)))));
    }
    this.poly(pts, color, { k, closed: true });
  }

  /** a wire sphere: three great circles */
  sphere(center, r, color, opts) {
    this.circle(center, V(0, 1, 0), r, color, opts);
    this.circle(center, V(1, 0, 0), r, color, opts);
    this.circle(center, V(0, 0, 1), r, color, opts);
  }

  /** the box on three edges from o */
  box(o, a, b, c, color, { k, opacity = 0.1 } = {}) {
    if (!ok(o, a, b, c)) return;
    const P = (i, j, l) => add(add(add(o, mul(a, i)), mul(b, j)), mul(c, l));
    const faces = [
      [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)], [P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)],
      [P(0, 0, 0), P(1, 0, 0), P(1, 0, 1), P(0, 0, 1)], [P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)],
      [P(0, 0, 0), P(0, 1, 0), P(0, 1, 1), P(0, 0, 1)], [P(1, 0, 0), P(1, 1, 0), P(1, 1, 1), P(1, 0, 1)],
    ];
    for (const f of faces) {
      this.patch(f, color, opacity, { k });
      this.poly(f, color, { k, closed: true });
    }
  }

  /** a cone of half angle halfDeg around dir, slant length L, apex at apex */
  cone(apex, dir, halfDeg, L, color, opacity, { k } = {}) {
    if (!ok(apex, dir) || dir.length() < 1e-6) return;
    const half = (halfDeg * Math.PI) / 180;
    const radius = L * Math.sin(half);
    const height = L * Math.cos(half);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
    const mesh = this._track(new THREE.Mesh(new THREE.ConeGeometry(radius, height, 40, 1, true), mat), k);
    const e = unit(dir);
    mesh.quaternion.setFromUnitVectors(Y_AXIS, mul(e, -1));
    mesh.position.copy(apex).addScaledVector(e, height / 2);
    this.circle(add(apex, mul(e, height)), e, radius, color, { k });
  }

  /** anchor: where the text sits relative to p on the screen: a(bove) b(elow) l(eft) r(ight), e.g. 'ar'; '' centers */
  label(text, p, color = COL.white, anchor = 'a', k) {
    if (!ok(p)) return;
    const sp = makeLabelSprite(text, color);
    sp.position.copy(p);
    const cx = anchor.includes('l') ? 1.08 : anchor.includes('r') ? -0.08 : 0.5;
    const cy = anchor.includes('a') ? -0.2 : anchor.includes('b') ? 1.2 : 0.5;
    sp.center.set(cx, cy);
    this.labels.push(sp);
    this._track(sp, k);
  }

  dispose() {
    this.group.traverse((o) => {
      if (!o.isSprite) o.geometry?.dispose();   // all sprites share one geometry
      const m = o.material;
      if (m) {
        m.map?.dispose();
        m.dispose();
      }
    });
  }
}
