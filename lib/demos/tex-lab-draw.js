// tex-lab-draw: the 2D side of the tex-lab demo. A canvas laid over the lab's scene (the pictures here are images, not 3D), the
// rail panel helpers, the texture catalog, the level colors, and the floor image rendered in chunks by the program's own sampler.
// The lab runtime (lib/core/lab.js) has no notion of an image, so this file stays inside tex-lab; nothing here computes a texture
// value: every number comes from lib/programs/tex-lab/webgl/texlab.js.
import * as T from '../programs/tex-lab/webgl/texlab.js';

// ---------------------------------------------------------------- textures

const CATALOG = [
  { id: 'worked', label: '4×4 of the lecture', n: 4, make: () => T.workedTexture() },
  { id: 'checker8', label: '8×8 checker', n: 8, make: () => T.makeChecker(8, 1, 0.18, 0.92) },
  { id: 'check4', label: '64×64, 4-texel checks', n: 64, make: () => T.makeChecker(64, 4, 0.12, 0.9) },
  { id: 'check1', label: '64×64, 1-texel checks', n: 64, make: () => T.makeChecker(64, 1, 0.18, 0.92) },
  { id: 'noise', label: '64×64 noise', n: 64, make: () => T.makeNoise(64, 20261105) },
  { id: 'check256', label: '256×256, 16-texel checks', n: 256, make: () => T.makeChecker(256, 16, 0.12, 0.9) },
];
const built = new Map();

/** a texture with its mipmap, built once: { id, label, n, base, pyramid, levels, texels, ratio } */
export function getTexture(id) {
  if (!built.has(id)) {
    const spec = CATALOG.find((c) => c.id === id) ?? CATALOG[2];
    const base = spec.make();
    const m = T.buildMipmap(base, spec.n);
    built.set(id, { id: spec.id, label: spec.label, n: spec.n, base, ...m });
  }
  return built.get(id);
}
export const textureLabel = (id) => (CATALOG.find((c) => c.id === id) ?? CATALOG[2]).label;
export const textureChoices = (ids) => ids.map((id) => [id, textureLabel(id)]);

// ---------------------------------------------------------------- colors

export const gray = (v) => {
  const g = Math.round(255 * Math.min(1, Math.max(0, v)));
  return `rgb(${g},${g},${g})`;
};
/** one color per mip level; lambda at or below 0 (magnification) shares level 0's */
export const LEVEL_RGB = [[70, 130, 230], [60, 190, 190], [90, 200, 110], [210, 200, 70], [240, 150, 60], [235, 90, 80], [200, 90, 200], [170, 150, 240], [230, 230, 235]];
export function levelRgb(lambda, levels) {
  const top = Math.min(levels - 1, LEVEL_RGB.length - 1);
  const x = Math.min(Math.max(lambda, 0), top);
  const lo = Math.floor(x), hi = Math.min(lo + 1, top), k = x - lo;
  return LEVEL_RGB[lo].map((c, i) => c + k * (LEVEL_RGB[hi][i] - c));
}
export const rgbText = (c) => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;
export const SKY = [20, 26, 40];

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
    this.ctx = ctx;
    const cv = document.createElement('canvas');
    cv.className = 'tl-overlay';
    cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;z-index:1;display:none;touch-action:none;cursor:crosshair;background:#0b0c10';
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
    this.buffer = document.createElement('canvas');
    this.jobId = 0;
    this.job = null;
    this.rect = null;
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
    const end = (e) => {
      if (!this.dragging) return;
      this.dragging = false;
      this.handlers?.up?.(e);
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
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  repaint() {
    if (!this.visible || !this.painter) return;
    if (this.cv.width < 2) this.fit();
    this.g.clearRect(0, 0, this.w, this.h);
    this.g.fillStyle = '#0b0c10';
    this.g.fillRect(0, 0, this.w, this.h);
    this.painter(this.g, this.w, this.h);
  }

  /** 1 when nothing is hovered or key is, else a dimmed 0.28 */
  dim(...keys) {
    return !this.hoverKey || keys.includes(this.hoverKey) ? 1 : 0.28;
  }

  cancelJob() {
    this.jobId++;
    this.job = null;
  }
}

// ---------------------------------------------------------------- 2D drawing helpers

export function text(g, str, x, y, { size = 12, color = '#c7cdda', align = 'left', weight = 500, base = 'alphabetic', halo = true } = {}) {
  g.font = `${weight} ${size}px -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
  g.textAlign = align;
  g.textBaseline = base;
  if (halo) {
    g.lineJoin = 'round';
    g.lineWidth = 3.5;
    g.strokeStyle = 'rgba(11,12,16,0.9)';
    g.strokeText(str, x, y);
  }
  g.fillStyle = color;
  g.fillText(str, x, y);
}

export function arrow2d(g, x0, y0, x1, y1, color, width = 2, head = 8) {
  const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len, uy = dy / len;
  g.strokeStyle = color;
  g.fillStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.moveTo(x0, y0);
  g.lineTo(x1 - ux * head * 0.6, y1 - uy * head * 0.6);
  g.stroke();
  g.beginPath();
  g.moveTo(x1, y1);
  g.lineTo(x1 - ux * head - uy * head * 0.5, y1 - uy * head + ux * head * 0.5);
  g.lineTo(x1 - ux * head + uy * head * 0.5, y1 - uy * head - ux * head * 0.5);
  g.closePath();
  g.fill();
}

/** the largest rectangle of the given aspect that fits in the box, centered */
export function fitRect(boxX, boxY, boxW, boxH, aspect) {
  let w = boxW, h = boxW / aspect;
  if (h > boxH) { h = boxH; w = boxH * aspect; }
  return { x: boxX + (boxW - w) / 2, y: boxY + (boxH - h) / 2, w, h };
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
  const row = el('div', 'lab-btns tl-seg', parent);
  el('span', 'tl-seglabel', row, label);
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

export function panelCanvas(parent, w, h) {
  const cv = el('canvas', 'tl-panel-canvas', parent);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.width = '100%';
  cv.style.aspectRatio = `${w} / ${h}`;
  cv.style.display = 'block';
  cv.style.background = '#0b0c10';
  cv.style.border = '1px solid #1f2330';
  cv.style.borderRadius = '4px';
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { cv, g, w, h };
}

// ---------------------------------------------------------------- the floor image, rendered in chunks

// the floor image's default size, and the sizes a user can choose (the aspect stays 4:3)
export const FLOOR_W = 200;
export const FLOOR_H = 150;
export const FLOOR_SIZES = [[100, 75], [200, 150], [300, 225], [400, 300]];

/** what the floor image depends on; a change starts a new render */
export const floorKey = (m, split = '', width = FLOOR_W, height = FLOOR_H) => [m.texId, m.tilt, m.tiles, m.mode, m.filter, m.show, m.taps, split, `${width}x${height}`].join('|');

/**
 * Render the floor one pixel at a time with T.shadeFloor, a few rows per turn, into ov.buffer. A newer render, or ov.cancelJob(),
 * stops this one. onProgress(done) runs after each chunk. split: 'aniso' draws the left half trilinear and the right half anisotropic.
 * width and height are the image's size in pixels.
 */
export function renderFloor(ov, m, { split = null, onProgress, width = FLOOR_W, height = FLOOR_H } = {}) {
  const key = floorKey(m, split ?? '', width, height);
  if (ov.job && ov.job.key === key) return ov.job;
  const id = ++ov.jobId;
  const tex = getTexture(m.texId);
  ov.buffer.width = width;
  ov.buffer.height = height;
  const bg = ov.buffer.getContext('2d', { willReadFrequently: true });
  const img = bg.createImageData(width, height);
  for (let i = 0; i < img.data.length; i += 4) { img.data[i] = SKY[0]; img.data[i + 1] = SKY[1]; img.data[i + 2] = SKY[2]; img.data[i + 3] = 255; }
  const job = { key, row: 0, done: false, id, longest: 0, width, height, started: performance.now(), ms: 0, lambdas: new Float32Array(width * height) };
  ov.job = job;
  function chunk() {
    if (ov.jobId !== id) return;
    const t0 = performance.now();
    while (job.row < height && performance.now() - t0 < 10) {
      const iy = job.row++;
      for (let ix = 0; ix < width; ix++) {
        const filter = split ? (ix < width / 2 ? 'trilinear' : 'anisotropic') : m.filter;
        const s = T.shadeFloor(tex.pyramid, tex.n, ix, iy, width, height, m.tilt, m.tiles, filter, m.taps, m.mode);
        const at = (iy * width + ix) * 4;
        if (!s.hit) continue;
        job.lambdas[iy * width + ix] = s.lambda;
        let c;
        if (m.show === 'level') {
          const tint = levelRgb(s.lambda, s.levels);
          const k = 0.5 + 0.5 * s.value;
          c = [tint[0] * k, tint[1] * k, tint[2] * k];
        } else {
          const g = 255 * Math.min(1, Math.max(0, s.value));
          c = [g, g, g];
        }
        img.data[at] = c[0]; img.data[at + 1] = c[1]; img.data[at + 2] = c[2];
      }
    }
    bg.putImageData(img, 0, 0);
    if (job.row >= height) { job.done = true; job.ms = performance.now() - job.started; }
    onProgress?.(job.row / height);
    job.longest = Math.max(job.longest, performance.now() - t0);
    if (!job.done) setTimeout(chunk, 0);
  }
  chunk();
  return job;
}

/** paint the rendered floor (width x height pixels) into the box, with the selected pixel marked; returns the rectangle the image occupies */
export function paintFloor(ov, g, w, h, m, { mark = true, top = ov.top, bottom = 8, split = null, width = FLOOR_W, height = FLOOR_H } = {}) {
  const r = fitRect(8, top, w - 16, h - top - bottom, width / height);
  ov.rect = r;
  g.imageSmoothingEnabled = false;
  g.drawImage(ov.buffer, r.x, r.y, r.w, r.h);
  g.strokeStyle = '#2c3140';
  g.lineWidth = 1;
  g.strokeRect(r.x - 0.5, r.y - 0.5, r.w + 1, r.h + 1);
  const cell = r.w / width;
  if (split) {
    g.strokeStyle = 'rgba(255,209,102,0.9)';
    g.setLineDash([5, 4]);
    g.beginPath();
    g.moveTo(r.x + r.w / 2, r.y);
    g.lineTo(r.x + r.w / 2, r.y + r.h);
    g.stroke();
    g.setLineDash([]);
  }
  if (mark && m.px >= 0) {
    const x = r.x + m.px * cell, y = r.y + m.py * cell;
    g.strokeStyle = '#0b0c10';
    g.lineWidth = 4;
    g.strokeRect(x - 3, y - 3, cell + 6, cell + 6);
    g.strokeStyle = '#ffd166';
    g.lineWidth = 2;
    g.strokeRect(x - 3, y - 3, cell + 6, cell + 6);
  }
  return r;
}

/** the pixel of a width x height image under a canvas position, or null outside the image */
export function pixelAt(ov, x, y, width = FLOOR_W, height = FLOOR_H) {
  const r = ov.rect;
  if (!r || x < r.x || y < r.y || x >= r.x + r.w || y >= r.y + r.h) return null;
  return { ix: Math.min(width - 1, Math.floor(((x - r.x) / r.w) * width)), iy: Math.min(height - 1, Math.floor(((y - r.y) / r.h) * height)) };
}

/** the level legend: a strip of the colors, labelled, right-aligned under the image */
export function paintLevelLegend(g, right, y, levels) {
  const n = Math.min(levels, LEVEL_RGB.length);
  const cw = 40;
  const x = right - n * cw;
  for (let k = 0; k < n; k++) {
    g.fillStyle = rgbText(levelRgb(k, levels));
    g.fillRect(x + k * cw, y, cw - 2, 12);
    text(g, String(k), x + k * cw + (cw - 2) / 2, y + 26, { size: 11, align: 'center', color: '#aab2c5' });
  }
  text(g, 'level read', x - 8, y + 11, { size: 11.5, align: 'right', color: '#aab2c5' });
}
