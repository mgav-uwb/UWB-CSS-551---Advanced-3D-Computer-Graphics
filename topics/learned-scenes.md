<!--
  CSS 551 · TOPIC DECK — Learned scenes: NeRF and 3DGS (~12 min).
  A topic is a reusable stretch of slides that a session page mounts as one
  <section data-markdown="../../topics/learned-scenes.md"> among others; it carries no
  session logistics (no title, Thursday, MP, wrap) and no "Part N" numbering.
  Sessions compose topics in their index.html; see sessions/README.md.

  TEACHES: inverse rendering; NeRF as a learned field rendered by marching rays; 3DGS back to primitives; the live splat scene; learned scene versus learned image.
  NEEDS:   viewing and projection; the diffusion ladder for the contrast slide (it refers to score distillation and ControlNet).
  DEMOS:   data-demo="gsplat" data-controls="fov" (under the 210px crop). Attribution per media/gsplat/ATTRIBUTION.md on the slide and in the fallback.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Demo embeds live on
  demo-full slides (a short ## title + the embed div + its viz-fallback pre).
  Image/handout paths are relative to the SESSION page that mounts this
  topic (sessions/SNN/index.html): ../../media/..., ../../textbook/...
-->

### Learned scenes: NeRF and 3DGS

<small>(~12 min)</small>

---

## A different question: inverse rendering

Everything so far is **forward** rendering: **you build** the geometry and materials, then the pipeline projects and shades them into pixels. The frontier flips the arrow:

```text
   forward:   scene (meshes, materials, lights)  ──render──▶  image
   inverse:   many photographs  ──optimize──▶  a 3D scene you can re-render
```

- **inverse rendering / novel-view synthesis** — given a set of **photos** of a real scene from different angles, **recover** a 3D representation, then render it from **new** viewpoints the camera never saw
- the representation is **learned by optimization** (gradient descent), not modeled by an artist
- the last few years' breakthroughs — **NeRF**, then **3D Gaussian splatting** — are both this: **photographs in, a re-renderable 3D scene out**

Note: Frame the whole of Part 3 as a reversal of the arrow the course has followed (playbook §4 — one honest framing before the survey). Everything up to now is FORWARD rendering: a human builds the scene — models the meshes (S07), paints the textures (S08), sets the lights and materials (S09, Part 1) — and the pipeline (S04–S06) transforms and shades that scene into an image. The frontier that has moved fastest in the last few years asks the INVERSE question: instead of building a scene and rendering it, start from a set of ordinary PHOTOGRAPHS of a real scene taken from many angles, and RECOVER a 3D representation that, when rendered, reproduces those photos — and crucially can then be rendered from entirely new viewpoints the camera never occupied. This is called inverse rendering, or novel-view synthesis, and it is a form of 3D reconstruction. The defining move is that the 3D representation is not authored by hand; it is LEARNED by optimization — you define a renderer that is differentiable (you can take derivatives of the output image with respect to the scene parameters) and then run gradient descent to nudge the scene parameters until the rendered images match the training photographs, the same optimization loop that trains neural networks. Two landmark methods define the arc: NeRF in 2020, which represents the scene as a neural network, and 3D Gaussian splatting in 2023, which represents it as millions of little primitives and renders in real time. Both are "photographs in, a re-renderable 3D scene out." We survey each at the level of the key idea, then run a real one live. Next: NeRF.

---

## NeRF: a learned field, rendered by marching rays

**NeRF** (Mildenhall et al. 2020): the **entire scene** is one small network, **no mesh**: `(x, y, z, view direction) → (color, density)`. A pixel is made by **marching a ray** through it:

```text
   shoot a ray from the camera (S06's un-project) into the scene
   sample the network at many points along it → (color_i, density_i)
   composite front-to-back: denser points contribute more and occlude what is behind
```

- the scene **is** the weights: a learned field filling space, view-dependent color for free
- **training** runs the march backwards: it is differentiable, so gradient descent tunes the weights until rendered rays match the **training photos**
- **cost**: hundreds of network evaluations per ray; slow to train and to render

Note: The two NeRF slides folded into one, now that "a network is a function" has been said in Part 2. The scene is a function from a 3D point and a viewing direction to a color and a density, and that function is a small network; there is no mesh anywhere. Rendering marches a camera ray through it, sampling and compositing front to back, the volume-rendering idea. Training is the same march run backwards through gradient descent until the rendered rays match the photographs. The honest cost, hundreds of evaluations per ray, is why the next slide's Gaussians exist.

---

## 3D Gaussian splatting: back to primitives

**3D Gaussian Splatting** (Kerbl et al. 2023) keeps the "**learn it from photos**" idea but throws out the slow network. The scene is **millions of explicit primitives** — 3D **Gaussians**, little fuzzy translucent blobs:

```text
   each Gaussian:   position   (where)
                    covariance (its 3D shape: an oriented, stretched ellipsoid)
                    color      (view-dependent)
                    opacity    (how solid)
```

- render by **projecting** ("splatting") each Gaussian to the screen and **blending** them **back-to-front** — a **rasterizer**, not a ray-marcher, so it runs in **real time**
- still trained by **differentiable rasterization**: gradient descent moves, stretches, recolors, and fades the Gaussians until the render matches the **photos** (and **adds/removes** Gaussians as needed)
- "back to primitives" — the same **project-and-rasterize** pipeline you built, with a **fuzzy blob** as the primitive instead of a triangle

Note: 3D Gaussian splatting at concept depth, framed as the pragmatic answer to NeRF's cost (playbook §3). Kerbl and colleagues in 2023 kept NeRF's winning idea — reconstruct the scene from photos by differentiable optimization — but replaced the slow implicit network with fast EXPLICIT primitives. The scene is represented as millions of 3D Gaussians: think of each as a small, soft, translucent ellipsoidal blob in space, described by a position (where it sits), a covariance (its 3D shape — an oriented, possibly stretched ellipsoid, so blobs can be flat discs, needles, or spheres to match surfaces and edges), a color (view-dependent, so it too can capture glints), and an opacity. Rendering is the key speed win: instead of marching rays and querying a network hundreds of times, you PROJECT each 3D Gaussian onto the image plane — "splat" it into a little 2D footprint — and blend all the splats back-to-front with alpha compositing. That is a RASTERIZER, the same project-then-fill-pixels pipeline you have built all quarter, just with a fuzzy Gaussian as the primitive instead of a triangle — and because rasterization is what GPUs are built for, it renders in REAL TIME, the thing NeRF could not do. Training is still the inverse loop, now called differentiable rasterization: gradient descent adjusts every Gaussian's position, shape, color, and opacity to make the rendered image match the training photos, and — a clever extra — the optimizer periodically ADDS Gaussians where the scene needs more detail and REMOVES ones that became transparent or redundant, so the count adapts to the scene. The headline framing for students: after a detour through neural fields, the field came back to explicit primitives and an ordinary rasterizer — the very pipeline you own — which is exactly why the demo you are about to orbit runs live in your browser. Next: run it.

---

## A real splat scene, live

<div class="cockpit" data-demo="gsplat" data-controls="fov"><pre class="viz-fallback">  a real 3D Gaussian Splatting scene, rendered live: ~240,000 translucent
  3D Gaussians, projected and blended back-to-front — a rasterizer, in your
  browser. Drag fov, the lens; click to explore and fly. Notice the soft,
  translucent edges — no triangle mesh, no textures; just fuzzy blobs.

  Scene: the "bonsai" scene from the Mip-NeRF 360 dataset (Barron et al.,
  CVPR 2022, Google Research); 3D Gaussian .splat reconstruction by dylanebert
  (huggingface.co/datasets/dylanebert/3dgs). See media/gsplat/ATTRIBUTION.md.</pre></div>

Note: The live demo (`gsplat`, embed controls `orbitAz, dist`). This is a REAL 3D Gaussian splatting scene — about 240,000 Gaussians — rendered live in the browser by a vendored, MIT-licensed splat viewer; not a video, not stills. Drive it: drag `orbitAz` to orbit the camera around the scene and `dist` to pull in or push out, and point out what makes it visibly different from every mesh demo this quarter — the edges are SOFT and translucent, leaves and twigs fade rather than showing hard triangle silhouettes, because there is no mesh and no texture, only overlapping fuzzy blobs blended back-to-front. That soft, slightly cloudy look is the signature of Gaussian splatting. THE attribution, which must be stated and is on the slide: the underlying scene is "bonsai" from the Mip-NeRF 360 dataset by Barron and colleagues, CVPR 2022, Google Research; the 3D-Gaussian `.splat` reconstruction and packaging is by dylanebert, published on Hugging Face — full chain in `media/gsplat/ATTRIBUTION.md`. Two honest technical notes for anyone who asks. The camera orbit is driven by OUR OWN hand-built rotation math (the axis-angle Rodrigues matrix from S03, applied to the camera offset) — the same core every demo this quarter used — while the splat rendering itself is the vendored library's. And the viewer runs its own animation loop that PAUSES when this slide is off-screen (it writes `data-gsplatRunning`), so it does not burn the machine during the rest of class; the small axes marker renders immediately even while the 8.7 MB scene finishes loading. If WebGL2 is unavailable the slide degrades to the text fallback with the same attribution. Next: what all this does and does not change about the pipeline you built.

---

## Learned scene, learned image

```text
   LEARNED SCENE (NeRF, 3DGS)              LEARNED IMAGE (diffusion)
   ────────────────────────────            ─────────────────────────
   one scene, from its own photos          all images, from an archive
   a camera you can move                   no camera, no scene
   renders new VIEWS of the same thing     samples NEW things
   trained through a differentiable        trained by predicting noise;
   renderer (your V and P inside it)       renders nothing itself
   meet: score distillation (diffusion)    meet: ControlNet on your depth buffer
```

- 3D Gaussian splatting literally **rasterizes with a projection matrix**: it needs your **V** and **P**
- "shade a point, accumulate along a ray, composite front-to-back" is the same idea with a triangle, a network sample, or a Gaussian
- neither half erases the pipeline; both stand on it

Note: The contrast slide that organizes the night, now with both halves seen. Walk the two columns. A learned scene is one place, learned from its photographs, that you can re-photograph from anywhere; a learned image model is the whole archive, that you can sample from but never walk into. Both are trained by gradient descent through something: the scene through a renderer that contains your view and projection matrices, the image model through noise prediction. And they meet twice, in score distillation where the image model trains a scene, and in ControlNet where the pipeline's depth buffer steers the image model. Close Part 3 on the sentence that the pipeline is the substrate of both.
