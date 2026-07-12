// Scene shell: a pre-dressed three.js scene for cockpit demos.
// Render-on-demand only — no requestAnimationFrame loop lives here or in any
// consumer; callers call render() explicitly after mutating the scene.
import * as THREE from '../vendor/three.module.js';

const BG = 0x0b0c10;

/**
 * makeScene(container, {width, height}) -> { renderer, scene, camera, render }
 * - renderer: WebGLRenderer with preserveDrawingBuffer:true (pixel probes
 *   in browser tests read the canvas back via drawImage/getImageData, which
 *   requires the drawing buffer to survive past the frame).
 * - scene: dark background, GridHelper + AxesHelper on the ground plane,
 *   HemisphereLight + DirectionalLight.
 * - camera: PerspectiveCamera sized to the container; caller may reposition.
 * - render(): renders once. Never called automatically.
 */
export function makeScene(container, { width, height } = {}) {
  const w = width ?? container.clientWidth ?? 400;
  const h = height ?? container.clientHeight ?? 300;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);

  const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
  camera.position.set(3, 3, 6);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(w, h);
  renderer.setClearColor(BG);
  container.appendChild(renderer.domElement);

  const grid = new THREE.GridHelper(10, 10, 0x3a4152, 0x262a35);
  scene.add(grid);

  const axes = new THREE.AxesHelper(2);
  scene.add(axes);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x24262b, 0.9);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.0);
  dir.position.set(5, 8, 4);
  scene.add(dir);

  function render() {
    renderer.render(scene, camera);
  }

  return { renderer, scene, camera, render };
}
