// digit-view: the shared canvas view of the two digit demos (diffusion-
// digits = exact denoiser, diffusion-net = trained network): a 4x3 grid of
// 20x20 samples, a selection box, and a panel showing the selected sample
// beside its nearest training digit with the verdict "memorized / novel".
export const W = 20, H = 20, D = 400, M = 12;
export const NOVEL_THRESHOLD = 0.06;

export function makeDigitView(canvas, ctx) {
  function drawDigit(vec, x, y, size) {
    const img = ctx.createImageData(W, H);
    for (let i = 0; i < D; i++) { const v = Math.max(0, Math.min(255, Math.round(((vec[i] + 1) / 2) * 255))); img.data[4 * i] = v; img.data[4 * i + 1] = v; img.data[4 * i + 2] = v; img.data[4 * i + 3] = 255; }
    const off = document.createElement('canvas'); off.width = W; off.height = H; off.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(off, x, y, size, size);
  }
  function layout() {
    const Wc = canvas.width, Hc = canvas.height;
    const tile = Math.floor(Math.min((Wc * 0.62) / 4, Hc / 3) - 10);
    return { tile, gx: 14, gy: Math.floor((Hc - 3 * (tile + 10)) / 2) + 5, px: Math.floor(Wc * 0.66), Wc, Hc };
  }
  // draw({ shown, selected, nearest: { vec, label, dist } | null, loadingText }) -> void
  function draw({ shown, selected, nearest, loadingText }) {
    const { tile, gx, gy, px, Wc } = layout();
    ctx.fillStyle = '#171b26'; ctx.fillRect(0, 0, Wc, canvas.height);
    if (!shown) { ctx.fillStyle = '#8b93a7'; ctx.font = '16px system-ui, sans-serif'; ctx.fillText(loadingText ?? 'loading…', 20, 30); return; }
    for (let s = 0; s < M; s++) {
      const x = gx + (s % 4) * (tile + 10), y = gy + Math.floor(s / 4) * (tile + 10);
      drawDigit(shown[s], x, y, tile);
      if (s === selected) { ctx.strokeStyle = '#00b46e'; ctx.lineWidth = 3; ctx.strokeRect(x - 2, y - 2, tile + 4, tile + 4); }
    }
    const psize = Math.floor(Math.min((Wc - px - 14) / 2 - 8, tile * 1.1));
    ctx.fillStyle = '#c9cfdd'; ctx.font = `${Math.max(11, Math.round(psize * 0.13))}px system-ui, sans-serif`;
    ctx.fillText('sample', px, gy + 16); ctx.fillText('nearest training digit', px + psize + 16, gy + 16);
    drawDigit(shown[selected], px, gy + 24, psize);
    if (loadingText) { ctx.fillStyle = '#8b93a7'; ctx.fillText(loadingText, px, gy + 24 + psize + 44); }
    if (nearest) {
      drawDigit(nearest.vec, px + psize + 16, gy + 24, psize);
      ctx.fillStyle = '#8b93a7'; ctx.fillText(`label ${nearest.label}`, px + psize + 16, gy + 24 + psize + 18);
      const memorized = nearest.dist < NOVEL_THRESHOLD;
      ctx.fillStyle = memorized ? '#ffb400' : '#00b46e';
      ctx.font = `${Math.max(12, Math.round(psize * 0.15))}px system-ui, sans-serif`;
      ctx.fillText(memorized ? 'a training digit (memorized)' : 'not in the training set', px, gy + 24 + psize + 44);
    }
  }
  function hitTest(ev) {
    const rect = canvas.getBoundingClientRect();
    const x = ((ev.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((ev.clientY - rect.top) / rect.height) * canvas.height;
    const { tile, gx, gy } = layout();
    const c = Math.floor((x - gx) / (tile + 10)), r = Math.floor((y - gy) / (tile + 10));
    return c >= 0 && c < 4 && r >= 0 && r < 3 ? r * 4 + c : -1;
  }
  return { draw, hitTest };
}

// Seeded pure-noise samples, for the canvas before any data has loaded.
export function noiseSamples(makeRng, randn, seed) {
  const rng = makeRng(seed); const out = [];
  for (let s = 0; s < M; s++) { const v = new Float32Array(D); for (let j = 0; j < D; j++) v[j] = randn(rng); out.push(v); }
  return out;
}

// Shared canvas sizing (the raster.js idiom).
export function wireSizing(canvas, sceneEl, stage, redraw) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (stage === 'full' && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => { const w = sceneEl.clientWidth, h = sceneEl.clientHeight; if (w < 2 || h < 2) return; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); redraw(); }).observe(sceneEl);
  }
  if (stage !== 'full' && typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => { for (const e of entries) { if (!e.isIntersecting) continue; const r = canvas.getBoundingClientRect(); if (r.width < 2) continue; canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); redraw(); } }).observe(canvas);
  }
}

export async function loadMnistSubset(makeDataset) {
  const man = await (await fetch(new URL('../assets/mnist/manifest.json', import.meta.url))).json();
  const [bytes, labels] = await Promise.all([
    fetch(new URL(`../assets/mnist/mnist-${man.n}-${man.w}x${man.h}.bin`, import.meta.url)).then((r) => r.arrayBuffer()),
    fetch(new URL(`../assets/mnist/mnist-${man.n}-labels.bin`, import.meta.url)).then((r) => r.arrayBuffer()),
  ]);
  return makeDataset(new Uint8Array(bytes), new Uint8Array(labels), man.w * man.h);
}
