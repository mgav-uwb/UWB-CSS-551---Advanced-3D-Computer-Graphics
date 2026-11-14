// light-lab: light at a surface point, one lab (lib/core/lab.js). Four topics: the light sources (directional, point, spot, area, with their falloff),
// the local model at a point (Lambert, Phong, Blinn, ambient, the sum, shading per vertex and per pixel), tone mapping of an unbounded sum, and the
// sRGB curve with what goes wrong when a blend or a lighting sum is done on codes. The computations are the WebGL program's,
// lib/programs/light-lab/webgl/lightlab.js; the views are in light-lab-views.js and light-lab-views-img.js.
import { makeLab } from '../core/lab.js';
import { makeViews, KEYS } from './light-lab-views.js';
import { makeImageViews } from './light-lab-views-img.js';
import { injectCss, RES_DEFAULT } from './light-lab-images.js';

export const TITLE = 'Light lab';
export const HUB_LINE = 'Light sources and falloff, Lambert, Phong and Blinn at a clicked point, Gouraud against Phong shading, HDR and tone maps, and the sRGB curve.';

const PROGRAM = {
  title: 'Light lab: the whole program',
  base: new URL('../programs/light-lab/', import.meta.url),
  tracks: [
    { id: 'webgl', label: 'WebGL · three.js', files: ['webgl/lightlab.js', 'webgl/scene.js', 'webgl/index.html'], run: 'webgl/index.html',
      note: 'Serve the course folder (python3 -m http.server) and open lib/programs/light-lab/webgl/. lightlab.js holds every computation, and the demo calls these same functions; scene.js colors a sphere with them and draws N, L, V and R at the marked point.' },
    { id: 'unity', label: 'Unity · C#', files: ['unity/LightLab.cs', 'unity/LightLabScene.cs'],
      note: 'Put both files in Assets, put LightLabScene on an empty GameObject, press Play. LightLab.cs is lightlab.js, line for line where the languages allow. It has not been run in the Unity editor.' },
  ],
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Light from its source to the pixel value, in four topics. <b>Lights</b>: direction, distance, falloff, the spot's soft edge, an area light. <b>Local</b>: the equation at one point, then per vertex against per pixel.
  <b>Tone</b>: a scene with values far above 1 shown through three curves. <b>Gamma</b>: the sRGB curve, and blending or lighting done on codes.</p>
  <h4>Try this</h4>
  <p><b>Local, the equation at a point</b>: click the sphere to move the marked point; drag the light and the eye; the preset "the marked point" gives N·L 0.988, R·V 0.879 and the sum (0.964, 0.409, 0.343).
  <b>Per vertex, per pixel</b>: "highlight between vertices" on 20 triangles. <b>HDR</b>: exposure 1, then 0.1; click the sun. <b>Gamma, lighting</b>: albedo 200 at N·L 0.5 gives code 146 against 100.</p>
  <h4>The code</h4>
  <p>The code card is the program itself, in the track you choose, with each variable's current value beside its line. A test runs the C# on the same inputs and compares every number.
  Physically based shading (Fresnel, the normal distribution, the geometry term) is not in this lab: the lecture teaches it in the next topic.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

export const TOPICS = [{ id: 'lights', label: 'Lights' }, { id: 'local', label: 'Local' }, { id: 'tone', label: 'Tone' }, { id: 'gamma', label: 'Gamma' }];

export function allViews() {
  const order = ['lights.types', 'lights.spot', 'lights.area', 'local.point', 'local.blinn', 'local.shading', 'tone.hdr', 'gamma.curve', 'gamma.blend', 'gamma.light'];
  const res = { step: RES_DEFAULT };   // the resolution of every per-pixel image, one value for the lab: switching views keeps it
  const all = [...makeViews(res), ...makeImageViews(res)];
  return order.map((id) => all.find((v) => v.id === id));
}

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  const lab = makeLab(container, {
    stage, controls, name: 'light-lab', topics: TOPICS, views: allViews(), keys: KEYS, program: PROGRAM,
    files: { webgl: 'webgl/lightlab.js', unity: 'unity/LightLab.cs' }, help: HELP_HTML,
    legend: 'click the sphere: move the marked point · drag: turn · scroll zoom · drag a handle: move it',
  });
  return lab;
}
