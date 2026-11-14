<!--
  CSS 551 · TOPIC DECK: Coordinate networks, further (~10 min, 6 slides), mounted after the lecture's wrap, time
  permitting. Cut 2026-11-13 from topics/coordinate-networks.md (L15), in the topic's order.
  NEEDS: topics/coordinate-networks.md.
  reveal.js: FLAT; notes follow "Note:"; plain unicode math in text blocks; never two "_" on one markdown line
  outside a code fence.
-->

### Supplement: coordinate networks, further

<small>(~10 min, time permitting) · reading: <a href="../../textbook/neural-nets-embeddings.html">Neural Networks and Embeddings</a>, Section 9</small>


---

## Pitfall: choosing the scale by the training error

```text
            on the pixels    between them
   σ = 24   15.55 dB         9.12 dB          6.4 dB worse between
   σ = 3    20.04 dB         22.58 dB         no gap
```

- the score on the training pixels says nothing about the function **between** them, and a coordinate network is evaluated between pixels whenever the image is zoomed, resampled or rendered from a new view
- check a coordinate network off its training grid: shifted samples, a higher resolution render, or held-out pixels
- the same failure in 3D: a radiance field with too-high frequencies shows "floaters" and grain in views between the training cameras


---

## Pitfall: SIREN without its initialization

```text
   first layer    W ~ U(−1/n, 1/n), n = 2:    |W| ≤ 0.5
                  phases ω₀ |W p + b| up to 51 rad (8 periods)
   hidden layer   W ~ U(−√(6/n)/ω₀, √(6/n)/ω₀), n = 48:
                  |W| ≤ 0.0118,   ω₀ |W| ≤ 0.354

                          paper's init    without the 1/ω₀
   mean |ω₀ z|, layer 2   2.35 rad        23.87 rad
   PSNR at step 2000      18.89 dB        13.27 dB
```

- the bound √(6/n) keeps each layer's input to the sine spread over about one period whatever the depth; dividing by ω₀ cancels the factor inside the sine
- without it every hidden sine sees phases spread over many periods: its output is effectively random in the input, and training starts from noise


---

## The SIREN's frequency plays the same role

<img src="../../textbook/figures/nn-coordnet-omega.png" class="media-shot" style="max-height: 150px;" alt="SIREN fits at omega zero 1, 30 and 90 after 2000 steps: a smooth blur, sharp, and speckled">
<span class="credit">SIREN at ω₀ = 1, 30, 90; 2000 steps each</span>

| ω₀ | 1 | 5 | 10 | 30 | 90 |
| -- | - | - | -- | -- | -- |
| PSNR on the pixels | 11.05 | 11.87 | 13.34 | **18.89** | 17.95 |
| PSNR between the pixels | 12.86 | 14.16 | 16.26 | **22.56** | 17.82 |

- ω₀ = 1: the sines stay near their linear part; the network is a smooth function like the plain ReLU one
- ω₀ = 90: speckle between the pixels, the large-σ failure again; the paper's 30 is best here


---

## Multiresolution hash encoding

Instant NGP (neural graphics primitives; Müller et al., *ACM TOG* 41(4), 2022, arXiv:2201.05989) **trains** the encoding itself:

```text
   L grids, resolutions N_l = ⌊N_min · bˡ⌋
   N_min = 16, N_max = 2048, L = 16:   b = 1.3819
   level l:  the cell around p;  its 4 corners (8 in 3D) index a table
             of T feature vectors (F = 2 numbers);  interpolate bilinearly
   concatenate L · F = 32 features  →  a small MLP  →  colour

   spatial hash  h(v) = ( v₁ · 1  XOR  v₂ · 2654435761 ) mod T,  T = 2¹⁴
   (37, 12) → 13417    (38, 12) → 13418
   (37, 13) → 11736    (38, 13) → 11739
```

- coarse levels fit in the table one entry per vertex; fine levels have more vertices than T entries and **collide**
- a shared entry receives the gradients of every vertex hashed to it; the other levels and the MLP tell the colliding points apart


---

## What the hash grid changes

```text
   one configuration:  L = 16,  F = 2,  T = 2¹⁹ entries per level
                       (the paper's range: T from 2¹⁴ to 2²⁴)
   table parameters    at most 16 × 2¹⁹ × 2 = 16,777,216
   the MLP             a few thousand

   2D, N_min = 16 → N_max = 2048, dense where (N_l + 1)² ≤ 2¹⁹:
   the first 12 levels (16 … 561) dense;  the last 4 (776 … 2048) hashed
```

- most parameters sit in the **tables**, and each pixel touches only 4 entries per level: training updates a tiny fraction of them per step
- the high frequencies come from the fine grids, not from sines, so the MLP can be very small
- the paper's result: "training of high-quality neural graphics primitives in a matter of seconds, and rendering in tens of milliseconds at a resolution of 1920 × 1080"


---

## The papers, 2019 to 2022

| Year | Paper | What it added |
| ---- | ----- | ------------- |
| 2019 | Rahaman et al., ICML, arXiv:1806.08734 | spectral bias: networks learn low frequencies first |
| 2020 | Mildenhall et al., ECCV, arXiv:2003.08934 | NeRF, with positional encoding of coordinates |
| 2020 | Tancik et al., NeurIPS, arXiv:2006.10739 | Fourier features; σ as the kernel's bandwidth |
| 2020 | Sitzmann et al., NeurIPS, arXiv:2006.09661 | SIREN: sine activations and their initialization |
| 2022 | Müller et al., *ACM TOG* 41(4), DOI 10.1145/3528223.3530127 | Instant NGP: multiresolution hash encoding |
