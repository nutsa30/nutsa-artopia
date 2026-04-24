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

### Checkout & payments

`src/components/Checkout/Checkout.jsx` handles the full checkout flow:
- Delivery options: `storePickup` or `courierDelivery` (uses `DeliverySection` sub-component for address + courier selection)
- Promo codes are validated client-side against `/promo-codes` endpoint
- Payment is initiated via `POST /payments/bog/create` (Bank of Georgia), which returns a `redirect_url`; the user is hard-redirected to the BOG payment page
- Result is handled at `/payment/result` (`PaymentResult` component)

### SEO

`src/components/SEO.jsx` wraps `react-helmet-async`'s `<Helmet>`. Use it in every page with `title`, `description`, and `url` props. The component auto-appends `| Artopia` to titles and sets Georgian locale (`ka_GE`) by default.

### UI language

All user-facing strings are in Georgian (ქართული). Keep new UI text in Georgian to match the existing codebase.
