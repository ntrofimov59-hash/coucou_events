// @ts-check
import { defineConfig } from "astro/config";
import solidJs from "@astrojs/solid-js";
import mdx from "@astrojs/mdx";
import tailwind from "@astrojs/tailwind";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";

// Должен совпадать с SITE_URL в src/config/site.ts (без слэша в конце)
const SITE = "https://your-domain.com";

// https://astro.build/config
export default defineConfig({
  site: SITE,
  // server + node: API (booking/contact) работают; страницы с prerender=true — статика при билде
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  integrations: [
    solidJs(),
    mdx(),
    tailwind(),
    sitemap({
      // Не индексируем служебные URL
      filter: (page) =>
        !page.includes("/api/") &&
        !page.includes("/thank-you") &&
        !page.includes("/thank-you/"),
      i18n: {
        defaultLocale: "ru",
        locales: {
          ru: "ru",
          eng: "en",
          esp: "es",
          arm: "hy",
        },
      },
    }),
  ],
  vite: {
    resolve: {
      alias: {
        "@": "/src",
        "@colors": "/src/styles/colors.scss",
        "@sizes": "/src/styles/sizes.scss",
      },
    },
  },
});