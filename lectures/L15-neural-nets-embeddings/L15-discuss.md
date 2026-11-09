<!--
  CSS 551 · L15 HW7 walk-through and wrap (~7 min). Mounted by index.html AFTER the topics.
  CUT 2026-10-08: the five multiple-choice discussion questions (swap the nonlinearity, the first Adam
  step, the temperature, which network to ship, the NaN) and the Discussion header slide; the freed
  time is open questions and buffer.
  Re-sequenced 2026-10-25 (was L14): HW7 was to go out tonight (due Wednesday December 2), so the HW7
  walk-through and rules slides moved here from the image-space lecture's wrap. HW7 numbers from
  tools/gen-lecture-figures-d1.mjs (lectures/L17-diffusion-1/analysis/numbers-d1.json keys tiny, fit,
  dctPsnr); ../../homework/hw07/index.html is the specification and governs if the two differ.
  2026-11-09: HW7 goes out with Lecture 16 (Tuesday November 24, one release a week); the
  walk-through stays here, after the hand step it starts from.
-->

### HW7, and the wrap

<small>(~7 min)</small>


---

## HW7: networks and images

Out tonight, due **Wednesday December 2, 11:59 PM**. JavaScript (the WebGL track) or a Python notebook.

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

- a network is a function set by weights; training is the chain rule, one backward sweep per step
- embeddings put similar things near each other; contrastive training puts words and pictures in **one space**
- a coordinate network is one signal as a function; its encoding decides which frequencies training can reach

- **Read:** [Neural Networks and Embeddings](../../textbook/neural-nets-embeddings.html), all sections
- **Due:** HW6, Wednesday November 25, 11:59 PM. HW7 goes out Tuesday November 24, due Wednesday December 2
- **Quiz 6**, on Canvas: tonight 8 PM to Sunday November 22, 11:59 PM; Lectures 13 and 14 and HW5

