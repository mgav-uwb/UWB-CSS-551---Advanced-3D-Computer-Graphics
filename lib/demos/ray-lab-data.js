// ray-lab-data: the triangle scenes the ray-lab demo (lib/demos/ray-lab.js) builds its bounding-volume hierarchies over, and the
// seeded generators behind them. The program (lib/programs/ray-lab/webgl/raylab.js) takes any list of triangles; these are the lists.
// deckTriangles is the 14 triangles of the course text's BVH figure (textbook/figures/rt-bvh.svg, tools/gen-textbook-figures-motion.mjs),
// given a small thickness in z so that the 3D Moller-Trumbore test applies: their boxes, and so the box and triangle test counts,
// are those of the 2D figure.

/** the generator the figure used (a mulberry32 variant): a function returning numbers in [0, 1) */
export function figureRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Park-Miller, the generator the course's two-track programs use */
export function parkMiller(seed = 1) {
  let s = (Math.floor(Math.abs(seed)) % 2147483646) + 1;
  return function next() {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** the figure's 14 triangles, in the plane z = 0 up to a thickness of 0.15: the ray y = 0.8 + 0.42 x, z = 0 crosses their boxes */
export function deckTriangles() {
  const rnd = figureRng(7);
  const tris = [];
  for (let i = 0; i < 14; i++) {
    const cx = 0.5 + rnd() * 9;
    const cy = 0.5 + rnd() * 5;
    const tri = [];
    for (let k = 0; k < 3; k++) {
      const x = cx + (rnd() - 0.5) * 1.4;
      const y = cy + (rnd() - 0.5) * 1.2;
      tri.push([x, y, [-0.15, 0.15, 0][k]]);
    }
    tris.push(tri);
  }
  return tris;
}

/** the figure's ray */
export const DECK_RAY = { o: [0, 0.8, 0], d: [0.9219544457292887, 0.3872208672063013, 0] };

/** n small triangles scattered about a center, each with corners within `spread` of its own center */
function scatter(rnd, n, center, radius, spread, tris) {
  for (let i = 0; i < n; i++) {
    let p;
    do {
      p = [rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1];
    } while (p[0] * p[0] + p[1] * p[1] + p[2] * p[2] > 1);
    const c = [center[0] + p[0] * radius, center[1] + p[1] * radius, center[2] + p[2] * radius];
    const tri = [];
    for (let k = 0; k < 3; k++) tri.push([c[0] + (rnd() - 0.5) * spread, c[1] + (rnd() - 0.5) * spread, c[2] + (rnd() - 0.5) * spread]);
    tris.push(tri);
  }
}

/** two dense clusters of unequal size (100 and 40) and a thin scatter between them: the median split cuts the larger cluster, the surface area heuristic cuts between them */
export function clusteredTriangles(seed = 5) {
  const rnd = parkMiller(seed);
  const tris = [];
  scatter(rnd, 100, [-2.4, -0.8, 0], 1.1, 0.5, tris);
  scatter(rnd, 40, [2.4, 1.1, 0.4], 1.1, 0.5, tris);
  scatter(rnd, 20, [0, 0, 0], 4, 0.5, tris);
  return tris;
}

/** n triangles spread evenly through a cube of half-width 3 */
export function spreadTriangles(n = 200, seed = 11) {
  const rnd = parkMiller(seed);
  const tris = [];
  for (let i = 0; i < n; i++) scatter(rnd, 1, [rnd() * 6 - 3, rnd() * 6 - 3, rnd() * 6 - 3], 0, 0.45, tris);
  return tris;
}
