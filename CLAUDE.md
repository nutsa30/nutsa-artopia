# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Vite, port 5173)
npm run build     # production build → dist/
npm run preview   # preview the production build locally
npm run lint      # ESLint check
npm test          # node --test (tests/*.test.mjs)
```

## Architecture

**Stack:** React 18 + Vite, TailwindCSS v4, React Router v6, Framer Motion, Three.js + Vanta (hero animations), react-helmet-async (SEO), lottie-react.

**Backend:** External REST API at `https://artopia-backend-2024-54872c79acdd.herokuapp.com`. There is no local backend — all data is fetched from this Heroku service.

### Two separate API layers

| File | Purpose | Auth |
|---|---|---|
| `src/api.js` | **Unused** — nothing imports it and its `loadingBus` import path does not exist. Storefront pages call `fetch` with `PUBLIC_API` / `API_BASE` from `src/utils/apiBase.js` | None |
| `src/admin/api.js` | Admin CRUD calls | `Authorization: Bearer <JWT>` from `ADMIN_TOKEN` in storage (`authHeaders()`) |

Both files expose `jfetch` (JSON) and `ffetch` (FormData/multipart) helpers. Don't mix them — the admin version adds the auth header automatically.

### Routing & Chrome shell

`src/App.jsx` is the root. The `Chrome` component wraps all non-admin routes and conditionally renders `<Navbar>` and `<Footer>`. Routes under `/admin/*` skip Chrome entirely (no navbar/footer) and also suppress the `<ChatWidget>`.

The entire admin panel is **lazy-loaded** via `React.lazy(() => import("./admin/AdminApp"))`. All admin routes live under `/admin/*` and are wrapped in `ProtectedRoute`, which checks for the `ADMIN_TOKEN` in localStorage.

Old top-level routes (`/menu`, `/addProducts`, `/blog`, etc.) redirect to their `/admin/*` equivalents.

### Cart

`src/components/CartContext/CartContext.jsx` holds cart state via React Context. Cart is persisted to `localStorage` under the key `artopia.cart.v1`. The `useCart()` hook exposes `addToCart`, `removeFromCart`, `updateQuantity`, `getTotalPrice`, `clearCart`, and `showToast`.

Cart quantities are capped against live stock fetched from the backend at checkout time.

### Admin auth

`src/admin/context/AuthContext.jsx` provides `useAuth()`. Token is stored as `ADMIN_TOKEN` in localStorage. `login(token)` sets it; `logout()` removes it. `authReady` flag prevents flash-of-unauthenticated-content.

On login (`pages/logIn/LoginPage.jsx`), the backend returns `{ token, role }`. Both are stored under `ADMIN_TOKEN` and `ADMIN_ROLE` (localStorage if "remember" is checked, otherwise sessionStorage). Route guards branch on `ADMIN_ROLE`:
- `components/ProtectRoute.jsx` — admin-only routes; a `support` role is redirected to `/admin/support-panel/products`.
- `components/SupportRoute.jsx` — support panel; a non-`support` role is redirected to `/admin/menu`, and a missing token to `/admin/login`.

**Token expiry / 401 handling (IMPORTANT)**: backend admin/support tokens last 7 days. When a token is expired or invalid, support endpoints return `401`. The support pages (`pages/supportPanel/SupportPanel.jsx` and `NoPhotoProducts.jsx`) call a local `handleAuthError(err)` that, on `err.status === 401`, clears `ADMIN_TOKEN`/`ADMIN_ROLE` and redirects to `/admin/login`. **Do not revert these `.catch(handleAuthError)` calls back to silent `.catch(() => {})`** — that previously made an expired token render a blank panel with no products and no re-login prompt.

### Support panel

The support panel (`pages/supportPanel/`) is reached at `/admin/support-panel/:tab` (`products` | `no-photo`). Its API calls live in `src/admin/api.js` under the "Support" sections and use `bearerHeaders()` (Authorization: Bearer).

### Discount rule: promo codes vs. product sale (IMPORTANT)

**A promo code applies ONLY to products with no admin-set discount.** A product
with `sale > 0` keeps its own discount and the coupon percent never touches it.

`src/utils/pricing.js` holds the shared math — `normalizeSale`, `unitPrice`,
`isPromoEligible`, `buildCartBreakdown` (→ `subtotal` / `eligibleSubtotal` /
`excludedSubtotal` / per-line `promoEligible`), and `couponDiscountFor`. Import
from there; don't re-derive the formula in a component. It mirrors the backend's
`app/pricing.py`, which is the authoritative version.

Checkout shows the rule rather than applying it silently:
- an on-sale line gets an amber `🔒 პრომო არ ვრცელდება` chip and its original
  price struck through; a full-price line gets a green `🏷️ პრომო −N%` chip
- the totals block breaks out product savings and the promo discount, and names
  the base the promo landed on when part of the cart is excluded
- the promo input is a live status field (checking / valid / invalid) driven by
  `POST /promo-codes/validate`

### Checkout & payments

There is no third-party courier lookup, map picker, or per-provider selection.
Delivery is flat and city-based; the shared
math lives in `src/utils/pricing.js` (`courierDeliveryInfo`,
`pickupReadyLabel`) and mirrors the backend's
`app/delivery.py` — that backend file is authoritative, this is only for the
instant UI preview.

| Rule | Value |
|---|---|
| Minimum order amount | No store-wide minimum; the cart must be nonempty |
| Courier — Tbilisi | 5₾, free at ≥50₾ |
| Courier — region | 7₾, free at ≥70₾ |
| Pickup | Always free. Ready today by 20:30 if ordered before 18:00 (Asia/Tbilisi), else next business day. |
| Courier payment | Card only, prepaid — no cash on delivery. |
| Pickup payment | Customer's choice: card (prepaid) or on-site (pay when collecting). |

`src/components/Checkout/Checkout.jsx` handles the full checkout flow:
- Delivery options: `storePickup` or `courierDelivery`. `courierDelivery` renders
  `DeliverySection` — a plain city `<select>` + address/hallway/floor/apartment
  text inputs (no map, no courier-provider picker).
- The payment-method `<select>` (card / on-site) only appears for `storePickup`;
  for `courierDelivery` it's forced to `card` and hidden.
- Promo codes are validated by `POST /promo-codes/validate` (debounced ~450 ms, re-run whenever the cart changes). If that call fails, it falls back to the public `GET /promo-codes` list and applies the same eligible-only rule locally. Only a code that actually validated is sent with the order. The promo field is hidden entirely for `storePickup`.
- **Pickup + pay-by-card** and **courier** (always card) go through `POST
  /payments/bog/create` (Bank of Georgia), which returns a `redirect_url`; the
  user is hard-redirected to the BOG payment page. Result is handled at
  `/payment/result` (`PaymentResult` component).
- **Pickup + pay-on-site** skips the bank entirely: `POST /orders` creates the
  order immediately (`status: "placed"`), the cart is cleared, and a modal shows
  the amount due plus the pickup-ready time from the response
  (`pickup_ready_label`). An admin later marks it paid in
  `src/admin/pages/orders/OrderHistory.jsx` once the customer pays in store.
- Small inline SVG icons (truck/store/clock/pin/card/warning) live in
  `src/components/Checkout/icons.jsx` — used instead of emoji throughout
  checkout, matching the plain CSS-Modules styling already used in this folder.

### Tailwind (since 2026-10-20)

Tailwind v4 is wired via `@tailwindcss/vite` and `src/tailwind.css` (imported in `src/main.jsx`), with two
deliberate limits: **no Preflight** (the reset would restyle every heading, button and image of the existing
CSS-Modules design) and **the `tw:` prefix** on every class (`tw:flex tw:md:grid-cols-3`) so it never collides
with global class names like the chat widget's `.grid` / `.row`. Utilities live in a CSS layer, so an
unlayered CSS-Modules rule wins over them; override one with the `!` suffix (`tw:w-full!`). Descendant
module rules such as `.subcategoryNav span` also hit Tailwind elements — the icon tiles use `<i>` for that.

### Engraving (`/engraving`, გრავირება)

Customers put text and/or a photo on one of 9 products — 5 pens (gold 25₾,
silver 23₾, full-metal 18₾, red 16₾, rifle 32₾) and 4 keychains (square/round
wood, square/round leather in white/black/brown/red; 13₾, both sides 20₾) —
see it on the real 3D model, and add it to the cart. For keychains the editor
splits into front (required) and back (optional) panels; filling the back
switches the price to 20₾ automatically. Engraving on the customer's own item
(10₾) is offered by phone/email/socials/visit only. Every product's overlay is
measured from its own GLB (`PEN_GEOM` / `PLATE_GEOM` in `EngravingViewer.jsx`);
the engraved look depends on the material (`ENGRAVE_LOOKS`); leather color is a
shader tint applied only to non-metal parts. SEO: page JSON-LD (Service offers +
FAQ), edge-function meta for bots, sitemap images, robots `Allow`, footer link,
chat-bot answer.
Rules mirror the backend's `app/engraving.py` (authoritative) in
`src/utils/engraving.js`: prices, 5 units per order max, 2-3 business-day
production (whole order waits), no promo code, no 20₾ minimum, card-only.

| File | Role |
|---|---|
| `src/pages/EngravingPage.jsx` | the page: 1) text/font/photo, 2) product, 3) 3D preview + add to cart. Lazy-loaded (three.js chunk) |
| `src/components/Engraving/EngravingViewer.jsx` | three.js viewer. Engraving overlay geometry is **measured per model** (pen: tapered shell around the barrel axis; keychain: planes on both flat faces) and scaled to real mm (pen 138 mm, keychain 35 mm) |
| `src/components/Engraving/compose.js` | lays text/photo into the zone in mm; same function renders the 3D texture (40 px/mm) and the laser PNG (20 px/mm) → preview == output |
| `src/components/Engraving/photo.js` | photo → pure black/white mask (contrast / dots dithering, lighten/darken, invert) |
| `src/components/Engraving/fonts.js` | loads the 8 self-hosted fonts in `public/fonts/engraving` (OFL) via FontFace before drawing |
| `public/models/engraving/*.glb` | the owner's own 4K models — **never recompress or edit them** |

Cart lines: `{ id: "engr:<token>", engraving_token, engraving: {...} }`. Stock
fetches skip them; `isPromoEligible` is false for them; checkout hides "pay on
site" and switches the pickup/courier ETA text when the cart has one.

Admin (`OrderHistory.jsx`): engraving orders get an amber border + badge; the
details open with the engraving block (preview, text, font, photo, download
links for the laser PNG / original photo) and a "მზადაა" button that emails
the customer.

**Local testing:** Heroku's CORS rejects localhost. Put
`VITE_API_OVERRIDE=http://localhost:5055` in `.env.development.local` (gitignored)
and `src/main.jsx` rewrites Heroku URLs to that backend — dev server only, it is
compiled out of production builds.

### SEO, catalogue URLs and performance (live since 2026-10-13)

- `src/components/SEO.jsx` (react-helmet-async) on every page; `noIndex` drops the canonical.
  `src/components/NotFound.jsx` is the not-found view. An API outage is **not** "not found".
- **URLs**: `/products[/category/<name>][/page/<N>]` — build with `catalogPath()`, parse with
  `parseCatalogPath()` (`src/utils/canonical.js`). Pagination is in the path; `robots.txt` keeps
  `Disallow: /*?*`. Page 2+ has its own canonical.
- **One source for meta and JSON-LD**, shared by React and the edge function: `src/utils/catalogMeta.js`.
  Brand and GTIN come from the API; never hard-code "Artopia" as a brand.
- **HTTP status** is decided in `netlify/edge-functions/meta.js` (runs on `/*`): unknown path → 404;
  product / category page / blog → 404, 410 or 301 only when the API says so in JSON. Timeouts and 5xx
  serve the normal 200 page. **A new route in `src/App.jsx` must also go into `STATIC_ROUTES` /
  `ROUTE_PATTERNS` there** (`tests/seo.test.mjs` fails otherwise). The function marks its JSON-LD with
  `data-ld-edge`; pages add their own only when it is absent (`src/utils/edgeJsonLd.js`).
- **Navigation is real `<a href>`** (card title, category list, pager, related products, footer
  categories). No `div`/`button` + `navigate()`, no nested `<a>`/`<button>`.
- **Out-of-stock pages stay indexable** (owner's rule). Admin-hidden → 404, removed → 410.
- **Images**: `responsiveImage(url, "card" | "detail" | "hero")` from `src/utils/cloudinary.js`; first
  screen `loading="eager"` (first one `fetchpriority="high"`), the rest lazy. The edge function preloads
  the main photo with the same helper. Static images are small WebP with `width`/`height`.
- **Reserve space** for late content (product loader, home carousel) — CLS was 0.78 / 0.29.
- **Google Translate loads on demand** (`src/utils/googleTranslate.js`); never put its `<script>` back
  into `index.html`.
- **Product cards make no API call**; stock comes with the list. Only cart and checkout call `/products/<id>`.
- `/assets/*` is cached immutably (`public/_headers`); HTML never is.
- **Admin**: every write sends the admin JWT (`authHeaders()` in `src/admin/api.js`); the "დამალვა"
  checkbox reads `manually_hidden`. **The repo is public — no secret in code or `.env`.**
- Promo codes are checked only by `POST /promo-codes/validate`.

### API base and the `/api` proxy (2026-10-19)

- **Never read `import.meta.env.VITE_API_BASE` directly.** Netlify's value is `"✅ https://…"`; reading it
  raw (05aa597) sent every homepage/footer request to `artopia.ge/✅…` (404) and broke production. Import
  `API_BASE` / `PUBLIC_API` from `src/utils/apiBase.js`, which keeps only the real URL.
- **Public, read-only GETs use `PUBLIC_API`** (`/api` in production → Heroku via `public/_redirects`):
  same-origin, no extra TLS handshake to the US, and Netlify's CDN caches them for 60 s
  (backend `app/http_perf.py` sends `Netlify-CDN-Cache-Control`). **Cart, checkout, payments, engraving and
  every POST stay on `API_BASE`** — they need live stock and must never be cached.
- Edge `initial-data` must match what React would fetch: never embed a list on `?search=` / `?categories=`
  pages (the edge list is unfiltered). `/products` and group pages embed the category tree as `data.catalog`.
- Route loading and the catalogue skeleton reserve `100vh` so the footer never jumps (CLS).

**Checking a change**: `npm test` (76). Deploy previews load real data through `/api` (same origin), so
check them in a browser; checkout stock calls still hit Heroku directly and are CORS-blocked on previews.
The real edge runtime runs locally with `npx netlify dev`. Deploy: branch → PR → Netlify preview → merge
to `main`.

**Still open (not code)**: Search Console data (page indexing, sitemaps, Core Web Vitals, crawl stats,
URL inspection) to confirm what Google really indexes; 228 in-stock products without a photo; mobile LCP
is 3.7–6.1 s in the lab — the rest is the SPA itself (prerender only if Search Console shows a problem).

### Blog: drafts, renamed slugs, sanitizer, article in the initial HTML (2026-10-20)
- Public blog API hides `is_active=false` articles (JSON 404); the admin page (`src/admin/pages/blog/Blog.jsx`)
  reads `/blogs/admin` and `/blogs/admin/<id>` with `authHeaders()`. `BlogsDetailPage` also renders `NotFound`
  for `is_active === false` (old CDN answer).
- A title change moves the URL: the API answers the old slug with `301 {"moved_to"}` **without Location**;
  the edge function turns it into a real 301 to `/blog/<new>`, React navigates there (`replace`).
- Section HTML passes `src/utils/blogHtml.js` (DOMPurify, blog chunk only) — **same allowlist as the backend's
  `app/html_sanitize.py`; change both together.** `tests/fixtures/blog_html_cases.json` is shared with the backend;
  `blog_articles.json` proves the six live articles keep their content. In a section that contains an h1 every
  heading moves down one level; sections without an h1 stay as written (no h1→h3 skip). The Quill toolbar offers H2/H3 only.
- `netlify/edge-functions/meta.js` writes the article (breadcrumbs, h1, date, description, cover, sanitized
  sections) into `#root` for crawlers that do not run JS; any section with script/iframe/svg/on*/javascript:
  skips it. `src/utils/edgeArticle.js` keeps that copy and App.jsx's route fallback shows it while the article
  chunk loads (no blank flash). `main.jsx` must stay `createRoot` (not hydrate).

### Admin image uploads (2026-10-20)
Admin photos (products, blog, home carousel) upload with `uploadAdminImage(file, { kind, onProgress })` from
`src/admin/api.js` → backend `POST /admin/uploads/image` with the admin JWT (XHR, so the progress bar works; 401
→ re-login). **Never upload to Cloudinary from the browser and never use an unsigned preset** (`artopia_unsigned`
was public in this repo, so anyone could upload to the account). Cloudinary URLs for *display* (`cld()`,
`responsiveImage()`) are unaffected. The backend allows only 3 parallel multipart uploads (`staff_upload` in
`app/abuse_protection.py`, 429 `service_busy` above that), so `uploadAdminImage` queues to **2 at a time** and
retries a 429 after `Retry-After` (`tests/admin-upload.test.mjs`) — keep that if you add parallel uploads.

### Admin navbar (mobile)

`src/admin/components/AdminNavbar.jsx` renders a single dropdown menu (`AdminNavbar.module.css` → `.dropdownMenu`). The dropdown has `max-height: calc(100vh - 110px)` + `overflow-y: auto` so it **scrolls** when the link list is taller than the viewport (it previously had `overflow: hidden` with no height cap, making the bottom items unreachable on mobile). On `max-width: 768px` it also narrows to `min(320px, calc(100vw - 40px))`. Keep these constraints if you add more menu items.

### UI language

All user-facing strings are in Georgian (ქართული). Keep new UI text in Georgian to match the existing codebase.

### No emoji on the storefront (IMPORTANT)

The customer-facing site must look clean — no emoji as icons (e.g. a truck/phone
emoji for delivery). Use small inline SVG icons instead (see
`src/components/Checkout/icons.jsx` for the pattern: a shared `base` props object,
`currentColor` stroke, sized via props). This applies to new UI; don't go back
and strip emoji from unrelated existing features unless asked.


### Optimo stock safety and category hierarchy
`include_out_of_stock=1` is an optional catalogue filter, preserved across category/search/pagination;
toggling it resets to page 1. Backend counts/sorts using stock minus reservations. Sold-out cards say
"ამოწურულია" and have no purchase control; direct product URLs stay indexable with OutOfStock.
Inclusive query variants are noindex,follow with no canonical in React and edge; default page canonicals
and robots remain. Edge validates pagination against the same inclusive API filter.
Explicit inactive products get API-backed 410/301; unverified products keep 200 and cannot be bought.
Admin sync never offers deletion confirmation; preview downloads the backend dry-run report.
This frontend requires the safety and category backend migrations. `/products` renders 11 main-category
cards (1 / 2 / 3 per row), the all-category search, and featured-product rails (20 products each, 4 / 3 / 2 /
~1.4 per view, arrows hide at the ends; "ყველას ნახვა" opens the group page with that subcategory selected);
`/products/group/:mainSlug` renders a paginated group view with a "← ყველა კატეგორია" link. Subcategory
icons are automatic (`src/components/catalog/SubcategoryIcon.jsx`: lucide icon per slug, colour per main
category, keyword fallback for new Optimo categories) — the admin emoji picker is gone. Main-category images are managed in admin,
with 1600 × 900 px documented as the recommended 16:9 size. Match backend and frontend deployments.
