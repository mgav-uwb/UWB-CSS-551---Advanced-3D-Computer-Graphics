// scene.js: a tilted checker floor, drawn by the GPU's own sampler in three.js. texlab.js computes; this file hands it the
// checker as a texture, lets you change the filter, the tilt and the tile count, and writes a status line with the level
// texlab.js picks for one pixel. The GPU's sampler and texlab.js are two implementations of the same filters, so the picture and
// the number can be compared. Keys: F cycles the filter (nearest, bilinear, trilinear), A cycles the anisotropy limit
// (1, 4, 16), up and down arrows change the tilt, left and right arrows change the tiles.
// The camera sits at the origin and looks down -z with a 50 degree field of view, as texlab.js's floor does; the floor passes
// through (0, 0, -1) and is rotated about the x axis by the tilt.
// The same scene, step for step, is TexLabScene.cs in ../unity/.
import * as THREE from '../../../vendor/three.module.js';
import * as T from './texlab.js';

// #region Renderer, scene, camera
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x141a28);
const camera = new THREE.PerspectiveCamera(T.FOV_DEGREES, window.innerWidth / window.innerHeight, 0.05, 500);
// #endregion

// #region The texture
// A 64 by 64 checker of 4-texel squares from texlab.js, copied into 8-bit RGBA. Repeat wrap; the GPU builds the mipmap.
const SIZE = 64;
const base = T.makeChecker(SIZE, 4, 0.12, 0.9);

function makeTexture() {
  const bytes = new Uint8Array(SIZE * SIZE * 4);
  for (let k = 0; k < SIZE * SIZE; k++) {
    const gray = Math.round(base[k] * 255);
    bytes[4 * k] = gray;
    bytes[4 * k + 1] = gray;
    bytes[4 * k + 2] = gray;
    bytes[4 * k + 3] = 255;
  }
  const texture = new THREE.DataTexture(bytes, SIZE, SIZE, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
const texture = makeTexture();
// #endregion

// #region The floor
// A large plane through (0, 0, -1). One texture repeat is 2 * halfWidth / tiles world units, as in floorPixel, and the
// image center is the middle of a repeat, u = v = 0.5.
const plane = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ map: texture }));
scene.add(plane);

let tilt = 66;
let tiles = 10;
let filterIndex = 0;
let anisoIndex = 2;
const FILTERS = ['nearest', 'bilinear', 'trilinear'];
const ANISO = [1, 4, 16];

function placeFloor() {
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(T.FOV_DEGREES / 2));
  const halfWidth = halfHeight * camera.aspect;
  const tileSize = 2 * halfWidth / tiles;
  const repeat = 60 / tileSize;
  texture.repeat.set(repeat, repeat);
  texture.offset.set(0.5 - 0.5 * repeat, 0.5 - 0.5 * repeat);
  plane.position.set(0, 0, -1);
  plane.rotation.x = -THREE.MathUtils.degToRad(tilt);
}

function applyFilter() {
  const name = FILTERS[filterIndex];
  texture.magFilter = name === 'nearest' ? THREE.NearestFilter : THREE.LinearFilter;
  texture.minFilter = name === 'nearest' ? THREE.NearestFilter : name === 'bilinear' ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
  texture.anisotropy = name === 'trilinear' ? ANISO[anisoIndex] : 1;
  texture.needsUpdate = true;
}
// #endregion

// #region The status line
// texlab.js reads one pixel of the 200 by 150 floor it models, near the bottom of the middle column, and reports the level.
const status = document.getElementById('status');

function describe() {
  const pyramid = T.buildMipmap(base, SIZE);
  const f = T.floorFootprint(100, 110, 200, 150, tilt, tiles);
  const fp = T.footprintLevel(f.dudx, f.dvdx, f.dudy, f.dvdy, SIZE, pyramid.levels);
  const lambda = f.hit ? fp.lambda.toFixed(2) : 'sky';
  status.textContent = 'filter ' + FILTERS[filterIndex] + '   anisotropy ' + texture.anisotropy + '   tilt ' + tilt
    + '   tiles ' + tiles + '   texlab.js: lambda ' + lambda + ' at pixel (100, 110)   F A arrows';
}
// #endregion

// #region Input and the frame
function onKeyDown(event) {
  const key = event.key.toLowerCase();
  if (key === 'f') filterIndex = (filterIndex + 1) % FILTERS.length;
  else if (key === 'a') anisoIndex = (anisoIndex + 1) % ANISO.length;
  else if (event.key === 'ArrowUp') tilt = Math.min(80, tilt + 2);
  else if (event.key === 'ArrowDown') tilt = Math.max(0, tilt - 2);
  else if (event.key === 'ArrowRight') tiles = Math.min(24, tiles + 1);
  else if (event.key === 'ArrowLeft') tiles = Math.max(1, tiles - 1);
  else return;
  applyFilter();
  placeFloor();
  describe();
  event.preventDefault();
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  placeFloor();
}

function frame() {
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
window.addEventListener('keydown', onKeyDown);
window.addEventListener('resize', onResize);
// #endregion

applyFilter();
placeFloor();
describe();
requestAnimationFrame(frame);
