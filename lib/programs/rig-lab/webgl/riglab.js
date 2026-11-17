// riglab.js: skeletons and skins: forward kinematics on a chain of bones, inverse kinematics (the two-link law of cosines, cyclic
// coordinate descent, the Jacobian pseudo-inverse), linear blend skinning with its bind pose and inverse bind matrices, the
// candy-wrapper collapse and dual quaternion skinning, blend shapes, blend trees and retargeting. No three.js here: points are
// arrays [x, y, z], matrices are arrays of 16 numbers in column-major order (entry m[4 * column + row], the order three.js and
// WebGL use), quaternions are [x, y, z, w], angles are in degrees. scene.js draws a skinned tube, and the course demo
// (lib/demos/rig-lab.js) runs these same functions, so a value the demo prints beside a line of code is the value that line
// computed. No function changes its arguments.
// The same functions, line for line where the languages allow, are RigLab.cs in ../unity/
// (lib/tests/programs/rig-lab.test.mjs runs both on the same inputs and compares the numbers).

// #region Settings and matrix helpers
// A matrix is 16 numbers, column by column: the translation of a transform sits in m[12], m[13], m[14]. The iterative solvers
// never move the end effector more than MAX_STEP toward the target in one step. Unity's Vector3 has the vector operations built in.
export const EPS = 1e-6;
export const DEG = Math.PI / 180;
export const MAX_STEP = 0.25;

export function add(a, b) { return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]; }
export function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
export function scale(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
export function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
export function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
export function length(a) { return Math.sqrt(dot(a, a)); }

export function identity() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
export function multiply(a, b) {
  const r = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[4 * k + row] * b[4 * col + k];
      r[4 * col + row] = sum;
    }
  }
  return r;
}
export function translation(x, y, z) {
  const m = identity();
  m[12] = x;
  m[13] = y;
  m[14] = z;
  return m;
}
export function rotationZ(degrees) {
  const c = Math.cos(degrees * DEG);
  const s = Math.sin(degrees * DEG);
  return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
export function rotationX(degrees) {
  const c = Math.cos(degrees * DEG);
  const s = Math.sin(degrees * DEG);
  return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1];
}
export function transformPoint(m, p) {
  return [
    m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12],
    m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13],
    m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14],
  ];
}
// The inverse of a rigid transform (a rotation and a translation): transpose the rotation, and turn the translation around.
export function rigidInverse(m) {
  const r = identity();
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) r[4 * col + row] = m[4 * row + col];
  }
  for (let row = 0; row < 3; row++) {
    r[12 + row] = -(r[row] * m[12] + r[4 + row] * m[13] + r[8 + row] * m[14]);
  }
  return r;
}
// #endregion

// #region Forward kinematics: the chain as a scene graph
// A bone is a node. Its local matrix moves to the end of the parent bone and turns about the joint there, and its world matrix is
// the parent's world matrix times its local one: the composite rule of the scene graph. The end effector is the far end of the last
// bone, (length, 0, 0) in that bone's own frame.
export function forwardKinematics(lengths, angles) {
  const locals = [];
  const worlds = [];
  const joints = [];
  let world = identity();
  for (let i = 0; i < lengths.length; i++) {
    const offset = i === 0 ? 0 : lengths[i - 1];
    const local = multiply(translation(offset, 0, 0), rotationZ(angles[i]));
    world = multiply(world, local);
    locals.push(local);
    worlds.push(world);
    joints.push([world[12], world[13], world[14]]);
  }
  const last = lengths.length - 1;
  const tip = transformPoint(worlds[last], [lengths[last], 0, 0]);
  return { locals, worlds, joints, tip };
}
// #endregion

// #region Forward kinematics: by hand
// Each bone points along the sum of the joint angles up to it, so the end effector is the sum of the bones, each at its own heading.
// No matrices: it must land on the same point as the product of the matrices.
export function tipByHand(lengths, angles) {
  let x = 0;
  let y = 0;
  let heading = 0;
  for (let i = 0; i < lengths.length; i++) {
    heading += angles[i];
    x += lengths[i] * Math.cos(heading * DEG);
    y += lengths[i] * Math.sin(heading * DEG);
  }
  const tip = [x, y, 0];
  return { heading, tip };
}
// #endregion

// #region Two-link IK: the law of cosines
// Two bones and a target at distance d form a triangle with sides l1, l2 and d. The law of cosines gives the elbow, and the
// shoulder is the target's direction minus the angle the second bone adds. The sign of bend picks the elbow (+1 bends the way
// the lecture's elbow-down solution does, -1 the other way). A target out of reach makes the cosine pass 1 or -1: it is
// clamped, and the arm stretches straight at the target.
export function twoLinkIK(l1, l2, target, bend) {
  const distance = Math.sqrt(target[0] * target[0] + target[1] * target[1]);
  const reachable = distance <= l1 + l2 + EPS && distance >= Math.abs(l1 - l2) - EPS;
  const cos2 = (distance * distance - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  const clamped = Math.min(1, Math.max(-1, cos2));
  const theta2 = (bend * Math.acos(clamped)) / DEG;
  const direction = Math.atan2(target[1], target[0]) / DEG;
  const correction = Math.atan2(l2 * Math.sin(theta2 * DEG), l1 + l2 * Math.cos(theta2 * DEG)) / DEG;
  const theta1 = direction - correction;
  const chain = forwardKinematics([l1, l2], [theta1, theta2]);
  const elbow = chain.joints[1];
  const tip = chain.tip;
  const error = length(sub(tip, [target[0], target[1], 0]));
  return { distance, reachable, cos2, clamped, theta2, direction, correction, theta1, elbow, tip, error };
}
// #endregion

// #region Cyclic coordinate descent: one joint
// Stand at one joint and look at the end effector and at the target. Turning that joint by the signed angle between the two
// directions points the end effector at the target. The end effector's distance from the target can only shrink: it ends as
// far from the joint as before, on the target's side.
export function ccdJoint(lengths, angles, target, joint) {
  const before = forwardKinematics(lengths, angles);
  const pivot = before.joints[joint];
  const toEnd = sub(before.tip, pivot);
  const toTarget = sub(target, pivot);
  const turn = toEnd[0] * toTarget[1] - toEnd[1] * toTarget[0];
  const along = toEnd[0] * toTarget[0] + toEnd[1] * toTarget[1];
  const delta = Math.atan2(turn, along) / DEG;
  const next = angles.slice();
  next[joint] += delta;
  const after = forwardKinematics(lengths, next);
  const tip = after.tip;
  const error = length(sub(tip, target));
  return { pivot, toEnd, toTarget, delta, angles: next, tip, error };
}
// #endregion

// #region Cyclic coordinate descent: a sweep
// One sweep visits every joint once, from the one nearest the end effector back to the base, each time pointing the end
// effector at the target from that joint.
export function ccdSweep(lengths, angles, target) {
  let current = angles.slice();
  const deltas = [];
  const errors = [];
  for (let joint = lengths.length - 1; joint >= 0; joint--) {
    const step = ccdJoint(lengths, current, target, joint);
    current = step.angles;
    deltas.push(step.delta);
    errors.push(step.error);
  }
  return { angles: current, deltas, errors };
}
// #endregion

// #region Jacobian: the columns
// Turning joint j by a small angle moves the end effector along z x (tip - joint), perpendicular to the line from the joint to the
// tip, by that distance per radian. These vectors are the columns of the Jacobian J, which holds the derivative of the end
// effector's position with respect to each joint angle. J J^T is the 2 x 2 matrix [a b; b c], and det is zero when every
// column points the same way, which happens when the chain is straight.
export function jacobian(lengths, angles) {
  const chain = forwardKinematics(lengths, angles);
  const tip = chain.tip;
  const columns = [];
  let a = 0;
  let b = 0;
  let c = 0;
  for (let j = 0; j < lengths.length; j++) {
    const r = sub(tip, chain.joints[j]);
    const column = [-r[1], r[0]];
    columns.push(column);
    a += column[0] * column[0];
    b += column[0] * column[1];
    c += column[1] * column[1];
  }
  const det = a * c - b * b;
  return { columns, tip, a, b, c, det };
}
// #endregion

// #region Jacobian: a pseudo-inverse step
// To move the end effector by e, change the angles by J^T (J J^T)^-1 e: the smallest change in the angles, in the least-squares
// sense, that does it to first order. The move is limited to maxStep so the linear model holds. Near a singular chain J J^T
// has almost no inverse and the angles jump; adding damping^2 to its diagonal (damped least squares, Wampler 1986, Nakamura and
// Hanafusa 1986) keeps the step finite. Exactly singular, the step is zero.
export function pseudoInverseStep(lengths, angles, target, damping, maxStep) {
  const jac = jacobian(lengths, angles);
  const error = [target[0] - jac.tip[0], target[1] - jac.tip[1]];
  const size = Math.sqrt(error[0] * error[0] + error[1] * error[1]);
  const limit = size > maxStep ? maxStep / size : 1;
  const goal = [error[0] * limit, error[1] * limit];
  const dampedA = jac.a + damping * damping;
  const dampedC = jac.c + damping * damping;
  const dampedDet = dampedA * dampedC - jac.b * jac.b;
  const singular = dampedDet < EPS;
  const y = singular ? [0, 0] : [(dampedC * goal[0] - jac.b * goal[1]) / dampedDet, (dampedA * goal[1] - jac.b * goal[0]) / dampedDet];
  const deltas = [];
  const next = angles.slice();
  for (let j = 0; j < lengths.length; j++) {
    const delta = (jac.columns[j][0] * y[0] + jac.columns[j][1] * y[1]) / DEG;
    deltas.push(delta);
    next[j] += delta;
  }
  const after = forwardKinematics(lengths, next);
  const newTip = after.tip;
  const remaining = length(sub(newTip, target));
  return { columns: jac.columns, error, goal, dampedDet, singular, deltas, angles: next, newTip, remaining };
}
// #endregion

// #region Iterating until close
// Repeat one step, a joint rotation for CCD or a pseudo-inverse step for the Jacobian, until the end effector is within tolerance
// of the target or the budget runs out. errors[0] is the error before any step, and errors[k] the error after k steps.
export function solveIterative(method, lengths, angles, target, maxIterations, tolerance, damping) {
  let current = angles.slice();
  const errors = [length(sub(forwardKinematics(lengths, current).tip, target))];
  let iterations = 0;
  let joint = lengths.length - 1;
  while (iterations < maxIterations && errors[errors.length - 1] > tolerance) {
    if (method === 'ccd') {
      const step = ccdJoint(lengths, current, target, joint);
      current = step.angles;
      errors.push(step.error);
      joint = joint === 0 ? lengths.length - 1 : joint - 1;
    } else {
      const step = pseudoInverseStep(lengths, current, target, damping, MAX_STEP);
      if (step.singular) break;
      current = step.angles;
      errors.push(step.remaining);
    }
    iterations += 1;
  }
  const converged = errors[errors.length - 1] <= tolerance;
  return { angles: current, errors, iterations, converged };
}
// #endregion

// #region Skinning: bind pose and inverse bind matrices
// The mesh is modeled in the bind pose, and each bone's world matrix B there is recorded. The inverse bind matrix B^-1 takes a
// point of the bind-pose mesh into the bone's own frame. The skinning matrix W B^-1 takes it from there to where the bone is now
// (world matrix W): one matrix per bone per frame.
export function skinningMatrices(binds, poses) {
  const inverseBinds = [];
  const skins = [];
  for (let i = 0; i < binds.length; i++) {
    inverseBinds.push(rigidInverse(binds[i]));
    skins.push(multiply(poses[i], inverseBinds[i]));
  }
  return { inverseBinds, skins };
}
// #endregion

// #region Skinning: one vertex
// Each bone carries the vertex rigidly to a candidate place: into the bone's frame with B^-1, then out with W. The skin is the
// weighted sum of the candidates, v' = sum of w W B^-1 v, with the weights adding to 1.
export function skinVertex(vertex, weights, inverseBinds, poses) {
  const local = [];
  const candidates = [];
  let blended = [0, 0, 0];
  let weightSum = 0;
  for (let i = 0; i < weights.length; i++) {
    const inBone = transformPoint(inverseBinds[i], vertex);
    const carried = transformPoint(poses[i], inBone);
    local.push(inBone);
    candidates.push(carried);
    blended = add(blended, scale(carried, weights[i]));
    weightSum += weights[i];
  }
  return { local, candidates, blended, weightSum };
}
// #endregion

// #region Skinning: a mesh
// The GPU does the same sum with the skinning matrices K = W B^-1 computed once per bone: each vertex is carried by every bone
// it has weight for, and the results are added with the weights.
export function skinMesh(positions, weights, inverseBinds, poses) {
  const skins = [];
  for (let i = 0; i < poses.length; i++) skins.push(multiply(poses[i], inverseBinds[i]));
  const posed = [];
  for (let v = 0; v < positions.length; v++) {
    let p = [0, 0, 0];
    for (let i = 0; i < skins.length; i++) {
      p = add(p, scale(transformPoint(skins[i], positions[v]), weights[v][i]));
    }
    posed.push(p);
  }
  return { skins, posed };
}
// #endregion

// #region The tube
// A closed tube along the x axis from 0 to span: rings of vertices (ring r at x = span r / (rings - 1), sides vertices
// each), a fan of triangles closing each end, and counter-clockwise triangles seen from outside. Vertex rings * sides is the
// center of the start cap, and the one after it the center of the end cap.
export function makeTube(span, radius, rings, sides) {
  const positions = [];
  for (let r = 0; r < rings; r++) {
    const x = (span * r) / (rings - 1);
    for (let s = 0; s < sides; s++) {
      const phi = (2 * Math.PI * s) / sides;
      positions.push([x, radius * Math.cos(phi), radius * Math.sin(phi)]);
    }
  }
  const startCenter = positions.length;
  positions.push([0, 0, 0]);
  const endCenter = positions.length;
  positions.push([span, 0, 0]);
  const tris = [];
  for (let r = 0; r < rings - 1; r++) {
    for (let s = 0; s < sides; s++) {
      const a = r * sides + s;
      const b = r * sides + ((s + 1) % sides);
      tris.push([a, b, a + sides]);
      tris.push([b, b + sides, a + sides]);
    }
  }
  const last = (rings - 1) * sides;
  for (let s = 0; s < sides; s++) {
    const next = (s + 1) % sides;
    tris.push([startCenter, next, s]);
    tris.push([endCenter, last + s, last + next]);
  }
  return { positions, tris, startCenter, endCenter };
}
// #endregion

// #region Weights painted by falloff
// Bone 0 owns the mesh up to the first joint, and each joint hands the mesh on to the next bone over a ramp of the given width
// centered on it (smoothstep: slope zero at both ends). At every x the weights add to 1: what one ramp takes, the next bone gets.
function smoothstep(t) {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}
export function paintWeights(positions, joints, width) {
  const weights = [];
  for (let v = 0; v < positions.length; v++) {
    const row = [];
    let previous = 1;
    for (let i = 0; i < joints.length; i++) {
      const t = smoothstep((positions[v][0] - (joints[i] - width / 2)) / width);
      row.push(previous - t);
      previous = t;
    }
    row.push(previous);
    weights.push(row);
  }
  return { weights };
}
// #endregion

// #region Candy wrapper: a twisted joint
// Two bones along the x axis, the second starting at x = 1. In the bind pose both sit still. In the pose the second bone turns
// about its own axis, the x axis, by the twist angle: a forearm turning its hand.
export function twistBones(twistDegrees) {
  const binds = [identity(), translation(1, 0, 0)];
  const poses = [identity(), multiply(translation(1, 0, 0), rotationX(twistDegrees))];
  return { binds, poses };
}
// #endregion

// #region Candy wrapper: measuring the collapse
// The volume of a closed triangle mesh is the sum, over its triangles, of the signed volume of the tetrahedron the triangle makes
// with the origin: a . (b x c) / 6. The collapse is the share of the rest volume that is gone.
export function meshVolume(positions, tris) {
  let volume = 0;
  for (let t = 0; t < tris.length; t++) {
    const a = positions[tris[t][0]];
    const b = positions[tris[t][1]];
    const c = positions[tris[t][2]];
    volume += dot(a, cross(b, c)) / 6;
  }
  return volume;
}
export function measureCollapse(restPositions, posedPositions, tris) {
  const restVolume = meshVolume(restPositions, tris);
  const posedVolume = meshVolume(posedPositions, tris);
  const ratio = posedVolume / restVolume;
  const collapse = 1 - ratio;
  return { restVolume, posedVolume, ratio, collapse };
}
// #endregion

// #region Candy wrapper: the closed form
// A vertex at radius r from the axis, with weight w on the twisted bone, goes to (1 - w) v + w R v. Both v and R v have length r,
// and the angle between them is the twist, so the blended length is r times the square root of (1 - w)^2 + w^2 + 2 w (1 - w) cos(twist).
// At w = 1/2 that is r |cos(twist / 2)|: nothing is left at a twist of 180 degrees. The cross-section's area goes as the square.
export function twistRatio(twistDegrees, weight) {
  const w = weight;
  const radius = Math.sqrt((1 - w) * (1 - w) + w * w + 2 * w * (1 - w) * Math.cos(twistDegrees * DEG));
  const area = radius * radius;
  return { radius, area };
}
// #endregion

// #region Quaternions: the helpers
// A quaternion [x, y, z, w] with x, y, z = sin(angle / 2) times the axis and w = cos(angle / 2) is a rotation. Multiplying two
// composes their rotations, and the rotation of a point p is q p q*, with q* the conjugate. quatFromMatrix reads the rotation
// out of the upper 3 x 3 of a rigid matrix.
export function quatFromAxisAngle(axis, degrees) {
  const s = Math.sin((degrees * DEG) / 2);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos((degrees * DEG) / 2)];
}
export function quatMultiply(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}
export function quatConjugate(q) {
  return [-q[0], -q[1], -q[2], q[3]];
}
export function quatRotate(q, p) {
  const r = quatMultiply(quatMultiply(q, [p[0], p[1], p[2], 0]), quatConjugate(q));
  return [r[0], r[1], r[2]];
}
export function quatFromMatrix(m) {
  const trace = m[0] + m[5] + m[10];
  if (trace > 0) {
    const s = 2 * Math.sqrt(trace + 1);
    return [(m[6] - m[9]) / s, (m[8] - m[2]) / s, (m[1] - m[4]) / s, s / 4];
  }
  if (m[0] > m[5] && m[0] > m[10]) {
    const s = 2 * Math.sqrt(1 + m[0] - m[5] - m[10]);
    return [s / 4, (m[4] + m[1]) / s, (m[8] + m[2]) / s, (m[6] - m[9]) / s];
  }
  if (m[5] > m[10]) {
    const s = 2 * Math.sqrt(1 + m[5] - m[0] - m[10]);
    return [(m[4] + m[1]) / s, s / 4, (m[9] + m[6]) / s, (m[8] - m[2]) / s];
  }
  const s = 2 * Math.sqrt(1 + m[10] - m[0] - m[5]);
  return [(m[8] + m[2]) / s, (m[9] + m[6]) / s, s / 4, (m[1] - m[4]) / s];
}
// #endregion

// #region Quaternions: slerp
// Spherical linear interpolation walks the shortest arc between two rotations at constant speed:
// sin((1 - t) omega) / sin(omega) a + sin(t omega) / sin(omega) b, with omega the angle between the quaternions as points on a
// sphere. q and -q are the same rotation, so a negative dot product means one is flipped first.
export function quatSlerp(a, b, t) {
  let cosine = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  let sign = 1;
  if (cosine < 0) {
    sign = -1;
    cosine = -cosine;
  }
  const omega = Math.acos(Math.min(1, cosine));
  let w0 = 1 - t;
  let w1 = t;
  if (omega > 1e-4) {
    w0 = Math.sin((1 - t) * omega) / Math.sin(omega);
    w1 = Math.sin(t * omega) / Math.sin(omega);
  }
  const q = [0, 0, 0, 0];
  for (let k = 0; k < 4; k++) q[k] = w0 * a[k] + sign * w1 * b[k];
  return { q, cosine, omega, w0, w1 };
}
// #endregion

// #region Dual quaternions: from a rigid transform
// A rigid transform (rotation q, translation t) is the pair of quaternions real = q and dual = 1/2 (t, 0) q: eight numbers,
// [real x, y, z, w, dual x, y, z, w]. Unlike a matrix, a blend of these can be normalized back to a rigid transform.
export function dualQuaternion(m) {
  const real = quatFromMatrix(m);
  const half = quatMultiply([m[12] / 2, m[13] / 2, m[14] / 2, 0], real);
  return [real[0], real[1], real[2], real[3], half[0], half[1], half[2], half[3]];
}
// #endregion

// #region Dual quaternions: blend
// Add the weighted dual quaternions (each flipped to the same side as the first, since q and -q are one rotation), then divide by
// the length of the real part and take the part of the dual along the real out, which makes the result a unit dual quaternion:
// the blend of rigid transforms is rigid. This is the dual linear blend of Kavan and others (2007).
export function blendDualQuaternions(dqs, weights) {
  const sum = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < dqs.length; i++) {
    let sign = 1;
    if (dqs[i][0] * dqs[0][0] + dqs[i][1] * dqs[0][1] + dqs[i][2] * dqs[0][2] + dqs[i][3] * dqs[0][3] < 0) sign = -1;
    for (let k = 0; k < 8; k++) sum[k] += sign * weights[i] * dqs[i][k];
  }
  const norm = Math.sqrt(sum[0] * sum[0] + sum[1] * sum[1] + sum[2] * sum[2] + sum[3] * sum[3]);
  const dq = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let k = 0; k < 8; k++) dq[k] = sum[k] / norm;
  const along = dq[0] * dq[4] + dq[1] * dq[5] + dq[2] * dq[6] + dq[3] * dq[7];
  for (let k = 4; k < 8; k++) dq[k] -= along * dq[k - 4];
  return dq;
}
// #endregion

// #region Dual quaternions: skin a vertex
// Turn each bone's skinning matrix W B^-1 into a dual quaternion, blend them with the vertex's weights, and apply the result:
// rotate the point by the real part, then add the translation 2 (dual real*) read off the vector part.
export function skinVertexDQ(vertex, weights, skins) {
  const dqs = [];
  for (let i = 0; i < skins.length; i++) dqs.push(dualQuaternion(skins[i]));
  const blend = blendDualQuaternions(dqs, weights);
  const real = [blend[0], blend[1], blend[2], blend[3]];
  const dual = [blend[4], blend[5], blend[6], blend[7]];
  const rotated = quatRotate(real, vertex);
  const t = quatMultiply(dual, quatConjugate(real));
  const blended = [rotated[0] + 2 * t[0], rotated[1] + 2 * t[1], rotated[2] + 2 * t[2]];
  return { dqs, blend, rotated, blended };
}
// #endregion

// #region Blend shapes: the targets
// A blend shape stores an offset for every vertex. Two targets on the tube: a bulge (radius up near the middle of its length)
// and a flattening (the z coordinate squeezed toward the axis).
export function bulgeOffsets(positions, span, amount) {
  const offsets = [];
  for (let v = 0; v < positions.length; v++) {
    const bump = Math.sin((Math.PI * positions[v][0]) / span);
    offsets.push([0, positions[v][1] * amount * bump, positions[v][2] * amount * bump]);
  }
  return { offsets };
}
export function flattenOffsets(positions, amount) {
  const offsets = [];
  for (let v = 0; v < positions.length; v++) offsets.push([0, 0, -positions[v][2] * amount]);
  return { offsets };
}
// #endregion

// #region Blend shapes: the weighted sum
// The posed shape is the neutral shape plus the weighted offsets: the skinning sum, applied to positions instead of matrices.
// Two targets that move the same vertices add, whether or not the sum is a shape anyone modeled.
export function blendShapes(neutral, offsets, weights) {
  const posed = [];
  let moved = 0;
  for (let v = 0; v < neutral.length; v++) {
    let p = neutral[v];
    for (let k = 0; k < offsets.length; k++) p = add(p, scale(offsets[k][v], weights[k]));
    posed.push(p);
    moved = Math.max(moved, length(sub(p, neutral[v])));
  }
  return { posed, moved };
}
// #endregion

// #region Blend trees: weights from a parameter
// A one-parameter blend tree: clips sorted by the parameter value they were made for (speed). Between two neighbors the weight
// of the faster one rises linearly from 0 to 1; outside the range the end clip has the whole weight.
export function blendTreeWeights(clipSpeeds, speed) {
  let lower = 0;
  while (lower < clipSpeeds.length - 2 && speed > clipSpeeds[lower + 1]) lower += 1;
  const t = Math.min(1, Math.max(0, (speed - clipSpeeds[lower]) / (clipSpeeds[lower + 1] - clipSpeeds[lower])));
  const weights = [];
  for (let i = 0; i < clipSpeeds.length; i++) weights.push(0);
  weights[lower] = 1 - t;
  weights[lower + 1] = t;
  return { lower, t, weights };
}
// #endregion

// #region Blend trees: blend a pose
// A pose is one angle per joint, each a rotation about z. Each joint's two rotations are blended as quaternions with slerp, and
// the blended quaternion is read back as an angle. About one shared axis this equals interpolating the angles.
export function blendPose(poseA, poseB, t) {
  const quaternions = [];
  const angles = [];
  const linear = [];
  for (let j = 0; j < poseA.length; j++) {
    const qa = quatFromAxisAngle([0, 0, 1], poseA[j]);
    const qb = quatFromAxisAngle([0, 0, 1], poseB[j]);
    const mix = quatSlerp(qa, qb, t);
    let angle = (2 * Math.atan2(mix.q[2], mix.q[3])) / DEG;
    if (angle > 180) angle -= 360;
    if (angle < -180) angle += 360;
    quaternions.push(mix.q);
    angles.push(angle);
    linear.push(poseA[j] + t * (poseB[j] - poseA[j]));
  }
  return { quaternions, angles, linear };
}
// #endregion

// #region Retargeting a leg
// The hip is hipDegrees from vertical. Copying the performer's angle to a shorter thigh puts the knee at thigh * sin(hip): the
// bone keeps its length. Copying the knee's position instead would stretch the thigh by the ratio of the lengths.
export function retargetLeg(performerThigh, characterThigh, hipDegrees) {
  const s = Math.sin(hipDegrees * DEG);
  const kneeCopyAngle = characterThigh * s;
  const kneeCopyPosition = performerThigh * s;
  const stretch = performerThigh / characterThigh - 1;
  return { kneeCopyAngle, kneeCopyPosition, stretch };
}
// #endregion
