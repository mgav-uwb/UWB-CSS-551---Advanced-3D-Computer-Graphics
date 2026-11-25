<!--
  CSS 551 · TOPIC DECK: The space of images, further (~13 min, 4 slides), mounted after the lecture's wrap, time
  permitting. Cut 2026-11-24 from topics/image-space.md (L16) (Marcel: "PCA, eigenvalues, hilbert spaces... way
  over the math level of the class. can the following lectures use less math?"): the distance as an integral,
  principal components and eigenfaces, in the topic's order. Nothing graded depends on them.
  NEEDS: topics/image-space.md.
  NUMBERS: as in that topic's header (textbook/figures/numbers.json digitPcaExplained); the integral recomputed
           in node (¼, 30°, ¼ − 1/(4n²)).
  reveal.js: FLAT; notes follow "Note:" and stay plain text; never two "_" on one markdown line outside a code
  fence.
-->

### Supplement: the space of images, further

<small>(~13 min, time permitting) · reading: <a href="../../textbook/image-space.html">The Space of Images</a></small>


---

## The distance as an integral

f = mid-gray (½, ½, ½); g = the ramp (u, u, u). With integrals in place of sums over pixels:

```text
   ⟨f, g⟩ = ∫∫ f(u,v)·g(u,v) du dv            the dot product, summed over the whole square
   ‖f − g‖² = ∫₀¹∫₀¹ 3 (½ − u)² du dv = 3 ∫₀¹ (¼ − u + u²) du = 3 (¼ − ½ + ⅓) = 3 · 1/12 = ¼
   ‖f − g‖ = ½         ⟨f, g⟩ = ¾,  ‖f‖ = √3/2,  ‖g‖ = 1   ⇒   cos θ = √3/2,  θ = 30°

   on n columns sampled at their centers:  ¼ − 1/(4n²)        a Riemann sum of the integral
```

- every tool of the finite view carries over with sums replaced by integrals: lengths, distances, angles θ (theta), projections


---

<!-- .slide: class="demo-full" -->

## Keep the k × k lowest frequencies, live

<div class="cockpit" data-demo="dct-lab" data-controls="view:lowpass"><pre class="viz-fallback">  keep only the k x k lowest-frequency cosine weights, rebuild, compare (PSNR against k)
  the edge: k = 1 gives 7.96 dB, k = 2 gives 16.30 dB, k = 4 is exact</pre></div>


---

## Principal components: the data's own basis

The cosine basis is fixed in advance. **PCA** (principal component analysis) finds the basis that fits **this** data: the eigenvectors of its covariance, in order of variance.

```text
   four points (2, 0), (0, 1), (−2, 0), (0, −1): mean 0
   covariance  [2  0; 0  0.5]      eigenvectors: the x and y axes
   variance explained: 2 / 2.5 = 80 %,   0.5 / 2.5 = 20 %

   the 2,000 digits in ℝ⁴⁰⁰: first two components 10.4 % and 7.4 %
```

- the first component is the direction of **greatest spread**; each later one the greatest spread perpendicular to the earlier ones
- PCA is a **linear** encoder; the learned encoders of the networks lecture are its nonlinear generalization


---

## Eigenfaces

Turk and Pentland (1991) ran PCA on aligned face photographs:

- each principal component, displayed as an image, is a ghostly face: an **eigenface**
- a new face is described by its coordinates on the top few dozen eigenfaces instead of by its pixels
- recognition becomes **nearest neighbor** among those short coordinate vectors

It worked on aligned, frontal, evenly lit faces and failed under changes of pose and light: a **linear** subspace cannot follow a **curved** sheet. Learned embeddings replaced it.
