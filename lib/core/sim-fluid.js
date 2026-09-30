// sim-fluid.js: a 2D SPH (smoothed particle hydrodynamics) fluid, after Mueller, Charypar and Gross,
// "Particle-Based Fluid Simulation for Interactive Applications" (SCA 2003), in its 2D form.
//   density     rho_i = sum_j m W_poly6(|x_i - x_j|)
//   pressure    p_i = k (rho_i - rho0), clamped at 0 (the fluid pushes, it does not pull)
//   forces      pressure: -sum_j m (p_i + p_j) / (2 rho_j) grad W_spiky
//               viscosity: mu sum_j m (v_j - v_i) / rho_j lap W_visc
//               gravity:   rho_i g
//   step        a_i = f_i / rho_i; v += dt a; x += dt v (semi-implicit Euler), fixed dt
// Neighbors come from a uniform grid of cell size H, so each particle scans 9 cells, not every particle.
// Units: lengths in pixels of the box (the demo draws 1:1), time in seconds, g = 981 px/s^2
// (a box 800 px wide is 8 m at 100 px per meter). Stiffness k is set from a chosen speed of sound c
// (k = c^2), and the time step from the CFL condition dt <= 0.4 H / c.

export const SP = 8;                  // particle spacing at rest
export const H = 2 * SP;              // kernel radius: on the rest lattice, 8 neighbors plus itself
const HSQ = H * H;
export const MASS = 1;
export const G = -981;
const POLY6 = 4 / (Math.PI * Math.pow(H, 8));          // W = POLY6 (H^2 - r^2)^3, integrates to 1 in 2D
const SPIKY = 30 / (Math.PI * Math.pow(H, 5));         // |dW/dr| = SPIKY (H - r)^2 for W = 10/(pi H^5)(H - r)^3
const VISC_LAP = 40 / (Math.PI * Math.pow(H, 5));      // lap W = VISC_LAP (H - r)
const WALL_DAMP = 0.3;

export const wPoly6 = (r2) => (r2 < HSQ ? POLY6 * Math.pow(HSQ - r2, 3) : 0);

// the rest density: the density a particle sees inside a square lattice of spacing SP
export const REST_DENS = (() => {
  let d = 0;
  for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) d += MASS * wPoly6((a * SP) ** 2 + (b * SP) ** 2);
  return d;
})();

export function makeFluid({
  width = 800, height = 600, count = 900, layout = 'dam', sound = 1800, visc = 2.5, cohesion = 0.05, seed = 5,
} = {}) {
  const n = count;
  const x = new Float64Array(2 * n), v = new Float64Array(2 * n), f = new Float64Array(2 * n);
  const rho = new Float64Array(n), p = new Float64Array(n);
  let s = seed; const jitter = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5) * 0.3;
  const x0 = H * 0.6;
  if (layout === 'dam') {
    // a block of fluid against the left wall, twice as tall as wide
    const cols = Math.max(1, Math.round(Math.sqrt(n / 2)));
    for (let i = 0; i < n; i++) {
      x[2 * i] = x0 + (i % cols) * SP + jitter();
      x[2 * i + 1] = x0 + Math.floor(i / cols) * SP + jitter();
    }
  } else {
    // 'drop': a pool across the floor and a round drop above it, already falling
    const pool = Math.floor(n * 0.62);
    const cols = Math.floor((width - 2 * x0) / SP);
    for (let i = 0; i < pool; i++) {
      x[2 * i] = x0 + (i % cols) * SP + jitter();
      x[2 * i + 1] = x0 + Math.floor(i / cols) * SP + jitter();
    }
    let k = pool;
    const R = Math.sqrt((n - pool) / Math.PI) * SP * 1.02;
    for (let yy = -R; yy <= R && k < n; yy += SP) for (let xx = -R; xx <= R && k < n; xx += SP) {
      if (xx * xx + yy * yy > R * R) continue;
      x[2 * k] = width * 0.5 + xx + jitter(); x[2 * k + 1] = height * 0.66 + yy + jitter();
      v[2 * k + 1] = -500; k++;
    }
    for (; k < n; k++) { x[2 * k] = width * 0.5 + jitter() * 40; x[2 * k + 1] = height * 0.66 + R + SP; v[2 * k + 1] = -500; }
  }

  const params = { sound, visc, cohesion, width, height };
  const cols = Math.ceil(width / H) + 1, rows = Math.ceil(height / H) + 1;
  const head = new Int32Array(cols * rows), next = new Int32Array(n);
  const nbr = new Int32Array(n * 64), nbrCount = new Int32Array(n);

  function neighbors() {
    head.fill(-1);
    for (let i = 0; i < n; i++) {
      const cx = Math.min(cols - 1, Math.max(0, Math.floor(x[2 * i] / H)));
      const cy = Math.min(rows - 1, Math.max(0, Math.floor(x[2 * i + 1] / H)));
      const c = cy * cols + cx;
      next[i] = head[c]; head[c] = i;
    }
    for (let i = 0; i < n; i++) {
      let m = 0;
      const cx = Math.floor(x[2 * i] / H), cy = Math.floor(x[2 * i + 1] / H);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const gx = cx + dx, gy = cy + dy;
        if (gx < 0 || gy < 0 || gx >= cols || gy >= rows) continue;
        for (let j = head[gy * cols + gx]; j !== -1; j = next[j]) {
          const rx = x[2 * j] - x[2 * i], ry = x[2 * j + 1] - x[2 * i + 1];
          if (rx * rx + ry * ry < HSQ && m < 64) nbr[i * 64 + m++] = j;
        }
      }
      nbrCount[i] = m;
    }
  }

  function density() {
    const k = params.sound * params.sound;
    for (let i = 0; i < n; i++) {
      let d = 0;
      for (let q = 0; q < nbrCount[i]; q++) {
        const j = nbr[i * 64 + q];
        const rx = x[2 * j] - x[2 * i], ry = x[2 * j + 1] - x[2 * i + 1];
        d += MASS * wPoly6(rx * rx + ry * ry);
      }
      rho[i] = d;
      // k (rho - rho0) / rho0, i.e. c^2 per unit of relative density; a little negative pressure
      // (params.cohesion) holds the surface together, more would clump the particles
      p[i] = Math.max(-params.cohesion * k, (k * (d - REST_DENS)) / REST_DENS);
    }
  }

  function forces() {
    const mu = params.visc;
    for (let i = 0; i < n; i++) {
      let fx = 0, fy = 0;
      for (let q = 0; q < nbrCount[i]; q++) {
        const j = nbr[i * 64 + q];
        if (j === i) continue;
        const rx = x[2 * j] - x[2 * i], ry = x[2 * j + 1] - x[2 * i + 1];
        const r = Math.hypot(rx, ry);
        if (r < 1e-9) continue;
        // pressure: pushes i away from j (along -r) in proportion to the pair's mean pressure
        const fp = (MASS * (p[i] + p[j])) / (2 * rho[j]) * SPIKY * (H - r) * (H - r) * rho[i];
        fx -= (fp * rx) / r; fy -= (fp * ry) / r;
        // viscosity: pulls i's velocity toward its neighbors'
        const fv = (mu * MASS) / rho[j] * VISC_LAP * (H - r) * rho[i] * H * H;
        fx += fv * (v[2 * j] - v[2 * i]); fy += fv * (v[2 * j + 1] - v[2 * i + 1]);
      }
      f[2 * i] = fx;
      f[2 * i + 1] = fy + rho[i] * G;
    }
  }

  function integrate(dt) {
    const { width: W, height: Hh } = params, lo = SP * 0.5;
    for (let i = 0; i < n; i++) {
      v[2 * i] += (dt * f[2 * i]) / rho[i];
      v[2 * i + 1] += (dt * f[2 * i + 1]) / rho[i];
      x[2 * i] += dt * v[2 * i];
      x[2 * i + 1] += dt * v[2 * i + 1];
      if (x[2 * i] < lo) { x[2 * i] = lo; v[2 * i] *= -WALL_DAMP; }
      if (x[2 * i] > W - lo) { x[2 * i] = W - lo; v[2 * i] *= -WALL_DAMP; }
      if (x[2 * i + 1] < lo) { x[2 * i + 1] = lo; v[2 * i + 1] *= -WALL_DAMP; }
      if (x[2 * i + 1] > Hh - lo) { x[2 * i + 1] = Hh - lo; v[2 * i + 1] *= -WALL_DAMP; }
    }
  }

  let time = 0, exploded = false;
  const dtCFL = () => (0.4 * H) / params.sound;
  function step(steps = 1) {
    const dt = dtCFL();
    for (let s2 = 0; s2 < steps && !exploded; s2++) {
      neighbors(); density(); forces(); integrate(dt); time += dt;
    }
    for (let i = 0; i < 2 * n; i++) if (!Number.isFinite(x[i])) { exploded = true; break; }
  }
  function stats() {
    let maxRho = 0, sumRho = 0, maxV = 0;
    for (let i = 0; i < n; i++) {
      maxRho = Math.max(maxRho, rho[i]); sumRho += rho[i];
      maxV = Math.max(maxV, Math.hypot(v[2 * i], v[2 * i + 1]));
    }
    return { meanRho: sumRho / n, maxRho, maxV, maxErr: maxRho / REST_DENS - 1, time, exploded, dt: dtCFL() };
  }
  return { n, x, v, rho, p, params, step, stats, dtCFL, get time() { return time; }, get exploded() { return exploded; } };
}
