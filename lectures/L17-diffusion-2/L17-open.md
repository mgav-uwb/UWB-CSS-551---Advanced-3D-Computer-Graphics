<!--
  CSS 551 · L17, Tuesday December 1 (online): Diffusion Models II.
  Plan C (planning/css551-au26-plan-c-2026-09-29.md), week 10.

  COMPOSITION: index.html mounts L17-open.md (title + tonight), then
  ../../topics/diffusion-2.md (~88 min), then L17-discuss.md (discussion 30 min + wrap).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence; no "next time".

  Plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Opening                                        2 min
    0:02  Diffusion models II (topic, 52 slides)        88 min
    1:30  Discussion: six questions, peer instruction   27 min
    1:57  Wrap                                           2 min
    1:59  end
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 17: Diffusion Models II**

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

