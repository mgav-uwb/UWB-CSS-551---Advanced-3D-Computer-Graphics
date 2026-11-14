// scene.js: a generated 64 by 64 color picture beside its JPEG, in three.js. imagelab.js computes; this file draws the two pictures as textures
// and writes a status line with the measured size and the PSNR. Keys: up and down arrows change the quality by 5 (1 to 100), C switches the color
// planes between 4:2:0 and 4:4:4.
// Each picture is a plane with a nearest-neighbor texture, so every pixel is a visible square. The camera is orthographic and looks down -z.
// The same scene, step for step, is ImageLabScene.cs in ../unity/.
import * as THREE from '../../../vendor/three.module.js';
import * as IL from './imagelab.js';

// #region Renderer, scene, camera
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0c10);
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(-1.1 * aspect * 0.6, 1.1 * aspect * 0.6, 0.66, -0.66, 0.1, 10);
camera.position.z = 2;
// #endregion

// #region The picture and its JPEG
// imagelab.js makes the picture (0 to 1) and jpegColor codes it (0 to 255). The right-hand texture is rebuilt on every key.
const SIZE = 64;
const picture = IL.makeColorScene(SIZE);
let quality = 50;
let subsample = true;

function makeTexture(r, g, b, scale) {
  const bytes = new Uint8Array(SIZE * SIZE * 4);
  for (let k = 0; k < SIZE * SIZE; k++) {
    bytes[4 * k] = Math.round(r[k] * scale);
    bytes[4 * k + 1] = Math.round(g[k] * scale);
    bytes[4 * k + 2] = Math.round(b[k] * scale);
    bytes[4 * k + 3] = 255;
  }
  const texture = new THREE.DataTexture(bytes, SIZE, SIZE, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.flipY = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makePlane(x, texture) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: texture }));
  mesh.position.x = x;
  scene.add(mesh);
  return mesh;
}

const original = makePlane(-0.55, makeTexture(picture.r, picture.g, picture.b, 255));
const coded = makePlane(0.55, makeTexture(picture.r, picture.g, picture.b, 255));
const statusEl = document.getElementById('status');

function code() {
  const r = picture.r.map(function (v) { return v * 255; });
  const g = picture.g.map(function (v) { return v * 255; });
  const b = picture.b.map(function (v) { return v * 255; });
  const j = IL.jpegColor(r, g, b, SIZE, SIZE, quality, subsample);
  coded.material.map.dispose();
  coded.material.map = makeTexture(j.r, j.g, j.b, 1);
  coded.material.needsUpdate = true;
  statusEl.textContent = 'quality ' + quality + (subsample ? '  4:2:0' : '  4:4:4') + '   ' + j.bitsPerPixel.toFixed(2)
    + ' bits per pixel (24 uncompressed), ratio ' + j.ratio.toFixed(1) + ' : 1, PSNR ' + j.psnr.toFixed(1) + ' dB   up/down: quality   C: chroma';
}
// #endregion

// #region Input and the frame
function onKeyDown(event) {
  if (event.key === 'ArrowUp') quality = Math.min(100, quality + 5);
  else if (event.key === 'ArrowDown') quality = Math.max(1, quality - 5);
  else if (event.key === 'c' || event.key === 'C') subsample = !subsample;
  else return;
  code();
  renderer.render(scene, camera);
}

window.addEventListener('keydown', onKeyDown);
code();
renderer.render(scene, camera);
// #endregion
