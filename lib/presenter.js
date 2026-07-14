/* CSS 343 presenter companion — drive two synced browser tabs of one deck.
 *
 *   Tab 1: open the deck normally  → drag to the projector.
 *   Tab 2: press  N  on tab 1 (or open <deck-url>?notes) → keep on your laptop.
 *
 * The notes tab shows the current + next slide's speaker notes, a slide
 * counter, and an elapsed timer. Navigate from EITHER tab (arrows / space /
 * the on-screen buttons) and both stay in lock-step. Sync is same-origin,
 * same-machine via BroadcastChannel — no network, no server component.
 *
 * Notes come from the deck's  Note:  blocks, which exist only in the private
 * source decks (the public build strips them). Present from a local serve of
 * the private repo to see notes:  python3 -m http.server  in css343/.
 */
(function () {
  function whenReady(fn) {
    if (window.Reveal && Reveal.isReady && Reveal.isReady()) fn();
    else setTimeout(function () { whenReady(fn); }, 60);
  }

  whenReady(function () {
    var chan = new BroadcastChannel("css343-present:" + location.pathname);
    var notesMode = new URLSearchParams(location.search).has("notes");
    var echo = false; // guard against re-broadcasting a state we just applied

    function push() {
      if (echo) return;
      chan.postMessage({ t: "state", s: Reveal.getState() });
    }
    ["slidechanged", "fragmentshown", "fragmenthidden"].forEach(function (e) {
      Reveal.on(e, push);
    });

    chan.onmessage = function (ev) {
      var m = ev.data;
      if (m.t === "state") {
        echo = true;
        Reveal.setState(m.s);
        setTimeout(function () { echo = false; }, 80);
        if (notesMode) render();
      } else if (m.t === "hello") {
        push(); // a newly opened tab is asking where we are
      }
    };
    chan.postMessage({ t: "hello" }); // ask any existing tab for its position

    // ---- main slides tab: press N to spawn the notes tab -------------------
    if (!notesMode) {
      document.addEventListener("keydown", function (e) {
        if ((e.key === "n" || e.key === "N") && !e.metaKey && !e.ctrlKey && !e.altKey) {
          window.open(location.pathname + "?notes", "_blank");
        }
      });
      return;
    }

    // ---- notes tab: build the presenter view -------------------------------
    document.title = "NOTES · " + document.title;

    var style = document.createElement("style");
    style.textContent = [
      ".reveal, .backgrounds { visibility: hidden !important; }",
      "#pv { position: fixed; inset: 0; z-index: 99999; background: #14161c; color: #e8eaf0;",
      "  font: 16px/1.6 -apple-system, system-ui, sans-serif; display: flex; flex-direction: column; }",
      "#pv-bar { display: flex; align-items: center; gap: 14px; padding: 11px 20px;",
      "  background: #1e2129; border-bottom: 1px solid #2c303a; flex: none; }",
      "#pv-bar b { font-size: 19px; color: #fff; font-variant-numeric: tabular-nums; }",
      "#pv-time { font-variant-numeric: tabular-nums; font-size: 19px; color: #7c9cff; }",
      "#pv-bar .sp { flex: 1; }",
      "#pv-bar button { background: #2c303a; color: #e8eaf0; border: 0; border-radius: 6px;",
      "  padding: 7px 13px; font-size: 15px; cursor: pointer; }",
      "#pv-bar button:hover { background: #3a3f4c; }",
      "#pv-body { flex: 1; overflow-y: auto; padding: 22px 30px 60px; }",
      "#pv-now { font-size: 21px; }",
      "#pv-now p, #pv-next p { margin: 0 0 .7em; }",
      "#pv-now pre, #pv-next pre { white-space: pre-wrap; }",
      "#pv-now .empty, #pv-next .empty { color: #6b7280; font-style: italic; }",
      "#pv-next { margin-top: 26px; padding-top: 16px; border-top: 1px dashed #3a3f4c;",
      "  color: #9aa2b4; font-size: 16px; }",
      "#pv-next h4 { margin: 0 0 8px; font-size: 11px; letter-spacing: .09em;",
      "  text-transform: uppercase; color: #6b7280; }",
    ].join("\n");
    document.head.appendChild(style);

    var pv = document.createElement("div");
    pv.id = "pv";
    pv.innerHTML =
      '<div id="pv-bar">' +
      '  <button id="pv-prev" title="Previous (←)">◀</button>' +
      '  <button id="pv-next-btn" title="Next (→ / space)">▶</button>' +
      '  <b id="pv-count">– / –</b>' +
      '  <span class="sp"></span>' +
      '  <span id="pv-time">00:00</span>' +
      '  <button id="pv-reset" title="Reset timer">⟳ timer</button>' +
      "</div>" +
      '<div id="pv-body">' +
      '  <div id="pv-now"></div>' +
      '  <div id="pv-next"><h4>Next slide</h4><div id="pv-next-body"></div></div>' +
      "</div>";
    document.body.appendChild(pv);

    document.getElementById("pv-prev").onclick = function () { Reveal.prev(); };
    document.getElementById("pv-next-btn").onclick = function () { Reveal.next(); };

    // timer
    var t0 = Date.now();
    document.getElementById("pv-reset").onclick = function () { t0 = Date.now(); tick(); };
    function tick() {
      var s = Math.floor((Date.now() - t0) / 1000);
      var mm = String(Math.floor(s / 60)).padStart(2, "0");
      var ss = String(s % 60).padStart(2, "0");
      document.getElementById("pv-time").textContent = mm + ":" + ss;
    }
    setInterval(tick, 1000);

    function noteOf(el) {
      var a = el && el.querySelector("aside.notes");
      return a && a.innerHTML.trim() ? a.innerHTML : '<span class="empty">— no notes —</span>';
    }
    function render() {
      var slides = Reveal.getSlides();
      var cur = Reveal.getCurrentSlide();
      var i = slides.indexOf(cur);
      document.getElementById("pv-count").textContent = (i + 1) + " / " + slides.length;
      document.getElementById("pv-now").innerHTML = noteOf(cur);
      document.getElementById("pv-next-body").innerHTML =
        i + 1 < slides.length ? noteOf(slides[i + 1]) : '<span class="empty">— end of deck —</span>';
    }
    Reveal.on("slidechanged", render);
    Reveal.on("fragmentshown", render);
    Reveal.on("fragmenthidden", render);
    tick();
    render();
  });
})();
