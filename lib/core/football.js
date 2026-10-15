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
  rpm: 600, cone: 3, wobbleHz: 2, fieldYaw: 0, g: 9.808, fov: 50,
};

/** gravity, chosen from a list and kept across throws (the presets leave it alone). Seattle and Denver
 *  from the 1980 international gravity formula with the free-air correction (-3.086e-6 per meter of
 *  height): 47.6° N near sea level, 39.7° N at 1609 m; the Moon's mean surface gravity; Sirius B, the white
 *  dwarf companion of Sirius, log g = 8.556 in cm/s² (Barstow et al. 2005). */
export const GRAVITY = [
  { id: 'seattle', name: 'Seattle', g: 9.808 },
  { id: 'denver', name: 'Denver', g: 9.797 },
  { id: 'moon', name: 'the Moon', g: 1.62 },
  { id: 'whitedwarf', name: 'a white dwarf (Sirius B)', g: 3.6e6 },
];

/** [min, max] for each parameter box; entries outside are clamped. */
export const LIMITS = {
  startX: [-20, 70], startY: [0.1, 10], startZ: [-20, 130], heading: [-180, 180], angle: [-30, 90],
  speed: [0, 45], rpm: [0, 2000], cone: [0, 60], wobbleHz: [0, 10], fieldYaw: [-180, 180],
  g: [0, 4e6], fov: [10, 120],
};

export const PRESETS = [
  { name: 'spiral pass', p: {} },
  { name: 'Hail Mary', p: { startX: 25, startZ: 15, heading: 0, angle: 45, speed: 28, rpm: 500, cone: 4, wobbleHz: 1.5 } },
  { name: 'bullet', p: { angle: 8, speed: 27, rpm: 700, cone: 1, heading: -6 } },
  { name: 'wobbly duck', p: { angle: 40, speed: 16, rpm: 200, cone: 18, wobbleHz: 1.5 } },
  { name: 'straight up', p: { startX: 25, startZ: 55, heading: 0, angle: 90, speed: 18, rpm: 400, cone: 0 } },
  { name: 'out of bounds', p: { startX: 25, startZ: 20, heading: 8, angle: 40, speed: 35, rpm: 650, cone: 2 } },
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
 *  found by stepping 10 ms then bisecting; null if it is still up after 120 s (no gravity, say). */
export function flightTime(model) {
  const H = staticLinks(model).H.m;
  const y = (t) => pathAt(model, t, H).y - BALL.radius;
  for (let i = 1; i <= 12000; i++) {
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

// ------------------------------------------------------------------ the target: an open bowl on a cart

/** the target: a chassis on four wheels carrying an open bowl. Cart frame: origin on the ground under the
 *  chassis center, +z forward, y up. It waits at home, drives in a straight line to where the ball will
 *  come down through the bowl's rim, and catches it; if it cannot get there in time it heads for the
 *  landing point instead; if that point is outside the box it hits the box's wall and stops there. */
export const CART = {
  length: 1.6, width: 1.3, wheelR: 0.3, wheelW: 0.16,
  rimY: 1.3,           // the bowl's rim: a ball coming down through this height is caught
  bowlR: 0.55,         // the bowl, a half sphere hanging below the rim
  home: [10, 25],      // where it waits, in throw-frame (x, z): 10 m to the thrower's left, 25 m downfield
  vmax: 20,            // top speed, m/s
  brake: 5,            // meters to stop after reaching the catch or landing point
  settle: 0.46,        // how far a caught ball drops inside the bowl, m
};

/** the other two balls, placed in the throw frame so they stay beside the thrower: one at rest on the
 *  ground 3 m to the thrower's left, one spinning on its tip like a top 3 m to the right. */
export const EXTRA = { restAt: [3, -1], restYaw: 25, topAt: [-3, -1], tilt: 18, precessHz: 0.5, topRpm: 480 };

/** u²(2 − u): starts at rest (slope 0 at u = 0) and arrives at speed 1 (slope 1 at u = 1). */
const ease = (u) => u * u * (2 - u);
const easeRate = (u) => 4 * u - 3 * u * u;

/** the first time after release that the ball's center comes DOWN through field height y, or null. */
export function descentTime(model, y, H = staticLinks(model).H.m) {
  const h = (t) => pathAt(model, t, H).y - y;
  let prev = h(0);
  for (let i = 1; i <= 12000; i++) {
    const b = i * 0.01, cur = h(b);
    if (prev > 0 && cur <= 0) {
      let lo = b - 0.01, hi = b;
      for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (h(m) > 0) lo = m; else hi = m; }
      return (lo + hi) / 2;
    }
    prev = cur;
  }
  return null;
}

const inBox = (x, z, m) => x >= m && x <= FIELD.width - m && z >= m && z <= FIELD.length - m;

/** distance from (x, z) inside the box along the unit direction (dx, dz) to the box's wall. */
function toWall(x, z, dx, dz) {
  let s = Infinity;
  if (dx > 1e-12) s = Math.min(s, (FIELD.width - x) / dx);
  if (dx < -1e-12) s = Math.min(s, -x / dx);
  if (dz > 1e-12) s = Math.min(s, (FIELD.length - z) / dz);
  if (dz < -1e-12) s = Math.min(s, -z / dz);
  return s;
}

/**
 * cartPlan(model) -> what the target does on this throw:
 *   outcome   'catch' | 'miss' (too far to get there in time, or the ball never comes down through the
 *             rim) | 'crash' (the point it heads for is outside the box: it hits the wall)
 *   home, goal (field, on the ground), heading (deg), dist, T (when it would reach the goal)
 *   tc (catch time), tGround, tFlightEnd (catch or ground), tStop, tTotal (the timeline's end)
 */
export function cartPlan(model) {
  const H = staticLinks(model).H.m;
  const tGround = flightTime(model) ?? 120;
  const tRim = descentTime(model, CART.rimY, H);
  const m = CART.length / 2 + 0.1;
  const home = new THREE.Vector3(CART.home[0], 0, CART.home[1]).applyMatrix4(H).setY(0);
  home.x = Math.min(Math.max(home.x, m), FIELD.width - m);
  home.z = Math.min(Math.max(home.z, m), FIELD.length - m);
  const aim = (goal, tNeed) => {
    const d = goal.clone().sub(home).setY(0);
    const dist = d.length();
    const dir = dist > 1e-9 ? d.multiplyScalar(1 / dist) : new THREE.Vector3(0, 0, 1);
    const T = Math.max(tNeed, (4 / 3) * dist / CART.vmax, 1e-6);   // ease peaks at 4/3 the mean speed
    return { goal: goal.clone().setY(0), dist, dir, T };
  };
  let outcome = 'miss', a = null, tc = null;
  if (tRim != null && tRim <= tGround) {
    a = aim(pathAt(model, tRim, H), tRim);
    if (a.T <= tRim + 1e-9) { outcome = 'catch'; tc = tRim; }
  }
  if (outcome !== 'catch') a = aim(pathAt(model, tGround, H), tGround);
  const plan = { home, tGround, tRim, tc, ...a, heading: (Math.atan2(a.dir.x, a.dir.z) * 180) / Math.PI };
  if (!inBox(a.goal.x, a.goal.z, m)) {
    plan.outcome = 'crash';
    plan.tc = null;
    plan.sWall = Math.max(0, toWall(home.x, home.z, a.dir.x, a.dir.z) - CART.length / 2);
    let lo = 0, hi = 1;
    for (let k = 0; k < 60; k++) { const u = (lo + hi) / 2; if (a.dist * ease(u) < plan.sWall) lo = u; else hi = u; }
    plan.tStop = lo * a.T;
    plan.vImpact = (a.dist / a.T) * easeRate(lo);
  } else {
    plan.outcome = outcome;
    plan.vEnd = a.dist / a.T;
    plan.brake = Math.max(0.05, Math.min(CART.brake, toWall(a.goal.x, a.goal.z, a.dir.x, a.dir.z) - CART.length / 2));
    plan.tBrake = plan.vEnd > 1e-9 ? (2 * plan.brake) / plan.vEnd : 0;
    plan.tStop = a.T + plan.tBrake;
  }
  plan.tFlightEnd = plan.outcome === 'catch' ? tc : tGround;
  plan.tTotal = Math.max(plan.tFlightEnd, plan.tStop) + 1;
  return plan;
}

/** where the cart is at time t: distance driven s, its position (field), the crash tilt (deg, the rear
 *  lifting over the front bumper), and the wheels' turn s / r (rad, rolling without slipping). */
export function cartAt(plan, t) {
  let s, tilt = 0;
  if (plan.outcome === 'crash') {
    s = t < plan.tStop ? plan.dist * ease(t / plan.T) : plan.sWall;
    if (t > plan.tStop) {
      const tau = t - plan.tStop;
      tilt = Math.min(30, 2 * plan.vImpact) * Math.exp(-5 * tau) * Math.abs(Math.sin(9 * tau));
    }
  } else if (t <= plan.T) {
    s = plan.dist * ease(t / plan.T);
  } else {
    const tau = Math.min(t - plan.T, plan.tBrake);
    const dec = plan.tBrake > 0 ? plan.vEnd / plan.tBrake : 0;
    s = plan.dist + plan.vEnd * tau - 0.5 * dec * tau * tau;
  }
  const pos = plan.home.clone().addScaledVector(plan.dir, s);
  return { s, pos, tilt, wheel: s / CART.wheelR };
}

/** the cart's placement K(t) in the field: T(pos) · R_y(heading) · [the crash tilt about the front bumper's
 *  bottom edge, T(0, 0, L/2) · R_x(tilt) · T(0, 0, −L/2)], and each wheel's: K · T(offset) · R_x(s / r). */
export function cartMatrices(plan, t) {
  const st = cartAt(plan, t);
  const D = Math.PI / 180;
  const half = CART.length / 2;
  const K = new THREE.Matrix4().makeTranslation(st.pos.x, 0, st.pos.z)
    .multiply(new THREE.Matrix4().makeRotationY(plan.heading * D))
    .multiply(new THREE.Matrix4().makeTranslation(0, 0, half))
    .multiply(new THREE.Matrix4().makeRotationX(st.tilt * D))
    .multiply(new THREE.Matrix4().makeTranslation(0, 0, -half));
  const wheels = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz]) => K.clone()
    .multiply(new THREE.Matrix4().makeTranslation(sx * CART.width / 2, CART.wheelR, sz * (half - 0.35)))
    .multiply(new THREE.Matrix4().makeRotationX(st.wheel)));
  return { K, wheels, state: st };
}

/** ball 2, at rest on the ground beside the thrower: H · T(3, r − ground, −1) · R_y(25°). */
export function restingBall(H) {
  const ground = -H.elements[13];
  return H.clone()
    .multiply(new THREE.Matrix4().makeTranslation(EXTRA.restAt[0], ground + BALL.radius, EXTRA.restAt[1]))
    .multiply(new THREE.Matrix4().makeRotationY((EXTRA.restYaw * Math.PI) / 180));
}

/** ball 3, a top on its tip: H · T(−3, −ground, −1) · R_y(precession) · R_x(tilt − 90°) · T(0, 0, L/2) · R_z(spin).
 *  R_x(tilt − 90°) stands the long axis up, leaning by tilt; T(0, 0, L/2) lifts the ball along it until its
 *  lower tip touches the ground at the origin; R_z spins it about its own long axis. Returns the placement
 *  without the spin (pre) and with it (object). */
export function spinningTop(H, t) {
  const D = Math.PI / 180;
  const ground = -H.elements[13];
  const pre = H.clone()
    .multiply(new THREE.Matrix4().makeTranslation(EXTRA.topAt[0], ground, EXTRA.topAt[1]))
    .multiply(new THREE.Matrix4().makeRotationY(2 * Math.PI * EXTRA.precessHz * t))
    .multiply(new THREE.Matrix4().makeRotationX((EXTRA.tilt - 90) * D))
    .multiply(new THREE.Matrix4().makeTranslation(0, 0, BALL.length / 2));
  const object = pre.clone().multiply(new THREE.Matrix4().makeRotationZ(2 * Math.PI * (EXTRA.topRpm / 60) * t));
  return { pre, object };
}

/**
 * evaluateChain(model, t, { aspect }) -> every matrix of the scene at time t:
 *   links   { S, W, A, T, H, F } (identity when switched off), evaluated at min(t, the end of the flight)
 *   M       the thrown ball's model matrix: the compose snippet's product while it flies; once caught,
 *           carried by the cart: F · K(t) · D(t) · K(tc)⁻¹ · F⁻¹ · M(tc) (a change of parent that keeps the
 *           ball where it was, then the drop D into the bowl); once landed, held
 *   C, Cw = F · C, V = Cw⁻¹, P   the shot camera (looking at ball model.look: 1, 2 or 3)
 *   frames  each frame's placement in the WORLD (object, spinAxis, velocity, flight, throw, field, world,
 *           camera, target); field  the same in the FIELD (what the camera snippets get)
 *   cart { K, wheels, state, plan }, rest (ball 2), top { pre, object } (ball 3): field matrices
 *   carry   the field matrix that carries ball 1 after the catch (null before), phase 'flight' | 'caught' | 'landed'
 *   ball, vel, fwd, mid, land   field-frame vectors; errors { id: message } for snippets that failed
 */
export function evaluateChain(model, t, { aspect = 16 / 9 } = {}) {
  const { p, fns, on } = model;
  const errors = {};
  const plan = model.plan || cartPlan(model);
  const tl = Math.min(t, plan.tFlightEnd);
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
  const Finv = F.clone().invert();
  const velocity = (tt) => velocityAt(model, tt);
  const S = pick('S', [p, tl]);
  const W = pick('W', [p, tl]);
  const A = pick('A', [p, tl, velocity]);
  const T = pick('T', [p, tl]);

  const cart = cartMatrices(plan, t);
  let carry = null, phase = t < plan.tFlightEnd ? 'flight' : 'landed';
  if (plan.outcome === 'catch' && t >= plan.tc) {
    phase = 'caught';
    const tau = t - plan.tc;
    const drop = Math.min(CART.settle, 0.5 * Math.min(p.g, 1e3) * tau * tau);
    carry = cart.K.clone()
      .multiply(new THREE.Matrix4().makeTranslation(0, -drop, 0))
      .multiply(cartMatrices(plan, plan.tc).K.invert());
  }

  const fld = {};
  fld.field = I4();
  fld.throw = H.clone();
  fld.flight = fld.throw.clone().multiply(T);
  fld.velocity = fld.flight.clone().multiply(A);
  fld.spinAxis = fld.velocity.clone().multiply(W);
  fld.object = fld.spinAxis.clone().multiply(S);
  if (carry) for (const k of ['flight', 'velocity', 'spinAxis', 'object']) fld[k] = carry.clone().multiply(fld[k]);
  fld.target = cart.K.clone();
  const rest = restingBall(H);
  const top = spinningTop(H, t);

  const mr = run(fns.M, DEFAULT_FNS.M, [F.clone(), H.clone(), T.clone(), A.clone(), W.clone(), S.clone()]);
  if (mr.err) errors.M = mr.err;
  const M = carry ? F.clone().multiply(carry).multiply(Finv).multiply(mr.m) : mr.m;

  const ball1 = origin(fld.flight);
  const v = phase === 'flight' ? velocity(t) : new THREE.Vector3();
  const vel = v.clone().transformDirection(H).multiplyScalar(v.length());
  const fwd = new THREE.Vector3(0, 0, 1).transformDirection(H).setY(0);
  if (fwd.lengthSq() < 1e-12) fwd.set(0, 0, 1); else fwd.normalize();
  // the shot camera looks at ball 1, 2 or 3: its center, its frames, its path and its mid and end points
  const look = model.look || 1;
  const path = (tt) => {
    if (look === 2) return origin(rest);
    if (look === 3) return origin(spinningTop(H, tt).object);
    if (tt <= plan.tFlightEnd) return pathAt(model, tt, H);
    const end = pathAt(model, plan.tFlightEnd, H);
    if (plan.outcome !== 'catch') return end;
    const drop = Math.min(CART.settle, 0.5 * Math.min(p.g, 1e3) * (tt - plan.tc) ** 2);
    return end.applyMatrix4(cartMatrices(plan, plan.tc).K.invert())
      .applyMatrix4(new THREE.Matrix4().makeTranslation(0, -drop, 0)).applyMatrix4(cartMatrices(plan, tt).K);
  };
  let ball = ball1, mid = pathAt(model, plan.tFlightEnd / 2, H), land = pathAt(model, plan.tFlightEnd, H);
  const camFrames = Object.fromEntries(Object.entries(fld).map(([k, m]) => [k, m.clone()]));
  if (look === 2 || look === 3) {
    const pre = look === 2 ? rest : top.pre, obj = look === 2 ? rest : top.object;
    ball = origin(obj);
    mid = ball.clone();
    land = ball.clone();
    camFrames.flight = new THREE.Matrix4().makeTranslation(ball.x, ball.y, ball.z);
    camFrames.velocity = pre.clone();
    camFrames.spinAxis = pre.clone();
    camFrames.object = obj.clone();
  }

  const camKey = `C:${model.cam}`;
  const cr = run(fns[camKey], DEFAULT_FNS[camKey], [p, t, ball.clone(), fwd.clone(), mid.clone(), land.clone(), path, camFrames]);
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

  return {
    t, tl, tEnd: plan.tTotal, plan, phase, carry, links: { S, W, A, T, H, F }, M, C, Cw, V, P, frames, field: fld,
    cart: { ...cart, plan }, rest, top, ball: ball1, look: ball, vel, fwd, mid, land, errors,
  };
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
    if (i === 5 && res.carry) {
      // caught: the cart carries the ball, K(t) · D(t) · K(tc)⁻¹, in the field
      rows.push({ ...STAGES[i], v: [v.x, v.y, v.z] });
      v.applyMatrix4(res.carry);
      rows.push({ frame: 'field, carried', via: 'K·D·K(tc)⁻¹', v: [v.x, v.y, v.z] });
      return;
    }
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
  const tl = res.tl ?? res.t;
  const typed = {
    x: Math.atan2(A[6], A[5]) * D,
    y: (model.on.H ? p.heading : 0) + (model.on.F ? p.fieldYaw : 0),
    z: model.on.S ? 6 * p.rpm * tl : 0,
  };
  const psi = 360 * p.wobbleHz * tl;
  const qW = model.on.W
    ? qAxis(0, 0, 1, psi).multiply(qAxis(1, 0, 0, p.cone)).multiply(qAxis(0, 0, 1, -psi))
    : new THREE.Quaternion();
  const qBuilt = qAxis(0, 1, 0, typed.y).multiply(qAxis(1, 0, 0, typed.x)).multiply(qW).multiply(qAxis(0, 0, 1, typed.z));
  if (res.carry) {
    // caught: the cart's turn since the catch, in world axes, applied on top
    const F = res.links.F, Cw = F.clone().multiply(res.carry).multiply(F.clone().invert());
    qBuilt.premultiply(new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().extractRotation(Cw)));
  }
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
