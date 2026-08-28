/**
 * ფასდაკლებების ერთიანი ლოგიკა (ფრონტი).
 *
 * მთავარი წესი:
 *   პრომო კოდი მოქმედებს **მხოლოდ** იმ პროდუქტებზე, რომლებსაც ადმინის
 *   მიერ დაწესებული ფასდაკლება (`sale`) არ აქვთ.
 *
 *   • ფასდაკლებულ პროდუქტს რჩება მხოლოდ თავისი ორიგინალი ფასდაკლება.
 *   • დანარჩენ (სრულფასიან) პროდუქტებზე პრომო კოდი ჩვეულებრივ მუშაობს.
 *
 * ⚠ ავტორიტეტული გამოთვლა ბექენდშია (`app/pricing.py`) — აქაური ლოგიკა
 *   მხოლოდ მყისიერი UI-პრევიუსთვის და ბექთან კავშირის გაწყვეტისას fallback-ად.
 *   ორივე მხარე ერთსა და იმავე შედეგს უნდა იძლეოდეს.
 */

/** sale-ის უსაფრთხო ნორმალიზება 0..100 დიაპაზონში (არავალიდური → 0) */
export const normalizeSale = (value) => {
  const s = Number(value);
  if (!Number.isFinite(s) || s <= 0 || s > 100) return 0;
  return Math.trunc(s);
};

/** ერთეულის ფასი ადმინის ფასდაკლების გათვალისწინებით */
export const unitPrice = (item) => {
  const price = Number(item?.price || 0);
  if (!Number.isFinite(price) || price <= 0) return 0;
  const sale = normalizeSale(item?.sale);
  const value = sale ? price * (1 - sale / 100) : price;
  return +value.toFixed(2);
};

/** ორიგინალი (ფასდაკლებამდე) ფასი */
export const originalPrice = (item) => {
  const price = Number(item?.price || 0);
  return Number.isFinite(price) && price > 0 ? +price.toFixed(2) : 0;
};

/** true — თუ პროდუქტზე პრომო კოდს უფლება აქვს (ე.ი. ადმინის ფასდაკლება არ აქვს) */
export const isPromoEligible = (item) => normalizeSale(item?.sale) === 0;

const normalizeQuantity = (value) => {
  const q = Number(value);
  return Number.isFinite(q) && q > 0 ? Math.trunc(q) : 0;
};

/**
 * კალათის დაშლა პრომო-კოდის ბაზისებად.
 * @returns {{subtotal:number, eligibleSubtotal:number, excludedSubtotal:number,
 *            eligibleCount:number, excludedCount:number, lines:Array}}
 */
export const buildCartBreakdown = (cartItems = []) => {
  let subtotal = 0;
  let eligibleSubtotal = 0;
  let excludedSubtotal = 0;
  const lines = [];

  for (const item of cartItems) {
    if (!item) continue;
    const qty = normalizeQuantity(item.quantity);
    const up = unitPrice(item);
    const lineTotal = +(up * qty).toFixed(2);
    const eligible = isPromoEligible(item);

    subtotal += lineTotal;
    if (eligible) eligibleSubtotal += lineTotal;
    else excludedSubtotal += lineTotal;

    lines.push({
      id: item.id,
      quantity: qty,
      sale: normalizeSale(item.sale),
      unitPrice: up,
      originalPrice: originalPrice(item),
      lineTotal,
      promoEligible: eligible,
    });
  }

  return {
    subtotal: +subtotal.toFixed(2),
    eligibleSubtotal: +eligibleSubtotal.toFixed(2),
    excludedSubtotal: +excludedSubtotal.toFixed(2),
    eligibleCount: lines.filter((l) => l.promoEligible).length,
    excludedCount: lines.filter((l) => !l.promoEligible).length,
    lines,
  };
};

/** პრომო ფასდაკლება — მხოლოდ დასაშვები (არაფასდაკლებული) ბაზიდან */
export const couponDiscountFor = (eligibleSubtotal, percent) => {
  const base = Number(eligibleSubtotal || 0);
  const pct = Number(percent || 0);
  if (!Number.isFinite(base) || base <= 0) return 0;
  if (!Number.isFinite(pct) || pct < 1 || pct > 100) return 0;
  return +Math.min(base, base * (pct / 100)).toFixed(2);
};

/** ბექენდის REASON_* კოდების ქართული შესატყვისები (ოფლაინ fallback-ისთვის) */
export const PROMO_MESSAGES = {
  ok: "პრომო კოდი გააქტიურდა",
  empty_code: "შეიყვანეთ პრომო კოდი",
  not_found: "ასეთი პრომო კოდი არ არსებობს",
  inactive: "პრომო კოდი გათიშულია",
  not_started: "პრომო კოდი ჯერ არ ამოქმედებულა",
  expired: "პრომო კოდს ვადა გაუვიდა",
  usage_limit_reached: "პრომო კოდის გამოყენების ლიმიტი ამოიწურა",
  min_subtotal_not_met: "პრომო კოდისთვის შეკვეთის ჯამი საკმარისი არ არის",
  all_items_on_sale:
    "კალათაში ყველა პროდუქტი უკვე ფასდაკლებულია — პრომო კოდი ფასდაკლებულ პროდუქტზე არ ვრცელდება",
  empty_cart: "კალათა ცარიელია",
};
