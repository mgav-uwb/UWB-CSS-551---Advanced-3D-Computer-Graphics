// Demo registry: the single map every consumer (lib/demo.html sandbox,
// lib/deck.js embed binding, the course hub) looks a slug up in.
// Each entry is { title, make(container, opts) } — see the demo modules for
// the make() contract (opts.stage: 'full' | 'embed', opts.controls: string[]).
import { make as makeMvcTransform } from './mvc-transform.js';
import { make as makeViewMatrix } from './view-matrix.js';

export const DEMOS = {
  'mvc-transform': {
    title: 'MVC: One Model, Two Views (Transform)',
    make: makeMvcTransform,
  },
  'view-matrix': {
    title: 'The View Matrix: Hand-Built, Glass Cockpit',
    make: makeViewMatrix,
  },
};
