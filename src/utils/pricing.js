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

import { engravingCourierEta } from "./engraving";

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

/** true — თუ პროდუქტზე პრომო კოდს უფლება აქვს (ე.ი. ადმინის ფასდაკლება არ აქვს
 *  და გრავირებული არ არის — გრავირებაზე პრომო კოდი არასდროს ვრცელდება) */
export const isPromoEligible = (item) =>
  !item?.engraving_token && normalizeSale(item?.sale) === 0;

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

/**
 * მიტანის ლოგიკა (QuickShipper-ის ჩანაცვლების შემდეგ — ფიქსირებული, ქალაქზე
 * დამოკიდებული ტარიფი). ავტორიტეტული გამოთვლა ბექენდშია (`app/delivery.py`),
 * აქაური კი მხოლოდ მყისიერი UI-პრევიუსთვისაა.
 */
export const MIN_ORDER_SUBTOTAL = 20;

export const TBILISI_COURIER_FEE = 5;
export const TBILISI_FREE_THRESHOLD = 50;
export const REGION_COURIER_FEE = 7;
export const REGION_FREE_THRESHOLD = 70;

export const PICKUP_CUTOFF_HOUR = 18;

export const isTbilisiCity = (city) => {
  const lc = (city || "").trim().toLowerCase();
  return lc === "tbilisi" || lc === "თბილისი";
};

/** {isTbilisi, baseFee, freeThreshold, waived, fee, discount, etaLabel}
 *  hasEngraving — გრავირებიანი შეკვეთა კურიერს დამზადების (2-3 სამ. დღე) შემდეგ გადაეცემა */
export const courierDeliveryInfo = (city, subtotal, hasEngraving = false) => {
  const st = Number(subtotal) || 0;
  const tbilisi = isTbilisiCity(city);
  const baseFee = tbilisi ? TBILISI_COURIER_FEE : REGION_COURIER_FEE;
  const threshold = tbilisi ? TBILISI_FREE_THRESHOLD : REGION_FREE_THRESHOLD;
  const baseEta = tbilisi ? "1-3 სამუშაო დღე" : "2-4 სამუშაო დღე";
  const etaLabel = hasEngraving ? engravingCourierEta(baseEta) : baseEta;
  const waived = st >= threshold;
  return {
    isTbilisi: tbilisi,
    baseFee,
    freeThreshold: threshold,
    waived,
    fee: waived ? 0 : baseFee,
    discount: waived ? baseFee : 0,
    etaLabel,
  };
};

/** მინიმალური შეკვეთის წესი გრავირებიან კალათაზე არ მოქმედებს */
export const meetsMinOrder = (subtotal, hasEngraving = false) =>
  hasEngraving || (Number(subtotal) || 0) >= MIN_ORDER_SUBTOTAL;

/** 'დღესვე, 20:30 საათამდე' თუ ახლა 18:00-მდეა თბილისის დროით, თორემ 'მომდევნო სამუშაო დღეს' */
export const pickupReadyLabel = (now = new Date()) => {
  const tbilisiHour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tbilisi",
      hour: "2-digit",
      hour12: false,
    }).format(now)
  );
  return tbilisiHour < PICKUP_CUTOFF_HOUR
    ? "დღესვე, 20:30 საათამდე"
    : "მომდევნო სამუშაო დღეს";
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
  engraving_only: "პრომო კოდი გრავირებულ პროდუქტზე არ ვრცელდება",
  no_eligible_items:
    "პრომო კოდი არ ვრცელდება ფასდაკლებულ და გრავირებულ პროდუქტებზე — კალათაში მისთვის შესაბამისი პროდუქტი არ არის",
};
