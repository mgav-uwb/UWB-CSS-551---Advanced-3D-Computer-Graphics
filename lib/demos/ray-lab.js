// ray-lab: a ray tracer's parts, one lab (lib/core/lab.js). Five topics: a ray against a sphere, a triangle and a box (the quadratic's
// discriminant, Moller-Trumbore, the slabs); Whitted's tree of rays over a small scene that the lab renders to an image, one pixel's tree
// shown in 3D; Snell's law, total internal reflection and Fresnel; shadow acne and the epsilon that cures it; and a bounding-volume hierarchy
// with a stepped traversal and the surface area heuristic. The computations are the WebGL program's, lib/programs/ray-lab/webgl/raylab.js;
// the views are ray-lab-views.js, ray-lab-whitted.js and ray-lab-bvh.js, the triangles ray-lab-data.js.
import { makeLab } from '../core/lab.js';
import { makeViews, TOPICS, KEYS } from './ray-lab-views.js';
import { injectCss } from './ray-lab-ui.js';

export const TITLE = 'Ray lab: intersections, Whitted, acne, BVH';
export const HUB_LINE = 'Drag a ray against a sphere, triangle and box; click a pixel of a Whitted render for its tree of rays; bend light with Snell and Fresnel; turn shadow acne on and off; step a ray through a bounding-volume hierarchy (BVH).';

const PROGRAM = {
  title: 'Ray lab: the whole program',
  base: new URL('../programs/ray-lab/', import.meta.url),
  tracks: [
    { id: 'webgl', label: 'WebGL · three.js', files: ['webgl/raylab.js', 'webgl/scene.js', 'webgl/index.html'], run: 'webgl/index.html',
      note: 'Serve the course folder (python3 -m http.server) and open lib/programs/ray-lab/webgl/. raylab.js holds every computation, and the demo calls these same functions; scene.js renders the Whitted scene to a canvas a few rows per frame and prints the tree of a clicked pixel.' },
    { id: 'unity', label: 'Unity · C#', files: ['unity/RayLab.cs', 'unity/RayLabScene.cs'],
      note: 'Put both files in Assets, put RayLabScene on an empty GameObject, press Play. RayLab.cs is raylab.js, line for line where the languages allow. It has not been run in the Unity editor; it compiles against a stand-in for the Unity API and a test runs it on the same inputs as the JavaScript and compares every number. A C# float is already 32-bit, so the 32-bit switch of the acne view has no effect there.' },
  ],
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>The parts of a ray tracer, one at a time, each with the numbers it computes and the code that computes them.</p>
  <h4>Rays</h4>
  <p>Drag <b>o</b> (the origin) and <b>d</b> (the direction; only its direction counts) and the object. The <b>sphere</b> shows the quadratic and its
  discriminant, <b>triangle</b> the Möller–Trumbore solve and where the hit falls in (u, v), <b>box</b> the three slabs and where their intervals overlap. Each
  status line names the outcome: hit, miss, origin inside, object behind the origin, parallel.</p>
  <h4>Whitted</h4>
  <p>The image is rendered by the program, 96 × 60 pixels, a few rows at a time; moving the light or the depth stops it and starts again. <b>Click a pixel</b>:
  its tree of rays is drawn in 3D, numbered as in the list, and the pixel's color is the sum of accumulated weight × local term over the tree. Hover a row to
  find its ray. Lower the depth limit to cut the tree.</p>
  <h4>Glass, Acne</h4>
  <p><b>Glass</b>: angle and indices; past the critical angle the refracted ray vanishes and all the light reflects. <b>Acne</b>: the ε slider, 32-bit against
  64-bit hit points, and the two cures. Click a pixel to see how far its stored hit point is from the surface.</p>
  <h4>BVH</h4>
  <p><b>Traverse a ray</b> steps through the boxes and triangles one test at a time, with the count against brute force. <b>Surface area heuristic</b> prices
  a cut of the root; <b>by the numbers</b> is the same formula with the deck's figures.</p>
  <h4>The code</h4>
  <p>The code card is the program itself, in the track you choose, with each variable's current value beside its line. A test runs the C# on the same inputs and
  compares every number. <code>&lt;/&gt;</code> opens the whole program for both tracks.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  const views = makeViews();
  return makeLab(container, {
    stage, controls, name: 'ray-lab', topics: TOPICS, views, keys: KEYS, program: PROGRAM,
    files: { webgl: 'webgl/raylab.js', unity: 'unity/RayLab.cs' },
    help: HELP_HTML,
    legend: 'drag the points: o, d, the objects · click the image: pick a pixel · scroll zoom · WASD move · H home',
  });
}
