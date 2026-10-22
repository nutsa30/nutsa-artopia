import { mixHex, normalize } from './engine.js';
import { kmProfile, mixInto } from './km.js';

export const BRUSHES = [
  { id: 'flat', label: 'ბრტყელი ფუნჯი' },
  { id: 'round', label: 'მრგვალი ფუნჯი' },
  { id: 'dry', label: 'მშრალი ფუნჯი' },
];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const grain = (x, y) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
const EPS = .002;
// deposit: share of a full layer laid per stamp; pickup: share of the wet paint
// under the brush it lifts per stamp; reach: stroke length (in brush radii) a
// full load lasts before the hairs start to run dry.
const BRUSH = {
  flat: { deposit: .26, pickup: .13, reach: 24, ridge: .26, load: 1 },
  round: { deposit: .24, pickup: .11, reach: 22, ridge: .18, load: 1 },
  dry: { deposit: .2, pickup: .05, reach: 7, ridge: .16, load: .55 },
  // The palette knife brings no paint; see the knife branch in dab().
  knife: { deposit: 0, pickup: 0, reach: 1, ridge: 0, load: 0 },
};
// Tube paint is stiff: it holds this slope (thickness per grid cell) before it slumps.
const SLUMP = .32;
// A palette knife spreads paint to about this thickness: it scrapes off what is
// above, fills what is below from the paint on the blade, and trades some of
// the paint it passes with the blade, which is what mixes colours together.
const KNIFE_LAYER = 1.15, KNIFE_TRADE = .3;

/** Wet paint on canvas. Every cell keeps the amount of each pigment.
 * A brush carries a limited load: it lays paint, lifts some of the wet paint
 * it crosses and lays that down further on, so strokes mix, streak and run
 * dry like real ones. A tube squeezes paint out as a bead that piles up and
 * slumps. Thickness and relief drive the gloss; they never alter a recipe.
 */
export class PaintSurface {
  constructor(width = 640, height = 400) {
    this.width = width; this.height = height;
    const n = width * height;
    this.relief = new Float32Array(n);
    this.albedo = new Uint8ClampedArray(n * 4);
    this.shape = new Float32Array(n * 4);
    this.stamp = new Uint32Array(n);
    this.layers = []; this.history = []; this.cache = new Map();
    this.strokeId = 0; this.current = null; this.lastSample = null; this.seed = 1;
    this.dirty = [0, 0, width - 1, height - 1];
  }
  getLayer(pigment) {
    let layer = this.layers.find(l => l.pigment.id === pigment.id);
    if (!layer) {
      layer = { pigment, index: this.layers.length, km: kmProfile(pigment.hex), amounts: new Float32Array(this.width * this.height) };
      this.layers.push(layer);
    }
    return layer;
  }
  random() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }
  begin(components, type = 'flat') {
    if (this.current) this.end();
    const weights = normalize(components.map(c => c.weight));
    const parts = components.map(c => this.getLayer(c.pigment));
    const fresh = new Float32Array(this.layers.length);
    parts.forEach((layer, i) => { fresh[layer.index] += weights[i]; });
    this.current = this.record({
      type, fresh, pick: new Float32Array(this.layers.length), load: null, full: 0, travel: 0, spacing: 0,
      previousSample: this.lastSample, last: null, box: [this.width, this.height, -1, -1], seed: Math.floor(this.random() * 997),
    });
  }
  record(stroke) {
    stroke.id = ++this.strokeId; stroke.stride = 1 + this.layers.length;
    stroke.layerCount = this.layers.length;
    stroke.indices = new Int32Array(4096); stroke.values = new Float32Array(4096 * stroke.stride); stroke.size = 0;
    return stroke;
  }
  remember(stroke, index) {
    if (this.stamp[index] === stroke.id) return;
    this.stamp[index] = stroke.id;
    if (stroke.size === stroke.indices.length) {
      const indices = new Int32Array(stroke.size * 2); indices.set(stroke.indices); stroke.indices = indices;
      const values = new Float32Array(stroke.size * 2 * stroke.stride); values.set(stroke.values); stroke.values = values;
    }
    const o = stroke.size * stroke.stride;
    stroke.indices[stroke.size++] = index;
    stroke.values[o] = this.relief[index];
    for (let j = 0; j < stroke.layerCount; j++) stroke.values[o + 1 + j] = this.layers[j].amounts[index];
  }
  markDirty(x0, y0, x1, y1) {
    if (!this.dirty) this.dirty = [x0, y0, x1, y1];
    else { const d = this.dirty; d[0] = Math.min(d[0], x0); d[1] = Math.min(d[1], y0); d[2] = Math.max(d[2], x1); d[3] = Math.max(d[3], y1); }
  }
  grow(box, x0, y0, x1, y1) { box[0] = Math.min(box[0], x0); box[1] = Math.min(box[1], y0); box[2] = Math.max(box[2], x1); box[3] = Math.max(box[3], y1); }
  thickness(index) { let t = 0; for (const l of this.layers) t += l.amounts[index]; return t; }
  dab(x, y, rx, ry, angle = 0, pressure = 1) {
    const stroke = this.current;
    if (!stroke || stroke.type === 'tube' || rx <= 0 || ry <= 0) return;
    const brush = BRUSH[stroke.type] || BRUSH.flat, L = stroke.layerCount, layers = this.layers, knife = stroke.type === 'knife';
    // A full load lasts about `reach` radii of stroke on bare canvas.
    if (stroke.load === null) {
      stroke.full = Math.max(1, Math.PI * rx * ry * .7 * brush.deposit * brush.reach / .14);
      stroke.load = stroke.full * brush.load;
    }
    // The brush touches down narrower and opens up over the first radius.
    const open = knife ? 1 : .62 + .38 * smoothstep(0, 1.3, stroke.travel);
    rx *= open; ry *= open;
    const minX = clamp(Math.floor(x - rx * 1.2), 0, this.width - 1), maxX = clamp(Math.ceil(x + rx * 1.2), 0, this.width - 1);
    const minY = clamp(Math.floor(y - ry * 1.2), 0, this.height - 1), maxY = clamp(Math.ceil(y + ry * 1.2), 0, this.height - 1);
    const cos = Math.cos(angle), sin = Math.sin(angle), scale = Math.sqrt(rx * ry);
    let picked = 0; for (let j = 0; j < L; j++) picked += stroke.pick[j];
    // Picked-up paint mixes into the tip of the brush, not its whole load: the
    // tip holds about three radii worth of stroke, fed from the reservoir.
    const tip = Math.min(stroke.load, stroke.full / brush.reach * 3);
    const volume = stroke.load + picked, level = volume / stroke.full, share = picked + tip ? picked / (picked + tip) : 0;
    const flow = clamp(level, 0, 1.8) ** .6 * clamp(pressure, .2, 2);
    const laid = new Float32Array(L), lifted = new Float32Array(L);
    let laidFresh = 0, carried = picked;
    for (let py = minY; py <= maxY; py++) for (let px = minX; px <= maxX; px++) {
      const dx = (px + .5 - x) / rx, dy = (py + .5 - y) / ry;
      const u = dx * cos + dy * sin, v = -dx * sin + dy * cos;
      const across = (-px / rx * sin + py / ry * cos) * scale + .6 * Math.sin((px / rx * cos + py / ry * sin) * scale * .025);
      // Hairs: irregular spacing, each with its own stiffness, load and wetness.
      const hair = (across + 1.3 * Math.sin(across * .37 + stroke.seed) + .7 * Math.sin(across * .83)) / 2.6 + stroke.seed, h0 = Math.floor(hair), f = hair - h0, sm = f * f * (3 - 2 * f);
      // Per-hair values blend smoothly across neighbouring hairs: hard lane
      // edges would alias into steps on diagonal strokes.
      const perHair = k => grain(h0, stroke.seed + k) * (1 - sm) + grain(h0 + 1, stroke.seed + k) * sm;
      const fine = perHair(0);
      const bristle = (fine * .6 + (.5 + .5 * Math.sin(across * .19 + stroke.seed)) * .4) * 2 - 1;
      const dryness = perHair(11);
      const tip = knife ? 0 : .05 * Math.sin(v * 28) + .03 * Math.sin(v * 53);
      const distance = knife ? (Math.abs(u / .6) ** 8 + Math.abs(v) ** 8) ** (1 / 8) : stroke.type === 'round' ? Math.hypot(u, v) * (1 + .05 * Math.sin(Math.atan2(v, u) * 7 + stroke.seed)) : (Math.abs((u + tip) / .5) ** 6 + Math.abs(v) ** 6) ** (1 / 6);
      if (distance >= 1) continue;
      // Smooth weight along the stroke so overlapping stamps sum evenly.
      const along = stroke.type === 'round' ? Math.exp(-u * u * 2.2) : Math.exp(-(((u + tip) / (knife ? .6 : .5)) ** 2) * 2.4);
      let touch = Math.min(1, (1 - distance) * 7) * along;
      // Splayed outer hairs touch less.
      if (!knife && Math.abs(v) > .82) touch *= .25 + .75 * smoothstep(.2, .4, perHair(3));
      if (touch < .002) continue;
      // As the load runs out, the drier hairs stop laying paint first.
      const wet = smoothstep(dryness * .75 - .06, dryness * .75 + .06, level * (stroke.type === 'dry' ? .9 : 1));
      const lay = touch * wet * brush.deposit * flow * (.75 + .5 * perHair(5));
      const lift = touch * brush.pickup;
      const index = py * this.width + px;
      if (knife) {
        let total = 0; for (let j = 0; j < L; j++) total += layers[j].amounts[index];
        if (total < EPS && carried < EPS) continue;
        this.remember(stroke, index);
        const layer = KNIFE_LAYER / clamp(pressure, .5, 2);
        // Scrape what stands above the blade, and trade a little with it.
        const take = Math.min(1, (total > layer ? (total - layer) / total * .6 : 0) + KNIFE_TRADE) * touch;
        let after = total;
        for (let j = 0; j < L; j++) { const t = layers[j].amounts[index] * take; layers[j].amounts[index] -= t; lifted[j] += t; after -= t; }
        // Lay the blade's paint into whatever is below the layer it leaves.
        const put = Math.min(carried, Math.max(0, layer - after) * touch * .8 + total * take * .9);
        if (put > 0 && picked) {
          for (let j = 0; j < L; j++) { const m = put * stroke.pick[j] / picked; layers[j].amounts[index] += m; laid[j] += m; }
          carried -= put;
        }
        this.relief[index] += (.2 * Math.exp(-(((Math.abs(v) - .93) / .06) ** 2)) - this.relief[index]) * Math.min(1, touch * .7);
        continue;
      }
      this.remember(stroke, index);
      // Picked-up paint comes off some hairs more than others: streaky mixing.
      const dirt = clamp(share * (.4 + 1.2 * perHair(9)), 0, 1);
      for (let j = 0; j < L; j++) {
        const a = layers[j].amounts[index], take = a * lift;
        const put = lay * ((1 - dirt) * stroke.fresh[j] + (picked ? dirt * stroke.pick[j] / picked : 0));
        layers[j].amounts[index] = a - take + put;
        lifted[j] += take; laid[j] += put;
      }
      laidFresh += lay * (1 - dirt);
      const ridge = brush.ridge * (.6 + .4 * bristle) * (1 - .25 * v * v) + (stroke.type === 'flat' ? .14 * Math.exp(-(((Math.abs(v) - .86) / .08) ** 2)) : 0);
      this.relief[index] += (ridge - this.relief[index]) * Math.min(1, touch * .45);
    }
    // Exchange with the brush: what was laid leaves it, what was lifted joins it.
    stroke.load = Math.max(0, stroke.load - laidFresh);
    let left = 0;
    for (let j = 0; j < L; j++) {
      const fromPick = Math.max(0, laid[j] - laidFresh * stroke.fresh[j]);
      stroke.pick[j] = Math.max(0, stroke.pick[j] - fromPick + lifted[j]);
      left += stroke.pick[j];
    }
    if (left < 1e-6) stroke.pick.fill(0);
    stroke.last = { x, y };
    this.grow(stroke.box, minX, minY, maxX, maxY);
    this.markDirty(minX, minY, maxX, maxY);
  }
  line(from, to, rx, ry, pressure = 1) {
    const stroke = this.current;
    if (!stroke || rx <= 0 || ry <= 0) return;
    const dx = to.x - from.x, dy = to.y - from.y;
    const distance = Math.hypot(dx / rx, dy / ry);
    if (distance < .00001) return;
    const angle = Math.atan2(dy / ry, dx / rx);
    // Fixed spacing between stamps: pointer event rate never changes the paint.
    const steps = Math.floor((stroke.spacing + distance + 1e-9) / .14);
    for (let i = 1; i <= steps; i++) {
      const step = i * .14 - stroke.spacing;
      this.dab(from.x + dx * step / distance, from.y + dy * step / distance, rx, ry, angle, pressure);
      stroke.travel += .14;
    }
    stroke.spacing = Math.max(0, stroke.spacing + distance - steps * .14);
  }
  /** Tube: squeezes `volume` of paint along from→to (or onto one spot) as a
   * round bead with a nozzle of radius `nozzle`. Call settle() afterwards. */
  squeeze(from, to, volume, nozzle) {
    const stroke = this.current;
    if (!stroke || stroke.type !== 'tube' || volume <= 0 || nozzle <= 0) return;
    const L = stroke.layerCount, layers = this.layers, sigma = nozzle * .55;
    const length = Math.hypot(to.x - from.x, to.y - from.y), count = Math.max(1, Math.ceil(length));
    const reach = Math.ceil(sigma * 2.6), per = volume / count, norm = 1 / (2 * Math.PI * sigma * sigma);
    for (let s = 1; s <= count; s++) {
      const cx = from.x + (to.x - from.x) * s / count, cy = from.y + (to.y - from.y) * s / count;
      const minX = clamp(Math.floor(cx - reach), 0, this.width - 1), maxX = clamp(Math.ceil(cx + reach), 0, this.width - 1);
      const minY = clamp(Math.floor(cy - reach), 0, this.height - 1), maxY = clamp(Math.ceil(cy + reach), 0, this.height - 1);
      for (let py = minY; py <= maxY; py++) for (let px = minX; px <= maxX; px++) {
        const d2 = (px + .5 - cx) ** 2 + (py + .5 - cy) ** 2;
        const put = per * norm * Math.exp(-d2 / (2 * sigma * sigma));
        if (put < 1e-5) continue;
        const index = py * this.width + px;
        this.remember(stroke, index);
        for (let j = 0; j < L; j++) layers[j].amounts[index] += put * stroke.fresh[j];
        // Squeezed paint is smooth; it fills the brush marks under it.
        this.relief[index] *= Math.max(0, 1 - put * 2);
      }
      this.grow(stroke.box, minX, minY, maxX, maxY);
      stroke.recent = stroke.recent || [this.width, this.height, -1, -1];
      this.grow(stroke.recent, minX, minY, maxX, maxY);
      this.markDirty(minX, minY, maxX, maxY);
    }
    stroke.last = { x: to.x, y: to.y };
  }
  /** Stiff paint slumps: wherever the surface is steeper than it can hold,
   * paint flows to the lower neighbour, carrying its own pigments. */
  settle(iterations = 3, keep = false) {
    const stroke = this.current;
    if (!stroke || stroke.type !== 'tube' || !stroke.recent || stroke.recent[2] < 0) return false;
    const W = this.width, H = this.height, layers = this.layers, L = stroke.layerCount;
    // Only around fresh paint; older paint has already found its shape.
    const [bx0, by0, bx1, by1] = stroke.recent, pad = 40;
    const x0 = Math.max(0, bx0 - pad), y0 = Math.max(0, by0 - pad), x1 = Math.min(W - 1, bx1 + pad), y1 = Math.min(H - 1, by1 + pad);
    const thick = i => { let t = 0; for (let j = 0; j < L; j++) t += layers[j].amounts[i]; return t; };
    const move = (from, to, amount) => {
      const total = thick(from); if (total <= 0) return;
      const r = Math.min(.5, amount / total);
      this.remember(stroke, from); this.remember(stroke, to);
      for (let j = 0; j < L; j++) { const m = layers[j].amounts[from] * r; layers[j].amounts[from] -= m; layers[j].amounts[to] += m; }
    };
    // Eight neighbours (diagonals at their true distance) keep piles round.
    const around = [[1, 0, 1], [0, 1, 1], [-1, 0, 1], [0, -1, 1], [1, 1, Math.SQRT2], [-1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, -1, Math.SQRT2]];
    let changed = false;
    for (let it = 0; it < iterations; it++) {
      let moved = false;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const i = y * W + x, t = thick(i);
        if (t < SLUMP) continue;
        for (const [ox, oy, dist] of around) {
          const nx = x + ox, ny = y + oy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const n = ny * W + nx, drop = t - thick(n), excess = drop - SLUMP * dist;
          // Past the slope it can hold paint slides; below it, it still creeps a
          // little, which rounds the top of a heap instead of leaving a cone.
          const flow = (excess > 0 ? excess * .12 : 0) + (drop > .02 ? drop * .015 / dist : 0);
          if (flow > .002) { move(i, n, flow); moved = true; }
        }
      }
      if (!moved) break;
      changed = true;
    }
    if (changed) {
      this.grow(stroke.box, Math.max(0, x0 - 1), Math.max(0, y0 - 1), Math.min(W - 1, x1 + 1), Math.min(H - 1, y1 + 1));
      this.markDirty(Math.max(0, x0 - 1), Math.max(0, y0 - 1), Math.min(W - 1, x1 + 1), Math.min(H - 1, y1 + 1));
    }
    if (!keep) stroke.recent = null;
    return changed;
  }
  sample(x, y) {
    const index = clamp(Math.floor(y), 0, this.height - 1) * this.width + clamp(Math.floor(x), 0, this.width - 1);
    const active = this.layers.filter(l => l.amounts[index] > EPS * 4);
    if (!active.length) return null;
    const amounts = active.map(l => l.amounts[index]), weights = normalize(amounts);
    const hex = mixHex(active.map(l => l.pigment.hex), amounts);
    // `components` is the same mix in the form a brush is loaded with.
    return { hex, x: clamp(x / this.width, 0, 1), y: clamp(y / this.height, 0, 1), recipe: active.map((l, i) => ({ id: l.pigment.id, weight: weights[i] * 100 })), components: active.map((l, i) => ({ pigment: l.pigment, weight: weights[i] * 100 })) };
  }
  end() {
    const stroke = this.current;
    if (!stroke) return this.lastSample;
    if (stroke.type === 'tube' && stroke.box[2] >= 0) { stroke.recent = [...stroke.box]; this.settle(8); }
    this.current = null;
    if (stroke.size) {
      this.history.push(stroke);
      if (this.history.length > 24) this.history.shift();
      this.lastSample = stroke.last ? this.sample(stroke.last.x, stroke.last.y) || this.lastSample : this.lastSample;
    }
    return this.lastSample;
  }
  undo() {
    if (this.current) this.end();
    const stroke = this.history.pop();
    if (!stroke) return this.lastSample;
    for (let i = stroke.size - 1; i >= 0; i--) {
      const index = stroke.indices[i], o = i * stroke.stride;
      this.relief[index] = stroke.values[o];
      for (let j = 0; j < this.layers.length; j++) this.layers[j].amounts[index] = j < stroke.layerCount ? stroke.values[o + 1 + j] : 0;
      this.stamp[index] = 0;
    }
    this.markDirty(0, 0, this.width - 1, this.height - 1);
    this.lastSample = stroke.previousSample;
    return this.lastSample;
  }
  clear() {
    this.layers = []; this.history = []; this.current = null; this.lastSample = null;
    this.cache.clear(); this.relief.fill(0); this.albedo.fill(0); this.shape.fill(0); this.stamp.fill(0);
    this.dirty = [0, 0, this.width - 1, this.height - 1];
  }
  /** Updates `albedo` (premultiplied sRGB + coverage) and `shape`
   * (normal x/y, height, coverage) inside the dirty rectangle. */
  render() {
    if (!this.dirty) return null;
    const W = this.width, H = this.height, layers = this.layers, L = layers.length;
    const rect = [Math.max(0, this.dirty[0] - 1), Math.max(0, this.dirty[1] - 1), Math.min(W - 1, this.dirty[2] + 1), Math.min(H - 1, this.dirty[3] + 1)];
    const list = [], amounts = new Float64Array(Math.max(1, L)), rgb = new Float64Array(3), ids = new Int32Array(Math.max(1, L));
    const height = i => { let t = 0; for (let j = 0; j < L; j++) t += layers[j].amounts[i]; return 10 * (1 - Math.exp(-t / 10)) * .55 + this.relief[i] * Math.min(1, t * 1.6); };
    for (let y = rect[1]; y <= rect[3]; y++) for (let x = rect[0]; x <= rect[2]; x++) {
      const index = y * W + x, o = index * 4;
      let total = 0, n = 0;
      for (let j = 0; j < L; j++) { const a = layers[j].amounts[index]; if (a > EPS) { total += a; ids[n] = j; amounts[n++] = a; } }
      if (!n) { this.albedo.fill(0, o, o + 4); this.shape[o] = 0; this.shape[o + 1] = 0; this.shape[o + 2] = 0; this.shape[o + 3] = 0; continue; }
      // Cached by pigment set and 1/255 shares; the sampled recipe stays exact.
      let key = -1;
      if (n <= 3) { key = 0; for (let j = 0; j < n; j++) key = key * 65536 + ids[j] * 256 + Math.round(amounts[j] / total * 255); }
      let color = key >= 0 ? this.cache.get(key) : null;
      if (!color) {
        list.length = n; for (let j = 0; j < n; j++) list[j] = layers[ids[j]].km;
        mixInto(rgb, 0, list, amounts, n);
        color = [rgb[0], rgb[1], rgb[2]];
        if (key >= 0) { if (this.cache.size >= 65536) this.cache.clear(); this.cache.set(key, color); }
      }
      const cover = 1 - Math.exp(-total * 4.5);
      this.albedo[o] = color[0] * cover; this.albedo[o + 1] = color[1] * cover; this.albedo[o + 2] = color[2] * cover; this.albedo[o + 3] = cover * 255;
      const left = x > 0 ? height(index - 1) : height(index), right = x < W - 1 ? height(index + 1) : height(index);
      const up = y > 0 ? height(index - W) : height(index), down = y < H - 1 ? height(index + W) : height(index);
      this.shape[o] = (left - right) * .5; this.shape[o + 1] = (up - down) * .5; this.shape[o + 2] = height(index); this.shape[o + 3] = cover;
    }
    this.dirty = null;
    return rect;
  }
}
