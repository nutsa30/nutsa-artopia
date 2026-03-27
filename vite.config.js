// MAIN SITE: vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const ADMIN_DEV = "http://localhost:3000"; // ან 3001 — სადაც ადმინი გარბის npm start-ით

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/admin": {
        target: ADMIN_DEV,
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (p) => p.replace(/^\/admin/, ""),
      },
      "/static": { target: ADMIN_DEV, changeOrigin: true, secure: false },
      "/asset-manifest.json": { target: ADMIN_DEV, changeOrigin: true, secure: false },
      "/manifest.json": { target: ADMIN_DEV, changeOrigin: true, secure: false },
      "/sockjs-node": { target: ADMIN_DEV, changeOrigin: true, secure: false, ws: true },
    },
  },
});
