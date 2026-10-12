import test, { after } from "node:test";
import assert from "node:assert/strict";
import { JSDOM, VirtualConsole } from "jsdom";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { canonicalHtml } from "../src/utils/canonical.js";

const virtualConsole = new VirtualConsole();
virtualConsole.on("jsdomError", error => { if (!error.message.includes("navigation")) throw error; });
const dom = new JSDOM('<!doctype html><html><head></head><body><div id="root"></div></body></html>', { url: "https://artopia.ge/contacts", pretendToBeVisual: true, virtualConsole });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.localStorage = dom.window.localStorage;
globalThis.sessionStorage = dom.window.sessionStorage;
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
window.scrollTo = () => {};
dom.window.HTMLElement.prototype.animate = () => ({ finished: Promise.resolve() });
dom.window.HTMLElement.prototype.scrollTo = () => {};
globalThis.Audio = class { play() { return Promise.resolve(); } };
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.fetch = async () => { throw Error("Unmocked network is forbidden"); };
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { Simulate } = await import("react-dom/test-utils");
const { MemoryRouter, Routes, Route } = await import("react-router-dom");
const server = await createServer({ configFile: false, plugins: [react()], ssr: { noExternal: ["react-helmet-async"] }, server: { middlewareMode: true, hmr: false }, appType: "custom" });
const { HelmetProvider } = await server.ssrLoadModule("react-helmet-async");
const { default: SEO } = await server.ssrLoadModule("/src/components/SEO.jsx");
const { default: PaymentResult } = await server.ssrLoadModule("/src/components/Checkout/PaymentResult.jsx");
const { CartProvider } = await server.ssrLoadModule("/src/components/CartContext/CartContext.jsx");
const analytics = await server.ssrLoadModule("/src/utils/analytics.js");
const { default: ContactsPage } = await server.ssrLoadModule("/src/pages/ContactsPage.jsx");
const { default: BlogPage } = await server.ssrLoadModule("/src/pages/BlogsDetailPage.jsx");
const { default: Checkout } = await server.ssrLoadModule("/src/components/Checkout/Checkout.jsx");
const { default: ProductsPage } = await server.ssrLoadModule("/src/pages/ProductsPage.jsx");
const { CartUiProvider } = await server.ssrLoadModule("/src/components/Navbar/Navbar.jsx");
after(async () => { await server.close(); dom.window.close(); });

async function render(component) {
  const root = createRoot(document.getElementById("root"));
  await React.act(async () => { root.render(component); await new Promise(resolve => setTimeout(resolve, 15)); });
  await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 25)); });
  return async () => { await React.act(async () => root.unmount()); };
}

test("actual contact component preserves the /contacts canonical", async () => {
  document.head.innerHTML = canonicalHtml("<head></head>", "/contacts").replace(/<\/?head>/g, "");
  globalThis.fetch = async () => Response.json([{ phone: "000", email: "fixture@example.invalid", address: "Fixture" }]);
  const cleanup = await render(React.createElement(HelmetProvider, null, React.createElement(ContactsPage)));
  try {
    assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1);
    assert.equal(document.querySelector('link[rel="canonical"]').href, "https://artopia.ge/contacts");
  } finally { await cleanup(); }
});
test("actual blog component ignores an old incorrect database canonical", async () => {
  document.head.innerHTML = canonicalHtml("<head></head>", "/blog/fixture").replace(/<\/?head>/g, "");
  globalThis.fetch = async url => Response.json(url.includes("/similar/") ? [] : { title: "Fixture", slug: "fixture", description: "Fixture", canonical_url: "https://artopia.ge/blogs/fixture", sections: [] });
  const cleanup = await render(React.createElement(HelmetProvider, null, React.createElement(MemoryRouter, { initialEntries: ["/blog/fixture"], future: { v7_startTransition: true, v7_relativeSplatPath: true } },
    React.createElement(Routes, null, React.createElement(Route, { path: "/blog/:slug", element: React.createElement(BlogPage) })))));
  try {
    assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1);
    assert.equal(document.querySelector('link[rel="canonical"]').href, "https://artopia.ge/blog/fixture");
  } finally { await cleanup(); }
});

for (const path of ["/", "/products", "/products/fixture", "/products/category/აკვარელი", "/blog/fixture", "/contacts", "/engraving"]) {
  test(`React keeps exactly one initial canonical: ${path}`, async () => {
    document.head.innerHTML = canonicalHtml("<head><title>Fixture</title></head>", path).replace(/<\/?head>/g, "");
    const initial = document.querySelector('link[rel="canonical"]').href;
    const cleanup = await render(React.createElement(HelmetProvider, null, React.createElement(SEO, { title: "Fixture", description: "Fixture", url: initial })));
    try {
      assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 1);
      assert.equal(document.querySelector('link[rel="canonical"]').href, initial);
    } finally { await cleanup(); }
  });
}

const reference = { state: "fixture-state", order_id: "fixture-order" };
const cart = [{ id: 101, name: "Focus 2", price: 41, quantity: 1 }];
function setupPayment(status) {
  sessionStorage.clear(); localStorage.clear();
  sessionStorage.setItem("payment_reference", JSON.stringify(reference));
  localStorage.setItem("artopia.cart.v1", JSON.stringify(cart));
  const events = []; window.gtag = (...args) => events.push(args);
  globalThis.fetch = async () => Response.json({ ok: true, ...reference, status });
  return events;
}
const paymentTree = () => React.createElement(MemoryRouter, { initialEntries: ["/payment/result?status=success&state=fixture-state"], future: { v7_startTransition: true, v7_relativeSplatPath: true } },
  React.createElement(CartProvider, null, React.createElement(PaymentResult)));

test("fake success URL with a pending bank preserves cart and emits no purchase", async () => {
  const events = setupPayment("pending"); const cleanup = await render(paymentTree());
  try {
    assert.match(document.body.textContent, /გადახდა მოწმდება/);
    assert.deepEqual(JSON.parse(localStorage.getItem("artopia.cart.v1")), cart);
    assert.equal(events.filter(x => x[1] === "purchase").length, 0);
  } finally { await cleanup(); }
});
test("failed payment preserves cart and emits no purchase", async () => {
  const events = setupPayment("fail"); const cleanup = await render(paymentTree());
  try {
    assert.match(document.body.textContent, /გადახდა ვერ შესრულდა/);
    assert.deepEqual(JSON.parse(localStorage.getItem("artopia.cart.v1")), cart);
    assert.equal(events.length, 0);
  } finally { await cleanup(); }
});
test("confirmed payment clears cart once; refreshing an old result keeps a new cart", async () => {
  const events = setupPayment("success"); let cleanup = await render(paymentTree());
  assert.match(document.body.textContent, /გადახდა წარმატებულია/);
  assert.deepEqual(JSON.parse(localStorage.getItem("artopia.cart.v1")), []);
  await cleanup();
  localStorage.setItem("artopia.cart.v1", JSON.stringify(cart));
  cleanup = await render(paymentTree());
  try {
    assert.deepEqual(JSON.parse(localStorage.getItem("artopia.cart.v1")), cart);
    assert.equal(events.filter(x => x[1] === "purchase").length, 0);
  } finally { await cleanup(); }
});
test("existing ecommerce funnel still sends sale-adjusted amounts", () => {
  const events = []; window.gtag = (...args) => events.push(args);
  const item = { id: 101, name: "Fixture", price: 50, sale: 20, quantity: 2 };
  analytics.trackViewItem(item); analytics.trackAddToCart(item, 2); analytics.trackBeginCheckout([item]);
  assert.deepEqual(events.map(x => x[1]), ["view_item", "add_to_cart", "begin_checkout"]);
  assert.deepEqual(events.map(x => x[2].value), [40, 80, 80]);
  assert.ok(events.every(x => x[2].currency === "GEL"));
});
test("GA context preserves client and session with a bounded fallback", async () => {
  document.cookie = "_ga=GA1.1.123.456; path=/";
  window.gtag = (_op, _id, key, receive) => receive(key === "client_id" ? "789.123" : "123456");
  assert.deepEqual(await analytics.getGaContext(), { client_id: "789.123", session_id: "123456" });
  window.gtag = () => {};
  assert.deepEqual(await analytics.getGaContext(5), { client_id: "123.456", session_id: null });
});

test("checkout still starts one bank payment for two rapid submits", async () => {
  setupPayment("pending");
  const calls = [];
  window.gtag = (_op, _id, key, receive) => { if (receive) receive(key === "client_id" ? "123.456" : "123456"); };
  globalThis.fetch = async (url, init) => {
    if (url.includes("/payments/bog/create")) {
      calls.push(JSON.parse(init.body));
      return Response.json({ state: "fixture-state", order_id: "fixture-order", redirect_url: "https://bank.example.invalid/pay", purchase_source: "server" });
    }
    if (url.includes("/products/101")) return Response.json({ quantity: 10 });
    throw Error(`Unexpected fixture request: ${url}`);
  };
  const cleanup = await render(React.createElement(MemoryRouter, { initialEntries: ["/checkout"], future: { v7_startTransition: true, v7_relativeSplatPath: true } },
    React.createElement(CartProvider, null, React.createElement(Checkout))));
  try {
    for (const [name, value] of Object.entries({ first_name: "Test", last_name: "Fixture", email: "fixture@example.invalid", phone: "000", deliveryOption: "storePickup" })) {
      await React.act(async () => { Simulate.change(document.querySelector(`[name="${name}"]`), { target: { name, value } }); });
    }
    await React.act(async () => {
      Simulate.submit(document.querySelector("form"));
      Simulate.submit(document.querySelector("form"));
      await new Promise(resolve => setTimeout(resolve, 20));
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].ga4_mode, "server");
    assert.equal(calls[0].totals.total, 41);
    assert.equal(calls[0].ga_session_id, "123456");
    assert.equal(JSON.parse(sessionStorage.getItem("payment_reference")).state, "fixture-state");
  } finally { await cleanup(); }
});

test("catalog browsing, search and add-to-cart still work with fixture products", async () => {
  sessionStorage.clear(); localStorage.clear();
  const events = []; window.gtag = (...args) => events.push(args);
  const calls = [];
  const product = { id: 101, slug: "focus-2", name: "Focus 2", price: 41, sale: 0, quantity: 10, category_name: "Fixture", image_url1: "/noimage.jpeg" };
  globalThis.fetch = async url => {
    calls.push(url);
    if (url.includes("/products/list?")) return Response.json({ items: [product], total: 1 });
    if (url.includes("/products/categories")) return Response.json(["Fixture"]);
    if (url.includes("/products/101")) return Response.json(product);
    throw Error(`Unexpected fixture request: ${url}`);
  };
  const cleanup = await render(React.createElement(HelmetProvider, null, React.createElement(MemoryRouter, { initialEntries: ["/products"], future: { v7_startTransition: true, v7_relativeSplatPath: true } },
    React.createElement(CartProvider, null, React.createElement(CartUiProvider, null, React.createElement(ProductsPage))))));
  try {
    assert.match(document.body.textContent, /Focus 2/);
    const search = document.querySelector('input[placeholder="საძიებო სიტყვა..."]');
    await React.act(async () => { Simulate.change(search, { target: { value: "Focus" } }); });
    await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
    assert.ok(calls.some(url => url.includes("search=Focus")));
    const add = Array.from(document.querySelectorAll("button")).find(button => button.textContent.includes("კალათაში დამატება") || button.getAttribute("aria-label") === "კალათაში დამატება");
    assert.ok(add);
    await React.act(async () => { Simulate.click(add); });
    assert.equal(JSON.parse(localStorage.getItem("artopia.cart.v1"))[0].quantity, 1);
    assert.equal(events.filter(x => x[1] === "add_to_cart").length, 1);
  } finally { await cleanup(); }
});
