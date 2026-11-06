// vector-basics: one lab for the vector toolkit. Nine topics (points and vectors, frames, normalizing, the operations, the
// dot product, the cross product, lines and planes, relative position tests, interpolation), each with views from
// vector-basics-views.js. The runtime is lib/core/lab.js.
import { makeLab } from '../core/lab.js';
import { TOPICS, VIEWS, KEYS } from './vector-basics-views.js';

const PROGRAM = {
  title: 'Vector basics: the whole program',
  base: new URL('../programs/vector-basics/', import.meta.url),
  tracks: [
    { id: 'webgl', label: 'WebGL · three.js', files: ['webgl/vectorbasics.js', 'webgl/scene.js', 'webgl/index.html'], run: 'webgl/index.html',
      note: 'Serve the course folder (python3 -m http.server) and open lib/programs/vector-basics/webgl/. vectorbasics.js holds every computation, and the demo calls these same functions; scene.js draws one picture per topic.' },
    { id: 'unity', label: 'Unity · C#', files: ['unity/VectorBasics.cs', 'unity/VectorBasicsScene.cs'],
      note: 'Put both files in Assets, put VectorBasicsScene on an empty GameObject, press Play. VectorBasics.cs is vectorbasics.js, line for line where the languages allow. Unity\'s axes are left-handed: the numbers are the same, the pictures mirror images.' },
  ],
};
const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>The vector toolkit, one relationship at a time. Pick a topic, then a view. The picture, the formula with its numbers,
  the table and the code all follow the same values.</p>
  <h4>Changing the vectors</h4>
  <p><b>Drag a ball</b> at the tip of a vector or at a point. It moves in the plane facing the camera; hold <b>Shift</b> to keep
  it level. Drag anywhere else to turn the view. Or use the sliders and type a number in the box beside one (arrow keys step
  by 0.1, Shift by 1). Positions snap to 0.1, so exact relationships such as a·b = 0 can be reached; ⚙ changes the step.
  The buttons above the controls jump to the cases worth seeing.</p>
  <h4>Reading it</h4>
  <p>Colors match between the picture, the formulas and the code. <b>Hover</b> a term of a formula, a value, or a line of code,
  and everything else in the picture dims. The buttons at the bottom right look along an axis, and <b>LH</b> mirrors the
  picture onto Unity's left-handed axes: the numbers do not change.</p>
  <h4>Terms</h4>
  <p><b>Unit vector</b>: length 1; v̂ is v / |v|. <b>Orthonormal frame</b>: three unit axes, each square to the other two.
  <b>Signed distance</b>: positive on the side the normal points to. <b>Barycentric weights</b>: the weights of a triangle's
  corners that give a point; they sum to 1. <b>Skew lines</b>: lines that are not parallel and do not meet.
  <b>Lerp, nlerp, slerp</b>: linear interpolation, normalized linear interpolation, spherical interpolation.</p>
  <h4>Try this</h4>
  <p><b>Dot, angle</b>: a = (2, 1, 0), b = (1, 2, 1) gives a·b = 4 = 2.24 × 2.45 × 0.730, θ = 43.1°. "a ⟂ b" gives 0.
  <b>Cross, direction</b>: the same pair gives (1, −2, 3). Switch to LH and see which hand fits.
  <b>Points, what adds</b>: drag O and watch which point moves. <b>Position tests, line, line</b>: try the four presets, then
  drag out of "intersecting" and see how little it takes to become skew. <b>Interpolation, slerp</b>: "wide angle" separates
  the two curves in the chart.</p>
  <h4>The code</h4>
  <p>The code card is the program itself, in the track you choose, with each variable's current value beside its line. The
  WebGL values are the output of those lines; a test runs the C# on the same inputs and compares every number.
  <code>&lt;/&gt;</code> opens the whole program for both tracks.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

export function make(container, { stage = 'embed', controls = [] } = {}) {
  return makeLab(container, {
    stage, controls, name: 'vector-basics', topics: TOPICS, views: VIEWS, keys: KEYS, program: PROGRAM,
    files: { webgl: 'webgl/vectorbasics.js', unity: 'unity/VectorBasics.cs' },
    help: HELP_HTML,
    legend: 'drag a ball: move it · Shift: keep it level · drag elsewhere: turn · scroll zoom · WASD move · H home',
  });
}
