<!--
  CSS 551 · L15 · Thursday November 19, 2026 (week 8, in person): The space of images.
  Plan C lecture shell (lectures/README.md). index.html mounts, in order: this file (title +
  tonight), ../../topics/image-space.md (~82 min), L15-discuss.md (discussion, HW7 walk-through,
  wrap). Quiz 5, on paper, comes first: L12, L13, L14 and HW6.

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX; never two "_" on one
  markdown line outside a code fence.

  DEMO EMBEDS (demo-full, in the topic): diffusion-image (t), used as a PSNR meter.

  Minute plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Quiz 5, on paper                                   20 min
    0:20  Title and tonight                                   2 min
    0:22  The space of images (topic, 57 slides)             82 min
    1:44  Discussion: three questions                         9 min
    1:53  HW7 walk-through                                    5 min
    1:58  Wrap                                                2 min
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 15: The Space of Images**

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Quiz 5

**Laptops and phones away.** A pencil and the quiz sheet, nothing else.

- **20 minutes**, 5:45 to 6:05 PM: 8 multiple-choice questions, 5 points each
- **Covers**: Lecture 12, light transport, PBR and ray tracing (Tuesday, November 10); Lecture 13, path tracing (Thursday, November 12, after the midterm); Lecture 14, neural networks and embeddings (Tuesday, November 17); HW6
- Mark one letter per question in the grid on the first page; only the grid is graded


---

## Tonight

- an image is a **point** in a space too large to count, and a **function**; pixels are samples; sRGB is not light
- high dimensions: distances concentrate, the cube is all corners
- **bases**: cosine, Fourier and the data's own (PCA, eigenfaces); the convolution theorem
- what linear algebra does to images: **filters**, borders, sharpening, **pyramids**, resampling, **histograms**, noise, **JPEG**
- comparing two images: **PSNR** and **SSIM** worked, what they reward, and averaging
- the sheet of meaningful images, **measured**; inverse problems, null spaces and priors; why a concept has **no inverse**

Reading: [The Space of Images](../../textbook/image-space.html)

