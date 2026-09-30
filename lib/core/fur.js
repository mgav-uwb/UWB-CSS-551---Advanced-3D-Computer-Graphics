// fur.js: strand fur, pure functions (no DOM, no three.js), shared by the fur demo and its tests.
//
//   sampleHairRoots(mesh, count, seed)   area-weighted, deterministic roots on a triangle mesh
//   growHairs(roots, opts, seed)         each hair a polyline of `segments` segments: returns
//                                        positions, per-vertex unit tangents, per-vertex `along`
//                                        (0 at the root, 1 at the tip) and line-segment indices
//   kajiyaKay(T, L, V, p)                the Kajiya-Kay hair terms for unit tangent T, light L, view V
//
// A mesh is { positions: Float32Array (3 per vertex), normals: Float32Array, indices: Uint32Array
// or null (then every three vertices are a triangle) }.

// Park-Miller minimal standard generator: small, fast, and the same sequence in node and the browser
export function makeRng(seed = 1) {
  let s = (Math.floor(Math.abs(seed)) % 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const tri = (mesh, t) => {
  const I = mesh.indices;
  return I ? [I[3 * t], I[3 * t + 1], I[3 * t + 2]] : [3 * t, 3 * t + 1, 3 * t + 2];
};

// Roots: pick a triangle with probability proportional to its area (binary search in the cumulative
// areas), then a uniform point in it (fold the unit square onto the triangle). Returns the point,
// the interpolated unit normal, the triangle, and the barycentric weights (w0, w1, w2).
export function sampleHairRoots(mesh, count, seed = 1) {
  const P = mesh.positions, N = mesh.normals;
  const T = mesh.indices ? mesh.indices.length / 3 : P.length / 9;
  const cdf = new Float64Array(T);
  let acc = 0;
  for (let t = 0; t < T; t++) {
    const [a, b, c] = tri(mesh, t);
    const ux = P[3 * b] - P[3 * a], uy = P[3 * b + 1] - P[3 * a + 1], uz = P[3 * b + 2] - P[3 * a + 2];
    const vx = P[3 * c] - P[3 * a], vy = P[3 * c + 1] - P[3 * a + 1], vz = P[3 * c + 2] - P[3 * a + 2];
    acc += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
    cdf[t] = acc;
  }
  const rnd = makeRng(seed);
  const p = new Float32Array(3 * count), n = new Float32Array(3 * count);
  const triOf = new Uint32Array(count), bary = new Float32Array(3 * count);
  for (let h = 0; h < count; h++) {
    const r = rnd() * acc;
    let lo = 0, hi = T - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid; }
    let u = rnd(), v = rnd();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const w = [1 - u - v, u, v];
    const idx = tri(mesh, lo);
    let nx = 0, ny = 0, nz = 0;
    for (let k = 0; k < 3; k++) {
      const i = idx[k];
      p[3 * h] += w[k] * P[3 * i]; p[3 * h + 1] += w[k] * P[3 * i + 1]; p[3 * h + 2] += w[k] * P[3 * i + 2];
      nx += w[k] * N[3 * i]; ny += w[k] * N[3 * i + 1]; nz += w[k] * N[3 * i + 2];
    }
    const nl = Math.hypot(nx, ny, nz) || 1;
    n[3 * h] = nx / nl; n[3 * h + 1] = ny / nl; n[3 * h + 2] = nz / nl;
    triOf[h] = lo;
    bary[3 * h] = w[0]; bary[3 * h + 1] = w[1]; bary[3 * h + 2] = w[2];
  }
  return { count, p, n, tri: triOf, bary };
}

// Growth: start along the root normal, perturbed by `jitter`; each segment bends the direction by
// gravity (toward -y) and curls it about the root normal (d += curl · (n × d)), then renormalizes.
// Segment length is length/segments times a per-hair factor in [1 - lengthJitter, 1 + lengthJitter].
export function growHairs(roots, {
  segments = 5, length = 0.05, lengthJitter = 0.4, gravity = 0.22, curl = 0, jitter = 0.9,
} = {}, seed = 2) {
  const H = roots.count, S = segments, V = S + 1;
  const position = new Float32Array(3 * H * V), tangent = new Float32Array(3 * H * V);
  const along = new Float32Array(H * V);
  const index = new Uint32Array(2 * H * S);
  const rnd = makeRng(seed);
  for (let h = 0; h < H; h++) {
    const nx = roots.n[3 * h], ny = roots.n[3 * h + 1], nz = roots.n[3 * h + 2];
    let dx = nx + jitter * (rnd() - 0.5), dy = ny + jitter * (rnd() - 0.5), dz = nz + jitter * (rnd() - 0.5);
    let dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
    const seg = (length / S) * (1 + lengthJitter * (2 * rnd() - 1));
    let x = roots.p[3 * h], y = roots.p[3 * h + 1], z = roots.p[3 * h + 2];
    const base = h * V;
    position[3 * base] = x; position[3 * base + 1] = y; position[3 * base + 2] = z;
    for (let s = 0; s < S; s++) {
      dy -= gravity;
      if (curl) {
        const cx = ny * dz - nz * dy, cy = nz * dx - nx * dz, cz = nx * dy - ny * dx;
        dx += curl * cx; dy += curl * cy; dz += curl * cz;
      }
      dl = Math.hypot(dx, dy, dz) || 1; dx /= dl; dy /= dl; dz /= dl;
      x += seg * dx; y += seg * dy; z += seg * dz;
      const vi = base + s + 1;
      position[3 * vi] = x; position[3 * vi + 1] = y; position[3 * vi + 2] = z;
      // the tangent of segment s belongs to its end vertex; the root takes the first segment's
      tangent[3 * vi] = dx; tangent[3 * vi + 1] = dy; tangent[3 * vi + 2] = dz;
      if (s === 0) { tangent[3 * base] = dx; tangent[3 * base + 1] = dy; tangent[3 * base + 2] = dz; }
      index[2 * (h * S + s)] = base + s; index[2 * (h * S + s) + 1] = base + s + 1;
    }
    for (let s = 0; s <= S; s++) along[base + s] = s / S;
  }
  return { hairs: H, segments: S, vertices: H * V, position, tangent, along, index };
}

// Kajiya and Kay (1989): a hair is a thin cylinder, so it has a tangent, not a normal.
//   diffuse  = sin(T, L) = √(1 − (T·L)²)
//   specular = ((T·L)(T·V) + sin(T, L) sin(T, V))^p, the cosine of the angle between the view and
//              the cone of mirror directions around the hair (clamped at 0)
export function kajiyaKay(T, L, V, p) {
  const tl = T[0] * L[0] + T[1] * L[1] + T[2] * L[2];
  const tv = T[0] * V[0] + T[1] * V[1] + T[2] * V[2];
  const sinL = Math.sqrt(Math.max(0, 1 - tl * tl)), sinV = Math.sqrt(Math.max(0, 1 - tv * tv));
  return { diffuse: sinL, specular: Math.pow(Math.max(0, tl * tv + sinL * sinV), p) };
}
