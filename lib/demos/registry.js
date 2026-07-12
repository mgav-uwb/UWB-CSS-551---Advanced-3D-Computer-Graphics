// Demo registry: the single map every consumer (lib/demo.html sandbox,
// lib/deck.js embed binding, the course hub) looks a slug up in.
// Each entry is { title, make(container, opts) } — see the demo modules for
// the make() contract (opts.stage: 'full' | 'embed', opts.controls: string[]).
import { make as makeMvcTransform } from './mvc-transform.js';
import { make as makeViewMatrix } from './view-matrix.js';
import { make as makeDotCross } from './dot-cross.js';
import { make as makeAxisAngle } from './axis-angle.js';
import { make as makeTrsOrder } from './trs-order.js';

export const DEMOS = {
  'mvc-transform': {
    title: 'MVC: One Model, Two Views (Transform)',
    make: makeMvcTransform,
  },
  'view-matrix': {
    title: 'The View Matrix: Hand-Built, Glass Cockpit',
    make: makeViewMatrix,
  },
  'dot-cross': {
    title: 'Dot & Cross Products: Angle and Projection',
    make: makeDotCross,
  },
  'axis-angle': {
    title: 'Axis-Angle Rotation: Rodrigues + Quaternion',
    make: makeAxisAngle,
  },
  'trs-order': {
    title: 'Matrix Composition: Order Matters (T·R vs R·T)',
    make: makeTrsOrder,
  },
};

// Shared param-resolution idiom: both demos pick their "embed stage" slider
// ids from opts.controls, but an author can typo a control id in a slide's
// data-controls="..." attribute. Filter unknown ids against PARAMS here (one
// place) so every demo warns + drops instead of building a broken/"undefined"
// slider from a missing PARAMS[id] entry.
export function resolveControlIds(params, ids, demoLabel = 'demo') {
  const known = [];
  for (const id of ids) {
    if (Object.prototype.hasOwnProperty.call(params, id)) {
      known.push(id);
    } else {
      console.warn(`${demoLabel}: unknown control id "${id}" — skipping (no such param)`);
    }
  }
  return known;
}
