// football: the throw model behind lib/demos/football.js, a spiral pass from release to landing.
// No DOM: three.js is used only for its math classes, so lib/tests/football.test.mjs runs this in Node.
//
// The chain, column vectors, read right to left (the mesh is moved by S first):
//   p_clip = P · V · F · H · T(t) · A(t) · W(t) · S(t) · p_mesh
//     S  spin about the long axis           mesh (object) frame  -> spin-axis frame
//     W  wobble: a tilt whose direction     spin-axis frame      -> velocity frame
//        circles the velocity
//     A  aim: the nose onto the velocity    velocity frame       -> flight frame
//     T  flight: the parabola               flight frame         -> throw frame
//     H  throw set-up: release point and    throw frame          -> field frame (the coordinate box)
//        heading
//     F  the field placed in the world      field frame          -> world frame (origin at midfield)
//     V  view = (F · C)⁻¹, C the camera's   world frame          -> camera (eye) frame
//        placement in the field
//     P  projection                         camera frame         -> clip space
// Every link but V is a snippet of three.js code (SOURCES below) that the demo shows and lets you edit;
// compileLink turns one into a function and evaluateChain runs them all for one instant t.
// Units: meters, seconds; the parameter boxes take degrees (people type degrees), three.js takes radians.
import * as THREE from '../vendor/three.module.js';

/** an NFL ball: 0.28 m tip to tip, 0.17 m across the middle (a 21 in short circumference). */
export const BALL = { length: 0.28, diameter: 0.17, radius: 0.085 };

/** the coordinate box = the field frame: x across (0..50), y up (0..40), z along (0..110), grid every 10 m. */
export const FIELD = { width: 50, height: 40, length: 110, grid: 10, endZone: 10 };

/** the static parameters of one throw (degrees, meters, m/s, rpm, Hz). */
export const DEFAULTS = {
  startX: 20, startY: 2, startZ: 25, heading: 12, angle: 30, speed: 22,
  rpm: 600, cone: 3, wobbleHz: 2, fieldYaw: 0, g: 9.81, fov: 50,
};

/** [min, max] for each parameter box; entries outside are clamped. */
export const LIMITS = {
  startX: [-20, 70], startY: [0.1, 10], startZ: [-20, 130], heading: [-180, 180], angle: [-30, 90],
  speed: [0, 45], rpm: [0, 2000], cone: [0, 60], wobbleHz: [0, 10], fieldYaw: [-180, 180],
  g: [0, 30], fov: [10, 120],
};

export const PRESETS = [
  { name: 'spiral pass', p: {} },
  { name: 'Hail Mary', p: { startX: 25, startZ: 15, heading: 0, angle: 45, speed: 28, rpm: 500, cone: 4, wobbleHz: 1.5 } },
  { name: 'bullet', p: { angle: 8, speed: 27, rpm: 700, cone: 1, heading: -6 } },
  { name: 'wobbly duck', p: { angle: 40, speed: 16, rpm: 200, cone: 18, wobbleHz: 1.5 } },
  { name: 'straight up', p: { startX: 25, startZ: 55, heading: 0, angle: 90, speed: 18, rpm: 400, cone: 0 } },
  { name: 'on the Moon', p: { g: 1.62, speed: 12, angle: 30 } },
];

/** the links in chain order, left to right, with the frames each maps between (from -> to). */
export const LINKS = [
  { id: 'P', name: 'projection', from: 'camera', to: 'clip', timed: false },
  { id: 'V', name: 'view', from: 'world', to: 'camera', timed: true },
  { id: 'F', name: 'field placement', from: 'field', to: 'world', timed: false, toggle: true },
  { id: 'H', name: 'throw set-up', from: 'throw', to: 'field', timed: false, toggle: true },
  { id: 'T', name: 'flight', from: 'flight', to: 'throw', timed: true, toggle: true },
  { id: 'A', name: 'aim', from: 'velocity', to: 'flight', timed: true, toggle: true },
  { id: 'W', name: 'wobble', from: 'spin axis', to: 'velocity', timed: true, toggle: true },
  { id: 'S', name: 'spin', from: 'object', to: 'spin axis', timed: true, toggle: true },
];

/** the names each snippet can use besides THREE (its parameters, in order). */
export const ARGS = {
  S: ['p', 't'], W: ['p', 't'], A: ['p', 't', 'velocity'], T: ['p', 't'], H: ['p'], F: ['p'],
  M: ['F', 'H', 'T', 'A', 'W', 'S'],
  C: ['p', 't', 'ball', 'fwd', 'mid', 'land', 'path', 'frames'],
  P: ['p', 'aspect'],
};

// ------------------------------------------------------------------ default snippets, WebGL (three.js)

export const SOURCES = {
  S: `// Spin about the ball's long axis, its own z.
const turns = (p.rpm / 60) * t;    // since release
const phi = 2 * Math.PI * turns;   // radians
return new THREE.Matrix4().makeRotationZ(phi);`,

  W: `// Tilt the nose by the cone angle, about an axis
// that circles z: R_z(psi) R_x(beta) R_z(-psi),
// the pivot sandwich. psi: where on the cone.
const psi = 2 * Math.PI * p.wobbleHz * t;
const beta = THREE.MathUtils.degToRad(p.cone);
return new THREE.Matrix4().makeRotationZ(psi)
  .multiply(new THREE.Matrix4().makeRotationX(beta))
  .multiply(new THREE.Matrix4().makeRotationZ(-psi));`,

  A: `// Tip the nose (+z) onto the velocity (throw frame).
const v = velocity(t);               // v.x is 0
const climb = Math.atan2(v.y, v.z);  // above horizontal
// a positive turn about +x takes +z toward -y: negate
return new THREE.Matrix4().makeRotationX(-climb);`,

  T: `// No air drag: a parabola in the throw's y-z plane.
const a = THREE.MathUtils.degToRad(p.angle);
const y = p.speed * Math.sin(a) * t - 0.5 * p.g * t * t;
const z = p.speed * Math.cos(a) * t;
return new THREE.Matrix4().makeTranslation(0, y, z);`,

  H: `// Release point and heading, in field coordinates.
// Static: built once per throw, not once per frame.
const h = THREE.MathUtils.degToRad(p.heading);
return new THREE.Matrix4()
  .makeTranslation(p.startX, p.startY, p.startZ)
  .multiply(new THREE.Matrix4().makeRotationY(h));`,

  F: `// The world origin is at midfield: move the field's
// center there, then turn the field about it.
const yaw = THREE.MathUtils.degToRad(p.fieldYaw);
return new THREE.Matrix4().makeRotationY(yaw)
  .multiply(new THREE.Matrix4()
    .makeTranslation(-25, 0, -55));`,

  M: `// The model matrix, mesh to world. Right to left:
// spin, wobble, aim, fly, set up, place.
return F.clone().multiply(H).multiply(T)
  .multiply(A).multiply(W).multiply(S);`,

  P: `// Vertical field of view, aspect, near and far.
const cam = new THREE.PerspectiveCamera(
  p.fov, aspect, 0.05, 500);
return cam.projectionMatrix;`,
};

/** the view matrix is derived, not edited: shown read-only. */
export const V_SOURCE = `// Undo the camera's placement in the world.
const Cw = F.clone().multiply(C);  // camera to world
const V = Cw.clone().invert();     // world to camera`;

const LOOK = `const up = new THREE.Vector3(0, 1, 0);
// rotation: columns right, up, back (= eye - target)
const C = new THREE.Matrix4().lookAt(eye, target, up);
return C.setPosition(eye);         // column 3: eye`;

const SEAT = `const seat = new THREE.Matrix4()
  .makeTranslation(0, 0.3, -1)     // behind, above
  .multiply(new THREE.Matrix4().makeRotationY(Math.PI));`;

/** shot cameras: each snippet returns C, the camera's placement in FIELD coordinates; fov is the lens a
 *  camera operator would pick for the shot (the demo sets p.fov when a camera is chosen). A three.js
 *  camera looks down its own -z; Matrix4.lookAt(eye, target, up) builds the turn whose z axis is
 *  eye - target. */
export const CAMERAS = [
  { id: 'fixed', name: 'tripod', fov: 50, desc: 'fixed, aimed once at the middle of the flight; a wide lens', src: `// A tripod off the sideline, aimed once at mid-flight.
const eye = new THREE.Vector3(-25, 10, mid.z);
const target = mid;  // the path at half the flight time
${LOOK}` },
  { id: 'pan', name: 'pan', fov: 4, desc: 'fixed position, turns to follow the ball; a long lens', src: `// The same tripod; the operator pans and tilts.
const eye = new THREE.Vector3(-25, 10, mid.z);
const target = ball;
${LOOK}` },
  { id: 'sideline', name: 'sideline', fov: 12, desc: 'a cart on a sideline rail, level with the ball', src: `// A cart on a rail off the sideline (x = -5),
// level with the ball.
const eye = new THREE.Vector3(-5, 2, ball.z);
const target = ball;
${LOOK}` },
  { id: 'chase', name: 'chase', fov: 50, desc: 'behind and above, follows position only', src: `// Behind and above the ball along the heading;
// it copies the ball's position, not its rotation.
const eye = ball.clone().addScaledVector(fwd, -2.5);
eye.y += 0.7;
const target = ball.clone().addScaledVector(fwd, 1.5);
${LOOK}` },
  { id: 'skycam', name: 'skycam', fov: 12, desc: 'cable camera, trails the ball by 0.6 s', src: `// A cable camera high behind the ball, 0.6 s late.
const eye = path(Math.max(0, t - 0.6));
eye.addScaledVector(fwd, -12);
eye.y += 14;
const target = ball;
${LOOK}` },
  { id: 'ball', name: 'ball cam', fov: 60, desc: 'mounted on the velocity frame: no spin', src: `// A child of the velocity frame: behind the ball,
// looking along its flight. The half turn about y
// points the camera's -z along the ball's +z.
${SEAT}
return frames.velocity.clone().multiply(seat);` },
  { id: 'spincam', name: 'spin cam', fov: 60, desc: 'mounted on the object frame: inherits the spin', src: `// A child of the object frame, the spinning ball:
// it inherits every link below it, spin included.
${SEAT}
return frames.object.clone().multiply(seat);` },
  { id: 'receiver', name: 'receiver', fov: 20, desc: 'the receiver’s eyes, past the landing point', src: `// The receiver's eyes: 3 m past the landing point,
// 1.8 m up.
const eye = land.clone().addScaledVector(fwd, 3).setY(1.8);
const target = ball;
${LOOK}` },
  { id: 'orbit', name: 'orbit', fov: 40, desc: 'circles the ball at 2 m while it flies', src: `// Circle the ball at 2 m, a quarter turn per second.
const a = 0.5 * Math.PI * t;
const eye = ball.clone();
eye.x += 2 * Math.cos(a);
eye.y += 0.6;
eye.z += 2 * Math.sin(a);
const target = ball;
${LOOK}` },
];

// ------------------------------------------------------------------ the same links, Unity (C#), read-only

const UNITY_LOOK = `Quaternion look = Quaternion.LookRotation(target - eye);
cam.transform.SetPositionAndRotation(eye, look);
// a Unity camera looks down its own +z
Matrix4x4 C = cam.transform.localToWorldMatrix;`;

export const UNITY = {
  S: `float phi = 360f * (rpm / 60f) * t;   // degrees
Matrix4x4 S = Matrix4x4.Rotate(
    Quaternion.AngleAxis(phi, Vector3.forward));`,
  W: `float psi = 360f * wobbleHz * t;
Quaternion wob =
    Quaternion.AngleAxis(psi, Vector3.forward)
  * Quaternion.AngleAxis(cone, Vector3.right)
  * Quaternion.AngleAxis(-psi, Vector3.forward);
Matrix4x4 W = Matrix4x4.Rotate(wob);`,
  A: `Vector3 v = Velocity(t);                  // throw frame
float climb = Mathf.Atan2(v.y, v.z) * Mathf.Rad2Deg;
Matrix4x4 A = Matrix4x4.Rotate(Quaternion.Euler(-climb, 0f, 0f));

Vector3 Velocity(float t) {     // the path's derivative
  float a = angle * Mathf.Deg2Rad;
  return new Vector3(0f, speed * Mathf.Sin(a) - g * t,
                         speed * Mathf.Cos(a));
}`,
  T: `float a = angle * Mathf.Deg2Rad;
float y = speed * Mathf.Sin(a) * t - 0.5f * g * t * t;
float z = speed * Mathf.Cos(a) * t;
Matrix4x4 T = Matrix4x4.Translate(new Vector3(0f, y, z));`,
  H: `Vector3 start = new Vector3(startX, startY, startZ);
Quaternion turn = Quaternion.Euler(0f, heading, 0f);
Matrix4x4 H = Matrix4x4.TRS(start, turn, Vector3.one);`,
  F: `Matrix4x4 F =
    Matrix4x4.Rotate(Quaternion.Euler(0f, fieldYaw, 0f))
  * Matrix4x4.Translate(new Vector3(-25f, 0f, -55f));`,
  M: `Matrix4x4 M = F * H * T * A * W * S;
// Or let the engine multiply: nest GameObjects
// field > throw > flight > ball, set each one's
// localPosition and localRotation, and
// ball.transform.localToWorldMatrix is M.`,
  V: `Matrix4x4 V = cam.worldToCameraMatrix;  // world to camera
// = Scale(1, 1, -1) * cam.transform.worldToLocalMatrix:
// view space looks down -z, the camera object down +z`,
  P: `Matrix4x4 P = Matrix4x4.Perspective(fov, aspect, 0.05f, 500f);
// the matrix cam.projectionMatrix holds for this fov`,
  fixed: `Vector3 eye = new Vector3(-25f, 10f, mid.z);
Vector3 target = mid;
${UNITY_LOOK}`,
  pan: `Vector3 eye = new Vector3(-25f, 10f, mid.z);
Vector3 target = ball;
${UNITY_LOOK}`,
  sideline: `Vector3 eye = new Vector3(-5f, 2f, ball.z);
Vector3 target = ball;
${UNITY_LOOK}`,
  chase: `Vector3 eye = ball - 2.5f * fwd + new Vector3(0f, 0.7f, 0f);
Vector3 target = ball + 1.5f * fwd;
${UNITY_LOOK}`,
  skycam: `Vector3 eye = Path(Mathf.Max(0f, t - 0.6f)) - 12f * fwd;
eye.y += 14f;
Vector3 target = ball;
${UNITY_LOOK}`,
  ball: `// a child of the velocity frame; +z already looks forward
cam.transform.SetParent(velocityFrame, false);
cam.transform.localPosition = new Vector3(0f, 0.3f, -1f);
cam.transform.localRotation = Quaternion.identity;`,
  spincam: `// a child of the spinning ball itself
cam.transform.SetParent(ballMesh, false);
cam.transform.localPosition = new Vector3(0f, 0.3f, -1f);
cam.transform.localRotation = Quaternion.identity;`,
  receiver: `Vector3 eye = land + 3f * fwd;
eye.y = 1.8f;
Vector3 target = ball;
${UNITY_LOOK}`,
  orbit: `float a = 0.5f * Mathf.PI * t;
Vector3 eye = ball + new Vector3(2f * Mathf.Cos(a), 0.6f,
                                 2f * Mathf.Sin(a));
Vector3 target = ball;
${UNITY_LOOK}`,
};

// ------------------------------------------------------------------ compile and run

/** compile one snippet: a function (THREE, ...ARGS[id]) => THREE.Matrix4. Throws a SyntaxError on bad code. */
export function compileLink(id, src) {
  return new Function('THREE', ...ARGS[id], `"use strict";\n${src}\n`);
}

/** the default functions, compiled once; a failing user snippet falls back to these for that frame. */
export const DEFAULT_FNS = Object.fromEntries(
  [...Object.keys(SOURCES).map((id) => [id, compileLink(id, SOURCES[id])]),
    ...CAMERAS.map((c) => [`C:${c.id}`, compileLink('C', c.src)])],
);

const finiteMatrix = (m) => m instanceof THREE.Matrix4 && m.elements.every(Number.isFinite);

/** run fn(THREE, ...args); returns { m, err }. A throw or a non-matrix result falls back to the default. */
function run(fn, fallback, args) {
  try {
    const m = fn(THREE, ...args);
    if (!finiteMatrix(m)) throw new TypeError('the snippet must return a THREE.Matrix4 with finite entries');
    return { m: m.clone(), err: null };
  } catch (e) {
    return { m: fallback(THREE, ...args).clone(), err: e && e.message ? e.message : String(e) };
  }
}

/** a model: the parameters, the compiled functions, which links are on, and the shot camera. */
export function makeModel(p = {}) {
  return {
    p: { ...DEFAULTS, ...p },
    fns: { ...Object.fromEntries(Object.keys(SOURCES).map((id) => [id, DEFAULT_FNS[id]])),
      ...Object.fromEntries(CAMERAS.map((c) => [`C:${c.id}`, DEFAULT_FNS[`C:${c.id}`]])) },
    on: { F: true, H: true, T: true, A: true, W: true, S: true },
    cam: 'chase',
  };
}

const I4 = () => new THREE.Matrix4();
const origin = (m) => new THREE.Vector3().setFromMatrixPosition(m);

/** the flight link's translation at time t, in throw coordinates (used by velocity and path). */
function flightPos(model, t) {
  return origin(run(model.fns.T, DEFAULT_FNS.T, [model.p, t]).m);
}

/** the velocity at t in throw coordinates: a central difference of the flight link (exact for a parabola). */
export function velocityAt(model, t) {
  const h = 1e-4;
  return flightPos(model, t + h).sub(flightPos(model, t - h)).multiplyScalar(1 / (2 * h));
}

/** the static matrices of a model (H, F), which do not depend on t. */
function staticLinks(model) {
  const H = model.on.H ? run(model.fns.H, DEFAULT_FNS.H, [model.p]) : { m: I4(), err: null };
  const F = model.on.F ? run(model.fns.F, DEFAULT_FNS.F, [model.p]) : { m: I4(), err: null };
  return { H, F };
}

/** the ball's center at t in FIELD coordinates. */
export function pathAt(model, t, H = staticLinks(model).H.m) {
  const pos = model.on.T ? flightPos(model, t) : new THREE.Vector3();
  return pos.applyMatrix4(H);
}

/** the first t > 0 at which the ball's center comes down to one ball radius above the ground (field y),
 *  found by stepping 10 ms then bisecting; null if it is still up after 20 s (no gravity, say). */
export function flightTime(model) {
  const H = staticLinks(model).H.m;
  const y = (t) => pathAt(model, t, H).y - BALL.radius;
  for (let i = 1; i <= 2000; i++) {
    const b = i * 0.01;
    if (y(b) <= 0) {
      let lo = b - 0.01, hi = b;
      for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (y(m) > 0) lo = m; else hi = m; }
      return (lo + hi) / 2;
    }
  }
  return null;
}

/** the closed form for the default flight link: when the center drops to one radius above the ground. */
export function flightTimeClosed(p) {
  const vy = p.speed * Math.sin((p.angle * Math.PI) / 180);
  const h = Math.max(0, p.startY - BALL.radius);
  return (vy + Math.sqrt(vy * vy + 2 * p.g * h)) / p.g;
}

/**
 * evaluateChain(model, t, { aspect, tEnd }) -> every matrix of the chain at time t:
 *   links   { S, W, A, T, H, F } (identity when switched off), M (the compose snippet), C (camera in the
 *           field), Cw = F · C, V = Cw⁻¹, P
 *   frames  each frame's placement in the WORLD: object, spinAxis, velocity, flight, throw, field, world,
 *           camera (the canonical left-to-right products, whatever the compose snippet does)
 *   field   the same frames' placement in the FIELD (what the camera snippets get)
 *   ball, vel, fwd, mid, land   field-frame vectors; errors { id: message } for snippets that failed
 */
export function evaluateChain(model, t, { aspect = 16 / 9, tEnd = null } = {}) {
  const { p, fns, on } = model;
  const errors = {};
  const pick = (id, args) => {
    if (on[id] === false) return I4();
    const r = run(fns[id], DEFAULT_FNS[id], args);
    if (r.err) errors[id] = r.err;
    return r.m;
  };
  const st = staticLinks(model);
  if (st.H.err) errors.H = st.H.err;
  if (st.F.err) errors.F = st.F.err;
  const H = st.H.m, F = st.F.m;
  const velocity = (tt) => velocityAt(model, tt);
  const S = pick('S', [p, t]);
  const W = pick('W', [p, t]);
  const A = pick('A', [p, t, velocity]);
  const T = pick('T', [p, t]);

  const fld = {};
  fld.field = I4();
  fld.throw = H.clone();
  fld.flight = fld.throw.clone().multiply(T);
  fld.velocity = fld.flight.clone().multiply(A);
  fld.spinAxis = fld.velocity.clone().multiply(W);
  fld.object = fld.spinAxis.clone().multiply(S);

  const mr = run(fns.M, DEFAULT_FNS.M, [F.clone(), H.clone(), T.clone(), A.clone(), W.clone(), S.clone()]);
  if (mr.err) errors.M = mr.err;
  const M = mr.m;

  const end = tEnd ?? flightTime(model) ?? 3;
  const ball = origin(fld.flight);
  const v = velocity(t);
  const vel = v.clone().transformDirection(H).multiplyScalar(v.length());
  const fwd = new THREE.Vector3(0, 0, 1).transformDirection(H).setY(0);
  if (fwd.lengthSq() < 1e-12) fwd.set(0, 0, 1); else fwd.normalize();
  const mid = pathAt(model, end / 2, H);
  const land = pathAt(model, end, H);
  const path = (tt) => pathAt(model, tt, H);

  const camKey = `C:${model.cam}`;
  const cr = run(fns[camKey], DEFAULT_FNS[camKey],
    [p, t, ball.clone(), fwd.clone(), mid.clone(), land.clone(), path,
      Object.fromEntries(Object.entries(fld).map(([k, m]) => [k, m.clone()]))]);
  if (cr.err) errors.C = cr.err;
  const C = cr.m;
  const Cw = F.clone().multiply(C);
  const V = Cw.clone().invert();
  const pr = run(fns.P, DEFAULT_FNS.P, [p, aspect]);
  if (pr.err) errors.P = pr.err;
  const P = pr.m;

  const frames = Object.fromEntries(Object.entries(fld).map(([k, m]) => [k, F.clone().multiply(m)]));
  frames.world = I4();
  frames.camera = Cw.clone();

  return { t, tEnd: end, links: { S, W, A, T, H, F }, M, C, Cw, V, P, frames, field: fld, ball, vel, fwd, mid, land, errors };
}

// ------------------------------------------------------------------ one point through every frame

/** the frames a mesh point passes through, in order, with the link that takes it there. */
export const STAGES = [
  { frame: 'object', via: 'p_mesh' }, { frame: 'spin axis', via: 'S' }, { frame: 'velocity', via: 'W' },
  { frame: 'flight', via: 'A' }, { frame: 'throw', via: 'T' }, { frame: 'field', via: 'H' },
  { frame: 'world', via: 'F' }, { frame: 'camera', via: 'V' },
];

/** follow(res, pMesh, { width, height }) -> rows { frame, via, v } through the camera, then clip
 *  (x, y, z, w), NDC (after the divide by w) and the pixel in a width × height view (y down). */
export function follow(res, pMesh, { width = 640, height = 360 } = {}) {
  const { S, W, A, T, H, F } = res.links;
  const steps = [null, S, W, A, T, H, F, res.V];
  const rows = [];
  const v = new THREE.Vector3(...pMesh);
  steps.forEach((m, i) => {
    if (m) v.applyMatrix4(m);
    rows.push({ ...STAGES[i], v: [v.x, v.y, v.z] });
  });
  const c = new THREE.Vector4(v.x, v.y, v.z, 1).applyMatrix4(res.P);
  rows.push({ frame: 'clip', via: 'P', v: [c.x, c.y, c.z, c.w] });
  const ndc = [c.x / c.w, c.y / c.w, c.z / c.w];
  rows.push({ frame: 'NDC', via: '÷ w', v: ndc });
  const px = [((ndc[0] + 1) / 2) * width, ((1 - ndc[1]) / 2) * height];
  rows.push({ frame: 'pixel', via: 'viewport', v: px });
  return { rows, inFront: c.w > 0, ndc, px };
}

// ------------------------------------------------------------------ what you type vs what is stored

const D = 180 / Math.PI;
const wrap360 = (a) => { const r = ((a % 360) + 360) % 360; return r > 360 - 1e-9 ? 0 : r; };
const qAxis = (x, y, z, deg) => new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(x, y, z), deg / D);

/**
 * representations(res, model) -> the ball's orientation (mesh to world) several ways:
 *   typed     { x, y, z }: the Euler angles the code feeds in, Unity order (x pitch, y heading, z spin),
 *             z accumulated (it keeps growing); x read from the aim link
 *   readback  { x, y, z, locked }: Euler angles read back from the matrix, wrapped to [0, 360) the way
 *             Unity's eulerAngles reports them; locked near x = ±90 (gimbal lock)
 *   threeRot  { x, y, z } radians: three.js Object3D.rotation for order 'YXZ' (the same decomposition)
 *   qBuilt    the quaternion multiplied together from the typed angles' half angles (and the wobble's),
 *             continuous in t: it changes sign every whole turn of spin
 *   qStored   the quaternion read off the matrix (three.js setFromRotationMatrix)
 *   sameSign  +1 or -1: qBuilt = sameSign · qStored (q and -q are one rotation)
 *   axis, angle  axis-angle of qStored (angle in [0, 180] after picking w ≥ 0)
 *   R         the 3 × 3 rotation (column-major 9), position, gpu (M.elements, 16 floats)
 */
export function representations(res, model) {
  const { p } = model;
  const M = res.M;
  const R = new THREE.Matrix4().extractRotation(M);
  const qStored = new THREE.Quaternion().setFromRotationMatrix(R);
  const e = new THREE.Euler().setFromRotationMatrix(R, 'YXZ');
  const m23 = R.elements[9];
  const locked = Math.abs(m23) >= 0.9999999;
  const A = res.links.A.elements;
  const typed = {
    x: Math.atan2(A[6], A[5]) * D,
    y: (model.on.H ? p.heading : 0) + (model.on.F ? p.fieldYaw : 0),
    z: model.on.S ? 6 * p.rpm * res.t : 0,
  };
  const psi = 360 * p.wobbleHz * res.t;
  const qW = model.on.W
    ? qAxis(0, 0, 1, psi).multiply(qAxis(1, 0, 0, p.cone)).multiply(qAxis(0, 0, 1, -psi))
    : new THREE.Quaternion();
  const qBuilt = qAxis(0, 1, 0, typed.y).multiply(qAxis(1, 0, 0, typed.x)).multiply(qW).multiply(qAxis(0, 0, 1, typed.z));
  const dotq = qBuilt.x * qStored.x + qBuilt.y * qStored.y + qBuilt.z * qStored.z + qBuilt.w * qStored.w;
  const qa = qStored.w < 0 ? new THREE.Quaternion(-qStored.x, -qStored.y, -qStored.z, -qStored.w) : qStored.clone();
  const s = Math.hypot(qa.x, qa.y, qa.z);
  const angle = 2 * Math.atan2(s, qa.w) * D;
  const axis = s < 1e-12 ? [0, 1, 0] : [qa.x / s, qa.y / s, qa.z / s];
  const r = R.elements;
  return {
    typed,
    readback: { x: wrap360(e.x * D), y: wrap360(e.y * D), z: wrap360(e.z * D), locked },
    threeRot: { x: e.x, y: e.y, z: e.z },
    qBuilt: [qBuilt.x, qBuilt.y, qBuilt.z, qBuilt.w],
    qStored: [qStored.x, qStored.y, qStored.z, qStored.w],
    agree: Math.abs(Math.abs(dotq) - 1) < 1e-6,
    sameSign: dotq >= 0 ? 1 : -1,
    axis, angle,
    R: [r[0], r[1], r[2], r[4], r[5], r[6], r[8], r[9], r[10]],
    position: [M.elements[12], M.elements[13], M.elements[14]],
    gpu: [...M.elements],
  };
}
