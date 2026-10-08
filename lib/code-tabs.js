// Unity / WebGL code tabs, for the decks and the course text.
//
// Markup: a <div class="code-tabs"> holding two or more <pre> blocks. In a deck's markdown, leave a
// blank line after the opening tag and before the closing one so the fences inside are parsed:
//
//   <div class="code-tabs">
//
//   ```csharp
//   ...
//   ```
//
//   ```javascript
//   ...
//   ```
//
//   </div>
//
// Each block's track comes from data-track on the <pre> ("unity" or "webgl"), else from its language
// class (csharp, hlsl: unity; javascript, glsl: webgl); its tab label from data-label, else from the
// language. Choosing a tab switches every group on the page and is remembered per browser. Printing
// shows every block with its label. A group with data-run="name" also gets a Run tab that executes
// its WebGL listing (lib/code-run.js, loaded before this file). window.CodeTabs.select('unity' | 'webgl') switches from a script
// (the deck checkers use it to measure both tracks).
(function () {
  const KEY = 'css551-code-track';
  const TRACK = { csharp: 'unity', cs: 'unity', hlsl: 'unity', shaderlab: 'unity',
                  javascript: 'webgl', js: 'webgl', glsl: 'webgl' };
  const LABEL = { csharp: 'Unity · C#', cs: 'Unity · C#', hlsl: 'Unity · HLSL', shaderlab: 'Unity · ShaderLab',
                  javascript: 'WebGL · JavaScript', js: 'WebGL · JavaScript', glsl: 'WebGL · GLSL' };

  const css = `
    .code-tabs { margin: 0.6em 0; }
    .code-tabs .ct-bar { display: flex; gap: 4px; margin: 0 0 -1px; }
    .code-tabs .ct-tab { font: 600 13px/1 system-ui, sans-serif; padding: 6px 12px; border: 1px solid #c9ced8;
      border-bottom: none; border-radius: 6px 6px 0 0; background: #eef0f4; color: #5c6270; cursor: pointer; }
    .code-tabs .ct-tab[aria-selected="true"] { background: #f6f8fb; color: #1a1c22; border-color: #d7dbe3; }
    .code-tabs pre { margin-top: 0; border-top-left-radius: 0; }
    .reveal .code-tabs .ct-tab[aria-selected="true"] { background: #272822; color: #f8f8f2; border-color: #272822; }
    .code-tabs .ct-tab:focus-visible { outline: 2px solid #0a7d5a; outline-offset: 1px; }
    .code-tabs .ct-panel[hidden] { display: none; }
    .code-tabs .ct-print { display: none; }
    .code-tabs .ct-runtab { margin-left: auto; color: #0a7d5a; }
    .reveal .code-tabs iframe.cr-frame { max-width: 100%; max-height: none; }
    .code-tabs .ct-runtab[aria-selected="true"],
    .reveal .code-tabs .ct-runtab[aria-selected="true"] { background: #1e2230; color: #9fe8c6; border-color: #1e2230; }
    .reveal .code-tabs { width: 100%; margin: 0.3em auto; }
    .reveal .code-tabs .ct-tab { font-size: 15px; }
    @media print {
      .code-tabs .ct-bar { display: none; }
      .code-tabs .ct-panel[hidden] { display: block; }
      .code-tabs .ct-print { display: block; font: 600 11px system-ui, sans-serif; margin: 6px 0 2px; }
      .code-tabs .ct-run { display: none !important; }
    }`;

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function save(t) { try { localStorage.setItem(KEY, t); } catch (e) { /* storage blocked: session only */ } }

  // The fence's language, preferring one the tabs know: highlight.js can add a second, auto-detected
  // language class (an HLSL fence came out "language-stylus"), which must not decide the track.
  function langOf(pre) {
    const el = pre.querySelector('code') || pre;
    const all = [...(el.className + ' ' + pre.className).matchAll(/(?:language|lang)-([\w-]+)/g)].map((m) => m[1].toLowerCase());
    return all.find((l) => l in TRACK) || all[0] || '';
  }

  let current = read() || 'unity';

  function apply() {
    if (window.CodeRun) window.CodeRun.stop();
    document.querySelectorAll('.code-tabs[data-ct-ready]').forEach((g) => {
      const panels = [...g.querySelectorAll(':scope > .ct-panel:not(.ct-run)')];
      const tabs = [...g.querySelectorAll('.ct-tab:not(.ct-runtab)')];
      const has = panels.some((p) => p.dataset.track === current);
      panels.forEach((p, i) => {
        const on = has ? p.dataset.track === current : i === 0;
        p.hidden = !on;
        tabs[i].setAttribute('aria-selected', String(on));
        tabs[i].tabIndex = on ? 0 : -1;
      });
      const run = g.querySelector(':scope > .ct-run'), rt = g.querySelector('.ct-runtab');
      if (run) { run.hidden = true; run.replaceChildren(); rt.setAttribute('aria-selected', 'false'); }
    });
    if (window.Reveal && window.Reveal.isReady && window.Reveal.isReady()) window.Reveal.layout();
  }

  function select(track) { current = track; save(track); apply(); }

  function build(g) {
    if (g.dataset.ctReady) return;
    const pres = [...g.querySelectorAll(':scope > pre')];
    if (pres.length < 2) return;
    const bar = document.createElement('div');
    bar.className = 'ct-bar';
    bar.setAttribute('role', 'tablist');
    g.insertBefore(bar, pres[0]);
    pres.forEach((pre) => {
      const lang = langOf(pre);
      const track = pre.dataset.track || TRACK[lang] || lang || 'code';
      const label = pre.dataset.label || LABEL[lang] || track;
      const panel = document.createElement('div');
      panel.className = 'ct-panel';
      panel.dataset.track = track;
      panel.setAttribute('role', 'tabpanel');
      const printLabel = document.createElement('div');
      printLabel.className = 'ct-print';
      printLabel.textContent = label;
      pre.replaceWith(panel);
      panel.append(printLabel, pre);
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'ct-tab';
      tab.setAttribute('role', 'tab');
      tab.textContent = label;
      tab.addEventListener('click', (e) => { e.stopPropagation(); select(track); });
      tab.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        // keep arrow keys inside the tab bar from also changing the slide
        e.preventDefault(); e.stopPropagation();
        const tabs = [...bar.children], i = tabs.indexOf(tab);
        const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        next.click(); next.focus();
      });
      bar.appendChild(tab);
    });
    if (g.dataset.run && window.CodeRun && window.CodeRun.has(g.dataset.run)) addRun(g, bar);
    g.dataset.ctReady = '1';
  }

  // A "Run" tab for a group with data-run: runs the WebGL listing's own text (lib/code-run.js).
  // It affects this group only; choosing a track, or leaving the slide, stops it.
  function addRun(g, bar) {
    const run = document.createElement('div');
    run.className = 'ct-panel ct-run';
    run.hidden = true;
    g.appendChild(run);
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'ct-tab ct-runtab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', 'false');
    tab.textContent = '\u25B6 Run';
    tab.title = 'run the WebGL listing on this page';
    tab.addEventListener('click', (e) => {
      e.stopPropagation();
      const panels = [...g.querySelectorAll(':scope > .ct-panel:not(.ct-run)')];
      const shown = panels.find((p) => !p.hidden);
      const webgl = panels.find((p) => p.dataset.track === 'webgl');
      if (!webgl) return;
      const h = Math.max(300, Math.min(460, shown ? shown.offsetHeight : 360));
      panels.forEach((p) => { p.hidden = true; });
      g.querySelectorAll('.ct-tab').forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      run.hidden = false;
      window.CodeRun.start(g.dataset.run, run, webgl.querySelector('pre').textContent, h);
      if (window.Reveal && window.Reveal.isReady && window.Reveal.isReady()) window.Reveal.layout();
    });
    bar.appendChild(tab);
  }

  function init() {
    if (!document.getElementById('code-tabs-css')) {
      const style = document.createElement('style');
      style.id = 'code-tabs-css';
      style.textContent = css;
      document.head.appendChild(style);
    }
    document.querySelectorAll('.code-tabs').forEach(build);
    apply();
  }

  window.CodeTabs = { select, init, get track() { return current; } };

  // A deck's markdown becomes slides only when reveal.js is ready; a chapter's HTML is there at once.
  if (window.Reveal && typeof window.Reveal.on === 'function') {
    if (window.Reveal.isReady && window.Reveal.isReady()) init();
    else window.Reveal.on('ready', init);
    window.Reveal.on('slidechanged', () => { if (document.querySelector('.ct-run:not([hidden])')) apply(); });
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
