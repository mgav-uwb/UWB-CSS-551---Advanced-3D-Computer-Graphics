// sim-cloth.js: particle physics for the course's simulation topic and demos. One particle system,
// two ways to hold particles together:
//   'springs'      Hooke springs integrated by semi-implicit (symplectic) Euler: force, then velocity,
//                  then position. Stiff springs need small steps (stable only while h * omega < 2).
//   'constraints'  XPBD distance constraints (Macklin, Mueller and Chentanez 2016), solved once per
//                  substep ("small steps", Macklin et al. 2019). Stiffness enters as compliance 1/k,
//                  so the same k means the same material, and no k makes the step explode.
// The cloth is a grid of particles with structural, shear and bending links; the same system also
// builds rigid clusters (a cube as 8 particles and 28 links) and hair (chains pinned at a root).
// Colliders: one sphere and the floor plane y = floorY. Units: meters, kilograms, seconds.

export const GRAVITY = -9.81;

// ---- one spring, one particle: the worked example of the topic ----------------------------------
// x is the displacement from rest, v the velocity; a = -k x / m.
export function springStep1D(x, v, { k, m, h, method = 'semi-implicit' }) {
  const a = (-k * x) / m;
  if (method === 'explicit') return { x: x + h * v, v: v + h * a };        // both from the old state
  const v1 = v + h * a;                                                    // velocity first
  return { x: x + h * v1, v: v1 };                                         // then position with it
}
export const springEnergy = (x, v, k, m) => 0.5 * m * v * v + 0.5 * k * x * x;

// ---- the particle system ---------------------------------------------------------------------
export class ParticleSystem {
  constructor(count) {
    this.n = count;
    this.x = new Float64Array(3 * count);     // positions
    this.p = new Float64Array(3 * count);     // positions at the start of the substep
    this.v = new Float64Array(3 * count);     // velocities
    this.f = new Float64Array(3 * count);     // force accumulator (springs mode)
    this.w = new Float64Array(count).fill(1); // inverse masses (0 = pinned)
    this.cn = new Float64Array(3 * count);    // contact normal of the last collision pass (0 = no contact)
    this.links = [];                          // { i, j, rest, kind }
    this.time = 0;
    this.exploded = false;
  }
  setMass(m) { for (let i = 0; i < this.n; i++) if (this.w[i] !== 0) this.w[i] = 1 / m; }
  pin(i) { this.w[i] = 0; }
  link(i, j, kind = 'structural') {
    const dx = this.x[3 * j] - this.x[3 * i], dy = this.x[3 * j + 1] - this.x[3 * i + 1], dz = this.x[3 * j + 2] - this.x[3 * i + 2];
    this.links.push({ i, j, rest: Math.hypot(dx, dy, dz), kind, lambda: 0 });
  }

  // one frame of length dt, split into `substeps` steps
  step(dt, {
    method = 'constraints', k = 800, damping = 0.4, substeps = 8,
    gravity = GRAVITY, wind = null, sphere = null, floorY = -Infinity, friction = 0.5, stiffBend = 0.2,
    iterations = 2,
  } = {}) {
    if (this.exploded) return;
    const h = dt / substeps;
    for (let s = 0; s < substeps; s++) {
      if (method === 'springs') {
        this._springSubstep(h, { k, damping, gravity, wind, stiffBend });
        this._collide(sphere, floorY, friction, method);
      } else {
        this._xpbdSubstep(h, { k, damping, gravity, wind, stiffBend, iterations, sphere, floorY, friction });
      }
      this.time += h;
    }
    for (let i = 0; i < 3 * this.n; i++) {
      if (!Number.isFinite(this.x[i]) || Math.abs(this.x[i]) > 50) { this.exploded = true; break; }
    }
  }

  _external(i, gravity, wind, out) {
    out[0] = 0; out[1] = gravity; out[2] = 0;
    if (wind) { const a = wind(this.time, i, this.x); out[0] += a[0]; out[1] += a[1]; out[2] += a[2]; }
  }

  _springSubstep(h, { k, damping, gravity, wind, stiffBend }) {
    const { x, v, f, w, n } = this;
    const acc = [0, 0, 0];
    f.fill(0);
    for (const L of this.links) {
      const { i, j } = L, ks = L.kind === 'bend' ? k * stiffBend : k;
      const dx = x[3 * j] - x[3 * i], dy = x[3 * j + 1] - x[3 * i + 1], dz = x[3 * j + 2] - x[3 * i + 2];
      const len = Math.hypot(dx, dy, dz) || 1e-12, ux = dx / len, uy = dy / len, uz = dz / len;
      const rv = (v[3 * j] - v[3 * i]) * ux + (v[3 * j + 1] - v[3 * i + 1]) * uy + (v[3 * j + 2] - v[3 * i + 2]) * uz;
      // Hooke plus 2 % of critical damping along the spring (c = 0.04 sqrt(k m)); a fixed damping
      // coefficient would itself go unstable on light particles
      const m = 1 / Math.max(w[i], w[j], 1e-12);
      const mag = ks * (len - L.rest) + 0.04 * Math.sqrt(ks * m) * rv;
      f[3 * i] += mag * ux; f[3 * i + 1] += mag * uy; f[3 * i + 2] += mag * uz;
      f[3 * j] -= mag * ux; f[3 * j + 1] -= mag * uy; f[3 * j + 2] -= mag * uz;
    }
    const keep = Math.max(0, 1 - damping * h);                // the same air drag as the constraints path
    for (let i = 0; i < n; i++) {
      if (w[i] === 0) continue;
      this._external(i, gravity, wind, acc);
      for (let c = 0; c < 3; c++) {
        v[3 * i + c] = keep * (v[3 * i + c] + h * (acc[c] + w[i] * f[3 * i + c]));   // semi-implicit Euler: velocity first
        this.p[3 * i + c] = x[3 * i + c];
        x[3 * i + c] += h * v[3 * i + c];                     // then position with the new velocity
      }
    }
  }

  _xpbdSubstep(h, { k, damping, gravity, wind, stiffBend, iterations, sphere, floorY, friction }) {
    const { x, p, v, w, n } = this;
    const acc = [0, 0, 0];
    // 1. predict: move every free particle by its velocity, after external forces
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < 3; c++) p[3 * i + c] = x[3 * i + c];
      if (w[i] === 0) continue;
      this._external(i, gravity, wind, acc);
      for (let c = 0; c < 3; c++) { v[3 * i + c] += h * acc[c]; x[3 * i + c] += h * v[3 * i + c]; }
    }
    // 2. contacts first (with friction), so the links then solve around them
    this._collide(sphere, floorY, friction, 'constraints');
    // 3. the links: XPBD, lambda accumulated over the iterations of this substep
    for (const L of this.links) L.lambda = 0;
    for (let it = 0; it < iterations; it++) {
      for (const L of this.links) {
        const { i, j } = L, wsum = w[i] + w[j];
        if (wsum === 0) continue;
        const kk = L.kind === 'bend' ? k * stiffBend : k;
        if (!(kk > 0)) continue;                                              // zero stiffness: no constraint
        const alpha = 1 / (kk * h * h);                                        // compliance / h^2
        const dx = x[3 * j] - x[3 * i], dy = x[3 * j + 1] - x[3 * i + 1], dz = x[3 * j + 2] - x[3 * i + 2];
        const len = Math.hypot(dx, dy, dz) || 1e-12;
        const C = len - L.rest;
        const dl = (-C - alpha * L.lambda) / (wsum + alpha);
        L.lambda += dl;
        const ux = dx / len, uy = dy / len, uz = dz / len;
        x[3 * i] -= w[i] * dl * ux; x[3 * i + 1] -= w[i] * dl * uy; x[3 * i + 2] -= w[i] * dl * uz;
        x[3 * j] += w[j] * dl * ux; x[3 * j + 1] += w[j] * dl * uy; x[3 * j + 2] += w[j] * dl * uz;
      }
    }
    // 4. contacts again, without friction, so no particle ends inside an obstacle
    this._collide(sphere, floorY, 0, 'constraints');
    // 5. velocities from the positions actually reached
    const keep = Math.max(0, 1 - damping * h);
    const cn = this.cn;
    for (let i = 0; i < n; i++) {
      if (w[i] === 0) { for (let c = 0; c < 3; c++) v[3 * i + c] = 0; continue; }
      for (let c = 0; c < 3; c++) v[3 * i + c] = ((x[3 * i + c] - p[3 * i + c]) / h) * keep;
      // a contact push out of an obstacle is a position fix, not a launch: drop the outward normal
      // velocity it would otherwise turn into (inelastic contact; without this, a 1 cm push at
      // h = 1/960 s reads as about 10 m/s and fine cloth pumps energy until it explodes)
      const nx = cn[3 * i], ny = cn[3 * i + 1], nz = cn[3 * i + 2];
      if (nx || ny || nz) {
        const vn = v[3 * i] * nx + v[3 * i + 1] * ny + v[3 * i + 2] * nz;
        if (vn > 0) { v[3 * i] -= vn * nx; v[3 * i + 1] -= vn * ny; v[3 * i + 2] -= vn * nz; }
      }
    }
  }

  _collide(sphere, floorY, friction, method) {
    const { x, p, v, w, n, cn } = this;
    cn.fill(0);
    // friction in the constraints path: keep only part of this substep's tangential motion
    const tangentFriction = (i, nx, ny, nz, mu) => {
      if (!mu) return;
      const dx = x[3 * i] - p[3 * i], dy = x[3 * i + 1] - p[3 * i + 1], dz = x[3 * i + 2] - p[3 * i + 2];
      const dn = dx * nx + dy * ny + dz * nz;
      const tx = dx - dn * nx, ty = dy - dn * ny, tz = dz - dn * nz;
      x[3 * i] -= mu * tx; x[3 * i + 1] -= mu * ty; x[3 * i + 2] -= mu * tz;
    };
    for (let i = 0; i < n; i++) {
      if (w[i] === 0) continue;
      if (sphere) {
        const r = sphere.r + (sphere.skin ?? 0.01);
        const dx = x[3 * i] - sphere.c[0], dy = x[3 * i + 1] - sphere.c[1], dz = x[3 * i + 2] - sphere.c[2];
        const d = Math.hypot(dx, dy, dz);
        if (d < r && d > 1e-9) {
          const nx = dx / d, ny = dy / d, nz = dz / d;
          x[3 * i] = sphere.c[0] + nx * r; x[3 * i + 1] = sphere.c[1] + ny * r; x[3 * i + 2] = sphere.c[2] + nz * r;
          cn[3 * i] = nx; cn[3 * i + 1] = ny; cn[3 * i + 2] = nz;
          if (method === 'springs') {
            const vn = v[3 * i] * nx + v[3 * i + 1] * ny + v[3 * i + 2] * nz;
            if (vn < 0) { v[3 * i] -= vn * nx; v[3 * i + 1] -= vn * ny; v[3 * i + 2] -= vn * nz; }
            for (let c = 0; c < 3; c++) v[3 * i + c] *= 1 - friction * 0.2;
          } else {
            tangentFriction(i, nx, ny, nz, friction * 0.5);
          }
        }
      }
      if (x[3 * i + 1] < floorY) {
        x[3 * i + 1] = floorY;
        cn[3 * i] = 0; cn[3 * i + 1] = 1; cn[3 * i + 2] = 0;
        if (method === 'springs') {
          if (v[3 * i + 1] < 0) v[3 * i + 1] = 0;
          v[3 * i] *= 1 - friction; v[3 * i + 2] *= 1 - friction;
        } else {
          tangentFriction(i, 0, 1, 0, friction);
        }
      }
    }
  }

  kineticEnergy() {
    let e = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.w[i] === 0) continue;
      const vx = this.v[3 * i], vy = this.v[3 * i + 1], vz = this.v[3 * i + 2];
      e += 0.5 * (vx * vx + vy * vy + vz * vz) / this.w[i];
    }
    return e;
  }

  // the largest relative stretch over the structural links (0.05 = 5 % longer than rest)
  maxStretch(kind = 'structural') {
    let m = 0;
    for (const L of this.links) {
      if (L.kind !== kind) continue;
      const { i, j } = L;
      const len = Math.hypot(this.x[3 * j] - this.x[3 * i], this.x[3 * j + 1] - this.x[3 * i + 1], this.x[3 * j + 2] - this.x[3 * i + 2]);
      m = Math.max(m, len / L.rest - 1);
    }
    return m;
  }
}

// ---- cloth: an n x n grid, horizontal at height y0 ------------------------------------------
// pin: 'corners' (two far corners), 'edge' (the whole far edge), 'none'
export function makeCloth({ n = 24, size = 1.2, y0 = 0.9, mass = 0.3, pin = 'corners', center = [0, 0] } = {}) {
  const sys = new ParticleSystem(n * n);
  const id = (r, c) => r * n + c;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const i = id(r, c);
    sys.x[3 * i] = center[0] + (c / (n - 1) - 0.5) * size;
    sys.x[3 * i + 1] = y0 + 0.002 * Math.sin(r * 1.3 + c * 0.7);   // a tiny ripple breaks symmetry
    sys.x[3 * i + 2] = center[1] + (r / (n - 1) - 0.5) * size;
  }
  sys.setMass(mass / (n * n));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (c + 1 < n) sys.link(id(r, c), id(r, c + 1), 'structural');
    if (r + 1 < n) sys.link(id(r, c), id(r + 1, c), 'structural');
    if (r + 1 < n && c + 1 < n) { sys.link(id(r, c), id(r + 1, c + 1), 'shear'); sys.link(id(r, c + 1), id(r + 1, c), 'shear'); }
    if (c + 2 < n) sys.link(id(r, c), id(r, c + 2), 'bend');
    if (r + 2 < n) sys.link(id(r, c), id(r + 2, c), 'bend');
  }
  if (pin === 'corners') { sys.pin(id(0, 0)); sys.pin(id(0, n - 1)); }
  if (pin === 'edge') for (let c = 0; c < n; c++) sys.pin(id(0, c));
  // triangle indices for rendering: two per grid cell
  const tris = [];
  for (let r = 0; r + 1 < n; r++) for (let c = 0; c + 1 < n; c++) {
    tris.push(id(r, c), id(r + 1, c), id(r, c + 1), id(r, c + 1), id(r + 1, c), id(r + 1, c + 1));
  }
  return { sys, n, tris };
}

// ---- rigid clusters: a cube as 8 particles held by all 28 pairwise links ---------------------
export function addCube(sys, base, { center, size, yaw = 0, pitch = 0 }) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
  let k = 0;
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const c of [-1, 1]) {
    let px = (a * size) / 2, py = (b * size) / 2, pz = (c * size) / 2;
    [py, pz] = [py * cp - pz * sp, py * sp + pz * cp];          // pitch about x
    [px, pz] = [px * cy + pz * sy, -px * sy + pz * cy];         // yaw about y
    const i = base + k++;
    sys.x[3 * i] = center[0] + px; sys.x[3 * i + 1] = center[1] + py; sys.x[3 * i + 2] = center[2] + pz;
  }
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) sys.link(base + i, base + j, 'structural');
  return base + 8;
}

// ---- hair: strands of `seg` links rooted on a sphere --------------------------------------
export function makeHair({ strands = 60, seg = 14, len = 0.7, head = { c: [0, 0, 0], r: 0.35 }, seed = 3, back = false } = {}) {
  const sys = new ParticleSystem(strands * (seg + 1));
  let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const roots = [];
  for (let k = 0; k < strands; k++) {
    // roots over the top of the head (polar angle up to 0.7 pi), or only its back half (z < 0)
    const th = (0.08 + (back ? 0.47 : 0.62) * rnd()) * Math.PI;
    const ph = back ? Math.PI * (1.05 + 0.9 * rnd()) : 2 * Math.PI * rnd();
    const nx = Math.sin(th) * Math.cos(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.sin(ph);
    roots.push([nx, ny, nz]);
    for (let q = 0; q <= seg; q++) {
      const i = k * (seg + 1) + q, t = (q / seg) * len;
      sys.x[3 * i] = head.c[0] + nx * (head.r + t);
      sys.x[3 * i + 1] = head.c[1] + ny * (head.r + t);
      sys.x[3 * i + 2] = head.c[2] + nz * (head.r + t);
      if (q === 0) sys.pin(i); else sys.link(i - 1, i, 'structural');
      if (q >= 2) sys.link(i - 2, i, 'bend');
    }
  }
  sys.setMass(0.0005);
  return { sys, strands, seg, roots };
}
