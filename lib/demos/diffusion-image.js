// diffusion-image: the FORWARD process on a real picture. A 128x128 render of
// the course's Cornell scene is a point in a 49,152-dimensional space (three
// numbers per pixel); drag `t` and the scheduled noise is mixed in exactly as
// lib/core/diffusion.js does for 2D points. Nothing is learned here: this is
// the bookkeeping half of a diffusion model, shown on the thing it is
// actually applied to. The readout gives the schedule's alpha-bar, the SNR in
// dB and the PSNR of the noised image against the original.
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { makeShell } from '../core/demo-shell.js';
import { resolveControlIds } from './registry.js';
import { alphaBar, snrDb, makeRng, randn } from '../core/diffusion.js';

const PARAMS = {
  t: { label: 't', min: 0, max: 1, step: 0.01, value: 0.3, format: (v) => v.toFixed(2) },
};
const SRC = new URL('../assets/images/cornell-128.png', import.meta.url);
const SEED = 3;

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>The forward half of a diffusion model on a real image: the course's
  Cornell scene, 128×128 pixels, three numbers per pixel, one point in a
  49,152-dimensional space. <code>t</code> walks the noise schedule: the image
  is scaled down by √ᾱ(t) and Gaussian noise scaled by √(1−ᾱ(t)) is added.</p>
  <h4>The concept</h4>
  <p>Every training image is walked toward noise along this same schedule.
  At t = 1 nothing of the picture remains and every image looks the same,
  which is what makes pure noise a usable starting point for the reverse
  walk. Nothing is learned in this half; it is arithmetic.</p>
  <h4>Try this</h4>
  <p>Find the t where you can no longer tell it is a room (around 0.7), and
  the t where the SNR crosses 0 dB. The reverse process has to undo exactly
  this, one step at a time.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

export function make(container, { stage = 'embed', controls } = {}) {
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'diffusion-image');
  const model = { t: PARAMS.t.value };
  let orig = null; // Float32Array RGB in [-1,1]
  let W = 128, H = 128;

  const shell = makeShell(container, { stage, help: { html: HELP_HTML }, settings: [], legend: 'drag t — the picture dissolves on schedule', nav: null });
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 540; canvas.style.display = 'block';
  if (stage === 'full') { canvas.style.width = '100%'; canvas.style.height = '100%'; }
  shell.sceneEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const controlsCard = shell.addCard('controller — the schedule');
  for (const id of ids) {
    const s = new SliderRow(controlsCard, { id: `diffusion-image-${id}`, ...PARAMS[id] });
    s.onInput((v) => { model[id] = v; draw(); });
  }
  const readoutCard = shell.addCard('readout — how much is left');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 't', label: 't', format: (v) => v.toFixed(2) },
      { id: 'abar', label: 'ᾱ(t)', format: (v) => v.toFixed(3) },
      { id: 'snr', label: 'SNR', format: (v) => `${v.toFixed(1)} dB` },
      { id: 'psnr', label: 'PSNR', format: (v) => (Number.isFinite(v) ? `${v.toFixed(1)} dB` : '∞') },
      { id: 'dims', label: 'dimensions', format: (v) => v.toLocaleString('en-US') },
    ],
  });

  function noised(t) {
    const a = alphaBar(t); const sa = Math.sqrt(a), sb = Math.sqrt(1 - a);
    const rng = makeRng(SEED);
    const out = new Float32Array(orig.length);
    let se = 0;
    for (let i = 0; i < orig.length; i++) { out[i] = sa * orig[i] + sb * randn(rng); const e = Math.min(1, Math.max(-1, out[i])) - orig[i]; se += e * e; }
    const mse = se / orig.length; // in [-1,1] units; peak-to-peak 2
    return { out, psnr: mse > 0 ? 10 * Math.log10(4 / mse) : Infinity };
  }
  function blit(vec, x, y, size) {
    const img = ctx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) for (let c = 0; c < 3; c++) img.data[4 * i + c] = Math.max(0, Math.min(255, Math.round(((vec[3 * i + c] + 1) / 2) * 255)));
    for (let i = 0; i < W * H; i++) img.data[4 * i + 3] = 255;
    const off = document.createElement('canvas'); off.width = W; off.height = H; off.getContext('2d').putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(off, x, y, size, size);
  }
  function draw() {
    const Wc = canvas.width, Hc = canvas.height;
    ctx.fillStyle = '#171b26'; ctx.fillRect(0, 0, Wc, Hc);
    const size = Math.floor(Math.min((Wc - 48) / 2, Hc - 60));
    const y = Math.floor((Hc - size) / 2) + 10;
    ctx.fillStyle = '#c9cfdd'; ctx.font = `${Math.max(12, Math.round(size * 0.05))}px system-ui, sans-serif`;
    let psnr = Infinity;
    if (orig) {
      blit(orig, 16, y, size);
      const n = noised(model.t); psnr = n.psnr;
      blit(n.out, 32 + size, y, size);
      ctx.fillStyle = '#c9cfdd';
      ctx.fillText('x(0): the image', 16, y - 10);
      ctx.fillText(`x(t): t = ${model.t.toFixed(2)}`, 32 + size, y - 10);
    } else {
      // before the image loads: seeded noise whose seed follows t, so the
      // canvas still changes with the slider
      const rng = makeRng(SEED + Math.round(model.t * 100));
      const img = ctx.createImageData(W, H);
      for (let i = 0; i < W * H; i++) { const v = Math.round(128 + 60 * randn(rng)); img.data[4 * i] = v; img.data[4 * i + 1] = v; img.data[4 * i + 2] = v; img.data[4 * i + 3] = 255; }
      const off = document.createElement('canvas'); off.width = W; off.height = H; off.getContext('2d').putImageData(img, 0, 0);
      ctx.drawImage(off, 32 + size, y, size, size);
      ctx.fillText('loading the render…', 16, y - 10);
    }
    table.update('t', model.t); table.update('abar', alphaBar(model.t)); table.update('snr', snrDb(model.t)); table.update('psnr', psnr); table.update('dims', W * H * 3);
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (stage === 'full' && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => { const w = shell.sceneEl.clientWidth, h = shell.sceneEl.clientHeight; if (w < 2 || h < 2) return; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); draw(); }).observe(shell.sceneEl);
  }
  if (stage !== 'full' && typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => { for (const e of entries) { if (!e.isIntersecting) continue; const r = canvas.getBoundingClientRect(); if (r.width < 2) continue; canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); draw(); } }).observe(canvas);
  }

  draw();
  const im = new Image();
  im.onload = () => {
    W = im.naturalWidth; H = im.naturalHeight;
    const off = document.createElement('canvas'); off.width = W; off.height = H;
    const c2 = off.getContext('2d'); c2.drawImage(im, 0, 0);
    const px = c2.getImageData(0, 0, W, H).data;
    orig = new Float32Array(W * H * 3);
    for (let i = 0; i < W * H; i++) for (let c = 0; c < 3; c++) orig[3 * i + c] = (px[4 * i + c] / 255) * 2 - 1;
    draw();
  };
  im.onerror = () => console.warn('diffusion-image: could not load', SRC.href);
  im.src = SRC.href;
}
