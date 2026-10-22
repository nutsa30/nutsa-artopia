import test, { beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "vite";

// pricing.js uses extensionless imports, so load through Vite like the other tests do.
const server = await createServer({ configFile: false, server: { middlewareMode: true, hmr: false }, appType: "custom", logLevel: "silent" });
const {
  trackViewItem, trackAddToCart, trackRemoveFromCart, trackBeginCheckout,
  trackAddShippingInfo, trackAddPaymentInfo, resetCheckoutSteps, trackSearch, normalizeSearchTerm,
  trackViewItemList, trackSelectItem, trackEvent,
} = await server.ssrLoadModule("/src/utils/analytics.js");
after(() => server.close());

let sent;
beforeEach(() => {
  sent = [];
  globalThis.window = { gtag: (_k, name, params) => sent.push({ name, params }) };
  resetCheckoutSteps();
});

const brush = { id: 7, name: "ფუნჯი", price: 10, sale: 0, quantity: 2, category_name: "ფუნჯები", main_category_name: "სამხატვრო" };
const plain = { id: 8, name: "ბლოკნოტი", price: 5, sale: 0, quantity: 1 };

test("items carry item_category (sub) and item_category2 (main) on every product event", () => {
  trackViewItem(brush);
  trackAddToCart(brush, 2);
  trackRemoveFromCart(brush);
  trackBeginCheckout([brush], 20);
  trackAddShippingInfo([brush], 20, "courierDelivery");
  trackAddPaymentInfo([brush], 20, "card");
  assert.deepEqual(sent.map((e) => e.name),
    ["view_item", "add_to_cart", "remove_from_cart", "begin_checkout", "add_shipping_info", "add_payment_info"]);
  for (const e of sent) {
    assert.equal(e.params.items[0].item_category, "ფუნჯები");
    assert.equal(e.params.items[0].item_category2, "სამხატვრო");
    assert.equal(e.params.currency, "GEL");
  }
});

test("missing or blank category sends no category field at all", () => {
  trackViewItem(plain);
  trackViewItem({ ...plain, category_name: "  ", main_category_name: null });
  for (const e of sent) {
    assert.ok(!("item_category" in e.params.items[0]));
    assert.ok(!("item_category2" in e.params.items[0]));
  }
});

test("existing events keep their names and shape", () => {
  trackAddToCart(brush, 2);
  const { params } = sent[0];
  assert.equal(params.value, 20);
  assert.deepEqual(Object.keys(params.items[0]).sort(),
    ["item_category", "item_category2", "item_id", "item_name", "price", "quantity"]);
});

test("shipping and payment steps carry tier/type, value, and fire once", () => {
  assert.equal(trackAddShippingInfo([brush], 20, "storePickup"), true);
  assert.equal(trackAddShippingInfo([brush], 20, "storePickup"), false);
  assert.equal(trackAddPaymentInfo([brush], 20, "on_site"), true);
  assert.equal(trackAddPaymentInfo([brush], 20, "on_site"), false);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].params.shipping_tier, "storePickup");
  assert.equal(sent[0].params.value, 20);
  assert.equal(sent[1].params.payment_type, "on_site");
  resetCheckoutSteps();
  assert.equal(trackAddShippingInfo([brush], 20, "storePickup"), true);
});

test("checkout steps with an empty cart or bad value send nothing and stay re-armable", () => {
  assert.equal(trackAddShippingInfo([], 0, "x"), false);
  assert.equal(trackAddPaymentInfo([brush], NaN, "card"), false);
  assert.equal(sent.length, 0);
  assert.equal(trackAddPaymentInfo([brush], 20, "card"), true);
});

test("no personal data can leak: only whitelisted params are sent", () => {
  trackAddPaymentInfo([{ ...brush, email: "a@b.ge", phone: "555", first_name: "ნ" }], 20, "card");
  assert.ok(!/@|555|ნ"/.test(JSON.stringify(sent)));
  assert.deepEqual(Object.keys(sent[0].params).sort(), ["currency", "items", "payment_type", "value"]);
});

test("search sends a normalised term once per distinct term", () => {
  assert.equal(normalizeSearchTerm("  Acrylic   PAINT "), "acrylic paint");
  assert.equal(normalizeSearchTerm("x".repeat(300)).length, 100);
  assert.equal(normalizeSearchTerm(undefined), "");
  assert.equal(trackSearch("  საღებავი  "), true);
  assert.equal(trackSearch("საღებავი"), false);
  assert.equal(trackSearch(""), false);
  assert.equal(trackSearch("   "), false);
  assert.equal(trackSearch("ფუნჯი"), true);
  assert.deepEqual(sent.map((e) => [e.name, e.params.search_term]), [["search", "საღებავი"], ["search", "ფუნჯი"]]);
});

test("analytics failures never throw into the shop", () => {
  globalThis.window = { gtag() { throw new Error("gtag blown up"); } };
  assert.doesNotThrow(() => {
    trackViewItem(brush); trackAddToCart(brush); trackRemoveFromCart(brush); trackBeginCheckout([brush], 1);
    trackAddShippingInfo([brush], 1, "x"); trackAddPaymentInfo([brush], 1, "card"); trackSearch("boom");
  });
  delete globalThis.window;
  assert.doesNotThrow(() => { trackViewItem(brush); trackSearch("another"); });
  globalThis.window = { gtag: () => sent.push(1) };
  assert.doesNotThrow(() => { trackAddToCart(null); trackRemoveFromCart(undefined); trackViewItem({ price: {} }); });
});

test("list views and selections carry the list and each item's position", () => {
  trackViewItemList([brush, plain], "color_lab", "ფერების ლაბორატორია");
  trackSelectItem(plain, "color_lab", "ფერების ლაბორატორია", 1);
  assert.deepEqual(sent.map((e) => e.name), ["view_item_list", "select_item"]);
  assert.equal(sent[0].params.item_list_id, "color_lab");
  assert.deepEqual(sent[0].params.items.map((i) => [i.item_id, i.index]), [["7", 0], ["8", 1]]);
  assert.equal(sent[1].params.items[0].index, 1);
  trackViewItemList([], "x", "y");
  assert.equal(sent.length, 2, "an empty list sends nothing");
});

test("custom events drop empty values and cut text to 100 characters", () => {
  trackEvent("color_lab_mix", { colors: 2, color_names: "x".repeat(150), search_term: "", hex: null });
  assert.deepEqual(Object.keys(sent[0].params), ["colors", "color_names"]);
  assert.equal(sent[0].params.color_names.length, 100);
  globalThis.window = {};
  assert.doesNotThrow(() => trackEvent("color_lab_mix", {}), "no gtag on the page is fine");
});
