// Deck binding: wires <div data-demo="slug" data-controls="a,b"> hosts in a
// reveal.js deck to the demo registry. Call inside
// Reveal.initialize().then(() => initDeckDemos()) so slides exist in the DOM
// first. A div may hold a .viz-fallback (e.g. a static screenshot or a "demo
// unavailable" note) that this hides only once the live demo is built.
import { DEMOS } from './demos/registry.js';

export function initDeckDemos(root = document) {
  const hosts = root.querySelectorAll('[data-demo]');
  for (const host of hosts) {
    const slug = host.dataset.demo;
    const demo = DEMOS[slug];

    if (!demo) {
      console.warn(`initDeckDemos: unknown demo slug "${slug}"`, host);
      continue;
    }

    const controls = (host.dataset.controls ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      demo.make(host, { stage: 'embed', controls });
      const fallback = host.querySelector('.viz-fallback');
      if (fallback) fallback.style.display = 'none';
    } catch (err) {
      console.warn(`initDeckDemos: failed to build demo "${slug}"`, err);
    }
  }
  fitCodeBlocks();
}

// Code blocks whose longest line is wider than the slide shrink their font until the line fits
// (never below 60 % of the deck's code size), on each slide as it is shown. Keeps worked
// arithmetic in fenced blocks readable without hand-tuning every block.
export function fitCodeBlocks() {
  const R = window.Reveal;
  if (!R || fitCodeBlocks.bound) return;
  fitCodeBlocks.bound = true;
  const fit = (slide) => {
    if (!slide) return;
    slide.querySelectorAll('pre code').forEach((c) => {
      c.style.fontSize = '';
      const base = parseFloat(getComputedStyle(c).fontSize);
      let fs = base;
      for (let i = 0; i < 24 && c.scrollWidth > c.clientWidth + 1 && fs > base * 0.6; i++) {
        fs *= 0.95;
        c.style.fontSize = `${fs}px`;
      }
    });
  };
  R.on('slidechanged', (e) => fit(e.currentSlide));
  R.on('resize', () => fit(R.getCurrentSlide()));
  fit(R.getCurrentSlide());
}
