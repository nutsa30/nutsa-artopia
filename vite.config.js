// MAIN SITE: vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Tailwind: მხოლოდ `tw:` პრეფიქსიანი კლასები (src/tailwind.css) — არსებული CSS-ს არ ეხება
  plugins: [react(), tailwindcss()],
});
