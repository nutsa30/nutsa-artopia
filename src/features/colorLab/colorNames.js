import { normalizeText } from './catalog.js';

export const titleCase = name => String(name || '').replace(/(^|[\s-])[a-z]/g, c => c.toUpperCase());
export function colorName(p) {
  const fixed = { '14101': 'Titanium White', '14102': 'Zinc White', '14494': 'Ultramarine Blue' };
  const name = fixed[p?.id] || p?.name || 'Custom Mix';
  return titleCase(({ ultramarine: 'Ultramarine Blue', 'phthalocyanine blue': 'Phthalo Blue', 'phthalocyanine green': 'Phthalo Green' })[normalizeText(name)] || name);
}
/** One selectable name, with explicit real catalogue IDs attached to that name.
 * Similar hues, chemical CI matches and RGB proximity are not shop matches.
 */
export function uniqueColors(profiles) {
  const groups = new Map();
  for (const p of profiles) {
    const name = colorName(p), key = normalizeText(name);
    let group = groups.get(key);
    if (!group) {
      group = { ...p, name, productIds: [], memberIds: [], aliases: [], pigments: [...p.pigments] };
      groups.set(key, group);
    }
    group.memberIds.push(p.id);
    if (p.productId != null && !group.productIds.includes(p.productId)) group.productIds.push(p.productId);
    group.aliases = [...new Set([...group.aliases, ...p.aliases, p.name, p.ka])];
  }
  return [...groups.values()];
}
export function exactColorProducts(products, colors) {
  const ids = new Set(colors.flatMap(c => c.productIds || (c.productId != null ? [c.productId] : [])));
  return products.filter(p => ids.has(p.id));
}
