<!--
  CSS 551 · L02 discussion and wrap (~30 min). Five peer-instruction questions;
  answers and worked solutions in the notes only.

  NUMBERS, node-checked (textbook/figures/numbers-history.json and the history
  chapter's exercises):
    Q1  74 min = 4,440 s against 1/200 s: factor 888,000, log2 = 19.76, about
        19.8 doublings in 38 years. Distractors: 5.9 (log10 of the film-over-game
        ratio, orders of magnitude), 12.1 (log2 4,440: compared with one second,
        the 200 frames per second dropped), 38 (the years).
    Q2  1000/90 = 11.1 ms per frame, 5.6 ms per view (two views). Distractors:
        16.7 (60 Hz), 11.1 (per frame), 2.8 (halved twice).
    Q3  mip chain 1024 down to 1: extra = sum over k of 4^-k = 0.3333, 33 %.
        Distractors: 25 % (only the first level), 50 % (halving, the 1D sum),
        100 % (doubling).
    Q4  512 x 512 x 3 = 786,432 against 64 x 64 x 4 = 16,384: 48. Distractors:
        8 (the side ratio), 64 (pixels only, channels ignored), 192 (the
        latent's 4 channels ignored).
    Q5  premultiplied F = (0.3, 0.3, 0), alpha 0.6, over B = (0, 0, 0.5, 1):
        F + 0.4 B = (0.3, 0.3, 0.2). Distractors: (0.18, 0.18, 0.2) (F multiplied
        by alpha again), (0.3, 0.3, 0.3) (B weighted by alpha), (0.3, 0.3, 0.5)
        (B not attenuated). topics/film-pipeline.md, "Over, by hand".

  reveal.js: FLAT; notes follow "Note:"; never two "_" on one line outside a fence.
-->

### Discussion

<small>(~30 min) · vote · argue in pairs for two minutes · vote again</small>


---

## Question 1: Whitted's frame, today

Whitted's 1980 ray-traced image took **74 minutes**. Suppose the same algorithm renders the same image today at **200 frames per second**. How many **doublings** of hardware speed is that?

- **A.** 5.9
- **B.** 12.1
- **C.** 19.8
- **D.** 38


---

## Question 2: the headset's budget

A VR headset refreshes at **90 Hz** and renders **one image per eye** each frame. What is the time budget **per image**?

- **A.** 16.7 ms
- **B.** 11.1 ms
- **C.** 5.6 ms
- **D.** 2.8 ms


---

## Question 3: what mipmaps cost

A **1024 × 1024** texture gets a full mipmap chain: 512 × 512, 256 × 256, and so on down to 1 × 1. How much **extra memory** does the chain add, as a fraction of the original?

- **A.** 25 %
- **B.** 33 %
- **C.** 50 %
- **D.** 100 %


---

## Question 4: why latent diffusion fits

Latent diffusion runs its walk on a **64 × 64 × 4** latent instead of a **512 × 512 × 3** RGB image. By what factor does that shrink the numbers per step?

- **A.** 8
- **B.** 48
- **C.** 64
- **D.** 192


---

## Question 5: one pixel, composited

A render layer's pixel, **premultiplied**, is F = (0.30, 0.30, 0.00) with α = **0.6**. It goes **over** an opaque background pixel B = (0.00, 0.00, 0.50). What color comes out?

- **A.** (0.18, 0.18, 0.20)
- **B.** (0.30, 0.30, 0.20)
- **C.** (0.30, 0.30, 0.30)
- **D.** (0.30, 0.30, 0.50)


---

## Wrap

Each era changed what a scene **is** (triangles, shader programs, scans, Gaussians, network weights) while the machinery underneath (cameras, rasterization, sampling, integrals, compositing) carried over unchanged. Ideas wait a median of **22 years** for the hardware budget to reach them, which makes today's research the roadmap.

- **Read**: <a href="../../textbook/history-of-graphics.html">A History of Computer Graphics</a>, Sections 5 to 10; <a href="../../textbook/unity-basics.html">Unity for This Course</a>, Sections 1 to 7 and 11; <a href="../../textbook/interaction.html">Interactive Systems</a>, Sections 1 to 3
- **Quiz 1**: Thursday, the last 20 minutes, on this lecture and Thursday's
- **Due**: nothing yet; HW1 goes out Thursday

