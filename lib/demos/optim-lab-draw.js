// optim-lab-draw: the 2D pictures of the optim-lab panels (browser only; called from a view's panel()). A contour map of a loss surface
// that can be clicked, with paths, dots and arrows drawn over it, and a small line plot. Contour lines are drawn at equal steps of
// log(1 + (L - Lmin) / ref), so a bowl and a steep wall both show their rings.
const BAND = 3.2;

function ramp(u) {
  // dark blue at the minimum, through teal, to warm at the top
  const h = (235 - 195 * u) / 360, s = 0.55, l = 0.17 + 0.3 * u;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}

/** a clickable contour map. spec = { key, domain: [x0, x1, y0, y1], lossFn(x, y), floor, href, top } */
export function makeMap(host, onPick, { width = 420 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.className = 'ol-map';
  canvas.style.cssText = 'display:block;width:100%;max-width:330px;margin:0 auto;height:auto;border-radius:4px;cursor:crosshair;touch-action:none;background:#0b0c10';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let spec = null, bg = null, bgKey = '';
  const px = (x) => ((x - spec.domain[0]) / (spec.domain[1] - spec.domain[0])) * canvas.width;
  const py = (y) => ((spec.domain[3] - y) / (spec.domain[3] - spec.domain[2])) * canvas.height;

  function background() {
    const [x0, x1, y0, y1] = spec.domain;
    canvas.width = width;
    canvas.height = Math.round((width * (y1 - y0)) / (x1 - x0));
    const W = canvas.width, H = canvas.height;
    const level = new Float32Array(W * H);
    let top = 0;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const L = spec.lossFn(x0 + ((i + 0.5) / W) * (x1 - x0), y1 - ((j + 0.5) / H) * (y1 - y0));
        const t = Math.log(1 + Math.max(0, L - spec.floor) / spec.href) * BAND;
        level[j * W + i] = Number.isFinite(t) ? t : 0;
        top = Math.max(top, level[j * W + i]);
      }
    }
    const img = ctx.createImageData(W, H);
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const t = level[j * W + i];
        let [r, g, b] = ramp(Math.min(1, t / Math.max(1, top)));
        const edge = (i + 1 < W && Math.floor(level[j * W + i + 1]) !== Math.floor(t)) || (j + 1 < H && Math.floor(level[(j + 1) * W + i]) !== Math.floor(t));
        if (edge) { r = r * 0.45 + 150 * 0.55; g = g * 0.45 + 160 * 0.55; b = b * 0.45 + 175 * 0.55; }
        const o = (j * W + i) * 4;
        img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
      }
    }
    bg = img;
  }

  function locate(e) {
    const b = canvas.getBoundingClientRect();
    const u = (e.clientX - b.left) / b.width, v = (e.clientY - b.top) / b.height;
    return [spec.domain[0] + u * (spec.domain[1] - spec.domain[0]), spec.domain[3] - v * (spec.domain[3] - spec.domain[2])];
  }
  function onDown(e) { if (!spec) return; canvas.setPointerCapture?.(e.pointerId); const [x, y] = locate(e); onPick(x, y); }
  function onMove(e) { if (!spec || !(e.buttons & 1)) return; const [x, y] = locate(e); onPick(x, y); }
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);

  function arrow(a, b, color, w = 2) {
    const x0 = px(a[0]), y0 = py(a[1]), x1 = px(b[0]), y1 = py(b[1]);
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (!(len > 1.5)) return;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const ang = Math.atan2(y1 - y0, x1 - x0), hl = Math.min(10, len * 0.5);
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - hl * Math.cos(ang - 0.4), y1 - hl * Math.sin(ang - 0.4));
    ctx.lineTo(x1 - hl * Math.cos(ang + 0.4), y1 - hl * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fill();
  }

  /** overlays: { type: 'path', xs, ys, to, color } | { type: 'dot', at, color, r } | { type: 'arrow', from, to, color } | { type: 'cross', at, color } */
  function draw(nextSpec, overlays) {
    spec = nextSpec;
    if (bgKey !== spec.key) { background(); bgKey = spec.key; }
    ctx.putImageData(bg, 0, 0);
    for (const o of overlays) {
      if (o.type === 'path') {
        ctx.strokeStyle = o.color; ctx.lineWidth = o.width ?? 1.8; ctx.beginPath();
        let started = false;
        for (let i = 0; i <= Math.min(o.to, o.xs.length - 1); i++) {
          const x = px(o.xs[i]), y = py(o.ys[i]);
          if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = o.color;
        for (let i = 0; i <= Math.min(o.to, o.xs.length - 1); i++) { ctx.beginPath(); ctx.arc(px(o.xs[i]), py(o.ys[i]), 2.2, 0, 7); ctx.fill(); }
      } else if (o.type === 'dot') {
        ctx.fillStyle = o.color; ctx.strokeStyle = '#0b0c10'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px(o.at[0]), py(o.at[1]), o.r ?? 5, 0, 7); ctx.fill(); ctx.stroke();
      } else if (o.type === 'arrow') arrow(o.from, o.to, o.color, o.width);
      else if (o.type === 'cross') {
        const x = px(o.at[0]), y = py(o.at[1]);
        ctx.strokeStyle = o.color; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.stroke();
      }
    }
  }
  return { canvas, draw };
}

/** a small line plot: series = [{ ys, color }], x = step index; marker at column at */
export function linePlot(host, { height = 110, label = '' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 420; canvas.height = height;
  canvas.style.cssText = 'display:block;width:100%;height:auto;margin-top:6px;border-radius:4px;background:#0b0c10';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  function draw(series, { at = null, yMin = null, yMax = null, text = label } = {}) {
    const W = canvas.width, H = canvas.height, L = 34, R = 8, T = 14, B = 14;
    ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H);
    const all = series.flatMap((s) => s.ys.filter(Number.isFinite));
    const lo = yMin ?? Math.min(...all, 0), hi = yMax ?? Math.max(...all, lo + 1e-9);
    const n = Math.max(...series.map((s) => s.ys.length), 2);
    const X = (i) => L + (i / (n - 1)) * (W - L - R), Y = (v) => H - B - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * (H - T - B);
    ctx.strokeStyle = '#2c3140'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, H - B); ctx.lineTo(W - R, H - B); ctx.stroke();
    ctx.fillStyle = '#79829a'; ctx.font = '10px sans-serif';
    ctx.fillText(String(Number(hi.toPrecision(3))), 2, T + 4); ctx.fillText(String(Number(lo.toPrecision(3))), 2, H - B);
    ctx.fillText(text, L + 6, T - 3);
    for (const s of series) {
      ctx.strokeStyle = s.color; ctx.lineWidth = 1.6; ctx.beginPath();
      let on = false;
      s.ys.forEach((v, i) => { if (!Number.isFinite(v)) return; if (!on) { ctx.moveTo(X(i), Y(v)); on = true; } else ctx.lineTo(X(i), Y(v)); });
      ctx.stroke();
    }
    if (at !== null) { ctx.strokeStyle = '#ffd166'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(X(at), T); ctx.lineTo(X(at), H - B); ctx.stroke(); ctx.setLineDash([]); }
  }
  return { canvas, draw };
}

/** the data and the fitted curves: points = { xs, ys }, picked = indices drawn larger, curves = [{ fn, color }] */
export function fitPlot(host, { height = 130, xr = [-1.5, 1.5], yr = [-1.5, 1.5], label = '' } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 420; canvas.height = height;
  canvas.style.cssText = 'display:block;width:100%;height:auto;margin-top:6px;border-radius:4px;background:#0b0c10';
  host.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  function draw(points, picked, curves, { text = label } = {}) {
    const W = canvas.width, H = canvas.height, P = 8, T = 16;
    const X = (x) => P + ((x - xr[0]) / (xr[1] - xr[0])) * (W - 2 * P), Y = (y) => T + ((yr[1] - y) / (yr[1] - yr[0])) * (H - T - P);
    ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#2c3140'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(P, Y(0)); ctx.lineTo(W - P, Y(0)); ctx.stroke();
    ctx.fillStyle = '#79829a'; ctx.font = '10px sans-serif'; ctx.fillText(text, P, 11);
    for (const c of curves) {
      ctx.strokeStyle = c.color; ctx.lineWidth = 1.8; ctx.beginPath();
      for (let i = 0; i <= 120; i++) { const x = xr[0] + (i / 120) * (xr[1] - xr[0]); if (i) ctx.lineTo(X(x), Y(c.fn(x))); else ctx.moveTo(X(x), Y(c.fn(x))); }
      ctx.stroke();
    }
    ctx.fillStyle = '#8b93a7';
    for (let i = 0; i < points.xs.length; i++) { ctx.beginPath(); ctx.arc(X(points.xs[i]), Y(points.ys[i]), 2.4, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#ff7b72'; ctx.lineWidth = 2;
    for (const i of new Set(picked)) { ctx.beginPath(); ctx.arc(X(points.xs[i]), Y(points.ys[i]), 5, 0, 7); ctx.stroke(); }
  }
  return { canvas, draw };
}
