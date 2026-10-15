// football-code: the football demo's code window. It shows the whole program students get, read from the
// files themselves (lib/programs/football/: webgl/ and unity/), by file or by section: a section is what the
// file marks with "#region Name" ... "#endregion" (// #region in JavaScript, #region in C#, which editors
// fold). A third tab lists the model files (lib/assets/models/football/) and how each track loads them.
// openCodeWindow(host) overlays host (position: relative) until Esc, ×, or a click on the backdrop.

const BASE = new URL('../programs/football/', import.meta.url);
const MODELS = new URL('../assets/models/football/', import.meta.url);

const TRACKS = {
  webgl: { label: 'WebGL · three.js', files: ['webgl/scene.js', 'webgl/pass.js', 'webgl/index.html'],
    note: 'Serve the course folder (python3 -m http.server) and open lib/programs/football/webgl/. pass.js builds every matrix; scene.js copies them onto meshes and the camera.' },
  unity: { label: 'Unity · C#', files: ['unity/PassScene.cs', 'unity/Pass.cs'],
    note: 'Import the model folder into Assets, put PassScene on an empty GameObject, drag the football model onto Football Prefab, press Play. Pass.cs is the same model as pass.js, line for line.' },
};

const KEYWORDS = {
  js: 'import|from|export|const|let|var|function|return|if|else|for|of|in|new|class|constructor|this|switch|case|default|break|true|false|null|undefined|typeof|async|await',
  cs: 'using|public|private|static|readonly|const|class|struct|enum|void|float|int|bool|string|new|return|if|else|for|foreach|in|switch|case|default|break|true|false|null|this|var',
  html: 'html|head|body|meta|title|style|script|div',
};

const CSS = `
.fbc-back { position: absolute; inset: 0; z-index: 50; background: rgba(5,6,9,0.72); display: flex; padding: 14px; }
.fbc-win { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #0f1117; border: 1px solid #2f3646;
  border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); overflow: hidden; color: #e7eaf0;
  font: 13px/1.4 -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; text-align: left; }
.fbc-head { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-bottom: 1px solid #262a35; flex-wrap: wrap; }
.fbc-head h3 { margin: 0 10px 0 0; font-size: 14px; color: #e7eaf0; text-transform: none; letter-spacing: 0; }
.fbc-tab { background: #14161d; color: #8b93a7; border: 1px solid #262a35; border-radius: 5px; padding: 5px 10px;
  font: 600 12px/1 -apple-system, Segoe UI, Roboto, sans-serif; cursor: pointer; }
.fbc-tab.on { background: #1c2433; color: #e7eaf0; border-color: #3a4c6e; }
.fbc-close { margin-left: auto; background: none; border: none; color: #8b93a7; font-size: 20px; cursor: pointer; line-height: 1; }
.fbc-body { flex: 1; display: flex; min-height: 0; }
.fbc-side { flex: 0 0 210px; overflow-y: auto; border-right: 1px solid #262a35; padding: 8px 6px; }
.fbc-file { font: 600 12px/1.3 'SF Mono', Menlo, Consolas, monospace; color: #c7cdda; padding: 5px 6px; border-radius: 4px; cursor: pointer; }
.fbc-sec { font-size: 12px; color: #8b93a7; padding: 3px 6px 3px 16px; border-radius: 4px; cursor: pointer; }
.fbc-file:hover, .fbc-sec:hover { background: #1c1f28; }
.fbc-file.on, .fbc-sec.on { background: #1c2433; color: #e7eaf0; }
.fbc-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.fbc-bar { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-bottom: 1px solid #262a35; font-size: 12px; color: #8b93a7; flex-wrap: wrap; }
.fbc-bar a, .fbc-bar button { color: #7ee787; background: none; border: 1px solid #2d6b46; border-radius: 4px; padding: 2px 8px;
  font: 12px/1.4 -apple-system, Segoe UI, Roboto, sans-serif; cursor: pointer; text-decoration: none; }
.fbc-note { padding: 6px 10px 0; font-size: 12px; color: #9aa3b8; }
.fbc-code { flex: 1; overflow: auto; margin: 0; padding: 8px 0; font: 12px/1.5 'SF Mono', Menlo, Consolas, monospace;
  color: #d6dbe5; background: #0b0c10; white-space: pre; tab-size: 4; }
.fbc-ln { display: inline-block; width: 3.4em; padding-right: 10px; text-align: right; color: #4a5266; user-select: none; }
.fbc-c { color: #7d8799; font-style: italic; } .fbc-s { color: #a5d6a7; } .fbc-n { color: #f2a65a; } .fbc-k { color: #8ab4ff; }
.fbc-doc { flex: 1; overflow: auto; padding: 10px 14px; font-size: 13px; line-height: 1.5; color: #d3d8e3; }
.fbc-doc h4 { margin: 12px 0 4px; font-size: 13px; color: #e7eaf0; } .fbc-doc a { color: #7ee787; }
.fbc-doc pre { background: #0b0c10; border: 1px solid #262a35; border-radius: 4px; padding: 6px 8px; font: 12px/1.45 'SF Mono', Menlo, monospace; white-space: pre; overflow-x: auto; }
.fbc-doc code { font-family: 'SF Mono', Menlo, monospace; color: #e6d96b; }
`;

const cache = new Map();
async function source(file) {
  if (!cache.has(file)) cache.set(file, fetch(new URL(file, BASE)).then((r) => (r.ok ? r.text() : `// could not load ${file} (${r.status})`)));
  return cache.get(file);
}

/** the "#region Name" ... "#endregion" sections of a file: [{ name, from, to }] as line indices. */
function regions(text) {
  const lines = text.split('\n');
  const out = [];
  let open = null;
  lines.forEach((line, i) => {
    const m = line.match(/^\s*(?:\/\/\s*)?#region\s+(.*)$/);
    if (m) open = { name: m[1].trim(), from: i };
    else if (open && /^\s*(?:\/\/\s*)?#endregion/.test(line)) { out.push({ ...open, to: i }); open = null; }
  });
  return out;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** a light highlighter: comments, strings, numbers, keywords. */
function highlight(text, lang) {
  const kw = KEYWORDS[lang] || KEYWORDS.js;
  const comment = lang === 'html' ? '<!--[\\s\\S]*?-->|\\/\\/[^\\n]*' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';
  const re = new RegExp(`(${comment})|("(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)|\\b(\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?f?)\\b|\\b(${kw})\\b`, 'g');
  let out = '', last = 0;
  for (const m of text.matchAll(re)) {
    out += esc(text.slice(last, m.index));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : 'k';
    out += `<span class="fbc-${cls}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}

function numbered(html, firstLine) {
  return html.split('\n').map((line, i) => `<span class="fbc-ln">${firstLine + i}</span>${line}`).join('\n');
}

const MODEL_DOC = `
  <p>The ball is <b>"Football" by rnepb13</b>, from BlendSwap, licensed Creative Commons Attribution 3.0 (credit
  rnepb13 in anything you make with it). For this course it was converted from Blender to glTF and OBJ and scaled
  to 0.28 m (<code>tools/convert-football-blend.py</code>). Its own frame: origin at the center, long axis on
  <code>z</code>, laces on <code>+y</code>, meters: 0.28 m tip to tip, 0.162 m across.</p>
  <p><a href="${new URL('football.glb', MODELS).href}">football.glb</a> (glTF binary, everything inside) ·
  <a href="${new URL('football.obj', MODELS).href}">football.obj</a> +
  <a href="${new URL('football.mtl', MODELS).href}">football.mtl</a> ·
  <a href="${new URL('football_albedo.jpg', MODELS).href}">football_albedo.jpg</a> ·
  <a href="${new URL('football_normal.jpg', MODELS).href}">football_normal.jpg</a> (normal map) ·
  <a href="${new URL('BlenderFootball.blend', MODELS).href}">BlenderFootball.blend</a> (the original) ·
  <a href="${new URL('BLENDSWAP_LICENSE.txt', MODELS).href}">license</a> ·
  <a href="${new URL('FOOTBALL.md', MODELS).href}">FOOTBALL.md</a></p>
  <h4>WebGL (three.js)</h4>
  <pre>import { GLTFLoader } from '../../../vendor/GLTFLoader.js';
new GLTFLoader().load('football.glb', onLoaded);   // gltf.scene is the ball</pre>
  <h4>Unity</h4>
  <p>Drag <code>football.obj</code>, <code>football.mtl</code> and the two JPEGs into <code>Assets</code> together:
  Unity imports the OBJ with its three materials (leather, white stripe, laces). If the leather comes in plain, drop
  <code>football_albedo.jpg</code> on its Albedo (Base Map) and <code>football_normal.jpg</code> on its Normal Map.
  The ball is life size, so it is small next to Unity's default 1 m cube.</p>`;

export function openCodeWindow(host) {
  if (!document.getElementById('fbc-css')) {
    const st = document.createElement('style');
    st.id = 'fbc-css';
    st.textContent = CSS;
    document.head.appendChild(st);
  }
  host.style.position = 'relative';
  const back = document.createElement('div');
  back.className = 'fbc-back';
  back.innerHTML = `<div class="fbc-win" role="dialog" aria-label="The whole program">
    <div class="fbc-head"><h3>The whole program</h3></div>
    <div class="fbc-body"><div class="fbc-side"></div><div class="fbc-main"></div></div></div>`;
  host.appendChild(back);
  const win = back.querySelector('.fbc-win');
  const head = back.querySelector('.fbc-head');
  const side = back.querySelector('.fbc-side');
  const main = back.querySelector('.fbc-main');
  for (const ev of ['mousedown', 'wheel', 'click']) win.addEventListener(ev, (e) => e.stopPropagation());
  back.addEventListener('mousedown', (e) => { e.stopPropagation(); if (e.target === back) close(); });

  const tabs = {};
  for (const [id, label] of [['webgl', TRACKS.webgl.label], ['unity', TRACKS.unity.label], ['models', 'Model files']]) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'fbc-tab';
    b.textContent = label;
    b.addEventListener('click', () => showTrack(id));
    head.appendChild(b);
    tabs[id] = b;
  }
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'fbc-close';
  x.setAttribute('aria-label', 'Close');
  x.textContent = '×';
  x.addEventListener('click', close);
  head.appendChild(x);

  function onKey(e) {
    if (e.key === 'Escape') { close(); e.stopPropagation(); e.preventDefault(); }
  }
  document.addEventListener('keydown', onKey, true);
  function close() {
    document.removeEventListener('keydown', onKey, true);
    back.remove();
  }

  async function showTrack(id) {
    for (const [k, b] of Object.entries(tabs)) b.classList.toggle('on', k === id);
    side.innerHTML = '';
    main.innerHTML = '';
    if (id === 'models') {
      side.style.display = 'none';
      main.innerHTML = `<div class="fbc-doc">${MODEL_DOC}</div>`;
      return;
    }
    side.style.display = '';
    const track = TRACKS[id];
    const items = [];
    for (const file of track.files) {
      const text = await source(file);
      const lang = file.endsWith('.cs') ? 'cs' : file.endsWith('.html') ? 'html' : 'js';
      const f = document.createElement('div');
      f.className = 'fbc-file';
      f.textContent = file.split('/')[1];
      f.title = 'the whole file';
      side.appendChild(f);
      items.push({ el: f, file, text, lang, from: 0, to: text.split('\n').length - 1, label: 'whole file' });
      for (const r of regions(text)) {
        const e = document.createElement('div');
        e.className = 'fbc-sec';
        e.textContent = r.name;
        side.appendChild(e);
        items.push({ el: e, file, text, lang, from: r.from, to: r.to, label: r.name });
      }
    }
    for (const it of items) it.el.addEventListener('click', () => showItem(it));
    showItem(items[0]);

    function showItem(it) {
      for (const o of items) o.el.classList.toggle('on', o === it);
      const lines = it.text.split('\n').slice(it.from, it.to + 1).join('\n');
      const raw = new URL(it.file, BASE).href;
      main.innerHTML = `<div class="fbc-note">${track.note}</div>
        <div class="fbc-bar"><span>${it.file}${it.label === 'whole file' ? '' : ` · ${esc(it.label)}`} · lines ${it.from + 1} to ${it.to + 1}</span>
        <button type="button" class="fbc-copy">copy</button><a href="${raw}" target="_blank" rel="noopener">open the file</a>
        ${id === 'webgl' ? `<a href="${new URL('webgl/index.html', BASE).href}" target="_blank" rel="noopener">run it</a>` : ''}</div>
        <pre class="fbc-code">${numbered(highlight(lines, it.lang), it.from + 1)}</pre>`;
      main.querySelector('.fbc-copy').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        navigator.clipboard.writeText(lines).then(() => { btn.textContent = 'copied'; }, () => { btn.textContent = 'select and copy'; });
      });
    }
  }
  showTrack('webgl');
  return { close, showTrack };
}
