<!--
  CSS 551 · TOPIC DECK: Neural networks and embeddings, further (~38 min, 27 slides), mounted after the lecture's
  wrap, time permitting. Cut 2026-11-13 from topics/neural-nets-embeddings.md (L15): the slides the core does
  not build on, in the topic's order. Numbers: as in that topic's header (tools/gen-lecture-figures-d1.mjs,
  textbook/figures/numbers.json).
  NEEDS: topics/neural-nets-embeddings.md.
  reveal.js: FLAT; notes follow "Note:"; plain unicode math in text blocks; never two "_" on one markdown line
  outside a code fence.
-->

---

### Supplement: neural networks, further

<small>(~38 min, time permitting) · reading: <a href="../../textbook/neural-nets-embeddings.html">Neural Networks and Embeddings</a></small>


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
- swapping `SGD` for `Adam` or the loss for cross-entropy changes one line


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

- at every layer δ is multiplied by a weight and a tanh slope: unit 1's error **shrank six-fold** (0.0476 to 0.0079), unit 2's **grew** (−0.0410 to −0.0553), because W2's 0.9 outweighs its slope; where those products stay below 1 layer after layer, the first layer's gradient vanishes


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

## Shared weights: the parameter count

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

The diffusion denoiser must know **how much noise** it is looking at. It receives t as a 64-number code of sines and cosines at 32 frequencies:

```text
   angle_i = t · 1000 · 10000^(−i/32)
   code    = (sin angle_0 … sin angle_31, cos angle_0 … cos angle_31)

              i = 0 (fast)       i = 16             i = 31 (slow)
   t = 0.50   (−0.468, −0.884)   (−0.959, 0.284)    (0.067, 0.998)        (sin, cos)
   t = 0.51   ( 0.873,  0.487)   (−0.926, 0.378)    (0.068, 0.998)
```

- the fast frequencies distinguish **nearby** times; the slow ones say roughly **where** in [0, 1] t is
- the same trick encodes **positions** in a transformer and **pixel or point coordinates** in a coordinate network


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
