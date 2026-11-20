// Figure tabs, for the decks and the course text: a set of figures shown one at a time, chosen by tab.
//
// Markup: a <div class="fig-tabs"> holding two or more <figure data-label="..."> blocks, each an <img> and an
// optional <figcaption>. In a deck's markdown the whole group is one raw HTML block (no blank line inside), so
// marked leaves it alone; an inline formula in a caption is written <code>$...$</code> and lib/deck-math.js
// typesets it. Every group is independent (unlike lib/code-tabs.js, whose tracks switch together), the first
// figure shows first. In a deck every figure is drawn at one height (--ft-img-h, default 330px), so give the figures
// one aspect ratio and one-line captions and the slide does not jump between tabs.
// Arrow keys on a focused tab move between tabs without changing the slide. Printing shows every figure with
// its label. window.FigTabs.show(group, i) selects from a script (the deck checkers use it to measure each tab).
(function () {
  const css = `
    .fig-tabs { margin: 0.6em 0; }
    .fig-tabs .ft-bar { display: flex; flex-wrap: wrap; gap: 4px; justify-content: center; margin: 0 0 6px; }
    .fig-tabs .ft-tab { font: 600 13px/1 system-ui, sans-serif; padding: 6px 12px; border: 1px solid #c9ced8;
      border-radius: 6px; background: #eef0f4; color: #5c6270; cursor: pointer; }
    .fig-tabs .ft-tab[aria-selected="true"] { background: #1f5fb0; border-color: #1f5fb0; color: #ffffff; }
    .fig-tabs .ft-tab:focus-visible { outline: 2px solid #0a7d5a; outline-offset: 1px; }
    .fig-tabs > figure { margin: 0; }
    .fig-tabs > figure[hidden] { display: none; }
    .fig-tabs > figure img { display: block; margin: 0 auto; max-width: 100%; height: auto; }
    .fig-tabs .ft-print { display: none; }
    .reveal .fig-tabs { margin: 0.2em auto; }
    .reveal .fig-tabs .ft-tab { font-size: 15px; padding: 6px 14px; }
    .reveal .fig-tabs > figure img { height: var(--ft-img-h, 330px); width: auto; max-width: 100%; background: #fff; }
    .reveal .fig-tabs figcaption { font-size: 0.55em; line-height: 1.3; color: #5c6270; margin-top: 4px; }
    @media print {
      .fig-tabs .ft-bar { display: none; }
      .fig-tabs > figure[hidden] { display: block; }
      .fig-tabs .ft-print { display: block; font: 600 11px system-ui, sans-serif; margin: 8px 0 2px; }
    }`;

  function show(g, i) {
    const figs = [...g.querySelectorAll(':scope > figure')];
    const tabs = [...g.querySelectorAll(':scope > .ft-bar > .ft-tab')];
    figs.forEach((f, k) => {
      f.hidden = k !== i;
      tabs[k].setAttribute('aria-selected', String(k === i));
      tabs[k].tabIndex = k === i ? 0 : -1;
    });
    if (window.Reveal && window.Reveal.isReady && window.Reveal.isReady()) window.Reveal.layout();
  }

  function build(g) {
    if (g.dataset.ftReady) return;
    const figs = [...g.querySelectorAll(':scope > figure')];
    if (figs.length < 2) return;
    const bar = document.createElement('div');
    bar.className = 'ft-bar';
    bar.setAttribute('role', 'tablist');
    g.insertBefore(bar, figs[0]);
    figs.forEach((f, i) => {
      const label = f.dataset.label || `Figure ${i + 1}`;
      f.setAttribute('role', 'tabpanel');
      f.setAttribute('aria-label', label);
      const printLabel = document.createElement('div');
      printLabel.className = 'ft-print';
      printLabel.textContent = label;
      f.prepend(printLabel);
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'ft-tab';
      tab.setAttribute('role', 'tab');
      tab.textContent = label;
      tab.addEventListener('click', (e) => { e.stopPropagation(); show(g, i); });
      tab.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault(); e.stopPropagation(); // keep the arrow keys from also changing the slide
        const n = figs.length, next = (i + (e.key === 'ArrowRight' ? 1 : n - 1)) % n;
        show(g, next); bar.children[next].focus();
      });
      bar.appendChild(tab);
    });
    g.dataset.ftReady = '1';
    show(g, 0);
  }

  function init() {
    if (!document.getElementById('fig-tabs-css')) {
      const style = document.createElement('style');
      style.id = 'fig-tabs-css';
      style.textContent = css;
      document.head.appendChild(style);
    }
    document.querySelectorAll('.fig-tabs').forEach(build);
  }

  window.FigTabs = { init, show };

  // A deck's markdown becomes slides only when reveal.js is ready; a chapter's HTML is there at once.
  if (window.Reveal && typeof window.Reveal.on === 'function') {
    if (window.Reveal.isReady && window.Reveal.isReady()) init();
    else window.Reveal.on('ready', init);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
