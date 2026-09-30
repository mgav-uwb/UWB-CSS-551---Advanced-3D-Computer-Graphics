<!--
  CSS 551 · L14 · Tuesday November 17, 2026 (week 8, online): Neural networks and embeddings.
  Plan C lecture shell (lectures/README.md). index.html mounts, in order: this file (title +
  tonight), ../../topics/neural-nets-embeddings.md (~88 min), L14-discuss.md (discussion + wrap).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX; never two "_" on one
  markdown line outside a code fence.

  DEMO EMBEDS (both demo-full, in the topic): mlp-fit (epochs,hidden), embed-map (highlight).

  Minute plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Title and tonight                                   2 min
    0:02  Neural networks and embeddings (topic, 52 slides)  88 min
    1:30  Discussion: five questions, vote, pairs, vote       27 min
    1:57  Wrap                                                 3 min
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 14: Neural Networks and Embeddings**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- where networks came from, and why they run on graphics hardware
- a network is a **function**: a forward pass by hand, XOR, and why it needs a nonlinearity
- training is **gradient descent**: losses, one step by hand, a gradient check, the code, then live
- deep networks: mini-batches, the **backward sweep**, vanishing gradients, initialization, normalization, **Adam**, schedules, **overfitting**
- the two layer types: **convolution** and **attention**, one output each, their costs, and how a network is told the time
- **embeddings**: vectors for concepts, read from the course's own network
- autoencoders and **VAEs**; **CLIP**: two encoders, one space, the contrastive loss, zero-shot classification

Reading: [Neural Networks and Embeddings](../../textbook/neural-nets-embeddings.html)

