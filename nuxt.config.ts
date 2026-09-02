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

   nitro: {
      esbuild: {
         options: {
            target: "es2022",
         },
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
