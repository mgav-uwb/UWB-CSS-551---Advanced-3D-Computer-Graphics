// shading.js: why a lit sphere reads as a ball and an unlit one as a flat disk. A disk and a sphere, seen straight on, cover the
// same circle of pixels; the disk has one normal, the sphere a different normal at every pixel. Lambert's term turns the normal
// into a brightness, so the sphere's brightness varies and the disk's does not. Also: the texture's squeeze near the sphere's rim,
// an icosphere shaded with one normal per face or one per vertex, and the bump that a light from below turns into a dent.
// No three.js here: vectors and colors are arrays [x, y, z] and [r, g, b] in linear light unless a name says "code". scene.js
// draws it, and the course demo (lib/demos/shading-lab.js) runs these same functions, so a value the demo prints beside a line
// of code is the value that line computed. No function changes its arguments.
// The same functions, line for line where the languages allow, are ShadingLab.cs in ../unity/
// (lib/tests/programs/shading-lab.test.mjs runs both on the same inputs and compares the numbers).

// #region Settings and vector helpers
// Below EPS a length counts as zero. Angles are in degrees. Unity's Vector3 has these operations built in.
export const EPS = 1e-6;
export const DEG = 180 / Math.PI;

export function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
export function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
export function scale(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
export function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
export function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
export function length(a) { return Math.sqrt(dot(a, a)); }
export function normalize(a) {
  const l = length(a);
  return l > EPS ? scale(a, 1 / l) : [0, 0, 0];
}
export function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
// #endregion

// #region The light's direction
// A directional light, given by two angles. L points toward the light. The eye looks down -z, so az 0 and el 0 put the light
// behind the eye; az turns it toward +x (the right of the picture), el raises it toward +y. az 180 puts it behind the shape.
export function lightFromAngles(azDeg, elDeg) {
  const az = azDeg / DEG;
  const el = elDeg / DEG;
  const L = [Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)];
  return L;
}
// #endregion

// #region Normals: a disk and a sphere
// Both shapes are seen straight on and cover the unit circle of the picture, so their outlines are the same circle. A pixel's
// (x, y) runs over [-1, 1]. The disk is flat: the same normal at every pixel. On the unit sphere the point under the pixel is
// (x, y, z) with z = sqrt(1 - x^2 - y^2), and a unit sphere's normal at a point is the point itself.
export function insideCircle(x, y) { return x * x + y * y <= 1; }
export function diskNormal(x, y) { return [0, 0, 1]; }
export function sphereNormal(x, y) {
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  return [x, y, z];
}
// #endregion

// #region Texture coordinates
// The sphere wraps the image around itself: u is the longitude, v the latitude, after the sphere turns by spin about y. The
// disk carries the image flat, scaled to match the sphere at its center: one unit of x covers what one radian of longitude
// covers there. Toward the sphere's rim the image is squeezed; the disk's is not. That squeeze is the one difference a texture
// makes between the two pictures.
export function diskUV(x, y, spinDeg) {
  const u = x / (2 * Math.PI) + 0.5 + spinDeg / 360;
  const v = y / Math.PI + 0.5;
  return [u, v];
}
export function sphereUV(N, spinDeg) {
  const lon = Math.atan2(N[0], N[2]) + spinDeg / DEG;
  const lat = Math.asin(clamp(N[1], -1, 1));
  const u = lon / (2 * Math.PI) + 0.5;
  const v = lat / Math.PI + 0.5;
  return [u, v];
}
// #endregion

// #region The texture
// The base color (albedo) at (u, v), in linear light. 'plain' is one color everywhere: nothing printed, so the outline and
// the shading are the only cues. 'checker' has 8 squares around and 4 from pole to pole, square at the sphere's center.
// 'planet' is land, sea and ice from three sine waves, periodic in u so the sphere has no seam.
export function albedo(kind, u, v) {
  if (kind === 'checker') {
    const cu = Math.floor(u * 8);
    const cv = Math.floor(v * 4);
    const even = (((cu + cv) % 2) + 2) % 2 === 0;
    return even ? [0.8, 0.74, 0.6] : [0.1, 0.2, 0.5];
  }
  if (kind === 'planet') {
    const t = 2 * Math.PI;
    const h = Math.sin(t * 3 * u + 2 * Math.sin(t * 2 * v)) + 0.6 * Math.sin(t * (5 * u + 3 * v)) + 0.4 * Math.cos(t * (2 * u - 5 * v));
    if (Math.abs(v - 0.5) > 0.4) return [0.85, 0.88, 0.9];
    return h > 0.45 ? [0.3, 0.42, 0.12] : [0.04, 0.12, 0.4];
  }
  return [0.75, 0.33, 0.12];
}
// #endregion

// #region Shading at a point
// Lambert's term with an ambient floor: lit = ka + (1 - ka) max(0, N . L), 1 where the surface faces the light and ka where it
// turns away. amount blends it in: amount 0 freezes the shading at 1 everywhere, which shows the base color alone, a texture
// with no light; amount 1 is the lit surface.
export function brightness(N, L, ka, amount) {
  const nDotL = dot(N, L);
  const lambert = Math.max(0, nDotL);
  const lit = ka + (1 - ka) * lambert;
  const b = (1 - amount) + amount * lit;
  return { nDotL, lambert, lit, b };
}
// #endregion

// #region Shade a pixel
// One pixel of either picture, inside the circle: its normal, its texture coordinates, its base color, its brightness, and the
// color: base color times brightness, in linear light, then encoded as sRGB codes 0 to 255 for the screen. The light is L,
// the ambient floor ka, the shading amount amount, the sphere's turn spin, and the texture's name texture.
export function srgbCode(c) {
  const x = clamp(c, 0, 1);
  const s = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  return Math.round(255 * s);
}
export function shadePixel(shape, x, y, L, ka, amount, spin, texture) {
  const N = shape === 'disk' ? diskNormal(x, y) : sphereNormal(x, y);
  const uv = shape === 'disk' ? diskUV(x, y, spin) : sphereUV(N, spin);
  const baseColor = albedo(texture, uv[0], uv[1]);
  const b = brightness(N, L, ka, amount).b;
  const color = scale(baseColor, b);
  const code = [srgbCode(color[0]), srgbCode(color[1]), srgbCode(color[2])];
  return { N, uv, baseColor, b, color, code };
}
// #endregion

// #region Two pictures, pixel by pixel
// renderPicture shades an n by n picture of [-1, 1] x [-1, 1], top row first, three codes per pixel; outside the circle it
// is the background, code 0. countDifferent counts the pixels whose codes differ in any channel.
export function renderPicture(shape, L, ka, amount, spin, texture, n) {
  const codes = new Array(n * n * 3).fill(0);
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const x = -1 + (2 * col + 1) / n;
      const y = 1 - (2 * row + 1) / n;
      if (!insideCircle(x, y)) continue;
      const code = shadePixel(shape, x, y, L, ka, amount, spin, texture).code;
      const at = (row * n + col) * 3;
      codes[at] = code[0];
      codes[at + 1] = code[1];
      codes[at + 2] = code[2];
    }
  }
  return codes;
}
export function countDifferent(a, b) {
  let count = 0;
  const total = a.length / 3;
  for (let i = 0; i < total; i++) {
    if (a[3 * i] !== b[3 * i] || a[3 * i + 1] !== b[3 * i + 1] || a[3 * i + 2] !== b[3 * i + 2]) count++;
  }
  return { count, total };
}
// #endregion

// #region The middle row
// The brightness along the picture's middle row, y = 0, at n points from x = -1 to 1. The disk's normal never changes, so
// neither does its brightness: one value. The sphere's normal turns from (-1, 0, 0) through (0, 0, 1) to (1, 0, 0) along
// the row, and its brightness follows N . L.
export function middleRow(L, ka, amount, n) {
  const disk = [];
  const sphere = [];
  for (let i = 0; i < n; i++) {
    const x = -1 + (2 * i) / (n - 1);
    disk.push(brightness(diskNormal(x, 0), L, ka, amount).b);
    sphere.push(brightness(sphereNormal(x, 0), L, ka, amount).b);
  }
  const diskSpread = Math.max(...disk) - Math.min(...disk);
  const sphereLow = Math.min(...sphere);
  const sphereHigh = Math.max(...sphere);
  return { disk, sphere, diskSpread, sphereLow, sphereHigh };
}
// #endregion

// #region An icosphere
// The icosahedron's 12 vertices are the corners of three golden rectangles, pushed onto the unit sphere; its 20 triangles
// wind counterclockwise seen from outside. subdivide splits each triangle into 4 at its edge midpoints and pushes the new
// vertices onto the sphere; an edge's midpoint is made once and shared by the two triangles on that edge. A mesh is its
// vertex list and its triangle list, three vertex indices each.
export function icosahedron() {
  const p = (1 + Math.sqrt(5)) / 2;
  const raw = [[-1, p, 0], [1, p, 0], [-1, -p, 0], [1, -p, 0], [0, -1, p], [0, 1, p], [0, -1, -p], [0, 1, -p],
    [p, 0, -1], [p, 0, 1], [-p, 0, -1], [-p, 0, 1]];
  const vertices = raw.map(normalize);
  const triangles = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6],
    [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  return { vertices, triangles };
}
export function subdivide(oldVertices, oldTriangles) {
  const vertices = oldVertices.slice();
  const triangles = [];
  const made = new Map();
  function midpoint(i, j) {
    const key = i < j ? i + ',' + j : j + ',' + i;
    if (!made.has(key)) {
      made.set(key, vertices.length);
      vertices.push(normalize(scale(add(vertices[i], vertices[j]), 0.5)));
    }
    return made.get(key);
  }
  for (const t of oldTriangles) {
    const ab = midpoint(t[0], t[1]);
    const bc = midpoint(t[1], t[2]);
    const ca = midpoint(t[2], t[0]);
    triangles.push([t[0], ab, ca], [t[1], bc, ab], [t[2], ca, bc], [ab, bc, ca]);
  }
  return { vertices, triangles };
}
// #endregion

// #region Face normals and vertex normals
// faceNormal is the cross product of two edges, normalized: one normal for the whole triangle, so the whole triangle gets one
// brightness and the eye sees a flat facet. vertexNormals gives each vertex the sum of the (unnormalized, so area-weighted)
// normals of the triangles around it, normalized. Shaded at the vertices and blended across each triangle, the brightness
// changes inside a triangle, and the facets fade while the outline stays a polygon.
export function faceNormal(a, b, c) {
  const n = cross(sub(b, a), sub(c, a));
  return normalize(n);
}
export function vertexNormals(vertices, triangles) {
  const sums = vertices.map(function () { return [0, 0, 0]; });
  for (const t of triangles) {
    const a = vertices[t[0]];
    const areaNormal = cross(sub(vertices[t[1]], a), sub(vertices[t[2]], a));
    for (const i of t) sums[i] = add(sums[i], areaNormal);
  }
  const normals = sums.map(normalize);
  return normals;
}
// #endregion

// #region Bump or dent
// A round bump standing out of a wall and a round dent pressed into it, seen straight on. Under the pixel (x, y) the bump's
// normal is (x, y, z) and the dent's is (-x, -y, z), z = sqrt(1 - x^2 - y^2); off the circle it is the wall's, (0, 0, 1).
// The light comes from angle degrees around the picture (90 is from above) and tilt degrees off the line of sight. Turning it
// half a turn about the line of sight, (Lx, Ly, Lz) to (-Lx, -Ly, Lz), turns every N . L of the bump into the dent's: a bump
// lit from below and a dent lit from above make the same picture.
export function lightInPicture(angleDeg, tiltDeg) {
  const a = angleDeg / DEG;
  const t = tiltDeg / DEG;
  return [Math.sin(t) * Math.cos(a), Math.sin(t) * Math.sin(a), Math.cos(t)];
}
export function turnHalf(L) { return [-L[0], -L[1], L[2]]; }
export function wallNormal(x, y, dent) {
  if (!insideCircle(x, y)) return [0, 0, 1];
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  const s = dent ? -1 : 1;
  return [s * x, s * y, z];
}
// #endregion

// #region The wall, pixel by pixel
// An n by n picture of one bump or dent with a margin of wall around it: the picture spans [-margin, margin] in x and y. The
// wall is a gray of albedo 0.7, so a code is the same in all three channels.
export function renderWall(dent, L, ka, n, margin) {
  const codes = new Array(n * n * 3).fill(0);
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const x = margin * (-1 + (2 * col + 1) / n);
      const y = margin * (1 - (2 * row + 1) / n);
      const N = wallNormal(x, y, dent);
      const b = brightness(N, L, ka, 1).b;
      const code = srgbCode(0.7 * b);
      const at = (row * n + col) * 3;
      codes[at] = code;
      codes[at + 1] = code;
      codes[at + 2] = code;
    }
  }
  return codes;
}
// #endregion
