// Paints the palette's brush-stroke swatches with the lab's own paint engine
// and writes, per variant, a coverage mask, a shadow and a gloss layer (PNG).
// The page tints the mask with each colour. Run: node scripts/color-lab-swatches.mjs <outdir>
// then convert to WebP (see scripts/color-lab-swatches-bake.py).
import { mkdirSync, writeFileSync } from 'node:fs';
import zlib from 'node:zlib';
import { PaintSurface } from '../src/features/colorLab/painting.js';

const out = process.argv[2] || 'swatches';
mkdirSync(out, { recursive: true });
const W = 240, H = 84;
const variants = [
  { seed: 3, path: t => ({ x: 22 + t * 182, y: 44 + 5 * Math.sin(t * 3.1) - 4 * t }), r: 25 },
  { seed: 11, path: t => ({ x: 22 + t * 180, y: 40 + 6 * Math.sin(t * 2.4 + 1) }), r: 24 },
  { seed: 29, path: t => ({ x: 20 + t * 184, y: 46 - 7 * Math.sin(t * 2.8) + 3 * t }), r: 26 },
];
const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = b => { let r = -1; for (const x of b) r = crcTable[(r ^ x) & 255] ^ (r >>> 8); return (r ^ -1) >>> 0; };
const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function png(path, rgba) {
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; rgba.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4); }
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 6;
  writeFileSync(path, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
variants.forEach((v, n) => {
  const s = new PaintSurface(W, H); s.seed = v.seed;
  s.begin([{ pigment: { id: 'w', hex: '#FFFFFF' }, weight: 1 }], 'flat');
  let prev = v.path(0);
  for (let i = 1; i <= 80; i++) { const p = v.path(i / 80); s.line(prev, p, v.r, v.r); prev = p; }
  s.end(); s.render();
  const mask = Buffer.alloc(W * H * 4), shadow = Buffer.alloc(W * H * 4), gloss = Buffer.alloc(W * H * 4);
  const L = [-.42, -.62, .66], ll = Math.hypot(...L), Hv = [L[0] / ll, L[1] / ll, L[2] / ll + 1], hl = Math.hypot(...Hv);
  for (let i = 0; i < W * H; i++) {
    const o = i * 4, cover = s.shape[o + 3];
    const nx = -s.shape[o] * 3.2, ny = -s.shape[o + 1] * 3.2, len = Math.hypot(nx, ny, 1);
    const diffuse = Math.max(0, (nx * L[0] + ny * L[1] + L[2]) / len / ll);
    const ndh = Math.max(0, (nx * Hv[0] + ny * Hv[1] + Hv[2]) / len / hl);
    const light = .74 + .34 * diffuse, spec = (ndh ** 70 * .75 + ndh ** 14 * .14) * cover;
    mask.fill(255, o, o + 3); mask[o + 3] = Math.round(cover * 255);
    shadow[o + 3] = Math.round(Math.max(0, 1 - light) * cover * 255);
    gloss.fill(255, o, o + 3); gloss[o + 3] = Math.round(Math.min(1, Math.max(0, light - 1) + spec) * 255);
  }
  png(`${out}/stroke-${n}-mask.png`, mask); png(`${out}/stroke-${n}-shadow.png`, shadow); png(`${out}/stroke-${n}-gloss.png`, gloss);
});
console.log('wrote', variants.length * 3, 'layers to', out);
