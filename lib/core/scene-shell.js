// Scene shell: a pre-dressed three.js scene for cockpit demos.
// Render-on-demand only — no requestAnimationFrame loop lives here or in any
// consumer; callers call render() explicitly after mutating the scene.
import * as THREE from '../vendor/three.module.js';

const BG = 0x0b0c10;

/**
 * makeScene(container, {width, height, fill}) -> { renderer, scene, camera,
 *                                                  render, grid, axes, resize }
 * - renderer: WebGLRenderer with preserveDrawingBuffer:true (pixel probes
 *   in browser tests read the canvas back via drawImage/getImageData, which
 *   requires the drawing buffer to survive past the frame).
 * - scene: dark background, GridHelper + AxesHelper on the ground plane,
 *   HemisphereLight + DirectionalLight. `grid`/`axes` are returned so a demo's
 *   "⚙" toggles can show/hide them.
 * - camera: PerspectiveCamera sized to the container; caller may reposition.
 * - render(): renders once. Never called automatically.
 * - resize(): re-read the container size, resize the renderer, and fix the
 *   camera aspect (then the caller renders). Wired to window resize when
 *   `fill` is set.
 *
 * fill:true sizes the renderer to container.clientWidth/Height (for a
 * demo-shell scene pane that flexes to fill the page) and installs a window
 * resize handler; otherwise the fixed width/height (default 400x300) is used,
 * exactly as before, so any non-shell caller is unaffected.
 */
export function makeScene(container, { width, height, fill = false } = {}) {
  const w = (fill ? container.clientWidth : width) || width || 400;
  const h = (fill ? container.clientHeight : height) || height || 300;

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

  // resize(): re-fit the renderer + camera to the container's current size,
  // then repaint (render-on-demand: nothing repaints on its own). Only
  // meaningful when the scene flexes — fill:true wires it to window resize.
  function resize() {
    const nw = container.clientWidth || w;
    const nh = container.clientHeight || h;
    renderer.setSize(nw, nh);
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    render();
  }

  if (fill) {
    window.addEventListener('resize', resize);
  }

  return { renderer, scene, camera, render, grid, axes, resize };
}
