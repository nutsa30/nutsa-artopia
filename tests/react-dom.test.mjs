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

for (const price of [0.01, 1, 19.99]) {
  for (const deliveryOption of ["storePickup", "courierDelivery"]) {
    test(`checkout accepts ${price} GEL with ${deliveryOption}`, async () => {
      setupPayment("pending");
      localStorage.setItem("artopia.cart.v1", JSON.stringify([{ ...cart[0], price }]));
      const calls = [];
      window.gtag = (_op, _id, key, receive) => { if (receive) receive(key === "client_id" ? "123.456" : "123456"); };
      globalThis.fetch = async (url, init) => {
        if (url.includes("/payments/bog/create")) {
          calls.push(JSON.parse(init.body));
          return Response.json({ state: "fixture-state", order_id: "fixture-order", redirect_url: "https://bank.example.invalid/pay", purchase_source: "server" });
        }
        if (url.includes("/products/101")) return Response.json({ quantity: 100 });
        throw Error(`Unexpected fixture request: ${url}`);
      };
      const cleanup = await render(React.createElement(MemoryRouter, { initialEntries: ["/checkout"], future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(CartProvider, null, React.createElement(Checkout))));
      try {
        for (const [name, value] of Object.entries({ first_name: "Test", last_name: "Fixture", email: "fixture@example.invalid", phone: "000", deliveryOption })) {
          await React.act(async () => { Simulate.change(document.querySelector(`[name="${name}"]`), { target: { name, value } }); });
        }
        if (deliveryOption === "courierDelivery") {
          await React.act(async () => { Simulate.change(document.querySelector('input[placeholder="მისამართი (ქუჩა, ნომერი)"]'), { target: { value: "Fixture address" } }); });
        }
        assert.equal(document.querySelector('button[type="submit"]').disabled, false);
        await React.act(async () => { Simulate.submit(document.querySelector("form")); await new Promise(resolve => setTimeout(resolve, 20)); });
        assert.equal(calls.length, 1);
        assert.equal(calls[0].totals.subtotal, price);
        assert.equal(calls[0].totals.total, +(price + (deliveryOption === "courierDelivery" ? 5 : 0)).toFixed(2));
      } finally { await cleanup(); }
    });
  }
}

test("checkout still blocks an empty cart", async () => {
  setupPayment("pending"); localStorage.setItem("artopia.cart.v1", "[]");
  let bankCalls = 0;
  globalThis.fetch = async url => { if (url.includes("/payments/bog/create")) bankCalls++; throw Error(`Unexpected fixture request: ${url}`); };
  const cleanup = await render(React.createElement(MemoryRouter, { initialEntries: ["/checkout"], future: { v7_startTransition: true, v7_relativeSplatPath: true } }, React.createElement(CartProvider, null, React.createElement(Checkout))));
  try {
    assert.equal(document.querySelector('button[type="submit"]').disabled, true);
    await React.act(async () => { Simulate.submit(document.querySelector("form")); });
    assert.equal(bankCalls, 0);
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

/* ===================== crawlable links, pagination, product visibility ===================== */
const { default: SingleProductPage } = await server.ssrLoadModule("/src/pages/SingleProductPage.jsx");
window.matchMedia = window.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));   // jsdom has none
const settle = async (ms = 30) => { await React.act(async () => { await new Promise(resolve => setTimeout(resolve, ms)); }); };
const future = { v7_startTransition: true, v7_relativeSplatPath: true };
const fixtureProduct = (extra = {}) => ({ id: 101, slug: "focus-2", name: "Focus 2", price: 41, sale: 0, quantity: 10, category_name: "Fixture",
  image_url1: "https://res.cloudinary.com/x/image/upload/a.png", description: "Fixture description", brand: "Deli", gtin: "4006381333931", also_buy: [], ...extra });
const storefront = (entry) => React.createElement(HelmetProvider, null, React.createElement(MemoryRouter, { initialEntries: [entry], future },
  React.createElement(CartProvider, null, React.createElement(CartUiProvider, null, React.createElement(Routes, null,
    React.createElement(Route, { path: "/products", element: React.createElement(ProductsPage) }),
    React.createElement(Route, { path: "/products/page/:page", element: React.createElement(ProductsPage) }),
    React.createElement(Route, { path: "/products/category/:slug", element: React.createElement(ProductsPage) }),
    React.createElement(Route, { path: "/products/category/:slug/page/:page", element: React.createElement(ProductsPage) }),
    React.createElement(Route, { path: "/products/:slug", element: React.createElement(SingleProductPage) }))))));
const hrefs = () => Array.from(document.querySelectorAll("a[href]")).map(a => a.getAttribute("href"));
const robotsMeta = () => document.querySelector('meta[name="robots"]')?.content;
const canonicalHref = () => document.querySelector('link[rel="canonical"]')?.getAttribute("href");
const clickLink = async (href) => {
  const link = Array.from(document.querySelectorAll("a[href]")).find(a => a.getAttribute("href") === href);
  assert.ok(link, `link ${href} not found`);
  await React.act(async () => { Simulate.click(link, { button: 0 }); });
  await settle();
};
function catalogApi({ total = 45, exists = true, items } = {}) {
  const calls = [];
  globalThis.fetch = async url => {
    calls.push(decodeURIComponent(url));
    if (url.includes("/products/list?")) {
      const page = Number(new URL(url).searchParams.get("page"));
      const list = items ? items(page) : [fixtureProduct({ id: 100 + page, slug: `focus-p${page}`, name: `Focus page ${page}` })];
      return Response.json({ items: list, total, category_exists: exists });
    }
    if (url.includes("/products/categories")) return Response.json(["Fixture", "სხვა"]);
    if (/\/products\/\d+$/.test(url)) return Response.json(fixtureProduct());
    throw Error(`Unexpected fixture request: ${url}`);
  };
  return calls;
}

test("catalog: product, category and pagination are real <a href> links and pages are crawlable", async () => {
  document.head.innerHTML = ""; sessionStorage.clear(); localStorage.clear();
  const calls = catalogApi();
  const cleanup = await render(storefront("/products/category/Fixture"));
  try {
    const links = hrefs();
    assert.ok(links.includes("/products/focus-p1"), "product card title is a link");
    assert.ok(links.includes("/products/category/Fixture") && links.includes("/products/category/%E1%83%A1%E1%83%AE%E1%83%95%E1%83%90") && links.includes("/products"),
      "category links exist in the DOM without opening the menu");
    assert.ok(links.includes("/products/category/Fixture/page/2") && links.includes("/products/category/Fixture/page/3"), "pagination links");
    assert.equal(document.querySelector('a[rel="next"]').getAttribute("href"), "/products/category/Fixture/page/2");
    assert.equal(document.querySelectorAll("a a, a button, button a").length, 0, "no nested interactive elements");
    assert.equal(canonicalHref(), "https://artopia.ge/products/category/Fixture");
    assert.equal(robotsMeta(), "index,follow");

    await clickLink("/products/category/Fixture/page/2");
    assert.ok(calls.some(url => url.includes("page=2") && url.includes("category=Fixture")));
    assert.match(document.body.textContent, /Focus page 2/);                       // page 2 shows its own products
    assert.equal(canonicalHref(), "https://artopia.ge/products/category/Fixture/page/2");
    assert.match(document.querySelector("h1").textContent, /Fixture — გვერდი 2/);
    assert.match(document.title, /გვერდი 2/);
    assert.equal(document.querySelector('nav [aria-current="page"]').textContent, "2");
    assert.equal(document.querySelector('a[rel="prev"]').getAttribute("href"), "/products/category/Fixture");

    // search keeps working across pages and always restarts from page 1
    const search = document.querySelector('input[placeholder="საძიებო სიტყვა..."]');
    await React.act(async () => { Simulate.change(search, { target: { value: "Foc" } }); });
    await settle();
    assert.ok(calls.some(url => url.includes("search=Foc") && url.includes("page=1") && url.includes("category=Fixture")));
    await clickLink("/products/category/Fixture/page/3");
    assert.ok(calls.some(url => url.includes("search=Foc") && url.includes("page=3")), "search term survives pagination");

    // category filter still works by clicking a category
    await clickLink("/products");
    assert.equal(canonicalHref(), "https://artopia.ge/products");
  } finally { await cleanup(); }
});

test("catalog: old ?page / ?category links land on the clean page; bad pages and categories are not-found", async () => {
  document.head.innerHTML = "";
  let calls = catalogApi();
  let cleanup = await render(storefront("/products?category=Fixture&page=2"));
  try {
    assert.equal(canonicalHref(), "https://artopia.ge/products/category/Fixture/page/2");
    assert.ok(calls.some(url => url.includes("page=2") && url.includes("category=Fixture")));
  } finally { await cleanup(); }

  for (const [entry, api] of [["/products/category/Nope", { exists: false, total: 0, items: () => [] }],
                              ["/products/category/Fixture/page/9", { items: () => [] }],
                              ["/products/page/abc", {}]]) {
    document.head.innerHTML = canonicalHtml("<head></head>", entry).replace(/<\/?head>/g, "");
    catalogApi(api);
    cleanup = await render(storefront(entry));
    try {
      assert.ok(document.querySelector('[data-not-found="404"]'), entry);
      assert.equal(robotsMeta(), "noindex,nofollow", entry);
      assert.equal(document.querySelectorAll('link[rel="canonical"]').length, 0, entry);
    } finally { await cleanup(); }
  }

  // an API outage is not "not found": no noindex, the page stays indexable
  document.head.innerHTML = "";
  globalThis.fetch = async url => { if (url.includes("/products/categories")) return Response.json([]); throw new TypeError("fetch failed"); };
  cleanup = await render(storefront("/products/category/Fixture/page/2"));
  try {
    assert.equal(document.querySelector("[data-not-found]"), null);
    assert.equal(robotsMeta(), "index,follow");
  } finally { await cleanup(); }
});

test("product page: out of stock opens but cannot be bought; 404/410/outage are told apart; one Product schema", async () => {
  const productApi = (status, body) => { globalThis.fetch = async url => {
    if (url.includes("/products/full/")) return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    if (url.includes("/products/also-buy")) return Response.json([]);
    throw Error(`Unexpected fixture request: ${url}`);
  }; };
  const schemas = () => Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => JSON.parse(s.textContent))
    .flatMap(x => x["@graph"] || [x]).filter(x => x["@type"] === "Product");
  const buttons = () => Array.from(document.querySelectorAll("button")).map(b => b.textContent);

  // in stock, opened inside the SPA (no edge JSON-LD) → the page writes its own, single Product
  document.head.innerHTML = ""; localStorage.clear();
  productApi(200, { product: fixtureProduct({ sale: 10 }), related: [fixtureProduct({ id: 102, slug: "related-1", name: "Related one" })] });
  let cleanup = await render(storefront("/products/focus-2"));
  try {
    assert.ok(buttons().some(t => t.includes("კალათაში დამატება")));
    assert.ok(hrefs().includes("/products/related-1"), "related products are links");
    assert.ok(hrefs().includes("/products/category/Fixture"), "category link");
    assert.equal(document.querySelectorAll("a a, a button, button a").length, 0);
    const [schema] = schemas();
    assert.equal(schemas().length, 1);
    assert.deepEqual(schema.brand, { "@type": "Brand", name: "Deli" });
    assert.equal(schema.gtin, "4006381333931");
    assert.equal(schema.offers.price, "36.90");
    assert.equal(schema.offers.availability, "https://schema.org/InStock");
  } finally { await cleanup(); }

  // out of stock, first load (edge already wrote the schema) → no second copy, purchase disabled
  document.head.innerHTML = '<script type="application/ld+json" data-ld-edge="/products/focus-2">{"@type":"Product","name":"edge"}</script>';
  productApi(200, { product: fixtureProduct({ quantity: 0, brand: null, gtin: null }), related: [] });
  cleanup = await render(storefront("/products/focus-2"));
  try {
    assert.match(document.body.textContent, /არ არის მარაგში/);
    assert.equal(buttons().some(t => t.includes("კალათაში დამატება") || t.includes("ყიდვა")), false);
    assert.deepEqual(schemas().map(s => s.name), ["edge"]);
    assert.equal(robotsMeta(), "index,follow");
    assert.equal(canonicalHref(), "https://artopia.ge/products/focus-2");
    assert.equal(localStorage.getItem("artopia.cart.v1") || "[]", "[]");
  } finally { await cleanup(); }

  for (const [status, marker, noindex] of [[404, "404", true], [410, "410", true]]) {
    document.head.innerHTML = ""; productApi(status, { message: "x" });
    cleanup = await render(storefront("/products/focus-2"));
    try {
      assert.ok(document.querySelector(`[data-not-found="${marker}"]`), String(status));
      assert.equal(robotsMeta() === "noindex,nofollow", noindex);
    } finally { await cleanup(); }
  }
  document.head.innerHTML = ""; productApi(500, { message: "boom" });
  cleanup = await render(storefront("/products/focus-2"));
  try {
    assert.equal(document.querySelector("[data-not-found]"), null);
    assert.notEqual(robotsMeta(), "noindex,nofollow");            // an outage must not deindex a live product
    assert.match(document.body.textContent, /ჩატვირთვა ვერ მოხერხდა/);
  } finally { await cleanup(); }
});

/* ===================== loading priority, fewer requests, related links ===================== */
const { default: BlogsPage } = await server.ssrLoadModule("/src/pages/BlogsPage.jsx");

test("catalog cards: no request per card, first screen eager with srcset, the rest lazy", async () => {
  document.head.innerHTML = ""; sessionStorage.clear(); localStorage.clear();
  const photo = (i) => `https://res.cloudinary.com/x/image/upload/v1/p${i}.png`;
  const calls = catalogApi({ total: 8, items: () => Array.from({ length: 8 }, (_, i) =>
    fixtureProduct({ id: 200 + i, slug: `p-${i}`, name: `Product ${i}`, image_url1: photo(i), quantity: i === 7 ? 0 : 5 })) });
  const cleanup = await render(storefront("/products"));
  try {
    assert.equal(calls.filter(url => /\/products\/\d+$/.test(url)).length, 0, "cards must not fetch /products/<id>");
    assert.equal(calls.filter(url => url.includes("/products/list?")).length, 1);
    const imgs = Array.from(document.querySelectorAll(".product-card img"));
    assert.equal(imgs.length, 8);
    assert.deepEqual(imgs.map(i => i.getAttribute("loading")), ["eager", "eager", "eager", "eager", "lazy", "lazy", "lazy", "lazy"]);
    assert.deepEqual(imgs.map(i => i.getAttribute("fetchpriority")), ["high", null, null, null, null, null, null, null]);
    assert.ok(imgs.every(i => i.getAttribute("srcset").split(", ").length === 3 && i.getAttribute("sizes")));
    assert.ok(imgs.every(i => i.getAttribute("alt")));
    // stock comes from the list: the sold-out card cannot be bought
    const cards = Array.from(document.querySelectorAll(".product-card"));
    assert.match(cards[7].textContent, /არ არის მარაგში/);
    assert.equal(cards[7].querySelectorAll("button").length, 0);
    assert.equal(cards[0].querySelectorAll("button").length, 2);
  } finally { await cleanup(); }
});

test("product page: every related product is a link in the DOM; main photo is responsive and prioritised", async () => {
  document.head.innerHTML = ""; localStorage.clear();
  const related = Array.from({ length: 7 }, (_, i) => fixtureProduct({ id: 300 + i, slug: `rel-${i}`, name: `Related ${i}` }));
  globalThis.fetch = async url => {
    if (url.includes("/products/full/")) return Response.json({ product: fixtureProduct(), related });
    if (url.includes("/products/also-buy")) return Response.json([]);
    throw Error(`Unexpected fixture request: ${url}`);
  };
  const cleanup = await render(storefront("/products/focus-2"));
  try {
    const links = hrefs().filter(h => h.startsWith("/products/rel-"));
    assert.equal(links.length, 7);
    const shown = Array.from(document.querySelectorAll('a[href^="/products/rel-"]')).filter(a => a.style.display !== "none");
    assert.ok(shown.length >= 1 && shown.length < 7, "the carousel still shows only a window of them");
    const main = Array.from(document.querySelectorAll("img")).find(i => i.getAttribute("fetchpriority") === "high");
    assert.ok(main && main.getAttribute("loading") === "eager" && main.getAttribute("srcset").includes("1200w"));
    assert.equal(document.querySelectorAll("a a, a button, button a").length, 0);
  } finally { await cleanup(); }
});

test("one robots meta after React takes over; blog index keeps the server title", async () => {
  document.head.innerHTML = '<meta name="robots" content="index,follow" data-rh="true">';
  globalThis.fetch = async () => Response.json([]);
  const cleanup = await render(React.createElement(HelmetProvider, null, React.createElement(MemoryRouter, { initialEntries: ["/blogs"], future },
    React.createElement(BlogsPage))));
  try {
    assert.equal(document.querySelectorAll('meta[name="robots"]').length, 1);
    assert.match(document.title, /^არტ ბლოგი — Artopia/);
  } finally { await cleanup(); }
});
