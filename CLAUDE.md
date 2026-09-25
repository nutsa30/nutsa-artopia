# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server (Vite, port 5173)
npm run build     # production build → dist/
npm run preview   # preview the production build locally
npm run lint      # ESLint check
```

No test suite exists in this project.

## Architecture

**Stack:** React 18 + Vite, TailwindCSS v4, React Router v6, Framer Motion, Three.js + Vanta (hero animations), react-helmet-async (SEO), lottie-react.

**Backend:** External REST API at `https://artopia-backend-2024-54872c79acdd.herokuapp.com`. There is no local backend — all data is fetched from this Heroku service.

### Two separate API layers

| File | Purpose | Auth |
|---|---|---|
| `src/api.js` | Public-facing API calls | None (uses `loadingBus` for global loading state) |
| `src/admin/api.js` | Admin CRUD calls | `X-Admin-Token` header from `localStorage.getItem("ADMIN_TOKEN")` |

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

The support panel (`pages/supportPanel/`) is reached at `/admin/support-panel/:tab` (`products` | `no-photo`). Its API calls live in `src/admin/api.js` under the "Support" sections and use `bearerHeaders()` (Authorization: Bearer), **not** the `X-Admin-Token` `jfetch` path.

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

QuickShipper was removed (2026-09) — no more third-party courier lookup, map
picker, or per-provider selection. Delivery is flat and city-based; the shared
math lives in `src/utils/pricing.js` (`courierDeliveryInfo`, `meetsMinOrder`,
`pickupReadyLabel`, `MIN_ORDER_SUBTOTAL`) and mirrors the backend's
`app/delivery.py` — that backend file is authoritative, this is only for the
instant UI preview.

| Rule | Value |
|---|---|
| Minimum order (site-wide) | 20₾ |
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
  checkout, matching the plain CSS-Modules styling already used in this folder
  (this app does **not** have Tailwind wired into its build despite it being a
  listed dependency — `vite.config.js` has no Tailwind plugin and no CSS file
  imports `@tailwind`/`@import "tailwindcss"`; Tailwind classes here would be
  silently inert).

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

### SEO

`src/components/SEO.jsx` wraps `react-helmet-async`'s `<Helmet>`. Use it in every page with `title`, `description`, and `url` props. The component auto-appends `| Artopia` to titles and sets Georgian locale (`ka_GE`) by default.

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
