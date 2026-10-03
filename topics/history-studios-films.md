<!--
  CSS 551 · TOPIC DECK (2026-10-03): CGI studios and films (~9 min,
  9 slides). Mounted by lectures/L02-big-picture-2/, before
  topics/film-pipeline.md.

  TEACHES: the chapter's Section 10 highlights: the first studios (III, MAGI,
  Abel, Digital Effects, Digital Productions, the Omnibus collapse);
  Lucasfilm, ILM and Pixar; the animation studios; the visual-effects houses;
  what the studios contributed (renderers, products, papers); the fifteen
  seminal films with their firsts, on three slides with frames.
  SOURCE: planning/history-draft/history-of-graphics.html (v0.5) Section 10;
    supplements/studios-and-films.html for the longer account. Frames are
    fair-use items (manifest basis "fair-use"), credited "title, year · owner ·
    fair use".
  IMAGE PATHS: relative to the lecture page: ../../topics/media/history/.

  reveal.js: FLAT; notes follow "Note:"; no math; never two "_" on one line
  outside a code fence.
-->

### CGI studios and films

<small>(~9 min): who made the frames, and fifteen films with their firsts</small>


---

## The first studios, 1970s to 1987

<div class="cols"><div class="txt">

- the first commercial computer-generated imagery (CGI): **Information International Inc. (III)**, a scanner maker: the pixelated robot's-eye view of *Westworld* (1973), with John Whitney Jr. and Gary Demos
- **MAGI** (Mathematical Applications Group Inc.): a ray-casting program for nuclear radiation exposure turned into **SynthaVision**, one of the first ray-traced renderers
- *Tron* (1982): the work divided among **MAGI, III, Robert Abel and Associates, Digital Effects**
- **Digital Productions** (Whitney and Demos), built around a **Cray** supercomputer: about 25 minutes of spaceships for *The Last Starfighter* (1984)
- the machines outran the business: **Omnibus** bought Digital Productions and Abel in 1986; all three closed in 1987; their staff founded **Rhythm & Hues** and **Side Effects Software** (Houdini)

</div><div class="pic">
<img src="../../topics/media/history/commons-cray-xmp.jpg" alt="A Cray X-MP supercomputer" style="max-height: 360px;">
<small class="credit">National Security Agency · public domain</small>
</div></div>

<small class="orgs">III, MAGI, Robert Abel and Associates, Digital Effects, Digital Productions, Omnibus Computer Graphics, Rhythm & Hues, Side Effects Software</small>


---

## Lucasfilm, ILM and Pixar

<div class="cols"><div class="txt">

- **1975**: George Lucas founds **Industrial Light & Magic (ILM)** for *Star Wars*
- **1979**: Lucasfilm hires **Ed Catmull** from NYIT to start a computer division; its papers defined 1980s rendering: particle systems, the A-buffer, distributed ray tracing, shade trees, alpha compositing, Reyes
- **1982**: the Genesis sequence of *Star Trek II*
- **1986**: Steve Jobs pays $5 million for the division's technology and puts $5 million into the company it became, **Pixar**; Pixar sells hardware and RenderMan while **John Lasseter**'s group makes shorts
- **1995**: *Toy Story*, the first feature made entirely with computer animation
- Disney buys Pixar (2006) and Lucasfilm with ILM (2012)

</div><div class="pic">
<img src="../../topics/media/history/film-toy-story.jpg" alt="Woody and Buzz Lightyear in Toy Story">
<small class="credit"><em>Toy Story</em>: Woody and Buzz, 1995 · Pixar · fair use</small>
</div></div>

<small class="orgs">Lucasfilm, Industrial Light & Magic, Pixar, The Walt Disney Company</small>


---

## Animation studios

<div class="cols"><div class="txt">

- **Disney** with Pixar: **CAPS** (Computer Animation Production System): digital ink, paint and compositing; *The Rescuers Down Under* (1990) made entirely with it; *Beauty and the Beast* (1991), drawn characters in a 3D ballroom
- **Walt Disney Animation Studios**: its own path tracer, **Hyperion**, for every film since *Big Hero 6* (2014)
- **Pacific Data Images (PDI)** (1980): *Antz* (1998), *Shrek* (2001, the first Academy Award for Best Animated Feature), as PDI/DreamWorks
- **Blue Sky Studios** (1987, MAGI veterans): a ray tracer with physically based light, *Ice Age* (2002); closed by Disney in 2021
- **Illumination** (with Mac Guff, Paris) and **Animal Logic** (Sydney)

</div><div class="pic">
<img src="../../topics/media/history/film-frozen.jpg" alt="A snow scene from Frozen">
<small class="credit"><em>Frozen</em>: snow, 2013 · Walt Disney Animation Studios · fair use</small>
</div></div>

<small class="orgs">Walt Disney Animation Studios, Pixar, PDI/DreamWorks, Blue Sky Studios, Illumination, Mac Guff, Animal Logic</small>


---

## Visual-effects houses

<div class="cols"><div class="txt">

- **ILM**: the stained-glass knight (1985), the water creature of *The Abyss* (1989), the T-1000 (1991), the dinosaurs of *Jurassic Park* (1993); **StageCraft**, a stage walled with light-emitting diode (LED) screens, for *The Mandalorian* (2019)
- **Digital Domain** (1993): the ship and digital passengers of *Titanic* (1997), the aged face of *Benjamin Button* (2008)
- **Weta Digital** (1993, now Wētā FX): **Massive** crowds, Gollum from Andy Serkis's performance, underwater capture for *Avatar: The Way of Water* (2022)
- **Sony Pictures Imageworks**: co-developed **Arnold**, *Monster House* (2006)
- **Framestore**: actors of *Gravity* (2013) lit by LED panels showing the rendered scene
- **Double Negative**: the black hole of *Interstellar* (2014), light traced through curved spacetime

</div><div class="pic">
<img src="../../topics/media/history/film-interstellar.png" alt="The black hole Gargantua from Interstellar, with its accretion disk bent by gravity">
<small class="credit"><em>Interstellar</em>: Gargantua, 2014 · Warner Bros. and Paramount Pictures · fair use</small>
</div></div>

<small class="orgs">ILM, Digital Domain, Weta Digital, Sony Pictures Imageworks, Framestore, Double Negative</small>


---

## What the studios contributed

- **renderers**, written when none existed at their scale: Reyes and RenderMan (Lucasfilm, Pixar), CGI Studio (Blue Sky), Arnold (Sony Pictures Imageworks with Solid Angle), Hyperion (Disney), Manuka (Weta)
- **products**: Wavefront, co-founded by Abel's programmer Bill Kovacs; Alias and Wavefront merged and shipped **Maya** (1998); **Houdini** from the Omnibus collapse; RenderMan, in 2001 the first software to receive an Oscar statuette
- **papers**: particle systems, the compositing algebra, subdivision surfaces in production, the material point method for snow (*Frozen*, 2013), Disney's principled reflectance model, all first published as SIGGRAPH papers or courses written inside studios


---

## Fifteen films and their firsts, 1973 to 1985

<div class="films">

| year | film | studio | first or landmark |
| --- | --- | --- | --- |
| 1973 | *Westworld* | III | digital image processing in a feature |
| 1976 | *Futureworld* | III; Catmull, Parke | among the first 3D computer-generated images in a feature |
| 1982 | *Tron* | MAGI, III, Abel, Digital Effects | first extensive use of 3D computer graphics in a feature |
| 1982 | *Star Trek II* | Lucasfilm | Genesis: one of the earliest all-computer-generated sequences |
| 1984 | *The Last Starfighter* | Digital Productions | computer-generated spaceships in place of models, on a Cray |
| 1985 | *Young Sherlock Holmes* | ILM, Lucasfilm | stained-glass knight, cited as the first all-computer-generated character |

</div>

<div class="filmrow">
<div><img src="../../topics/media/history/film-young-sherlock.jpg" alt="The stained-glass knight from Young Sherlock Holmes" style="max-height: 150px;"><small class="credit"><em>Young Sherlock Holmes</em>: the stained-glass knight, 1985 · Paramount Pictures · fair use</small></div>
</div>


---

## Fifteen films and their firsts, 1989 to 1995

<div class="films">

| year | film | studio | first or landmark |
| --- | --- | --- | --- |
| 1989 | *The Abyss* | ILM | water pseudopod: a refracting computer-generated creature in live action |
| 1990 | *The Rescuers Down Under* | Disney (CAPS) | first feature entirely with digital ink, paint and compositing |
| 1991 | *Terminator 2* | ILM | liquid-metal T-1000: a lead character made partly with computer graphics |
| 1993 | *Jurassic Park* | ILM | photoreal computer-generated animals in live action |
| 1995 | *Toy Story* | Pixar | first feature made entirely with computer animation |

</div>

<div class="filmrow">
<div><img src="../../topics/media/history/film-abyss.jpg" alt="The water pseudopod from The Abyss" style="max-height: 120px;"><small class="credit"><em>The Abyss</em>, 1989 · 20th Century Studios · fair use</small></div>
<div><img src="../../topics/media/history/film-t2.jpg" alt="The liquid-metal T-1000 from Terminator 2" style="max-height: 120px;"><small class="credit"><em>Terminator 2</em>, 1991 · StudioCanal · fair use</small></div>
<div><img src="../../topics/media/history/film-jurassic.jpg" alt="The T. rex in the rain from Jurassic Park" style="max-height: 120px;"><small class="credit"><em>Jurassic Park</em>, 1993 · Universal Pictures · fair use</small></div>
</div>


---

## Fifteen films and their firsts, 2002 to 2019

<div class="films">

| year | film | studio | first or landmark |
| --- | --- | --- | --- |
| 2002 | *The Two Towers* | Weta Digital | Gollum from captured performance; Massive crowd agents |
| 2006 | *Monster House* | Sony Pictures Imageworks | first feature rendered with path tracing (Arnold) |
| 2014 | *Interstellar* | Double Negative | black hole rendered through curved spacetime, published as physics |
| 2019 | *The Mandalorian* (series) | ILM | StageCraft LED volume: real-time backgrounds filmed in camera |

</div>

<div class="filmrow">
<div><img src="../../topics/media/history/film-gollum.jpg" alt="Gollum from The Two Towers" style="max-height: 170px;"><small class="credit"><em>The Two Towers</em>: Gollum, 2002 · New Line Cinema · fair use</small></div>
<div><img src="../../topics/media/history/film-mandalorian.jpg" alt="The StageCraft LED volume used for The Mandalorian" style="max-height: 170px;"><small class="credit"><em>The Mandalorian</em>: StageCraft, 2019 · Lucasfilm · fair use</small></div>
</div>

