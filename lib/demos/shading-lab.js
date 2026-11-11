// shading-lab: why shading makes a shape, one lab (lib/core/lab.js). Three topics: a disk and a sphere under one light (frozen,
// the two pictures are the same; lit, the sphere's brightness varies because its normal does), an icosphere shaded with one
// normal per face or one per vertex, and a wall of bumps and dents that a light from below swaps. The computations are the
// WebGL program's, lib/programs/shading-lab/webgl/shading.js; the views are in shading-lab-views.js.
import { makeLab } from '../core/lab.js';
import { makeViews, KEYS } from './shading-lab-views.js';
import { injectCss } from './shading-lab-draw.js';

export const TITLE = 'Shading lab';
export const HUB_LINE = 'A textured sphere with its shading frozen is a flat disk; lit, its brightness varies with its normal. Facets from one normal per face, and the bump a light from below turns into a dent.';

const PROGRAM = {
  title: 'Shading lab: the whole program',
  base: new URL('../programs/shading-lab/', import.meta.url),
  tracks: [
    { id: 'webgl', label: 'WebGL · three.js', files: ['webgl/shading.js', 'webgl/scene.js', 'webgl/index.html'], run: 'webgl/index.html',
      note: 'Serve the course folder (python3 -m http.server) and open lib/programs/shading-lab/webgl/. shading.js holds every computation, and the demo calls these same functions; scene.js shows the disk and the sphere it shades.' },
    { id: 'unity', label: 'Unity · C#', files: ['unity/ShadingLab.cs', 'unity/ShadingLabScene.cs'],
      note: 'Put both files in Assets, put ShadingLabScene on an empty GameObject, press Play. ShadingLab.cs is shading.js, line for line where the languages allow. It has not been run in the Unity editor.' },
  ],
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p><b>Disk</b>: a flat disk and a sphere, seen straight on, under one light. Their outlines are the same circle. With the shading frozen
  (shading 0) each shows its base color alone; lit, each pixel is the base color times ka + (1 − ka) max(0, N·L). The strip below
  is the middle row seen from above: the disk's normals are parallel, the sphere's fan out. <b>Mesh</b>: an icosphere with one normal
  per triangle or one per vertex. <b>Read</b>: a wall of bumps and dents, and the light that swaps them.</p>
  <h4>Try this</h4>
  <p><b>Disk</b>: "plain and frozen": the two pictures are the same, pixel for pixel. Raise shading. Drag on a picture to move the light;
  "light behind" leaves a crescent. Press play on spin with shading 0: motion shows the shape too. <b>Mesh</b>: "20 faces, flat",
  then "20 faces, smooth", and orbit. <b>Read</b>: which cells are raised? Press "turned", then "show the truth".</p>
  <h4>The code</h4>
  <p>The code card is the program itself, in the track you choose, with each variable's current value beside its line.
  Colors are computed in linear light and encoded as sRGB codes for the screen.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

export const TOPICS = [{ id: 'disk', label: 'Disk or ball' }, { id: 'mesh', label: 'Facets' }, { id: 'read', label: 'Bump or dent' }];

export function allViews() {
  return makeViews();
}

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  const lab = makeLab(container, {
    stage, controls, name: 'shading-lab', topics: TOPICS, views: allViews(), keys: KEYS, program: PROGRAM,
    files: { webgl: 'webgl/shading.js', unity: 'unity/ShadingLab.cs' }, help: HELP_HTML,
    legend: 'drag a picture: move the light · hover: move the cross · in 3D, drag: turn · scroll: zoom · drag a handle: move it',
  });
  return lab;
}
