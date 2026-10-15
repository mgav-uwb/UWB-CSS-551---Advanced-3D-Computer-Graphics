---
title: "The aircraft models"
version: "1.1"
status: final
created_by: "Claude"
created_at: "2026-10-15T01:00"
last_modified_by: "Claude"
last_modified_at: "2026-10-15T10:30"
contributors:
  - "Claude"
  - "Marcel Gavriliu"
tags:
  - "css551"
  - "assets"
  - "models"
related:
  - path: "../CREDITS.md"
    desc: "provenance of every model asset"
  - path: "../../../core/aircraft.js"
    desc: "the loader the demos use"
  - path: "../../../../tools/convert-aircraft-blend.py"
    desc: "the Blender script that made the GLB, OBJ and textures from the originals"
  - path: "../../../../tools/aircraft-figure-renderer.mjs"
    desc: "renders an aircraft into the textbook's SVG figures"
---

# The aircraft models

Three aircraft from BlendSwap, converted to one frame: **nose +z, top +y, wings along x**, meters, the origin at
the center of the bounding box. It is the frame of the block planes in the rotation demos, so an aircraft can stand
in for them unchanged. (With the nose on +z and the top on +y, the pilot's right is -x.)

| Model | Folder | Span (x) | Height (y) | Length (z) | Triangles | GLB |
| ----- | ------ | -------- | ---------- | ---------- | --------- | --- |
| Cessna 208 Caravan | `cessna/` | 15.85 m | 4.58 m | 12.60 m | 27,369 | 0.3 MB |
| Harrier II (AV-8B) | `harrier/` | 9.21 m | 3.48 m | 14.12 m | 99,987 | 0.4 MB |
| Airbus A380 | `A380/` | 79.55 m | 24.24 m | 72.72 m | 126,411 | 1.6 MB |

## Credits and terms

- **Cessna 208 Caravan:** "Cessna 208 Caravan (Wheels version)" by **Helijah** (Emmanuel Baranger,
  <http://helijah.free.fr>), BlendSwap blend 66877, released there under **CC0** (public domain;
  `cessna/BLENDSWAP_LICENSE.txt`). The author's own read-me, made for FlightGear, says the files are GPL; the
  BlendSwap release is the one used here.
- **Harrier II:** "Harrier II" by **panko10**, BlendSwap (<https://blendswap.com/blend/30230>), **CC BY 3.0**:
  any use, with credit to panko10. The download came without a license file; the terms are those of its BlendSwap
  page.
- **Airbus A380:** "Airbus-A380" by **theMaker**, BlendSwap blend 87811 (now <https://blendswap.com/blend/19434>),
  **CC BY-SA 3.0** as stated by `A380/87811 - LICENSE.html`, and marked **fan art**: no commercial use. The
  converted model is shared under the same license, with credit to theMaker. The Emirates livery and logos are
  trademarks of their owner, reproduced by the original model.

## Files

| File | What it is | Use it in |
| ---- | ---------- | --------- |
| `<folder>/<name>.glb` | glTF 2.0 binary, meshopt-compressed, textures inside | three.js: `GLTFLoader` with `setMeshoptDecoder(MeshoptDecoder)` (both in `lib/vendor/`), or `lib/core/aircraft.js` |
| `<folder>/<name>.obj` + `.mtl` | the same model as text | Unity (native import) |
| `<folder>/*.jpg` | the textures the MTL names | Unity, beside the OBJ |

The original `.blend` files, the downloaded archives and the Cessna's original textures stay in the course's
private copy.

## In the textbook's figures

The Rotation chapter's airplane figures (`rot-noncommute`, `rot-yaw-pitch-roll`, `rot-euler-orders`, `rot-gimbal`)
show the Cessna. `tools/gen-textbook-figures-rotation-intuition.mjs` asks `tools/aircraft-figure-renderer.mjs` for
each pose: three.js in headless Chromium renders the GLB with the figure's own orthographic view (no dev server
needed), and the PNG goes into the SVG under the vector arrows and labels.

```js
const air = await openAircraftRenderer({ name: 'cessna', size: 1.6 });   // size: wingspan in figure units
s += await air.image({ m, view: { yaw, pitch, scale, cx, cy } });        // m: column-major rotation
await air.close();
```

## The Cessna's moving parts

The propeller, ailerons, flaps, elevator and rudder are separate nodes (separate objects in the OBJ). In the GLB
each node's origin sits on its hinge line (the propeller's on its hub), so a rotation about the node's own origin
turns the part about its hinge; the axis is in the node's extras as `hinge_axis` (three.js: `userData.hinge_axis`).
The OBJ has no node origins: in Unity, put each part under an empty GameObject at its pivot below, or turn it with
`Transform.RotateAround(pivot, axis, angle)`.

| Node | Pivot (m) | Axis |
| ---- | --------- | ---- |
| `propeller` | (-0.002, -0.127, 6.049) | (0, 0, 1) |
| `aileron_left` | (6.025, 0.455, 1.039) | (0.998, 0.042, -0.041) |
| `aileron_right` | (-6.025, 0.455, 1.039) | (0.998, -0.042, 0.041) |
| `flap_left` | (3.384, 0.281, 1.012) | (0.998, 0.050, 0.030) |
| `flap_right` | (-3.384, 0.281, 1.012) | (0.998, -0.050, -0.030) |
| `elevator` | (0, -0.138, -4.855) | (1, 0, 0) |
| `rudder` | (0, 1.080, -5.479) | (0, 0.987, -0.159) |

In three.js, with the model loaded by `makeAircraft('cessna')`:

```javascript
const rudder = plane.getObjectByName('rudder');
const axis = new THREE.Vector3(...rudder.userData.hinge_axis);
rudder.quaternion.setFromAxisAngle(axis, THREE.MathUtils.degToRad(20));   // 20 degrees about the hinge
```

## Making them again

```bash
B=/Applications/Blender.app/Contents/MacOS/Blender
$B -b lib/assets/models/aircraft/cessna/Cessna-208-CaravanW/caravanW.blend --python tools/convert-aircraft-blend.py -- cessna
$B -b "lib/assets/models/aircraft/harrier/Harrier II.blend" --python tools/convert-aircraft-blend.py -- harrier
$B -b lib/assets/models/aircraft/A380/Airbus_a380.blend --python tools/convert-aircraft-blend.py -- a380
# then in each folder (cessna, harrier, A380), with <name> the lower-case model name:
npx gltfpack@0.24.0 -i <name>.glb -o <name>.glb -cc -kn -km -ke
```

---

## Change Log

| Version | Date             | Author | Summary       |
| ------- | ---------------- | ------ | ------------- |
| 1.1     | 2026-10-15T10:30 | Claude | The Cessna in the Rotation chapter's figures (tools/aircraft-figure-renderer.mjs) |
| 1.0     | 2026-10-15T01:00 | Claude | Initial: three BlendSwap aircraft Marcel found, converted to the course's frame |
