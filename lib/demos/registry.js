// Demo registry: the single map every consumer (lib/demo.html sandbox,
// lib/deck.js embed binding, the course hub) looks a slug up in.
// Each entry is { title, make(container, opts) } — see the demo modules for
// the make() contract (opts.stage: 'full' | 'embed', opts.controls: string[]).
import { make as makeRaster } from './raster.js';
import { make as makeMeshView } from './mesh-view.js';
import { make as makeOurScene } from './our-scene.js';
import { make as makeLod } from './lod.js';
import { make as makeMvcTransform } from './mvc-transform.js';
import { make as makeViewMatrix } from './view-matrix.js';
import { make as makeDotCross } from './dot-cross.js';
import { make as makeAxisAngle } from './axis-angle.js';
import { make as makeTrsOrder } from './trs-order.js';
import { make as makeSceneGraph } from './scene-graph.js';
import { make as makeProjection } from './projection.js';
import { make as makeMeshGrid } from './mesh-grid.js';
import { make as makeUvPlacement } from './uv-placement.js';
import { make as makeIllumination } from './illumination.js';
import { make as makeBrdfLobe } from './brdf-lobe.js';
import { make as makeBumpMap } from './bump-map.js';
import { make as makeGsplat } from './gsplat.js';
import { make as makeKeyframe } from './keyframe.js';
import { make as makeSimplifyCompare } from './simplify-compare.js';

export const DEMOS = {
  'raster': {
    title: 'Rasterization: One Triangle Becomes Pixels',
    make: makeRaster,
  },
  'mesh-view': {
    title: 'Meshes: Real Models, Wireframe to Solid',
    make: makeMeshView,
  },
  'our-scene': {
    title: 'Our Scene: A Cornell Box, Five Ways',
    make: makeOurScene,
  },
  'lod': {
    title: 'Level of Detail: One Mesh at Five Resolutions',
    make: makeLod,
  },
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
  'scene-graph': {
    title: 'Scene Graphs: A Hand-Built Base-Arm-Hand Chain',
    make: makeSceneGraph,
  },
  'projection': {
    title: 'Perspective Projection: A Camera Frustum, Third-Person',
    make: makeProjection,
  },
  'mesh-grid': {
    title: 'Mesh Grids: Hand-Built Vertices, Indices, and Normals',
    make: makeMeshGrid,
  },
  'uv-placement': {
    title: 'UV Placement: A Hand-Built Texture Matrix',
    make: makeUvPlacement,
  },
  'illumination': {
    title: 'Illumination: Phong Lighting, Live N·L / R·V at a Marked Point',
    make: makeIllumination,
  },
  'brdf-lobe': {
    title: 'BRDF Lobes: Phong vs GGX-Flavored Reflectance Shape',
    make: makeBrdfLobe,
  },
  'bump-map': {
    title: 'Bump Mapping: Lighting Lies About Geometry',
    make: makeBumpMap,
  },
  'gsplat': {
    title: '3D Gaussian Splatting: A Real Scene, Live in the Browser',
    make: makeGsplat,
  },
  'keyframe': {
    title: 'Keyframe Animation: In-Betweening, Linear vs Smooth',
    make: makeKeyframe,
  },
  'simplify-compare': {
    title: 'Mesh Simplification: QEM vs Progressive Meshes vs Gavriliu 2001',
    make: makeSimplifyCompare,
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
