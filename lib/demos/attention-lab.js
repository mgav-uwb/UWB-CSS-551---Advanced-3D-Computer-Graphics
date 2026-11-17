// attention-lab: attention, queries, keys, values, softmax and the n² cost, one lab (lib/core/lab.js). Four topics: one query (the
// lecture's three tokens, the scores, the weights and the output; why the scores are divided by √d), every token (the n × n weights,
// the keys' projection, order and a positional encoding), cross-attention (image patches asking a caption's words) and the cost (the
// score matrix of a patched image). The computations are the WebGL program's, lib/programs/attention-lab/webgl/attentionlab.js;
// the views are in attention-lab-*.js.
import { makeLab } from '../core/lab.js';
import { makeViews, TOPICS, KEYS } from './attention-lab-views.js';
import { injectCss } from './attention-lab-draw.js';

export const TITLE = 'Attention Lab: Queries, Keys, Values, Softmax, the n² Cost';

const PROGRAM = {
  title: 'Attention lab: the whole program',
  base: new URL('../programs/attention-lab/', import.meta.url),
  tracks: [
    { id: 'webgl', label: 'WebGL · three.js', files: ['webgl/attentionlab.js', 'webgl/scene.js', 'webgl/index.html'], run: 'webgl/index.html',
      note: 'Serve the course folder (python3 -m http.server) and open lib/programs/attention-lab/webgl/. attentionlab.js holds every computation, and the demo calls these same functions; scene.js draws the lecture\'s three tokens, their keys, values and weights.' },
    { id: 'unity', label: 'Unity · C#', files: ['unity/AttentionLab.cs', 'unity/AttentionLabScene.cs'],
      note: 'Put both files in Assets, put AttentionLabScene on an empty GameObject, press Play. AttentionLab.cs is attentionlab.js, line for line where the languages allow. Not run in the Unity editor; the C# is compiled and its numbers compared with the JavaScript by the course tests.' },
  ],
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>Each token x has a query q = W<sub>q</sub> x, a key k = W<sub>k</sub> x and a value v = W<sub>v</sub> x. Token i scores every key,
  s<sub>ij</sub> = q<sub>i</sub> · k<sub>j</sub> / √d, turns the scores into weights α<sub>ij</sub> = softmax<sub>j</sub>(s<sub>ij</sub> / τ),
  and outputs y<sub>i</sub> = Σ<sub>j</sub> α<sub>ij</sub> v<sub>j</sub>. The softmax subtracts the largest score first, so the exponentials never overflow.</p>
  <h4>Topics</h4>
  <p><b>One query</b>: the lecture's three tokens. Drag a token, click one to make it the query, change the temperature τ. <b>Why √d</b>:
  random queries and keys at d from 1 to 256. <b>Every token</b>: the n × n weights for up to 8 tokens, with W<sub>k</sub> turned and
  stretched; then the same tokens in two orders, with and without a positional encoding. <b>Cross</b>: twelve patches of a tiny picture
  ask four words for their values; drag a word. <b>The cost</b>: an image side and a patch size give n tokens, n² scores and the bytes of one
  score matrix; click the picture to see one patch's row of weights.</p>
  <h4>Try this</h4>
  <p>One query, <b>slide: token 3</b> then <b>slide: token 1</b>: the lecture's numbers. <b>tokens doubled</b>: the weights sharpen to
  0.486, 0.029, 0.486. <b>a far token</b>: a long key takes the weight. Why √d, d = 256: undivided, one key takes almost everything.
  Every token, <b>W<sub>k</sub> scale 0</b>: every score is 0 and every output is the average of the values. Order, <b>add positions</b>: the outputs
  stop traveling with their tokens. The cost, <b>n = 1,024</b> then <b>n = 4,096</b>: a 16-fold step.</p>
  <h4>The code</h4>
  <p>The code card is the program itself, in the track you choose, with each variable's current value beside its line. A test runs the C#
  on the same inputs and compares every number. <code>&lt;/&gt;</code> opens the whole program for both tracks.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

export function allViews() {
  return makeViews();
}

export function make(container, { stage = 'embed', controls = [] } = {}) {
  injectCss();
  const lab = makeLab(container, {
    stage, controls, name: 'attention-lab', topics: TOPICS, views: allViews(), keys: KEYS, program: PROGRAM,
    files: { webgl: 'webgl/attentionlab.js', unity: 'unity/AttentionLab.cs' }, help: HELP_HTML,
    legend: 'drag a point: move a token · click a point: make it the query · hover a term in the rail: dim the rest of the picture',
  });
  return lab;
}
