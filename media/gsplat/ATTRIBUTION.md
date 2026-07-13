# media/gsplat/ attribution

`bonsai-7k-mini.splat` (8.7 MB)

- Underlying scene: "bonsai", one of the real-world scenes in the Mip-NeRF
  360 dataset (Barron et al., "Mip-NeRF 360: Unbounded Anti-Aliased Neural
  Radiance Fields", CVPR 2022 — Google Research). Released by the authors
  for research use.
- Gaussian-splat reconstruction + `.splat` packaging: dylanebert, published
  at https://huggingface.co/datasets/dylanebert/3dgs (bonsai/bonsai-7k-mini.splat,
  fetched 2026-07-12). This is a mini/decimated `.splat` export of a 7,000-
  iteration 3D Gaussian Splatting training run over the same scene.
- This exact scene (reconstructed independently as a `.ksplat`) is also what
  the vendored viewer's own author uses in the upstream project's official
  demo (github.com/mkkellogg/GaussianSplats3D, demo/bonsai.html) — i.e. this
  is the de facto standard smoke-test scene for this viewer, not a scene we
  picked in isolation.
- Used here for coursework/teaching demonstration (S10, non-commercial,
  attributed). If a stricter chain of title is ever needed, re-derive a
  `.splat`/`.ksplat` directly from Mip-NeRF 360's own published raw images
  using the INRIA reference pipeline or this viewer's own converter.
