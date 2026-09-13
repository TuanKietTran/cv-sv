import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const corePath = fileURLToPath(new URL("./core", import.meta.url));
const infraPath = fileURLToPath(new URL("./infra", import.meta.url));

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
   compatibilityDate: "2025-07-15",
   runtimeConfig: {
      sessionSecret:
         process.env.SESSION_SECRET ??
         "dev-only-secret-change-me-in-production!!",
   },
   devtools: { enabled: true },

   css: ['~/assets/theme/themes.css'],

   alias: {
      "@core": corePath,
      "@infra": infraPath,
   },

   vite: {
      optimizeDeps: {
         include: [
            "@codemirror/state",
            "@codemirror/view",
            "@codemirror/commands",
            "@codemirror/language",
            "@lezer/highlight",
            "@codemirror/lang-markdown",
            "@codemirror/lang-css",
            "@codemirror/language-data",
            "@codemirror/theme-one-dark",
         ],
      },
      resolve: {
         dedupe: [
            "@codemirror/state",
            "@codemirror/view",
            "@codemirror/language",
            "@lezer/highlight",
         ],
      },
   },

   nitro: {
      storage: {
         // Canonical CV documents shared by the browser API and agent adapters.
         cv: {
            driver: "fs",
            base: process.env.CV_DATA_DIR ?? "./.data/cv",
         },
      },
      esbuild: {
         options: {
            target: "es2022",
         },
      },
      rollupConfig: {
         plugins: [{
            name: "cv-raw-assets",
            load(id) {
               if (!id.endsWith("?raw")) return null;
               return `export default ${JSON.stringify(readFileSync(id.slice(0, -4), "utf8"))}`;
            },
         }],
      },
      alias: {
         "@core": corePath,
         "@infra": infraPath,
      },
      typescript: {
         tsConfig: {
            compilerOptions: {
               paths: {
                  "@core/*": [`${corePath}/*`],
                  "@infra/*": [`${infraPath}/*`],
               },
            },
         },
      },
   },
});
