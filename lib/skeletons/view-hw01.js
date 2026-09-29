// view-hw01: MVC and the loop. The sliders (controller) write the model {tx, ry, s}; two
// views read it: the cube, drawn with YOUR trsMatrix, and the matrix readout. A second
// object is aimed by YOUR orientBasis at a target that orbits, advanced every frame by
// YOUR advance(); the frame-rate knob changes dt, and the orbit speed must not change.
import { SliderRow, Mat4Panel } from '../core/cockpit.js';
import { THREE, scene3d, readout, safe, fmt, arrow } from './view-common.js';

export const NAV = 'orbit';
export const HELP_HTML = `<h4>HW1</h4><p>Sliders are the controller, <code>{tx, ry, s}</code> is the model, the
cube and the matrix card are two views. The cube is drawn with your <code>trsMatrix</code>. The arrow is
aimed with your <code>orientBasis</code> at the orbiting ball, which moves by your <code>advance</code>.
Change the simulated frame rate: a correct <code>advance</code> keeps the orbit speed the same.</p>
<p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>`;

const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

export function make(shell, impl, I) {
  const sc = scene3d(shell, { eye: [4, 4, 7], target: [0, 0.5, 0] });
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x5cd47a }));
  cube.matrixAutoUpdate = false;
  sc.scene.add(cube);

  const aim = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.6), new THREE.MeshStandardMaterial({ color: 0x8f7dff }));
  const nose = arrow(0xffcf5c);
  nose.rotation.x = Math.PI / 2; // the arrow's +y becomes the group's +z
  nose.scale.set(1, 0.9, 1);
  aim.add(body, nose);
  aim.matrixAutoUpdate = false;
  sc.scene.add(aim);
  const target = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), new THREE.MeshStandardMaterial({ color: 0xff6b6b }));
  sc.scene.add(target);

  const model = { tx: 0, ry: 30, s: 1, fps: 60 };
  const card = shell.addCard('Model (the controller writes it)');
  const sliders = {
    tx: new SliderRow(card, { id: 'hw1-tx', label: 'tx', min: -3, max: 3, step: 0.1, value: model.tx }),
    ry: new SliderRow(card, { id: 'hw1-ry', label: 'ry', min: 0, max: 360, step: 1, value: model.ry, format: (v) => `${v.toFixed(0)}°` }),
    s: new SliderRow(card, { id: 'hw1-s', label: 's', min: 0.25, max: 2.5, step: 0.05, value: model.s }),
    fps: new SliderRow(card, { id: 'hw1-fps', label: 'fps', min: 10, max: 120, step: 1, value: model.fps, format: (v) => `${v.toFixed(0)} Hz` }),
  };
  const matCard = shell.addCard('trsMatrix (a second view)');
  const panel = new Mat4Panel(matCard);
  const show = readout(shell, 'Aim (orientBasis)');

  const update = () => {
    const M = safe(() => impl.trsMatrix([model.tx, 0, 0], model.ry, model.s), IDENT);
    cube.matrix.fromArray(M);
    panel.update(M);
  };
  for (const k of Object.keys(sliders)) sliders[k].onInput((v) => { model[k] = v; update(); });
  update();

  // The loop: a fixed simulated frame rate, independent of the display's refresh.
  const AIM_POS = [1.5, 0.6, 1.5];
  let angle = [0, 0, 0]; // the orbit angle rides in x; advance() moves it at 1 rad per second
  let acc = 0, last = performance.now();
  const tick = (now) => {
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    const dt = 1 / model.fps;
    while (acc >= dt) { angle = safe(() => impl.advance(angle, [1, 0, 0], dt), angle); acc -= dt; }
    const tp = [2.2 * Math.cos(angle[0]), 1.2 + 0.4 * Math.sin(2 * angle[0]), 2.2 * Math.sin(angle[0])];
    target.position.set(...tp);
    const b = safe(() => impl.orientBasis(AIM_POS, tp, [0, 1, 0]), { x: [1, 0, 0], y: [0, 1, 0], z: [0, 0, 1] });
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...b.x), new THREE.Vector3(...b.y), new THREE.Vector3(...b.z));
    m.setPosition(...AIM_POS);
    aim.matrix.copy(m);
    show([`dt   ${fmt(dt, 4)} s`, `orbit angle ${fmt(angle[0] % (2 * Math.PI), 3)} rad`, `x ${fmt(b.x, 3)}`, `y ${fmt(b.y, 3)}`, `z ${fmt(b.z, 3)}`]);
    sc.render();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
