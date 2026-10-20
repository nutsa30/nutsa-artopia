import { DOMParser } from "@xmldom/xmldom";

const UPSTREAM = "https://artopia-backend-2024-54872c79acdd.herokuapp.com/sitemap.xml";
const NS = "http://www.sitemaps.org/schemas/sitemap/0.9";
const MAX_BYTES = 8 * 1024 * 1024;
const errorResponse = (statusCode) => ({ statusCode, headers: {
  "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store",
  "Netlify-CDN-Cache-Control": "no-store", "Retry-After": "60",
}, body: "Sitemap temporarily unavailable. Please retry later." });

export function validateSitemap(xml) {
  if (!xml.trim() || /<!\s*(?:DOCTYPE|ENTITY)\b/i.test(xml)) throw new Error("Unsafe XML");
  const doc = new DOMParser({ onError() { throw new Error("Invalid XML"); } })
    .parseFromString(xml, "application/xml");
  const root = doc.documentElement;
  if (!root || root.namespaceURI !== NS || !["urlset", "sitemapindex"].includes(root.localName))
    throw new Error("Invalid sitemap root");
  const entryName = root.localName === "urlset" ? "url" : "sitemap";
  const entries = Array.from(root.childNodes).filter((node) => node.nodeType === 1);
  if (!entries.length || entries.length > 50000) throw new Error("Invalid entry count");
  for (const entry of entries) {
    if (entry.namespaceURI !== NS || entry.localName !== entryName) throw new Error("Invalid entry");
    const locations = Array.from(entry.childNodes).filter((node) =>
      node.nodeType === 1 && node.namespaceURI === NS && node.localName === "loc");
    if (locations.length !== 1) throw new Error("Invalid location");
    const address = new URL(locations[0].textContent.trim());
    if (address.protocol !== "https:" || address.hostname !== "artopia.ge" || address.port ||
        address.username || address.password || address.hash) throw new Error("Invalid URL");
  }
}

// Bounded body read and total abort window; never cache an upstream failure as a sitemap.
export async function handler() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let reader;
  try {
    const response = await fetch(UPSTREAM, { signal: controller.signal, redirect: "error" });
    if (!response.ok) return errorResponse(response.status === 503 ? 503 : 502);
    if (Number(response.headers.get("content-length")) > MAX_BYTES) return errorResponse(502);
    reader = response.body?.getReader();
    if (!reader) return errorResponse(502);
    const chunks = [];
    let length = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BYTES) throw new Error("Sitemap too large");
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const body = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    validateSitemap(body);
    return { statusCode: 200, headers: { "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=300, must-revalidate" }, body };
  } catch {
    return errorResponse(controller.signal.aborted ? 504 : 502);
  } finally {
    clearTimeout(timer);
    if (reader) await reader.cancel().catch(() => {});
    controller.abort();
  }
}
