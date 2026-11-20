<!--
  CSS 551 · TOPIC DECK: Neural networks and embeddings, further (~40 min, 28 slides), mounted after the lecture's
  wrap, time permitting. Cut 2026-11-13 from topics/neural-nets-embeddings.md (L15): the slides the core does
  not build on, in the topic's order. Numbers: as in that topic's header (tools/gen-lecture-figures-d1.mjs,
  textbook/figures/numbers.json).
  NEEDS: topics/neural-nets-embeddings.md.
  POLISHED 2026-11-19 (Marcel: "let's apply the formula and illustration polish we used in previous lectures"):
  every formula typeset, the ASCII kept as aria-label.
  reveal.js: FLAT; notes follow "Note:" and stay plain text; never two "_" on one markdown line outside a code
  fence or code span.
  Display math is a raw <div class="tex"> block typeset by MathJax (lib/deck-math.js; TeX inside, the ASCII form
  as aria-label, no blank line inside); inline math is a code span written `$...$`.
  ACRONYMS 2026-11-19 (Marcel: "remember to define any and all acronyms on first use"): each acronym is spelled
           out at its first use in this file, slides and notes alike; citation venues (ICML, NeurIPS, ECCV, ACM TOG)
           and product names stay as names. Each Greek letter is named in parentheses at its first use (Marcel: "greek
           letters should get the pronounciation in parens when first introduced").
-->

### Supplement: neural networks, further

<small>(~40 min, time permitting) · reading: <a href="../../textbook/neural-nets-embeddings.html">Neural Networks and Embeddings</a></small>


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

<div class="tex" style="font-size:0.74em" role="img" aria-label="class embedding   11 × 64                         704
layer 1           512 × (400 + 64 + 64) + 512     270,848     image + time + class
layer 2           512 × 512 + 512                 262,656
layer 3           512 × 512 + 512                 262,656
output            400 × 512 + 400                 205,200
total                                            1,002,064">
\[
\begin{array}{llrl}
\text{class embedding} & 11 \times 64 & 704 & \\
\text{layer 1} & 512 \times (400 + 64 + 64) + 512 & 270{,}848 & \text{image + time + class} \\
\text{layer 2} & 512 \times 512 + 512 & 262{,}656 & \\
\text{layer 3} & 512 \times 512 + 512 & 262{,}656 & \\
\text{output} & 400 \times 512 + 400 & 205{,}200 & \\ \hline
\text{total} & & 1{,}002{,}064 &
\end{array}
\]
</div>

- one forward pass ≈ **one million multiply-adds**; a 30-step sample ≈ **30 million**
- a GPU is built for exactly this: the same multiply-add over large arrays, which is what vertex and fragment shading also are


---

## What one layer cannot do: XOR

XOR is 1 when exactly one input is 1. No single line separates `$\{(0,1), (1,0)\}$` from `$\{(0,0), (1,1)\}$`, so no single threshold unit computes it. Two hidden units do:

<div class="tex" style="font-size:0.72em" role="img" aria-label="h₁ = step(x₁ + x₂ − 0.5)       &quot;at least one&quot;
h₂ = step(x₁ + x₂ − 1.5)       &quot;both&quot;
y  = step(h₁ − h₂ − 0.5)       &quot;at least one, but not both&quot;
x₁ x₂ | h₁ h₂ | y
 0  0 |  0  0 | 0
 0  1 |  1  0 | 1
 1  0 |  1  0 | 1
 1  1 |  1  1 | 0">
\[
\begin{aligned}
h_1 &= \operatorname{step}(x_1 + x_2 - 0.5) && \text{“at least one”} \\
h_2 &= \operatorname{step}(x_1 + x_2 - 1.5) && \text{“both”} \\
y &= \operatorname{step}(h_1 - h_2 - 0.5) && \text{“at least one, but not both”}
\end{aligned}
\qquad
\begin{array}{cc|cc|c}
x_1 & x_2 & h_1 & h_2 & y \\ \hline
0 & 0 & 0 & 0 & 0 \\
0 & 1 & 1 & 0 & 1 \\
1 & 0 & 1 & 0 & 1 \\
1 & 1 & 1 & 1 & 0
\end{array}
\]
</div>

- the hidden layer **re-describes** the input so that the output's single line suffices
- this is the 1969 objection, answered by one hidden layer; it was the training, not the capacity, that was missing until 1986


---

## Outside the data: networks do not extrapolate

A tanh (hyperbolic tangent) saturates at `$\pm 1$`, so far from the data every hidden unit is a constant:

<div class="tex" style="font-size:0.8em" role="img" aria-label="the hand network:   f(x) = 0.1 + 0.8 tanh(x + 0.5) − 0.6 tanh(−x + 0.5)
x → +∞:   0.1 + 0.8·(+1) − 0.6·(−1) = 1.5
x → −∞:   0.1 + 0.8·(−1) − 0.6·(+1) = −1.3">
\[
\begin{gathered}
\text{the hand network:} \quad f(x) = 0.1 + 0.8 \tanh(x + 0.5) - 0.6 \tanh(-x + 0.5) \\[4pt]
\begin{aligned}
x \to +\infty\text{:} &\quad 0.1 + 0.8 \cdot (+1) - 0.6 \cdot (-1) = 1.5 \\
x \to -\infty\text{:} &\quad 0.1 + 0.8 \cdot (-1) - 0.6 \cdot (+1) = -1.3
\end{aligned}
\end{gathered}
\]
</div>

- a trained network is reliable **between** its examples and **flat** (tanh) or **linear** (ReLU, the rectified linear unit) beyond them
- the wave fit knows nothing about the wave outside `$[-1, 1]$`; asked there, it answers with confidence anyway


---

## Pitfall: softmax overflows

<div class="tex" style="font-size:0.66em" role="img" aria-label="logits (1000, 999)
naive:     exp(1000) = Infinity in double precision  →  Infinity / Infinity = NaN (not a number)
stable:    subtract the maximum: exp(0), exp(−1)  →  (0.731, 0.269)     the same answer
wrong fix: divide by 1000: softmax(1, 0.999) = (0.50025, 0.49975)   a different answer">
\[
\begin{gathered}
\text{logits } (1000,\ 999) \\[4pt]
\begin{aligned}
\text{naive:} &\quad \exp(1000) = \text{Infinity in double precision} \ \to\ \text{Infinity} / \text{Infinity} = \text{NaN} \\
\text{stable:} &\quad \text{subtract the maximum: } \exp(0),\ \exp(-1) \ \to\ (0.731,\ 0.269) \quad\ \ \text{the same answer} \\
\text{wrong fix:} &\quad \text{divide by 1000: } \operatorname{softmax}(1,\ 0.999) = (0.50025,\ 0.49975) \quad\ \ \text{a different answer}
\end{aligned}
\end{gathered}
\]
</div>

- softmax is unchanged by adding a constant to every logit; subtracting the maximum makes the largest exponent 0
- the same **log-sum-exp** trick appears in the exact denoiser of the diffusion lecture, where the logits reach −1700


---

## Check the gradient numerically

Every hand-derived or hand-coded gradient gets tested against a finite difference; here the output error `$\delta$` (delta):

<div class="tex" style="font-size:0.8em" role="img" aria-label="∂L/∂b₂ ≈ ( L(b₂ + h) − L(b₂ − h) ) / (2h),     h = 10⁻⁴
central difference     0.626475
analytic δ = 2(f − y)  0.626475          agree to 10⁻¹⁰
a bug (the 2 dropped)  0.313237          off by a factor of two: the check catches it">
\[
\begin{gathered}
\frac{\partial L}{\partial b_2} \approx \frac{L(b_2 + h) - L(b_2 - h)}{2h}, \qquad h = 10^{-4} \\[8pt]
\begin{array}{lll}
\text{central difference} & 0.626475 & \\
\text{analytic } \delta = 2(f - y) & 0.626475 & \text{agree to } 10^{-10} \\
\text{a bug (the 2 dropped)} & 0.313237 & \text{off by a factor of two: the check catches it}
\end{array}
\end{gathered}
\]
</div>

- central differences have error `$O(h^2)$`; compare with a **relative** tolerance
- check a few random weights of a real network the same way before trusting a training run


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

- `backward()` is the backward sweep of the backpropagation slides, generated from the recorded forward pass
- swapping `SGD` (stochastic gradient descent) for `Adam` or the loss for cross-entropy changes one line


---

## Two hidden layers, worked

Keep layer 1; add `$W_2 = \left[\begin{smallmatrix} 0.6 & {-0.4} \\ 0.3 & 0.9 \end{smallmatrix}\right]$`, `$b_2 = (0, -0.2)$`, output `$w_3 = (0.8, -0.6)$`, `$b_3 = 0.1$`; tanh everywhere; `$x = 0.4$`, `$y = 0.3$`.

<div class="tex" style="font-size:0.66em" role="img" aria-label="forward   a1 = (0.7163, 0.0997)   z2 = (0.3899, 0.1046)   a2 = (0.3713, 0.1042)
          f = 0.1 + 0.8·0.3713 − 0.6·0.1042 = 0.3345        loss 0.0012
δ3        2(f − y) = 0.0690
δ2        0.0690·(0.8, −0.6) ⊙ (1 − a2²)
          = 0.0690·(0.8, −0.6) ⊙ (0.8621, 0.9891)            = (0.0476, −0.0410)
∂/∂W2     δ2 a1ᵀ = [ 0.0341  0.0047 ; −0.0293  −0.0041 ]
δ1        W2ᵀδ2 = (0.0163, −0.0559),  ⊙ (0.4869, 0.9901)  = (0.0079, −0.0553)
∂/∂W1     δ1 · x = (0.0032, −0.0221)
after one step (η = 0.1):  f = 0.3126,  loss 0.0002">
\[
\begin{aligned}
&\text{forward} && a_1 = (0.7163,\ 0.0997) \qquad z_2 = (0.3899,\ 0.1046) \qquad a_2 = (0.3713,\ 0.1042) \\
& && f = 0.1 + 0.8 \cdot 0.3713 - 0.6 \cdot 0.1042 = 0.3345, \qquad \text{loss } 0.0012 \\
&\delta_3 && 2(f - y) = 0.0690 \\
&\delta_2 && 0.0690 \cdot (0.8,\ {-0.6}) \odot (1 - a_2^2) \\
& && = 0.0690 \cdot (0.8,\ {-0.6}) \odot (0.8621,\ 0.9891) = (0.0476,\ {-0.0410}) \\
&\partial L / \partial W_2 && \delta_2\, a_1^T = \begin{bmatrix} 0.0341 & 0.0047 \\ {-0.0293} & {-0.0041} \end{bmatrix} \\
&\delta_1 && W_2^T \delta_2 = (0.0163,\ {-0.0559}), \quad \odot\ (0.4869,\ 0.9901) = (0.0079,\ {-0.0553}) \\
&\partial L / \partial W_1 && \delta_1 \cdot x = (0.0032,\ {-0.0221}) \qquad \text{after one step } (\eta = 0.1)\text{:} \ \ f = 0.3126, \ \ \text{loss } 0.0002
\end{aligned}
\]
</div>

- at every layer `$\delta$` (delta) is multiplied by a weight and a tanh slope: unit 1's error **shrank six-fold** (0.0476 to 0.0079), unit 2's **grew** (−0.0410 to −0.0553), because `$W_2$`'s 0.9 outweighs its slope; where those products stay below 1 layer after layer, the first layer's gradient vanishes


---

## The vanishing gradient, in numbers

Each layer multiplies the backward signal by a weight and by the activation's slope. With slopes below 1:

| slope per layer | 5 layers | 10 layers | 20 layers |
| --- | --- | --- | --- |
| 0.5 | 0.031 | 0.00098 | 0.00000095 |
| 0.487 (tanh at 0.9) | 0.027 | 0.00075 | 0.00000056 |
| 1 (ReLU, active) | 1 | 1 | 1 |

- a 20-layer tanh network's first layer learns **a million times** slower than its last
- three fixes, used together in every deep network: **rectifiers**, **careful initialization**, **skip connections** (next slides)


---

## Initialization

Weights start random. Too small and the signal shrinks layer by layer; too large and it explodes.

<div class="tex" style="font-size:0.74em" role="img" aria-label="He initialization (He et al. 2015, arXiv:1502.01852), for ReLU layers with n inputs:
w ~ N(0, 2/n)                     keeps the activations' variance constant through depth
n = 64:     std 0.177
n = 512:    std 0.0625          the course's hidden layers
n = 4096:   std 0.0221">
\[
\begin{gathered}
\text{He initialization (He et al. 2015, arXiv:1502.01852), for ReLU layers with } n \text{ inputs:} \\[4pt]
\begin{aligned}
&w \sim \mathcal{N}(0,\ 2/n) && \text{keeps the activations' variance constant through depth} \\[6pt]
&n = 64\text{:} \ \ \text{std } 0.177 \\
&n = 512\text{:} \ \ \text{std } 0.0625 && \text{the course's hidden layers} \\
&n = 4096\text{:} \ \ \text{std } 0.0221
\end{aligned}
\end{gathered}
\]
</div>

- the 2 compensates for ReLU zeroing half its inputs; for tanh the rule is `$1/n$` (Glorot & Bengio 2010)
- biases start at **0**; never start all weights **equal** (every unit would compute, and learn, the same thing)


---

## Normalization and skip connections

**Layer normalization** rescales each example's activations to mean 0 and variance 1 (Ba et al. 2016, arXiv:1607.06450), then applies a learned scale and shift:

<div class="tex" style="font-size:0.8em" role="img" aria-label="activations (2, 4, 6):   mean 4,  std 1.633   →   (−1.225, 0, 1.225)">
\[ \text{activations } (2,\ 4,\ 6)\text{:} \quad \text{mean } 4,\ \ \text{std } 1.633 \quad \to \quad ({-1.225},\ 0,\ 1.225) \]
</div>

A **residual (skip) connection** adds a layer's input to its output (He et al. 2015, arXiv:1512.03385):

<div class="tex" style="font-size:0.8em" role="img" aria-label="y = x + F(x)          ∂y/∂x = 1 + F′(x)          the gradient always has the &quot;1&quot; path">
\[ y = x + F(x) \qquad \frac{\partial y}{\partial x} = 1 + F'(x) \qquad \text{the gradient always has the “1” path} \]
</div>

- normalization keeps every layer's inputs in the range where its slopes are healthy
- skip connections let gradients reach the first layer undiminished; the U-Net and the transformer both rely on them


---

## Pitfall: dead units

A ReLU unit whose pre-activation is **negative for every input** outputs 0 and has gradient 0: it never recovers.

<div class="tex" style="font-size:0.72em" role="img" aria-label="inputs in [0, 1],  w = 1,  b = −3      z = w·x + b ≤ 1 − 3 = −2 &lt; 0   for every input
output 0, gradient 0, forever">
\[
\begin{gathered}
\text{inputs in } [0,\ 1],\ \ w = 1,\ \ b = -3 \qquad z = w \cdot x + b \le 1 - 3 = -2 \lt 0 \ \text{ for every input} \\
\text{output 0, gradient 0, forever}
\end{gathered}
\]
</div>

- a large learning-rate step can push many units there at once; the loss stalls with capacity to spare
- symptoms: a large fraction of units that are **exactly zero** on every example
- fixes: smaller steps, He initialization, or activations with a slope below zero (leaky ReLU; SiLU, the sigmoid linear unit; GELU, the Gaussian error linear unit)


---

## Three optimizers, measured

The wave fit (`$H = 12$`) from the same starting weights, loss after each number of epochs:

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

Apply Adam with `$\eta = 0.01$` to the seven gradients of the hand step:

<div class="tex" style="font-size:0.74em" role="img" aria-label="g = (0.0976, −0.1489, 0.2440, −0.3722, 0.4487, 0.0624, 0.6265)
t = 1:   m̂ = g,   v̂ = g²   ⇒   update = η · g / |g| = ±0.01   in every coordinate
gradient              0.0624      0.6265
gradient descent      0.0006      0.0063      (η = 0.01)
Adam                  0.0100      0.0100">
\[
\begin{gathered}
g = (0.0976,\ {-0.1489},\ 0.2440,\ {-0.3722},\ 0.4487,\ 0.0624,\ 0.6265) \\
t = 1\text{:} \quad \hat m = g, \quad \hat v = g^2 \quad \Rightarrow \quad \text{update} = \eta \cdot g / \lvert g \rvert = \pm 0.01 \ \text{ in every coordinate} \\[6pt]
\begin{array}{lrrl}
\text{gradient} & 0.0624 & 0.6265 & \\
\text{gradient descent} & 0.0006 & 0.0063 & (\eta = 0.01) \\
\text{Adam} & 0.0100 & 0.0100 &
\end{array}
\end{gathered}
\]
</div>

<img src="../../textbook/figures/nn-optimizers.svg" class="media-shot" style="max-height: 200px;" alt="training loss against epoch for gradient descent, momentum and Adam on the wave fit">

- the first Adam step is a step of length `$\eta$` along the **sign** of the gradient; a step can never exceed about `$\eta$`, whatever the gradient


---

## Learning-rate schedules

The best step size `$\eta$` (eta) changes during training: large early, small late; `$\pi$` (pi) below is the circle constant.

<div class="tex" style="font-size:0.74em" role="img" aria-label="warmup:        η rises linearly from 0 over the first few hundred steps
cosine decay:  η(t) = η₀ · ½ (1 + cos(π t / T))
               t = 0: η₀      t = T/2: 0.5 η₀      t = 3T/4: 0.146 η₀      t = T: 0">
\[
\begin{aligned}
&\text{warmup:} && \eta \text{ rises linearly from 0 over the first few hundred steps} \\
&\text{cosine decay:} && \eta(t) = \eta_0 \cdot \tfrac12 \big(1 + \cos(\pi t / T)\big) \\
& && t = 0\text{: } \eta_0 \qquad t = T/2\text{: } 0.5\, \eta_0 \qquad t = 3T/4\text{: } 0.146\, \eta_0 \qquad t = T\text{: } 0
\end{aligned}
\]
</div>

- warmup protects Adam's early steps, whose variance estimates are still poor
- the decay lets the final steps settle into a minimum instead of rattling around it
- **weight decay** shrinks every weight each step, `$\theta \leftarrow \theta - \eta(g + \lambda\theta)$`, with `$\theta$` (theta) the weights and `$\lambda$` (lambda) the decay rate; with `$\eta = 0.1$` and `$\lambda = 0.002$`, 5000 steps of decay alone scale a weight by `$0.9998^{5000}$` = **0.368**


---

## Train, validate, test

| split | used for | touched |
| ----- | -------- | ------- |
| **training** | computing gradients | every step |
| **validation** | choosing `$H$`, `$\eta$`, `$\lambda$`, when to stop | after each epoch |
| **test** | the number you report | **once**, at the end |

- the validation set is overfit **too**, slowly, by every choice made while looking at it; the test set exists to catch that
- **leakage**: a near-duplicate of a test image in the training set (a crop, a resize) makes the test score meaningless
- for generative models the same question returns as **memorization**: is a sample new, or a copy of a training image? (the diffusion lecture measures it)


---

## Shared weights: the parameter count

An RGB image (red, green, blue: three numbers per pixel):

<div class="tex" style="font-size:0.7em" role="img" aria-label="a fully connected unit on a 512 × 512 RGB image         786,432 weights, for ONE output
a 3 × 3 convolution, RGB in, 64 channels out            3·3·3·64 + 64 = 1,792 weights
a 3 × 3 convolution, 64 channels in, 64 out             3·3·64·64 + 64 = 36,928 weights">
\[
\begin{aligned}
&\text{a fully connected unit on a } 512 \times 512 \text{ RGB image} && 786{,}432 \text{ weights, for ONE output} \\
&\text{a } 3 \times 3 \text{ convolution, RGB in, 64 channels out} && 3 \cdot 3 \cdot 3 \cdot 64 + 64 = 1{,}792 \text{ weights} \\
&\text{a } 3 \times 3 \text{ convolution, 64 channels in, 64 out} && 3 \cdot 3 \cdot 64 \cdot 64 + 64 = 36{,}928 \text{ weights}
\end{aligned}
\]
</div>

- the convolution's weights do not grow with the **image size**: the same 1,792 weights run on a 20 × 20 digit or a 4K frame
- **translation equivariance**: shift the input, and the feature map shifts with it
- channels play the role hidden units played: each output channel is one learned feature detector


---

## The receptive field grows with depth

Each 3 × 3 layer lets an output see one more pixel in every direction:

| layers `$L$` | 1 | 2 | 5 | 10 |
| --- | --- | --- | --- | --- |
| field, pixels across: `$2L + 1$` | 3 | 5 | 11 | 21 |

- stacking small kernels reaches far with few weights: two 3 × 3 layers see 5 × 5 with 18 weights per channel pair instead of 25
- **downsampling** by 2 between stages doubles the reach of every later layer; a few stages see the whole image
- the **U-Net** (Ronneberger et al. 2015): downsample to see globally, upsample back to full resolution, with **skip connections** carrying the fine detail across; the denoiser of the first diffusion models


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

## How the network is told the time

The diffusion denoiser must know **how much noise** it is looking at. It receives `$t$` as a 64-number code of sines and cosines at 32 frequencies:

<div class="tex" style="font-size:0.8em" role="img" aria-label="angle_i = t · 1000 · 10000^(−i/32)
code    = (sin angle_0 … sin angle_31, cos angle_0 … cos angle_31)">
\[
\begin{aligned}
\text{angle}_i &= t \cdot 1000 \cdot 10000^{-i/32} \\
\text{code} &= (\sin \text{angle}_0 \ldots \sin \text{angle}_{31},\ \cos \text{angle}_0 \ldots \cos \text{angle}_{31})
\end{aligned}
\]
</div>

| (sin, cos) | `$i = 0$` (fast) | `$i = 16$` | `$i = 31$` (slow) |
| --- | --- | --- | --- |
| `$t = 0.50$` | (−0.468, −0.884) | (−0.959, 0.284) | (0.067, 0.998) |
| `$t = 0.51$` | (0.873, 0.487) | (−0.926, 0.378) | (0.068, 0.998) |

- the fast frequencies distinguish **nearby** times; the slow ones say roughly **where** in `$[0, 1]$` `$t$` is
- the same trick encodes **positions** in a transformer and **pixel or point coordinates** in a coordinate network


---

## On unit vectors, cosine and distance agree

For normalized `$u$`, `$v$`: `$\lVert u - v \rVert^2 = 2 - 2 \cos(u, v)$`, so ranking by distance and ranking by cosine give **the same** nearest neighbors.

| `$\cos(u, v)$` | `$\lVert u - v \rVert^2$` | `$\lVert u - v \rVert$` |
| --- | --- | --- |
| 0.96 | 0.08 | 0.283 |
| 0.5 | 1 | 1 |
| 0 | 2 | 1.414 |

- nearest-neighbor search over millions of embeddings (image search, retrieval) uses this to run on fast Euclidean indexes
- unnormalized vectors break the equivalence: a long vector is "close" to many things by dot product


---

## A sphere, or hyperbolic space

<img src="../../textbook/figures/nn-sphere-hyperbolic.svg" style="height:310px; display:block; margin:0.1em auto 0;" alt="Left, on a sphere, direction only: the unit circle with cats at 90 degrees, dogs at 210, humans at 330, each a cluster of dots, one per example; equal angles 120 degrees apart, cos 120 degrees = -0.5 = -1/(K - 1). Right, in the Poincare disk, a hierarchy: mammal at the center; carnivore and primate one step out; cat, dog and human two steps; tabby, siamese, beagle and collie three steps, near the rim; edges are arcs that meet the rim at right angles; the dashed circles are equal hyperbolic steps; radius: how general, angle: which branch.">

- **a sphere**: only direction counts; `$K$` classes sit farthest apart at equal angles (face recognition: ArcFace, arXiv:1801.07698)
- **a hierarchy** multiplies at every level; a sphere's room is fixed, the **Poincaré disk**'s grows exponentially toward the rim
- WordNet's nouns: 5 hyperbolic dimensions beat 200 Euclidean (Nickel & Kiela 2017, arXiv:1705.08039); the gain is in few dimensions


---

## Embedding arithmetic, and what it does not do

Try the word trick on the digit vectors:

<div class="tex" style="font-size:0.7em" role="img" aria-label="e₄ − e₉ + e₇   nearest class other than the operands: 2 (cos 0.31);   among all: 7 (0.75)
e₃ − e₅ + e₈   nearest class other than the operands: 9 (cos 0.24);   among all: 8 (0.68)">
\[
\begin{aligned}
&e_4 - e_9 + e_7 && \text{nearest class other than the operands: 2 (cos 0.31);} \quad \text{among all: 7 (0.75)} \\
&e_3 - e_5 + e_8 && \text{nearest class other than the operands: 9 (cos 0.24);} \quad \text{among all: 8 (0.68)}
\end{aligned}
\]
</div>

- the result stays near its last operand; the digit space has no "subtract a loop, add a stroke" direction
- nothing in the denoising task needed one, and **eleven points in 64 dimensions are too few to define directions**
- embedding arithmetic is a property of a **trained space with many relations**, not of embeddings as such
- the eleventh vector, "no class", has length 2.19 against 3.85 to 5.15 for the digits: a short vector near the middle of the cloud, which is what a mean is


---

## Variational autoencoders

A plain autoencoder's codes land wherever training puts them, with gaps between; decoding a random code gives garbage. A **VAE** (variational autoencoder; Kingma & Welling 2013, arXiv:1312.6114) fixes the layout:

<div class="tex" style="font-size:0.72em" role="img" aria-label="encoder outputs a mean μ and a spread σ;  code z = μ + σ ⊙ ε,  ε ~ N(0, I)
loss = reconstruction error + KL( N(μ, σ²) ‖ N(0, I) )     pulls codes toward N(0, I)">
\[
\begin{gathered}
\text{encoder outputs a mean } \mu \text{ and a spread } \sigma; \quad \text{code } z = \mu + \sigma \odot \varepsilon, \quad \varepsilon \sim \mathcal{N}(0, I) \\
\text{loss} = \text{reconstruction error} + \mathrm{KL}\big(\mathcal{N}(\mu, \sigma^2) \,\Vert\, \mathcal{N}(0, I)\big) \qquad \text{pulls codes toward } \mathcal{N}(0, I)
\end{gathered}
\]
</div>

- `$\mu$` (mu) is the mean, `$\sigma$` (sigma) the spread, `$\varepsilon$` (epsilon) the noise
- KL, the **Kullback–Leibler divergence**, measures how far the codes spread from `$\mathcal{N}(0, I)$`; with it the code space becomes **dense**: every point near the origin decodes to something plausible
- Stable Diffusion's autoencoder is KL-regularized in this way (lightly), so its 64 × 64 × 4 latents are well behaved for diffusion
- alone, VAE samples are **blurry**: squared error hedges toward the average


---

## Zero-shot classification with CLIP

Classify an image with **no classifier training**: embed a caption per class and pick the closest; a softmax at temperature `$\tau$` (tau) turns the cosines into probabilities.

| prompts | illustrative cosines to one image |
| --- | --- |
| "a photo of a cat" | 0.31 |
| "a photo of a dog" | 0.24 |
| "a photo of a car" | 0.22 |

<div class="tex" style="font-size:0.8em" role="img" aria-label="softmax at τ = 0.01:   (0.999, 0.0009, 0.0001)      decisive
softmax at τ = 1:      (0.351, 0.328, 0.321)        nearly uniform">
\[
\begin{aligned}
&\operatorname{softmax} \text{ at } \tau = 0.01\text{:} && (0.999,\ 0.0009,\ 0.0001) && \text{decisive} \\
&\operatorname{softmax} \text{ at } \tau = 1\text{:} && (0.351,\ 0.328,\ 0.321) && \text{nearly uniform}
\end{aligned}
\]
</div>

- CLIP was trained on **400 million** image-text pairs; zero-shot, its largest model matched the ImageNet accuracy of a ResNet-50 trained on ImageNet's labels (76.2 % top-1)
- a new class is **one new sentence**, not a new dataset


---

## Small networks inside graphics

- **denoisers** for path-traced frames (the previous lecture): a network reads noisy color plus normals, albedo and depth
- **learned upscaling** in games (NVIDIA DLSS, Deep Learning Super Sampling, in games from 2019): render at lower resolution, let a network reconstruct the full frame using motion vectors
- **neural radiance fields** (the learned-scenes lecture): a small network (the original paper's weights take about 5 MB, megabytes) stands in for a whole scene
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
