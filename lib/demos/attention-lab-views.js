// attention-lab-views: the catalog behind the attention-lab demo (runtime: lib/core/lab.js), assembled from its topics: one query
// (and why the scores are divided by sqrt(d)), every token (the n x n weights, and order), cross-attention, and the cost.
import { oneQueryView, scaleView } from './attention-lab-query.js';
import { gridView, orderView } from './attention-lab-tokens.js';
import { crossView, costView } from './attention-lab-picture.js';

export { TOPICS, KEYS } from './attention-lab-common.js';

export function makeViews() {
  return [oneQueryView(), scaleView(), gridView(), orderView(), crossView(), costView()];
}
