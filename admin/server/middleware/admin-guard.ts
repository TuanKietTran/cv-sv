import { isTrustedAdminOrigin } from "../lib/oauth";

/** Every admin API requires an allowlisted GitHub session; mutations require an explicit trusted origin. */
export default defineEventHandler(async (event) => {
   if (!event.path.startsWith("/api/") || event.path.startsWith("/api/oauth/") || event.path === "/api/health") return;
   if (event.method !== "GET" && event.method !== "HEAD") {
      if (!isTrustedAdminOrigin(getRequestHeader(event, "origin"), getAdminOrigin(event))) {
         throw createError({ statusCode: 403, statusMessage: "Trusted admin origin required" });
      }
   }
   event.context.admin = await requireAdmin(event);
});
