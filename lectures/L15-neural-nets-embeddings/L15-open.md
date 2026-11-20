<!--
  CSS 551 · L15 · Thursday November 19, 2026 (week 8, in person): Neural networks and embeddings.
  Plan C lecture shell (lectures/README.md). index.html mounts, in order: this file (title +
  tonight), ../../topics/neural-nets-embeddings.md (the core, ~62 min, 37 slides),
  ../../topics/coordinate-networks.md (the core, ~30 min, 17 slides), L15-discuss.md (the HW7 walk-through,
  Parts 1 and 2, and the wrap), then, after the wrap, time permitting: ../../topics/neural-nets-embeddings-supplement.md
  (~38 min, 27 slides) and ../../topics/coordinate-networks-supplement.md (~10 min, 6 slides).
  Re-sequenced 2026-10-25 (was L14, Tuesday November 17): a Thursday in person; its HW7 walk-through moved here from the image-space lecture. HW7 goes out with
  Lecture 16 (moved 2026-11-09, one release a week).

  Goals: a network is a function whose weights are set by gradient descent on a loss, by hand; the
  vocabulary the later lectures use without re-deriving it; one image as a function, spectral bias and
  frequency encodings (the bridge to NeRF). The outcomes are in each topic's header. Graded: HW7 Parts 1
  and 2 (the hand step, the fit); Quiz 7 a forward pass and a cosine; the final a gradient step.
  CUT 2026-11-13 (Marcel: review of next week's lectures, goals and outcomes): both topics cut to cores of 25
  and 13 slides from 53 and 19; the rest moved in order to two supplements after the wrap; "The step, in
  code" deleted (Marcel: "pull them", it answered HW7 Part 1); errata (see the topic headers).

  RE-SEQUENCED 2026-11-19 (Marcel: "review l15. is the sequence of topics optimal? are we using concepts before
  they are analyzed?", then "proceed ... split dense slides"): the chain rule gets its own slide, backpropagation
  through layers follows the hand step, terms defined where first used, the coordinate networks' comparison after
  SIREN, dense slides split (53 topic slides from 38; the content grew by one slide, the chain rule). Details in the
  two topic headers. Tonight's list follows the new order.

  reveal.js: FLAT deck; notes follow "Note:"; math typeset by MathJax (lib/deck-math.js); never two "_" on one
  markdown line outside a code fence.

  DEMO EMBEDS (all demo-full, in the topics): mlp-fit (epochs,hidden), embed-map (highlight),
  coord-net (sigma,omega).

  Minute plan (120 min, Thu 5:45-7:45 PM in person), at the room's pace (about 2.4 min a slide, measured on
  denser slides; 62 slides on the page after the 2026-11-19 splits (Adam in two since the moments were named), five live exhibits):
    0:00  Title and tonight                                    2 min
    0:02  Neural networks and embeddings, the core            62 min
    1:04  Coordinate networks, the core                        30 min   (two exhibit runs, not four)
    1:34  HW7 walk-through, Parts 1 and 2 (Part 3 in L16)       4 min
    1:38  Wrap                                                  2 min
    1:40  Open questions; buffer                               20 min
  If it runs late, drop in this order: the temperature, the contrastive batch of two, the cost of attention,
  epochs and iterations.
  CUT 2026-10-08: the five multiple-choice discussion questions.
  2026-11-19: acronyms spelled out at first use (homework 7 (HW7), Adam, CLIP, XOR, VAEs, DCT).
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 15: Neural Networks and Embeddings**

> Rumelhart, Hinton and Williams popularized backpropagation in a 1986 Nature paper.

<small>Nature 323, 533 to 536 (1986)</small>

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Tonight

- a network is a **function**: a forward pass by hand
- training is **gradient descent**: the chain rule, one step by hand, **backpropagation** through layers
- training in practice, live: the learning rate, **mini-batches**, **Adam** (adaptive moment estimation); then **overfitting**
- the classification loss (**softmax**); **convolution** and **attention**, one output each
- **embeddings**, autoencoders, and the shared space of **CLIP** (Contrastive Language-Image Pre-training)
- **coordinate networks**: one image as a function of (x, y)
- the walk-through of **homework 7 (HW7)**, Parts 1 and 2

Reading: [Neural Networks and Embeddings](../../textbook/neural-nets-embeddings.html), Sections 1 to 9
