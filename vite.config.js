// MAIN SITE: vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const ADMIN_DEV = "http://localhost:3000"; // ან 3001 — სადაც ადმინი გარბის npm start-ით

export default defineConfig({
  plugins: [react()],

});
