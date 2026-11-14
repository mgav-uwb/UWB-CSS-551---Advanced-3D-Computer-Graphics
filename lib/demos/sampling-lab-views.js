// sampling-lab-views: the catalog behind the sampling-lab demo (runtime: lib/core/lab.js). Five topics, eleven views, each one
// relationship in sampling and antialiasing. The views are in sampling-lab-signal.js (the sine and its alias, the two-tone signal
// reconstructed, the zone plate), sampling-lab-filters.js (the five reconstruction filters as curves and on a picture),
// sampling-lab-samples.js (edge coverage, random against stratified, SSAA against MSAA, blend space) and sampling-lab-time.js (the
// wheel, the history a temporal filter keeps).
import { signalViews } from './sampling-lab-signal.js';
import { filterViews } from './sampling-lab-filters.js';
import { sampleViews } from './sampling-lab-samples.js';
import { timeViews } from './sampling-lab-time.js';

export const TOPICS = [
  { id: 'signal', label: 'Signal' }, { id: 'zone', label: 'Zone plate' }, { id: 'filter', label: 'Filters' }, { id: 'samples', label: 'Samples' }, { id: 'time', label: 'Time' },
];

export const KEYS = {};

export function makeViews() {
  return [...signalViews(), ...filterViews(), ...sampleViews(), ...timeViews()];
}
