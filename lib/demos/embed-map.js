// embed-map: an embedding is a learned vector for a thing, placed so that
// similar things are near. This demo shows REAL ones: the trained digit
// denoiser (lib/assets/mnist/mlp-denoiser.bin) carries a table of eleven
// 64-dimensional class embeddings (digits 0-9 plus "no class"), learned only
// from the job of denoising digits. Projected to 2D along their two principal
// axes, digits that share strokes tend to land near each other (the 2D map
// keeps ~36% of the variance; the readout's cosines use all 64 dims).
// `highlight` picks a digit and lists its nearest classes by cosine.
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { makeShell } from '../core/demo-shell.js';
import { resolveControlIds } from './registry.js';
import { pca2, cosine } from '../core/pca2.js';

const PARAMS = {
  highlight: { label: 'highlight', min: 0, max: 9, step: 1, value: 4, format: (v) => `digit ${v.toFixed(0)}` },
};
const WEIGHTS = new URL('../assets/mnist/', import.meta.url);

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Ten learned class embeddings, one per digit, each a 64-dimensional
  vector, drawn on their two principal axes. They come straight out of the
  weights of the digit-drawing network in the next exhibits; nobody placed
  them, training did.</p>
  <h4>The concept</h4>
  <p>An embedding is a vector that stands for a concept, arranged so that
  similar concepts are near: here digits that share strokes end up as
  neighbors (4 with 9, 3 with 5, 7 with 9), because the denoiser found it
  useful to treat them alike. Text-to-image models do the same with words, and
  the "no class" point is the slot a caption embedding fills. The 2D picture
  keeps only about a third of the variance; the readout's cosines use all 64
  dimensions.</p>
  <h4>Try this</h4>
  <p>Drag <code>highlight</code> across the digits and read the nearest
  neighbors and their cosine similarities in the readout.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

export function make(container, { stage = 'embed', controls } = {}) {
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'embed-map');
  const model = { highlight: PARAMS.highlight.value };
  let emb = null, proj = null, explained = [0, 0];

  const shell = makeShell(container, { stage, help: { html: HELP_HTML }, legend: 'drag highlight — a digit and its nearest neighbors', nav: null });
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 540; canvas.style.display = 'block';
  if (stage === 'full') { canvas.style.width = '100%'; canvas.style.height = '100%'; }
  shell.sceneEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const controlsCard = shell.addCard('controller — the embedding table');
  for (const id of ids) {
    const s = new SliderRow(controlsCard, { id: `embed-map-${id}`, ...PARAMS[id] });
    s.onInput((v) => { model[id] = v; draw(); });
  }
  const readoutCard = shell.addCard('readout — nearest neighbors');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'digit', label: 'digit', format: (v) => v },
      { id: 'n1', label: 'nearest', format: (v) => v },
      { id: 'n2', label: '2nd', format: (v) => v },
      { id: 'n3', label: '3rd', format: (v) => v },
      { id: 'dims', label: 'dimensions', format: (v) => v },
      { id: 'var', label: '2D map keeps', format: (v) => v },
    ],
  });
  const note = document.createElement('p');
  note.className = 'demo-hint';
  note.textContent = 'embeddings read from lib/assets/mnist/mlp-denoiser.bin (the class table of the trained denoiser), projected by PCA';
  readoutCard.appendChild(note);

  function neighbors(k) {
    return emb.map((v, i) => ({ i, c: cosine(emb[k], v) })).filter((o) => o.i !== k && o.i < 10).sort((a, b) => b.c - a.c);
  }
  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.fillStyle = '#171b26'; ctx.fillRect(0, 0, W, H);
    if (!proj) { ctx.fillStyle = '#8b93a7'; ctx.font = '16px system-ui, sans-serif'; ctx.fillText('loading the network weights (4 MB)…', 20, 30); table.update('digit', String(model.highlight)); return; }
    const xs = proj.map((p) => p[0]), ys = proj.map((p) => p[1]);
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
    const pad = 70;
    const toX = (x) => pad + ((x - minX) / (maxX - minX || 1)) * (W - 2 * pad);
    const toY = (y) => pad + (1 - (y - minY) / (maxY - minY || 1)) * (H - 2 * pad);
    const k = model.highlight;
    const nn = neighbors(k);
    ctx.lineWidth = 2;
    nn.slice(0, 3).forEach((o, r) => { ctx.strokeStyle = `rgba(0,180,110,${0.9 - 0.25 * r})`; ctx.beginPath(); ctx.moveTo(toX(proj[k][0]), toY(proj[k][1])); ctx.lineTo(toX(proj[o.i][0]), toY(proj[o.i][1])); ctx.stroke(); });
    const r = Math.max(14, Math.round(W / 40));
    ctx.font = `bold ${r}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    proj.forEach((p, i) => {
      const isNull = i === 10;
      ctx.fillStyle = i === k ? '#00b46e' : isNull ? '#8b93a7' : '#ffb400';
      ctx.beginPath(); ctx.arc(toX(p[0]), toY(p[1]), isNull ? r * 0.6 : r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#171b26'; if (!isNull) ctx.fillText(String(i), toX(p[0]), toY(p[1]) + 1);
      if (isNull) { ctx.fillStyle = '#c9cfdd'; ctx.font = `${Math.round(r * 0.7)}px system-ui, sans-serif`; ctx.fillText('no class', toX(p[0]), toY(p[1]) + r * 1.2); ctx.font = `bold ${r}px system-ui, sans-serif`; }
    });
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#c9cfdd'; ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(`principal axis 1 →  (2 axes keep ${(100 * (explained[0] + explained[1])).toFixed(0)}% of the variance)`, pad, H - 14);
    table.update('digit', String(k));
    ['n1', 'n2', 'n3'].forEach((id, j) => table.update(id, nn[j] ? `${nn[j].i}  (cos ${nn[j].c.toFixed(2)})` : '–'));
    table.update('dims', `${emb[0].length} per class`);
    table.update('var', `${(100 * (explained[0] + explained[1])).toFixed(0)}%`);
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (stage === 'full' && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => { const w = shell.sceneEl.clientWidth, h = shell.sceneEl.clientHeight; if (w < 2 || h < 2) return; canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); draw(); }).observe(shell.sceneEl);
  }
  if (stage !== 'full' && typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => { for (const e of entries) { if (!e.isIntersecting) continue; const rc = canvas.getBoundingClientRect(); if (rc.width < 2) continue; canvas.width = Math.round(rc.width * dpr); canvas.height = Math.round(rc.height * dpr); draw(); } }).observe(canvas);
  }
  draw();
  (async () => {
    try {
      const man = await (await fetch(new URL('mlp-denoiser.json', WEIGHTS))).json();
      const buf = await (await fetch(new URL('mlp-denoiser.bin', WEIGHTS))).arrayBuffer();
      const all = new Float32Array(buf);
      emb = Array.from({ length: man.classes }, (_, i) => Float64Array.from(all.subarray(i * man.cemb, (i + 1) * man.cemb)));
      const res = pca2(emb); proj = res.points; explained = res.explained;
      draw();
    } catch (err) { console.warn('embed-map: could not load the weights', err); }
  })();
}
