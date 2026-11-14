<!--
  CSS 551 · TOPIC DECK · Neural networks and embeddings (the core, ~60 min, 24 content slides).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/neural-nets-embeddings.md"> among others; it carries no
  session logistics (no title, Thursday, homework, wrap) and no "Part N" numbering.
  See topics/README.md for the contract.

  GOALS: a network is a function whose weights are set by gradient descent on a loss, executable by hand
    (every later lecture defines a loss and descends); the vocabulary the later lectures use without
    re-deriving it (softmax, mini-batch, Adam, overfitting, convolution, attention, embedding, encoder,
    decoder, latent, CLIP).
  OUTCOMES (students can): compute a small tanh network's forward pass and count a layer's weights
    (n·m + m), and say why without a nonlinearity it is one matrix; compute one gradient step by hand
    (δ = 2(f − y), the four derivatives, the update from the old weights); predict how hidden units,
    epochs and the learning rate change a fit, and that a trained network is smooth between its examples
    and unconstrained outside them; tell overfitting from training and held-out error; describe the
    backward rule, what a mini-batch estimates and what Adam changes; compute a softmax and one attention
    row and state attention's n² cost; compute a cosine and read nearest neighbors in an embedding;
    define encoder, decoder and latent, and compute one row of CLIP's contrastive loss.
  CUT 2026-11-13 (Marcel: review of next week's lectures, goals and outcomes): the core keeps the slides
    the outcomes need; "Choosing the loss" moved next to attention, its first use; the rest moved, in
    order, to neural-nets-embeddings-supplement.md (after the wrap); the embedding exhibit stays. "The step, in code" deleted (Marcel:
    "pull them": it was HW7 Part 1's solution). Corrected: the gradient step closes 42 % of the gap (the
    loss falls to a third); two layers worked no longer claims the first layer's gradients are the smallest
    (unit 2's grew); NaN after 225 and 122 epochs, not "a few dozen"; the 1's nearest neighbor is weak,
    not "far from everything"; terms used before their slide glossed (weight decay, positional encoding).
  TEACHES (before the cut): a network is a function (the perceptron; a forward pass by hand); why the nonlinearity; training
  as gradient descent; backpropagation for the perceptron and one step by hand; the approximator exhibit;
  the learning-rate pitfall; backpropagation through two hidden layers (the delta rule, worked) and the
  vanishing gradient; momentum and Adam (the first Adam step worked); capacity, smoothness between the
  examples, overfitting and the held-out set; convolution (one output worked) and attention (three tokens
  worked); embeddings and cosine similarity; the embedding exhibit and why digit arithmetic fails;
  encoders, decoders, autoencoders; CLIP's contrastive loss worked, and its temperature; the papers.
  DENSIFIED (2026-09-29): the history table (1943 to AlexNet 2012); the denoiser's 1,002,064 weights
  by layer; the pass as matrices; XOR by hand; extrapolation limits (1.5, −1.3); softmax and
  cross-entropy (0.659, 0.417); softmax overflow; the numerical gradient check; the step in JS
  and in PyTorch; mini-batches (1/√B; 469 iterations per epoch; 351.7 epochs); vanishing
  gradients in numbers; He initialization; layer norm and residuals; dead ReLUs; three optimizers
  measured; schedules and weight decay (0.368); train/validate/test; conv parameter counts;
  receptive fields; attention's n² cost and code; the sinusoidal time code; the embedding table
  as a linear layer; cosine vs distance; VAEs; zero-shot CLIP; what a network is not; small
  networks in graphics; a second papers table.
  2026-10-05: paced to ~66 min so that topics/coordinate-networks.md (mounted after it in L14) fits;
  the "what a network is not" summary table was cut; positional encoding of coordinates, spectral
  bias, Fourier features and SIREN live in that topic.
  EDIT 2026-10-08: titles without "Why" ("The nonlinearity: without it, one matrix", "Shared weights:
           the parameter count").
  NEEDS:   vectors and dot products (the vectors topic). Nothing about images or diffusion.
           Companion of topics/image-space.md and topics/diffusion-1.md (the lectures after it); this
           deck names "the approximator exhibit" and "the embedding exhibit", and diffusion-1 refers
           back to "smooth between the examples".
  DEMOS:   data-demo="mlp-fit" data-controls="epochs,hidden" (demo-full);
           data-demo="embed-map" data-controls="highlight" (demo-full; reads lib/assets/mnist/mlp-denoiser.bin).
  FIGURES: ../../textbook/figures/nn-*.svg|png (computed by tools/gen-textbook-figures.mjs).
  NUMBERS: every value is recomputed by tools/gen-lecture-figures-d1.mjs
           (lectures/L17-diffusion-1/analysis/numbers-d1.json) and agrees with
           textbook/figures/numbers.json; the rest are quoted from textbook/neural-nets-embeddings.html.
  Replaces, for Plan C, the networks half of topics/archive/learned-images-foundations.md (archived).

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Demo embeds live on
  demo-full slides (a short ## title + the embed div + its viz-fallback pre).
  Paths are relative to the lecture page (lectures/LNN-slug/index.html).
-->

### Neural networks and embeddings

<small>(~60 min) · reading: <a href="../../textbook/neural-nets-embeddings.html">Neural Networks and Embeddings</a>, Sections 1 to 8</small>


---

## A network is a function

A **neural network** is a function `f_θ` from ℝⁿ to ℝᵐ built from alternating **linear maps** and fixed **nonlinearities**; the vector of **weights** θ sets its shape.

```text
   f(x) = b₂ + Σₕ w2ₕ · tanh(w1ₕ · x + b1ₕ)          h = 1 … H,   3H + 1 weights
```

<img src="../../textbook/figures/nn-perceptron.svg" class="media-shot" style="max-height: 250px;" alt="the two-layer perceptron as a wiring diagram with four hidden units: input times weights plus biases, tanh, then a weighted sum">

- read left to right: scale and shift (blue), squash (green), combine (red); nothing else happens
- a **deep** network repeats the middle two stages, with vectors in place of single numbers


---

## A forward pass, by hand

H = 2, weights `w1 = (1.0, −1.0)`, `b1 = (0.5, 0.5)`, `w2 = (0.8, −0.6)`, `b2 = 0.1`; input x = 0.4.

```text
   pre-activations   z = (1.0·0.4 + 0.5,  −1.0·0.4 + 0.5)          = (0.9, 0.1)
   activations       a = (tanh 0.9, tanh 0.1)                       = (0.7163, 0.0997)
   output            f = 0.1 + 0.8·0.7163 − 0.6·0.0997
                       = 0.1 + 0.5730 − 0.0598                       = 0.6132
```

- seven weights, four multiplications, three additions, two table lookups
- the course's digit-drawing network is this table with 512 rows per stage, four stages, 1,002,064 weights


---

## The same pass, as matrices

Stack the hidden units into vectors and the pass is three lines:

```text
   z = W₁ x + b₁          W₁ = (1.0, −1.0)ᵀ,  b₁ = (0.5, 0.5)       z = (0.9, 0.1)
   a = tanh(z)                                                      a = (0.7163, 0.0997)
   f = w₂ · a + b₂        w₂ = (0.8, −0.6),   b₂ = 0.1              f = 0.6132
```

- a **batch** of B inputs is a matrix X with B columns: `Z = W₁ X + b₁` evaluates all B at once
- a layer from n inputs to m outputs has **n·m + m** weights and costs **n·m** multiply-adds per input


---

## The nonlinearity: without it, one matrix

A composition of linear maps is linear, so without the squash a network of any depth is **one matrix**.

<img src="../../textbook/figures/nn-activations.svg" class="media-shot" style="max-height: 230px;" alt="five activation functions plotted: sigmoid, tanh, ReLU, SiLU, GELU">

| activation | value at 0.9 | slope at 0.9 | used in |
| ---------- | ------------ | ------------ | ------- |
| sigmoid | 0.711 | 0.206 | probabilities, gates |
| tanh | 0.716 | 0.487 | small networks, the perceptron |
| ReLU `max(0, z)` | 0.900 | 1 | most deep networks since 2012 |
| SiLU `z·σ(z)` | 0.640 | 0.896 | the course denoiser, diffusion networks |


---

## Training is gradient descent

Given examples (xᵢ, yᵢ), define a **loss** and move every weight a little **downhill**:

```text
   L(θ) = (1/N) Σᵢ ( f_θ(xᵢ) − yᵢ )²              mean squared error
   θ  ←  θ − η ∇L(θ)                              η: the learning rate
```

- ∇L is the direction in weight space that **increases** the loss fastest; step the other way
- the gradient comes from the **chain rule**, organized as one backward sweep: **backpropagation** (Rumelhart, Hinton & Williams, *Nature* 323, 1986)
- for the perceptron, with δ = 2(f − y) and tanh′ = 1 − tanh²:

```text
   ∂L/∂b₂  = δ                        ∂L/∂w2ₕ = δ·aₕ
   ∂L/∂b1ₕ = δ·w2ₕ·(1 − aₕ²)            ∂L/∂w1ₕ = δ·w2ₕ·(1 − aₕ²)·x
```


---

## One gradient step, by hand

Continue the forward pass: target y = 0.3, η = 0.1. Error f − y = 0.3132, loss 0.0981, δ = 0.6265.

```text
   ∂/∂b₂      0.6265
   ∂/∂w2      0.6265 · (0.7163, 0.0997)                         = (0.4487,  0.0624)
   1 − a²     (1 − 0.5131, 1 − 0.0099)                          = (0.4869,  0.9901)
   ∂/∂b1      0.6265 · (0.8·0.4869, −0.6·0.9901)                = (0.2440, −0.3722)
   ∂/∂w1      the row above times x = 0.4                       = (0.0976, −0.1489)

   step θ ← θ − 0.1·∇:   w1 = (0.9902, −0.9851)   b1 = (0.4756, 0.5372)
                         w2 = (0.7551, −0.6062)   b2 = 0.0374
   forward again:        f = 0.4814,  loss 0.0329   (was 0.0981)
```

- one step closed **42 %** of the gap to the target and cut the loss to **a third**; the sign of every change came from the chain rule


---

<!-- .slide: class="demo-full" -->

## The approximator exhibit

<div class="cockpit" data-demo="mlp-fit" data-controls="epochs,hidden"><pre class="viz-fallback">  twelve (x, y) points from a hidden wave; the perceptron
  f(x) = b2 + Σ w2·tanh(w1·x + b1) with 3·hidden + 1 weights
  drag epochs up from 0: full-batch gradient descent runs LIVE, a few steps
  per frame; the random curve bends until it passes through the points
  loss at epochs 0, 20, 100, 400, 3000 (hidden 12): 1.73, 0.105, 0.069, 0.0084, 0.0008
  hidden 2: it cannot bend enough; hidden 40: it fits, smoothly
  buttons: wave · step · bump</pre></div>


---

## Pitfall: the learning rate

The one number that can make training fail outright. The wave fit, H = 12, 300 epochs:

| η | loss after 300 epochs |
| - | --------------------- |
| 0.05 | 0.019 |
| 0.3 | not a number |
| 1.0 | not a number |

- a step that overshoots the valley lands **higher** on the far wall; the next gradient is larger, the next step larger still
- symptom: a loss that **rises**, then becomes NaN (here after 225 epochs at η = 0.3, after 122 at η = 1.0)
- cures: a smaller η, a schedule that decays it, or an optimizer that bounds each step (Adam, below)


---

## Mini-batches and stochastic gradient descent

The true gradient averages over all N examples; a **mini-batch** of B random examples estimates it:

```text
   g_batch = (1/B) Σ_(i in batch) ∇ℓᵢ      unbiased, noise ∝ 1/√B   (the Monte Carlo estimator)

   B        1      16      256
   noise    1      0.25    0.0625      relative to one example

   MNIST, 60,000 images, B = 128:   469 iterations per epoch
   the course's denoiser: 41,210 steps × 512 = 21.1 million examples seen = 351.7 epochs
```

- small batches: noisy but cheap steps (the noise even helps escape poor minima); large batches: smooth steps, better GPU use
- an **epoch** is one pass over the data; an **iteration** is one step


---

## Backpropagation through layers

One rule, applied once per layer from the top down. With δ⁽ᵏ⁾ = ∂L/∂z⁽ᵏ⁾ at layer k:

```text
   δ⁽ᵏ⁾ = ( W⁽ᵏ⁺¹⁾ᵀ δ⁽ᵏ⁺¹⁾ ) ⊙ σ′(z⁽ᵏ⁾)     error from above, through Wᵀ, times the slope
   ∂L/∂W⁽ᵏ⁾ = δ⁽ᵏ⁾ a⁽ᵏ⁻¹⁾ᵀ        ∂L/∂b⁽ᵏ⁾ = δ⁽ᵏ⁾
```

- each weight's gradient is **the error arriving at its output** times **the activation at its input**
- the forward pass stores every a; the backward pass is **one matrix multiply per layer**
- automatic differentiation (PyTorch's `backward()`) records the forward pass as a graph and walks it in reverse: exactly this sweep, for any composition


---

## Optimizers: momentum and Adam

Plain gradient descent crawls where the loss is flat and zig-zags across narrow valleys.

```text
   momentum   v ← βv + g,            θ ← θ − ηv                        β ≈ 0.9
   Adam       m ← β₁m + (1−β₁)g,     v ← β₂v + (1−β₂)g²
              θ ← θ − η · m̂ / (√v̂ + ε)          β₁ = 0.9, β₂ = 0.999, ε = 10⁻⁸
              m̂ = m/(1−β₁ᵗ),  v̂ = v/(1−β₂ᵗ)       bias corrections for the zero start
```

- **momentum**: gradients that agree from step to step add up; gradients that alternate cancel
- **Adam** (Kingma & Ba 2015, arXiv:1412.6980): every weight gets its own step size, η divided by the typical size of **that weight's** gradient
- AdamW (Adam plus **weight decay**, a small shrink of every weight at each step) is the default for the diffusion models and transformers of the coming lectures; the course's denoiser was trained with Adam


---

## Capacity, and smoothness between the examples

- **capacity**: with enough units a network approximates any continuous function on a bounded domain (Cybenko 1989; Hornik 1991); each tanh unit is a smooth step at x = −b1/w1
- **smoothness**: between two training points a trained network draws a smooth curve, not a jump to the nearer one

<img src="../../textbook/figures/nn-capacity-and-lookup.svg" class="media-shot" style="max-height: 215px;" alt="left: step target fitted with 2, 12 and 40 hidden units; right: the same twelve wave points answered by a nearest-example staircase and by the network">

- a **lookup table** has the first property trivially and the second not at all; the right panel is the whole argument of the diffusion lecture


---

## Overfitting, and the held-out set

A network large enough to trace any curve traces the **noise** too. The wave at 12 points, noise σ = 0.15 (variance 0.0225); held-out error against the true wave on 150 points (**weight decay**: each step also shrinks every weight a little):

<img src="../../textbook/figures/nn-overfit.svg" class="media-shot" style="max-height: 195px;" alt="training error dashed and held-out error solid against epoch for H = 4, H = 40, and H = 40 with weight decay">

| network, 5000 epochs | training error | held-out error |
| -------------------- | -------------- | -------------- |
| H = 40 | 0.0057 (a quarter of the noise floor) | minimum 0.0099 at epoch 950, then 0.0108 |
| H = 40, weight decay λ = 0.002 | 0.0124 | **0.0080** |
| H = 4 | | 0.0164 (too little capacity) |


---

## Choosing the loss: regression and classification

- **regression** (predict numbers, such as a denoised image): mean squared error
- **classification** (predict one of K classes): turn K scores into probabilities with **softmax**, and score the right class with **cross-entropy**

```text
   softmax(z)ₖ = exp(zₖ) / Σⱼ exp(zⱼ)          cross-entropy = −log p(right class)

   logits z = (2, 1, 0.1)
   softmax  = (0.659, 0.242, 0.099)
   loss if the right class is 0:  −log 0.659 = 0.417
   loss if the right class is 2:  −log 0.099 = 2.317
```

- cross-entropy punishes a **confident wrong** answer hard, and its gradient is simply `p − onehot`


---

## Convolution

A **convolutional layer** slides one small kernel K over the image: `y_ij = σ(b + Σ K_uv · x_(i+u, j+v))`.

- the nine weights of a 3×3 kernel are **shared by every position**: ten parameters instead of millions, and a pattern learned in one place is found everywhere
- one output, worked: the vertical-edge kernel `[−1 0 1; −2 0 2; −1 0 1]` at pixel (12, 15) of a handwritten 3, whose neighborhood is three rows of (0.99, 0.29, 0):

```text
   −1(0.99) + 0(0.29) + 1(0)  −2(0.99) + 0 + 0  −1(0.99) + 0 + 0  =  −3.96     after ReLU: 0
```

<img src="../../textbook/figures/nn-conv-feature.png" class="media-shot" style="max-height: 150px;" alt="the digit 3, its convolution with the vertical-edge kernel, and the feature map after ReLU">


---

## Attention

For a set of vectors x₁ … xₙ (words, image patches), each gets a query `qᵢ = W_q xᵢ`, a key `kᵢ = W_k xᵢ`, a value `vᵢ = W_v xᵢ`:

```text
   yᵢ = Σⱼ αᵢⱼ vⱼ,      αᵢⱼ = softmaxⱼ( qᵢ·kⱼ / √d )
```

Worked, three tokens in 2D: x = (1, 0), (0, 1), (1, 1); `W_q = W_k = I`; `W_v = [0.5 1; 1 0.5]`, so the values are (0.5, 1), (1, 0.5), (1.5, 1.5).

```text
   token 3:  scores (0.707, 0.707, 1.414)   α = (0.248, 0.248, 0.503)   y₃ = (1.128, 1.128)
   token 1:  scores (0.707, 0,     0.707)   α = (0.401, 0.198, 0.401)   y₁ = (1.000, 1.102)
```

- the weights depend on the **data**, not only on position; every vector can look at every other in one layer


---

## The cost of attention

Every token scores every other token: n tokens make **n²** scores per head per layer.

```text
   n = 256       65,536 scores
   n = 1,024     1,048,576          a 512 × 512 image cut into 16 × 16 patches
   n = 4,096     16,777,216
```

- quadrupling the image area quadruples n and multiplies the attention cost by **16**
- that is why image transformers work on **patches** or on a compressed **latent** (the next diffusion lecture), never on raw pixels


---

## Transformers, and cross-attention

- a **transformer** (Vaswani et al. 2017, arXiv:1706.03762): attention layers alternating with small fully connected layers, over a sequence of tokens with a **positional encoding** (sines and cosines of each token's position) added so that order survives
- the architecture of CLIP's text encoder, of the language models, and since 2023 of the largest diffusion models, which cut an image into patches and treat them as tokens
- **cross-attention**: the same formula with queries from one set (image tokens) and keys and values from another (the caption's tokens); it is how a caption steers an image model


---

## Embeddings

An **embedding** maps each thing (a word, a digit, an image) to a vector in ℝᵈ, **learned** so that things that behave alike land near each other. Similarity is the cosine:

```text
   cos(u, v) = u·v / (‖u‖ ‖v‖)  ∈ [−1, 1]
   u = (3, 4, 0), v = (4, 3, 0), w = (−4, 3, 0), all of length 5
   cos(u, v) = 24/25 = 0.96     nearly the same direction
   cos(u, w) = 0/25  = 0        unrelated
```

- cosine ignores length; embeddings are usually normalized and only direction carries meaning
- nobody places the points: a network puts them where its task goes better. Word vectors trained only to predict neighboring words support "king − man + woman ≈ queen" (Mikolov et al. 2013, arXiv:1301.3781)


---

## An embedding table is a linear layer

A class label as a **one-hot** vector times a matrix E picks out **one row**:

```text
   one-hot(3) = (0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0)       11 classes (10 digits + "no class")
   one-hot(3) · E  =  row 3 of E                          E is 11 × 64: 704 weights
```

- "embedding lookup" is a linear layer applied to a one-hot input, implemented as indexing
- its rows are trained by the same gradient as every other weight: only the looked-up row gets a gradient on each example
- this 11 × 64 table is the course denoiser's class embedding, the vectors of the embedding exhibit ahead


---

<!-- .slide: class="demo-full" -->

## The embedding exhibit

<div class="cockpit" data-demo="embed-map" data-controls="highlight"><pre class="viz-fallback">  the ten class embeddings (64 numbers each) inside the course's trained
  digit denoiser, projected onto their two principal axes (18 % + 18 % of the variance)
  drag highlight: lines to the digit's three nearest classes, cosines in the
  readout computed in all 64 dimensions. Nearest neighbors:
  4 → 9 (0.54),  3 → 5 (0.52),  7 → 9 (0.48),  2 → 3 (0.39)
  the 1 has the weakest nearest neighbor: 3, at only 0.31</pre></div>


---

## Encoders, decoders, autoencoders

An **encoder** E maps a thing to its embedding; a **decoder** D maps an embedding back. Trained together through a narrow middle, `min Σᵢ ‖D(E(xᵢ)) − xᵢ‖²`, they form an **autoencoder** (Hinton & Salakhutdinov, *Science* 313, 2006).

<img src="../../textbook/figures/nn-autoencoder-clip.svg" class="media-shot" style="max-height: 230px;" alt="top: an autoencoder with a narrow code in the middle; bottom: an image encoder and a text encoder mapping into one shared space">

- only the code crosses the middle: edges, colors and layout survive, sensor noise does not
- Stable Diffusion's autoencoder: a 512×512×3 image (786,432 numbers) becomes a 64×64×4 latent (16,384), **48 times fewer**


---

## Two encoders, one space: CLIP

Train an image encoder `E_I` and a text encoder `E_T` side by side on hundreds of millions of (image, caption) pairs so that a matching pair has a higher cosine than every mismatched one:

```text
   L = − Σᵢ log  exp( cos(E_I(xᵢ), E_T(tᵢ)) / τ )  /  Σⱼ exp( cos(E_I(xᵢ), E_T(tⱼ)) / τ )
```

- **contrastive** training; τ is a temperature. This is CLIP (Radford et al. 2021, arXiv:2103.00020)
- afterwards a sentence and a photograph are vectors in **the same space**: "aim the picture at this caption" becomes geometry
- a CLIP embedding of a caption is the condition every text-to-image model reads


---

## The contrastive loss on a batch of two

Cosines between two images (rows) and two captions (columns), matches on the diagonal:

```text
   S = [ 0.8  0.2 ]     τ = 0.1, row 1:  e⁸ = 2981.0  vs  e² = 7.39
       [ 0.1  0.7 ]       p(right caption) = 2981.0 / 2988.3 = 0.9975,   loss 0.0025
                        τ = 1,   row 1:  p = e^0.8 / (e^0.8 + e^0.2) = 0.646,   loss 0.437
```

<img src="../../textbook/figures/nn-temperature.svg" class="media-shot" style="max-height: 210px;" alt="probability of the right caption and loss against temperature for the same cosines">

- the temperature turns a small cosine margin into a decisive one; CLIP **learns** τ and ends near 0.01
- the gradient pushes S₁₁, S₂₂ up and the off-diagonal down; the only way to move a cosine is to move the vectors
