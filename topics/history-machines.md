<!--
  CSS 551 · TOPIC DECK (2026-10-03): The early machines, 1958 to 1972
  (~18 min, 16 slides). Mounted by lectures/L01-big-picture-1/.

  TEACHES: Sketchpad on the TX-2 in depth (the machine, what Sketchpad did, the
  light pen, the display file and its flicker budget, Sutherland's own
  words); then the IBM 2250 (machine, cost), the PDP-1 and Type 30, the RAND
  Tablet and the mouse, the 1968 head-mounted display as a machine, the E&S
  LDS-1, storage-tube terminals, the price of admission, the then-and-now
  chart; one closing slide on the machines before Sketchpad (Whirlwind,
  SAGE, DAC-1). Every machine slide carries a cost line, nominal and in 2026
  dollars (nominal x 321.943 / CPI-U of the year), or "not found".
  NUMBERS LEFT FOR THE DISCUSSION (not on the slide faces): Sketchpad's
    spots per 1/30 s (L01 Q1), the HMD's multiplications per second (L01 Q2),
    a 40-hour week on a 2250 (L01 Q3).
  SOURCE: planning/history-draft/history-of-graphics.html (v0.5) Section 3;
    supplements/machines-1963-1972.html and supplements/earlier-machines.html;
    figures/fig-cost-then-now.svg (copy in media/ with source grades removed).
  IMAGE PATHS: relative to the lecture page: ../../topics/media/history/.

  reveal.js: FLAT; notes follow "Note:"; no math; never two "_" on one line
  outside a code fence.
-->

### The early machines, 1958 to 1972

<small>(~18 min): Sketchpad on the TX-2, then the machines that followed, each with its price</small>


---

## The TX-2 (MIT Lincoln Laboratory, 1958)

<div class="cols stack"><div class="txt">

- an experimental **transistor** computer, chief architect **Wesley Clark**; commissioned June 1958
- **36-bit word**, splittable into two, three or four sub-words
- **65,536 words** of core memory, 6.4 µs cycle; 64 index registers
- **200,000** 36-bit additions per second; about **61,500 transistors**
- display: points plotted with **10 bits per axis**, at most "about 100,000" spots a second; a **light pen**
- its circuits were "virtually identical" to the modules the Digital Equipment Corporation (DEC) sold before it built a computer

<span class="cost">**Cost:** not found. Today: a $5 Raspberry Pi Pico 2 has 1.8 times the TX-2's 288 KB of main memory.</span>

</div><div class="pic">
<img src="../../topics/media/history/commons-tx2-module.jpg" alt="A TX-2 transistor circuit module seen from the top">
<small class="credit">Jnc · CC BY-SA 2.5</small>
</div></div>


---

## Sketchpad (Ivan Sutherland, MIT, 1963)

<div class="cols"><div class="txt">

- a PhD thesis, run on the TX-2: drawing with a **light pen** and push buttons
- the drawing stored as a **ring structure** recording its topology
- **atomic constraints** (two lines parallel, two segments equal) kept true by the machine, which relaxed each constraint's error
- **masters and instances**, "instances within instances": change the master, every copy changes
- a drawn truss bridge analyzed for its forces
- begun fall 1961; first light-pen drawing November 1961; ring structure by February 1962

<span class="cost">**Cost:** not stated. Machine time: about **600 hours** of TX-2 time.</span>

</div><div class="pic">
<img src="../../topics/media/history/commons-sketchpad-fig1-5.png" alt="Plotter output from the Sketchpad thesis: repeated instances of a drawn pattern" style="max-height: 360px;">
<small class="credit">Ivan Sutherland (scan: Kerry Rodden) · CC BY-SA 3.0</small>
</div></div>


---

## The light pen

<div class="cols"><div class="txt">

- "a photodiode and transistor preamplifier mounted in the pen housing"
- sensitive "only to the bright blue flash of the first intensification of a display spot and not to the dim yellow afterglow"
- when the pen sees a spot, the TX-2 **interrupts** the display sequence: the program does not poll
- to follow the pen, a tracking cross redrawn "about 100 times per second, taking 1 millisecond per display"
- the pen can move about **20 inches per second** before the cross loses it; losing it is itself a command

</div><div class="pic">
<img src="../../topics/media/history/photo-sketchpad-lightpen.jpg" alt="The TX-2 light pen, a pen-shaped housing on a cable, from the Sketchpad thesis">
<small class="credit">Ivan Sutherland (scan: Kerry Rodden) · CC BY-SA 3.0</small>
</div></div>


---

## The display file and the flicker budget

- the TX-2 display had **no memory of its own**: Sketchpad kept a **display file** in core
- **one spot per 36-bit word**: 20 bits of coordinates, 16 bits naming the drawing element that owns the spot
- up to **32,000 words**; each spot takes **20 µs** to show
- flicker needs a refresh of about **30 times a second**
- a full 32,000-spot file takes **0.64 s** per pass
- Sutherland's two fixes, on toggle switches: **interlace** (every eighth spot per pass) and **random order**, which "resulted in a twinkling picture ... which is pleasing to the eye and avoids flicker entirely"


---

## Sketchpad, in its own words

<div class="cols"><div class="txt">

- "we have been writing letters to rather than conferring with our computers"
- "a secretary designed and drew an alphabet with the aid of a 10 × 10 raster of points"
- "now that we know what drawing on a computer is like, much smaller machines can be used for practical applications"
- at the outset, "no one had ever drawn engineering drawings" on a computer this way

</div><div class="pic">
<img src="../../topics/media/history/paper-sketchpad.png" alt="A figure from the Sketchpad thesis showing drawings made with the system" style="max-height: 380px;">
<small class="credit">Sketchpad, thesis Fig. 1.6, 1963 · Ivan Sutherland, MIT · fair use</small>
</div></div>


---

## IBM 2250 (1964)

<div class="cols"><div class="txt">

- announced April 1964 by International Business Machines (IBM), a peripheral of the System/360
- a vector cathode-ray tube (CRT): **1,024 × 1,024** addressable positions over 12 × 12 inches
- points, horizontal and vertical vectors, short 45-degree vectors; any angle with the "Absolute Vectors" feature
- **4 bytes** of buffer per point or vector; a local buffer of **4,096 or 8,192 bytes** from which it refreshed itself
- a light pen, an alphanumeric and a programmed-function keyboard
- "probably the most widely used graphic terminals over the past five years" (Machover, 1972)

</div><div class="pic">
<img src="../../topics/media/history/photo-ibm2250-hes.jpg" alt="A person using an IBM 2250 display console with a light pen at Brown University, 1969">
<small class="credit">Gregory Lloyd · CC BY 2.0</small>
</div></div>


---

## IBM 2250: what it cost

<div class="cols"><div class="txt">

- improved model: **$76,800** each (1966) = **$763,000** in 2026 dollars (× 9.937)
- a complete 2250 Model III with controller: reportedly about **$280,000** (1970) = about **$2.32 million** (× 8.297)
- running cost, about 1971: **$80 to $150 per console hour** for a refreshed graphics CRT, against **$10** for a teletype
- at 1972 prices (× 7.702): **$616 to $1,155 an hour** in 2026 dollars; the teletype, $77

<span class="cost">**Today:** a 16 GB laptop holds about 2.1 million times the 2250's 8,192-byte buffer.</span>

</div><div class="pic">
<img src="../../topics/media/history/commons-ibm2250-lightpen.png" alt="The IBM 2250 light pen in use at Brown University, 1969">
<small class="credit">Gregory Lloyd · CC BY-SA 4.0</small>
</div></div>


---

## DEC PDP-1, the Type 30 display, and *Spacewar!* (1960 to 1962)

<div class="cols"><div class="txt">

- first delivered 1960; **18-bit** word, **4,096 words** of core at 5 µs, "100,000 additions per second"
- Type 30: a 16-inch CRT plotting random points, 1,024 × 1,024 addressable, **20,000 points a second**, with a light pen
- 53 built; "the first commercially available graphic terminals for computers" (DEC's own claim)
- *Spacewar!*: conceived 1961 by Russell, Graetz and Wiitanen at MIT, improved spring 1962

<span class="cost">**Cost:** $120,000 (1963) = **$1.26 million** in 2026 dollars (× 10.521); Type 30A display $14,300 = $150,000; a 4,096-word core module $30,000 = $316,000, about **$4.28 a bit**. **Today:** a 16 GB Raspberry Pi 5 at $305 has 1.86 million times the memory for 1/4,100 of the price.</span>

</div><div class="pic">
<img src="../../topics/media/history/photo-pdp1-spacewar.jpg" alt="The restored PDP-1 at the Computer History Museum with Spacewar! on its round display">
<small class="credit">Joi Ito · CC BY 2.0</small>
</div></div>


---

## Input: the RAND Tablet and the mouse (1964 to 1968)

<div class="cols"><div class="txt">

- **RAND Tablet** (1964, M. R. Davis and T. O. Ellis, RAND Corporation, funded by the Advanced Research Projects Agency, ARPA): a surface that reports a stylus position; reported 10 × 10 inches at 100 lines per inch
- "the light pen could not be used with storage tube systems" (Machover, 1972): one reason tablets spread
- the **mouse**: Engelbart's group at the Stanford Research Institute (SRI); two perpendicular wheels driving potentiometers; prototype 1964 (Bill English); patent filed 1967, granted 1970
- shown with NLS on **9 December 1968**, reportedly 90 minutes before about 1,000 people

<span class="cost">**Cost:** RAND Tablet reportedly $18,000 (1964) = about $187,000. Commercial tablets $10,000 to $15,000 (1967 assumed) = $96,000 to $145,000; a light pen about $1,500 (1972) = $11,600. NLS: not found.</span>

</div><div class="pic">
<img src="../../topics/media/history/photo-rand-tablet.png" alt="The RAND Tablet with its stylus" style="max-height: 200px;">
<small class="credit">RAND Tablet, 1964 · RAND Corporation · fair use</small>
<img src="../../topics/media/history/photo-engelbart-mouse.jpg" alt="Engelbart's prototype mouse, a wooden box with one button and a cable" style="max-height: 150px;">
<small class="credit">Michael Hicks · CC BY 2.0</small>
</div></div>


---

## The head-mounted display as a machine (Harvard, 1968)

<div class="cols"><div class="txt">

- funded by ARPA, the Office of Naval Research (ONR) and Bell Labs
- a pipeline of special-purpose units: **matrix multiplier**, **clipping divider** (also the perspective division), **analog line generator**, two miniature CRTs, mechanical and ultrasonic head sensors
- "3000 lines at 30 frames per second", "a little over 10 microseconds per line"
- an endpoint transformed in about **5 µs** with **16 multiplications**; a line clipped in about 10 µs
- half-inch CRTs, a **40-degree** field of view, overlaid on the room by half-silvered mirrors
- "connected in a 'pipe-line' arrangement"; hidden lines "beyond our present capability"

<span class="cost">**Cost:** not found; the paper gives none.</span>

</div><div class="pic">
<img src="../../topics/media/history/photo-sword-of-damocles.jpg" alt="The 1968 head-mounted display: a headset with small CRTs hanging from a ceiling-mounted arm">
<small class="credit">The head-mounted display, 1968 · ACM (AFIPS proceedings) · fair use</small>
</div></div>


---

## Evans & Sutherland LDS-1 (1969)

<div class="cols"><div class="txt">

- the head-mounted display's pipeline as a **product**: the Line Drawing System-1
- reported first shipment: Bolt Beranek and Newman (BBN), **August 1969**
- **4 × 4 matrix transforms** of homogeneous vertices in hardware, driving a vector display
- "10 microseconds typical for processing each line" (1970 advertisement): about 100,000 lines a second
- users reported to include NASA Ames, the Port Authority of New York, MIT, Case Western Reserve and the Los Angeles Times

<span class="cost">**Cost:** not found. Proxy: in 1972, 3D rotation hardware added $40,000 to $70,000 to a terminal, against about $5,000 in software and memory = **$308,000 to $539,000** (× 7.702). **Today:** the graphics processor in a $305 Raspberry Pi 5 does the work for 1/1,000 to 1/1,800 of that.</span>

</div><div class="pic">
<img src="../../topics/media/history/photo-es-lds1.jpg" alt="The Evans and Sutherland LDS-1 display processor cabinet on museum display">
<small class="credit">vonguard · CC BY-SA 2.0</small>
</div></div>


---

## Storage tubes: the cheap terminal (1968 to 1972)

<div class="cols"><div class="txt">

- a refreshed display needs memory to refresh from; a **storage tube** keeps the picture on the screen itself
- Tektronix 611 terminals: "originally introduced in the $12,000 to $15,000 range ... now selling for about $8000" (Machover)
- Tektronix T4002 (1969): 1,024 × 1,024 on an 11-inch screen, about $10,000
- Tektronix **4010** (1971 or 1972): 1,024 × 780 visible, **$3,950**
- the price: no erasing one line, only the whole screen; no light pen

<span class="cost">**Cost:** early terminals $12,000 to $15,000 (1968 assumed) = $111,000 to $139,000. Tektronix 4010: $3,950 = **$30,400** (× 7.702). **Today:** a 13-inch laptop at $1,299 costs about 1/23 of the 4010.</span>

</div><div class="pic">
<img src="../../topics/media/history/commons-tektronix-4010.jpg" alt="A Tektronix 4010 storage-tube terminal" style="max-height: 360px;">
<small class="credit">Piergiovanna Grossi · CC BY-SA 4.0</small>
</div></div>


---

## The price of admission

- "Five years ago, the price of admission into Interactive Computer Graphics was spending about **$50,000 or more** ... Today ... **less than $10,000**"
- "much justification for computer graphics was based on **faith**!"
- 1971: about **1,000** interactive CRT graphic terminals installed in the United States, against **100,000** line printers
- the problems that paid for it: air defense, numerically controlled (NC) machining, car bodies, structured drawing


---

## Then and now

<img src="../../topics/media/history/fig-cost-then-now.svg" alt="Early graphics machines in 2026 dollars on a log scale, from one SAGE computer at 334 million down to a Tektronix 4010 at 30,400, against a laptop at 1,299, a Raspberry Pi 5 at 305 and a Pico 2 at 5" style="max-height: 470px; width: auto;">


---

## Before Sketchpad: Whirlwind, SAGE, DAC-1

<div class="cols"><div class="txt">

- **Whirlwind** (MIT, Forrester and Everett, Navy, demonstrated 1951): 16-bit word, 6,144 words of core, 14,500 vacuum tubes; CRTs drawing 6,000 vectors a second; the light gun. Core memory (1953) raised the time between failures from 2 hours to 2 weeks.
- **SAGE**, the Semi-Automatic Ground Environment (Lincoln Laboratory, IBM, System Development Corporation): the AN/FSQ-7, 69,632 words of core; a duplex site 50,000 tubes, 275 tons; every 2.5 s up to 20,000 characters, 18,000 points and 5,000 lines on its displays
- **DAC-1** (General Motors and IBM, 1960 to 1967): car-body design, often called the first computer-aided design (CAD) system

<span class="cost">**Cost:** Whirlwind's fiscal-1949 request $1.5 million = $20.3 million. SAGE about $8 billion (1964) = $83.1 billion; one AN/FSQ-7 $30 million (1958 assumed) = $334 million. DAC-1: not found.</span>

</div><div class="pic">
<img src="../../topics/media/history/photo-sage-console.jpg" alt="A SAGE operator console with its light gun at the Computer History Museum">
<small class="credit">Tomwsulcer · CC0</small>
</div></div>

