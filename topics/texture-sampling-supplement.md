<!--
  CSS 551 · TOPIC DECK (supplement): Texture sampling, further (~7 min, 5 slides).
  Mounted after the wrap of a lecture that mounts texture-sampling.md, and covered time permitting:
  no homework or quiz needs it, and every graded idea is in the topic. Its slides are the
  texture-sampling topic's further material, in the topic's order; textbook/texture-mapping.html
  covers them (compression, normal maps and tangent space, procedural textures, cube maps).

  TEACHES: BC1 compression (4 bits per texel, fixed-rate blocks); normal maps in the tangent frame
           (decode, normalize, to world); a texture as a function; cube maps (face −Y, texel (176, 48)).
  NEEDS:   texture-sampling.md, mounted before it (the lookup, mipmaps, bump mapping); the
           illumination topic (the reflected direction R).
  DEMOS:   none.
  FIGURES: ../../textbook/figures/tex-bc1.png, tex-cubemap.svg (textbook generators).
  NUMBERS: textbook/figures/numbers-surfaces.json (tex.bc1, tex.tangent, tex.cubemap); every
           printed number recomputed in node on 2026-11-10.
  EDIT 2026-11-10: split from texture-sampling.md (L12 runs out before its graded texture slides at
  the room's pace). Normal maps: the decode gives (0.459, 0.459, 0.765), and the printed
  (0.457, 0.457, 0.762) is that vector normalized; the slide now shows both steps.

  reveal.js: FLAT; notes follow "Note:" and stay plain text. Display math is a raw <div class="tex">
  block typeset by MathJax (lib/deck-math.js; TeX inside, the ASCII form as aria-label, no blank line
  inside); inline math is a code span written `$...$`. Code identifiers stay plain code spans. Never
  two "_" on one markdown line outside a code fence, code span or tex block; paths relative to the
  lecture page.
-->

### Supplement: texture sampling, further

<small>(~7 min, time permitting) · reading: <a href="../../textbook/texture-mapping.html">Texture Mapping</a>, the sections on compression, normal maps, procedural textures and cube maps</small>


---

## Texture compression: 4 bits per texel

GPUs sample **compressed** textures directly. BC1 (DXT1) stores each 4×4 block as two colors and sixteen 2-bit indices:

<div class="tex" style="font-size:0.72em" role="img" aria-label="one block: 2 endpoint colors in 5:6:5 bits (32 bits) + 16 × 2-bit indices (32 bits) = 64 bits
palette: the two endpoints and two colors between them at ⅓ and ⅔
64 bits / 16 texels = 4 bits per texel,  against 24 uncompressed:   6 times smaller">
\[ \begin{gathered} \underbrace{2 \times 16}_{\text{endpoints, 5:6:5}} + \underbrace{16 \times 2}_{\text{indices}} = 64 \text{ bits per block} \qquad \text{palette: } c_0,\ c_1,\ \tfrac23 c_0 + \tfrac13 c_1,\ \tfrac13 c_0 + \tfrac23 c_1 \\[6pt] \tfrac{64}{16} = 4 \text{ bits per texel, against } 24 \text{ uncompressed: } 6 \text{ times smaller} \end{gathered} \]
</div>

<img src="../../textbook/figures/tex-bc1.png" class="media-shot" style="height: 110px; image-rendering: pixelated;" alt="Two 4 by 4 blocks of colored squares magnified: the original, a smooth gradient from blue-purple to pink, and the BC1 reconstruction, the same gradient in four steps.">

The chapter's block: RMS error 8.1 codes (of 255), worst texel 20.4. Fixed-rate blocks mean the GPU can find any texel's block by arithmetic: random access, unlike JPEG.


---

## Normal maps and tangent space

A normal map stores a tilted normal per texel, in the triangle's own **tangent frame** (T along u, B along v, N out of the surface). The 2×2 grid's triangle (0, 3, 1): `$T = (1, 0, 0)$`, `$B = (0, 0, 1)$`, `$N = (0, 1, 0)$`, handedness −1.

<div class="tex" style="font-size:0.72em" role="img" aria-label="a texel stores RGB (186, 186, 225)  →  decode c/255·2 − 1  →  (0.459, 0.459, 0.765)  →  normalize  →  tangent-space (0.457, 0.457, 0.762)
to world:  0.457·T + 0.457·B + 0.762·N  =  (0.457, 0.762, 0.457)">
\[ \begin{gathered} (186,\ 186,\ 225) \;\xrightarrow{\ 2c/255 - 1\ }\; (0.459,\ 0.459,\ 0.765) \;\xrightarrow{\ \text{normalize}\ }\; (0.457,\ 0.457,\ 0.762) \\[6pt] \text{to world: } 0.457\,T + 0.457\,B + 0.762\,N = (0.457,\ 0.762,\ 0.457) \end{gathered} \]
</div>

Eight-bit codes do not decode to a unit vector exactly (length 1.003 here), so the shader normalizes. Tangent space makes one normal map reusable on any surface, and it is why normal maps look **blue**: most normals point along +N, the blue channel.


---

## A texture can be a function

Every texture so far was an **image**: stored texels. But sampling only needs a **color for a `(u,v)`**, and a **function** supplies that as well as a lookup table does:

<div class="tex" style="font-size:0.8em" role="img" aria-label="image texture:       color = imageLookup(u, v)      (read stored texels)
procedural texture:  color = f(u, v)                (compute from math)">
\[ \begin{aligned} \text{image texture:} &\quad \text{color} = \text{imageLookup}(u, v) && \text{read stored texels} \\ \text{procedural texture:} &\quad \text{color} = f(u, v) && \text{compute it} \end{aligned} \]
</div>

- **no memory** for pixels: just the formula; never blocky
- right for **regular** patterns (checker, brick) and **noise** (marble, wood, clouds)
- the trade: an **arbitrary** picture (a face) is easier to paint than to derive

The placement demo's checker is exactly this: a function of `(u,v)`, the parity of `$\lfloor 8u \rfloor + \lfloor 8v \rfloor$`, precomputed into a texture.


---

## Cube maps: a texture indexed by direction

<img src="../../textbook/figures/tex-cubemap.svg" class="media-shot" style="max-height: 190px;" alt="a direction vector from the center of a cube, hitting the minus-Y face at a marked texel">

Six square faces around the origin; a **direction** picks a face by its largest component, then a texel:

<div class="tex" style="font-size:0.72em" role="img" aria-label="d = (0.303, −0.808, 0.505):   largest |component| is y, negative   →   face −Y
s, t = (sc / |ma| + 1) / 2, (tc / |ma| + 1) / 2 = (0.688, 0.188)   →   texel (176, 48) of 256
512 × 512 × 6 faces × 3 bytes = 4.7 MB;  with mips 6.3 MB">
\[ \begin{gathered} d = (0.303,\ {-0.808},\ 0.505): \ \text{largest } |d_i| \text{ is } y \text{, negative} \;\to\; \text{face } {-Y} \\[6pt] (s, t) = \left(\tfrac{s_c/|m_a| + 1}{2},\ \tfrac{t_c/|m_a| + 1}{2}\right) = (0.688,\ 0.188) \;\to\; \text{texel } (176,\ 48) \text{ of } 256 \\[6pt] 512 \times 512 \times 6 \times 3 \text{ bytes} = 4.7 \text{ MB}, \quad \text{with mips } 6.3 \text{ MB} \end{gathered} \]
</div>

Used for skies, reflections (look up the reflected direction R), and the lighting of image-based and physically based rendering.
