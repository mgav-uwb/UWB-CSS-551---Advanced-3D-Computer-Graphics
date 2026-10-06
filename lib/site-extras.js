// site-extras.js: the course site's fun extras, drawn from lib/site-data.js (every fact, quote and
// comic there carries its source).
//   <div data-quote></div>   a quote, with "another"
//   <div data-fact></div>    a "did you know?" fact, with its topic and "another"
//   <div data-comic></div>   an xkcd strip (CC BY-NC 2.5, credited), with "another"
//   <div data-icons="5"></div>  a strip of 5 icons drawn at random from ICON_POOL (plus the film and
//                           game stills of lib/site-data-extra.js), each with a "?" that opens its facts
// Mount with: import { mountExtras } from '<base>lib/site-extras.js'; mountExtras({ base: '<base>' });
import { QUOTES, FACTS, ICON_FACTS, COMICS } from './site-data.js';

// the data modules load with this script's own version stamp (index.html imports site-extras.js?v=N),
// so a new stamp refreshes the picture data too instead of leaving it in the browser cache
const VER = new URL(import.meta.url).search;

const TOPIC_LABEL = {
  history: 'history', vectors: 'vectors', rotation: 'rotation', transforms: 'transforms',
  'scene-graphs': 'scene graphs', viewing: 'viewing', rasterization: 'rasterization',
  antialiasing: 'antialiasing', meshes: 'meshes', textures: 'textures', illumination: 'illumination',
  color: 'color', 'ray-tracing': 'ray tracing', 'light-transport': 'light transport',
  animation: 'animation', hardware: 'hardware', interaction: 'interaction', unity: 'Unity',
  neural: 'neural networks', curves: 'curves and surfaces', shaders: 'shaders', webgl: 'WebGL', 'image-space': 'the space of images', diffusion: 'diffusion',
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
  { id: 'teapot', img: 'media/icons/teapot.png', title: 'Utah teapot', sub: 'Newell, mid-1970s' },
  { id: 'bunny', img: 'media/icons/bunny.png', title: 'Stanford bunny', sub: 'Turk & Levoy, 1994' },
  { id: 'cornell', img: 'media/icons/cornell.png', title: 'Cornell box', sub: 'Goral et al., 1984' },
  { id: 'whitted', img: 'media/icons/whitted.png', title: 'Spheres on a checkerboard', sub: 'after Whitted, 1980' },
  { id: 'dragon', img: 'media/icons/dragon.png', title: 'Stanford dragon', sub: 'Stanford, 1996' },
  { id: 'furbunny', img: 'media/icons/furbunny.png', title: 'A fur bunny', sub: 'Kajiya-Kay lighting on explicit strands', link: { label: 'try it live: the fur demo', url: 'lib/demo.html?demo=fur' }, facts: [
    { t: 'This bunny wears about 110,000 hairs, each a five-segment curve grown from the surface and bent by gravity, lit per vertex with the Kajiya-Kay hair model and darkened toward the root to fake self-shadowing.', src: 'tools/site-icons.html' },
    { t: 'Kajiya and Kay (1989) shade a hair by its tangent rather than a surface normal: the diffuse term is the sine of the angle between the hair and the light, which is why fur glows along its edges.', src: 'Kajiya and Kay, “Rendering Fur with Three Dimensional Textures,” SIGGRAPH 1989' },
    { t: 'Kajiya and Kay’s own fur was volumetric: a texel is a small 3D grid of fur density with a direction and a lighting frame, tiled over the surface and ray traced. This bunny borrows only their lighting model; its hairs are explicit strands, and the shells and fins of Lengyel et al. (2001) are the real-time way to draw the volumetric kind.', src: 'Kajiya and Kay, SIGGRAPH 1989; Lengyel, Praun, Finkelstein and Hoppe, “Real-Time Fur over Arbitrary Surfaces,” I3D 2001' },
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
    try { extra.push(...((await import(m + VER)).EXTRA_ICONS || [])); } catch { /* not built yet */ }
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
    try { extra.push(...((await import(m + VER)).EXTRA_ICONS || [])); } catch { /* optional */ }
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


// ── related items and course links, shown in the overlay and the gallery lightbox
// groups: items that belong together (a clip and its edits, a render and what was made from it)
export const GROUPS = {
  'Wind by the sea': ['ai-video-wind', 'ai-video-wind-cgi', 'ai-video-wind-blonde'],
  'Hair in the wind': ['sim-hair', 'ai-hair-realistic', 'ai-hair-video'],
  'Bullet time': ['photo-bullet-time-rig', 'film-homage-bullet-time'],
  'Performance capture': ['film-homage-mocap', 'film-homage-tentacles'],
  'The Stanford scans': ['bunny', 'dragon', 'furbunny'],
  'Rendering classics': ['teapot', 'cornell', 'whitted'],
  'Simulated for this course': ['sim-cloth', 'sim-splash', 'sim-rigid', 'sim-hair'],
  'Open films': ['film-bbb', 'film-sintel'],
  'Games': ['game-supertuxkart', 'game-0ad', 'voxel'],
  'Film tributes': ['film-homage-liquid-metal', 'film-homage-lamp', 'film-homage-tentacles', 'film-homage-bullet-time', 'film-homage-vr'],
};
// the gallery's sections (coarser than GROUPS, which drive the related links)
export const SECTIONS = {
  'Rendering classics': ['teapot', 'cornell', 'whitted'],
  'The Stanford scans': ['bunny', 'dragon', 'furbunny'],
  'Simulated for this course': ['sim-cloth', 'sim-splash', 'sim-rigid', 'sim-hair'],
  'Film and visual effects': ['photo-bullet-time-rig', 'film-bbb', 'film-sintel'],
  'Games and VR': ['game-supertuxkart', 'game-0ad', 'voxel', 'film-homage-vr'],
  'AI-generated: tributes to film effects': ['film-homage-liquid-metal', 'film-homage-bullet-time', 'film-homage-mocap', 'film-homage-tentacles', 'film-homage-lamp'],
  'AI-generated: our hair render, made real': ['ai-hair-realistic', 'ai-hair-video'],
  'AI-generated: wind by the sea': ['ai-video-wind', 'ai-video-wind-cgi', 'ai-video-wind-blonde'],
};
const LEC = {
  1: ['L01-big-picture-1', 'The Big Picture, part 1'], 2: ['L02-big-picture-2', 'The Big Picture, part 2'],
  3: ['L03-loop-mvc-tool', 'The loop, MVC, and the tool'], 4: ['L04-vectors', 'Vectors'], 5: ['L05-rotation', 'Rotation'],
  6: ['L06-affine', 'Affine transformations'], 7: ['L07-scene-graphs', 'Scene graphs'], 8: ['L08-viewing', 'Viewing'],
  9: ['L09-rasterization-antialiasing', 'Rasterization and antialiasing'], 10: ['L10-meshes-textures', 'Meshes and texture mapping'],
  11: ['L11-illumination', 'Illumination'], 12: ['L12-light-transport-ray-tracing', 'Light transport and ray tracing'],
  13: ['L13-path-tracing', 'Path tracing'], 14: ['L14-neural-nets-embeddings', 'Neural networks and embeddings'],
  15: ['L15-image-space', 'The space of images'], 16: ['L16-diffusion-1', 'Diffusion models I'], 17: ['L17-diffusion-2', 'Diffusion models II'],
  18: ['L18-learned-scenes', 'Learned scenes'], 19: ['L19-generative-3d-video', 'Generative 3D and video'], 20: ['L20-inverse-rendering', 'Inverse rendering'],
};
const TXT = {
  history: 'history-of-graphics', meshes: 'meshes', textures: 'texture-mapping', illum: 'illumination', lt: 'light-transport-pbr',
  rt: 'ray-tracing', raster: 'rasterization', aa: 'antialiasing', anim: 'animation', sg: 'scene-graphs', view: 'viewing',
  diffusion: 'diffusion-models', scenes: 'learned-scenes', images: 'image-space', nets: 'neural-nets-embeddings', color: 'color',
  interaction: 'interaction', rotation: 'rotation', curves: 'curves-surfaces',
};
const TXT_TITLE = {
  'history-of-graphics': 'A History of Computer Graphics', meshes: 'Polygonal Meshes', 'texture-mapping': 'Texture Mapping',
  illumination: 'Local Illumination', 'light-transport-pbr': 'Light Transport and PBR', 'ray-tracing': 'Ray Tracing',
  rasterization: 'Rasterization', antialiasing: 'Sampling and Antialiasing', animation: 'Animation and Interpolation',
  'scene-graphs': 'Scene Graphs', viewing: 'Viewing', 'diffusion-models': 'Diffusion Models', 'learned-scenes': 'Learned Scenes',
  'image-space': 'The Space of Images', 'neural-nets-embeddings': 'Neural Networks and Embeddings', color: 'Color',
  interaction: 'Interactive Systems', rotation: 'Rotation', 'curves-surfaces': 'Curves and Surfaces',
};
// what each item teaches: lecture numbers and textbook chapters (keys of TXT)
export const LEARN = {
  teapot: [[1, 10], ['history', 'curves', 'meshes']], bunny: [[1, 10], ['meshes', 'history']], dragon: [[10], ['meshes']],
  cornell: [[12, 13], ['rt', 'lt']], whitted: [[12], ['rt']], furbunny: [[11, 3], ['illum', 'anim']], voxel: [[9, 10], ['meshes', 'raster']],
  'sim-cloth': [[3], ['anim']], 'sim-splash': [[3], ['anim']], 'sim-rigid': [[3], ['anim']], 'sim-hair': [[3, 11], ['anim', 'illum']],
  'film-homage-liquid-metal': [[2, 11], ['history', 'lt']], 'film-homage-bullet-time': [[2, 8, 18], ['view', 'scenes']],
  'photo-bullet-time-rig': [[2, 8, 18], ['view', 'scenes']], 'film-homage-lamp': [[2, 7], ['sg', 'history']],
  'film-homage-tentacles': [[2, 19], ['anim', 'diffusion']], 'film-homage-mocap': [[2, 7], ['anim', 'sg']],
  'film-homage-vr': [[3, 19], ['view', 'interaction']], 'film-bbb': [[2], ['history']], 'film-sintel': [[2], ['history']],
  'game-supertuxkart': [[1, 9], ['raster', 'history']], 'game-0ad': [[7, 9], ['sg', 'raster']],
  'ai-video-wind': [[19], ['diffusion']], 'ai-video-wind-cgi': [[19, 10], ['diffusion', 'meshes']], 'ai-video-wind-blonde': [[19], ['diffusion']],
  'ai-hair-realistic': [[17], ['diffusion']], 'ai-hair-video': [[19, 3], ['diffusion', 'anim']],
};
export function relatedIds(id) {
  const out = [];
  for (const [name, ids] of Object.entries(GROUPS)) if (ids.includes(id)) out.push([name, ids.filter((x) => x !== id)]);
  return out;
}
// the "Related" and "In this course" lines for an item; related items carry data-goto so the
// overlay or lightbox can open them in place
export function linksHTML(item, base, byId) {
  const rel = relatedIds(item.id).filter(([, ids]) => ids.some((x) => byId[x]));
  const learn = LEARN[item.id];
  let h = '';
  if (rel.length) {
    h += `<div class="sx-rel">${rel.map(([name, ids]) => `<span class="sx-rel-name">${esc(name)}:</span> ${ids.filter((x) => byId[x])
      .map((x) => `<button type="button" class="sx-goto" data-goto="${esc(x)}">${esc(byId[x].title)}</button>`).join(' ')}`).join('<br>')}</div>`;
  }
  if (learn) {
    const [lecs, txts] = learn;
    const links = [
      ...lecs.map((n) => `<a href="${base}lectures/${LEC[n][0]}/index.html">Lecture ${n}: ${esc(LEC[n][1])}</a>`),
      ...txts.map((k) => `<a href="${base}textbook/${TXT[k]}.html">Text: ${esc(TXT_TITLE[TXT[k]])}</a>`),
    ];
    h += `<div class="sx-learn"><span class="sx-rel-name">In this course:</span> ${links.join(' · ')}</div>`;
  }
  return h;
}

// ── the single-item viewer: one tile that rotates every 10 s (paused while hovered or open),
//    with ? (the facts), ↻ (another) and ▦ (the gallery) on the tile; hovering enlarges it in an
//    overlay below, whose "another" loads a random item in place.
//    <div data-viewer="pics|comics" data-gallery="gallery/index.html" data-rotate="10000"></div>
const mediaHTML = (item, base, attrs = '') => item.video
  ? `<video src="${base}${esc(item.video)}" poster="${base}${esc(item.img)}" muted loop autoplay playsinline preload="metadata" ${attrs}></video>`
  : `<img src="${base}${esc(item.img)}" alt="${esc(item.title)}" ${attrs}>`;
const linkHref = (url, base) => (/^https?:/.test(url) ? esc(url) : base + esc(url));
function overlayBody(item, base, byId = {}) {
  const xk = item.kind === 'comic' ? `https://xkcd.com/${item.num}/` : null;
  return `
    <div class="sx-ov-h"><b>${esc(item.title)}</b>${xk ? ` <span>xkcd #${item.num}</span>` : (item.sub ? ` <span>${esc(item.sub)}</span>` : '')}
      <span class="sx-ov-btns"><button type="button" class="sx-next sx-ov-another">another ↻</button><button type="button" class="sx-x" aria-label="close">×</button></span></div>
    ${item.video ? mediaHTML(item, base, 'controls') : `${xk ? `<a href="${xk}" target="_blank" rel="noopener">` : ''}${mediaHTML(item, base)}${xk ? '</a>' : ''}`}
    ${item.kind === 'comic'
      ? `<p class="sx-alt">${esc(item.alt)}</p><div class="sx-credit"><a href="${xk}" target="_blank" rel="noopener">xkcd</a> by Randall Munroe, <a href="https://creativecommons.org/licenses/by-nc/2.5/" target="_blank" rel="noopener">CC BY-NC 2.5</a></div>`
      : `${(item.facts || []).length ? `<ul>${item.facts.map((f) => `<li>${esc(f.t)} <span class="sx-src">${srcHTML(f.src)}</span></li>`).join('')}</ul>` : ''}
         ${item.credit ? `<div class="sx-credit">${esc(item.credit)}</div>` : ''}
         ${item.link ? `<div class="sx-credit"><a href="${linkHref(item.link.url, base)}" target="_blank" rel="noopener">${esc(item.link.label)}</a></div>` : ''}`}
    ${linksHTML(item, base, byId)}`;
}

export { overlayBody };
async function mountViewer(el, base) {
  const kind = el.dataset.viewer === 'comics' ? 'comics' : 'pics';
  const pool = kind === 'comics' ? COMICS.map(comicItem) : await loadPool();
  const next = deck(pool.length);
  const every = Number(el.dataset.rotate) || 10000;
  el.classList.add('sx-viewer', `sx-viewer-${kind}`);
  el.innerHTML = `<button type="button" class="sx-vtile" aria-label="enlarge"></button>
    <button type="button" class="sx-vb sx-vq" aria-label="about this picture" title="about this">?</button>
    <button type="button" class="sx-vb sx-vn" aria-label="another" title="another">↻</button>
    ${el.dataset.gallery ? `<a class="sx-vb sx-vg" href="${el.dataset.gallery}" aria-label="all pictures and comics" title="gallery">▦</a>` : ''}`;
  const tile = el.querySelector('.sx-vtile');
  const ov = document.createElement('div');
  ov.className = 'sx-ov'; ov.hidden = true; ov.setAttribute('role', 'dialog');
  document.body.appendChild(ov);
  let cur = null, pinned = false, hovering = false, hideTimer = null;
  const show = (item) => { cur = item; tile.innerHTML = mediaHTML(item, base); tile.setAttribute('aria-label', `enlarge: ${item.title}`); };
  const place = () => {
    const r = el.getBoundingClientRect();
    const w = Math.min(560, window.innerWidth - 24);
    ov.style.width = `${w}px`;
    ov.style.left = `${Math.max(12, Math.min(r.left, window.innerWidth - w - 12)) + window.scrollX}px`;
    ov.style.top = `${r.bottom + window.scrollY + 8}px`;
  };
  const all = kind === 'comics' ? pool : pool;
  const byId = Object.fromEntries(all.map((x) => [x.id, x]));
  const fillOv = (item) => {
    ov.innerHTML = overlayBody(item, base, byId);
    ov.querySelector('.sx-x').onclick = () => close();
    ov.querySelector('.sx-ov-another').onclick = () => fillOv(pool[Math.floor(Math.random() * pool.length)]);
    ov.querySelectorAll('[data-goto]').forEach((b) => b.onclick = () => { pinned = true; fillOv(byId[b.dataset.goto]); });
  };
  const open = (pin) => { clearTimeout(hideTimer); pinned = pinned || pin; fillOv(cur); ov.hidden = false; place(); };
  const close = () => { pinned = false; ov.hidden = true; ov.querySelector('video')?.pause(); };
  const hideSoon = () => { clearTimeout(hideTimer); if (!pinned) hideTimer = setTimeout(close, 200); };
  tile.addEventListener('mouseenter', () => { hovering = true; open(false); });
  tile.addEventListener('mouseleave', () => { hovering = false; hideSoon(); });
  tile.addEventListener('click', (e) => { e.stopPropagation(); if (!ov.hidden && pinned) close(); else open(true); });
  ov.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  ov.addEventListener('mouseleave', hideSoon);
  ov.addEventListener('click', (e) => e.stopPropagation());
  el.querySelector('.sx-vq').onclick = (e) => { e.stopPropagation(); if (!ov.hidden) close(); else open(true); };
  el.querySelector('.sx-vn').onclick = (e) => { e.stopPropagation(); show(pool[next()]); if (!ov.hidden) fillOv(cur); };
  document.addEventListener('click', () => { if (!ov.hidden) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', () => { if (!ov.hidden) place(); });
  show(pool[next()]);
  setInterval(() => { if (!hovering && ov.hidden && !document.hidden) show(pool[next()]); }, every);
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
  document.querySelectorAll('[data-viewer]').forEach((el) => mountViewer(el, base));
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
/* the single-item viewer */
.sx-viewer{position:relative;flex:0 0 auto}
.sx-vtile{display:block;padding:0;border:1px solid #e9def8;border-radius:14px;background:#fff;overflow:hidden;cursor:zoom-in;width:100%;height:100%}
.sx-vtile img,.sx-vtile video{width:100%;height:100%;object-fit:cover;display:block;pointer-events:none}
.sx-viewer-comics .sx-vtile img{object-fit:contain;background:#fff}
.sx-vtile:hover,.sx-vtile:focus-visible{border-color:#7a58d6;outline:none}
.sx-vb{position:absolute;width:22px;height:22px;border-radius:50%;border:1px solid #e3d6f5;background:#fffffff0;color:#7a58d6;font-size:12px;font-weight:800;line-height:20px;text-align:center;padding:0;cursor:pointer;text-decoration:none;box-shadow:0 1px 3px #7a58d622}
.sx-vb:hover{background:#7a58d6;color:#fff}
.sx-vq{top:5px;right:5px} .sx-vn{bottom:5px;left:5px} .sx-vg{bottom:5px;right:5px}
.sx-rel,.sx-learn{margin-top:8px;font-size:12.5px;line-height:1.7}
.sx-rel-name{font-weight:700;color:#3a2f55;margin-right:2px}
.sx-goto{border:1px solid #e3d6f5;background:#fbf8ff;border-radius:999px;padding:0 9px;margin:0 2px;font-size:12px;color:#7a58d6;cursor:pointer}
.sx-goto:hover{background:#7a58d6;color:#fff}
.sx-learn a{color:#1c8766}
`;
const st = document.createElement('style');
st.textContent = EXTRAS_CSS;
document.head.appendChild(st);
