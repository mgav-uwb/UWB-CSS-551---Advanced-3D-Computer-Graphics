// CSS 551 · HW3 · Affine transformations and scene graphs. YOUR FILE: fill in every TODO
// and submit this one file. Run: homework/run.html?hw=hw03 from a local server.
//
// Matrices are COLUMN-MAJOR 16-arrays (entry (row r, column c) at index c * 4 + r).
// Allowed: matMul and applyMat4 from xform.js (products), component access, Math.
// Off limits: makeTRS, axisAngleMatrix and invertTRS from xform.js; THREE.Matrix4.invert,
// makeTranslation / makeRotationY / makeRotationZ / makeScale / compose, Object3D parenting.
import { matMul, applyMat4 } from '../core/xform.js';

const IDENTITY = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** T(t) for t = [x, y, z]. */
export function translation(t) {
  // TODO
  return IDENTITY();
}

/** R_y(deg): rotation about +y by deg degrees (right-handed). */
export function rotationY(deg) {
  // TODO
  return IDENTITY();
}

/** R_z(deg): rotation about +z by deg degrees (right-handed). */
export function rotationZ(deg) {
  // TODO
  return IDENTITY();
}

/** S(s) for s = [sx, sy, sz]. */
export function scaling(s) {
  // TODO
  return IDENTITY();
}

/** The pivot sandwich: rotate by deg about +y, around the point p instead of the origin. */
export function pivotRotateY(p, deg) {
  // TODO: T(p) · R_y · T(-p)
  return IDENTITY();
}

/**
 * The inverse of a RIGID matrix [R | t] (rotation plus translation, no scale):
 * [R^T | -R^T t]. No general 4x4 inverse.
 */
export function rigidInverse(M) {
  // TODO
  return IDENTITY();
}

/**
 * The robot arm's LOCAL matrices, the same chain as the scene-graph demo:
 *   L_base = T(0, 0.2, 0) · R_y(baseRy)
 *   L_arm  = T(0, 0.2, 0) · T(0, armT, 0) · R_z(armBend) · T(0, 0.7, 0)
 *   L_hand = T(0, 0.7, 0) · R_y(handRy)
 * pose = { baseRy, armBend, handRy, armT }. Returns { base, arm, hand }.
 */
export function localMatrices(pose) {
  // TODO
  return { base: IDENTITY(), arm: IDENTITY(), hand: IDENTITY() };
}

/** World matrices by W_child = W_parent · L_child, the base being the root. { base, arm, hand }. */
export function worldMatrices(pose) {
  // TODO
  return { base: IDENTITY(), arm: IDENTITY(), hand: IDENTITY() };
}

/** A world-space point p expressed in the frame whose world matrix is the rigid W. */
export function worldToLocal(W, p) {
  // TODO
  return [p[0], p[1], p[2]];
}
