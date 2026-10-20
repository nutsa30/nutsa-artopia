import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";
import edge from "../netlify/edge-functions/meta.js";
import { handler, validateSitemap } from "../netlify/functions/sitemap.js";
import { indexPolicy } from "../src/utils/indexPolicy.js";
import { syncSummary } from "../src/utils/syncSummary.js";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const source = () => ({ next: async () => new Response(html, { headers: { "content-type": "text/html" } }) });
const xml = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><loc>https://artopia.ge/products/fixture</loc><image:image><image:loc>https://res.cloudinary.com/x/photo.jpg</image:loc></image:image></url></urlset>';

for (const path of ["/checkout", "/login", "/admin", "/admin/categories", "/payment/result?state=fixture", "/menu", "/blog",
  "/products?search=fixture", "/products/group/art?categories=paint", "/products?include_out_of_stock=1",
  "/products/category/paint/page/2?include_out_of_stock=true"]) {
  test(`initial HTTP and HTML follow shared noindex policy: ${path}`, async () => {
    const previous = globalThis.fetch; globalThis.fetch = async () => { throw Error("isolated outage"); };
    try {
      const response = await edge(new Request("https://artopia.ge" + path), source());
      const dom = new JSDOM(await response.text());
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-robots-tag"), "noindex");
      assert.equal(dom.window.document.querySelector('meta[name="robots"]').content, indexPolicy(path).robots);
      assert.equal(dom.window.document.querySelectorAll('link[rel="canonical"], meta[property="og:url"], link[hreflang]').length, 0);
      if (indexPolicy(path).utility) assert.equal(response.headers.get("cache-control"), "private, no-store");
      dom.window.close();
    } finally { globalThis.fetch = previous; }
  });
}

test("valid product/category/pagination and tracking queries remain indexable", () => {
  for (const path of ["/", "/products/fixture", "/products/category/paint", "/products/group/art/page/2", "/blog/story", "/products?utm_source=x"])
    assert.equal(indexPolicy(path).noIndex, false, path);
});

test("Edge catalogue graph has a React-owned stable identity and real filtered URL", async () => {
  const previous = globalThis.fetch;
  globalThis.fetch = async url => {
    if (url.includes("categories/catalog")) return Response.json({ main_categories: [{ slug: "art", name: "Art", subcategories: [{ slug: "paint", name: "Paint" }] }] });
    return Response.json({ items: [{ id: 1, name: "Paint", slug: "paint-1", price: 10, quantity: 1 }], total: 45, category_exists: true, main_category_exists: true,
      category_context: { name: "Paint", slug: "paint", main_category_name: "Art", main_category_slug: "art" } });
  };
  try {
    for (const path of ["/products/group/art", "/products/category/paint", "/products/category/paint/page/2", "/products/group/art?categories=paint"]) {
      const response = await edge(new Request("https://artopia.ge" + path), source());
      const dom = new JSDOM(await response.text());
      const scripts = dom.window.document.querySelectorAll("#artopia-catalog-schema");
      assert.equal(scripts.length, 1, path);
      assert.equal(scripts[0].getAttribute("data-rh"), "true");
      const graph = JSON.parse(scripts[0].textContent)["@graph"];
      assert.equal(graph.filter(s => s["@type"] === "CollectionPage").length, 1);
      assert.equal(graph.filter(s => s["@type"] === "BreadcrumbList").length, 1);
      assert.equal(graph[0].url, "https://artopia.ge" + path);
      assert.equal(graph[0].breadcrumb["@id"], graph[1]["@id"]);
      dom.window.close();
    }
  } finally { globalThis.fetch = previous; }
});

test("robots permits crawlers to read utility/query noindex", async () => {
  const robots = await readFile(new URL("../public/robots.txt", import.meta.url), "utf8");
  assert.doesNotMatch(robots, /^Disallow:/m);
});

test("expected inactivity and real failures have distinct admin summaries", () => {
  assert.match(syncSummary({ outcome: "success_with_info", expected_deferred: 2050 }), /ინფორმაციული.*\n.*\nმოსალოდნელი/);
  assert.match(syncSummary({ outcome: "blocked", anomalies: [{ code: "empty_product_snapshot" }], failure_streak: 3 }), /empty_product_snapshot/);
});

test("valid sitemap including Cloudinary image extensions returns XML 200", async () => {
  const previous = globalThis.fetch; globalThis.fetch = async () => new Response(xml);
  try {
    const result = await handler();
    assert.equal(result.statusCode, 200);
    assert.equal(result.body, xml);
    assert.match(result.headers["Content-Type"], /application\/xml/);
    assert.match(result.headers["Cache-Control"], /s-maxage=300/);
  } finally { globalThis.fetch = previous; }
});

for (const body of ["", " ", "<html>upstream failure</html>", xml.slice(0, -9),
  xml.replace("</urlset>", "<bad></urlset>"), xml.replace("<loc>", "<loc><loc>"),
  xml.replace("https://artopia.ge/products/fixture", "https://attacker.invalid/x"),
  '<!DOCTYPE urlset [<!ENTITY x "secret">]>' + xml,
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', xml + "<extra/>"]) {
  test(`invalid sitemap cannot become cached success: ${body.slice(0, 35)}`, async () => {
    const previous = globalThis.fetch; globalThis.fetch = async () => new Response(body);
    try {
      assert.throws(() => validateSitemap(body));
      const result = await handler();
      assert.equal(result.statusCode, 502);
      assert.equal(result.headers["Cache-Control"], "no-store");
      assert.equal(result.headers["Netlify-CDN-Cache-Control"], "no-store");
      assert.notEqual(result.body, body);
    } finally { globalThis.fetch = previous; }
  });
}

for (const status of [500, 503, 429]) {
  test(`upstream ${status} never becomes 200`, async () => {
    const previous = globalThis.fetch; globalThis.fetch = async () => new Response("private error", { status });
    try { const result = await handler(); assert.equal(result.statusCode, status === 503 ? 503 : 502); assert.equal(result.headers["Cache-Control"], "no-store"); }
    finally { globalThis.fetch = previous; }
  });
}
test("sitemap timeout, network error and oversized stream are bounded errors", async () => {
  const previous = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw Error("network"); };
    assert.equal((await handler()).statusCode, 502);
    globalThis.fetch = async () => new Response(new Uint8Array(8 * 1024 * 1024 + 1));
    assert.equal((await handler()).statusCode, 502);
    globalThis.fetch = async (_url, { signal }) => new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(Error("timeout"))));
    assert.equal((await handler()).statusCode, 504);
  } finally { globalThis.fetch = previous; }
});
