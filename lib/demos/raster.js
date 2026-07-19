// raster: rasterization at an intuitive level — ONE triangle becoming pixels.
//
// A triangle with a red, a green, and a blue corner is drawn over a coarse
// "framebuffer" of res × res pixels. For every pixel we do exactly what a GPU
// does per sample: test the pixel's CENTER against the triangle's three edge
// functions; if it is inside, shade it with the barycentric-interpolated
// vertex color. Everything is computed by hand here (edge functions +
// barycentric weights as plain arithmetic on a 2D canvas) — no WebGL, so the
// process is visible instead of instant.
//
// Sliders: `res` (the framebuffer resolution — watch the same triangle go
// from blocky to smooth), `angle` (rotate the triangle — the stair-step
// aliasing crawls along the edges), and `aa` = samples per pixel axis (1 =
// the classic single center test). ⚙ toggles: pixel grid lines, the sampled
// pixel centers, and the "true" mathematical triangle outline.
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { makeShell } from '../core/demo-shell.js';
import { resolveControlIds } from './registry.js';

const D = Math.PI / 180;

// res FIRST: tools/test-demos.mjs drives the first range input as its smoke
// probe, and res changes BOTH the canvas pixels and the readout's covered
// count — so the "slider changes a mat-panel cell AND canvas pixels" check
// holds by construction.
const PARAMS = {
  res: { label: 'res', min: 4, max: 64, step: 1, value: 12, format: (v) => `${v.toFixed(0)}px` },
  angle: { label: 'angle', min: 0, max: 360, step: 1, value: 15, format: (v) => `${v.toFixed(0)}°` },
  aa: { label: 'aa', min: 1, max: 4, step: 1, value: 1, format: (v) => (v === 1 ? 'off' : `${v.toFixed(0)}×${v.toFixed(0)}`) },
};

const HELP_HTML = `
  <h4>What you're seeing</h4>
  <p>One triangle being turned into pixels — <em>rasterization</em>, the
  step a GPU performs for every triangle of every frame. The coarse grid is a
  tiny framebuffer (<code>res × res</code> pixels). A pixel is filled exactly
  when its <em>center</em> falls inside the triangle, and its color is blended
  from the three corner colors (barycentric interpolation).</p>
  <h4>The concept</h4>
  <p>The triangle is pure math — three 2D points. The screen is a grid of
  pixels. Rasterization bridges the two: sample each pixel center, test it
  against the triangle's edges, and shade the ones inside. The stair-stepping
  on the edges is <em>aliasing</em> — the grid is too coarse to follow the
  true edge, which the thin outline shows.</p>
  <h4>Try this</h4>
  <p>Drag <code>res</code> from 4 to 64 and watch the same triangle sharpen —
  your real screen just continues this to ~2000×1000. Drag
  <code>angle</code> slowly and watch the stair-steps crawl along the edges.
  In ⚙, turn on <code>centers</code> at low res to see exactly which sample
  points decide each pixel. Then drag <code>aa</code> up at a low res — each pixel now averages several sample points, and the stair-steps soften into gray ramps without adding pixels. That is anti-aliasing by supersampling.</p>
  <p class="demo-shell-help-panel-hint">Esc, ×, or click outside to close.</p>
`;

// The triangle in unit space ([0,1]², y up), rotated about its centroid.
const TRI_BASE = [
  [0.16, 0.22],
  [0.86, 0.38],
  [0.46, 0.88],
];
const TRI_COLORS = [
  [235, 70, 60], // red corner
  [60, 200, 110], // green corner
  [70, 130, 245], // blue corner
];

function triAt(angleDeg) {
  const cx = (TRI_BASE[0][0] + TRI_BASE[1][0] + TRI_BASE[2][0]) / 3;
  const cy = (TRI_BASE[0][1] + TRI_BASE[1][1] + TRI_BASE[2][1]) / 3;
  const c = Math.cos(angleDeg * D);
  const s = Math.sin(angleDeg * D);
  return TRI_BASE.map(([x, y]) => [cx + c * (x - cx) - s * (y - cy), cy + s * (x - cx) + c * (y - cy)]);
}

// Edge function: twice the signed area of (a, b, p) — positive when p is to
// the left of a→b for a CCW triangle. The three of them, normalized by the
// full area, ARE the barycentric weights.
const edge = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);

/**
 * make(container, opts)
 * opts.stage === 'full' builds both sliders (res, angle) + ⚙ display toggles.
 * Otherwise opts.controls picks sliders (deck embeds usually expose res).
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = { res: PARAMS.res.value, angle: PARAMS.angle.value, aa: PARAMS.aa.value };
  const disp = { gridlines: true, centers: false, outline: true };

  const settingsFields = [
    { label: 'grid', toggle: true, title: 'Show the pixel grid lines',
      getCurrent: () => disp.gridlines, apply: (v) => { disp.gridlines = v; draw(); } },
    { label: 'centers', toggle: true, title: 'Show each pixel’s sample point (its center)',
      getCurrent: () => disp.centers, apply: (v) => { disp.centers = v; draw(); } },
    { label: 'outline', toggle: true, title: 'Show the true (mathematical) triangle edges',
      getCurrent: () => disp.outline, apply: (v) => { disp.outline = v; draw(); } },
  ];

  const shell = makeShell(container, {
    stage,
    help: { html: HELP_HTML },
    settings: stage === 'full' ? settingsFields : [],
    legend: 'drag res — the same triangle on a finer grid',
    nav: null,
  });

  // ---- the framebuffer canvas ----
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 540;
  canvas.style.display = 'block';
  if (stage === 'full') {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
  }
  shell.sceneEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let covered = 0; // pixels the current frame filled (readout)

  function draw() {
    const W = canvas.width;
    const H = canvas.height;
    ctx.fillStyle = '#171b26';
    ctx.fillRect(0, 0, W, H);

    // centered square viewport for the unit-space framebuffer
    const side = Math.min(W, H) - 24;
    const ox = (W - side) / 2;
    const oy = (H - side) / 2;
    const toX = (u) => ox + u * side;
    const toY = (v) => oy + (1 - v) * side; // unit y-up -> canvas y-down

    const n = model.res;
    const cell = side / n;
    const tri = triAt(model.angle);
    const area = edge(tri[0], tri[1], tri[2]); // CCW base triangle: positive

    covered = 0;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const s = model.aa;                 // s×s samples per pixel
        let hit = 0;
        let R = 0, G = 0, B = 0;
        for (let sy = 0; sy < s; sy++) {
          for (let sx = 0; sx < s; sx++) {
            const p = [(c + (sx + 0.5) / s) / n, 1 - (r + (sy + 0.5) / s) / n];
            const w0 = edge(tri[1], tri[2], p) / area;
            const w1 = edge(tri[2], tri[0], p) / area;
            const w2 = edge(tri[0], tri[1], p) / area;
            if (w0 >= 0 && w1 >= 0 && w2 >= 0) {
              hit += 1;
              R += w0 * TRI_COLORS[0][0] + w1 * TRI_COLORS[1][0] + w2 * TRI_COLORS[2][0];
              G += w0 * TRI_COLORS[0][1] + w1 * TRI_COLORS[1][1] + w2 * TRI_COLORS[2][1];
              B += w0 * TRI_COLORS[0][2] + w1 * TRI_COLORS[1][2] + w2 * TRI_COLORS[2][2];
            }
          }
        }
        if (hit > 0) {
          covered += 1;
          // average the covered samples' color, then blend toward the
          // background by coverage — exactly what supersampling does.
          const cov = hit / (s * s);
          const BGC = [35, 41, 57]; // #232939
          const mix = (acc, bg) => Math.round((acc / hit) * cov + bg * (1 - cov));
          ctx.fillStyle = `rgb(${mix(R, BGC[0])},${mix(G, BGC[1])},${mix(B, BGC[2])})`;
        } else {
          ctx.fillStyle = '#232939';
        }
        ctx.fillRect(ox + c * cell, oy + r * cell, cell + 0.5, cell + 0.5);
      }
    }

    if (disp.gridlines && n <= 48) {
      ctx.strokeStyle = 'rgba(10, 13, 20, 0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        ctx.moveTo(ox + i * cell, oy);
        ctx.lineTo(ox + i * cell, oy + side);
        ctx.moveTo(ox, oy + i * cell);
        ctx.lineTo(ox + side, oy + i * cell);
      }
      ctx.stroke();
    }

    if (disp.centers && n <= 32) {
      for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
          const p = [(c + 0.5) / n, 1 - (r + 0.5) / n];
          const w0 = edge(tri[1], tri[2], p);
          const w1 = edge(tri[2], tri[0], p);
          const w2 = edge(tri[0], tri[1], p);
          const inside = w0 >= 0 && w1 >= 0 && w2 >= 0;
          ctx.fillStyle = inside ? '#ffffff' : 'rgba(140, 150, 175, 0.55)';
          ctx.beginPath();
          ctx.arc(ox + (c + 0.5) * cell, oy + (r + 0.5) * cell, Math.max(1.5, cell * 0.07), 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (disp.outline) {
      ctx.strokeStyle = '#ffb400';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toX(tri[0][0]), toY(tri[0][1]));
      ctx.lineTo(toX(tri[1][0]), toY(tri[1][1]));
      ctx.lineTo(toX(tri[2][0]), toY(tri[2][1]));
      ctx.closePath();
      ctx.stroke();
      // corner dots in the vertex colors
      tri.forEach((v, i) => {
        ctx.fillStyle = `rgb(${TRI_COLORS[i].join(',')})`;
        ctx.beginPath();
        ctx.arc(toX(v[0]), toY(v[1]), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
    }

    updateReadout();
  }

  // dpr: cap at 2 for the same reason as scene-shell.js's setPixelRatio — no
  // visible gain (and quadruple the pixel-fill work) past 2x on these small
  // cockpit viewports.
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Sandbox: the canvas buffer follows its on-screen size (crisp pixels),
  // scaled by dpr for Retina sharpness.
  if (stage === 'full' && typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      const w = shell.sceneEl.clientWidth;
      const h = shell.sceneEl.clientHeight;
      if (w < 2 || h < 2) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      draw();
    }).observe(shell.sceneEl);
  }

  // Embed (a deck slide): the fixed 720x540 buffer above is a reasonable
  // build-time default, but demos build while their reveal slide is
  // display:none (initDeckDemos builds every [data-demo] host in the deck up
  // front) — the deck's `[data-demo] canvas { height:...px !important;
  // width:auto !important }` rule then scales that fixed buffer to whatever
  // on-screen size the slide gives it, which on a small teaser crop or a
  // demo-full 520px exhibit is a real up/downscale, and never accounts for
  // devicePixelRatio. Re-fit ONCE the container is actually visible: buffer
  // = the container's TRUE on-screen size (getBoundingClientRect — reveal's
  // zoom transform is invisible to clientWidth) x dpr. This only changes the
  // BUFFER (canvas.width/height attributes); canvas.style is never touched
  // here, so the deck's `!important` rule keeps sole ownership of the
  // on-slide footprint — it isn't "fighting" that sizing, only sharpening
  // what's drawn inside it. Aspect ratio is preserved exactly (both
  // dimensions scale by the same dpr), so this converges in one step —
  // there's no feedback loop where the new buffer's aspect ratio would shift
  // the CSS `width:auto` computation and retrigger another resize.
  if (stage !== 'full' && typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const rect = canvas.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;
        canvas.width = Math.round(rect.width * dpr);
        canvas.height = Math.round(rect.height * dpr);
        draw();
      }
    });
    io.observe(canvas);
  }

  // ---- rail: controls + readout ----
  const controlsCard = shell.addCard('controller — the framebuffer');
  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'raster');
  for (const id of ids) {
    const slider = new SliderRow(controlsCard, { id: `raster-${id}`, ...PARAMS[id] });
    slider.onInput((v) => {
      model[id] = v;
      draw();
    });
  }

  const readoutCard = shell.addCard('readout — pixels');
  const table = new ValueTable(readoutCard, {
    rows: [
      { id: 'grid', label: 'grid', format: (v) => `${v.toFixed(0)}×${v.toFixed(0)}` },
      { id: 'total', label: 'pixels', format: (v) => v.toFixed(0) },
      { id: 'covered', label: 'covered', format: (v) => v.toFixed(0) },
      { id: 'pct', label: 'coverage', format: (v) => `${v.toFixed(1)}%` },
    ],
  });

  function updateReadout() {
    const n = model.res;
    table.update('grid', n);
    table.update('total', n * n);
    table.update('covered', covered);
    table.update('pct', (100 * covered) / (n * n));
  }

  draw();
}
