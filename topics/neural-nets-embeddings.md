<!--
  CSS 551 · TOPIC DECK · Neural networks and embeddings (~88 min, 52 content slides).
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
  DENSIFIED (2026-09-29): the history table (1943 to AlexNet 2012); the denoiser's 1,002,064 weights
  by layer; the pass as matrices; XOR by hand; extrapolation limits (1.5, −1.3); softmax and
  cross-entropy (0.659, 0.417); softmax overflow; the numerical gradient check; the step in JS
  and in PyTorch; mini-batches (1/√B; 469 iterations per epoch; 351.7 epochs); vanishing
  gradients in numbers; He initialization; layer norm and residuals; dead ReLUs; three optimizers
  measured; schedules and weight decay (0.368); train/validate/test; conv parameter counts;
  receptive fields; attention's n² cost and code; the sinusoidal time code; the embedding table
  as a linear layer; cosine vs distance; VAEs; zero-shot CLIP; what a network is not; small
  networks in graphics; a second papers table.
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

## Where networks came from

| year | who | what |
| ---- | --- | ---- |
| 1943 | McCulloch & Pitts | a neuron as a threshold on a weighted sum |
| 1958 | Rosenblatt, *Psychological Review* 65 | the perceptron, with a learning rule |
| 1969 | Minsky & Papert, *Perceptrons* | one layer cannot compute XOR; interest collapses |
| 1986 | Rumelhart, Hinton & Williams, *Nature* 323 | backpropagation trains hidden layers |
| 1989 | LeCun et al., *Neural Computation* 1 | a convolutional network reads handwritten zip codes |
| 2012 | Krizhevsky, Sutskever & Hinton, NeurIPS | AlexNet: ImageNet top-5 error 15.3 % against 26.2 % for the runner-up |

- AlexNet was trained on **two consumer graphics cards** (GTX 580); the hardware this course renders with is the hardware that made deep learning practical


---

## A network is matrix multiplies

The course's digit denoiser, layer by layer (weights and biases):

```text
   class embedding   11 × 64                         704
   layer 1           512 × (400 + 64 + 64) + 512     270,848     image + time + class
   layer 2           512 × 512 + 512                 262,656
   layer 3           512 × 512 + 512                 262,656
   output            400 × 512 + 400                 205,200
   total                                            1,002,064
```

- one forward pass ≈ **one million multiply-adds**; a 30-step sample ≈ **30 million**
- a GPU is built for exactly this: the same multiply-add over large arrays, which is what vertex and fragment shading also are


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

## What one layer cannot do: XOR

XOR is 1 when exactly one input is 1. No single line separates {(0,1), (1,0)} from {(0,0), (1,1)}, so no single threshold unit computes it. Two hidden units do:

```text
   h₁ = step(x₁ + x₂ − 0.5)       "at least one"
   h₂ = step(x₁ + x₂ − 1.5)       "both"
   y  = step(h₁ − h₂ − 0.5)       "at least one, but not both"

   x₁ x₂ | h₁ h₂ | y
    0  0 |  0  0 | 0
    0  1 |  1  0 | 1
    1  0 |  1  0 | 1
    1  1 |  1  1 | 0
```

- the hidden layer **re-describes** the input so that the output's single line suffices
- this is the 1969 objection, answered by one hidden layer; it was the training, not the capacity, that was missing until 1986


---

## Outside the data: networks do not extrapolate

A tanh saturates at ±1, so far from the data every hidden unit is a constant:

```text
   the hand network:   f(x) = 0.1 + 0.8 tanh(x + 0.5) − 0.6 tanh(−x + 0.5)
   x → +∞:   0.1 + 0.8·(+1) − 0.6·(−1) = 1.5
   x → −∞:   0.1 + 0.8·(−1) − 0.6·(+1) = −1.3
```

- a trained network is reliable **between** its examples and **flat** (tanh) or **linear** (ReLU) beyond them
- the wave fit knows nothing about the wave outside [−1, 1]; asked there, it answers with confidence anyway


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

## Pitfall: softmax overflows

```text
   logits (1000, 999)
   naive:     exp(1000) = Infinity in double precision  →  Infinity / Infinity = NaN
   stable:    subtract the maximum: exp(0), exp(−1)  →  (0.731, 0.269)     the same answer
   wrong fix: divide by 1000: softmax(1, 0.999) = (0.50025, 0.49975)   a different answer
```

- softmax is unchanged by adding a constant to every logit; subtracting the maximum makes the largest exponent 0
- the same **log-sum-exp** trick appears in the exact denoiser of the diffusion lecture, where the logits reach −1700


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

## Check the gradient numerically

Every hand-derived or hand-coded gradient gets tested against a finite difference:

```text
   ∂L/∂b₂ ≈ ( L(b₂ + h) − L(b₂ − h) ) / (2h),     h = 10⁻⁴

   central difference     0.626475
   analytic δ = 2(f − y)  0.626475          agree to 10⁻¹⁰
   a bug (the 2 dropped)  0.313237          off by a factor of two: the check catches it
```

- central differences have error O(h²); compare with a **relative** tolerance
- check a few random weights of a real network the same way before trusting a training run


---

## The step, in code

```js
// the 1-2-1 tanh perceptron: forward, backward, one step (x = 0.4, y = 0.3, eta = 0.1)
const W1 = [1, -1], B1 = [0.5, 0.5], W2 = [0.8, -0.6]; let B2 = 0.1;
function step(x, y, eta) {
  const a = W1.map((w, h) => Math.tanh(w * x + B1[h]));        // forward
  const f = B2 + a.reduce((s, ah, h) => s + W2[h] * ah, 0);
  const d = 2 * (f - y);                                        // dL/df
  for (let h = 0; h < 2; h++) {                                 // backward, then update
    const dz = d * W2[h] * (1 - a[h] * a[h]);                   // uses the OLD W2[h]
    W2[h] -= eta * d * a[h];
    B1[h] -= eta * dz;
    W1[h] -= eta * dz * x;
  }
  B2 -= eta * d;
  return (f - y) ** 2;
}
step(0.4, 0.3, 0.1);   // loss 0.0981; the next call's forward pass gives f = 0.4814
```

- the order matters: **compute every gradient from the old weights** before changing any (dz above reads W2[h] before it is updated)


---

## The same step, in PyTorch

```python
import torch
net = torch.nn.Sequential(torch.nn.Linear(1, 2), torch.nn.Tanh(), torch.nn.Linear(2, 1))
opt = torch.optim.SGD(net.parameters(), lr=0.1)

x, y = torch.tensor([[0.4]]), torch.tensor([[0.3]])
loss = ((net(x) - y) ** 2).mean()     # forward: records the computation graph
opt.zero_grad()
loss.backward()                       # backward: fills .grad of every parameter
opt.step()                            # update: p -= lr * p.grad
```

- `backward()` is the backward sweep of the next slides, generated from the recorded forward pass
- swapping `SGD` for `Adam` or the loss for cross-entropy changes one line


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

## The vanishing gradient, in numbers

Each layer multiplies the backward signal by a weight and by the activation's slope. With slopes below 1:

```text
   slope per layer     5 layers     10 layers     20 layers
   0.5                 0.031        0.00098       0.00000095
   0.487 (tanh at 0.9) 0.027        0.00075       0.00000056
   1 (ReLU, active)    1            1             1
```

- a 20-layer tanh network's first layer learns **a million times** slower than its last
- three fixes, used together in every deep network: **rectifiers**, **careful initialization**, **skip connections** (next slides)


---

## Initialization

Weights start random. Too small and the signal shrinks layer by layer; too large and it explodes.

```text
   He initialization (He et al. 2015, arXiv:1502.01852), for ReLU layers with n inputs:
   w ~ N(0, 2/n)                     keeps the activations' variance constant through depth

   n = 64:     std 0.177
   n = 512:    std 0.0625          the course's hidden layers
   n = 4096:   std 0.0221
```

- the 2 compensates for ReLU zeroing half its inputs; for tanh the rule is 1/n (Glorot & Bengio 2010)
- biases start at **0**; never start all weights **equal** (every unit would compute, and learn, the same thing)


---

## Normalization and skip connections

**Layer normalization** rescales each example's activations to mean 0 and variance 1 (Ba et al. 2016, arXiv:1607.06450), then applies a learned scale and shift:

```text
   activations (2, 4, 6):   mean 4,  std 1.633   →   (−1.225, 0, 1.225)
```

A **residual (skip) connection** adds a layer's input to its output (He et al. 2015, arXiv:1512.03385):

```text
   y = x + F(x)          ∂y/∂x = 1 + F′(x)          the gradient always has the "1" path
```

- normalization keeps every layer's inputs in the range where its slopes are healthy
- skip connections let gradients reach the first layer undiminished; the U-Net and the transformer both rely on them


---

## Pitfall: dead units

A ReLU unit whose pre-activation is **negative for every input** outputs 0 and has gradient 0: it never recovers.

```text
   inputs in [0, 1],  w = 1,  b = −3      z = w·x + b ≤ 1 − 3 = −2 < 0   for every input
   output 0, gradient 0, forever
```

- a large learning-rate step can push many units there at once; the loss stalls with capacity to spare
- symptoms: a large fraction of units that are **exactly zero** on every example
- fixes: smaller steps, He initialization, or activations with a slope below zero (leaky ReLU, SiLU, GELU)


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

## Three optimizers, measured

The wave fit (H = 12) from the same starting weights, loss after each number of epochs:

| epochs | 100 | 300 | 1000 | 3000 |
| ------ | --- | --- | ---- | ---- |
| gradient descent | 0.0690 | 0.0188 | 0.0016 | 0.00079 |
| momentum | **0.0019** | **0.00081** | 0.00066 | 0.00058 |
| Adam | 0.0701 | 0.0080 | **0.00049** | **0.00032** |

- momentum is fastest early on this small, smooth problem; Adam ends lowest
- plain descent gets there too, **thirty times more slowly** at epoch 100
- on large networks with badly scaled layers Adam's per-weight step sizes matter far more than here


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

## Learning-rate schedules

The best step size changes during training: large early, small late.

```text
   warmup:        η rises linearly from 0 over the first few hundred steps
   cosine decay:  η(t) = η₀ · ½ (1 + cos(π t / T))
                  t = 0: η₀      t = T/2: 0.5 η₀      t = 3T/4: 0.146 η₀      t = T: 0
```

- warmup protects Adam's early steps, whose variance estimates are still poor
- the decay lets the final steps settle into a minimum instead of rattling around it
- **weight decay** shrinks every weight each step, θ ← θ − η(g + λθ); with η = 0.1 and λ = 0.002, 5000 steps of decay alone scale a weight by 0.9998⁵⁰⁰⁰ = **0.368**


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

## Train, validate, test

| split | used for | touched |
| ----- | -------- | ------- |
| **training** | computing gradients | every step |
| **validation** | choosing H, η, λ, when to stop | after each epoch |
| **test** | the number you report | **once**, at the end |

- the validation set is overfit **too**, slowly, by every choice made while looking at it; the test set exists to catch that
- **leakage**: a near-duplicate of a test image in the training set (a crop, a resize) makes the test score meaningless
- for generative models the same question returns as **memorization**: is a sample new, or a copy of a training image? (the diffusion lecture measures it)


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

## Why share weights: the parameter count

```text
   a fully connected unit on a 512 × 512 RGB image         786,432 weights, for ONE output
   a 3 × 3 convolution, RGB in, 64 channels out            3·3·3·64 + 64 = 1,792 weights
   a 3 × 3 convolution, 64 channels in, 64 out             3·3·64·64 + 64 = 36,928 weights
```

- the convolution's weights do not grow with the **image size**: the same 1,792 weights run on a 20 × 20 digit or a 4K frame
- **translation equivariance**: shift the input, and the feature map shifts with it
- channels play the role hidden units played: each output channel is one learned feature detector


---

## The receptive field grows with depth

Each 3 × 3 layer lets an output see one more pixel in every direction:

```text
   layers        1     2     5     10
   field         3     5     11    21        pixels across: 2L + 1
```

- stacking small kernels reaches far with few weights: two 3 × 3 layers see 5 × 5 with 18 weights per channel pair instead of 25
- **downsampling** by 2 between stages doubles the reach of every later layer; a few stages see the whole image
- the **U-Net** (Ronneberger et al. 2015): downsample to see globally, upsample back to full resolution, with **skip connections** carrying the fine detail across; the denoiser of the first diffusion models


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

## Attention, in code

```js
// X: n tokens of dimension d (rows). Wq, Wk, Wv: d × d.
function attention(X, Wq, Wk, Wv) {
  const Q = matmul(X, Wq), K = matmul(X, Wk), V = matmul(X, Wv);
  const d = Q[0].length;
  return Q.map((q) => {
    const s = K.map((k) => dot(q, k) / Math.sqrt(d));        // n scores
    const m = Math.max(...s);                                 // the softmax guard
    const e = s.map((v) => Math.exp(v - m)), Z = e.reduce((a, b) => a + b, 0);
    return V[0].map((_, j) => e.reduce((acc, w, i) => acc + (w / Z) * V[i][j], 0));
  });
}
// the worked example: X = [[1,0],[0,1],[1,1]], Wq = Wk = I, Wv = [[0.5,1],[1,0.5]]
// → token 3: (1.128, 1.128);  token 1: (1.000, 1.102)
```


---

## Transformers, and cross-attention

- a **transformer** (Vaswani et al. 2017, arXiv:1706.03762): attention layers alternating with small fully connected layers, over a sequence of tokens with a **positional encoding** added so that order survives
- the architecture of CLIP's text encoder, of the language models, and since 2023 of the largest diffusion models, which cut an image into patches and treat them as tokens
- **cross-attention**: the same formula with queries from one set (image tokens) and keys and values from another (the caption's tokens); it is how a caption steers an image model


---

## How the network is told the time

The diffusion denoiser must know **how much noise** it is looking at. It receives t as a 64-number code of sines and cosines at 32 frequencies:

```text
   angle_i = t · 1000 · 10000^(−i/32)
   code    = (sin angle_0 … sin angle_31, cos angle_0 … cos angle_31)

              i = 0 (fast)       i = 16             i = 31 (slow)
   t = 0.50   (−0.468, −0.884)   (−0.959, 0.284)    (0.067, 0.998)        (sin, cos)
   t = 0.51   ( 0.873,  0.487)   (−0.926, 0.378)    (0.068, 0.998)
```

- the fast frequencies distinguish **nearby** times; the slow ones say roughly **where** in [0, 1] t is
- the same trick encodes **positions** in a transformer and **coordinates** in NeRF (the learned-scenes lecture)


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

## On unit vectors, cosine and distance agree

For normalized u, v: `‖u − v‖² = 2 − 2 cos(u, v)`, so ranking by distance and ranking by cosine give **the same** nearest neighbors.

```text
   cos    ‖u − v‖²    ‖u − v‖
   0.96   0.08        0.283
   0.5    1           1
   0      2           1.414
```

- nearest-neighbor search over millions of embeddings (image search, retrieval) uses this to run on fast Euclidean indexes
- unnormalized vectors break the equivalence: a long vector is "close" to many things by dot product


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

## Variational autoencoders

A plain autoencoder's codes land wherever training puts them, with gaps between; decoding a random code gives garbage. A **VAE** (Kingma & Welling 2013, arXiv:1312.6114) fixes the layout:

```text
   encoder outputs a mean μ and a spread σ;  code z = μ + σ ⊙ ε,  ε ~ N(0, I)
   loss = reconstruction error + KL( N(μ, σ²) ‖ N(0, I) )     pulls codes toward N(0, I)
```

- the code space becomes **dense**: every point near the origin decodes to something plausible
- Stable Diffusion's autoencoder is KL-regularized in this way (lightly), so its 64 × 64 × 4 latents are well behaved for diffusion
- alone, VAE samples are **blurry**: the squared error hedges toward the average, as the image-space lecture's metrics pitfall predicts


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

## Zero-shot classification with CLIP

Classify an image with **no classifier training**: embed a caption per class and pick the closest.

```text
   prompts:   "a photo of a cat",  "a photo of a dog",  "a photo of a car"
   illustrative cosines to one image:   0.31   0.24   0.22

   softmax at τ = 0.01:   (0.999, 0.0009, 0.0001)      decisive
   softmax at τ = 1:      (0.351, 0.328, 0.321)        nearly uniform
```

- CLIP was trained on **400 million** image-text pairs; zero-shot, its largest model matched the ImageNet accuracy of a ResNet-50 trained on ImageNet's labels (76.2 % top-1)
- a new class is **one new sentence**, not a new dataset


---

## What a network is not

| expectation | what the numbers tonight show |
| ----------- | ----------------------------- |
| a database of its examples | smooth **between** the examples, not a lookup (the capacity figure) |
| reliable anywhere | flat beyond the data: the hand network tends to 1.5 and −1.3 |
| calibrated | softmax at a small temperature turns cosines 0.31 vs 0.24 into 0.999 |
| trained by the learning rate you picked | 0.3 diverges where 0.05 fits |
| uses all its units | dead ReLUs, vanishing gradients |

- each row is a failure to plan for when a network sits inside a renderer or a tool


---

## Small networks inside graphics

- **denoisers** for path-traced frames (the previous lecture): a network reads noisy color plus normals, albedo and depth
- **learned upscaling** in games (NVIDIA DLSS, in games from 2019): render at lower resolution, let a network reconstruct the full frame using motion vectors
- **neural radiance fields** (the learned-scenes lecture): a small network (the original paper's weights take about 5 MB) stands in for a whole scene
- **neural texture and material compression**: a small network per material decoded in the shader


---

## The papers, 1986 to 2021

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


---

## The papers, 1958 to 2016

| Year | Paper | What it added |
| ---- | ----- | ------------- |
| 1958 | Rosenblatt, *Psychological Review* 65 | the perceptron and its learning rule |
| 1989 | LeCun et al., *Neural Computation* 1 | convolutional networks trained by backpropagation (zip codes) |
| 2010 | Glorot & Bengio, AISTATS | initialization by fan-in and fan-out |
| 2012 | Krizhevsky, Sutskever & Hinton, NeurIPS | AlexNet: deep convolutional networks on GPUs win ImageNet |
| 2013 | Kingma & Welling, arXiv:1312.6114 | the variational autoencoder |
| 2015 | He et al., arXiv:1502.01852 | He initialization for rectifiers |
| 2015 | Ronneberger, Fischer & Brox, MICCAI | the U-Net |
| 2016 | Ba, Kiros & Hinton, arXiv:1607.06450 | layer normalization |

