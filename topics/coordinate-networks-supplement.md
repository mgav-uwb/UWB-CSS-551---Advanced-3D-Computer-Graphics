<!--
  CSS 551 · TOPIC DECK: Coordinate networks, further (~10 min, 6 slides), mounted after the lecture's wrap, time
  permitting. Cut 2026-11-13 from topics/coordinate-networks.md (L15), in the topic's order.
  NEEDS: topics/coordinate-networks.md.
  POLISHED 2026-11-19 (Marcel: "let's apply the formula and illustration polish we used in previous lectures"):
  every formula typeset, the ASCII kept as aria-label.
  reveal.js: FLAT; notes follow "Note:" and stay plain text; never two "_" on one markdown line outside a code
  fence or code span.
  Display math is a raw <div class="tex"> block typeset by MathJax (lib/deck-math.js; TeX inside, the ASCII form
  as aria-label, no blank line inside); inline math is a code span written `$...$`.
  ACRONYMS 2026-11-19 (Marcel: "remember to define any and all acronyms on first use"): each acronym is spelled
           out at its first use in this file, slides and notes alike; citation venues (ICML, NeurIPS, ECCV, ACM TOG)
           and product names stay as names.
-->

### Supplement: coordinate networks, further

<small>(~10 min, time permitting) · reading: <a href="../../textbook/neural-nets-embeddings.html">Neural Networks and Embeddings</a>, Section 9</small>


---

## Pitfall: choosing the scale by the training error

| | on the pixels | between them | |
| --- | --- | --- | --- |
| `$\sigma = 24$` | 15.55 dB | 9.12 dB | 6.4 dB worse between |
| `$\sigma = 3$` | 20.04 dB | 22.58 dB | no gap |

- the score on the training pixels says nothing about the function **between** them, and a coordinate network is evaluated between pixels whenever the image is zoomed, resampled or rendered from a new view
- check a coordinate network off its training grid: shifted samples, a higher resolution render, or held-out pixels
- the same failure in 3D: a radiance field with too-high frequencies shows "floaters" and grain in views between the training cameras


---

## Pitfall: SIREN without its initialization

<div class="tex" style="font-size:0.8em" role="img" aria-label="first layer    W ~ U(−1/n, 1/n), n = 2:    |W| ≤ 0.5
               phases ω₀ |W p + b| up to 51 rad (8 periods)
hidden layer   W ~ U(−√(6/n)/ω₀, √(6/n)/ω₀), n = 48:
               |W| ≤ 0.0118,   ω₀ |W| ≤ 0.354">
\[
\begin{aligned}
&\text{first layer} && W \sim U(-1/n,\ 1/n),\ n = 2\text{:} \quad \lvert W \rvert \le 0.5 \\
& && \text{phases } \omega_0 \lvert W p + b \rvert \text{ up to 51 rad (8 periods)} \\
&\text{hidden layer} && W \sim U\big(-\sqrt{6/n}/\omega_0,\ \sqrt{6/n}/\omega_0\big),\ n = 48\text{:} \\
& && \lvert W \rvert \le 0.0118, \quad \omega_0 \lvert W \rvert \le 0.354
\end{aligned}
\]
</div>

| | paper's init | without the `$1/\omega_0$` |
| --- | --- | --- |
| mean `$\lvert \omega_0 z \rvert$`, layer 2 | 2.35 rad | 23.87 rad |
| PSNR at step 2000 | 18.89 dB | 13.27 dB |

- the bound `$\sqrt{6/n}$` keeps each layer's input to the sine spread over about one period whatever the depth; dividing by `$\omega_0$` cancels the factor inside the sine
- without it every hidden sine sees phases spread over many periods: its output is effectively random in the input, and training starts from noise


---

## The SIREN's frequency plays the same role

<img src="../../textbook/figures/nn-coordnet-omega.png" class="media-shot" style="max-height: 150px;" alt="SIREN fits at omega zero 1, 30 and 90 after 2000 steps: a smooth blur, sharp, and speckled">
<span class="credit">SIREN at ω₀ = 1, 30, 90; 2000 steps each</span>

| `$\omega_0$` | 1 | 5 | 10 | 30 | 90 |
| -- | - | - | -- | -- | -- |
| PSNR on the pixels | 11.05 | 11.87 | 13.34 | **18.89** | 17.95 |
| PSNR between the pixels | 12.86 | 14.16 | 16.26 | **22.56** | 17.82 |

- `$\omega_0 = 1$`: the sines stay near their linear part; the network is a smooth function like the plain ReLU (rectified linear unit) one
- `$\omega_0 = 90$`: speckle between the pixels, the large-`$\sigma$` failure again; the paper's 30 is best here


---

## Multiresolution hash encoding

Instant NGP (neural graphics primitives; Müller et al., *ACM TOG* 41(4), 2022, arXiv:2201.05989) **trains** the encoding itself:

<div class="tex" style="font-size:0.74em" role="img" aria-label="L grids, resolutions N_l = ⌊N_min · bˡ⌋
N_min = 16, N_max = 2048, L = 16:   b = 1.3819
level l:  the cell around p;  its 4 corners (8 in 3D) index a table
          of T feature vectors (F = 2 numbers);  interpolate bilinearly
concatenate L · F = 32 features  →  a small multilayer perceptron  →  colour
spatial hash  h(v) = ( v₁ · 1  ⊕  v₂ · 2654435761 ),  ⊕ bitwise exclusive or mod T,  T = 2¹⁴
(37, 12) → 13417    (38, 12) → 13418
(37, 13) → 11736    (38, 13) → 11739">
\[
\begin{aligned}
&L \text{ grids, resolutions } N_l = \lfloor N_{\min} \cdot b^l \rfloor \\
&N_{\min} = 16,\ N_{\max} = 2048,\ L = 16\text{:} \quad b = 1.3819 \\
&\text{level } l\text{: the cell around } p; \text{ its 4 corners (8 in 3D) index a table} \\
&\quad \text{of } T \text{ feature vectors } (F = 2 \text{ numbers}); \text{ interpolate bilinearly} \\
&\text{concatenate } L \cdot F = 32 \text{ features} \ \to\ \text{a small multilayer perceptron} \ \to\ \text{colour} \\[6pt]
&\text{spatial hash} \quad h(v) = (v_1 \cdot 1  \oplus v_2 \cdot 2654435761) \bmod T, \quad T = 2^{14} \\
&\quad (37, 12) \to 13417 \qquad (38, 12) \to 13418 \\
&\quad (37, 13) \to 11736 \qquad (38, 13) \to 11739
\end{aligned}
\]
</div>

- coarse levels fit in the table one entry per vertex; fine levels have more vertices than `$T$` entries and **collide**
- `$\oplus$` is bitwise exclusive or; a shared entry receives the gradients of every vertex hashed to it, and the other levels and the network tell the colliding points apart


---

## What the hash grid changes

<div class="tex" style="font-size:0.8em" role="img" aria-label="one configuration:  L = 16,  F = 2,  T = 2¹⁹ entries per level
                    (the paper's range: T from 2¹⁴ to 2²⁴)
table parameters    at most 16 × 2¹⁹ × 2 = 16,777,216
the MLP             a few thousand
2D, N_min = 16 → N_max = 2048, dense where (N_l + 1)² ≤ 2¹⁹:
the first 12 levels (16 … 561) dense;  the last 4 (776 … 2048) hashed">
\[
\begin{gathered}
\begin{aligned}
&\text{one configuration:} && L = 16,\ F = 2,\ T = 2^{19} \text{ entries per level} \\
& && \text{(the paper's range: } T \text{ from } 2^{14} \text{ to } 2^{24}) \\
&\text{table parameters} && \text{at most } 16 \times 2^{19} \times 2 = 16{,}777{,}216 \\
&\text{the MLP} && \text{a few thousand}
\end{aligned} \\[8pt]
\text{2D, } N_{\min} = 16 \to N_{\max} = 2048, \text{ dense where } (N_l + 1)^2 \le 2^{19}\text{:} \\
\text{the first 12 levels } (16 \ldots 561) \text{ dense; the last 4 } (776 \ldots 2048) \text{ hashed}
\end{gathered}
\]
</div>

- most parameters sit in the **tables**, and each pixel touches only 4 entries per level: training updates a tiny fraction of them per step
- the high frequencies come from the fine grids, not from sines, so the MLP can be very small
- the paper's result: "training of high-quality neural graphics primitives in a matter of seconds, and rendering in tens of milliseconds at a resolution of 1920 × 1080"


---

## The papers, 2019 to 2022

| Year | Paper | What it added |
| ---- | ----- | ------------- |
| 2019 | Rahaman et al., ICML, arXiv:1806.08734 | spectral bias: networks learn low frequencies first |
| 2020 | Mildenhall et al., ECCV, arXiv:2003.08934 | NeRF (neural radiance fields), with positional encoding of coordinates |
| 2020 | Tancik et al., NeurIPS, arXiv:2006.10739 | Fourier features; `$\sigma$` as the kernel's bandwidth |
| 2020 | Sitzmann et al., NeurIPS, arXiv:2006.09661 | SIREN: sine activations and their initialization |
| 2022 | Müller et al., *ACM TOG* 41(4), DOI 10.1145/3528223.3530127 | Instant NGP: multiresolution hash encoding |
