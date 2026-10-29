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
//
// An inline formula is a code span whose text starts and ends with $: `$R^{-1} = R^T$`. The code span
// keeps the TeX away from marked (backslashes, underscores and braces arrive verbatim); here it becomes
// a span.tex-inline that MathJax typesets in place, kept on one line with the punctuation that touches it.
// In a table cell write | as \vert or \lvert/\rvert.
//
// The deck calls window.typesetDeckMath() after Reveal.initialize() resolves, since the markdown
// slides exist only then; it typesets every .tex block and inline formula, then re-lays out the deck.
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

  // `$…$` code spans (not code blocks) become span.tex-inline holding \( … \)
  function inlineSpans() {
    document.querySelectorAll('.reveal code').forEach(function (c) {
      if (c.closest('pre')) return;
      var t = c.textContent;
      if (t.length > 2 && t.charAt(0) === '$' && t.charAt(t.length - 1) === '$') {
        var span = document.createElement('span');
        span.className = 'tex-inline';
        span.setAttribute('data-tex', t.slice(1, -1));
        span.textContent = '\\(' + t.slice(1, -1) + '\\)';
        c.replaceWith(span);
        glue(span);
      }
    });
  }

  // keep a formula on one line with the punctuation that touches it ("(P)", "V:", "w = 0,")
  function glue(span) {
    var prev = span.previousSibling, next = span.nextSibling;
    var before = prev && prev.nodeType === 3 ? /[(\[]+$/.exec(prev.data) : null;
    var after = next && next.nodeType === 3 ? /^[:;,.!?)\]]+/.exec(next.data) : null;
    if (!before && !after) return;
    var wrap = document.createElement('span');
    wrap.style.whiteSpace = 'nowrap';
    span.parentNode.insertBefore(wrap, span);
    if (before) {
      prev.data = prev.data.slice(0, -before[0].length);
      wrap.appendChild(document.createTextNode(before[0]));
    }
    wrap.appendChild(span);
    if (after) {
      next.data = next.data.slice(after[0].length);
      wrap.appendChild(document.createTextNode(after[0]));
    }
  }

  window.typesetDeckMath = function () {
    inlineSpans();
    return new Promise(function (resolve) {
      (function wait() {
        var mj = window.MathJax;
        if (mj && mj.startup && mj.startup.promise && mj.typesetPromise) {
          mj.startup.promise
            .then(function () { return mj.typesetPromise(Array.from(document.querySelectorAll('.reveal .tex, .reveal .tex-inline'))); })
            .then(function () { if (window.Reveal && Reveal.isReady()) Reveal.layout(); resolve(); });
        } else {
          setTimeout(wait, 50);
        }
      })();
    });
  };
})();
