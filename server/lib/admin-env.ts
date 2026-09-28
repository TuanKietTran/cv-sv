import { normalizeAdminOrigin, parseGithubAllowlist, resolveOauthRedirectUri } from "./oauth";

export const DEVELOPMENT_SESSION_SECRET = "admin-dev-only-secret-change-me-in-production!!";

export interface AdminProductionAuthConfig {
   adminOrigin: unknown;
   sessionSecret: unknown;
   github: {
      clientId: unknown;
      clientSecret: unknown;
      allowedIds: unknown;
      redirectUrl?: unknown;
   };
}

export function validateAdminProductionAuth(config: AdminProductionAuthConfig): string[] {
   const problems: string[] = [];
   const secret = String(config.sessionSecret ?? "");
   const origin = normalizeAdminOrigin(config.adminOrigin);
   if (secret.length < 32 || secret === DEVELOPMENT_SESSION_SECRET) {
      problems.push("NUXT_SESSION_SECRET must be a unique secret of at least 32 characters");
   }
   if (!origin || !origin.startsWith("https://")) {
      problems.push("NUXT_ADMIN_ORIGIN must be an HTTPS origin without a path, query, or fragment");
   }
   if (!config.github.clientId || !config.github.clientSecret) {
      problems.push("NUXT_GITHUB_CLIENT_ID and NUXT_GITHUB_CLIENT_SECRET are required");
   }
   if (parseGithubAllowlist(config.github.allowedIds).size === 0) {
      problems.push("NUXT_GITHUB_ALLOWED_IDS must list at least one numeric GitHub user id");
   }
   if (origin && config.github.redirectUrl && resolveOauthRedirectUri(origin, config.github.redirectUrl) !== config.github.redirectUrl) {
      problems.push("NUXT_GITHUB_REDIRECT_URL must equal NUXT_ADMIN_ORIGIN + /oauth/github");
   }
   return problems;
}
