// view-hw03: the three-node arm drawn ONLY from YOUR worldMatrices (no three.js parenting),
// with W_hand in a matrix card, a world point pulled into the hand frame by YOUR worldToLocal,
// and a pivot demo: a bar spun by YOUR pivotRotateY about a marked point.
import { SliderRow, Mat4Panel } from '../core/cockpit.js';
import { THREE, scene3d, readout, safe, fmt, ball } from './view-common.js';

export const NAV = 'orbit';
export const HELP_HTML = `<h4>HW3</h4><p>Base, arm, and hand are placed only by your <code>worldMatrices</code>:
<code>W_child = W_parent · L_child</code>. Yawing the base must sweep all three; bending the arm must
carry the hand. The purple bar spins about the yellow pivot with your <code>pivotRotateY</code>; the pivot
must stay put.</p><p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>`;

const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function make(shell, impl, I) {
  const sc = scene3d(shell, { eye: [3.5, 3, 5], target: [0, 0.8, 0] });
  const box = (w, h, d, color) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshStandardMaterial({ color }));
    const g = new THREE.Group(); g.add(m); g.matrixAutoUpdate = false; sc.scene.add(g);
    return { g, m };
  };
  const base = box(1.2, 0.4, 1.2, 0x5c8cff);
  const arm = box(0.25, 1.4, 0.25, 0x5cd47a);
  const hand = box(0.45, 0.25, 0.45, 0xffcf5c);
  // box geometry is centered; each node's origin sits where the demo puts it
  hand.m.position.y = 0.12;
  const wp = ball(0xffffff, 0.06); wp.position.set(...I.worldPoint); sc.scene.add(wp);

  const bar = box(1.2, 0.12, 0.2, 0x8f7dff);
  const pivot = ball(0xffcf5c, 0.07); sc.scene.add(pivot);
  const PIV_ORIGIN = [-2.2, 0.1, 1.2];

  const pose = { ...I.pose };
  const card = shell.addCard('Pose');
  new SliderRow(card, { id: 'hw3-base', label: 'baseRy', min: 0, max: 360, step: 1, value: pose.baseRy, format: (v) => `${v.toFixed(0)}°` }).onInput((v) => { pose.baseRy = v; update(); });
  new SliderRow(card, { id: 'hw3-bend', label: 'armBend', min: 0, max: 120, step: 1, value: pose.armBend, format: (v) => `${v.toFixed(0)}°` }).onInput((v) => { pose.armBend = v; update(); });
  new SliderRow(card, { id: 'hw3-hand', label: 'handRy', min: 0, max: 180, step: 1, value: pose.handRy, format: (v) => `${v.toFixed(0)}°` }).onInput((v) => { pose.handRy = v; update(); });
  const panel = new Mat4Panel(shell.addCard('W_hand'));
  const show = readout(shell, 'Frames');

  function update() {
    const W = safe(() => impl.worldMatrices(pose), { base: IDENT, arm: IDENT, hand: IDENT });
    base.g.matrix.fromArray(W.base);
    arm.g.matrix.fromArray(W.arm);
    hand.g.matrix.fromArray(W.hand);
    panel.update(W.hand);
    const local = safe(() => impl.worldToLocal(W.hand, I.worldPoint), [0, 0, 0]);
    const piv = safe(() => impl.pivotRotateY([PIV_ORIGIN[0] + 0.45, PIV_ORIGIN[1], PIV_ORIGIN[2]], pose.baseRy), IDENT);
    const place = new THREE.Matrix4().fromArray(piv).multiply(new THREE.Matrix4().makeTranslation(...PIV_ORIGIN));
    bar.g.matrix.copy(place);
    pivot.position.set(PIV_ORIGIN[0] + 0.45, PIV_ORIGIN[1] + 0.1, PIV_ORIGIN[2]);
    show([
      `hand origin  ${fmt([W.hand[12], W.hand[13], W.hand[14]], 3)}`,
      `arm origin   ${fmt([W.arm[12], W.arm[13], W.arm[14]], 3)}`,
      `(0,1,0) in hand frame ${fmt(local, 3)}`,
      `pivot column ${fmt([piv[12], piv[13], piv[14]], 3)}`,
    ]);
    sc.render();
  }
  update();
}
