export const SITE_URL = "https://artopia.ge";

export function canonicalUrl(input = "/") {
  const url = new URL(input, SITE_URL);
  let path = url.pathname.replace(/\/+$/, "") || "/";
  const category = url.searchParams.get("category");
  if (path === "/products" && category && category !== "ყველა") {
    path = `/products/category/${encodeURIComponent(category)}`;
  }
  if (path === "/contact") path = "/contacts";
  path = path.replace(/^\/blogs\/([^/]+)$/, "/blog/$1");
  path = path.split("/").map((part) => {
    try { return encodeURIComponent(decodeURIComponent(part)); }
    catch { return encodeURIComponent(part); }
  }).join("/");
  return `${SITE_URL}${path}`;
}

export function canonicalHtml(html, url) {
  const tag = `<link rel="canonical" href="${canonicalUrl(url).replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" data-rh="true" />`;
  return html.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, "")
    .replace(/<\/head>/i, `${tag}\n</head>`);
}
