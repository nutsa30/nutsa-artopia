import test from 'node:test';
import assert from 'node:assert/strict';
import { initialCups, cupsReducer as reduce, cupShares, shownShares, MAX_CUPS } from '../src/features/colorLab/cups.js';
const red = { id: 'red', name: 'Red', hex: '#C83942' };
const blue = { id: 'blue', name: 'Blue', hex: '#002185' }, yellow = { id: 'yellow', name: 'Yellow', hex: '#FCD200' };
const add = (s, pigment) => reduce(s, { type: 'ingredient', pigment });
test('two source cups are visible initially and mix the existing spectral blue/yellow fixture', () => {
  let s = add(add(initialCups(), blue), yellow);
  assert.equal(s.cups.length,2);
  s = reduce(s, { type: 'mix', token: 1 });
  assert.equal(s.blend.result.hex, '#3D933E'); assert.equal(s.blend.status, 'mixing');
  s = reduce(s, { type: 'finish', id: 1, token: 1 });
  assert.equal(s.blend.status, 'mixed'); assert.deepEqual(cupShares(s.blend), [50, 50]);
  assert.deepEqual(s.blend.result.components.map(c => c.weight), [50, 50]);
});
test('choosing a color fills a cup and advances to the next empty cup; selecting it again replaces it', () => {
  let s = add(initialCups(),blue); assert.equal(s.activeId,2);
  s = add(s,yellow); assert.equal(s.cups[0].ingredients[0].pigment.id,'blue');
  s = reduce(s,{type:'select',id:1}); s = add(s,yellow);
  assert.equal(s.cups[0].ingredients.length,1); assert.equal(s.cups[0].ingredients[0].pigment.id,'yellow');
});
test('editing a mixed recipe requires a fresh mix; an earlier prepared snapshot stays intact', () => {
  let s = add(add(initialCups(), blue), yellow);
  s = reduce(reduce(s, { type: 'mix', token: 1 }), { type: 'finish', id: 1, token: 1 });
  const loaded = s.blend.result;
  s = reduce(s, { type: 'parts', id: 1, parts: 60 });
  assert.equal(s.blend.result, null); assert.equal(s.blend.status, 'empty');
  assert.equal(loaded.hex, '#3D933E'); assert.deepEqual(loaded.components.map(c => c.weight), [50, 50]);
});
test('selection during mixing cannot redirect its asynchronous result', () => {
  let s = reduce(add(add(initialCups(), blue), yellow), { type: 'mix', token: 7 });
  s = reduce(s,{type:'select',id:1});
  s = reduce(s, { type: 'finish', id: 1, token: 7 });
  assert.equal(s.activeId, 1); assert.equal(s.blend.status, 'mixed'); assert.equal(s.blend.result.hex,'#3D933E');
});
test('mixing locks ingredients and stale animation completions cannot restore cleared paint', () => {
  let s = reduce(add(add(initialCups(), blue), yellow), { type: 'mix', token: 7 });
  assert.equal(add(s, yellow), s);
  s = reduce(s, {type:'recipe',components:[{pigment:yellow,weight:100}]});
  s = reduce(s, { type: 'finish', id: 1, token: 7 });
  assert.equal(s.blend.status, 'mixed'); assert.equal(s.blend.result.hex,yellow.hex);
});
test('six cup limit, removal and monotonic IDs prevent pending jobs from targeting a new cup', () => {
  let s = initialCups(); for (let i = 0; i < 10; i++) s = reduce(s, { type: 'add' });
  assert.equal(s.cups.length, MAX_CUPS); assert.equal(s.activeId, 6);
  s = reduce(s, { type: 'remove' }); s = reduce(s, { type: 'add' });
  assert.equal(s.activeId, 7); assert.equal(s.cups.length, 6);
});
test('reverse recipes populate source cups and retain full ratios rather than display-rounded percentages', () => {
  let s = add(initialCups(), blue);
  s = reduce(s, { type: 'recipe', components: [{ pigment: blue, weight: 33.333 }, { pigment: yellow, weight: 66.667 }] });
  assert.equal(s.cups.length, 2); assert.equal(s.cups[0].ingredients.length, 1);
  assert.equal(s.blend.status, 'mixed');
  const [a, b] = s.cups.map(c => c.ingredients[0].parts);
  assert.ok(Math.abs(a / b - 33.333 / 66.667) < 1e-12, 'exact ratio kept'); assert.ok(Math.abs(a + b - 100) < 1e-9, 'as shares of 100');
});
const sum = s => s.cups.reduce((t, c) => t + (c.ingredients[0]?.parts || 0), 0);
test('shares stay between 5% and 95% for two cups, always totalling 100', () => {
  let s = add(add(initialCups(), blue), yellow);
  s = reduce(s, { type: 'parts', id: 1, parts: -2 }); assert.deepEqual(s.cups.map(c => c.ingredients[0].parts), [5, 95]);
  s = reduce(s, { type: 'parts', id: 1, parts: Infinity }); assert.deepEqual(s.cups.map(c => c.ingredients[0].parts), [5, 95]);
  s = reduce(s, { type: 'parts', id: 1, parts: 500 }); assert.deepEqual(s.cups.map(c => c.ingredients[0].parts), [95, 5]);
  s = reduce(s,{type:'mix',token:1}); assert.equal(cupShares(s.blend).reduce((a,b)=>a+b,0),100);
});
test('raising one cup takes the difference from the others in proportion', () => {
  let s = reduce(add(add(initialCups(), blue), yellow), { type: 'add' });
  s = add(s, red);
  assert.deepEqual([...shownShares(s.cups).values()], [34, 33, 33], 'a third cup re-splits equally');
  s = reduce(s, { type: 'parts', id: 2, parts: 20 });
  const [a, , c] = s.cups.map(x => x.ingredients[0].parts);
  assert.ok(Math.abs(a - c) < 1e-9 && Math.abs(a - 40) < 1e-9, 'the other two share the 80% left as they held it');
  assert.ok(Math.abs(sum(s) - 100) < 1e-9);
  s = reduce(s, { type: 'parts', id: 1, parts: 92 });
  assert.deepEqual(s.cups.map(x => +x.ingredients[0].parts.toFixed(6)), [90, 5, 5], 'nobody goes under 5%');
  assert.deepEqual([...shownShares(s.cups).values()].reduce((a, b) => a + b, 0), 100);
});
test('removing a cup or filling an empty one splits the shares equally again', () => {
  let s = reduce(add(add(initialCups(), blue), yellow), { type: 'parts', id: 1, parts: 80 });
  s = reduce(s, { type: 'remove', id: 2 });
  assert.equal(s.cups[0].ingredients[0].parts, 100, 'one cup holds the whole mix');
  s = add(reduce(s, { type: 'select', id: 2 }), yellow);
  assert.deepEqual(s.cups.map(c => c.ingredients[0].parts), [50, 50]);
});
test('the two starting cups cannot be removed, and identical colors merge into one recipe ingredient',()=>{
  let s=reduce(initialCups(),{type:'remove',id:1}); assert.equal(s.cups.length,2);
  s=reduce(add(add(s,blue),blue),{type:'mix',token:1});
  assert.equal(s.blend.ingredients.length,1); assert.equal(s.blend.result.hex,blue.hex);
});
test('a single filled cup can be poured on its own and keeps its exact color',()=>{
  let s=reduce(add(initialCups(),yellow),{type:'mix',token:3});
  assert.equal(s.blend.status,'mixing'); assert.equal(s.blend.result.hex,yellow.hex);
  assert.equal(reduce(initialCups(),{type:'mix',token:4}).blend.status,'empty','an empty bench cannot be mixed');
});
test('a new colour in a cup keeps the share already set for it',()=>{
  let s=add(add(initialCups(),blue),red); s=reduce(s,{type:'parts',id:1,parts:70});
  s=reduce(s,{type:'select',id:1}); s=add(s,yellow);
  assert.equal(s.cups[0].ingredients[0].parts,70); assert.equal(s.cups[0].ingredients[0].pigment.id,'yellow');
});
