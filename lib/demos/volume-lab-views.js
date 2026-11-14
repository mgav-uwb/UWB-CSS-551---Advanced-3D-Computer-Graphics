// volume-lab-views: the catalog behind the volume-lab demo (runtime: lib/core/lab.js). Five topics, ten views: one ray through a volume,
// how the samples are chosen, a density that sharpens into a surface, positional encoding, and a small 3D volume rendered one ray per
// pixel. Each view calls the program's own functions (lib/programs/volume-lab/webgl/volumelab.js), so the numbers beside the code are that
// code's output. Random draws use the program's seeded generator, so a view shows the same numbers every time it is opened.
//   makeViews(): the views; no DOM until a panel or the overlay is built, so the node tests run every view.
import { makeRayViews } from './volume-lab-views-ray.js';
import { makeSceneViews } from './volume-lab-views-scene.js';
export { KEYS } from './volume-lab-kit.js';

export const TOPICS = [
  { id: 'ray', label: 'One ray' }, { id: 'samples', label: 'Samples' }, { id: 'surface', label: 'Surface' }, { id: 'encode', label: 'Encoding' }, { id: 'volume', label: 'Volume' },
];

export function makeViews() {
  return [...makeRayViews(), ...makeSceneViews()];
}
