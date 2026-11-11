// shading-lab-draw: the 2D side of the shading-lab demo. A canvas laid over the lab's scene for the views whose pictures are
// images (the disk and the sphere, the wall of bumps), the rail panel helpers, and the code-to-image copy. Nothing here
// computes a shade: every pixel comes from lib/programs/shading-lab/webgl/shading.js.

// ---------------------------------------------------------------- the overlay canvas

const overlays = new WeakMap();

/** the canvas over the scene: pictures paint into it through ov.painter(g, w, h); handlers get the mouse in canvas pixels */
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
    cv.className = 'sl-overlay';
    cv.style.cssText = 'position:absolute;left:0;top:0;z-index:1;display:none;touch-action:none;cursor:crosshair;background:#0b0c10';
    // the deck sizes every canvas in a slide's demo to 600 px tall (lib/core/lib.css, "demo-full"); this one fills its pane
    cv.style.setProperty('width', '100%', 'important');
    cv.style.setProperty('height', '100%', 'important');
    cv.setAttribute('role', 'img');
    ctx.sceneEl.appendChild(cv);
    this.cv = cv;
    this.g = cv.getContext('2d');
    this.w = 0;
    this.h = 0;
    this.painter = null;
    this.handlers = null;
    this.hoverKey = null;
    this.visible = false;
    this.top = ctx.stage === 'embed' ? 6 : 44;       // the full page has a legend bar along the top of the scene
    this.dragging = false;
    const pos = (e) => {
      const b = cv.getBoundingClientRect();
      return { x: e.clientX - b.left, y: e.clientY - b.top };
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
    const end = () => { this.dragging = false; };
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
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  repaint() {
    if (!this.visible || !this.painter) return;
    if (this.cv.width < 2) this.fit();
    this.g.setTransform(Math.min(window.devicePixelRatio || 1, 2), 0, 0, Math.min(window.devicePixelRatio || 1, 2), 0, 0);
    this.g.fillStyle = '#0b0c10';
    this.g.fillRect(0, 0, this.w, this.h);
    this.painter(this.g, this.w, this.h);
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
}

export function hideOverlay(ctx) {
  if (!ctx.sceneEl) return;
  const ov = overlayFor(ctx);
  ov.show(false);
  ov.handlers = null;
  ov.painter = null;
  const row = ctx.sceneEl.querySelector('.lab-views');
  if (row) row.style.display = '';
}

// ---------------------------------------------------------------- images

/** an n by n canvas holding a picture of three codes per pixel, as the program returns it */
export function codesToCanvas(codes, n) {
  const cv = document.createElement('canvas');
  cv.width = n;
  cv.height = n;
  const g = cv.getContext('2d');
  const img = g.createImageData(n, n);
  for (let i = 0; i < n * n; i++) {
    img.data[4 * i] = codes[3 * i];
    img.data[4 * i + 1] = codes[3 * i + 1];
    img.data[4 * i + 2] = codes[3 * i + 2];
    img.data[4 * i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return cv;
}

// ---------------------------------------------------------------- 2D drawing helpers

export function text(g, str, x, y, { size = 12, color = '#c7cdda', align = 'left', weight = 500, base = 'alphabetic', halo = true } = {}) {
  g.font = `${weight} ${size}px -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
  g.textAlign = align;
  g.textBaseline = base;
  if (halo) {
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(11, 12, 16, 0.85)';
    g.strokeText(str, x, y);
  }
  g.fillStyle = color;
  g.fillText(str, x, y);
}

export function arrow2d(g, x0, y0, x1, y1, color, width = 2, head = 8) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1 - Math.cos(a) * head * 0.6, y1 - Math.sin(a) * head * 0.6);
  g.stroke();
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x1 - Math.cos(a - 0.4) * head, y1 - Math.sin(a - 0.4) * head);
  g.lineTo(x1 - Math.cos(a + 0.4) * head, y1 - Math.sin(a + 0.4) * head);
  g.closePath();
  g.fill();
}

/** a small sun: a disk with rays; behind, it is drawn hollow and dashed */
export function sun(g, x, y, r, behind) {
  g.save();
  g.strokeStyle = '#ffd166';
  g.fillStyle = '#ffd166';
  g.lineWidth = 2;
  if (behind) g.setLineDash([3, 3]);
  g.beginPath();
  g.arc(x, y, r, 0, 2 * Math.PI);
  if (behind) g.stroke(); else g.fill();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    g.beginPath();
    g.moveTo(x + Math.cos(a) * r * 1.5, y + Math.sin(a) * r * 1.5);
    g.lineTo(x + Math.cos(a) * r * 2.1, y + Math.sin(a) * r * 2.1);
    g.stroke();
  }
  g.restore();
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
  const row = el('div', 'lab-btns sl-seg', parent);
  el('span', 'sl-seglabel', row, label);
  const bs = options.map(([value, text_]) => {
    const b = btn(row, text_, () => set(value));
    b.dataset.value = value;
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
.sl-seg { align-items: center; }
.sl-seglabel { font: 500 11px/1 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; margin-right: 3px; min-width: 58px; }
`;
export function injectCss() {
  if (document.getElementById('shading-lab-css')) return;
  const st = document.createElement('style');
  st.id = 'shading-lab-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}
