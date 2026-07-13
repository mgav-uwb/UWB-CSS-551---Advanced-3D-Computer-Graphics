// brdf-lobe: the S10 BRDF-lobe cockpit. NO three.js — a plain 2D <canvas>
// polar plot of a single reflectance event: a ground line (the surface),
// the surface normal (straight up from a fixed surface point O), an
// incident ray at angle inAngle from the normal, the mirror (specular)
// direction at the SAME angle on the other side of the normal (law of
// reflection: angle of incidence = angle of reflection), and a polar
// reflectance lobe traced around the mirror direction. Two lobe models,
// full-stage radio toggle:
//  - Phong: radius ∝ max(0, cos φ)^s, φ = angle from the mirror direction,
//    s = 2/roughness² − 2 (the classic Blinn roughness→shininess mapping —
//    small roughness -> huge s -> a needle-thin lobe; roughness=1 -> s=0 ->
//    a flat hemisphere-uniform lobe).
//  - GGX-flavored: radius ∝ α²/(π·(cos²φ·(α²−1)+1)²), α = roughness²,
//    normalized so the peak at φ=0 is 1. This reuses the GGX NORMAL
//    DISTRIBUTION FUNCTION shape as a lobe radius — it has no Fresnel term,
//    no geometry/shadowing term, and no solid-angle (cosine) normalization,
//    so it is NOT a calibrated BRDF: lobe SHAPE, not calibrated units.
// Both formulas peak at φ=0 by construction, so the numeric half-width at
// half max (HWHM) is found by walking φ = 0..180° in 1° steps (1° sampling
// is fine per the brief) and reporting the first φ where the value drops to
// <= 0.5. Redraws fully on every input — plain 2D canvas, no dispose
// concerns, no requestAnimationFrame loop.
import { SliderRow, ValueTable } from '../core/cockpit.js';
import { resolveControlIds } from './registry.js';

const D = Math.PI / 180;

// roughness listed FIRST: tools/test-demos.mjs drives the FIRST range input
// on the page as its generic smoke-test probe, and only roughness (not
// inAngle) drives the ValueTable's s/α, HWHM, and formula cells — inAngle
// only moves the incident/mirror rays on the canvas. Keeping roughness
// first means that probe's "slider must change a mat-panel cell AND canvas
// pixels" check is satisfied by construction.
const PARAMS = {
  roughness: { label: 'roughness', min: 0.05, max: 1, step: 0.01, value: 0.4, format: (v) => v.toFixed(2) },
  inAngle: { label: 'inAngle', min: 10, max: 80, step: 1, value: 45, format: (v) => `${v.toFixed(0)}°` },
};

const W = 400;
const H = 300;
const ORIGIN = [W / 2, H * 0.72]; // the fixed surface point O
const RAY_LEN = 110; // incident/mirror ray pixel length
const LOBE_SCALE = 100; // pixel radius at lobe value 1 (the peak)

const COLOR_GROUND = '#8b93a7';
const COLOR_NORMAL = '#3a4152';
const COLOR_INCIDENT = '#ff7b72'; // row-u red
const COLOR_MIRROR = '#79c0ff'; // row-w blue
const COLOR_LOBE = '#7ee787'; // row-v green

function phongValue(phiRad, s) {
  return Math.pow(Math.max(0, Math.cos(phiRad)), s);
}

function ggxRaw(phiRad, a2) {
  const cos2 = Math.cos(phiRad) ** 2;
  const denom = Math.PI * (cos2 * (a2 - 1) + 1) ** 2;
  return a2 / denom;
}

// normalized so ggxValue(0) === 1 exactly (dividing the raw NDF-shape by
// its own value at phi=0, which is always the peak for this formula).
function ggxValue(phiRad, a2) {
  return ggxRaw(phiRad, a2) / ggxRaw(0, a2);
}

/**
 * lobeModel(kind, roughness) -> { fn(phiRad)->[0,1], param, formulaText }
 * fn is the normalized (peak=1 at phi=0) lobe radius as a function of the
 * angle from the mirror direction, in radians.
 */
function lobeModel(kind, roughness) {
  if (kind === 'ggx') {
    const alpha = roughness * roughness;
    const a2 = alpha * alpha;
    return {
      fn: (phiRad) => ggxValue(phiRad, a2),
      param: alpha,
      formulaText: `r(φ) ∝ α²/(π·(cos²φ·(α²−1)+1)²), α=${alpha.toFixed(3)} [shape only]`,
    };
  }
  const s = 2 / (roughness * roughness) - 2;
  return {
    fn: (phiRad) => phongValue(phiRad, s),
    param: s,
    formulaText: `r(φ) ∝ max(0,cos φ)^s, s=${s.toFixed(3)}`,
  };
}

/** halfWidthHalfMax(fn): first φ in 0..180° (1° steps) where fn(φ) <= 0.5. */
function halfWidthHalfMax(fn) {
  for (let d = 0; d <= 180; d++) {
    if (fn(d * D) <= 0.5) return d;
  }
  return 180;
}

// Screen-space polar point: angle measured from "straight up" (the
// normal), positive = toward +x (screen right). Canvas y grows downward.
function polarPoint(originX, originY, worldAngleDeg, radiusPx) {
  const a = worldAngleDeg * D;
  return [originX + radiusPx * Math.sin(a), originY - radiusPx * Math.cos(a)];
}

function drawArrowhead(ctx, fromX, fromY, toX, toY, color) {
  const headLen = 9;
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/**
 * make(container, opts)
 * opts.stage === 'full' builds both SliderRows (roughness, inAngle) plus a
 * Phong/GGX-flavored radio toggle. Otherwise opts.controls (array of param
 * ids — embed stage exposes roughness; inAngle stays at its default) picks
 * which SliderRows to build. Embed stage never gets the model toggle
 * (stays on Phong).
 */
export function make(container, { stage = 'embed', controls } = {}) {
  const model = {
    roughness: PARAMS.roughness.value,
    inAngle: PARAMS.inAngle.value,
    lobeModel: 'phong', // 'phong' | 'ggx'
  };

  const controlsEl = document.createElement('div');
  controlsEl.className = 'demo-controls';
  const viewportEl = document.createElement('div');
  viewportEl.className = 'demo-viewport';
  viewportEl.style.width = `${W}px`;
  viewportEl.style.height = `${H}px`;
  const panelEl = document.createElement('div');
  panelEl.className = 'demo-panel';

  container.appendChild(controlsEl);
  container.appendChild(viewportEl);
  container.appendChild(panelEl);

  const ids = stage === 'full' ? Object.keys(PARAMS) : resolveControlIds(PARAMS, controls ?? [], 'brdf-lobe');
  const sliders = {};
  for (const id of ids) {
    sliders[id] = new SliderRow(controlsEl, { id: `brdf-lobe-${id}`, ...PARAMS[id] });
  }

  if (stage === 'full') {
    const row = document.createElement('div');
    row.className = 'slider-row';
    for (const [val, text] of [['phong', 'Phong'], ['ggx', 'GGX-flavored']]) {
      const label = document.createElement('label');
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'brdf-lobe-model';
      radio.value = val;
      radio.checked = val === 'phong';
      radio.addEventListener('change', () => {
        model.lobeModel = val;
        update();
      });
      const span = document.createElement('span');
      span.className = 'slider-label';
      span.textContent = text;
      label.append(radio, span);
      row.appendChild(label);
    }
    controlsEl.appendChild(row);
  }

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  viewportEl.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const table = new ValueTable(panelEl, {
    rows: [
      { id: 'model', label: 'model', className: 'row-v', format: (v) => v },
      { id: 'param', label: 's / α', className: 'row-w', format: (v) => v.toFixed(3) },
      { id: 'hwhm', label: 'HWHM (°)', className: 'row-u', format: (v) => v.toFixed(0) },
      { id: 'formula', label: 'formula', className: 'row-h', format: (v) => v },
    ],
  });
  const captionEl = document.createElement('p');
  captionEl.className = 'demo-hint';
  captionEl.style.cssText = 'margin:6px 0 0;color:#8b93a7;font-size:12px;';
  panelEl.appendChild(captionEl);

  function draw(fn) {
    ctx.clearRect(0, 0, W, H);
    const [ox, oy] = ORIGIN;
    const { inAngle } = model;

    // ground line (the surface)
    ctx.strokeStyle = COLOR_GROUND;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(0, oy);
    ctx.lineTo(W, oy);
    ctx.stroke();

    // surface normal, straight up from O
    ctx.strokeStyle = COLOR_NORMAL;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox, oy - RAY_LEN);
    ctx.stroke();
    ctx.fillStyle = COLOR_NORMAL;
    ctx.font = '12px sans-serif';
    ctx.fillText('N', ox + 4, oy - RAY_LEN + 10);

    // incident ray (solid): arrives from -inAngle, hits O, arrowhead at O
    const [sx, sy] = polarPoint(ox, oy, -inAngle, RAY_LEN);
    ctx.strokeStyle = COLOR_INCIDENT;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ox, oy);
    ctx.stroke();
    drawArrowhead(ctx, sx, sy, ox, oy, COLOR_INCIDENT);
    ctx.fillStyle = COLOR_INCIDENT;
    ctx.fillText('incident', sx - 10, sy - 6);

    // mirror (specular) direction, dashed: leaves at +inAngle
    const [mx, my] = polarPoint(ox, oy, inAngle, RAY_LEN);
    ctx.strokeStyle = COLOR_MIRROR;
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(mx, my);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLOR_MIRROR;
    ctx.fillText('mirror', mx - 6, my - 6);

    // reflectance lobe: a polar curve around the mirror direction, radius
    // = LOBE_SCALE * fn(offset-from-mirror), clipped to stay above ground
    // (world angle psi = inAngle + offset must be in (-90, 90)).
    const dMin = Math.max(-179, -90 - inAngle + 1);
    const dMax = Math.min(179, 90 - inAngle - 1);
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    for (let d = dMin; d <= dMax; d++) {
      const psi = inAngle + d;
      const r = LOBE_SCALE * fn(d * D);
      const [px, py] = polarPoint(ox, oy, psi, r);
      ctx.lineTo(px, py);
    }
    ctx.lineTo(ox, oy);
    ctx.closePath();
    ctx.fillStyle = 'rgba(126, 231, 135, 0.15)';
    ctx.fill();
    ctx.strokeStyle = COLOR_LOBE;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function update() {
    const { fn, param, formulaText } = lobeModel(model.lobeModel, model.roughness);
    draw(fn);

    const hwhm = halfWidthHalfMax(fn);
    const modelName = model.lobeModel === 'ggx' ? 'GGX-flavored' : 'Phong';
    table.update('model', modelName);
    table.update('param', param);
    table.update('hwhm', hwhm);
    table.update('formula', formulaText);

    captionEl.textContent =
      model.lobeModel === 'ggx'
        ? 'GGX normal-distribution shape reused as a lobe radius — lobe SHAPE, not calibrated units (no Fresnel/geometry term, no solid-angle normalization)'
        : 'roughness -> shininess: s = 2/roughness² − 2 (classic Blinn mapping)';
  }

  for (const id of ids) {
    sliders[id].onInput((v) => {
      model[id] = v;
      update();
    });
  }

  update();
  return { model, sliders, panel: table };
}
