// vector-basics-code: the code card's text. Takes a section of a program file and returns the HTML the card shows: the
// section's last function without its signature and return line, since the rail is narrow, and each declared variable's
// current value beside its line. Imported on first use by vector-basics.js (see the note there).
import { regions, regionNote, highlight } from '../core/code-window.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const dedent = (lines, n) => lines.map((l) => l.slice(Math.min(n, l.length - l.trimStart().length)));

/** one program section as { name, note, helpers, sig, body } for the code card: the last function's body without its
 *  signature and return line, since the rail is narrow; the "</>" window shows it whole */
export function parseSection(text, name, track) {
  const region = regions(text).find((r) => r.name === name);
  if (!region) return null;
  const note = regionNote(text, region.from, 'js');
  const all = text.split('\n').slice(note.text ? note.last + 1 : region.from + 1, region.to);
  const indent = Math.min(...all.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length));
  const lines = dedent(all, indent);
  const isSig = track === 'webgl' ? (l) => /^(export )?function \w+\(/.test(l) : (l) => /^(public )?static .*\(.*\)\s*$/.test(l);
  let at = -1;
  lines.forEach((l, i) => { if (isSig(l)) at = i; });
  if (at < 0) return { name, note: note.text, helpers: lines, sig: '', body: [] };
  const m = lines[at].match(/(\w+)\(([^()]*)\)\s*\{?\s*$/);
  const first = track === 'webgl' ? at + 1 : at + 2;
  let last = lines.length - 1;
  while (last > first && lines[last].trim() !== '}') last--;
  let body = lines.slice(first, last);
  if (/^\s*return\b/.test(body[body.length - 1] ?? '')) body = body.slice(0, -1);
  return {
    name, note: note.text, helpers: lines.slice(0, at),
    sig: m ? `${m[1]}(${m[2]})` : '', body: dedent(body, track === 'webgl' ? 2 : 4),
  };
}

export function valueText(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? String(Number(v.toFixed(3))) : String(v);
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return `"${v}"`;
  if (v && typeof v.x === 'number') {
    const t = (x) => (Number.isFinite(x) ? String(Number(x.toFixed(2))) : String(x));
    return `(${t(v.x)}, ${t(v.y)}, ${t(v.z)})`;
  }
  return '';
}

const DECL = {
  webgl: /^\s*const (\w+) =/,
  unity: /^\s*(?:float|int|bool|string|Vector3|Matrix4x4|var) (\w+) =/,
};
const LITERAL = /^[^=]*=\s*(-?[\d.]+f?|"[^"]*"|'[^']*'|Vector3\.zero|new Vector3\(\)|false|true);\s*$/;

/** the HTML of one section's listing, with each declared variable's current value beside its line */
export function sectionHtml(sec, track, result) {
  const lang = track === 'webgl' ? 'js' : 'cs';
  const shown = new Set();
  const lineHtml = (line, annotate, allBody) => {
    const dm = annotate ? line.match(DECL[track]) : null;
    let key = null;
    let val = '';
    if (dm && dm[1] in result && !LITERAL.test(line)) {
      const name = dm[1];
      const reassigned = allBody.some((l) => l !== line && new RegExp(`(^|[\\s(])${name} (=|\\+=) `).test(l) && !DECL[track].test(l));
      if (!reassigned) {
        key = name;
        val = valueText(result[name]);
        shown.add(name);
      }
    }
    return `<div class="vb-cl"${key ? ` data-k="${esc(key)}"` : ''}>${highlight(line, lang) || ' '}${val ? `<span class="vb-cv">${esc(val)}</span>` : ''}</div>`;
  };
  let html = '';
  for (const l of sec.helpers) html += lineHtml(l, false, []);
  if (sec.helpers.length) html += '<div class="vb-cl"> </div>';
  if (sec.sig) html += `<div class="vb-cl vb-sig">${esc(sec.sig)}</div>`;
  for (const l of sec.body) html += lineHtml(l, true, sec.body);
  // what the listing computed but did not print on a line of its own: kinds, clamped parameters, composed results
  const rest = Object.keys(result).filter((k) => !shown.has(k) && sec.resultKeys?.includes(k));
  if (rest.length) {
    html += `<div class="vb-cl vb-res">→ ${rest.map((k) => `${esc(k)} = ${esc(valueText(result[k]))}`).join(',  ')}</div>`;
  }
  return html;
}

/** the names a section's function returns, read from its return line */
export function returnKeys(text, name) {
  const region = regions(text).find((r) => r.name === name);
  if (!region) return [];
  const lines = text.split('\n').slice(region.from, region.to);
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/return\s*(?:new\s+\w+\s*)?[({]\s*(.*?)\s*[)}]\s*;/);
    // { d, sa: plane.sa } in JavaScript; (d, plane.sa) or new R { d = d, sa = plane.sa } in C#
    if (m) return m[1].split(',').map((part) => part.split(/[:=]/)[0].trim().split('.').pop());
  }
  return [];
}
