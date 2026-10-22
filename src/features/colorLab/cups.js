import { mixHex, percentages } from './engine.js';

export const MAX_CUPS = 6;
// Every filled cup holds a share of the mix in percent; the shares always add
// up to 100. A cup is a 200 ml beaker, so its level shows its share.
export const CUP_ML = 200, STEP = 5, MIN_SHARE = 5;
export const cupMl = share => share / 100 * CUP_ML;
const emptyCup = id => ({ id, ingredients: [], status: 'empty', result: null, token: null });
export const initialCups = () => ({ cups: [emptyCup(1), emptyCup(2)], activeId: 1, nextId: 3, blend: emptyCup('blend') });
export function cupResult(ingredients) {
  if (!ingredients.length) return null;
  return {
    hex: mixHex(ingredients.map(i => i.pigment.hex), ingredients.map(i => i.parts)),
    components: ingredients.map(i => ({ pigment: i.pigment, weight: i.parts })),
  };
}
export const cupShares = cup => percentages(cup.ingredients.map(i => i.parts));
/** Whole-number shares as shown, adding up to exactly 100. */
export const shownShares = cups => {
  const filled = cups.filter(c => c.ingredients.length), shown = percentages(filled.map(c => c.ingredients[0].parts));
  return new Map(filled.map((c, i) => [c.id, shown[i]]));
};
const withShare = (cup, parts) => ({ ...cup, ingredients: [{ ...cup.ingredients[0], parts }] });
// A cup filled or emptied changes how many share the mix: start them equal.
function equalShares(cups) {
  const filled = cups.filter(c => c.ingredients.length), each = 100 / (filled.length || 1);
  return cups.map(c => c.ingredients.length ? withShare(c, each) : c);
}
/** Sets one cup's share; the others give or take the difference in
 * proportion to what they hold, none going below MIN_SHARE. */
export function setShare(cups, id, share) {
  const filled = cups.filter(c => c.ingredients.length), target = filled.find(c => c.id === id);
  if (!target || filled.length < 2) return cups;
  const value = Math.max(MIN_SHARE, Math.min(100 - MIN_SHARE * (filled.length - 1), share));
  const shares = new Map([[id, value]]);
  let others = filled.filter(c => c.id !== id), rest = 100 - value;
  // Proportional first; any cup pushed under the minimum is pinned there and
  // the rest is shared again among the others.
  for (;;) {
    const held = others.reduce((a, c) => a + c.ingredients[0].parts, 0);
    const pinned = others.filter(c => (held ? c.ingredients[0].parts / held * rest : rest / others.length) < MIN_SHARE);
    if (!pinned.length) { for (const c of others) shares.set(c.id, held ? c.ingredients[0].parts / held * rest : rest / others.length); break; }
    for (const c of pinned) { shares.set(c.id, MIN_SHARE); rest -= MIN_SHARE; }
    others = others.filter(c => !pinned.includes(c));
    if (!others.length) break;
  }
  return cups.map(c => shares.has(c.id) ? withShare(c, shares.get(c.id)) : c);
}
export function cupsReducer(state, action) {
  const locked = state.blend.status === 'mixing';
  const reset = cups => ({ ...state, cups, blend: emptyCup('blend') });
  switch (action.type) {
    case 'select': return state.cups.some(c => c.id === action.id) ? { ...state, activeId: action.id } : state;
    case 'add': return locked || state.cups.length >= MAX_CUPS ? state : { ...reset([...state.cups, emptyCup(state.nextId)]), activeId: state.nextId, nextId: state.nextId + 1 };
    case 'remove': {
      if (locked) return state;
      const id = action.id ?? state.activeId;
      const cups = equalShares(state.cups.length <= 2 ? state.cups.map(c => c.id === id ? emptyCup(id) : c) : state.cups.filter(c => c.id !== id));
      return { ...reset(cups), activeId: cups.some(c => c.id === state.activeId) ? state.activeId : cups[0].id };
    }
    case 'ingredient': {
      if (locked || !action.pigment) return state;
      const active = state.cups.find(c => c.id === state.activeId);
      let cups = state.cups.map(c => c.id === state.activeId ? { ...emptyCup(c.id), ingredients: [{ pigment: action.pigment, parts: c.ingredients[0]?.parts || 0 }], status: 'ready' } : c);
      // A new colour in a filled cup keeps its share; filling an empty one re-splits.
      if (!active?.ingredients.length) cups = equalShares(cups);
      return { ...reset(cups), activeId: cups.find(c => !c.ingredients.length)?.id ?? state.activeId };
    }
    case 'parts': return locked || !Number.isFinite(action.parts) ? state : reset(setShare(state.cups, action.id, action.parts));
    case 'mix': {
      if (locked || !state.cups.some(c => c.ingredients.length)) return state;
      const grouped = new Map();
      for (const { ingredients } of state.cups) for (const i of ingredients) {
        const previous = grouped.get(i.pigment.id);
        grouped.set(i.pigment.id, { ...i, parts: i.parts + (previous?.parts || 0) });
      }
      const ingredients = [...grouped.values()];
      return { ...state, blend: { ...emptyCup('blend'), ingredients, result: cupResult(ingredients), status: 'mixing', token: action.token } };
    }
    case 'finish': return state.blend.status === 'mixing' && state.blend.token === action.token ? { ...state, blend: { ...state.blend, status: 'mixed' } } : state;
    case 'recipe': {
      const valid = action.components.filter(i => i.pigment && Number.isFinite(i.weight) && i.weight > 0);
      if (!valid.length) return state;
      // Exact ratio, as shares of 100.
      const total = valid.reduce((a, i) => a + i.weight, 0);
      const ingredients = valid.map(i => ({ pigment: i.pigment, parts: i.weight / total * 100 }));
      const cups = ingredients.map((i, index) => ({ ...emptyCup(state.nextId + index), ingredients: [i], status: 'ready' }));
      if (cups.length === 1) cups.push(emptyCup(state.nextId + 1));
      return { cups, activeId: cups[0].id, nextId: state.nextId + cups.length, blend: { ...emptyCup('blend'), ingredients, status: 'mixed', result: cupResult(ingredients) } };
    }
    default: return state;
  }
}
