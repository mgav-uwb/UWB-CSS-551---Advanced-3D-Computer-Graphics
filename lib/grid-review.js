/* CSS 343 / shared deck runtime — grid review.
 *
 * A zoomable, pannable, linearized grid of EVERY slide in the deck, for
 * reading through the whole thing at a glance (something reveal's native
 * overview can't do — it locks the zoom).
 *
 *   Press  G  (or the ⊞ button reveal shows nowhere — just press G) to open.
 *   - Zoom:  the − / + buttons, the slider, or Ctrl/⌘ + mouse wheel.
 *   - Pan:   scroll (the grid is one big scrollable sheet).
 *   - Jump:  click any slide to go there and close the grid.
 *   - Close: G or Esc.
 *
 * Zoom OUT to scan the entire deck linearized in one view; zoom IN and
 * scroll to actually read a slide's text. Course-agnostic: depends only on
 * the reveal.js public API, so it drops into any deck unchanged.
 */
(function () {
  function whenReady(fn) {
    if (window.Reveal && Reveal.isReady && Reveal.isReady()) fn();
    else setTimeout(function () { whenReady(fn); }, 60);
  }

  whenReady(function () {
    var cfg = Reveal.getConfig();
    var W = typeof cfg.width === "number" ? cfg.width : 960;
    var H = typeof cfg.height === "number" ? cfg.height : 700;
    var ZMIN = 0.10, ZMAX = 0.6, z = 0.22;
    var open = false, revealKbd = cfg.keyboard !== false, root = null;

    var style = document.createElement("style");
    style.textContent = [
      "#gr { position: fixed; inset: 0; z-index: 100000; background: #0f1116;",
      "  display: none; flex-direction: column; }",
      "#gr.on { display: flex; }",
      "#gr-bar { flex: none; display: flex; align-items: center; gap: 14px;",
      "  padding: 10px 18px; background: #191c23; border-bottom: 1px solid #2a2e37;",
      "  color: #e8eaf0; font: 15px/1.4 -apple-system, system-ui, sans-serif; }",
      "#gr-bar b { color: #fff; }",
      "#gr-bar .sp { flex: 1; }",
      "#gr-bar button { background: #2a2e37; color: #e8eaf0; border: 0; border-radius: 6px;",
      "  width: 34px; height: 32px; font-size: 17px; cursor: pointer; }",
      "#gr-bar button:hover { background: #3a3f4a; }",
      "#gr-bar input[type=range] { width: 190px; accent-color: #7c9cff; }",
      "#gr-scroll { flex: 1; overflow: auto; padding: 20px; }",
      "#gr-grid { display: flex; flex-wrap: wrap; gap: 16px; align-content: flex-start; }",
      ".gr-cell { position: relative; padding: 0; border: 1px solid #2a2e37; border-radius: 8px;",
      "  background: #fff; overflow: hidden; cursor: pointer; flex: none; }",
      ".gr-cell:hover { border-color: #7c9cff; box-shadow: 0 0 0 2px rgba(124,156,255,.5); }",
      ".gr-num { position: absolute; left: 6px; top: 6px; z-index: 3; background: rgba(20,22,28,.82);",
      "  color: #fff; font: 600 12px/1 -apple-system, system-ui, sans-serif; padding: 4px 7px;",
      "  border-radius: 5px; font-variant-numeric: tabular-nums; }",
      ".gr-stage { transform-origin: top left; }",
      // neutralize reveal's live-deck positioning inside each cloned mini deck
      ".gr-mini { overflow: hidden; }",
      ".gr-mini .slides { position: static !important; transform: none !important;",
      "  inset: auto !important; left: 0 !important; top: 0 !important; margin: 0 !important;",
      "  width: 100% !important; height: 100% !important; zoom: 1 !important; }",
      ".gr-mini .slides > section { display: block !important; position: relative !important;",
      "  inset: auto !important; left: 0 !important; top: 0 !important; transform: none !important;",
      "  opacity: 1 !important; visibility: visible !important; width: 100% !important;",
      "  height: 100% !important; box-sizing: border-box; }",
      ".gr-mini .fragment { opacity: 1 !important; visibility: visible !important;",
      "  transform: none !important; }",
      ".gr-mini .viz-fallback { display: block !important; }",
      ".gr-mini canvas { opacity: .25; }",
    ].join("\n");
    document.head.appendChild(style);

    root = document.createElement("div");
    root.id = "gr";
    root.innerHTML =
      '<div id="gr-bar">' +
      "  <b>Grid review</b><span id=\"gr-count\"></span>" +
      '  <span class="sp"></span>' +
      '  <button id="gr-minus" title="Zoom out">−</button>' +
      '  <input id="gr-zoom" type="range" min="' + ZMIN + '" max="' + ZMAX + '" step="0.01">' +
      '  <button id="gr-plus" title="Zoom in">+</button>' +
      '  <button id="gr-fit" title="Fit all" style="width:auto;padding:0 10px;font-size:14px">fit all</button>' +
      '  <button id="gr-close" title="Close (Esc)">×</button>' +
      "</div>" +
      '<div id="gr-scroll"><div id="gr-grid"></div></div>';
    document.body.appendChild(root);

    var grid = root.querySelector("#gr-grid");
    var scroll = root.querySelector("#gr-scroll");
    var zoomEl = root.querySelector("#gr-zoom");

    function applyZoom() {
      root.querySelectorAll(".gr-cell").forEach(function (c) {
        c.style.width = W * z + "px";
        c.style.height = H * z + "px";
      });
      root.querySelectorAll(".gr-stage").forEach(function (s) {
        s.style.width = W + "px";
        s.style.height = H + "px";
        s.style.transform = "scale(" + z + ")";
      });
      zoomEl.value = z;
    }
    function setZoom(nz) { z = Math.max(ZMIN, Math.min(ZMAX, nz)); applyZoom(); }

    function build() {
      grid.innerHTML = "";
      var slides = Reveal.getSlides();
      root.querySelector("#gr-count").textContent = " · " + slides.length + " slides";
      slides.forEach(function (sec, i) {
        var cell = document.createElement("button");
        cell.className = "gr-cell";
        cell.style.width = W * z + "px";
        cell.style.height = H * z + "px";
        var stage = document.createElement("div");
        stage.className = "gr-stage";
        stage.style.cssText = "width:" + W + "px;height:" + H + "px;transform:scale(" + z + ")";
        var mini = document.createElement("div");
        mini.className = "reveal gr-mini";
        mini.style.cssText = "width:" + W + "px;height:" + H + "px";
        var slidesWrap = document.createElement("div");
        slidesWrap.className = "slides";
        var clone = sec.cloneNode(true);
        // NB: do NOT add .present — the .gr-mini CSS forces clone visibility on
        // its own, and keeping clones out of the global `section.present` set
        // avoids polluting any other script's selectors.
        clone.classList.remove("future", "past", "stack");
        clone.removeAttribute("hidden");
        slidesWrap.appendChild(clone);
        mini.appendChild(slidesWrap);
        stage.appendChild(mini);
        var num = document.createElement("span");
        num.className = "gr-num";
        num.textContent = i + 1;
        cell.appendChild(stage);
        cell.appendChild(num);
        cell._section = sec;
        cell.addEventListener("click", function () {
          var idx = indicesOf(sec);
          close();
          Reveal.slide(idx.h, idx.v);
        });
        grid.appendChild(cell);
      });
      applyZoom();
    }

    function indicesOf(section) {
      var horiz = Array.prototype.slice.call(
        Reveal.getRevealElement().querySelectorAll(".slides > section"));
      if (horiz.indexOf(section) !== -1) return { h: horiz.indexOf(section), v: 0 };
      var stack = section.parentElement;
      var h = horiz.indexOf(stack);
      var sibs = Array.prototype.slice.call(stack.children).filter(function (e) {
        return e.tagName === "SECTION";
      });
      return { h: h, v: sibs.indexOf(section) };
    }

    function openGrid() {
      if (open) return;
      open = true;
      revealKbd = Reveal.getConfig().keyboard !== false;
      Reveal.configure({ keyboard: false }); // let arrows scroll the grid
      build();
      root.classList.add("on");
      scroll.scrollTop = 0;
      scroll.focus();
    }
    function close() {
      if (!open) return;
      open = false;
      root.classList.remove("on");
      Reveal.configure({ keyboard: revealKbd });
    }
    function toggle() { open ? close() : openGrid(); }

    root.querySelector("#gr-minus").onclick = function () { setZoom(z - 0.03); };
    root.querySelector("#gr-plus").onclick = function () { setZoom(z + 0.03); };
    zoomEl.oninput = function () { setZoom(parseFloat(zoomEl.value)); };
    root.querySelector("#gr-close").onclick = close;
    root.querySelector("#gr-fit").onclick = function () {
      // choose the largest zoom that fits every slide in the viewport at once
      var n = Reveal.getSlides().length;
      var availW = scroll.clientWidth - 40, availH = scroll.clientHeight - 40;
      var best = ZMIN;
      for (var cols = 1; cols <= n; cols++) {
        var rows = Math.ceil(n / cols);
        var zc = Math.min((availW - (cols - 1) * 16) / cols / W,
                          (availH - (rows - 1) * 16) / rows / H);
        if (zc > best) best = zc;
      }
      setZoom(best);
    };
    root.querySelector("#gr-scroll").addEventListener("wheel", function (e) {
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(z - e.deltaY * 0.0015); }
    }, { passive: false });

    document.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.key === "g" || e.key === "G") && e.target.tagName !== "INPUT") {
        e.preventDefault(); e.stopImmediatePropagation(); toggle();
      } else if (open && e.key === "Escape") {
        e.preventDefault(); e.stopImmediatePropagation(); close();
      } else if (open && (e.key === "+" || e.key === "=")) {
        setZoom(z + 0.03);
      } else if (open && e.key === "-") {
        setZoom(z - 0.03);
      }
    }, true);
  });
})();
