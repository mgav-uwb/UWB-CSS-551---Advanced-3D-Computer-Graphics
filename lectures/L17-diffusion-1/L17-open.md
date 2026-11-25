<!--
  CSS 551 · L17 · Tuesday December 1, 2026 (week 10, online): Diffusion models I.
  Plan C lecture shell (lectures/README.md). index.html mounts, in order: this file (title +
  tonight), ../../topics/diffusion-1.md (~90 min), L17-discuss.md (wrap), then
  ../../topics/diffusion-1-supplement.md (time permitting, or reading).
  Re-sequenced 2026-10-25 (was L16, Tuesday November 24, the week of Thanksgiving): the first meeting
  after the Thanksgiving break; diffusion models II follows on Thursday.

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX; never two "_" on one
  markdown line outside a code fence.

  DEMO EMBEDS (all demo-full, in the topic): diffusion-image (t), diffusion-2d (t), diffusion-2d (steps,stochastic),
  diffusion-digits (steps), diffusion-digits (smooth), diffusion-net (steps).
  NUMBERS: tools/gen-lecture-figures-d1.mjs writes analysis/numbers-d1.json (this folder), the
  source of every computed value in L15, L16 and L17.

  Minute plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Title and tonight                                   2 min
    0:02  Diffusion models I (topic, 38 slides)              90 min
    1:32  Wrap                                                2 min
    1:34  Questions and buffer; the supplement if time       26 min
  CUT 2026-10-08: the four discussion questions; their 16 minutes are questions and buffer.
  EDIT 2026-11-24 LESS MATH (Marcel: "PCA, eigenvalues, hilbert spaces... way over the math level of
  the class. can the following lectures use less math?"): the topic is a conceptual core of 38 slides;
  its derivations and worked numbers are topics/diffusion-1-supplement.md, mounted after the wrap.
  Tonight's bullets follow. DDPM, DDIM and HW are spelled out at first use.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 17: Diffusion Models I**

> DDPM (denoising diffusion probabilistic models, 2020) used 1000 noise steps, and sampling ran the network once per step.

<small>Ho, Jain and Abbeel, arXiv:2006.11239</small>

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- where diffusion sits among the **generative model families**
- **destroy**: mix the picture with noise on a schedule; nothing is learned
- **the denoiser**: the best guess for a finite dataset is a weighted average of it; it blurs at high noise and copies at low noise
- **learn**: a network trained by plain regression to make that guess
- **sample**: re-noise the guess a little less, step by step; DDIM (denoising diffusion implicit models) and DDPM; steps are the cost
- from **lookup table** to **network**: digits copied, blended, then drawn

Reading: [Diffusion Models](../../textbook/diffusion-models.html), Sections 1 to 6

