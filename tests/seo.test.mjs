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
