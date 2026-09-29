// CSS 551 · HW1 · The loop, MVC, and orientation. YOUR FILE: fill in every TODO and submit
// this one file. Run it by serving the course site from its root (python3 -m http.server)
// and opening homework/run.html?hw=hw01; the Checks card compares your numbers with the
// ones on the homework page.
//
// Allowed: the primitives imported below, component access, + - * /, Math.sin/cos/sqrt.
// Off limits (implement and replace): makeTRS from xform.js, THREE.Matrix4.compose /
// makeRotationY / lookAt, THREE.Object3D.lookAt, Quaternion anything.
import { dot, cross, normalize, sub } from '../core/xform.js';

/**
 * advance(p, velocity, dt) -> the position one frame later.
 * p and velocity are [x, y, z]; velocity is in units per SECOND and dt is the frame's
 * length in seconds, so the result must not depend on the frame rate.
 */
export function advance(p, velocity, dt) {
  // TODO: step p along velocity by this frame's share of one second.
  return [p[0], p[1], p[2]];
}

/**
 * trsMatrix(t, ryDeg, s) -> the 4x4 matrix T(t) · R_y(ryDeg) · S(s, s, s) as a
 * COLUMN-MAJOR 16-array (entry (row r, column c) lives at index c * 4 + r).
 * t is [x, y, z]; ryDeg is a rotation about +y in degrees; s is a uniform scale.
 */
export function trsMatrix(t, ryDeg, s) {
  // TODO: build it entry by entry. Column 0 is where the x axis lands, column 3 is t.
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

/**
 * orientBasis(pos, target, up) -> { x, y, z }, the three unit axes of an object at pos
 * whose +z axis points at target (three.js and Unity both aim an object's +z this way).
 * x is perpendicular to up and z; y completes the frame. Each axis is [x, y, z].
 */
export function orientBasis(pos, target, up) {
  // TODO: z from a subtraction and a normalize; x from a cross product; y from another.
  return { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] };
}
