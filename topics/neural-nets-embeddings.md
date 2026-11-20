<!--
  CSS 551 · TOPIC DECK · Neural networks and embeddings (the core, ~62 min, 37 content slides).
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
  EDIT 2026-11-18 (Marcel asked for a demonstration that mini-batch noise can escape a local minimum): the
           mini-batch slide separates backpropagation (computes
           a gradient) from stochastic descent (each step's batch, its own loss surface); "the noise even helps escape poor
           minima" replaced by a hedged bullet, backed in the note by optim-lab's "escaping a minimum" view (65 of 100 runs at
           B = 1, eta0 = 0.2; none at full batch; numbers held by lib/tests/programs/optim-lab.test.mjs).
  DEMOS:   data-demo="forward-pass" (demo-full, "A forward pass, by hand"; self-contained, lib/demos/forward-pass.js);
           data-demo="mlp-fit" data-controls="epochs,hidden" (demo-full);
           data-demo="optim-lab" data-controls="view:optimizers" (demo-full, after the optimizers slide);
           data-demo="attention-lab" data-controls="view:query.one" (demo-full, after the cost of attention);
           data-demo="embed-map" data-controls="highlight" (demo-full; reads lib/assets/mnist/mlp-denoiser.bin).
  FIGURES: ../../textbook/figures/nn-*.svg|png (computed by tools/gen-textbook-figures.mjs).
  NUMBERS: every value is recomputed by tools/gen-lecture-figures-d1.mjs
           (lectures/L17-diffusion-1/analysis/numbers-d1.json) and agrees with
           textbook/figures/numbers.json; the rest are quoted from textbook/neural-nets-embeddings.html.
  Replaces, for Plan C, the networks half of topics/archive/learned-images-foundations.md (archived).

  POLISHED 2026-11-19 (Marcel: "let's apply the formula and illustration polish we used in previous
           lectures"): every formula typeset (MathJax, the ASCII kept as aria-label); new generated figures
           nn-conv-one-output, nn-cosine and nn-onehot-lookup (tools/gen-lecture-figures-neural.mjs, ASCII as
           alt); the small figures set beside their text at a readable size. Every number recomputed.
  RE-SEQUENCED 2026-11-19 (Marcel: "review l15. is the sequence of topics optimal? are we using concepts before
           they are analyzed?", then "proceed ... keep an eye out for dense slides and split them into more manageable
           ones"): new slide "The gradient, by the chain rule" (the product for w1, each factor labeled; the other three
           derivatives are the chain cut short), so the hand step no longer uses postulated derivatives;
           "Backpropagation through layers" moved up to follow the hand step (the mini-batch slide cites it; the
           learning-rate, mini-batch and optimizer slides now sit together before the optim-lab exhibit whose three
           tabs they are). Defined where first used: epoch (the learning-rate slide), the per-example loss, MNIST,
           one-hot and logits (the loss slide), the attention dimension d, latent (the autoencoder slide; the cost of
           attention points ahead to it), the activation sigma in the backward rule; "CLIP's text encoder" no longer
           named before CLIP. Split for density: the hand step (gradients | update), mini-batches (mini-batches |
           epochs and iterations), optimizers (momentum | Adam), the loss (choosing it | worked), convolution
           (layer | one output), attention (definition | worked), embeddings (embeddings | cosine), the contrastive
           loss (batch of two | temperature), the autoencoder (definition and figure | what the latent keeps).
           New statements, all checked: the momentum gain 1/(1 - beta) = 10; Adam's first step eta times the sign; the cross-entropy gradient (-0.341, 0.242, 0.099); w1 = 1.0 - 0.1(0.0976)
           = 0.9902; 60,000 / 128 = 468.75, so 469 iterations.

  INTRO AND DEMO 2026-11-19 (Marcel: "take some inspiration from https://mriquestions.com/what-is-a-neural-network.html when introducing NN. the illustrations are better", "make our illustration tabbed: neurons, 1D function -> 1D network, 3D -> 5D network, a single neuron vs artificial neuron, activations, etc.", "the by hand slide could be interactive ... allow 1 or 2 layers, 1D/2D input, 1D output, feed-forward only", "lay out the numbers so the matrix interpretation becomes obvious", "make all vectors columns, and transpose when needed", "define any and all acronyms on first use"):
           "A network is a function" carries six figure tabs (lib/fig-tabs.js): neurons, a neuron beside an artificial
           neuron, R to R (the perceptron beside its output as b2 plus four S-curves), R^3 to R^5 (143 weights, per layer
           n m + m), one layer as a matrix (row j of W is node j's incoming weights), four activations (values at 0.9 marked);
           nn-intro-*.svg from tools/gen-lecture-figures-neural.mjs. The nonlinearity slide shows the same four activations
           as its table. "A forward pass, by hand" is the forward-pass demo (lib/demos/forward-pass.js; its test
           lib/tests/forward-pass.test.mjs holds 0.9, 0.1, 0.7163, 0.0997, 0.6132 and the 1-2-2-1 network's 0.3345).
           Columns throughout: "The same pass, as matrices" writes W1 (2 x 1), b1 and a as columns and the output as w2^T a;
           the embedding lookup is E (64 x 11) times one-hot(3) = column 3. Acronyms defined, and each Greek letter named in
           parentheses, at first use in this file ("greek letters should get the pronounciation in parens when first introduced").
           Adam (from a pasted note on its m and v): m named the first moment (momentum's velocity as an average: which way),
           v the second moment (mean of g^2, not the momentum slide's velocity: its RMS says how steep or noisy); the slide split
           in two ("Optimizers: Adam" | "Adam: one step size per weight"), 37 content slides.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Display math is a raw <div class="tex"> block typeset by MathJax (lib/deck-math.js;
  TeX inside, the ASCII form as aria-label, no blank line inside); inline math is a code span written
  `$...$`. Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Demo embeds live on
  demo-full slides (a short ## title + the embed div + its viz-fallback pre).
  Paths are relative to the lecture page (lectures/LNN-slug/index.html).
-->

### Neural networks and embeddings

<small>(~60 min) · reading: <a href="../../textbook/neural-nets-embeddings.html">Neural Networks and Embeddings</a>, Sections 1 to 8</small>


---

## A network is a function

A **neural network** is a function from `$\mathbb{R}^n$` to `$\mathbb{R}^m$` built from **artificial neurons**: each takes a weighted sum of its inputs, adds a bias and applies a fixed **nonlinearity**. Its **weights** `$\theta$` (theta) set its shape.

<div class="fig-tabs">
<figure data-label="Neurons"><img src="../../textbook/figures/nn-intro-neurons.svg" alt="three columns of nerve cells: each cell body sends its axon to the right, and the axon's terminals end on the dendrites of cells in the next column (synapses)"><figcaption>A neuron sums the signals on its dendrites and, past a threshold, fires along its axon to the next neurons.</figcaption></figure>
<figure data-label="Neuron vs artificial neuron"><img src="../../textbook/figures/nn-intro-neuron.svg" alt="left: a neuron with dendrites, cell body, axon and terminals; right: an artificial neuron, inputs x1, x2, x3 times weights w1, w2, w3, plus a bias b, summed, passed through an activation sigma to the output y = sigma(w1 x1 + w2 x2 + w3 x3 + b)"><figcaption>The same plan: weighted inputs (the dendrites), a sum <code>$\Sigma$</code> (capital sigma) and an activation <code>$\sigma$</code> (sigma) (the cell body), one output (the axon).</figcaption></figure>
<figure data-label="ℝ → ℝ"><img src="../../textbook/figures/nn-intro-1d.svg" alt="the perceptron with one input x, four hidden tanh units and one output f; beside it, f plotted over x from -2 to 2 as b2 plus four scaled S-curves, one per hidden unit"><figcaption><code>$f(x) = b_2 + \sum_{h=1}^{H} w2_h \tanh(w1_h x + b1_h)$</code>, tanh the hyperbolic tangent: <code>$3H + 1$</code> weights, and a graph that is a sum of <code>$H$</code> shifted, stretched S-curves.</figcaption></figure>
<figure data-label="ℝ³ → ℝ⁵"><img src="../../textbook/figures/nn-intro-3d5d.svg" alt="a fully connected network: 3 inputs, three hidden layers of 6 nodes, 5 outputs; weights per layer 3*6+6 = 24, 6*6+6 = 42, 42, 6*5+5 = 35; 143 in all"><figcaption>Every node takes every output of the layer before; a layer from <code>$n$</code> to <code>$m$</code> nodes has <code>$n m + m$</code> weights.</figcaption></figure>
<figure data-label="One layer"><img src="../../textbook/figures/nn-intro-layer.svg" alt="a layer from 3 inputs to 4 nodes; node z2's three incoming weights w21, w22, w23 are row 2 of the 4 by 3 matrix W in z = W x + b"><figcaption>Node <code>$j$</code>'s incoming weights are row <code>$j$</code> of <code>$W$</code>, so a whole layer is <code>$z = W x + b$</code>, then <code>$a = \sigma(z)$</code>.</figcaption></figure>
<figure data-label="Activations"><img src="../../textbook/figures/nn-intro-activations.svg" alt="sigmoid, tanh, ReLU and SiLU plotted for z from -4 to 4, with each curve's value at z = 0.9 marked by a dot"><figcaption>Sigmoid, tanh, ReLU (rectified linear unit) and SiLU (sigmoid linear unit); the dots mark each one's value at <code>$z = 0.9$</code>.</figcaption></figure>
</div>


---

<!-- .slide: class="demo-full" -->

## A forward pass, by hand

<div data-demo="forward-pass"><pre class="viz-fallback">  H = 2 hidden units, one input, tanh; every vector is a column
  x = 0.4    W1 = (1.0, −1.0)ᵀ    b1 = (0.5, 0.5)ᵀ    wᵀ = (0.8  −0.6)    b = 0.1
  step 1   z1 = 1.0 · 0.4 + 0.5 = 0.9          row 1 of W1 times x, plus b1,1
  step 2   z2 = (−1.0) · 0.4 + 0.5 = 0.1       row 2 of W1 times x, plus b1,2
  step 3   a = tanh(z): tanh 0.9 = 0.7163, tanh 0.1 = 0.0997
  step 4   f = 0.8 · 0.7163 + (−0.6) · 0.0997 + 0.1 = 0.6132
  buttons: inputs 1 | 2, hidden layers 1 | 2, step, back, all; every weight and input is an editable box</pre></div>


---

## The same pass, as matrices

Every vector is a **column**, and a row is written as a transpose. The hidden layer's weights form the `$2 \times 1$` matrix `$W_1$`; the output weights are the row `$w_2^T$`:

<div class="tex" style="font-size:0.85em" role="img" aria-label="z = W₁ x + b₁ = [1.0; −1.0] · 0.4 + [0.5; 0.5] = [0.9; 0.1]
a = tanh(z) = [tanh 0.9; tanh 0.1] = [0.7163; 0.0997]
f = w₂ᵀ a + b₂ = [0.8  −0.6] [0.7163; 0.0997] + 0.1 = 0.6132      ([p; q] is a column)">
\[
\begin{aligned}
z &= W_1\, x + b_1 = \begin{pmatrix} 1.0 \\ -1.0 \end{pmatrix} 0.4 + \begin{pmatrix} 0.5 \\ 0.5 \end{pmatrix} = \begin{pmatrix} 0.9 \\ 0.1 \end{pmatrix} \\[6pt]
a &= \tanh(z) = \begin{pmatrix} \tanh 0.9 \\ \tanh 0.1 \end{pmatrix} = \begin{pmatrix} 0.7163 \\ 0.0997 \end{pmatrix} \\[6pt]
f &= w_2^T a + b_2 = \begin{pmatrix} 0.8 & -0.6 \end{pmatrix} \begin{pmatrix} 0.7163 \\ 0.0997 \end{pmatrix} + 0.1 = 0.6132
\end{aligned}
\]
</div>

- a **batch** of `$B$` inputs is the `$1 \times B$` matrix `$X$`, one input per column: `$Z = W_1 X + b_1$` evaluates all `$B$` at once
- a layer from `$n$` inputs to `$m$` outputs is an `$m \times n$` matrix and `$m$` biases: **`$n m + m$`** weights, **`$n m$`** multiply-adds per input


---

## The nonlinearity: without it, one matrix

A composition of linear maps is linear, so without the squash a network of any depth is **one matrix**.

<img src="../../textbook/figures/nn-intro-activations.svg" class="media-shot" style="height: 230px;" alt="sigmoid, tanh, ReLU and SiLU plotted for z from -4 to 4, each one's value at z = 0.9 marked by a dot">

| activation | value at 0.9 | slope at 0.9 | used in |
| ---------- | ------------ | ------------ | ------- |
| sigmoid | 0.711 | 0.206 | probabilities, gates |
| tanh | 0.716 | 0.487 | small networks, the perceptron |
| ReLU `$\max(0, z)$` | 0.900 | 1 | most deep networks since 2012 |
| SiLU `$z\,\sigma(z)$` | 0.640 | 0.896 | the course denoiser, diffusion networks |


---

## Training is gradient descent

Given examples `$(x_i, y_i)$`, define a **loss** and move every weight a little **downhill**:

<div class="tex" role="img" aria-label="L(θ) = (1/N) Σᵢ ( f_θ(xᵢ) − yᵢ )²              mean squared error
θ  ←  θ − η ∇L(θ)                              η: the learning rate">
\[
\begin{aligned}
L(\theta) &= \tfrac{1}{N} \textstyle\sum_i \big( f_\theta(x_i) - y_i \big)^2 &&\qquad \text{mean squared error} \\
\theta &\leftarrow \theta - \eta\, \nabla L(\theta) &&\qquad \eta\text{: the learning rate}
\end{aligned}
\]
</div>

- `$\nabla L$` (nabla L, the gradient) is the direction in weight space that **increases** the loss fastest; step the other way
- `$\eta$` (eta) sets the step length; too large a step diverges (the pitfall, a few slides on)
- the gradient comes from the **chain rule**, organized as one backward sweep: **backpropagation** (Rumelhart, Hinton & Williams, *Nature* 323, 1986)


---

## The gradient, by the chain rule

For one example the loss is `$L = (f - y)^2$`. A weight reaches the loss through a chain of steps, and its derivative is the **product** of the steps' derivatives. For an input weight:

<div class="tex" role="img" aria-label="∂L/∂w1ₕ = ∂L/∂f · ∂f/∂aₕ · ∂aₕ/∂zₕ · ∂zₕ/∂w1ₕ = δ · w2ₕ · (1 − aₕ²) · x
δ = 2(f − y);  w2ₕ the output weight;  1 − aₕ² the tanh slope;  x the input">
\[
\frac{\partial L}{\partial w1_h}
= \underbrace{\frac{\partial L}{\partial f}}_{\delta \,=\, 2(f - y)}
\cdot \underbrace{\frac{\partial f}{\partial a_h}}_{w2_h}
\cdot \underbrace{\frac{\partial a_h}{\partial z_h}}_{1 - a_h^2}
\cdot \underbrace{\frac{\partial z_h}{\partial w1_h}}_{x}
\]
</div>

The other three weights are the same chain, cut short:

<div class="tex" role="img" aria-label="∂L/∂b₂ = δ      ∂L/∂w2ₕ = δ·aₕ      ∂L/∂b1ₕ = δ·w2ₕ·(1 − aₕ²)">
\[ \frac{\partial L}{\partial b_2} = \delta, \qquad \frac{\partial L}{\partial w2_h} = \delta\, a_h, \qquad \frac{\partial L}{\partial b1_h} = \delta\, w2_h\, (1 - a_h^2) \]
</div>

- the slope is `$\tanh' = 1 - \tanh^2 = 1 - a_h^2$`; every factor except `$\delta$` was computed on the forward pass
- `$\delta$` (delta) is computed once and passed **backward**: through the output weights, then the tanh slopes, to the input weights


---

## One gradient step: the gradients

Continue the forward pass with the target `$y = 0.3$`: error `$f - y = 0.3132$`, loss 0.0981, `$\delta = 2(f - y) = 0.6265$`.

| gradient | computed as | value |
| -------- | ----------- | ----- |
| `$\partial L / \partial b_2$` | `$\delta$` | 0.6265 |
| `$\partial L / \partial w2$` | `$\delta\, a$` = 0.6265 · (0.7163, 0.0997) | `$(0.4487,\ 0.0624)$` |
| `$1 - a^2$` | (1 − 0.5131, 1 − 0.0099) | `$(0.4869,\ 0.9901)$` |
| `$\partial L / \partial b1$` | `$\delta\, w2\, (1 - a^2)$` = 0.6265 · (0.8 · 0.4869, −0.6 · 0.9901) | `$(0.2440,\ {-0.3722})$` |
| `$\partial L / \partial w1$` | the row above times `$x = 0.4$` | `$(0.0976,\ {-0.1489})$` |

- `$1 - a^2$` is the tanh slope; 0.4869 is the activations table's "slope at 0.9": the first unit's gradient is halved, the second's barely damped


---

## One gradient step: the update

Step every weight against its gradient with `$\eta = 0.1$`, then run the forward pass again:

<div class="tex" style="font-size:0.86em" role="img" aria-label="w1₁ = 1.0 − 0.1·0.0976 = 0.9902, and so on for every weight:
w1 = (0.9902, −0.9851)   b1 = (0.4756, 0.5372)
w2 = (0.7551, −0.6062)   b2 = 0.0374
forward again:        f = 0.4814,  loss 0.0329   (was 0.0981)">
\[
\begin{aligned}
&\text{step } \theta \leftarrow \theta - 0.1\, \nabla && w1_1 = 1.0 - 0.1 \cdot 0.0976 = 0.9902, \text{ and so on:} \\
& && w1 = (0.9902,\ {-0.9851}),\ \ b1 = (0.4756,\ 0.5372) \\
& && w2 = (0.7551,\ {-0.6062}),\ \ b2 = 0.0374 \\[4pt]
&\text{forward again} && f = 0.4814,\ \ \text{loss } \mathbf{0.0329}\ \ (\text{was } 0.0981)
\end{aligned}
\]
</div>

- one step closed **42 %** of the gap to the target and cut the loss to **a third**
- the sign of every change came from the chain rule; nobody decided which weight to raise


---

## Backpropagation through layers

One rule, applied once per layer from the top down. With `$\delta^{(k)} = \partial L / \partial z^{(k)}$` at layer `$k$` and `$\sigma$` the layer's activation, the error from above is pulled back through `$W^T$` and multiplied by the slope:

<div class="tex" style="font-size:0.76em" role="img" aria-label="δ⁽ᵏ⁾ = ( W⁽ᵏ⁺¹⁾ᵀ δ⁽ᵏ⁺¹⁾ ) ⊙ σ′(z⁽ᵏ⁾)     error from above, through Wᵀ, times the slope
∂L/∂W⁽ᵏ⁾ = δ⁽ᵏ⁾ a⁽ᵏ⁻¹⁾ᵀ        ∂L/∂b⁽ᵏ⁾ = δ⁽ᵏ⁾">
\[
\begin{aligned}
\delta^{(k)} &= \big( {W^{(k+1)}}^{T} \delta^{(k+1)} \big) \odot \sigma'\big(z^{(k)}\big) \\
\partial L / \partial W^{(k)} &= \delta^{(k)}\, {a^{(k-1)}}^{T}, \qquad \partial L / \partial b^{(k)} = \delta^{(k)}
\end{aligned}
\]
</div>

- the perceptron is two layers: `$\delta^{(2)} = 2(f - y)$`, then `$\delta^{(1)}_h = w2_h\, \delta^{(2)} (1 - a_h^2)$`, the chain rule slide's product
- each weight's gradient is **the error arriving at its output** times **the activation at its input**; the backward pass is **one matrix multiply per layer**
- automatic differentiation (PyTorch's `backward()`) records the forward pass as a graph and walks it in reverse: exactly this sweep, for any composition


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

The one number that can make training fail outright. The wave fit, `$H = 12$`, 300 **epochs** (an epoch is one pass over the training set; with all 12 points in every step, one step):

| `$\eta$` | loss after 300 epochs |
| - | --------------------- |
| 0.05 | 0.019 |
| 0.3 | not a number |
| 1.0 | not a number |

- a step that overshoots the valley lands **higher** on the far wall; the next gradient is larger, the next step larger still
- symptom: a loss that **rises**, then becomes NaN, not a number (here after 225 epochs at `$\eta = 0.3$`, after 122 at `$\eta = 1.0$`)
- cures: a smaller `$\eta$`, a schedule that decays it, or an optimizer that bounds each step (Adam, adaptive moment estimation, below)


---

## Mini-batches

The true gradient averages over all `$N$` examples; a **mini-batch** of `$B$` random examples estimates it, a Monte Carlo estimate (`$\ell_i$`: example `$i$`'s loss):

<div class="tex" style="font-size:0.9em" role="img" aria-label="g_batch = (1/B) Σ_(i in batch) ∇ℓᵢ      unbiased, noise ∝ 1/√B   (the Monte Carlo estimator)
B = 1, 16, 256:   noise 1, 0.25, 0.0625 relative to one example">
\[
\begin{gathered}
g_{\text{batch}} = \tfrac{1}{B} \textstyle\sum_{i \in \text{batch}} \nabla \ell_i \qquad \text{unbiased; noise} \propto 1/\sqrt{B} \\[6pt]
B = 1,\ 16,\ 256: \quad \text{noise } 1,\ 0.25,\ 0.0625 \text{ (relative to one example)}
\end{gathered}
\]
</div>

- each step descends **its own batch's loss**, a different surface every step; on average, the full loss. Backpropagation computes the gradient of whichever loss it is given
- small batches: noisy but cheap steps; the noise can carry the weights out of a poor minimum, with no guarantee. Large batches: smooth steps, better GPU use


---

## Epochs and iterations

- an **iteration** is one step: one batch, one gradient, one update
- an **epoch** is one pass over the training set, `$N / B$` iterations

| training run | batch | count |
| ------------ | ----- | ----- |
| MNIST (Modified National Institute of Standards and Technology): 60,000 handwritten digits | `$B = 128$` | 60,000 / 128 ≈ **469** iterations per epoch |
| the course's denoiser | `$B = 512$` | 41,210 steps × 512 = 21.1 million examples = **351.7** epochs |

- the approximator's batch is all 12 points: there an epoch **is** one step, so the pitfall's 300 epochs were 300 steps


---

## Optimizers: momentum

Plain gradient descent crawls where the loss is flat and zig-zags across narrow valleys. **Momentum** keeps a running velocity `$v$`:

<div class="tex" role="img" aria-label="momentum   v ← βv + g,            θ ← θ − ηv                        β ≈ 0.9">
\[ v \leftarrow \beta v + g, \qquad \theta \leftarrow \theta - \eta\, v \qquad (\beta \approx 0.9) \]
</div>

- `$g$` is this step's gradient; `$v$` sums the recent ones, each step older weighted by one more factor `$\beta$` (beta)
- gradients that agree from step to step **add up**: a constant gradient grows `$v$` to `$g / (1 - \beta) = 10\, g$`
- gradients that alternate **cancel**: the zig-zag across a valley damps out


---

## Optimizers: Adam

**Adam** (Kingma & Ba 2015, arXiv:1412.6980) keeps two running averages per weight, of the gradient and of its square:

<div class="tex" style="font-size:0.82em" role="img" aria-label="Adam       m ← β₁m + (1−β₁)g,     v ← β₂v + (1−β₂)g²
           θ ← θ − η · m̂ / (√v̂ + ε)          β₁ = 0.9, β₂ = 0.999, ε = 10⁻⁸
           m̂ = m/(1−β₁ᵗ),  v̂ = v/(1−β₂ᵗ)       bias corrections for the zero start">
\[
\begin{aligned}
m &\leftarrow \beta_1 m + (1 - \beta_1)\, g, \qquad v \leftarrow \beta_2 v + (1 - \beta_2)\, g^2 \\
\theta &\leftarrow \theta - \eta\, \hat m \,/\, \big(\sqrt{\hat v} + \epsilon\big) \qquad (\beta_1 = 0.9,\ \beta_2 = 0.999,\ \epsilon = 10^{-8}) \\
\hat m &= m / (1 - \beta_1^{\,t}), \quad \hat v = v / (1 - \beta_2^{\,t}) \qquad \text{(bias corrections for the zero start)}
\end{aligned}
\]
</div>

- `$m$`, the **first moment**, a running mean of `$g$`: momentum's velocity as an average; it says **which way** to move, with the zig-zags averaged out
- `$v$`, the **second moment**, a running mean of `$g^2$` (not the previous slide's velocity): squaring drops the sign, so `$\sqrt{\hat v}$` is the gradient's typical size, its root mean square (RMS); it says **how steep or noisy** the ground is


---

## Adam: one step size per weight

Each weight's step is its direction over its own typical size:

<div class="tex" role="img" aria-label="Δθ = − η · m̂ / ( √v̂ + ε )        which way, over how steep or noisy">
\[ \Delta\theta = -\eta\, \frac{\hat m}{\sqrt{\hat v} + \epsilon} \qquad \frac{\text{which way}}{\text{how steep or noisy}} \]
</div>

- `$\Delta\theta$` (delta theta) is the change of one weight; `$\epsilon$` (epsilon) only prevents a division by zero
- large or noisy gradients get **smaller** steps, small and steady ones **larger**: one `$\eta$` serves layers whose gradients differ by orders of magnitude
- the first step: `$\hat m = g$` and `$\hat v = g^2$`, so each weight moves by `$\eta$` times the **sign** of its gradient


---

<!-- .slide: class="demo-full" -->

## Descent, momentum and Adam, live

<div class="cockpit" data-demo="optim-lab" data-controls="view:optimizers"><pre class="viz-fallback">  one start, three optimizers on a loss surface: gradient descent, momentum (beta = 0.9), Adam
  curved valley, loss after 60 steps:  descent 0.4399, momentum 0.0056, Adam 0.0050
  zig-zag bowl, after 40 steps:        descent 0.0717, momentum 0.0118, Adam 0.347
  tab Descent, a bowl with curvatures 1 and 4 (limit eta = 2/4 = 0.5):
    eta 0.02 still far after 100 steps; 0.40 converges; 0.45 overshoots and converges; 0.60 diverges
  tab Minibatch: the gradient's noise against the batch size; escaping a minimum (one sine unit):
    from the slow wave, batches of 1 escape in 65 of 100 runs, full batch in none</pre></div>


---

## Capacity, and smoothness between the examples

- **capacity**: with enough units a network approximates any continuous function on a bounded domain (Cybenko 1989; Hornik 1991); each tanh unit is a smooth step at x = −b1/w1
- **smoothness**: between two training points a trained network draws a smooth curve, not a jump to the nearer one

<img src="../../textbook/figures/nn-capacity-and-lookup.svg" class="media-shot" style="max-height: 215px;" alt="left: step target fitted with 2, 12 and 40 hidden units; right: the same twelve wave points answered by a nearest-example staircase and by the network">

- a **lookup table** has the first property trivially and the second not at all; the right panel is the whole argument of the diffusion lecture


---

## Overfitting, and the held-out set

A network large enough to trace any curve traces the **noise** too. The wave at 12 points, noise `$\sigma = 0.15$` (variance 0.0225); held-out error against the true wave on 150 points (**weight decay**: each step also shrinks every weight a little):

<img src="../../textbook/figures/nn-overfit.svg" class="media-shot" style="max-height: 195px;" alt="training error dashed and held-out error solid against epoch for H = 4, H = 40, and H = 40 with weight decay">

| network, 5000 epochs | training error | held-out error |
| -------------------- | -------------- | -------------- |
| `$H = 40$` | 0.0057 (a quarter of the noise floor) | minimum 0.0099 at epoch 950, then 0.0108 |
| `$H = 40$`, weight decay `$\lambda = 0.002$` (lambda) | 0.0124 | **0.0080** |
| `$H = 4$` | | 0.0164 (too little capacity) |


---

## Choosing the loss

- **regression** (predict numbers, such as a denoised image): mean squared error
- **classification** (predict one of `$K$` classes): the network outputs `$K$` scores, the **logits** `$z$`; **softmax** turns them into probabilities (positive, summing to 1) and **cross-entropy** scores the right class

<div class="tex" role="img" aria-label="softmax(z)ₖ = exp(zₖ) / Σⱼ exp(zⱼ)          cross-entropy = −log p(right class)">
\[ \operatorname{softmax}(z)_k = \frac{e^{z_k}}{\sum_j e^{z_j}} \qquad\qquad \text{cross-entropy} = -\log p_{\text{right class}} \]
</div>

- the target written as a vector is **one-hot**: 1 for the right class, 0 elsewhere (class 0 of 3 is (1, 0, 0))
- the gradient of cross-entropy with respect to the logits is simply `$p - \text{onehot}$`


---

## Softmax and cross-entropy, worked

<div class="tex" role="img" aria-label="logits z = (2, 1, 0.1)
softmax  = (0.659, 0.242, 0.099)
loss if the right class is 0:  −log 0.659 = 0.417
loss if the right class is 2:  −log 0.099 = 2.317
gradient if the right class is 0:  p − onehot = (−0.341, 0.242, 0.099)">
\[
\begin{aligned}
&\text{logits } z = (2,\ 1,\ 0.1) && \operatorname{softmax}(z) = (0.659,\ 0.242,\ 0.099) \\
&\text{loss if the right class is 0} && -\log 0.659 = 0.417 \\
&\text{loss if the right class is 2} && -\log 0.099 = 2.317 \\
&\text{gradient if the right class is 0} && p - (1, 0, 0) = ({-0.341},\ 0.242,\ 0.099)
\end{aligned}
\]
</div>

- cross-entropy punishes a **confident wrong** answer hard: 2.317 against 0.417
- the gradient raises the right logit and lowers the others, each in proportion to its probability


---

## Convolution

A **convolutional layer** slides one small kernel `$K$` over the image (`$\sigma$`: the activation, here ReLU):

<div class="tex" role="img" aria-label="y_ij = σ( b + Σ_(u,v) K_uv · x_(i+u, j+v) )">
\[ y_{ij} = \sigma\Big( b + \sum_{u,v} K_{uv}\, x_{i+u,\, j+v} \Big) \]
</div>

- the nine weights of a 3×3 kernel are **shared by every position**: ten parameters instead of millions
- a pattern learned in one place is found **everywhere**

<img src="../../textbook/figures/nn-conv-feature.png" class="media-shot" style="height:200px; image-rendering:pixelated; display:block; margin:0.3em auto 0;" alt="the digit 3, its convolution with the vertical-edge kernel, and the feature map after ReLU">
<span class="credit">a digit · its convolution with a vertical-edge kernel · the map after ReLU</span>


---

## One convolution output, worked

<img src="../../textbook/figures/nn-conv-one-output.svg" style="height:330px; display:block; margin:0.2em auto;" alt="one output of the vertical-edge kernel [−1 0 1; −2 0 2; −1 0 1] at pixel (12, 15), whose neighborhood is three rows of (0.99, 0.29, 0):
−1(0.99) + 0(0.29) + 1(0)  −2(0.99) + 0 + 0  −1(0.99) + 0 + 0  =  −3.96     after ReLU: 0">

- ink on the left, paper on the right: the kernel answers **−3.96** and the ReLU silences it; the mirrored kernel answers +3.96
- this kernel was written by hand; a trained network's first layer ends up with kernels like it, found by the gradient


---

## Attention

For a set of vectors `$x_1 \dots x_n$` (words, image patches), each gets a query `$q_i = W_q x_i$`, a key `$k_i = W_k x_i$` and a value `$v_i = W_v x_i$`, with **learned** matrices `$W_q, W_k, W_v$`:

<div class="tex" role="img" aria-label="yᵢ = Σⱼ αᵢⱼ vⱼ,      αᵢⱼ = softmaxⱼ( qᵢ·kⱼ / √d )">
\[ y_i = \sum_j \alpha_{ij}\, v_j, \qquad \alpha_{ij} = \operatorname{softmax}_j\!\Big( \frac{q_i \cdot k_j}{\sqrt{d}} \Big) \]
</div>

- each output is an average of **all** the values, with weights `$\alpha_{ij}$` (alpha) set by how well its query matches each key; `$d$` is the length of the query and key vectors
- the weights depend on the **data**, not only on position; every vector can look at every other in one layer


---

## Attention, worked: three tokens

Three tokens in 2D: `$x = (1, 0),\ (0, 1),\ (1, 1)$`; `$W_q = W_k = I$`; `$W_v = \begin{bmatrix} 0.5 & 1 \\ 1 & 0.5 \end{bmatrix}$`, so the values are (0.5, 1), (1, 0.5), (1.5, 1.5).

| query | scores `$q_i \cdot k_j / \sqrt{2}$` | weights `$\alpha_{ij}$` | output `$y_i$` |
| ----- | ------------------------------------- | ------------------------ | ---------------- |
| token 3 | (0.707, 0.707, 1.414) | (0.248, 0.248, 0.503) | (1.128, 1.128) |
| token 1 | (0.707, 0, 0.707) | (0.401, 0.198, 0.401) | (1.000, 1.102) |

- token 1 attends to itself and to token 3, which shares its first coordinate, and least to token 2, which shares nothing


---

## The cost of attention

Every token scores every other token: `$n$` tokens make **`$n^2$`** scores per head per layer.

| tokens `$n$` | scores `$n^2$` | |
| ------------ | -------------- | - |
| 256 | 65,536 | |
| 1,024 | 1,048,576 | a 512 × 512 image cut into 16 × 16 patches |
| 4,096 | 16,777,216 | |

- quadrupling the image area quadruples `$n$` and multiplies the attention cost by **16**
- that is why image transformers work on **patches** or on a compressed **latent** (an autoencoder's code, a few slides on), never on raw pixels


---

<!-- .slide: class="demo-full" -->

## Attention, live

<div class="cockpit" data-demo="attention-lab" data-controls="view:query.one"><pre class="viz-fallback">  the slide's three tokens in 2D: x = (1, 0), (0, 1), (1, 1); W_q = W_k = I; W_v = [0.5 1; 1 0.5]
  click a token to make it the query; drag a token; a temperature on the scores
  token 3: scores (0.707, 0.707, 1.414), alpha (0.248, 0.248, 0.503), y3 = (1.128, 1.128)
  token 1: scores (0.707, 0, 0.707), alpha (0.401, 0.198, 0.401), y1 = (1.000, 1.102)
  tabs: why sqrt d; every token (the n x n weights, order and a position code); cross-attention;
  the cost (n = 1,024 for 512 x 512 in 16 x 16 patches: 1,048,576 scores, 4 MiB (mebibytes) per head per layer)</pre></div>


---

## Transformers, and cross-attention

- a **transformer** (Vaswani et al. 2017, arXiv:1706.03762): attention layers alternating with small fully connected layers, over a sequence of tokens with a **positional encoding** (sines and cosines of each token's position) added so that order survives
- the architecture of the text encoders that read captions (CLIP, at the end of this topic), of the language models, and since 2023 of the largest diffusion models, which cut an image into patches and treat them as tokens
- **cross-attention**: the same formula with queries from one set (image tokens) and keys and values from another (the caption's tokens); it is how a caption steers an image model


---

## Embeddings

An **embedding** maps each thing (a word, a digit, an image) to a vector in `$\mathbb{R}^d$`, **learned** so that things that behave alike land near each other.

- nobody places the points: a network puts them where its task goes better
- word vectors trained only to predict neighboring words support "king − man + woman ≈ queen" (Mikolov et al. 2013, arXiv:1301.3781)
- "near" is measured by direction: the **cosine** of the angle between two vectors


---

## Cosine similarity

<div class="tex" style="font-size:0.8em" role="img" aria-label="cos(u, v) = u·v / (‖u‖ ‖v‖)  ∈ [−1, 1]
u = (3, 4, 0), v = (4, 3, 0), w = (−4, 3, 0), all of length 5
cos(u, v) = 24/25 = 0.96     nearly the same direction
cos(u, w) = 0/25  = 0        unrelated">
\[
\begin{gathered}
\cos(u, v) = \frac{u \cdot v}{\lVert u \rVert\, \lVert v \rVert} \in [-1,\ 1] \\[4pt]
u = (3, 4, 0),\ v = (4, 3, 0),\ w = ({-4}, 3, 0)\text{, all of length 5} \\
\cos(u, v) = 24/25 = 0.96, \qquad \cos(u, w) = 0/25 = 0
\end{gathered}
\]
</div>

<img src="../../textbook/figures/nn-cosine.svg" style="height:270px; display:block; margin:0.2em auto 0;" alt="u = (3, 4) and v = (4, 3) 16.3° apart, cosine 0.96, nearly the same direction; w = (−4, 3) at 90° to u, cosine 0, unrelated; all of length 5">

- 1: the same direction, 0: unrelated, −1: opposite; cosine ignores length, so embeddings are usually normalized and only direction carries meaning


---

## An embedding table is a linear layer

A class label as a **one-hot** column, times `$E$`, picks out **one column**:

<img src="../../textbook/figures/nn-onehot-lookup.svg" style="height:270px; display:block; margin:0.2em auto;" alt="one-hot(3) = (0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0)ᵀ, a column: 11 classes (10 digits + &quot;no class&quot;)
E · one-hot(3)  =  column 3 of E                      E is 64 × 11: 704 weights">

- "embedding lookup" is a linear layer applied to a one-hot input, implemented as indexing
- trained by the same gradient as every other weight; only the looked-up column gets one
- this 64 × 11 table (stored as 11 rows of 64) is the course denoiser's class embedding, the vectors of the embedding exhibit ahead


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

An **encoder** E maps a thing to its embedding; a **decoder** D maps an embedding back. Trained together through a narrow middle, `$\min \sum_i \lVert D(E(x_i)) - x_i \rVert^2$`, they form an **autoencoder** (Hinton & Salakhutdinov, *Science* 313, 2006). The vector in the middle is the **code**, or **latent**.

<img src="../../textbook/figures/nn-autoencoder-clip.svg" style="height:320px; display:block; margin:0.3em auto 0;" alt="top: an autoencoder with a narrow code in the middle; bottom: an image encoder and a text encoder mapping into one shared space">


---

## What the latent keeps

- only the code crosses the middle: edges, colors and layout survive, sensor noise does not
- Stable Diffusion's autoencoder: a 512×512×3 image (786,432 numbers) becomes a 64×64×4 latent (16,384), **48 times fewer**
- the diffusion lectures run the whole generative process in that small space


---

## Two encoders, one space: CLIP

**CLIP** (Contrastive Language-Image Pre-training) trains an image encoder `$E_I$` and a text encoder `$E_T$` side by side on hundreds of millions of (image, caption) pairs so that a matching pair has a higher cosine than every mismatched one:

<div class="tex" role="img" aria-label="L = − Σᵢ log  exp( cos(E_I(xᵢ), E_T(tᵢ)) / τ )  /  Σⱼ exp( cos(E_I(xᵢ), E_T(tⱼ)) / τ )">
\[ L = -\sum_i \log \frac{\exp\!\big( \cos(E_I(x_i),\, E_T(t_i)) / \tau \big)}{\sum_j \exp\!\big( \cos(E_I(x_i),\, E_T(t_j)) / \tau \big)} \]
</div>

- **contrastive** training; `$\tau$` (tau) is a temperature (Radford et al. 2021, arXiv:2103.00020)
- afterwards a sentence and a photograph are vectors in **the same space**: "aim the picture at this caption" becomes geometry
- a CLIP embedding of a caption is the condition every text-to-image model reads


---

## The contrastive loss on a batch of two

Cosines between two images (rows) and two captions (columns), matches on the diagonal. Row 1 is a softmax over its cosines divided by `$\tau$`:

<div class="tex" style="font-size:0.86em" role="img" aria-label="S = [ 0.8  0.2 ]     τ = 0.1, row 1:  e⁸ = 2981.0  vs  e² = 7.39
    [ 0.1  0.7 ]       p(right caption) = 2981.0 / 2988.3 = 0.9975,   loss 0.0025
                     τ = 1,   row 1:  p = e^0.8 / (e^0.8 + e^0.2) = 0.646,   loss 0.437">
\[
\begin{gathered}
S = \begin{bmatrix} 0.8 & 0.2 \\ 0.1 & 0.7 \end{bmatrix} \\[8pt]
\begin{aligned}
&\tau = 0.1\text{, row 1:} && e^{8} = 2981.0 \text{ vs } e^{2} = 7.39 \\
& && p = 2981.0 / 2988.3 = 0.9975,\ \text{loss } 0.0025 \\
&\tau = 1\text{, row 1:} && p = e^{0.8} / (e^{0.8} + e^{0.2}) = 0.646,\ \text{loss } 0.437
\end{aligned}
\end{gathered}
\]
</div>

- the gradient pushes `$S_{11}$`, `$S_{22}$` up and the off-diagonal down; the only way to move a cosine is to move the vectors


---

## The temperature

- the same cosines, 0.8 against 0.2: at `$\tau = 1$` the right caption gets 0.646, at `$\tau = 0.1$` 0.9975
- the temperature turns a small cosine margin into a decisive one; CLIP **learns** `$\tau$` and ends near 0.01

<img src="../../textbook/figures/nn-temperature.svg" style="height:340px; display:block; margin:0.3em auto 0;" alt="probability of the right caption and loss against temperature for the same cosines">
