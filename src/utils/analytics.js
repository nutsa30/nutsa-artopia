// GA4 ecommerce tracking helpers (gtag.js)
// Base tag (G-PRBF4MJ1LT) is loaded in index.html.
// These helpers fire the GA4 recommended ecommerce events used for Google Ads.

import { unitPrice } from "./pricing.js";

export const CURRENCY = "GEL";

// Actual price the customer pays for one unit (applies sale discount, like the rest of the app).

// Map an app product / cart item to a GA4 `items` entry.
const ga4Item = (it, index) => {
  const item = {
    item_id: String(it?.id ?? ""),
    item_name: String(it?.name ?? ""),
    price: unitPrice(it),
    quantity: Number(it?.quantity || 1),
  };
  if (index != null) item.index = index;
  // კატეგორია: ქვეკატეგორია → item_category, მთავარი → item_category2. ცარიელი ველი არ იგზავნება.
  const sub = categoryName(it?.category_name);
  const main = categoryName(it?.main_category_name);
  if (sub) item.item_category = sub;
  if (main) item.item_category2 = main;
  return item;
};

const categoryName = (v) => (typeof v === "string" ? v.trim().slice(0, 100) : "");

// Safe low-level dispatch — no-op if gtag is not on the page yet.
// Analytics never breaks the page: any failure here is swallowed.
const gaEvent = (name, params) => {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", name, params);
    }
  } catch {
    /* analytics must never affect the shop */
  }
};

// view_item — product page opened
export function trackViewItem(product) {
  try {
  if (!product) return;
  const item = ga4Item({ ...product, quantity: 1 });
  gaEvent("view_item", {
    currency: CURRENCY,
    value: item.price,
    items: [item],
  });
  } catch { /* analytics only */ }
}

// add_to_cart — product added to cart (qty = cart quantity, not stock)
export function trackAddToCart(product, qty = 1) {
  try {
  if (!product) return;
  const item = ga4Item({ ...product, quantity: qty });
  gaEvent("add_to_cart", {
    currency: CURRENCY,
    value: +(item.price * item.quantity).toFixed(2),
    items: [item],
  });
  } catch { /* analytics only */ }
}

// remove_from_cart — line removed from the cart
export function trackRemoveFromCart(line) {
  try {
    if (!line) return;
    const item = ga4Item(line);
    gaEvent("remove_from_cart", {
      currency: CURRENCY,
      value: +(item.price * item.quantity).toFixed(2),
      items: [item],
    });
  } catch { /* analytics only */ }
}

// begin_checkout — checkout page opened
export function trackBeginCheckout(cartItems, value) {
  try {
  if (!Array.isArray(cartItems) || cartItems.length === 0) return;
  const items = cartItems.map((it, i) => ga4Item(it, i));
  const total =
    value != null
      ? Number(value)
      : items.reduce((s, it) => s + it.price * it.quantity, 0);
  gaEvent("begin_checkout", {
    currency: CURRENCY,
    value: +total.toFixed(2),
    items,
  });
  } catch { /* analytics only */ }
}

// Each checkout step is sent once per checkout page visit (re-renders, SPA navigation
// back and forth and failed submit retries must not repeat it).
const firedSteps = new Set();
export const resetCheckoutSteps = () => firedSteps.clear();

const checkoutStep = (event, extra, cartItems, value) => {
  try {
    if (firedSteps.has(event)) return false;
    if (!Array.isArray(cartItems) || cartItems.length === 0) return false;
    const items = cartItems.map((it, i) => ga4Item(it, i));
    const total = value != null ? Number(value) : items.reduce((s, it) => s + it.price * it.quantity, 0);
    if (!Number.isFinite(total)) return false;
    firedSteps.add(event);
    gaEvent(event, { currency: CURRENCY, value: +total.toFixed(2), ...extra, items });
    return true;
  } catch {
    return false;
  }
};

// add_shipping_info — delivery step completed. tier: "storePickup" | "courierDelivery"
export function trackAddShippingInfo(cartItems, value, shippingTier) {
  return checkoutStep("add_shipping_info", { shipping_tier: String(shippingTier || "").slice(0, 100) }, cartItems, value);
}

// add_payment_info — payment method confirmed at submit. type: "card" | "on_site"
export function trackAddPaymentInfo(cartItems, value, paymentType) {
  return checkoutStep("add_payment_info", { payment_type: String(paymentType || "").slice(0, 100) }, cartItems, value);
}

// view_item_list — a list of products shown (e.g. the colour lab's matching paints).
export function trackViewItemList(products, listId, listName) {
  try {
    if (!Array.isArray(products) || products.length === 0) return;
    gaEvent("view_item_list", {
      item_list_id: String(listId || "").slice(0, 100),
      item_list_name: String(listName || "").slice(0, 100),
      items: products.slice(0, 200).map((p, i) => ga4Item({ ...p, quantity: 1 }, i)),
    });
  } catch { /* analytics only */ }
}

// select_item — a product opened from such a list.
export function trackSelectItem(product, listId, listName, index) {
  try {
    if (!product) return;
    gaEvent("select_item", {
      item_list_id: String(listId || "").slice(0, 100),
      item_list_name: String(listName || "").slice(0, 100),
      items: [ga4Item({ ...product, quantity: 1 }, index)],
    });
  } catch { /* analytics only */ }
}

// Any other (custom) event. Text values are cut to GA4's 100 characters.
export function trackEvent(name, params = {}) {
  try {
    const clean = {};
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === "") continue;
      clean[key] = typeof value === "string" ? value.slice(0, 100) : value;
    }
    gaEvent(name, clean);
  } catch { /* analytics only */ }
}

// Internal catalogue search: normalised term, max 100 chars.
export const normalizeSearchTerm = (term) =>
  typeof term === "string" ? term.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 100) : "";

let lastSearchTerm = "";
// search — fired for an executed search (not every keystroke); same term twice in a row is ignored.
export function trackSearch(term) {
  try {
    const search_term = normalizeSearchTerm(term);
    if (!search_term || search_term === lastSearchTerm) return false;
    lastSearchTerm = search_term;
    gaEvent("search", { search_term });
    return true;
  } catch {
    return false;
  }
}

// Read the GA4 client_id from the `_ga` cookie (format: GA1.1.<id1>.<id2>).
// Used to tie the backend Measurement Protocol purchase to the same user/session.
export function getGaClientId() {
  if (typeof document === "undefined") return "";
  try {
    const m = document.cookie.match(/(?:^|;\s*)_ga=GA\d+\.\d+\.(\d+\.\d+)/);
    return m ? m[1] : "";
  } catch {
    return "";
  }
}

// Purchase belongs to the backend outbox. Browser storage never supplies its amount.
export async function getGaContext(timeoutMs = 500) {
  const fallback = { client_id: getGaClientId(), session_id: null };
  if (typeof window === "undefined" || typeof window.gtag !== "function") return fallback;
  return new Promise((resolve) => {
    const result = { ...fallback };
    let completed = 0;
    const timer = setTimeout(() => resolve(result), timeoutMs);
    const receive = (key) => (value) => {
      if (key === "client_id" && /^\d+\.\d+$/.test(String(value))) result.client_id = String(value);
      if (key === "session_id" && /^[1-9]\d*$/.test(String(value))) result.session_id = String(value);
      if (++completed === 2) { clearTimeout(timer); resolve(result); }
    };
    try {
      window.gtag("get", "G-PRBF4MJ1LT", "client_id", receive("client_id"));
      window.gtag("get", "G-PRBF4MJ1LT", "session_id", receive("session_id"));
    } catch { clearTimeout(timer); resolve(fallback); }
  });
}
