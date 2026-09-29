// view-hw08: left, noise walked onto the spiral by YOUR denoise + ddimStep (sampleDDIM),
// with the number of steps on a slider; right, one ray through five volume samples (YOUR
// renderRay), the projected splat's ellipse (YOUR projectSplat), and a pixel row of three
// splats composited by YOUR compositeSplats.
import { SliderRow } from '../core/cockpit.js';
import { panels2d, readout, safe, fmt } from './view-common.js';
import { DATA8 } from './data-hw08.js';
import { meanNearest } from './checks.js';

export const NAV = null;
export const HELP_HTML = `<h4>HW8</h4><p>Left: the spiral data (blue) and 120 noise samples after your DDIM
sampler (orange). Right, top: the five-sample ray, its per-sample weights and your composited color. Middle:
your projected splat ellipse. Bottom: the three-splat row composited by your function, left to right.</p>
<p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>`;

export function make(shell, impl, I) {
  const [diffP, sceneP] = panels2d(shell, [
    { caption: 'DDIM on the spiral: data (blue), your samples (orange)', w: 420, h: 420 },
    { caption: 'a ray through a volume; a projected splat; a composited row', w: 420, h: 420 },
  ]);
  const model = { steps: I.sampler.steps };
  const card = shell.addCard('Controls');
  new SliderRow(card, { id: 'hw8-steps', label: 'steps', min: 1, max: 50, step: 1, value: model.steps, format: (v) => v.toFixed(0) }).onInput((v) => { model.steps = v; drawDiff(); });
  const show = readout(shell, 'Your numbers');
  const out = { diff: '', ray: '', splat: '', row: '' };
  const refresh = () => show([out.diff, out.ray, out.splat, out.row]);

  function drawDiff() {
    const { ctx } = diffP, S = 420, sx = (x) => S / 2 + x * (S / 2.6), sy = (y) => S / 2 - y * (S / 2.6);
    ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = 'rgba(92,140,255,0.5)';
    for (const [x, y] of DATA8.spiral) ctx.fillRect(sx(x) - 1.5, sy(y) - 1.5, 3, 3);
    const starts = DATA8.starts.slice(0, 120);
    const pts = safe(() => impl.sampleDDIM(starts, DATA8.spiral, model.steps), starts);
    ctx.fillStyle = '#ff9f43';
    for (const [x, y] of pts) { ctx.beginPath(); ctx.arc(sx(x), sy(y), 3, 0, 2 * Math.PI); ctx.fill(); }
    out.diff = `${model.steps} steps: mean nearest distance ${fmt(meanNearest(pts, DATA8.spiral), 4)}`;
    refresh();
  }

  function drawScene() {
    const { ctx } = sceneP, W = 420;
    ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, 420);
    // the ray: five samples, bars = alpha, swatch = composited C
    const v = I.volume;
    const ray = safe(() => impl.renderRay(v.sigmas, v.colors, v.delta), { C: [0, 0, 0], T: 1 });
    v.colors.forEach((c, i) => {
      const a = 1 - Math.exp(-v.sigmas[i] * v.delta);
      ctx.fillStyle = `rgb(${c.map((x) => Math.round(255 * x))})`;
      ctx.fillRect(20 + i * 50, 110 - 90 * a, 36, 90 * a);
      ctx.strokeStyle = '#3a4152'; ctx.strokeRect(20 + i * 50, 20, 36, 90);
    });
    ctx.fillStyle = `rgb(${ray.C.map((x) => Math.round(255 * Math.min(1, x)))})`; ctx.fillRect(300, 30, 80, 70);
    ctx.fillStyle = '#8b93a7'; ctx.font = '12px sans-serif'; ctx.fillText('alpha per sample', 20, 128); ctx.fillText('your C', 300, 118);
    out.ray = `ray C ${fmt(ray.C, 4)}  T ${fmt(ray.T, 4)}`;
    // the splat: center and ellipse, drawn at 1/2 scale in a 250 x 150 image window
    const sp = I.splat;
    const pr = safe(() => impl.projectSplat(sp.s, sp.rotZ, sp.t, sp.f), { cov: [0, 0, 0], radii: [0, 0], angleDeg: 0, center: [0, 0] });
    const ox = 20, oy = 150, k = 0.8;
    ctx.strokeStyle = '#3a4152'; ctx.strokeRect(ox, oy, 250 * k, 150 * k);
    ctx.save(); ctx.translate(ox + pr.center[0] * k, oy + pr.center[1] * k); ctx.rotate((pr.angleDeg * Math.PI) / 180);
    ctx.strokeStyle = '#8f7dff'; ctx.lineWidth = 2;
    for (const m of [1, 2]) { ctx.beginPath(); ctx.ellipse(0, 0, Math.max(0.1, m * pr.radii[0] * k), Math.max(0.1, m * pr.radii[1] * k), 0, 0, 2 * Math.PI); ctx.stroke(); }
    ctx.restore(); ctx.lineWidth = 1;
    ctx.fillStyle = '#8b93a7'; ctx.fillText('the splat in pixels (1σ, 2σ), y down', ox, oy + 150 * k + 14);
    out.splat = `splat radii ${fmt(pr.radii, 2)} px, angle ${fmt(pr.angleDeg, 2)}°, center ${fmt(pr.center, 1)}`;
    // the row
    const row = I.row, ry = 330;
    for (let px = 0; px < 380; px++) {
      const u = px / 380;
      const r = safe(() => impl.compositeSplats(row.splats, u), { C: [0, 0, 0], T: 1 });
      const c = r.C.map((x) => Math.round(255 * Math.min(1, x + r.T)));
      ctx.fillStyle = `rgb(${c})`; ctx.fillRect(20 + px, ry, 1, 40);
    }
    ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(20 + row.u * 380, ry - 6); ctx.lineTo(20 + row.u * 380, ry + 46); ctx.stroke();
    ctx.fillStyle = '#8b93a7'; ctx.fillText('three splats over white, u = 0.45 marked', 20, ry + 62);
    const at = safe(() => impl.compositeSplats(row.splats, row.u), { C: [0, 0, 0], T: 1 });
    out.row = `row at u = 0.45: C ${fmt(at.C, 4)}  T ${fmt(at.T, 4)}`;
    refresh();
  }
  drawScene();
  drawDiff();
}
