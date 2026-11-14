// ray-lab-ui: what the ray-lab views (ray-lab-views.js, ray-lab-whitted.js, ray-lab-bvh.js) share: number and vector text, the three.js
// vectors a view draws with, the small DOM helpers for panels (a panel is built once per view and updated after), and the panel CSS.
import { V } from '../core/lab-viz.js';

/** a three.js Vector3 as the arrays the program uses, and back */
export const arr = (v) => [v.x, v.y, v.z];
export const P = (a) => V(a[0], a[1], a[2]);
export const addA = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const mulA = (a, k) => [a[0] * k, a[1] * k, a[2] * k];

/** a direction from a handle: the unit vector, or straight ahead (-z) when the handle sits on its base */
export function unitDir(v, fallback = [0, 0, -1]) {
  const a = arr(v);
  const l = Math.hypot(a[0], a[1], a[2]);
  return l < 1e-6 ? fallback : [a[0] / l, a[1] / l, a[2] / l];
}

/** x with d decimals, a true minus sign, no negative zero; ∞ for the "no hit" parameter */
export function f(x, d = 3) {
  if (x === Infinity) return '∞';
  if (x === -Infinity) return '−∞';
  if (!Number.isFinite(x)) return 'none';
  const s = Number(x.toFixed(d)) === 0 ? (0).toFixed(d) : x.toFixed(d);
  return s.replace('-', '−');
}
/** the shortest decimal for x within d places: 0.5, 1.02, 7 */
export const g = (x, d = 3) => (Number.isFinite(x) ? f(Number(x.toFixed(d)), d).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : f(x));
export const vt = (a, d = 2) => `(${f(a[0], d)}, ${f(a[1], d)}, ${f(a[2], d)})`;
export const vg = (a, d = 3) => `(${g(a[0], d)}, ${g(a[1], d)}, ${g(a[2], d)})`;
/** a small number in scientific form: 6.2e-8 */
export function sci(x) {
  if (x === 0) return '0';
  if (!Number.isFinite(x)) return f(x);
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / Math.pow(10, e);
  return `${f(m, 1)}e${String(e).replace('-', '−')}`;
}
export const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export const commas = (n) => Math.round(n).toLocaleString('en-US');
export const css3 = (c) => `rgb(${c.map((x) => Math.round(255 * Math.pow(Math.min(Math.max(x, 0), 1), 1 / 2.2))).join(',')})`;
/** a swatch of a color the program computed, for a row of formulas */
export const swatch = (c) => `<span style="display:inline-block;width:11px;height:11px;vertical-align:-1px;border:1px solid #444b5c;background:${css3(c)}"></span>`;

// small DOM helpers for the panels (browser only)
export function el(tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}
export function btn(parent, label, onClick, title) {
  const b = el('button', 'lab-btn', parent, label);
  b.type = 'button';
  if (title) b.title = title;
  b.addEventListener('click', (e) => { e.stopPropagation(); b.blur(); onClick(); });
  return b;
}
/** a row of mutually exclusive buttons; returns its show() */
export function segmented(parent, label, options, get, set) {
  const row = el('div', 'lab-btns rl-seg', parent);
  el('span', 'rl-seglabel', row, label);
  const bs = options.map(([value, text, title]) => {
    const b = btn(row, text, () => { set(value); show(); }, title);
    b.dataset.value = String(value);
    return b;
  });
  function show() { bs.forEach((b) => b.classList.toggle('on', b.dataset.value === String(get()))); }
  show();
  return show;
}
/** panels build once per view, and update what changes */
export function once(host, id, build) {
  if (host.dataset.built === id) return false;
  host.innerHTML = '';
  host.dataset.built = id;
  build(host);
  return true;
}

const CSS = `
.rl-seg { align-items: center; }
.rl-seglabel { font: 500 11px/1 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; margin-right: 3px; min-width: 74px; }
.rl-image { position: relative; width: 100%; line-height: 0; }
.rl-image canvas { display: block; width: 100%; height: auto; image-rendering: pixelated; border: 1px solid #2c3140; border-radius: 3px; background: #0b0c10; }
.rl-image canvas.rl-over { position: absolute; left: 0; top: 0; pointer-events: none; border-color: transparent; background: none; }
.rl-image canvas.rl-pick { cursor: crosshair; }
.rl-stage { position: absolute; inset: 0; padding: 46px 8px 56px 8px; box-sizing: border-box; z-index: 2; background: #0b0c10; display: flex; }
.rl-swrap { position: relative; flex: 1 1 auto; min-width: 0; min-height: 0; }
.rl-scanvas { position: absolute; left: 0; top: 0; width: 100%; height: 100%; object-fit: contain; object-position: center; image-rendering: pixelated; cursor: crosshair; }
.rl-scanvas.rl-over { pointer-events: none; cursor: default; }
/* lib.css sizes every canvas of a slide demo to the scene's height; the render is not the scene */
.reveal section.demo-full [data-demo] canvas.rl-scanvas { height: 100% !important; width: 100% !important; }
.demo-shell-root--embed .rl-stage { padding: 8px 8px 76px; }
.rl-tree { margin-top: 2px; }
.rl-inset { position: absolute; top: 46px; right: 8px; width: 320px; z-index: 3; background: rgba(11, 12, 16, 0.82); padding: 6px; border: 1px solid #262a35; border-radius: 6px; }
.rl-inset .rl-key { font-size: 10px; }
.demo-shell-root--embed .rl-inset { top: 40px; width: 150px; padding: 3px; }
.demo-shell-root--embed .rl-inset .rl-caption { display: none; }
.rl-tree-svg { max-height: max(280px, calc(100vh - 495px)); }
.rl-tree-svg .rl-node { cursor: pointer; }
.rl-tree-svg .rl-node.sel circle { stroke-width: 5; filter: drop-shadow(0 0 3px #ffd166); }
.rl-tree-svg .rl-node.sel text { fill: #fff; font-weight: 700; }
.rl-caption { margin: 4px 0 0; font: 11px/1.4 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; font-variant-numeric: tabular-nums; }
.rl-svg { display: block; width: 100%; max-width: 400px; margin: 0 auto; height: auto; }
.rl-svg text { font: 8.6px -apple-system, Segoe UI, Roboto, sans-serif; fill: #aab2c5; }
.rl-step { display: flex; gap: 3px; align-items: center; margin-bottom: 5px; }
.rl-step input[type=range] { flex: 1 1 auto; min-width: 0; margin: 0 4px; height: 14px; }
.rl-step .lab-btn { padding: 2px 7px; }
.rl-step output { font: 11px 'SF Mono', Menlo, monospace; color: #c7cdda; min-width: 62px; text-align: right; }
.rl-key { display: flex; flex-wrap: wrap; gap: 3px 10px; margin-top: 4px; font: 10.5px/1.3 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; }
.rl-key i { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 4px; vertical-align: -1px; }
.rl-key + .lab-btns { margin-top: 8px; }
.demo-shell-root--embed .rl-key { display: none; }
`;
export function injectCss() {
  if (document.getElementById('rl-css')) return;
  const st = document.createElement('style');
  st.id = 'rl-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}
