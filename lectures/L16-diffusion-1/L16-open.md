<!--
  CSS 551 · L16 · Tuesday November 24, 2026 (week 9, online): Diffusion models I.
  Plan C lecture shell (lectures/README.md). index.html mounts, in order: this file (title +
  tonight), ../../topics/diffusion-1.md (~100 min), L16-discuss.md (discussion + wrap).
  Thursday November 26 is Thanksgiving: no class and no homework out; Quiz 6 is on Canvas, Nov 26 to 29 (L15, HW7).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX; never two "_" on one
  markdown line outside a code fence.

  DEMO EMBEDS (all demo-full, in the topic): diffusion-image (t), diffusion-2d (t), diffusion-2d (steps,stochastic),
  diffusion-digits (steps), diffusion-digits (smooth), diffusion-net (steps).
  NUMBERS: tools/gen-lecture-figures-d1.mjs writes analysis/numbers-d1.json (this folder), the
  source of every computed value in L14, L15 and L16.

  Minute plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Title and tonight                                   2 min
    0:02  Diffusion models I (topic, 73 slides)             100 min
    1:42  Discussion: four questions                         16 min
    1:58  Wrap                                                2 min
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 16: Diffusion Models I**

> DDPM (2020) used T = 1000 noise steps, and sampling ran the network once per step.

<small>Ho, Jain and Abbeel, arXiv:2006.11239</small>

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- where diffusion sits among the **generative model families**
- **destroy**: the forward process in code and by hand, the schedule, the noise shell, the terminal-SNR pitfall
- **the denoiser**: the exact answer for a finite dataset, derived; its Gaussian case; Tweedie; four coordinates; the score field
- **learn**: the training loop, one example by hand, the weights counted, the loss's weighting and floor, and where it comes from
- **sample**: DDIM and DDPM worked, the sampler in code, its cost, the ODE and Euler, inversion, slerp
- from **lookup table** to **network**: digits memorized, blended, then drawn; three sources of error; 2015 to 2022

Reading: [Diffusion Models](../../textbook/diffusion-models.html), Sections 1 to 6

