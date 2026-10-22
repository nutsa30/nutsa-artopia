import test from 'node:test';
import assert from 'node:assert/strict';
import { PaintSurface, BRUSHES } from '../src/features/colorLab/painting.js';
import { mixHex, percentages, hexRgb } from '../src/features/colorLab/engine.js';
import { kmProfile, mixInto } from '../src/features/colorLab/km.js';
const blue = { id: 'blue', hex: '#002185' }, yellow = { id: 'yellow', hex: '#FCD200' }, red = { id: 'red', hex: '#C83942' };
const paint = (surface, pigment, from, to, type = 'flat', r = 10) => {
  surface.begin([{ pigment, weight: 1 }], type);
  surface.line(from, to, r, r); return surface.end();
};
const alpha = (s, x, y) => s.albedo[(y * s.width + x) * 4 + 3];
test('fast Kubelka–Munk path equals the spectral forward model used for recipes', () => {
  const out = new Float64Array(3), hexes = ['#002185', '#FCD200', '#C83942'];
  for (const w of [[1, 1, 1], [3, 1, .2], [.1, 5, 2]]) {
    mixInto(out, 0, hexes.map(kmProfile), w, 3);
    hexRgb(mixHex(hexes, w)).forEach((v, i) => assert.ok(Math.abs(v - out[i]) <= .5));
  }
});
test('blank canvas has no manufactured recipe and allocates no pigment fields', () => {
  const s = new PaintSurface(100, 80);
  assert.equal(s.sample(50, 40), null); assert.equal(s.layers.length, 0);
  s.render(); assert.ok(s.albedo.every(v => v === 0)); assert.equal(s.render(), null);
});
test('a stroke across wet paint mixes with it instead of covering it', () => {
  const s = new PaintSurface(100, 80);
  paint(s, blue, { x: 10, y: 40 }, { x: 90, y: 40 });
  paint(s, yellow, { x: 50, y: 10 }, { x: 50, y: 70 });
  const crossing = s.sample(50, 40), unmixed = s.sample(20, 40);
  assert.equal(crossing.recipe.length, 2); assert.equal(unmixed.hex, blue.hex);
  assert.equal(crossing.hex, mixHex([blue.hex, yellow.hex], crossing.recipe.map(r => r.weight)));
  const blueShare = crossing.recipe.find(r => r.id === 'blue').weight;
  assert.ok(blueShare > 25 && blueShare < 75, `the crossing is a real mix, blue ${blueShare.toFixed(1)}%`);
  assert.equal(percentages(crossing.recipe.map(r => r.weight)).reduce((a, b) => a + b, 0), 100);
});
test('the brush carries picked-up paint past a crossing, then cleans itself', () => {
  const s = new PaintSurface(200, 80);
  paint(s, blue, { x: 40, y: 10 }, { x: 40, y: 70 });
  paint(s, yellow, { x: 10, y: 40 }, { x: 190, y: 40 });
  const share = x => s.sample(x, 40).recipe.find(r => r.id === 'blue')?.weight || 0;
  assert.ok(share(62) > 1, 'just after the crossing the yellow is dirtied');
  assert.ok(share(62) > share(120), 'and gets cleaner further on');
  assert.equal(s.sample(20, 40).recipe.some(r => r.id === 'blue'), false, 'nothing travels backwards');
});
test('third pigment can be worked into the same crossing', () => {
  const s = new PaintSurface(100, 80);
  for (const p of [blue, yellow, red]) paint(s, p, { x: 10, y: 40 }, { x: 90, y: 40 });
  const r = s.sample(50, 40);
  assert.equal(r.recipe.length, 3);
  assert.equal(r.hex, mixHex([blue.hex, yellow.hex, red.hex], r.recipe.map(v => v.weight)));
});
test('a loaded brush lays the prepared mix exactly and opaquely, then runs dry into streaks', () => {
  const s = new PaintSurface(1400, 80);
  s.begin([{ pigment: blue, weight: 35 }, { pigment: yellow, weight: 65 }]);
  s.line({ x: 15, y: 40 }, { x: 1385, y: 40 }, 12, 12); s.end(); s.render();
  for (const x of [40, 120, 200]) {
    assert.equal(s.sample(x, 40).hex, mixHex([blue.hex, yellow.hex], [35, 65]));
    assert.ok(alpha(s, x, 40) > 230, 'a full brush covers');
  }
  const gaps = from => { let n = 0; for (let x = from; x < from + 60; x++) for (let y = 30; y <= 50; y++) if (alpha(s, x, y) < 100) n++; return n; };
  assert.equal(gaps(60), 0, 'no streaks while the brush is full');
  const streaks = Array.from({ length: 20 }, (_, i) => gaps(200 + i * 60));
  assert.ok(streaks.some(n => n > 40 && n < 1000), 'the end of a long stroke breaks into bristle streaks');
});
test('each stroke starts with a fresh load', () => {
  const s = new PaintSurface(1400, 120);
  paint(s, blue, { x: 15, y: 30 }, { x: 1385, y: 30 }, 'flat', 12);
  paint(s, blue, { x: 15, y: 90 }, { x: 300, y: 90 }, 'flat', 12); s.render();
  assert.ok(alpha(s, 120, 90) > 230, 'the second stroke is full again');
});
test('undo restores pigment amounts, relief and pixels exactly, and clears to blank', () => {
  const s = new PaintSurface(100, 80);
  paint(s, blue, { x: 10, y: 40 }, { x: 90, y: 40 }); s.render();
  const albedo = s.albedo.slice(), relief = s.relief.slice(), sample = s.sample(50, 40);
  paint(s, yellow, { x: 50, y: 10 }, { x: 50, y: 70 }); s.render();
  assert.notDeepEqual(s.albedo, albedo);
  s.undo(); s.render();
  assert.deepEqual(s.albedo, albedo); assert.deepEqual(s.relief, relief); assert.deepEqual(s.sample(50, 40), sample);
  s.undo(); s.render(); assert.ok(s.albedo.every(v => v === 0)); assert.equal(s.lastSample, null);
});
test('clear removes paint, history and mixing caches', () => {
  const s = new PaintSurface(100, 80);
  paint(s, blue, { x: 10, y: 40 }, { x: 90, y: 40 }); s.render();
  s.clear(); s.render(); assert.equal(s.layers.length, 0); assert.equal(s.history.length, 0);
  assert.equal(s.cache.size, 0); assert.equal(s.sample(50, 40), null); assert.ok(s.albedo.every(v => v === 0));
});
test('all three brushes deposit visible paint; dry brush leaves broken coverage', () => {
  const outputs = BRUSHES.map(b => {
    const s = new PaintSurface(100, 80); paint(s, blue, { x: 10, y: 40 }, { x: 90, y: 40 }, b.id); s.render();
    assert.ok(s.albedo.some((v, i) => i % 4 === 3 && v > 0));
    return s;
  });
  assert.notDeepEqual(outputs[0].albedo, outputs[1].albedo);
  let gaps = 0; for (let x = 20; x < 80; x++) if (alpha(outputs[2], x, 40) < 128) gaps++;
  assert.ok(gaps > 5, 'dry brush skips');
});
test('pointer coordinates at and outside edges are bounded and do not corrupt fields', () => {
  const s = new PaintSurface(100, 80);
  paint(s, blue, { x: -20, y: -20 }, { x: 120, y: 100 }); s.render();
  assert.ok(s.layers[0].amounts.every(Number.isFinite)); assert.ok(s.shape.every(Number.isFinite));
});
test('a long drag is continuous and the rendering cache is bounded', () => {
  const s = new PaintSurface(160, 100);
  paint(s, blue, { x: 10, y: 50 }, { x: 150, y: 50 });
  for (let x = 15; x < 145; x++) assert.ok(s.sample(x, 50), 'no gaps between pointer samples');
  s.render(); assert.ok(s.cache.size <= 65536);
});
test('undo history is bounded without discarding visible paint', () => {
  const s = new PaintSurface(70, 50);
  for (let i = 0; i < 30; i++) paint(s, blue, { x: 10, y: 25 }, { x: 60, y: 25 });
  assert.equal(s.history.length, 24); assert.equal(s.sample(30, 25).hex, blue.hex);
});
test('paint and relief do not depend on pointer event segmentation', () => {
  const draw = count => {
    const s = new PaintSurface(180, 80); s.seed = 7; s.begin([{ pigment: blue, weight: 1 }]);
    for (let i = 0; i < count; i++) s.line({ x: 10 + 160 * i / count, y: 40 }, { x: 10 + 160 * (i + 1) / count, y: 40 }, 10, 10);
    s.end(); return s;
  };
  const a = draw(1), b = draw(47);
  for (let i = 0; i < a.relief.length; i++) assert.ok(Math.abs(a.relief[i] - b.relief[i]) < 1e-5);
  for (let i = 0; i < a.relief.length; i++) assert.ok(Math.abs(a.layers[0].amounts[i] - b.layers[0].amounts[i]) < 1e-5);
});
const tube = (s, pigment, path, frames, volume = 100, nozzle = 6) => {
  s.begin([{ pigment, weight: 1 }], 'tube');
  let p = path[0];
  for (let f = 0; f < frames; f++) { const q = path[Math.min(path.length - 1, Math.floor(f * path.length / frames))]; s.squeeze(p, q, volume, nozzle); s.settle(8); p = q; }
  return s.end();
};
const volume = s => { let v = 0; for (const l of s.layers) for (const a of l.amounts) v += a; return v; };
test('holding the tube still piles paint up into a growing, rounded heap', () => {
  const a = new PaintSurface(160, 160), b = new PaintSurface(160, 160);
  tube(a, red, [{ x: 80, y: 80 }], 15); tube(b, red, [{ x: 80, y: 80 }], 60);
  const radius = s => { let r = 0; while (r < 79 && s.thickness(80 * 160 + 80 + r) > .05) r++; return r; };
  assert.ok(b.thickness(80 * 160 + 80) > a.thickness(80 * 160 + 80), 'it gets higher');
  assert.ok(radius(b) > radius(a), 'and wider as it slumps');
  const across = radius(b), down = (() => { let r = 0; while (r < 79 && b.thickness((80 + r) * 160 + 80) > .05) r++; return r; })();
  assert.ok(Math.abs(across - down) <= 2, 'round, not square');
});
test('slumping moves paint without creating or losing any', () => {
  const s = new PaintSurface(120, 120);
  s.begin([{ pigment: red, weight: 1 }], 'tube');
  s.squeeze({ x: 60, y: 60 }, { x: 60, y: 60 }, 4000, 6);
  const before = volume(s); s.settle(30);
  assert.ok(Math.abs(volume(s) - before) < before * 1e-4);
});
test('a moving tube leaves a bead, and undo removes it exactly', () => {
  const s = new PaintSurface(200, 100);
  paint(s, blue, { x: 10, y: 20 }, { x: 190, y: 20 }); s.render();
  const albedo = s.albedo.slice();
  const path = Array.from({ length: 40 }, (_, i) => ({ x: 20 + i * 4, y: 60 }));
  tube(s, red, path, 40);
  for (let x = 30; x < 170; x += 10) assert.ok(s.thickness(60 * 200 + x) > 1, `bead at ${x}`);
  assert.equal(s.sample(100, 60).hex, red.hex, 'tube paint is the prepared color, unmixed');
  s.undo(); s.render(); assert.deepEqual(s.albedo, albedo);
});
test('a brush dragged through tube paint smears it along', () => {
  const s = new PaintSurface(240, 100);
  tube(s, red, [{ x: 60, y: 50 }], 40);
  paint(s, yellow, { x: 20, y: 50 }, { x: 220, y: 50 }, 'flat', 10);
  const redShare = x => s.sample(x, 50)?.recipe.find(r => r.id === 'red')?.weight || 0;
  assert.ok(redShare(120) > 5, 'red is carried well past the heap');
  assert.ok(redShare(90) > redShare(200), 'and thins out further on');
});
test('a palette knife brings no paint of its own', () => {
  const s = new PaintSurface(120, 80);
  s.begin([], 'knife'); s.line({ x: 10, y: 40 }, { x: 110, y: 40 }, 12, 12); s.end(); s.render();
  assert.ok(s.albedo.every(v => v === 0)); assert.equal(s.layers.length, 0);
});
test('a palette knife spreads two heaps into one mixed, opaque layer without adding paint', () => {
  const s = new PaintSurface(240, 120);
  tube(s, red, [{ x: 90, y: 60 }], 40); tube(s, blue, [{ x: 130, y: 60 }], 40); s.render();
  const albedo = s.albedo.slice(), before = volume(s);
  for (const [a, b] of [[[60, 55], [200, 60]], [[200, 65], [60, 60]], [[60, 58], [200, 62]]]) {
    s.begin([], 'knife'); s.line({ x: a[0], y: a[1] }, { x: b[0], y: b[1] }, 16, 16); s.end();
  }
  assert.ok(volume(s) <= before * 1.0001, 'the knife only moves paint');
  const mixed = s.sample(130, 60).recipe;
  assert.equal(mixed.length, 2, 'both colours are in the smear');
  assert.ok(Math.min(...mixed.map(r => r.weight)) > 10, 'and actually mixed');
  s.render(); assert.ok(s.albedo[(60 * 240 + 160) * 4 + 3] > 230, 'spread as an opaque layer');
  for (let i = 0; i < 3; i++) s.undo();
  s.render(); assert.deepEqual(s.albedo, albedo);
});
test('the pipette hands back the mix under it, ready to load a brush that paints the same colour', () => {
  const white = { id: 'white', hex: '#F4F4F0' }, black = { id: 'black', hex: '#393732' };
  const s = new PaintSurface(200, 100);
  s.begin([{ pigment: white, weight: 50 }, { pigment: black, weight: 50 }]); s.line({ x: 10, y: 50 }, { x: 190, y: 50 }, 14, 14); s.end();
  const picked = s.sample(100, 50);
  assert.equal(picked.hex, mixHex([white.hex, black.hex], [50, 50]), 'grey, not black');
  s.begin(picked.components); s.line({ x: 10, y: 20 }, { x: 190, y: 20 }, 8, 8); s.end();
  assert.equal(s.sample(100, 20).hex, picked.hex, 'painting with it lays the same grey');
});
test('gloss is lighting only: relief never changes the sampled recipe', () => {
  const s = new PaintSurface(180, 80);
  paint(s, blue, { x: 10, y: 40 }, { x: 170, y: 40 }); s.render();
  assert.ok(s.relief.some(v => v > .1), 'bristles raise the paint');
  assert.equal(s.sample(60, 40).hex, blue.hex);
  assert.deepEqual(s.sample(60, 40).recipe, [{ id: blue.id, weight: 100 }]);
});
