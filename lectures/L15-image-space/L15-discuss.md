<!--
  CSS 551 · L15 discussion, HW7 walk-through and wrap (~20 min). Mounted AFTER the topic.
  Two peer-instruction questions (vote, argue in pairs, vote again, then work it); answers
  ONLY in the Note: blocks. Numbers from tools/gen-lecture-figures-d1.mjs
  (lectures/L16-diffusion-1/analysis/numbers-d1.json keys alias, psnrQ, tiny, fit, dctPsnr) and
  textbook/image-space.html Section 3. The HW7 slide quotes the plan's HW7 content
  (planning/css551-au26-plan-c-2026-09-29.md, Section 4); ../../homework/hw07/index.html is the
  specification and governs if the two differ.
-->

### Discussion

<small>(~20 min, then Quiz 6)</small>


---

## Question 1: stripes above the limit

Vertical stripes f(u) = ½ + ½cos(2π·6·u), **six periods** across, sampled at 8 pixel centers u = (i − ½)/8. What does the raster show?

- **A.** six periods of stripes
- **B.** two periods of stripes
- **C.** uniform gray
- **D.** four periods of stripes


---

## Question 2: two errors, one number

Render A differs from the reference by a **uniform offset of 0.05** in every pixel. Render B matches exactly except that **one pixel in a hundred** is off by **0.5**. Values in [0, 1]. Their PSNRs:

- **A.** A 26.0 dB, B 26.0 dB
- **B.** A 26.0 dB, B 46.0 dB
- **C.** A 13.0 dB, B 26.0 dB
- **D.** A 26.0 dB, B 6.0 dB


---

## HW7: networks and images

Out tonight, due **Wednesday November 25, 11:59 PM**. JavaScript (the WebGL track) or a Python notebook.

```text
   1  forward, gradients, sgdStep: the tiny net, x = 0.4, y = 0.3, lr = 0.1
        before:  f = 0.61324, loss 0.09812        after one step:  f = 0.48142
   2  the fit: 12 hidden units on the course's 12 wave samples, lr = 0.05
        loss after 400 steps: 0.008355
   3  dct2, idct2Truncated, psnr: the 20 × 20 digit 3, rebuilt from its k × k block
        C[0][0] = 6.85706;  k = 5: PSNR 10.3045 dB;  k = 8: PSNR 16.5246 dB
```

- **off limits**: in JavaScript, any machine-learning or signal-processing library (plain arrays and loops); in Python, `scipy`, `torch`, `jax` and any autodiff, `np.fft` and any DCT routine (NumPy arrays and products are allowed)
- specification, skeletons and the run-and-compare rubric: [HW7](../../homework/hw07/index.html)


---

## Wrap

- an image is a point of ℝ³ᵐⁿ; the meaningful ones form a **thin, structured sheet** with neighbors at 10 in a cube where static sits at 23
- a concept is **many-to-one**; its inverse is a distribution, and a generator must supply the missing choices

**Read:** [The Space of Images](../../textbook/image-space.html), all sections

**Due:** HW7, Wednesday November 25, 11:59 PM · **Now:** Quiz 6

