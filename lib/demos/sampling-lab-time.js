// sampling-lab-time: the Time topic of the sampling lab: a wheel filmed at a frame rate (the same alias as the sine of the first view,
// along the time axis), the shutter that blurs it, and the history a temporal filter keeps. run() calls the program's own functions
// (lib/programs/sampling-lab/webgl/samplinglab.js); the pictures are canvases over the scene (sampling-lab-draw.js).
import * as SL from '../programs/sampling-lab/webgl/samplinglab.js';
import { COL } from '../core/lab-viz.js';
import { C, Plot, overlayFor, setupOverlay, leaveOverlay, text, arrow2d, pill, f, el, btn, once } from './sampling-lab-draw.js';
import { paintSampledSine } from './sampling-lab-signal.js';

const HOME = { eye: [0, 0, 8], target: [0, 0, 0] };
const NO_GRID = { grid: 'none', axes: false, home: HOME };
const DEG = Math.PI / 180;
const COUNT = 12;

// ---------------------------------------------------------------- the wheel

const WHEEL_INIT = { spokes: 12, rps: 2, fps: 24, shutter: 0, frame: 3 };
const WHEEL_PRESETS = [
  { label: 'the deck: 12 spokes, 2 rev/s, 24 fps', set: { spokes: 12, rps: 2, fps: 24, shutter: 0 } },
  { label: 'a little slower: 1.9', set: { rps: 1.9 } },
  { label: 'a little faster: 2.1', set: { rps: 2.1 } },
  { label: 'below the limit: 0.9', set: { rps: 0.9 } },
  { label: 'with a half-open shutter', set: { spokes: 12, rps: 2, fps: 24, shutter: 0.5 } },
  { label: 'shutter open all frame', set: { spokes: 12, rps: 2, fps: 24, shutter: 1 } },
  { label: 'exercise 6: 3 blades, 40 rev/s, 30 fps', set: { spokes: 3, rps: 40, fps: 30, shutter: 0 } },
  { label: 'exercise 6 at 41 rev/s', set: { spokes: 3, rps: 41, fps: 30, shutter: 0 } },
];

function runWheel(m) {
  const w = SL.wheelMotion(m.spokes, m.rps, m.fps, m.shutter);
  const a = SL.aliasFrequency(w.spokeRate, m.fps);
  const pattern = SL.sampleSine(w.spokeRate, m.fps, Math.PI / 2, COUNT);
  return { ...a, ...w, pattern };
}

/** one frame of the wheel at the angle theta (degrees, counterclockwise): the spokes, each smeared over the angle swept while the shutter is open */
function drawWheel(g, cx, cy, R, theta, r, spokes, { blur = true } = {}) {
  g.save();
  g.fillStyle = '#10131b';
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  const sweep = blur ? r.sweep : 0;
  const M = sweep > 0.01 ? Math.min(60, Math.ceil(sweep / 1.5) + 1) : 1;
  g.globalCompositeOperation = 'lighter';
  g.lineCap = 'round';
  for (let s = 0; s < M; s++) {
    const a0 = theta + (M > 1 ? (s / (M - 1)) * sweep : 0);
    g.globalAlpha = Math.min(0.95, 1.1 / M);
    for (let j = 0; j < spokes; j++) {
      const ang = (a0 + j * r.spacing) * DEG;
      g.strokeStyle = j === 0 ? '#ff7b72' : '#cfd6e6';
      g.lineWidth = Math.max(2, R * 0.045);
      g.beginPath();
      g.moveTo(cx + Math.cos(ang) * R * 0.14, cy - Math.sin(ang) * R * 0.14);
      g.lineTo(cx + Math.cos(ang) * R * 0.92, cy - Math.sin(ang) * R * 0.92);
      g.stroke();
    }
  }
  g.restore();
  g.strokeStyle = '#5a6479';
  g.lineWidth = Math.max(2, R * 0.04);
  g.beginPath(); g.arc(cx, cy, R * 0.94, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#5a6479';
  g.beginPath(); g.arc(cx, cy, R * 0.1, 0, Math.PI * 2); g.fill();
}

/** an arc from angle a0 by delta degrees (counterclockwise positive) with an arrowhead */
function arcArrow(g, cx, cy, rad, a0, delta, color, width = 3) {
  if (Math.abs(delta) < 0.05) {
    g.fillStyle = color;
    g.beginPath(); g.arc(cx + Math.cos(a0 * DEG) * rad, cy - Math.sin(a0 * DEG) * rad, 5, 0, Math.PI * 2); g.fill();
    return;
  }
  const shown = Math.sign(delta) * Math.min(Math.abs(delta), 340);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.beginPath();
  g.arc(cx, cy, rad, -a0 * DEG, -(a0 + shown) * DEG, shown > 0);
  g.stroke();
  const end = (a0 + shown) * DEG, back = (a0 + shown - Math.sign(shown) * 6) * DEG;
  arrow2d(g, cx + Math.cos(back) * rad, cy - Math.sin(back) * rad, cx + Math.cos(end) * rad, cy - Math.sin(end) * rad, color, width, 10);
}

export function wheelLayout(ov) {
  const A = ov.area();
  const topH = Math.round(A.h * 0.66);
  const size = Math.min(topH, Math.round(A.w * 0.42));
  const wheel = { x: A.x + 4, y: A.y + 6, w: size, h: size };
  const plot = { x: wheel.x + size + 16, y: A.y, w: A.x + A.w - (wheel.x + size + 16), h: topH };
  const strip = { x: A.x, y: A.y + topH + 8, w: A.w, h: A.h - topH - 8 };
  return { wheel, plot, strip };
}

function paintWheel(ov, g, m, r) {
  const L = wheelLayout(ov);
  const W = L.wheel, R = W.w / 2 - 12, cx = W.x + W.w / 2, cy = W.y + W.h / 2 + 4;
  const turn = r.turn, k = m.frame;
  const theta = k * turn;
  drawWheel(g, cx, cy, R, theta, r, m.spokes);
  // the step from the last frame: what it did, and what the eye takes it to have done
  const prev = (k - 1) * turn;
  g.globalAlpha = ov.dim('turn');
  arcArrow(g, cx, cy, R * 0.62, prev, turn, '#ff7b72', 3);
  g.globalAlpha = ov.dim('apparentStep', 'apparentRps', 'signed');
  arcArrow(g, cx, cy, R * 0.5, prev, r.apparentStep, '#7ee787', 3.5);
  g.globalAlpha = 1;
  text(g, `frame ${k}`, W.x + 8, W.y + 14, { size: 13, color: C.ink, weight: 700 });
  text(g, `true step ${r.turn >= 0 ? '+' : ''}${f(r.turn, 1)}°`, W.x + 8, W.y + W.h + 2, { size: 12.5, color: '#ff7b72', weight: 700 });
  text(g, `seen ${r.apparentStep >= 0 ? '+' : ''}${f(r.apparentStep, 1)}°`, W.x + W.w - 8, W.y + W.h + 2, { size: 12.5, color: '#7ee787', weight: 700, align: 'right' });
  if (m.shutter > 0) text(g, `shutter ${f(m.shutter, 2)}: sweeps ${f(r.sweep, 1)}°, contrast ${f(r.contrast, 2)}`, W.x + W.w - 8, W.y + 14, { size: 12, color: C.nyquist, align: 'right', weight: 600 });
  // the same alias as the first view, along time
  const P = L.plot;
  if (P.w > 240) {
    paintSampledSine(ov, g, P, r.pattern, {
      f: r.spokeRate, fs: m.fps, phase: Math.PI / 2, count: COUNT, title: `spoke pattern cos(2\u03c0 N rps t) at ${m.fps} frames per second`, unit: 't (s)', trueName: 'spokes per second', mark: ((k % COUNT) + COUNT) % COUNT,
    });
  }
  // a strip of consecutive frames
  const S = L.strip;
  const cells = 6;
  const cw = S.w / cells;
  const cr = Math.min(S.h / 2 - 22, cw / 2 - 8);
  if (cr < 12) return;
  for (let c = 0; c < cells; c++) {
    const fr = k - 1 + c;
    const ccx = S.x + cw * (c + 0.5), ccy = S.y + 6 + cr + 4;
    drawWheel(g, ccx, ccy, cr, fr * turn, r, m.spokes);
    if (fr === k) { g.strokeStyle = C.nyquist; g.lineWidth = 2; g.strokeRect(S.x + cw * c + 3, S.y + 2, cw - 6, 2 * cr + 14 + 28); }
    text(g, `frame ${fr}: ${f((((fr * turn) % 360) + 360) % 360, 1)}°`, ccx, ccy + cr + 17, { size: 11.5, color: C.ink, align: 'center' });
  }
}

function explainWheel(m, r) {
  const rev = (x) => `${f(Math.abs(x), 2)} rev/s`;
  let status;
  const blurred = m.shutter > 0 && r.contrast < 0.05;
  if (!r.aliased) status = { text: `turns at its true ${rev(m.rps)}: ${f(r.turn, 1)}° per frame is less than half a spoke spacing (${f(r.spacing / 2, 1)}°), so the frames hold the motion`, tone: 'ok' };
  else if (Math.abs(r.aliasRate) < 1e-6) status = { text: `appears to stand still: each frame advances ${f(r.turn, 1)}°, exactly ${r.k} spoke spacing${r.k === 1 ? '' : 's'} of ${f(r.spacing, 1)}°`, tone: 'bad' };
  else if (r.aliasRate < 0) status = { text: `appears to turn backward at ${rev(r.apparentRps)}: the true ${rev(m.rps)} forward advances ${f(r.turn, 1)}° a frame, and the nearest spoke is ${f(-r.apparentStep, 1)}° behind where it started`, tone: 'bad' };
  else status = { text: `appears to turn forward at only ${rev(r.apparentRps)}: the true ${rev(m.rps)} advances ${f(r.turn, 1)}° a frame, ${f(r.apparentStep, 1)}° more than a whole number of spoke spacings`, tone: 'bad' };
  if (blurred && r.aliased) status = { text: `the shutter sweeps ${f(r.sweep, 1)}°, ${f(r.sweep / r.spacing, 2)} of a spoke spacing, and blurs the spokes into a disk (contrast ${f(r.contrast, 3)}): nothing is left to alias`, tone: 'ok' };
  else if (m.shutter > 0 && r.aliased) status.text += `; the open shutter lowers the spoke contrast to ${f(r.contrast, 2)}`;
  return {
    hud: `${m.spokes} spokes at ${f(m.rps, 2)} rev/s = {spokeRate|${f(r.spokeRate, 1)}} spokes/s, ${m.fps} fps (Nyquist {nyquist|${f(r.nyquist, 1)}}): seen at {apparentRps|${f(r.apparentRps, 2)}} rev/s`,
    rows: [
      `turn per frame = 360 × rps / fps = 360 × ${f(m.rps, 2)} / ${m.fps} = {turn|${f(r.turn, 1)}}°; spoke spacing = 360 / N = {spacing|${f(r.spacing, 1)}}°`,
      `pattern frequency N × rps = {spokeRate|${f(r.spokeRate, 1)}} spokes/s, alias = {signed|${f(r.signed, 2)}} (k = {k|${r.k}}), Nyquist {nyquist|${f(r.nyquist, 1)}}`,
      `seen: {apparentStep|${f(r.apparentStep, 1)}}° per frame = {apparentRps|${f(r.apparentRps, 2)}} rev/s`,
      `shutter ${f(m.shutter, 2)} of a frame: sweeps {sweep|${f(r.sweep, 1)}}°, spoke contrast |sinc(N rps s / fps)| = {contrast|${f(r.contrast, 3)}}`,
    ],
    status,
    values: [
      ['true speed', rev(m.rps), 'rps'], ['seen speed', `${r.apparentRps < 0 ? '−' : ''}${rev(r.apparentRps)}`, 'apparentRps'],
      ['turn per frame', `${f(r.turn, 1)}°`, 'turn'], ['seen per frame', `${f(r.apparentStep, 1)}°`, 'apparentStep'],
      ['pattern frequency', `${f(r.spokeRate, 1)} /s`, 'spokeRate'], ['spoke contrast', f(r.contrast, 3), 'contrast'],
    ],
  };
}

function wheelView() {
  let player = null;
  const stop = (ctx, button) => {
    if (player) cancelAnimationFrame(player.raf);
    player = null;
    if (button) button.textContent = '▶ play at the frame rate';
    ctx?.refresh?.();
  };
  return {
    id: 'wheel', topic: 'time', label: 'the wheel', init: WHEEL_INIT, presets: WHEEL_PRESETS, ...NO_GRID,
    params: [
      { id: 'spokes', label: 'spokes N', min: 3, max: 24, step: 1 }, { id: 'rps', label: 'rev/s', min: 0, max: 8, step: 0.05 },
      { id: 'fps', label: 'frames/s', min: 6, max: 60, step: 1 }, { id: 'shutter', label: 'shutter', min: 0, max: 1, step: 0.05 },
      { id: 'frame', label: 'frame', min: 0, max: 239, step: 1 },
    ],
    inputTitle: 'Wheel', regions: ['Alias frequency', 'Wheel'],
    keys: { rps: COL.a, turn: COL.a, spacing: COL.gray, spokeRate: COL.a, signed: COL.c, k: COL.purple, nyquist: COL.gold, apparentStep: COL.c, apparentRps: COL.c, sweep: COL.gold, contrast: COL.gold },
    setup: (ctx) => setupOverlay(ctx, null),
    leave: (ctx) => { stop(null, null); leaveOverlay(ctx); },
    run: runWheel,
    draw(v, m, r, ctx) {
      const ov = ctx.sceneEl ? overlayFor(ctx) : null;
      if (!ov) return;
      ov.painter = (g) => paintWheel(ov, g, m, r);
      ov.repaint();
    },
    explain: explainWheel,
    panelTitle: 'Film',
    panel(host, m, r, ctx) {
      once(host, 'wheel', (h) => {
        const row = el('div', 'lab-btns', h);
        h.playBtn = btn(row, '▶ play at the frame rate', () => {
          if (player) { stop(ctx, h.playBtn); return; }
          const ov = overlayFor(ctx);
          const base = ctx.state().frame, t0 = performance.now();
          h.playBtn.textContent = '❚❚ pause';
          const step = (now) => {
            if (!player) return;
            const st = ctx.state();
            const k = (base + Math.floor(((now - t0) / 1000) * st.fps)) % 240;
            if (k !== st.frame) { st.frame = k; ov.repaint(); }
            player.raf = requestAnimationFrame(step);
          };
          player = { raf: requestAnimationFrame(step) };
        });
        h.note = el('p', 'lab-note', h, 'Red spoke: one spoke marked. Red arc: what the wheel did since the last frame. Green arc: what the eye makes of it (the nearest spoke). Pause to scrub the frame slider.');
      });
    },
  };
}

// ---------------------------------------------------------------- the history a temporal filter keeps

const TAA_INIT = { alpha: 0.1, speed: 1, frames: 30 };
const BAR = 6;
const TAA_PRESETS = [
  { label: 'the deck: weight 0.1', set: { alpha: 0.1, speed: 1, frames: 30 } },
  { label: 'a quicker bar', set: { speed: 2 } },
  { label: 'weight 0.3', set: { alpha: 0.3 } },
  { label: 'weight 1: no history', set: { alpha: 1 } },
  { label: 'weight 0.02', set: { alpha: 0.02 } },
];

function runTaa(m) {
  const reach = SL.framesToReach(m.alpha, 0.9, 60);
  const width = Math.ceil(4 + BAR + m.speed * m.frames + 10);
  const ghost = SL.ghostRow(width, BAR, m.speed, m.alpha, m.frames);
  const rows = [];
  for (let n = 0; n <= m.frames; n++) rows.push(SL.ghostRow(width, BAR, m.speed, m.alpha, n).row);
  // the history of one pixel after a jump from 0 to 1
  const response = [0];
  let history = [0];
  for (let n = 1; n <= 60; n++) { history = SL.blendHistory(history, [1], m.alpha); response.push(history[0]); }
  return { ...reach, ...ghost, width, rows, response };
}

function paintTaa(ov, g, m, r) {
  const A = ov.area();
  const rows = m.frames + 1;
  const cell = Math.max(3, Math.floor((A.w * 0.5) / r.width));
  const cellH = Math.max(4, Math.min(20, Math.floor((A.h - 56) / rows)));
  const img = { x: A.x + 8, y: A.y + 24, w: cell * r.width, h: cellH * rows };
  text(g, 'each row is one frame: the history of every pixel', img.x, img.y - 8, { size: 12.5, color: C.ink, weight: 600 });
  for (let n = 0; n < rows; n++) {
    for (let x = 0; x < r.width; x++) {
      const v = r.rows[n][x];
      const c = Math.round(255 * Math.min(1, v));
      g.fillStyle = `rgb(${Math.round(c * 0.35)},${Math.round(c * 0.75)},${c})`;
      g.fillRect(img.x + x * cell, img.y + n * cellH, cell, cellH);
    }
    // the bar itself, as an outline
    const b0 = 4 + m.speed * n;
    g.strokeStyle = C.white;
    g.lineWidth = 1;
    g.strokeRect(img.x + b0 * cell + 0.5, img.y + n * cellH + 0.5, BAR * cell - 1, cellH - 1);
  }
  g.strokeStyle = C.axis;
  g.strokeRect(img.x - 0.5, img.y - 0.5, img.w + 1, img.h + 1);
  text(g, 'white: where the bar is    blue: what the history holds    down: time', img.x, img.y + img.h + 15, { size: 11, color: C.dim });
  const rx = img.x + img.w + 28;
  const rw = A.x + A.w - rx;
  if (rw < 220) return;
  const ph = Math.min(Math.round(A.h * 0.5) - 6, 300);
  const p = new Plot(g, { x: rx, y: A.y, w: rw, h: ph }, { xr: [0, 60], yr: [0, 1.05], xticks: [0, 10, 20, 30, 40, 50, 60], yticks: [0, 0.5, 0.9, 1], title: 'one pixel after a jump from 0 to 1', xlabel: 'frames', bottom: 26 });
  p.frame();
  p.hline(0.9, C.nyquist, { dash: [5, 4], label: '90 %', labelAt: 'left' });
  p.curve((n) => r.response[Math.max(0, Math.min(60, Math.round(n)))], C.rate, { width: 2.6, n: 120, alpha: ov.dim('alpha') });
  if (r.frames <= 60) {
    p.vline(r.frames, C.nyquist, { dash: [2, 4] });
    p.dot(r.frames, r.response[r.frames], 5.5, C.nyquist, { stroke: C.bg });
  }
  text(g, r.frames <= 60 ? `${r.frames} frames = ${f(r.seconds, 2)} s at 60 Hz` : `more than 60 frames (${r.frames}) = ${f(r.seconds, 1)} s at 60 Hz`, p.x1 - 8, p.y1 - 22, { size: 13, color: C.nyquist, align: 'right', weight: 700 });
  const q = new Plot(g, { x: rx, y: A.y + ph + 12, w: rw, h: Math.min(A.h - ph - 12, 280) }, { xr: [0, r.width], yr: [0, 1.05], xticks: [0, 20, 40, 60, 80].filter((t) => t <= r.width), yticks: [0, 0.1, 0.5, 1], title: `the last frame: a trail of ${r.trail} pixels behind the bar`, xlabel: 'pixel', bottom: 26 });
  q.frame();
  q.hline(0.1, C.red, { dash: [4, 4], label: '10 %', labelAt: 'left', labelColor: C.red });
  q.curve((x) => r.row[Math.max(0, Math.min(r.width - 1, Math.floor(x)))], C.rate, { width: 2.4, n: r.width * 4, alpha: ov.dim('trail') });
  q.vline(r.barStart, C.white, { dash: [3, 3], label: 'bar', labelColor: C.white, labelSide: 'left' });
}

function explainTaa(m, r) {
  let status;
  if (m.alpha >= 0.999) status = { text: 'weight 1: no history is kept, so there is no ghost and no averaging over frames', tone: 'info' };
  else status = { text: `at weight ${f(m.alpha, 2)} the history reaches 90 % of a new value after ${r.frames} frames (${f(r.seconds, 2)} s at 60 Hz), and a bar moving ${f(m.speed, 2)} px a frame leaves ${r.trail} pixels behind it at 10 % or more`, tone: r.frames > 10 ? 'warn' : 'ok' };
  return {
    hud: `weight {alpha|${f(m.alpha, 2)}}: 90 % after {frames|${r.frames}} frames = {seconds|${f(r.seconds, 2)}} s at 60 Hz; trail {trail|${r.trail}} px`,
    rows: [
      `history = (1 − α) history + α current, α = {alpha|${f(m.alpha, 2)}}`,
      `after n frames a jump from 0 to 1 has reached 1 − (1 − α)^n; 90 % when n = ln(1 − 0.9) / ln(1 − α) = {exact|${f(r.exact, 2)}}, rounded up: {frames|${r.frames}}`,
      `at 60 frames per second: {seconds|${f(r.seconds, 2)}} s, the length of the ghost; after ${r.frames} frames the history is {reached|${f(r.reached, 3)}}`,
      `a bar ${BAR} px wide moving ${f(m.speed, 2)} px per frame: after ${m.frames} frames it is at {barStart|${f(r.barStart, 1)}} and leaves {trail|${r.trail}} pixels at 10 % or more`,
    ],
    status,
    values: [['weight α', f(m.alpha, 2), 'alpha'], ['frames to 90 %', String(r.frames), 'frames'], ['seconds at 60 Hz', f(r.seconds, 2), 'seconds'], ['trail', `${r.trail} px`, 'trail']],
  };
}

function taaView() {
  return {
    id: 'taa', topic: 'time', label: 'the history', init: TAA_INIT, presets: TAA_PRESETS, ...NO_GRID,
    params: [
      { id: 'alpha', label: 'weight α', min: 0.02, max: 1, step: 0.01 }, { id: 'speed', label: 'bar speed', min: 0, max: 2, step: 0.25 },
      { id: 'frames', label: 'frames', min: 1, max: 60, step: 1 },
    ],
    inputTitle: 'History', regions: ['History blend', 'Ghost trail'],
    keys: { alpha: COL.b, frames: COL.gold, seconds: COL.gold, exact: COL.gold, reached: COL.green, trail: COL.red, barStart: COL.white },
    setup: (ctx) => setupOverlay(ctx, null),
    leave: (ctx) => leaveOverlay(ctx),
    run: runTaa,
    draw(v, m, r, ctx) {
      const ov = ctx.sceneEl ? overlayFor(ctx) : null;
      if (!ov) return;
      ov.painter = (g) => paintTaa(ov, g, m, r);
      ov.repaint();
    },
    explain: explainTaa,
  };
}

export function timeViews() {
  return [wheelView(), taaView()];
}
