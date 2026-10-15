// football: a spiral pass, built step by step as one chain of 4 × 4 matrices (L05, affine transformations).
//
//   p_clip = P · V · F · H · T(t) · A(t) · W(t) · S(t) · p_mesh
//
// The math lives in lib/core/football.js (pure, tested in lib/tests/football.test.mjs); this file is the
// cockpit around it:
//   • the scene: the field as a coordinate box (10 m grid, rendered BackSide so the near walls are culled
//     and the far walls stay visible from any angle), the ball mesh in its own frame, a triad per frame,
//     the path, the shot camera's frustum
//   • two views in the shell's picture-in-picture slots: an OBSERVER that rides any frame of the chain
//     (orbit camera, its home per frame), and the SHOT CAMERA, rendered with exactly the chain's V and P
//     (matrixAutoUpdate off, matrices copied in); the green cross is the chain's own pixel for the nose
//   • overlays: the chain itself (click a link), and the time bar (the demo's one range input)
//   • a rail with four tabs: Steps (11 steps, the frame to ride, the shot camera), Throw (the static
//     parameters, presets), Chain (each link's matrix, its editable three.js code, its Unity C#, and one
//     point followed through every frame), Stored (Euler angles typed and read back, the quaternions, the
//     matrix the GPU receives)
// Every link's code is a snippet the user can edit; a snippet that throws falls back to the default for
// that frame and its chip turns red. Scene nodes take their matrices from the chain (matrixAutoUpdate
// false), so what is drawn is what the code computed.
import * as THREE from '../vendor/three.module.js';
import { makeShell } from '../core/demo-shell.js';
import { makeButton, bindNumberField, Mat4Panel, ValueTable } from '../core/cockpit.js';
import { makeOrbitCamera } from '../core/orbit-camera.js';
import {
  BALL, FIELD, DEFAULTS, LIMITS, PRESETS, GRAVITY, CART, SOURCES, V_SOURCE, CAMERAS, UNITY,
  compileLink, makeModel, evaluateChain, cartPlan, pathAt, velocityAt, follow, representations,
} from '../core/football.js';
import { buildLeather, buildLaces } from '../core/football-mesh.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { openCodeWindow } from './football-code.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const OBS = 1; // render layer for observer-only helpers (triads, labels, frustum); the shot camera sees layer 0

// ------------------------------------------------------------------ links, frames, steps

const LINK_INFO = {
  S: { label: 'S(t)', name: 'spin', from: 'object', to: 'spin axis', color: '#f2a65a',
    formula: 'S(t) = R_z(φ),  φ = 2π · (rpm / 60) · t' },
  W: { label: 'W(t)', name: 'wobble', from: 'spin axis', to: 'velocity', color: '#e6d96b',
    formula: 'W(t) = R_z(ψ) · R_x(β) · R_z(−ψ),  ψ = 2π · f · t' },
  A: { label: 'A(t)', name: 'aim', from: 'velocity', to: 'flight', color: '#7ee787',
    formula: 'A(t) = R_x(−θ),  θ = atan2(v_y, v_z)' },
  T: { label: 'T(t)', name: 'flight', from: 'flight', to: 'throw', color: '#56d4dd',
    formula: 'T(t) = translate(0, v sin α · t − ½ g t², v cos α · t)' },
  H: { label: 'H', name: 'throw set-up', from: 'throw', to: 'field', color: '#79a8ff',
    formula: 'H = T(start) · R_y(h)' },
  F: { label: 'F', name: 'field placement', from: 'field', to: 'world', color: '#b392f0',
    formula: 'F = R_y(γ) · T(−25, 0, −55)' },
  M: { label: 'M', name: 'model matrix (compose)', from: 'object', to: 'world', color: '#e7eaf0',
    formula: 'M = F · H · T(t) · A(t) · W(t) · S(t)' },
  C: { label: 'C', name: 'camera placement', from: 'camera', to: 'field', color: '#ff8fb1',
    formula: 'C: the shot camera’s placement in the field' },
  V: { label: 'V', name: 'view', from: 'world', to: 'camera', color: '#ff8fb1',
    formula: 'V = (F · C)⁻¹' },
  P: { label: 'P', name: 'projection', from: 'camera', to: 'clip', color: '#ff7b72',
    formula: 'P = perspective(fov, aspect, 0.05, 500)' },
  K: { label: 'K(t)', name: 'target cart', from: 'cart', to: 'field', color: '#5cc8a8',
    formula: 'K(t) = T(home + s(t)·dir) · R_y(heading) · T(0,0,L/2) · R_x(tilt) · T(0,0,−L/2)' },
  L: { label: 'K(t)·D(t)·K(tc)⁻¹', name: 'the catch: a change of parent', from: 'field', to: 'field, carried', color: '#5cc8a8',
    formula: 'after tc: ball = F · K(t) · D(t) · K(tc)⁻¹ · H·T·A·W·S(tc)' },
};
const CHAIN_ORDER = ['P', 'V', 'F', 'L', 'H', 'T', 'A', 'W', 'S']; // as written, left to right (L only once caught)
const RUN_ORDER = ['S', 'W', 'A', 'T', 'H', 'F', 'M', 'K', 'L', 'C', 'V', 'P']; // as applied, mesh first
const READ_ONLY = new Set(['V', 'K', 'L']);

/** the read-only code of the cart and the catch (the full versions are in the code window). */
const RO_SOURCES = {
  K: `// The cart in the field (pass.js, TargetPlan.placement).
const pos = home.clone().addScaledVector(dir, distanceAt(t));
return new THREE.Matrix4().makeTranslation(pos.x, 0, pos.z)
  .multiply(new THREE.Matrix4().makeRotationY(heading))
  .multiply(new THREE.Matrix4().makeTranslation(0, 0, L / 2))
  .multiply(new THREE.Matrix4().makeRotationX(tilt(t)))
  .multiply(new THREE.Matrix4().makeTranslation(0, 0, -L / 2));`,
  L: `// The catch (pass.js, thrownBall): a change of parent.
// At tc, express the ball in the cart's frame; it keeps
// its place in the world: local = K(tc)^-1 * ball(tc).
const local = placement(tc).invert().multiply(ballAt(tc));
// From then on it rides the cart, dropping into the bowl:
return placement(t)
  .multiply(new THREE.Matrix4().makeTranslation(0, -drop, 0))
  .multiply(local);`,
};
const RO_UNITY = {
  K: `Vector3 pos = home + dir * DistanceAt(t);
Matrix4x4 K = Matrix4x4.Translate(new Vector3(pos.x, 0f, pos.z))
            * Turn(heading, Vector3.up)
            * Matrix4x4.Translate(new Vector3(0f, 0f, half))
            * Turn(CrashTilt(t), Vector3.right)
            * Matrix4x4.Translate(new Vector3(0f, 0f, -half));`,
  L: `Matrix4x4 local = plan.Placement(tc).inverse * atEnd;
Matrix4x4 ball = plan.Placement(t)
               * Matrix4x4.Translate(new Vector3(0f, -drop, 0f)) * local;
// in a hierarchy: ball.transform.SetParent(cart, true)
// (worldPositionStays: true keeps it where it is)`,
};

const FRAMES = [
  { id: 'object', name: 'object', desc: 'the mesh’s own frame: it rides every link, spin included' },
  { id: 'spinAxis', name: 'spin axis', desc: 'the frame S maps into: the long axis holds still' },
  { id: 'velocity', name: 'velocity', desc: 'at the ball, z along the direction of flight' },
  { id: 'flight', name: 'flight', desc: 'at the ball, axes parallel to the throw frame' },
  { id: 'throw', name: 'throw', desc: 'origin at the release point, z along the heading' },
  { id: 'field', name: 'field', desc: 'the scene: the coordinate box, origin at a corner' },
  { id: 'world', name: 'world', desc: 'origin at midfield' },
  { id: 'camera', name: 'camera', desc: 'the shot camera’s eye frame: it looks down −z' },
  { id: 'target', name: 'cart', desc: 'the target cart: origin on the ground under it, z forward' },
];
const CLOSE = new Set(['object', 'spinAxis', 'velocity', 'flight']);
const TRIAD_SIZE = { object: 0.2, spinAxis: 0.27, velocity: 0.33, flight: 0.4, throw: 4, field: 8, world: 8, camera: 1.2, target: 1.6 };
const TRIAD_NAME = { object: 'object', spinAxis: 'spin axis', velocity: 'velocity', flight: 'flight', throw: 'throw', field: 'field', world: 'world', camera: 'camera', target: 'cart' };

const CHAIN_LINE = 'p_clip = P · V · F · H · T(t) · A(t) · W(t) · S(t) · p_mesh';

const STEPS = [
  { title: 'The mesh in its own frame', focus: null, select: 'S', view: 'object', play: false, t: 0, triads: ['object'], ruler: true,
    html: `<p>The ball's vertices are stored once, in the mesh's own frame (object space): origin at the ball's center,
    the long axis on <b>+z</b> (the forward direction in both engines), the laces on <b>+y</b>, meters: 0.28 m tip to
    tip, 0.16 m across. Nothing below edits these numbers. Every motion is a 4 × 4 matrix multiplied in front of them:</p>
    <p class="fb-eq">${CHAIN_LINE}</p>
    <p>The view rides the object frame, so the ball holds still. Drag to turn the view; the coordinate box in the
    distance is the field, seen from the release point. The model is "Football" by rnepb13 (BlendSwap, CC BY 3.0),
    converted for both tracks and kept in the course's models folder (the Code window shows how each loads it).</p>` },
  { title: 'Spin: S(t) = R_z(φ)', focus: 'S', view: 'spinAxis', play: true, triads: ['object', 'spinAxis'],
    html: `<p>A spiral is a spin about the long axis: φ = 2π · (rpm / 60) · t. At 600 rpm the ball turns 10 times a
    second, 60° per frame at 60 frames a second, too fast to follow, so the demo plays in slow motion (the speed
    buttons under the picture).</p>
    <p>S maps the object frame into the <b>spin-axis frame</b>, and the view now rides that frame: the long axis holds
    still while the laces and the object triad go around it. Riding the frame just above a link shows exactly the
    links built so far; the links to its left move that frame, and the view with it.</p>` },
  { title: 'Wobble: W(t) = R_z(ψ) R_x(β) R_z(−ψ)', focus: 'W', view: 'velocity', play: true, triads: ['spinAxis', 'velocity'], cone: true,
    html: `<p>A thrown spiral also wobbles: its long axis circles the direction of flight on a small cone (drawn).
    R_x(β) tilts the nose by the cone angle β; the sandwich R_z(ψ) · R_x(β) · R_z(ψ)⁻¹ makes the same tilt toward
    direction ψ = 2π · f · t instead. That is the pivot pattern of this lecture: do the move in a frame where it is
    simple, then turn that frame.</p>
    <p>W maps the spin-axis frame into the <b>velocity frame</b>, whose z is the direction of flight. A real ball's
    wobble rate follows from its spin and its moments of inertia; here the rate f is an input (2 Hz, cone 3°). Set
    the cone to 0 in the Throw tab and the wobble is gone.</p>` },
  { title: 'Aim: A(t) = R_x(−θ(t))', focus: 'A', view: 'flight', play: true, triads: ['velocity', 'flight'], vel: true,
    html: `<p>The nose follows the velocity (yellow arrow). In the throw frame the velocity is
    v = (0, v sin α − g t, v cos α), and its climb angle is θ = atan2(v_y, v_z): for the default throw 30° at
    release, 0 at the top, −31.4° when the target catches it. A positive turn about +x takes +z toward −y, so the
    code passes −θ.</p>
    <p>A maps the velocity frame into the <b>flight frame</b>: centered on the ball, axes parallel to the throw frame.
    Following the velocity exactly is the usual simplification in games; a real spiral's nose turns because the
    air's torque on the spinning ball makes it precess, and it does not track the velocity exactly.</p>` },
  { title: 'Flight: T(t), a parabola', focus: 'T', view: 'throw', play: true, triads: ['flight', 'throw'], plane: true,
    html: `<p>With gravity and no air drag the ball's center moves on a parabola in the throw's vertical plane:
    z(t) = v cos α · t, y(t) = v sin α · t − ½ g t². T translates the flight frame there; its rotation part is the
    identity, so the flight frame keeps the throw frame's axes.</p>
    <p>The view rides the <b>throw frame</b>: origin at the release point, z along the throw, y up; the motion stays
    in the shaded y-z plane. The default throw (22 m/s at 30°, released 2 m up, Seattle's g = 9.808 m/s²) peaks
    6.17 m above the release at t = 1.12 s and would come down after 2.41 s, 45.8 m away. The gravity menu in the
    Throw tab holds for every throw: Seattle, Denver, the Moon, or a white dwarf, where the ball is down in about a
    millisecond.</p>` },
  { title: 'Set up the throw: H = T(start) · R_y(h)', focus: 'H', view: 'field', play: true, triads: ['throw', 'field'],
    html: `<p>The throw frame is placed on the field once, from the static parameters: R_y(h) turns the throw's plane
    to heading h (0 is straight downfield, along the field's +z; 12° here), then T(start) moves its origin to the
    release point (20, 2, 25).</p>
    <p>The view rides the <b>field frame</b>, the scene's coordinate box: origin at a corner, x across (0 to 50 m),
    z along the field (0 to 110 m), y up, a grid line every 10 m. The box is drawn with back-face culling turned
    around: a wall shows only from inside, so the near walls drop out and the far walls stay visible from any angle.
    Edit the start, heading, angle and speed in the Throw tab.</p>` },
  { title: 'The target: K(t), a cart on wheels', focus: 'K', view: 'target', play: true, triads: ['target'],
    html: `<p>A cart carrying an open bowl waits 10 m to the thrower's left and 25 m downfield. It plans once per
    throw: drive in a straight line to where the ball will come down through the bowl's rim (1.3 m up), easing from
    rest so it arrives exactly then. Its placement is K(t) = T(position) · R_y(heading); each wheel is
    K(t) · T(offset) · R_x(s / r), turned by the distance driven over its radius: rolling without slipping.</p>
    <p>If the ball comes down outside the box, the cart drives at the wall, hits it and stops, its rear lifting over
    the front bumper: a tilt about the bumper's bottom edge, the pivot sandwich again, T(p) · R_x · T(−p). Try the
    <b>out of bounds</b> preset, or the Moon. If it cannot get there in time (a white dwarf) it misses. The view
    rides the cart's own frame.</p>` },
  { title: 'The catch: a change of parent', focus: 'L', view: 'field', play: true, triads: ['target', 'field'], t: 1.9,
    html: `<p>At the catch, t_c = 2.30 s for the default throw, the ball stops being a child of the throw and becomes a
    child of the cart. Its world placement must not jump, so its new local matrix is its old placement expressed in
    the cart's frame: L = K(t_c)⁻¹ · H · T · A · W · S at t_c. From then on it rides: F · K(t) · D(t) · L, where D
    drops it 0.46 m into the bowl.</p>
    <p>The chain at the top changes at the catch. In Unity this is <code>transform.SetParent(cart, true)</code>:
    "world position stays" computes exactly this L.</p>` },
  { title: 'Three balls, three chains', focus: null, select: 'M', view: 'throw', play: true, triads: ['throw'], three: true,
    home: { eye: [0, 0.4, -7.6], target: [0, -1.6, -1] },
    html: `<p>Two more balls share the throw frame, 3 m to either side of the thrower, so they move with the set-up.
    Ball 2 rests on the ground: H · T(3, r − 2, −1) · R_y(25°), its belly touching the grass. Ball 3 spins on its tip
    like a top: H · T(−3, −2, −1) · R_y(precession) · R_x(18° − 90°) · T(0, 0, L/2) · R_z(spin). Read it from the
    right: spin about the long axis, lift the ball half its length so its tip sits at the origin, lean it 18° from
    vertical, and let the lean go around.</p>
    <p>One mesh, three model matrices. The shot camera can look at any of them (the buttons under Shot camera).</p>` },
  { title: 'Place the field in the world: F', focus: 'F', view: 'world', play: true, triads: ['field', 'world'],
    html: `<p>The world's origin is at midfield: F = R_y(γ) · T(−25, 0, −55) moves the field's center to the world
    origin, then turns the whole field by γ about it. Everything to its right comes along: a point of the ball lands
    in the world at F · H · T(t) · A(t) · W(t) · S(t) · p_mesh, the <b>model matrix</b> M times p_mesh.</p>
    <p>The view rides the <b>world frame</b>. Set the field yaw γ in the Throw tab: the box, the throw, the cart and
    the balls turn together, and the world triad at midfield stays.</p>` },
  { title: 'Place a camera: C', focus: 'C', view: 'field', play: true, triads: ['camera'], cam: 'chase',
    html: `<p>A camera is placed like any object, by a matrix C whose columns are its right, up and back axes and its
    position; a three.js camera looks down its own −z (a Unity camera down its +z). Each shot-camera button builds C
    a different way: a tripod aimed once, a pan that follows, a cart on a sideline rail, a chase camera, a trailing
    skycam, two cameras mounted on the ball, the receiver's eyes, an orbit.</p>
    <p>The two ball cameras are children of a frame in the chain: on the steady frame the picture is steady, on the
    object frame it inherits the spin. Any camera can watch ball 1, 2 or 3. The inset shows what the camera sees;
    click it to swap the views.</p>` },
  { title: 'The view matrix: V = (F · C)⁻¹', focus: 'V', view: 'camera', play: true, triads: ['camera', 'world'],
    html: `<p>F · C places the camera in the world; its inverse, the <b>view matrix</b> V, moves the world into the
    <b>camera frame</b>: the camera at the origin, looking down −z. For a rigid placement [R | e] the inverse is
    [Rᵀ | −Rᵀ e], no general inverse needed.</p>
    <p>The view now rides the camera frame, so the camera and its frustum hold still and the field moves through
    them: the world as V hands it to the projection.</p>` },
  { title: 'Project: P, and the whole chain', focus: 'P', view: 'world', play: true, triads: [], swap: true, nose: true, cam: 'sideline',
    html: `<p>P maps the camera's view volume (a frustum) to clip space; the GPU divides by w and maps the result to
    pixels. The whole chain, read right to left: spin, wobble, aim, fly, set up, place, view, project.</p>
    <p class="fb-eq">${CHAIN_LINE}</p>
    <p>The big view is now the shot camera. The green cross is where the chain puts the ball's nose tip, computed one
    link at a time in the Chain tab (Follow one point); it sits on the nose. Edit a link's code there and the cross
    and the ball move together. The Code window shows the whole program, WebGL and Unity.</p>` },
  { title: 'What you type, what is stored', focus: 'M', view: 'flight', play: true, triads: ['flight'], stored: true,
    html: `<p>People edit an orientation as three Euler angles: Unity's inspector shows X (pitch), Y (heading),
    Z (spin), applied Z first, then X, then Y (three.js order 'YXZ'). The engine stores a quaternion; the GPU
    receives the 4 × 4 matrix as 16 floats.</p>
    <p>Open the <b>Stored</b> tab while it plays: the typed spin angle keeps growing, the read-back angles wrap to
    [0, 360), and the quaternion multiplied together from the half angles changes sign with every whole turn; the
    one read off the matrix is it or its negative (q and −q are one rotation). Then pick the <b>straight up</b>
    preset: at X = −90 the heading and the spin turn about the same axis (gimbal lock), and the read-back cannot
    tell them apart.</p>` },
];

const HELP_HTML = `
  <h4>What it shows</h4>
  <p>A spiral pass as one chain of 4 × 4 matrices, applied right to left:
  <code>p_clip = P·V·F·H·T(t)·A(t)·W(t)·S(t)·p_mesh</code>: spin, wobble, aim, flight, throw set-up, field
  placement, view, projection. The Steps tab builds it one link at a time.</p>
  <h4>Two views</h4>
  <p>The big view is an <b>observer</b> that rides one frame of the chain (Steps tab, View in frame): riding the
  frame just above a link shows the links built so far. The inset is the <b>shot camera</b>, drawn with the chain's
  own V and P; click it to swap.</p>
  <h4>The scene</h4>
  <p>A cart with an open bowl drives to where the ball comes down and catches it; if the ball comes down outside
  the box the cart hits the wall and stops. Ball 2 rests beside the thrower, ball 3 spins on its tip on the other
  side.</p>
  <h4>Edit it</h4>
  <p><b>Throw</b> tab: the static parameters (degrees, meters, seconds) and the gravity. <b>Chain</b> tab: each
  link's matrix and its three.js code, which you can edit (a snippet that fails turns its chip red and the default
  runs instead), with the Unity C# beside it. <b>Stored</b> tab: Euler angles, quaternions and the matrix.
  <b>Code</b>: the whole program as students get it, WebGL and Unity, by file or by section.</p>
  <h4>Controls</h4>
  <p>Drag to turn the observer, scroll to zoom, WASD to move, H for the frame's home view. The box's near walls are
  culled, so the far walls and their 10 m grid stay in view.</p>
  <h4>Credit</h4>
  <p>Ball model: "Football" by rnepb13, from BlendSwap, licensed CC BY 3.0; converted to glTF and OBJ and scaled
  to 0.28 m for this course.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

// ------------------------------------------------------------------ small three.js builders

function setLayer(obj, layer) { obj.traverse((o) => o.layers.set(layer)); }

const LABEL_CACHE = new Map();
function makeLabel(text, { color = '#e7eaf0', size = 1, weight = 600, screen = false } = {}) {
  const key = `${text}|${color}|${weight}`;
  let entry = LABEL_CACHE.get(key);
  if (!entry) {
    const c = document.createElement('canvas');
    const ctx = c.getContext('2d');
    const font = `${weight} 44px -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif`;
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(text).width) + 12;
    c.width = w;
    c.height = 60;
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(11,12,16,0.85)';
    ctx.strokeText(text, 6, 31);
    ctx.fillStyle = color;
    ctx.fillText(text, 6, 31);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    entry = { tex, aspect: w / 60 };
    LABEL_CACHE.set(key, entry);
  }
  // screen: a constant size on screen (size is then a fraction of the view's height, about)
  const mat = new THREE.SpriteMaterial({ map: entry.tex, transparent: true, depthWrite: false, sizeAttenuation: !screen });
  const s = new THREE.Sprite(mat);
  s.scale.set(size * entry.aspect, size, 1);
  return s;
}

function makeTriad(size, name) {
  const g = new THREE.Group();
  const head = size * 0.16;
  const axes = [
    [new THREE.Vector3(1, 0, 0), 0xff6b6b, '#ff8a8a', 'x'],
    [new THREE.Vector3(0, 1, 0), 0x63d47a, '#7ee787', 'y'],
    [new THREE.Vector3(0, 0, 1), 0x5c9bff, '#8ab4ff', 'z'],
  ];
  for (const [dir, col, css, letter] of axes) {
    g.add(new THREE.ArrowHelper(dir, new THREE.Vector3(), size, col, head, head * 0.55));
    const l = makeLabel(letter, { color: css, size: size * 0.17 });
    l.position.copy(dir).multiplyScalar(size * 1.13);
    g.add(l);
  }
  if (name) {
    const tag = makeLabel(name, { color: '#c7cdda', size: size * 0.13, weight: 500 });
    tag.position.set(size * 0.32, -size * 0.14, size * 0.32);
    g.add(tag);
  }
  setLayer(g, OBS);
  return g;
}

/** the ball, in its own frame. The model students get (lib/assets/models/football/football.glb, "Football" by
 *  rnepb13, BlendSwap, CC BY 3.0) loads once, and every ball swaps it in; until then a stand-in of the same
 *  size and frame (lib/core/football-mesh.js) holds its place. */
let BALL_PARTS = null;
let BALL_MODEL = null;
function makeBall() {
  if (!BALL_PARTS) {
    BALL_PARTS = {
      leather: buildLeather(), laces: buildLaces(),
      leatherMat: new THREE.MeshStandardMaterial({ color: 0x7a3a1c, roughness: 0.65, metalness: 0 }),
      laceMat: new THREE.MeshStandardMaterial({ color: 0xe8e2d4, roughness: 0.8 }),
    };
  }
  const g = new THREE.Group();
  g.add(new THREE.Mesh(BALL_PARTS.leather, BALL_PARTS.leatherMat), new THREE.Mesh(BALL_PARTS.laces, BALL_PARTS.laceMat));
  return g;
}

/** the model, loaded once for every demo on the page; resolves to the glTF scene, or null if it fails. */
function loadBallModel() {
  if (!BALL_MODEL) {
    BALL_MODEL = new Promise((resolve) => {
      const url = new URL('../assets/models/football/football.glb', import.meta.url).href;
      new GLTFLoader().load(url, (gltf) => resolve(gltf.scene), undefined, () => resolve(null));
    });
  }
  return BALL_MODEL;
}

/** replace a ball group's stand-in meshes with a copy of the model. */
function swapInModel(group, model) {
  for (const child of [...group.children]) group.remove(child);
  group.add(model.clone());
}

/** the target cart in its own frame (origin on the ground under it, +z forward): chassis, post, the open bowl.
 *  The wheels are separate: each is placed by its own matrix. */
function makeCart() {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0x3d7ae0, roughness: 0.5 });
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(CART.width, 0.3, CART.length), paint);
  chassis.position.set(0, 0.45, 0);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2), paint);
  post.position.set(0, 0.68, 0);
  const profile = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI / 2;
    profile.push(new THREE.Vector2(CART.bowlR * Math.sin(a), CART.rimY - CART.bowlR * Math.cos(a)));
  }
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 48),
    new THREE.MeshStandardMaterial({ color: 0xf2a65a, roughness: 0.6, side: THREE.DoubleSide }));
  const rim = new THREE.Mesh(new THREE.TorusGeometry(CART.bowlR, 0.02, 8, 48).rotateX(Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xffd479 }));
  rim.position.y = CART.rimY;
  g.add(chassis, post, bowl, rim);
  return g;
}

function makeWheel() {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(CART.wheelR, CART.wheelR, CART.wheelW, 32),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 }));
  disc.rotation.z = Math.PI / 2;   // the cylinder's axis, y, becomes the axle, x
  const bar = new THREE.Mesh(new THREE.BoxGeometry(CART.wheelW + 0.01, 0.05, 2 * CART.wheelR - 0.1),
    new THREE.MeshStandardMaterial({ color: 0xffffff }));
  g.add(disc, bar);
  return g;
}

/** the coordinate box: inward-facing walls with a 10 m grid, drawn from inside only (THREE.BackSide). */
function makeBox() {
  const geo = new THREE.BoxGeometry(FIELD.width, FIELD.height, FIELD.length);
  geo.translate(FIELD.width / 2, FIELD.height / 2, FIELD.length / 2); // vertex positions are field coordinates
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      uWall: { value: new THREE.Color(0x141a26) },
      uFloor: { value: new THREE.Color(0x173a24) },
      uEnd: { value: new THREE.Color(0x1d4a32) },
      uLine: { value: new THREE.Color(0x3d4c6b) },
      uFloorLine: { value: new THREE.Color(0x4f7a5c) },
      uGoal: { value: new THREE.Color(0xd8e2d0) },
    },
    vertexShader: `
      varying vec3 vPos;
      varying vec3 vN;
      void main() {
        vPos = position;
        vN = normal;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uWall, uFloor, uEnd, uLine, uFloorLine, uGoal;
      varying vec3 vPos;
      varying vec3 vN;
      float gridLine(vec3 p, vec3 n, float spacing) {
        vec3 q = p / spacing;
        vec3 w = max(fwidth(q), vec3(1e-5));
        vec3 g = abs(fract(q - 0.5) - 0.5) / w;
        vec3 mask = vec3(1.0) - step(0.5, abs(n));  // skip the axis normal to this face
        vec3 l = (vec3(1.0) - clamp(g, 0.0, 1.0)) * mask;
        return max(max(l.x, l.y), l.z);
      }
      void main() {
        bool isFloor = abs(vN.y) > 0.5 && vPos.y < 1.0;
        vec3 base = uWall;
        vec3 line = uLine;
        if (isFloor) {
          base = (vPos.z < ${FIELD.endZone.toFixed(1)} || vPos.z > ${(FIELD.length - FIELD.endZone).toFixed(1)}) ? uEnd : uFloor;
          line = uFloorLine;
          float goal = min(abs(vPos.z - ${FIELD.endZone.toFixed(1)}), abs(vPos.z - ${(FIELD.length - FIELD.endZone).toFixed(1)}));
          if (goal < 0.25) line = uGoal;
        }
        float l = gridLine(vPos, vN, ${FIELD.grid.toFixed(1)});
        gl_FragColor = vec4(mix(base, line, l), 1.0);
        #include <colorspace_fragment>
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

/** tick labels on the box's edges, every 10 m; update(eye) keeps the ones on the edges nearest the eye. */
function makeTicks() {
  const g = new THREE.Group();
  const sets = {};
  const add = (key, items) => {
    const s = new THREE.Group();
    for (const [text, x, y, z, big] of items) {
      const l = makeLabel(text, { size: big ? 0.026 : 0.021, color: big ? '#c7cdda' : '#9aa3b8', weight: big ? 600 : 500, screen: true });
      l.position.set(x, y, z);
      s.add(l);
    }
    sets[key] = s;
    g.add(s);
  };
  const W = FIELD.width, L = FIELD.length, Ht = FIELD.height, o = 3.2;
  for (const xe of [0, W]) {
    const off = xe === 0 ? -o : W + o;
    const items = [];
    for (let z = 0; z <= L; z += FIELD.grid) items.push([`${z}`, off, 0, z]);
    items.push(['z (m)', off, 0, L + 9, true]);
    add(`z${xe}`, items);
  }
  for (const ze of [0, L]) {
    const off = ze === 0 ? -o : L + o;
    const items = [];
    for (let x = 0; x <= W; x += FIELD.grid) items.push([`${x}`, x, 0, off]);
    items.push(['x (m)', W + 8, 0, off, true]);
    add(`x${ze}`, items);
  }
  for (const xe of [0, W]) for (const ze of [0, L]) {
    const items = [];
    for (let y = FIELD.grid; y <= Ht; y += FIELD.grid) items.push([`${y}`, xe === 0 ? -o : W + o, y, ze === 0 ? -o : L + o]);
    items.push(['y (m)', xe === 0 ? -o : W + o, Ht + 5, ze === 0 ? -o : L + o, true]);
    add(`y${xe},${ze}`, items);
  }
  setLayer(g, OBS);
  function update(eye) {
    const xn = eye.x < W / 2 ? 0 : W;
    const zn = eye.z < L / 2 ? 0 : L;
    for (const [k, s] of Object.entries(sets)) s.visible = false;
    sets[`z${xn}`].visible = true;
    sets[`x${zn}`].visible = true;
    sets[`y${xn},${zn}`].visible = true;
  }
  return { group: g, update };
}

// ------------------------------------------------------------------ styles (scoped to this demo)

const CSS = `
.cockpit .fb-root .demo-shell-rail { flex: 0 0 460px; gap: 8px; overflow-y: auto; }
.cockpit .fb-root.demo-shell-root--embed { max-width: none; height: 600px; }
.cockpit .fb-root .demo-shell-scene--embed { height: 100%; min-height: 0; }
.cockpit .fb-root .demo-shell-rail--embed { flex: 0 0 330px; max-height: none; height: 100%; }
/* doubled class: outranks the decks' full-slide rule (.reveal section.demo-full [data-demo] canvas) */
.fb-root.fb-root .demo-shell-pip-slot canvas.fb-canvas { width: 100% !important; height: 100% !important; display: block; }
.fb-root .demo-shell-pip-slot--small { bottom: 50px; width: 34%; height: 34%; }
.fb-chain { position: absolute; left: 8px; right: 72px; top: 8px; z-index: 6; display: flex; flex-wrap: wrap;
  align-items: center; gap: 3px; padding: 4px 8px; background: rgba(11,12,16,0.78); border: 1px solid #262a35;
  border-radius: 6px; font: 600 13px/1.2 'SF Mono', Menlo, Consolas, monospace; color: #c7cdda; }
.fb-chip { border: 1px solid #3a4050; background: #14161d; color: var(--c); border-radius: 4px; padding: 2px 6px;
  font: inherit; cursor: pointer; }
.fb-chip.focus { background: var(--c); color: #0b0c10; border-color: var(--c); }
.fb-chip.off { text-decoration: line-through; opacity: 0.45; }
.fb-chip.err { border-color: #ff5555; box-shadow: 0 0 0 1px #ff5555; }
.fb-dot { color: #5c6478; }
.fb-tag { position: absolute; left: 8px; z-index: 4; font: 12px/1.3 -apple-system, Segoe UI, Roboto, sans-serif;
  color: #c7cdda; background: rgba(11,12,16,0.72); padding: 2px 6px; border-radius: 4px; pointer-events: none; }
.demo-shell-pip-slot--big .fb-tag { top: 44px; }
.demo-shell-pip-slot--small .fb-tag { top: 4px; font-size: 11px; }
.fb-cross { position: absolute; z-index: 4; width: 26px; height: 26px; margin: -13px 0 0 -13px; pointer-events: none; }
.fb-cross svg { display: block; }
.fb-time { position: absolute; left: 8px; right: 8px; bottom: 8px; z-index: 6; display: flex; align-items: center; gap: 6px;
  padding: 4px 8px; background: rgba(11,12,16,0.82); border: 1px solid #262a35; border-radius: 6px;
  font: 12px/1.2 -apple-system, Segoe UI, Roboto, sans-serif; color: #c7cdda; }
.fb-time input[type=range] { flex: 1; min-width: 60px; accent-color: #7ee787; }
.fb-time button { background: #1c1f28; color: #e7eaf0; border: 1px solid #262a35; border-radius: 4px; padding: 3px 7px;
  font: 12px/1.2 -apple-system, Segoe UI, Roboto, sans-serif; cursor: pointer; }
.fb-time button.on { background: #17301f; border-color: #2d6b46; color: #7ee787; }
.fb-time .fb-t { font-family: 'SF Mono', Menlo, Consolas, monospace; min-width: 9.5em; text-align: right; }
.cockpit .fb-tabs { display: flex; gap: 4px; position: sticky; top: 0; z-index: 2; background: #0b0c10; padding-bottom: 2px; }
.cockpit .fb-tabs button { flex: 1; background: #14161d; color: #8b93a7; border: 1px solid #262a35; border-radius: 5px;
  padding: 6px 4px; font: 600 12px/1 -apple-system, Segoe UI, Roboto, sans-serif; cursor: pointer; }
.cockpit .fb-tabs button.on { background: #1c2433; color: #e7eaf0; border-color: #3a4c6e; }
.cockpit .fb-pane { display: flex; flex-direction: column; gap: 8px; }
.cockpit .fb-pane[hidden] { display: none; }
.cockpit .fb-root .demo-shell-card { padding: 8px 10px; }
.cockpit .fb-root .demo-shell-card h3 { margin-bottom: 6px; }
.cockpit .fb-root .demo-shell-rail { text-align: left; }
.cockpit .fb-step-title { margin: 0 0 6px; font: 600 15px/1.3 -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  color: #e7eaf0; text-transform: none; letter-spacing: normal; text-align: left; }
.cockpit .fb-narr { font-size: 12.5px; line-height: 1.45; color: #d3d8e3; }
.cockpit .fb-narr p { margin: 0 0 7px; }
.cockpit .fb-eq { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 11.5px; color: #e6d96b;
  background: #14161d; border: 1px solid #262a35; border-radius: 4px; padding: 4px 6px; overflow-x: auto; white-space: nowrap; }
.cockpit .fb-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
.cockpit .fb-grid.three { grid-template-columns: repeat(3, 1fr); }
.cockpit .fb-grid button, .cockpit .fb-presets button { background: #1c1f28; color: #e7eaf0; border: 1px solid #262a35;
  border-radius: 4px; padding: 4px 3px; font: 11.5px/1.2 -apple-system, Segoe UI, Roboto, sans-serif; cursor: pointer; }
.cockpit .fb-grid button.on { background: #17301f; border-color: #2d6b46; color: #7ee787; }
.cockpit .fb-presets { display: flex; flex-wrap: wrap; gap: 4px; }
.cockpit .fb-select { flex: 1; min-width: 0; background: #0b0c10; color: #e7eaf0; border: 1px solid #262a35; border-radius: 4px;
  padding: 3px 4px; font: 12px -apple-system, Segoe UI, Roboto, sans-serif; }
.cockpit .fb-tabs button:last-child { flex: 0 0 auto; color: #7ee787; border-color: #2d6b46; }
.cockpit .fb-dots { display: flex; gap: 3px; margin: 6px 0 0; }
.cockpit .fb-dots button { flex: 1; height: 7px; padding: 0; border: none; border-radius: 3px; background: #262a35; cursor: pointer; }
.cockpit .fb-dots button.on { background: #7ee787; }
.cockpit .fb-root .demo-shell-field-label { flex: 0 0 7.2em; }
.cockpit .fb-two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0 12px; }
.cockpit .fb-two .demo-shell-field-input { width: 100%; min-width: 0; }
.cockpit .fb-two .demo-shell-field-label { flex: 0 0 6.6em; }
.cockpit .fb-note { font-size: 11.5px; color: #8b93a7; margin: 6px 0 0; line-height: 1.4; }
.cockpit .fb-links { display: flex; flex-direction: column; gap: 2px; }
.cockpit .fb-link { display: flex; align-items: center; gap: 6px; padding: 3px 4px; border-radius: 4px; cursor: pointer;
  font-size: 12px; color: #c7cdda; }
.cockpit .fb-link:hover { background: #1c1f28; }
.cockpit .fb-link.sel { background: #1c2433; }
.cockpit .fb-link .fb-chip { min-width: 3.4em; text-align: center; }
.cockpit .fb-link .fb-frames { color: #8b93a7; margin-left: auto; font-size: 11px; }
.cockpit .fb-link input { margin: 0; }
.cockpit .fb-formula { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 11.5px; color: #e6d96b; margin: 0 0 6px; }
.cockpit .fb-code-tabs { display: flex; gap: 3px; margin: 8px 0 0; }
.cockpit .fb-code-tabs button { background: #14161d; color: #8b93a7; border: 1px solid #262a35; border-bottom: none;
  border-radius: 5px 5px 0 0; padding: 4px 8px; font: 600 11px/1 -apple-system, Segoe UI, Roboto, sans-serif; cursor: pointer; }
.cockpit .fb-code-tabs button.on { background: #0f1117; color: #e7eaf0; }
.cockpit .fb-code { width: 100%; box-sizing: border-box; min-height: 150px; resize: vertical; background: #0f1117;
  color: #e7eaf0; border: 1px solid #262a35; border-radius: 0 5px 5px 5px; padding: 6px 8px; margin: 0;
  font: 11px/1.45 'SF Mono', Menlo, Consolas, monospace; white-space: pre; overflow: auto; tab-size: 2; }
.cockpit pre.fb-code { min-height: 0; color: #c9d1d9; }
.cockpit .fb-err { color: #ff8a8a; font: 11px/1.35 'SF Mono', Menlo, Consolas, monospace; margin: 4px 0 0; white-space: pre-wrap; }
.cockpit .fb-ok { color: #7ee787; font-size: 11px; margin: 4px 0 0; }
.cockpit .fb-root .mat-panel td { padding: 2px 4px; font-size: 11px; white-space: nowrap; }
.cockpit .fb-root .mat-panel td.value-label { text-align: left; color: #8b93a7; white-space: normal; min-width: 8.5em; }
.cockpit .fb-gpu { font: 10.5px/1.4 'SF Mono', Menlo, Consolas, monospace; color: #9aa3b8; word-break: break-all; margin: 6px 0 0; }
`;

function injectCss() {
  if (document.getElementById('fb-css')) return;
  const st = document.createElement('style');
  st.id = 'fb-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

// ------------------------------------------------------------------ the demo

/**
 * make(container, { stage, controls })
 * controls (deck embeds, data-controls="step:6,cam:sideline"): step:N (1-based), view:<frame id>,
 * cam:<camera id>, tab:steps|throw|chain|stored.
 */
export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  const opts = Object.fromEntries((controls || []).map((c) => String(c).split(':')).filter((kv) => kv.length === 2));

  const model = makeModel();
  const sources = { ...SOURCES, ...Object.fromEntries(CAMERAS.map((c) => [`C:${c.id}`, c.src])) };
  const compileErr = {};
  let t = 0;
  let tEnd = 6;
  let playing = false;
  let speed = 0.25;
  let hold = 0;
  let step = 0;
  let view = 'object';
  let focus = 'S';
  let selected = 'S';
  let tab = 'steps';
  let pointKey = 'nose';
  const disp = { labels: true, allTriads: false, path: true, marker: true, drop: true, nose: true, loop: true };
  let stepVis = STEPS[0];
  let pathDirty = true;
  let lastRes = null;

  // ---- shell
  const nav = { orbitSpeed: 0.4, zoomSpeed: 0.12, moveSpeed: 3, rollRate: 60, minDistance: 0.12, maxDistance: 900 };
  const settings = [
    { label: 'orbit', decimals: 2, title: 'Orbit sensitivity, degrees per pixel of drag',
      getCurrent: () => nav.orbitSpeed, apply: (v) => { nav.orbitSpeed = clamp(v, 0.02, 2); } },
    { label: 'zoom', decimals: 2, title: 'Zoom step, fraction of the distance per wheel notch',
      getCurrent: () => nav.zoomSpeed, apply: (v) => { nav.zoomSpeed = clamp(v, 0.02, 0.5); } },
    { label: 'move', decimals: 1, title: 'WASD speed, meters per second (scaled up in the big frames)',
      getCurrent: () => nav.moveSpeed, apply: (v) => { nav.moveSpeed = clamp(v, 0.1, 100); } },
    { label: 'tick labels', toggle: true, title: 'Meters along the box edges', getCurrent: () => disp.labels, apply: (v) => { disp.labels = v; requestFrame(); } },
    { label: 'all triads', toggle: true, title: 'Draw every frame’s axes, not only the step’s', getCurrent: () => disp.allTriads, apply: (v) => { disp.allTriads = v; requestFrame(); } },
    { label: 'path', toggle: true, title: 'The flight path', getCurrent: () => disp.path, apply: (v) => { disp.path = v; requestFrame(); } },
    { label: 'ball ring', toggle: true, title: 'A ring of constant screen size around the ball in the wide views', getCurrent: () => disp.marker, apply: (v) => { disp.marker = v; requestFrame(); } },
    { label: 'drop line', toggle: true, title: 'A line from the ball to the ground', getCurrent: () => disp.drop, apply: (v) => { disp.drop = v; requestFrame(); } },
    { label: 'nose cross', toggle: true, title: 'The chain’s pixel for the nose tip, in the shot view', getCurrent: () => disp.nose, apply: (v) => { disp.nose = v; requestFrame(); } },
    { label: 'loop', toggle: true, title: 'Start the throw again after it lands', getCurrent: () => disp.loop, apply: (v) => { disp.loop = v; } },
  ];
  const shell = makeShell(container, {
    stage, help: { html: HELP_HTML }, settings, nav: 'orbit', pip: true,
    onSwap: () => { layoutTags(); fitAll(); requestFrame(); },
  });
  shell.rootEl.classList.add('fb-root');
  shell.railEl.classList.add('fb-rail');

  // ---- renderers: the observer in the main slot, the shot camera in the inset
  const mkRenderer = (slot) => {
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.setSize(400, 300, false);
    r.setClearColor(0x0b0c10);
    r.domElement.classList.add('fb-canvas');
    slot.appendChild(r.domElement);
    return r;
  };
  const obsRenderer = mkRenderer(shell.mainEl);
  const shotRenderer = mkRenderer(shell.insetEl);
  const obsTag = document.createElement('div');
  obsTag.className = 'fb-tag';
  shell.mainEl.appendChild(obsTag);
  const shotTag = document.createElement('div');
  shotTag.className = 'fb-tag';
  shell.insetEl.appendChild(shotTag);
  const cross = document.createElement('div');
  cross.className = 'fb-cross';
  cross.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M13 0v8M13 18v8M0 13h8M18 13h8" stroke="#3dff8f" stroke-width="2"/></svg>';
  cross.title = 'the nose tip, where the chain puts it';
  shell.insetEl.appendChild(cross);
  function layoutTags() { /* the tags ride their slots; nothing to move, kept for onSwap symmetry */ }

  // ---- scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0c10);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a2d33, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-30, 60, 20);
  scene.add(sun);

  const node = () => { const g = new THREE.Group(); g.matrixAutoUpdate = false; scene.add(g); return g; };
  const G = Object.fromEntries(FRAMES.map((f) => [f.id, node()]));
  const ballG = node();
  const ball = makeBall();
  ballG.add(ball);
  // the target cart and its wheels, and balls 2 and 3: field matrices, so they hang from the field node
  const fieldNode = (obj) => { obj.matrixAutoUpdate = false; G.field.add(obj); return obj; };
  const cartG = fieldNode(makeCart());
  const wheelGs = [0, 1, 2, 3].map(() => fieldNode(makeWheel()));
  const ball2G = fieldNode(makeBall());
  const ball3G = fieldNode(makeBall());
  loadBallModel().then((model) => {
    if (!model) return;   // the stand-in stays
    for (const g of [ball, ball2G, ball3G]) swapInModel(g, model);
    requestFrame();
  });

  const box = makeBox();
  G.field.add(box);
  const ticks = makeTicks();
  G.field.add(ticks.group);

  const triads = {};
  for (const f of FRAMES) {
    triads[f.id] = makeTriad(TRIAD_SIZE[f.id], TRIAD_NAME[f.id]);
    (f.id === 'object' ? ballG : G[f.id]).add(triads[f.id]);
  }

  // ruler (step 1): length and width of the ball, in its own frame
  const ruler = new THREE.Group();
  {
    const mat = new THREE.LineBasicMaterial({ color: 0xc7cdda });
    const seg = (a, b) => new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]), mat);
    const yL = -0.125, h = BALL.length / 2, r = BALL.radius;
    ruler.add(seg([0, yL, -h], [0, yL, h]), seg([0, yL - 0.008, -h], [0, yL + 0.008, -h]), seg([0, yL - 0.008, h], [0, yL + 0.008, h]));
    const yW = yL - 0.04;
    ruler.add(seg([-r, yW, 0], [r, yW, 0]), seg([-r, yW - 0.008, 0], [-r, yW + 0.008, 0]), seg([r, yW - 0.008, 0], [r, yW + 0.008, 0]));
    const l1 = makeLabel('0.28 m', { size: 0.024 }); l1.position.set(0, yL + 0.016, 0.075);
    const l2 = makeLabel('0.16 m', { size: 0.024 }); l2.position.set(-r - 0.05, yW, 0);
    ruler.add(l1, l2);
    setLayer(ruler, OBS);
  }
  ballG.add(ruler);

  // wobble cone (step 3), in the velocity frame: apex at the ball's center, opening along +z
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xe6d96b, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const coneMesh = new THREE.Mesh(new THREE.BufferGeometry(), coneMat);
  const coneRim = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xe6d96b }));
  const coneG = new THREE.Group();
  coneG.add(coneMesh, coneRim);
  G.velocity.add(coneG);
  let coneFor = null;
  function rebuildCone() {
    const beta = clamp(model.p.cone, 0.2, 60) * Math.PI / 180;
    const L = 0.3, r = L * Math.tan(beta);
    const g = new THREE.ConeGeometry(r, L, 48, 1, true);
    g.translate(0, -L / 2, 0);   // apex at the origin, base at y = -L
    g.rotateX(-Math.PI / 2);     // -y becomes +z
    coneMesh.geometry.dispose();
    coneMesh.geometry = g;
    const pts = [];
    for (let i = 0; i < 64; i++) { const a = (i / 64) * 2 * Math.PI; pts.push(new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), L)); }
    coneRim.geometry.dispose();
    coneRim.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    setLayer(coneG, OBS);
    coneFor = model.p.cone;
  }

  // velocity arrow (step 4 on), in the flight frame
  const velArrow = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(), 0.55, 0xe6d96b, 0.07, 0.035);
  setLayer(velArrow, OBS);
  G.flight.add(velArrow);

  // path in the throw frame: the whole flight dim, the part flown bright
  const NP = 240;
  const pathGeo = new THREE.BufferGeometry();
  pathGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NP * 3), 3));
  const doneGeo = new THREE.BufferGeometry();
  doneGeo.setAttribute('position', pathGeo.attributes.position); // shared points, its own draw range
  const pathAll = new THREE.Line(pathGeo, new THREE.LineBasicMaterial({ color: 0x56607a }));
  const pathDone = new THREE.Line(doneGeo, new THREE.LineBasicMaterial({ color: 0xffd479 }));
  G.throw.add(pathAll, pathDone);
  pathAll.renderOrder = 1;
  pathDone.renderOrder = 2;
  // the throw's plane (step 5)
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x56d4dd, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  setLayer(plane, OBS);
  G.throw.add(plane);
  // release and landing markers, shadow and drop line, in the field frame
  const ringGeo = new THREE.RingGeometry(0.35, 0.5, 40).rotateX(-Math.PI / 2);
  const releaseMark = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x79a8ff }));
  const landMark = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffd479 }));
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.16, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
  const dropGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
  const drop = new THREE.Line(dropGeo, new THREE.LineBasicMaterial({ color: 0x9aa3b8, transparent: true, opacity: 0.6 }));
  setLayer(drop, OBS);
  G.field.add(releaseMark, landMark, shadow, drop);
  // a ring of constant screen size around the ball, for the wide views
  const ringTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); x.strokeStyle = '#ffd479'; x.lineWidth = 5; x.beginPath(); x.arc(32, 32, 26, 0, 2 * Math.PI); x.stroke();
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  })();
  const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, sizeAttenuation: false, depthTest: false, transparent: true }));
  marker.scale.set(0.045, 0.045, 1);
  marker.renderOrder = 20;
  setLayer(marker, OBS);
  ballG.add(marker);

  // the shot camera as an object: a small body and a frustum 6 m deep, in the camera frame
  const camBody = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.28, 0.5), new THREE.MeshStandardMaterial({ color: 0xff8fb1, roughness: 0.6 }));
  camBody.position.z = 0.25;
  const frustumGeo = new THREE.BufferGeometry();
  frustumGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3));
  const frustum = new THREE.LineSegments(frustumGeo, new THREE.LineBasicMaterial({ color: 0xff8fb1 }));
  const camViz = new THREE.Group();
  camViz.add(camBody, frustum);
  setLayer(camViz, OBS);
  G.camera.add(camViz);
  function setFrustum(fov, aspect) {
    const L = 6, hh = L * Math.tan((fov * Math.PI) / 360), hw = hh * aspect;
    const c = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]].map(([x, y]) => [x, y, -L]);
    const a = frustumGeo.attributes.position.array;
    let i = 0;
    const put = (p) => { a[i++] = p[0]; a[i++] = p[1]; a[i++] = p[2]; };
    for (let k = 0; k < 4; k++) { put([0, 0, 0]); put(c[k]); }
    for (let k = 0; k < 4; k++) { put(c[k]); put(c[(k + 1) % 4]); }
    frustumGeo.attributes.position.needsUpdate = true;
    frustumGeo.computeBoundingSphere();
  }

  // ---- cameras
  const obsCam = new THREE.PerspectiveCamera(50, 1.6, 0.01, 3000);
  obsCam.matrixAutoUpdate = false;
  obsCam.layers.enable(OBS);
  const shotCam = new THREE.PerspectiveCamera(50, 1.6, 0.05, 500);
  shotCam.matrixAutoUpdate = false;
  const proxy = new THREE.PerspectiveCamera();

  const throwInfo = { range: 46, apex: 6.2, startY: 2 };
  function homeOf(id) {
    switch (id) {
      case 'object': case 'spinAxis': return { eye: [-0.78, 0.32, 0.26], target: [0.05, -0.07, 0.17] };
      case 'velocity': return { eye: [-1.0, 0.36, 0.08], target: [0.05, -0.08, 0.2] };
      case 'flight': return { eye: [-1.7, 0.45, 0.2], target: [0.1, -0.12, 0.35] };
      case 'throw': {
        const R = Math.max(8, throwInfo.range);
        return { eye: [-Math.max(16, 1.02 * R), 0.4 * throwInfo.apex + 3, R / 2], target: [0, 0.4 * throwInfo.apex, R / 2] };
      }
      case 'field': return { eye: [-82, 62, 55], target: [25, 9, 55] };
      case 'world': return { eye: [-107, 62, 0], target: [0, 9, 0] };
      case 'camera': return { eye: [1.8, 1.3, 3.4], target: [0, 0, -5] };
      case 'target': return { eye: [-4.2, 3.0, -5.2], target: [0, 0.9, 1.2] };
      default: return { eye: [3, 3, 6], target: [0, 0, 0] };
    }
  }

  let frameReq = null;
  let lastNow = 0;
  let visible = true;
  function requestFrame() {
    if (frameReq == null && visible) frameReq = requestAnimationFrame(frame);
  }
  const orbit = makeOrbitCamera({
    camera: proxy, render: requestFrame, home: homeOf(view), sceneEl: shell.sceneEl, container, stage, settings: nav,
  });
  shell.setNavController(orbit);

  // ---- overlays: the chain and the time bar
  const chainBar = document.createElement('div');
  chainBar.className = 'fb-chain';
  chainBar.addEventListener('mousedown', (e) => e.stopPropagation());
  const chips = {};
  const addText = (s, cls = 'fb-dot') => { const sp = document.createElement('span'); sp.className = cls; sp.textContent = s; chainBar.appendChild(sp); };
  addText('p_clip =', '');
  const chainDots = {};
  CHAIN_ORDER.forEach((id, i) => {
    if (i) { addText('·'); chainDots[id] = chainBar.lastChild; }
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fb-chip';
    b.style.setProperty('--c', LINK_INFO[id].color);
    b.textContent = LINK_INFO[id].label;
    b.title = `${LINK_INFO[id].name}: ${LINK_INFO[id].from} → ${LINK_INFO[id].to}`;
    b.addEventListener('click', () => { selectLink(id); setTab('chain'); b.blur(); });
    chainBar.appendChild(b);
    chips[id] = b;
  });
  addText('·');
  addText('p_mesh', '');
  const atTc = document.createElement('span');
  atTc.className = 'fb-dot';
  atTc.textContent = '(H·T·A·W·S frozen at the catch, t_c)';
  chainBar.appendChild(atTc);
  shell.sceneEl.appendChild(chainBar);

  const timeBar = document.createElement('div');
  timeBar.className = 'fb-time';
  timeBar.addEventListener('mousedown', (e) => e.stopPropagation());
  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.addEventListener('click', () => { setPlaying(!playing); playBtn.blur(); });
  const restartBtn = document.createElement('button');
  restartBtn.type = 'button';
  restartBtn.textContent = '⟲';
  restartBtn.title = 'Back to the release';
  restartBtn.addEventListener('click', () => { setTime(0); restartBtn.blur(); });
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '0';
  slider.max = '1000';
  slider.step = '1';
  slider.value = '0';
  slider.setAttribute('aria-label', 'time since release');
  slider.addEventListener('input', () => { setPlaying(false); setTime((+slider.value / 1000) * tEnd); });
  const tOut = document.createElement('span');
  tOut.className = 'fb-t';
  timeBar.append(playBtn, restartBtn, slider, tOut);
  const speedBtns = {};
  for (const s of [0.1, 0.25, 0.5, 1]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${s}×`;
    b.title = s === 1 ? 'real time' : `slow motion, ${s} of real time`;
    b.addEventListener('click', () => { speed = s; for (const [k, x] of Object.entries(speedBtns)) x.classList.toggle('on', +k === s); b.blur(); });
    speedBtns[s] = b;
    timeBar.appendChild(b);
  }
  speedBtns[speed].classList.add('on');
  shell.sceneEl.appendChild(timeBar);

  // ---- rail: four tabs
  const tabBar = document.createElement('div');
  tabBar.className = 'fb-tabs';
  shell.railEl.appendChild(tabBar);
  const panes = {};
  const tabBtns = {};
  const codeBtn = document.createElement('button');
  codeBtn.type = 'button';
  codeBtn.textContent = '</> Code';
  codeBtn.title = 'The whole program, WebGL and Unity, by file or by section';
  codeBtn.addEventListener('click', () => { openCodeWindow(shell.rootEl); codeBtn.blur(); });
  for (const [id, label] of [['steps', 'Steps'], ['throw', 'Throw'], ['chain', 'Chain'], ['stored', 'Stored']]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', () => { setTab(id); b.blur(); });
    tabBar.appendChild(b);
    tabBtns[id] = b;
    const pane = document.createElement('div');
    pane.className = 'fb-pane';
    shell.railEl.appendChild(pane);
    panes[id] = pane;
  }
  tabBar.appendChild(codeBtn);
  const card = (pane, title) => {
    const c = document.createElement('div');
    c.className = 'demo-shell-card';
    if (title) { const h = document.createElement('h3'); h.textContent = title; c.appendChild(h); }
    panes[pane].appendChild(c);
    return c;
  };
  function setTab(id) {
    tab = id;
    for (const [k, p] of Object.entries(panes)) p.hidden = k !== id;
    for (const [k, b] of Object.entries(tabBtns)) b.classList.toggle('on', k === id);
    requestFrame();
  }

  // Steps tab
  const stepCard = card('steps', '');
  const stepHead = document.createElement('div');
  stepHead.className = 'demo-shell-row';
  const prevBtn = makeButton(stepHead, '◀ back', () => { goStep(step - 1); prevBtn.blur(); });
  const stepNum = document.createElement('span');
  stepNum.style.cssText = 'flex:1;text-align:center;align-self:center;color:#8b93a7;font-size:12px;';
  stepHead.appendChild(stepNum);
  const nextBtn = makeButton(stepHead, 'next ▶', () => { goStep(step + 1); nextBtn.blur(); });
  nextBtn.classList.add('demo-shell-btn-home');
  stepCard.appendChild(stepHead);
  const stepTitle = document.createElement('h4');
  stepTitle.className = 'fb-step-title';
  stepCard.appendChild(stepTitle);
  const stepNarr = document.createElement('div');
  stepNarr.className = 'fb-narr';
  stepCard.appendChild(stepNarr);
  const dots = document.createElement('div');
  dots.className = 'fb-dots';
  const dotBtns = STEPS.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.title = `${i + 1}. ${s.title}`;
    b.addEventListener('click', () => { goStep(i); b.blur(); });
    dots.appendChild(b);
    return b;
  });
  stepCard.appendChild(dots);

  const viewCard = card('steps', 'View in frame (the observer rides it)');
  const viewGrid = document.createElement('div');
  viewGrid.className = 'fb-grid';
  const viewBtns = {};
  for (const f of FRAMES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = f.name;
    b.title = f.desc;
    b.addEventListener('click', () => { setView(f.id); b.blur(); });
    viewGrid.appendChild(b);
    viewBtns[f.id] = b;
  }
  viewCard.appendChild(viewGrid);
  const viewNote = document.createElement('p');
  viewNote.className = 'fb-note';
  viewCard.appendChild(viewNote);

  const camCard = card('steps', 'Shot camera (the inset; click it to swap)');
  const camGrid = document.createElement('div');
  camGrid.className = 'fb-grid three';
  const camBtns = {};
  for (const c of CAMERAS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = c.name;
    b.title = c.desc;
    b.addEventListener('click', () => { setCam(c.id); b.blur(); });
    camGrid.appendChild(b);
    camBtns[c.id] = b;
  }
  camCard.appendChild(camGrid);
  const lookRow = document.createElement('div');
  lookRow.className = 'fb-grid three';
  lookRow.style.marginTop = '6px';
  const lookBtns = {};
  for (const [n, label] of [[1, 'look at ball 1'], [2, 'ball 2 (resting)'], [3, 'ball 3 (top)']]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = label;
    b.title = n === 1 ? 'the thrown ball' : n === 2 ? 'the ball at rest beside the thrower' : 'the ball spinning on its tip';
    b.addEventListener('click', () => { setLook(n); b.blur(); });
    lookRow.appendChild(b);
    lookBtns[n] = b;
  }
  camCard.appendChild(lookRow);
  const camNote = document.createElement('p');
  camNote.className = 'fb-note';
  camCard.appendChild(camNote);

  // Throw tab
  const throwCard = card('throw', 'Throw: the static parameters');
  const fieldShows = [];
  const FIELDS = [
    ['startX', 'start x (m)', 1, 'Release point, field x (across, 0 to 50)'],
    ['startY', 'start y (m)', 2, 'Release height'],
    ['startZ', 'start z (m)', 1, 'Release point, field z (along, 0 to 110)'],
    ['heading', 'heading (°)', 1, '0 = straight downfield (+z); positive turns toward +x'],
    ['angle', 'angle (°)', 1, 'Launch angle above horizontal'],
    ['speed', 'speed (m/s)', 1, 'Release speed (a strong NFL throw: 25 to 27 m/s)'],
    ['rpm', 'spin (rpm)', 0, 'Turns per minute about the long axis'],
    ['cone', 'wobble (°)', 1, 'Half-angle of the wobble cone; 0 = a perfect spiral'],
    ['wobbleHz', 'wobble (Hz)', 2, 'Times per second the nose goes around the cone'],
  ];
  const fieldsBox = document.createElement('div');
  fieldsBox.className = 'fb-two';
  throwCard.appendChild(fieldsBox);
  for (const [key, label, dec, title] of FIELDS) {
    fieldShows.push(bindNumberField(fieldsBox, {
      label, decimals: dec, title, getCurrent: () => model.p[key],
      apply: (v) => { model.p[key] = clamp(v, ...LIMITS[key]); paramsChanged(); },
    }));
  }
  const presetRow = document.createElement('div');
  presetRow.className = 'fb-presets';
  presetRow.style.marginTop = '8px';
  for (const pr of PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = pr.name;
    b.addEventListener('click', () => {
      const keep = { g: model.p.g, fov: model.p.fov };   // gravity and the lens hold across throws
      Object.assign(model.p, DEFAULTS, pr.p, keep);
      paramsChanged(); setTime(0); setPlaying(true); b.blur();
    });
    presetRow.appendChild(b);
  }
  throwCard.appendChild(presetRow);
  const gRow = document.createElement('label');
  gRow.className = 'demo-shell-field';
  gRow.style.marginTop = '8px';
  const gLabel = document.createElement('span');
  gLabel.className = 'demo-shell-field-label';
  gLabel.textContent = 'gravity';
  const gSelect = document.createElement('select');
  gSelect.className = 'fb-select';
  for (const g of GRAVITY) {
    const o = document.createElement('option');
    o.value = g.id;
    o.textContent = `${g.name}, ${g.g >= 1e5 ? g.g.toExponential(1).replace('e+', ' × 10^') : g.g} m/s²`;
    gSelect.appendChild(o);
  }
  gSelect.title = 'Kept for every throw; the presets leave it alone';
  gSelect.addEventListener('change', () => {
    model.p.g = GRAVITY.find((g) => g.id === gSelect.value).g;
    paramsChanged(); setTime(0); setPlaying(true); gSelect.blur();
  });
  gRow.append(gLabel, gSelect);
  throwCard.appendChild(gRow);
  const throwOut = document.createElement('p');
  throwOut.className = 'fb-note';
  throwCard.appendChild(throwOut);
  const sceneCard = card('throw', 'Scene and camera');
  const sceneBox = document.createElement('div');
  sceneBox.className = 'fb-two';
  sceneCard.appendChild(sceneBox);
  for (const [key, label, dec, title] of [['fieldYaw', 'field yaw (°)', 1, 'γ: turns the field about midfield, in the world'], ['fov', 'camera fov (°)', 0, 'The shot camera’s vertical field of view']]) {
    fieldShows.push(bindNumberField(sceneBox, {
      label, decimals: dec, title, getCurrent: () => model.p[key],
      apply: (v) => { model.p[key] = clamp(v, ...LIMITS[key]); paramsChanged(); },
    }));
  }
  const sceneNote = document.createElement('p');
  sceneNote.className = 'fb-note';
  sceneNote.textContent = 'The boxes take degrees, as Unity’s inspector does; the three.js code converts them with THREE.MathUtils.degToRad, since three.js takes radians.';
  sceneCard.appendChild(sceneNote);

  // Chain tab
  const linksCard = card('chain', 'Links, in the order they apply to the mesh');
  const linksBox = document.createElement('div');
  linksBox.className = 'fb-links';
  linksCard.appendChild(linksBox);
  const linkRows = {};
  const linkChecks = {};
  for (const id of RUN_ORDER) {
    const info = LINK_INFO[id];
    const row = document.createElement('div');
    row.className = 'fb-link';
    const chip = document.createElement('span');
    chip.className = 'fb-chip';
    chip.style.setProperty('--c', info.color);
    chip.textContent = info.label;
    const name = document.createElement('span');
    name.textContent = info.name;
    const fr = document.createElement('span');
    fr.className = 'fb-frames';
    fr.textContent = `${info.from} → ${info.to}`;
    row.append(chip, name, fr);
    if (model.on[id] !== undefined) {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = true;
      cb.title = 'Switch this link off: it becomes the identity';
      cb.addEventListener('click', (e) => e.stopPropagation());
      cb.addEventListener('change', () => { model.on[id] = cb.checked; pathDirty = true; requestFrame(); cb.blur(); });
      row.appendChild(cb);
      linkChecks[id] = cb;
    }
    row.addEventListener('click', () => selectLink(id));
    linksBox.appendChild(row);
    linkRows[id] = row;
  }
  const linkNote = document.createElement('p');
  linkNote.className = 'fb-note';
  linkNote.textContent = 'The box beside a link switches it off (the identity). Each matrix maps its first frame into the second: columns 0 to 2 are where the first frame’s x, y, z axes land, column 3 where its origin lands.';
  linksCard.appendChild(linkNote);

  const selCard = card('chain', '');
  const selTitle = selCard.querySelector('h3') || document.createElement('h3');
  selCard.appendChild(selTitle);
  const selFormula = document.createElement('p');
  selFormula.className = 'fb-formula';
  selCard.appendChild(selFormula);
  const selMat = new Mat4Panel(selCard);
  const codeTabs = document.createElement('div');
  codeTabs.className = 'fb-code-tabs';
  selCard.appendChild(codeTabs);
  const jsTab = document.createElement('button');
  jsTab.type = 'button';
  jsTab.textContent = 'WebGL · three.js (editable)';
  const csTab = document.createElement('button');
  csTab.type = 'button';
  csTab.textContent = 'Unity · C#';
  codeTabs.append(jsTab, csTab);
  const editor = document.createElement('textarea');
  editor.className = 'fb-code';
  editor.spellcheck = false;
  editor.setAttribute('autocapitalize', 'off');
  editor.setAttribute('autocomplete', 'off');
  editor.wrap = 'off';
  const csPre = document.createElement('pre');
  csPre.className = 'fb-code';
  csPre.hidden = true;
  selCard.append(editor, csPre);
  const codeRow = document.createElement('div');
  codeRow.className = 'demo-shell-row';
  codeRow.style.marginTop = '6px';
  const resetBtn = makeButton(codeRow, 'reset this code', () => { resetCode(); resetBtn.blur(); });
  selCard.appendChild(codeRow);
  const codeMsg = document.createElement('div');
  selCard.appendChild(codeMsg);
  const argsNote = document.createElement('p');
  argsNote.className = 'fb-note';
  selCard.appendChild(argsNote);
  let codeView = 'js';
  jsTab.addEventListener('click', () => { codeView = 'js'; showCode(); jsTab.blur(); });
  csTab.addEventListener('click', () => { codeView = 'cs'; showCode(); csTab.blur(); });

  const followCard = card('chain', 'Follow one point through every frame');
  const pointRow = document.createElement('div');
  pointRow.className = 'fb-presets';
  const POINTS = { nose: [0, 0, BALL.length / 2], laces: [0, BALL.radius, 0], center: [0, 0, 0] };
  const pointBtns = {};
  for (const k of Object.keys(POINTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${k} (${POINTS[k].map((v) => +v.toFixed(3)).join(', ')})`;
    b.addEventListener('click', () => { pointKey = k; for (const [kk, x] of Object.entries(pointBtns)) x.classList.toggle('on', kk === k); requestFrame(); b.blur(); });
    pointRow.appendChild(b);
    pointBtns[k] = b;
  }
  followCard.appendChild(pointRow);
  const f3 = (v) => v.toFixed(3);
  const followTable = new ValueTable(followCard, {
    rows: [
      ['object', 'object (p_mesh)', 3], ['spin axis', 'spin axis (S·)', 3], ['velocity', 'velocity (W·)', 3],
      ['flight', 'flight (A·)', 3], ['throw', 'throw (T·)', 3], ['field', 'field (H·)', 3], ['world', 'world (F·)', 3],
      ['field, carried', 'carried (K·D·K(tc)⁻¹·)', 3],
      ['camera', 'camera (V·)', 3], ['clip', 'clip (P·) x y z w', 4], ['NDC', 'NDC (÷ w)', 3], ['pixel', 'pixel in the shot view', 2],
    ].map(([id, label, cols]) => ({ id, label, cols, format: id === 'pixel' ? (v) => v.toFixed(0) : f3 })),
  });
  const followNote = document.createElement('p');
  followNote.className = 'fb-note';
  followNote.textContent = 'Each row is the row above times one link. The pixel row is the green cross in the shot view.';
  followCard.appendChild(followNote);

  // Stored tab
  const repCard = card('stored', 'The ball’s orientation, five ways');
  const deg1 = (v) => v.toFixed(1);
  const repTable = new ValueTable(repCard, {
    rows: [
      { id: 'typed', label: 'Euler typed X Y Z (°)', cols: 3, format: deg1 },
      { id: 'readback', label: 'eulerAngles read back', cols: 3, format: deg1 },
      { id: 'threeRot', label: 'three.js .rotation (rad)', cols: 3, format: (v) => v.toFixed(3) },
      { id: 'qBuilt', label: 'q from the angles', cols: 4, format: f3 },
      { id: 'qStored', label: 'q from the matrix', cols: 4, format: f3 },
      { id: 'sign', label: 'q from the angles =', cols: 1, format: (v) => (v > 0 ? '+ q from the matrix' : '− q from the matrix') },
      { id: 'axis', label: 'axis', cols: 3, format: f3 },
      { id: 'angle', label: 'angle (°)', cols: 1, format: deg1 },
      { id: 'position', label: 'position (m)', cols: 3, format: (v) => v.toFixed(2) },
    ],
  });
  const lockNote = document.createElement('p');
  lockNote.className = 'fb-note';
  repCard.appendChild(lockNote);
  const repNote = document.createElement('div');
  repNote.className = 'fb-narr';
  repNote.style.marginTop = '6px';
  repNote.innerHTML = `<p><b>Typed</b>: the numbers the code feeds in, Unity's order (X pitch, Y heading, Z spin; applied
    Z, then X, then Y), with the wobble on top. Z keeps growing. <b>Read back</b>: what Unity's
    <code>transform.eulerAngles</code> reports, decomposed from the matrix and wrapped to [0, 360); nose up reads
    as X near 360, not a small negative angle. three.js keeps the same decomposition in radians when the order is
    'YXZ' (its default order is 'XYZ').</p>
    <p><b>Stored</b>: Unity's Transform keeps localPosition (3 floats), localRotation (a quaternion, 4) and localScale
    (3); three.js keeps position, quaternion and scale, with .rotation an Euler view kept in step with .quaternion.
    The matrix below is rebuilt from them every frame; here the chain sets it directly.</p>`;
  repCard.appendChild(repNote);
  const gpuCard = card('stored', 'The model matrix M, as the GPU receives it');
  const gpuMat = new Mat4Panel(gpuCard);
  const gpuLine = document.createElement('p');
  gpuLine.className = 'fb-gpu';
  gpuCard.appendChild(gpuLine);
  const gpuNote = document.createElement('p');
  gpuNote.className = 'fb-note';
  gpuNote.textContent = '16 floats, column-major (Matrix4.elements, the order WebGL’s uniformMatrix4fv takes): columns 0 to 2 are the ball’s x, y, z axes in the world, column 3 its center.';
  gpuCard.appendChild(gpuNote);

  // ---- behavior
  function setPlaying(v) {
    playing = v;
    hold = 0;
    playBtn.textContent = playing ? '❚❚' : '▶';
    playBtn.title = playing ? 'Pause' : 'Play';
    playBtn.classList.toggle('on', playing);
    lastNow = 0;
    requestFrame();
  }
  function setTime(v) {
    t = clamp(v, 0, tEnd);
    hold = 0;
    requestFrame();
  }
  function setView(id) {
    view = id;
    for (const [k, b] of Object.entries(viewBtns)) b.classList.toggle('on', k === id);
    const f = FRAMES.find((x) => x.id === id);
    viewNote.textContent = `${f.name}: ${f.desc}.`;
    obsCam.near = CLOSE.has(id) ? 0.01 : 0.1;
    obsCam.updateProjectionMatrix();
    nav.moveSpeed = CLOSE.has(id) ? 0.6 : id === 'camera' ? 3 : 20;
    orbit.setHome(homeOf(id));
    requestFrame();
  }
  function setCam(id) {
    model.cam = id;
    for (const [k, b] of Object.entries(camBtns)) b.classList.toggle('on', k === id);
    const c = CAMERAS.find((x) => x.id === id);
    model.p.fov = c.fov;
    fieldShows.forEach((show) => show());
    camNote.textContent = `${c.name}: ${c.desc} (fov ${c.fov}°).`;
    if (selected === 'C') showCode();
    requestFrame();
  }
  function setSwap(want) {
    if (shell.isSwapped() !== want) (want ? shell.insetEl : shell.mainEl).click();
  }
  function setLook(n) {
    model.look = n;
    for (const [k, b] of Object.entries(lookBtns)) b.classList.toggle('on', +k === n);
    requestFrame();
  }
  function codeKey(id) { return id === 'C' ? `C:${model.cam}` : id; }
  function selectLink(id) {
    selected = id;
    for (const [k, r] of Object.entries(linkRows)) r.classList.toggle('sel', k === id);
    showCode();
    requestFrame();
  }
  function showCode() {
    const id = selected;
    const info = LINK_INFO[id];
    selTitle.textContent = `${info.label}: ${info.name}, ${info.from} → ${info.to}`;
    selFormula.textContent = id === 'C' ? `C: ${CAMERAS.find((c) => c.id === model.cam).name}, ${CAMERAS.find((c) => c.id === model.cam).desc}` : info.formula;
    const key = codeKey(id);
    const editable = !READ_ONLY.has(id);
    if (document.activeElement !== editor) editor.value = editable ? sources[key] : id === 'V' ? V_SOURCE : RO_SOURCES[id];
    editor.readOnly = !editable;
    csPre.textContent = UNITY[id === 'C' ? model.cam : id] || RO_UNITY[id] || '';
    jsTab.textContent = editable ? 'WebGL · three.js (editable)' : 'WebGL · three.js';
    jsTab.classList.toggle('on', codeView === 'js');
    csTab.classList.toggle('on', codeView === 'cs');
    editor.hidden = codeView !== 'js';
    csPre.hidden = codeView !== 'cs';
    resetBtn.style.visibility = editable ? '' : 'hidden';
    const names = {
      S: 'p (the parameters), t (seconds since release)', W: 'p, t', A: 'p, t, velocity(t) (a THREE.Vector3, throw frame)',
      T: 'p, t', H: 'p', F: 'p', M: 'F, H, T, A, W, S (this instant’s link matrices)',
      C: 'p, t, ball, fwd (horizontal heading), mid (mid-flight), land, path(t), all in field coordinates; frames.throw, .flight, .velocity, .spinAxis, .object (placements in the field)',
      V: 'F, C', P: 'p, aspect (the shot view’s width / height)',
    }[id];
    argsNote.textContent = READ_ONLY.has(id) && id !== 'V'
      ? 'Read only here; the Code window has the whole program.'
      : `Names it can use: THREE, ${names}. It must return a THREE.Matrix4.`;
    showCodeMsg();
  }
  function showCodeMsg() {
    const key = codeKey(selected);
    const err = compileErr[key] || (lastRes && lastRes.errors[selected === 'C' ? 'C' : selected]);
    codeMsg.className = err ? 'fb-err' : 'fb-ok';
    codeMsg.textContent = err ? `error: ${err}\n(the default code runs until this is fixed)` : selected === 'V' ? 'derived from F and C; edit those instead' : READ_ONLY.has(selected) ? (lastRes && lastRes.phase === 'caught' ? 'caught: this link is in the chain now' : 'not in the chain until the catch') : sources[key] === (key.startsWith('C:') ? CAMERAS.find((c) => `C:${c.id}` === key).src : SOURCES[key]) ? 'default code' : 'your code is running';
  }
  let compileTimer = null;
  editor.addEventListener('input', () => {
    clearTimeout(compileTimer);
    compileTimer = setTimeout(applyEditor, 250);
  });
  editor.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Tab') {
      e.preventDefault();
      const s = editor.selectionStart;
      editor.setRangeText('  ', s, editor.selectionEnd, 'end');
      editor.dispatchEvent(new Event('input'));
    }
  });
  function applyEditor() {
    if (READ_ONLY.has(selected)) return;
    const key = codeKey(selected);
    const linkId = selected === 'C' ? 'C' : selected;
    sources[key] = editor.value;
    try {
      model.fns[key] = compileLink(linkId, editor.value);
      delete compileErr[key];
    } catch (e) {
      compileErr[key] = e.message;
    }
    pathDirty = true;
    requestFrame();
  }
  function resetCode() {
    if (READ_ONLY.has(selected)) return;
    const key = codeKey(selected);
    sources[key] = key.startsWith('C:') ? CAMERAS.find((c) => `C:${c.id}` === key).src : SOURCES[key];
    model.fns[key] = compileLink(selected === 'C' ? 'C' : selected, sources[key]);
    delete compileErr[key];
    editor.value = sources[key];
    pathDirty = true;
    requestFrame();
  }

  function paramsChanged() {
    fieldShows.forEach((show) => show());
    pathDirty = true;
    requestFrame();
  }
  function rebuildPath() {
    pathDirty = false;
    model.plan = null;
    model.plan = cartPlan(model);
    const plan = model.plan;
    tEnd = plan.tTotal;
    t = Math.min(t, tEnd);
    const a = pathGeo.attributes.position.array;
    const H = evaluateChain(model, 0).links.H;
    const Hinv = H.clone().invert();
    let apex = 0, range = 0;
    for (let i = 0; i < NP; i++) {
      const tt = (i / (NP - 1)) * plan.tFlightEnd;
      const pt = pathAt(model, tt).applyMatrix4(Hinv);   // field, back into the throw frame
      a.set([pt.x, pt.y, pt.z], i * 3);
      apex = Math.max(apex, pt.y);
      range = Math.max(range, Math.hypot(pt.x, pt.z));
    }
    // the samples can straddle the top: also try the top of the default parabola, t = v sin α / g
    const tTop = (model.p.speed * Math.sin((model.p.angle * Math.PI) / 180)) / Math.max(model.p.g, 1e-9);
    if (tTop > 0 && tTop < plan.tFlightEnd) apex = Math.max(apex, pathAt(model, tTop).applyMatrix4(Hinv).y);
    pathGeo.attributes.position.needsUpdate = true;
    pathGeo.computeBoundingSphere();
    doneGeo.computeBoundingSphere();
    throwInfo.range = range;
    throwInfo.apex = apex;
    throwInfo.startY = model.p.startY;
    plane.scale.set(Math.max(4, range + 6), Math.max(3, apex + model.p.startY + 3), 1);
    plane.rotation.set(0, Math.PI / 2, 0);
    plane.position.set(0, (apex - model.p.startY) / 2 + 1, range / 2);
    plane.updateMatrix();
    const start = pathAt(model, 0);
    releaseMark.position.set(start.x, 0.03, start.z);
    landMark.position.set(plan.goal.x, 0.03, plan.goal.z);
    const vy = model.p.speed * Math.sin((model.p.angle * Math.PI) / 180);
    const end = pathAt(model, plan.tFlightEnd);
    const secs = (x) => (x >= 0.1 ? `${x.toFixed(2)} s` : x >= 1e-4 ? `${(x * 1e3).toFixed(2)} ms` : `${(x * 1e6).toFixed(1)} µs`);
    const meters = (x) => (x >= 0.1 ? `${x.toFixed(2)} m` : x >= 1e-4 ? `${(x * 1e3).toFixed(2)} mm` : `${(x * 1e6).toFixed(1)} µm`);
    const how = plan.outcome === 'catch'
      ? `the cart catches it at t = ${plan.tc.toFixed(2)} s, ${Math.hypot(end.x - start.x, end.z - start.z).toFixed(1)} m from the release, after driving ${plan.dist.toFixed(1)} m`
      : plan.outcome === 'crash'
        ? `it comes down outside the box at t = ${plan.tGround.toFixed(2)} s; the cart hits the wall at t = ${plan.tStop.toFixed(2)} s`
        : `it lands at t = ${secs(plan.tGround)}; the cart cannot get there in time and arrives at t = ${secs(plan.T)}`;
    throwOut.textContent = `${how}. The ball peaks ${meters(apex)} above the release`
      + `${model.p.g > 0 && vy > 0 ? ` at t = ${secs(vy / model.p.g)}` : ''}; `
      + `${((model.p.rpm / 60) * plan.tFlightEnd).toFixed(1)} turns of spin.`;
    if (view === 'throw') orbit.setHome(homeOf('throw'), { go: false });
  }

  function goStep(k) {
    step = clamp(k, 0, STEPS.length - 1);
    const s = STEPS[step];
    stepVis = s;
    stepNum.textContent = `step ${step + 1} of ${STEPS.length}`;
    stepTitle.textContent = s.title;
    stepNarr.innerHTML = s.html;
    dotBtns.forEach((b, i) => b.classList.toggle('on', i <= step));
    prevBtn.disabled = step === 0;
    nextBtn.disabled = step === STEPS.length - 1;
    focus = s.focus;
    if (s.cam) setCam(s.cam);
    setView(s.view);
    if (s.home) orbit.setHome(s.home);
    selectLink(s.select || s.focus);
    setSwap(!!s.swap);
    if (s.t != null) setTime(s.t);
    setPlaying(s.play);
    requestFrame();
  }

  // ---- sizing and visibility
  function fit(renderer, el) {
    const cw = el.clientWidth, ch = el.clientHeight, ow = el.offsetWidth, oh = el.offsetHeight;
    if (cw < 2 || ch < 2 || ow < 1 || oh < 1) return null;
    const rect = el.getBoundingClientRect();
    const w = cw * (rect.width / ow), h = ch * (rect.height / oh);
    if (w < 2 || h < 2) return null;
    const cur = renderer.getSize(new THREE.Vector2());
    if (Math.abs(cur.x - w) > 0.5 || Math.abs(cur.y - h) > 0.5) renderer.setSize(w, h, false);
    return { w: cw, h: ch, aspect: w / h };
  }
  let obsSize = { w: 400, h: 300, aspect: 4 / 3 };
  let shotSize = { w: 300, h: 200, aspect: 1.5 };
  function fitAll() {
    obsSize = fit(obsRenderer, shell.mainEl) || obsSize;
    shotSize = fit(shotRenderer, shell.insetEl) || shotSize;
    obsCam.aspect = obsSize.aspect;
    obsCam.updateProjectionMatrix();
  }
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => { fitAll(); requestFrame(); });
    ro.observe(shell.mainEl);
    ro.observe(shell.insetEl);
  }
  window.addEventListener('resize', () => { fitAll(); requestFrame(); });
  if (typeof IntersectionObserver !== 'undefined') {
    new IntersectionObserver((entries) => {
      for (const e of entries) {
        visible = e.isIntersecting;
        if (visible) { fitAll(); requestFrame(); }
      }
    }).observe(container);
  }
  const section = container.closest && container.closest('section');
  if (section && window.Reveal && typeof window.Reveal.on === 'function') {
    window.Reveal.on('slidechanged', (e) => { if (e.currentSlide !== section && playing) setPlaying(false); });
    window.Reveal.on('resize', () => { fitAll(); requestFrame(); });
  }

  // ---- the frame
  const tmpEye = new THREE.Vector3();
  function frame(now) {
    frameReq = null;
    const dt = lastNow ? Math.min(0.1, (now - lastNow) / 1000) : 0;
    lastNow = now;
    if (playing) {
      if (hold > 0) {
        hold -= dt;
        if (hold <= 0) { if (disp.loop) t = 0; else setPlaying(false); }
      } else {
        t += dt * speed;
        if (t >= tEnd) { t = tEnd; hold = 1.0; }
      }
    }
    update();
    if (playing) requestFrame(); else lastNow = 0;
  }

  function update() {
    if (pathDirty) rebuildPath();
    if (coneFor !== model.p.cone) rebuildCone();
    const res = evaluateChain(model, t, { aspect: shotSize.aspect });
    lastRes = res;
    const plan = res.plan;

    // scene nodes take the chain's matrices; the cart, its wheels and balls 2 and 3 hang from the field node
    ballG.matrix.copy(res.M);
    for (const f of FRAMES) G[f.id].matrix.copy(res.frames[f.id]);
    cartG.matrix.copy(res.cart.K);
    res.cart.wheels.forEach((w, k) => wheelGs[k].matrix.copy(w));
    ball2G.matrix.copy(res.rest);
    ball3G.matrix.copy(res.top.object);
    for (const n of [...Object.values(G), ballG, cartG, ...wheelGs, ball2G, ball3G]) n.matrixWorldNeedsUpdate = true;

    // helpers
    const i = Math.round((Math.min(t, plan.tFlightEnd) / plan.tFlightEnd) * (NP - 1));
    pathDone.geometry.setDrawRange(0, Math.max(2, i + 1));
    pathAll.visible = pathDone.visible = disp.path;
    const bf = res.ball; // field coordinates
    shadow.position.set(bf.x, 0.02, bf.z);
    drop.position.set(bf.x, 0, bf.z);
    drop.scale.set(1, Math.max(0.01, bf.y), 1);
    drop.visible = disp.drop && !CLOSE.has(view);
    const v = velocityAt(model, t);
    if (v.lengthSq() > 1e-12) velArrow.setDirection(v.clone().normalize());
    velArrow.visible = !!stepVis.vel && res.phase === 'flight';
    coneG.visible = !!stepVis.cone && model.on.W && model.p.cone > 0;
    plane.visible = !!stepVis.plane;
    ruler.visible = !!stepVis.ruler && view === 'object';
    marker.visible = disp.marker && !CLOSE.has(view);
    const wanted = new Set(disp.allTriads ? FRAMES.map((f) => f.id) : [...(stepVis.triads || []), view]);
    for (const f of FRAMES) triads[f.id].visible = wanted.has(f.id);
    camViz.visible = !CLOSE.has(view);
    setFrustum(model.p.fov, shotSize.aspect);

    // observer: the orbit camera's pose, expressed in the frame being ridden
    proxy.updateMatrix();
    obsCam.matrix.copy(res.frames[view]).multiply(proxy.matrix);
    obsCam.updateMatrixWorld(true);
    // tick labels on the edges nearest the observer, in field coordinates
    tmpEye.setFromMatrixPosition(obsCam.matrixWorld).applyMatrix4(res.frames.field.clone().invert());
    ticks.group.visible = disp.labels;
    ticks.update(tmpEye);

    // shot camera: exactly the chain's V and P
    shotCam.matrix.copy(res.Cw);
    shotCam.updateMatrixWorld(true);
    shotCam.projectionMatrix.copy(res.P);
    shotCam.projectionMatrixInverse.copy(res.P).invert();

    obsRenderer.render(scene, obsCam);
    shotRenderer.render(scene, shotCam);

    // overlays
    const fl = follow(res, POINTS[pointKey], { width: shotSize.w, height: shotSize.h });
    const nosePx = follow(res, POINTS.nose, { width: shotSize.w, height: shotSize.h });
    const showCross = disp.nose && nosePx.inFront && nosePx.ndc.every((c) => Math.abs(c) <= 1);
    cross.style.display = showCross ? '' : 'none';
    if (showCross) { cross.style.left = `${nosePx.px[0]}px`; cross.style.top = `${nosePx.px[1]}px`; }
    const ff = FRAMES.find((f) => f.id === view);
    obsTag.textContent = `observer, riding the ${ff.name} frame`;
    const cam = CAMERAS.find((c) => c.id === model.cam);
    shotTag.textContent = `shot camera: ${cam.name}`;
    const tt = t.toFixed(2);
    tOut.textContent = `t = ${tt} s of ${tEnd.toFixed(2)}`;
    if (document.activeElement !== slider) slider.value = String(Math.round((t / tEnd) * 1000));

    const caught = res.phase === 'caught';
    chips.L.style.display = caught ? '' : 'none';
    chainDots.L.style.display = caught ? '' : 'none';
    atTc.style.display = caught ? '' : 'none';
    const carriedRow = followTable.cells['field, carried'][0].parentElement;
    carriedRow.style.display = caught ? '' : 'none';
    for (const id of CHAIN_ORDER) {
      const c = chips[id];
      c.classList.toggle('focus', id === focus || (focus === 'C' && id === 'V') || (focus === 'K' && id === 'L') || (focus === 'M' && 'FHTAWS'.includes(id)));
      c.classList.toggle('off', model.on[id] === false);
      c.classList.toggle('err', !!(res.errors[id] || compileErr[id] || (id === 'V' && (res.errors.C || compileErr[`C:${model.cam}`]))));
    }
    for (const id of RUN_ORDER) linkRows[id].querySelector('.fb-chip').classList.toggle('err', !!(res.errors[id] || compileErr[codeKey(id)]));

    // rail readouts: the visible tab only
    if (tab === 'chain') {
      const m = { S: res.links.S, W: res.links.W, A: res.links.A, T: res.links.T, H: res.links.H, F: res.links.F, M: res.M, C: res.C, V: res.V, P: res.P, K: res.cart.K, L: res.carry || new THREE.Matrix4() }[selected];
      selMat.update(m.elements);
      for (const r of fl.rows) followTable.update(r.frame, r.v);
      showCodeMsg();
    } else {
      // the first Mat4Panel tracks the selected link even when hidden (cheap; keeps probes honest)
      const m = { S: res.links.S, W: res.links.W, A: res.links.A, T: res.links.T, H: res.links.H, F: res.links.F, M: res.M, C: res.C, V: res.V, P: res.P, K: res.cart.K, L: res.carry || new THREE.Matrix4() }[selected];
      selMat.update(m.elements);
    }
    if (tab === 'stored') {
      const r = representations(res, model);
      repTable.update('typed', [r.typed.x, r.typed.y, r.typed.z]);
      repTable.update('readback', [r.readback.x, r.readback.y, r.readback.z]);
      repTable.update('threeRot', [r.threeRot.x, r.threeRot.y, r.threeRot.z]);
      repTable.update('qBuilt', r.qBuilt);
      repTable.update('qStored', r.qStored);
      repTable.update('sign', r.sameSign);
      repTable.update('axis', r.axis);
      repTable.update('angle', r.angle);
      repTable.update('position', r.position);
      lockNote.textContent = r.readback.locked
        ? 'Gimbal lock: X = ±90, so heading and spin turn about one axis; the read-back reports Z = 0 and puts the whole turn in Y.'
        : `The typed spin Z = ${r.typed.z.toFixed(0)}° is ${(r.typed.z / 360).toFixed(2)} turns; the read-back keeps only the part past the last whole turn.`;
      gpuMat.update(res.M.elements);
      gpuLine.textContent = `[${res.M.elements.map((x) => x.toFixed(3)).join(', ')}]`;
    }
  }

  // ---- start
  setCam(opts.cam && CAMERAS.some((c) => c.id === opts.cam) ? opts.cam : 'chase');
  setLook(1);
  gSelect.value = (GRAVITY.find((g) => g.g === model.p.g) || GRAVITY[0]).id;
  setTab(['steps', 'throw', 'chain', 'stored'].includes(opts.tab) ? opts.tab : 'steps');
  pointBtns.nose.classList.add('on');
  goStep(opts.step ? clamp(parseInt(opts.step, 10) - 1, 0, STEPS.length - 1) : 0);
  if (opts.view && FRAMES.some((f) => f.id === opts.view)) setView(opts.view);
  fitAll();
  requestFrame();

  return { model, orbit, goStep, setView, setCam, setTime, setPlaying, setTab, selectLink, get t() { return t; }, get tEnd() { return tEnd; }, get res() { return lastRes; } };
}
