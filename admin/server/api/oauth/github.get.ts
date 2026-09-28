import { randomBytes, timingSafeEqual } from "node:crypto";
import { isAllowedGithubUser, resolveOauthRedirectUri, safeRedirectPath } from "~~/server/lib/oauth";

interface GithubUser {
   id: number;
   login: string;
   name: string | null;
   avatar_url: string;
}

const sameSecret = (left: string, right: string) =>
   left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right));

/** GitHub OAuth: without `code` start the flow, with `code` finish it. */
export default defineEventHandler(async (event) => {
   setResponseHeader(event, "cache-control", "no-store");
   setResponseHeader(event, "pragma", "no-cache");
   const { clientId, clientSecret, redirectUrl, allowedIds } = useRuntimeConfig(event).github;
   if (!clientId || !clientSecret) {
      throw createError({ statusCode: 503, statusMessage: "GitHub OAuth is not configured" });
   }
   const query = getQuery(event);
   const session = await getAdminSession(event);
   const redirectUri = resolveOauthRedirectUri(getAdminOrigin(event), redirectUrl);

   if (typeof query.code !== "string") {
      if (query.error) {
         await session.clear();
         return { redirect: "/login?error=denied" };
      }
      const state = randomBytes(24).toString("base64url");
      await session.update({ oauthState: state, redirect: safeRedirectPath(query.redirect) });
      const params = new URLSearchParams({
         client_id: clientId,
         redirect_uri: redirectUri,
         state,
         scope: "read:user",
         allow_signup: "false",
      });
      return { authorizeUrl: `https://github.com/login/oauth/authorize?${params}` };
   }

   const expected = session.data.oauthState;
   const redirect = safeRedirectPath(session.data.redirect);
   // New session id after the round trip; nothing from before sign-in survives.
   await session.clear();
   if (!expected || typeof query.state !== "string" || !sameSecret(query.state, expected)) {
      return { redirect: "/login?error=state" };
   }

   const token = await $fetch<{ access_token?: string; error?: string }>("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { accept: "application/json" },
      body: { client_id: clientId, client_secret: clientSecret, code: query.code, redirect_uri: redirectUri },
   });
   if (!token.access_token) return { redirect: "/login?error=exchange" };

   const github = await $fetch<GithubUser>("https://api.github.com/user", {
      headers: {
         accept: "application/vnd.github+json",
         authorization: `Bearer ${token.access_token}`,
         "user-agent": "ruxt-admin",
      },
   });
   if (!isAllowedGithubUser(github.id, allowedIds)) {
      console.warn(`[admin] rejected GitHub sign-in for ${github.login} (${github.id})`);
      return { redirect: "/login?error=forbidden" };
   }

   const fresh = await getAdminSession(event);
   await fresh.update({
      user: { id: github.id, login: github.login, name: github.name, avatarUrl: github.avatar_url },
   });
   return { redirect };
});
