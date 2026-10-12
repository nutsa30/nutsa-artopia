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
  return item;
};

// Safe low-level dispatch — no-op if gtag is not on the page yet.
const gaEvent = (name, params) => {
  if (typeof window !== "undefined" && typeof window.gtag === "function") {
    window.gtag("event", name, params);
  }
};

// view_item — product page opened
export function trackViewItem(product) {
  if (!product) return;
  const item = ga4Item({ ...product, quantity: 1 });
  gaEvent("view_item", {
    currency: CURRENCY,
    value: item.price,
    items: [item],
  });
}

// add_to_cart — product added to cart (qty = cart quantity, not stock)
export function trackAddToCart(product, qty = 1) {
  if (!product) return;
  const item = ga4Item({ ...product, quantity: qty });
  gaEvent("add_to_cart", {
    currency: CURRENCY,
    value: +(item.price * item.quantity).toFixed(2),
    items: [item],
  });
}

// begin_checkout — checkout page opened
export function trackBeginCheckout(cartItems, value) {
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
