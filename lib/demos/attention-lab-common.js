// attention-lab-common: what the attention-lab views share: the lecture's matrices, the token colors, the formula-term colors, the
// helpers that read a view's values into the program's arrays, and the plane layout used by the token plots.
import { COL } from '../core/lab-viz.js';

export const I2 = [[1, 0], [0, 1]];
/** the lecture's W_v = [0.5 1; 1 0.5] */
export const WV = [[0.5, 1], [1, 0.5]];
export const SLIDE_TOKENS = [[1, 0], [0, 1], [1, 1]];
export const TOKEN_HEX = [0xff7b72, 0x79c0ff, 0x7ee787, 0xd2a8ff, 0xffa657, 0x56d4dd, 0xff79c6, 0xe3b341];

export const TOPICS = [
  { id: 'query', label: 'One query' }, { id: 'all', label: 'Every token' }, { id: 'cross', label: 'Cross' }, { id: 'cost', label: 'The cost' },
];

export const KEYS = {
  q: COL.gold, k: COL.b, s: COL.amber, a: COL.c, v: COL.purple, y: COL.gold, tau: COL.cyan, sqrtd: COL.pink,
  wk: COL.b, pos: COL.pink, order: COL.amber, change: COL.a, word: COL.cyan, patch: COL.c,
  n: COL.a, n2: COL.amber, mem: COL.pink, grid: COL.b, x1: TOKEN_HEX[0], x2: TOKEN_HEX[1], x3: TOKEN_HEX[2],
};

/** the tokens a view holds (Vector3s named prefix + first, prefix + (first + 1), ...) as the program's arrays of d = 2 numbers */
export function tokenArrays(m, count, prefix = 't', first = 0) {
  const X = [];
  for (let i = 0; i < count; i++) X.push([m[`${prefix}${first + i}`].x, m[`${prefix}${first + i}`].y]);
  return X;
}

/** a plane range that holds every coordinate, in steps of 0.5, at least min */
export function rangeFor(arrays, min = 2) {
  let big = 0;
  for (const a of arrays) for (const v of a) big = Math.max(big, Math.abs(v[0]), Math.abs(v[1]));
  return Math.max(min, Math.ceil(big * 1.2 * 2) / 2);
}

export const snap01 = (x) => Number((Math.round(x / 0.1) * 0.1).toFixed(6));
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
