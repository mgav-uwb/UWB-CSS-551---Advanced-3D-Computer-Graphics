// optimlab.js: training a network is walking downhill on a loss surface. Loss surfaces, gradient
// descent, momentum and Adam (Kingma and Ba, 2015), minibatch gradients and their noise, a learning-rate schedule and weight
// decay.
// No three.js here: points are plain numbers or arrays. scene.js draws a loss surface and the walk; the course demo (lib/demos/optim-lab.js) runs these same
// functions, so a value the demo prints beside a line of code is the value that line computed. No function changes its arguments.
// The same functions, line for line where the languages allow, are OptimLab.cs in ../unity/
// (lib/tests/programs/optim-lab.test.mjs runs both on the same inputs and compares the numbers).

// #region Settings and random numbers
// The defaults of Kingma and Ba for Adam. The random numbers are Park and Miller's integer generator (multiplier 48271,
// modulus 2^31 - 1): the state is an integer, so both tracks draw the same minibatches.
export const BETA1 = 0.9;
export const BETA2 = 0.999;
export const EPSILON = 1e-8;
export const MODULUS = 2147483647;
export const MULTIPLIER = 48271;
export const LIMIT = 1e6;
export const TRUE_W = 1.2;
export const TRUE_B = 0.5;

export function nextState(state) {
  const next = (state * MULTIPLIER) % MODULUS;
  const u = next / MODULUS;
  return { state: next, u };
}
// #endregion

// #region A quadratic bowl
// L = (h1 u^2 + h2 v^2) / 2 in axes turned by an angle: u and v are the coordinates along the bowl's two principal axes.
// Gradient descent multiplies each axis by 1 - eta h every step, so it converges when |1 - eta h| < 1 for both, that is
// eta < 2 / h2 for the steeper axis. The best rate comes from eta = 2 / (h1 + h2).
export function quadraticRate(h1, h2, eta) {
  const factor1 = 1 - eta * h1;
  const factor2 = 1 - eta * h2;
  const rate = Math.max(Math.abs(factor1), Math.abs(factor2));
  const etaLimit = 2 / Math.max(h1, h2);
  const etaBest = 2 / (h1 + h2);
  return { factor1, factor2, rate, etaLimit, etaBest };
}

export function quadraticLoss(x, y, h1, h2, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const u = c * x + s * y;
  const v = -s * x + c * y;
  const loss = 0.5 * (h1 * u * u + h2 * v * v);
  const gu = h1 * u;
  const gv = h2 * v;
  const gx = c * gu - s * gv;
  const gy = s * gu + c * gv;
  return { loss, gx, gy };
}
// #endregion

// #region A saddle with two minima
// L = x^2 / 2 + y^4 / 4 - y^2 / 2. The origin has zero gradient, but the surface curves up along x and down along y: a
// saddle. Minima at (0, 1) and (0, -1), where L = -1/4. Started exactly on the x axis, descent never leaves it.
export function saddleLoss(x, y) {
  const loss = 0.5 * x * x + 0.25 * y * y * y * y - 0.5 * y * y;
  const gx = x;
  const gy = y * y * y - y;
  return { loss, gx, gy };
}
// #endregion

// #region A curved valley
// L = ((1 - x)^2 + 5 (y - x^2)^2) / 10, a Rosenbrock-like valley (Rosenbrock, 1960): the floor follows the parabola
// y = x^2 down to the minimum at (1, 1). The walls are steep and the floor is nearly flat, so a step that suits the walls
// crawls along the floor.
export function valleyLoss(x, y) {
  const rise = y - x * x;
  const loss = ((1 - x) * (1 - x) + 5 * rise * rise) / 10;
  const gx = (-2 * (1 - x) - 20 * x * rise) / 10;
  const gy = (10 * rise) / 10;
  return { loss, gx, gy };
}
// #endregion

// #region Several minima
// L = 0.05 (x^2 + y^2) + 0.5 (2 - cos 2x - cos 2y). A bowl with a cosine ripple: minima near every multiple of pi, and the
// start decides which one descent reaches. The lowest is the origin, where L = 0.
export function minimaLoss(x, y) {
  const loss = 0.05 * (x * x + y * y) + 0.5 * (2 - Math.cos(2 * x) - Math.cos(2 * y));
  const gx = 0.1 * x + Math.sin(2 * x);
  const gy = 0.1 * y + Math.sin(2 * y);
  return { loss, gx, gy };
}
// #endregion

// #region The perceptron's loss
// The lecture's perceptron f(x) = b2 + w2 . tanh(w1 x + b1) on its one example (x = 0.4, y = 0.3), with every weight held at the
// lecture's value except the first hidden unit's w1 (the horizontal axis) and w2 (the vertical axis). The slopes are measured,
// not derived: nudge each weight by h both ways and divide the change in the loss by 2h (a central difference, error of order
// h^2). The lecture's start, (1.0, 0.8), gives f = 0.6132 and the gradient (0.0976, 0.4487).
function perceptronValue(w1, w2) {
  const rest = 0.1 - 0.6 * Math.tanh(-0.4 + 0.5);
  const a = Math.tanh(0.4 * w1 + 0.5);
  const f = rest + w2 * a;
  const error = f - 0.3;
  return error * error;
}

export function perceptronLoss(w1, w2) {
  const h = 1e-5;
  const loss = perceptronValue(w1, w2);
  const gx = (perceptronValue(w1 + h, w2) - perceptronValue(w1 - h, w2)) / (2 * h);
  const gy = (perceptronValue(w1, w2 + h) - perceptronValue(w1, w2 - h)) / (2 * h);
  return { loss, gx, gy };
}
// #endregion

// #region Choosing a surface
// One name picks the surface; the second function measures its curvature by differencing the gradient. A stationary point is
// a minimum when both curvatures (the eigenvalues of the matrix of second derivatives) are positive, and a saddle when
// they differ in sign.
export function lossAt(surface, x, y) {
  if (surface === 'bowl') return quadraticLoss(x, y, 1, 4, 0);
  if (surface === 'ill-conditioned') return quadraticLoss(x, y, 0.5, 10, 0.5);
  if (surface === 'saddle') return saddleLoss(x, y);
  if (surface === 'valley') return valleyLoss(x, y);
  if (surface === 'minima') return minimaLoss(x, y);
  return perceptronLoss(x, y);
}

export function curvatureAt(surface, x, y) {
  const h = 0.001;
  const right = lossAt(surface, x + h, y);
  const left = lossAt(surface, x - h, y);
  const up = lossAt(surface, x, y + h);
  const down = lossAt(surface, x, y - h);
  const hxx = (right.gx - left.gx) / (2 * h);
  const hyy = (up.gy - down.gy) / (2 * h);
  const hxy = (up.gx - down.gx) / (2 * h);
  const mean = 0.5 * (hxx + hyy);
  const spread = Math.sqrt(0.25 * (hxx - hyy) * (hxx - hyy) + hxy * hxy);
  const lambdaMin = mean - spread;
  const lambdaMax = mean + spread;
  return { hxx, hxy, hyy, lambdaMin, lambdaMax };
}
// #endregion

// #region Gradient descent step
// theta <- theta - eta grad L. The gradient points uphill; the step is its negative scaled by the learning rate eta.
export function descentStep(theta, grad, eta) {
  const step = [];
  const next = [];
  for (let i = 0; i < theta.length; i++) {
    step.push(-eta * grad[i]);
    next.push(theta[i] + step[i]);
  }
  return { step, next };
}
// #endregion

// #region Momentum step
// v <- beta v + g, then theta <- theta - eta v. Gradients that agree from step to step add up in v, gradients that alternate
// cancel. With a steady gradient g the velocity grows toward g / (1 - beta), so the steps become 1 / (1 - beta) times longer.
export function momentumStep(theta, vPrev, grad, eta, beta) {
  const v = [];
  const step = [];
  const next = [];
  for (let i = 0; i < theta.length; i++) {
    v.push(beta * vPrev[i] + grad[i]);
    step.push(-eta * v[i]);
    next.push(theta[i] + step[i]);
  }
  return { v, step, next };
}
// #endregion

// #region Adam step
// Adam (Kingma and Ba, 2015) keeps a running average m of the gradient and v of its square, one pair per weight. Both start at
// zero, so the first averages are too small; dividing by 1 - beta^t corrects that (m hat, v hat). The step is eta m hat
// over the root of v hat: at t = 1 it is eta times the sign of the gradient, whatever the gradient's size.
export function adamStep(theta, mPrev, vPrev, grad, t, eta, beta1, beta2, eps) {
  const c1 = 1 - Math.pow(beta1, t);
  const c2 = 1 - Math.pow(beta2, t);
  const m = [];
  const v = [];
  const mHat = [];
  const vHat = [];
  const step = [];
  const next = [];
  for (let i = 0; i < theta.length; i++) {
    m.push(beta1 * mPrev[i] + (1 - beta1) * grad[i]);
    v.push(beta2 * vPrev[i] + (1 - beta2) * grad[i] * grad[i]);
    mHat.push(m[i] / c1);
    vHat.push(v[i] / c2);
    step.push(-eta * mHat[i] / (Math.sqrt(vHat[i]) + eps));
    next.push(theta[i] + step[i]);
  }
  return { m, v, mHat, vHat, step, next, c1, c2 };
}
// #endregion

// #region Running an optimizer
// Repeat: measure the loss and gradient at theta, take one step. kind is "gd", "momentum" or "adam". The run stops early
// when the loss passes LIMIT or is not a number (diverged). vel, m and v are the optimizer's state after the last step.
export function runOptimizer(surface, kind, start, eta, beta, steps) {
  const xs = [];
  const ys = [];
  const losses = [];
  const gxs = [];
  const gys = [];
  let theta = [start[0], start[1]];
  let vel = [0, 0];
  let m = [0, 0];
  let v = [0, 0];
  let diverged = false;
  for (let t = 0; t <= steps; t++) {
    const here = lossAt(surface, theta[0], theta[1]);
    if (!(Math.abs(here.loss) < LIMIT)) {
      diverged = true;
      break;
    }
    xs.push(theta[0]);
    ys.push(theta[1]);
    losses.push(here.loss);
    gxs.push(here.gx);
    gys.push(here.gy);
    if (t === steps) break;
    const grad = [here.gx, here.gy];
    if (kind === 'momentum') {
      const moved = momentumStep(theta, vel, grad, eta, beta);
      vel = moved.v;
      theta = moved.next;
    } else if (kind === 'adam') {
      const moved = adamStep(theta, m, v, grad, t + 1, eta, BETA1, BETA2, EPSILON);
      m = moved.m;
      v = moved.v;
      theta = moved.next;
    } else {
      theta = descentStep(theta, grad, eta).next;
    }
  }
  return { xs, ys, losses, gxs, gys, count: xs.length, diverged, vel, m, v };
}
// #endregion

// #region A small regression
// Line fitting on n points: y = 1.2 x + 0.5 plus noise drawn uniformly from [-0.8, 0.8]. The loss over (w, b) is a quadratic
// bowl, so the whole surface can be drawn and every gradient checked. x runs from 0 to 2, which tilts the bowl.
export function makeRegression(n, seed) {
  const xs = [];
  const ys = [];
  let state = seed;
  for (let i = 0; i < n; i++) {
    const first = nextState(state);
    const second = nextState(first.state);
    state = second.state;
    const x = 2 * first.u;
    xs.push(x);
    ys.push(TRUE_W * x + TRUE_B + 1.6 * (second.u - 0.5));
  }
  return { xs, ys };
}
// #endregion

// #region A minibatch gradient
// The loss is the mean of (w x + b - y)^2 over the examples named in indices. All n indices give the true gradient; a random
// minibatch of them (drawn with replacement, by the integer generator) gives an unbiased estimate of it.
export function allIndices(n) {
  const indices = [];
  for (let i = 0; i < n; i++) indices.push(i);
  return indices;
}

export function minibatchIndices(state, n, size) {
  const indices = [];
  let next = state;
  for (let i = 0; i < size; i++) {
    next = nextState(next).state;
    indices.push(next % n);
  }
  return { indices, state: next };
}

export function regressionGradient(w, b, xs, ys, indices) {
  let sumLoss = 0;
  let sumW = 0;
  let sumB = 0;
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    const error = w * xs[i] + b - ys[i];
    sumLoss += error * error;
    sumW += 2 * error * xs[i];
    sumB += 2 * error;
  }
  const loss = sumLoss / indices.length;
  const gw = sumW / indices.length;
  const gb = sumB / indices.length;
  return { loss, gw, gb };
}
// #endregion

// #region Noise against batch size
// Draw many minibatches of one size and measure how far each gradient lies from the true one (root mean square of the error
// vector). The error of a mean of size independent draws falls as 1 / sqrt(size).
export function gradientNoise(w, b, xs, ys, size, draws, seed) {
  const full = regressionGradient(w, b, xs, ys, allIndices(xs.length));
  let state = seed;
  let sum = 0;
  for (let d = 0; d < draws; d++) {
    const batch = minibatchIndices(state, xs.length, size);
    state = batch.state;
    const g = regressionGradient(w, b, xs, ys, batch.indices);
    const dw = g.gw - full.gw;
    const db = g.gb - full.gb;
    sum += dw * dw + db * db;
  }
  const rms = Math.sqrt(sum / draws);
  return { rms, fullW: full.gw, fullB: full.gb, state };
}

// How many steps make one pass over the data (an epoch), and how many epochs a run of steps amounts to.
export function epochsOf(examples, size, steps) {
  const perEpoch = Math.ceil(examples / size);
  const epochs = (steps * size) / examples;
  return { perEpoch, epochs };
}
// #endregion

// #region A learning-rate schedule
// Warmup raises eta linearly from 0 over the first warmup steps; cosine decay then takes it from eta0 to 0 at step total:
// eta = eta0 (1 + cos(pi progress)) / 2. Weight decay adds lambda theta to the gradient, which shrinks every weight a little
// each step; a weight with no gradient is multiplied by 1 - eta lambda per step.
export function scheduleRate(t, total, eta0, warmup) {
  const ramp = warmup > 0 ? Math.min(1, t / warmup) : 1;
  const span = Math.max(1, total - warmup);
  const progress = Math.min(1, Math.max(0, (t - warmup) / span));
  const cosine = 0.5 * (1 + Math.cos(Math.PI * progress));
  const eta = eta0 * ramp * cosine;
  return { ramp, progress, cosine, eta };
}

export function decayStep(theta, grad, eta, lambda) {
  const step = [];
  const next = [];
  for (let i = 0; i < theta.length; i++) {
    step.push(-eta * (grad[i] + lambda * theta[i]));
    next.push(theta[i] + step[i]);
  }
  return { step, next };
}

export function weightDecayRun(w0, eta, lambda, steps) {
  let theta = [w0];
  for (let t = 0; t < steps; t++) theta = decayStep(theta, [0], eta, lambda).next;
  const w = theta[0];
  const factor = w / w0;
  return { w, factor };
}
// #endregion

// #region Stochastic descent
// Minibatch gradient descent on the regression: each step draws size examples (size 0 uses all of them), takes their gradient,
// and moves by the scheduled eta (or by eta0 when cosine is false). losses is the loss over all the data after each step.
export function runSgd(xs, ys, start, size, eta0, steps, warmup, cosine, seed) {
  const all = allIndices(xs.length);
  const ws = [];
  const bs = [];
  const losses = [];
  const etas = [];
  let theta = [start[0], start[1]];
  let state = seed;
  for (let t = 0; t <= steps; t++) {
    ws.push(theta[0]);
    bs.push(theta[1]);
    losses.push(regressionGradient(theta[0], theta[1], xs, ys, all).loss);
    if (t === steps) break;
    let indices = all;
    if (size > 0) {
      const batch = minibatchIndices(state, xs.length, size);
      state = batch.state;
      indices = batch.indices;
    }
    const g = regressionGradient(theta[0], theta[1], xs, ys, indices);
    const eta = cosine ? scheduleRate(t, steps, eta0, warmup).eta : eta0;
    etas.push(eta);
    theta = descentStep(theta, [g.gw, g.gb], eta).next;
  }
  return { ws, bs, losses, etas };
}
// #endregion

// #region A one-unit network
// One unit with a sine activation, f(x) = sin(w x + b), fit to n points of the wave sin(2.5 x + 0.3) plus noise drawn uniformly
// from [-0.3, 0.3], with x from -1.5 to 1.5. The loss over (w, b) is not a bowl: a slow wave near w = 0.5 is a minimum, and a
// worse one than the right wave near w = 2.5. The slopes are the chain rule: the derivative of (sin z - y)^2 with z = w x + b is
// 2 (sin z - y) cos z, times x for w and times 1 for b.
export const WAVE_W = 2.5;
export const WAVE_B = 0.3;

export function makeWave(n, seed) {
  const xs = [];
  const ys = [];
  let state = seed;
  for (let i = 0; i < n; i++) {
    const first = nextState(state);
    const second = nextState(first.state);
    state = second.state;
    const x = 3 * first.u - 1.5;
    xs.push(x);
    ys.push(Math.sin(WAVE_W * x + WAVE_B) + 0.6 * (second.u - 0.5));
  }
  return { xs, ys };
}

export function waveGradient(w, b, xs, ys, indices) {
  let sumLoss = 0;
  let sumW = 0;
  let sumB = 0;
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    const z = w * xs[i] + b;
    const error = Math.sin(z) - ys[i];
    const slope = 2 * error * Math.cos(z);
    sumLoss += error * error;
    sumW += slope * xs[i];
    sumB += slope;
  }
  const loss = sumLoss / indices.length;
  const gw = sumW / indices.length;
  const gb = sumB / indices.length;
  return { loss, gw, gb };
}
// #endregion

// #region Escaping a minimum
// Stochastic descent on the one-unit network, eta decaying from eta0 to 0 by the cosine schedule. Each step draws size examples
// (size 0 uses all of them), so each step goes downhill on a different surface: the loss of that batch. Those surfaces average to
// the loss over all the data, which losses records after each step. The noise can carry the weights over a ridge that the full
// gradient never crosses; escapeCount repeats a run with runs different seeds and counts the runs that end with a loss below good.
export function runWave(xs, ys, start, size, eta0, steps, seed) {
  const all = allIndices(xs.length);
  const ws = [];
  const bs = [];
  const losses = [];
  const etas = [];
  let theta = [start[0], start[1]];
  let state = seed;
  for (let t = 0; t <= steps; t++) {
    ws.push(theta[0]);
    bs.push(theta[1]);
    losses.push(waveGradient(theta[0], theta[1], xs, ys, all).loss);
    if (t === steps) break;
    let indices = all;
    if (size > 0) {
      const batch = minibatchIndices(state, xs.length, size);
      state = batch.state;
      indices = batch.indices;
    }
    const g = waveGradient(theta[0], theta[1], xs, ys, indices);
    const eta = scheduleRate(t, steps, eta0, 0).eta;
    etas.push(eta);
    theta = descentStep(theta, [g.gw, g.gb], eta).next;
  }
  return { ws, bs, losses, etas };
}

export function runSeed(run) {
  return 1000 + 7919 * run;
}

export function escapeCount(xs, ys, start, size, eta0, steps, runs, good) {
  let escaped = 0;
  for (let r = 0; r < runs; r++) {
    const result = runWave(xs, ys, start, size, eta0, steps, runSeed(r));
    if (result.losses[steps] < good) escaped++;
  }
  return { escaped, runs };
}
// #endregion
