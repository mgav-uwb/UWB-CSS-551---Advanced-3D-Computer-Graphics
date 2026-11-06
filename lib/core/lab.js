// lab: the runtime behind the course's "lab" demos (vector-basics, mesh-lab). A lab is a catalog of views under topic buttons. A
// view is one relationship shown four ways, all live: the 3D picture with draggable handles, the formula with its numbers
// substituted (a strip over the scene and a card in the rail), a table of values, and the code in both tracks.
//
// The code card shows sections of the program files themselves (lib/programs/<name>/), parsed the way the "</>" window does, and
// each line that declares a variable shows that variable's current value: the output of the WebGL program's own function, which
// the demo calls directly, and which the program's test holds the Unity track to. Hovering a formula term or a line of code dims
// everything else in the picture.
//
//   makeLab(container, { stage, controls, name, topics, views, keys, program, files, help, legend, header, settings })
//     topics   [{ id, label }]
//     views    [{ id, topic, label, group?, init, handles?, params?, home, presets?, regions?, keys?, grid?,
//                 run(m, ctx), draw(viz, m, r, ctx), explain(m, r, ctx), enter?(m, ctx), edited?(m, ctx),
//                 panel?(el, m, r, ctx), panelTitle?, setup?(ctx), leave?(ctx), onPick?(ray, e, ctx), onHover?(ray, e, ctx) }]
//              m holds a view's editable values (Vector3s and numbers); views with the same group share them.
//              explain returns { hud, rows, status?: { text, tone }, chart?, values?: [[label, text, key]], fact? }.
//     keys     formula-term colors, { key: hex }; a view's keys extend them
//     program  the object lib/core/code-window.js opens; files = { webgl, unity }, the two files the code card reads
//     header   (cardEl, ctx) => ...: controls of the lab's own, above the topic buttons
//   ctx        { world, scene, camera, canvas, renderer, sceneEl, shell, mirror, render, update, refresh, setView, state, modelRay(e) }
//
// Embed tokens (data-controls or ?controls=): view:<id> starts on a view; lock hides the topic and view buttons, leaving that one
// view on the slide.
import * as THREE from '../vendor/three.module.js';
import { SliderRow } from './cockpit.js';
import { makeScene } from './scene-shell.js';
import { makeShell } from './demo-shell.js';
import { makeOrbitCamera } from './orbit-camera.js';
import { openCodeWindow } from './code-window.js';
import { parseSection, returnKeys, sectionHtml } from './lab-code.js';
import { Viz, COL, V, css, add, sub } from './lab-viz.js';

const TRACK_LABEL = { webgl: 'WebGL · three.js', unity: 'Unity · C#' };
const TRACK_KEY = 'css551-code-track';   // the choice lib/code-tabs.js remembers on the deck and chapter pages

const CSS = `
@media (min-width: 641px) {
  .cockpit .demo-shell-root.lab-root .demo-shell-rail { flex: 0 0 clamp(400px, 36vw, 560px); }
  .cockpit .demo-shell-root.lab-root .demo-shell-rail--embed { flex: 0 0 440px; max-height: 600px; }
  .reveal section.demo-full [data-demo] .demo-shell-root.lab-root .demo-shell-rail--embed { flex: 0 0 440px; display: flex; flex-direction: column; max-height: 600px; }
}
.cockpit .demo-shell-root.lab-root.demo-shell-root--embed { max-width: 100%; }
.lab-root .demo-shell-rail { text-align: left; }   /* reveal.js centers everything */
.lab-root .demo-shell-card { padding: 8px 10px; }
.lab-root .demo-shell-card h3 { margin: 0 0 6px; display: flex; align-items: center; gap: 6px; }
.lab-btns { display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 5px; }
.lab-btns:last-child { margin-bottom: 0; }
.lab-btn { background: #1b1e27; color: #aab2c5; border: 1px solid #2c3140; border-radius: 4px; padding: 3px 7px; cursor: pointer;
  font: 500 11.5px/1.25 -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
.lab-btn:hover { background: #242836; color: #e7eaf0; }
.lab-btn.on { background: #17301f; border-color: #2d6b46; color: #7ee787; font-weight: 600; }
.lab-btns.lab-topics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); }
.lab-topics .lab-btn { padding: 3px 2px; text-align: center; }
.lab-presets .lab-btn { background: #171a23; color: #8fa3c7; border-style: dashed; font-size: 11px; }
.lab-presets .lab-btn:hover { color: #e7eaf0; }
.lab-mini { margin-left: auto; background: none; border: 1px solid #2c3140; border-radius: 4px; color: #8b93a7; cursor: pointer;
  font: 500 10.5px/1.3 -apple-system, Segoe UI, Roboto, sans-serif; padding: 1px 6px; text-transform: none; letter-spacing: 0; }
.lab-mini:hover { color: #e7eaf0; }
.lab-vrow { display: grid; grid-template-columns: 38px 1fr 1fr 1fr; gap: 6px; align-items: center; margin-bottom: 3px; }
.lab-vname { font: 700 12.5px/1 'SF Mono', Menlo, Consolas, monospace; white-space: nowrap; overflow: hidden; }
.lab-cell { display: flex; align-items: center; gap: 3px; min-width: 0; }
.lab-cell input[type=range] { flex: 1 1 auto; min-width: 0; width: 100%; height: 14px; margin: 0; }
.lab-num { flex: 0 0 34px; width: 34px; box-sizing: border-box; background: #0f1117; color: #d6dbe5; border: 1px solid #2c3140; border-radius: 3px;
  font: 11px/1.3 'SF Mono', Menlo, Consolas, monospace; padding: 1px 2px; text-align: right; }
.lab-num:focus { outline: 1px solid #3a4c6e; color: #fff; }
.lab-axes { display: grid; grid-template-columns: 38px 1fr 1fr 1fr; gap: 6px; font: 10px/1 'SF Mono', Menlo, monospace; color: #5c667c; margin-bottom: 3px; text-align: center; }
.lab-param { display: flex; align-items: center; gap: 4px; }
.lab-param .slider-row { flex: 1 1 auto; margin-bottom: 3px; min-width: 0; }
.lab-play { flex: 0 0 auto; background: #1b1e27; color: #aab2c5; border: 1px solid #2c3140; border-radius: 4px; width: 22px; height: 20px; padding: 0; cursor: pointer; font-size: 10px; line-height: 1; }
.lab-play.on { color: #7ee787; border-color: #2d6b46; }
.lab-rows { font: 12.5px/1.55 -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-variant-numeric: tabular-nums; color: #c7cdda; }
.lab-rows > div { margin-bottom: 1px; }
.lab-t { font-weight: 600; cursor: default; padding: 0 1.5px; }
.lab-t:hover, [data-k]:hover > .lab-t { text-decoration: underline; text-underline-offset: 2px; }
.lab-status { margin: 5px 0 0; padding: 3px 7px; border-radius: 4px; font: 600 12px/1.35 -apple-system, Segoe UI, Roboto, sans-serif; }
.lab-status.ok { background: #122419; color: #7ee787; } .lab-status.warn { background: #2a2110; color: #ffc46b; }
.lab-status.bad { background: #2c1516; color: #ff8d85; } .lab-status.info { background: #131e2e; color: #8ec2ff; }
.lab-fact { margin: 5px 0 0; font: 11.5px/1.4 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; }
.lab-chart { display: block; width: 100%; height: 62px; margin-top: 5px; }
.lab-root .demo-shell-card .lab-values { margin-top: 5px; font-size: 11px; }
.lab-root .demo-shell-card .lab-values td { padding: 2px 4px; white-space: normal; text-align: left; }
.lab-root .demo-shell-card .lab-values td.value-label { color: #8b93a7; white-space: nowrap; }
.lab-tabs { display: flex; gap: 3px; flex: 1; align-items: center; }
.lab-tab { background: #14161d; color: #8b93a7; border: 1px solid #262a35; border-radius: 4px; padding: 2px 7px; cursor: pointer;
  font: 600 10.5px/1.3 -apple-system, Segoe UI, Roboto, sans-serif; text-transform: none; letter-spacing: 0; }
.lab-tab.on { background: #1c2433; color: #e7eaf0; border-color: #3a4c6e; }
.lab-sec { margin: 6px 0 2px; font: 600 11px/1.3 -apple-system, Segoe UI, Roboto, sans-serif; color: #aab2c5; }
.lab-note { margin: 0 0 4px; font: 11px/1.4 -apple-system, Segoe UI, Roboto, sans-serif; color: #79829a; }
.lab-code { background: #0b0c10; border: 1px solid #1f2330; border-radius: 4px; padding: 5px 0; overflow-x: auto;
  font: 11px/1.5 'SF Mono', Menlo, Consolas, monospace; color: #d6dbe5; text-align: left; }
.lab-cl { white-space: pre; padding: 0 7px; min-width: max-content; }
.lab-cl[data-k]:hover { background: #171b26; }
.lab-cv { margin-left: 1.2em; color: #ffd166; opacity: 0.95; }
.lab-sig { color: #6d7a94; }
.lab-res { color: #ffd166; opacity: 0.85; white-space: pre-wrap; min-width: 0; }
.lab-code .cwin-c { color: #8f9bb0; font-style: italic; } .lab-code .cwin-s { color: #a5d6a7; }
.lab-code .cwin-n { color: #f2a65a; } .lab-code .cwin-k { color: #8ab4ff; }
.lab-hud { position: absolute; left: 8px; bottom: 8px; max-width: calc(100% - 210px); padding: 5px 10px; background: rgba(11, 12, 16, 0.8); border: 1px solid #262a35;
  border-radius: 5px; color: #e7eaf0; font: 500 15px/1.35 -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-variant-numeric: tabular-nums; pointer-events: none; z-index: 4; }
/* on a slide the presenter narrates, and the full demo is one click away: height goes to the code, and the strip gets its own line */
.demo-shell-root--embed .lab-note, .demo-shell-root--embed .lab-fact, .demo-shell-root--embed .lab-values,
.demo-shell-root--embed .lab-region, .demo-shell-root--embed .lab-pick h3 { display: none; }
.demo-shell-root--embed .lab-topics .lab-btn { font-size: 10.5px; padding: 3px 1px; white-space: nowrap; }
.demo-shell-root--embed .lab-chart { height: 42px; }
.demo-shell-root--embed .lab-hud { bottom: 34px; max-width: calc(100% - 16px); font-size: 14px; }
.lab-views { position: absolute; right: 8px; bottom: 8px; display: flex; gap: 3px; z-index: 5; }
.lab-views .lab-btn { background: rgba(20, 22, 29, 0.85); font-size: 10.5px; padding: 2px 6px; }
.lab-views .lab-btn.on { background: #17301f; }
.lab-views .lab-sep { width: 5px; }
`;
function injectCss() {
  if (document.getElementById('lab-css')) return;
  const st = document.createElement('style');
  st.id = 'lab-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** formula markup: {key} or {key|text} becomes a colored term that highlights key in the picture when hovered */
function fx(text, keys) {
  return text.replace(/\{([^{}|]+)(?:\|([^{}]*))?\}/g, (_, key, shown) => {
    const color = keys[key] ?? COL.white;
    return `<span class="lab-t" data-k="${esc(key)}" style="color:${css(color)}">${shown ?? key}</span>`;
  });
}

function buttonRow(parent, cls) {
  const row = document.createElement('div');
  row.className = `lab-btns ${cls}`;
  parent.appendChild(row);
  return row;
}

function button(parent, label, onClick, cls = 'lab-btn') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = label;
  b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); b.blur(); });
  parent.appendChild(b);
  return b;
}

// ---------------------------------------------------------------- the code card's text

const sources = new Map();
function loadSource(url) {
  if (!sources.has(url)) sources.set(url, fetch(url).then((r) => (r.ok ? r.text() : null)).catch(() => null));
  return sources.get(url);
}

// ---------------------------------------------------------------- a small chart

function chartSvg(c) {
  const W = 400, H = 62, L = 26, R = 6, T = 6, B = 14;
  const X = (x) => L + ((x - c.x[0]) / (c.x[1] - c.x[0])) * (W - L - R);
  const Y = (y) => H - B - ((y - c.y[0]) / (c.y[1] - c.y[0])) * (H - T - B);
  let s = `<svg class="lab-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${esc(c.curve ?? 'chart')}">`;
  s += `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="#2c3140"/><line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" stroke="#2c3140"/>`;
  if (c.y[0] < 0 && c.y[1] > 0) s += `<line x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}" stroke="#2c3140" stroke-dasharray="3 3"/>`;
  for (const bar of c.bars ?? []) {
    const x0 = X(bar.x - 0.4), x1 = X(bar.x + 0.4), y1 = Y(bar.y);
    s += `<rect x="${x0.toFixed(1)}" y="${y1.toFixed(1)}" width="${(x1 - x0).toFixed(1)}" height="${(Y(c.y[0]) - y1).toFixed(1)}" fill="${css(bar.color)}"/>`;
  }
  for (const series of c.series ?? []) {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const x = c.x[0] + (i / 80) * (c.x[1] - c.x[0]);
      const y = series.fn(x);
      if (Number.isFinite(y)) pts.push(`${X(x).toFixed(1)},${Y(Math.min(c.y[1], Math.max(c.y[0], y))).toFixed(1)}`);
    }
    s += `<polyline fill="none" stroke="${css(series.color)}" stroke-width="1.5" vector-effect="non-scaling-stroke" points="${pts.join(' ')}"/>`;
  }
  if (Number.isFinite(c.at) && Number.isFinite(c.atY)) {
    const x = X(Math.min(c.x[1], Math.max(c.x[0], c.at)));
    const y = Y(Math.min(c.y[1], Math.max(c.y[0], c.atY)));
    s += `<line x1="${x}" x2="${x}" y1="${T}" y2="${H - B}" stroke="#ffd166" stroke-width="1" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"/>`;
    s += `<circle cx="${x}" cy="${y}" r="3.2" fill="#ffd166"/>`;
  }
  const label = (x, y, t, a = 'start') => `<text x="${x}" y="${y}" fill="#79829a" font-size="9.5" text-anchor="${a}" font-family="-apple-system, Segoe UI, Roboto, sans-serif">${esc(t)}</text>`;
  s += label(L + 4, T + 8, c.curve ?? '');
  s += label(L, H - 3, String(c.x[0])) + label(W - R, H - 3, String(c.x[1]), 'end') + label((L + W - R) / 2, H - 3, c.xLabel ?? '', 'middle');
  s += label(L - 3, T + 7, String(Number(c.y[1].toFixed(1))), 'end') + label(L - 3, H - B, String(Number(c.y[0].toFixed(1))), 'end');
  return `${s}</svg>`;
}

// ---------------------------------------------------------------- the demo

export function makeLab(container, { stage = 'embed', controls = [], name, topics, views, keys: baseKeys = {}, program, files, help, legend, header, settings: extraSettings = [] }) {
  injectCss();
  for (const v of views) { v.handles ??= []; v.init ??= {}; v.regions ??= []; }
  const viewById = (id) => views.find((v) => v.id === id);
  const tokens = controls ?? [];
  const viewTok = tokens.find((t) => t.startsWith('view:'));
  const locked = tokens.includes('lock');
  let view = viewById(viewTok ? viewTok.slice(5) : '') ?? views[0];
  if (viewTok && view.id !== viewTok.slice(5)) console.warn(`${name}: unknown view "${viewTok.slice(5)}"; using ${view.id}`);

  const nav = { orbitSpeed: 0.4, zoomSpeed: 0.12, moveSpeed: 3, rollRate: 60, snap: 0.1 };
  const disp = { grid: true, axes: true };
  let sc, cam, viz = null, mirror = false, hoverKey = null;

  const settings = [
    ...extraSettings,
    { label: 'snap', decimals: 2, title: 'Dragged positions snap to this step; 0 turns it off. Default 0.1',
      getCurrent: () => nav.snap, apply: (v) => { nav.snap = Math.max(0, Math.min(1, v)); } },
    { label: 'orbit', decimals: 2, title: 'Orbit sensitivity, deg per pixel of drag, default 0.4',
      getCurrent: () => nav.orbitSpeed, apply: (v) => { nav.orbitSpeed = Math.max(0.02, Math.min(2, v)); } },
    { label: 'zoom', decimals: 2, title: 'Zoom step, fraction of distance per wheel notch, default 0.12',
      getCurrent: () => nav.zoomSpeed, apply: (v) => { nav.zoomSpeed = Math.max(0.02, Math.min(0.5, v)); } },
    { label: 'move', decimals: 1, title: 'WASD move speed, units/sec, default 3',
      getCurrent: () => nav.moveSpeed, apply: (v) => { nav.moveSpeed = Math.max(0.1, Math.min(20, v)); } },
    { label: 'grid', toggle: true, title: 'Show the grid',
      getCurrent: () => disp.grid, apply: (v) => { disp.grid = v; applyGrid(); render(); } },
    { label: 'axes', toggle: true, title: 'Show the world axes',
      getCurrent: () => disp.axes, apply: (v) => { disp.axes = v; applyGrid(); update(); } },
  ];

  const shell = makeShell(container, { stage, help: { html: help }, code: program, settings, nav: 'orbit', legend });
  shell.rootEl.classList.add('lab-root');
  sc = makeScene(shell.sceneEl, { fill: true });

  // Everything lives in one group, so LH can mirror the world in z without changing a single number.
  const world = new THREE.Group();
  sc.scene.add(world);
  world.add(sc.grid, sc.axes);
  const xyGrid = new THREE.GridHelper(10, 10, 0x3a4152, 0x262a35);
  xyGrid.rotation.x = Math.PI / 2;
  xyGrid.visible = false;
  world.add(xyGrid);
  function applyGrid() {
    sc.grid.visible = disp.grid && view.grid !== 'xy' && view.grid !== 'none';
    xyGrid.visible = disp.grid && view.grid === 'xy';
    sc.axes.visible = disp.axes && view.axes !== false;
  }

  const render = () => {
    for (const sp of viz ? viz.labels : []) {
      const d = sc.camera.position.distanceTo(sp.getWorldPosition(new THREE.Vector3()));
      sp.scale.set(d * 0.034 * sp.userData.aspect, d * 0.034, 1);
    }
    sc.render();
  };

  const ctx = {
    world, scene: sc.scene, camera: sc.camera, renderer: sc.renderer, canvas: sc.renderer.domElement, sceneEl: shell.sceneEl, shell, stage,
    get mirror() { return mirror; },
    render: () => render(),
    update: () => changed(),
    refresh: () => update(),
    setView: (id) => setView(viewById(id)),
    state: () => stateOf(view),
    /** the mouse's ray in the model's coordinates, as origin and unit direction arrays: LH mirrors the world, not the numbers */
    modelRay(e) {
      ray.setFromCamera(ndc(e), sc.camera);
      const o = ray.ray.origin, d = ray.ray.direction, sign = mirror ? -1 : 1;
      return { origin: [o.x, o.y, sign * o.z], dir: [d.x, d.y, sign * d.z] };
    },
  };

  // ---- values: a view's own, or its group's
  const states = {}, groups = {};
  function fill(target, init) {
    for (const [k, v] of Object.entries(init)) if (!(k in target)) target[k] = Array.isArray(v) ? V(...v) : v;
    return target;
  }
  function stateOf(vw) {
    if (vw.group) return fill(groups[vw.group] ??= {}, vw.init);
    return states[vw.id] ??= fill({}, vw.init);
  }
  function applySet(m, set) {
    for (const [k, v] of Object.entries(set)) {
      if (Array.isArray(v)) { if (m[k]) m[k].set(v[0], v[1], v[2]); else m[k] = V(...v); } else m[k] = v;
    }
  }
  const baseOf = (h, m) => (h.base ? m[h.base] : null);
  const tipOf = (h, m) => (h.base ? add(baseOf(h, m), m[h.id]) : m[h.id].clone());

  // ---- rail
  const pickCard = shell.addCard('Topic');
  pickCard.classList.add('lab-pick');
  const topicRow = buttonRow(pickCard, 'lab-topics');
  const viewRow = buttonRow(pickCard, 'lab-subviews');
  const presetRow = buttonRow(pickCard, 'lab-presets');
  if (locked) pickCard.querySelector('h3').textContent = 'Cases';
  topicRow.style.gridTemplateColumns = `repeat(${topics.length <= 6 ? topics.length : 5}, minmax(0, 1fr))`;
  const topicBtns = {};
  if (locked) { topicRow.style.display = 'none'; viewRow.style.display = 'none'; } else {
    for (const t of topics) {
      topicBtns[t.id] = button(topicRow, t.label, () => setView(views.find((v) => v.topic === t.id)));
      topicBtns[t.id].dataset.topic = t.id;
    }
  }

  const inputCard = shell.addCard('Vectors');
  const inputTitle = inputCard.querySelector('h3');
  const resetBtn = document.createElement('button');
  resetBtn.type = 'button';
  resetBtn.className = 'lab-mini';
  resetBtn.textContent = 'reset';
  resetBtn.addEventListener('click', () => { resetBtn.blur(); resetView(); });
  inputTitle.appendChild(resetBtn);
  const inputBody = document.createElement('div');
  inputCard.appendChild(inputBody);

  const panelCard = shell.addCard('');
  const panelTitleEl = panelCard.querySelector('h3');
  const panelBody = document.createElement('div');
  panelCard.appendChild(panelBody);

  const relCard = shell.addCard('Relationship');
  const relBody = document.createElement('div');
  relCard.appendChild(relBody);

  const codeCard = shell.addCard('Code');
  const codeTitle = codeCard.querySelector('h3');
  codeTitle.textContent = '';
  const tabs = document.createElement('div');
  tabs.className = 'lab-tabs';
  codeTitle.appendChild(tabs);
  let track = 'webgl';
  try { const saved = localStorage.getItem(TRACK_KEY); if (saved === 'unity' || saved === 'webgl') track = saved; } catch (e) { /* storage blocked: session only */ }
  const tabBtns = {};
  for (const [id, label] of [['webgl', TRACK_LABEL.webgl], ['unity', TRACK_LABEL.unity], ['both', 'Both']]) {
    tabBtns[id] = button(tabs, label, () => setTrack(id), 'lab-tab');
    tabBtns[id].dataset.track = id;
  }
  const wholeBtn = document.createElement('button');
  wholeBtn.type = 'button';
  wholeBtn.className = 'lab-mini';
  wholeBtn.textContent = '</> whole program';
  wholeBtn.title = 'The whole program, both tracks';
  wholeBtn.addEventListener('click', () => {
    wholeBtn.blur();
    openCodeWindow(shell.rootEl, program);
  });
  codeTitle.appendChild(wholeBtn);
  const codeBody = document.createElement('div');
  codeCard.appendChild(codeBody);

  function setTrack(id) {
    track = id;
    if (id !== 'both') {
      try { localStorage.setItem(TRACK_KEY, id); } catch (e) { /* storage blocked: session only */ }
      if (window.CodeTabs) window.CodeTabs.select(id);
    }
    for (const [k, b] of Object.entries(tabBtns)) b.classList.toggle('on', k === id);
    renderCode();
  }

  // ---- overlays
  const hud = document.createElement('div');
  hud.className = 'lab-hud';
  shell.sceneEl.appendChild(hud);
  const camRow = document.createElement('div');
  camRow.className = 'lab-views';
  shell.sceneEl.appendChild(camRow);
  for (const ev of ['mousedown', 'wheel']) camRow.addEventListener(ev, (e) => e.stopPropagation());
  const camViews = {
    '3D': () => view.home,
    'x-y': () => ({ eye: [0, 0.4, 12], target: [0, 0.4, 0] }),
    'x-z': () => ({ eye: [0, 12, 0.02], target: [0, 0, 0] }),
    'y-z': () => ({ eye: [12, 0.4, 0], target: [0, 0.4, 0] }),
  };
  for (const name of Object.keys(camViews)) {
    const b = button(camRow, name, () => { cam.setHome(camViews[name]()); });
    b.title = name === '3D' ? 'The view\'s own camera' : `Look straight at the ${name} plane`;
  }
  const sep = document.createElement('span');
  sep.className = 'lab-sep';
  camRow.appendChild(sep);
  const handBtn = button(camRow, 'RH', () => {
    mirror = !mirror;
    world.scale.z = mirror ? -1 : 1;
    world.updateMatrixWorld(true);
    handBtn.textContent = mirror ? 'LH' : 'RH';
    handBtn.classList.toggle('on', mirror);
    update();
  });
  handBtn.title = 'Right-handed axes (WebGL, three.js) or left-handed (Unity): the same numbers, a mirror image';

  // ---- the controls for one view
  const sliders = {};
  const rows = [];
  let playing = null;

  function stopPlay() {
    if (playing) { cancelAnimationFrame(playing.raf); playing.btn.classList.remove('on'); playing.btn.textContent = '▶'; }
    playing = null;
  }

  function startPlay(p, btn) {
    const m = stateOf(view);
    const s = { btn, raf: 0, last: 0, dir: 1 };
    playing = s;
    btn.classList.add('on');
    btn.textContent = '❚❚';
    const span = p.max - p.min;
    function step(time) {
      if (playing !== s) return;
      const dt = s.last ? (time - s.last) / 1000 : 0;
      s.last = time;
      let v = m[p.id] + s.dir * dt * (span / 3);
      if (v >= p.max) { v = p.max; s.dir = -1; }
      if (v <= p.min) { v = p.min; s.dir = 1; }
      m[p.id] = v;
      sliders[p.id].set(v, { exact: true });
      changed();
      s.raf = requestAnimationFrame(step);
    }
    s.raf = requestAnimationFrame(step);
  }

  function buildInputs() {
    const m = stateOf(view);
    inputBody.innerHTML = '';
    rows.length = 0;
    for (const k of Object.keys(sliders)) delete sliders[k];
    if (view.handles.length) {
      const head = document.createElement('div');
      head.className = 'lab-axes';
      head.innerHTML = '<span></span><span>x</span><span>y</span><span>z</span>';
      inputBody.appendChild(head);
    }
    for (const h of view.handles) {
      const row = document.createElement('div');
      row.className = 'lab-vrow';
      const name = document.createElement('span');
      name.className = 'lab-vname';
      name.textContent = h.label ?? h.id;
      name.style.color = css(h.color);
      name.dataset.k = h.id;
      name.title = h.base ? `the vector ${h.id}, drawn from ${h.base}` : `${h.id}`;
      row.appendChild(name);
      const cells = {};
      for (const axis of ['x', 'y', 'z']) {
        const cell = document.createElement('div');
        cell.className = 'lab-cell';
        row.appendChild(cell);
        if (h.fixed === axis) continue;
        const range = document.createElement('input');
        range.type = 'range';
        range.min = '-5';
        range.max = '5';
        range.step = '0.1';
        range.setAttribute('aria-label', `${h.id} ${axis}`);
        range.style.accentColor = css(h.color);
        const num = document.createElement('input');
        num.type = 'text';
        num.inputMode = 'decimal';
        num.spellcheck = false;
        num.className = 'lab-num';
        num.title = 'Type a value, then Enter. Arrow keys step by 0.1, Shift by 1';
        num.setAttribute('aria-label', `${h.id} ${axis}, exact value`);
        cell.append(range, num);
        cells[axis] = { range, num };
        range.addEventListener('input', () => { m[h.id][axis] = parseFloat(range.value); changed(); });
        range.addEventListener('change', () => range.blur());
        const commit = () => {
          const v = parseFloat(num.value.replace('−', '-'));
          if (Number.isFinite(v)) { m[h.id][axis] = Math.max(-9, Math.min(9, v)); changed(); } else syncInputs();
        };
        num.addEventListener('focus', () => num.select());
        num.addEventListener('change', commit);
        num.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') { num.blur(); e.stopPropagation(); }
          else if (e.key === 'Escape') { syncInputs(true); num.blur(); e.stopPropagation(); }
          else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            const delta = (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 1 : 0.1);
            m[h.id][axis] = Math.max(-9, Math.min(9, Number((m[h.id][axis] + delta).toFixed(6))));
            changed();
            num.value = fmtNum(m[h.id][axis]);
            num.select();
          }
        });
      }
      inputBody.appendChild(row);
      rows.push({ h, cells });
    }
    for (const p of view.params ?? []) {
      const wrap = document.createElement('div');
      wrap.className = 'lab-param';
      inputBody.appendChild(wrap);
      const unitText = p.unit ?? '';
      sliders[p.id] = new SliderRow(wrap, {
        id: `vector-basics-${view.id}-${p.id}`, label: p.label, min: p.min, max: p.max, step: p.step, value: m[p.id], typed: true,
        format: (v) => `${v.toFixed(p.step >= 1 ? 0 : 2)}${unitText}`,
      });
      sliders[p.id].set(m[p.id], { exact: true });
      sliders[p.id].onInput((v) => { m[p.id] = v; changed(); });
      if (p.play) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'lab-play';
        btn.textContent = '▶';
        btn.title = `Play ${p.label}`;
        btn.addEventListener('click', () => {
          btn.blur();
          const was = playing && playing.btn === btn;
          stopPlay();
          if (!was) startPlay(p, btn);
        });
        wrap.appendChild(btn);
      }
    }
    inputCard.querySelector('h3').firstChild.textContent = view.handles.length ? (view.inputTitle ?? 'Vectors') : (view.inputTitle ?? 'Coefficients');
    inputCard.style.display = view.handles.length || (view.params ?? []).length ? '' : 'none';
  }

  const fmtNum = (v) => String(Number(v.toFixed(2)));
  function syncInputs(force = false) {
    const m = stateOf(view);
    for (const { h, cells } of rows) {
      for (const [axis, { range, num }] of Object.entries(cells)) {
        const v = m[h.id][axis];
        range.value = String(v);
        if (force || document.activeElement !== num) num.value = fmtNum(v);
      }
    }
    for (const p of view.params ?? []) {
      if (document.activeElement !== sliders[p.id].readout) sliders[p.id].set(m[p.id], { exact: true });
    }
  }

  function buildPicks() {
    for (const [id, b] of Object.entries(topicBtns)) b.classList.toggle('on', id === view.topic);
    if (!locked) {
      viewRow.innerHTML = '';
      const inTopic = views.filter((v) => v.topic === view.topic);
      viewRow.style.display = inTopic.length > 1 ? '' : 'none';
      if (inTopic.length > 1) {
        for (const v of inTopic) {
          const b = button(viewRow, v.label, () => setView(v));
          b.dataset.view = v.id;
          b.classList.toggle('on', v === view);
        }
      }
    }
    presetRow.innerHTML = '';
    for (const p of view.presets ?? []) {
      button(presetRow, p.label, () => {
        const m = stateOf(view);
        stopPlay();
        if (p.run) p.run(m, ctx); else applySet(m, p.set);
        changed();
      });
    }
    pickCard.querySelector('h3').textContent = locked ? 'Cases' : 'Topic';
  }

  // ---- the code card
  const parsed = { webgl: new Map(), unity: new Map() };
  let lastResult = {};
  let codeSeq = 0;
  async function renderCode() {
    const seq = ++codeSeq;
    const tracks = track === 'both' ? ['webgl', 'unity'] : [track];
    const texts = {};
    for (const t of tracks) {
      texts[t] = await loadSource(new URL(files[t], program.base).href);
      if (seq !== codeSeq) return;
    }
    let html = '';
    for (const t of tracks) {
      if (texts[t] == null) { html += `<p class="lab-fact">Could not load ${esc(files[t])}.</p>`; continue; }
      if (track === 'both') html += `<div class="lab-sec">${esc(TRACK_LABEL[t])}</div>`;
      view.regions.forEach((name, i) => {
        if (!parsed[t].has(name)) {
          const sec = parseSection(texts[t], name, t);
          if (sec) sec.resultKeys = returnKeys(texts[t], name);
          parsed[t].set(name, sec);
        }
        const sec = parsed[t].get(name);
        if (!sec) return;
        if (track !== 'both') html += `<div class="lab-sec lab-region">${esc(name)}</div>`;
        if (track !== 'both' && i === view.regions.length - 1 && t === tracks[0]) html += `<p class="lab-note">${esc(sec.note).replace(/\n/g, ' ')}</p>`;
        html += `<div class="lab-code">${sectionHtml(sec, t, lastResult)}</div>`;
      });
    }
    codeBody.innerHTML = html;
    codeBody.dataset.rendered = `${view.id} ${track}`;
  }

  // ---- one update: run the view's code, then let every panel show the same result
  function update() {
    const m = stateOf(view);
    const r = view.run ? view.run(m, ctx) : {};
    lastResult = r;
    if (viz) { world.remove(viz.group); viz.dispose(); }
    viz = new Viz();
    if (disp.axes && view.axes !== false) {
      viz.label('x', V(2.15, 0, 0), COL.gray, '');
      viz.label('y', V(0, 2.15, 0), COL.gray, '');
      viz.label('z', V(0, 0, 2.15), COL.gray, '');
    }
    view.draw?.(viz, m, r, ctx);
    for (const h of view.handles) {
      const tip = tipOf(h, m);
      const active = (drag && drag.h === h) || hoverHandle === h;
      const size = view.handleSize ?? 0.1;
      viz.point(tip, active ? COL.white : h.color, { k: h.id, r: active ? size * 1.4 : size });
      viz.label(h.label ?? h.id, tip, h.color, h.anchor ?? 'a', h.id);
    }
    world.add(viz.group);
    viz.setHighlight(hoverKey);

    const keys = { ...baseKeys, ...view.keys };
    const ex = view.explain(m, r, ctx);
    hud.innerHTML = fx(ex.hud ?? '', keys);
    hud.style.display = ex.hud ? '' : 'none';
    panelCard.style.display = view.panel ? '' : 'none';
    if (view.panel) {
      panelTitleEl.textContent = view.panelTitle ?? 'Data';
      view.panel(panelBody, m, r, ctx);
    }
    let html = `<div class="lab-rows">${ex.rows.map((row) => `<div>${fx(row, keys)}</div>`).join('')}</div>`;
    if (ex.status) html += `<div class="lab-status ${ex.status.tone}">${esc(ex.status.text)}</div>`;
    if (ex.chart) html += chartSvg(ex.chart);
    if (ex.values && ex.values.length) {
      html += '<table class="mat-panel lab-values"><tbody>';
      for (let i = 0; i < ex.values.length; i += 2) {
        html += '<tr>';
        for (const cell of ex.values.slice(i, i + 2)) {
          const [label, text, key] = cell;
          const color = key ? css(keys[key] ?? COL.white) : '#d6dbe5';
          html += `<td class="value-label"${key ? ` data-k="${esc(key)}"` : ''}>${esc(label)}</td><td style="color:${color}"${key ? ` data-k="${esc(key)}"` : ''}>${esc(text)}</td>`;
        }
        html += '</tr>';
      }
      html += '</tbody></table>';
    }
    if (ex.fact) html += `<p class="lab-fact">${esc(ex.fact)}</p>`;
    relBody.innerHTML = html;

    syncInputs();
    renderCode();
    render();
  }

  /** a value changed: let the view keep its other forms in step, then redraw */
  function changed() {
    view.edited?.(stateOf(view), ctx);
    update();
  }

  function setView(next) {
    stopPlay();
    const prevHome = view.home;
    view.leave?.(ctx);
    view = next;
    next.setup?.(ctx);
    next.enter?.(stateOf(next), ctx);
    buildPicks();
    buildInputs();
    applyGrid();
    if (cam && next.home && prevHome !== next.home) cam.setHome(next.home);
    shell.railEl.scrollTop = 0;
    update();
  }

  function resetView() {
    stopPlay();
    const m = stateOf(view);
    applySet(m, view.init);
    view.enter?.(m, ctx);
    buildInputs();
    changed();
  }

  // ---- dragging handles: a capture listener takes the mouse before the orbit camera sees it
  const canvas = sc.renderer.domElement;
  const ray = new THREE.Raycaster();
  let drag = null, hoverHandle = null;

  const toWorld = (p) => new THREE.Vector3(p.x, p.y, mirror ? -p.z : p.z);
  const fromWorld = (p) => new THREE.Vector3(p.x, p.y, mirror ? -p.z : p.z);

  function ndc(e) {
    const b = canvas.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - b.left) / b.width) * 2 - 1, -((e.clientY - b.top) / b.height) * 2 + 1);
  }

  /** the handle under the mouse: nearest on the screen, within 16 pixels */
  function pick(e) {
    const b = canvas.getBoundingClientRect();
    const px = e.clientX - b.left, py = e.clientY - b.top;
    const m = stateOf(view);
    let best = null, bestD = 16;
    for (const h of view.handles) {
      const s = toWorld(tipOf(h, m)).project(sc.camera);
      if (s.z > 1) continue;
      const d = Math.hypot((s.x * 0.5 + 0.5) * b.width - px, (-s.y * 0.5 + 0.5) * b.height - py);
      if (d < bestD) { bestD = d; best = h; }
    }
    return best;
  }

  const snap = (x) => (nav.snap > 0 ? Number((Math.round(x / nav.snap) * nav.snap).toFixed(6)) : x);

  function dragTo(e) {
    const m = stateOf(view);
    const h = drag.h;
    ray.setFromCamera(ndc(e), sc.camera);
    const custom = h.plane ? h.plane(m) : null;
    let n;
    const through = toWorld(tipOf(h, m));
    if (custom) n = toWorld(custom.n);
    else if (h.fixed === 'y' || e.shiftKey) n = new THREE.Vector3(0, 1, 0);
    else if (h.fixed === 'z') n = new THREE.Vector3(0, 0, 1);
    else n = sc.camera.getWorldDirection(new THREE.Vector3());
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(n.lengthSq() > 1e-9 ? n.clone().normalize() : new THREE.Vector3(0, 1, 0), custom ? toWorld(custom.q) : through);
    const hit = ray.ray.intersectPlane(plane, new THREE.Vector3());
    if (!hit) return;
    const p = fromWorld(hit);
    if (!custom) { p.x = snap(p.x); p.y = snap(p.y); p.z = snap(p.z); }
    if (h.fixed) p[h.fixed] = tipOf(h, m)[h.fixed];
    if (Math.max(Math.abs(p.x), Math.abs(p.y), Math.abs(p.z)) > 12) return;
    const value = h.base ? sub(p, baseOf(h, m)) : p;
    m[h.id].copy(value);
    changed();
  }

  function onDragMove(e) { if (drag) dragTo(e); }
  function onDragEnd() {
    if (!drag) return;
    drag = null;
    window.removeEventListener('mousemove', onDragMove);
    window.removeEventListener('mouseup', onDragEnd);
    update();
  }
  let downAt = null;
  shell.sceneEl.addEventListener('mousedown', (e) => {
    if (e.target !== canvas || e.button !== 0) return;
    downAt = { x: e.clientX, y: e.clientY };
    const h = pick(e);
    if (!h) return;
    downAt = null;
    e.preventDefault();
    e.stopPropagation();
    shell.sceneEl.focus();
    drag = { h };
    stopPlay();
    window.addEventListener('mousemove', onDragMove);
    window.addEventListener('mouseup', onDragEnd);
    update();
  }, true);
  canvas.addEventListener('click', (e) => {
    const still = downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 5;
    downAt = null;
    if (still) view.onPick?.(ctx.modelRay(e), e, ctx);
  });
  canvas.addEventListener('mouseleave', () => {
    canvas.style.cursor = '';
    if (hoverHandle && !drag) { hoverHandle = null; update(); }
  });
  shell.sceneEl.addEventListener('mousemove', (e) => {
    if (drag || e.target !== canvas) return;
    const h = pick(e);
    canvas.style.cursor = h ? 'grab' : '';
    if (h !== hoverHandle) { hoverHandle = h; update(); }
    if (!h) view.onHover?.(ctx.modelRay(e), e, ctx);
  });

  // ---- hovering a formula term, a value or a line of code dims the rest of the picture
  function onHover(e) {
    const el = e.target.closest ? e.target.closest('[data-k]') : null;
    const key = el ? el.dataset.k : null;
    if (key === hoverKey) return;
    hoverKey = key;
    if (viz) { viz.setHighlight(key); render(); }
  }
  for (const el of [relBody, codeBody, inputBody]) {
    el.addEventListener('mouseover', onHover);
    el.addEventListener('mouseleave', onHover);
  }

  // ---- camera, then the first view
  // a view whose numbers depend on the eye (winding, facing) is explained again after each camera move
  let camPending = false;
  const camRender = () => {
    render();
    if (view.cameraDependent && !camPending) {
      camPending = true;
      requestAnimationFrame(() => { camPending = false; update(); });
    }
  };
  cam = makeOrbitCamera({ camera: sc.camera, render: camRender, home: view.home, sceneEl: shell.sceneEl, container, stage, settings: nav });
  shell.setNavController(cam);

  header?.(pickCard, ctx);
  view.setup?.(ctx);
  view.enter?.(stateOf(view), ctx);
  buildPicks();
  buildInputs();
  applyGrid();
  for (const [k, b] of Object.entries(tabBtns)) b.classList.toggle('on', k === track);
  update();

  return {
    cam, input: cam,
    setView: (id) => setView(viewById(id)),
    get view() { return view; },
    get values() { return stateOf(view); },
    get result() { return lastResult; },
    views, ctx,
    /** where a handle sits on the page, for tools/test-vector-basics.mjs */
    screenOf(id) {
      const h = view.handles.find((x) => x.id === id);
      if (!h) return null;
      const s = toWorld(tipOf(h, stateOf(view))).project(sc.camera);
      const b = canvas.getBoundingClientRect();
      return { x: b.left + (s.x * 0.5 + 0.5) * b.width, y: b.top + (-s.y * 0.5 + 0.5) * b.height };
    },
  };
}
