import { canonicalHtml, canonicalUrl, catalogPath, parseCatalogPath } from "../../src/utils/canonical.js";
import {
  PRODUCTS_PER_PAGE, catalogMeta, productJsonLd, breadcrumbJsonLd, productBreadcrumbs,
  BLOG_INDEX_META, blogArticleMeta,
} from "../../src/utils/catalogMeta.js";
import { responsiveImage } from "../../src/utils/cloudinary.js";

// Netlify Edge Function — bakes correct per-page SEO into the SPA's index.html
// for all visitors and crawlers so
// they get the right <title>, description, canonical, Open Graph, Twitter and
// JSON-LD without executing JS. React Helmet adopts the same canonical tag.
//
// Covered routes (see config.path): product detail, category, products listing,
// blog index, blog articles, reviews, contacts, engraving, policy pages.
//
// SAFETY: everything is wrapped in try/catch — on ANY error we return the
// original response untouched (passthrough). Netlify atomic deploys mean a bad
// build never takes the site down.
// Not cloaking: bots receive the same title/description the SPA itself renders.
//
// HTTP STATUS: the SPA fallback answers every path with 200. This function turns
// that into a real 404 / 410 / 301, but ONLY on positive evidence:
//   - the path matches no route of the app (see isKnownRoute), or
//   - the API itself answered with a JSON 404 / 410 / 301 for that product,
//     category page or blog article.
// An API timeout, network error, 5xx or any unexpected answer is NEVER treated as
// "not found": the page is served with 200 exactly as before, so an outage cannot
// drop live products from Google.

// ARTOPIA_API_BASE (Netlify env) lets `netlify dev` / a deploy preview run this
// function against a non-production backend. Unset in production → the live API.
const API = (globalThis.Netlify?.env?.get?.("ARTOPIA_API_BASE") || "https://artopia-backend-2024-54872c79acdd.herokuapp.com").replace(/\/+$/, "");
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

// Client-side routes (src/App.jsx). Anything else is a real 404.
const STATIC_ROUTES = new Set([
  "/", "/index.html", "/products", "/engraving", "/blogs", "/login", "/checkout",
  "/payment/result", "/contacts", "/terms", "/returns", "/privacy", "/reviews",
  // legacy admin shortcuts that App.jsx redirects into /admin/*
  "/admin", "/menu", "/addProducts", "/order_history", "/blog", "/promo-codes", "/home-images",
]);
const ROUTE_PATTERNS = [
  /^\/admin\/.+$/,
  /^\/addProducts\/[^/]+$/,
  /^\/products\/[^/]+$/,
  /^\/products\/page\/[^/]+$/,
  /^\/products\/category\/[^/]+(?:\/page\/[^/]+)?$/,
  /^\/blog\/[^/]+$/,
];
export const isKnownRoute = (path) =>
  STATIC_ROUTES.has(path) || ROUTE_PATTERNS.some((rx) => rx.test(path));

// The API said "this does not exist" — only a JSON answer from our own backend counts.
const isApiVerdict = (r, status) =>
  r.status === status && (r.headers.get("content-type") || "").includes("application/json");

const apiFetch = (path, init = {}) =>
  fetch(`${API}${path}`, { signal: AbortSignal.timeout(2500), ...init });

const NOT_FOUND = {
  404: ["გვერდი ვერ მოიძებნა | Artopia", "სამწუხაროდ, ეს გვერდი არ არსებობს."],
  410: ["პროდუქტი აღარ იყიდება | Artopia", "ეს პროდუქტი გაყიდვიდან ამოღებულია."],
};

// Same SPA shell (the app renders its own "not found" view), but with the real
// status and noindex — never a 200 + index,follow for a page that does not exist.
function notFoundResponse(html, source, status = 404) {
  const [title, description] = NOT_FOUND[status] || NOT_FOUND[404];
  let out = html;
  out = setTag(out, /<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  out = setTag(out, /<meta\s+name="description"[^>]*>/, `<meta name="description" content="${esc(description)}" />`);
  out = setTag(out, /<meta\s+name="robots"[^>]*>/, `<meta name="robots" content="noindex, follow" data-rh="true" />`);
  out = out.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>\s*/gi, "");
  out = out.replace(/<meta\s+property="og:(?:url|title|description)"[^>]*>\s*/g, "");
  const headers = new Headers(source.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  headers.set("cache-control", "public, max-age=0, must-revalidate");
  headers.set("x-robots-tag", "noindex");
  for (const name of ["content-length", "content-encoding", "etag", "last-modified"]) headers.delete(name);
  return new Response(out, { status, headers });
}

// <link rel="preload"> for the LCP image. Only for a real Cloudinary photo, and
// built by the same helper as the <img> itself — a preload that does not match
// the image exactly would download a second, wasted file.
function imagePreload(url, kind) {
  if (typeof url !== "string" || !url.trim()) return "";
  const picture = responsiveImage(url, kind);
  if (!picture.srcSet) return "";
  return `<link rel="preload" as="image" href="${esc(picture.src)}" imagesrcset="${esc(picture.srcSet)}" imagesizes="${esc(picture.sizes)}" fetchpriority="high" />`;
}

function applyMeta(html, { title, description, url, image, type, jsonLd, keywords, headExtra }) {
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
    `<link rel="canonical" href="${esc(canonicalUrl(url))}" data-rh="true" />`
  );
  out = setTag(out, /<meta\s+property="og:title"[^>]*>/, `<meta property="og:title" content="${esc(title)}" />`);
  out = setTag(out, /<meta\s+property="og:description"[^>]*>/, `<meta property="og:description" content="${esc(description)}" />`);
  out = setTag(out, /<meta\s+property="og:url"[^>]*>/, `<meta property="og:url" content="${esc(url)}" />`);
  out = setTag(out, /<meta\s+property="og:image"[^>]*>/, `<meta property="og:image" content="${esc(image)}" />`);
  out = setTag(out, /<meta\s+property="og:type"[^>]*>/, `<meta property="og:type" content="${esc(type)}" />`);
  out = setTag(out, /<meta\s+name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${esc(title)}" />`);
  out = setTag(out, /<meta\s+name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${esc(description)}" />`);
  out = setTag(out, /<meta\s+name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${esc(image)}" />`);
  if (headExtra) out = out.replace("</head>", `${headExtra}\n</head>`);
  if (jsonLd) {
    // data-ld-edge: the SPA sees that this page already carries its JSON-LD and
    // does not emit a second, competing copy (see src/utils/edgeJsonLd.js).
    const path = new URL(url).pathname;
    out = out.replace(
      "</head>",
      `<script type="application/ld+json" data-ld-edge="${esc(path)}">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>\n</head>`
    );
  }
  return out;
}

const htmlResponse = (out, source) => {
  const headers = new Headers(source.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  // Body transformations invalidate validators and encoded-body size metadata.
  for (const name of ["content-length", "content-encoding", "etag", "last-modified"]) headers.delete(name);
  return new Response(out, { status: source.status, statusText: source.statusText, headers });
};

const breadcrumb = breadcrumbJsonLd;

// The production site also answers on Netlify's own hostnames
// (<site>.netlify.app, main--<site>.netlify.app). They are copies of artopia.ge
// and must never be indexed themselves.
export default async (request, context) => {
  const response = await handle(request, context);
  try {
    if (new URL(request.url).hostname.endsWith(".netlify.app")) {
      const headers = new Headers(response.headers);
      headers.set("x-robots-tag", "noindex");
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }
  } catch { /* keep the response as it is */ }
  return response;
};

async function handle(request, context) {
  const source = await context.next();
  // The untouched page with the right canonical: what every visitor gets when
  // nothing below applies, the API is slow/down, or anything throws.
  let page = () => source;

  try {
    const ctype = source.headers.get("content-type") || "";
    if (!ctype.includes("text/html")) return source;

    if (source.status !== 200) return source;
    const url = new URL(request.url);
    const pageCanonical = canonicalUrl(url.href);
    // All user agents get the same page-specific canonical, even if the API fails.
    const shell = canonicalHtml(await source.text(), pageCanonical);
    page = () => htmlResponse(shell, source);
    // Routing is decided on the path the visitor asked for (not the canonical one).
    let rawPath = url.pathname.replace(/\/+$/, "") || "/";
    try { rawPath = decodeURIComponent(rawPath); } catch { /* keep as is */ }
    if (!isKnownRoute(rawPath)) return notFoundResponse(shell, source, 404);

    const path = decodeURIComponent(new URL(pageCanonical).pathname);

    /* ===================== BLOG ARTICLE: /blog/<slug> ===================== */
    const blogMatch = path.match(/^\/blog\/([^/]+)$/);
    if (blogMatch) {
      const slug = blogMatch[1];
      const r = await apiFetch(`/blogs/slug/${encodeURIComponent(slug)}`);
      if (isApiVerdict(r, 404)) return notFoundResponse(shell, source, 404);
      if (!r.ok) return page();
      const b = await r.json();
      const post = b && (b.product ? b.product : b);
      if (!post || !(post.title || post.meta_title)) return page();

      // Always use the real SPA route (/blog/<slug>). The backend's
      // canonical_url field uses /blogs/<slug> which is NOT a real route.
      const articleMeta = blogArticleMeta(post, slug);
      const pageUrl = articleMeta.url;
      const description = articleMeta.description;
      const image = post.og_image || post.cover_image || DEFAULT_IMAGE;
      const html = shell;
      const out = applyMeta(html, {
        title: articleMeta.title,
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
      return htmlResponse(out, source);
    }

    /* ===================== BLOG INDEX: /blogs ===================== */
    if (path === "/blogs") {
      const html = shell;
      const out = applyMeta(html, {
        title: BLOG_INDEX_META.title,
        description: BLOG_INDEX_META.description,
        url: BLOG_INDEX_META.url,
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
      return htmlResponse(out, source);
    }

    /* ===================== REVIEWS: /reviews ===================== */
    if (path === "/reviews") {
      const html = shell;
      let agg = null;
      try {
        const rr = await fetch(`${API}/google-reviews`, { signal: AbortSignal.timeout(2500) });
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
      } catch { /* ignore — page still gets correct meta below */ }

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
      return htmlResponse(out, source);
    }

    /* ===================== CONTACTS: /contacts ===================== */
    if (path === "/contacts") {
      const html = shell;
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
      return htmlResponse(out, source);
    }

    /* ===================== ENGRAVING: /engraving ===================== */
    if (path === "/engraving") {
      const html = shell;
      const faq = [
        ["რა ღირს გრავირება?", "გრავირებული კალამი — 16-დან 32 ₾-მდე, ბრელოკი — 13 ₾ ერთ მხარეს და 20 ₾ ორივე მხარეს, თქვენს ნივთზე გრავირება — 10 ₾."],
        ["რამდენ ხანში მზადდება გრავირებული ნივთი?", "2-3 სამუშაო დღე. აღება მაღაზიიდან ან კურიერით — დამზადების შემდეგ."],
        ["შეიძლება ფოტოს ამოწვა?", "კი, ბრელოკებზე. ფოტო შავ-თეთრად მუშავდება და 3D პრევიუში ჩანს, როგორ ამოიწვება."],
        ["შეგიძლიათ ჩემს ნივთზე გრავირება?", "კი, 10 ₾. დაგვირეკეთ (+995 593 204 098), მოგვწერეთ (info@artopia.ge) ან მობრძანდით მაღაზიაში — სიმონ ჩიქოვანის 45, თბილისი."],
      ];
      const offers = [
        ["გრავირებული ოქროსფერი კალამი", 25, "pen"],
        ["გრავირებული ვერცხლისფერი კალამი", 23, "pen-silver"],
        ["გრავირებული ლითონის კალამი", 18, "pen-fullsilver"],
        ["გრავირებული წითელი კალამი", 16, "pen-red"],
        ["გრავირებული კალამი „თოფი“", 32, "pen-rifle"],
        ["გრავირებული ხის ბრელოკი — კვადრატი", 13, "keychain"],
        ["გრავირებული ხის ბრელოკი — მრგვალი", 13, "keychain-round"],
        ["გრავირებული ტყავის ბრელოკი — ოთხკუთხა", 13, "leather-square"],
        ["გრავირებული ტყავის ბრელოკი — მრგვალი", 13, "leather-round"],
      ];
      const out = applyMeta(html, {
        title: "გრავირება თბილისში — გრავირებული კალამი და ბრელოკი | Engraving | Artopia",
        description:
          "ლაზერული გრავირება (engraving) Artopia-ში: გრავირებული კალმები 16–32₾, ხის და ტყავის ბრელოკები წარწერით ან ფოტოთი — 13₾, ორივე მხარე 20₾. გრავირება თქვენს ნივთზე — 10₾. 3D პრევიუ და ონლაინ შეკვეთა.",
        url: `${SITE}/engraving`,
        image: `${SITE}/images/engraving/pen.webp`,
        type: "website",
        keywords:
          "გრავირება, ლაზერული გრავირება, გრავირება თბილისში, გრავირებული კალამი, კალამი წარწერით, ბრელოკი წარწერით, ხის ბრელოკი, ტყავის ბრელოკი, ფოტოს ამოწვა, პერსონალური საჩუქარი, engraving, laser engraving, engraved pen, engraved keychain, Tbilisi",
        jsonLd: {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebPage",
              "@id": `${SITE}/engraving#webpage`,
              url: `${SITE}/engraving`,
              name: "გრავირება თბილისში — გრავირებული კალამი და ბრელოკი",
              inLanguage: "ka-GE",
              about: { "@id": `${SITE}/engraving#service` },
              isPartOf: { "@id": `${SITE}/#website` },
              breadcrumb: breadcrumb([
                { name: "მთავარი", item: `${SITE}/` },
                { name: "გრავირება", item: `${SITE}/engraving` },
              ]),
            },
            {
              "@type": "Service",
              "@id": `${SITE}/engraving#service`,
              name: "ლაზერული გრავირება",
              alternateName: ["გრავირება", "Laser engraving", "Engraving"],
              serviceType: "Laser engraving",
              url: `${SITE}/engraving`,
              provider: { "@id": ORG_ID },
              areaServed: { "@type": "Country", name: "Georgia" },
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "გრავირება",
                itemListElement: [
                  ...offers.map(([name, price, img]) => ({
                    "@type": "Offer",
                    name,
                    price: String(price),
                    priceCurrency: "GEL",
                    availability: "https://schema.org/InStock",
                    url: `${SITE}/engraving`,
                    image: `${SITE}/images/engraving/${img}.webp`,
                  })),
                  {
                    "@type": "Offer",
                    name: "გრავირება მომხმარებლის ნივთზე",
                    price: "10",
                    priceCurrency: "GEL",
                    url: `${SITE}/engraving#own-item`,
                  },
                ],
              },
            },
            {
              "@type": "FAQPage",
              mainEntity: faq.map(([q, a]) => ({
                "@type": "Question",
                name: q,
                acceptedAnswer: { "@type": "Answer", text: a },
              })),
            },
          ],
        },
      });
      return htmlResponse(out, source);
    }

    /* ===================== POLICY PAGES ===================== */
    const policy = {
      "/terms": ["წესები და პირობები", "Artopia-ს გამოყენების წესები და პირობები — შეკვეთა, გადახდა, მიწოდება."],
      "/returns": ["დაბრუნების პოლიტიკა", "Artopia-ს პროდუქციის დაბრუნებისა და გადაცვლის პოლიტიკა."],
      "/privacy": ["კონფიდენციალურობა", "Artopia-ს კონფიდენციალურობის პოლიტიკა — როგორ ვამუშავებთ შენს მონაცემებს."],
    };
    if (policy[path]) {
      const [t, d] = policy[path];
      const html = shell;
      const out = applyMeta(html, {
        title: `${t} — Artopia`,
        description: d,
        url: `${SITE}${path}`,
        image: DEFAULT_IMAGE,
        type: "website",
      });
      return htmlResponse(out, source);
    }

    /* ============ CATALOG: /products[/category/<name>][/page/<N>] ============ */
    const rawCatalog = parseCatalogPath(rawPath);
    if (rawCatalog) {
      if (!rawCatalog.valid) return notFoundResponse(shell, source, 404);   // /page/abc, /page/0
      // The canonical path also folds in the legacy ?category= / ?page= forms.
      const catalog = parseCatalogPath(path) || rawCatalog;
      const { category, page } = catalog;
      let total = null;
      let firstImage = null;
      // Page 1 of the full catalogue always exists; everything else is checked
      // against the API so a mistyped category or a page past the end is a 404.
      if (category || page > 1) {
        const qs = new URLSearchParams({ page: String(page), limit: String(PRODUCTS_PER_PAGE) });
        if (category) qs.set("category", category);
        const r = await apiFetch(`/products/list?${qs}`);
        if (r.ok && (r.headers.get("content-type") || "").includes("application/json")) {
          const data = await r.json();
          const items = Array.isArray(data?.items) ? data.items : null;
          // a renamed category: its old address moves permanently to the new name
          const movedTo = data?.category_exists === false ? data?.category_moved_to : null;
          if (typeof movedTo === "string" && movedTo.trim() && movedTo !== category) {
            return new Response(null, { status: 301, headers: { location: `${SITE}${catalogPath({ category: movedTo })}` } });
          }
          if (data?.category_exists === false) return notFoundResponse(shell, source, 404);
          if (items && items.length) firstImage = items[0]?.image_url1 || null;
          if (items && page > 1 && items.length === 0) return notFoundResponse(shell, source, 404);
          if (Number.isFinite(Number(data?.total))) total = Number(data.total);
        }
        // not ok / not JSON → unknown; fall through and serve the page as 200
      }

      const meta = catalogMeta({ category, page });
      const crumbs = [
        { name: "მთავარი", item: `${SITE}/` },
        { name: "პროდუქტები", item: `${SITE}/products` },
      ];
      if (category) crumbs.push({ name: category, item: `${SITE}${catalogPath({ category })}` });

      // rel prev/next: plain crawlable hints to the neighbouring listing pages
      const links = [];
      if (page > 1) links.push(`<link rel="prev" href="${esc(`${SITE}${catalogPath({ category, page: page - 1 })}`)}" />`);
      if (total != null && page * PRODUCTS_PER_PAGE < total) {
        links.push(`<link rel="next" href="${esc(`${SITE}${catalogPath({ category, page: page + 1 })}`)}" />`);
      }

      const out = applyMeta(shell, {
        title: meta.title,
        description: meta.description,
        url: meta.url,
        image: DEFAULT_IMAGE,
        type: "website",
        headExtra: [...links, imagePreload(firstImage, "card")].filter(Boolean).join("\n"),
        jsonLd: {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              name: meta.title,
              url: meta.url,
              inLanguage: "ka-GE",
              isPartOf: { "@id": `${SITE}/#website` },
            },
            breadcrumb(crumbs),
          ],
        },
      });
      return htmlResponse(out, source);
    }

    /* ===================== PRODUCT DETAIL: /products/<slug> ===================== */
    const prodMatch = rawPath.match(/^\/products\/([^/]+)$/);
    if (!prodMatch) return page();
    const slug = prodMatch[1];

    // redirect: "manual" — a 301 from the API is an explicit, human-made
    // "this product was replaced by that one" record and becomes a real 301.
    const apiRes = await apiFetch(`/products/full/${encodeURIComponent(slug)}`, { redirect: "manual" });
    if (isApiVerdict(apiRes, 404)) return notFoundResponse(shell, source, 404);
    if (isApiVerdict(apiRes, 410)) return notFoundResponse(shell, source, 410);
    if (isApiVerdict(apiRes, 301)) {
      const target = (await apiRes.json())?.moved_to;
      if (typeof target === "string" && /^[a-z0-9-]+$/.test(target) && target !== slug) {
        return new Response(null, { status: 301, headers: { location: `${SITE}/products/${target}` } });
      }
      return page();
    }
    if (!apiRes.ok) return page();       // timeout / 5xx / anything unexpected → untouched 200
    const data = await apiRes.json();
    const p = data && data.product;
    if (!p || !p.name) return page();

    const name = String(p.name).trim();
    const image = p.image_url1 || DEFAULT_IMAGE;
    const pageUrl = `${SITE}/products/${slug}`;
    const description = clip(p.description || `${name} — იყიდე Artopia-ში, სამხატვრო და საკანცელარიო მაღაზია. მიტანა მთელ საქართველოში.`, 160);

    const html = shell;
    const out = applyMeta(html, {
      title: `${name} | Artopia`,
      description,
      url: pageUrl,
      image,
      type: "product",
      headExtra: imagePreload(p.image_url1, "detail"),
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          productJsonLd(p, { url: pageUrl, images: p.image_url1 ? [p.image_url1] : [], sellerId: ORG_ID }),
          breadcrumb(productBreadcrumbs(p, pageUrl)),
        ],
      },
    });

    return htmlResponse(out, source);
  } catch {
    return page(); // fail-safe: never break the page, never invent a 404
  }
}

// Runs for every page URL so that unknown paths get a real 404. Static asset
// folders are excluded (and any non-HTML response is passed through untouched).
export const config = {
  path: "/*",
  // /sitemap.xml is a rewrite to a function and /robots.txt a static file: neither
  // is a page, and neither may ever be turned into a 404 by the route table.
  excludedPath: ["/assets/*", "/models/*", "/fonts/*", "/images/*", "/.netlify/*", "/sitemap.xml", "/robots.txt"],
};
