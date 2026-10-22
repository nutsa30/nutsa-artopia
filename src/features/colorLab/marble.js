import { kmProfile, mixInto } from './km.js';

export const MIX_MS = 2400;
const POUR_MS = 1000, SWIRL_FROM = 780;
const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ease = x => 1 - (1 - clamp01(x)) ** 3;

/** Where and when each color is poured into the bowl (top view, unit disk). */
export function pours(count) {
  const each = count > 1 ? 460 : 620;
  return Array.from({ length: count }, (_, j) => {
    const angle = (j - 1) * Math.PI * 2 / Math.max(1, count - 1) + .7;
    const start = count > 1 ? j * (POUR_MS - each) / (count - 1) : 0;
    return { start, end: start + each, x: j ? .42 * Math.cos(angle) : 0, y: j ? .42 * Math.sin(angle) : 0 };
  });
}
export function phase(t, count) {
  const plan = pours(count);
  const poured = plan.map(p => ease((t - p.start) / (p.end - p.start)));
  const swirl = clamp01((t - SWIRL_FROM) / (MIX_MS - SWIRL_FROM - 120));
  return { plan, poured, swirl, turn: 10 * swirl ** 1.35, blend: smooth(.28, 1, swirl) };
}

/** Paints the liquid surface of the mixing bowl, in ellipse space, at time t.
 * Colors are marbled by a differential swirl and blended with the same
 * Kubelka–Munk model as the recipe, so the end state is exactly the mix. */
export function drawSurface(image, hexes, parts, t) {
  const W = image.width, H = image.height, data = image.data, n = hexes.length;
  const km = hexes.map(kmProfile), total = parts.reduce((a, b) => a + b, 0) || 1, share = parts.map(p => p / total);
  const { plan, poured, swirl, turn, blend } = phase(t, n);
  const radius = plan.map((p, j) => (j ? .32 + .6 * Math.sqrt(share[j]) : 1.6) * poured[j]);
  const amounts = new Float64Array(n), rgb = new Float64Array(3), cache = new Map();
  for (let k = 0; k < H; k++) for (let i = 0; i < W; i++) {
    const o = (k * W + i) * 4, x = (i + .5) / W * 2 - 1, y = (k + .5) / H * 2 - 1, r = Math.hypot(x, y);
    if (r > 1) { data[o + 3] = 0; continue; }
    const a = Math.atan2(y, x) - turn * (1.08 - r) ** 1.6 - .35 * Math.sin(r * 7 + turn * .3) * swirl;
    const x0 = r * Math.cos(a), y0 = r * Math.sin(a);
    let present = 0;
    amounts.fill(0);
    for (let j = 0; j < n; j++) {
      if (!radius[j]) continue;
      const dx = x0 - plan[j].x, dy = y0 - plan[j].y;
      const d = Math.hypot(dx, dy) * (1 + .13 * Math.sin(Math.atan2(dy, dx) * 5 + j * 2.1));
      const w = 1 - smooth(radius[j] * .78, radius[j], d);
      if (w <= 0) continue;
      for (let l = 0; l < n; l++) amounts[l] *= 1 - w;
      amounts[j] += w; present = Math.max(present, w);
    }
    if (present < .01) { data[o + 3] = 0; continue; }
    let sum = 0; for (let l = 0; l < n; l++) sum += amounts[l];
    let key = n <= 3 ? 0 : -1;
    for (let l = 0; l < n; l++) {
      amounts[l] = amounts[l] / sum * (1 - blend) + share[l] * blend;
      if (key >= 0) key = key * 256 + Math.round(amounts[l] * 255);
    }
    let color = key >= 0 ? cache.get(key) : null;
    if (!color) { mixInto(rgb, 0, km, amounts, n); color = [rgb[0], rgb[1], rgb[2]]; if (key >= 0) cache.set(key, color); }
    const ripple = 1 + .045 * Math.sin(r * 26 - turn * 2.4) * swirl * (1 - blend);
    const rim = 1 - .28 * smooth(.8, 1, r);
    for (let c = 0; c < 3; c++) data[o + c] = color[c] * ripple * rim;
    data[o + 3] = 255 * Math.min(1, present * 1.2);
  }
}

/** The color of everything poured so far — the side of the liquid. */
export function bodyColor(hexes, parts, t) {
  const { poured } = phase(t, hexes.length), rgb = new Float64Array(3);
  const amounts = parts.map((p, j) => p * poured[j] + 1e-9);
  mixInto(rgb, 0, hexes.map(kmProfile), amounts, hexes.length);
  return `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;
}
