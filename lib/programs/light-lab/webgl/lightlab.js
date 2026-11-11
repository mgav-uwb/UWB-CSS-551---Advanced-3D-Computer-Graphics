// lightlab.js: light at a surface point, from the light sources to the pixel value: the light's direction, distance and cone,
// Lambert's diffuse term, the mirror direction, Phong's and Blinn's specular terms, ambient, the sum over lights, shading per
// vertex and per pixel, tone mapping of an unbounded sum, the sRGB curve, and what goes wrong when a blend or a lighting sum
// is done on codes instead of light. No three.js here: vectors and colors are arrays [x, y, z] and [r, g, b] in linear light
// unless a name says "code". scene.js draws it, and the course demo (lib/demos/light-lab.js) runs these same functions, so a
// value the demo prints beside a line of code is the value that line computed. No function changes its arguments.
// The same functions, line for line where the languages allow, are LightLab.cs in ../unity/
// (lib/tests/programs/light-lab.test.mjs runs both on the same inputs and compares the numbers).

// #region Settings and vector helpers
// Below EPS a length counts as zero. Angles are returned in degrees. Unity's Vector3 has these operations built in.
export const EPS = 1e-6;
export const DEG = 180 / Math.PI;

export function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
export function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
export function scale(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
export function mul(a, b) { return [a[0] * b[0], a[1] * b[1], a[2] * b[2]]; }
export function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
export function length(a) { return Math.sqrt(dot(a, a)); }
export function normalize(a) {
  const l = length(a);
  return l > EPS ? scale(a, 1 / l) : [0, 0, 0];
}
export function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
// #endregion

// #region Light: direction and distance
// A directional light has a direction and no position: L is the same everywhere and there is no distance. A point light, and
// a spot light, have a position: L points from the surface point toward it, and d is the distance the light travels.
// L always points toward the light, so facing the light means N . L near 1. lightDir is the way a directional light travels.
export function lightVector(kind, point, lightPos, lightDir) {
  const toLight = kind === 'directional' ? scale(lightDir, -1) : sub(lightPos, point);
  const d = kind === 'directional' ? 0 : length(toLight);
  const L = normalize(toLight);
  return { toLight, d, L };
}
// #endregion

// #region Light: distance attenuation
// A light of fixed power spreads over a sphere of area 4 pi d^2, so the physical falloff is 1 / d^2. Engines also use a
// tunable 1 / (kc + kl d + kq d^2), whose constant term keeps it finite at d = 0, and a cutoff radius beyond which the
// light is skipped. At d = 0 the inverse square is capped at 1 / EPS.
export function attenuation(d, kc, kl, kq, far) {
  const inverseSquare = 1 / Math.max(d * d, EPS);
  const polynomial = 1 / Math.max(kc + kl * d + kq * d * d, EPS);
  const cutoff = d <= far ? polynomial : 0;
  return { inverseSquare, polynomial, cutoff };
}
// #endregion

// #region Light: the spot cone
// A spot light is a point light masked by a cone around its aim D. alpha is the angle between -L and D. Inside the inner angle
// the mask is 1, outside the outer angle it is 0, and between them it fades: x = n^2 / range^2 with n = inner - alpha,
// then smoothstep(1, 0, x) = 3 t^2 - 2 t^3 with t = 1 - x (Kelvin Sung's soft edge). A zero-width ramp is a hard edge.
export function spotMask(L, aim, innerDeg, outerDeg) {
  const D = normalize(aim);
  const alpha = Math.acos(clamp(dot(scale(L, -1), D), -1, 1)) * DEG;
  const range = outerDeg - innerDeg;
  const n = innerDeg - alpha;
  const inFade = alpha > innerDeg && alpha < outerDeg && range > EPS;
  const x = inFade ? (n * n) / (range * range) : (alpha <= innerDeg ? 0 : 1);
  const t = 1 - x;
  const strength = inFade ? t * t * (3 - 2 * t) : (alpha <= innerDeg ? 1 : 0);
  return { alpha, n, range, x, t, strength };
}
// #endregion

// #region Light: an area light
// A disc of radius R and radiance L straight above a point at height h gives the irradiance pi L R^2 / (h^2 + R^2). A point
// light of the same power gives pi L R^2 / h^2. Their ratio is (h^2 + R^2) / h^2: the point light is too bright up close.
export function areaLight(radius, radiance, h) {
  const disc = (Math.PI * radiance * radius * radius) / (h * h + radius * radius);
  const point = (Math.PI * radiance * radius * radius) / Math.max(h * h, EPS);
  const ratio = point / disc;
  return { disc, point, ratio };
}
// #endregion

// #region Diffuse: Lambert
// A matte surface catches light in proportion to the cosine of the thetaN between N and L. Behind the surface the cosine is
// negative and no light arrives, so it is clamped at 0. kd and lightColor multiply per channel.
export function lambert(N, L, kd, lightColor) {
  const nDotL = dot(N, L);
  const thetaN = Math.acos(clamp(nDotL, -1, 1)) * DEG;
  const clamped = Math.max(0, nDotL);
  const lightDiffuse = scale(mul(kd, lightColor), clamped);
  return { nDotL, thetaN, clamped, lightDiffuse };
}
// #endregion

// #region Specular: the mirror direction
// Split L into the part along N and the part in the surface. Reflecting keeps the first and flips the second:
// R = (N . L) N - [L - (N . L) N] = 2 (N . L) N - L. R is unit when N and L are.
export function mirrorDirection(N, L) {
  const nDotL = dot(N, L);
  const along = scale(N, nDotL);
  const inSurface = sub(L, along);
  const R = sub(along, inSurface);
  return { nDotL, along, inSurface, R };
}
// #endregion

// #region Specular: Phong
// The highlight is brightest where the mirror direction R points at the eye V. The cosine R . V is raised to the shininess s,
// so only directions near the mirror survive. Normalized, the lobe is multiplied by (s + 2) / (2 pi), so a tighter highlight
// is a brighter one and the total light reflected stays the same.
export function phong(R, V, s, ks, lightColor, normalized) {
  const rDotV = dot(R, V);
  const thetaR = Math.acos(clamp(rDotV, -1, 1)) * DEG;
  const phongFactor = Math.pow(Math.max(0, rDotV), s);
  const phongNorm = normalized ? (s + 2) / (2 * Math.PI) : 1;
  const phongSpec = scale(mul(ks, lightColor), phongFactor * phongNorm);
  return { rDotV, thetaR, phongFactor, phongNorm, phongSpec };
}
// #endregion

// #region Specular: Blinn's half vector
// Blinn (1977) replaces the mirror test with H = normalize(L + V), the direction halfway between the light and the eye. The
// surface mirrors the light into the eye exactly when N = H, so H . N peaks where R . V does. It needs no reflection vector.
export function blinn(N, L, V, s, ks, lightColor, normalized) {
  const H = normalize(add(L, V));
  const hDotN = dot(H, N);
  const thetaH = Math.acos(clamp(hDotN, -1, 1)) * DEG;
  const blinnFactor = Math.pow(Math.max(0, hDotN), s);
  const blinnNorm = normalized ? (s + 2) / (2 * Math.PI) : 1;
  const blinnSpec = scale(mul(ks, lightColor), blinnFactor * blinnNorm);
  return { H, hDotN, thetaH, blinnFactor, blinnNorm, blinnSpec };
}
// #endregion

// #region Specular: matching the exponent
// The angle between H and N is about half the angle between R and V, so Blinn's cosine is larger. To give the same highlight
// value as Phong at one point, Blinn needs the exponent s = ln(phongFactor) / ln(H . N): about four times Phong's.
export function matchExponent(phongFactor, hDotN, phongS) {
  const sBlinn = Math.log(phongFactor) / Math.log(hDotN);
  const sRatio = sBlinn / phongS;
  return { sBlinn, sRatio };
}
// #endregion

// #region Specular: energy
// Narrowing the lobe also shrinks the light it reflects. With the cosine toward the surface, the lobe integrates to
// 2 pi / (s + 2) over the hemisphere (2 pi / (s + 1) without it). Here the integral is summed in 4000 steps of the angle
// theta from the lobe's axis; the normalizer (s + 2) / (2 pi) makes the total 1 at every s.
export function lobeEnergy(s) {
  const steps = 4000;
  const dTheta = (Math.PI / 2) / steps;
  let raw = 0;
  let rawNoCos = 0;
  for (let i = 0; i < steps; i++) {
    const theta = (i + 0.5) * dTheta;
    const lobe = Math.pow(Math.cos(theta), s) * Math.sin(theta);
    rawNoCos += lobe * dTheta;
    raw += lobe * Math.cos(theta) * dTheta;
  }
  raw *= 2 * Math.PI;
  rawNoCos *= 2 * Math.PI;
  const exact = (2 * Math.PI) / (s + 2);
  const exactNoCos = (2 * Math.PI) / (s + 1);
  const normalizer = (s + 2) / (2 * Math.PI);
  const normalized = raw * normalizer;
  return { raw, exact, rawNoCos, exactNoCos, normalizer, normalized };
}
// #endregion

// #region Ambient
// Where no light arrives directly, a model with only diffuse and specular terms is pure black. Real shadows are filled by
// bounced light, which a local model does not compute: one constant stands in for it, the same at every point. Here the
// ambient reflectance is ka times the diffuse color kd.
export function ambientTerm(ka, kd, ambientColor) {
  const ambient = scale(mul(kd, ambientColor), ka);
  return { ambient };
}
// #endregion

// #region The sum over lights
// The model is linear in the lights, so each light adds its own diffuse and specular terms, and the ambient term is added
// once. A light behind the surface (N . L not positive) adds neither. model is "phong" or "blinn".
export function shadeSurface(P, N, eye, lightPos, lightCol, ambientColor, ka, kd, ks, s, model, normalized) {
  const V = normalize(sub(eye, P));
  const ambient = ambientTerm(ka, kd, ambientColor).ambient;
  let diffuse = [0, 0, 0];
  let specular = [0, 0, 0];
  const nDotLs = [];
  const cosines = [];
  for (let i = 0; i < lightPos.length; i++) {
    const L = normalize(sub(lightPos[i], P));
    const lam = lambert(N, L, kd, lightCol[i]);
    let spec = [0, 0, 0];
    let cosine = 0;
    if (model === 'blinn') {
      const b = blinn(N, L, V, s, ks, lightCol[i], normalized);
      spec = b.blinnSpec;
      cosine = b.hDotN;
    } else {
      const p = phong(mirrorDirection(N, L).R, V, s, ks, lightCol[i], normalized);
      spec = p.phongSpec;
      cosine = p.rDotV;
    }
    const lit = lam.nDotL > 0 ? 1 : 0;
    diffuse = add(diffuse, lam.lightDiffuse);
    specular = add(specular, scale(spec, lit));
    nDotLs.push(lam.nDotL);
    cosines.push(cosine);
  }
  const color = add(add(ambient, diffuse), specular);
  return { V, ambient, diffuse, specular, color, nDotLs, cosines };
}
// #endregion

// #region Shading: barycentric weights
// A point p inside the triangle a, b, c (2D) is u a + v b + w c with u + v + w = 1. Each weight is the signed area of the
// triangle opposite its corner over the whole triangle. The point is inside when all three are not negative.
export function barycentric(p, a, b, c) {
  const e0 = [b[0] - a[0], b[1] - a[1]];
  const e1 = [c[0] - a[0], c[1] - a[1]];
  const e2 = [p[0] - a[0], p[1] - a[1]];
  const d = e0[0] * e1[1] - e0[1] * e1[0];
  if (Math.abs(d) < EPS) return { u: 0, v: 0, w: 0, inside: false };
  const v = (e2[0] * e1[1] - e2[1] * e1[0]) / d;
  const w = (e0[0] * e2[1] - e0[1] * e2[0]) / d;
  const u = 1 - v - w;
  const inside = u >= -EPS && v >= -EPS && w >= -EPS;
  return { u, v, w, inside };
}
// #endregion

// #region Shading: per vertex
// Gouraud (1971): light each vertex once, then give each pixel the weighted mean of the three vertex colors. A highlight
// smaller than a triangle is smeared or lost, because it exists only if it falls on a vertex.
export function gouraud(weights, ca, cb, cc) {
  const color = add(add(scale(ca, weights[0]), scale(cb, weights[1])), scale(cc, weights[2]));
  return { color };
}
// #endregion

// #region Shading: per pixel
// Phong shading: give each pixel the weighted mean of the three vertex normals, renormalized, and light that pixel. The
// lighting sum then runs once per pixel, and a highlight between vertices appears.
export function phongShading(weights, na, nb, nc) {
  const blended = add(add(scale(na, weights[0]), scale(nb, weights[1])), scale(nc, weights[2]));
  const normal = normalize(blended);
  return { blended, normal };
}
// #endregion

// #region Shading: cost
// Counts of lighting evaluations. Per vertex: one per vertex per light. Per pixel: one per covered pixel per light. Forward
// shading pays for every fragment, overdraw included; deferred shading once per pixel; tiled deferred shading only for the
// lights that reach the pixel's tile.
export function shadingCost(vertices, pixels, overdraw, lights, tileLights, bytesPerPixel) {
  const gouraudEvals = vertices * lights;
  const pixelEvals = pixels * lights;
  const ratio = pixelEvals / gouraudEvals;
  const forward = pixels * overdraw * lights;
  const deferred = pixels * lights;
  const tiled = pixels * tileLights;
  const gBufferBytes = pixels * bytesPerPixel;
  return { gouraudEvals, pixelEvals, ratio, forward, deferred, tiled, gBufferBytes };
}
// #endregion

// #region Tone mapping
// A lighting sum is unbounded, and a display shows 0 to 1. Exposure scales the sum first. Clipping sends every value above 1
// to white. Reinhard (2002) maps x to x / (1 + x), which approaches 1 and never reaches it. The film-like curve is Narkowicz's
// (2015) fit to the ACES curve. All of them run last, per channel, before the sRGB encode.
export function toneMapChannel(x, exposure) {
  const scaled = x * exposure;
  const clip = Math.min(1, scaled);
  const reinhard = scaled / (1 + scaled);
  const aces = clamp((scaled * (2.51 * scaled + 0.03)) / (scaled * (2.43 * scaled + 0.59) + 0.14), 0, 1);
  return { scaled, clip, reinhard, aces };
}
// #endregion

// #region An HDR scene
// A picture of values far above 1, as a lighting sum would give: a sky of 6, clouds of 4, a sun disc of 40, a dark ground
// near 0.05, and a red sphere lit by the sun with a white highlight. x and y run 0 to 1 across the image, y downward. kind:
// 0 sky, 1 cloud, 2 sun, 3 sphere, 4 ground.
export function hdrScene(x, y) {
  const horizon = 0.64;
  let kind = 0;
  let radiance = [0, 0, 0];
  if (y > horizon) {
    const g = (y - horizon) / (1 - horizon);
    radiance = [0.03 + 0.1 * g, 0.05 + 0.18 * g, 0.02 + 0.06 * g];
    kind = 4;
  } else {
    const lift = 1 - 0.25 * (y / horizon);
    radiance = [4.3 * lift, 5.2 * lift, 6 * lift];
  }
  const clouds = [[0.3, 0.22, 0.18, 0.06], [0.54, 0.36, 0.16, 0.05], [0.12, 0.4, 0.14, 0.045]];
  if (y <= horizon) {
    for (let i = 0; i < clouds.length; i++) {
      const ex = (x - clouds[i][0]) / clouds[i][2];
      const ey = (y - clouds[i][1]) / clouds[i][3];
      const cover = clamp((1 - (ex * ex + ey * ey)) * 5, 0, 1);
      if (cover > 0) {
        radiance = add(scale(radiance, 1 - cover), scale([4, 4, 4], cover));
        if (cover > 0.5) kind = 1;
      }
    }
    const r = Math.sqrt((x - 0.8) * (x - 0.8) + (y - 0.18) * (y - 0.18));
    if (r < 0.04) {
      radiance = [40, 38.4, 34];
      kind = 2;
    } else {
      radiance = add(radiance, scale([1, 0.9, 0.7], 14 * Math.exp(-(r - 0.04) / 0.05)));
    }
  }
  const px = (x - 0.42) / 0.17;
  const py = -(y - 0.72) / 0.17;
  if (px * px + py * py < 1) {
    const normal = [px, py, Math.sqrt(1 - px * px - py * py)];
    const lit = shadeSurface(normal, normal, [0, 0, 8], [[4, 3, 4.5]], [[8, 8, 7.2]], [0.6, 0.8, 1],
      0.12, [0.75, 0.35, 0.28], [0.8, 0.8, 0.8], 60, 'blinn', false);
    radiance = lit.color;
    kind = 3;
  }
  return { radiance, kind };
}
// #endregion

// #region sRGB: decode
// A code c in 0 to 1 is not light. The sRGB curve (IEC 61966-2-1) is linear near black and a power 2.4 above:
// v = c / 12.92 for c <= 0.04045, otherwise ((c + 0.055) / 1.055)^2.4. segment is 0 on the line and 1 on the power.
export function srgbDecode(code) {
  const segment = code <= 0.04045 ? 0 : 1;
  const linear = segment === 0 ? code / 12.92 : Math.pow((code + 0.055) / 1.055, 2.4);
  return { linear, segment };
}
// #endregion

// #region sRGB: encode
// The inverse: c = 12.92 v for v <= 0.0031308, otherwise 1.055 v^(1/2.4) - 0.055. The byte is the nearest of the 256 codes.
// Light above 1 or below 0 is clamped first, since a display cannot show it.
export function srgbEncode(linear) {
  const v = clamp(linear, 0, 1);
  const segment = v <= 0.0031308 ? 0 : 1;
  const code = segment === 0 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
  const byte = Math.floor(code * 255 + 0.5);
  return { code, byte, segment };
}
// #endregion

// #region Quantization
// Storing a value in a fixed number of levels rounds it to the nearest of levels evenly spaced values from 0 to 1. Rounding
// light costs the darks their detail; rounding the sRGB code spreads the steps to match the eye.
export function quantize(value, levels) {
  const index = Math.floor(clamp(value, 0, 1) * (levels - 1) + 0.5);
  const quantized = index / (levels - 1);
  return { index, quantized };
}
// #endregion

// #region Codes in the darks
// How many of the 256 codes of an 8-bit image, black included, stand for light below a fraction of full light: the sRGB
// codes (each decoded), against codes that were linear light stored directly.
export function codesBelow(fraction) {
  let srgb = 0;
  let linear = 0;
  for (let c = 0; c < 256; c++) {
    if (srgbDecode(c / 255).linear < fraction) srgb++;
    if (c / 255 < fraction) linear++;
  }
  return { srgb, linear };
}
// #endregion

// #region Luminance
// The light the eye adds up from a linear color: Y = 0.2126 R + 0.7152 G + 0.0722 B (the sRGB primaries, ITU-R BT.709).
export function luminance(rgb) {
  const Y = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  return { Y };
}
// #endregion

// #region Blending in two spaces
// A 50 % mix of two colors. Averaging the codes gives codesMix; the eye averages light, so the right mix is the average of
// the decoded values, then encoded. A fine checker of the two colors, seen from afar, has the luminance lightY.
export function blendSpaces(codeA, codeB, t) {
  const codesMix = add(scale(codeA, 1 - t), scale(codeB, t));
  const codesLight = [srgbDecode(codesMix[0]).linear, srgbDecode(codesMix[1]).linear, srgbDecode(codesMix[2]).linear];
  const lightA = [srgbDecode(codeA[0]).linear, srgbDecode(codeA[1]).linear, srgbDecode(codeA[2]).linear];
  const lightB = [srgbDecode(codeB[0]).linear, srgbDecode(codeB[1]).linear, srgbDecode(codeB[2]).linear];
  const lightMix = add(scale(lightA, 1 - t), scale(lightB, t));
  const lightCodes = [srgbEncode(lightMix[0]).code, srgbEncode(lightMix[1]).code, srgbEncode(lightMix[2]).code];
  const codesY = luminance(codesLight).Y;
  const lightY = luminance(lightMix).Y;
  const ratio = codesY / lightY;
  return { codesMix, codesLight, lightMix, lightCodes, codesY, lightY, ratio };
}
// #endregion

// #region Lighting in two spaces
// A texel with albedo code a, lit at a given N . L. Correct: decode the albedo, multiply the light, encode the result.
// Wrong: multiply the code, as a shader does that skips the conversions. The second gives too little light, and more so for
// partly lit surfaces.
export function lightSpaces(albedoCode, nDotL) {
  const albedoLinear = srgbDecode(albedoCode).linear;
  const rightLight = albedoLinear * nDotL;
  const rightCode = srgbEncode(rightLight).code;
  const wrongCode = albedoCode * nDotL;
  const wrongLight = srgbDecode(wrongCode).linear;
  const fraction = wrongLight / Math.max(rightLight, EPS);
  return { albedoLinear, rightLight, rightCode, wrongCode, wrongLight, fraction };
}
// #endregion
