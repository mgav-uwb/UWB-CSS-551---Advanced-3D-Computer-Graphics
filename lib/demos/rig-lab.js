// rig-lab: skeletons and skins, one lab (lib/core/lab.js). Four topics: forward kinematics on a chain of bones (each bone's local and world
// matrix, the end effector by matrices and by hand); inverse kinematics (the two-link law of cosines with both elbows and the unreachable
// case, cyclic coordinate descent one joint at a time, the Jacobian pseudo-inverse with its columns and its singular case); skinning (linear
// blend skinning with bind pose and inverse bind matrices, the candy-wrapper collapse against dual quaternions, blend shapes); motion (a blend
// tree by slerp, retargeting a leg). The computations are the WebGL program's, lib/programs/rig-lab/webgl/riglab.js; this file holds the
// surface the scene draws.
import * as THREE from '../vendor/three.module.js';
import { makeLab } from '../core/lab.js';
import { makeViews, TOPICS, KEYS } from './rig-lab-views.js';

const PROGRAM = {
  title: 'Rig lab: the whole program',
  base: new URL('../programs/rig-lab/', import.meta.url),
  tracks: [
    { id: 'webgl', label: 'WebGL · three.js', files: ['webgl/riglab.js', 'webgl/scene.js', 'webgl/index.html'], run: 'webgl/index.html',
      note: 'Serve the course folder (python3 -m http.server) and open lib/programs/rig-lab/webgl/. riglab.js holds every computation, and the demo calls these same functions; scene.js skins a tube on two bones, linearly or with dual quaternions, and measures its volume.' },
    { id: 'unity', label: 'Unity · C#', files: ['unity/RigLab.cs', 'unity/RigLabScene.cs'],
      note: 'Put both files in Assets, put RigLabScene on an empty GameObject, press Play. RigLab.cs is riglab.js, line for line where the languages allow; its matrices are float[16], not Matrix4x4. The scene has been compiled against the course\'s stand-in for the Unity API and has not been run in the Unity editor. Unity\'s axes are left-handed: the numbers are the same, the pictures mirror images.' },
  ],
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A skeleton is a chain of bones, each a node of a scene graph that turns about its joint. A skin is a mesh whose vertices follow
  those bones. Four topics: <b>Forward</b> (angles in, hand position out), <b>Inverse</b> (hand position in, angles out), <b>Skinning</b>
  and <b>Motion</b>.</p>
  <h4>Moving things</h4>
  <p>Drag the gold target <b>p</b>, or the pink vertex <b>v</b>, in the picture or with the sliders. <b>Click</b> the skin to pick a vertex.
  Drag elsewhere to turn the view. Hover a term of a formula or a line of code and the rest of the picture dims.</p>
  <h4>Try this</h4>
  <p><b>Inverse, two links</b>: the preset "out of reach (2, 0.5)" shows cos θ₂ above 1 and the clamped arm. <b>Inverse, cyclic coordinate descent</b> and <b>Jacobian</b>:
  press <b>step</b> to see one joint turn or one pseudo-inverse step, and <b>run</b> to follow the target as you drag it. In the Jacobian view the presets
  "straight arm: singular" and "nearly straight, undamped" show why the pseudo-inverse fails near a straight arm. <b>Skinning, linear blend</b>: "the
  lecture's vertex" is the worked example, v′ = (1.074, 0.923, 0). <b>Candy wrapper</b>: press ▶ on the twist, or choose "half turn (180°)".
  <b>Motion, blend tree</b>: press ▶ on the phase to watch the walk and the run stride together; "the lecture's 2.5 m/s" gives a knee of 36°.</p>
  <h4>Sources</h4>
  <p>Cyclic coordinate descent: Wang and Chen, 1991. Damped least squares: Wampler, 1986; Nakamura and Hanafusa, 1986. Dual quaternion skinning:
  Kavan, Collins, Zara and O'Sullivan, "Skinning with dual quaternions", Symposium on Interactive 3D Graphics and Games, 2007. Slerp: Shoemake, 1985.</p>
  <h4>The code</h4>
  <p>The code card is the program itself, in the track you choose, with each variable's current value beside its line. A test runs the C#
  on the same inputs and compares every number. <code>&lt;/&gt;</code> opens the whole program for both tracks.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const CSS = `
.rl-look { margin-top: 6px; }
.rl-seglabel { font: 500 11px/1 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; margin-right: 3px; min-width: 34px; align-self: center; }
.rl-eq { display: flex; flex-wrap: wrap; gap: 5px 6px; align-items: center; }
.rl-op { font: 600 15px/1 -apple-system, Segoe UI, sans-serif; color: #79829a; }
.rl-m { background: #0b0c10; border: 1px solid #1f2330; border-radius: 4px; padding: 3px 5px 4px; }
.rl-m[data-k]:hover { border-color: #3a4c6e; }
.rl-mt { font: 600 10.5px/1.3 -apple-system, Segoe UI, sans-serif; color: #aab2c5; margin-bottom: 2px; }
.rl-m table { border-collapse: collapse; font: 10.5px/1.45 'SF Mono', Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }
.rl-m td { padding: 0 3px; text-align: right; color: #d6dbe5; min-width: 36px; }
.rl-mats { margin-top: 6px; }
.rl-iter { margin-top: 5px; font: 11px/1.4 'SF Mono', Menlo, Consolas, monospace; color: #8b93a7; }
.lab-btn.rl-run.on { background: #17301f; border-color: #2d6b46; color: #7ee787; }
.demo-shell-root--embed .rl-mats { display: none; }
`;
function injectCss() {
  if (document.getElementById('rl-css')) return;
  const st = document.createElement('style');
  st.id = 'rl-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

// ---------------------------------------------------------------- the surface in the scene

const VERT = `
attribute vec3 aColor;
varying vec3 vN;
varying vec3 vView;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalMatrix * normal;
  vView = -mv.xyz;
  vColor = aColor;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
uniform vec3 uLight;
uniform vec3 uBase;
uniform float uUseColor;
uniform float uOpacity;
varying vec3 vN;
varying vec3 vView;
varying vec3 vColor;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 view = normalize(vView);
  vec3 h = normalize(uLight + view);
  float light = 0.3 + 0.62 * max(dot(n, uLight), 0.0) + 0.3 * pow(max(dot(n, h), 0.0), 40.0);
  vec3 base = uUseColor > 0.5 ? vColor : uBase;
  gl_FragColor = vec4(base * light, uOpacity);
}`;

/** triangle meshes drawn smooth, by named slot ("main", "second", "rest"), rebuilt only when a slot's topology changes */
class Surface {
  constructor(world) {
    this.world = world;
    this.slots = new Map();
  }

  /** hide every slot; the view's draw shows the ones it wants */
  begin() {
    for (const s of this.slots.values()) { s.mesh.visible = false; s.wire.visible = false; }
  }

  make(slot) {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
      uniforms: { uLight: { value: new THREE.Vector3(0.4, 0.7, 0.6).normalize() }, uBase: { value: new THREE.Color(0x5b8bd0) }, uUseColor: { value: 0 }, uOpacity: { value: 1 } },
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    const wireGeometry = new THREE.BufferGeometry();
    const wire = new THREE.LineSegments(wireGeometry, new THREE.LineBasicMaterial({ color: 0x0b0c10, transparent: true, opacity: 0.55 }));
    wire.frustumCulled = false;
    const group = new THREE.Group();
    group.add(mesh, wire);
    this.world.add(group);
    const s = { group, mesh, wire, geometry, wireGeometry, tris: null, count: 0 };
    this.slots.set(slot, s);
    return s;
  }

  /** draw positions (arrays [x, y, z]) as the triangles tris; colors is an optional Float32Array of three numbers per vertex */
  show(slot, { positions, tris, colors = null, ghost = false, glass = false, wire = true, offset = [0, 0, 0] }) {
    const s = this.slots.get(slot) ?? this.make(slot);
    if (s.tris !== tris || s.count !== positions.length) {
      s.tris = tris;
      s.count = positions.length;
      const index = new Uint32Array(tris.length * 3);
      const edges = new Set();
      const edgeIndex = [];
      tris.forEach((t, i) => {
        index.set(t, 3 * i);
        for (let k = 0; k < 3; k++) {
          const a = t[k], b = t[(k + 1) % 3];
          const key = a < b ? a * 65536 + b : b * 65536 + a;
          if (!edges.has(key)) { edges.add(key); edgeIndex.push(a, b); }
        }
      });
      const position = new THREE.BufferAttribute(new Float32Array(positions.length * 3), 3);
      s.geometry.setAttribute('position', position);
      s.geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(positions.length * 3), 3));
      s.geometry.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(positions.length * 3), 3));
      s.geometry.setIndex(new THREE.BufferAttribute(index, 1));
      s.wireGeometry.setAttribute('position', position);
      s.wireGeometry.setIndex(new THREE.BufferAttribute(new Uint32Array(edgeIndex), 1));
    }
    const position = s.geometry.getAttribute('position');
    for (let i = 0; i < positions.length; i++) position.setXYZ(i, positions[i][0], positions[i][1], positions[i][2]);
    position.needsUpdate = true;
    s.geometry.computeVertexNormals();
    if (colors) {
      s.geometry.getAttribute('aColor').array.set(colors);
      s.geometry.getAttribute('aColor').needsUpdate = true;
    }
    const u = s.mesh.material.uniforms;
    u.uUseColor.value = colors ? 1 : 0;
    u.uOpacity.value = glass ? 0.5 : 1;
    s.mesh.material.transparent = glass;
    s.mesh.material.depthWrite = !glass;
    s.group.position.set(offset[0], offset[1], offset[2]);
    s.mesh.visible = !ghost;
    s.wire.visible = ghost || wire;
    s.wire.material.color.set(ghost ? 0x6b7690 : 0x0b0c10);
    s.wire.material.opacity = ghost ? 0.45 : glass ? 0.4 : 0.5;
  }
}

// ---------------------------------------------------------------- the demo

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  let surface = null;
  // the views draw through this stand-in, since the surface needs the scene the lab builds
  const S = { begin: () => surface?.begin(), show: (slot, o) => surface?.show(slot, o) };
  const views = makeViews(S);
  const lab = makeLab(container, {
    stage, controls, name: 'rig-lab', topics: TOPICS, views, keys: KEYS, program: PROGRAM,
    files: { webgl: 'webgl/riglab.js', unity: 'unity/RigLab.cs' },
    help: HELP_HTML,
    header(card, ctx) { surface = new Surface(ctx.world); },
    legend: 'drag the gold target p or the pink vertex v · click the skin: pick a vertex · drag: turn · scroll zoom · WASD move · H home',
  });
  return Object.assign(lab, { solver: views.solver, surface });
}
