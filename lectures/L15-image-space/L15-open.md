<!--
  CSS 551 · L15 · Thursday November 19, 2026 (week 8, in person): The space of images.
  Plan C lecture shell (lectures/README.md). index.html mounts, in order: this file (title +
  tonight), ../../topics/image-space.md (~78 min), L15-discuss.md (discussion, HW7 walk-through,
  wrap). Quiz 6 follows in the last 20 minutes (weeks-8 lectures L14 and L15, and HW6).

  reveal.js: FLAT deck; notes follow "Note:"; plain-unicode math, no KaTeX; never two "_" on one
  markdown line outside a code fence.

  DEMO EMBEDS (demo-full, in the topic): diffusion-image (t), used as a PSNR meter.

  Minute plan (120 min, Thu 5:45-7:45 PM in person):
    0:00  Title and tonight                                   2 min
    0:02  The space of images (topic)                        78 min
    1:20  Discussion: two questions                          12 min
    1:32  HW7 walk-through                                    6 min
    1:38  Wrap                                                2 min
    1:40  Quiz 6, on paper                                   20 min
-->

## CSS 551

### Advanced 3D Computer Graphics

**Lecture 15: The Space of Images**

<small>Autumn 2026 · Thu 5:45–7:45 PM (in person) · Dr. Marcel Gavriliu</small>


---

## Tonight

- an image is a **point**, and a **function**; sampling connects the two
- **bases**: the same image in cosine and Fourier coordinates
- what linear algebra does to images: **filters**, **pyramids**, **histograms**, **JPEG**
- comparing two images: **PSNR** and **SSIM**, and what they reward
- the sheet of meaningful images, **measured** on 2,000 digits
- why a concept has **no inverse**, and what must supply the missing choices

Reading: [The Space of Images](../../textbook/image-space.html)

