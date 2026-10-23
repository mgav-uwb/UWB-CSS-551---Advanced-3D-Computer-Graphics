// deck-math.js: MathJax for the reveal.js decks (classic script; load it before the deck's module).
//
// Authoring, in a topic .md: a display formula is a raw HTML block, so marked never touches the TeX
// (no blank line inside it, or marked ends the block and eats backslashes and underscores):
//
//   <div class="tex" role="img" aria-label="v' = cos θ v + (1 − cos θ)(v · n) n + sin θ (n × v)">
//   \[ v' = \cos\theta\, v + (1 - \cos\theta)(v \cdot n)\, n + \sin\theta\, (n \times v) \]
//   </div>
//
// aria-label keeps the ASCII form (the alt text: screen readers, Canvas, print, raw markdown).
// The deck calls window.typesetDeckMath() after Reveal.initialize() resolves, since the markdown
// slides exist only then; it typesets every .tex block, then re-lays out the deck.
(function () {
  window.MathJax = {
    tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] },
    svg: { fontCache: 'local' },
    startup: { typeset: false },
  };
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js';
  s.async = true;
  document.head.appendChild(s);

  window.typesetDeckMath = function () {
    return new Promise(function (resolve) {
      (function wait() {
        var mj = window.MathJax;
        if (mj && mj.startup && mj.startup.promise && mj.typesetPromise) {
          mj.startup.promise
            .then(function () { return mj.typesetPromise(Array.from(document.querySelectorAll('.reveal .tex'))); })
            .then(function () { if (window.Reveal && Reveal.isReady()) Reveal.layout(); resolve(); });
        } else {
          setTimeout(wait, 50);
        }
      })();
    });
  };
})();
