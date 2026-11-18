// particle-lab-contacts: the catalog behind the particle-lab demo, part three: contacts. Two views: one bounce on a floor (where the
// step ended, where the particle was put, the velocity split into its normal and tangential parts) and a particle thrown at a thin
// wall, stepped with one substep or many. run() calls the program's own functions (lib/programs/particle-lab/webgl/particle.js).
import * as P from '../programs/particle-lab/webgl/particle.js';
import { num, fixed, makePlot, text, arrow2d, wallBar, showOverlay, hideOverlay, captioned } from './particle-lab-draw.js';
import { bottomOf, hasOverlay } from './particle-lab-views.js';

const FRAME = 1 / 60;
const RED = '#ff7b72', GREEN = '#7ee787', BLUE = '#79c0ff', AMBER = '#ffc46b', PINK = '#ff79c6', GRAY = '#8b93a7';
const v3 = (a, d = 3) => `(${a.map((x) => num(Number(x.toFixed(d)), 4)).join(', ')})`;

// ================================================================ one bounce

const BOUNCE_BASE = { vx: 3, vy: 4, depth: 0.05, e: 0.5, mu: 0 };

function bounceRun(m) {
  const p = [0, -m.depth, 0], v = [m.vx, -m.vy, 0], n = [0, 1, 0];
  const c = P.planeContact(p, v, n, 0, m.e, m.mu);
  const tangent = [m.vx, 0, 0];
  const normalAfter = m.vy > 0 ? m.e * m.vy : -m.vy;
  const slide = c.hit && m.vx !== 0 ? c.v[0] / m.vx : 1;
  return { ...c, pushed: c.p, after: c.v, tangent, normalAfter, slide, before: v, start: p };
}

const CAPTION_BOUNCE = 'A ball hits the floor partway through a step and ends the step inside it (red dot). The fix: push it back out, keep its speed along the floor, and reverse its speed into the floor, scaled by the restitution e.';
function paintBounce(ov, g, w, h, m, r) {
  const pad = 14, top = ov.top + 4, bottom = bottomOf(ov);
  const PS = 760, SV = Math.min(34, (w * 0.5 - 40) / Math.max(1.5, Math.abs(m.vx), m.vy + 0.5, Math.abs(r.after[0]), Math.abs(r.after[1])));
  const cx = w / 2, yf = top + Math.min(0.56 * (h - top - bottom), 40 + SV * (m.vy + 0.8) + 24);
  const yBottom = h - bottom;
  g.fillStyle = '#121620';
  g.fillRect(pad, yf, w - 2 * pad, Math.max(0, yBottom - yf));
  g.strokeStyle = '#5c667c'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(pad, yf); g.lineTo(w - pad, yf); g.stroke();
  text(g, 'floor', pad + 6, yf + 18, { size: 13, color: GRAY, halo: false });
  arrow2d(g, w - pad - 20, yf, w - pad - 20, yf - 34, GRAY, 2, 8);
  text(g, 'n = (0, 1, 0)', w - pad - 28, yf - 14, { size: 13, align: 'right', color: GRAY, halo: false });
  const at = (p) => ({ x: cx + p[0] * PS, y: yf - p[1] * PS });
  const prev = [r.start[0] - m.vx * FRAME, r.start[1] + m.vy * FRAME, 0];
  const a = at(prev), b = at(r.start), c = at([0, 0, 0]);
  // the step: where it began, where it ended
  g.save();
  g.globalAlpha = ov.dim('depth', 'push');
  g.setLineDash([3, 4]); g.strokeStyle = '#4a5266'; g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  g.setLineDash([]);
  g.strokeStyle = GRAY; g.lineWidth = 1.8;
  g.beginPath(); g.arc(a.x, a.y, 6, 0, 2 * Math.PI); g.stroke();
  g.fillStyle = RED;
  g.beginPath(); g.arc(b.x, b.y, 6.5, 0, 2 * Math.PI); g.fill();
  if (r.hit && m.depth > 0.004) arrow2d(g, b.x + 12, b.y, b.x + 12, c.y + 1, GREEN, 2.6, 9);
  g.restore();
  text(g, 'step began here', a.x - 10, a.y - 4, { size: 12, align: 'right', color: GRAY });
  text(g, `ended the step ${num(m.depth, 3)} m inside`, b.x - 12, b.y + 16, { size: 12, align: 'right', color: RED });
  if (r.hit && m.depth > 0.004) text(g, `pushed out by (0, ${num(r.depth, 3)}, 0)`, b.x + 22, (b.y + c.y) / 2 + 4, { size: 12, color: GREEN });
  // the velocity, split into the part along n and the part along the surface
  const sx = (vx) => vx * SV, sy = (vy) => -vy * SV;
  const T = { x: c.x - sx(m.vx), y: c.y - sy(-m.vy) };     // the incoming arrow's tail
  g.save();
  g.globalAlpha = ov.dim('vn', 'vt', 'kept');
  arrow2d(g, T.x, T.y, c.x, c.y, AMBER, 3, 11);
  text(g, `v = ${v3([m.vx, -m.vy, 0])}  speed ${num(r.speedBefore, 4)}`, T.x + (m.vx >= 0 ? -6 : 6), T.y - 8, { size: 13, align: m.vx >= 0 ? 'left' : 'right', color: AMBER });
  g.setLineDash([4, 3]);
  arrow2d(g, T.x, T.y, c.x, T.y, BLUE, 1.8, 7);
  arrow2d(g, c.x, T.y, c.x, c.y - 2, RED, 1.8, 7);
  g.setLineDash([]);
  text(g, `tangential ${num(r.tangentSpeed, 3)}`, (T.x + c.x) / 2, T.y + 15, { size: 12, align: 'center', color: BLUE });
  text(g, `normal ${num(r.normalSpeed, 3)}`, c.x + 6, (T.y + c.y) / 2, { size: 12, color: RED });
  // after
  const E = { x: c.x + sx(r.after[0]), y: c.y + sy(r.after[1]) };
  arrow2d(g, c.x, c.y, E.x, E.y, GREEN, 3, 11);
  g.setLineDash([4, 3]);
  if (Math.abs(r.after[0]) > 0.01) arrow2d(g, c.x, c.y, E.x, c.y, BLUE, 1.8, 7);
  if (Math.abs(r.after[1]) > 0.01) arrow2d(g, E.x, c.y, E.x, E.y, RED, 1.8, 7);
  g.setLineDash([]);
  text(g, `v′ = ${v3(r.after)}  speed ${num(r.speedAfter, 4)}`, E.x + (E.x > w - 190 ? -6 : r.after[0] >= 0 ? 6 : -6), E.y - 8, { size: 13, align: E.x > w - 190 ? 'right' : r.after[0] >= 0 ? 'left' : 'right', color: GREEN });
  g.restore();
  text(g, `scale: 1 m/s = ${Math.round(SV)} px, 1 cm = ${Math.round(PS / 100)} px`, pad + 4, yBottom - 6, { size: 12, color: '#79829a', halo: false });
}

function bounceView() {
  const set = (m, o) => Object.assign(m, BOUNCE_BASE, o);
  return {
    id: 'bounce', topic: 'contacts', label: 'One bounce', inputTitle: 'The bounce',
    init: { ...BOUNCE_BASE },
    params: [
      { id: 'vx', label: 'along, m/s', min: -6, max: 6, step: 0.5 },
      { id: 'vy', label: 'approach, m/s', min: 0.5, max: 8, step: 0.5 },
      { id: 'depth', label: 'ended inside', min: 0, max: 0.2, step: 0.01, unit: ' m' },
      { id: 'e', label: 'restitution e', min: 0, max: 1, step: 0.05 },
      { id: 'mu', label: 'friction μ', min: 0, max: 1, step: 0.05 },
    ],
    presets: [
      { label: 'worked bounce', run: (m) => set(m, {}) },
      { label: 'e = 1', run: (m) => set(m, { e: 1 }) },
      { label: 'e = 0', run: (m) => set(m, { e: 0 }) },
      { label: 'friction 0.3', run: (m) => set(m, { mu: 0.3 }) },
      { label: 'friction stops the slide', run: (m) => set(m, { mu: 0.9 }) },
      { label: 'grazing', run: (m) => set(m, { vx: 5, vy: 0.5, e: 0.8 }) },
    ],
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['Contact: push out'],
    setup(ctx) { showOverlay(ctx, {}); },
    leave(ctx) { hideOverlay(ctx); },
    run(m) { return bounceRun(m); },
    draw(v, m, r, ctx) {
      const ov = hasOverlay(ctx);
      if (!ov) return;
      ov.painter = captioned(ov, CAPTION_BOUNCE, (g, w, h) => paintBounce(ov, g, w, h, m, r));
      ov.repaint();
    },
    explain(m, r) {
      const kept = r.kept * 100;
      const rows = [
        `normal part {vn|(v · n) n} = ${v3([0, -m.vy, 0])}, tangential part {vt|v − (v · n) n} = ${v3(r.tangent)}`,
        `after: {vt|tangential kept${m.mu > 0 ? `, times ${num(r.slide, 3)} for friction` : ''}}, {vn|normal reversed and scaled by e = ${num(m.e, 3)}}`,
        `v′ = ${v3(r.tangent.map((x) => x * r.slide))} − ${num(m.e, 3)} · ${v3([0, -m.vy, 0])} = ${v3(r.after)}`,
        `speed ${num(r.speedBefore, 4)} → ${num(r.speedAfter, 4)}; {kept|kinetic energy kept} ${num(r.speedAfter ** 2, 4)} / ${num(r.speedBefore ** 2, 4)} = ${num(Math.round(kept * 10) / 10, 3)} %`,
        `{depth|contact}: ended the step ${num(m.depth, 3)} inside the floor: {push|push out by (0, ${num(r.depth, 3)}, 0)}`,
      ];
      const status = !r.hit ? { text: 'The step did not end inside the floor: no contact, so nothing is pushed and the velocity is unchanged.', tone: 'info' }
        : m.mu > 0 && r.after[0] === 0 && m.vx !== 0
        ? { text: 'Friction removes the whole sliding motion: the particle leaves straight up.', tone: 'info' }
        : m.e === 1 && m.mu === 0 ? { text: 'e = 1 and no friction: the speed is unchanged, only the normal part reverses.', tone: 'ok' }
          : { text: `${num(Math.round((1 - r.kept) * 1000) / 10, 3)} % of the kinetic energy is lost in this contact. Only the normal part is scaled by e.`, tone: 'info' };
      return {
        hud: `v′ = {vn|${v3(r.after)}} · speed ${num(r.speedBefore, 4)} → ${num(r.speedAfter, 4)} · {kept|${num(Math.round(kept), 3)} % energy kept}`,
        rows, status,
        values: [['v′', v3(r.after), 'vn'], ['speed after', num(r.speedAfter, 4), 'vn'], ['energy kept', `${num(Math.round(kept * 10) / 10, 3)} %`, 'kept'], ['pushed out by', `${num(r.depth, 3)} m`, 'push'],
          ['normal part of v', num(r.normalSpeed, 3), 'vn'], ['tangential part of v', num(r.tangentSpeed, 3), 'vt']],
        fact: 'Restitution e is the share of the approach speed along the normal that comes back. Friction keeps only part of the sliding motion made during the step.',
      };
    },
  };
}

// ================================================================ a thin wall

const WALL_BASE = { substeps: 1, thick: 2, speed: 5, vy: 0, g: 0, e: 0.5 };
const WALL_MIN = 0.42, Y0 = 0.06, WALL_H = 0.5, FRAMES = 12;

function wallRun(m) {
  const h = FRAME / m.substeps, steps = FRAMES * m.substeps;
  const wallMax = WALL_MIN + m.thick / 100;
  const t = P.throwRun(0, Y0, m.speed, m.vy, m.g, h, steps, WALL_MIN, wallMax, m.e, 0);
  const stepLen = m.speed * h;
  return { ...t, h, steps, wallMax, stepLen, wallMin: WALL_MIN, frameLen: m.speed * FRAME };
}

const CAPTION_WALL = "The ball's position at the end of each step (blue: one step a frame, green: substeps). When a step is longer than the wall is thick, no position lands inside the wall and the hit is never seen: tunneling. Substeps shorten the step.";
function paintWall(ov, g, w, hh, m, r) {
  const pad = 14, bottom = bottomOf(ov);
  const xMax = 0.62, left = pad + 12;
  const PS = (w - left - pad) / xMax;
  const X = (x) => left + x * PS;
  const topY = ov.top + 30;
  const yf = Math.round(topY + 0.68 * (hh - bottom - topY));
  const Y = (y) => yf - y * PS;
  g.fillStyle = '#121620';
  g.fillRect(pad, yf, w - 2 * pad, Math.max(0, hh - bottom - yf));
  g.strokeStyle = '#5c667c'; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(pad, yf); g.lineTo(w - pad, yf); g.stroke();
  // the wall
  g.save();
  g.globalAlpha = ov.dim('wall');
  g.fillStyle = '#c7cdda';
  g.fillRect(X(WALL_MIN), Y(WALL_H), (r.wallMax - WALL_MIN) * PS, WALL_H * PS);
  g.restore();
  text(g, `wall ${num(m.thick, 3)} cm`, (X(WALL_MIN) + X(r.wallMax)) / 2, Y(WALL_H) - 8, { size: 13, align: 'center', color: '#c7cdda' });
  // one step's length, from the start
  g.strokeStyle = AMBER; g.lineWidth = 2;
  const by = Math.min(Y(Y0) - 26, yf - 60);
  g.beginPath(); g.moveTo(X(0), by); g.lineTo(X(r.stepLen), by); g.moveTo(X(0), by - 5); g.lineTo(X(0), by + 5); g.moveTo(X(r.stepLen), by - 5); g.lineTo(X(r.stepLen), by + 5); g.stroke();
  text(g, `one step: ${num(Number((r.stepLen * 100).toFixed(2)), 4)} cm`, X(r.stepLen / 2) + (r.stepLen * PS < 90 ? 40 : 0), by - 8, { size: 13, align: 'center', color: AMBER });
  // the path
  g.save();
  g.globalAlpha = ov.dim('step', 'wall');
  g.strokeStyle = '#4a5266'; g.lineWidth = 1;
  g.beginPath();
  r.xs.forEach((x, i) => { if (i === 0) g.moveTo(X(x), Y(r.ys[i])); else g.lineTo(X(x), Y(r.ys[i])); });
  g.stroke();
  for (let i = 0; i < r.xs.length; i++) {
    const frameEnd = i % m.substeps === 0;
    g.fillStyle = frameEnd ? '#79c0ff' : '#7ee787';
    g.beginPath(); g.arc(X(r.xs[i]), Y(r.ys[i]), frameEnd ? 4 : m.substeps > 8 ? 1.8 : 3.2, 0, 2 * Math.PI); g.fill();
  }
  g.restore();
  // the contact, or the jump
  if (r.wallStep > 0) {
    const i = r.wallStep, raw = r.xs[i - 1] + r.h * r.vxs[i - 1];
    g.strokeStyle = RED; g.lineWidth = 1.8;
    g.beginPath(); g.arc(X(raw), Y(r.ys[i]), 6.5, 0, 2 * Math.PI); g.stroke();
    text(g, `step ${i} ended inside: pushed back`, (X(WALL_MIN) + X(r.wallMax)) / 2, Y(WALL_H) - 30, { size: 13, align: 'center', color: RED });
  }
  if (r.tunnelStep > 0) {
    const i = r.tunnelStep;
    g.strokeStyle = RED; g.lineWidth = 2; g.setLineDash([5, 4]);
    g.beginPath(); g.moveTo(X(r.xs[i - 1]), Y(r.ys[i - 1]) - 14); g.quadraticCurveTo((X(r.xs[i - 1]) + X(r.xs[i])) / 2, Y(r.ys[i]) - 44, X(r.xs[i]), Y(r.ys[i]) - 14); g.stroke();
    g.setLineDash([]);
    text(g, `step ${i} jumps the wall: no step ended inside`, Math.min(w - pad - 150, (X(WALL_MIN) + X(r.wallMax)) / 2), Y(WALL_H) - 30, { size: 13, align: 'center', color: RED });
  }
  text(g, 'blue: end of a 1/60 s frame · green: a step inside a frame', pad + 4, yf + 22, { size: 12, color: '#79829a', halo: false });
}

function wallView() {
  const set = (m, o) => Object.assign(m, WALL_BASE, o);
  return {
    id: 'wall', topic: 'contacts', label: 'Thin wall', inputTitle: 'Throw and wall',
    init: { ...WALL_BASE },
    params: [
      { id: 'substeps', label: 'substeps a frame', min: 1, max: 32, step: 1 },
      { id: 'thick', label: 'wall, cm', min: 0.5, max: 10, step: 0.5 },
      { id: 'speed', label: 'speed, m/s', min: 1, max: 10, step: 0.5 },
      { id: 'vy', label: 'up, m/s', min: -2, max: 2, step: 0.5 },
      { id: 'g', label: 'gravity, m/s²', min: 0, max: 12, step: 0.01 },
      { id: 'e', label: 'restitution e', min: 0, max: 1, step: 0.05 },
    ],
    presets: [
      { label: 'tunneling: 1 substep', run: (m) => set(m, {}) },
      { label: '16 substeps: stopped', run: (m) => set(m, { substeps: 16 }) },
      { label: 'thick wall, 1 substep', run: (m) => set(m, { thick: 10 }) },
      { label: 'thrown at floor and wall', run: (m) => set(m, { substeps: 4, speed: 3, vy: 2, g: 9.81 }) },
      { label: 'slow: 1 m/s', run: (m) => set(m, { speed: 1 }) },
    ],
    home: { eye: [0, 0, 8], target: [0, 0, 0] }, grid: 'none', axes: false,
    regions: ['A thin wall', 'Contact: push out'],
    setup(ctx) { showOverlay(ctx, {}); },
    leave(ctx) { hideOverlay(ctx); },
    run(m) { return wallRun(m); },
    draw(v, m, r, ctx) {
      const ov = hasOverlay(ctx);
      if (!ov) return;
      ov.painter = captioned(ov, CAPTION_WALL, (g, w, h) => paintWall(ov, g, w, h, m, r));
      ov.repaint();
    },
    explain(m, r) {
      const cm = (x) => num(Number((x * 100).toFixed(2)), 4);
      const rows = [
        `{step|step} = speed · Δt = ${num(m.speed, 3)} m/s · 1/${60 * m.substeps} s = ${cm(r.stepLen)} cm; a frame is ${cm(r.frameLen)} cm`,
        `{wall|wall}: ${cm(WALL_MIN)} to ${cm(r.wallMax)} cm, ${num(m.thick, 3)} cm thick; ${m.substeps} substep${m.substeps > 1 ? 's' : ''} a frame, ${r.steps} steps in ${FRAMES} frames`,
        `a step that ends inside the wall is put back on the face it came from; one that ends past it is never inside`,
      ];
      let status;
      if (r.tunnelStep > 0) status = { text: `Tunneling: step ${r.tunnelStep} begins at ${cm(r.xs[r.tunnelStep - 1])} cm and ends at ${cm(r.xs[r.tunnelStep])} cm, past the wall's far face at ${cm(r.wallMax)} cm. No step ended inside, so nothing pushed the particle.`, tone: 'bad' };
      else if (r.wallStep > 0) status = { text: `Stopped at step ${r.wallStep}: the step ended inside the wall (${cm(r.xs[r.wallStep - 1] + r.h * r.vxs[r.wallStep - 1])} cm), and the particle was put back at ${cm(WALL_MIN)} cm with its velocity reversed and scaled by e = ${num(m.e, 3)}.`, tone: 'ok' };
      else status = { text: 'The particle does not reach the wall in these frames.', tone: 'info' };
      return {
        hud: `{step|step ${cm(r.stepLen)} cm} against {wall|wall ${num(m.thick, 3)} cm} · ${r.tunnelStep > 0 ? 'jumps it' : r.wallStep > 0 ? 'stopped' : 'no contact'}`,
        rows, status,
        values: [['step length', `${cm(r.stepLen)} cm`, 'step'], ['per frame', `${cm(r.frameLen)} cm`, 'step'], ['wall', `${num(m.thick, 3)} cm`, 'wall'],
          ['steps taken', `${r.steps}`, 'step'], ['wall contact at step', r.wallStep > 0 ? `${r.wallStep}` : 'none', 'wall'], ['jumped it at step', r.tunnelStep > 0 ? `${r.tunnelStep}` : 'none', 'wall']],
        fact: 'A step shorter than the wall cannot jump it: it must end inside at some step. Substeps shorten the step without shortening the frame.',
      };
    },
  };
}

export function contactViews() { return [bounceView(), wallView()]; }
