<!--
  CSS 551 · L15 · Thursday November 19, 2026 (week 8, in person): Neural networks and embeddings.
  Plan C lecture shell (lectures/README.md). index.html mounts, in order: this file (title +
  tonight), ../../topics/neural-nets-embeddings.md (~66 min), ../../topics/coordinate-networks.md
  (~27 min), L15-discuss.md (the HW7 walk-through and the wrap).
  Re-sequenced 2026-10-25 (was L14, Tuesday November 17): a Thursday in person; HW7 goes out tonight,
  so its walk-through moved here from the image-space lecture.

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX; never two "_" on one
  markdown line outside a code fence.

  DEMO EMBEDS (all demo-full, in the topics): mlp-fit (epochs,hidden), embed-map (highlight),
  coord-net (sigma,omega).

  Minute plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Title and tonight                                   2 min
    0:02  Neural networks and embeddings (topic, 51 slides)  66 min
    1:08  Coordinate networks (topic, 18 slides)             27 min
    1:35  HW7 walk-through                                     5 min
    1:40  Wrap                                                 2 min
    1:42  Open questions; buffer                              18 min
  CUT 2026-10-08: the five multiple-choice discussion questions.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 15: Neural Networks and Embeddings**

> Rumelhart, Hinton and Williams popularized backpropagation in a 1986 Nature paper.

<small>Nature 323, 533 to 536 (1986)</small>

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Tonight

- where networks came from, and why they run on graphics hardware
- a network is a **function**: a forward pass by hand, XOR
- training is **gradient descent**: one step by hand, live
- deep networks: **backpropagation**, **Adam**, **overfitting**
- **convolution** and **attention**, one output each
- **embeddings**, autoencoders, and **CLIP**'s shared space
- **coordinate networks**: one image as a function of (x, y)
- the **HW7** walk-through

Reading: [Neural Networks and Embeddings](../../textbook/neural-nets-embeddings.html)

