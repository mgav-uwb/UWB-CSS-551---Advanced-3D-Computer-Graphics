// attention-lab-draw: the 2D side of the attention-lab demo. One canvas laid over the lab's scene (the views are plots, grids and
// pictures, not 3D), drawn in a fixed design space of 420 x 500 that is scaled to the pane, so a view reads the same on a slide
// (the scene pane is about 413 x 510 there) and on the full page. Also the rail panel helpers. Nothing here computes attention: every number comes from
// lib/programs/attention-lab/webgl/attentionlab.js.

export const DW = 420;
export const DH = 500;

// ---------------------------------------------------------------- the overlay canvas

const overlays = new WeakMap();

/** the canvas over the scene: a view sets ov.painter(g, w, h) (design coordinates) and handlers that get the mouse in them */
export function overlayFor(ctx) {
  let ov = overlays.get(ctx.sceneEl);
  if (!ov) {
    ov = new Overlay(ctx);
    overlays.set(ctx.sceneEl, ov);
  }
  return ov;
}

class Overlay {
  constructor(ctx) {
    const cv = document.createElement('canvas');
    cv.className = 'al-overlay';
    cv.style.cssText = 'position:absolute;left:0;top:0;z-index:1;display:none;touch-action:none;background:#0b0c10';
    // the deck sizes every canvas in a slide's demo to 600 px tall (lib/core/lib.css, "demo-full"); this one fills its pane
    cv.style.setProperty('width', '100%', 'important');
    cv.style.setProperty('height', '100%', 'important');
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', 'attention picture');
    ctx.sceneEl.appendChild(cv);
    this.cv = cv;
    this.g = cv.getContext('2d');
    this.scale = 1;
    this.ox = 0;
    this.oy = 0;
    this.painter = null;
    this.handlers = null;
    this.hoverKey = null;
    this.visible = false;
    this.top = ctx.stage === 'embed' ? 30 : 44;      // the slide's buttons sit along the top right of the scene, the full page has a legend bar
    this.dragging = false;
    const pos = (e) => {
      const b = cv.getBoundingClientRect();
      return { x: (e.clientX - b.left - this.ox) / this.scale, y: (e.clientY - b.top - this.oy) / this.scale };
    };
    cv.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      this.dragging = true;
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events have no capture */ }
      const p = pos(e);
      this.handlers?.down?.(p.x, p.y, e);
    });
    cv.addEventListener('pointermove', (e) => {
      const p = pos(e);
      if (this.dragging) this.handlers?.move?.(p.x, p.y, e);
      else this.handlers?.hover?.(p.x, p.y, e);
    });
    const end = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      const p = pos(e);
      this.handlers?.up?.(p.x, p.y, e);
    };
    cv.addEventListener('pointerup', end);
    cv.addEventListener('pointercancel', end);
    for (const ev of ['mousedown', 'wheel']) cv.addEventListener(ev, (e) => e.stopPropagation());
    this.resize = new ResizeObserver(() => { this.fit(); this.repaint(); });
    this.resize.observe(ctx.sceneEl);
    // a formula term or a value hovered in the rail names a part of the picture
    ctx.shell.rootEl.addEventListener('mouseover', (e) => {
      const hit = e.target.closest ? e.target.closest('[data-k]') : null;
      const key = hit && !cv.contains(hit) ? hit.dataset.k : null;
      if (key !== this.hoverKey) { this.hoverKey = key; this.repaint(); }
    });
    ctx.shell.rootEl.addEventListener('mouseleave', () => { if (this.hoverKey) { this.hoverKey = null; this.repaint(); } });
  }

  show(on) {
    this.visible = on;
    this.cv.style.display = on ? 'block' : 'none';
    if (on) this.fit();
  }

  fit() {
    const b = this.cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(1, Math.round(b.width));
    this.h = Math.max(1, Math.round(b.height));
    this.cv.width = Math.round(this.w * dpr);
    this.cv.height = Math.round(this.h * dpr);
    this.dpr = dpr;
    this.scale = Math.max(0.3, Math.min(1.7, this.w / DW, (this.h - this.top) / DH));
    this.ox = Math.max(0, (this.w - DW * this.scale) / 2);
    this.oy = this.top;
  }

  repaint() {
    if (!this.visible || !this.painter) return;
    if (this.cv.width < 2) this.fit();
    const g = this.g, k = this.dpr * this.scale;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = '#0b0c10';
    g.fillRect(0, 0, this.w, this.h);
    g.setTransform(k, 0, 0, k, this.dpr * this.ox, this.dpr * this.oy);
    this.painter(g, DW, DH);
  }

  /** 1 when nothing is hovered or key is, else a dimmed 0.28 */
  dim(...keys) {
    return !this.hoverKey || keys.includes(this.hoverKey) ? 1 : 0.28;
  }
}

export function showOverlay(ctx, handlers) {
  if (!ctx.sceneEl) return;
  const ov = overlayFor(ctx);
  ov.handlers = handlers;
  ov.show(true);
  const row = ctx.sceneEl.querySelector('.lab-views');
  if (row) row.style.display = 'none';
  // the slide's "Click to explore" gate guards the orbit camera, which these views do not use; it would cover the picture
  const gate = ctx.sceneEl.querySelector('.demo-shell-explore');
  if (gate) gate.style.display = 'none';
}

export function hideOverlay(ctx) {
  if (!ctx.sceneEl) return;
  const ov = overlayFor(ctx);
  ov.show(false);
  ov.handlers = null;
  ov.painter = null;
  const row = ctx.sceneEl.querySelector('.lab-views');
  if (row) row.style.display = '';
  const gate = ctx.sceneEl.querySelector('.demo-shell-explore');
  if (gate) gate.style.display = '';
}

// ---------------------------------------------------------------- colors and numbers

export const TOKEN_COLORS = ['#ff7b72', '#79c0ff', '#7ee787', '#d2a8ff', '#ffa657', '#56d4dd', '#ff79c6', '#e3b341'];
export const GOLD = '#ffd166';
export const GRAY = '#8b93a7';

export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
export const rgb01 = (c) => `rgb(${Math.round(c[0] * 255)}, ${Math.round(c[1] * 255)}, ${Math.round(c[2] * 255)})`;

/** a weight in [0, 1] as a color: dark to gold, with a little blue at the dark end */
export function heat(t) {
  const u = Math.max(0, Math.min(1, t));
  return `rgb(${Math.round(24 + 231 * u)}, ${Math.round(30 + 172 * u)}, ${Math.round(48 + 52 * u - 46 * u * u)})`;
}
export const heatText = (t) => (t > 0.5 ? '#14110a' : '#d6dbe5');

export const f = (x, d = 2) => (Number.isFinite(x) ? (Number(x.toFixed(d)) === 0 ? (0).toFixed(d) : x.toFixed(d)).replace('-', '−') : 'none');
export const vt = (a, d = 2) => `(${a.map((x) => f(x, d)).join(', ')})`;
export const n0 = (k) => Math.round(k).toLocaleString('en-US');
export function bytesText(b) {
  const units = ['bytes', 'KiB', 'MiB', 'GiB', 'TiB'];
  let i = 0, x = b;
  while (x >= 1024 && i < units.length - 1) { x /= 1024; i++; }
  return i === 0 ? `${n0(x)} bytes` : `${Number(x.toPrecision(3)).toLocaleString('en-US')} ${units[i]}`;
}

// ---------------------------------------------------------------- 2D drawing helpers

export function text(g, str, x, y, { size = 12.5, color = '#c7cdda', align = 'left', weight = 500, base = 'alphabetic', halo = true, alpha = 1 } = {}) {
  g.save();
  g.globalAlpha = alpha;
  g.font = `${weight} ${size}px -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
  g.textAlign = align;
  g.textBaseline = base;
  if (halo) {
    g.lineWidth = 3;
    g.lineJoin = 'round';
    g.strokeStyle = 'rgba(11, 12, 16, 0.85)';
    g.strokeText(str, x, y);
  }
  g.fillStyle = color;
  g.fillText(str, x, y);
  g.restore();
}

export function arrow2d(g, x0, y0, x1, y1, color, width = 2, head = 8, alpha = 1) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  if (!(len > 1)) return;
  const a = Math.atan2(y1 - y0, x1 - x0), h = Math.min(head, len * 0.6);
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1 - Math.cos(a) * h * 0.6, y1 - Math.sin(a) * h * 0.6);
  g.stroke();
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x1 - Math.cos(a - 0.4) * h, y1 - Math.sin(a - 0.4) * h);
  g.lineTo(x1 - Math.cos(a + 0.4) * h, y1 - Math.sin(a + 0.4) * h);
  g.closePath();
  g.fill();
  g.restore();
}

export function dot(g, x, y, r, fill, { stroke = '#0b0c10', width = 1.5, alpha = 1, ring = false } = {}) {
  g.save();
  g.globalAlpha = alpha;
  g.beginPath();
  g.arc(x, y, r, 0, 2 * Math.PI);
  if (ring) { g.strokeStyle = fill; g.lineWidth = 2; g.stroke(); } else { g.fillStyle = fill; g.fill(); g.strokeStyle = stroke; g.lineWidth = width; g.stroke(); }
  g.restore();
}

export function line(g, x0, y0, x1, y1, color, width = 1, alpha = 1, dash = null) {
  g.save();
  g.globalAlpha = alpha;
  g.strokeStyle = color;
  g.lineWidth = width;
  if (dash) g.setLineDash(dash);
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1, y1);
  g.stroke();
  g.restore();
}

/** the maps between a plane's world coordinates (-range..range on both axes, y up) and the design space, for a plane r = { x, y, w, h } */
export function planeMaps(r, range) {
  const X = (wx) => r.x + ((wx + range) / (2 * range)) * r.w;
  const Y = (wy) => r.y + r.h - ((wy + range) / (2 * range)) * r.h;
  const unX = (px) => ((px - r.x) / r.w) * 2 * range - range;
  const unY = (py) => ((r.y + r.h - py) / r.h) * 2 * range - range;
  return { X, Y, unX, unY, r, range };
}

/** draws the plane (grid, axes, tick labels, title) and returns its maps */
export function drawPlane(g, r, range, title) {
  const maps = planeMaps(r, range);
  const { X, Y } = maps;
  g.fillStyle = '#10131a';
  g.fillRect(r.x, r.y, r.w, r.h);
  const step = range <= 1.5 ? 0.5 : range <= 3.2 ? 1 : range <= 6.5 ? 2 : 5;
  g.lineWidth = 1;
  for (let v = -Math.floor(range / step) * step; v <= range + 1e-9; v += step) {
    const major = Math.abs(v) < 1e-9;
    g.strokeStyle = major ? '#3a4152' : '#1c212c';
    g.beginPath(); g.moveTo(X(v), r.y); g.lineTo(X(v), r.y + r.h); g.stroke();
    g.beginPath(); g.moveTo(r.x, Y(v)); g.lineTo(r.x + r.w, Y(v)); g.stroke();
    if (!major && Math.abs(v) < range - 1e-9) {
      text(g, String(Number(v.toFixed(1))).replace('-', '−'), X(v), r.y + r.h - 3, { size: 12, color: '#5c667c', align: 'center', halo: false });
      text(g, String(Number(v.toFixed(1))).replace('-', '−'), r.x + 3, Y(v) - 2, { size: 12, color: '#5c667c', halo: false });
    }
  }
  g.strokeStyle = '#262a35';
  g.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
  if (title) text(g, title, r.x, r.y - 7, { size: 13, color: '#aab2c5', weight: 600, halo: false });
  return maps;
}

export function clipTo(g, r) {
  g.save();
  g.beginPath();
  g.rect(r.x, r.y, r.w, r.h);
  g.clip();
}

// ---------------------------------------------------------------- rail panel helpers

export function el(tag, cls, parent, content) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (content !== undefined) e.textContent = content;
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
  const row = el('div', 'lab-btns al-seg', parent);
  el('span', 'al-seglabel', row, label);
  const bs = options.map(([value, text_]) => {
    const b = btn(row, text_, () => set(value));
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
  host.refreshers = [];
  build(host);
  return true;
}

const CSS = `
.al-seg { align-items: center; }
.al-seglabel { font: 500 11px/1 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; margin-right: 3px; min-width: 70px; }
`;
export function injectCss() {
  if (document.getElementById('attention-lab-css')) return;
  const st = document.createElement('style');
  st.id = 'attention-lab-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}
