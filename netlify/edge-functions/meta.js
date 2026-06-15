// Netlify Edge Function — injects per-page SEO meta into the SPA's index.html
// for product and category URLs, so crawlers (Google, bots, social, LLMs) get
// the correct <title>, description, Open Graph and Product JSON-LD WITHOUT
// client-side JS. Users still get the normal SPA (this only rewrites <head>).
//
// SAFETY: every path is wrapped so that on ANY error we return the original
// response untouched (passthrough). A failed deploy never takes the live site
// down (Netlify atomic deploys), and this function can only ever *add* meta.
//
// Routed via the in-file `config.path` below — no netlify.toml needed.

const API = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";
const SITE = "https://artopia.ge";
const DEFAULT_IMAGE = "https://artopia.ge/social-preview.png";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const clip = (s, n) => {
  const t = String(s ?? "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};

function setTag(html, regex, replacement) {
  return regex.test(html) ? html.replace(regex, replacement) : html;
}

function applyMeta(html, { title, description, url, image, type, jsonLd }) {
  let out = html;
  out = setTag(out, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  out = setTag(
    out,
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${esc(description)}" />`
  );
  out = setTag(
    out,
    /<link\s+rel="canonical"[^>]*>/,
    `<link rel="canonical" href="${esc(url)}" />`
  );
  out = setTag(out, /<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`);
  out = setTag(out, /<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(description)}" />`);
  out = setTag(out, /<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(url)}" />`);
  out = setTag(out, /<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(image)}" />`);
  out = setTag(out, /<meta\s+property="og:type"[^>]*>/, `<meta property="og:type" content="${esc(type)}" />`);
  out = setTag(out, /<meta\s+name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(title)}" />`);
  out = setTag(out, /<meta\s+name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(description)}" />`);
  out = setTag(out, /<meta\s+name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${esc(image)}" />`);
  if (jsonLd) {
    out = out.replace(
      "</head>",
      `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n</head>`
    );
  }
  return out;
}

export default async (request, context) => {
  const res = await context.next();

  try {
    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("text/html")) return res;

    // Only do the (server-side fetch + rewrite) work for crawlers / scrapers.
    // Real users get the normal fast SPA untouched — react-helmet sets their
    // meta client-side. Not cloaking: bots receive the same title/description
    // the SPA renders, just baked into the HTML.
    const ua = (request.headers.get("user-agent") || "").toLowerCase();
    const isBot =
      /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baiduspider|duckduckbot|applebot|facebookexternalhit|twitterbot|slackbot|linkedinbot|whatsapp|telegram|discordbot|embedly|pinterest|redditbot|gptbot|oai-searchbot|chatgpt|claudebot|anthropic|perplexity|google-extended|bytespider|amazonbot|ccbot/i.test(
        ua
      );
    if (!isBot) return res;

    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname);

    // --- category landing: /products/category/<name> (no API call needed) ---
    const catMatch = path.match(/^\/products\/category\/([^/]+)\/?$/);
    if (catMatch) {
      const name = catMatch[1];
      const pageUrl = `${SITE}/products/category/${encodeURIComponent(name)}`;
      const html = await res.text();
      const out = applyMeta(html, {
        title: `${name} — Artopia | სამხატვრო მაღაზია`,
        description: `იყიდე ${name} Artopia-ში — სამხატვრო მაღაზია თბილისში. ხარისხიანი ${name}, ფართო არჩევანი და მიტანა მთელ საქართველოში.`,
        url: pageUrl,
        image: DEFAULT_IMAGE,
        type: "website",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "მთავარი", item: `${SITE}/` },
            { "@type": "ListItem", position: 2, name: "პროდუქტები", item: `${SITE}/products` },
            { "@type": "ListItem", position: 3, name, item: pageUrl },
          ],
        },
      });
      return new Response(out, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
    }

    // --- product detail: /products/<slug> ---
    const prodMatch = path.match(/^\/products\/([^/]+)\/?$/);
    if (!prodMatch || prodMatch[1] === "category") return res;
    const slug = prodMatch[1];

    const apiRes = await fetch(`${API}/products/full/${encodeURIComponent(slug)}`);
    if (!apiRes.ok) return res;
    const data = await apiRes.json();
    const p = data && data.product;
    if (!p || !p.name) return res;

    const name = String(p.name).trim();
    const category = String(p.category_name || p.category || "").trim();
    const price = Number(p.price || 0);
    const sale = Number(p.sale || 0);
    const finalPrice = sale > 0 && sale <= 100 ? +(price * (1 - sale / 100)).toFixed(2) : price;
    const inStock = Number(p.quantity || 0) > 0;
    const image = p.image_url1 || DEFAULT_IMAGE;
    const pageUrl = `${SITE}/products/${slug}`;
    const description = clip(p.description || `${name} — იყიდე Artopia-ში, სამხატვრო და საკანცელარიო მაღაზია. მიტანა მთელ საქართველოში.`, 160);

    const html = await res.text();
    const out = applyMeta(html, {
      title: `${name} | Artopia`,
      description,
      url: pageUrl,
      image,
      type: "product",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "Product",
        name,
        image: [image],
        description: String(p.description || "").trim(),
        sku: String(p.id ?? slug),
        ...(category ? { category } : {}),
        brand: { "@type": "Brand", name: "Artopia" },
        offers: {
          "@type": "Offer",
          url: pageUrl,
          price: String(finalPrice),
          priceCurrency: "GEL",
          availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: "Artopia" },
        },
      },
    });

    return new Response(out, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  } catch (_) {
    return res; // fail-safe: never break the page
  }
};

export const config = { path: "/products/*" };
