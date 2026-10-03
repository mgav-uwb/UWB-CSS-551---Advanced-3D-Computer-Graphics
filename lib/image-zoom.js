// Click any image on a slide to see it filling the screen; click again, or press Escape, to return.
// Images inside a live demo ([data-demo]) or marked class="no-zoom" are left alone. While the
// enlarged view is open, keys are kept from reveal.js so Escape does not open the slide overview.
(function () {
  const css = `
    .reveal .slides img:not(.no-zoom) { cursor: zoom-in; }
    .izoom { position: fixed; inset: 0; z-index: 10000; display: flex; flex-direction: column;
             align-items: center; justify-content: center; gap: 10px; background: #0c0e14;
             cursor: zoom-out; opacity: 0; transition: opacity 0.15s; }
    .izoom.on { opacity: 1; }
    .izoom img { width: 96vw; height: calc(100vh - 80px); object-fit: contain; }
    .izoom .izoom-cap { color: #e6e8f0; font: 15px/1.4 system-ui, sans-serif; max-width: 90vw; text-align: center; }`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  let box = null;

  function caption(img) {
    // the credit line under the image on the slide, if any, else the alt text
    const next = img.closest('p, figure')?.nextElementSibling;
    const small = img.closest('figure')?.querySelector('figcaption, small') ||
                  (next && next.matches('p') && next.querySelector('small'));
    return (small && small.textContent.trim()) || img.alt || '';
  }

  function open(img) {
    box = document.createElement('div');
    box.className = 'izoom';
    const big = document.createElement('img');
    big.src = img.currentSrc || img.src;
    big.alt = img.alt || '';
    box.appendChild(big);
    const text = caption(img);
    if (text) {
      const c = document.createElement('div');
      c.className = 'izoom-cap';
      c.textContent = text;
      box.appendChild(c);
    }
    box.addEventListener('click', close);
    document.body.appendChild(box);
    requestAnimationFrame(() => box && box.classList.add('on'));
  }

  function close() {
    if (!box) return;
    box.remove();
    box = null;
  }

  document.addEventListener('click', (e) => {
    const img = e.target.closest('.reveal .slides img');
    if (!img || img.classList.contains('no-zoom') || img.closest('[data-demo]')) return;
    e.preventDefault();
    e.stopPropagation();
    open(img);
  }, true);

  window.addEventListener('keydown', (e) => {
    if (!box) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') close();
  }, true);
})();
