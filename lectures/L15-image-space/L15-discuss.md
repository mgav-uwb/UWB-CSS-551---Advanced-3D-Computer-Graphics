<!--
  CSS 551 · L15 HW7 walk-through and wrap (~7 min). Mounted AFTER the topic.
  CUT 2026-10-08: the three multiple-choice discussion questions (stripes above the limit, two errors
  with one PSNR, averaging in linear light); the freed time is buffer after a long topic.
  HW7 numbers from tools/gen-lecture-figures-d1.mjs (lectures/L16-diffusion-1/analysis/numbers-d1.json
  keys tiny, fit, dctPsnr). The HW7 slide quotes the plan's HW7 content
  (planning/css551-au26-plan-c-2026-09-29.md, Section 4); ../../homework/hw07/index.html is the
  specification and governs if the two differ.
-->

### HW7, and the wrap

<small>(~7 min)</small>


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

The specification, skeletons and the run-and-compare rubric: [HW7](../../homework/hw07/index.html)


---

## HW7: tracks and what is off limits

- **JavaScript** (the WebGL track's language): plain arrays and loops; any machine-learning or signal-processing library is off limits
- **Python notebook**: NumPy arrays and products are allowed; `scipy`, `torch`, `jax` and any autodiff, `np.fft` and any DCT routine are off limits
- a library routine may be used to **check** your own result, never in the submission
- graded on the page's inputs and on a hidden input set: a check scores only when both match

Specification and skeletons: [HW7](../../homework/hw07/index.html)


---

## Wrap

- an image is a point of ℝ³ᵐⁿ; the meaningful ones form a **thin, structured sheet** with neighbors at 10 in a cube where static sits at 23
- a concept is **many-to-one**; its inverse is a distribution, and a generator must supply the missing choices

- **Read:** [The Space of Images](../../textbook/image-space.html), all sections
- **Due:** HW7, Wednesday November 25, 11:59 PM
- **Quiz 6**: on Canvas, Thursday November 26, 12:00 AM to Sunday November 29, 11:59 PM; 20 minutes, alone, no notes; on tonight's lecture and HW7

