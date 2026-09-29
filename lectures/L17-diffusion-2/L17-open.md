<!--
  CSS 551 · L17, Tuesday December 1 (online): Diffusion Models II.
  Plan C (planning/css551-au26-plan-c-2026-09-29.md), week 10.

  COMPOSITION: index.html mounts L17-open.md (title + tonight), then
  ../../topics/diffusion-2.md (~85 min), then L17-discuss.md (discussion 30 min + wrap).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX;
  never two "_" on one markdown line outside a code fence; no "next time".

  Plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Opening                                        2 min
    0:02  Diffusion models II (topic)                   85 min
    1:27  Discussion: four questions, peer instruction  28 min
    1:55  Wrap                                           3 min
    1:58  end
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 17: Diffusion Models II**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **The condition**: five ways a label, a caption or an image reaches the denoiser
- **Guidance**: classifier-free guidance by hand, live, and what it costs in saturated pixels
- **Flow matching**: the straight-line version, one Euler step by hand
- **Latent diffusion**: the autoencoder, and why a 512×512 image became 16,384 numbers
- **Text in the class slot**: cross-attention by hand
- **ControlNet**: the pipeline's depth buffer as a condition, and why it must be linearized first
- **Text to 3D**: score distillation, one step by hand, and what it converges to
- **Judging a generator**: FID and its two blind spots

<small>Reading: the course text, <a href="../../textbook/diffusion-models.html">Diffusion Models</a>, Sections 3.2 and 5 to 9.</small>

