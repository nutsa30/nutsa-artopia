export const SITE_URL = "https://artopia.ge";

// კატალოგის გვერდი N (N >= 2). 1, არარიცხვი ან უაზრო მნიშვნელობა → null.
export function pageNumber(value) {
  if (!/^[1-9]\d{0,3}$/.test(String(value ?? ""))) return null;
  const n = Number(value);
  return n >= 2 ? n : null;
}

// კატალოგის სუფთა მისამართი: /products[/category/<სახელი>][/page/<N>].
// Pagination uses crawlable paths; filtered queries use shared HTML/HTTP noindex.
export function catalogPath({ category, mainCategory, page } = {}) {
  let path = "/products";
  if (mainCategory) path += `/group/${encodeURIComponent(mainCategory)}`;
  else if (category && category !== "ყველა") path += `/category/${encodeURIComponent(category)}`;
  const n = pageNumber(page);
  if (n) path += `/page/${n}`;
  return path;
}

// /products…-ის path → { category, page, valid }. valid=false: /page/<უაზრო>.
export function parseCatalogPath(pathname) {
  const m = String(pathname || "").match(/^\/products(?:\/(category|group)\/([^/]+))?(?:\/page\/([^/]+))?\/?$/);
  if (!m) return null;
  let category = null;
  let mainCategory = null;
  if (m[2] != null) {
    let value;
    try { value = decodeURIComponent(m[2]); } catch { value = m[2]; }
    if (m[1] === "group") mainCategory = value;
    else category = value;
  }
  if (m[3] == null) return { category, mainCategory, page: 1, valid: true };
  if (m[3] === "1") return { category, mainCategory, page: 1, valid: true };
  const page = pageNumber(m[3]);
  return { category, mainCategory, page: page || 1, valid: page != null };
}

export function canonicalUrl(input = "/") {
  const url = new URL(input, SITE_URL);
  let path = url.pathname.replace(/\/+$/, "") || "/";
  if (path === "/index.html") path = "/";
  const catalog = parseCatalogPath(path);
  if (catalog) {
    // ძველი ?category= / ?page= მისამართები იმავე სუფთა გვერდზე მიუთითებს;
    // გვერდი 2+ საკუთარი canonical-ით რჩება (სხვა პროდუქტებია), გვერდი 1 — ძირითადზე.
    const category = catalog.category || url.searchParams.get("category");
    const page = catalog.page > 1 ? catalog.page : pageNumber(url.searchParams.get("page"));
    return `${SITE_URL}${catalogPath({ category, mainCategory: catalog.mainCategory, page: catalog.valid ? page : null })}`;
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
