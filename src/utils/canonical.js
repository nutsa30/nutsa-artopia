export const SITE_URL = "https://artopia.ge";

// კატალოგის გვერდი N (N >= 2). 1, არარიცხვი ან უაზრო მნიშვნელობა → null.
export function pageNumber(value) {
  if (!/^[1-9]\d{0,3}$/.test(String(value ?? ""))) return null;
  const n = Number(value);
  return n >= 2 ? n : null;
}

// კატალოგის სუფთა მისამართი: /products[/category/<სახელი>][/page/<N>].
// pagination path-შია და არა ?page=-ში, ამიტომ robots.txt-ის `Disallow: /*?*`
// (ძიება, ფილტრები, ტექნიკური პარამეტრები) ხელუხლებელი რჩება.
export function catalogPath({ category, page } = {}) {
  let path = "/products";
  if (category && category !== "ყველა") path += `/category/${encodeURIComponent(category)}`;
  const n = pageNumber(page);
  if (n) path += `/page/${n}`;
  return path;
}

// /products…-ის path → { category, page, valid }. valid=false: /page/<უაზრო>.
export function parseCatalogPath(pathname) {
  const m = String(pathname || "").match(/^\/products(?:\/category\/([^/]+))?(?:\/page\/([^/]+))?\/?$/);
  if (!m) return null;
  let category = null;
  if (m[1] != null) {
    try { category = decodeURIComponent(m[1]); } catch { category = m[1]; }
  }
  if (m[2] == null) return { category, page: 1, valid: true };
  if (m[2] === "1") return { category, page: 1, valid: true };
  const page = pageNumber(m[2]);
  return { category, page: page || 1, valid: page != null };
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
    return `${SITE_URL}${catalogPath({ category, page: catalog.valid ? page : null })}`;
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
