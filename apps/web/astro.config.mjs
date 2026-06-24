import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

// Sin adapter: SSG por defecto. Cloudflare Pages adapter va en Fase 2 (deploy).
export default defineConfig({
  site: "https://notpelos.pages.dev",
  integrations: [tailwind(), sitemap()],
});
