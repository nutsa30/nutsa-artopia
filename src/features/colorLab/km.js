import spectral from 'spectral.js';

// Allocation-free form of spectral.mix() for per-pixel rendering: the same
// KS spectra, luminance weighting and KM inversion, with the linear
// reflectance → linear-RGB step precomputed from spectral.js itself.
const SIZE = 38;
let toRGB = null;
function basis() {
  if (toRGB) return toRGB;
  toRGB = new Float64Array(3 * SIZE);
  for (let i = 0; i < SIZE; i++) {
    const R = new Array(SIZE).fill(0); R[i] = 1;
    const { lRGB } = new spectral.Color(R);
    toRGB[i] = lRGB[0]; toRGB[SIZE + i] = lRGB[1]; toRGB[2 * SIZE + i] = lRGB[2];
  }
  return toRGB;
}
const profiles = new Map();
export function kmProfile(hex) {
  let p = profiles.get(hex);
  if (!p) {
    const c = new spectral.Color(hex);
    p = { ks: Float64Array.from(c.KS), lum: c.luminance, rgb: c.sRGB.slice(0, 3) };
    profiles.set(hex, p);
  }
  return p;
}
const compand = x => x > .0031308 ? 1.055 * x ** (1 / 2.4) - .055 : x * 12.92;
let conc = new Float64Array(16);

/** Writes 0–255 sRGB floats of the mixture into out[o..o+2]. */
export function mixInto(out, o, list, amounts, n) {
  if (n === 1) { const rgb = list[0].rgb; out[o] = rgb[0]; out[o + 1] = rgb[1]; out[o + 2] = rgb[2]; return; }
  const M = basis();
  if (n > conc.length) conc = new Float64Array(n);
  let total = 0;
  for (let j = 0; j < n; j++) { conc[j] = amounts[j] * amounts[j] * list[j].lum; total += conc[j]; }
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < SIZE; i++) {
    let ks = 0;
    for (let j = 0; j < n; j++) ks += list[j].ks[i] * conc[j];
    ks /= total;
    const R = 1 + ks - Math.sqrt(ks * ks + 2 * ks);
    r += M[i] * R; g += M[SIZE + i] * R; b += M[2 * SIZE + i] * R;
  }
  out[o] = 255 * compand(Math.max(0, Math.min(1, r)));
  out[o + 1] = 255 * compand(Math.max(0, Math.min(1, g)));
  out[o + 2] = 255 * compand(Math.max(0, Math.min(1, b)));
}
