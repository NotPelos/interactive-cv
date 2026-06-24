import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import preact from "@astrojs/preact";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

// Sin adapter: SSG por defecto. Cloudflare Pages adapter va antes del primer deploy.
export default defineConfig({
  site: "https://notpelos.pages.dev",
  integrations: [preact({ compat: false }), sitemap()],
  vite: {
    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()],
      },
    },
  },
});
