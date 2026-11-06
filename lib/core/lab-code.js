// lab-code: the code card's text (lib/core/lab.js). Takes a section of a program file and returns the HTML the card shows: the
// section's last function without its signature and return line, since the rail is narrow, and each declared variable's
// current value beside its line.
import { regions, regionNote, highlight } from './code-window.js';

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
  // the section's main function is its last public one; anything else in the section, before or after it, is a helper
  const isMain = track === 'webgl' ? (l) => /^export function \w+\(/.test(l) : (l) => /^public static .*\(.*\)\s*$/.test(l);
  const isAny = track === 'webgl' ? (l) => /^(export )?function \w+\(/.test(l) : (l) => /^(public )?static .*\(.*\)\s*$/.test(l);
  let at = -1;
  lines.forEach((l, i) => { if (isMain(l)) at = i; });
  if (at < 0) lines.forEach((l, i) => { if (isAny(l)) at = i; });
  if (at < 0) return { name, note: note.text, helpers: lines, sig: '', body: [] };
  const m = lines[at].match(/(\w+)\(([^()]*)\)\s*\{?\s*$/);
  // the body runs to the brace that closes the one the function opens
  const open = track === 'webgl' ? at : at + 1;
  let depth = 0, close = lines.length - 1;
  for (let i = open; i < lines.length; i++) {
    depth += (lines[i].match(/\{/g) ?? []).length - (lines[i].match(/\}/g) ?? []).length;
    if (depth === 0) { close = i; break; }
  }
  let body = lines.slice(open + 1, close);
  if (/^\s*return\b/.test(body[body.length - 1] ?? '')) body = body.slice(0, -1);
  const trim = (list) => {
    const out = list.slice();
    while (out.length && !out[0].trim()) out.shift();
    while (out.length && !out[out.length - 1].trim()) out.pop();
    return out;
  };
  const before = trim(lines.slice(0, at)), after = trim(lines.slice(close + 1));
  return {
    name, note: note.text, helpers: before.length && after.length ? [...before, '', ...after] : [...before, ...after],
    sig: m ? `${m[1]}(${m[2]})` : '', body: dedent(body, track === 'webgl' ? 2 : 4),
  };
}

export function valueText(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? String(Number(v.toFixed(3))) : String(v);
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return `"${v}"`;
  if (Array.isArray(v)) {
    const t3 = (x) => (Number.isFinite(x) ? String(Number(x.toFixed(2))) : String(x));
    if (v.length === 3 && v.every((x) => typeof x === 'number')) return `(${v.map(t3).join(', ')})`;
    if (v.length > 0 && v.length <= 6 && v.every((x) => typeof x === 'number')) return `[${v.map(t3).join(', ')}]`;
    return `[${v.length} items]`;
  }
  if (v && typeof v.x === 'number') {
    const t = (x) => (Number.isFinite(x) ? String(Number(x.toFixed(2))) : String(x));
    return `(${t(v.x)}, ${t(v.y)}, ${t(v.z)})`;
  }
  return '';
}

const DECL = {
  webgl: /^\s*const (\w+) =/,
  unity: /^\s*(?:float|int|bool|string|Vector3|Vector2|Matrix4x4|var)(?:\[\])* (\w+) =/,
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
    return `<div class="lab-cl"${key ? ` data-k="${esc(key)}"` : ''}>${highlight(line, lang) || ' '}${val ? `<span class="lab-cv">${esc(val)}</span>` : ''}</div>`;
  };
  let html = '';
  for (const l of sec.helpers) html += lineHtml(l, true, sec.helpers);
  if (sec.helpers.length) html += '<div class="lab-cl"> </div>';
  if (sec.sig) html += `<div class="lab-cl lab-sig">${esc(sec.sig)}</div>`;
  for (const l of sec.body) html += lineHtml(l, true, sec.body);
  // what the listing computed but did not print on a line of its own: kinds, clamped parameters, composed results
  const rest = Object.keys(result).filter((k) => !shown.has(k) && sec.resultKeys?.includes(k));
  if (rest.length) {
    html += `<div class="lab-cl lab-res">→ ${rest.map((k) => `${esc(k)} = ${esc(valueText(result[k]))}`).join(',  ')}</div>`;
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
