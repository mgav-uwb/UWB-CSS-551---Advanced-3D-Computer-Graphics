// aircraft.js: the course's three aircraft (lib/assets/models/aircraft/), for any demo that turns an airplane.
// Each model is fetched once per page and copied per use; copies share geometry, materials and textures, so
// a demo must not dispose them.
//
// Frame, the same as the block planes of rot-compose and euler-gimbal: nose +z, top +y, wings along x,
// meters, the origin at the center of the bounding box.
//
//   const plane = await makeAircraft('cessna', { size: 1.5 });   // a group; its longest side is 1.5
//   parent.add(plane);
//
// The Cessna's propeller, ailerons, flaps, elevator and rudder are nodes of their own (getObjectByName:
// propeller, aileron_left, aileron_right, flap_left, flap_right, elevator, rudder), each with its origin on
// its hinge line and its turning axis in userData.hinge_axis.
import * as THREE from '../vendor/three.module.js';

const BASE = new URL('../assets/models/aircraft/', import.meta.url);

export const AIRCRAFT = {
  cessna: {
    label: 'Cessna 208',
    file: 'cessna/cessna.glb',
    credit: '"Cessna 208 Caravan (Wheels version)" by Helijah (Emmanuel Baranger), BlendSwap, CC0',
  },
  harrier: {
    label: 'Harrier II',
    file: 'harrier/harrier.glb',
    credit: '"Harrier II" by panko10, BlendSwap, CC BY 3.0',
  },
  a380: {
    label: 'A380',
    file: 'A380/a380.glb',
    credit: '"Airbus-A380" by theMaker, BlendSwap, CC BY-SA 3.0 (fan art, non-commercial)',
  },
};
export const AIRCRAFT_NAMES = Object.keys(AIRCRAFT);
export const AIRCRAFT_CREDITS = AIRCRAFT_NAMES.map((name) => AIRCRAFT[name].credit);

const loads = new Map();   // name -> Promise<{ scene, longest }>
let loader = null;

async function fetchModel(name) {
  if (!loader) {
    const { GLTFLoader } = await import('../vendor/GLTFLoader.js');
    const { MeshoptDecoder } = await import('../vendor/meshopt_decoder.module.js');
    loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);   // the models are meshopt-compressed
  }
  const gltf = await loader.loadAsync(new URL(AIRCRAFT[name].file, BASE).href);
  const size = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
  return { scene: gltf.scene, longest: Math.max(size.x, size.y, size.z) };
}

/** the model as loaded, shared by every copy: { scene, longest } (meters). */
export function loadAircraft(name) {
  if (!AIRCRAFT[name]) return Promise.reject(new Error(`loadAircraft: unknown aircraft "${name}"`));
  if (!loads.has(name)) loads.set(name, fetchModel(name));
  return loads.get(name);
}

/** a copy inside a group, scaled so its longest side is `size`. The group's own transform is the caller's.
 *  ghost: a material for every mesh of the copy (a see-through silhouette, say), instead of the model's own. */
export async function makeAircraft(name, { size = 1, ghost = null } = {}) {
  const { scene, longest } = await loadAircraft(name);
  const copy = scene.clone(true);
  copy.scale.setScalar(size / longest);
  if (ghost) {
    copy.traverse((obj) => {
      if (obj.isMesh) obj.material = ghost;
    });
  }
  const group = new THREE.Group();
  group.name = name;
  group.add(copy);
  return group;
}

/** a see-through material for ghost copies. */
export function ghostMaterial(color, opacity = 0.22) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
}

/** a demo's help text with the aircraft credits added (before its closing hint line, if it has one). */
export function withAircraftCredit(html) {
  const credit = `<h4>Aircraft</h4>\n  <p>${AIRCRAFT_CREDITS.join('. ')}. Converted for this course (lib/assets/models/aircraft/).</p>\n  `;
  const hint = '<p class="demo-shell-help-panel-hint">';
  return html.includes(hint) ? html.replace(hint, credit + hint) : html + credit;
}
