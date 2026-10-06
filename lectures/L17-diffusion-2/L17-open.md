<!--
  CSS 551 · L17, Tuesday December 1 (online): Diffusion Models II.
  Plan C (planning/css551-au26-plan-c-2026-09-29.md), week 10.

  COMPOSITION: index.html mounts L17-open.md (title + tonight), then
  ../../topics/diffusion-2.md (~98 min), then L17-discuss.md (discussion 18 min + wrap).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence; no "next time".

  Plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Opening (2 slides)                             2 min
    0:02  Diffusion models II (topic, 70 slides)        98 min
    1:40  Discussion: six questions, peer instruction   18 min
    1:58  Wrap                                           2 min
    2:00  end
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 17: Diffusion Models II**

> DDIM (2021) made the sampler deterministic and cut the steps to tens, from the same trained network.

<small>Song, Meng and Ermon, arXiv:2010.02502</small>

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **The condition**: five ways in; class and time embeddings
- **Guidance**: by hand, live, as a tilted distribution, and its repairs
- **Samplers**: flow matching, reflow, a thousand steps to four
- **Latents**: the autoencoder, the scale factor, what 8× costs
- **Text**: cross-attention by hand and at scale; editing through attention
- **Control**: ControlNet, rendered conditions, inpainting, SDEdit
- **Text to 3D**: score distillation, DreamFusion, what came after
- **Judging a generator**: FID, precision and recall, CLIP score, memorization

<small>Reading: the course text, <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 3.2 and 5 to 9.</small>

