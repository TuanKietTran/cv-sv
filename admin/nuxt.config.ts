import { fileURLToPath } from "node:url";

const repoPath = (relative: string) => fileURLToPath(new URL(`../${relative}`, import.meta.url));
const corePath = repoPath("core");
const storagePath = (env: string | undefined, directory: string) => env
   ?? (process.env.NODE_ENV === "production" ? `/data/${directory}` : repoPath(`.data/${directory}`));
const denoDeploy = process.env.NITRO_PRESET === "deno-deploy";
const storage = (env: string | undefined, directory: string) => denoDeploy
   ? { driver: "deno-kv", base: directory }
   : { driver: "fs", base: storagePath(env, directory) };

// Dedicated admin app. It shares ruxt's core contracts and storage, never its auth.
export default defineNuxtConfig({
   extends: [repoPath("packages/editor")],
   compatibilityDate: "2025-07-15",
   devtools: { enabled: true },
   css: [repoPath("app/assets/theme/themes.css"), "~/assets/admin.css"],
   app: { head: { title: "ruxt admin", meta: [{ name: "robots", content: "noindex, nofollow" }] } },
   runtimeConfig: {
      // NUXT_ADMIN_ORIGIN, e.g. https://admin.example.com. Required in production.
      adminOrigin: "",
      // NUXT_SESSION_SECRET; server/plugins/validate-env.ts rejects this fallback outside dev.
      sessionSecret: "admin-dev-only-secret-change-me-in-production!!",
      github: {
         // NUXT_GITHUB_CLIENT_ID / NUXT_GITHUB_CLIENT_SECRET from a GitHub OAuth app.
         clientId: "",
         clientSecret: "",
         // NUXT_GITHUB_REDIRECT_URL; defaults to <request origin>/oauth/github.
         redirectUrl: "",
         // NUXT_GITHUB_ALLOWED_IDS: comma-separated numeric GitHub user ids.
         allowedIds: "35926768",
      },
   },
   alias: { "@core": corePath },
   nitro: {
      alias: { "@core": corePath },
      // Deno Deploy's filesystem is ephemeral, so production uses the attached Deno KV database.
      // Local development keeps the same filesystem layout as ruxt.
      storage: {
         cv: storage(process.env.CV_DATA_DIR, "cv"),
         cvPipeline: storage(process.env.CV_PIPELINE_DATA_DIR, "cv-pipeline"),
         analytics: storage(process.env.ANALYTICS_DATA_DIR, "analytics"),
      },
      esbuild: { options: { target: "es2022" } },
      typescript: {
         tsConfig: { compilerOptions: { paths: { "@core/*": [`${corePath}/*`] } } },
      },
   },
});
