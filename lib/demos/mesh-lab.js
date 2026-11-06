// mesh-lab: a triangle mesh as data, one lab (lib/core/lab.js). Load a mesh, or pick one of the built-ins, and take it through six topics:
// its files and lists, its winding and culling, its topology (Euler, half-edges, valence), its normals (face, vertex, hard edges, shading),
// building one (subdivision, sweeps, marching cubes) and processing one (edge collapse, smoothing, the vertex cache). The computations are the
// WebGL program's, lib/programs/mesh-lab/webgl/meshlab.js; this file holds the surface the scene draws and the file loading.
import * as THREE from '../vendor/three.module.js';
import { makeLab } from '../core/lab.js';
import { loadModel } from '../core/models.js';
import * as ML from '../programs/mesh-lab/webgl/meshlab.js';
import { MeshDoc, BUILTINS, detectFormat, checkMesh } from './mesh-lab-doc.js';
import { makeViews, TOPICS, KEYS } from './mesh-lab-views.js';

const PROGRAM = {
  title: 'Mesh lab: the whole program',
  base: new URL('../programs/mesh-lab/', import.meta.url),
  tracks: [
    { id: 'webgl', label: 'WebGL · three.js', files: ['webgl/meshlab.js', 'webgl/scene.js', 'webgl/index.html'], run: 'webgl/index.html',
      note: 'Serve the course folder (python3 -m http.server) and open lib/programs/mesh-lab/webgl/. meshlab.js holds every computation, and the demo calls these same functions; scene.js draws an icosahedron and lets you reverse its triangles.' },
    { id: 'unity', label: 'Unity · C#', files: ['unity/MeshLab.cs', 'unity/MeshLabScene.cs'],
      note: 'Put both files in Assets, put MeshLabScene on an empty GameObject, press Play. MeshLab.cs is meshlab.js, line for line where the languages allow. Unity\'s axes are left-handed and its front faces clockwise: the numbers are the same, the pictures mirror images.' },
  ],
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>One triangle mesh, and the things a graphics program does with it. Pick a mesh at the top, or load your own, and it stays loaded
  across every topic.</p>
  <h4>Loading a mesh</h4>
  <p><b>load a file</b> reads OBJ, OFF, ASCII PLY and STL (text or binary), or drag a file onto the picture. STL is a soup, so its
  corners are welded into shared vertices. Under Files, <b>edit the text</b> changes the file and reads it again.</p>
  <h4>Picking and reading</h4>
  <p><b>Click</b> a triangle to select it, near an edge or corner when a view needs one. Drag to turn the view. Hover a formula term or a
  line of code and the rest of the picture dims. Front faces are blue and back faces orange.</p>
  <h4>Try this</h4>
  <p><b>Winding</b>: on the icosahedron, with culling on back faces, press <b>reverse this triangle</b>. It disappears, its normal flips,
  and its three edges turn red: both triangles on each now walk it the same way. Orbit to look through the hole.
  <b>Topology, Euler</b>: delete a triangle and watch χ fall from 2 to 1 as a boundary loop appears; pick the 69,451-triangle bunny for χ = −3.
  <b>Normals, hard edges</b>: the cube goes from 8 to 24 vertices. <b>Build, one marching cube</b>: "the lecture's cell" is case 27.
  <b>Process, vertex cache</b>: the same triangles shuffled cost 2.7 shader runs each instead of 1.1.</p>
  <h4>The code</h4>
  <p>The code card is the program itself, in the track you choose, with each variable's current value beside its line. A test runs the C#
  on the same inputs and compares every number. <code>&lt;/&gt;</code> opens the whole program for both tracks.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

const CSS = `
.ml-pick { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-bottom: 6px; }
.ml-pick select { flex: 1 1 130px; min-width: 0; background: #1b1e27; color: #d6dbe5; border: 1px solid #2c3140; border-radius: 4px; padding: 3px 4px; font: 500 11.5px/1.3 -apple-system, Segoe UI, Roboto, sans-serif; }
.ml-msg { flex: 1 1 100%; font: 11px/1.35 -apple-system, Segoe UI, Roboto, sans-serif; color: #ff8d85; }
.ml-msg.ok { color: #8b93a7; }
.ml-list { max-height: 210px; overflow: auto; background: #0b0c10; border: 1px solid #1f2330; border-radius: 4px; padding: 4px 0; font: 11px/1.45 'SF Mono', Menlo, Consolas, monospace; color: #c7cdda; text-align: left; }
.ml-line { white-space: pre; padding: 0 7px; min-width: max-content; }
.ml-line[data-t]:hover, .ml-line[data-v]:hover, .ml-line[data-e]:hover { background: #171b26; cursor: pointer; }
.ml-line.on { background: #2a2310; color: #ffd166; }
.ml-head { color: #8b93a7; }
.ml-more { color: #5c667c; font-style: italic; }
.ml-tabs .lab-btn { padding: 2px 6px; font-size: 11px; }
.ml-foot, .ml-editrow { margin-top: 5px; }
.ml-area { width: 100%; box-sizing: border-box; height: 210px; background: #0b0c10; color: #d6dbe5; border: 1px solid #2c3140; border-radius: 4px; font: 11px/1.45 'SF Mono', Menlo, Consolas, monospace; padding: 5px 7px; white-space: pre; resize: vertical; }
.ml-err { font: 11.5px/1.35 -apple-system, Segoe UI, Roboto, sans-serif; color: #ff8d85; margin-top: 3px; }
.ml-err:empty { display: none; }
.ml-seg { align-items: center; }
.ml-seglabel { font: 500 11px/1 -apple-system, Segoe UI, Roboto, sans-serif; color: #8b93a7; margin-right: 3px; min-width: 42px; }
.lab-btn.ml-primary { background: #1c2c44; border-color: #3a5a8a; color: #dbe8ff; font-weight: 600; }
.lab-btn:disabled { opacity: 0.4; cursor: default; }
.ml-cache { display: flex; flex-wrap: wrap; gap: 2px; margin-top: 4px; }
.ml-cell { min-width: 25px; padding: 1px 2px; text-align: center; background: #173021; color: #9fe8c6; border-radius: 2px; font: 10px/1.4 'SF Mono', Menlo, monospace; }
.ml-cell.empty { background: #1b1e27; }
.demo-shell-root--embed .ml-list, .demo-shell-root--embed .ml-area { max-height: 120px; }
`;
function injectCss() {
  if (document.getElementById('ml-css')) return;
  const st = document.createElement('style');
  st.id = 'ml-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

// ---------------------------------------------------------------- the surface in the scene

const VERT = `
attribute vec3 aColor;
uniform vec3 uLight;
uniform float uGouraud;
varying vec3 vN;
varying vec3 vView;
varying vec3 vColor;
varying vec2 vLit;
float lit(vec3 n, vec3 view) {
  float diffuse = max(dot(n, uLight), 0.0);
  vec3 h = normalize(uLight + view);
  float spec = pow(max(dot(n, h), 0.0), 48.0);
  return 0.24 + 0.68 * diffuse + 0.55 * spec;
}
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalMatrix * normal;
  vView = -mv.xyz;
  vColor = aColor;
  vec3 n = normalize(vN);
  vec3 view = normalize(vView);
  vLit = vec2(lit(n, view), lit(-n, view));
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = `
uniform vec3 uLight;
uniform float uGouraud;
uniform float uUseColor;
varying vec3 vN;
varying vec3 vView;
varying vec3 vColor;
varying vec2 vLit;
void main() {
  bool front = gl_FrontFacing;
  #ifdef FLIP_SIDED
    front = !front;
  #endif
  vec3 base = front ? vec3(0.32, 0.5, 0.78) : vec3(0.86, 0.5, 0.2);
  if (uUseColor > 0.5) base = front ? vColor : vColor * 0.55;
  float light;
  if (uGouraud > 0.5) {
    light = front ? vLit.x : vLit.y;
  } else {
    vec3 n = normalize(vN) * (front ? 1.0 : -1.0);
    vec3 view = normalize(vView);
    vec3 h = normalize(uLight + view);
    light = 0.24 + 0.68 * max(dot(n, uLight), 0.0) + 0.55 * pow(max(dot(n, h), 0.0), 48.0);
  }
  gl_FragColor = vec4(base * light, 1.0);
}`;

class Surface {
  constructor(world) {
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1,
      uniforms: { uLight: { value: new THREE.Vector3(0.45, 0.7, 0.55).normalize() }, uGouraud: { value: 0 }, uUseColor: { value: 0 } },
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.wire = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x0b0c10, transparent: true, opacity: 0.55 }));
    this.wire.frustumCulled = false;
    world.add(this.mesh, this.wire);
    this.key = null;
    this.wireWanted = true;
    this.range = Infinity;
    this.triangles = 0;
  }

  /** how to draw whatever is shown */
  use({ cull, shading, wire, visible = true, range }) {
    this.mesh.visible = visible;
    if (range !== undefined) this.range = range; else this.range = Infinity;
    if (cull !== undefined) {
      const side = { none: THREE.DoubleSide, back: THREE.FrontSide, front: THREE.BackSide }[cull];
      if (side !== this.material.side) {
        this.material.side = side;
        this.material.needsUpdate = true;     // the side is a shader define, FLIP_SIDED
      }
    }
    if (shading !== undefined) this.material.uniforms.uGouraud.value = shading === 'gouraud' ? 1 : 0;
    if (wire !== undefined) this.wireWanted = wire;
    this.wire.visible = visible && this.wireWanted;
    this.applyRange();
  }

  applyRange() {
    const n = Math.min(this.range, this.triangles);
    this.geometry.setDrawRange(0, 3 * n);
  }

  /** what to show: rebuilt only when the key changes. normalOf(t, k) and colorOf(t, k) give a corner's normal and color */
  show({ key, positions, tris, normalOf = null, colorOf = null }) {
    if (key === this.key) return;
    this.key = key;
    const count = tris.length * 3;
    const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
    for (let t = 0; t < tris.length; t++) {
      const tri = tris[t];
      const face = normalOf ? null : ML.faceNormal(positions[tri[0]], positions[tri[1]], positions[tri[2]]).nHat;
      for (let k = 0; k < 3; k++) {
        const at = (3 * t + k) * 3;
        const p = positions[tri[k]];
        const n = normalOf ? normalOf(t, k) : face;
        pos[at] = p[0]; pos[at + 1] = p[1]; pos[at + 2] = p[2];
        nor[at] = n[0]; nor[at + 1] = n[1]; nor[at + 2] = n[2];
        if (colorOf) {
          const c = colorOf(t, k);
          col[at] = c[0]; col[at + 1] = c[1]; col[at + 2] = c[2];
        }
      }
    }
    const g = this.geometry;
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    this.material.uniforms.uUseColor.value = colorOf ? 1 : 0;
    this.triangles = tris.length;
    this.applyRange();
    this.buildWire(positions, tris);
  }

  buildWire(positions, tris) {
    this.wire.geometry.dispose();
    const g = new THREE.BufferGeometry();
    if (tris.length <= 120000) {
      const edges = ML.edgeList(tris).edges;
      const w = new Float32Array(edges.length * 6);
      edges.forEach((e, i) => {
        const a = positions[e[0]], b = positions[e[1]];
        w.set(a, i * 6);
        w.set(b, i * 6 + 3);
      });
      g.setAttribute('position', new THREE.BufferAttribute(w, 3));
    }
    this.wire.geometry = g;
  }
}

// ---------------------------------------------------------------- the demo

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  const doc = new MeshDoc();
  let surface = null;
  // the views ask for the surface through this stand-in, since the surface needs the scene the lab builds
  const S = { use: (o) => surface?.use(o), show: (o) => surface?.show(o) };
  const views = makeViews(doc, S);
  let labCtx = null, select = null, message = null;

  const say = (text, ok = false) => {
    if (!message) return;
    message.textContent = text;
    message.classList.toggle('ok', ok);
  };

  /** make a loaded mesh the current one, and let every view's controls pick up its size */
  function changed(note = '') {
    say(note, true);
    if (select) select.value = doc.builtinId ?? 'custom';
    if (labCtx) labCtx.setView(labCtx.lab.view.id);
  }

  async function loadBuiltin(id) {
    const b = BUILTINS.find((x) => x.id === id);
    if (!b) return;
    if (b.model) {
      say(`loading the ${b.label} ...`, true);
      const m = await loadModel(b.model, b.lod ? { lod: b.lod } : {});
      const g = m.geometry;
      const pos = g.getAttribute('position'), idx = g.index;
      const positions = [];
      for (let i = 0; i < pos.count; i++) positions.push([pos.getX(i) * 3.4, pos.getY(i) * 3.4, pos.getZ(i) * 3.4]);
      const faces = [];
      if (idx) for (let i = 0; i < idx.count; i += 3) faces.push([idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)]);
      else for (let i = 0; i < pos.count; i += 3) faces.push([i, i + 1, i + 2]);
      // the model files split vertices for normals and seams: welding gives back the surface's real vertices
      const welded = ML.weldVertices(positions, faces, 1e-5);
      const text = `# ${b.label}\n${welded.positions.length > 40000 ? '# (the text is not kept for a model this size; the tabs below regenerate it)' : ML.writeObj(welded.positions, welded.faces)}`;
      doc.install(b.label, 'obj', text, { positions: welded.positions, faces: welded.faces }, id);
    } else {
      doc.loadText(b.label, b.format, b.text(), id);
    }
    changed();
  }
  views.setLoader(loadBuiltin);

  /** a file from the picker or a drop */
  async function loadFile(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const format = detectFormat(file.name, bytes);
    if (format === 'stl-binary') {
      const parsed = ML.parseStlBytes(bytes);
      const checked = checkMesh(parsed);
      if (checked.error) { say(checked.error); return; }
      doc.install(file.name, format, `# binary STL, ${bytes.byteLength} bytes: ${parsed.faces.length} triangles of 50 bytes each after an 84-byte header`, parsed);
    } else {
      const text = new TextDecoder().decode(bytes);
      const err = doc.loadText(file.name, format, text);
      if (err) { say(`${file.name}: ${err}`); return; }
    }
    changed(`${file.name}: ${doc.positions.length} vertices, ${doc.tris.length} triangles`);
  }

  function header(card, ctx) {
    labCtx = ctx;
    surface = new Surface(ctx.world);
    const row = document.createElement('div');
    row.className = 'ml-pick';
    card.insertBefore(row, card.children[1]);
    select = document.createElement('select');
    select.setAttribute('aria-label', 'The mesh');
    for (const b of BUILTINS) {
      const o = document.createElement('option');
      o.value = b.id;
      o.textContent = b.label;
      select.appendChild(o);
    }
    const custom = document.createElement('option');
    custom.value = 'custom';
    custom.textContent = 'your file';
    custom.hidden = true;
    select.appendChild(custom);
    select.addEventListener('change', () => { const id = select.value; select.blur(); loadBuiltin(id); });
    row.appendChild(select);

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.obj,.off,.ply,.stl';
    input.style.display = 'none';
    input.addEventListener('change', () => { if (input.files[0]) loadFile(input.files[0]); input.value = ''; });
    row.appendChild(input);
    const load = document.createElement('button');
    load.type = 'button';
    load.className = 'lab-btn ml-primary';
    load.textContent = 'load a file';
    load.title = 'OBJ, OFF, ASCII PLY or STL. Or drag a file onto the picture';
    load.addEventListener('click', () => { load.blur(); input.click(); });
    row.appendChild(load);
    message = document.createElement('div');
    message.className = 'ml-msg';
    row.appendChild(message);

    // drop a file on the picture
    ctx.sceneEl.addEventListener('dragover', (e) => e.preventDefault());
    ctx.sceneEl.addEventListener('drop', (e) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file) loadFile(file);
    });
  }

  const lab = makeLab(container, {
    stage, controls, name: 'mesh-lab', topics: TOPICS, views, keys: KEYS, program: PROGRAM, header,
    files: { webgl: 'webgl/meshlab.js', unity: 'unity/MeshLab.cs' },
    help: HELP_HTML,
    legend: 'click a triangle: pick it · drag: turn · scroll zoom · WASD move · H home · drop a file: load it',
  });
  labCtx.lab = lab;
  return Object.assign(lab, { doc, loadBuiltin, loadFile });
}
