// site-extras.js: the course site's quotes and "did you know" facts, shown on the hub, the schedule,
// the syllabus and the homework index. Every quote carries its source; every fact is either computed
// here or taken from the course's own credits files (media/icons/CREDITS.md,
// lib/assets/models/CREDITS.md). Usage: <div data-quote></div> <div data-fact></div>, then
//   <script type="module">import { mountExtras } from '../lib/site-extras.js'; mountExtras();</script>

export const QUOTES = [
  { q: 'The ultimate display would, of course, be a room within which the computer can control the existence of matter.',
    who: 'Ivan Sutherland', src: '“The Ultimate Display,” IFIP Congress, 1965' },
  { q: 'What I cannot create, I do not understand.',
    who: 'Richard Feynman', src: 'written on his blackboard, 1988' },
  { q: 'The purpose of computing is insight, not numbers.',
    who: 'Richard Hamming', src: 'Numerical Methods for Scientists and Engineers, 1962' },
  { q: 'All models are wrong, but some are useful.',
    who: 'George Box', src: '“Robustness in the Strategy of Scientific Model Building,” 1979' },
  { q: 'A pixel is not a little square.',
    who: 'Alvy Ray Smith', src: 'Microsoft Technical Memo 6, 1995' },
  { q: 'Premature optimization is the root of all evil.',
    who: 'Donald Knuth', src: '“Structured Programming with go to Statements,” 1974' },
  { q: 'The best way to predict the future is to invent it.',
    who: 'Alan Kay', src: 'Xerox PARC, 1971' },
  { q: 'The art challenges the technology, and the technology inspires the art.',
    who: 'John Lasseter', src: 'attributed; quoted by Pixar' },
  { q: 'The biggest lesson that can be read from 70 years of AI research is that general methods that leverage computation are ultimately the most effective, and by a large margin.',
    who: 'Rich Sutton', src: '“The Bitter Lesson,” 2019' },
  { q: 'Any sufficiently advanced technology is indistinguishable from magic.',
    who: 'Arthur C. Clarke', src: 'Profiles of the Future, 1973 edition' },
];

const px = 1920 * 1080 * 60;
export const FACTS = [
  { icon: 'teapot', t: 'The real Utah teapot, now at the Computer History Museum, is about a third taller than the famous computer model: the model was squashed to three quarters of its height early on, and the stories of why still differ.' },
  { icon: 'bunny', t: 'The Stanford bunny was scanned by Greg Turk and Marc Levoy in 1994. The full model this course loads has 35,947 vertices and 69,451 triangles.' },
  { icon: 'cornell', t: 'The Cornell box first appeared in 1984 (Goral, Torrance, Greenberg and Battaile), as a scene simple enough to build for real and photograph next to its rendering.' },
  { icon: 'whitted', t: 'Turner Whitted’s 1980 ray tracing paper put glass and mirror spheres over a checkerboard, and the picture has been redrawn by every ray tracer since.' },
  { icon: 'dragon', t: 'The Stanford dragon, scanned in 1996, is the bunny’s larger sibling in the same repository; this course bakes both into four levels of detail.' },
  { icon: null, t: `A 1080p display at 60 frames per second asks for ${px.toLocaleString('en-US')} pixels every second, about 16.7 milliseconds per frame.` },
  { icon: null, t: 'Sketchpad (1963) drew with a light pen on a vector display: no pixels at all, and the first program with constraints, instances and a zoomable canvas.' },
  { icon: null, t: 'The GeForce 256 (1999) was the first consumer chip to do the vertex transform and lighting in hardware: the matrices of weeks 3 to 5, in silicon.' },
];

const pick = (arr, seed) => arr[((seed % arr.length) + arr.length) % arr.length];

export function mountExtras({ base = '../' } = {}) {
  let qi = Math.floor(Math.random() * QUOTES.length);
  let fi = Math.floor(Math.random() * FACTS.length);
  const drawQuote = (el) => {
    const q = pick(QUOTES, qi);
    el.innerHTML = `<blockquote class="sx-quote"><p>“${q.q}”</p><div class="sx-by">${q.who} <span>· ${q.src}</span></div>
      <button type="button" class="sx-next" aria-label="another quote">another ↻</button></blockquote>`;
    el.querySelector('.sx-next').onclick = () => { qi++; drawQuote(el); };
  };
  const drawFact = (el) => {
    const f = pick(FACTS, fi);
    el.innerHTML = `<div class="sx-fact">${f.icon ? `<img src="${base}media/icons/${f.icon}.png" alt="">` : '<span class="sx-dot">✦</span>'}
      <div><b>Did you know?</b> ${f.t} <button type="button" class="sx-next" aria-label="another fact">another ↻</button></div></div>`;
    el.querySelector('.sx-next').onclick = () => { fi++; drawFact(el); };
  };
  document.querySelectorAll('[data-quote]').forEach(drawQuote);
  document.querySelectorAll('[data-fact]').forEach(drawFact);
}

export const EXTRAS_CSS = `
.sx-quote{margin:0;background:linear-gradient(135deg,#fff0f6,#f1ecff);border:1px solid #efdcf2;border-radius:16px;padding:16px 20px;position:relative}
.sx-quote p{margin:0 0 8px;font-size:17px;line-height:1.45;color:#3a2f55;font-style:italic}
.sx-quote .sx-by{font-size:13px;color:#8a4f7a;font-weight:600}
.sx-quote .sx-by span{color:#8d86a3;font-weight:400}
.sx-fact{display:flex;gap:14px;align-items:center;background:linear-gradient(135deg,#eafaf2,#e6f4ff);border:1px solid #d6eee5;border-radius:16px;padding:12px 16px;font-size:14px;color:#2f3d45;line-height:1.45}
.sx-fact img{width:64px;height:64px;object-fit:contain;flex:0 0 auto}
.sx-fact b{color:#1c8766}
.sx-dot{font-size:26px;color:#7a58d6;flex:0 0 auto;width:40px;text-align:center}
.sx-next{margin-left:8px;border:1px solid #e3d6f5;background:#fff;border-radius:999px;padding:1px 10px;font-size:12px;color:#7a58d6;cursor:pointer}
.sx-next:hover{background:#f4edff}
`;
const st = document.createElement('style');
st.textContent = EXTRAS_CSS;
document.head.appendChild(st);
