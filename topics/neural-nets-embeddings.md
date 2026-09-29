<!--
  CSS 551 · TOPIC DECK · Neural networks and embeddings (~88 min).
  A topic is a reusable stretch of slides that a lecture page mounts as one
  <section data-markdown="../../topics/neural-nets-embeddings.md"> among others; it carries no
  session logistics (no title, Thursday, homework, wrap) and no "Part N" numbering.
  See topics/README.md for the contract.

  TEACHES: a network is a function (the perceptron; a forward pass by hand); why the nonlinearity; training
  as gradient descent; backpropagation for the perceptron and one step by hand; the approximator exhibit;
  the learning-rate pitfall; backpropagation through two hidden layers (the delta rule, worked) and the
  vanishing gradient; momentum and Adam (the first Adam step worked); capacity, smoothness between the
  examples, overfitting and the held-out set; convolution (one output worked) and attention (three tokens
  worked); embeddings and cosine similarity; the embedding exhibit and why digit arithmetic fails;
  encoders, decoders, autoencoders; CLIP's contrastive loss worked, and its temperature; the papers.
  NEEDS:   vectors and dot products (the vectors topic). Nothing about images or diffusion.
           Companion of topics/image-space.md and topics/diffusion-1.md (the lectures after it); this
           deck names "the approximator exhibit" and "the embedding exhibit", and diffusion-1 refers
           back to "smooth between the examples".
  DEMOS:   data-demo="mlp-fit" data-controls="epochs,hidden" (demo-full);
           data-demo="embed-map" data-controls="highlight" (demo-full; reads lib/assets/mnist/mlp-denoiser.bin).
  FIGURES: ../../textbook/figures/nn-*.svg|png (computed by tools/gen-textbook-figures.mjs).
  NUMBERS: every value is recomputed by tools/gen-lecture-figures-d1.mjs
           (lectures/L16-diffusion-1/analysis/numbers-d1.json) and agrees with
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

<small>(~88 min)</small>


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

## Why the nonlinearity

A composition of linear maps is linear, so without the squash a network of any depth is **one matrix**.

<img src="../../textbook/figures/nn-activations.svg" class="media-shot" style="max-height: 230px;" alt="five activation functions plotted: sigmoid, tanh, ReLU, SiLU, GELU">

| activation | value at 0.9 | slope at 0.9 | used in |
| ---------- | ------------ | ------------ | ------- |
| sigmoid | 0.711 | 0.206 | probabilities, gates |
| tanh | 0.716 | 0.487 | small networks, the perceptron |
| ReLU `max(0, z)` | 0.900 | 1 | most deep networks since 2012 |
| SiLU `z·σ(z)` | 0.640 | 0.896 | the course denoiser, diffusion U-Nets |


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

- one step took the output a third of the way to the target; the sign of every change came from the chain rule


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
- symptom: a loss that **rises**, then becomes NaN within a few dozen iterations
- cures: a smaller η, a schedule that decays it, or an optimizer that bounds each step (Adam, below)


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

## Two hidden layers, worked

Keep layer 1; add `W2 = [0.6 −0.4; 0.3 0.9]`, `b2 = (0, −0.2)`, output `w3 = (0.8, −0.6)`, `b3 = 0.1`; tanh everywhere; x = 0.4, y = 0.3.

```text
   forward   a1 = (0.7163, 0.0997)   z2 = (0.3899, 0.1046)   a2 = (0.3713, 0.1042)
             f = 0.1 + 0.8·0.3713 − 0.6·0.1042 = 0.3345        loss 0.0012
   δ3        2(f − y) = 0.0690
   δ2        0.0690·(0.8, −0.6) ⊙ (1 − a2²)
             = 0.0690·(0.8, −0.6) ⊙ (0.8621, 0.9891)            = (0.0476, −0.0410)
   ∂/∂W2     δ2 a1ᵀ = [ 0.0341  0.0047 ; −0.0293  −0.0041 ]
   δ1        W2ᵀδ2 = (0.0163, −0.0559),  ⊙ (0.4869, 0.9901)  = (0.0079, −0.0553)
   ∂/∂W1     δ1 · x = (0.0032, −0.0221)
   after one step (η = 0.1):  f = 0.3126,  loss 0.0002
```

- the deepest weights got the **smallest** gradients: δ was scaled by w3, then by W2, and by a tanh slope below 1 at every layer


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
- AdamW (weight decay applied directly) is the default for the diffusion models and transformers of the coming lectures; the course's denoiser was trained with Adam


---

## Adam's first step, worked

Apply Adam with η = 0.01 to the seven gradients of the hand step:

```text
   g = (0.0976, −0.1489, 0.2440, −0.3722, 0.4487, 0.0624, 0.6265)
   t = 1:   m̂ = g,   v̂ = g²   ⇒   update = η · g / |g| = ±0.01   in every coordinate

   gradient              0.0624      0.6265
   gradient descent      0.0006      0.0063      (η = 0.01)
   Adam                  0.0100      0.0100
```

<img src="../../textbook/figures/nn-optimizers.svg" class="media-shot" style="max-height: 200px;" alt="training loss against epoch for gradient descent, momentum and Adam on the wave fit">

- the first Adam step is a step of length η along the **sign** of the gradient; a step can never exceed about η, whatever the gradient


---

## Capacity, and smoothness between the examples

- **capacity**: with enough units a network approximates any continuous function on a bounded domain (Cybenko 1989; Hornik 1991); each tanh unit is a smooth step at x = −b1/w1
- **smoothness**: between two training points a trained network draws a smooth curve, not a jump to the nearer one

<img src="../../textbook/figures/nn-capacity-and-lookup.svg" class="media-shot" style="max-height: 215px;" alt="left: step target fitted with 2, 12 and 40 hidden units; right: the same twelve wave points answered by a nearest-example staircase and by the network">

- a **lookup table** has the first property trivially and the second not at all; the right panel is the whole argument of the diffusion lecture


---

## Overfitting, and the held-out set

A network large enough to trace any curve traces the **noise** too. The wave at 12 points, noise σ = 0.15 (variance 0.0225); held-out error against the true wave on 150 points:

<img src="../../textbook/figures/nn-overfit.svg" class="media-shot" style="max-height: 230px;" alt="training error dashed and held-out error solid against epoch for H = 4, H = 40, and H = 40 with weight decay">

| network, 5000 epochs | training error | held-out error |
| -------------------- | -------------- | -------------- |
| H = 40 | 0.0057 (a quarter of the noise floor) | minimum 0.0099 at epoch 950, then 0.0108 |
| H = 40, weight decay λ = 0.002 | 0.0124 | **0.0080** |
| H = 4 | | 0.0164 (too little capacity) |


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

## Transformers, and cross-attention

- a **transformer** (Vaswani et al. 2017, arXiv:1706.03762): attention layers alternating with small fully connected layers, over a sequence of tokens with a **positional encoding** added so that order survives
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

<!-- .slide: class="demo-full" -->

## The embedding exhibit

<div class="cockpit" data-demo="embed-map" data-controls="highlight"><pre class="viz-fallback">  the ten class embeddings (64 numbers each) inside the course's trained
  digit denoiser, projected onto their two principal axes (18 % + 18 % of the variance)
  drag highlight: lines to the digit's three nearest classes, cosines in the
  readout computed in all 64 dimensions. Nearest neighbors:
  4 → 9 (0.54),  3 → 5 (0.52),  7 → 9 (0.48),  2 → 3 (0.39)
  the 1 shares strokes with nothing and is far from everything</pre></div>


---

## Embedding arithmetic, and what it does not do

Try the word trick on the digit vectors:

```text
   e₄ − e₉ + e₇   nearest class other than the operands: 2 (cos 0.31);   among all: 7 (0.75)
   e₃ − e₅ + e₈   nearest class other than the operands: 9 (cos 0.24);   among all: 8 (0.68)
```

- the result stays near its last operand; the digit space has no "subtract a loop, add a stroke" direction
- nothing in the denoising task needed one, and **eleven points in 64 dimensions are too few to define directions**
- embedding arithmetic is a property of a **trained space with many relations**, not of embeddings as such
- the eleventh vector, "no class", has length 2.19 against 3.85 to 5.15 for the digits: a short vector near the middle of the cloud, which is what a mean is


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


---

## The papers

| Year | Paper | What it added |
| ---- | ----- | ------------- |
| 1986 | Rumelhart, Hinton & Williams, *Nature* 323 | backpropagation |
| 1989 / 1991 | Cybenko, *Math. Control Signals Systems* 2; Hornik, *Neural Networks* 4 | universal approximation |
| 1998 | LeCun, Bottou, Bengio & Haffner, *Proc. IEEE* 86 | convolutional networks trained end to end, on these digits |
| 2006 | Hinton & Salakhutdinov, *Science* 313 | deep autoencoders |
| 2013 | Mikolov et al., arXiv:1301.3781 | word embeddings that support arithmetic |
| 2015 | Kingma & Ba, arXiv:1412.6980 | Adam |
| 2015 | He et al., arXiv:1512.03385 | skip connections (ResNet) |
| 2017 | Vaswani et al., arXiv:1706.03762 | the transformer |
| 2021 | Radford et al., arXiv:2103.00020 | CLIP: text and images in one space |

