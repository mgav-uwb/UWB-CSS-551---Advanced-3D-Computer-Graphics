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
}
