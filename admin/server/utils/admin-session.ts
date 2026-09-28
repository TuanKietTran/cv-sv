import type { H3Event } from "h3";
import { isAllowedGithubUser } from "../lib/oauth";

export interface AdminUser {
   id: number;
   login: string;
   name: string | null;
   avatarUrl: string;
}

interface AdminSessionData {
   user?: AdminUser;
   oauthState?: string;
   redirect?: string;
}

export function getAdminSession(event: H3Event) {
   return useSession<AdminSessionData>(event, {
      password: String(useRuntimeConfig(event).sessionSecret),
      // __Host- prevents production cookies from being scoped to a parent domain or non-root path.
      name: import.meta.dev ? "ruxt_admin_session_v1" : "__Host-ruxt_admin_session_v1",
      maxAge: 60 * 60 * 8,
      cookie: { httpOnly: true, sameSite: "lax", secure: !import.meta.dev, path: "/" },
   });
}

/** Re-checks the allowlist on every request so removing an id revokes live sessions. */
export async function requireAdmin(event: H3Event): Promise<AdminUser> {
   const user = (await getAdminSession(event)).data.user;
   if (!user || !isAllowedGithubUser(user.id, useRuntimeConfig(event).github.allowedIds)) {
      throw createError({ statusCode: 401, statusMessage: "Admin sign-in required" });
   }
   return user;
}
