import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import edge from "../netlify/edge-functions/meta.js";
import { canonicalUrl, canonicalHtml } from "../src/utils/canonical.js";
import { productJsonLd, productPageMeta } from "../src/utils/catalogMeta.js";

test("shipping structured data never promises nationwide free delivery below 70 GEL", () => {
  for (const price of [1, 49.99, 50, 69.99]) {
    assert.equal(productJsonLd({ id: 1, price }).offers.shippingDetails, undefined);
  }
  assert.equal(productJsonLd({ id: 1, price: 70 }).offers.shippingDetails.shippingRate.value, 0);
  assert.equal(productJsonLd({ id: 1, price: 100, sale: 40 }).offers.shippingDetails, undefined);
  assert.equal(productJsonLd({ id: 1, price: 100 }).offers.hasMerchantReturnPolicy.merchantReturnDays, 2);
});

test("derived duplicate-product metadata preserves the source name and unique code", () => {
  const p = { id: 123, name: "კალამი", seo_title: "კალამი — კოდი 123 | Artopia", seo_description: "კალამი · კოდი 123." };
  const meta = productPageMeta(p);
  assert.match(meta.title, /კოდი 123/);
  assert.match(meta.description, /კოდი 123/);
  assert.equal(p.name, "კალამი");
});

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
        assert.deepEqual(canonical(body), path === "/reviews" ? [] : [canonicalUrl(path)]);
        if (path === "/reviews") assert.equal(response.status, 410);
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
  assert.match(rules, /\/merchant-feed\.xml\s+\/\.netlify\/functions\/merchant-feed\s+200/);
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
    assert.equal(robots(r.body), "noindex,nofollow");
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
  assert.equal(missing.status, 404); assert.equal(robots(missing.body), "noindex,nofollow");
  const gone = await visit("/products/removed", api(() => json({ message: "Gone", status: "gone" }, 410)));
  assert.equal(gone.status, 410); assert.equal(robots(gone.body), "noindex,nofollow"); assert.deepEqual(canonical(gone.body), []);
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
    assert.equal(robots(r.body), "index,follow", label);
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
  assert.equal(oos.status, 200); assert.equal(robots(oos.body), "index,follow");
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
  assert.equal(robots(second.body), "index,follow");

  const last = await visit(`/products/category/${encodeURIComponent(category)}/page/3`, list([product()]));
  assert.doesNotMatch(last.body, /rel="next"/);

  assert.equal((await visit("/products/page/2", list([product()]))).status, 200);
  assert.equal((await visit("/products/page/1", noNetwork)).status, 301);
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
  assert.doesNotMatch(rules, /^Disallow: \/\*\?\*$/m);              // query noindex must be crawlable
  assert.doesNotMatch(rules, /Disallow: \/products/);               // path pagination is crawlable
});

test("a missing blog article is a real 404; a blog API outage is not", async () => {
  assert.equal((await visit("/blog/nope", async () => json({ message: "Not found" }, 404))).status, 404);
  assert.equal((await visit("/blog/fixture", async () => json({ message: "boom" }, 500))).status, 200);
  assert.equal((await visit("/blog/fixture", async () => { throw new DOMException("timeout", "TimeoutError"); })).status, 200);
  // გამოუქვეყნებელი სტატია (ძველი API პასუხი) არასდროს ინდექსდება
  assert.equal((await visit("/blog/draft", async () => json({ title: "Draft", is_active: false, sections: [] }))).status, 404);
});

test("a renamed blog article's old URL is a permanent redirect to the new one", async () => {
  const moved = await visit("/blog/old-title", async (url, init) => {
    assert.equal(init?.redirect, "manual");
    return json({ message: "Moved", status: "moved", moved_to: "new-title" }, 301);
  });
  assert.equal(moved.status, 301);
  assert.equal(moved.response.headers.get("location"), "https://artopia.ge/blog/new-title");
  // მხოლოდ ცალსახა, სწორი slug — სხვა ყველაფერი ჩვეულებრივი გვერდია
  for (const target of ["https://evil.example", "../x", "old-title", ""]) {
    assert.equal((await visit("/blog/old-title", async () => json({ moved_to: target }, 301))).status, 200, target);
  }
});

const article = {
  title: "HB, 2B, 6B — რას ნიშნავს ფანქრების ნომრები?", description: "ფანქრის სიმაგრე", slug: "fixture",
  created_at: "2026-03-28T10:00:00+04:00", cover_image: "https://res.cloudinary.com/x/image/upload/v1/cover.jpg",
  sections: [
    { position: 1, text: "<h2>რა არის HB</h2><p>H ნიშნავს <strong>სიმაგრეს</strong>.</p>", image_url: "https://res.cloudinary.com/x/image/upload/v1/s1.jpg" },
    { position: 2, text: "<ul><li>2B — რბილი</li></ul><p><a href=\"/products\">პროდუქტები</a></p>", image_url: null },
  ],
};

test("the article text is in the initial HTML for crawlers that do not run JavaScript", async () => {
  const page = await visit("/blog/fixture", async () => json(article));
  assert.equal(page.status, 200);
  const root = page.body.match(/<div id="root">([\s\S]*?)<\/div>\s*<script/)?.[1] || page.body.split('<div id="root">')[1];
  assert.match(root, /<main data-edge-article=""/);
  assert.match(root, /<h1[^>]*>HB, 2B, 6B — რას ნიშნავს ფანქრების ნომრები\?<\/h1>/);
  assert.ok(root.includes("<h2>რა არის HB</h2>") && root.includes("<li>2B — რბილი</li>"));
  assert.ok(root.includes('<a href="/blogs">') && root.includes('<a href="/products">პროდუქტები</a>'));
  assert.ok(root.includes('<time datetime="2026-03-28">28.03.2026</time>'));
  assert.equal((page.body.match(/<h1\b/g) || []).length, 1);
  assert.equal((root.match(/fetchpriority="high"/g) || []).length, 1);        // მხოლოდ ყდა
  assert.ok(root.includes("cover.jpg") && !root.includes("s1.jpg"));          // სექციის ფოტოებს React-ის გვერდი ტვირთავს (lazy)
  assert.match(root, /<style>\[data-edge-article\] \*\{max-width:100%/);   // გრძელი სიტყვა/ცხრილი გვერდს არ აფართოებს (CLS)
  assert.equal(nodes(page.body, "BlogPosting").length, 1);
  assert.equal(nodes(page.body, "BreadcrumbList").length, 1);
  assert.equal(canonical(page.body)[0], "https://artopia.ge/blog/fixture");
  // სათაური და აღწერა escape-დება
  const tricky = await visit("/blog/fixture", async () => json({ ...article, title: "<b>x</b> & \"y\"" }));
  assert.ok(tricky.body.includes("&lt;b&gt;x&lt;/b&gt; &amp; &quot;y&quot;"));
});

test("unsafe section HTML is never injected; the page stays a normal 200", async () => {
  for (const text of ["<p>a</p><script>steal()</script>", '<img src=x onerror="steal()">', '<a href="javascript:steal()">x</a>', '<p onclick="x()">c</p>', "<svg onload=x>"]) {
    const page = await visit("/blog/fixture", async () => json({ ...article, sections: [{ position: 1, text }] }));
    assert.equal(page.status, 200, text);
    assert.ok(page.body.includes('<div id="root"></div>'), text);
    assert.ok(!page.body.split("</head>")[1].includes("steal()"), text);
  }
  // ტექსტის გარეშე სტატია → ჩვეულებრივი ცარიელი #root
  const empty = await visit("/blog/fixture", async () => json({ ...article, sections: [] }));
  assert.ok(empty.body.includes('<div id="root"></div>'));
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

/* ===================== performance hints, renamed categories, alias hosts ===================== */
import { responsiveImage } from "../src/utils/cloudinary.js";
import { BLOG_INDEX_META, blogArticleMeta, clipAtBoundary } from "../src/utils/catalogMeta.js";

test("LCP image preload matches the real <img> exactly and exists only for a real photo", async () => {
  const photo = "https://res.cloudinary.com/x/image/upload/v1/photo.png";
  const page = async (p) => (await visit("/products/tikha-deli", async (url) => (url.includes("/products/full/") ? json({ product: p, related: [] }) : noNetwork(url)))).body;
  const withPhoto = await page(product({ image_url1: photo }));
  const expected = responsiveImage(photo, "detail");
  const link = withPhoto.match(/<link rel="preload" as="image"[^>]*>/)[0];
  assert.ok(link.includes(`href="${expected.src}"`));
  assert.ok(link.includes(`imagesrcset="${expected.srcSet}"`));
  assert.ok(link.includes(`imagesizes="${expected.sizes}"`));
  assert.equal(withPhoto.match(/rel="preload" as="image"/g).length, 1);
  assert.equal(expected.srcSet.split(", ").length, 5);
  assert.equal(expected.sizes, "(max-width: 628px) calc(100vw - 68px), 560px");   // measured layout width
  for (const p of [product({ image_url1: null }), product({ image_url1: "" }), product({ image_url1: "/noimage.jpeg" })]) {
    assert.doesNotMatch(await page(p), /rel="preload" as="image"/);          // no photo → no preload
  }
  // category page: the first card of the list the API returned
  const list = await visit("/products/category/x", async (url) => json({ items: [product({ image_url1: photo })], total: 1, category_exists: true }));
  assert.ok(list.body.includes(`imagesrcset="${responsiveImage(photo, "card").srcSet}"`));
  // /products page 1 makes no API call, so nothing is guessed
  assert.doesNotMatch((await visit("/products", noNetwork)).body, /rel="preload" as="image"/);
});

test("a renamed category redirects permanently; alias hostnames are never indexable", async () => {
  const moved = await visit("/products/category/old-name", async () => json({ items: [], total: 0, category_exists: false, category_moved_to: "ახალი სახელი" }));
  assert.equal(moved.status, 301);
  assert.equal(moved.response.headers.get("location"), "https://artopia.ge/products/category/%E1%83%90%E1%83%AE%E1%83%90%E1%83%9A%E1%83%98%20%E1%83%A1%E1%83%90%E1%83%AE%E1%83%94%E1%83%9A%E1%83%98");
  assert.equal((await visit("/products/category/gone", async () => json({ items: [], total: 0, category_exists: false, category_moved_to: null }))).status, 404);

  const next = async () => new Response(html, { headers: { "content-type": "text/html" } });
  const old = globalThis.fetch; globalThis.fetch = noNetwork;
  try {
    for (const host of ["calm-tanuki-5f5e83.netlify.app", "main--calm-tanuki-5f5e83.netlify.app", "deploy-preview-2--calm-tanuki-5f5e83.netlify.app"]) {
      const r = await edge(new Request(`https://${host}/`), { next });
      assert.equal(r.headers.get("x-robots-tag"), "noindex", host);
      assert.deepEqual(canonical(await r.text()), ["https://artopia.ge/"]);
    }
    const live = await edge(new Request("https://artopia.ge/"), { next });
    assert.equal(live.headers.get("x-robots-tag"), null);
  } finally { globalThis.fetch = old; }
});

test("static shell: one robots tag, no render-blocking translate script, valid schema, long-lived hashed assets", async () => {
  assert.equal(html.match(/<meta\s+name="robots"/g).length, 1);
  assert.match(html, /<meta name="robots" content="index,follow" data-rh="true" \/>/);
  assert.doesNotMatch(html, /translate_a\/element\.js|googleTranslateElementInit/);
  assert.match(html, /id="google_translate_element"/);                      // the mount point stays for on-demand loading
  assert.doesNotMatch(html, /SearchAction|potentialAction/);
  const graph = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])["@graph"];
  assert.deepEqual(graph.map(n => n["@type"]), ["Organization", "WebSite", "Store"]);
  assert.equal(canonicalUrl("/index.html"), "https://artopia.ge/");
  const headers = await readFile(new URL("../public/_headers", import.meta.url), "utf8");
  assert.match(headers, /\/assets\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
  const globalHeaders=headers.split(/^\/\*\s*$/m)[1]?.split(/^\//m)[0] || "";
  assert.doesNotMatch(globalHeaders, /Cache-Control/i);                       // Security headers must not cache HTML long-term.
  const notFound = await visit("/nope/nope", noNetwork);
  assert.equal(notFound.body.match(/<meta\s+name="robots"/g).length, 1);
});

test("blog metadata is identical before and after JavaScript", async () => {
  const post = { title: "საღებავების არჩევა დამწყებთათვის: ზეთი, აკრილი, აკვარელი თუ გუაში?", description: "აღწერა", created_at: "2026-01-01" };
  const article = await visit("/blog/fixture", async () => json(post));
  assert.ok(article.body.includes(`<title>${blogArticleMeta(post, "fixture").title}</title>`));
  assert.doesNotMatch(article.body.match(/<title>[^<]*<\/title>/)[0], /…/);           // the title is no longer cut
  assert.equal(nodes(article.body, "BlogPosting").length, 1);
  assert.equal(nodes(article.body, "BreadcrumbList").length, 1);
  const index = await visit("/blogs", noNetwork);
  assert.ok(index.body.includes(`<title>${BLOG_INDEX_META.title}</title>`));
  const page = await readFile(new URL("../src/pages/BlogsPage.jsx", import.meta.url), "utf8");
  assert.match(page, /BLOG_INDEX_META\.title/);
});


test("blog SEO title and description are separate; fallback is cut at a sentence or word, never mid-word", async () => {
  const intro = "ეს არის სტატიის გრძელი შესავალი აბზაცი, რომელიც ხილულია გვერდზე. მეორე წინადადება უკვე გაცილებით გრძელია და ვერ ეტევა ერთ სნიპეტში, ამიტომ ის უნდა მოიჭრას სიტყვის საზღვარზე.";
  const post = { title: "ნამდვილი სათაური", description: intro, meta_title: "SEO სათაური", meta_description: "SEO აღწერა", created_at: "2026-01-01", sections: [{ text: "<p>ტექსტი</p>" }] };
  const article = await visit("/blog/fixture", async () => json(post));
  const body = article.body;
  assert.ok(body.includes("<title>SEO სათაური | Artopia</title>"));
  assert.ok(body.includes('<meta name="description" content="SEO აღწერა" data-rh="true" />'));
  assert.ok(body.includes('<meta property="og:description" content="SEO აღწერა" data-rh="true" />'));
  assert.ok(body.includes('<meta name="twitter:description" content="SEO აღწერა" data-rh="true" />'));
  const post_ld = nodes(body, "BlogPosting")[0];
  assert.equal(post_ld.headline, "SEO სათაური");
  assert.equal(post_ld.description, "SEO აღწერა");
  assert.match(body, /<h1[^>]*>ნამდვილი სათაური<\/h1>/);                      // the visible heading is the real title
  assert.ok(body.includes(`<p>${blogArticleMeta(post, "fixture").intro}</p>`));  // the visible intro is the description

  // fallback: no meta fields → sentence/word boundary, no mid-word cut
  const fallback = blogArticleMeta({ ...post, meta_title: "", meta_description: "" }, "fixture");
  assert.equal(fallback.title, "ნამდვილი სათაური | Artopia");
  assert.ok(fallback.description.length <= 155);
  assert.equal(fallback.description, "ეს არის სტატიის გრძელი შესავალი აბზაცი, რომელიც ხილულია გვერდზე.");
  const words = new Set(intro.split(/[\s,.]+/));
  const noPunct = clipAtBoundary("სიტყვა ".repeat(40), 155);
  assert.ok(noPunct.length <= 156 && noPunct.endsWith("…"));
  for (const w of noPunct.slice(0, -1).split(" ").filter(Boolean)) assert.equal(w, "სიტყვა");
  assert.equal(clipAtBoundary("მოკლე ტექსტი.", 155), "მოკლე ტექსტი.");
  assert.equal(clipAtBoundary("ა".repeat(200), 155).length, 155);            // one endless word: hard cut as last resort
  assert.ok(words.size > 0);
});

test("filtered pagination is validated against the inclusive catalogue, noindex and no canonical", async () => {
  const r = await visit("/products/category/Fixture/page/3?include_out_of_stock=1", url => {
    assert.equal(new URL(url).searchParams.get("include_out_of_stock"), "1");
    return json({ items: [product({ quantity: 0 })], total: 60, category_exists: true });
  });
  assert.equal(r.status, 200);
  assert.equal(robots(r.body), "noindex,follow");
  assert.deepEqual(canonical(r.body), []);
  assert.equal(r.response.headers.get("x-robots-tag"), "noindex");
});

test("renamed category keeps the inclusive filter on its permanent redirect", async () => {
  const r = await visit("/products/category/Old?include_out_of_stock=1", () =>
    json({ items: [], total: 0, category_exists: false, category_moved_to: "New" }));
  assert.equal(r.status, 301);
  assert.equal(r.response.headers.get("location"), "https://artopia.ge/products/category/New?include_out_of_stock=1");
});


test("confirmed empty default catalogues are 200 with matching React noindex, without canonical", async () => {
  for (const path of ["/products", "/products/category/Fixture"]) {
    const r = await visit(path, () => json({ items: [], total: 0, category_exists: true }));
    assert.equal(r.status, 200);
    assert.equal(robots(r.body), "noindex,nofollow");
    assert.deepEqual(canonical(r.body), []);
  }
});

test("search and subcategory-filtered catalogue pages are never pre-filled with the unfiltered list", async () => {
  const api = async (url) => (url.includes("/products/list?") ? json({ items: [product()], total: 1, category_exists: true })
    : url.includes("/categories/") ? json({ name: "x", slug: "x" }) : noNetwork(url));
  for (const filtered of ["/products?search=x", "/products/category/x?search=x", "/products/group/art?categories=a,b"]) {
    assert.doesNotMatch((await visit(filtered, api)).body, /artopia-initial-data/, filtered);
  }
  assert.match((await visit("/products/category/x", api)).body, /artopia-initial-data/);
});

test("catalog HTML: no wrong preload on the landing page, the category tree ships inline, filtered lists are never pre-filled", async () => {
  const tree = { main_categories: [{ id: 1, slug: "art", name: "სამხატვრო", image_url: "https://res.cloudinary.com/x/image/upload/v1/cat.png", subcategories: [] }], featured_sections: [] };
  const api = async (url) => {
    if (url.includes("/products/list?")) return json({ items: [product({ image_url1: "https://res.cloudinary.com/x/image/upload/v1/list.png" })], total: 1, category_exists: true });
    if (url.endsWith("/categories/catalog")) return json(tree);
    if (url.includes("/categories/main/")) return json({ name: "სამხატვრო", slug: "art" });
    return noNetwork(url);
  };
  const initial = (body) => JSON.parse(body.match(/<script id="artopia-initial-data" type="application\/json">([\s\S]*?)<\/script>/)?.[1] ?? "null");

  const landing = await visit("/products", api);
  assert.equal(landing.status, 200);
  assert.match(landing.body, /rel="preload" as="image" href="[^"]*cat\.png"/);
  assert.doesNotMatch(landing.body, /rel="preload"[^>]*list\.png/);
  assert.deepEqual(initial(landing.body).data.catalog, tree);

  const group = await visit("/products/group/art", api);
  assert.deepEqual(initial(group.body).data.catalog, tree);

  for (const filtered of ["/products?search=x", "/products/category/x?search=x", "/products/group/art?categories=a,b"]) {
    assert.equal(initial((await visit(filtered, api)).body), null, filtered);
  }
});

test("product page uses the first existing photo even when slot 1 is empty (preload + JSON-LD)", async () => {
  const photo = "https://res.cloudinary.com/x/image/upload/v1/second-slot.png";
  const { body } = await visit("/products/tikha-deli", async (url) => (url.includes("/products/full/")
    ? json({ product: product({ image_url1: null, image_url2: photo }), related: [] }) : noNetwork(url)));
  assert.ok(body.includes(`imagesrcset="${responsiveImage(photo, "detail").srcSet}"`));
  assert.deepEqual(nodes(body, "Product")[0].image, [photo]);
});

test("subcategory copy hydrates with its products to prevent a late layout shift", async () => {
  const category = { name: "აკრილი", slug: "acrylic", description: "Reviewed category copy", meta_title: "აკრილი | Artopia", main_category_slug: "art", main_category_name: "სამხატვრო" };
  const r = await visit("/products/category/acrylic", url => url.includes("/products/list?")
    ? json({ items: [product()], total: 1, category_exists: true })
    : url.includes("/categories/sub/") ? json(category) : noNetwork(url));
  const initial = JSON.parse(r.body.match(/<script id="artopia-initial-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  assert.deepEqual(initial.data.category_context, category);
});

test("a renamed main category answers 301 to its new slug (the API says so in JSON)", async () => {
  const api = async (url) => (url.includes("/products/list?")
    ? json({ items: [], total: 0, category_exists: true, main_category_exists: false, main_category_moved_to: "helouini-da-sachuqrebi" })
    : url.includes("/categories/") ? json({ message: "not found" }, 404) : noNetwork(url));
  const moved = await visit("/products/group/sachuqrebi?categories=sadghesastsaulo", api);
  assert.equal(moved.status, 301);
  assert.equal(moved.response.headers.get("location"), "https://artopia.ge/products/group/helouini-da-sachuqrebi?categories=sadghesastsaulo");
  const unknown = await visit("/products/group/nope", async (url) => (url.includes("/products/list?")
    ? json({ items: [], total: 0, main_category_exists: false, main_category_moved_to: null }) : noNetwork(url)));
  assert.equal(unknown.status, 404);
});
