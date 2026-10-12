import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import edge from "../netlify/edge-functions/meta.js";
import { canonicalUrl, canonicalHtml } from "../src/utils/canonical.js";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const canonical = (text) => Array.from(text.matchAll(/<link\b[^>]*rel="canonical"[^>]*>/g)).map(x => x[0].match(/href="([^"]+)"/)[1]);
const fixtureFetch = async (url) => {
  if (url.includes("/products/full/")) return Response.json({ product: { id: 101, name: "Focus 2", price: 41, quantity: 5, description: "Fixture" } });
  if (url.includes("/blogs/slug/")) return Response.json({ title: "Fixture blog", description: "Fixture", canonical_url: "https://artopia.ge/blogs/fixture" });
  if (url.includes("/google-reviews")) return Response.json({ rating: 5, total_reviews: 10 });
  throw new Error("Unexpected network request");
};

for (const path of ["/", "/products", "/products/fixture", "/products/category/აკვარელი", "/products?category=აკვარელი", "/blogs", "/blog/fixture", "/contacts", "/reviews", "/engraving", "/terms", "/privacy", "/returns"]) {
  test(`same initial canonical for normal and Googlebot: ${path}`, async () => {
    const old = globalThis.fetch; globalThis.fetch = fixtureFetch;
    try {
      const bodies = [];
      const requested = new URL(path, "https://artopia.ge");
      requested.searchParams.set("utm_source", "fixture");
      for (const agent of ["Mozilla/5.0", "Googlebot/2.1"]) {
        const response = await edge(new Request(requested, { headers: { "user-agent": agent } }), {
          next: async () => new Response(html, { headers: { "content-type": "text/html", "strict-transport-security": "max-age=31536000", "content-length": "123", etag: "fixture", "cache-control": "public, max-age=0" } }),
        });
        const body = await response.text(); bodies.push(body);
        assert.deepEqual(canonical(body), [canonicalUrl(path)]);
        assert.match(body, /data-rh="true"/);
        assert.equal(response.headers.get("strict-transport-security"), "max-age=31536000");
        assert.equal(response.headers.get("etag"), null);
        assert.equal(response.headers.get("content-length"), null);
      }
      assert.equal(bodies[0], bodies[1]);
    } finally { globalThis.fetch = old; }
  });
}

test("API failure still returns the correct canonical", async () => {
  const old = globalThis.fetch; globalThis.fetch = async () => { throw new Error("fixture API outage"); };
  try {
    const r = await edge(new Request("https://artopia.ge/products/fixture"), { next: async () => new Response(html, { headers: { "content-type": "text/html" } }) });
    assert.deepEqual(canonical(await r.text()), ["https://artopia.ge/products/fixture"]);
  } finally { globalThis.fetch = old; }
});

test("redirect and non-HTML responses are untouched", async () => {
  for (const source of [new Response(null, { status: 301, headers: { location: "https://artopia.ge/" } }), new Response("fixture", { headers: { "content-type": "application/xml" } })]) {
    assert.equal(await edge(new Request("https://artopia.ge/products"), { next: async () => source }), source);
  }
});

test("canonical normalization removes duplicate hosts, aliases, queries and fragments", () => {
  assert.equal(canonicalUrl("http://www.artopia.ge/contact/?utm_source=x#part"), "https://artopia.ge/contacts");
  assert.equal(canonicalUrl("https://artopia.ge/blogs/fixture"), "https://artopia.ge/blog/fixture");
  assert.equal(canonicalUrl("/products/category/აკვარელი"), "https://artopia.ge/products/category/%E1%83%90%E1%83%99%E1%83%95%E1%83%90%E1%83%A0%E1%83%94%E1%83%9A%E1%83%98");
  assert.equal(canonical(canonicalHtml('<head><link rel="canonical" href="x"><link rel="canonical" href="y"></head>', "/contacts")).length, 1);
});

test("legacy redirects precede SPA fallback, and robots preserves HTTPS sitemap", async () => {
  const rules = await readFile(new URL("../public/_redirects", import.meta.url), "utf8");
  assert.match(rules, /\/contact\s+\/contacts\s+301!/);
  assert.match(rules, /\/blogs\/:slug\s+\/blog\/:slug\s+301!/);
  assert.ok(rules.indexOf("/contact") < rules.indexOf("/*"));
  assert.match(await readFile(new URL("../public/robots.txt", import.meta.url), "utf8"), /Sitemap: https:\/\/artopia.ge\/sitemap.xml/);
});

/* ===================== HTTP status, pagination, structured data ===================== */
import { isKnownRoute } from "../netlify/edge-functions/meta.js";
import { catalogPath } from "../src/utils/canonical.js";

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
async function visit(path, api) {
  const old = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => { calls.push(String(url)); return api(String(url), init); };
  try {
    const response = await edge(new Request(new URL(path, "https://artopia.ge")), {
      next: async () => new Response(html, { headers: { "content-type": "text/html" } }),
    });
    return { response, status: response.status, body: response.status === 301 ? "" : await response.text(), calls };
  } finally { globalThis.fetch = old; }
}
const robots = (text) => text.match(/<meta\s+name="robots"[^>]*content="([^"]+)"/)?.[1];
const ld = (text) => Array.from(text.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)).map(m => JSON.parse(m[1]));
const nodes = (text, type) => ld(text).flatMap(x => x["@graph"] || [x]).filter(x => x["@type"] === type);
const product = (extra = {}) => ({ id: 7, slug: "tikha-deli", name: "თიხა ჰაერზე შრობადი 500გ DELI", price: 10, sale: 20, quantity: 3,
  category_name: "თიხები", image_url1: "https://res.cloudinary.com/x/1.png", description: "აღწერა", brand: "Deli", gtin: "4006381333931", ...extra });
const noNetwork = async (url) => { throw new Error(`Unexpected network request: ${url}`); };

test("unknown paths are real 404s with noindex and no canonical; every app route stays 200", async () => {
  for (const path of ["/some/random/page", "/produkty", "/products/a/b/c", "/blog/a/b", "/wp-login.php", "/foo.png"]) {
    const r = await visit(path, noNetwork);
    assert.equal(r.status, 404, path);
    assert.equal(robots(r.body), "noindex, follow");
    assert.deepEqual(canonical(r.body), []);
    assert.equal(r.response.headers.get("x-robots-tag"), "noindex");
    assert.match(r.body, /<div id="root"><\/div>/);          // the SPA still boots and shows its own message
  }
  // every <Route path> in App.jsx (and the admin sub-app) must be known to the edge function
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  const routes = Array.from(app.matchAll(/<Route\s+path="([^"]+)"/g)).map(m => m[1]).filter(p => p !== "*");
  assert.ok(routes.length > 20);
  for (const route of routes) {
    const sample = route.replace("/*", "/menu").replace(/:page/g, "2").replace(/:\w+/g, "fixture");
    assert.ok(isKnownRoute(sample), `App.jsx route ${route} is missing from the edge route table`);
  }
  for (const path of ["/admin", "/admin/login", "/admin/support-panel/products", "/checkout", "/payment/result", "/login"]) {
    assert.equal((await visit(path, noNetwork)).status, 200, path);
  }
});

test("a product is 404/410/301 only when the API says so; outages never remove a live page", async () => {
  const api = (answer) => async (url) => (url.includes("/products/full/") ? answer() : noNetwork(url));
  const missing = await visit("/products/never-existed", api(() => json({ message: "Not found" }, 404)));
  assert.equal(missing.status, 404); assert.equal(robots(missing.body), "noindex, follow");
  const gone = await visit("/products/removed", api(() => json({ message: "Gone", status: "gone" }, 410)));
  assert.equal(gone.status, 410); assert.equal(robots(gone.body), "noindex, follow"); assert.deepEqual(canonical(gone.body), []);
  const moved = await visit("/products/old-slug", api(() => json({ status: "moved", moved_to: "new-slug" }, 301)));
  assert.equal(moved.status, 301); assert.equal(moved.response.headers.get("location"), "https://artopia.ge/products/new-slug");
  // a redirect target that is not a plain slug is ignored (no open redirect)
  assert.equal((await visit("/products/old-slug", api(() => json({ moved_to: "//evil.example/x" }, 301)))).status, 200);

  const outages = {
    "5xx": () => json({ message: "boom" }, 500),
    "503 html": () => new Response("<h1>Application error</h1>", { status: 503, headers: { "content-type": "text/html" } }),
    "404 from a proxy, not from the API": () => new Response("<h1>Not Found</h1>", { status: 404, headers: { "content-type": "text/html" } }),
    "network error": () => { throw new TypeError("fetch failed"); },
    "timeout": () => { throw new DOMException("The operation timed out.", "TimeoutError"); },
    "invalid body": () => new Response("{", { headers: { "content-type": "application/json" } }),
  };
  for (const [label, answer] of Object.entries(outages)) {
    const r = await visit("/products/tikha-deli", api(answer));
    assert.equal(r.status, 200, label);
    assert.equal(robots(r.body), "index, follow", label);
    assert.deepEqual(canonical(r.body), ["https://artopia.ge/products/tikha-deli"], label);
  }
});

test("product structured data: one Product, real brand, valid GTIN, sale price, availability", async () => {
  const page = async (p) => (await visit("/products/tikha-deli", async (url) => (url.includes("/products/full/") ? json({ product: p, related: [] }) : noNetwork(url)))).body;
  let body = await page(product());
  let [schema] = nodes(body, "Product");
  assert.equal(nodes(body, "Product").length, 1);
  assert.equal(nodes(body, "BreadcrumbList").length, 1);
  assert.deepEqual(schema.brand, { "@type": "Brand", name: "Deli" });
  assert.equal(schema.gtin, "4006381333931");
  assert.equal(schema.offers.price, "8.00");                       // 10 − 20%
  assert.equal(schema.offers.priceCurrency, "GEL");
  assert.equal(schema.offers.availability, "https://schema.org/InStock");
  assert.equal(schema.offers.url, "https://artopia.ge/products/tikha-deli");
  assert.match(body, /data-ld-edge="\/products\/tikha-deli"/);

  // out of stock: the page still exists (200, indexable) and says OutOfStock
  const oos = await visit("/products/tikha-deli", async (url) => json({ product: product({ quantity: 0, sale: null, brand: null, gtin: null }), related: [] }));
  assert.equal(oos.status, 200); assert.equal(robots(oos.body), "index, follow");
  [schema] = nodes(oos.body, "Product");
  assert.equal(schema.offers.availability, "https://schema.org/OutOfStock");
  assert.equal(schema.offers.price, "10.00");
  assert.equal("brand" in schema, false);                          // never "Artopia" as a fallback brand
  assert.equal("gtin" in schema, false);
  assert.doesNotMatch(JSON.stringify(nodes(oos.body, "Product")), /"Brand","name":"Artopia"/);
});

test("catalog pagination: self canonical per page, prev/next, 404 past the end or for a missing category", async () => {
  const list = (items, extra = {}) => async (url) => (url.includes("/products/list?") ? json({ items, total: 45, category_exists: true, ...extra }) : noNetwork(url));
  const category = "თიხები";
  const base = `https://artopia.ge${catalogPath({ category })}`;

  const first = await visit(`/products/category/${encodeURIComponent(category)}`, list([product()]));
  assert.equal(first.status, 200);
  assert.deepEqual(canonical(first.body), [base]);
  assert.match(first.body, new RegExp(`<link rel="next" href="${base}/page/2" />`));
  assert.doesNotMatch(first.body, /rel="prev"/);

  const second = await visit(`/products/category/${encodeURIComponent(category)}/page/2`, list([product()]));
  assert.equal(second.status, 200);
  assert.deepEqual(canonical(second.body), [`${base}/page/2`]);        // its own page, not folded into page 1
  assert.match(second.body, /<title>თიხები — გვერდი 2 — Artopia/);
  assert.match(second.body, new RegExp(`<link rel="prev" href="${base}" />`));
  assert.match(second.body, new RegExp(`<link rel="next" href="${base}/page/3" />`));
  assert.ok(second.calls.some(url => url.includes("page=2") && url.includes("limit=20")));
  assert.equal(robots(second.body), "index, follow");

  const last = await visit(`/products/category/${encodeURIComponent(category)}/page/3`, list([product()]));
  assert.doesNotMatch(last.body, /rel="next"/);

  assert.equal((await visit("/products/page/2", list([product()]))).status, 200);
  assert.deepEqual(canonical((await visit("/products/page/1", noNetwork)).body), ["https://artopia.ge/products"]);
  assert.equal((await visit(`/products/category/${encodeURIComponent(category)}/page/9`, list([]))).status, 404);
  assert.equal((await visit("/products/category/nonexistent", list([], { category_exists: false, total: 0 }))).status, 404);
  for (const bad of ["/products/page/abc", "/products/page/0", "/products/page/-1", "/products/category/x/page/2.5"]) {
    assert.equal((await visit(bad, noNetwork)).status, 404, bad);
  }
  // an existing but currently empty category, an old backend without category_exists, an API outage → all stay 200
  assert.equal((await visit("/products/category/empty", list([], { total: 0 }))).status, 200);
  assert.equal((await visit("/products/category/x", async () => json({ items: [], total: 0 }))).status, 200);
  assert.equal((await visit("/products/category/x/page/2", async () => json({ message: "boom" }, 500))).status, 200);
  assert.equal((await visit("/products/category/x/page/2", async () => { throw new TypeError("fetch failed"); })).status, 200);

  // legacy query URLs point at the clean page; filters/search/tracking never become canonical pages
  assert.equal(canonicalUrl("/products?page=3"), "https://artopia.ge/products/page/3");
  assert.equal(canonicalUrl(`/products?category=${category}&page=2`), `${base}/page/2`);
  assert.equal(canonicalUrl("/products/page/2?search=x&sort=price&utm_source=y"), "https://artopia.ge/products/page/2");
  assert.equal(canonicalUrl("/products?search=x&sort=price"), "https://artopia.ge/products");
  const rules = await readFile(new URL("../public/robots.txt", import.meta.url), "utf8");
  assert.match(rules, /^Disallow: \/\*\?\*$/m);                     // query URLs stay blocked
  assert.doesNotMatch(rules, /Disallow: \/products/);               // path pagination is crawlable
});

test("a missing blog article is a real 404; a blog API outage is not", async () => {
  assert.equal((await visit("/blog/nope", async () => json({ message: "Not found" }, 404))).status, 404);
  assert.equal((await visit("/blog/fixture", async () => json({ message: "boom" }, 500))).status, 200);
});

test("no admin secret ships with the storefront and promo codes are only checked by the server", async () => {
  const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
  const sources = await Promise.all(["../src/admin/pages/logIn/LoginPage.jsx", "../src/admin/api.js",
    "../src/admin/pages/addProduct/AddProducts.jsx", "../src/admin/pages/home/AddHomeImg.jsx", "../.env"].map(read));
  for (const text of sources) {
    assert.doesNotMatch(text, /ADMIN_SECRET|VITE_ADMIN_TOKEN|^\s*ADMIN_TOKEN\s*=/m);
  }
  assert.doesNotMatch(sources[0], /X-Admin-Token/);                       // login = email + password only
  const checkout = await read("../src/components/Checkout/Checkout.jsx");
  assert.match(checkout, /\/promo-codes\/validate/);
  assert.doesNotMatch(checkout, /promo-codes\?|promo-codes`\s*\)/);      // the public code list is never fetched
});
