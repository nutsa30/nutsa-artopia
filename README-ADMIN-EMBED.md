# Admin embedded inside the website

Creation time: 2025-11-08T09:17:15.884784Z

What changed:
- Copied the existing admin panel source into `src/admin/` inside the Vite site.
- Added a new `AdminApp.jsx` that wires your admin pages as **nested routes** under `/admin/*`.
- Updated `src/App.jsx` to lazy-load the admin on the `/admin` path.

Run locally:
```bash
npm install
npm run dev
# open /admin to see the embedded admin
```

Build:
```bash
npm run build
# admin is included in the Vite build and resolves at /admin/*
```

Notes:
- We kept your original page paths: `/addProducts`, `/menu`, `/order_history`, `/blog`, `/promo-codes`, `/contacts`, `/home-images`, plus `/` for the login. When nested, they map to `/admin/...`.
- The old CRA-specific files (`index.js`, `reportWebVitals.js`, etc.) were not copied.
- If some imports expect `react-router-dom@^7`, the website currently uses v6; routes/components are v6-compatible. If you prefer, upgrade RRD to 7.x in the website `package.json`.
