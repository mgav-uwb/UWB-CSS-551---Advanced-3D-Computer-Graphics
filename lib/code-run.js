// Runs a code-tabs group's WebGL listing live, for <div class="code-tabs" data-run="name">.
// lib/code-tabs.js adds a "Run" tab to such a group and calls CodeRun.start / CodeRun.stop.
//
// The listing's own text is executed unchanged, in a same-origin iframe, as one module:
//   BASE (three.js scene, camera, renderer, a cube, $-prefixed UI helpers)
//   + EXAMPLES[name].pre   (what the listing assumes exists: widgets, helpers, state)
//   + the listing
//   + EXAMPLES[name].post  (starting it, the readout, buttons that stand in for keys)
// Helper names start with $ so they cannot collide with names the listings declare.
(function () {
  const here = document.currentScript ? document.currentScript.src : location.href;
  const THREE_URL = new URL('vendor/three.module.js', here).href;

  const BASE = `
import * as THREE from '${THREE_URL}';
const $ui = document.getElementById('ui'), $out = document.getElementById('out');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1e2230);
const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 2.2, 9);
camera.lookAt(0, 0, 0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 2.2));
const $sun = new THREE.DirectionalLight(0xffffff, 1.6);
$sun.position.set(3, 5, 4);
scene.add($sun);
const $grid = new THREE.GridHelper(10, 10, 0x56607a, 0x343b4d);
$grid.position.y = -1.5;
scene.add($grid);
const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshStandardMaterial({ color: 0x00b46e, roughness: 0.5 }));
scene.add(cube);
function $label(text) { const s = document.createElement('span'); s.textContent = text; $ui.append(s); return s; }
function $slider(label, min, max, step, value) {
  $label(label);
  const el = document.createElement('input');
  Object.assign(el, { type: 'range', min, max, step, value });
  $ui.append(el); return el;
}
function $box(label, value) {
  $label(label);
  const el = document.createElement('input');
  Object.assign(el, { type: 'text', value, size: 5 });
  $ui.append(el); return el;
}
function $button(label, fn) {
  const b = document.createElement('button');
  b.textContent = label; b.addEventListener('click', fn); $ui.append(b); return b;
}
function $key(key, code = key) { dispatchEvent(new KeyboardEvent('keydown', { key, code })); }
const $watches = [];
function $watch(fn) { $watches.push(fn); }
(function $tick() {
  try { $out.textContent = $watches.map((f) => f()).join('\\n'); } catch (e) { $out.textContent = String(e); }
  requestAnimationFrame($tick);
})();
renderer.render(scene, camera);
`;

  // Each entry: pre (before the listing), post (after it), hint (one line shown over the picture).
  const EXAMPLES = {
    spin: {
      post: `$watch(() => 'angle = ' + angle.toFixed(1) + '°   (90° per second)');`,
    },
    keys: {
      hint: 'click the picture, then hold D or A; Space recenters',
      pre: `let x = 0, last = performance.now();
const speed = 4;
const ship = cube;`,
      post: `requestAnimationFrame(frame);
$button('recenter (Space)', () => { $key(' ', 'Space'); dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' })); });
$watch(() => 'x = ' + x.toFixed(2) + '     held: ' + ([...held].join(' ') || 'none'));`,
    },
    accumulator: {
      hint: 'fixed 10 ms steps; the stall button blocks the page for 250 ms',
      pre: `let $steps = 0;
function initialState() { return { x: -3, v: 3 }; }
function step(s, dt) {                         // a cube sliding between two walls
  $steps++;
  let x = s.x + s.v * dt, v = s.v;
  if (x > 3 || x < -3) { v = -v; x = Math.max(-3, Math.min(3, x)); }
  return { x, v };
}
function lerp(a, b, t) { return { x: a.x + (b.x - a.x) * t, v: b.v }; }
function draw(s) { cube.position.x = s.x; renderer.render(scene, camera); }`,
      post: `$button('stall 250 ms', () => { const t = performance.now(); while (performance.now() - t < 250); });
$watch(() => 'steps run ' + $steps + '   carried ' + (acc * 1000).toFixed(1) + ' ms   alpha ' + (acc / DT).toFixed(2));`,
    },
    tangle: {
      hint: 'move the slider, press =, then move the slider again',
      pre: `const slider = $slider('scale', 0.1, 4, 0.1, 1);
const box = $box('box', '1.00');
function render() { renderer.render(scene, camera); }`,
      post: `$button('press =', () => $key('='));
$watch(() => 'cube ' + cube.scale.x.toFixed(2) + '    slider ' + (+slider.value).toFixed(2) + '    box ' + box.value);`,
    },
    untangled: {
      hint: 'move the slider, press =, or type in the box and press Enter',
      pre: `const slider = $slider('scale', 0.1, 4, 0.1, 1);
const box = $box('box', '1.00');
let $renders = 0, $pending = false;
function requestRender() {
  if ($pending) return;
  $pending = true;
  requestAnimationFrame(() => { $pending = false; $renders++; view(); });
}`,
      post: `requestRender();
$button('press =', () => $key('='));
$watch(() => 'model.s ' + model.s.toFixed(2) + '    cube ' + cube.scale.x.toFixed(2) + '    slider ' + (+slider.value).toFixed(2) + '    box ' + box.value + '    renders ' + $renders);`,
    },
    dirty: {
      hint: 'each edit turns the cube 15°; count edits against renders',
      pre: `let $edits = 0, $renders = 0;
function view() { $renders++; cube.rotation.y = $edits * Math.PI / 12; renderer.render(scene, camera); }`,
      post: `$button('1 edit', () => { $edits++; requestRender(); });
$button('3 edits in one frame', () => { for (let i = 0; i < 3; i++) { $edits++; requestRender(); } });
$watch(() => 'edits ' + $edits + '    renders ' + $renders);`,
    },
    undo: {
      hint: 'move vertices of the sphere, then undo them one at a time',
      pre: `cube.visible = false;
const $geo = new THREE.IcosahedronGeometry(1.6, 1);
const $ball = new THREE.Mesh($geo, new THREE.MeshStandardMaterial({ color: 0x00b46e, flatShading: true }));
scene.add($ball);
const $pos = $geo.attributes.position;
const mesh = {                                   // move every copy of vertex i (the sphere is unindexed)
  move(i, d) {
    const p = [$pos.getX(i), $pos.getY(i), $pos.getZ(i)];
    for (let j = 0; j < $pos.count; j++)
      if (Math.abs($pos.getX(j) - p[0]) + Math.abs($pos.getY(j) - p[1]) + Math.abs($pos.getZ(j) - p[2]) < 1e-6)
        $pos.setXYZ(j, p[0] + d[0], p[1] + d[1], p[2] + d[2]);
    $pos.needsUpdate = true; $geo.computeVertexNormals();
  },
};
let $pending = false;
function requestRender() {
  if ($pending) return;
  $pending = true;
  requestAnimationFrame(() => { $pending = false; renderer.render(scene, camera); });
}
requestRender();`,
      post: `$button('move a vertex', () => {
  const i = Math.floor(Math.random() * $pos.count);
  const n = [$pos.getX(i), $pos.getY(i), $pos.getZ(i)].map((c) => c * 0.35);
  run(new MoveVertex(mesh, i, n));
});
$button('undo', () => undo());
$watch(() => 'commands on the stack: ' + history.length);`,
    },
    bounce: {
      post: `$watch(() => 'y = ' + model.y.toFixed(2) + '    dir = ' + model.dir);`,
    },
  };

  const PAGE = (code, hint) => `<!doctype html><html><head><meta charset="utf-8"><style>
  html, body { margin: 0; height: 100%; overflow: hidden; background: #1e2230; font: 13px/1.35 system-ui, sans-serif; color: #e6e8f0; }
  canvas { display: block; }
  #ui { position: absolute; left: 8px; top: 8px; right: 8px; display: flex; flex-wrap: wrap; gap: 6px 10px; align-items: center; }
  #ui button { font: 600 12px system-ui, sans-serif; padding: 4px 10px; border-radius: 5px; border: 1px solid #56607a; background: #2b3142; color: #e6e8f0; cursor: pointer; }
  #ui input[type=text] { font: 12px ui-monospace, Menlo, monospace; background: #2b3142; color: #e6e8f0; border: 1px solid #56607a; border-radius: 4px; padding: 2px 4px; }
  #out { position: absolute; left: 8px; bottom: 8px; right: 8px; font: 13px/1.4 ui-monospace, Menlo, monospace; white-space: pre; color: #9fe8c6; }
  #hint { position: absolute; right: 8px; bottom: 8px; color: #8b93a7; font-size: 12px; }
  #err { position: absolute; inset: 40px 8px auto; color: #ff8a8a; font: 12px ui-monospace, Menlo, monospace; white-space: pre-wrap; }
</style></head><body><div id="ui"></div><div id="out"></div><div id="hint">${hint || ''}</div><div id="err"></div>
<script>addEventListener('error', (e) => { document.getElementById('err').textContent = e.message; });</script>
<script type="module">${code.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;

  let active = null;   // one running example per page

  function stop() {
    if (!active) return;
    active.frame.remove();
    active = null;
  }

  // group: the .code-tabs element; host: the element to fill; code: the listing's text
  function start(name, host, code, height) {
    stop();
    const ex = EXAMPLES[name];
    if (!ex) { host.textContent = 'no runner named "' + name + '"'; return; }
    const src = [BASE, ex.pre || '', '// ---- the listing ----', code, '// ---- end of the listing ----', ex.post || ''].join('\n');
    const frame = document.createElement('iframe');
    frame.className = 'cr-frame';
    frame.title = 'the WebGL listing, running';
    frame.style.cssText = `width: 100%; height: ${height}px; border: 0; border-radius: 0 8px 8px 8px; display: block; background: #1e2230;`;
    frame.srcdoc = PAGE(src, ex.hint);
    host.replaceChildren(frame);
    active = { frame };
  }

  window.CodeRun = { start, stop, has: (name) => name in EXAMPLES, EXAMPLES };
})();
