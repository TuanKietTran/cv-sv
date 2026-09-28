/** Parse a comma-separated list of numeric GitHub user ids. Logins are mutable, ids are not. */
export function parseGithubAllowlist(raw: unknown): Set<string> {
   const values = Array.isArray(raw) ? raw : [raw];
   return new Set(values
      .flatMap(value => String(value ?? "").split(","))
      .map(id => id.trim())
      .filter(id => /^\d+$/.test(id)));
}

export function isAllowedGithubUser(id: unknown, allowlist: unknown): boolean {
   const normalized = typeof id === "number" && Number.isSafeInteger(id) ? String(id)
      : typeof id === "string" && /^\d+$/.test(id) ? id
      : null;
   return normalized !== null && parseGithubAllowlist(allowlist).has(normalized);
}

/** Canonical externally visible origin used for OAuth and CSRF checks. */
export function normalizeAdminOrigin(value: unknown): string | null {
   if (typeof value !== "string" || !value.trim()) return null;
   try {
      const url = new URL(value);
      if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) return null;
      return url.origin;
   } catch {
      return null;
   }
}

export function isTrustedAdminOrigin(value: unknown, expectedOrigin: string): boolean {
   return normalizeAdminOrigin(value) === expectedOrigin;
}

export function resolveOauthRedirectUri(origin: string, configured: unknown): string {
   const fallback = `${origin}/oauth/github`;
   if (typeof configured !== "string" || !configured.trim()) return fallback;
   try {
      const url = new URL(configured);
      return url.origin === origin && url.pathname === "/oauth/github" && !url.search && !url.hash
         ? url.href
         : fallback;
   } catch {
      return fallback;
   }
}

/** Accept only application pages carried through the OAuth round trip. */
export function safeRedirectPath(value: unknown): string {
   if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return "/";
   const path = value.split(/[?#]/, 1)[0]!.replace(/\/+$/, "") || "/";
   return path === "/login" || path === "/oauth/github" || path.startsWith("/api/") || path.startsWith("/auth/")
      ? "/"
      : value;
}
