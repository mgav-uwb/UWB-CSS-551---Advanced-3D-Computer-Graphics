<!--
  CSS 551 · L14 · Tuesday November 17, 2026 (week 8, online): Neural networks and embeddings.
  Plan C lecture shell (lectures/README.md). index.html mounts, in order: this file (title +
  tonight), ../../topics/neural-nets-embeddings.md (~88 min), L14-discuss.md (discussion + wrap).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX; never two "_" on one
  markdown line outside a code fence.

  DEMO EMBEDS (both demo-full, in the topic): mlp-fit (epochs,hidden), embed-map (highlight).

  Minute plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Title and tonight                                   2 min
    0:02  Neural networks and embeddings (topic)             88 min
    1:30  Discussion: four questions, vote, pairs, vote       27 min
    1:57  Wrap                                                 3 min
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 14: Neural Networks and Embeddings**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- a network is a **function**: a forward pass by hand, and why it needs a nonlinearity
- training is **gradient descent**: one step by hand, then live
- deep networks: the **backward sweep** through layers, **Adam**, **overfitting**
- the two layer types: **convolution** and **attention**, one output each
- **embeddings**: vectors for concepts, read from the course's own network
- **CLIP**: two encoders, one space, and the contrastive loss

Reading: [Neural Networks and Embeddings](../../textbook/neural-nets-embeddings.html)

