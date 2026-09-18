<!--
  CSS 551 · TOPIC DECK — Learned images: networks, embeddings, and the space of images (~26 min).
  A topic is a reusable stretch of slides that a session page mounts as one
  <section data-markdown="../../topics/learned-images-foundations.md"> among others; it carries no
  session logistics (no title, Thursday, MP, wrap) and no "Part N" numbering.
  Sessions compose topics in their index.html; see sessions/README.md.

  TEACHES: a network is a function (exhibit A, mlp-fit trained live); embeddings (exhibit B, embed-map read from the trained denoiser); encoders/decoders; two encoders in one space (CLIP); the space of images; the non-invertible concept map; noise as the choice.
  NEEDS:   vectors and dot products; nothing about diffusion. The diffusion-ladder topic assumes this one came first (it refers to 'exhibit A' for smoothness).
  DEMOS:   data-demo="mlp-fit" data-controls="epochs,hidden"; data-demo="embed-map" data-controls="highlight" (both demo-full). embed-map reads lib/assets/mnist/mlp-denoiser.bin.

  reveal.js: FLAT (every slide a top-level "---" section, never "--"). Notes
  follow "Note:". Math is plain unicode text or fenced ```text blocks (no
  KaTeX plugin). Never two "_" on one markdown line outside a code fence;
  backtick names with underscores. No <small> on math. Demo embeds live on
  demo-full slides (a short ## title + the embed div + its viz-fallback pre).
  Image/handout paths are relative to the SESSION page that mounts this
  topic (sessions/SNN/index.html): ../../media/..., ../../textbook/...
-->

### Learned images: networks, embeddings, and the space of images

<small>(~26 min)</small>

Note: The foundations, twenty-six minutes, two live exhibits before the word diffusion is even used (a network is a function; an embedding is a place). The diffusion ladder follows as its own topic: no equations beyond one line of bookkeeping. The ladder is the argument: a real picture dissolving into noise; the mechanism on dots you can see; the same mechanism on real digits, where the exact denoiser can only memorize; a smoothing knob that turns memorization into generalization; then a network that was actually trained, generating digits it never saw. Each rung answers "but how do you get from that to any picture?" a little further. The galleries at the end are the designated cut if we run long.

---

## A network is a function

A **neural network** is a function with knobs: inputs in, numbers out, and thousands to billions of **weights** that shape it.

- **training**: show it examples, measure how wrong it is, nudge every weight a little to be less wrong; repeat (**backpropagation**, Rumelhart, Hinton & Williams 1986)
- with enough units it can fit almost any function (the **universal approximation** theorems, Cybenko 1989, Hornik 1991)
- exhibit A next: twelve points, a network with 37 weights, trained **live** in front of you, step by step
- watch for: the curve bending as the epoch counter ticks, and what it does **between** the points

Note: Before diffusion, three ideas every later slide leans on, and the first is the plainest: a network is a function. It takes numbers in and gives numbers out, and its shape is set by weights. Training is not programming: you show examples, compute how wrong the output is, and push every weight a little in the direction that reduces the error, millions of times; that push is backpropagation, 1986. Two facts matter tonight. A network with enough units can approximate essentially any function, the universal approximation results of 1989 and 1991. And what it does between the examples is not arbitrary: it interpolates smoothly. The exhibit shows both in a few seconds.

---

<!-- .slide: class="demo-full" -->

## Exhibit A: a function that learns

<div class="cockpit" data-demo="mlp-fit" data-controls="epochs,hidden"><pre class="viz-fallback">  twelve (x, y) points from a hidden curve; a two-layer network
  f(x) = Σ w2·tanh(w1·x + b1) + b2 with 3·hidden + 1 weights
  drag epochs up from 0: training runs LIVE, a few gradient steps per frame;
  the random wiggle bends until it passes through the points, the epoch
  counter ticks, and a loss-vs-epoch plot grows in the corner. Drag down: reset.
  drag hidden to 2: it cannot bend enough; to 40: it fits, smoothly
  buttons: wave · step · bump.  Readout: weights, epochs run, error, state</pre></div>

Note: The slide opens untrained: a random wiggle, state "untrained". Drag epochs up to a few hundred and let the class watch: the curve bends a little every frame, the epoch counter ticks, the loss plot in the corner drops; nothing is precomputed, these are gradient steps running in the page. Read the error falling. Then the two things to point at. Between the points the curve is smooth: it does not snap from one point to the next, it interpolates. And capacity: at two hidden units it cannot bend enough, at forty it can follow the step, with a soft ramp where the data has a jump, because a smooth function has to. Hold the phrase "smooth between the examples": that is the whole difference between a lookup table and a network, and it comes back three exhibits from now as the difference between memorizing digits and drawing new ones.

---

## Embeddings: a vector for a concept

An **embedding** is a learned vector that stands for a thing, placed so that **similar things are near**.

- words (word2vec, Mikolov et al. 2013): "king" near "queen", far from "carburetor"; arithmetic in the space works
- nobody places the points; a network puts them where its job goes better
- exhibit B next: the digit-drawing network you will meet later carries ten such vectors, one per digit; we read them out of its weights and map them
- watch for: which digits end up as neighbors, and why

Note: Second idea: an embedding. Instead of a name, a concept gets a vector, and vectors are placed so that similarity is distance. The 2013 word2vec result made this famous: word vectors where "king minus man plus woman" lands near "queen". The point to make is that nobody designs the placement; a network learns it because its task goes better when related things share coordinates. The exhibit is honest in a way slides cannot be: the digit network that draws at the end of the ladder has a table of ten class vectors inside it, and we simply read them out and map them.

---

<!-- .slide: class="demo-full" -->

## Exhibit B: embeddings, read from the weights

<div class="cockpit" data-demo="embed-map" data-controls="highlight"><pre class="viz-fallback">  the ten class embeddings (64 numbers each) inside the trained digit
  denoiser, projected to their two principal axes (36% of the variance)
  drag highlight: lines to the digit's three nearest classes, cosines in
  the readout. 4 is nearest 9 (0.54), 3 nearest 5 (0.52), 7 nearest 9 (0.48):
  digits that share strokes were placed near each other by training alone</pre></div>

Note: Drag highlight to 4: its nearest neighbor is 9, then 7; to 3: nearest 5; to 7: nearest 9, then 4. Digits that share strokes were placed near each other, and nobody told the network about strokes; the placement fell out of the denoising job. Say the two honest caveats: the 2D picture keeps about a third of the variance, so use the readout's cosines, which use all 64 numbers; and these are ten concepts, a caption model has hundreds of thousands. The grey "no class" point matters later: it is the slot a text embedding fills.

---

## Encoders and decoders

An **encoder** maps a thing to its embedding; a **decoder** maps an embedding back to a thing.

```text
   image  ──encoder──▶  a few thousand numbers  ──decoder──▶  image (nearly)
   train both together to reproduce the input: an autoencoder
```

- the middle is a **compressed** description: only what matters survives (Hinton & Salakhutdinov 2006)
- a 128×128 render (the diffusion ladder dissolves one) is 49,152 numbers; its latent in Stable Diffusion would be 16,384
- keep the two names apart: **encoder** = thing to vector, **decoder** = vector to thing

Note: Third idea, two more words. An encoder is a network that turns a thing into a vector; a decoder turns a vector back into the thing. Train them together so that decode(encode(x)) reproduces x, with a narrow middle, and you have an autoencoder: the middle is forced to keep only what matters. Hinton and Salakhutdinov's 2006 paper is the modern reference. Give the number: the Cornell render is 49,152 numbers; Stable Diffusion's autoencoder squeezes an image that size to 16,384 and restores the fine texture on the way back. We will meet that latent again as "why diffusion got cheap".

---

## Two encoders, one space

Train an **image encoder** and a **text encoder** in parallel so that a photo and its caption land on the **same point**.

```text
   "a tabby cat on a sofa"  ──text encoder──▶   ●
   [photo of that cat]      ──image encoder─▶   ● ← pulled together
   [photo of a truck]       ──image encoder─▶       ● ← pushed apart
```

- **contrastive** training on hundreds of millions of (image, caption) pairs: **CLIP** (Radford et al. 2021)
- afterwards, words and pictures are the same kind of vector; a caption is a point you can aim at
- this is the "concept" coordinate system the rest of the night uses

Note: Put the two ideas together and you get the machine that made text-to-image possible. Two encoders, one for images, one for text, trained side by side on hundreds of millions of caption-image pairs with one rule: a matching pair must land on the same point, a mismatched pair must not. That is contrastive training, and CLIP, 2021, is the model everyone builds on. After training, a sentence and a photograph are vectors in the same space, so "aim the picture at this caption" becomes geometry. Every concept you can say in words is now a coordinate.

---

## The space of images

An **m × n RGB image is a point** in a vector space of dimension **3·m·n**: one axis per number, three numbers per pixel. Equally, it is the **vector** from the origin to that point.

```text
   image  =  (r₁₁, g₁₁, b₁₁,  r₁₂, g₁₂, b₁₂,  ...,  r_mn, g_mn, b_mn)  ∈  [0,1]^(3·m·n)
   128 × 128 RGB  →  49,152 coordinates;   512 × 512 RGB  →  786,432
```

- almost every point in that space is **static**; the meaningful images are a thin, tangled region
- every meaningful image carries **concepts you can say in words**: the encoder maps it to a concept embedding
- **generating** = landing a new point inside the thin region, on purpose

Note: Now the geometric picture that holds for the rest of the hour, stated precisely. An m by n RGB image is a list of 3·m·n numbers, so it is one point in a vector space of that dimension, or equivalently the vector from the origin to it: night one called it a grid, tonight it is a location. For the Cornell render that is 49,152 coordinates; for a 512 by 512 photograph, 786,432. Pick a point at random and you get static every time: the pictures that mean something are a thin folded sheet inside the space. Each point on the sheet has content, a cat, a room, a sunset, and the image encoder from the previous slide maps it to that content's coordinates. Generation is the reverse ambition: land a new point on the sheet with the content you asked for. (If anyone asks about resolution: one can generalize to a function f from the unit square to RGB, an image at every resolution at once, and that function space is where the continuous view lives; it is beyond this course, and everything tonight works in the finite-dimensional version.) The next slide says why the reverse is not simply a function.

---

## The concept map is not invertible

The encoder is **many-to-one**: thousands of cat photographs land on one "cat" embedding. Its inverse is **one-to-many**: a caption does not pick an image, it picks a **distribution** of images.

```text
   images  ──encoder──▶  concept        (many → one: fine)
   concept ──?──▶  which image?          (one → many: no function can do it)
```

- a generator cannot be a plain decoder of the caption: it would have to return one image for "cat", forever
- something must supply the **missing choices**: which cat, which pose, which light

Note: The crux, and worth slowing down for. Encoding throws information away on purpose: a thousand cat photographs, one "cat" vector. So there is no function from "cat" back to a picture; the honest inverse is a probability distribution over cat pictures. A decoder that took the caption alone would be forced to output the same cat every time, which is what early attempts did. Whatever generates has to supply the choices the encoder discarded: which cat, which pose, which light, which background. Next slide: where diffusion gets those choices.

---

## Noise is the choice

Diffusion supplies the missing information as **random noise**, then spends its steps turning that noise into a picture that fits the concept.

```text
   destroy:   walk real images into noise on a schedule        (no learning)
   learn:     a network that undoes one small step, given the concept
   sample:    start from fresh noise, undo step by step        (one image per noise)
```

- a different starting noise gives a different cat; the caption steers, the noise decides
- one-to-many, solved: the recipe is Sohl-Dickstein et al. 2015, made practical by Ho, Jain & Abbeel 2020
- the diffusion ladder that follows does each line of the recipe where you can see it

Note: The resolution. Start from a random point, pure noise, which contains more than enough arbitrary choices, and learn a function that moves it a small step toward the sheet, in the direction the concept asks for. Repeat, and the noise becomes a specific cat. Different noise, different cat; the caption steers, the noise decides. That is how a one-to-many problem becomes a sequence of one-to-one steps, each of which a network can learn. The idea is from a 2015 paper by Sohl-Dickstein and colleagues that borrowed it from thermodynamics; the 2020 paper by Ho, Jain and Abbeel made it work at scale. The rest of Part 2 is that recipe, one line at a time, on things small enough to watch.
