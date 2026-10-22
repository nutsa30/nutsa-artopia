import { canonicalHtml, canonicalUrl, catalogPath, parseCatalogPath } from "../../src/utils/canonical.js";
import {
  PRODUCTS_PER_PAGE, catalogMeta, productJsonLd, breadcrumbJsonLd, productBreadcrumbs, productPageMeta,
  BLOG_INDEX_META, blogArticleMeta,
} from "../../src/utils/catalogMeta.js";
import { responsiveImage } from "../../src/utils/cloudinary.js";
import { indexPolicy, utilityTitle } from "../../src/utils/indexPolicy.js";
import { catalogJsonLd } from "../../src/utils/catalogSchema.js";
import { secureResponse } from "../lib/security.js";
import { COLOR_LAB_SEO } from "../../src/features/colorLab/seo.js";

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

function embedInitialData(html, kind, path, data) {
  const payload = JSON.stringify({ kind, path, data }).replace(/</g, "\\u003c");
  return html.replace("</head>", `<script id="artopia-initial-data" type="application/json">${payload}</script>\n</head>`);
}

// Client-side routes (src/App.jsx). Anything else is a real 404.
const STATIC_ROUTES = new Set([
  "/", "/index.html", "/products", "/engraving", "/color-lab", "/blogs", "/login", "/checkout",
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
  /^\/products\/group\/[^/]+(?:\/page\/[^/]+)?$/,
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
  out = setTag(out, /<meta\s+name="robots"[^>]*>/, `<meta name="robots" content="noindex,nofollow" data-rh="true" />`);
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
    const catalogOwner = jsonLd["@graph"]?.some((item) => item["@type"] === "CollectionPage")
      ? ' id="artopia-catalog-schema" data-rh="true"' : "";
    out = out.replace(
      "</head>",
      `<script type="application/ld+json"${catalogOwner} data-ld-edge="${esc(path)}">${JSON.stringify(jsonLd).replace(/</g, "\\u003c")}</script>\n</head>`
    );
  }
  return out;
}

const htmlResponse = (out, source) => {
  out = out.replace(/<meta\b(?=[^>]*(?:name="(?:description|robots|theme-color|twitter:[^"]+)"|property="og:[^"]+"))[^>]*>/gi,
    (tag) => /data-rh=/.test(tag) ? tag : tag.replace(/\s*\/?>$/, ' data-rh="true" />'));
  const headers = new Headers(source.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  // Body transformations invalidate validators and encoded-body size metadata.
  for (const name of ["content-length", "content-encoding", "etag", "last-modified"]) headers.delete(name);
  return new Response(out, { status: source.status, statusText: source.statusText, headers });
};

const breadcrumb = breadcrumbJsonLd;

// The article itself as plain HTML inside #root, for crawlers and link previews
// that never run JavaScript (ChatGPT/Perplexity/Claude search bots, part of Bing,
// Facebook/Telegram/Viber). Everyone gets the same content — this is not cloaking.
// main.jsx uses createRoot (not hydrate), so React simply replaces it; App.jsx's
// route fallback keeps showing this copy while the article chunk loads.
// Section HTML is the backend's sanitized output (app/html_sanitize.py); title,
// description and alt texts are escaped here.
// Defense in depth: the backend never returns these, so if a section still has
// one (old cached answer, backend not yet deployed) nothing is injected at all.
const UNSAFE_ARTICLE_HTML = /<\s*(?:script|style|iframe|object|embed|svg|math|form|input|img|link|meta|base)\b|\son\w+\s*=|javascript:|data:text\/html/i;

function blogArticleBody(post, { title, description }) {
  if ((Array.isArray(post.sections) ? post.sections : []).some((section) => UNSAFE_ARTICLE_HTML.test(String(section?.text || "")))) return "";
  const date = typeof post.created_at === "string" ? post.created_at.slice(0, 10) : "";
  const shownDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join(".") : "";
  const cover = (url, alt) => {
    if (typeof url !== "string" || !url.trim()) return "";
    const picture = responsiveImage(url, "article");
    return `<img src="${esc(picture.src)}"${picture.srcSet ? ` srcset="${esc(picture.srcSet)}" sizes="${esc(picture.sizes)}"` : ""}`
      + ` width="1120" height="630" alt="${esc(alt)}" decoding="async" fetchpriority="high"`
      + ` style="display:block;width:100%;height:auto;border-radius:16px;margin:20px 0" />`;
  };
  // Text only: the section photos come with the React page (lazy). Writing them here made the
  // browser fetch every one of them during the first load (~350 KB extra on the tarot article).
  const sections = (Array.isArray(post.sections) ? post.sections : [])
    .map((section) => (typeof section?.text === "string" && section.text.trim() ? `<section>${section.text}</section>` : ""))
    .join("");
  if (!sections) return "";
  // No page CSS applies to this copy: without these rules a long word or a table widened the
  // layout viewport and the fixed navbar shifted when React replaced it (CLS).
  return `<main data-edge-article="" style="min-height:100vh;color:#e2e8f0;line-height:1.75;overflow-x:hidden">`
    + `<style>[data-edge-article] *{max-width:100%;box-sizing:border-box;overflow-wrap:anywhere}[data-edge-article] table{display:block;overflow-x:auto}[data-edge-article] a{color:#b8dcff}</style>`
    + `<article style="max-width:900px;margin:0 auto;padding:0 16px 48px">`
    + `<nav aria-label="breadcrumb" class="site-breadcrumbs"><a href="/">მთავარი</a> › <a href="/blogs">ბლოგი</a> › <span>${esc(clip(title, 80))}</span></nav>`
    + `<h1 style="color:#f8fafc;line-height:1.3">${esc(title)}</h1>`
    + (shownDate ? `<p><span>Artopia</span> • <time datetime="${esc(date)}">${esc(shownDate)}</time></p>` : "")
    + (description ? `<p>${esc(description)}</p>` : "")
    + cover(post.og_image || post.cover_image, title)
    + sections
    + `<p><a href="/blogs">ყველა სტატია</a></p>`
    + `</article></main>`;
}

// The production site also answers on Netlify's own hostnames
// (<site>.netlify.app, main--<site>.netlify.app). They are copies of artopia.ge
// and must never be indexed themselves.
async function renderPage(request, context) {
  let response = await handle(request, context);
  const filterUrl = new URL(request.url);
  const policy = indexPolicy(filterUrl.href);
  if (policy.noIndex
      && response.status === 200 && (response.headers.get("content-type") || "").includes("text/html")) {
    let body = await response.text();
    body = setTag(body, /<meta\s+name="robots"[^>]*>/, `<meta name="robots" content="${policy.robots}" data-rh="true" />`);
    body = body.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>\s*/gi, "");
    body = body.replace(/<meta\s+property="og:url"[^>]*>\s*/gi, "");
    body = body.replace(/<link\b[^>]*\bhreflang=["'][^"']*["'][^>]*>\s*/gi, "");
    const headers = new Headers(response.headers);
    if (policy.utility) {
      body = setTag(body, /<title>[\s\S]*?<\/title>/, `<title>${esc(utilityTitle(filterUrl.pathname))}</title>`);
      body = setTag(body, /<meta\s+name="description"[^>]*>/, '<meta name="description" content="Artopia-ს მომსახურების გვერდი." data-rh="true" />');
      headers.set("cache-control", "private, no-store");
      headers.set("netlify-cdn-cache-control", "no-store");
    }
    headers.set("x-robots-tag", "noindex");
    response = new Response(body, { status: 200, headers });
  }
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
    if (/\/page\/1$/.test(rawPath) && parseCatalogPath(rawPath)) {
      return new Response(null, { status: 301, headers: { location: `${SITE}${rawPath.replace(/\/page\/1$/, "")}${url.search}` } });
    }

    const path = decodeURIComponent(new URL(pageCanonical).pathname);

    /* =============== HOME: reuse bootstrap data + preload its LCP =============== */
    if (path === "/") {
      try {
        // Only the LCP carousel is worth delaying HTML for, and even that gets a
        // strict budget. The rest of the homepage hydrates from the compact
        // bootstrap endpoint in the browser without holding back first paint.
        const homeResponse = await fetch(`${API}/home-images/public`, { signal: AbortSignal.timeout(900) });
        if (homeResponse.ok && (homeResponse.headers.get("content-type") || "").includes("application/json")) {
          const homeImages = await homeResponse.json();
          const firstHero = Array.isArray(homeImages) ? homeImages[0]?.image_url : null;
          let out = shell;
          const preload = imagePreload(firstHero, "hero");
          if (preload) out = out.replace("</head>", `${preload}\n</head>`);
          out = embedInitialData(out, "storefront", path, { __partial: true, home_images: homeImages });
          return htmlResponse(out, source);
        }
      } catch { /* normal client fetch remains as the fallback */ }
      return page();
    }

    /* ===================== BLOG ARTICLE: /blog/<slug> ===================== */
    const blogMatch = path.match(/^\/blog\/([^/]+)$/);
    if (blogMatch) {
      const slug = blogMatch[1];
      // redirect: "manual" — the API's 301 is a JSON {"moved_to"} without Location
      // (the article's title, and with it the slug, changed); it becomes a real 301.
      const r = await apiFetch(`/blogs/slug/${encodeURIComponent(slug)}`, { redirect: "manual" });
      if (isApiVerdict(r, 404)) return notFoundResponse(shell, source, 404);
      if (isApiVerdict(r, 301)) {
        const target = (await r.json())?.moved_to;
        if (typeof target === "string" && /^[a-z0-9-]+$/.test(target) && target !== slug) {
          return new Response(null, { status: 301, headers: { location: `${SITE}/blog/${target}` } });
        }
        return page();
      }
      if (!r.ok) return page();
      const b = await r.json();
      const post = b && (b.product ? b.product : b);
      if (!post || !(post.title || post.meta_title)) return page();
      // გამოუქვეყნებელი სტატია (მაგ. ძველი API პასუხი) არასდროს ინდექსდება
      if (post.is_active === false) return notFoundResponse(shell, source, 404);

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
        headExtra: imagePreload(post.og_image || post.cover_image, "article"),
        keywords: post.keywords || undefined,
        jsonLd: {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "BlogPosting",
              headline: articleMeta.headline,
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
      const body = blogArticleBody(post, { title: post.title || post.meta_title, description: articleMeta.intro });
      const withBody = body ? out.replace('<div id="root"></div>', `<div id="root">${body}</div>`) : out;
      return htmlResponse(embedInitialData(withBody, "blog", path, post), source);
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

    // The retired reviews page has no replacement. Preserve an explicit 410.
    if (path === "/reviews") return notFoundResponse(shell, source, 410);

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

    if (path === "/color-lab") {
      const { title, description, url, image, keywords, jsonLd } = COLOR_LAB_SEO;
      return htmlResponse(applyMeta(shell, { title, description, url, image, keywords, jsonLd, type: "website" }), source);
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
          "ლაზერული გრავირება Artopia-ში — კალმები, ხის და ტყავის ბრელოკები წარწერით ან ფოტოთი. შექმენი დიზაინი 3D პრევიუში და შეუკვეთე ონლაინ.",
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
      const { category, mainCategory, page } = catalog;
      let total = null;
      let firstImage = null;
      let confirmedEmpty = false;
      let categoryContext = null;
      let catalogData = null;
      const inclusive = ["1", "true"].includes(url.searchParams.get("include_out_of_stock"));
      const filterSuffix = inclusive ? "?include_out_of_stock=1" : "";
      // ?search= და ?categories= სიას ცვლის, მაგრამ ქვემოთ API-ს ის არ გადაეცემა —
      // ასეთ გვერდზე წინასწარ ჩასმული სია სხვა (ფილტრის გარეშე) შედეგი იქნებოდა.
      const listFiltered = url.searchParams.has("search") || url.searchParams.has("categories");
      const landing = !category && !mainCategory && page === 1 && !listFiltered;
      // ყველა მოთხოვნა ერთდროულად იგზავნება: HTML ყველაზე ნელ პასუხს ელოდება და არა ჯამს
      const contextRequest = (category || mainCategory)
        ? apiFetch(mainCategory ? `/categories/main/${encodeURIComponent(mainCategory)}` : `/categories/sub/${encodeURIComponent(category)}`)
          .catch(() => null)
        : null;
      // კატალოგის მთავარი გვერდი და მთავარი კატეგორიის გვერდი კატეგორიების ხეს
      // ბრაუზერში მეორედ აღარ ითხოვს — ის HTML-შივე მიდის
      const treeRequest = (landing || (mainCategory && !listFiltered))
        ? apiFetch("/categories/catalog")
          .then((res) => (res.ok && (res.headers.get("content-type") || "").includes("application/json") ? res.json() : null))
          .then((tree) => (Array.isArray(tree?.main_categories) ? tree : null))
          .catch(() => null)
        : null;
      // Page 1 of the full catalogue always exists; everything else is checked
      // against the API so a mistyped category or a page past the end is a 404.
      { // Validate empty catalogues too; API failures remain a normal 200 page.
        const qs = new URLSearchParams({ page: String(page), limit: String(PRODUCTS_PER_PAGE) });
        if (category) qs.set("category", category);
        if (mainCategory) qs.set("main_category", mainCategory);
        if (inclusive) qs.set("include_out_of_stock", "1");
        const r = await apiFetch(`/products/list?${qs}`);
        if (r.ok && (r.headers.get("content-type") || "").includes("application/json")) {
          const data = await r.json();
          catalogData = data;
          const items = Array.isArray(data?.items) ? data.items : null;
          // a renamed category: its old address moves permanently to the new name
          const movedTo = data?.category_exists === false ? data?.category_moved_to : null;
          if (typeof movedTo === "string" && movedTo.trim() && movedTo !== category) {
            return new Response(null, { status: 301, headers: { location: `${SITE}${catalogPath({ category: movedTo })}${["1", "true"].includes(url.searchParams.get("include_out_of_stock")) ? "?include_out_of_stock=1" : ""}` } });
          }
          if (data?.category_exists === false) return notFoundResponse(shell, source, 404);
          // გადარქმეული მთავარი კატეგორია: ძველი /products/group/<slug> მუდმივად ახალზე გადადის
          const mainMovedTo = data?.main_category_exists === false ? data?.main_category_moved_to : null;
          if (typeof mainMovedTo === "string" && /^[a-z0-9-]+$/.test(mainMovedTo) && mainMovedTo !== mainCategory) {
            return new Response(null, { status: 301, headers: { location: `${SITE}${catalogPath({ mainCategory: mainMovedTo, page })}${url.search}` } });
          }
          if (data?.main_category_exists === false) return notFoundResponse(shell, source, 404);
          if (items && items.length) firstImage = items[0]?.image_url1 || null;
          if (items && page > 1 && items.length === 0) return notFoundResponse(shell, source, 404);
          if (Number.isFinite(Number(data?.total))) total = Number(data.total);
          confirmedEmpty = items != null && items.length === 0 && total === 0;
        }
        // not ok / not JSON → unknown; fall through and serve the page as 200
      }

      if (contextRequest) {
        try {
          const contextResponse = await contextRequest;
          if (!contextResponse) throw new Error("category context unavailable");
          if (isApiVerdict(contextResponse, 404)) return notFoundResponse(shell, source, 404);
          if (contextResponse.ok && (contextResponse.headers.get("content-type") || "").includes("application/json")) {
            categoryContext = await contextResponse.json();
          }
        } catch { /* metadata lookup outage must not remove a valid catalogue page */ }
      }

      const tree = treeRequest ? await treeRequest : null;
      // კატალოგის მთავარ გვერდზე პირველი ხილული ფოტო კატეგორიის ბარათისაა და არა სიის
      // პირველი პროდუქტის — არასწორი preload ტყუილად ჩამოტვირთავდა სხვა ფოტოს
      const firstCategoryImage = tree?.main_categories?.find((item) => item?.image_url)?.image_url;
      const lcpPreload = landing && tree?.main_categories?.length
        ? imagePreload(firstCategoryImage, "category")
        : imagePreload(firstImage, "card");

      const meta = catalogMeta({ category, mainCategory, displayName: categoryContext?.name, title: categoryContext?.meta_title,
        description: categoryContext?.meta_description || categoryContext?.description, page });
      meta.url += filterSuffix;

      // rel prev/next: plain crawlable hints to the neighbouring listing pages
      const links = [];
      if (page > 1) links.push(`<link rel="prev" href="${esc(`${SITE}${catalogPath({ category, mainCategory, page: page - 1 })}${filterSuffix}`)}" />`);
      if (total != null && page * PRODUCTS_PER_PAGE < total) {
        links.push(`<link rel="next" href="${esc(`${SITE}${catalogPath({ category, mainCategory, page: page + 1 })}${filterSuffix}`)}" />`);
      }

      const out = applyMeta(shell, {
        title: meta.title,
        description: meta.description,
        url: meta.url,
        image: DEFAULT_IMAGE,
        type: "website",
        headExtra: [...links, lcpPreload].filter(Boolean).join("\n"),
        jsonLd: catalogJsonLd({ meta, category, mainCategory, context: categoryContext, page, search: url.search }),
      });
      if (confirmedEmpty && !inclusive) {
        let empty = setTag(out, /<meta\s+name="robots"[^>]*>/, `<meta name="robots" content="noindex,nofollow" data-rh="true" />`);
        empty = empty.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>\s*/gi, "");
        empty = empty.replace(/<meta\s+property="og:url"[^>]*>/gi, "");
        const response = htmlResponse(empty, source);
        response.headers.set("x-robots-tag", "noindex");
        return response;
      }
      const hydratable = catalogData && !listFiltered && (landing || category || mainCategory || page > 1);
      // Send the already-fetched category copy with the products, so the visible
      // heading, description and breadcrumbs cannot pop in after the grid.
      const initial = hydratable ? { ...catalogData,
        ...(tree ? { catalog: tree } : {}),
        ...(categoryContext ? { category_context: categoryContext } : {}),
      } : null;
      return htmlResponse(initial ? embedInitialData(out, "catalog", path, initial) : out, source);
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

    // პირველი არსებული ფოტო (ძველ ჩანაწერებში 1-ლი სლოტი შეიძლება ცარიელი იყოს)
    const photo = [1, 2, 3, 4, 5, 6].map((i) => p[`image_url${i}`]).find((u) => typeof u === "string" && u.trim()) || null;
    const image = photo || DEFAULT_IMAGE;
    const pageUrl = `${SITE}/products/${slug}`;
    const description = productPageMeta(p).description;

    const html = shell;
    const out = applyMeta(html, {
      title: productPageMeta(p).title,
      description,
      url: pageUrl,
      image,
      type: "product",
      headExtra: imagePreload(photo, "detail"),
      jsonLd: {
        "@context": "https://schema.org",
        "@graph": [
          productJsonLd(p, { url: pageUrl, images: photo ? [photo] : [], sellerId: ORG_ID }),
          breadcrumb(productBreadcrumbs(p, pageUrl)),
        ],
      },
    });

    return htmlResponse(embedInitialData(out, "product", path, data), source);
  } catch {
    return page(); // fail-safe: never break the page, never invent a 404
  }
}

// Runs for every page URL so that unknown paths get a real 404. Static asset
export default async (request, context) => secureResponse(await renderPage(request, context));

// folders are excluded (and any non-HTML response is passed through untouched).
export const config = {
  path: "/*",
  // /sitemap.xml is a rewrite to a function and /robots.txt a static file: neither
  // is a page, and neither may ever be turned into a 404 by the route table.
  excludedPath: ["/api/*", "/assets/*", "/models/*", "/fonts/*", "/images/*", "/.netlify/*", "/sitemap.xml", "/robots.txt"],
};
