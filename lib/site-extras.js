// site-extras.js: the course site's fun extras, drawn from lib/site-data.js (every fact, quote and
// comic there carries its source).
//   <div data-quote></div>   a quote, with "another"
//   <div data-fact></div>    a "did you know?" fact, with its topic and "another"
//   <div data-comic></div>   an xkcd strip (CC BY-NC 2.5, credited), with "another"
//   <div data-icons="5"></div>  a strip of 5 icons drawn at random from ICON_POOL (plus the film and
//                           game stills of lib/site-data-extra.js), each with a "?" that opens its facts
// Mount with: import { mountExtras } from '<base>lib/site-extras.js'; mountExtras({ base: '<base>' });
import { QUOTES, FACTS, ICON_FACTS, COMICS } from './site-data.js';

const TOPIC_LABEL = {
  history: 'history', vectors: 'vectors', rotation: 'rotation', transforms: 'transforms',
  'scene-graphs': 'scene graphs', viewing: 'viewing', rasterization: 'rasterization',
  antialiasing: 'antialiasing', meshes: 'meshes', textures: 'textures', illumination: 'illumination',
  color: 'color', 'ray-tracing': 'ray tracing', 'light-transport': 'light transport',
  animation: 'animation', hardware: 'hardware', interaction: 'interaction', unity: 'Unity',
  neural: 'neural networks', 'image-space': 'the space of images', diffusion: 'diffusion',
  'learned-scenes': 'learned scenes', generative: 'generative models', 'film-games': 'film and games',
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// a source is text, URLs, or both: show the text, and link each URL by its host name
const srcHTML = (src) => {
  const str = String(src || '');
  const urls = str.match(/https?:\/\/[^\s;,)]+[^\s;,.)]/g) || [];
  const text = esc(urls.reduce((t, u) => t.replace(u, ''), str).replace(/\(\s*\)/g, '').replace(/^[\s;,·:]+|[\s;,·:(]+$/g, '').replace(/\s*;\s*;/g, ';'));
  const links = urls.map((u) => {
    let host = u; try { host = new URL(u).hostname.replace(/^www\./, ''); } catch {}
    return `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(host)}</a>`;
  });
  return [text, ...links].filter(Boolean).join(' · ');
};

// a shuffled deck per kind, so "another" walks the whole set before repeating
function deck(n) {
  const a = [...Array(n).keys()];
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  let k = 0;
  return () => a[k++ % n];
}

// the renders made for this course (tools/gen-site-icons.mjs); their facts are ICON_FACTS in site-data.js
// or, for the two added later, given here
export const ICON_POOL = [
  { id: 'teapot', img: 'media/icons/teapot.png', title: 'Utah teapot', sub: 'Newell, 1975' },
  { id: 'bunny', img: 'media/icons/bunny.png', title: 'Stanford bunny', sub: 'Turk & Levoy, 1994' },
  { id: 'cornell', img: 'media/icons/cornell.png', title: 'Cornell box', sub: 'Goral et al., 1984' },
  { id: 'whitted', img: 'media/icons/whitted.png', title: 'Spheres on a checkerboard', sub: 'after Whitted, 1980' },
  { id: 'dragon', img: 'media/icons/dragon.png', title: 'Stanford dragon', sub: 'Stanford, 1996' },
  { id: 'furbunny', img: 'media/icons/furbunny.png', title: 'A fur bunny', sub: 'after Kajiya & Kay, 1989, and Roman, 2003', link: { label: 'try it live: the fur demo', url: 'lib/demo.html?demo=fur' }, facts: [
    { t: 'This bunny wears about 110,000 hairs, each a five-segment curve grown from the surface and bent by gravity, lit per vertex with the Kajiya-Kay hair model and darkened toward the root to fake self-shadowing.', src: 'tools/site-icons.html' },
    { t: 'Kajiya and Kay (1989) shade a hair by its tangent rather than a surface normal: the diffuse term is the sine of the angle between the hair and the light, which is why fur glows along its edges.', src: 'Kajiya and Kay, “Rendering Fur with Three Dimensional Textures,” SIGGRAPH 1989' },
    { t: 'The idea for this picture comes from Augusto Roman’s fur bunny, a Stanford CS348b rendering competition entry that grew up to half a million hairs on the Stanford bunny.', src: 'Stanford CS348b rendering competition, 2003 https://graphics.stanford.edu/courses/cs348b-competition/cs348b-03/' },
    { t: 'Film fur is simulated strand by strand: Pixar’s Monsters, Inc. (2001) gave Sulley about 2.3 million hairs.', src: 'Pixar, Monsters, Inc. production notes, as reported by fxguide and others' },
  ] },
  { id: 'voxel', img: 'media/icons/voxel.png', title: 'A voxel world', sub: 'every block a cube', facts: [
    { t: 'A voxel is a volume element, the 3D cousin of the pixel: a value on a regular 3D grid.', src: 'course text, Polygonal Meshes' },
    { t: 'Block games draw their worlds as voxels but render them as triangles: each visible cube face is two triangles, and faces hidden between two solid blocks are skipped.', src: 'course text, Polygonal Meshes and Rasterization' },
    { t: 'This picture is one instanced draw call: one cube mesh and a list of positions and colors, so the GPU draws every block from a single upload.', src: 'tools/site-icons.html (THREE.InstancedMesh)' },
  ] },
];

// a strip of n icons at random from the pool (and the film and game stills when present)
async function mountIconStrip(el, base) {
  // the film and game stills, the physics renders and the film homages are optional modules
  const extra = [];
  for (const m of ['./site-data-extra.js', './site-data-sim.js', './site-data-film.js']) {
    try { extra.push(...((await import(m)).EXTRA_ICONS || [])); } catch { /* not built yet */ }
  }
  const pool = [...ICON_POOL, ...extra];
  const n = Math.min(pool.length, Number(el.dataset.icons) || 5);
  const order = deck(pool.length);
  el.classList.add('icons');
  const wrap = el.parentElement;
  const draw = () => {
    const chosen = Array.from({ length: n }, () => pool[order()]);
    el.innerHTML = chosen.map((c) => `<figure data-icon="${esc(c.id)}"><img src="${base}${esc(c.img)}" alt="${esc(c.title)}"><figcaption>${esc(c.title)}<span>${esc(c.sub || '')}</span>${c.credit ? `<em>${esc(c.credit)}</em>` : ''}${c.link ? `<a class="sx-watch" href="${esc(c.link.url)}" target="_blank" rel="noopener">${esc(c.link.label)}</a>` : ''}</figcaption></figure>`).join('');
    el.querySelectorAll('figure').forEach((fig, i) => mountIconFacts(fig, chosen[i].facts || ICON_FACTS[chosen[i].id] || [], chosen[i].title));
  };
  draw();
  if (wrap && !wrap.querySelector(':scope > .sx-next.sx-icons-next')) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'sx-next sx-icons-next'; b.textContent = 'another ↻';
    b.setAttribute('aria-label', 'other pictures');
    b.onclick = draw;
    wrap.appendChild(b);
  }
}


// ── the picture strip: equal square tiles, the comic always first; one refresh for the strip;
//    hovering (or focusing, or tapping) a tile opens one overlay with the large picture and its facts,
//    whose "another" loads a random picture or comic in place.  <div data-strip></div>
export async function loadPool() {
  const extra = [];
  for (const m of ['./site-data-extra.js', './site-data-sim.js', './site-data-film.js']) {
    try { extra.push(...((await import(m)).EXTRA_ICONS || [])); } catch { /* optional */ }
  }
  return [...ICON_POOL, ...extra].map((c) => ({ kind: 'pic', ...c, facts: c.facts || ICON_FACTS[c.id] || [] }));
}
export const comicItem = (c) => ({ kind: 'comic', id: `xkcd-${c.num}`, img: c.img, title: c.title, num: c.num, alt: c.alt });

async function mountStrip(el, base) {
  const pics = await loadPool();
  const nextPic = deck(pics.length), nextComic = deck(COMICS.length);
  const tiles = document.createElement('div');
  tiles.className = 'sx-tiles';
  const refresh = document.createElement('button');
  refresh.type = 'button'; refresh.className = 'sx-refresh'; refresh.textContent = '↻';
  refresh.title = 'different pictures and comic'; refresh.setAttribute('aria-label', 'different pictures and comic');
  el.classList.add('sx-strip');
  const kids = [tiles, refresh];
  if (el.dataset.gallery) {
    const g = document.createElement('a');
    g.className = 'sx-refresh sx-grid'; g.href = el.dataset.gallery; g.textContent = '▦';
    g.title = 'all pictures and comics'; g.setAttribute('aria-label', 'all pictures and comics');
    kids.push(g);
  }
  el.replaceChildren(...kids);

  // one overlay for the whole page
  const ov = document.createElement('div');
  ov.className = 'sx-ov'; ov.hidden = true; ov.setAttribute('role', 'dialog');
  document.body.appendChild(ov);
  let hideTimer = null, anchor = null;
  const cancelHide = () => { clearTimeout(hideTimer); hideTimer = null; };
  const hideSoon = () => { cancelHide(); hideTimer = setTimeout(() => { ov.hidden = true; anchor = null; ov.querySelector('video')?.pause(); }, 180); };
  ov.addEventListener('mouseenter', cancelHide);
  ov.addEventListener('mouseleave', hideSoon);
  ov.addEventListener('click', (e) => e.stopPropagation());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { ov.hidden = true; anchor = null; } });
  document.addEventListener('click', (e) => { if (!ov.contains(e.target) && !tiles.contains(e.target)) { ov.hidden = true; anchor = null; } });

  const fill = (item) => {
    const link = item.kind === 'comic' ? `https://xkcd.com/${item.num}/` : null;
    ov.innerHTML = `
      <div class="sx-ov-h"><b>${esc(item.title)}</b>${item.kind === 'comic' ? ` <span>xkcd #${item.num}</span>` : (item.sub ? ` <span>${esc(item.sub)}</span>` : '')}
        <span class="sx-ov-btns"><button type="button" class="sx-next sx-ov-another">another ↻</button><button type="button" class="sx-x" aria-label="close">×</button></span></div>
      ${item.video ? `<video src="${base}${esc(item.video)}" poster="${base}${esc(item.img)}" controls autoplay muted loop playsinline></video>`
        : `${link ? `<a href="${link}" target="_blank" rel="noopener">` : ''}<img src="${base}${esc(item.img)}" alt="${esc(item.title)}">${link ? '</a>' : ''}`}
      ${item.kind === 'comic'
        ? `<p class="sx-alt">${esc(item.alt)}</p><div class="sx-credit"><a href="${link}" target="_blank" rel="noopener">xkcd</a> by Randall Munroe, <a href="https://creativecommons.org/licenses/by-nc/2.5/" target="_blank" rel="noopener">CC BY-NC 2.5</a></div>`
        : `${item.facts.length ? `<ul>${item.facts.map((f) => `<li>${esc(f.t)} <span class="sx-src">${srcHTML(f.src)}</span></li>`).join('')}</ul>` : ''}
           ${item.credit ? `<div class="sx-credit">${esc(item.credit)}</div>` : ''}
           ${item.link ? `<div class="sx-credit"><a href="${/^https?:/.test(item.link.url) ? esc(item.link.url) : base + esc(item.link.url)}" target="_blank" rel="noopener">${esc(item.link.label)}</a></div>` : ''}`}`;
    ov.querySelector('.sx-x').onclick = () => { ov.hidden = true; anchor = null; };
    ov.querySelector('.sx-ov-another').onclick = () => {
      fill(Math.random() < COMICS.length / (COMICS.length + pics.length) ? comicItem(COMICS[nextComic()]) : pics[nextPic()]);
    };
  };
  const place = (tile) => {
    const r = tile.getBoundingClientRect();
    const w = Math.min(560, window.innerWidth - 24);
    ov.style.width = `${w}px`;
    let left = r.left + window.scrollX + r.width / 2 - w / 2;
    left = Math.max(12 + window.scrollX, Math.min(left, window.scrollX + window.innerWidth - w - 12));
    ov.style.left = `${left}px`;
    ov.style.top = `${el.getBoundingClientRect().bottom + window.scrollY + 6}px`; // always below the strip
  };
  const open = (tile, item) => { cancelHide(); if (anchor === tile && !ov.hidden) return; anchor = tile; fill(item); ov.hidden = false; place(tile); };

  const draw = () => {
    const tileW = 76;
    const fixed = Number(el.dataset.strip);
    const n = fixed > 0 ? fixed : Math.max(3, Math.floor((tiles.clientWidth + 8) / (tileW + 8)));
    const items = [comicItem(COMICS[nextComic()]), ...Array.from({ length: Math.min(n - 1, pics.length) }, () => pics[nextPic()])];
    tiles.innerHTML = items.map((it, i) => `<button type="button" class="sx-tile${it.kind === 'comic' ? ' comic' : ''}" data-i="${i}" aria-label="${esc(it.title)}">${it.video
      ? `<video src="${base}${esc(it.video)}" poster="${base}${esc(it.img)}" muted loop autoplay playsinline preload="metadata"></video>`
      : `<img src="${base}${esc(it.img)}" alt="">`}</button>`).join('');
    tiles.querySelectorAll('.sx-tile').forEach((t) => {
      const it = items[+t.dataset.i];
      t.addEventListener('mouseenter', () => open(t, it));
      t.addEventListener('mouseleave', hideSoon);
      t.addEventListener('focus', () => open(t, it));
      t.addEventListener('click', (e) => { e.stopPropagation(); if (anchor === t && !ov.hidden) { ov.hidden = true; anchor = null; } else open(t, it); });
    });
    ov.hidden = true; anchor = null;
  };
  refresh.onclick = draw;
  draw();
  let rw = tiles.clientWidth;
  window.addEventListener('resize', () => { if (Math.abs(tiles.clientWidth - rw) > 40) { rw = tiles.clientWidth; draw(); } });
}

export function mountExtras({ base = '../' } = {}) {
  const nextQ = deck(QUOTES.length), nextF = deck(FACTS.length), nextC = deck(COMICS.length);

  const drawQuote = (el) => {
    const q = QUOTES[nextQ()];
    el.innerHTML = `<blockquote class="sx-quote"><p>“${esc(q.q)}”</p><div class="sx-by"><button type="button" class="sx-next" aria-label="another quote">another ↻</button>${esc(q.who)} <span>· ${srcHTML(q.src)}</span></div></blockquote>`;
    el.querySelector('.sx-next').onclick = () => drawQuote(el);
  };
  const drawFact = (el) => {
    const f = FACTS[nextF()];
    el.innerHTML = `<div class="sx-fact"><span class="sx-dot">✦</span>
      <div><span class="sx-ft"><b>Did you know?</b> ${esc(f.t)}</span>
        <div class="sx-meta"><span class="sx-topic">${esc(TOPIC_LABEL[f.topic] || f.topic)}</span> ${srcHTML(f.src)}
        <button type="button" class="sx-next" aria-label="another fact">another ↻</button></div></div></div>`;
    el.querySelector('.sx-next').onclick = () => drawFact(el);
  };
  const drawComic = (el) => {
    if (!COMICS.length) { el.hidden = true; return; }
    const c = COMICS[nextC()];
    const link = `https://xkcd.com/${c.num}/`;
    el.innerHTML = `<figure class="sx-comic">
      <figcaption><b>${esc(c.title)}</b> <span>xkcd #${c.num}</span>
        <button type="button" class="sx-next" aria-label="another comic">another ↻</button></figcaption>
      <a href="${link}" target="_blank" rel="noopener"><img src="${base}${esc(c.img)}" alt="${esc(c.title)}" title="${esc(c.alt)}" loading="lazy"></a>
      <div class="sx-credit"><a href="${link}" target="_blank" rel="noopener">xkcd</a> by Randall Munroe,
        <a href="https://creativecommons.org/licenses/by-nc/2.5/" target="_blank" rel="noopener">CC BY-NC 2.5</a>. Hover for the alt text.</div>
    </figure>`;
    el.querySelector('.sx-next').onclick = () => drawComic(el);
  };

  document.querySelectorAll('[data-quote]').forEach(drawQuote);
  document.querySelectorAll('[data-fact]').forEach(drawFact);
  document.querySelectorAll('[data-comic]').forEach(drawComic);
  document.querySelectorAll('[data-icons]').forEach((el) => mountIconStrip(el, base));
  document.querySelectorAll('[data-strip]').forEach((el) => mountStrip(el, base));
}

// the "?" on each icon card: a popover with that model's facts
function mountIconFacts(fig, facts, name) {
  if (!facts.length) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sx-ask';
  btn.textContent = '?';
  btn.setAttribute('aria-label', `facts about the ${name}`);
  btn.setAttribute('aria-expanded', 'false');
  const pop = document.createElement('div');
  pop.className = 'sx-pop';
  pop.hidden = true;
  pop.innerHTML = `<div class="sx-pop-h"><b>${esc(name)}</b><button type="button" class="sx-x" aria-label="close">×</button></div>
    <ul>${facts.map((f) => `<li>${esc(f.t)} <span class="sx-src">${srcHTML(f.src)}</span></li>`).join('')}</ul>`;
  fig.append(btn, pop);
  const set = (open) => {
    document.querySelectorAll('.sx-pop').forEach((p) => { if (p !== pop) { p.hidden = true; p.previousSibling?.setAttribute?.('aria-expanded', 'false'); } });
    pop.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    if (open && window.innerWidth > 600) {
      pop.style.left = '50%'; pop.style.transform = 'translateX(-50%)';
      const r = pop.getBoundingClientRect(), pad = 12;
      const shift = r.left < pad ? pad - r.left : (r.right > window.innerWidth - pad ? window.innerWidth - pad - r.right : 0);
      if (shift) pop.style.transform = `translateX(calc(-50% + ${shift}px))`;
    }
  };
  btn.onclick = (e) => { e.stopPropagation(); set(pop.hidden); };
  pop.querySelector('.sx-x').onclick = () => set(false);
  pop.onclick = (e) => e.stopPropagation();
  document.addEventListener('click', () => set(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
}

export const EXTRAS_CSS = `
.sx-quote{margin:0;background:linear-gradient(135deg,#fff0f6,#f1ecff);border:1px solid #efdcf2;border-radius:16px;padding:16px 20px}
.sx-quote p{margin:0 0 8px;font-size:17px;line-height:1.45;color:#3a2f55;font-style:italic}
.sx-quote .sx-by{font-size:13px;color:#8a4f7a;font-weight:600}
.sx-quote .sx-by span{color:#8d86a3;font-weight:400}
.sx-fact{display:flex;gap:14px;align-items:flex-start;background:linear-gradient(135deg,#eafaf2,#e6f4ff);border:1px solid #d6eee5;border-radius:16px;padding:12px 16px;font-size:14px;color:#2f3d45;line-height:1.45}
.sx-fact b{color:#1c8766}
.sx-meta{margin-top:6px;font-size:12px;color:#6c6584}
.sx-topic{display:inline-block;background:#fff;border:1px solid #d6eee5;border-radius:999px;padding:0 9px;color:#1c8766;font-weight:600;margin-right:6px}
.sx-dot{font-size:24px;color:#7a58d6;flex:0 0 auto;width:34px;text-align:center;line-height:1.2}
.sx-next{margin-left:8px;border:1px solid #e3d6f5;background:#fff;border-radius:999px;padding:1px 10px;font-size:12px;color:#7a58d6;cursor:pointer;font-style:normal}
.sx-next:hover{background:#f4edff}
.sx-comic{margin:0;background:#fff;border:1px solid #efe4fa;border-radius:16px;padding:12px 16px;text-align:center}
.sx-comic figcaption{text-align:left;font-size:14px;color:#3a2f55;margin-bottom:8px}
.sx-comic figcaption span{color:#8d86a3;font-size:12px;margin-left:4px}
.sx-comic img{max-width:100%;max-height:420px;height:auto;border-radius:6px}
.sx-credit{font-size:11.5px;color:#8d86a3;margin-top:6px}
[data-icon]{position:relative}
.sx-ask{position:absolute;top:6px;right:6px;width:24px;height:24px;border-radius:50%;border:1px solid #e3d6f5;background:#fffffff0;color:#7a58d6;font-weight:800;font-size:13px;line-height:1;cursor:pointer;box-shadow:0 1px 3px #7a58d622}
.sx-ask:hover,.sx-ask[aria-expanded="true"]{background:#7a58d6;color:#fff}
.sx-pop{position:absolute;z-index:20;top:34px;left:50%;transform:translateX(-50%);width:min(340px,86vw);text-align:left;background:#fff;border:1px solid #e3d6f5;border-radius:14px;box-shadow:0 10px 30px #3a2f5530;padding:10px 14px 12px;font-size:13px;line-height:1.45;color:#2d2640}
.sx-pop-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;color:#7a58d6}
.sx-x{border:none;background:none;font-size:20px;line-height:1;color:#8d86a3;cursor:pointer}
.sx-pop ul{margin:0;padding-left:18px} .sx-pop li{margin:6px 0}
.sx-src{display:block;font-size:11px;color:#8d86a3}
.icons figcaption em{display:block;font-style:normal;font-size:10px;color:#a39cb8;margin-top:2px}
.sx-src a,.sx-meta a,.sx-credit a,.sx-quote a{color:#7a58d6}
[data-icon]:has(.sx-pop:not([hidden])){z-index:30}
@media (max-width:600px){.sx-pop{position:fixed;top:12vh;left:50%;transform:translateX(-50%)}}
/* compact by default: two lines each, the whole card on hover or focus */
.sx-quote{padding:8px 13px;border-radius:12px}
.sx-quote p{font-size:14px;margin:0 0 3px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sx-quote .sx-by{font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sx-quote .sx-by .sx-next{float:right;margin:0 0 0 8px;padding:0 8px;font-size:11px}
.sx-quote:hover .sx-by,.sx-quote:focus-within .sx-by{white-space:normal}
.sx-fact .sx-meta{display:none}
.sx-fact:hover .sx-meta,.sx-fact:focus-within .sx-meta{display:block}
.sx-fact .sx-dot{align-self:center}
.sx-fact{padding:8px 13px;font-size:13px;border-radius:12px;gap:8px}
.sx-ft{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.sx-dot{font-size:18px;width:22px}
.sx-meta{margin-top:3px}
.sx-quote:hover p,.sx-quote:focus-within p,.sx-fact:hover .sx-ft,.sx-fact:focus-within .sx-ft{-webkit-line-clamp:unset;display:block}
.sx-comic{padding:6px 8px;border-radius:12px}
.sx-comic figcaption{font-size:12px;margin-bottom:4px;display:flex;align-items:center;gap:4px;flex-wrap:nowrap;white-space:nowrap;overflow:hidden}
.sx-comic figcaption b{overflow:hidden;text-overflow:ellipsis}
.sx-comic figcaption .sx-next{padding:0 7px;font-size:11px}
.sx-comic figcaption .sx-next{margin-left:auto}
.sx-comic img{max-height:84px;transition:max-height .2s}
.sx-credit{font-size:10.5px;margin-top:3px;display:none}
.sx-comic:hover img,.sx-comic:focus-within img{max-height:560px}
.sx-comic:hover .sx-credit,.sx-comic:focus-within .sx-credit{display:block}
.sx-watch{display:block;font-size:10.5px;color:#7a58d6;margin-top:2px}
/* the strip */
.sx-strip{display:flex;gap:8px;align-items:center}
.sx-tiles{flex:0 1 auto;display:flex;gap:8px;overflow:hidden;min-width:0}
.sx-tile{flex:0 0 76px;width:76px;height:76px;padding:0;border:1px solid #e9def8;border-radius:12px;background:#fff;overflow:hidden;cursor:pointer}
.sx-tile img,.sx-tile video{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
.sx-tile.comic img{object-position:top center}
.sx-tile:hover,.sx-tile:focus-visible{border-color:#7a58d6;outline:none}
.sx-refresh{flex:0 0 auto;width:32px;height:76px;border:1px solid #e3d6f5;border-radius:12px;background:#fff;color:#7a58d6;font-size:18px;cursor:pointer}
.sx-refresh:hover{background:#f4edff}
a.sx-refresh{display:flex;align-items:center;justify-content:center;text-decoration:none;box-sizing:border-box}
.sx-ov{box-sizing:border-box;position:absolute;z-index:100;background:#fff;border:1px solid #e3d6f5;border-radius:14px;box-shadow:0 12px 36px #3a2f5540;padding:10px 14px 12px;font-size:13px;line-height:1.45;color:#2d2640;max-height:80vh;overflow:auto}
.sx-ov-h{display:flex;align-items:center;gap:6px;margin-bottom:8px}
.sx-ov-h b{color:#3a2f55;font-size:14px} .sx-ov-h > span{color:#8d86a3;font-size:12px}
.sx-ov-btns{margin-left:auto;display:flex;align-items:center;gap:4px}
.sx-ov img,.sx-ov video{display:block;max-width:100%;max-height:52vh;margin:0 auto;border-radius:8px}
.sx-ov ul{margin:10px 0 0;padding-left:18px} .sx-ov li{margin:5px 0}
.sx-ov .sx-alt{font-style:italic;color:#6c6584;margin:8px 0 0}
.sx-ov .sx-credit{display:block;font-size:11.5px;color:#8d86a3;margin-top:6px}
.sx-ov a{color:#7a58d6}
`;
const st = document.createElement('style');
st.textContent = EXTRAS_CSS;
document.head.appendChild(st);
