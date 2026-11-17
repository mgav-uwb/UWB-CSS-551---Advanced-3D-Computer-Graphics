// particle.js: one particle on one spring, and the steps that move it. Four integrators (explicit Euler, semi-implicit Euler,
// Verlet, implicit Euler), the exact motion they approximate, the growth of each integrator per step and the step at which it
// stops being bounded, the accumulator that keeps a simulation's step fixed while the frames are uneven, one spring stepped by
// the frame and by the accumulator, and a particle's contact with a plane and with a thin wall.
// No three.js here: a vector is an array of three numbers, a result is a plain object. scene.js draws four masses on one
// spring; the course demo (lib/demos/particle-lab.js) runs these same functions, so a value the demo prints beside a line of code
// is the value that line computed. No function changes its arguments.
// The same functions, line for line where the languages allow, are ParticleLab.cs in ../unity/
// (lib/tests/programs/particle-lab.test.mjs runs both on the same inputs and compares the numbers).

// #region Settings and random numbers
// EPSILON absorbs rounding when a time is compared with a step (16.667 ms six times is 100 ms, give or take 1e-14). The random
// numbers are Park and Miller's integer generator (multiplier 48271, modulus 2^31 - 1): the state is an integer, so both tracks
// draw the same frames.
export const EPSILON = 1e-9;
export const MODULUS = 2147483647;
export const MULTIPLIER = 48271;
export const GRAVITY = 9.81;

export function nextState(state) {
  const next = (state * MULTIPLIER) % MODULUS;
  const u = next / MODULUS;
  return { state: next, u };
}
// #endregion

// #region The spring and its energy
// A spring pulls with force -k x, a damper with -c v; Newton turns the total into an acceleration a = F / m. The natural
// frequency is omega = sqrt(k / m) (the period is 2 pi / omega), and damping is critical at c = 2 sqrt(k m), where zeta = 1.
// The energy 1/2 m v^2 + 1/2 k x^2 is constant for a spring without a damper: it is the number every integrator is judged by.
export function springForce(k, c, x, v) {
  return -k * x - c * v;
}

export function energyOf(k, m, x, v) {
  return 0.5 * m * v * v + 0.5 * k * x * x;
}

export function describeSpring(k, m, c, x, v) {
  const force = springForce(k, c, x, v);
  const a = force / m;
  const omega = Math.sqrt(k / m);
  const energy = energyOf(k, m, x, v);
  const critical = 2 * Math.sqrt(k * m);
  const zeta = c / critical;
  return { force, a, omega, energy, critical, zeta };
}
// #endregion

// #region One step of a spring
// The three Euler steps differ in which state each update reads. Explicit Euler reads the OLD state for both: the position moves
// with the old velocity, the velocity changes with the old acceleration. Semi-implicit Euler changes the velocity first and moves
// the position with the NEW velocity: one line in a different order. Implicit Euler uses the force at the END of the step; for a
// spring that solves in closed form for the new velocity.
function implicitStep(k, m, c, h, x, v) {
  const vNew = (m * v - h * k * x) / (m + h * c + h * h * k);
  return { x: x + h * vNew, v: vNew };
}

export function springStep(kind, k, m, c, h, x, v) {
  const a = springForce(k, c, x, v) / m;   // acceleration of the old state, m/s^2
  let xNew = x;
  let vNew = v;
  if (kind === 'explicit') {
    xNew = x + h * v;       // position from the old velocity
    vNew = v + h * a;       // velocity from the old acceleration
  } else if (kind === 'semi') {
    vNew = v + h * a;       // velocity first
    xNew = x + h * vNew;    // then position, from the new velocity
  } else if (kind === 'implicit') {
    const step = implicitStep(k, m, c, h, x, v);
    xNew = step.x;
    vNew = step.v;
  } else {
    throw new Error('unknown integrator ' + kind);
  }
  return { x: xNew, v: vNew, a };
}
// #endregion

// #region Verlet: positions only
// Verlet keeps two positions and no velocity: the next position is twice this one, minus the last, plus a h^2. The velocity is
// implied by the last two positions. Started from rest it makes the same positions as semi-implicit Euler, and a constraint can
// move a position directly while the velocity follows.
export function verletStep(k, m, c, h, x, xPrev) {
  const vOld = (x - xPrev) / h;
  const a = springForce(k, c, x, vOld) / m;
  const xNew = 2 * x - xPrev + a * h * h;
  const v = (xNew - x) / h;
  return { x: xNew, xPrev: x, v };
}
// #endregion

// #region A run of steps
// n steps from (x0, v0), recording the time, position, velocity and energy before each step and after the last. Verlet starts
// from the previous position x0 - h v0, so that its first step is the same as semi-implicit Euler's.
export function runSpring(kind, k, m, c, h, x0, v0, n) {
  const times = [];
  const xs = [];
  const vs = [];
  const energies = [];
  let x = x0;
  let v = v0;
  let xPrev = x0 - h * v0;
  for (let i = 0; i <= n; i++) {
    times.push(i * h);
    xs.push(x);
    vs.push(v);
    energies.push(energyOf(k, m, x, v));
    if (kind === 'verlet') {
      const next = verletStep(k, m, c, h, x, xPrev);
      xPrev = next.xPrev;
      x = next.x;
      v = next.v;
    } else {
      const next = springStep(kind, k, m, c, h, x, v);
      x = next.x;
      v = next.v;
    }
  }
  return { times, xs, vs, energies };
}
// #endregion

// #region The exact motion
// The closed-form solution the steps approximate, for the spring with its damper: underdamped (zeta < 1) it rings at
// omega sqrt(1 - zeta^2) and decays as exp(-zeta omega t); critically damped it is (x0 + (v0 + omega x0) t) exp(-omega t);
// overdamped it is a sum of two decaying exponentials. Without a damper it is x0 cos(omega t) + (v0 / omega) sin(omega t).
export function exactSpring(k, m, c, x0, v0, t) {
  const omega = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));
  let x = 0;
  let v = 0;
  if (Math.abs(zeta - 1) < 1e-9) {
    const decay = Math.exp(-omega * t);
    const b = v0 + omega * x0;
    x = (x0 + b * t) * decay;
    v = (b - omega * (x0 + b * t)) * decay;
  } else if (zeta < 1) {
    const rate = zeta * omega;
    const wd = omega * Math.sqrt(1 - zeta * zeta);
    const decay = Math.exp(-rate * t);
    const b = (v0 + rate * x0) / wd;
    const cs = Math.cos(wd * t);
    const sn = Math.sin(wd * t);
    x = decay * (x0 * cs + b * sn);
    v = decay * (-rate * (x0 * cs + b * sn) + wd * (-x0 * sn + b * cs));
  } else {
    const root = omega * Math.sqrt(zeta * zeta - 1);
    const r1 = -zeta * omega + root;
    const r2 = -zeta * omega - root;
    const a1 = (v0 - r2 * x0) / (r1 - r2);
    const a2 = x0 - a1;
    x = a1 * Math.exp(r1 * t) + a2 * Math.exp(r2 * t);
    v = a1 * r1 * Math.exp(r1 * t) + a2 * r2 * Math.exp(r2 * t);
  }
  return { x, v };
}
// #endregion

// #region The step as a matrix
// Every step of the spring is linear, so one step is a 2 by 2 matrix on the state: (x, v), or (x, previous x) for Verlet. The
// matrix is read off by stepping the two unit states. Its eigenvalues say what a step does to the motion: a complex pair is a
// rotation scaled by sqrt(det), and a real pair is a decay or a growth along two directions.
function applyStep(kind, k, m, c, h, first, second) {
  if (kind === 'verlet') {
    const next = verletStep(k, m, c, h, first, second);
    return [next.x, next.xPrev];
  }
  const next = springStep(kind, k, m, c, h, first, second);
  return [next.x, next.v];
}

export function stepMatrix(kind, k, m, c, h) {
  const left = applyStep(kind, k, m, c, h, 1, 0);
  const right = applyStep(kind, k, m, c, h, 0, 1);
  return [left[0], right[0], left[1], right[1]];
}

export function spectralRadius(a, b, c, d) {
  const trace = a + d;
  const det = a * d - b * c;
  const disc = trace * trace / 4 - det;
  if (disc < 0) return Math.sqrt(det);      // a complex pair: both have magnitude sqrt(det)
  const root = Math.sqrt(disc);
  return Math.max(Math.abs(trace / 2 + root), Math.abs(trace / 2 - root));
}

// #endregion

// #region Stability: growth per step
// The largest eigenvalue magnitude of the step matrix is the growth of the amplitude per step: above 1 the motion grows without
// bound. For explicit Euler without a damper the energy is multiplied by 1 + (h omega)^2 every step; semi-implicit Euler and
// Verlet stay bounded while h omega < 2; implicit Euler never grows.
export function growthPerStep(kind, k, m, c, h) {
  const matrix = stepMatrix(kind, k, m, c, h);
  return spectralRadius(matrix[0], matrix[1], matrix[2], matrix[3]);
}

// The largest h whose growth stays at 1 (within EPSILON): double h until it grows, then bisect. Infinity: it never grows.
export function stepLimit(kind, k, m, c) {
  const omega = Math.sqrt(k / m);
  let high = 1 / omega;
  for (let i = 0; i < 40 && growthPerStep(kind, k, m, c, high) <= 1 + EPSILON; i++) high *= 2;
  if (growthPerStep(kind, k, m, c, high) <= 1 + EPSILON) return Infinity;
  let low = 0;
  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (growthPerStep(kind, k, m, c, mid) <= 1 + EPSILON) low = mid;
    else high = mid;
  }
  return low;
}

export function stabilityReport(kind, k, m, c, h) {
  const omega = Math.sqrt(k / m);
  const hOmega = h * omega;
  const growth = growthPerStep(kind, k, m, c, h);
  const energyFactor = growth * growth;
  const limit = stepLimit(kind, k, m, c);
  const bounded = growth <= 1 + EPSILON;
  const damperFactor = 1 - h * c / m;    // a damper stepped explicitly multiplies the velocity by this: |factor| < 1 needs h c / m < 2
  return { omega, hOmega, growth, energyFactor, limit, bounded, damperFactor };
}
// #endregion

// #region The accumulator
// Frames come in uneven lengths (milliseconds); the simulation steps by a fixed amount. Each frame adds its length to the
// time carried over, runs every whole step that fits and carries the rest. The render alpha is the carry as a fraction of a
// step: the picture is drawn that far between the last two states. A stalled frame is cut at clampMs, or it would demand
// hundreds of steps.
export function makeFrames(n, baseMs, jitter, seed, hitchAt, hitchMs) {
  const frames = [];
  let state = seed;
  for (let i = 0; i < n; i++) {
    const draw = nextState(state);
    state = draw.state;
    frames.push(baseMs * (1 + jitter * (2 * draw.u - 1)));
  }
  if (hitchAt >= 0 && hitchAt < n && hitchMs > 0) frames[hitchAt] = hitchMs;
  return frames;
}

export function accumulate(frames, stepMs, clampMs) {
  const used = [];
  const accumulated = [];
  const steps = [];
  const carried = [];
  const alpha = [];
  let carry = 0;
  let totalSteps = 0;
  let wall = 0;
  let dropped = 0;
  for (let i = 0; i < frames.length; i++) {
    const frame = Math.min(frames[i], clampMs);    // a stalled frame is cut
    let left = carry + frame;
    let count = 0;
    while (left >= stepMs - EPSILON) {
      left -= stepMs;
      count++;
    }
    carry = Math.max(0, left);
    used.push(frame);
    accumulated.push(carry + count * stepMs);
    steps.push(count);
    carried.push(carry);
    alpha.push(carry / stepMs);
    totalSteps += count;
    wall += frames[i];
    dropped += frames[i] - frame;
  }
  return { used, accumulated, steps, carried, alpha, totalSteps, wall, dropped };
}
// #endregion

// #region Two ways to step
// The same spring over the same frames. 'frame': one step per frame, as long as the frame. 'substeps': the frame cut into
// substeps equal steps. 'fixed': the accumulator, every step stepMs whatever the frames did. A step's length is the whole
// difference: the first two take whatever the frame gives them (and a stalled frame is a long step), the third never changes.
export function simulateFrames(kind, mode, k, m, c, frames, stepMs, substeps, clampMs, x0, v0) {
  const times = [0];
  const xs = [x0];
  const vs = [v0];
  const energies = [energyOf(k, m, x0, v0)];
  let x = x0;
  let v = v0;
  let time = 0;
  let carry = 0;
  let stepsTaken = 0;
  for (let i = 0; i < frames.length; i++) {
    let h = frames[i] / 1000;
    let count = 1;
    if (mode === 'substeps') {
      h = frames[i] / 1000 / substeps;
      count = substeps;
    } else if (mode === 'fixed') {
      let left = carry + Math.min(frames[i], clampMs);
      count = 0;
      while (left >= stepMs - EPSILON) {
        left -= stepMs;
        count++;
      }
      carry = Math.max(0, left);
      h = stepMs / 1000;
    }
    for (let j = 0; j < count; j++) {
      const next = springStep(kind, k, m, c, h, x, v);
      x = next.x;
      v = next.v;
      time += h;
      stepsTaken++;
      times.push(time);
      xs.push(x);
      vs.push(v);
      energies.push(energyOf(k, m, x, v));
    }
  }
  return { times, xs, vs, energies, stepsTaken, carry };
}
// #endregion

// #region Contact: push out
// A plane n . p = d with the unit normal n pointing out; the particle is inside when n . p < d, by depth = d - n . p. Push it
// straight out along n. Then split the velocity into the part along n and the part along the surface: the normal part reverses
// and is scaled by the restitution e (the share of the approach speed that comes back), and friction mu removes a share of the
// tangential part, at most all of it, in proportion to the impulse the normal part received.
export function planeContact(p, v, n, d, e, mu) {
  const depth = d - (n[0] * p[0] + n[1] * p[1] + n[2] * p[2]);
  const speedBefore = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (depth <= 0) {
    return { hit: false, depth: 0, p: p.slice(), v: v.slice(), normalSpeed: 0, tangentSpeed: 0, speedBefore, speedAfter: speedBefore, kept: 1 };
  }
  const pushed = [p[0] + n[0] * depth, p[1] + n[1] * depth, p[2] + n[2] * depth];
  const normalSpeed = n[0] * v[0] + n[1] * v[1] + n[2] * v[2];    // negative: moving into the plane
  const tangent = [v[0] - n[0] * normalSpeed, v[1] - n[1] * normalSpeed, v[2] - n[2] * normalSpeed];
  const tangentSpeed = Math.sqrt(tangent[0] * tangent[0] + tangent[1] * tangent[1] + tangent[2] * tangent[2]);
  let normalAfter = normalSpeed;
  let slide = 1;
  if (normalSpeed < 0) {
    normalAfter = -e * normalSpeed;
    if (tangentSpeed > 0) slide = Math.max(0, 1 - mu * (1 + e) * (-normalSpeed) / tangentSpeed);
  }
  const after = [tangent[0] * slide + n[0] * normalAfter, tangent[1] * slide + n[1] * normalAfter, tangent[2] * slide + n[2] * normalAfter];
  const speedAfter = Math.sqrt(after[0] * after[0] + after[1] * after[1] + after[2] * after[2]);
  const kept = speedBefore > 0 ? (speedAfter * speedAfter) / (speedBefore * speedBefore) : 1;
  return { hit: true, depth, p: pushed, v: after, normalSpeed, tangentSpeed, speedBefore, speedAfter, kept };
}
// #endregion

// #region A thin wall
// A wall occupies wallMin < x < wallMax. A particle that ENDS a step inside it is put back on the face it came from (the side
// its velocity says) and bounces with restitution e. One that starts a step before the wall and ends it past the wall was never
// inside at any step, so nothing pushes it: it tunnels. throwRun is a particle thrown with velocity (vx0, vy0) under gravity g,
// stepped semi-implicitly with steps of h, against the wall and the floor y = 0.
export function slabContact(x, xPrev, vx, wallMin, wallMax, e) {
  const inside = x > wallMin && x < wallMax;
  const crossed = (xPrev <= wallMin && x >= wallMax) || (xPrev >= wallMax && x <= wallMin);
  if (!inside) return { hit: false, x, vx, crossed };
  const fromLeft = vx > 0;
  return { hit: true, x: fromLeft ? wallMin : wallMax, vx: -e * vx, crossed: false };
}

export function throwRun(x0, y0, vx0, vy0, g, h, steps, wallMin, wallMax, e, mu) {
  const xs = [x0];
  const ys = [y0];
  const vxs = [vx0];
  const vys = [vy0];
  let x = x0;
  let y = y0;
  let vx = vx0;
  let vy = vy0;
  let wallStep = -1;
  let tunnelStep = -1;
  let floorStep = -1;
  for (let i = 1; i <= steps; i++) {
    const xPrev = x;
    vy = vy - g * h;
    x = x + h * vx;
    y = y + h * vy;
    const wall = slabContact(x, xPrev, vx, wallMin, wallMax, e);
    if (wall.hit && wallStep < 0) wallStep = i;
    if (wall.crossed && tunnelStep < 0) tunnelStep = i;
    x = wall.x;
    vx = wall.vx;
    const floor = planeContact([x, y, 0], [vx, vy, 0], [0, 1, 0], 0, e, mu);
    if (floor.hit && floorStep < 0) floorStep = i;
    x = floor.p[0];
    y = floor.p[1];
    vx = floor.v[0];
    vy = floor.v[1];
    xs.push(x);
    ys.push(y);
    vxs.push(vx);
    vys.push(vy);
  }
  return { xs, ys, vxs, vys, wallStep, tunnelStep, floorStep };
}
// #endregion
