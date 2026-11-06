// code-window: the whole program behind a demo, in a window over the demo. One tab per track (WebGL ·
// three.js, Unity · C#), each listing its files and, under each file, its sections: what the file marks
// "#region Name" ... "#endregion" (// #region in JavaScript and GLSL, #region in C# and ShaderLab, which
// editors fold). The comment block that opens a section is shown above its code as the section's note.
// Further tabs hold prose (the model files) or a live panel (the demo's line-by-line walk).
//
//   openCodeWindow(host, program) overlays host (made position: relative) until Esc, ×, or a click on
//   the backdrop, and returns { close, show(tabId) }.
//
//   program = {
//     title: 'The whole program',
//     base:  URL of the program folder (lib/programs/<name>/), file paths below are relative to it,
//     tracks: [{ id, label, files: ['webgl/scene.js', ...], note, run: 'webgl/index.html' (optional) }],
//     tabs:   [{ id, label, html }          prose
//              { id, label, mount(el) }]    a live panel; mount returns { destroy() } or nothing
//     start:  the tab shown first (default: the first track)
//   }
//
// Generalized from the football demo's code window (lib/demos/football-code.js).

const KEYWORDS = {
  js: 'import|from|export|const|let|var|function|return|if|else|for|of|in|new|class|constructor|this|switch|case|default|break|continue|true|false|null|undefined|typeof|async|await|static|get|set',
  cs: 'using|public|private|protected|static|readonly|const|class|struct|enum|void|float|double|int|uint|bool|string|new|return|if|else|for|foreach|in|out|ref|switch|case|default|break|continue|true|false|null|this|var|override',
  glsl: 'attribute|uniform|varying|in|out|inout|const|void|float|int|bool|vec2|vec3|vec4|mat3|mat4|sampler2D|return|if|else|for|discard|precision|highp|mediump',
  shader: 'Shader|Properties|SubShader|Pass|Tags|LOD|Cull|ZWrite|ZTest|Blend|CGPROGRAM|ENDCG|Fallback|FallBack|Off|On|struct|float|float2|float3|float4|float4x4|half|half3|half4|fixed|fixed3|fixed4|void|return|uniform|sampler2D|inout|out|in',
  html: 'html|head|body|meta|title|style|script|div|link',
  py: 'import|from|as|def|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|class|with|lambda|yield|pass|break|continue|global|assert|raise|try|except|finally',
};
const langOf = (file) => (/\.cs$/.test(file) ? 'cs' : /\.(shader|cginc|hlsl)$/.test(file) ? 'shader'
  : /\.(glsl|vert|frag)$/.test(file) ? 'glsl' : /\.html?$/.test(file) ? 'html' : /\.py$/.test(file) ? 'py' : 'js');

const CSS = `
.cwin-back { position: absolute; inset: 0; z-index: 50; background: rgba(5,6,9,0.72); display: flex; padding: 14px; }
.cwin { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #0f1117; border: 1px solid #2f3646;
  border-radius: 8px; box-shadow: 0 10px 40px rgba(0,0,0,0.6); overflow: hidden; color: #e7eaf0;
  font: 13px/1.4 -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; text-align: left; }
.cwin-head { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border-bottom: 1px solid #262a35; flex-wrap: wrap; }
.cwin-head h3 { margin: 0 10px 0 0; font-size: 14px; color: #e7eaf0; text-transform: none; letter-spacing: 0; }
.cwin-tab { background: #14161d; color: #8b93a7; border: 1px solid #262a35; border-radius: 5px; padding: 5px 10px;
  font: 600 12px/1 -apple-system, Segoe UI, Roboto, sans-serif; cursor: pointer; }
.cwin-tab.on { background: #1c2433; color: #e7eaf0; border-color: #3a4c6e; }
.cwin-close { margin-left: auto; background: none; border: none; color: #8b93a7; font-size: 20px; cursor: pointer; line-height: 1; }
.cwin-body { flex: 1; display: flex; min-height: 0; }
.cwin-side { flex: 0 0 210px; overflow-y: auto; border-right: 1px solid #262a35; padding: 8px 6px; }
.cwin-file { font: 600 12px/1.3 'SF Mono', Menlo, Consolas, monospace; color: #c7cdda; padding: 5px 6px; border-radius: 4px; cursor: pointer; }
.cwin-sec { font-size: 12px; color: #8b93a7; padding: 3px 6px 3px 16px; border-radius: 4px; cursor: pointer; }
.cwin-file:hover, .cwin-sec:hover { background: #1c1f28; }
.cwin-file.on, .cwin-sec.on { background: #1c2433; color: #e7eaf0; }
.cwin-main { flex: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.cwin-bar { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-bottom: 1px solid #262a35; font-size: 12px; color: #8b93a7; flex-wrap: wrap; }
.cwin-bar a, .cwin-bar button { color: #7ee787; background: none; border: 1px solid #2d6b46; border-radius: 4px; padding: 2px 8px;
  font: 12px/1.4 -apple-system, Segoe UI, Roboto, sans-serif; cursor: pointer; text-decoration: none; }
.cwin-note { padding: 6px 10px 0; font-size: 12px; color: #9aa3b8; }
.cwin-about { margin: 6px 10px 0; padding: 6px 10px; border-left: 3px solid #3a4c6e; background: #141a26; border-radius: 3px;
  font-size: 12.5px; line-height: 1.45; color: #d3d8e3; white-space: pre-wrap; }
.cwin-code { flex: 1; overflow: auto; margin: 0; padding: 8px 0; font: 12px/1.5 'SF Mono', Menlo, Consolas, monospace;
  color: #d6dbe5; background: #0b0c10; white-space: pre; tab-size: 4; }
.cwin-ln { display: inline-block; width: 3.4em; padding-right: 10px; text-align: right; color: #4a5266; user-select: none; }
.cwin-c { color: #8f9bb0; font-style: italic; } .cwin-s { color: #a5d6a7; } .cwin-n { color: #f2a65a; } .cwin-k { color: #8ab4ff; }
.cwin-doc { flex: 1; overflow: auto; padding: 10px 14px; font-size: 13px; line-height: 1.5; color: #d3d8e3; }
.cwin-doc h4 { margin: 12px 0 4px; font-size: 13px; color: #e7eaf0; } .cwin-doc a { color: #7ee787; }
.cwin-doc pre { background: #0b0c10; border: 1px solid #262a35; border-radius: 4px; padding: 6px 8px; font: 12px/1.45 'SF Mono', Menlo, monospace; white-space: pre; overflow-x: auto; }
.cwin-doc code { font-family: 'SF Mono', Menlo, monospace; color: #e6d96b; }
.cwin-live { flex: 1; overflow: auto; min-height: 0; padding: 8px; }
/* on a slide: reveal.js styles every pre (90 % wide, centered, 0.55em, a shadow); the window's own sizes win */
.reveal .cwin pre.cwin-code, .reveal .cwin-doc pre { width: auto; margin: 0; font-size: 12px; line-height: 1.5;
  box-shadow: none; word-wrap: normal; text-align: left; }
.reveal .cwin-doc pre { margin: 6px 0; }
`;

const cache = new Map();
function source(base, file) {
  const url = new URL(file, base).href;
  if (!cache.has(url)) cache.set(url, fetch(url).then((r) => (r.ok ? r.text() : `// could not load ${file} (${r.status})`)));
  return cache.get(url);
}

/** the "#region Name" ... "#endregion" sections of a file: [{ name, from, to }] as line indices.
 *  JavaScript and GLSL write // #region, C# #region, Python # region (each language's folding marker). */
export function regions(text) {
  const lines = text.split('\n');
  const out = [];
  let open = null;
  lines.forEach((line, i) => {
    const m = line.match(/^\s*(?:\/\/\s*#|#\s*)region\s+(.*)$/);
    if (m) open = { name: m[1].trim(), from: i };
    else if (open && /^\s*(?:\/\/\s*#|#\s*)endregion/.test(line)) { out.push({ ...open, to: i }); open = null; }
  });
  return out;
}

/** the comment block right after a section's "#region" line (its note): { text, last } with last the
 *  index of the block's last line (from when there is no block). A section view shows the note above
 *  the code and the code from the line after it. Python notes are # comments, the rest // comments. */
export function regionNote(text, from, lang = 'js') {
  const lines = text.split('\n');
  const note = [];
  let last = from;
  for (let i = from + 1; i < lines.length; i++) {
    const m = lines[i].match(lang === 'py' ? /^\s*#(?!\s*(?:end)?region)\s?(.*)$/ : /^\s*\/\/\s?(.*)$/);
    if (!m) break;
    note.push(m[1]);
    last = i;
  }
  return { text: note.join('\n').trim(), last };
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** a light highlighter: comments, strings, numbers, keywords. */
export function highlight(text, lang) {
  const kw = KEYWORDS[lang] || KEYWORDS.js;
  const comment = lang === 'html' ? '<!--[\\s\\S]*?-->|\\/\\/[^\\n]*' : lang === 'py' ? '#[^\\n]*' : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';
  const triple = lang === 'py' ? '"""[\\s\\S]*?"""|' : '';   // a Python docstring
  const re = new RegExp(`(${comment})|(${triple}"(?:\\\\.|[^"\\\\\\n])*"|'(?:\\\\.|[^'\\\\\\n])*'|\`(?:\\\\.|[^\`\\\\])*\`)|\\b(\\d+(?:\\.\\d+)?(?:e[+-]?\\d+)?f?)\\b|\\b(${kw})\\b`, 'g');
  let out = '', last = 0;
  for (const m of text.matchAll(re)) {
    out += esc(text.slice(last, m.index));
    const cls = m[1] ? 'c' : m[2] ? 's' : m[3] ? 'n' : 'k';
    // a multi-line comment or template string: close and reopen the span on every line, so numbering can split it
    out += esc(m[0]).split('\n').map((part) => `<span class="cwin-${cls}">${part}</span>`).join('\n');
    last = m.index + m[0].length;
  }
  return out + esc(text.slice(last));
}

function numbered(html, firstLine) {
  return html.split('\n').map((line, i) => `<span class="cwin-ln">${firstLine + i}</span>${line}`).join('\n');
}

function injectCss() {
  if (document.getElementById('cwin-css')) return;
  const st = document.createElement('style');
  st.id = 'cwin-css';
  st.textContent = CSS;
  document.head.appendChild(st);
}

export function openCodeWindow(host, program) {
  injectCss();
  host.style.position = 'relative';
  const back = document.createElement('div');
  back.className = 'cwin-back';
  back.innerHTML = `<div class="cwin" role="dialog" aria-label="${esc(program.title || 'The whole program')}">
    <div class="cwin-head"><h3>${esc(program.title || 'The whole program')}</h3></div>
    <div class="cwin-body"><div class="cwin-side"></div><div class="cwin-main"></div></div></div>`;
  host.appendChild(back);
  const win = back.querySelector('.cwin');
  const head = back.querySelector('.cwin-head');
  const side = back.querySelector('.cwin-side');
  const main = back.querySelector('.cwin-main');
  // keep the demo's own handlers (orbit drags, wheel zoom, reveal's keys) out of the window
  for (const ev of ['mousedown', 'pointerdown', 'wheel', 'click', 'keydown']) win.addEventListener(ev, (e) => e.stopPropagation());
  back.addEventListener('mousedown', (e) => { e.stopPropagation(); if (e.target === back) close(); });

  const tabs = {};
  const all = [...program.tracks.map((t) => ({ ...t, kind: 'track' })), ...(program.tabs || []).map((t) => ({ ...t, kind: t.mount ? 'live' : 'doc' }))];
  for (const t of all) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cwin-tab';
    b.textContent = t.label;
    b.addEventListener('click', () => { show(t.id); b.blur(); });
    head.appendChild(b);
    tabs[t.id] = b;
  }
  const x = document.createElement('button');
  x.type = 'button';
  x.className = 'cwin-close';
  x.setAttribute('aria-label', 'Close');
  x.textContent = '×';
  x.addEventListener('click', close);
  head.appendChild(x);

  let live = null;   // the mounted live panel, destroyed when another tab opens
  function onKey(e) {
    if (e.key === 'Escape') { close(); e.stopPropagation(); e.preventDefault(); }
  }
  document.addEventListener('keydown', onKey, true);
  function close() {
    document.removeEventListener('keydown', onKey, true);
    if (live && live.destroy) live.destroy();
    live = null;
    back.remove();
  }

  let seq = 0;
  async function show(id) {
    const my = ++seq;
    const tab = all.find((t) => t.id === id) || all[0];
    for (const [k, b] of Object.entries(tabs)) b.classList.toggle('on', k === tab.id);
    if (live && live.destroy) live.destroy();
    live = null;
    side.innerHTML = '';
    main.innerHTML = '';
    if (tab.kind !== 'track') {
      side.style.display = 'none';
      if (tab.kind === 'doc') main.innerHTML = `<div class="cwin-doc">${tab.html}</div>`;
      else {
        const el = document.createElement('div');
        el.className = 'cwin-live';
        main.appendChild(el);
        live = tab.mount(el) || null;
      }
      return;
    }
    side.style.display = '';
    const items = [];
    for (const file of tab.files) {
      const text = await source(program.base, file);
      if (my !== seq) return;   // another tab was opened while this one loaded
      const lang = langOf(file);
      const f = document.createElement('div');
      f.className = 'cwin-file';
      f.textContent = file.split('/').pop();
      f.title = 'the whole file';
      side.appendChild(f);
      items.push({ el: f, file, text, lang, from: 0, to: text.split('\n').length - 1, label: 'whole file', note: '', start: 0 });
      for (const r of regions(text)) {
        const e = document.createElement('div');
        e.className = 'cwin-sec';
        e.textContent = r.name;
        side.appendChild(e);
        const note = regionNote(text, r.from, lang);
        items.push({ el: e, file, text, lang, from: note.text ? note.last + 1 : r.from, to: r.to, label: r.name, note: note.text, start: r.from });
      }
    }
    for (const it of items) it.el.addEventListener('click', () => showItem(it));
    showItem(items[0]);

    function showItem(it) {
      for (const o of items) o.el.classList.toggle('on', o === it);
      const lines = it.text.split('\n').slice(it.from, it.to + 1).join('\n');
      const raw = new URL(it.file, program.base).href;
      main.innerHTML = `${tab.note ? `<div class="cwin-note">${tab.note}</div>` : ''}
        <div class="cwin-bar"><span>${esc(it.file)}${it.label === 'whole file' ? '' : ` · ${esc(it.label)}`} · lines ${it.start + 1} to ${it.to + 1}</span>
        <button type="button" class="cwin-copy">copy</button><a href="${raw}" target="_blank" rel="noopener">open the file</a>
        ${tab.run ? `<a href="${new URL(tab.run, program.base).href}" target="_blank" rel="noopener">run it</a>` : ''}</div>
        ${it.note ? `<div class="cwin-about">${esc(it.note)}</div>` : ''}
        <pre class="cwin-code">${numbered(highlight(lines, it.lang), it.from + 1)}</pre>`;
      main.querySelector('.cwin-copy').addEventListener('click', (e) => {
        const btn = e.currentTarget;
        navigator.clipboard.writeText(lines).then(() => { btn.textContent = 'copied'; }, () => { btn.textContent = 'select and copy'; });
      });
    }
  }
  show(program.start || all[0].id);
  return { close, show };
}
