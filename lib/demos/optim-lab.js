// optim-lab: training a network is walking downhill on a loss surface, one lab (lib/core/lab.js). Three topics: descent (the learning rate,
// the shape of the surface), optimizers (momentum, Adam, schedules) and minibatches (gradient noise, stochastic descent).
// The computations are the WebGL program's,
// lib/programs/optim-lab/webgl/optimlab.js; this file draws the loss surface in the scene.
import * as THREE from '../vendor/three.module.js';
import { makeLab } from '../core/lab.js';
import { makeViews, TOPICS, KEYS, heightOf } from './optim-lab-views.js';

const PROGRAM = {
  title: 'Optimization lab: the whole program',
  base: new URL('../programs/optim-lab/', import.meta.url),
  tracks: [
    { id: 'webgl', label: 'WebGL · three.js', files: ['webgl/optimlab.js', 'webgl/scene.js', 'webgl/index.html'], run: 'webgl/index.html',
      note: 'Serve the course folder (python3 -m http.server) and open lib/programs/optim-lab/webgl/. optimlab.js holds every computation, and the demo calls these same functions; scene.js draws a loss surface and a walk down it.' },
    { id: 'unity', label: 'Unity · C#', files: ['unity/OptimLab.cs', 'unity/OptimLabScene.cs'],
      note: 'Put both files in Assets, put OptimLabScene on an empty GameObject, press Play. OptimLab.cs is optimlab.js, line for line where the languages allow. Not run in the Unity editor; the C# is compiled and its numbers compared with the JavaScript by the course tests.' },
  ],
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Training moves a vector of weights θ downhill on a loss surface L(θ): θ ← θ − η ∇L. Here the surface has two weights, so it can be
  drawn: as a height field in the picture and as a contour map in the rail. <b>Click</b> the map or the surface to put the start there.</p>
  <h4>Topics</h4>
  <p><b>Descent</b>: the learning rate η (too small, right, too large, diverging) and four more surfaces: a saddle, a curved valley, several
  minima and the lecture's own perceptron. <b>Optimizers</b>: gradient descent, momentum and Adam (Kingma and Ba, 2015) from one start, with
  each update's terms as numbers, and the warmup and cosine schedule. <b>Minibatch</b>: the gradient over a few random examples against
  the gradient over all of them, and stochastic descent.</p>
  <h4>Try this</h4>
  <p>Descent, preset <b>too large</b> then <b>diverging</b>: the same bowl, η from 0.40 to 0.60. Surfaces, <b>saddle, on the axis</b>: the gradient
  is zero and descent stops at a point that is not a minimum. Optimizers, <b>first Adam step</b>: every component moves by exactly η.</p>
  <h4>The code</h4>
  <p>The code card is the program itself, in the track you choose, with each variable's current value beside its line. A test runs the C#
  on the same inputs and compares every number. <code>&lt;/&gt;</code> opens the whole program for both tracks.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const CSS = `
.ol-row { margin-bottom: 4px; }
.ol-seglabel { font: 500 11px/1 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; margin-right: 3px; min-width: 62px; align-self: center; }
`;
function injectCss() {
  if (document.getElementById('ol-css')) return;
  const st = document.createElement('style');
  st.id = 'ol-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

const VERT = `
attribute float aLoss;
varying float vLoss;
varying vec3 vN;
void main() {
  vLoss = aLoss;
  vN = normalMatrix * normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAG = `
uniform float uFloor;
uniform float uHref;
varying float vLoss;
varying vec3 vN;
vec3 ramp(float u) {
  return mix(mix(vec3(0.05, 0.09, 0.22), vec3(0.1, 0.45, 0.55), clamp(u * 2.0, 0.0, 1.0)), vec3(0.95, 0.75, 0.35), clamp(u * 2.0 - 1.0, 0.0, 1.0));
}
void main() {
  float t = log(1.0 + max(vLoss - uFloor, 0.0) / uHref) * 3.2;
  float line = 1.0 - smoothstep(0.0, 0.07, min(fract(t), 1.0 - fract(t)));
  vec3 n = normalize(vN);
  float light = 0.55 + 0.45 * abs(n.z * 0.4 + n.y * 0.8);
  vec3 col = ramp(clamp(t / 12.0, 0.0, 1.0)) * light;
  gl_FragColor = vec4(mix(col, vec3(0.75, 0.8, 0.9), line * 0.55), 1.0);
}`;

/** the loss surface as a height field with contour lines, rebuilt only when its key changes */
class Surface {
  constructor(world) {
    this.material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
      uniforms: { uFloor: { value: 0 }, uHref: { value: 1 } } });
    this.mesh = new THREE.Mesh(new THREE.BufferGeometry(), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    world.add(this.mesh);
    this.key = null;
  }
  show(arg) {
    if (!arg) { this.mesh.visible = false; this.key = null; return; }
    this.mesh.visible = true;
    if (arg.key === this.key) return;
    this.key = arg.key;
    const { spec } = arg, n = 90, [x0, x1, y0, y1] = spec.domain;
    const pos = new Float32Array((n + 1) * (n + 1) * 3), loss = new Float32Array((n + 1) * (n + 1)), idx = [];
    for (let j = 0; j <= n; j++) {
      for (let i = 0; i <= n; i++) {
        const x = x0 + (i / n) * (x1 - x0), y = y0 + (j / n) * (y1 - y0), L = spec.lossFn(x, y), o = j * (n + 1) + i;
        pos[o * 3] = x; pos[o * 3 + 1] = heightOf(spec, L); pos[o * 3 + 2] = -y;
        loss[o] = Number.isFinite(L) ? L : spec.floor;
      }
    }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const a = j * (n + 1) + i; idx.push(a, a + 1, a + n + 1, a + 1, a + n + 2, a + n + 1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aLoss', new THREE.BufferAttribute(loss, 1));
    g.setIndex(idx);
    g.computeVertexNormals();
    this.mesh.geometry.dispose();
    this.mesh.geometry = g;
    this.material.uniforms.uFloor.value = spec.floor;
    this.material.uniforms.uHref.value = spec.href;
  }
}

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  let surface = null;
  const S = { show: (o) => surface?.show(o) };
  const views = makeViews(S);
  const lab = makeLab(container, {
    stage, controls, name: 'optim-lab', topics: TOPICS, views, keys: KEYS, program: PROGRAM,
    header(card, ctx) { surface = new Surface(ctx.world); },
    files: { webgl: 'webgl/optimlab.js', unity: 'unity/OptimLab.cs' },
    help: HELP_HTML,
    legend: 'click the surface: start there · drag: turn · scroll zoom · WASD move · H home',
  });
  return lab;
}
