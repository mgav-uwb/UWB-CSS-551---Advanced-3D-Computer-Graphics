<!--
  CSS 551 · L16 · Tuesday November 24, 2026 (week 9, online): Diffusion models I.
  Plan C lecture shell (lectures/README.md). index.html mounts, in order: this file (title +
  tonight), ../../topics/diffusion-1.md (~88 min), L16-discuss.md (discussion + wrap).
  Thursday November 26 is Thanksgiving: no class, no quiz, no homework out.

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX; never two "_" on one
  markdown line outside a code fence.

  DEMO EMBEDS (all demo-full, in the topic): diffusion-image (t), diffusion-2d (steps,stochastic),
  diffusion-digits (steps), diffusion-digits (smooth), diffusion-net (steps).
  NUMBERS: tools/gen-lecture-figures-d1.mjs writes analysis/numbers-d1.json (this folder), the
  source of every computed value in L14, L15 and L16.

  Minute plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Title and tonight                                   2 min
    0:02  Diffusion models I (topic)                         88 min
    1:30  Discussion: four questions                         27 min
    1:57  Wrap                                                3 min
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 16: Diffusion Models I**

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- **destroy**: the forward process and the noise schedule
- **the denoiser**: the exact answer for a finite dataset, in four coordinates
- **learn**: the training loop, and where its loss comes from
- **sample**: DDPM and DDIM, how many steps, the ODE underneath, flow matching
- from **lookup table** to **network**: digits memorized, blended, then drawn

Reading: [Diffusion Models](../../textbook/diffusion-models.html), Sections 1 to 6

