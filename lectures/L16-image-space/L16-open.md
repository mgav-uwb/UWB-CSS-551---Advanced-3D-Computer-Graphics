<!--
  CSS 551 · L16 · Tuesday November 24, 2026 (week 9, online): The space of images.
  Plan C lecture shell (lectures/README.md). index.html mounts, in order: this file (title +
  tonight), ../../topics/image-space.md (~82 min), L16-discuss.md (HW7 Part 3 and the wrap).
  Re-sequenced 2026-10-25 (was L15, Thursday November 19, opened by paper Quiz 5): a Tuesday online
  meeting with no quiz; the HW7 walk-through moved to Lecture 15; HW7 goes out tonight (moved here 2026-11-09).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX; never two "_" on one
  markdown line outside a code fence.

  DEMO EMBEDS (demo-full, in the topic): diffusion-image (t), used as a PSNR meter.

  Minute plan (120 min, Tue 5:45-7:45 PM synchronous online):
    0:00  Title and tonight                                   2 min
    0:02  The space of images (topic, 53 slides)             82 min
    1:24  HW7 Part 3 walk-through (Parts 1 and 2 in L15)      3 min
    1:27  Wrap                                                2 min
    1:29  Questions, HW6 and HW7 help; buffer                31 min
  CUT 2026-10-08: the three multiple-choice discussion questions and four topic Check slides.
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 16: The Space of Images**

> A 256 × 256 RGB image is a single point in a space of 196,608 dimensions.

<small>computed: 256 × 256 × 3</small>

<small>Autumn 2026 · Tue 5:45–7:45 PM (online) · Dr. Marcel Gavriliu</small>


---

## Tonight

- an image is a **point** in a space too large to count, and a **function**; pixels are samples; sRGB is not light
- high dimensions: distances concentrate, the cube is all corners
- **bases**: cosine, Fourier and the data's own (PCA, eigenfaces); the convolution theorem
- what linear algebra does to images: **filters**, borders, sharpening, **pyramids**, resampling, **histograms**, noise, **JPEG**
- comparing two images: **PSNR** and **SSIM** worked, what they reward, and averaging
- the sheet of meaningful images, **measured**; inverse problems, null spaces and priors; why a concept has **no inverse**

Reading: [The Space of Images](../../textbook/image-space.html)
