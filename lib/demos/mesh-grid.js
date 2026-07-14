// mesh-grid: the S07 hand-built indexed-mesh cockpit. An n×n QUAD grid on
// the XZ plane spanning [-1.5, 1.5]^2 — (n+1)^2 vertices, 2n^2 triangles,
// 6n^2 indices — with positions/normals/indices built as plain JS arrays
// BY HAND (the construction mirrors Sung's MyMesh.cs pedagogy: row-major
// vertex ordering v[row*(n+1)+col]) and fed to THREE.BufferGeometry via
// setAttribute/setIndex. NEVER THREE.PlaneGeometry.
//
// Winding: per quad (row,col) with corners v00=(row,col), v10=(row+1,col),
// v01=(row,col+1), v11=(row+1,col+1):
//   tri0 = (v00, v10, v01)   cross(v10-v00, v01-v00) = (0,0,dz)x(dx,0,0) = +Y
//   tri1 = (v01, v10, v11)   shares the v10/v01 diagonal, opposite order
// both CCW seen from +Y (up), so every face points up — verified by hand for
// n=2 (verts row-major 0..8): tri0=(0,3,1), tri1=(1,3,4). Because the
// deformation below only ever moves a vertex's Y (never its X/Z), the 2D
// (X,Z) winding — and therefore front-face visibility from above — can
// never flip, no matter how far `lift` pushes the center vertex.
//
// Params: n (2-10, quad count per side) and lift (-1..1, moves ONE vertex —
// centerIndex = round(n/2)*(n+1) + round(n/2) — up/down in Y). After a lift
// change, vertex normals are recomputed BY HAND: face normals via
// cross(edge1, edge2) (xform.js, left un-normalized so the accumulation is
// area-weighted), summed per vertex, then normalized once per vertex
// (xform.js) — never THREE's computeVertexNormals.
//
// Full-stage toggles: `wireframe` (material.wireframe flag — no second
// mesh) and `normals` (one THREE.LineSegments of vertex -> vertex + 0.25 *
// normal segments, rebuilt + its old geometry disposed on every update()).
//
// Rebuild path: an n change disposes the old BufferGeometry (topology size
// changed) and builds fresh position/index arrays. A lift-only change takes
// the cheaper path — the position attribute is mutated in place (one
// vertex) and normals are recomputed onto the existing attributes
// (needsUpdate), with no geometry disposal at all.
//
// Shell binding: mounted into the shared demo-shell (scene-dominant layout +
// "?"/"⚙"/legend + reveal.js-safe embed gate) and driven by a free-look
// orbit camera (drag orbit, scroll zoom, WASD fly), per the mvc-transform
// template. The demo's own controls (n/lift sliders + wireframe/normals
// checkboxes) live in a rail card; "⚙" holds ONLY view/nav knobs (speeds +
// grid/axes toggles).
import * as THREE from '../vendor/three.module.js';
import { cross, normalize, sub } from '../core/xform.js';
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { makeScene } from '../core/scene-shell.js';
import { makeShell } from '../core/demo-shell.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import { resolveControlIds } from './registry.js';

const HALF = 1.5; // grid spans [-HALF, HALF]^2 on X and Z
const MESH_COLOR = 0x5aa9e6;
const NORMAL_COLOR = 0xffd166;
const NORMAL_LEN = 0.25;

// Order here is also the "full stage" slider order; n (first) is what
// tools/test-demos.mjs drives as the platform smoke test.
const PARAMS = {
  n: { label: 'n', min: 2, max: 10, step: 1, value: 2, format: (v) => v.toFixed(0) },
  lift: { label: 'lift', min: -1, max: 1, step: 0.05, value: 0.4, format: (v) => v.toFixed(2) },
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>A mesh built by hand from three arrays: vertex positions, an index list
  of triangles, and per-vertex normals.</p>
  <h4>The concept</h4>
  <p>A triangle mesh is just data: positions place the corners, indices say
  which three vertices form each triangle, and normals give lighting a
  surface direction at each vertex.</p>
  <h4>Try this</h4>
  <p>Toggle wireframe to see the triangulation, toggle normals to see the
  per-vertex directions, and orbit to view the surface from any angle. Drag
  to orbit; scroll to zoom.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

// vertexIndex(row, col, n): row-major ordering, v[row*(n+1)+col] — the same
// indexing scheme the position array and the two per-quad triangles below
// are built from.
function vertexIndex(row, col, n) {
  return row * (n + 1) + col;
}

// centerIndex(n): the single vertex `lift` moves in Y. For even n this is
// the exact center vertex; for odd n it's the nearest one up-and-right of
// center (Math.round(n/2) rounds .5 up in JS).
function centerIndex(n) {
  const r = Math.round(n / 2);
  return vertexIndex(r, r, n);
}

// buildTopology(n): (n+1)^2 flat position array (y=0 — undeformed) and the
// flat 6n^2 index array, both plain-JS-built (never PlaneGeometry).
function buildTopology(n) {
  const verts = n + 1;
  const step = (2 * HALF) / n;

  const positions = new Float32Array(verts * verts * 3);
  for (let row = 0; row < verts; row++) {
    for (let col = 0; col < verts; col++) {
      const i = vertexIndex(row, col, n) * 3;
      positions[i] = -HALF + col * step;
      positions[i + 1] = 0;
      positions[i + 2] = -HALF + row * step;
    }
  }

  const indices = new Uint16Array(6 * n * n);
  let k = 0;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const v00 = vertexIndex(row, col, n);
      const v10 = vertexIndex(row + 1, col, n);
      const v01 = vertexIndex(row, col + 1, n);
      const v11 = vertexIndex(row + 1, col + 1, n);
      // tri0 shares the (v10,v01) diagonal with tri1 in opposite order —
      // both CCW seen from +Y (see the file-header derivation).
      indices[k++] = v00;
      indices[k++] = v10;
      indices[k++] = v01;
      indices[k++] = v01;
      indices[k++] = v10;
      indices[k++] = v11;
    }
  }
  return { positions, indices };
}

// computeNormals(positions, indices): hand-built vertex-normal averaging —
// NOT THREE.BufferGeometry.computeVertexNormals(). Per triangle, the face
// normal is cross(edge1, edge2) (un-normalized, so bigger triangles
// contribute more — the usual area-weighting side effect of skipping the
// per-face normalize step); it's accumulated into all 3 of that triangle's
// vertices, then each vertex sum is normalized exactly once.
function computeNormals(positions, indices) {
  const vertexCount = positions.length / 3;
  const accum = new Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) accum[i] = [0, 0, 0];

  for (let t = 0; t < indices.length; t += 3) {
    const ia = indices[t];
    const ib = indices[t + 1];
    const ic = indices[t + 2];
    const pa = [positions[ia * 3], positions[ia * 3 + 1], positions[ia * 3 + 2]];
    const pb = [positions[ib * 3], positions[ib * 3 + 1], positions[ib * 3 + 2]];
    const pc = [positions[ic * 3], positions[ic * 3 + 1], positions[ic * 3 + 2]];
    const faceN = cross(sub(pb, pa), sub(pc, pa));
    for (const idx of [ia, ib, ic]) {
      accum[idx][0] += faceN[0];
      accum[idx][1] += faceN[1];
      accum[idx][2] += faceN[2];
    }
  }

  const normals = new Float32Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    const len = Math.hypot(...accum[i]);
    const n = len > 1e-8 ? normalize(accum[i]) : [0, 1, 0];
    normals[i * 3] = n[0];
    normals[i * 3 + 1] = n[1];
    normals[i * 3 + 2] = n[2];
  }
  return normals;
}

/**
 * make(container, opts)
 * opts.stage === 'full' builds both SliderRows plus "wireframe" and
 * "normals" checkboxes. Otherwise opts.controls (array of param ids —
 * embed exposes n,lift) selects which SliderRows to build; embed never gets
 * the two toggles.
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { n: PARAMS.n.value, lift: PARAMS.lift.value };
  let showWireframe = false;
  let showNormals = false;

  // Nav speeds (shared live object: the orbit camera and the "⚙" fields read/
  // write the SAME object) + display-toggle state. `grid`/`axes`/`render` are
  // assigned once the scene is built below; the toggle apply() closures run
  // only on user interaction (after that), so referencing them is safe.
  const nav = { orbitSpeed: 0.4, zoomSpeed: 0.12, moveSpeed: 3, rollRate: 60 };
  const disp = { grid: true, axes: true };
  let grid, axes, render;

  const settingsFields = [
    { label: 'orbit', decimals: 2, title: 'Orbit sensitivity, deg per pixel of drag — default 0.4',
      getCurrent: () => nav.orbitSpeed, apply: (v) => { nav.orbitSpeed = clamp(v, 0.02, 2); } },
    { label: 'zoom', decimals: 2, title: 'Zoom step, fraction of distance per wheel notch — default 0.12',
      getCurrent: () => nav.zoomSpeed, apply: (v) => { nav.zoomSpeed = clamp(v, 0.02, 0.5); } },
    { label: 'move', decimals: 1, title: 'WASD move speed, units/sec — default 3',
      getCurrent: () => nav.moveSpeed, apply: (v) => { nav.moveSpeed = clamp(v, 0.1, 20); } },
    { label: 'roll', decimals: 0, title: 'Q/E roll rate, deg/sec while held — default 60',
      getCurrent: () => nav.rollRate, apply: (v) => { nav.rollRate = clamp(v, 10, 180); } },
    { label: 'grid', toggle: true, title: 'Show the ground grid',
      getCurrent: () => disp.grid, apply: (v) => { disp.grid = v; if (grid) grid.visible = v; render?.(); } },
    { label: 'axes', toggle: true, title: 'Show the world axes',
      getCurrent: () => disp.axes, apply: (v) => { disp.axes = v; if (axes) axes.visible = v; render?.(); } },
  ];

  const shell = makeShell(container, {
    stage,
    help: { html: HELP_HTML },
    settings: settingsFields,
    legend: 'drag orbit · scroll zoom · WASD move · Q/E roll · Space/Ctrl up·down',
    nav: 'orbit',
  });

  // The three.js scene fills the shell's scene pane (fill:true) instead of a
  // fixed 400×300 box — that's what makes it scene-dominant.
  const sc = makeScene(shell.sceneEl, { fill: true });
  const { scene } = sc;
  ({ grid, axes, render } = sc);

  // Rail cards: the controller (n/lift sliders + wireframe/normals toggles)
  // and the readout (vertex/triangle/index counts + raw index triples).
  const controlsCard = shell.addCard('Controls');
  const readoutCard = shell.addCard('Readout');

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'mesh-grid');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsCard, { id: `mesh-grid-${id}`, ...PARAMS[id] });
  }

  if (stage === 'full') {
    const wireRow = document.createElement('label');
    wireRow.className = 'slider-row';
    const wireCheckbox = document.createElement('input');
    wireCheckbox.type = 'checkbox';
    wireCheckbox.id = 'mesh-grid-wireframe';
    const wireText = document.createElement('span');
    wireText.className = 'slider-label';
    wireText.textContent = 'wireframe';
    wireRow.append(wireCheckbox, wireText);
    controlsCard.appendChild(wireRow);
    wireCheckbox.addEventListener('change', () => {
      showWireframe = wireCheckbox.checked;
      update();
    });

    const normRow = document.createElement('label');
    normRow.className = 'slider-row';
    const normCheckbox = document.createElement('input');
    normCheckbox.type = 'checkbox';
    normCheckbox.id = 'mesh-grid-normals';
    const normText = document.createElement('span');
    normText.className = 'slider-label';
    normText.textContent = 'normals';
    normRow.append(normCheckbox, normText);
    controlsCard.appendChild(normRow);
    normCheckbox.addEventListener('change', () => {
      showNormals = normCheckbox.checked;
      update();
    });
  }

  const counts = new ValueTable(readoutCard, {
    rows: [
      { id: 'vertices', label: 'vertices (n+1)²', className: 'row-u', format: (v) => v.toFixed(0) },
      { id: 'triangles', label: 'triangles 2n²', className: 'row-v', format: (v) => v.toFixed(0) },
      { id: 'indices', label: 'indices 6n²', className: 'row-w', format: (v) => v.toFixed(0) },
    ],
  });

  // Mono readout of the first two triangles' raw index triples — printed
  // truthfully from the array actually built above, not hard-coded.
  const triEl = document.createElement('pre');
  triEl.style.cssText =
    "margin:10px 0 0;padding:8px 10px;background:#14161d;border:1px solid #262a35;border-radius:6px;" +
    "font-family:'SF Mono','Menlo','Consolas',monospace;font-size:12px;color:#e7eaf0;white-space:pre;";
  readoutCard.appendChild(triEl);

  const material = new THREE.MeshStandardMaterial({ color: MESH_COLOR });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), material);
  scene.add(mesh);

  // ONE LineSegments object for the normals helper; its geometry is disposed
  // and replaced on every update() (never the object itself) — see
  // frustumMesh in projection.js for the identical idiom.
  const normalsMaterial = new THREE.LineBasicMaterial({ color: NORMAL_COLOR });
  const normalsMesh = new THREE.LineSegments(new THREE.BufferGeometry(), normalsMaterial);

  let currentN = null; // forces the first update() onto the rebuild path

  function rebuildGeometry(n) {
    const { positions, indices } = buildTopology(n);
    mesh.geometry.dispose();
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
    mesh.geometry = geom;
    currentN = n;
  }

  function update() {
    const n = Math.round(model.n);
    if (n !== currentN) {
      // n changed (or first call): topology size changed, so dispose the
      // old BufferGeometry and build fresh position/index arrays.
      rebuildGeometry(n);
    }

    const posAttr = mesh.geometry.getAttribute('position');
    const idxAttr = mesh.geometry.getIndex();
    const positions = posAttr.array;
    const indices = idxAttr.array;

    // Cheaper path (also covers the lift-only case): mutate ONE vertex's Y
    // in place — no geometry rebuild — then recompute normals onto the
    // existing attributes via needsUpdate.
    positions[centerIndex(n) * 3 + 1] = model.lift;
    posAttr.needsUpdate = true;

    const normals = computeNormals(positions, indices);
    const normAttr = mesh.geometry.getAttribute('normal');
    if (!normAttr || normAttr.array.length !== normals.length) {
      mesh.geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    } else {
      normAttr.array.set(normals);
      normAttr.needsUpdate = true;
    }

    material.wireframe = showWireframe;

    // Normals helper: rebuilt + its previous geometry disposed on every
    // update() (n, lift, wireframe, or normals-toggle change alike), never
    // left stale from a prior state.
    normalsMesh.geometry.dispose();
    if (showNormals) {
      const vertexCount = positions.length / 3;
      const segPoints = [];
      for (let i = 0; i < vertexCount; i++) {
        const p = new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        const nrm = new THREE.Vector3(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
        segPoints.push(p, p.clone().addScaledVector(nrm, NORMAL_LEN));
      }
      normalsMesh.geometry = new THREE.BufferGeometry().setFromPoints(segPoints);
      if (!normalsMesh.parent) scene.add(normalsMesh);
    } else {
      normalsMesh.geometry = new THREE.BufferGeometry();
      if (normalsMesh.parent) scene.remove(normalsMesh);
    }

    counts.update('vertices', (n + 1) ** 2);
    counts.update('triangles', 2 * n * n);
    counts.update('indices', 6 * n * n);

    const tri0 = [indices[0], indices[1], indices[2]];
    const tri1 = [indices[3], indices[4], indices[5]];
    triEl.textContent = `first two triangles (index triples):\ntri0: (${tri0.join(', ')})\ntri1: (${tri1.join(', ')})`;

    render();
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
  }

  // Free-look orbit camera: framed like the old fixed camera (eye (3,3,6),
  // looking at the origin) — the demo never set a custom camera, so this
  // matches scene-shell's previous default. Home restores that view.
  const cam = makeOrbitCamera({
    camera: sc.camera,
    render,
    home: { eye: [3, 3, 6], target: [0, 0, 0] },
    sceneEl: shell.sceneEl,
    container,
    stage,
    settings: nav,
  });
  shell.setNavController(cam);

  update();
  return { model, sliders, panel: counts, cam, input: cam };
}
