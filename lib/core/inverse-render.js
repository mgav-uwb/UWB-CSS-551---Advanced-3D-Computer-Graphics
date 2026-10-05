// inverse-render: a tiny differentiable renderer and its optimizer, shared by
// lib/demos/inverse-render.js, lib/tests/inverse-render.test.mjs and
// tools/gen-textbook-figures-inverse.mjs. No DOM, no dependencies.
//
// Scene: one sphere seen by an orthographic camera looking down -z, image
// plane [-1, 1]², n × n pixels sampled at their centers, one directional light
// of intensity E. Parameters (the vector the optimizer moves):
//   p = [albedoR, albedoG, albedoB, lightAz, lightEl, radius, cx, cy]
// Pixel color:  P = a·S + (1 − a)·BG
//   a  = coverage: hard, a = [d < r]; soft, a = σ((r − d)/s) (Liu et al. 2019),
//        s chosen so a rises from 0.1 to 0.9 over w pixels
//   S  = shading:  flat, S = albedo;  lambert, S = albedo·(ka + E·max(0, n·l));
//                  blinn, lambert + KS·E·max(0, n·h)^SHININESS (white highlight)
//   n  = the sphere's normal at the pixel (inside), or the silhouette normal
//        (dx, dy, 0)/d outside, so a soft edge's outer band stays continuous.
// Loss: mean squared error over the 3n² color values.
// Gradients are written by hand (chain rule per pixel) and checked against
// central finite differences in lib/tests/inverse-render.test.mjs.

export const PARAM_NAMES = ['albedo R', 'albedo G', 'albedo B', 'light az', 'light el', 'radius', 'center x', 'center y'];
export const TRUE_PARAMS = [0.85, 0.35, 0.20, 0.70, 0.45, 0.62, 0.08, -0.06];
export const START_PARAMS = [0.50, 0.50, 0.50, -0.50, 0.00, 0.42, -0.12, 0.10];
export const BG = [0.10, 0.12, 0.16];
export const KA = 0.08;
export const KS = 0.35;
export const SHININESS = 24;
export const LO = [0, 0, 0, -1.5, -1.3, 0.15, -0.5, -0.5];
export const HI = [1, 1, 1, 1.5, 1.3, 0.95, 0.5, 0.5];

export const DEFAULTS = { n: 64, edge: 'hard', w: 1.5, shading: 'lambert', intensity: 1, ka: KA };

export function lightDir(az, el) {
  const ce = Math.cos(el);
  return [ce * Math.sin(az), Math.sin(el), ce * Math.cos(az)];
}

const sigmoid = (u) => 1 / (1 + Math.exp(-u));

// Shade one point (pixel center or subsample) and, if `g` is given, add the
// chain-rule terms of dL/dp into it. gc = dL/dP per channel (length 3).
function shadePoint(p, x, y, o, gc, g, mapR, k) {
  const [ar, ag, ab, az, el, r, cx, cy] = p;
  const alb = [ar, ag, ab];
  const E = o.intensity, ka = o.ka;
  const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy, d = Math.sqrt(d2);
  const inside = d2 < r * r;
  // coverage and its derivatives
  let a, daR = 0, daX = 0, daY = 0;
  if (o.edge === 'hard') {
    a = inside ? 1 : 0;
  } else {
    // w is the 10-to-90 % width of the edge in pixels: σ goes from 0.1 to
    // 0.9 over 2·ln 9 ≈ 4.39 of its argument's units.
    const ww = (o.w * 2) / o.n / (2 * Math.log(9));
    a = sigmoid((r - d) / ww);
    const s = (a * (1 - a)) / ww;
    daR = s;
    if (d > 1e-12) { daX = (s * dx) / d; daY = (s * dy) / d; }
    if (a < 1e-7) a = 0;
  }
  const out = [BG[0], BG[1], BG[2]];
  if (a === 0) return out;
  // normal and its derivatives (rows: d n / d r, d n / d cx, d n / d cy)
  let nx, ny, nz, dnR, dnX, dnY;
  if (inside) {
    const z = Math.sqrt(Math.max(r * r - d2, 1e-10));
    nx = dx / r; ny = dy / r; nz = z / r;
    dnR = [-dx / (r * r), -dy / (r * r), d2 / (z * r * r)];
    dnX = [-1 / r, 0, dx / (z * r)];
    dnY = [0, -1 / r, dy / (z * r)];
  } else {
    const dd = Math.max(d, 1e-12), d3 = dd * dd * dd;
    nx = dx / dd; ny = dy / dd; nz = 0;
    dnR = [0, 0, 0];
    dnX = [-(dy * dy) / d3, (dx * dy) / d3, 0];
    dnY = [(dx * dy) / d3, -(dx * dx) / d3, 0];
  }
  const l = lightDir(az, el);
  const ndl = nx * l[0] + ny * l[1] + nz * l[2];
  const lam = Math.max(0, ndl);
  // specular (Blinn-Phong, v = +z)
  let spec = 0, dSpecN = [0, 0, 0], dSpecL = [0, 0, 0];
  if (o.shading === 'blinn' && ndl > 0) {
    const m = [l[0], l[1], l[2] + 1], mlen = Math.hypot(m[0], m[1], m[2]);
    const h = [m[0] / mlen, m[1] / mlen, m[2] / mlen];
    const ndh = nx * h[0] + ny * h[1] + nz * h[2];
    if (ndh > 0) {
      spec = KS * E * ndh ** SHININESS;
      const c = KS * E * SHININESS * ndh ** (SHININESS - 1);
      dSpecN = [c * h[0], c * h[1], c * h[2]];
      dSpecL = [c * (nx - ndh * h[0]) / mlen, c * (ny - ndh * h[1]) / mlen, c * (nz - ndh * h[2]) / mlen];
    }
  }
  const flat = o.shading === 'flat';
  const S = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    S[c] = flat ? alb[c] : alb[c] * (ka + E * lam) + spec;
    out[c] = a * S[c] + (1 - a) * BG[c];
  }
  if (!g) return out;
  // light-direction derivatives of l
  const ce = Math.cos(el), se = Math.sin(el), ca = Math.cos(az), sa = Math.sin(az);
  const dlAz = [ce * ca, 0, -ce * sa];
  const dlEl = [-se * sa, ce, -se * ca];
  let rEdge = 0, rAll = 0;
  for (let c = 0; c < 3; c++) {
    const gp = gc[c];
    if (gp === 0) continue;
    // d S_c / d n and d S_c / d l
    let dSn = [0, 0, 0], dSl = [0, 0, 0];
    if (!flat) {
      const kL = ndl > 0 ? alb[c] * E : 0;
      dSn = [kL * l[0] + dSpecN[0], kL * l[1] + dSpecN[1], kL * l[2] + dSpecN[2]];
      dSl = [kL * nx + dSpecL[0], kL * ny + dSpecL[1], kL * nz + dSpecL[2]];
    }
    g[c] += gp * a * (flat ? 1 : ka + E * lam);
    g[3] += gp * a * (dSl[0] * dlAz[0] + dSl[1] * dlAz[1] + dSl[2] * dlAz[2]);
    g[4] += gp * a * (dSl[0] * dlEl[0] + dSl[1] * dlEl[1] + dSl[2] * dlEl[2]);
    const diff = S[c] - BG[c];
    const eR = gp * daR * diff;
    const iR = gp * a * (dSn[0] * dnR[0] + dSn[1] * dnR[1] + dSn[2] * dnR[2]);
    g[5] += eR + iR; rEdge += eR; rAll += eR + iR;
    g[6] += gp * (daX * diff + a * (dSn[0] * dnX[0] + dSn[1] * dnX[1] + dSn[2] * dnX[2]));
    g[7] += gp * (daY * diff + a * (dSn[0] * dnY[0] + dSn[1] * dnY[1] + dSn[2] * dnY[2]));
  }
  if (g.parts) { g.parts.rEdge += rEdge; g.parts.rInterior += rAll - rEdge; }
  if (mapR) mapR[k] = rAll;
  return out;
}

const pixelCenter = (i, j, n) => [-1 + ((i + 0.5) * 2) / n, 1 - ((j + 0.5) * 2) / n];

// render(p, opts) -> Float64Array of 3n² linear values in [0, 1], row-major,
// top row first. opts.spp > 1 averages spp × spp stratified subsamples per
// pixel (a reference antialiased image; no gradients).
export function render(p, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const n = o.n, spp = o.spp ?? 1;
  const img = new Float64Array(3 * n * n);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      if (spp === 1) {
        const [x, y] = pixelCenter(i, j, n);
        const c = shadePoint(p, x, y, o);
        img[3 * k] = c[0]; img[3 * k + 1] = c[1]; img[3 * k + 2] = c[2];
      } else {
        let s0 = 0, s1 = 0, s2 = 0;
        for (let v = 0; v < spp; v++) for (let u = 0; u < spp; u++) {
          const x = -1 + ((i + (u + 0.5) / spp) * 2) / n, y = 1 - ((j + (v + 0.5) / spp) * 2) / n;
          const c = shadePoint(p, x, y, o);
          s0 += c[0]; s1 += c[1]; s2 += c[2];
        }
        const q = spp * spp;
        img[3 * k] = s0 / q; img[3 * k + 1] = s1 / q; img[3 * k + 2] = s2 / q;
      }
    }
  }
  return img;
}

export function mse(img, target) {
  let s = 0;
  for (let i = 0; i < img.length; i++) { const e = img[i] - target[i]; s += e * e; }
  return s / img.length;
}

// lossAndGrad(p, target, opts) -> { loss, grad (8), parts: {rEdge, rInterior}, img, mapR }
// One forward pass per pixel, then the chain rule backwards through that
// pixel: the reverse-mode pattern, written out by hand.
export function lossAndGrad(p, target, opts = {}) {
  const o = { ...DEFAULTS, ...opts };
  const n = o.n, M = 3 * n * n;
  const img = new Float64Array(M);
  const mapR = new Float32Array(n * n);
  const grad = new Float64Array(8);
  grad.parts = { rEdge: 0, rInterior: 0 };
  let loss = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const k = j * n + i;
      const [x, y] = pixelCenter(i, j, n);
      const c = shadePoint(p, x, y, o);
      const gc = [0, 0, 0];
      for (let ch = 0; ch < 3; ch++) {
        const e = c[ch] - target[3 * k + ch];
        loss += e * e;
        gc[ch] = (2 * e) / M;
        img[3 * k + ch] = c[ch];
      }
      shadePoint(p, x, y, o, gc, grad, mapR, k);
    }
  }
  const parts = grad.parts;
  delete grad.parts;
  return { loss: loss / M, grad: Array.from(grad), parts, img, mapR };
}

// Central finite differences of the same loss, for checking.
export function fdGrad(p, target, opts = {}, h = 1e-5) {
  const g = [];
  for (let i = 0; i < p.length; i++) {
    const a = p.slice(), b = p.slice();
    a[i] += h; b[i] -= h;
    g.push((mse(render(a, opts), target) - mse(render(b, opts), target)) / (2 * h));
  }
  return g;
}

// Adam (Kingma and Ba 2015) over the free parameters, with box constraints.
// free: boolean[8]. Returns an object whose step() applies one update and
// reports the loss and gradient at the parameters it started from.
export function makeFit({ start = START_PARAMS, target, opts = {}, lr = 0.02, free = [true, true, true, true, true, false, false, false] } = {}) {
  const p = start.slice();
  const m = new Array(8).fill(0), v = new Array(8).fill(0);
  let t = 0;
  const b1 = 0.9, b2 = 0.999, eps = 1e-8;
  return {
    p, free,
    get iter() { return t; },
    step() {
      const r = lossAndGrad(p, target, opts);
      t++;
      for (let i = 0; i < 8; i++) {
        if (!free[i]) continue;
        const gi = r.grad[i];
        m[i] = b1 * m[i] + (1 - b1) * gi;
        v[i] = b2 * v[i] + (1 - b2) * gi * gi;
        const mh = m[i] / (1 - b1 ** t), vh = v[i] / (1 - b2 ** t);
        p[i] = Math.min(HI[i], Math.max(LO[i], p[i] - (lr * mh) / (Math.sqrt(vh) + eps)));
      }
      return r;
    },
  };
}
