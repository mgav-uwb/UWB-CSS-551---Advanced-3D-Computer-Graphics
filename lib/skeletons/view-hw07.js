// view-hw07: left, the 12-unit net fitting the 12 wave samples with the given gradients and
// YOUR sgdStep, redrawn as the steps slider moves; middle, the loss history of YOUR train at
// three learning rates; right, the course's digit and its rebuild from the k x k low-frequency
// block of YOUR dct2, with YOUR psnr.
import { SliderRow } from '../core/cockpit.js';
import { panels2d, readout, safe, fmt } from './view-common.js';
import { DATA7 } from './data-hw07.js';
import { cloneModel } from './checks.js';

export const NAV = null;
export const HELP_HTML = `<h4>HW7</h4><p>Left: the samples (dots) and your network's curve after the chosen
number of gradient steps. Middle: the loss at every step of your <code>train</code> at three learning rates
(a logarithmic axis; a rising curve is a loss that grew). Right: the digit, and its rebuild from the lowest k × k frequencies of your
<code>dct2</code>, with your <code>psnr</code>.</p><p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>`;

export function make(shell, impl, I) {
  const [fitP, lrP, dctP] = panels2d(shell, [
    { caption: 'the fit: 12 samples of the wave, 12 tanh units', w: 480, h: 360 },
    { caption: 'loss against step at three learning rates (log scale)', w: 400, h: 360 },
    { caption: 'the digit (left) and its low-frequency rebuild (right)', w: 440, h: 220 },
  ]);
  const model = { steps: I.fit.steps, k: 8 };
  const card = shell.addCard('Controls');
  new SliderRow(card, { id: 'hw7-steps', label: 'steps', min: 0, max: 3000, step: 50, value: model.steps, format: (v) => v.toFixed(0) }).onInput((v) => { model.steps = v; drawFit(); });
  new SliderRow(card, { id: 'hw7-k', label: 'k', min: 1, max: 20, step: 1, value: model.k, format: (v) => v.toFixed(0) }).onInput((v) => { model.k = v; drawDct(); });
  const show = readout(shell, 'Your numbers');
  const lines = { fit: '', lr: '', dct: '' };
  const refresh = () => show([lines.fit, lines.lr, lines.dct]);

  // train once to 3000 and keep snapshots every 50 steps, so the slider is instant
  const snaps = [];
  let m = cloneModel(DATA7.init);
  const xs = DATA7.samples.xs, ys = DATA7.samples.ys;
  for (let e = 0; e <= 3000; e++) {
    if (e % 50 === 0) snaps.push(m);
    const g = safe(() => impl.gradients(m, xs, ys), null);
    if (!g) break;
    m = safe(() => impl.sgdStep(m, g, I.fit.lr), m);
  }

  function drawFit() {
    const { ctx, canvas } = fitP, W = canvas.width, H = canvas.height;
    const sx = (x) => ((x + 1.6) / 3.2) * W, sy = (y) => H / 2 - y * (H / 2.6);
    ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#262a35'; ctx.beginPath(); ctx.moveTo(0, sy(0)); ctx.lineTo(W, sy(0)); ctx.stroke();
    const mm = snaps[Math.min(snaps.length - 1, Math.round(model.steps / 50))] ?? DATA7.init;
    ctx.strokeStyle = '#00e58a'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const x = -1.6 + (3.2 * i) / 200;
      const f = safe(() => impl.forward(mm, x).f, 0);
      i ? ctx.lineTo(sx(x), sy(f)) : ctx.moveTo(sx(x), sy(f));
    }
    ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = '#ffcf5c';
    xs.forEach((x, i) => { ctx.beginPath(); ctx.arc(sx(x), sy(ys[i]), 4, 0, 2 * Math.PI); ctx.fill(); });
    const loss = safe(() => impl.gradients(mm, xs, ys).loss, NaN);
    lines.fit = `after ${model.steps} steps: loss ${fmt(loss, 6)}`;
    refresh();
  }

  const n = I.dct.n;
  const C = safe(() => impl.dct2(DATA7.digit, n), new Array(n * n).fill(0));
  function drawDct() {
    const { ctx } = dctP, s = 10;
    const rec = safe(() => impl.idct2Truncated(C, n, model.k), new Array(n * n).fill(0));
    ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, 440, 220);
    const put = (img, ox) => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = Math.round(255 * Math.max(0, Math.min(1, img[y * n + x]))); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(ox + x * s, 10 + y * s, s, s); } };
    put(DATA7.digit, 10); put(rec, 230);
    const p = safe(() => impl.psnr(DATA7.digit, rec), NaN);
    lines.dct = `k = ${model.k}: ${model.k * model.k} of 400 coefficients, PSNR ${fmt(p, 2)} dB`;
    refresh();
  }
  // the loss history of YOUR train at three rates; non-finite or non-positive values are not drawn
  const RATES = [{ lr: 0.002, color: '#5cb8ff' }, { lr: 0.05, color: '#00e58a' }, { lr: 0.4, color: '#ff6b6b' }];
  function drawLr() {
    const { ctx, canvas } = lrP, W = canvas.width, H = canvas.height, steps = 40;
    ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H);
    const lo = -3, hi = 2; // log10 of the loss, from 0.001 to 100
    const sx = (k) => 36 + (k / steps) * (W - 48), sy = (v) => H - 24 - ((Math.log10(v) - lo) / (hi - lo)) * (H - 40);
    ctx.strokeStyle = '#262a35'; ctx.fillStyle = '#8b93a7'; ctx.font = '11px sans-serif';
    for (let e = lo; e <= hi; e++) {
      const y = H - 24 - ((e - lo) / (hi - lo)) * (H - 40);
      ctx.beginPath(); ctx.moveTo(36, y); ctx.lineTo(W - 12, y); ctx.stroke();
      ctx.fillText(String(10 ** e), 2, y + 4);
    }
    ctx.fillText('step 0', 36, H - 8); ctx.fillText(`step ${steps}`, W - 56, H - 8);
    const note = [];
    RATES.forEach((r, i) => {
      const h = safe(() => impl.train(cloneModel(DATA7.init), xs, ys, r.lr, steps), []);
      ctx.strokeStyle = r.color; ctx.lineWidth = 2; ctx.beginPath();
      let pen = false;
      h.forEach((v, k) => {
        if (!(Number.isFinite(v) && v > 0)) { pen = false; return; }
        const y = Math.max(0, Math.min(H, sy(v)));
        pen ? ctx.lineTo(sx(k), y) : ctx.moveTo(sx(k), y);
        pen = true;
      });
      ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = r.color; ctx.fillText(`lr ${r.lr}`, W - 80, 16 + 14 * i);
      note.push(h.length ? `lr ${r.lr}: loss ${fmt(h[0], 3)} -> ${fmt(h[h.length - 1], 3)}` : `lr ${r.lr}: train returned nothing yet`);
    });
    lines.lr = note.join('\n');
    refresh();
  }
  drawFit();
  drawLr();
  drawDct();
}
