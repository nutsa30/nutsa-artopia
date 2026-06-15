// Netlify Edge Function — bakes correct per-page SEO into the SPA's index.html
// for crawlers (Google, Bing, social, LLMs: GPTBot/ClaudeBot/Perplexity/…) so
// they get the right <title>, description, canonical, Open Graph, Twitter and
// JSON-LD WITHOUT having to execute client-side JS. Real users still get the
// untouched fast SPA (react-helmet sets their meta client-side).
//
// Covered routes (see config.path): product detail, category, products listing,
// blog index, blog articles, reviews, contacts, policy pages.
//
// SAFETY: everything is wrapped in try/catch — on ANY error we return the
// original response untouched (passthrough). Netlify atomic deploys mean a bad
// build never takes the site down, and this function can only ever ADD meta.
// Not cloaking: bots receive the same title/description the SPA itself renders.

const API = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";
const SITE = "https://artopia.ge";
const DEFAULT_IMAGE = "https://artopia.ge/social-preview.png";
const LOGO = "https://artopia.ge/favicon-144x144.png";
const ORG_ID = `${SITE}/#organization`;

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

function applyMeta(html, { title, description, url, image, type, jsonLd, keywords }) {
  let out = html;
  out = setTag(out, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  out = setTag(
    out,
    /<meta\s+name="description"[^>]*>/,
    `<meta name="description" content="${esc(description)}" />`
  );
  if (keywords) {
    out = setTag(
      out,
      /<meta\s+name="keywords"[^>]*>/,
      `<meta name="keywords" content="${esc(keywords)}" />`
    );
  }
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

const htmlResponse = (out) =>
  new Response(out, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });

const breadcrumb = (items) => ({
  "@type": "BreadcrumbList",
  itemListElement: items.map((it, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: it.name,
    item: it.item,
  })),
});

export default async (request, context) => {
  const res = await context.next();

  try {
    const ctype = res.headers.get("content-type") || "";
    if (!ctype.includes("text/html")) return res;

    // Crawlers / scrapers / LLM bots only — humans get the untouched SPA.
    const ua = (request.headers.get("user-agent") || "").toLowerCase();
    const isBot =
      /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baiduspider|duckduckbot|applebot|facebookexternalhit|twitterbot|slackbot|linkedinbot|whatsapp|telegram|discordbot|embedly|pinterest|redditbot|gptbot|oai-searchbot|chatgpt|claudebot|anthropic|perplexity|google-extended|bytespider|amazonbot|ccbot|cohere|meta-externalagent/i.test(
        ua
      );
    if (!isBot) return res;

    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname).replace(/\/+$/, "") || "/";

    /* ===================== BLOG ARTICLE: /blog/<slug> ===================== */
    const blogMatch = path.match(/^\/blog\/([^/]+)$/);
    if (blogMatch) {
      const slug = blogMatch[1];
      const r = await fetch(`${API}/blogs/slug/${encodeURIComponent(slug)}`);
      if (!r.ok) return res;
      const b = await r.json();
      const post = b && (b.product ? b.product : b);
      if (!post || !(post.title || post.meta_title)) return res;

      // Always use the real SPA route (/blog/<slug>). The backend's
      // canonical_url field uses /blogs/<slug> which is NOT a real route.
      const pageUrl = `${SITE}/blog/${slug}`;
      const title = clip(post.meta_title || post.title, 65);
      const description = clip(post.meta_description || post.og_description || post.description, 160);
      const image = post.og_image || post.cover_image || DEFAULT_IMAGE;
      const html = await res.text();
      const out = applyMeta(html, {
        title: `${title} | Artopia`,
        description,
        url: pageUrl,
        image,
        type: "article",
        keywords: post.keywords || undefined,
        jsonLd: {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BlogPosting",
              headline: clip(post.meta_title || post.title, 110),
              description,
              image: [image],
              datePublished: post.created_at || undefined,
              dateModified: post.updated_at || post.created_at || undefined,
              inLanguage: "ka-GE",
              author: { "@type": "Organization", name: "Artopia", url: SITE },
              publisher: {
                "@type": "Organization",
                "@id": ORG_ID,
                name: "Artopia",
                logo: { "@type": "ImageObject", url: LOGO },
              },
              mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
              ...(post.keywords ? { keywords: post.keywords } : {}),
            },
            breadcrumb([
              { name: "მთავარი", item: `${SITE}/` },
              { name: "არტ ბლოგი", item: `${SITE}/blogs` },
              { name: clip(post.title, 80), item: pageUrl },
            ]),
          ],
        },
      });
      return htmlResponse(out);
    }

    /* ===================== BLOG INDEX: /blogs ===================== */
    if (path === "/blogs") {
      const html = await res.text();
      const out = applyMeta(html, {
        title: "არტ ბლოგი — Artopia | სამხატვრო რჩევები, გიდები და სიახლეები",
        description:
          "Artopia-ს არტ ბლოგი — სამხატვრო რჩევები, მასალების გიდები და ხელოვნების სიახლეები. ისწავლე როგორ აირჩიო საღებავი, ფუნჯი, ფანქარი, ტილო და სხვა სამხატვრო მასალა.",
        url: `${SITE}/blogs`,
        image: DEFAULT_IMAGE,
        type: "website",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Artopia — არტ ბლოგი",
          url: `${SITE}/blogs`,
          inLanguage: "ka-GE",
          publisher: { "@id": ORG_ID },
        },
      });
      return htmlResponse(out);
    }

    /* ===================== REVIEWS: /reviews ===================== */
    if (path === "/reviews") {
      const html = await res.text();
      let agg = null;
      try {
        const rr = await fetch(`${API}/google-reviews`);
        if (rr.ok) {
          const j = await rr.json();
          const ratingValue = Number(j?.rating || 0);
          const reviewCount = Number(j?.total_reviews || (Array.isArray(j?.reviews) ? j.reviews.length : 0));
          if (ratingValue > 0 && reviewCount > 0) {
            agg = {
              "@type": "AggregateRating",
              ratingValue: ratingValue.toFixed(1),
              reviewCount: String(reviewCount),
              bestRating: "5",
              worstRating: "1",
            };
          }
        }
      } catch (_) { /* ignore — page still gets correct meta below */ }

      const out = applyMeta(html, {
        title: "მომხმარებელთა შეფასებები — Artopia | სამხატვრო მაღაზია",
        description:
          "ნახე Artopia-ს რეალური მომხმარებლების შეფასებები. რას ფიქრობენ ჩვენზე — სამხატვრო მაღაზია თბილისში, ხარისხიანი მასალები და მომსახურება.",
        url: `${SITE}/reviews`,
        image: DEFAULT_IMAGE,
        type: "website",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "Store",
          "@id": `${SITE}/#store`,
          name: "Artopia — სამხატვრო მაღაზია",
          url: SITE,
          image: DEFAULT_IMAGE,
          ...(agg ? { aggregateRating: agg } : {}),
        },
      });
      return htmlResponse(out);
    }

    /* ===================== CONTACTS: /contacts ===================== */
    if (path === "/contacts") {
      const html = await res.text();
      const out = applyMeta(html, {
        title: "კონტაქტი — Artopia | სამხატვრო მაღაზია თბილისში",
        description:
          "დაგვიკავშირდი — Artopia, სიმონ ჩიქოვანის ქუჩა N45, თბილისი. ტელ: +995 593 204 098, info@artopia.ge. ყოველდღე 11:30–20:30. სამხატვრო და საკანცელარიო ნივთები.",
        url: `${SITE}/contacts`,
        image: DEFAULT_IMAGE,
        type: "website",
        jsonLd: {
          "@context": "https://schema.org",
          "@type": "ContactPage",
          url: `${SITE}/contacts`,
          inLanguage: "ka-GE",
          about: { "@id": ORG_ID },
        },
      });
      return htmlResponse(out);
    }

    /* ===================== POLICY PAGES ===================== */
    const policy = {
      "/terms": ["წესები და პირობები", "Artopia-ს გამოყენების წესები და პირობები — შეკვეთა, გადახდა, მიწოდება."],
      "/returns": ["დაბრუნების პოლიტიკა", "Artopia-ს პროდუქციის დაბრუნებისა და გადაცვლის პოლიტიკა."],
      "/privacy": ["კონფიდენციალურობა", "Artopia-ს კონფიდენციალურობის პოლიტიკა — როგორ ვამუშავებთ შენს მონაცემებს."],
    };
    if (policy[path]) {
      const [t, d] = policy[path];
      const html = await res.text();
      const out = applyMeta(html, {
        title: `${t} — Artopia`,
        description: d,
        url: `${SITE}${path}`,
        image: DEFAULT_IMAGE,
        type: "website",
      });
      return htmlResponse(out);
    }

    /* ===================== CATEGORY: /products/category/<name> ===================== */
    const catMatch = path.match(/^\/products\/category\/([^/]+)$/);
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
          "@graph": [
            {
              "@type": "CollectionPage",
              name: `${name} — Artopia`,
              url: pageUrl,
              inLanguage: "ka-GE",
              isPartOf: { "@id": `${SITE}/#website` },
            },
            breadcrumb([
              { name: "მთავარი", item: `${SITE}/` },
              { name: "პროდუქტები", item: `${SITE}/products` },
              { name, item: pageUrl },
            ]),
          ],
        },
      });
      return htmlResponse(out);
    }

    /* ===================== PRODUCTS LISTING: /products ===================== */
    if (path === "/products") {
      const html = await res.text();
      const out = applyMeta(html, {
        title: "პროდუქტები — Artopia | სამხატვრო და საკანცელარიო ნივთები ონლაინ",
        description:
          "Artopia-ს სრული კატალოგი — სამხატვრო მასალა (აკვარელი, აკრილის და ზეთის საღებავი, ფუნჯები, ტილო, მოლბერტი, პასტელი), საკანცელარიო, სასკოლო და საოფისე ნივთები. მიტანა მთელ საქართველოში.",
        url: `${SITE}/products`,
        image: DEFAULT_IMAGE,
        type: "website",
        jsonLd: {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              name: "პროდუქტები — Artopia",
              url: `${SITE}/products`,
              inLanguage: "ka-GE",
              isPartOf: { "@id": `${SITE}/#website` },
            },
            breadcrumb([
              { name: "მთავარი", item: `${SITE}/` },
              { name: "პროდუქტები", item: `${SITE}/products` },
            ]),
          ],
        },
      });
      return htmlResponse(out);
    }

    /* ===================== PRODUCT DETAIL: /products/<slug> ===================== */
    const prodMatch = path.match(/^\/products\/([^/]+)$/);
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

    const crumbs = [
      { name: "მთავარი", item: `${SITE}/` },
      { name: "პროდუქტები", item: `${SITE}/products` },
    ];
    if (category) {
      crumbs.push({ name: category, item: `${SITE}/products/category/${encodeURIComponent(category)}` });
    }
    crumbs.push({ name, item: pageUrl });

    const html = await res.text();
    const out = applyMeta(html, {
      title: `${name} | Artopia`,
      description,
      url: pageUrl,
      image,
      type: "product",
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          {
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
              seller: { "@id": ORG_ID },
            },
          },
          breadcrumb(crumbs),
        ],
      },
    });

    return htmlResponse(out);
  } catch (_) {
    return res; // fail-safe: never break the page
  }
};

export const config = {
  path: [
    "/products",
    "/products/*",
    "/blogs",
    "/blog/*",
    "/reviews",
    "/contacts",
    "/terms",
    "/returns",
    "/privacy",
  ],
};
