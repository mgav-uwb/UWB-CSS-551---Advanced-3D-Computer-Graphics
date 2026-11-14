// texlab.js: the sampler. A texture lookup from a coordinate (u, v) to a value: the wrap modes, nearest and bilinear filtering, the
// mipmap pyramid and the level chosen from the screen-space derivatives of (u, v), trilinear and anisotropic filtering, a
// tilted checker floor rendered one pixel at a time by this sampler, a cube map lookup and a shadow map lookup. No three.js
// and no drawing: a texture is a flat array of grayscale values in [0, 1], row after row from v = 0 upward, n by n texels with n a
// power of two; a mipmap is one flat array holding level 0, then level 1, and so on. scene.js draws a floor with the GPU's
// own sampler, and the course demo (lib/demos/tex-lab.js) runs these same functions, so a value the demo prints beside a line of
// code is the value that line computed. No function changes its arguments.
// The same functions, line for line where the languages allow, are TexLab.cs in ../unity/
// (lib/tests/programs/tex-lab.test.mjs runs both on the same inputs and compares the numbers).

// #region Settings and vector helpers
// Below EPS a length counts as zero. Unity's Vector3 has these operations built in.
export const EPS = 1e-9;

export function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
export function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
export function scale(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
export function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
export function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
export function normalize(a) {
  const l = Math.sqrt(dot(a, a));
  return l > EPS ? scale(a, 1 / l) : [0, 0, 0];
}
// #endregion

// #region Test textures
// A checker of check-texel squares, the worked 4 by 4 texture of the lecture, and a seeded noise. Park-Miller is the random
// generator, so both tracks make the same noise. Value (0, 0) of a checker is the light one.
export function workedTexture() {
  return [0.1, 0.3, 0.5, 0.7,
    0.2, 0.9, 0.4, 0.6,
    0.8, 0.2, 0.7, 0.1,
    0.3, 0.5, 0.9, 0.4];
}

export function makeNoise(n, seed) {
  const texture = new Array(n * n).fill(0);
  let state = seed;
  for (let k = 0; k < n * n; k++) {
    state = (state * 48271) % 2147483647;
    texture[k] = state / 2147483647;
  }
  return texture;
}

export function makeChecker(n, check, dark, light) {
  const texture = new Array(n * n).fill(0);
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const parity = (Math.floor(i / check) + Math.floor(j / check)) % 2;
      texture[j * n + i] = parity === 0 ? light : dark;
    }
  }
  return texture;
}
// #endregion

// #region Wrap modes
// What comes back for a coordinate outside [0, 1]. Repeat keeps the fraction, clamp holds the edge, mirror flips every other
// period. The same rule applied to a texel index serves the neighbors a bilinear sample reads past the edge.
export function wrapIndex(i, size, mode) {
  if (mode === 'clamp') return Math.min(Math.max(i, 0), size - 1);
  const period = Math.floor(i / size);
  const inside = i - period * size;
  if (mode === 'mirror' && period % 2 !== 0) return size - 1 - inside;
  return inside;
}

export function wrapCoordinate(u, mode) {
  const period = Math.floor(u);
  const fraction = u - period;
  let wrapped = fraction;
  if (mode === 'clamp') wrapped = Math.min(Math.max(u, 0), 1);
  if (mode === 'mirror' && period % 2 !== 0) wrapped = 1 - fraction;
  return { period, fraction, wrapped };
}
// #endregion

// #region Pyramid layout
// One array holds every level of a mipmap, level 0 first. A level is half the size of the one below it, down to a single texel,
// and level L starts after the texels of the levels before it.
export function levelCount(n) {
  let levels = 1;
  for (let size = n; size > 1; size = Math.floor(size / 2)) levels += 1;
  return levels;
}

export function levelSize(n, level) {
  let size = n;
  for (let k = 0; k < level; k++) size = Math.max(1, Math.floor(size / 2));
  return size;
}

export function levelOffset(n, level) {
  let offset = 0;
  for (let k = 0; k < level; k++) offset += levelSize(n, k) * levelSize(n, k);
  return offset;
}
// #endregion

// #region Nearest
// The texel whose square contains the coordinate: wrap the coordinate, scale it to texels and take the floor. Texel i covers u
// from i/size to (i+1)/size.
export function sampleNearest(pyramid, n, level, u, v, mode) {
  const size = levelSize(n, level);
  const offset = levelOffset(n, level);
  const wu = wrapCoordinate(u, mode).wrapped;
  const wv = wrapCoordinate(v, mode).wrapped;
  const i = wrapIndex(Math.floor(wu * size), size, mode);
  const j = wrapIndex(Math.floor(wv * size), size, mode);
  const value = pyramid[offset + j * size + i];
  return { size, offset, wu, wv, i, j, value };
}
// #endregion

// #region Bilinear
// Texel centers sit at (i + 0.5) / size, so the coordinate in texel space is u * size - 0.5. The four texels around it are
// blended: along x in two rows, then along y. The weights are the four products of the fractions and sum to 1.
export function sampleBilinear(pyramid, n, level, u, v, mode) {
  const size = levelSize(n, level);
  const offset = levelOffset(n, level);
  const wu = wrapCoordinate(u, mode).wrapped;
  const wv = wrapCoordinate(v, mode).wrapped;
  const x = wu * size - 0.5;
  const y = wv * size - 0.5;
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  const i0 = wrapIndex(i, size, mode);
  const i1 = wrapIndex(i + 1, size, mode);
  const j0 = wrapIndex(j, size, mode);
  const j1 = wrapIndex(j + 1, size, mode);
  const t00 = pyramid[offset + j0 * size + i0];
  const t10 = pyramid[offset + j0 * size + i1];
  const t01 = pyramid[offset + j1 * size + i0];
  const t11 = pyramid[offset + j1 * size + i1];
  const rowLow = t00 + fx * (t10 - t00);
  const rowHigh = t01 + fx * (t11 - t01);
  const w00 = (1 - fx) * (1 - fy);
  const w10 = fx * (1 - fy);
  const w01 = (1 - fx) * fy;
  const w11 = fx * fy;
  const value = rowLow + fy * (rowHigh - rowLow);
  return { size, offset, wu, wv, x, y, i, j, fx, fy, i0, i1, j0, j1, t00, t10, t01, t11, rowLow, rowHigh, w00, w10, w01, w11, value };
}
// #endregion

// #region Box filter
// Each texel of level k + 1 is the mean of a 2 by 2 block of level k, so a texel of level k is the average of a 2^k by 2^k
// patch of the original. The pyramid holds 1 + 1/4 + 1/16 + ... of the base: at most 4/3 of it.
export function buildMipmap(base, n) {
  const levels = levelCount(n);
  let texels = 0;
  for (let level = 0; level < levels; level++) texels += levelSize(n, level) * levelSize(n, level);
  const pyramid = new Array(texels).fill(0);
  for (let k = 0; k < n * n; k++) pyramid[k] = base[k];
  for (let level = 1; level < levels; level++) {
    const size = levelSize(n, level);
    const below = levelSize(n, level - 1);
    const from = levelOffset(n, level - 1);
    const to = levelOffset(n, level);
    for (let j = 0; j < size; j++) {
      for (let i = 0; i < size; i++) {
        const a = pyramid[from + (2 * j) * below + 2 * i];
        const b = pyramid[from + (2 * j) * below + 2 * i + 1];
        const c = pyramid[from + (2 * j + 1) * below + 2 * i];
        const d = pyramid[from + (2 * j + 1) * below + 2 * i + 1];
        pyramid[to + j * size + i] = (a + b + c + d) / 4;
      }
    }
  }
  const ratio = texels / (n * n);
  return { pyramid, levels, texels, ratio };
}
// #endregion

// #region Footprint and level
// The derivatives say how far (u, v) moves per pixel. Scaled to texels, that is the pixel's footprint along each screen axis.
// The longer one, rho, sets the level: lambda = log2(rho). The shorter one gives the finer level anisotropic filtering uses.
export function footprintLevel(dudx, dvdx, dudy, dvdy, n, levels) {
  const footprintX = n * Math.sqrt(dudx * dudx + dvdx * dvdx);
  const footprintY = n * Math.sqrt(dudy * dudy + dvdy * dvdy);
  const rho = Math.max(footprintX, footprintY);
  const lambda = Math.log2(Math.max(rho, EPS));
  const top = levels - 1;
  const clamped = Math.min(Math.max(lambda, 0), top);
  const lower = Math.floor(clamped);
  const upper = Math.min(lower + 1, top);
  const blend = clamped - lower;
  const texelsLower = rho / Math.pow(2, lower);
  const texelsUpper = rho / Math.pow(2, upper);
  const shorter = Math.min(footprintX, footprintY);
  const anisotropy = rho / Math.max(shorter, EPS);
  const anisoLambda = Math.log2(Math.max(shorter, EPS));
  return { footprintX, footprintY, rho, lambda, top, clamped, lower, upper, blend, texelsLower, texelsUpper, shorter, anisotropy, anisoLambda };
}
// #endregion

// #region Trilinear
// Bilinear samples from the two levels either side of lambda, blended by how far lambda is from the lower one. A lambda below 0
// is magnification: level 0. Above the top level, the top level.
export function sampleTrilinear(pyramid, n, levels, u, v, lambda, mode) {
  const top = levels - 1;
  const clamped = Math.min(Math.max(lambda, 0), top);
  const lower = Math.floor(clamped);
  const upper = Math.min(lower + 1, top);
  const blend = clamped - lower;
  const valueLower = sampleBilinear(pyramid, n, lower, u, v, mode).value;
  const valueUpper = sampleBilinear(pyramid, n, upper, u, v, mode).value;
  const value = valueLower + blend * (valueUpper - valueLower);
  return { top, clamped, lower, upper, blend, valueLower, valueUpper, value };
}
// #endregion

// #region Anisotropic
// A footprint longer than it is wide is read with several trilinear samples spaced along the long axis, each at the level of the
// short axis: the level the long axis would choose is too blurry across the footprint. The tap count is the ratio rounded up,
// at most maxTaps (a ratio a hair over a whole number, from rounding, adds no tap); past the cap the level coarsens until the
// taps cover the footprint again. One tap is plain trilinear.
export function sampleAnisotropic(pyramid, n, levels, u, v, dudx, dvdx, dudy, dvdy, maxTaps, mode) {
  const lengthX = n * Math.sqrt(dudx * dudx + dvdx * dvdx);
  const lengthY = n * Math.sqrt(dudy * dudy + dvdy * dvdy);
  const longIsX = lengthX >= lengthY;
  const majorU = longIsX ? dudx : dudy;
  const majorV = longIsX ? dvdx : dvdy;
  const longer = Math.max(lengthX, lengthY);
  const shorter = Math.min(lengthX, lengthY);
  const ratio = longer / Math.max(shorter, EPS);
  const taps = Math.max(1, Math.min(Math.ceil(ratio - 0.01), maxTaps));
  const lambda = Math.log2(Math.max(shorter, longer / taps, EPS));
  let sum = 0;
  for (let k = 0; k < taps; k++) {
    const along = (k + 0.5) / taps - 0.5;
    const at = sampleTrilinear(pyramid, n, levels, u + along * majorU,
      v + along * majorV, lambda, mode);
    sum += at.value;
  }
  const value = sum / taps;
  return { lengthX, lengthY, longIsX, longer, shorter, ratio, taps, lambda, majorU, majorV, sum, value };
}
// #endregion

// #region Floor pixel
// A pinhole camera at the origin looks down -z with a 50 degree field of view. A texture plane passes through (0, 0, -1) and is
// tilted about the x axis: 0 faces the camera, larger tilts lean the top away. A pixel's ray meets the plane at a point whose
// plane coordinates, divided by the tile size, are (u, v). The derivatives are differences to the next pixel right and below,
// as a GPU gets them from a 2 by 2 block of pixels.
export const FOV_DEGREES = 50;

export function floorPixel(px, py, width, height, tiltDegrees, tiles) {
  const tilt = tiltDegrees * Math.PI / 180;
  const halfHeight = Math.tan(FOV_DEGREES * Math.PI / 360);
  const halfWidth = halfHeight * width / height;
  const sx = (px / width * 2 - 1) * halfWidth;
  const sy = (1 - py / height * 2) * halfHeight;
  const denominator = Math.cos(tilt) - Math.sin(tilt) * sy;
  if (denominator <= 0.0001) return { hit: false, u: 0, v: 0, depth: 0, sx, sy };
  const depth = Math.cos(tilt) / denominator;
  const along = depth * sx;
  const up = depth * sy * Math.cos(tilt) - (1 - depth) * Math.sin(tilt);
  const tileSize = 2 * halfWidth / tiles;
  return { hit: true, u: along / tileSize + 0.5, v: up / tileSize + 0.5, depth, sx, sy };
}

export function floorFootprint(ix, iy, width, height, tiltDegrees, tiles) {
  const here = floorPixel(ix + 0.5, iy + 0.5,
    width, height, tiltDegrees, tiles);
  const right = floorPixel(ix + 1.5, iy + 0.5,
    width, height, tiltDegrees, tiles);
  const below = floorPixel(ix + 0.5, iy + 1.5,
    width, height, tiltDegrees, tiles);
  const hit = here.hit && right.hit && below.hit;
  const dudx = right.u - here.u;
  const dvdx = right.v - here.v;
  const dudy = below.u - here.u;
  const dvdy = below.v - here.v;
  return { hit, u: here.u, v: here.v, dudx, dvdx, dudy, dvdy };
}
// #endregion

// #region Reference average
// The correct color is the average over the pixel's area. This takes grid by grid samples inside the pixel, each read by
// nearest from level 0, and averages them: slow, and what the mipmap approximates.
export function referenceAverage(pyramid, n, ix, iy, width, height, tiltDegrees, tiles, grid, mode) {
  let sum = 0;
  let samples = 0;
  for (let b = 0; b < grid; b++) {
    for (let a = 0; a < grid; a++) {
      const sx = ix + (a + 0.5) / grid;
      const sy = iy + (b + 0.5) / grid;
      const spot = floorPixel(sx, sy, width, height, tiltDegrees, tiles);
      if (spot.hit) {
        sum += sampleNearest(pyramid, n, 0, spot.u, spot.v, mode).value;
        samples += 1;
      }
    }
  }
  const value = samples > 0 ? sum / samples : 0;
  return { samples, value };
}
// #endregion

// #region Shade a pixel
// One pixel of the floor: find its (u, v) and derivatives, then read the texture with the chosen filter: nearest, bilinear,
// level (one mip level, lambda rounded), trilinear, anisotropic or the reference average. A pixel above the horizon is sky.
export function shadeFloor(pyramid, n, ix, iy, width, height, tiltDegrees, tiles, filter, maxTaps, mode) {
  const levels = levelCount(n);
  const f = floorFootprint(ix, iy, width, height, tiltDegrees, tiles);
  if (!f.hit) return { hit: false, u: 0, v: 0, lambda: 0, taps: 0, value: 0, levels };
  const fp = footprintLevel(f.dudx, f.dvdx, f.dudy, f.dvdy, n, levels);
  let value = 0;
  let taps = 1;
  if (filter === 'nearest') {
    value = sampleNearest(pyramid, n, 0, f.u, f.v, mode).value;
  } else if (filter === 'bilinear') {
    value = sampleBilinear(pyramid, n, 0, f.u, f.v, mode).value;
  } else if (filter === 'level') {
    const nearestLevel = Math.floor(fp.lambda + 0.5);
    const rounded = Math.min(Math.max(nearestLevel, 0), levels - 1);
    value = sampleBilinear(pyramid, n, rounded, f.u, f.v, mode).value;
  } else if (filter === 'trilinear') {
    value = sampleTrilinear(pyramid, n, levels, f.u, f.v, fp.lambda, mode).value;
  } else if (filter === 'anisotropic') {
    const a = sampleAnisotropic(pyramid, n, levels, f.u, f.v,
      f.dudx, f.dvdx, f.dudy, f.dvdy, maxTaps, mode);
    value = a.value;
    taps = a.taps;
  } else {
    const average = referenceAverage(pyramid, n, ix, iy, width, height,
      tiltDegrees, tiles, 4, mode);
    value = average.value;
    taps = 16;
  }
  return { hit: true, u: f.u, v: f.v, lambda: fp.lambda, taps, value, levels };
}
// #endregion

// #region Cube map lookup
// A direction picks the face of its largest component, with that component's sign. The other two components, divided by the
// largest and mapped from [-1, 1] to [0, 1], are the coordinates on the face. The signs of sc and tc per face are OpenGL's.
export function cubeLookup(x, y, z, size) {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const az = Math.abs(z);
  let face = 0;
  let ma = ax;
  let sc = 0;
  let tc = 0;
  if (ax >= ay && ax >= az) {
    face = x > 0 ? 0 : 1;
    ma = ax;
    sc = x > 0 ? -z : z;
    tc = -y;
  } else if (ay >= az) {
    face = y > 0 ? 2 : 3;
    ma = ay;
    sc = x;
    tc = y > 0 ? z : -z;
  } else {
    face = z > 0 ? 4 : 5;
    ma = az;
    sc = z > 0 ? x : -x;
    tc = -y;
  }
  const faceName = ['+X', '-X', '+Y', '-Y', '+Z', '-Z'][face];
  const s = (sc / Math.max(ma, EPS) + 1) / 2;
  const t = (tc / Math.max(ma, EPS) + 1) / 2;
  const texelX = Math.min(Math.floor(s * size + 0.0001), size - 1);
  const texelY = Math.min(Math.floor(t * size + 0.0001), size - 1);
  return { ax, ay, az, face, faceName, ma, sc, tc, s, t, texelX, texelY };
}
// #endregion

// #region Cube face point
// The reverse: the point of the unit cube's surface that face, s and t name.
export function cubeFacePoint(face, s, t) {
  const a = 2 * s - 1;
  const b = 2 * t - 1;
  if (face === 0) return [1, -b, -a];
  if (face === 1) return [-1, -b, a];
  if (face === 2) return [a, 1, b];
  if (face === 3) return [a, -1, -b];
  if (face === 4) return [a, -b, 1];
  return [-a, -b, -1];
}
// #endregion

// #region Cube map memory
// Six square faces of bytesPerTexel bytes. A full mip chain adds 1/4 + 1/16 + ... of each face.
export function cubeMemory(size, bytesPerTexel) {
  const faceBytes = size * size * bytesPerTexel;
  const bytes = 6 * faceBytes;
  let withMips = 0;
  for (let level = 0; level < levelCount(size); level++) {
    const side = levelSize(size, level);
    withMips += 6 * side * side * bytesPerTexel;
  }
  return { faceBytes, bytes, withMips };
}
// #endregion

// #region Shadow scene
// A directional light along LIGHT_DIR, an orthographic light camera at LIGHT_ORIGIN covering a COVER by COVER square of the
// plane perpendicular to the light, and a floor (y = 0) with a unit box standing on it. A depth is a distance along the
// light direction from the plane through LIGHT_ORIGIN.
export const LIGHT_DIR = [-2 / 3, -2 / 3, -1 / 3];
export const LIGHT_ORIGIN = [20 / 3, 20 / 3, 10 / 3];
export const COVER = 6;
export const BOX_MIN = [-0.5, 0, -0.5];
export const BOX_MAX = [0.5, 1, 0.5];

export function lightAxes() {
  const right = normalize(cross(LIGHT_DIR, [0, 1, 0]));
  const up = cross(right, LIGHT_DIR);
  return { right, up };
}

// The distances at which a ray enters and leaves the slab lo..hi along one axis.
export function slab(origin, direction, lo, hi) {
  if (Math.abs(direction) < EPS) {
    const inside = origin >= lo && origin <= hi;
    return inside ? { near: -1e9, far: 1e9 } : { near: 1e9, far: -1e9 };
  }
  const t1 = (lo - origin) / direction;
  const t2 = (hi - origin) / direction;
  return { near: Math.min(t1, t2), far: Math.max(t1, t2) };
}
// #endregion

// #region Shadow map texel
// What the map stores at texel (i, j): the ray from the texel's center along the light meets the box or the floor, whichever is
// first, and the stored depth is the distance to it.
export function storedDepth(i, j, res) {
  const axes = lightAxes();
  const a = ((i + 0.5) / res - 0.5) * COVER;
  const b = ((j + 0.5) / res - 0.5) * COVER;
  const across = add(scale(axes.right, a), scale(axes.up, b));
  const origin = add(LIGHT_ORIGIN, across);
  const floorDistance = -origin[1] / LIGHT_DIR[1];
  const sx = slab(origin[0], LIGHT_DIR[0], BOX_MIN[0], BOX_MAX[0]);
  const sy = slab(origin[1], LIGHT_DIR[1], BOX_MIN[1], BOX_MAX[1]);
  const sz = slab(origin[2], LIGHT_DIR[2], BOX_MIN[2], BOX_MAX[2]);
  const near = Math.max(sx.near, Math.max(sy.near, sz.near));
  const far = Math.min(sx.far, Math.min(sy.far, sz.far));
  const hitsBox = near <= far && far > 0 && near < floorDistance;
  const depth = hitsBox ? Math.max(near, 0) : floorDistance;
  return { a, b, hitsBox, depth };
}
// #endregion

// #region Shadow test
// Project the point into the light camera to find its texel, read what the map stores there, and compare it with the point's
// own depth. Farther than the stored depth by more than the bias means something nearer to the light is in the way.
export function shadowTest(point, res, bias) {
  const axes = lightAxes();
  const fromLight = sub(point, LIGHT_ORIGIN);
  const own = dot(fromLight, LIGHT_DIR);
  const a = dot(fromLight, axes.right);
  const b = dot(fromLight, axes.up);
  const i = Math.floor((a / COVER + 0.5) * res);
  const j = Math.floor((b / COVER + 0.5) * res);
  const inside = i >= 0 && i < res && j >= 0 && j < res;
  const stored = inside ? storedDepth(i, j, res).depth : own;
  const difference = own - stored;
  const inShadow = difference > bias;
  return { own, a, b, i, j, inside, stored, difference, inShadow };
}
// #endregion

// #region Shadow bias
// A floor tilted to the light changes its depth across a texel: the texel's width times the tangent of the angle between the
// floor's normal and the light. A bias of a texel and a half covers the offset between a texel's center and the point.
export function shadowBias(res, texels) {
  const texel = COVER / res;
  const cosine = -LIGHT_DIR[1];
  const perTexel = texel * Math.sqrt(1 - cosine * cosine) / cosine;
  const bias = texels * perTexel;
  return { texel, perTexel, bias };
}
// #endregion
