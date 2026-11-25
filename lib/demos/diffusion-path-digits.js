// diffusion-path-digits: what the three digit views (coarse, commit, highdim) share: the state a seed and the two controls give, the walk it
// runs (or the wait for the files), and the sentences that depend on the starting noise and the denoiser.
import { alphaBar } from '../core/diffusion.js';
import { STEPS, D, needs, trajectory, measures, digits, startLabel } from './diffusion-path-core.js';
import { f, f2 } from './diffusion-path-draw.js';

export const DIG_INIT = { seed: 1, start: 'shell', den: 'exact', k: 6 };

/** the walk of the view's state, or { loading } while the digits or the network are on their way */
export function runDigits(m, ctx) {
  const what = needs(m.den, () => ctx?.refresh?.());
  if (what) return { loading: what };
  const tr = trajectory(m.seed, m.start, m.den);
  const k = Math.max(0, Math.min(STEPS, Math.round(m.k)));
  const t = tr.ts[k], a = alphaBar(t);
  return { tr, k, t, a, sigma: Math.sqrt(1 - a), mt: measures(tr), exact: tr.den === 'exact', fellBack: m.den === 'net' && tr.den === 'exact', label: digits().y[tr.final] };
}

export const digitName = (i) => `#${i} (a ${digits().y[i]})`;

/** the sentence about the starting noise and the denoiser, which is the point of the "starting noise" control */
export function shellFact(m, r) {
  if (r.fellBack) return 'The trained network could not be loaded here, so the exact denoiser is shown.';
  if (m.start === 'shell') return `Noise has length about √${D} = 20, and the denoiser (the network or the lookup) works on inputs of that length. The ×1 start (on the shell) is the case it was built for.`;
  if (m.den === 'net') {
    return `The network never saw inputs this ${m.start === 'big' ? 'long' : 'short'} in training, so it is off the shell where it learned: ${m.start === 'big' ? 'expect garbage, overlapping strokes' : 'expect faint, thin, washed-out digits'}. A lookup does not care (switch to the exact denoiser).`;
  }
  return 'The exact denoiser is a lookup, so it does not care how long the noise is: its last step returns the nearest training digit, a clean one at every scale. A trained network fails here because it never saw such inputs in training.';
}

/** the stage of the walk in words, from how the guess is spread over the digits */
export function stage(r, m) {
  const { k, tr, mt } = r;
  if (!r.exact && m.start !== 'shell') {
    const side = m.start === 'big' ? 'long' : 'short';
    return { text: `the trained network is off the shell: it never saw inputs this ${side}, so its guesses here cannot be trusted${k === STEPS ? `; the walk ends ${f(tr.finalDist, 1)} from the nearest training digit ${digitName(tr.final)}` : ''}`, tone: 'warn' };
  }
  if (k === STEPS) return { text: `the walk ends: ${r.exact ? `training digit ${digitName(tr.final)}` : `a digit ${f(tr.finalDist, 1)} from the nearest training digit ${digitName(tr.final)}`}`, tone: 'ok' };
  if (r.exact) {
    const w = mt.topW[k];
    if (w < 0.05) return { text: `the guess is a blur: ${f(mt.sharing[k], 0)} digits share the average, the heaviest weighs only ${f(100 * w, 1)} %`, tone: 'info' };
    if (w < 0.9) return { text: `a vague digit: the average is tipping toward a few digits; the heaviest weighs ${f(100 * w, 0)} %`, tone: 'info' };
    return { text: `committed: one training digit carries ${f(100 * w, 1)} % of the average, and the walk will end on it`, tone: 'ok' };
  }
  const s = mt.share[k];
  return { text: s > 0.95 ? `the guess is a blur: ${f(100 * s, 0)} % of its energy is in the coarsest block` : `a digit is forming: ${f(100 * s, 0)} % of the guess's energy is in the coarsest block`, tone: 'info' };
}

export { f2 };
