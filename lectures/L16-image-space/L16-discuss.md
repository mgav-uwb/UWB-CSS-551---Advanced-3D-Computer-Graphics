<!--
  CSS 551 · L16 HW7 Part 3 walk-through and wrap (~5 min). Mounted AFTER the topic.
  CUT 2026-10-08: the three multiple-choice discussion questions (stripes above the limit, two errors
  with one PSNR, averaging in linear light); the freed time is buffer after a long topic.
  Re-sequenced 2026-10-25 (was L15, Thursday November 19): the HW7 walk-through and rules slides moved
  to L15-discuss.md; HW7 goes out tonight (moved from Lecture 15 on 2026-11-09); no quiz in Thanksgiving week.
  2026-11-13: HW7 Part 3 (the DCT) is walked here, after the cosine basis it needs; Parts 1 and 2
  stay in Lecture 15's walk-through (Marcel: "ok" to the split). Numbers from
  ../../homework/hw07/expected.json; the homework page governs if the two differ.
-->

## HW7, Part 3: a digit's cosine transform

Out **tonight**, due **Wednesday December 2, 11:59 PM**. Parts 1 and 2, the gradient step and the fit, were walked in Lecture 15.

```text
   3  dct2, idct2Truncated, psnr: the 20 × 20 digit 3, its k × k block
        C[0][0] = 6.85706   C[0][1] = -1.34555   C[1][0] = -0.04291
        k = 5:  PSNR 10.3045 dB          k = 8:  PSNR 16.5246 dB
```

- `dct2`: tonight's orthonormal cosine transform, 20 points instead of 8, along every row, then every column
- PSNR = 10 log₁₀(1 / MSE): the digit table's RMS errors at 25 and 64 coefficients, 0.31 and 0.15, on a log scale
- no DCT or FFT routine in the submission (`np.fft`, `scipy`); one may **check** yours

The specification, skeletons and the run-and-compare rubric: [HW7](../../homework/hw07/index.html)


---

## Wrap

- an image is a point of ℝ³ᵐⁿ; the meaningful ones form a **thin, structured sheet** with neighbors at 10 in a cube where static sits at 23
- a concept is **many-to-one**; its inverse is a distribution, and a generator must supply the missing choices

- **Read:** [The Space of Images](../../textbook/image-space.html), all sections
- **Due:** HW6, tomorrow, Wednesday November 25, 11:59 PM. **Out:** HW7, due Wednesday December 2, 11:59 PM
- No quiz this week. **Quiz 7**, on Canvas: Thursday December 3, 8 PM to Sunday December 6; Lectures 15 to 17, HW6 and HW7
